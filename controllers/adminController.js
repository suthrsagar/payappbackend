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
        const totalUsers = await User.countDocuments({ role: 'user' });
        const totalTransactions = await Transaction.countDocuments();
        
        // Withdrawal specific stats
        const totalWithdrawals = await Transaction.countDocuments({ type: 'withdraw' });
        const approvedWithdrawals = await Transaction.countDocuments({ type: 'withdraw', status: 'success' });
        const rejectedWithdrawals = await Transaction.countDocuments({ type: 'withdraw', status: 'rejected' });
        const pendingWithdrawals = await Transaction.countDocuments({ type: 'withdraw', status: 'pending' });

        const totalMoneyResult = await Transaction.aggregate([
            { $match: { status: "success", type: { $ne: "withdraw" } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);

        res.json({
            totalUsers,
            totalTransactions,
            totalMoney: totalMoneyResult[0]?.total || 0,
            withdrawStats: {
                total: totalWithdrawals,
                approved: approvedWithdrawals,
                rejected: rejectedWithdrawals,
                pending: pendingWithdrawals
            }
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

// Send Cashback to specific user
exports.sendCashback = async (req, res) => {
    const { userId, amount } = req.body;
    try {
        if (!userId || !amount) return res.status(400).json({ message: 'Missing data' });

        // RATE LIMIT: Check if a cashback was sent to this user in the last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const lastCashback = await Transaction.findOne({
            toUser: userId,
            type: 'cashback',
            createdAt: { $gt: fiveMinutesAgo }
        });

        if (lastCashback) {
            return res.status(400).json({ 
                message: 'One gift already sent! Please wait 5 minutes before sending another to the same user.' 
            });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.balance += parseFloat(amount);
        user.hasUnreadReward = true; // Trigger popup for user
        await user.save();

        await Transaction.create({
            fromUser: null,
            toUser: userId,
            amount: parseFloat(amount),
            type: 'cashback',
            status: 'success',
            transactionRef: 'Gift from Admin'
        });

        res.json({ message: `Success! ₹${amount} gift sent.`, balance: user.balance });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get Withdraw Requests
exports.getWithdrawRequests = async (req, res) => {
    const { status } = req.query; // optional: 'success', 'rejected', 'pending'
    try {
        let query = { type: 'withdraw' };
        if (status) query.status = status;
        else query.status = 'pending'; // default

        const requests = await Transaction.find(query)
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

// Toggle User Ban Status
exports.toggleUserStatus = async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.status = user.status === 'banned' ? 'active' : 'banned';
        await user.save();

        res.json({ message: `User ${user.status === 'banned' ? 'banned' : 'unbanned'} successfully`, status: user.status });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete User
exports.deleteUser = async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await User.findByIdAndDelete(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Optionally delete associated transactions
        await Transaction.deleteMany({ $or: [{ fromUser: userId }, { toUser: userId }] });

        res.json({ message: 'User and their data deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = exports;
