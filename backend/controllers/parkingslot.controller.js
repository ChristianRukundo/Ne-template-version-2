// controllers/parkingslot.controller.js
const prisma = require("../config/database");
const {
  VehicleSize,
  VehicleType,
  ParkingSlotStatus,
  SlotLocation,
  RoleName
} = require("@prisma/client");

/**
 * (Admin) Create a new parking slot.
 */
const createParkingSlot = async (req, res) => {
  try {
    const {
      slot_number,
      size,
      vehicle_type,
      location,
      cost_per_hour,
      status = ParkingSlotStatus.AVAILABLE,
    } = req.body;
    const adminUserId = req.user.user_id;

    // --- Validation ---
    if (!slot_number || !size || !vehicle_type) {
      return res
        .status(400)
        .json({ message: "Slot number, size, and vehicle type are required." });
    }
    if (!/^[A-Z0-9-]{2,10}$/i.test(slot_number)) {
      // Example validation
      return res.status(400).json({ message: "Invalid slot number format." });
    }
    if (!Object.values(VehicleSize).includes(size.toUpperCase())) {
      return res
        .status(400)
        .json({
          message: `Invalid size. Valid are: ${Object.values(VehicleSize).join(
            ", "
          )}`,
        });
    }
    if (!Object.values(VehicleType).includes(vehicle_type.toUpperCase())) {
      return res
        .status(400)
        .json({
          message: `Invalid vehicle_type. Valid are: ${Object.values(
            VehicleType
          ).join(", ")}`,
        });
    }
    if (
      location &&
      !Object.values(SlotLocation).includes(location.toUpperCase())
    ) {
      return res
        .status(400)
        .json({
          message: `Invalid location. Valid are: ${Object.values(
            SlotLocation
          ).join(", ")}`,
        });
    }
    if (
      status &&
      !Object.values(ParkingSlotStatus).includes(status.toUpperCase())
    ) {
      return res
        .status(400)
        .json({
          message: `Invalid status. Valid are: ${Object.values(
            ParkingSlotStatus
          ).join(", ")}`,
        });
    }

    const existingSlot = await prisma.parkingSlot.findUnique({
      where: { slot_number: slot_number.toUpperCase() },
    });
    if (existingSlot) {
      return res.status(400).json({ message: "Slot number already exists." });
    }

    const newSlot = await prisma.parkingSlot.create({
      data: {
        slot_number: slot_number.toUpperCase(),
        size: size.toUpperCase(),
        vehicle_type: vehicle_type.toUpperCase(),
        location: location ? location.toUpperCase() : null,
        status: status.toUpperCase(),
        cost_per_hour: cost_per_hour || null,
      },
    });



    res
      .status(201)
      .json({ message: "Parking slot created successfully", slot: newSlot });
  } catch (error) {
    console.error("Create parking slot error:", error);
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ message: "Slot number already exists (concurrent request)." });
    }
    res.status(500).json({ message: "Server error creating parking slot" });
  }
};

/**
 * (Admin & User) List parking slots.
 * Admins see all slots. Users see only AVAILABLE slots by default unless specified.
 * Supports pagination, search, and filtering.
 */
const listParkingSlots = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "", // Search by slot_number
      sortBy = "slot_number",
      order = "asc",
      status, // Filter by ParkingSlotStatus string
      size, // Filter by VehicleSize string
      vehicle_type, // Filter by VehicleType string
      location, // Filter by SlotLocation string
      showAll, // Admin flag to show all, users default to available
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    // User role specific filtering: default to available unless admin requests all
    const isAdmin = req.user.role_name === RoleName.ADMIN;
    if (
      !isAdmin &&
      !(showAll === "true" && status === ParkingSlotStatus.AVAILABLE)
    ) {
      // Ensure users can only filter by AVAILABLE if they try to use showAll
      where.status = ParkingSlotStatus.AVAILABLE;
    } else if (isAdmin && showAll === "true") {
      // Admin sees all if showAll=true, otherwise applies status filter if present
      if (
        status &&
        Object.values(ParkingSlotStatus).includes(status.toUpperCase())
      ) {
        where.status = status.toUpperCase();
      }
    } else if (
      status &&
      Object.values(ParkingSlotStatus).includes(status.toUpperCase())
    ) {
      where.status = status.toUpperCase();
    }

    if (search) {
      where.slot_number = { contains: search, mode: "insensitive" };
    }
    if (size && Object.values(VehicleSize).includes(size.toUpperCase())) {
      where.size = size.toUpperCase();
    }
    if (
      vehicle_type &&
      Object.values(VehicleType).includes(vehicle_type.toUpperCase())
    ) {
      where.vehicle_type = vehicle_type.toUpperCase();
    }
    if (
      location &&
      Object.values(SlotLocation).includes(location.toUpperCase())
    ) {
      where.location = location.toUpperCase();
    }

    const orderByOptions = {};
    if (
      [
        "slot_number",
        "size",
        "vehicle_type",
        "status",
        "location",
        "created_at",
      ].includes(sortBy)
    ) {
      orderByOptions[sortBy] = order.toLowerCase() === "asc" ? "asc" : "desc";
    } else {
      orderByOptions.slot_number = "asc";
    }

    const slots = await prisma.parkingSlot.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: orderByOptions,
    });

    const totalSlots = await prisma.parkingSlot.count({ where });

    res.status(200).json({
      data: slots,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalSlots / limitNum),
        totalItems: totalSlots,
        itemsPerPage: limitNum,
      },
    });
  } catch (error) {
    console.error("List parking slots error:", error);
    res.status(500).json({ message: "Server error retrieving parking slots" });
  }
};

/**
 * (Admin & User) Get a specific parking slot by ID.
 * User can only view if it's available (or if assigned to their request - future logic).
 */
const getParkingSlotById = async (req, res) => {
  try {
    const slotId = req.params.id;
    if (isNaN(slotId)) {
      return res.status(400).json({ message: "Invalid slot ID." });
    }

    const slot = await prisma.parkingSlot.findUnique({
      where: { id: slotId },
    });

    if (!slot) {
      return res.status(404).json({ message: "Parking slot not found." });
    }

    // Non-admins can only see available slots by direct ID access, unless it's their assigned slot
    // This logic can be refined later if a user needs to see details of their assigned (unavailable) slot.
    const isAdmin = req.user.role_name === RoleName.ADMIN;
    if (!isAdmin && slot.status !== ParkingSlotStatus.AVAILABLE) {
      // Check if this slot is assigned to the current user's active request - complex, for later
      // For now, simple restriction:
      // return res.status(403).json({ message: 'You can only view details of available parking slots.' });
    }

    res.status(200).json(slot);
  } catch (error) {
    console.error("Get parking slot by ID error:", error);
    res.status(500).json({ message: "Server error retrieving parking slot" });
  }
};

/**
 * (Admin) Update a parking slot.
 */
const updateParkingSlot = async (req, res) => {
  try {
    const slotId = req.params.id;
    const { slot_number, size, vehicle_type, location, status } = req.body;
    const adminUserId = req.user.user_id;

    const updateData = {};
    if (slot_number) {
      if (!/^[A-Z0-9-]{2,10}$/i.test(slot_number)) {
        return res.status(400).json({ message: "Invalid slot number format." });
      }
      const newSlotNumber = slot_number.toUpperCase();
      const existingSlot = await prisma.parkingSlot.findFirst({
        where: { slot_number: newSlotNumber, NOT: { id: slotId } },
      });
      if (existingSlot) {
        return res
          .status(400)
          .json({ message: "New slot number already exists." });
      }
      updateData.slot_number = newSlotNumber;
    }
    if (size) {
      if (!Object.values(VehicleSize).includes(size.toUpperCase()))
        return res.status(400).json({ message: "Invalid size." });
      updateData.size = size.toUpperCase();
    }
    if (vehicle_type) {
      if (!Object.values(VehicleType).includes(vehicle_type.toUpperCase()))
        return res.status(400).json({ message: "Invalid vehicle_type." });
      updateData.vehicle_type = vehicle_type.toUpperCase();
    }
    if (location !== undefined) {
      // Allow setting to null
      if (
        location &&
        !Object.values(SlotLocation).includes(location.toUpperCase())
      )
        return res.status(400).json({ message: "Invalid location." });
      updateData.location = location ? location.toUpperCase() : null;
    }
    if (status) {
      if (!Object.values(ParkingSlotStatus).includes(status.toUpperCase()))
        return res.status(400).json({ message: "Invalid status." });
      // Business logic: Cannot change status to AVAILABLE if a slot_request is linked to it.
      if (status.toUpperCase() === ParkingSlotStatus.AVAILABLE) {
        const linkedRequest = await prisma.slotRequest.findFirst({
          where: { parking_slot_id: slotId, status: "APPROVED" },
        });
        if (linkedRequest) {
          return res
            .status(400)
            .json({
              message: `Cannot set slot to AVAILABLE. It is assigned to request ID ${linkedRequest.id}. Reject/complete the request first.`,
            });
        }
      }
      updateData.status = status.toUpperCase();
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No update data provided." });
    }

    const updatedSlot = await prisma.parkingSlot.update({
      where: { id: slotId },
      data: updateData,
    });

    res
      .status(200)
      .json({
        message: "Parking slot updated successfully",
        slot: updatedSlot,
      });
  } catch (error) {
    console.error("Update parking slot error:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Parking slot not found." });
    } else if (error.code === "P2002") {
      return res
        .status(400)
        .json({ message: "Slot number already exists (concurrent request)." });
    }
    res.status(500).json({ message: "Server error updating parking slot" });
  }
};

/**
 * (Admin) Delete a parking slot.
 */
const deleteParkingSlot = async (req, res) => {
  try {
    const slotId = req.params.id;
    const adminUserId = req.user.user_id;

    const slotToDelete = await prisma.parkingSlot.findUnique({
      where: { id: slotId },
    });
    if (!slotToDelete) {
      return res.status(404).json({ message: "Parking slot not found." });
    }

    // Business logic: Cannot delete if actively assigned (status APPROVED in SlotRequest)
    const assignedRequest = await prisma.slotRequest.findFirst({
      where: { parking_slot_id: slotId, status: "APPROVED" },
    });
    if (assignedRequest) {
      return res
        .status(400)
        .json({
          message: `Cannot delete slot. It is currently assigned to request ID ${assignedRequest.id}.`,
        });
    }

    // If there are PENDING requests for this specific slot (though unlikely if not assigned),
    // they would become orphaned or need handling. `onDelete: SetNull` on SlotRequest.parking_slot_id handles this.

    await prisma.parkingSlot.delete({
      where: { id: slotId },
    });


    res.status(200).json({ message: "Parking slot deleted successfully." });
  } catch (error) {
    console.error("Delete parking slot error:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Parking slot not found." });
    }
    // P2003 can happen if a slot request still references it and onDelete isn't SetNull
    res.status(500).json({ message: "Server error deleting parking slot" });
  }
};

/**
 * (Admin) Bulk create parking slots.
 * Expects an array of slot objects or a count and a prefix/pattern.
 * For simplicity, let's do count and prefix.
 */
const bulkCreateParkingSlots = async (req, res) => {
  try {
    const {
      count,
      prefix = "PS",
      startNumber = 1,
      size,
      vehicle_type,
      location,
    } = req.body;
    const adminUserId = req.user.user_id;

    if (!count || count <= 0 || count > 500) {
      // Limit bulk creation size
      return res
        .status(400)
        .json({ message: "Invalid count. Must be between 1 and 500." });
    }
    if (!size || !vehicle_type) {
      return res
        .status(400)
        .json({
          message:
            "Default size and vehicle_type are required for bulk creation.",
        });
    }
    if (!Object.values(VehicleSize).includes(size.toUpperCase()))
      return res.status(400).json({ message: "Invalid default size." });
    if (!Object.values(VehicleType).includes(vehicle_type.toUpperCase()))
      return res.status(400).json({ message: "Invalid default vehicle_type." });
    if (
      location &&
      !Object.values(SlotLocation).includes(location.toUpperCase())
    )
      return res.status(400).json({ message: "Invalid default location." });

    const slotsToCreate = [];
    const existingSlotNumbers = new Set(
      (
        await prisma.parkingSlot.findMany({ select: { slot_number: true } })
      ).map((s) => s.slot_number)
    );
    let createdCount = 0;

    for (let i = 0; i < count; i++) {
      const slotNum = `${prefix.toUpperCase()}${(startNumber + i)
        .toString()
        .padStart(3, "0")}`;
      if (existingSlotNumbers.has(slotNum)) {
        console.warn(
          `Skipping existing slot number during bulk create: ${slotNum}`
        );
        continue; // Skip if slot number already exists
      }
      slotsToCreate.push({
        slot_number: slotNum,
        size: size.toUpperCase(),
        vehicle_type: vehicle_type.toUpperCase(),
        location: location ? location.toUpperCase() : null,
        status: ParkingSlotStatus.AVAILABLE,
      });
    }

    if (slotsToCreate.length === 0) {
      return res
        .status(400)
        .json({
          message:
            "No new slots to create (all provided numbers might already exist or count was 0 after filtering).",
        });
    }

    const result = await prisma.parkingSlot.createMany({
      data: slotsToCreate,
      skipDuplicates: true, // Should not be needed if we check above, but as a safeguard
    });
    createdCount = result.count;



    res
      .status(201)
      .json({
        message: `${createdCount} parking slots created successfully via bulk operation.`,
      });
  } catch (error) {
    console.error("Bulk create parking slots error:", error);
    res
      .status(500)
      .json({ message: "Server error during bulk slot creation." });
  }
};

module.exports = {
  createParkingSlot,
  listParkingSlots,
  getParkingSlotById,
  updateParkingSlot,
  deleteParkingSlot,
  bulkCreateParkingSlots,
};
