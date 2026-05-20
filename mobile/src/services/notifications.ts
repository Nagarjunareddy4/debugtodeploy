import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Linking } from 'react-native';
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

// FIX NOTIF-001: Handle notification taps — open deep link or app home
Notifications.addNotificationResponseReceivedListener((response) => {
  const data = response.notification.request.content.data as Record<string, string>;
  const url = data?.url;
  if (url) {
    Linking.openURL(url).catch(() => {});
  } else {
    // Default: open the app (already in foreground or brings to front)
    Linking.openURL('https://debugtodeploy.com').catch(() => {});
  }
});

const ENGAGEMENT_MESSAGES = [
  // --- DevOps Quiz Specific Challenges ---
  {
    title: "🧠 Daily DevOps Quiz is live!",
    body: "Today's Kubernetes & CI/CD challenge is ready. Can you score 5/5 today?",
    category: 'quiz'
  },
  {
    title: "⚡ 5-Minute Quiz Challenge",
    body: "Test your Docker and Terraform knowledge in 5 quick questions. Earn XP and level up!",
    category: 'quiz'
  },
  {
    title: "🏆 Maintain your Daily Streak!",
    body: "Take today's DevOps quiz to secure your daily streak and earn bonus points.",
    category: 'quiz'
  },
  {
    title: "⚙️ Put your Sysadmin skills to the test",
    body: "Today's Linux & Networking quiz is hot off the press. Let's see how much you know!",
    category: 'quiz'
  },
  // --- General Engagement & Streak Guard ---
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
    // Force immediate local notifications scheduling on fresh permission grant
    await setupDailyEngagementNotifications(true);

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

export async function setupDailyEngagementNotifications(force = false) {
  const lastScheduled = await AsyncStorage.getItem('dtd_last_notification_sync');
  const now = Date.now();
  
  if (lastScheduled && !force) {
    const hoursSinceLastSync = (now - parseInt(lastScheduled)) / (1000 * 60 * 60);
    if (hoursSinceLastSync < 6) return; // Only re-sync every 6 hours
  }

  // 1. Clear existing to avoid duplicates
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Helper to generate a random time within a specified hour range
  const getRandomTimeBetween = (hourStart: number, hourEnd: number, daysOffset: number): Date => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    const randomHour = Math.floor(Math.random() * (hourEnd - hourStart + 1)) + hourStart;
    const randomMinute = Math.floor(Math.random() * 60);
    date.setHours(randomHour, randomMinute, 0, 0);
    return date;
  };

  const quizMessages = ENGAGEMENT_MESSAGES.filter(m => m.category === 'quiz');
  const otherMessages = ENGAGEMENT_MESSAGES.filter(m => m.category !== 'quiz');

  const shuffledQuiz = [...quizMessages].sort(() => 0.5 - Math.random());
  const shuffledOther = [...otherMessages].sort(() => 0.5 - Math.random());

  // 2. Schedule 5 rolling organic slots at randomized optimal slots:
  const slots = [
    // Slot 1: Tomorrow Morning (9:00 AM - 11:30 AM) - Morning Quiz Challenge
    {
      date: getRandomTimeBetween(9, 11, 1),
      message: shuffledQuiz[0]
    },
    // Slot 2: Tomorrow Evening (5:30 PM - 8:00 PM) - Evening Streak safeguard
    {
      date: getRandomTimeBetween(17, 20, 1),
      message: shuffledOther[0]
    },
    // Slot 3: Day 2 Afternoon (1:30 PM - 4:00 PM) - Midday Lab push
    {
      date: getRandomTimeBetween(13, 16, 2),
      message: shuffledOther[1]
    },
    // Slot 4: Day 2 Morning (9:30 AM - 11:45 AM) - Morning Quiz Challenge
    {
      date: getRandomTimeBetween(9, 11, 2),
      message: shuffledQuiz[1]
    },
    // Slot 5: Day 3 Evening (6:00 PM - 8:30 PM) - Dynamic training recap
    {
      date: getRandomTimeBetween(18, 20, 3),
      message: shuffledOther[2]
    }
  ];

  for (const slot of slots) {
    if (slot.date.getTime() > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: slot.message.title,
          body: slot.message.body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: slot.date,
        },
      });
    }
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


