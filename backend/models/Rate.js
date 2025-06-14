const mongoose = require('mongoose');

const rateSchema = new mongoose.Schema({
  item: {
    type: String,
    required: [true, 'Item is required'],
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Type is required'],
    trim: true
  },
  rate: {
    type: Number,
    required: [true, 'Rate is required'],
    min: [0, 'Rate cannot be negative']
  }
}, {
  timestamps: true
});

// Create the model
const Rate = mongoose.model('Rate', rateSchema);

module.exports = Rate; 