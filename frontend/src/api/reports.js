import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
console.log("API Base URL:", API_URL);

// Create axios instance with credentials
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Get inventory summary report
export const getInventorySummary = async (params = {}) => {
  const response = await api.get("/admin/reports/inventory-summary", {
    params,
  });
  return response.data;
};

// Get transactions report
export const getTransactionsReport = async (params = {}) => {
  const response = await api.get("/admin/reports/transactions", { params });
  return response.data;
};

// Download inventory summary document (HTML)
export const downloadInventorySummaryDocument = () => {
  const token = localStorage.getItem("token");
  const headers = new Headers();
  headers.append("Authorization", `Bearer ${token}`);

  fetch(`${API_URL}/admin/reports/inventory-summary/document`, {
    headers,
    credentials: "include",
  })
    .then((response) => response.blob())
    .then((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "inventory-summary.html";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    });
};

// Download inventory summary CSV
export const downloadInventorySummaryCSV = () => {
  const token = localStorage.getItem("token");
  const headers = new Headers();
  headers.append("Authorization", `Bearer ${token}`);

  fetch(`${API_URL}/admin/reports/inventory-summary/csv`, {
    headers,
    credentials: "include",
  })
    .then((response) => response.blob())
    .then((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "inventory-summary.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    });
};
