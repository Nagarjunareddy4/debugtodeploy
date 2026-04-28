import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Heart, Sparkles, Star } from 'lucide-react';
import { cn } from '../lib/utils';

export default function FeedbackForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate API call
    console.log('Feedback submitted:', { rating, comment });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setIsOpen(false);
      setRating(0);
      setComment('');
    }, 3000);
  };

  return (
    <div className="fixed bottom-8 right-8 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.8, y: 20, filter: 'blur(10px)' }}
            className="mb-6 w-[320px] sm:w-[400px] bg-surface rounded-[2.5rem] shadow-3xl border-4 border-soft-blue/20 overflow-hidden"
          >
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black tracking-tight">Mission Feedback</h3>
                  <p className="text-text-dim font-bold text-xs uppercase tracking-widest">How was your deployment today?</p>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-brand-bg rounded-2xl transition-colors"
                >
                  <X className="w-5 h-5 text-text-dim" />
                </button>
              </div>

              {submitted ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-12 text-center space-y-4"
                >
                  <div className="w-20 h-20 bg-soft-green/10 rounded-full flex items-center justify-center mx-auto">
                    <Heart className="w-10 h-10 text-soft-green fill-soft-green" />
                  </div>
                  <h4 className="text-xl font-black">Transmission Received!</h4>
                  <p className="text-text-dim text-sm font-bold">Your feedback helps us sharpen the arsenal. Thank you, Captain!</p>
                </motion.div>
              ) : (
                <form 
                  action="https://formspree.io/f/nagarjunareddy9995@gmail.com" 
                  method="POST"
                  onSubmit={() => setSubmitted(true)}
                  className="space-y-6"
                >
                  <input type="hidden" name="rating" value={rating} />
                  {/* Rating Stars */}
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <motion.button
                        key={s}
                        type="button"
                        whileHover={{ scale: 1.2, rotate: 10 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setRating(s)}
                        className={cn(
                          "p-2 transition-all",
                          rating >= s ? "text-soft-orange" : "text-border hover:text-soft-orange/50"
                        )}
                      >
                        <Star className={cn("w-8 h-8", rating >= s && "fill-soft-orange")} />
                      </motion.button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-dim ml-2">Intelligence Report</label>
                    <textarea 
                      required
                      name="comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Improvements, bugs, or love letters..."
                      rows={4}
                      className="w-full bg-brand-bg border-2 border-border rounded-2xl px-6 py-4 font-bold outline-none focus:border-soft-blue transition-colors resize-none text-sm"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={!rating || !comment.trim()}
                    className="btn-pill w-full bg-text-main text-surface py-4 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                    <span className="font-black uppercase tracking-[0.2em] text-sm">Send Dispatch</span>
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
            
            {/* Background Accent */}
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-soft-blue/5 rounded-full blur-3xl pointer-events-none" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1, rotate: -5 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all overflow-hidden group",
          isOpen ? "bg-text-main text-surface" : "bg-soft-blue text-white"
        )}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="w-8 h-8" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              className="relative"
            >
              <MessageSquare className="w-8 h-8" />
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-1 -right-1"
              >
                <Sparkles className="w-4 h-4 text-soft-orange" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Glow effect on hover */}
        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 pointer-events-none" />
      </motion.button>
    </div>
  );
}
