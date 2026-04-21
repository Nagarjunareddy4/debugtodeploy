import Razorpay from 'razorpay';

const PLANS = {
  'pro_monthly': { amount: 499, currency: 'INR' },
  'pro_yearly': { amount: 3999, currency: 'INR' }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const { planId } = req.body;
    const plan = PLANS[planId] || PLANS['pro_monthly']; // Default to monthly if not specified or invalid

    const options = {
      amount: plan.amount * 100, // amount in paise
      currency: plan.currency,
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    return res.status(200).json(order);
  } catch (error) {
    console.error('Order creation failed:', error);
    return res.status(500).json({ error: 'Failed to create order' });
  }
}
