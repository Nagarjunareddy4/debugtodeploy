import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import Portfolio from './pages/Portfolio';
import PublicPortfolio from './pages/PublicPortfolio';
import ResetPassword from './pages/ResetPassword';
import Support from './pages/Support';
import AiSupportBot from './components/AiSupportBot';
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session?.user) {
        syncUsageStats();
        syncProfile(session.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        syncUsageStats();
        syncProfile(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Update loading step continuously while generating
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % 5);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const syncProfile = async (user: any) => {
    try {
      const metaName = user.user_metadata?.full_name || user.user_metadata?.name || '';
      const metaUsername = user.user_metadata?.username || user.user_metadata?.preferred_username || user.email?.split('@')[0] || '';
      const metaAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';

      // First, check if the profile already exists
      const { data: existing } = await supabase.from('profiles').select('*').eq('id', user.id).single();

      if (!existing) {
        // New user — create profile for the first time with all defaults
        const { error: insertError } = await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          username: metaUsername,
          full_name: metaName,
          avatar_url: metaAvatar, // Only set from OAuth provider on first login
          level: 1,
          xp: 0,
          streak: 0,
          readiness_score: 0,
          labs_completed: 0,
          subscription_status: 'free',
        });
        if (insertError) console.error('Profile insert error:', insertError.message);
      } else {
        // SUBSCRIPTION EXPIRY GUARD
        if (existing.subscription_status === 'pro' && existing.subscription_end_date) {
          const expiryDate = new Date(existing.subscription_end_date);
          if (new Date() < expiryDate) {
             // Still active, but let's double check if we need to revert if it's very close (optional)
          } else {
            console.log('Subscription expired. Reverting to free tier.');
            await supabase.from('profiles').update({ 
              subscription_status: 'free',
              auto_renew: false 
            }).eq('id', user.id);
            existing.subscription_status = 'free';
          }
        }

        // Existing user — only patch fields that are still empty, NEVER overwrite avatar_url
        const patches: Record<string, any> = {};
        if (!existing.full_name && metaName) patches.full_name = metaName;
        if (!existing.email) patches.email = user.email;
        if (Object.keys(patches).length > 0) {
          await supabase.from('profiles').update(patches).eq('id', user.id);
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

  if (loading) return null;

  if (isGenerating) {
    return <GenerationScreen />;
  }

  return (
    <Router>
      <div className="flex min-h-screen">
        <a href="#main-content" className="skip-link">Skip to main content</a>
        {session ? (
          <>
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <main id="main-content" className="flex-1 p-8 overflow-y-auto main-content">
                <Routes>
                  <Route path="/p/:username" element={<PublicPortfolio />} />
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/roadmap" element={<Roadmap />} />
                  <Route path="/portfolio" element={<Portfolio />} />
                  <Route path="/labs" element={<LabList />} />
                  <Route path="/labs/:id" element={<LabDetail />} />
                  <Route path="/interviews" element={<MockInterviews />} />
                  <Route path="/certificates" element={<Certificates />} />
                  <Route path="/learning" element={<Learning />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
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
          <Routes>
            <Route path="/p/:username" element={<PublicPortfolio />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<Navigate to="/auth" />} />
          </Routes>
        )}
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
  );
}

function GenerationScreen() {
  const [activeFeature, setActiveFeature] = useState(0);
  const features = [
    {
      title: "AI Roadmaps",
      desc: "Custom-built career paths tailored to your specific engineering goals.",
      icon: Map,
      color: "soft-blue",
      details: ["Skill Tree Analysis", "Dynamic Resource Fetching", "Goal-Oriented Milestones"]
    },
    {
      title: "Cloud Labs",
      desc: "Interactive environments where you fix real infrastructure bugs.",
      icon: TerminalIcon,
      color: "soft-green",
      details: ["Real-time YAML Validation", "Infrastructure-as-Code Practice", "Automated Bug Injection"]
    },
    {
      title: "Mock Interviews",
      desc: "Simulated technical rounds with real-time performance scoring.",
      icon: Brain,
      color: "soft-purple",
      details: ["Behavioral & Technical Analysis", "Instant Feedback Reports", "Industry-Standard Queries"]
    },
    {
      title: "Pro Portfolios",
      desc: "Showcase your practical achievements to world-class hiring teams.",
      icon: Zap,
      color: "soft-orange",
      details: ["Live Skill Visualizers", "Certificate Integration", "Public Profile Hosting"]
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex h-screen items-center justify-center bg-brand-bg text-text-main overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-soft-blue/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-soft-purple/5 blur-[120px] rounded-full animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 w-full max-w-5xl px-8 flex flex-col items-center">
        <div className="text-center space-y-4 mb-16">
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }} 
            transition={{ duration: 3, repeat: Infinity }}
            className="w-20 h-20 bg-surface border-4 border-border rounded-3xl flex items-center justify-center mx-auto shadow-2xl"
          >
            <Brain className="w-10 h-10 text-soft-blue" />
          </motion.div>
          <div className="space-y-2">
            <h2 className="text-5xl font-black italic tracking-tighter">AI Designing <span className="text-soft-blue">Curriculum</span></h2>
            <p className="text-text-dim font-bold uppercase tracking-[0.4em] text-[10px]">Assembling Mission Parameters...</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">
          <div className="space-y-8 order-2 lg:order-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFeature}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-soft-blue/10 border border-soft-blue/20">
                  <Sparkles className="w-4 h-4 text-soft-blue" />
                  <span className="text-xs font-black uppercase tracking-widest text-soft-blue">System Feature</span>
                </div>
                <h3 className="text-4xl font-black tracking-tight">{features[activeFeature].title}</h3>
                <p className="text-text-dim font-bold text-lg leading-relaxed">{features[activeFeature].desc}</p>
                <div className="flex flex-wrap gap-3">
                  {features[activeFeature].details.map((d, i) => (
                    <span key={i} className="text-[10px] font-black uppercase tracking-widest bg-surface border border-border px-3 py-1.5 rounded-lg text-text-dim">
                      {d}
                    </span>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="relative h-80 flex items-center justify-center order-1 lg:order-2">
             <div className="absolute inset-0 bg-surface/30 backdrop-blur-3xl rounded-[3rem] border-4 border-border/50" />
             <div className="grid grid-cols-2 gap-6 p-12 relative z-10 w-full h-full">
                {features.map((f, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      scale: activeFeature === i ? 1.05 : 1,
                      opacity: activeFeature === i ? 1 : 0.4
                    }}
                    className={cn(
                      "playful-card flex flex-col items-center justify-center gap-4 transition-all duration-500",
                      activeFeature === i ? "bg-surface border-4 border-soft-blue shadow-2xl" : "bg-brand-bg/50 border-2 border-border"
                    )}
                  >
                    <f.icon className={cn("w-10 h-10", activeFeature === i ? "text-soft-blue" : "text-text-dim")} />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">{f.title}</span>
                  </motion.div>
                ))}
             </div>
          </div>
        </div>

        <div className="w-full max-w-2xl mt-20 space-y-6">
           <div className="flex justify-between items-end mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-soft-blue rounded-full animate-ping" />
                <span className="text-[10px] font-black uppercase tracking-widest text-soft-blue">Optimizing Neural Weights</span>
              </div>
              <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.3em]">Phase 02 / 04</span>
           </div>
           <div className="h-2 w-full bg-surface border-2 border-border rounded-full overflow-hidden">
             <motion.div 
               initial={{ width: '0%' }}
               animate={{ width: '100%' }}
               transition={{ duration: 15, ease: "linear" }}
               className="h-full bg-soft-blue rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)]"
             />
           </div>
           <p className="text-[9px] text-center text-text-dim/50 font-bold tracking-[0.4em] uppercase">This sequence happens only once per roadmap update</p>
        </div>
      </div>
    </div>
  );
}
