const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    
    // Ticket Information
    ticketId: {
      type: String,
      unique: true,
      index: true
    },
    
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    
    category: {
      type: String,
      required: true,
      trim: true
    },
    
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupportCategory',
      required: true
    },
    
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium'
    },
    
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Completed', 'Closed', 'Cancelled'],
      default: 'Open',
      index: true
    },
    
    // Ticket Content
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000
    },
    
    // Attachments
    attachments: [{
      fileName: {
        type: String,
        required: true
      },
      fileUrl: {
        type: String,
        required: true
      },
      fileType: {
        type: String,
        required: true,
        enum: ['image', 'video']
      },
      fileSize: {
        type: Number,
        required: true
      },
      publicId: {
        type: String,
        required: true
      },
      isImage: {
        type: Boolean,
        default: false
      },
      isVideo: {
        type: Boolean,
        default: false
      }
    }],
    
    // Communication
    messages: [{
      sender: {
        type: String,
        enum: ['user', 'admin', 'system'],
        required: true
      },
      message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
      },
      attachments: [{
        fileName: String,
        fileUrl: String,
        fileType: String,
        fileSize: Number,
        publicId: String,
        isImage: {
          type: Boolean,
          default: false
        },
        isVideo: {
          type: Boolean,
          default: false
        }
      }],
      timestamp: {
        type: Date,
        default: Date.now
      },
      isInternal: {
        type: Boolean,
        default: false
      }
    }],
    
    // Resolution
    resolution: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    
    resolvedAt: {
      type: Date
    },
    
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    
    // Admin Assignment
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    
    assignedAt: {
      type: Date
    },
    
    // Timestamps
    lastActivity: {
      type: Date,
      default: Date.now
    },
    
    // Metadata
    tags: [{
      type: String,
      trim: true
    }],
    
    isUrgent: {
      type: Boolean,
      default: false
    },
    
    estimatedResolution: {
      type: Date
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better performance
supportTicketSchema.index({ userId: 1, status: 1 });
supportTicketSchema.index({ status: 1, priority: 1 });
supportTicketSchema.index({ createdAt: -1 });
supportTicketSchema.index({ lastActivity: -1 });

// Virtual for ticket age
supportTicketSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for response time
supportTicketSchema.virtual('responseTime').get(function() {
  if (this.messages.length > 1) {
    const firstAdminMessage = this.messages.find(msg => msg.sender === 'admin');
    if (firstAdminMessage) {
      return Math.floor((firstAdminMessage.timestamp - this.createdAt) / (1000 * 60 * 60));
    }
  }
  return null;
});

// Pre-save middleware to generate ticket ID
supportTicketSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Generate a 4-digit unique ticket ID
    let ticketId;
    let isUnique = false;
    
    while (!isUnique) {
      // Generate random 4-digit number
      const randomNum = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
      ticketId = `#${randomNum}`;
      
      // Check if this ticket ID already exists
      const existingTicket = await this.constructor.findOne({ ticketId });
      if (!existingTicket) {
        isUnique = true;
      }
    }
    
    this.ticketId = ticketId;
  }
  next();
});

// Pre-save middleware to update last activity
supportTicketSchema.pre('save', function(next) {
  this.lastActivity = new Date();
  next();
});

// Method to add a message
supportTicketSchema.methods.addMessage = function(sender, message, attachments = [], isInternal = false) {
  this.messages.push({
    sender,
    message,
    attachments,
    timestamp: new Date(),
    isInternal
  });
  return this.save();
};

// Method to update status
supportTicketSchema.methods.updateStatus = function(newStatus, resolvedBy = null) {
  this.status = newStatus;
  
  if (newStatus === 'Completed' || newStatus === 'Closed') {
    this.resolvedAt = new Date();
    if (resolvedBy) {
      this.resolvedBy = resolvedBy;
    }
  }
  
  return this.save();
};

// Method to assign ticket
supportTicketSchema.methods.assignTicket = function(assignedTo) {
  this.assignedTo = assignedTo;
  this.assignedAt = new Date();
  return this.save();
};

// Static method to get ticket statistics
supportTicketSchema.statics.getTicketStats = async function(userId = null) {
  const matchStage = userId ? { userId: new mongoose.Types.ObjectId(userId) } : {};
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  return stats.reduce((acc, stat) => {
    acc[stat._id] = stat.count;
    return acc;
  }, {});
};

// Static method to get tickets by user
supportTicketSchema.statics.getUserTickets = function(userId, options = {}) {
  const {
    status,
    category,
    priority,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = options;
  
  const query = { userId };
  
  if (status) query.status = status;
  if (category) query.categoryId = category;
  if (priority) query.priority = priority;
  
  return this.find(query)
    .populate('assignedTo', 'username email')
    .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
