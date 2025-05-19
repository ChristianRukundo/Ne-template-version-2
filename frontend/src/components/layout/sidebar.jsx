import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/auth-context";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Car,
  ParkingCircle,
  SendToBack,
  Users,
  ClipboardList,
  UserCircle2,
  LogOut,
  X,
  Settings,
} from "lucide-react";
import { Button } from "../ui/button";
import { Logo } from "../ui/logo";
import { cn } from "../../lib/utils";

export const Sidebar = ({ onClose, collapsed, onToggleCollapse }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const hasPermission = (permission) => user?.permissions?.includes(permission);
  const isAdmin = user?.role === "ADMIN";

  const navigationItems = [
    // {
    //   name: "Dashboard",
    //   icon: <LayoutDashboard className="h-5 w-5" />,
    //   href: "/dashboard",
    //   visible: true,
    // },
    {
      name: "My Vehicles",
      icon: <Car className="h-5 w-5" />,
      href: "/my-vehicles",
      visible: !isAdmin && hasPermission("list_own_vehicles"),
    },
    // {
    //   name: "Request Slot",
    //   icon: <SendToBack className="h-5 w-5" />,
    //   href: "/slot-requests/new",
    //   visible: !isAdmin && hasPermission("request_parking_slot"),
    // },
    // {
    //   name: "My Requests",
    //   icon: <ClipboardList className="h-5 w-5" />,
    //   href: "/my-slot-requests",
    //   visible: !isAdmin && hasPermission("list_own_slot_requests"),
    // },
    {
      name: "Available Slots",
      icon: <ParkingCircle className="h-5 w-5" />,
      href: "/parking-slots/available",
      visible: !isAdmin && hasPermission("view_available_parking_slots"),
    },
    {
      name: "User Management",
      icon: <Users className="h-5 w-5" />,
      href: "/admin/users",
      visible: isAdmin && hasPermission("manage_all_users"),
    },
    {
      name: "Parking Slots",
      icon: <ParkingCircle className="h-5 w-5" />,
      href: "/admin/parking-slots",
      visible: isAdmin && hasPermission("manage_parking_slots"),
    },
    {
      name: "Slot Requests",
      icon: <SendToBack className="h-5 w-5" />,
      href: "/admin/slot-requests",
      visible: isAdmin && hasPermission("manage_all_slot_requests"),
    },
    // {
    //   name: "Audit Logs",
    //   icon: <ClipboardList className="h-5 w-5" />,
    //   href: "/admin/logs",
    //   visible: isAdmin && hasPermission("view_audit_logs"),
    // },
    {
      name: "Profile",
      icon: <UserCircle2 className="h-5 w-5" />,
      href: "/profile",
      visible: true,
    },
    // { name: "Settings", icon: <Settings className="h-5 w-5" />, href: "/settings", visible: true },
  ];

  const visibleItems = navigationItems.filter((item) => item.visible);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    // Sidebar main container: using card-bg (white) and a subtle border
    <div className="flex flex-col h-full bg-card-bg shadow-lg border-r border-theme-border-default relative">
      {/* Sidebar Header */}
      <div
        className={cn(
          "flex items-center justify-between h-16 border-b border-theme-border-default bg-card-bg", // Consistent background
          collapsed ? "px-2" : "px-4"
        )}
      >
        {!collapsed ? (
          <div
            className="flex items-center cursor-pointer"
            onClick={() => navigate("/dashboard")}
          >
            <Logo className="h-8 w-auto text-brand-yellow" />{" "}
            {/* Brand yellow for logo */}
            <span className="ml-2 text-xl font-bold text-text-main">
              ParkWell
            </span>
          </div>
        ) : (
          <div
            className="cursor-pointer"
            onClick={() => navigate("/dashboard")}
          >
            <Logo className="h-8 w-8 mx-auto text-brand-yellow" />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="lg:hidden rounded-md p-0 h-8 w-8 text-text-muted hover:bg-input-bg" // Themed hover
        >
          {" "}
          <X className="h-5 w-5" />{" "}
        </Button>
      </div>

      {/* Collapse Toggle Button */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-20 hidden lg:flex items-center justify-center h-7 w-7 rounded-full bg-card-bg shadow-md border border-theme-border-default text-text-muted hover:bg-input-bg z-10 focus:outline-none"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2.5">
        {" "}
        {/* Adjusted padding */}
        <ul className="space-y-1.5">
          {visibleItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? location.pathname === item.href
                : location.pathname.startsWith(item.href);
            return (
              <li key={item.name}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full flex items-center gap-x-3 font-medium rounded-lg text-sm transition-all duration-150 ease-in-out group", // Added group for icon hover
                    collapsed
                      ? "justify-center px-2 h-10"
                      : "justify-start px-3 h-10",
                    isActive
                      ? "bg-brand-yellow/10 text-brand-yellow hover:bg-brand-yellow/20" // Active: light yellow bg, brand yellow text
                      : "text-text-muted hover:bg-input-bg hover:text-text-main" // Default: muted text, lighter hover
                  )}
                  onClick={() => {
                    navigate(item.href);
                    if (onClose && window.innerWidth < 1024) onClose();
                  }}
                  title={collapsed ? item.name : ""}
                >
                  <span
                    className={cn(
                      "flex-shrink-0",
                      isActive
                        ? "text-brand-yellow"
                        : "text-text-placeholder group-hover:text-text-main"
                    )}
                  >
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <span className="whitespace-nowrap">{item.name}</span>
                  )}
                  {/* {isActive && !collapsed && (
                    <span className="absolute right-0 w-1 h-3/4 top-1/2 -translate-y-1/2 bg-brand-yellow rounded-l-full"></span>
                  )}
                  {isActive && collapsed && (
                    <span className="absolute left-0 w-1 h-3/4 top-1/2 -translate-y-1/2 bg-brand-yellow rounded-r-full"></span>
                  )} */}
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User profile area */}
      <div
        className={cn(
          "p-3 mt-auto border-t border-theme-border-default",
          collapsed ? "py-4" : ""
        )}
      >
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0">
              <div className="h-9 w-9 rounded-full bg-brand-yellow/20 flex items-center justify-center overflow-hidden border-2 border-card-bg shadow-sm flex-shrink-0">
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                    user?.name || "U"
                  )}&background=FFD024&color=1E2433&font-size=0.45&bold=true`} // Using theme colors
                  alt={user?.name || "User"}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="ml-2.5 overflow-hidden">
                <p className="text-sm font-medium text-text-main truncate">
                  {user?.name || "User Name"}
                </p>
                <p className="text-xs text-text-muted capitalize truncate">
                  {user?.role?.toLowerCase() || "Role"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-text-muted hover:text-destructive hover:bg-destructive/10 rounded-md h-8 w-8 flex-shrink-0"
              title="Logout"
            >
              {" "}
              <LogOut className="h-4 w-4" />{" "}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3">
            <div className="h-9 w-9 rounded-full bg-brand-yellow/20 flex items-center justify-center overflow-hidden border-2 border-card-bg shadow-sm">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                  user?.name || "U"
                )}&background=FFD024&color=1E2433&font-size=0.45&bold=true`}
                alt={user?.name || "User"}
                className="w-full h-full object-cover"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-text-muted hover:text-destructive hover:bg-destructive/10 rounded-md h-8 w-8"
              title="Logout"
            >
              {" "}
              <LogOut className="h-4 w-4" />{" "}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
