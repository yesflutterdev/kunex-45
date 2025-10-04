# Analytics Engine Documentation

## Overview

The Analytics Engine is a comprehensive system that implements KON-37 through KON-41 requirements, providing detailed tracking, reporting, and analysis capabilities for user interactions with business profiles and content.

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [API Endpoints](#api-endpoints)
4. [Models](#models)
5. [Utilities](#utilities)
6. [Installation](#installation)
7. [Usage Examples](#usage-examples)
8. [Testing](#testing)
9. [Performance Considerations](#performance-considerations)
10. [Security](#security)

## Features

### KON-37: Core Analytics Tracking

- **View Tracking**: Track page views and content interactions
- **Click Tracking**: Monitor link clicks and user interactions
- **Session Management**: Generate and track user sessions
- **Device Detection**: Automatic device type, OS, and browser detection
- **Geolocation**: IP-based geographic location detection
- **Engagement Scoring**: Calculated engagement scores (0-100) based on multiple factors

### KON-38: Location Analytics

- **Geographic Aggregation**: Analytics grouped by country, region, or city
- **Global Insights**: View distribution across different geographical locations
- **Location-based Engagement**: Engagement metrics by location
- **Time-zone Considerations**: Proper handling of different time zones

### KON-39: Link Analytics

- **Click Tracking**: Monitor clicks on various link types
- **Social Media Analytics**: Specialized tracking for social media platforms
- **Click-through Rates**: Calculate and monitor CTR for different link types
- **Top Performing Links**: Identify most clicked links and platforms

### KON-40: Peak Hour Analytics

- **Hourly Analysis**: Identify peak hours throughout the day
- **Daily Patterns**: Analyze weekly patterns and peak days
- **Time-based Insights**: Understand when your audience is most active
- **Trend Analysis**: Track changes in activity patterns over time

### KON-41: Time-Filtered Analytics

- **Time Range Filtering**: Flexible date range selection
- **Trend Calculations**: Percentage changes and growth metrics
- **Period Comparison**: Compare different time periods
- **Granular Grouping**: Hour, day, week, or month grouping options

### Additional Features

- **Real-time Analytics**: Live user activity monitoring
- **Comprehensive Dashboard**: All analytics in one view
- **Data Export**: Export analytics in JSON, CSV, or XLSX formats
- **Bulk Operations**: Handle multiple analytics entries efficiently
- **Advanced Filtering**: Multiple filter options and combinations

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Analytics Engine                        │
├─────────────────────────────────────────────────────────────┤
│  Routes           Controllers        Models        Utils    │
│  ┌─────────┐      ┌─────────────┐   ┌─────────┐  ┌─────────┐│
│  │Analytics│ ──► │Analytics    │──►│ViewLog  │  │Utils    ││
│  │Routes   │      │Controller   │   │Model    │  │&        ││
│  │         │      │             │   │         │  │Validation││
│  └─────────┘      └─────────────┘   └─────────┘  └─────────┘│
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │   MongoDB       │
                   │   ViewLog       │
                   │   Collection    │
                   └─────────────────┘
```

## API Endpoints

### Public Endpoints

#### POST /api/analytics/track

Track user views and interactions.

**Request Body:**

```json
{
  "targetId": "507f1f77bcf86cd799439011",
  "targetType": "business",
  "interactionType": "view",
  "sessionId": "session-123",
  "linkData": {
    "linkUrl": "https://instagram.com/business",
    "linkText": "Follow us",
    "linkPosition": "header"
  },
  "metrics": {
    "timeOnPage": 45,
    "scrollDepth": 75,
    "loadTime": 1200,
    "bounceRate": false
  },
  "metadata": {
    "pageTitle": "Business Profile",
    "pageUrl": "https://app.com/business/123",
    "tags": ["profile", "business"]
  }
}
```

### Authenticated Endpoints

#### GET /api/analytics/location

Get location-based analytics (KON-38).

**Query Parameters:**

- `targetId` (required): Business/entity ID
- `targetType`: Type of target (default: "business")
- `startDate`: Start date (ISO format)
- `endDate`: End date (ISO format)
- `groupBy`: Grouping level ("country", "region", "city")
- `limit`: Maximum results (default: 50)

#### GET /api/analytics/links

Get link click analytics (KON-39).

**Query Parameters:**

- `targetId` (required): Business/entity ID
- `linkType`: Filter by link type
- `groupBy`: Group by "linkType" or "platform"
- `limit`: Maximum results (default: 20)

#### GET /api/analytics/peak-hours

Get peak hour analytics (KON-40).

**Query Parameters:**

- `targetId` (required): Business/entity ID
- `groupBy`: Time grouping ("hour", "dayOfWeek", "hourOfWeek")
- `timezone`: Timezone for calculations (default: "UTC")

#### GET /api/analytics/time-filtered

Get time-filtered analytics (KON-41).

**Query Parameters:**

- `targetId` (required): Business/entity ID
- `timeframe`: Predefined timeframe ("week", "month", "year")
- `startDate`: Custom start date
- `endDate`: Custom end date
- `groupBy`: Time granularity ("hour", "day", "week", "month")

#### GET /api/analytics/dashboard

Get comprehensive analytics dashboard.

#### GET /api/analytics/real-time

Get real-time analytics data.

#### GET /api/analytics/export

Export analytics data in various formats.

## Models

### ViewLog Model

The core model that stores all analytics data:

```javascript
{
  // Target information
  targetId: ObjectId,           // Business/entity being tracked
  targetType: String,           // Type of target

  // Viewer information
  viewerId: ObjectId,           // User ID (optional)
  viewerType: String,           // 'authenticated' | 'anonymous'
  sessionId: String,            // Session identifier

  // Interaction data
  interactionType: String,      // 'view' | 'click' | 'share' | etc.

  // Geographic data (KON-38)
  location: {
    country: String,
    region: String,
    city: String,
    coordinates: [Number],      // [longitude, latitude]
    ipAddress: String,
    timezone: String
  },

  // Device information
  deviceInfo: {
    type: String,               // 'mobile' | 'tablet' | 'desktop'
    os: String,
    browser: String,
    userAgent: String
  },

  // Referral tracking (KON-39)
  referral: {
    source: String,             // 'direct' | 'search' | 'social' | etc.
    medium: String,
    campaign: String,
    utmSource: String,
    // ... other UTM parameters
  },

  // Link data (KON-39)
  linkData: {
    linkType: String,           // 'social_media' | 'website' | etc.
    linkUrl: String,
    socialPlatform: String,     // 'instagram' | 'facebook' | etc.
    wasExternal: Boolean
  },

  // Timing data (KON-40)
  timing: {
    hour: Number,               // 0-23
    dayOfWeek: Number,          // 0-6 (Sunday=0)
    month: Number,              // 1-12
    year: Number,
    quarter: Number             // 1-4
  },

  // Performance metrics
  metrics: {
    loadTime: Number,           // milliseconds
    timeOnPage: Number,         // seconds
    scrollDepth: Number,        // percentage (0-100)
    engagementScore: Number,    // calculated score (0-100)
    bounceRate: Boolean
  },

  // Additional metadata
  metadata: {
    pageTitle: String,
    pageUrl: String,
    tags: [String],
    customDimensions: [{
      key: String,
      value: String
    }]
  }
}
```

## Utilities

### Analytics Utils (`src/utils/analyticsUtils.js`)

- **getLocationFromIP**: Extract geographic data from IP addresses
- **getDeviceInfo**: Parse device information from user agent strings
- **parseReferralInfo**: Extract referral and UTM parameter data
- **calculateEngagementScore**: Calculate engagement scores based on multiple factors
- **generateSessionId**: Generate unique session identifiers
- **parseLinkData**: Parse and categorize link information
- **aggregateByTimeframe**: Aggregate data by time periods
- **calculatePeakHours**: Analyze peak activity periods

### Analytics Validation (`src/utils/analyticsValidation.js`)

Comprehensive Joi validation schemas for all analytics endpoints:

- Input validation for all API endpoints
- Data type and format validation
- Range and constraint validation
- Custom validation rules for analytics-specific data

## Installation

### Prerequisites

- Node.js 14+
- MongoDB 4+
- Required npm packages (see package.json)

### Dependencies

The Analytics Engine requires these packages:

```json
{
  "geoip-lite": "^1.4.10", // IP geolocation
  "ua-parser-js": "^2.0.3", // User agent parsing
  "joi": "^17.11.0", // Validation
  "xlsx": "^0.18.5" // Excel export
}
```

### Setup

1. Install dependencies:

```bash
npm install
```

2. Ensure MongoDB is running and connected

3. The analytics routes are automatically integrated via `src/app.js`

## Usage Examples

### Frontend Integration

#### Basic View Tracking

```javascript
// Track a page view
const trackView = async (businessId) => {
  await fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      targetId: businessId,
      targetType: "business",
      interactionType: "view",
      sessionId: getSessionId(),
      metrics: {
        timeOnPage: getTimeOnPage(),
        scrollDepth: getScrollDepth(),
        loadTime: performance.now(),
        bounceRate: false,
      },
      metadata: {
        pageTitle: document.title,
        pageUrl: window.location.href,
      },
    }),
  });
};
```

#### Link Click Tracking

```javascript
// Track link clicks
const trackLinkClick = async (businessId, linkElement) => {
  await fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      targetId: businessId,
      targetType: "business",
      interactionType: "click",
      sessionId: getSessionId(),
      linkData: {
        linkUrl: linkElement.href,
        linkText: linkElement.textContent,
        linkPosition: getLinkPosition(linkElement),
      },
    }),
  });
};
```

### Backend Analytics Queries

#### Get Location Analytics

```javascript
const locationAnalytics = await fetch(
  "/api/analytics/location?targetId=123&groupBy=country&limit=10",
  { headers: { Authorization: `Bearer ${token}` } }
);
```

#### Get Peak Hours

```javascript
const peakHours = await fetch(
  "/api/analytics/peak-hours?targetId=123&groupBy=hour",
  { headers: { Authorization: `Bearer ${token}` } }
);
```

## Testing

### Running Tests

Use the provided test script to verify all functionality:

```bash
# Install axios for testing
npm install axios

# Run the test suite
node test-analytics.js
```

### Test Configuration

Update the test configuration in `test-analytics.js`:

```javascript
const API_BASE_URL = "http://localhost:5000/api";
const TEST_TARGET_ID = "your-actual-business-id";
const TEST_USER_TOKEN = "your-jwt-token";
```

### Test Coverage

The test suite covers:

- ✅ View tracking (KON-37)
- ✅ Click tracking (KON-37)
- ✅ Location analytics (KON-38)
- ✅ Link analytics (KON-39)
- ✅ Peak hour analytics (KON-40)
- ✅ Time-filtered analytics (KON-41)
- ✅ Dashboard functionality
- ✅ Real-time analytics
- ✅ Data export

## Performance Considerations

### Database Optimization

1. **Indexes**: Comprehensive indexing strategy for optimal query performance

   ```javascript
   // Key indexes implemented
   viewLogSchema.index({ targetId: 1, targetType: 1, createdAt: -1 });
   viewLogSchema.index({ targetId: 1, "timing.hour": 1 });
   viewLogSchema.index({ targetId: 1, "location.country": 1 });
   ```

2. **Aggregation Pipeline**: Optimized MongoDB aggregation for analytics queries

3. **Data Retention**: Consider implementing data archiving for old analytics data

### Scalability

1. **Bulk Operations**: Support for bulk analytics insertions
2. **Caching**: Implement Redis caching for frequently accessed analytics data
3. **Rate Limiting**: Built-in rate limiting for analytics endpoints
4. **Background Processing**: Consider moving heavy analytics calculations to background jobs

### Real-time Performance

1. **Efficient Queries**: Optimized real-time queries with time-based indexing
2. **Selective Data**: Real-time endpoints only fetch necessary data
3. **Caching Strategy**: Cache active user counts and recent activity

## Security

### Authentication

- All analytics reading endpoints require JWT authentication
- View tracking endpoint is public (as it needs to track anonymous users)
- Role-based access control can be implemented for admin analytics

### Data Privacy

1. **IP Address Handling**: IP addresses are hashed and used only for geolocation
2. **Anonymous Tracking**: Support for anonymous user tracking
3. **Data Minimization**: Only collect necessary analytics data
4. **GDPR Compliance**: Implement data retention policies and user data deletion

### Input Validation

- Comprehensive Joi validation on all inputs
- SQL injection protection through MongoDB ODM
- XSS protection through data sanitization
- Rate limiting to prevent abuse

## Advanced Features

### Custom Dimensions

Add custom analytics dimensions:

```javascript
metadata: {
  customDimensions: [
    { key: "experimentGroup", value: "A" },
    { key: "subscriptionTier", value: "premium" },
  ];
}
```

### Funnel Analytics

Track user funnels and conversion rates:

```javascript
// Example funnel: view → click → contact
const funnel = {
  steps: [
    { name: "View Profile", condition: { interactionType: "view" } },
    { name: "Click Link", condition: { interactionType: "click" } },
    { name: "Contact", condition: { interactionType: "contact" } },
  ],
};
```

### A/B Testing Integration

Support for A/B testing analytics:

```javascript
metadata: {
  abTestVariant: 'new-layout-v2',
  tags: ['ab-test', 'layout-experiment']
}
```

## Troubleshooting

### Common Issues

1. **Geolocation Not Working**: Ensure `geoip-lite` database is up to date
2. **Authentication Errors**: Verify JWT token format and expiration
3. **Validation Errors**: Check request body against Joi schemas
4. **Performance Issues**: Review database indexes and query optimization

### Debugging

Enable debug logging:

```javascript
// Add to environment variables
DEBUG=analytics:*
```

### Monitoring

Implement monitoring for:

- Analytics data collection rates
- API response times
- Error rates
- Database performance

## Future Enhancements

1. **Machine Learning**: Implement ML models for user behavior prediction
2. **Real-time Dashboards**: WebSocket-based real-time analytics updates
3. **Advanced Segmentation**: User cohort analysis and segmentation
4. **Automated Insights**: AI-powered insights and recommendations
5. **Integration APIs**: Connect with external analytics platforms
6. **Mobile SDK**: Native mobile analytics SDK

## Support

For issues and questions:

1. Check the test suite for examples
2. Review the API documentation in Swagger
3. Examine the validation schemas for required fields
4. Test with the provided test script

## License

This Analytics Engine is part of the KUN Express application and follows the project's licensing terms.
