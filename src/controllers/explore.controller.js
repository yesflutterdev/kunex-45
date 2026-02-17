const mongoose = require('mongoose');
const BusinessProfile = require('../models/businessProfile.model');
const BuilderPage = require('../models/builderPage.model');
const User = require('../models/user.model');
const Favorite = require('../models/favorite.model');
const ClickTracking = require('../models/clickTracking.model');
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
  calculateHaversineDistance
} = require('../utils/googleMaps');
const { validateTimezone } = require('../utils/timezoneValidation');

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
      maxDistance = 25000,
      limit = 15,
      category,
      rating,
      priceRange,
      openedStatus,
      businessType,
      features,
      completeProfile = false
    } = value;

    let longitude = queryLongitude;
    let latitude = queryLatitude;

    if (!longitude || !latitude) {
      const user = await User.findById(userId).select('longitude latitude city').lean();
      if (user && user.longitude && user.latitude && (user.longitude !== 0 || user.latitude !== 0)) {
        longitude = user.longitude;
        latitude = user.latitude;
      }
    }

    const query = {};

    if (longitude && latitude && (longitude !== 0 || latitude !== 0)) {
      query.$nor = [
        {
          'location.coordinates.coordinates.0': 0,
          'location.coordinates.coordinates.1': 0
        }
      ];
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

    if (features) {
      // Normalize features to array (handle both string and array inputs)
      const featuresArray = Array.isArray(features) ? features : [features];
      
      if (featuresArray.length > 0) {
        // For array fields, use RegExp directly (MongoDB supports this)
        if (featuresArray.length === 1) {
          query.features = new RegExp(featuresArray[0], 'i');
        } else {
          // For multiple features, use $or
          query.$or = query.$or || [];
          featuresArray.forEach(f => {
            query.$or.push({ features: new RegExp(f, 'i') });
          });
        }
      }
    }

    let businesses = await BusinessProfile.find(query)
      .populate('userId', 'firstName lastName')
      .populate('builderPageId', 'serviceHours')
      .select('-__v')
      .sort({
        'metrics.viewCount': -1,
        'metrics.favoriteCount': -1,
        'metrics.ratingAverage': -1,
        'metrics.ratingCount': -1
      })
      .limit(limit * 2)
      .lean();

    if (openedStatus === 'open' && businesses.length > 0) {
      businesses = filterByOpenedStatus(businesses);
    }

    let finalBusinesses = businesses;
    if (businesses.length === 0 && longitude && latitude && (longitude !== 0 || latitude !== 0)) {
      const fallbackQuery = { ...query };
      delete fallbackQuery['location.coordinates'];
      
      finalBusinesses = await BusinessProfile.find(fallbackQuery)
        .populate('userId', 'firstName lastName')
        .populate('builderPageId', 'serviceHours')
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

    let filteredBusinesses = topBusinesses;
    if (completeProfile) {
      const completeBusinesses = [];
      for (const business of topBusinesses) {
        const validationResult = await hasCompleteProfileWithDetails(business);
        if (validationResult.isComplete) {
          completeBusinesses.push(business);
        }
      }
      filteredBusinesses = completeBusinesses.slice(0, limit);
    }

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
        isCurrentlyOpen: checkIfCurrentlyOpen(business.builderPageId),
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
      maxDistance = 25000,
      limit = 15,
      category,
      priceRange,
      openedStatus,
      completeProfile = false
    } = value;

    const [userBusinessProfile, userFavorites] = await Promise.all([
      BusinessProfile.findOne({ userId })
        .select('industryId subIndustryId industry subIndustry industryTags')
        .lean(),
      Favorite.find({ userId, type: { $in: ['Page', 'BusinessProfile'] } })
        .limit(50)
        .select('widgetId type')
        .lean()
    ]);

    const preferredIndustryIds = new Set();
    const preferredSubIndustryIds = new Set();

    if (userBusinessProfile) {
      if (userBusinessProfile.industryId) {
        preferredIndustryIds.add(userBusinessProfile.industryId.toString());
      }
      if (userBusinessProfile.subIndustryId) {
        preferredSubIndustryIds.add(userBusinessProfile.subIndustryId);
      }
    }

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

    const query = {};

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

      if (priceRange) {
      query.priceRange = Array.isArray(priceRange) ? { $in: priceRange } : priceRange;
    }

    let businesses = await BusinessProfile.find(query)
          .populate('userId', 'firstName lastName')
          .populate('builderPageId', 'serviceHours')
          .select('-__v')
          .sort({
            'metrics.ratingAverage': -1,
            'metrics.viewCount': -1,
            'metrics.favoriteCount': -1,
        'updatedAt': -1
          })
      .limit(limit * 3)
          .lean();

    // Post-query filtering for openedStatus
    if (openedStatus === 'open' && businesses.length > 0) {
      businesses = filterByOpenedStatus(businesses);
    }

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

    businessesWithScores.sort((a, b) => {
      if (b.personalizationScore !== a.personalizationScore) {
        return b.personalizationScore - a.personalizationScore;
      }
      return b.topPickScore - a.topPickScore;
    });

    const topBusinesses = businessesWithScores.slice(0, limit).map(item => item.business);

    let finalBusinesses = topBusinesses;
    if (completeProfile) {
      const completeBusinesses = [];
      for (const business of topBusinesses) {
        const validationResult = await hasCompleteProfileWithDetails(business);
        if (validationResult.isComplete) {
          completeBusinesses.push(business);
        }
      }
      finalBusinesses = completeBusinesses.slice(0, limit);
    }

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

      const isCurrentlyOpen = checkIfCurrentlyOpen(business.builderPageId);

      const businessData = {
        ...business,
        isCurrentlyOpen,
        topPickScore: calculateTopPickScore(business)
      };

      if (distance !== null) {
        businessData.distance = distance;
        businessData.distanceUnit = 'km';
      }

      return businessData;
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
      maxDistance = 25000,
      limit = 15,
      category,
      priceRange,
      openedStatus,
      completeProfile = false
    } = value;

    const query = {};

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


    const engagementThreshold = {
      $or: [
        { 'metrics.viewCount': { $gte: 1 } },
        { 'metrics.favoriteCount': { $gte: 1 } },
        { 'metrics.ratingCount': { $gte: 1 } }
      ]
    };

    if (query.$or) {
      query.$and = [
        { $or: query.$or },
        engagementThreshold
      ];
      delete query.$or;
    } else if (Object.keys(query).length > 0) {
      query.$and = query.$and || [];
      query.$and.push(engagementThreshold);
    } else {
      Object.assign(query, engagementThreshold);
    }

    let businesses = await BusinessProfile.find(query)
      .populate('userId', 'firstName lastName')
      .populate('builderPageId', 'serviceHours')
      .select('-__v')
      .sort({
        'metrics.viewCount': -1,
        'metrics.favoriteCount': -1,
        'metrics.ratingAverage': -1
      })
      .limit(limit * 2)
      .lean();

    // Post-query filtering for openedStatus
    if (openedStatus === 'open' && businesses.length > 0) {
      businesses = filterByOpenedStatus(businesses);
    }

    const businessesWithScores = businesses.map(business => {
      const engagementScore = calculateEngagementScore(business);
      return {
        business,
        engagementScore
      };
    });

    businessesWithScores.sort((a, b) => b.engagementScore - a.engagementScore);

    const topBusinesses = businessesWithScores.slice(0, limit).map(item => item.business);

    let finalBusinesses = topBusinesses;
    if (completeProfile) {
      const completeBusinesses = [];
      for (const business of topBusinesses) {
        const validationResult = await hasCompleteProfileWithDetails(business);
        if (validationResult.isComplete) {
          completeBusinesses.push(business);
        }
      }
      finalBusinesses = completeBusinesses;
    }

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

      const isCurrentlyOpen = checkIfCurrentlyOpen(business.builderPageId);
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
      priceRange,
      openedStatus = 'any',
      completeProfile = false
    } = value;

    const query = {};

    if (category) {
      const industryIds = await getIndustryIdsFromCategory(category);
      if (industryIds.length > 0) {
        query.industryId = { $in: industryIds };
      } else {
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

    const businesses = await BusinessProfile.find(query)
      .populate('userId', 'firstName lastName')
      .populate('builderPageId', 'serviceHours')
      .select('-__v')
      .sort({ createdAt: -1 })
      .limit(limit * 2)
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

    let topBusinesses = businesses.slice(0, limit);

    // Post-query filtering for openedStatus
    if (openedStatus === 'open' && topBusinesses.length > 0) {
      const now = new Date();
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
      const currentTime = now.toTimeString().slice(0, 5);
      topBusinesses = filterByOpenedStatus(topBusinesses, currentDay, currentTime);
    }

    // Filter businesses with complete profiles if requested
    let finalBusinesses = topBusinesses;
    if (completeProfile) {
      const completeBusinesses = [];
      for (const business of topBusinesses) {
        const validationResult = await hasCompleteProfileWithDetails(business);
        if (validationResult.isComplete) {
          completeBusinesses.push(business);
        }
      }
      finalBusinesses = completeBusinesses;
    }

    let distances = [];
    if (longitude && latitude) {
      const businessLocations = finalBusinesses
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
    const businessesWithDetails = finalBusinesses.map(business => {
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
        isCurrentlyOpen: checkIfCurrentlyOpen(business.builderPageId),
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
      openedStatus,
      completeProfile = false
    } = value;

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
          _id: '$targetId',
          lastViewedAt: { $first: '$timestamp' },
          viewCount: { $sum: 1 }
        }
      },
      {
        $sort: { lastViewedAt: -1 }
      },
      {
        $limit: limit * 2
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

    const builderPageIds = recentViews.map(view => view._id);
    const viewTimeMap = new Map();
    recentViews.forEach(view => {
      viewTimeMap.set(view._id.toString(), {
        lastViewedAt: view.lastViewedAt,
        viewCount: view.viewCount
      });
    });

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

    let businesses = await BusinessProfile.find(query)
      .populate('userId', 'firstName lastName')
      .populate('builderPageId', 'serviceHours')
      .select('-__v')
      .lean();

    // Post-query filtering for openedStatus
    if (openedStatus === 'open' && businesses.length > 0) {
      businesses = filterByOpenedStatus(businesses);
    }

    const businessesWithViewInfo = businesses.map(business => {
      const viewInfo = viewTimeMap.get(business.builderPageId?.toString());
      return {
        business,
        lastViewedAt: viewInfo ? viewInfo.lastViewedAt : new Date(0),
        viewCount: viewInfo ? viewInfo.viewCount : 0
      };
    });

    businessesWithViewInfo.sort((a, b) => {
      return new Date(b.lastViewedAt) - new Date(a.lastViewedAt);
    });

    const topBusinesses = businessesWithViewInfo.slice(0, limit).map(item => item.business);

    // Filter businesses with complete profiles if requested
    let finalBusinesses = topBusinesses;
    if (completeProfile) {
      const completeBusinesses = [];
      for (const business of topBusinesses) {
        const validationResult = await hasCompleteProfileWithDetails(business);
        if (validationResult.isComplete) {
          completeBusinesses.push(business);
        }
      }
      finalBusinesses = completeBusinesses;
    }

    let distances = [];
    if (longitude && latitude) {
      const businessLocations = finalBusinesses
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
    const businessesWithDetails = finalBusinesses.map(business => {
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
        isCurrentlyOpen: checkIfCurrentlyOpen(business.builderPageId),
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
      maxDistance = 50000,
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
      mostliked = false,
      opennow = false,
      nearby = false,
      completeProfile = false
    } = value;
    const query = {};
    let geoApplied = false;

    if (nearby && longitude && latitude) {
      // Only exclude [0,0] coords when doing geo queries (they break distance calculations)
      query.$nor = [
        {
          'location.coordinates.coordinates.0': 0,
          'location.coordinates.coordinates.1': 0
        }
      ];
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
      geoApplied = true;
    } else if (longitude && latitude) {
      // Only exclude [0,0] coords when doing geo queries
      query.$nor = [
        {
          'location.coordinates.coordinates.0': 0,
          'location.coordinates.coordinates.1': 0
        }
      ];
      query['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: maxDistance
        }
      };
      geoApplied = true;
    }

    // Build non-geo filters separately so they can be reused in fallback
    const buildFilters = async (targetQuery) => {
      if (search) {
        const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const searchOr = [
          { businessName: searchRegex },
          { 'description.short': searchRegex },
          { 'description.full': searchRegex },
          { industry: searchRegex },
          { subIndustry: searchRegex },
          { industryTags: searchRegex },
          { username: searchRegex }
        ];
        targetQuery.$or = targetQuery.$or
          ? [{ $and: [{ $or: targetQuery.$or }, { $or: searchOr }] }]
          : searchOr;
      }

      if (toprated) {
        targetQuery['metrics.ratingAverage'] = { $gte: 4.0 };
        targetQuery['metrics.ratingCount'] = { $gte: 10 };
      }

      if (mostliked) {
        targetQuery['metrics.favoriteCount'] = { $gte: 1 };
      }

      if (category) {
        const industryIds = await getIndustryIdsFromCategory(category);
        if (industryIds.length > 0) {
          targetQuery.industryId = { $in: industryIds };
        } else {
          const categoryOr = [
            { industry: new RegExp(category, 'i') },
            { subIndustry: new RegExp(category, 'i') },
            { industryTags: new RegExp(category, 'i') }
          ];
          if (targetQuery.$or) {
            // search $or already exists, combine with $and
            targetQuery.$and = targetQuery.$and || [];
            targetQuery.$and.push({ $or: categoryOr });
          } else {
            targetQuery.$or = categoryOr;
          }
        }
      }

      if (rating) {
        targetQuery['metrics.ratingAverage'] = { $gte: rating };
      }

      if (priceRange) {
        if (Array.isArray(priceRange)) {
          targetQuery.priceRange = { $in: priceRange };
        } else {
          targetQuery.priceRange = priceRange;
        }
      }

      if (businessType) {
        targetQuery.businessType = businessType;
      }

      if (features) {
        const featuresArray = Array.isArray(features) ? features : [features];
        if (featuresArray.length > 0) {
          if (featuresArray.length === 1) {
            targetQuery.features = new RegExp(featuresArray[0], 'i');
          } else {
            const featuresOr = featuresArray.map(f => ({ features: new RegExp(f, 'i') }));
            if (targetQuery.$or) {
              targetQuery.$and = targetQuery.$and || [];
              targetQuery.$and.push({ $or: featuresOr });
            } else {
              targetQuery.$or = featuresOr;
            }
          }
        }
      }
    };

    await buildFilters(query);

    const sort = {};

    switch (sortBy) {
      case 'rating':
        sort['metrics.ratingAverage'] = -1;
        sort['metrics.ratingCount'] = -1;
        break;
      case 'distance':
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
          sort['metrics.ratingAverage'] = -1;
          sort['metrics.viewCount'] = -1;
        } else if (toprated) {
          sort['metrics.ratingAverage'] = -1;
          sort['metrics.ratingCount'] = -1;
        } else if (mostliked) {
          sort['metrics.favoriteCount'] = -1;
          sort['metrics.ratingAverage'] = -1;
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

    const fetchLimit = limit * 3;
    const skip = (page - 1) * limit;

    let businesses = await BusinessProfile.find(query)
        .populate('userId', 'firstName lastName')
        .populate('builderPageId', 'serviceHours')
        .select('-__v')
        .sort(sort)
      .limit(fetchLimit)
      .lean();

    // Fallback: if geo query returned 0 results, retry without geo filter
    if (businesses.length === 0 && geoApplied) {
      const fallbackQuery = {};
      await buildFilters(fallbackQuery);

      const fallbackSort = Object.keys(sort).length > 0
        ? sort
        : { 'metrics.ratingAverage': -1, 'metrics.viewCount': -1 };

      businesses = await BusinessProfile.find(fallbackQuery)
        .populate('userId', 'firstName lastName')
        .populate('builderPageId', 'serviceHours')
        .select('-__v')
        .sort(fallbackSort)
        .limit(fetchLimit)
        .lean();
    }

    if ((openedStatus === 'open' || opennow) && businesses.length > 0) {
      businesses = filterByOpenedStatus(businesses);
    }

    let finalBusinesses = businesses;
    if (completeProfile) {
      console.log('\n========== COMPLETE PROFILE CHECK ==========');
      console.log(`Checking ${businesses.length} businesses for completeness...`);
      const completeBusinesses = [];
      for (const business of businesses) {
        const validationResult = await hasCompleteProfileWithDetails(business);
        console.log(`\n📄 ${business.businessName}`);
        if (!validationResult.isComplete) {
          console.log(`   ❌ INCOMPLETE - Reason: ${validationResult.reason}`);
          if (validationResult.reason === 'noCover') console.log(`      Missing: Cover Image`);
          if (validationResult.reason === 'noLogo') console.log(`      Missing: Logo`);
          if (validationResult.reason === 'noName') console.log(`      Missing: Business Name`);
          if (validationResult.reason === 'noIndustry') console.log(`      Missing: Industry`);
          if (validationResult.reason === 'noDescription') console.log(`      Missing: Description (bio)`);
          if (validationResult.reason === 'noLocation') console.log(`      Missing: Location`);
          if (validationResult.reason === 'noWidgets') console.log(`      Missing: At least 1 active widget/section`);
        } else {
          console.log(`   ✅ COMPLETE - All 7 requirements met`);
        }
        if (validationResult.isComplete) {
          completeBusinesses.push(business);
        }
      }
      console.log(`\n📊 RESULT: ${completeBusinesses.length}/${businesses.length} complete profiles`);
      console.log('========================================\n');
      finalBusinesses = completeBusinesses;
    }

    const paginatedBusinesses = finalBusinesses.slice(skip, skip + limit);
    const filteredTotalCount = finalBusinesses.length;

    const businessesWithDetails = paginatedBusinesses.map((business) => {
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

      const isCurrentlyOpen = checkIfCurrentlyOpen(business.builderPageId);

      return {
        ...business,
        distance,
        isCurrentlyOpen,
        distanceUnit: distance !== null ? 'km' : null
      };
    });

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
          category: category || null,
          rating: rating || null,
          priceRange: priceRange || null,
          openedStatus: openedStatus || 'any',
          businessType: businessType || null,
          features: features || null,
          search: search || null,
          toprated,
          mostliked,
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
exports.getRecentSearches = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    const recentSearches = [
      {
        id: '1',
        searchTerm: 'coffee shops',
        category: 'Food & Beverage',
        location: 'Downtown',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        resultCount: 15
      },
      {
        id: '2',
        searchTerm: 'restaurants',
        category: 'Food & Beverage',
        priceRange: '$$',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
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

async function getIndustryIdsFromCategory(category) {
  try {
    const Industry = require('../models/industry.model');
    const industries = await Industry.find({
      title: { $regex: category, $options: 'i' },
      isActive: true
    }).select('_id').lean();
    
    return industries.map(ind => ind._id);
  } catch (error) {
    return [];
  }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function normalizeTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') {
    return null;
  }
  
  const trimmed = timeStr.trim();
  if (trimmed.length === 0) {
    return null;
  }
  
  const parts = trimmed.split(':');
  if (parts.length !== 2) {
    return null;
  }
  
  const hoursStr = parts[0].trim();
  const minutesStr = parts[1].trim();
  
  if (hoursStr.length === 0 || minutesStr.length === 0) {
    return null;
  }
  
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  
  if (isNaN(hours) || isNaN(minutes)) {
    return null;
  }
  
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') {
    return null;
  }
  
  const normalized = normalizeTime(timeStr);
  if (!normalized) {
    return null;
  }
  
  const parts = normalized.split(':');
  if (parts.length !== 2) {
    return null;
  }
  
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  
  if (isNaN(hours) || isNaN(minutes)) {
    return null;
  }
  
  return (hours * 60) + minutes;
}

function mapDayAbbreviationToFull(abbrev) {
  const dayMap = {
    'Mon': 'Monday',
    'Tues': 'Tuesday',
    'Wed': 'Wednesday',
    'Thur': 'Thursday',
    'Thu': 'Thursday',
    'Fri': 'Friday',
    'Sat': 'Saturday',
    'Sun': 'Sunday'
  };
  return dayMap[abbrev] || abbrev;
}

function mapFullDayToAbbreviation(fullDay) {
  if (!fullDay || typeof fullDay !== 'string') {
    return null;
  }
  
  const normalized = fullDay.trim();
  if (normalized.length === 0) {
    return null;
  }
  
  const dayMap = {
    'Monday': 'Mon',
    'Tuesday': 'Tues',
    'Wednesday': 'Wed',
    'Thursday': 'Thur',
    'Friday': 'Fri',
    'Saturday': 'Sat',
    'Sunday': 'Sun'
  };
  
  return dayMap[normalized] || null;
}

function timeToSeconds(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') {
    return null;
  }
  
  const trimmed = timeStr.trim();
  if (trimmed.length === 0) {
    return null;
  }
  
  const parts = trimmed.split(':');
  if (parts.length < 2 || parts.length > 3) {
    return null;
  }
  
  const hoursStr = parts[0].trim();
  const minutesStr = parts[1].trim();
  const secondsStr = parts[2] ? parts[2].trim() : '00';
  
  if (hoursStr.length === 0 || minutesStr.length === 0) {
    return null;
  }
  
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  const seconds = parseInt(secondsStr, 10);
  
  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
    return null;
  }
  
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    return null;
  }
  
  return (hours * 3600) + (minutes * 60) + seconds;
}

function getCurrentTimeInTimezone(timezone) {
  if (!timezone || typeof timezone !== 'string' || timezone.trim().length === 0) {
    return null;
  }
  
  try {
    const now = new Date();
    if (!now || isNaN(now.getTime())) {
      return null;
    }
    
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone.trim(),
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    if (!parts || !Array.isArray(parts) || parts.length === 0) {
      return null;
    }
    
    let day = null;
    let hour = null;
    let minute = null;
    let second = null;
    
    for (const part of parts) {
      if (!part || typeof part !== 'object') {
        continue;
      }
      if (part.type === 'weekday' && part.value) {
        day = part.value;
      } else if (part.type === 'hour' && part.value) {
        hour = part.value;
      } else if (part.type === 'minute' && part.value) {
        minute = part.value;
      } else if (part.type === 'second' && part.value) {
        second = part.value;
      }
    }
    
    if (!day || !hour || !minute || !second || 
        typeof day !== 'string' || typeof hour !== 'string' || 
        typeof minute !== 'string' || typeof second !== 'string') {
      return null;
    }
    
    const hourNum = parseInt(hour, 10);
    const minuteNum = parseInt(minute, 10);
    const secondNum = parseInt(second, 10);
    
    if (isNaN(hourNum) || isNaN(minuteNum) || isNaN(secondNum) ||
        hourNum < 0 || hourNum > 23 || minuteNum < 0 || minuteNum > 59 || 
        secondNum < 0 || secondNum > 59) {
      return null;
    }
    
    const time = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`;
    
    return {
      day: day.trim(),
      time: time
    };
  } catch (error) {
    return null;
  }
}

function getServiceHoursForDay(serviceHours, currentDayFull) {
  if (!serviceHours || typeof serviceHours !== 'object' || Array.isArray(serviceHours)) {
    return null;
  }
  
  if (!serviceHours.weeklyHours || !Array.isArray(serviceHours.weeklyHours)) {
    return null;
  }
  
  if (serviceHours.weeklyHours.length === 0) {
    return null;
  }
  
  if (!currentDayFull || typeof currentDayFull !== 'string' || currentDayFull.trim().length === 0) {
    return null;
  }
  
  const currentDayAbbrev = mapFullDayToAbbreviation(currentDayFull);
  if (!currentDayAbbrev || typeof currentDayAbbrev !== 'string') {
    return null;
  }
  
  const todayHours = serviceHours.weeklyHours.find(hours => {
    if (!hours || typeof hours !== 'object' || Array.isArray(hours)) {
      return false;
    }
    if (!hours.day || typeof hours.day !== 'string') {
      return false;
    }
    const dayNormalized = hours.day.trim();
    if (dayNormalized.length === 0) {
      return false;
    }
    return dayNormalized === currentDayAbbrev || dayNormalized === currentDayFull.trim();
  });

  if (!todayHours || typeof todayHours !== 'object' || Array.isArray(todayHours)) {
    return null;
  }

  if (todayHours.isClosed === true) {
    return null;
  }

  if (!todayHours.startTime || typeof todayHours.startTime !== 'string' || todayHours.startTime.trim().length === 0) {
    return null;
  }
  
  if (!todayHours.endTime || typeof todayHours.endTime !== 'string' || todayHours.endTime.trim().length === 0) {
    return null;
  }

  const normalizedStartTime = normalizeTime(todayHours.startTime);
  const normalizedEndTime = normalizeTime(todayHours.endTime);
  
  if (!normalizedStartTime || !normalizedEndTime || 
      typeof normalizedStartTime !== 'string' || typeof normalizedEndTime !== 'string') {
    return null;
  }

  return {
    open: normalizedStartTime,
    close: normalizedEndTime,
    isClosed: todayHours.isClosed === true
  };
}

function checkIfCurrentlyOpenFromServiceHours(serviceHours) {
  if (!serviceHours || typeof serviceHours !== 'object' || Array.isArray(serviceHours)) {
    return false;
  }
  
  if (!serviceHours.weeklyHours || !Array.isArray(serviceHours.weeklyHours)) {
    return false;
  }
  
  if (serviceHours.weeklyHours.length === 0) {
    return false;
  }

  try {
    const timezone = validateTimezone(serviceHours.timezone, 'UTC');
    if (!timezone || typeof timezone !== 'string') {
      return false;
    }
    
    const currentTimeInfo = getCurrentTimeInTimezone(timezone);
    if (!currentTimeInfo || typeof currentTimeInfo !== 'object' || 
        !currentTimeInfo.time || !currentTimeInfo.day ||
        typeof currentTimeInfo.time !== 'string' || typeof currentTimeInfo.day !== 'string') {
      return false;
    }
    
    const currentDayFull = currentTimeInfo.day;
    const currentTime = currentTimeInfo.time;
    
    const currentTimeSeconds = timeToSeconds(currentTime);
    if (currentTimeSeconds === null || typeof currentTimeSeconds !== 'number' || 
        isNaN(currentTimeSeconds) || currentTimeSeconds < 0 || currentTimeSeconds >= 86400) {
      return false;
    }

    const todayHours = getServiceHoursForDay(serviceHours, currentDayFull);
    if (!todayHours || typeof todayHours !== 'object' || Array.isArray(todayHours)) {
      return false;
    }

    const openSeconds = timeToSeconds(todayHours.open);
    const closeSeconds = timeToSeconds(todayHours.close);

    if (openSeconds === null || typeof openSeconds !== 'number' || 
        isNaN(openSeconds) || openSeconds < 0 || openSeconds >= 86400) {
      return false;
    }
    
    if (closeSeconds === null || typeof closeSeconds !== 'number' || 
        isNaN(closeSeconds) || closeSeconds < 0 || closeSeconds >= 86400) {
      return false;
    }

    if (closeSeconds < openSeconds) {
      return currentTimeSeconds >= openSeconds || currentTimeSeconds < closeSeconds;
    }

    return currentTimeSeconds >= openSeconds && currentTimeSeconds < closeSeconds;
  } catch (error) {
    return false;
  }
}

function filterByOpenedStatus(businesses) {
  if (!Array.isArray(businesses)) {
    return [];
  }
  
  if (businesses.length === 0) {
    return [];
  }

  return businesses.filter(business => {
    if (!business || typeof business !== 'object' || Array.isArray(business)) {
      return false;
    }
    
    if (!business.builderPageId || typeof business.builderPageId !== 'object' || 
        Array.isArray(business.builderPageId)) {
      return false;
    }
    
    if (!business.builderPageId.serviceHours || typeof business.builderPageId.serviceHours !== 'object' ||
        Array.isArray(business.builderPageId.serviceHours)) {
      return false;
    }

    const serviceHours = business.builderPageId.serviceHours;
    const timezone = validateTimezone(serviceHours.timezone, 'UTC');
    if (!timezone || typeof timezone !== 'string') {
      return false;
    }
    
    const currentTimeInfo = getCurrentTimeInTimezone(timezone);
    if (!currentTimeInfo || typeof currentTimeInfo !== 'object' ||
        !currentTimeInfo.time || !currentTimeInfo.day ||
        typeof currentTimeInfo.time !== 'string' || typeof currentTimeInfo.day !== 'string') {
      return false;
    }
    
    const businessCurrentDay = currentTimeInfo.day;
    const businessCurrentTime = currentTimeInfo.time;
    
    const todayHours = getServiceHoursForDay(serviceHours, businessCurrentDay);
    if (!todayHours || typeof todayHours !== 'object' || Array.isArray(todayHours)) {
      return false;
    }

    const currentTimeSeconds = timeToSeconds(businessCurrentTime);
    const openSeconds = timeToSeconds(todayHours.open);
    const closeSeconds = timeToSeconds(todayHours.close);

    if (currentTimeSeconds === null || typeof currentTimeSeconds !== 'number' || 
        isNaN(currentTimeSeconds) || currentTimeSeconds < 0 || currentTimeSeconds >= 86400) {
      return false;
    }
    
    if (openSeconds === null || typeof openSeconds !== 'number' || 
        isNaN(openSeconds) || openSeconds < 0 || openSeconds >= 86400) {
      return false;
    }
    
    if (closeSeconds === null || typeof closeSeconds !== 'number' || 
        isNaN(closeSeconds) || closeSeconds < 0 || closeSeconds >= 86400) {
      return false;
    }

    if (closeSeconds < openSeconds) {
      return currentTimeSeconds >= openSeconds || currentTimeSeconds < closeSeconds;
    }

    return currentTimeSeconds >= openSeconds && currentTimeSeconds < closeSeconds;
  });
}

function checkIfCurrentlyOpen(builderPage) {
  if (!builderPage || typeof builderPage !== 'object' || Array.isArray(builderPage)) {
    return false;
  }
  
  if (!builderPage.serviceHours || typeof builderPage.serviceHours !== 'object' ||
      Array.isArray(builderPage.serviceHours)) {
    return false;
  }
  
  return checkIfCurrentlyOpenFromServiceHours(builderPage.serviceHours);
}

async function hasCompleteProfileWithDetails(business) {
  try {
    if (!business.coverImage || typeof business.coverImage !== 'string' || business.coverImage.trim() === '') {
      return { isComplete: false, reason: 'noCover' };
    }

    if (!business.logo || typeof business.logo !== 'string' || business.logo.trim() === '') {
      return { isComplete: false, reason: 'noLogo' };
    }

    if (!business.businessName || typeof business.businessName !== 'string' || business.businessName.trim() === '') {
      return { isComplete: false, reason: 'noName' };
    }

    const hasIndustry = (business.industry && typeof business.industry === 'string' && business.industry.trim() !== '') ||
                        (business.industryId && business.industryId.toString && business.industryId.toString().length > 0);

    if (!hasIndustry) {
      return { isComplete: false, reason: 'noIndustry' };
    }

    const hasDescription = business.description && (
      (business.description.short && typeof business.description.short === 'string' && business.description.short.trim() !== '') ||
      (business.description.full && typeof business.description.full === 'string' && business.description.full.trim() !== '')
    );

    if (!hasDescription) {
      return { isComplete: false, reason: 'noDescription' };
    }

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

    try {
      let activeVisibleWidgets = 0;

      if (business.builderPageId && mongoose.Types.ObjectId.isValid(business.builderPageId)) {
        activeVisibleWidgets = await Widget.countDocuments({
          pageId: business.builderPageId,
          status: 'active',
          isVisible: true
        });
      }

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
    return { isComplete: false, reason: 'error' };
  }
}

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

function calculateEngagementScore(business) {
  const viewCountWeight = 0.4;
  const favoriteWeight = 0.3;
  const ratingWeight = 0.2;
  const ratingCountWeight = 0.1;

  const viewScore = Math.min((business.metrics?.viewCount || 0) / 1000, 1);
  const favoriteScore = Math.min((business.metrics?.favoriteCount || 0) / 50, 1);
  const ratingScore = (business.metrics?.ratingAverage || 0) / 5;
  const ratingCountScore = Math.min((business.metrics?.ratingCount || 0) / 100, 1);

  return (
    viewScore * viewCountWeight +
    favoriteScore * favoriteWeight +
    ratingScore * ratingWeight +
    ratingCountScore * ratingCountWeight
  );
} 