import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, UserPlus, AlertCircle, Github, Chrome, Rocket, Sparkles, ShieldCheck, Zap, Brain } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [identifier, setIdentifier] = useState(''); // email or username
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Safety: Reset loading state when component mounts
  useEffect(() => {
    setLoading(false);
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const timeout = setTimeout(() => setLoading(false), 10000);

    try {
      if (isLogin) {
        let loginEmail = identifier;

        if (!identifier.includes('@')) {
          const { data, error: lookupError } = await supabase
            .from('profiles')
            .select('email')
            .eq('username', identifier)
            .single();

          if (lookupError || !data) {
            throw new Error('Username not found. Please use your email.');
          }
          loginEmail = data.email;
        }

        const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
        if (error) throw error;
      } else {
        if (!username || !fullName) {
          throw new Error('Please fill in all fields (Name, Username, Email, Password).');
        }

        const { data, error } = await supabase.auth.signUp({
          email: identifier,
          password,
          options: {
            data: {
              full_name: fullName,
              username: username
            }
          }
        });

        if (error) {
          if (error.message.includes('rate limit')) {
            throw new Error('Too many attempts! Please wait 15 minutes before trying again.');
          }
          throw error;
        }

        if (data.session) {
          await supabase.auth.signOut();
        }

        alert('Account created successfully! Please sign in.');
        setIsLogin(true);
        setPassword('');
      }
    } catch (err: any) {
      setError(err.message);
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
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
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
      {/* Premium Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-soft-blue/10 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -40, 0],
            y: [0, -50, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[10%] -right-[10%] w-[60%] h-[60%] bg-soft-purple/10 rounded-full blur-[120px]"
        />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-[calc(100vw-2rem)] xl:max-w-[70rem] min-h-[calc(100vh-4rem)] grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-8 lg:gap-0 bg-white/90 dark:bg-[#0D172A]/70 backdrop-blur-2xl border border-slate-200/60 dark:border-white/10 shadow-[0_32px_128px_-16px_rgba(15,23,42,0.22)] rounded-[2rem] sm:rounded-[3rem] overflow-auto my-4 md:my-8"
      >
        {/* Left Side: Branding & Features (Hidden on mobile or integrated) */}
        <div className="hidden lg:flex flex-col justify-between p-16 bg-[#0B0F1A] text-white relative overflow-hidden">
          {/* Decorative elements for left panel */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-soft-blue/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-soft-purple/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <motion.div
              whileHover={{ rotate: 10, scale: 1.1 }}
              className="w-16 h-16 bg-white/5 backdrop-blur-lg rounded-2xl flex items-center justify-center mb-10 border border-white/10 shadow-2xl"
            >
              <Rocket className="w-8 h-8 text-soft-blue" />
            </motion.div>

            <h2 className="text-6xl font-black tracking-tighter italic mb-8 leading-[0.9]">
              Deploy Your <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-soft-blue to-soft-purple">Future Self</span>.
            </h2>
            <p className="text-white/60 font-bold text-lg max-w-sm leading-relaxed mb-16">
              The only platform that combines <span className="text-white">AI-driven learning paths</span> with real-world cloud sandbox environments.
            </p>

            <div className="space-y-8">
              {[
                { icon: Brain, text: "AI-Powered Personalized Roadmaps", color: "text-soft-blue", bg: "bg-soft-blue/10" },
                { icon: Zap, text: "Instant Cloud Sandbox Environments", color: "text-soft-orange", bg: "bg-soft-orange/10" },
                { icon: ShieldCheck, text: "Automated Mock Interviews", color: "text-soft-green", bg: "bg-soft-green/10" },
                { icon: Sparkles, text: "Real-time Skill Readiness Scoring", color: "text-soft-purple", bg: "bg-soft-purple/10" }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + (i * 0.1) }}
                  className="flex items-center gap-5 group"
                >
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-white/20 transition-all group-hover:scale-110", feature.bg, feature.color)}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-base tracking-wide text-white/80 group-hover:text-white transition-colors">{feature.text}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="relative z-10 pt-12 border-t border-white/5">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0B0F1A] bg-gray-800 flex items-center justify-center text-[8px] font-black">
                    U{i}
                  </div>
                ))}
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">
                Join 5,000+ DevOps Engineers
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="p-6 sm:p-10 lg:p-16 flex flex-col justify-center">
          {/* Mobile Logo Only */}
          <div className="lg:hidden flex flex-col items-center mb-6">
            <Rocket className="w-10 h-10 text-soft-blue mb-3" />
            <h1 className="text-2xl font-black tracking-tighter italic">DebugToDeploy</h1>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-black tracking-tight mb-2">
              {isLogin ? "Welcome Back" : "Start Journey"}
            </h2>
            <p className="text-text-dim font-bold text-sm">
              {isLogin ? "Continue your ascent to DevOps mastery." : "Join the elite fleet of infrastructure architects."}
            </p>
          </div>

          {/* Social Logins */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <motion.button
              whileHover={{ y: -4, backgroundColor: "rgba(255,255,255,0.05)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => signInWithSocial('google')}
              disabled={loading}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-white/5 border-2 border-white/5 rounded-3xl text-sm font-black uppercase tracking-widest hover:border-soft-blue/30 transition-all disabled:opacity-50"
            >
              <Chrome className="w-5 h-5 text-soft-blue" /> Google
            </motion.button>
            <motion.button
              whileHover={{ y: -4, backgroundColor: "rgba(255,255,255,0.05)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => signInWithSocial('github')}
              disabled={loading}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-white/5 border-2 border-white/5 rounded-3xl text-sm font-black uppercase tracking-widest hover:border-soft-purple/30 transition-all disabled:opacity-50"
            >
              <Github className="w-5 h-5 text-soft-purple" /> GitHub
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

          <form onSubmit={handleAuth} className="space-y-6">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  key="signup-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-6 overflow-hidden"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-text-dim font-black ml-4">Full Name</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-white/5 border-2 border-white/5 rounded-3xl px-8 py-4 outline-hidden focus:border-soft-blue/50 focus:bg-white/10 transition-all font-bold text-sm"
                      placeholder="Nagarjuna Reddy"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-text-dim font-black ml-4">Username</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-white/5 border-2 border-white/5 rounded-3xl px-8 py-4 outline-hidden focus:border-soft-purple/50 focus:bg-white/10 transition-all font-mono font-bold text-sm"
                      placeholder="devops_master"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-text-dim font-black ml-4">
                {isLogin ? 'Identity (Email/Username)' : 'Email Address'}
              </label>
              <input
                type={isLogin ? "text" : "email"}
                required
                className="w-full bg-white/5 border-2 border-white/5 rounded-3xl px-8 py-4 outline-hidden focus:border-soft-blue/50 focus:bg-white/10 transition-all font-bold text-sm"
                placeholder={isLogin ? "engineer@debugtodeploy.com" : "engineer@debugtodeploy.com"}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-text-dim font-black ml-4">Secret Key</label>
              <input
                type="password"
                required
                className="w-full bg-white/5 border-2 border-white/5 rounded-3xl px-8 py-4 outline-hidden focus:border-soft-blue/50 focus:bg-white/10 transition-all font-bold text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 p-5 bg-soft-red/10 border-2 border-soft-red/20 rounded-[2rem] text-soft-red font-bold text-xs"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="leading-relaxed">{error}</p>
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-text-main text-surface flex items-center justify-center gap-3 py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-soft-blue/20 transition-all hover:bg-soft-blue group"
            >
              {loading ? (
                <div className="w-6 h-6 border-4 border-surface/30 border-t-surface rounded-full animate-spin" />
              ) : isLogin ? (
                <><LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" /> START DEPLOYING</>
              ) : (
                <><UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" /> JOIN THE SQUAD</>
              )}
            </motion.button>
          </form>

          {/* Footer Toggle */}
          <div className="mt-8 pt-6 border-t border-white/5 text-center lg:text-left space-y-4">
            <p className="text-xs font-bold">
              <span className="text-text-dim">
                {isLogin ? "New to the fleet?" : "Already an architect?"}
              </span>
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 text-soft-blue hover:text-white transition-colors underline underline-offset-4 decoration-2"
              >
                {isLogin ? "CREATE ACCOUNT" : "SIGN IN"}
              </button>
            </p>
          </div>
        </div>
      </motion.div>

      {/* Bottom Credits */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="fixed bottom-6 text-center space-y-1 z-10 hidden md:block"
      >
        <p className="text-[8px] text-text-dim/30 font-bold tracking-[0.4em] uppercase">
          SECURE TRANSIT ACTIVE · © {new Date().getFullYear()} Nagarjuna Reddy · DEBUGTODEPLOY V1.0
        </p>
      </motion.div>
    </div>
  );
}