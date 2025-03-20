import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { WifiOff, Wifi } from 'lucide-react-native';
import { useNetwork } from '../../context/NetworkContext';

export function NetworkStatusBar() {
  const { isConnected, isInternetReachable, showOfflineAlert } = useNetwork();
  const [visible, setVisible] = useState(false);
  const [animation] = useState(new Animated.Value(0));
  
  // Show the status bar when network status changes
  useEffect(() => {
    if (!isConnected || !isInternetReachable) {
      setVisible(true);
      Animated.timing(animation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else if (visible) {
      // Add a delay before hiding when connection is restored
      Animated.timing(animation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
      });
    }
  }, [isConnected, isInternetReachable]);
  
  if (!visible) return null;
  
  const isOffline = !isConnected || !isInternetReachable;
  
  return (
    <Animated.View 
      style={[
        styles.container,
        isOffline ? styles.offlineContainer : styles.onlineContainer,
        { opacity: animation, transform: [{ translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [-50, 0]
        })}] }
      ]}
    >
      <View style={styles.content}>
        {isOffline ? (
          <>
            <WifiOff size={16} color="#FFF" />
            <Text style={styles.text}>
              You're offline. Some features may be limited.
            </Text>
            <TouchableOpacity 
              style={styles.button}
              onPress={showOfflineAlert}
            >
              <Text style={styles.buttonText}>Info</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Wifi size={16} color="#FFF" />
            <Text style={styles.text}>
              Connection restored
            </Text>
          </>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    paddingTop: 40, // Account for status bar
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  offlineContainer: {
    backgroundColor: '#E53935',
  },
  onlineContainer: {
    backgroundColor: '#43A047',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
