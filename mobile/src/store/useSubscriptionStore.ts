import { create } from 'zustand';
import { supabase } from '../services/supabase';

export interface Plan {
  id: string;
  name: string;
  price: number;
  type: 'free' | 'pro_monthly' | 'pro_yearly';
  features: string[];
}

interface SubscriptionState {
  currentPlan: string;
  isPro: boolean;
  loading: boolean;
  plans: Plan[];
  fetchSubscription: () => Promise<void>;
  subscribe: (planId: string) => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  currentPlan: 'free',
  isPro: false,
  loading: false,
  plans: [
    { 
      id: 'free', 
      name: 'Free Fleet', 
      price: 0, 
      type: 'free',
      features: ['1 AI Roadmap', '2 AI Searches/day', 'Basic Labs'] 
    },
    { 
      id: 'pro_monthly', 
      name: 'Fleet Captain', 
      price: 499, 
      type: 'pro_monthly',
      features: ['Unlimited Labs', 'AI Portfolio', 'Unlimited Interviews', 'Priority Support'] 
    }
  ],
  fetchSubscription: async () => {
    set({ loading: true });
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('current_subscription_plan, subscription_status')
        .single();
      
      if (error) {
        console.warn('Failed to fetch subscription:', error.message);
        set({ loading: false });
        return;
      }
      
      if (profile) {
        set({ 
          currentPlan: profile.current_subscription_plan || 'free',
          isPro: profile.subscription_status === 'pro' || profile.current_subscription_plan?.startsWith('pro'),
          loading: false 
        });
      } else {
        set({ loading: false });
      }
    } catch (err) {
      console.warn('Subscription fetch error:', err);
      set({ loading: false });
    }
  },
  subscribe: async (planId) => {
    // Logic for Razorpay would go here
    // TODO: Integrate Razorpay payment gateway
  }
}));
