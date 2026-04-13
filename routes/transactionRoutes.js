const express = require('express');
const { sendMoney, getHistory, requestWithdraw } = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/send', protect, sendMoney);
router.post('/scan-pay', protect, sendMoney);
router.get('/history/:walletId', protect, getHistory);
router.post('/request-withdraw', protect, requestWithdraw);
router.post('/add-money-request', protect, require('../controllers/transactionController').requestAddMoney);

module.exports = router;
