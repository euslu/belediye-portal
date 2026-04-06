-- AlterTable
ALTER TABLE "HatAtamasi" ADD COLUMN     "cihaz" TEXT,
ADD COLUMN     "iccid" TEXT,
ADD COLUMN     "ip" TEXT,
ADD COLUMN     "network" TEXT,
ADD COLUMN     "teslimDurumu" TEXT,
ALTER COLUMN "username" DROP NOT NULL,
ALTER COLUMN "hatTipi" SET DEFAULT 'm2m_data';

-- CreateTable
CREATE TABLE "CihazEnvanter" (
    "id" SERIAL NOT NULL,
    "daireBaskanlik" TEXT,
    "kullanici" TEXT,
    "username" TEXT,
    "cihazMarka" TEXT,
    "cihazModel" TEXT,
    "cihazSeriNo" TEXT,
    "cihazTuru" TEXT,
    "cihazImei" TEXT,
    "gsmHatSeriNo" TEXT,
    "gsmHatTelNo" TEXT,
    "paketTuru" TEXT,
    "paketGb" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "notlar" TEXT,
    "olusturmaTarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellenmeTarih" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CihazEnvanter_pkey" PRIMARY KEY ("id")
);
