import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api"; // Ensure this matches your backend
console.log("API Base URL for Slot Requests:", API_URL);

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Slot Request API Functions ---

/**
 * (User) Creates a new slot request for a specific vehicle.
 * The backend will mark this request as PENDING.
 * Note: The `parking_slot_id` is NOT sent by the user here;
 * it's determined by the admin during approval.
 * @param {object} requestData - Object containing { vehicle_id: "uuid_of_vehicle" }
 */
export const createUserSlotRequest = async (requestData) => {
  // Corresponds to `createSlotRequest` in slotrequest.controller.js
  const response = await api.post("/slot-requests", requestData);
  return response.data;
};

/**
 * (User) Lists their own slot requests.
 * @param {object} params - Query parameters for pagination, search, filtering
 */
export const getMySlotRequests = async (params = {}) => {
  // Corresponds to `listSlotRequests` in slotrequest.controller.js (user context)
  const response = await api.get("/slot-requests", { params });
  return response.data;
};

/**
 * (User) Updates their own PENDING slot request (e.g., change vehicle or cancel).
 * @param {string} requestId - The UUID of the slot request.
 * @param {object} updateData - Object like { vehicle_id: "new_uuid" } or { status: "CANCELLED" }
 */
export const updateUserSlotRequest = async (requestId, updateData) => {
  // Corresponds to `updateMySlotRequest` in slotrequest.controller.js
  const response = await api.put(`/slot-requests/${requestId}`, updateData);
  return response.data;
};

// --- Admin Slot Request Functions (if needed in a separate admin API file, or here for completeness) ---

/**
 * (Admin) Lists all slot requests in the system.
 * @param {object} params - Query parameters for pagination, search, filtering
 */
export const adminGetAllSlotRequests = async (params = {}) => {
  // Corresponds to `listSlotRequests` in slotrequest.controller.js (admin context)
  const response = await api.get("/slot-requests", { params }); // Backend controller handles isAdmin logic for full list
  return response.data;
};

/**
 * (Admin) Approves or rejects a slot request.
 * @param {string} requestId - The UUID of the slot request.
 * @param {object} resolveData - Object like { status: "APPROVED" | "REJECTED", admin_notes?: "...", parking_slot_id_manual?: "uuid_of_slot_if_manual_assignment" }
 */
export const adminResolveSlotRequest = async (requestId, resolveData) => {
  // Corresponds to `resolveSlotRequest` in slotrequest.controller.js
  // Uses PATCH as per the backend route definition
  const response = await api.patch(
    `/slot-requests/${requestId}/resolve`,
    resolveData
  );
  return response.data;
};
