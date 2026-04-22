-- CreateTable
CREATE TABLE "DeviceLicense" (
    "id" SERIAL NOT NULL,
    "deviceId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceLicense_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DeviceLicense" ADD CONSTRAINT "DeviceLicense_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
