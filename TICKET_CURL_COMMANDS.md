# Ticket & Payment API - cURL Commands

Base URL: `http://localhost:5001/api`

---

## 🔐 AUTHENTICATED ROUTES (Require JWT Token)

**Replace `YOUR_ACCESS_TOKEN` with the token from login/verify-otp response**

### Create Ticket

```bash
curl -X POST http://localhost:5001/api/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "eventId": "EVENT_ID_HERE",
    "username": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "Ticket created successfully. Please submit payment.",
  "ticket": {
    "id": "507f1f77bcf86cd799439011",
    "eventId": "507f191e810c19729de860ea",
    "username": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "status": "pending_payment",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Get My Tickets

```bash
curl -X GET http://localhost:5001/api/tickets/my \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**

```json
{
  "success": true,
  "count": 2,
  "tickets": [
    {
      "id": "507f1f77bcf86cd799439011",
      "event": {
        "id": "507f191e810c19729de860ea",
        "title": "Summer Music Festival",
        "description": "Join us for an amazing music festival",
        "date": "2024-07-15T00:00:00.000Z",
        "time": "18:00",
        "location": "Central Park, New York",
        "image": "https://example.com/image.jpg",
        "ticketPrice": 50
      },
      "organizer": {
        "id": "507f1f77bcf86cd799439012",
        "fullName": "Event Organizer",
        "username": "organizer",
        "email": "organizer@example.com"
      },
      "username": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "status": "confirmed",
      "accessKey": "TK-1234567890-ABC123-4567",
      "qrCodeUrl": "/uploads/qrcodes/ticket_TK-1234567890-ABC123-4567_1234567890.png",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T11:00:00Z"
    }
  ]
}
```

### Get Ticket By ID

```bash
curl -X GET http://localhost:5001/api/tickets/TICKET_ID_HERE \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Note:** 
- Users can only view their own tickets
- Organizers can view tickets for their events
- Admins can view all tickets

**Response:**

```json
{
  "success": true,
  "ticket": {
    "id": "507f1f77bcf86cd799439011",
    "event": {
      "id": "507f191e810c19729de860ea",
      "title": "Summer Music Festival",
      "description": "Join us for an amazing music festival",
      "date": "2024-07-15T00:00:00.000Z",
      "time": "18:00",
      "location": "Central Park, New York",
      "image": "https://example.com/image.jpg",
      "ticketPrice": 50,
      "totalTickets": 1000
    },
    "user": {
      "id": "507f1f77bcf86cd799439013",
      "fullName": "John Doe",
      "username": "johndoe",
      "email": "john@example.com"
    },
    "organizer": {
      "id": "507f1f77bcf86cd799439012",
      "fullName": "Event Organizer",
      "username": "organizer",
      "email": "organizer@example.com"
    },
    "username": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "status": "confirmed",
    "accessKey": "TK-1234567890-ABC123-4567",
    "qrCodeUrl": "/uploads/qrcodes/ticket_TK-1234567890-ABC123-4567_1234567890.png",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T11:00:00Z"
  }
}
```

### Get Tickets By Event (Organizer Only)

```bash
curl -X GET http://localhost:5001/api/events/EVENT_ID_HERE/tickets \
  -H "Authorization: Bearer ORGANIZER_ACCESS_TOKEN"
```

**Note:** Only the event organizer can view tickets for their events.

**Response:**

```json
{
  "success": true,
  "count": 5,
  "tickets": [
    {
      "id": "507f1f77bcf86cd799439011",
      "user": {
        "id": "507f1f77bcf86cd799439013",
        "fullName": "John Doe",
        "username": "johndoe",
        "email": "john@example.com"
      },
      "username": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "status": "confirmed",
      "accessKey": "TK-1234567890-ABC123-4567",
      "qrCodeUrl": "/uploads/qrcodes/ticket_TK-1234567890-ABC123-4567_1234567890.png",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T11:00:00Z"
    }
  ]
}
```

---

## 💳 PAYMENT ROUTES

### Submit Payment (Screenshot Upload)

```bash
curl -X POST http://localhost:5001/api/payments \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "ticketId=TICKET_ID_HERE" \
  -F "method=bank_transfer" \
  -F "amount=50" \
  -F "screenshot=@/path/to/screenshot.png"
```

**Note:** 
- Use `multipart/form-data` format
- `screenshot` field must be a file (image)
- Supported formats: JPEG, PNG, GIF, WebP
- Maximum file size: 5MB

**Response:**

```json
{
  "success": true,
  "message": "Payment submitted successfully. Waiting for admin verification.",
  "payment": {
    "id": "507f1f77bcf86cd799439014",
    "ticketId": "507f1f77bcf86cd799439011",
    "amount": 50,
    "method": "bank_transfer",
    "status": "pending",
    "createdAt": "2024-01-15T10:35:00Z"
  },
  "ticket": {
    "id": "507f1f77bcf86cd799439011",
    "status": "payment_submitted"
  }
}
```

### Admin Verify Payment (Approve)

```bash
curl -X PUT http://localhost:5001/api/payments/PAYMENT_ID_HERE/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -d '{
    "action": "approve",
    "adminNote": "Payment verified successfully"
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "Payment approved. Ticket confirmed with QR code generated.",
  "payment": {
    "id": "507f1f77bcf86cd799439014",
    "status": "approved",
    "adminNote": "Payment verified successfully",
    "verifiedAt": "2024-01-15T11:00:00Z"
  },
  "ticket": {
    "id": "507f1f77bcf86cd799439011",
    "status": "confirmed",
    "accessKey": "TK-1234567890-ABC123-4567",
    "qrCodeUrl": "/uploads/qrcodes/ticket_TK-1234567890-ABC123-4567_1234567890.png"
  }
}
```

### Admin Verify Payment (Reject)

```bash
curl -X PUT http://localhost:5001/api/payments/PAYMENT_ID_HERE/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -d '{
    "action": "reject",
    "adminNote": "Payment screenshot unclear or incorrect amount"
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "Payment rejected. Ticket status updated to pending_payment.",
  "payment": {
    "id": "507f1f77bcf86cd799439014",
    "status": "rejected",
    "adminNote": "Payment screenshot unclear or incorrect amount",
    "verifiedAt": "2024-01-15T11:00:00Z"
  },
  "ticket": {
    "id": "507f1f77bcf86cd799439011",
    "status": "pending_payment"
  }
}
```

---

## 🔓 PUBLIC ROUTES

### Scan Ticket / Entry Validation

```bash
curl -X POST http://localhost:5001/api/tickets/scan \
  -H "Content-Type: application/json" \
  -d '{
    "accessKey": "TK-1234567890-ABC123-4567"
  }'
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Ticket validated successfully. Entry granted.",
  "ticket": {
    "id": "507f1f77bcf86cd799439011",
    "event": {
      "id": "507f191e810c19729de860ea",
      "title": "Summer Music Festival",
      "date": "2024-07-15T00:00:00.000Z",
      "time": "18:00",
      "location": "Central Park, New York"
    },
    "user": {
      "id": "507f1f77bcf86cd799439013",
      "fullName": "John Doe",
      "username": "johndoe",
      "email": "john@example.com"
    },
    "username": "John Doe",
    "status": "used",
    "scannedAt": "2024-07-15T18:30:00Z"
  }
}
```

**Response (Error - Already Used):**

```json
{
  "success": false,
  "message": "Ticket has already been used",
  "ticket": {
    "id": "507f1f77bcf86cd799439011",
    "status": "used",
    "event": {
      "id": "507f191e810c19729de860ea",
      "title": "Summer Music Festival"
    }
  }
}
```

---

## 👑 ADMIN ROUTES

### Get All Tickets (Admin Only)

```bash
curl -X GET "http://localhost:5001/api/admin/tickets?status=confirmed&page=1&limit=20" \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
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

---

## 📝 Example Workflow

### Complete Ticket Purchase Flow

**Step 1: Create Ticket**

```bash
curl -X POST http://localhost:5001/api/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_ACCESS_TOKEN" \
  -d '{
    "eventId": "507f191e810c19729de860ea",
    "username": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  }'
```

**Step 2: Submit Payment with Screenshot**

```bash
curl -X POST http://localhost:5001/api/payments \
  -H "Authorization: Bearer USER_ACCESS_TOKEN" \
  -F "ticketId=507f1f77bcf86cd799439011" \
  -F "method=bank_transfer" \
  -F "amount=50" \
  -F "screenshot=@/path/to/payment_screenshot.png"
```

**Step 3: Admin Verifies Payment**

```bash
curl -X PUT http://localhost:5001/api/payments/507f1f77bcf86cd799439014/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -d '{
    "action": "approve",
    "adminNote": "Payment verified"
  }'
```

**Step 4: User Views Confirmed Ticket**

```bash
curl -X GET http://localhost:5001/api/tickets/my \
  -H "Authorization: Bearer USER_ACCESS_TOKEN"
```

**Step 5: Scan Ticket at Event**

```bash
curl -X POST http://localhost:5001/api/tickets/scan \
  -H "Content-Type: application/json" \
  -d '{
    "accessKey": "TK-1234567890-ABC123-4567"
  }'
```

---

## 🔧 Tips

1. **Replace Placeholders:**
   - `YOUR_ACCESS_TOKEN` - Use access token from login/verify-otp response
   - `ADMIN_ACCESS_TOKEN` - Use admin's access token
   - `ORGANIZER_ACCESS_TOKEN` - Use organizer's access token
   - `EVENT_ID_HERE` - Use actual event ID from create event response
   - `TICKET_ID_HERE` - Use actual ticket ID from create ticket response
   - `PAYMENT_ID_HERE` - Use actual payment ID from submit payment response

2. **File Upload:**
   - Use `-F` flag for multipart/form-data
   - Use `@` prefix for file path: `-F "screenshot=@/path/to/file.png"`
   - Supported image formats: JPEG, PNG, GIF, WebP
   - Maximum file size: 5MB

3. **Ticket Status Flow:**
   - `pending_payment` → Create ticket
   - `payment_submitted` → Submit payment screenshot
   - `confirmed` → Admin approves payment (QR code generated)
   - `used` → Ticket scanned at event
   - `cancelled` → Ticket cancelled

4. **Access Control:**
   - Users can only view their own tickets
   - Organizers can view tickets for their events
   - Admins can view all tickets and verify payments
   - Ticket scanning is public (no auth required)

5. **QR Code:**
   - Generated automatically when payment is approved
   - Contains unique accessKey
   - Available at `qrCodeUrl` path
   - Can be scanned at event entry

---

## 🚨 Common Errors

### 401 Unauthorized

```json
{
  "message": "Access denied. No token provided.",
  "success": false
}
```

**Fix:** Add `Authorization: Bearer YOUR_TOKEN` header

### 403 Forbidden

```json
{
  "success": false,
  "message": "Access denied. This ticket does not belong to you."
}
```

**Fix:** Make sure you're accessing your own ticket or have appropriate role

### 404 Not Found

```json
{
  "success": false,
  "message": "Ticket not found"
}
```

**Fix:** Check if ticket ID is correct

### 400 Validation Error

```json
{
  "success": false,
  "message": "Validation Error",
  "error": "eventId is required"
}
```

**Fix:** Check request body matches required fields

### 400 File Upload Error

```json
{
  "success": false,
  "message": "File too large. Maximum size is 5MB."
}
```

**Fix:** Reduce file size or use a different image format
