const mongoose = require('mongoose');

const daySchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ["Mon", "Tues", "Wed", "Thur", "Fri", "Sat", "Sun"],
    required: true,
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
});

const builderPageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusinessProfile'
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },

    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9-]+$/,
      maxlength: 100
    },
    description: {
      type: String,
      trim: true,
      maxlength: 140
    },
    priceRange: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    serviceHours: {
      sameForAll: {
        type: Boolean,
        default: false,
      },
      commonHours: {
        startTime: { type: String },
        endTime: { type: String },
      },
      hours: [daySchema], // only required if sameForAll = false
    },
    logo: {
      type: String,
    },
    cover: {
      type: String,
    },
    pageType: {
      type: String,
      enum: ['landing', 'product', 'service', 'about', 'contact', 'portfolio', 'blog', 'custom'],
      required: true
    },
    template: {
      name: {
        type: String,
        required: true,
        trim: true
      },
      version: {
        type: String,
        default: '1.0'
      },
      category: {
        type: String,
        enum: ['business', 'portfolio', 'ecommerce', 'blog', 'restaurant', 'agency', 'personal'],
        required: true
      }
    },
    layout: {
      structure: {
        type: String,
        enum: ['single-column', 'two-column', 'three-column', 'sidebar-left', 'sidebar-right', 'custom'],
        default: 'single-column'
      },
      sections: [{
        id: {
          type: String,
          required: true
        },
        type: {
          type: String,
          enum: ['header', 'hero', 'content', 'gallery', 'testimonials', 'contact', 'footer', 'custom'],
          required: true
        },
        order: {
          type: Number,
          required: true
        },
        visible: {
          type: Boolean,
          default: true
        },
        settings: {
          type: mongoose.Schema.Types.Mixed,
          default: {}
        }
      }],
      gridSystem: {
        type: String,
        enum: ['bootstrap', 'css-grid', 'flexbox'],
        default: 'bootstrap'
      }
    },
    styling: {
      themeColors: {
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
        accent: {
          type: String,
          match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
          default: '#28a745'
        },
        background: {
          type: String,
          match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
          default: '#111111'
        },
        text: {
          type: String,
          match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
          default: '#333333'
        }
      },
      typography: {
        headingFont: {
          type: String,
          default: 'Arial, sans-serif'
        },
        bodyFont: {
          type: String,
          default: 'Arial, sans-serif'
        },
        fontSize: {
          base: {
            type: Number,
            default: 16,
            min: 12,
            max: 24
          },
          h1: {
            type: Number,
            default: 32,
            min: 20,
            max: 48
          },
          h2: {
            type: Number,
            default: 28,
            min: 18,
            max: 40
          },
          h3: {
            type: Number,
            default: 24,
            min: 16,
            max: 32
          }
        }
      },
      spacing: {
        sectionPadding: {
          type: Number,
          default: 40,
          min: 0,
          max: 100
        },
        elementMargin: {
          type: Number,
          default: 20,
          min: 0,
          max: 50
        }
      },
      customCSS: {
        type: String,
        maxlength: 10000
      }
    },
    seo: {
      metaTitle: {
        type: String,
        trim: true,
        maxlength: 60
      },
      metaDescription: {
        type: String,
        trim: true,
        maxlength: 160
      },
      metaKeywords: [{
        type: String,
        trim: true,
        maxlength: 50
      }],
      ogImage: {
        type: String // URL
      },
      canonicalUrl: {
        type: String,
        trim: true
      },
      noIndex: {
        type: Boolean,
        default: false
      }
    },
    settings: {
      isPublished: {
        type: Boolean,
        default: true
      },
      isDraft: {
        type: Boolean,
        default: true
      },
      requiresAuth: {
        type: Boolean,
        default: false
      },
      allowComments: {
        type: Boolean,
        default: false
      },
      trackAnalytics: {
        type: Boolean,
        default: true
      },
      socialSharing: {
        enabled: {
          type: Boolean,
          default: true
        },
        platforms: [{
          type: String,
          enum: ['facebook', 'twitter', 'linkedin', 'instagram', 'pinterest']
        }]
      }
    },
    // Social links for the page
    socialLinks: [{
      platform: {
        type: String,
        enum: ['facebook', 'twitter', 'linkedin', 'instagram', 'youtube', 'tiktok', 'pinterest', 'snapchat', 'whatsapp', 'telegram', 'discord', 'reddit', 'github', 'website', 'blog', 'other'],
        required: true
      },
      url: {
        type: String,
        required: true,
        trim: true
      },
      displayName: {
        type: String,
        trim: true,
        maxlength: 50
      },
      isActive: {
        type: Boolean,
        default: true
      },
      order: {
        type: Number,
        default: 0
      }
    }],
    // Call to action button configuration
    callToAction: {
      enabled: {
        type: Boolean,
        default: false
      },
      button: {
        text: {
          type: String,
          trim: true,
          maxlength: 50,
          default: 'Get Started'
        },
        bgColor: {
          type: String,
          match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
          default: '#007bff'
        },
        textColor: {
          type: String,
          match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
          default: '#ffffff'
        },
        radius: {
          type: Number,
          min: 0,
          max: 50,
          default: 8
        },
        action: {
          type: String,
          enum: ['make_call', 'send_email', 'open_url', 'download_file', 'book_appointment', 'make_purchase', 'subscribe_newsletter', 'contact_form', 'social_media', 'custom'],
          default: 'open_url'
        },
        actionData: {
          phoneNumber: String,
          emailAddress: String,
          url: String,
          fileUrl: String,
          appointmentUrl: String,
          productId: String,
          newsletterId: String,
          formId: String,
          socialPlatform: String,
          customAction: String
        },
        size: {
          width: {
            type: Number,
            min: 100,
            max: 400,
            default: 200
          },
          height: {
            type: Number,
            min: 40,
            max: 80,
            default: 50
          }
        },
        position: {
          type: String,
          enum: ['top-left', 'top-center', 'top-right', 'middle-left', 'middle-center', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right', 'floating'],
          default: 'bottom-center'
        },
        isFloating: {
          type: Boolean,
          default: false
        },
        showOnScroll: {
          type: Boolean,
          default: false
        },
        scrollThreshold: {
          type: Number,
          min: 0,
          max: 100,
          default: 50
        }
      }
    },
    performance: {
      loadTime: {
        type: Number,
        default: 0
      },
      optimizationScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      mobileOptimized: {
        type: Boolean,
        default: true
      }
    },
    versions: [{
      versionNumber: {
        type: Number,
        required: true
      },
      timestamp: {
        type: Date,
        required: true
      },
      changes: {
        type: String,
        maxlength: 500
      },
      data: {
        type: mongoose.Schema.Types.Mixed
      }
    }],
    analytics: {
      pageViews: {
        type: Number,
        default: 0
      },
      uniqueVisitors: {
        type: Number,
        default: 0
      },
      bounceRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      avgTimeOnPage: {
        type: Number,
        default: 0
      },
      conversionRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      }
    },
    publishedAt: Date,
    lastModified: Date
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound indexes
builderPageSchema.index({ userId: 1, slug: 1 }, { unique: true });
builderPageSchema.index({ businessId: 1, slug: 1 });
builderPageSchema.index({ pageType: 1, 'settings.isPublished': 1 });
builderPageSchema.index({ 'template.category': 1 });
builderPageSchema.index({ publishedAt: -1 });
builderPageSchema.index({ 'analytics.pageViews': -1 });

// Text search index
builderPageSchema.index({
  title: 'text',
  description: 'text',
  'seo.metaKeywords': 'text'
});

// Virtual for full URL
builderPageSchema.virtual('fullUrl').get(function () {
  return `/${this.slug}`;
});

// Virtual for current version
builderPageSchema.virtual('currentVersion').get(function () {
  if (this.versions && this.versions.length > 0) {
    return this.versions[this.versions.length - 1].versionNumber;
  }
  return 1;
});

// Pre-save middleware
builderPageSchema.pre('save', function (next) {
  if (this.isModified() && !this.isNew) {
    this.lastModified = new Date();
  }

  if (this.settings.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  next();
});

// Instance methods
builderPageSchema.methods.createVersion = function (changes = '') {
  const versionNumber = this.currentVersion + 1;
  const newVersion = {
    versionNumber,
    timestamp: new Date(),
    changes,
    data: {
      layout: this.layout,
      styling: this.styling,
      seo: this.seo,
      settings: this.settings
    }
  };

  this.versions.push(newVersion);
  return versionNumber;
};

builderPageSchema.methods.revertToVersion = function (versionNumber) {
  const version = this.versions.find(v => v.versionNumber === versionNumber);
  if (!version) {
    throw new Error('Version not found');
  }

  this.layout = version.data.layout;
  this.styling = version.data.styling;
  this.seo = version.data.seo;
  this.settings = version.data.settings;

  return this;
};

builderPageSchema.methods.publish = function () {
  this.settings.isPublished = true;
  this.settings.isDraft = false;
  if (!this.publishedAt) {
    this.publishedAt = new Date();
  }
  return this.save();
};

builderPageSchema.methods.unpublish = function () {
  this.settings.isPublished = false;
  this.settings.isDraft = true;
  return this.save();
};

builderPageSchema.methods.incrementViews = function () {
  this.analytics.pageViews += 1;
  return this.save();
};

// Static methods
builderPageSchema.statics.getPublishedPages = function (filters = {}) {
  return this.find({
    'settings.isPublished': true,
    ...filters
  }).sort({ publishedAt: -1 });
};

builderPageSchema.statics.getDraftPages = function (userId, businessId = null) {
  const query = {
    userId,
    'settings.isDraft': true
  };

  if (businessId) {
    query.businessId = businessId;
  }

  return this.find(query).sort({ updatedAt: -1 });
};

builderPageSchema.statics.searchPages = function (searchTerm, filters = {}) {
  return this.find({
    $text: { $search: searchTerm },
    'settings.isPublished': true,
    ...filters
  }).sort({ score: { $meta: 'textScore' } });
};

module.exports = mongoose.model('BuilderPage', builderPageSchema); 