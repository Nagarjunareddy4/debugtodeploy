import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { User, Mail, AtSign, Camera, Check, Shield, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

export default function Settings() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) { console.warn('Auth error in Settings:', authErr?.message); return; }

      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('Profile fetch error:', error.message);
      }

      // If profile is missing or full_name is empty, upsert with auth metadata
      const metaName = user.user_metadata?.full_name || user.user_metadata?.name || '';
      const metaUsername = user.user_metadata?.username || user.user_metadata?.preferred_username || user.email?.split('@')[0] || '';

      if (!data) {
        // Create profile from scratch
        const { data: created, error: insertErr } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            full_name: metaName,
            username: metaUsername,
            avatar_url: user.user_metadata?.avatar_url || '',
            xp: 0, level: 1, streak: 0, labs_completed: 0,
            readiness_score: 0, subscription_status: 'free',
          }, { onConflict: 'id' })
          .select()
          .single();
        if (insertErr) console.warn('Profile create error:', insertErr.message);
        else data = created;
      } else if (!data.full_name && metaName) {
        // Patch missing full_name from auth metadata
        await supabase.from('profiles').update({ full_name: metaName, email: user.email }).eq('id', user.id);
        data.full_name = metaName;
      }

      if (data) setProfile(data);
      else {
        // Fallback: set minimal profile from auth data so the UI isn't blank
        setProfile({
          id: user.id,
          email: user.email,
          full_name: metaName,
          username: metaUsername,
          subscription_status: 'free',
        });
      }
    } catch (err) {
      console.error('fetchProfile failed:', err);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!profile?.id) return;
    setImageUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `avatars/${profile.id}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id);
      setProfile((prev: any) => ({ ...prev, avatar_url: publicUrl }));
    } catch (err: any) {
      // If storage bucket doesn't exist, fall back to URL input only
      console.warn('Avatar upload failed (bucket may not exist):', err.message);
      alert('Image upload failed. Please ensure the "avatars" storage bucket exists in Supabase Storage, or paste an image URL manually in the Avatar URL field.');
    } finally {
      setImageUploading(false);
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

  if (!profile) return (
    <div className="max-w-4xl mx-auto space-y-10 animate-pulse">
      <div className="h-10 w-56 bg-border rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-4">
          <div className="h-64 bg-surface rounded-3xl shadow-sm" />
          <div className="h-40 bg-surface rounded-3xl shadow-sm" />
        </div>
        <div className="md:col-span-2 space-y-4">
          <div className="h-72 bg-surface rounded-3xl shadow-sm" />
          <div className="h-48 bg-surface rounded-3xl shadow-sm" />
        </div>
      </div>
    </div>
  );

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
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadAvatar(file);
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={imageUploading}
                className="absolute bottom-0 right-0 p-3 bg-text-main text-surface rounded-full shadow-xl hover:scale-110 transition-transform disabled:opacity-60"
              >
                {imageUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-black">{profile.full_name || profile.username || profile.email?.split('@')[0] || 'User'}</h3>
              <p className="text-sm font-mono text-soft-blue">@{profile.username || profile.email?.split('@')[0]}</p>
              {imageUploading && <p className="text-[10px] text-text-dim mt-1 font-bold uppercase tracking-widest animate-pulse">Uploading...</p>}
            </div>
          </div>

          <div className="playful-card p-6 bg-soft-blue text-white border-none shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <Shield className="w-8 h-8 opacity-50" />
              <span className="chip bg-white/20 text-white border-none">
                {profile.subscription_status === 'pro' ? '⭐ PRO' : 'FREE TIER'}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Current Plan</p>
              <h4 className="text-2xl font-black leading-tight">
                {profile.subscription_status === 'pro' ? 'Fleet Captain' : 'Free Tier'}
              </h4>
            </div>
            {profile.subscription_status !== 'pro' && (
              <button
                onClick={() => navigate('/pricing')}
                className="w-full py-3 bg-white text-soft-blue rounded-2xl font-black text-sm hover:scale-[1.02] transition-transform"
              >
                Upgrade to Fleet Captain
              </button>
            )}
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

        </div>
      </div>
    </div>
  );
}
