const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId && !this.facebookId; // Password is required only if not using Google OAuth
      },
      minlength: 8,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    profilePicture: {
      type: String, // URL to profile picture
    },
    isVerified: {
      type: Boolean,
      // default: false,
      default: function () {
        return !!this.googleId; // Auto-verify OAuth users
      },
    },
    verificationToken: String,
    verificationTokenExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    twoFactorSecret: String,
    isTwoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    // OAuth providers
    googleId: {
      type: String,
    },
    facebookId: {
      type: String,
    },

    // OAuth profile data
    oauthProfiles: {
      google: {
        id: String,
        email: String,
        name: String,
        picture: String,
        verified_email: Boolean,
      },
      facebook: {
        id: String,
        email: String,
        name: String,
        picture: String,
      }
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    loginHistory: [
      {
        timestamp: {
          type: Date,
          default: Date.now,
        },
        ipAddress: String,
        userAgent: String,
        success: Boolean,
      },
    ],

    // mobile OTP code
    forgotPasswordCode: {
      type: String,
      select: false
    },
    forgotPasswordCodeValidation: {
      type: Number,
      select: false
    },
    isUserFillsInitialData: {
      type: Boolean,
      default: false,
    },
    planSubscribedTo: {
      type: String,
      default: 'free',
    },

    // NEW SUBSCRIPTION FIELDS
    subscriptionPlan: {
      type: String,
      default: 'free'
    },
    subscriptionDate: {
      type: Date,
      default: null
    },
    subscriptionExpireDate: {
      type: Date,
      default: null
    },
    isActiveSubscription: {
      type: Boolean,
      default: false
    },

    // LOCATION FIELDS
    longitude: {
      type: Number,
      default: null
    },
    latitude: {
      type: Number,
      default: null
    },
    city: {
      type: String,
      default: null
    },
    address: {
      type: String,
      default: null
    },
    lastLocationUpdate: {
      type: Date,
      default: null
    }

  },
  {
    timestamps: true,
  }
);

// Create indexes using schema.index() to avoid duplicates
userSchema.index({ googleId: 1 }, { sparse: true });
userSchema.index({ facebookId: 1 }, { sparse: true });
userSchema.index({ email: 1, googleId: 1 });

// Pre-save hook to hash password
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password along with the new salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  // return bcrypt.compare(candidatePassword, this.password);
  if (!this.password) return false; // OAuth users might not have password
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to record login attempt
userSchema.methods.recordLoginAttempt = function (ipAddress, userAgent, success) {
  this.loginHistory.push({
    timestamp: Date.now(),
    ipAddress,
    userAgent,
    success,
  });

  // Keep only the last 10 login attempts
  if (this.loginHistory.length > 10) {
    this.loginHistory = this.loginHistory.slice(-10);
  }

  return this.save();
};

// Post-save hook to create default favorites folder for new users
userSchema.post('save', async function(doc) {
  if (this.isNew) {
    try {
      const Folder = mongoose.model('Folder');
      const existingDefaultFolder = await Folder.findOne({ 
        userId: doc._id, 
        isDefault: true 
      });
      
      if (!existingDefaultFolder) {
        await Folder.createDefaultFolder(doc._id);
      }
    } catch (error) {
      console.error('Error creating default folder for user:', error);
    }
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;