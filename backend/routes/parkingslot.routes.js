// routes/parkingslot.routes.js
const express = require("express");
const router = express.Router();
const parkingSlotController = require("../controllers/parkingslot.controller");
const {
  authenticateToken,
  checkRole,
  checkPermission,
  checkAnyPermission,
} = require("../middleware/auth");
const { RoleName } = require("@prisma/client");

// All slot routes require authentication
router.use(authenticateToken);

// Admin-only routes for creating, updating, deleting, and bulk creating slots
router.post(
  "/",
  checkRole(RoleName.ADMIN),
  checkPermission("manage_parking_slots"),
  parkingSlotController.createParkingSlot
);
router.post(
  "/bulk",
  checkRole(RoleName.ADMIN),
  checkPermission("manage_parking_slots"),
  parkingSlotController.bulkCreateParkingSlots
);
router.put(
  "/:id",
  checkRole(RoleName.ADMIN),
  checkPermission("manage_parking_slots"),
  parkingSlotController.updateParkingSlot
);
router.delete(
  "/:id",
  checkRole(RoleName.ADMIN),
  checkPermission("manage_parking_slots"),
  parkingSlotController.deleteParkingSlot
);

// Listing slots: Accessible by both ADMIN (all slots) and USER (available slots)
// The controller `listParkingSlots` handles role-based filtering internally.
router.get(
  "/",
  checkAnyPermission([
    "view_all_parking_slots",
    "view_available_parking_slots",
  ]),
  parkingSlotController.listParkingSlots
);

// Getting a specific slot: Accessible by both, controller has some logic for USER visibility
router.get(
  "/:id",
  checkAnyPermission([
    "view_all_parking_slots",
    "view_available_parking_slots",
  ]),
  parkingSlotController.getParkingSlotById
);

module.exports = router;
