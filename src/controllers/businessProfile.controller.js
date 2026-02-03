const BusinessProfile = require('../models/businessProfile.model');
const BuilderPage = require('../models/builderPage.model');
const Folder = require('../models/folder.model');
const User = require('../models/user.model');
const { uploadToCloudinary, deleteImage, extractPublicId } = require('../utils/cloudinary');
const { incrementIndustryViewCount, validateIndustryAndSubcategory } = require('../utils/industryUtils');
const {
  validateCreateBusinessProfile,
  validateUpdateBusinessProfile,
  validateSearchBusinessProfiles,
  validateLocationSearch,
  validateImageUpload,
  validateMultipleImageUpload,
  validateUsername
} = require('../utils/businessProfileValidation');

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

function getServiceHoursForDay(serviceHours, currentDayFull) {
  if (!serviceHours || typeof serviceHours !== 'object') {
    return null;
  }
  
  if (!serviceHours.weeklyHours || !Array.isArray(serviceHours.weeklyHours)) {
    return null;
  }
  
  if (serviceHours.weeklyHours.length === 0) {
    return null;
  }
  
  if (!currentDayFull || typeof currentDayFull !== 'string') {
    return null;
  }
  
  const currentDayAbbrev = mapFullDayToAbbreviation(currentDayFull);
  if (!currentDayAbbrev) {
    return null;
  }
  
  const todayHours = serviceHours.weeklyHours.find(hours => {
    if (!hours || typeof hours !== 'object') {
      return false;
    }
    if (!hours.day || typeof hours.day !== 'string') {
      return false;
    }
    const dayNormalized = hours.day.trim();
    return dayNormalized === currentDayAbbrev || dayNormalized === currentDayFull.trim();
  });

  if (!todayHours || typeof todayHours !== 'object') {
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
  
  if (!normalizedStartTime || !normalizedEndTime) {
    return null;
  }

  return {
    open: normalizedStartTime,
    close: normalizedEndTime,
    isClosed: todayHours.isClosed === true
  };
}

function checkIfCurrentlyOpenFromServiceHours(serviceHours) {
  if (!serviceHours || typeof serviceHours !== 'object') {
    return false;
  }
  
  if (!serviceHours.weeklyHours || !Array.isArray(serviceHours.weeklyHours)) {
    return false;
  }
  
  if (serviceHours.weeklyHours.length === 0) {
    return false;
  }

  try {
    const now = new Date();
    if (isNaN(now.getTime())) {
      return false;
    }
    
    const currentDayFull = now.toLocaleDateString('en-US', { weekday: 'long' });
    if (!currentDayFull || typeof currentDayFull !== 'string') {
      return false;
    }
    
    const currentTime = now.toTimeString().slice(0, 5);
    if (!currentTime || typeof currentTime !== 'string') {
      return false;
    }
    
    const currentTimeMinutes = timeToMinutes(currentTime);
    if (currentTimeMinutes === null || typeof currentTimeMinutes !== 'number' || isNaN(currentTimeMinutes)) {
      return false;
    }

    const todayHours = getServiceHoursForDay(serviceHours, currentDayFull);
    if (!todayHours || typeof todayHours !== 'object') {
      return false;
    }

    const openMinutes = timeToMinutes(todayHours.open);
    const closeMinutes = timeToMinutes(todayHours.close);

    if (openMinutes === null || typeof openMinutes !== 'number' || isNaN(openMinutes)) {
      return false;
    }
    
    if (closeMinutes === null || typeof closeMinutes !== 'number' || isNaN(closeMinutes)) {
      return false;
    }

    if (closeMinutes < openMinutes) {
      return currentTimeMinutes >= openMinutes || currentTimeMinutes <= closeMinutes;
    }

    return currentTimeMinutes >= openMinutes && currentTimeMinutes <= closeMinutes;
  } catch (error) {
    return false;
  }
}

// Create business profile
exports.createProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Check if profile already exists
    const existingProfile = await BusinessProfile.findOne({ userId });
    if (existingProfile) {
      return res.status(400).json({
        success: false,
        message: 'Business profile already exists for this user',
      });
    }

    // Validate input data
    const { error, value } = validateCreateBusinessProfile(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const existingUsername = await BusinessProfile.findOne({ username: value.username });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username is already taken',
      });
    }

    let industryName = null;
    let subIndustryName = null;
    
    if (value.industryId) {
      const industryValidation = await validateIndustryAndSubcategory(value.industryId, value.subIndustryId);
      if (!industryValidation.valid) {
        return res.status(400).json({
          success: false,
          message: industryValidation.error,
        });
      }
      
      industryName = industryValidation.industry.title;
      
      if (value.subIndustryId) {
        const subcategory = industryValidation.industry.subcategories.find(
          sub => sub.id === value.subIndustryId
        );
        if (subcategory) {
          subIndustryName = subcategory.title;
        }
      }
    }

    const profileData = {
      userId,
      ...value,
      industry: industryName,
      subIndustry: subIndustryName,
      isBusiness: value.isBusiness !== undefined ? value.isBusiness : true,
    };
    
    // Ensure logo and coverImage are passed through
    if (value.logo) profileData.logo = value.logo;
    if (value.coverImage) profileData.coverImage = value.coverImage;

    const profile = new BusinessProfile(profileData);

    // Calculate initial completion percentage
    profile.calculateCompletionPercentage();

    await profile.save();

    // Create or get default folder
    let defaultFolder = await Folder.findOne({
      userId,
      name: 'My Favorites',
      isDefault: true
    });

    if (!defaultFolder) {
      defaultFolder = new Folder({
        userId,
        name: 'My Favorites',
        isDefault: true,
        description: 'Default folder for favorites'
      });
      await defaultFolder.save();
    }

    // Create or update corresponding builder page
    const slug = value.username || `page-${Date.now()}`;
    
    // Check if builder page already exists
    let builderPage = await BuilderPage.findOne({ userId, slug });
    
    if (builderPage) {
      // Update existing page
      builderPage.businessId = profile._id;
      builderPage.folderId = defaultFolder._id;
      builderPage.title = value.businessName || builderPage.title;
      builderPage.description = value.description?.short || builderPage.description;
      if (value.industryId) builderPage.industryId = value.industryId;
      if (industryName !== null) builderPage.industry = industryName;
      if (value.subIndustryId) builderPage.subIndustryId = value.subIndustryId;
      builderPage.priceRange = value.priceRange || builderPage.priceRange;
      builderPage.location = value.location?.address || builderPage.location;
      builderPage.logo = value.logo || builderPage.logo;
      builderPage.username = value.username || builderPage.username;
      builderPage.cover = value.coverImage || builderPage.cover;
      builderPage.isBusiness = profileData.isBusiness;
      await builderPage.save();
    } else {
      // Create new builder page
      const builderPageData = {
        userId,
        businessId: profile._id,
        folderId: defaultFolder._id,
        title: value.businessName || 'Untitled Page',
        slug: slug,
        description: value.description?.short || '',
        industryId: value.industryId || null,
        industry: industryName || '',
        subIndustryId: value.subIndustryId || null,
        priceRange: value.priceRange || '$',
        location: value.location?.address || '',
        logo: value.logo || '',
        username: value.username || '',
        cover: value.coverImage || '',
        isBusiness: profileData.isBusiness,
        pageType: 'landing',
        template: {
          name: 'Business Landing Page',
          category: 'business',
          version: '1.0'
        },
        isPublished: true
      };

      builderPage = new BuilderPage(builderPageData);
      await builderPage.save();
      
      if (value.industryId) {
        await incrementIndustryViewCount(value.industryId, value.subIndustryId);
      }
    }

    // Update profile with folderId
    profile.folderId = defaultFolder._id;
    // Link created/updated builder page to business profile
    profile.builderPageId = builderPage._id;
    await profile.save();

    // Populate user data
    await profile.populate('userId', 'email firstName lastName');

    await User.findByIdAndUpdate(userId, { isUserFillsInitialData: true });

    res.status(201).json({
      success: true,
      message: 'Business profile and builder page created successfully',
      data: {
        profile,
        builderPage: {
          id: builderPage._id,
          title: builderPage.title,
          slug: builderPage.slug
        },
        completionPercentage: profile.completionPercentage,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get business profile by user ID
exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const profile = await BusinessProfile.findOne({ userId })
      .populate('userId', 'email firstName lastName')
      .populate('builderPageId', 'serviceHours analytics');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Business profile not found',
      });
    }

    const completionPercentage = profile.calculateCompletionPercentage();
    const now = new Date();
    let todayHours = null;
    let isCurrentlyOpen = false;
    
    if (profile.builderPageId && typeof profile.builderPageId === 'object' && profile.builderPageId.serviceHours) {
      try {
        const now = new Date();
        if (!isNaN(now.getTime())) {
          const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
          if (currentDay && typeof currentDay === 'string') {
            todayHours = getServiceHoursForDay(profile.builderPageId.serviceHours, currentDay);
            isCurrentlyOpen = checkIfCurrentlyOpenFromServiceHours(profile.builderPageId.serviceHours);
          }
        }
      } catch (error) {
        todayHours = null;
        isCurrentlyOpen = false;
      }
    }

    let ctr = 0;
    let totalViewCount = profile.metrics?.viewCount || 0;
    let totalFavoriteCount = profile.metrics?.favoriteCount || 0;

    if (profile.builderPageId && typeof profile.builderPageId === 'object') {
      const builderPageId = profile.builderPageId._id || profile.builderPageId;
      
      const builderPage = await BuilderPage.findById(builderPageId)
        .select('analytics')
        .lean();

      if (builderPage && builderPage.analytics) {
        const pageViews = builderPage.analytics.pageViews || 0;
        const pageFavoriteCount = builderPage.analytics.favoriteCount || 0;

        totalViewCount = Math.max(totalViewCount, pageViews);
        totalFavoriteCount = Math.max(totalFavoriteCount, pageFavoriteCount);

        if (pageViews > 0) {
          const ClickTracking = require('../models/clickTracking.model');
          const clickCount = await ClickTracking.countDocuments({
            targetId: builderPageId,
            targetType: 'builderPage'
          });

          ctr = ((clickCount / pageViews) * 100).toFixed(2);
          ctr = parseFloat(ctr);
        }
      }
    }

    const metrics = {
      viewCount: totalViewCount,
      favoriteCount: totalFavoriteCount,
      ratingAverage: profile.metrics?.ratingAverage || 0,
      ratingCount: profile.metrics?.ratingCount || 0,
      ctr: ctr
    };

    const profileData = profile.toObject();
    profileData.metrics = metrics;

    res.status(200).json({
      success: true,
      data: {
        profile: profileData,
        completionPercentage,
        todayHours,
        isCurrentlyOpen
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get public business profile by username
exports.getPublicProfile = async (req, res, next) => {
  try {
    const { username } = req.params;

    const profile = await BusinessProfile.findOne({ username })
      .populate('userId', 'firstName lastName')
      .populate('builderPageId', 'serviceHours')
      .select('-__v');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Business profile not found',
      });
    }

    await profile.incrementViewCount();
    
    let todayHours = null;
    let isCurrentlyOpen = false;
    
    if (profile.builderPageId && typeof profile.builderPageId === 'object' && profile.builderPageId.serviceHours) {
      try {
        const now = new Date();
        if (!isNaN(now.getTime())) {
          const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
          if (currentDay && typeof currentDay === 'string') {
            todayHours = getServiceHoursForDay(profile.builderPageId.serviceHours, currentDay);
            isCurrentlyOpen = checkIfCurrentlyOpenFromServiceHours(profile.builderPageId.serviceHours);
          }
        }
      } catch (error) {
        todayHours = null;
        isCurrentlyOpen = false;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        profile,
        todayHours,
        isCurrentlyOpen
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update business profile
exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Validate input data
    const { error, value } = validateUpdateBusinessProfile(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    // Find profile
    const profile = await BusinessProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Business profile not found',
      });
    }

    // Check username availability if username is being updated
    if (value.username && value.username !== profile.username) {
      const existingUsername = await BusinessProfile.findOne({
        username: value.username,
        _id: { $ne: profile._id }
      });
      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: 'Username is already taken',
        });
      }
    }

    // Handle industry updates
    let industryName = null;
    let subIndustryName = null;
    
    if (value.industryId !== undefined) {
      if (value.industryId === null) {
        // Clear industry fields
        industryName = '';
        subIndustryName = null;
        profile.industry = '';
        profile.subIndustry = null;
        profile.industryId = null;
        profile.subIndustryId = null;
      } else {
        // Validate and set industry fields
        const industryValidation = await validateIndustryAndSubcategory(value.industryId, value.subIndustryId);
        if (!industryValidation.valid) {
          return res.status(400).json({
            success: false,
            message: industryValidation.error,
          });
        }
        
        industryName = industryValidation.industry.title;
        profile.industryId = value.industryId;
        
        if (value.subIndustryId) {
          const subcategory = industryValidation.industry.subcategories.find(
            sub => sub.id === value.subIndustryId
          );
          if (subcategory) {
            subIndustryName = subcategory.title;
            profile.subIndustryId = value.subIndustryId;
          } else {
            subIndustryName = null;
            profile.subIndustryId = null;
          }
        } else {
          subIndustryName = null;
          profile.subIndustryId = null;
        }
        
        profile.industry = industryName;
        profile.subIndustry = subIndustryName;
      }
    } else if (value.subIndustryId !== undefined) {
      // If only subIndustryId is being updated, validate against existing industryId
      if (value.subIndustryId === null) {
        // Clear subIndustry
        profile.subIndustry = null;
        profile.subIndustryId = null;
      } else if (profile.industryId) {
        // Validate subIndustryId against existing industryId
        const industryValidation = await validateIndustryAndSubcategory(profile.industryId, value.subIndustryId);
        if (!industryValidation.valid) {
          return res.status(400).json({
            success: false,
            message: industryValidation.error,
          });
        }
        const subcategory = industryValidation.industry.subcategories.find(
          sub => sub.id === value.subIndustryId
        );
        if (subcategory) {
          profile.subIndustry = subcategory.title;
          profile.subIndustryId = value.subIndustryId;
        } else {
          profile.subIndustry = null;
          profile.subIndustryId = null;
        }
      } else {
        return res.status(400).json({
          success: false,
          message: 'Cannot set subIndustryId without industryId',
        });
      }
    }

    // Apply all other updates from value to profile (excluding industry fields which are already handled)
    const { industryId, subIndustryId, ...otherUpdates } = value;
    Object.assign(profile, otherUpdates);
    
    // Industry fields are already set above, so we don't need to override them

    await profile.save();

    const builderPage = await BuilderPage.findOne({ businessId: profile._id });
    if (builderPage) {
      const syncData = {};
      
      syncData.title = profile.businessName;
      syncData.username = profile.username;
      syncData.logo = profile.logo;
      syncData.cover = profile.coverImage;
      syncData.priceRange = profile.priceRange;
      if (value.industryId !== undefined || value.subIndustryId !== undefined) {
        syncData.industryId = profile.industryId;
        syncData.industry = profile.industry;
        syncData.subIndustry = profile.subIndustry;
        syncData.subIndustryId = profile.subIndustryId;
      }
      syncData.isBusiness = profile.isBusiness;
      syncData.folderId = profile.folderId;
      
      if (profile.location?.address) {
        syncData.location = profile.location.address;
      }
      
      Object.assign(builderPage, syncData);
      await builderPage.save();
    }

    // Populate user data
    await profile.populate('userId', 'email firstName lastName');

    res.status(200).json({
      success: true,
      message: 'Business profile updated successfully',
      data: {
        profile,
        completionPercentage: profile.completionPercentage,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getProfilesByIndustryParam = async (req, res, next) => {
  try {
    const { industry } = req.params;
    if (!industry || typeof industry !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Industry parameter is required'
      });
    }

    const {
      openNow,
      nearby,
      topRated,
      price,
      latitude,
      longitude,
      maxDistance = 25000,
      subIndustryId
    } = req.query;

    // Check if industry param is a MongoDB ObjectId (24 hex characters)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(industry);
    let industryId = null;
    let industryName = null;
    let query = {};

    if (isObjectId) {
      // Industry param is an industryId (ObjectId)
      const Industry = require('../models/industry.model');
      const industryDoc = await Industry.findById(industry);
      
      if (!industryDoc || !industryDoc.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Industry not found or inactive'
        });
      }
      
      industryId = industryDoc._id;
      industryName = industryDoc.title;
      query.industryId = industryId;
      
      // If subIndustryId is provided, validate it belongs to this industry
      if (subIndustryId) {
        const subcategory = industryDoc.subcategories.find(sub => sub.id === subIndustryId);
        if (!subcategory) {
          return res.status(400).json({
            success: false,
            message: `Subcategory "${subIndustryId}" not found in industry "${industryDoc.title}"`
          });
        }
        query.subIndustryId = subIndustryId;
      }
    } else {
      // Industry param is a name (legacy support)
      // Try to find industry by name
      const Industry = require('../models/industry.model');
      const industryDoc = await Industry.findOne({
        title: { $regex: `^${industry}$`, $options: 'i' },
        isActive: true
      });
      
      if (!industryDoc) {
        return res.status(404).json({
          success: false,
          message: 'Industry not found. Please use industry ID or check the industry name.'
        });
      }
      
      industryId = industryDoc._id;
      industryName = industryDoc.title;
      query.industryId = industryId;
      
      // If subIndustryId is provided, validate it belongs to this industry
      if (subIndustryId) {
        const subcategory = industryDoc.subcategories.find(sub => sub.id === subIndustryId);
        if (!subcategory) {
          return res.status(400).json({
            success: false,
            message: `Subcategory "${subIndustryId}" not found in industry "${industryDoc.title}"`
          });
        }
        query.subIndustryId = subIndustryId;
      }
    }


    if (nearby === 'true' || nearby === true) {
      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required for nearby filter'
        });
      }

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const maxDist = parseFloat(maxDistance);

      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({
          success: false,
          message: 'Invalid latitude or longitude values'
        });
      }

      query['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: maxDist
        }
      };
    }

    if (topRated === 'true' || topRated === true) {
      const ratingStats = await BusinessProfile.aggregate([
        {
          $match: {
            industryId: industryId
          }
        },
        {
          $group: {
            _id: null,
            withRatings: {
              $sum: { $cond: [{ $gt: ['$metrics.ratingAverage', 0] }, 1, 0] }
            },
            topRated: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ['$metrics.ratingAverage', 3.5] },
                      { $gte: ['$metrics.ratingCount', 10] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      const stats = ratingStats[0] || {};
      
      if (stats.topRated > 0) {
        query['metrics.ratingAverage'] = { $gte: 3.5 };
        query['metrics.ratingCount'] = { $gte: 10 };
      } else if (stats.withRatings > 0) {
        query['metrics.ratingAverage'] = { $gt: 0 };
        query['metrics.ratingCount'] = { $gt: 0 };
      }
    }

    if (price) {
      const validPriceRanges = ['$', '$$', '$$$', '$$$$'];
      if (Array.isArray(price)) {
        const validPrices = price.filter(p => validPriceRanges.includes(p));
        if (validPrices.length > 0) {
          query.priceRange = { $in: validPrices };
        }
      } else if (validPriceRanges.includes(price)) {
        query.priceRange = price;
      }
    }

    const selectFields = '_id userId businessName username logo coverImage industry subIndustry industryId subIndustryId priceRange location.address location.city location.state location.country location.coordinates completionPercentage builderPageId folderId createdAt updatedAt metrics.ratingAverage metrics.ratingCount';

    const sort = {};
    if (nearby === 'true' || nearby === true) {
      sort['metrics.ratingAverage'] = -1;
    } else if (topRated === 'true' || topRated === true) {
      sort['metrics.ratingAverage'] = -1;
      sort['metrics.ratingCount'] = -1;
    } else if (openNow === 'true' || openNow === true) {
      sort['metrics.ratingAverage'] = -1;
      sort['metrics.viewCount'] = -1;
    } else {
      sort.updatedAt = -1;
    }

    let profiles = await BusinessProfile.find(query)
      .select(selectFields)
      .populate('userId', 'firstName lastName')
      .sort(sort)
      .lean();

    if ((nearby === 'true' || nearby === true) && latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      
      profiles = profiles.map(profile => {
        if (profile.location && profile.location.coordinates && profile.location.coordinates.coordinates) {
          const [profLng, profLat] = profile.location.coordinates.coordinates;
          const distance = calculateDistance(lat, lng, profLat, profLng);
          return { ...profile, distance };
        }
        return profile;
      });
    }

    res.status(200).json({
      success: true,
      data: { profiles }
    });
  } catch (error) {
    next(error);
  }
};

// Upload logo
exports.uploadLogo = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Validate file
    const { error } = validateImageUpload(req.file);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // Find profile
    const profile = await BusinessProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Business profile not found',
      });
    }

    // Delete old logo if exists
    if (profile.logo) {
      const oldPublicId = extractPublicId(profile.logo);
      if (oldPublicId) {
        try {
          await deleteImage(oldPublicId);
        } catch (deleteError) {
          console.error('Error deleting old logo:', deleteError);
        }
      }
    }

    // Upload new logo to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file.buffer, {
      public_id: `kunex/business-logos/${userId}_${Date.now()}`,
      folder: 'kunex/business-logos',
      transformation: [
        { width: 300, height: 300, crop: 'fill', quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    });

    // Update profile with new logo URL
    profile.logo = uploadResult.secure_url;
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Logo uploaded successfully',
      data: {
        logo: uploadResult.secure_url,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Upload cover images
exports.uploadCoverImages = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Validate files
    const { error } = validateMultipleImageUpload(req.files);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // Find profile
    const profile = await BusinessProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Business profile not found',
      });
    }

    // Delete old cover images if they exist
    if (profile.coverImages && profile.coverImages.length > 0) {
      for (const imageUrl of profile.coverImages) {
        const publicId = extractPublicId(imageUrl);
        if (publicId) {
          try {
            await deleteImage(publicId);
          } catch (deleteError) {
            console.error('Error deleting old cover image:', deleteError);
          }
        }
      }
    }

    // Upload new cover images to Cloudinary
    const uploadPromises = req.files.map((file, index) =>
      uploadToCloudinary(file.buffer, {
        public_id: `kunex/business-covers/${userId}_${Date.now()}_${index}`,
        folder: 'kunex/business-covers',
        transformation: [
          { width: 800, height: 400, crop: 'fill', quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      })
    );

    const uploadResults = await Promise.all(uploadPromises);
    const coverImageUrls = uploadResults.map(result => result.secure_url);

    // Update profile with new cover image URLs
    profile.coverImages = coverImageUrls;
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Cover images uploaded successfully',
      data: {
        coverImages: coverImageUrls,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete logo
exports.deleteLogo = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const profile = await BusinessProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Business profile not found',
      });
    }

    if (!profile.logo) {
      return res.status(400).json({
        success: false,
        message: 'No logo to delete',
      });
    }

    // Delete logo from Cloudinary
    const publicId = extractPublicId(profile.logo);
    if (publicId) {
      try {
        await deleteImage(publicId);
      } catch (deleteError) {
        console.error('Error deleting logo:', deleteError);
      }
    }

    // Remove logo URL from profile
    profile.logo = null;
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Logo deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Delete cover images
exports.deleteCoverImages = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const profile = await BusinessProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Business profile not found',
      });
    }

    if (!profile.coverImages || profile.coverImages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No cover images to delete',
      });
    }

    // Delete cover images from Cloudinary
    for (const imageUrl of profile.coverImages) {
      const publicId = extractPublicId(imageUrl);
      if (publicId) {
        try {
          await deleteImage(publicId);
        } catch (deleteError) {
          console.error('Error deleting cover image:', deleteError);
        }
      }
    }

    // Remove cover image URLs from profile
    profile.coverImages = [];
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Cover images deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Search business profiles
exports.searchProfiles = async (req, res, next) => {
  try {
    // Validate search parameters
    const { error, value } = validateSearchBusinessProfiles(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const {
      search,
      businessType,
      industry,
      priceRange,
      city,
      state,
      country,
      features,
      minRating,
      isOnlineOnly,
      openedStatus,
      page,
      limit,
      sortBy,
      sortOrder
    } = value;

    // Build query
    const query = {};

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Filter by business type
    if (businessType) {
      query.businessType = businessType;
    }

    // Filter by industry
    if (industry) {
      query.industry = new RegExp(industry, 'i');
    }

    // Filter by price range
    if (priceRange) {
      query.priceRange = priceRange;
    }

    // Filter by location
    if (city) {
      query['location.city'] = new RegExp(city, 'i');
    }
    if (state) {
      query['location.state'] = new RegExp(state, 'i');
    }
    if (country) {
      query['location.country'] = new RegExp(country, 'i');
    }

    // Filter by online only
    if (typeof isOnlineOnly === 'boolean') {
      query['location.isOnlineOnly'] = isOnlineOnly;
    }

    // Filter by features
    if (features) {
      const featureArray = Array.isArray(features) ? features : [features];
      query.features = { $in: featureArray.map(f => new RegExp(f, 'i')) };
    }

    // Filter by minimum rating
    if (minRating) {
      query['metrics.ratingAverage'] = { $gte: minRating };
    }


    // Build sort object
    const sort = {};
    if (search && !sortBy) {
      sort.score = { $meta: 'textScore' };
    } else {
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query
    let profiles = await BusinessProfile.find(query)
      .populate('userId', 'firstName lastName')
      .populate('builderPageId', 'serviceHours')
      .select('-__v')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    if (openedStatus === 'open' && profiles.length > 0) {
      profiles = profiles.filter(profile => {
        if (!profile || typeof profile !== 'object') {
          return false;
        }
        
        if (!profile.builderPageId || typeof profile.builderPageId !== 'object') {
          return false;
        }
        
        if (!profile.builderPageId.serviceHours || typeof profile.builderPageId.serviceHours !== 'object') {
          return false;
        }
        
        const serviceHours = profile.builderPageId.serviceHours;
        const { validateTimezone } = require('../utils/timezoneValidation');
        const timezone = validateTimezone(serviceHours.timezone, 'UTC');
        const currentTimeInfo = getCurrentTimeInTimezone(timezone);
        
        if (!currentTimeInfo || !currentTimeInfo.time || !currentTimeInfo.day) {
          return false;
        }
        
        const businessCurrentDay = currentTimeInfo.day;
        const businessCurrentTime = currentTimeInfo.time;
        
        const todayHours = getServiceHoursForDay(serviceHours, businessCurrentDay);
        if (!todayHours || typeof todayHours !== 'object') {
          return false;
        }
        
        const currentTimeSeconds = timeToSeconds(businessCurrentTime);
        const openSeconds = timeToSeconds(todayHours.open);
        const closeSeconds = timeToSeconds(todayHours.close);
        
        if (currentTimeSeconds === null || typeof currentTimeSeconds !== 'number' || isNaN(currentTimeSeconds)) {
          return false;
        }
        
        if (openSeconds === null || typeof openSeconds !== 'number' || isNaN(openSeconds)) {
          return false;
        }
        
        if (closeSeconds === null || typeof closeSeconds !== 'number' || isNaN(closeSeconds)) {
          return false;
        }
        
        if (closeSeconds < openSeconds) {
          return currentTimeSeconds >= openSeconds || currentTimeSeconds < closeSeconds;
        }
        
        return currentTimeSeconds >= openSeconds && currentTimeSeconds < closeSeconds;
      });
    }

    const totalCount = await BusinessProfile.countDocuments(query);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      data: {
        profiles,
        pagination: {
          currentPage: page,
          totalPages,
          totalProfiles: totalCount,
          hasNextPage,
          hasPrevPage,
          limit
        }
      },
    });
  } catch (error) {
    next(error);
  }
};

// Find nearby business profiles
exports.findNearbyProfiles = async (req, res, next) => {
  try {
    // Validate location parameters
    const { error, value } = validateLocationSearch(req.query);
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
      maxDistance,
      limit,
      businessType,
      industry,
      priceRange,
      minRating,
      openedStatus
    } = value;

    // Build query
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

    // Add additional filters
    if (businessType) {
      query.businessType = businessType;
    }
    if (industry) {
      query.industry = new RegExp(industry, 'i');
    }
    if (priceRange) {
      query.priceRange = priceRange;
    }
    if (minRating) {
      query['metrics.ratingAverage'] = { $gte: minRating };
    }

    let profiles = await BusinessProfile.find(query)
      .populate('userId', 'firstName lastName')
      .populate('builderPageId', 'serviceHours')
      .select('-__v')
      .limit(limit)
      .lean();

    if (openedStatus === 'open' && profiles.length > 0) {
      profiles = profiles.filter(profile => {
        if (!profile || typeof profile !== 'object') {
          return false;
        }
        
        if (!profile.builderPageId || typeof profile.builderPageId !== 'object') {
          return false;
        }
        
        if (!profile.builderPageId.serviceHours || typeof profile.builderPageId.serviceHours !== 'object') {
          return false;
        }
        
        const serviceHours = profile.builderPageId.serviceHours;
        const { validateTimezone } = require('../utils/timezoneValidation');
        const timezone = validateTimezone(serviceHours.timezone, 'UTC');
        const currentTimeInfo = getCurrentTimeInTimezone(timezone);
        
        if (!currentTimeInfo || !currentTimeInfo.time || !currentTimeInfo.day) {
          return false;
        }
        
        const businessCurrentDay = currentTimeInfo.day;
        const businessCurrentTime = currentTimeInfo.time;
        
        const todayHours = getServiceHoursForDay(serviceHours, businessCurrentDay);
        if (!todayHours || typeof todayHours !== 'object') {
          return false;
        }
        
        const currentTimeSeconds = timeToSeconds(businessCurrentTime);
        const openSeconds = timeToSeconds(todayHours.open);
        const closeSeconds = timeToSeconds(todayHours.close);
        
        if (currentTimeSeconds === null || typeof currentTimeSeconds !== 'number' || isNaN(currentTimeSeconds)) {
          return false;
        }
        
        if (openSeconds === null || typeof openSeconds !== 'number' || isNaN(openSeconds)) {
          return false;
        }
        
        if (closeSeconds === null || typeof closeSeconds !== 'number' || isNaN(closeSeconds)) {
          return false;
        }
        
        if (closeSeconds < openSeconds) {
          return currentTimeSeconds >= openSeconds || currentTimeSeconds < closeSeconds;
        }
        
        return currentTimeSeconds >= openSeconds && currentTimeSeconds < closeSeconds;
      });
    }

    // Calculate distances
    const profilesWithDistance = profiles.map(profile => {
      if (profile.location && profile.location.coordinates && profile.location.coordinates.coordinates) {
        const [profLng, profLat] = profile.location.coordinates.coordinates;
        const distance = calculateDistance(latitude, longitude, profLat, profLng);
        return { ...profile, distance };
      }
      return profile;
    });

    res.status(200).json({
      success: true,
      data: {
        profiles: profilesWithDistance,
        searchCenter: { latitude, longitude },
        maxDistance: maxDistance / 1000 // Convert to km
      },
    });
  } catch (error) {
    next(error);
  }
};

// Check username availability
exports.checkUsernameAvailability = async (req, res, next) => {
  try {
    const { error, value } = validateUsername(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const { username } = value;
    const userId = req.user.id;

    const existingProfile = await BusinessProfile.findOne({
      username,
      userId: { $ne: userId }
    });

    const isAvailable = !existingProfile;

    res.status(200).json({
      success: true,
      data: {
        username,
        isAvailable,
        message: isAvailable ? 'Username is available' : 'Username is already taken'
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateBusinessHours = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const profile = await BusinessProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Business profile not found',
      });
    }

    const builderPage = await BuilderPage.findOne({ businessId: profile._id });
    if (!builderPage) {
      return res.status(404).json({
        success: false,
        message: 'Builder page not found. Please create a page first.',
      });
    }

    const { weeklyHours, timezone } = req.body;
    if (!weeklyHours || !Array.isArray(weeklyHours)) {
      return res.status(400).json({
        success: false,
        message: 'weeklyHours array is required',
      });
    }

    const validDays = ['Mon', 'Tues', 'Wed', 'Thur', 'Fri', 'Sat', 'Sun'];
    for (const dayHours of weeklyHours) {
      if (!validDays.includes(dayHours.day)) {
        return res.status(400).json({
          success: false,
          message: `Invalid day: ${dayHours.day}. Must be one of: ${validDays.join(', ')}`,
        });
      }

      if (!dayHours.isClosed && (!dayHours.startTime || !dayHours.endTime)) {
        return res.status(400).json({
          success: false,
          message: `Start time and end time are required for ${dayHours.day} when not closed`,
        });
      }
    }

    builderPage.serviceHours.weeklyHours = weeklyHours;
    if (builderPage.serviceHours.type !== 'event-dates') {
      builderPage.serviceHours.type = 'weekly';
    } else {
      builderPage.serviceHours.type = 'both';
    }

    if (timezone) {
      const { validateTimezone } = require('../utils/timezoneValidation');
      builderPage.serviceHours.timezone = validateTimezone(timezone, builderPage.serviceHours.timezone || 'UTC');
    }

    await builderPage.save();

    let todayHours = null;
    let isCurrentlyOpen = false;
    
    try {
      const now = new Date();
      if (!isNaN(now.getTime()) && builderPage.serviceHours) {
        const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
        if (currentDay && typeof currentDay === 'string') {
          todayHours = getServiceHoursForDay(builderPage.serviceHours, currentDay);
          isCurrentlyOpen = checkIfCurrentlyOpenFromServiceHours(builderPage.serviceHours);
        }
      }
    } catch (error) {
      todayHours = null;
      isCurrentlyOpen = false;
    }

    res.status(200).json({
      success: true,
      message: 'Business hours updated successfully',
      data: {
        serviceHours: builderPage.serviceHours,
        todayHours,
        isCurrentlyOpen
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get business analytics/metrics
exports.getAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const profile = await BusinessProfile.findOne({ userId })
      .populate('builderPageId', 'serviceHours');
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Business profile not found',
      });
    }

    const analytics = {
      metrics: profile.metrics,
      completionPercentage: profile.completionPercentage,
      profileAge: Math.floor((Date.now() - profile.createdAt) / (1000 * 60 * 60 * 24)),
      lastUpdated: profile.updatedAt,
      hasLogo: !!profile.logo,
      hasCoverImages: profile.coverImages && profile.coverImages.length > 0,
      hasBusinessHours: profile.builderPageId && profile.builderPageId.serviceHours && profile.builderPageId.serviceHours.weeklyHours && profile.builderPageId.serviceHours.weeklyHours.length > 0,
      hasLocation: !!(profile.location && profile.location.address),
      hasCoordinates: !!(profile.location && profile.location.coordinates && profile.location.coordinates.coordinates)
    };

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};

// Delete business profile
exports.deleteProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const profile = await BusinessProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Business profile not found',
      });
    }

    // Delete logo from Cloudinary if exists
    if (profile.logo) {
      const publicId = extractPublicId(profile.logo);
      if (publicId) {
        try {
          await deleteImage(publicId);
        } catch (deleteError) {
          console.error('Error deleting logo:', deleteError);
        }
      }
    }

    // Delete cover images from Cloudinary if exist
    if (profile.coverImages && profile.coverImages.length > 0) {
      for (const imageUrl of profile.coverImages) {
        const publicId = extractPublicId(imageUrl);
        if (publicId) {
          try {
            await deleteImage(publicId);
          } catch (deleteError) {
            console.error('Error deleting cover image:', deleteError);
          }
        }
      }
    }

    // Delete virtual contact photo if exists
    if (profile.virtualContact && profile.virtualContact.photo) {
      const publicId = extractPublicId(profile.virtualContact.photo);
      if (publicId) {
        try {
          await deleteImage(publicId);
        } catch (deleteError) {
          console.error('Error deleting virtual contact photo:', deleteError);
        }
      }
    }

    // Delete profile
    await BusinessProfile.findByIdAndDelete(profile._id);

    res.status(200).json({
      success: true,
      message: 'Business profile deleted successfully',
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
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
} 