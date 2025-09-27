const Joi = require('joi');

// Validate folder creation/update
exports.validateFolder = (data) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(1).max(100).required(),
    description: Joi.string().trim().max(500).allow(''),
    color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).default('#3B82F6'),
    icon: Joi.string().trim().max(50).default('folder'),
    isPublic: Joi.boolean().default(false),
    sortOrder: Joi.number().integer().min(0).default(0),
    metadata: Joi.object({
      tags: Joi.array().items(Joi.string().trim().max(50)).max(10),
      category: Joi.string().valid(
        'business', 'personal', 'work', 'travel', 'food', 'entertainment', 'other'
      ).default('other')
    }).default({})
  });

  return schema.validate(data, { abortEarly: false });
};

// Validate folder update (partial)
exports.validateFolderUpdate = (data) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(1).max(100),
    description: Joi.string().trim().max(500).allow(''),
    color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
    icon: Joi.string().trim().max(50),
    isPublic: Joi.boolean(),
    sortOrder: Joi.number().integer().min(0),
    metadata: Joi.object({
      tags: Joi.array().items(Joi.string().trim().max(50)).max(10),
      category: Joi.string().valid(
        'business', 'personal', 'work', 'travel', 'food', 'entertainment', 'other'
      )
    })
  }).min(1); // At least one field must be provided

  return schema.validate(data, { abortEarly: false });
};

// Validate favorite creation/update
exports.validateFavorite = (data) => {
  const schema = Joi.object({
    type: Joi.string().valid('Page', 'Product', 'Promotion', 'Event', 'BusinessProfile').required(),
    widgetId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    productId: Joi.string().when('type', {
      is: 'Product',
      then: Joi.required(),
      otherwise: Joi.forbidden()
    }),
    folderId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
    notes: Joi.string().trim().max(1000).allow(''),
    tags: Joi.array().items(Joi.string().trim().max(50)).max(20),
    rating: Joi.number().min(1).max(5),
    isPrivate: Joi.boolean().default(false),
    metadata: Joi.object({
      addedFrom: Joi.string().valid(
        'search', 'explore', 'profile', 'recommendation', 'share', 'other'
      ).default('other'),
      deviceType: Joi.string().valid(
        'mobile', 'tablet', 'desktop', 'other'
      ).default('other'),
      location: Joi.object({
        latitude: Joi.number().min(-90).max(90),
        longitude: Joi.number().min(-180).max(180),
        address: Joi.string().trim().max(200)
      }),
      reminderDate: Joi.date().min('now'),
      reminderNote: Joi.string().trim().max(200)
    }).default({})
  });

  return schema.validate(data, { abortEarly: false });
};

// Validate favorite update (partial)
exports.validateFavoriteUpdate = (data) => {
  const schema = Joi.object({
    folderId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
    notes: Joi.string().trim().max(1000).allow(''),
    tags: Joi.array().items(Joi.string().trim().max(50)).max(20),
    rating: Joi.number().min(1).max(5),
    isPrivate: Joi.boolean(),
    metadata: Joi.object({
      addedFrom: Joi.string().valid(
        'search', 'explore', 'profile', 'recommendation', 'share', 'other'
      ),
      deviceType: Joi.string().valid(
        'mobile', 'tablet', 'desktop', 'other'
      ),
      location: Joi.object({
        latitude: Joi.number().min(-90).max(90),
        longitude: Joi.number().min(-180).max(180),
        address: Joi.string().trim().max(200)
      }),
      reminderDate: Joi.date().min('now'),
      reminderNote: Joi.string().trim().max(200)
    })
  }).min(1); // At least one field must be provided

  return schema.validate(data, { abortEarly: false });
};

// Validate get folders query parameters
exports.validateGetFolders = (data) => {
  const schema = Joi.object({
    includeEmpty: Joi.boolean().default(true),
    sortBy: Joi.string().valid(
      'sortOrder', 'name', 'created', 'updated', 'itemCount'
    ).default('sortOrder'),
    limit: Joi.number().integer().min(1).max(100).default(50),
    category: Joi.string().valid(
      'business', 'personal', 'work', 'travel', 'food', 'entertainment', 'other'
    ),
    populatePages: Joi.boolean().default(false)
  });

  return schema.validate(data, { abortEarly: false });
};

// Validate get favorites query parameters
exports.validateGetFavorites = (data) => {
  const schema = Joi.object({
    folderId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
    tags: Joi.alternatives().try(
      Joi.string().trim(),
      Joi.array().items(Joi.string().trim())
    ),
    rating: Joi.number().min(1).max(5),
    sortBy: Joi.string().valid(
      'created', 'updated', 'name', 'rating', 'visits', 'lastVisited'
    ).default('created'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    limit: Joi.number().integer().min(1).max(100).default(20),
    page: Joi.number().integer().min(1).default(1),
    search: Joi.string().trim().max(200),
    isPrivate: Joi.boolean()
  });

  return schema.validate(data, { abortEarly: false });
};

// Validate folder search query parameters
exports.validateFolderSearch = (data) => {
  const schema = Joi.object({
    query: Joi.string().trim().min(1).max(100).required(),
    limit: Joi.number().integer().min(1).max(50).default(10),
    includeEmpty: Joi.boolean().default(false)
  });

  return schema.validate(data, { abortEarly: false });
};

// Validate bulk operations
exports.validateBulkFavoriteOperation = (data) => {
  const schema = Joi.object({
    favoriteIds: Joi.array()
      .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
      .min(1)
      .max(50)
      .required(),
    operation: Joi.string().valid('move', 'delete', 'tag', 'untag').required(),
    targetFolderId: Joi.when('operation', {
      is: 'move',
      then: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
      otherwise: Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
    }),
    tags: Joi.when('operation', {
      is: Joi.string().valid('tag', 'untag'),
      then: Joi.array().items(Joi.string().trim().max(50)).min(1).required(),
      otherwise: Joi.array().items(Joi.string().trim().max(50))
    })
  });

  return schema.validate(data, { abortEarly: false });
};

// Validate folder reorder
exports.validateFolderReorder = (data) => {
  const schema = Joi.object({
    folderOrders: Joi.array()
      .items(
        Joi.object({
          folderId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
          sortOrder: Joi.number().integer().min(0).required()
        })
      )
      .min(1)
      .max(50)
      .required()
  });

  return schema.validate(data, { abortEarly: false });
};

// Validate analytics query parameters
exports.validateAnalyticsQuery = (data) => {
  const schema = Joi.object({
    timeframe: Joi.string().valid('day', 'week', 'month', 'year', 'all').default('month'),
    folderId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
    groupBy: Joi.string().valid('day', 'week', 'month', 'folder', 'type').default('day'),
    limit: Joi.number().integer().min(1).max(100).default(10)
  });

  return schema.validate(data, { abortEarly: false });
};

// Validate reminder settings
exports.validateReminderSettings = (data) => {
  const schema = Joi.object({
    favoriteId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    reminderDate: Joi.date().min('now').required(),
    reminderNote: Joi.string().trim().max(200).allow('')
  });

  return schema.validate(data, { abortEarly: false });
};

// Validate export preferences
exports.validateExportPreferences = (data) => {
  const schema = Joi.object({
    format: Joi.string().valid('json', 'csv', 'pdf').default('json'),
    folderId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
    includeNotes: Joi.boolean().default(true),
    includeTags: Joi.boolean().default(true),
    includeAnalytics: Joi.boolean().default(false),
    dateRange: Joi.object({
      startDate: Joi.date(),
      endDate: Joi.date().min(Joi.ref('startDate'))
    })
  });

  return schema.validate(data, { abortEarly: false });
}; 