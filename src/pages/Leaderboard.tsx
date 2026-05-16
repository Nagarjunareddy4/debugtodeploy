import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Medal, Crown, Star, TrendingUp, Users, Search, Target, Zap, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn, usePageTitle } from '../lib/utils';
import { Avatar } from '../components/ui/Avatar';

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  xp: number;
  level: number;
  labs_completed: number;
  readiness_score: number;
}

export default function Leaderboard() {
  usePageTitle('Leaderboard');
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      // Fetch top 50 users based on XP
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, xp, level, labs_completed, readiness_score')
        .order('xp', { ascending: false })
        .limit(50);

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const term = searchQuery.toLowerCase();
    const name = u.full_name || '';
    const username = u.username || '';
    return name.toLowerCase().includes(term) || username.toLowerCase().includes(term);
  });

  const top3 = filteredUsers.slice(0, 3);
  const rest = filteredUsers.slice(3);

  if (loading) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="space-y-4">
          <h2 className="text-5xl font-black tracking-tighter italic flex items-center gap-4">
            <Trophy className="w-10 h-10 text-soft-orange" /> Global Leaderboard
          </h2>
          <p className="text-text-dim font-bold uppercase tracking-[0.2em] text-xs">
            Compete, Learn, and Rise to the Top
          </p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search engineers..."
            className="w-full bg-brand-bg border-2 border-border rounded-full pl-10 pr-4 py-3 font-bold text-sm outline-none focus:border-soft-blue transition-colors"
          />
        </div>
      </header>

      {users.length === 0 ? (
        <div className="text-center p-12 text-text-dim font-bold">
          No engineers found. Start learning to get on the board!
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end mt-12 mb-16 px-4 md:px-12">
              {[1, 0, 2].map((rankIndex) => {
                const user = top3[rankIndex];
                if (!user) return <div key={rankIndex} className="hidden md:block" />;
                
                const isFirst = rankIndex === 0;
                const isSecond = rankIndex === 1;
                const isThird = rankIndex === 2;
                const rank = rankIndex + 1;
                const isCurrentUser = user.id === currentUserId;

                return (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: rankIndex * 0.1, type: 'spring' }}
                  >
                    {/* Podium card — clickable only for own profile */}
                    <div
                      onClick={() => isCurrentUser && window.location.assign(`/p/${user.username || user.id}`)}
                      className={cn(
                        "relative flex flex-col items-center p-6 rounded-[2rem] border-4 shadow-2xl transition-transform block",
                        isCurrentUser ? "hover:scale-105 cursor-pointer" : "cursor-default",
                        isFirst ? "bg-gradient-to-b from-yellow-500/20 to-surface border-yellow-500/50 md:-mt-8 md:mb-8" :
                        isSecond ? "bg-gradient-to-b from-slate-300/20 to-surface border-slate-300/50" :
                        "bg-gradient-to-b from-orange-400/20 to-surface border-orange-400/50"
                      )}
                    >
                      <div className={cn(
                        "absolute -top-6 w-12 h-12 rounded-full flex items-center justify-center text-white font-black shadow-lg",
                        isFirst ? "bg-yellow-500" : isSecond ? "bg-slate-400" : "bg-orange-500"
                      )}>
                        #{rank}
                      </div>
                      {isFirst && <Crown className="absolute -top-14 w-8 h-8 text-yellow-500" />}

                      {/* Blurred avatar for others */}
                      <div className={cn("mb-4 relative", !isCurrentUser && "pointer-events-none")}>
                        <Avatar
                          url={user.avatar_url}
                          className={cn(
                            "rounded-full border-4 shadow-xl",
                            isFirst ? "w-24 h-24 border-yellow-500" : "w-20 h-20 border-surface",
                            !isCurrentUser && "blur-sm"
                          )}
                        />
                        {!isCurrentUser && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Lock className="w-5 h-5 text-text-dim" />
                          </div>
                        )}
                      </div>

                      <h3 className="text-xl font-black tracking-tight text-center truncate w-full">
                        {isCurrentUser ? (user.full_name || user.username || 'Anonymous') : 'Hidden'}
                        {isCurrentUser && <span className="block text-[8px] text-soft-blue font-black uppercase tracking-widest mt-0.5">You</span>}
                      </h3>
                      <p className="text-xs font-bold text-text-dim mt-1 mb-4 flex items-center gap-1">
                        <Star className="w-3 h-3 text-soft-orange" /> Level {user.level || 1}
                      </p>

                      <div className="w-full bg-brand-bg rounded-xl p-3 flex flex-col items-center gap-1 border border-border">
                        <span className="text-[10px] font-black uppercase text-text-dim tracking-widest">Total XP</span>
                        <span className={cn("text-2xl font-black", isFirst ? "text-yellow-500" : "text-text-main")}>{user.xp || 0}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Rest of the Leaderboard */}
          <div className="playful-card p-0 border-none bg-surface shadow-2xl overflow-hidden">
             <div className="grid grid-cols-12 gap-4 px-8 py-4 bg-brand-bg border-b-2 border-border text-[10px] font-black uppercase tracking-widest text-text-dim">
                <div className="col-span-1 text-center">Rank</div>
                <div className="col-span-5 md:col-span-4">Engineer</div>
                <div className="hidden md:block col-span-2 text-center">Level</div>
                <div className="hidden md:block col-span-2 text-center">Labs</div>
                <div className="hidden md:block col-span-2 text-center">Readiness</div>
                <div className="col-span-6 md:col-span-1 text-right">XP</div>
             </div>

             <div className="flex flex-col">
               {rest.map((user, idx) => {
                 const rank = idx + 4; // Because top 3 are skipped
                 const isCurrentUser = user.id === currentUserId;

                 return (
                   <motion.div
                     key={user.id}
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                   >
                     {/* Row — only own row is a real link */}
                     {isCurrentUser ? (
                       <Link
                         to={`/p/${user.username || user.id}`}
                         className={cn(
                           "grid grid-cols-12 gap-4 px-8 py-4 border-b border-border/50 items-center transition-colors hover:bg-soft-blue/5 group cursor-pointer",
                           "bg-soft-blue/5 border-l-4 border-l-soft-blue"
                         )}
                       >
                         <div className="col-span-1 text-center font-black text-text-dim">{rank}</div>
                         <div className="col-span-5 md:col-span-4 flex items-center gap-3">
                           <Avatar url={user.avatar_url} className="w-8 h-8 rounded-full border border-border shrink-0" />
                           <div className="min-w-0">
                             <p className="font-bold text-sm truncate group-hover:text-soft-blue transition-colors">
                               {user.full_name || user.username || 'Anonymous'}
                             </p>
                             <span className="text-[8px] bg-soft-blue text-white px-1.5 py-0.5 rounded-sm font-black uppercase inline-block mt-0.5">You</span>
                           </div>
                         </div>
                         <div className="hidden md:flex col-span-2 justify-center items-center">
                           <span className="bg-surface border-2 border-border px-3 py-1 rounded-full text-xs font-black">{user.level || 1}</span>
                         </div>
                         <div className="hidden md:flex col-span-2 justify-center items-center gap-1 text-sm font-bold text-text-dim">
                           <Target className="w-3.5 h-3.5" /> {user.labs_completed || 0}
                         </div>
                         <div className="hidden md:flex col-span-2 justify-center items-center">
                           <div className="flex items-center gap-2 w-full max-w-[80px]">
                             <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                               <div className="h-full bg-soft-green" style={{ width: `${user.readiness_score || 0}%` }} />
                             </div>
                             <span className="text-xs font-bold text-text-dim">{user.readiness_score || 0}%</span>
                           </div>
                         </div>
                         <div className="col-span-6 md:col-span-1 text-right font-black text-soft-orange flex items-center justify-end gap-1">
                           {user.xp || 0} <Zap className="w-3 h-3 hidden md:block" />
                         </div>
                       </Link>
                     ) : (
                       /* Other users — no link, blurred name/avatar, stats visible */
                       <div
                         className="grid grid-cols-12 gap-4 px-8 py-4 border-b border-border/50 items-center cursor-default select-none"
                       >
                         <div className="col-span-1 text-center font-black text-text-dim">{rank}</div>
                         <div className="col-span-5 md:col-span-4 flex items-center gap-3">
                           <div className="relative shrink-0">
                             <Avatar url={user.avatar_url} className="w-8 h-8 rounded-full border border-border blur-sm" />
                             <Lock className="w-3 h-3 text-text-dim absolute inset-0 m-auto" />
                           </div>
                           <p className="font-bold text-sm truncate text-text-dim blur-sm select-none">••••••••</p>
                         </div>
                         <div className="hidden md:flex col-span-2 justify-center items-center">
                           <span className="bg-surface border-2 border-border px-3 py-1 rounded-full text-xs font-black">{user.level || 1}</span>
                         </div>
                         <div className="hidden md:flex col-span-2 justify-center items-center gap-1 text-sm font-bold text-text-dim">
                           <Target className="w-3.5 h-3.5" /> {user.labs_completed || 0}
                         </div>
                         <div className="hidden md:flex col-span-2 justify-center items-center">
                           <div className="flex items-center gap-2 w-full max-w-[80px]">
                             <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                               <div className="h-full bg-soft-green" style={{ width: `${user.readiness_score || 0}%` }} />
                             </div>
                             <span className="text-xs font-bold text-text-dim">{user.readiness_score || 0}%</span>
                           </div>
                         </div>
                         <div className="col-span-6 md:col-span-1 text-right font-black text-soft-orange flex items-center justify-end gap-1">
                           {user.xp || 0} <Zap className="w-3 h-3 hidden md:block" />
                         </div>
                       </div>
                     )}
                   </motion.div>
                 );
               })}
               
               {rest.length === 0 && (
                 <div className="p-8 text-center text-text-dim font-bold text-sm">
                    No more engineers to show.
                 </div>
               )}
             </div>
          </div>
        </>
      )}
    </div>
  );
}
