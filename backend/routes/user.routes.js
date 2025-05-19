// routes/user.routes.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { authenticateToken, checkPermission } = require("../middleware/auth");

// All routes under /api/users require authentication
router.use(authenticateToken);

// Authenticated user can update their own profile
// The /auth/me route is for GETTING profile details including permissions
router.put(
  "/profile",
  checkPermission("manage_own_profile"),
  userController.updateUserProfile
);

// Placeholder for other user-specific routes like listing their vehicles or requests
// router.get('/vehicles', checkPermission('list_own_vehicles'), vehicleController.listMyVehicles);
// router.get('/slot-requests', checkPermission('list_own_slot_requests'), slotRequestController.listMySlotRequests);

module.exports = router;
