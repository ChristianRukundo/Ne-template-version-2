const express = require('express');
const router = express.Router();
const parkingController = require('../controllers/parking.controller');
const { authenticateToken, checkRole, checkPermission, checkAnyPermission } = require('../middleware/auth');
const { RoleName } = require('@prisma/client');

// ALL routes below this will require a valid token.
router.use(authenticateToken);

// --- Parking Listing Routes (accessible by Admin or Attendant with specific permissions) ---

// For displaying ALL details of ALL parkings (e.g., Admin table, Attendant overview page)
router.get('/',
    checkAnyPermission(['manage_parkings', 'view_all_parkings_details']),
    parkingController.getAllParkingFacilities
);

// For populating selection dropdowns (e.g., for Attendant vehicle entry form)
router.get('/selectable',
    checkAnyPermission(['list_selectable_parkings', 'manage_parkings']), // Admin with manage_parkings can also use this
    parkingController.getSelectableParkingFacilities
);

// --- ADMIN ONLY Parking Management CRUD Operations ---
// These require the user to specifically be an ADMIN AND have 'manage_parkings' permission.

router.post('/',
    checkRole(RoleName.ADMIN), // 1. Must be ADMIN
    checkPermission('manage_parkings'), // 2. Must have this permission
    parkingController.createParkingFacility
);

router.get('/:id', // Getting a specific parking by ID (could be for Admin edit form)
    checkRole(RoleName.ADMIN),
    checkPermission('manage_parkings'),
    parkingController.getParkingFacilityById
);

router.put('/:id',
    checkRole(RoleName.ADMIN),
    checkPermission('manage_parkings'),
    parkingController.updateParkingFacility
);

router.delete('/:id',
    checkRole(RoleName.ADMIN),
    checkPermission('manage_parkings'),
    parkingController.deleteParkingFacility
);

module.exports = router;