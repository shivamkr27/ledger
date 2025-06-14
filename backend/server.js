const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const rateRoutes = require('./routes/rates');
const inventoryRoutes = require('./routes/inventory');
const ledgerRoutes = require('./routes/ledger');
const wholesalerRoutes = require('./routes/wholesaler');
const staffRoutes = require('./routes/staff');
const findRoutes = require('./routes/find');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500', 'http://127.0.0.1:5500', 'null'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// MongoDB connection with retry logic
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vyapaal';
    console.log('Attempting to connect to MongoDB...');

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      retryWrites: true,
      retryReads: true,
      family: 4  // Force IPv4
    });

    console.log('Successfully connected to MongoDB');

    // Create indexes
    try {
      const Rate = require('./models/Rate');

      // Try to drop existing index first
      try {
        await Rate.collection.dropIndex("item_1_type_1");
      } catch (err) {
        if (err.codeName !== "IndexNotFound") {
          console.error("Error dropping index:", err);
        }
      }

      // Create new index
      await Rate.collection.createIndex(
        { item: 1, type: 1 },
        {
          unique: true,
          background: true,
          name: 'item_type_unique'
        }
      );
      console.log('Successfully created Rate indexes');
    } catch (indexError) {
      console.log('Index creation skipped:', indexError.message);
    }

    // Handle MongoDB connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected. Attempting to reconnect...');
      setTimeout(connectDB, 5000);
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected successfully');
    });

  } catch (err) {
    console.error('MongoDB connection error:', err);
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

// Connect to MongoDB
connectDB();

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/rates', rateRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/wholesaler', wholesalerRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/find', findRoutes);

// Protected route for testing authentication
app.get('/api/protected', require('./middleware/auth'), (req, res) => {
  res.json({ message: 'Protected route accessed successfully' });
});

// 404 handler
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  console.error('Stack:', err.stack);

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Token expired'
    });
  }

  // Default error response
  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// Function to find an available port
const findAvailablePort = async (startPort) => {
  const net = require('net');

  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(findAvailablePort(startPort + 1));
      } else {
        reject(err);
      }
    });

    server.listen(startPort, () => {
      server.close(() => {
        resolve(startPort);
      });
    });
  });
};

// Start server with port fallback
const startServer = async () => {
  try {
    const desiredPort = process.env.PORT || 5000;
    const port = await findAvailablePort(desiredPort);

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
      console.log('Environment:', process.env.NODE_ENV || 'development');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 