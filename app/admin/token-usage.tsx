import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import { collection, query, orderBy, limit, getDocs, getFirestore, doc, getDoc, where } from 'firebase/firestore';
import { useUser } from '../../context/UserContext';
import { useRouter } from 'expo-router';
import { COLLECTIONS } from '../../firebase/config';
import { Card, Button, DataTable, Title, Chip, Divider, Avatar, Searchbar, Menu, Badge } from 'react-native-paper';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

type TokenUsage = {
  id: string;
  userId: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
  timestamp: any;
  sessionId?: string;
  type?: string;
  userInfo?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
};

type UserInfo = {
  firstName?: string;
  lastName?: string;
  email: string;
};

export default function TokenUsageDashboard() {
  const [tokenUsage, setTokenUsage] = useState<TokenUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMap, setUserMap] = useState<Record<string, UserInfo>>({});
  const [selectedTimeRange, setSelectedTimeRange] = useState<'day' | 'week' | 'month' | 'all'>('week');
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const { userProfile } = useUser();
  const router = useRouter();

  // Redirect non-admin users
  useEffect(() => {
    if (userProfile && userProfile.role !== 'admin') {
      router.replace('/');
    }
  }, [userProfile, router]);

  // Fetch token usage data
  useEffect(() => {
    const fetchTokenUsage = async () => {
      try {
        setLoading(true);
        const db = getFirestore();
        const q = query(
          collection(db, COLLECTIONS.TOKEN_USAGE),
          orderBy('timestamp', 'desc'),
          limit(100)
        );
        
        const querySnapshot = await getDocs(q);
        const usageData: TokenUsage[] = [];
        const userIds = new Set<string>();
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          usageData.push({
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate?.() || new Date()
          } as TokenUsage);
          
          if (data.userId) {
            userIds.add(data.userId);
          }
        });
        
        // Fetch user information for all user IDs
        const userInfo: Record<string, UserInfo> = {};
        await Promise.all(
          Array.from(userIds).map(async (userId) => {
            try {
              const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                userInfo[userId] = {
                  firstName: userData.firstName,
                  lastName: userData.lastName,
                  email: userData.email
                };
              }
            } catch (error) {
              console.error(`Error fetching user data for ${userId}:`, error);
            }
          })
        );
        
        setUserMap(userInfo);
        setTokenUsage(usageData);
      } catch (error) {
        console.error('Error fetching token usage:', error);
        setError('Failed to load token usage data');
      } finally {
        setLoading(false);
      }
    };
    
    if (userProfile?.role === 'admin') {
      fetchTokenUsage();
    }
  }, [userProfile]);

  // Filter data based on search query and selected filters
  const filteredData = tokenUsage.filter(item => {
    const userInfo = userMap[item.userId];
    const userName = userInfo ? 
      `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() : 
      item.userId;
    const searchLower = searchQuery.toLowerCase();
    
    // Filter by search query
    const matchesSearch = searchQuery === '' || 
      userName.toLowerCase().includes(searchLower) ||
      (userInfo?.email || '').toLowerCase().includes(searchLower) ||
      (item.model || '').toLowerCase().includes(searchLower) ||
      (item.type || '').toLowerCase().includes(searchLower);
    
    // Filter by selected model
    const matchesModel = !selectedModel || item.model === selectedModel;
    
    // Filter by time range
    let matchesTimeRange = true;
    if (selectedTimeRange !== 'all' && item.timestamp) {
      const now = new Date();
      const itemDate = new Date(item.timestamp);
      
      switch (selectedTimeRange) {
        case 'day':
          matchesTimeRange = now.getDate() === itemDate.getDate() &&
                            now.getMonth() === itemDate.getMonth() &&
                            now.getFullYear() === itemDate.getFullYear();
          break;
        case 'week':
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          matchesTimeRange = itemDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date();
          monthAgo.setMonth(now.getMonth() - 1);
          matchesTimeRange = itemDate >= monthAgo;
          break;
      }
    }
    
    return matchesSearch && matchesModel && matchesTimeRange;
  });

  // Calculate summary statistics
  const totalCost = calculateCost(filteredData);
  const totalTokensUsed = filteredData.reduce((sum, item) => sum + (item.totalTokens || 0), 0);
  const averageTokensPerQuery = filteredData.length > 0 ? totalTokensUsed / filteredData.length : 0;
  
  // Get unique models
  const models = Array.from(new Set(tokenUsage.map(item => item.model))).filter(Boolean);
  
  // Group by user for pie chart
  const userTokens = filteredData.reduce((acc, item) => {
    const userId = item.userId || 'unknown';
    if (!acc[userId]) {
      acc[userId] = {
        userId,
        totalTokens: 0,
        name: getUserDisplayName(userId)
      };
    }
    acc[userId].totalTokens += item.totalTokens || 0;
    return acc;
  }, {} as Record<string, { userId: string, totalTokens: number, name: string }>);
  
  // Prepare pie chart data (top 5 users)
  const topUsers = Object.values(userTokens)
    .sort((a, b) => b.totalTokens - a.totalTokens)
    .slice(0, 5);
  
  const pieChartData = topUsers.map((user, index) => ({
    name: user.name,
    tokens: user.totalTokens,
    color: getChartColor(index),
    legendFontColor: Colors.text.primary,
    legendFontSize: 12
  }));
  
  // Prepare bar chart data
  const chartData = prepareChartData(filteredData, selectedTimeRange);
  
  // Helper function to get user display name
  function getUserDisplayName(userId: string): string {
    const user = userMap[userId];
    if (!user) return userId.substring(0, 6) + '...';
    
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    } else if (user.firstName) {
      return user.firstName;
    } else if (user.email) {
      return user.email.split('@')[0];
    }
    
    return userId.substring(0, 6) + '...';
  }
  
  // Helper function to calculate cost
  function calculateCost(data: TokenUsage[]): number {
    return data.reduce((sum, item) => {
      // Pricing per 1000 tokens (as of April 2023)
      let promptCost = 0;
      let completionCost = 0;
      
      if (item.model?.includes('gpt-4')) {
        promptCost = (item.promptTokens || 0) / 1000 * 0.03;
        completionCost = (item.completionTokens || 0) / 1000 * 0.06;
      } else if (item.model?.includes('gpt-3.5')) {
        promptCost = (item.promptTokens || 0) / 1000 * 0.0015;
        completionCost = (item.completionTokens || 0) / 1000 * 0.002;
      } else if (item.model?.includes('embedding')) {
        promptCost = (item.promptTokens || 0) / 1000 * 0.0001;
      }
      
      return sum + promptCost + completionCost;
    }, 0);
  }
  
  // Helper function to prepare chart data based on time range
  function prepareChartData(data: TokenUsage[], timeRange: string) {
    let groupedData: Record<string, number> = {};
    
    data.forEach(item => {
      if (!item.timestamp) return;
      
      const date = new Date(item.timestamp);
      let key = '';
      
      switch (timeRange) {
        case 'day':
          key = `${date.getHours()}:00`;
          break;
        case 'week':
          key = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
          break;
        case 'month':
          key = `${date.getMonth()+1}/${date.getDate()}`;
          break;
        case 'all':
          key = `${date.getMonth()+1}/${date.getFullYear()}`;
          break;
      }
      
      if (!groupedData[key]) {
        groupedData[key] = 0;
      }
      
      groupedData[key] += item.totalTokens || 0;
    });
    
    // Sort keys appropriately
    let sortedKeys: string[] = [];
    if (timeRange === 'day') {
      sortedKeys = Object.keys(groupedData).sort((a, b) => {
        return parseInt(a) - parseInt(b);
      });
    } else if (timeRange === 'week') {
      const dayOrder = {Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6};
      sortedKeys = Object.keys(groupedData).sort((a, b) => {
        return dayOrder[a as keyof typeof dayOrder] - dayOrder[b as keyof typeof dayOrder];
      });
    } else {
      sortedKeys = Object.keys(groupedData);
    }
    
    return {
      labels: sortedKeys,
      datasets: [
        {
          data: sortedKeys.map(key => groupedData[key]),
          color: (opacity = 1) => Colors.primaryWithOpacity(opacity),
        }
      ]
    };
  }

  // Helper function to get chart colors
  function getChartColor(index: number): string {
    const colors = [
      Colors.primary,
      Colors.secondary,
      Colors.success,
      Colors.error,
      Colors.brand,
      Colors.gray.dark,
      Colors.gray.light,
      Colors.text.primary,
      Colors.text.secondary,
      Colors.primaryWithOpacity(0.7)
    ];
    return colors[index % colors.length];
  }

  if (!userProfile) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (userProfile.role !== 'admin') {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>You don't have permission to access this page.</Text>
        <Button 
          mode="contained" 
          onPress={() => router.back()}
          style={styles.button}
        >
          Back
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Title style={styles.title}>Token Usage Dashboard</Title>
          <Button 
            mode="contained" 
            icon="arrow-left"
            onPress={() => router.back()}
            style={styles.backButton}
            compact
          >
            Back
          </Button>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            {/* Filters */}
            <Card style={styles.filterCard}>
              <Card.Content>
                <Searchbar
                  placeholder="Search by user or model"
                  onChangeText={setSearchQuery}
                  value={searchQuery}
                  style={styles.searchBar}
                />
                
                <View style={styles.filterRow}>
                  <View style={styles.timeRangeContainer}>
                    <Text style={styles.filterLabel}>Time Range:</Text>
                    <View style={styles.chipContainer}>
                      <Chip 
                        selected={selectedTimeRange === 'day'} 
                        onPress={() => setSelectedTimeRange('day')}
                        style={styles.chip}
                      >
                        Day
                      </Chip>
                      <Chip 
                        selected={selectedTimeRange === 'week'} 
                        onPress={() => setSelectedTimeRange('week')}
                        style={styles.chip}
                      >
                        Week
                      </Chip>
                      <Chip 
                        selected={selectedTimeRange === 'month'} 
                        onPress={() => setSelectedTimeRange('month')}
                        style={styles.chip}
                      >
                        Month
                      </Chip>
                      <Chip 
                        selected={selectedTimeRange === 'all'} 
                        onPress={() => setSelectedTimeRange('all')}
                        style={styles.chip}
                      >
                        All
                      </Chip>
                    </View>
                  </View>
                  
                  <Menu
                    visible={menuVisible}
                    onDismiss={() => setMenuVisible(false)}
                    anchor={
                      <TouchableOpacity 
                        style={styles.modelFilter}
                        onPress={() => setMenuVisible(true)}
                      >
                        <Text style={styles.filterLabel}>
                          {selectedModel ? `Model: ${selectedModel}` : 'Filter by Model'}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color={Colors.text.secondary} />
                      </TouchableOpacity>
                    }
                  >
                    <Menu.Item 
                      onPress={() => {
                        setSelectedModel(null);
                        setMenuVisible(false);
                      }} 
                      title="All Models" 
                    />
                    {models.map(model => (
                      <Menu.Item 
                        key={model} 
                        onPress={() => {
                          setSelectedModel(model);
                          setMenuVisible(false);
                        }} 
                        title={model} 
                      />
                    ))}
                  </Menu>
                </View>
              </Card.Content>
            </Card>
            
            {/* Summary Stats */}
            <View style={styles.statsContainer}>
              <Card style={styles.statsCard}>
                <Card.Content>
                  <Text style={styles.statsTitle}>Total Cost</Text>
                  <Text style={styles.statsValue}>${totalCost.toFixed(4)}</Text>
                </Card.Content>
              </Card>
              
              <Card style={styles.statsCard}>
                <Card.Content>
                  <Text style={styles.statsTitle}>Total Tokens</Text>
                  <Text style={styles.statsValue}>{totalTokensUsed.toLocaleString()}</Text>
                </Card.Content>
              </Card>
              
              <Card style={styles.statsCard}>
                <Card.Content>
                  <Text style={styles.statsTitle}>Avg Tokens/Query</Text>
                  <Text style={styles.statsValue}>{Math.round(averageTokensPerQuery).toLocaleString()}</Text>
                </Card.Content>
              </Card>
            </View>
            
            {/* Charts */}
            <View style={styles.chartsContainer}>
              {/* Token Usage Chart */}
              {chartData.labels.length > 0 && (
                <Card style={styles.chartCard}>
                  <Card.Title title={`Token Usage (${selectedTimeRange === 'day' ? 'Today' : selectedTimeRange === 'week' ? 'This Week' : selectedTimeRange === 'month' ? 'This Month' : 'All Time'})`} />
                  <Card.Content>
                    <BarChart
                      data={chartData}
                      width={Dimensions.get('window').width - 40}
                      height={220}
                      yAxisLabel=""
                      yAxisSuffix=""
                      chartConfig={{
                        backgroundColor: Colors.background,
                        backgroundGradientFrom: Colors.background,
                        backgroundGradientTo: Colors.background,
                        decimalPlaces: 0,
                        color: (opacity = 1) => Colors.primaryWithOpacity(opacity),
                        labelColor: (opacity = 1) => Colors.text.primary,
                        style: {
                          borderRadius: 16,
                        },
                        propsForLabels: {
                          fontSize: 10,
                        }
                      }}
                      style={{
                        marginVertical: 8,
                        borderRadius: 16,
                      }}
                    />
                  </Card.Content>
                </Card>
              )}
              
              {/* User Distribution Pie Chart */}
              {pieChartData.length > 0 && (
                <Card style={styles.chartCard}>
                  <Card.Title title="Token Usage by User" />
                  <Card.Content>
                    <PieChart
                      data={pieChartData}
                      width={Dimensions.get('window').width - 40}
                      height={220}
                      chartConfig={{
                        backgroundColor: Colors.background,
                        backgroundGradientFrom: Colors.background,
                        backgroundGradientTo: Colors.background,
                        color: (opacity = 1) => Colors.text.primary,
                      }}
                      accessor="tokens"
                      backgroundColor="transparent"
                      paddingLeft="15"
                      absolute
                    />
                  </Card.Content>
                </Card>
              )}
            </View>
            
            {/* Recent Queries Table */}
            <Card style={styles.tableCard}>
              <Card.Title title="Recent Queries" />
              <Card.Content>
                <DataTable>
                  <DataTable.Header>
                    <DataTable.Title>User</DataTable.Title>
                    <DataTable.Title>Date</DataTable.Title>
                    <DataTable.Title>Model</DataTable.Title>
                    <DataTable.Title numeric>Tokens</DataTable.Title>
                    <DataTable.Title numeric>Cost</DataTable.Title>
                  </DataTable.Header>
                  
                  {filteredData.slice(0, 20).map((item, index) => {
                    const userInfo = userMap[item.userId];
                    const userName = getUserDisplayName(item.userId);
                    const date = new Date(item.timestamp);
                    const formattedDate = `${date.toLocaleDateString()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                    
                    // Calculate cost for this item
                    const itemCost = calculateCost([item]);
                    
                    return (
                      <DataTable.Row key={item.id || index}>
                        <DataTable.Cell>
                          <View style={styles.userCell}>
                            <Avatar.Text 
                              size={24} 
                              label={userName.substring(0, 2).toUpperCase()} 
                              style={styles.avatar}
                            />
                            <Text numberOfLines={1} style={styles.userName}>
                              {userName}
                            </Text>
                          </View>
                        </DataTable.Cell>
                        <DataTable.Cell>{formattedDate}</DataTable.Cell>
                        <DataTable.Cell>
                          <Badge style={[styles.modelBadge, item.model?.includes('gpt-4') ? styles.gpt4Badge : styles.gpt3Badge]}>
                            {item.model?.replace('gpt-', '')?.substring(0, 8) || 'unknown'}
                          </Badge>
                        </DataTable.Cell>
                        <DataTable.Cell numeric>{item.totalTokens}</DataTable.Cell>
                        <DataTable.Cell numeric>${itemCost.toFixed(5)}</DataTable.Cell>
                      </DataTable.Row>
                    );
                  })}
                </DataTable>
              </Card.Content>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  backButton: {
    backgroundColor: Colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    padding: 20,
    backgroundColor: Colors.primaryWithOpacity(0.1),
    borderRadius: 8,
    marginVertical: 16,
  },
  errorText: {
    color: Colors.error,
    fontSize: 16,
    textAlign: 'center',
  },
  filterCard: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 8,
  },
  searchBar: {
    marginBottom: 12,
    backgroundColor: Colors.gray.light,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeRangeContainer: {
    flex: 3,
  },
  filterLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  modelFilter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    backgroundColor: Colors.gray.light,
    borderRadius: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statsCard: {
    flex: 1,
    marginHorizontal: 4,
    elevation: 2,
    borderRadius: 8,
  },
  statsTitle: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  statsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  chartsContainer: {
    marginBottom: 16,
  },
  chartCard: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 8,
  },
  tableCard: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 8,
  },
  userCell: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 8,
    backgroundColor: Colors.primary,
  },
  userName: {
    maxWidth: 80,
  },
  modelBadge: {
    fontSize: 10,
  },
  gpt4Badge: {
    backgroundColor: Colors.success,
  },
  gpt3Badge: {
    backgroundColor: Colors.secondary,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
  },
});
