import crypto from 'crypto';
import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      razorpay_subscription_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing authorization header' });
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

    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    // Verify signature
    const text = razorpay_payment_id + "|" + razorpay_subscription_id;
    const generated_signature = crypto
      .createHmac('sha256', key_secret)
      .update(text)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ status: 'error', message: 'Invalid signature' });
    }

    // Signature valid - update subscription
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Update subscription status
    const { data: subscription, error: subFetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('subscription_id', razorpay_subscription_id)
      .single();

    if (subFetchError || !subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const nextBillingDate = new Date();
    if (subscription.plan_type === 'pro_yearly') {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    } else {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    }

    // Update subscription to active
    const { error: updateSubError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: nextBillingDate.toISOString(),
        next_billing_date: nextBillingDate.toISOString(),
        autopay_enabled: true,
      })
      .eq('id', subscription.id);

    if (updateSubError) throw updateSubError;

    // Record payment
    const { error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id: user.id,
        subscription_id: subscription.id,
        payment_id: razorpay_payment_id,
        status: 'captured',
        amount_inr: subscription.plan_type === 'pro_yearly' ? 3999 : 499,
        payment_method: subscription.payment_method,
      });

    if (paymentError) throw paymentError;

    // Update profile subscription status
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_status: 'pro',
        subscription_id: razorpay_subscription_id,
        current_subscription_plan: subscription.plan_type,
        subscription_end_date: nextBillingDate.toISOString(),
        autopay_enabled: true,
        payment_method: subscription.payment_method,
        payment_failures: 0,
      })
      .eq('id', user.id);

    if (profileError) throw profileError;

    return res.status(200).json({ 
      status: 'ok', 
      message: 'Subscription activated successfully',
      subscription_id: subscription.id,
    });

  } catch (error) {
    console.error('Verification failed:', error);
    
    // FAIL-SAFE: If payment was successful but DB update failed, attempt automatic refund
    const { razorpay_payment_id } = req.body;
    let refundInitiated = false;
    if (razorpay_payment_id) {
      try {
        console.log(`[Fail-Safe] Attempting automatic refund for payment: ${razorpay_payment_id}`);
        const razorpayClient = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        await razorpayClient.payments.refund(razorpay_payment_id, {
          notes: { reason: 'DB Update Failed', error: error.message }
        });
        refundInitiated = true;
        console.log(`[Fail-Safe] Refund initiated successfully for: ${razorpay_payment_id}`);
      } catch (refundError) {
        console.error('Automatic refund failed:', refundError.message);
      }
    }

    return res.status(500).json({ 
      error: refundInitiated 
        ? 'Subscription activation failed. A refund has been automatically initiated to your original payment method within 5-7 business days.'
        : 'Verification failed. Please contact support with your payment ID for a manual refund.',
      refund_initiated: refundInitiated,
      payment_id: razorpay_payment_id || null,
    });
  }
}
