import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, Trophy, Zap, Users, Search, Sparkles, Star, ArrowRight, Brain, Lock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import { isLimitReached, incrementUsage, getRemainingUsage, getLimitMessage } from '../lib/usageLimit';

interface DailyProgress {
  name: string;
  xp: number;
  labs: number;
}

function buildWeeklyData(activityLog: any[]): DailyProgress[] {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const result: DailyProgress[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = days[d.getDay()];
    const entry = activityLog?.find((a: any) => a.date === dateStr);
    result.push({ name: dayName, xp: entry?.xp_earned || 0, labs: entry?.labs_done || 0 });
  }
  return result;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState<DailyProgress[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [activeGraph, setActiveGraph] = useState<'xp' | 'labs'>('xp');
  const [nextLab, setNextLab] = useState<any>(undefined); // undefined = still loading

  const labsData = [
    { id: '1', title: 'Kubernetes Foundations' },
    { id: '2', title: 'Pod Debugging Strategy' },
    { id: '3', title: 'Network Policy Lockdown' },
    { id: '4', title: 'Custom Controller Creation' },
    { id: '5', title: 'Service Mesh Deployment' },
  ];

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profError) console.warn('Profile fetch error:', profError.message);

      if (prof) {
        // Try to update streak — wrapped so missing columns don't crash
        try {
          const today = new Date().toISOString().split('T')[0];
          const lastActive = prof.last_active_date;
          let newStreak = prof.streak || 0;

          if (lastActive !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yStr = yesterday.toISOString().split('T')[0];
            if (lastActive === yStr) {
              newStreak = newStreak + 1;
            } else {
              newStreak = 1;
            }
            await supabase.from('profiles')
              .update({ streak: newStreak, last_active_date: today })
              .eq('id', user.id);
            prof.streak = newStreak;
            prof.last_active_date = today;
          }
        } catch (streakErr) {
          console.warn('Streak update skipped (columns may not exist yet):', streakErr);
        }

        setProfile(prof);

        // Determine next lab — null = all done, undefined = still loading
        const completedCount = prof.labs_completed || 0;
        const next = completedCount < labsData.length ? labsData[completedCount] : null;
        setNextLab(next);
      } else {
        // No profile yet — still show the UI with defaults
        setNextLab(labsData[0]);
      }

      // Fetch weekly activity (non-critical — silently skip if table missing)
      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        const { data: activity } = await supabase
          .from('activity_log')
          .select('*')
          .eq('user_id', user?.id)
          .gte('date', sevenDaysAgo.toISOString().split('T')[0])
          .order('date', { ascending: true });
        setWeeklyData(buildWeeklyData(activity || []));
      } catch (actErr) {
        console.warn('Activity log fetch skipped (table may not exist yet):', actErr);
      }
    } catch (err) {
      console.error('Dashboard data fetch failed:', err);
    } finally {
      // ALWAYS stop the loading skeleton regardless of success or failure
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Real-time subscription to profile changes
    const channel = supabase
      .channel('profile-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const isPro = profile?.subscription_status === 'pro';
    if (isLimitReached('search', isPro)) {
      setAiResponse(`🔒 ${getLimitMessage('search')}`);
      return;
    }

    setIsSearching(true);
    setAiResponse(null);
    try {
      const apiKey = (window as any).OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        setAiResponse('OpenAI API key not configured. Please add your key in Settings → API Configuration.');
        return;
      }
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a DevOps expert. Answer queries concisely and practically.' },
            { role: 'user', content: searchQuery }
          ],
          max_tokens: 400,
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      incrementUsage('search');
      const remaining = getRemainingUsage('search', isPro);
      const note = isPro ? '' : ` (${remaining} search${remaining !== 1 ? 'es' : ''} left today)`;
      setAiResponse((data.choices?.[0]?.message?.content || 'No response generated.') + note);
    } catch (err: any) {
      setAiResponse(`Search failed: ${err.message || 'Verify your OpenAI API key in Settings.'}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartLab = () => {
    const isPro = profile?.subscription_status === 'pro';
    if (isLimitReached('lab', isPro)) {
      alert(getLimitMessage('lab'));
      return;
    }
    if (nextLab) navigate(`/labs/${nextLab.id}`);
    else navigate('/labs');
  };

  const displayName = profile?.full_name || profile?.username || profile?.email?.split('@')[0] || 'Engineer';
  const firstName = displayName.split(' ')[0];
  const isPro = profile?.subscription_status === 'pro';
  const searchesLeft = getRemainingUsage('search', isPro);

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-24">
      <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">
        <header className="space-y-2">
          <h2 className="text-5xl font-black tracking-tighter">
            Glad you're back, <span className="text-soft-blue">{firstName}</span>!
          </h2>
          <p className="text-text-dim font-bold uppercase tracking-widest text-xs flex items-center gap-2">
            <Star className="w-4 h-4 text-soft-orange fill-soft-orange" /> Profile readiness: {profile?.readiness_score || 0}%
            {!isPro && (
              <span className="ml-2 text-soft-orange bg-soft-orange/10 px-2 py-0.5 rounded-full text-[9px]">
                FREE · {searchesLeft} AI search{searchesLeft !== 1 ? 'es' : ''} left today
              </span>
            )}
          </p>
        </header>

        <form onSubmit={handleAiSearch} className="w-full lg:max-w-xl relative group">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-text-dim group-focus-within:text-soft-blue transition-colors">
            {isSearching ? <Sparkles className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          </div>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ask AI anything about DevOps..."
            className="w-full bg-surface border-4 border-border rounded-[2.5rem] pl-16 pr-24 py-5 font-bold outline-hidden focus:border-soft-blue transition-all shadow-xl group-hover:shadow-2xl"
          />
          <button
            type="submit"
            disabled={isSearching || (!isPro && searchesLeft === 0)}
            className="absolute right-3 top-3 bottom-3 px-6 bg-text-main text-surface rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform disabled:opacity-40"
          >
            {!isPro && searchesLeft === 0 ? <Lock className="w-4 h-4" /> : 'Search'}
          </button>
        </form>
      </div>

      <AnimatePresence>
        {aiResponse && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="playful-card bg-text-main text-surface border-none shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Sparkles className="w-24 h-24" />
            </div>
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-surface/60">
                <Brain className="w-4 h-4" /> AI DevOps Insight
              </div>
              <p className="text-lg font-bold leading-relaxed max-w-4xl">{aiResponse}</p>
              <button onClick={() => setAiResponse(null)} className="text-[10px] font-black uppercase tracking-widest border-b-2 border-surface/20 pb-0.5 hover:border-surface transition-colors">Dismiss</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero banner — dynamic next lab */}
      <section className="flex flex-col md:flex-row items-center justify-between gap-8 bg-soft-blue rounded-[4rem] p-12 text-white overflow-hidden relative shadow-2xl group">
        <div className="z-10 space-y-6 max-w-lg">
          {profileLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-8 w-32 bg-white/20 rounded-2xl" />
              <div className="h-16 w-72 bg-white/20 rounded-2xl" />
              <div className="h-12 w-48 bg-white/20 rounded-full" />
            </div>
          ) : (
            <>
              {/* Completion badge */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest bg-white/15 px-4 py-2 rounded-full border border-white/20">
                  {profile?.labs_completed || 0} / {labsData.length} Labs Complete
                </span>
                {nextLab === null && (
                  <span className="text-[10px] font-black uppercase tracking-widest bg-soft-green/30 text-white px-4 py-2 rounded-full border border-white/20">
                    🎉 All Done!
                  </span>
                )}
              </div>

              <h1 className="text-5xl font-black tracking-tighter leading-[1.1]">
                {nextLab === null ? (
                  <>All Labs<br /><span className="underline decoration-white/30 italic">Complete! 🎉</span></>
                ) : (
                  <>Next up:<br /><span className="underline decoration-white/30 italic">{nextLab.title}</span></>
                )}
              </h1>

              {/* Mini progress bar */}
              <div className="w-full max-w-xs">
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-700"
                    style={{ width: `${((profile?.labs_completed || 0) / labsData.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleStartLab}
                  disabled={nextLab === null}
                  className="px-10 py-4 bg-white text-soft-blue rounded-full font-black shadow-xl hover:scale-105 transition-all text-base active:scale-95 shadow-soft-blue/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {nextLab === null ? 'Labs Complete ✓' : 'Start Lab'}
                </button>
                <button
                  onClick={() => navigate('/roadmap')}
                  className="px-8 py-4 bg-soft-blue border-2 border-white/40 rounded-full font-black hover:bg-white/10 transition-colors uppercase tracking-widest text-xs"
                >
                  Update Roadmap
                </button>
              </div>
            </>
          )}
        </div>
        <div className="relative w-72 h-72 hidden lg:flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 border-4 border-dashed border-white/10 rounded-full"
          />
          {nextLab === null ? (
            <Trophy className="w-32 h-32 text-white/70 fill-white/10 group-hover:scale-110 transition-transform duration-500" />
          ) : (
            <Zap className="w-32 h-32 text-white/50 fill-white/10 group-hover:scale-110 transition-transform duration-500" />
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Progress Graph */}
        <div className="lg:col-span-2 space-y-8">
          <div className="playful-card space-y-10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-3xl font-black tracking-tight">Recent Progress</h3>
                <p className="text-text-dim text-xs font-bold uppercase tracking-widest mt-1">Activity over the last 7 days</p>
              </div>
              <div className="flex gap-2">
                {(['xp', 'labs'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveGraph(tab)}
                    className={`chip text-[9px] transition-colors ${activeGraph === tab ? 'bg-soft-blue/10 text-soft-blue' : 'bg-brand-bg text-text-dim hover:bg-soft-blue/10 hover:text-soft-blue'}`}
                  >
                    {tab === 'xp' ? 'EXP' : 'LABS'}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData.length > 0 ? weeklyData : [
                  { name: 'Mon', xp: 0, labs: 0 }, { name: 'Tue', xp: 0, labs: 0 },
                  { name: 'Wed', xp: 0, labs: 0 }, { name: 'Thu', xp: 0, labs: 0 },
                  { name: 'Fri', xp: 0, labs: 0 }, { name: 'Sat', xp: 0, labs: 0 },
                  { name: 'Sun', xp: 0, labs: 0 },
                ]}>
                  <defs>
                    <linearGradient id="colorXp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-soft-blue)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-soft-blue)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorLabs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-soft-green)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-soft-green)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 900, fill: 'var(--color-text-dim)' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: 'var(--color-surface)', border: '2px solid var(--color-border)', borderRadius: '1.5rem', fontWeight: '900' }}
                  />
                  {activeGraph === 'xp' ? (
                    <Area type="monotone" dataKey="xp" stroke="var(--color-soft-blue)" strokeWidth={4} fillOpacity={1} fill="url(#colorXp)" />
                  ) : (
                    <Area type="monotone" dataKey="labs" stroke="var(--color-soft-green)" strokeWidth={4} fillOpacity={1} fill="url(#colorLabs)" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Profile + Streak */}
        <div className="space-y-8">
          <div className="playful-card flex flex-col items-center p-12 relative overflow-hidden">
            <div className="absolute top-4 left-4">
              <Star className="w-8 h-8 text-soft-orange fill-soft-orange opacity-20" />
            </div>
            <div className="w-36 h-36 rounded-full border-4 border-soft-blue/20 p-2 mb-8 relative">
              <div className="w-full h-full bg-soft-blue/10 rounded-full flex items-center justify-center text-soft-blue relative z-10 shadow-inner">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <Users className="w-16 h-16" />
                )}
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 border-4 border-dashed border-soft-blue rounded-full opacity-40"
              />
            </div>
            <div className="text-center space-y-2 mb-8">
              <h3 className="text-2xl font-black">{displayName}</h3>
              <p className="text-text-dim font-bold text-[10px] uppercase tracking-[0.3em]">
                {isPro ? '⭐ Pro Member' : 'Fleet Commander'}
              </p>
              <button
                onClick={() => navigate('/settings')}
                className="mt-2 text-[9px] font-black uppercase tracking-widest text-soft-blue hover:underline transition-all"
              >
                Edit Profile →
              </button>
            </div>

            <div className="w-full space-y-6">
              <div className="flex justify-between text-xs font-black tracking-widest uppercase">
                <span className="text-text-dim italic">Labs Completed</span>
                <span>{profile?.labs_completed || 0} / {labsData.length}</span>
              </div>
              <div className="h-5 w-full bg-border rounded-full p-1 shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((profile?.labs_completed || 0) / labsData.length) * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-linear-to-r from-soft-blue to-soft-green rounded-full shadow-lg relative"
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
                </motion.div>
              </div>

              <div className="flex justify-between text-xs font-black tracking-widest uppercase mt-4">
                <span className="text-text-dim italic">Total XP</span>
                <span className="text-soft-blue">{(profile?.xp || 0).toLocaleString()}</span>
              </div>
              <div className="h-5 w-full bg-border rounded-full p-1 shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(((profile?.xp || 0) / 5000) * 100, 100)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-linear-to-r from-soft-purple to-soft-blue rounded-full shadow-lg"
                />
              </div>
            </div>
          </div>

          {/* Streak */}
          <div className="playful-card bg-text-main text-surface border-none text-center py-12 shadow-2xl group transition-all hover:bg-soft-blue">
            <div className="relative mb-6">
              <Flame className="w-16 h-16 text-soft-orange mx-auto fill-soft-orange animate-pulse relative z-10" />
              <div className="absolute inset-0 scale-150 bg-soft-orange/20 blur-2xl rounded-full" />
            </div>
            <h4 className="text-4xl font-black mb-2 italic">{profile?.streak || 0} DAY STREAK</h4>
            <div className="flex flex-col gap-4 mt-6">
              <p className="text-surface/60 font-black uppercase tracking-[0.2em] text-[9px] py-2 px-4 border-2 border-surface/20 rounded-full inline-block mx-auto group-hover:border-surface/40 group-hover:text-surface">
                {(profile?.streak || 0) >= 7 ? 'Unstoppable Energy ⚡️' : (profile?.streak || 0) >= 3 ? 'On a Roll 🔥' : 'Keep Going 💪'}
              </p>
              <button
                onClick={() => navigate('/labs')}
                className="flex items-center justify-center gap-2 font-black text-xs text-white/40 hover:text-white transition-colors group-hover:text-white mt-2 uppercase tracking-widest"
              >
                View All Labs <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
