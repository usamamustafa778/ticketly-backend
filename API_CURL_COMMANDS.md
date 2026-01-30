# Ticketly API - cURL Commands

Base URL: `http://localhost:5001`

---

## 🔓 PUBLIC ROUTES

### 1. Signup

```bash
curl -X POST http://localhost:5001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ali Khan",
    "email": "ali@gmail.com",
    "password": "12345678"
  }'
```

### 2. Login (Step 1 - Send OTP)

```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ali@gmail.com",
    "password": "12345678"
  }'
```

**Response will contain `tempToken` - save it for next step**

### 3. Verify OTP (Step 2 - Complete Login)

```bash
curl -X POST http://localhost:5001/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "otp": "123456",
    "tempToken": "YOUR_TEMP_TOKEN_FROM_LOGIN_RESPONSE"
  }'
```

**Response will contain `accessToken` and `refreshToken` - save both tokens**

### 4. Refresh Access Token

```bash
curl -X POST http://localhost:5001/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

**Response will contain new `accessToken` and `refreshToken`**

### 5. Google OAuth - Initiate

```bash
curl -X GET http://localhost:5001/api/auth/google \
  -L
```

**Note: Use `-L` flag to follow redirects. This will redirect to Google consent screen.**

### 6. Google OAuth - Callback

```bash
curl -X GET "http://localhost:5001/api/auth/google/callback?code=YOUR_GOOGLE_CODE"
```

**Note: This is usually handled automatically by browser redirect after Google authentication.**

---

## 🔒 PROTECTED ROUTES (Require JWT Token)

**Replace `YOUR_JWT_TOKEN` with the token from verify-otp response**

### 6. Get User Profile

```bash
curl -X GET http://localhost:5001/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 7. Get All Users

```bash
curl -X GET http://localhost:5001/api/auth/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 8. Update User

```bash
curl -X PUT http://localhost:5001/api/auth/update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Updated Name",
    "email": "newemail@gmail.com",
    "password": "newpassword123"
  }'
```

**Note: All fields (name, email, password) are optional. Include only what you want to update.**

### 9. Delete User

```bash
curl -X DELETE http://localhost:5001/api/auth/delete \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 👑 ADMIN ROUTES (Require Admin Role)

**Replace `ADMIN_JWT_TOKEN` with admin's access token**

### 10. Get All Tickets (Admin Only)

```bash
curl -X GET "http://localhost:5001/api/admin/tickets?status=confirmed&page=1&limit=20" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

**Query Parameters:**
- `status` (optional): Filter by status (`pending_payment`, `payment_submitted`, `confirmed`, `used`, `cancelled`)
- `eventId` (optional): Filter by event ID
- `userId` (optional): Filter by user ID
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**

```json
{
  "success": true,
  "count": 25,
  "page": 1,
  "limit": 20,
  "totalPages": 2,
  "totalCount": 25,
  "data": [
    {
      "ticketId": "507f1f77bcf86cd799439011",
      "status": "confirmed",
      "accessKey": "TK-1234567890-ABC123-4567",
      "createdAt": "2024-01-15T10:30:00Z",
      "user": {
        "id": "507f1f77bcf86cd799439013",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "event": {
        "id": "507f191e810c19729de860ea",
        "title": "Summer Music Festival",
        "date": "2024-07-15T00:00:00.000Z"
      }
    }
  ]
}
```

**Example with filters:**

```bash
# Get all pending payment tickets
curl -X GET "http://localhost:5001/api/admin/tickets?status=pending_payment" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"

# Get tickets for specific event
curl -X GET "http://localhost:5001/api/admin/tickets?eventId=507f191e810c19729de860ea" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"

# Get tickets for specific user
curl -X GET "http://localhost:5001/api/admin/tickets?userId=507f1f77bcf86cd799439013" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"

# Get confirmed tickets with pagination
curl -X GET "http://localhost:5001/api/admin/tickets?status=confirmed&page=2&limit=10" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

---

## 🏥 HEALTH CHECK

### 11. Root Endpoint

```bash
curl -X GET http://localhost:5001/
```

---

## 📝 Example Workflow

### Complete Email Login Flow:

**Step 1: Login (Get OTP)**

```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ali@gmail.com",
    "password": "12345678"
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "OTP sent to your email",
  "otpRequired": true,
  "tempToken": "abc123def456..."
}
```

**Step 2: Verify OTP (Get JWT Token)**

```bash
curl -X POST http://localhost:5001/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "otp": "123456",
    "tempToken": "abc123def456..."
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "abc123def456...",
  "user": { ... }
}
```

**Step 3: Use Protected Routes**

```bash
curl -X GET http://localhost:5001/api/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Step 4: Refresh Access Token (when access token expires)**

```bash
curl -X POST http://localhost:5001/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "abc123def456..."
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "accessToken": "new_access_token_here",
  "refreshToken": "new_refresh_token_here"
}
```

---

## 🔧 Tips

1. **Save JWT Token**: After verify-otp, save the token to use in protected routes
2. **Save Temp Token**: After login step 1, save tempToken for verify-otp
3. **Check OTP in Email**: The OTP will be sent to the email address provided
4. **Google OAuth**: Best tested in browser, not cURL (requires redirect flow)
5. **Error Handling**: All endpoints return JSON with `success` and `message` fields
