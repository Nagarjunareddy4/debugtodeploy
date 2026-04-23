import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Retry payment for failed subscription
 * Called by webhook or manual trigger
 */
export async function retrySubscriptionPayment(subscriptionId) {
  try {
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .single();

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Retry the payment via Razorpay
    const retryResponse = await razorpay.subscriptions.retrieveSignups(subscriptionId);

    return {
      success: true,
      message: 'Retry triggered',
      subscription_id: subscriptionId,
    };
  } catch (error) {
    console.error('Retry payment failed:', error);
    throw error;
  }
}

/**
 * Auto-downgrade user if subscription fails
 */
export async function downgradeSubscription(userId) {
  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_status: 'free',
        current_subscription_plan: 'free',
        subscription_id: null,
        subscription_end_date: null,
      })
      .eq('id', userId);

    if (error) throw error;

    return {
      success: true,
      message: 'User downgraded to free plan',
      user_id: userId,
    };
  } catch (error) {
    console.error('Downgrade failed:', error);
    throw error;
  }
}

/**
 * Get subscription payment history
 */
export async function getPaymentHistory(userId) {
  try {
    const { data: payments, error } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return payments;
  } catch (error) {
    console.error('Failed to fetch payment history:', error);
    throw error;
  }
}

/**
 * Update subscription next billing date
 */
export async function updateNextBillingDate(subscriptionId, nextDate) {
  try {
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        next_billing_date: nextDate.toISOString(),
      })
      .eq('subscription_id', subscriptionId);

    if (error) throw error;

    return {
      success: true,
      subscription_id: subscriptionId,
      next_billing_date: nextDate.toISOString(),
    };
  } catch (error) {
    console.error('Failed to update billing date:', error);
    throw error;
  }
}

/**
 * Get subscription metrics
 */
export async function getSubscriptionMetrics() {
  try {
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('status');

    const { data: payments, error: payError } = await supabaseAdmin
      .from('payments')
      .select('status');

    if (subError || payError) throw new Error('Failed to fetch metrics');

    const metrics = {
      total_subscriptions: subscriptions.length,
      active_subscriptions: subscriptions.filter(s => s.status === 'active').length,
      paused_subscriptions: subscriptions.filter(s => s.status === 'paused').length,
      failed_subscriptions: subscriptions.filter(s => s.status === 'failed').length,
      cancelled_subscriptions: subscriptions.filter(s => s.status === 'cancelled').length,
      successful_payments: payments.filter(p => p.status === 'captured').length,
      failed_payments: payments.filter(p => p.status === 'failed').length,
    };

    return metrics;
  } catch (error) {
    console.error('Failed to get metrics:', error);
    throw error;
  }
}
