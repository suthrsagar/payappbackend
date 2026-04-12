const User = require('../models/User');
const Transaction = require('../models/Transaction');
const jwt = require('jsonwebtoken');

// Admin Login
exports.adminLogin = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Get Dashboard Stats
exports.getStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalTransactions = await Transaction.countDocuments();
        
        const totalMoneyResult = await Transaction.aggregate([
            { $match: { status: "success" } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);

        res.json({
            totalUsers,
            totalTransactions,
            totalMoney: totalMoneyResult[0]?.total || 0
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Get All Users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ role: 'user' }).select('-password -pin');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Get Withdraw Requests
exports.getWithdrawRequests = async (req, res) => {
    try {
        const requests = await Transaction.find({ type: 'withdraw', status: 'pending' })
            .populate('fromUser', 'name email walletId')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Handle Withdraw Status (Accept/Reject)
exports.handleWithdrawRequest = async (req, res) => {
    const { transactionId, status } = req.body; // status: 'success' or 'rejected'
    try {
        const txn = await Transaction.findById(transactionId);
        if (!txn || txn.status !== 'pending') {
            return res.status(400).json({ message: 'Request already processed or invalid' });
        }

        if (status === 'rejected') {
            // Refund the user
            const user = await User.findById(txn.fromUser);
            if (user) {
                user.balance += txn.amount;
                await user.save();
            }
            txn.status = 'rejected';
        } else {
            txn.status = 'success';
        }

        await txn.save();
        res.json({ message: `Request ${status} successfully` });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Get All Transactions
exports.getAllTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find()
            .populate('fromUser', 'name walletId')
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
                fromUser: doc.fromUser?.name || doc.fromUser?.walletId || doc.fromUser?.toString() || 'N/A',
                toUser: doc.toUser?.name || doc.toUser?.walletId || doc.toUser?.toString() || 'Admin/System'
            };
        });
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
