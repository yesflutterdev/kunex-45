const mongoose = require('mongoose');
const Widget = require('../models/widget.model');
const BuilderPage = require('../models/builderPage.model');
const BusinessProfile = require('../models/businessProfile.model');
const { uploadToCloudinary, deleteImage } = require('../utils/cloudinary');

// Create a new widget
exports.createWidget = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      pageId,
      name,
      type,
      category,
      settings,
      layout,
      order
    } = req.body;

    // Validate required fields
    if (!name || !type || !category) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, type, category'
      });
    }

    // If pageId is provided, verify page ownership
    if (pageId) {
      const page = await BuilderPage.findOne({ _id: pageId, userId });
      if (!page) {
        return res.status(403).json({
          success: false,
          message: 'Page not found or access denied'
        });
      }
    }

    // Create widget data
    const widgetData = {
      userId,
      pageId,
      name,
      type,
      category,
      settings: settings || {},
      layout: layout || {},
      order: order || 0
    };

    // Special handling for products widget type - ensure products have MongoDB ObjectIds
    if (type === 'products' && settings?.specific?.products) {
      if (Array.isArray(settings.specific.products)) {
        // Handle array of products
        widgetData.settings.specific.products = settings.specific.products.map(product => ({
          ...product,
          _id: product._id || new mongoose.Types.ObjectId()
        }));
      } else if (typeof settings.specific.products === 'object') {
        // Handle single product object (convert to array with one product)
        widgetData.settings.specific.products = [{
          ...settings.specific.products,
          _id: settings.specific.products._id || new mongoose.Types.ObjectId()
        }];
      }
    }

    const widget = new Widget(widgetData);
    await widget.save();

    res.status(201).json({
      success: true,
      message: 'Widget created successfully',
      data: { widget }
    });
  } catch (error) {
    next(error);
  }
};

// Get widgets
exports.getWidgets = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      pageId,
      type,
      category,
      status,
      page = 1,
      limit = 50,
      search,
      sortBy = 'order',
      sortOrder = 'asc'
    } = req.query;

    // Build query
    const query = { userId };
    if (pageId) query.pageId = pageId;
    if (type) query.type = type;
    if (category) query.category = category;
    if (status) query.status = status;

    // Add search if provided
    if (search) {
      query.$text = { $search: search };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Get widgets
    const widgets = await Widget.find(query)
      .populate('pageId', 'title slug')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Widget.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        widgets,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / parseInt(limit)),
          count: widgets.length,
          totalItems: total
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get widget by ID
exports.getWidgetById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const widget = await Widget.findOne({ _id: id, userId })
      .populate('pageId', 'title slug')
      .populate('metadata.author', 'username email');

    if (!widget) {
      return res.status(404).json({
        success: false,
        message: 'Widget not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { widget }
    });
  } catch (error) {
    next(error);
  }
};

// Update widget
exports.updateWidget = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updateData = req.body;

    const widget = await Widget.findOne({ _id: id, userId });
    if (!widget) {
      return res.status(404).json({
        success: false,
        message: 'Widget not found'
      });
    }

    // Special handling for products widget type when updating
    if (updateData.settings?.specific?.products) {
      if (Array.isArray(updateData.settings.specific.products)) {
        // Handle array of products
        updateData.settings.specific.products = updateData.settings.specific.products.map(product => ({
          ...product,
          _id: product._id || new mongoose.Types.ObjectId()
        }));
      } else if (typeof updateData.settings.specific.products === 'object') {
        // Handle single product object (convert to array with one product)
        updateData.settings.specific.products = [{
          ...updateData.settings.specific.products,
          _id: updateData.settings.specific.products._id || new mongoose.Types.ObjectId()
        }];
      }
    }

    // Update widget
    Object.assign(widget, updateData);
    await widget.save();

    res.status(200).json({
      success: true,
      message: 'Widget updated successfully',
      data: { widget }
    });
  } catch (error) {
    next(error);
  }
};

// Delete widget
exports.deleteWidget = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const widget = await Widget.findOne({ _id: id, userId });
    if (!widget) {
      return res.status(404).json({
        success: false,
        message: 'Widget not found'
      });
    }

    await Widget.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Widget deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Clone widget
exports.cloneWidget = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { pageId, name } = req.body;

    const originalWidget = await Widget.findOne({ _id: id, userId });
    if (!originalWidget) {
      return res.status(404).json({
        success: false,
        message: 'Widget not found'
      });
    }

    // Verify page ownership if pageId is provided
    if (pageId) {
      const page = await BuilderPage.findOne({ _id: pageId, userId });
      if (!page) {
        return res.status(403).json({
          success: false,
          message: 'Page not found or access denied'
        });
      }
    }

    // Clone widget
    const clonedWidget = originalWidget.clone(userId, pageId);
    if (name) {
      clonedWidget.name = name;
    }
    
    await clonedWidget.save();

    res.status(201).json({
      success: true,
      message: 'Widget cloned successfully',
      data: { widget: clonedWidget }
    });
  } catch (error) {
    next(error);
  }
};

// Update widget order
exports.updateWidgetOrder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { widgets } = req.body;

    // Validate widgets array
    if (!Array.isArray(widgets)) {
      return res.status(400).json({
        success: false,
        message: 'widgets must be an array'
      });
    }

    // Update widget orders
    const updatePromises = widgets.map(({ id, order }) =>
      Widget.findOneAndUpdate(
        { _id: id, userId },
        { order },
        { new: true }
      )
    );

    const updatedWidgets = await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      message: 'Widget order updated successfully',
      data: { widgets: updatedWidgets.filter(Boolean) }
    });
  } catch (error) {
    next(error);
  }
};

// Update widget order for a specific page
exports.updatePageWidgetOrder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pageId } = req.params;
    const { widgets } = req.body;

    // Validate widgets array
    if (!Array.isArray(widgets)) {
      return res.status(400).json({
        success: false,
        message: 'widgets must be an array'
      });
    }

    // Verify page ownership
    const page = await BuilderPage.findOne({ _id: pageId, userId });
    if (!page) {
      return res.status(403).json({
        success: false,
        message: 'Page not found or access denied'
      });
    }

    // Validate that all widgets belong to the specified page
    const widgetIds = widgets.map(w => w.id);
    const pageWidgets = await Widget.find({ 
      _id: { $in: widgetIds }, 
      pageId: pageId 
    });

    if (pageWidgets.length !== widgetIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some widgets do not belong to the specified page'
      });
    }

    // Update widget orders
    const updatePromises = widgets.map(({ id, order }) =>
      Widget.findByIdAndUpdate(
        id,
        { order },
        { new: true }
      )
    );

    const updatedWidgets = await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      message: 'Page widget order updated successfully',
      data: { 
        pageId,
        widgets: updatedWidgets.filter(Boolean),
        totalUpdated: updatedWidgets.filter(Boolean).length
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get widgets by page
exports.getWidgetsByPage = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { pageId } = req.params;
    const { includeHidden = false } = req.query;

    // Verify page ownership
    const page = await BuilderPage.findOne({ _id: pageId, userId });
    if (!page) {
      return res.status(403).json({
        success: false,
        message: 'Page not found or access denied'
      });
    }

    const widgets = await Widget.getByPage(pageId, includeHidden === 'true');

    res.status(200).json({
      success: true,
      data: { widgets }
    });
  } catch (error) {
    next(error);
  }
};

// Get widgets by type
exports.getWidgetsByType = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { type } = req.params;
    const { businessId, limit = 20 } = req.query;

    const filters = { userId };
    if (businessId) filters.businessId = businessId;

    const widgets = await Widget.getByType(type, filters)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: { widgets }
    });
  } catch (error) {
    next(error);
  }
};

// Search widgets
exports.searchWidgets = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { q, type, category, pageId } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const filters = { userId };
    if (type) filters.type = type;
    if (category) filters.category = category;
    if (pageId) filters.pageId = pageId;

    const widgets = await Widget.searchWidgets(q, filters)
      .populate('pageId', 'title slug')
      .limit(50);

    res.status(200).json({
      success: true,
      data: { widgets }
    });
  } catch (error) {
    next(error);
  }
};

// Get widget preview
exports.getWidgetPreview = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const widget = await Widget.findOne({ _id: id, userId });
    if (!widget) {
      return res.status(404).json({
        success: false,
        message: 'Widget not found'
      });
    }

    const preview = widget.generatePreview();

    res.status(200).json({
      success: true,
      data: { preview }
    });
  } catch (error) {
    next(error);
  }
};

// Update widget analytics
exports.updateWidgetAnalytics = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { metric, value = 1 } = req.body;

    const widget = await Widget.findById(id);
    if (!widget) {
      return res.status(404).json({
        success: false,
        message: 'Widget not found'
      });
    }

    await widget.updateAnalytics(metric, value);

    res.status(200).json({
      success: true,
      message: 'Analytics updated successfully'
    });
  } catch (error) {
    if (error.message.includes('Invalid analytics metric')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

// Get widget analytics
exports.getWidgetAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const widget = await Widget.findOne({ _id: id, userId })
      .select('name type analytics');

    if (!widget) {
      return res.status(404).json({
        success: false,
        message: 'Widget not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        widget: {
          id: widget._id,
          name: widget.name,
          type: widget.type,
          analytics: widget.analytics
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get popular widgets
exports.getPopularWidgets = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const widgets = await Widget.getPopularWidgets(parseInt(limit));

    res.status(200).json({
      success: true,
      data: { widgets }
    });
  } catch (error) {
    next(error);
  }
};

// Get widget types
exports.getWidgetTypes = async (req, res, next) => {
  try {
    const { category } = req.query;

    // Widget types configuration
    const widgetTypes = [
      {
        type: 'text',
        category: 'content',
        name: 'Text Block',
        description: 'Add formatted text content',
        icon: 'text',
        settings: {
          required: ['content.text'],
          optional: ['style.fontSize', 'style.textColor', 'style.fontFamily']
        }
      },
      {
        type: 'image',
        category: 'media',
        name: 'Image',
        description: 'Display images with various styling options',
        icon: 'image',
        settings: {
          required: ['content.url'],
          optional: ['content.alt', 'content.caption', 'layout.size']
        }
      },
      {
        type: 'button',
        category: 'content',
        name: 'Button',
        description: 'Interactive button with custom actions',
        icon: 'button',
        settings: {
          required: ['content.text'],
          optional: ['interactive.link.url', 'style.backgroundColor', 'style.textColor']
        }
      },
      {
        type: 'gallery',
        category: 'media',
        name: 'Image Gallery',
        description: 'Showcase multiple images in various layouts',
        icon: 'gallery',
        settings: {
          required: ['specific.images'],
          optional: ['specific.layout', 'specific.columns']
        }
      },
      {
        type: 'form',
        category: 'form',
        name: 'Contact Form',
        description: 'Collect user information and feedback',
        icon: 'form',
        settings: {
          required: ['specific.fields'],
          optional: ['specific.submitAction', 'specific.validation']
        }
      },
      {
        type: 'map',
        category: 'utility',
        name: 'Map',
        description: 'Embed interactive maps',
        icon: 'map',
        settings: {
          required: ['specific.location'],
          optional: ['specific.zoom', 'specific.markers']
        }
      },
      {
        type: 'social_media',
        category: 'social',
        name: 'Social Media Feed',
        description: 'Display social media content',
        icon: 'social',
        settings: {
          required: ['specific.platform', 'specific.handle'],
          optional: ['specific.feedSettings']
        }
      },
      {
        type: 'testimonial',
        category: 'content',
        name: 'Testimonial',
        description: 'Customer reviews and testimonials',
        icon: 'testimonial',
        settings: {
          required: ['content.text'],
          optional: ['specific.author', 'specific.rating', 'specific.avatar']
        }
      },
      {
        type: 'pricing_table',
        category: 'ecommerce',
        name: 'Pricing Table',
        description: 'Display pricing plans and features',
        icon: 'pricing',
        settings: {
          required: ['specific.plans'],
          optional: ['specific.currency', 'specific.billing']
        }
      },
      {
        type: 'countdown',
        category: 'utility',
        name: 'Countdown Timer',
        description: 'Create urgency with countdown timers',
        icon: 'countdown',
        settings: {
          required: ['specific.targetDate'],
          optional: ['specific.format', 'specific.onComplete']
        }
      }
    ];

    let filteredTypes = widgetTypes;

    if (category) {
      filteredTypes = filteredTypes.filter(t => t.category === category);
    }

    res.status(200).json({
      success: true,
      data: { widgetTypes: filteredTypes }
    });
  } catch (error) {
    next(error);
  }
};

// Upload widget asset (image, etc.)
exports.uploadWidgetAsset = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'widget-assets',
      resource_type: 'auto'
    });

    res.status(200).json({
      success: true,
      message: 'Asset uploaded successfully',
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        type: result.resource_type,
        size: result.bytes
      }
    });
  } catch (error) {
    next(error);
  }
};

// Reorder products within a products widget
exports.reorderProducts = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { products } = req.body;

    // Validate products array
    if (!Array.isArray(products)) {
      return res.status(400).json({
        success: false,
        message: 'products must be an array'
      });
    }

    // Find the widget
    const widget = await Widget.findOne({ _id: id, userId });
    if (!widget) {
      return res.status(404).json({
        success: false,
        message: 'Widget not found'
      });
    }

    // Check if it's a products widget
    if (widget.type !== 'products') {
      return res.status(400).json({
        success: false,
        message: 'Widget is not a products widget'
      });
    }

    // Validate that all product IDs exist in the widget
    const existingProductIds = widget.settings.specific.products.map(p => p._id.toString());
    const requestedProductIds = products.map(p => p.productId);
    
    const invalidIds = requestedProductIds.filter(id => !existingProductIds.includes(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid product IDs: ${invalidIds.join(', ')}`
      });
    }

    // Update product orders by rebuilding the products array
    const updatedProducts = widget.settings.specific.products.map(product => {
      const reorderItem = products.find(p => p.productId === product._id.toString());
      if (reorderItem) {
        return { ...product, order: reorderItem.order };
      }
      return product;
    });

    // Sort by order to ensure proper sequence
    updatedProducts.sort((a, b) => a.order - b.order);

    console.log('Reordering products:', {
      widgetId: id,
      originalOrder: widget.settings.specific.products.map(p => ({ id: p._id, order: p.order })),
      newOrder: updatedProducts.map(p => ({ id: p._id, order: p.order }))
    });

    // Update the widget with the new products array
    const updateResult = await Widget.updateOne(
      { _id: id, userId },
      { 
        $set: { 
          'settings.specific.products': updatedProducts
        } 
      }
    );

    console.log('Update result:', updateResult);

    // Get updated widget
    const updatedWidget = await Widget.findById(id);

    res.status(200).json({
      success: true,
      message: 'Products reordered successfully',
      data: { 
        widget: updatedWidget,
        reorderedProducts: products
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete specific product from products widget
exports.deleteProduct = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id, productId } = req.params;

    // Validate productId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }

    // Find the widget and verify product exists
    const widget = await Widget.findOne({ _id: id, userId });
    if (!widget) {
      // Check if widget exists but belongs to different user
      const anyWidget = await Widget.findById(id);
      if (anyWidget) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this widget'
        });
      }
      
      return res.status(404).json({
        success: false,
        message: 'Widget not found'
      });
    }

    // Check if it's a products widget
    if (widget.type !== 'products') {
      return res.status(400).json({
        success: false,
        message: 'Widget is not a products widget'
      });
    }

    const productExists = widget.settings.specific.products.some(
      p => p._id.toString() === productId
    );

    console.log('Products in widget:', widget.settings.specific.products.map(p => ({
      id: p._id.toString(),
      name: p.productName
    })));
    console.log('Looking for productId:', productId);

    if (!productExists) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in widget'
      });
    }

    // Remove the product from the array
    const updateResult = await Widget.updateOne(
      { _id: id, userId },
      { 
        $pull: { 
          'settings.specific.products': { _id: new mongoose.Types.ObjectId(productId) } 
        } 
      }
    );

    // console.log('Delete update result:', updateResult);

    // Get updated widget
    const updatedWidget = await Widget.findById(id);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      data: { 
        widget: updatedWidget,
        deletedProductId: productId
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update specific product in products widget - accepts any fields
exports.updateProduct = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id, productId } = req.params;
    const updateData = req.body;

    // Validate productId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }

    // Check if updateData is not empty
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one field must be provided for update'
      });
    }

    // Find the widget and verify product exists
    const widget = await Widget.findOne({ _id: id, userId });
    if (!widget) {
      // Check if widget exists but belongs to different user
      const anyWidget = await Widget.findById(id);
      if (anyWidget) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this widget'
        });
      }
      
      return res.status(404).json({
        success: false,
        message: 'Widget not found'
      });
    }

    // Check if it's a products widget
    if (widget.type !== 'products') {
      return res.status(400).json({
        success: false,
        message: 'Widget is not a products widget'
      });
    }

    // Find the product index
    const productIndex = widget.settings.specific.products.findIndex(
      p => p._id.toString() === productId
    );

    if (productIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in widget'
      });
    }

    // Update the product with any provided fields (merge with existing data)
    const updatedProduct = {
      ...widget.settings.specific.products[productIndex],
      ...updateData,
      _id: widget.settings.specific.products[productIndex]._id // Preserve the original ID
    };

    // Update the product in the array
    widget.settings.specific.products[productIndex] = updatedProduct;
    await widget.save();

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: { 
        widget: {
          id: widget._id,
          name: widget.name,
          type: widget.type,
          category: widget.category,
          products: widget.settings.specific.products
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Insert a single product into a products widget
exports.insertProduct = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const productData = req.body;

    // Find the widget
    const widget = await Widget.findOne({ _id: id, userId });
    if (!widget) {
      // Check if widget exists but belongs to different user
      const anyWidget = await Widget.findById(id);
      if (anyWidget) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this widget'
        });
      }
      
      return res.status(404).json({
        success: false,
        message: 'Widget not found'
      });
    }

    // Check if it's a products widget
    if (widget.type !== 'products') {
      return res.status(400).json({
        success: false,
        message: 'Widget is not a products widget'
      });
    }

    // Initialize products array if it doesn't exist
    if (!widget.settings.specific.products) {
      widget.settings.specific.products = [];
    }

    // Create new product with generated ID
    const newProduct = {
      ...productData,
      _id: new mongoose.Types.ObjectId()
    };

    // Add product to the array
    widget.settings.specific.products.push(newProduct);
    await widget.save();

    res.status(200).json({
      success: true,
      message: 'Product inserted successfully',
      data: { 
        widget: {
          id: widget._id,
          name: widget.name,
          type: widget.type,
          category: widget.category,
          products: widget.settings.specific.products
        },
        insertedProduct: newProduct,
        totalProducts: widget.settings.specific.products.length
      }
    });
  } catch (error) {
    next(error);
  }
}; 