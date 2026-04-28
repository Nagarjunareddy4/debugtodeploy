import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PLANS = {
  'pro_monthly': { amount: 49900, currency: 'INR', interval: 1, period: 'monthly' },
  'pro_yearly': { amount: 399900, currency: 'INR', interval: 1, period: 'yearly' }
};

// --- AUTH MIDDLEWARE ---
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing authorization' });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) return res.status(401).json({ error: 'Invalid token' });
  req.user = user;
  next();
};

// --- SUBSCRIPTION ENDPOINTS ---

// 1. Create Subscription
app.post('/api/subscription/create', authenticate, async (req, res) => {
  try {
    const { planId, paymentMethod, autopayConsent } = req.body;
    const plan = PLANS[planId] || PLANS['pro_monthly'];

    // Fallback: Create plan if it doesn't exist (simulating the logic in the Vercel function)
    let planIdInRazorpay = planId;
    try {
      if (!planId.startsWith('plan_')) throw new Error('Not a Razorpay Plan ID');
      await razorpay.plans.fetch(planId);
    } catch (e) {
      const planCreateRes = await razorpay.plans.create({
        period: plan.period,
        interval: plan.interval,
        item: {
          name: `DebugToDeploy ${planId}`,
          amount: plan.amount,
          currency: plan.currency,
          description: `Subscription for ${planId}`,
        }
      });
      planIdInRazorpay = planCreateRes.id;
    }

    const subscription = await razorpay.subscriptions.create({
      plan_id: planIdInRazorpay,
      customer_notify: 1,
      total_count: 12, // For testing, set a count
      notes: { user_id: req.user.id }
    });

    await supabaseAdmin.from('subscriptions').insert({
      user_id: req.user.id,
      plan_type: planId,
      subscription_id: subscription.id,
      status: 'pending',
      payment_method: paymentMethod,
      autopay_enabled: autopayConsent || false,
    });

    res.json({
      subscription_id: subscription.id,
      razorpay_subscription_id: subscription.id,
    });
  } catch (error) {
    console.error('Subscription creation failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Verify Subscription
app.post('/api/subscription/verify', authenticate, async (req, res) => {
  try {
    const { razorpay_subscription_id, razorpay_payment_id, razorpay_signature } = req.body;
    const text = razorpay_subscription_id + "|" + razorpay_payment_id;
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const { data: sub } = await supabaseAdmin.from('subscriptions').select('*').eq('subscription_id', razorpay_subscription_id).single();
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 1);

    await Promise.all([
      supabaseAdmin.from('subscriptions').update({ 
        status: 'active', 
        current_period_end: expiry.toISOString(),
        autopay_enabled: true 
      }).eq('id', sub.id),
      supabaseAdmin.from('profiles').update({ 
        subscription_status: 'pro', 
        subscription_id: razorpay_subscription_id,
        subscription_end_date: expiry.toISOString(),
        autopay_enabled: true
      }).eq('id', req.user.id)
    ]);

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Verification failed:', error);
    res.status(500).json({ error: error.message });
  }
});// 3. Manage Subscription
app.post('/api/subscription/manage', authenticate, async (req, res) => {
  try {
    const { action } = req.body;
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!subscription) return res.status(404).json({ error: 'No subscription found' });

    if (action === 'cancel') {
      await razorpay.subscriptions.cancel(subscription.subscription_id, { cancel_at_cycle_end: 1 });
      await Promise.all([
        supabaseAdmin.from('subscriptions').update({ status: 'cancelled', autopay_enabled: false }).eq('id', subscription.id),
        supabaseAdmin.from('profiles').update({ autopay_enabled: false }).eq('id', req.user.id)
      ]);
      return res.json({ status: 'ok', message: 'Subscription cancelled successfully' });
    } else if (action === 'toggle-autopay') {
      const { enabled } = req.body;
      await Promise.all([
        supabaseAdmin.from('subscriptions').update({ autopay_enabled: enabled }).eq('id', subscription.id),
        supabaseAdmin.from('profiles').update({ autopay_enabled: enabled }).eq('id', req.user.id)
      ]);
      return res.json({ status: 'ok', message: `Autopay ${enabled ? 'enabled' : 'disabled'}` });
    } else if (action === 'pause') {
      await razorpay.subscriptions.pause(subscription.subscription_id);
      await supabaseAdmin.from('subscriptions').update({ status: 'paused' }).eq('id', subscription.id);
      return res.json({ status: 'ok', message: 'Subscription paused' });
    } else if (action === 'resume') {
      await razorpay.subscriptions.resume(subscription.subscription_id);
      await Promise.all([
        supabaseAdmin.from('subscriptions').update({ status: 'active', autopay_enabled: true }).eq('id', subscription.id),
        supabaseAdmin.from('profiles').update({ subscription_status: 'pro', autopay_enabled: true }).eq('id', req.user.id)
      ]);
      return res.json({ status: 'ok', message: 'Subscription resumed' });
    }

    res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Management failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. OpenAI Proxy
app.post('/api/openai-proxy', async (req, res) => {
  const { path } = req.query;
  if (!path) return res.status(400).json({ error: 'Missing path' });

  try {
    console.log(`[Proxy] Routing AI request to: https://api.openai.com/${path}`);
    const response = await fetch(`https://api.openai.com/${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.error('[Proxy] Non-JSON response from OpenAI:', text);
      return res.status(response.status).json({ error: 'Unexpected response from AI provider', details: text });
    }

    if (!response.ok) {
      console.error('[Proxy] OpenAI Error Response:', data);
    }

    res.status(response.status).json(data);
  } catch (error) {
    console.error('[Proxy] AI Proxy failed:', error);
    res.status(500).json({ error: 'AI request failed', message: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Unified backend running on http://localhost:${PORT}`);
});
