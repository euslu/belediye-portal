-- CreateEnum
CREATE TYPE "TicketSource" AS ENUM ('PORTAL', 'EMAIL', 'PHONE', 'IN_PERSON', 'API');

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "source" "TicketSource" NOT NULL DEFAULT 'PORTAL';
