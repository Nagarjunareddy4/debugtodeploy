import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal as TerminalIcon, Shield, Lock, Zap, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TerminalProps {
  isUnlocked: boolean;
  isRealPro?: boolean;
  onCommand?: (cmd: string) => void;
  currentLab?: any;
  currentCode?: string;
  externalLogs?: { type: 'output' | 'error' | 'success', text: string }[];
}

export default function Terminal({ isUnlocked, isRealPro, onCommand, currentLab, currentCode, externalLogs }: TerminalProps) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<{ type: 'input' | 'output' | 'error' | 'success', text: string }[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load persistence
  useEffect(() => {
    const defaultHistory = [
      { type: 'output' as const, text: 'Initializing DebugToDeploy Cloud Sandbox...' },
      { type: 'output' as const, text: 'Connected to node: d2d-worker-01 (Ubuntu 22.04 LTS)' },
      { type: 'success' as const, text: 'Ready. Type "help" to see available commands.' },
    ];

    if (currentLab?.id) {
      const saved = localStorage.getItem(`terminal_history_${currentLab.id}`);
      if (saved) {
        try {
          setHistory(JSON.parse(saved));
        } catch (e) {
          setHistory(defaultHistory);
        }
      } else {
        setHistory(defaultHistory);
      }
    } else {
      setHistory(defaultHistory);
    }
  }, [currentLab?.id]);

  // Save persistence (To browser localStorage)
  useEffect(() => {
    if (currentLab?.id && history.length > 0) {
      localStorage.setItem(`terminal_history_${currentLab.id}`, JSON.stringify(history));
    }
  }, [history, currentLab?.id]);

  useEffect(() => {
    if (externalLogs && externalLogs.length > 0) {
      setHistory(prev => [...prev, ...externalLogs]);
    }
  }, [externalLogs]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const resetTerminal = () => {
    const defaultHistory = [
      { type: 'output' as const, text: 'Initializing DebugToDeploy Cloud Sandbox...' },
      { type: 'output' as const, text: 'Connected to node: d2d-worker-01 (Ubuntu 22.04 LTS)' },
      { type: 'success' as const, text: 'Ready. Type "help" to see available commands.' },
    ];
    setHistory(defaultHistory);
    if (currentLab?.id) {
      localStorage.removeItem(`terminal_history_${currentLab.id}`);
    }
  };

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const cmd = input.trim().toLowerCase();
    const newHistory = [...history, { type: 'input' as const, text: `$ ${input}` }];
    setCommandHistory([input, ...commandHistory]);
    setHistoryIndex(-1);
    setInput('');

    // Simulated Processing
    setHistory([...newHistory, { type: 'output', text: '...' }]);
    
    setTimeout(() => {
      let response: { type: 'output' | 'error' | 'success', text: string }[] = [];
      
      if (cmd === 'help') {
        response = [
          { type: 'output', text: 'Available commands:' },
          { type: 'output', text: '  ls - List files' },
          { type: 'output', text: '  cat <file> - View file content' },
          { type: 'output', text: '  kubectl get pods - List Kubernetes pods' },
          { type: 'output', text: '  docker ps - List running containers' },
          { type: 'output', text: '  terraform plan - Preview infrastructure changes' },
          { type: 'output', text: '  clear - Clear terminal' },
        ];
      } else if (cmd === 'clear') {
        setHistory([]);
        return;
      } else if (cmd.startsWith('kubectl get pods')) {
        response = [
          { type: 'output', text: 'NAME                     READY   STATUS    RESTARTS   AGE' },
          { type: 'output', text: 'api-gateway-v1           1/1     Running   0          12m' },
          { type: 'error', text: 'auth-service-db-0        0/1     Pending   5          1m' },
          { type: 'output', text: 'frontend-deploy-xyz      1/1     Running   0          45m' },
        ];
      } else if (cmd.startsWith('docker ps')) {
        response = [
          { type: 'output', text: 'CONTAINER ID   IMAGE          COMMAND                  STATUS          NAMES' },
          { type: 'output', text: '8f2d1e3c4b5a   redis:latest   "docker-entrypoint.s…"   Up 2 hours      cache-db' },
        ];
      } else if (cmd === 'ls') {
        response = [{ type: 'output', text: 'manifest.yaml  deployment.yaml  service.yaml  README.md' }];
      } else if (cmd.startsWith('cat')) {
        const file = cmd.split(' ')[1];
        if (file === 'manifest.yaml' || file === 'deployment.yaml') {
          const lines = (currentCode || 'File is empty').split('\n');
          response = lines.map(line => ({ type: 'output' as const, text: line }));
        } else {
          response = [{ type: 'error', text: `cat: ${file}: No such file or directory` }];
        }
      } else {
        response = [{ type: 'error', text: `command not found: ${cmd}` }];
      }

      setHistory([...newHistory, ...response]);
      if (onCommand) onCommand(cmd);
    }, 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIndex = historyIndex + 1;
      if (nextIndex < commandHistory.length) {
        setHistoryIndex(nextIndex);
        setInput(commandHistory[nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = historyIndex - 1;
      if (nextIndex >= 0) {
        setHistoryIndex(nextIndex);
        setInput(commandHistory[nextIndex]);
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  return (
    <div className="relative h-[400px] bg-slate-950 rounded-3xl border-4 border-slate-800 shadow-3xl overflow-hidden font-mono text-sm group">
      {/* Terminal Header */}
      <div className="bg-slate-900 px-6 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-soft-red/50" />
            <div className="w-3 h-3 rounded-full bg-soft-orange/50" />
            <div className="w-3 h-3 rounded-full bg-soft-green/50" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <TerminalIcon className="w-3 h-3" /> CLOUDSHELL: ubuntu@d2d-cluster
          </span>
        </div>
        <div className="flex items-center gap-4">
          {isRealPro && (
             <span className="text-[9px] font-black bg-soft-blue/10 text-soft-blue px-2 py-0.5 rounded-full border border-soft-blue/20">
               PRO SANDBOX
             </span>
          )}
          <RefreshCw 
            onClick={resetTerminal}
            className="w-4 h-4 text-slate-600 hover:text-slate-400 cursor-pointer transition-colors" 
          />
        </div>
      </div>

      {/* Terminal Content */}
      <div 
        ref={scrollRef}
        className="p-6 h-[calc(100%-100px)] overflow-y-auto space-y-2 scrollbar-hide"
        onClick={() => inputRef.current?.focus()}
      >
        {history.map((line, i) => (
          <div key={i} className={cn(
            "break-all leading-relaxed",
            line.type === 'input' ? "text-white font-black" :
            line.type === 'error' ? "text-soft-red" :
            line.type === 'success' ? "text-soft-green" :
            "text-slate-400"
          )}>
            {line.text}
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-slate-950 border-t border-slate-800/50">
        <form onSubmit={handleCommand} className="flex gap-3">
          <span className="text-soft-blue font-black">$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isUnlocked}
            className="flex-1 bg-transparent border-none outline-hidden text-white placeholder-slate-700"
            placeholder={isUnlocked ? "type a command..." : "Upgrade to Pro to use terminal"}
          />
        </form>
      </div>

      {/* Pro Overlay */}
      {!isUnlocked && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6 z-20">
          <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center border-2 border-slate-800 shadow-2xl">
            <Lock className="w-8 h-8 text-soft-blue" />
          </div>
          <div className="space-y-2">
            <h4 className="text-xl font-black text-white italic">Cloud Sandbox Locked</h4>
            <p className="text-slate-400 text-xs font-bold max-w-xs mx-auto leading-relaxed">
              Unlock the interactive cloud terminal to run real commands and solve labs in a persistent sandbox environment.
            </p>
          </div>
          <button className="btn-pill bg-soft-blue text-white flex items-center gap-2 px-8 shadow-2xl hover:scale-105 active:scale-95 transition-all">
             <Zap className="w-4 h-4" /> UPGRADE TO PRO
          </button>
        </div>
      )}
    </div>
  );
}
