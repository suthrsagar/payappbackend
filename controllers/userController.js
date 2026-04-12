const User = require('../models/User');
const bcrypt = require('bcryptjs');

const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            res.json({
                name: user.name,
                walletId: user.walletId,
                balance: user.balance,
                hasPin: !!user.pin
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const setPin = async (req, res) => {
    const { pin } = req.body;
    try {
        if (!pin || pin.length !== 6 || isNaN(pin)) {
            return res.status(400).json({ message: 'PIN must be exactly 6 digits' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPin = await bcrypt.hash(pin.toString(), salt);

        const user = await User.findById(req.user._id);
        user.pin = hashedPin;
        await user.save();

        res.json({ message: 'PIN set successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const verifyPinAndGetBalance = async (req, res) => {
    const { pin } = req.body;
    try {
        const user = await User.findById(req.user._id);
        if (!user.pin) return res.status(400).json({ message: 'PIN not set' });

        if (pin === user.pin) {
            res.json({ balance: user.balance });
        } else {
            res.status(401).json({ message: 'Incorrect PIN' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getUserProfile, setPin, verifyPinAndGetBalance };
