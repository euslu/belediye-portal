-- AlterTable
ALTER TABLE "DeviceLicense" ADD COLUMN     "baslangicTarihi" TIMESTAMP(3),
ADD COLUMN     "bitisTarihi" TIMESTAMP(3),
ADD COLUMN     "sinirsiz" BOOLEAN NOT NULL DEFAULT false;
