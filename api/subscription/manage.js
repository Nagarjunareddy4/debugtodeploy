import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization' });
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid user token' });
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    if (req.method === 'GET') {
      // Get subscription status
      const { data: subscription, error } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        return res.status(404).json({ error: 'No subscription found' });
      }

      return res.status(200).json(subscription);

    } else if (req.method === 'POST') {
      const { action } = req.body;

      const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!subscription) {
        return res.status(404).json({ error: 'No subscription found' });
      }

      if (action === 'cancel') {
        // Cancel subscription in Razorpay at the end of the cycle
        await razorpay.subscriptions.cancel(subscription.subscription_id, {
          cancel_at_cycle_end: 1
        });

        // Update local DB
        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            autopay_enabled: false
          })
          .eq('id', subscription.id);

        await supabaseAdmin
          .from('profiles')
          .update({ autopay_enabled: false })
          .eq('id', user.id);

        return res.status(200).json({ 
          status: 'ok',
          message: 'Subscription cancelled successfully'
        });

      } else if (action === 'toggle-autopay') {
        const { enabled } = req.body;

        await supabaseAdmin
          .from('subscriptions')
          .update({ autopay_enabled: enabled })
          .eq('id', subscription.id);

        await supabaseAdmin
          .from('profiles')
          .update({ autopay_enabled: enabled })
          .eq('id', user.id);

        return res.status(200).json({ 
          status: 'ok',
          message: `Autopay ${enabled ? 'enabled' : 'disabled'}`
        });

      } else if (action === 'pause') {
        await razorpay.subscriptions.pause(subscription.subscription_id);

        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'paused' })
          .eq('id', subscription.id);

        return res.status(200).json({ 
          status: 'ok',
          message: 'Subscription paused'
        });

      } else if (action === 'resume') {
        await razorpay.subscriptions.resume(subscription.subscription_id);

        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'active' })
          .eq('id', subscription.id);

        return res.status(200).json({ 
          status: 'ok',
          message: 'Subscription resumed'
        });
      }

      return res.status(400).json({ error: 'Invalid action' });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Subscription management error:', error);
    return res.status(500).json({ error: error.message || 'Failed to process request' });
  }
}
