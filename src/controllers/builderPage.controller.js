const BuilderPage = require('../models/builderPage.model');
const Widget = require('../models/widget.model');
const BusinessProfile = require('../models/businessProfile.model');
const FormSubmission = require('../models/formSubmission.model');
const PageReport = require('../models/pagereport.model');
const { uploadToCloudinary, deleteImage } = require('../utils/cloudinary');
const { incrementIndustryViewCount, validateIndustryAndSubcategory } = require('../utils/industryUtils');

// Create a new builder page
exports.createPage = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      title,
      slug,
      description,
      pageType,
      template,
      businessId,
      industryId,
      subIndustryId
    } = req.body;

    if (!title || !slug || !pageType || !template) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, slug, pageType, template'
      });
    }

    const existingPage = await BuilderPage.findOne({ userId, slug });
    if (existingPage) {
      return res.status(400).json({
        success: false,
        message: 'A page with this slug already exists'
      });
    }

    if (businessId) {
      const business = await BusinessProfile.findOne({ _id: businessId, userId });
      if (!business) {
        return res.status(403).json({
          success: false,
          message: 'Business profile not found or access denied'
        });
      }
    }

    let industryName = null;
    
    if (industryId) {
      const industryValidation = await validateIndustryAndSubcategory(industryId, subIndustryId);
      if (!industryValidation.valid) {
        return res.status(400).json({
          success: false,
          message: industryValidation.error,
        });
      }
      
      industryName = industryValidation.industry.title;
    }

    const pageData = {
      userId,
      title,
      slug,
      description,
      pageType,
      template,
      businessId: businessId || null,
      industry: industryName || ''
    };

    const page = new BuilderPage(pageData);
    await page.save();

    if (industryId) {
      await incrementIndustryViewCount(industryId, subIndustryId);
    }

    res.status(201).json({
      success: true,
      message: 'Page created successfully',
      data: { page }
    });
  } catch (error) {
    next(error);
  }
};

// Get all pages for authenticated user
exports.getPages = async (req, res, next) => {
  try {
    const {
      businessId,
      pageType,
      status,
      page = 1,
      limit = 20,
      search,
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};

    if (businessId) {
      query.businessId = businessId;
    }

    if (pageType) {
      query.pageType = pageType;
    }

    if (status) {
      if (status === 'published') {
        query['settings.isPublished'] = true;
      } else if (status === 'draft') {
        query['settings.isDraft'] = true;
      }
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const pages = await BuilderPage.find(query)
      .populate('businessId', 'businessName username logo metrics.favoriteCount')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const pagesWithFavorites = pages.map(page => {
      const favoriteCount = page.businessId?.metrics?.favoriteCount || 0;
      return {
        ...page,
        favoriteCount
      };
    });

    const totalPages = await BuilderPage.countDocuments(query);
    const totalItems = totalPages;
    const totalPagesCount = Math.ceil(totalPages / parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        pages: pagesWithFavorites,
        pagination: {
          current: parseInt(page),
          total: totalPagesCount,
          count: pages.length,
          totalItems
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get page by ID
exports.getPageById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pageId } = req.params;

    const page = await BuilderPage.findOne({ _id: pageId, userId })
      .populate('businessId', 'businessName username logo metrics.favoriteCount')
      .populate('widgets');

    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    const widgets = await Widget.find({ pageId });

    const favoriteCount = page.businessId?.metrics?.favoriteCount || 0;

    res.status(200).json({
      success: true,
      data: {
        page: {
          ...page.toObject(),
          favoriteCount
        },
        widgets,
        currentVersion: page.currentVersion
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get public page by slug
exports.getPublicPage = async (req, res, next) => {
  try {
    const { slug, username } = req.params;

    let query = { slug, 'settings.isPublished': true };

    // If username is provided, find by business username
    if (username) {
      const business = await BusinessProfile.findOne({ username });
      if (!business) {
        return res.status(404).json({
          success: false,
          message: 'Business not found'
        });
      }
      query.businessId = business._id;
    }

    const page = await BuilderPage.findOne(query)
      .populate('businessId', 'businessName username logo metrics.favoriteCount')
      .populate('widgets');

    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    await page.incrementViews();

    const widgets = await Widget.find({ pageId: page._id });

    const favoriteCount = page.businessId?.metrics?.favoriteCount || 0;

    res.status(200).json({
      success: true,
      data: {
        page: {
          ...page.toObject(),
          favoriteCount
        },
        widgets
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update page
exports.updatePage = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pageId } = req.params;
    const updateData = req.body;

    const page = await BuilderPage.findOne({ _id: pageId, userId });
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    // If slug is being updated, check uniqueness
    if (updateData.slug && updateData.slug !== page.slug) {
      const existingPage = await BuilderPage.findOne({
        userId,
        slug: updateData.slug,
        _id: { $ne: pageId }
      });
      if (existingPage) {
        return res.status(400).json({
          success: false,
          message: 'A page with this slug already exists'
        });
      }
    }

    if (updateData.industryId) {
      const industryValidation = await validateIndustryAndSubcategory(updateData.industryId, updateData.subIndustryId);
      if (!industryValidation.valid) {
        return res.status(400).json({
          success: false,
          message: industryValidation.error,
        });
      }
      
      updateData.industry = industryValidation.industry.title;
      delete updateData.industryId;
      if (updateData.subIndustryId) {
        delete updateData.subIndustryId;
      }
    }

    if (updateData.layout || updateData.styling || updateData.seo) {
      page.createVersion('Page content updated');
    }

    Object.assign(page, updateData);
    await page.save();

    // Sync data with BusinessProfile if businessId exists
    if (page.businessId) {
      const syncData = {};

      // Map builder page fields to business profile fields
      if (updateData.title !== undefined) syncData.businessName = updateData.title;
      if (updateData.username !== undefined) syncData.username = updateData.username;
      if (updateData.logo !== undefined) syncData.logo = updateData.logo;
      if (updateData.cover !== undefined) syncData.coverImage = updateData.cover;
      if (updateData.priceRange !== undefined) syncData.priceRange = updateData.priceRange;
      if (updateData.industry !== undefined) syncData.industry = updateData.industry;
      if (updateData.isBusiness !== undefined) syncData.isBusiness = updateData.isBusiness;
      if (updateData.folderId !== undefined) syncData.folderId = updateData.folderId;
      if (updateData.location) {
        // Convert location string to object
        syncData.location = {
          address: updateData.location,
          city: '',
          state: '',
          country: '',
          postalCode: '',
          coordinates: {
            type: 'Point',
            coordinates: [0, 0] // Default coordinates
          }
        };
      }
      // Note: pageType in BuilderPage is different from businessType in BusinessProfile
      // We don't sync pageType to businessType as they serve different purposes

      // Update business profile if there are changes
      if (Object.keys(syncData).length > 0) {
        // Check if business profile exists
        const existingProfile = await BusinessProfile.findById(page.businessId);
        if (!existingProfile) {
          // Find the correct business profile for this user
          const userProfiles = await BusinessProfile.find({ userId }).select('_id businessName username');

          // If there's a business profile for this user, link the builder page to it
          if (userProfiles.length > 0) {
            const correctProfile = userProfiles[0];

            // Update the builder page's businessId
            page.businessId = correctProfile._id;
            await page.save();

            // Sync to the correct profile
            await BusinessProfile.findByIdAndUpdate(
              correctProfile._id,
              { $set: syncData },
              { new: true }
            );
          }

          return;
        }

        // Sync to existing profile
        await BusinessProfile.findByIdAndUpdate(
          page.businessId,
          { $set: syncData },
          { new: true }
        );
      }
    }

    res.status(200).json({
      success: true,
      message: 'Page updated successfully',
      data: { page }
    });
  } catch (error) {
    next(error);
  }
};

// Delete page
exports.deletePage = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pageId } = req.params;

    const page = await BuilderPage.findOne({ _id: pageId, userId });
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    // Delete associated widgets
    await Widget.deleteMany({ pageId: pageId });

    // Delete page
    await BuilderPage.findByIdAndDelete(pageId);

    res.status(200).json({
      success: true,
      message: 'Page deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Publish page
exports.publishPage = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pageId } = req.params;

    const page = await BuilderPage.findOne({ _id: pageId, userId });
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    await page.publish();

    res.status(200).json({
      success: true,
      message: 'Page published successfully',
      data: { page }
    });
  } catch (error) {
    next(error);
  }
};

// Unpublish page
exports.unpublishPage = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pageId } = req.params;

    const page = await BuilderPage.findOne({ _id: pageId, userId });
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    await page.unpublish();

    res.status(200).json({
      success: true,
      message: 'Page unpublished successfully',
      data: { page }
    });
  } catch (error) {
    next(error);
  }
};

// Clone page
exports.clonePage = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pageId } = req.params;
    const { title, slug } = req.body;

    if (!slug) {
      return res.status(400).json({
        success: false,
        message: 'Slug is required for cloned page'
      });
    }

    const originalPage = await BuilderPage.findOne({ _id: pageId, userId });
    if (!originalPage) {
      return res.status(404).json({
        success: false,
        message: 'Original page not found'
      });
    }

    // Check if slug is unique
    const existingPage = await BuilderPage.findOne({ userId, slug });
    if (existingPage) {
      return res.status(400).json({
        success: false,
        message: 'A page with this slug already exists'
      });
    }

    // Create cloned page data
    const clonedData = {
      userId,
      title: title || `${originalPage.title} (Copy)`,
      slug,
      description: originalPage.description,
      pageType: originalPage.pageType,
      template: originalPage.template,
      layout: originalPage.layout,
      styling: originalPage.styling,
      seo: originalPage.seo,
      settings: {
        ...originalPage.settings,
        isPublished: false,
        isDraft: true
      },
      businessId: originalPage.businessId
    };

    const clonedPage = new BuilderPage(clonedData);
    await clonedPage.save();

    res.status(201).json({
      success: true,
      message: 'Page cloned successfully',
      data: { page: clonedPage }
    });
  } catch (error) {
    next(error);
  }
};

// Get page versions
exports.getPageVersions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pageId } = req.params;

    const page = await BuilderPage.findOne({ _id: pageId, userId });
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        versions: page.versions,
        currentVersion: page.currentVersion
      }
    });
  } catch (error) {
    next(error);
  }
};

// Revert to version
exports.revertToVersion = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pageId } = req.params;
    const { versionNumber } = req.body;

    if (!versionNumber) {
      return res.status(400).json({
        success: false,
        message: 'Version number is required'
      });
    }

    const page = await BuilderPage.findOne({ _id: pageId, userId });
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    await page.revertToVersion(versionNumber);

    res.status(200).json({
      success: true,
      message: 'Page reverted successfully',
      data: { page }
    });
  } catch (error) {
    if (error.message === 'Version not found') {
      return res.status(400).json({
        success: false,
        message: 'Version not found'
      });
    }
    next(error);
  }
};

// Get page analytics
exports.getPageAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pageId } = req.params;
    const { period = '30d' } = req.query;

    const page = await BuilderPage.findOne({ _id: pageId, userId });
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    // Get widgets for analytics
    const widgets = await Widget.find({ pageId });

    // Calculate date range
    const now = new Date();
    let startDate;

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Basic analytics summary
    const summary = {
      pageViews: page.analytics.pageViews,
      uniqueVisitors: page.analytics.uniqueVisitors,
      bounceRate: page.analytics.bounceRate,
      avgTimeOnPage: page.analytics.avgTimeOnPage,
      conversionRate: page.analytics.conversionRate,
      period,
      startDate,
      endDate: now
    };

    res.status(200).json({
      success: true,
      data: {
        page: {
          id: page._id,
          title: page.title,
          slug: page.slug
        },
        widgets: widgets.map(widget => ({
          id: widget._id,
          name: widget.name,
          type: widget.type,
          views: widget.analytics?.views || 0,
          clicks: widget.analytics?.clicks || 0
        })),
        summary
      }
    });
  } catch (error) {
    next(error);
  }
};

// Search public pages
exports.searchPages = async (req, res, next) => {
  try {
    const { q, category, pageType, published = true } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    // Build query
    const query = {
      'settings.isPublished': published === 'true',
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { slug: { $regex: q, $options: 'i' } }
      ]
    };

    if (category) {
      query['template.category'] = category;
    }

    if (pageType) {
      query.pageType = pageType;
    }

    const pages = await BuilderPage.find(query)
      .populate('businessId', 'businessName username logo')
      .limit(20);

    res.status(200).json({
      success: true,
      data: {
        pages,
        query: q,
        filters: { category, pageType, published }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get page templates
exports.getPageTemplates = async (req, res, next) => {
  try {
    const { category, pageType } = req.query;

    // Mock templates data - in real app, this would come from a templates collection
    const templates = [
      {
        id: 'business-landing',
        name: 'Business Landing Page',
        category: 'business',
        pageType: 'landing',
        description: 'Professional landing page for businesses',
        preview: '/templates/business-landing.jpg',
        features: ['Hero section', 'About section', 'Contact form', 'Social links']
      },
      {
        id: 'portfolio-showcase',
        name: 'Portfolio Showcase',
        category: 'portfolio',
        pageType: 'portfolio',
        description: 'Showcase your work and projects',
        preview: '/templates/portfolio-showcase.jpg',
        features: ['Project gallery', 'Skills section', 'Testimonials', 'Resume download']
      },
      {
        id: 'ecommerce-store',
        name: 'E-commerce Store',
        category: 'ecommerce',
        pageType: 'product',
        description: 'Online store for selling products',
        preview: '/templates/ecommerce-store.jpg',
        features: ['Product catalog', 'Shopping cart', 'Payment integration', 'Order tracking']
      }
    ];

    let filteredTemplates = templates;

    if (category) {
      filteredTemplates = filteredTemplates.filter(t => t.category === category);
    }

    if (pageType) {
      filteredTemplates = filteredTemplates.filter(t => t.pageType === pageType);
    }

    res.status(200).json({
      success: true,
      data: {
        templates: filteredTemplates
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get social links
exports.getSocialLinks = async (req, res, next) => {
  try {
    const { pageId } = req.params;

    const page = await BuilderPage.findOne({ _id: pageId });
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        socialLinks: page.socialLinks || []
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update social links
exports.updateSocialLinks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pageId } = req.params;
    const { socialLinks } = req.body;

    if (!socialLinks || !Array.isArray(socialLinks)) {
      return res.status(400).json({
        success: false,
        message: 'Social links array is required'
      });
    }

    const page = await BuilderPage.findOne({ _id: pageId, userId });
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    // Validate social links
    const validPlatforms = ['facebook', 'twitter', 'linkedin', 'instagram', 'youtube', 'tiktok', 'pinterest', 'snapchat', 'whatsapp', 'telegram', 'discord', 'reddit', 'github', 'website', 'blog', 'other'];

    for (const link of socialLinks) {
      if (!link.platform || !link.url) {
        return res.status(400).json({
          success: false,
          message: 'Platform and URL are required for each social link'
        });
      }

      if (!validPlatforms.includes(link.platform)) {
        return res.status(400).json({
          success: false,
          message: `Invalid platform: ${link.platform}`
        });
      }
    }

    page.socialLinks = socialLinks;
    await page.save();

    res.status(200).json({
      success: true,
      message: 'Social links updated successfully',
      data: {
        socialLinks: page.socialLinks
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get call to action
exports.getCallToAction = async (req, res, next) => {
  try {
    const { pageId } = req.params;

    const page = await BuilderPage.findOne({ _id: pageId });
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        callToAction: page.callToAction || {
          enabled: false,
          button: {
            text: 'Get Started',
            bgColor: '#007bff',
            textColor: '#ffffff',
            radius: 8,
            action: 'open_url',
            actionData: {},
            size: { width: 200, height: 50 },
            position: 'bottom-center',
            isFloating: false,
            showOnScroll: false,
            scrollThreshold: 50
          }
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update call to action
exports.updateCallToAction = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pageId } = req.params;
    const { callToAction } = req.body;

    if (!callToAction) {
      return res.status(400).json({
        success: false,
        message: 'Call to action data is required'
      });
    }

    const page = await BuilderPage.findOne({ _id: pageId, userId });
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    page.callToAction = callToAction;
    await page.save();

    res.status(200).json({
      success: true,
      message: 'Call to action updated successfully',
      data: {
        callToAction: page.callToAction
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get form data for a page
exports.getPageFormData = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pageId } = req.params;
    const {
      status,
      priority,
      submissionType,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Verify page ownership
    const pageExists = await BuilderPage.findOne({ _id: pageId, userId });
    if (!pageExists) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    // Build query for form submissions
    const query = { pageId };

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (submissionType) {
      query.submissionType = submissionType;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get form submissions
    const submissions = await FormSubmission.find(query)
      .populate('widgetId', 'name type')
      .populate('userId', 'username email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const totalSubmissions = await FormSubmission.countDocuments(query);

    // Get statistics
    const stats = await FormSubmission.aggregate([
      { $match: { pageId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          new: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
          read: { $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] } },
          replied: { $sum: { $cond: [{ $eq: ['$status', 'replied'] }, 1, 0] } },
          archived: { $sum: { $cond: [{ $eq: ['$status', 'archived'] }, 1, 0] } },
          spam: { $sum: { $cond: [{ $eq: ['$status', 'spam'] }, 1, 0] } }
        }
      }
    ]);

    // Group submissions by widget
    const groupedSubmissions = {};
    let formCounter = 1;

    submissions.forEach(submission => {
      const widgetId = submission.widgetId._id.toString();

      if (!groupedSubmissions[widgetId]) {
        groupedSubmissions[widgetId] = {
          formId: `form${formCounter}`,
          formName: submission.widgetId.name || `Form ${formCounter}`,
          formFields: submission.formFields.map(field => ({
            name: field.name,
            type: field.type,
            label: field.label,
            required: field.required
          })),
          submissions: []
        };
        formCounter++;
      }

      // Add form data to the group
      groupedSubmissions[widgetId].submissions.push({
        submissionId: `sub_${groupedSubmissions[widgetId].submissions.length + 1}`,
        submittedData: submission.formData,
        submissionStatus: submission.status,
        submittedAt: submission.createdAt
      });
    });

    // Convert to array format
    const formsArray = Object.values(groupedSubmissions);

    res.status(200).json({
      success: true,
      data: formsArray,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalSubmissions / parseInt(limit)),
        totalSubmissions,
        hasNextPage: parseInt(page) < Math.ceil(totalSubmissions / parseInt(limit)),
        hasPrevPage: parseInt(page) > 1
      },
      stats: stats[0] || {
        total: 0,
        new: 0,
        read: 0,
        replied: 0,
        archived: 0,
        spam: 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// Service Hours Management

// Get service hours for a page
exports.getServiceHours = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pageId } = req.params;

    const page = await BuilderPage.findOne({ _id: pageId, userId });
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    const currentHours = page.getCurrentHours();

    res.status(200).json({
      success: true,
      data: {
        serviceHours: page.serviceHours,
        currentHours,
        isCurrentlyOpen: currentHours.isOpen
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update weekly service hours
exports.updateWeeklyHours = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pageId } = req.params;
    const { weeklyHours, timezone, notes, sameForAll, commonHours } = req.body;

    const page = await BuilderPage.findOne({ _id: pageId, userId });
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    if (!weeklyHours || !Array.isArray(weeklyHours)) {
      return res.status(400).json({
        success: false,
        message: 'Weekly hours data is required'
      });
    }

    const validDays = ['Mon', 'Tues', 'Wed', 'Thur', 'Fri', 'Sat', 'Sun'];
    for (const dayHours of weeklyHours) {
      if (!validDays.includes(dayHours.day)) {
        return res.status(400).json({
          success: false,
          message: `Invalid day: ${dayHours.day}`
        });
      }

      if (!dayHours.isClosed && (!dayHours.startTime || !dayHours.endTime)) {
        return res.status(400).json({
          success: false,
          message: `Start time and end time are required for ${dayHours.day}`
        });
      }
    }

    if (sameForAll) {
      if (!commonHours || !commonHours.startTime || !commonHours.endTime) {
        return res.status(400).json({
          success: false,
          message: 'Common hours with startTime and endTime are required when sameForAll is true'
        });
      }

      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(commonHours.startTime) || !timeRegex.test(commonHours.endTime)) {
        return res.status(400).json({
          success: false,
          message: 'Common hours must be in HH:MM format'
        });
      }
    }

    page.serviceHours.weeklyHours = weeklyHours;
    page.serviceHours.sameForAll = sameForAll || false;

    if (sameForAll && commonHours) {
      page.serviceHours.commonHours = {
        startTime: commonHours.startTime,
        endTime: commonHours.endTime
      };
    } else {
      page.serviceHours.commonHours = {
        startTime: '',
        endTime: ''
      };
    }

    if (timezone) page.serviceHours.timezone = timezone;
    if (notes) page.serviceHours.notes = notes;

    await page.save();

    res.status(200).json({
      success: true,
      message: 'Weekly hours updated successfully',
      data: {
        serviceHours: page.serviceHours,
        currentHours: page.getCurrentHours ? page.getCurrentHours() : {} // Added fallback
      }
    });
  } catch (error) {
    next(error);
  }
};

// Add event date
exports.addEventDate = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pageId } = req.params;
    const eventData = req.body;

    const page = await BuilderPage.findOne({ _id: pageId, userId });
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    // Validate event data
    const requiredFields = ['eventName', 'eventDate', 'startTime', 'endTime'];
    for (const field of requiredFields) {
      if (!eventData[field]) {
        return res.status(400).json({
          success: false,
          message: `${field} is required`
        });
      }
    }

    // Validate date
    const eventDate = new Date(eventData.eventDate);
    if (isNaN(eventDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event date'
      });
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(eventData.startTime) || !timeRegex.test(eventData.endTime)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time format. Use HH:MM format'
      });
    }

    await page.addEventDate(eventData);

    res.status(201).json({
      success: true,
      message: 'Event date added successfully',
      data: {
        eventDate: eventData,
        serviceHours: page.serviceHours
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update event date
exports.updateEventDate = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pageId, eventId } = req.params;
    const updateData = req.body;

    const page = await BuilderPage.findOne({ _id: pageId, userId });
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    await page.updateEventDate(eventId, updateData);

    res.status(200).json({
      success: true,
      message: 'Event date updated successfully',
      data: {
        serviceHours: page.serviceHours
      }
    });
  } catch (error) {
    if (error.message === 'Event not found') {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    next(error);
  }
};

// Remove event date
exports.removeEventDate = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pageId, eventId } = req.params;

    const page = await BuilderPage.findOne({ _id: pageId, userId });
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    await page.removeEventDate(eventId);

    res.status(200).json({
      success: true,
      message: 'Event date removed successfully',
      data: {
        serviceHours: page.serviceHours
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get current hours status
exports.getCurrentHours = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pageId } = req.params;

    const page = await BuilderPage.findOne({ _id: pageId, userId });
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    const currentHours = page.getCurrentHours();

    res.status(200).json({
      success: true,
      data: {
        currentHours,
        isCurrentlyOpen: currentHours.isOpen,
        serviceHoursType: page.serviceHours.type
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.reportPage = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pageId } = req.params;
    const { category, description, attachment } = req.body;

    if (!category || !description) {
      return res.status(400).json({
        success: false,
        message: 'Category and description are required'
      });
    }

    const page = await BuilderPage.findById(pageId);
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    const pageReport = new PageReport({
      pageId,
      userId,
      category,
      description,
      attachment: attachment || null
    });

    await pageReport.save();

    res.status(200).json({
      success: true,
      message: 'Page reported successfully',
      data: { report: pageReport }
    });
  } catch (error) {
    next(error);
  }
};