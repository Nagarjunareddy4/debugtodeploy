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
      // Check if profile exists
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            username: user.user_metadata?.username || user.email?.split('@')[0],
            full_name: user.user_metadata?.full_name || '',
            avatar_url: user.user_metadata?.avatar_url || '',
            level: 1,
            xp: 0,
            streak: 0,
            readiness_score: 0,
            labs_completed: 0,
            subscription_status: 'free'
          });
        
        if (insertError) console.error('Error creating profile:', insertError.message);
      } else if (fetchError) {
        console.error('Error fetching profile:', fetchError.message);
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
            <main className="flex-1 p-8 overflow-y-auto">
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
