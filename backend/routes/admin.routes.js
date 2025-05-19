// routes/admin.routes.js
const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const {
  authenticateToken,
  checkRole,
  checkPermission,
} = require("../middleware/auth");
const { RoleName } = require("@prisma/client"); // For RoleName.ADMIN

// All routes in this file are for Admins and require authentication + ADMIN role
router.use(authenticateToken);
router.use(checkRole(RoleName.ADMIN)); // Ensures only Admins can access these

// User Management by Admin
router.get(
  "/users",
  checkPermission("manage_all_users"),
  adminController.getAllUsers
);
router.post(
  "/users",
  checkPermission("manage_all_users"),
  adminController.createUser
);
router.get(
  "/users/:id",
  checkPermission("manage_all_users"),
  adminController.getUserById
);
router.put(
  "/users/:id",
  checkPermission("manage_all_users"),
  adminController.updateUser
); // 'manage_all_users' often implies ability to assign roles
router.delete(
  "/users/:id",
  checkPermission("manage_all_users"),
  adminController.deleteUser
);


router.get("/roles", adminController.getAllRoles); // No specific permission needed beyond ADMIN role
router.get("/permissions", adminController.getAllPermissions); // No specific permission needed beyond ADMIN role
router.get('/logs', checkPermission('view_audit_logs'), adminController.getAuditLogs); 


module.exports = router;
