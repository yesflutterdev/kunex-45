const swaggerJsDoc = require('swagger-jsdoc');
const path = require('path');

const routesPath = path.join(__dirname, '../routes');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Express MongoDB Auth API',
      version: '1.0.0',
      description: 'A REST API with Express and MongoDB for authentication, business profiles, and favorites management',
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://kunex-backend.vercel.app' 
          : `http://localhost:${process.env.PORT || 3000}`,
        description: process.env.NODE_ENV === 'production' ? 'Production Server' : 'Development Server',
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Personal Profiles',
        description: 'Personal profile management endpoints'
      },
      {
        name: 'Business Profiles',
        description: 'Business profile management endpoints'
      },
      {
        name: 'Social Media',
        description: 'Social media links management endpoints'
      },
      {
        name: 'Payments',
        description: 'Payment processing and management endpoints'
      },
      {
        name: 'Subscriptions',
        description: 'Subscription management endpoints'
      },
      {
        name: 'Webhooks',
        description: 'Webhook handling endpoints'
      },
      {
        name: 'Explore',
        description: 'Business discovery and search endpoints (KON-31, KON-32, KON-33)'
      },
      {
        name: 'Favorites',
        description: 'Favorites management endpoints (KON-34, KON-35, KON-36)'
      },
      {
        name: 'Folders',
        description: 'Folder organization endpoints for favorites (KON-34, KON-35)'
      },
      {
        name: 'Builder Pages',
        description: 'Builder page management endpoints for creating and managing custom pages'
      },
      {
        name: 'Widgets',
        description: 'Widget management endpoints for creating and managing page widgets'
      },
      {
        name: 'Form Submissions',
        description: 'Form submission management endpoints for handling form data from user-built pages'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: [
    path.join(routesPath, '*.js'),
    path.join(routesPath, 'auth.routes.js'),
    path.join(routesPath, 'payment.routes.js'),
    path.join(routesPath, 'subscription.routes.js'),
    path.join(routesPath, 'webhook.routes.js'),
    path.join(routesPath, 'personalProfile.routes.js'),
    path.join(routesPath, 'businessProfile.routes.js'),
    path.join(routesPath, 'socialMediaLink.routes.js'),
    path.join(routesPath, 'explore.routes.js'),
    path.join(routesPath, 'favorites.routes.js'),
    path.join(routesPath, 'folders.routes.js'),
    path.join(routesPath, 'builderPage.routes.js'),
    path.join(routesPath, 'widget.routes.js'),
  ],
};

const swaggerSpec = swaggerJsDoc(options);

module.exports = swaggerSpec;
