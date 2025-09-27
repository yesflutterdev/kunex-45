const mongoose = require('mongoose');

const userSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    
    // General account preferences
    preferences: {
      language: {
        type: String,
        enum: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'],
        default: 'en'
      },
      currency: {
        type: String,
        enum: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR'],
        default: 'USD'
      },
      timezone: {
        type: String,
        default: 'UTC'
      },
      distanceUnit: {
        type: String,
        enum: ['km', 'mi'],
        default: 'mi'
      },
      dateFormat: {
        type: String,
        enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
        default: 'MM/DD/YYYY'
      },
      timeFormat: {
        type: String,
        enum: ['12h', '24h'],
        default: '12h'
      }
    },

    // Privacy settings
    privacy: {
      profileVisibility: {
        type: String,
        enum: ['public', 'private', 'friends_only'],
        default: 'public'
      },
      allowSearchEngines: {
        type: Boolean,
        default: true
      },
      showOnlineStatus: {
        type: Boolean,
        default: true
      },
      allowDirectMessages: {
        type: Boolean,
        default: true
      }
    },

    // Notification preferences
    notifications: {
      email: {
        marketing: {
          type: Boolean,
          default: true
        },
        updates: {
          type: Boolean,
          default: true
        },
        security: {
          type: Boolean,
          default: true
        },
        billing: {
          type: Boolean,
          default: true
        },
        newsletter: {
          type: Boolean,
          default: false
        }
      },
      push: {
        enabled: {
          type: Boolean,
          default: true
        },
        marketing: {
          type: Boolean,
          default: false
        },
        updates: {
          type: Boolean,
          default: true
        },
        security: {
          type: Boolean,
          default: true
        }
      },
      sms: {
        enabled: {
          type: Boolean,
          default: false
        },
        security: {
          type: Boolean,
          default: false
        },
        billing: {
          type: Boolean,
          default: false
        }
      }
    },

    // Security settings
    security: {
      loginNotifications: {
        type: Boolean,
        default: true
      },
      unusualActivityNotifications: {
        type: Boolean,
        default: true
      },
      sessionTimeout: {
        type: Number,
        min: 15,
        max: 1440,
        default: 60 // minutes
      },
      passwordChangeRequired: {
        type: Boolean,
        default: false
      },
      lastPasswordChange: Date
    },

    // Account status
    accountStatus: {
      isActive: {
        type: Boolean,
        default: true
      },
      isDeleted: {
        type: Boolean,
        default: false
      },
      deletedAt: Date,
      deleteReason: String,
      suspendedAt: Date,
      suspensionReason: String
    },

    // Data and export preferences
    dataSettings: {
      allowDataCollection: {
        type: Boolean,
        default: true
      },
      allowAnalytics: {
        type: Boolean,
        default: true
      },
      allowPersonalization: {
        type: Boolean,
        default: true
      },
      dataRetentionPeriod: {
        type: Number,
        default: 365 // days
      }
    }
  },
  {
    timestamps: true
  }
);

// Create indexes for performance
userSettingsSchema.index({ 'accountStatus.isActive': 1 });
userSettingsSchema.index({ 'accountStatus.isDeleted': 1 });

// Method to get public settings (for profile visibility)
userSettingsSchema.methods.getPublicSettings = function() {
  return {
    preferences: {
      language: this.preferences.language,
      timezone: this.preferences.timezone
    },
    privacy: {
      profileVisibility: this.privacy.profileVisibility
    }
  };
};

// Method to update preferences
userSettingsSchema.methods.updatePreferences = function(newPreferences) {
  Object.keys(newPreferences).forEach(key => {
    if (this.preferences[key] !== undefined) {
      this.preferences[key] = newPreferences[key];
    }
  });
  return this.save();
};

// Method to update notification settings
userSettingsSchema.methods.updateNotificationSettings = function(notificationSettings) {
  if (notificationSettings.email) {
    Object.assign(this.notifications.email, notificationSettings.email);
  }
  if (notificationSettings.push) {
    Object.assign(this.notifications.push, notificationSettings.push);
  }
  if (notificationSettings.sms) {
    Object.assign(this.notifications.sms, notificationSettings.sms);
  }
  return this.save();
};

// Static method to create default settings for new user
userSettingsSchema.statics.createDefaultSettings = function(userId) {
  return this.create({ userId });
};

const UserSettings = mongoose.model('UserSettings', userSettingsSchema);

module.exports = UserSettings; 