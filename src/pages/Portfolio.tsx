import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Download, 
  Share2, 
  Cpu, 
  Terminal, 
  Shield, 
  Trophy, 
  Sparkles, 
  Loader2, 
  Check, 
  ExternalLink,
  ChevronRight,
  Globe,
  Briefcase,
  Wrench,
  Lock,
  Star,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateAiResume, ResumeData } from '../lib/generator';
import { cn } from '../lib/utils';

export default function Portfolio() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(data);
      setIsPro(data?.subscription_status === 'pro');
    }
    setLoading(false);
  };

  const handleShare = async () => {
    if (!isPro) {
      alert('Portfolio sharing is a Pro feature. Upgrade to share your technical identity!');
      navigate('/pricing');
      return;
    }
    const shareUrl = `${window.location.origin}/p/${profile.username}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.full_name}'s DevOps Portfolio`,
          text: 'Check out my technical roadmap and labs on DebugToDeploy!',
          url: shareUrl,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!isPro) return;
    window.print();
  };

  const handleGenerateResume = async () => {
    if (!isPro) {
      navigate('/pricing');
      return;
    }
    setGenerating(true);
    const data = await generateAiResume(profile);
    if (data) setResume(data);
    setGenerating(false);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center h-[60vh]">
        <Loader2 className="w-12 h-12 text-soft-blue animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-24">
      {/* Print Styles */}
      <style>{`
        @media print {
          .main-content { padding: 0 !important; }
          .no-print, aside, nav, button, header, .playful-card:not(.resume-view) { 
            display: none !important; 
          }
          .resume-view {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: auto;
            margin: 0;
            padding: 2cm;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: white !important;
            color: black !important;
          }
          body { background: white !important; }
        }
      `}</style>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 no-print">
        <div className="space-y-2">
          <h2 className="text-5xl font-black tracking-tighter">Your DevOps Identity</h2>
          <p className="text-text-dim font-bold uppercase tracking-widest text-xs">Live Portfolio & Career Artifacts</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleShare}
            className={cn(
              "btn-pill border-2 flex items-center gap-2 relative",
              isPro ? "bg-surface border-border text-text-main" : "bg-brand-bg border-dashed border-border text-text-dim opacity-70"
            )}
          >
            <AnimatePresence>
              {copied && (
                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute -top-10 left-1/2 -translate-x-1/2 bg-soft-green text-white text-[10px] px-3 py-1 rounded-full font-black uppercase"
                >
                  Copied!
                </motion.span>
              )}
            </AnimatePresence>
            {isPro ? <Share2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            {copied ? 'Link Copied' : isPro ? 'Share Portfolio' : 'Share (Pro Only)'}
          </button>
          <button 
            onClick={handleGenerateResume}
            disabled={generating}
            className="btn-pill bg-text-main text-surface flex items-center gap-2 shadow-2xl hover:scale-105 transition-all"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : isPro ? <Sparkles className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            {!isPro ? 'Unlock Career Tools' : resume ? 'Regenerate AI Resume' : 'Generate AI Resume'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile Card */}
        <div className="space-y-8 no-print">
          <div className="playful-card p-10 bg-surface border-none shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
              <Cpu className="w-32 h-32" />
            </div>
            
            <div className="relative z-10 flex flex-col items-center text-center space-y-6">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-soft-blue p-1 bg-brand-bg">
                {profile?.avatar_url ? (
                  <img 
                    src={`${profile.avatar_url}${profile.avatar_url.includes('?') ? '&' : '?'}t=${Date.now()}`} 
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
                <p className="text-soft-blue font-mono text-sm">@{profile?.username || 'user'}</p>
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
                  <span className="text-xs font-bold">{profile?.roadmap_data ? (typeof profile.roadmap_data === 'string' ? JSON.parse(profile.roadmap_data).goal : profile.roadmap_data.goal) : 'Aspiring DevOps'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-text-dim" />
                  <span className="text-xs font-bold">debugtodeploy.com/{profile?.username}</span>
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
                  <Check className="w-4 h-4 ml-auto text-soft-green" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: AI Resume View */}
        <div className="lg:col-span-2 space-y-8">
          <AnimatePresence mode="wait">
            {!isPro ? (
              <motion.div
                key="locked"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-brand-bg rounded-[3rem] border-2 border-dashed border-border h-full min-h-[600px] flex flex-col items-center justify-center p-12 text-center space-y-8 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-linear-to-b from-soft-blue/5 to-transparent pointer-events-none" />
                <div className="w-24 h-24 bg-surface rounded-full flex items-center justify-center shadow-2xl relative">
                  <Lock className="w-10 h-10 text-soft-blue" />
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-1 -right-1"
                  >
                    <Star className="w-8 h-8 text-soft-orange fill-soft-orange shadow-xl" />
                  </motion.div>
                </div>
                <div className="space-y-4 max-w-md">
                  <h3 className="text-3xl font-black italic tracking-tight">Unlock AI Career Tools</h3>
                  <p className="text-text-dim font-bold leading-relaxed">
                    Translate your technical progress into a high-impact AI resume. Pro members get unlimited PDF exports and a sharable technical portfolio.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                   <div className="p-4 bg-surface rounded-3xl border border-border text-left">
                     <CheckCircle2 className="w-4 h-4 text-soft-green mb-2" />
                     <p className="text-[9px] font-black uppercase">AI Resume Builder</p>
                   </div>
                   <div className="p-4 bg-surface rounded-3xl border border-border text-left">
                     <CheckCircle2 className="w-4 h-4 text-soft-green mb-2" />
                     <p className="text-[9px] font-black uppercase">PDF Export</p>
                   </div>
                </div>
                <button 
                  onClick={() => navigate('/pricing')}
                  className="btn-pill bg-soft-blue text-white flex items-center gap-3 py-5 px-12 text-lg shadow-2xl hover:scale-105 transition-all font-black italic"
                >
                  UPGRADE TO PRO <ChevronRight className="w-6 h-6" />
                </button>
              </motion.div>
            ) : resume ? (
              <motion.div
                key="resume"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="resume-view bg-white text-slate-900 rounded-[3rem] p-12 md:p-16 shadow-3xl border border-border min-h-[800px] relative font-sans transition-all"
              >
                <div className="absolute top-10 right-10 flex gap-2 no-print">
                   <button 
                     onClick={handleDownload}
                     className="p-3 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-600 shadow-sm flex items-center gap-2 px-6"
                   >
                     <Download className="w-5 h-5" />
                     <span className="text-xs font-black uppercase">Export PDF</span>
                   </button>
                </div>

                <div className="space-y-12">
                  {/* Header */}
                  <div className="border-b-4 border-slate-900 pb-8">
                    <h1 className="text-5xl font-black tracking-tighter uppercase">{profile?.full_name}</h1>
                    <p className="text-xl font-bold text-soft-blue mt-2 uppercase tracking-[0.2em]">
                      {JSON.parse(profile.roadmap_data || '{}').goal || 'DevOps Engineer'}
                    </p>
                  </div>

                  {/* Summary */}
                  <section className="space-y-4">
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-l-4 border-soft-blue pl-4">Professional Summary</h2>
                    <p className="text-lg leading-relaxed font-medium">{resume.summary}</p>
                  </section>

                  {/* Skills */}
                  <section className="space-y-6">
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-l-4 border-soft-blue pl-4">Technical Arsenal</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {resume.technicalSkills.map((cat, i) => (
                        <div key={i} className="space-y-2">
                          <h3 className="font-black text-sm uppercase">{cat.category}</h3>
                          <div className="flex flex-wrap gap-2">
                            {cat.skills.map((s, si) => (
                              <span key={si} className="bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-600">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Experience */}
                  <section className="space-y-6">
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-l-4 border-soft-blue pl-4">Technical Experience</h2>
                    <div className="space-y-8">
                      {resume.experience.map((exp, i) => (
                        <div key={i} className="space-y-3">
                          <div className="flex justify-between items-end">
                            <div>
                              <h3 className="text-xl font-black">{exp.title}</h3>
                              <p className="font-bold text-slate-500">{exp.company}</p>
                            </div>
                            <span className="text-xs font-black text-slate-400 italic">{exp.period}</span>
                          </div>
                          <ul className="space-y-2">
                            {exp.achievements.map((ach, ai) => (
                              <li key={ai} className="flex gap-3 text-sm font-medium leading-relaxed">
                                <span className="text-soft-blue">▹</span> {ach}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Projects */}
                  <section className="space-y-6">
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-l-4 border-soft-blue pl-4">Highlighted Projects</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {resume.projects.map((proj, i) => (
                        <div key={i} className="bg-slate-50 p-6 rounded-3xl space-y-3 border border-slate-100">
                          <h3 className="font-black text-lg">{proj.name}</h3>
                          <p className="text-sm text-slate-600 font-medium">{proj.description}</p>
                          <div className="flex flex-wrap gap-2">
                            {proj.technologies.map((t, ti) => (
                              <span key={ti} className="text-[10px] font-black uppercase text-soft-blue">{t}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-surface rounded-[3rem] border-2 border-dashed border-border h-full min-h-[600px] flex flex-col items-center justify-center p-12 text-center space-y-6"
              >
                <div className="w-24 h-24 bg-brand-bg rounded-full flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-soft-blue animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black">Ready to level up your career?</h3>
                  <p className="text-text-dim max-w-md mx-auto font-bold leading-relaxed">
                    Generate an AI-powered resume that translates your platform progress, completed labs, and XP into professional industry achievements.
                  </p>
                </div>
                <button 
                  onClick={handleGenerateResume}
                  disabled={generating}
                  className="btn-pill bg-text-main text-surface flex items-center gap-3 py-5 px-10 text-lg shadow-2xl hover:scale-105 transition-all"
                >
                  {generating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                  {generating ? 'Engine Synchronizing...' : 'Build My AI Resume'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
