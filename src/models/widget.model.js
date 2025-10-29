const mongoose = require('mongoose');

const widgetSchema = new mongoose.Schema(
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
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BuilderPage'
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    type: {
      type: String,
      enum: [
        'text', 'image', 'video', 'youtube_video', 'audio', 'button', 'form', 'map', 'social_media',
        'testimonial', 'gallery', 'slider', 'countdown', 'pricing_table', 'chart',
        'embed', 'spacer', 'divider', 'icon', 'accordion', 'tabs', 'modal',
        'calendar', 'booking', 'payment', 'newsletter', 'search', 'menu',
        'breadcrumb', 'pagination', 'progress_bar', 'rating', 'timeline',
        'custom_html', 'api_data', 'weather', 'clock', 'calculator',
        'custom_link', 'media', 'promotions', 'products', 'event', 'dropdown',
        'app_integration', 'google_reviews', 'google_maps', 'reservations',
        'music_podcast', 'social_media_widgets', 'pdf'
      ],
      required: true
    },
    subType: {
      type: String,
      trim: true,
      maxlength: 50
    },
    category: {
      type: String,
      enum: ['content', 'media', 'form', 'navigation', 'ecommerce', 'social', 'utility', 'custom'],
      required: true
    },
    settings: {
      // Content settings
      content: {
        text: String,
        html: String,
        markdown: String,
        url: String,
        title: String,
        subtitle: String,
        description: String,
        alt: String,
        caption: String
      },

      // Display settings
      display: {
        width: {
          value: Number,
          unit: {
            type: String,
            enum: ['px', '%', 'rem', 'em', 'vw', 'vh'],
            default: '%'
          }
        },
        height: {
          value: Number,
          unit: {
            type: String,
            enum: ['px', '%', 'rem', 'em', 'vw', 'vh', 'auto'],
            default: 'auto'
          }
        },
        margin: {
          top: { type: Number, default: 0 },
          right: { type: Number, default: 0 },
          bottom: { type: Number, default: 0 },
          left: { type: Number, default: 0 }
        },
        padding: {
          top: { type: Number, default: 0 },
          right: { type: Number, default: 0 },
          bottom: { type: Number, default: 0 },
          left: { type: Number, default: 0 }
        },
        alignment: {
          type: String,
          enum: ['left', 'center', 'right', 'justify'],
          default: 'left'
        },
        verticalAlignment: {
          type: String,
          enum: ['top', 'middle', 'bottom'],
          default: 'top'
        }
      },

      // Style settings
      style: {
        backgroundColor: {
          type: String,
          match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
        },
        textColor: {
          type: String,
          match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
        },
        borderColor: {
          type: String,
          match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
        },
        borderWidth: {
          type: Number,
          default: 0,
          min: 0,
          max: 10
        },
        borderRadius: {
          type: Number,
          default: 0,
          min: 0,
          max: 50
        },
        fontSize: {
          type: Number,
          min: 8,
          max: 72
        },
        fontWeight: {
          type: String,
          enum: ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
          default: 'normal'
        },
        fontFamily: {
          type: String,
          default: 'Arial, sans-serif'
        },
        opacity: {
          type: Number,
          default: 1,
          min: 0,
          max: 1
        },
        shadow: {
          x: { type: Number, default: 0 },
          y: { type: Number, default: 0 },
          blur: { type: Number, default: 0 },
          color: {
            type: String,
            match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
            default: '#000000'
          }
        }
      },

      // Animation settings
      animation: {
        type: {
          type: String,
          enum: ['none', 'fade', 'slide', 'zoom', 'bounce', 'rotate', 'custom'],
          default: 'none'
        },
        duration: {
          type: Number,
          default: 1000,
          min: 100,
          max: 5000
        },
        delay: {
          type: Number,
          default: 0,
          min: 0,
          max: 5000
        },
        trigger: {
          type: String,
          enum: ['onload', 'onscroll', 'onhover', 'onclick'],
          default: 'onload'
        },
        repeat: {
          type: Boolean,
          default: false
        }
      },

      // Interactive settings
      interactive: {
        clickable: {
          type: Boolean,
          default: false
        },
        link: {
          url: String,
          target: {
            type: String,
            enum: ['_self', '_blank', '_parent', '_top'],
            default: '_self'
          },
          action: {
            type: String,
            enum: ['navigate', 'popup', 'modal', 'scroll', 'download', 'custom'],
            default: 'navigate'
          }
        },
        hover: {
          enabled: {
            type: Boolean,
            default: false
          },
          effect: {
            type: String,
            enum: ['none', 'fade', 'scale', 'rotate', 'slide', 'custom'],
            default: 'none'
          }
        }
      },

      // Type-specific settings
      specific: {
        //type: mongoose.Schema.Types.Mixed,
        default: {},

        // Custom Link fields
        customLink: [
          {
            title: { type: String, default: '' },
            url: { type: String, default: '' },
            style: { type: String, enum: ['button', 'rectangular'], default: 'rectangular' },
            imageUrl: { type: String, default: '' },
          },
        ],


        // Media fields (Photo/Video)
        media: {
          mediaType: { type: String, enum: ['photo', 'video', 'pdf'], default: 'photo' },
          photoType: { type: String, enum: ['carousel', 'grid'], default: 'carousel' },
          videoType: { type: String, enum: ['youtube', 'upload'], default: 'youtube' },

          // Carousel fields
          carousel: {
            title: { type: String, default: '' },
            url: { type: [String], default: [] }
          },

          // Grid fields
          grid: {
            photos: [{
              url: { type: String, default: '' },
              alt: { type: String, default: '' }
            }],
            sameForAll: { type: Boolean, default: false },
            gridTitle: { type: String, default: '' },
            url: { type: String, default: '' }
          },

          // Video fields
          video: {
            videoUrl: { type: String, default: '' },
            videoTitle: { type: String, default: '' },
            thumbnailUrl: { type: String, default: '' }
          },

          pdfs: [
            {
              title: { type: String, default: '' },
              pdfFile: { type: String, default: '' },
            },
          ],
        },

        // Form fields
        form: {
          addMedia: { type: String, default: '' }, // optional media
          titleTextBox: { type: String, default: '' },
          hasEmail: { type: Boolean, default: false },
          emailPlaceholder: { type: String, default: 'abc@123gmail.cm' },
          hasPhoneNumber: { type: Boolean, default: false },
          phoneNumberPlaceholder: { type: String, default: '' }
        },

        // Promotions fields
        promotions: {
          coverImage: { type: String, default: '' },
          title: { type: String, default: '' },
          url: { type: String, default: '' },
          startDate: { type: String, default: '' }, // MM/DD/YYYY format
          endDate: { type: String, default: '' }    // MM/DD/YYYY format
        },

        // Products fields
        products: [
          {
            _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
            productImage: { type: String, default: '' },
            productName: { type: String, default: '' },
            price: { type: String, default: '' },
            currency: { type: String, enum: ['USD', 'EUR', 'GBP', 'CAD'], default: 'USD' },
            productUrl: { type: String, default: '' },
            order: { type: Number, default: 0 }
          }
        ],

        // Event fields
        event: {
          eventImage: { type: String, default: '' },
          title: { type: String, default: '' },
          date: { type: String, default: '' }, // 26 Oct 2024 format
          location: { type: String, default: '' },
          ticketUrl: { type: String, default: '' },
          enddate: { type: String, default: '' },
          category: { type: String, default: '' }
        },

        // Drop Down Text fields
        dropdown: {
          headings: [{
            text: { type: String, default: 'Heading 1 Text' },
            description: { type: String, default: 'Add a description of your business.' },
            maxCharacters: { type: Number, default: 140 }
          }],
          addAnotherTextBox: { type: Boolean, default: false }
        },

        // App Integration fields
        appIntegration: {
          appleStoreUrl: { type: String, default: '' },
          googlePlayUrl: { type: String, default: '' }
        },

        // Google Reviews fields
        googleReviews: {
          mediaImage: { type: String, default: '' },
          title: { type: String, default: '' },
          googleBusinessProfileUrl: { type: String, default: 'Google Business' }
        },

        // Google Maps fields
        googleMaps: {
          location: { type: String, default: 'Los Angeles' }
        },

        // Reservations fields
        reservations: {
          reservationImage: { type: String, default: '' },
          reservationUrl: { type: String, default: 'www.url.com' }
        },

        // Music Podcast fields
        musicPodcast: {
          podcastImage: { type: String, default: '' },
          musicPodcastUrl: { type: String, default: 'www.url.com' }
        },

        // Social Media Widgets fields
        socialMedia: {
          widgetType: { type: String, enum: ['instagram_feed', 'tiktok_profile', 'facebook_profile'], default: 'instagram_feed' },

          // Instagram Feed
          instagram: {
            handle: { type: String, default: '' },
            title: { type: String, default: '' } // optional
          },

          // TikTok Profile
          tiktok: {
            handle: { type: String, default: '' },
            title: { type: String, default: '' } // optional
          },

          // Facebook Profile
          facebook: {
            handle: { type: String, default: '' },
            title: { type: String, default: '' } // optional
          }
        }
      }
    },
    layout: {
      position: {
        x: {
          type: Number,
          default: 0
        },
        y: {
          type: Number,
          default: 0
        },
        z: {
          type: Number,
          default: 0
        }
      },
      size: {
        width: {
          type: Number,
          default: 100
        },
        height: {
          type: Number,
          default: 50
        }
      },
      grid: {
        column: {
          type: Number,
          min: 1,
          max: 12,
          default: 1
        },
        row: {
          type: Number,
          min: 1,
          default: 1
        },
        columnSpan: {
          type: Number,
          min: 1,
          max: 12,
          default: 1
        },
        rowSpan: {
          type: Number,
          min: 1,
          default: 1
        }
      },
      responsive: {
        mobile: {
          visible: {
            type: Boolean,
            default: true
          },
          width: Number,
          height: Number,
          fontSize: Number
        },
        tablet: {
          visible: {
            type: Boolean,
            default: true
          },
          width: Number,
          height: Number,
          fontSize: Number
        },
        desktop: {
          visible: {
            type: Boolean,
            default: true
          },
          width: Number,
          height: Number,
          fontSize: Number
        }
      }
    },
    data: {
      source: {
        type: String,
        enum: ['static', 'dynamic', 'api', 'database', 'file'],
        default: 'static'
      },
      apiEndpoint: String,
      databaseQuery: String,
      refreshInterval: {
        type: Number,
        min: 0,
        default: 0 // 0 means no auto-refresh
      },
      cache: {
        enabled: {
          type: Boolean,
          default: false
        },
        duration: {
          type: Number,
          default: 3600 // seconds
        }
      },
      fields: [{
        name: String,
        type: {
          type: String,
          enum: ['string', 'number', 'boolean', 'date', 'array', 'object']
        },
        required: Boolean,
        default: mongoose.Schema.Types.Mixed
      }]
    },
    permissions: {
      isPublic: {
        type: Boolean,
        default: true
      },
      allowedRoles: [{
        type: String,
        enum: ['admin', 'editor', 'viewer', 'guest']
      }],
      requiresAuth: {
        type: Boolean,
        default: false
      }
    },
    metadata: {
      version: {
        type: String,
        default: '1.0'
      },
      author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      tags: [{
        type: String,
        trim: true,
        maxlength: 30
      }],
      description: {
        type: String,
        trim: true,
        maxlength: 500
      },
      documentation: {
        type: String,
        maxlength: 2000
      }
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'draft', 'archived'],
      default: 'active'
    },
    order: {
      type: Number,
      default: 0
    },
    isVisible: {
      type: Boolean,
      default: true
    },
    customCode: {
      css: {
        type: String,
        maxlength: 5000
      },
      js: {
        type: String,
        maxlength: 5000
      },
      html: {
        type: String,
        maxlength: 10000
      }
    },
    dependencies: [{
      name: String,
      version: String,
      url: String,
      type: {
        type: String,
        enum: ['css', 'js', 'font', 'image']
      }
    }],
    analytics: {
      views: {
        type: Number,
        default: 0
      },
      clicks: {
        type: Number,
        default: 0
      },
      interactions: {
        type: Number,
        default: 0
      },
      conversions: {
        type: Number,
        default: 0
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
widgetSchema.index({ userId: 1, pageId: 1 });
widgetSchema.index({ businessId: 1, type: 1 });
widgetSchema.index({ type: 1, category: 1 });
widgetSchema.index({ status: 1, isVisible: 1 });
widgetSchema.index({ 'metadata.tags': 1 });
widgetSchema.index({ order: 1 });

// Text search index
widgetSchema.index({
  name: 'text',
  'metadata.description': 'text',
  'metadata.tags': 'text'
});

// Virtual for widget identifier
widgetSchema.virtual('identifier').get(function () {
  return `${this.type}_${this._id.toString().slice(-6)}`;
});

// Virtual for display name
widgetSchema.virtual('displayName').get(function () {
  return this.name || `${this.type.charAt(0).toUpperCase() + this.type.slice(1)} Widget`;
});

// Pre-save middleware
widgetSchema.pre('save', function (next) {
  // Set author if not set
  if (!this.metadata.author && this.userId) {
    this.metadata.author = this.userId;
  }

  // Validate specific settings based on type
  this.validateTypeSpecificSettings();

  next();
});

// Instance methods
widgetSchema.methods.validateTypeSpecificSettings = function () {
  const { type, settings } = this;

  switch (type) {
    case 'image':
      if (!settings.content?.url) {
        throw new Error('Image widget requires a URL');
      }
      break;
    case 'button':
      if (!settings.content?.text) {
        throw new Error('Button widget requires text');
      }
      break;

    case 'media':
      const mediaType = settings.specific.media?.mediaType;
      if (mediaType === 'photo') {
        const photoType = settings.specific.media?.photoType;
        if (photoType === 'carousel' && !settings.specific.media?.carousel?.title) {
          throw new Error('Photo carousel requires a title');
        }
        if (photoType === 'grid' && !settings.specific.media?.grid?.gridTitle) {
          throw new Error('Photo grid requires a title');
        }
      } else if (mediaType === 'video') {
        if (!settings.specific.media?.video?.videoTitle) {
          throw new Error('Video widget requires a title');
        }
      }
      break;
    case 'form':
      if (!settings.specific.form?.titleTextBox) {
        throw new Error('Form widget requires a title text box');
      }
      break;
    case 'promotions':
      if (!settings.specific.promotions?.title) {
        throw new Error('Promotions widget requires a title');
      }
      break;
    case 'products':
      // Products can be either a single object or an array - no validation needed
      // The controller will handle converting single object to array
      break;
    case 'event':
      if (!settings.specific.event?.title) {
        throw new Error('Event widget requires a title');
      }
      break;
    case 'dropdown':
      if (!settings.specific.dropdown?.headings || !Array.isArray(settings.specific.dropdown.headings)) {
        throw new Error('Dropdown widget requires headings array');
      }
      break;
    case 'google_reviews':
      if (!settings.specific.googleReviews?.title) {
        throw new Error('Google Reviews widget requires a title');
      }
      break;
    case 'google_maps':
      if (!settings.specific.googleMaps?.location) {
        throw new Error('Google Maps widget requires a location');
      }
      break;
    case 'social_media_widgets':
      const widgetType = settings.specific.socialMedia?.widgetType;
      if (widgetType === 'instagram_feed' && !settings.specific.socialMedia?.instagram?.handle) {
        throw new Error('Instagram Feed requires a handle');
      }
      if (widgetType === 'tiktok_profile' && !settings.specific.socialMedia?.tiktok?.handle) {
        throw new Error('TikTok Profile requires a handle');
      }
      if (widgetType === 'facebook_profile' && !settings.specific.socialMedia?.facebook?.handle) {
        throw new Error('Facebook Profile requires a handle');
      }
      break;
  }
};

widgetSchema.methods.clone = function (newUserId = null, newPageId = null) {
  const clonedData = this.toObject();
  delete clonedData._id;
  delete clonedData.createdAt;
  delete clonedData.updatedAt;
  delete clonedData.__v;

  if (newUserId) clonedData.userId = newUserId;
  if (newPageId) clonedData.pageId = newPageId;

  clonedData.name = `${clonedData.name} (Copy)`;
  clonedData.analytics = {
    views: 0,
    clicks: 0,
    interactions: 0,
    conversions: 0
  };

  return new this.constructor(clonedData);
};

widgetSchema.methods.updateAnalytics = function (metric, value = 1) {
  if (this.analytics.hasOwnProperty(metric)) {
    this.analytics[metric] += value;
    return this.save();
  }
  throw new Error(`Invalid analytics metric: ${metric}`);
};

widgetSchema.methods.generatePreview = function () {
  const { type, settings, layout } = this;

  return {
    id: this._id,
    type,
    name: this.displayName,
    preview: {
      width: layout.size.width,
      height: layout.size.height,
      content: settings.content.text || settings.content.title || 'Widget Preview',
      style: {
        backgroundColor: settings.style.backgroundColor,
        textColor: settings.style.textColor,
        fontSize: settings.style.fontSize
      }
    }
  };
};

// Static methods
widgetSchema.statics.getByType = function (type, filters = {}) {
  return this.find({
    type,
    status: 'active',
    isVisible: true,
    ...filters
  }).sort({ order: 1, createdAt: -1 });
};

widgetSchema.statics.getByPage = function (pageId, includeHidden = false) {
  const query = { pageId };
  if (!includeHidden) {
    query.isVisible = true;
    query.status = 'active';
  }

  return this.find(query).sort({ order: 1 });
};

widgetSchema.statics.searchWidgets = function (searchTerm, filters = {}) {
  return this.find({
    $text: { $search: searchTerm },
    status: 'active',
    ...filters
  }).sort({ score: { $meta: 'textScore' } });
};

widgetSchema.statics.getPopularWidgets = function (limit = 10) {
  return this.find({
    status: 'active',
    isVisible: true
  })
    .sort({ 'analytics.views': -1, 'analytics.clicks': -1 })
    .limit(limit);
};

module.exports = mongoose.model('Widget', widgetSchema); 
