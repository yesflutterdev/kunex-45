# Kunex Backend App

A comprehensive and scalable business platform built with Express.js and MongoDB, featuring JWT authentication, Google OAuth, 2FA, email verification, comprehensive profile management for both personal and business profiles, a complete Stripe-powered payment system with subscription management, page builder with widgets, advanced analytics, business discovery, and favorites management.

## Features

- 🔐 Complete authentication system

  - Email/password registration and login
  - JWT-based authentication
  - Google OAuth integration
  - Two-factor authentication (2FA)
  - Email verification
  - Password reset functionality
  - Login history tracking

- 👤 Personal Profile Management

  - Complete personal profile CRUD operations
  - Profile photo upload with Cloudinary integration
  - Profile completion tracking
  - Public profile viewing

- 🏢 Business Profile Management

  - Comprehensive business profile system
  - Business logo and cover image management
  - Geospatial location support with nearby search
  - Business hours management with open/closed status
  - Industry categorization and tagging
  - Theme color customization
  - Call-to-action button configuration
  - Advanced search and filtering capabilities
  - Business analytics and metrics tracking
  - Username availability checking
  - Virtual contact card support

- 🔗 Social Media Links Management

  - Complete social media links CRUD operations
  - Support for 12+ platforms (Instagram, TikTok, Facebook, Twitter, LinkedIn, YouTube, etc.)
  - Automatic URL normalization and validation
  - Platform-specific handle extraction
  - Embed settings configuration (layout, display options)
  - Metadata management (follower count, verification status)
  - Click tracking and analytics
  - Bulk display order management
  - Public/private link visibility
  - Business and personal profile integration

- 🎨 Page Builder & Widget System

  - **Page Builder**: Create custom landing pages, portfolios, and business pages
  - **Widget Library**: 30+ widget types (text, image, video, forms, galleries, maps, social feeds, etc.)
  - **Template System**: Pre-built templates for different business categories
  - **Drag & Drop Interface**: Visual page building with real-time preview
  - **SEO Optimization**: Built-in SEO settings and meta tag management
  - **Responsive Design**: Mobile-first responsive layouts
  - **Version Control**: Page versioning with rollback capabilities
  - **Analytics Integration**: Page performance tracking and widget analytics
  - **Custom Styling**: Theme customization and CSS styling options
  - **Asset Management**: Image and file upload with optimization

- 📊 Advanced Analytics & Tracking

  - **View Tracking**: Comprehensive view and interaction tracking
  - **Location Analytics**: Geographic analysis of visitors and engagement
  - **Link Analytics**: Social media and website link performance tracking
  - **Peak Hour Analysis**: Time-based analytics for optimal posting times
  - **Real-time Analytics**: Live visitor tracking and engagement metrics
  - **Device Analytics**: Mobile, tablet, and desktop usage patterns
  - **Referral Tracking**: Traffic source analysis and campaign tracking
  - **Export Capabilities**: Data export in multiple formats (CSV, Excel, PDF)
  - **Custom Dashboards**: Personalized analytics dashboards
  - **Engagement Scoring**: Advanced engagement metrics and scoring

- 🔍 Business Discovery & Explore

  - **Nearby Search**: Geospatial search for businesses within specified radius
  - **Advanced Filtering**: Filter by category, rating, price range, features, and business type
  - **Top Picks**: Algorithm-based business recommendations
  - **Rising Businesses**: Trending and newly popular businesses
  - **Search History**: Recent searches with quick access
  - **Category Browsing**: Browse businesses by industry and category
  - **Distance Calculation**: Accurate distance measurements and routing
  - **Open Status**: Real-time business hours and availability
  - **Review Integration**: Rating and review system integration
  - **Map Integration**: Interactive map views with business markers

- ⭐ Favorites & Organization

  - **Favorites Management**: Save and organize favorite businesses
  - **Folder System**: Create custom folders for organizing favorites
  - **Personal Notes**: Add private notes and ratings to favorites
  - **Tag System**: Custom tagging for easy categorization
  - **Visit Tracking**: Track visit history and frequency
  - **Reminders**: Set reminders for revisiting businesses
  - **Sharing**: Share favorite lists and folders with others
  - **Analytics**: Track favorite engagement and usage patterns
  - **Bulk Operations**: Manage multiple favorites simultaneously
  - **Privacy Controls**: Public/private folder and favorite settings

- ⚙️ User Settings & Account Management

  - **Account Settings**: Complete profile and account management
  - **Privacy Controls**: Granular privacy and visibility settings
  - **Notification Preferences**: Email, push, and SMS notification management
  - **Localization**: Multi-language and currency support
  - **Security Settings**: Password management and security preferences
  - **Data Export**: Export user data and analytics
  - **Account Deletion**: Complete account removal with data cleanup
  - **Theme Preferences**: Dark/light mode and UI customization
  - **Integration Settings**: Third-party service connections
  - **Backup & Restore**: Data backup and restoration capabilities

- 💳 Complete Payment System

  - **Payment Settings**: User billing preferences, tax information, invoice settings
  - **Payment Methods**: Multi-processor support (Stripe, PayPal, bank accounts, digital wallets)
  - **Transactions**: Complete transaction tracking with refund capabilities and analytics
  - **Subscription Plans**: Flexible plan management with features, limits, and pricing tiers
  - **Subscriptions**: Full subscription lifecycle with usage tracking, trials, and plan changes
  - **Stripe Integration**: Complete Stripe payment processing with webhooks
  - **Usage Tracking**: Monitor subscription limits and usage across multiple metrics
  - **Payment Analytics**: Transaction statistics and payment insights
  - **Webhook Handling**: Real-time synchronization with payment processors

- 🛡️ Security features

  - Password hashing with bcrypt
  - JWT token management
  - Rate limiting
  - CORS configuration
  - Helmet for security headers
  - Stripe webhook signature verification
  - Payment data encryption and secure storage

- 📚 API Documentation
  - Comprehensive Swagger UI documentation
  - Complete API testing interface

<details>
<summary><strong>🚀 Getting Started</strong></summary>

### Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account
- Cloudinary account (for image uploads)
- Stripe account (for payment processing)

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/kunex-backend-app.git
cd kunex-backend-app
```

2. Install dependencies

```bash
npm install
```

3. Create a `.env` file with the following variables:

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here
JWT_REFRESH_EXPIRES_IN=30d

# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_email_password
EMAIL_APP_PASSWORD=your_gmail_app_password
EMAIL_FROM=your_email@gmail.com

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=/api/auth/google/callback

# Cloudinary Configuration (Required for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Stripe Configuration (Required for payment processing)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Application Configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001
```

4. Start the development server

```bash
npm run dev
```

</details>

## API Documentation

Once the server is running, you can access the comprehensive API documentation at:

```
http://localhost:3000/docs
```

## API Endpoints Summary

The platform provides a comprehensive REST API with **148 total endpoints** across all modules:

| Category            | GET    | POST   | PUT    | DELETE | Total   |
| ------------------- | ------ | ------ | ------ | ------ | ------- |
| Authentication      | 7      | 8      | 0      | 0      | **15**  |
| Personal Profile    | 2      | 2      | 1      | 2      | **7**   |
| Business Profile    | 4      | 3      | 2      | 1      | **10**  |
| Social Media Links  | 4      | 2      | 4      | 1      | **11**  |
| Page Builder        | 8      | 4      | 1      | 1      | **14**  |
| Widgets             | 8      | 4      | 2      | 1      | **15**  |
| Analytics           | 7      | 1      | 0      | 0      | **8**   |
| Explore & Discovery | 6      | 1      | 0      | 2      | **9**   |
| Favorites           | 3      | 4      | 4      | 3      | **14**  |
| Folders             | 4      | 2      | 2      | 1      | **9**   |
| Settings            | 6      | 4      | 4      | 0      | **14**  |
| Payment Settings    | 1      | 0      | 1      | 0      | **2**   |
| Payment Methods     | 1      | 1      | 1      | 1      | **4**   |
| Transactions        | 2      | 1      | 0      | 0      | **3**   |
| Payment Intents     | 0      | 2      | 0      | 0      | **2**   |
| Subscription Plans  | 5      | 1      | 1      | 1      | **8**   |
| Subscriptions       | 2      | 3      | 1      | 0      | **6**   |
| Webhooks            | 0      | 1      | 0      | 0      | **1**   |
| **TOTAL**           | **68** | **44** | **25** | **15** | **148** |

### HTTP Methods Distribution

- **GET**: 68 endpoints (45.9%) - Data retrieval and querying
- **POST**: 44 endpoints (29.7%) - Resource creation and actions
- **PUT**: 25 endpoints (16.9%) - Resource updates and modifications
- **DELETE**: 15 endpoints (10.1%) - Resource deletion and cleanup

<details>
<summary><strong>📋 API Endpoints</strong></summary>

### Authentication

- `POST /api/auth/register` - Register a new user
- `GET /api/auth/verify-email/:token` - Verify email
- `POST /api/auth/login` - Login user
- `POST /api/auth/verify-2fa` - Verify 2FA code
- `POST /api/auth/setup-2fa` - Setup 2FA
- `POST /api/auth/enable-2fa` - Enable 2FA
- `POST /api/auth/disable-2fa` - Disable 2FA
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password/:token` - Reset password
- `POST /api/auth/refresh-token` - Refresh JWT token
- `GET /api/auth/google` - Login with Google
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/login-history` - Get login history
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Personal Profile

- `POST /api/profile/personal` - Create personal profile
- `GET /api/profile/personal` - Get own personal profile
- `PUT /api/profile/personal` - Update personal profile
- `DELETE /api/profile/personal` - Delete personal profile
- `GET /api/profile/personal/public/:username` - Get public personal profile
- `POST /api/profile/personal/photo` - Upload profile photo
- `DELETE /api/profile/personal/photo` - Delete profile photo

### Business Profile

- `POST /api/profile/business` - Create business profile
- `GET /api/profile/business` - Get own business profile
- `PUT /api/profile/business` - Update business profile
- `DELETE /api/profile/business` - Delete business profile
- `GET /api/profile/business/public/:username` - Get public business profile
- `POST /api/profile/business/logo` - Upload business logo
- `DELETE /api/profile/business/logo` - Delete business logo
- `POST /api/profile/business/cover-images` - Upload cover images
- `DELETE /api/profile/business/cover-images` - Delete cover images
- `GET /api/profile/business/search` - Search business profiles
- `GET /api/profile/business/nearby` - Find nearby businesses
- `POST /api/profile/business/username/check` - Check username availability
- `PUT /api/profile/business/hours` - Update business hours
- `GET /api/profile/business/analytics` - Get business analytics

### Social Media Links

- `POST /api/social-media` - Create a new social media link
- `GET /api/social-media` - Get all social media links for authenticated user
- `GET /api/social-media/:id` - Get social media link by ID
- `PUT /api/social-media/:id` - Update social media link
- `DELETE /api/social-media/:id` - Delete social media link
- `PUT /api/social-media/:id/embed-settings` - Update embed settings
- `PUT /api/social-media/:id/metadata` - Update metadata
- `PUT /api/social-media/bulk-order` - Bulk update display order
- `POST /api/social-media/:id/click` - Track click on social media link
- `GET /api/social-media/public/business/:username` - Get public business social media links
- `GET /api/social-media/public/user/:userId` - Get public user social media links
- `GET /api/social-media/analytics` - Get social media analytics

### Page Builder

- `POST /api/builder/pages` - Create a new builder page
- `GET /api/builder/pages` - Get all pages for authenticated user
- `GET /api/builder/pages/:id` - Get page by ID
- `GET /api/builder/pages/public/:slug` - Get public page by slug
- `PUT /api/builder/pages/:id` - Update page
- `DELETE /api/builder/pages/:id` - Delete page
- `POST /api/builder/pages/:id/publish` - Publish page
- `POST /api/builder/pages/:id/unpublish` - Unpublish page
- `POST /api/builder/pages/:id/clone` - Clone page
- `GET /api/builder/pages/:id/versions` - Get page versions
- `POST /api/builder/pages/:id/revert/:versionId` - Revert to version
- `GET /api/builder/pages/:id/analytics` - Get page analytics
- `GET /api/builder/pages/search` - Search pages
- `GET /api/builder/pages/templates` - Get page templates

### Widgets

- `POST /api/builder/widgets` - Create a new widget
- `GET /api/builder/widgets` - Get all widgets for authenticated user
- `GET /api/builder/widgets/:id` - Get widget by ID
- `PUT /api/builder/widgets/:id` - Update widget
- `DELETE /api/builder/widgets/:id` - Delete widget
- `POST /api/builder/widgets/:id/clone` - Clone widget
- `PUT /api/builder/widgets/order` - Update widget order
- `GET /api/builder/widgets/types` - Get available widget types
- `GET /api/builder/widgets/page/:pageId` - Get widgets by page
- `GET /api/builder/widgets/search` - Search widgets
- `GET /api/builder/widgets/popular` - Get popular widgets
- `POST /api/builder/widgets/:id/analytics` - Update widget analytics
- `POST /api/builder/widgets/:id/assets` - Upload widget assets
- `GET /api/builder/widgets/:id/preview` - Get widget preview

### Analytics

- `POST /api/analytics/track` - Track a view or interaction
- `GET /api/analytics/location` - Get location-based analytics
- `GET /api/analytics/links` - Get link performance analytics
- `GET /api/analytics/peak-hours` - Get peak hour analytics
- `GET /api/analytics/dashboard` - Get analytics dashboard
- `GET /api/analytics/real-time` - Get real-time analytics
- `GET /api/analytics/export` - Export analytics data
- `GET /api/analytics/time-filtered` - Get time-filtered analytics

### Explore & Discovery

- `GET /api/explore/nearby` - Get nearby businesses using geo-queries
- `GET /api/explore/search` - Search businesses with advanced filters
- `GET /api/explore/categories` - Get business categories
- `GET /api/explore/top-picks` - Get top recommended businesses
- `GET /api/explore/rising` - Get trending/rising businesses
- `GET /api/explore/recent-searches` - Get user's recent searches
- `POST /api/explore/save-search` - Save search query
- `DELETE /api/explore/recent-searches/:id` - Delete recent search
- `GET /api/explore/popular-searches` - Get popular search terms

### Favorites

- `POST /api/favorites` - Add business to favorites
- `GET /api/favorites` - Get user's favorites with filtering
- `GET /api/favorites/:id` - Get favorite by ID
- `PUT /api/favorites/:id` - Update favorite
- `DELETE /api/favorites/:id` - Remove from favorites
- `POST /api/favorites/:id/visit` - Record a visit
- `PUT /api/favorites/:id/rating` - Update personal rating
- `PUT /api/favorites/:id/notes` - Update notes
- `PUT /api/favorites/:id/tags` - Update tags
- `POST /api/favorites/:id/reminder` - Set reminder
- `GET /api/favorites/analytics` - Get favorites analytics
- `POST /api/favorites/bulk-move` - Bulk move favorites to folder
- `POST /api/favorites/bulk-delete` - Bulk delete favorites
- `GET /api/favorites/export` - Export favorites data

### Folders

- `POST /api/folders` - Create new folder
- `GET /api/folders` - Get user's folders
- `GET /api/folders/:id` - Get folder by ID
- `PUT /api/folders/:id` - Update folder
- `DELETE /api/folders/:id` - Delete folder
- `POST /api/folders/:id/share` - Share folder
- `GET /api/folders/public/:shareId` - Get public shared folder
- `PUT /api/folders/reorder` - Reorder folders
- `GET /api/folders/:id/analytics` - Get folder analytics

### Settings

- `GET /api/settings/account` - Get account details and settings
- `PUT /api/settings/account` - Update account details
- `POST /api/settings/change-password` - Change user password
- `POST /api/settings/change-email` - Change email address
- `GET /api/settings/preferences` - Get user preferences
- `PUT /api/settings/preferences` - Update user preferences
- `GET /api/settings/privacy` - Get privacy settings
- `PUT /api/settings/privacy` - Update privacy settings
- `GET /api/settings/notifications` - Get notification preferences
- `PUT /api/settings/notifications` - Update notification preferences
- `POST /api/settings/export-data` - Export user data
- `POST /api/settings/delete-account` - Delete user account
- `GET /api/settings/security` - Get security settings
- `PUT /api/settings/security` - Update security settings

### Payment System

#### Payment Settings

- `GET /api/payments/settings` - Get user's payment settings
- `PUT /api/payments/settings` - Update user's payment settings

#### Payment Methods

- `GET /api/payments/methods` - Get all payment methods for user
- `POST /api/payments/methods` - Add new payment method
- `PUT /api/payments/methods/:id` - Update payment method
- `DELETE /api/payments/methods/:id` - Delete payment method
- `PUT /api/payments/methods/:id/default` - Set payment method as default

#### Transactions

- `GET /api/payments/transactions` - Get user transactions with filtering and pagination
- `GET /api/payments/transactions/:id` - Get transaction by ID
- `POST /api/payments/transactions/:id/refund` - Refund a transaction
- `GET /api/payments/transactions/statistics` - Get transaction statistics

#### Payment Intents (One-time Payments)

- `POST /api/payments/intents` - Create payment intent for one-time payment
- `POST /api/payments/intents/:id/confirm` - Confirm payment intent

#### Subscription Plans

- `GET /api/subscriptions/plans` - Get all public subscription plans
- `GET /api/subscriptions/plans/admin` - Get all subscription plans (admin only)
- `GET /api/subscriptions/plans/:id` - Get subscription plan by ID
- `POST /api/subscriptions/plans` - Create subscription plan (admin only)
- `PUT /api/subscriptions/plans/:id` - Update subscription plan (admin only)
- `DELETE /api/subscriptions/plans/:id` - Delete subscription plan (admin only)
- `GET /api/subscriptions/plans/compare` - Compare subscription plans

#### Subscriptions

- `GET /api/subscriptions/current` - Get user's current subscription
- `POST /api/subscriptions` - Create new subscription
- `PUT /api/subscriptions/:id` - Update subscription
- `POST /api/subscriptions/:id/cancel` - Cancel subscription
- `POST /api/subscriptions/:id/reactivate` - Reactivate subscription
- `POST /api/subscriptions/:id/change-plan` - Change subscription plan
- `GET /api/subscriptions/:id/usage` - Get subscription usage

#### Webhooks

- `POST /api/webhooks/stripe` - Handle Stripe webhooks

</details>

<details>
<summary><strong>🎨 Page Builder & Widget System Features</strong></summary>

### Page Builder

- **Template System**: Pre-built templates for different business categories (restaurant, agency, portfolio, etc.)
- **Drag & Drop Interface**: Visual page building with real-time preview
- **SEO Optimization**: Built-in SEO settings, meta tags, and schema markup
- **Responsive Design**: Mobile-first responsive layouts with breakpoint management
- **Version Control**: Page versioning with rollback capabilities and change tracking
- **Custom Domains**: Support for custom domain mapping
- **Analytics Integration**: Page performance tracking and visitor analytics
- **A/B Testing**: Built-in A/B testing capabilities for page optimization

### Widget Library

- **Content Widgets**: Text, headings, lists, quotes, code blocks
- **Media Widgets**: Images, videos, galleries, sliders, audio players
- **Interactive Widgets**: Forms, buttons, maps, calendars, search bars
- **Social Widgets**: Social media feeds, share buttons, testimonials
- **E-commerce Widgets**: Product displays, pricing tables, shopping carts
- **Navigation Widgets**: Menus, breadcrumbs, pagination, tabs, accordions
- **Marketing Widgets**: Newsletter signup, countdown timers, progress bars
- **Utility Widgets**: Dividers, spacers, iframes, file downloads

</details>

<details>
<summary><strong>📊 Analytics & Tracking Features</strong></summary>

### Comprehensive Analytics

- **View Tracking**: Page views, unique visitors, session duration
- **Interaction Tracking**: Clicks, form submissions, downloads, shares
- **Geographic Analytics**: Visitor location analysis and heatmaps
- **Device Analytics**: Mobile, tablet, desktop usage patterns
- **Traffic Sources**: Referral tracking, campaign analysis, search keywords
- **Conversion Tracking**: Goal tracking and funnel analysis
- **Real-time Analytics**: Live visitor tracking and engagement metrics
- **Custom Events**: Track custom user interactions and behaviors

### Business Intelligence

- **Peak Hour Analysis**: Optimal posting and engagement times
- **Audience Insights**: Demographic and behavioral analysis
- **Content Performance**: Top-performing pages and content analysis
- **Link Analytics**: Social media and external link performance
- **Engagement Scoring**: Advanced engagement metrics and scoring algorithms
- **Predictive Analytics**: Trend analysis and performance predictions

</details>

<details>
<summary><strong>🔍 Business Discovery Features</strong></summary>

### Advanced Search & Discovery

- **Geospatial Search**: Find businesses within specified radius with accurate distance calculation
- **Multi-criteria Filtering**: Filter by category, rating, price range, features, business type, and hours
- **Intelligent Recommendations**: Algorithm-based business suggestions and top picks
- **Trending Businesses**: Discover rising and newly popular businesses
- **Category Browsing**: Explore businesses by industry and subcategory
- **Search History**: Quick access to recent searches with saved filters
- **Map Integration**: Interactive map views with business markers and clustering
- **Real-time Data**: Live business hours, availability, and status updates

### Discovery Algorithms

- **Top Picks Algorithm**: Considers rating, reviews, engagement, and user preferences
- **Rising Businesses**: Identifies trending businesses based on recent activity and growth
- **Personalized Recommendations**: Machine learning-based suggestions based on user behavior
- **Seasonal Adjustments**: Algorithm adjustments for seasonal businesses and trends

</details>

<details>
<summary><strong>⭐ Favorites & Organization Features</strong></summary>

### Advanced Organization

- **Folder System**: Create unlimited custom folders with color coding and icons
- **Smart Tagging**: AI-powered tag suggestions and custom tag creation
- **Personal Notes**: Rich text notes with formatting and attachments
- **Visit Tracking**: Automatic and manual visit logging with frequency analysis
- **Rating System**: Personal rating system separate from public ratings
- **Reminder System**: Set reminders for revisiting businesses with custom notifications
- **Sharing Capabilities**: Share individual favorites or entire folders with privacy controls
- **Bulk Operations**: Manage multiple favorites simultaneously with batch actions

### Analytics & Insights

- **Usage Analytics**: Track favorite engagement and access patterns
- **Trend Analysis**: Identify favorite business trends and preferences
- **Location Analysis**: Geographic distribution of favorite businesses
- **Category Insights**: Analyze favorite business categories and types
- **Visit Patterns**: Understand visit frequency and timing patterns
- **Sharing Analytics**: Track shared folder engagement and views

</details>

<details>
<summary><strong>💳 Payment System Features</strong></summary>

### Payment Settings Management

- **Billing Address**: Complete address management for invoicing
- **Tax Information**: VAT, GST, and sales tax configuration
- **Invoice Settings**: Custom invoice preferences and email settings
- **Auto-Renewal**: Automatic subscription renewal preferences
- **Payment Reminders**: Configurable payment reminder notifications
- **Multi-Currency**: Support for 9 major currencies (USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, INR)

### Payment Methods

- **Multiple Processors**: Stripe, PayPal, bank accounts, digital wallets
- **Card Management**: Credit/debit card storage with secure tokenization
- **Default Methods**: Set preferred payment methods for subscriptions
- **Expiry Tracking**: Automatic handling of expired payment methods
- **Billing Address**: Individual billing addresses per payment method

### Transaction Management

- **Complete Tracking**: Full transaction history with detailed metadata
- **Refund Processing**: Partial and full refund capabilities
- **Transaction Types**: Subscription payments, one-time purchases, refunds, credits, chargebacks
- **Advanced Filtering**: Filter by status, type, amount, date range, currency
- **Analytics**: Transaction statistics, fees, and tax reporting
- **Pagination**: Efficient handling of large transaction volumes

### Subscription Plans

- **Flexible Pricing**: Support for multiple pricing models and intervals
- **Feature Management**: Detailed feature lists with limits and highlighting
- **Usage Limits**: Configurable limits for products, storage, bandwidth, API calls, team members
- **Trial Periods**: Flexible trial period configuration
- **Plan Comparison**: Built-in plan comparison functionality
- **Stripe Integration**: Automatic Stripe product and price creation

### Subscription Management

- **Lifecycle Management**: Complete subscription lifecycle from creation to cancellation
- **Usage Tracking**: Real-time usage monitoring across all plan limits
- **Plan Changes**: Seamless plan upgrades/downgrades with proration
- **Trial Management**: Trial period tracking and conversion
- **Cancellation**: Immediate or end-of-period cancellation options
- **Reactivation**: Reactivate canceled subscriptions within grace period
- **Billing Cycles**: Flexible billing intervals (daily, weekly, monthly, yearly)

### Stripe Integration

- **Customer Management**: Automatic Stripe customer creation and synchronization
- **Payment Processing**: Secure payment processing with 3D Secure support
- **Webhook Handling**: Real-time event processing for all Stripe events
- **Subscription Sync**: Automatic synchronization of subscription status changes
- **Payment Method Sync**: Real-time payment method updates and status changes
- **Invoice Management**: Automatic invoice creation and payment tracking

### Webhook System

- **Event Processing**: Comprehensive handling of Stripe webhook events
- **Signature Verification**: Secure webhook signature validation
- **Database Sync**: Automatic database updates based on webhook events
- **Error Handling**: Robust error handling and retry mechanisms
- **Event Types**: Support for subscription, payment, customer, invoice, and dispute events

</details>

<details>
<summary><strong>🏢 Business Profile Features</strong></summary>

### Advanced Search & Discovery

- **Text Search**: Search across business names, descriptions, and industries
- **Geospatial Search**: Find businesses within a specified radius
- **Advanced Filtering**: Filter by business type, industry, price range, features, ratings, and location
- **Pagination**: Efficient pagination for large result sets

### Business Information Management

- **Basic Info**: Business name, type, industry, description
- **Location**: Full address with geospatial coordinates for mapping
- **Contact**: Email, phone, website
- **Hours**: Flexible business hours with open/closed status
- **Features**: Customizable feature tags
- **Pricing**: Price range indicators

### Visual Customization

- **Logo Upload**: High-quality logo with automatic optimization
- **Cover Images**: Multiple cover images for showcasing business
- **Theme Colors**: Customizable color scheme (primary, secondary, text, background)
- **Call-to-Action**: Configurable action buttons

### Analytics & Metrics

- **View Tracking**: Monitor profile views
- **Completion Percentage**: Track profile completeness
- **Rating System**: Average ratings and review counts
- **Favorite Counts**: Track user favorites

</details>

<details>
<summary><strong>🔗 Social Media Links Features</strong></summary>

### Platform Support

- **Instagram**: Automatic handle extraction and profile linking
- **TikTok**: Support for @username format
- **Facebook**: Business and personal page support
- **Twitter/X**: Handle normalization and profile linking
- **LinkedIn**: Personal and company profile support
- **YouTube**: Channel and user profile support
- **GitHub**: Developer profile integration
- **WhatsApp**: Click-to-chat functionality
- **Website**: Custom website linking
- **Pinterest, Snapchat**: Additional platform support

### Advanced Features

- **URL Normalization**: Automatic URL cleaning and standardization
- **Platform Validation**: Ensures URLs match platform-specific formats
- **Handle Extraction**: Automatically extracts usernames/handles from URLs
- **Display Optimization**: Platform-specific display formatting
- **Click Analytics**: Track engagement and link performance
- **Embed Settings**: Customizable display options for social feeds
- **Metadata Management**: Store follower counts, verification status, and descriptions
- **Bulk Operations**: Efficiently manage multiple links at once

### Embed Settings

- **Layout Options**: Grid, carousel, or list display
- **Content Control**: Show/hide headers, captions, and metadata
- **Post Limits**: Configure maximum number of posts to display
- **Responsive Design**: Optimized for all device sizes

</details>

<details>
<summary><strong>📁 Project Structure</strong></summary>

```
.
├── .git/                           # Git repository
├── .vercel/                        # Vercel deployment configuration
├── node_modules/                   # Node.js dependencies
├── markdown/                       # Documentation files
│   ├── ANALYTICS_ENGINE_DOCUMENTATION.md
│   ├── ANALYTICS_IMPLEMENTATION_SUMMARY.md
│   └── ENVIRONMENT_SETUP.md
├── src/                           # Source code directory
│   ├── config/                    # Configuration files
│   │   ├── database.js           # Database configuration and connection
│   │   ├── db.js                 # Database connection helper
│   │   └── passport.js           # Passport.js authentication configuration
│   ├── controllers/               # Route controllers (business logic)
│   │   ├── analytics.controller.js
│   │   ├── auth.controller.js
│   │   ├── builderPage.controller.js
│   │   ├── businessProfile.controller.js
│   │   ├── explore.controller.js
│   │   ├── favorites.controller.js
│   │   ├── folders.controller.js
│   │   ├── payment.controller.js
│   │   ├── personalProfile.controller.js
│   │   ├── settings.controller.js
│   │   ├── socialMediaLink.controller.js
│   │   ├── subscription.controller.js
│   │   ├── webhook.controller.js
│   │   └── widget.controller.js
│   ├── docs/                      # API documentation
│   │   └── swagger.js            # Swagger/OpenAPI configuration
│   ├── middleware/                # Express middleware
│   │   ├── auth.mw.js            # Authentication middleware
│   │   └── error-handler.mw.js   # Error handling middleware
│   ├── models/                    # MongoDB/Mongoose models
│   │   ├── builderPage.model.js
│   │   ├── businessProfile.model.js
│   │   ├── favorite.model.js
│   │   ├── folder.model.js
│   │   ├── paymentMethod.model.js
│   │   ├── paymentSettings.model.js
│   │   ├── personalProfile.model.js
│   │   ├── socialMediaLink.model.js
│   │   ├── subscription.model.js
│   │   ├── subscriptionPlan.model.js
│   │   ├── token.model.js
│   │   ├── transaction.model.js
│   │   ├── user.model.js
│   │   ├── userSearch.model.js
│   │   ├── userSettings.model.js
│   │   ├── viewLog.model.js
│   │   └── widget.model.js
│   ├── routes/                    # Express route definitions
│   │   ├── analytics.routes.js
│   │   ├── auth.routes.js
│   │   ├── builderPage.routes.js
│   │   ├── businessProfile.routes.js
│   │   ├── explore.routes.js
│   │   ├── favorites.routes.js
│   │   ├── folders.routes.js
│   │   ├── payment.routes.js
│   │   ├── personalProfile.routes.js
│   │   ├── settings.routes.js
│   │   ├── socialMediaLink.routes.js
│   │   ├── subscription.routes.js
│   │   ├── webhook.routes.js
│   │   └── widget.routes.js
│   ├── utils/                     # Utility functions and helpers
│   │   ├── analyticsUtils.js     # Analytics utility functions
│   │   ├── analyticsValidation.js # Analytics input validation
│   │   ├── businessProfileValidation.js # Business profile validation
│   │   ├── cloudinary.js         # Cloudinary image upload configuration
│   │   ├── email.js              # Email sending utilities
│   │   ├── errorHandler.js       # Error handling utilities
│   │   ├── exploreValidation.js  # Explore feature validation
│   │   ├── favoritesValidation.js # Favorites validation
│   │   ├── generateTokens.js     # JWT token generation
│   │   ├── paymentValidation.js  # Payment system validation
│   │   ├── personalProfileValidation.js # Personal profile validation
│   │   ├── settingsValidation.js # Settings validation
│   │   ├── socialMediaValidation.js # Social media validation
│   │   ├── stripe.js             # Stripe payment configuration
│   │   └── validation.js         # General validation utilities
│   ├── app.js                    # Express application setup
│   └── server.js                 # Server startup and configuration
├── .gitignore                    # Git ignore rules
├── index.js                      # Application entry point
├── package.json                  # NPM package configuration
├── package-lock.json             # NPM dependency lock file
├── README.md                     # Project documentation
├── schema.txt                    # Database schema documentation
└── vercel.json                   # Vercel deployment configuration
```

### Directory Structure Explanation

- **`src/`**: Main source code directory containing all application logic
- **`src/config/`**: Configuration files for database, authentication, and other services
- **`src/controllers/`**: Business logic handlers for each API endpoint
- **`src/docs/`**: API documentation and Swagger configuration
- **`src/middleware/`**: Express middleware for authentication, error handling, etc.
- **`src/models/`**: MongoDB schema definitions using Mongoose
- **`src/routes/`**: API route definitions and endpoint mappings
- **`src/utils/`**: Utility functions, validation helpers, and service integrations
- **`markdown/`**: Additional documentation files for specific features
- **Root files**: Configuration files for deployment, dependencies, and project setup

</details>

<details>
<summary><strong>⚙️ Environment Setup</strong></summary>

### Stripe Setup

1. Create a Stripe account at [Stripe](https://stripe.com/)
2. Get your API keys from the Stripe Dashboard
3. Set up webhook endpoints in the Stripe Dashboard:
   - Endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
   - Events to send: Select all subscription, payment, customer, invoice, and dispute events
4. Get the webhook signing secret
5. Add your Stripe keys to the `.env` file

### Cloudinary Setup

1. Create a free account at [Cloudinary](https://cloudinary.com/)
2. Get your Cloud Name, API Key, and API Secret from the dashboard
3. Add these to your `.env` file

### MongoDB Setup

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a database user and get the connection string
3. Add the connection string to your `.env` file

### Google OAuth Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs
6. Add credentials to your `.env` file

</details>

<details>
<summary><strong>🔒 Security Considerations</strong></summary>

- All passwords are hashed using bcrypt
- JWT tokens are signed with a secret key
- Refresh tokens are stored in the database and can be revoked
- Rate limiting is implemented to prevent brute force attacks
- CORS is configured to restrict access to the API
- Helmet is used to set security headers
- Image uploads are validated and optimized through Cloudinary
- Geospatial queries are indexed for performance
- Input validation using Joi for all endpoints
- Stripe webhook signatures are verified for authenticity
- Payment data is encrypted and securely stored
- PCI DSS compliance through Stripe's secure infrastructure

## Payment Security

- **PCI Compliance**: All payment processing handled by Stripe (PCI DSS Level 1)
- **Tokenization**: Payment methods stored as secure tokens, not raw card data
- **Webhook Verification**: All webhook events verified using Stripe signatures
- **Encryption**: Sensitive payment data encrypted at rest and in transit
- **Access Control**: Payment operations require proper authentication and authorization
- **Audit Trail**: Complete audit trail for all payment-related activities

</details>

## License

This project is licensed under the ISC License.
