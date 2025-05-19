import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/auth-context";
import { ProtectedRoute } from "./routes/protected-route";
import { DashboardLayout } from "./components/layout/dashboard-layout";
import { MyVehiclesPage } from "./pages/vehicles-page";

// Auth Pages
import { LoginPage } from "./pages/auth/login-page";
import { RegisterPage } from "./pages/auth/register-page";
import { ForgotPasswordPage } from "./pages/auth/forgot-password-page";
import { ResetPasswordPage } from "./pages/auth/reset-password-page";
import { VerifyEmailPage } from "./pages/auth/verify-email-page";

// Dashboard Pages

import { ProfilePage } from "./pages/profile-page";

import { VehicleForm } from "./components/vehicle/vehicle-form";


// Admin Pages

import { AdminUserFormPage } from "./pages/admin/users-form-page";
import { UserManagement } from "./pages/admin/user-management";


import { AdminParkingSlotsPage } from "./pages/admin/parking-slot";
import { AvailableSlotsPage } from "./pages/available-slots";
import { AdminSlotRequestsPage } from "./pages/admin/admin-slot-requests-page";
import { HomePage } from "./pages/home-page";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Auth Routes */}
            <Route path="/home" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              {/* Group Dashboard Routes inside DashboardLayout */}
              <Route path="/" element={<DashboardLayout />}>
                <Route index element={<Navigate to="/my-vehicles" replace />} />
                {/* <Route path="dashboard" element={<DashboardPage />} /> */}
                <Route path="profile" element={<ProfilePage />} />

                {/* Inventory Routes */}
                <Route path="/my-vehicles" element={<MyVehiclesPage />} />
                <Route path="/my-vehicles/new" element={<VehicleForm />} />
                <Route
                  path="/my-vehicles/:id/edit"
                  element={<VehicleForm isEdit={true} />}
                />

                <Route
                  path="/admin/parking-slots"
                  element={<AdminParkingSlotsPage />}
                />

                <Route
                  path="/admin/slot-requests"
                  element={<AdminSlotRequestsPage />}
                />

                {/* Transaction Routes */}

                <Route
                  path="/parking-slots/available"
                  element={<AvailableSlotsPage />}
                />

                {/* Reports Routes */}
                {/* <Route path="reports" element={<ReportsPage />} /> */}

                {/* Admin Routes */}
                <Route path="admin">
                  {/* <Route path="users" element={<AdminUsersPage />} /> */}
                  <Route path="users" element={<UserManagement />} />
                  <Route path="users/new" element={<AdminUserFormPage isEdit={false} />} />
                  <Route
                    path="users/:id/edit"
                    element={<AdminUserFormPage isEdit />}
                  />
                </Route>
              </Route>
            </Route>

            {/* Catch all - Redirect to dashboard if no route matches */}
            <Route path="*" element={<Navigate to="/my-vehicles" replace />} />
          </Routes>
        </Router>
        <Toaster position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
