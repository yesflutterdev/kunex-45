const mongoose = require('mongoose');

// Database connection configuration with performance optimizations
const connectDB = async () => {
  try {
    const options = {
      // Connection pooling for better performance
      maxPoolSize: 10, // Maximum number of connections in the pool
      minPoolSize: 2,  // Minimum number of connections in the pool
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      
      // Write concern for better performance
      w: 'majority',
      wtimeoutMS: 5000,
      
      // Read preference for better performance
      readPreference: 'secondaryPreferred',
      
      // Connection timeout
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      
      // Buffer settings
      bufferCommands: false, // Disable mongoose buffering
      
      // Performance monitoring
      monitorCommands: true,
      
      // Compression
      compressors: ['zlib'],
      zlibCompressionLevel: 6,
      
      // SSL settings (if needed)
      ssl: process.env.MONGODB_SSL === 'true',
      
      // Authentication
      auth: {
        username: process.env.MONGODB_USERNAME,
        password: process.env.MONGODB_PASSWORD
      },
      authSource: process.env.MONGODB_AUTH_SOURCE || 'admin'
    };

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, options);
    
    console.log('✅ Connected to MongoDB with optimized settings');
    
    // Set up performance monitoring
    setupPerformanceMonitoring();
    
    // Set up connection event handlers
    setupConnectionHandlers();
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Performance monitoring setup
const setupPerformanceMonitoring = () => {
  // Monitor query performance
  mongoose.set('debug', process.env.NODE_ENV === 'development');
  
  // Track slow queries
  const slowQueryThreshold = 100; // milliseconds
  
  mongoose.connection.on('query', (query) => {
    const startTime = Date.now();
    
    query.on('end', () => {
      const duration = Date.now() - startTime;
      
      if (duration > slowQueryThreshold) {
        console.warn(`🐌 Slow query detected (${duration}ms):`, {
          operation: query.op,
          collection: query.collection,
          duration,
          query: query.query
        });
      }
    });
  });
  
  // Monitor connection pool
  setInterval(async () => {
    try {
      const poolStatus = await mongoose.connection.db.admin().command({ serverStatus: 1 });
      console.log('📊 Connection pool status:', poolStatus);
    } catch (error) {
      console.error('Error getting pool status:', error);
    }
  }, 60000); // Log every minute
};

// Connection event handlers
const setupConnectionHandlers = () => {
  mongoose.connection.on('connected', () => {
    console.log('🟢 MongoDB connected');
  });
  
  mongoose.connection.on('error', (err) => {
    console.error('🔴 MongoDB connection error:', err);
  });
  
  mongoose.connection.on('disconnected', () => {
    console.log('🟡 MongoDB disconnected');
  });
  
  mongoose.connection.on('reconnected', () => {
    console.log('🟢 MongoDB reconnected');
  });
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('📴 MongoDB connection closed through app termination');
    process.exit(0);
  });
};

// Get database stats for monitoring
const getDBStats = async () => {
  try {
    const stats = await mongoose.connection.db.stats();
    return {
      collections: stats.collections,
      dataSize: stats.dataSize,
      storageSize: stats.storageSize,
      indexes: stats.indexes,
      indexSize: stats.indexSize
    };
  } catch (error) {
    console.error('Error getting DB stats:', error);
    return null;
  }
};

// Health check function
const healthCheck = async () => {
  try {
    await mongoose.connection.db.admin().ping();
    return { status: 'healthy', timestamp: new Date() };
  } catch (error) {
    return { status: 'unhealthy', error: error.message, timestamp: new Date() };
  }
};

module.exports = {
  connectDB,
  getDBStats,
  healthCheck
};

