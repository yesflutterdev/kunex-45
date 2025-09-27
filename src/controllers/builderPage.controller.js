const BuilderPage = require('../models/builderPage.model');
const Widget = require('../models/widget.model');
const BusinessProfile = require('../models/businessProfile.model');
const { uploadToCloudinary, deleteImage } = require('../utils/cloudinary');

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
      businessId
    } = req.body;

    // Validate required fields
    if (!title || !slug || !pageType || !template) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, slug, pageType, template'
      });
    }

    // Check if slug is unique for this user
    const existingPage = await BuilderPage.findOne({ userId, slug });
    if (existingPage) {
      return res.status(400).json({
        success: false,
        message: 'A page with this slug already exists'
      });
    }

    // If businessId is provided, verify ownership
    if (businessId) {
      const business = await BusinessProfile.findOne({ _id: businessId, userId });
      if (!business) {
        return res.status(403).json({
          success: false,
          message: 'Business profile not found or access denied'
        });
      }
    }

    // Create page data
    const pageData = {
      userId,
      businessId,
      title,
      slug,
      description,
      pageType,
      template: {
        name: template.name,
        version: template.version || '1.0',
        category: template.category
      },
      layout: {
        structure: 'single-column',
        sections: [
          {
            id: 'header',
            type: 'header',
            order: 1,
            visible: true,
            settings: {}
          },
          {
            id: 'hero',
            type: 'hero',
            order: 2,
            visible: true,
            settings: {}
          },
          {
            id: 'content',
            type: 'content',
            order: 3,
            visible: true,
            settings: {}
          },
          {
            id: 'footer',
            type: 'footer',
            order: 4,
            visible: true,
            settings: {}
          }
        ],
        gridSystem: 'bootstrap'
      }
    };

    const page = new BuilderPage(pageData);
    await page.save();

    res.status(201).json({
      success: true,
      message: 'Builder page created successfully',
      data: { page }
    });
  } catch (error) {
    next(error);
  }
};

// Get all pages for a user
exports.getPages = async (req, res, next) => {
  try {
    const userId = req.user.id;
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
    const query = { userId };
    if (businessId) query.businessId = businessId;
    if (pageType) query.pageType = pageType;
    if (status === 'published') query['settings.isPublished'] = true;
    if (status === 'draft') query['settings.isDraft'] = true;

    // Add search if provided
    if (search) {
      query.$text = { $search: search };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Get pages
    const pages = await BuilderPage.find(query)
      .populate('businessId', 'businessName username')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-versions');

    // Get total count
    const total = await BuilderPage.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        pages,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / parseInt(limit)),
          count: pages.length,
          totalItems: total
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get a specific page by ID
exports.getPageById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pageId } = req.params;

    const page = await BuilderPage.findOne({ _id: pageId, userId })
      .populate('businessId', 'businessName username themeColor')
      .populate('userId', 'email username');

    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    // Get widgets for this page
    const widgets = await Widget.find({ pageId: pageId })
      .sort({ order: 1 });

    res.status(200).json({
      success: true,
      data: {
        page,
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
      .populate('businessId', 'businessName username themeColor contactInfo location')
      .populate('userId', 'username');

    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    // Get visible widgets for this page
    const widgets = await Widget.find({
      pageId: page._id,
      status: 'active',
      isVisible: true
    }).sort({ order: 1 });

    // Increment page views
    await page.incrementViews();

    res.status(200).json({
      success: true,
      data: {
        page,
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

    // Create version before updating if significant changes
    if (updateData.layout || updateData.styling || updateData.seo) {
      page.createVersion('Page content updated');
    }

    // Update page
    Object.assign(page, updateData);
    await page.save();

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

    const originalPage = await BuilderPage.findOne({ _id: pageId, userId });
    if (!originalPage) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    // Check if new slug is unique
    const existingPage = await BuilderPage.findOne({ userId, slug });
    if (existingPage) {
      return res.status(400).json({
        success: false,
        message: 'A page with this slug already exists'
      });
    }

    // Clone page
    const clonedData = originalPage.toObject();
    delete clonedData._id;
    delete clonedData.createdAt;
    delete clonedData.updatedAt;
    delete clonedData.__v;
    delete clonedData.versions;
    delete clonedData.analytics;
    delete clonedData.publishedAt;

    clonedData.title = title || `${originalPage.title} (Copy)`;
    clonedData.slug = slug;
    clonedData.settings.isPublished = false;
    clonedData.settings.isDraft = true;

    const clonedPage = new BuilderPage(clonedData);
    await clonedPage.save();

    // Clone widgets
    const widgets = await Widget.find({ pageId: pageId });
    for (const widget of widgets) {
      const clonedWidget = widget.clone(userId, clonedPage._id);
      await clonedWidget.save();
    }

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

    const page = await BuilderPage.findOne({ _id: pageId, userId })
      .select('versions title slug');

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

    const page = await BuilderPage.findOne({ _id: pageId, userId });
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    try {
      page.revertToVersion(versionNumber);
      await page.save();

      res.status(200).json({
        success: true,
        message: 'Page reverted successfully',
        data: { page }
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  } catch (error) {
    next(error);
  }
};

// Get page analytics
exports.getPageAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pageId } = req.params;
    const { period = '30d' } = req.query;

    const page = await BuilderPage.findOne({ _id: pageId, userId })
      .select('analytics title slug');

    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    // Get widget analytics for this page
    const widgets = await Widget.find({ pageId })
      .select('name type analytics');

    const widgetAnalytics = widgets.map(widget => ({
      id: widget._id,
      name: widget.name,
      type: widget.type,
      analytics: widget.analytics
    }));

    res.status(200).json({
      success: true,
      data: {
        page: {
          id: page._id,
          title: page.title,
          slug: page.slug,
          analytics: page.analytics
        },
        widgets: widgetAnalytics,
        summary: {
          totalViews: page.analytics.pageViews,
          totalWidgetViews: widgets.reduce((sum, w) => sum + w.analytics.views, 0),
          totalWidgetClicks: widgets.reduce((sum, w) => sum + w.analytics.clicks, 0),
          widgetCount: widgets.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Search pages
exports.searchPages = async (req, res, next) => {
  try {
    const { q, category, pageType, published = true } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const filters = {};
    if (category) filters['template.category'] = category;
    if (pageType) filters.pageType = pageType;
    if (published === 'true') filters['settings.isPublished'] = true;

    const pages = await BuilderPage.searchPages(q, filters)
      .populate('businessId', 'businessName username')
      .populate('userId', 'username')
      .limit(20);

    res.status(200).json({
      success: true,
      data: { pages }
    });
  } catch (error) {
    next(error);
  }
};

// Get page templates
exports.getPageTemplates = async (req, res, next) => {
  try {
    const { category, pageType } = req.query;

    // This would typically come from a templates database or file system
    // For now, returning a static list
    const templates = [
      {
        name: 'Modern Business',
        category: 'business',
        pageType: 'landing',
        description: 'Clean and modern business landing page',
        preview: '/templates/modern-business.jpg',
        features: ['Responsive', 'SEO Optimized', 'Contact Form']
      },
      {
        name: 'Portfolio Showcase',
        category: 'portfolio',
        pageType: 'portfolio',
        description: 'Elegant portfolio showcase template',
        preview: '/templates/portfolio-showcase.jpg',
        features: ['Gallery', 'Project Details', 'Contact Section']
      },
      {
        name: 'Restaurant Menu',
        category: 'restaurant',
        pageType: 'product',
        description: 'Beautiful restaurant menu template',
        preview: '/templates/restaurant-menu.jpg',
        features: ['Menu Display', 'Pricing', 'Reservations']
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
      data: { templates: filteredTemplates }
    });
  } catch (error) {
    next(error);
  }
};

// Update social links for a page
exports.updateSocialLinks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pageId } = req.params;
    const { socialLinks } = req.body;

    // Validate social links array
    if (!Array.isArray(socialLinks)) {
      return res.status(400).json({
        success: false,
        message: 'socialLinks must be an array'
      });
    }

    // Validate each social link
    for (const link of socialLinks) {
      if (!link.platform || !link.url) {
        return res.status(400).json({
          success: false,
          message: 'Each social link must have platform and url'
        });
      }

      // Validate URL format
      try {
        new URL(link.url);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: `Invalid URL format for ${link.platform}`
        });
      }
    }

    const page = await BuilderPage.findOne({ _id: pageId, userId });
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    // Update social links
    page.socialLinks = socialLinks;
    await page.save();

    res.status(200).json({
      success: true,
      message: 'Social links updated successfully',
      data: { socialLinks: page.socialLinks }
    });
  } catch (error) {
    next(error);
  }
};

// Update call-to-action button configuration
exports.updateCallToAction = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pageId } = req.params;
    const { callToAction } = req.body;

    // Validate call-to-action configuration
    if (!callToAction || typeof callToAction !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'callToAction must be an object'
      });
    }

    const page = await BuilderPage.findOne({ _id: pageId, userId });
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    // Update call-to-action configuration
    page.callToAction = { ...page.callToAction, ...callToAction };
    await page.save();

    res.status(200).json({
      success: true,
      message: 'Call-to-action updated successfully',
      data: { callToAction: page.callToAction }
    });
  } catch (error) {
    next(error);
  }
};

// Get social links for a page
exports.getSocialLinks = async (req, res, next) => {
  try {
    const { pageId } = req.params;

    const page = await BuilderPage.findById(pageId)
      .select('socialLinks businessId userId');

    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { socialLinks: page.socialLinks }
    });
  } catch (error) {
    next(error);
  }
};

// Get call-to-action configuration for a page
exports.getCallToAction = async (req, res, next) => {
  try {
    const { pageId } = req.params;

    const page = await BuilderPage.findById(pageId)
      .select('callToAction businessId userId');

    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { callToAction: page.callToAction }
    });
  } catch (error) {
    next(error);
  }
}; 