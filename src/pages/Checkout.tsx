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
  Sparkles,
  Zap
} from 'lucide-react';
import { cn } from '../lib/utils';
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
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState<string>('upi');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const planName = location.state?.planName || 'Fleet Captain (Pro)';
  const amount = location.state?.amount || 5;
  const period = location.state?.period || 'month';
  const amountINR = amount === 5 ? 399 : 2999;

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
    
    const res = await loadRazorpay();
    if (!res) {
      alert('Razorpay SDK failed to load. Check your internet connection.');
      setLoading(false);
      return;
    }

    // 1. Create Order on Backend
    try {
      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountINR })
      });
      const orderData = await orderRes.json();
      
      if (!orderData.id) throw new Error('Failed to create order');

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'DebugToDeploy',
        description: `Upgrade to ${planName}`,
        image: 'https://debugtodeploy.com/logo.png',
        order_id: orderData.id,
        handler: async function (response: any) {
          // 2. Verify Payment on Backend
          try {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId: profile?.id
              })
            });
            const verifyData = await verifyRes.json();
            
            if (verifyData.status === 'ok') {
              navigate('/dashboard', { state: { paymentSuccess: true } });
            } else {
              alert('Payment verification failed!');
            }
          } catch (err) {
            console.error('Verification error:', err);
            alert('Verification failed. Please contact support.');
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: profile?.full_name || '',
          email: profile?.email || '',
          contact: '',
          method: selectedMethod === 'upi' ? 'upi' : selectedMethod === 'card' ? 'card' : 'netbanking',
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
          }
        },
        theme: { color: '#3B82F6' },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    } catch (err) {
      console.error('Order error:', err);
      alert('Could not initiate payment. Is the backend server running?');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-24 px-6">
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
                  <div className="bg-white p-1.5 rounded-md flex items-center justify-center shadow-sm">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo.png" alt="UPI" className="h-4 object-contain" />
                  </div>
                  <div className="bg-white p-1.5 rounded-md flex items-center justify-center shadow-sm">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg" alt="GPay" className="h-4 object-contain" />
                  </div>
                  <div className="bg-white p-1.5 rounded-md flex items-center justify-center shadow-sm">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/7/71/PhonePe_Logo.svg" alt="PhonePe" className="h-4 object-contain" />
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

              <button
                onClick={handlePay}
                disabled={loading}
                className="w-full py-6 bg-surface text-text-main rounded-3xl font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 shadow-2xl hover:scale-[1.03] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5 text-soft-blue group-hover:animate-pulse" />
                    Pay Now
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

const RefreshCw = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="3" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
    <path d="M21 3v5h-5"/>
  </svg>
);
