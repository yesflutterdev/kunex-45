const mongoose = require('mongoose');

const personalProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    profilePhoto: {
      type: String, // URL to photo
    },
    bio: {
      type: String,
      maxlength: 500,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    },
    interests: [{
      type: String,
      trim: true,
    }],
    location: {
      address: {
        type: String,
        trim: true,
      },
      city: {
        type: String,
        trim: true,
      },
      state: {
        type: String,
        trim: true,
      },
      country: {
        type: String,
        trim: true,
      },
      postalCode: {
        type: String,
        trim: true,
      },
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          validate: {
            validator: function(coords) {
              return coords.length === 2 && 
                     coords[0] >= -180 && coords[0] <= 180 && // longitude
                     coords[1] >= -90 && coords[1] <= 90;     // latitude
            },
            message: 'Coordinates must be [longitude, latitude] with valid ranges',
          },
        },
      },
    },
    contactInfo: {
      email: {
        type: String,
        trim: true,
        lowercase: true,
        validate: {
          validator: function(email) {
            if (!email) return true; // Allow empty email
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
          },
          message: 'Please provide a valid email address',
        },
      },
      phone: {
        type: String,
        trim: true,
      },
      website: {
        type: String,
        trim: true,
        validate: {
          validator: function(url) {
            if (!url) return true; // Allow empty URL
            return /^https?:\/\/.+/.test(url);
          },
          message: 'Please provide a valid website URL',
        },
      },
    },
    socialMedia: [{
      platform: {
        type: String,
        enum: [
          'instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 
          'youtube', 'pinterest', 'snapchat', 'github', 'other'
        ],
        required: true,
      },
      handle: {
        type: String,
        trim: true,
      },
      url: {
        type: String,
        trim: true,
        required: true,
      },
      isVerified: {
        type: Boolean,
        default: false,
      },
    }],
    preferences: {
      language: {
        type: String,
        default: 'en',
        enum: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar'],
      },
      currency: {
        type: String,
        default: 'USD',
        enum: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR'],
      },
      distanceUnit: {
        type: String,
        enum: ['km', 'mi'],
        default: 'mi',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for better query performance (removed userId as it already has unique index)
personalProfileSchema.index({ 'location.coordinates': '2dsphere' });
personalProfileSchema.index({ 'socialMedia.platform': 1, 'socialMedia.handle': 1 });
personalProfileSchema.index({ interests: 1 });
personalProfileSchema.index({ 'location.city': 1 });
personalProfileSchema.index({ 'location.country': 1 });

// Virtual for full name
personalProfileSchema.virtual('fullName').get(function() {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.firstName || this.lastName || '';
});

// Method to calculate profile completion percentage
personalProfileSchema.methods.calculateCompletionPercentage = function() {
  const fields = [
    'firstName', 'lastName', 'profilePhoto', 'bio', 'dateOfBirth', 
    'gender', 'location.address', 'location.city', 'location.country',
    'contactInfo.email', 'contactInfo.phone'
  ];
  
  let completedFields = 0;
  
  fields.forEach(field => {
    const value = field.includes('.') 
      ? field.split('.').reduce((obj, key) => obj?.[key], this)
      : this[field];
    
    if (value && value.toString().trim() !== '') {
      completedFields++;
    }
  });
  
  // Add points for interests and social media
  if (this.interests && this.interests.length > 0) completedFields++;
  if (this.socialMedia && this.socialMedia.length > 0) completedFields++;
  
  const totalFields = fields.length + 2; // +2 for interests and social media
  return Math.round((completedFields / totalFields) * 100);
};

// Method to get nearby profiles (requires coordinates)
personalProfileSchema.statics.findNearby = function(longitude, latitude, maxDistance = 10000) {
  return this.find({
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance // in meters
      }
    }
  });
};

// Pre-save middleware to ensure coordinates are properly formatted
personalProfileSchema.pre('save', function(next) {
  if (this.location && this.location.coordinates && this.location.coordinates.coordinates) {
    // Ensure coordinates are numbers
    this.location.coordinates.coordinates = this.location.coordinates.coordinates.map(coord => 
      typeof coord === 'string' ? parseFloat(coord) : coord
    );
  }
  next();
});

const PersonalProfile = mongoose.model('PersonalProfile', personalProfileSchema);

module.exports = PersonalProfile; 