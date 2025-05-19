import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api"; // Ensure this matches your backend
console.log("API Base URL for Admin Parking Slots:", API_URL);

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

// --- Admin Parking Slot API Functions ---

/**
 * (Admin) Get all parking slots with filters and pagination.
 * Corresponds to `listParkingSlots` in parkingslot.controller.js (admin access)
 */
export const adminGetAllParkingSlots = async (params = {}) => {
  // Ensure admin always gets all slots, filtering is applied on top
  const queryParams = { ...params, showAll: true };
  const response = await api.get("/parking-slots", { params: queryParams });
  return response.data;
};

export const getAvailableParkingSlots = async (params = {}) => {
  const response = await api.get("/parking-slots", { params });
  return response.data;
};

/**
 * (Admin) Get a specific parking slot by ID.
 */
export const adminGetParkingSlotById = async (id) => {
  const response = await api.get(`/parking-slots/${id}`);
  return response.data;
};

/**
 * (Admin) Create a new parking slot.
 * Corresponds to `createParkingSlot` in parkingslot.controller.js
 */
export const adminCreateParkingSlot = async (slotData) => {
  const response = await api.post("/parking-slots", slotData);
  return response.data;
};

/**
 * (Admin) Update an existing parking slot.
 * Corresponds to `updateParkingSlot` in parkingslot.controller.js
 */
export const adminUpdateParkingSlot = async (id, slotData) => {
  const response = await api.put(`/parking-slots/${id}`, slotData);
  return response.data;
};

/**
 * (Admin) Delete a parking slot.
 * Corresponds to `deleteParkingSlot` in parkingslot.controller.js
 */
export const adminDeleteParkingSlot = async (id) => {
  const response = await api.delete(`/parking-slots/${id}`);
  return response.data;
};

/**
 * (Admin) Bulk create parking slots.
 * Corresponds to `bulkCreateParkingSlots` in parkingslot.controller.js
 */
export const adminBulkCreateParkingSlots = async (bulkData) => {
  const response = await api.post("/parking-slots/bulk", bulkData);
  return response.data;
};
