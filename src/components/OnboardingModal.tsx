import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Rocket, Brain, ChevronRight, Check, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface OnboardingModalProps {
  isOpen: boolean;
  onDismiss?: () => void;
}

export default function OnboardingModal({ isOpen, onDismiss }: OnboardingModalProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [experience, setExperience] = useState('Beginner');
  const [goal, setGoal] = useState('DevOps Engineer');
  const [isCustomGoal, setIsCustomGoal] = useState(false);
  const [customGoal, setCustomGoal] = useState('');

  if (!isOpen) return null;

  const handleDismiss = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    if (onDismiss) {
      onDismiss();
    } else {
      window.location.reload();
    }
  };

  const handleComplete = () => {
    const finalGoal = isCustomGoal ? customGoal : goal;
    
    if (isCustomGoal) {
      if (!customGoal.trim()) {
        toast.error('Please specify your custom goal');
        return;
      }

      // Relevance check
      const relevantKeywords = [
        'devops', 'sre', 'cloud', 'platform', 'infrastructure', 'sre', 
        'reliability', 'automation', 'linux', 'kubernetes', 'k8s', 'docker', 
        'aws', 'azure', 'gcp', 'terraform', 'ansible', 'jenkins', 'cicd', 'ci/cd',
        'architect', 'engineer', 'admin', 'operations', 'security', 'devsecops'
      ];
      
      const isRelevant = relevantKeywords.some(keyword => 
        customGoal.toLowerCase().includes(keyword)
      );

      if (!isRelevant) {
        toast.error('Please specify a role related to DevOps, SRE, or Cloud Engineering.');
        return;
      }
    }
    
    // Mark as seen so it doesn't pop up again even if generation fails or takes time
    localStorage.setItem('hasSeenOnboarding', 'true');
    
    // Navigate to roadmap page to trigger generation
    navigate('/roadmap', { 
      state: { 
        triggerUpdate: true, 
        newGoal: finalGoal,
        newExperience: experience
      } 
    });
  };

  return (
    <div className="fixed top-0 left-0 w-full h-full min-h-[100dvh] z-[200] flex items-center justify-center p-4 sm:p-6 bg-surface/90 backdrop-blur-xl overflow-y-auto">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-xl bg-surface border-4 border-border rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-8 md:p-12 shadow-[0_0_100px_rgba(0,0,0,0.5)] relative overflow-hidden my-auto"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-soft-blue/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <button 
          onClick={handleDismiss}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-border/20 transition-all z-[210] text-text-dim"
        >
          <X className="w-5 h-5" />
        </button>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="relative z-10 space-y-8"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-soft-blue/10 flex items-center justify-center text-soft-blue border border-soft-blue/20">
                  <Rocket className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black italic tracking-tighter">Welcome to the Fleet</h2>
                  <p className="text-xs font-bold text-text-dim uppercase tracking-widest">Let's tailor your experience</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-dim ml-2">What is your current experience level?</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {['Beginner', 'Intermediate', 'Advanced'].map(lvl => (
                    <button
                      key={lvl}
                      onClick={() => setExperience(lvl)}
                      className={cn(
                        "p-4 rounded-2xl border-2 font-bold text-sm transition-all",
                        experience === lvl 
                          ? "bg-soft-blue/10 border-soft-blue text-soft-blue" 
                          : "bg-surface border-border text-text-dim hover:border-text-dim/30"
                      )}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-full bg-text-main text-surface font-black uppercase text-xs hover:scale-105 active:scale-95 transition-all"
              >
                Next Step <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="relative z-10 space-y-8"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-soft-purple/10 flex items-center justify-center text-soft-purple border border-soft-purple/20">
                  <Brain className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black italic tracking-tighter">Target Destination</h2>
                  <p className="text-xs font-bold text-text-dim uppercase tracking-widest">Where are we flying?</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-dim ml-2">What is your ultimate career goal?</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {['DevOps Engineer', 'Cloud Architect', 'Site Reliability Eng.', 'Platform Engineer'].map(g => (
                    <button
                      key={g}
                      onClick={() => {
                        setGoal(g);
                        setIsCustomGoal(false);
                      }}
                      className={cn(
                        "p-4 rounded-2xl border-2 font-bold text-sm transition-all text-left",
                        !isCustomGoal && goal === g 
                          ? "bg-soft-purple/10 border-soft-purple text-soft-purple" 
                          : "bg-surface border-border text-text-dim hover:border-text-dim/30"
                      )}
                    >
                      {g}
                    </button>
                  ))}
                  <button
                    onClick={() => setIsCustomGoal(true)}
                    className={cn(
                      "p-4 rounded-2xl border-2 font-bold text-sm transition-all text-left",
                      isCustomGoal 
                        ? "bg-soft-purple/10 border-soft-purple text-soft-purple" 
                        : "bg-surface border-border text-text-dim hover:border-text-dim/30"
                    )}
                  >
                    Other / Custom Goal
                  </button>
                </div>

                {isCustomGoal && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-dim ml-2">Type your specific role (e.g. SRE Manager, Cloud Security)</label>
                    <input
                      type="text"
                      value={customGoal}
                      onChange={(e) => setCustomGoal(e.target.value)}
                      placeholder="e.g. Infrastructure Architect"
                      className="w-full p-4 rounded-2xl bg-brand-bg border-2 border-border focus:border-soft-purple focus:ring-0 transition-all font-bold text-sm"
                      autoFocus
                    />
                    <p className="text-[9px] font-bold text-text-dim/60 ml-2 italic">Note: Custom goals must be relevant to DevOps, SRE, or Cloud Engineering.</p>
                  </motion.div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-4 rounded-full bg-surface border-2 border-border text-text-dim font-black uppercase text-xs hover:border-text-dim/30 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  className="flex-1 flex items-center justify-center gap-2 py-4 rounded-full bg-soft-purple text-white font-black uppercase text-xs hover:scale-105 active:scale-95 transition-all shadow-xl shadow-soft-purple/30"
                >
                  Generate Curriculum <Check className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
