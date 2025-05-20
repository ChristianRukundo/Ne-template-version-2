// routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth');

// Public routes for staff
router.post('/register', authController.registerStaff);
router.post('/verify-email', authController.verifyEmail);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected route for staff
router.get('/me', authenticateToken, authController.getCurrentUser);
// Note: Profile update for staff (firstName, lastName, password) would be in a user.controller.js or admin.controller.js

module.exports = router;