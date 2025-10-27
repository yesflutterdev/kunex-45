const mongoose = require('mongoose');

const businessProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[a-zA-Z0-9_-]+$/,
      minlength: 3,
      maxlength: 30
    },
    logo: {
      type: String, // URL to logo
      default: null
    },
    coverImages: [{
      type: String // URLs to cover images
    }],
    businessType: {
      type: String,
      enum: [
        'Small business',
        'Medium sized business', 
        'Franchise',
        'Corporation',
        'Non profit organizations',
        'Startup',
        'Online business',
        'Others'
      ],
      required: true
    },
    subBusinessType: {
      type: String,
      trim: true,
      maxlength: 100
    },
    professionType: {
      type: String,
      enum: [
        'Freelancer',
        'Contractor',
        'Consultant',
        'Self employed',
        'Employer',
        'Entrepreneur',
        'Remote worker',
        'Others'
      ]
    },
    industry: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    subIndustry: {
      type: String,
      trim: true,
      maxlength: 100
    },
    industryTags: [{
      type: String,
      trim: true,
      maxlength: 50
    }],
    description: {
      short: {
        type: String,
        trim: true,
        maxlength: 200
      },
      full: {
        type: String,
        trim: true,
        maxlength: 2000
      }
    },
    priceRange: {
      type: String,
      enum: ['$', '$$', '$$$', '$$$$']
    },
    contactInfo: {
      email: {
        type: String,
        trim: true,
        lowercase: true,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      },
      phone: {
        type: String,
        trim: true,
        maxlength: 20
      },
      website: {
        type: String,
        trim: true,
        match: /^https?:\/\/.+/
      }
    },
    location: {
      isOnlineOnly: {
        type: Boolean,
        default: false
      },
      address: {
        type: String,
        trim: true,
        maxlength: 200
      },
      city: {
        type: String,
        trim: true,
        maxlength: 100
      },
      state: {
        type: String,
        trim: true,
        maxlength: 100
      },
      country: {
        type: String,
        trim: true,
        maxlength: 100
      },
      postalCode: {
        type: String,
        trim: true,
        maxlength: 20
      },
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point'
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          validate: {
            validator: function(v) {
              return v.length === 2 && 
                     v[0] >= -180 && v[0] <= 180 && // longitude
                     v[1] >= -90 && v[1] <= 90;     // latitude
            },
            message: 'Coordinates must be [longitude, latitude] with valid ranges'
          }
        }
      }
    },
    businessHours: [{
      day: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        required: true
      },
      open: {
        type: String,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ // HH:MM format
      },
      close: {
        type: String,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ // HH:MM format
      },
      isClosed: {
        type: Boolean,
        default: false
      }
    }],
    features: [{
      type: String,
      trim: true,
      maxlength: 100
    }],
    themeColor: {
      primary: {
        type: String,
        match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
        default: '#007bff'
      },
      secondary: {
        type: String,
        match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
        default: '#6c757d'
      },
      text: {
        type: String,
        match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
        default: '#212529'
      },
      background: {
        type: String,
        match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
        default: '#ffffff'
      }
    },
    callToAction: {
      primaryAction: {
        type: String,
        enum: ['open_url', 'send_email', 'click_to_call', 'share_vcard', 'none'],
        default: 'none'
      },
      buttonColor: {
        type: String,
        match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
        default: '#007bff'
      },
      buttonText: {
        type: String,
        trim: true,
        maxlength: 50,
        default: 'Contact Us'
      }
    },
    completionPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    virtualContact: {
      firstName: {
        type: String,
        trim: true,
        maxlength: 50
      },
      lastName: {
        type: String,
        trim: true,
        maxlength: 50
      },
      company: {
        type: String,
        trim: true,
        maxlength: 100
      },
      workPhone: {
        type: String,
        trim: true,
        maxlength: 20
      },
      workEmail: {
        type: String,
        trim: true,
        lowercase: true,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      },
      workAddress: {
        type: String,
        trim: true,
        maxlength: 200
      },
      city: {
        type: String,
        trim: true,
        maxlength: 100
      },
      state: {
        type: String,
        trim: true,
        maxlength: 100
      },
      zipCode: {
        type: String,
        trim: true,
        maxlength: 20
      },
      country: {
        type: String,
        trim: true,
        maxlength: 100
      },
      photo: {
        type: String // URL to photo
      }
    },
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null
    },
    metrics: {
      viewCount: {
        type: Number,
        default: 0,
        min: 0
      },
      favoriteCount: {
        type: Number,
        default: 0,
        min: 0
      },
      ratingAverage: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      },
      ratingCount: {
        type: Number,
        default: 0,
        min: 0
      }
    }
  },
  {
    timestamps: true
  }
);

// Create indexes using schema.index() to avoid duplicates
businessProfileSchema.index({ 'location.coordinates': '2dsphere' });

// Compound indexes for better query performance
businessProfileSchema.index({
  'location.coordinates': '2dsphere',
  businessType: 1,
  industry: 1,
  'metrics.ratingAverage': -1
});

businessProfileSchema.index({ businessType: 1 });
businessProfileSchema.index({ industry: 1 });
businessProfileSchema.index({ priceRange: 1 });
businessProfileSchema.index({ 'metrics.ratingAverage': 1 });
businessProfileSchema.index({ 'location.city': 1 });
businessProfileSchema.index({ 'location.country': 1 });

// Create text index for search functionality
businessProfileSchema.index({ 
  businessName: 'text', 
  'description.short': 'text', 
  'description.full': 'text',
  industry: 'text',
  subIndustry: 'text',
  industryTags: 'text'
});

// Method to calculate completion percentage
businessProfileSchema.methods.calculateCompletionPercentage = function() {
  const requiredFields = [
    'businessName',
    'username', 
    'businessType',
    'industry',
    'description.short',
    'contactInfo.email',
    'contactInfo.phone'
  ];

  const optionalFields = [
    'logo',
    'description.full',
    'location.address',
    'location.city',
    'location.country',
    'businessHours',
    'features',
    'virtualContact.firstName',
    'virtualContact.lastName'
  ];

  let completedRequired = 0;
  let completedOptional = 0;

  // Check required fields (70% weight)
  requiredFields.forEach(field => {
    const value = this.get(field);
    if (value && value !== '' && (!Array.isArray(value) || value.length > 0)) {
      completedRequired++;
    }
  });

  // Check optional fields (30% weight)
  optionalFields.forEach(field => {
    const value = this.get(field);
    if (value && value !== '' && (!Array.isArray(value) || value.length > 0)) {
      completedOptional++;
    }
  });

  const requiredPercentage = (completedRequired / requiredFields.length) * 70;
  const optionalPercentage = (completedOptional / optionalFields.length) * 30;
  
  const totalPercentage = Math.round(requiredPercentage + optionalPercentage);
  
  // Update the completion percentage
  this.completionPercentage = totalPercentage;
  
  return totalPercentage;
};

// Method to increment view count
businessProfileSchema.methods.incrementViewCount = function() {
  this.metrics.viewCount += 1;
  return this.save();
};

// Method to increment favorite count
businessProfileSchema.methods.incrementFavoriteCount = function() {
  this.metrics.favoriteCount += 1;
  return this.save();
};

// Method to update rating
businessProfileSchema.methods.updateRating = function(newRating) {
  const currentTotal = this.metrics.ratingAverage * this.metrics.ratingCount;
  this.metrics.ratingCount += 1;
  this.metrics.ratingAverage = (currentTotal + newRating) / this.metrics.ratingCount;
  return this.save();
};

// Pre-save hook to calculate completion percentage
businessProfileSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.calculateCompletionPercentage();
  }
  next();
});

// Virtual for getting business hours for a specific day
businessProfileSchema.virtual('todayHours').get(function() {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  return this.businessHours.find(hours => hours.day === today);
});

// Virtual for checking if business is currently open
businessProfileSchema.virtual('isCurrentlyOpen').get(function() {
  const now = new Date();
  const today = now.toLocaleDateString('en-US', { weekday: 'long' });
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
  
  const todayHours = this.businessHours.find(hours => hours.day === today);
  
  if (!todayHours || todayHours.isClosed) {
    return false;
  }
  
  return currentTime >= todayHours.open && currentTime <= todayHours.close;
});

const BusinessProfile = mongoose.model('BusinessProfile', businessProfileSchema);

module.exports = BusinessProfile; 