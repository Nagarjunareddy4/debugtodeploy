import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, Trophy, Zap, Users, Search, Sparkles, Star, ArrowRight, Brain, Lock, Check, RefreshCw, Share2, BookOpen, Award } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Joyride, Step } from 'react-joyride';
import { supabase } from '../lib/supabase';
import { Notify } from '../lib/notifications';
import { trackEvent } from '../lib/analytics';
import { isLimitReached, incrementUsage, getRemainingUsage, getLimitMessage } from '../lib/usageLimit';
import { cn, usePageTitle } from '../lib/utils';
import OnboardingModal from '../components/OnboardingModal';
import { Avatar } from '../components/ui/Avatar';
import { RoadmapBadge3D } from '../components/ui/RoadmapBadge3D';
import DailyQuiz from '../components/lab/DailyQuiz';
import { sendQuizNotification, requestNotificationPermission, getQuizStats, isQuizAvailableToday } from '../lib/quizNotifications';
import { toast } from 'react-hot-toast';

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
  const location = useLocation();
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(location.state?.paymentSuccess || false);
  const [weeklyData, setWeeklyData] = useState<DailyProgress[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [activeGraph, setActiveGraph] = useState<'xp' | 'labs'>('xp');
  const [nextLab, setNextLab] = useState<any>(undefined); // undefined = still loading
  const [quickGoal, setQuickGoal] = useState('');
  const [isUpdatingGoal, setIsUpdatingGoal] = useState(false);
  const [runTour, setRunTour] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [quizAvailable, setQuizAvailable] = useState(true);
  const [quizStats, setQuizStats] = useState<any>(null);
  const [showQuizSection, setShowQuizSection] = useState(true);
  const [greeting, setGreeting] = useState("Glad you're back");
  const [greetingIcon, setGreetingIcon] = useState('☀️');

  useEffect(() => {
    const hours = new Date().getHours();
    if (hours >= 5 && hours < 12) {
      setGreeting('Good morning');
      setGreetingIcon('🌅');
    } else if (hours >= 12 && hours < 17) {
      setGreeting('Good afternoon');
      setGreetingIcon('☀️');
    } else if (hours >= 17 && hours < 21) {
      setGreeting('Good evening');
      setGreetingIcon('🌇');
    } else {
      setGreeting("Glad you're back");
      setGreetingIcon('🌙');
    }
  }, []);

  const tourSteps: Step[] = [
    {
      target: '.tour-step-search',
      content: 'Start here! Ask our AI expert anything about DevOps or Cloud Engineering.',
    },
    {
      target: '.tour-step-lab',
      content: 'Jump straight into a real-world sandbox environment to fix infrastructure bugs.',
    },
    {
      target: '.tour-step-progress',
      content: 'Track your XP, streak, and daily growth as you climb the ranks.',
    }
  ];

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
        if (prof.full_name === null && authName) {
          await supabase.from('profiles')
            .update({ full_name: authName, email: prof.email || user.email })
            .eq('id', user.id);
          prof.full_name = authName;      // patch local object immediately
          prof.email = prof.email || user.email;
        }

        // Only restore auth avatar if the profile has NEVER had one (avatar_url is null).
        // If it's an empty string, it means the user explicitly removed it.
        if (prof.avatar_url === null) {
          const fallbackAvatar =
            user.user_metadata?.avatar_url ||
            user.user_metadata?.picture ||
            user.user_metadata?.photo ||
            user.user_metadata?.pictureUrl;
          if (fallbackAvatar) {
            await supabase.from('profiles').update({ avatar_url: fallbackAvatar }).eq('id', user.id);
            prof.avatar_url = fallbackAvatar;
          }
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

            // Notify at meaningful streak milestones, not every single day
            if (newStreak > 1 && newStreak % 3 === 0) {
              Notify.streak(newStreak);
            }
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

  // Check quiz availability and send notification
  useEffect(() => {
    const checkQuizAndNotify = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check quiz availability
        const available = await isQuizAvailableToday(user.id);
        setQuizAvailable(available);

        // Fetch quiz stats
        const stats = await getQuizStats(user.id);
        setQuizStats(stats);

        // Send notification if quiz is available
        if (available) {
          await requestNotificationPermission();
          await sendQuizNotification(user.id);
        }
      } catch (err) {
        console.error('Error checking quiz:', err);
      }
    };

    checkQuizAndNotify();
    
    // Check again every hour for new quizzes
    const interval = setInterval(checkQuizAndNotify, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [profile?.id]);

  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const isPro = profile?.subscription_status === 'pro';
    if (isLimitReached('search', isPro)) {
      setAiResponse(`🔒 ${getLimitMessage('search', isPro)}`);
      return;
    }

    setIsSearching(true);
    setAiResponse(null);
    // FIX API-001: 15-second timeout prevents indefinite loading states
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/openai-proxy?path=v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { 
              role: 'system', 
              content: `You are the Official DebugToDeploy AI Guide. You help users master DevOps and navigate all platform features.
              
              PLATFORM FEATURES & UPDATES:
              - AI Roadmaps: Personalized learning paths. PRO users can EXPORT these as high-quality PDFs.
              - Exporting: Roadmap exports include a "DebugToDeploy" brand watermark for professional authenticity.
              - Achievement Badges: Premium 3D trophies that unlock automatically upon completing Roadmap stages or Cloud Labs.
              - Cloud Labs: Live AWS/K8s sandboxes to solve production-grade infrastructure issues.
              - ATS Resume Builder: Generates professional resumes. Users can use "Edit Mode" to modify any text inline. Pro users can export these.
              - Public Portfolio: A high-end technical profile showing verified 3D achievements and career artifacts.
              - Pro Plan ($6/mo): Unlocks unlimited roadmaps, exports, and unlimited AI search/audits.
              
              HOW TO ANSWER:
              - For platform questions (badges, exporting, editing resumes, roadmaps), give specific and helpful guidance based on the features above.
              - For technical DevOps/SRE questions, provide expert-level, concise answers.
              - Keep responses under 180 words.`
            },
            { role: 'user', content: searchQuery }
          ],
          max_tokens: 500,
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      incrementUsage('search', isPro);
      const remaining = getRemainingUsage('search', isPro);
      const note = (isPro && remaining === Infinity) ? '' : ` (${remaining} search${remaining !== 1 ? 'es' : ''} left today)`;
      setAiResponse((data.choices?.[0]?.message?.content || 'No response generated.') + note);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setAiResponse('Search timed out. The AI is taking too long — please try again.');
      } else {
        setAiResponse(`Search failed: ${err.message || 'Verify your OpenAI API key in Settings.'}`);
      }
    } finally {
      clearTimeout(timeoutId);
      setIsSearching(false);
    }
  };

  const handleStartLab = () => {
    const isPro = profile?.subscription_status === 'pro';
    if (isLimitReached('lab', isPro)) {
      toast.error(getLimitMessage('lab', isPro));
      return;
    }
    incrementUsage('lab', isPro);
    if (nextLab) {
      // If it's a dynamic lab, its ID might be a string (e.g., 'lab-0')
      navigate(`/labs/${nextLab.id}`);
    } else {
      navigate('/labs');
    }
  };

  const handleQuickGoalUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickGoal.trim() || !profile?.id || !isPro) return;
    
    // Instead of just updating the DB and alerting, we navigate to the roadmap page 
    // with a flag to trigger an immediate generation using this new goal.
    navigate('/roadmap', { 
      state: { 
        triggerUpdate: true, 
        newGoal: quickGoal 
      } 
    });
    setQuickGoal('');
  };

  const handleQuizComplete = async (xpEarned: number) => {
    // Update XP in display immediately
    if (profile) {
      const newXp = (profile.xp || 0) + xpEarned;
      setProfile({ ...profile, xp: newXp });
    }
    
    // Refresh quiz availability and stats
    setQuizAvailable(false);
    const stats = await getQuizStats(profile?.id);
    setQuizStats(stats);
    
    toast.success(`Quiz Complete! +${xpEarned} XP earned!`);
  };

  const displayName = profile?.full_name || profile?.username || profile?.email?.split('@')[0] || 'Engineer';
  const firstName = displayName.split(' ')[0];
  const isPro = profile?.subscription_status === 'pro';
  usePageTitle('Dashboard');
  const searchesLeft = getRemainingUsage('search', isPro);
  const isNewUser = !profileLoading && 
    !onboardingDismissed &&
    profile && 
    !localStorage.getItem('hasSeenOnboarding') &&
    (!profile?.roadmap_data || profile.roadmap_data === '{}' || profile.roadmap_data === '{"stages":[]}');
  const hasNoActivity = weeklyData.reduce((acc, curr) => acc + curr.xp, 0) === 0;
  const currentWeeklyXp = weeklyData.reduce((acc, curr) => acc + curr.xp, 0);
  const currentWeeklyLabs = weeklyData.reduce((acc, curr) => acc + curr.labs, 0);
  const weeklyXpGoal = 1000;
  const weeklyLabsGoal = 5;

  useEffect(() => {
    // Only run tour if profile loaded, not a new user (new users see onboarding modal and redirect),
    // and hasn't seen the tour before. For demo purposes, we trigger if XP is exactly 0 and they have a roadmap.
    if (!profileLoading && profile && !isNewUser && profile.xp === 0 && !localStorage.getItem('hasSeenTour')) {
      setRunTour(true);
      localStorage.setItem('hasSeenTour', 'true');
    }
  }, [profileLoading, profile, isNewUser]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.05,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24, filter: 'blur(4px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { type: 'spring' as const, stiffness: 280, damping: 24, mass: 0.7 }
    }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="max-w-7xl mx-auto space-y-12 pb-24"
    >
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous
        styles={{
          options: {
            primaryColor: '#3B82F6',
            textColor: '#0A0F1C',
            backgroundColor: '#FFFFFF',
            arrowColor: '#FFFFFF',
            zIndex: 1000,
          },
          tooltipContainer: {
            fontFamily: 'Inter, sans-serif',
            textAlign: 'left' as const,
            fontWeight: 700,
          },
          buttonNext: {
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontSize: '10px',
            borderRadius: '1rem',
          },
          buttonSkip: {
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontSize: '10px',
            color: '#64748B',
          }
        } as any}
      />
      <OnboardingModal isOpen={isNewUser} onDismiss={() => setOnboardingDismissed(true)} />

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full playful-card bg-soft-green text-white border-none shadow-2xl relative overflow-hidden mb-8"
          >
            <div className="absolute top-0 right-0 p-8 opacity-20">
              <Trophy className="w-24 h-24" />
            </div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-2xl font-black italic">Welcome to the Pro Fleet! 🚀</h3>
                <p className="text-xs font-bold uppercase tracking-widest opacity-80">Your payment was successful and your limits have been lifted.</p>
              </div>
              <button 
                onClick={() => setShowSuccess(false)}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"
              >
                <RefreshCw className="w-4 h-4 rotate-45" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {profile?.is_deactivated && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full playful-card bg-red-500 text-white border-none shadow-2xl relative overflow-hidden mb-8"
          >
            <div className="absolute top-0 right-0 p-8 opacity-20">
              <Lock className="w-24 h-24" />
            </div>
            <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
              <div className="space-y-1">
                <h3 className="text-2xl font-black italic">Account Deactivated 🔒</h3>
                <p className="text-xs font-bold uppercase tracking-widest opacity-80">
                  Your profile is currently hidden and advanced features are locked.
                </p>
              </div>
              <button 
                onClick={async () => {
                   const { error } = await supabase.from('profiles').update({ is_deactivated: false }).eq('id', profile.id);
                   if (!error) {
                     setProfile({ ...profile, is_deactivated: false });
                     toast.success('Account Reactivated! 🚀');
                   }
                }}
                className="bg-white text-red-500 hover:bg-white/90 px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"
              >
                Activate Now
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row gap-8 items-start justify-between">
        <header className="space-y-3">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight flex items-center gap-3" style={{ fontFamily: 'var(--font-display)' }}>
            <span>
              {isNewUser ? 'Welcome' : greeting},{' '}
              <span className="text-neon-cyan" style={{ textShadow: '0 0 30px rgba(255,157,61,0.5)' }}>
                {isNewUser ? displayName : firstName}
              </span>
            </span>
          </h2>
          <p className="text-text-dim font-mono text-xs uppercase tracking-widest flex flex-wrap items-center gap-2">
            <Star className="w-3.5 h-3.5 text-neon-cyan" /> Readiness: {profile?.readiness_score || 0}%
            {profile?.is_deactivated ? (
              <span className="text-red-400 border border-red-400/30 bg-red-400/10 px-2 py-0.5 rounded-full text-[8px]">DEACTIVATED</span>
            ) : !isPro ? (
              <span className="text-neon-cyan border border-neon-cyan/30 bg-neon-cyan/10 px-2 py-0.5 rounded-full text-[8px]">
                FREE · {searchesLeft} search{searchesLeft !== 1 ? 'es' : ''} left
              </span>
            ) : (
              <span className="text-neon-green border border-neon-green/30 bg-neon-green/10 px-2 py-0.5 rounded-full text-[8px]">
                PRO · Unlimited
              </span>
            )}
          </p>
        </header>

        <form onSubmit={handleAiSearch} className="w-full lg:max-w-xl relative group tour-step-search">
          <div className="absolute inset-0 rounded-2xl bg-neon-cyan/5 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" style={{ boxShadow: '0 0 0 1px rgba(255,157,61,0.3), 0 8px 32px -8px rgba(255,138,30,0.2)' }} />
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-text-dim group-focus-within:text-neon-cyan transition-colors">
            {isSearching ? <Sparkles className="w-4 h-4 animate-spin" /> : profile?.is_deactivated ? <Lock className="w-4 h-4 text-red-400" /> : <Search className="w-4 h-4" />}
          </div>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={profile?.is_deactivated}
            placeholder={profile?.is_deactivated ? "Account deactivated." : "Ask AI anything about DevOps..."}
            className={cn(
              "w-full bg-surface/60 backdrop-blur-xl border border-white/8 rounded-2xl pl-13 pr-24 py-4 font-medium text-sm outline-none transition-all",
              profile?.is_deactivated ? "cursor-not-allowed opacity-60" : "focus:border-neon-cyan/40"
            )}
          />
          <motion.button
            type="submit"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            disabled={isSearching || profile?.is_deactivated || (!isPro && searchesLeft === 0)}
            className="absolute right-2.5 top-2.5 bottom-2.5 px-5 btn-pill btn-neon-primary text-xs disabled:opacity-40"
          >
            {profile?.is_deactivated || (!isPro && searchesLeft === 0) ? <Lock className="w-3.5 h-3.5" /> : 'Ask'}
          </motion.button>
        </form>
      </motion.div>

      <AnimatePresence>
        {aiResponse && (
          <motion.div
            initial={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="glass-panel p-7 relative overflow-hidden"
          >
            <div className="absolute inset-0 rounded-xl opacity-30 pointer-events-none" style={{ background: 'radial-gradient(ellipse at top left, rgba(255,157,61,0.08), transparent 60%)' }} />
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-neon-cyan">
                <Brain className="w-4 h-4" /> AI DevOps Insight
              </div>
              <p className="text-base leading-relaxed max-w-4xl">{aiResponse}</p>
              <button onClick={() => setAiResponse(null)} className="font-mono text-[10px] uppercase tracking-widest text-text-dim hover:text-neon-cyan transition-colors">Dismiss</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero banner — dynamic next lab */}
      <motion.section
        variants={itemVariants}
        className="glass-panel p-8 md:p-12 text-text-main overflow-hidden relative"
      >
        {/* Ambient glow behind the card */}
        <div className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-25" style={{ background: 'radial-gradient(circle, rgba(255,157,61,0.3), transparent 70%)' }} />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="space-y-6 max-w-lg">
            {profileLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-5 w-32 bg-white/5 rounded-xl" />
                <div className="h-14 w-72 bg-white/5 rounded-xl" />
                <div className="h-10 w-40 bg-white/5 rounded-2xl" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono text-[9px] uppercase tracking-widest border border-neon-cyan/30 text-neon-cyan bg-neon-cyan/8 px-3 py-1.5 rounded-full">
                    {profile?.labs_completed || 0} / {(profile?.generated_labs || defaultLabs).length} labs
                  </span>
                  {nextLab === null && (
                    <span className="font-mono text-[9px] uppercase tracking-widest border border-neon-green/30 text-neon-green bg-neon-green/8 px-3 py-1.5 rounded-full">
                      All complete
                    </span>
                  )}
                </div>

                <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]" style={{ fontFamily: 'var(--font-display)' }}>
                  {nextLab === null ? (
                    <>All labs<br /><span className="text-neon-cyan" style={{ textShadow: '0 0 30px rgba(255,157,61,0.4)' }}>complete</span></>
                  ) : (
                    <>Next up:<br /><span className="text-neon-cyan" style={{ textShadow: '0 0 30px rgba(255,157,61,0.4)' }}>{nextLab?.title || 'Loading...'}</span></>
                  )}
                </h1>

                <div className="w-full max-w-xs space-y-1.5">
                  <div className="flex justify-between font-mono text-[9px] uppercase tracking-widest text-text-dim">
                    <span>Progress</span>
                    <span>{Math.round(((profile?.labs_completed || 0) / (profile?.generated_labs || defaultLabs).length) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${((profile?.labs_completed || 0) / (profile?.generated_labs || defaultLabs).length) * 100}%` }}
                      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                      className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg, #00D4FF, #00FF88)', boxShadow: '0 0 8px rgba(0,212,255,0.4)' }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 items-center tour-step-lab">
                  <motion.button
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleStartLab}
                    disabled={nextLab === null || profile?.is_deactivated}
                    className="btn-pill btn-neon-primary px-8 py-3.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {profile?.is_deactivated ? (<><Lock className="w-4 h-4" /> Locked</>) : nextLab === null ? 'Labs complete ✓' : 'Start lab →'}
                  </motion.button>

                  <div className={cn(
                    "flex items-center gap-2 glass-panel p-1.5 rounded-2xl pl-4 transition-all",
                    !isPro && "opacity-60 grayscale"
                  )}>
                    <input
                      value={quickGoal}
                      onChange={(e) => setQuickGoal(e.target.value)}
                      disabled={!isPro || isUpdatingGoal}
                      placeholder={isPro ? "New goal?" : "Pro only"}
                      className="bg-transparent border-none font-mono text-xs outline-none w-full min-w-[120px] disabled:cursor-not-allowed"
                    />
                    <motion.button
                      whileHover={isPro ? { scale: 1.08 } : {}}
                      whileTap={isPro ? { scale: 0.94 } : {}}
                      onClick={handleQuickGoalUpdate}
                      disabled={!isPro || isUpdatingGoal || !quickGoal.trim()}
                      className="p-2.5 rounded-xl btn-neon-primary disabled:opacity-40"
                    >
                      {isUpdatingGoal ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : !isPro ? <Lock className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                    </motion.button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="hidden lg:flex w-56 h-56 items-center justify-center relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-full border border-neon-cyan/15 border-dashed"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-6 rounded-full border border-neon-cyan/8 border-dashed"
            />
            {nextLab === null
              ? <Trophy className="w-20 h-20 text-neon-cyan/40" style={{ filter: 'drop-shadow(0 0 16px rgba(255,157,61,0.4))' }} />
              : <Zap className="w-20 h-20 text-neon-cyan/40" style={{ filter: 'drop-shadow(0 0 16px rgba(255,157,61,0.4))' }} />
            }
          </div>
        </div>
      </motion.section>

      {/* Personalized Growth Section */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AI Insights Card */}
        <motion.div
          whileHover={{ y: -5 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="glass-card p-7 flex flex-col gap-6 relative overflow-hidden cursor-pointer"
          onClick={() => navigate('/roadmap')}
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,157,61,0.5), transparent 70%)' }} />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl border border-neon-cyan/25 bg-neon-cyan/8 flex items-center justify-center text-neon-cyan">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg" style={{ fontFamily: 'var(--font-display)' }}>AI Insights</h3>
              <p className="font-mono text-[9px] uppercase tracking-widest text-text-dim">Personalized for your progress</p>
            </div>
          </div>
          <div className="space-y-4 flex-1">
            <div className="p-4 bg-white/3 rounded-xl border border-white/6">
              <p className="text-sm leading-relaxed text-text-dim">
                {(profile?.readiness_score || 0) < 30
                  ? "Focus on completing the Foundations stage of your roadmap to build a solid base."
                  : (profile?.readiness_score || 0) < 70
                  ? "Your K8s skills are growing. Try the Network Policy lab next to boost your score."
                  : "You're reaching expert levels. Focus on Mock Interviews now to polish your technical communication."}
              </p>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-neon-cyan">
              <Check className="w-3 h-3" /> Readiness +5% this week
            </div>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-neon-cyan group-hover:underline">View roadmap →</span>
        </motion.div>

        {/* Recommended Certifications */}
        <motion.div
          whileHover={{ y: -5 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="glass-card p-7 flex flex-col gap-6 relative overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-15 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(79,209,181,0.5), transparent 70%)' }} />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl border border-neon-green/25 bg-neon-green/8 flex items-center justify-center text-neon-green">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg" style={{ fontFamily: 'var(--font-display)' }}>Recommended Certs</h3>
              <p className="font-mono text-[9px] uppercase tracking-widest text-text-dim">Based on your current path</p>
            </div>
          </div>
          <div className="space-y-3 flex-1">
            {[
              { name: 'CKAD', full: 'Certified Kubernetes Application Developer', focus: 'K8s', match: '95%' },
              { name: 'CKA', full: 'Certified Kubernetes Administrator', focus: 'K8s', match: '88%' },
              { name: 'AWS DevOps Pro', full: 'AWS Certified DevOps Engineer', focus: 'Cloud', match: '80%' },
            ].map((cert, i) => (
              <motion.div
                key={i}
                whileHover={{ x: 4 }}
                transition={{ type: 'spring', stiffness: 400 }}
                className="flex items-center justify-between p-3.5 bg-white/3 rounded-xl border border-white/6 hover:border-neon-cyan/25 transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{cert.name}</p>
                  <p className="font-mono text-[9px] text-text-dim uppercase tracking-widest">{cert.focus}</p>
                </div>
                <span className="shrink-0 font-mono text-[8px] uppercase tracking-widest border border-neon-green/30 text-neon-green bg-neon-green/8 px-2 py-1 rounded-full ml-3">{cert.match}</span>
              </motion.div>
            ))}

          </div>
          <button onClick={() => navigate('/certificates')} className="font-mono text-[10px] uppercase tracking-widest text-neon-green hover:underline text-left">Explore certificates →</button>
        </motion.div>
      </motion.div>

      {/* Daily DevOps Quiz Section */}
      {showQuizSection && (
        <motion.div variants={itemVariants} className="w-full">
          <div className="glass-panel p-7 space-y-8 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,157,61,0.6), transparent 70%)' }} />
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl border border-neon-cyan/25 bg-neon-cyan/8 flex items-center justify-center text-neon-cyan">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-neon-cyan block mb-0.5">daily briefing</span>
                  <h3 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>DevOps quiz</h3>
                </div>
              </div>

              {/* Quick Stats */}
              {quizStats && (
                <div className="flex items-center gap-5">
                  <div className="text-center">
                    <p className="text-lg font-bold text-neon-cyan">{quizStats.totalQuizzesCompleted}</p>
                    <p className="font-mono text-[8px] uppercase tracking-widest text-text-dim">Completed</p>
                  </div>
                  <div className="w-px h-9 bg-border" />
                  <div className="text-center">
                    <p className="text-lg font-bold text-neon-green">{quizStats.currentStreak}</p>
                    <p className="font-mono text-[8px] uppercase tracking-widest text-text-dim">Streak</p>
                  </div>
                  <div className="w-px h-9 bg-border" />
                  <div className="text-center">
                    <p className="text-lg font-bold text-neon-cyan">{quizStats.totalXpEarned}</p>
                    <p className="font-mono text-[8px] uppercase tracking-widest text-text-dim">Total XP</p>
                  </div>
                </div>
              )}
            </div>

            {/* Quiz Component or Status */}
            <div>
              {profile?.id && (
                <DailyQuiz 
                  userId={profile.id} 
                  onComplete={handleQuizComplete}
                />
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Gamification Section */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-8">
         {/* Achievement Badges */}
         <div className="playful-card bg-surface border-none shadow-2xl space-y-8">
            <div className="flex items-center justify-between">
               <div>
                  <h3 className="text-2xl font-black italic">Achievement Badges</h3>
                  <p className="text-[9px] font-black uppercase tracking-widest text-text-dim">Your roadmap milestones</p>
               </div>
               <div className="w-10 h-10 rounded-full bg-soft-orange/10 flex items-center justify-center text-soft-orange">
                  <Star className="w-5 h-5 fill-soft-orange" />
               </div>
            </div>
            <div className="flex overflow-x-auto pb-4 gap-6 no-scrollbar snap-x snap-mandatory">
               {(function() {
                 const roadmapData = typeof profile?.roadmap_data === 'string' 
                   ? JSON.parse(profile.roadmap_data) 
                   : profile?.roadmap_data;
                   
                 const completedTasks = profile?.completed_roadmap_tasks || [];
                 
                 
                 const roadmapBadges = roadmapData?.stages?.map((stage: any, sIdx: number) => {
                   const stageTasks = stage.tasks || [];
                   const isEarned = stageTasks.length > 0 && stageTasks.every((task: any, tIdx: number) => {
                     const taskId = `${stage.id || `stage-${sIdx + 1}`}-task-${tIdx}`;
                     return completedTasks.includes(taskId);
                   });
                   
                   return {
                     name: stage.label,
                     description: stage.description,
                     tasks: stageTasks,
                     icon: stage.icon || '🏆',
                     earned: isEarned,
                     date: isEarned ? 'Earned' : 'Locked'
                   };
                 }) || [];

                 const finalBadges = roadmapBadges.length > 0 
                   ? roadmapBadges
                   : [
                       { name: 'Docker Pilot', icon: '🐳', earned: (profile?.labs_completed || 0) >= 1, date: '1 Lab' },
                       { name: 'K8s Healer', icon: '☸️', earned: (profile?.labs_completed || 0) >= 3, date: '3 Labs' },
                       { name: 'Cloud Native', icon: '☁️', earned: (profile?.labs_completed || 0) >= 5, date: '5 Labs' },
                       { name: 'SRE Master', icon: '⚡', earned: (profile?.level || 1) >= 5, date: 'Level 5' }
                     ];

                 return finalBadges.map((badge, i) => (
                   <motion.div 
                     key={i} 
                     whileHover={{ 
                       scale: 1.05, 
                       rotateY: 10, 
                       rotateX: -10,
                       boxShadow: badge.earned 
                         ? "0 25px 50px -12px rgba(251, 191, 36, 0.5)" 
                         : "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                     }}
                     className={cn(
                       "flex flex-col items-center gap-3 p-6 rounded-3xl border-4 transition-all relative overflow-hidden group cursor-pointer shrink-0 w-48 snap-center",
                       badge.earned 
                         ? "bg-surface border-soft-orange/30 shadow-xl" 
                         : "bg-brand-bg opacity-40 border-border grayscale"
                     )}
                   >
                      {/* Realistic Lighting Effect */}
                      {badge.earned && (
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/20 pointer-events-none" />
                      )}

                       <RoadmapBadge3D
                         stageName={badge.name}
                         description={(badge as any).description}
                          tasks={(badge as any).tasks}
                         earned={badge.earned}
                         size="md"
                         showGlow={badge.earned}
                       />

                      <div className="text-center mt-2">
                         <p className="text-[11px] font-black uppercase truncate max-w-[120px] leading-tight">
                           {badge.name}
                         </p>
                         <p className={cn(
                           "text-[8px] font-black uppercase mt-1 tracking-tighter",
                           badge.earned ? "text-soft-orange" : "text-text-dim"
                         )}>
                           {badge.date}
                         </p>
                      </div>
                      
                      {/* Locked Overlay */}
                      {!badge.earned && (
                        <div className="absolute top-2 right-2">
                          <Lock className="w-3 h-3 text-text-dim/30" />
                        </div>
                      )}
                   </motion.div>
                 ));
               })()}
            </div>
         </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Weekly Goal Tracker */}
         <motion.div whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 280, damping: 22 }} className="glass-card p-7 flex flex-col gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
               <Zap className="w-24 h-24 text-soft-blue" />
            </div>
            <div>
               <h3 className="text-2xl font-black italic text-text-main flex items-center gap-2">
                 Weekly Goal
                 <motion.span animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 2 }}>🚀</motion.span>
               </h3>
               <p className="text-[9px] font-black uppercase tracking-widest text-text-dim">Stay on track, Commander</p>
            </div>
            <div className="space-y-6 flex-1">
               <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase text-text-dim">
                     <span>Complete {weeklyLabsGoal} Labs</span>
                     <span className="text-soft-green font-bold">{currentWeeklyLabs}/{weeklyLabsGoal}</span>
                  </div>
                  <div className="h-2.5 w-full bg-brand-bg rounded-full overflow-hidden border border-border">
                     <div 
                        className="h-full bg-soft-green transition-all duration-700 shadow-[0_0_12px_#86EFAC]" 
                        style={{ width: `${Math.min((currentWeeklyLabs / weeklyLabsGoal) * 100, 100)}%` }} 
                     />
                  </div>
               </div>
               <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase text-text-dim">
                     <span>Earn {weeklyXpGoal.toLocaleString()} XP</span>
                     <span className="text-soft-blue font-bold">{currentWeeklyXp.toLocaleString()}/{weeklyXpGoal}</span>
                  </div>
                  <div className="h-2.5 w-full bg-brand-bg rounded-full overflow-hidden border border-border">
                     <div 
                        className="h-full bg-soft-blue transition-all duration-700 shadow-[0_0_12px_#93C5FD]" 
                        style={{ width: `${Math.min((currentWeeklyXp / weeklyXpGoal) * 100, 100)}%` }} 
                     />
                  </div>
               </div>
               <div className="p-4 bg-brand-bg/50 rounded-2xl border border-border">
                  <p className="text-[10px] font-bold leading-relaxed text-text-dim">
                     🎁 <strong className="text-text-main">Reward:</strong> Earn 500 bonus XP upon goal completion!
                  </p>
               </div>
            </div>
         </motion.div>

         {/* Refer & Earn Card */}
         <motion.div whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 280, damping: 22 }} className="glass-card p-7 flex flex-col items-center text-center space-y-5 relative overflow-hidden">
            <div className="w-14 h-14 rounded-xl border border-neon-green/25 bg-neon-green/8 flex items-center justify-center text-neon-green">
               <Users className="w-7 h-7" />
            </div>
            <div className="space-y-2">
               <h3 className="text-xl font-black italic">Refer & Earn Pro</h3>
               <p className="text-xs font-bold text-text-dim leading-relaxed">
                  Invite 3 friends and get **1 month of Pro** for free. Help others accelerate their career!
               </p>
            </div>
            
            <div className="w-full bg-brand-bg border-2 border-border rounded-2xl p-4 flex items-center justify-between gap-4">
               <span className="text-[10px] font-mono font-bold truncate text-text-dim">
                  debugtodeploy.com/ref/{profile?.username || profile?.id?.slice(0, 8)}
               </span>
               <button 
                 onClick={() => {
                   navigator.clipboard.writeText(`https://debugtodeploy.com/ref/${profile?.username || profile?.id}`);
                   toast.success('Referral link copied!');
                   trackEvent('referral_link_copied', { username: profile?.username });
                 }}
                 className="p-2 hover:bg-soft-blue/10 rounded-lg text-soft-blue transition-all"
               >
                  <Share2 className="w-4 h-4" />
               </button>
            </div>

            <div className="flex gap-4 w-full">
               <div className="flex-1 text-center">
                  <p className="text-[14px] font-black">{profile?.referral_count || 0}</p>
                  <p className="text-[8px] font-black uppercase text-text-dim">Invited</p>
               </div>
               <div className="flex-1 text-center">
                  <p className="text-[14px] font-black">3</p>
                  <p className="text-[8px] font-black uppercase text-text-dim">Goal</p>
               </div>
            </div>
         </motion.div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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

            <div className="h-64 w-full relative">
              {hasNoActivity && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface/50 backdrop-blur-sm rounded-3xl border-2 border-border">
                  <div className="w-12 h-12 bg-soft-blue/10 rounded-full flex items-center justify-center text-soft-blue mb-3">
                    <Flame className="w-6 h-6" />
                  </div>
                  <h4 className="font-black text-lg mb-1">No Activity Yet</h4>
                  <p className="text-text-dim font-bold text-xs mb-4">Complete your first lab to unlock insights!</p>
                  <button
                    onClick={handleStartLab}
                    className="px-6 py-2.5 bg-text-main text-surface rounded-full font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
                  >
                    Start First Lab
                  </button>
                </div>
              )}
              <ResponsiveContainer width="100%" height="100%" className={cn(hasNoActivity && "opacity-20 blur-sm pointer-events-none")}>
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
        <div className="space-y-8 tour-step-progress">
          <div className={cn(
            "playful-card flex flex-col items-center p-6 md:p-12 relative overflow-hidden",
            isPro && "holographic-pro border-soft-blue/20"
          )}>
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
                <div className="w-full h-full bg-soft-blue/10 rounded-full flex items-center justify-center text-soft-blue overflow-hidden">
                  <Avatar 
                    url={profile?.avatar_url ? `${profile.avatar_url}${profile.avatar_url.includes('?') ? '&' : '?'}t=${Date.now()}` : undefined}
                    className="w-full h-full"
                    fallbackClassName="bg-transparent"
                  />
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
          <div className="playful-card border-none text-center py-12 shadow-2xl bg-surface glass-glow">
            <div className="relative mb-6">
              <Flame className="w-16 h-16 text-soft-orange mx-auto fill-soft-orange animate-flicker relative z-10" />
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
      </motion.div>
    </motion.div>
  );
}
