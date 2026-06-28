import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type NotificationType =
  | 'lab_completed'
  | 'streak'
  | 'pro_upgrade'
  | 'job_match'
  | 'interview_graded'
  | 'achievement'
  | 'system'
  | 'quiz_available';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  metadata: Record<string, any>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

/** Fetch the most recent notifications for the current user. */
export async function fetchNotifications(limit = 30): Promise<AppNotification[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
  return data || [];
}

/** Count of currently unread notifications. */
export async function fetchUnreadCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }
  return count || 0;
}

export async function markAsRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) console.error('Error marking notification read:', error);
}

export async function markAllAsRead() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) console.error('Error marking all notifications read:', error);
}

export async function deleteNotification(notificationId: string) {
  const { error } = await supabase.from('notifications').delete().eq('id', notificationId);
  if (error) console.error('Error deleting notification:', error);
}

/**
 * Create a notification for the current user (client-side trigger).
 * Use this right after events like lab completion, streak milestones, etc.
 */
export async function createNotification(params: {
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.rpc('create_notification', {
    target_user_id: user.id,
    notif_type: params.type,
    notif_title: params.title,
    notif_body: params.body || null,
    notif_link: params.link || null,
    notif_metadata: params.metadata || {},
  });

  if (error) console.error('Error creating notification:', error);
}

/**
 * Subscribe to realtime notification inserts for the current user.
 * Returns the channel so the caller can unsubscribe on unmount.
 */
export function subscribeToNotifications(
  userId: string,
  onInsert: (notification: AppNotification) => void
): RealtimeChannel {
  // Unique suffix prevents stale channels from a previous mount overlapping
  // with a new subscription and double-firing events.
  const channelId = `notifications-${userId}-${Math.random().toString(36).slice(2, 8)}`;
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onInsert(payload.new as AppNotification)
    )
    .subscribe();

  return channel;
}

/** Convenience helpers for common notification events. */
export const Notify = {
  labCompleted: (labTitle: string, xp: number, labId: string) =>
    createNotification({
      type: 'lab_completed',
      title: `Lab complete: ${labTitle}`,
      body: `+${xp} XP earned. On to the next incident.`,
      link: '/labs',
      metadata: { labId, xp },
    }),

  streak: (days: number) =>
    createNotification({
      type: 'streak',
      title: `${days}-day streak`,
      body: `You've shown up ${days} days in a row. Keep the chain going.`,
      link: '/dashboard',
      metadata: { days },
    }),

  proUpgrade: () =>
    createNotification({
      type: 'pro_upgrade',
      title: 'Welcome to Pro',
      body: 'Unlimited sandboxes, mock interviews, and roadmaps are now unlocked.',
      link: '/labs',
    }),

  interviewGraded: (score: number) =>
    createNotification({
      type: 'interview_graded',
      title: 'Mock interview graded',
      body: `Your readiness score: ${score}%. Review the breakdown.`,
      link: '/interviews',
      metadata: { score },
    }),

  jobMatch: (roleTitle: string, company: string) =>
    createNotification({
      type: 'job_match',
      title: `New match: ${roleTitle}`,
      body: `${company} is hiring for a role that fits your roadmap.`,
      link: '/jobs',
    }),

  achievement: (badgeName: string) =>
    createNotification({
      type: 'achievement',
      title: `Badge unlocked: ${badgeName}`,
      body: 'Added to your portfolio.',
      link: '/portfolio',
    }),

  quizAvailable: () =>
    createNotification({
      type: 'quiz_available',
      title: "Today's quiz is ready",
      body: '5 new questions. Keep your streak alive.',
      link: '/dashboard',
    }),
};
