import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Download, 
  Cpu, 
  Terminal, 
  Shield, 
  Sparkles, 
  Loader2, 
  ExternalLink,
  Globe,
  Briefcase,
  Lock,
  Star,
  CheckCircle2,
  ChevronLeft
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

export default function PublicPortfolio() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [resume, setResume] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicData();
  }, [username]);

  const fetchPublicData = async () => {
    if (!username) return;
    setLoading(true);
    setError(null);

    try {
      // Search by username OR by ID (uuid)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(username);
      
      let query = supabase.from('profiles').select('*');
      
      if (isUuid) {
        query = query.eq('id', username);
      } else {
        query = query.ilike('username', username);
      }

      const { data, error: fetchErr } = await query.single();

      if (fetchErr || !data) {
        setError('Portfolio not found or user has disabled public sharing.');
        return;
      }

      if (data) {
        setProfile(data);
        document.title = `${data.full_name || data.username} | Professional Tech Portfolio`;
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
          metaDescription.setAttribute('content', `Explore the professional technical portfolio of ${data.full_name || data.username}.`);
        }
      }
      
      // If user is Pro, they might have generated a resume.
      // The resume is stored inside roadmap_data under the 'ai_resume' key.
      if (data.subscription_status === 'pro' && data.roadmap_data) {
         try {
           const roadmap = typeof data.roadmap_data === 'string' ? JSON.parse(data.roadmap_data) : data.roadmap_data;
           if (roadmap.ai_resume) {
             setResume(roadmap.ai_resume);
           }
         } catch(e) {
           console.error("Failed to parse resume from roadmap_data", e);
         }
      }

    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
        <Loader2 className="w-12 h-12 text-soft-blue animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center shadow-xl">
           <Shield className="w-10 h-10 text-soft-red" />
        </div>
        <div className="space-y-2">
           <h2 className="text-3xl font-black italic">Access Denied</h2>
           <p className="text-text-dim font-bold max-w-md">{error}</p>
        </div>
        <button 
          onClick={() => navigate('/')}
          className="btn-pill bg-text-main text-surface flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Safety
        </button>
      </div>
    );
  }

  const isPro = profile.subscription_status === 'pro';

  return (
    <div className="min-h-screen bg-brand-bg p-6 md:p-12 pb-24">
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-4 py-1.5 bg-soft-blue/10 border border-soft-blue/20 rounded-full w-fit">
             <Globe className="w-3.5 h-3.5 text-soft-blue" />
             <span className="text-[10px] font-black uppercase tracking-widest text-soft-blue">Public Technical Identity</span>
          </div>
          <h2 className="text-5xl font-black tracking-tighter italic">
            {profile.full_name || 'Engineer'}<span className="text-soft-blue">.</span>
          </h2>
        </div>
        <div className="flex gap-4">
           <button 
             onClick={() => window.print()}
             className="btn-pill bg-surface border-2 border-border text-text-main flex items-center gap-2 shadow-xl hover:scale-105 transition-all no-print"
           >
             <Download className="w-4 h-4" /> Export Artifact
           </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile Card */}
        <div className="space-y-8 no-print">
          <div className="playful-card p-10 bg-surface border-none shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Cpu className="w-32 h-32" />
            </div>
            
            <div className="relative z-10 flex flex-col items-center text-center space-y-6">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-soft-blue p-1 bg-brand-bg">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="Avatar" 
                    className="w-full h-full rounded-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-soft-blue/10 flex items-center justify-center">
                    <Terminal className="w-12 h-12 text-soft-blue" />
                  </div>
                )}
              </div>
              
              <div>
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-3xl font-black tracking-tight">{profile?.full_name || 'Engineer'}</h3>
                  {isPro && <Star className="w-5 h-5 text-soft-orange fill-soft-orange" />}
                </div>
                <p className="text-soft-blue font-mono text-sm">@{profile?.username}</p>
              </div>

              <div className="flex gap-4 w-full">
                <div className="flex-1 bg-brand-bg p-4 rounded-3xl border-2 border-border">
                  <p className="text-[10px] font-black uppercase text-text-dim">XP Rank</p>
                  <p className="text-xl font-black">{profile?.xp || 0}</p>
                </div>
                <div className="flex-1 bg-brand-bg p-4 rounded-3xl border-2 border-border">
                  <p className="text-[10px] font-black uppercase text-text-dim">Readiness</p>
                  <p className="text-xl font-black text-soft-green">{profile?.readiness_score || 0}%</p>
                </div>
              </div>

              <div className="w-full text-left space-y-4 pt-4 border-t border-border">
                <div className="flex items-center gap-3">
                  <Briefcase className="w-4 h-4 text-text-dim" />
                  <span className="text-xs font-bold">{profile?.roadmap_data ? (typeof profile.roadmap_data === 'string' ? JSON.parse(profile.roadmap_data).goal : profile.roadmap_data.goal) : 'DevOps Professional'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="playful-card p-8 bg-linear-to-br from-soft-blue to-soft-purple text-white border-none shadow-xl">
            <h4 className="text-lg font-black italic mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" /> Verified Skills
            </h4>
            <div className="space-y-3">
              {['Kubernetes Mastery', 'CI/CD Pipelines', 'Cloud Native Security'].map((skill, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl border border-white/10">
                  <div className="w-2 h-2 bg-soft-green rounded-full shadow-[0_0_10px_var(--color-soft-green)]" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{skill}</span>
                  <CheckCircle2 className="w-4 h-4 ml-auto text-soft-green" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: AI Resume View */}
        <div className="lg:col-span-2 space-y-8">
          <AnimatePresence mode="wait">
            {resume ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="resume-view bg-white text-slate-900 rounded-[3rem] p-12 md:p-16 shadow-3xl border border-border min-h-[800px] relative font-sans"
              >
                <div className="space-y-12">
                  <div className="border-b-4 border-slate-900 pb-8">
                    <h1 className="text-5xl font-black tracking-tighter uppercase">{profile?.full_name}</h1>
                    <p className="text-xl font-bold text-soft-blue mt-2 uppercase tracking-[0.2em]">
                      {resume.title || 'DevOps Engineer'}
                    </p>
                  </div>

                  <section className="space-y-4">
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-l-4 border-soft-blue pl-4">Professional Summary</h2>
                    <p className="text-lg leading-relaxed font-medium">{resume.summary}</p>
                  </section>

                  <section className="space-y-6">
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-l-4 border-soft-blue pl-4">Technical Arsenal</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {resume.technicalSkills?.map((cat: any, i: number) => (
                        <div key={i} className="space-y-2">
                          <h3 className="font-black text-sm uppercase">{cat.category}</h3>
                          <div className="flex flex-wrap gap-2">
                            {cat.skills.map((s: string, si: number) => (
                              <span key={si} className="bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-600">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-6">
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-l-4 border-soft-blue pl-4">Highlighted Projects</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {resume.projects?.map((proj: any, i: number) => (
                        <div key={i} className="bg-slate-50 p-6 rounded-3xl space-y-3 border border-slate-100">
                          <h3 className="font-black text-lg">{proj.name}</h3>
                          <p className="text-sm text-slate-600 font-medium">{proj.description}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </motion.div>
            ) : (
              <div className="bg-surface rounded-[3rem] border-2 border-dashed border-border h-full min-h-[600px] flex flex-col items-center justify-center p-12 text-center space-y-6">
                <div className="w-20 h-20 bg-brand-bg rounded-full flex items-center justify-center shadow-inner">
                  <Sparkles className="w-8 h-8 text-soft-blue opacity-30" />
                </div>
                <div className="space-y-2">
                   <h3 className="text-2xl font-black text-text-dim italic">Work in Progress</h3>
                   <p className="text-text-dim/60 text-xs font-bold uppercase tracking-widest">Achievements are being calculated...</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <footer className="max-w-7xl mx-auto mt-20 text-center space-y-4 no-print">
         <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-text-dim">
            <span className="w-8 h-[1px] bg-border" />
            Verified by DebugToDeploy AI
            <span className="w-8 h-[1px] bg-border" />
         </div>
      </footer>
    </div>
  );
}
