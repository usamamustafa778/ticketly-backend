# Event API Documentation

## Base URL

`http://localhost:5001/api`

---

## 📋 API Endpoints

### Create Event

**POST /api/events** - Auth Required

**Request:**

```json
{
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
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Your request has been sent. We will contact you shortly.",
  "event": {
    "id": "507f1f77bcf86cd799439011",
    "title": "Summer Music Festival",
    "status": "pending",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### Get All Approved Events

**GET /api/events** - Public

**Response (200):**

```json
{
  "success": true,
  "count": 2,
  "events": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "Summer Music Festival",
      "description": "Join us for an amazing music festival",
      "date": "2024-07-15T00:00:00.000Z",
      "time": "18:00",
      "location": "Central Park, New York",
      "image": "https://example.com/image.jpg",
      "ticketPrice": 50,
      "totalTickets": 1000,
      "createdAt": "2024-01-15T10:30:00Z",
      "createdBy": {
        "_id": "507f191e810c19729de860ea",
        "fullName": "John Doe",
        "username": "johndoe",
        "email": "john@example.com"
      }
    }
  ]
}
```

---

### Get My Events

**GET /api/events/my** - Auth Required

**Headers:**

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Response (200):**

```json
{
  "success": true,
  "count": 2,
  "events": [
    {
      "id": "507f1f77bcf86cd799439011",
      "title": "Summer Music Festival",
      "description": "Join us for an amazing music festival",
      "date": "2024-07-15T00:00:00.000Z",
      "time": "18:00",
      "location": "Central Park, New York",
      "image": "https://example.com/image.jpg",
      "email": "contact@festival.com",
      "phone": "+1234567890",
      "ticketPrice": 50,
      "totalTickets": 1000,
      "status": "pending",
      "createdBy": {
        "_id": "507f191e810c19729de860ea",
        "fullName": "John Doe",
        "username": "johndoe",
        "email": "john@example.com"
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### Get Event By ID

**GET /api/events/:id** - Auth Required (Owner or Admin Only)

**Headers:**

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Response (200):**

```json
{
  "success": true,
  "event": {
    "id": "507f1f77bcf86cd799439011",
    "title": "Summer Music Festival",
    "description": "Join us for an amazing music festival",
    "date": "2024-07-15T00:00:00.000Z",
    "time": "18:00",
    "location": "Central Park, New York",
    "image": "https://example.com/image.jpg",
    "email": "contact@festival.com",
    "phone": "+1234567890",
    "ticketPrice": 50,
    "totalTickets": 1000,
    "status": "approved",
    "createdBy": {
      "_id": "507f191e810c19729de860ea",
      "fullName": "John Doe",
      "username": "johndoe",
      "email": "john@example.com",
      "role": "organizer"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Error (403):**

```json
{
  "success": false,
  "message": "Access denied. Only event owner or admin can view this event."
}
```

---

### Update Event

**PUT /api/events/:id** - Auth Required (Owner or Admin Only)

**Headers:**

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Request:**

```json
{
  "title": "Updated Festival Name",
  "ticketPrice": 75,
  "totalTickets": 1500
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Event updated successfully",
  "event": {
    "id": "507f1f77bcf86cd799439011",
    "title": "Updated Festival Name",
    "description": "Join us for an amazing music festival",
    "date": "2024-07-15T00:00:00.000Z",
    "time": "18:00",
    "location": "Central Park, New York",
    "image": "https://example.com/image.jpg",
    "email": "contact@festival.com",
    "phone": "+1234567890",
    "ticketPrice": 75,
    "totalTickets": 1500,
    "status": "approved",
    "createdBy": {
      "_id": "507f191e810c19729de860ea",
      "fullName": "John Doe",
      "username": "johndoe",
      "email": "john@example.com"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-16T14:20:00Z"
  }
}
```

---

### Delete Event

**DELETE /api/events/:id** - Auth Required (Owner or Admin Only)

**Headers:**

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Response (200):**

```json
{
  "success": true,
  "message": "Event deleted successfully"
}
```

---

### Get Pending Events

**GET /api/admin/events/pending** - Admin Only

**Headers:**

```
Authorization: Bearer ADMIN_ACCESS_TOKEN
```

**Response (200):**

```json
{
  "success": true,
  "count": 3,
  "events": [
    {
      "id": "507f1f77bcf86cd799439011",
      "title": "Summer Music Festival",
      "description": "Join us for an amazing music festival",
      "date": "2024-07-15T00:00:00.000Z",
      "time": "18:00",
      "location": "Central Park, New York",
      "image": "https://example.com/image.jpg",
      "email": "contact@festival.com",
      "phone": "+1234567890",
      "ticketPrice": 50,
      "totalTickets": 1000,
      "status": "pending",
      "createdBy": {
        "_id": "507f191e810c19729de860ea",
        "fullName": "John Doe",
        "username": "johndoe",
        "email": "john@example.com",
        "phone": "+1234567890"
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### Approve Event

**PUT /api/admin/events/:id/approve** - Admin Only

**Headers:**

```
Authorization: Bearer ADMIN_ACCESS_TOKEN
```

**Response (200):**

```json
{
  "success": true,
  "message": "Event approved successfully. Creator has been assigned organizer role.",
  "event": {
    "id": "507f1f77bcf86cd799439011",
    "title": "Summer Music Festival",
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

---

## 🔒 Access Control Summary

| Endpoint                          | Auth Required | Role Required  | Notes                                 |
| --------------------------------- | ------------- | -------------- | ------------------------------------- |
| POST /api/events                  | ✅            | Any user       | Creates event with status="pending"   |
| GET /api/events                   | ❌            | Public         | Returns only approved events          |
| GET /api/events/my                | ✅            | Any user       | Returns user's own events             |
| GET /api/events/:id               | ✅            | Owner or Admin | Full event data for edit form         |
| PUT /api/events/:id               | ✅            | Owner or Admin | Update event                          |
| DELETE /api/events/:id            | ✅            | Owner or Admin | Hard delete                           |
| GET /api/admin/events/pending     | ✅            | Admin          | All pending events                    |
| PUT /api/admin/events/:id/approve | ✅            | Admin          | Approve event + assign organizer role |

---

## 📝 Notes

- Events start with `status: "pending"` when created
- Only `status: "approved"` events appear in public GET /api/events
- When admin approves an event, creator's role automatically becomes "organizer"
- Admin cannot assign "admin" role (only superadmin can, but we removed superadmin)
- All date fields use ISO 8601 format
- Image field is optional (can be empty string)
