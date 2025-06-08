const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  threshold: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['In Stock', 'Low Stock', 'Out of Stock'],
    default: 'In Stock'
  },
  dateAdded: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update status based on quantity and threshold
inventorySchema.pre('save', function (next) {
  if (this.quantity <= 0) {
    this.status = 'Out of Stock';
  } else if (this.quantity <= this.threshold) {
    this.status = 'Low Stock';
  } else {
    this.status = 'In Stock';
  }
  next();
});

// Drop any existing indexes
inventorySchema.indexes().forEach(index => {
  inventorySchema.index(index[0], { unique: false });
});

// Ensure virtuals are included when converting to JSON
inventorySchema.set('toJSON', { virtuals: true });
inventorySchema.set('toObject', { virtuals: true });

// Create the model
const Inventory = mongoose.model('Inventory', inventorySchema);

// Drop the problematic index
Inventory.collection.dropIndex('item_1_type_1', function (err) {
  if (err) {
    console.log('Error dropping index:', err);
  } else {
    console.log('Successfully dropped problematic index');
  }
});

module.exports = Inventory; 