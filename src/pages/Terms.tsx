import React from 'react';
import { motion } from 'motion/react';
import { FileText, Scale, Zap, ShieldAlert, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="min-h-screen bg-brand-bg text-text-main py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <Link to="/auth" className="inline-flex items-center gap-2 text-soft-purple hover:text-white transition-colors font-bold text-sm mb-8 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Authentication
          </Link>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-soft-purple/10 rounded-2xl flex items-center justify-center border border-soft-purple/20">
              <FileText className="w-6 h-6 text-soft-purple" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight">Terms & Conditions</h1>
          </div>
          <p className="text-text-dim font-bold uppercase tracking-[0.4em] text-xs">Effective Date: August 2026</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-12 bg-surface/50 backdrop-blur-xl border border-border p-8 sm:p-12 rounded-[3rem]"
        >
          <section className="space-y-4">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
              <Scale className="w-5 h-5 text-soft-purple" /> 1. Agreement
            </h2>
            <p className="text-text-dim leading-relaxed font-medium">
              By accessing or using DebugToDeploy, you agree to be bound by these Terms and Conditions. These terms govern your access to and use of our website, mobile applications, and learning services.
            </p>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
              <Zap className="w-5 h-5 text-soft-orange" /> 2. Usage Policy
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="p-6 bg-brand-bg/50 border border-border rounded-2xl">
                <h3 className="font-black text-white mb-2 uppercase tracking-widest text-[10px]">Account Responsibility</h3>
                <p className="text-text-dim text-xs leading-relaxed">You are responsible for maintaining account security and for all activity under your credentials.</p>
              </div>
              <div className="p-6 bg-brand-bg/50 border border-border rounded-2xl">
                <h3 className="font-black text-white mb-2 uppercase tracking-widest text-[10px]">Acceptable Use</h3>
                <p className="text-text-dim text-xs leading-relaxed">Users must not abuse platform infrastructure, attempt unauthorized access, or reverse engineer systems.</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-soft-red" /> 3. Disclaimers
            </h2>
            <p className="text-text-dim leading-relaxed font-medium">
              DebugToDeploy provides AI-powered learning tools. AI-generated responses may contain inaccuracies. Users should verify technical information before production usage. We are not liable for career outcomes or data loss caused by third-party failures.
            </p>
          </section>

          <section className="space-y-4 border-t border-border pt-8">
            <h2 className="text-xl font-black tracking-tight">Subscriptions & Billing</h2>
            <div className="prose prose-invert max-w-none text-text-dim text-sm font-medium leading-loose">
              <p>Premium features require a paid subscription. Billing is processed securely through Razorpay or Google Play. Cancellations stop future renewals but do not guarantee refunds for previous billing cycles.</p>
            </div>
          </section>
        </motion.div>
        
        <div className="mt-12 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim/40">
            © 2026 DebugToDeploy · Legal Agreement Active
          </p>
        </div>
      </div>
    </div>
  );
}
