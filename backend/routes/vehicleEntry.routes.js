// routes/vehicleEntry.routes.js
const express = require('express');
const router = express.Router();
const vehicleEntryController = require('../controllers/vehicleEntry.controller');
const { authenticateToken, checkRole, checkPermission, checkAnyPermission } = require('../middleware/auth');
const { RoleName } = require('@prisma/client');

// All routes in this file require authentication


// Routes for Parking Attendants (and Admins who can also perform these)
router.post('/enter', authenticateToken,
    checkAnyPermission(['record_vehicle_entry']), // Attendants or Admins with this permission
    vehicleEntryController.recordVehicleEntry
);

router.get('/:entryId/entry-ticket',
    // checkAnyPermission(['generate_entry_ticket', 'view_all_vehicle_entries']), // Attendant can generate for recent, Admin can view any
    vehicleEntryController.downloadEntryTicket
);


// --- Routes for Vehicle Exit ---
router.post('/:vehicleEntryId/exit',  // Changed to POST or PATCH for an action
    authenticateToken,
    checkAnyPermission(['record_vehicle_exit']),
    vehicleEntryController.recordVehicleExit
);

router.get('/:entryId/exit-bill',
    vehicleEntryController.downloadExitBill // No authenticateToken or permission checks
);
router.get('/',
    authenticateToken,
    checkAnyPermission(['view_current_parked_vehicles', 'view_all_vehicle_entries']), // Permissions
    vehicleEntryController.listVehicleEntries
);


module.exports = router;