import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  CreditCard,
  ChevronRight,
  ArrowLeft,
  Smartphone,
  Building2,
  Lock,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  Zap,
  Handshake,
  Frown,
  Trophy,
  AlertCircle,
  RefreshCw,
  X
} from 'lucide-react';
import { cn, usePageTitle } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface PaymentMethod {
  id: string;
  name: string;
  icon: any;
  description: string;
  color: string;
}

const paymentMethods: PaymentMethod[] = [
  {
    id: 'upi',
    name: 'UPI / QR Code',
    icon: Smartphone,
    description: 'Pay via GPay, PhonePe, Paytm or any UPI App',
    color: 'soft-purple'
  },
  {
    id: 'card',
    name: 'Credit / Debit Card',
    icon: CreditCard,
    description: 'All major cards including Visa, Mastercard, AMEX',
    color: 'soft-blue'
  },
  {
    id: 'netbanking',
    name: 'Net Banking',
    icon: Building2,
    description: 'Secure payment via 50+ major banks',
    color: 'soft-green'
  }
];

export default function Checkout() {
  usePageTitle('Secure Checkout');
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState<string>('upi');
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);

  const planName = location.state?.planName || 'Fleet Captain (Pro)';
  const amount = location.state?.amount || 6;
  const period = location.state?.period || 'month';
  const amountINR = location.state?.amountINR || (period === 'month' ? 499 : 4499);
  // Tracks whether user actually opened the Razorpay modal (to distinguish dismiss vs error)
  const razorpayOpenedRef = React.useRef(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(data);
      }
    };
    fetchProfile();
  }, []);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePay = async () => {
    setLoading(true);
    setPaymentStatus('processing');
    setErrorMessage(null);
    razorpayOpenedRef.current = false;

    const res = await loadRazorpay();
    if (!res) {
      setErrorMessage('Razorpay SDK failed to load. Please check your internet connection and try again.');
      setLoading(false);
      setPaymentStatus('failed');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Session expired. Please log in again.');
      }
      const planId = period === 'month' ? 'pro_monthly' : 'pro_yearly';

      // Create subscription
      const subscriptionRes = await fetch('/api/subscription/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          planId,
          paymentMethod: selectedMethod,
          autopayConsent: true
        })
      });

      const subscriptionData = await subscriptionRes.json();

      if (!subscriptionData.razorpay_subscription_id) {
        throw new Error(subscriptionData.error || 'Failed to create subscription. Please try again.');
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        subscription_id: subscriptionData.razorpay_subscription_id,
        name: 'DebugToDeploy',
        description: `Subscribe to ${planName}`,
        image: 'https://debugtodeploy.com/logo.jpg',
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/subscription/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            const verifyData = await verifyRes.json();

            if (verifyData.status === 'ok') {
              setPaymentStatus('success');
              setTimeout(() => {
                navigate('/dashboard', { state: { paymentSuccess: true } });
              }, 3000);
            } else {
              // Show the specific server error (may include refund info)
              const errMsg = verifyData.error || 'Subscription activation failed. Please contact support.';
              setErrorMessage(errMsg);
              setPaymentStatus('failed');
            }
          } catch (err) {
            console.error('Verification error:', err);
            setErrorMessage('Verification request failed. Please contact support with your payment ID.');
            setPaymentStatus('failed');
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: profile?.full_name || '',
          email: profile?.email || '',
          contact: '',
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            // Only show failed if Razorpay was opened (user explicitly dismissed)
            // Don't show overlay — just reset to idle so user can retry
            setPaymentStatus('idle');
          },
          backdrop_close: false,
          escape: false,
          handle_back: true
        },
        theme: {
          color: '#3B82F6',
          backdrop_color: '#0A0F1C',
        },
      };

      const paymentObject = new (window as any).Razorpay(options);
      razorpayOpenedRef.current = true;
      paymentObject.open();
      // Reset status to idle after opening (processing shown only briefly before modal appears)
      setPaymentStatus('idle');
    } catch (err: any) {
      console.error('Subscription error:', err);
      setErrorMessage(err.message || 'Unable to initiate payment. Please try again.');
      setPaymentStatus('failed');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-24 px-6">
      <AnimatePresence>
        {(paymentStatus === 'success' || paymentStatus === 'failed') && (
          <PaymentOverlay
            status={paymentStatus}
            errorMessage={errorMessage}
            onRetry={() => {
              setPaymentStatus('idle');
              setErrorMessage(null);
              handlePay();
            }}
            onClose={() => {
              setPaymentStatus('idle');
              setErrorMessage(null);
            }}
          />
        )}
      </AnimatePresence>

      <header className="flex items-center justify-between">
        <button
          onClick={() => navigate('/pricing')}
          className="flex items-center gap-2 text-text-dim hover:text-text-main font-black uppercase tracking-widest text-xs transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Plans
        </button>
        <div className="flex items-center gap-2 bg-soft-blue/10 px-4 py-2 rounded-full border border-soft-blue/20">
          <Lock className="w-3 h-3 text-soft-blue" />
          <span className="text-[10px] font-black uppercase tracking-widest text-soft-blue">Secure 256-bit SSL</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
        {/* Left: Payment Selection */}
        <div className="lg:col-span-3 space-y-8">
          <div className="space-y-2">
            <h2 className="text-4xl font-black tracking-tighter italic">Secure Checkout</h2>
            <p className="text-text-dim font-bold uppercase tracking-widest text-xs">Choose your preferred payment arsenal</p>
          </div>

          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <motion.div
                key={method.id}
                whileHover={{ scale: 1.02, x: 5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedMethod(method.id)}
                className={cn(
                  "playful-card p-6 cursor-pointer border-2 transition-all flex items-center gap-6 group",
                  selectedMethod === method.id
                    ? `bg-surface border-${method.color} shadow-2xl ring-4 ring-${method.color}/10`
                    : "bg-surface/50 border-border hover:border-text-main/20"
                )}
              >
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg",
                  selectedMethod === method.id
                    ? `bg-${method.color} text-white scale-110`
                    : "bg-brand-bg text-text-dim group-hover:text-text-main"
                )}>
                  <method.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-lg tracking-tight">{method.name}</h3>
                  <p className="text-xs font-bold text-text-dim">{method.description}</p>
                </div>
                <div className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                  selectedMethod === method.id
                    ? `border-${method.color} bg-${method.color}`
                    : "border-border"
                )}>
                  {selectedMethod === method.id && <CheckCircle2 className="w-4 h-4 text-white" />}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Conditional Input UI based on selection */}
          <AnimatePresence mode="wait">
            {selectedMethod === 'upi' && (
              <motion.div
                key="upi-input"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="playful-card p-8 bg-brand-bg/50 border-2 border-border border-dashed space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-dim">Enter UPI ID</label>
                    <span className="text-[9px] font-bold text-soft-purple">Direct App Redirect Available</span>
                  </div>
                  <input
                    type="text"
                    placeholder="username@okaxis"
                    className="w-full bg-surface border-4 border-border rounded-2xl px-6 py-4 font-black outline-none focus:border-soft-purple transition-all shadow-inner placeholder:opacity-30"
                  />
                </div>
                <div className="flex items-center gap-6 justify-center pt-4">
                  {/* UPI Logo */}
                  <div className="bg-white px-3 py-1.5 rounded-lg flex items-center justify-center shadow-sm border border-border/50">
                    <svg viewBox="0 0 100 24" className="h-5 object-contain fill-[#5F259F]">
                      <path d="M12.4 2.1l-4.4 19.8h-4.2l4.4-19.8h4.2zm6.6 0l-4.4 19.8h-4.2l4.4-19.8h4.2zm6.6 0l-4.4 19.8h-4.2l4.4-19.8h4.2zm30 0c-3.5 0-6.1 2.3-6.1 5.8 0 4.1 3.5 6 6.5 6 1.4 0 2.2-.2 2.2-.2v4c-.8.1-1.6.2-2.5.2-3.8 0-6.6-1.5-6.6-5.8 0-5.8 4.3-10.2 10.2-10.2 2 0 3.6.4 4.5.8l-1.4 3.4c-.8-.4-2-.8-3.3-.8h-3.5zm11.4 0h4.2l-4.4 19.8h-4.2l4.4-19.8zm11.2 0h4.2l-4.4 19.8h-4.2l4.4-19.8z" />
                    </svg>
                    <span className="text-[10px] font-black ml-1 text-[#5F259F]">UPI</span>
                  </div>

                  {/* GPay Logo */}
                  <div className="bg-white px-3 py-1.5 rounded-lg flex items-center justify-center shadow-sm border border-border/50">
                    <svg viewBox="0 0 40 16" className="h-5 object-contain">
                      <path fill="#4285F4" d="M5.5 8.1v2.3h3.5c-.1 1-.5 1.7-1 2.2-.6.6-1.5.9-2.5.9-2.2 0-3.9-1.8-3.9-4s1.7-4 3.9-4c1.1 0 1.9.4 2.6 1l1.6-1.6C8.7 1.9 7.2 1.1 5.5 1.1 2.5 1.1 0 3.6 0 6.6s2.5 5.5 5.5 5.5c1.6 0 2.8-.5 3.7-1.5.9-.9 1.2-2.3 1.2-3.4 0-.3 0-.6-.1-.9h-4.8z" />
                      <path fill="#34A853" d="M14.6 4.3h-1.1v7.3h1.1V4.3z" />
                    </svg>
                    <span className="text-[10px] font-black ml-1 text-slate-900">GPay</span>
                  </div>

                  {/* PhonePe Logo */}
                  <div className="bg-white px-3 py-1.5 rounded-lg flex items-center justify-center shadow-sm border border-border/50">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#5F259F]">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.486 22 2 17.514 2 12S6.486 2 12 2s10 4.486 10 10-4.486 10-10 10zm-1-15h2v6h-2zm0 8h2v2h-2z" />
                    </svg>
                    <span className="text-[10px] font-black ml-1 text-[#5F259F]">PhonePe</span>
                  </div>
                </div>
              </motion.div>
            )}

            {selectedMethod === 'card' && (
              <motion.div
                key="card-input"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="playful-card p-8 bg-brand-bg/50 border-2 border-border border-dashed space-y-6"
              >
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-dim">Card Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="0000 0000 0000 0000"
                      className="w-full bg-surface border-4 border-border rounded-2xl px-6 py-4 font-black outline-none focus:border-soft-blue transition-all shadow-inner placeholder:opacity-30"
                    />
                    <CreditCard className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-text-dim opacity-30" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-dim">Expiry Date</label>
                    <input
                      type="text"
                      placeholder="MM / YY"
                      className="w-full bg-surface border-4 border-border rounded-2xl px-6 py-4 font-black outline-none focus:border-soft-blue transition-all shadow-inner placeholder:opacity-30"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-dim">CVV</label>
                    <input
                      type="password"
                      placeholder="***"
                      maxLength={3}
                      className="w-full bg-surface border-4 border-border rounded-2xl px-6 py-4 font-black outline-none focus:border-soft-blue transition-all shadow-inner placeholder:opacity-30"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {selectedMethod === 'netbanking' && (
              <motion.div
                key="bank-input"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="playful-card p-8 bg-brand-bg/50 border-2 border-border border-dashed space-y-6"
              >
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-dim">Select Your Bank</label>
                  <select
                    className="w-full bg-surface border-4 border-border rounded-2xl px-6 py-4 font-black outline-none focus:border-soft-green transition-all shadow-inner appearance-none cursor-pointer"
                  >
                    <option value="">Choose a bank...</option>
                    <option value="hdfc">HDFC Bank</option>
                    <option value="sbi">State Bank of India</option>
                    <option value="icici">ICICI Bank</option>
                    <option value="axis">Axis Bank</option>
                    <option value="kotak">Kotak Mahindra Bank</option>
                  </select>
                </div>
                <p className="text-[10px] font-bold text-text-dim text-center italic">
                  You will be redirected to your bank's secure site to complete the payment.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cancellation notice — replacing the misleading autopay panel */}
          <div className="flex items-center gap-3 px-2">
            <ShieldCheck className="w-4 h-4 text-soft-green shrink-0" />
            <p className="text-[10px] font-bold text-text-dim leading-relaxed">
              This plan renews automatically. You can <span className="text-text-main font-black">cancel anytime</span> from your account Settings with no extra charges.
            </p>
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-2">
          <div className="playful-card p-10 bg-text-main text-surface border-none shadow-3xl sticky top-8 space-y-8 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Zap className="w-32 h-32" />
            </div>

            <div className="relative z-10 space-y-6">
              <h3 className="text-2xl font-black tracking-tighter italic">Order Summary</h3>

              <div className="space-y-4 pt-4 border-t border-surface/10">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="font-black text-sm">{planName}</p>
                    <p className="text-[10px] font-bold text-surface/60 uppercase tracking-widest">{period === 'month' ? 'Monthly' : 'Yearly'} Billing</p>
                  </div>
                  <span className="font-black text-lg">${amount}</span>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-surface/10">
                  <span className="text-sm font-bold text-surface/60">Subtotal</span>
                  <span className="font-black">${amount}</span>
                </div>

                <div className="pt-6 border-t-4 border-surface/10 space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-black uppercase tracking-widest text-surface/60">Total Amount</span>
                    <div className="text-right">
                      <p className="text-4xl font-black tracking-tighter">${amount}</p>
                      <p className="text-xs font-bold text-soft-blue">Approx. ₹{amountINR}</p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Dynamic Payment Status Feedback */}
              <AnimatePresence>
                {paymentStatus !== 'idle' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={cn(
                      "mb-6 p-4 rounded-2xl border flex items-start gap-3 overflow-hidden",
                      paymentStatus === 'processing' && "bg-soft-blue/5 border-soft-blue/20 text-soft-blue",
                      paymentStatus === 'success' && "bg-soft-green/5 border-soft-green/20 text-soft-green",
                      paymentStatus === 'failed' && "bg-soft-red/5 border-soft-red/20 text-soft-red"
                    )}
                  >
                    {paymentStatus === 'processing' && <Loader2 className="w-4 h-4 mt-0.5 animate-spin" />}
                    {paymentStatus === 'success' && <CheckCircle2 className="w-4 h-4 mt-0.5" />}
                    {paymentStatus === 'failed' && <XCircle className="w-4 h-4 mt-0.5" />}

                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest">
                        {paymentStatus === 'processing' && "Processing Link..."}
                        {paymentStatus === 'success' && "Handshake Verified!"}
                        {paymentStatus === 'failed' && "Transmission Interrupted"}
                      </p>
                      <p className="text-[9px] font-bold opacity-80 leading-tight">
                        {paymentStatus === 'processing' && "Opening secure payment gateway."}
                        {paymentStatus === 'success' && "Redirecting to your new Command Center..."}
                        {paymentStatus === 'failed' && (errorMessage || "The payment was cancelled or declined. Please retry.")}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={handlePay}
                disabled={loading || paymentStatus === 'success'}
                className="w-full py-6 bg-surface text-text-main rounded-3xl font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 shadow-2xl hover:scale-[1.03] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5 text-soft-blue group-hover:animate-pulse" />
                    {paymentStatus === 'failed' ? "Retry Payment" : "Pay Now"}
                  </>
                )}
                <div className="absolute inset-0 bg-soft-blue/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </button>

              <div className="text-center space-y-2">
                <p className="text-[9px] font-bold text-surface/40 uppercase tracking-widest">
                  Secure checkout handled by Razorpay
                </p>
                <div className="flex justify-center gap-4 opacity-20">
                  <CreditCard className="w-4 h-4" />
                  <Smartphone className="w-4 h-4" />
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Cinematic Overlay for Success/Failure
function PaymentOverlay({ status, errorMessage, onRetry, onClose }: { status: 'success' | 'failed', errorMessage: string | null, onRetry: () => void, onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed top-0 left-0 w-full h-full min-h-[100dvh] z-[100] flex items-center justify-center bg-surface/95 backdrop-blur-xl p-4 overflow-y-auto overflow-x-hidden"
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 md:top-8 md:right-8 z-[110] p-3 bg-text-main/5 hover:bg-text-main/10 rounded-full transition-all text-text-main hover:rotate-90 hover:scale-110 duration-300"
        aria-label="Close"
      >
        <X className="w-5 h-5 md:w-6 md:h-6" />
      </button>

      {/* Background Particles Simulation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{
              opacity: 0,
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 400)
            }}
            animate={{
              opacity: [0, 0.3, 0],
              y: [null, Math.random() * -500],
              x: [null, Math.random() * (Math.random() > 0.5 ? 200 : -200)]
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              ease: "linear"
            }}
            className={cn(
              "absolute w-1 h-1 rounded-full",
              status === 'success' ? "bg-soft-blue" : "bg-soft-red"
            )}
          />
        ))}
      </div>

      <div className="relative text-center w-full max-w-xl px-4 sm:px-10 my-auto">
        <AnimatePresence mode="wait">
          {status === 'success' ? (
            <motion.div
              key="success"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 15 }}
              className="space-y-6 md:space-y-8"
            >
              <div className="relative flex justify-center">
                <motion.div
                  initial={{ rotate: -20 }}
                  animate={{ rotate: 0 }}
                  transition={{ duration: 0.5 }}
                  className="bg-soft-blue/10 p-6 md:p-8 rounded-full border border-soft-blue/20"
                >
                  <Handshake className="w-14 h-14 md:w-20 md:h-20 text-soft-blue" />
                </motion.div>
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-soft-blue/20 blur-3xl -z-10 rounded-full"
                />
              </div>

              <div className="space-y-3">
                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl md:text-5xl font-black tracking-tighter text-text-main"
                >
                  WELCOME TO THE SQUAD, <span className="text-soft-blue">CAPTAIN!</span>
                </motion.h2>
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-text-dim font-bold tracking-widest uppercase text-xs"
                >
                  Handshake verified. Initializing Fleet Access...
                </motion.p>
              </div>

              <div className="flex justify-center gap-4">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -10, 0] }}
                    transition={{ delay: i * 0.1, repeat: Infinity }}
                  >
                    <Trophy className="w-6 h-6 text-soft-blue/40" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="failed"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 15 }}
              className="space-y-6 md:space-y-8"
            >
              <div className="relative flex justify-center">
                <motion.div
                  animate={{
                    x: [0, -5, 5, -5, 5, 0],
                  }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                  className="bg-soft-red/10 p-6 md:p-8 rounded-full border border-soft-red/20"
                >
                  <AlertCircle className="w-14 h-14 md:w-20 md:h-20 text-soft-red" />
                </motion.div>
                <div className="absolute inset-0 bg-soft-red/20 blur-3xl -z-10 rounded-full" />
              </div>

              <div className="space-y-3">
                <motion.h2
                  className="text-3xl md:text-5xl font-black tracking-tighter text-text-main"
                >
                  TRANSMISSION <span className="text-soft-red">FAILED.</span>
                </motion.h2>
                <p className="text-text-dim font-bold tracking-widest uppercase text-xs leading-relaxed">
                  {errorMessage || "Signal lost during handshake. Transaction terminated."}
                </p>
                {errorMessage?.includes('refund') && (
                  <p className="text-soft-green text-xs font-bold mt-2 bg-soft-green/10 px-4 py-2 rounded-2xl border border-soft-green/20">
                    ✓ A refund has been automatically initiated.
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={onRetry}
                  className="group flex items-center gap-3 mx-auto px-6 md:px-8 py-3 md:py-4 bg-text-main text-surface rounded-full font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all"
                >
                  <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                  Retry Payment
                </button>
                <a
                  href="mailto:support@debugtodeploy.com"
                  className="flex items-center gap-2 mx-auto px-6 md:px-8 py-3 md:py-4 bg-brand-bg border border-border text-text-dim rounded-full font-black uppercase tracking-widest text-xs hover:border-text-main hover:text-text-main transition-all"
                >
                  Contact Support
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

