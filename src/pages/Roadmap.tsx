import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, Sparkles, CheckCircle2, Loader2, ChevronRight, Zap, Target, BookOpen, RefreshCw, Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { isLimitReached, incrementUsage, getRemainingUsage, getLimitMessage } from '../lib/usageLimit';

interface RoadmapStage {
  id: string;
  label: string;
  description: string;
  tasks: string[];
}

interface RoadmapData {
  title: string;
  description: string;
  stages: RoadmapStage[];
}

export default function Roadmap() {
  const [experience, setExperience] = useState('beginner');
  const [goal, setGoal] = useState('Senior DevOps Engineer');
  const [loading, setLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [hasExistingRoadmap, setHasExistingRoadmap] = useState(false);
  const [limitError, setLimitError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: prof } = await supabase.from('profiles').select('subscription_status, roadmap_data').eq('id', user.id).single();
      if (prof) {
        setIsPro(prof.subscription_status === 'pro');
        if (prof.roadmap_data) {
          try {
            const parsed = typeof prof.roadmap_data === 'string' ? JSON.parse(prof.roadmap_data) : prof.roadmap_data;
            if (parsed?.stages?.length > 0) {
              setRoadmap(parsed);
              setHasExistingRoadmap(true);
            }
          } catch (_) {}
        }
      }
    };
    init();
  }, []);

  const saveRoadmapToProfile = async (data: RoadmapData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').update({ roadmap_data: JSON.stringify(data) }).eq('id', user.id);
  };

  const generateRoadmap = async () => {
    if (isLimitReached('roadmap', isPro)) {
      setLimitError(getLimitMessage('roadmap'));
      return;
    }

    setLoading(true);
    setLimitError(null);
    setShowUpdateConfirm(false);
    try {
      const apiKey = (window as any).OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        alert('OpenAI API key not configured. Please add your key in Settings → API Configuration.');
        return;
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
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
              content: `Create a structured DevOps personalized roadmap for a ${experience} level user aiming to become a ${goal}.
Return a JSON object exactly like this:
{
  "title": "string",
  "description": "string",
  "stages": [
    {
      "id": "stage-1",
      "label": "string",
      "description": "string",
      "tasks": ["task1", "task2", "task3", "task4"]
    }
  ]
}
Include 4-6 stages. Each stage has 4-6 tasks.`,
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
      setRoadmap(parsed);
      setHasExistingRoadmap(true);
      incrementUsage('roadmap');
      await saveRoadmapToProfile(parsed);
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

  const remaining = getRemainingUsage('roadmap', isPro);

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="space-y-4">
          <h2 className="text-5xl font-black tracking-tighter italic">AI Architect</h2>
          <p className="text-text-dim font-bold uppercase tracking-[0.2em] text-xs">Custom logic for your engineering growth</p>
        </div>
        {!roadmap && <Compass className="w-16 h-16 text-soft-blue opacity-20 animate-spin-slow" />}
        {!isPro && (
          <div className="text-[10px] font-black uppercase tracking-widest text-soft-orange bg-soft-orange/10 px-4 py-2 rounded-full border border-soft-orange/20">
            {remaining > 0 ? `${remaining} generation${remaining !== 1 ? 's' : ''} left today` : '🔒 Daily limit reached'}
          </div>
        )}
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
                {!isPro && ` This uses your daily generation (${remaining} left today).`}
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
                  {remaining === 0 && !isPro ? '🔒 Locked' : 'Generate New'}
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

      <AnimatePresence mode="wait">
        {/* Config panel — always visible so user can change params */}
        <motion.div
          key="config"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="playful-card p-12 bg-surface shadow-2xl border-none space-y-10"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-dim flex items-center gap-2">
                <Target className="w-3 h-3 text-soft-blue" /> Starting Experience
              </label>
              <div className="grid grid-cols-2 gap-4">
                {['beginner', 'intermediate', 'advanced'].map((level) => (
                  <button
                    key={level}
                    onClick={() => setExperience(level)}
                    className={cn(
                      "px-6 py-4 rounded-2xl border-4 transition-all font-black text-sm uppercase tracking-widest",
                      experience === level
                        ? "bg-soft-blue/10 border-soft-blue text-soft-blue shadow-lg scale-105"
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
            disabled={loading || (!isPro && remaining === 0)}
            className="btn-pill bg-text-main text-surface w-full py-6 text-xl flex items-center justify-center gap-4 shadow-2xl hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="animate-pulse italic">Architecting Growth Path...</span>
              </div>
            ) : !isPro && remaining === 0 ? (
              <><Lock className="w-6 h-6" /> Daily Limit Reached — Upgrade to Pro</>
            ) : hasExistingRoadmap ? (
              <><RefreshCw className="w-6 h-6 text-soft-orange" /> Update Roadmap</>
            ) : (
              <><Sparkles className="w-6 h-6 text-soft-orange" /> Construct Roadmap</>
            )}
          </button>
        </motion.div>

        {/* Roadmap display */}
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
                      {stage.tasks.map((task, tidx) => (
                        <div key={tidx} className="flex items-center gap-4 p-5 rounded-[1.5rem] bg-brand-bg/50 border-2 border-border/30 text-xs font-black uppercase tracking-tight group/item hover:border-soft-blue transition-colors">
                          <CheckCircle2 className="w-5 h-5 text-soft-green opacity-50 group-hover/item:opacity-100 transition-opacity" />
                          <span className="group-hover/item:text-soft-blue transition-colors">{task}</span>
                        </div>
                      ))}
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
