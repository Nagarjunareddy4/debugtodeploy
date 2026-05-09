import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Rocket, AlertCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { POLICY_VERSION, saveUserConsent } from '../lib/consent';
import { toast } from 'react-hot-toast';
import ConsentCheckbox from './ConsentCheckbox';

export default function ConsentModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function checkConsent() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setUserId(session.user.id);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('accepted_policy_version')
        .eq('id', session.user.id)
        .single();

      if (error || !profile || profile.accepted_policy_version !== POLICY_VERSION) {
        setIsOpen(true);
      }
    }

    checkConsent();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUserId(session.user.id);
        checkConsent();
      } else {
        setIsOpen(false);
        setUserId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAccept = async () => {
    if (!accepted || !userId) return;

    setLoading(true);
    try {
      await saveUserConsent(userId);
      setIsOpen(false);
      toast.success('Thank you for reviewing our updated policies!', {
        icon: '🛡️',
        style: {
          borderRadius: '1rem',
          background: '#0F172A',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)'
        }
      });
    } catch (err) {
      toast.error('Failed to save consent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-bg/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-surface border border-border rounded-[2.5rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] overflow-hidden my-auto"
          >
            {/* Decoration */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-soft-blue/10 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2" />
            
            <div className="max-h-[85vh] overflow-y-auto custom-scrollbar p-8 sm:p-10 flex flex-col items-center text-center">

              <div className="w-20 h-20 bg-soft-blue/10 rounded-full flex items-center justify-center mb-8 border border-soft-blue/20">
                <ShieldCheck className="w-10 h-10 text-soft-blue" />
              </div>
              
              <h2 className="text-3xl font-black tracking-tight text-text-main mb-4">
                Policy Update Required
              </h2>
              
              <p className="text-text-dim font-bold text-sm leading-relaxed mb-8">
                We've updated our <span className="text-text-main">Privacy Policy</span> and <span className="text-text-main">Terms of Service</span> to better protect your data and enhance our AI features. Please review and accept them to continue using DebugToDeploy.
              </p>
              
              <div className="w-full mb-8 text-left">
                <ConsentCheckbox 
                  checked={accepted} 
                  onChange={setAccepted} 
                  disabled={loading}
                />
              </div>
              
              <div className="w-full flex items-center gap-3 p-4 bg-soft-blue/5 border border-soft-blue/10 rounded-2xl mb-8">
                <AlertCircle className="w-5 h-5 text-soft-blue flex-shrink-0" />
                <p className="text-[10px] font-bold text-soft-blue/80 uppercase tracking-widest text-left leading-normal">
                  Access to your dashboard, cloud labs, and AI roadmaps will remain locked until acceptance.
                </p>
              </div>
              
              <motion.button
                onClick={handleAccept}
                disabled={!accepted || loading}
                whileHover={accepted && !loading ? { scale: 1.02 } : {}}
                whileTap={accepted && !loading ? { scale: 0.98 } : {}}
                className={`
                  w-full flex items-center justify-center gap-3 py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] transition-all
                  ${accepted && !loading 
                    ? "bg-text-main text-surface shadow-xl shadow-soft-blue/20 hover:bg-soft-blue" 
                    : "bg-surface text-text-dim/20 cursor-not-allowed border border-border"}
                `}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-surface/30 border-t-surface rounded-full animate-spin" />
                ) : (
                  <><Rocket className="w-5 h-5" /> BEGIN LEARNING <ArrowRight className="w-4 h-4" /></>
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
