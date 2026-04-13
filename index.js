const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/transaction', require('./routes/transactionRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

app.get('/', (req, res) => {
    res.send('SagarPe API is running...');
});

const PORT = process.env.PORT || 5000;

const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('MongoDB Connected');

        // Auto-promote sutharsagar710@gmail.com to Admin & Fix missing walletIds
        try {
            await User.findOneAndUpdate(
                { email: 'sutharsagar710@gmail.com' },
                { role: 'admin' }
            );
            console.log('Admin check completed');

            // Find users missing walletId and fix them
            const usersToFix = await User.find({ $or: [{ walletId: { $exists: false } }, { walletId: '' }, { walletId: null }] });
            for (const u of usersToFix) {
                const cleanName = u.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
                u.walletId = `${cleanName}${Math.floor(1000 + Math.random() * 9000)}@SagarPe`;
                await u.save();
                console.log(`Fixed walletId for user: ${u.email} -> ${u.walletId}`);
            }

            // Fix for "username_1" duplicate key error
            const collection = mongoose.connection.collection('users');
            const indexes = await collection.indexes();
            const hasUsernameIndex = indexes.some(idx => idx.name === 'username_1');
            if (hasUsernameIndex) {
                await collection.dropIndex('username_1');
                console.log('Successfully dropped legacy username index');
            }
        } catch (adminErr) {
            console.log('Startup cleanup error:', adminErr.message);
        }

        app.listen(PORT, () => console.log(`New Server running on port ${PORT}`));
    })
    .catch(err => console.log(err));
