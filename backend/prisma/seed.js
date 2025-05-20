// prisma/seed.js
const {
  PrismaClient,
  RoleName,
  VehicleType,
  VehicleSize,
  ParkingSlotStatus,
  SlotLocation,
} = require("@prisma/client");
const bcrypt = require("bcrypt");
const { Prisma } = require("@prisma/client"); // Import Prisma for Decimal type
const prisma = new PrismaClient();

async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function main() {
  console.log("Start seeding ...");

  // Clear existing data
  await prisma.log.deleteMany({});
  await prisma.slotRequest.deleteMany({});
  await prisma.parkingSlot.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.role.deleteMany({});
  console.log("Cleared existing data.");

  // --- Create Roles ---
  const adminRole = await prisma.role.create({
    data: { name: RoleName.ADMIN, description: "Administrator" },
  });
  const userRole = await prisma.role.create({
    data: { name: RoleName.USER, description: "Regular user" },
  });
  console.log("Roles created.");

  // --- Create Permissions ---
  const permissionsData = [
    { name: "manage_own_profile", description: "Can update own profile" },
    { name: "manage_own_vehicles", description: "Can manage own vehicles" },
    { name: "list_own_vehicles", description: "Can list own vehicles" },
    { name: "request_parking_slot", description: "Can request a slot" },
    { name: "manage_own_slot_requests", description: "Can manage own requests" },
    { name: "list_own_slot_requests", description: "Can list own requests" },
    { name: "view_available_parking_slots", description: "Can view available slots" },
    { name: "manage_all_users", description: "Can manage all users" },
    { name: "assign_user_roles", description: "Can assign roles" },
    { name: "manage_parking_slots", description: "Can manage all slots" },
    { name: "manage_all_slot_requests", description: "Can manage all requests" },
    { name: "view_all_parking_slots", description: "Can view all slots" },
    { name: "view_audit_logs", description: "Can view audit logs" },
  ];
  const createdPermissions = await Promise.all(
    permissionsData.map((permData) => prisma.permission.create({ data: permData }))
  );
  console.log("Permissions created.");

  // --- Assign Permissions to Roles ---
  for (const permission of createdPermissions) {
    await prisma.rolePermission.create({
      data: { role_id: adminRole.id, permission_id: permission.id },
    });
  }
  const userPermNames = [
    "manage_own_profile", "manage_own_vehicles", "list_own_vehicles",
    "request_parking_slot", "manage_own_slot_requests", "list_own_slot_requests",
    "view_available_parking_slots",
  ];
  for (const permName of userPermNames) {
    const permission = createdPermissions.find((p) => p.name === permName);
    if (permission) {
      await prisma.rolePermission.create({
        data: { role_id: userRole.id, permission_id: permission.id },
      });
    }
  }
  console.log("RolePermissions created.");

  // --- Create Default Users with Balance ---
  const adminPassword = await hashPassword(process.env.ADMIN_DEFAULT_PASSWORD || "$password123");
  await prisma.user.create({
    data: {
      name: "Admin User", email: process.env.ADMIN_DEFAULT_EMAIL || "admin@parkingsystem.com",
      password: adminPassword, role_id: adminRole.id, email_verified: true,
      balance: new Prisma.Decimal(1000.00),
    },
  });
  const regularUserPassword = await hashPassword(process.env.USER_DEFAULT_PASSWORD || "user123");
  await prisma.user.create({
    data: {
      name: "Regular User", email: process.env.USER_DEFAULT_EMAIL || "user@parkingsystem.com",
      password: regularUserPassword, role_id: userRole.id, email_verified: true,
      balance: new Prisma.Decimal(75.50), // User starts with some balance
    },
  });
  console.log("Default users created.");

  // --- Create Sample Parking Slots (ALL WITH A DEFINED cost_per_hour) ---
  const sampleSlotsData = [
    { slot_number: "A01", size: VehicleSize.MEDIUM, vehicle_type: VehicleType.CAR, location: SlotLocation.NORTH_WING, status: ParkingSlotStatus.AVAILABLE, cost_per_hour: new Prisma.Decimal("2.50") },
    { slot_number: "A02", size: VehicleSize.MEDIUM, vehicle_type: VehicleType.CAR, location: SlotLocation.NORTH_WING, status: ParkingSlotStatus.AVAILABLE, cost_per_hour: new Prisma.Decimal("2.50") },
    { slot_number: "A03", size: VehicleSize.LARGE, vehicle_type: VehicleType.CAR, location: SlotLocation.NORTH_WING, status: ParkingSlotStatus.AVAILABLE, cost_per_hour: new Prisma.Decimal("3.00") },
    { slot_number: "A04", size: VehicleSize.MEDIUM, vehicle_type: VehicleType.CAR, location: SlotLocation.NORTH_WING, status: ParkingSlotStatus.UNAVAILABLE, cost_per_hour: new Prisma.Decimal("2.75") },
    { slot_number: "A05", size: VehicleSize.EXTRA_LARGE, vehicle_type: VehicleType.TRUCK, location: SlotLocation.NORTH_WING, status: ParkingSlotStatus.AVAILABLE, cost_per_hour: new Prisma.Decimal("5.50") },

    { slot_number: "B01", size: VehicleSize.SMALL, vehicle_type: VehicleType.MOTORCYCLE, location: SlotLocation.EAST_WING, status: ParkingSlotStatus.AVAILABLE, cost_per_hour: new Prisma.Decimal("1.00") },
    { slot_number: "B02", size: VehicleSize.SMALL, vehicle_type: VehicleType.MOTORCYCLE, location: SlotLocation.EAST_WING, status: ParkingSlotStatus.AVAILABLE, cost_per_hour: new Prisma.Decimal("1.00") },
    { slot_number: "B03", size: VehicleSize.SMALL, vehicle_type: VehicleType.MOTORCYCLE, location: SlotLocation.EAST_WING, status: ParkingSlotStatus.MAINTENANCE, cost_per_hour: new Prisma.Decimal("1.25") },
    // Adding B120 if it was a specific slot number causing issues
    { slot_number: "B120", size: VehicleSize.MEDIUM, vehicle_type: VehicleType.CAR, location: SlotLocation.EAST_WING, status: ParkingSlotStatus.AVAILABLE, cost_per_hour: new Prisma.Decimal("2.60") },


    { slot_number: "C01", size: VehicleSize.LARGE, vehicle_type: VehicleType.TRUCK, location: SlotLocation.SOUTH_WING, status: ParkingSlotStatus.AVAILABLE, cost_per_hour: new Prisma.Decimal("4.75") },
    { slot_number: "C02", size: VehicleSize.LARGE, vehicle_type: VehicleType.TRUCK, location: SlotLocation.SOUTH_WING, status: ParkingSlotStatus.AVAILABLE, cost_per_hour: new Prisma.Decimal("4.75") },

    { slot_number: "D01", size: VehicleSize.SMALL, vehicle_type: VehicleType.BICYCLE, location: SlotLocation.WEST_WING, status: ParkingSlotStatus.AVAILABLE, cost_per_hour: new Prisma.Decimal("0.50") }, // Changed from null
    { slot_number: "D02", size: VehicleSize.SMALL, vehicle_type: VehicleType.CAR, location: SlotLocation.WEST_WING, status: ParkingSlotStatus.AVAILABLE, cost_per_hour: new Prisma.Decimal("2.00") }, // Small car slot
  ];

  // Add more slots to ensure enough variety and quantity
  for (let i = 1; i <= 5; i++) {
    sampleSlotsData.push({
      slot_number: `E${String(i).padStart(2, '0')}`,
      size: VehicleSize.MEDIUM,
      vehicle_type: VehicleType.CAR,
      location: SlotLocation.LEVEL_1,
      status: ParkingSlotStatus.AVAILABLE,
      cost_per_hour: new Prisma.Decimal("2.25")
    });
    sampleSlotsData.push({
      slot_number: `F${String(i).padStart(2, '0')}`,
      size: VehicleSize.LARGE,
      vehicle_type: VehicleType.TRUCK,
      location: SlotLocation.LEVEL_2,
      status: i % 2 === 0 ? ParkingSlotStatus.AVAILABLE : ParkingSlotStatus.UNAVAILABLE, // Mix statuses
      cost_per_hour: new Prisma.Decimal("4.50")
    });
  }


  for (const slotData of sampleSlotsData) {
    await prisma.parkingSlot.create({
      data: {
        slot_number: slotData.slot_number,
        size: slotData.size,
        vehicle_type: slotData.vehicle_type,
        location: slotData.location,
        status: slotData.status,
        cost_per_hour: slotData.cost_per_hour,
      },
    });
  }
  console.log(`Created ${sampleSlotsData.length} sample parking slots.`);

  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });