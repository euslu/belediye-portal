-- CreateTable
CREATE TABLE "Lokasyon" (
    "id" SERIAL NOT NULL,
    "ad" TEXT NOT NULL,
    "kisaAd" TEXT,
    "adres" TEXT,
    "ilce" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "tip" TEXT NOT NULL DEFAULT 'hizmet_binasi',
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "personelSayisi" INTEGER,
    "olusturmaTarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lokasyon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lokasyon_ad_key" ON "Lokasyon"("ad");
