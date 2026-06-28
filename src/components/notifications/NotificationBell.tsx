import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, CheckCheck, Trophy, Flame, Zap, Briefcase, Brain, Sparkles, Info, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import {
  AppNotification,
  fetchNotifications,
  fetchUnreadCount,
  markAsRead,
  markAllAsRead,
  subscribeToNotifications,
} from '../../lib/notifications';

const TYPE_ICON: Record<string, any> = {
  lab_completed: CheckCheck,
  streak: Flame,
  pro_upgrade: Zap,
  job_match: Briefcase,
  interview_graded: Brain,
  achievement: Trophy,
  quiz_available: Sparkles,
  system: Info,
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track IDs we've already seen to prevent duplicate additions from realtime events
  const seenIdsRef = useRef<Set<string>>(new Set());
  // Prevent double-subscription (React StrictMode mounts effects twice in dev)
  const subscribedRef = useRef(false);

  useEffect(() => {
    let channel: ReturnType<typeof subscribeToNotifications> | null = null;

    const init = async () => {
      if (subscribedRef.current) return;
      subscribedRef.current = true;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const [list, count] = await Promise.all([fetchNotifications(), fetchUnreadCount()]);
      // Seed the seen-ids set with everything already fetched so realtime dupes are ignored
      list.forEach((n) => seenIdsRef.current.add(n.id));
      setNotifications(list);
      setUnreadCount(count);
      setLoading(false);

      channel = subscribeToNotifications(user.id, (notif) => {
        // Skip if we've already seen this notification id (prevents double-fire)
        if (seenIdsRef.current.has(notif.id)) return;
        seenIdsRef.current.add(notif.id);

        setNotifications((prev) => [notif, ...prev].slice(0, 30));
        setUnreadCount((c) => c + 1);

        // Use notif.id as toast id to prevent the same notification toasting twice
        toast(notif.title, {
          id: notif.id,
          icon: '🔔',
          duration: 4500,
          style: {
            background: 'var(--color-surface)',
            color: 'var(--color-text-main)',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            fontFamily: 'var(--font-sans)',
            fontSize: '13px',
          },
        });
      });
    };

    init();

    return () => {
      subscribedRef.current = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.is_read) {
      await markAsRead(notif.id);
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setIsOpen(false);
    if (notif.link) navigate(notif.link);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="relative p-2.5 clay-sm transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 text-text-main" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-neon-cyan text-[#150C00] font-mono text-[9px] font-bold rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-[360px] max-w-[90vw] bg-surface clay-flat z-50"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <span className="font-mono text-[10px] uppercase tracking-widest text-text-dim">
                Notifications {unreadCount > 0 && <span className="text-neon-cyan">({unreadCount} new)</span>}
              </span>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="font-mono text-[9px] uppercase tracking-widest text-neon-cyan hover:underline"
                  >
                    Mark all read
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="text-text-dim hover:text-text-main">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {loading ? (
                <div className="px-5 py-10 text-center font-mono text-[10px] uppercase tracking-widest text-text-dim">
                  Loading…
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <Bell className="w-6 h-6 text-text-dim mx-auto mb-3 opacity-40" />
                  <p className="font-mono text-[10px] uppercase tracking-widest text-text-dim">All clear</p>
                  <p className="text-xs text-text-dim mt-1">Nothing to report yet.</p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const Icon = TYPE_ICON[notif.type] || Info;
                  return (
                    <button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={cn(
                        'w-full flex items-start gap-3 px-5 py-4 border-b border-border text-left transition-colors hover:bg-surface-2',
                        !notif.is_read && 'bg-neon-cyan/5'
                      )}
                    >
                      <div className={cn(
                        'w-8 h-8 border flex items-center justify-center shrink-0 mt-0.5',
                        !notif.is_read ? 'border-neon-cyan text-neon-cyan' : 'border-border text-text-dim'
                      )}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn('text-sm leading-snug', !notif.is_read ? 'font-semibold text-text-main' : 'text-text-dim')}>
                            {notif.title}
                          </p>
                          {!notif.is_read && <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan shrink-0 mt-1.5" />}
                        </div>
                        {notif.body && <p className="text-xs text-text-dim mt-1 leading-relaxed">{notif.body}</p>}
                        <p className="font-mono text-[9px] uppercase tracking-widest text-text-dim/60 mt-2">
                          {timeAgo(notif.created_at)}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
