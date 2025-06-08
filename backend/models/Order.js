const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerNumber: {
    type: String,
    required: true,
    trim: true
  },
  item: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paidAmount: {
    type: Number,
    required: true,
    min: 0
  },
  dueAmount: {
    type: Number,
    required: true,
    min: 0
  },
  deliveryStatus: {
    type: String,
    required: true,
    enum: ['Delivered', 'Scheduled']
  },
  deliveryDateTime: {
    type: Date,
    required: true
  },
  orderDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Generate orderId before validation
orderSchema.pre('validate', async function (next) {
  try {
    if (!this.orderId) {
      const today = new Date();
      const dateStr = today.getFullYear().toString().slice(-2) +
        (today.getMonth() + 1).toString().padStart(2, '0') +
        today.getDate().toString().padStart(2, '0');

      // Find the count of orders for today
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      const count = await this.constructor.countDocuments({
        orderDate: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      });

      // Generate orderId in format YYMMDD-XXX
      this.orderId = `${dateStr}-${(count + 1).toString().padStart(3, '0')}`;
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Handle post-save errors
orderSchema.post('save', function (error, doc, next) {
  if (error.name === 'ValidationError') {
    next(new Error(Object.values(error.errors).map(err => err.message).join(', ')));
  } else if (error.code === 11000) {
    next(new Error('An order with this ID already exists'));
  } else {
    next(error);
  }
});

// Add error handling for find operations
orderSchema.post('find', function (error, doc, next) {
  if (error) {
    console.error('Error in find operation:', error);
    next(error);
  } else {
    next();
  }
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order; 