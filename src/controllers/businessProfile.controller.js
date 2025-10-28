const BusinessProfile = require('../models/businessProfile.model');
const BuilderPage = require('../models/builderPage.model');
const Folder = require('../models/folder.model');
const User = require('../models/user.model');
const { uploadToCloudinary, deleteImage, extractPublicId } = require('../utils/cloudinary');
const {
  validateCreateBusinessProfile,
  validateUpdateBusinessProfile,
  validateSearchBusinessProfiles,
  validateLocationSearch,
  validateImageUpload,
  validateMultipleImageUpload,
  validateUsername,
  validateBusinessHours
} = require('../utils/businessProfileValidation');

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

    // Check username availability
    const existingUsername = await BusinessProfile.findOne({ username: value.username });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username is already taken',
      });
    }

    // Create new profile
    const profileData = {
      userId,
      ...value,
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
      builderPage.priceRange = value.priceRange || builderPage.priceRange;
      builderPage.location = value.location?.address || builderPage.location;
      builderPage.logo = value.logo || builderPage.logo;
      builderPage.username = value.username || builderPage.username;
      builderPage.cover = value.coverImage || builderPage.cover;
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
        priceRange: value.priceRange || '$',
        location: value.location?.address || '',
        logo: value.logo || '',
        username: value.username || '',
        cover: value.coverImage || '',
        pageType: 'landing', // Default to landing page
        template: {
          name: 'Business Landing Page',
          category: 'business', // Map businessType to template category
          version: '1.0'
        },
        isPublished: true
      };

      builderPage = new BuilderPage(builderPageData);
      await builderPage.save();
    }

    // Update profile with folderId
    profile.folderId = defaultFolder._id;
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
      .populate('userId', 'email firstName lastName');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Business profile not found',
      });
    }

    // Calculate completion percentage
    const completionPercentage = profile.calculateCompletionPercentage();

    res.status(200).json({
      success: true,
      data: {
        profile,
        completionPercentage,
        todayHours: profile.todayHours,
        isCurrentlyOpen: profile.isCurrentlyOpen
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
      .select('-__v');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Business profile not found',
      });
    }

    // Increment view count
    await profile.incrementViewCount();

    res.status(200).json({
      success: true,
      data: {
        profile,
        todayHours: profile.todayHours,
        isCurrentlyOpen: profile.isCurrentlyOpen
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

    // Update profile
    Object.assign(profile, value);
    await profile.save();

    // Sync to BuilderPage if profile has _id
    const builderPage = await BuilderPage.findOne({ businessId: profile._id });
    if (builderPage) {
      const syncData = {};
      
      // Always sync all relevant fields to keep them in sync
      syncData.title = profile.businessName;
      syncData.username = profile.username;
      syncData.logo = profile.logo;
      syncData.cover = profile.coverImage;
      syncData.priceRange = profile.priceRange;
      syncData.folderId = profile.folderId;
      
      if (profile.location?.address) {
        syncData.location = profile.location.address;
      }
      
      // Update builder page
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
    const [profiles, totalCount] = await Promise.all([
      BusinessProfile.find(query)
        .populate('userId', 'firstName lastName')
        .select('-__v')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      BusinessProfile.countDocuments(query)
    ]);

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
      minRating
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

    // Execute query
    const profiles = await BusinessProfile.find(query)
      .populate('userId', 'firstName lastName')
      .select('-__v')
      .limit(limit)
      .lean();

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

// Update business hours
exports.updateBusinessHours = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Validate business hours
    const { error, value } = validateBusinessHours(req.body);
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

    // Update business hours
    profile.businessHours = value;
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Business hours updated successfully',
      data: {
        businessHours: profile.businessHours,
        todayHours: profile.todayHours,
        isCurrentlyOpen: profile.isCurrentlyOpen
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

    const profile = await BusinessProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Business profile not found',
      });
    }

    // Get additional analytics data
    const analytics = {
      metrics: profile.metrics,
      completionPercentage: profile.completionPercentage,
      profileAge: Math.floor((Date.now() - profile.createdAt) / (1000 * 60 * 60 * 24)), // days
      lastUpdated: profile.updatedAt,
      hasLogo: !!profile.logo,
      hasCoverImages: profile.coverImages && profile.coverImages.length > 0,
      hasBusinessHours: profile.businessHours && profile.businessHours.length > 0,
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