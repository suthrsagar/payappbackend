const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const promoteToAdmin = async (email) => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const user = await User.findOneAndUpdate(
            { email },
            { role: 'admin' },
            { new: true }
        );

        if (user) {
            console.log(`Success! ${email} is now an ADMIN.`);
        } else {
            console.log('User not found. Please register this email in the app first.');
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

promoteToAdmin('sutharsagar710@gmail.com');
