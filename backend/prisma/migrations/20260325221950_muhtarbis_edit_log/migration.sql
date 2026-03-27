-- CreateTable
CREATE TABLE "MuhtarbisEditLog" (
    "id" SERIAL NOT NULL,
    "objectId" INTEGER NOT NULL,
    "alan" TEXT NOT NULL,
    "eskiDeger" TEXT,
    "yeniDeger" TEXT,
    "duzenleyenId" TEXT NOT NULL,
    "duzenleyenAd" TEXT NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MuhtarbisEditLog_pkey" PRIMARY KEY ("id")
);
