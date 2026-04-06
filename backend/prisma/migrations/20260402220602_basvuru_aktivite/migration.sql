-- CreateTable
CREATE TABLE "BasvuruAktivite" (
    "id" SERIAL NOT NULL,
    "basvuruId" INTEGER NOT NULL,
    "tip" TEXT NOT NULL,
    "icerik" TEXT NOT NULL,
    "eskiDeger" TEXT,
    "yeniDeger" TEXT,
    "yapan" TEXT NOT NULL,
    "yapanAd" TEXT,
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BasvuruAktivite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BasvuruAktivite_basvuruId_idx" ON "BasvuruAktivite"("basvuruId");
