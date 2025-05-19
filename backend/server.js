const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const swaggerUi = require("swagger-ui-express");
const dotenv = require("dotenv");
const path = require("path");
const morgan = require("morgan");
const swaggerDocument = require("./swagger.json");

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Prisma client
const prisma = new PrismaClient();

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

//swagger docs

// const swaggerAdmin = require("./swagger/swagger-admin.json");
// const swaggerAuth = require("./swagger/swagger-auth.json");
// const swaggerVehicles = require("./swagger/swagger-vehicles.json");
// const swaggerParkingSlots = require("./swagger/swagger-parkingslots.json");
// const swaggerSlotRequests = require("./swagger/swagger-slotrequests.json");
const swaggerDocumentMaster = require("./swagger/swagger.json");
// --- Setup Swagger Docs for each module ---
// Main/Combined Docs (if you have one)
// app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocumentMain));
// Module-specific Docs

// app.use(
//   "/api-docs/auth",
//   swaggerUi.serveFiles(swaggerAuth),
//   swaggerUi.setup(swaggerAuth)
// );
// app.use(
//   "/api-docs/admin",
//   swaggerUi.serveFiles(swaggerAdmin),
//   swaggerUi.setup(swaggerAdmin)
// );
// app.use(
//   "/api-docs/vehicles",
//   swaggerUi.serveFiles(swaggerVehicles),
//   swaggerUi.setup(swaggerVehicles)
// );

// Add lines here for parking-slots and slot-requests when you have their swagger files
// app.use("/api-docs/parking-slots", swaggerUi.serveFiles(swaggerParkingSlots), swaggerUi.setup(swaggerParkingSlots));
// app.use("/api-docs/slot-requests", swaggerUi.serveFiles(swaggerSlotRequests), swaggerUi.setup(swaggerSlotRequests))

app.use("/api/v1/auth", require("./routes/auth.routes"));
app.use("/api/v1/users", require("./routes/user.routes")); // For user profile updates
app.use("/api/v1/admin", require("./routes/admin.routes"));
app.use("/api/v1/vehicles", require("./routes/vehicle.routes"));
// Add parking slot and slot request routes here later
app.use("/api/v1/parking-slots", require("./routes/parkingslot.routes"));
app.use("/api/v1/slot-requests", require("./routes/slotrequest.routes"));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocumentMaster));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(
    `----------------------------------------------------------------`
  );
  console.log(`Main Swagger Docs: http://localhost:${PORT}/api-docs`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
  // Don't crash the server
});

module.exports = app;
