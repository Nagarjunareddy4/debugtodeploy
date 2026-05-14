import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const ENGAGEMENT_MESSAGES = [
  {
    title: "🔥 Keep your streak alive, Captain!",
    body: "It's time for your daily DevOps training. Complete one task to maintain your streak.",
    category: 'streak'
  },
  {
    title: "💡 Pro Tip: Check your Roadmap",
    body: "Review your personalized DevOps roadmap to stay on track. Small steps lead to big wins!",
    category: 'learning'
  },
  {
    title: "🚀 Mission Control is waiting",
    body: "Don't stall your cloud engineering journey. Hop back into your Cloud Labs!",
    category: 'labs'
  },
  {
    title: "🧠 Challenge your AI assistant",
    body: "Stuck on a deployment? Ask your AI mentor for a custom lab or a quick explanation.",
    category: 'ai'
  },
  {
    title: "🎯 Career Growth Alert",
    body: "Did you know? Consistent lab completion increases your profile readiness score by 15%.",
    category: 'career'
  },
  {
    title: "🛠️ New Tools available",
    body: "Check out the latest Terraform and Kubernetes labs. The industry is moving fast, keep up!",
    category: 'updates'
  },
  {
    title: "⭐ Aim for the Stars",
    body: "You're just a few labs away from your next Certificate. Ready to level up?",
    category: 'career'
  },
  {
    title: "🔋 Recharging your DevOps brain?",
    body: "Even 5 minutes of reading your roadmap counts as progress. Consistency is key!",
    category: 'streak'
  }
];

function getRandomMessages(count: number) {
  const shuffled = [...ENGAGEMENT_MESSAGES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  let token: string | undefined;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'DebugToDeploy Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00D2FF',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;

    // Send a welcome notification if they JUST granted permission for the first time
    if (status === 'granted') {
      const hasSentWelcome = await AsyncStorage.getItem('dtd_welcome_sent');
      if (!hasSentWelcome) {
        setTimeout(() => {
          sendLocalNotification(
            "👋 Welcome to DebugToDeploy!",
            "Your AI DevOps journey begins now. Head over to the Roadmap to get started."
          );
        }, 3000);
        await AsyncStorage.setItem('dtd_welcome_sent', 'true');
      }
    }
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission not granted.');
    return undefined;
  }

  // Push token registration only works on real physical devices.
  // Local scheduled notifications still work without a token.
  if (!Device.isDevice) {
    console.warn('[DTD] Physical device not detected. Skipping push token registration. Local notifications still work.');
    return undefined;
  }

  try {
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId ?? 'c4ae150a-2326-43d8-ba8f-803107821a5e',
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
  // Check if we already scheduled notifications in the last 12 hours to avoid "reset loops"
  const lastScheduled = await AsyncStorage.getItem('dtd_last_notification_sync');
  const now = Date.now();
  
  if (lastScheduled) {
    const hoursSinceLastSync = (now - parseInt(lastScheduled)) / (1000 * 60 * 60);
    if (hoursSinceLastSync < 12) {
      // Already scheduled recently, don't reset the timers
      return;
    }
  }

  // 1. Cancel all previously scheduled notifications
  await Notifications.cancelAllScheduledNotificationsAsync();

  // 2. Get a random set of messages for the next 3 days
  const dailyMessages = getRandomMessages(3);

  // 3. Schedule Day 1 Reminder (24 hours from now)
  await Notifications.scheduleNotificationAsync({
    content: {
      title: dailyMessages[0].title,
      body: dailyMessages[0].body,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 24 * 60 * 60, // 24 hours
      repeats: false,
    },
  });

  // 4. Schedule Day 2 Reminder (48 hours from now)
  await Notifications.scheduleNotificationAsync({
    content: {
      title: dailyMessages[1].title,
      body: dailyMessages[1].body,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.DEFAULT,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 48 * 60 * 60, // 48 hours
      repeats: false,
    },
  });

  // 5. Schedule Day 3 Reminder (72 hours from now)
  await Notifications.scheduleNotificationAsync({
    content: {
      title: dailyMessages[2].title,
      body: dailyMessages[2].body,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.DEFAULT,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 72 * 60 * 60, // 72 hours
      repeats: false,
    },
  });

  await AsyncStorage.setItem('dtd_last_notification_sync', now.toString());
}
