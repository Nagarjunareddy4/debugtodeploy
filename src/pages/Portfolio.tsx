import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
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
import { trackEvent } from '../lib/analytics';
import { cn } from '../lib/utils';
import { Avatar } from '../components/ui/Avatar';

export default function Portfolio() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<'modern' | 'classic' | 'cyberpunk' | 'ats'>('modern');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
      
      if (data?.roadmap_data) {
        try {
          const roadmap = typeof data.roadmap_data === 'string' ? JSON.parse(data.roadmap_data) : data.roadmap_data;
          if (roadmap.ai_resume) {
            setResume(roadmap.ai_resume);
          }
          if (roadmap.preferred_template) {
            setSelectedTemplate(roadmap.preferred_template);
          }
        } catch (e) {
          console.error("Failed to parse data from roadmap_data", e);
        }
      }
    }
    setLoading(false);
  };

  const handleShare = async () => {
    if (!isPro) {
      alert('Portfolio sharing is a Pro feature. Upgrade to share your technical identity!');
      navigate('/pricing');
      return;
    }
    const identifier = profile.username || profile.id;
    const shareUrl = `${window.location.origin}/p/${identifier}`;
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
      trackEvent('portfolio_shared', { method: 'native_share', identifier });
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      trackEvent('portfolio_shared', { method: 'clipboard_copy', identifier });
    }
  };

  const handleDownload = () => {
    if (!isPro) return;
    setIsEditing(false); // Ensure edit mode is off for printing
    setTimeout(() => window.print(), 100);
  };

  const saveResume = async () => {
    if (!isPro || !resume) return;
    setIsSaving(true);
    try {
      const roadmap = typeof profile.roadmap_data === 'string' ? JSON.parse(profile.roadmap_data) : profile.roadmap_data;
      const updatedRoadmap = {
        ...roadmap,
        ai_resume: resume,
        preferred_template: selectedTemplate
      };
      
      const { error } = await supabase.from('profiles').update({
        roadmap_data: updatedRoadmap
      }).eq('id', profile.id);

      if (error) throw error;
      toast.success('Resume updated successfully!');
      setIsEditing(false);
    } catch (error: any) {
      toast.error('Failed to save resume: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateResume = async () => {
    if (!isPro) {
      navigate('/pricing');
      return;
    }
    setGenerating(true);
    const data = await generateAiResume(profile);
    if (data) {
      setResume(data);
      
      // Persist to DB inside roadmap_data
      const { data: { user } } = await supabase.auth.getUser();
      if (user && profile) {
        try {
          const currentRoadmap = typeof profile.roadmap_data === 'string' ? JSON.parse(profile.roadmap_data) : (profile.roadmap_data || {});
          const updatedRoadmap = { ...currentRoadmap, ai_resume: data, preferred_template: selectedTemplate };
          await supabase.from('profiles').update({ 
            roadmap_data: updatedRoadmap 
          }).eq('id', user.id);
        } catch (e) {
          console.error("Failed to save resume to DB", e);
        }
      }
    }
    setGenerating(false);
  };

  const updateTemplateChoice = async (template: 'modern' | 'classic' | 'cyberpunk' | 'ats') => {
    setSelectedTemplate(template);
    const { data: { user } } = await supabase.auth.getUser();
    if (user && profile) {
      try {
        const currentRoadmap = typeof profile.roadmap_data === 'string' ? JSON.parse(profile.roadmap_data) : (profile.roadmap_data || {});
        const updatedRoadmap = { ...currentRoadmap, preferred_template: template };
        await supabase.from('profiles').update({ 
          roadmap_data: updatedRoadmap 
        }).eq('id', user.id);
      } catch (e) {
        console.warn("Failed to persist template choice:", e);
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center h-[60vh]">
        <Loader2 className="w-12 h-12 text-soft-blue animate-spin" />
      </div>
    );
  }

  const templates = [
    { id: 'modern', name: 'Modern Minimal', icon: '✨' },
    { id: 'classic', name: 'Executive Pro', icon: '👔' },
    { id: 'cyberpunk', name: 'Cyberpunk Tech', icon: '📟' },
    { id: 'ats', name: 'ATS Optimized', icon: '✅' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } as const }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="max-w-7xl mx-auto space-y-12 pb-24"
    >
      {/* Print Styles */}
      <style>{`
        @media print {
          .main-content { padding: 0 !important; }
          .no-print, aside, nav, button, header, .playful-card:not(.resume-view), .template-selector { 
            display: none !important; 
          }
          .resume-view {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: auto;
            margin: 0;
            padding: 1.5cm;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: white !important;
            color: black !important;
          }
          .template-cyberpunk.resume-view {
             background: #000 !important;
             color: #0ff !important;
          }
          body { background: white !important; }
        }

        .template-classic { font-family: 'Playfair Display', serif; }
        .template-cyberpunk { font-family: 'Fira Code', monospace; }
      `}</style>

      <motion.header variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 no-print">
        <div className="space-y-2">
          <h2 className="text-5xl font-black tracking-tighter">Your DevOps Identity</h2>
          <p className="text-text-dim font-bold uppercase tracking-widest text-xs">Live Portfolio & Career Artifacts</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleShare}
            className={cn(
              "btn-pill border-2 flex items-center gap-2 relative magnetic-float",
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
            className="btn-pill bg-text-main text-surface flex items-center gap-2 shadow-2xl hover:scale-105 transition-all magnetic-float"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : isPro ? <Sparkles className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            {!isPro ? 'Unlock Career Tools' : resume ? 'Regenerate AI Resume' : 'Generate AI Resume'}
          </button>
        </div>
      </motion.header>

      {isPro && resume && (
        <motion.div variants={itemVariants} className="no-print template-selector bg-surface border-4 border-border rounded-[2.5rem] p-4 flex gap-4 overflow-x-auto glass-glow">
          {templates.map(t => (
            <button
              key={t.id}
              onClick={() => updateTemplateChoice(t.id as any)}
              className={cn(
                "flex-1 min-w-[160px] py-3 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                selectedTemplate === t.id 
                  ? "bg-text-main text-surface shadow-xl scale-105" 
                  : "bg-brand-bg text-text-dim hover:bg-border"
              )}
            >
              <span>{t.icon}</span> {t.name}
            </button>
          ))}
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile Card */}
        <div className="space-y-8 no-print">
          <div className={cn(
            "playful-card p-10 bg-surface border-none shadow-2xl relative overflow-hidden group",
            isPro && "holographic-pro border-soft-blue/20"
          )}>
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
              <Cpu className="w-32 h-32" />
            </div>
            
            <div className="relative z-10 flex flex-col items-center text-center space-y-6">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-soft-blue p-1 bg-brand-bg flex items-center justify-center">
                <Avatar 
                  url={profile?.avatar_url ? `${profile.avatar_url}${profile.avatar_url.includes('?') ? '&' : '?'}t=${Date.now()}` : undefined}
                  className="w-full h-full rounded-full"
                />
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
              <Star className="w-5 h-5 text-soft-orange fill-soft-orange" /> Verified Achievements
            </h4>
            <div className="grid grid-cols-2 gap-4">
               {(function() {
                 const roadmapData = typeof profile?.roadmap_data === 'string' 
                   ? JSON.parse(profile.roadmap_data) 
                   : profile?.roadmap_data;
                   
                 const completedTasks = profile?.completed_roadmap_tasks || [];
                 
                 const roadmapBadges = roadmapData?.stages?.map((stage: any, sIdx: number) => {
                   const stageTasks = stage.tasks || [];
                   const isEarned = stageTasks.length > 0 && stageTasks.every((task: any, tIdx: number) => {
                     const taskId = `${stage.id || `stage-${sIdx + 1}`}-task-${tIdx}`;
                     return completedTasks.includes(taskId);
                   });
                   
                   return {
                     name: stage.label,
                     earned: isEarned,
                     date: isEarned ? 'Verified' : 'In Progress'
                   };
                 }) || [];

                 const finalBadges = roadmapBadges.length > 0 
                   ? roadmapBadges
                   : [
                       { name: 'Docker Pilot', earned: (profile?.labs_completed || 0) >= 1, date: '1 Lab' },
                       { name: 'K8s Healer', earned: (profile?.labs_completed || 0) >= 3, date: '3 Labs' },
                       { name: 'Cloud Native', earned: (profile?.labs_completed || 0) >= 5, date: '5 Labs' },
                       { name: 'SRE Master', earned: (profile?.level || 1) >= 5, date: 'Level 5' }
                     ];

                 return finalBadges.map((badge, i) => (
                   <div 
                     key={i} 
                     className={cn(
                       "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all relative overflow-hidden group",
                       badge.earned 
                         ? "bg-brand-bg/50 border-soft-orange/20" 
                         : "bg-brand-bg opacity-30 border-border grayscale"
                     )}
                   >
                      <div className="relative w-10 h-10 flex items-center justify-center drop-shadow-xl">
                         <img 
                           src={(function() {
                             const name = badge.name.toLowerCase();
                             if (name.includes('docker') || name.includes('container')) 
                               return 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Whale/3D/whale_3d.png';
                             if (name.includes('k8s') || name.includes('kubernetes') || name.includes('orchestration'))
                               return 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Steering%20Wheel/3D/steering_wheel_3d.png';
                             if (name.includes('git') || name.includes('version') || name.includes('github') || name.includes('gitlab'))
                               return 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Link/3D/link_3d.png';
                             if (name.includes('monitor') || name.includes('metric') || name.includes('log') || name.includes('grafana') || name.includes('prometheus'))
                               return 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Bar%20Chart/3D/bar_chart_3d.png';
                             if (name.includes('cloud') || name.includes('aws') || name.includes('azure') || name.includes('gcp') || name.includes('infra'))
                               return 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Cloud/3D/cloud_3d.png';
                             if (name.includes('security') || name.includes('protect') || name.includes('vault') || name.includes('auth'))
                               return 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Shield/3D/shield_3d.png';
                             if (name.includes('pipeline') || name.includes('cicd') || name.includes('deploy') || name.includes('action'))
                               return 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Rocket/3D/rocket_3d.png';
                             if (name.includes('network') || name.includes('api') || name.includes('service') || name.includes('dns'))
                               return 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Globe%20with%20Meridians/3D/globe_with_meridians_3d.png';
                             if (name.includes('automate') || name.includes('script') || name.includes('python') || name.includes('bash'))
                               return 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Robot/3D/robot_3d.png';
                             return 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Trophy/3D/trophy_3d.png';
                           })().replace(/ /g, '%20')} 
                           alt={badge.name}
                           onError={(e) => {
                             (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Trophy/3D/trophy_3d.png';
                           }}
                           className="w-full h-full object-contain"
                         />
                      </div>
                      <div className="text-center">
                         <p className="text-[7px] font-black uppercase truncate w-full">{badge.name}</p>
                      </div>
                   </div>
                 ));
               })()}
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
                key={`${resume.summary}-${selectedTemplate}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={cn(
                  "resume-view rounded-[3rem] p-12 md:p-16 shadow-3xl border min-h-[800px] relative transition-all",
                  selectedTemplate === 'modern' && "bg-white text-slate-900 border-border font-sans",
                  selectedTemplate === 'classic' && "template-classic bg-[#fffcf5] text-[#2c1810] border-[#e8dcc4] font-serif",
                  selectedTemplate === 'cyberpunk' && "template-cyberpunk bg-[#050505] text-[#00ffcc] border-[#00ffcc]/30 font-mono shadow-[0_0_50px_rgba(0,255,204,0.1)]",
                  selectedTemplate === 'ats' && "bg-white text-black border-slate-200 font-sans shadow-none rounded-none p-20 border-0"
                )}
              >
                <div className="absolute top-10 right-10 flex gap-2 no-print">
                   <button 
                     onClick={() => setIsEditing(!isEditing)}
                     className={cn(
                       "p-3 rounded-full transition-colors shadow-sm flex items-center gap-2 px-6",
                       isEditing ? "bg-soft-green text-brand-bg font-black" : "bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold"
                     )}
                   >
                     {isEditing ? <Check className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                     <span className="text-xs uppercase">{isEditing ? 'Finish Editing' : 'Edit Resume'}</span>
                   </button>

                   {isEditing ? (
                     <button 
                       onClick={saveResume}
                       disabled={isSaving}
                       className="p-3 bg-text-main text-surface rounded-full transition-colors shadow-sm flex items-center gap-2 px-6 hover:bg-soft-blue"
                     >
                       {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                       <span className="text-xs font-black uppercase">Save to Profile</span>
                     </button>
                   ) : (
                     <button 
                       onClick={handleDownload}
                       className={cn(
                         "p-3 rounded-full transition-colors shadow-sm flex items-center gap-2 px-6",
                         selectedTemplate === 'cyberpunk' ? "bg-[#00ffcc] text-black hover:bg-[#00ccaa]" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                       )}
                     >
                       <Download className="w-5 h-5" />
                       <span className="text-xs font-black uppercase">Export PDF</span>
                     </button>
                   )}
                </div>

                <div className="space-y-12">
                   {isEditing && (
                     <div className="bg-soft-orange/10 border-2 border-soft-orange/30 p-4 rounded-2xl text-[10px] font-black text-soft-orange uppercase tracking-widest no-print text-center">
                       🛠️ Edit Mode Active: Click on any text below to modify it.
                     </div>
                   )}
                  {/* Header */}
                  <div className={cn(
                    "border-b-4 pb-8",
                    selectedTemplate === 'modern' && "border-slate-900",
                    selectedTemplate === 'classic' && "border-[#2c1810] text-center",
                    selectedTemplate === 'cyberpunk' && "border-[#00ffcc] shadow-[0_10px_20px_-10px_rgba(0,255,204,0.3)]"
                  )}>
                    <h1 className={cn(
                      "text-5xl font-black tracking-tighter uppercase outline-none",
                      selectedTemplate === 'cyberpunk' && "text-transparent bg-linear-to-r from-[#00ffcc] to-[#ff00ff] bg-clip-text",
                      isEditing && "bg-slate-50 border-2 border-dashed border-soft-blue/30 px-4 rounded-2xl"
                    )}
                    contentEditable={isEditing}
                    suppressContentEditableWarning={true}
                    onBlur={(e) => setProfile({ ...profile, full_name: e.currentTarget.textContent || '' })}
                    >{profile?.full_name}</h1>
                    <p className={cn(
                      "text-xl font-bold mt-2 uppercase tracking-[0.2em] outline-none",
                      selectedTemplate === 'modern' && "text-soft-blue",
                      selectedTemplate === 'classic' && "text-[#8b4513] italic",
                      selectedTemplate === 'cyberpunk' && "text-[#ff00ff]",
                      selectedTemplate === 'ats' && "text-slate-600 font-black",
                      isEditing && "bg-slate-50 border-2 border-dashed border-soft-blue/30 px-4 rounded-2xl"
                    )}
                    contentEditable={isEditing}
                    suppressContentEditableWarning={true}
                    onBlur={(e) => setResume({ ...resume, summary: e.currentTarget.textContent || '' })}
                    >
                      {resume.title || (typeof profile.roadmap_data === 'string' ? JSON.parse(profile.roadmap_data || '{}').goal : profile.roadmap_data?.goal) || 'DevOps Engineer'}
                    </p>
                    {selectedTemplate === 'cyberpunk' && (
                       <div className="flex gap-4 mt-4 text-[10px]">
                         <span className="border border-[#00ffcc]/50 px-2 py-0.5">UID: {profile.id.slice(0,8)}</span>
                         <span className="border border-[#00ffcc]/50 px-2 py-0.5">STATUS: VERIFIED</span>
                         <span className="border border-[#ff00ff]/50 px-2 py-0.5">LEVEL: {profile.level}</span>
                       </div>
                    )}
                  </div>

                  {/* Summary */}
                  <section className="space-y-4">
                    <h2 className={cn(
                      "text-xs font-black uppercase tracking-widest border-l-4 pl-4",
                      selectedTemplate === 'modern' && "text-slate-400 border-soft-blue",
                      selectedTemplate === 'classic' && "text-[#8b4513] border-[#8b4513]",
                      selectedTemplate === 'cyberpunk' && "text-[#00ffcc] border-[#ff00ff]",
                      selectedTemplate === 'ats' && "text-slate-900 border-slate-900"
                    )}>Professional Summary</h2>
                    <p 
                      contentEditable={isEditing}
                      onBlur={(e) => setResume({ ...resume, summary: e.currentTarget.textContent || '' })}
                      suppressContentEditableWarning={true}
                      className={cn(
                        "text-lg leading-relaxed font-medium outline-none transition-all",
                        isEditing && "bg-slate-50 border-2 border-dashed border-soft-blue/30 p-4 rounded-2xl",
                        selectedTemplate === 'cyberpunk' && "text-[#00ffcc]/80"
                      )}
                    >{resume.summary}</p>
                  </section>

                  {/* Skills */}
                  <section className="space-y-6">
                    <h2 className={cn(
                      "text-xs font-black uppercase tracking-widest border-l-4 pl-4",
                      selectedTemplate === 'modern' && "text-slate-400 border-soft-blue",
                      selectedTemplate === 'classic' && "text-[#8b4513] border-[#8b4513]",
                      selectedTemplate === 'cyberpunk' && "text-[#00ffcc] border-[#ff00ff]",
                      selectedTemplate === 'ats' && "text-slate-900 border-slate-900"
                    )}>Technical Arsenal</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {resume.technicalSkills.map((cat, i) => (
                        <div key={i} className="space-y-2">
                          <h3 className="font-black text-sm uppercase">{cat.category}</h3>
                          <div className="flex flex-wrap gap-2">
                            {cat.skills.map((s, si) => (
                              <span key={si} className={cn(
                                "px-3 py-1 rounded-full text-xs font-bold",
                                selectedTemplate === 'modern' && "bg-slate-100 text-slate-600",
                                selectedTemplate === 'classic' && "bg-[#e8dcc4] text-[#2c1810]",
                                selectedTemplate === 'cyberpunk' && "border border-[#00ffcc]/30 text-[#00ffcc] hover:bg-[#00ffcc]/10",
                                selectedTemplate === 'ats' && "bg-white border border-slate-200 text-slate-900"
                              )}>
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
                    <h2 className={cn(
                      "text-xs font-black uppercase tracking-widest border-l-4 pl-4",
                      selectedTemplate === 'modern' && "text-slate-400 border-soft-blue",
                      selectedTemplate === 'classic' && "text-[#8b4513] border-[#8b4513]",
                      selectedTemplate === 'cyberpunk' && "text-[#00ffcc] border-[#ff00ff]",
                      selectedTemplate === 'ats' && "text-slate-900 border-slate-900"
                    )}>Technical Experience</h2>
                    <div className="space-y-8">
                      {resume.experience.map((exp, i) => (
                        <div key={i} className="space-y-3">
                          <div className="flex justify-between items-end">
                            <div className="outline-none" 
                                 contentEditable={isEditing} 
                                 suppressContentEditableWarning={true}
                                 onBlur={(e) => {
                                   const newExp = [...resume.experience];
                                   newExp[i].title = e.currentTarget.querySelector('h3')?.textContent || '';
                                   newExp[i].company = e.currentTarget.querySelector('p')?.textContent || '';
                                   setResume({ ...resume, experience: newExp });
                                 }}>
                              <h3 className="text-xl font-black">{exp.title}</h3>
                              <p className={cn(
                                "font-bold",
                                selectedTemplate === 'modern' && "text-slate-500",
                                selectedTemplate === 'classic' && "text-[#8b4513]",
                                selectedTemplate === 'cyberpunk' && "text-[#ff00ff]",
                                selectedTemplate === 'ats' && "text-slate-700"
                              )}>{exp.company}</p>
                            </div>
                            <span 
                              contentEditable={isEditing}
                              suppressContentEditableWarning={true}
                              onBlur={(e) => {
                                const newExp = [...resume.experience];
                                newExp[i].period = e.currentTarget.textContent || '';
                                setResume({ ...resume, experience: newExp });
                              }}
                              className="text-xs font-black text-slate-400 italic outline-none"
                            >{exp.period}</span>
                          </div>
                          <ul className="space-y-2 list-disc pl-5">
                            {exp.achievements.map((ach, ai) => (
                              <li key={ai} className="group">
                                <span 
                                  contentEditable={isEditing}
                                  suppressContentEditableWarning={true}
                                  onBlur={(e) => {
                                    const newExp = [...resume.experience];
                                    newExp[i].achievements[ai] = e.currentTarget.textContent || '';
                                    setResume({ ...resume, experience: newExp });
                                  }}
                                  className={cn(
                                    "text-sm font-medium leading-relaxed outline-none block w-full",
                                    isEditing && "hover:bg-slate-50 p-1 rounded border-2 border-dashed border-transparent hover:border-soft-blue/20"
                                  )}
                                >{ach}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Projects */}
                  <section className="space-y-6">
                    <h2 className={cn(
                      "text-xs font-black uppercase tracking-widest border-l-4 pl-4",
                      selectedTemplate === 'modern' && "text-slate-400 border-soft-blue",
                      selectedTemplate === 'classic' && "text-[#8b4513] border-[#8b4513]",
                      selectedTemplate === 'cyberpunk' && "text-[#00ffcc] border-[#ff00ff]",
                      selectedTemplate === 'ats' && "text-slate-900 border-slate-900"
                    )}>Highlighted Projects</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {resume.projects.map((proj, i) => (
                        <div key={i} className={cn(
                          "p-6 rounded-3xl space-y-3 border transition-all outline-none",
                          selectedTemplate === 'modern' && "bg-slate-50 border-slate-100",
                          selectedTemplate === 'classic' && "bg-[#e8dcc4]/20 border-[#e8dcc4]",
                          selectedTemplate === 'cyberpunk' && "bg-black border-[#00ffcc]/20 hover:border-[#ff00ff]/40",
                          selectedTemplate === 'ats' && "bg-white border-slate-200 shadow-none rounded-none border-l-4 border-l-black",
                          isEditing && "ring-2 ring-soft-blue ring-offset-2"
                        )}
                        contentEditable={isEditing}
                        suppressContentEditableWarning={true}
                        onBlur={(e) => {
                          const newProj = [...resume.projects];
                          newProj[i].name = e.currentTarget.querySelector('h3')?.textContent || '';
                          newProj[i].description = e.currentTarget.querySelector('p')?.textContent || '';
                          setResume({ ...resume, projects: newProj });
                        }}
                        >
                          <h3 className="font-black text-lg">{proj.name}</h3>
                          <p className="text-sm font-medium opacity-80">{proj.description}</p>
                          <div className="flex flex-wrap gap-2">
                            {proj.technologies.map((t, ti) => (
                              <span key={ti} className={cn(
                                "text-[10px] font-black uppercase",
                                selectedTemplate === 'modern' && "text-soft-blue",
                                selectedTemplate === 'classic' && "text-[#8b4513]",
                                selectedTemplate === 'cyberpunk' && "text-[#ff00ff]",
                                selectedTemplate === 'ats' && "text-slate-900 font-bold"
                              )}>{t}</span>
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
      </motion.div>
    </motion.div>
  );
}
