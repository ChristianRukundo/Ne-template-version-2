/*
  Warnings:

  - Added the required column `calculated_cost` to the `SlotRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ParkingSlot" ADD COLUMN     "cost_per_hour" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "SlotRequest" ADD COLUMN     "calculated_cost" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "expected_duration_hours" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "balance" DECIMAL(65,30) NOT NULL DEFAULT 0.00;
