import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "react-query";
import { toast } from "react-hot-toast";
import { z } from "zod";
import { motion } from "framer-motion";
import { ParkingCircle } from "lucide-react";
import {
  adminCreateParkingSlot,
  adminUpdateParkingSlot,
} from "../../api/parking-slot"; // Adjust path
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

// Enum values from your backend schema (important to keep in sync)
// These should ideally be shared from a constants file or fetched if dynamic
const VEHICLE_TYPES = ["CAR", "MOTORCYCLE", "TRUCK", "BICYCLE"];
const VEHICLE_SIZES = ["SMALL", "MEDIUM", "LARGE", "EXTRA_LARGE"];
const SLOT_LOCATIONS = [
  "NORTH_WING",
  "SOUTH_WING",
  "EAST_WING",
  "WEST_WING",
  "LEVEL_1",
  "LEVEL_2",
];
const PARKING_SLOT_STATUSES = ["AVAILABLE", "UNAVAILABLE", "MAINTENANCE"];

// Validation schema for Parking Slot
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
  location: z.enum(SLOT_LOCATIONS).optional().nullable().or(z.literal("")), // Allow empty string for "None"
  status: z.enum(PARKING_SLOT_STATUSES, {
    required_error: "Status is required.",
  }),
});

export const ParkingSlotForm = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const queryClient = useQueryClient();
  const isEditMode = !!initialData;

  const [formData, setFormData] = useState({
    slot_number: "",
    size: "",
    vehicle_type: "",
    location: "", // Represent "None" or empty with ""
    status: "AVAILABLE",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      // Reset form when it opens or initialData changes
      if (isEditMode && initialData) {
        setFormData({
          slot_number: initialData.slot_number || "",
          size: initialData.size || "",
          vehicle_type: initialData.vehicle_type || "",
          location: initialData.location || "", // Handles null from DB
          status: initialData.status || "AVAILABLE",
        });
      } else {
        setFormData({
          slot_number: "",
          size: "",
          vehicle_type: "",
          location: "",
          status: "AVAILABLE",
        });
      }
      setErrors({});
    }
  }, [isOpen, initialData, isEditMode]);

  const mutationOptions = {
    onSuccess: () => {
      toast.success(
        `Parking slot ${isEditMode ? "updated" : "created"} successfully!`
      );
      onSuccess(); // Prop function to refetch list and close modal
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
          `Failed to ${isEditMode ? "update" : "create"} parking slot.`
      );
    },
  };

  const createMutation = useMutation(adminCreateParkingSlot, mutationOptions);
  const updateMutation = useMutation(
    (data) => adminUpdateParkingSlot(initialData.id, data),
    mutationOptions
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value === "NONE" ? "" : value })); // Handle "None" for optional location
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const dataToSubmit = {
      ...formData,
      slot_number: formData.slot_number.toUpperCase().trim(),
      // Prisma expects null for optional empty relations, not empty string
      location: formData.location === "" ? null : formData.location,
    };

    try {
      const parsedData = parkingSlotSchema.parse(dataToSubmit);
      if (isEditMode) {
        updateMutation.mutate(parsedData);
      } else {
        createMutation.mutate(parsedData);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors = {};
        error.errors.forEach((err) => {
          newErrors[err.path[0]] = err.message;
        });
        setErrors(newErrors);
        toast.error("Please correct the form errors.");
      } else {
        toast.error("An unexpected error occurred during submission.");
        console.error("Submission error:", error);
      }
    }
  };

  if (!isOpen) return null;

  const isLoadingMutation =
    createMutation.isLoading || updateMutation.isLoading;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <ParkingCircle className="mr-2 h-6 w-6 text-blue-600" />
              {isEditMode ? "Edit Parking Slot" : "Add New Parking Slot"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Update the details of the parking slot."
                : "Fill in the details to create a new parking slot."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="slot_number">Slot Number *</Label>
                <Input
                  id="slot_number"
                  name="slot_number"
                  value={formData.slot_number}
                  onChange={handleChange}
                  className={`mt-1 ${
                    errors.slot_number ? "border-red-500" : ""
                  }`}
                  placeholder="e.g., A101"
                />
                {errors.slot_number && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.slot_number}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="size">Size *</Label>
                  <Select
                    name="size"
                    value={formData.size}
                    onValueChange={(value) => handleSelectChange("size", value)}
                  >
                    <SelectTrigger
                      className={`mt-1 w-full ${
                        errors.size ? "border-red-500" : ""
                      }`}
                    >
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_SIZES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.charAt(0) + s.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.size && (
                    <p className="text-sm text-red-500 mt-1">{errors.size}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="vehicle_type">Preferred Vehicle Type *</Label>
                  <Select
                    name="vehicle_type"
                    value={formData.vehicle_type}
                    onValueChange={(value) =>
                      handleSelectChange("vehicle_type", value)
                    }
                  >
                    <SelectTrigger
                      className={`mt-1 w-full ${
                        errors.vehicle_type ? "border-red-500" : ""
                      }`}
                    >
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_TYPES.map((vt) => (
                        <SelectItem key={vt} value={vt}>
                          {vt.charAt(0) + vt.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.vehicle_type && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.vehicle_type}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Select
                  name="location"
                  value={formData.location}
                  onValueChange={(value) =>
                    handleSelectChange("location", value)
                  }
                >
                  <SelectTrigger
                    className={`mt-1 w-full ${
                      errors.location ? "border-red-500" : ""
                    }`}
                  >
                    <SelectValue placeholder="Select location (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None</SelectItem>{" "}
                    {/* Explicit "None" option */}
                    {SLOT_LOCATIONS.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.location && (
                  <p className="text-sm text-red-500 mt-1">{errors.location}</p>
                )}
              </div>

              <div>
                <Label htmlFor="status">Status *</Label>
                <Select
                  name="status"
                  value={formData.status}
                  onValueChange={(value) => handleSelectChange("status", value)}
                >
                  <SelectTrigger
                    className={`mt-1 w-full ${
                      errors.status ? "border-red-500" : ""
                    }`}
                  >
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {PARKING_SLOT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0) + s.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.status && (
                  <p className="text-sm text-red-500 mt-1">{errors.status}</p>
                )}
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoadingMutation}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoadingMutation}
                className="bg-brand-yellow/80 hover:bg-brand-yellow/60"
              >
                {isLoadingMutation && (
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditMode ? "Update Slot" : "Create Slot"}
              </Button>
            </DialogFooter>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
