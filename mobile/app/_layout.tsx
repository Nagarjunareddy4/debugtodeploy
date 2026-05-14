import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { registerForPushNotificationsAsync, setupDailyEngagementNotifications } from '../src/services/notifications';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();

    // 1. Always schedule local engagement notifications — no token needed.
    // Local notifications are fired by the device OS itself (like an alarm).
    setupDailyEngagementNotifications();

    // 2. Separately, register for remote push notifications.
    // This gets the FCM/Expo token and saves it to the profile in Supabase.
    // Even if this fails (simulator, permission denied), local notifications still work.
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        console.log('[DTD] Push notification token saved to Supabase:', token);
      } else {
        console.log('[DTD] No push token — running on simulator or permission denied. Local notifications still active.');
      }
    }).catch(err => {
      console.warn('[DTD] Push registration failed (non-critical):', err);
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
