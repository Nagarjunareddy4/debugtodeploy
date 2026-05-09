import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  let token: string | undefined;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device.');
    return undefined;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    
    // Send a welcome notification if they JUST granted permission for the first time
    if (status === 'granted') {
      setTimeout(() => {
        sendLocalNotification(
          "👋 Welcome to DebugToDeploy!",
          "Your AI DevOps journey begins now. Head over to the Roadmap to get started."
        );
      }, 3000);
    }
  }
  if (finalStatus !== 'granted') {
    console.warn('Push notification permission not granted.');
    return undefined;
  }

  try {
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    })).data;

    // Save token to Supabase profile
    const { data: { user } } = await supabase.auth.getUser();
    if (user && token) {
      await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', user.id);
    }
  } catch (err) {
    console.error('Failed to get push token:', err);
  }

  return token;
}

export async function sendLocalNotification(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: {},
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      repeats: false,
    },
  });
}

export async function setupDailyEngagementNotifications() {
  // 1. Cancel all previously scheduled notifications (Resets the timer)
  await Notifications.cancelAllScheduledNotificationsAsync();

  // 2. Schedule Day 1 Reminder (24 hours from now)
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "🔥 Keep your streak alive, Captain!",
      body: "It's time for your daily DevOps training. Complete one task to maintain your streak.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 24 * 60 * 60, // 24 hours
      repeats: false,
    },
  });

  // 3. Schedule Day 2 Reminder (48 hours from now)
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "💡 Pro Tip: Check your Roadmap",
      body: "Review your personalized DevOps roadmap to stay on track. Small steps lead to big wins!",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 48 * 60 * 60, // 48 hours
      repeats: false,
    },
  });

  // 4. Schedule Day 3 Reminder (72 hours from now)
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "🚀 Mission Control is waiting",
      body: "Don't stall your cloud engineering journey. Hop back into your Cloud Labs!",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 72 * 60 * 60, // 72 hours
      repeats: false,
    },
  });
}
