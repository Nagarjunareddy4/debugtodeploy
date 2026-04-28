import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { User, Mail, AtSign, Camera, Check, Shield, Loader2, X, Eye, Trash2, RefreshCw, CreditCard, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../lib/cropImage';

export default function Settings() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [success, setSuccess] = useState(false);

  // Cropper states
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [originalFileExt, setOriginalFileExt] = useState<string>('jpeg');

  // Avatar action menu
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [viewingAvatar, setViewingAvatar] = useState(false);

  // Subscription cancel states
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

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
        // First time — create profile using INSERT (not upsert) so it can't overwrite
        const { data: created, error: insertErr } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: metaName,
            username: metaUsername,
            avatar_url: user.user_metadata?.avatar_url || '',
            xp: 0, level: 1, streak: 0, labs_completed: 0,
            readiness_score: 0, subscription_status: 'free',
          })
          .select()
          .single();
        if (insertErr) console.warn('Profile create error:', insertErr.message);
        else data = created;
      } else {
        // Patch only fields that are missing — NEVER overwrite avatar_url the user set
        const patches: Record<string, any> = {};
        if (!data.full_name && metaName) patches.full_name = metaName;
        if (!data.email) patches.email = user.email;
        if (Object.keys(patches).length > 0) {
          await supabase.from('profiles').update(patches).eq('id', user.id);
          Object.assign(data, patches);
        }
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

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setOriginalFileExt(file.name.split('.').pop() || 'jpeg');
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result?.toString() || null);
      });
      reader.readAsDataURL(file);
    }
  };

  const uploadCroppedImage = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !imageSrc || !croppedAreaPixels) return;
    
    setImageUploading(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!croppedBlob) throw new Error("Failed to generate cropped image");

      const path = `${user.id}/avatar.${originalFileExt}`;

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, croppedBlob, { upsert: true, contentType: croppedBlob.type });

      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = urlData.publicUrl; // Save clean URL

      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      setProfile((prev: any) => ({ ...prev, avatar_url: publicUrl }));
      setImageSrc(null);
    } catch (err: any) {
      console.warn('Avatar upload failed:', err.message);
      alert(`Image upload failed: ${err.message}`);
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
        })
        .eq('id', user.id);

      if (!error) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    }
    setLoading(false);
  };

  const removeAvatar = async () => {
    if (!profile?.id) return;
    setShowAvatarMenu(false);
    const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', profile.id);
    if (!error) {
      setProfile((prev: any) => ({ ...prev, avatar_url: null }));

      // Also try to delete from storage
      const exts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
      for (const ext of exts) {
        await supabase.storage.from('avatars').remove([`${profile.id}/avatar.${ext}`]);
      }
    }
  };

  const cancelSubscription = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch('/api/subscription/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: 'cancel' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cancellation failed');
      // Update local profile state to reflect cancellation intent
      setProfile((prev: any) => ({
        ...prev,
        autopay_enabled: false,
      }));
      setShowCancelConfirm(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setCancelError(err.message);
    } finally {
      setCancelling(false);
    }
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
    <div className="max-w-4xl mx-auto space-y-12 pb-24">
      {/* Cropper Modal */}
      {imageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <div className="bg-surface rounded-3xl overflow-hidden w-full max-w-lg shadow-2xl border border-border flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-black text-lg">Adjust Avatar</h3>
              <button onClick={() => setImageSrc(null)} className="p-2 hover:bg-brand-bg rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="relative w-full h-[400px] bg-brand-bg">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-dim flex justify-between">
                  <span>Zoom</span>
                  <span>{Math.round(zoom * 100)}%</span>
                </label>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-soft-blue h-2 bg-border rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={() => setImageSrc(null)}
                  className="flex-1 py-3 border-2 border-border rounded-full font-black text-sm hover:bg-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={uploadCroppedImage}
                  disabled={imageUploading}
                  className="flex-1 py-3 bg-text-main text-surface rounded-full font-black text-sm flex items-center justify-center gap-2 hover:bg-soft-blue transition-colors disabled:opacity-50"
                >
                  {imageUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  {imageUploading ? 'Uploading...' : 'Save Avatar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              {/* Spinning animated ring */}
              <div className="w-32 h-32 relative flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border-4 border-dashed border-soft-blue/40"
                />
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-soft-blue p-0.5 bg-brand-bg">
                  {profile.avatar_url ? (
                    <img src={`${profile.avatar_url}${profile.avatar_url.includes('?') ? '&' : '?'}t=${Date.now()}`} alt="Profile" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-brand-bg rounded-full flex items-center justify-center">
                      <User className="w-12 h-12 text-text-dim" />
                    </div>
                  )}
                </div>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {/* Camera button — shows menu if avatar exists, else opens picker directly */}
              <button
                type="button"
                onClick={() => {
                  if (profile.avatar_url) {
                    setShowAvatarMenu(prev => !prev);
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
                disabled={imageUploading}
                className="absolute bottom-0 right-0 p-2.5 bg-text-main text-surface rounded-full shadow-xl hover:scale-110 transition-transform disabled:opacity-60 z-10"
              >
                {imageUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>

              {/* Avatar action menu */}
              <AnimatePresence>
                {showAvatarMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    className="absolute top-0 left-36 bg-surface border-2 border-border rounded-2xl shadow-2xl overflow-hidden z-20 min-w-[160px]"
                  >
                    <button
                      onClick={() => { setViewingAvatar(true); setShowAvatarMenu(false); }}
                      className="flex items-center gap-3 w-full px-4 py-3 hover:bg-brand-bg text-sm font-black uppercase tracking-widest transition-colors"
                    >
                      <Eye className="w-4 h-4 text-soft-blue" /> View
                    </button>
                    <button
                      onClick={() => { setShowAvatarMenu(false); fileInputRef.current?.click(); }}
                      className="flex items-center gap-3 w-full px-4 py-3 hover:bg-brand-bg text-sm font-black uppercase tracking-widest transition-colors"
                    >
                      <RefreshCw className="w-4 h-4 text-soft-green" /> Change
                    </button>
                    <button
                      onClick={removeAvatar}
                      className="flex items-center gap-3 w-full px-4 py-3 hover:bg-red-500/10 text-red-400 text-sm font-black uppercase tracking-widest transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Remove
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-black">{profile.full_name || profile.username || profile.email?.split('@')[0] || 'User'}</h3>
              <p className="text-sm font-mono text-soft-blue">@{profile.username || profile.email?.split('@')[0]}</p>
              {imageUploading && <p className="text-[10px] text-text-dim mt-1 font-bold uppercase tracking-widest animate-pulse">Uploading...</p>}
            </div>
          </div>

          {/* View avatar full-screen overlay */}
          <AnimatePresence>
            {viewingAvatar && profile.avatar_url && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
                onClick={() => setViewingAvatar(false)}
              >
                <div className="relative" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setViewingAvatar(false)}
                    className="absolute -top-3 -right-3 z-10 p-2 bg-surface border-2 border-border rounded-full shadow-xl hover:scale-110 transition-transform"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <img
                    src={`${profile.avatar_url}${profile.avatar_url.includes('?') ? '&' : '?'}t=${Date.now()}`}
                    alt="Profile"
                    className="w-72 h-72 rounded-full object-cover border-4 border-soft-blue shadow-2xl"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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

          {/* Manage Subscription (Pro Only) */}
          {profile.subscription_status === 'pro' && (
            <div className="playful-card p-8 bg-surface space-y-6 shadow-2xl border-none">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-soft-blue" /> Manage Subscription
                </h3>
                {profile.autopay_enabled !== false ? (
                  <span className="chip bg-soft-blue/10 text-soft-blue border-soft-blue/20 text-[10px] font-black uppercase">Active</span>
                ) : (
                  <span className="chip bg-red-500/10 text-red-400 border-red-500/20 text-[10px] font-black uppercase">Cancelling</span>
                )}
              </div>

              {/* Subscription Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-brand-bg rounded-2xl border border-border space-y-1">
                  <p className="text-[10px] font-black uppercase text-text-dim">Current Plan</p>
                  <p className="font-black capitalize">{profile.current_subscription_plan?.replace('_', ' ') || 'Fleet Captain'}</p>
                </div>
                <div className="p-4 bg-brand-bg rounded-2xl border border-border space-y-1">
                  <p className="text-[10px] font-black uppercase text-text-dim">
                    {profile.autopay_enabled ? 'Renews On' : 'Access Until'}
                  </p>
                  <p className="font-black font-mono text-sm">
                    {profile.subscription_end_date
                      ? new Date(profile.subscription_end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'Active'}
                  </p>
                </div>
              </div>

              {/* Cancel Button */}
              {profile.autopay_enabled !== false ? (
                <button
                  onClick={() => { setShowCancelConfirm(true); setCancelError(null); }}
                  className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all bg-red-500/10 text-red-400 border-2 border-red-500/20 hover:bg-red-500 hover:text-white flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" /> Cancel Subscription
                </button>
              ) : (
                <div className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-brand-bg text-text-dim border-2 border-border flex items-center justify-center gap-2 cursor-default">
                  <Check className="w-4 h-4" /> Cancellation Scheduled
                </div>
              )}
              <p className="text-[9px] text-text-dim font-bold text-center">
                {profile.autopay_enabled !== false 
                  ? "You will retain Pro access until the end of your current billing period."
                  : "Your Pro access will remain active until the date shown above."}
              </p>
            </div>
          )}

          {/* Cancel Confirmation Modal */}
          <AnimatePresence>
            {showCancelConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm"
                onClick={() => !cancelling && setShowCancelConfirm(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={e => e.stopPropagation()}
                  className="bg-surface rounded-[2rem] border-2 border-red-500/20 shadow-2xl max-w-md w-full p-10 space-y-6 text-center"
                >
                  <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black">Cancel Subscription?</h3>
                    <p className="text-sm font-bold text-text-dim leading-relaxed">
                      You'll lose access to all Pro features at the end of your current billing period. This action cannot be undone.
                    </p>
                  </div>

                  {cancelError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold">
                      {cancelError}
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      onClick={() => setShowCancelConfirm(false)}
                      disabled={cancelling}
                      className="flex-1 py-4 border-2 border-border rounded-2xl font-black text-sm hover:bg-border transition-colors disabled:opacity-50"
                    >
                      Keep Plan
                    </button>
                    <button
                      onClick={cancelSubscription}
                      disabled={cancelling}
                      className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-sm hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                      {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
      </div>
    </div>
  </div>
);
}
