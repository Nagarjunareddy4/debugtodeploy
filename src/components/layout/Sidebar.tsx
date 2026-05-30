import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  Map,
  Terminal,
  Settings,
  LogOut,
  MessageSquare,
  Menu,
  X,
  CreditCard,
  User as UserIcon,
  Mail,
  Star,
  Flame,
  Trophy,
  Sun,
  Moon,
  Monitor,
  Award,
  Book,
  Briefcase,
  Facebook,
  Instagram,
  Twitter,
  LifeBuoy,
  Smartphone,
  Shield
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { LogoFull } from '../ui/Logo';
import { Avatar } from '../ui/Avatar';

type ThemeMode = 'system' | 'light' | 'dark';

function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem('theme') as ThemeMode) || 'system';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'system') {
      root.removeAttribute('data-theme');
      root.style.colorScheme = '';
    } else {
      root.setAttribute('data-theme', mode);
      root.style.colorScheme = mode;
    }
    localStorage.setItem('theme', mode);
  }, [mode]);

  // Also listen to OS-level changes when in system mode
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if ((localStorage.getItem('theme') || 'system') === 'system') {
        // Force re-render by toggling a dummy state (CSS handles the actual change)
        document.documentElement.removeAttribute('data-theme');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return { mode, setMode };
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Map, label: 'AI Roadmap', path: '/roadmap' },
  { icon: UserIcon, label: 'Portfolio', path: '/portfolio' },
  { icon: Terminal, label: 'Cloud Labs', path: '/labs' },
  { icon: Book, label: 'Learning', path: '/learning' },
  { icon: MessageSquare, label: 'Interviews', path: '/interviews' },
  { icon: Trophy, label: 'Leaderboard', path: '/leaderboard' },
  { icon: Briefcase, label: 'Jobs', path: '/jobs', badge: 'BETA' },
  { icon: Award, label: 'Certificates', path: '/certificates' },
  { icon: LifeBuoy, label: 'Support', path: '/support' },
  { icon: CreditCard, label: 'Pricing', path: '/pricing' },
];

// Admin password is read from VITE_ADMIN_PASSWORD in .env at build/dev time.
// Change it in .env and restart dev server — the new password is picked up automatically.
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminShake, setAdminShake] = useState(false);
  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const { mode, setMode } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchProfile(session.user);
    });

    // Real-time subscription to profile changes
    const channel = supabase
      .channel('sidebar-profile')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        if (payload.new) setProfile(payload.new);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Body scroll lock on mobile when sidebar is open
  useEffect(() => {
    const isMobile = window.innerWidth < 1024;
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const fetchProfile = async (user: any) => {
    if (!user) return;

    // Get the profile row directly using the user ID
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Auth Display name fallback
    const authName =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.user_metadata?.display_name ||
      '';

    if (data) {
      // Patch the DB ONLY if the field is strictly null (meaning never set)
      if (data.full_name === null && authName) {
        await supabase.from('profiles').update({ full_name: authName }).eq('id', user.id);
        data.full_name = authName;
      }
      setProfile(data);
    } else {
      // Fallback: build from auth metadata
      setProfile({ full_name: authName, email: user.email, subscription_status: 'free' });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut({ scope: 'global' });
  };

  const displayName = profile?.full_name || profile?.username || profile?.email?.split('@')[0] || 'Engineer';
  const displayNameShort = displayName.split(' ')[0];

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 right-4 z-[70] p-3 bg-text-main text-surface rounded-full shadow-2xl transition-all active:scale-95"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {isOpen && (
        <div 
          className="fixed inset-0 bg-text-main/20 backdrop-blur-xs z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 top-0 z-[60] w-72 glass-panel flex flex-col transition-all duration-500 ease-in-out overflow-hidden border-r",
        !isOpen && "-translate-x-full lg:translate-x-0 shadow-none",
        isOpen && "translate-x-0 shadow-2xl lg:shadow-none",
        "lg:fixed lg:h-screen"
      )}>
        {/* Header - Logo (Fixed) — long-press 800ms to open hidden admin gate */}
        <div
          className="flex-shrink-0 p-8 pb-4 select-none"
          onMouseDown={() => {
            longPressTimer.current = setTimeout(() => {
              setAdminPass('');
              setAdminError('');
              setShowAdminModal(true);
            }, 800);
          }}
          onMouseUp={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
          onMouseLeave={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
          onTouchStart={() => {
            longPressTimer.current = setTimeout(() => {
              setAdminPass('');
              setAdminError('');
              setShowAdminModal(true);
            }, 800);
          }}
          onTouchEnd={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
        >
          <LogoFull />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0 px-8">
          <div className="space-y-12 pb-8">
            <nav className="flex flex-col gap-3">
              {navItems.map((item) => {
                const isDeactivated = profile?.is_deactivated;
                const isDisabled = isDeactivated && !['Dashboard', 'Support', 'Settings'].includes(item.label);
                
                return (
                  <NavLink
                    key={item.path}
                    to={isDisabled ? '#' : item.path}
                    onClick={(e) => {
                      if (isDisabled) {
                        e.preventDefault();
                        return;
                      }
                      setIsOpen(false);
                    }}
                    className={({ isActive }) =>
                      cn(
                        "nav-pill group transition-all",
                        isActive && !isDisabled && "nav-pill-active",
                        isDisabled && "opacity-40 cursor-not-allowed grayscale"
                      )
                    }
                  >
                    <div className="relative">
                      <item.icon className={cn("w-5 h-5", !isDisabled && "group-hover:scale-110 transition-transform")} />
                      {isDisabled && (
                        <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5">
                          <X className="w-2 h-2 text-white" />
                        </div>
                      )}
                    </div>
                    <span className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                      {item.label}
                      {isDisabled && <span className="text-[8px] bg-red-500/10 text-red-500 px-1 rounded-xs">Locked</span>}
                      {(item as any).badge && !isDisabled && (
                        <span className="text-[7px] bg-soft-orange/20 text-soft-orange border border-soft-orange/30 px-1.5 py-0.5 rounded-full font-black tracking-widest animate-pulse">
                          {(item as any).badge}
                        </span>
                      )}
                    </span>
                  </NavLink>
                );
              })}
            </nav>


            {profile && profile.subscription_status !== 'pro' && !profile.is_deactivated && (
              <div className="px-2 mt-8">
                <div 
                  className="relative overflow-hidden rounded-3xl p-6 border-2 border-soft-orange/30 group cursor-pointer transition-all hover:border-soft-orange" 
                  onClick={() => {
                    navigate('/pricing');
                    setIsOpen(false);
                  }}
                >
                  <div className="absolute inset-0 bg-linear-to-br from-soft-orange/10 to-soft-purple/10 group-hover:opacity-100 opacity-50 transition-opacity" />
                  <div className="absolute top-0 right-0 w-24 h-24 bg-soft-orange/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform" />
                  
                  <div className="relative z-10 flex flex-col items-center text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-soft-orange/20 flex items-center justify-center text-soft-orange group-hover:scale-110 transition-transform">
                      <Star className="w-5 h-5 fill-soft-orange" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-text-main">Unlock Pro</h4>
                      <p className="text-[9px] font-bold text-text-dim mt-1 leading-relaxed">Unlimited AI, premium labs, & portfolio sharing.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Android App Button - Only on desktop for logged-in users */}
            {profile && (
              <div className="flex justify-center">
                <motion.div
                  className="hidden lg:flex relative group"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="w-12 h-12 rounded-2xl bg-soft-orange/20 border-2 border-soft-orange/30 flex items-center justify-center group-hover:border-soft-orange transition-all cursor-not-allowed opacity-50">
                    <Smartphone className="w-6 h-6 text-soft-orange" />
                  </div>
                  <span className="absolute -top-2 -right-2 text-[8px] font-black uppercase bg-soft-orange text-white px-1.5 py-0.5 rounded-full tracking-wider animate-pulse">App</span>
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-surface border-2 border-border rounded-lg px-2 py-1 text-[10px] font-bold text-text-dim whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    Android App (Testing)
                  </div>
                </motion.div>
              </div>
            )}

            {/* Social Media Links */}
            <div className="flex items-center justify-center gap-6 py-4">
              <motion.a
                href="https://www.facebook.com/profile.php?id=61589307951543"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-dim/70 hover:text-blue-500 transition-colors duration-300"
                whileHover={{ scale: 1.2, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
              >
                <Facebook className="w-6 h-6" />
              </motion.a>
              <motion.a
                href="https://x.com/DebugToDeploy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-dim/70 hover:text-text-main transition-colors duration-300"
                whileHover={{ scale: 1.2, rotate: -5 }}
                whileTap={{ scale: 0.9 }}
              >
                <Twitter className="w-6 h-6" />
              </motion.a>
              <motion.a
                href="https://www.instagram.com/debugtodeploy?igsh=MTlxcmoyNG9obWN1OA=="
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-dim/70 hover:text-pink-500 transition-colors duration-300"
                whileHover={{ scale: 1.2, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
              >
                <Instagram className="w-6 h-6" />
              </motion.a>
            </div>
          </div>
        </div>

        {/* Footer - User Controls (Fixed) */}
        <div className="flex-shrink-0 p-8 pt-4 border-t border-border space-y-4 relative">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between px-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-text-dim">Theme</span>
            <div className="flex bg-brand-bg border-2 border-border rounded-full p-1 gap-1">
              {([
                { val: 'light' as ThemeMode, icon: Sun },
                { val: 'system' as ThemeMode, icon: Monitor },
                { val: 'dark'  as ThemeMode, icon: Moon },
              ]).map(({ val, icon: Icon }) => (
                <button
                  key={val}
                  title={val}
                  onClick={() => setMode(val)}
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center transition-all',
                    mode === val
                      ? 'bg-text-main text-surface shadow-md scale-110'
                      : 'text-text-dim hover:text-text-main'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          </div>

          {showUserDetails && profile && (
            <div className="absolute bottom-full mb-3 left-0 right-0 bg-surface border-2 border-border rounded-3xl p-6 shadow-2xl z-50 space-y-4">
              <div className="flex items-center gap-4">
                <Avatar 
                  url={profile.avatar_url ? `${profile.avatar_url}${profile.avatar_url.includes('?') ? '&' : '?'}t=${Date.now()}` : undefined}
                  className="w-14 h-14 rounded-full border-2 border-soft-blue"
                />
                <div className="min-w-0">
                  <p className="font-black text-sm truncate">{displayName}</p>
                  <p className="text-[10px] font-bold text-soft-blue uppercase tracking-widest flex items-center gap-2">
                    {profile.subscription_status === 'pro' ? (
                      <span className="text-soft-orange flex items-center gap-1">
                        <Star className="w-3 h-3 fill-soft-orange" /> PRO
                      </span>
                    ) : (
                      'DevOps Lvl ' + (profile.level || 1)
                    )}
                  </p>
                </div>
              </div>
              <div className="space-y-2 text-[11px] font-bold text-text-dim">
                <div className="flex items-center gap-2">
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{profile.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-3 h-3 text-soft-orange" />
                  <span>Readiness: {profile.readiness_score || 0}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Flame className="w-3 h-3 text-soft-orange" />
                  <span>{profile.streak || 0} Day Streak</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-3 h-3 text-soft-green" />
                  <span>{profile.labs_completed || 0} Labs Completed</span>
                </div>
              </div>
              <div className="pt-2 border-t border-border">
                <NavLink
                  to="/settings"
                  onClick={() => { setShowUserDetails(false); setIsOpen(false); }}
                  className="text-[10px] font-black uppercase tracking-widest text-soft-blue hover:underline"
                >
                  Edit Profile →
                </NavLink>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowUserDetails(!showUserDetails)}
            className={cn(
              "nav-pill group border-2 border-border/40 hover:border-text-main/20 transition-all w-full text-left",
              showUserDetails && "nav-pill-active border-transparent shadow-lg"
            )}
          >
            <Avatar 
              url={profile?.avatar_url ? `${profile.avatar_url}${profile.avatar_url.includes('?') ? '&' : '?'}t=${Date.now()}` : undefined}
              className="w-7 h-7 rounded-full border-2 border-surface shadow-sm"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest leading-none truncate flex items-center gap-2">
                {displayNameShort}
                {profile?.is_deactivated && <span className="bg-red-500 text-white text-[6px] px-1 rounded-xs animate-pulse">DEACTIVATED</span>}
              </span>
              <span className="text-[8px] font-black text-soft-blue mt-1 uppercase">
                {profile?.subscription_status === 'pro' ? '⭐ PRO MEMBER' : `DevOps Lvl ${profile?.level || 1}`}
              </span>
            </div>
          </button>

          <button 
            onClick={handleLogout}
            className="nav-pill text-red-500 hover:bg-red-500/10 hover:border-red-500/20 border-2 border-transparent w-full"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-black text-sm uppercase tracking-widest">Logout</span>
          </button>
        </div>
      </aside>

      {showUserDetails && (
        <div className="fixed inset-0 z-30" onClick={() => setShowUserDetails(false)} />
      )}

      {/* ── Hidden Admin Gate Modal (long-press logo to reveal) ── */}
      {showAdminModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-md"
            onClick={() => setShowAdminModal(false)}
          />
          {/* Modal */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={adminShake
                ? { opacity: 1, scale: 1, x: [-8, 8, -6, 6, -4, 4, 0] }
                : { opacity: 1, scale: 1, x: 0, y: 0 }
              }
              transition={adminShake ? { duration: 0.4 } : { type: 'spring', damping: 18 }}
              className="pointer-events-auto w-full max-w-sm glass-panel rounded-3xl p-8 border border-neon-cyan/20 shadow-2xl shadow-black/60 relative overflow-hidden"
            >
              {/* Glow */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,212,255,0.08),transparent_60%)] pointer-events-none" />

              <div className="relative z-10 space-y-6">
                {/* Icon + title */}
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/25 flex items-center justify-center">
                    <Shield className="w-7 h-7 text-neon-cyan" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-text-main">Admin Access</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-dim mt-1">Enter admin password to continue</p>
                  </div>
                </div>

                {/* Password input */}
                <div className="space-y-2">
                  <input
                    type="password"
                    autoFocus
                    value={adminPass}
                    onChange={e => { setAdminPass(e.target.value); setAdminError(''); }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        if (adminPass === ADMIN_PASSWORD) {
                          setShowAdminModal(false);
                          navigate('/admin');
                        } else {
                          setAdminError('Incorrect password. Try again.');
                          setAdminShake(true);
                          setTimeout(() => setAdminShake(false), 500);
                          setAdminPass('');
                        }
                      }
                      if (e.key === 'Escape') setShowAdminModal(false);
                    }}
                    placeholder="••••••••••••"
                    className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3.5 text-sm font-bold text-text-main outline-none focus:border-neon-cyan focus:ring-2 focus:ring-neon-cyan/15 transition-all text-center tracking-widest placeholder:tracking-normal"
                  />
                  {adminError && (
                    <p className="text-red-400 text-[10px] font-black text-center tracking-wider">{adminError}</p>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAdminModal(false)}
                    className="flex-1 py-3 rounded-xl border border-border text-xs font-black uppercase tracking-wider text-text-dim hover:text-text-main hover:border-border/80 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (adminPass === ADMIN_PASSWORD) {
                        setShowAdminModal(false);
                        navigate('/admin');
                      } else {
                        setAdminError('Incorrect password. Try again.');
                        setAdminShake(true);
                        setTimeout(() => setAdminShake(false), 500);
                        setAdminPass('');
                      }
                    }}
                    className="flex-1 py-3 rounded-xl bg-neon-cyan text-[#05080F] text-xs font-black uppercase tracking-wider hover:brightness-110 transition-all shadow-lg shadow-neon-cyan/20"
                  >
                    Unlock
                  </button>
                </div>

                <p className="text-[9px] text-center text-text-dim/50 font-bold tracking-widest uppercase">
                  Password set via <code className="font-mono text-neon-cyan/60">VITE_ADMIN_PASSWORD</code>
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </>
  );
}
