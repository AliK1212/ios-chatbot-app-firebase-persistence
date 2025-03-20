import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  Platform, 
  FlatList 
} from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useUser } from '../../context/UserContext';
import { 
  createPdfChatSession, 
  getExistingChatSession,
  saveChatMessage, 
  getChatMessages, 
  generateChatResponseFromAllDocs, 
  logTokenUsage,
  getUserTokenUsage
} from '../../firebase/pdfService';
import { processFollowUpQuestion } from '../../utils/reasoning-layer';
import { useRouter } from 'expo-router';

// Define the source type
interface Source {
  documentId: string;
  title: string;
  pageNumber: number;
}

// Define the message type
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  sources?: Source[];
}

// Define the document type
interface Document {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  pageCount: number;
  fileType: 'pdf' | 'doc' | string;
}

// Simple in-memory cache for query responses
interface CacheEntry {
  response: string;
  timestamp: number;
  sources: Source[];
}

// Cache expiration time (15 minutes)
const CACHE_EXPIRATION_MS = 15 * 60 * 1000;

// Message and token limits
const MAX_MESSAGES = 30;
const FREE_TOKEN_LIMIT = 50000; // Token limit for free users

// Color scheme
const color = (opacity = 1) => `rgba(255, 152, 0, ${opacity})`;

// Keep FAQ responses for fallback
const faqResponses: Record<string, string> = {
  'hmo': 'An HMO (House in Multiple Occupation) is a property rented out by at least 3 people who are not from 1 household, but share facilities like the bathroom and kitchen.',
  'licence': 'You need an HMO licence if you rent your property to 5 or more people from more than 1 household, or if your local council has additional licensing requirements.',
  'regulations': 'HMO regulations include: \n• Minimum room sizes\n• Adequate facilities\n• Fire safety measures\n• Regular safety checks\n\nEach local authority may have additional requirements.',
  'investment': 'HMOs can provide higher rental yields compared to standard buy-to-lets, but require more management and have stricter regulations.',
  'cost': 'The cost of converting a property to an HMO varies widely depending on the property size, condition, and local requirements. Basic conversions start from £10,000-£15,000.',
  'fire safety': 'HMO fire safety requirements include:\n• Smoke alarms on each floor\n• Heat detectors in kitchens\n• Fire doors\n• Clear escape routes\n• Fire-resistant materials',
  'room size': 'The minimum room size for a single adult in an HMO is 6.51 square meters. For two adults sharing, it\'s 10.22 square meters.',
  'tenant': 'Tenant rights in HMOs include:\n• Protection from unfair eviction and rent increases\n• Safe living conditions\n• Access to the property\'s energy performance certificate',
};

export function Chatbot({ isCompact = false }: { isCompact?: boolean }) {
  const { user, userProfile } = useUser();
  const { isConnected } = useNetInfo();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastMessageTime, setLastMessageTime] = useState<number>(0);
  const [rateLimited, setRateLimited] = useState(false);
  const [tokenCount, setTokenCount] = useState(0); // Track token usage
  const [limitReached, setLimitReached] = useState<'message' | 'token' | null>(null); // Track which limit is reached
  const [isCreatingNewChat, setIsCreatingNewChat] = useState(false);
  const [totalTokenUsage, setTotalTokenUsage] = useState(0); // Track total token usage
  const [hasReachedTotalLimit, setHasReachedTotalLimit] = useState(false); // Track if user has reached total limit
  const messagesEndRef = useRef<ScrollView>(null);
  const router = useRouter();
  
  // Create a memoized query cache to persist between renders
  const queryCache = useMemo(() => new Map<string, CacheEntry>(), []);

  // Load user's token usage from the database
  const loadUserTokenUsage = async (skipLimitCheck?: boolean) => {
    console.log("loadUserTokenUsage called, skipLimitCheck:", skipLimitCheck);
    if (!user) {
      console.log("No user found, cannot load token usage");
      return;
    }
    
    try {
      console.log("Getting token usage for user:", user.uid);
      const tokenUsage = await getUserTokenUsage(user.uid);
      console.log("Token usage retrieved:", tokenUsage);
      setTokenCount(tokenUsage);
      setTotalTokenUsage(tokenUsage);
      
      // Check if user has reached the total token limit
      if (!userProfile?.isPremium && tokenUsage >= FREE_TOKEN_LIMIT) {
        console.log("User has reached token limit. isPremium:", userProfile?.isPremium, "tokenUsage:", tokenUsage, "FREE_TOKEN_LIMIT:", FREE_TOKEN_LIMIT);
        setHasReachedTotalLimit(true);
        
        // Only set limitReached if we're not skipping the check
        if (!skipLimitCheck) {
          console.log("Setting limitReached to 'token'");
          setLimitReached('token');
        } else {
          console.log("Skipping limit check as requested");
        }
      } else {
        console.log("User has not reached token limit. isPremium:", userProfile?.isPremium, "tokenUsage:", tokenUsage, "FREE_TOKEN_LIMIT:", FREE_TOKEN_LIMIT);
        setHasReachedTotalLimit(false);
      }
    } catch (error) {
      console.error('Error loading user token usage:', error);
    }
  };
  
  // Load previous chat messages
  const loadChatHistory = async () => {
    if (!sessionId) return;
    
    try {
      setIsLoading(true);
      const chatMessages = await getChatMessages(sessionId);
      
      if (chatMessages && chatMessages.length > 0) {
        console.log(`Loaded ${chatMessages.length} previous messages`);
        
        // Convert to the Message format used by the component
        const formattedMessages: Message[] = chatMessages.map(msg => ({
          id: msg.id || `msg-${Date.now()}-${Math.random()}`,
          text: msg.content || '',
          sender: msg.isUserMessage ? 'user' as const : 'bot' as const,
          sources: msg.sources || []
        }));
        
        // Filter out any empty messages
        const validMessages = formattedMessages.filter(msg => msg.text.trim() !== '');
        
        // Filter out duplicate bot messages only (same text)
        const uniqueMessages: Message[] = [];
        const seenBotMessages = new Set<string>();
        
        for (const message of validMessages) {
          // Only deduplicate bot messages, keep all user messages
          if (message.sender === 'user') {
            uniqueMessages.push(message);
          } else {
            // Create a unique key for bot messages based on text
            const messageKey = message.text.substring(0, 50);
            
            if (!seenBotMessages.has(messageKey)) {
              seenBotMessages.add(messageKey);
              uniqueMessages.push(message);
            }
          }
        }
        
        console.log(`Formatted ${uniqueMessages.length} messages (keeping all user messages)`);
        setMessages(uniqueMessages);
        
        // Estimate token count for all messages
        let estimatedTokens = 0;
        for (const message of uniqueMessages) {
          // Rough estimate: ~4 characters per token
          estimatedTokens += Math.ceil(message.text.length / 4);
        }
        setTokenCount(estimatedTokens);
        
        // Check if limits are reached
        const userMessageCount = uniqueMessages.filter(msg => msg.sender === 'user').length;
        if (userMessageCount >= MAX_MESSAGES) {
          setLimitReached('message');
        } else if (!userProfile?.isPremium && estimatedTokens >= FREE_TOKEN_LIMIT) {
          setLimitReached('token');
        }
        
        // Scroll to the bottom after messages load
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollToEnd({ animated: false });
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load chat history when session ID changes
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!sessionId) return;
      
      // Skip loading history if we're creating a new chat
      // We'll set the welcome message directly in createNewChat
      if (isCreatingNewChat) return;
      
      try {
        setIsLoading(true);
        
        const chatMessages = await getChatMessages(sessionId);
        console.log(`Loaded ${chatMessages.length} messages for session ${sessionId}`);
        
        if (chatMessages.length === 0) {
          // If no messages in history, set the welcome message
          setMessages([{
            id: '1',
            text: 'Hello! I\'m the Safe HMO assistant. How can I help you with HMO properties today? You can ask me about regulations, compliance, or general HMO questions.',
            sender: 'bot',
          }]);
          
          // Ensure limitReached is null for a fresh chat
          setLimitReached(null);
        } else {
          // Format messages
          const formattedMessages: Message[] = chatMessages.map(msg => ({
            id: msg.id || `msg-${Date.now()}-${Math.random()}`,
            text: msg.content || '',
            sender: msg.isUserMessage ? 'user' as const : 'bot' as const,
            sources: msg.sources || []
          }));
          
          setMessages(formattedMessages);
          
          // Check if message limit is reached
          const userMessageCount = formattedMessages.filter(msg => msg.sender === 'user').length;
          if (userMessageCount >= MAX_MESSAGES) {
            setLimitReached('message');
          } else {
            // If not at the limit, ensure limitReached is null
            setLimitReached(null);
          }
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadChatHistory();
  }, [sessionId, isCreatingNewChat]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Load user token usage
  useEffect(() => {
    loadUserTokenUsage();
  }, [user, userProfile]);

  // Load or create chat session on mount
  useEffect(() => {
    const initializeChat = async () => {
      console.log("initializeChat called, user:", user?.uid, "sessionId:", sessionId);
      if (!user) {
        console.log("No user found, skipping initialization");
        return;
      }
      
      // Skip initialization if we already have a session ID
      // This prevents conflicts with the createNewChat function
      if (sessionId) {
        console.log("Session ID already exists, skipping initialization");
        return;
      }
      
      try {
        console.log("Setting isLoading to true for initialization");
        setIsLoading(true);
        
        // Try to get an existing chat session
        console.log("Checking for existing chat session for user:", user.uid);
        const existingSessionId = await getExistingChatSession(user.uid);
        console.log("Existing session ID:", existingSessionId);
        
        if (existingSessionId) {
          // Use existing session
          console.log("Using existing session:", existingSessionId);
          setSessionId(existingSessionId);
          
          // Load messages for this session
          console.log("Loading chat history for session:", existingSessionId);
          const chatHistory = await getChatMessages(existingSessionId);
          console.log("Chat history loaded, message count:", chatHistory.length);
          
          if (chatHistory.length > 0) {
            // Convert the chat history to our Message format
            console.log("Converting chat history to Message format");
            const formattedMessages = chatHistory.map(msg => ({
              id: msg.id || `msg-${Date.now()}-${Math.random()}`,
              text: msg.content,
              sender: msg.isUserMessage ? 'user' as const : 'bot' as const,
            }));
            
            console.log("Setting messages from chat history");
            setMessages(formattedMessages);
            
            // Load token usage normally for existing chats
            console.log("Loading user token usage for existing chat");
            await loadUserTokenUsage();
          } else {
            // If no messages in history, set the welcome message
            console.log("No messages in history, setting welcome message");
            setMessages([{
              id: '1',
              text: 'Hello! I\'m the Safe HMO assistant. How can I help you with HMO properties today? You can ask me about regulations, compliance, or general HMO questions.',
              sender: 'bot',
            }]);
            
            // Skip token limit check for empty chats
            console.log("Loading user token usage with skipLimitCheck=true for empty chat");
            await loadUserTokenUsage(true);
          }
        } else {
          // Create a new chat session if none exists
          console.log("No existing session found, creating new chat session");
          const newSessionId = await createPdfChatSession(user.uid);
          console.log("New session created with ID:", newSessionId);
          setSessionId(newSessionId);
          
          // Set welcome message
          console.log("Setting welcome message for new chat");
          setMessages([{
            id: '1',
            text: 'Hello! I\'m the Safe HMO assistant. How can I help you with HMO properties today? You can ask me about regulations, compliance, or general HMO questions.',
            sender: 'bot',
          }]);
          
          // Skip token limit check for new chats
          console.log("Loading user token usage with skipLimitCheck=true for new chat");
          await loadUserTokenUsage(true);
        }
      } catch (error) {
        console.error('Error initializing chat:', error);
      } finally {
        console.log("Setting isLoading to false after initialization");
        setIsLoading(false);
      }
    };
    
    initializeChat();
  }, [user, sessionId]);

  // Custom alert function to ensure alerts work properly across platforms
  const showCustomAlert = (title: string, message: string, buttons: any[] = [{ text: 'OK' }]) => {
    console.log(`Showing custom alert: ${title} - ${message}`);
    
    // For web, we might need to use a different approach
    if (Platform.OS === 'web') {
      // Use window.alert as a fallback for web
      window.alert(`${title}\n\n${message}`);
      console.log("Used window.alert for web platform");
      return;
    }
    
    // For native platforms, use React Native's Alert
    try {
      Alert.alert(title, message, buttons);
      console.log("Alert.alert called successfully");
    } catch (error) {
      console.error("Error showing alert:", error);
      // Fallback to console if Alert fails
      console.log(`ALERT: ${title} - ${message}`);
    }
  };

  // Helper function to directly create a new chat
  const directCreateNewChat = async () => {
    if (!user) {
      console.log("No user found, cannot create new chat");
      showCustomAlert("Error", "You must be logged in to create a new chat.");
      return false;
    }
    
    try {
      console.log("Creating new chat session directly");
      setIsCreatingNewChat(true);
      setIsLoading(true);
      
      // Create a new chat session in Firebase
      const newSessionId = await createPdfChatSession(user.uid);
      console.log("New session created with ID:", newSessionId);
      
      if (newSessionId) {
        // Update state with new session ID
        setSessionId(newSessionId);
        
        // Reset messages to just the welcome message
        setMessages([{
          id: '1',
          text: 'Hello! I\'m the Safe HMO assistant. How can I help you with HMO properties today? You can ask me about regulations, compliance, or general HMO questions.',
          sender: 'bot',
        }]);
        
        // Clear any limit flags
        setLimitReached(null);
        
        console.log("New chat created successfully");
        return true;
      } else {
        console.error("Failed to create new session - no session ID returned");
        showCustomAlert("Error", "Failed to create a new chat. Please try again.");
        return false;
      }
    } catch (error) {
      console.error("Error creating chat session:", error);
      showCustomAlert("Error", "Failed to create a new chat. Please try again.");
      return false;
    }
  };

  // Handle the New Chat button in the header
  const handleHeaderNewChat = async () => {
    console.log("New Chat button clicked");
    
    // Count user messages in the current chat
    const userMessageCount = messages.filter(msg => msg.sender === 'user').length;
    console.log("User message count:", userMessageCount);
    
    // If user has sent fewer than 5 messages, don't allow creating a new chat
    // Unless they haven't sent any messages at all (new user)
    if (userMessageCount > 0 && userMessageCount < 5) {
      console.log("User has fewer than 5 messages, showing alert");
      showCustomAlert(
        'Cannot Create New Chat',
        'Please send at least 5 messages in this chat before creating a new one.'
      );
      return;
    }
    
    // Show confirmation dialog if there are any user messages
    if (userMessageCount >= 5) {
      console.log("User has 5+ messages, showing confirmation dialog");
      
      if (Platform.OS === 'web') {
        // For web, use confirm dialog
        const confirmed = window.confirm('If you create a new chat, the current one will be deleted. Are you sure you would like to continue?');
        if (confirmed) {
          await directCreateNewChat();
        }
      } else {
        // For native platforms
        showCustomAlert(
          'Create New Chat',
          'If you create a new chat, the current one will be deleted. Are you sure you would like to continue?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Continue',
              onPress: async () => {
                await directCreateNewChat();
              },
            },
          ]
        );
      }
    } else if (userMessageCount === 0) {
      // If no user messages yet, just create a new chat without confirmation
      console.log("No user messages yet, creating new chat without confirmation");
      await directCreateNewChat();
    } else {
      // This shouldn't happen based on the conditions above, but just in case
      console.log("User has 1-4 messages, showing alert");
      showCustomAlert(
        'Cannot Create New Chat',
        'Please send at least 5 messages in this chat before creating a new one.'
      );
    }
  };

  // Handle the New Chat button in the limit reached sections
  const handleLimitNewChat = async () => {
    console.log("Limit New Chat button clicked");
    
    // Count user messages in the current chat
    const userMessageCount = messages.filter(msg => msg.sender === 'user').length;
    console.log("User message count:", userMessageCount);
    
    // If user has sent fewer than 5 messages, don't allow creating a new chat
    // Unless they haven't sent any messages at all (new user)
    if (userMessageCount > 0 && userMessageCount < 5) {
      console.log("User has fewer than 5 messages, showing alert");
      showCustomAlert(
        'Cannot Create New Chat',
        'Please send at least 5 messages in this chat before creating a new one.'
      );
      return;
    }
    
    // Show confirmation dialog if there are any user messages
    if (userMessageCount >= 5) {
      console.log("User has 5+ messages, showing confirmation dialog");
      
      if (Platform.OS === 'web') {
        // For web, use confirm dialog
        const confirmed = window.confirm('If you create a new chat, the current one will be deleted. Are you sure you would like to continue?');
        if (confirmed) {
          await directCreateNewChat();
        }
      } else {
        // For native platforms
        showCustomAlert(
          'Create New Chat',
          'If you create a new chat, the current one will be deleted. Are you sure you would like to continue?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Continue',
              onPress: async () => {
                await directCreateNewChat();
              },
            },
          ]
        );
      }
    } else if (userMessageCount === 0) {
      // If no user messages yet, just create a new chat without confirmation
      console.log("No user messages yet, creating new chat without confirmation");
      await directCreateNewChat();
    } else {
      // This shouldn't happen based on the conditions above, but just in case
      console.log("User has 1-4 messages, showing alert");
      showCustomAlert(
        'Cannot Create New Chat',
        'Please send at least 5 messages in this chat before creating a new one.'
      );
    }
  };

  // Navigate to consultation page
  const goToConsultation = () => {
    console.log('Navigating to consultation page');
    router.push('/consultation');
  };

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    // Check if message limit is reached
    const userMessageCount = messages.filter(msg => msg.sender === 'user').length;
    if (userMessageCount >= MAX_MESSAGES) {
      setLimitReached('message');
      setInput('');
      return;
    }
    
    // Get the latest token usage from the database before checking
    if (!userProfile?.isPremium) {
      try {
        const currentTokenUsage = await getUserTokenUsage(user?.uid || 'anonymous');
        
        // Check if token limit is reached for non-premium users
        if (currentTokenUsage >= FREE_TOKEN_LIMIT) {
          setLimitReached('token');
          setInput('');
          return;
        }
      } catch (error) {
        console.error('Error checking token usage:', error);
        // Continue anyway if we can't check token usage
      }
    }
    
    setIsLoading(true);
    
    try {
      // Process the user's message as a single question
      await processSingleQuestion(input.trim());
    } catch (outerError) {
      console.error('Unexpected error in handleSendMessage:', outerError);
      
      // Add error message to chat
      const errorResponseMessage: Message = {
        id: `error-${Date.now()}`,
        text: 'Sorry, I encountered an unexpected error. Please try again later.',
        sender: 'bot',
      };
      
      setMessages(prev => [...prev, errorResponseMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to process a single question
  const processSingleQuestion = async (question: string) => {
    // Add user message to chat
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: question,
      sender: 'user',
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    // Estimate user message tokens
    const estimatedUserTokens = Math.ceil(question.length / 4);
    
    // Update token usage
    await updateTokenUsage(estimatedUserTokens, 0);
    
    // Contact information to provide when we can't answer a question
    const contactInfo = `
CONTACT DETAILS
18 Prior Deram Walk, Coventry CV4 8FT

02477 360021
info@safehmo.co.uk
`;
    
    try {
      // Save user message to database
      await saveChatMessage(sessionId || '', question, true);
      
      // Get previous messages for context
      const chatHistory = await getChatMessages(sessionId || '');
      const conversationHistory = chatHistory.map(msg => ({
        role: msg.isUserMessage ? 'user' as const : 'assistant' as const,
        content: msg.content
      }));
      
      // Create a cache key based on the question and recent conversation context
      const recentContext = conversationHistory.slice(-3).map(msg => msg.content.substring(0, 30)).join('|');
      const cacheKey = `${question}|${recentContext}`;
      
      // Check if we have a cached response
      const cachedEntry = queryCache.get(cacheKey);
      let response;
      let usedCache = false;
      
      if (cachedEntry && (Date.now() - cachedEntry.timestamp) < CACHE_EXPIRATION_MS) {
        console.log('Using cached response for query');
        response = { 
          text: cachedEntry.response,
          sources: []
        };
        usedCache = true;
      } else {
        // By default, use the standard document search approach
        console.log('Using standard document search for question');
        
        // Only use reasoning layer for complex follow-up questions that reference previous context
        const followUpIndicators = [
          'previous', 'earlier', 'before', 'above', 'mentioned', 
          'you said', 'as you mentioned', 'what about', 'tell me more',
          'explain further', 'elaborate', 'additionally'
        ];
        
        const isLikelyFollowUp = followUpIndicators.some(indicator => 
          question.toLowerCase().includes(indicator.toLowerCase())
        );
        
        try {
          if (conversationHistory.length >= 2 && isLikelyFollowUp) {
            console.log('Using reasoning layer for complex follow-up question');
            
            try {
              // Use the reasoning layer for follow-up questions
              const reasoningResponse = await processFollowUpQuestion(
                question, 
                conversationHistory,
                'default' // Use a default chatbot ID since we're not using multiple chatbots
              );
              
              console.log('Reasoning response:', reasoningResponse);
              response = { 
                text: reasoningResponse.answer,
                sources: []
              };
              
              // Log token usage with accurate counts from the reasoning layer
              if (reasoningResponse.tokens) {
                await updateTokenUsage(reasoningResponse.tokens.prompt, reasoningResponse.tokens.completion);
              }
            } catch (reasoningError) {
              console.error('Error using reasoning layer:', reasoningError);
              response = {
                text: `I cannot answer this question. Please contact us for further assistance.\n${contactInfo}`,
                sources: []
              };
            }
          } else {
            // For most questions, use the standard document search
            console.log('Using standard document search for regular question');
            try {
              // Generate response using all documents
              const responseText = await generateChatResponseFromAllDocs(
                user?.uid || 'anonymous',
                sessionId || '',
                question
              );
              
              // Check if the response indicates no information was found
              const noInfoIndicators = [
                "I couldn't find any relevant information",
                "I don't have that information",
                "could not find",
                "couldn't find",
                "don't have information",
                "no information available",
                "no relevant information",
                "Unable to find",
                "not mentioned in",
                "not provided in"
              ];
              
              const noInfoFound = noInfoIndicators.some(indicator => 
                responseText.toLowerCase().includes(indicator.toLowerCase())
              );
              
              // If standard search couldn't find info, try reasoning layer as fallback
              if (noInfoFound && conversationHistory.length >= 1) {
                console.log('Standard search found no info, falling back to reasoning layer');
                
                try {
                  // Use the reasoning layer as a fallback
                  const reasoningResponse = await processFollowUpQuestion(
                    question, 
                    conversationHistory,
                    'default'
                  );
                  
                  console.log('Fallback reasoning response:', reasoningResponse);
                  response = { 
                    text: reasoningResponse.answer,
                    sources: []
                  };
                  
                  // Log token usage with accurate counts from the reasoning layer
                  if (reasoningResponse.tokens) {
                    await updateTokenUsage(reasoningResponse.tokens.prompt, reasoningResponse.tokens.completion);
                  }
                } catch (fallbackError) {
                  console.error('Error using fallback reasoning layer:', fallbackError);
                  response = {
                    text: `I cannot answer this question. Please contact us for further assistance.\n\n${contactInfo}`,
                    sources: []
                  };
                }
              } else {
                // Use the standard response
                response = {
                  text: responseText,
                  sources: [] // No sources in string response
                };
                
                // Log token usage with estimated counts
                await updateTokenUsage(Math.round(question.length / 4), Math.round(responseText.length / 4));
              }
            } catch (standardSearchError) {
              console.error('Error using standard search:', standardSearchError);
              
              try {
                // Try reasoning layer as last resort
                const reasoningResponse = await processFollowUpQuestion(
                  question, 
                  conversationHistory,
                  'default'
                );
                
                response = { 
                  text: reasoningResponse.answer,
                  sources: []
                };
                
                // Log token usage with accurate counts from the reasoning layer
                if (reasoningResponse.tokens) {
                  await updateTokenUsage(reasoningResponse.tokens.prompt, reasoningResponse.tokens.completion);
                }
              } catch (lastResortError) {
                console.error('Error using reasoning layer as last resort:', lastResortError);
                response = {
                  text: `I cannot answer this question. Please contact us for further assistance.\n${contactInfo}`,
                  sources: []
                };
              }
            }
          }
        } catch (innerError) {
          console.error('Error in response generation:', innerError);
          throw innerError; // Re-throw to be caught by the outer catch
        }
      }
      
      // Cache the response for future use if we have one
      if (response) {
        queryCache.set(cacheKey, {
          response: response.text,
          timestamp: Date.now(),
          sources: [] // Don't store sources in cache
        });
        
        // Add bot message to chat
        const botMessage: Message = {
          id: `bot-${Date.now()}`,
          text: response.text,
          sender: 'bot',
        };
        
        setMessages(prev => [...prev, botMessage]);
        
        // Only save to database if not using cached response
        if (!usedCache) {
          // Save message without sources
          await saveChatMessage(sessionId || '', response.text, false, []);
        }
        
        // Check if message limit is reached after adding the bot message
        const userMessageCount = messages.filter(msg => msg.sender === 'user').length;
        if (userMessageCount >= MAX_MESSAGES) {
          setLimitReached('message');
        }
        
        // Check if token limit is reached after adding the bot message
        if (!userProfile?.isPremium && tokenCount >= FREE_TOKEN_LIMIT) {
          setLimitReached('token');
        }
      }
    } catch (error) {
      console.error('Error in processSingleQuestion:', error);
      
      // Add error message to chat
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        text: `I'm sorry, I encountered an error processing your request. Please try again later or contact our support team for assistance.\n\n${contactInfo}`,
        sender: 'bot',
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      // Estimate tokens for error message
      const estimatedPromptTokens = Math.ceil(question.length / 4);
      const estimatedCompletionTokens = Math.ceil(errorMessage.text.length / 4);
      await updateTokenUsage(estimatedPromptTokens, estimatedCompletionTokens);
    }
  };

  // Update token usage in state and database
  const updateTokenUsage = async (promptTokens: number, completionTokens: number, skipLimitCheck?: boolean) => {
    // Update local state
    const newTokenCount = tokenCount + promptTokens + completionTokens;
    setTokenCount(newTokenCount);
    setTotalTokenUsage(newTokenCount);
    
    // Log to database
    try {
      await logTokenUsage({
        userId: user?.uid || 'anonymous',
        promptTokens,
        completionTokens,
        model: 'openai',
        type: 'chat',
        sessionId: sessionId || 'general'
      });
      
      // Check if limit is reached after update
      if (!userProfile?.isPremium && newTokenCount >= FREE_TOKEN_LIMIT && !skipLimitCheck) {
        setHasReachedTotalLimit(true);
        setLimitReached('token');
      } else {
        setHasReachedTotalLimit(false);
      }
    } catch (error) {
      console.error('Error logging token usage:', error);
    }
  };

  // Render a message item
  const renderMessageItem = (item: Message) => {
    return (
      <View style={[styles.messageContainer, item.sender === 'user' ? styles.userMessage : styles.botMessage]}>
        <Text style={styles.messageText}>{item.text}</Text>
      </View>
    );
  };

  // Render limit message and buttons
  const renderLimitMessage = () => {
    if (!limitReached) {
      return null;
    }
    
    if (limitReached === 'message') {
      return (
        <View style={styles.limitContainer}>
          <Text style={styles.limitText}>
            You have reached the limit of {MAX_MESSAGES} messages per chat. Please create a new chat to continue.
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                console.log("Message limit New Chat button pressed directly");
                handleLimitNewChat();
              }}
            >
              <Text style={styles.actionButtonText}>New Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={goToConsultation}
            >
              <Text style={styles.actionButtonText}>Request Free Consultation</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    } else if (limitReached === 'token') {
      return (
        <View style={styles.limitContainer}>
          <Text style={styles.limitText}>
            You have reached your free token allocation limit of {FREE_TOKEN_LIMIT.toLocaleString()} tokens. To continue with your queries please click "Request Free Consultation".
          </Text>
          <View style={styles.buttonRow}>
            {!hasReachedTotalLimit && (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => {
                  console.log("Token limit New Chat button pressed directly");
                  handleLimitNewChat();
                }}
              >
                <Text style={styles.actionButtonText}>New Chat</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[styles.actionButton, hasReachedTotalLimit && { width: '100%' }]}
              onPress={goToConsultation}
            >
              <Text style={styles.actionButtonText}>Request Free Consultation</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    
    return null;
  };

  if (isCompact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactHeader}>
          <Text style={styles.compactHeaderTitle}>Safe HMO Assistant</Text>
        </View>
        <View style={styles.compactContent}>
          {messages.length > 0 ? (
            <ScrollView 
              style={styles.compactMessages}
              ref={messagesEndRef}
            >
              {messages.map((message) => (
                <View 
                  key={message.id} 
                  style={[
                    styles.compactMessageBubble,
                    message.sender === 'user' ? styles.compactUserBubble : styles.compactBotBubble
                  ]}
                >
                  <Text style={styles.compactMessageText}>{message.text}</Text>
                </View>
              ))}
              {renderLimitMessage()}
            </ScrollView>
          ) : (
            <Text style={styles.compactText}>
              Ask me anything about HMO regulations, compliance, or property management.
            </Text>
          )}
          <View style={styles.compactInputContainer}>
            <TextInput
              style={styles.compactInput}
              placeholder="Type your question here..."
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSendMessage}
              editable={!limitReached}
            />
            {!limitReached ? (
              <TouchableOpacity 
                style={styles.compactButton}
                onPress={handleSendMessage}
                disabled={!input.trim() || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.compactButtonText}>Ask</Text>
                )}
              </TouchableOpacity>
            ) : !hasReachedTotalLimit ? (
              <TouchableOpacity 
                style={styles.compactButton}
                onPress={() => {
                  console.log("Compact New Chat button pressed directly");
                  handleHeaderNewChat();
                }}
              >
                <Text style={styles.compactButtonText}>New Chat</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Safe HMO Assistant</Text>
        {!limitReached && !hasReachedTotalLimit && (
          <TouchableOpacity 
            style={styles.newChatButton}
            onPress={() => {
              console.log("New Chat button in header pressed directly");
              handleHeaderNewChat();
            }}
            accessibilityLabel="Create a new chat"
          >
            <Text style={styles.newChatButtonText}>New Chat</Text>
          </TouchableOpacity>
        )}
      </View>

      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>You're offline. Limited functionality available.</Text>
        </View>
      )}

      <ScrollView
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        ref={messagesEndRef}
      >
        {messages.map((message) => (
          <View key={message.id}>
            {renderMessageItem(message)}
          </View>
        ))}
        {renderLimitMessage()}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type your message here..."
          value={input}
          onChangeText={setInput}
          multiline
          editable={!limitReached}
        />
        {!limitReached ? (
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!input.trim() || isLoading) && styles.disabledButton
            ]}
            onPress={handleSendMessage}
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text>Send</Text>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    backgroundColor: color(1),
    padding: 16,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  offlineBanner: {
    backgroundColor: '#FF5252',
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineText: {
    color: '#FFF',
    marginLeft: 8,
    fontSize: 12,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  messageContainer: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userMessage: {
    backgroundColor: color(1),
    alignSelf: 'flex-end',
    borderTopRightRadius: 4,
  },
  botMessage: {
    backgroundColor: '#FFF',
    alignSelf: 'flex-start',
    borderTopLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  input: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: color(1),
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#CCC',
  },
  compactContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 10,
  },
  compactHeader: {
    backgroundColor: color(1),
    padding: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    alignItems: 'center',
  },
  compactHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  compactContent: {
    padding: 16,
  },
  compactText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  compactInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  compactButton: {
    backgroundColor: color(1),
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignItems: 'center',
    marginLeft: 8,
  },
  compactButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  compactLink: {
    color: color(1),
    fontSize: 12,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  compactMessages: {
    maxHeight: 120,
    marginBottom: 10,
  },
  compactMessageBubble: {
    padding: 8,
    borderRadius: 12,
    marginBottom: 4,
    maxWidth: '85%',
  },
  compactUserBubble: {
    backgroundColor: color(0.8),
    alignSelf: 'flex-end',
  },
  compactBotBubble: {
    backgroundColor: '#F0F0F0',
    alignSelf: 'flex-start',
  },
  compactMessageText: {
    fontSize: 14,
    color: '#333',
  },
  limitContainer: {
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  limitText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: color(1),
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  newChatButton: {
    backgroundColor: color(1),
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 16,
    top: 16,
  },
  newChatButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  compactInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
});
