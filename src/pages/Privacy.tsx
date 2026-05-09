import React from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, Eye, Globe, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-brand-bg text-text-main py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <Link to="/auth" className="inline-flex items-center gap-2 text-soft-blue hover:text-white transition-colors font-bold text-sm mb-8 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Authentication
          </Link>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-soft-blue/10 rounded-2xl flex items-center justify-center border border-soft-blue/20">
              <Shield className="w-6 h-6 text-soft-blue" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight">Privacy Policy</h1>
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
              <Lock className="w-5 h-5 text-soft-blue" /> 1. Overview
            </h2>
            <p className="text-text-dim leading-relaxed font-medium">
              Welcome to DebugToDeploy. This Privacy Policy explains how DebugToDeploy (“we”, “our”, “us”) collects, uses, stores, protects, and shares information when you use our website, Android mobile application, and associated services.
            </p>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
              <Eye className="w-5 h-5 text-soft-purple" /> 2. Information We Collect
            </h2>
            <div className="grid gap-6">
              <div className="p-6 bg-brand-bg/50 border border-border rounded-2xl">
                <h3 className="font-black text-white mb-2 uppercase tracking-widest text-xs">Account Information</h3>
                <p className="text-text-dim text-sm leading-relaxed">Full name, email address, profile picture, and authentication provider data from Google or GitHub.</p>
              </div>
              <div className="p-6 bg-brand-bg/50 border border-border rounded-2xl">
                <h3 className="font-black text-white mb-2 uppercase tracking-widest text-xs">Learning Data</h3>
                <p className="text-text-dim text-sm leading-relaxed">Roadmap progress, completed labs, mock interview activity, AI search queries, and skill tracking.</p>
              </div>
              <div className="p-6 bg-brand-bg/50 border border-border rounded-2xl">
                <h3 className="font-black text-white mb-2 uppercase tracking-widest text-xs">Technical Info</h3>
                <p className="text-text-dim text-sm leading-relaxed">Device model, OS version, browser type, IP address, and crash diagnostics.</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
              <Globe className="w-5 h-5 text-soft-green" /> 3. Data Sharing
            </h2>
            <p className="text-text-dim leading-relaxed font-medium">
              We do NOT sell user personal information. We share limited information only with trusted third-party services required to operate the platform, such as Supabase, Razorpay, Google Authentication, and Firebase Cloud Messaging.
            </p>
          </section>

          <section className="space-y-4 border-t border-border pt-8">
            <h2 className="text-xl font-black tracking-tight">Full Policy Document</h2>
            <div className="prose prose-invert max-w-none text-text-dim text-sm font-medium leading-loose">
              <p>For the complete legal text, please refer to our official Play Store declaration. By using DebugToDeploy, you consent to the collection and use of information as described in our comprehensive privacy documentation.</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Data is encrypted in transit via HTTPS.</li>
                <li>Users can request account deletion anytime.</li>
                <li>Payment info is never stored on our servers.</li>
              </ul>
            </div>
          </section>
        </motion.div>
        
        <div className="mt-12 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim/40">
            © 2026 DebugToDeploy · Privacy Protection Active
          </p>
        </div>
      </div>
    </div>
  );
}
