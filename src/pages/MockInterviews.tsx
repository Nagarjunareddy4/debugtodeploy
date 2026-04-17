import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, MicOff,
  Video, VideoOff,
  MessageSquare, 
  Brain, 
  Clock, 
  Zap,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  SkipForward,
  CheckCircle2,
  Phone,
  PhoneOff,
  User
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { isLimitReached, incrementUsage, getLimitMessage } from '../lib/usageLimit';

const interviewScenarios = [
  {
    id: '1',
    title: 'Kubernetes Networking & Core',
    level: 'Hard',
    questions: [
      'Explain the difference between a ReplicaSet and a Deployment in Kubernetes. When would you use one over the other?',
      'How does Kubernetes networking work? Explain the CNI plugin model.',
      'What is a Service in Kubernetes and what are the different Service types?',
      'Explain how Kubernetes handles pod scheduling and what factors influence it.',
      'What is etcd and what role does it play in a Kubernetes cluster?',
      'How would you debug a pod stuck in CrashLoopBackOff?',
    ],
    duration: '25m',
    icon: Zap,
    color: 'soft-blue',
  },
  {
    id: '2',
    title: 'Terraform & Infrastructure as Code',
    level: 'Medium',
    questions: [
      'What is Terraform state and why is it important?',
      'Explain the difference between terraform plan and terraform apply.',
      'How do you manage secrets in Terraform?',
      'What are Terraform modules and when would you use them?',
      'How do you handle Terraform state in a team environment?',
    ],
    duration: '15m',
    icon: Brain,
    color: 'soft-purple',
  },
  {
    id: '3',
    title: 'CI/CD & GitHub Actions',
    level: 'Easy',
    questions: [
      'What is the difference between continuous integration and continuous deployment?',
      'How would you structure a GitHub Actions workflow for a Node.js app?',
      'How do you handle secrets in GitHub Actions?',
      'What are self-hosted runners and when would you use them?',
      'How do you implement rollback in a CI/CD pipeline?',
    ],
    duration: '10m',
    icon: Sparkles,
    color: 'soft-green',
  },
];

type InterviewMode = 'text' | 'audio' | 'video';

export default function MockInterviews() {
  const [activeTab, setActiveTab] = useState<'browse' | 'session' | 'evaluation'>('browse');
  const [selectedScenario, setSelectedScenario] = useState<any>(null);
  const [mode, setMode] = useState<InterviewMode>('text');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [history, setHistory] = useState<Array<{q: string, a: string, f: string, score: number}>>([]);
  const [micActive, setMicActive] = useState(false);
  const [videoActive, setVideoActive] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [completedQuestions, setCompletedQuestions] = useState<Set<number>>(new Set());
  const [aiResponse, setAiResponse] = useState('');
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [isPro, setIsPro] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
          if (data) {
            setProfile(data);
            setIsPro(data.subscription_status === 'pro');
          }
        });
      }
    });
  }, []);

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    // Use an English voice if available, default rate/pitch
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    // Speak the question automatically when it arrives, only if activeTab is session
    if (activeTab === 'session' && selectedScenario?.questions?.[currentQuestion]) {
      speak(selectedScenario.questions[currentQuestion]);
    }
  }, [currentQuestion, activeTab, selectedScenario]);

  const startSession = (scenario: any) => {
    if (isLimitReached('interview', isPro)) {
      alert(getLimitMessage('interview'));
      return;
    }
    incrementUsage('interview');
    setSelectedScenario(scenario);
    setCurrentQuestion(0);
    setCompletedQuestions(new Set());
    setHistory([]);
    setAiResponse('');
    setUserAnswer('');
    setActiveTab('session');
    setMode('text');
    setCallActive(false);
    setMicActive(false);
    setVideoActive(false);
  };

  const startVideoCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      // Assign stream immediately before React state update
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setVideoActive(true);
      setMicActive(true);
      setCallActive(true);
    } catch {
      alert('Camera/microphone access denied. Please allow permissions in your browser and try again.');
    }
  };

  const stopVideoCall = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setVideoActive(false);
    setMicActive(false);
    setCallActive(false);
  };

  const toggleMic = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    }
    setMicActive(prev => !prev);
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    }
    setVideoActive(prev => !prev);
  };

  const goToNextQuestion = () => {
    const total = selectedScenario?.questions?.length || 0;
    if (currentQuestion < total - 1) {
      setCompletedQuestions(prev => new Set([...prev, currentQuestion]));
      setCurrentQuestion(prev => prev + 1);
      setAiResponse('');
      setUserAnswer('');
    }
  };

  const markComplete = () => {
    setCompletedQuestions(prev => new Set([...prev, currentQuestion]));
  };

  const getAiFeedback = async () => {
    if (!userAnswer.trim()) return;
    setIsLoadingResponse(true);
    setAiResponse('');
    try {
      const apiKey = (window as any).OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) {
        setAiResponse('OpenAI API key not configured. Please add it in Settings.');
        return;
      }
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: `You are a senior technical interviewer. Evaluate the candidate's answer.
If the answer is wrong or incomplete, CLARIFY the accurate knowledge and politely correct them.
Give specific, concise technical feedback. 
CRITICAL: You MUST end your entire response perfectly with a score out of 10 in brackets, like this: [8/10]. Do not miss this.` },
            { role: 'user', content: `Question: ${selectedScenario.questions[currentQuestion]}\n\nCandidate answer: ${userAnswer}` },
          ],
          max_tokens: 400,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      
      const content = data.choices?.[0]?.message?.content || 'No feedback generated. [0/10]';
      
      // Parse score from the response, fallback to 0
      const scoreMatch = content.match(/\[(\d+)\/10\]/);
      const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 5;
      const cleanFeedback = content.replace(/\[\d+\/10\]/, '').trim();
      
      setAiResponse(cleanFeedback);
      speak(cleanFeedback);
      
      setHistory(prev => {
         const newHistory = [...prev];
         newHistory[currentQuestion] = {
           q: selectedScenario.questions[currentQuestion],
           a: userAnswer,
           f: cleanFeedback,
           score
         };
         return newHistory;
      });
      markComplete();
    } catch (err: any) {
      setAiResponse(`Error: ${err.message}`);
    } finally {
      setIsLoadingResponse(false);
    }
  };

  const finishInterview = () => {
    window.speechSynthesis.cancel();
    stopVideoCall();
    setActiveTab('evaluation');
  };

  const totalQuestions = selectedScenario?.questions?.length || 0;
  const isLastQuestion = currentQuestion === totalQuestions - 1;

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24">
      <header className="space-y-4">
        <h2 className="text-5xl font-black tracking-tighter">AI Mock Interviews</h2>
        <p className="text-text-dim font-bold uppercase tracking-widest text-sm flex items-center gap-2">
           <Zap className="w-4 h-4 text-soft-orange" /> Sharpen your technical edge with real-time feedback
        </p>
      </header>

      <AnimatePresence mode="wait">
        {(() => {
          if (activeTab === 'browse') {
            return (
          <motion.div 
            key="browse"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {interviewScenarios.map((scenario) => (
              <div 
                key={scenario.id}
                className="playful-card flex flex-col group hover:scale-[1.02] transition-all cursor-pointer"
                onClick={() => startSession(scenario)}
              >
                <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center mb-6 shadow-xl", `bg-${scenario.color} text-white`)}>
                  <scenario.icon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black tracking-tight mb-2">{scenario.title}</h3>
                <div className="flex gap-4 mb-8">
                  <div className="flex items-center gap-1 text-[10px] font-black uppercase text-text-dim">
                    <Clock className="w-3 h-3" /> {scenario.duration}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-black uppercase text-text-dim">
                    <MessageSquare className="w-3 h-3" /> {scenario.questions.length} Qs
                  </div>
                </div>
                <div className="mt-auto pt-6 border-t border-border/50 flex items-center justify-between">
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", `text-${scenario.color}`)}>{scenario.level}</span>
                  <button className="flex items-center gap-1 font-black text-sm group-hover:gap-2 transition-all">
                    START <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        );
      }
      if (activeTab === 'session') {
        return (
              <motion.div 
            key="session"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="space-y-6"
          >
            {/* Mode selector + header */}
            <div className="playful-card p-6 border-none bg-surface shadow-2xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <button onClick={() => { setActiveTab('browse'); stopVideoCall(); window.speechSynthesis.cancel(); }} className="p-2 hover:bg-border rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h3 className="font-black text-xl">{selectedScenario?.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 rounded-full bg-soft-green animate-pulse" />
                      <span className="text-[10px] font-black uppercase text-text-dim">AI Interviewer Active</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-soft-blue uppercase tracking-widest bg-soft-blue/10 px-4 py-2 rounded-full border-2 border-soft-blue/20">
                    Q {currentQuestion + 1} / {totalQuestions}
                  </span>
                  {/* Mode Switcher */}
                  <div className="flex bg-brand-bg rounded-2xl border-2 border-border p-1 gap-1">
                    {(['text', 'audio', 'video'] as InterviewMode[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => { setMode(m); if (m !== 'video') stopVideoCall(); }}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          mode === m ? "bg-text-main text-surface shadow-md" : "text-text-dim hover:text-text-main"
                        )}
                      >
                        {m === 'text' ? '💬 Text' : m === 'audio' ? '🎙️ Audio' : '📹 Video'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Question progress pills */}
              <div className="flex gap-2 mt-6 flex-wrap">
                {selectedScenario?.questions?.map((_: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => { setCurrentQuestion(idx); setAiResponse(''); setUserAnswer(''); }}
                    className={cn(
                      "w-8 h-8 rounded-full text-xs font-black transition-all border-2",
                      completedQuestions.has(idx)
                        ? "bg-soft-green text-white border-soft-green"
                        : idx === currentQuestion
                        ? "bg-soft-blue text-white border-soft-blue scale-110 shadow-lg"
                        : "bg-brand-bg border-border text-text-dim hover:border-soft-blue"
                    )}
                  >
                    {completedQuestions.has(idx) ? '✓' : idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* VIDEO MODE */}
            {mode === 'video' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="playful-card p-0 border-none bg-text-main shadow-2xl overflow-hidden"
              >
                {/* Main video area */}
                <div className="relative bg-black rounded-t-[2rem] overflow-hidden" style={{ aspectRatio: '16/9', maxHeight: '420px' }}>
                  {/* Interviewer placeholder */}
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
                    <div className="text-center space-y-4">
                      <div className="w-24 h-24 rounded-full bg-soft-blue/20 flex items-center justify-center mx-auto border-4 border-soft-blue/30">
                        <Brain className="w-12 h-12 text-soft-blue" />
                      </div>
                      <p className="text-white/60 font-black text-xs uppercase tracking-widest">AI Interviewer</p>
                    </div>
                  </div>

                  {/* Question overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                    <p className="text-white font-bold text-sm leading-relaxed">
                      "{selectedScenario?.questions?.[currentQuestion]}"
                    </p>
                  </div>

                  {/* User camera (picture-in-picture) */}
                  <div className="absolute top-4 right-4 w-36 h-24 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-gray-900">
                    {videoActive ? (
                      <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt="You" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <User className="w-8 h-8 text-white/40" />
                            <span className="text-[9px] text-white/40 font-black uppercase">You</span>
                          </div>
                        )}
                      </div>
                    )}
                    {!micActive && callActive && (
                      <div className="absolute bottom-1 left-1 bg-red-500 rounded-full p-0.5">
                        <MicOff className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Work Score overlay - left side */}
                  <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-2xl p-4 min-w-[160px]">
                    <p className="text-white/60 text-[9px] font-black uppercase tracking-widest mb-3">Live Score</p>
                    {[
                      { label: 'Presentation', val: 72, color: '#f97316' },
                      { label: 'Clarity', val: 65, color: '#22d3ee' },
                      { label: 'Confidence', val: 80, color: '#4ade80' },
                    ].map(item => (
                      <div key={item.label} className="mb-2">
                        <div className="flex justify-between text-[9px] font-black text-white/70 mb-1">
                          <span>{item.label}</span><span>{item.val}%</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${item.val}%`, background: item.color }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Question List overlay - right side */}
                  <div className="absolute top-4 right-48 bg-black/60 backdrop-blur-sm rounded-2xl p-4 max-w-[200px] hidden lg:block">
                    <p className="text-white/60 text-[9px] font-black uppercase tracking-widest mb-3">Questions</p>
                    <div className="space-y-2">
                      {selectedScenario?.questions?.slice(0, 4).map((q: string, idx: number) => (
                        <div key={idx} className={cn(
                          "text-[9px] font-bold flex items-start gap-2 cursor-pointer",
                          idx === currentQuestion ? "text-soft-blue" : 
                          completedQuestions.has(idx) ? "text-soft-green" : "text-white/40"
                        )} onClick={() => { setCurrentQuestion(idx); setAiResponse(''); setUserAnswer(''); }}>
                          <span className={cn(
                            "w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[8px] font-black",
                            idx === currentQuestion ? "bg-soft-blue text-white" :
                            completedQuestions.has(idx) ? "bg-soft-green text-white" : "bg-white/10 text-white/40"
                          )}>{completedQuestions.has(idx) ? '✓' : idx + 1}</span>
                          <span className="line-clamp-2 leading-tight">{q.substring(0, 40)}...</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recording badge */}
                  {callActive && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-white text-[10px] font-black uppercase">Recording</span>
                    </div>
                  )}
                </div>

                {/* Video Controls bar */}
                <div className="p-6 flex items-center justify-between bg-text-main rounded-b-[2rem]">
                  {/* Left: reaction / note icons */}
                  <div className="flex items-center gap-3">
                    <button className="w-10 h-10 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all text-sm">💬</button>
                    <button className="w-10 h-10 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all text-sm">❤️</button>
                    <button className="w-10 h-10 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all text-sm">⭐</button>
                  </div>

                  {/* Center: main controls */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={toggleVideo}
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                        videoActive ? "bg-white/20 text-white hover:bg-white/30" : "bg-white/10 text-white/40 hover:bg-white/20"
                      )}
                    >
                      {videoActive ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={toggleMic}
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                        micActive ? "bg-white/20 text-white hover:bg-white/30" : "bg-white/10 text-white/40 hover:bg-white/20"
                      )}
                    >
                      {micActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                    </button>

                    {!callActive ? (
                      <button
                        onClick={startVideoCall}
                        className="w-16 h-16 bg-soft-green rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all"
                      >
                        <Phone className="w-7 h-7 text-white" />
                      </button>
                    ) : (
                      <button
                        onClick={stopVideoCall}
                        className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all"
                      >
                        <PhoneOff className="w-7 h-7 text-white" />
                      </button>
                    )}
                  </div>

                  {/* Right: next question */}
                  <div className="flex items-center gap-3">
                    {!isLastQuestion && (
                      <button
                        onClick={goToNextQuestion}
                        className="flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-all"
                      >
                        Next Q <SkipForward className="w-4 h-4" />
                      </button>
                    )}
                    {isLastQuestion && (
                      <button
                        onClick={finishInterview}
                        className="flex items-center gap-2 bg-soft-green/80 text-white px-4 py-2 rounded-full font-black text-xs uppercase tracking-widest hover:bg-soft-green transition-all"
                      >
                        Done <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TEXT / AUDIO MODE */}
            {(mode === 'text' || mode === 'audio') && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="playful-card min-h-[500px] flex flex-col p-0 border-none bg-surface shadow-2xl relative overflow-hidden"
              >
                <div className="flex-1 p-12 flex flex-col items-center justify-center text-center space-y-8">
                  <div className="w-24 h-24 bg-soft-blue/10 rounded-full flex items-center justify-center relative">
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 bg-soft-blue/20 rounded-full"
                    />
                    <Brain className="w-10 h-10 text-soft-blue relative z-10" />
                  </div>
                  <h4 className="text-2xl font-black max-w-2xl leading-tight">
                    "{selectedScenario?.questions?.[currentQuestion]}"
                  </h4>
                  {mode === 'audio' ? (
                    <div className="w-full max-w-md space-y-4">
                      <button
                        onClick={() => setMicActive(prev => !prev)}
                        className={cn(
                          "w-20 h-20 rounded-full shadow-2xl flex items-center justify-center mx-auto hover:scale-110 active:scale-95 transition-all",
                          micActive ? "bg-red-500 text-white animate-pulse" : "bg-text-main text-surface"
                        )}
                      >
                        {micActive ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                      </button>
                      <p className="text-text-dim font-bold uppercase tracking-[0.2em] text-[10px]">
                        {micActive ? 'Recording... Click to stop' : 'Click mic to start recording'}
                      </p>
                    </div>
                  ) : (
                    <div className="w-full max-w-2xl space-y-4">
                      <textarea
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="Type your answer here..."
                        rows={4}
                        className="w-full bg-brand-bg border-2 border-border rounded-2xl px-6 py-4 font-bold outline-none focus:border-soft-blue transition-colors resize-none text-sm"
                      />
                      <button
                        onClick={getAiFeedback}
                        disabled={isLoadingResponse || !userAnswer.trim()}
                        className="btn-pill bg-text-main text-surface px-8 py-3 flex items-center gap-2 mx-auto disabled:opacity-50"
                      >
                        {isLoadingResponse ? (
                          <><Sparkles className="w-4 h-4 animate-spin" /> Getting Feedback...</>
                        ) : (
                          <><Brain className="w-4 h-4" /> Get AI Feedback</>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* AI Feedback area */}
                {aiResponse && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-8 mb-6 p-6 bg-soft-blue/10 border-2 border-soft-blue/20 rounded-2xl"
                  >
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-soft-blue mb-3">
                      <Brain className="w-4 h-4" /> AI Feedback
                    </div>
                    <p className="text-sm font-bold leading-relaxed">{aiResponse}</p>
                  </motion.div>
                )}

                {/* Bottom controls */}
                <div className="p-8 border-t-2 border-border bg-brand-bg/30">
                  <div className="flex justify-center items-center gap-6">
                    <button
                      onClick={markComplete}
                      className={cn(
                        "flex items-center gap-2 px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest transition-all border-2",
                        completedQuestions.has(currentQuestion)
                          ? "bg-soft-green/10 border-soft-green text-soft-green"
                          : "bg-brand-bg border-border text-text-dim hover:border-soft-green"
                      )}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {completedQuestions.has(currentQuestion) ? 'Answered' : 'Mark Done'}
                    </button>

                    {!isLastQuestion ? (
                      <button
                        onClick={goToNextQuestion}
                        className="flex items-center gap-2 bg-text-main text-surface px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
                      >
                        Next Question <SkipForward className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={finishInterview}
                        className="flex items-center gap-2 bg-soft-green text-white px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
                      >
                        Finish Interview <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                </motion.div>
              )}
            </motion.div>
          );
        }
        return (
          <motion.div
            key="evaluation"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="space-y-8"
          >
            {/* OVERALL PERFORMANCE */}
            <div className="playful-card bg-surface shadow-2xl border-none space-y-6">
               <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div>
                    <h3 className="text-3xl font-black italic tracking-tighter">Interview Evaluation</h3>
                    <p className="font-bold text-text-dim text-sm uppercase tracking-widest">Performance Review for {selectedScenario?.title}</p>
                  </div>
                  
                  {(() => {
                     const answered = history.filter(Boolean);
                     const totalScore = answered.reduce((acc, h) => acc + h.score, 0);
                     const average = answered.length > 0 ? Math.round((totalScore / (totalQuestions * 10)) * 100) : 0;
                     return (
                        <div className="flex items-center gap-4 bg-brand-bg border-4 border-border px-8 py-4 rounded-3xl">
                          <div className="text-center">
                             <div className="text-[10px] font-black uppercase text-text-dim tracking-widest">Overall Score</div>
                             <div className={cn("text-4xl font-black", average >= 80 ? 'text-soft-green' : average >= 50 ? 'text-soft-orange' : 'text-red-500')}>
                               {average}%
                             </div>
                          </div>
                        </div>
                     );
                  })()}
               </div>
            </div>

            {/* DETAILED REVIEWS */}
            <div className="space-y-6">
               {history.map((record, i) => {
                 if (!record) return null;
                 return (
                   <div key={i} className="playful-card border-2 border-border/50 bg-brand-bg shadow-lg flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-4">
                         <div className="flex items-start gap-4">
                            <span className="w-8 h-8 flex items-center justify-center bg-soft-blue/10 text-soft-blue font-black rounded-full shrink-0">
                               {i + 1}
                            </span>
                            <div className="space-y-2">
                               <p className="font-bold text-lg leading-snug">Q: {record.q}</p>
                               <div className="bg-surface p-4 rounded-xl border border-border/50 flex gap-3 items-start">
                                  <User className="w-5 h-5 text-text-dim shrink-0" />
                                  <p className="text-sm font-bold text-text-dim">"{record.a}"</p>
                               </div>
                            </div>
                         </div>
                         <div className="bg-surface border-2 border-border px-3 py-1 rounded-full shrink-0">
                            <span className="text-xs font-black uppercase tracking-widest text-text-main">
                               {record.score} / 10
                            </span>
                         </div>
                      </div>

                      <div className="bg-soft-blue/5 border-l-4 border-soft-blue p-4 rounded-r-xl ml-12">
                         <div className="flex items-center gap-2 text-soft-blue font-black uppercase text-[10px] tracking-widest mb-1">
                            <Brain className="w-3 h-3" /> AI Analysis & Clarification
                         </div>
                         <p className="text-sm font-bold text-text-main leading-relaxed">{record.f}</p>
                      </div>
                   </div>
                 );
               })}
            </div>

            <div className="flex justify-center pt-8">
               <button 
                  onClick={() => setActiveTab('browse')}
                  className="btn-pill bg-text-main text-surface px-12 py-4 flex items-center gap-3 shadow-xl hover:scale-105 transition-all text-sm uppercase"
               >
                  <ArrowLeft className="w-4 h-4" /> Back to Scenarios
               </button>
            </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
