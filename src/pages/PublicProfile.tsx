import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Trophy, 
  Star, 
  Flame, 
  CheckCircle2, 
  Map, 
  Cpu, 
  Globe, 
  Terminal,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { cn, useMeta } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { Avatar } from '../components/ui/Avatar';
import { LogoFull } from '../components/ui/Logo';

export default function PublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useMeta(
    profile ? `${profile.full_name}'s Engineering Portfolio` : 'Public Portfolio',
    profile ? `Check out ${profile.full_name}'s technical roadmap, certified labs, and engineering achievements on DebugToDeploy.` : 'Explore professional DevOps portfolios.',
    profile?.avatar_url
  );

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      // Try to find by username first, then by ID
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', id)
        .single();

      if (error || !data) {
        const { data: byId, error: idError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();
        data = byId;
        if (idError) throw new Error('Profile not found');
      }

      setProfile(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center gap-4">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="w-12 h-12 text-soft-blue" />
        </motion.div>
        <p className="text-[10px] font-black uppercase tracking-widest text-text-dim animate-pulse">Decrypting Identity...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-soft-red/10 rounded-full flex items-center justify-center text-soft-red">
          <Globe className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-3xl font-black italic tracking-tight">Signal Lost</h2>
          <p className="text-text-dim font-bold mt-2">The engineering profile you are looking for does not exist or has been privatized.</p>
        </div>
        <button 
          onClick={() => navigate('/')}
          className="btn-pill bg-text-main text-surface px-8 py-3 text-xs uppercase tracking-widest font-black"
        >
          Back to Fleet
        </button>
      </div>
    );
  }

  const roadmap = typeof profile.roadmap_data === 'string' ? JSON.parse(profile.roadmap_data) : (profile.roadmap_data || {});
  const isPro = profile.subscription_status === 'pro';

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Public Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-md border-b border-border px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <LogoFull />
          <button 
            onClick={() => navigate('/auth')}
            className="text-[10px] font-black uppercase tracking-widest text-soft-blue border-2 border-soft-blue/20 px-6 py-2 rounded-full hover:bg-soft-blue hover:text-white transition-all"
          >
            Create Your Portfolio
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto pt-32 pb-24 px-6 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar: Identity Card */}
          <div className="space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "playful-card p-10 bg-surface border-none shadow-2xl relative overflow-hidden group",
                isPro && "holographic-pro border-soft-blue/20"
              )}
            >
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Cpu className="w-32 h-32" />
              </div>
              
              <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                <div className="w-36 h-36 rounded-full overflow-hidden border-6 border-soft-blue p-1 bg-brand-bg relative">
                  <Avatar 
                    url={profile.avatar_url}
                    className="w-full h-full rounded-full"
                  />
                  {isPro && (
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-soft-orange rounded-full flex items-center justify-center text-white border-4 border-surface shadow-xl">
                      <Star className="w-4 h-4 fill-current" />
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="text-3xl font-black tracking-tighter">{profile.full_name}</h3>
                  <p className="text-soft-blue font-mono text-sm">@{profile.username || 'user'}</p>
                </div>

                <div className="flex gap-4 w-full">
                  <div className="flex-1 bg-brand-bg p-4 rounded-3xl border-2 border-border">
                    <p className="text-[10px] font-black uppercase text-text-dim">Level</p>
                    <p className="text-xl font-black">{profile.level || 1}</p>
                  </div>
                  <div className="flex-1 bg-brand-bg p-4 rounded-3xl border-2 border-border">
                    <p className="text-[10px] font-black uppercase text-text-dim">Readiness</p>
                    <p className="text-xl font-black text-soft-green">{profile.readiness_score || 0}%</p>
                  </div>
                </div>

                <div className="w-full text-left space-y-4 pt-6 border-t border-border">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-soft-blue" />
                    <span className="text-xs font-bold uppercase tracking-widest">{roadmap.goal || 'DevOps Engineer'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Flame className="w-4 h-4 text-soft-orange" />
                    <span className="text-xs font-bold uppercase tracking-widest">{profile.streak || 0} Day Streak</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Verification Badge Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="playful-card bg-text-main text-surface border-none shadow-xl p-8"
            >
              <h4 className="text-lg font-black italic mb-6 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-soft-orange" /> Career Milestones
              </h4>
              <div className="grid grid-cols-2 gap-4">
                 {[
                   { icon: '🐳', label: 'Docker' },
                   { icon: '☸️', label: 'K8s' },
                   { icon: '☁️', label: 'Cloud' },
                   { icon: '⚡', label: 'CI/CD' }
                 ].map((m, i) => (
                   <div key={i} className="bg-surface/10 p-3 rounded-2xl flex flex-col items-center gap-1 border border-surface/10">
                      <span className="text-xl">{m.icon}</span>
                      <span className="text-[8px] font-black uppercase tracking-widest opacity-60">{m.label}</span>
                   </div>
                 ))}
              </div>
            </motion.div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-12">
            {/* Roadmap Progress */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="playful-card bg-surface border-none shadow-2xl p-10 space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <Map className="w-6 h-6 text-soft-blue" />
                   <h3 className="text-2xl font-black italic">Active Growth Path</h3>
                </div>
                <span className="text-[10px] font-black uppercase bg-soft-blue/10 text-soft-blue px-4 py-1.5 rounded-full border border-soft-blue/20">
                   {roadmap.title || 'Engineering Roadmap'}
                </span>
              </div>
              
              <div className="relative pl-10 space-y-8">
                <div className="absolute left-[15px] top-4 bottom-4 w-1 bg-soft-blue/20" />
                {roadmap.stages?.slice(0, 3).map((stage: any, idx: number) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[35px] top-1 w-6 h-6 rounded-lg bg-soft-blue flex items-center justify-center text-white shadow-lg shadow-soft-blue/20">
                       <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="space-y-2">
                       <h4 className="font-black text-lg">{stage.label}</h4>
                       <p className="text-sm font-bold text-text-dim leading-relaxed">{stage.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-4 flex justify-end">
                 <p className="text-[10px] font-black uppercase tracking-widest text-text-dim italic">
                    Showing first 3 stages · Total {roadmap.stages?.length || 0} stages
                 </p>
              </div>
            </motion.div>

            {/* Completed Labs */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-6"
            >
               <div className="flex items-center gap-3">
                  <Terminal className="w-6 h-6 text-soft-green" />
                  <h3 className="text-2xl font-black italic">Certified Labs</h3>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(profile.generated_labs || []).slice(0, profile.labs_completed || 0).map((lab: any, i: number) => (
                    <div key={i} className="playful-card bg-surface border-none shadow-xl p-6 group hover:scale-[1.02] transition-transform">
                       <div className="flex items-center justify-between mb-4">
                          <span className={cn("text-[9px] font-black uppercase px-2 py-1 rounded-md", `bg-${lab.color}/10 text-${lab.color}`)}>
                             {lab.difficulty}
                          </span>
                          <CheckCircle2 className="w-5 h-5 text-soft-green" />
                       </div>
                       <h4 className="font-black text-lg mb-2">{lab.title}</h4>
                       <p className="text-[10px] font-bold text-text-dim leading-relaxed line-clamp-2">Successfully debugged and deployed in the DebugToDeploy practice arena.</p>
                    </div>
                  ))}
                  {(!profile.labs_completed || profile.labs_completed === 0) && (
                    <div className="col-span-full py-12 border-4 border-dashed border-border rounded-3xl flex flex-col items-center justify-center text-center px-8">
                       <Sparkles className="w-12 h-12 text-border mb-4" />
                       <p className="text-text-dim font-bold italic text-lg">No labs certified yet. Commander is currently synchronizing skills.</p>
                    </div>
                  )}
               </div>
            </motion.div>

            {/* CTA for Visitors */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="playful-card bg-linear-to-br from-soft-blue to-soft-purple text-white border-none shadow-2xl p-12 text-center space-y-8 relative overflow-hidden"
            >
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
               <div className="relative z-10 space-y-4">
                  <h3 className="text-4xl font-black tracking-tighter italic">Ready to Level Up?</h3>
                  <p className="text-lg font-bold opacity-90 max-w-xl mx-auto">
                    Join {profile.full_name.split(' ')[0]} and 5,000+ other engineers building the future of DevOps.
                  </p>
               </div>
               <button 
                 onClick={() => navigate('/auth')}
                 className="relative z-10 bg-white text-soft-blue px-12 py-5 rounded-full font-black text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 mx-auto"
               >
                 Start Your Journey <ArrowRight className="w-6 h-6" />
               </button>
            </motion.div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-12 px-8 text-center bg-surface/50">
        <p className="text-[10px] font-black uppercase tracking-widest text-text-dim">
           Verified Engineering Portfolio · Secured by DebugToDeploy
        </p>
      </footer>
    </div>
  );
}
