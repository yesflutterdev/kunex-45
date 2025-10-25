# Support System Documentation

## Overview

The Kunex Support System provides a comprehensive ticket management system that allows users to submit support requests, track their status, and communicate with support staff. The system supports file attachments including images, videos, and documents.

## Features

### ✅ Core Features
- **Ticket Creation**: Users can create support tickets with detailed descriptions
- **File Attachments**: Support for images, videos, and documents (up to 100MB per file)
- **Status Tracking**: Real-time ticket status updates
- **Message Threading**: Conversation history within tickets
- **Search & Filter**: Advanced search and filtering capabilities
- **Statistics**: Ticket analytics and reporting
- **Categories**: Organized ticket categorization
- **Priorities**: Priority-based ticket management

### 📁 File Upload Support
- **Images**: JPG, PNG, GIF, WebP
- **Videos**: MP4, AVI, MOV, WMV, WebM, MKV
- **Documents**: PDF, TXT, DOC, DOCX
- **Size Limits**: 100MB per file, 500MB total per ticket
- **Storage**: Cloudinary cloud storage with CDN delivery

## API Endpoints

### Base URL
```
/api/support
```

### Authentication
All endpoints require Bearer token authentication:
```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### 1. Create Support Ticket
**POST** `/api/support/tickets`

Create a new support ticket with optional file attachments.

**Request Body (multipart/form-data):**
```json
{
  "subject": "Login Issue",
  "category": "Technical Issue",
  "priority": "High",
  "description": "I'm unable to log into my account",
  "tags": "login,authentication,urgent",
  "files": [file1, file2, ...] // Optional attachments
}
```

**Response:**
```json
{
  "success": true,
  "message": "Support ticket created successfully",
  "data": {
    "ticket": {
      "_id": "64f8b2c1a1b2c3d4e5f67890",
      "ticketId": "#001",
      "subject": "Login Issue",
      "category": "Technical Issue",
      "priority": "High",
      "status": "Open",
      "description": "I'm unable to log into my account",
      "attachments": [
        {
          "fileName": "screenshot.png",
          "fileUrl": "https://res.cloudinary.com/...",
          "fileType": "image",
          "fileSize": 245760,
          "publicId": "kunex/support-attachments/..."
        }
      ],
      "messages": [...],
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "ticketId": "#001"
  }
}
```

### 2. Get User Tickets
**GET** `/api/support/tickets`

Retrieve user's support tickets with filtering and pagination.

**Query Parameters:**
- `status` (optional): Filter by status (Open, In Progress, Resolved, Closed, Cancelled)
- `category` (optional): Filter by category
- `priority` (optional): Filter by priority (Low, Medium, High, Urgent)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 50)
- `sortBy` (optional): Sort field (createdAt, updatedAt, lastActivity, priority)
- `sortOrder` (optional): Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "tickets": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalTickets": 25,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "stats": {
      "Open": 5,
      "In Progress": 3,
      "Resolved": 15,
      "Closed": 2
    }
  }
}
```

### 3. Get Ticket by ID
**GET** `/api/support/tickets/{ticketId}`

Get detailed information about a specific ticket.

**Response:**
```json
{
  "success": true,
  "data": {
    "ticket": {
      "_id": "64f8b2c1a1b2c3d4e5f67890",
      "ticketId": "#001",
      "subject": "Login Issue",
      "status": "In Progress",
      "messages": [
        {
          "sender": "user",
          "message": "I'm unable to log into my account",
          "timestamp": "2024-01-15T10:30:00.000Z",
          "attachments": [...]
        },
        {
          "sender": "admin",
          "message": "We're looking into this issue. Can you try clearing your browser cache?",
          "timestamp": "2024-01-15T11:15:00.000Z"
        }
      ],
      "assignedTo": {
        "username": "support_agent",
        "email": "support@kunex.com"
      }
    }
  }
}
```

### 4. Add Message to Ticket
**POST** `/api/support/tickets/{ticketId}/messages`

Add a new message to an existing ticket.

**Request Body (multipart/form-data):**
```json
{
  "message": "I tried clearing the cache but still can't log in",
  "files": [file1, file2, ...] // Optional attachments
}
```

### 5. Update Ticket Status
**PUT** `/api/support/tickets/{ticketId}/status`

Update the status of a ticket (user can only update to certain statuses).

**Request Body:**
```json
{
  "status": "Resolved",
  "resolution": "Issue was resolved by clearing browser data"
}
```

### 6. Delete Ticket
**DELETE** `/api/support/tickets/{ticketId}`

Delete a ticket and all its attachments.

### 7. Get Ticket Statistics
**GET** `/api/support/stats`

Get ticket statistics for the authenticated user.

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "Open": 5,
      "In Progress": 3,
      "Resolved": 15,
      "Closed": 2
    }
  }
}
```

### 8. Search Tickets
**GET** `/api/support/search`

Search tickets by query, status, category, or priority.

**Query Parameters:**
- `query` (optional): Search term
- `status` (optional): Filter by status
- `category` (optional): Filter by category
- `priority` (optional): Filter by priority
- `page` (optional): Page number
- `limit` (optional): Items per page

### 9. Get Categories
**GET** `/api/support/categories`

Get available ticket categories.

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [
      "Technical Issue",
      "Account Problem",
      "Billing Question",
      "Feature Request",
      "Bug Report",
      "General Inquiry",
      "Login Issue",
      "Payment Issue",
      "Other"
    ]
  }
}
```

### 10. Get Priorities
**GET** `/api/support/priorities`

Get available ticket priorities.

**Response:**
```json
{
  "success": true,
  "data": {
    "priorities": [
      { "value": "Low", "label": "Low Priority" },
      { "value": "Medium", "label": "Medium Priority" },
      { "value": "High", "label": "High Priority" },
      { "value": "Urgent", "label": "Urgent" }
    ]
  }
}
```

## Data Models

### SupportTicket Schema
```javascript
{
  userId: ObjectId,           // User who created the ticket
  ticketId: String,          // Human-readable ID (#001, #002, etc.)
  subject: String,           // Ticket title
  category: String,          // Ticket category
  priority: String,          // Priority level
  status: String,            // Current status
  description: String,        // Detailed description
  attachments: [{           // File attachments
    fileName: String,
    fileUrl: String,
    fileType: String,        // image, video, document
    fileSize: Number,
    publicId: String
  }],
  messages: [{              // Conversation history
    sender: String,          // user, admin, system
    message: String,
    attachments: Array,
    timestamp: Date,
    isInternal: Boolean
  }],
  resolution: String,        // Resolution details
  resolvedAt: Date,         // When ticket was resolved
  resolvedBy: ObjectId,      // Who resolved it
  assignedTo: ObjectId,     // Assigned support agent
  assignedAt: Date,          // When assigned
  lastActivity: Date,        // Last activity timestamp
  tags: [String],           // Tags for categorization
  isUrgent: Boolean,        // Urgent flag
  estimatedResolution: Date, // Estimated resolution time
  createdAt: Date,
  updatedAt: Date
}
```

## File Upload Configuration

### Supported File Types
- **Images**: JPG, JPEG, PNG, GIF, WebP
- **Videos**: MP4, AVI, MOV, WMV, WebM, MKV
- **Documents**: PDF, TXT, DOC, DOCX

### Size Limits
- **Per file**: 100MB maximum
- **Total per ticket**: 500MB maximum
- **Files per ticket**: 10 maximum

### Storage
- **Provider**: Cloudinary
- **Folder**: `kunex/support-attachments`
- **CDN**: Global content delivery
- **Auto-optimization**: Automatic format and quality optimization

## Error Handling

### Common Error Responses
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error messages"]
}
```

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized
- `404`: Not Found
- `413`: Payload Too Large (file size exceeded)
- `500`: Internal Server Error

## Security Features

### Authentication
- JWT token-based authentication
- Token expiration handling
- User-specific data access

### File Security
- File type validation
- Size limit enforcement
- Malware scanning (Cloudinary)
- Secure file URLs

### Data Protection
- User data isolation
- Secure file deletion
- Audit trail maintenance

## Usage Examples

### Frontend Integration

#### 1. Create Ticket with File Upload
```javascript
const formData = new FormData();
formData.append('subject', 'Login Issue');
formData.append('category', 'Technical Issue');
formData.append('priority', 'High');
formData.append('description', 'I cannot log into my account');
formData.append('tags', 'login,authentication');

// Add file attachments
const fileInput = document.getElementById('fileInput');
for (let file of fileInput.files) {
  formData.append('files', file);
}

fetch('/api/support/tickets', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

#### 2. Get User Tickets
```javascript
fetch('/api/support/tickets?status=Open&page=1&limit=10', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => {
  console.log('Tickets:', data.data.tickets);
  console.log('Stats:', data.data.stats);
});
```

#### 3. Add Message to Ticket
```javascript
const formData = new FormData();
formData.append('message', 'I tried the suggested solution but it did not work');

// Add file attachments
const fileInput = document.getElementById('messageFiles');
for (let file of fileInput.files) {
  formData.append('files', file);
}

fetch(`/api/support/tickets/${ticketId}/messages`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

## Mobile App Integration

The support system is designed to work seamlessly with mobile applications, supporting:

- **File Upload**: Camera integration for photos/videos
- **Offline Support**: Queue messages when offline
- **Push Notifications**: Real-time status updates
- **Responsive Design**: Mobile-optimized UI

## Admin Features (Future Enhancement)

### Planned Admin Capabilities
- **Ticket Assignment**: Assign tickets to support agents
- **Bulk Operations**: Process multiple tickets
- **Analytics Dashboard**: Support metrics and reporting
- **Template Responses**: Pre-written response templates
- **Escalation Rules**: Automatic priority escalation
- **SLA Tracking**: Service level agreement monitoring

## Performance Considerations

### Optimization Features
- **Pagination**: Efficient data loading
- **Indexing**: Database indexes for fast queries
- **Caching**: Response caching for static data
- **CDN**: Global content delivery for files
- **Compression**: Automatic file compression

### Scalability
- **Horizontal Scaling**: Multi-instance deployment
- **Database Sharding**: User-based data partitioning
- **Load Balancing**: Distributed request handling
- **Auto-scaling**: Dynamic resource allocation

## Monitoring and Analytics

### Metrics Tracked
- **Ticket Volume**: Tickets created per day/week/month
- **Resolution Time**: Average time to resolve tickets
- **User Satisfaction**: Rating and feedback
- **File Usage**: Storage and bandwidth metrics
- **Performance**: Response times and error rates

### Health Checks
- **Database Connectivity**: MongoDB connection status
- **File Storage**: Cloudinary service availability
- **API Performance**: Response time monitoring
- **Error Rates**: Failed request tracking

## Conclusion

The Kunex Support System provides a comprehensive, scalable solution for customer support with advanced file handling capabilities. The system is designed for both web and mobile applications, with robust security, performance optimization, and user-friendly features.

For technical support or questions about implementation, please refer to the API documentation or contact the development team.
