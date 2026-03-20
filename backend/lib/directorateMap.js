'use strict';

/**
 * Muğla Büyükşehir Belediyesi — Organizasyon Yapısı
 * Kaynak: Portal /api/users (1.981 personel, 34 daire, 165 departman)
 * Güncelleme: 2026-03-15
 *
 * MAP otomatik olarak DIRECTORATES array'inden üretilir.
 * Yeni daire/müdürlük eklemek için sadece DIRECTORATES'i düzenleyin.
 */

const DIRECTORATES = [
  {
    name: 'Afet İşleri ve Risk Yönetimi Dairesi Başkanlığı',
    departments: [
      'Afet İşleri Ve Risk Yönetimi Dairesi Başkanlığı',
      'Akom Şube Müdürlüğü',
      'Deprem Ve Risk Yönetimi Şube Müdürlüğü',
      'Müdahale ve Kentsel Arama Kurtarma Şube Müdürlüğü',
      'Müdahale Ve Kentsel Arama Kurtarma Şube Müdürlüğü',
      'Önleme Şube Müdürlüğü',
      'Planlama Ve Eğitim Şube Müdürlüğü',
    ],
  },
  {
    name: 'Akıllı Şehir ve Kent Bilgi Sistemleri Dairesi Başkanlığı',
    departments: [
      'Akıllı Şehir Ve Kent Bilgi Sistemleri Dairesi Başkanlığı',
      'Akıllı Şehir Ve Kent Bilgi Sistemleri Dairesi Başkanlığı Persone',
    ],
  },
  {
    name: 'Basın Yayın ve Halkla İlişkiler Dairesi Başkanlığı',
    departments: [
      'Basın Yayın Şube Müdürlüğü',
      'Basın Yayın Ve Halkla İlişkiler Dairesi Başkanlığı',
      'Çağrı Merkezi',
      'Halkla İlişkiler Şube Müdürlüğü',
      'Sivil Toplum Kuruluşları İletişim Şube Müdürlüğü',
      'Tören Ve Organizasyon Şube Müdürlüğü',
    ],
  },
  {
    name: 'Başkanlık',
    departments: [
      'Başkan',
    ],
  },
  {
    name: 'Bilgi İşlem Dairesi Başkanlığı',
    departments: [
      'Bilgi İşlem Dairesi Başkanlığı',
      'Bilgi Teknolojileri Şube Müdürlüğü',
      'Coğrafi Bilgi Sistemleri Şube Müdürlüğü',
      'Sistem Ve Altyapı Şube Müdürlüğü',
      // eski isimler (AD'de hâlâ görünebilir)
      'Sistem, Ağ Ve Veri Güvenliği Şube Müdürlüğü',
      'Elektronik Ve Altyapı Şube Müdürlüğü',
      'Yazılım Şube Müdürlüğü',
      'Yazılım Geliştirme Şube Müdürlüğü',
    ],
  },
  {
    name: 'Çevre Koruma ve Kontrol Dairesi Başkanlığı',
    departments: [
      'Atık Yönetimi Şube Müdürlüğü',
      'Çevre Koruma Ve Kontrol Dairesi Başkanlığı',
      'Çevre Koruma Şube Müdürlüğü',
      'Çevre Sağlığı Ve Denetim Şube Müdürlüğü',
      'Geri Dönüşüm Şube Müdürlüğü',
      'İklim Değişikliği Ve Sıfır Atık Şube Müdürlüğü',
      // eski isimler
      'Çevre Yönetimi Ve Kent Temizliği Şube Müdürlüğü',
      'Çevre Yönetimi ve Kent Temizliği Şube Müdürlüğü',
      'Hafriyat Yönetimi Ve Denetim Şube Müdürlüğü',
      'Hafriyat Yönetimi ve Denetim Şube Müdürlüğü',
      'Çevre Ve İklim Politikaları Şube Müdürlüğü',
      'Mezbaha Hizmetleri Şube Müdürlüğü',
      'Hal Şube Müdürlüğü',
    ],
  },
  {
    name: 'Destek Hizmetleri Dairesi Başkanlığı',
    departments: [
      'Bina, Tesis Bakım Onarım Ve İdari İşler Şube Müdürlüğü',
      'Destek Hizmetleri Dairesi Başkanlığı',
      'İş Sağlığı Ve Güvenliği Şube Müdürlüğü',
      'İşçi Hizmetleri Şube Müdürlüğü',
      'Satın Alma Şube Müdürlüğü',
      'Taşıt İşletme Şube Müdürlüğü',
      // eski isimler
      'Makine Ve İkmal Şube Müdürlüğü',
      'Makine ve İkmal Şube Müdürlüğü',
      'İhale,Satın Alma ve Taşınır Mal, Ambarlar Şube Müdürlüğü',
      'İhale,satın Alma Ve Taşınır Mal, Ambarlar Şube Müdürlüğü',
      'Satın Alma Ve Mali İşler Şefliği',
      'Hizmet Araçları Takip Ve Filo Yönetim Şefliği',
      'İdari İşler Ve Lojistik Şube Müdürlüğü',
      'İdari İşler Ve Arşiv Şefliği',
    ],
  },
  {
    name: 'Dış İlişkiler Dairesi Başkanlığı',
    departments: [
      'AB Ve Dış İlişkiler Şube Müdürlüğü',
      'Dış İlişkiler Dairesi Başkanlığı',
      'Kardeş Şehir İlişkileri Şube Müdürlüğü',
      // eski isimler
      'Uluslararası İlişkiler Şube Müdürlüğü',
      'Fon Ve Projeler Şube Müdürlüğü',
      'Strateji Şube Müdürlüğü',
    ],
  },
  {
    name: 'Emlak ve İstimlak Dairesi Başkanlığı',
    departments: [
      'Emlak Ve İstimlak Dairesi Başkanlığı',
      'İstimlak Şube Müdürlüğü',
      'Taşınmaz Yönetimi Şube Müdürlüğü',
      // eski isimler
      'Emlak Yönetim Şube Müdürlüğü',
      'Taşınmaz Mallar Şube Müdürlüğü',
      'Kamulaştırma Şube Müdürlüğü',
    ],
  },
  {
    name: 'Etüt ve Projeler Dairesi Başkanlığı',
    departments: [
      'Etüt Ve Projeler Dairesi Başkanlığı',
      'Kentsel Tasarım Şube Müdürlüğü',
      'Peyzaj Ve Yeşil Alan Şube Müdürlüğü',
      'Proje Yönetimi Şube Müdürlüğü',
      // eski isimler
      'Enerji Yönetimi Ve Etüt Proje Şube Müdürlüğü',
      'Yapı ve Kontrol İşleri Şube Müdürlüğü',
      'Yapı Ve Kontrol İşleri Şube Müdürlüğü',
      'Teknik İşler Şefliği',
    ],
  },
  {
    name: 'Fen İşleri Dairesi Başkanlığı',
    departments: [
      'Altyapı Şube Müdürlüğü',
      'Asfalt Ve Kilit Parke Şube Müdürlüğü',
      'Fen İşleri Dairesi Başkanlığı',
      'Köy Hizmetleri Şube Müdürlüğü',
      'Sanat Yapıları Şube Müdürlüğü',
      'Yapım Şube Müdürlüğü',
      // eski isimler
      'Yol Bakım Ve İşletme Şube Müdürlüğü',
      'Yol Proje Ve Yapım Şube Müdürlüğü',
      'Yeşil Alan Planlama Yapım Ve Bakım Şube Müdürlüğü',
      'Yeşil Alan Planlama Yapım ve Bakım Şube Müdürlüğü',
      'Mezarlıklar Şube Müdürlüğü',
    ],
  },
  {
    name: 'Gençlik ve Spor Hizmetleri Dairesi Başkanlığı',
    departments: [
      'Gençlik Hizmetleri Şube Müdürlüğü',
      'Gençlik Ve Spor Hizmetleri Dairesi Başkanlığı',
      'Spor Hizmetleri Şube Müdürlüğü',
      'Spor Tesisleri Şube Müdürlüğü',
    ],
  },
  {
    name: 'Hukuk Müşavirliği',
    departments: [
      '1. Hukuk Müşavirliği',
      'Hukuk Müşavirliği',
    ],
  },
  {
    name: 'İlçe Hizmetleri 1. Bölge Dairesi Başkanlığı',
    departments: [
      'Bodrum İlçe Hizmetleri Şube Müdürlüğü',
      'İlçe Hizmetleri 1. Bölge Dairesi Başkanlığı',
      'Marmaris İlçe Hizmetleri Şube Müdürlüğü',
      'Ula İlçe Hizmetleri Şube Müdürlüğü',
      // eski
      'Datça İlçe Hizmetleri Şube Müdürlüğü',
    ],
  },
  {
    name: 'İlçe Hizmetleri 2. Bölge Dairesi Başkanlığı',
    departments: [
      'Fethiye İlçe Hizmetleri Şube Müdürlüğü',
      'İlçe Hizmetleri 2. Bölge Dairesi',
      'İlçe Hizmetleri 2. Bölge Dairesi Başkanlığı',
      'Seydikemer İlçe Hizmetleri Şube Müdürlüğü',
      'Datça İlçe Hizmetleri Şube Müdürlüğü',
      // eski
      'Dalaman İlçe Hizmetleri Şube Müdürlüğü',
    ],
  },
  {
    name: 'İlçe Hizmetleri 3. Bölge Dairesi Başkanlığı',
    departments: [
      'İlçe Hizmetleri 3. Bölge Dairesi Başkanlığı',
      'Köyceğiz İlçe Hizmetleri Şube Müdürlüğü',
      'Ortaca İlçe Hizmetleri Şube Müdürlüğü',
    ],
  },
  {
    name: 'İlçe Hizmetleri 4. Bölge Dairesi Başkanlığı',
    departments: [
      'İlçe Hizmetleri 4. Bölge Dairesi Başkanlığı',
      'Milas İlçe Hizmetleri Şube Müdürlüğü',
    ],
  },
  {
    name: 'İmar ve Şehircilik Dairesi Başkanlığı',
    departments: [
      'Harita Şube Müdürlüğü',
      'İmar Planlama Şube Müdürlüğü',
      'İmar ve Şehircilik Dairesi Başkanlığı',
      'Koruma Uygulama Ve Denetim Şube Müdürlüğü (kudeb)',
      'Üst Ölçek Planlama Ve Mevzuat Geliştirme Şube Müdürlüğü',
      'Yapı Ruhsatı Ve Kontrol Şube Müdürlüğü',
    ],
  },
  {
    name: 'İnsan Kaynakları ve Eğitim Dairesi Başkanlığı',
    departments: [
      'Eğitim Şube Müdürlüğü',
      'Eğitim Ve İdari İşler Şube Müdürlüğü',
      'İnsan Kaynakları Şube Müdürlüğü',
      'İnsan Kaynakları Ve Eğitim Dairesi Başkanlığı',
    ],
  },
  {
    name: 'İtfaiye Dairesi Başkanlığı',
    departments: [
      'İdari İşler Şube Müdürlüğü',
      'İtfaiye Dairesi Başkanlığı',
      'Müdahale Şube Müdürlüğü',
      'Önleme Ve Eğitim Şube Müdürlüğü',
    ],
  },
  {
    name: 'Kültür ve Sosyal İşler Dairesi Başkanlığı',
    departments: [
      'Kültür Hizmetleri Şube Müdürlüğü',
      'Kültür Ve Sosyal İşler Dairesi Başkanlığı',
      'Kütüphane Hizmetleri Şube Müdürlüğü',
      'Sosyal Ve Kültürel Etkinlikler Şube Müdürlüğü',
      // eski isimler (Kültür, Sanat ve Sosyal İşler)
      'Kültür, Sanat Ve Sosyal İşler Dairesi Başkanlığı',
      'Kültür Ve Sosyal İşler Şube Müdürlüğü',
      'Konservatuar Şube Müdürlüğü',
      'Kültürel Mirası Koruma Şube Müdürlüğü',
      'Kültürel Mirası Tanıtım Ve Yönetim Şube Müdürlüğü',
      'Kültür Tesisleri Şube Müdürlüğü',
      'Kent Belleği Ve Kültür Merkezi Şube Müdürlüğü',
    ],
  },
  {
    name: 'Mali Hizmetler Dairesi Başkanlığı',
    departments: [
      'Bütçe Ve Performans Şube Müdürlüğü',
      'Gelir Şube Müdürlüğü',
      'Mali Hizmetler Dairesi Başkanlığı',
      'Muhasebe Şube Müdürlüğü',
      'Ön Mali Kontrol Şube Müdürlüğü',
      // eski isimler
      'Gelirler Şube Müdürlüğü',
      'Bütçe Ve Mali Kontrol Şube Müdürlüğü',
      'Bütçe ve Mali Kontrol Şube Müdürlüğü',
      'Bordro Ve Tahakkuk Şube Müdürlüğü',
      'Bordro ve Tahakkuk Şube Müdürlüğü',
      'Tahsilat Şefliği',
      'Yapım İşleri İhale Şube Müdürlüğü',
    ],
  },
  {
    name: 'Muğla Su ve Kanalizasyon İdaresi (MUSKİ)',
    departments: [
      'Arıtma Tesisleri Dairesi Başkanlığı',
      'Atıksu Dairesi Başkanlığı',
      'Muski Genel Müdürlüğü',
      'Su Dairesi Başkanlığı',
    ],
  },
  {
    name: 'Park ve Bahçeler Dairesi Başkanlığı',
    departments: [
      'Ağaçlandırma Ve Fidanlık Şube Müdürlüğü',
      'Park Ve Bahçeler Dairesi Başkanlığı',
      'Park Ve Bahçeler Şube Müdürlüğü',
      'Peyzaj Düzenleme Şube Müdürlüğü',
      'Sulama Ve Bakım Şube Müdürlüğü',
    ],
  },
  {
    name: 'Rehberlik ve Teftiş Kurulu Başkanlığı',
    departments: [
      'Rehberlik Ve Teftiş Kurulu Başkanlığı',
    ],
  },
  {
    name: 'Ruhsat ve Denetim Dairesi Başkanlığı',
    departments: [
      'İşyeri Açma Ve Çalışma Ruhsatları Şube Müdürlüğü',
      'Ruhsat Ve Denetim Dairesi Başkanlığı',
      'Yapı Kontrol Şube Müdürlüğü',
      // eski (Zabıta altındaydı)
      'Ruhsat Ve Denetim Şube Müdürlüğü',
    ],
  },
  {
    name: 'Sağlık ve Sosyal Hizmetler Dairesi Başkanlığı',
    departments: [
      'Engelli Hizmetleri Şube Müdürlüğü',
      'Sağlık Hizmetleri Şube Müdürlüğü',
      'Sağlık Ve Sosyal Hizmetler Dairesi Başkanlığı',
      'Sosyal Hizmetler Şube Müdürlüğü',
      'Sosyal İnovasyon Ve Yurttaş Refahı Şube Müdürlüğü',
      'Şehit Yakınları Ve Gaziler Şube Müdürlüğü',
      'Yaşlı Hizmetleri Şube Müdürlüğü',
    ],
  },
  {
    name: 'Strateji Geliştirme Dairesi Başkanlığı',
    departments: [
      'İç Kontrol Şube Müdürlüğü',
      'Strateji Geliştirme Dairesi Başkanlığı',
      'Stratejik Planlama Ve Performans Şube Müdürlüğü',
    ],
  },
  {
    name: 'Tarımsal Hizmetler Dairesi Başkanlığı',
    departments: [
      'Tarım Ve Hayvancılık Araştırma Destekleme Ve Eğitim Şube Müdürlü',
      'Tarım Ve Hayvancılık Araştırma Destekleme Ve Eğitim Şube Müdürlüğü',
      'Tarımsal Hizmetler Dairesi Başkanlığı',
      'Tarımsal Yapı Şube Müdürlüğü',
    ],
  },
  {
    name: 'Ulaşım Dairesi Başkanlığı',
    departments: [
      'Altyapı Koordinasyon Şube Müdürlüğü (aykome)',
      'Altyapı Koordinasyon Şube Müdürlüğü (AYKOME)',
      'Kamu Toplu Taşıma Şefliği',
      'Terminaller ve Otoparklar Şube Müdürlüğü',
      'Terminaller Ve Otoparklar Şube Müdürlüğü',
      'Toplu Taşıma Araçları Takip Ve Filo Yönetim Şefliği',
      'Toplu Ulaşım Hizmetleri Şube Müdürlüğü',
      'Trafik Hizmetleri Şube Müdürlüğü',
      'Ulaşım Dairesi Başkanlığı',
      // eski
      'Ulaşım Koordinasyon Şube Müdürlüğü (ukome)',
      'Ulaşım Koordinasyon Şube Müdürlüğü (UKOME)',
      'Ulaşım Planlama Şube Müdürlüğü',
    ],
  },
  {
    name: 'Veteriner Hizmetleri Dairesi Başkanlığı',
    departments: [
      'Hayvan Sağlığı Şube Müdürlüğü',
      'Hayvan Bakımevi Şube Müdürlüğü',
      'Veteriner Hizmetleri Dairesi Başkanlığı',
      'Zoonoz Ve Halk Sağlığı Şube Müdürlüğü',
      // eski (Çevre altındaydı)
      'Veteriner Hizmetleri Şube Müdürlüğü',
    ],
  },
  {
    name: 'Yazı İşleri ve Kararlar Dairesi Başkanlığı',
    departments: [
      'Arşiv Şube Müdürlüğü',
      'Bordro ve Tahakkuk Şube Müdürlüğü',
      'Encümen Şube Müdürlüğü',
      'Meclis Şube Müdürlüğü',
      'Yazı İşleri Şube Müdürlüğü',
      'Yazı İşleri Ve Kararlar Dairesi Başkanlığı',
    ],
  },
  {
    name: 'Zabıta Dairesi Başkanlığı',
    departments: [
      'Çevre Ve İmar Zabıtası Şube Müdürlüğü',
      'Zabıta Dairesi Başkanlığı',
      'Zabıta Denetim Şube Müdürlüğü',
      'Zabıta Şube Müdürlüğü',
      'Zabıta Trafik Şube Müdürlüğü',
    ],
  },
  // ── Kurumsal birimler (daire dışı) ──────────────────────────────────────────
  {
    name: 'Genel Sekreterlik',
    departments: [
      'Genel Sekreterlik',
      'Genel Sekreterlik Koordinasyon Şube Müdürlüğü',
      'Genel Sekreter Yardımcısı (ali Zağlı)',
      'Genel Sekreter Yardımcısı (İhsan ÇAKAR)',
      'Genel Sekreter Yardımcısı (ihsan Çakar)',
      'Genel Sekreter Yardımcısı (Osman Can YENİCE)',
      'Genel Sekreter Yardımcısı (osman Can Yenice)',
    ],
  },
  {
    name: 'Özel Kalem Müdürlüğü',
    departments: [
      'Özel Kalem Müdürlüğü',
    ],
  },
];

// ── MAP: department string → canonical directorate name ─────────────────────
// DIRECTORATES'ten otomatik üretilir; çakışma varsa ilk tanım kazanır.
const MAP = {};
DIRECTORATES.forEach(({ name, departments }) => {
  departments.forEach((dept) => {
    if (!MAP[dept]) MAP[dept] = name;
  });
});

// ── Ters lookup: directorate adı → departments listesi ──────────────────────
const DEPT_TO_DIRECTORATE = MAP; // alias

/**
 * AD department / OU segment string'ini → resmi Daire Başkanlığı adına çevirir.
 * @param {string|null} rawDepartment
 * @returns {{ directorate: string|null, department: string|null }}
 */
function resolveDirectorate(rawDepartment) {
  if (!rawDepartment) return { directorate: null, department: null };

  const raw = Array.isArray(rawDepartment) ? rawDepartment[0] : rawDepartment;
  if (!raw) return { directorate: null, department: null };
  const str = String(raw).trim();
  if (!str) return { directorate: null, department: null };

  // "X Personeli" → "X"
  const base = str.replace(/\s+Personeli$/i, '').trim();

  const directorate = MAP[base] ?? MAP[str] ?? null;

  return {
    directorate,
    department: base !== str ? base : str,
  };
}

const DIRECTORATE_NAMES = DIRECTORATES.map((d) => d.name);

function getDepartmentsByDirectorate(directorateName) {
  const dir = DIRECTORATES.find((d) => d.name === directorateName);
  return dir ? dir.departments : [];
}

// ── OU slug → Türkçe daire/birim adı (DN'den directorate çözümlemesi için) ──
const OU_DB_MAP = {
  afetisleriveriskyonetimi_db:             'Afet İşleri ve Risk Yönetimi Dairesi Başkanlığı',
  akillisehirvekentbilgisistemleri_db:     'Akıllı Şehir ve Kent Bilgi Sistemleri Dairesi Başkanlığı',
  basinyayinvehalklailiskiler_db:          'Basın Yayın ve Halkla İlişkiler Dairesi Başkanlığı',
  bilgiislem_db:                           'Bilgi İşlem Dairesi Başkanlığı',
  cevrekorumavekontrol_db:                 'Çevre Koruma ve Kontrol Dairesi Başkanlığı',
  disiliskiler_db:                         'Dış İlişkiler Dairesi Başkanlığı',
  emlakveistimlak_db:                      'Emlak ve İstimlak Dairesi Başkanlığı',
  etutveprojeler_db:                       'Etüt ve Projeler Dairesi Başkanlığı',
  fenisleri_db:                            'Fen İşleri Dairesi Başkanlığı',
  genclikvesporhizmetleri_db:              'Gençlik ve Spor Hizmetleri Dairesi Başkanlığı',
  iklimdegisikligivesifiratik_db:          'İklim Değişikliği ve Sıfır Atık Dairesi Başkanlığı',
  ilcehizmetleri1bolge_db:                 'İlçe Hizmetleri 1. Bölge Dairesi Başkanlığı',
  ilcehizmetleri2bolge_db:                 'İlçe Hizmetleri 2. Bölge Dairesi Başkanlığı',
  ilcehizmetleri3bolge_db:                 'İlçe Hizmetleri 3. Bölge Dairesi Başkanlığı',
  ilcehizmetleri4bolge_db:                 'İlçe Hizmetleri 4. Bölge Dairesi Başkanlığı',
  imarvesehircilik_db:                     'İmar ve Şehircilik Dairesi Başkanlığı',
  insankaynaklariveegitim_db:              'İnsan Kaynakları ve Eğitim Dairesi Başkanlığı',
  itfaiye_db:                              'İtfaiye Dairesi Başkanlığı',
  kadinveailehizmetleri_db:               'Kadın ve Aile Hizmetleri Dairesi Başkanlığı',
  kenttarihitanitimveturizm_db:            'Kent Tarihi, Tanıtım ve Turizm Dairesi Başkanlığı',
  kultursanatvesosyalisler_db:             'Kültür, Sanat ve Sosyal İşler Dairesi Başkanlığı',
  malihizmetler_db:                        'Mali Hizmetler Dairesi Başkanlığı',
  saglikvesosyalhizmetler_db:              'Sağlık ve Sosyal Hizmetler Dairesi Başkanlığı',
  tarimsalhizmetler_db:                    'Tarımsal Hizmetler Dairesi Başkanlığı',
  ulasim_db:                               'Ulaşım Dairesi Başkanlığı',
  yaziislerivekararlar_db:                 'Yazı İşleri ve Kararlar Dairesi Başkanlığı',
  zabita_db:                               'Zabıta Dairesi Başkanlığı',
  // Başkanlık doğrudan bağlı birimler
  icdenetimbirimi:                         'İç Denetim Birimi Başkanlığı',
  ozelkalem_md:                            'Özel Kalem Müdürlüğü',
  rehberlikveteftiskurulu_bsk:             'Rehberlik ve Teftiş Kurulu Başkanlığı',
  '1hukukmusavirligi':                     'Hukuk Müşavirliği',
  danismanlik:                             'Başkanlık',
  // Genel Sekreterlik doğrudan bağlı birimler
  genelsekreterlik:                        'Genel Sekreterlik',
  genelsekreterlikkoordinasyon_sm:         'Genel Sekreterlik',
};

// OU slug listesini atlama kümesi
const DN_SKIP_SLUGS = new Set([
  'staff', '_users', 'baskan', 'conflict', 'deprovisioned_users',
  'external users', 'participations', 'control',
  // Genel Sekreter Yardımcısı OUları — bunlar daire değil, ara kademe
  'genelsekreteryardimcisializagli',
  'genelsekreteryardimcisiihsancakar',
  'genelsekreteryardimcisiosmancanyenice',
]);

/**
 * distinguishedName'den daire adını türet.
 * resolveDirectorate() metin eşleştirme yaklaşımının yerini alır:
 * AD'nin kendi OU hiyerarşisi kullanılır — 100% kapsama, map bakımı yok.
 *
 * @param {string} dn  - kullanıcının distinguishedName değeri
 * @returns {{ directorate: string|null }}
 */
function parseDNForDirectorate(dn) {
  if (!dn) return { directorate: null };

  const slugs = String(dn)
    .split(',')
    .filter((p) => p.trim().toUpperCase().startsWith('OU='))
    .map((p) => p.trim().replace(/^OU=/i, '').toLowerCase())
    .filter((p) => !DN_SKIP_SLUGS.has(p) && !p.endsWith('_p'));

  // İlk eşleşen slug → daire adı
  const dirSlug = slugs.find((p) => OU_DB_MAP[p]) || null;

  return { directorate: dirSlug ? OU_DB_MAP[dirSlug] : null };
}

// ── AD bilgisayar description slug → Daire adı ──────────────────────────────
// AD'de bilgisayar OU'su düz "bilgisayar" — daire bilgisi description alanına yazılıyor.
const DESCRIPTION_DIR_MAP = {
  ulasim:                    'Ulaşım Dairesi Başkanlığı',
  imar_sehircilik:           'İmar ve Şehircilik Dairesi Başkanlığı',
  saglik_sosyal_hizmetler:   'Sağlık ve Sosyal Hizmetler Dairesi Başkanlığı',
  fen_isleri:                'Fen İşleri Dairesi Başkanlığı',
  mali_hizmetler:            'Mali Hizmetler Dairesi Başkanlığı',
  insan_kaynaklari_egitim:   'İnsan Kaynakları ve Eğitim Dairesi Başkanlığı',
  cevre_koruma_kontrol:      'Çevre Koruma ve Kontrol Dairesi Başkanlığı',
  zabita:                    'Zabıta Dairesi Başkanlığı',
  destek_hizmetleri:         'Destek Hizmetleri Dairesi Başkanlığı',
  tarimsal_hizmetler:        'Tarımsal Hizmetler Dairesi Başkanlığı',
  itfaiye:                   'İtfaiye Dairesi Başkanlığı',
  kultur_turizm_spor:        'Kültür ve Sosyal İşler Dairesi Başkanlığı',
  emlak_istimlak:            'Emlak ve İstimlak Dairesi Başkanlığı',
  emak_istimlak:             'Emlak ve İstimlak Dairesi Başkanlığı', // typo variant
  yazi_isleri_kararlar:      'Yazı İşleri ve Kararlar Dairesi Başkanlığı',
  bilgi_islem:               'Bilgi İşlem Dairesi Başkanlığı',
  hukuk_musavirligi:         'Hukuk Müşavirliği',
  cagrimerkezi:              'Basın Yayın ve Halkla İlişkiler Dairesi Başkanlığı',
  cagri_merkezi:             'Basın Yayın ve Halkla İlişkiler Dairesi Başkanlığı',
  basin_yayin:               'Basın Yayın ve Halkla İlişkiler Dairesi Başkanlığı',
  akom:                      'Afet İşleri ve Risk Yönetimi Dairesi Başkanlığı',
  ozel_kalem:                'Özel Kalem Müdürlüğü',
  teftis_kurulu:             'Rehberlik ve Teftiş Kurulu Başkanlığı',
  muttas:                    'Muğla Su ve Kanalizasyon İdaresi (MUSKİ)',
  bodrum_muttas:             'Muğla Su ve Kanalizasyon İdaresi (MUSKİ)',
};

module.exports = {
  DIRECTORATES,
  DIRECTORATE_NAMES,
  getDepartmentsByDirectorate,
  DEPT_TO_DIRECTORATE,
  MAP,
  OU_DB_MAP,
  DESCRIPTION_DIR_MAP,
  resolveDirectorate,
  parseDNForDirectorate,
};
