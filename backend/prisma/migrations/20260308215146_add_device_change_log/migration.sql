-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "lastSyncAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DeviceChangeLog" (
    "id" SERIAL NOT NULL,
    "deviceId" INTEGER NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changeType" TEXT NOT NULL,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceChangeLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DeviceChangeLog" ADD CONSTRAINT "DeviceChangeLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
