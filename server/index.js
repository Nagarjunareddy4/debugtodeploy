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

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for backend updates
);

// 1. Create an Order
app.post('/api/create-order', async (req, res) => {
  try {
    const { planId, currency = 'INR' } = req.body;
    
    // Server-side price verification
    let amount = 499; // Default Monthly
    if (planId === 'pro_yearly') {
      amount = 4499;
    }
    
    const options = {
      amount: amount * 100, // amount in paise
      currency,
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error('Order creation failed:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// 2. Verify Payment
app.post('/api/verify-payment', async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      userId 
    } = req.body;

    // Verify signature
    const text = razorpay_order_id + "|" + razorpay_payment_id;
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    if (generated_signature === razorpay_signature) {
      // Signature is valid! Update Supabase
      const { error } = await supabase
        .from('profiles')
        .update({ subscription_status: 'pro' })
        .eq('id', userId);

      if (error) throw error;

      res.json({ status: 'ok', message: 'Payment verified and profile updated' });
    } else {
      res.status(400).json({ status: 'error', message: 'Invalid signature' });
    }
  } catch (error) {
    console.error('Verification failed:', error);
    res.status(500).json({ error: 'Verification process failed' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Razorpay backend running on http://localhost:${PORT}`);
});
