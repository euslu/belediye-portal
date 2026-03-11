/*
  Warnings:

  - You are about to drop the column `building` on the `Location` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Location` table. All the data in the column will be lost.
  - You are about to drop the column `floor` on the `Location` table. All the data in the column will be lost.
  - You are about to drop the column `room` on the `Location` table. All the data in the column will be lost.
  - You are about to drop the `LocationDevice` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('BILGISAYAR', 'DIZUSTU', 'IPAD_TABLET', 'IP_TELEFON', 'MONITOR', 'YAZICI', 'SWITCH', 'ACCESS_POINT', 'SUNUCU', 'UPS', 'DIGER');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ACTIVE', 'PASSIVE', 'BROKEN', 'TRANSFERRED');

-- DropForeignKey
ALTER TABLE "LocationDevice" DROP CONSTRAINT "LocationDevice_locationId_fkey";

-- DropIndex
DROP INDEX "Location_name_key";

-- AlterTable
ALTER TABLE "Location" DROP COLUMN "building",
DROP COLUMN "description",
DROP COLUMN "floor",
DROP COLUMN "room",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT;

-- DropTable
DROP TABLE "LocationDevice";

-- CreateTable
CREATE TABLE "Device" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DeviceType" NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "ipAddress" TEXT,
    "macAddress" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "warrantyEnd" TIMESTAMP(3),
    "status" "DeviceStatus" NOT NULL DEFAULT 'ACTIVE',
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "locationId" INTEGER,
    "assignedTo" TEXT,
    "directorate" TEXT,
    "department" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("username") ON DELETE SET NULL ON UPDATE CASCADE;
