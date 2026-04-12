const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const registerUser = async (req, res) => {
    console.log("--- Register Attempt Start ---");
    const { name, email, password, pin } = req.body;
    
    try {
        if (!name || !email || !password || !pin) {
            return res.status(400).json({ message: 'All fields including PIN are required' });
        }

        if (pin.length !== 6) {
            return res.status(400).json({ message: 'PIN must be exactly 6 digits' });
        }

        const lowerEmail = email.trim().toLowerCase();
        const userExists = await User.findOne({ email: lowerEmail });
        if (userExists) return res.status(400).json({ message: 'User already exists' });

        let cleanName = name.toLowerCase().replace(/\s+/g, '');
        let walletId = `${cleanName}@SagarPe`;
        
        let existingWallet = await User.findOne({ walletId });
        let counter = 1;
        while (existingWallet) {
            walletId = `${cleanName}${counter}@SagarPe`;
            existingWallet = await User.findOne({ walletId });
            counter++;
        }

        console.log("Hashing password and PIN...");
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const hashedPin = await bcrypt.hash(pin.toString(), salt);

        const user = await User.create({
            name,
            email: lowerEmail,
            password: hashedPassword,
            pin: pin,
            walletId,
            balance: 1000
        });

        return res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            walletId: user.walletId,
            balance: user.balance,
            token: generateToken(user._id)
        });

    } catch (error) {
        console.error("CRITICAL REGISTRATION ERROR:", error);
        return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const lowerEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: lowerEmail });

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        return res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            walletId: user.walletId,
            balance: user.balance,
            token: generateToken(user._id)
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports = { registerUser, loginUser };
