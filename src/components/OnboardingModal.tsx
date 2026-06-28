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

    localStorage.setItem('hasSeenOnboarding', 'true');

    navigate('/roadmap', {
      state: {
        triggerUpdate: true,
        newGoal: finalGoal,
        newExperience: experience
      }
    });
  };

  return (
    <div className="fixed top-0 left-0 w-full h-full min-h-[100dvh] z-[200] flex items-center justify-center p-4 sm:p-6 bg-surface/95 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-xl bg-surface clay p-6 sm:p-8 md:p-12 relative my-auto"
      >
        <button
          onClick={handleDismiss}
          className="absolute top-6 right-6 p-2 hover:bg-surface-2 transition-colors z-[210] text-text-dim"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-8 font-mono text-[10px] uppercase tracking-widest text-text-dim">
          <span className={cn(step === 1 ? "text-neon-cyan" : "")}>01 · level</span>
          <span className="w-6 h-px bg-border" />
          <span className={cn(step === 2 ? "text-neon-cyan" : "")}>02 · goal</span>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ x: 16, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -16, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="relative z-10 space-y-8"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-11 h-11 clay-flat flex items-center justify-center text-neon-cyan">
                  <Rocket className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>Set your starting point</h2>
                  <p className="text-xs text-text-dim">A couple questions, then we build your roadmap</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="font-mono text-[10px] uppercase tracking-widest text-text-dim">Current experience level</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {['Beginner', 'Intermediate', 'Advanced'].map(lvl => (
                    <motion.button
                      key={lvl}
                      whileHover={{ y: -3 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setExperience(lvl)}
                      className={cn(
                        "p-4 bg-surface font-medium text-sm transition-colors text-left clay-sm",
                        experience === lvl
                          ? "ring-1 ring-inset ring-neon-cyan text-neon-cyan"
                          : "text-text-dim hover:text-text-main"
                      )}
                    >
                      {lvl}
                    </motion.button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="btn-pill btn-neon-primary w-full flex items-center justify-center gap-2 py-4"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ x: 16, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -16, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="relative z-10 space-y-8"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-11 h-11 clay-flat flex items-center justify-center text-neon-cyan">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>What's the target role?</h2>
                  <p className="text-xs text-text-dim">We'll build a roadmap toward this</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="font-mono text-[10px] uppercase tracking-widest text-text-dim">Career goal</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    'DevOps Engineer',
                    'Cloud Engineer',
                    'Kubernetes Engineer',
                    'SRE Engineer',
                    'Platform Engineer'
                  ].map(label => (
                    <motion.button
                      key={label}
                      whileHover={{ y: -3 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setGoal(label);
                        setIsCustomGoal(false);
                      }}
                      className={cn(
                        "p-4 bg-surface font-medium text-sm transition-colors text-left clay-sm",
                        !isCustomGoal && goal === label
                          ? "ring-1 ring-inset ring-neon-cyan text-neon-cyan"
                          : "text-text-dim hover:text-text-main"
                      )}
                    >
                      {label}
                    </motion.button>
                  ))}
                  <motion.button
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setIsCustomGoal(true)}
                    className={cn(
                      "p-4 bg-surface font-medium text-sm transition-colors text-left clay-sm",
                      isCustomGoal
                        ? "ring-1 ring-inset ring-neon-cyan text-neon-cyan"
                        : "text-text-dim hover:text-text-main"
                    )}
                  >
                    Other / custom
                  </motion.button>
                </div>

                {isCustomGoal && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    <label className="font-mono text-[10px] uppercase tracking-widest text-text-dim">Type your specific role</label>
                    <input
                      type="text"
                      value={customGoal}
                      onChange={(e) => setCustomGoal(e.target.value)}
                      placeholder="e.g. Infrastructure Architect"
                      className="w-full p-4 bg-brand-bg clay-input border-2 border-border focus:border-neon-cyan focus:ring-0 transition-colors font-medium text-sm outline-none rounded-xl"
                      autoFocus
                    />
                    <p className="text-[10px] text-text-dim/70">Must be relevant to DevOps, SRE, or Cloud Engineering.</p>
                  </motion.div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="btn-pill btn-ghost px-6 py-4"
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  className="btn-pill btn-neon-primary flex-1 flex items-center justify-center gap-2 py-4"
                >
                  Generate roadmap <Check className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
