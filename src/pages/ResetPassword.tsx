import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { ShieldCheck, AlertCircle, Rocket, Lock, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);

  useEffect(() => {
    const checkLinkExpiration = async () => {
      setCheckingLink(true);
      
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // If no session, the link might be invalid or already used/expired by Supabase
        setIsExpired(true);
        setCheckingLink(false);
        return;
      }

      try {
        // Call the RPC to get the recovery_sent_at timestamp
        const { data, error: rpcError } = await supabase.rpc('get_recovery_info');
        
        if (rpcError) throw rpcError;

        if (data && data[0]?.recovery_sent_at) {
          const sentAt = new Date(data[0].recovery_sent_at).getTime();
          const now = new Date().getTime();
          const diffMinutes = (now - sentAt) / (1000 * 60);

          if (diffMinutes > 30) {
            setIsExpired(true);
            // Sign out because this session is technically "expired" by our rules
            await supabase.auth.signOut();
          }
        } else {
          // If no recovery_sent_at found but we have a session, 
          // it might be a normal session (not from a recovery link).
          // We should probably redirect to auth if they didn't come from a recovery event.
          // But for now, let's just assume if it's missing, the link is invalid.
          setIsExpired(true);
        }
      } catch (err) {
        console.error('Error checking link expiration:', err);
        setIsExpired(true);
      } finally {
        setCheckingLink(false);
      }
    };

    checkLinkExpiration();
  }, []);

  // Password Policy Checks
  const hasMinLength = password.length >= 12;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const isFormValid = hasMinLength && hasUppercase && hasNumber && hasSpecial && passwordsMatch;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      // Force sign out so they must login again with the new credentials
      await supabase.auth.signOut();


      setSuccess(true);
      setTimeout(() => {
        // Attempt to deep link back to the mobile app if on mobile
        if (/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
          window.location.href = 'debugtodeploy://';
          // Fallback to web login after a short delay if app isn't installed
          setTimeout(() => navigate('/auth'), 1000);
        } else {
          navigate('/auth');
        }
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-brand-bg p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-soft-blue/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-soft-purple/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white/90 dark:bg-[#0D172A]/70 backdrop-blur-2xl border border-white/10 p-8 sm:p-12 rounded-[3rem] shadow-2xl relative z-10"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-soft-blue/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-soft-blue/20">
            <Lock className="w-8 h-8 text-soft-blue" />
          </div>
          <h2 className="text-3xl font-black tracking-tight mb-2">Update Credentials</h2>
          <p className="text-text-dim font-bold text-sm">Forge a stronger key for your DevOps vault.</p>
        </div>

        {checkingLink ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-12 h-12 border-4 border-soft-blue/30 border-t-soft-blue rounded-full animate-spin" />
            <p className="text-text-dim font-bold text-xs uppercase tracking-widest">Validating Recovery Beacon...</p>
          </div>
        ) : isExpired ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-8 py-4"
          >
            <div className="w-20 h-20 bg-soft-red/10 rounded-full flex items-center justify-center mx-auto border border-soft-red/20">
              <XCircle className="w-10 h-10 text-soft-red" />
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-black tracking-tight text-soft-red">Link Expired</h3>
              <p className="text-text-dim text-sm font-bold leading-relaxed">
                Security protocols require reset links to be used within 30 minutes. 
                This beacon has gone dark.
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/auth')}
              className="w-full py-6 bg-white/5 border border-white/10 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] hover:bg-white/10 transition-colors"
            >
              Request New Link
            </motion.button>
          </motion.div>
        ) : success ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6 py-8"
          >
            <div className="w-20 h-20 bg-soft-green/10 rounded-full flex items-center justify-center mx-auto border border-soft-green/20">
              <ShieldCheck className="w-10 h-10 text-soft-green" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black tracking-tight text-soft-green">System Updated!</h3>
              <p className="text-text-dim text-sm font-bold">Redirecting you to the landing pad...</p>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleReset} className="space-y-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-text-dim font-black ml-4">New Password</label>
                <input
                  type="password"
                  required
                  className="w-full bg-white/5 border-2 border-white/5 rounded-3xl px-8 py-4 outline-none focus:border-soft-blue/50 focus:bg-white/10 transition-all font-bold text-sm"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-text-dim font-black ml-4">Confirm System Key</label>
                <input
                  type="password"
                  required
                  className="w-full bg-white/5 border-2 border-white/5 rounded-3xl px-8 py-4 outline-none focus:border-soft-blue/50 focus:bg-white/10 transition-all font-bold text-sm"
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Validation Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-6 bg-white/5 rounded-3xl border border-white/5">
              <ValidationItem isValid={hasMinLength} text="Min 12 Chars" />
              <ValidationItem isValid={hasUppercase} text="One Uppercase" />
              <ValidationItem isValid={hasNumber} text="Contains Number" />
              <ValidationItem isValid={hasSpecial} text="Special Char" />
              <ValidationItem isValid={passwordsMatch} text="Keys Match" className="sm:col-span-2" />
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 bg-soft-red/10 border border-soft-red/20 rounded-2xl text-soft-red font-bold text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <motion.button
              type="submit"
              disabled={!isFormValid || loading}
              whileHover={isFormValid ? { scale: 1.02 } : {}}
              whileTap={isFormValid ? { scale: 0.98 } : {}}
              className={cn(
                "w-full py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl",
                isFormValid 
                  ? "bg-text-main text-surface hover:bg-soft-blue" 
                  : "bg-white/5 text-text-dim cursor-not-allowed border border-white/5"
              )}
            >
              {loading ? (
                <div className="w-6 h-6 border-4 border-surface/30 border-t-surface rounded-full animate-spin" />
              ) : (
                <><Rocket className="w-5 h-5" /> REBOOT ACCESS</>
              )}
            </motion.button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

function ValidationItem({ isValid, text, className }: { isValid: boolean; text: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {isValid ? (
        <CheckCircle2 className="w-3 h-3 text-soft-green" />
      ) : (
        <XCircle className="w-3 h-3 text-text-dim/30" />
      )}
      <span className={cn("text-[10px] font-bold uppercase tracking-wider", isValid ? "text-soft-green" : "text-text-dim/50")}>
        {text}
      </span>
    </div>
  );
}
