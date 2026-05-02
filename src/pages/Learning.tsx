import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Book,
  Globe,
  Link as LinkIcon,
  FileText,
  Compass,
  ExternalLink,
  Sparkles,
  Search,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn, getObjectHash } from '../lib/utils';
import { GeneratedDoc, generateUserDocs } from '../lib/generator';
import { updateReadinessScore } from '../lib/readiness';
import { isLimitReached, incrementUsage, getLimitMessage } from '../lib/usageLimit';

const iconMap: Record<string, any> = {
  'Book': Book,
  'Globe': Globe,
  'Link': LinkIcon,
  'FileText': FileText,
  'Compass': Compass,
};

export default function Learning() {
  const [docs, setDocs] = useState<GeneratedDoc[]>([]);
  const [readDocs, setReadDocs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetchDocs();

    // Real-time subscription to profile changes
    const channel = supabase
      .channel('learning-profile-sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        if (payload.new) {
          if (payload.new.generated_docs) {
            setDocs(payload.new.generated_docs);
          }
          if (payload.new.read_docs_ids) {
            setReadDocs(payload.new.read_docs_ids);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchDocs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (prof) {
      setProfile(prof);
      setReadDocs(prof.read_docs_ids || []);
      if (prof.generated_docs) {
        setDocs(prof.generated_docs);
      }
    }
    setLoading(false);
  };

  const handleGenerate = async () => {
    if (!profile) return;

    // Docs are unlimited, no limit check needed

    setIsGenerating(true);

    // Get roadmap goal from JSON or string
    const roadmap = profile.roadmap_data ? JSON.parse(profile.roadmap_data) : {};
    const goal = roadmap.goal || roadmap.title || 'DevOps Engineering';
    const experience = roadmap.experience || 'intermediate';

    const roadmapHash = profile.roadmap_hash || await getObjectHash(roadmap);
    const newDocs = await generateUserDocs(profile.id, goal, roadmapHash);

    if (newDocs) {
      setDocs(newDocs);
      incrementUsage('docs');
    }
    setIsGenerating(false);
  };

  const markAsRead = async (docId: string, url: string) => {
    if (!profile || readDocs.includes(docId)) {
      window.open(url, '_blank');
      return;
    }

    const newReadDocs = [...readDocs, docId];
    setReadDocs(newReadDocs);

    // Update DB
    await supabase.from('profiles').update({
      read_docs_ids: newReadDocs
    }).eq('id', profile.id);

    // Update readiness score
    await updateReadinessScore(profile.id);

    // Open URL
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-soft-blue animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-12">
      <header className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="space-y-4">
          <h2 className="text-5xl font-black tracking-tighter italic flex items-center gap-4">
            Library
            <Sparkles className="w-8 h-8 text-soft-blue" />
          </h2>
          <p className="text-text-dim font-bold uppercase tracking-[0.2em] text-xs">AI-Curated Documentation & Resources</p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="btn-pill bg-text-main text-surface flex items-center gap-2 px-8 py-4 disabled:opacity-50"
        >
          {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {docs.length > 0 ? 'REGENERATE RESOURCES' : 'GENERATE LEARNING PATH'}
        </button>
      </header>

      {docs.length === 0 && !isGenerating ? (
        <div className="playful-card p-12 text-center space-y-6 bg-surface border-none shadow-2xl">
          <div className="w-20 h-20 bg-soft-blue/10 rounded-full flex items-center justify-center mx-auto">
            <Book className="w-10 h-10 text-soft-blue" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black">Your personalized library is empty</h3>
            <p className="text-text-dim font-bold">Click the button above to generate resources based on your roadmap goal.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {docs.map((doc, index) => {
              const IconComponent = iconMap[doc.icon] || Book;
              const isRead = readDocs.includes(doc.id);

              return (
                <motion.div
                  key={doc.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => markAsRead(doc.id, doc.url)}
                  className={cn(
                    "playful-card group border-none shadow-2xl bg-surface cursor-pointer hover:scale-[1.03] transition-all relative overflow-hidden",
                    isRead && "opacity-80"
                  )}
                >
                  {isRead && (
                    <div className="absolute top-4 right-4 text-soft-green z-10 bg-surface rounded-full p-1 shadow-sm">
                      <CheckCircle2 className="w-5 h-5 fill-soft-green/10" />
                    </div>
                  )}

                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg",
                    `bg-${doc.color || 'soft-blue'}/10 text-${doc.color || 'soft-blue'}`
                  )}>
                    <IconComponent className="w-8 h-8" />
                  </div>

                  <div className="space-y-3">
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
                      `bg-${doc.color || 'soft-blue'}/10 text-${doc.color || 'soft-blue'}`
                    )}>
                      {doc.category}
                    </span>
                    <h3 className="text-xl font-black tracking-tight group-hover:text-soft-blue transition-colors">{doc.title}</h3>
                    <p className="text-text-dim text-sm font-bold leading-relaxed line-clamp-2">
                      {doc.description}
                    </p>
                  </div>

                  <div className="mt-8 pt-6 border-t border-border flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-dim flex items-center gap-2">
                      Official Doc <ExternalLink className="w-3 h-3" />
                    </span>
                    <span className="text-soft-blue font-black text-xs group-hover:translate-x-1 transition-transform">
                      KNOW MORE →
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {docs.length > 0 && (
        <div className="playful-card p-6 bg-brand-bg/50 border-2 border-border border-dashed flex items-center gap-4">
          <div className="w-10 h-10 bg-soft-orange/10 rounded-full flex items-center justify-center text-soft-orange">
            <Sparkles className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-text-dim">
            <span className="text-text-main">Tip:</span> Reading official documentation increases your **Readiness Score**.
            Each new resource you explore brings you closer to being job-ready!
          </p>
        </div>
      )}
    </div>
  );
}
