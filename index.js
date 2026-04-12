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
    res.send('new SagarPe API is running...');
});

const PORT = process.env.PORT || 5000;

const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('MongoDB Connected');

        // Auto-promote sutharsagar710@gmail.com to Admin
        try {
            await User.findOneAndUpdate(
                { email: 'sutharsagar710@gmail.com' },
                { role: 'admin' }
            );
            console.log('Admin check completed: sutharsagar710@gmail.com is Admin');

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
