const FormSubmission = require('../models/formSubmission.model');
const BuilderPage = require('../models/builderPage.model');
const Widget = require('../models/widget.model');
const BusinessProfile = require('../models/businessProfile.model');

// Submit form data from a user-built page
exports.submitForm = async (req, res, next) => {
  try {
    const {
      pageId,
      widgetId,
      formData,
      submissionType = 'contact',
      timeOnPage,
      formCompletionTime,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign
    } = req.body;

    // Validate required fields
    if (!pageId || !widgetId || !formData) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: pageId, widgetId, formData'
      });
    }

    // Verify page exists and is published
    const page = await BuilderPage.findOne({ 
      _id: pageId, 
      'settings.isPublished': true 
    });
    
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found or not published'
      });
    }

    // Verify widget exists and is a form type
    const widget = await Widget.findOne({ 
      _id: widgetId, 
      pageId: pageId,
      type: 'form',
      status: 'active',
      isVisible: true
    });

    if (!widget) {
      return res.status(404).json({
        success: false,
        message: 'Form widget not found or not accessible'
      });
    }

    // Extract form fields configuration from widget and transform to array format
    const formConfig = widget.settings.specific?.form || {};
    const formFields = [];
    
    // Transform widget form configuration to array of field objects
    // Create plain objects that match the schema structure exactly
    if (formConfig.titleTextBox) {
      const nameField = {
        name: 'name',
        type: 'text',
        label: formConfig.titleTextBox,
        required: true
      };
      formFields.push(nameField);
    }
    
    if (formConfig.hasEmail) {
      const emailField = {
        name: 'email',
        type: 'email',
        label: 'Email',
        placeholder: formConfig.emailPlaceholder || 'Enter your email',
        required: true,
        validation: {
          pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
        }
      };
      formFields.push(emailField);
    }
    
    if (formConfig.hasPhoneNumber) {
      const phoneField = {
        name: 'phone',
        type: 'phone',
        label: 'Phone Number',
        placeholder: formConfig.phoneNumberPlaceholder || 'Enter your phone number',
        required: false,
        validation: {
          pattern: '^[\\+]?[1-9][\\d]{0,15}$'
        }
      };
      formFields.push(phoneField);
    }
    
    // Add a default message field if no other fields are configured
    if (formFields.length === 0) {
      const messageField = {
        name: 'message',
        type: 'textarea',
        label: 'Message',
        required: true
      };
      formFields.push(messageField);
    }
    
    // Validate form data against widget configuration
    const validationErrors = [];
    for (const field of formFields) {
      if (field.required && (!formData[field.name] || formData[field.name].toString().trim() === '')) {
        validationErrors.push(`${field.name} is required`);
      }
      
      if (formData[field.name] && field.validation) {
        const value = formData[field.name];
        
        if (field.validation.minLength && value.toString().length < field.validation.minLength) {
          validationErrors.push(`${field.name} must be at least ${field.validation.minLength} characters`);
        }
        
        if (field.validation.maxLength && value.toString().length > field.validation.maxLength) {
          validationErrors.push(`${field.name} must be no more than ${field.validation.maxLength} characters`);
        }
        
        if (field.validation.pattern) {
          const regex = new RegExp(field.validation.pattern);
          if (!regex.test(value)) {
            if (field.type === 'email') {
              validationErrors.push(`${field.name} must be a valid email address`);
            } else if (field.type === 'phone') {
              validationErrors.push(`${field.name} must be a valid phone number`);
            } else {
              validationErrors.push(`${field.name} format is invalid`);
            }
          }
        }
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Form validation failed',
        errors: validationErrors
      });
    }

    // Create submission data
    const submissionData = {
      pageId,
      widgetId,
      businessId: page.businessId,
      formData,
      formFields: formFields, // Add formFields back
      submissionType,
      timeOnPage,
      formCompletionTime,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };

    let submission;
    try {
      submission = new FormSubmission(submissionData);
      await submission.save();
    } catch (saveError) {
      console.error('Save error:', saveError);
      throw saveError;
    }

    // Update widget analytics
    await widget.updateAnalytics('conversions', 1);

    res.status(201).json({
      success: true,
      message: 'Form submitted successfully',
      data: {
        submissionId: submission._id,
        message: 'Thank you for your submission!'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get form submissions for a business (authenticated)
exports.getSubmissions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      businessId,
      pageId,
      widgetId,
      status,
      submissionType,
      priority,
      page = 1,
      limit = 20,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      period
    } = req.query;

    // Verify business ownership
    if (businessId) {
      const business = await BusinessProfile.findOne({ _id: businessId, userId });
      if (!business) {
        return res.status(403).json({
          success: false,
          message: 'Business profile not found or access denied'
        });
      }
    }

    // Build query
    const query = { businessId: businessId || { $exists: true } };
    if (pageId) query.pageId = pageId;
    if (widgetId) query.widgetId = widgetId;
    if (status) query.status = status;
    if (submissionType) query.submissionType = submissionType;
    if (priority) query.priority = priority;

    // Add search if provided
    if (search) {
      query.$text = { $search: search };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Get submissions
    const submissions = await FormSubmission.find(query)
      .populate('pageId', 'title slug')
      .populate('widgetId', 'name type')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await FormSubmission.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        submissions,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / parseInt(limit)),
          count: submissions.length,
          totalItems: total
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get submission by ID
exports.getSubmissionById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const submission = await FormSubmission.findById(id)
      .populate('pageId', 'title slug')
      .populate('widgetId', 'name type')
      .populate('businessId', 'businessName username');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Verify access (business owner or page owner)
    if (submission.businessId) {
      const business = await BusinessProfile.findOne({ _id: submission.businessId, userId });
      if (!business) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: { submission }
    });
  } catch (error) {
    next(error);
  }
};

// Update submission status
exports.updateSubmissionStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { status, responseMessage } = req.body;

    const submission = await FormSubmission.findById(id);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Verify access
    if (submission.businessId) {
      const business = await BusinessProfile.findOne({ _id: submission.businessId, userId });
      if (!business) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    // Update status based on action
    switch (status) {
      case 'read':
        await submission.markAsRead();
        break;
      case 'replied':
        await submission.markAsReplied(responseMessage);
        break;
      case 'archived':
        await submission.archive();
        break;
      case 'spam':
        await submission.markAsSpam();
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
    }

    res.status(200).json({
      success: true,
      message: 'Submission status updated successfully',
      data: { submission }
    });
  } catch (error) {
    next(error);
  }
};

// Get submission statistics
exports.getSubmissionStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { businessId, period = '30d' } = req.query;

    // Verify business ownership
    if (businessId) {
      const business = await BusinessProfile.findOne({ _id: businessId, userId });
      if (!business) {
        return res.status(403).json({
          success: false,
          message: 'Business profile not found or access denied'
        });
      }
    }

    // Get statistics
    const stats = await FormSubmission.getSubmissionStats(businessId, period);
    const unreadCount = await FormSubmission.getUnreadCount(businessId);

    // Calculate totals
    const totalSubmissions = stats.reduce((sum, day) => sum + day.count, 0);
    const totalNew = stats.reduce((sum, day) => sum + day.new, 0);
    const totalReplied = stats.reduce((sum, day) => sum + day.replied, 0);

    res.status(200).json({
      success: true,
      data: {
        period,
        stats,
        summary: {
          totalSubmissions,
          totalNew,
          totalReplied,
          unreadCount,
          responseRate: totalSubmissions > 0 ? Math.round((totalReplied / totalSubmissions) * 100) : 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete submission
exports.deleteSubmission = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const submission = await FormSubmission.findById(id);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Verify access
    if (submission.businessId) {
      const business = await BusinessProfile.findOne({ _id: submission.businessId, userId });
      if (!business) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    await FormSubmission.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Submission deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Bulk update submissions
exports.bulkUpdateSubmissions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { submissionIds, action, responseMessage } = req.body;

    if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'submissionIds must be a non-empty array'
      });
    }

    if (!action) {
      return res.status(400).json({
        success: false,
        message: 'action is required'
      });
    }

    // Get submissions and verify access
    const submissions = await FormSubmission.find({ _id: { $in: submissionIds } });
    
    for (const submission of submissions) {
      if (submission.businessId) {
        const business = await BusinessProfile.findOne({ _id: submission.businessId, userId });
        if (!business) {
          return res.status(403).json({
            success: false,
            message: 'Access denied to one or more submissions'
          });
        }
      }
    }

    // Perform bulk action
    const updatePromises = submissionIds.map(id => {
      const updateData = {};
      
      switch (action) {
        case 'mark_read':
          updateData.status = 'read';
          break;
        case 'mark_replied':
          updateData.status = 'replied';
          updateData.respondedAt = new Date();
          if (responseMessage) updateData.responseMessage = responseMessage;
          break;
        case 'archive':
          updateData.status = 'archived';
          break;
        case 'mark_spam':
          updateData.status = 'spam';
          break;
        default:
          return Promise.reject(new Error('Invalid action'));
      }
      
      return FormSubmission.findByIdAndUpdate(id, updateData, { new: true });
    });

    const updatedSubmissions = await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      message: `Bulk action '${action}' completed successfully`,
      data: {
        updatedCount: updatedSubmissions.length,
        submissions: updatedSubmissions
      }
    });
  } catch (error) {
    next(error);
  }
};
