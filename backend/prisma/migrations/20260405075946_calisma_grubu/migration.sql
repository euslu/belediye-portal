-- CreateTable
CREATE TABLE "CalismaGrubu" (
    "id" SERIAL NOT NULL,
    "ad" TEXT NOT NULL,
    "aciklama" TEXT,
    "directorate" TEXT NOT NULL,
    "department" TEXT,
    "lider" TEXT,
    "liderAd" TEXT,
    "olusturan" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "olusturmaTarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellenmeTarih" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalismaGrubu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalismaGrubuUye" (
    "id" SERIAL NOT NULL,
    "grubuId" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "rol" TEXT NOT NULL DEFAULT 'uye',
    "eklenmeTarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalismaGrubuUye_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalismaGrubuUye_grubuId_username_key" ON "CalismaGrubuUye"("grubuId", "username");

-- AddForeignKey
ALTER TABLE "CalismaGrubuUye" ADD CONSTRAINT "CalismaGrubuUye_grubuId_fkey" FOREIGN KEY ("grubuId") REFERENCES "CalismaGrubu"("id") ON DELETE CASCADE ON UPDATE CASCADE;
