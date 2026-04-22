-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityAction" ADD VALUE 'RETURN_REQUESTED';
ALTER TYPE "ActivityAction" ADD VALUE 'RETURN_APPROVED';
ALTER TYPE "ActivityAction" ADD VALUE 'RETURN_REJECTED';

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "assignedGroupId" INTEGER,
ADD COLUMN     "slaHours" INTEGER,
ADD COLUMN     "slaWarningHours" INTEGER;

-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "slaHours" INTEGER,
ADD COLUMN     "slaWarningHours" INTEGER;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "iadeAciklama" TEXT,
ADD COLUMN     "iadeDurumu" TEXT,
ADD COLUMN     "iadeOnayTarih" TIMESTAMP(3),
ADD COLUMN     "iadeOnayci" TEXT,
ADD COLUMN     "iadeYonlendirId" INTEGER;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_assignedGroupId_fkey" FOREIGN KEY ("assignedGroupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_iadeYonlendirId_fkey" FOREIGN KEY ("iadeYonlendirId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
