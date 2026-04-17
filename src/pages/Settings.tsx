import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { User, Mail, AtSign, Camera, Check, Shield, CreditCard, Key, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [success, setSuccess] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);

  useEffect(() => {
    fetchProfile();
    // Load saved API key from localStorage
    const saved = localStorage.getItem('openai_api_key');
    if (saved) {
      setApiKey(saved);
      (window as any).OPENAI_API_KEY = saved;
    }
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(data);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          username: profile.username,
          avatar_url: profile.avatar_url,
        })
        .eq('id', user.id);

      if (!error) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    }
    setLoading(false);
  };

  const saveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('openai_api_key', apiKey.trim());
      (window as any).OPENAI_API_KEY = apiKey.trim();
      setApiKeySaved(true);
      setTimeout(() => setApiKeySaved(false), 3000);
    }
  };

  const clearApiKey = () => {
    localStorage.removeItem('openai_api_key');
    delete (window as any).OPENAI_API_KEY;
    setApiKey('');
  };

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <header className="flex justify-between items-end">
        <div className="space-y-2">
          <h2 className="text-4xl font-black tracking-tight">System Configuration</h2>
          <p className="text-text-dim font-bold uppercase tracking-widest text-xs">Profile & Preferences</p>
        </div>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-soft-green/10 text-soft-green px-4 py-2 rounded-full border-2 border-soft-green/20 text-xs font-black uppercase tracking-widest"
          >
            <Check className="w-4 h-4" /> Config Updated
          </motion.div>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <div className="playful-card flex flex-col items-center p-8 gap-6 border-none bg-surface shadow-2xl">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-soft-blue p-1">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-brand-bg rounded-full flex items-center justify-center">
                    <User className="w-12 h-12 text-text-dim" />
                  </div>
                )}
              </div>
              <button className="absolute bottom-0 right-0 p-3 bg-text-main text-surface rounded-full shadow-xl hover:scale-110 transition-transform">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-black">{profile.full_name || profile.username || 'Engineer'}</h3>
              <p className="text-sm font-mono text-soft-blue">@{profile.username}</p>
            </div>
          </div>

          <div className="playful-card p-6 bg-soft-blue text-white border-none shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <Shield className="w-8 h-8 opacity-50" />
              <span className="chip bg-white/20 text-white border-none">PRO STATUS</span>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Current Plan</p>
              <h4 className="text-2xl font-black leading-tight">Free Tier</h4>
            </div>
            <button className="w-full py-3 bg-white text-soft-blue rounded-2xl font-black text-sm hover:scale-[1.02] transition-transform">Upgrade to Fleet Captain</button>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="playful-card p-8 bg-surface space-y-8 shadow-2xl border-none">
            <h3 className="text-lg font-black uppercase tracking-widest">Profile Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-dim flex items-center gap-2">
                  <User className="w-3 h-3" /> Full Name
                </label>
                <input
                  value={profile.full_name || ''}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  className="w-full bg-brand-bg border-2 border-border rounded-2xl px-6 py-4 font-bold outline-hidden focus:border-soft-blue transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-dim flex items-center gap-2">
                  <AtSign className="w-3 h-3" /> Username
                </label>
                <input
                  value={profile.username || ''}
                  onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                  className="w-full bg-brand-bg border-2 border-border rounded-2xl px-6 py-4 font-mono font-bold outline-hidden focus:border-soft-green transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-dim flex items-center gap-2">
                <Mail className="w-3 h-3" /> Email Address
              </label>
              <input
                readOnly
                value={profile.email || ''}
                className="w-full bg-brand-bg/50 border-2 border-border rounded-2xl px-6 py-4 font-bold text-text-dim cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-dim flex items-center gap-2">
                <Camera className="w-3 h-3" /> Avatar URL
              </label>
              <input
                value={profile.avatar_url || ''}
                onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                placeholder="https://example.com/photo.jpg"
                className="w-full bg-brand-bg border-2 border-border rounded-2xl px-6 py-4 font-bold outline-hidden focus:border-soft-purple transition-colors"
              />
            </div>

            <div className="pt-6">
              <button
                disabled={loading}
                className="btn-pill bg-text-main text-surface w-full py-5 text-lg flex items-center justify-center gap-3 shadow-2xl hover:scale-[1.01]"
              >
                {loading ? (
                  <div className="w-6 h-6 border-4 border-surface/30 border-t-surface rounded-full animate-spin" />
                ) : (
                  'Save Changes & Synchronize'
                )}
              </button>
            </div>
          </form>

          {/* API Configuration */}
          <div className="playful-card p-8 bg-surface space-y-6 shadow-2xl border-none">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                <Key className="w-4 h-4 text-soft-orange" /> API Configuration
              </h3>
              {apiKeySaved && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1 text-soft-green text-xs font-black uppercase tracking-widest"
                >
                  <Check className="w-4 h-4" /> Saved
                </motion.div>
              )}
            </div>
            <p className="text-text-dim text-xs font-bold">
              Add your OpenAI API key to power AI search, roadmap generation, and mock interview feedback.
              Your key is stored locally in your browser only.
            </p>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-dim flex items-center gap-2">
                <Key className="w-3 h-3" /> OpenAI API Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-brand-bg border-2 border-border rounded-2xl px-6 py-4 font-mono font-bold outline-hidden focus:border-soft-orange transition-colors pr-14"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(prev => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-main transition-colors"
                >
                  {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={saveApiKey}
                disabled={!apiKey.trim()}
                className="btn-pill bg-soft-orange/90 text-white px-8 py-3 text-xs flex items-center gap-2 disabled:opacity-50 hover:scale-105 transition-all"
              >
                <Key className="w-4 h-4" /> Save API Key
              </button>
              {apiKey && (
                <button
                  onClick={clearApiKey}
                  className="btn-pill bg-brand-bg text-text-dim px-6 py-3 text-xs hover:bg-red-500/10 hover:text-red-500 transition-all"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
