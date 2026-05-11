import React from 'react';
import { LogoFull } from '../components/ui/Logo';
import { Mail, Trash2, Shield, AlertCircle } from 'lucide-react';
import { usePageTitle } from '../lib/utils';

export default function DeleteAccount() {
  usePageTitle('Account Deletion Request');

  return (
    <div className="min-h-screen bg-brand-bg selection:bg-soft-blue/30 flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-12">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-6">
          <LogoFull />
          <div className="h-1 w-20 bg-red-500 rounded-full" />
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-main">
            Data Deletion <span className="text-red-500">Request</span>
          </h1>
          <p className="text-text-dim font-bold text-lg max-w-lg">
            We value your privacy. Follow the steps below to permanently remove your account and all associated data.
          </p>
        </div>

        {/* Main Content */}
        <div className="playful-card bg-surface p-8 md:p-12 shadow-2xl space-y-8 border-none">
          <div className="flex items-start gap-6">
            <div className="p-4 bg-red-500/10 rounded-2xl shrink-0">
              <Mail className="w-8 h-8 text-red-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black">How to request deletion</h3>
              <p className="text-text-dim font-bold leading-relaxed">
                To initiate the permanent deletion of your account, please send an email from your <span className="text-text-main">registered email address</span> to:
              </p>
              <a 
                href="mailto:debugtodeploy@gmail.com?subject=Account Deletion Request"
                className="text-2xl font-black text-soft-blue hover:underline block pt-2"
              >
                debugtodeploy@gmail.com
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8 border-t border-border">
            <div className="p-6 bg-brand-bg rounded-3xl space-y-3">
              <div className="flex items-center gap-2 text-red-500 font-black uppercase text-[10px] tracking-widest">
                <Trash2 className="w-4 h-4" /> Data to be removed
              </div>
              <ul className="space-y-1 text-xs font-bold text-text-dim">
                <li>• Profile information</li>
                <li>• Learning progress</li>
                <li>• AI Roadmap history</li>
                <li>• Achievement badges</li>
              </ul>
            </div>
            <div className="p-6 bg-brand-bg rounded-3xl space-y-3">
              <div className="flex items-center gap-2 text-soft-blue font-black uppercase text-[10px] tracking-widest">
                <Shield className="w-4 h-4" /> Data Retention
              </div>
              <p className="text-[10px] font-bold text-text-dim leading-relaxed">
                Note: Some billing and transactional records may be retained for a limited period to comply with legal and financial regulations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-soft-blue/5 rounded-2xl border border-soft-blue/10">
            <AlertCircle className="w-5 h-5 text-soft-blue shrink-0" />
            <p className="text-[10px] font-bold text-soft-blue leading-tight">
              Our support team will process your request and confirm the deletion within 48-72 hours.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <a href="/" className="text-xs font-black uppercase tracking-widest text-text-dim hover:text-text-main transition-colors">
            ← Back to DebugToDeploy
          </a>
        </div>
      </div>
    </div>
  );
}
