import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
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
  Monitor
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { LogoFull } from '../ui/Logo';

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
  { icon: Terminal, label: 'Cloud Labs', path: '/labs' },
  { icon: MessageSquare, label: 'Interviews', path: '/interviews' },
  { icon: CreditCard, label: 'Pro Access', path: '/pricing' },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const { mode, setMode } = useTheme();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchProfile(session.user.id);
    });
  }, []);

  const fetchProfile = async (id: string) => {
    // Get both the profile row AND auth metadata in parallel
    const [{ data }, { data: { user } }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.auth.getUser(),
    ]);

    // Auth Display name fallback
    const authName =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.user_metadata?.display_name ||
      '';

    if (data) {
      // Patch the DB if full_name is empty
      if (!data.full_name && authName) {
        await supabase.from('profiles').update({ full_name: authName }).eq('id', id);
        data.full_name = authName;
      }
      setProfile(data);
    } else if (user) {
      // Fallback: build from auth metadata
      setProfile({ full_name: authName, email: user.email, subscription_status: 'free' });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const displayName = profile?.full_name || profile?.username || profile?.email?.split('@')[0] || 'Engineer';
  const displayNameShort = displayName.split(' ')[0];

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-50 p-4 bg-text-main text-surface rounded-full shadow-2xl transition-all active:scale-95"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {isOpen && (
        <div 
          className="fixed inset-0 bg-text-main/20 backdrop-blur-xs z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-72 bg-surface border-r border-border p-8 flex flex-col gap-12 transition-all duration-300 ease-in-out",
        !isOpen && "-translate-x-full lg:translate-x-0 shadow-none",
        isOpen && "translate-x-0 shadow-2xl lg:shadow-none",
        "lg:sticky lg:h-screen"
      )}>
        <LogoFull />

        <nav className="flex flex-col gap-3">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                cn(
                  "nav-pill group",
                  isActive && "nav-pill-active"
                )
              }
            >
              <item.icon className={cn("w-5 h-5", "group-hover:scale-110 transition-transform")} />
              <span className="font-black text-sm uppercase tracking-widest">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-4 relative">
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
                {profile.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="Profile" 
                    className="w-14 h-14 rounded-full object-cover border-2 border-soft-blue" 
                    referrerPolicy="no-referrer" 
                  />
                ) : (
                  <div className="w-14 h-14 bg-brand-bg rounded-full flex items-center justify-center border-2 border-border">
                    <UserIcon className="w-7 h-7 text-text-dim" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-black text-sm truncate">{displayName}</p>
                  <p className="text-[10px] font-bold text-soft-blue uppercase tracking-widest">DevOps Lvl {profile.level || 1}</p>
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
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt="Profile" 
                className="w-7 h-7 rounded-full object-cover border-2 border-surface shadow-sm" 
                referrerPolicy="no-referrer" 
              />
            ) : (
              <div className="w-7 h-7 bg-brand-bg rounded-full flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-text-dim" />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest leading-none truncate">
                {displayNameShort}
              </span>
              <span className="text-[8px] font-black text-soft-blue mt-1 uppercase">DevOps Lvl {profile?.level || 1}</span>
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
    </>
  );
}
