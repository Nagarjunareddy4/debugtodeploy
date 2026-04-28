import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

// Middleware to capture raw body for webhook signature verification
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    if (req.rawBody) {
      resolve(req.rawBody);
    } else if (req.body) {
      resolve(JSON.stringify(req.body));
    } else {
      let data = '';
      req.on('data', chunk => {
        data += chunk;
      });
      req.on('end', () => {
        resolve(data);
      });
      req.on('error', reject);
    }
  });
}

export const config = {
  api: {
    bodyParser: {
      raw: true,
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = await getRawBody(req);

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse body after verification
    const event = JSON.parse(rawBody);
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    switch (event.event) {
      case 'subscription.charged':
        await handleSubscriptionCharged(event, supabaseAdmin);
        break;

      case 'subscription.completed':
        await handleSubscriptionCompleted(event, supabaseAdmin);
        break;

      case 'payment.failed':
        await handlePaymentFailed(event, supabaseAdmin);
        break;

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(event, supabaseAdmin);
        break;

      case 'subscription.paused':
        await handleSubscriptionPaused(event, supabaseAdmin);
        break;

      case 'subscription.resumed':
        await handleSubscriptionResumed(event, supabaseAdmin);
        break;

      default:
        console.log('Unhandled event:', event.event);
    }

    return res.status(200).json({ status: 'ok' });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function handleSubscriptionCharged(event, supabaseAdmin) {
  const { payload } = event;
  const subscription = payload.subscription.entity;
  const payment = payload.payment.entity;

  // Find subscription in DB
  const { data: sub, error: subError } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('subscription_id', subscription.id)
    .single();

  if (subError || !sub) {
    console.error('Subscription not found:', subscription.id);
    return;
  }

  // Update subscription
  const nextBillingDate = new Date(subscription.current_period_end * 1000);
  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'active',
      next_billing_date: nextBillingDate.toISOString(),
      failure_count: 0,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: nextBillingDate.toISOString(),
      autopay_enabled: true,
    })
    .eq('id', sub.id);

  // Record payment
  await supabaseAdmin
    .from('payments')
    .insert({
      user_id: sub.user_id,
      subscription_id: sub.id,
      payment_id: payment.id,
      status: 'captured',
      amount_inr: payment.amount / 100,
      payment_method: payment.method,
    });

  // Update profile
  await supabaseAdmin
    .from('profiles')
    .update({
      subscription_status: 'pro',
      subscription_end_date: nextBillingDate.toISOString(),
      payment_failures: 0,
      autopay_enabled: true,
    })
    .eq('id', sub.user_id);
}

async function handleSubscriptionCompleted(event, supabaseAdmin) {
  const { payload } = event;
  const subscription = payload.subscription.entity;

  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('subscription_id', subscription.id)
    .single();

  if (!sub) return;

  // Mark subscription as completed
  await supabaseAdmin
    .from('subscriptions')
    .update({ status: 'completed' })
    .eq('id', sub.id);

  // Downgrade user to free
  await supabaseAdmin
    .from('profiles')
    .update({
      subscription_status: 'free',
      current_subscription_plan: 'free',
    })
    .eq('id', sub.user_id);
}

async function handlePaymentFailed(event, supabaseAdmin) {
  const { payload } = event;
  const payment = payload.payment.entity;

  // Find subscription
  if (!payment.subscription_id) return;

  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('subscription_id', payment.subscription_id)
    .single();

  if (!sub) return;

  const failureCount = (sub.failure_count || 0) + 1;

  // Record payment failure
  await supabaseAdmin
    .from('payments')
    .insert({
      user_id: sub.user_id,
      subscription_id: sub.id,
      payment_id: payment.id,
      status: 'failed',
      error_message: payment.error_description || 'Payment failed',
      amount_inr: payment.amount / 100,
      payment_method: payment.method,
    });

  // Update subscription failure count
  await supabaseAdmin
    .from('subscriptions')
    .update({ failure_count: failureCount })
    .eq('id', sub.id);

  // If more than 2 failures, downgrade to free
  if (failureCount > 2) {
    await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'failed' })
      .eq('id', sub.id);

    await supabaseAdmin
      .from('profiles')
      .update({
        subscription_status: 'free',
        current_subscription_plan: 'free',
        subscription_id: null,
        subscription_end_date: null,
        payment_failures: failureCount,
      })
      .eq('id', sub.user_id);
  }
}

async function handleSubscriptionCancelled(event, supabaseAdmin) {
  const { payload } = event;
  const subscription = payload.subscription.entity;

  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('subscription_id', subscription.id)
    .single();

  if (!sub) return;

  // Mark as cancelled
  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', sub.id);

  // Downgrade user
  await supabaseAdmin
    .from('profiles')
    .update({
      subscription_status: 'free',
      current_subscription_plan: 'free',
      subscription_id: null,
    })
    .eq('id', sub.user_id);
}

async function handleSubscriptionPaused(event, supabaseAdmin) {
  const { payload } = event;
  const subscription = payload.subscription.entity;

  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('subscription_id', subscription.id)
    .single();

  if (!sub) return;

  await supabaseAdmin
    .from('subscriptions')
    .update({ status: 'paused' })
    .eq('id', sub.id);

  // Keep user as pro but mark status
  await supabaseAdmin
    .from('profiles')
    .update({ subscription_status: 'pro' })
    .eq('id', sub.user_id);
}

async function handleSubscriptionResumed(event, supabaseAdmin) {
  const { payload } = event;
  const subscription = payload.subscription.entity;

  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('subscription_id', subscription.id)
    .single();

  if (!sub) return;

  await supabaseAdmin
    .from('subscriptions')
    .update({ status: 'active', autopay_enabled: true })
    .eq('id', sub.id);

  await supabaseAdmin
    .from('profiles')
    .update({ subscription_status: 'pro', autopay_enabled: true })
    .eq('id', sub.user_id);
}
