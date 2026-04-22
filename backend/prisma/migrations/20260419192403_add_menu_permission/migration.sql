-- CreateTable
CREATE TABLE "MenuPermission" (
    "id" SERIAL NOT NULL,
    "menuKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT,
    "route" TEXT NOT NULL,
    "groupLabel" TEXT,
    "groupOrder" INTEGER NOT NULL DEFAULT 0,
    "itemOrder" INTEGER NOT NULL DEFAULT 0,
    "herkes" BOOLEAN NOT NULL DEFAULT false,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "exactEnd" BOOLEAN NOT NULL DEFAULT false,
    "sistemRoller" TEXT,
    "directorates" TEXT,
    "departments" TEXT,
    "grupIds" TEXT,
    "usernames" TEXT,
    "showApprovalBadge" BOOLEAN NOT NULL DEFAULT false,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MenuPermission_menuKey_key" ON "MenuPermission"("menuKey");
