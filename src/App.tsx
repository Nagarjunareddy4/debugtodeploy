import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster } from 'react-hot-toast';
import { Brain, Sparkles, Zap, ShieldCheck, Terminal as TerminalIcon, Map } from 'lucide-react';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Roadmap from './pages/Roadmap';
import LabList from './pages/LabList';
import LabDetail from './pages/LabDetail';
import MockInterviews from './pages/MockInterviews';
import Auth from './pages/Auth';
import Pricing from './pages/Pricing';
import Checkout from './pages/Checkout';
import Settings from './pages/Settings';
import Certificates from './pages/Certificates';
import Learning from './pages/Learning';
import VideoLesson from './pages/VideoLesson';
import Leaderboard from './pages/Leaderboard';
import JobBoard from './pages/JobBoard';
import Portfolio from './pages/Portfolio';
import PublicPortfolio from './pages/PublicPortfolio';
import ResetPassword from './pages/ResetPassword';
import Support from './pages/Support';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Landing from './pages/Landing';
import DeleteAccount from './pages/DeleteAccount';
import PublicProfile from './pages/PublicProfile';
import AiSupportBot from './components/AiSupportBot';
import SplashScreen from './components/common/SplashScreen';
import ConsentModal from './components/ConsentModal';
import { supabase } from './lib/supabase';
import { cn, getObjectHash } from './lib/utils';
import { syncUsageStats } from './lib/usageLimit';
import { generateUserCurriculum, generateUserDocs, generateUserCertificates, isAllContentStale } from './lib/generator';
// Map icon strings to components for loading animation
const iconMap: Record<string, any> = {
  Cloud: Brain,
  Terminal: TerminalIcon,
  ShieldCheck: ShieldCheck,
  Zap: Zap,
  Flame: Sparkles,
};

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Detect expired/invalid recovery links from hash
      if (window.location.hash.includes('error=access_denied') || 
          window.location.hash.includes('Email+link+is+invalid')) {
        window.location.hash = '';
        window.history.replaceState({}, document.title, '/reset-password?expired=true');
      }
      checkSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Force navigation to reset password and bypass normal auth checks temporarily
        window.location.hash = ''; // Clear hash just in case
        window.history.replaceState({}, document.title, '/reset-password');
        setSession(session); // We need the session to update the password
        setLoading(false);
        return;
      }
      checkSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async (session: any) => {
    // Enforce email verification for email signups
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (session?.user && session.user.app_metadata?.provider === 'email' && !session.user.email_confirmed_at && !isLocal) {
      await supabase.auth.signOut();
      setSession(null);
      setLoading(false);
      return;
    }

    setSession(session);
    setLoading(false);
    if (session?.user) {
      syncUsageStats();
      syncProfile(session.user);
    }
  };

  // Update loading step continuously while generating
  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % 5);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // WEB-TO-MOBILE BRIDGE
  useEffect(() => {
    if (session?.user && (window as any).ReactNativeWebView) {
      (window as any).ReactNativeWebView.postMessage(JSON.stringify({
        type: 'AUTH_STATE_SYNC',
        payload: {
          id: session.user.id,
          access_token: session.access_token,
          refresh_token: session.refresh_token
        }
      }));
    }
  }, [session]);

  const syncProfile = async (user: any) => {
    try {
      const metaName = user.user_metadata?.full_name || user.user_metadata?.name || '';
      const metaUsername = user.user_metadata?.username || user.user_metadata?.preferred_username || user.email?.split('@')[0] || '';
      const metaAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';

      // 1. Check if profile exists first
      const { data: current, error: fetchErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!current) {
        // First time login - create profile from metadata
        const { error: insertErr } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            username: metaUsername,
            full_name: metaName,
            avatar_url: metaAvatar,
            subscription_status: 'free',
            xp: 0, level: 1, streak: 0, labs_completed: 0
          });
        
        if (insertErr) console.warn('Initial profile creation handled:', insertErr.message);
      } else {
      // Profile exists - ONLY patch fields that are explicitly null (never set)
        const patches: Record<string, any> = {};
        if (current.full_name === null && metaName) patches.full_name = metaName;
        if (current.email === null && user.email) patches.email = user.email;
        if (current.username === null && metaUsername) patches.username = metaUsername;
        if (current.avatar_url === null && metaAvatar) patches.avatar_url = metaAvatar;

        if (Object.keys(patches).length > 0) {
          await supabase.from('profiles').update(patches).eq('id', user.id);
          Object.assign(current, patches);
        }
      }

      // 2. RE-FETCH OR USE CURRENT (Ensure we have the most accurate state)
      const { data: activeProfile } = current 
        ? { data: current } 
        : await supabase.from('profiles').select('*').eq('id', user.id).single();

      if (activeProfile) {
        // SUBSCRIPTION EXPIRY GUARD
        if (activeProfile.subscription_status === 'pro' && activeProfile.subscription_end_date) {
          const expiryDate = new Date(activeProfile.subscription_end_date);
          if (new Date() >= expiryDate) {
            console.log('Subscription expired. Reverting to free tier.');
            await supabase.from('profiles').update({ 
              subscription_status: 'free',
              auto_renew: false 
            }).eq('id', user.id);
            activeProfile.subscription_status = 'free';
          }
        }
      }

      // Re-fetch latest profile to check curriculum
      const { data: latestProfile } = await supabase.from('profiles').select('roadmap_data, roadmap_version, generated_labs, generated_interviews, generated_certificates, generated_docs').eq('id', user.id).single();

      // Check if we need to generate dynamic curriculum
      if (latestProfile) {
        // If the user hasn't generated a roadmap yet, they are still in onboarding.
        // Do not generate default curriculum and do not hijack the screen.
        if (!latestProfile.roadmap_data || latestProfile.roadmap_data === '{}' || latestProfile.roadmap_data === '{"stages":[]}') {
          setIsGenerating(false);
          return;
        }

        let roadmapGoal = 'DevOps Engineering';
        let experienceLevel = 'intermediate';
        let currentVersion: string | undefined;

          if (latestProfile.roadmap_data) {
            try {
              const parsedRoadmap = typeof latestProfile.roadmap_data === 'string'
                ? JSON.parse(latestProfile.roadmap_data)
                : latestProfile.roadmap_data;
              roadmapGoal = parsedRoadmap.goal || parsedRoadmap.title || roadmapGoal;
              experienceLevel = parsedRoadmap.experience || (typeof parsedRoadmap.description === 'string' && parsedRoadmap.description.toLowerCase().includes('beginner') ? 'beginner' : 'advanced');
              currentVersion = await getObjectHash(parsedRoadmap);
            } catch {
              // ignore parse errors and continue with defaults
            }
          }

          const isStale = isAllContentStale(latestProfile, currentVersion || '');

          if (isStale) {
            // Only show the generation screen if the content is completely missing (new user or reset)
            const hasExistingContent = latestProfile.generated_labs && latestProfile.generated_labs.length > 0;
            if (!hasExistingContent) {
              setIsGenerating(true);
            }
            
            await Promise.all([
              generateUserCurriculum(user.id, roadmapGoal, experienceLevel, currentVersion),
              generateUserCertificates(user.id, roadmapGoal, experienceLevel, currentVersion),
              generateUserDocs(user.id, roadmapGoal, currentVersion),
            ]).catch(err => console.error('Background generation failed:', err));
            
            setIsGenerating(false);
          }
      }

    } catch (err) {
      console.error('Profile sync failed:', err);
      setIsGenerating(false);
    }
  };

  if (loading && !showSplash) return null;

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      {!showSplash && (
        isGenerating ? (
          <GenerationScreen />
        ) : (
          <Router>
            <div className="flex min-h-screen">
              <a href="#main-content" className="skip-link">Skip to main content</a>
              
              <Routes>
                {/* Top-level standalone routes (No Sidebar ever) */}
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/p/:username" element={<PublicPortfolio />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/delete-account" element={<DeleteAccount />} />

                {/* Conditional Layouts based on Auth */}
                <Route path="*" element={
                  session ? (
                    <>
                      <Sidebar />
                      <div className="flex-1 flex flex-col overflow-hidden">
                        <main id="main-content" className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto overflow-x-hidden main-content">
                          <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/roadmap" element={<Roadmap />} />
                            <Route path="/portfolio" element={<Portfolio />} />
                            <Route path="/labs" element={<LabList />} />
                            <Route path="/labs/:id" element={<LabDetail />} />
                            <Route path="/interviews" element={<MockInterviews />} />
                            <Route path="/certificates" element={<Certificates />} />
                            <Route path="/learning" element={<Learning />} />
                            <Route path="/video-lesson" element={<VideoLesson />} />
                            <Route path="/leaderboard" element={<Leaderboard />} />
                            <Route path="/jobs" element={<JobBoard />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="/pricing" element={<Pricing />} />
                            <Route path="/checkout" element={<Checkout />} />
                            <Route path="/support" element={<Support />} />
                            <Route path="/p/:id" element={<PublicProfile />} />
                            <Route path="*" element={<Navigate to="/" />} />
                          </Routes>
                        </main>
                        <AiSupportBot />
                        <footer className="shrink-0 border-t border-border bg-surface/50 backdrop-blur-sm py-3 px-8">
                          <p className="text-center text-[9px] text-text-dim/50 font-bold tracking-widest">
                            © {new Date().getFullYear()} Nagarjunareddy Annapureddy. All rights reserved.
                          </p>
                        </footer>
                      </div>
                    </>
                  ) : (
                    <div className="w-full flex-1 flex flex-col">
                      <Routes>
                        <Route path="/" element={<Landing session={session} />} />
                        <Route path="/ref/:username" element={<ReferralCapture />} />
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/p/:id" element={<PublicProfile />} />
                        <Route path="*" element={<Navigate to="/" />} />
                      </Routes>
                    </div>
                  )
                } />
              </Routes>
              <ConditionalConsentModal session={session} />
            </div>
            <Toaster 
              position="bottom-right" 
              toastOptions={{
                className: 'playful-card text-xs font-bold shadow-2xl',
                style: {
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-main)',
                  border: '4px solid var(--color-border)',
                  borderRadius: '1.5rem',
                  padding: '16px',
                },
              }} 
            />
          </Router>
        )
      )}
    </>
  );
}

function ConditionalConsentModal({ session }: { session: any }) {
  const location = useLocation();
  const isLegalPage = ['/privacy', '/terms'].includes(location.pathname);
  
  if (!session || isLegalPage) return null;
  return <ConsentModal />;
}



function GenerationScreen() {
  const [activeFeature, setActiveFeature] = useState(0);
  const features = [
    {
      title: "AI Roadmaps",
      desc: "Custom-built career paths tailored to your specific engineering goals.",
      icon: Map,
      color: "soft-blue",
      details: ["Skill Tree Analysis", "Dynamic Resources", "Milestones"]
    },
    {
      title: "Cloud Labs",
      desc: "Interactive environments where you fix real infrastructure bugs.",
      icon: TerminalIcon,
      color: "soft-green",
      details: ["YAML Validation", "IaC Practice", "Bug Injection"]
    },
    {
      title: "Mock Interviews",
      desc: "Simulated technical rounds with real-time performance scoring.",
      icon: Brain,
      color: "soft-purple",
      details: ["Behavioral Analysis", "Feedback Reports", "Live Scoring"]
    },
    {
      title: "Pro Portfolios",
      desc: "Showcase your practical achievements to world-class hiring teams.",
      icon: Zap,
      color: "soft-orange",
      details: ["Skill Visualizers", "Certificates", "Public Hosting"]
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg text-text-main py-12 px-6 overflow-x-hidden relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-soft-blue/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-soft-purple/5 blur-[120px] rounded-full animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 w-full max-w-5xl flex flex-col items-center">
        <div className="text-center space-y-4 mb-10 sm:mb-16">
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }} 
            transition={{ duration: 3, repeat: Infinity }}
            className="w-16 h-16 sm:w-20 sm:h-20 bg-surface border-4 border-border rounded-[1.5rem] sm:rounded-3xl flex items-center justify-center mx-auto shadow-2xl"
          >
            <Brain className="w-8 h-8 sm:w-10 sm:h-10 text-soft-blue" />
          </motion.div>
          <div className="space-y-2">
            <h2 className="text-3xl sm:text-5xl font-black italic tracking-tighter">AI Designing <span className="text-soft-blue">Curriculum</span></h2>
            <p className="text-text-dim font-bold uppercase tracking-[0.4em] text-[8px] sm:text-[10px]">Assembling Mission Parameters...</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center w-full">
          <div className="space-y-6 sm:space-y-8 order-2 lg:order-1 text-center lg:text-left">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFeature}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4 sm:space-y-6"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-soft-blue/10 border border-soft-blue/20">
                  <Sparkles className="w-3.5 h-3.5 text-soft-blue" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-soft-blue">System Feature</span>
                </div>
                <h3 className="text-3xl sm:text-4xl font-black tracking-tight">{features[activeFeature].title}</h3>
                <p className="text-text-dim font-bold text-base sm:text-lg leading-relaxed max-w-md mx-auto lg:mx-0">{features[activeFeature].desc}</p>
                <div className="flex flex-wrap justify-center lg:justify-start gap-2 sm:gap-3">
                  {features[activeFeature].details.map((d, i) => (
                    <span key={i} className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest bg-surface border border-border px-3 py-1.5 rounded-lg text-text-dim">
                      {d}
                    </span>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="relative h-64 sm:h-80 flex items-center justify-center order-1 lg:order-2">
             <div className="absolute inset-0 bg-surface/30 backdrop-blur-3xl rounded-[2.5rem] sm:rounded-[3rem] border-4 border-border/50" />
             <div className="grid grid-cols-2 gap-4 sm:gap-6 p-6 sm:p-12 relative z-10 w-full h-full">
                {features.map((f, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      scale: activeFeature === i ? 1.05 : 1,
                      opacity: activeFeature === i ? 1 : 0.4
                    }}
                    className={cn(
                      "playful-card flex flex-col items-center justify-center gap-2 sm:gap-4 transition-all duration-500",
                      activeFeature === i ? "bg-surface border-4 border-soft-blue shadow-2xl" : "bg-brand-bg/50 border-2 border-border"
                    )}
                  >
                    <f.icon className={cn("w-6 h-6 sm:w-10 sm:h-10", activeFeature === i ? "text-soft-blue" : "text-text-dim")} />
                    <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] text-center">{f.title}</span>
                  </motion.div>
                ))}
             </div>
          </div>
        </div>

        <div className="w-full max-w-2xl mt-12 sm:mt-20 space-y-6">
           <div className="flex justify-between items-end mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-soft-blue rounded-full animate-ping" />
                <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-soft-blue">Optimizing Neural Weights</span>
              </div>
              <span className="text-[8px] sm:text-[10px] font-black text-text-dim uppercase tracking-[0.3em]">Phase 02 / 04</span>
           </div>
           <div className="h-2 w-full bg-surface border-2 border-border rounded-full overflow-hidden">
             <motion.div 
               initial={{ width: '0%' }}
               animate={{ width: '100%' }}
               transition={{ duration: 15, ease: "linear" }}
               className="h-full bg-soft-blue rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)]"
             />
           </div>
           <p className="text-[8px] sm:text-[9px] text-center text-text-dim/50 font-bold tracking-[0.4em] uppercase max-w-[280px] sm:max-w-none mx-auto">This sequence happens only once per roadmap update</p>
        </div>
      </div>
    </div>
  );
}

function ReferralCapture() {
  const { username } = useParams();
  
  useEffect(() => {
    if (username) {
      localStorage.setItem('referred_by', username);
    }
  }, [username]);

  // Redirect to home which will show the landing page
  // The user can then click "Start Free" to open the Auth modal
  return <Navigate to="/?auth=signup" replace />;
}
