const express = require('express');
const router = express.Router();
const {
  trackView,
  getLocationAnalytics,
  getLinkAnalytics,
  getPeakHourAnalytics,
  getTimeFilteredAnalytics,
  getAnalyticsDashboard,
  getRealTimeAnalytics,
  exportAnalytics,
  trackClick,
  updateUserLocation,
  getUserCollectiveAnalytics,
  getTopPerformingLinks,
  getContentPerformance,
  // New simplified endpoints
  getUserPeakHours,
  getUserLocation,
  getUserLinks
} = require('../controllers/analytics.controller');
const auth = require('../middleware/auth.mw');

/**
 * @swagger
 * components:
 *   schemas:
 *     ViewLog:
 *       type: object
 *       properties:
 *         targetId:
 *           type: string
 *           description: ID of the target business/entity
 *         targetType:
 *           type: string
 *           enum: [business, profile, socialMedia, favorite, other]
 *           description: Type of target being tracked
 *         viewerId:
 *           type: string
 *           description: ID of the viewer (null for anonymous)
 *         sessionId:
 *           type: string
 *           description: Unique session identifier
 *         interactionType:
 *           type: string
 *           enum: [view, click, share, favorite, contact, visit_website, call, email]
 *           description: Type of interaction
 *         location:
 *           type: object
 *           properties:
 *             country:
 *               type: string
 *               description: Country name
 *             city:
 *               type: string
 *               description: City name
 *             coordinates:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                   enum: [Point]
 *                 coordinates:
 *                   type: array
 *                   items:
 *                     type: number
 *                   description: [longitude, latitude]
 *         deviceInfo:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *               enum: [mobile, tablet, desktop, other]
 *             os:
 *               type: string
 *             browser:
 *               type: string
 *         referral:
 *           type: object
 *           properties:
 *             source:
 *               type: string
 *               enum: [direct, search, social, email, qr_code, referral, other]
 *             medium:
 *               type: string
 *             campaign:
 *               type: string
 *         linkData:
 *           type: object
 *           properties:
 *             linkType:
 *               type: string
 *               enum: [social_media, website, phone, email, address, menu, booking, other]
 *             linkUrl:
 *               type: string
 *               format: uri
 *             socialPlatform:
 *               type: string
 *               enum: [instagram, facebook, twitter, linkedin, tiktok, youtube, other]
 *         metrics:
 *           type: object
 *           properties:
 *             loadTime:
 *               type: number
 *               description: Page load time in milliseconds
 *             timeOnPage:
 *               type: number
 *               description: Time spent on page in seconds
 *             scrollDepth:
 *               type: number
 *               minimum: 0
 *               maximum: 100
 *               description: Percentage of page scrolled
 *             engagementScore:
 *               type: number
 *               minimum: 0
 *               maximum: 100
 *               description: Calculated engagement score
 *             bounceRate:
 *               type: boolean
 *               description: Whether this was a bounce
 *     LocationAnalytics:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Location identifier (country/region/city)
 *         totalViews:
 *           type: number
 *           description: Total views from this location
 *         uniqueViewers:
 *           type: number
 *           description: Unique viewers from this location
 *         engagementRate:
 *           type: number
 *           description: Engagement rate percentage
 *     LinkAnalytics:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Link type or platform
 *         totalClicks:
 *           type: number
 *           description: Total clicks
 *         uniqueClickers:
 *           type: number
 *           description: Unique users who clicked
 *         avgEngagementScore:
 *           type: number
 *           description: Average engagement score
 *     PeakHourAnalytics:
 *       type: object
 *       properties:
 *         _id:
 *           type: number
 *           description: Hour (0-23) or day of week (0-6)
 *         totalViews:
 *           type: number
 *           description: Total views in this time period
 *         uniqueViewers:
 *           type: number
 *           description: Unique viewers in this time period
 *         engagementRate:
 *           type: number
 *           description: Engagement rate percentage
 *   tags:
 *     - name: Analytics
 *       description: Analytics tracking and reporting
 */

/**
 * @swagger
 * /api/analytics/track:
 *   post:
 *     summary: Track a view or interaction
 *     tags: [Analytics]
 *     description: Track user views and interactions for analytics (KON-37)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetId
 *               - targetType
 *               - interactionType
 *               - sessionId
 *             properties:
 *               targetId:
 *                 type: string
 *                 description: ID of the business or entity being viewed
 *               targetType:
 *                 type: string
 *                 enum: [business, profile, socialMedia, favorite, other]
 *                 description: Type of target being tracked
 *               viewerId:
 *                 type: string
 *                 description: ID of the viewing user (optional for anonymous)
 *               sessionId:
 *                 type: string
 *                 description: Session identifier
 *               interactionType:
 *                 type: string
 *                 enum: [view, click, share, favorite, contact, visit_website, call, email]
 *                 description: Type of interaction
 *               linkData:
 *                 type: object
 *                 description: Link information for click events
 *                 properties:
 *                   linkUrl:
 *                     type: string
 *                     format: uri
 *                   linkText:
 *                     type: string
 *                   linkPosition:
 *                     type: string
 *               metrics:
 *                 type: object
 *                 properties:
 *                   loadTime:
 *                     type: number
 *                     description: Page load time in milliseconds
 *                   timeOnPage:
 *                     type: number
 *                     description: Time spent on page in seconds
 *                   scrollDepth:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 100
 *                   bounceRate:
 *                     type: boolean
 *               metadata:
 *                 type: object
 *                 properties:
 *                   pageTitle:
 *                     type: string
 *                   pageUrl:
 *                     type: string
 *                     format: uri
 *                   tags:
 *                     type: array
 *                     items:
 *                       type: string
 *     responses:
 *       201:
 *         description: View tracked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     logId:
 *                       type: string
 *                     sessionId:
 *                       type: string
 *                     engagementScore:
 *                       type: number
 *       400:
 *         description: Validation error
 */
router.post('/track-view', auth.authenticate, trackView);

/**
 * @swagger
 * /api/analytics/location:
 *   get:
 *     summary: Get geo-aggregated location analytics
 *     tags: [Analytics]
 *     description: Get analytics data aggregated by geographic location (KON-38)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: targetId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the target business/entity
 *       - in: query
 *         name: targetType
 *         schema:
 *           type: string
 *           enum: [business, profile, socialMedia, favorite, other]
 *           default: business
 *         description: Type of target
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics (ISO format)
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [country, region, city]
 *           default: country
 *         description: Geographic grouping level
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Location analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     analytics:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/LocationAnalytics'
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalViews:
 *                           type: number
 *                         totalUniqueViewers:
 *                           type: number
 *                         totalLocations:
 *                           type: number
 *                         avgEngagementRate:
 *                           type: number
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
// router.get('/location', auth.authenticate, getLocationAnalytics); // Removed - use getUserLocation instead

/**
 * @swagger
 * /api/analytics/links:
 *   get:
 *     summary: Get link click analytics
 *     tags: [Analytics]
 *     description: Get analytics for link clicks and interactions (KON-39)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: targetId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the target business/entity
 *       - in: query
 *         name: targetType
 *         schema:
 *           type: string
 *           enum: [business, profile, socialMedia, favorite, other]
 *           default: business
 *         description: Type of target
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics
 *       - in: query
 *         name: linkType
 *         schema:
 *           type: string
 *           enum: [social_media, website, phone, email, address, menu, booking, other]
 *         description: Filter by specific link type
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [linkType, platform]
 *           default: linkType
 *         description: Group results by link type or social platform
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Link analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     analytics:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/LinkAnalytics'
 *                     topLinks:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/LinkAnalytics'
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalClicks:
 *                           type: number
 *                         totalUniqueClickers:
 *                           type: number
 *                         avgEngagementScore:
 *                           type: number
 *                         clickThroughRate:
 *                           type: number
 *       400:
 *         description: Validation error
 */
// router.get('/links', auth.authenticate, getLinkAnalytics); // Removed - use getUserLinks instead

/**
 * @swagger
 * /api/analytics/peak-hours:
 *   get:
 *     summary: Get peak hour analytics
 *     tags: [Analytics]
 *     description: Get analytics for peak viewing hours and days (KON-40)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: targetId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the target business/entity
 *       - in: query
 *         name: targetType
 *         schema:
 *           type: string
 *           enum: [business, profile, socialMedia, favorite, other]
 *           default: business
 *         description: Type of target
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [hour, dayOfWeek, hourOfWeek]
 *           default: hour
 *         description: Time grouping method
 *       - in: query
 *         name: timezone
 *         schema:
 *           type: string
 *           default: UTC
 *         description: Timezone for time calculations
 *     responses:
 *       200:
 *         description: Peak hour analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     analytics:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PeakHourAnalytics'
 *                     insights:
 *                       type: object
 *                       properties:
 *                         peakHour:
 *                           $ref: '#/components/schemas/PeakHourAnalytics'
 *                         peakDay:
 *                           $ref: '#/components/schemas/PeakHourAnalytics'
 *                         avgViewsPerHour:
 *                           type: number
 *                         avgViewsPerDay:
 *                           type: number
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalPeriods:
 *                           type: number
 *                         totalViews:
 *                           type: number
 *                         avgEngagementRate:
 *                           type: number
 *       400:
 *         description: Validation error
 */
// router.get('/peak-hours', auth.authenticate, getPeakHourAnalytics); // Removed - use getUserPeakHours instead

/**
 * @swagger
 * /api/analytics/time-filtered:
 *   get:
 *     summary: Get time-filtered analytics
 *     tags: [Analytics]
 *     description: Get analytics data filtered and grouped by time periods (KON-41)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: targetId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the target business/entity
 *       - in: query
 *         name: targetType
 *         schema:
 *           type: string
 *           enum: [business, profile, socialMedia, favorite, other]
 *           default: business
 *         description: Type of target
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 *           default: month
 *         description: Predefined timeframe
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Custom start date (overrides timeframe)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Custom end date (overrides timeframe)
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [hour, day, week, month]
 *           default: day
 *         description: Time grouping granularity
 *     responses:
 *       200:
 *         description: Time-filtered analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     analytics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           totalViews:
 *                             type: number
 *                           uniqueViewers:
 *                             type: number
 *                           avgEngagementScore:
 *                             type: number
 *                           bounceRate:
 *                             type: number
 *                     trends:
 *                       type: object
 *                       properties:
 *                         viewsTrend:
 *                           type: number
 *                           description: Percentage change in views
 *                         engagementTrend:
 *                           type: number
 *                           description: Percentage change in engagement
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalViews:
 *                           type: number
 *                         totalUniqueViewers:
 *                           type: number
 *                         avgEngagementScore:
 *                           type: number
 *                         avgBounceRate:
 *                           type: number
 *       400:
 *         description: Validation error
 */
router.get('/time-filtered', auth.authenticate, getTimeFilteredAnalytics);

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get comprehensive analytics dashboard
 *     tags: [Analytics]
 *     description: Get a comprehensive analytics dashboard with multiple data sets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: targetId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the target business/entity
 *       - in: query
 *         name: targetType
 *         schema:
 *           type: string
 *           enum: [business, profile, socialMedia, favorite, other]
 *           default: business
 *         description: Type of target
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [today, week, month, quarter, year, custom]
 *           default: month
 *         description: Time period for dashboard
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (required for custom timeframe)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (required for custom timeframe)
 *       - in: query
 *         name: includeLocation
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include location analytics
 *       - in: query
 *         name: includeDevices
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include device analytics
 *       - in: query
 *         name: includeReferrals
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include referral analytics
 *       - in: query
 *         name: includePeakHours
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include peak hours analytics
 *       - in: query
 *         name: includeLinks
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include link analytics
 *     responses:
 *       200:
 *         description: Dashboard analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     timeAnalytics:
 *                       type: array
 *                       description: Time-series analytics data
 *                     locationAnalytics:
 *                       type: array
 *                       description: Geographic analytics data
 *                     linkAnalytics:
 *                       type: array
 *                       description: Link click analytics data
 *                     peakHoursAnalytics:
 *                       type: array
 *                       description: Peak hours analytics data
 *                     deviceAnalytics:
 *                       type: array
 *                       description: Device type analytics data
 *                     referralAnalytics:
 *                       type: array
 *                       description: Referral source analytics data
 *       400:
 *         description: Validation error
 */
router.get('/dashboard', auth.authenticate, getAnalyticsDashboard);

/**
 * @swagger
 * /api/analytics/real-time:
 *   get:
 *     summary: Get real-time analytics
 *     tags: [Analytics]
 *     description: Get real-time analytics data for active users and recent activity
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: targetId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the target business/entity
 *       - in: query
 *         name: targetType
 *         schema:
 *           type: string
 *           enum: [business, profile, socialMedia, favorite, other]
 *           default: business
 *         description: Type of target
 *       - in: query
 *         name: minutes
 *         schema:
 *           type: integer
 *           minimum: 5
 *           maximum: 1440
 *           default: 30
 *         description: Time window in minutes (5 minutes to 24 hours)
 *       - in: query
 *         name: includeActiveUsers
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include active users count
 *       - in: query
 *         name: includePageViews
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include page views timeline
 *       - in: query
 *         name: includeInteractions
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include interaction types breakdown
 *     responses:
 *       200:
 *         description: Real-time analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     activeUsers:
 *                       type: object
 *                       properties:
 *                         activeUsers:
 *                           type: number
 *                         activeSessions:
 *                           type: number
 *                     pageViews:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             description: Time period
 *                           views:
 *                             type: number
 *                     interactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             description: Interaction type
 *                           count:
 *                             type: number
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Validation error
 */
router.get('/real-time', auth.authenticate, getRealTimeAnalytics);

/**
 * @swagger
 * /api/analytics/export:
 *   get:
 *     summary: Export analytics data
 *     tags: [Analytics]
 *     description: Export analytics data in various formats (JSON, CSV, XLSX)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: targetId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the target business/entity
 *       - in: query
 *         name: targetType
 *         schema:
 *           type: string
 *           enum: [business, profile, socialMedia, favorite, other]
 *           default: business
 *         description: Type of target
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for export
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for export
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv, xlsx]
 *           default: json
 *         description: Export format
 *       - in: query
 *         name: includeRawData
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include raw analytics data
 *       - in: query
 *         name: metrics
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [views, clicks, engagement, locations, devices, referrals, peakHours]
 *           default: [views, clicks, engagement]
 *         description: Metrics to include in export
 *         style: form
 *         explode: false
 *     responses:
 *       200:
 *         description: Exported analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Exported analytics data
 *                 exportInfo:
 *                   type: object
 *                   properties:
 *                     format:
 *                       type: string
 *                     startDate:
 *                       type: string
 *                     endDate:
 *                       type: string
 *                     metrics:
 *                       type: array
 *                       items:
 *                         type: string
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error
 */
router.get('/export', auth.authenticate, exportAnalytics);

/**
 * @swagger
 * /api/analytics/track-click:
 *   post:
 *     summary: Track click on any content
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetId
 *             properties:
 *               targetId:
 *                 type: string
 *                 description: ID of the target content (type will be auto-detected)
 *     responses:
 *       200:
 *         description: Click tracked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     clickId:
 *                       type: string
 *                     isUnique:
 *                       type: boolean
 *                     targetId:
 *                       type: string
 *                     targetType:
 *                       type: string
 *                       description: Auto-detected content type
 *                     targetTitle:
 *                       type: string
 *                       description: Auto-extracted content title
 *                     targetUrl:
 *                       type: string
 *                       description: Auto-generated content URL
 *       400:
 *         description: Already clicked
 */
router.post('/track-click', auth.authenticate, trackClick);

/**
 * @swagger
 * /api/analytics/update-location:
 *   put:
 *     summary: Update user location with coordinates, city, and address
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - longitude
 *               - latitude
 *             properties:
 *               longitude:
 *                 type: number
 *                 minimum: -180
 *                 maximum: 180
 *                 description: Longitude coordinate
 *               latitude:
 *                 type: number
 *                 minimum: -90
 *                 maximum: 90
 *                 description: Latitude coordinate
 *               city:
 *                 type: string
 *                 description: User's city (optional, converted from coordinates)
 *               address:
 *                 type: string
 *                 description: User's full address (optional, converted from coordinates)
 *     responses:
 *       200:
 *         description: Location updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     longitude:
 *                       type: number
 *                     latitude:
 *                       type: number
 *                     city:
 *                       type: string
 *                     address:
 *                       type: string
 *                     lastLocationUpdate:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error
 */
router.put('/update-location', auth.authenticate, updateUserLocation);

/**
 * @swagger
 * /api/analytics/business/{businessId}/collective:
 *   get:
 *     summary: Get business collective analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *         description: Business ID
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *         description: Time period
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (ISO format)
 *     responses:
 *       200:
 *         description: Business collective analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     businessId:
 *                       type: string
 *                     businessName:
 *                       type: string
 *                     period:
 *                       type: string
 *                     collectiveMetrics:
 *                       type: object
 *                       properties:
 *                         totalViews:
 *                           type: number
 *                         totalClicks:
 *                           type: number
 *                         totalFavorites:
 *                           type: number
 *                         overallCTR:
 *                           type: number
 *                         uniqueClicks:
 *                           type: number
 *                         uniqueFavorites:
 *                           type: number
 *                     contentBreakdown:
 *                       type: array
 *                     cityAnalytics:
 *                       type: object
 *                     timeAnalytics:
 *                       type: object
 */
router.get('/user/:userId/collective', auth.authenticate, getUserCollectiveAnalytics);

/**
 * @swagger
 * /api/analytics/individual/{userId}/collective:
 *   get:
 *     summary: Get individual collective analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *         description: Time period
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (ISO format)
 *     responses:
 *       200:
 *         description: Individual collective analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     userName:
 *                       type: string
 *                     period:
 *                       type: string
 *                     collectiveMetrics:
 *                       type: object
 *                     contentBreakdown:
 *                       type: array
 *                     cityAnalytics:
 *                       type: object
 *                     timeAnalytics:
 *                       type: object
 */

/**
 * @swagger
 * /api/analytics/top-performing-links:
 *   get:
 *     summary: Get top performing links (based on Figma design)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ownerId
 *         schema:
 *           type: string
 *         description: Owner ID (defaults to current user)
 *       - in: query
 *         name: ownerType
 *         schema:
 *           type: string
 *           enum: [business, individual]
 *           default: individual
 *         description: Owner type
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *         description: Time period
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of links to return
 *     responses:
 *       200:
 *         description: Top performing links
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     topPerformingLinks:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           targetId:
 *                             type: string
 *                           targetType:
 *                             type: string
 *                           targetUrl:
 *                             type: string
 *                           targetTitle:
 *                             type: string
 *                           targetThumbnail:
 *                             type: string
 *                           clicks:
 *                             type: number
 *                           uniqueClicks:
 *                             type: number
 *                           period:
 *                             type: string
 *                     period:
 *                       type: string
 *                     totalLinks:
 *                       type: number
 */
router.get('/top-performing-links', auth.authenticate, getTopPerformingLinks);

/**
 * @swagger
 * /api/analytics/content-performance/{targetId}:
 *   get:
 *     summary: Get content performance (based on Figma design)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: targetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Target content ID
 *       - in: query
 *         name: targetType
 *         required: false
 *         schema:
 *           type: string
 *         description: Target content type (auto-detected if not provided)
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *         description: Time period
 *     responses:
 *       200:
 *         description: Content performance data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     targetId:
 *                       type: string
 *                     targetType:
 *                       type: string
 *                       description: Auto-detected content type
 *                     url:
 *                       type: string
 *                     title:
 *                       type: string
 *                     thumbnail:
 *                       type: string
 *                     views:
 *                       type: number
 *                     clicks:
 *                       type: number
 *                     uniqueClicks:
 *                       type: number
 *                     ctr:
 *                       type: number
 *                     period:
 *                       type: string
 */
router.get('/content-performance/:targetId', auth.authenticate, getContentPerformance);

// ===== NEW SIMPLIFIED ENDPOINTS FOR LOGGED-IN USER =====

/**
 * @swagger
 * /api/analytics/peak-hours:
 *   get:
 *     summary: Get peak hours analytics for logged-in user (all their content)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateRange
 *         schema:
 *           type: string
 *           enum: [weekly, monthly, yearly, YYYY-MM-DD]
 *         description: Date range for analytics (e.g., 'weekly', 'monthly', 'yearly', '2025-01-10')
 *     responses:
 *       200:
 *         description: Peak hours analytics for user's content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     analytics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: number
 *                           totalViews:
 *                             type: number
 *                           totalInteractions:
 *                             type: number
 *                           uniqueViewers:
 *                             type: number
 *                           engagementRate:
 *                             type: string
 *                     insights:
 *                       type: object
 *                       properties:
 *                         peakHour:
 *                           type: object
 *                         quietestHour:
 *                           type: object
 *                         avgViewsPerHour:
 *                           type: number
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalPeriods:
 *                           type: number
 *                         totalViews:
 *                           type: number
 *                         totalInteractions:
 *                           type: number
 *                         avgEngagementRate:
 *                           type: string
 */
router.get('/peak-hours', auth.authenticate, getUserPeakHours);

/**
 * @swagger
 * /api/analytics/location:
 *   get:
 *     summary: Get location analytics for logged-in user (all their content)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateRange
 *         schema:
 *           type: string
 *           enum: [weekly, monthly, yearly, YYYY-MM-DD]
 *         description: Date range for analytics
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [city, country, region]
 *         description: Group by location type
 *     responses:
 *       200:
 *         description: Location analytics for user's content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     analytics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           longitude:
 *                             type: number
 *                           latitude:
 *                             type: number
 *                           city:
 *                             type: string
 *                           clicks:
 *                             type: number
 *                           uniqueClicks:
 *                             type: number
 *                           percentage:
 *                             type: string
 *                           lastClick:
 *                             type: string
 *                             format: date-time
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalViews:
 *                           type: number
 *                         totalUniqueViewers:
 *                           type: number
 *                         totalInteractions:
 *                           type: number
 *                         totalLocations:
 *                           type: number
 */
router.get('/location', auth.authenticate, getUserLocation);

/**
 * @swagger
 * /api/analytics/links:
 *   get:
 *     summary: Get links analytics for logged-in user (all their custom links)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateRange
 *         schema:
 *           type: string
 *           enum: [weekly, monthly, yearly, YYYY-MM-DD]
 *         description: Date range for analytics
 *     responses:
 *       200:
 *         description: Links analytics for user's custom links
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     analytics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           targetUrl:
 *                             type: string
 *                           targetTitle:
 *                             type: string
 *                           clicks:
 *                             type: number
 *                           uniqueClicks:
 *                             type: number
 *                           percentage:
 *                             type: string
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalLinks:
 *                           type: number
 *                         totalClicks:
 *                           type: number
 *                         totalUniqueClicks:
 *                           type: number
 */
router.get('/links', auth.authenticate, getUserLinks);

module.exports = router; 