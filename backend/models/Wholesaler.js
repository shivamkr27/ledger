const mongoose = require('mongoose');

const wholesalerSchema = new mongoose.Schema({
  wholesalerName: {
    type: String,
    required: true,
    trim: true
  },
  billNo: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  item: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  paid: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: true
});

// Virtual for total amount
wholesalerSchema.virtual('total').get(function () {
  return this.quantity * this.rate;
});

// Virtual for due amount
wholesalerSchema.virtual('due').get(function () {
  return this.total - this.paid;
});

// Ensure virtuals are included in JSON output
wholesalerSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.total = doc.total;
    ret.due = doc.due;
    return ret;
  }
});

module.exports = mongoose.model('Wholesaler', wholesalerSchema); 