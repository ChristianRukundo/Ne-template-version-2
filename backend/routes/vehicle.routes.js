// routes/vehicle.routes.js
const express = require("express");
const router = express.Router();
const vehicleController = require("../controllers/vehicle.controller");
const { authenticateToken, checkPermission } = require("../middleware/auth");

// All vehicle routes require authentication
router.use(authenticateToken);

// User managing their own vehicles
router.post(
  "/",
  checkPermission("manage_own_vehicles"),
  vehicleController.addVehicle
);
router.get(
  "/",
  checkPermission("list_own_vehicles"),
  vehicleController.listMyVehicles
); // List user's own vehicles
router.get(
  "/:id",
  checkPermission("manage_own_vehicles"),
  vehicleController.getMyVehicleById
); // manage_own_vehicles often implies read too
router.put(
  "/:id",
  checkPermission("manage_own_vehicles"),
  vehicleController.updateMyVehicle
);
router.delete(
  "/:id",
  checkPermission("manage_own_vehicles"),
  vehicleController.deleteMyVehicle
);

module.exports = router;
