import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, Trophy, Zap, Users, Search, Sparkles, Star, ArrowRight, Brain, Lock, Check, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import { isLimitReached, incrementUsage, getRemainingUsage, getLimitMessage } from '../lib/usageLimit';
import { cn } from '../lib/utils';

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
  const [quickGoal, setQuickGoal] = useState('');
  const [isUpdatingGoal, setIsUpdatingGoal] = useState(false);

  // Default fallback labs if generated_labs doesn't exist yet
  const defaultLabs = [
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
        // ── Patch full_name from auth metadata if the profiles row is still empty ──
        // Supabase Auth "Display name" lives in user.user_metadata.full_name / .name
        const authName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.user_metadata?.display_name ||
          '';
        if (!prof.full_name && authName) {
          await supabase.from('profiles')
            .update({ full_name: authName, email: prof.email || user.email })
            .eq('id', user.id);
          prof.full_name = authName;      // patch local object immediately
          prof.email = prof.email || user.email;
        }

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

        // Determine next lab from generated_labs or fallback
        const userLabs = prof.generated_labs || defaultLabs;
        const completedCount = prof.labs_completed || 0;
        const next = completedCount < userLabs.length ? userLabs[completedCount] : null;
        setNextLab(next);
      } else {
        // No profile row yet — build minimal display from auth metadata
        const authName = user.user_metadata?.full_name || user.user_metadata?.name || '';
        setProfile({ full_name: authName, email: user.email, subscription_status: 'free' });
        setNextLab(defaultLabs[0]);
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
            { 
              role: 'system', 
              content: 'You are a strict DevOps and SRE expert. ONLY answer queries related to Cloud, DevOps, SRE, Infrastructure, CI/CD, and related technologies. If the user asks something unrelated, politely inform them that you are a DevOps assistant.' 
            },
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
    incrementUsage('lab');
    if (nextLab) {
      // If it's a dynamic lab, its ID might be a string (e.g., 'lab-0')
      navigate(`/labs/${nextLab.id}`);
    } else {
      navigate('/labs');
    }
  };

  const handleQuickGoalUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickGoal.trim() || !profile?.id) return;
    
    setIsUpdatingGoal(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ roadmap_data: JSON.stringify({ ...JSON.parse(profile.roadmap_data || '{}'), goal: quickGoal }) })
        .eq('id', profile.id);
      
      if (!error) {
        setProfile((prev: any) => ({ ...prev, roadmap_data: JSON.stringify({ ...JSON.parse(prev.roadmap_data || '{}'), goal: quickGoal }) }));
        alert('Goal updated! Refresh the roadmap to see changes.');
        setQuickGoal('');
      }
    } catch (err) {
      console.error('Goal update failed:', err);
    } finally {
      setIsUpdatingGoal(false);
    }
  };

  const displayName = profile?.full_name || profile?.username || profile?.email?.split('@')[0] || 'Engineer';
  const firstName = displayName.split(' ')[0];
  const isPro = profile?.subscription_status === 'pro';
  const searchesLeft = getRemainingUsage('search', isPro);
  const isNewUser = !profile?.roadmap_data || profile.roadmap_data === '{}' || profile.roadmap_data === '{"stages":[]}';

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-24">
      <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">
        <header className="space-y-2">
          <h2 className="text-5xl font-black tracking-tighter">
            {isNewUser ? (
              <>Welcome, <span className="text-soft-blue">{displayName}</span>!</>
            ) : (
              <>Glad you're back, <span className="text-soft-blue">{firstName}</span>!</>
            )}
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
      <section className="flex flex-col md:flex-row items-center justify-between gap-8 bg-surface border-4 border-border rounded-[4rem] p-12 text-text-main overflow-hidden relative shadow-2xl group">
        {/* Ambient glowing orbs to give the panel depth and premium feel */}
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-soft-blue/10 rounded-full blur-3xl -translate-y-1/4 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-soft-purple/10 rounded-full blur-3xl translate-y-1/4 -translate-x-1/4 pointer-events-none" />
        
        <div className="z-10 space-y-6 max-w-lg">
           {profileLoading ? (
             <div className="space-y-4 animate-pulse">
               <div className="h-8 w-32 bg-border rounded-2xl" />
               <div className="h-16 w-72 bg-border rounded-2xl" />
               <div className="h-12 w-48 bg-border rounded-full" />
             </div>
           ) : (
             <>
               {/* Completion badge */}
               <div className="flex items-center gap-3">
                 <span className="text-[10px] font-black uppercase tracking-widest bg-soft-blue/10 text-soft-blue px-4 py-2 rounded-full border border-soft-blue/20">
                   {profile?.labs_completed || 0} / {(profile?.generated_labs || defaultLabs).length} Labs Complete
                 </span>
                 {nextLab === null && (
                   <span className="text-[10px] font-black uppercase tracking-widest bg-soft-green/20 text-soft-green px-4 py-2 rounded-full border border-soft-green/30">
                     🎉 All Done!
                   </span>
                 )}
               </div>
 
               <h1 className="text-5xl font-black tracking-tighter leading-[1.1]">
                {nextLab === null ? (
                  <>All Labs<br /><span className="underline decoration-soft-blue/30 italic">Complete! 🎉</span></>
                ) : (
                  <>Next up:<br /><span className="underline decoration-soft-blue/30 italic">{nextLab?.title || 'Loading...'}</span></>
                )}
              </h1>

              {/* Mini progress bar */}
              <div className="w-full max-w-xs">
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-soft-blue rounded-full transition-all duration-700"
                    style={{ width: `${((profile?.labs_completed || 0) / (profile?.generated_labs || defaultLabs).length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 items-center">
                <button
                  onClick={handleStartLab}
                  disabled={nextLab === null}
                  className="px-10 py-4 bg-text-main text-surface rounded-full font-black shadow-xl hover:scale-105 transition-all text-base active:scale-95 shadow-soft-blue/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {nextLab === null ? 'Labs Complete ✓' : 'Start Lab'}
                </button>
                <div className="flex items-center gap-2 bg-brand-bg/50 border-2 border-border p-1 rounded-full pl-6">
                  <input 
                    value={quickGoal}
                    onChange={(e) => setQuickGoal(e.target.value)}
                    placeholder="New Goal? (e.g. SRE)"
                    className="bg-transparent border-none font-bold text-xs outline-hidden w-32"
                  />
                  <button
                    onClick={handleQuickGoalUpdate}
                    disabled={isUpdatingGoal || !quickGoal.trim()}
                    className="p-3 bg-soft-blue text-white rounded-full hover:scale-110 transition-transform disabled:opacity-50"
                  >
                    {isUpdatingGoal ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="relative w-72 h-72 hidden lg:flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 border-4 border-dashed border-border rounded-full"
          />
          {nextLab === null ? (
            <Trophy className="w-32 h-32 text-soft-blue/20 group-hover:scale-110 transition-transform duration-500" />
          ) : (
            <Zap className="w-32 h-32 text-soft-blue/20 group-hover:scale-110 transition-transform duration-500" />
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
            <div className="w-36 h-36 relative flex items-center justify-center mb-8">
              {/* Animated Progress Ring based on Readiness Score */}
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r="46"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-border"
                />
                <motion.circle
                  cx="50" cy="50" r="46"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeDasharray="289"
                  initial={{ strokeDashoffset: 289 }}
                  animate={{ strokeDashoffset: 289 - (289 * (profile?.readiness_score || 0)) / 100 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  strokeLinecap="round"
                  className="text-soft-blue"
                />
              </svg>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 border-2 border-dashed border-soft-blue/20 rounded-full scale-[0.9]"
              />
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-soft-blue p-0.5 bg-brand-bg relative z-10 shadow-xl">
                <div className="w-full h-full bg-soft-blue/10 rounded-full flex items-center justify-center text-soft-blue">
                  {profile?.avatar_url ? (
                    <img src={`${profile.avatar_url}${profile.avatar_url.includes('?') ? '&' : '?'}t=${Date.now()}`} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <Users className="w-16 h-16" />
                  )}
                </div>
              </div>
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
                <span>{profile?.labs_completed || 0} / {(profile?.generated_labs || defaultLabs).length}</span>
              </div>
              <div className="h-5 w-full bg-border rounded-full p-1 shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((profile?.labs_completed || 0) / (profile?.generated_labs || defaultLabs).length) * 100}%` }}
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
          {/* Streak */}
          <div className="playful-card border-none text-center py-12 shadow-2xl bg-surface">
            <div className="relative mb-6">
              <Flame className="w-16 h-16 text-soft-orange mx-auto fill-soft-orange animate-pulse relative z-10" />
              <div className="absolute inset-0 scale-150 bg-soft-orange/20 blur-2xl rounded-full pointer-events-none" />
            </div>
            <h4 className="text-4xl font-black mb-2 italic text-text-main">{profile?.streak || 0} DAY STREAK</h4>
            <div className="flex flex-col gap-6 mt-6">
              {/* Day-wise Activity Tracker */}
              <div className="flex justify-center gap-2 mb-2">
                {weeklyData.map((day, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <span className="text-[9px] font-black uppercase text-text-dim">{day.name.charAt(0)}</span>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center font-black transition-all",
                      day.xp > 0 
                        ? "bg-soft-orange text-white shadow-lg shadow-soft-orange/30 scale-110" 
                        : "bg-brand-bg text-text-dim border-2 border-border"
                    )}>
                      {day.xp > 0 ? <Check className="w-4 h-4" /> : null}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-text-dim font-black uppercase tracking-[0.2em] text-[10px] py-2 px-4 border-2 border-border rounded-full inline-block mx-auto bg-brand-bg">
                {(profile?.streak || 0) >= 7 ? 'Unstoppable Energy ⚡️' : (profile?.streak || 0) >= 3 ? 'On a Roll 🔥' : 'Keep Going 💪'}
              </p>
              <button
                onClick={() => navigate('/labs')}
                className="flex items-center justify-center gap-2 font-black text-xs text-text-dim hover:text-soft-blue transition-colors mt-2 uppercase tracking-widest"
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
