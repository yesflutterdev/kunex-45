// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const swaggerUi = require('swagger-ui-express');

const authRoutes = require('./routes/auth.routes');
const personalProfileRoutes = require('./routes/personalProfile.routes');
const businessProfileRoutes = require('./routes/businessProfile.routes');
const socialMediaLinkRoutes = require('./routes/socialMediaLink.routes');
const paymentRoutes = require('./routes/payment.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const webhookRoutes = require('./routes/webhook.routes');
const exploreRoutes = require('./routes/explore.routes');
const favoritesRoutes = require('./routes/favorites.routes');
const foldersRoutes = require('./routes/folders.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const settingsRoutes = require('./routes/settings.routes');
const builderPageRoutes = require('./routes/builderPage.routes');
const widgetRoutes = require('./routes/widget.routes');
const formSubmissionRoutes = require('./routes/formSubmission.routes');
const communityRoutes = require('./routes/community.routes');
const swaggerSpec = require('./docs/swagger');
const errorHandler = require('./middleware/error-handler.mw.js');

// Passport config
require('./config/passport');

const app = express();

// Webhook routes (must be before express.json() middleware for raw body parsing)
app.use('/api/webhooks', webhookRoutes);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(passport.initialize());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const { healthCheck } = require('./config/database');
    const dbHealth = await healthCheck();
    
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: dbHealth,
      version: '1.0.0'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile/personal', personalProfileRoutes);
app.use('/api/profile/business', businessProfileRoutes);
app.use('/api/social-media', socialMediaLinkRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/explore', exploreRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/folders', foldersRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/builder/pages', builderPageRoutes);
app.use('/api/builder/widgets', widgetRoutes);
app.use('/api/forms', formSubmissionRoutes);
app.use('/api/community', communityRoutes);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to Express MongoDB Auth API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use(errorHandler);

module.exports = app;
