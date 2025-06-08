const mongoose = require('mongoose');

const rateSchema = new mongoose.Schema({
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
  rate: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: true
});

// Drop any existing indexes
rateSchema.index({ item: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Rate', rateSchema); 