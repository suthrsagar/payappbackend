const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Send Money
const sendMoney = async (req, res) => {
    const { toWalletId, amount, pin } = req.body;
    try {
        const fromUser = await User.findById(req.user._id);
        const toUser = await User.findOne({ walletId: toWalletId.trim() });

        if (!toUser) return res.status(404).json({ message: 'Recipient not found' });
        if (fromUser.balance < amount) return res.status(400).json({ message: 'Insufficient balance' });
        
        // Strict string comparison
        if (pin.toString() !== fromUser.pin.toString()) {
            return res.status(400).json({ message: 'Invalid PIN' });
        }
        
        if (fromUser.walletId === toWalletId) return res.status(400).json({ message: 'Cannot send money to yourself' });

        // Update balances
        fromUser.balance -= amount;
        toUser.balance += amount;

        await fromUser.save();
        await toUser.save();

        // Create transaction records
        await Transaction.create({
            fromUser: fromUser._id,
            toUser: toUser._id,
            amount,
            type: 'sent',
            status: 'success'
        });

        await Transaction.create({
            fromUser: toUser._id,
            toUser: fromUser._id,
            amount,
            type: 'received',
            status: 'success'
        });

        res.json({ message: 'Transaction successful', balance: fromUser.balance });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get History
const getHistory = async (req, res) => {
    try {
        const transactions = await Transaction.find({ fromUser: req.user._id })
            .populate('toUser', 'name walletId')
            .sort({ createdAt: -1 });
        
        const history = transactions.map(t => {
            const doc = t.toObject();
            return {
                _id: doc._id.toString(),
                amount: doc.amount,
                type: doc.type,
                status: doc.status,
                createdAt: doc.createdAt,
                displayType: doc.type,
                // Ensure otherUser is always a plain string
                otherUser: doc.toUser?.name || doc.toUser?.walletId || 'SagarPe Admin',
                fromUser: doc.fromUser ? doc.fromUser.toString() : 'system',
                toUser: doc.toUser?._id?.toString() || 'system'
            };
        });

        res.json(history);
    } catch (error) {
        console.error('getHistory error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Request Withdrawal
const requestWithdraw = async (req, res) => {
    const { amount, upiId, pin } = req.body;
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        if (user.pin.toString() !== pin.toString()) {
            return res.status(400).json({ message: 'Invalid PIN' });
        }
        if (user.balance < amount) return res.status(400).json({ message: 'Insufficient balance' });

        // Deduct balance immediately
        user.balance -= amount;
        await user.save();

        const transaction = await Transaction.create({
            fromUser: user._id,
            amount,
            type: 'withdraw',
            status: 'pending',
            upiId: upiId.trim()
        });

        res.json({ message: 'Withdrawal request submitted', transactionId: transaction._id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Request Add Money
const requestAddMoney = async (req, res) => {
    const { amount } = req.body;
    try {
        const transaction = await Transaction.create({
            fromUser: req.user._id,
            amount,
            type: 'add-money',
            status: 'pending'
        });
        res.json({ message: 'Add money request submitted', transactionId: transaction._id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { sendMoney, getHistory, requestWithdraw, requestAddMoney };
