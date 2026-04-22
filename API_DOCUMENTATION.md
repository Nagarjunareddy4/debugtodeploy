# API Endpoints Documentation

## Subscription API

### Create Subscription
**POST** `/api/subscription/create`

Create a new Razorpay subscription for a user.

#### Request
```json
{
  "planId": "pro_monthly",
  "paymentMethod": "upi",
  "autopayConsent": true
}
```

#### Response
```json
{
  "subscription_id": "sub_xxxxx",
  "razorpay_subscription_id": "sub_xxxxx"
}
```

#### Headers
- `Authorization: Bearer <auth_token>`
- `Content-Type: application/json`

---

### Verify Subscription Payment
**POST** `/api/subscription/verify`

Verify subscription payment signature and activate subscription.

#### Request
```json
{
  "razorpay_subscription_id": "sub_xxxxx",
  "razorpay_payment_id": "pay_xxxxx",
  "razorpay_signature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
}
```

#### Response
```json
{
  "status": "ok",
  "message": "Subscription activated successfully",
  "subscription_id": "uuid"
}
```

#### Headers
- `Authorization: Bearer <auth_token>`
- `Content-Type: application/json`

---

### Manage Subscription (GET)
**GET** `/api/subscription/manage`

Fetch current subscription details.

#### Response
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "plan_type": "pro_monthly",
  "subscription_id": "sub_xxxxx",
  "status": "active",
  "payment_method": "upi",
  "autopay_enabled": true,
  "next_billing_date": "2024-05-22T10:30:00Z",
  "failure_count": 0,
  "cancelled_at": null,
  "created_at": "2024-04-22T10:30:00Z"
}
```

#### Headers
- `Authorization: Bearer <auth_token>`

---

### Manage Subscription (POST)
**POST** `/api/subscription/manage`

Perform actions on subscription.

#### Request - Cancel
```json
{
  "action": "cancel"
}
```

#### Request - Pause
```json
{
  "action": "pause"
}
```

#### Request - Resume
```json
{
  "action": "resume"
}
```

#### Request - Toggle Autopay
```json
{
  "action": "toggle-autopay",
  "enabled": false
}
```

#### Response
```json
{
  "status": "ok",
  "message": "Subscription cancelled successfully"
}
```

#### Headers
- `Authorization: Bearer <auth_token>`
- `Content-Type: application/json`

---

## Webhook API

### Razorpay Webhook
**POST** `/api/webhook/razorpay`

Handles Razorpay subscription events.

#### Supported Events
- `subscription.charged` - Payment successfully collected
- `subscription.completed` - Subscription completed (all payments done)
- `payment.failed` - Payment attempt failed
- `subscription.cancelled` - Subscription cancelled by user
- `subscription.paused` - Subscription paused
- `subscription.resumed` - Subscription resumed

#### Headers
- `x-razorpay-signature: <hmac_sha256_signature>`
- `Content-Type: application/json`

#### Event Payload Example
```json
{
  "event": "subscription.charged",
  "payload": {
    "subscription": {
      "entity": {
        "id": "sub_xxxxx",
        "status": "active",
        "current_period_start": 1624329000,
        "current_period_end": 1627008600
      }
    },
    "payment": {
      "entity": {
        "id": "pay_xxxxx",
        "amount": 49900,
        "method": "upi",
        "subscription_id": "sub_xxxxx"
      }
    }
  }
}
```

#### Response
```json
{
  "status": "ok"
}
```

---

## Admin API

### Get Subscription Metrics
**GET** `/api/subscription/admin?action=metrics`

Get overall subscription statistics.

#### Response
```json
{
  "total_subscriptions": 150,
  "active_subscriptions": 145,
  "paused_subscriptions": 3,
  "failed_subscriptions": 2,
  "cancelled_subscriptions": 0,
  "successful_payments": 300,
  "failed_payments": 5
}
```

#### Headers
- `x-admin-key: <admin_api_key>`

---

### Get Payment History
**GET** `/api/subscription/admin?action=payment-history&userId=<user_id>`

Get payment history for a specific user.

#### Response
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "payment_id": "pay_xxxxx",
    "amount_inr": 499,
    "status": "captured",
    "payment_method": "upi",
    "created_at": "2024-04-22T10:30:00Z"
  }
]
```

#### Headers
- `x-admin-key: <admin_api_key>`

---

### Retry Payment
**POST** `/api/subscription/admin`

Manually retry a failed subscription payment.

#### Request
```json
{
  "action": "retry-payment",
  "subscription_id": "sub_xxxxx"
}
```

#### Response
```json
{
  "success": true,
  "message": "Retry triggered",
  "subscription_id": "sub_xxxxx"
}
```

#### Headers
- `x-admin-key: <admin_api_key>`
- `Content-Type: application/json`

---

### Downgrade User
**POST** `/api/subscription/admin`

Manually downgrade user to free plan.

#### Request
```json
{
  "action": "downgrade",
  "user_id": "uuid"
}
```

#### Response
```json
{
  "success": true,
  "message": "User downgraded to free plan",
  "user_id": "uuid"
}
```

#### Headers
- `x-admin-key: <admin_api_key>`
- `Content-Type: application/json`

---

## Error Responses

All endpoints may return error responses:

```json
{
  "error": "Invalid authorization header",
  "status": 401
}
```

### Common HTTP Codes
- `200` - Success
- `400` - Bad request (missing/invalid parameters)
- `401` - Unauthorized (missing/invalid auth)
- `404` - Not found (subscription/user doesn't exist)
- `405` - Method not allowed
- `500` - Server error

---

## Authentication

All user endpoints require:
- `Authorization: Bearer <access_token>` header
- Valid Supabase session

Admin endpoints require:
- `x-admin-key: <admin_api_key>` header

---

## Rate Limiting

No explicit rate limiting implemented. Consider adding:
- Per-user: 5 requests/minute
- Per-IP: 100 requests/minute
- Webhook: Unlimited (Razorpay rate limited)

---

## Testing

### Test Razorpay Test Cards
- **Success**: 4111 1111 1111 1111
- **Decline**: 4000 0000 0000 0002
- **Soft Decline**: 4000 0000 0000 9995

### Test Endpoints
```bash
# Create subscription
curl -X POST http://localhost:3000/api/subscription/create \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"planId":"pro_monthly","paymentMethod":"card"}'

# Get subscription
curl -X GET http://localhost:3000/api/subscription/manage \
  -H "Authorization: Bearer <token>"

# Get metrics
curl -X GET http://localhost:3000/api/subscription/admin?action=metrics \
  -H "x-admin-key: <admin_key>"
```
