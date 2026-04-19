import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Award, Cloud, ShieldCheck, Zap, Terminal, ExternalLink, Loader2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateUserCertificates, GeneratedCertificate } from '../lib/generator';
import { cn, getObjectHash } from '../lib/utils';
import { isLimitReached, incrementUsage, getLimitMessage } from '../lib/usageLimit';

const iconMap: Record<string, any> = {
  Cloud,
  Award,
  ShieldCheck,
  Zap,
  Terminal,
};

export default function Certificates() {
  const [certificates, setCertificates] = useState<GeneratedCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUser(user);

      const { data: profile } = await supabase.from('profiles').select('roadmap_data, generated_certificates, roadmap_hash').eq('id', user.id).single();
      
      if (profile) {
        if (profile.generated_certificates && profile.generated_certificates.length > 0) {
          setCertificates(profile.generated_certificates);
          setLoading(false);
        } else {
          // Trigger generation
          generateCertificates(user.id, profile.roadmap_data, profile);
        }
      } else {
        setLoading(false);
      }
    };
    init();
  }, []);

  const generateCertificates = async (userId: string, roadmapData: any, profileData?: any) => {
    // Certificates are unlimited, no limit check needed
    setGenerating(true);
    try {
      const apiKey = (window as any).OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key not configured.');
      }

      let roadmapGoal = "Senior DevOps Engineer";
      let experienceLevel = "intermediate";

      if (roadmapData) {
        try {
          const parsed = typeof roadmapData === 'string' ? JSON.parse(roadmapData) : roadmapData;
          roadmapGoal = parsed.goal || parsed.title || roadmapGoal;
          experienceLevel = parsed.experience || (typeof parsed.description === 'string' && parsed.description.toLowerCase().includes('beginner') ? 'beginner' : 'advanced');
        } catch (e) {
          // ignore parsing error
        }
      }

      const roadmapHash = profileData?.roadmap_hash || (roadmapData ? await getObjectHash(typeof roadmapData === 'string' ? JSON.parse(roadmapData) : roadmapData) : undefined);
      const generated = await generateUserCertificates(apiKey, userId, roadmapGoal, experienceLevel, roadmapHash);
      if (generated) {
        setCertificates(generated);
        incrementUsage('certificates');
      } else {
        throw new Error("Failed to generate certificates.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  const handleManualRegenerate = () => {
    if (user) {
      // Refetching roadmap data and profile:
      supabase.from('profiles').select('roadmap_data, roadmap_hash').eq('id', user.id).single().then(({ data }) => {
        generateCertificates(user.id, data?.roadmap_data, data);
      });
    }
  };

  if (loading || generating) {
    return (
      <div className="flex h-full min-h-[60vh] flex-col items-center justify-center space-y-6">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Award className="w-16 h-16 text-soft-purple opacity-50" />
        </motion.div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black italic tracking-tighter flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-soft-orange animate-pulse" />
            Generating Recommended Certifications...
          </h2>
          <p className="text-text-dim font-bold text-sm uppercase tracking-widest">
            Analyzing your roadmap goal
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="space-y-4">
          <h2 className="text-5xl font-black tracking-tighter">Certifications</h2>
          <p className="text-text-dim font-bold uppercase tracking-widest text-sm flex items-center gap-2">
            <Award className="w-4 h-4 text-soft-purple" /> Recommended based on your roadmap
          </p>
        </div>
        <button 
          onClick={handleManualRegenerate}
          disabled={generating}
          className="btn-pill bg-brand-bg border-2 border-border text-text-dim px-6 py-2 flex items-center gap-2 hover:border-text-main transition-colors text-xs font-black uppercase tracking-widest"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh Recommendations
        </button>
      </header>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-soft-red/10 border-2 border-soft-red/30 rounded-3xl text-soft-red font-bold text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence>
          {certificates.map((cert, index) => {
            const IconComponent = iconMap[cert.icon] || Award;
            return (
              <motion.div
                key={cert.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="playful-card flex flex-col group hover:scale-[1.02] transition-transform bg-surface shadow-xl border-none relative overflow-hidden"
              >
                {/* Decorative background circle */}
                <div className={cn("absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-10 blur-2xl", `bg-${cert.color}`)} />
                
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg", `bg-${cert.color}/10 text-${cert.color}`)}>
                  <IconComponent className="w-7 h-7" />
                </div>
                
                <h3 className="text-2xl font-black tracking-tight mb-3 leading-snug">{cert.title}</h3>
                
                <p className="text-text-dim font-bold text-sm leading-relaxed mb-8 flex-1">
                  {cert.description}
                </p>
                
                <div className="mt-auto space-y-6">
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-dim">Estimated Price</span>
                    <span className={cn("font-black text-lg", `text-${cert.color}`)}>{cert.price}</span>
                  </div>
                  
                  <a 
                    href={cert.officialUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 bg-text-main text-surface py-3 rounded-full font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-md"
                  >
                    View Official Site <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {certificates.length === 0 && !loading && !error && (
        <div className="text-center py-24 space-y-4">
          <Award className="w-16 h-16 text-border mx-auto" />
          <h3 className="text-xl font-black">No certificates found</h3>
          <p className="text-text-dim font-bold text-sm">Update your Roadmap to generate new certification recommendations.</p>
        </div>
      )}
    </div>
  );
}


