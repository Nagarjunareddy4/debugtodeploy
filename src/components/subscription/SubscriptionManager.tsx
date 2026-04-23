import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Pause,
  Play,
  Trash2,
  Toggle2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

interface Subscription {
  id: string;
  subscription_id: string;
  plan_type: string;
  status: string;
  autopay_enabled: boolean;
  next_billing_date: string;
  payment_method: string;
  created_at: string;
}

export default function SubscriptionManager() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/subscription/manage', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setSubscription(data);
      }
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string, params?: any) => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/subscription/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action, ...params }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || 'Action completed successfully');
        if (action === 'cancel') {
          setTimeout(() => {
            setSubscription(null);
          }, 2000);
        } else {
          fetchSubscription();
        }
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process action');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-soft-blue" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="playful-card p-8 border-2 border-border bg-surface/50 text-center">
        <p className="text-text-dim font-bold">No active subscription</p>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    active: 'soft-green',
    pending: 'soft-blue',
    paused: 'soft-purple',
    failed: 'soft-red',
    cancelled: 'text-dim',
  };

  const statusIcons: Record<string, any> = {
    active: CheckCircle2,
    pending: Loader2,
    paused: Pause,
    failed: XCircle,
    cancelled: XCircle,
  };

  const StatusIcon = statusIcons[subscription.status] || AlertCircle;
  const statusColor = statusColors[subscription.status] || 'text-dim';

  return (
    <div className="space-y-6">
      <div className="playful-card p-8 bg-surface border-4 border-soft-blue/20 space-y-6">
        {/* Status Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full bg-${statusColor}/10`}>
                <StatusIcon className={`w-5 h-5 text-${statusColor}`} />
              </div>
              <div>
                <h3 className="font-black text-lg uppercase tracking-tight">
                  {subscription.plan_type === 'pro_monthly' ? 'Fleet Captain (Monthly)' : 'Fleet Captain (Yearly)'}
                </h3>
                <p className={`text-xs font-bold uppercase tracking-widest text-${statusColor}`}>
                  {subscription.status}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-brand-bg rounded-2xl border border-border">
            <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">
              Next Billing
            </p>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-soft-blue" />
              <p className="font-black">
                {new Date(subscription.next_billing_date).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="p-4 bg-brand-bg rounded-2xl border border-border">
            <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">
              Payment Method
            </p>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-soft-blue" />
              <p className="font-black capitalize">{subscription.payment_method}</p>
            </div>
          </div>
        </div>

        {/* Autopay Toggle */}
        <div className="p-4 bg-brand-bg rounded-2xl border border-border">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-black text-sm uppercase tracking-tight mb-1">
                Autopay Status
              </h4>
              <p className="text-xs font-bold text-text-dim">
                {subscription.autopay_enabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <button
              onClick={() => handleAction('toggle-autopay', { enabled: !subscription.autopay_enabled })}
              disabled={actionLoading}
              className={cn(
                'p-2 rounded-lg transition-all',
                subscription.autopay_enabled
                  ? 'bg-soft-blue text-white'
                  : 'bg-border text-text-dim hover:bg-border/50'
              )}
            >
              <Toggle2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-soft-red/10 border border-soft-red/20 rounded-2xl flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-soft-red mt-0.5" />
              <p className="text-sm font-bold text-soft-red">{error}</p>
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-soft-green/10 border border-soft-green/20 rounded-2xl flex items-start gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-soft-green mt-0.5" />
              <p className="text-sm font-bold text-soft-green">{success}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-3">
          {subscription.status === 'active' && (
            <>
              <button
                onClick={() => handleAction('pause')}
                disabled={actionLoading}
                className="flex items-center justify-center gap-2 p-3 bg-soft-purple/10 text-soft-purple border border-soft-purple/20 rounded-lg font-black text-xs uppercase tracking-wider hover:bg-soft-purple/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
                Pause
              </button>
              <button
                onClick={() => handleAction('toggle-autopay', { enabled: !subscription.autopay_enabled })}
                disabled={actionLoading}
                className="flex items-center justify-center gap-2 p-3 bg-soft-blue/10 text-soft-blue border border-soft-blue/20 rounded-lg font-black text-xs uppercase tracking-wider hover:bg-soft-blue/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Toggle2 className="w-4 h-4" />}
                Autopay
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to cancel your subscription?')) {
                    handleAction('cancel');
                  }
                }}
                disabled={actionLoading}
                className="flex items-center justify-center gap-2 p-3 bg-soft-red/10 text-soft-red border border-soft-red/20 rounded-lg font-black text-xs uppercase tracking-wider hover:bg-soft-red/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Cancel
              </button>
            </>
          )}

          {subscription.status === 'paused' && (
            <button
              onClick={() => handleAction('resume')}
              disabled={actionLoading}
              className="col-span-3 flex items-center justify-center gap-2 p-3 bg-soft-blue/10 text-soft-blue border border-soft-blue/20 rounded-lg font-black text-xs uppercase tracking-wider hover:bg-soft-blue/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Resume Subscription
            </button>
          )}

          {subscription.status === 'failed' && (
            <button
              onClick={() => handleAction('retry-payment')}
              disabled={actionLoading}
              className="col-span-3 flex items-center justify-center gap-2 p-3 bg-soft-red/10 text-soft-red border border-soft-red/20 rounded-lg font-black text-xs uppercase tracking-wider hover:bg-soft-red/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
              Retry Payment
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
