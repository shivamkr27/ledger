const express = require('express');
const router = express.Router();
const Rate = require('../models/Rate');
const auth = require('../middleware/auth');

// Get all rates
router.get('/', auth, async (req, res) => {
  try {
    const rates = await Rate.find().sort({ item: 1, type: 1 });
    res.json(rates);
  } catch (error) {
    console.error('Error fetching rates:', error);
    res.status(500).json({
      message: 'Error fetching rates',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create a new rate
router.post('/', auth, async (req, res) => {
  try {
    console.log('Received rate creation request:', req.body);
    const { item, type, rate } = req.body;

    // Validate required fields
    if (!item || !type || rate === undefined) {
      console.log('Missing required fields:', { item, type, rate });
      return res.status(400).json({
        message: 'Missing required fields',
        required: ['item', 'type', 'rate']
      });
    }

    // Validate rate is non-negative
    if (rate < 0) {
      console.log('Invalid rate value:', rate);
      return res.status(400).json({
        message: 'Rate must be a non-negative number'
      });
    }

    // Check if rate already exists
    const existingRate = await Rate.findOne({
      item: item.trim(),
      type: type.trim()
    });

    let savedRate;
    if (existingRate) {
      // Update existing rate
      console.log('Found existing rate, updating value');
      existingRate.rate = Number(rate);
      savedRate = await existingRate.save();
      console.log('Updated existing rate:', savedRate);
    } else {
      // Create new rate
      const newRate = new Rate({
        item: item.trim(),
        type: type.trim(),
        rate: Number(rate)
      });
      console.log('Creating new rate:', newRate);
      savedRate = await newRate.save();
      console.log('Successfully saved new rate:', savedRate);
    }

    res.status(201).json(savedRate);
  } catch (error) {
    console.error('Error creating rate:', error);

    if (error.code === 11000) {
      res.status(400).json({
        message: 'Rate already exists for this item and type'
      });
    } else if (error.name === 'ValidationError') {
      res.status(400).json({
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    } else {
      res.status(500).json({
        message: 'Error creating rate',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
});

// Update a rate
router.put('/:id', auth, async (req, res) => {
  try {
    const { item, type, rate } = req.body;

    // Validate rate is non-negative if provided
    if (rate !== undefined && rate < 0) {
      return res.status(400).json({
        message: 'Rate must be a non-negative number'
      });
    }

    const updatedRate = await Rate.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!updatedRate) {
      return res.status(404).json({ message: 'Rate not found' });
    }

    res.json(updatedRate);
  } catch (error) {
    console.error('Error updating rate:', error);
    if (error.code === 11000) {
      res.status(400).json({
        message: 'Rate already exists for this item and type'
      });
    } else if (error.name === 'ValidationError') {
      res.status(400).json({
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    } else {
      res.status(500).json({
        message: 'Error updating rate',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
});

// Delete a rate
router.delete('/:id', auth, async (req, res) => {
  try {
    const rate = await Rate.findByIdAndDelete(req.params.id);
    if (!rate) {
      return res.status(404).json({ message: 'Rate not found' });
    }
    res.json({
      message: 'Rate deleted successfully',
      deletedRate: rate
    });
  } catch (error) {
    console.error('Error deleting rate:', error);
    res.status(500).json({
      message: 'Error deleting rate',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 