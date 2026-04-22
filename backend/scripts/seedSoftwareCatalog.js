/**
 * Yazılım Kataloğu Seed Script
 * DEFAULT_SOFTWARE listesini SoftwareCatalog tablosuna aktarır.
 * Mevcut kayıtları atlar (upsert).
 *
 * Kullanım: node scripts/seedSoftwareCatalog.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const prisma = require('../lib/prisma');

const DEFAULT_SOFTWARE = [
  // AutoCAD
  { name: 'AutoCAD 2020', category: 'CAD' },
  { name: 'AutoCAD 2021', category: 'CAD' },
  { name: 'AutoCAD 2022', category: 'CAD' },
  { name: 'AutoCAD 2023', category: 'CAD' },
  { name: 'AutoCAD 2024', category: 'CAD' },
  { name: 'AutoCAD 2025', category: 'CAD' },
  { name: 'AutoCAD LT 2023', category: 'CAD' },
  { name: 'AutoCAD LT 2024', category: 'CAD' },
  { name: 'AutoCAD Civil 3D 2023', category: 'CAD' },
  { name: 'AutoCAD Civil 3D 2024', category: 'CAD' },
  { name: 'AutoCAD Map 3D 2023', category: 'CAD' },
  { name: 'AutoCAD Map 3D 2024', category: 'CAD' },
  // Windows
  { name: 'Windows 10 Pro', category: 'İşletim Sistemi' },
  { name: 'Windows 10 Enterprise', category: 'İşletim Sistemi' },
  { name: 'Windows 11 Pro', category: 'İşletim Sistemi' },
  { name: 'Windows 11 Enterprise', category: 'İşletim Sistemi' },
  // Office
  { name: 'Microsoft Office 2016', category: 'Ofis' },
  { name: 'Microsoft Office 2019', category: 'Ofis' },
  { name: 'Microsoft Office 2021', category: 'Ofis' },
  { name: 'Microsoft 365 Business', category: 'Ofis' },
  { name: 'Microsoft 365 Enterprise', category: 'Ofis' },
  // Revit
  { name: 'Revit 2023', category: 'CAD' },
  { name: 'Revit 2024', category: 'CAD' },
  { name: 'Revit 2025', category: 'CAD' },
  // Diğer tasarım
  { name: 'Lumion 12', category: 'Tasarım' },
  { name: 'Lumion 13', category: 'Tasarım' },
  { name: 'Lumion 14', category: 'Tasarım' },
  { name: 'Lumion 2024', category: 'Tasarım' },
  { name: 'Lumion 2025', category: 'Tasarım' },
  { name: 'StarCAD', category: 'CAD' },
  { name: 'StarCAD 2024', category: 'CAD' },
  { name: 'SketchUp Pro 2023', category: 'Tasarım' },
  { name: 'SketchUp Pro 2024', category: 'Tasarım' },
  { name: '3ds Max 2024', category: 'Tasarım' },
  { name: '3ds Max 2025', category: 'Tasarım' },
  { name: 'Navisworks 2024', category: 'CAD' },
  // GIS
  { name: 'ArcGIS Pro', category: 'GIS' },
  { name: 'ArcGIS Desktop 10.8', category: 'GIS' },
  { name: 'QGIS', category: 'GIS' },
  { name: 'NetCAD GIS', category: 'GIS' },
  { name: 'NetCAD 9', category: 'GIS' },
  // Yapay Zeka
  { name: 'GitHub Copilot', category: 'Yapay Zeka' },
  { name: 'ChatGPT Plus', category: 'Yapay Zeka' },
  { name: 'Claude Pro', category: 'Yapay Zeka' },
  { name: 'Adobe Firefly', category: 'Yapay Zeka' },
  { name: 'Midjourney', category: 'Yapay Zeka' },
  // Adobe
  { name: 'Adobe Acrobat Pro', category: 'Adobe' },
  { name: 'Adobe Photoshop', category: 'Adobe' },
  { name: 'Adobe Illustrator', category: 'Adobe' },
  { name: 'Adobe Creative Cloud', category: 'Adobe' },
  // Antivirüs
  { name: 'Kaspersky Endpoint Security', category: 'Güvenlik' },
  { name: 'ESET NOD32', category: 'Güvenlik' },
  { name: 'Bitdefender', category: 'Güvenlik' },
  // Diğer
  { name: 'Corel Draw', category: 'Tasarım' },
  { name: 'SPSS', category: 'İstatistik' },
  { name: 'MATLAB', category: 'Mühendislik' },
  { name: 'SolidWorks', category: 'CAD' },
  { name: 'Visual Studio Professional', category: 'Geliştirme' },
  { name: 'Visual Studio Enterprise', category: 'Geliştirme' },
  { name: 'JetBrains All Products', category: 'Geliştirme' },
  { name: 'Sublime Text', category: 'Geliştirme' },
  { name: 'WinRAR', category: 'Yardımcı' },
  { name: '7-Zip Pro', category: 'Yardımcı' },
  { name: 'TeamViewer', category: 'Uzak Erişim' },
  { name: 'AnyDesk', category: 'Uzak Erişim' },
  { name: 'VMware Workstation', category: 'Sanallaştırma' },
  { name: 'Hyper-V', category: 'Sanallaştırma' },
];

async function main() {
  console.log('Yazılım kataloğu seed başlıyor...');
  let created = 0, skipped = 0;

  for (const sw of DEFAULT_SOFTWARE) {
    try {
      await prisma.softwareCatalog.upsert({
        where: { name: sw.name },
        update: {},
        create: { name: sw.name, category: sw.category, totalLicenses: 0 },
      });
      created++;
    } catch (err) {
      if (err.code === 'P2002') {
        skipped++;
      } else {
        console.error(`Hata (${sw.name}):`, err.message);
      }
    }
  }

  console.log(`Tamamlandı: ${created} eklendi/mevcut, ${skipped} atlandı`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
