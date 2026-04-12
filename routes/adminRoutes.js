const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminMiddleware = require('../middleware/adminMiddleware');

// Public routes
router.post('/login', adminController.adminLogin);

// Protected routes (Admin only)
router.get('/stats', adminMiddleware, adminController.getStats);
router.get('/users', adminMiddleware, adminController.getAllUsers);
router.get('/transactions', adminMiddleware, adminController.getAllTransactions);
router.get('/requests/withdraw', adminMiddleware, adminController.getWithdrawRequests);
router.post('/handle-withdraw', adminMiddleware, adminController.handleWithdrawRequest);
router.post('/send-cashback', adminMiddleware, adminController.sendCashback);

module.exports = router;
