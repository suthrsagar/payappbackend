const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Can be null for admin add-money
    adminWalletId: { type: String }, // Fallback for admin
    amount: { type: Number, required: true },
    type: { type: String, enum: ['sent', 'received', 'add-money', 'withdraw', 'cashback'], required: true },
    status: { type: String, enum: ['success', 'pending', 'failed', 'rejected'], default: 'success' },
    upiId: { type: String }, // For PhonePe/UPI ID in withdrawals
    transactionRef: { type: String }, // For UTR/Reference numbers
    cashback: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
