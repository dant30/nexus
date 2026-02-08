# Nexus Trading Platform - API Documentation

## Base URL
```
Development:  http://localhost:8000/api/v1
Production:   https://api.nexus.com/api/v1
WebSocket:    ws://localhost:8000/ws
```

---

## Authentication

### Headers
All authenticated requests require:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Token Types
- **access_token**: Short-lived (1 hour)
- **refresh_token**: Long-lived (7 days)

---

## Authentication Endpoints

### POST /auth/login
Login with email/password.

**Request:**
```json
{
  "username": "john_doe",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "affiliate_code": "JOHN-ABC123"
  }
}
```

### POST /auth/signup
Create new user account.

**Request:**
```json
{
  "username": "new_user",
  "email": "new@example.com",
  "password": "SecurePass123!",
  "referred_by": "JOHN-ABC123"
}
```

**Response (200):**
Same as `/auth/login`

### POST /auth/refresh
Refresh expired access token.

**Request:**
```json
{
  "refresh_token": "eyJhbGc..."
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {...}
}
```

### GET /auth/me
Get current user profile.

**Response (200):**
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "is_staff": false,
  "affiliate_code": "JOHN-ABC123",
  "markup_percentage": 10.0,
  "created_at": "2024-01-15T10:30:00Z"
}
```

### POST /auth/logout
Logout (client should discard tokens).

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### POST /auth/change-password
Change user password.

**Request:**
```json
{
  "old_password": "current_password",
  "new_password": "new_secure_password"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## User Endpoints

### GET /users/profile
Get user profile (same as `/auth/me`).

### PATCH /users/profile
Update user profile.

**Request:**
```json
{
  "email": "newemail@example.com",
  "first_name": "John",
  "last_name": "Doe"
}
```

### GET /users/affiliate/code
Get user's affiliate code.

**Response (200):**
```json
{
  "code": "JOHN-ABC123",
  "owner_id": 1,
  "owner_username": "john_doe"
}
```

### GET /users/affiliate/stats
Get affiliate statistics.

**Response (200):**
```json
{
  "affiliate_code": "JOHN-ABC123",
  "referral_codes": 1,
  "total_uses": 5,
  "total_referrals": 3,
  "commission_earned": 150.75
}
```

---

## Account Endpoints

### GET /accounts
List all user accounts.

**Response (200):**
```json
[
  {
    "id": 1,
    "deriv_account_id": "CR123456",
    "account_type": "DEMO",
    "currency": "USD",
    "balance": "10000.00",
    "is_default": true,
    "markup_percentage": "10.00",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

### GET /accounts/default
Get default account.

**Response (200):**
```json
{
  "id": 1,
  "deriv_account_id": "CR123456",
  "account_type": "DEMO",
  "currency": "USD",
  "balance": "10000.00",
  "is_default": true,
  "markup_percentage": "10.00",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### GET /accounts/{account_id}
Get specific account.

### POST /accounts/demo
Create demo account.

**Request:**
```json
{
  "currency": "USD",
  "initial_balance": "10000.00"
}
```

### PUT /accounts/{account_id}/default
Set account as default.

**Response (200):**
```json
{
  "success": true,
  "message": "Account 1 is now default"
}
```

### GET /accounts/{account_id}/balance
Get account balance.

**Response (200):**
```json
{
  "account_id": 1,
  "balance": "10000.00",
  "currency": "USD",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

---

## Trade Endpoints

### POST /trades/execute
Execute a new trade.

**Request:**
```json
{
  "contract_type": "CALL",
  "direction": "RISE",
  "stake": "10.00",
  "account_id": 1,
  "duration_seconds": 300
}
```

**Response (200):**
```json
{
  "id": 1,
  "account_id": 1,
  "contract_type": "CALL",
  "direction": "RISE",
  "stake": "10.00",
  "payout": null,
  "profit": null,
  "proposal_id": "PROP-ABC123",
  "transaction_id": null,
  "duration_seconds": 300,
  "status": "OPEN",
  "commission_applied": "0.50",
  "markup_applied": "1.00",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### GET /trades
Get trade history.

**Query Parameters:**
- `limit`: Number of trades (default: 50)
- `offset`: Pagination offset (default: 0)

**Response (200):**
```json
[
  {
    "id": 1,
    "account_id": 1,
    "contract_type": "CALL",
    "direction": "RISE",
    "stake": "10.00",
    "payout": "15.50",
    "profit": "5.50",
    "status": "CLOSED",
    ...
  }
]
```

### GET /trades/open
Get open trades only.

### GET /trades/{trade_id}
Get specific trade.

### POST /trades/{trade_id}/close
Close an open trade.

**Request:**
```json
{
  "payout": "15.50",
  "transaction_id": "TXN-123456"
}
```

### GET /trades/{trade_id}/profit
Calculate trade profit/loss.

**Response (200):**
```json
{
  "trade_id": 1,
  "stake": "10.00",
  "payout": "15.50",
  "profit": "5.50",
  "loss": "0.00",
  "roi": "55.00"
}
```

---

## Billing Endpoints

### GET /billing/transactions
Get transaction history.

**Query Parameters:**
- `limit`: Number of transactions (default: 50)

**Response (200):**
```json
[
  {
    "id": 1,
    "tx_type": "TRADE_PAYOUT",
    "amount": "15.50",
    "status": "COMPLETED",
    "balance_after": "10015.50",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

### GET /billing/balance
Get total balance across all accounts.

**Response (200):**
```json
{
  "total_balance": "20000.00"
}
```

---

## Notification Endpoints

### GET /notifications
Get notifications.

**Query Parameters:**
- `unread_only`: Show only unread (default: false)
- `limit`: Number of notifications (default: 50)

### POST /notifications/{notification_id}/read
Mark notification as read.

---

## OAuth Endpoints

### GET /oauth/deriv/authorize
Get Deriv OAuth authorization URL.

**Response (200):**
```json
{
  "authorization_url": "https://oauth.deriv.com/oauth2/authorize?app_id=...",
  "provider": "deriv"
}
```

### POST /oauth/deriv/callback
Handle OAuth callback from Deriv.

**Request:**
```json
{
  "code": "DERIV_AUTH_CODE_123",
  "state": "nexus"
}
```

**Response (200):**
```json
{
  "success": true,
  "access_token": "JWT_TOKEN",
  "refresh_token": "JWT_REFRESH_TOKEN",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

---

## WebSocket Events

### Connection
```
ws://localhost:8000/ws/trading/{user_id}/{account_id}
```

### Message Types

#### Tick Update
```json
{
  "type": "tick",
  "symbol": "EURUSD",
  "price": 1.0850,
  "bid": 1.0849,
  "ask": 1.0851,
  "time": 1705318200
}
```

#### Balance Update
```json
{
  "type": "balance",
  "balance": "10100.50",
  "currency": "USD"
}
```

#### Trade Status
```json
{
  "type": "trade_status",
  "trade_id": 1,
  "status": "CLOSED",
  "payout": "15.50",
  "profit": "5.50"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Stake exceeds maximum $1000.00"
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Trade not found"
  }
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

---

## Rate Limiting

- **Authenticated users**: 1000 requests per hour
- **Public endpoints**: 100 requests per hour
- **WebSocket**: No limit (connection-based)

---

## CORS

Allowed origins (configurable):
- `http://localhost:3000`
- `http://localhost:5173`
- `https://nexus.com` (production)

---

## API Versioning

Current version: `v1`

Future versions: Backward compatible at `/api/v2`, etc.

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Validation Error |
| 429 | Rate Limited |
| 500 | Internal Server Error |
| 502 | Bad Gateway |
| 503 | Service Unavailable |

---

**Last Updated:** February 2026
**API Version:** 1.0.0
**Status:** Production Ready ✅