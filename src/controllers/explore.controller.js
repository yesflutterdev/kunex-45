const BusinessProfile = require('../models/businessProfile.model');
const User = require('../models/user.model');
const {
  validateExploreBusinesses,
  validateNearbyBusinesses,
  validateTopPicks,
  validateOnTheRise,
  validateRecentSearches
} = require('../utils/exploreValidation');

// Get nearby businesses with geo-queries (KON-31)
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

    const {
      longitude,
      latitude,
      maxDistance = 10000, // 10km default
      limit = 20,
      category,
      rating,
      priceRange,
      openedStatus,
      businessType,
      features
    } = value;

    // Build geo-query
    const query = {
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: maxDistance
        }
      }
    };

    // Apply filters
    if (category) {
      query.$or = [
        { industry: new RegExp(category, 'i') },
        { subIndustry: new RegExp(category, 'i') },
        { industryTags: { $in: [new RegExp(category, 'i')] } }
      ];
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
      query.features = { $in: features.map(f => new RegExp(f, 'i')) };
    }

    // Filter by opened status
    if (openedStatus === 'open') {
      const now = new Date();
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

      query.businessHours = {
        $elemMatch: {
          day: currentDay,
          isClosed: false,
          open: { $lte: currentTime },
          close: { $gte: currentTime }
        }
      };
    }

    // Execute query
    const businesses = await BusinessProfile.find(query)
      .populate('userId', 'firstName lastName')
      .select('-__v')
      .limit(limit)
      .lean();

    // Calculate distances and add additional info
    const businessesWithDetails = businesses.map(business => {
      const distance = calculateDistance(
        latitude, 
        longitude, 
        business.location.coordinates.coordinates[1], 
        business.location.coordinates.coordinates[0]
      );

      const isCurrentlyOpen = checkIfCurrentlyOpen(business.businessHours);

      return {
        ...business,
        distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
        isCurrentlyOpen,
        distanceUnit: 'km'
      };
    });

    res.status(200).json({
      success: true,
      data: {
        businesses: businessesWithDetails,
        searchCenter: { latitude, longitude },
        maxDistance: maxDistance / 1000, // Convert to km
        totalFound: businessesWithDetails.length
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get top picks businesses (KON-32)
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

    const {
      longitude,
      latitude,
      maxDistance = 25000, // 25km for top picks
      limit = 15,
      category,
      priceRange
    } = value;

    // Build query for top picks (high rating + high view count + recent activity)
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

    // Apply filters
    if (category) {
      query.$or = [
        { industry: new RegExp(category, 'i') },
        { subIndustry: new RegExp(category, 'i') },
        { industryTags: { $in: [new RegExp(category, 'i')] } }
      ];
    }

    if (priceRange) {
      if (Array.isArray(priceRange)) {
        query.priceRange = { $in: priceRange };
      } else {
        query.priceRange = priceRange;
      }
    }

    // Criteria for top picks: good rating and decent view count
    query['metrics.ratingAverage'] = { $gte: 4.0 };
    query['metrics.viewCount'] = { $gte: 10 };

    // Execute query with sorting for top picks
    const businesses = await BusinessProfile.find(query)
      .populate('userId', 'firstName lastName')
      .select('-__v')
      .sort({
        'metrics.ratingAverage': -1,
        'metrics.viewCount': -1,
        'metrics.favoriteCount': -1
      })
      .limit(limit)
      .lean();

    // Add distance if coordinates provided
    const businessesWithDetails = businesses.map(business => {
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
        distanceUnit: distance ? 'km' : null,
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
      daysBack = 30 // Look at businesses created/updated in last 30 days
    } = value;

    // Build query for "On The Rise" (recently created/updated with growing metrics)
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

    // Apply filters
    if (category) {
      query.$or = [
        { industry: new RegExp(category, 'i') },
        { subIndustry: new RegExp(category, 'i') },
        { industryTags: { $in: [new RegExp(category, 'i')] } }
      ];
    }

    if (priceRange) {
      if (Array.isArray(priceRange)) {
        query.priceRange = { $in: priceRange };
      } else {
        query.priceRange = priceRange;
      }
    }

    // Criteria for "On The Rise": recently active businesses
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - daysBack);
    
    query.$or = [
      { createdAt: { $gte: recentDate } }, // Recently created
      { updatedAt: { $gte: recentDate } }  // Recently updated
    ];

    // Execute query with sorting for "On The Rise"
    const businesses = await BusinessProfile.find(query)
      .populate('userId', 'firstName lastName')
      .select('-__v')
      .sort({
        'metrics.viewCount': -1,
        'updatedAt': -1,
        'createdAt': -1
      })
      .limit(limit)
      .lean();

    // Add distance and calculate rise score
    const businessesWithDetails = businesses.map(business => {
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
      const riseScore = calculateRiseScore(business, recentDate);

      return {
        ...business,
        distance,
        isCurrentlyOpen,
        distanceUnit: distance ? 'km' : null,
        riseScore,
        isNewBusiness: new Date(business.createdAt) >= recentDate
      };
    });

    res.status(200).json({
      success: true,
      data: {
        businesses: businessesWithDetails,
        searchCenter: longitude && latitude ? { latitude, longitude } : null,
        totalFound: businessesWithDetails.length,
        sortedBy: 'onTheRise',
        daysBack
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

    // Apply filters
    if (category) {
      query.$or = [
        { industry: new RegExp(category, 'i') },
        { subIndustry: new RegExp(category, 'i') },
        { industryTags: { $in: [new RegExp(category, 'i')] } }
      ];
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
      query.features = { $in: features.map(f => new RegExp(f, 'i')) };
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
    const skip = (page - 1) * limit;


    
    
    const [businesses, totalCount] = await Promise.all([
      BusinessProfile.find(query)
        .populate('userId', 'firstName lastName')
        .select('-__v')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      BusinessProfile.countDocuments(query)
    ]);

    console.log(`✅ QUERY RESULTS: Found ${businesses.length} businesses (Total: ${totalCount})`);

    // Add distance and additional info
    console.log('🔧 Enhancing business data with distance and status...');
    const businessesWithDetails = businesses.map((business, index) => {
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
        distanceUnit: distance ? 'km' : null
      };
    });

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;


    res.status(200).json({
      success: true,
      data: {
        businesses: businessesWithDetails,
        pagination: {
          currentPage: page,
          totalPages,
          totalBusinesses: totalCount,
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

// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
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

// Helper function to calculate rise score
function calculateRiseScore(business, recentDate) {
  const daysSinceCreated = Math.floor((Date.now() - new Date(business.createdAt)) / (1000 * 60 * 60 * 24));
  const daysSinceUpdated = Math.floor((Date.now() - new Date(business.updatedAt)) / (1000 * 60 * 60 * 24));
  
  const recencyScore = Math.max(0, 1 - (daysSinceUpdated / 30)); // Higher score for more recent updates
  const viewGrowthScore = Math.min((business.metrics.viewCount || 0) / 100, 1);
  const newBusinessBonus = daysSinceCreated <= 30 ? 0.3 : 0;

  return recencyScore * 0.5 + viewGrowthScore * 0.5 + newBusinessBonus;
} 