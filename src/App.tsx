/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Roadmap from './pages/Roadmap';
import LabDetail from './pages/LabDetail';
import LabList from './pages/LabList';
import Settings from './pages/Settings';
import MockInterviews from './pages/MockInterviews';
import Pricing from './pages/Pricing';
import Auth from './pages/Auth';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session?.user) syncProfile(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) syncProfile(session.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const syncProfile = async (user: any) => {
    try {
      const metaName = user.user_metadata?.full_name || user.user_metadata?.name || '';
      const metaUsername = user.user_metadata?.username || user.user_metadata?.preferred_username || user.email?.split('@')[0] || '';
      const metaAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';

      // Upsert: creates if missing, ignores if already exists
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          username: metaUsername,
          full_name: metaName,
          avatar_url: metaAvatar,
          level: 1,
          xp: 0,
          streak: 0,
          readiness_score: 0,
          labs_completed: 0,
          subscription_status: 'free',
        }, { onConflict: 'id', ignoreDuplicates: true });

      if (upsertError) console.error('Profile upsert error:', upsertError.message);

      // If existing profile has no full_name, patch it from auth metadata
      if (metaName) {
        const { data: existing } = await supabase.from('profiles').select('full_name, email').eq('id', user.id).single();
        if (existing && (!existing.full_name || !existing.email)) {
          await supabase.from('profiles').update({
            full_name: existing.full_name || metaName,
            email: existing.email || user.email,
          }).eq('id', user.id);
        }
      }
    } catch (err) {
      console.error('Profile sync failed:', err);
    }
  };

  if (loading) return null;

  return (
    <Router>
      <div className="flex h-screen overflow-hidden">
        {session ? (
          <>
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <main className="flex-1 p-8 overflow-y-auto main-content">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/roadmap" element={<Roadmap />} />
                  <Route path="/labs" element={<LabList />} />
                  <Route path="/labs/:id" element={<LabDetail />} />
                  <Route path="/interviews" element={<MockInterviews />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/pricing" element={<Pricing />} />
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
            <Route path="/auth" element={<Auth />} />
            <Route path="*" element={<Navigate to="/auth" />} />
          </Routes>
        )}
      </div>
    </Router>
  );
}
