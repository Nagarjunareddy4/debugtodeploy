import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import FormData from 'form-data';
import OpenAI, { toFile } from 'openai';
import { getJobs } from '../api/jobs/index.js';

const upload = multer({ storage: multer.memoryStorage() });

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
app.use(express.json());
app.use(cors());

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PLANS = {
  'pro_monthly': { amount: 49900, currency: 'INR', interval: 1, period: 'monthly' },
  'pro_yearly': { amount: 499900, currency: 'INR', interval: 1, period: 'yearly' }
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

    const { error: insertError } = await supabaseAdmin.from('subscriptions').insert({
      user_id: req.user.id,
      plan_type: planId,
      subscription_id: subscription.id,
      status: 'pending',
      payment_method: paymentMethod,
      autopay_enabled: autopayConsent || false,
    });

    if (insertError) {
      console.error('[Create] DB Insert Error:', insertError);
      throw insertError;
    }

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
    const text = razorpay_payment_id + "|" + razorpay_subscription_id;
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    console.log(`[Verify] Starting verification for sub: ${razorpay_subscription_id}`);
    
    if (generated_signature !== razorpay_signature) {
      console.error(`[Verify] Signature mismatch!`);
      return res.status(400).json({ error: 'Invalid signature' });
    }
    console.log(`[Verify] Signature valid. Fetching subscription from DB...`);

    const { data: sub, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('subscription_id', razorpay_subscription_id)
      .single();
    
    if (subError || !sub) {
      console.error(`[Verify] Subscription not found in DB:`, subError);
      return res.status(404).json({ error: 'Subscription not found' });
    }
    console.log(`[Verify] Found sub in DB. Updating status and profile...`);

    const expiry = new Date();
    if (sub.plan_type === 'pro_yearly') {
      expiry.setFullYear(expiry.getFullYear() + 1);
    } else {
      expiry.setMonth(expiry.getMonth() + 1);
    }

    const [subUpdate, profileUpdate] = await Promise.all([
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

    if (subUpdate.error) {
      console.error(`[Verify] Sub update failed:`, subUpdate.error);
      throw subUpdate.error;
    }
    if (profileUpdate.error) {
      console.error(`[Verify] Profile update failed:`, profileUpdate.error);
      throw profileUpdate.error;
    }

    console.log(`[Verify] Success! User ${req.user.id} is now Pro.`);
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Verification failed:', error);
    
    // FAIL-SAFE: If payment was successful but DB update failed, attempt automatic refund
    const { razorpay_payment_id } = req.body;
    if (razorpay_payment_id) {
      try {
        console.log(`[Fail-Safe] Attempting automatic refund for payment: ${razorpay_payment_id}`);
        await razorpay.payments.refund(razorpay_payment_id, {
          notes: {
            reason: 'Database update failed during verification',
            error: error.message
          }
        });
        console.log(`[Fail-Safe] Refund successful for ${razorpay_payment_id}`);
      } catch (refundError) {
        console.error('[Fail-Safe] Automatic refund failed:', refundError);
      }
    }

    res.status(500).json({ error: error.message || 'Verification failed and system could not complete activation.' });
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
      const [subRes, profRes] = await Promise.all([
        supabaseAdmin.from('subscriptions').update({ status: 'cancelled', autopay_enabled: false }).eq('id', subscription.id),
        supabaseAdmin.from('profiles').update({ autopay_enabled: false }).eq('id', req.user.id)
      ]);
      if (subRes.error) throw subRes.error;
      if (profRes.error) throw profRes.error;
      return res.json({ status: 'ok', message: 'Subscription cancelled successfully' });
    } else if (action === 'toggle-autopay') {
      const { enabled } = req.body;
      const [subRes, profRes] = await Promise.all([
        supabaseAdmin.from('subscriptions').update({ autopay_enabled: enabled }).eq('id', subscription.id),
        supabaseAdmin.from('profiles').update({ autopay_enabled: enabled }).eq('id', req.user.id)
      ]);
      if (subRes.error) throw subRes.error;
      if (profRes.error) throw profRes.error;
      return res.json({ status: 'ok', message: `Autopay ${enabled ? 'enabled' : 'disabled'}` });
    } else if (action === 'pause') {
      await razorpay.subscriptions.pause(subscription.subscription_id);
      const { error: subErr } = await supabaseAdmin.from('subscriptions').update({ status: 'paused' }).eq('id', subscription.id);
      if (subErr) throw subErr;
      return res.json({ status: 'ok', message: 'Subscription paused' });
    } else if (action === 'resume') {
      await razorpay.subscriptions.resume(subscription.subscription_id);
      const [subRes, profRes] = await Promise.all([
        supabaseAdmin.from('subscriptions').update({ status: 'active', autopay_enabled: true }).eq('id', subscription.id),
        supabaseAdmin.from('profiles').update({ subscription_status: 'pro', autopay_enabled: true }).eq('id', req.user.id)
      ]);
      if (subRes.error) throw subRes.error;
      if (profRes.error) throw profRes.error;
      return res.json({ status: 'ok', message: 'Subscription resumed' });
    }

    res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Management failed:', error);
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
app.post('/api/openai-proxy', upload.any(), async (req, res) => {
  const { path } = req.query;
  if (!path) return res.status(400).json({ error: 'Missing path' });

  try {
    console.log(`[Proxy] Incoming request for path: ${path}`);
    
    // Handle Audio Transcriptions via SDK
    if (path.includes('audio/transcriptions') && req.files && req.files.length > 0) {
      console.log(`[Proxy] Using OpenAI SDK for audio transcription...`);
      const file = req.files[0];
      
      const transcription = await openai.audio.transcriptions.create({
        file: await toFile(file.buffer, file.originalname),
        model: req.body.model || 'whisper-1',
        language: req.body.language || 'en',
      });

      return res.json(transcription);
    }

    // Handle Chat Completions via standard fetch
    console.log(`[Proxy] Routing standard AI request...`);
    const response = await fetch(`https://api.openai.com/${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('[Proxy] OpenAI Error Response:', data);
      return res.status(response.status).json(data);
    }

    res.status(response.status).json(data);
  } catch (error) {
    console.error('[Proxy] AI Proxy failed:', error);
    res.status(500).json({ error: 'AI request failed', message: error.message });
  }
});

// 4. Job Search Endpoint - India DevOps Jobs Only
app.post('/api/jobs', async (req, res) => {
  const { query, keywords = [] } = req.body;
  
  try {
    console.log(`[Jobs] Searching for: ${query} with keywords: ${keywords.join(', ')}`);
    
    // Get jobs from all sources
    const jobs = await getJobs(keywords);
    
    // Return ranked and filtered jobs
    res.json({ 
      jobs: jobs,
      count: jobs.length,
      region: 'India',
      cached: false
    });
  } catch (error) {
    console.error('[Jobs] Error:', error);
    res.status(500).json({ error: 'Failed to fetch jobs', message: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Unified backend running on http://localhost:${PORT}`);
});
