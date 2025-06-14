const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Rate = require('../models/Rate');
const Inventory = require('../models/Inventory');
const Ledger = require('../models/Ledger');
const Wholesaler = require('../models/Wholesaler');
const Staff = require('../models/Staff');
const auth = require('../middleware/auth');

// Search across all modules
router.get('/:term', auth, async (req, res) => {
  try {
    const searchTerm = req.params.term;
    const regex = new RegExp(searchTerm, 'i');

    // Search in Orders
    const orders = await Order.find({
      $or: [
        { orderId: regex },
        { customerName: regex },
        { customerNumber: regex },
        { item: regex },
        { type: regex }
      ]
    }).limit(5);

    // Search in Rates
    const rates = await Rate.find({
      $or: [
        { item: regex },
        { type: regex }
      ]
    }).limit(5);

    // Search in Inventory
    const inventory = await Inventory.find({
      $or: [
        { itemName: regex },
        { category: regex }
      ]
    }).limit(5);

    // Search in Ledger
    const ledgers = await Ledger.find({
      $or: [
        { customerName: regex },
        { customerNumber: regex }
      ]
    }).limit(5);

    // Search in Wholesaler
    const wholesalers = await Wholesaler.find({
      $or: [
        { wholesalerName: regex },
        { billNo: regex },
        { item: regex }
      ]
    }).limit(5);

    // Search in Staff
    const staff = await Staff.find({
      $or: [
        { staffName: regex },
        { staffId: regex },
        { role: regex }
      ]
    }).limit(5);

    // Format results
    const results = {
      orders: orders.map(order => ({
        id: order._id,
        type: 'Order',
        title: `Order ${order.orderId}`,
        details: {
          'Customer': order.customerName,
          'Item': order.item,
          'Quantity': order.quantity,
          'Total Amount': `₹${order.totalAmount.toFixed(2)}`
        }
      })),
      rates: rates.map(rate => ({
        id: rate._id,
        type: 'Rate',
        title: `${rate.item} (${rate.type})`,
        details: {
          'Rate': `₹${rate.rate.toFixed(2)}`
        }
      })),
      inventory: inventory.map(item => ({
        id: item._id,
        type: 'Inventory',
        title: item.itemName,
        details: {
          'Category': item.category,
          'Quantity': item.quantity,
          'Unit Price': `₹${item.unitPrice.toFixed(2)}`,
          'Status': item.status
        }
      })),
      ledgers: ledgers.map(ledger => ({
        id: ledger._id,
        type: 'Ledger',
        title: ledger.customerName,
        details: {
          'Customer Number': ledger.customerNumber,
          'Total Amount': `₹${ledger.totalAmount.toFixed(2)}`,
          'Due Amount': `₹${ledger.dueAmount.toFixed(2)}`
        }
      })),
      wholesalers: wholesalers.map(wholesaler => ({
        id: wholesaler._id,
        type: 'Wholesaler',
        title: wholesaler.wholesalerName,
        details: {
          'Bill No': wholesaler.billNo,
          'Item': wholesaler.item,
          'Total': `₹${wholesaler.total.toFixed(2)}`,
          'Due': `₹${wholesaler.due.toFixed(2)}`
        }
      })),
      staff: staff.map(member => ({
        id: member._id,
        type: 'Staff',
        title: member.staffName,
        details: {
          'Staff ID': member.staffId,
          'Role': member.role,
          'Contact': member.contactNumber
        }
      }))
    };

    res.json(results);
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ message: 'Error performing search' });
  }
});

module.exports = router; 