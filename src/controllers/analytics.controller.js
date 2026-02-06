const mongoose = require('mongoose');
const BusinessProfile = require('../models/businessProfile.model');
const PersonalProfile = require('../models/personalProfile.model');
const BuilderPage = require('../models/builderPage.model');
const Widget = require('../models/widget.model');
const ClickTracking = require('../models/clickTracking.model');
const User = require('../models/user.model');
const Favorite = require('../models/favorite.model');
const {
  validateLocationAnalytics,
  validateLinkAnalytics,
  validatePeakHourAnalytics,
  validateTimeFilteredAnalytics,
  validateViewLogCreation,
  validateAnalyticsDashboard,
  validateBulkAnalytics,
  validateExportAnalytics,
  validateRealTimeAnalytics,
  validateComparisonAnalytics,
  validateFunnelAnalytics,
  validateTopPerformingLinks,
  validateContentPerformance
} = require('../utils/analyticsValidation');
const {
  getLocationFromIP,
  getDeviceInfo,
  parseReferralInfo,
  calculateEngagementScore,
  generateSessionId,
  parseLinkData,
  aggregateByTimeframe,
  calculatePeakHours
} = require('../utils/analyticsUtils');

/**
 * @desc    Track a view or interaction
 * @route   POST /api/analytics/track
 * @access  Public
 */
exports.trackView = async (req, res, next) => {
  try {
    const { error, value } = validateViewLogCreation(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const {
      targetId,
      targetType,
      viewerId,
      interactionType,
      linkData: providedLinkData,
      metrics: providedMetrics,
      metadata
    } = value;

    // Get or generate session ID
    const sessionId = value.sessionId || generateSessionId(req);

    // Extract location from IP
    const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const location = getLocationFromIP(ipAddress);

    // Parse device information
    const deviceInfo = getDeviceInfo(req.get('User-Agent'));

    // Parse referral information
    const referral = parseReferralInfo(req);

    // Parse link data if it's a click event
    let linkData = null;
    if (interactionType === 'click' && providedLinkData) {
      linkData = parseLinkData(
        providedLinkData.linkUrl,
        providedLinkData.linkText,
        providedLinkData.linkPosition
      );
    }

    // Calculate engagement score
    const engagementScore = calculateEngagementScore({
      timeOnPage: providedMetrics?.timeOnPage || 0,
      scrollDepth: providedMetrics?.scrollDepth || 0,
      interactions: interactionType !== 'view' ? 1 : 0,
      bounceRate: providedMetrics?.bounceRate || false,
      loadTime: providedMetrics?.loadTime || 0
    });

    // Create view log entry
    const viewLog = new ViewLog({
      targetId,
      targetType,
      viewerId: viewerId || null,
      viewerType: viewerId ? 'authenticated' : 'anonymous',
      sessionId,
      interactionType,
      location: {
        ...location,
        ipAddress
      },
      deviceInfo,
      referral,
      linkData,
      metrics: {
        ...providedMetrics,
        engagementScore
      },
      metadata
    });

    await viewLog.save();

    // Update target metrics if it's a business profile
    if (targetType === 'business' && interactionType === 'view') {
      await BusinessProfile.findByIdAndUpdate(targetId, {
        $inc: { 'metrics.viewCount': 1 }
      });
    }

    res.status(201).json({
      success: true,
      message: 'View tracked successfully',
      data: {
        logId: viewLog._id,
        sessionId,
        engagementScore
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get location analytics (KON-38)
 * @route   GET /api/analytics/location
 * @access  Private
 */
exports.getLocationAnalytics = async (req, res, next) => {
  try {
    const { error, value } = validateLocationAnalytics(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { targetId, targetType, dateRange, groupBy, limit } = value;
    
    // Parse date range (weekly, monthly, yearly, or specific date)
    const { startDate, endDate } = parseDateRange(dateRange);
    
    // Get correct target data (Builder Page or Custom Link)
    const targetData = await getCorrectTargetData(targetId);
    if (!targetData) {
      return res.status(404).json({ 
        success: false, 
        message: "Content not found" 
      });
    }
    
    const ownerId = targetData.ownerId;
    
    // Get all clicks for this owner from all their content
    const allClicks = await ClickTracking.find({
      targetOwnerId: new mongoose.Types.ObjectId(ownerId)
    }).select('longitude latitude timestamp userId');
    
    console.log('=== LOCATION ANALYTICS DEBUG ===');
    console.log('Target ID:', targetId);
    console.log('Target Type:', finalTargetType);
    console.log('Owner ID:', ownerId);
    console.log('Date Range:', dateRange);
    console.log('Start Date:', startDate);
    console.log('End Date:', endDate);
    console.log('Total Clicks Found:', allClicks.length);
    console.log('Sample Clicks:', allClicks.slice(0, 3));
    console.log('===============================');
    
    // Group by location and convert to city names
    const locationMap = {};
    allClicks.forEach(click => {
      const key = `${click.longitude},${click.latitude}`;
      if (!locationMap[key]) {
        locationMap[key] = {
          longitude: click.longitude,
          latitude: click.latitude,
          city: getCityName(click.longitude, click.latitude),
          clicks: 0,
          uniqueUsers: new Set(),
          lastClick: click.timestamp
        };
      }
      locationMap[key].clicks++;
      locationMap[key].uniqueUsers.add(click.userId.toString());
      if (click.timestamp > locationMap[key].lastClick) {
        locationMap[key].lastClick = click.timestamp;
      }
    });
    
    // Convert to array and calculate percentages
    const totalClicks = allClicks.length;
    const analytics = Object.values(locationMap).map(location => ({
      _id: location.city || `${location.longitude},${location.latitude}`,
      longitude: location.longitude,
      latitude: location.latitude,
      city: location.city,
      clicks: location.clicks,
      uniqueClicks: location.uniqueUsers.size,
      percentage: totalClicks > 0 ? ((location.clicks / totalClicks) * 100).toFixed(1) : 0,
      lastClick: location.lastClick
    })).sort((a, b) => b.clicks - a.clicks).slice(0, limit);

    // Calculate totals from ClickTracking data
    const totals = analytics.reduce((acc, item) => ({
      totalViews: acc.totalViews + (item.clicks || 0),
      totalUniqueViewers: acc.totalUniqueViewers + (item.uniqueClicks || 0),
      totalInteractions: acc.totalInteractions + (item.clicks || 0)
    }), { totalViews: 0, totalUniqueViewers: 0, totalInteractions: 0 });

    res.status(200).json({
      success: true,
      data: {
        analytics,
        summary: {
          ...totals,
          totalLocations: analytics.length,
          avgEngagementRate: 0 // Not applicable for click tracking
        },
        filters: {
          targetId,
          targetType,
          groupBy,
          dateRange: dateRange || 'current',
          startDate,
          endDate
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get link click analytics (KON-39)
 * @route   GET /api/analytics/links
 * @access  Private
 */
exports.getLinkAnalytics = async (req, res, next) => {
  try {
    const { error, value } = validateLinkAnalytics(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { targetId, targetType, dateRange, linkType, groupBy, limit } = value;
    
    // Parse date range (weekly, monthly, yearly, or specific date)
    const { startDate, endDate } = parseDateRange(dateRange);
    
    // Get correct target data (Builder Page or Custom Link)
    const targetData = await getCorrectTargetData(targetId);
    if (!targetData) {
      return res.status(404).json({ 
        success: false, 
        message: "Content not found" 
      });
    }
    
    const ownerId = targetData.ownerId;
    
    // Get all clicks for this owner from all their content
    const allClicks = await ClickTracking.find({
      targetOwnerId: new mongoose.Types.ObjectId(ownerId)
    }).select('targetId targetType targetUrl targetTitle targetThumbnail timestamp userId');
    
    console.log('=== LINKS ANALYTICS DEBUG ===');
    console.log('Target ID:', targetId);
    console.log('Target Type:', targetData.targetType);
    console.log('Owner ID:', ownerId);
    console.log('Date Range:', dateRange);
    console.log('Start Date:', startDate);
    console.log('End Date:', endDate);
    console.log('Total Clicks Found:', allClicks.length);
    console.log('Sample Clicks:', allClicks.slice(0, 3));
    console.log('=============================');
    
    // Group clicks by targetId (link)
    const linkMap = {};
    allClicks.forEach(click => {
      const key = click.targetId.toString();
      if (!linkMap[key]) {
        linkMap[key] = {
          targetId: click.targetId,
          targetType: click.targetType,
          targetUrl: click.targetUrl,
          targetTitle: click.targetTitle,
          targetThumbnail: click.targetThumbnail,
          totalClicks: 0,
          uniqueClickers: new Set(),
          lastClick: click.timestamp
        };
      }
      linkMap[key].totalClicks++;
      linkMap[key].uniqueClickers.add(click.userId.toString());
      if (click.timestamp > linkMap[key].lastClick) {
        linkMap[key].lastClick = click.timestamp;
      }
    });
    
    // Convert to array and calculate metrics
    const analytics = Object.values(linkMap).map(link => ({
      targetId: link.targetId,
      targetType: link.targetType,
      targetUrl: link.targetUrl,
      targetTitle: link.targetTitle,
      targetThumbnail: link.targetThumbnail,
      totalClicks: link.totalClicks,
      uniqueClickers: link.uniqueClickers.size,
      lastClick: link.lastClick,
      clickThroughRate: 100 // Since these are actual clicks, CTR is 100%
    }));

    // Calculate totals
    const totals = analytics.reduce((acc, item) => ({
      totalClicks: acc.totalClicks + item.totalClicks,
      totalUniqueClickers: acc.totalUniqueClickers + item.uniqueClickers
    }), { totalClicks: 0, totalUniqueClickers: 0 });

    // Get top performing links
    const topLinks = analytics
      .sort((a, b) => b.totalClicks - a.totalClicks)
      .slice(0, limit || 10);

    res.status(200).json({
      success: true,
      data: {
        analytics,
        topLinks,
        summary: {
          ...totals,
          totalLinkTypes: analytics.length,
          avgEngagementScore: analytics.length > 0
            ? Math.round(analytics.reduce((acc, item) => acc + (item.avgEngagementScore || 0), 0) / analytics.length)
            : 0,
          clickThroughRate: totals.totalClicks > 0 
            ? Math.round((totals.totalUniqueClickers / totals.totalClicks) * 100)
            : 0
        },
        filters: {
          targetId,
          targetType,
          linkType,
          groupBy,
          dateRange: dateRange || 'current',
          startDate,
          endDate
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get peak hour analytics (KON-40)
 * @route   GET /api/analytics/peak-hours
 * @access  Private
 */
exports.getPeakHourAnalytics = async (req, res, next) => {
  try {
    const { error, value } = validatePeakHourAnalytics(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { targetId, targetType, dateRange, groupBy, timezone } = value;
    
    // Parse date range (weekly, monthly, yearly, or specific date)
    const { startDate, endDate } = parseDateRange(dateRange);
    
    // Get correct target data (Builder Page or Custom Link)
    const targetData = await getCorrectTargetData(targetId);
    if (!targetData) {
      return res.status(404).json({ 
        success: false, 
        message: "Content not found" 
      });
    }
    
    const ownerId = targetData.ownerId;
    
    // Get all clicks for this owner from all their content
    const clickQuery = {
      targetOwnerId: new mongoose.Types.ObjectId(ownerId)
    };
    
    // Add date filter if date is provided
    if (startDate && endDate) {
      clickQuery.timestamp = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    const allClicks = await ClickTracking.find(clickQuery).select('timestamp userId');
    
    console.log('=== PEAK HOURS ANALYTICS DEBUG ===');
    console.log('Target ID:', targetId);
    console.log('Target Type:', finalTargetType);
    console.log('Owner ID:', ownerId);
    console.log('Date Range:', dateRange);
    console.log('Start Date:', startDate);
    console.log('End Date:', endDate);
    console.log('Click Query:', JSON.stringify(clickQuery, null, 2));
    console.log('Total Clicks Found:', allClicks.length);
    console.log('Sample Clicks:', allClicks.slice(0, 3));
    console.log('==================================');
    
    // Group clicks by hour/day
    const hourMap = {};
    const dayMap = {};
    
    allClicks.forEach(click => {
      const date = new Date(click.timestamp);
      const hour = date.getHours();
      const day = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      // Group by hour
      if (!hourMap[hour]) {
        hourMap[hour] = {
          _id: hour,
          totalViews: 0,
          totalInteractions: 0,
          uniqueViewers: new Set(),
          engagementRate: 0,
          avgEngagementScore: null,
          avgTimeOnPage: null
        };
      }
      hourMap[hour].totalViews++;
      hourMap[hour].totalInteractions++;
      hourMap[hour].uniqueViewers.add(click.userId.toString());
      
      // Group by day
      if (!dayMap[day]) {
        dayMap[day] = {
          _id: day,
          totalViews: 0,
          totalInteractions: 0,
          uniqueViewers: new Set(),
          engagementRate: 0,
          avgEngagementScore: null,
          avgTimeOnPage: null
        };
      }
      dayMap[day].totalViews++;
      dayMap[day].totalInteractions++;
      dayMap[day].uniqueViewers.add(click.userId.toString());
    });
    
    // Create complete 24-hour array (0-23) with 0 values for missing hours
    const analytics = [];
    for (let hour = 0; hour < 24; hour++) {
      if (hourMap[hour]) {
        analytics.push({
          ...hourMap[hour],
          uniqueViewers: hourMap[hour].uniqueViewers.size,
          engagementRate: hourMap[hour].totalViews > 0 ? ((hourMap[hour].totalInteractions / hourMap[hour].totalViews) * 100).toFixed(2) : 0
        });
      } else {
        analytics.push({
          _id: hour,
          totalViews: 0,
          totalInteractions: 0,
          uniqueViewers: 0,
          engagementRate: 0,
          avgEngagementScore: null,
          avgTimeOnPage: null
        });
      }
    }

    // Calculate insights
    const insights = {
      peakHour: null,
      peakDay: null,
      quietestHour: null,
      quietestDay: null,
      avgViewsPerHour: 0,
      avgViewsPerDay: 0
    };

    if (groupBy === 'hour' || groupBy === 'hourOfWeek') {
      // Filter out hours with 0 views for peak/quietest calculations
      const activeHours = analytics.filter(hour => hour.totalViews > 0);
      const sortedByViews = [...activeHours].sort((a, b) => b.totalViews - a.totalViews);
      
      insights.peakHour = sortedByViews[0] || null;
      insights.quietestHour = sortedByViews[sortedByViews.length - 1] || null;
      insights.avgViewsPerHour = analytics.length > 0 ? Math.round(
        analytics.reduce((acc, item) => acc + item.totalViews, 0) / analytics.length
      ) : 0;
    }

    if (groupBy === 'dayOfWeek' || groupBy === 'hourOfWeek') {
      const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      // Use our dayMap data for day calculations
      const dayAnalytics = Object.values(dayMap).map(day => ({
        ...day,
        uniqueViewers: day.uniqueViewers.size,
        engagementRate: day.totalViews > 0 ? ((day.totalInteractions / day.totalViews) * 100).toFixed(2) : 0
      })).sort((a, b) => a._id - b._id);

      const sortedDaily = [...dayAnalytics].sort((a, b) => b.totalViews - a.totalViews);
      
      if (sortedDaily.length > 0) {
        insights.peakDay = {
          ...sortedDaily[0],
          dayLabel: dayLabels[sortedDaily[0]._id] || `Day ${sortedDaily[0]._id}`
        };
        insights.quietestDay = {
          ...sortedDaily[sortedDaily.length - 1],
          dayLabel: dayLabels[sortedDaily[sortedDaily.length - 1]._id] || `Day ${sortedDaily[sortedDaily.length - 1]._id}`
        };
        insights.avgViewsPerDay = Math.round(
          dayAnalytics.reduce((acc, item) => acc + item.totalViews, 0) / dayAnalytics.length
        );
      }
    }

    res.status(200).json({
      success: true,
      data: {
        analytics,
        insights,
        summary: {
          totalPeriods: analytics.length,
          totalViews: analytics.reduce((acc, item) => acc + item.totalViews, 0),
          totalInteractions: analytics.reduce((acc, item) => acc + item.totalInteractions, 0),
          avgEngagementRate: analytics.length > 0
            ? Math.round(analytics.reduce((acc, item) => acc + item.engagementRate, 0) / analytics.length)
            : 0
        },
        filters: {
          targetId,
          targetType,
          groupBy,
          timezone,
          dateRange: dateRange || 'current', // Show the date range used
          startDate: startDate,
          endDate: endDate
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get time-filtered analytics (KON-41)
 * @route   GET /api/analytics/time-filtered
 * @access  Private
 */
exports.getTimeFilteredAnalytics = async (req, res, next) => {
  try {
    const { error, value } = validateTimeFilteredAnalytics(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { targetId, targetType, dateRange, groupBy } = value;

    // Parse date range
    const { startDate, endDate } = parseDateRange(dateRange);
    console.log('=== getTimeFilteredAnalytics ===');
    console.log('Target ID:', targetId);
    console.log('Target Type:', targetType);
    console.log('Date Range:', dateRange);
    console.log('Parsed date range:', { startDate, endDate });
    console.log('Group By:', groupBy);

    // Get click analytics instead of view analytics
    const analytics = await ClickTracking.aggregate([
      {
        $match: {
          targetId: new mongoose.Types.ObjectId(targetId),
          ...(targetType && { targetType }),
          timestamp: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: groupBy === 'hour' ? '%Y-%m-%d %H:00:00' : 
                      groupBy === 'day' ? '%Y-%m-%d' :
                      groupBy === 'week' ? '%Y-%U' : '%Y-%m',
              date: '$timestamp'
            }
          },
          totalClicks: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          period: '$_id',
          totalClicks: 1,
          uniqueClicks: { $size: '$uniqueUsers' },
          _id: 0
        }
      },
      { $sort: { period: 1 } }
    ]);

    // Calculate trends based on clicks
    const trends = {
      clicksTrend: 0,
      uniqueClicksTrend: 0
    };

    if (analytics.length >= 2) {
      const recent = analytics.slice(-7); // Last 7 periods
      const previous = analytics.slice(-14, -7); // Previous 7 periods

      if (previous.length > 0 && recent.length > 0) {
        const recentAvg = recent.reduce((acc, item) => acc + item.totalClicks, 0) / recent.length;
        const previousAvg = previous.reduce((acc, item) => acc + item.totalClicks, 0) / previous.length;
        trends.clicksTrend = previousAvg > 0 ? Math.round(((recentAvg - previousAvg) / previousAvg) * 100) : 0;

        const recentUnique = recent.reduce((acc, item) => acc + item.uniqueClicks, 0) / recent.length;
        const previousUnique = previous.reduce((acc, item) => acc + item.uniqueClicks, 0) / previous.length;
        trends.uniqueClicksTrend = previousUnique > 0 
          ? Math.round(((recentUnique - previousUnique) / previousUnique) * 100) : 0;
      }
    }

    // Calculate period comparison
    const summary = {
      totalClicks: analytics.reduce((acc, item) => acc + item.totalClicks, 0),
      totalUniqueClicks: analytics.reduce((acc, item) => acc + item.uniqueClicks, 0),
      avgClicksPerPeriod: analytics.length > 0 ? analytics.reduce((acc, item) => acc + item.totalClicks, 0) / analytics.length : 0,
      totalPeriods: analytics.length
    };

    res.status(200).json({
      success: true,
      data: {
        analytics,
        trends,
        summary,
        filters: {
          targetId,
          targetType,
          timeframe,
          groupBy,
          startDate,
          endDate
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get comprehensive analytics dashboard
 * @route   GET /api/analytics/dashboard
 * @access  Private
 */
exports.getAnalyticsDashboard = async (req, res, next) => {
  try {
    const { error, value } = validateAnalyticsDashboard(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const {
      targetId,
      targetType,
      dateRange,
      includeLocation,
      includeDevices,
      includeReferrals,
      includePeakHours,
      includeLinks,
      groupBy
    } = value;

    // Parse date range
    const { startDate, endDate } = parseDateRange(dateRange);
    console.log('=== getAnalyticsDashboard ===');
    console.log('Target ID:', targetId);
    console.log('Target Type:', targetType);
    console.log('Date Range:', dateRange);
    console.log('Parsed date range:', { startDate, endDate });
    console.log('Include Location:', includeLocation);
    console.log('Include Devices:', includeDevices);
    console.log('Include Referrals:', includeReferrals);
    console.log('Include Peak Hours:', includePeakHours);
    console.log('Include Links:', includeLinks);
    console.log('Group By:', groupBy);

    const promises = [];
    const dashboard = {};

    // Base time-filtered analytics
    promises.push(
      ViewLog.getTimeFilteredAnalytics(targetId, {
        targetType,
        startDate,
        endDate,
        groupBy
      }).then(data => { dashboard.timeAnalytics = data; })
    );

    // Location analytics
    if (includeLocation) {
      promises.push(
        ViewLog.getLocationAnalytics(targetId, {
          targetType,
          startDate,
          endDate,
          groupBy: 'country',
          limit: 10
        }).then(data => { dashboard.locationAnalytics = data; })
      );
    }

    // Link analytics
    if (includeLinks) {
      promises.push(
        ViewLog.getLinkAnalytics(targetId, {
          targetType,
          startDate,
          endDate,
          groupBy: 'linkType',
          limit: 10
        }).then(data => { dashboard.linkAnalytics = data; })
      );
    }

    // Peak hours analytics
    if (includePeakHours) {
      promises.push(
        ViewLog.getPeakHourAnalytics(targetId, {
          targetType,
          startDate,
          endDate,
          groupBy: 'hour'
        }).then(data => { dashboard.peakHoursAnalytics = data; })
      );
    }

    await Promise.all(promises);

    // Additional device and referral data if requested
    if (includeDevices || includeReferrals) {
      const additionalMatchStage = {
        targetId: new mongoose.Types.ObjectId(targetId),
        targetType
      };

      if (startDate || endDate) {
        additionalMatchStage.createdAt = {};
        if (startDate) additionalMatchStage.createdAt.$gte = new Date(startDate);
        if (endDate) additionalMatchStage.createdAt.$lte = new Date(endDate);
      }

      if (includeDevices) {
        const deviceData = await ViewLog.aggregate([
          { $match: additionalMatchStage },
          {
            $group: {
              _id: '$deviceInfo.type',
              count: { $sum: 1 },
              uniqueUsers: { $addToSet: '$viewerId' }
            }
          },
          {
            $project: {
              _id: 1,
              count: 1,
              uniqueUsers: { $size: '$uniqueUsers' }
            }
          },
          { $sort: { count: -1 } }
        ]);
        dashboard.deviceAnalytics = deviceData;
      }

      if (includeReferrals) {
        const referralData = await ViewLog.aggregate([
          { $match: additionalMatchStage },
          {
            $group: {
              _id: '$referral.source',
              count: { $sum: 1 },
              uniqueUsers: { $addToSet: '$viewerId' },
              avgEngagement: { $avg: '$metrics.engagementScore' }
            }
          },
          {
            $project: {
              _id: 1,
              count: 1,
              uniqueUsers: { $size: '$uniqueUsers' },
              avgEngagement: { $round: ['$avgEngagement', 2] }
            }
          },
          { $sort: { count: -1 } }
        ]);
        dashboard.referralAnalytics = referralData;
      }
    }

    res.status(200).json({
      success: true,
      data: dashboard,
      filters: {
        targetId,
        targetType,
        timeframe,
        groupBy,
        startDate,
        endDate
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get real-time analytics
 * @route   GET /api/analytics/real-time
 * @access  Private
 */
exports.getRealTimeAnalytics = async (req, res, next) => {
  try {
    const { error, value } = validateRealTimeAnalytics(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const {
      targetId,
      targetType,
      minutes,
      includeActiveUsers,
      includePageViews,
      includeInteractions,
      includeTopPages,
      includeTopCountries
    } = value;

    const timeThreshold = new Date(Date.now() - minutes * 60 * 1000);

    const matchStage = {
      targetId: new mongoose.Types.ObjectId(targetId),
      targetType,
      createdAt: { $gte: timeThreshold }
    };

    const promises = [];
    const realTimeData = {};

    // Active users
    if (includeActiveUsers) {
      promises.push(
        ViewLog.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: null,
              activeUsers: { $addToSet: '$viewerId' },
              activeSessions: { $addToSet: '$sessionId' }
            }
          },
          {
            $project: {
              activeUsers: { $size: '$activeUsers' },
              activeSessions: { $size: '$activeSessions' }
            }
          }
        ]).then(data => {
          realTimeData.activeUsers = data[0] || { activeUsers: 0, activeSessions: 0 };
        })
      );
    }

    // Page views
    if (includePageViews) {
      promises.push(
        ViewLog.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m-%d %H:%M',
                  date: '$createdAt'
                }
              },
              views: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ]).then(data => {
          realTimeData.pageViews = data;
        })
      );
    }

    // Interactions
    if (includeInteractions) {
      promises.push(
        ViewLog.aggregate([
          { 
            $match: {
              ...matchStage,
              interactionType: { $ne: 'view' }
            }
          },
          {
            $group: {
              _id: '$interactionType',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } }
        ]).then(data => {
          realTimeData.interactions = data;
        })
      );
    }

    // Top countries
    if (includeTopCountries) {
      promises.push(
        ViewLog.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: '$location.country',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 5 }
        ]).then(data => {
          realTimeData.topCountries = data;
        })
      );
    }

    await Promise.all(promises);

    res.status(200).json({
      success: true,
      data: realTimeData,
      timestamp: new Date(),
      filters: {
        targetId,
        targetType,
        minutes
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export analytics data
 * @route   GET /api/analytics/export
 * @access  Private
 */
exports.exportAnalytics = async (req, res, next) => {
  try {
    const { error, value } = validateExportAnalytics(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const {
      targetId,
      targetType,
      dateRange,
      format,
      includeRawData,
      groupBy,
      metrics
    } = value;

    // Parse date range
    const { startDate, endDate } = parseDateRange(dateRange);
    console.log('=== exportAnalytics ===');
    console.log('Target ID:', targetId);
    console.log('Target Type:', targetType);
    console.log('Date Range:', dateRange);
    console.log('Parsed date range:', { startDate, endDate });
    console.log('Format:', format);
    console.log('Include Raw Data:', includeRawData);
    console.log('Group By:', groupBy);
    console.log('Metrics:', metrics);

    const exportData = {};

    // Get requested metrics
    for (const metric of metrics) {
      switch (metric) {
        case 'views':
          exportData.views = await ViewLog.getTimeFilteredAnalytics(targetId, {
            targetType,
            startDate,
            endDate,
            groupBy
          });
          break;
        case 'clicks':
          exportData.clicks = await ViewLog.getLinkAnalytics(targetId, {
            targetType,
            startDate,
            endDate
          });
          break;
        case 'engagement':
          exportData.engagement = await ViewLog.aggregate([
            {
              $match: {
                targetId: new mongoose.Types.ObjectId(targetId),
                targetType,
                createdAt: {
                  $gte: new Date(startDate),
                  $lte: new Date(endDate)
                }
              }
            },
            {
              $group: {
                _id: null,
                avgEngagementScore: { $avg: '$metrics.engagementScore' },
                avgTimeOnPage: { $avg: '$metrics.timeOnPage' },
                bounceRate: { $avg: { $cond: ['$metrics.bounceRate', 1, 0] } }
              }
            }
          ]);
          break;
        case 'locations':
          exportData.locations = await ViewLog.getLocationAnalytics(targetId, {
            targetType,
            startDate,
            endDate,
            groupBy: 'country'
          });
          break;
        case 'devices':
          exportData.devices = await ViewLog.aggregate([
            {
              $match: {
                targetId: new mongoose.Types.ObjectId(targetId),
                targetType,
                createdAt: {
                  $gte: new Date(startDate),
                  $lte: new Date(endDate)
                }
              }
            },
            {
              $group: {
                _id: '$deviceInfo.type',
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } }
          ]);
          break;
        case 'referrals':
          exportData.referrals = await ViewLog.aggregate([
            {
              $match: {
                targetId: new mongoose.Types.ObjectId(targetId),
                targetType,
                createdAt: {
                  $gte: new Date(startDate),
                  $lte: new Date(endDate)
                }
              }
            },
            {
              $group: {
                _id: '$referral.source',
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } }
          ]);
          break;
        case 'peakHours':
          exportData.peakHours = await ViewLog.getPeakHourAnalytics(targetId, {
            targetType,
            startDate,
            endDate,
            groupBy: 'hour'
          });
          break;
      }
    }

    // Include raw data if requested
    if (includeRawData) {
      exportData.rawData = await ViewLog.find({
        targetId: new mongoose.Types.ObjectId(targetId),
        targetType,
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }).select('-__v').lean();
    }

    // Format response based on requested format
    if (format === 'json') {
      res.status(200).json({
        success: true,
        data: exportData,
        exportInfo: {
          format,
          startDate,
          endDate,
          metrics,
          generatedAt: new Date()
        }
      });
    } else {
      // For CSV/XLSX, you would implement file generation here
      // This is a simplified response for now
      res.status(200).json({
        success: true,
        message: `Export in ${format} format would be generated here`,
        data: exportData
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Track click on Builder Pages or Custom Links
 * @route   POST /api/analytics/track-click
 * @access  Private
 */
exports.trackClick = async (req, res) => {
  try {
    const { targetId } = req.body;
    const userId = req.user.id;
    
    console.log('=== TRACK CLICK DEBUG ===');
    console.log('Target ID:', targetId);
    console.log('User ID:', userId);
    console.log('Request Body:', req.body);
    console.log('========================');
    
    if (!targetId) {
      return res.status(400).json({ 
        success: false, 
        message: "targetId is required" 
      });
    }
    
    // Determine if this is a Builder Page or Custom Link
    const targetData = await getCorrectTargetData(targetId);
    console.log('Target Data:', targetData);
    
    if (!targetData) {
      console.log('ERROR: Target not found for targetId:', targetId);
      return res.status(404).json({ 
        success: false, 
        message: "Content not found" 
      });
    }
    
    // Check if user already clicked this item (unique click logic)
    const existingClick = await ClickTracking.findOne({
      userId: userId,
      targetId: targetId,
      targetType: targetData.targetType
    });
    
    console.log('Existing Click Check:', existingClick ? 'Found existing click' : 'No existing click');
    
    if (existingClick) {
      console.log('Already clicked - returning existing click response');
      return res.json({ 
        success: false, 
        message: "Already clicked",
        data: { isUnique: false }
      });
    }
    
    // Create click tracking record
    const clickTracking = new ClickTracking({
      userId: userId,
      targetId: targetId,
      targetType: targetData.targetType,
      targetOwnerId: targetData.ownerId,
      targetUrl: targetData.url,
      targetTitle: targetData.title,
      targetThumbnail: targetData.thumbnail,
      longitude: req.user.longitude || 0,
      latitude: req.user.latitude || 0,
      sessionId: req.sessionID,
      userAgent: req.get('User-Agent'),
      referrer: req.get('Referer')
    });
    
    console.log('Click Tracking Record:', clickTracking);
    await clickTracking.save();
    console.log('Click saved successfully with ID:', clickTracking._id);
    
    res.json({
      success: true,
      message: "Click tracked successfully",
      data: {
        clickId: clickTracking._id,
        isUnique: true,
        targetId: targetId,
        targetType: targetData.targetType,
        targetTitle: targetData.title,
        targetUrl: targetData.url
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Track view using ClickTracking (simple approach)
 * @route   POST /api/analytics/track-view
 * @access  Private
 */
exports.trackView = async (req, res) => {
  try {
    const { targetId } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }
    
    console.log('=== TRACK VIEW DEBUG ===');
    console.log('Target ID:', targetId);
    console.log('User ID:', userId);
    console.log('========================');
    
    if (!targetId) {
      return res.status(400).json({
        success: false,
        message: "targetId is required"
      });
    }
    
    // Get correct target data (Builder Page or Custom Link)
    const targetData = await getCorrectTargetData(targetId);
    if (!targetData) {
      console.log('ERROR: Target not found for targetId:', targetId);
      return res.status(404).json({ 
        success: false, 
        message: "Content not found" 
      });
    }
    
    console.log('Target Data Found:', targetData);
    
    // Check if user already viewed this target today (prevent spam)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    
    const existingView = await ClickTracking.findOne({
      userId: userId,
      targetId: targetId,
      targetType: 'view',
      timestamp: {
        $gte: today,
        $lt: tomorrow
      }
    });
    
    if (existingView) {
      console.log('User already viewed this target today');
      return res.json({
        success: true,
        message: "Already viewed today",
        data: {
          targetId: targetId,
          alreadyViewed: true
        }
      });
    }
    
    // Create new view tracking entry
    const viewTracking = new ClickTracking({
      userId: userId,
      targetId: targetId,
      targetType: 'view', // Special type for views
      targetOwnerId: targetData.ownerId,
      targetUrl: targetData.url,
      targetTitle: targetData.title,
      targetThumbnail: targetData.thumbnail,
      longitude: req.user.longitude || 0,
      latitude: req.user.latitude || 0,
      sessionId: req.sessionID,
      userAgent: req.get('User-Agent'),
      referrer: req.get('Referer')
    });
    
    await viewTracking.save();
    
    // Increment BusinessProfile.metrics.viewCount if target is a business or builderPage
    if (targetData.targetType === 'business') {
      // Direct BusinessProfile view
      await BusinessProfile.findByIdAndUpdate(targetId, {
        $inc: { 'metrics.viewCount': 1 }
      });
    } else if (targetData.targetType === 'builderPage' && targetData.businessId) {
      // BuilderPage view - also increment linked BusinessProfile
      await BusinessProfile.findByIdAndUpdate(targetData.businessId, {
        $inc: { 'metrics.viewCount': 1 }
      });
    }
    
    console.log('View tracked successfully:', viewTracking._id);
    
    res.json({
      success: true,
      message: "View tracked successfully",
      data: {
        targetId: targetId,
        targetUrl: targetData.url,
        targetTitle: targetData.title,
        viewId: viewTracking._id
      }
    });
  } catch (error) {
    console.error('Error tracking view:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update user location
 * @route   POST /api/analytics/update-location
 * @access  Private
 */
exports.updateUserLocation = async (req, res) => {
  try {
    const { longitude, latitude, city, address } = req.body;
    const userId = req.user.id;
    
    console.log('=== UPDATE USER LOCATION DEBUG ===');
    console.log('User ID:', userId);
    console.log('Longitude:', longitude);
    console.log('Latitude:', latitude);
    console.log('City:', city);
    console.log('Address:', address);
    console.log('================================');
    
    // Validate required fields
    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: "Longitude and latitude are required"
      });
    }
    
    // Update user location with all provided data
    const updateData = {
      longitude: longitude,
      latitude: latitude,
      lastLocationUpdate: new Date()
    };
    
    // Add city and address if provided
    if (city) {
      updateData.city = city;
    }
    if (address) {
      updateData.address = address;
    }
    
    await User.findByIdAndUpdate(userId, updateData);
    
    console.log('Location updated successfully for user:', userId);
    
    res.json({
      success: true,
      message: "Location updated successfully",
      data: {
        longitude: longitude,
        latitude: latitude,
        city: city || null,
        address: address || null,
        lastLocationUpdate: new Date()
      }
    });
  } catch (error) {
    console.error('Error updating user location:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get user collective analytics (unified for all users)
 * @route   GET /api/analytics/user/:userId/collective
 * @access  Private
 */
exports.getUserCollectiveAnalytics = async (req, res) => {
  try {
    const { userId } = req.params;
    const { dateRange } = req.query;
    
    console.log('=== USER COLLECTIVE ANALYTICS DEBUG ===');
    console.log('User ID:', userId);
    console.log('Date Range:', dateRange);
    
    // Get user profile
    const user = await User.findById(userId);
    if (!user) {
      console.log('ERROR: User not found for ID:', userId);
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    console.log('User Found:', {
      id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email
    });
    
    // Parse date range (weekly, monthly, yearly, or specific date)
    const { startDate, endDate } = parseDateRange(dateRange);
    console.log('Start Date:', startDate);
    console.log('End Date:', endDate);
    
    // Create date filter for ClickTracking queries
    const dateFilter = {
      timestamp: {
        $gte: startDate,
        $lte: endDate
      }
    };
    console.log('Date Filter:', dateFilter);
    
    // Get collective metrics
    const collectiveMetrics = await calculateCollectiveMetrics(userId, dateFilter);
    console.log('Collective Metrics:', collectiveMetrics);
    
    // Get content breakdown
    const contentBreakdown = await calculateContentBreakdown(userId, dateFilter);
    console.log('Content Breakdown:', contentBreakdown);
    
    // Get city analytics
    const cityAnalytics = await calculateCityAnalytics(userId, dateFilter);
    console.log('City Analytics:', cityAnalytics);
    
    // Get time analytics
    const timeAnalytics = await calculateTimeAnalytics(userId, dateFilter);
    console.log('Time Analytics:', timeAnalytics);
    
    res.json({
      success: true,
      data: {
        userId,
        userName: `${user.firstName} ${user.lastName}`,
        dateRange: dateRange || 'current',
        startDate,
        endDate,
        collectiveMetrics,
        contentBreakdown,
        cityAnalytics,
        timeAnalytics
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// Helper function to get correct target data for Builder Pages and Custom Links
const getCorrectTargetData = async (targetId) => {
  try {
    // First, check if it's a Builder Page
    const builderPage = await BuilderPage.findById(targetId);
    if (builderPage) {
      return {
        targetType: 'builderPage',
        ownerId: builderPage.userId,
        businessId: builderPage.businessId, // Include businessId for syncing
        title: builderPage.title || 'Builder Page',
        thumbnail: builderPage.cover || builderPage.logo || '',
        url: `kunex.app/${builderPage.slug || targetId}`
      };
    }
    
    // Check if it's a BusinessProfile
    const businessProfile = await BusinessProfile.findById(targetId);
    if (businessProfile) {
      return {
        targetType: 'business',
        ownerId: businessProfile.userId,
        title: businessProfile.businessName || 'Business Profile',
        thumbnail: businessProfile.coverImage || businessProfile.logo || '',
        url: `kunex.app/${businessProfile.username || targetId}`
      };
    }
    
    // Check if it's a Custom Link widget
    const customLinkWidget = await Widget.findOne({ 
      _id: targetId, 
      type: 'custom_link' 
    });
    if (customLinkWidget) {
      const customLinkData = customLinkWidget.settings?.specific?.customLink;
      return {
        targetType: 'customLink',
        ownerId: customLinkWidget.userId,
        title: customLinkData?.title || customLinkWidget.name || 'Custom Link',
        thumbnail: customLinkData?.imageUrl || '',
        url: customLinkData?.url || ''
      };
    }
    
    // If not found, return null
    return null;
  } catch (error) {
    console.error('Error in getCorrectTargetData:', error);
    return null;
  }
};


// Helper function to get target data (title, thumbnail, URL, owner info)
const getTargetData = async (targetId, targetType) => {
  let targetData = null;
  let ownerId = null;
  let ownerType = 'unknown';
  
  switch (targetType) {
    case 'businessProfile':
      targetData = await BusinessProfile.findById(targetId);
      if (targetData) {
        ownerId = targetData.userId;
        ownerType = 'business';
        return {
          ownerId: ownerId,
          ownerType: ownerType,
          title: targetData.businessName || 'Business Profile',
          thumbnail: targetData.logo || targetData.coverImage || '',
          url: `kunex.app/${targetData.businessName?.toLowerCase().replace(/\s+/g, '-') || targetId}`
        };
      }
      break;
      
    case 'personalProfile':
      targetData = await PersonalProfile.findById(targetId);
      if (targetData) {
        ownerId = targetData.userId;
        ownerType = 'individual';
        return {
          ownerId: ownerId,
          ownerType: ownerType,
          title: `${targetData.firstName || ''} ${targetData.lastName || ''}`.trim() || 'Personal Profile',
          thumbnail: targetData.profileImage || targetData.coverImage || '',
          url: `kunex.app/${targetData.firstName?.toLowerCase() || 'profile'}-${targetId.slice(-6)}`
        };
      }
      break;
      
    case 'builderPage':
      targetData = await BuilderPage.findById(targetId);
      if (targetData) {
        ownerId = targetData.userId;
        ownerType = targetData.businessId ? 'business' : 'individual';
        return {
          ownerId: ownerId,
          ownerType: ownerType,
          title: targetData.title || targetData.name || 'Builder Page',
          thumbnail: targetData.coverImage || targetData.thumbnail || '',
          url: `kunex.app/${targetData.slug || targetData.title?.toLowerCase().replace(/\s+/g, '-') || targetId}`
        };
      }
      break;
      
    case 'widget':
      targetData = await Widget.findById(targetId);
      if (targetData) {
        ownerId = targetData.userId;
        ownerType = targetData.businessId ? 'business' : 'individual';
        return {
          ownerId: ownerId,
          ownerType: ownerType,
          title: targetData.name || targetData.title || 'Widget',
          thumbnail: targetData.thumbnail || targetData.image || '',
          url: `kunex.app/widget/${targetData.name?.toLowerCase().replace(/\s+/g, '-') || targetId}`
        };
      }
      break;
      
    case 'product':
      // For products, we need to find the widget first, then the product
      const widget = await Widget.findOne({ 'products._id': targetId });
      if (widget) {
        const product = widget.products.find(p => p._id.toString() === targetId);
        if (product) {
          ownerId = widget.userId;
          ownerType = widget.businessId ? 'business' : 'individual';
          return {
            ownerId: ownerId,
            ownerType: ownerType,
            title: product.name || 'Product',
            thumbnail: product.image || product.thumbnail || '',
            url: `kunex.app/product/${product.name?.toLowerCase().replace(/\s+/g, '-') || targetId}`
          };
        }
      }
      break;
      
    case 'promotion':
      // For promotions, we need to find the business profile
      const businessWithPromotion = await BusinessProfile.findOne({ 'promotions._id': targetId });
      if (businessWithPromotion) {
        const promotion = businessWithPromotion.promotions.find(p => p._id.toString() === targetId);
        if (promotion) {
          ownerId = businessWithPromotion.userId;
          ownerType = 'business';
          return {
            ownerId: ownerId,
            ownerType: ownerType,
            title: promotion.title || promotion.name || 'Promotion',
            thumbnail: promotion.image || promotion.thumbnail || '',
            url: `kunex.app/promotion/${promotion.title?.toLowerCase().replace(/\s+/g, '-') || targetId}`
          };
        }
      }
      break;
      
    case 'event':
      // For events, we need to find the business profile
      const businessWithEvent = await BusinessProfile.findOne({ 'events._id': targetId });
      if (businessWithEvent) {
        const event = businessWithEvent.events.find(e => e._id.toString() === targetId);
        if (event) {
          ownerId = businessWithEvent.userId;
          ownerType = 'business';
          return {
            ownerId: ownerId,
            ownerType: ownerType,
            title: event.title || event.name || 'Event',
            thumbnail: event.image || event.thumbnail || '',
            url: `kunex.app/event/${event.title?.toLowerCase().replace(/\s+/g, '-') || targetId}`
          };
        }
      }
      break;
  }
  
  // Fallback if target not found
  return {
    ownerId: null,
    ownerType: 'unknown',
    title: 'Unknown Content',
    thumbnail: '',
    url: `kunex.app/content/${targetId}`
  };
};

// Helper function to calculate collective metrics
const calculateCollectiveMetrics = async (ownerId, dateFilter) => {
  // ClickTracking uses 'timestamp' field
  const clickMatchStage = {
    targetOwnerId: new mongoose.Types.ObjectId(ownerId),
    ...dateFilter
  };
  
  console.log('=== calculateCollectiveMetrics DEBUG ===');
  console.log('Owner ID:', ownerId);
  console.log('Click Match Stage:', clickMatchStage);
  
  // Get all clicks (excluding views) for this owner in the date range
  const clicks = await ClickTracking.countDocuments({
    ...clickMatchStage,
    targetType: { $in: ['builderPage', 'customLink'] }
  });
  
  // Get all views for this owner in the date range
  const views = await ClickTracking.countDocuments({
    ...clickMatchStage,
    targetType: 'view'
  });
  
  // Get unique users who clicked
  const uniqueClickUsers = await ClickTracking.distinct('userId', {
    ...clickMatchStage,
    targetType: { $in: ['builderPage', 'customLink'] }
  });
  
  // Get unique users who viewed
  const uniqueViewUsers = await ClickTracking.distinct('userId', {
    ...clickMatchStage,
    targetType: 'view'
  });
  
  // Get favorites count for this owner's content
  const favorites = await Favorite.countDocuments({
    userId: { $exists: true }, // Only authenticated users
    $or: [
      { type: 'Page', widgetId: { $exists: true } }, // Builder pages
      { type: 'Widget', widgetId: { $exists: true } } // Custom links
    ]
  });
  
  // Calculate CTR (Click Through Rate)
  const ctr = views > 0 ? ((clicks / views) * 100).toFixed(2) : 0;
  
  console.log('Basic Counts:', { 
    clicks, 
    views, 
    uniqueClickUsers: uniqueClickUsers.length,
    uniqueViewUsers: uniqueViewUsers.length,
    favorites,
    ctr: ctr + '%'
  });
  
  // Calculate returning vs new customers
  // Get all users who clicked on this owner's content BEFORE the current date range
  const beforeDateFilter = {
    targetOwnerId: new mongoose.Types.ObjectId(ownerId),
    timestamp: {
      $lt: dateFilter.timestamp.$gte // Before the start of current period
    }
  };
  
  const previousClickUsers = await ClickTracking.distinct('userId', beforeDateFilter);
  console.log('Previous Click Users (before period):', previousClickUsers.length);
  
  // Users who clicked in this period AND also clicked before = returning customers
  const returningCustomers = uniqueClickUsers.filter(userId => 
    previousClickUsers.some(prevUserId => prevUserId.toString() === userId.toString())
  );
  
  // Users who clicked in this period but never clicked before = new customers
  const newCustomers = uniqueClickUsers.filter(userId => 
    !previousClickUsers.some(prevUserId => prevUserId.toString() === userId.toString())
  );
  
  console.log('Returning Customers:', returningCustomers.length);
  console.log('New Customers:', newCustomers.length);
  
  // Calculate actual click counts for returning vs new customers
  const returningCustomerClicks = await ClickTracking.countDocuments({
    ...clickMatchStage,
    userId: { $in: returningCustomers }
  });
  
  const newCustomerClicks = await ClickTracking.countDocuments({
    ...clickMatchStage,
    userId: { $in: newCustomers }
  });
  
  console.log('Returning Customer Clicks:', returningCustomerClicks);
  console.log('New Customer Clicks:', newCustomerClicks);
  
  // Calculate average clicks per user
  const averageClicksPerUser = uniqueClickUsers.length > 0 ? (clicks / uniqueClickUsers.length).toFixed(2) : 0;
  
  // Calculate percentages for easy understanding
  const totalUniqueUsers = uniqueClickUsers.length;
  const returningCustomerPercentage = totalUniqueUsers > 0 ? ((returningCustomers.length / totalUniqueUsers) * 100).toFixed(1) : 0;
  const newCustomerPercentage = totalUniqueUsers > 0 ? ((newCustomers.length / totalUniqueUsers) * 100).toFixed(1) : 0;
  
  console.log('Calculated Metrics:', {
    averageClicksPerUser,
    returningCustomers: returningCustomers.length,
    newCustomers: newCustomers.length,
    returningCustomerClicks,
    newCustomerClicks,
    returningCustomerPercentage: returningCustomerPercentage + '%',
    newCustomerPercentage: newCustomerPercentage + '%'
  });
  
  return {
    totalClicks: clicks,
    uniqueClicks: uniqueClickUsers.length,
    totalViews: views,
    uniqueViews: uniqueViewUsers.length,
    ctr: parseFloat(ctr),
    totalFavorites: favorites,
    averageClicksPerUser: parseFloat(averageClicksPerUser),
    customerBreakdown: {
      returningCustomerRate: returningCustomerPercentage + '%',
      newCustomerRate: newCustomerPercentage + '%',
      returningCustomers: returningCustomers.length,
      newCustomers: newCustomers.length
    }
  };
};

// Helper function to calculate content breakdown
const calculateContentBreakdown = async (ownerId, dateFilter) => {
  const matchStage = {
    targetOwnerId: new mongoose.Types.ObjectId(ownerId),
    ...dateFilter
  };
  
  const breakdown = await ClickTracking.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$targetType',
        clicks: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        targetType: '$_id',
        clicks: 1,
        uniqueClicks: { $size: '$uniqueUsers' },
        _id: 0
      }
    }
  ]);
  
  return breakdown;
};

// Helper function to calculate city analytics
const calculateCityAnalytics = async (ownerId, dateFilter) => {
  const matchStage = {
    targetOwnerId: new mongoose.Types.ObjectId(ownerId),
    ...dateFilter
  };
  
  const cityData = await ClickTracking.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          longitude: '$longitude',
          latitude: '$latitude'
        },
        clicks: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        coordinates: '$_id',
        clicks: 1,
        uniqueClicks: { $size: '$uniqueUsers' },
        _id: 0
      }
    },
    { $sort: { clicks: -1 } },
    { $limit: 10 }
  ]);
  
  // Calculate total clicks for percentage calculation
  const totalClicks = cityData.reduce((sum, city) => sum + city.clicks, 0);
  
  // Add percentage to each city
  const cityDistribution = cityData.map(city => ({
    ...city,
    percentage: totalClicks > 0 ? ((city.clicks / totalClicks) * 100).toFixed(1) : 0
  }));
  
  return {
    cityDistribution,
    totalClicks
  };
};

// Helper function to calculate time analytics
const calculateTimeAnalytics = async (ownerId, dateFilter) => {
  const matchStage = {
    targetOwnerId: new mongoose.Types.ObjectId(ownerId),
    ...dateFilter
  };
  
  const dailyData = await ClickTracking.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' }
        },
        clicks: { $sum: 1 }
      }
    },
    {
      $project: {
        date: {
          $dateFromParts: {
            year: '$_id.year',
            month: '$_id.month',
            day: '$_id.day'
          }
        },
        clicks: 1,
        _id: 0
      }
    },
    { $sort: { date: 1 } },
    { $limit: 30 }
  ]);
  
  const peakHours = await ClickTracking.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { $hour: '$timestamp' },
        clicks: { $sum: 1 }
      }
    },
    { $sort: { clicks: -1 } },
    { $limit: 24 }
  ]);
  
  return {
    daily: dailyData,
    peakHours: peakHours.map(hour => ({
      hour: `${hour._id}:00`,
      activity: hour.clicks
    }))
  };
};


// Helper function to convert coordinates to city name
const getCityName = (longitude, latitude) => {
  // For now, return coordinates as location identifier
  // In production, you would use a reverse geocoding service like:
  // - Google Maps Geocoding API
  // - OpenStreetMap Nominatim
  // - Mapbox Geocoding API
  return `Location (${longitude.toFixed(4)}, ${latitude.toFixed(4)})`;
};

// Helper function to get date filter
// Helper function to parse date range strings
const parseDateRange = (dateRange) => {
  const now = new Date();
  let startDate, endDate;
  
  if (!dateRange) {
    // Default to current date
    startDate = new Date(now);
    startDate.setUTCHours(0, 0, 0, 0);
    endDate = new Date(now);
    endDate.setUTCHours(23, 59, 59, 999);
  } else if (dateRange === 'weekly') {
    // Last 7 days
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 7);
    startDate.setUTCHours(0, 0, 0, 0);
    endDate = new Date(now);
    endDate.setUTCHours(23, 59, 59, 999);
  } else if (dateRange === 'monthly') {
    // Last 30 days
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 30);
    startDate.setUTCHours(0, 0, 0, 0);
    endDate = new Date(now);
    endDate.setUTCHours(23, 59, 59, 999);
  } else if (dateRange === 'yearly') {
    // Last 365 days
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 365);
    startDate.setUTCHours(0, 0, 0, 0);
    endDate = new Date(now);
    endDate.setUTCHours(23, 59, 59, 999);
  } else {
    // Specific date (YYYY-MM-DD format)
    const selectedDate = new Date(dateRange);
    startDate = new Date(selectedDate);
    startDate.setUTCHours(0, 0, 0, 0);
    endDate = new Date(selectedDate);
    endDate.setUTCHours(23, 59, 59, 999);
  }
  
  return { startDate, endDate };
};

const getDateFilter = (period, startDate, endDate) => {
  if (startDate && endDate) {
    return {
      timestamp: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
  }
  
  const now = new Date();
  let start = new Date();
  
  switch (period) {
    case '7d':
      start.setDate(now.getDate() - 7);
      break;
    case '30d':
      // For testing, use a wider date range to include sample data
      start.setFullYear(now.getFullYear() - 1);
      break;
    case '90d':
      start.setDate(now.getDate() - 90);
      break;
    case '1y':
      start.setFullYear(now.getFullYear() - 1);
      break;
    default:
      start.setDate(now.getDate() - 30);
  }
  
  return {
    timestamp: {
      $gte: start,
      $lte: now
    }
  };
};

/**
 * @desc    Get top performing links (based on Figma design)
 * @route   GET /api/analytics/top-performing-links
 * @access  Private
 */
exports.getTopPerformingLinks = async (req, res) => {
  try {
    const { error, value } = validateTopPerformingLinks(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { ownerId, dateRange, limit } = value;
    const userId = req.user.id;
    
    // Use current user's content if no ownerId provided
    const targetOwnerId = ownerId || userId;
    
    // Parse date range
    const { startDate, endDate } = parseDateRange(dateRange);

    // 1) Aggregate top links (keep _id = targetId for widget lookup)
    const topLinksRaw = await ClickTracking.aggregate([
      {
        $match: {
          targetOwnerId: new mongoose.Types.ObjectId(targetOwnerId),
          targetType: 'customLink',
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$targetId',
          targetUrl: { $first: '$targetUrl' },
          targetTitle: { $first: '$targetTitle' },
          targetThumbnail: { $first: '$targetThumbnail' },
          clicks: { $sum: 1 },
          uniqueClicks: { $addToSet: '$userId' }
        }
      },
      { $sort: { clicks: -1 } },
      { $limit: parseInt(limit) }
    ]);

    const widgetIdsRaw = topLinksRaw.map((r) => r._id).filter(Boolean);
    const widgetIds = widgetIdsRaw.map((id) =>
      id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(String(id))
    );

    const ownerObjectId = new mongoose.Types.ObjectId(targetOwnerId);
    const widgetsById = new Map();
    if (widgetIds.length > 0) {
      const query = {
        userId: ownerObjectId,
        type: 'custom_link',
        $or: [
          { _id: { $in: widgetIds } },
          { 'settings.specific.customLink._id': { $in: widgetIds } }
        ]
      };

      const widgets = await Widget.find(query)
        .select('_id userId pageId name type category settings.specific.customLink')
        .lean();

      for (const w of widgets) {
        widgetsById.set(w._id.toString(), w);
        const customLink = w.settings?.specific?.customLink;
        const arr = Array.isArray(customLink) ? customLink : customLink ? [customLink] : [];
        for (const link of arr) {
          if (link && link._id) widgetsById.set(link._id.toString(), w);
        }
      }
    }

    const topLinks = topLinksRaw.map((r) => {
      const tid = r._id ? r._id.toString() : null;
      const widget = tid ? widgetsById.get(tid) : null;
      const out = {
        targetUrl: r.targetUrl,
        targetTitle: r.targetTitle,
        targetThumbnail: r.targetThumbnail,
        clicks: r.clicks,
        uniqueClicks: Array.isArray(r.uniqueClicks) ? r.uniqueClicks.length : r.uniqueClicks
      };
      if (widget) {
        out._id = widget._id;
        out.userId = widget.userId;
        out.pageId = widget.pageId;
        out.name = widget.name;
        out.type = widget.type;
        out.category = widget.category;
        out.settings = widget.settings || { specific: { customLink: [] } };
      }
      return out;
    });

    res.json({
      success: true,
      data: {
        topPerformingLinks: topLinks,
        dateRange: dateRange,
        totalLinks: topLinks.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get content performance (based on Figma design)
 * @route   GET /api/analytics/content-performance/:targetId
 * @access  Private
 */
exports.getContentPerformance = async (req, res) => {
  try {
    const { targetId } = req.params;
    
    const { error, value } = validateContentPerformance(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { dateRange } = value;
    
    // Parse date range
    const { startDate, endDate } = parseDateRange(dateRange);

    // Get correct target data (Builder Page or Custom Link)
    const targetData = await getCorrectTargetData(targetId);
    if (!targetData) {
      return res.status(404).json({
        success: false,
        message: "Content not found"
      });
    }

    // Get performance data for this specific target
    const performance = await ClickTracking.aggregate([
      {
        $match: {
          targetId: new mongoose.Types.ObjectId(targetId),
          targetType: targetData.targetType,
          timestamp: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: '$targetId',
          clicks: { $sum: 1 },
          uniqueClicks: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          clicks: 1,
          uniqueClicks: { $size: '$uniqueClicks' },
          _id: 0
        }
      }
    ]);

    const result = performance[0] || { clicks: 0, uniqueClicks: 0 };
    
    res.json({
      success: true,
      data: {
        targetId: targetId,
        targetType: targetData.targetType,
        url: targetData.url,
        title: targetData.title,
        thumbnail: targetData.thumbnail,
        clicks: result.clicks,
        uniqueClicks: result.uniqueClicks,
        dateRange: dateRange
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper function to get weekly trend data
const getWeeklyTrend = async (ownerId, ownerType, dateFilter) => {
  const weeklyData = await ClickTracking.aggregate([
    { 
      $match: {
        targetOwnerId: new mongoose.Types.ObjectId(ownerId),
        targetOwnerType: ownerType,
        ...dateFilter
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$timestamp' },
          week: { $week: '$timestamp' }
        },
        clicks: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        week: '$_id.week',
        clicks: 1,
        uniqueClicks: { $size: '$uniqueUsers' },
        _id: 0
      }
    },
    { $sort: { week: 1 } },
    { $limit: 5 }
  ]);
  
  return weeklyData.map((week, index) => ({
    week: index + 1,
    clicks: week.clicks,
    uniqueClicks: week.uniqueClicks
  }));
};

/**
 * @desc    Get peak hours analytics for logged-in user (all their content)
 * @route   GET /api/analytics/peak-hours
 * @access  Private
 */
exports.getUserPeakHours = async (req, res) => {
  try {
    const { dateRange } = req.query;
    const userId = req.user.id;
    
    console.log('=== USER PEAK HOURS DEBUG ===');
    console.log('User ID:', userId);
    console.log('Date Range:', dateRange);
    
    // Parse date range
    const { startDate, endDate } = parseDateRange(dateRange);
    
    // Get all clicks for this user's content
    const clickQuery = {
      targetOwnerId: new mongoose.Types.ObjectId(userId),
      timestamp: { $gte: startDate, $lte: endDate }
    };
    
    const clicks = await ClickTracking.find(clickQuery);
    console.log('Total clicks found:', clicks.length);
    
    // Initialize 24-hour array
    const hourMap = {};
    for (let hour = 0; hour < 24; hour++) {
      hourMap[hour] = {
        _id: hour,
        totalViews: 0,
        totalInteractions: 0,
        uniqueViewers: new Set(),
        engagementRate: 0
      };
    }
    
    // Process clicks
    clicks.forEach(click => {
      const hour = new Date(click.timestamp).getUTCHours();
      hourMap[hour].totalViews++;
      hourMap[hour].totalInteractions++;
      hourMap[hour].uniqueViewers.add(click.userId.toString());
    });
    
    // Convert to array and calculate engagement rates
    const analytics = Object.values(hourMap).map(hour => ({
      ...hour,
      uniqueViewers: hour.uniqueViewers.size,
      engagementRate: hour.totalViews > 0 ? ((hour.totalInteractions / hour.totalViews) * 100).toFixed(2) : 0
    }));
    
    // Calculate insights
    const activeHours = analytics.filter(hour => hour.totalViews > 0);
    const sortedByViews = [...activeHours].sort((a, b) => b.totalViews - a.totalViews);
    
    const insights = {
      peakHour: sortedByViews[0] || null,
      quietestHour: sortedByViews[sortedByViews.length - 1] || null,
      avgViewsPerHour: analytics.length > 0 ? Math.round(
        analytics.reduce((acc, item) => acc + item.totalViews, 0) / analytics.length
      ) : 0
    };
    
    res.json({
      success: true,
      data: {
        analytics,
        insights,
        summary: {
          totalPeriods: analytics.length,
          totalViews: analytics.reduce((acc, item) => acc + item.totalViews, 0),
          totalInteractions: analytics.reduce((acc, item) => acc + item.totalInteractions, 0),
          avgEngagementRate: analytics.length > 0
            ? (analytics.reduce((acc, item) => acc + parseFloat(item.engagementRate), 0) / analytics.length).toFixed(2)
            : 0
        },
        filters: {
          userId: userId,
          dateRange: dateRange || 'current'
        }
      }
    });
  } catch (error) {
    console.error('Error in getUserPeakHours:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get location analytics for logged-in user (all their content)
 * @route   GET /api/analytics/location
 * @access  Private
 */
exports.getUserLocation = async (req, res) => {
  try {
    const { dateRange, groupBy = 'city' } = req.query;
    const userId = req.user.id;
    
    console.log('=== USER LOCATION DEBUG ===');
    console.log('User ID:', userId);
    console.log('Date Range:', dateRange);
    console.log('Group By:', groupBy);
    
    // Parse date range
    const { startDate, endDate } = parseDateRange(dateRange);
    
    // Get all clicks for this user's content
    const clickQuery = {
      targetOwnerId: new mongoose.Types.ObjectId(userId),
      timestamp: { $gte: startDate, $lte: endDate }
    };
    
    const analytics = await ClickTracking.aggregate([
      { $match: clickQuery },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userData'
        }
      },
      {
        $unwind: {
          path: '$userData',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: {
            city: {
              $cond: {
                if: { $and: [{ $ne: ['$userData.city', null] }, { $ne: ['$userData.city', ''] }] },
                then: '$userData.city',
                else: 'Unknown Location'
              }
            }
          },
          clicks: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          lastClick: { $max: '$timestamp' },
          avgLongitude: { $avg: '$longitude' },
          avgLatitude: { $avg: '$latitude' }
        }
      },
      {
        $project: {
          longitude: { $round: ['$avgLongitude', 6] },
          latitude: { $round: ['$avgLatitude', 6] },
          city: '$_id.city',
          clicks: 1,
          uniqueClicks: { $size: '$uniqueUsers' },
          lastClick: 1,
          _id: 0
        }
      },
      { $sort: { clicks: -1 } }
    ]);
    
    // Calculate percentages
    const totalClicks = analytics.reduce((sum, item) => sum + item.clicks, 0);
    analytics.forEach(item => {
      item.percentage = totalClicks > 0 ? ((item.clicks / totalClicks) * 100).toFixed(1) : '0.0';
    });
    
    res.json({
      success: true,
      data: {
        analytics,
        summary: {
          totalViews: totalClicks,
          totalUniqueViewers: analytics.reduce((sum, item) => sum + item.uniqueClicks, 0),
          totalInteractions: totalClicks,
          totalLocations: analytics.length
        },
        filters: {
          userId: userId,
          groupBy: groupBy,
          dateRange: dateRange || 'current'
        }
      }
    });
  } catch (error) {
    console.error('Error in getUserLocation:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get links analytics for logged-in user (all their custom links)
 * @route   GET /api/analytics/links
 * @access  Private
 */
exports.getUserLinks = async (req, res) => {
  try {
    const { dateRange } = req.query;
    const userId = req.user.id;
    
    console.log('=== USER LINKS DEBUG ===');
    console.log('User ID:', userId);
    console.log('Date Range:', dateRange);
    
    // Parse date range
    const { startDate, endDate } = parseDateRange(dateRange);
    
    // Get all custom link clicks for this user
    const clickQuery = {
      targetOwnerId: new mongoose.Types.ObjectId(userId),
      targetType: 'customLink',
      timestamp: { $gte: startDate, $lte: endDate }
    };
    
    const analytics = await ClickTracking.aggregate([
      { $match: clickQuery },
      {
        $group: {
          _id: '$targetId',
          targetUrl: { $first: '$targetUrl' },
          targetTitle: { $first: '$targetTitle' },
          clicks: { $sum: 1 },
          uniqueClicks: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          targetUrl: 1,
          targetTitle: 1,
          clicks: 1,
          uniqueClicks: { $size: '$uniqueClicks' },
          _id: 0
        }
      },
      { $sort: { clicks: -1 } }
    ]);
    
    // Calculate percentages
    const totalClicks = analytics.reduce((sum, item) => sum + item.clicks, 0);
    analytics.forEach(item => {
      item.percentage = totalClicks > 0 ? ((item.clicks / totalClicks) * 100).toFixed(1) : '0.0';
    });
    
    res.json({
      success: true,
      data: {
        analytics,
        summary: {
          totalLinks: analytics.length,
          totalClicks: totalClicks,
          totalUniqueClicks: analytics.reduce((sum, item) => sum + item.uniqueClicks, 0)
        },
        filters: {
          userId: userId,
          dateRange: dateRange || 'current'
        }
      }
    });
  } catch (error) {
    console.error('Error in getUserLinks:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  trackView: exports.trackView, // Updated to use ClickTracking
  getLocationAnalytics: exports.getLocationAnalytics,
  getLinkAnalytics: exports.getLinkAnalytics,
  getPeakHourAnalytics: exports.getPeakHourAnalytics,
  getTimeFilteredAnalytics: exports.getTimeFilteredAnalytics,
  getAnalyticsDashboard: exports.getAnalyticsDashboard,
  getRealTimeAnalytics: exports.getRealTimeAnalytics,
  exportAnalytics: exports.exportAnalytics,
  trackClick: exports.trackClick,
  updateUserLocation: exports.updateUserLocation,
  getUserCollectiveAnalytics: exports.getUserCollectiveAnalytics,
  getTopPerformingLinks: exports.getTopPerformingLinks,
  getContentPerformance: exports.getContentPerformance,
  // New simplified endpoints for logged-in user
  getUserPeakHours: exports.getUserPeakHours,
  getUserLocation: exports.getUserLocation,
  getUserLinks: exports.getUserLinks
}; 