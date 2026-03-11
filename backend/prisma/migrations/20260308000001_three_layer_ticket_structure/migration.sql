-- 3-Katmanlı Ticket Başvuru Yapısı
-- SubmitType → Category (user-friendly) → Subject (teknik, group routing)

-- 1. Category tablosundan eski ilişkiyi kaldır
ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_defaultGroupId_fkey";
ALTER TABLE "Category" DROP COLUMN IF EXISTS "defaultGroupId";
ALTER TABLE "Category" DROP COLUMN IF EXISTS "type";

-- 2. Category tablosuna yeni sütunlar ekle
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "icon" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "typeId" INTEGER;

-- 3. SubmitType FK ekle
ALTER TABLE "Category" ADD CONSTRAINT "Category_typeId_fkey"
  FOREIGN KEY ("typeId") REFERENCES "SubmitType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Subject tablosu oluştur
CREATE TABLE IF NOT EXISTS "Subject" (
  "id"             SERIAL PRIMARY KEY,
  "name"           TEXT NOT NULL,
  "categoryId"     INTEGER NOT NULL,
  "defaultGroupId" INTEGER,
  "active"         BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Subject_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Subject_defaultGroupId_fkey"
    FOREIGN KEY ("defaultGroupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 5. Ticket tablosuna subjectId ekle
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "subjectId" INTEGER;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. SubmitType.name benzersizliği zaten var, Category.name benzersizliği de var
-- Mevcut kategorilerin adları değişeceği için unique constraint'i kaldırıp yeniden ekleyelim
-- (Zaten mevcut olduğundan dokunmuyoruz)
