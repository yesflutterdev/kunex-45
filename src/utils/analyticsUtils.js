const geoip = require('geoip-lite');
const UAParser = require('ua-parser-js');

/**
 * Extract geographic information from IP address
 * @param {string} ipAddress - IP address to lookup
 * @returns {object} Geographic information
 */
const getLocationFromIP = (ipAddress) => {
  try {
    const geo = geoip.lookup(ipAddress);
    
    if (!geo) {
      return {
        country: 'Unknown',
        countryCode: 'XX',
        region: 'Unknown',
        city: 'Unknown',
        coordinates: null,
        timezone: 'UTC',
        accuracy: 'country'
      };
    }

    return {
      country: geo.country,
      countryCode: geo.country,
      region: geo.region,
      city: geo.city,
      coordinates: {
        type: 'Point',
        coordinates: [geo.ll[1], geo.ll[0]] // [longitude, latitude]
      },
      timezone: geo.timezone,
      accuracy: geo.city ? 'city' : geo.region ? 'region' : 'country'
    };
  } catch (error) {
    console.error('Error getting location from IP:', error);
    return {
      country: 'Unknown',
      countryCode: 'XX',
      region: 'Unknown',
      city: 'Unknown',
      coordinates: null,
      timezone: 'UTC',
      accuracy: 'country'
    };
  }
};

/**
 * Parse device information from user agent
 * @param {string} userAgent - User agent string
 * @returns {object} Device information
 */
const getDeviceInfo = (userAgent) => {
  try {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    let deviceType = 'other';
    
    if (result.device.type) {
      deviceType = result.device.type;
    } else {
      // Detect based on browser/OS patterns
      const ua = userAgent.toLowerCase();
      if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
        deviceType = 'mobile';
      } else if (ua.includes('tablet') || ua.includes('ipad')) {
        deviceType = 'tablet';
      } else {
        deviceType = 'desktop';
      }
    }

    return {
      type: deviceType,
      os: result.os.name || 'Unknown',
      browser: result.browser.name || 'Unknown',
      userAgent: userAgent
    };
  } catch (error) {
    console.error('Error parsing device info:', error);
    return {
      type: 'other',
      os: 'Unknown',
      browser: 'Unknown',
      userAgent: userAgent
    };
  }
};

/**
 * Parse referral information from request
 * @param {object} req - Express request object
 * @returns {object} Referral information
 */
const parseReferralInfo = (req) => {
  const referrer = req.get('Referer') || req.get('Referrer');
  const query = req.query;
  
  // Parse UTM parameters
  const utmParams = {
    utmSource: query.utm_source,
    utmMedium: query.utm_medium,
    utmCampaign: query.utm_campaign,
    utmContent: query.utm_content,
    utmTerm: query.utm_term
  };

  // Determine source based on referrer or UTM
  let source = 'direct';
  let medium = '';
  
  if (utmParams.utmSource) {
    source = utmParams.utmSource;
    medium = utmParams.utmMedium || '';
  } else if (referrer) {
    const referrerDomain = new URL(referrer).hostname.toLowerCase();
    
    if (referrerDomain.includes('google')) {
      source = 'search';
      medium = 'organic';
    } else if (referrerDomain.includes('facebook') || referrerDomain.includes('fb.')) {
      source = 'social';
      medium = 'facebook';
    } else if (referrerDomain.includes('instagram')) {
      source = 'social';
      medium = 'instagram';
    } else if (referrerDomain.includes('twitter') || referrerDomain.includes('t.co')) {
      source = 'social';
      medium = 'twitter';
    } else if (referrerDomain.includes('linkedin')) {
      source = 'social';
      medium = 'linkedin';
    } else if (referrerDomain.includes('tiktok')) {
      source = 'social';
      medium = 'tiktok';
    } else if (referrerDomain.includes('youtube')) {
      source = 'social';
      medium = 'youtube';
    } else {
      source = 'referral';
      medium = 'website';
    }
  }

  return {
    source,
    medium,
    campaign: utmParams.utmCampaign,
    referrerUrl: referrer,
    searchQuery: query.q || query.query,
    ...utmParams
  };
};

/**
 * Calculate engagement score based on user interactions
 * @param {object} metrics - Interaction metrics
 * @returns {number} Engagement score (0-100)
 */
const calculateEngagementScore = (metrics) => {
  const {
    timeOnPage = 0,
    scrollDepth = 0,
    interactions = 0,
    bounceRate = false,
    loadTime = 0
  } = metrics;

  let score = 0;

  // Time on page score (0-30 points)
  if (timeOnPage > 180) score += 30;      // 3+ minutes
  else if (timeOnPage > 120) score += 25; // 2-3 minutes
  else if (timeOnPage > 60) score += 20;  // 1-2 minutes
  else if (timeOnPage > 30) score += 15;  // 30s-1min
  else if (timeOnPage > 15) score += 10;  // 15-30s
  else if (timeOnPage > 5) score += 5;    // 5-15s

  // Scroll depth score (0-25 points)
  if (scrollDepth >= 90) score += 25;
  else if (scrollDepth >= 75) score += 20;
  else if (scrollDepth >= 50) score += 15;
  else if (scrollDepth >= 25) score += 10;
  else if (scrollDepth >= 10) score += 5;

  // Interaction score (0-25 points)
  if (interactions >= 5) score += 25;
  else if (interactions >= 3) score += 20;
  else if (interactions >= 2) score += 15;
  else if (interactions >= 1) score += 10;

  // Bounce penalty (-10 points)
  if (bounceRate) score -= 10;

  // Performance bonus/penalty (0-10 points)
  if (loadTime <= 1000) score += 10;      // Fast load
  else if (loadTime <= 2000) score += 5;  // Good load
  else if (loadTime <= 3000) score += 0;  // Average load
  else if (loadTime <= 5000) score -= 5;  // Slow load
  else score -= 10;                       // Very slow load

  // Engagement bonus (0-10 points)
  if (timeOnPage > 300 && scrollDepth > 80 && interactions > 2) {
    score += 10; // Highly engaged user
  }

  return Math.max(0, Math.min(100, score));
};

/**
 * Generate session ID
 * @param {object} req - Express request object
 * @returns {string} Session ID
 */
const generateSessionId = (req) => {
  const components = [
    req.ip || 'unknown',
    req.get('User-Agent') || 'unknown',
    Date.now(),
    Math.random().toString(36)
  ];
  
  return Buffer.from(components.join('|')).toString('base64');
};

/**
 * Parse link information from click event
 * @param {string} url - Clicked URL
 * @param {string} text - Link text
 * @param {string} position - Link position on page
 * @returns {object} Link data
 */
const parseLinkData = (url, text = '', position = '') => {
  const linkData = {
    linkUrl: url,
    linkText: text,
    linkPosition: position,
    wasExternal: false
  };

  if (!url) return linkData;

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    
    // Check if external
    linkData.wasExternal = !domain.includes(process.env.APP_DOMAIN || 'localhost');

    // Determine link type
    if (url.includes('tel:')) {
      linkData.linkType = 'phone';
    } else if (url.includes('mailto:')) {
      linkData.linkType = 'email';
    } else if (url.includes('maps.') || url.includes('goo.gl/maps')) {
      linkData.linkType = 'address';
    } else if (domain.includes('instagram')) {
      linkData.linkType = 'social_media';
      linkData.socialPlatform = 'instagram';
    } else if (domain.includes('facebook') || domain.includes('fb.')) {
      linkData.linkType = 'social_media';
      linkData.socialPlatform = 'facebook';
    } else if (domain.includes('twitter') || domain.includes('t.co')) {
      linkData.linkType = 'social_media';
      linkData.socialPlatform = 'twitter';
    } else if (domain.includes('linkedin')) {
      linkData.linkType = 'social_media';
      linkData.socialPlatform = 'linkedin';
    } else if (domain.includes('tiktok')) {
      linkData.linkType = 'social_media';
      linkData.socialPlatform = 'tiktok';
    } else if (domain.includes('youtube')) {
      linkData.linkType = 'social_media';
      linkData.socialPlatform = 'youtube';
    } else if (url.includes('menu') || url.includes('food')) {
      linkData.linkType = 'menu';
    } else if (url.includes('book') || url.includes('reservation') || url.includes('appointment')) {
      linkData.linkType = 'booking';
    } else {
      linkData.linkType = 'website';
    }

  } catch (error) {
    linkData.linkType = 'other';
  }

  return linkData;
};

/**
 * Aggregate analytics data by time periods
 * @param {Array} data - Raw analytics data
 * @param {string} timeframe - Time grouping (hour, day, week, month)
 * @returns {object} Aggregated data
 */
const aggregateByTimeframe = (data, timeframe = 'day') => {
  const aggregated = {};
  
  data.forEach(item => {
    const date = new Date(item.createdAt);
    let key;
    
    switch (timeframe) {
      case 'hour':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}`;
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = `${weekStart.getFullYear()}-W${Math.ceil((weekStart - new Date(weekStart.getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000))}`;
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      default: // day
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    
    if (!aggregated[key]) {
      aggregated[key] = {
        period: key,
        totalViews: 0,
        uniqueViewers: new Set(),
        interactions: {},
        countries: new Set(),
        devices: new Set(),
        sources: new Set(),
        totalEngagement: 0,
        totalTimeOnPage: 0,
        bounces: 0,
        count: 0
      };
    }
    
    const bucket = aggregated[key];
    bucket.totalViews++;
    bucket.count++;
    
    if (item.viewerId) {
      bucket.uniqueViewers.add(item.viewerId.toString());
    }
    
    if (item.interactionType) {
      bucket.interactions[item.interactionType] = (bucket.interactions[item.interactionType] || 0) + 1;
    }
    
    if (item.location?.country) {
      bucket.countries.add(item.location.country);
    }
    
    if (item.deviceInfo?.type) {
      bucket.devices.add(item.deviceInfo.type);
    }
    
    if (item.referral?.source) {
      bucket.sources.add(item.referral.source);
    }
    
    if (item.metrics?.engagementScore) {
      bucket.totalEngagement += item.metrics.engagementScore;
    }
    
    if (item.metrics?.timeOnPage) {
      bucket.totalTimeOnPage += item.metrics.timeOnPage;
    }
    
    if (item.metrics?.bounceRate) {
      bucket.bounces++;
    }
  });
  
  // Convert sets to arrays and calculate averages
  return Object.values(aggregated).map(bucket => ({
    period: bucket.period,
    totalViews: bucket.totalViews,
    uniqueViewers: bucket.uniqueViewers.size,
    interactions: bucket.interactions,
    topCountries: Array.from(bucket.countries).slice(0, 5),
    deviceBreakdown: Array.from(bucket.devices),
    sourceBreakdown: Array.from(bucket.sources),
    avgEngagementScore: bucket.count > 0 ? Math.round(bucket.totalEngagement / bucket.count * 100) / 100 : 0,
    avgTimeOnPage: bucket.count > 0 ? Math.round(bucket.totalTimeOnPage / bucket.count * 10) / 10 : 0,
    bounceRate: bucket.totalViews > 0 ? Math.round(bucket.bounces / bucket.totalViews * 100) : 0
  })).sort((a, b) => a.period.localeCompare(b.period));
};

/**
 * Get real-time IP geolocation (placeholder for external service)
 * @param {string} ipAddress - IP address
 * @returns {Promise<object>} Enhanced location data
 */
const getEnhancedLocation = async (ipAddress) => {
  // This would integrate with a real-time geolocation service
  // For now, use the offline geoip-lite
  const basicLocation = getLocationFromIP(ipAddress);
  
  // In production, you might call an external service like:
  // - MaxMind GeoIP2
  // - ipapi.co
  // - ipgeolocation.io
  
  return basicLocation;
};

/**
 * Calculate peak hours from analytics data
 * @param {Array} data - Analytics data
 * @returns {object} Peak hours analysis
 */
const calculatePeakHours = (data) => {
  const hourlyData = {};
  const dailyData = {};
  
  // Initialize hour buckets
  for (let i = 0; i < 24; i++) {
    hourlyData[i] = { views: 0, interactions: 0, uniqueUsers: new Set() };
  }
  
  // Initialize day buckets (0 = Sunday, 6 = Saturday)
  for (let i = 0; i < 7; i++) {
    dailyData[i] = { views: 0, interactions: 0, uniqueUsers: new Set() };
  }
  
  data.forEach(item => {
    const hour = item.timing?.hour;
    const dayOfWeek = item.timing?.dayOfWeek;
    
    if (hour !== undefined && hour >= 0 && hour <= 23) {
      hourlyData[hour].views++;
      if (item.interactionType !== 'view') {
        hourlyData[hour].interactions++;
      }
      if (item.viewerId) {
        hourlyData[hour].uniqueUsers.add(item.viewerId.toString());
      }
    }
    
    if (dayOfWeek !== undefined && dayOfWeek >= 0 && dayOfWeek <= 6) {
      dailyData[dayOfWeek].views++;
      if (item.interactionType !== 'view') {
        dailyData[dayOfWeek].interactions++;
      }
      if (item.viewerId) {
        dailyData[dayOfWeek].uniqueUsers.add(item.viewerId.toString());
      }
    }
  });
  
  // Convert to arrays and add metadata
  const hourlyResults = Object.entries(hourlyData).map(([hour, data]) => ({
    hour: parseInt(hour),
    hourLabel: `${hour.padStart(2, '0')}:00`,
    views: data.views,
    interactions: data.interactions,
    uniqueUsers: data.uniqueUsers.size,
    engagementRate: data.views > 0 ? Math.round(data.interactions / data.views * 100) : 0
  }));
  
  const dailyResults = Object.entries(dailyData).map(([day, data]) => ({
    dayOfWeek: parseInt(day),
    dayLabel: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day],
    views: data.views,
    interactions: data.interactions,
    uniqueUsers: data.uniqueUsers.size,
    engagementRate: data.views > 0 ? Math.round(data.interactions / data.views * 100) : 0
  }));
  
  // Find peak hours and days
  const peakHour = hourlyResults.reduce((peak, current) => 
    current.views > peak.views ? current : peak, hourlyResults[0]);
    
  const peakDay = dailyResults.reduce((peak, current) => 
    current.views > peak.views ? current : peak, dailyResults[0]);
  
  return {
    hourly: hourlyResults,
    daily: dailyResults,
    peaks: {
      hour: peakHour,
      day: peakDay
    }
  };
};

module.exports = {
  getLocationFromIP,
  getDeviceInfo,
  parseReferralInfo,
  calculateEngagementScore,
  generateSessionId,
  parseLinkData,
  aggregateByTimeframe,
  getEnhancedLocation,
  calculatePeakHours
}; 