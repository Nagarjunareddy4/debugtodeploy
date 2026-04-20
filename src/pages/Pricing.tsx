import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Check, Zap, Star, Shield, Rocket, ArrowRight, CreditCard, Sparkles, Crown } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface Plan {
  name: string;
  priceUSD: number;
  priceINR: number;
  period: 'month' | 'year';
  description: string;
  features: string[];
  color: string;
  popular?: boolean;
}

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const navigate = useNavigate();

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

  const handleSubscribe = async (plan: string, amount: number) => {
    if (amount === 0) return;

    navigate('/checkout', {
      state: {
        planName: plan,
        amount: amount,
        period: billingCycle === 'monthly' ? 'month' : 'year'
      }
    });
  };

  const plans: Plan[] = [
    {
      name: 'Free Fleet',
      priceUSD: 0,
      priceINR: 0,
      period: 'month',
      description: 'The foundation for your engineering journey.',
      features: [
        '1 AI Roadmap / week',
        '2 AI Assistant searches / day',
        'Basic Cloud Labs access',
        'Community Support',
        'Standard Portfolio'
      ],
      color: 'soft-green'
    },
    {
      name: 'Fleet Captain (Pro)',
      priceUSD: billingCycle === 'monthly' ? 5 : 39,
      priceINR: billingCycle === 'monthly' ? 399 : 2999,
      period: billingCycle === 'monthly' ? 'month' : 'year',
      description: 'Full-throttle engineering with unlimited AI power.',
      features: [
        '100 AI Roadmaps / month',
        'Unlimited AI Assistant Search',
        'Unlimited AI Mock Interviews',
        'Priority Lab Instance Access',
        'Custom Skill Certifications',
        'Beta Features Access'
      ],
      color: 'soft-blue',
      popular: true
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-16 pb-24 px-6">
      <header className="text-center space-y-8 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-soft-blue/10 border border-soft-blue/20 text-soft-blue text-xs font-black uppercase tracking-widest"
        >
          <Crown className="w-4 h-4" /> Elevate Your Career
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-7xl font-black tracking-tighter leading-tight italic"
        >
          Engineering <br /> <span className="text-soft-blue">Beyond Limits</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-text-dim font-bold uppercase tracking-widest text-sm max-w-xl mx-auto"
        >
          Join 5,000+ engineers mastering DevOps and SRE with AI-accelerated learning paths.
        </motion.p>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-6 pt-4">
          <span className={cn("text-xs font-black uppercase tracking-widest transition-colors", billingCycle === 'monthly' ? "text-text-main" : "text-text-dim")}>Monthly</span>
          <button
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            className="w-16 h-8 bg-surface border-2 border-border rounded-full relative p-1 group transition-colors hover:border-soft-blue"
          >
            <motion.div
              animate={{ x: billingCycle === 'monthly' ? 0 : 32 }}
              className="w-5 h-5 bg-soft-blue rounded-full shadow-lg"
            />
          </button>
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-black uppercase tracking-widest transition-colors", billingCycle === 'yearly' ? "text-text-main" : "text-text-dim")}>Yearly</span>
            <span className="bg-soft-green/10 text-soft-green text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Save 35%</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-5xl mx-auto">
        {plans.map((plan, idx) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, x: idx === 0 ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={cn(
              "playful-card flex flex-col p-12 relative overflow-hidden transition-all duration-500",
              plan.popular ? "bg-surface ring-8 ring-soft-blue/10 border-4 border-soft-blue shadow-3xl scale-[1.02] z-10" : "bg-surface/50 border-2 border-border shadow-xl backdrop-blur-md",
              profile?.subscription_status === (plan.priceUSD === 0 ? 'free' : 'pro') && "ring-4 ring-soft-green/20 border-soft-green/50"
            )}
          >
            {plan.popular && (
              <div className="absolute top-8 right-8 bg-soft-blue text-white text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-xl flex items-center gap-2">
                <Sparkles className="w-3 h-3" /> Most Popular
              </div>
            )}

            <div className="space-y-4 mb-10">
              <h3 className="text-3xl font-black tracking-tighter italic">{plan.name}</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black tracking-tighter">${plan.priceUSD}</span>
                <span className="text-text-dim font-bold uppercase tracking-widest text-xs">/ {plan.period}</span>
              </div>
              {plan.priceUSD > 0 && (
                <p className="text-[10px] font-black uppercase tracking-widest text-soft-blue">Approx. ₹{plan.priceINR} / {plan.period}</p>
              )}
            </div>

            <p className="text-sm font-bold text-text-dim mb-10 leading-relaxed min-h-[3rem]">{plan.description}</p>

            <div className="space-y-5 mb-12 flex-1">
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-start gap-4">
                  <div className={cn("w-6 h-6 rounded-3xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm", plan.popular ? "bg-soft-blue/10 text-soft-blue" : "bg-soft-green/10 text-soft-green")}>
                    <Check className="w-3.5 h-3.5" strokeWidth={4} />
                  </div>
                  <span className="text-sm font-bold text-text-main/80 leading-snug">{feature}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleSubscribe(plan.name, plan.priceUSD)}
              disabled={loading || profile?.subscription_status === (plan.priceUSD === 0 ? 'free' : 'pro')}
              className={cn(
                "w-full py-6 rounded-[2rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl relative group",
                plan.priceUSD === 0 ? "bg-brand-bg text-text-dim border-2 border-border cursor-not-allowed" :
                  "bg-text-main text-surface hover:bg-soft-blue hover:text-white transition-all overflow-hidden"
              )}
            >
              <div className="absolute inset-0 bg-linear-to-r from-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              {profile?.subscription_status === (plan.priceUSD === 0 ? 'free' : 'pro') ? (
                <>
                  <Shield className="w-5 h-5" /> Current Plan
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" /> {plan.priceUSD === 0 ? 'Your Current Tier' : `Upgrade to Pro`}
                </>
              )}
            </button>
          </motion.div>
        ))}
      </div>

      {/* Trust Section */}
      {/* Enterprise Section - On Hold
      <section className="playful-card bg-text-main text-surface p-12 md:p-16 flex flex-col md:flex-row items-center justify-between gap-12 border-none shadow-3xl overflow-hidden relative group rounded-[3rem]">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
         <div className="absolute -left-20 -top-20 w-64 h-64 bg-soft-blue/20 blur-[100px] rounded-full" />
         
         <div className="z-10 space-y-6 text-center md:text-left max-w-xl">
            <h3 className="text-4xl md:text-5xl font-black tracking-tighter italic">Enterprise Mastery?</h3>
            <p className="text-surface/70 font-bold uppercase tracking-widest text-xs leading-relaxed">
              Scale your team with custom AI mentors, dedicated lab clusters, and advanced certification tracking.
            </p>
         </div>
         
         <button 
           onClick={() => window.location.href = 'mailto:enterprise@debugtodeploy.com?subject=Enterprise Mastery Inquiry'}
           className="z-10 px-12 py-6 bg-surface text-text-main rounded-full font-black flex items-center gap-4 hover:scale-105 active:scale-95 transition-all shadow-2xl hover:bg-soft-blue hover:text-white"
         >
            CONTACT COMMAND <ArrowRight className="w-6 h-6" />
         </button>
         
         <div className="absolute -right-16 -bottom-16 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-all duration-700">
            <Rocket className="w-80 h-80" />
         </div>
      </section>
      */}

      <footer className="text-center space-y-4">
        <p className="text-text-dim font-bold uppercase tracking-[0.3em] text-[10px]">Secure Payments via Razorpay</p>
        <div className="flex justify-center gap-8 opacity-30 grayscale hover:grayscale-0 transition-all">
          <img src="https://upload.wikimedia.org/wikipedia/commons/8/89/Razorpay_logo.svg" alt="Razorpay" className="h-6" />
        </div>
      </footer>
    </div>
  );
}
