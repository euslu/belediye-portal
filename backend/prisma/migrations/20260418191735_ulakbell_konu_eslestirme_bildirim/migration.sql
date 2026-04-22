-- CreateTable
CREATE TABLE "MuhtarlikDuyuru" (
    "id" SERIAL NOT NULL,
    "baslik" TEXT NOT NULL,
    "mesaj" TEXT NOT NULL,
    "kanallar" TEXT NOT NULL,
    "ilceler" TEXT NOT NULL,
    "mahalleler" TEXT,
    "hedefSayisi" INTEGER NOT NULL DEFAULT 0,
    "smsBasarili" INTEGER NOT NULL DEFAULT 0,
    "smsBasarisiz" INTEGER NOT NULL DEFAULT 0,
    "emailBasarili" INTEGER NOT NULL DEFAULT 0,
    "emailBasarisiz" INTEGER NOT NULL DEFAULT 0,
    "hata" TEXT,
    "gonderen" TEXT NOT NULL,
    "gonderenAd" TEXT,
    "olusturmaTarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MuhtarlikDuyuru_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UlakbellKonuEslestirme" (
    "id" SERIAL NOT NULL,
    "ulakbellKonuId" INTEGER NOT NULL,
    "konuAdi" TEXT NOT NULL,
    "konuTuru" TEXT,
    "portalDaire" TEXT,
    "portalMudurluk" TEXT,
    "ulakbellBirim" TEXT,
    "bildirimAktif" BOOLEAN NOT NULL DEFAULT true,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UlakbellKonuEslestirme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UlakbellBildirim" (
    "id" SERIAL NOT NULL,
    "konuId" INTEGER NOT NULL,
    "basvuruNo" INTEGER NOT NULL,
    "publicToken" TEXT NOT NULL,
    "basvuruTipi" TEXT,
    "basvuranAd" TEXT,
    "ilce" TEXT,
    "mahalle" TEXT,
    "portalDaire" TEXT,
    "portalMudurluk" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'YENI',
    "okundu" BOOLEAN NOT NULL DEFAULT false,
    "okunmaTarih" TIMESTAMP(3),
    "olusturmaTarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UlakbellBildirim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MuhtarlikDuyuru_olusturmaTarih_idx" ON "MuhtarlikDuyuru"("olusturmaTarih");

-- CreateIndex
CREATE UNIQUE INDEX "UlakbellKonuEslestirme_ulakbellKonuId_key" ON "UlakbellKonuEslestirme"("ulakbellKonuId");

-- CreateIndex
CREATE INDEX "UlakbellBildirim_olusturmaTarih_idx" ON "UlakbellBildirim"("olusturmaTarih");

-- CreateIndex
CREATE INDEX "UlakbellBildirim_portalDaire_idx" ON "UlakbellBildirim"("portalDaire");

-- CreateIndex
CREATE INDEX "UlakbellBildirim_okundu_idx" ON "UlakbellBildirim"("okundu");
