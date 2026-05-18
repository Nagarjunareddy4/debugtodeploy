import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Star, Flame, Trophy, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getDailyQuestions, calculateDailyQuizXp, QuizQuestion } from '../../lib/quizData';
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

  // Load quiz data
  useEffect(() => {
    const loadQuiz = async () => {
      try {
        // Fetch AI-generated questions for today
        const dailyQuestions = await getDailyQuestions();
        
        if (!dailyQuestions || dailyQuestions.length === 0) {
          toast.error('Failed to load quiz questions');
          setIsLoading(false);
          return;
        }
        
        setQuestions(dailyQuestions);
        const today = new Date().toISOString().split('T')[0];

        // 1. Check local storage first (fastest, no 404s)
        const localCompletion = localStorage.getItem(`quiz_completed_${userId}_${today}`);
        if (localCompletion) {
          const parsed = JSON.parse(localCompletion);
          setHasCompletedToday(true);
          setDailyXpEarned(parsed.xpEarned);
        } else {
          // 2. Try Supabase as backup (ignore errors if table missing)
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
      questionId: questions[currentCardIndex].id,
      selectedIndex,
      isCorrect
    };
    setAnswers([...answers, newAnswer]);
  };

  const handleNextCard = async () => {
    // Check if current card is answered
    if (answers.length <= currentCardIndex) {
      toast.error('Please answer the question first');
      return;
    }

    // Move to next card or complete quiz
    if (currentCardIndex < questions.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      // Quiz completed!
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

      // Mark locally as completed immediately
      localStorage.setItem(`quiz_completed_${userId}_${today}`, JSON.stringify({ xpEarned: totalXpEarned }));
      setHasCompletedToday(true);
      setDailyXpEarned(totalXpEarned);

      // Try to save quiz completion to Supabase (catch and ignore if table doesn't exist)
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

      // ALWAYS update user XP in profiles (this table exists)
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

      toast.success(`Quiz Complete! +${totalXpEarned} XP earned!`);
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
  const totalPossibleXp = calculateDailyQuizXp(questions);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl mx-auto animate-pulse" />
          <p className="font-bold text-text-dim">Loading daily quiz...</p>
        </div>
      </div>
    );
  }

  // Completion state
  if (hasCompletedToday && answers.length === questions.length) {
    const correctCount = answers.filter(a => a.isCorrect).length;
    const score = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-8 py-12"
        >
          {/* Celebration Animation */}
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.6, repeat: 3 }}
            className="inline-block"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-lg">
              <Trophy className="w-12 h-12 text-white" />
            </div>
          </motion.div>

          {/* Results */}
          <div className="space-y-4">
            <h2 className="text-5xl font-black">
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="block"
              >
                Quiz Complete! 🎉
              </motion.span>
            </h2>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-3 gap-4 py-6"
            >
              <div className="bg-blue-500/10 backdrop-blur rounded-2xl p-4 border border-blue-300/30">
                <p className="text-xs font-bold uppercase tracking-wider text-text-dim mb-1">Score</p>
                <p className="text-3xl font-black text-blue-600">{score}%</p>
              </div>
              <div className="bg-emerald-500/10 backdrop-blur rounded-2xl p-4 border border-emerald-300/30">
                <p className="text-xs font-bold uppercase tracking-wider text-text-dim mb-1">Correct</p>
                <p className="text-3xl font-black text-emerald-600">{correctCount}/5</p>
              </div>
              <div className="bg-orange-500/10 backdrop-blur rounded-2xl p-4 border border-orange-300/30">
                <Flame className="w-6 h-6 text-soft-orange mx-auto mb-1" />
                <p className="text-3xl font-black text-soft-orange">{dailyXpEarned}</p>
                <p className="text-xs font-bold text-text-dim">XP</p>
              </div>
            </motion.div>
          </div>

          {/* Message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-lg font-bold text-text-dim"
          >
            {score === 100 ? (
              <p>Perfect score! You're a DevOps master! 👑</p>
            ) : score >= 80 ? (
              <p>Excellent work! Keep improving! 🚀</p>
            ) : score >= 60 ? (
              <p>Good effort! Come back tomorrow and try again! 💪</p>
            ) : (
              <p>Keep learning! DevOps mastery takes practice! 📚</p>
            )}
          </motion.div>

          {/* Return Tomorrow Message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="bg-blue-500/10 backdrop-blur border border-blue-300/30 rounded-2xl p-6"
          >
            <p className="text-sm font-semibold text-text-dim mb-2">
              New Questions Available Tomorrow! 📅
            </p>
            <p className="text-xs text-text-dim">
              Check back tomorrow for 5 new DevOps questions to test your knowledge.
            </p>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="flex gap-4 pt-4"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRetakeQuiz}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Retake Quiz
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Quiz in progress or already completed today
  if (hasCompletedToday) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="space-y-6">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-black mb-2">Quiz Already Completed Today</h3>
            <p className="text-text-dim font-semibold">
              You earned <span className="text-orange-500 font-black">+{dailyXpEarned} XP</span> today!
            </p>
          </div>
          <p className="text-sm text-text-dim">
            Come back tomorrow for 5 new DevOps questions!
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRetakeQuiz}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl"
          >
            <RefreshCw className="w-4 h-4" />
            Retake Quiz
          </motion.button>
        </div>
      </div>
    );
  }

  // Active quiz
  return (
    <div className="w-full py-4 sm:py-8">
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

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 sm:mt-12 px-2 sm:px-4">
        <div className="text-center flex-1">
          <p className="text-xs sm:text-sm font-bold text-text-dim uppercase tracking-wider">
            Progress
          </p>
          <motion.div className="flex items-center justify-center gap-2 mt-1 sm:mt-2">
            <Star className="w-4 h-4 sm:w-5 sm:h-5 text-soft-orange" />
            <span className="font-black text-base sm:text-lg">
              {answers.filter(a => a.isCorrect).length}/{questions.length} Correct
            </span>
          </motion.div>
        </div>

        {currentCardIndex < questions.length - 1 && (
          <motion.button
            whileHover={canMoveToNextCard ? { scale: 1.05 } : {}}
            whileTap={canMoveToNextCard ? { scale: 0.95 } : {}}
            onClick={handleNextCard}
            disabled={!canMoveToNextCard}
            className={`flex items-center gap-1 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full font-bold transition-all text-sm sm:text-base ${
              canMoveToNextCard
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Next
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </motion.button>
        )}

        {currentCardIndex === questions.length - 1 && answers.length > currentCardIndex && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNextCard}
            className="flex items-center gap-1 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full font-bold bg-gradient-to-r from-emerald-400 to-emerald-600 text-white hover:shadow-lg transition-all text-sm sm:text-base"
          >
            Finish
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
          </motion.button>
        )}
      </div>
    </div>
  );
}
