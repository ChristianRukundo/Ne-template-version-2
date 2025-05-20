"use client"; // Or remove if not using Next.js App Router

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "react-query";
import { toast } from "react-hot-toast";
import { z } from "zod";
import { motion } from "framer-motion";
import { ParkingCircle, DollarSign } from "lucide-react"; // Added DollarSign
import {
  adminCreateParkingSlot,
  adminUpdateParkingSlot,
} from "../../api/parking-slot"; // Ensure this path is correct and functions exist
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Loader } from "../ui/loader";

// Enum values from your backend schema
const VEHICLE_TYPES = ["CAR", "MOTORCYCLE", "TRUCK", "BICYCLE"];
const VEHICLE_SIZES = ["SMALL", "MEDIUM", "LARGE", "EXTRA_LARGE"];
const SLOT_LOCATIONS = ["NORTH_WING", "SOUTH_WING", "EAST_WING", "WEST_WING", "LEVEL_1", "LEVEL_2"];
const PARKING_SLOT_STATUSES = ["AVAILABLE", "UNAVAILABLE", "MAINTENANCE"];

// Validation schema for Parking Slot (with cost_per_hour)
const parkingSlotSchema = z.object({
  slot_number: z
    .string()
    .min(2, "Slot number must be at least 2 characters.")
    .max(10, "Slot number max 10 chars.")
    .regex(/^[A-Z0-9-]+$/i, "Slot number: letters, numbers, hyphens only."),
  size: z.enum(VEHICLE_SIZES, { required_error: "Slot size is required." }),
  vehicle_type: z.enum(VEHICLE_TYPES, {
    required_error: "Preferred vehicle type is required.",
  }),
  location: z.enum(SLOT_LOCATIONS).optional().nullable().or(z.literal("")),
  status: z.enum(PARKING_SLOT_STATUSES, {
    required_error: "Status is required.",
  }),
  cost_per_hour: z.preprocess( // Preprocess to convert empty string or string to number
    (val) => (val === "" || val === null || val === undefined ? null : parseFloat(String(val))),
    z.number({ invalid_type_error: "Cost must be a number." })
      .min(0, "Cost cannot be negative.")
      .max(1000, "Cost seems too high (max 1000).") // Example max
      .nullable() // Allow null if some slots can be free/unpriced via null
  ),
});

export const ParkingSlotForm = ({ isOpen, onClose, onSuccess, initialData }) => {
  const queryClient = useQueryClient();
  const isEditMode = !!initialData;

  const [formData, setFormData] = useState({
    slot_number: "",
    size: "",
    vehicle_type: "",
    location: "",
    status: "AVAILABLE",
    cost_per_hour: "", // Initialize as empty string for input field
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && initialData) {
        setFormData({
          slot_number: initialData.slot_number || "",
          size: initialData.size || "",
          vehicle_type: initialData.vehicle_type || "",
          location: initialData.location || "",
          status: initialData.status || "AVAILABLE",
          cost_per_hour: initialData.cost_per_hour !== null && initialData.cost_per_hour !== undefined ? String(initialData.cost_per_hour) : "", // Convert Decimal/number to string for input
        });
      } else {
        setFormData({
          slot_number: "", size: "", vehicle_type: "", location: "", status: "AVAILABLE", cost_per_hour: "",
        });
      }
      setErrors({});
    }
  }, [isOpen, initialData, isEditMode]);

  const mutationOptions = {
    onSuccess: () => {
      toast.success(`Parking slot ${isEditMode ? "updated" : "created"} successfully!`);
      queryClient.invalidateQueries("admin-parkingSlots"); // Used in AdminSlotManagementPage
      queryClient.invalidateQueries("availableParkingSlots"); // Used in AvailableSlotsPage
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || `Failed to ${isEditMode ? "update" : "create"} parking slot.`);
    },
  };

  const createMutation = useMutation(adminCreateParkingSlot, mutationOptions);
  const updateMutation = useMutation((data) => adminUpdateParkingSlot(initialData.id, data), mutationOptions);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value === "NONE" ? "" : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Prepare data for Zod parsing, ensuring cost_per_hour is correctly formatted for number conversion
    const dataToValidate = {
      ...formData,
      location: formData.location === "" ? null : formData.location,
      // cost_per_hour will be handled by Zod's preprocess
    };

    try {
      const parsedData = parkingSlotSchema.parse(dataToValidate);
      // parsedData.cost_per_hour will be a number or null after Zod processing

      const finalPayload = {
        ...parsedData,
        slot_number: parsedData.slot_number.toUpperCase().trim(),
        // cost_per_hour in parsedData is already in the correct format (number or null) for Prisma
      };


      if (isEditMode) {
        updateMutation.mutate(finalPayload);
      } else {
        createMutation.mutate(finalPayload);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors = {};
        error.errors.forEach((err) => { newErrors[err.path[0]] = err.message; });
        setErrors(newErrors);
        toast.error("Please correct the form errors.");
      } else {
        toast.error("An unexpected error occurred during submission.");
        console.error("Submission error:", error);
      }
    }
  };

  if (!isOpen) return null;

  const isLoadingMutation = createMutation.isLoading || updateMutation.isLoading;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg"> {/* Slightly wider for the new field */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <ParkingCircle className="mr-2 h-6 w-6 text-brand-yellow" /> {/* Themed icon */}
              {isEditMode ? "Edit Parking Slot" : "Add New Parking Slot"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode ? "Update the details of the parking slot." : "Fill in the details to create a new parking slot."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="slot_number" className="text-xs font-semibold text-text-main tracking-wide uppercase">Slot Number *</Label>
                <Input id="slot_number" name="slot_number" value={formData.slot_number} onChange={handleChange}
                  className={`mt-1 bg-input-bg text-text-main placeholder-text-placeholder focus:bg-card-bg focus:ring-2 focus:ring-focus-brand focus:border-focus-brand ${errors.slot_number ? "border-destructive ring-1 ring-destructive/30" : "border-theme-border-input"}`}
                  placeholder="e.g., A101"
                />
                {errors.slot_number && <p className="text-xs text-destructive mt-1">{errors.slot_number}</p>}
              </div>

              {/* Cost Per Hour Field */}
              <div>
                <Label htmlFor="cost_per_hour" className="text-xs font-semibold text-text-main tracking-wide uppercase">Cost Per Hour (e.g., 2.50)</Label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <DollarSign className="h-4 w-4 text-text-placeholder" />
                  </div>
                  <Input
                    id="cost_per_hour"
                    name="cost_per_hour"
                    type="number"
                    value={formData.cost_per_hour}
                    onChange={handleChange}
                    className={`pl-9 bg-input-bg text-text-main placeholder-text-placeholder focus:bg-card-bg focus:ring-2 focus:ring-focus-brand focus:border-focus-brand ${errors.cost_per_hour ? "border-destructive ring-1 ring-destructive/30" : "border-theme-border-input"}`}
                    placeholder="0.00 (leave blank if free/unpriced)"
                    step="0.01"
                    min="0"
                  />
                </div>
                {errors.cost_per_hour && <p className="text-xs text-destructive mt-1">{errors.cost_per_hour}</p>}
                <p className="text-xs text-text-muted mt-1">Leave blank or set to 0 for free slots. Backend expects null or a number.</p>
              </div>


              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="size" className="text-xs font-semibold text-text-main tracking-wide uppercase">Size *</Label>
                  <Select name="size" value={formData.size} onValueChange={(value) => handleSelectChange("size", value)}>
                    <SelectTrigger className={`mt-1 w-full bg-input-bg text-text-main focus:bg-card-bg focus:ring-2 focus:ring-focus-brand focus:border-focus-brand ${errors.size ? "border-destructive ring-1 ring-destructive/30" : "border-theme-border-input"}`}>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_SIZES.map(s => <SelectItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.size && <p className="text-xs text-destructive mt-1">{errors.size}</p>}
                </div>
                <div>
                  <Label htmlFor="vehicle_type" className="text-xs font-semibold text-text-main tracking-wide uppercase">Preferred Type *</Label>
                  <Select name="vehicle_type" value={formData.vehicle_type} onValueChange={(value) => handleSelectChange("vehicle_type", value)}>
                    <SelectTrigger className={`mt-1 w-full bg-input-bg text-text-main focus:bg-card-bg focus:ring-2 focus:ring-focus-brand focus:border-focus-brand ${errors.vehicle_type ? "border-destructive ring-1 ring-destructive/30" : "border-theme-border-input"}`}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_TYPES.map(vt => <SelectItem key={vt} value={vt}>{vt.charAt(0) + vt.slice(1).toLowerCase()}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.vehicle_type && <p className="text-xs text-destructive mt-1">{errors.vehicle_type}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="location" className="text-xs font-semibold text-text-main tracking-wide uppercase">Location (Optional)</Label>
                <Select name="location" value={formData.location} onValueChange={(value) => handleSelectChange("location", value)}>
                  <SelectTrigger className={`mt-1 w-full bg-input-bg text-text-main focus:bg-card-bg focus:ring-2 focus:ring-focus-brand focus:border-focus-brand ${errors.location ? "border-destructive ring-1 ring-destructive/30" : "border-theme-border-input"}`}>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None</SelectItem>
                    {SLOT_LOCATIONS.map(loc => <SelectItem key={loc} value={loc}>{loc.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.location && <p className="text-xs text-destructive mt-1">{errors.location}</p>}
              </div>

              <div>
                <Label htmlFor="status" className="text-xs font-semibold text-text-main tracking-wide uppercase">Status *</Label>
                <Select name="status" value={formData.status} onValueChange={(value) => handleSelectChange("status", value)}>
                  <SelectTrigger className={`mt-1 w-full bg-input-bg text-text-main focus:bg-card-bg focus:ring-2 focus:ring-focus-brand focus:border-focus-brand ${errors.status ? "border-destructive ring-1 ring-destructive/30" : "border-theme-border-input"}`}>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {PARKING_SLOT_STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.status && <p className="text-xs text-destructive mt-1">{errors.status}</p>}
              </div>
            </div>
            <DialogFooter className="pt-6">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoadingMutation}>Cancel</Button>
              <Button type="submit" disabled={isLoadingMutation} className="bg-brand-yellow hover:bg-brand-yellow-hover text-text-on-brand font-semibold">
                {isLoadingMutation && <Loader size="sm" className="mr-2" colorClassName="border-text-on-brand" />}
                {isEditMode ? "Update Slot" : "Create Slot"}
              </Button>
            </DialogFooter>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};