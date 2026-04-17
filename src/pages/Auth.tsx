import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { LogIn, UserPlus, AlertCircle, Github, Chrome, Rocket } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [identifier, setIdentifier] = useState(''); // email or username
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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
            throw new Error('Too many attempts! Please wait 15 minutes before trying again, or try a different email.');
          }
          throw error;
        }

        if (data.session) {
          await supabase.auth.signOut();
        }

        alert('Account created successfully! Please sign in with your new credentials.');
        setIsLogin(true);
        setPassword('');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const signInWithSocial = async (provider: 'google' | 'github') => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-4 sm:p-6 bg-brand-bg">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="playful-card w-full max-w-lg border-none max-h-[90dvh] overflow-y-auto"
      >
        <div className="flex flex-col items-center mb-8">
          <motion.div
            whileHover={{ rotate: 10 }}
            className="w-16 h-16 bg-text-main rounded-3xl flex items-center justify-center text-3xl font-black mb-4 text-surface shadow-xl"
          >
            <Rocket className="w-8 h-8" />
          </motion.div>
          <h1 className="text-3xl font-black tracking-tight text-center">DebugToDeploy</h1>
          <p className="text-text-dim text-sm mt-1 font-bold uppercase tracking-widest">DevOps Mastery Platform</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => signInWithSocial('google')}
            disabled={loading}
            className="flex items-center justify-center gap-3 px-6 py-4 bg-surface border-2 border-border rounded-3xl text-sm font-bold hover:bg-border transition-all disabled:opacity-50"
          >
            <Chrome className="w-5 h-5 text-soft-blue" /> Google
          </button>
          <button
            onClick={() => signInWithSocial('github')}
            disabled={loading}
            className="flex items-center justify-center gap-3 px-6 py-4 bg-surface border-2 border-border rounded-3xl text-sm font-bold hover:bg-border transition-all disabled:opacity-50"
          >
            <Github className="w-5 h-5 text-soft-purple" /> GitHub
          </button>
        </div>

        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-border"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
            <span className="bg-surface px-4 text-text-dim leading-none pt-1">Or use individual creds</span>
          </div>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          {/* Signup specific fields */}
          {!isLogin && (
            <motion.div
              initial={{ height: 0, opacity: 0, scale: 0.95 }}
              animate={{ height: 'auto', opacity: 1, scale: 1 }}
              className="space-y-5 overflow-hidden"
            >
              <div>
                <label className="text-[10px] uppercase tracking-widest text-text-dim font-black mb-2 block ml-1">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full bg-brand-bg border-2 border-border rounded-3xl px-6 py-4 outline-hidden focus:border-text-main transition-all font-bold"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-text-dim font-black mb-2 block ml-1">Username</label>
                <input
                  type="text"
                  required
                  className="w-full bg-brand-bg border-2 border-border rounded-3xl px-6 py-4 outline-hidden focus:border-text-main transition-all font-mono font-bold"
                  placeholder="johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </motion.div>
          )}

          <div>
            <label className="text-[10px] uppercase tracking-widest text-text-dim font-black mb-2 block ml-1">
              {isLogin ? 'Email or Username' : 'Email Address'}
            </label>
            <input
              type={isLogin ? "text" : "email"}
              required
              className="w-full bg-brand-bg border-2 border-border rounded-3xl px-6 py-4 outline-hidden focus:border-text-main transition-all font-bold"
              placeholder={isLogin ? "johndoe or engineer@devops.com" : "engineer@devops.com"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-text-dim font-black mb-2 block ml-1">Password</label>
            <input
              type="password"
              required
              className="w-full bg-brand-bg border-2 border-border rounded-3xl px-6 py-4 outline-hidden focus:border-text-main transition-all font-bold"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex flex-col gap-2 p-4 bg-red-500/5 rounded-3xl border-2 border-red-500/20">
              <div className="flex items-center gap-3 text-red-500 text-sm font-black">
                <AlertCircle className="w-5 h-5" />
                Auth Error
              </div>
              <p className="text-red-500/80 text-xs font-bold leading-relaxed line-clamp-2">
                {error.includes('Failed to fetch')
                  ? "Connection failed. Please check your Supabase URL/Key in the Secrets panel."
                  : error}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-pill bg-text-main text-surface w-full flex items-center justify-center gap-2 py-5 text-lg shadow-xl"
          >
            {loading ? (
              <div className="w-6 h-6 border-4 border-surface/30 border-t-surface rounded-full animate-spin" />
            ) : isLogin ? (
              <><LogIn className="w-5 h-5" /> SIGN IN</>
            ) : (
              <><UserPlus className="w-5 h-5" /> CREATE ACCOUNT</>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm font-bold">
          <span className="text-text-dim">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-text-main hover:underline transition-all"
          >
            {isLogin ? "CREATE ACCOUNT" : "SIGN IN"}
          </button>
        </div>

        <p className="mt-4 text-center text-[10px] text-text-dim font-bold tracking-widest uppercase">
          {isLogin ? "Ready to deploy your career?" : "Welcome to the elite devops fleet."}
        </p>
      </motion.div>
    </div>
  );
}
