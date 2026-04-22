import { retrySubscriptionPayment, downgradeSubscription, getPaymentHistory, getSubscriptionMetrics } from './utils.js';

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;

  // Admin-only endpoint - verify service role or special admin token
  const adminKey = req.headers['x-admin-key'];
  if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      const { action } = req.query;

      if (action === 'metrics') {
        const metrics = await getSubscriptionMetrics();
        return res.status(200).json(metrics);

      } else if (action === 'payment-history') {
        const { userId } = req.query;
        if (!userId) {
          return res.status(400).json({ error: 'userId required' });
        }
        const history = await getPaymentHistory(userId);
        return res.status(200).json(history);
      }

      return res.status(400).json({ error: 'Invalid action' });

    } else if (req.method === 'POST') {
      const { action, subscription_id, user_id } = req.body;

      if (action === 'retry-payment') {
        if (!subscription_id) {
          return res.status(400).json({ error: 'subscription_id required' });
        }
        const result = await retrySubscriptionPayment(subscription_id);
        return res.status(200).json(result);

      } else if (action === 'downgrade') {
        if (!user_id) {
          return res.status(400).json({ error: 'user_id required' });
        }
        const result = await downgradeSubscription(user_id);
        return res.status(200).json(result);
      }

      return res.status(400).json({ error: 'Invalid action' });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Admin action error:', error);
    return res.status(500).json({ error: error.message || 'Failed to process request' });
  }
}
