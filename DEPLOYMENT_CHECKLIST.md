# 🔄 Pre-Deployment Checklist

## Files to Review Before Going Live

### 1. Database
**File**: `supabase_migrations.sql`
- [ ] Run entire SQL migration in Supabase SQL Editor
- [ ] Verify all 3 new tables created: `plans`, `subscriptions`, `payments`
- [ ] Verify all columns added to `profiles` table
- [ ] Verify indexes created
- [ ] Verify RLS policies applied
- [ ] Test realtime subscription updates

### 2. Environment Variables
**File**: `.env`
- [ ] Add real Razorpay Key ID (production)
- [ ] Add real Razorpay Key Secret (production)
- [ ] Add real Razorpay Webhook Secret
- [ ] Generate secure ADMIN_API_KEY
- [ ] Verify Supabase Service Role Key is present
- [ ] Update webhook URL in Razorpay Dashboard

### 3. Backend APIs
**Files**:
- `api/subscription/create.js` - Update Razorpay plan IDs
- `api/subscription/verify.js` - No changes needed
- `api/subscription/manage.js` - No changes needed
- `api/webhook/razorpay.js` - Verify webhook secret handling
- `api/subscription/utils.js` - No changes needed
- `api/subscription/admin.js` - Verify admin key check

**Action**: Test each endpoint with curl or Postman

### 4. Frontend
**File**: `src/pages/Checkout.tsx`
- [ ] Test subscription creation flow
- [ ] Verify autopay toggle works
- [ ] Confirm success/failure handling
- [ ] Check payment status messages

**File**: `src/components/subscription/SubscriptionManager.tsx`
- [ ] Add to Settings page or create new page
- [ ] Test pause/resume buttons
- [ ] Test cancel subscription flow
- [ ] Verify real-time updates

**File**: `src/lib/useSubscription.ts`
- [ ] Import in components that need subscription data
- [ ] Test realtime subscription changes

### 5. Mobile App
**Directory**: `mobile/`
- [ ] Copy `.env.example` to `.env`
- [ ] Update Supabase credentials
- [ ] Update API URL
- [ ] Test login/signup
- [ ] Test dashboard loading
- [ ] Test subscription screen
- [ ] Build for both Android and iOS

### 6. Documentation Files
**Files**:
- `SUBSCRIPTION_SETUP.md` - Complete setup guide
- `API_DOCUMENTATION.md` - API reference
- `UPGRADE_SUMMARY.md` - Overview of changes
- `mobile/README.md` - Mobile deployment guide

---

## Critical Configuration

### Razorpay Dashboard Setup

1. **Create Plans**:
   ```
   Plan 1: pro_monthly
   - Amount: 49900 paise (₹499)
   - Period: monthly
   - Interval: 1
   
   Plan 2: pro_yearly
   - Amount: 399900 paise (₹3999)
   - Period: yearly
   - Interval: 1
   ```

2. **Setup Webhook**:
   - URL: `https://yourdomain.com/api/webhook/razorpay`
   - Events: subscription.charged, subscription.completed, payment.failed, subscription.cancelled, subscription.paused, subscription.resumed
   - Copy webhook secret to `.env` as `RAZORPAY_WEBHOOK_SECRET`

### Supabase Setup

1. **Insert Razorpay Plan IDs**:
   ```sql
   UPDATE plans SET razorpay_plan_id = 'plan_xxx' WHERE plan_type = 'pro_monthly';
   UPDATE plans SET razorpay_plan_id = 'plan_yyy' WHERE plan_type = 'pro_yearly';
   ```

---

## Deployment Order

1. **Database First**
   - Run migrations in Supabase
   - Verify tables and data

2. **Backend Second**
   - Deploy API functions
   - Test with Postman
   - Verify webhooks working

3. **Frontend Third**
   - Deploy web app to Vercel
   - Test checkout flow
   - Monitor errors

4. **Mobile Last**
   - Build and submit to stores
   - Or distribute as APK/IPA

---

## Testing Scenarios

### Scenario 1: Successful Subscription
- [ ] Navigate to pricing page
- [ ] Select Pro plan
- [ ] Go to checkout
- [ ] Select payment method
- [ ] Use test card: 4111 1111 1111 1111
- [ ] Complete payment
- [ ] Verify subscription in database
- [ ] Check webhook event received
- [ ] Confirm user upgraded to PRO

### Scenario 2: Autopay Enabled
- [ ] Create subscription with autopay enabled
- [ ] Verify `autopay_enabled = true` in database
- [ ] Simulate monthly charge in Razorpay
- [ ] Verify webhook processes charge
- [ ] Check `next_billing_date` updated

### Scenario 3: Payment Failure
- [ ] Create subscription
- [ ] Use failing card: 4000 0000 0000 0002
- [ ] Simulate failed payment in Razorpay
- [ ] Verify payment failure recorded
- [ ] Check failure_count incremented
- [ ] Repeat to trigger downgrade

### Scenario 4: Subscription Management
- [ ] View active subscription
- [ ] Click pause → verify status changes
- [ ] Click resume → verify status changes
- [ ] Toggle autopay → verify in database
- [ ] Cancel → verify downgraded to free

---

## Monitoring Setup

Add monitoring for:
- [ ] Webhook delivery failures (Razorpay Dashboard)
- [ ] Database trigger errors (Supabase Logs)
- [ ] API function errors (Vercel Logs)
- [ ] Payment processing delays (custom logging)
- [ ] Downgrade events (email notification)

---

## Rollback Plan

If issues occur:

1. **Stop new subscriptions**
   - Disable subscribe button or route

2. **Revert frontend**
   - Old `/api/create-order` endpoint still exists
   - Can fall back to one-time payments

3. **Revert database**
   - Keep old `subscription_status` in profiles
   - New tables can be dropped safely

4. **Verify users unaffected**
   - Check payment and subscription records
   - Manual intervention if needed

---

## Sign-Off Checklist

Before marking complete:
- [ ] All database tables verified
- [ ] All API endpoints tested
- [ ] Webhook events confirmed
- [ ] Frontend flow tested end-to-end
- [ ] Mobile app built successfully
- [ ] Documentation reviewed
- [ ] Team trained on new system
- [ ] Monitoring configured
- [ ] Rollback plan documented
- [ ] Go-live date scheduled

---

## Post-Deployment

### Day 1
- [ ] Monitor webhook delivery
- [ ] Check error logs hourly
- [ ] Verify first transactions
- [ ] Test customer support flow

### Week 1
- [ ] Review payment patterns
- [ ] Check subscription metrics
- [ ] Verify autopay working
- [ ] Monitor for edge cases

### Month 1
- [ ] Analyze subscription adoption
- [ ] Review failed payments
- [ ] Check churn rate
- [ ] Optimize based on data

---

## Quick Reference

### Key Files Modified/Created
```
Database:
  supabase_migrations.sql (MODIFIED)

Backend:
  api/subscription/create.js (NEW)
  api/subscription/verify.js (NEW)
  api/subscription/manage.js (NEW)
  api/webhook/razorpay.js (NEW)
  api/subscription/utils.js (NEW)
  api/subscription/admin.js (NEW)

Frontend:
  src/pages/Checkout.tsx (MODIFIED)
  src/components/subscription/SubscriptionManager.tsx (NEW)
  src/lib/useSubscription.ts (NEW)

Mobile:
  mobile/ (ENTIRE DIRECTORY NEW)

Config:
  .env (MODIFIED - added webhook secret)

Docs:
  SUBSCRIPTION_SETUP.md (NEW)
  API_DOCUMENTATION.md (NEW)
  UPGRADE_SUMMARY.md (NEW)
  mobile/README.md (NEW)
```

### Environment Variables Required
```
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
ADMIN_API_KEY=
VITE_RAZORPAY_KEY_ID=
SUPABASE_SERVICE_ROLE_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### API Endpoints
```
POST /api/subscription/create
POST /api/subscription/verify
GET  /api/subscription/manage
POST /api/subscription/manage
POST /api/webhook/razorpay
GET  /api/subscription/admin
POST /api/subscription/admin
```

---

## Emergency Contacts

If issues arise:
1. Check Razorpay Dashboard for webhook delivery status
2. Check Supabase Logs for function errors
3. Check Vercel Logs for API errors
4. Review mobile app TestFlight/Google Play Console logs
5. Check webhook secret matches in both places

Good luck with your deployment! 🚀
