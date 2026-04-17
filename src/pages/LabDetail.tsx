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

interface LabStep {
  title: string;
  description: string;
  defaultCode: string;
  bugToken: string; // text that should NOT be present when fixed
  fixHint: string;
}

const labSteps: LabStep[] = [
  {
    title: 'Fix ImagePullBackOff',
    description: 'The pod has a typo in the image name. Fix it to use the correct nginx image.',
    defaultCode: `apiVersion: v1
kind: Pod
metadata:
  name: debug-pod
spec:
  containers:
  - name: nginx
    image: nignx:latest # Typo in image name!`,
    bugToken: 'nignx',
    fixHint: 'Change "nignx" to "nginx"',
  },
  {
    title: 'Fix Missing Resource Limits',
    description: 'Best practice: all containers should have resource limits defined. Add CPU and memory limits.',
    defaultCode: `apiVersion: v1
kind: Pod
metadata:
  name: resource-pod
spec:
  containers:
  - name: app
    image: nginx:latest
    # Missing resource limits!`,
    bugToken: '# Missing resource limits!',
    fixHint: 'Add resources.limits with cpu and memory fields',
  },
  {
    title: 'Fix Incorrect Port Mapping',
    description: 'The Service is targeting the wrong port on the pod. Fix the targetPort to match the container port.',
    defaultCode: `apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  selector:
    app: my-app
  ports:
  - port: 80
    targetPort: 9999  # Wrong port - container listens on 8080`,
    bugToken: '9999',
    fixHint: 'Change targetPort from 9999 to 8080',
  },
];

export default function LabDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [stepIndex, setStepIndex] = useState(0);
  const [codes, setCodes] = useState<string[]>(labSteps.map(s => s.defaultCode));
  const [outputs, setOutputs] = useState<any[][]>(labSteps.map(() => []));
  const [successes, setSuccesses] = useState<boolean[]>(labSteps.map(() => false));
  const [isRunning, setIsRunning] = useState(false);
  const [completing, setCompleting] = useState(false);

  const currentStep = labSteps[stepIndex];
  const currentCode = codes[stepIndex];
  const currentOutput = outputs[stepIndex];
  const currentSuccess = successes[stepIndex];
  const totalSteps = labSteps.length;
  const allDone = successes.every(Boolean);

  const setCurrentCode = (val: string) => {
    setCodes(prev => prev.map((c, i) => i === stepIndex ? val : c));
  };

  const runCode = () => {
    setIsRunning(true);
    setOutputs(prev => prev.map((o, i) => i === stepIndex ? [{ type: 'info', text: 'Applying manifests to cluster...' }] : o));
    
    setTimeout(() => {
      const hasBug = currentCode.includes(currentStep.bugToken);
      const newOutput = hasBug
        ? [
            { type: 'info', text: 'Manifest applied.' },
            { type: 'error', text: `Error detected: ${currentStep.fixHint}` },
            { type: 'error', text: 'Deployment failed. Review configuration.' }
          ]
        : [
            { type: 'info', text: 'Manifest applied.' },
            { type: 'success', text: 'Resource created successfully.' },
            { type: 'success', text: 'All checks passed ✓' }
          ];
      
      setOutputs(prev => prev.map((o, i) => i === stepIndex ? newOutput : o));
      if (!hasBug) {
        setSuccesses(prev => prev.map((s, i) => i === stepIndex ? true : s));
      }
      setIsRunning(false);
    }, 1500);
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

      const { data: profile } = await supabase
        .from('profiles')
        .select('labs_completed, xp')
        .eq('id', user.id)
        .single();

      const labId = parseInt(id || '0');
      const currentCompleted = profile?.labs_completed || 0;
      // Only advance — never go backwards (handles re-runs and NULL columns)
      const newCompleted = Math.max(currentCompleted, labId);
      const xpGain = labId > currentCompleted ? 500 : 0; // Only award XP for new completions

      // We use upsert here to guarantee the row gets created even if it was somehow skipped during login
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        labs_completed: newCompleted,
        xp: (profile?.xp || 0) + xpGain
      }, { onConflict: 'id' });

      if (profileError) {
        throw new Error(`Profile update failed: ${profileError.message}`);
      }

      if (xpGain > 0) {
        // Log today's activity for real-time graph
        const today = new Date().toISOString().split('T')[0];
        const { data: existing } = await supabase
          .from('activity_log')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', today)
          .single();

        if (existing) {
          await supabase.from('activity_log').update({
            xp_earned: (existing.xp_earned || 0) + xpGain,
            labs_done: (existing.labs_done || 0) + 1,
          }).eq('id', existing.id);
        } else {
          const { error: insertError } = await supabase.from('activity_log').insert({
            user_id: user.id,
            date: today,
            xp_earned: xpGain,
            labs_done: 1,
          });
          if (insertError) throw new Error(`Activity log insert failed: ${insertError.message}`);
        }
      }
    } catch (err: any) {
      console.error('Error saving lab completion:', err);
      alert(`Could not save lab progress: ${err.message}. Please check your connection or database schema.`);
    } finally {
      setCompleting(false);
      navigate('/labs'); // navigate AFTER database is fully updated
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-6 max-w-[1600px] mx-auto overflow-hidden">
      <header className="flex justify-between items-center px-4">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/labs')} className="p-3 hover:bg-surface rounded-2xl border-2 border-transparent hover:border-border transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-black">{currentStep.title}</h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-soft-blue bg-soft-blue/10 px-2 py-0.5 rounded-full">Easy</span>
              <span className="text-[10px] font-black uppercase text-text-dim">Step {stepIndex + 1} of {totalSteps}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Step pills */}
          <div className="flex gap-2">
            {labSteps.map((s, i) => (
              <button
                key={i}
                onClick={() => setStepIndex(i)}
                className={cn(
                  "w-8 h-8 rounded-full text-xs font-black border-2 transition-all",
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
            className="btn-pill bg-text-main text-surface flex items-center gap-2 px-8 py-3 disabled:opacity-50"
          >
            {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            RUN LAB
          </button>
        </div>
      </header>

      {/* Step description */}
      <div className="px-4">
        <div className="bg-soft-blue/10 border-2 border-soft-blue/20 rounded-2xl px-6 py-3">
          <p className="text-sm font-bold text-soft-blue">{currentStep.description}</p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        {/* Editor Side */}
        <div className="playful-card flex flex-col p-0 border-none bg-surface shadow-2xl relative">
          <div className="flex items-center gap-3 px-6 py-4 border-b-2 border-border bg-brand-bg/20">
            <Code2 className="w-4 h-4 text-text-dim" />
            <span className="text-[10px] font-black uppercase tracking-widest text-text-dim">manifest.yaml</span>
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

        {/* Console Side */}
        <div className="playful-card flex flex-col p-0 border-none bg-text-main text-surface shadow-2xl overflow-hidden relative">
          <div className="flex items-center gap-3 px-6 py-4 border-b-2 border-surface/10 bg-surface/5">
            <TerminalIcon className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Execution Output</span>
          </div>
          
          <div className="flex-1 p-8 space-y-4 overflow-y-auto font-mono text-sm">
            {currentOutput.length === 0 && <p className="text-surface/40 italic">Waiting for execution...</p>}
            {currentOutput.map((line, i) => (
              <div key={i} className={cn(
                "flex gap-4 p-4 rounded-2xl border-2",
                line.type === 'error' && "bg-red-500/10 border-red-500/20 text-red-400",
                line.type === 'success' && "bg-soft-green/10 border-soft-green/20 text-soft-green",
                line.type === 'info' && "bg-surface/5 border-surface/10 text-surface"
              )}>
                {line.type === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <TerminalSquare className="w-5 h-5 flex-shrink-0" />}
                <p className="font-bold">{line.text}</p>
              </div>
            ))}
          </div>

          {/* Step success overlay */}
          <AnimatePresence>
            {currentSuccess && !allDone && (
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute inset-0 bg-soft-green flex flex-col items-center justify-center p-12 text-center text-white"
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
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute inset-0 bg-soft-green flex flex-col items-center justify-center p-12 text-center text-white"
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

      {/* Bottom nav between steps */}
      <div className="px-4 flex justify-between items-center">
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
