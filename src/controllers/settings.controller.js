const User = require('../models/user.model');
const UserSettings = require('../models/userSettings.model');
const PaymentSettings = require('../models/paymentSettings.model');
const PaymentMethod = require('../models/paymentMethod.model');
const Subscription = require('../models/subscription.model');
const Transaction = require('../models/transaction.model');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendPasswordChangeNotification } = require('../utils/email');
const {
  validateAccountDetails,
  validatePasswordChange,
  validateUserSettings,
  validateBillingSettings,
  validateAccountDeletion,
  validateAccountDeactivation,
  validateAccountReactivation,
  sanitizeUserInput
} = require('../utils/settingsValidation');

// KON-47: Fetch/Update My Account details
exports.getAccountDetails = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user details
    const user = await User.findById(userId).select('-password -resetPasswordToken -resetPasswordExpires -verificationToken -verificationTokenExpires');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user settings
    let userSettings = await UserSettings.findOne({ userId });
    if (!userSettings) {
      userSettings = await UserSettings.createDefaultSettings(userId);
    }

    res.status(200).json({
      success: true,
      message: 'Account details retrieved successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profilePicture: user.profilePicture,
          isVerified: user.isVerified,
          isTwoFactorEnabled: user.isTwoFactorEnabled,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        settings: userSettings
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateAccountDetails = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Sanitize and validate input
    const sanitizedData = sanitizeUserInput(req.body);
    const { error, value } = validateAccountDetails(sanitizedData);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    if (Object.keys(value).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: value },
      { new: true, runValidators: true }
    ).select('-password -resetPasswordToken -resetPasswordExpires -verificationToken -verificationTokenExpires');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Account details updated successfully',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Validate input
    const { error, value } = validatePasswordChange(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { currentPassword, newPassword } = value;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Update security settings
    await UserSettings.findOneAndUpdate(
      { userId },
      { 
        $set: { 
          'security.lastPasswordChange': new Date(),
          'security.passwordChangeRequired': false
        }
      },
      { upsert: true }
    );

    // Send notification email
    await sendPasswordChangeNotification(user.email, user.firstName);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.updateUserSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Validate input
    const { error, value } = validateUserSettings(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { preferences, privacy, notifications, security, dataSettings } = value;

    let userSettings = await UserSettings.findOne({ userId });
    if (!userSettings) {
      userSettings = await UserSettings.createDefaultSettings(userId);
    }

    // Update preferences
    if (preferences) {
      Object.keys(preferences).forEach(key => {
        if (userSettings.preferences[key] !== undefined) {
          userSettings.preferences[key] = preferences[key];
        }
      });
    }

    // Update privacy settings
    if (privacy) {
      Object.keys(privacy).forEach(key => {
        if (userSettings.privacy[key] !== undefined) {
          userSettings.privacy[key] = privacy[key];
        }
      });
    }

    // Update notification settings
    if (notifications) {
      if (notifications.email) {
        Object.assign(userSettings.notifications.email, notifications.email);
      }
      if (notifications.push) {
        Object.assign(userSettings.notifications.push, notifications.push);
      }
      if (notifications.sms) {
        Object.assign(userSettings.notifications.sms, notifications.sms);
      }
    }

    // Update security settings
    if (security) {
      Object.keys(security).forEach(key => {
        if (userSettings.security[key] !== undefined && key !== 'lastPasswordChange') {
          userSettings.security[key] = security[key];
        }
      });
    }

    // Update data settings
    if (dataSettings) {
      Object.keys(dataSettings).forEach(key => {
        if (userSettings.dataSettings[key] !== undefined) {
          userSettings.dataSettings[key] = dataSettings[key];
        }
      });
    }

    await userSettings.save();

    res.status(200).json({
      success: true,
      message: 'User settings updated successfully',
      data: { settings: userSettings }
    });
  } catch (error) {
    next(error);
  }
};

// KON-48: Billing - fetch user's current plan, status, renew
exports.getBillingInfo = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get payment settings
    const paymentSettings = await PaymentSettings.findOne({ userId })
      .populate('defaultPaymentMethodId');

    // Get current subscription
    const currentSubscription = await Subscription.findOne({ 
      userId, 
      status: { $in: ['active', 'trialing', 'past_due'] }
    }).populate('planId');

    // Get payment methods
    const paymentMethods = await PaymentMethod.find({ 
      userId, 
      status: 'active' 
    }).sort({ createdAt: -1 });

    // Get recent transactions
    const recentTransactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('subscriptionId');

    res.status(200).json({
      success: true,
      message: 'Billing information retrieved successfully',
      data: {
        paymentSettings,
        currentSubscription,
        paymentMethods,
        recentTransactions
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateBillingSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Validate input
    const { error, value } = validateBillingSettings(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    let paymentSettings = await PaymentSettings.findOne({ userId });
    
    if (!paymentSettings) {
      paymentSettings = new PaymentSettings({ userId, ...value });
    } else {
      Object.assign(paymentSettings, value);
    }

    await paymentSettings.save();

    res.status(200).json({
      success: true,
      message: 'Billing settings updated successfully',
      data: { paymentSettings }
    });
  } catch (error) {
    next(error);
  }
};

exports.renewSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const subscription = await Subscription.findOne({ 
      userId, 
      status: { $in: ['active', 'past_due', 'canceled'] }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No subscription found'
      });
    }

    // Update subscription status and renewal date
    subscription.status = 'active';
    subscription.nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    subscription.cancelAtPeriodEnd = false;
    
    await subscription.save();

    res.status(200).json({
      success: true,
      message: 'Subscription renewed successfully',
      data: { subscription }
    });
  } catch (error) {
    next(error);
  }
};

// KON-49: Subscription history
exports.getSubscriptionHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get all subscriptions for the user
    const subscriptions = await Subscription.find({ userId })
      .populate('planId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalSubscriptions = await Subscription.countDocuments({ userId });

    // Get subscription-related transactions
    const subscriptionTransactions = await Transaction.find({
      userId,
      transactionType: 'subscription_payment'
    })
    .populate('subscriptionId')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Subscription history retrieved successfully',
      data: {
        subscriptions,
        transactions: subscriptionTransactions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalSubscriptions / limit),
          totalItems: totalSubscriptions,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getTransactionHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const { type, status, startDate, endDate } = req.query;

    // Build query
    const query = { userId };
    
    if (type) {
      query.transactionType = type;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const transactions = await Transaction.find(query)
      .populate('subscriptionId')
      .populate('paymentMethodId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalTransactions = await Transaction.countDocuments(query);

    res.status(200).json({
      success: true,
      message: 'Transaction history retrieved successfully',
      data: {
        transactions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalTransactions / limit),
          totalItems: totalTransactions,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// KON-50: Static content endpoints (Help Center, Community, Terms)
exports.getHelpCenter = async (req, res, next) => {
  try {
    const helpContent = {
      categories: [
        {
          id: 'getting-started',
          title: 'Getting Started',
          description: 'Learn the basics of using our platform',
          articles: [
            {
              id: 'create-account',
              title: 'How to create an account',
              content: 'Step-by-step guide to creating your account...',
              lastUpdated: new Date('2024-01-15')
            },
            {
              id: 'setup-profile',
              title: 'Setting up your profile',
              content: 'Complete your profile to get started...',
              lastUpdated: new Date('2024-01-15')
            }
          ]
        },
        {
          id: 'billing',
          title: 'Billing & Payments',
          description: 'Manage your subscription and payments',
          articles: [
            {
              id: 'manage-subscription',
              title: 'Managing your subscription',
              content: 'Learn how to upgrade, downgrade, or cancel...',
              lastUpdated: new Date('2024-01-10')
            },
            {
              id: 'payment-methods',
              title: 'Adding payment methods',
              content: 'How to add and manage payment methods...',
              lastUpdated: new Date('2024-01-10')
            }
          ]
        },
        {
          id: 'troubleshooting',
          title: 'Troubleshooting',
          description: 'Common issues and solutions',
          articles: [
            {
              id: 'login-issues',
              title: 'Unable to log in',
              content: 'Solutions for common login problems...',
              lastUpdated: new Date('2024-01-05')
            }
          ]
        }
      ],
      searchTags: ['account', 'billing', 'subscription', 'payment', 'profile', 'login', 'troubleshooting']
    };

    res.status(200).json({
      success: true,
      message: 'Help Center content retrieved successfully',
      data: helpContent
    });
  } catch (error) {
    next(error);
  }
};

exports.getCommunityInfo = async (req, res, next) => {
  try {
    const communityInfo = {
      overview: {
        title: 'Join Our Community',
        description: 'Connect with other users, share tips, and get support from our community.',
        memberCount: 15420,
        activeDiscussions: 342,
        lastUpdated: new Date()
      },
      channels: [
        {
          id: 'general',
          name: 'General Discussion',
          description: 'General conversation and community updates',
          memberCount: 12500,
          url: 'https://community.example.com/general'
        },
        {
          id: 'support',
          name: 'Support & Help',
          description: 'Get help from community members and staff',
          memberCount: 8900,
          url: 'https://community.example.com/support'
        },
        {
          id: 'feedback',
          name: 'Feature Requests',
          description: 'Share your ideas for new features',
          memberCount: 5600,
          url: 'https://community.example.com/feedback'
        }
      ],
      recentUpdates: [
        {
          title: 'New Community Guidelines',
          date: new Date('2024-01-15'),
          summary: 'Updated community guidelines for better experience'
        },
        {
          title: 'Weekly Community Highlights',
          date: new Date('2024-01-12'),
          summary: 'Check out this weeks most helpful community posts'
        }
      ]
    };

    res.status(200).json({
      success: true,
      message: 'Community information retrieved successfully',
      data: communityInfo
    });
  } catch (error) {
    next(error);
  }
};

exports.getTermsAndPolicies = async (req, res, next) => {
  try {
    const termsData = {
      termsOfService: {
        title: 'Terms of Service',
        lastUpdated: new Date('2024-01-01'),
        version: '2.1',
        effectiveDate: new Date('2024-01-01'),
        url: '/legal/terms-of-service',
        sections: [
          'Account Terms',
          'Acceptable Use',
          'Service Availability',
          'Payment Terms',
          'Intellectual Property',
          'Limitation of Liability',
          'Termination'
        ]
      },
      privacyPolicy: {
        title: 'Privacy Policy',
        lastUpdated: new Date('2024-01-01'),
        version: '2.0',
        effectiveDate: new Date('2024-01-01'),
        url: '/legal/privacy-policy',
        sections: [
          'Information Collection',
          'Information Use',
          'Information Sharing',
          'Data Security',
          'User Rights',
          'Contact Information'
        ]
      },
      cookiePolicy: {
        title: 'Cookie Policy',
        lastUpdated: new Date('2023-12-15'),
        version: '1.3',
        effectiveDate: new Date('2023-12-15'),
        url: '/legal/cookie-policy'
      },
      dataProcessingAgreement: {
        title: 'Data Processing Agreement',
        lastUpdated: new Date('2024-01-01'),
        version: '1.1',
        effectiveDate: new Date('2024-01-01'),
        url: '/legal/dpa'
      }
    };

    res.status(200).json({
      success: true,
      message: 'Terms and policies retrieved successfully',
      data: termsData
    });
  } catch (error) {
    next(error);
  }
};

// Export account data (GDPR compliance)
exports.exportAccountData = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get all user data
    const user = await User.findById(userId).select('-password');
    const userSettings = await UserSettings.findOne({ userId });
    const paymentSettings = await PaymentSettings.findOne({ userId });
    const subscriptions = await Subscription.find({ userId }).populate('planId');
    const transactions = await Transaction.find({ userId });
    const paymentMethods = await PaymentMethod.find({ userId });

    const exportData = {
      exportDate: new Date(),
      user,
      userSettings,
      paymentSettings,
      subscriptions,
      transactions,
      paymentMethods
    };

    res.status(200).json({
      success: true,
      message: 'Account data exported successfully',
      data: exportData
    });
  } catch (error) {
    next(error);
  }
};

// Delete account
exports.deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Validate input
    const { error, value } = validateAccountDeletion(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { password, reason } = value;

    // Verify password
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect password'
      });
    }

    // Mark account as deleted instead of hard delete
    await UserSettings.findOneAndUpdate(
      { userId },
      { 
        $set: { 
          'accountStatus.isDeleted': true,
          'accountStatus.deletedAt': new Date(),
          'accountStatus.deleteReason': reason || 'User requested deletion',
          'accountStatus.isActive': false
        }
      },
      { upsert: true }
    );

    // Deactivate user account
    user.isVerified = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Account deletion initiated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Deactivate account (temporary - user can reactivate)
exports.deactivateAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { error, value } = validateAccountDeactivation(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { password, reason } = value;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect password'
      });
    }

    // Check if already deactivated
    const settings = await UserSettings.findOne({ userId });
    if (settings && !settings.accountStatus.isActive) {
      return res.status(409).json({
        success: false,
        message: 'Account is already deactivated'
      });
    }

    await UserSettings.findOneAndUpdate(
      { userId },
      {
        $set: {
          'accountStatus.isActive': false,
          'accountStatus.suspendedAt': new Date(),
          'accountStatus.suspensionReason': reason || 'User requested deactivation'
        }
      },
      { upsert: true }
    );

    res.status(200).json({
      success: true,
      message: 'Account deactivated successfully. You can reactivate anytime by logging in.'
    });
  } catch (error) {
    next(error);
  }
};

// Reactivate account
exports.reactivateAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { error, value } = validateAccountReactivation(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { password } = value;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect password'
      });
    }

    const settings = await UserSettings.findOne({ userId });

    // Can't reactivate a deleted account
    if (settings && settings.accountStatus.isDeleted) {
      return res.status(403).json({
        success: false,
        message: 'This account has been permanently deleted and cannot be reactivated'
      });
    }

    if (settings && settings.accountStatus.isActive) {
      return res.status(409).json({
        success: false,
        message: 'Account is already active'
      });
    }

    await UserSettings.findOneAndUpdate(
      { userId },
      {
        $set: {
          'accountStatus.isActive': true,
          'accountStatus.suspendedAt': null,
          'accountStatus.suspensionReason': null
        }
      },
      { upsert: true }
    );

    res.status(200).json({
      success: true,
      message: 'Account reactivated successfully. Welcome back!'
    });
  } catch (error) {
    next(error);
  }
};