const mongoose = require('mongoose');
const Rate = require('./models/Rate');
const Inventory = require('./models/Inventory');
require('dotenv').config();

const initialRates = [
  { item: 'Cement', type: 'Prism', rate: 350 },
  { item: 'Cement', type: 'DSP', rate: 340 },
  { item: 'Cement', type: 'Birla', rate: 360 },
  { item: 'Cement', type: 'Concreto', rate: 370 },
  { item: 'Sand', type: 'Fine', rate: 1200 },
  { item: 'Sand', type: 'Coarse', rate: 1100 },
  { item: 'Sand', type: 'River', rate: 1300 },
  { item: 'Steel Rod', type: '8mm', rate: 65 },
  { item: 'Steel Rod', type: '10mm', rate: 70 },
  { item: 'Steel Rod', type: '12mm', rate: 75 },
  { item: 'Steel Rod', type: '16mm', rate: 80 }
];

const initialInventory = [
  { item: 'Cement', type: 'Prism', quantity: 100, threshold: 10 },
  { item: 'Cement', type: 'DSP', quantity: 100, threshold: 10 },
  { item: 'Cement', type: 'Birla', quantity: 100, threshold: 10 },
  { item: 'Cement', type: 'Concreto', quantity: 100, threshold: 10 },
  { item: 'Sand', type: 'Fine', quantity: 50, threshold: 5 },
  { item: 'Sand', type: 'Coarse', quantity: 50, threshold: 5 },
  { item: 'Sand', type: 'River', quantity: 50, threshold: 5 },
  { item: 'Steel Rod', type: '8mm', quantity: 200, threshold: 20 },
  { item: 'Steel Rod', type: '10mm', quantity: 200, threshold: 20 },
  { item: 'Steel Rod', type: '12mm', quantity: 200, threshold: 20 },
  { item: 'Steel Rod', type: '16mm', quantity: 200, threshold: 20 }
];

async function seed() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vyapaal', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Clear existing data
    await Rate.deleteMany({});
    await Inventory.deleteMany({});
    console.log('Cleared existing data');

    // Insert rates
    await Rate.insertMany(initialRates);
    console.log('Inserted rates');

    // Insert inventory
    await Inventory.insertMany(initialInventory);
    console.log('Inserted inventory');

    console.log('Seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seed(); 