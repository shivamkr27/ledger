const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Rate = require('../models/Rate');
const Inventory = require('../models/Inventory');
const auth = require('../middleware/auth');

// Get all orders with date filtering
router.get('/', auth, async (req, res) => {
  try {
    console.log('Received orders request with query:', req.query);

    const query = {};

    // Handle date filtering
    if (req.query.startDate && req.query.endDate) {
      query.orderDate = {
        $gte: new Date(req.query.startDate),
        $lt: new Date(req.query.endDate)
      };
    }

    console.log('Query:', query);

    const orders = await Order.find(query).sort({ orderDate: -1 });
    console.log(`Found ${orders.length} orders`);

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      message: 'Error fetching orders',
      error: error.message
    });
  }
});

// Create a new order
router.post('/', auth, async (req, res) => {
  try {
    console.log('Received order creation request:', req.body);

    // Validate required fields
    const requiredFields = ['customerName', 'customerNumber', 'item', 'type', 'quantity', 'paidAmount', 'deliveryStatus', 'deliveryDateTime'];
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return res.status(400).json({
        message: 'Missing required fields',
        errors: missingFields.map(field => `${field} is required`)
      });
    }

    // Validate numeric fields
    if (isNaN(req.body.quantity) || req.body.quantity <= 0) {
      return res.status(400).json({
        message: 'Invalid quantity',
        errors: ['Quantity must be a positive number']
      });
    }

    if (isNaN(req.body.paidAmount) || req.body.paidAmount < 0) {
      return res.status(400).json({
        message: 'Invalid paid amount',
        errors: ['Paid amount must be a non-negative number']
      });
    }

    // Get rate from rates collection
    const rate = await Rate.findOne({
      item: req.body.item.trim(),
      type: req.body.type.trim()
    });

    if (!rate) {
      return res.status(400).json({
        message: 'Rate not found',
        errors: [`No rate found for item "${req.body.item}" and type "${req.body.type}"`]
      });
    }

    // Check inventory availability
    const inventory = await Inventory.findOne({
      itemName: req.body.item.trim(),
      category: req.body.type.trim()
    });

    if (!inventory) {
      return res.status(400).json({
        message: 'Inventory not found',
        errors: [`No inventory found for item "${req.body.item}" and category "${req.body.type}"`]
      });
    }

    if (inventory.quantity < req.body.quantity) {
      return res.status(400).json({
        message: 'Insufficient inventory',
        errors: [`Not enough stock. Available: ${inventory.quantity}, Requested: ${req.body.quantity}`]
      });
    }

    // Calculate amounts
    const totalAmount = rate.rate * req.body.quantity;
    const dueAmount = totalAmount - req.body.paidAmount;

    // Create order
    const order = new Order({
      customerName: req.body.customerName.trim(),
      customerNumber: req.body.customerNumber.trim(),
      item: req.body.item.trim(),
      type: req.body.type.trim(),
      quantity: req.body.quantity,
      rate: rate.rate,
      totalAmount,
      paidAmount: req.body.paidAmount,
      dueAmount,
      deliveryStatus: req.body.deliveryStatus,
      deliveryDateTime: new Date(req.body.deliveryDateTime),
      orderDate: new Date()
    });

    // Save order
    const savedOrder = await order.save();
    console.log('Order saved successfully:', savedOrder);

    // Update inventory
    inventory.quantity -= req.body.quantity;
    await inventory.save();
    console.log('Inventory updated:', inventory);

    res.status(201).json(savedOrder);
  } catch (error) {
    console.error('Error creating order:', error);

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        message: 'Validation error',
        errors: validationErrors
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Duplicate order ID',
        errors: ['An order with this ID already exists']
      });
    }

    res.status(500).json({
      message: 'Error creating order',
      errors: [error.message]
    });
  }
});

// Update an order
router.put('/:id', auth, async (req, res) => {
  try {
    const { item, type, quantity } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Get rate from rates collection
    const rate = await Rate.findOne({ item, type });
    if (!rate) {
      return res.status(400).json({ message: 'Rate not found for the selected item and type' });
    }

    // Check inventory
    const inventory = await Inventory.findOne({ item, type });
    if (!inventory) {
      return res.status(400).json({ message: 'Inventory not found for the selected item and type' });
    }

    // Calculate quantity difference
    const quantityDiff = quantity - order.quantity;
    if (inventory.quantity < quantityDiff) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    // Calculate amounts
    const totalAmount = quantity * rate.rate;
    const paidAmount = req.body.paidAmount || 0;
    const dueAmount = totalAmount - paidAmount;

    // Update order
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        rate: rate.rate,
        totalAmount,
        paidAmount,
        dueAmount
      },
      { new: true }
    );

    // Update inventory
    inventory.quantity -= quantityDiff;
    await inventory.save();

    res.json(updatedOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete an order
router.delete('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update inventory
    const inventory = await Inventory.findOne({ item: order.item, type: order.type });
    if (inventory) {
      inventory.quantity += order.quantity;
      await inventory.save();
    }

    await order.remove();
    res.json({ message: 'Order deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 