import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Rocket, Chrome, Github, LogIn, UserPlus, AlertCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';
import ConsentCheckbox from '../ConsentCheckbox';
import { saveUserConsent } from '../../lib/consent';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot' | 'verify'>(initialMode);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptedConsent, setAcceptedConsent] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'signup' && !acceptedConsent) {
      toast.error('Please accept the Privacy Policy and Terms to continue.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (authMode === 'login') {
        let loginEmail = identifier;
        if (!identifier.includes('@')) {
          const { data, error: lookupError } = await supabase.rpc('get_email_by_username', { target_username: identifier });
          if (lookupError || !data || data.length === 0) throw new Error('Username not found.');
          loginEmail = data[0].email;
        }
        const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
        if (error) throw error;
        onClose();
      } else if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: identifier,
          password,
          options: { 
            data: { 
              full_name: fullName, 
              username,
              referred_by: localStorage.getItem('referred_by') || null
            } 
          }
        });
        if (error) throw error;
        if (data.user) await saveUserConsent(data.user.id);
        setAuthMode('verify');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const signInWithSocial = async (provider: 'google' | 'github') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-brand-bg/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-surface border-4 border-border rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="overflow-y-auto flex-1 custom-scrollbar">
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-text-dim hover:text-text-main transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="p-8 sm:p-12">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-soft-blue/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-soft-blue/20">
                  <Rocket className="w-8 h-8 text-soft-blue" />
                </div>
                <h2 className="text-3xl font-black tracking-tight mb-2 italic">
                  {authMode === 'login' ? 'Welcome Back' : authMode === 'signup' ? 'Join the Fleet' : 'Verify Email'}
                </h2>
                <p className="text-text-dim font-bold text-sm">
                  {authMode === 'login' ? 'Continue your DevOps ascent.' : 'Start building your infrastructure career.'}
                </p>
              </div>

              {authMode === 'verify' ? (
                <div className="text-center space-y-6">
                   <div className="w-16 h-16 bg-soft-green/10 rounded-full flex items-center justify-center mx-auto border border-soft-green/20">
                    <ShieldCheck className="w-8 h-8 text-soft-green" />
                  </div>
                  <p className="text-sm font-bold text-text-dim">Check your inbox for a verification link.</p>
                  <button onClick={() => setAuthMode('login')} className="btn-pill bg-text-main text-surface w-full uppercase tracking-widest text-xs">Back to Login</button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <button onClick={() => signInWithSocial('google')} className="flex items-center justify-center gap-2 py-4 border-2 border-border rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-soft-blue/10 transition-colors">
                      <Chrome className="w-4 h-4 text-soft-blue" /> Google
                    </button>
                    <button onClick={() => signInWithSocial('github')} className="flex items-center justify-center gap-2 py-4 border-2 border-border rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-soft-purple/10 transition-colors">
                      <Github className="w-4 h-4 text-soft-purple" /> GitHub
                    </button>
                  </div>

                  <div className="relative mb-8">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
                    <div className="relative flex justify-center text-[8px] uppercase font-black tracking-[0.4em] text-text-dim"><span className="bg-surface px-4">Or Credentials</span></div>
                  </div>

                  <form onSubmit={handleAuth} className="space-y-4">
                    {authMode === 'signup' && (
                      <>
                        <input
                          type="text"
                          required
                          placeholder="Full Name"
                          className="w-full bg-brand-bg border-2 border-border rounded-2xl px-6 py-4 outline-none focus:border-soft-blue font-bold text-sm"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                        />
                        <input
                          type="text"
                          required
                          placeholder="Username"
                          className="w-full bg-brand-bg border-2 border-border rounded-2xl px-6 py-4 outline-none focus:border-soft-blue font-bold text-sm"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                        />
                      </>
                    )}
                    <input
                      type="text"
                      required
                      placeholder="Email or Username"
                      className="w-full bg-brand-bg border-2 border-border rounded-2xl px-6 py-4 outline-none focus:border-soft-blue font-bold text-sm"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                    />
                    <input
                      type="password"
                      required
                      placeholder="Password"
                      className="w-full bg-brand-bg border-2 border-border rounded-2xl px-6 py-4 outline-none focus:border-soft-blue font-bold text-sm"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />

                    {authMode === 'signup' && (
                      <ConsentCheckbox checked={acceptedConsent} onChange={setAcceptedConsent} />
                    )}

                    {error && (
                      <div className="p-4 bg-soft-red/10 border border-soft-red/20 rounded-2xl text-soft-red text-xs font-bold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-5 bg-text-main text-surface rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-soft-blue transition-colors flex items-center justify-center gap-2"
                    >
                      {loading ? 'Processing...' : authMode === 'login' ? <><LogIn className="w-4 h-4" /> Login</> : <><UserPlus className="w-4 h-4" /> Create Account</>}
                    </button>
                  </form>

                  <div className="mt-8 text-center">
                    <p className="text-xs font-bold text-text-dim">
                      {authMode === 'login' ? "Don't have an account?" : "Already an architect?"}
                      <button
                        onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                        className="ml-2 text-soft-blue hover:underline"
                      >
                        {authMode === 'login' ? 'Sign Up' : 'Login'}
                      </button>
                    </p>
                  </div>
                </>
              )}
            </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
