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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [acceptedConsent, setAcceptedConsent] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (!pass) return 0;
    if (pass.length >= 8) score += 25;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[0-9]/.test(pass)) score += 25;
    if (/[^A-Za-z0-9]/.test(pass)) score += 25;
    return score;
  };

  const strength = getPasswordStrength(password);
  const strengthColor = strength <= 25 ? 'bg-soft-red' : strength <= 50 ? 'bg-soft-orange' : strength <= 75 ? 'bg-soft-yellow' : 'bg-soft-green';
  const strengthText = strength <= 25 ? 'Weak' : strength <= 50 ? 'Fair' : strength <= 75 ? 'Good' : 'Strong';

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

  // Username & Email availability check
  React.useEffect(() => {
    if (authMode !== 'signup' || (!username && !identifier.includes('@'))) {
      setUsernameStatus('idle');
      setEmailStatus('idle');
      return;
    }

    if (username && !/^[a-z0-9_]{3,20}$/.test(username)) {
      setUsernameStatus('invalid');
    }

    if (usernameStatus !== 'invalid') setUsernameStatus('checking');
    if (identifier.includes('@')) setEmailStatus('checking');

    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc('check_availability', {
          target_username: username || '',
          target_email: identifier.includes('@') ? identifier : ''
        });

        if (!error && data?.[0]) {
          if (username) setUsernameStatus(data[0].username_taken ? 'taken' : 'available');
          if (identifier.includes('@')) setEmailStatus(data[0].email_taken ? 'taken' : 'available');
        } else {
          setUsernameStatus('idle');
          setEmailStatus('idle');
        }
      } catch (err) {
        setUsernameStatus('idle');
        setEmailStatus('idle');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username, identifier, authMode]);

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
        if (!password || password !== confirmPassword) {
          throw new Error('Passwords do not match. Please verify your system keys.');
        }

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
      } else if (authMode === 'forgot') {
        if (!identifier.includes('@')) {
          throw new Error('Please enter a valid email address.');
        }

        // Check if email exists using secure RPC
        const { data: availability, error: profileError } = await supabase.rpc('check_availability', {
          target_username: '',
          target_email: identifier.toLowerCase().trim()
        });

        if (profileError) throw profileError;

        const isRegistered = availability && availability[0]?.email_taken;

        if (!isRegistered) {
          setError('This email is not registered. Redirecting to signup...');
          setTimeout(() => {
            setAuthMode('signup');
            setError(null);
          }, 2000);
          return;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(identifier, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) throw error;
        setMessage('Reset link sent! Please check your inbox.');
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
                <div className="relative">
                  {(authMode === 'forgot' || authMode === 'verify') && (
                    <motion.button
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => {
                        setAuthMode('login');
                        setMessage(null);
                        setError(null);
                      }}
                      className="absolute -top-12 left-0 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-dim hover:text-soft-blue transition-colors group"
                    >
                      <motion.span whileHover={{ x: -3 }}>←</motion.span> Back to Login
                    </motion.button>
                  )}
                  <h2 className="text-3xl font-black tracking-tight mb-2 italic">
                    {authMode === 'login' ? 'Welcome Back' : authMode === 'signup' ? 'Join the Fleet' : authMode === 'forgot' ? 'Reset Access' : 'Verify Email'}
                  </h2>
                  <p className="text-text-dim font-bold text-sm">
                    {authMode === 'login' 
                      ? 'Continue your DevOps ascent.' 
                      : authMode === 'signup' 
                        ? 'Start building your infrastructure career.'
                        : authMode === 'forgot'
                          ? "We'll send a recovery beacon to your inbox."
                          : 'Check your inbox to activate your clearance.'}
                  </p>
                </div>
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
                  {authMode !== 'forgot' && (
                    <>
                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <button type="button" onClick={() => signInWithSocial('google')} className="flex items-center justify-center gap-2 py-4 border-2 border-border rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-soft-blue/10 transition-colors">
                          <Chrome className="w-4 h-4 text-soft-blue" /> Google
                        </button>
                        <button type="button" onClick={() => signInWithSocial('github')} className="flex items-center justify-center gap-2 py-4 border-2 border-border rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-soft-purple/10 transition-colors">
                          <Github className="w-4 h-4 text-soft-purple" /> GitHub
                        </button>
                      </div>

                      <div className="relative mb-8">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
                        <div className="relative flex justify-center text-[8px] uppercase font-black tracking-[0.4em] text-text-dim"><span className="bg-surface px-4">Or Credentials</span></div>
                      </div>
                    </>
                  )}

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
                        <div className="space-y-2">
                          <div className="flex justify-between items-center px-4">
                            <label className="text-[10px] uppercase tracking-[0.2em] text-text-dim font-black">Username</label>
                            {usernameStatus !== 'idle' && (
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-widest",
                                usernameStatus === 'available' ? "text-soft-green" : "text-soft-red"
                              )}>
                                {usernameStatus === 'checking' ? '• Checking...' : 
                                 usernameStatus === 'available' ? '• Available' : 
                                 usernameStatus === 'taken' ? '• Taken' : '• 3-20 chars (a-z, 0-9, _)'}
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            required
                            placeholder="devops_hero"
                            className={cn(
                              "w-full bg-brand-bg border-2 rounded-2xl px-6 py-4 outline-none transition-all font-mono font-bold text-sm text-text-main",
                              usernameStatus === 'available' ? "border-soft-green/50 focus:border-soft-green" : 
                              usernameStatus === 'taken' || usernameStatus === 'invalid' ? "border-soft-red/50 focus:border-soft-red" : 
                              "border-border focus:border-soft-blue"
                            )}
                            value={username}
                            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          />
                        </div>
                      </>
                    )}
                    {authMode !== 'forgot' && (
                      <div className="flex flex-col items-center justify-center mb-6">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={showPassword ? 'monkey-peek' : 'monkey-hide'}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-16 h-16 bg-brand-bg border-2 border-border rounded-full flex items-center justify-center text-4xl shadow-inner mb-2"
                          >
                            {showPassword ? '🐵' : '🙈'}
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-4">
                        <label className="text-[10px] uppercase tracking-[0.2em] text-text-dim font-black">
                          {authMode === 'signup' ? 'Email Address' : authMode === 'forgot' ? 'Registered Email' : 'Email or Username'}
                        </label>
                        {authMode === 'signup' && identifier.includes('@') && (
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-widest flex items-center gap-1",
                            emailStatus === 'available' ? "text-soft-green" : "text-soft-red"
                          )}>
                            {emailStatus === 'checking' && <span className="w-2 h-2 border-2 border-text-dim border-t-transparent rounded-full animate-spin inline-block" />}
                            {emailStatus === 'checking' ? 'Checking...' : 
                             emailStatus === 'available' ? '• Valid Email' : 
                             emailStatus === 'taken' ? '• Already Registered' : ''}
                          </span>
                        )}
                      </div>
                      <input
                        type={authMode === 'login' ? "text" : "email"}
                        required
                        className={cn(
                          "w-full bg-brand-bg border-2 rounded-2xl px-6 py-4 outline-none transition-all font-bold text-sm text-text-main",
                          authMode === 'signup' && identifier.includes('@') && (emailStatus === 'available' ? "border-soft-green/30" : emailStatus === 'taken' ? "border-soft-red/30" : "border-border"),
                          (authMode !== 'signup' || !identifier.includes('@')) && "border-border"
                        )}
                        placeholder="engineer@debugtodeploy.com"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                      />
                      <AnimatePresence>
                        {authMode === 'signup' && emailStatus === 'taken' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-soft-red/10 border border-soft-red/20 rounded-xl p-3 mt-1"
                          >
                            <p className="text-[10px] font-bold text-soft-red leading-tight">
                              This email is already registered. 
                              <button 
                                type="button"
                                onClick={() => setAuthMode('login')}
                                className="ml-1 text-soft-blue underline hover:text-text-main transition-colors"
                              >
                                Sign in instead
                              </button>
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {authMode !== 'forgot' && (
                      <>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center px-4">
                            <label className="text-[10px] uppercase tracking-[0.2em] text-text-dim font-black">Password</label>
                            {authMode === 'login' && (
                              <button
                                type="button"
                                onClick={() => setAuthMode('forgot')}
                                className="text-[9px] font-black uppercase tracking-widest text-soft-blue hover:text-soft-purple transition-colors"
                              >
                                Forgot Password?
                              </button>
                            )}
                          </div>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              required
                              className="w-full bg-brand-bg border-2 border-border rounded-2xl px-6 py-4 outline-none focus:border-soft-blue font-bold text-sm pr-14"
                              placeholder="••••••••"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                            />
                            {authMode === 'signup' && password.length > 0 && (
                              <div className="absolute -bottom-6 left-4 right-4 space-y-1">
                                <div className="flex justify-between items-center px-1">
                                  <span className="text-[7px] font-black uppercase tracking-widest text-text-dim">Strength: {strengthText}</span>
                                  <span className="text-[7px] font-black text-text-dim">{strength}%</span>
                                </div>
                                <div className="h-1 w-full bg-border/30 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${strength}%` }}
                                    className={cn("h-full transition-colors duration-500", strengthColor)}
                                  />
                                </div>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-xl hover:bg-soft-blue/10 transition-colors"
                            >
                              {showPassword ? '🔓' : '🔒'}
                            </button>
                          </div>
                        </div>

                        {authMode === 'signup' && (
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-[0.2em] text-text-dim font-black ml-4">Confirm Password</label>
                            <div className="relative">
                              <input
                                type={showPassword ? "text" : "password"}
                                required
                                className={cn(
                                  "w-full bg-brand-bg border-2 rounded-2xl px-6 py-4 outline-none transition-all font-bold text-sm text-text-main pr-14",
                                  confirmPassword && (password === confirmPassword ? "border-soft-green/30" : "border-soft-red/30")
                                )}
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                              />
                              <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                {confirmPassword && (
                                  <motion.div
                                    initial={{ scale: 0, rotate: -45 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    className={cn(
                                      "px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest",
                                      password === confirmPassword ? "bg-soft-green/10 text-soft-green" : "bg-soft-red/10 text-soft-red"
                                    )}
                                  >
                                    {password === confirmPassword ? '✓ Match' : '× Mismatch'}
                                  </motion.div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {authMode === 'signup' && (
                      <ConsentCheckbox checked={acceptedConsent} onChange={setAcceptedConsent} />
                    )}

                    {error && (
                      <div className="p-4 bg-soft-red/10 border border-soft-red/20 rounded-2xl text-soft-red text-xs font-bold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> {error}
                      </div>
                    )}

                    {message && (
                      <div className="p-4 bg-soft-green/10 border border-soft-green/20 rounded-2xl text-soft-green text-xs font-bold flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" /> {message}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-5 bg-text-main text-surface rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-soft-blue transition-colors flex items-center justify-center gap-2"
                    >
                      {loading ? 'Processing...' : authMode === 'login' ? <><LogIn className="w-4 h-4" /> Login</> : authMode === 'signup' ? <><UserPlus className="w-4 h-4" /> Create Account</> : <><Rocket className="w-4 h-4" /> Send Link</>}
                    </button>
                  </form>

                  <div className="mt-8 text-center">
                    <p className="text-xs font-bold text-text-dim">
                      {authMode === 'login' ? "Don't have an account?" : authMode === 'signup' ? "Already an architect?" : "Remembered your key?"}
                      <button
                        onClick={() => {
                          setAuthMode(authMode === 'signup' ? 'login' : 'signup');
                          setMessage(null);
                          setError(null);
                        }}
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
