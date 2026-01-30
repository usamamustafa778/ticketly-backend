# Event API - cURL Commands

Base URL: `http://localhost:5001/api`

---

## 🔓 PUBLIC ROUTES

### Get All Approved Events

```bash
curl -X GET http://localhost:5001/api/events
```

---

## 🔐 AUTHENTICATED ROUTES

### Create Event

```bash
curl -X POST http://localhost:5001/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "title": "Summer Music Festival",
    "description": "Join us for an amazing music festival with top artists",
    "date": "2024-07-15",
    "time": "18:00",
    "location": "Central Park, New York",
    "image": "https://example.com/image.jpg",
    "email": "contact@festival.com",
    "phone": "+1234567890",
    "ticketPrice": 50,
    "totalTickets": 1000
  }'
```

### Get My Events

```bash
curl -X GET http://localhost:5001/api/events/my \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Get Event By ID

```bash
curl -X GET http://localhost:5001/api/events/EVENT_ID_HERE \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Update Event

```bash
curl -X PUT http://localhost:5001/api/events/EVENT_ID_HERE \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "title": "Updated Festival Name",
    "ticketPrice": 75,
    "totalTickets": 1500
  }'
```

**Note: All fields are optional. Include only what you want to update.**

### Delete Event

```bash
curl -X DELETE http://localhost:5001/api/events/EVENT_ID_HERE \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 👑 ADMIN ROUTES

### Get Pending Events

```bash
curl -X GET http://localhost:5001/api/admin/events/pending \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

### Approve Event

```bash
curl -X PUT http://localhost:5001/api/admin/events/EVENT_ID_HERE/approve \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

---

## 📝 Example Workflow

### Step 1: Create Event (as regular user)

```bash
curl -X POST http://localhost:5001/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_ACCESS_TOKEN" \
  -d '{
    "title": "Tech Conference 2024",
    "description": "Annual technology conference featuring industry leaders",
    "date": "2024-08-20",
    "time": "09:00",
    "location": "Convention Center, San Francisco",
    "image": "https://example.com/tech-conf.jpg",
    "email": "info@techconf.com",
    "phone": "+14155551234",
    "ticketPrice": 150,
    "totalTickets": 500
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "Your request has been sent. We will contact you shortly.",
  "event": {
    "id": "507f1f77bcf86cd799439011",
    "title": "Tech Conference 2024",
    "status": "pending",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Step 2: View My Events

```bash
curl -X GET http://localhost:5001/api/events/my \
  -H "Authorization: Bearer USER_ACCESS_TOKEN"
```

### Step 3: Admin Views Pending Events

```bash
curl -X GET http://localhost:5001/api/admin/events/pending \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

### Step 4: Admin Approves Event

```bash
curl -X PUT http://localhost:5001/api/admin/events/507f1f77bcf86cd799439011/approve \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

**Response:**

```json
{
  "success": true,
  "message": "Event approved successfully. Creator has been assigned organizer role.",
  "event": {
    "id": "507f1f77bcf86cd799439011",
    "title": "Tech Conference 2024",
    "status": "approved",
    "createdBy": {
      "id": "507f191e810c19729de860ea",
      "fullName": "John Doe",
      "email": "john@example.com",
      "role": "organizer"
    }
  }
}
```

### Step 5: Event Now Appears in Public List

```bash
curl -X GET http://localhost:5001/api/events
```

---

## 🔧 Tips

1. **Replace Placeholders:**

   - `YOUR_ACCESS_TOKEN` - Use access token from login/verify-otp response
   - `ADMIN_ACCESS_TOKEN` - Use admin's access token
   - `EVENT_ID_HERE` - Use actual event ID from create event response

2. **Date Format:**

   - Use ISO 8601 format: `"2024-07-15"` or `"2024-07-15T00:00:00.000Z"`

3. **Time Format:**

   - Use 24-hour format: `"18:00"` or `"09:00"`

4. **Image Field:**

   - Optional, can be empty string: `"image": ""`

5. **Update Event:**

   - All fields are optional
   - Only include fields you want to update
   - Partial updates are supported

6. **Access Control:**
   - Only event owner or admin can update/delete
   - Only admin can approve events
   - Public endpoint returns only approved events

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
  "message": "Access denied. Only event owner or admin can update this event."
}
```

**Fix:** Make sure you're the event owner or have admin role

### 404 Not Found

```json
{
  "success": false,
  "message": "Event not found"
}
```

**Fix:** Check if event ID is correct

### 400 Validation Error

```json
{
  "message": "Validation Error",
  "error": "title is required"
}
```

**Fix:** Check request body matches required fields
