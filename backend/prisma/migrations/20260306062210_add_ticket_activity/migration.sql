-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('CREATED', 'ASSIGNED', 'REASSIGNED', 'STATUS_CHANGED', 'COMMENTED', 'PRIORITY_CHANGED', 'GROUP_CHANGED');

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "isInternal" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TicketActivity" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "userId" INTEGER,
    "action" "ActivityAction" NOT NULL,
    "fromValue" TEXT,
    "toValue" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketActivity_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TicketActivity" ADD CONSTRAINT "TicketActivity_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
