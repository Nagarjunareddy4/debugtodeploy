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
  User,
  Cloud,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { isLimitReached, incrementUsage, getRemainingUsage, getLimitMessage } from '../lib/usageLimit';
import { GeneratedInterview } from '../lib/generator';
import { updateReadinessScore } from '../lib/readiness';

// Map string icon names from AI to actual lucide-react components
const iconMap: Record<string, any> = {
  'Zap': Zap,
  'Brain': Brain,
  'Sparkles': Sparkles,
  'Cloud': Cloud,
};

type InterviewMode = 'text' | 'audio' | 'video';

export default function MockInterviews() {
  const [activeTab, setActiveTab] = useState<'browse' | 'session' | 'evaluation'>('browse');
  const [selectedScenario, setSelectedScenario] = useState<GeneratedInterview | null>(null);
  const [mode, setMode] = useState<InterviewMode>('text');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [history, setHistory] = useState<Array<{q: string, a: string, f: string, score: number}>>([]);
  const [micActive, setMicActive] = useState(false);
  const [videoActive, setVideoActive] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [completedQuestions, setCompletedQuestions] = useState<Set<number>>(new Set());
  const [aiResponse, setAiResponse] = useState('');
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioTranscript, setAudioTranscript] = useState('');
  const [liveScores, setLiveScores] = useState({
    presentation: 72,
    clarity: 65,
    confidence: 80,
    business: 85,
    closing: 40,
  });
  
  const [profile, setProfile] = useState<any>(null);
  const [roadmapGoal, setRoadmapGoal] = useState('AI roadmap');
  const [sessionQuestions, setSessionQuestions] = useState<string[]>([]);
  const [isPro, setIsPro] = useState(false);
  const [interviewScenarios, setInterviewScenarios] = useState<GeneratedInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [interviewScores, setInterviewScores] = useState<Record<string, number>>({});
  const [userAnswer, setUserAnswer] = useState('');

  // Refs for MediaRecorder-based recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
          if (data) {
            setProfile(data);
            setIsPro(data.subscription_status === 'pro');
            if (data.generated_interviews) {
              const interviews = data.generated_interviews as (GeneratedInterview & { sessionState?: any })[];
              setInterviewScenarios(interviews);
              
              // Check if there's an active session in any scenario
              const activeSession = interviews.find(i => i.sessionState?.isActive);
              if (activeSession) {
                setSelectedScenario(activeSession);
                setSessionQuestions(activeSession.sessionState.questions);
                setCurrentQuestion(activeSession.sessionState.currentIndex);
                setHistory(activeSession.sessionState.history || []);
                setCompletedQuestions(new Set(activeSession.sessionState.completedIndices || []));
                setActiveTab('session');
              }
            }
            if (data.interview_scores) {
              setInterviewScores(data.interview_scores);
            }
            if (data.roadmap_data) {
              try {
                const roadmap = typeof data.roadmap_data === 'string' ? JSON.parse(data.roadmap_data) : data.roadmap_data;
                setRoadmapGoal(roadmap.goal || roadmap.title || 'AI roadmap');
              } catch {
                setRoadmapGoal('AI roadmap');
              }
            }
          }
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, []);

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  useEffect(() => {
    // Question speaking removed as requested
  }, [currentQuestion, activeTab, sessionQuestions, roadmapGoal]);



  const saveInterviewSession = async (scenarioId: string, state: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const updatedInterviews = interviewScenarios.map(i => {
      if (i.id === scenarioId) {
        return { ...i, sessionState: state };
      }
      // Only one active session at a time
      return { ...i, sessionState: { ...i.sessionState, isActive: false } };
    });

    setInterviewScenarios(updatedInterviews);
    await supabase.from('profiles').update({ generated_interviews: updatedInterviews }).eq('id', user.id);
  };

  const startSession = (scenario: GeneratedInterview) => {
    if (isLimitReached('interview', isPro)) {
      alert(getLimitMessage('interview', isPro));
      return;
    }
    setSelectedScenario(scenario);
    const randomized = shuffleArray(scenario.questions);
    setSessionQuestions(randomized);
    setCurrentQuestion(0);
    setCompletedQuestions(new Set());
    setHistory([]);
    setAiResponse('');
    setUserAnswer('');
    setLiveScores({
      presentation: 58,
      clarity: 52,
      confidence: 45,
      business: 60,
      closing: 38,
    });
    setActiveTab('session');
    setMode('text');
    
    saveInterviewSession(scenario.id, {
      isActive: true,
      questions: randomized,
      currentIndex: 0,
      history: [],
      completedIndices: []
    });
  };

  const generateRealtimeLiveScores = (score: number) => {
    const rand = (min: number, max: number) => Math.max(0, Math.min(100, Math.round(min + Math.random() * (max - min))));
    const base = Math.min(10, Math.max(0, score));

    return {
      presentation: Math.min(100, base * 9 + rand(-12, 12)),
      clarity: Math.min(100, base * 8 + rand(-10, 15)),
      confidence: Math.min(100, base * 8 + rand(-8, 18)),
      business: Math.min(100, base * 8 + rand(-14, 12)),
      closing: Math.min(100, base * 7 + rand(-16, 18)),
    };
  };

  const startVideoCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      setAudioTranscript('');
      setUserAnswer('');
      setAiResponse('');
      setIsRecording(true);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size < 1000) {
          setIsTranscribing(false);
          return;
        }

        try {
          const formData = new FormData();
          const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
          formData.append('file', blob, `recording.${extension}`);
          formData.append('model', 'whisper-1');
          formData.append('language', 'en');

          const whisperRes = await fetch('/api/openai-proxy?path=v1/audio/transcriptions', {
            method: 'POST',
            body: formData,
          });
          const whisperData = await whisperRes.json();
          const transcript = (whisperData.text || '').trim();

          if (!transcript) {
            setAiResponse('No speech detected. Please try recording again.');
            setIsTranscribing(false);
            return;
          }

          setAudioTranscript(transcript);
          setUserAnswer(transcript);
          setIsTranscribing(false);
          getAiFeedback(transcript);
        } catch (err: any) {
          setAiResponse(`Transcription error: ${err.message}`);
          setIsTranscribing(false);
        }
      };

      recorder.start();
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Microphone access denied. Please allow microphone permissions.');
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    setIsTranscribing(true);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const markComplete = () => {
    setCompletedQuestions(prev => new Set([...prev, currentQuestion]));
  };

  const goToNextQuestion = () => {
    const nextIdx = currentQuestion + 1;
    setCurrentQuestion(nextIdx);
    setAiResponse('');
    setUserAnswer('');
    setAudioTranscript('');
    
    if (selectedScenario) {
      saveInterviewSession(selectedScenario.id, {
        isActive: true,
        questions: sessionQuestions,
        currentIndex: nextIdx,
        history,
        completedIndices: Array.from(completedQuestions)
      });
    }
  };

  const getAiFeedback = async (overrideAnswer?: string) => {
    const answerToEvaluate = (overrideAnswer ?? userAnswer).trim();
    if (!answerToEvaluate) return;
    setIsLoadingResponse(true);
    setAiResponse('');
    try {
      const audioSystemPrompt = `You are an expert technical interviewer and career coach. A candidate just answered a question verbally. Evaluate their spoken answer and give detailed, actionable feedback.

Return your response using EXACTLY this format — do not skip any section:

• **What You Said Well:** [1-2 specific things they got right — be concrete, quote parts of their answer]
• **Areas to Improve:** [1-2 specific weaknesses — content gaps, unclear logic, or missing key points]
• **Technical Accuracy:** [Score X/10 — explain what was technically correct vs incorrect]
• **Communication & Delivery:** [Score X/10 — rate clarity, structure, pacing, and confidence]
• **Overall Score:** [X/10] — [one-line summary with encouragement]

📝 **How to Answer This in a Real Interview:**
• [Bullet 1: The ideal opening — how to frame your answer in 1-2 sentences to hook the interviewer]
• [Bullet 2: Key technical terms, concepts, or keywords that MUST be mentioned to sound credible]
• [Bullet 3: A concrete real-world example or analogy that demonstrates deep understanding]
• [Bullet 4: How to close strongly — what to say to leave a lasting positive impression]
• [Bullet 5: The #1 mistake most candidates make on this question — and exactly how to avoid it]

Be specific, direct, and constructive. Your goal is to make this candidate ready to ace this exact question in their next real interview.`;

      const textSystemPrompt = `You are a senior technical interviewer and career coach. Evaluate the candidate's written answer and provide structured, actionable feedback.

Return your response using EXACTLY this format:

• **Strengths:** [1-2 specific positives from their answer — be concrete]
• **Areas to Improve:** [1-2 specific gaps or weaknesses]
• **Technical Accuracy:** [Score X/10 — explain correctness]
• **Communication:** [Score X/10 — rate clarity, structure, and depth]
• **Overall Score:** [X/10] — [one-line summary]

📝 **How to Answer This in a Real Interview:**
• [Bullet 1: The ideal opening — how to frame your answer to impress immediately]
• [Bullet 2: Key technical terms and concepts that MUST be covered]
• [Bullet 3: A strong real-world example or analogy that shows genuine expertise]
• [Bullet 4: How to close your answer with maximum impact]
• [Bullet 5: The most common mistake candidates make here — and how to avoid it]

Be specific, constructive, and encouraging.`;

      const systemPrompt = mode === 'audio' ? audioSystemPrompt : textSystemPrompt;

      const res = await fetch('/api/openai-proxy?path=v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Question: ${sessionQuestions[currentQuestion]}\n\nCandidate answer: ${answerToEvaluate}` },
          ],
          max_tokens: 700,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      
      const content = data.choices?.[0]?.message?.content || 'No feedback generated. [0/10]';
      const scoreMatch = content.match(/\[(\d+)\/10\]/);
      const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 5;
      const cleanFeedback = content.replace(/\[\d+\/10\]/, '').trim();
      
      setAiResponse(cleanFeedback);
      
      let updatedHistory: any[] = [];
      setHistory(prev => {
         const newHistory = [...prev];
         newHistory[currentQuestion] = {
           q: sessionQuestions[currentQuestion] || '',
           a: answerToEvaluate,
           f: cleanFeedback,
           score
         };
         updatedHistory = newHistory;
         return newHistory;
      });
      setLiveScores(generateRealtimeLiveScores(score));
      markComplete();

      if (selectedScenario) {
        saveInterviewSession(selectedScenario.id, {
          isActive: true,
          questions: sessionQuestions,
          currentIndex: currentQuestion,
          history: updatedHistory,
          completedIndices: Array.from(new Set([...completedQuestions, currentQuestion]))
        });
      }
    } catch (err: any) {
      setAiResponse(`Error: ${err.message}`);
    } finally {
      setIsLoadingResponse(false);
    }
  };

  const finishInterview = async () => {
    window.speechSynthesis.cancel();
    stopVideoCall();
    
    const answered = history.filter(Boolean);
    const totalScore = answered.reduce((acc, h) => acc + h.score, 0);
    const averageScore = answered.length > 0 ? (totalScore / answered.length) : 0;
    
    if (selectedScenario?.id) {
      const newScores = { ...interviewScores, [selectedScenario.id]: averageScore };
      setInterviewScores(newScores);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Clear active session on finish
        const updatedInterviews = interviewScenarios.map(i => ({ ...i, sessionState: { isActive: false } }));
        await supabase.from('profiles').update({ 
          interview_scores: newScores,
          generated_interviews: updatedInterviews
        }).eq('id', user.id);
        
        await updateReadinessScore(user.id);
      }
    }
    
    incrementUsage('interview', isPro);
    setActiveTab('evaluation');
  };

  const totalQuestions = sessionQuestions.length;
  const isLastQuestion = currentQuestion === totalQuestions - 1;

  if (loading) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24 px-2 sm:px-0">
      <header className="space-y-4">
        <h2 className="text-3xl sm:text-5xl font-black tracking-tighter">AI Mock Interviews</h2>
        <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
          <p className="text-text-dim font-bold uppercase tracking-widest text-sm flex items-center gap-2">
             <Zap className="w-4 h-4 text-soft-orange" /> Sharpen your technical edge with real-time feedback
          </p>
          {!isPro && (
            <div className="text-[10px] font-black uppercase tracking-widest text-soft-orange bg-soft-orange/10 px-4 py-2 rounded-full border border-soft-orange/20">
              {getRemainingUsage('interview', isPro)} interview left this week
            </div>
          )}
        </div>
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
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {interviewScenarios.length === 0 ? (
               <div className="col-span-3 text-center p-12 text-text-dim font-bold">
                 No scenarios found. Please re-login to generate your personalized curriculum.
                 <div className="mt-4 text-sm">Debug: interviewScenarios length: {interviewScenarios.length}</div>
               </div>
            ) : (
              interviewScenarios.map((scenario, index) => {
                const IconComponent = iconMap[scenario.icon] || Brain;
                const isLocked = !isPro && index > 0;
                return (
                  <div 
                    key={scenario.id}
                    className={cn(
                      "playful-card flex flex-col group transition-all relative overflow-hidden",
                      isLocked ? "opacity-75 cursor-not-allowed grayscale-[0.5]" : "hover:scale-[1.02] cursor-pointer"
                    )}
                    onClick={() => {
                      if (isLocked) {
                        alert("Please upgrade to Pro to unlock this Mock Interview scenario!");
                        return;
                      }
                      console.log('Interview card clicked - raw click event');
                      console.log('Interview card clicked:', scenario);
                      startSession(scenario);
                    }}
                  >
                    <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center mb-6 shadow-xl", `bg-${scenario.color} text-white`)}>
                      <IconComponent className="w-8 h-8" />
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
                    <div className="mt-auto pt-6 border-t border-border/50 flex items-center justify-between relative z-10">
                      <span className={cn("text-[10px] font-black uppercase tracking-widest", `text-${scenario.color}`)}>{scenario.level}</span>
                      <button 
                        className={cn("flex items-center gap-1 font-black text-sm transition-all", isLocked ? "text-text-dim" : "group-hover:gap-2")}
                        disabled={isLocked}
                      >
                        {isLocked ? "LOCKED" : "START"} {isLocked ? <AlertCircle className="w-4 h-4 ml-1" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </div>
                    {isLocked && (
                      <div className="absolute inset-0 bg-surface/40 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-6 z-20">
                        <div className="w-12 h-12 bg-surface rounded-full shadow-lg flex items-center justify-center mb-3">
                           <AlertCircle className="w-6 h-6 text-text-dim" />
                        </div>
                        <h4 className="font-black text-lg">Pro Feature</h4>
                        <p className="text-xs font-bold text-text-dim mt-1">Upgrade to unlock</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
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
            <div className="playful-card p-4 sm:p-6 border-none bg-surface shadow-2xl">
              <div className="flex flex-wrap justify-between items-start gap-3">
                <div className="flex items-center gap-3">
                  <button onClick={() => { setActiveTab('browse'); stopVideoCall(); window.speechSynthesis.cancel(); }} className="p-2 hover:bg-border rounded-full transition-colors shrink-0">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h3 className="font-black text-base sm:text-xl">{selectedScenario?.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 rounded-full bg-soft-green animate-pulse" />
                      <span className="text-[10px] font-black uppercase text-text-dim">AI Interviewer Active</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-soft-blue uppercase tracking-widest bg-soft-blue/10 px-3 py-1.5 rounded-full border-2 border-soft-blue/20">
                    Q {currentQuestion + 1} / {totalQuestions}
                  </span>
                  {/* Mode Switcher */}
                  <div className="flex bg-brand-bg rounded-2xl border-2 border-border p-1 gap-1">
                    {(['text', 'audio'] as InterviewMode[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => {
                          if (mode !== m) {
                            setMode(m);
                            setAiResponse('');
                            setUserAnswer('');
                            setAudioTranscript('');
                          }
                        }}
                        className={cn(
                          "px-2 sm:px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          mode === m ? "bg-text-main text-surface shadow-md" : "text-text-dim hover:text-text-main"
                        )}
                      >
                        {m === 'text' ? '💬' : '🎙️'}
                        <span className="hidden sm:inline ml-1">{m === 'text' ? 'Text' : 'Audio'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Question progress pills */}
              <div className="flex gap-2 mt-6 flex-wrap">
                {sessionQuestions.map((_: any, idx: number) => (
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
                    "{sessionQuestions[currentQuestion]}"
                  </h4>
                  {mode === 'audio' ? (
                    <div className="w-full max-w-2xl space-y-5">

                      {/* Mic button with pulsing rings + waveform */}
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative flex items-center justify-center">
                          {isRecording && (
                            <>
                              <motion.span
                                animate={{ scale: [1, 1.7, 1], opacity: [0.5, 0, 0.5] }}
                                transition={{ duration: 1.4, repeat: Infinity }}
                                className="absolute inset-0 rounded-full bg-red-500/30"
                              />
                              <motion.span
                                animate={{ scale: [1, 2.1, 1], opacity: [0.3, 0, 0.3] }}
                                transition={{ duration: 1.4, repeat: Infinity, delay: 0.25 }}
                                className="absolute inset-0 rounded-full bg-red-500/15"
                              />
                            </>
                          )}
                          <button
                            onClick={isRecording ? stopRecording : startRecording}
                            disabled={isTranscribing || isLoadingResponse}
                            className={cn(
                              "relative w-24 h-24 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed",
                              isRecording ? "bg-red-500 text-white" : "bg-soft-blue text-white"
                            )}
                          >
                            {isRecording ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
                          </button>
                        </div>

                        {/* Animated waveform bars while recording */}
                        {isRecording && (
                          <div className="flex items-end gap-1 h-8">
                            {[0.4, 0.75, 1, 0.55, 0.9, 0.45, 0.8, 0.35, 0.7, 1, 0.5, 0.65, 0.85].map((h, i) => (
                              <motion.div
                                key={i}
                                animate={{ scaleY: [h, Math.max(0.1, h * 0.25 + Math.random() * 0.5), h] }}
                                transition={{ duration: 0.45 + i * 0.03, repeat: Infinity, ease: 'easeInOut', delay: i * 0.06 }}
                                style={{ height: `${h * 28}px`, transformOrigin: 'bottom' }}
                                className="w-1.5 rounded-full bg-red-400"
                              />
                            ))}
                          </div>
                        )}

                        {/* Dynamic status text */}
                        <p className="text-text-dim font-bold uppercase tracking-[0.18em] text-xs">
                          {isTranscribing
                            ? '📝 Transcribing with Whisper...'
                            : isLoadingResponse
                            ? '⚡ AI is analyzing your answer...'
                            : isRecording
                            ? '🎙️ Recording — speak freely, click Stop when done'
                            : aiResponse
                            ? '✅ Feedback ready — scroll down to read'
                            : '🎙️ Click the mic to start recording your answer'}
                        </p>
                      </div>

                      {/* Transcript — shown after Whisper returns */}
                      {audioTranscript && (
                        <div className="bg-surface border-2 border-border/50 rounded-2xl p-4 text-left">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-text-dim">
                              Your Recorded Answer
                            </p>
                            <span className="text-[10px] font-black text-soft-blue bg-soft-blue/10 px-2 py-0.5 rounded-full border border-soft-blue/20">
                              {audioTranscript.trim().split(/\s+/).filter(Boolean).length} words
                            </span>
                          </div>
                          <p className="text-sm font-bold text-text-main leading-relaxed italic">"{audioTranscript}"</p>
                        </div>
                      )}

                      {/* Phase 1: Whisper transcribing */}
                      {isTranscribing && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-purple-500/10 border-2 border-purple-500/30 rounded-2xl p-5 flex flex-col items-center gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <Sparkles className="w-5 h-5 text-purple-400 animate-spin" />
                            <span className="font-black text-purple-400 uppercase tracking-widest text-sm">
                              Transcribing with Whisper AI...
                            </span>
                          </div>
                          <p className="text-xs text-text-dim font-bold text-center">
                            Converting your speech to text — no internet dependency on Google
                          </p>
                          <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
                            <motion.div
                              animate={{ x: ['-100%', '120%'] }}
                              transition={{ duration: 1.0, repeat: Infinity, ease: 'easeInOut' }}
                              className="h-full w-1/3 bg-purple-400 rounded-full"
                            />
                          </div>
                        </motion.div>
                      )}

                      {/* Phase 2: GPT analyzing */}
                      {isLoadingResponse && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-soft-blue/10 border-2 border-soft-blue/30 rounded-2xl p-5 flex flex-col items-center gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <Sparkles className="w-5 h-5 text-soft-blue animate-spin" />
                            <span className="font-black text-soft-blue uppercase tracking-widest text-sm">
                              AI is analyzing your answer...
                            </span>
                          </div>
                          <p className="text-xs text-text-dim font-bold text-center">
                            Evaluating content, delivery & generating your real-interview coaching guide
                          </p>
                          <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
                            <motion.div
                              animate={{ x: ['-100%', '120%'] }}
                              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                              className="h-full w-1/3 bg-soft-blue rounded-full"
                            />
                          </div>
                        </motion.div>
                      )}
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
                        onClick={() => getAiFeedback()}
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
                    className="mx-8 mb-6 p-6 bg-soft-blue/10 border-2 border-soft-blue/20 rounded-2xl space-y-4"
                  >
                    <div className="bg-surface p-4 rounded-xl border border-border/50">
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-2">Your Answer</p>
                      <p className="text-sm font-bold text-text-main italic">"{userAnswer}"</p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-soft-blue mb-3">
                        <Brain className="w-4 h-4" /> AI Analysis & Feedback
                      </div>
                      <div className="text-sm font-bold leading-relaxed text-text-main whitespace-pre-line">
                        {aiResponse}
                      </div>
                    </div>

                    <div className="flex justify-center pt-4">
                      {!isLastQuestion ? (
                        <button
                          onClick={goToNextQuestion}
                          className="btn-pill bg-soft-blue text-white px-8 py-3 font-black uppercase tracking-widest hover:scale-105 transition-all"
                        >
                          Next Question <SkipForward className="w-4 h-4 inline ml-2" />
                        </button>
                      ) : (
                        <button
                          onClick={finishInterview}
                          className="btn-pill bg-soft-green text-white px-8 py-3 font-black uppercase tracking-widest hover:scale-105 transition-all"
                        >
                          Finish Interview <CheckCircle2 className="w-4 h-4 inline ml-2" />
                        </button>
                      )}
                    </div>
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
