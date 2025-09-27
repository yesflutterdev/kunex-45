const mongoose = require('mongoose');
const ViewLog = require('../models/viewLog.model');
const BusinessProfile = require('../models/businessProfile.model');
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
  validateFunnelAnalytics
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

    const { targetId, targetType, startDate, endDate, groupBy, limit } = value;

    const analytics = await ViewLog.getLocationAnalytics(targetId, {
      targetType,
      startDate,
      endDate,
      groupBy,
      limit
    });

    // Calculate totals
    const totals = analytics.reduce((acc, item) => ({
      totalViews: acc.totalViews + item.totalViews,
      totalUniqueViewers: acc.totalUniqueViewers + item.uniqueViewers,
      totalInteractions: acc.totalInteractions + item.totalInteractions
    }), { totalViews: 0, totalUniqueViewers: 0, totalInteractions: 0 });

    res.status(200).json({
      success: true,
      data: {
        analytics,
        summary: {
          ...totals,
          totalLocations: analytics.length,
          avgEngagementRate: analytics.length > 0 
            ? Math.round(analytics.reduce((acc, item) => acc + item.engagementRate, 0) / analytics.length)
            : 0
        },
        filters: {
          targetId,
          targetType,
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

    const { targetId, targetType, startDate, endDate, linkType, groupBy, limit } = value;

    const analytics = await ViewLog.getLinkAnalytics(targetId, {
      targetType,
      startDate,
      endDate,
      linkType,
      groupBy,
      limit
    });

    // Calculate totals
    const totals = analytics.reduce((acc, item) => ({
      totalClicks: acc.totalClicks + item.totalClicks,
      totalUniqueClickers: acc.totalUniqueClickers + item.uniqueClickers
    }), { totalClicks: 0, totalUniqueClickers: 0 });

    // Get top performing links
    const topLinks = analytics
      .sort((a, b) => b.totalClicks - a.totalClicks)
      .slice(0, 10);

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

    const { targetId, targetType, startDate, endDate, groupBy, timezone } = value;

    const analytics = await ViewLog.getPeakHourAnalytics(targetId, {
      targetType,
      startDate,
      endDate,
      groupBy,
      timezone
    });

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
      const sortedByViews = [...analytics].sort((a, b) => b.totalViews - a.totalViews);
      insights.peakHour = sortedByViews[0];
      insights.quietestHour = sortedByViews[sortedByViews.length - 1];
      insights.avgViewsPerHour = Math.round(
        analytics.reduce((acc, item) => acc + item.totalViews, 0) / analytics.length
      );
    }

    if (groupBy === 'dayOfWeek' || groupBy === 'hourOfWeek') {
      const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dailyData = groupBy === 'dayOfWeek' ? analytics : 
        analytics.reduce((acc, item) => {
          const dayKey = typeof item._id === 'object' ? item._id.dayOfWeek : item._id;
          if (!acc[dayKey]) acc[dayKey] = { _id: dayKey, totalViews: 0 };
          acc[dayKey].totalViews += item.totalViews;
          return acc;
        }, {});

      const dailyArray = Object.values(dailyData);
      const sortedDaily = dailyArray.sort((a, b) => b.totalViews - a.totalViews);
      
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
          dailyArray.reduce((acc, item) => acc + item.totalViews, 0) / dailyArray.length
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

    const { targetId, targetType, timeframe, startDate, endDate, groupBy } = value;

    const analytics = await ViewLog.getTimeFilteredAnalytics(targetId, {
      targetType,
      timeframe,
      startDate,
      endDate,
      groupBy
    });

    // Calculate trends
    const trends = {
      viewsTrend: 0,
      engagementTrend: 0,
      bounceRateTrend: 0
    };

    if (analytics.length >= 2) {
      const recent = analytics.slice(-7); // Last 7 periods
      const previous = analytics.slice(-14, -7); // Previous 7 periods

      if (previous.length > 0 && recent.length > 0) {
        const recentAvg = recent.reduce((acc, item) => acc + item.totalViews, 0) / recent.length;
        const previousAvg = previous.reduce((acc, item) => acc + item.totalViews, 0) / previous.length;
        trends.viewsTrend = previousAvg > 0 ? Math.round(((recentAvg - previousAvg) / previousAvg) * 100) : 0;

        const recentEngagement = recent.reduce((acc, item) => acc + item.avgEngagementScore, 0) / recent.length;
        const previousEngagement = previous.reduce((acc, item) => acc + item.avgEngagementScore, 0) / previous.length;
        trends.engagementTrend = previousEngagement > 0 
          ? Math.round(((recentEngagement - previousEngagement) / previousEngagement) * 100) : 0;

        const recentBounce = recent.reduce((acc, item) => acc + item.bounceRate, 0) / recent.length;
        const previousBounce = previous.reduce((acc, item) => acc + item.bounceRate, 0) / previous.length;
        trends.bounceRateTrend = previousBounce > 0 
          ? Math.round(((recentBounce - previousBounce) / previousBounce) * 100) : 0;
      }
    }

    // Calculate period comparison
    const summary = {
      totalViews: analytics.reduce((acc, item) => acc + item.totalViews, 0),
      totalUniqueViewers: analytics.reduce((acc, item) => acc + item.uniqueViewers, 0),
      avgEngagementScore: analytics.length > 0
        ? Math.round(analytics.reduce((acc, item) => acc + item.avgEngagementScore, 0) / analytics.length * 100) / 100
        : 0,
      avgTimeOnPage: analytics.length > 0
        ? Math.round(analytics.reduce((acc, item) => acc + item.avgTimeOnPage, 0) / analytics.length * 10) / 10
        : 0,
      avgBounceRate: analytics.length > 0
        ? Math.round(analytics.reduce((acc, item) => acc + item.bounceRate, 0) / analytics.length)
        : 0,
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
      timeframe,
      startDate,
      endDate,
      includeLocation,
      includeDevices,
      includeReferrals,
      includePeakHours,
      includeLinks,
      groupBy
    } = value;

    const promises = [];
    const dashboard = {};

    // Base time-filtered analytics
    promises.push(
      ViewLog.getTimeFilteredAnalytics(targetId, {
        targetType,
        timeframe,
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
      startDate,
      endDate,
      format,
      includeRawData,
      groupBy,
      metrics
    } = value;

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

module.exports = {
  trackView: exports.trackView,
  getLocationAnalytics: exports.getLocationAnalytics,
  getLinkAnalytics: exports.getLinkAnalytics,
  getPeakHourAnalytics: exports.getPeakHourAnalytics,
  getTimeFilteredAnalytics: exports.getTimeFilteredAnalytics,
  getAnalyticsDashboard: exports.getAnalyticsDashboard,
  getRealTimeAnalytics: exports.getRealTimeAnalytics,
  exportAnalytics: exports.exportAnalytics
}; 