const mongoose = require('mongoose');

const socialMediaLinkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusinessProfile',
      default: null
    },
    platform: {
      type: String,
      enum: [
        'instagram', 
        'tiktok', 
        'facebook', 
        'twitter', 
        'linkedin', 
        'youtube', 
        'pinterest', 
        'snapchat', 
        'github', 
        'website', 
        'whatsapp', 
        'other'
      ],
      required: true
    },
    handle: {
      type: String,
      trim: true,
      maxlength: 100
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: 100
    },
    originalUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    normalizedUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    displayUrl: {
      type: String,
      trim: true,
      maxlength: 200
    },
    metadata: {
      title: {
        type: String,
        trim: true,
        maxlength: 200
      },
      description: {
        type: String,
        trim: true,
        maxlength: 500
      },
      thumbnailUrl: {
        type: String,
        trim: true,
        maxlength: 500
      },
      followerCount: {
        type: Number,
        min: 0,
        default: 0
      },
      postCount: {
        type: Number,
        min: 0,
        default: 0
      },
      isVerified: {
        type: Boolean,
        default: false
      }
    },
    embedSettings: {
      showHeader: {
        type: Boolean,
        default: true
      },
      showCaption: {
        type: Boolean,
        default: true
      },
      maxPosts: {
        type: Number,
        min: 1,
        max: 50,
        default: 6
      },
      layout: {
        type: String,
        enum: ['grid', 'carousel', 'list'],
        default: 'grid'
      }
    },
    status: {
      type: String,
      enum: ['active', 'broken', 'pending_verification'],
      default: 'active'
    },
    isPublic: {
      type: Boolean,
      default: true
    },
    displayOrder: {
      type: Number,
      default: 0,
      min: 0
    },
    lastChecked: {
      type: Date,
      default: Date.now
    },
    clicks: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

// Create indexes for performance
socialMediaLinkSchema.index({ userId: 1 });
socialMediaLinkSchema.index({ businessId: 1 });
socialMediaLinkSchema.index({ platform: 1 });
socialMediaLinkSchema.index({ normalizedUrl: 1 });
socialMediaLinkSchema.index({ handle: 1 });
socialMediaLinkSchema.index({ userId: 1, platform: 1 });
socialMediaLinkSchema.index({ userId: 1, displayOrder: 1 });
socialMediaLinkSchema.index({ businessId: 1, displayOrder: 1 });
socialMediaLinkSchema.index({ status: 1 });
socialMediaLinkSchema.index({ isPublic: 1 });

// Method to normalize URL based on platform
socialMediaLinkSchema.methods.normalizeUrl = function() {
  const url = this.originalUrl.toLowerCase().trim();
  
  // Remove protocol if present
  let cleanUrl = url.replace(/^https?:\/\//, '');
  
  // Remove www if present
  cleanUrl = cleanUrl.replace(/^www\./, '');
  
  // Platform-specific normalization
  switch (this.platform) {
    case 'instagram':
      if (cleanUrl.includes('instagram.com/')) {
        const match = cleanUrl.match(/instagram\.com\/([^\/\?]+)/);
        if (match) {
          this.handle = match[1];
          this.normalizedUrl = `https://instagram.com/${match[1]}`;
          this.displayUrl = `@${match[1]}`;
        }
      }
      break;
      
    case 'tiktok':
      if (cleanUrl.includes('tiktok.com/')) {
        const match = cleanUrl.match(/tiktok\.com\/@([^\/\?]+)/);
        if (match) {
          this.handle = match[1];
          this.normalizedUrl = `https://tiktok.com/@${match[1]}`;
          this.displayUrl = `@${match[1]}`;
        }
      }
      break;
      
    case 'facebook':
      if (cleanUrl.includes('facebook.com/')) {
        const match = cleanUrl.match(/facebook\.com\/([^\/\?]+)/);
        if (match) {
          this.handle = match[1];
          this.normalizedUrl = `https://facebook.com/${match[1]}`;
          this.displayUrl = match[1];
        }
      }
      break;
      
    case 'twitter':
      if (cleanUrl.includes('twitter.com/') || cleanUrl.includes('x.com/')) {
        const match = cleanUrl.match(/(?:twitter|x)\.com\/([^\/\?]+)/);
        if (match) {
          this.handle = match[1];
          this.normalizedUrl = `https://twitter.com/${match[1]}`;
          this.displayUrl = `@${match[1]}`;
        }
      }
      break;
      
    case 'linkedin':
      if (cleanUrl.includes('linkedin.com/')) {
        const match = cleanUrl.match(/linkedin\.com\/(?:in|company)\/([^\/\?]+)/);
        if (match) {
          this.handle = match[1];
          this.normalizedUrl = `https://linkedin.com/in/${match[1]}`;
          this.displayUrl = match[1];
        }
      }
      break;
      
    case 'youtube':
      if (cleanUrl.includes('youtube.com/')) {
        const match = cleanUrl.match(/youtube\.com\/(?:c\/|channel\/|user\/|@)?([^\/\?]+)/);
        if (match) {
          this.handle = match[1];
          this.normalizedUrl = `https://youtube.com/@${match[1]}`;
          this.displayUrl = `@${match[1]}`;
        }
      }
      break;
      
    case 'github':
      if (cleanUrl.includes('github.com/')) {
        const match = cleanUrl.match(/github\.com\/([^\/\?]+)/);
        if (match) {
          this.handle = match[1];
          this.normalizedUrl = `https://github.com/${match[1]}`;
          this.displayUrl = match[1];
        }
      }
      break;
      
    case 'whatsapp':
      if (cleanUrl.includes('wa.me/') || cleanUrl.includes('whatsapp.com/')) {
        const match = cleanUrl.match(/(?:wa\.me\/|whatsapp\.com\/send\?phone=)(\d+)/);
        if (match) {
          this.handle = match[1];
          this.normalizedUrl = `https://wa.me/${match[1]}`;
          this.displayUrl = `+${match[1]}`;
        }
      }
      break;
      
    default:
      // For website and other platforms, just ensure proper protocol
      if (!this.originalUrl.startsWith('http')) {
        this.normalizedUrl = `https://${this.originalUrl}`;
      } else {
        this.normalizedUrl = this.originalUrl;
      }
      this.displayUrl = this.normalizedUrl.replace(/^https?:\/\//, '');
  }
  
  return this.normalizedUrl;
};

// Method to increment click count
socialMediaLinkSchema.methods.incrementClicks = function() {
  this.clicks += 1;
  return this.save();
};

// Method to update metadata
socialMediaLinkSchema.methods.updateMetadata = function(metadata) {
  Object.assign(this.metadata, metadata);
  this.lastChecked = new Date();
  return this.save();
};

// Pre-save hook to normalize URL
socialMediaLinkSchema.pre('save', function(next) {
  if (this.isModified('originalUrl') || this.isNew) {
    this.normalizeUrl();
  }
  next();
});

// Virtual for getting platform icon
socialMediaLinkSchema.virtual('platformIcon').get(function() {
  const icons = {
    instagram: 'fab fa-instagram',
    tiktok: 'fab fa-tiktok',
    facebook: 'fab fa-facebook',
    twitter: 'fab fa-twitter',
    linkedin: 'fab fa-linkedin',
    youtube: 'fab fa-youtube',
    pinterest: 'fab fa-pinterest',
    snapchat: 'fab fa-snapchat',
    github: 'fab fa-github',
    website: 'fas fa-globe',
    whatsapp: 'fab fa-whatsapp',
    other: 'fas fa-link'
  };
  return icons[this.platform] || icons.other;
});

// Virtual for getting platform color
socialMediaLinkSchema.virtual('platformColor').get(function() {
  const colors = {
    instagram: '#E4405F',
    tiktok: '#000000',
    facebook: '#1877F2',
    twitter: '#1DA1F2',
    linkedin: '#0A66C2',
    youtube: '#FF0000',
    pinterest: '#BD081C',
    snapchat: '#FFFC00',
    github: '#181717',
    website: '#6C757D',
    whatsapp: '#25D366',
    other: '#6C757D'
  };
  return colors[this.platform] || colors.other;
});

const SocialMediaLink = mongoose.model('SocialMediaLink', socialMediaLinkSchema);

module.exports = SocialMediaLink; 