import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Star, Search, Target, Zap } from 'lucide-react';
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

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-3">
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter italic flex items-center gap-4 text-text-main">
            <Trophy className="w-10 h-10 text-neon-orange animate-bounce" /> Global Leaderboard
          </h2>
          <p className="text-text-dim font-bold uppercase tracking-[0.2em] text-[10px]">
            Compete, Learn, and Rise to the Top
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search engineers..."
            className="w-full bg-surface-2 border border-border rounded-full pl-11 pr-4 py-3.5 font-bold text-sm outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan/20 transition-all text-text-main"
          />
        </div>
      </header>

      {users.length === 0 ? (
        <div className="text-center p-16 glass-panel rounded-3xl text-text-dim font-bold">
          No engineers found. Start learning to get on the board!
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end mt-12 mb-16 max-w-4xl mx-auto">
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
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: rankIndex * 0.1, type: 'spring', damping: 15 }}
                  >
                    <Link
                      to={`/p/${user.username || user.id}`}
                      className={cn(
                        "relative flex flex-col items-center p-8 rounded-[2.5rem] border shadow-2xl transition-all group block",
                        isCurrentUser 
                          ? "bg-gradient-to-b from-neon-cyan/15 to-surface-2 border-neon-cyan/60 scale-[1.03] ring-4 ring-neon-cyan/10" 
                          : isFirst 
                          ? "bg-gradient-to-b from-yellow-500/15 to-surface border-yellow-500/30 md:-mt-8 md:mb-8 hover:border-yellow-500/60" 
                          : isSecond 
                          ? "bg-gradient-to-b from-slate-400/15 to-surface border-slate-400/30 hover:border-slate-400/60" 
                          : "bg-gradient-to-b from-orange-400/15 to-surface border-orange-400/30 hover:border-orange-400/60"
                      )}
                    >
                      {/* Rank tag */}
                      <div className={cn(
                        "absolute -top-6 w-12 h-12 rounded-full flex items-center justify-center text-white font-black shadow-lg text-sm",
                        isFirst ? "bg-yellow-500" : isSecond ? "bg-slate-400" : "bg-orange-500"
                      )}>
                        #{rank}
                      </div>

                      {/* Avatar */}
                      <div className="mb-4 relative">
                        <Avatar
                          url={user.avatar_url}
                          className={cn(
                            "rounded-full border-4 shadow-xl object-cover transition-transform duration-300 group-hover:scale-105",
                            isFirst ? "w-24 h-24 border-yellow-500/50" : "w-20 h-20 border-border"
                          )}
                        />
                      </div>

                      {/* Profile Details */}
                      <h3 className="text-xl font-black tracking-tight text-center truncate w-full text-text-main flex flex-col items-center">
                        <span className="truncate max-w-[200px]">{user.full_name || user.username || 'Anonymous'}</span>
                        {isCurrentUser && (
                          <span className="text-[8px] bg-neon-cyan text-[#05080F] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mt-1.5 shadow-md shadow-neon-cyan/20">
                            You
                          </span>
                        )}
                      </h3>
                      
                      <p className="text-xs font-bold text-text-dim mt-2 mb-4 flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-neon-orange" /> Level {user.level || 1}
                      </p>

                      <div className="w-full bg-brand-bg rounded-2xl p-4 flex flex-col items-center gap-1 border border-border/80">
                        <span className="text-[9px] font-black uppercase text-text-dim tracking-widest">Total XP</span>
                        <span className={cn("text-2xl font-black", isFirst ? "text-yellow-500" : "text-text-main")}>
                          {user.xp || 0}
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Rest of the Leaderboard */}
          <div className="glass-panel border border-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden bg-surface/50">
             {/* Table Header */}
             <div className="grid grid-cols-12 gap-4 px-8 py-5 bg-surface-2 border-b border-border text-[9px] font-black uppercase tracking-widest text-text-dim">
                <div className="col-span-2 md:col-span-1 text-center">Rank</div>
                <div className="col-span-6 md:col-span-4">Engineer</div>
                <div className="hidden md:block col-span-2 text-center">Level</div>
                <div className="hidden md:block col-span-2 text-center">Labs</div>
                <div className="hidden md:block col-span-2 text-center">Readiness</div>
                <div className="col-span-4 md:col-span-1 text-right">XP</div>
             </div>

             {/* Table Rows */}
             <div className="flex flex-col divider-y divider-border/50">
               {rest.map((user, idx) => {
                 const rank = idx + 4; // Top 3 podium offset
                 const isCurrentUser = user.id === currentUserId;

                 return (
                   <motion.div
                     key={user.id}
                     initial={{ opacity: 0, y: 10 }}
                     whileInView={{ opacity: 1, y: 0 }}
                     viewport={{ once: true, margin: "-50px" }}
                     transition={{ duration: 0.3 }}
                   >
                     <Link
                       to={`/p/${user.username || user.id}`}
                       className={cn(
                         "grid grid-cols-12 gap-4 px-8 py-5 items-center transition-all group border-b border-border/40",
                         isCurrentUser 
                           ? "bg-neon-cyan/5 border-l-4 border-l-neon-cyan font-semibold" 
                           : "hover:bg-surface-2/60"
                       )}
                     >
                       {/* Rank */}
                       <div className="col-span-2 md:col-span-1 text-center font-black text-text-main text-sm">
                         {rank}
                       </div>

                       {/* User Info (Full viewable for everyone) */}
                       <div className="col-span-6 md:col-span-4 flex items-center gap-3">
                         <Avatar 
                           url={user.avatar_url} 
                           className={cn(
                             "w-9 h-9 rounded-full border shrink-0 object-cover",
                             isCurrentUser ? "border-neon-cyan" : "border-border"
                           )} 
                         />
                         <div className="min-w-0 flex flex-col">
                           <p className="font-bold text-sm text-text-main truncate group-hover:text-neon-cyan transition-colors">
                             {user.full_name || user.username || 'Anonymous'}
                           </p>
                           {isCurrentUser && (
                             <span className="text-[7px] bg-neon-cyan text-[#05080F] px-1.5 py-0.5 rounded font-black uppercase tracking-widest inline-block mt-0.5 self-start">
                               You
                             </span>
                           )}
                         </div>
                       </div>

                       {/* Level */}
                       <div className="hidden md:flex col-span-2 justify-center items-center">
                         <span className="bg-brand-bg border border-border px-3 py-1 rounded-full text-xs font-black text-text-main">
                           Lvl {user.level || 1}
                         </span>
                       </div>

                       {/* Labs Completed */}
                       <div className="hidden md:flex col-span-2 justify-center items-center gap-1.5 text-sm font-bold text-text-main">
                         <Target className="w-4 h-4 text-neon-green" /> {user.labs_completed || 0}
                       </div>

                       {/* Readiness Score Progress Bar */}
                       <div className="hidden md:flex col-span-2 justify-center items-center">
                         <div className="flex items-center gap-2.5 w-full max-w-[90px]">
                           <div className="flex-1 h-1.5 bg-brand-bg border border-border/85 rounded-full overflow-hidden">
                             <div className="h-full bg-neon-green" style={{ width: `${user.readiness_score || 0}%` }} />
                           </div>
                           <span className="text-xs font-bold text-text-main">{user.readiness_score || 0}%</span>
                         </div>
                       </div>

                       {/* XP */}
                       <div className="col-span-4 md:col-span-1 text-right font-black text-neon-orange flex items-center justify-end gap-1.5">
                         <span>{user.xp || 0}</span>
                         <Zap className="w-3.5 h-3.5 text-neon-orange shrink-0" />
                       </div>
                     </Link>
                   </motion.div>
                 );
               })}
               
               {rest.length === 0 && (
                 <div className="p-12 text-center text-text-dim font-bold text-sm">
                    No more engineers on the grid. Build roadmap goals to climb!
                 </div>
               )}
             </div>
          </div>
        </>
      )}
    </div>
  );
}
