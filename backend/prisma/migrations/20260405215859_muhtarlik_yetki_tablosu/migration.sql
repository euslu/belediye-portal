-- CreateTable
CREATE TABLE "MuhtarlikYetki" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "ilce" TEXT NOT NULL,
    "yetkiTuru" TEXT NOT NULL DEFAULT 'okuma',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MuhtarlikYetki_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MuhtarlikYetki_username_ilce_key" ON "MuhtarlikYetki"("username", "ilce");
