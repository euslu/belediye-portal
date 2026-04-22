-- AlterTable: DeviceLicense - add username and deviceName
ALTER TABLE "DeviceLicense" ADD COLUMN "username" TEXT;
ALTER TABLE "DeviceLicense" ADD COLUMN "deviceName" TEXT;

-- AlterTable: UserDevice - add deviceId FK
ALTER TABLE "UserDevice" ADD COLUMN "deviceId" INTEGER;

-- AddForeignKey
ALTER TABLE "UserDevice" ADD CONSTRAINT "UserDevice_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Delete duplicates before adding unique constraint
DELETE FROM "UserDevice" a USING "UserDevice" b
WHERE a.id < b.id AND a."username" = b."username" AND a."deviceName" = b."deviceName";

-- CreateIndex: unique constraint on UserDevice(username, deviceName)
CREATE UNIQUE INDEX "UserDevice_username_deviceName_key" ON "UserDevice"("username", "deviceName");
