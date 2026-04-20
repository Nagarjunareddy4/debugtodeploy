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
  SkipForward
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { GeneratedLab, GeneratedLabStep } from '../lib/generator';
import { updateReadinessScore } from '../lib/readiness';
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
          const labs = data.generated_labs as GeneratedLab[];
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
            setCodes(foundLab.steps.map(s => s.defaultCode));
            setOutputs(foundLab.steps.map(() => []));
            setSuccesses(foundLab.steps.map(() => false));
          }
        }
      }
    }
    setLoading(false);
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
        setSuccesses(prev => prev.map((s, i) => i === stepIndex ? true : s));
      }
      setIsRunning(false);
    }, 1200);
  };

  const goNext = () => {
    if (stepIndex < totalSteps - 1) setStepIndex(stepIndex + 1);
  };

  const goPrev = () => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
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
    } catch (err: any) {
      console.error('Error saving lab completion:', err);
      alert(`Could not save lab progress: ${err.message}`);
    } finally {
      setCompleting(false);
      navigate('/labs');
    }
  };

  const labIndex = lab && labsData.length > 0 ? labsData.findIndex(l => l.id === lab.id) : -1;
  const isLabUnlocked = isPro || labIndex === 0;

  return (
    <div className="flex flex-col gap-4 max-w-[1600px] mx-auto pb-8">
      <header className="flex flex-wrap justify-between items-center gap-3 px-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/labs')} className="p-2.5 hover:bg-surface rounded-2xl border-2 border-transparent hover:border-border transition-all shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-2xl font-black truncate max-w-[220px] sm:max-w-none">{currentStep.title}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded-full", `text-${lab.color} bg-${lab.color}/10`)}>
                 {lab.difficulty}
              </span>
              <span className="text-[10px] font-black uppercase text-text-dim">Step {stepIndex + 1} of {totalSteps}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1.5">
            {lab.steps.map((s, i) => (
              <button
                key={i}
                onClick={() => setStepIndex(i)}
                className={cn(
                  "w-7 h-7 rounded-full text-xs font-black border-2 transition-all",
                  successes[i] ? "bg-soft-green text-white border-soft-green" :
                  i === stepIndex ? "bg-text-main text-surface border-text-main scale-110" :
                  "bg-brand-bg border-border text-text-dim hover:border-soft-blue"
                )}
              >
                {successes[i] ? '✓' : i + 1}
              </button>
            ))}
          </div>
          <button 
            onClick={runCode}
            disabled={isRunning || currentSuccess}
            className="btn-pill bg-text-main text-surface flex items-center gap-2 px-5 py-2.5 text-sm disabled:opacity-50"
          >
            {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            RUN LAB
          </button>
        </div>
      </header>

      <div className="px-2">
        <div className={cn("bg-brand-bg/50 border-2 border-border rounded-2xl px-4 py-3")}>
          <p className="text-sm font-bold text-text-main">{currentStep.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-0" style={{ minHeight: '60vh' }}>
        <div className="playful-card flex flex-col p-0 border-none bg-surface shadow-2xl relative" style={{ minHeight: '300px' }}>
          <div className="flex items-center gap-3 px-6 py-4 border-b-2 border-border bg-brand-bg/20">
            <Code2 className="w-4 h-4 text-text-dim" />
            <span className="text-[10px] font-black uppercase tracking-widest text-text-dim">IDE: manifest.yaml</span>
          </div>
          <div className="flex-1 overflow-hidden relative">
             <div className="absolute inset-y-0 left-0 w-12 bg-brand-bg/30 border-r-2 border-border flex flex-col items-center py-4 font-mono text-[10px] text-text-dim opacity-50 select-none">
                {Array.from({ length: 15 }).map((_, i) => <div key={i}>{i+1}</div>)}
             </div>
             <textarea 
               value={currentCode}
               onChange={(e) => setCurrentCode(e.target.value)}
               readOnly={currentSuccess}
               className="w-full h-full pl-16 pr-8 py-4 bg-transparent resize-none font-mono text-sm leading-relaxed outline-hidden focus:bg-brand-bg/5 transition-colors"
             />
          </div>
        </div>
        <div className="flex flex-col p-0 border-none relative overflow-hidden" style={{ minHeight: '300px' }}>
          <Terminal 
            isUnlocked={isLabUnlocked} 
            isRealPro={isPro}
            currentLab={lab} 
            currentCode={currentCode}
            externalLogs={latestLogs}
            onCommand={(cmd) => {
              // Optional: Logic to automatically check success based on commands
              if (cmd === 'kubectl apply -f deployment.yaml') {
                runCode();
              }
            }} 
          />
          
          <AnimatePresence>
            {currentSuccess && !allDone && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 bg-soft-green/95 backdrop-blur-sm flex flex-col items-center justify-center p-12 text-center text-white z-30"
              >
                <CheckCircle className="w-20 h-20 mb-6" />
                <h3 className="text-3xl font-black italic tracking-tighter mb-2">Step {stepIndex + 1} Complete!</h3>
                <p className="font-black text-lg uppercase tracking-widest mb-10 opacity-80">
                  {stepIndex + 1 < totalSteps ? `${totalSteps - stepIndex - 1} step(s) remaining` : ''}
                </p>
                {stepIndex + 1 < totalSteps && (
                  <button 
                    onClick={goNext}
                    className="bg-white text-soft-green px-10 py-4 rounded-full font-black text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                  >
                    <SkipForward className="w-6 h-6" /> Next Step
                  </button>
                )}
              </motion.div>
            )}
            {allDone && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 bg-soft-green/95 backdrop-blur-sm flex flex-col items-center justify-center p-12 text-center text-white z-30"
              >
                <div className="relative mb-8">
                   <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity }} className="relative z-10">
                      <Trophy className="w-24 h-24" />
                   </motion.div>
                   <motion.div animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 1, repeat: Infinity }} className="absolute inset-0 bg-white rounded-full" />
                </div>
                <h3 className="text-4xl font-black italic tracking-tighter mb-4 flex items-center gap-4"> 
                   <PartyPopper className="w-8 h-8" /> LAB COMPLETE!
                </h3>
                <p className="font-black text-xl uppercase tracking-widest mb-12 opacity-80">All {totalSteps} steps finished!</p>
                <button 
                  onClick={completeLab}
                  disabled={completing}
                  className="bg-white text-soft-green px-12 py-5 rounded-full font-black text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {completing ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />} 
                  {completing ? 'SAVING PROGRESS...' : 'ONWARD TO NEXT LAB'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="px-2 flex justify-between items-center py-1">
        <button
          onClick={goPrev}
          disabled={stepIndex === 0}
          className="flex items-center gap-2 font-black text-xs uppercase tracking-widest text-text-dim hover:text-text-main disabled:opacity-30 transition-all"
        >
          <ChevronLeft className="w-4 h-4" /> Previous Step
        </button>
        <button
          onClick={goNext}
          disabled={stepIndex === totalSteps - 1}
          className="flex items-center gap-2 font-black text-xs uppercase tracking-widest text-text-dim hover:text-text-main disabled:opacity-30 transition-all"
        >
          Next Step <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
