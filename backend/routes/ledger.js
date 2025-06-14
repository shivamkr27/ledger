const express = require('express');
const router = express.Router();
const Ledger = require('../models/Ledger');
const auth = require('../middleware/auth');

// Get all ledger entries
router.get('/', auth, async (req, res) => {
  try {
    const ledgers = await Ledger.find().sort({ customerName: 1 });
    res.json(ledgers);
  } catch (error) {
    console.error('Error fetching ledgers:', error);
    res.status(500).json({
      message: 'Error fetching ledgers',
      error: error.message
    });
  }
});

// Get a specific customer's ledger
router.get('/:customerNumber', auth, async (req, res) => {
  try {
    const ledger = await Ledger.findOne({ customerNumber: req.params.customerNumber });
    if (!ledger) {
      return res.status(404).json({
        message: 'Ledger not found for this customer'
      });
    }
    res.json(ledger);
  } catch (error) {
    console.error('Error fetching ledger:', error);
    res.status(500).json({
      message: 'Error fetching ledger',
      error: error.message
    });
  }
});

// Add a new order to a customer's ledger or create a new ledger
router.post('/', auth, async (req, res) => {
  try {
    const { customerName, customerNumber, item, quantity, unitPrice, orderDate, payment } = req.body;

    // Validate required fields
    if (!customerName || !customerNumber || !item || !quantity || !unitPrice || !payment) {
      return res.status(400).json({
        message: 'Missing required fields',
        errors: ['All fields are required']
      });
    }

    // Create new order object
    const newOrder = {
      item,
      quantity: Number(quantity),
      unitPrice: Number(unitPrice),
      orderDate: orderDate ? new Date(orderDate) : new Date(),
      payment: Number(payment)
    };

    // Find existing ledger or create new one
    let ledger = await Ledger.findOne({ customerNumber });

    if (ledger) {
      // Add order to existing ledger
      ledger.orders.push(newOrder);
    } else {
      // Create new ledger
      ledger = new Ledger({
        customerName,
        customerNumber,
        orders: [newOrder]
      });
    }

    await ledger.save();
    res.status(201).json(ledger);
  } catch (error) {
    console.error('Error creating/updating ledger:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Customer number already exists',
        errors: ['This customer number is already registered']
      });
    }
    res.status(500).json({
      message: 'Error creating/updating ledger',
      error: error.message
    });
  }
});

// Update a specific order in a customer's ledger
router.put('/:customerNumber/:orderId', auth, async (req, res) => {
  try {
    const { item, quantity, unitPrice, orderDate, payment } = req.body;
    const { customerNumber, orderId } = req.params;

    // Validate required fields
    if (!item || !quantity || !unitPrice || !payment) {
      return res.status(400).json({
        message: 'Missing required fields',
        errors: ['All fields are required']
      });
    }

    const ledger = await Ledger.findOne({ customerNumber });
    if (!ledger) {
      return res.status(404).json({
        message: 'Ledger not found for this customer'
      });
    }

    // Find and update the specific order
    const order = ledger.orders.id(orderId);
    if (!order) {
      return res.status(404).json({
        message: 'Order not found'
      });
    }

    // Update order fields
    order.item = item;
    order.quantity = Number(quantity);
    order.unitPrice = Number(unitPrice);
    order.orderDate = orderDate ? new Date(orderDate) : order.orderDate;
    order.payment = Number(payment);

    await ledger.save();
    res.json(ledger);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({
      message: 'Error updating order',
      error: error.message
    });
  }
});

// Delete a specific order from a customer's ledger
router.delete('/:customerNumber/:orderId', auth, async (req, res) => {
  try {
    const { customerNumber, orderId } = req.params;

    const ledger = await Ledger.findOne({ customerNumber });
    if (!ledger) {
      return res.status(404).json({
        message: 'Ledger not found for this customer'
      });
    }

    // Remove the specific order
    ledger.orders.pull(orderId);

    // If no orders remain, delete the entire ledger
    if (ledger.orders.length === 0) {
      await Ledger.deleteOne({ customerNumber });
      return res.json({ message: 'Ledger deleted as it had no orders' });
    }

    await ledger.save();
    res.json(ledger);
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({
      message: 'Error deleting order',
      error: error.message
    });
  }
});

module.exports = router; 