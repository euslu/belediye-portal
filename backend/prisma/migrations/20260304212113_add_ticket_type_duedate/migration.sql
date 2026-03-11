-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('INCIDENT', 'REQUEST', 'CHANGE');

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "type" "TicketType" NOT NULL DEFAULT 'INCIDENT';
