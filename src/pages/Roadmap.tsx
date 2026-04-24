import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Compass, Sparkles, CheckCircle2, Loader2, ChevronRight, Zap, Target, BookOpen, RefreshCw, Lock } from 'lucide-react';
import { cn, getObjectHash } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { isLimitReached, incrementUsage, getRemainingUsage, getLimitMessage } from '../lib/usageLimit';
import { updateReadinessScore } from '../lib/readiness';
import { generateUserDocs, generateUserCertificates, generateUserCurriculum } from '../lib/generator';

interface RoadmapStage {
  id: string;
  label: string;
  description: string;
  tasks: {
    label: string;
    url: string;
  }[];
}

interface RoadmapData {
  title: string;
  goal: string;
  experience: string;
  description: string;
  stages: RoadmapStage[];
}

export default function Roadmap() {
  const location = useLocation();
  const navigate = useNavigate();
  const hasTriggeredRef = useRef(false);

  const [experience, setExperience] = useState('beginner');
  const [goal, setGoal] = useState('Senior DevOps Engineer');
  const [loading, setLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [hasExistingRoadmap, setHasExistingRoadmap] = useState(false);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [serverLimitBlocked, setServerLimitBlocked] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: prof } = await supabase.from('profiles').select('subscription_status, roadmap_data, completed_roadmap_tasks, last_roadmap_generated_at').eq('id', user.id).single();
      
      let currentIsPro = false;
      if (prof) {
        currentIsPro = prof.subscription_status === 'pro';
        setIsPro(currentIsPro);
        if (prof.roadmap_data) {
          try {
            const parsed = typeof prof.roadmap_data === 'string' ? JSON.parse(prof.roadmap_data) : prof.roadmap_data;
            if (parsed?.stages?.length > 0) {
              setRoadmap(parsed);
              setHasExistingRoadmap(true);
              setGoal(parsed.goal || parsed.title || goal);
              setExperience(parsed.experience || experience);
            }
          } catch (_) { }
        }
        if (prof.completed_roadmap_tasks) {
          setCompletedTasks(prof.completed_roadmap_tasks);
        }
        if (prof.last_roadmap_generated_at) {
          const lastGen = new Date(prof.last_roadmap_generated_at);
          const now = new Date();
          const diffDays = (now.getTime() - lastGen.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays < 7) {
            setServerLimitBlocked(true);
          }
        }
      }

      // Check for automatic trigger from Dashboard
      const state = location.state as any;
      if (state?.triggerUpdate && state?.newGoal && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        const targetGoal = state.newGoal;
        setGoal(targetGoal);
        
        // Clean up state so refresh doesn't re-trigger
        navigate(location.pathname, { replace: true, state: {} });
        
        // Short delay to ensure state updates and then generate
        setTimeout(() => {
          generateRoadmap(targetGoal, experience, currentIsPro);
        }, 100);
      }
    };
    init();
  }, []);

  const saveRoadmapToProfile = async (data: RoadmapData, roadmapHash?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const updatePayload: Record<string, any> = {
      roadmap_data: JSON.stringify(data),
    };
    if (roadmapHash) {
      updatePayload.roadmap_hash = roadmapHash;
      updatePayload.roadmap_version = roadmapHash;
    }
    const { error } = await supabase.from('profiles').update(updatePayload).eq('id', user.id);
    if (error) {
      console.error('Failed to save roadmap to profile:', error);
      alert('Failed to save roadmap to database. Please make sure you have run the required SQL migrations in Supabase.');
    }
  };

  const regenerateDependentRecommendations = async (roadmapData: RoadmapData, roadmapHash?: string) => {
    const roadmapGoal = roadmapData.goal || roadmapData.title;
    const experienceLevel = roadmapData.experience || 'intermediate';
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    await Promise.all([
      generateUserDocs(user.id, roadmapGoal, roadmapHash),
      generateUserCertificates(user.id, roadmapGoal, experienceLevel, roadmapHash),
      generateUserCurriculum(user.id, roadmapGoal, experienceLevel, roadmapHash),
    ]).catch((error) => {
      console.error('Failed to regenerate dependent recommendations:', error);
    });
  };

  const generateRoadmap = async (overrideGoal?: string, overrideExperience?: string, overrideIsPro?: boolean) => {
    const activeIsPro = overrideIsPro !== undefined ? overrideIsPro : isPro;
    const activeGoal = overrideGoal || goal;
    const activeExperience = overrideExperience || experience;

    if (isLimitReached('roadmap', activeIsPro)) {
      setLimitError(getLimitMessage('roadmap', activeIsPro));
      return;
    }

    setLoading(true);
    setLimitError(null);
    setShowUpdateConfirm(false);
    try {
      const response = await fetch('/api/openai-proxy?path=v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a DevOps career expert. Return ONLY valid JSON with no markdown or extra text.',
            },
            {
              role: 'user',
              content: `Create a structured DevOps personalized roadmap for a ${activeExperience} level user aiming to become a ${activeGoal}.
Return a JSON object exactly like this:
{
  "title": "string",
  "goal": "string",
  "experience": "string",
  "description": "string",
  "stages": [
    {
      "id": "stage-1",
      "label": "string",
      "description": "string",
      "tasks": [
        { "label": "Topic Name", "url": "Official Documentation URL" }
      ]
    }
  ]
}
Include 4-6 stages. Each stage has 4-6 tasks. 
CRITICAL: Ensure every "url" is a valid, high-quality link to official documentation (e.g. kubernetes.io, aws.amazon.com, terraform.io, or git-scm.com).`,
            },
          ],
          max_tokens: 1500,
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const text = data.choices?.[0]?.message?.content || '{}';
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed: RoadmapData = JSON.parse(clean);
      const finalRoadmap: RoadmapData = {
        goal: activeGoal,
        experience: activeExperience,
        title: parsed.title || activeGoal,
        description: parsed.description || `Personalized ${activeExperience} roadmap to become ${activeGoal}.`,
        stages: parsed.stages || [],
      };
      const roadmapHash = await getObjectHash(finalRoadmap);
      setRoadmap(finalRoadmap);
      setHasExistingRoadmap(true);
      incrementUsage('roadmap', activeIsPro);
      await saveRoadmapToProfile(finalRoadmap, roadmapHash);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles')
          .update({ last_roadmap_generated_at: new Date().toISOString() })
          .eq('id', user.id);
      }
      await regenerateDependentRecommendations(finalRoadmap, roadmapHash);
    } catch (error: any) {
      console.error(error);
      alert(`Failed to generate roadmap: ${error.message || 'Verify your OpenAI API key.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConstructClick = () => {
    if (hasExistingRoadmap) {
      setShowUpdateConfirm(true);
    } else {
      generateRoadmap();
    }
  };

  const toggleTask = async (stageId: string, taskIdx: number) => {
    const taskId = `${stageId}-task-${taskIdx}`;
    let newCompleted: string[];
    if (completedTasks.includes(taskId)) {
      newCompleted = completedTasks.filter(id => id !== taskId);
    } else {
      newCompleted = [...completedTasks, taskId];
    }
    setCompletedTasks(newCompleted);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ completed_roadmap_tasks: newCompleted }).eq('id', user.id);
      await updateReadinessScore(user.id);
    }
  };

  const remaining = getRemainingUsage('roadmap', isPro);
  const isBlocked = remaining === 0 || (!isPro && serverLimitBlocked);

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="space-y-4">
          <h2 className="text-5xl font-black tracking-tighter italic">AI Architect</h2>
          <p className="text-text-dim font-bold uppercase tracking-[0.2em] text-xs">Custom logic for your engineering growth</p>
        </div>
        {!roadmap && <Compass className="w-16 h-16 text-soft-blue opacity-20 animate-spin-slow" />}
        <div className="flex flex-col items-end gap-2">
          {!isPro && (
            <div className="text-[10px] font-black uppercase tracking-widest text-soft-orange bg-soft-orange/10 px-4 py-2 rounded-full border border-soft-orange/20">
              {isBlocked ? '🔒 Weekly limit reached' : `${remaining} generation${remaining !== 1 ? 's' : ''} left this week`}
            </div>
          )}
          {isPro && (
            <div className="text-[10px] font-black uppercase tracking-widest text-soft-blue bg-soft-blue/10 px-4 py-2 rounded-full border border-soft-blue/20">
              {remaining === 0 ? '🔒 Monthly limit reached' : `${remaining} generation${remaining !== 1 ? 's' : ''} left this month`}
            </div>
          )}
        </div>
      </header>

      {/* Update confirmation modal */}
      <AnimatePresence>
        {showUpdateConfirm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <div className="playful-card max-w-md w-full bg-surface border-none shadow-2xl space-y-6 text-center">
              <div className="w-16 h-16 bg-soft-orange/10 rounded-full flex items-center justify-center mx-auto">
                <RefreshCw className="w-8 h-8 text-soft-orange" />
              </div>
              <h3 className="text-2xl font-black">Update Your Roadmap?</h3>
              <p className="text-text-dim font-bold text-sm leading-relaxed">
                You already have a roadmap. Generating a new one will replace it.
                {` This uses your ${isPro ? 'monthly' : 'weekly'} generation (${isBlocked ? 0 : remaining} left).`}
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowUpdateConfirm(false)}
                  className="flex-1 py-3 border-2 border-border rounded-full font-black text-sm hover:bg-border transition-colors"
                >
                  Keep Current
                </button>
                <button
                  onClick={generateRoadmap}
                  className="flex-1 py-3 bg-text-main text-surface rounded-full font-black text-sm hover:bg-soft-orange transition-colors"
                >
                  {isBlocked ? '🔒 Locked' : 'Generate New'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {limitError && (
        <div className="flex items-center gap-3 p-4 bg-soft-orange/10 border-2 border-soft-orange/30 rounded-3xl text-soft-orange font-bold text-sm">
          <Lock className="w-5 h-5 flex-shrink-0" />
          {limitError}
        </div>
      )}

      <AnimatePresence>
        {/* Config panel — always visible so user can change params */}
        <motion.div
          key="config"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="playful-card p-6 sm:p-12 bg-surface shadow-2xl border-none space-y-10"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-dim flex items-center gap-2">
                <Target className="w-3 h-3 text-soft-blue" /> Starting Experience
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                {['beginner', 'intermediate', 'advanced'].map((level) => (
                  <button
                    key={level}
                    onClick={() => setExperience(level)}
                    className={cn(
                      "flex-1 px-4 py-4 rounded-2xl border-4 transition-all font-black text-xs sm:text-sm uppercase tracking-widest text-center",
                      experience === level
                        ? "bg-soft-blue/10 border-soft-blue text-soft-blue shadow-lg sm:scale-105"
                        : "bg-brand-bg border-border text-text-dim hover:border-text-main/10"
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-dim flex items-center gap-2">
                <BookOpen className="w-3 h-3 text-soft-green" /> Target Destination
              </label>
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full bg-brand-bg border-4 border-border rounded-2xl px-6 py-4 font-black outline-hidden focus:border-soft-green transition-all shadow-inner"
                placeholder="e.g. SRE Leader"
              />
            </div>
          </div>

          <button
            onClick={handleConstructClick}
            disabled={loading || isBlocked}
            className="btn-pill bg-text-main text-surface w-full py-5 sm:py-6 text-sm sm:text-xl flex items-center justify-center gap-3 sm:gap-4 shadow-2xl hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed flex-wrap text-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin flex-shrink-0" />
                <span className="animate-pulse italic">Architecting Growth Path...</span>
              </>
            ) : isBlocked ? (
              <>
                <Lock className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                <span>{isPro ? 'Monthly Limit Reached' : 'Weekly Limit Reached — Upgrade to Pro'}</span>
              </>
            ) : hasExistingRoadmap ? (
              <>
                <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-soft-orange flex-shrink-0" />
                <span>Update Roadmap</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-soft-orange flex-shrink-0" />
                <span>Construct Roadmap</span>
              </>
            )}
          </button>
        </motion.div>

        {/* Roadmap display — always shown when data exists */}
        {roadmap && (
          <motion.div
            key="roadmap"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            <div className="flex flex-col md:flex-row justify-between items-start gap-6 bg-surface p-10 rounded-[3rem] shadow-xl border-none">
              <div className="space-y-4">
                <h2 className="text-4xl font-black tracking-tighter leading-none">{roadmap.title}</h2>
                <p className="text-text-dim font-bold text-lg max-w-2xl leading-relaxed">{roadmap.description}</p>
              </div>
            </div>

            <div className="relative pl-12 space-y-12">
              <div className="absolute left-[24px] top-8 bottom-8 w-1 bg-linear-to-b from-soft-blue via-soft-purple to-soft-green opacity-20" />

              {roadmap.stages.map((stage, idx) => (
                <motion.div
                  key={stage.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="relative playful-card p-10 border-none shadow-2xl bg-surface group hover:scale-[1.01] transition-transform"
                >
                  <div className={cn(
                    "absolute -left-[56px] top-6 w-14 h-14 rounded-3xl border-6 border-brand-bg flex items-center justify-center z-10 shadow-2xl transition-all group-hover:scale-110",
                    idx === 0 ? "bg-soft-blue text-white shadow-soft-blue/30" : "bg-text-main text-surface"
                  )}>
                    {idx === 0 ? <Zap className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
                  </div>

                  <div className="space-y-6">
                    <div>
                      <span className="text-[10px] uppercase font-black tracking-[0.4em] text-soft-blue mb-2 block">Stage {idx + 1}</span>
                      <h3 className="text-3xl font-black tracking-tighter">{stage.label}</h3>
                    </div>
                    <p className="text-text-dim font-bold leading-relaxed">{stage.description}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {stage.tasks.map((task, tidx) => {
                        const taskId = `${stage.id}-task-${tidx}`;
                        const isCompleted = completedTasks.includes(taskId);
                        // Backwards compatibility check
                        const taskLabel = typeof task === 'string' ? task : task.label;
                        const taskUrl = typeof task === 'string' ? `https://www.google.com/search?q=${encodeURIComponent(task + " official documentation")}` : task.url;

                        return (
                          <div 
                            key={tidx} 
                            className={cn(
                              "flex items-center justify-between gap-4 p-5 rounded-[1.5rem] bg-brand-bg/50 border-2 border-border/30 group/item transition-all hover:scale-[1.02]",
                              isCompleted && "border-soft-green/50 bg-soft-green/5 shadow-lg shadow-soft-green/5"
                            )}
                          >
                            <div 
                              className="flex items-center gap-3 cursor-pointer flex-1"
                              onClick={() => window.open(taskUrl, '_blank')}
                            >
                               <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center shrink-0 group-hover/item:border-soft-blue transition-colors">
                                  <BookOpen className="w-3.5 h-3.5 text-text-dim group-hover/item:text-soft-blue" />
                               </div>
                               <div className="flex flex-col">
                                 <span className={cn(
                                   "text-[10px] font-black uppercase tracking-tight transition-colors",
                                   isCompleted ? "text-soft-green" : "text-text-main group-hover/item:text-soft-blue"
                                 )}>
                                   {taskLabel}
                                 </span>
                               </div>
                            </div>

                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTask(stage.id, tidx);
                              }}
                              className={cn(
                                "shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                                isCompleted ? "bg-soft-green text-white shadow-lg shadow-soft-green/20" : "bg-surface border border-border text-text-dim hover:border-soft-green hover:text-soft-green"
                              )}
                            >
                              <CheckCircle2 className="w-4 h-4" strokeWidth={3} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
