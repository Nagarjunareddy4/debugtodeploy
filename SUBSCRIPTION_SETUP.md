# DebugToDeploy - Subscription System Upgrade

Complete upgrade guide for Netflix-style subscription system with Razorpay integration.

## 📋 What's Changed

### Database (Supabase)
- **New Tables**: `subscriptions`, `payments`, `plans`
- **Updated**: `profiles` table with subscription fields
- **Indexes**: Added for performance
- **RLS**: Policies for user data protection
- **Realtime**: Enabled for live subscription updates

### Backend APIs
- `/api/subscription/create` - Create new subscription
- `/api/subscription/verify` - Verify subscription payment
- `/api/subscription/manage` - Manage existing subscriptions (pause, resume, cancel, toggle autopay)
- `/api/webhook/razorpay` - Handle Razorpay events

### Frontend
- Updated `Checkout.tsx` for subscription flow
- New `SubscriptionManager.tsx` component
- New `useSubscription.ts` hook
- Real-time subscription status updates

### Mobile (React Native)
- Expo-based app with same backend
- Authentication, dashboard, subscription management
- Ready for Google Play Store & App Store deployment

## 🚀 Setup Instructions

### 1. Database Migration

1. Go to Supabase → SQL Editor
2. Copy entire content from `supabase_migrations.sql`
3. Paste and run in SQL Editor
4. Verify all tables are created

### 2. Razorpay Configuration

#### Create Plans in Razorpay Dashboard
```
Plan 1: Fleet Captain Monthly
- Amount: ₹499
- Interval: 1 month
- Billing Period: monthly

Plan 2: Fleet Captain Yearly  
- Amount: ₹3999
- Interval: 1 year
- Billing Period: yearly
```

Note the plan IDs and update them in `/api/subscription/create.js`

#### Setup Webhook
1. Go to Razorpay Dashboard → Settings → Webhooks
2. Add webhook URL: `https://your-domain.com/api/webhook/razorpay`
3. Events to subscribe:
   - subscription.charged
   - subscription.completed
   - payment.failed
   - subscription.cancelled
   - subscription.paused
   - subscription.resumed
4. Copy webhook secret to `.env` as `RAZORPAY_WEBHOOK_SECRET`

### 3. Environment Variables

Update `.env`:
```bash
# Razorpay
RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
VITE_RAZORPAY_KEY_ID=your_key

# Supabase (already set)
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 4. Deploy Web App (Vercel)

```bash
git add .
git commit -m "Add subscription system"
git push
```

Vercel will auto-deploy. Verify:
- Checkout page works
- Subscription creation succeeds
- Webhooks are received (check function logs)

### 5. Deploy Mobile App

```bash
cd mobile
npm install

# Setup credentials
eas credentials

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

## 🔄 Payment Flow

### New Subscription
1. User selects plan → clicks "Subscribe"
2. Frontend calls `/api/subscription/create`
3. Backend creates Razorpay subscription
4. Razorpay Checkout modal opens
5. User completes payment
6. Razorpay sends `payment.captured` event via webhook
7. Backend updates subscription status to `active`
8. Frontend receives success → redirects to dashboard

### Auto-Renewal
1. Monthly/yearly charge date arrives
2. Razorpay attempts payment via saved method
3. If successful: `subscription.charged` event → updates `next_billing_date`
4. If fails: `payment.failed` event → increment `failure_count`
5. After 2 failures: `subscription.failed` event → downgrade to FREE

### User Actions
- **Cancel**: User clicks cancel → subscription marked cancelled
- **Pause**: Pauses billing, can resume later
- **Toggle Autopay**: Enable/disable auto-renewal

## 🔐 Security Notes

1. **Webhook Verification**: All webhooks verified via HMAC signature
2. **Sensitive Fields**: `subscription_status`, `subscription_id` protected by trigger
3. **Service Role Only**: Critical updates use Supabase admin key
4. **RLS Policies**: Users can only view their own subscriptions
5. **Signature Verification**: Razorpay webhook signature must match

## 📱 Mobile App

Located in `/mobile` folder

### Key Screens
- **Auth**: Login/signup with Supabase
- **Dashboard**: User stats and subscription status
- **Subscription**: Manage subscription, toggle autopay, cancel
- **Profile**: View user info and progress
- **Settings**: App settings and logout

### Configuration
Update `mobile/.env`:
```
EXPO_PUBLIC_SUPABASE_URL=your_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key
EXPO_PUBLIC_API_URL=your_api_url
```

## 🧪 Testing

### Test Razorpay Cards
- **Success**: 4111 1111 1111 1111 (any future date, any CVV)
- **Failure**: 4000 0000 0000 0002
- **Soft Decline**: 4000 0000 0000 9995

### Test Subscriptions
1. Create subscription with test card
2. Check Supabase `subscriptions` table
3. Verify webhook events in Razorpay logs
4. Test downgrade: trigger payment failure >2 times

## 🐛 Common Issues

### "Invalid Signature" Webhook Error
- Verify `RAZORPAY_WEBHOOK_SECRET` is correct
- Ensure webhook URL is accessible
- Check raw body parsing is enabled

### Subscription Not Updating
- Check Supabase RLS policies are correct
- Verify service role key in env
- Check Supabase logs for trigger errors

### Payment Modal Not Opening
- Verify Razorpay key is correct
- Check browser console for errors
- Ensure plan IDs match between Razorpay & code

## 📚 Files Modified/Created

### Modified
- `src/pages/Checkout.tsx` - Subscription flow
- `supabase_migrations.sql` - Database schema
- `.env` - Webhook secret added
- `package.json` - Already has Razorpay dependency

### Created
- `api/subscription/create.js` - Create subscription
- `api/subscription/verify.js` - Verify payment
- `api/subscription/manage.js` - Manage subscription
- `api/webhook/razorpay.js` - Handle webhooks
- `src/lib/useSubscription.ts` - Subscription hook
- `src/components/subscription/SubscriptionManager.tsx` - UI component
- `mobile/` - Complete React Native app

## 🎯 Next Steps

1. ✅ Run database migrations
2. ✅ Create Razorpay plans
3. ✅ Setup webhook
4. ✅ Update environment variables
5. ✅ Test payment flow locally
6. ✅ Deploy to Vercel
7. ✅ Deploy mobile apps
8. ✅ Monitor webhooks in production
9. ✅ Add error handling/retry UI
10. ✅ Setup monitoring/alerts

## 📞 Support

Check logs:
- Supabase → Logs tab for function errors
- Vercel → Functions for API errors
- Razorpay Dashboard → Webhooks for event delivery
- Browser console for frontend errors
