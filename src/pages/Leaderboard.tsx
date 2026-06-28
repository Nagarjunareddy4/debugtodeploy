import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy, Search, Target, Zap, Flame, Crown,
  Medal, TrendingUp, Users, Award, BarChart3, Lock, Eye
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn, usePageTitle } from '../lib/utils';
import { Avatar } from '../components/ui/Avatar';

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  xp: number;
  level: number;
  labs_completed: number;
  readiness_score: number;
  streak: number;
}

type Tab = 'all' | 'streak' | 'labs';

const TAB_OPTIONS: { id: Tab; label: string; icon: React.ElementType; sortKey: keyof Profile }[] = [
  { id: 'all',    label: 'XP Ranking',   icon: Zap,    sortKey: 'xp' },
  { id: 'streak', label: 'Streak Kings', icon: Flame,  sortKey: 'streak' },
  { id: 'labs',   label: 'Lab Masters',  icon: Target, sortKey: 'labs_completed' },
];

const MEDAL = [
  { bg: 'from-yellow-500/20 to-yellow-500/5', border: 'border-yellow-500/50', text: 'text-yellow-400', badge: 'bg-yellow-500', icon: Crown },
  { bg: 'from-slate-400/20 to-slate-400/5',   border: 'border-slate-400/40',  text: 'text-slate-300',  badge: 'bg-slate-400',  icon: Medal },
  { bg: 'from-orange-500/20 to-orange-500/5', border: 'border-orange-500/40', text: 'text-orange-400', badge: 'bg-orange-500', icon: Award },
];

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    const m = MEDAL[rank - 1];
    const Icon = m.icon;
    return (
      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg shrink-0', m.badge)}>
        <Icon className="w-4 h-4" />
      </div>
    );
  }
  return (
    <span className="font-mono text-sm font-black text-text-dim w-8 text-center shrink-0">
      {rank}
    </span>
  );
}

function Sparkle({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <motion.div
      className="absolute w-1.5 h-1.5 rounded-full bg-yellow-400 pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%` }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0], y: [0, -28] }}
      transition={{ delay, duration: 1.2, repeat: Infinity, repeatDelay: 2.5 }}
    />
  );
}

/** Blurred anonymous avatar placeholder */
function AnonAvatar({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-full bg-surface-2 border border-border flex items-center justify-center shrink-0', className)}>
      <Lock className="w-3 h-3 text-text-dim/40" />
    </div>
  );
}

/** Blurred name placeholder */
function AnonName({ rank }: { rank: number }) {
  // Generate a deterministic-looking scrambled name based on rank
  const labels = ['Phantom', 'Shadow', 'Ghost', 'Cipher', 'Specter', 'Wraith', 'Nexus', 'Void', 'Echo', 'Mirage'];
  const label = labels[(rank - 1) % labels.length];
  return (
    <span className="font-bold text-sm text-text-dim/50 select-none">
      {label} Engineer #{rank}
    </span>
  );
}

export default function Leaderboard() {
  usePageTitle('Leaderboard');
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [myRank, setMyRank] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, xp, level, labs_completed, readiness_score, streak')
        .order('xp', { ascending: false })
        .limit(100);

      if (error) throw error;
      const list: Profile[] = (data || []).map(u => ({
        ...u,
        xp: u.xp || 0,
        level: u.level || 1,
        labs_completed: u.labs_completed || 0,
        readiness_score: u.readiness_score || 0,
        streak: u.streak || 0,
      }));
      setUsers(list);

      if (user) {
        const idx = list.findIndex(u => u.id === user.id);
        setMyRank(idx >= 0 ? idx + 1 : null);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const sortKey = TAB_OPTIONS.find(t => t.id === activeTab)!.sortKey;

  // Re-sort by the active tab metric
  const sortedUsers = [...users].sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number));

  // My rank in the current tab sort
  const myTabRank = currentUserId
    ? sortedUsers.findIndex(u => u.id === currentUserId) + 1
    : null;

  // Search only applies to current user's own row (they can find themselves)
  // Other users are always shown but anonymized
  const displayUsers = sortedUsers; // show ALL users always

  const top3 = displayUsers.slice(0, 3);
  const rest = displayUsers.slice(3);

  // Stats
  const totalXP = users.reduce((s, u) => s + u.xp, 0);
  const avgReadiness = users.length
    ? Math.round(users.reduce((s, u) => s + u.readiness_score, 0) / users.length)
    : 0;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-neon-cyan/20" />
          <div className="absolute inset-0 rounded-full border-4 border-neon-cyan border-t-transparent animate-spin" />
        </div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-text-dim animate-pulse">Loading leaderboard…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-28 px-4 md:px-0">

      {/* ── Header ── */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5 text-yellow-400" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tighter">Global Leaderboard</h1>
            </div>
            <p className="text-text-dim font-bold uppercase tracking-widest text-[10px] pl-1">
              Rankings are public · Identities are private
            </p>
          </div>

          {/* Search — only highlights self */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Find yourself…"
              className="w-full bg-surface border border-border rounded-full pl-9 pr-4 py-2.5 font-bold text-sm outline-none focus:border-neon-cyan/50 transition-all text-text-main placeholder:text-text-dim/50"
            />
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Users,     label: 'Engineers',     value: users.length },
            { icon: Zap,       label: 'Total XP',      value: totalXP.toLocaleString() },
            { icon: BarChart3, label: 'Avg Readiness', value: `${avgReadiness}%` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="glass-panel p-3 sm:p-4 flex flex-col gap-1 items-center text-center rounded-2xl">
              <Icon className="w-4 h-4 text-neon-cyan mb-0.5" />
              <span className="text-base sm:text-xl font-black text-text-main">{value}</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-text-dim">{label}</span>
            </div>
          ))}
        </div>

        {/* Your rank callout */}
        {myTabRank && myTabRank > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-neon-cyan/8 border border-neon-cyan/20"
          >
            <div className="w-7 h-7 rounded-full bg-neon-cyan/15 border border-neon-cyan/30 flex items-center justify-center shrink-0">
              <Eye className="w-3.5 h-3.5 text-neon-cyan" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-black text-sm text-text-main">
                You are ranked <span className="text-neon-cyan">#{myTabRank}</span> of {displayUsers.length} engineers
              </span>
              {myTabRank > 1 && (
                <p className="text-[10px] font-bold text-text-dim mt-0.5">
                  {myTabRank - 1} engineer{myTabRank - 1 > 1 ? 's' : ''} ahead of you · Keep climbing! 🚀
                </p>
              )}
              {myTabRank === 1 && (
                <p className="text-[10px] font-bold text-neon-cyan mt-0.5">You're at the top! 👑 Defend your position.</p>
              )}
            </div>
          </motion.div>
        )}

        {/* Privacy notice */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-2 border border-border w-fit">
          <Lock className="w-3 h-3 text-text-dim shrink-0" />
          <span className="text-[9px] font-bold text-text-dim uppercase tracking-widest">
            Other engineers' names & avatars are hidden to protect privacy. Only your own row is revealed.
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 bg-surface border border-border p-1 rounded-full w-fit">
          {TAB_OPTIONS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full font-black text-xs uppercase tracking-widest transition-all',
                  activeTab === tab.id
                    ? 'bg-neon-cyan text-[#07080C] shadow-md'
                    : 'text-text-dim hover:text-text-main'
                )}
              >
                <Icon className="w-3 h-3" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.id === 'all' ? 'XP' : tab.id === 'streak' ? 'Streak' : 'Labs'}</span>
              </button>
            );
          })}
        </div>
      </motion.header>

      {users.length === 0 ? (
        <div className="text-center p-16 glass-panel text-text-dim rounded-3xl">
          No engineers yet. Be the first to join the board!
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
            className="space-y-8"
          >
            {/* ── Podium (Top 3) ── */}
            {top3.length >= 1 && (
              <div className="grid grid-cols-3 gap-3 sm:gap-6 items-end">
                {/* Podium visual order: 2nd | 1st | 3rd */}
                {[1, 0, 2].map((rankIndex) => {
                  const user = top3[rankIndex];
                  if (!user) return <div key={rankIndex} />;
                  const rank = rankIndex + 1;
                  const isFirst = rank === 1;
                  const isCurrentUser = user.id === currentUserId;
                  const m = MEDAL[rankIndex];
                  const MedalIcon = m.icon;
                  const sparkles = isFirst
                    ? Array.from({ length: 5 }, (_, i) => ({ x: 10 + i * 18, y: 5 + (i % 2) * 10, delay: i * 0.25 }))
                    : [];

                  return (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: rankIndex * 0.1, type: 'spring', damping: 14 }}
                      className={cn(isFirst ? 'order-2 -mt-6 sm:-mt-10' : rankIndex === 1 ? 'order-1' : 'order-3')}
                    >
                      <div
                        className={cn(
                          'relative flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-5 rounded-3xl border-2 bg-gradient-to-b transition-all',
                          m.bg, m.border,
                          isCurrentUser && 'ring-4 ring-neon-cyan/25 shadow-neon-cyan/10 shadow-xl',
                          isFirst && 'shadow-2xl shadow-yellow-500/10'
                        )}
                      >
                        {sparkles.map((s, i) => <Sparkle key={i} {...s} />)}

                        {/* medal */}
                        <div className={cn(
                          'absolute -top-4 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white shadow-lg',
                          m.badge
                        )}>
                          <MedalIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>

                        {/* Avatar — only shown for self */}
                        <div className="mt-2">
                          {isCurrentUser ? (
                            <Avatar
                              url={user.avatar_url}
                              className={cn(
                                'rounded-full border-4 shadow-xl object-cover',
                                isFirst ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-12 h-12 sm:w-16 sm:h-16',
                                'border-neon-cyan'
                              )}
                            />
                          ) : (
                            <div className={cn(
                              'rounded-full border-4 flex items-center justify-center bg-surface-2',
                              isFirst ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-12 h-12 sm:w-16 sm:h-16',
                              m.border
                            )}>
                              <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-text-dim/30" />
                            </div>
                          )}
                        </div>

                        {/* Name */}
                        <div className="text-center w-full">
                          {isCurrentUser ? (
                            <>
                              <p className="font-black text-sm sm:text-base tracking-tight text-text-main truncate">
                                {user.full_name || user.username || 'You'}
                              </p>
                              <span className="inline-block text-[7px] bg-neon-cyan text-[#05080F] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mt-1">
                                You
                              </span>
                            </>
                          ) : (
                            <p className="font-bold text-xs sm:text-sm text-text-dim/50 truncate">
                              Engineer #{rank}
                            </p>
                          )}
                          <p className="text-[9px] font-bold text-text-dim mt-0.5">
                            Lvl {user.level}
                          </p>
                        </div>

                        {/* Metric */}
                        <div className={cn('w-full rounded-2xl p-2 sm:p-3 text-center border bg-black/20', m.border)}>
                          <span className="font-mono text-[8px] uppercase tracking-widest text-text-dim block">
                            {sortKey === 'xp' ? 'Total XP' : sortKey === 'streak' ? 'Day Streak' : 'Labs'}
                          </span>
                          <span className={cn('text-lg sm:text-2xl font-black', m.text)}>
                            {(user[sortKey] as number).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* ── Full Rankings Table ── */}
            <div className="glass-panel rounded-3xl overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-12 gap-2 px-4 sm:px-8 py-4 border-b border-border font-mono text-[9px] uppercase tracking-widest text-text-dim bg-surface-2/50">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-5 sm:col-span-4">Engineer</div>
                <div className="hidden sm:block col-span-2 text-center">Level</div>
                <div className="hidden sm:block col-span-2 text-center">Labs</div>
                <div className="hidden sm:block col-span-1 text-center">Streak</div>
                <div className="col-span-6 sm:col-span-3 text-right">
                  {sortKey === 'xp' ? 'XP' : sortKey === 'streak' ? 'Streak' : 'Labs Done'}
                </div>
              </div>

              <div className="flex flex-col divide-y divide-border/40">
                {displayUsers.map((user, idx) => {
                  const rank = idx + 1;
                  const isCurrentUser = user.id === currentUserId;
                  const value = user[sortKey] as number;
                  const maxValue = displayUsers[0] ? (displayUsers[0][sortKey] as number) : 1;
                  const pct = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0;

                  // Search highlight — only matches current user's own name
                  const searchMatch = searchQuery &&
                    isCurrentUser &&
                    (
                      (user.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (user.username || '').toLowerCase().includes(searchQuery.toLowerCase())
                    );

                  return (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: '-40px' }}
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 24,
                        delay: Math.min(idx * 0.015, 0.25),
                      }}
                      whileHover={{ x: isCurrentUser ? 4 : 0 }}
                      className={cn(
                        'grid grid-cols-12 gap-2 px-4 sm:px-8 py-3.5 sm:py-4 items-center transition-colors',
                        isCurrentUser
                          ? 'bg-neon-cyan/8 border-l-2 border-l-neon-cyan'
                          : rank <= 3
                          ? 'bg-yellow-500/3'
                          : 'hover:bg-white/2',
                        searchMatch && 'ring-2 ring-inset ring-neon-cyan/30'
                      )}
                    >
                      {/* Rank */}
                      <div className="col-span-1 flex justify-center items-center">
                        <RankBadge rank={rank} />
                      </div>

                      {/* Engineer identity — revealed only for self */}
                      <div className="col-span-5 sm:col-span-4 flex items-center gap-2 sm:gap-3 min-w-0">
                        {isCurrentUser ? (
                          <Avatar
                            url={user.avatar_url}
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-neon-cyan shrink-0 object-cover"
                          />
                        ) : (
                          <AnonAvatar className="w-8 h-8 sm:w-9 sm:h-9" />
                        )}

                        <div className="min-w-0">
                          {isCurrentUser ? (
                            <>
                              <p className="font-black text-sm text-neon-cyan truncate">
                                {user.full_name || user.username || 'You'}
                              </p>
                              <span className="font-mono text-[7px] bg-neon-cyan text-[#07080C] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-widest inline-block mt-0.5">
                                You
                              </span>
                            </>
                          ) : (
                            <AnonName rank={rank} />
                          )}
                        </div>
                      </div>

                      {/* Level — shown for everyone (not sensitive) */}
                      <div className="hidden sm:flex col-span-2 justify-center">
                        <span className="bg-surface-2 border border-border px-2.5 py-0.5 rounded-full font-mono text-xs text-text-main">
                          Lvl {user.level}
                        </span>
                      </div>

                      {/* Labs count — shown for everyone */}
                      <div className="hidden sm:flex col-span-2 justify-center items-center gap-1 text-sm font-bold text-text-main">
                        <Target className="w-3.5 h-3.5 text-neon-green" />
                        {user.labs_completed}
                      </div>

                      {/* Streak — shown for everyone */}
                      <div className="hidden sm:flex col-span-1 justify-center items-center gap-1 text-sm font-bold text-text-dim">
                        <Flame className="w-3.5 h-3.5 text-amber" />
                        {user.streak}
                      </div>

                      {/* Primary metric + progress bar */}
                      <div className="col-span-6 sm:col-span-3 flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            'font-black text-sm',
                            isCurrentUser ? 'text-neon-cyan' : rank <= 3 ? MEDAL[rank - 1].text : 'text-text-main'
                          )}>
                            {value.toLocaleString()}
                          </span>
                          {sortKey === 'xp' && <Zap className="w-3 h-3 text-neon-cyan" />}
                          {sortKey === 'streak' && <Flame className="w-3 h-3 text-amber" />}
                          {sortKey === 'labs_completed' && <Target className="w-3 h-3 text-neon-green" />}
                        </div>
                        {/* Progress bar relative to leader */}
                        <div className="w-16 sm:w-20 h-1 bg-white/8 rounded-full overflow-hidden">
                          <motion.div
                            className={cn(
                              'h-full rounded-full',
                              isCurrentUser ? 'bg-neon-cyan' : rank <= 3 ? 'bg-yellow-500/60' : 'bg-white/20'
                            )}
                            initial={{ width: 0 }}
                            whileInView={{ width: `${pct}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: Math.min(idx * 0.015, 0.2) }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {displayUsers.length === 0 && (
                  <div className="p-12 text-center text-text-dim font-bold text-sm">
                    No engineers on the board yet.
                  </div>
                )}
              </div>
            </div>

            {/* Bottom note */}
            <div className="flex items-center justify-center gap-2 text-[9px] font-bold text-text-dim/40 uppercase tracking-widest">
              <Lock className="w-3 h-3" />
              <span>All engineer identities are anonymized in compliance with our privacy policy</span>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
