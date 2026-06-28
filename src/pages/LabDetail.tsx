import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Terminal as TerminalIcon, 
  TerminalSquare, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft, 
  Code2, 
  RefreshCw,
  Trophy,
  PartyPopper,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  SkipForward,
  Brain,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { GeneratedLab, GeneratedLabStep } from '../lib/generator';
import { updateReadinessScore } from '../lib/readiness';
import { trackEvent } from '../lib/analytics';
import { Notify } from '../lib/notifications';
import Terminal from '../components/lab/Terminal';

export default function LabDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [lab, setLab] = useState<GeneratedLab | null>(null);
  const [labsData, setLabsData] = useState<GeneratedLab[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  
  const [stepIndex, setStepIndex] = useState(0);
  const [codes, setCodes] = useState<string[]>([]);
  const [outputs, setOutputs] = useState<any[][]>([]);
  const [successes, setSuccesses] = useState<boolean[]>([]);
  
  const [isRunning, setIsRunning] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [latestLogs, setLatestLogs] = useState<{ type: 'output' | 'error' | 'success', text: string }[]>([]);
  const [showAiHelp, setShowAiHelp] = useState(false);
  const [aiHelpLoading, setAiHelpLoading] = useState(false);
  const [aiHelpContent, setAiHelpContent] = useState<string | null>(null);

  useEffect(() => {
    fetchLab();
  }, [id]);

  const fetchLab = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('generated_labs, subscription_status').eq('id', user.id).single();
      if (data) {
        setIsPro(data.subscription_status === 'pro');
        const activeIsPro = data.subscription_status === 'pro';
        
        if (data.generated_labs) {
          const labs = data.generated_labs as (GeneratedLab & { lastStepIndex?: number })[];
          setLabsData(labs);
          const labIndex = labs.findIndex(l => l.id === id);
          const foundLab = labs[labIndex];

          // Security check: If free, only allow index 0
          if (!activeIsPro && labIndex > 0) {
            alert('This lab is reserved for Pro members. Upgrade to continue your journey!');
            navigate('/pricing');
            return;
          }

            if (foundLab) {
              setLab(foundLab);
              
              // Load saved user code or use default code
              if (foundLab.stepCodes && foundLab.stepCodes.length === foundLab.steps.length) {
                setCodes(foundLab.stepCodes);
              } else {
                setCodes(foundLab.steps.map(s => s.defaultCode));
              }
              
              setOutputs(foundLab.steps.map(() => []));
              
              // Load saved completion status
              if (foundLab.completedSteps && foundLab.completedSteps.length === foundLab.steps.length) {
                setSuccesses(foundLab.completedSteps);
              } else {
                setSuccesses(foundLab.steps.map(() => false));
              }
              
              // Resume from last saved step if it exists
              if (foundLab.lastStepIndex !== undefined) {
                setStepIndex(foundLab.lastStepIndex);
              }
            }
        }
      }
    }
    setLoading(false);
    if (lab) {
      trackEvent('lab_started', { lab_id: id, lab_title: lab.title });
    }
  };

  if (loading) return <div className="p-8">Loading lab details...</div>;
  if (!lab) return <div className="p-8">Lab not found.</div>;

  const currentStep = lab.steps[stepIndex];
  const currentCode = codes[stepIndex];
  const currentOutput = outputs[stepIndex];
  const currentSuccess = successes[stepIndex];
  const totalSteps = lab.steps.length;
  const allDone = successes.length > 0 && successes.every(Boolean);

  const setCurrentCode = (val: string) => {
    setCodes(prev => prev.map((c, i) => i === stepIndex ? val : c));
  };

  const runCode = () => {
    setIsRunning(true);
    setLatestLogs([]); // Reset
    
    // 1. Basic YAML Validation (Simple check for common mistakes like missing colons)
    const lines = currentCode.split('\n');
    const hasSyntaxError = lines.some(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return false;
      return !trimmed.includes(':') && !trimmed.startsWith('-');
    });

    setLatestLogs([{ type: 'output', text: 'Applying manifests to cluster...' }]);
    
    setTimeout(() => {
      let newOutput: any[] = [];
      const hasBug = currentCode.includes(currentStep.bugToken);

      if (hasSyntaxError) {
        newOutput = [
          { type: 'error', text: 'error: error parsing manifest.yaml: did not find expected key' },
          { type: 'error', text: 'DEPLOYMENT CRASHED: Fix syntax errors in the editor.' }
        ];
      } else if (hasBug) {
        newOutput = [
          { type: 'error', text: `Error detected in cluster state: ${currentStep.fixHint}` },
          { type: 'error', text: 'Status: ImagePullBackOff / CrashLoopBackOff' }
        ];
      } else {
        newOutput = [
          { type: 'success', text: 'Resource created successfully.' },
          { type: 'success', text: 'Status: Running (1/1 pods ready) ✓' }
        ];
      }
      
      setLatestLogs(newOutput);
      setOutputs(prev => prev.map((o, i) => i === stepIndex ? newOutput : o));
      
      if (!hasSyntaxError && !hasBug) {
        const newSuccesses = successes.map((s, i) => i === stepIndex ? true : s);
        setSuccesses(newSuccesses);
        // Persist completion immediately with the latest codes
        saveLabState(stepIndex, codes, newSuccesses);
      }
      setIsRunning(false);
    }, 1200);
  };

  const saveLabState = async (index: number, currentCodes: string[], currentSuccesses: boolean[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !id) return;

    const updatedLabs = labsData.map(l => {
      if (l.id === id) {
        return { 
          ...l, 
          lastStepIndex: index,
          completedSteps: currentSuccesses,
          stepCodes: currentCodes
        };
      }
      return l;
    });

    setLabsData(updatedLabs);
    await supabase.from('profiles').update({ generated_labs: updatedLabs }).eq('id', user.id);
  };

  // Removed saveStepProgress in favor of saveLabState

  const goNext = () => {
    if (stepIndex < totalSteps - 1) {
      const nextIdx = stepIndex + 1;
      setStepIndex(nextIdx);
      saveLabState(nextIdx, codes, successes);
    }
  };

  const goPrev = () => {
    if (stepIndex > 0) {
      const prevIdx = stepIndex - 1;
      setStepIndex(prevIdx);
      saveLabState(prevIdx, codes, successes);
    }
  };

  const completeLab = async () => {
    setCompleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const labIdStr = id || '0';
      const xpGain = lab.xp;

      // Call the secure RPC function
      const { error: rpcError } = await supabase.rpc('complete_lab_securely', {
        lab_id_input: labIdStr,
        xp_gain_input: xpGain
      });

      if (rpcError) {
        throw new Error(`Secure lab completion failed: ${rpcError.message}`);
      }

      await updateReadinessScore(user.id);
      trackEvent('lab_completed', { lab_id: id, lab_title: lab.title, xp_gained: xpGain });
      Notify.labCompleted(lab.title, xpGain, labIdStr);

      // Check for newly-unlocked badges (labs_completed/level just changed)
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('labs_completed, level')
        .eq('id', user.id)
        .single();

      if (updatedProfile) {
        const labsCompleted = updatedProfile.labs_completed || 0;
        const level = updatedProfile.level || 1;
        const BADGE_THRESHOLDS: { name: string; check: () => boolean }[] = [
          { name: 'Docker Pilot', check: () => labsCompleted === 1 },
          { name: 'K8s Healer', check: () => labsCompleted === 3 },
          { name: 'Cloud Native', check: () => labsCompleted === 5 },
          { name: 'SRE Master', check: () => level === 5 },
        ];
        const newlyUnlocked = BADGE_THRESHOLDS.find(b => b.check());
        if (newlyUnlocked) {
          Notify.achievement(newlyUnlocked.name);
        }
      }
    } catch (err: any) {
      console.error('Error saving lab completion:', err);
      alert(`Could not save lab progress: ${err.message}`);
    } finally {
      setCompleting(false);
      navigate('/labs');
    }
  };

  const getAiHelp = async () => {
    setAiHelpLoading(true);
    setShowAiHelp(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/openai-proxy?path=v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { 
              role: 'system', 
              content: 'You are a DevOps Lab Assistant. Help the user fix their code or explain the current step. Be concise and technical.' 
            },
            { 
              role: 'user', 
              content: `I am stuck on Step ${stepIndex + 1}: "${currentStep.title}" in the lab "${lab.title}".
              Current Instructions: ${currentStep.description}
              My current code:
              \`\`\`yaml
              ${currentCode}
              \`\`\`
              The last output was: ${latestLogs.map(l => l.text).join('\n')}
              Please help me identify the bug and explain how to fix it.` 
            }
          ],
          max_tokens: 500,
        }),
      });
      const data = await response.json();
      setAiHelpContent(data.choices?.[0]?.message?.content || 'No response from AI.');
    } catch (err: any) {
      setAiHelpContent('Failed to get AI help. Please try again.');
    } finally {
      setAiHelpLoading(false);
    }
  };

  const labIndex = lab && labsData.length > 0 ? labsData.findIndex(l => l.id === lab.id) : -1;
  const isLabUnlocked = isPro || labIndex === 0;

  return (
    <div className="flex flex-col gap-4 max-w-[1600px] mx-auto pb-8">
      <header className="flex flex-wrap justify-between items-center gap-3 px-2 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/labs')} className="p-2.5 hover:bg-surface-2 border border-transparent hover:border-border transition-all shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-2xl font-bold truncate max-w-[220px] sm:max-w-none" style={{ fontFamily: 'var(--font-display)' }}>{currentStep.title}</h2>
            <div className="flex items-center gap-2 flex-wrap font-mono text-[10px] uppercase tracking-widest text-text-dim">
              <span className="text-neon-cyan">{lab.difficulty}</span>
              <span>·</span>
              <span>Step {stepIndex + 1} of {totalSteps}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1">
            {lab.steps.map((s, i) => (
              <button
                key={i}
                onClick={() => {
                  setStepIndex(i);
                  saveLabState(i, codes, successes);
                }}
                className={cn(
                  "w-7 h-7 text-xs font-mono border transition-all",
                  successes[i] ? "bg-neon-green/10 text-neon-green border-neon-green" :
                  i === stepIndex ? "bg-text-main text-surface border-text-main" :
                  "bg-brand-bg border-border text-text-dim hover:border-neon-cyan"
                )}
              >
                {successes[i] ? '✓' : i + 1}
              </button>
            ))}
          </div>
          <button
            onClick={runCode}
            disabled={isRunning || currentSuccess}
            className="btn-pill btn-neon-primary flex items-center gap-2 px-5 py-2.5 text-sm disabled:opacity-50"
          >
            {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            Run lab
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 px-2" style={{ minHeight: '70vh' }}>
        {/* Left Sidebar: Instructions */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-surface clay-flat p-7 space-y-6 sticky top-4">
             <div className="flex items-center gap-3 text-neon-cyan font-mono text-[10px] uppercase tracking-widest">
                <TerminalIcon className="w-4 h-4" />
                <h3>Guided instructions</h3>
             </div>
             <div className="space-y-3">
                <h4 className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>{currentStep.title}</h4>
                <div className="prose prose-sm text-text-dim leading-relaxed text-sm">
                   {currentStep.description}
                </div>
             </div>
             
             <div className="pt-6 border-t border-border space-y-4">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-text-dim">
                   <Sparkles className="w-3 h-3 text-neon-cyan" /> Troubleshooting help
                </div>
                <button 
                  onClick={getAiHelp}
                  className="w-full py-3 border border-neon-cyan/40 text-neon-cyan font-mono text-[10px] uppercase tracking-widest hover:bg-neon-cyan hover:text-[#150C00] transition-all flex items-center justify-center gap-2"
                >
                   Ask AI assistant
                </button>
             </div>

             <div className="pt-4 space-y-2">
                <div className="flex justify-between font-mono text-[9px] uppercase tracking-widest text-text-dim">
                   <span>Progress</span>
                   <span>{Math.round(((stepIndex + 1) / totalSteps) * 100)}%</span>
                </div>
                <div className="h-1 w-full bg-border overflow-hidden">
                   <div className="h-full bg-neon-cyan transition-all duration-500" style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }} />
                </div>
             </div>
          </div>
        </div>

        {/* Center: IDE & Terminal */}
        <div className="lg:col-span-9 grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="flex flex-col p-0 bg-surface clay-flat relative overflow-hidden" style={{ minHeight: '400px' }}>
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-border">
              <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-text-dim">
                <Code2 className="w-4 h-4" />
                <span>manifest.yaml</span>
              </div>
              {currentSuccess && (
                <div className="flex items-center gap-2 text-neon-green font-mono text-[10px] uppercase tracking-widest">
                   <CheckCircle className="w-3 h-3" /> Validated
                </div>
              )}
            </div>
            <div className="flex-1 overflow-hidden relative">
               <div className="absolute inset-y-0 left-0 w-12 bg-surface-2 border-r border-border flex flex-col items-center py-4 font-mono text-[10px] text-text-dim opacity-50 select-none">
                  {Array.from({ length: 20 }).map((_, i) => <div key={i}>{i+1}</div>)}
               </div>
               <textarea 
                 value={currentCode}
                 onChange={(e) => setCurrentCode(e.target.value)}
                 readOnly={currentSuccess}
                 className="w-full h-full pl-16 pr-8 py-4 bg-transparent resize-none font-mono text-sm leading-relaxed outline-none focus:bg-surface-2/40 transition-colors"
               />
            </div>
          </div>
          <div className="flex flex-col p-0 border-none relative overflow-hidden" style={{ minHeight: '400px' }}>
            <Terminal 
              isUnlocked={isLabUnlocked} 
              isRealPro={isPro}
              currentLab={lab} 
              currentCode={currentCode}
              externalLogs={latestLogs}
              onCommand={(cmd) => {
                if (cmd === 'kubectl apply -f deployment.yaml') {
                  runCode();
                }
              }} 
            />
          
          <AnimatePresence>
            {currentSuccess && !allDone && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-[#0A0C10]/97 flex flex-col items-center justify-center p-12 text-center z-30 border border-neon-green/30"
              >
                <CheckCircle className="w-12 h-12 mb-6 text-neon-green" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-neon-green mb-2">step resolved</span>
                <h3 className="text-2xl font-bold mb-2 text-white" style={{ fontFamily: 'var(--font-display)' }}>Step {stepIndex + 1} complete</h3>
                <p className="font-mono text-xs text-white/50 mb-10">
                  {stepIndex + 1 < totalSteps ? `${totalSteps - stepIndex - 1} step(s) remaining` : ''}
                </p>
                {stepIndex + 1 < totalSteps && (
                  <button 
                    onClick={goNext}
                    className="btn-pill btn-neon-primary px-8 py-3.5 flex items-center gap-2"
                  >
                    <SkipForward className="w-4 h-4" /> Next step
                  </button>
                )}
              </motion.div>
            )}
            {allDone && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-[#0A0C10]/97 flex flex-col items-center justify-center p-12 text-center z-30 border border-neon-cyan/30"
              >
                <Trophy className="w-12 h-12 mb-6 text-neon-cyan" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-neon-cyan mb-2">incident resolved</span>
                <h3 className="text-3xl font-bold mb-3 text-white" style={{ fontFamily: 'var(--font-display)' }}>
                   Lab complete
                </h3>
                <p className="font-mono text-xs text-white/50 mb-10">All {totalSteps} steps finished · +{lab.xp} XP</p>
                <button 
                  onClick={completeLab}
                  disabled={completing}
                  className="btn-pill btn-neon-primary px-10 py-4 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {completing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} 
                  {completing ? 'Saving progress…' : 'Continue to next lab'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>

    <div className="px-2 flex justify-between items-center py-1">
        <button
          onClick={goPrev}
          disabled={stepIndex === 0}
          className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-text-dim hover:text-text-main disabled:opacity-30 transition-all"
        >
          <ChevronLeft className="w-4 h-4" /> Previous step
        </button>
        <button
          onClick={goNext}
          disabled={stepIndex === totalSteps - 1}
          className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-text-dim hover:text-text-main disabled:opacity-30 transition-all"
        >
          Next step <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* AI Help Modal */}
      <AnimatePresence>
        {showAiHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="max-w-2xl w-full bg-surface clay p-8 sm:p-10 space-y-8 relative"
            >
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-11 h-11 clay-flat flex items-center justify-center text-neon-cyan">
                       <Brain className="w-5 h-5" />
                    </div>
                    <div>
                       <span className="font-mono text-[10px] uppercase tracking-widest text-neon-cyan block mb-1">ai diagnostic</span>
                       <h3 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Troubleshooting</h3>
                    </div>
                 </div>
                 <button onClick={() => setShowAiHelp(false)} className="p-2 hover:bg-surface-2 transition-all">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              
              <div className="p-6 bg-brand-bg clay-input rounded-xl min-h-[200px] max-h-[400px] overflow-y-auto">
                 {aiHelpLoading ? (
                   <div className="flex flex-col items-center justify-center h-full gap-4 py-12">
                      <RefreshCw className="w-6 h-6 text-neon-cyan animate-spin" />
                      <p className="font-mono text-[10px] uppercase tracking-widest text-text-dim">Running diagnostic check…</p>
                   </div>
                 ) : (
                   <div className="prose prose-sm text-text-main leading-relaxed text-sm">
                      {aiHelpContent?.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                   </div>
                 )}
              </div>

              <div className="flex justify-end gap-4">
                 <button 
                   onClick={() => setShowAiHelp(false)}
                   className="btn-pill btn-neon-primary px-8 py-3"
                 >
                   Got it
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
