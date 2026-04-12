const User = require('../models/User');
const Transaction = require('../models/Transaction');
const bcrypt = require('bcryptjs');

const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            res.json({
                name: user.name,
                walletId: user.walletId,
                balance: user.balance,
                hasPin: !!user.pin,
                hasUnreadReward: user.hasUnreadReward
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const setPin = async (req, res) => {
    const { pin, oldPin } = req.body;
    try {
        if (!pin || pin.toString().length !== 6 || isNaN(pin)) {
            return res.status(400).json({ message: 'New PIN must be exactly 6 digits' });
        }

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Logic: if oldPin matches, fee is 0. Else fee is 15.
        const isOldPinCorrect = user.pin && oldPin && user.pin.toString() === oldPin.toString();
        const FEE = isOldPinCorrect ? 0 : 15;

        // Check if user has enough balance if it's a reset (FEE > 0)
        if (FEE > 0 && user.balance < FEE) {
            return res.status(400).json({ message: `Forgot PIN? Reset requires ₹${FEE} fee. Your balance is too low.` });
        }

        // Deduct fee and update PIN
        user.balance -= FEE;
        user.pin = pin.toString();
        await user.save();

        // Create a transaction record only if a fee was charged
        if (FEE > 0) {
            await Transaction.create({
                fromUser: user._id,
                toUser: null,
                amount: FEE,
                type: 'sent',
                status: 'success',
                transactionRef: 'PIN Reset Fee'
            });
        }

        const msg = isOldPinCorrect 
            ? 'PIN changed successfully (Free of charge).' 
            : `PIN reset successfully. ₹${FEE} deducted from balance.`;

        res.json({ message: msg, balance: user.balance });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const verifyPinAndGetBalance = async (req, res) => {
    const { pin } = req.body;
    try {
        const user = await User.findById(req.user._id);
        if (!user.pin) return res.status(400).json({ message: 'PIN not set' });

        // Force string comparison
        if (pin.toString() === user.pin.toString()) {
            res.json({ balance: user.balance });
        } else {
            res.status(401).json({ message: 'Incorrect PIN' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Mark reward as seen
const claimReward = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.hasUnreadReward = false;
        await user.save();
        
        // Return updated user data to keep frontend in sync
        res.json({ 
            message: 'Reward claimed', 
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                walletId: user.walletId,
                balance: user.balance,
                hasUnreadReward: user.hasUnreadReward
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getUserProfile, setPin, verifyPinAndGetBalance, claimReward };
