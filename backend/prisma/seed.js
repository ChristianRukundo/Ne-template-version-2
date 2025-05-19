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

  // Clear existing data (ensure correct order for foreign keys)
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
    data: {
      name: RoleName.ADMIN,
      description: "Administrator with full access",
    },
  });
  const userRole = await prisma.role.create({
    data: {
      name: RoleName.USER,
      description: "Regular user with vehicle and slot management access",
    },
  });
  console.log("Roles created.");

  // --- Create Permissions --- (permissionsData remains the same as before)
  const permissionsData = [
    { name: "manage_own_profile", description: "Can update their own profile" },
    {
      name: "manage_own_vehicles",
      description: "Can add, update, delete their own vehicles",
    },
    { name: "list_own_vehicles", description: "Can list their own vehicles" },
    {
      name: "request_parking_slot",
      description: "Can request a parking slot for their vehicle",
    },
    {
      name: "manage_own_slot_requests",
      description: "Can update or cancel their pending slot requests",
    },
    {
      name: "list_own_slot_requests",
      description: "Can list their own slot requests",
    },
    {
      name: "view_available_parking_slots",
      description: "Can view available parking slots",
    },
    {
      name: "manage_all_users",
      description: "Can create, read, update, delete all users",
    },
    { name: "assign_user_roles", description: "Can assign roles to users" },
    {
      name: "manage_parking_slots",
      description:
        "Can create, read, update, delete parking slots (including bulk)",
    },
    {
      name: "manage_all_slot_requests",
      description: "Can approve or reject any slot request",
    },
    {
      name: "view_all_parking_slots",
      description: "Can view all parking slots regardless of status",
    },
    { name: "view_audit_logs", description: "Can view system audit logs" },
  ];
  const createdPermissions = await Promise.all(
    permissionsData.map((permData) =>
      prisma.permission.create({ data: permData })
    )
  );
  console.log("Permissions created.");

  // --- Assign Permissions to Roles --- (logic remains the same)
  for (const permission of createdPermissions) {
    await prisma.rolePermission.create({
      data: { role_id: adminRole.id, permission_id: permission.id },
    });
  }
  const userPermNames = [
    "manage_own_profile",
    "manage_own_vehicles",
    "list_own_vehicles",
    "request_parking_slot",
    "manage_own_slot_requests",
    "list_own_slot_requests",
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

  // --- Create Default Admin User (with some balance for testing if needed) ---
  const adminPassword = await hashPassword(
    process.env.ADMIN_DEFAULT_PASSWORD || "admin123"
  );
  await prisma.user.create({
    data: {
      name: "Admin User",
      email: process.env.ADMIN_DEFAULT_EMAIL || "admin@parkingsystem.com",
      password: adminPassword,
      role_id: adminRole.id,
      email_verified: true,
      balance: new Prisma.Decimal(1000.0), // Give admin some balance
    },
  });
  console.log("Default admin user created.");

  // --- Create Default Regular User (with starting balance) ---
  const regularUserPassword = await hashPassword(
    process.env.USER_DEFAULT_PASSWORD || "user123"
  );
  await prisma.user.create({
    data: {
      name: "Regular User",
      email: process.env.USER_DEFAULT_EMAIL || "user@parkingsystem.com",
      password: regularUserPassword,
      role_id: userRole.id,
      email_verified: true,
      balance: new Prisma.Decimal(50.0), // Give regular user a starting balance
    },
  });
  console.log("Default regular user created.");

  // --- Create Sample Parking Slots (with cost_per_hour) ---
  const sampleSlotsData = [
    {
      slot_number: "A01",
      size: VehicleSize.MEDIUM,
      vehicle_type: VehicleType.CAR,
      location: SlotLocation.NORTH_WING,
      status: ParkingSlotStatus.AVAILABLE,
      cost_per_hour: new Prisma.Decimal(2.5),
    },
    {
      slot_number: "A02",
      size: VehicleSize.MEDIUM,
      vehicle_type: VehicleType.CAR,
      location: SlotLocation.NORTH_WING,
      status: ParkingSlotStatus.AVAILABLE,
      cost_per_hour: new Prisma.Decimal(2.5),
    },
    {
      slot_number: "A03",
      size: VehicleSize.LARGE,
      vehicle_type: VehicleType.CAR,
      location: SlotLocation.NORTH_WING,
      status: ParkingSlotStatus.AVAILABLE,
      cost_per_hour: new Prisma.Decimal(3.0),
    },
    {
      slot_number: "A04",
      size: VehicleSize.MEDIUM,
      vehicle_type: VehicleType.CAR,
      location: SlotLocation.NORTH_WING,
      status: ParkingSlotStatus.UNAVAILABLE,
      cost_per_hour: new Prisma.Decimal(2.5),
    }, // Was unavailable
    {
      slot_number: "B01",
      size: VehicleSize.SMALL,
      vehicle_type: VehicleType.MOTORCYCLE,
      location: SlotLocation.EAST_WING,
      status: ParkingSlotStatus.AVAILABLE,
      cost_per_hour: new Prisma.Decimal(1.0),
    },
    {
      slot_number: "B02",
      size: VehicleSize.SMALL,
      vehicle_type: VehicleType.MOTORCYCLE,
      location: SlotLocation.EAST_WING,
      status: ParkingSlotStatus.MAINTENANCE,
      cost_per_hour: new Prisma.Decimal(1.0),
    }, // Was maintenance
    {
      slot_number: "C01",
      size: VehicleSize.LARGE,
      vehicle_type: VehicleType.TRUCK,
      location: SlotLocation.SOUTH_WING,
      status: ParkingSlotStatus.AVAILABLE,
      cost_per_hour: new Prisma.Decimal(5.0),
    },
    {
      slot_number: "D01",
      size: VehicleSize.SMALL,
      vehicle_type: VehicleType.BICYCLE,
      location: SlotLocation.WEST_WING,
      status: ParkingSlotStatus.AVAILABLE,
      cost_per_hour: null,
    }, // Example of a free slot
  ];

  for (const slotData of sampleSlotsData) {
    await prisma.parkingSlot.create({
      data: {
        slot_number: slotData.slot_number,
        size: slotData.size,
        vehicle_type: slotData.vehicle_type,
        location: slotData.location,
        status: slotData.status,
        cost_per_hour: slotData.cost_per_hour, // Add cost
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
