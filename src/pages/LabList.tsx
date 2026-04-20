import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Terminal, 
  Lock, 
  CheckCircle2, 
  ChevronRight, 
  Zap, 
  Cloud, 
  ShieldCheck,
  Flame,
  Brain
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { GeneratedLab } from '../lib/generator';
import { isLimitReached, incrementUsage, getRemainingUsage, getLimitMessage } from '../lib/usageLimit';

// Map string icon names from AI to actual lucide-react components
const iconMap: Record<string, any> = {
  'Cloud': Cloud,
  'Terminal': Terminal,
  'ShieldCheck': ShieldCheck,
  'Zap': Zap,
  'Flame': Flame,
  'Brain': Brain,
};

export default function LabList() {
  const navigate = useNavigate();
  const [completedLabsCount, setCompletedLabsCount] = useState(0);
  const [labsData, setLabsData] = useState<GeneratedLab[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('labs_completed, generated_labs, subscription_status').eq('id', user.id).single();
      if (data) {
        setCompletedLabsCount(data.labs_completed || 0);
        setIsPro(data.subscription_status === 'pro');
        if (data.generated_labs) {
          setLabsData(data.generated_labs);
        }
      }
    }
    setLoading(false);
  };

  if (loading) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <header className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="space-y-4">
          <h2 className="text-5xl font-black tracking-tighter italic">Cloud Sandbox</h2>
          <p className="text-text-dim font-bold uppercase tracking-[0.2em] text-xs">Scenario-based hands-on learning</p>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="playful-card py-4 px-8 bg-surface border-none shadow-xl flex items-center gap-4">
             <div className="w-10 h-10 bg-soft-blue/20 rounded-full flex items-center justify-center text-soft-blue">
                <CheckCircle2 className="w-6 h-6" />
             </div>
             <div>
                <span className="text-[10px] font-black uppercase text-text-dim leading-none">Completed</span>
                <p className="text-xl font-black">{completedLabsCount} / {labsData.length}</p>
             </div>
          </div>
          {!isPro && (
            <div className="text-[10px] font-black uppercase tracking-widest text-soft-orange bg-soft-orange/10 px-4 py-2 rounded-full border border-soft-orange/20">
              {getRemainingUsage('lab', isPro)} lab generations left this week
            </div>
          )}
        </div>
      </header>

      {labsData.length === 0 ? (
        <div className="text-center p-12 text-text-dim font-bold">
           No labs found. Please re-login to generate your personalized curriculum.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {labsData.map((lab, index) => {
            // Free users can ONLY access the first lab (index 0).
            // All other labs are locked regardless of progress.
            const isLockedBySubscription = !isPro && index > 0;
            const isLockedByProgress = index > completedLabsCount;
            const isLocked = isLockedBySubscription || isLockedByProgress;
            
            const isCompleted = index < completedLabsCount;
            const isNext = index === completedLabsCount && !isLocked;
            const IconComponent = iconMap[lab.icon] || Cloud;

            return (
              <motion.div
                key={lab.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => {
                  if (isLockedBySubscription) {
                    alert('Upgrade to Pro to unlock the full curriculum and all remaining labs!');
                    navigate('/pricing');
                    return;
                  }
                  if (isLockedByProgress) return;
                  
                  // Unlimited access to allowed lab
                  navigate(`/labs/${lab.id}`);
                }}
                className={cn(
                  "playful-card group border-none shadow-2xl relative transition-all",
                  isLocked ? "bg-brand-bg opacity-40 grayscale cursor-not-allowed" : "bg-surface cursor-pointer hover:scale-[1.03]",
                  isNext && "border-4 border-soft-blue ring-8 ring-soft-blue/10 ring-offset-4 ring-offset-brand-bg",
                  isLockedBySubscription && "hover:grayscale-0 transition-all cursor-pointer" // Allow clicking for upgrade
                )}
              >
                {isLocked && (
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    {isLockedBySubscription && (
                      <span className="text-[8px] font-black bg-soft-orange text-white px-2 py-0.5 rounded-full shadow-lg">PRO ONLY</span>
                    )}
                    <Lock className="w-5 h-5 text-text-dim" />
                  </div>
                )}
                {isCompleted && (
                  <div className="absolute top-4 right-4 text-soft-green">
                    <CheckCircle2 className="w-6 h-6 fill-soft-green/20" />
                  </div>
                )}

                <div className={cn("w-20 h-20 rounded-[2rem] flex items-center justify-center mb-8 shadow-xl", `bg-${lab.color} text-white`)}>
                  <IconComponent className="w-10 h-10" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[9px] font-black uppercase tracking-widest py-1 px-3 rounded-full", `bg-${lab.color}/10 text-${lab.color}`)}>
                      {lab.difficulty}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-text-dim">+ {lab.xp} XP</span>
                  </div>
                  <h3 className="text-2xl font-black tracking-tighter">{lab.title}</h3>
                </div>

                <div className="mt-8 pt-6 border-t border-border flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-text-dim">
                    {isLocked ? 'Locked' : isCompleted ? 'Completed' : 'Next Up'}
                  </span>
                  {!isLocked && (
                    <button className="p-3 bg-text-main text-surface rounded-2xl shadow-xl group-hover:bg-soft-blue transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
