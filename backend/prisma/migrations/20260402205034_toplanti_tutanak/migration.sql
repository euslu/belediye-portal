-- AlterTable
ALTER TABLE "Toplanti" ADD COLUMN     "tutanakDosya" TEXT,
ADD COLUMN     "tutanakYukleme" TIMESTAMP(3),
ADD COLUMN     "tutanakYukleyen" TEXT;
