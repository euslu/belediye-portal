-- AlterTable
ALTER TABLE "User" ADD COLUMN     "flexSyncedAt" TIMESTAMP(3),
ADD COLUMN     "flexcityOrgutId" INTEGER,
ADD COLUMN     "gorev" TEXT,
ADD COLUMN     "kadro" TEXT,
ADD COLUMN     "pdksNo" TEXT;

-- CreateTable
CREATE TABLE "FlexcityOrgut" (
    "id" INTEGER NOT NULL,
    "adi" TEXT NOT NULL,
    "sabitAdi" TEXT,
    "kod" TEXT,
    "durum" TEXT,
    "ustId" INTEGER,
    "servisTuru" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlexcityOrgut_pkey" PRIMARY KEY ("id")
);
