-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "encrypted" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardWidget" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "roles" TEXT NOT NULL,
    "defaultOn" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DashboardWidget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDashboardConfig" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "widgets" TEXT NOT NULL,
    "layout" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDashboardConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleDashboardConfig" (
    "id" SERIAL NOT NULL,
    "role" TEXT NOT NULL,
    "widgets" TEXT NOT NULL,

    CONSTRAINT "RoleDashboardConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardWidget_key_key" ON "DashboardWidget"("key");

-- CreateIndex
CREATE UNIQUE INDEX "UserDashboardConfig_username_key" ON "UserDashboardConfig"("username");

-- CreateIndex
CREATE UNIQUE INDEX "RoleDashboardConfig_role_key" ON "RoleDashboardConfig"("role");
