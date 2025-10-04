# Environment Setup Guide

This guide will help you set up all the required environment variables for the complete payment system.

## Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_super_secret_refresh_key_here_different_from_jwt_secret
JWT_REFRESH_EXPIRES_IN=30d

# Email Configuration (for notifications and verification)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_email_password
EMAIL_APP_PASSWORD=your_gmail_app_password
EMAIL_FROM=your_email@gmail.com

# Google OAuth (Optional)
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

## Detailed Setup Instructions

### 1. MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account and cluster
3. Create a database user with read/write permissions
4. Get the connection string from the "Connect" button
5. Replace `<username>`, `<password>`, and `<database_name>` in the connection string
6. Add the connection string to `MONGODB_URI`

### 2. JWT Configuration

1. Generate strong, random secrets for JWT tokens:
   ```bash
   # You can use Node.js to generate random strings
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
2. Use different secrets for `JWT_SECRET` and `JWT_REFRESH_SECRET`
3. Set appropriate expiration times (7d for access tokens, 30d for refresh tokens)

### 3. Email Configuration (Gmail)

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
3. Use your Gmail address for `EMAIL_USER` and `EMAIL_FROM`
4. Use the app password for `EMAIL_APP_PASSWORD`

### 4. Cloudinary Setup

1. Create a free account at [Cloudinary](https://cloudinary.com/)
2. Go to your Dashboard
3. Copy the following values:
   - Cloud Name → `CLOUDINARY_CLOUD_NAME`
   - API Key → `CLOUDINARY_API_KEY`
   - API Secret → `CLOUDINARY_API_SECRET`

### 5. Stripe Setup (Critical for Payment System)

#### 5.1 Create Stripe Account

1. Go to [Stripe](https://stripe.com/) and create an account
2. Complete the account verification process
3. Go to the Stripe Dashboard

#### 5.2 Get API Keys

1. In the Stripe Dashboard, go to "Developers" → "API keys"
2. Copy the "Secret key" (starts with `sk_test_` for test mode)
3. Add it to `STRIPE_SECRET_KEY`

#### 5.3 Set Up Webhooks

1. In the Stripe Dashboard, go to "Developers" → "Webhooks"
2. Click "Add endpoint"
3. Set the endpoint URL to: `https://yourdomain.com/api/webhooks/stripe`
   - For local development: `https://your-ngrok-url.ngrok.io/api/webhooks/stripe`
4. Select the following events to listen for:
   - `customer.created`
   - `customer.updated`
   - `customer.deleted`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.trial_will_end`
   - `invoice.created`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.requires_action`
   - `payment_method.attached`
   - `payment_method.detached`
   - `charge.dispute.created`
   - `charge.dispute.updated`
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with `whsec_`)
7. Add it to `STRIPE_WEBHOOK_SECRET`

#### 5.4 Test Mode vs Live Mode

- Use test keys (starting with `sk_test_`) during development
- Switch to live keys (starting with `sk_live_`) for production
- Test cards for development:
  - Visa: `4242424242424242`
  - Visa (debit): `4000056655665556`
  - Mastercard: `5555555555554444`
  - American Express: `378282246310005`

### 6. Google OAuth Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set application type to "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback` (development)
   - `https://yourdomain.com/api/auth/google/callback` (production)
7. Copy the Client ID and Client Secret
8. Add them to `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

## Local Development with Webhooks

For local development, you'll need to expose your local server to the internet for Stripe webhooks to work:

### Option 1: Using ngrok (Recommended)

1. Install ngrok: `npm install -g ngrok`
2. Start your local server: `npm run dev`
3. In another terminal, expose port 3000: `ngrok http 3000`
4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
5. Update your Stripe webhook endpoint to: `https://abc123.ngrok.io/api/webhooks/stripe`

### Option 2: Using Stripe CLI

1. Install [Stripe CLI](https://stripe.com/docs/stripe-cli)
2. Login: `stripe login`
3. Forward events: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
4. Copy the webhook signing secret from the CLI output
5. Update `STRIPE_WEBHOOK_SECRET` with the CLI secret

## Production Deployment

### Environment Variables for Production

1. Set `NODE_ENV=production`
2. Use production database URI
3. Use strong, unique secrets for JWT
4. Use live Stripe keys (starting with `sk_live_`)
5. Set up proper webhook endpoints with HTTPS
6. Use production email service credentials
7. Set correct `FRONTEND_URL` for CORS

### Security Checklist

- [ ] All secrets are strong and unique
- [ ] Database has proper access controls
- [ ] Stripe webhooks use HTTPS endpoints
- [ ] Email credentials are secure (use app passwords)
- [ ] Environment variables are not committed to version control
- [ ] Production uses live Stripe keys
- [ ] CORS is properly configured for production domains

## Testing the Setup

1. Start the server: `npm run dev`
2. Check the API documentation: `http://localhost:3000/docs`
3. Test authentication endpoints
4. Test payment endpoints with Stripe test cards
5. Verify webhook events are received and processed
6. Check database for proper data storage

## Troubleshooting

### Common Issues

1. **Stripe webhook signature verification fails**

   - Ensure `STRIPE_WEBHOOK_SECRET` is correct
   - Check that the webhook endpoint URL is accessible
   - Verify the webhook is configured for the correct events

2. **Database connection fails**

   - Check MongoDB URI format
   - Ensure database user has proper permissions
   - Verify network access (whitelist IP addresses)

3. **Email sending fails**

   - Use app passwords for Gmail
   - Check email service configuration
   - Verify 2FA is enabled for Gmail

4. **Image uploads fail**

   - Verify Cloudinary credentials
   - Check API key permissions
   - Ensure cloud name is correct

5. **Payment processing fails**
   - Use correct Stripe test cards
   - Check API key format (test vs live)
   - Verify webhook configuration

### Getting Help

- Check the API documentation at `/docs`
- Review server logs for error messages
- Test individual components separately
- Use Stripe Dashboard for payment debugging
- Check MongoDB Atlas logs for database issues

## Environment Variables Reference

| Variable                 | Required | Description                | Example                                          |
| ------------------------ | -------- | -------------------------- | ------------------------------------------------ |
| `MONGODB_URI`            | Yes      | MongoDB connection string  | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `JWT_SECRET`             | Yes      | Secret for JWT tokens      | `your_super_secret_key`                          |
| `JWT_EXPIRES_IN`         | Yes      | JWT token expiration       | `7d`                                             |
| `JWT_REFRESH_SECRET`     | Yes      | Secret for refresh tokens  | `your_refresh_secret`                            |
| `JWT_REFRESH_EXPIRES_IN` | Yes      | Refresh token expiration   | `30d`                                            |
| `EMAIL_USER`             | Yes      | Email service username     | `your_email@gmail.com`                           |
| `EMAIL_APP_PASSWORD`     | Yes      | Email service password     | `your_app_password`                              |
| `EMAIL_FROM`             | Yes      | From email address         | `your_email@gmail.com`                           |
| `CLOUDINARY_CLOUD_NAME`  | Yes      | Cloudinary cloud name      | `your_cloud_name`                                |
| `CLOUDINARY_API_KEY`     | Yes      | Cloudinary API key         | `123456789012345`                                |
| `CLOUDINARY_API_SECRET`  | Yes      | Cloudinary API secret      | `your_api_secret`                                |
| `STRIPE_SECRET_KEY`      | Yes      | Stripe secret key          | `sk_test_...` or `sk_live_...`                   |
| `STRIPE_WEBHOOK_SECRET`  | Yes      | Stripe webhook secret      | `whsec_...`                                      |
| `GOOGLE_CLIENT_ID`       | No       | Google OAuth client ID     | `your_client_id.googleusercontent.com`           |
| `GOOGLE_CLIENT_SECRET`   | No       | Google OAuth client secret | `your_client_secret`                             |
| `NODE_ENV`               | Yes      | Environment mode           | `development` or `production`                    |
| `PORT`                   | No       | Server port                | `3000`                                           |
| `FRONTEND_URL`           | Yes      | Frontend URL for CORS      | `http://localhost:3001`                          |

```

```
