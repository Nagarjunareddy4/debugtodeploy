import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal as TerminalIcon, RefreshCw, Lock, Zap, Wifi, WifiOff, Sparkles, Copy, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

interface HistoryLine {
  type: 'input' | 'output' | 'error' | 'success' | 'info' | 'ai';
  text: string;
  id?: number;
}

interface TerminalProps {
  isUnlocked: boolean;
  isRealPro?: boolean;
  onCommand?: (cmd: string) => void;
  currentLab?: any;
  currentCode?: string;
  externalLogs?: { type: 'output' | 'error' | 'success'; text: string }[];
}

// ── Static command responses (fast, no API call) ─────────────────
const STATIC_COMMANDS: Record<string, HistoryLine[]> = {
  help: [
    { type: 'info',    text: '╔══════════════════════════════════════════╗' },
    { type: 'info',    text: '║   DebugToDeploy CloudShell v2.0          ║' },
    { type: 'info',    text: '╚══════════════════════════════════════════╝' },
    { type: 'output',  text: '' },
    { type: 'output',  text: '📦 Container & Orchestration' },
    { type: 'output',  text: '  kubectl get pods|nodes|svc|deployments' },
    { type: 'output',  text: '  kubectl describe pod <name>' },
    { type: 'output',  text: '  kubectl apply -f deployment.yaml' },
    { type: 'output',  text: '  kubectl logs <pod-name>' },
    { type: 'output',  text: '  docker ps | docker images | docker run' },
    { type: 'output',  text: '' },
    { type: 'output',  text: '☁️  Infrastructure as Code' },
    { type: 'output',  text: '  terraform plan | terraform apply' },
    { type: 'output',  text: '  helm list | helm install | helm upgrade' },
    { type: 'output',  text: '' },
    { type: 'output',  text: '🔧 System & Files' },
    { type: 'output',  text: '  ls | cat <file> | pwd | whoami | df -h' },
    { type: 'output',  text: '  ps aux | top | netstat -tulpn' },
    { type: 'output',  text: '' },
    { type: 'output',  text: '🤖 AI Commands' },
    { type: 'output',  text: '  ai explain <error>  — AI explains any error' },
    { type: 'output',  text: '  ai fix              — AI suggests a fix' },
    { type: 'output',  text: '  ai hint             — Get a lab hint' },
    { type: 'output',  text: '' },
    { type: 'output',  text: '  clear | reset | history' },
  ],
  ls: [
    { type: 'output', text: 'total 24' },
    { type: 'output', text: 'drwxr-xr-x  2 ubuntu ubuntu 4096 May 15 18:00 .' },
    { type: 'output', text: '-rw-r--r--  1 ubuntu ubuntu  892 May 15 18:00 deployment.yaml' },
    { type: 'output', text: '-rw-r--r--  1 ubuntu ubuntu  441 May 15 18:00 service.yaml' },
    { type: 'output', text: '-rw-r--r--  1 ubuntu ubuntu  298 May 15 18:00 configmap.yaml' },
    { type: 'output', text: '-rw-r--r--  1 ubuntu ubuntu  156 May 15 18:00 README.md' },
  ],
  pwd: [{ type: 'output', text: '/home/ubuntu/lab-workspace' }],
  whoami: [{ type: 'output', text: 'ubuntu' }],
  'df -h': [
    { type: 'output', text: 'Filesystem      Size  Used Avail Use% Mounted on' },
    { type: 'output', text: '/dev/sda1        50G   12G   36G  25% /' },
    { type: 'output', text: 'tmpfs           2.0G     0  2.0G   0% /dev/shm' },
  ],
  'ps aux': [
    { type: 'output', text: 'USER       PID %CPU %MEM COMMAND' },
    { type: 'output', text: 'ubuntu       1  0.0  0.1 /bin/bash' },
    { type: 'output', text: 'root       112  0.2  1.4 kubelet --config /etc/kubernetes' },
    { type: 'output', text: 'root       289  0.1  0.8 containerd' },
  ],
  'kubectl get nodes': [
    { type: 'output', text: 'NAME                STATUS   ROLES           AGE   VERSION' },
    { type: 'success', text: 'd2d-control-01      Ready    control-plane   14d   v1.29.2' },
    { type: 'success', text: 'd2d-worker-01       Ready    worker          14d   v1.29.2' },
    { type: 'success', text: 'd2d-worker-02       Ready    worker          14d   v1.29.2' },
  ],
  'kubectl get pods': [
    { type: 'output', text: 'NAME                                    READY   STATUS             RESTARTS   AGE' },
    { type: 'success', text: 'api-gateway-7d6f8c9b4-xk2pq             1/1     Running            0          42m' },
    { type: 'error',   text: 'auth-service-6c5d7b8a9-mn3rs            0/1     CrashLoopBackOff   5          8m' },
    { type: 'output', text: 'frontend-deploy-58f9b7d6c-wq4vt          1/1     Running            0          1h' },
    { type: 'error',   text: 'db-migration-job-xp9f2                  0/1     ImagePullBackOff   0          3m' },
  ],
  'kubectl get svc': [
    { type: 'output', text: 'NAME           TYPE           CLUSTER-IP      EXTERNAL-IP     PORT(S)        AGE' },
    { type: 'output', text: 'kubernetes     ClusterIP      10.96.0.1       <none>          443/TCP        14d' },
    { type: 'output', text: 'api-gateway    LoadBalancer   10.100.12.45    34.90.123.11    80:30080/TCP   42m' },
    { type: 'output', text: 'auth-service   ClusterIP      10.100.18.92    <none>          8080/TCP       8m' },
  ],
  'kubectl get deployments': [
    { type: 'output', text: 'NAME             READY   UP-TO-DATE   AVAILABLE   AGE' },
    { type: 'success', text: 'api-gateway      1/1     1            1           42m' },
    { type: 'error',   text: 'auth-service     0/1     1            0           8m' },
    { type: 'success', text: 'frontend         1/1     1            1           1h' },
  ],
  'kubectl get namespaces': [
    { type: 'output', text: 'NAME              STATUS   AGE' },
    { type: 'output', text: 'default           Active   14d' },
    { type: 'output', text: 'kube-system       Active   14d' },
    { type: 'output', text: 'monitoring        Active   5d' },
    { type: 'output', text: 'staging           Active   2d' },
  ],
  'docker ps': [
    { type: 'output', text: 'CONTAINER ID   IMAGE                    STATUS          NAMES' },
    { type: 'output', text: '8f2d1e3c4b5a   redis:7.0                Up 2 hours      cache' },
    { type: 'output', text: 'c3a9b7e2f1d4   postgres:15              Up 2 hours      db' },
    { type: 'error',   text: '9e4c8a1b5f3d   myapp:latest             Exited (1)      app' },
  ],
  'docker images': [
    { type: 'output', text: 'REPOSITORY         TAG       IMAGE ID       SIZE' },
    { type: 'output', text: 'myapp              latest    f3c2a1b4e9d7   245MB' },
    { type: 'output', text: 'redis              7.0       a1b3c5d7e9f2   130MB' },
    { type: 'output', text: 'postgres           15        b2c4d6e8f0a1   379MB' },
    { type: 'output', text: 'nginx              alpine    c3d5e7f9b1a2   41MB' },
  ],
  'terraform plan': [
    { type: 'info',    text: 'Refreshing Terraform state...' },
    { type: 'output',  text: '' },
    { type: 'output',  text: 'Terraform will perform the following actions:' },
    { type: 'success', text: '  + aws_instance.web_server (ami-0c55b159cbfafe1f0)' },
    { type: 'success', text: '  + aws_security_group.allow_http' },
    { type: 'output',  text: '  ~ aws_s3_bucket.assets (tags only)' },
    { type: 'output',  text: '' },
    { type: 'info',    text: 'Plan: 2 to add, 1 to change, 0 to destroy.' },
  ],
  'helm list': [
    { type: 'output', text: 'NAME            NAMESPACE   REVISION  STATUS    CHART' },
    { type: 'output', text: 'nginx-ingress   default     3         deployed  ingress-nginx-4.9.1' },
    { type: 'output', text: 'prometheus      monitoring  1         deployed  prometheus-25.8.0' },
    { type: 'output', text: 'cert-manager    kube-system 2         deployed  cert-manager-1.13.3' },
  ],
  history: [], // populated dynamically
};

let lineIdCounter = 0;
const mkLine = (type: HistoryLine['type'], text: string): HistoryLine =>
  ({ type, text, id: ++lineIdCounter });

export default function Terminal({
  isUnlocked, isRealPro, onCommand, currentLab, currentCode, externalLogs,
}: TerminalProps) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<HistoryLine[]>([]);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [aiLoading, setAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Boot sequence
  useEffect(() => {
    const boot: HistoryLine[] = [
      mkLine('info',    '████████████████████████████████████████'),
      mkLine('info',    '█  DebugToDeploy CloudShell v2.0        █'),
      mkLine('info',    '████████████████████████████████████████'),
      mkLine('output',  ''),
      mkLine('success', '✓ Connected to: d2d-cluster (Kubernetes v1.29.2)'),
      mkLine('success', '✓ Node: d2d-worker-01 | Ubuntu 22.04 LTS'),
      mkLine('success', '✓ kubectl, docker, terraform, helm — ready'),
      mkLine('output',  ''),
      mkLine('info',    '💡 Type "help" to see all available commands'),
      mkLine('info',    '🤖 Type "ai hint" for an AI-powered lab hint'),
      mkLine('output',  ''),
    ];

    const saved = currentLab?.id
      ? localStorage.getItem(`d2d_terminal_${currentLab.id}`)
      : null;

    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch { setHistory(boot); }
    } else {
      setHistory(boot);
    }
  }, [currentLab?.id]);

  // Persist
  useEffect(() => {
    if (currentLab?.id && history.length > 0) {
      localStorage.setItem(`d2d_terminal_${currentLab.id}`, JSON.stringify(history.slice(-200)));
    }
  }, [history, currentLab?.id]);

  // External logs (from RUN LAB button)
  useEffect(() => {
    if (externalLogs && externalLogs.length > 0) {
      setHistory(prev => [...prev, ...externalLogs.map(l => mkLine(l.type, l.text))]);
    }
  }, [externalLogs]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const append = useCallback((lines: HistoryLine[]) => {
    setHistory(prev => [...prev, ...lines]);
  }, []);

  const callAI = async (prompt: string, systemPrompt?: string): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/openai-proxy?path=v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt || `You are a DevOps terminal assistant running inside a Kubernetes lab environment.
Lab context: ${currentLab?.title || 'General DevOps Lab'}
Current YAML in editor:
\`\`\`yaml
${currentCode || '(empty)'}
\`\`\`
Give SHORT, precise, terminal-style answers (under 120 words). Use bullet points. No markdown headers.`,
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 350,
        temperature: 0.2,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No response.';
  };

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = input.trim();
    if (!raw) return;

    setCmdHistory(prev => [raw, ...prev]);
    setHistIdx(-1);
    setInput('');

    const cmd = raw.toLowerCase();
    append([mkLine('input', `$ ${raw}`)]);

    // ── clear / reset ──
    if (cmd === 'clear' || cmd === 'reset') {
      setHistory([mkLine('success', '✓ Terminal cleared.')]);
      return;
    }

    // ── history ──
    if (cmd === 'history') {
      append(cmdHistory.map((c, i) => mkLine('output', `  ${i + 1}  ${c}`)));
      return;
    }

    // ── kubectl apply ──
    if (cmd === 'kubectl apply -f deployment.yaml' || cmd === 'kubectl apply -f manifest.yaml') {
      append([mkLine('info', 'Applying manifests to cluster...')]);
      setTimeout(() => {
        if (onCommand) onCommand(cmd);
        append([
          mkLine('success', 'deployment.apps/app configured'),
          mkLine('success', 'service/app-svc configured'),
          mkLine('info',    'Use "kubectl get pods" to verify rollout'),
        ]);
      }, 800);
      return;
    }

    // ── kubectl logs ──
    if (cmd.startsWith('kubectl logs')) {
      const pod = raw.split(' ').slice(2).join(' ') || '<pod>';
      append([
        mkLine('output', `Logs for pod: ${pod}`),
        mkLine('output', '2024-05-15T10:23:11Z INFO  Starting application...'),
        mkLine('output', '2024-05-15T10:23:12Z INFO  Connecting to database...'),
        mkLine('error',  '2024-05-15T10:23:13Z ERROR dial tcp: connection refused'),
        mkLine('info',   'Tip: run "kubectl describe pod <name>" for more info'),
      ]);
      return;
    }

    // ── kubectl describe ──
    if (cmd.startsWith('kubectl describe')) {
      append([
        mkLine('output', `Name:   ${raw.split(' ').slice(3).join(' ') || 'app-pod'}`),
        mkLine('output', 'Namespace: default'),
        mkLine('output', 'Status:    Pending'),
        mkLine('error',  'Events: Warning  BackOff  Back-off pulling image "myapp:latest"'),
        mkLine('info',   '→ Check image name and registry credentials'),
      ]);
      return;
    }

    // ── docker run ──
    if (cmd.startsWith('docker run')) {
      append([
        mkLine('info',   'Pulling image...'),
      ]);
      setTimeout(() => {
        append([
          mkLine('success', 'Container started: 7c3a9b2e1f4d'),
          mkLine('output',  'Use "docker ps" to verify it is running'),
        ]);
      }, 600);
      return;
    }

    // ── cat file ──
    if (cmd.startsWith('cat ')) {
      const file = raw.split(' ')[1];
      if (file === 'deployment.yaml' || file === 'manifest.yaml') {
        const lines = (currentCode || '(empty)').split('\n');
        append(lines.map(l => mkLine('output', l)));
      } else {
        append([mkLine('error', `cat: ${file}: No such file or directory`)]);
      }
      return;
    }

    // ── terraform apply ──
    if (cmd === 'terraform apply') {
      append([mkLine('info', 'Acquiring state lock...')]);
      setTimeout(() => {
        append([
          mkLine('success', 'aws_instance.web_server: Creating...'),
          mkLine('success', 'aws_security_group.allow_http: Creating...'),
          mkLine('success', 'Apply complete! Resources: 2 added, 1 changed.'),
          mkLine('output',  'Outputs: public_ip = "34.90.123.11"'),
        ]);
      }, 1000);
      return;
    }

    // ── AI commands ──
    if (cmd.startsWith('ai ')) {
      const aiCmd = cmd.slice(3).trim();
      let prompt = '';

      if (aiCmd === 'hint') {
        prompt = `Give me a short hint for this lab step. Lab: ${currentLab?.title}. Current step description: ${currentLab?.steps?.[0]?.description || 'Unknown'}`;
      } else if (aiCmd === 'fix') {
        prompt = `Look at my YAML and suggest what to fix. Be specific and brief.`;
      } else if (aiCmd.startsWith('explain ')) {
        prompt = `Explain this DevOps error in simple terms: "${aiCmd.slice(8)}"`;
      } else {
        prompt = aiCmd;
      }

      setAiLoading(true);
      append([mkLine('ai', '🤖 AI thinking...')]);
      try {
        const answer = await callAI(prompt);
        setHistory(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = mkLine('ai', '');
          return updated;
        });
        answer.split('\n').forEach(line => {
          if (line.trim()) append([mkLine('ai', `  ${line}`)]);
        });
      } catch {
        append([mkLine('error', 'AI service unavailable. Try again.')]);
      } finally {
        setAiLoading(false);
      }
      return;
    }

    // ── Static commands ──
    const staticKey = Object.keys(STATIC_COMMANDS).find(k => cmd === k || cmd.startsWith(k));
    if (staticKey) {
      append(STATIC_COMMANDS[staticKey].map(l => mkLine(l.type, l.text)));
      return;
    }

    // ── Dynamic AI Simulation ──
    setAiLoading(true);
    try {
      const systemPrompt = `You are a real Linux Bash / Kubernetes terminal simulator running on an Ubuntu worker node.
The current workspace directory is /home/ubuntu/lab-workspace.
The active manifest.yaml is:
\`\`\`yaml
${currentCode || '(empty)'}
\`\`\`
The user typed the command: "${raw}".
Execute the command and return ONLY the raw terminal standard output or standard error (stdout/stderr) of this command. Do NOT wrap it in markdown code blocks, do NOT write explanations, do NOT be conversational. Return exactly what a Linux terminal would print.`;
      
      const answer = await callAI(`Execute command: "${raw}"`, systemPrompt);
      setAiLoading(false);
      
      const lines = answer.split('\n');
      append(lines.map(line => {
        const lower = line.toLowerCase();
        if (lower.includes('error:') || lower.includes('failed:') || lower.includes('crash') || lower.includes('backoff')) {
          return mkLine('error', line);
        }
        if (lower.includes('success') || lower.includes('successfully') || lower.includes('ready') || lower.includes('configured')) {
          return mkLine('success', line);
        }
        return mkLine('output', line);
      }));
    } catch {
      setAiLoading(false);
      append([
        mkLine('error',  `command not found: ${raw.split(' ')[0]}`),
        mkLine('info',   'Type "help" to see available commands'),
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(histIdx + 1, cmdHistory.length - 1);
      setHistIdx(next);
      setInput(cmdHistory[next] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = histIdx - 1;
      if (next < 0) { setHistIdx(-1); setInput(''); }
      else { setHistIdx(next); setInput(cmdHistory[next]); }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Tab completion for kubectl
      const completions: Record<string, string> = {
        'kub': 'kubectl get pods',
        'kubectl g': 'kubectl get pods',
        'docker': 'docker ps',
        'ter': 'terraform plan',
        'helm': 'helm list',
        'ai h': 'ai hint',
        'ai f': 'ai fix',
      };
      for (const [prefix, complete] of Object.entries(completions)) {
        if (input.toLowerCase().startsWith(prefix)) { setInput(complete); break; }
      }
    }
  };

  const copyHistory = () => {
    const text = history.map(l => l.text).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLineClass = (type: HistoryLine['type']) => {
    switch (type) {
      case 'input':   return 'text-white font-bold';
      case 'error':   return 'text-red-400';
      case 'success': return 'text-green-400';
      case 'info':    return 'text-sky-400';
      case 'ai':      return 'text-purple-400 italic';
      default:        return 'text-slate-300';
    }
  };

  return (
    <div
      className="relative flex flex-col bg-[#0d1117] rounded-3xl border-2 border-slate-700 shadow-2xl overflow-hidden font-mono text-sm"
      style={{ minHeight: '420px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#161b22] border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <TerminalIcon className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              ubuntu@d2d-cluster:~/lab-workspace
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isRealPro && (
            <span className="text-[9px] font-black bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded-full border border-sky-500/20 flex items-center gap-1">
              <Wifi className="w-2.5 h-2.5" /> LIVE SANDBOX
            </span>
          )}
          <button onClick={copyHistory} className="text-slate-500 hover:text-slate-300 transition-colors" title="Copy output">
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => {
              setHistory([mkLine('success', '✓ Terminal cleared. Type "help" to start.')]);
              if (currentLab?.id) localStorage.removeItem(`d2d_terminal_${currentLab.id}`);
            }}
            className="text-slate-500 hover:text-slate-300 transition-colors"
            title="Clear terminal"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Output */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 space-y-0.5 cursor-text"
        style={{ minHeight: '320px' }}
        onClick={() => inputRef.current?.focus()}
      >
        {history.map((line, i) => (
          <div key={line.id ?? i} className={cn('break-all leading-relaxed text-[13px]', getLineClass(line.type))}>
            {line.text || '\u00A0'}
          </div>
        ))}
        {aiLoading && (
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="text-purple-400 text-[13px]"
          >
            🤖 AI generating response...
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 px-5 py-3 bg-[#0d1117] border-t border-slate-700">
        <form onSubmit={handleCommand} className="flex items-center gap-2">
          <span className="text-green-400 font-bold select-none">$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isUnlocked || aiLoading}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="flex-1 bg-transparent border-none outline-none text-white text-[13px] placeholder-slate-600 caret-green-400"
            placeholder={isUnlocked ? 'type a command or "ai hint"…' : 'Upgrade to Pro to use terminal'}
          />
          {aiLoading && <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />}
        </form>
      </div>

      {/* Locked overlay */}
      {!isUnlocked && (
        <div className="absolute inset-0 bg-[#0d1117]/90 backdrop-blur-sm flex flex-col items-center justify-center gap-6 text-center p-8 z-20">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center border-2 border-slate-700 shadow-2xl">
            <Lock className="w-8 h-8 text-sky-400" />
          </div>
          <div className="space-y-2">
            <h4 className="text-xl font-black text-white italic">Cloud Sandbox Locked</h4>
            <p className="text-slate-400 text-xs font-bold max-w-xs leading-relaxed">
              Unlock the AI-powered interactive terminal — run real kubectl, docker, terraform, and helm commands.
            </p>
          </div>
          <button className="btn-pill bg-sky-500 text-white flex items-center gap-2 px-8 shadow-2xl hover:scale-105 active:scale-95 transition-all font-black text-sm">
            <Zap className="w-4 h-4" /> Upgrade to Pro
          </button>
        </div>
      )}
    </div>
  );
}
