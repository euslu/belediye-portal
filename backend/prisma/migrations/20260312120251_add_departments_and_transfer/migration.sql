-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "departmentId" INTEGER;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "departmentId" INTEGER,
ADD COLUMN     "targetDeptId" INTEGER,
ADD COLUMN     "transferAt" TIMESTAMP(3),
ADD COLUMN     "transferBy" TEXT,
ADD COLUMN     "transferNote" TEXT;

-- CreateTable
CREATE TABLE "Department" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "managerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketTransferLog" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "fromDeptId" INTEGER NOT NULL,
    "toDeptId" INTEGER NOT NULL,
    "fromGroupId" INTEGER,
    "toGroupId" INTEGER,
    "note" TEXT,
    "transferBy" TEXT NOT NULL,
    "transferAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketTransferLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_shortCode_key" ON "Department"("shortCode");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketTransferLog" ADD CONSTRAINT "TicketTransferLog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketTransferLog" ADD CONSTRAINT "TicketTransferLog_fromDeptId_fkey" FOREIGN KEY ("fromDeptId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketTransferLog" ADD CONSTRAINT "TicketTransferLog_toDeptId_fkey" FOREIGN KEY ("toDeptId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
