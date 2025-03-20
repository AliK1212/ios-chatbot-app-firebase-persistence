import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

type NetworkContextType = {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  lastOnlineTimestamp: number | null;
  showOfflineAlert: () => void;
  checkConnectivity: () => Promise<boolean>;
};

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NETWORK_CACHE_KEY = '@SafeHMO:networkStatus';

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true);
  const [lastOnlineTimestamp, setLastOnlineTimestamp] = useState<number | null>(null);

  // Initialize network state and set up listeners
  useEffect(() => {
    const initNetworkStatus = async () => {
      try {
        // Try to load cached network status
        const cachedNetworkStatus = await AsyncStorage.getItem(NETWORK_CACHE_KEY);
        if (cachedNetworkStatus) {
          const { lastOnline } = JSON.parse(cachedNetworkStatus);
          setLastOnlineTimestamp(lastOnline);
        }
      } catch (error) {
        console.error('Error loading cached network status:', error);
      }

      // Check current network state
      const netInfo = await NetInfo.fetch();
      setIsConnected(netInfo.isConnected ?? false);
      setIsInternetReachable(netInfo.isInternetReachable ?? false);

      if (netInfo.isConnected && netInfo.isInternetReachable) {
        updateLastOnlineTimestamp();
      }
    };

    initNetworkStatus();

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(state.isConnected ?? false);
      setIsInternetReachable(state.isInternetReachable ?? false);

      if (state.isConnected && state.isInternetReachable) {
        updateLastOnlineTimestamp();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Update the timestamp when the device is online
  const updateLastOnlineTimestamp = async () => {
    const timestamp = Date.now();
    setLastOnlineTimestamp(timestamp);
    
    try {
      await AsyncStorage.setItem(
        NETWORK_CACHE_KEY,
        JSON.stringify({ lastOnline: timestamp })
      );
    } catch (error) {
      console.error('Error saving network status:', error);
    }
  };

  // Show an alert when user tries to use online-only features while offline
  const showOfflineAlert = () => {
    Alert.alert(
      'No Internet Connection',
      'This feature requires an internet connection. Please connect to the internet and try again.',
      [{ text: 'OK', onPress: () => {} }]
    );
  };

  // Function to check if device is currently connected
  const checkConnectivity = async (): Promise<boolean> => {
    const netInfo = await NetInfo.fetch();
    return !!(netInfo.isConnected && netInfo.isInternetReachable);
  };

  return (
    <NetworkContext.Provider
      value={{
        isConnected,
        isInternetReachable,
        lastOnlineTimestamp,
        showOfflineAlert,
        checkConnectivity
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};
