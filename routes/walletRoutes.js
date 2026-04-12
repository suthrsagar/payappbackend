const express = require('express');
const { requestAddMoney } = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/add-money-request', protect, requestAddMoney);

module.exports = router;
