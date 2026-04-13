const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    walletId: { type: String, required: true, unique: true },
    balance: { type: Number, default: 100 },
    pin: { type: String }, // Plain text 6-digit PIN
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    hasUnreadReward: { type: Boolean, default: true }, // Every new user gets initial reward
    status: { type: String, enum: ['active', 'banned'], default: 'active' }
}, { timestamps: true });

userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
