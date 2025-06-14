const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Rate = require('../models/Rate');
const Inventory = require('../models/Inventory');
const auth = require('../middleware/auth');

// Get all orders with date filtering
router.get('/', async (req, res) => {
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
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

    try {
        // Get rate first
        const rate = await Rate.findOne({
            item: req.body.item.trim(),
            type: req.body.type.trim()
        });
        if (!rate) {
            const rates = await Rate.find({});
            const availableItems = rates.map(r => `${r.item} (${r.type})`).join(', ');
            return res.status(400).json({
                message: 'Rate not found for selected item and type',
                details: {
                    availableItems: availableItems,
                    requested: `${req.body.item} (${req.body.type})`
                }
            });
        }

        // Check inventory
        const inventory = await Inventory.findOne({
            item: req.body.item.trim(),
            type: req.body.type.trim()
        });

        if (!inventory || inventory.quantity < req.body.quantity) {
            return res.status(400).json({
                message: 'Insufficient inventory quantity',
                details: {
                    available: inventory?.quantity || 0,
                    required: req.body.quantity
                }
            });
        }

        // Calculate financial values
        const totalAmount = req.body.quantity * rate.rate;
        const paidAmount = Number(req.body.paidAmount) || 0;
        const dueAmount = totalAmount - paidAmount;

        // Create and save order
        const order = new Order({
            ...req.body,
            orderDate: new Date(),
            rate: rate.rate,
            totalAmount: totalAmount,
            paidAmount: paidAmount,
            dueAmount: dueAmount
        });

        try {
            // Save order
            const savedOrder = await order.save();
            
            // Update inventory
            try {
                // Update inventory quantity
                inventory.quantity -= req.body.quantity;
                await inventory.save();
            } catch (invError) {
                console.error('Error updating inventory:', invError);
                throw invError;
            }

            // Return saved order
            res.status(201).json(savedOrder);
        } catch (error) {
            console.error('Error saving order:', error);
            throw error;
        }
    } catch (error) {
        console.error('Error creating order:', error);
        if (error.code === 11000) {
            return res.status(400).json({
                message: 'Duplicate order ID'
            });
        }
        res.status(400).json({
            message: 'Error creating order',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
  } catch (error) {
    console.error('Error creating order:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Duplicate order ID'
      });
    }
    res.status(500).json({
      message: 'Error creating order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update an order
router.put('/:id', async (req, res) => {
  try {
    // If no user, try to authenticate
    if (!req.user) {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
      } catch (jwtError) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update order
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        orderDate: new Date()
      },
      { new: true }
    );

    // Update inventory
    try {
      const inventory = await Inventory.findOne({
        itemName: req.body.item,
        category: req.body.type
      });

      if (inventory) {
        // Calculate quantity difference
        const quantityDiff = req.body.quantity - order.quantity;
        if (quantityDiff > 0 && inventory.quantity >= quantityDiff) {
          inventory.quantity -= quantityDiff;
          await inventory.save();
        } else if (quantityDiff < 0) {
          inventory.quantity += Math.abs(quantityDiff);
          await inventory.save();
        }
      }
    } catch (invError) {
      console.error('Error updating inventory:', invError);
    }

    // Update rate
    try {
      const rate = await Rate.findOne({
        item: req.body.item,
        type: req.body.type
      });

      if (rate) {
        updatedOrder.rate = rate.rate;
        updatedOrder.totalAmount = req.body.quantity * rate.rate;
        await updatedOrder.save();
      }
    } catch (rateError) {
      console.error('Error updating rate:', rateError);
    }

    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({
      message: 'Error updating order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
    try {
      const inventory = await Inventory.findOne({
        itemName: order.item,
        category: order.type
      });

      if (inventory) {
        inventory.quantity += order.quantity;
        await inventory.save();
      }
    } catch (invError) {
      console.error('Error updating inventory:', invError);
    }

    await order.remove();
    res.json({ message: 'Order deleted' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({
      message: 'Error deleting order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;