const express = require('express');
const router = express.Router();
const Wholesaler = require('../models/Wholesaler');
const auth = require('../middleware/auth');

// Get all wholesaler transactions
router.get('/', auth, async (req, res) => {
  try {
    const transactions = await Wholesaler.find().sort({ date: -1 });
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching wholesaler transactions:', error);
    res.status(500).json({ message: 'Error fetching wholesaler transactions' });
  }
});

// Add new wholesaler transaction
router.post('/', auth, async (req, res) => {
  try {
    const transaction = new Wholesaler(req.body);
    await transaction.save();
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating wholesaler transaction:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error creating wholesaler transaction' });
  }
});

// Update wholesaler transaction
router.put('/:id', auth, async (req, res) => {
  try {
    const transaction = await Wholesaler.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (error) {
    console.error('Error updating wholesaler transaction:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error updating wholesaler transaction' });
  }
});

// Delete wholesaler transaction
router.delete('/:id', auth, async (req, res) => {
  try {
    const transaction = await Wholesaler.findByIdAndDelete(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting wholesaler transaction:', error);
    res.status(500).json({ message: 'Error deleting wholesaler transaction' });
  }
});

module.exports = router; 