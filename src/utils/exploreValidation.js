const Joi = require('joi');

// Validate nearby businesses query parameters
exports.validateNearbyBusinesses = (data) => {
  const schema = Joi.object({
    longitude: Joi.number().min(-180).max(180).required(),
    latitude: Joi.number().min(-90).max(90).required(),
    maxDistance: Joi.number().min(100).max(100000).default(10000), // 100m to 100km
    limit: Joi.number().min(1).max(50).default(20),
    category: Joi.string().trim().max(100).allow(''),
    rating: Joi.number().min(1).max(5),
    priceRange: Joi.alternatives().try(
      Joi.string().valid('$', '$$', '$$$', '$$$$'),
      Joi.array().items(Joi.string().valid('$', '$$', '$$$', '$$$$'))
    ),
    openedStatus: Joi.string().valid('open', 'closed', 'any').default('any'),
    businessType: Joi.string().valid(
      'Small business',
      'Medium sized business',
      'Franchise',
      'Corporation',
      'Non profit organizations',
      'Startup',
      'Online business',
      'Others'
    ),
    features: Joi.alternatives().try(
      Joi.string().trim().max(100),
      Joi.array().items(Joi.string().trim().max(100))
    )
  });

  return schema.validate(data, { abortEarly: false });
};

// Validate top picks query parameters
exports.validateTopPicks = (data) => {
  const schema = Joi.object({
    longitude: Joi.number().min(-180).max(180),
    latitude: Joi.number().min(-90).max(90),
    maxDistance: Joi.number().min(1000).max(100000).default(25000), // 1km to 100km
    limit: Joi.number().min(1).max(30).default(15),
    category: Joi.string().trim().max(100).allow(''),
    priceRange: Joi.alternatives().try(
      Joi.string().valid('$', '$$', '$$$', '$$$$'),
      Joi.array().items(Joi.string().valid('$', '$$', '$$$', '$$$$'))
    )
  }).and('longitude', 'latitude'); // Both coordinates required if one is provided

  return schema.validate(data, { abortEarly: false });
};

// Validate "On The Rise" query parameters
exports.validateOnTheRise = (data) => {
  const schema = Joi.object({
    longitude: Joi.number().min(-180).max(180),
    latitude: Joi.number().min(-90).max(90),
    maxDistance: Joi.number().min(1000).max(100000).default(25000), // 1km to 100km
    limit: Joi.number().min(1).max(30).default(15),
    category: Joi.string().trim().max(100).allow(''),
    priceRange: Joi.alternatives().try(
      Joi.string().valid('$', '$$', '$$$', '$$$$'),
      Joi.array().items(Joi.string().valid('$', '$$', '$$$', '$$$$'))
    ),
    daysBack: Joi.number().min(1).max(365).default(30) // Look back 1 day to 1 year
  }).and('longitude', 'latitude'); // Both coordinates required if one is provided

  return schema.validate(data, { abortEarly: false });
};

// Validate comprehensive explore query parameters
exports.validateExploreBusinesses = (data) => {
  const schema = Joi.object({
    longitude: Joi.number().min(-180).max(180),
    latitude: Joi.number().min(-90).max(90),
    maxDistance: Joi.number().min(1000).max(200000).default(50000), // 1km to 200km
    limit: Joi.number().min(1).max(50).default(20),
    page: Joi.number().min(1).default(1),
    sortBy: Joi.string().valid(
      'relevance',
      'distance',
      'rating',
      'popularity',
      'newest',
      'alphabetical'
    ).default('relevance'),
    search: Joi.string().trim().max(200).allow(''),
    category: Joi.string().trim().max(100).allow(''),
    rating: Joi.number().min(1).max(5),
    priceRange: Joi.alternatives().try(
      Joi.string().valid('$', '$$', '$$$', '$$$$'),
      Joi.array().items(Joi.string().valid('$', '$$', '$$$', '$$$$'))
    ),
    openedStatus: Joi.string().valid('open', 'closed', 'any').default('any'),
    businessType: Joi.string().valid(
      'Small business',
      'Medium sized business',
      'Franchise',
      'Corporation',
      'Non profit organizations',
      'Startup',
      'Online business',
      'Others'
    ),
    features: Joi.alternatives().try(
      Joi.string().trim().max(100),
      Joi.array().items(Joi.string().trim().max(100))
    )
  }).and('longitude', 'latitude'); // Both coordinates required if one is provided

  return schema.validate(data, { abortEarly: false });
};

// Validate recent searches save request
exports.validateRecentSearches = (data) => {
  const schema = Joi.object({
    searchTerm: Joi.string().trim().max(200).allow(''),
    category: Joi.string().trim().max(100).allow(''),
    location: Joi.string().trim().max(200).allow(''),
    priceRange: Joi.alternatives().try(
      Joi.string().valid('$', '$$', '$$$', '$$$$'),
      Joi.array().items(Joi.string().valid('$', '$$', '$$$', '$$$$'))
    ),
    businessType: Joi.string().valid(
      'Small business',
      'Medium sized business',
      'Franchise',
      'Corporation',
      'Non profit organizations',
      'Startup',
      'Online business',
      'Others'
    ),
    features: Joi.alternatives().try(
      Joi.string().trim().max(100),
      Joi.array().items(Joi.string().trim().max(100))
    ),
    rating: Joi.number().min(1).max(5),
    resultCount: Joi.number().min(0),
    coordinates: Joi.object({
      longitude: Joi.number().min(-180).max(180),
      latitude: Joi.number().min(-90).max(90)
    })
  });

  return schema.validate(data, { abortEarly: false });
};

// Validate explore filters for advanced filtering
exports.validateExploreFilters = (data) => {
  const schema = Joi.object({
    categories: Joi.array().items(Joi.string().trim().max(100)),
    businessTypes: Joi.array().items(Joi.string().valid(
      'Small business',
      'Medium sized business',
      'Franchise',
      'Corporation',
      'Non profit organizations',
      'Startup',
      'Online business',
      'Others'
    )),
    priceRanges: Joi.array().items(Joi.string().valid('$', '$$', '$$$', '$$$$')),
    features: Joi.array().items(Joi.string().trim().max(100)),
    minRating: Joi.number().min(1).max(5),
    maxRating: Joi.number().min(1).max(5),
    openedStatus: Joi.string().valid('open', 'closed', 'any').default('any'),
    hasDelivery: Joi.boolean(),
    hasTakeout: Joi.boolean(),
    hasOutdoorSeating: Joi.boolean(),
    acceptsReservations: Joi.boolean(),
    wheelchairAccessible: Joi.boolean(),
    petFriendly: Joi.boolean(),
    wifiAvailable: Joi.boolean(),
    parkingAvailable: Joi.boolean(),
    maxDistance: Joi.number().min(1000).max(200000).default(50000),
    sortBy: Joi.string().valid(
      'relevance',
      'distance',
      'rating',
      'popularity',
      'newest',
      'alphabetical',
      'priceAsc',
      'priceDesc'
    ).default('relevance'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  });

  return schema.validate(data, { abortEarly: false });
};

// Validate location-based search parameters
exports.validateLocationSearch = (data) => {
  const schema = Joi.object({
    longitude: Joi.number().min(-180).max(180).required(),
    latitude: Joi.number().min(-90).max(90).required(),
    maxDistance: Joi.number().min(100).max(200000).default(10000), // 100m to 200km
    limit: Joi.number().min(1).max(100).default(20),
    businessType: Joi.string().valid(
      'Small business',
      'Medium sized business',
      'Franchise',
      'Corporation',
      'Non profit organizations',
      'Startup',
      'Online business',
      'Others'
    ),
    industry: Joi.string().trim().max(100),
    priceRange: Joi.string().valid('$', '$$', '$$$', '$$$$'),
    minRating: Joi.number().min(1).max(5)
  });

  return schema.validate(data, { abortEarly: false });
};

// Validate search suggestions request
exports.validateSearchSuggestions = (data) => {
  const schema = Joi.object({
    query: Joi.string().trim().min(1).max(100).required(),
    limit: Joi.number().min(1).max(20).default(10),
    type: Joi.string().valid('businesses', 'categories', 'locations', 'all').default('all'),
    longitude: Joi.number().min(-180).max(180),
    latitude: Joi.number().min(-90).max(90),
    maxDistance: Joi.number().min(1000).max(100000).default(25000)
  }).and('longitude', 'latitude'); // Both coordinates required if one is provided

  return schema.validate(data, { abortEarly: false });
};

// Validate trending searches request
exports.validateTrendingSearches = (data) => {
  const schema = Joi.object({
    limit: Joi.number().min(1).max(50).default(10),
    timeframe: Joi.string().valid('hour', 'day', 'week', 'month').default('day'),
    category: Joi.string().trim().max(100).allow(''),
    location: Joi.object({
      longitude: Joi.number().min(-180).max(180),
      latitude: Joi.number().min(-90).max(90),
      radius: Joi.number().min(1000).max(100000).default(25000)
    })
  });

  return schema.validate(data, { abortEarly: false });
}; 