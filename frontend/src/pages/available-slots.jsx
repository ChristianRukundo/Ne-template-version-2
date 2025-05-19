"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "react-query";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import { Search, ArrowUpDown, ParkingCircle, Send } from "lucide-react"; // Added Send icon
import { getAvailableParkingSlots } from "../api/parking-slot"; // API for users to view slots
import { useAuth } from "../context/auth-context";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { Loader } from "../components/ui/loader";
import { Pagination } from "../components/ui/pagination";
import { EmptyState } from "../components/ui/empty-state";
import { Badge } from "../components/ui/badge";
import { RequestSlotModal } from "../components/slot/request-slot-modal";

export const AvailableSlotsPage = () => {
  // Renamed for clarity
  const navigate = useNavigate();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("slot_number");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Modal state
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedSlotForRequest, setSelectedSlotForRequest] = useState(null);

  const canViewAvailableSlots = user?.permissions?.includes(
    "view_available_parking_slots"
  );
  const canRequestSlot = user?.permissions?.includes("request_parking_slot");

  const { data, isLoading, isError, refetch } = useQuery(
    [
      "availableParkingSlots",
      searchQuery,
      sortBy,
      sortOrder,
      currentPage,
      pageSize,
    ],
    () =>
      getAvailableParkingSlots({
        // Use the correct API for users
        search: searchQuery.trim(),
        sortBy,
        order: sortOrder,
        page: currentPage,
        limit: pageSize,
        // The backend controller should automatically filter by status: 'AVAILABLE' for non-admin users
      }),
    {
      keepPreviousData: true,
      enabled: !!canViewAvailableSlots,
      onError: (error) => {
        toast.error(
          error.response?.data?.message ||
            "Failed to load available parking slots"
        );
      },
    }
  );

  const slots = data?.data || [];
  const pagination = data?.pagination || {
    totalItems: 0,
    currentPage: 1,
    itemsPerPage: 10,
    totalPages: 1,
  };

  const handleSort = (column) => {
    if (sortBy === column)
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const openRequestModal = (slot) => {
    if (!canRequestSlot) {
      toast.error("You don't have permission to request a slot.");
      return;
    }
    setSelectedSlotForRequest(slot);
    setIsRequestModalOpen(true);
  };

  const getStatusBadge = (status) => {
    // Should ideally only show AVAILABLE here
    if (status === "AVAILABLE") {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-300">
          {status}
        </Badge>
      );
    }
    return <Badge variant="outline">{status}</Badge>; // Fallback for unexpected statuses
  };

  if (!canViewAvailableSlots && !isLoading) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500">
          You do not have permission to view available slots.
        </p>
        <Button onClick={() => navigate("/dashboard")} className="mt-4">
          Go to Dashboard
        </Button>
      </div>
    );
  }

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-64">
        <Loader />
      </div>
    );
  if (isError)
    return (
      <div className="text-center py-10 text-red-500">
        Error loading available parking slots.{" "}
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Available Parking Slots</CardTitle>
          <CardDescription>
            Browse available slots and request one for your vehicle.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <Input
                placeholder="Search by Slot Number, Size, Type, Location..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
          </div>

          {slots.length === 0 && !searchQuery ? (
            <EmptyState
              icon={<ParkingCircle className="h-12 w-12 text-gray-400" />}
              title="No Available Slots"
              description="Currently, there are no parking slots available. Please check back later."
            />
          ) : slots.length === 0 && searchQuery ? (
            <EmptyState
              icon={<ParkingCircle className="h-12 w-12 text-gray-400" />}
              title="No Slots Found"
              description="No available parking slots match your search criteria."
            />
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("slot_number")}
                      >
                        Slot #{" "}
                        {sortBy === "slot_number" && (
                          <ArrowUpDown
                            className={`ml-1 h-3 w-3 ${
                              sortOrder === "desc" ? "rotate-180" : ""
                            }`}
                          />
                        )}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("size")}
                      >
                        Size{" "}
                        {sortBy === "size" && (
                          <ArrowUpDown
                            className={`ml-1 h-3 w-3 ${
                              sortOrder === "desc" ? "rotate-180" : ""
                            }`}
                          />
                        )}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("vehicle_type")}
                      >
                        Pref. Type{" "}
                        {sortBy === "vehicle_type" && (
                          <ArrowUpDown
                            className={`ml-1 h-3 w-3 ${
                              sortOrder === "desc" ? "rotate-180" : ""
                            }`}
                          />
                        )}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer"
                        onClick={() => handleSort("location")}
                      >
                        Location{" "}
                        {sortBy === "location" && (
                          <ArrowUpDown
                            className={`ml-1 h-3 w-3 ${
                              sortOrder === "desc" ? "rotate-180" : ""
                            }`}
                          />
                        )}
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slots.map((slot) => (
                      <TableRow key={slot.id}>
                        <TableCell className="font-medium">
                          {slot.slot_number}
                        </TableCell>
                        <TableCell>{slot.size}</TableCell>
                        <TableCell>{slot.vehicle_type}</TableCell>
                        <TableCell>{slot.location || "N/A"}</TableCell>
                        <TableCell>{getStatusBadge(slot.status)}</TableCell>
                        <TableCell className="text-right">
                          {slot.status === "AVAILABLE" && canRequestSlot && (
                            <Button
                              size="sm"
                              onClick={() => openRequestModal(slot)}
                              className="bg-brand-yellow/80 hover:bg-brand-yellow/60"
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Request Slot
                            </Button>
                          )}
                          {slot.status !== "AVAILABLE" && (
                            <span className="text-xs text-gray-500 italic">
                              Not Requestable
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {pagination.totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <Pagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Request Slot Modal */}
      <RequestSlotModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        parkingSlot={selectedSlotForRequest}
      />
    </motion.div>
  );
};
