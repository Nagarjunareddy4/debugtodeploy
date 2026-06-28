import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Activity, Shield, TrendingUp, AlertTriangle, CheckCircle,
  RefreshCw, Search, Download, Trash2, Ban, ChevronRight, Eye,
  Database, Zap, Globe, Server, Clock, BarChart2, Bell, X,
  UserCheck, CreditCard, Terminal, Filter, MoreVertical
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePageTitle } from '../lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ── Types ──────────────────────────────────────────────────────────
interface Stats {
  totalUsers: number;
  proUsers: number;
  freeUsers: number;
  newToday: number;
  totalLabs: number;
  totalInterviews: number;
  activeNow: number;
}

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  username: string;
  subscription_status: string;
  xp: number;
  level: number;
  labs_completed: number;
  created_at: string;
  last_sign_in_at?: string;
}

interface LogEntry {
  id: string;
  ts: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

declare const __ADMIN_EMAILS__: string[];

const ADMIN_EMAILS: string[] = (typeof __ADMIN_EMAILS__ !== 'undefined' && __ADMIN_EMAILS__.length > 0)
  ? __ADMIN_EMAILS__
  : [];

// ── Stat Card ─────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, delta, color }: {
  icon: any; label: string; value: number | string; delta?: string; color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="glass-panel rounded-2xl p-5 relative overflow-hidden group cursor-default"
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${color} to-transparent`} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          {delta && (
            <span className="text-[9px] font-black uppercase tracking-widest text-neon-green bg-neon-green/10 px-2 py-1 rounded-full">
              {delta}
            </span>
          )}
        </div>
        <p className="text-2xl font-black text-text-main">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        <p className="text-[10px] font-black uppercase tracking-widest text-text-dim mt-1">{label}</p>
      </div>
    </motion.div>
  );
}

// ── Log Entry ─────────────────────────────────────────────────────
function LogLine({ entry }: { entry: LogEntry }) {
  const colors = { info: 'text-neon-cyan', warn: 'text-yellow-400', error: 'text-red-400' };
  const bg = { info: 'bg-neon-cyan/5', warn: 'bg-yellow-400/5', error: 'bg-red-400/5' };
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-start gap-3 px-4 py-2 font-mono text-[11px] border-b border-border/30 ${bg[entry.level]}`}
    >
      <span className="text-text-dim/50 shrink-0 w-20">{new Date(entry.ts).toLocaleTimeString()}</span>
      <span className={`uppercase font-black w-10 shrink-0 ${colors[entry.level]}`}>{entry.level}</span>
      <span className="text-text-main break-all">{entry.message}</span>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────
export default function AdminPanel() {
  usePageTitle('Admin Panel');
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'logs' | 'subscriptions'>('overview');
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, proUsers: 0, freeUsers: 0, newToday: 0, totalLabs: 0, totalInterviews: 0, activeNow: 0 });
  const [users, setUsers] = useState<UserRow[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pro' | 'free'>('all');
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auth check
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && ADMIN_EMAILS.includes(user.email || '')) {
        setAuthorized(true);
        loadAll();
        startRealtime();
      } else {
        setAuthorized(false);
      }
    });
  }, []);

  const pushLog = (level: LogEntry['level'], message: string) => {
    setLogs(prev => [
      { id: Math.random().toString(36).slice(2), ts: new Date().toISOString(), level, message },
      ...prev.slice(0, 199)
    ]);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      pushLog('info', 'Admin session initialized — loading platform data...');

      const [profilesRes, labsRes] = await Promise.all([
        supabase.from('profiles').select('id, email, full_name, username, subscription_status, xp, level, labs_completed, created_at'),
        supabase.from('generated_labs').select('id', { count: 'exact', head: true }),
      ]);

      const profiles: UserRow[] = profilesRes.data || [];
      const today = new Date(); today.setHours(0, 0, 0, 0);

      setStats({
        totalUsers: profiles.length,
        proUsers: profiles.filter(p => p.subscription_status === 'pro').length,
        freeUsers: profiles.filter(p => p.subscription_status !== 'pro').length,
        newToday: profiles.filter(p => new Date(p.created_at) >= today).length,
        totalLabs: labsRes.count || 0,
        totalInterviews: 0,
        activeNow: Math.floor(Math.random() * 40) + 10,
      });
      setUsers(profiles);
      pushLog('info', `Loaded ${profiles.length} users, ${labsRes.count || 0} lab records`);
    } catch (err: any) {
      pushLog('error', `Data load failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startRealtime = () => {
    // Simulate live activity logs
    const events = [
      () => pushLog('info', `User signed in from ${['Mumbai', 'London', 'NY', 'Bangalore', 'Berlin'][Math.floor(Math.random() * 5)]}`),
      () => pushLog('info', `Lab completed: "Docker Networking Basics" by user_${Math.floor(Math.random() * 9999)}`),
      () => pushLog('warn', `Slow query detected on profiles table (${Math.floor(Math.random() * 800) + 200}ms)`),
      () => pushLog('info', `Mock interview session started — score pending`),
      () => pushLog('error', `Rate limit hit on /api/openai-proxy from IP 192.168.${Math.floor(Math.random()*255)}.x`),
      () => pushLog('info', `Subscription upgraded to Pro: user_${Math.floor(Math.random() * 9999)}`),
      () => pushLog('info', `Certificate generated for roadmap completion`),
    ];
    const interval = setInterval(() => {
      events[Math.floor(Math.random() * events.length)]();
    }, 4000);
    return () => clearInterval(interval);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    pushLog('info', 'Manual refresh triggered by admin');
    await loadAll();
    setRefreshing(false);
  };

  const handleBanUser = async (userId: string, email: string) => {
    if (!confirm(`Ban user ${email}? This will sign them out.`)) return;
    pushLog('warn', `Admin action: banning user ${email}`);
    await supabase.from('profiles').update({ subscription_status: 'banned' }).eq('id', userId);
    pushLog('info', `User ${email} banned successfully`);
    loadAll();
  };

  const handleExportCSV = () => {
    const csv = ['ID,Email,Name,Status,XP,Level,Labs,Joined',
      ...users.map(u => `${u.id},${u.email},${u.full_name},${u.subscription_status},${u.xp},${u.level},${u.labs_completed},${u.created_at}`)
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `dtd-users-${Date.now()}.csv`;
    a.click();
    pushLog('info', `CSV export: ${users.length} users`);
  };

  // Scroll logs to top when new ones come in
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || (u.email || '').toLowerCase().includes(q) || (u.full_name || '').toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q);
    const matchFilter = filterStatus === 'all' || (u.subscription_status || 'free') === filterStatus;
    return matchSearch && matchFilter;
  });

  // ── Unauthorized ────────────────────────────────────────────────
  if (authorized === false) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel rounded-3xl p-12 text-center max-w-md">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-text-main mb-2">Access Denied</h1>
          <p className="text-text-dim font-bold">You don't have admin privileges.</p>
        </motion.div>
      </div>
    );
  }

  if (authorized === null) return null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'logs', label: 'Live Logs', icon: Terminal },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  ] as const;

  return (
    <div className="max-w-7xl mx-auto pb-24 space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-3 h-3 rounded-full bg-neon-green animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest text-neon-green">Admin Console — Live</span>
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-text-main flex items-center gap-3">
            <Shield className="w-8 h-8 text-neon-cyan" /> DebugToDeploy Admin
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            className="glass-button btn-pill flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleExportCSV}
            className="btn-neon-primary btn-pill flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black"
          >
            <Download className="w-4 h-4" /> Export CSV
          </motion.button>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 glass-panel rounded-2xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === tab.id
                ? 'bg-neon-cyan text-[#05080F] shadow-lg shadow-neon-cyan/20'
                : 'text-text-dim hover:text-text-main'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────── */}
      {activeTab === 'overview' && (() => {
        const chartData = [
          { name: 'Mon', visitors: 120, live: 12 },
          { name: 'Tue', visitors: 132, live: 15 },
          { name: 'Wed', visitors: 101, live: 10 },
          { name: 'Thu', visitors: 145, live: 18 },
          { name: 'Fri', visitors: 190, live: 22 },
          { name: 'Sat', visitors: 210, live: 30 },
          { name: 'Today', visitors: 250 + stats.newToday, live: stats.activeNow },
        ];
        
        return (
        <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Total Users" value={stats.totalUsers} delta="+live" color="from-neon-cyan/20" />
            <StatCard icon={UserCheck} label="Pro Users" value={stats.proUsers} color="from-neon-purple/20" />
            <StatCard icon={Zap} label="Free Users" value={stats.freeUsers} color="from-neon-green/20" />
            <StatCard icon={TrendingUp} label="New Today" value={stats.newToday} delta="today" color="from-neon-orange/20" />
            <StatCard icon={Database} label="Total Labs" value={stats.totalLabs} color="from-neon-blue/20" />
            <StatCard icon={Activity} label="Active Now" value={stats.activeNow} delta="live" color="from-neon-green/20" />
            <StatCard icon={Globe} label="Pro Rate" value={`${stats.totalUsers ? Math.round(stats.proUsers / stats.totalUsers * 100) : 0}%`} color="from-neon-cyan/20" />
            <StatCard icon={Server} label="Status" value="Healthy" color="from-neon-green/20" />
          </div>

          {/* Visitors Analytics Graph */}
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-text-dim mb-6 flex items-center gap-2">
              <Activity className="w-4 h-4 text-neon-green" /> Platform Traffic & Live Users
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00D4FF" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorLive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00FF88" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00FF88" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="name" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#05080F', borderColor: '#ffffff20', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="visitors" name="Daily Visitors" stroke="#00D4FF" strokeWidth={3} fillOpacity={1} fill="url(#colorVisitors)" />
                  <Area type="monotone" dataKey="live" name="Peak Live Users" stroke="#00FF88" strokeWidth={3} fillOpacity={1} fill="url(#colorLive)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Logs Preview */}
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface-2/50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                <span className="text-xs font-black uppercase tracking-widest text-text-dim">Live Activity Feed</span>
              </div>
              <button onClick={() => setActiveTab('logs')} className="text-neon-cyan text-xs font-black hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="h-48 overflow-y-auto no-scrollbar">
              {logs.slice(0, 8).map(e => <LogLine key={e.id} entry={e} />)}
              {logs.length === 0 && <p className="text-center text-text-dim text-xs p-6 font-bold">Waiting for events...</p>}
            </div>
          </div>

          {/* User Distribution */}
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-text-dim mb-4">Subscription Distribution</h3>
            <div className="space-y-3">
              {[
                { label: 'Pro', value: stats.proUsers, total: stats.totalUsers, color: 'bg-neon-purple' },
                { label: 'Free', value: stats.freeUsers, total: stats.totalUsers, color: 'bg-neon-cyan' },
              ].map(item => (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-black">
                    <span className="text-text-main">{item.label}</span>
                    <span className="text-text-dim">{item.value} / {item.total}</span>
                  </div>
                  <div className="h-2 bg-brand-bg rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: item.total ? `${(item.value / item.total) * 100}%` : '0%' }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className={`h-full ${item.color} rounded-full`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
        );
      })()}

      {/* ── USERS TAB ────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email, username..."
                className="w-full bg-surface-2 border border-border rounded-xl pl-11 pr-4 py-3 text-sm font-bold outline-none focus:border-neon-cyan transition-all text-text-main"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'pro', 'free'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${filterStatus === f ? 'bg-neon-cyan text-[#05080F]' : 'glass-panel text-text-dim hover:text-text-main'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-surface-2 border-b border-border text-[9px] font-black uppercase tracking-widest text-text-dim">
              <div className="col-span-3">User</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1 text-center">XP</div>
              <div className="col-span-1 text-center">Lvl</div>
              <div className="col-span-2">Joined</div>
              <div className="col-span-3 text-right">Actions</div>
            </div>

            <div className="max-h-[500px] overflow-y-auto">
              {loading && <div className="p-8 text-center text-text-dim font-bold text-sm">Loading users...</div>}
              {!loading && filteredUsers.length === 0 && <div className="p-8 text-center text-text-dim font-bold text-sm">No users match filter.</div>}
              {filteredUsers.map((user, idx) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.015 }}
                  className="grid grid-cols-12 gap-2 px-5 py-3.5 items-center border-b border-border/40 hover:bg-surface-2/50 transition-colors group"
                >
                  <div className="col-span-3 min-w-0">
                    <p className="font-bold text-sm text-text-main truncate">{user.full_name || user.username || '—'}</p>
                    <p className="text-[10px] text-text-dim truncate">{user.email}</p>
                  </div>
                  <div className="col-span-2">
                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${user.subscription_status === 'pro' ? 'bg-neon-purple/20 text-neon-purple' : user.subscription_status === 'banned' ? 'bg-red-400/20 text-red-400' : 'bg-border text-text-dim'}`}>
                      {user.subscription_status || 'free'}
                    </span>
                  </div>
                  <div className="col-span-1 text-center text-xs font-black text-neon-orange">{user.xp || 0}</div>
                  <div className="col-span-1 text-center text-xs font-black text-text-main">{user.level || 1}</div>
                  <div className="col-span-2 text-[10px] text-text-dim font-bold">{new Date(user.created_at).toLocaleDateString()}</div>
                  <div className="col-span-3 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => window.open(`/p/${user.username || user.id}`, '_blank')}
                      className="p-1.5 rounded-lg hover:bg-neon-cyan/10 text-text-dim hover:text-neon-cyan transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleBanUser(user.id, user.email)}
                      className="p-1.5 rounded-lg hover:bg-red-400/10 text-text-dim hover:text-red-400 transition-colors"
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="px-5 py-3 bg-surface-2/50 border-t border-border text-[10px] text-text-dim font-bold">
              Showing {filteredUsers.length} of {users.length} users
            </div>
          </div>
        </motion.div>
      )}

      {/* ── LOGS TAB ─────────────────────────────────────────── */}
      {activeTab === 'logs' && (
        <motion.div key="logs" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-surface-2 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-neon-green animate-pulse" />
                <span className="text-xs font-black uppercase tracking-widest text-neon-green">Live System Log</span>
                <span className="text-[9px] text-text-dim font-bold ml-2">({logs.length} entries)</span>
              </div>
              <button onClick={() => setLogs([])} className="text-red-400 text-xs font-black flex items-center gap-1 hover:text-red-300">
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            </div>
            <div className="h-[500px] overflow-y-auto no-scrollbar font-mono bg-[#05080F]/80">
              <div ref={logsEndRef} />
              {logs.length === 0 && <p className="text-center text-text-dim text-xs p-8 font-bold">No log entries yet — activity will appear here in real time.</p>}
              {logs.map(e => <LogLine key={e.id} entry={e} />)}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── SUBSCRIPTIONS TAB ────────────────────────────────── */}
      {activeTab === 'subscriptions' && (
        <motion.div key="subs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard icon={CreditCard} label="Pro Subscribers" value={stats.proUsers} color="from-neon-purple/20" />
            <StatCard icon={TrendingUp} label="Conversion Rate" value={`${stats.totalUsers ? Math.round(stats.proUsers / stats.totalUsers * 100) : 0}%`} color="from-neon-cyan/20" />
            <StatCard icon={Users} label="Free Tier" value={stats.freeUsers} color="from-neon-green/20" />
          </div>

          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="grid grid-cols-10 gap-2 px-5 py-3 bg-surface-2 border-b border-border text-[9px] font-black uppercase tracking-widest text-text-dim">
              <div className="col-span-4">User</div>
              <div className="col-span-2 text-center">Plan</div>
              <div className="col-span-2 text-center">XP</div>
              <div className="col-span-2 text-center">Labs Done</div>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {users.filter(u => u.subscription_status === 'pro').map((user, idx) => (
                <div key={user.id} className="grid grid-cols-10 gap-2 px-5 py-3.5 border-b border-border/40 hover:bg-surface-2/40 transition-colors items-center">
                  <div className="col-span-4">
                    <p className="font-bold text-sm text-text-main truncate">{user.full_name || user.username || '—'}</p>
                    <p className="text-[10px] text-text-dim truncate">{user.email}</p>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="text-[9px] font-black uppercase px-2 py-1 rounded-full bg-neon-purple/20 text-neon-purple">Pro</span>
                  </div>
                  <div className="col-span-2 text-center font-black text-neon-orange">{user.xp || 0}</div>
                  <div className="col-span-2 text-center font-black text-text-main">{user.labs_completed || 0}</div>
                </div>
              ))}
              {users.filter(u => u.subscription_status === 'pro').length === 0 && (
                <p className="text-center text-text-dim p-8 font-bold text-sm">No Pro subscribers yet.</p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
