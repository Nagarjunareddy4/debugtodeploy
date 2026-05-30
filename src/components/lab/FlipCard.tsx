import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, X } from 'lucide-react';
import { QuizQuestion } from '../../lib/quizData';

interface FlipCardProps {
  question: QuizQuestion;
  onAnswerSubmit: (selectedIndex: number, isCorrect: boolean) => void;
  cardIndex: number;
  totalCards: number;
  isLocked?: boolean;
}

export default function FlipCard({
  question,
  onAnswerSubmit,
  cardIndex,
  totalCards,
  isLocked = false
}: FlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const handleSelectAnswer = (index: number) => {
    if (!isSubmitted && !isFlipped) {
      setSelectedAnswer(index);
    }
  };

  const handleSubmit = () => {
    if (selectedAnswer !== null && !isSubmitted) {
      const correct = selectedAnswer === question.correctAnswer;
      setIsCorrect(correct);
      setIsSubmitted(true);
      setIsFlipped(true);
      onAnswerSubmit(selectedAnswer, correct);
    }
  };

  const containerVariants: any = {
    hidden: { opacity: 0, x: 100 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.5, ease: 'easeOut' }
    },
    exit: { 
      opacity: 0, 
      x: -100,
      transition: { duration: 0.5, ease: 'easeIn' }
    }
  };

  const flipVariants = {
    front: { rotateY: 0 },
    back: { rotateY: 180 }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="w-full max-w-[480px] mx-auto perspective-1000 group"
    >
      {/* Lock Overlay */}
      {isLocked && (
        <div className="absolute inset-0 bg-black/50 rounded-3xl z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="text-center">
            <p className="text-white text-xl font-bold">Complete previous question first</p>
          </div>
        </div>
      )}

      {/* Card Progress */}
      <div className="flex justify-between items-center mb-4 px-2">
        <div className="flex gap-2">
          {Array.from({ length: totalCards }).map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all ${
                i < cardIndex
                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 w-8'
                  : i === cardIndex
                  ? 'bg-gradient-to-r from-blue-400 to-blue-500 w-8'
                  : 'bg-gray-300 dark:bg-gray-600 w-4'
              }`}
            />
          ))}
        </div>
        <p className="text-sm font-bold text-text-dim">
          Question {cardIndex + 1}/{totalCards}
        </p>
      </div>

      {/* Main Card */}
      <motion.div
        animate={flipVariants[isFlipped ? 'back' : 'front']}
        whileHover={{ scale: 1.02, rotateX: 2, rotateY: -2 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
        style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
        className="relative w-full"
      >
        <div
          className={`relative rounded-[1.5rem] p-6 min-h-[300px] flex flex-col justify-between transition-all duration-500 ${
            isCorrect === null
              ? 'bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700'
              : isCorrect
              ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700'
              : 'bg-gradient-to-br from-red-500 via-red-600 to-red-800'
          } shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] group-hover:shadow-[0_30px_60px_-15px_rgba(0,212,255,0.4)] text-white border border-white/20`}
        >
          {/* Shine effect overlay */}
          <div className="absolute inset-0 rounded-[1.5rem] bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          {/* Front Side */}
          {!isFlipped && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Question Header */}
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-block bg-white/20 backdrop-blur px-4 py-1 rounded-full text-sm font-semibold">
                    {question.category}
                  </span>
                  <span className={`text-sm font-bold ${
                    question.difficulty === 'beginner'
                      ? 'text-emerald-200'
                      : question.difficulty === 'intermediate'
                      ? 'text-yellow-200'
                      : 'text-red-200'
                  }`}>
                    {question.difficulty.toUpperCase()}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black leading-tight">
                  {question.question}
                </h2>
              </motion.div>

              {/* Options */}
              <div className="space-y-3 flex-1">
                {question.options.map((option, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectAnswer(index)}
                    className={`w-full p-3 sm:p-4 rounded-xl font-semibold text-left transition-all ${
                      selectedAnswer === index
                        ? 'bg-white/30 backdrop-blur border-2 border-white scale-[1.02] shadow-[0_8px_16px_rgba(0,0,0,0.2)]'
                        : 'bg-white/10 backdrop-blur border-2 border-transparent hover:bg-white/20 hover:scale-[1.01] hover:shadow'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          selectedAnswer === index
                            ? 'border-white bg-white'
                            : 'border-white/50'
                        }`}
                      >
                        {selectedAnswer === index && (
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-2 h-2 bg-blue-600 rounded-full" 
                          />
                        )}
                      </div>
                      <span className="text-[13px] sm:text-sm leading-snug">{option}</span>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Submit Button */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleSubmit}
                disabled={selectedAnswer === null}
                className={`w-full py-3.5 rounded-2xl font-black text-lg transition-all shadow-md ${
                  selectedAnswer !== null
                    ? 'bg-white text-blue-600 hover:bg-gray-50 cursor-pointer hover:shadow-lg'
                    : 'bg-white/30 text-white/50 cursor-not-allowed border border-white/20'
                }`}
              >
                SUBMIT ANSWER
              </motion.button>
            </motion.div>
          )}

          {/* Back Side - Result */}
          {isFlipped && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ transform: 'rotateY(180deg)' }}
              className="space-y-5 text-center flex flex-col justify-center h-full"
            >
              {/* Result Icon */}
              <div className="flex justify-center">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.6, type: "spring", damping: 12 }}
                  className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${
                    isCorrect
                      ? 'bg-white/20 backdrop-blur'
                      : 'bg-white/20 backdrop-blur'
                  }`}
                >
                  {isCorrect ? (
                    <Check className="w-12 h-12 text-emerald-100" />
                  ) : (
                    <X className="w-12 h-12 text-red-100" />
                  )}
                </motion.div>
              </div>

              {/* Result Text */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <h3 className="text-3xl font-black">
                  {isCorrect ? 'Excellent! 🎉' : 'Not quite! 💡'}
                </h3>
                <p className="text-lg font-semibold text-white/90">
                  {isCorrect ? '+' + question.xpReward + ' XP Earned!' : 'Try Next Time!'}
                </p>
              </motion.div>

              {/* Explanation */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white/15 backdrop-blur rounded-2xl p-4 text-left shadow-inner"
              >
                <p className="font-bold text-xs uppercase tracking-wider mb-1 opacity-75">
                  Explanation
                </p>
                <p className="text-white/95 leading-relaxed text-sm sm:text-lg">
                  {isCorrect ? question.explanation : question.wrongExplanation}
                </p>
              </motion.div>

              {/* Correct Answer Highlight if Wrong */}
              {!isCorrect && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-emerald-400/20 backdrop-blur border border-emerald-300/30 rounded-2xl p-4 shadow-sm"
                >
                  <p className="font-bold text-xs uppercase tracking-wider mb-1 opacity-75">
                    Correct Answer
                  </p>
                  <p className="font-semibold text-emerald-100 text-sm sm:text-base">
                    {question.options[question.correctAnswer]}
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
