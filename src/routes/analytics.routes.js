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
  exportAnalytics
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
router.post('/track', trackView);

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
router.get('/location', auth.authenticate, getLocationAnalytics);

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
router.get('/links', auth.authenticate, getLinkAnalytics);

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
router.get('/peak-hours', auth.authenticate, getPeakHourAnalytics);

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

module.exports = router; 