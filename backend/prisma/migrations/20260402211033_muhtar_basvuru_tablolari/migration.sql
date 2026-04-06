-- CreateTable
CREATE TABLE "Muhtar" (
    "id" SERIAL NOT NULL,
    "ilce" TEXT NOT NULL,
    "mahalle" TEXT NOT NULL,
    "muhtarAdi" TEXT NOT NULL,
    "gsm" TEXT,
    "nufus" INTEGER,
    "uavt" INTEGER,
    "muhtarOfisi" TEXT,
    "saglikOcagi" TEXT,
    "diniTesis" TEXT,
    "okul" TEXT,
    "hastane" TEXT,
    "sosyalTesis" TEXT,
    "cocukOyun" TEXT,
    "sporTesisi" TEXT,
    "muhtarbisGlobalId" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "sonGuncelleme" TIMESTAMP(3) NOT NULL,
    "olusturmaTarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleyen" TEXT,

    CONSTRAINT "Muhtar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Basvuru" (
    "id" SERIAL NOT NULL,
    "ilce" TEXT NOT NULL,
    "mahalle" TEXT NOT NULL,
    "muhtarAdi" TEXT,
    "basvuruTuru" TEXT,
    "konu" TEXT NOT NULL,
    "aciklama" TEXT,
    "daire" TEXT,
    "koordinasyonDaireleri" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'Beklemede',
    "cevap" TEXT,
    "resmiYaziNo" TEXT,
    "ekDosya" TEXT,
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "giren" TEXT NOT NULL,
    "girenAd" TEXT,
    "kaynak" TEXT NOT NULL DEFAULT 'muhtarbis',
    "muhtarbisId" TEXT,
    "guncellemeTarih" TIMESTAMP(3) NOT NULL,
    "guncelleyen" TEXT,

    CONSTRAINT "Basvuru_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Muhtar_muhtarbisGlobalId_key" ON "Muhtar"("muhtarbisGlobalId");

-- CreateIndex
CREATE UNIQUE INDEX "Muhtar_ilce_mahalle_key" ON "Muhtar"("ilce", "mahalle");
