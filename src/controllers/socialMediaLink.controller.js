const SocialMediaLink = require('../models/socialMediaLink.model');
const BusinessProfile = require('../models/businessProfile.model');
const {
  validateCreateSocialMediaLink,
  validateUpdateSocialMediaLink,
  validateSearchSocialMediaLinks,
  validateBulkUpdateOrder,
  validateEmbedSettings,
  validateMetadataUpdate,
  validateSocialMediaLinkId,
  validatePlatformUrl
} = require('../utils/socialMediaValidation');
const { AppError } = require('../utils/errorHandler');

/**
 * @desc    Create a new social media link
 * @route   POST /api/social-media
 * @access  Private
 */
exports.createSocialMediaLink = async (req, res, next) => {
  try {
    // Validate input
    const { error, value } = validateCreateSocialMediaLink(req.body);
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    // Validate platform URL compatibility
    const urlValidation = validatePlatformUrl(value.platform, value.originalUrl);
    if (!urlValidation.isValid) {
      return next(new AppError(urlValidation.message, 400));
    }

    // Check if business profile exists if businessId is provided
    if (value.businessId) {
      const businessProfile = await BusinessProfile.findOne({
        _id: value.businessId,
        userId: req.user.id
      });
      
      if (!businessProfile) {
        return next(new AppError('Business profile not found', 404));
      }
    }

    // Check for duplicate platform for the same user/business
    const existingLink = await SocialMediaLink.findOne({
      userId: req.user.id,
      businessId: value.businessId || null,
      platform: value.platform
    });

    if (existingLink) {
      return next(new AppError(`${value.platform} link already exists for this profile`, 409));
    }

    // Create social media link
    const socialMediaLink = new SocialMediaLink({
      ...value,
      userId: req.user.id
    });

    await socialMediaLink.save();

    res.status(201).json({
      success: true,
      message: 'Social media link created successfully',
      data: socialMediaLink
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all social media links for user
 * @route   GET /api/social-media
 * @access  Private
 */
exports.getSocialMediaLinks = async (req, res, next) => {
  try {
    // Validate query parameters
    const { error, value } = validateSearchSocialMediaLinks(req.query);
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const { businessId, platform, status, isPublic, page, limit, sortBy, sortOrder } = value;

    // Build query
    const query = { userId: req.user.id };
    
    if (businessId) query.businessId = businessId;
    if (platform) query.platform = platform;
    if (status) query.status = status;
    if (typeof isPublic === 'boolean') query.isPublic = isPublic;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [socialMediaLinks, total] = await Promise.all([
      SocialMediaLink.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('businessId', 'businessName username'),
      SocialMediaLink.countDocuments(query)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      success: true,
      data: socialMediaLinks,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get social media link by ID
 * @route   GET /api/social-media/:id
 * @access  Private
 */
exports.getSocialMediaLinkById = async (req, res, next) => {
  try {
    // Validate ID
    const { error } = validateSocialMediaLinkId({ id: req.params.id });
    if (error) {
      return next(new AppError('Invalid social media link ID', 400));
    }

    const socialMediaLink = await SocialMediaLink.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).populate('businessId', 'businessName username');

    if (!socialMediaLink) {
      return next(new AppError('Social media link not found', 404));
    }

    res.json({
      success: true,
      data: socialMediaLink
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update social media link
 * @route   PUT /api/social-media/:id
 * @access  Private
 */
exports.updateSocialMediaLink = async (req, res, next) => {
  try {
    // Validate ID
    const { error: idError } = validateSocialMediaLinkId({ id: req.params.id });
    if (idError) {
      return next(new AppError('Invalid social media link ID', 400));
    }

    // Validate input
    const { error, value } = validateUpdateSocialMediaLink(req.body);
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    // Find existing link
    const socialMediaLink = await SocialMediaLink.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!socialMediaLink) {
      return next(new AppError('Social media link not found', 404));
    }

    // Validate platform URL compatibility if URL or platform is being updated
    if (value.originalUrl || value.platform) {
      const platform = value.platform || socialMediaLink.platform;
      const url = value.originalUrl || socialMediaLink.originalUrl;
      
      const urlValidation = validatePlatformUrl(platform, url);
      if (!urlValidation.isValid) {
        return next(new AppError(urlValidation.message, 400));
      }
    }

    // Check for duplicate platform if platform is being changed
    if (value.platform && value.platform !== socialMediaLink.platform) {
      const existingLink = await SocialMediaLink.findOne({
        userId: req.user.id,
        businessId: socialMediaLink.businessId,
        platform: value.platform,
        _id: { $ne: req.params.id }
      });

      if (existingLink) {
        return next(new AppError(`${value.platform} link already exists for this profile`, 409));
      }
    }

    // Check if business profile exists if businessId is being updated
    if (value.businessId && value.businessId !== socialMediaLink.businessId?.toString()) {
      const businessProfile = await BusinessProfile.findOne({
        _id: value.businessId,
        userId: req.user.id
      });
      
      if (!businessProfile) {
        return next(new AppError('Business profile not found', 404));
      }
    }

    // Update the link
    Object.assign(socialMediaLink, value);
    await socialMediaLink.save();

    res.json({
      success: true,
      message: 'Social media link updated successfully',
      data: socialMediaLink
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete social media link
 * @route   DELETE /api/social-media/:id
 * @access  Private
 */
exports.deleteSocialMediaLink = async (req, res, next) => {
  try {
    // Validate ID
    const { error } = validateSocialMediaLinkId({ id: req.params.id });
    if (error) {
      return next(new AppError('Invalid social media link ID', 400));
    }

    const socialMediaLink = await SocialMediaLink.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!socialMediaLink) {
      return next(new AppError('Social media link not found', 404));
    }

    res.json({
      success: true,
      message: 'Social media link deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update embed settings for a social media link
 * @route   PUT /api/social-media/:id/embed-settings
 * @access  Private
 */
exports.updateEmbedSettings = async (req, res, next) => {
  try {
    // Validate ID
    const { error: idError } = validateSocialMediaLinkId({ id: req.params.id });
    if (idError) {
      return next(new AppError('Invalid social media link ID', 400));
    }

    // Validate embed settings
    const { error, value } = validateEmbedSettings(req.body);
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const socialMediaLink = await SocialMediaLink.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!socialMediaLink) {
      return next(new AppError('Social media link not found', 404));
    }

    // Update embed settings
    socialMediaLink.embedSettings = value;
    await socialMediaLink.save();

    res.json({
      success: true,
      message: 'Embed settings updated successfully',
      data: socialMediaLink
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update metadata for a social media link
 * @route   PUT /api/social-media/:id/metadata
 * @access  Private
 */
exports.updateMetadata = async (req, res, next) => {
  try {
    // Validate ID
    const { error: idError } = validateSocialMediaLinkId({ id: req.params.id });
    if (idError) {
      return next(new AppError('Invalid social media link ID', 400));
    }

    // Validate metadata
    const { error, value } = validateMetadataUpdate(req.body);
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const socialMediaLink = await SocialMediaLink.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!socialMediaLink) {
      return next(new AppError('Social media link not found', 404));
    }

    // Update metadata
    await socialMediaLink.updateMetadata(value);

    res.json({
      success: true,
      message: 'Metadata updated successfully',
      data: socialMediaLink
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk update display order of social media links
 * @route   PUT /api/social-media/bulk-order
 * @access  Private
 */
exports.bulkUpdateOrder = async (req, res, next) => {
  try {
    // Validate input
    const { error, value } = validateBulkUpdateOrder(req.body);
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const { links } = value;

    // Verify all links belong to the user
    const linkIds = links.map(link => link.id);
    const existingLinks = await SocialMediaLink.find({
      _id: { $in: linkIds },
      userId: req.user.id
    });

    if (existingLinks.length !== links.length) {
      return next(new AppError('Some social media links not found or do not belong to you', 404));
    }

    // Update display orders
    const bulkOps = links.map(link => ({
      updateOne: {
        filter: { _id: link.id, userId: req.user.id },
        update: { displayOrder: link.displayOrder }
      }
    }));

    await SocialMediaLink.bulkWrite(bulkOps);

    res.json({
      success: true,
      message: 'Display order updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Track click on social media link
 * @route   POST /api/social-media/:id/click
 * @access  Public
 */
exports.trackClick = async (req, res, next) => {
  try {
    // Validate ID
    const { error } = validateSocialMediaLinkId({ id: req.params.id });
    if (error) {
      return next(new AppError('Invalid social media link ID', 400));
    }

    const socialMediaLink = await SocialMediaLink.findById(req.params.id);

    if (!socialMediaLink) {
      return next(new AppError('Social media link not found', 404));
    }

    if (!socialMediaLink.isPublic) {
      return next(new AppError('Social media link is not public', 403));
    }

    // Increment click count
    await socialMediaLink.incrementClicks();

    res.json({
      success: true,
      message: 'Click tracked successfully',
      data: {
        url: socialMediaLink.normalizedUrl,
        clicks: socialMediaLink.clicks
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get public social media links for a business profile
 * @route   GET /api/social-media/public/business/:username
 * @access  Public
 */
exports.getPublicBusinessLinks = async (req, res, next) => {
  try {
    const { username } = req.params;

    // Find business profile
    const businessProfile = await BusinessProfile.findOne({ username });
    if (!businessProfile) {
      return next(new AppError('Business profile not found', 404));
    }

    // Get public social media links
    const socialMediaLinks = await SocialMediaLink.find({
      businessId: businessProfile._id,
      isPublic: true,
      status: 'active'
    }).sort({ displayOrder: 1 });

    res.json({
      success: true,
      data: socialMediaLinks
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get public social media links for a user
 * @route   GET /api/social-media/public/user/:userId
 * @access  Public
 */
exports.getPublicUserLinks = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Validate user ID
    if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
      return next(new AppError('Invalid user ID', 400));
    }

    // Get public social media links for personal profile (no businessId)
    const socialMediaLinks = await SocialMediaLink.find({
      userId,
      businessId: null,
      isPublic: true,
      status: 'active'
    }).sort({ displayOrder: 1 });

    res.json({
      success: true,
      data: socialMediaLinks
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get analytics for social media links
 * @route   GET /api/social-media/analytics
 * @access  Private
 */
exports.getAnalytics = async (req, res, next) => {
  try {
    const { businessId } = req.query;

    // Build query
    const query = { userId: req.user.id };
    if (businessId) query.businessId = businessId;

    // Get analytics data
    const [totalLinks, totalClicks, platformStats, statusStats] = await Promise.all([
      SocialMediaLink.countDocuments(query),
      SocialMediaLink.aggregate([
        { $match: query },
        { $group: { _id: null, totalClicks: { $sum: '$clicks' } } }
      ]),
      SocialMediaLink.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$platform',
            count: { $sum: 1 },
            totalClicks: { $sum: '$clicks' }
          }
        },
        { $sort: { count: -1 } }
      ]),
      SocialMediaLink.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totalLinks,
        totalClicks: totalClicks[0]?.totalClicks || 0,
        platformStats,
        statusStats
      }
    });
  } catch (error) {
    next(error);
  }
}; 