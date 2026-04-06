-- CreateTable
CREATE TABLE "HatAtamasi" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "directorate" TEXT,
    "department" TEXT,
    "hatTipi" TEXT NOT NULL,
    "hatNo" TEXT,
    "operator" TEXT,
    "simNo" TEXT,
    "paket" TEXT,
    "aylikUcret" DOUBLE PRECISION,
    "baslangicTarih" TIMESTAMP(3),
    "bitisTarih" TIMESTAMP(3),
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "notlar" TEXT,
    "olusturan" TEXT,
    "olusturmaTarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellenmeTarih" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HatAtamasi_pkey" PRIMARY KEY ("id")
);
