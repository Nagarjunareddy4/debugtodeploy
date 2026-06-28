import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { usePageTitle } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, UserPlus, AlertCircle, Github, Chrome, Rocket, Sparkles, ShieldCheck, Zap, Brain } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';
import ConsentCheckbox from '../components/ConsentCheckbox';
import { saveUserConsent } from '../lib/consent';
import { Logo, LogoFull } from '../components/ui/Logo';


// Production-hardened authentication flow with real-time security validation
export default function Auth() {
  usePageTitle('Sign In');
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot' | 'verify'>('login');
  const [identifier, setIdentifier] = useState(''); // email or username
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [emailNotRegistered, setEmailNotRegistered] = useState(false);
  const [usernameTaken, setUsernameTaken] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);
  const [checking, setChecking] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedConsent, setAcceptedConsent] = useState(false);
  const [highlightConsent, setHighlightConsent] = useState(false);

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

  // Real-time availability checks (debounced)
  useEffect(() => {
    if (authMode !== 'signup') {
      setUsernameStatus('idle');
      return;
    }

    if (!username) {
      setUsernameStatus('idle');
      setUsernameTaken(false);
      return;
    }

    // Validation: Alphanumeric and underscores only
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      setUsernameStatus('invalid');
      setUsernameTaken(true); // Treat as taken for form submission purposes
      return;
    }

    setUsernameStatus('checking');
    const checkTimer = setTimeout(async () => {
      setChecking(true);
      try {
        const { data, error } = await supabase.rpc('check_availability', {
          target_username: username,
          target_email: identifier.includes('@') ? identifier : ''
        });

        if (!error && data?.[0]) {
          setUsernameTaken(data[0].username_taken);
          setEmailTaken(data[0].email_taken);
          setUsernameStatus(data[0].username_taken ? 'taken' : 'available');
          
          if (identifier.includes('@')) {
            setEmailStatus(data[0].email_taken ? 'taken' : 'available');
          } else {
            setEmailStatus('idle');
          }
        }
      } catch (err) {
        setUsernameStatus('idle');
        setEmailStatus('idle');
      } finally {
        setChecking(false);
      }
    }, 500);

    return () => clearTimeout(checkTimer);
  }, [username, identifier, authMode]);

  // Safety: Reset loading state when component mounts
  useEffect(() => {
    setLoading(false);
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (authMode === 'signup' && !acceptedConsent) {
      toast.error('Please accept the Privacy Policy and Terms & Conditions to continue.', {
        icon: '🛡️',
        style: {
          borderRadius: '1rem',
          background: '#0F172A',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)'
        }
      });
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    setEmailNotRegistered(false);

    const timeout = setTimeout(() => setLoading(false), 10000);

    try {
      if (authMode === 'login') {
        let loginEmail = identifier;

        if (!identifier.includes('@')) {
          const { data, error: lookupError } = await supabase
            .rpc('get_email_by_username', { target_username: identifier });

          if (lookupError || !data || data.length === 0) {
            throw new Error('Username not found. Please use your email.');
          }
          loginEmail = data[0].email;
        }

        const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
        if (error) throw error;
      } else if (authMode === 'signup') {
        if (!username || !fullName || !password || !confirmPassword) {
          throw new Error('Please fill in all fields (Name, Username, Email, Password, Confirm Password).');
        }

        if (password !== confirmPassword) {
          throw new Error('Passwords do not match. Please verify your system keys.');
        }

        if (usernameTaken) {
          throw new Error('This username is already claimed. Please try another.');
        }

        if (emailTaken) {
          throw new Error('This email is already registered. Please sign in instead.');
        }

        // Password strength validation
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters long.');
        }
        if (!/[A-Z]/.test(password)) {
          throw new Error('Password must contain at least one uppercase letter.');
        }
        if (!/[0-9]/.test(password)) {
          throw new Error('Password must contain at least one number.');
        }
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
          throw new Error('Password must contain at least one special character (!@#$%^&*...).');
        }

        const { data, error } = await supabase.auth.signUp({
          email: identifier,
          password,
          options: {
            data: {
              full_name: fullName,
              username: username,
              referred_by: localStorage.getItem('referred_by') || null
            }
          }
        });

        if (error) {
          if (error.message.includes('rate limit')) {
            throw new Error('Too many attempts! Please wait 15 minutes before trying again.');
          }
          throw error;
        }

        if (data.user) {
          // Consent is handled by the initial state, but we save it upon signup
          await saveUserConsent(data.user.id);
        }

        if (data.session) {
          await supabase.auth.signOut({ scope: 'global' });
        }

        setAuthMode('verify');
        setPassword('');
      } else if (authMode === 'forgot') {
        if (!identifier.includes('@')) {
          throw new Error('Please enter a valid email address.');
        }

        // Check if email exists using secure RPC (bypasses RLS)
        const { data, error: profileError } = await supabase.rpc('check_availability', {
          target_username: '',
          target_email: identifier.toLowerCase().trim()
        });

        if (profileError) throw profileError;

        const isRegistered = data && data[0]?.email_taken;

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
        setMessage('Reset link sent! Valid for 30 minutes. Please check your inbox.');
      }
    } catch (err: any) {
      if (err.message?.toLowerCase().includes('email not confirmed')) {
        setAuthMode('verify');
      } else {
        setError(err.message);
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  const signInWithSocial = async (provider: 'google' | 'github') => {
    setLoading(true);
    setError(null);
    const timeout = setTimeout(() => setLoading(false), 5000);


    try {
      // Clear any cached sessions to force fresh login
      await supabase.auth.signOut({ scope: 'global' });

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
          prompt: 'login',
          skipBrowserRedirect: false,
        } as any,
      });
      if (error) throw error;
    } catch (err: any) {
      clearTimeout(timeout);
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-start justify-center bg-brand-bg relative overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-8 py-10">
      {/* Flat editorial background — hairline grid, no blurred orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[length:64px_64px] opacity-[0.35]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[calc(100vw-2rem)] xl:max-w-[70rem] min-h-[calc(100vh-4rem)] grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-8 lg:gap-0 bg-surface clay-flat overflow-auto my-4 md:my-8"
      >
        {/* Left Side: Branding & Features */}
        <div className="hidden lg:flex flex-col justify-between p-16 bg-[#0A0C10] text-white relative overflow-hidden">
          <div className="relative z-10">
            <Logo className="w-12 h-12 mb-10" />

            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-neon-cyan)] flex items-center gap-2 mb-6">
              <span className="w-1.5 h-1.5 bg-[var(--color-neon-cyan)]" /> clearance required
            </span>

            <h1 className="text-5xl font-bold tracking-tight mb-8 leading-[1.1]" style={{ fontFamily: 'var(--font-display)' }}>
              Most platforms teach.<br />This one tests you.
            </h1>
            <p className="text-white/50 text-base max-w-sm leading-relaxed mb-16">
              Real cloud sandboxes, AI-built roadmaps, and mock interviews graded against
              actual hiring bars — not a course progress bar.
            </p>

            <div className="space-y-6">
              {[
                { icon: Brain, text: "AI-built roadmaps, not generic syllabi" },
                { icon: Zap, text: "Instant cloud sandbox environments" },
                { icon: ShieldCheck, text: "AI-graded mock interviews" },
                { icon: Sparkles, text: "Real-time readiness scoring" }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + (i * 0.07) }}
                  className="flex items-center gap-4 group"
                >
                  <div className="w-9 h-9 border border-white/10 flex items-center justify-center text-[var(--color-neon-cyan)] group-hover:border-[var(--color-neon-cyan)]/50 transition-colors shrink-0">
                    <feature.icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm text-white/70 group-hover:text-white transition-colors">{feature.text}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="relative z-10 pt-10 border-t border-white/10">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
              5,000+ engineers on the roster
            </p>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="p-6 sm:p-10 lg:p-16 flex flex-col justify-center">
          <div className="lg:hidden flex flex-col items-center mb-8">
            <LogoFull />
          </div>


          <div className="mb-8 text-center lg:text-left relative">
            {(authMode === 'forgot' || authMode === 'verify') && (
              <motion.button
                type="button"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setAuthMode('login')}
                className="absolute -top-12 left-0 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-text-dim hover:text-[var(--color-neon-cyan)] transition-colors group"
              >
                <motion.span whileHover={{ x: -3 }}>←</motion.span> Back to login
              </motion.button>
            )}
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-neon-cyan)] block mb-2">
              {authMode === 'login' ? "incident-001 · access" : authMode === 'signup' ? "incident-001 · onboarding" : authMode === 'forgot' ? "incident-001 · recovery" : "incident-001 · pending"}
            </span>
            <h2 className="text-3xl font-bold tracking-tight mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              {authMode === 'login' ? "Welcome back" : authMode === 'signup' ? "Start your first incident" : authMode === 'forgot' ? "Reset access" : "Verify email"}
            </h2>
            <p className="text-text-dim text-sm">
              {authMode === 'login'
                ? "Pick up where you left off."
                : authMode === 'signup'
                  ? "Real labs, real failures, real proof of work."
                  : authMode === 'forgot'
                    ? "We'll send a recovery link to your registered email."
                    : "Check your inbox to activate your account."}
            </p>
          </div>

          {authMode === 'verify' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 py-8"
            >
              <div className="w-16 h-16 border border-border flex items-center justify-center mx-auto border border-soft-blue/20">
                <ShieldCheck className="w-10 h-10 text-soft-blue" />
              </div>
              <div className="space-y-4">
                <h3 className="text-xl font-bold tracking-tight text-text-main" style={{ fontFamily: 'var(--font-display)' }}>Check your inbox</h3>
                <p className="text-text-dim text-sm font-bold leading-relaxed">
                  We've sent a verification link to <span className="text-soft-blue">{identifier || 'your email'}</span>.<br/>
                  Please click the link in the email to activate your account and gain access to the platform.
                </p>
              </div>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setAuthMode('login')}
                className="w-full mt-6 bg-surface clay-sm text-text-main flex items-center justify-center py-4 font-black text-xs uppercase tracking-[0.2em] hover:bg-soft-blue/10 transition-colors"
              >
                Back to Login
              </motion.button>
            </motion.div>
          ) : (
            <>
              {authMode !== 'forgot' && (
                <div className="space-y-4 mb-8">
                  <AnimatePresence>
                    {authMode === 'signup' && !acceptedConsent && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center justify-center gap-2 mb-2"
                      >
                        <ShieldCheck className="w-3 h-3 text-soft-blue animate-blink" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-soft-blue animate-blink">
                          Please check the policy box below to continue
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <motion.button
                      whileHover={{ y: -4, backgroundColor: "rgba(255,255,255,0.05)" }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => signInWithSocial('google')}
                      disabled={loading}
                      className={cn(
                        "flex items-center justify-center gap-3 px-6 py-4 clay-sm rounded-3xl text-sm font-black uppercase tracking-widest transition-all",
                        loading 
                          ? "opacity-50 cursor-not-allowed text-text-dim/30" 
                          : "bg-surface cursor-pointer text-text-main"
                      )}
                    >
                      <Chrome className="w-5 h-5 text-soft-blue animate-pulse" /> Google
                    </motion.button>
                    <motion.button
                      whileHover={{ y: -4, backgroundColor: "rgba(255,255,255,0.05)" }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => signInWithSocial('github')}
                      disabled={loading}
                      className={cn(
                        "flex items-center justify-center gap-3 px-6 py-4 clay-sm rounded-3xl text-sm font-black uppercase tracking-widest transition-all",
                        loading 
                          ? "opacity-50 cursor-not-allowed text-text-dim/30" 
                          : "bg-surface cursor-pointer text-text-main"
                      )}
                    >
                      <Github className="w-5 h-5 text-soft-purple animate-pulse" /> GitHub
                    </motion.button>
                  </div>

                  <div className="relative mb-8">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t-2 border-white/5"></div>
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.4em]">
                      <span className="bg-brand-bg lg:bg-transparent px-4 text-text-dim leading-none">Credentials</span>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-6">

                <AnimatePresence mode="wait">
                  {authMode === 'signup' && (
                    <motion.div
                      key="signup-fields"
                      initial={{ opacity: 0, x: -20, filter: 'blur(5px)' }}
                      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, x: 20, filter: 'blur(5px)' }}
                      transition={{ duration: 0.4, ease: "backOut" }}
                      className="space-y-6 overflow-hidden"
                    >
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.2em] text-text-dim font-black ml-4">Full Name</label>
                        <input
                          type="text"
                          required
                          className="w-full bg-surface clay-input border-2 border-border rounded-3xl px-8 py-4 outline-hidden focus:border-soft-blue/50 focus:bg-white/10 transition-all font-bold text-sm text-text-main"
                          placeholder="John Smith"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center px-4">
                          <label className="text-[10px] uppercase tracking-[0.2em] text-text-dim font-black">Username</label>
                          {usernameStatus !== 'idle' && (
                            <span className={cn(
                              "text-[9px] font-black uppercase tracking-widest flex items-center gap-1",
                              usernameStatus === 'available' ? "text-soft-green" : "text-soft-red"
                            )}>
                              {usernameStatus === 'checking' && <span className="w-2 h-2 border-2 border-text-dim border-t-transparent rounded-full animate-spin inline-block" />}
                              {usernameStatus === 'checking' ? 'Checking...' : 
                               usernameStatus === 'available' ? '• Available' : 
                               usernameStatus === 'taken' ? '• Taken' : '• 3-20 chars (a-z, 0-9, _)'}
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          required
                          className={cn(
                            "w-full bg-surface clay-input border-2 rounded-3xl px-8 py-4 outline-hidden transition-all font-mono font-bold text-sm text-text-main",
                            usernameStatus === 'available' ? "border-soft-green/50 focus:border-soft-green" : 
                            usernameStatus === 'taken' || usernameStatus === 'invalid' ? "border-soft-red/50 focus:border-soft-red" : 
                            "border-border focus:border-soft-blue"
                          )}
                          placeholder="devops_hero"
                          value={username}
                          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <div className="flex justify-between items-center px-4">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-text-dim font-black">
                      {authMode === 'signup' ? 'Email Address' : authMode === 'forgot' ? 'Registered Email' : 'Identity (Email/Username)'}
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
                      "w-full bg-surface clay-input border-2 rounded-3xl px-8 py-4 outline-hidden transition-all font-bold text-sm text-text-main",
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
                        className="bg-soft-red/10 border border-soft-red/20 rounded-2xl p-4 mt-2"
                      >
                        <p className="text-[10px] font-bold text-soft-red leading-relaxed">
                          This email is already part of the fleet. 
                          <button 
                            type="button"
                            onClick={() => setAuthMode('login')}
                            className="ml-1 text-soft-blue underline underline-offset-2 hover:text-text-main transition-colors"
                          >
                            Sign in here
                          </button> instead!
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {authMode !== 'forgot' && (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center justify-center mb-2">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={showPassword ? 'monkey-peek' : 'monkey-hide'}
                          initial={{ scale: 0.5, opacity: 0, y: 10 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          exit={{ scale: 0.5, opacity: 0, y: -10 }}
                          className="w-20 h-20 bg-surface border-2 border-border rounded-full flex items-center justify-center text-5xl shadow-lg shadow-soft-blue/10 mb-2"
                        >
                          {showPassword ? '🐵' : '🙈'}
                        </motion.div>
                      </AnimatePresence>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim">
                        {showPassword ? 'System Access Visible' : 'Security Mode Active'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-4">
                        <label className="text-[10px] uppercase tracking-[0.2em] text-text-dim font-black">Master Key (Password)</label>
                        {authMode === 'login' && (
                          <button
                            type="button"
                            onClick={() => setAuthMode('forgot')}
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-soft-blue hover:text-soft-purple transition-all group/forgot"
                          >
                            <AlertCircle className="w-3 h-3 group-hover:rotate-12 transition-transform" />
                            <span className="border-b border-soft-blue/30 group-hover:border-soft-purple">Forgot Password?</span>
                          </button>
                        )}
                      </div>
                      <div className="relative group/pass">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          className="w-full bg-surface clay-input border-2 border-border rounded-3xl px-8 py-4 outline-hidden focus:border-soft-blue/50 focus:bg-white/10 transition-all font-bold text-sm text-text-main pr-14"
                          placeholder={authMode === 'login' ? "••••••••" : "Create Master Key"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        {authMode === 'signup' && password.length > 0 && (
                          <div className="absolute -bottom-6 left-4 right-4 space-y-1.5">
                            <div className="flex justify-between items-center px-1">
                              <span className="text-[8px] font-black uppercase tracking-widest text-text-dim">Strength: {strengthText}</span>
                              <span className="text-[8px] font-black text-text-dim">{strength}%</span>
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
                          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-soft-blue/10 transition-all cursor-pointer z-10"
                        >
                          <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                              key={showPassword ? 'show' : 'hide'}
                              initial={{ y: 5, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              exit={{ y: -5, opacity: 0 }}
                              className="flex flex-col items-center"
                            >
                              <span className="text-xl">{showPassword ? '🔓' : '🔒'}</span>
                              <span className="text-[8px] font-black uppercase mt-0.5 text-text-dim/50">
                                {showPassword ? 'Hide' : 'Show'}
                              </span>
                            </motion.div>
                          </AnimatePresence>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {authMode === 'signup' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2"
                  >
                    <label className="text-[10px] uppercase tracking-[0.2em] text-text-dim font-black ml-4">Confirm Password</label>
                     <div className="relative">
                       <input
                         type={showPassword ? "text" : "password"}
                         required
                         className={cn(
                           "w-full bg-surface clay-input border-2 rounded-3xl px-8 py-4 outline-hidden focus:border-soft-blue/50 focus:bg-white/10 transition-all font-bold text-sm text-text-main pr-14",
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
                  </motion.div>
                )}

                {authMode === 'signup' && (
                  <div className={cn("transition-all duration-500", highlightConsent && "scale-105 ring-4 ring-soft-blue/20 rounded-2xl")}>
                    <ConsentCheckbox 
                      checked={acceptedConsent} 
                      onChange={setAcceptedConsent} 
                      disabled={loading}
                    />
                  </div>
                )}

                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-3 p-5 bg-soft-red/10 clay-flat text-soft-red font-bold text-xs">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <p className="leading-relaxed">{error}</p>
                    </div>
                    {emailNotRegistered && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('signup');
                          setError(null);
                          setEmailNotRegistered(false);
                        }}
                        className="w-full py-4 bg-soft-blue/10 clay-sm text-soft-blue font-black text-[10px] uppercase tracking-[0.2em] hover:bg-soft-blue/20 transition-all flex items-center justify-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" /> Create an account instead
                      </button>
                    )}
                  </motion.div>
                )}

                {message && (
                  <div className="flex items-center gap-3 p-5 bg-soft-green/10 clay-flat text-soft-green font-bold text-xs">
                    <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                    <p className="leading-relaxed">{message}</p>
                  </div>
                )}

                <motion.button
                  type="submit"
                  disabled={loading || (authMode === 'signup' && !acceptedConsent)}
                  whileHover={!loading && (authMode !== 'signup' || acceptedConsent) ? { scale: 1.02, y: -2 } : {}}
                  whileTap={!loading && (authMode !== 'signup' || acceptedConsent) ? { scale: 0.98 } : {}}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className={cn(
                    "w-full flex items-center justify-center gap-3 py-6 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all group relative overflow-hidden",
                    loading || (authMode === 'signup' && !acceptedConsent)
                      ? "bg-surface text-text-dim/30 cursor-not-allowed shadow-none"
                      : "bg-text-main text-surface shadow-[-6px_-6px_14px_rgba(255,255,255,0.06),8px_8px_20px_rgba(255,138,30,0.3)] hover:bg-soft-blue"
                  )}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"
                  />
                  {loading ? (
                    <div className="w-6 h-6 border-4 border-surface/30 border-t-surface rounded-full animate-spin" />
                  ) : authMode === 'login' ? (
                    <><LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" /> Log in</>
                  ) : authMode === 'signup' ? (
                    <><UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" /> Create account</>
                  ) : (
                    <><Sparkles className="w-5 h-5 group-hover:animate-pulse" /> SEND RECOVERY LINK</>
                  )}
                </motion.button>
              </form>

              <div className="mt-8 pt-6 border-t border-white/5 text-center lg:text-left space-y-4">
                <p className="text-xs font-bold text-text-main">
                  <span className="text-text-dim">
                    {authMode === 'login' ? "New here?" : authMode === 'signup' ? "Already have an account?" : "Remembered your password?"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode(authMode === 'signup' ? 'login' : authMode === 'forgot' ? 'login' : 'signup');
                      setError(null);
                      setMessage(null);
                    }}
                    className="ml-2 text-soft-blue hover:text-text-main transition-colors underline underline-offset-4 decoration-2"
                  >
                    {authMode === 'login' ? "CREATE ACCOUNT" : authMode === 'signup' ? "SIGN IN" : "BACK TO LOGIN"}
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="fixed bottom-6 text-center space-y-1 z-10 hidden md:block"
      >
        <p className="text-[8px] text-text-dim/30 font-bold tracking-[0.4em] uppercase">
          © {new Date().getFullYear()} DebugToDeploy | Nagarjunareddy · DEBUGTODEPLOY V1.0
        </p>
      </motion.div>
    </div>
  );
}