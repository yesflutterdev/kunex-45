const PersonalProfile = require('../models/personalProfile.model');
const User = require('../models/user.model');
const { uploadToCloudinary, deleteImage, extractPublicId } = require('../utils/cloudinary');
const {
  validateCreatePersonalProfile,
  validateUpdatePersonalProfile,
  validateLocationSearch,
  validateProfilePhotoUpload,
  validateSearchProfiles
} = require('../utils/personalProfileValidation');

// Create personal profile
exports.createProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Check if profile already exists
    const existingProfile = await PersonalProfile.findOne({ userId });
    if (existingProfile) {
      return res.status(400).json({
        success: false,
        message: 'Personal profile already exists for this user',
      });
    }

    // Validate input data
    const { error, value } = validateCreatePersonalProfile(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    // Create new profile
    const profileData = {
      userId,
      ...value,
    };

    const profile = new PersonalProfile(profileData);
    await profile.save();

    // Populate user data
    await profile.populate('userId', 'email username');

    // Calculate completion percentage
    const completionPercentage = profile.calculateCompletionPercentage();

    res.status(201).json({
      success: true,
      message: 'Personal profile created successfully',
      data: {
        profile,
        completionPercentage,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get personal profile
exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const profile = await PersonalProfile.findOne({ userId })
      .populate('userId', 'email username');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Personal profile not found',
      });
    }

    // Calculate completion percentage
    const completionPercentage = profile.calculateCompletionPercentage();

    res.status(200).json({
      success: true,
      data: {
        profile,
        completionPercentage,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get profile by ID (public view)
exports.getProfileById = async (req, res, next) => {
  try {
    const { profileId } = req.params;

    const profile = await PersonalProfile.findById(profileId)
      .populate('userId', 'email username');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Personal profile not found',
      });
    }

    // Return limited public information
    const publicProfile = {
      _id: profile._id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      profilePhoto: profile.profilePhoto,
      bio: profile.bio,
      interests: profile.interests,
      location: {
        city: profile.location?.city,
        state: profile.location?.state,
        country: profile.location?.country,
      },
      socialMedia: profile.socialMedia,
      createdAt: profile.createdAt,
    };

    res.status(200).json({
      success: true,
      data: {
        profile: publicProfile,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update personal profile
exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Validate input data
    const { error, value } = validateUpdatePersonalProfile(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    // Find and update profile
    const profile = await PersonalProfile.findOneAndUpdate(
      { userId },
      { ...value, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('userId', 'email username');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Personal profile not found',
      });
    }

    // Calculate completion percentage
    const completionPercentage = profile.calculateCompletionPercentage();

    res.status(200).json({
      success: true,
      message: 'Personal profile updated successfully',
      data: {
        profile,
        completionPercentage,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Upload profile photo
exports.uploadProfilePhoto = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Validate file
    const { error } = validateProfilePhotoUpload(req.file);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // Find profile
    const profile = await PersonalProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Personal profile not found',
      });
    }

    // Delete old photo if exists
    if (profile.profilePhoto) {
      const oldPublicId = extractPublicId(profile.profilePhoto);
      if (oldPublicId) {
        try {
          await deleteImage(oldPublicId);
        } catch (deleteError) {
          console.error('Error deleting old profile photo:', deleteError);
        }
      }
    }

    // Upload new photo to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file.buffer, {
      public_id: `kunex/profile-photos/${userId}_${Date.now()}`,
    });

    // Update profile with new photo URL
    profile.profilePhoto = uploadResult.secure_url;
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Profile photo uploaded successfully',
      data: {
        profilePhoto: uploadResult.secure_url,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete profile photo
exports.deleteProfilePhoto = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const profile = await PersonalProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Personal profile not found',
      });
    }

    if (!profile.profilePhoto) {
      return res.status(400).json({
        success: false,
        message: 'No profile photo to delete',
      });
    }

    // Delete photo from Cloudinary
    const publicId = extractPublicId(profile.profilePhoto);
    if (publicId) {
      try {
        await deleteImage(publicId);
      } catch (deleteError) {
        console.error('Error deleting profile photo:', deleteError);
      }
    }

    // Remove photo URL from profile
    profile.profilePhoto = undefined;
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Profile photo deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Search profiles
exports.searchProfiles = async (req, res, next) => {
  try {
    // Validate search parameters
    const { error, value } = validateSearchProfiles(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    const {
      search,
      city,
      country,
      interests,
      gender,
      ageMin,
      ageMax,
      page,
      limit,
      sortBy,
      sortOrder
    } = value;

    // Build search query
    const query = {};

    // Text search in firstName, lastName, bio
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } },
      ];
    }

    // Location filters
    if (city) {
      query['location.city'] = { $regex: city, $options: 'i' };
    }
    if (country) {
      query['location.country'] = { $regex: country, $options: 'i' };
    }

    // Interest filter
    if (interests && interests.length > 0) {
      query.interests = { $in: interests.map(interest => new RegExp(interest, 'i')) };
    }

    // Gender filter
    if (gender) {
      query.gender = gender;
    }

    // Age filter
    if (ageMin || ageMax) {
      const now = new Date();
      const ageQuery = {};
      
      if (ageMax) {
        const minBirthDate = new Date(now.getFullYear() - ageMax - 1, now.getMonth(), now.getDate());
        ageQuery.$gte = minBirthDate;
      }
      
      if (ageMin) {
        const maxBirthDate = new Date(now.getFullYear() - ageMin, now.getMonth(), now.getDate());
        ageQuery.$lte = maxBirthDate;
      }
      
      query.dateOfBirth = ageQuery;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute search
    const [profiles, total] = await Promise.all([
      PersonalProfile.find(query)
        .select('firstName lastName profilePhoto bio interests location.city location.country createdAt')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      PersonalProfile.countDocuments(query)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      data: {
        profiles,
        pagination: {
          currentPage: page,
          totalPages,
          totalProfiles: total,
          hasNextPage,
          hasPrevPage,
          limit,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Find nearby profiles
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

    const { longitude, latitude, maxDistance, limit } = value;

    // Find nearby profiles
    const profiles = await PersonalProfile.findNearby(longitude, latitude, maxDistance)
      .select('firstName lastName profilePhoto bio location.city location.country location.coordinates')
      .limit(limit)
      .lean();

    // Calculate distances
    const profilesWithDistance = profiles.map(profile => {
      let distance = null;
      if (profile.location?.coordinates?.coordinates) {
        const [profLng, profLat] = profile.location.coordinates.coordinates;
        // Calculate distance using Haversine formula
        distance = calculateDistance(latitude, longitude, profLat, profLng);
      }
      return { ...profile, distance };
    });

    res.status(200).json({
      success: true,
      data: {
        profiles: profilesWithDistance,
        searchLocation: { longitude, latitude },
        maxDistance,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete personal profile
exports.deleteProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const profile = await PersonalProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Personal profile not found',
      });
    }

    // Delete profile photo from Cloudinary if exists
    if (profile.profilePhoto) {
      const publicId = extractPublicId(profile.profilePhoto);
      if (publicId) {
        try {
          await deleteImage(publicId);
        } catch (deleteError) {
          console.error('Error deleting profile photo:', deleteError);
        }
      }
    }

    // Delete profile
    await PersonalProfile.findByIdAndDelete(profile._id);

    res.status(200).json({
      success: true,
      message: 'Personal profile deleted successfully',
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
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
} 