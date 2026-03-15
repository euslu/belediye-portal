-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "adresId" INTEGER,
ADD COLUMN     "ulakbellNumber" INTEGER,
ADD COLUMN     "ulakbellSentAt" TIMESTAMP(3),
ADD COLUMN     "ulakbellStatus" TEXT;
