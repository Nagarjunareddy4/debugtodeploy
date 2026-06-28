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
import { cn, usePageTitle } from '../lib/utils';
import { GeneratedLab } from '../lib/generator';
import { isLimitReached, incrementUsage, getRemainingUsage, getLimitMessage } from '../lib/usageLimit';
import { PlanBadge } from '../components/ui/PlanBadge';

const iconMap: Record<string, any> = {
  'Cloud': Cloud,
  'Terminal': Terminal,
  'ShieldCheck': ShieldCheck,
  'Zap': Zap,
  'Flame': Flame,
  'Brain': Brain,
};

export default function LabList() {
  usePageTitle('Cloud Sandbox');
  const navigate = useNavigate();
  const [completedLabsCount, setCompletedLabsCount] = useState(0);
  const [labsData, setLabsData] = useState<GeneratedLab[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    fetchUserData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) fetchUserData();
    });

    const channel = supabase
      .channel('lablist-profile-sync')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles'
      }, (payload) => {
        if (payload.new) {
          setCompletedLabsCount(payload.new.labs_completed || 0);
          setIsPro(payload.new.subscription_status === 'pro');
          if (payload.new.generated_labs) {
            setLabsData(payload.new.generated_labs);
          }
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
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
    <div className="max-w-6xl mx-auto space-y-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-8 border-b border-border">
        <div className="space-y-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-neon-cyan flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-neon-cyan" /> sandbox queue
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Cloud Sandbox</h1>
          <p className="text-text-dim text-sm">Scenario-based labs that fail the way real infrastructure fails.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="clay-sm px-5 py-3 flex items-center gap-4">
            <CheckCircle2 className="w-5 h-5 text-neon-cyan" />
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-text-dim leading-none">Completed</p>
              <p className="text-lg font-bold mt-1">{completedLabsCount} / {labsData.length}</p>
            </div>
          </div>
          <div className="clay-sm px-5 py-3 flex items-center gap-3">
            <PlanBadge status={isPro ? 'pro' : 'free'} size="md" />
            {!isPro && (
              <span className="font-mono text-[10px] uppercase tracking-widest text-text-dim">
                {getRemainingUsage('lab', isPro)} left this week
              </span>
            )}
          </div>
        </div>
      </header>

      {labsData.length === 0 ? (
        <div className="text-center p-12 text-text-dim font-mono text-sm clay-flat">
          No labs found. Please re-login to generate your personalized curriculum.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {labsData.map((lab, index) => {
            const isLockedBySubscription = !isPro && index > 0;
            const isLockedByProgress = index > completedLabsCount;
            const isLocked = isLockedBySubscription || isLockedByProgress;

            const isCompleted = index < completedLabsCount;
            const isNext = index === completedLabsCount && !isLocked;
            const IconComponent = iconMap[lab.icon] || Cloud;

            return (
              <motion.div
                key={lab.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={!isLocked || isLockedBySubscription ? { y: -5 } : {}}
                whileTap={!isLocked || isLockedBySubscription ? { scale: 0.98 } : {}}
                onClick={() => {
                  if (isLockedBySubscription) {
                    navigate('/pricing');
                    return;
                  }
                  if (isLockedByProgress) return;
                  navigate(`/labs/${lab.id}`);
                }}
                className={cn(
                  "group relative bg-surface-2 p-7 flex flex-col clay-sm",
                  isLocked && !isLockedBySubscription ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                  isNext && "ring-1 ring-inset ring-neon-cyan"
                )}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="w-11 h-11 clay-flat flex items-center justify-center text-neon-cyan">
                    <IconComponent className="w-5 h-5" />
                  </div>
                  {isLocked && (
                    <div className="flex items-center gap-2">
                      {isLockedBySubscription && (
                        <span className="font-mono text-[8px] uppercase tracking-widest border border-neon-cyan/40 text-neon-cyan px-1.5 py-0.5">Pro only</span>
                      )}
                      <Lock className="w-4 h-4 text-text-dim" />
                    </div>
                  )}
                  {isCompleted && <CheckCircle2 className="w-5 h-5 text-neon-green" />}
                </div>

                <div className="space-y-2 mb-6 flex-1">
                  <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-text-dim">
                    <span>{lab.difficulty}</span>
                    <span>·</span>
                    <span>+{lab.xp} XP</span>
                  </div>
                  <h3 className="text-xl font-bold leading-snug" style={{ fontFamily: 'var(--font-display)' }}>{lab.title}</h3>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-text-dim">
                    {isLocked ? 'Locked' : isCompleted ? 'Completed' : 'Next up'}
                  </span>
                  {!isLocked && (
                    <ChevronRight className="w-4 h-4 text-text-dim group-hover:text-neon-cyan group-hover:translate-x-0.5 transition-all" />
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
