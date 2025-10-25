const SupportTicket = require('../models/supportTicket.model');
const SupportCategory = require('../models/supportCategory.model');
const { uploadToCloudinary, deleteMedia, extractPublicId } = require('../utils/cloudinary');
const { validateSupportTicket, validateSupportMessage } = require('../utils/supportValidation');

// Create a new support ticket
exports.createTicket = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { subject, category, description } = req.body;

    // Validate input data
    const { error, value } = validateSupportTicket(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    // Handle file uploads if any
    let attachments = [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(async (file) => {
        try {
          const uploadResult = await uploadToCloudinary(file.buffer, {
            folder: 'kunex/support-attachments',
            resource_type: 'auto',
            public_id: `support_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          });

          return {
            fileName: file.originalname,
            fileUrl: uploadResult.secure_url,
            fileType: file.mimetype.startsWith('video/') ? 'video' : 'image',
            isImage: file.mimetype.startsWith('image/'),
            isVideo: file.mimetype.startsWith('video/'),
            fileSize: file.size,
            publicId: uploadResult.public_id
          };
        } catch (uploadError) {
          console.error('Error uploading file:', uploadError);
          throw new Error(`Failed to upload ${file.originalname}`);
        }
      });

      attachments = await Promise.all(uploadPromises);
    }

    // Verify category exists and is active
    const categoryData = await SupportCategory.findById(value.category);
    
    if (!categoryData || !categoryData.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category selected',
      });
    }

    // Check if user already has a ticket in this category
    const existingTicket = await SupportTicket.findOne({
      userId: userId,
      categoryId: categoryData._id,
      status: { $nin: ['Closed', 'Cancelled'] } // Only check active tickets
    });

    if (existingTicket) {
      return res.status(400).json({
        success: false,
        message: `You already have an active support ticket in the "${categoryData.name}" category. Please wait for it to be resolved before creating a new one.`,
        data: {
          existingTicketId: existingTicket.ticketId,
          existingTicketStatus: existingTicket.status
        }
      });
    }

    // Create support ticket
    const ticketData = {
      userId,
      subject: value.subject,
      category: categoryData.name, // Store category name for display
      categoryId: categoryData._id, // Store category ID for reference
      priority: 'Medium', // Default priority
      description: value.description,
      attachments,
      tags: [], // Empty tags
      messages: [{
        sender: 'user',
        message: value.description,
        attachments,
        timestamp: new Date()
      }]
    };

    const ticket = new SupportTicket(ticketData);
    await ticket.save();

    // Increment category usage count
    await SupportCategory.incrementUsage(categoryData.name);

    // Populate user data
    await ticket.populate('userId', 'username email');

    // Create clean response
    const cleanTicket = {
      ticketId: ticket.ticketId,
      subject: ticket.subject,
      category: ticket.category,
      status: ticket.status,
      priority: ticket.priority,
      description: ticket.description,
      attachments: ticket.attachments.map(att => ({
        fileName: att.fileName,
        fileUrl: att.fileUrl,
        fileType: att.fileType,
        fileSize: att.fileSize,
        isImage: att.isImage,
        isVideo: att.isVideo
      })),
      createdAt: ticket.createdAt,
      lastActivity: ticket.lastActivity
    };

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      data: cleanTicket
    });
  } catch (error) {
    next(error);
  }
};

// Get user's support tickets
exports.getUserTickets = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      status,
      category,
      priority,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query - if category is provided, filter by it, otherwise get all
    const query = { userId };
    
    if (status) query.status = status;
    if (category) query.categoryId = category; // Only filter by category if provided
    if (priority) query.priority = priority;

    // Get tickets with pagination
    const tickets = await SupportTicket.find(query)
      .populate('assignedTo', 'username email')
      .populate('categoryId', 'name description icon color')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalTickets = await SupportTicket.countDocuments(query);

    // Get ticket statistics
    const stats = await SupportTicket.getTicketStats(userId);

    // Clean up tickets data
    const cleanTickets = tickets.map(ticket => ({
      ticketId: ticket.ticketId,
      subject: ticket.subject,
      category: ticket.categoryId?.name || ticket.category,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.createdAt,
      lastActivity: ticket.lastActivity,
      assignedTo: ticket.assignedTo ? {
        username: ticket.assignedTo.username,
        email: ticket.assignedTo.email
      } : null
    }));

    res.status(200).json({
      success: true,
      data: {
        tickets: cleanTickets,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalTickets / parseInt(limit)),
          totalTickets,
          hasNextPage: parseInt(page) < Math.ceil(totalTickets / parseInt(limit)),
          hasPrevPage: parseInt(page) > 1
        },
        stats
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get single ticket by ID
exports.getTicketById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { ticketId } = req.params;

    const ticket = await SupportTicket.findOne({
      _id: ticketId,
      userId
    }).populate('userId', 'username email')
      .populate('assignedTo', 'username email')
      .populate('resolvedBy', 'username email');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found',
      });
    }

    // Clean up ticket data
    const cleanTicket = {
      ticketId: ticket.ticketId,
      subject: ticket.subject,
      category: ticket.category,
      status: ticket.status,
      priority: ticket.priority,
      description: ticket.description,
      attachments: ticket.attachments.map(att => ({
        fileName: att.fileName,
        fileUrl: att.fileUrl,
        fileType: att.fileType,
        fileSize: att.fileSize,
        isImage: att.isImage,
        isVideo: att.isVideo
      })),
      messages: ticket.messages.map(msg => ({
        sender: msg.sender,
        message: msg.message,
        timestamp: msg.timestamp,
        attachments: msg.attachments.map(att => ({
          fileName: att.fileName,
          fileUrl: att.fileUrl,
          fileType: att.fileType,
          fileSize: att.fileSize,
          isImage: att.isImage,
          isVideo: att.isVideo
        }))
      })),
      assignedTo: ticket.assignedTo ? {
        username: ticket.assignedTo.username,
        email: ticket.assignedTo.email
      } : null,
      resolvedBy: ticket.resolvedBy ? {
        username: ticket.resolvedBy.username,
        email: ticket.resolvedBy.email
      } : null,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      lastActivity: ticket.lastActivity
    };

    res.status(200).json({
      success: true,
      data: cleanTicket
    });
  } catch (error) {
    next(error);
  }
};

// Add message to ticket
exports.addMessage = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { ticketId } = req.params;
    const { message } = req.body;

    // Validate input
    const { error, value } = validateSupportMessage(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }

    // Find ticket
    const ticket = await SupportTicket.findOne({
      _id: ticketId,
      userId
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found',
      });
    }

    // Check if ticket is closed
    if (ticket.status === 'Closed' || ticket.status === 'Cancelled' || ticket.status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot add message to closed ticket',
      });
    }

    // Handle file uploads if any
    let attachments = [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(async (file) => {
        try {
          const uploadResult = await uploadToCloudinary(file.buffer, {
            folder: 'kunex/support-attachments',
            resource_type: 'auto',
            public_id: `support_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          });

          return {
            fileName: file.originalname,
            fileUrl: uploadResult.secure_url,
            fileType: file.mimetype.startsWith('video/') ? 'video' : 'image',
            isImage: file.mimetype.startsWith('image/'),
            isVideo: file.mimetype.startsWith('video/'),
            fileSize: file.size,
            publicId: uploadResult.public_id
          };
        } catch (uploadError) {
          console.error('Error uploading file:', uploadError);
          throw new Error(`Failed to upload ${file.originalname}`);
        }
      });

      attachments = await Promise.all(uploadPromises);
    }

    // Add message to ticket
    await ticket.addMessage('user', value.message, attachments);

    // Update ticket status if it was completed
    if (ticket.status === 'Completed') {
      ticket.status = 'Open';
      await ticket.save();
    }

    // Increment category usage count
    await SupportCategory.incrementUsage(ticket.category);

    // Clean up ticket data for response
    const cleanTicket = {
      ticketId: ticket.ticketId,
      subject: ticket.subject,
      category: ticket.category,
      status: ticket.status,
      priority: ticket.priority,
      description: ticket.description,
      messages: ticket.messages.map(msg => ({
        sender: msg.sender,
        message: msg.message,
        timestamp: msg.timestamp,
        attachments: msg.attachments.map(att => ({
          fileName: att.fileName,
          fileUrl: att.fileUrl,
          fileType: att.fileType,
          fileSize: att.fileSize,
          isImage: att.isImage,
          isVideo: att.isVideo
        }))
      })),
      lastActivity: ticket.lastActivity
    };

    res.status(200).json({
      success: true,
      message: 'Message added successfully',
      data: cleanTicket
    });
  } catch (error) {
    next(error);
  }
};

// Update ticket status
exports.updateTicketStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { ticketId } = req.params;
    const { status, resolution } = req.body;

    const ticket = await SupportTicket.findOne({
      _id: ticketId,
      userId
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found',
      });
    }

    // Update status
    await ticket.updateStatus(status, userId);

    // Add resolution if provided
    if (resolution && (status === 'Completed' || status === 'Closed')) {
      ticket.resolution = resolution;
      await ticket.save();
    }

    // Clean up ticket data for response
    const cleanTicket = {
      ticketId: ticket.ticketId,
      subject: ticket.subject,
      category: ticket.category,
      status: ticket.status,
      priority: ticket.priority,
      description: ticket.description,
      resolution: ticket.resolution,
      resolvedAt: ticket.resolvedAt,
      lastActivity: ticket.lastActivity
    };

    res.status(200).json({
      success: true,
      message: 'Ticket status updated successfully',
      data: cleanTicket
    });
  } catch (error) {
    next(error);
  }
};

// Delete ticket
exports.deleteTicket = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { ticketId } = req.params;

    const ticket = await SupportTicket.findOne({
      _id: ticketId,
      userId
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found',
      });
    }

    // Delete attachments from Cloudinary
    for (const attachment of ticket.attachments) {
      try {
        await deleteMedia(attachment.publicId, 'auto');
      } catch (deleteError) {
        console.error('Error deleting attachment:', deleteError);
      }
    }

    // Delete messages attachments
    for (const message of ticket.messages) {
      for (const attachment of message.attachments) {
        try {
          await deleteMedia(attachment.publicId, 'auto');
        } catch (deleteError) {
          console.error('Error deleting message attachment:', deleteError);
        }
      }
    }

    // Delete ticket
    await SupportTicket.findByIdAndDelete(ticketId);

    res.status(200).json({
      success: true,
      message: 'Support ticket deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get ticket statistics
exports.getTicketStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const stats = await SupportTicket.getTicketStats(userId);

    res.status(200).json({
      success: true,
      data: {
        stats
      },
    });
  } catch (error) {
    next(error);
  }
};

// Search tickets
exports.searchTickets = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { query, status, category, priority, page = 1, limit = 10 } = req.query;

    const searchQuery = {
      userId,
      $or: [
        { subject: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { ticketId: { $regex: query, $options: 'i' } }
      ]
    };

    if (status) searchQuery.status = status;
    if (category) searchQuery.categoryId = category;
    if (priority) searchQuery.priority = priority;

    const tickets = await SupportTicket.find(searchQuery)
      .populate('assignedTo', 'username email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalTickets = await SupportTicket.countDocuments(searchQuery);

    // Clean up tickets data
    const cleanTickets = tickets.map(ticket => ({
      ticketId: ticket.ticketId,
      subject: ticket.subject,
      category: ticket.category,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.createdAt,
      lastActivity: ticket.lastActivity,
      assignedTo: ticket.assignedTo ? {
        username: ticket.assignedTo.username,
        email: ticket.assignedTo.email
      } : null
    }));

    res.status(200).json({
      success: true,
      data: {
        tickets: cleanTickets,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalTickets / limit),
          totalTickets,
          hasNextPage: parseInt(page) < Math.ceil(totalTickets / limit),
          hasPrevPage: parseInt(page) > 1
        }
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get ticket categories
exports.getTicketCategories = async (req, res, next) => {
  try {
    const categories = await SupportCategory.getActiveCategories();

    // Clean up categories data
    const cleanCategories = categories.map(category => ({
      id: category._id,
      name: category.name,
      description: category.description,
      icon: category.icon,
      color: category.color,
      usageCount: category.usageCount
    }));

    res.status(200).json({
      success: true,
      data: {
        categories: cleanCategories
      },
    });
  } catch (error) {
    next(error);
  }
};

// Add new category
exports.addCategory = async (req, res, next) => {
  try {
    const { name, description, icon, color } = req.body;

    // Check if category already exists
    const existingCategory = await SupportCategory.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists',
      });
    }

    // Create new category
    const category = new SupportCategory({
      name,
      description: description || '',
      icon: icon || 'help-circle',
      color: color || '#3B82F6',
      createdBy: req.user.id
    });

    await category.save();

    // Clean up category data
    const cleanCategory = {
      id: category._id,
      name: category.name,
      description: category.description,
      icon: category.icon,
      color: category.color,
      usageCount: category.usageCount,
      isActive: category.isActive,
      createdAt: category.createdAt
    };

    res.status(201).json({
      success: true,
      message: 'Category added successfully',
      data: cleanCategory
    });
  } catch (error) {
    next(error);
  }
};

// Get ticket priorities
exports.getTicketPriorities = async (req, res, next) => {
  try {
    const priorities = [
      { value: 'Low', label: 'Low Priority' },
      { value: 'Medium', label: 'Medium Priority' },
      { value: 'High', label: 'High Priority' },
      { value: 'Urgent', label: 'Urgent' }
    ];

    res.status(200).json({
      success: true,
      data: {
        priorities
      },
    });
  } catch (error) {
    next(error);
  }
};
