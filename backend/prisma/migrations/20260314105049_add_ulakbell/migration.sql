-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TicketSource" ADD VALUE 'MUHTAR';
ALTER TYPE "TicketSource" ADD VALUE 'VATANDAS';
ALTER TYPE "TicketSource" ADD VALUE 'DIGER';

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "binaId" INTEGER,
ADD COLUMN     "ilceId" INTEGER,
ADD COLUMN     "mahalleId" INTEGER,
ADD COLUMN     "sokakId" INTEGER,
ADD COLUMN     "ulakbellToken" TEXT;
