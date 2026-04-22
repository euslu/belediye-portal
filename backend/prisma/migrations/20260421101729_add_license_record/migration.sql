-- CreateTable
CREATE TABLE "LicenseRecord" (
    "id" SERIAL NOT NULL,
    "deviceLicenseId" INTEGER,
    "deviceId" INTEGER,
    "deviceName" TEXT NOT NULL,
    "username" TEXT,
    "directorate" TEXT,
    "department" TEXT,
    "licenseName" TEXT NOT NULL,
    "licenseKey" TEXT,
    "baslangicTarihi" TIMESTAMP(3),
    "bitisTarihi" TIMESTAMP(3),
    "sinirsiz" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LicenseRecord_pkey" PRIMARY KEY ("id")
);

-- Backfill: mevcut DeviceLicense kayıtlarını LicenseRecord'a kopyala
INSERT INTO "LicenseRecord" ("deviceLicenseId", "deviceId", "deviceName", "username", "directorate", "department", "licenseName", "licenseKey", "baslangicTarihi", "bitisTarihi", "sinirsiz", "active", "createdAt", "updatedAt")
SELECT
    dl.id,
    dl."deviceId",
    COALESCE(dl."deviceName", d.name, 'Bilinmiyor'),
    COALESCE(dl.username, d."assignedTo"),
    d.directorate,
    d.department,
    dl.name,
    dl.key,
    dl."baslangicTarihi",
    dl."bitisTarihi",
    dl.sinirsiz,
    true,
    dl."createdAt",
    NOW()
FROM "DeviceLicense" dl
LEFT JOIN "Device" d ON d.id = dl."deviceId";
