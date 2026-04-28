import Razorpay from 'razorpay';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const PLANS = {
  'pro_monthly': { amount: 49900, currency: 'INR', interval: 1, period: 'monthly' },
  'pro_yearly': { amount: 399900, currency: 'INR', interval: 1, period: 'yearly' }
};

async function main() {
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  for (const [planId, plan] of Object.entries(PLANS)) {
    try {
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
      console.log(`Created new Razorpay plan for ${planId}: ${planCreateRes.id}`);
    } catch (e) {
      console.error(`Failed to create plan ${planId}:`, e.error ? e.error : e);
    }
  }
}

main();
