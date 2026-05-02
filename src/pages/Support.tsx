import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Clock, Send, ShieldCheck, ArrowRight, X, Star, Heart, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

export default function Support() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
          setProfile({ ...data, email: user.email });
        });
      }
    });
  }, []);

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackRating) return;
    
    setIsSubmitting(true);
    try {
      await fetch("https://formspree.io/f/xgorjnag", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          type: 'Platform Feedback',
          user: profile?.full_name || profile?.email,
          rating: feedbackRating,
          comment: feedbackComment
        })
      });
      setFeedbackSubmitted(true);
    } catch (err) {
      console.error("Feedback failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } as const }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="max-w-6xl mx-auto space-y-12 pb-24 px-6 sm:px-0"
    >
      <motion.header variants={itemVariants} className="space-y-4 text-center sm:text-left">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 bg-soft-blue/10 px-4 py-2 rounded-full border border-soft-blue/20"
        >
          <ShieldCheck className="w-4 h-4 text-soft-blue" />
          <span className="text-[10px] font-black uppercase tracking-widest text-soft-blue">24/7 Mission Control</span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-6xl font-black tracking-tighter"
        >
          Command Center <span className="text-soft-blue">Support</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-text-dim font-bold uppercase tracking-widest text-sm max-w-2xl"
        >
          Facing a transmission error or need a technical brief? Our squad is on standby to assist you with your deployment journey.
        </motion.p>
      </motion.header>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Methods */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6 lg:col-span-1"
        >
          <div className="playful-card p-8 bg-surface border-4 border-soft-blue/20 hover:border-soft-blue transition-all group">
            <div className="w-12 h-12 bg-soft-blue rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-black mb-2">Email Dispatch</h3>
            <p className="text-text-dim text-sm font-bold mb-4">Direct uplink to our support engineers for complex technical issues.</p>
            <a
              href="mailto:nagarjunareddy9995@gmail.com"
              className="text-soft-blue font-black text-sm uppercase tracking-widest hover:underline flex items-center gap-2 break-all"
            >
              nagarjunareddy9995@gmail.com <ArrowRight className="w-4 h-4 shrink-0" />
            </a>
          </div>

          <div className="playful-card p-8 bg-surface border-2 border-border hover:border-soft-orange transition-all group relative overflow-hidden">
            <div className="relative z-10">
              <div className="w-12 h-12 bg-soft-orange rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform">
                <Heart className="w-6 h-6 text-white fill-white" />
              </div>
              <h3 className="text-xl font-black mb-2">Mission Feedback</h3>
              <p className="text-text-dim text-sm font-bold mb-4">How is your experience? Your feedback sharpens our arsenal.</p>
              
              {feedbackSubmitted ? (
                <div className="py-2 flex items-center gap-2 text-soft-green font-black uppercase text-[10px] tracking-widest">
                  <CheckCircle2 className="w-4 h-4" /> Transmission Received!
                </div>
              ) : (
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setFeedbackRating(s)}
                      className={cn(
                        "transition-all hover:scale-125",
                        feedbackRating >= s ? "text-soft-orange" : "text-border"
                      )}
                    >
                      <Star className={cn("w-6 h-6", feedbackRating >= s && "fill-soft-orange")} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="playful-card p-6 bg-brand-bg/50 border-2 border-border border-dashed">
            <div className="flex items-center gap-3 text-text-dim">
              <Clock className="w-4 h-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">Typical Response: &lt; 2 Hours</p>
            </div>
          </div>
        </motion.div>

        {/* Support Form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <div className="playful-card p-8 sm:p-12 bg-surface shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <Send className="w-32 h-32 text-text-main" />
            </div>

            <div className="relative z-10 space-y-8">
              {isSubmitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-20 text-center space-y-6"
                >
                  <div className="w-24 h-24 bg-soft-green/10 rounded-full flex items-center justify-center mx-auto border-4 border-soft-green/20">
                    <Send className="w-10 h-10 text-soft-green" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black italic tracking-tighter">Transmission <span className="text-soft-green">Received!</span></h2>
                    <p className="text-text-dim font-bold uppercase tracking-widest text-xs">Our engineers are reviewing your mission brief.</p>
                  </div>
                  <p className="text-sm font-bold text-soft-blue bg-soft-blue/5 py-3 px-6 rounded-full inline-block border border-soft-blue/10">
                    We will get back to you shortly via secure uplink (email).
                  </p>
                  <div className="pt-8">
                    <button 
                      onClick={() => setIsSubmitted(false)}
                      className="text-[10px] font-black uppercase tracking-[0.3em] text-text-dim hover:text-text-main transition-colors"
                    >
                      ← Send Another Dispatch
                    </button>
                  </div>
                </motion.div>
              ) : (
                <form 
                  key={profile?.id}
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setIsSubmitting(true);
                    const formData = new FormData(e.currentTarget);
                    try {
                      const res = await fetch("https://formspree.io/f/xgorjnag", {
                        method: "POST",
                        body: formData,
                        headers: { 'Accept': 'application/json' }
                      });
                      if (res.ok) setIsSubmitted(true);
                    } catch (err) {
                      alert("Transmission failed. Please check your signal.");
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-dim ml-2">Full Name</label>
                      <input 
                        type="text" 
                        name="name"
                        required
                        readOnly
                        defaultValue={profile?.full_name || ''}
                        className="w-full bg-brand-bg border-2 border-border rounded-2xl px-6 py-4 font-bold outline-none focus:border-soft-blue transition-colors cursor-not-allowed opacity-70"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-dim ml-2">Email Address</label>
                      <input 
                        type="email" 
                        name="email"
                        required
                        readOnly
                        defaultValue={profile?.email || ''}
                        className="w-full bg-brand-bg border-2 border-border rounded-2xl px-6 py-4 font-bold outline-none focus:border-soft-blue transition-colors cursor-not-allowed opacity-70"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-dim ml-2">Subject</label>
                    <select name="subject" className="w-full bg-brand-bg border-2 border-border rounded-2xl px-6 py-4 font-bold outline-none focus:border-soft-blue transition-colors appearance-none">
                      <option>Technical Issue / Bug</option>
                      <option>Subscription / Payment Inquiry</option>
                      <option>Account Access</option>
                      <option>Feature Request</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-dim ml-2">Mission Brief (Message)</label>
                    <textarea 
                      name="message"
                      required
                      rows={5}
                      placeholder="Describe the issue in detail..."
                      className="w-full bg-brand-bg border-2 border-border rounded-2xl px-6 py-4 font-bold outline-none focus:border-soft-blue transition-colors resize-none"
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="btn-pill w-full sm:w-auto bg-text-main text-surface px-10 py-4 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                    <span className="font-black uppercase tracking-[0.2em] text-sm">
                      {isSubmitting ? 'Dispatching...' : 'Dispatch Message'}
                    </span>
                    <Send className={cn("w-4 h-4", isSubmitting && "animate-ping")} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Inline Feedback Comment Area (Visible if rating given) */}
      <AnimatePresence>
        {feedbackRating > 0 && !feedbackSubmitted && (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="playful-card p-8 bg-soft-orange/5 border-2 border-soft-orange/20"
          >
            <form onSubmit={handleFeedbackSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-soft-orange ml-2">Tell us more, Commander</label>
                <textarea 
                  required
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="What can we improve? What do you love?"
                  rows={3}
                  className="w-full bg-surface border-2 border-soft-orange/20 rounded-2xl px-6 py-4 font-bold outline-none focus:border-soft-orange transition-colors resize-none"
                />
              </div>
              <button 
                type="submit"
                disabled={isSubmitting}
                className="btn-pill bg-soft-orange text-white px-8 py-3 flex items-center gap-2 hover:scale-105 transition-all font-black uppercase text-xs tracking-widest"
              >
                {isSubmitting ? 'Sending...' : 'Submit Feedback'} <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

