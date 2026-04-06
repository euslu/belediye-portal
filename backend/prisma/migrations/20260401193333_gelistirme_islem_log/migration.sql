-- CreateTable
CREATE TABLE "GelistirmeTalebi" (
    "id" SERIAL NOT NULL,
    "talepEden" TEXT NOT NULL,
    "talepEdenAd" TEXT,
    "baskaAdina" TEXT,
    "konu" TEXT NOT NULL,
    "icerik" TEXT NOT NULL,
    "aciliyet" TEXT NOT NULL DEFAULT 'normal',
    "durum" TEXT NOT NULL DEFAULT 'beklemede',
    "yanit" TEXT,
    "olusturmaTarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellemeTarih" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GelistirmeTalebi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IslemGecmisi" (
    "id" SERIAL NOT NULL,
    "kullanici" TEXT NOT NULL,
    "kullaniciAd" TEXT,
    "islem" TEXT NOT NULL,
    "modul" TEXT NOT NULL,
    "kayitId" TEXT,
    "detay" TEXT,
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,

    CONSTRAINT "IslemGecmisi_pkey" PRIMARY KEY ("id")
);
