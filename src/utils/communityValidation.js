const Joi = require('joi');

// Validation for creating a community topic
const createTopicSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Topic name is required',
      'string.min': 'Topic name must be at least 1 character long',
      'string.max': 'Topic name cannot exceed 100 characters',
      'any.required': 'Topic name is required'
    }),
  description: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Topic description cannot exceed 500 characters'
    }),
  metadata: Joi.object({
    color: Joi.string()
      .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
      .optional()
      .messages({
        'string.pattern.base': 'Color must be a valid hex color code'
      }),
    icon: Joi.string()
      .trim()
      .max(50)
      .optional()
      .messages({
        'string.max': 'Icon name cannot exceed 50 characters'
      })
  }).optional()
});

// Validation for updating a community topic
const updateTopicSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Topic name must be at least 1 character long',
      'string.max': 'Topic name cannot exceed 100 characters'
    }),
  description: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Topic description cannot exceed 500 characters'
    }),
  isActive: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isActive must be a boolean value'
    }),
  metadata: Joi.object({
    color: Joi.string()
      .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
      .optional()
      .messages({
        'string.pattern.base': 'Color must be a valid hex color code'
      }),
    icon: Joi.string()
      .trim()
      .max(50)
      .optional()
      .messages({
        'string.max': 'Icon name cannot exceed 50 characters'
      })
  }).optional()
});

// Validation for creating a community post (User-friendly version)
const createPostSchema = Joi.object({
  topicId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Topic ID must be a valid MongoDB ObjectId',
      'any.required': 'Topic ID is required'
    }),
  title: Joi.string()
    .trim()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Post title is required',
      'string.min': 'Post title must be at least 1 character long',
      'string.max': 'Post title cannot exceed 200 characters',
      'any.required': 'Post title is required'
    }),
  description: Joi.string()
    .trim()
    .min(1)
    .max(2000)
    .required()
    .messages({
      'string.empty': 'Post description is required',
      'string.min': 'Post description must be at least 1 character long',
      'string.max': 'Post description cannot exceed 2000 characters',
      'any.required': 'Post description is required'
    }),
  // Optional fields for advanced users/admins
  implementationStatus: Joi.string()
    .valid('completed', 'in-progress', 'planned')
    .optional()
    .messages({
      'any.only': 'Implementation status must be one of: completed, in-progress, planned'
    }),
  metadata: Joi.object({
    tags: Joi.array()
      .items(
        Joi.string()
          .trim()
          .max(50)
          .messages({
            'string.max': 'Each tag cannot exceed 50 characters'
          })
      )
      .max(10)
      .optional()
      .messages({
        'array.max': 'Cannot have more than 10 tags'
      }),
    priority: Joi.string()
      .valid('low', 'medium', 'high')
      .optional()
      .messages({
        'any.only': 'Priority must be one of: low, medium, high'
      }),
    estimatedEffort: Joi.string()
      .valid('small', 'medium', 'large')
      .optional()
      .messages({
        'any.only': 'Estimated effort must be one of: small, medium, large'
      })
  }).optional()
});

// Validation for updating a community post
const updatePostSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(1)
    .max(200)
    .optional()
    .messages({
      'string.min': 'Post title must be at least 1 character long',
      'string.max': 'Post title cannot exceed 200 characters'
    }),
  description: Joi.string()
    .trim()
    .min(1)
    .max(2000)
    .optional()
    .messages({
      'string.min': 'Post description must be at least 1 character long',
      'string.max': 'Post description cannot exceed 2000 characters'
    }),
  implementationStatus: Joi.string()
    .valid('completed', 'in-progress', 'planned')
    .optional()
    .messages({
      'any.only': 'Implementation status must be one of: completed, in-progress, planned'
    }),
  isActive: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isActive must be a boolean value'
    }),
  metadata: Joi.object({
    tags: Joi.array()
      .items(
        Joi.string()
          .trim()
          .max(50)
          .messages({
            'string.max': 'Each tag cannot exceed 50 characters'
          })
      )
      .max(10)
      .optional()
      .messages({
        'array.max': 'Cannot have more than 10 tags'
      }),
    priority: Joi.string()
      .valid('low', 'medium', 'high')
      .optional()
      .messages({
        'any.only': 'Priority must be one of: low, medium, high'
      }),
    estimatedEffort: Joi.string()
      .valid('small', 'medium', 'large')
      .optional()
      .messages({
        'any.only': 'Estimated effort must be one of: small, medium, large'
      })
  }).optional()
});

// Validation for updating implementation status
const updateStatusSchema = Joi.object({
  implementationStatus: Joi.string()
    .valid('completed', 'in-progress', 'planned')
    .required()
    .messages({
      'any.only': 'Implementation status must be one of: completed, in-progress, planned',
      'any.required': 'Implementation status is required'
    })
});

// Validation for getting posts with query parameters
const getPostsSchema = Joi.object({
  topicId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Topic ID must be a valid MongoDB ObjectId'
    }),
  userId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'User ID must be a valid MongoDB ObjectId'
    }),
  implementationStatus: Joi.string()
    .valid('completed', 'in-progress', 'planned')
    .optional()
    .messages({
      'any.only': 'Implementation status must be one of: completed, in-progress, planned'
    }),
  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
  sortBy: Joi.string()
    .valid('createdAt', 'updatedAt', 'title', 'likes', 'status')
    .optional()
    .default('createdAt')
    .messages({
      'any.only': 'Sort by must be one of: createdAt, updatedAt, title, likes, status'
    }),
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .optional()
    .default('desc')
    .messages({
      'any.only': 'Sort order must be either asc or desc'
    })
});

// Validation for getting topics with query parameters
const getTopicsSchema = Joi.object({
  isActive: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isActive must be a boolean value'
    }),
  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
  sortBy: Joi.string()
    .valid('name', 'postCount', 'createdAt', 'updatedAt')
    .optional()
    .default('postCount')
    .messages({
      'any.only': 'Sort by must be one of: name, postCount, createdAt, updatedAt'
    }),
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .optional()
    .default('desc')
    .messages({
      'any.only': 'Sort order must be either asc or desc'
    })
});

module.exports = {
  createTopicSchema,
  updateTopicSchema,
  createPostSchema,
  updatePostSchema,
  updateStatusSchema,
  getPostsSchema,
  getTopicsSchema
};
