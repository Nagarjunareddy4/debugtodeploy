import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { registerForPushNotificationsAsync, setupDailyEngagementNotifications } from '../src/services/notifications';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
    
    // Register for push notifications when the app starts
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        console.log('Push notification token retrieved');
        
        // Setup the smart re-engagement daily timers
        setupDailyEngagementNotifications();
      }
    });
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
