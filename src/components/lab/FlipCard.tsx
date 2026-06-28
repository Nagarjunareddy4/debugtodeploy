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
    hidden: { opacity: 0, x: 60 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, x: -60, transition: { duration: 0.25 } }
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
      className="w-full max-w-[480px] mx-auto group relative"
    >
      {isLocked && (
        <div className="absolute inset-0 bg-[#0A0C10]/70 z-50 flex items-center justify-center backdrop-blur-sm">
          <p className="font-mono text-[10px] uppercase tracking-widest text-white">Complete previous question first</p>
        </div>
      )}

      {/* Progress */}
      <div className="flex justify-between items-center mb-4 px-1">
        <div className="flex gap-1.5">
          {Array.from({ length: totalCards }).map((_, i) => (
            <div
              key={i}
              className={`h-1 transition-all ${
                i < cardIndex ? 'bg-neon-green w-7' : i === cardIndex ? 'bg-neon-cyan w-7' : 'bg-border w-4'
              }`}
            />
          ))}
        </div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-text-dim">
          Q{cardIndex + 1}/{totalCards}
        </p>
      </div>

      <motion.div
        animate={flipVariants[isFlipped ? 'back' : 'front']}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
        className="relative w-full"
      >
        <div
          className={`relative p-7 min-h-[320px] flex flex-col justify-between transition-colors duration-300 border rounded-2xl ${
            isCorrect === null
              ? 'bg-[#181D27] border-transparent text-white shadow-[-8px_-8px_18px_rgba(255,255,255,0.05),10px_10px_24px_rgba(0,0,0,0.7)]'
              : isCorrect
              ? 'bg-[#181D27] border-neon-green/60 text-white shadow-[-8px_-8px_18px_rgba(79,209,181,0.05),10px_10px_24px_rgba(0,0,0,0.7)]'
              : 'bg-[#181D27] border-[#FF5C5C]/60 text-white shadow-[-8px_-8px_18px_rgba(255,92,92,0.04),10px_10px_24px_rgba(0,0,0,0.7)]'
          }`}
        >
          {/* Shine effect overlay */}
          <div className="absolute inset-0 rounded-[1.5rem] bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          {/* Front Side */}
          {!isFlipped && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-widest">
                  <span className="text-neon-cyan border border-neon-cyan/40 px-2 py-1">{question.category}</span>
                  <span className="text-white/40">{question.difficulty}</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
                  {question.question}
                </h2>
              </div>

              <div className="space-y-2.5 flex-1">
                {question.options.map((option, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectAnswer(index)}
                    className={`w-full p-3.5 text-left transition-colors border text-sm rounded-xl ${
                      selectedAnswer === index
                        ? 'border-neon-cyan bg-neon-cyan/10 text-white shadow-[inset_2px_2px_6px_rgba(0,0,0,0.3)]'
                        : 'border-white/10 bg-white/[0.02] text-white/70 hover:border-white/30 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 border flex items-center justify-center shrink-0 ${
                        selectedAnswer === index ? 'border-neon-cyan bg-neon-cyan' : 'border-white/30'
                      }`}>
                        {selectedAnswer === index && <div className="w-1.5 h-1.5 bg-[#150C00]" />}
                      </div>
                      <span className="leading-snug">{option}</span>
                    </div>
                  </motion.button>
                ))}
              </div>

              <button
                onClick={handleSubmit}
                disabled={selectedAnswer === null}
                className="btn-pill btn-neon-primary w-full py-3.5 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Submit answer
              </button>
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
              <div className="flex justify-center">
                <div className={`w-14 h-14 border flex items-center justify-center ${isCorrect ? 'border-neon-green text-neon-green' : 'border-[#FF5C5C] text-[#FF5C5C]'}`}>
                  {isCorrect ? <Check className="w-7 h-7" /> : <X className="w-7 h-7" />}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/50">
                  {isCorrect ? 'correct' : 'incorrect'}
                </span>
                <h3 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                  {isCorrect ? `+${question.xpReward} XP` : 'No XP this time'}
                </h3>
              </div>

              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 text-left">
                <p className="font-mono text-[9px] uppercase tracking-widest text-white/40 mb-1.5">Explanation</p>
                <p className="text-white/85 leading-relaxed text-sm">
                  {isCorrect ? question.explanation : question.wrongExplanation}
                </p>
              </div>

              {!isCorrect && (
                <div className="bg-neon-green/10 border border-neon-green/30 p-4">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-white/40 mb-1.5">Correct answer</p>
                  <p className="font-medium text-neon-green text-sm">{question.options[question.correctAnswer]}</p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
