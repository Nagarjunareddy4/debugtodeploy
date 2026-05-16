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
  } as any),
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
  }

  if (finalStatus === 'granted') {
    // Send a welcome notification if they haven't received it yet on this device
    const welcomeSent = await AsyncStorage.getItem('dtd_welcome_sent');
    if (!welcomeSent) {
      setTimeout(() => {
        sendLocalNotification(
          "👋 Welcome to DebugToDeploy!",
          "Your AI DevOps journey begins now. Head over to the Roadmap to get started."
        );
      }, 3000);
      await AsyncStorage.setItem('dtd_welcome_sent', 'true');
    }
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission not granted.');
    return undefined;
  }

  // Push token registration only works on real physical devices.
  if (!Device.isDevice) {
    console.warn('[DTD] Physical device not detected. Skipping push token registration.');
    return undefined;
  }

  try {
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId ?? 'c4ae150a-2326-43d8-ba8f-803107821a5e',
    })).data;

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
  const lastScheduled = await AsyncStorage.getItem('dtd_last_notification_sync');
  const now = Date.now();
  
  if (lastScheduled) {
    const hoursSinceLastSync = (now - parseInt(lastScheduled)) / (1000 * 60 * 60);
    if (hoursSinceLastSync < 6) return; // Only re-sync every 6 hours
  }

  // 1. Clear existing to avoid duplicates
  await Notifications.cancelAllScheduledNotificationsAsync();

  // 2. Schedule Daily Engagement at 6:00 PM (18:00)
  const messages = getRandomMessages(3);
  
  for (let i = 0; i < 3; i++) {
    const triggerDate = new Date();
    triggerDate.setDate(triggerDate.getDate() + i);
    triggerDate.setHours(18, 0, 0, 0);

    // If we're setting it for today (i=0) and it's already past 6 PM, skip today
    if (triggerDate.getTime() <= now) {
      triggerDate.setDate(triggerDate.getDate() + 3);
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: messages[i].title,
        body: messages[i].body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
  }

  // 3. Schedule Weekly Debrief (Every Sunday at 8:00 PM)
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "📊 Weekly Mission Debrief",
      body: "Your weekly progress report is ready! See how much closer you are to your DevOps goal.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, 
      hour: 20,
      minute: 0,
    } as any,
  });

  await AsyncStorage.setItem('dtd_last_notification_sync', now.toString());
}


