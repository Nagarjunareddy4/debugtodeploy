import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX,
  Loader2, Sparkles, X, ChevronLeft, Code2, BookOpen,
  Lightbulb, Target, CheckCircle2, Brain, Zap
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePageTitle } from '../lib/utils';

interface Slide {
  type: 'intro' | 'concept' | 'code' | 'example' | 'summary';
  title: string;
  body: string;
  code?: string;
  language?: string;
  visual?: string; // emoji or icon name
  duration: number; // seconds per slide
}

interface LessonData {
  topic: string;
  tagline: string;
  slides: Slide[];
}

const SLIDE_ICONS: Record<string, React.ElementType> = {
  intro: Zap,
  concept: Brain,
  code: Code2,
  example: Lightbulb,
  summary: CheckCircle2,
};

const SLIDE_COLORS: Record<string, string> = {
  intro: 'soft-blue',
  concept: 'soft-purple',
  code: 'soft-green',
  example: 'soft-orange',
  summary: 'soft-blue',
};

function AnimatedText({ text, playing }: { text: string; playing: boolean }) {
  const words = text.split(' ');
  return (
    <span>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: playing ? i * 0.04 : 0, duration: 0.2 }}
          className="inline-block mr-1"
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const lines = code.split('\n');
  return (
    <div className="rounded-2xl overflow-hidden border-2 border-border bg-[#0f172a] text-left">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-white/5">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-soft-red/70" />
          <div className="w-3 h-3 rounded-full bg-soft-orange/70" />
          <div className="w-3 h-3 rounded-full bg-soft-green/70" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">{language || 'bash'}</span>
      </div>
      <div className="p-4 overflow-x-auto">
        <pre className="text-sm font-mono leading-relaxed">
          {lines.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, duration: 0.2 }}
              className="flex gap-3"
            >
              <span className="text-white/20 select-none w-5 text-right shrink-0">{i + 1}</span>
              <span className="text-soft-green/90">{line}</span>
            </motion.div>
          ))}
        </pre>
      </div>
    </div>
  );
}

export default function VideoLesson() {
  usePageTitle('AI Video Lesson');
  const location = useLocation();
  const navigate = useNavigate();
  const { topic = '', url = '' } = (location.state as any) || {};

  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [slideKey, setSlideKey] = useState(0);

  const timerRef = useRef<any>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Redirect if no topic
  useEffect(() => {
    if (!topic) navigate('/roadmap');
  }, [topic]);

  // Generate lesson from AI
  useEffect(() => {
    if (!topic) return;
    generateLesson();
  }, [topic]);

  const generateLesson = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Session expired. Please log in again.');

      const res = await fetch('/api/openai-proxy?path=v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a DevOps educator creating animated video lesson scripts. Return ONLY valid JSON.`,
            },
            {
              role: 'user',
              content: `Create a 5-slide animated video lesson for the DevOps topic: "${topic}".
Return JSON exactly like this:
{
  "topic": "${topic}",
  "tagline": "one punchy sentence about why this matters",
  "slides": [
    {
      "type": "intro",
      "title": "What is ${topic}?",
      "body": "2-3 sentence plain-English overview. Make it engaging.",
      "visual": "🚀",
      "duration": 12
    },
    {
      "type": "concept",
      "title": "Core Concepts",
      "body": "Explain 3 key concepts in simple terms. Be specific.",
      "visual": "🧠",
      "duration": 15
    },
    {
      "type": "code",
      "title": "See It In Action",
      "body": "Brief explanation of the code below.",
      "code": "# Real working example\\necho 'show actual commands'\\n# Add 4-6 lines of real code",
      "language": "bash",
      "visual": "💻",
      "duration": 18
    },
    {
      "type": "example",
      "title": "Real-World Use Case",
      "body": "Describe a real production scenario where this is used. Be specific with company/tool names.",
      "visual": "🏭",
      "duration": 14
    },
    {
      "type": "summary",
      "title": "Key Takeaways",
      "body": "3 bullet-point style takeaways. Start each with →",
      "visual": "✅",
      "duration": 10
    }
  ]
}`,
            },
          ],
          max_tokens: 900,
          temperature: 0.6,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error?.message || 'AI error');
      const text = data.choices?.[0]?.message?.content || '{}';
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed: LessonData = JSON.parse(clean);
      setLesson(parsed);
    } catch (e: any) {
      setError(e.message || 'Failed to generate lesson. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Slide auto-advance timer
  useEffect(() => {
    if (!playing || !lesson) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        const slide = lesson.slides[currentSlide];
        if (prev >= slide.duration) {
          clearInterval(timerRef.current);
          if (currentSlide < lesson.slides.length - 1) {
            goToSlide(currentSlide + 1);
          } else {
            setPlaying(false);
          }
          return 0;
        }
        return prev + 0.1;
      });
    }, 100);
    return () => clearInterval(timerRef.current);
  }, [playing, currentSlide, lesson]);

  // TTS narration
  useEffect(() => {
    if (!lesson || !playing || muted) return;
    const slide = lesson.slides[currentSlide];
    const text = `${slide.title}. ${slide.body}${slide.code ? '. Example: ' + slide.code.replace(/\n/g, '. ') : ''}`;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95;
    utt.pitch = 1;
    utt.lang = 'en-US';
    speechRef.current = utt;
    window.speechSynthesis.speak(utt);
    return () => window.speechSynthesis.cancel();
  }, [currentSlide, playing, muted, lesson]);

  const goToSlide = useCallback((idx: number) => {
    window.speechSynthesis.cancel();
    clearInterval(timerRef.current);
    setCurrentSlide(idx);
    setElapsed(0);
    setSlideKey(k => k + 1);
  }, []);

  const togglePlay = () => {
    if (!lesson) return;
    setPlaying(p => !p);
  };

  if (!topic) return null;

  const slide = lesson?.slides[currentSlide];
  const totalDuration = lesson?.slides.reduce((s, sl) => s + sl.duration, 0) || 1;
  const elapsedTotal = lesson?.slides.slice(0, currentSlide).reduce((s, sl) => s + sl.duration, 0) ?? 0;
  const overallProgress = ((elapsedTotal + elapsed) / totalDuration) * 100;
  const slideProgress = slide ? (elapsed / slide.duration) * 100 : 0;
  const SlideIcon = slide ? (SLIDE_ICONS[slide.type] || BookOpen) : BookOpen;
  const color = slide ? SLIDE_COLORS[slide.type] : 'soft-blue';

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-6">
      {/* Back */}
      <button
        onClick={() => { window.speechSynthesis.cancel(); navigate('/roadmap'); }}
        className="flex items-center gap-2 text-text-dim hover:text-text-main font-black uppercase text-[10px] tracking-widest transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Roadmap
      </button>

      {/* Header */}
      <div className="space-y-1">
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-soft-blue">AI Video Lesson</p>
        <h1 className="text-3xl font-black tracking-tighter">{topic}</h1>
        {lesson && <p className="text-text-dim font-bold text-sm">{lesson.tagline}</p>}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="playful-card p-16 flex flex-col items-center gap-6 border-none shadow-2xl bg-surface">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}>
            <Sparkles className="w-10 h-10 text-soft-blue" />
          </motion.div>
          <div className="text-center space-y-2">
            <p className="font-black text-sm uppercase tracking-widest animate-pulse">Generating AI Video Lesson...</p>
            <p className="text-text-dim text-xs font-bold">Scripting slides · Building examples · Preparing narration</p>
          </div>
          <div className="w-48 h-1.5 bg-border rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-soft-blue rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: '90%' }}
              transition={{ duration: 6, ease: 'easeInOut' }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="playful-card p-8 border-2 border-soft-red/30 bg-soft-red/5 flex items-start gap-4">
          <X className="w-5 h-5 text-soft-red shrink-0 mt-0.5" />
          <div className="space-y-3">
            <p className="font-black text-sm text-soft-red">{error}</p>
            <button onClick={generateLesson} className="btn-pill bg-text-main text-surface text-xs px-5 py-2">
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Video Player */}
      {lesson && !loading && (
        <div className="space-y-4">
          {/* Slide Stage */}
          <div className="relative rounded-[2rem] overflow-hidden bg-surface border-2 border-border shadow-2xl" style={{ minHeight: '420px' }}>
            {/* Background glow */}
            <div className={`absolute inset-0 bg-${color}/5 pointer-events-none`} />

            <AnimatePresence mode="wait">
              <motion.div
                key={slideKey}
                initial={{ opacity: 0, y: 30, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.97 }}
                transition={{ duration: 0.4, type: 'spring', damping: 22 }}
                className="relative z-10 p-8 md:p-12 flex flex-col gap-6 min-h-[420px]"
              >
                {/* Slide badge */}
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 bg-${color}/10 rounded-2xl flex items-center justify-center`}>
                    <SlideIcon className={`w-5 h-5 text-${color}`} />
                  </div>
                  <div>
                    <p className={`text-[9px] font-black uppercase tracking-[0.3em] text-${color}`}>
                      Slide {currentSlide + 1} of {lesson.slides.length} · {slide?.type}
                    </p>
                  </div>
                  <div className="ml-auto text-3xl">{slide?.visual}</div>
                </div>

                {/* Title */}
                <h2 className="text-3xl md:text-4xl font-black tracking-tighter leading-tight">
                  <AnimatedText text={slide?.title || ''} playing={playing} />
                </h2>

                {/* Body */}
                <p className="text-text-dim font-bold text-base md:text-lg leading-relaxed max-w-2xl">
                  <AnimatedText text={slide?.body || ''} playing={playing} />
                </p>

                {/* Code block */}
                {slide?.code && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <CodeBlock code={slide.code} language={slide.language} />
                  </motion.div>
                )}

                {/* Slide progress bar */}
                <div className="mt-auto">
                  <div className="h-1 w-full bg-border rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full bg-${color} rounded-full`}
                      style={{ width: `${slideProgress}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="playful-card p-4 md:p-6 border-none shadow-xl bg-surface space-y-4">
            {/* Overall progress */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-text-dim">
                <span>Overall Progress</span>
                <span>{Math.round(overallProgress)}%</span>
              </div>
              <div className="h-2 w-full bg-border rounded-full overflow-hidden cursor-pointer"
                onClick={e => {
                  if (!lesson) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = (e.clientX - rect.left) / rect.width;
                  const targetTime = pct * totalDuration;
                  let acc = 0;
                  for (let i = 0; i < lesson.slides.length; i++) {
                    if (acc + lesson.slides[i].duration > targetTime) {
                      goToSlide(i);
                      break;
                    }
                    acc += lesson.slides[i].duration;
                  }
                }}
              >
                <motion.div
                  className="h-full bg-soft-blue rounded-full"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>

            {/* Slide dots */}
            <div className="flex items-center justify-center gap-2">
              {lesson.slides.map((sl, i) => {
                const DotIcon = SLIDE_ICONS[sl.type] || BookOpen;
                const dotColor = SLIDE_COLORS[sl.type];
                return (
                  <button
                    key={i}
                    onClick={() => goToSlide(i)}
                    title={sl.title}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${
                      currentSlide === i
                        ? `bg-${dotColor}/10 border-2 border-${dotColor} text-${dotColor}`
                        : 'bg-brand-bg border-2 border-border text-text-dim hover:border-text-dim/40'
                    }`}
                  >
                    <DotIcon className="w-3 h-3" />
                    {i + 1}
                  </button>
                );
              })}
            </div>

            {/* Playback buttons */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => goToSlide(Math.max(0, currentSlide - 1))}
                disabled={currentSlide === 0}
                className="w-10 h-10 rounded-full bg-brand-bg border-2 border-border flex items-center justify-center text-text-dim hover:text-text-main hover:border-text-dim/40 transition-all disabled:opacity-30"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={togglePlay}
                className="w-14 h-14 rounded-full bg-text-main text-surface flex items-center justify-center shadow-2xl hover:scale-105 transition-transform"
              >
                {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </button>

              <button
                onClick={() => goToSlide(Math.min(lesson.slides.length - 1, currentSlide + 1))}
                disabled={currentSlide === lesson.slides.length - 1}
                className="w-10 h-10 rounded-full bg-brand-bg border-2 border-border flex items-center justify-center text-text-dim hover:text-text-main hover:border-text-dim/40 transition-all disabled:opacity-30"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  setMuted(m => !m);
                  if (!muted) window.speechSynthesis.cancel();
                }}
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                  muted ? 'bg-soft-red/10 border-soft-red text-soft-red' : 'bg-brand-bg border-border text-text-dim hover:border-text-dim/40'
                }`}
                title={muted ? 'Unmute narration' : 'Mute narration'}
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-center text-[9px] font-black uppercase tracking-widest text-text-dim/50">
              🎙 AI Narration {muted ? 'Muted' : 'Active'} · Click play to start · Click progress bar to seek
            </p>
          </div>

          {/* Slide thumbnails */}
          <div className="grid grid-cols-5 gap-3">
            {lesson.slides.map((sl, i) => {
              const TIcon = SLIDE_ICONS[sl.type] || BookOpen;
              const tc = SLIDE_COLORS[sl.type];
              return (
                <motion.button
                  key={i}
                  onClick={() => goToSlide(i)}
                  whileHover={{ scale: 1.03 }}
                  className={`p-3 rounded-2xl border-2 text-left transition-all ${
                    currentSlide === i
                      ? `bg-${tc}/10 border-${tc} shadow-lg`
                      : 'bg-surface border-border hover:border-text-dim/30'
                  }`}
                >
                  <div className={`text-xl mb-1`}>{sl.visual}</div>
                  <p className={`text-[9px] font-black uppercase tracking-wider truncate ${currentSlide === i ? `text-${tc}` : 'text-text-dim'}`}>
                    {sl.type}
                  </p>
                  <p className="text-[10px] font-bold text-text-main leading-tight line-clamp-2 mt-0.5">{sl.title}</p>
                </motion.button>
              );
            })}
          </div>

          {/* Regenerate */}
          <div className="text-center">
            <button
              onClick={generateLesson}
              className="btn-pill bg-brand-bg border-2 border-border text-text-dim hover:border-soft-blue hover:text-soft-blue text-xs gap-2 flex items-center mx-auto"
            >
              <Sparkles className="w-3.5 h-3.5" /> Regenerate Lesson
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
