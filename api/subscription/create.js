import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';

const PLANS = {
  'pro_monthly': { amount: 49900, currency: 'INR', interval: 1, period: 'monthly' },
  'pro_yearly': { amount: 499900, currency: 'INR', interval: 1, period: 'yearly' }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { planId, paymentMethod, autopayConsent } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Missing authorization' });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid user token' });
    }

    const plan = PLANS[planId] || PLANS['pro_monthly'];

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // Create Razorpay subscription
    const subscriptionOptions = {
      plan_id: planId, // You need to create these plan IDs in Razorpay Dashboard first
      customer_notify: 1,
      quantity: 1,
      total_count: plan.period === 'monthly' ? 120 : 10,
      notes: {
        user_id: user.id,
        email: user.email,
      }
    };

    // If no plan exists in Razorpay, create it first
    let planIdInRazorpay = planId;
    try {
      // Check if planId is a valid Razorpay Plan ID (starts with plan_)
      if (!planId.startsWith('plan_')) {
        throw new Error('Not a Razorpay Plan ID');
      }
      await razorpay.plans.fetch(planId);
    } catch (e) {
      console.log(`Plan ${planId} not found or invalid, attempting to create...`);
      // Plan doesn't exist, create it
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
      console.log(`Created new Razorpay plan: ${planIdInRazorpay}`);
    }

    subscriptionOptions.plan_id = planIdInRazorpay;
    const subscription = await razorpay.subscriptions.create(subscriptionOptions);

    // Store subscription in Supabase
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error: subError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: user.id,
        plan_type: planId,
        subscription_id: subscription.id,
        status: 'pending',
        payment_method: paymentMethod,
        autopay_enabled: autopayConsent || false,
      });

    if (subError) throw subError;

    return res.status(200).json({
      subscription_id: subscription.id,
      razorpay_subscription_id: subscription.id,
    });

  } catch (error) {
    console.error('Subscription creation failed:', error);
    const errorMessage = error.error?.description || error.message || 'Failed to create subscription';
    return res.status(500).json({ error: errorMessage });
  }
}
