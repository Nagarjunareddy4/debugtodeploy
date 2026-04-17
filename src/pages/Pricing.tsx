import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Zap, Star, Shield, Rocket, ArrowRight, CreditCard } from 'lucide-react';
import { cn } from '../lib/utils';

const plans = [
  {
    name: 'Free Fleet',
    price: '$0',
    description: 'Perfect for beginners starting their devops journey.',
    features: ['2 AI Roadmap generations / day', 'Basic Labs access', 'Community Support', 'Standard Editor'],
    button: 'Current Plan',
    current: true,
    color: 'soft-green'
  },
  {
    name: 'Fleet Captain',
    price: '$29',
    description: 'For dedicated engineers ready to lead production.',
    features: ['Unlimited AI Roadmaps', 'Advanced scenario labs', 'Priority AI Mock Interviews', 'Custom Skill Trees', 'Early Beta Access'],
    button: 'Upgrade to Captain',
    current: false,
    color: 'soft-blue',
    popular: true
  },
  {
    name: 'System Admiral',
    price: '$99',
    description: 'Enterprise grade mastery for the elite.',
    features: ['Everything in Captain', '1-on-1 AI Mentoring', 'Certification paths', 'Team management', 'API Access'],
    button: 'Go Admiral',
    current: false,
    color: 'soft-purple'
  }
];

export default function Pricing() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handlePayment = (plan: string) => {
    setSelectedPlan(plan);
    // In a real app, this would trigger Stripe Checkout
    alert(`Redirecting to Stripe for ${plan} plan... (Demo Mode)`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-20 pb-24">
      <header className="text-center space-y-6 max-w-2xl mx-auto">
        <h2 className="text-6xl font-black tracking-tighter leading-tight italic">
          Choose Your <br /> <span className="text-soft-blue">DevOps Arsenal</span>
        </h2>
        <p className="text-text-dim font-bold uppercase tracking-widest text-sm">
          Unlock the full power of AI-driven engineering labs and accelerate your career.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "playful-card flex flex-col p-10 relative overflow-hidden transition-all duration-500",
              plan.popular ? "bg-surface ring-8 ring-soft-blue/10 border-4 border-soft-blue shadow-3xl scale-105 z-10" : "bg-surface border-none shadow-2xl",
              selectedPlan === plan.name && "ring-8 ring-soft-green/20 border-4 border-soft-green"
            )}
          >
            {plan.popular && (
              <div className="absolute top-6 right-6 bg-soft-blue text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                Most Popular
              </div>
            )}

            <div className="space-y-2 mb-10">
              <h3 className="text-3xl font-black tracking-tighter">{plan.name}</h3>
              <div className="flex items-end gap-1">
                <span className="text-5xl font-black tracking-tighter">{plan.price}</span>
                <span className="text-text-dim font-bold uppercase tracking-widest text-xs mb-1">/ month</span>
              </div>
            </div>

            <p className="text-sm font-bold text-text-dim mb-10 leading-relaxed">{plan.description}</p>

            <div className="space-y-5 mb-12 flex-1">
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-start gap-3">
                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5", `bg-${plan.color}/10 text-${plan.color}`)}>
                    <Check className="w-3.5 h-3.5" strokeWidth={4} />
                  </div>
                  <span className="text-sm font-bold text-text-main/80 leading-snug">{feature}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => handlePayment(plan.name)}
              disabled={plan.current}
              className={cn(
                "w-full py-5 rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl",
                plan.current ? "bg-brand-bg text-text-dim cursor-not-allowed border-2 border-border" : 
                plan.popular ? "bg-soft-blue text-white hover:bg-soft-blue/90 shadow-soft-blue/30" : 
                "bg-text-main text-surface hover:bg-text-main/90"
              )}
            >
              {plan.current ? <Shield className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
              {plan.button}
            </button>
          </motion.div>
        ))}
      </div>

      <section className="playful-card bg-text-main text-surface p-12 flex flex-col md:flex-row items-center justify-between gap-8 border-none shadow-3xl overflow-hidden relative group">
         <div className="absolute inset-0 bg-linear-to-r from-soft-blue/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
         <div className="z-10 space-y-4 text-center md:text-left">
            <h3 className="text-4xl font-black tracking-tighter">Entertaining Teams?</h3>
            <p className="text-surface/60 font-black uppercase tracking-widest text-xs">Custom enterprise licenses with dedicated training clusters.</p>
         </div>
         <button className="z-10 px-12 py-5 bg-surface text-text-main rounded-full font-black flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-2xl">
            CONTACT COMMAND <ArrowRight className="w-5 h-5" />
         </button>
         <div className="absolute -right-10 -bottom-10 opacity-5 group-hover:scale-110 transition-transform">
            <Rocket className="w-64 h-64" />
         </div>
      </section>
    </div>
  );
}
