const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const auth = require('../middleware/auth');

// Get all inventory items
router.get('/', auth, async (req, res) => {
  try {
    console.log('Fetching inventory items...');
    const inventory = await Inventory.find().sort({ createdAt: -1 });
    console.log(`Found ${inventory.length} inventory items`);
    res.json(inventory);
  } catch (error) {
    console.error('Error in GET /inventory:', error);
    res.status(500).json({
      message: 'Error fetching inventory items',
      error: error.message
    });
  }
});

// Get a single inventory item by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const inventory = await Inventory.findById(req.params.id).select('-__v');
    if (!inventory) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }
    res.json(inventory);
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({
      message: 'Error fetching inventory item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create new inventory item
router.post('/', auth, async (req, res) => {
  try {
    console.log('Received inventory creation request:', req.body);
    const { itemName, category, quantity, unitPrice, threshold } = req.body;

    // Validate required fields
    if (!itemName || !category || quantity === undefined || unitPrice === undefined || threshold === undefined) {
      console.log('Missing required fields:', { itemName, category, quantity, unitPrice, threshold });
      return res.status(400).json({
        message: 'All fields are required',
        received: { itemName, category, quantity, unitPrice, threshold }
      });
    }

    // Validate numeric fields
    if (isNaN(quantity) || isNaN(unitPrice) || isNaN(threshold)) {
      console.log('Invalid numeric values:', { quantity, unitPrice, threshold });
      return res.status(400).json({
        message: 'Quantity, unit price, and threshold must be valid numbers',
        received: { quantity, unitPrice, threshold }
      });
    }

    if (quantity < 0 || unitPrice < 0 || threshold < 0) {
      console.log('Negative values not allowed:', { quantity, unitPrice, threshold });
      return res.status(400).json({
        message: 'Quantity, unit price, and threshold must be non-negative numbers',
        received: { quantity, unitPrice, threshold }
      });
    }

    // Check if item with same name and category exists
    const existingItem = await Inventory.findOne({
      itemName: itemName.trim(),
      category: category.trim()
    });

    let savedInventory;

    if (existingItem) {
      // Update existing item's quantity
      console.log('Found existing item, updating quantity');
      existingItem.quantity += Number(quantity);
      // Update other fields if they're different
      if (existingItem.unitPrice !== Number(unitPrice)) {
        existingItem.unitPrice = Number(unitPrice);
      }
      if (existingItem.threshold !== Number(threshold)) {
        existingItem.threshold = Number(threshold);
      }
      savedInventory = await existingItem.save();
      console.log('Updated existing item:', savedInventory);
    } else {
      // Create new inventory item
      const inventory = new Inventory({
        itemName: itemName.trim(),
        category: category.trim(),
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
        threshold: Number(threshold)
      });

      console.log('Creating new inventory item:', inventory);
      savedInventory = await inventory.save();
      console.log('Successfully saved new inventory item:', savedInventory);
    }

    res.status(201).json(savedInventory);
  } catch (error) {
    console.error('Error in POST /inventory:', error);

    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    if (error.code === 11000) {
      console.error('Duplicate key error:', error);
      return res.status(400).json({
        message: 'An item with this name and category already exists',
        error: error.message
      });
    }

    // Log the full error for debugging
    console.error('Full error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    });

    res.status(500).json({
      message: 'Error creating inventory item',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        code: error.code,
        stack: error.stack
      } : undefined
    });
  }
});

// Update inventory item
router.put('/:id', auth, async (req, res) => {
  try {
    console.log('Received inventory update request for ID:', req.params.id);
    const { itemName, category, quantity, unitPrice, threshold } = req.body;

    // Validate required fields
    if (!itemName || !category || quantity === undefined || unitPrice === undefined || threshold === undefined) {
      console.log('Missing required fields:', { itemName, category, quantity, unitPrice, threshold });
      return res.status(400).json({
        message: 'All fields are required',
        received: { itemName, category, quantity, unitPrice, threshold }
      });
    }

    // Validate numeric fields
    if (isNaN(quantity) || isNaN(unitPrice) || isNaN(threshold)) {
      console.log('Invalid numeric values:', { quantity, unitPrice, threshold });
      return res.status(400).json({
        message: 'Quantity, unit price, and threshold must be valid numbers',
        received: { quantity, unitPrice, threshold }
      });
    }

    if (quantity < 0 || unitPrice < 0 || threshold < 0) {
      console.log('Negative values not allowed:', { quantity, unitPrice, threshold });
      return res.status(400).json({
        message: 'Quantity, unit price, and threshold must be non-negative numbers',
        received: { quantity, unitPrice, threshold }
      });
    }

    const inventory = await Inventory.findByIdAndUpdate(
      req.params.id,
      {
        itemName: itemName.trim(),
        category: category.trim(),
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
        threshold: Number(threshold)
      },
      { new: true, runValidators: true }
    );

    if (!inventory) {
      console.log('Inventory item not found:', req.params.id);
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    console.log('Successfully updated inventory item:', inventory);
    res.json(inventory);
  } catch (error) {
    console.error('Error in PUT /inventory:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({
      message: 'Error updating inventory item',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        code: error.code,
        stack: error.stack
      } : undefined
    });
  }
});

// Delete inventory item
router.delete('/:id', auth, async (req, res) => {
  try {
    console.log('Received inventory delete request for ID:', req.params.id);
    const inventory = await Inventory.findByIdAndDelete(req.params.id);

    if (!inventory) {
      console.log('Inventory item not found:', req.params.id);
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    console.log('Successfully deleted inventory item:', inventory);
    res.json({ message: 'Inventory item deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /inventory:', error);
    res.status(500).json({
      message: 'Error deleting inventory item',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        code: error.code,
        stack: error.stack
      } : undefined
    });
  }
});

module.exports = router; 