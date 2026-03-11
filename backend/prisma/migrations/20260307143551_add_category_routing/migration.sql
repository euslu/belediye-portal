-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "defaultGroupId" INTEGER,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'TALEP';

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_defaultGroupId_fkey" FOREIGN KEY ("defaultGroupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
