import { supabase } from './supabase';

interface NotificationMessage {
  title: string;
  body: string;
  emoji: string;
}

// Engaging notification messages for daily quizzes
const QUIZ_NOTIFICATIONS: NotificationMessage[] = [
  {
    title: "⚡ Daily DevOps Challenge Ready!",
    body: "Test your K8s knowledge with today's 5-question quiz. Earn XP and climb the leaderboard!",
    emoji: "⚡"
  },
  {
    title: "🚀 New DevOps Quiz Available!",
    body: "Fresh questions waiting! Answer all 5 to unlock bonus XP and bragging rights.",
    emoji: "🚀"
  },
  {
    title: "🧠 Brain-Teaser Time!",
    body: "Today's DevOps quiz is live. Think you can get all 5 correct? Take the challenge!",
    emoji: "🧠"
  },
  {
    title: "🏆 Streak Alert!",
    body: "Keep your quiz streak alive! Complete today's 5 questions and stay in the race.",
    emoji: "🏆"
  },
  {
    title: "💪 Master DevOps Daily",
    body: "Your expertise is needed! New DevOps questions are ready for you.",
    emoji: "💪"
  },
  {
    title: "🎯 Today's Mission Unlocked",
    body: "5 DevOps questions. 5 chances to earn XP. Ready to take on today's quiz?",
    emoji: "🎯"
  },
  {
    title: "🌟 Level Up Your Skills",
    body: "Daily quiz is live! Complete it to boost your XP and knowledge.",
    emoji: "🌟"
  },
  {
    title: "🔥 Are You Ready?",
    body: "DevOps knowledge test incoming! Submit answers and watch your XP grow.",
    emoji: "🔥"
  }
];

/**
 * Get random engaging notification message
 */
export function getRandomNotificationMessage(): NotificationMessage {
  return QUIZ_NOTIFICATIONS[Math.floor(Math.random() * QUIZ_NOTIFICATIONS.length)];
}

/**
 * Send quiz notification to user
 */
export async function sendQuizNotification(userId: string, date: string = new Date().toISOString().split('T')[0]) {
  try {
    const storageKey = `quiz_notification_${userId}_${date}`;
    
    // Check if notification already sent today via localStorage
    if (localStorage.getItem(storageKey)) {
      return; // Already notified
    }

    const message = getRandomNotificationMessage();

    // Save notification record locally
    localStorage.setItem(storageKey, JSON.stringify({
      sentAt: new Date().toISOString(),
      wasRead: false
    }));

    // Try to send browser notification if available
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(message.title, {
        body: message.body,
        icon: '/favicon.svg',
        tag: 'daily-quiz',
        requireInteraction: false
      });
    }

    return message;
  } catch (err) {
    console.error('Error sending notification:', err);
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(userId: string, date: string) {
  try {
    const storageKey = `quiz_notification_${userId}_${date}`;
    const existing = localStorage.getItem(storageKey);
    
    if (existing) {
      const data = JSON.parse(existing);
      data.wasRead = true;
      data.readAt = new Date().toISOString();
      localStorage.setItem(storageKey, JSON.stringify(data));
    }
  } catch (err) {
    console.error('Error marking notification as read:', err);
  }
}

/**
 * Update user quiz streak
 */
export async function updateQuizStreak(userId: string) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get user's profile
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('quiz_streak, last_quiz_date')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    let newStreak = profile?.quiz_streak || 0;
    const lastQuizDate = profile?.last_quiz_date;

    // Check if completion is consecutive
    if (lastQuizDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastQuizDate === yesterdayStr) {
        newStreak += 1; // Consecutive - increment
      } else {
        newStreak = 1; // New streak
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          quiz_streak: newStreak,
          last_quiz_date: today
        })
        .eq('id', userId);

      if (updateError) throw updateError;
    }

    return newStreak;
  } catch (err) {
    console.error('Error updating quiz streak:', err);
    return 0;
  }
}

/**
 * Get user's quiz statistics
 */
export async function getQuizStats(userId: string) {
  try {
    // Get quiz completions
    const { data: completions, error: completionsError } = await supabase
      .from('quiz_completions')
      .select('correct_answers, xp_earned')
      .eq('user_id', userId);

    if (completionsError) {
      console.warn('quiz_completions table missing or error, ignoring completions stats');
    }

    // Get profile stats
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('quiz_streak, total_quiz_xp')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    const totalQuizzesCompleted = completions?.length || 0;
    const totalCorrectAnswers = completions?.reduce((sum, c) => sum + (c.correct_answers || 0), 0) || 0;
    const totalXpEarned = completions?.reduce((sum, c) => sum + (c.xp_earned || 0), 0) || 0;
    const averageScore = totalQuizzesCompleted > 0
      ? Math.round((totalCorrectAnswers / (totalQuizzesCompleted * 5)) * 100)
      : 0;

    return {
      totalQuizzesCompleted,
      totalCorrectAnswers,
      totalXpEarned,
      averageScore,
      currentStreak: profile?.quiz_streak || 0
    };
  } catch (err) {
    console.error('Error fetching quiz stats:', err);
    return {
      totalQuizzesCompleted: 0,
      totalCorrectAnswers: 0,
      totalXpEarned: 0,
      averageScore: 0,
      currentStreak: 0
    };
  }
}

/**
 * Check if quiz is available (not completed today)
 */
export async function isQuizAvailableToday(userId: string): Promise<boolean> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Check local storage first
    if (localStorage.getItem(`quiz_completed_${userId}_${today}`)) {
      return false; // Not available, already completed locally
    }

    const { data, error } = await supabase
      .from('quiz_completions')
      .select('id')
      .eq('user_id', userId)
      .eq('completion_date', today)
      .maybeSingle();

    if (error) {
      console.warn('Could not check quiz_completions, assuming available');
      return true;
    }
    
    return !data; // If no completion found, quiz is available
  } catch (err) {
    console.warn('Error checking quiz availability, assuming available');
    return true; // Default to available if error
  }
}
