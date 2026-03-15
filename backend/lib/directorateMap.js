'use strict';

/**
 * AD department değerini → resmi Daire Başkanlığı adına çevirir.
 * Mantık:
 *   1. "X Personeli" → "X" (Personeli suffix'ini sil)
 *   2. MAP'te ara → daire adı
 *   3. Bulunamazsa null (Diğer)
 */

// Şube Müdürlüğü → Daire Başkanlığı eşleştirme tablosu
const MAP = {
  // ── Afet İşleri ve Risk Yönetimi ──────────────────────────────────────────
  'Afet İşleri Ve Risk Yönetimi Dairesi Başkanlığı':     'Afet İşleri ve Risk Yönetimi Dairesi Başkanlığı',
  'Müdahale Ve Kentsel Arama Kurtarma Şube Müdürlüğü':   'Afet İşleri ve Risk Yönetimi Dairesi Başkanlığı',
  'Müdahale ve Kentsel Arama Kurtarma Şube Müdürlüğü':   'Afet İşleri ve Risk Yönetimi Dairesi Başkanlığı',
  'Akom Şube Müdürlüğü':                                 'Afet İşleri ve Risk Yönetimi Dairesi Başkanlığı',
  'Deprem Ve Risk Yönetimi Şube Müdürlüğü':              'Afet İşleri ve Risk Yönetimi Dairesi Başkanlığı',
  'Önleme Şube Müdürlüğü':                               'Afet İşleri ve Risk Yönetimi Dairesi Başkanlığı',
  'Planlama Ve Eğitim Şube Müdürlüğü':                   'Afet İşleri ve Risk Yönetimi Dairesi Başkanlığı',

  // ── Basın Yayın ve Halkla İlişkiler ───────────────────────────────────────
  'Basın Yayın Ve Halkla İlişkiler Dairesi Başkanlığı':  'Basın Yayın ve Halkla İlişkiler Dairesi Başkanlığı',
  'Basın Yayın Şube Müdürlüğü':                          'Basın Yayın ve Halkla İlişkiler Dairesi Başkanlığı',
  'Halkla İlişkiler Şube Müdürlüğü':                     'Basın Yayın ve Halkla İlişkiler Dairesi Başkanlığı',
  'Çağrı Merkezi':                                        'Basın Yayın ve Halkla İlişkiler Dairesi Başkanlığı',
  'Tören Ve Organizasyon Şube Müdürlüğü':                'Basın Yayın ve Halkla İlişkiler Dairesi Başkanlığı',
  'Sivil Toplum Kuruluşları İletişim Şube Müdürlüğü':    'Basın Yayın ve Halkla İlişkiler Dairesi Başkanlığı',

  // ── İlçe Hizmetleri ───────────────────────────────────────────────────────
  'İlçe Hizmetleri 1. Bölge Dairesi Başkanlığı':         'İlçe Hizmetleri 1. Bölge Dairesi Başkanlığı',
  'Bodrum İlçe Hizmetleri Şube Müdürlüğü':               'İlçe Hizmetleri 1. Bölge Dairesi Başkanlığı',
  'Marmaris İlçe Hizmetleri Şube Müdürlüğü':             'İlçe Hizmetleri 1. Bölge Dairesi Başkanlığı',
  'Datça İlçe Hizmetleri Şube Müdürlüğü':                'İlçe Hizmetleri 1. Bölge Dairesi Başkanlığı',
  'İlçe Hizmetleri 2. Bölge Dairesi Başkanlığı':         'İlçe Hizmetleri 2. Bölge Dairesi Başkanlığı',
  'İlçe Hizmetleri 2. Bölge Dairesi':                    'İlçe Hizmetleri 2. Bölge Dairesi Başkanlığı',
  'Fethiye İlçe Hizmetleri Şube Müdürlüğü':              'İlçe Hizmetleri 2. Bölge Dairesi Başkanlığı',
  'Seydikemer İlçe Hizmetleri Şube Müdürlüğü':           'İlçe Hizmetleri 2. Bölge Dairesi Başkanlığı',
  'Dalaman İlçe Hizmetleri Şube Müdürlüğü':              'İlçe Hizmetleri 2. Bölge Dairesi Başkanlığı',
  'İlçe Hizmetleri 3. Bölge Dairesi Başkanlığı':         'İlçe Hizmetleri 3. Bölge Dairesi Başkanlığı',
  'Ortaca İlçe Hizmetleri Şube Müdürlüğü':               'İlçe Hizmetleri 3. Bölge Dairesi Başkanlığı',
  'Köyceğiz İlçe Hizmetleri Şube Müdürlüğü':             'İlçe Hizmetleri 3. Bölge Dairesi Başkanlığı',
  'İlçe Hizmetleri 4. Bölge Dairesi Başkanlığı':         'İlçe Hizmetleri 4. Bölge Dairesi Başkanlığı',
  'Milas İlçe Hizmetleri Şube Müdürlüğü':                'İlçe Hizmetleri 4. Bölge Dairesi Başkanlığı',

  // ── İnsan Kaynakları ve Eğitim ────────────────────────────────────────────
  'İnsan Kaynakları Ve Eğitim Dairesi Başkanlığı':        'İnsan Kaynakları ve Eğitim Dairesi Başkanlığı',
  'İnsan Kaynakları Şube Müdürlüğü':                      'İnsan Kaynakları ve Eğitim Dairesi Başkanlığı',
  'Eğitim Ve İdari İşler Şube Müdürlüğü':                 'İnsan Kaynakları ve Eğitim Dairesi Başkanlığı',
  'Eğitim Şube Müdürlüğü':                                'İnsan Kaynakları ve Eğitim Dairesi Başkanlığı',
  'İşçi Hizmetleri Şube Müdürlüğü':                       'İnsan Kaynakları ve Eğitim Dairesi Başkanlığı',
  'İş Sağlığı Ve Güvenliği Şube Müdürlüğü':               'İnsan Kaynakları ve Eğitim Dairesi Başkanlığı',

  // ── İtfaiye ───────────────────────────────────────────────────────────────
  'İtfaiye Dairesi Başkanlığı':                           'İtfaiye Dairesi Başkanlığı',

  // ── Sağlık ve Sosyal Hizmetler ────────────────────────────────────────────
  'Sağlık Ve Sosyal Hizmetler Dairesi Başkanlığı':        'Sağlık ve Sosyal Hizmetler Dairesi Başkanlığı',
  'Sağlık Hizmetleri Şube Müdürlüğü':                     'Sağlık ve Sosyal Hizmetler Dairesi Başkanlığı',
  'Engelli Hizmetleri Şube Müdürlüğü':                    'Sağlık ve Sosyal Hizmetler Dairesi Başkanlığı',
  'Sosyal Hizmetler Şube Müdürlüğü':                      'Sağlık ve Sosyal Hizmetler Dairesi Başkanlığı',
  'Yaşlı Hizmetleri Şube Müdürlüğü':                      'Sağlık ve Sosyal Hizmetler Dairesi Başkanlığı',
  'Şehit Yakınları Ve Gaziler Şube Müdürlüğü':            'Sağlık ve Sosyal Hizmetler Dairesi Başkanlığı',
  'Sosyal İnovasyon Ve Yurttaş Refahı Şube Müdürlüğü':   'Sağlık ve Sosyal Hizmetler Dairesi Başkanlığı',

  // ── Zabıta ────────────────────────────────────────────────────────────────
  'Zabıta Dairesi Başkanlığı':                            'Zabıta Dairesi Başkanlığı',
  'Zabıta Şube Müdürlüğü':                                'Zabıta Dairesi Başkanlığı',
  'Zabıta Trafik Şube Müdürlüğü':                         'Zabıta Dairesi Başkanlığı',
  'Zabıta Denetim Şube Müdürlüğü':                        'Zabıta Dairesi Başkanlığı',
  'Çevre Ve İmar Zabıtası Şube Müdürlüğü':               'Zabıta Dairesi Başkanlığı',
  'Ruhsat Ve Denetim Şube Müdürlüğü':                    'Zabıta Dairesi Başkanlığı',

  // ── Dış İlişkiler ─────────────────────────────────────────────────────────
  'Dış İlişkiler Dairesi Başkanlığı':                     'Dış İlişkiler Dairesi Başkanlığı',
  'Uluslararası İlişkiler Şube Müdürlüğü':                'Dış İlişkiler Dairesi Başkanlığı',
  'Fon Ve Projeler Şube Müdürlüğü':                       'Dış İlişkiler Dairesi Başkanlığı',
  'Strateji Şube Müdürlüğü':                              'Dış İlişkiler Dairesi Başkanlığı',

  // ── Gençlik ve Spor Hizmetleri ────────────────────────────────────────────
  'Gençlik Ve Spor Hizmetleri Dairesi Başkanlığı':        'Gençlik ve Spor Hizmetleri Dairesi Başkanlığı',
  'Gençlik Hizmetleri Şube Müdürlüğü':                    'Gençlik ve Spor Hizmetleri Dairesi Başkanlığı',
  'Spor Tesisleri Şube Müdürlüğü':                        'Gençlik ve Spor Hizmetleri Dairesi Başkanlığı',
  'Spor Hizmetleri Şube Müdürlüğü':                       'Gençlik ve Spor Hizmetleri Dairesi Başkanlığı',

  // ── Kadın ve Aile Hizmetleri ──────────────────────────────────────────────
  'Kadın Ve Aile Hizmetleri Dairesi Başkanlığı':          'Kadın ve Aile Hizmetleri Dairesi Başkanlığı',
  'Kadın Politikaları Şube Müdürlüğü':                    'Kadın ve Aile Hizmetleri Dairesi Başkanlığı',
  'Çocuk Politikaları Şube Müdürlüğü':                    'Kadın ve Aile Hizmetleri Dairesi Başkanlığı',
  'Türkan Saylan Çağdaş Yaşam Merkezi Şube Müdürlüğü':   'Kadın ve Aile Hizmetleri Dairesi Başkanlığı',

  // ── Mali Hizmetler ────────────────────────────────────────────────────────
  'Mali Hizmetler Dairesi Başkanlığı':                    'Mali Hizmetler Dairesi Başkanlığı',
  'Gelirler Şube Müdürlüğü':                              'Mali Hizmetler Dairesi Başkanlığı',
  'Muhasebe Şube Müdürlüğü':                              'Mali Hizmetler Dairesi Başkanlığı',
  'Bütçe Ve Mali Kontrol Şube Müdürlüğü':                'Mali Hizmetler Dairesi Başkanlığı',
  'Bütçe ve Mali Kontrol Şube Müdürlüğü':                'Mali Hizmetler Dairesi Başkanlığı',
  'Bordro Ve Tahakkuk Şube Müdürlüğü':                   'Mali Hizmetler Dairesi Başkanlığı',
  'Bordro ve Tahakkuk Şube Müdürlüğü':                   'Mali Hizmetler Dairesi Başkanlığı',
  'Tahsilat Şefliği':                                     'Mali Hizmetler Dairesi Başkanlığı',
  'Yapım İşleri İhale Şube Müdürlüğü':                   'Mali Hizmetler Dairesi Başkanlığı',

  // ── Yazı İşleri ve Kararlar ───────────────────────────────────────────────
  'Yazı İşleri Ve Kararlar Dairesi Başkanlığı':           'Yazı İşleri ve Kararlar Dairesi Başkanlığı',
  'Yazı İşleri Şube Müdürlüğü':                           'Yazı İşleri ve Kararlar Dairesi Başkanlığı',
  'Encümen Şube Müdürlüğü':                               'Yazı İşleri ve Kararlar Dairesi Başkanlığı',
  'Meclis Şube Müdürlüğü':                                'Yazı İşleri ve Kararlar Dairesi Başkanlığı',
  'Arşiv Şube Müdürlüğü':                                 'Yazı İşleri ve Kararlar Dairesi Başkanlığı',

  // ── Bilgi İşlem ───────────────────────────────────────────────────────────
  'Bilgi İşlem Dairesi Başkanlığı':                       'Bilgi İşlem Dairesi Başkanlığı',
  'Bilgi Teknolojileri Şube Müdürlüğü':                   'Bilgi İşlem Dairesi Başkanlığı',
  'Yazılım Şube Müdürlüğü':                               'Bilgi İşlem Dairesi Başkanlığı',
  'Sistem, Ağ Ve Veri Güvenliği Şube Müdürlüğü':         'Bilgi İşlem Dairesi Başkanlığı',
  'Elektronik Ve Altyapı Şube Müdürlüğü':                 'Bilgi İşlem Dairesi Başkanlığı',
  'Coğrafi Bilgi Sistemleri Şube Müdürlüğü':              'Bilgi İşlem Dairesi Başkanlığı',

  // ── Destek Hizmetleri ─────────────────────────────────────────────────────
  'Destek Hizmetleri Dairesi Başkanlığı':                 'Destek Hizmetleri Dairesi Başkanlığı',
  'Bina, Tesis Bakım Onarım Ve İdari İşler Şube Müdürlüğü': 'Destek Hizmetleri Dairesi Başkanlığı',
  'Makine Ve İkmal Şube Müdürlüğü':                       'Destek Hizmetleri Dairesi Başkanlığı',
  'Makine ve İkmal Şube Müdürlüğü':                       'Destek Hizmetleri Dairesi Başkanlığı',
  'İhale,Satın Alma ve Taşınır Mal, Ambarlar Şube Müdürlüğü': 'Destek Hizmetleri Dairesi Başkanlığı',
  'İhale,satın Alma Ve Taşınır Mal, Ambarlar Şube Müdürlüğü': 'Destek Hizmetleri Dairesi Başkanlığı',
  'Satın Alma Ve Mali İşler Şefliği':                     'Destek Hizmetleri Dairesi Başkanlığı',
  'Hizmet Araçları Takip Ve Filo Yönetim Şefliği':        'Destek Hizmetleri Dairesi Başkanlığı',
  'İdari İşler Ve Lojistik Şube Müdürlüğü':              'Destek Hizmetleri Dairesi Başkanlığı',
  'İdari İşler Ve Arşiv Şefliği':                        'Destek Hizmetleri Dairesi Başkanlığı',

  // ── Emlak ve İstimlak ─────────────────────────────────────────────────────
  'Emlak Ve İstimlak Dairesi Başkanlığı':                 'Emlak ve İstimlak Dairesi Başkanlığı',
  'Emlak Yönetim Şube Müdürlüğü':                         'Emlak ve İstimlak Dairesi Başkanlığı',
  'Taşınmaz Mallar Şube Müdürlüğü':                       'Emlak ve İstimlak Dairesi Başkanlığı',
  'Kamulaştırma Şube Müdürlüğü':                          'Emlak ve İstimlak Dairesi Başkanlığı',

  // ── Kültür, Sanat ve Sosyal İşler ────────────────────────────────────────
  'Kültür, Sanat Ve Sosyal İşler Dairesi Başkanlığı':    'Kültür, Sanat ve Sosyal İşler Dairesi Başkanlığı',
  'Kültür Ve Sosyal İşler Şube Müdürlüğü':               'Kültür, Sanat ve Sosyal İşler Dairesi Başkanlığı',
  'Konservatuar Şube Müdürlüğü':                          'Kültür, Sanat ve Sosyal İşler Dairesi Başkanlığı',
  'Kültürel Mirası Koruma Şube Müdürlüğü':               'Kültür, Sanat ve Sosyal İşler Dairesi Başkanlığı',
  'Kültürel Mirası Tanıtım Ve Yönetim Şube Müdürlüğü':  'Kültür, Sanat ve Sosyal İşler Dairesi Başkanlığı',
  'Kültür Tesisleri Şube Müdürlüğü':                     'Kültür, Sanat ve Sosyal İşler Dairesi Başkanlığı',
  'Kent Belleği Ve Kültür Merkezi Şube Müdürlüğü':       'Kültür, Sanat ve Sosyal İşler Dairesi Başkanlığı',

  // ── Akıllı Şehir ve Kent Bilgi Sistemleri ────────────────────────────────
  'Akıllı Şehir Ve Kent Bilgi Sistemleri Dairesi Başkanlığı': 'Akıllı Şehir ve Kent Bilgi Sistemleri Dairesi Başkanlığı',
  'Akıllı Şehir Ve Kent Bilgi Sistemleri Dairesi Başkanlığı Persone': 'Akıllı Şehir ve Kent Bilgi Sistemleri Dairesi Başkanlığı',

  // ── Çevre Koruma ve Kontrol ───────────────────────────────────────────────
  'Çevre Koruma Ve Kontrol Dairesi Başkanlığı':          'Çevre Koruma ve Kontrol Dairesi Başkanlığı',
  'Çevre Yönetimi Ve Kent Temizliği Şube Müdürlüğü':    'Çevre Koruma ve Kontrol Dairesi Başkanlığı',
  'Çevre Yönetimi ve Kent Temizliği Şube Müdürlüğü':    'Çevre Koruma ve Kontrol Dairesi Başkanlığı',
  'Atık Yönetimi Şube Müdürlüğü':                        'Çevre Koruma ve Kontrol Dairesi Başkanlığı',
  'Hafriyat Yönetimi Ve Denetim Şube Müdürlüğü':        'Çevre Koruma ve Kontrol Dairesi Başkanlığı',
  'Hafriyat Yönetimi ve Denetim Şube Müdürlüğü':        'Çevre Koruma ve Kontrol Dairesi Başkanlığı',
  'Çevre Ve İklim Politikaları Şube Müdürlüğü':         'Çevre Koruma ve Kontrol Dairesi Başkanlığı',
  'Mezbaha Hizmetleri Şube Müdürlüğü':                  'Çevre Koruma ve Kontrol Dairesi Başkanlığı',
  'Veteriner Hizmetleri Şube Müdürlüğü':                'Çevre Koruma ve Kontrol Dairesi Başkanlığı',
  'Hal Şube Müdürlüğü':                                  'Çevre Koruma ve Kontrol Dairesi Başkanlığı',

  // ── Etüt ve Projeler ──────────────────────────────────────────────────────
  'Etüt Ve Projeler Dairesi Başkanlığı':                 'Etüt ve Projeler Dairesi Başkanlığı',
  'Enerji Yönetimi Ve Etüt Proje Şube Müdürlüğü':       'Etüt ve Projeler Dairesi Başkanlığı',
  'Yapı ve Kontrol İşleri Şube Müdürlüğü':              'Etüt ve Projeler Dairesi Başkanlığı',
  'Yapı Ve Kontrol İşleri Şube Müdürlüğü':              'Etüt ve Projeler Dairesi Başkanlığı',
  'Teknik İşler Şefliği':                                'Etüt ve Projeler Dairesi Başkanlığı',

  // ── Fen İşleri ────────────────────────────────────────────────────────────
  'Fen İşleri Dairesi Başkanlığı':                       'Fen İşleri Dairesi Başkanlığı',
  'Yol Bakım Ve İşletme Şube Müdürlüğü':                'Fen İşleri Dairesi Başkanlığı',
  'Yol Proje Ve Yapım Şube Müdürlüğü':                  'Fen İşleri Dairesi Başkanlığı',
  'Yeşil Alan Planlama Yapım Ve Bakım Şube Müdürlüğü':  'Fen İşleri Dairesi Başkanlığı',
  'Yeşil Alan Planlama Yapım ve Bakım Şube Müdürlüğü':  'Fen İşleri Dairesi Başkanlığı',
  'Mezarlıklar Şube Müdürlüğü':                         'Fen İşleri Dairesi Başkanlığı',

  // ── İklim Değişikliği ve Sıfır Atık ──────────────────────────────────────
  'İklim Değişikliği Ve Sıfır Atık Dairesi Başkanlığı': 'İklim Değişikliği ve Sıfır Atık Dairesi Başkanlığı',
  'Temiz Enerji Ve Sıfır Atık Şube Müdürlüğü':         'İklim Değişikliği ve Sıfır Atık Dairesi Başkanlığı',
  'İdari Ve Mali İşler Şefliği (iklim Değişikliği)':   'İklim Değişikliği ve Sıfır Atık Dairesi Başkanlığı',
  'İdari Ve Mali İşler Şefliği Personeli (iklim Değişikliği)': 'İklim Değişikliği ve Sıfır Atık Dairesi Başkanlığı',

  // ── İmar ve Şehircilik ────────────────────────────────────────────────────
  'İmar ve Şehircilik Dairesi Başkanlığı':              'İmar ve Şehircilik Dairesi Başkanlığı',
  'İmar Planlama Şube Müdürlüğü':                       'İmar ve Şehircilik Dairesi Başkanlığı',
  'Yapı Ruhsatı Ve Kontrol Şube Müdürlüğü':            'İmar ve Şehircilik Dairesi Başkanlığı',
  'Harita Şube Müdürlüğü':                              'İmar ve Şehircilik Dairesi Başkanlığı',
  'Koruma Uygulama Ve Denetim Şube Müdürlüğü (kudeb)': 'İmar ve Şehircilik Dairesi Başkanlığı',
  'Üst Ölçek Planlama Ve Mevzuat Geliştirme Şube Müdürlüğü': 'İmar ve Şehircilik Dairesi Başkanlığı',

  // ── Kent Tarihi, Tanıtım ve Turizm ───────────────────────────────────────
  'Kent Tarihi, Tanıtım Ve Turizm Dairesi Başkanlığı':  'Kent Tarihi, Tanıtım ve Turizm Dairesi Başkanlığı',
  'Turizm Şube Müdürlüğü':                              'Kent Tarihi, Tanıtım ve Turizm Dairesi Başkanlığı',
  'Denizcilik Şube Müdürlüğü':                          'Kent Tarihi, Tanıtım ve Turizm Dairesi Başkanlığı',
  'Kıyı Tesisleri Şefliği':                             'Kent Tarihi, Tanıtım ve Turizm Dairesi Başkanlığı',
  'Deniz Ulaşım Ve Ruhsat Şefliği':                    'Kent Tarihi, Tanıtım ve Turizm Dairesi Başkanlığı',

  // ── Muhtarlık İşleri ──────────────────────────────────────────────────────
  'Muhtarlık İşleri Dairesi Başkanlığı':               'Muhtarlık İşleri Dairesi Başkanlığı',
  'Muhtarlık İşleri Şube Müdürlüğü':                   'Muhtarlık İşleri Dairesi Başkanlığı',

  // ── Tarımsal Hizmetler ────────────────────────────────────────────────────
  'Tarımsal Hizmetler Dairesi Başkanlığı':             'Tarımsal Hizmetler Dairesi Başkanlığı',
  'Tarım Ve Hayvancılık Araştırma Destekleme Ve Eğitim Şube Müdürlüğü': 'Tarımsal Hizmetler Dairesi Başkanlığı',
  'Tarım Ve Hayvancılık Araştırma Destekleme Ve Eğitim Şube Müdürlü':   'Tarımsal Hizmetler Dairesi Başkanlığı',
  'Tarımsal Yapı Şube Müdürlüğü':                      'Tarımsal Hizmetler Dairesi Başkanlığı',

  // ── Ulaşım ────────────────────────────────────────────────────────────────
  'Ulaşım Dairesi Başkanlığı':                          'Ulaşım Dairesi Başkanlığı',
  'Toplu Ulaşım Hizmetleri Şube Müdürlüğü':            'Ulaşım Dairesi Başkanlığı',
  'Trafik Hizmetleri Şube Müdürlüğü':                  'Ulaşım Dairesi Başkanlığı',
  'Ulaşım Koordinasyon Şube Müdürlüğü (ukome)':        'Ulaşım Dairesi Başkanlığı',
  'Ulaşım Koordinasyon Şube Müdürlüğü (UKOME)':        'Ulaşım Dairesi Başkanlığı',
  'Terminaller Ve Otoparklar Şube Müdürlüğü':           'Ulaşım Dairesi Başkanlığı',
  'Terminaller ve Otoparklar Şube Müdürlüğü':           'Ulaşım Dairesi Başkanlığı',
  'Ulaşım Planlama Şube Müdürlüğü':                    'Ulaşım Dairesi Başkanlığı',
  'Altyapı Koordinasyon Şube Müdürlüğü (aykome)':      'Ulaşım Dairesi Başkanlığı',
  'Altyapı Koordinasyon Şube Müdürlüğü (AYKOME)':      'Ulaşım Dairesi Başkanlığı',
  'Toplu Taşıma Araçları Takip Ve Filo Yönetim Şefliği': 'Ulaşım Dairesi Başkanlığı',
  'Kamu Toplu Taşıma Şefliği':                         'Ulaşım Dairesi Başkanlığı',

  // ── Özel Kalem ────────────────────────────────────────────────────────────
  'Özel Kalem Müdürlüğü':                              'Özel Kalem Müdürlüğü',

  // ── Hukuk Müşavirliği ─────────────────────────────────────────────────────
  '1. Hukuk Müşavirliği':                              'Hukuk Müşavirliği',
  'Hukuk Müşavirliği':                                 'Hukuk Müşavirliği',

  // ── Rehberlik ve Teftiş ───────────────────────────────────────────────────
  'Rehberlik Ve Teftiş Kurulu Başkanlığı':             'Rehberlik ve Teftiş Kurulu Başkanlığı',

  // ── Genel Sekreterlik (resmi daire değil ama AD'de var) ───────────────────
  'Genel Sekreterlik':                                  'Genel Sekreterlik',
  'Genel Sekreterlik Koordinasyon Şube Müdürlüğü':     'Genel Sekreterlik',
  'Genel Sekreter Yardımcısı (ali Zağlı)':             'Genel Sekreterlik',
  'Genel Sekreter Yardımcısı (İhsan ÇAKAR)':           'Genel Sekreterlik',
  'Genel Sekreter Yardımcısı (ihsan Çakar)':           'Genel Sekreterlik',
  'Genel Sekreter Yardımcısı (Osman Can YENİCE)':      'Genel Sekreterlik',
  'Genel Sekreter Yardımcısı (osman Can Yenice)':      'Genel Sekreterlik',

  // ── Başkanlık ─────────────────────────────────────────────────────────────
  'Başkan': 'Başkanlık',
};

/**
 * AD department string'ini normalize ederek resmi daire adını döndürür.
 * @param {string|null} rawDepartment - AD'den gelen ham department değeri
 * @returns {{ directorate: string|null, department: string|null }}
 */
function resolveDirectorate(rawDepartment) {
  if (!rawDepartment) return { directorate: null, department: null };

  // AD bazen array döner — ilk elemanı al
  const raw = Array.isArray(rawDepartment) ? rawDepartment[0] : rawDepartment;
  if (!raw) return { directorate: null, department: null };
  const str = String(raw).trim();
  if (!str) return { directorate: null, department: null };

  // "X Personeli" → "X" (Personeli suffix'ini temizle)
  const base = str.replace(/\s+Personeli$/i, '').trim();

  const directorate = MAP[base] ?? MAP[str] ?? null;

  return {
    directorate,
    department: base !== str ? base : str,
  };
}

module.exports = { resolveDirectorate, MAP };
