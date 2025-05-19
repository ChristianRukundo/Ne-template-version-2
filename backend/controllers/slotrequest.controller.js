// controllers/slotrequest.controller.js
const prisma = require("../config/database");
const { logAction } = require("../utils/logger");
const {
  SlotRequestStatus,
  ParkingSlotStatus,
  RoleName,
  Prisma,
} = require("@prisma/client");
const { sendEmail } = require("../config/email");
const { renderEmailTemplate } = require("../utils/renderEmailTemplate");
/**
 * (User) Create a new slot request for a specific vehicle and a specific parking slot.
 * Calculates cost and checks user balance before creating the PENDING request.
 */
const createSlotRequest = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { vehicle_id, parking_slot_id, expected_duration_hours } = req.body;

    // --- Validation ---
    if (!vehicle_id || !parking_slot_id || !expected_duration_hours) {
      return res.status(400).json({
        message:
          "Vehicle ID, Parking Slot ID, and Expected Duration are required.",
      });
    }
    const duration = parseInt(expected_duration_hours, 10);
    if (isNaN(duration) || duration <= 0) {
      return res.status(400).json({
        message: "Expected duration must be a positive number of hours.",
      });
    }

    // --- Fetch related entities in a transaction for consistency ---
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error("User not found."); // Should not happen if authenticated

      const vehicle = await tx.vehicle.findFirst({
        where: { id: vehicle_id, user_id: userId },
      });
      if (!vehicle)
        throw new Error("Vehicle not found or does not belong to you.");

      const parkingSlot = await tx.parkingSlot.findUnique({
        where: { id: parking_slot_id },
      });
      if (!parkingSlot) throw new Error("Selected parking slot not found.");
      if (parkingSlot.status !== ParkingSlotStatus.AVAILABLE) {
        throw new Error(
          `Slot ${parkingSlot.slot_number} is no longer available.`
        );
      }
      if (!parkingSlot.cost_per_hour) {
        throw new Error(
          `Slot ${parkingSlot.slot_number} does not have a defined cost. Cannot request.`
        );
      }

      // --- Cost Calculation ---
      // Ensure cost_per_hour and duration are treated as numbers for calculation
      const costPerHour = new Prisma.Decimal(parkingSlot.cost_per_hour);
      const calculatedCost = costPerHour.mul(new Prisma.Decimal(duration));

      // --- Balance Check ---
      if (new Prisma.Decimal(user.balance).lt(calculatedCost)) {
        // user.balance < calculatedCost
        // Using a custom error type or code could be useful for frontend to specifically handle insufficient balance
        const balanceError = new Error(
          `Insufficient balance. Required: $${calculatedCost.toFixed(
            2
          )}, Available: $${user.balance.toFixed(
            2
          )}. Please top up your account.`
        );
        balanceError.statusCode = 402; // Payment Required (or 400 Bad Request)
        throw balanceError;
      }

      // Check if user already has an active (PENDING or APPROVED) request
      const existingActiveRequest = await tx.slotRequest.findFirst({
        where: {
          user_id: userId, // Check for any active request by the user
          // OR specifically for this vehicle if that's the rule: vehicle_id: vehicle.id,
          status: {
            in: [SlotRequestStatus.PENDING, SlotRequestStatus.APPROVED],
          },
        },
      });
      if (existingActiveRequest) {
        throw new Error(
          `You already have an active request (Status: ${existingActiveRequest.status}). Please resolve it before making a new one.`
        );
      }

      const newRequest = await tx.slotRequest.create({
        data: {
          user_id: userId,
          vehicle_id: vehicle.id,
          parking_slot_id: parkingSlot.id, // User selected this specific slot
          expected_duration_hours: duration,
          calculated_cost: calculatedCost,
          status: SlotRequestStatus.PENDING,
        },
        include: { vehicle: true, parking_slot: true },
      });
      return { newRequest, vehicle, parkingSlot }; // Return all for logging
    });

    await logAction({
      userId: userId,
      action: `User created slot request for vehicle: ${
        result.vehicle.plate_number
      } for slot ${
        result.parkingSlot.slot_number
      }. Cost: $${result.newRequest.calculated_cost.toFixed(2)}`,
      entityType: "SlotRequest",
      entityId: result.newRequest.id,
    });

    res.status(201).json({
      message: "Slot request submitted successfully and is pending approval.",
      request: result.newRequest,
    });
  } catch (error) {
    console.error("Create slot request error:", error);
    if (error.statusCode === 402) {
      return res.status(402).json({ message: error.message });
    }
    // Handle Prisma unique constraint violation for parking_slot_id on SlotRequest if a slot somehow gets double-booked in PENDING state
    // Though our logic should prevent requesting a non-AVAILABLE slot.
    if (
      error.code === "P2002" &&
      error.meta?.target?.includes("parking_slot_id")
    ) {
      return res.status(400).json({
        message:
          "This parking slot was just requested by someone else. Please try another.",
      });
    }
    res
      .status(500)
      .json({ message: error.message || "Server error creating slot request" });
  }
};

/**
 * (User) List their own slot requests.
 * (Admin) List all slot requests.
 * Supports pagination and search by status or vehicle details.
 */
const listSlotRequests = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const isAdmin = req.user.role_name === RoleName.ADMIN;

    const {
      page = 1,
      limit = 10,
      search = "", // Search by vehicle plate number or user name/email (if admin)
      sortBy = "created_at",
      order = "desc",
      status, // Filter by SlotRequestStatus string
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (!isAdmin) {
      where.user_id = userId;
    }

    if (
      status &&
      Object.values(SlotRequestStatus).includes(status.toUpperCase())
    ) {
      where.status = status.toUpperCase();
    }

    if (search) {
      const searchCondition = { contains: search, mode: "insensitive" };
      if (isAdmin) {
        where.OR = [
          { vehicle: { plate_number: searchCondition } },
          { user: { name: searchCondition } },
          { user: { email: searchCondition } },
        ];
      } else {
        // User can only search their own vehicle plates
        where.vehicle = { plate_number: searchCondition };
      }
    }

    const orderByOptions = {};
    if (
      ["status", "requested_at", "resolved_at", "created_at"].includes(sortBy)
    ) {
      orderByOptions[sortBy] = order.toLowerCase() === "asc" ? "asc" : "desc";
    } else if (sortBy === "vehicle_plate") {
      orderByOptions.vehicle = {
        plate_number: order.toLowerCase() === "asc" ? "asc" : "desc",
      };
    } else if (isAdmin && sortBy === "user_name") {
      orderByOptions.user = {
        name: order.toLowerCase() === "asc" ? "asc" : "desc",
      };
    } else {
      orderByOptions.created_at = "desc";
    }

    const requests = await prisma.slotRequest.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: orderByOptions,
      include: {
        user: { select: { id: true, name: true, email: true } },
        vehicle: {
          select: {
            id: true,
            plate_number: true,
            vehicle_type: true,
            size: true,
          },
        },
        parking_slot: {
          select: { id: true, slot_number: true, location: true },
        },
      },
    });

    const totalRequests = await prisma.slotRequest.count({ where });

    res.status(200).json({
      data: requests,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalRequests / limitNum),
        totalItems: totalRequests,
        itemsPerPage: limitNum,
      },
    });
  } catch (error) {
    console.error("List slot requests error:", error);
    res.status(500).json({ message: "Server error retrieving slot requests" });
  }
};

/**
 * (User) Update their own PENDING slot request.
 * Can change vehicle or cancel (set status to CANCELLED).
 */
const updateMySlotRequest = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const requestId = req.params.id;
    const { vehicle_id, status } = req.body; // User can change vehicle or set status to CANCELLED

    if (isNaN(requestId)) {
      return res.status(400).json({ message: "Invalid request ID." });
    }

    const requestToUpdate = await prisma.slotRequest.findUnique({
      where: { id: requestId },
    });

    if (!requestToUpdate) {
      return res.status(404).json({ message: "Slot request not found." });
    }
    if (requestToUpdate.user_id !== userId) {
      return res
        .status(403)
        .json({ message: "Forbidden: You can only update your own requests." });
    }
    if (requestToUpdate.status !== SlotRequestStatus.PENDING) {
      return res.status(400).json({
        message: `Cannot update request. Status is already ${requestToUpdate.status}.`,
      });
    }

    const updateData = {};
    if (vehicle_id) {
      const vehicle = await prisma.vehicle.findFirst({
        where: { id: vehicle_id, user_id: userId },
      });
      if (!vehicle) {
        return res.status(404).json({
          message: "New vehicle not found or does not belong to you.",
        });
      }
      updateData.vehicle_id = vehicle.id;
    }
    if (status) {
      if (status.toUpperCase() === SlotRequestStatus.CANCELLED) {
        updateData.status = SlotRequestStatus.CANCELLED;
        updateData.resolved_at = new Date(); // Mark as resolved if cancelled
      } else {
        return res.status(400).json({
          message:
            "Invalid status update. Users can only cancel pending requests.",
        });
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No update data provided." });
    }

    const updatedRequest = await prisma.slotRequest.update({
      where: { id: requestId },
      data: updateData,
      include: { vehicle: true },
    });

    await logAction({
      userId: userId,
      action: `User updated slot request ID: ${updatedRequest.id} for vehicle ${updatedRequest.vehicle.plate_number}`,
      entityType: "SlotRequest",
      entityId: updatedRequest.id,
      details: { changes: Object.keys(updateData) },
    });

    res.status(200).json({
      message: "Slot request updated successfully.",
      request: updatedRequest,
    });
  } catch (error) {
    console.error("Update my slot request error:", error);
    res.status(500).json({ message: "Server error updating slot request" });
  }
};

/**
 * (Admin) Approve or Reject a PENDING slot request.
 * If approving, admin MUST manually provide a parking_slot_id.
 */
const resolveSlotRequest = async (req, res) => {
  try {
    const adminUserId = req.user.user_id;
    const requestId = req.params.id; // Assuming ID is UUID string
    const { status, admin_notes, parking_slot_id_manual } = req.body;

    // Validate requestId format if necessary (e.g., is it a valid UUID string)

    if (
      !status ||
      !Object.values(SlotRequestStatus).includes(status.toUpperCase()) ||
      ![SlotRequestStatus.APPROVED, SlotRequestStatus.REJECTED].includes(
        status.toUpperCase()
      )
    ) {
      return res
        .status(400)
        .json({ message: "Invalid status. Must be APPROVED or REJECTED." });
    }

    const requestToResolve = await prisma.slotRequest.findUnique({
      where: { id: requestId },
      include: { vehicle: true, user: { select: { name: true, email: true } } },
    });

    if (!requestToResolve) {
      return res.status(404).json({ message: "Slot request not found." });
    }
    if (requestToResolve.status !== SlotRequestStatus.PENDING) {
      return res.status(400).json({
        message: `Request already resolved with status: ${requestToResolve.status}.`,
      });
    }

    const updateData = {
      status: status.toUpperCase(),
      admin_notes: admin_notes || null,
      resolved_at: new Date(),
    };
    let assignedSlotDetails = null; // For logging and email

    if (status.toUpperCase() === SlotRequestStatus.APPROVED) {
      if (!parking_slot_id_manual) {
        return res.status(400).json({
          message: "Parking slot ID is required for approving a request.",
        });
      }

      const selectedSlot = await prisma.parkingSlot.findUnique({
        where: { id: parking_slot_id_manual },
      });

      if (!selectedSlot) {
        return res.status(404).json({
          message: `Selected parking slot ID ${parking_slot_id_manual} not found.`,
        });
      }
      if (selectedSlot.status !== ParkingSlotStatus.AVAILABLE) {
        // Check if it's already assigned to THIS request (e.g., re-approving after an issue, though unlikely flow)
        if (selectedSlot.id !== requestToResolve.parking_slot_id) {
          return res.status(400).json({
            message: `Selected slot ${selectedSlot.slot_number} is not available. Current status: ${selectedSlot.status}.`,
          });
        }
      }
      // Optional: Basic compatibility check (admin override implied)
      if (
        selectedSlot.size !== requestToResolve.vehicle.size ||
        selectedSlot.vehicle_type !== requestToResolve.vehicle.vehicle_type
      ) {
        console.warn(
          `Admin is assigning slot ${selectedSlot.slot_number} (${selectedSlot.size}/${selectedSlot.vehicle_type}) to vehicle ${requestToResolve.vehicle.plate_number} (${requestToResolve.vehicle.size}/${requestToResolve.vehicle.vehicle_type}) with potential incompatibility.`
        );
        // You could add a specific warning in admin_notes or require admin confirmation for override on frontend
      }

      updateData.parking_slot_id = selectedSlot.id;
      assignedSlotDetails = selectedSlot; // For logging and email
    } else {
      // REJECTED
      updateData.parking_slot_id = null; // Ensure no slot is linked if rejecting
    }

    // Perform updates in a transaction
    const updatedRequest = await prisma.$transaction(async (tx) => {
      const finalUpdatedRequest = await tx.slotRequest.update({
        where: { id: requestId },
        data: updateData,
        include: { vehicle: true, user: true, parking_slot: true }, // Include for email
      });

      if (
        finalUpdatedRequest.status === SlotRequestStatus.APPROVED &&
        finalUpdatedRequest.parking_slot_id
      ) {
        await tx.parkingSlot.update({
          where: { id: finalUpdatedRequest.parking_slot_id },
          data: { status: ParkingSlotStatus.UNAVAILABLE },
        });
      }
      // If request was previously approved and is now rejected, make the old slot available again
      else if (
        finalUpdatedRequest.status === SlotRequestStatus.REJECTED &&
        requestToResolve.parking_slot_id
      ) {
        await tx.parkingSlot.update({
          where: { id: requestToResolve.parking_slot_id }, // The slot previously assigned to this request
          data: { status: ParkingSlotStatus.AVAILABLE },
        });
      }

      return finalUpdatedRequest;
    });

    await logAction({
      userId: adminUserId,
      action: `Admin ${updatedRequest.status.toLowerCase()} slot request ID: ${
        updatedRequest.id
      } for vehicle ${updatedRequest.vehicle.plate_number}. ${
        updatedRequest.status === SlotRequestStatus.APPROVED
          ? `Assigned slot: ${updatedRequest.parking_slot?.slot_number}`
          : "No slot assigned."
      }`,
      entityType: "SlotRequest",
      entityId: updatedRequest.id,
    });

    if (
      updatedRequest.status === SlotRequestStatus.APPROVED &&
      updatedRequest.parking_slot
    ) {
      const htmlEmail = renderEmailTemplate("slotApprovalEmail", {
        userName: updatedRequest.user.name,
        vehiclePlateNumber: updatedRequest.vehicle.plate_number,
        vehicleType: updatedRequest.vehicle.vehicle_type,
        slotNumber: updatedRequest.parking_slot.slot_number,
        slotLocation: updatedRequest.parking_slot.location || "N/A",
        slotSize: updatedRequest.parking_slot.size,
        approvalDate: new Date(updatedRequest.resolved_at).toLocaleDateString(),
      });
      if (htmlEmail) {
        await sendEmail(
          updatedRequest.user.email,
          "Your Parking Slot Request Approved!",
          `Your request for vehicle ${updatedRequest.vehicle.plate_number} has been approved. Slot: ${updatedRequest.parking_slot.slot_number}.`,
          htmlEmail
        );
      }
    }

    res.status(200).json({
      message: `Slot request ${updatedRequest.status.toLowerCase()} successfully.`,
      request: updatedRequest,
    });
  } catch (error) {
    console.error("Resolve slot request error:", error);
    res.status(500).json({ message: "Server error resolving slot request" });
  }
};

module.exports = {
  createSlotRequest,
  listSlotRequests,
  updateMySlotRequest, // For user to cancel or change vehicle on PENDING request
  resolveSlotRequest, // For admin to approve/reject
};
