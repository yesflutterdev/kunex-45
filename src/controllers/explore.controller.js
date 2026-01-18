const mongoose = require('mongoose');
const BusinessProfile = require('../models/businessProfile.model');
const User = require('../models/user.model');
const UserSearch = require('../models/userSearch.model');
const Favorite = require('../models/favorite.model');
const ClickTracking = require('../models/clickTracking.model');
const BuilderPage = require('../models/builderPage.model');
const Widget = require('../models/widget.model');
const {
  validateExploreBusinesses,
  validateNearbyBusinesses,
  validateTopPicks,
  validateOnTheRise,
  validateRecents,
  validateRecentSearches,
  validateNewlyAdded
} = require('../utils/exploreValidation');
const {
  calculateDistancesWithGoogleMaps,
  calculateDistanceWithGoogleMaps,
  calculateHaversineDistance
} = require('../utils/googleMaps');

// Get nearby businesses with geo-queries (KON-31) - Most popular pages in user's city/area
exports.getNearbyBusinesses = async (req, res, next) => {
  try {
    const { error, value } = validateNearbyBusinesses(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const userId = req.user.id;
    const {
      longitude: queryLongitude,
      latitude: queryLatitude,
      maxDistance = 25000, // 25km default for nearby
      limit = 15,
      category,
      rating,
      priceRange,
      openedStatus,
      businessType,
      features
    } = value;

    // Get user's location from profile if not provided in query
    let longitude = queryLongitude;
    let latitude = queryLatitude;

    if (!longitude || !latitude) {
      const user = await User.findById(userId).select('longitude latitude city').lean();
      if (user && user.longitude && user.latitude && (user.longitude !== 0 || user.latitude !== 0)) {
        longitude = user.longitude;
        latitude = user.latitude;
        console.log(`[Nearby] Using user's saved location: ${latitude}, ${longitude}`);
      } else {
        console.log(`[Nearby] No location provided, returning all businesses sorted by popularity`);
      }
    }

    const query = {};

    query.$nor = [
      {
        'location.coordinates.coordinates.0': 0,
        'location.coordinates.coordinates.1': 0
      }
    ];
    if (longitude && latitude && (longitude !== 0 || latitude !== 0)) {
      query['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: maxDistance
        }
      };
    }

    // Apply filters - use industryId (ObjectId) matching
    if (category) {
      const industryIds = await getIndustryIdsFromCategory(category);
      if (industryIds.length > 0) {
        query.industryId = { $in: industryIds };
      } else {
        // Fallback to string matching if no Industry found (backward compatibility)
        query.$or = [
          { industry: new RegExp(category, 'i') },
          { subIndustry: new RegExp(category, 'i') },
          { industryTags: new RegExp(category, 'i') }
        ];
      }
    }

    if (rating) {
      query['metrics.ratingAverage'] = { $gte: rating };
    }

    if (priceRange) {
      if (Array.isArray(priceRange)) {
        query.priceRange = { $in: priceRange };
      } else {
        query.priceRange = priceRange;
      }
    }

    if (businessType) {
      query.businessType = businessType;
    }

    if (features && features.length > 0) {
      // For array fields, use RegExp directly (MongoDB supports this)
      if (features.length === 1) {
        query.features = new RegExp(features[0], 'i');
      } else {
        // For multiple features, use $or
        query.$or = query.$or || [];
        features.forEach(f => {
          query.$or.push({ features: new RegExp(f, 'i') });
        });
      }
    }

    if (openedStatus === 'open') {
      const now = new Date();
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
      const currentTime = now.toTimeString().slice(0, 5);

      query.businessHours = {
        $elemMatch: {
          day: currentDay,
          isClosed: false,
          $and: [
            { open: { $ne: "" } },
            { close: { $ne: "" } },
            { open: { $lte: currentTime } },
            { close: { $gte: currentTime } }
          ]
        }
      };
    }

    const businesses = await BusinessProfile.find(query)
      .populate('userId', 'firstName lastName')
      .select('-__v')
      .sort({
        'metrics.viewCount': -1,
        'metrics.favoriteCount': -1,
        'metrics.ratingAverage': -1,
        'metrics.ratingCount': -1
      })
      .limit(limit * 2)
      .lean();

    let finalBusinesses = businesses;
    if (businesses.length === 0 && longitude && latitude && (longitude !== 0 || latitude !== 0)) {
      console.log('[Nearby] No results with geo-query, trying without location filter');
      const fallbackQuery = { ...query };
      delete fallbackQuery['location.coordinates'];
      
      finalBusinesses = await BusinessProfile.find(fallbackQuery)
        .populate('userId', 'firstName lastName')
        .select('-__v')
        .sort({
          'metrics.viewCount': -1,
          'metrics.favoriteCount': -1,
          'metrics.ratingAverage': -1,
          'metrics.ratingCount': -1
        })
        .limit(limit)
        .lean();
    }

    const topBusinesses = finalBusinesses.slice(0, limit);

    // Filter businesses with complete profiles
    const completeBusinesses = [];
    for (const business of topBusinesses) {
      if (await hasCompleteProfile(business)) {
        completeBusinesses.push(business);
      }
    }

    // Limit to requested limit after filtering
    const filteredBusinesses = completeBusinesses.slice(0, limit);

    let distances = [];
    if (longitude && latitude && (longitude !== 0 || latitude !== 0)) {
      const businessLocations = filteredBusinesses
        .filter(business => business.location?.coordinates?.coordinates)
        .map(business => ({
          lat: business.location.coordinates.coordinates[1],
          lng: business.location.coordinates.coordinates[0]
        }));

      if (businessLocations.length > 0) {
        distances = await calculateDistancesWithGoogleMaps(latitude, longitude, businessLocations);
      }
    }

    let distanceIndex = 0;
    const businessesWithDetails = filteredBusinesses.map(business => {
      let distance = null;
      if (longitude && latitude && (longitude !== 0 || latitude !== 0) && business.location?.coordinates?.coordinates) {
        if (distances?.length > distanceIndex) {
          distance = Math.round(distances[distanceIndex] * 100) / 100;
        } else {
          distance = Math.round(calculateHaversineDistance(
            latitude,
            longitude,
            business.location.coordinates.coordinates[1],
            business.location.coordinates.coordinates[0]
          ) * 100) / 100;
        }
        distanceIndex++;
      }

      return {
        ...business,
        distance,
        isCurrentlyOpen: checkIfCurrentlyOpen(business.businessHours),
        distanceUnit: distance !== null ? 'km' : null
      };
    });

    res.status(200).json({
      success: true,
      data: {
        businesses: businessesWithDetails,
        searchCenter: longitude && latitude ? { latitude, longitude } : null,
        totalFound: businessesWithDetails.length,
        sortedBy: 'nearby'
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get top picks businesses (KON-32) - Personalized based on user preferences
exports.getTopPicks = async (req, res, next) => {
  try {
    const { error, value } = validateTopPicks(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const userId = req.user.id;
    const {
      longitude,
      latitude,
      maxDistance = 25000, // 25km for top picks
      limit = 15,
      category,
      priceRange,
      openedStatus
    } = value;

    // Get user preferences for personalization
    const [userSearches, userBusinessProfile, userFavorites] = await Promise.all([
      // Get user's recent searches to extract categories/industries
      UserSearch.find({ userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('category searchTerm')
        .lean(),
      // Get user's own business profile to get their industryIds
      BusinessProfile.findOne({ userId })
        .select('industryId subIndustryId industry subIndustry industryTags')
        .lean(),
      // Get user's favorites to extract liked industries/pages
      Favorite.find({ userId, type: { $in: ['Page', 'BusinessProfile'] } })
        .limit(50)
        .select('widgetId type')
        .lean()
    ]);

    // Extract preferred industryIds (ObjectIds) - this is the industry-standard approach
    const preferredIndustryIds = new Set();
    const preferredSubIndustryIds = new Set();

    // From user's own business profile - use industryId (ObjectId)
    if (userBusinessProfile) {
      if (userBusinessProfile.industryId) {
        preferredIndustryIds.add(userBusinessProfile.industryId.toString());
      }
      if (userBusinessProfile.subIndustryId) {
        preferredSubIndustryIds.add(userBusinessProfile.subIndustryId);
      }
    }

    // From user's favorites - fetch business profiles and get their industryIds
    const favoriteBusinessIds = userFavorites
      .filter(f => f.type === 'Page' || f.type === 'BusinessProfile')
      .map(f => f.widgetId);
    
    if (favoriteBusinessIds.length > 0) {
      const favoriteBusinesses = await BusinessProfile.find({
        _id: { $in: favoriteBusinessIds }
      })
        .select('industryId subIndustryId')
        .lean();

      favoriteBusinesses.forEach(business => {
        if (business.industryId) {
          preferredIndustryIds.add(business.industryId.toString());
        }
        if (business.subIndustryId) {
          preferredSubIndustryIds.add(business.subIndustryId);
        }
      });
    }

    // Build query for top picks
    const query = {};

    // Geo-query if coordinates provided
    if (longitude && latitude) {
      query['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: maxDistance
        }
      };
    }

    // Category or industry filter
    if (category) {
      const Industry = require('../models/industry.model');
      const industries = await Industry.find({
        title: { $regex: category, $options: 'i' },
        isActive: true
      }).select('_id').lean();
      
      if (industries.length > 0) {
        query.industryId = { $in: industries.map(ind => ind._id) };
      }
    } else if (preferredIndustryIds.size > 0 || preferredSubIndustryIds.size > 0) {
      const orConditions = [];
      
      if (preferredIndustryIds.size > 0) {
        const industryIds = Array.from(preferredIndustryIds).map(id => new mongoose.Types.ObjectId(id));
        orConditions.push({ industryId: { $in: industryIds } });
      }
      
      if (preferredSubIndustryIds.size > 0) {
        orConditions.push({ subIndustryId: { $in: Array.from(preferredSubIndustryIds) } });
      }
      
      if (orConditions.length > 0) {
        query.$or = orConditions;
      }
    }

    // Price range filter
    if (priceRange) {
      query.priceRange = Array.isArray(priceRange) ? { $in: priceRange } : priceRange;
    }

    // Open now filter
    if (openedStatus === 'open') {
      const now = new Date();
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
      const currentTime = now.toTimeString().slice(0, 5);

      const openNowQuery = {
        businessHours: {
          $elemMatch: {
            day: currentDay,
            isClosed: false,
            $and: [
              { open: { $ne: "" } },
              { close: { $ne: "" } },
              { open: { $lte: currentTime } },
              { close: { $gte: currentTime } }
            ]
          }
        }
      };

      if (query.$or) {
        query.$and = [{ $or: query.$or }, openNowQuery];
        delete query.$or;
      } else {
        Object.assign(query, openNowQuery);
      }
    }

    // Execute query
    const businesses = await BusinessProfile.find(query)
      .populate('userId', 'firstName lastName')
      .select('-__v')
      .sort({
        'metrics.ratingAverage': -1,
        'metrics.viewCount': -1,
        'metrics.favoriteCount': -1,
        'updatedAt': -1
      })
      .limit(limit * 3)
      .lean();

    // Rank by personalization score
    const businessesWithScores = businesses.map(business => {
      let personalizationScore = 0;
      
      if (business.industryId && preferredIndustryIds.has(business.industryId.toString())) {
        personalizationScore += 3;
      }
      
      if (business.subIndustryId && preferredSubIndustryIds.has(business.subIndustryId)) {
        personalizationScore += 2;
      }

      return {
        business,
        personalizationScore,
        topPickScore: calculateTopPickScore(business)
      };
    });

    // Sort and take top results
    businessesWithScores.sort((a, b) => {
      if (b.personalizationScore !== a.personalizationScore) {
        return b.personalizationScore - a.personalizationScore;
      }
      return b.topPickScore - a.topPickScore;
    });

    const topBusinesses = businessesWithScores.slice(0, limit).map(item => item.business);

    // Filter for complete profiles only
    const completeBusinesses = [];
    for (const business of topBusinesses) {
      if (await hasCompleteProfile(business)) {
        completeBusinesses.push(business);
      }
    }
    
    // Limit to requested amount
    const finalBusinesses = completeBusinesses.slice(0, limit);

    // Add distance and additional details
    const businessesWithDetails = finalBusinesses.map(business => {
      let distance = null;
      if (longitude && latitude && business.location?.coordinates?.coordinates) {
        distance = calculateDistance(
          latitude,
          longitude,
          business.location.coordinates.coordinates[1],
          business.location.coordinates.coordinates[0]
        );
        distance = Math.round(distance * 100) / 100;
      }

      const isCurrentlyOpen = checkIfCurrentlyOpen(business.businessHours);

      return {
        ...business,
        distance,
        isCurrentlyOpen,
        distanceUnit: distance !== null ? 'km' : null,
        topPickScore: calculateTopPickScore(business)
      };
    });

    res.status(200).json({
      success: true,
      data: {
        businesses: businessesWithDetails,
        searchCenter: longitude && latitude ? { latitude, longitude } : null,
        totalFound: businessesWithDetails.length,
        sortedBy: 'topPicks'
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get "On The Rise" businesses (KON-32)
exports.getOnTheRise = async (req, res, next) => {
  try {
    const { error, value } = validateOnTheRise(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const {
      longitude,
      latitude,
      maxDistance = 25000, // 25km for on the rise
      limit = 15,
      category,
      priceRange,
      openedStatus
    } = value;

    // Build query for "On The Rise" - businesses with most traction (most viewed, fastest-growing engagement)
    const query = {};

    // Add geo-query if coordinates provided
    if (longitude && latitude) {
      query['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: maxDistance
        }
      };
    }

    // Apply filters - use industryId (ObjectId) matching
    if (category) {
      const industryIds = await getIndustryIdsFromCategory(category);
      if (industryIds.length > 0) {
        query.industryId = { $in: industryIds };
      } else {
        // Fallback to string matching if no Industry found (backward compatibility)
        query.$or = [
          { industry: new RegExp(category, 'i') },
          { subIndustry: new RegExp(category, 'i') },
          { industryTags: new RegExp(category, 'i') }
        ];
      }
    }

    if (priceRange) {
      if (Array.isArray(priceRange)) {
        query.priceRange = { $in: priceRange };
      } else {
        query.priceRange = priceRange;
      }
    }

    // Apply "open now" filter
    if (openedStatus === 'open') {
      const now = new Date();
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
      const currentTime = now.toTimeString().slice(0, 5);

      const openNowQuery = {
        businessHours: {
          $elemMatch: {
            day: currentDay,
            isClosed: false,
            $and: [
              { open: { $ne: "" } },
              { close: { $ne: "" } },
              { open: { $lte: currentTime } },
              { close: { $gte: currentTime } }
            ]
          }
        }
      };

      // Combine with existing query using $and
      if (query.$and) {
        query.$and.push(openNowQuery);
      } else if (query.$or) {
        query.$and = [
          { $or: query.$or },
          openNowQuery
        ];
        delete query.$or;
      } else {
        Object.assign(query, openNowQuery);
      }
    }

    // Minimum engagement threshold - require at least some engagement (views, favorites, or ratings)
    // This ensures we only show businesses with actual traction
    const engagementThreshold = {
      $or: [
        { 'metrics.viewCount': { $gte: 1 } },      // At least 1 view
        { 'metrics.favoriteCount': { $gte: 1 } },  // At least 1 favorite
        { 'metrics.ratingCount': { $gte: 1 } }     // At least 1 rating
      ]
    };

    // Combine engagement threshold with existing query
    // If there's already a $or (from category filter), use $and to combine
    if (query.$or) {
      // Move existing $or to $and, then add engagement threshold
      query.$and = [
        { $or: query.$or },
        engagementThreshold
      ];
      delete query.$or;
    } else if (Object.keys(query).length > 0) {
      // Other filters exist, add engagement threshold with $and
      query.$and = query.$and || [];
      query.$and.push(engagementThreshold);
    } else {
      // No other filters, just use engagement threshold
      Object.assign(query, engagementThreshold);
    }

    // Execute query - get more results to calculate engagement scores
    const businesses = await BusinessProfile.find(query)
      .populate('userId', 'firstName lastName')
      .select('-__v')
      .sort({
        'metrics.viewCount': -1,  // Most viewed first
        'metrics.favoriteCount': -1,  // Fastest-growing engagement (favorites)
        'metrics.ratingAverage': -1  // High engagement (ratings)
      })
      .limit(limit * 2) // Get more to calculate and rank by engagement score
      .lean();

    // Calculate engagement score for each business and sort by it
    const businessesWithScores = businesses.map(business => {
      const engagementScore = calculateEngagementScore(business);
      return {
        business,
        engagementScore
      };
    });

    // Sort by engagement score (most traction, fastest-growing)
    businessesWithScores.sort((a, b) => b.engagementScore - a.engagementScore);

    // Take top results
    const topBusinesses = businessesWithScores.slice(0, limit).map(item => item.business);

    // Filter businesses with complete profiles
    const completeBusinesses = [];
    for (const business of topBusinesses) {
      if (await hasCompleteProfile(business)) {
        completeBusinesses.push(business);
      }
    }

    // Add distance and additional info
    const businessesWithDetails = completeBusinesses.map(business => {
      let distance = null;
      if (longitude && latitude && business.location?.coordinates?.coordinates) {
        distance = calculateDistance(
          latitude,
          longitude,
          business.location.coordinates.coordinates[1],
          business.location.coordinates.coordinates[0]
        );
        distance = Math.round(distance * 100) / 100;
      }

      const isCurrentlyOpen = checkIfCurrentlyOpen(business.businessHours);
      const engagementScore = calculateEngagementScore(business);

      return {
        ...business,
        distance,
        isCurrentlyOpen,
        distanceUnit: distance !== null ? 'km' : null,
        engagementScore
      };
    });

    res.status(200).json({
      success: true,
      data: {
        businesses: businessesWithDetails,
        searchCenter: longitude && latitude ? { latitude, longitude } : null,
        totalFound: businessesWithDetails.length,
        sortedBy: 'onTheRise'
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get newly added businesses (sorted by creation date)
exports.getNewlyAdded = async (req, res, next) => {
  try {
    const { error, value } = validateNewlyAdded(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const {
      longitude,
      latitude,
      maxDistance = 25000,
      limit = 15,
      category,
      priceRange
    } = value;

    // Build query for newly added businesses
    const query = {};

    // Apply filters - use industryId (ObjectId) matching
    if (category) {
      const industryIds = await getIndustryIdsFromCategory(category);
      if (industryIds.length > 0) {
        query.industryId = { $in: industryIds };
      } else {
        // Fallback to string matching if no Industry found (backward compatibility)
        query.$or = [
          { industry: new RegExp(category, 'i') },
          { subIndustry: new RegExp(category, 'i') },
          { industryTags: new RegExp(category, 'i') }
        ];
      }
    }

    if (priceRange) {
      if (Array.isArray(priceRange)) {
        query.priceRange = { $in: priceRange };
      } else {
        query.priceRange = priceRange;
      }
    }

    // Add geo-query if coordinates provided
    if (longitude && latitude) {
      query['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: maxDistance
        }
      };
    }

    // Get businesses sorted by creation date (newest first)
    const businesses = await BusinessProfile.find(query)
      .populate('userId', 'firstName lastName')
      .select('-__v')
      .sort({ createdAt: -1 }) // Sort by creation date, newest first
      .limit(limit * 2) // Get more to handle filters
      .lean();

    if (businesses.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          businesses: [],
          searchCenter: longitude && latitude ? { latitude, longitude } : null,
          totalFound: 0,
          sortedBy: 'newlyAdded'
        },
      });
    }

    const topBusinesses = businesses.slice(0, limit);

    // Filter businesses with complete profiles
    const completeBusinesses = [];
    for (const business of topBusinesses) {
      if (await hasCompleteProfile(business)) {
        completeBusinesses.push(business);
      }
    }

    // Calculate distances if coordinates provided
    let distances = [];
    if (longitude && latitude) {
      const businessLocations = completeBusinesses
        .filter(business => business.location?.coordinates?.coordinates)
        .map(business => ({
          lat: business.location.coordinates.coordinates[1],
          lng: business.location.coordinates.coordinates[0]
        }));

      if (businessLocations.length > 0) {
        distances = await calculateDistancesWithGoogleMaps(latitude, longitude, businessLocations);
      }
    }

    let distanceIndex = 0;
    const businessesWithDetails = completeBusinesses.map(business => {
      let distance = null;
      if (longitude && latitude && business.location?.coordinates?.coordinates) {
        if (distances?.length > distanceIndex) {
          distance = Math.round(distances[distanceIndex] * 100) / 100;
        } else {
          distance = Math.round(calculateHaversineDistance(
            latitude,
            longitude,
            business.location.coordinates.coordinates[1],
            business.location.coordinates.coordinates[0]
          ) * 100) / 100;
        }
        distanceIndex++;
      }

      return {
        ...business,
        distance,
        isCurrentlyOpen: checkIfCurrentlyOpen(business.businessHours),
        distanceUnit: distance !== null ? 'km' : null
      };
    });

    res.status(200).json({
      success: true,
      data: {
        businesses: businessesWithDetails,
        searchCenter: longitude && latitude ? { latitude, longitude } : null,
        totalFound: businessesWithDetails.length,
        sortedBy: 'newlyAdded'
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get recently viewed businesses (Recents)
exports.getRecents = async (req, res, next) => {
  try {
    const { error, value } = validateRecents(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const userId = req.user.id;
    const {
      longitude,
      latitude,
      maxDistance = 25000,
      limit = 15,
      category,
      priceRange,
      openedStatus
    } = value;

    // Get user's recent views from ClickTracking (targetType: 'view')
    // targetId in ClickTracking is BuilderPage ID, not BusinessProfile ID
    const recentViews = await ClickTracking.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          targetType: 'view'
        }
      },
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: '$targetId', // This is BuilderPage ID
          lastViewedAt: { $first: '$timestamp' },
          viewCount: { $sum: 1 }
        }
      },
      {
        $sort: { lastViewedAt: -1 }
      },
      {
        $limit: limit * 2 // Get more to handle filters
      }
    ]);

    if (recentViews.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          businesses: [],
          searchCenter: longitude && latitude ? { latitude, longitude } : null,
          totalFound: 0,
          sortedBy: 'recents'
        },
      });
    }

    // Extract BuilderPage IDs
    const builderPageIds = recentViews.map(view => view._id);
    const viewTimeMap = new Map();
    recentViews.forEach(view => {
      viewTimeMap.set(view._id.toString(), {
        lastViewedAt: view.lastViewedAt,
        viewCount: view.viewCount
      });
    });

    // Find BusinessProfiles that have these BuilderPages
    // BusinessProfile.builderPageId references BuilderPage._id
    const query = {
      builderPageId: { $in: builderPageIds }
    };

    // Apply filters - use industryId (ObjectId) matching
    if (category) {
      const industryIds = await getIndustryIdsFromCategory(category);
      if (industryIds.length > 0) {
        query.industryId = { $in: industryIds };
      } else {
        // Fallback to string matching if no Industry found (backward compatibility)
        query.$or = [
          { industry: new RegExp(category, 'i') },
          { subIndustry: new RegExp(category, 'i') },
          { industryTags: new RegExp(category, 'i') }
        ];
      }
    }

    if (priceRange) {
      if (Array.isArray(priceRange)) {
        query.priceRange = { $in: priceRange };
      } else {
        query.priceRange = priceRange;
      }
    }

    // Apply "open now" filter
    if (openedStatus === 'open') {
      const now = new Date();
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
      const currentTime = now.toTimeString().slice(0, 5);

      query.businessHours = {
        $elemMatch: {
          day: currentDay,
          isClosed: false,
          $and: [
            { open: { $ne: "" } },
            { close: { $ne: "" } },
            { open: { $lte: currentTime } },
            { close: { $gte: currentTime } }
          ]
        }
      };
    }

    // Add geo-query if coordinates provided
    if (longitude && latitude) {
      query['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: maxDistance
        }
      };
    }

    // Get businesses
    const businesses = await BusinessProfile.find(query)
      .populate('userId', 'firstName lastName')
      .select('-__v')
      .lean();

    // Sort by most recent view time (maintain order from aggregation)
    const businessesWithViewInfo = businesses.map(business => {
      // Find the view info for this business's builderPageId
      const viewInfo = viewTimeMap.get(business.builderPageId?.toString());
      return {
        business,
        lastViewedAt: viewInfo ? viewInfo.lastViewedAt : new Date(0),
        viewCount: viewInfo ? viewInfo.viewCount : 0
      };
    });

    // Sort by last viewed time (most recent first)
    businessesWithViewInfo.sort((a, b) => {
      return new Date(b.lastViewedAt) - new Date(a.lastViewedAt);
    });

    const topBusinesses = businessesWithViewInfo.slice(0, limit).map(item => item.business);

    // Filter businesses with complete profiles
    const completeBusinesses = [];
    for (const business of topBusinesses) {
      if (await hasCompleteProfile(business)) {
        completeBusinesses.push(business);
      }
    }

    let distances = [];
    if (longitude && latitude) {
      const businessLocations = completeBusinesses
        .filter(business => business.location?.coordinates?.coordinates)
        .map(business => ({
          lat: business.location.coordinates.coordinates[1],
          lng: business.location.coordinates.coordinates[0]
        }));

      if (businessLocations.length > 0) {
        distances = await calculateDistancesWithGoogleMaps(latitude, longitude, businessLocations);
      }
    }

    let distanceIndex = 0;
    const businessesWithDetails = completeBusinesses.map(business => {
      let distance = null;
      if (longitude && latitude && business.location?.coordinates?.coordinates) {
        if (distances?.length > distanceIndex) {
          distance = Math.round(distances[distanceIndex] * 100) / 100;
        } else {
          distance = Math.round(calculateHaversineDistance(
            latitude,
            longitude,
            business.location.coordinates.coordinates[1],
            business.location.coordinates.coordinates[0]
          ) * 100) / 100;
        }
        distanceIndex++;
      }

      const viewInfo = viewTimeMap.get(business.builderPageId?.toString());

      return {
        ...business,
        distance,
        isCurrentlyOpen: checkIfCurrentlyOpen(business.businessHours),
        distanceUnit: distance !== null ? 'km' : null,
        lastViewedAt: viewInfo?.lastViewedAt || null,
        viewCount: viewInfo?.viewCount || 0
      };
    });

    res.status(200).json({
      success: true,
      data: {
        businesses: businessesWithDetails,
        searchCenter: longitude && latitude ? { latitude, longitude } : null,
        totalFound: businessesWithDetails.length,
        sortedBy: 'recents'
      },
    });
  } catch (error) {
    next(error);
  }
};

// Comprehensive explore with all filters (KON-33)
exports.exploreBusinesses = async (req, res, next) => {
  try {
    const { error, value } = validateExploreBusinesses(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const {
      longitude,
      latitude,
      maxDistance = 50000, // 50km for general explore
      limit = 20,
      page = 1,
      sortBy = 'relevance',
      category,
      rating,
      priceRange,
      openedStatus,
      businessType,
      features,
      search,
      toprated = false,
      opennow = false,
      nearby = false
    } = value;


    // Build query
    const query = {};

    // Handle special search parameters
    if (nearby && longitude && latitude) {
      // Nearby search - prioritize distance with smaller radius
      const nearbyRadius = Math.min(maxDistance, 10000);
      query['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: nearbyRadius
        }
      };
    } else if (longitude && latitude) {
      // Regular geo-query if coordinates provided
      query['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: maxDistance
        }
      };
    } else if (nearby) {
    }

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Handle toprated search
    if (toprated) {
      query['metrics.ratingAverage'] = { $gte: 4.0 }; // Minimum 4-star rating
      query['metrics.ratingCount'] = { $gte: 10 }; // At least 10 reviews
    }

    // Handle opennow search
    if (opennow) {
      const now = new Date();
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
      const currentTime = now.toTimeString().slice(0, 5);



      const businessHoursQuery = {
        $elemMatch: {
          day: currentDay,
          isClosed: false,
          // Handle empty strings - if open/close are empty, business is closed
          $and: [
            { open: { $ne: "" } },
            { close: { $ne: "" } },
            { open: { $lte: currentTime } },
            { close: { $gte: currentTime } }
          ]
        }
      };


      query.businessHours = businessHoursQuery;
    }

    // Apply filters - use industryId (ObjectId) matching
    if (category) {
      const industryIds = await getIndustryIdsFromCategory(category);
      if (industryIds.length > 0) {
        query.industryId = { $in: industryIds };
      } else {
        // Fallback to string matching if no Industry found (backward compatibility)
        query.$or = [
          { industry: new RegExp(category, 'i') },
          { subIndustry: new RegExp(category, 'i') },
          { industryTags: new RegExp(category, 'i') }
        ];
      }
    }

    if (rating) {
      console.log(`⭐ RATING FILTER: ${rating}+ stars`);
      query['metrics.ratingAverage'] = { $gte: rating };
    }

    if (priceRange) {
      if (Array.isArray(priceRange)) {
        query.priceRange = { $in: priceRange };
      } else {
        query.priceRange = priceRange;
      }
    }

    if (businessType) {
      query.businessType = businessType;
    }

    if (features && features.length > 0) {
      // For array fields, use RegExp directly (MongoDB supports this)
      if (features.length === 1) {
        query.features = new RegExp(features[0], 'i');
      } else {
        // For multiple features, use $or
        query.$or = query.$or || [];
        features.forEach(f => {
          query.$or.push({ features: new RegExp(f, 'i') });
        });
      }
    }

    // Filter by opened status
    if (openedStatus === 'open') {
      const now = new Date();
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
      const currentTime = now.toTimeString().slice(0, 5);

      query.businessHours = {
        $elemMatch: {
          day: currentDay,
          isClosed: false,
          // Handle empty strings - if open/close are empty, business is closed
          $and: [
            { open: { $ne: "" } },
            { close: { $ne: "" } },
            { open: { $lte: currentTime } },
            { close: { $gte: currentTime } }
          ]
        }
      };
    }

    // Build sort object
    const sort = {};

    switch (sortBy) {
      case 'rating':
        sort['metrics.ratingAverage'] = -1;
        sort['metrics.ratingCount'] = -1;
        break;
      case 'distance':
        // Distance sorting is handled by $near in geo-query
        break;
      case 'popularity':
        sort['metrics.viewCount'] = -1;
        sort['metrics.favoriteCount'] = -1;
        break;
      case 'newest':
        sort.createdAt = -1;
        break;
      case 'alphabetical':
        sort.businessName = 1;
        break;
      case 'relevance':
      default:
        if (search) {
          sort.score = { $meta: 'textScore' };
        } else if (toprated) {
          sort['metrics.ratingAverage'] = -1;
          sort['metrics.ratingCount'] = -1;
        } else if (nearby) {
          sort['metrics.ratingAverage'] = -1;
        } else if (opennow) {
          sort['metrics.ratingAverage'] = -1;
          sort['metrics.viewCount'] = -1;
        } else {
          sort['metrics.ratingAverage'] = -1;
          sort['metrics.viewCount'] = -1;
        }
        break;
    }

    // Calculate pagination
    // Fetch more businesses to account for filtering (fetch 3x limit to ensure we have enough after filtering)
    const fetchLimit = limit * 3;
    const skip = (page - 1) * limit;

    const businesses = await BusinessProfile.find(query)
      .populate('userId', 'firstName lastName')
      .select('-__v')
      .sort(sort)
      .limit(fetchLimit)
      .lean();

    console.log(`✅ QUERY RESULTS: Found ${businesses.length} businesses`);

    // Filter businesses with complete profiles
    const completeBusinesses = [];
    for (const business of businesses) {
      if (await hasCompleteProfile(business)) {
        completeBusinesses.push(business);
      }
    }

    // Apply pagination after filtering
    const paginatedBusinesses = completeBusinesses.slice(skip, skip + limit);
    const filteredTotalCount = completeBusinesses.length;

    // Add distance and additional info
    console.log('🔧 Enhancing business data with distance and status...');
    const businessesWithDetails = paginatedBusinesses.map((business, index) => {
      let distance = null;
      if (longitude && latitude && business.location?.coordinates?.coordinates) {
        distance = calculateDistance(
          latitude,
          longitude,
          business.location.coordinates.coordinates[1],
          business.location.coordinates.coordinates[0]
        );
        distance = Math.round(distance * 100) / 100;
      }

      const isCurrentlyOpen = checkIfCurrentlyOpen(business.businessHours);


      return {
        ...business,
        distance,
        isCurrentlyOpen,
        distanceUnit: distance !== null ? 'km' : null
      };
    });

    // Calculate pagination info (use filtered count)
    const totalPages = Math.ceil(filteredTotalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;


    res.status(200).json({
      success: true,
      data: {
        businesses: businessesWithDetails,
        pagination: {
          currentPage: page,
          totalPages,
          totalBusinesses: filteredTotalCount,
          hasNextPage,
          hasPrevPage,
          limit
        },
        searchCenter: longitude && latitude ? { latitude, longitude } : null,
        appliedFilters: {
          category,
          rating,
          priceRange,
          openedStatus,
          businessType,
          features,
          search,
          toprated,
          opennow,
          nearby
        },
        sortedBy: sortBy
      },
    });
  } catch (error) {
    next(error);
  }
};


// Get recent searches for user
exports.getRecentSearches = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    // For now, we'll return a mock response
    const recentSearches = [
      {
        id: '1',
        searchTerm: 'coffee shops',
        category: 'Food & Beverage',
        location: 'Downtown',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        resultCount: 15
      },
      {
        id: '2',
        searchTerm: 'restaurants',
        category: 'Food & Beverage',
        priceRange: '$$',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        resultCount: 32
      }
    ];

    res.status(200).json({
      success: true,
      data: {
        recentSearches: recentSearches.slice(0, limit),
        totalCount: recentSearches.length
      },
    });
  } catch (error) {
    next(error);
  }
};

// Save search to recent searches
exports.saveRecentSearch = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { error, value } = validateRecentSearches(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    // This would typically save to a user searches collection
    // For now, we'll return a success response
    res.status(201).json({
      success: true,
      message: 'Search saved to recent searches',
      data: {
        searchId: Date.now().toString(),
        ...value,
        userId,
        timestamp: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to convert category string to industryIds (ObjectIds)
// Industry-standard: Use ObjectId matching instead of string regex
async function getIndustryIdsFromCategory(category) {
  try {
    const Industry = require('../models/industry.model');
    const industries = await Industry.find({
      title: { $regex: category, $options: 'i' },
      isActive: true
    }).select('_id').lean();
    
    return industries.map(ind => ind._id);
  } catch (error) {
    console.error('[getIndustryIdsFromCategory] Error:', error);
    return [];
  }
}

// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

// Helper function to check if business is currently open
function checkIfCurrentlyOpen(businessHours) {
  if (!businessHours || businessHours.length === 0) {
    return false;
  }

  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

  const todayHours = businessHours.find(hours => hours.day === currentDay);

  if (!todayHours || todayHours.isClosed) {
    return false;
  }

  return currentTime >= todayHours.open && currentTime <= todayHours.close;
}

// Helper function to check if business has complete profile (with detailed reason)
// Returns { isComplete: boolean, reason?: string }
async function hasCompleteProfileWithDetails(business) {
  try {
    // Check cover photo (coverImage)
    if (!business.coverImage || typeof business.coverImage !== 'string' || business.coverImage.trim() === '') {
      return { isComplete: false, reason: 'noCover' };
    }
    
    // Check logo
    if (!business.logo || typeof business.logo !== 'string' || business.logo.trim() === '') {
      return { isComplete: false, reason: 'noLogo' };
    }
    
    // Check business name
    if (!business.businessName || typeof business.businessName !== 'string' || business.businessName.trim() === '') {
      return { isComplete: false, reason: 'noName' };
    }
    
    // Check industry - can be either industry (string) or industryId (ObjectId)
    // Data integrity: industry string is populated from Industry.title, but industryId is the source of truth
    const hasIndustry = (business.industry && typeof business.industry === 'string' && business.industry.trim() !== '') ||
                        (business.industryId && business.industryId.toString && business.industryId.toString().length > 0);
    
    if (!hasIndustry) {
      return { isComplete: false, reason: 'noIndustry' };
    }
    
    // Check bio (description) - either short or full description
    const hasDescription = business.description && (
      (business.description.short && typeof business.description.short === 'string' && business.description.short.trim() !== '') ||
      (business.description.full && typeof business.description.full === 'string' && business.description.full.trim() !== '')
    );
    
    if (!hasDescription) {
      return { isComplete: false, reason: 'noDescription' };
    }
    
    // Check location - need either address/city OR valid coordinates (not both required)
    const hasLocation = business.location && (
      (business.location.address && typeof business.location.address === 'string' && business.location.address.trim() !== '') ||
      (business.location.city && typeof business.location.city === 'string' && business.location.city.trim() !== '') ||
      (business.location.coordinates && 
       business.location.coordinates.coordinates && 
       Array.isArray(business.location.coordinates.coordinates) &&
       business.location.coordinates.coordinates.length === 2 &&
       business.location.coordinates.coordinates[0] !== 0 &&
       business.location.coordinates.coordinates[1] !== 0)
    );
    
    if (!hasLocation) {
      return { isComplete: false, reason: 'noLocation' };
    }
    
    // Check if business has at least one widget
    // Widgets are linked via pageId (primary) or businessId (fallback)
    try {
      let activeVisibleWidgets = 0;
      
      // Primary check: widgets linked via pageId
      if (business.builderPageId && mongoose.Types.ObjectId.isValid(business.builderPageId)) {
        activeVisibleWidgets = await Widget.countDocuments({
          pageId: business.builderPageId,
          status: 'active',
          isVisible: true
        });
      }
      
      // Fallback: if no widgets via pageId, check via businessId
      if (activeVisibleWidgets === 0 && business._id && mongoose.Types.ObjectId.isValid(business._id)) {
        activeVisibleWidgets = await Widget.countDocuments({ 
          businessId: business._id,
          status: 'active',
          isVisible: true
        });
      }
      
      if (activeVisibleWidgets === 0) {
        return { isComplete: false, reason: 'noWidgets' };
      }
    } catch (error) {
      return { isComplete: false, reason: 'noWidgets' };
    }
    
    return { isComplete: true };
  } catch (error) {
    console.error(`[hasCompleteProfile] Error checking profile for business ${business._id}:`, error);
    return { isComplete: false, reason: 'error' };
  }
}

// Helper function to check if business has complete profile (backward compatibility)
async function hasCompleteProfile(business) {
  const result = await hasCompleteProfileWithDetails(business);
  return result.isComplete;
}

// Helper function to calculate top pick score
function calculateTopPickScore(business) {
  const ratingWeight = 0.4;
  const viewCountWeight = 0.3;
  const favoriteWeight = 0.2;
  const completionWeight = 0.1;

  const ratingScore = (business.metrics.ratingAverage || 0) / 5;
  const viewScore = Math.min((business.metrics.viewCount || 0) / 1000, 1);
  const favoriteScore = Math.min((business.metrics.favoriteCount || 0) / 100, 1);
  const completionScore = (business.completionPercentage || 0) / 100;

  return (
    ratingScore * ratingWeight +
    viewScore * viewCountWeight +
    favoriteScore * favoriteWeight +
    completionScore * completionWeight
  );
}

// Helper function to calculate engagement score for "On The Rise"
// Focuses on most viewed and fastest-growing engagement metrics
function calculateEngagementScore(business) {
  const viewCountWeight = 0.4;      // Most viewed (40%)
  const favoriteWeight = 0.3;       // Fastest-growing engagement - favorites (30%)
  const ratingWeight = 0.2;         // Engagement quality - ratings (20%)
  const ratingCountWeight = 0.1;    // Engagement volume - number of ratings (10%)

  // Normalize scores (0-1 range)
  const viewScore = Math.min((business.metrics?.viewCount || 0) / 1000, 1); // Cap at 1000 views = 1.0
  const favoriteScore = Math.min((business.metrics?.favoriteCount || 0) / 50, 1); // Cap at 50 favorites = 1.0
  const ratingScore = (business.metrics?.ratingAverage || 0) / 5; // 0-5 rating scale
  const ratingCountScore = Math.min((business.metrics?.ratingCount || 0) / 100, 1); // Cap at 100 ratings = 1.0

  return (
    viewScore * viewCountWeight +
    favoriteScore * favoriteWeight +
    ratingScore * ratingWeight +
    ratingCountScore * ratingCountWeight
  );
}

// Helper function to calculate rise score (legacy - kept for backward compatibility)
function calculateRiseScore(business, recentDate) {
  const daysSinceCreated = Math.floor((Date.now() - new Date(business.createdAt)) / (1000 * 60 * 60 * 24));
  const daysSinceUpdated = Math.floor((Date.now() - new Date(business.updatedAt)) / (1000 * 60 * 60 * 24));

  const recencyScore = Math.max(0, 1 - (daysSinceUpdated / 30)); // Higher score for more recent updates
  const viewGrowthScore = Math.min((business.metrics.viewCount || 0) / 100, 1);
  const newBusinessBonus = daysSinceCreated <= 30 ? 0.3 : 0;

  return recencyScore * 0.5 + viewGrowthScore * 0.5 + newBusinessBonus;
} 