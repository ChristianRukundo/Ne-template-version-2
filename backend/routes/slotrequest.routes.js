// routes/slotrequest.routes.js
const express = require("express");
const router = express.Router();
const slotRequestController = require("../controllers/slotrequest.controller");
const {
  authenticateToken,
  checkRole,
  checkPermission,
  checkAnyPermission,
} = require("../middleware/auth");
const { RoleName } = require("@prisma/client");

router.use(authenticateToken);

// User routes for their own requests
router.post(
  "/",
  checkPermission("request_parking_slot"),
  slotRequestController.createSlotRequest
);
router.put(
  "/:id",
  checkPermission("manage_own_slot_requests"),
  slotRequestController.updateMySlotRequest
); // User can update/cancel their PENDING request

// Listing requests:
// Users see their own, Admins see all. Controller handles role-based filtering.
router.get(
  "/",
  checkAnyPermission(["list_own_slot_requests", "manage_all_slot_requests"]),
  slotRequestController.listSlotRequests
);

// Admin routes for managing all requests
router.patch(
  "/:id/resolve",
  checkRole(RoleName.ADMIN),
  checkPermission("manage_all_slot_requests"),
  slotRequestController.resolveSlotRequest
);

//  Ticket Download Route(accessible by owner of the request or an admin)
router.get('/:id/ticket/download',
  checkAnyPermission(['manage_own_slot_requests', 'manage_all_slot_requests', 'list_own_slot_requests']), // User should have at least one of these
  slotRequestController.downloadTicketPdf
);

module.exports = router;
