const express = require('express');
const { getUserProfile, setPin, verifyPinAndGetBalance } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/profile', protect, getUserProfile);
router.post('/set-pin', protect, setPin);
router.post('/verify-pin', protect, verifyPinAndGetBalance);

module.exports = router;
