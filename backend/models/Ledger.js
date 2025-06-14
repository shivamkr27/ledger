const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  item: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true
  },
  unitPrice: {
    type: Number,
    required: true
  },
  orderDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  payment: {
    type: Number,
    required: true
  }
});

const ledgerSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  orders: [orderSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
ledgerSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for total amount
ledgerSchema.virtual('totalAmount').get(function () {
  return this.orders.reduce((total, order) => {
    return total + (order.quantity * order.unitPrice);
  }, 0);
});

// Virtual for total paid
ledgerSchema.virtual('totalPaid').get(function () {
  return this.orders.reduce((total, order) => {
    return total + order.payment;
  }, 0);
});

// Virtual for due amount
ledgerSchema.virtual('dueAmount').get(function () {
  return this.totalAmount - this.totalPaid;
});

// Ensure virtuals are included when converting to JSON
ledgerSchema.set('toJSON', { virtuals: true });
ledgerSchema.set('toObject', { virtuals: true });

const Ledger = mongoose.model('Ledger', ledgerSchema);

module.exports = Ledger; 