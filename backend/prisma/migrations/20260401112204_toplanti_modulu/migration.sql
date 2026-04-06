-- CreateTable
CREATE TABLE "Toplanti" (
    "id" SERIAL NOT NULL,
    "baslik" TEXT NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL,
    "saat" TEXT NOT NULL,
    "yer" TEXT,
    "tip" TEXT NOT NULL DEFAULT 'muhtarlar',
    "durum" TEXT NOT NULL DEFAULT 'planli',
    "aciklama" TEXT,
    "not" TEXT,
    "olusturan" TEXT NOT NULL,
    "olusturmaTarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellenmeTarih" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Toplanti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToplantiKatilimci" (
    "id" SERIAL NOT NULL,
    "toplantiId" INTEGER NOT NULL,
    "tip" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "ilce" TEXT,
    "mahalle" TEXT,
    "katildi" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ToplantiKatilimci_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToplantiGundem" (
    "id" SERIAL NOT NULL,
    "toplantiId" INTEGER NOT NULL,
    "sira" INTEGER NOT NULL,
    "konu" TEXT NOT NULL,
    "aciklama" TEXT,
    "sure" INTEGER,
    "tamamlandi" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ToplantiGundem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ToplantiKatilimci" ADD CONSTRAINT "ToplantiKatilimci_toplantiId_fkey" FOREIGN KEY ("toplantiId") REFERENCES "Toplanti"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToplantiGundem" ADD CONSTRAINT "ToplantiGundem_toplantiId_fkey" FOREIGN KEY ("toplantiId") REFERENCES "Toplanti"("id") ON DELETE CASCADE ON UPDATE CASCADE;
