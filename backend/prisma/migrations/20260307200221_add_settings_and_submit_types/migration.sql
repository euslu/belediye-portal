-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "email" TEXT;

-- CreateTable
CREATE TABLE "SubmitType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT DEFAULT 'indigo',
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SubmitType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubmitType_name_key" ON "SubmitType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SubmitType_key_key" ON "SubmitType"("key");
