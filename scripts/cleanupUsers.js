const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Transaction = require('../models/Transaction');

const cleanup = async () => {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected!');

        const adminEmail = 'sutharsagar710@gmail.com';

        // 1. Delete all transactions
        console.log('Deleting all transactions...');
        await Transaction.deleteMany({});

        // 2. Delete all users except admin
        console.log(`Deleting all users except ${adminEmail}...`);
        const result = await User.deleteMany({ email: { $ne: adminEmail } });

        console.log(`Success! Removed ${result.deletedCount} users.`);
        console.log('Cleanup Complete! 🧼');
        process.exit(0);
    } catch (error) {
        console.error('Cleanup Failed:', error);
        process.exit(1);
    }
};

cleanup();
