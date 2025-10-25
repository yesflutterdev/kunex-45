const Joi = require('joi');

// Validate support ticket creation
exports.validateSupportTicket = (data) => {
  const schema = Joi.object({
    subject: Joi.string()
      .trim()
      .min(5)
      .max(200)
      .required()
      .messages({
        'string.min': 'Subject must be at least 5 characters long',
        'string.max': 'Subject cannot exceed 200 characters',
        'any.required': 'Subject is required'
      }),
    
    category: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Category must be a valid MongoDB ObjectId',
        'any.required': 'Category is required'
      }),
    
    description: Joi.string()
      .trim()
      .min(10)
      .max(5000)
      .required()
      .messages({
        'string.min': 'Description must be at least 10 characters long',
        'string.max': 'Description cannot exceed 5000 characters',
        'any.required': 'Description is required'
      })
  });

  return schema.validate(data);
};

// Validate support message
exports.validateSupportMessage = (data) => {
  const schema = Joi.object({
    message: Joi.string()
      .trim()
      .min(1)
      .max(2000)
      .required()
      .messages({
        'string.min': 'Message cannot be empty',
        'string.max': 'Message cannot exceed 2000 characters',
        'any.required': 'Message is required'
      })
  });

  return schema.validate(data);
};

// Validate ticket status update
exports.validateTicketStatusUpdate = (data) => {
  const schema = Joi.object({
    status: Joi.string()
      .valid('Open', 'In Progress', 'Completed', 'Closed', 'Cancelled')
      .required()
      .messages({
        'any.only': 'Status must be Open, In Progress, Completed, Closed, or Cancelled',
        'any.required': 'Status is required'
      }),
    
    resolution: Joi.string()
      .trim()
      .max(1000)
      .when('status', {
        is: Joi.valid('Completed', 'Closed'),
        then: Joi.required(),
        otherwise: Joi.optional()
      })
      .messages({
        'string.max': 'Resolution cannot exceed 1000 characters',
        'any.required': 'Resolution is required when closing a ticket'
      })
  });

  return schema.validate(data);
};

// Validate file upload
exports.validateFileUpload = (file) => {
  if (!file) {
    return { error: { details: [{ message: 'File is required' }] } };
  }

  const allowedMimeTypes = [
    // Images
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    // Videos
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/wmv',
    'video/webm',
    'video/mkv',
    // Documents
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  const maxSize = 100 * 1024 * 1024; // 100MB

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return { 
      error: { 
        details: [{ 
          message: 'Only images, videos, and documents are allowed. Supported formats: JPG, PNG, GIF, WebP, MP4, AVI, MOV, WMV, WebM, MKV, PDF, TXT, DOC, DOCX' 
        }] 
      } 
    };
  }

  if (file.size > maxSize) {
    return { 
      error: { 
        details: [{ 
          message: 'File size must be less than 100MB' 
        }] 
      } 
    };
  }

  return { value: file };
};

// Validate multiple file uploads
exports.validateMultipleFileUpload = (files) => {
  if (!files || files.length === 0) {
    return { error: { details: [{ message: 'At least one file is required' }] } };
  }

  if (files.length > 10) {
    return { error: { details: [{ message: 'Maximum 10 files allowed' }] } };
  }

  const allowedMimeTypes = [
    // Images
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    // Videos
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/wmv',
    'video/webm',
    'video/mkv',
    // Documents
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  const maxSize = 100 * 1024 * 1024; // 100MB
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  for (const file of files) {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return { 
        error: { 
          details: [{ 
            message: 'Only images, videos, and documents are allowed. Supported formats: JPG, PNG, GIF, WebP, MP4, AVI, MOV, WMV, WebM, MKV, PDF, TXT, DOC, DOCX' 
          }] 
        } 
      };
    }

    if (file.size > maxSize) {
      return { 
        error: { 
          details: [{ 
            message: 'Each file size must be less than 100MB' 
          }] 
        } 
      };
    }
  }

  if (totalSize > 500 * 1024 * 1024) { // 500MB total
    return { 
      error: { 
        details: [{ 
          message: 'Total file size must be less than 500MB' 
        }] 
      } 
    };
  }

  return { value: files };
};

// Validate ticket search parameters
exports.validateTicketSearch = (data) => {
  const schema = Joi.object({
    query: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .messages({
        'string.min': 'Search query must be at least 1 character',
        'string.max': 'Search query cannot exceed 100 characters'
      }),
    
    status: Joi.string()
      .valid('Open', 'In Progress', 'Completed', 'Closed', 'Cancelled')
      .messages({
        'any.only': 'Status must be Open, In Progress, Completed, Closed, or Cancelled'
      }),
    
    category: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .messages({
        'string.pattern.base': 'Category must be a valid MongoDB ObjectId'
      }),
    
    priority: Joi.string()
      .valid('Low', 'Medium', 'High', 'Urgent')
      .messages({
        'any.only': 'Priority must be Low, Medium, High, or Urgent'
      }),
    
    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .messages({
        'number.base': 'Page must be a number',
        'number.integer': 'Page must be an integer',
        'number.min': 'Page must be at least 1'
      }),
    
    limit: Joi.number()
      .integer()
      .min(1)
      .max(50)
      .default(10)
      .messages({
        'number.base': 'Limit must be a number',
        'number.integer': 'Limit must be an integer',
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 50'
      })
  });

  return schema.validate(data);
};
