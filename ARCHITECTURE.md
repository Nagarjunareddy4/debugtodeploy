# 🏗️ Technical Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                        │
├─────────────────────────────────────────────────────────┤
│  Web (React/TypeScript)         Mobile (React Native)   │
│  - Checkout.tsx                 - SubscriptionScreen    │
│  - SubscriptionManager          - Authentication        │
│  - useSubscription hook         - Dashboard             │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                   API LAYER (Vercel)                    │
├─────────────────────────────────────────────────────────┤
│  /api/subscription/create      POST Create subscription │
│  /api/subscription/verify      POST Verify payment      │
│  /api/subscription/manage      GET/POST Manage sub      │
│  /api/webhook/razorpay         POST Handle webhooks     │
│  /api/subscription/admin       GET/POST Admin ops       │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│              PAYMENT PROCESSOR (Razorpay)               │
├─────────────────────────────────────────────────────────┤
│  - Subscription API (recurring billing)                 │
│  - Order API (one-time payments)                        │
│  - Webhook Events (async notifications)                 │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│          DATABASE LAYER (Supabase PostgreSQL)           │
├─────────────────────────────────────────────────────────┤
│  Tables:                                                │
│  - profiles (user data + subscription fields)           │
│  - subscriptions (subscription records)                 │
│  - payments (payment history)                           │
│  - plans (available plans)                              │
│  - activity_log (user activity)                         │
│                                                         │
│  Features:                                              │
│  - Row-level security (RLS)                             │
│  - Realtime subscriptions                               │
│  - Database triggers (sensitive field protection)       │
│  - Indexes (performance optimization)                   │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

### New Subscription Creation
```
1. User selects plan on Pricing page
   ↓
2. Redirected to Checkout page with plan details
   ↓
3. Select payment method (UPI/Card/Net Banking)
   ↓
4. Enable autopay (optional)
   ↓
5. Click "Subscribe"
   ↓
6. Frontend calls /api/subscription/create
   ├─ Verifies user token
   ├─ Creates Razorpay subscription (if plan not exists)
   └─ Records subscription in Supabase
   ↓
7. Razorpay Checkout modal opens
   ↓
8. User completes payment
   ↓
9. Razorpay returns payment details to frontend
   ↓
10. Frontend calls /api/subscription/verify
    ├─ Verifies signature (HMAC SHA256)
    ├─ Updates subscription status → active
    ├─ Records payment
    └─ Updates profile subscription_status → pro
    ↓
11. Frontend redirects to dashboard
    ↓
12. User can now access pro features
```

### Payment Success Via Webhook
```
1. Razorpay billing date arrives
   ↓
2. Attempts charge via saved payment method
   ↓
3. If successful: Razorpay fires subscription.charged event
   ↓
4. Webhook hits /api/webhook/razorpay
   ├─ Verifies webhook signature
   ├─ Parses event payload
   ├─ Calls handleSubscriptionCharged()
   │  ├─ Updates subscription.next_billing_date
   │  ├─ Records payment
   │  └─ Extends subscription.current_period_end
   └─ Returns 200 OK
   ↓
5. Next Supabase realtime update syncs to client
   ↓
6. Frontend displays updated next billing date
```

### Payment Failure & Recovery
```
1. Razorpay attempts charge
   ↓
2. Payment fails (decline, network error, etc)
   ↓
3. Razorpay fires payment.failed event
   ↓
4. Webhook hits /api/webhook/razorpay
   ├─ Verifies signature
   ├─ Calls handlePaymentFailed()
   │  ├─ Records failed payment
   │  ├─ Increments failure_count
   │  └─ If failure_count > 2:
   │     ├─ Updates subscription.status → failed
   │     └─ Downgrades user to FREE
   └─ Returns 200 OK
   ↓
5. (Optional) System retries payment 1-2 times
   ↓
6. If still fails after retries:
   ├─ User notified of payment failure
   ├─ Access to pro features revoked
   └─ Offered option to retry payment
```

## Database Schema

### profiles table (updated)
```
Primary fields:
- id (UUID) - Supabase auth user ID
- email (TEXT)
- full_name (TEXT)
- avatar_url (TEXT)

Progress fields:
- xp (INT) - Experience points
- level (INT) - User level
- streak (INT) - Login streak
- labs_completed (INT)
- readiness_score (INT)

Subscription fields (NEW):
- subscription_status (TEXT) - 'free' or 'pro'
- subscription_id (TEXT) - Razorpay subscription ID
- current_subscription_plan (TEXT) - 'free', 'pro_monthly', 'pro_yearly'
- subscription_end_date (TIMESTAMP) - When subscription expires
- autopay_enabled (BOOLEAN) - Auto-renewal enabled?
- payment_method (TEXT) - Last used method (upi/card/netbanking)
- payment_failures (INT) - Consecutive failed payments
```

### subscriptions table (NEW)
```
- id (UUID) - Primary key
- user_id (UUID) - Reference to auth.users
- plan_type (TEXT) - Reference to plans.plan_type
- subscription_id (TEXT) - Razorpay subscription ID (unique)
- status (TEXT) - 'pending', 'active', 'paused', 'failed', 'cancelled', 'completed'
- payment_method (TEXT) - UPI/Card/NetBanking
- autopay_enabled (BOOLEAN)
- current_period_start (TIMESTAMP) - When this cycle started
- current_period_end (TIMESTAMP) - When this cycle ends
- next_billing_date (TIMESTAMP) - When next payment due
- cancelled_at (TIMESTAMP) - When subscription cancelled
- failure_count (INT) - Failed payment attempts
- created_at (TIMESTAMP) - Creation time
- updated_at (TIMESTAMP) - Last update time

Indexes:
- idx_subscriptions_user (user_id)
- idx_subscriptions_sub_id (subscription_id)
```

### payments table (NEW)
```
- id (UUID) - Primary key
- user_id (UUID) - Reference to auth.users
- subscription_id (UUID) - Reference to subscriptions (nullable)
- payment_id (TEXT) - Razorpay payment ID (unique)
- order_id (TEXT) - Razorpay order ID (for one-time payments)
- amount_inr (INT) - Amount in paise
- status (TEXT) - 'pending', 'captured', 'failed'
- payment_method (TEXT) - UPI/Card/NetBanking
- error_message (TEXT) - If failed, why?
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

Indexes:
- idx_payments_user (user_id)
- idx_payments_subscription (subscription_id)
- idx_payments_payment_id (payment_id)
```

### plans table (NEW)
```
- id (SERIAL)
- name (TEXT) - 'Free Fleet', 'Fleet Captain Monthly', etc
- plan_type (TEXT) - 'free', 'pro_monthly', 'pro_yearly'
- amount_inr (INT) - Price in paise
- currency (TEXT) - 'INR'
- billing_period (TEXT) - 'month', 'year'
- description (TEXT)
- features (JSONB) - Array of feature strings
- created_at (TIMESTAMP)

Sample data inserted on migration
```

## Security Architecture

### Authentication
```
Frontend (Web/Mobile)
    ↓
Supabase Auth (OAuth/Email)
    ↓
JWT access_token
    ↓
Sent in Authorization header: "Bearer <token>"
    ↓
Backend verifies with Supabase auth API
    ↓
Proceeds if valid, rejects if invalid
```

### Webhook Verification
```
Razorpay sends webhook
    ↓
Includes signature header: x-razorpay-signature
    ↓
Backend receives raw body
    ↓
Computes HMAC-SHA256:
  hash = HMAC-SHA256(body, RAZORPAY_WEBHOOK_SECRET)
    ↓
Compares computed hash with provided signature
    ↓
If match: Trust webhook, process event
If no match: Reject, return 401
```

### Data Protection
```
Sensitive fields in profiles table:
- subscription_status
- subscription_id
- payment_method
- payment_failures

Protection mechanism:
- Database trigger: protect_sensitive_profile_columns()
- Only service role can update these
- Client-side updates revert to old value
- Error logged for debugging

RLS Policies:
- Users SELECT only own profile
- Users UPDATE only own non-sensitive fields
- Service role bypasses all restrictions
```

## Failure Handling Strategy

### Payment Failure Flow
```
Attempt 1: Payment fails
  → failure_count = 1
  → Razorpay auto-retries within 24 hours

Attempt 2: Still fails
  → failure_count = 2
  → Razorpay attempts one more retry

Attempt 3: Fails again
  → failure_count = 3
  → Automatic downgrade triggered:
      ├─ subscription.status = 'failed'
      ├─ profiles.subscription_status = 'free'
      ├─ User loses pro access
      └─ User notified (implement email)

Recovery:
  → User can manually retry from UI
  → Or pay again when ready
```

## Scalability Considerations

### Database Optimization
```
✓ Indexes on frequently queried columns
✓ Partitioning ready for large scale (monthly by date)
✓ Materialized views possible for analytics
✓ Archive old payments to cold storage
```

### API Optimization
```
✓ Webhook batching possible
✓ Caching user subscription status (Redis)
✓ Rate limiting not yet implemented (add if needed)
✓ Async processing for email notifications
```

### Real-Time Sync
```
Supabase Realtime:
- Subscriptions table tracked
- Payments table tracked (high volume, optional)
- Automatic client updates on changes
- 100+ concurrent subscriptions supported
```

## Configuration Management

### Environment Variables
```
Development:
  RAZORPAY_KEY_ID=rzp_test_xxx
  RAZORPAY_WEBHOOK_SECRET=whsec_test_xxx
  ADMIN_API_KEY=dev_key_xxx

Production:
  RAZORPAY_KEY_ID=rzp_live_xxx
  RAZORPAY_WEBHOOK_SECRET=whsec_live_xxx
  ADMIN_API_KEY=prod_key_xxx (rotate quarterly)
```

### Feature Flags (Optional)
```
Add flags for:
- Enable/disable subscriptions
- Auto-downgrade on payment failure
- Email notifications
- Webhook retry attempts
```

## Monitoring & Observability

### Metrics to Track
```
✓ New subscriptions per day
✓ Active subscription count
✓ Monthly recurring revenue (MRR)
✓ Failed payment rate
✓ Churn rate (cancelled subscriptions)
✓ Autopay adoption rate
✓ Webhook delivery rate
✓ API response times
```

### Logging Strategy
```
Frontend:
  → Browser console for errors
  → Error logging service (Sentry, LogRocket)
  → Track subscription creation failures

Backend:
  → Vercel function logs (searchable)
  → Supabase logs
  → Custom logging for business events
  → Error tracking (Sentry, DataDog)

Database:
  → Supabase audit logs
  → Query performance logs
  → RLS policy violations
```

## Migration Path (Old → New)

For existing users with one-time payments:
```
1. Keep old `create-order` endpoint working
2. Add UI to "convert to subscription"
3. User can upgrade from one-time to subscription
4. Map their pro access to new subscription
5. Gradual migration, no forced changes
```

## Future Enhancements

Possible additions:
```
✓ Multiple subscription tiers (Basic, Pro, Enterprise)
✓ Promo codes / discounts
✓ Billing invoice generation
✓ Dunning management (prevent churn)
✓ Analytics dashboard for admins
✓ User-initiated downgrade with survey
✓ Referral program (paid via subscription)
✓ Family plan / team billing
```

This architecture ensures:
- ✅ Secure payment processing
- ✅ Real-time data sync
- ✅ Scalable infrastructure
- ✅ Automatic failure recovery
- ✅ Comprehensive audit trail
- ✅ Easy monitoring and debugging
