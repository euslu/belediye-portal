-- CreateTable
CREATE TABLE "AdChangeLog" (
    "id"          SERIAL NOT NULL,
    "username"    TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "changeType"  TEXT NOT NULL,
    "oldValue"    TEXT,
    "newValue"    TEXT,
    "detectedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notified"    BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AdChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDevice" (
    "id"           SERIAL NOT NULL,
    "username"     TEXT NOT NULL,
    "deviceName"   TEXT NOT NULL,
    "deviceType"   TEXT NOT NULL DEFAULT 'DIGER',
    "serialNumber" TEXT,
    "assignedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active"       BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UserDevice_pkey" PRIMARY KEY ("id")
);
