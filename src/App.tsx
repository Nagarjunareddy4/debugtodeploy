import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Sparkles, Zap, ShieldCheck, Terminal as TerminalIcon } from 'lucide-react';
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
import { supabase } from './lib/supabase';
import { getObjectHash } from './lib/utils';
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
        syncProfile(session.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
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
        const apiKey = (window as any).OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY;
        if (apiKey) {
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
            setIsGenerating(true);
            await Promise.all([
              generateUserCurriculum(apiKey, user.id, roadmapGoal, experienceLevel, currentVersion),
              generateUserCertificates(apiKey, user.id, roadmapGoal, experienceLevel, currentVersion),
              generateUserDocs(apiKey, user.id, roadmapGoal, currentVersion),
            ]);
            setIsGenerating(false);
          }
        } else {
          console.warn('No OpenAI API Key found. Skipping curriculum generation.');
        }
      }

    } catch (err) {
      console.error('Profile sync failed:', err);
      setIsGenerating(false);
    }
  };

  if (loading) return null;

  if (isGenerating) {
    return (
      <div className="flex h-screen items-center justify-center bg-brand-bg text-text-main flex-col space-y-8 p-6 text-center overflow-hidden relative">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }} 
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="relative"
        >
          <div className="absolute inset-0 bg-soft-blue/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
          <Brain className="w-24 h-24 text-soft-blue relative z-10" />
        </motion.div>
        
        <div className="max-w-md space-y-4">
          <h2 className="text-4xl font-black italic tracking-tighter">AI Designing Curriculum</h2>
          <p className="text-text-dim font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2">
             <Sparkles className="w-4 h-4 text-soft-blue animate-spin" />
             Personalizing from zero to advance concepts...
          </p>
        </div>
        
        {/* Progress bar simulation */}
        <div className="w-64 h-2 bg-surface border-2 border-border rounded-full overflow-hidden mt-8">
           <motion.div 
             initial={{ width: '0%' }}
             animate={{ width: '100%' }}
             transition={{ duration: 10, ease: "linear" }}
             className="h-full bg-soft-blue rounded-full"
           />
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="flex min-h-screen">
        {session ? (
          <>
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <main className="flex-1 p-8 overflow-y-auto main-content">
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
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </main>
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
            <Route path="*" element={<Navigate to="/auth" />} />
          </Routes>
        )}
      </div>
    </Router>
  );
}
