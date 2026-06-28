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
import { PlanBadge } from '../ui/PlanBadge';
import NotificationBell from '../notifications/NotificationBell';

type ThemeMode = 'system' | 'light' | 'dark';

function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    // Default to 'dark'; only override if user has explicitly saved a preference
    return (localStorage.getItem('theme') as ThemeMode) || 'dark';
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

// Admin password hash is injected at build time via vite.config.ts
// It reads ADMIN_PASSWORD from .env and replaces __ADMIN_PASSWORD_HASH__ with the SHA-256 hash
declare const __ADMIN_PASSWORD_HASH__: string;

const hashInput = async (input: string) => {
  const msgBuffer = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

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
      {/* Mobile Notification & Menu Controls */}
      <div className="lg:hidden fixed top-4 right-4 z-[70] flex items-center gap-2">
        <NotificationBell />
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2.5 bg-text-main text-surface transition-all active:scale-95 flex items-center justify-center h-10 w-10 shadow-lg"
          style={{ borderRadius: '0.5rem' }}
          aria-label="Menu"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {isOpen && (
        <div 
          className="fixed inset-0 bg-text-main/20 backdrop-blur-xs z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 top-0 z-[60] w-72 glass-panel rounded-none border-r flex flex-col transition-all duration-500 ease-in-out overflow-hidden",
        !isOpen && "-translate-x-full lg:translate-x-0 shadow-none",
        isOpen && "translate-x-0 shadow-2xl lg:shadow-none",
        "lg:fixed lg:h-screen"
      )}>
        {/* Header - Logo & Notification Bell — long-press 800ms to open hidden admin gate */}
        <div
          className="flex-shrink-0 p-8 pb-4 select-none flex items-center justify-between gap-3"
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
          <div onClick={() => { setIsOpen(false); navigate('/'); }} className="cursor-pointer">
            <LogoFull />
          </div>
          <div className="hidden lg:block shrink-0">
            <NotificationBell />
          </div>
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
                        <span className="text-[7px] bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 px-1.5 py-0.5 font-mono font-bold tracking-widest">
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
                  className="relative p-5 clay-sm cursor-pointer group"
                  onClick={() => {
                    navigate('/pricing');
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-text-dim">Clearance level</span>
                    <PlanBadge status={profile.subscription_status} />
                  </div>
                  <h4 className="text-sm font-bold text-text-main mb-1">Unlock the full toolchain</h4>
                  <p className="text-[11px] text-text-dim leading-relaxed mb-4">
                    Unlimited sandboxes, AI mock interviews, and a shareable portfolio.
                  </p>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-neon-cyan group-hover:underline">
                    Upgrade →
                  </span>
                </div>
              </div>
            )}

            {/* Mobile app cross-link — disabled until app ships */}
            {profile && (
              <div className="px-2">
                <div
                  className="flex items-center gap-3 px-3 py-3 clay-sm opacity-40 cursor-not-allowed select-none"
                  title="Coming soon"
                >
                  <Smartphone className="w-4 h-4 text-text-dim shrink-0" />
                  <div className="min-w-0">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-text-main">Get the app</p>
                    <p className="text-[10px] text-text-dim truncate">Coming soon</p>
                  </div>
                  <span className="ml-auto font-mono text-[7px] uppercase tracking-widest text-text-dim border border-border px-1.5 py-0.5">Soon</span>
                </div>
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
            <div className="absolute bottom-full mb-3 left-0 right-0 bg-surface clay-flat p-6 z-50 space-y-4">
              <div className="flex items-center gap-4">
                <Avatar 
                  url={profile.avatar_url ? `${profile.avatar_url}${profile.avatar_url.includes('?') ? '&' : '?'}t=${Date.now()}` : undefined}
                  className="w-14 h-14 rounded-full border border-border"
                />
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{displayName}</p>
                  <div className="mt-1"><PlanBadge status={profile.subscription_status} size="md" /></div>
                </div>
              </div>
              <div className="space-y-2 text-[11px] font-medium text-text-dim font-mono">
                <div className="flex items-center gap-2">
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{profile.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-3 h-3 text-neon-cyan" />
                  <span>Readiness: {profile.readiness_score || 0}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Flame className="w-3 h-3 text-neon-cyan" />
                  <span>{profile.streak || 0} Day Streak</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-3 h-3 text-neon-green" />
                  <span>{profile.labs_completed || 0} Labs Completed</span>
                </div>
              </div>
              <div className="pt-2 border-t border-border">
                <NavLink
                  to="/settings"
                  onClick={() => { setShowUserDetails(false); setIsOpen(false); }}
                  className="text-[10px] font-bold uppercase tracking-widest text-neon-cyan hover:underline font-mono"
                >
                  Edit Profile →
                </NavLink>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowUserDetails(!showUserDetails)}
            className={cn(
              "nav-pill group w-full text-left",
              showUserDetails && "nav-pill-active"
            )}
          >
            <Avatar 
              url={profile?.avatar_url ? `${profile.avatar_url}${profile.avatar_url.includes('?') ? '&' : '?'}t=${Date.now()}` : undefined}
              className="w-7 h-7 rounded-full border border-border"
            />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-widest leading-none truncate flex items-center gap-2">
                {displayNameShort}
                {profile?.is_deactivated && <span className="bg-red-500 text-white text-[6px] px-1 rounded-xs animate-pulse">DEACTIVATED</span>}
              </span>
              <span className="text-[8px] text-text-dim mt-1">Lvl {profile?.level || 1}</span>
            </div>
            <PlanBadge status={profile?.subscription_status} />
          </button>

          <button 
            onClick={handleLogout}
            className="nav-pill text-red-500 hover:bg-red-500/10 w-full"
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
                    onKeyDown={async e => {
                      if (e.key === 'Enter') {
                        const hashed = await hashInput(adminPass);
                        if (hashed === __ADMIN_PASSWORD_HASH__) {
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
                    onClick={async () => {
                      const hashed = await hashInput(adminPass);
                      if (hashed === __ADMIN_PASSWORD_HASH__) {
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
                  Password managed securely via <code className="font-mono text-neon-cyan/60">ADMIN_PASSWORD</code>
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </>
  );
}
