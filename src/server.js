const mongoose = require('mongoose');
const app = require('./app');

// Load environment variables
require('dotenv').config();

// Connect to MongoDB
if (process.env.VERCEL !== '1') {
  // Only connect to MongoDB and start server if not running in Vercel
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('Connected to MongoDB');
      // Start server
      const PORT = process.env.PORT || 3000;
      const server = app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`Port ${PORT} is already in use, trying ${PORT + 1}`);
          app.listen(PORT + 1, () => {
            console.log(`Server running on port ${PORT + 1}`);
          });
        } else {
          console.error('Server error:', err);
        }
      });
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err);
      process.exit(1);
    });
} else {
  // For Vercel serverless, connect to MongoDB without starting server
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('Connected to MongoDB in serverless environment');
    })
    .catch((err) => {
      console.error('MongoDB connection error in serverless environment:', err);
    });
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

// Export for Vercel serverless
module.exports = app;