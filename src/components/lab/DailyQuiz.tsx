import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Flame, Trophy, RefreshCw, Target } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getDailyQuestions, calculateDailyQuizXp, QuizQuestion } from '../../lib/quizData';
import { updateQuizStreak } from '../../lib/quizNotifications';
import { Notify } from '../../lib/notifications';
import FlipCard from './FlipCard';
import { toast } from 'react-hot-toast';

interface DailyQuizProps {
  userId: string;
  onComplete?: (xpEarned: number) => void;
}

interface QuizAnswer {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
}

export default function DailyQuiz({ userId, onComplete }: DailyQuizProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedToday, setHasCompletedToday] = useState(false);
  const [dailyXpEarned, setDailyXpEarned] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        const dailyQuestions = await getDailyQuestions();

        if (!dailyQuestions || dailyQuestions.length === 0) {
          toast.error('Failed to load quiz questions');
          setIsLoading(false);
          return;
        }

        setQuestions(dailyQuestions);
        const today = new Date().toISOString().split('T')[0];

        let completedToday = false;
        const localCompletion = localStorage.getItem(`quiz_completed_${userId}_${today}`);
        if (localCompletion) {
          const parsed = JSON.parse(localCompletion);
          setHasCompletedToday(true);
          setDailyXpEarned(parsed.xpEarned);
          completedToday = true;
        } else {
          const { data: completions, error } = await supabase
            .from('quiz_completions')
            .select('*')
            .eq('user_id', userId)
            .eq('completion_date', today)
            .maybeSingle();

          if (!error && completions) {
            setHasCompletedToday(true);
            setDailyXpEarned(completions.xp_earned);
            localStorage.setItem(`quiz_completed_${userId}_${today}`, JSON.stringify({ xpEarned: completions.xp_earned }));
            completedToday = true;
          }
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('quiz_streak')
          .eq('id', userId)
          .maybeSingle();
        setStreak(profile?.quiz_streak || 0);

        // Notify once per day that a fresh quiz is ready (only if not already done today)
        if (!completedToday) {
          const notifiedKey = `quiz_notified_${userId}_${today}`;
          if (!localStorage.getItem(notifiedKey)) {
            localStorage.setItem(notifiedKey, '1');
            Notify.quizAvailable();
          }
        }
      } catch (err) {
        console.error('Error loading quiz:', err);
        toast.error('Failed to load quiz');
      } finally {
        setIsLoading(false);
      }
    };

    loadQuiz();
  }, [userId]);

  const handleAnswerSubmit = (selectedIndex: number, isCorrect: boolean) => {
    const newAnswer: QuizAnswer = {
      questionId: questions[currentCardIndex].id!,
      selectedIndex,
      isCorrect
    };
    setAnswers([...answers, newAnswer]);
  };

  const handleNextCard = async () => {
    if (answers.length <= currentCardIndex) {
      toast.error('Please answer the question first');
      return;
    }

    if (currentCardIndex < questions.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      await completeQuiz();
    }
  };

  const completeQuiz = async () => {
    try {
      const correctAnswers = answers.filter(a => a.isCorrect).length;
      const totalXpEarned = answers.reduce((sum, answer) => {
        if (answer.isCorrect) {
          const question = questions.find(q => q.id === answer.questionId);
          return sum + (question?.xpReward || 0);
        }
        return sum;
      }, 0);

      const today = new Date().toISOString().split('T')[0];

      localStorage.setItem(`quiz_completed_${userId}_${today}`, JSON.stringify({ xpEarned: totalXpEarned }));
      setHasCompletedToday(true);
      setDailyXpEarned(totalXpEarned);

      try {
        const { error: insertError } = await supabase
          .from('quiz_completions')
          .insert({
            user_id: userId,
            completion_date: today,
            questions_answered: questions.length,
            correct_answers: correctAnswers,
            xp_earned: totalXpEarned,
            answers: answers
          });
        if (insertError) console.warn('Could not save to quiz_completions (table might be missing):', insertError);
      } catch (e) {
        console.warn('quiz_completions table missing, using local storage.');
      }

      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('xp')
        .eq('id', userId)
        .single();

      if (!fetchError) {
        const newXp = (profile?.xp || 0) + totalXpEarned;
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ xp: newXp })
          .eq('id', userId);
        if (updateError) console.error('Failed to update XP:', updateError);
      }

      // Real streak tracking — was previously dead code, now actually called
      const newStreak = await updateQuizStreak(userId);
      setStreak(newStreak);
      if (newStreak > 0 && newStreak % 3 === 0) {
        Notify.streak(newStreak);
      }

      toast.success(`Quiz complete — +${totalXpEarned} XP`);
      onComplete?.(totalXpEarned);
    } catch (err) {
      console.error('Error completing quiz:', err);
      toast.error('Failed to complete quiz properly');
    }
  };

  const handleRetakeQuiz = () => {
    setCurrentCardIndex(0);
    setAnswers([]);
    setHasCompletedToday(false);
  };

  const canMoveToNextCard = answers.length > currentCardIndex;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[14rem] sm:min-h-96 w-full">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border border-neon-cyan mx-auto animate-pulse" />
          <p className="font-mono text-[10px] uppercase tracking-widest text-text-dim">Loading daily quiz…</p>
        </div>
      </div>
    );
  }

  // Just completed this session — show results
  if (hasCompletedToday && answers.length === questions.length) {
    const correctCount = answers.filter(a => a.isCorrect).length;
    const score = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="w-full max-w-2xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-8 py-10">
          <div className="w-14 h-14 border border-neon-cyan flex items-center justify-center mx-auto text-neon-cyan">
            <Trophy className="w-7 h-7" />
          </div>

          <div className="space-y-5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-neon-cyan">quiz resolved</span>
            <h2 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Quiz complete</h2>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface p-4 clay-flat">
                <p className="font-mono text-[9px] uppercase tracking-widest text-text-dim mb-1">Score</p>
                <p className="text-2xl font-bold text-neon-cyan">{score}%</p>
              </div>
              <div className="bg-surface p-4 clay-flat">
                <p className="font-mono text-[9px] uppercase tracking-widest text-text-dim mb-1">Correct</p>
                <p className="text-2xl font-bold text-neon-green">{correctCount}/{questions.length}</p>
              </div>
              <div className="bg-surface p-4 clay-flat">
                <p className="font-mono text-[9px] uppercase tracking-widest text-text-dim mb-1">XP</p>
                <p className="text-2xl font-bold text-neon-cyan">{dailyXpEarned}</p>
              </div>
            </div>
          </div>

          <p className="text-text-dim text-sm">
            {score === 100 ? 'Perfect score.' : score >= 80 ? 'Strong run.' : score >= 60 ? 'Solid effort — review the misses.' : 'Worth a re-read before tomorrow.'}
          </p>

          <div className="clay-flat p-5 text-left flex items-center gap-3">
            <Target className="w-4 h-4 text-neon-cyan shrink-0" />
            <p className="text-xs text-text-dim">New questions tomorrow. Streak: <span className="text-text-main font-medium">{streak} day{streak === 1 ? '' : 's'}</span></p>
          </div>

          <button onClick={handleRetakeQuiz} className="btn-pill btn-ghost px-6 py-3 inline-flex items-center gap-2 mx-auto">
            <RefreshCw className="w-4 h-4" /> Retake quiz
          </button>
        </motion.div>
      </div>
    );
  }

  // Already completed today, page reloaded — collapsed status view
  if (hasCompletedToday) {
    return (
      <div className="w-full max-w-2xl mx-auto text-center py-10">
        <div className="space-y-5">
          <div className="w-12 h-12 border border-neon-green flex items-center justify-center mx-auto text-neon-green">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-1" style={{ fontFamily: 'var(--font-display)' }}>Today's quiz is done</h3>
            <p className="text-text-dim text-sm">
              You earned <span className="text-neon-cyan font-medium">+{dailyXpEarned} XP</span> today.
            </p>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-text-dim flex items-center justify-center gap-2">
            <Flame className="w-3.5 h-3.5 text-neon-cyan" /> {streak} day streak
          </p>
          <button onClick={handleRetakeQuiz} className="btn-pill btn-ghost px-6 py-3 inline-flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Retake quiz
          </button>
        </div>
      </div>
    );
  }

  // Active quiz
  return (
    <div className="w-full max-w-2xl mx-auto py-4 sm:py-6 px-4 sm:px-0">
      <AnimatePresence mode="wait">
        <div key={`card-${currentCardIndex}`}>
          <FlipCard
            question={questions[currentCardIndex]}
            onAnswerSubmit={handleAnswerSubmit}
            cardIndex={currentCardIndex}
            totalCards={questions.length}
            isLocked={currentCardIndex > answers.length}
          />
        </div>
      </AnimatePresence>

      <div className="flex items-center justify-between mt-8 px-1">
        <div className="font-mono text-[10px] uppercase tracking-widest text-text-dim flex items-center gap-2">
          <span className="text-neon-cyan">{answers.filter(a => a.isCorrect).length}/{questions.length}</span> correct
        </div>

        {currentCardIndex < questions.length - 1 ? (
          <button
            onClick={handleNextCard}
            disabled={!canMoveToNextCard}
            className="btn-pill btn-neon-primary flex items-center gap-2 px-5 py-2.5 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : canMoveToNextCard ? (
          <button onClick={handleNextCard} className="btn-pill btn-neon-primary flex items-center gap-2 px-5 py-2.5">
            Finish <Trophy className="w-4 h-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
