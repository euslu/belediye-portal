#!/usr/bin/env node
'use strict';
require('dotenv').config();
const prisma = require('../lib/prisma');

// ulakBELL birim adı → Portal daire/müdürlük eşleştirmesi
const BIRIM_DAIRE_MAP = {
  'Bilgi İşlem Dairesi Başkanlığı': { daire: 'Bilgi İşlem Dairesi Başkanlığı' },
  'Yazılım Şube Müdürlüğü Personeli': { daire: 'Bilgi İşlem Dairesi Başkanlığı', mudurluk: 'Yazılım Şube Müdürlüğü' },
  'Yönetim Bilgi Sistemleri Şube Müdürlüğü Personeli': { daire: 'Bilgi İşlem Dairesi Başkanlığı' },
  'Toplu Ulaşım Hizmetleri Şube Müdürlüğü Personeli': { daire: 'Ulaşım Dairesi Başkanlığı', mudurluk: 'Toplu Ulaşım Hizmetleri Şube Müdürlüğü' },
  'Trafik Hizmetleri Şube Müdürlüğü Personeli': { daire: 'Ulaşım Dairesi Başkanlığı', mudurluk: 'Trafik Hizmetleri Şube Müdürlüğü' },
  'Trafik Hizmetleri Şube Müdürlüğü': { daire: 'Ulaşım Dairesi Başkanlığı', mudurluk: 'Trafik Hizmetleri Şube Müdürlüğü' },
  'Denizcilik Şube Müdürlüğü Personeli': { daire: 'Ulaşım Dairesi Başkanlığı', mudurluk: 'Denizcilik Şube Müdürlüğü' },
  'Terminaller ve Otoparklar Şube Müdürlüğü Personeli': { daire: 'Ulaşım Dairesi Başkanlığı', mudurluk: 'Terminaller ve Otoparklar Şube Müdürlüğü' },
  'Ulaşım Planlama Şube Müdürlüğü Personeli': { daire: 'Ulaşım Dairesi Başkanlığı', mudurluk: 'Ulaşım Planlama Şube Müdürlüğü' },
  'Ulaşım Koordinasyon Şube Müdürlüğü (UKOME) Personeli': { daire: 'Ulaşım Dairesi Başkanlığı' },
  'Makine ve İkmal Şube Müdürlüğü Personeli': { daire: 'Ulaşım Dairesi Başkanlığı' },
  'Sağlık Hizmetleri Şube Müdürlüğü Personeli': { daire: 'Sağlık ve Sosyal Hizmetler Dairesi Başkanlığı', mudurluk: 'Sağlık Hizmetleri Şube Müdürlüğü' },
  'Sosyal Hizmetler Şube Müdürlüğü Personeli': { daire: 'Sağlık ve Sosyal Hizmetler Dairesi Başkanlığı', mudurluk: 'Sosyal Hizmetler Şube Müdürlüğü' },
  'Engelli Hizmetleri Şube Müdürlüğü Personeli': { daire: 'Sağlık ve Sosyal Hizmetler Dairesi Başkanlığı' },
  'Mezarlıklar Şube Müdürlüğü Personeli': { daire: 'Sağlık ve Sosyal Hizmetler Dairesi Başkanlığı' },
  'Veteriner Hizmetleri Şube Müdürlüğü Personeli': { daire: 'Tarımsal Hizmetler Dairesi Başkanlığı' },
  'Tarım ve Hayvancılık Araştırma Destekleme ve Eğitim Şube Müdürlüğü Personeli': { daire: 'Tarımsal Hizmetler Dairesi Başkanlığı' },
  'Yeşil Alanlar Bakım ve Onarım Şube Müdürlüğü Personeli': { daire: 'Fen İşleri Dairesi Başkanlığı' },
  'Yol Bakım Ve İşletme Şube Müdürlüğü Personeli': { daire: 'Fen İşleri Dairesi Başkanlığı' },
  'Yol Proje Ve Yapım Şube Müdürlüğü Personeli': { daire: 'Fen İşleri Dairesi Başkanlığı' },
  'Altyapı Koordinasyon Şube Müdürlüğü (AYKOME) Personeli': { daire: 'Fen İşleri Dairesi Başkanlığı' },
  'Harita Şube Müdürlüğü Personeli': { daire: 'İmar ve Şehircilik Dairesi Başkanlığı' },
  'Yapı Ruhsatı ve Kontrol Şube Müdürlüğü Personeli': { daire: 'İmar ve Şehircilik Dairesi Başkanlığı' },
  'İmar Planlama Şube Müdürlüğü Personeli': { daire: 'İmar ve Şehircilik Dairesi Başkanlığı' },
  'Üst Ölçek Planlama ve Mevzuat Geliştirme Şube Müdürlüğü Personeli': { daire: 'İmar ve Şehircilik Dairesi Başkanlığı' },
  'Deprem ve Risk Yönetimi Şube Müdürlüğü Personeli': { daire: 'İmar ve Şehircilik Dairesi Başkanlığı' },
  'Halkla İlişkiler Şube Müdürlüğü Personeli': { daire: 'Basın Yayın ve Halkla İlişkiler Dairesi Başkanlığı' },
  'Basın Yayın Şube Müdürlüğü Personeli': { daire: 'Basın Yayın ve Halkla İlişkiler Dairesi Başkanlığı' },
  'Sivil Toplum Kuruluşları İletişim Şube Müdürlüğü Personeli': { daire: 'Basın Yayın ve Halkla İlişkiler Dairesi Başkanlığı' },
  'Emlak Yönetim Şube Müdürlüğü Personeli': { daire: 'Emlak ve İstimlak Dairesi Başkanlığı' },
  'Taşınmaz Mallar Şube Müdürlüğü Personeli': { daire: 'Emlak ve İstimlak Dairesi Başkanlığı' },
  'Kamulaştırma Şube Müdürlüğü Personeli': { daire: 'Emlak ve İstimlak Dairesi Başkanlığı' },
  'Gelirler Şube Müdürlüğü Personeli': { daire: 'Mali Hizmetler Dairesi Başkanlığı' },
  'Muhasebe Şube Müdürlüğü Personeli': { daire: 'Mali Hizmetler Dairesi Başkanlığı' },
  'Zabıta Denetim Şube Müdürlüğü Personeli': { daire: 'Zabıta Dairesi Başkanlığı' },
  'Zabıta Trafik Şube Müdürlüğü Personeli': { daire: 'Zabıta Dairesi Başkanlığı' },
  'Çevre ve İmar Zabıtası Şube Müdürlüğü Personeli': { daire: 'Zabıta Dairesi Başkanlığı' },
  'Zabıta Şube Müdürlüğü Personeli': { daire: 'Zabıta Dairesi Başkanlığı' },
  'Müdahale ve Kentsel Arama Kurtarma Şube Müdürlüğü Personeli': { daire: 'İtfaiye Dairesi Başkanlığı' },
  'Önleme Şube Müdürlüğü Personeli': { daire: 'İtfaiye Dairesi Başkanlığı' },
  'Eğitim ve İdari İşler Şube Müdürlüğü Personeli': { daire: 'İtfaiye Dairesi Başkanlığı' },
  'Çevre Yönetimi ve Kent Temizliği Şube Müdürlüğü Personeli': { daire: 'Çevre Koruma ve Kontrol Dairesi Başkanlığı' },
  'Atık Yönetimi Şube Müdürlüğü Personeli': { daire: 'Çevre Koruma ve Kontrol Dairesi Başkanlığı' },
  'Hafriyat Yönetimi ve Denetim Şube Müdürlüğü Personeli': { daire: 'Çevre Koruma ve Kontrol Dairesi Başkanlığı' },
  'Ruhsat ve Denetim Şube Müdürlüğü Personeli': { daire: 'Çevre Koruma ve Kontrol Dairesi Başkanlığı' },
  'Kültür ve Sosyal İşler Şube Müdürlüğü Personeli': { daire: 'Kültür, Sanat ve Sosyal İşler Dairesi Başkanlığı' },
  'İnsan Kaynakları Şube Müdürlüğü Personeli': { daire: 'İnsan Kaynakları ve Eğitim Dairesi Başkanlığı' },
  'Eğitim Şube Müdürlüğü Personeli': { daire: 'İnsan Kaynakları ve Eğitim Dairesi Başkanlığı' },
  'İşçi Hizmetleri Şube Müdürlüğü Personeli': { daire: 'İnsan Kaynakları ve Eğitim Dairesi Başkanlığı' },
  'Kadın Politikaları Şube Müdürlüğü Personeli': { daire: 'Kadın ve Aile Hizmetleri Dairesi Başkanlığı' },
  'Spor Hizmetleri Şube Müdürlüğü Personeli': { daire: 'Gençlik ve Spor Hizmetleri Dairesi Başkanlığı' },
  'Spor Tesisleri Şube Müdürlüğü Personeli': { daire: 'Gençlik ve Spor Hizmetleri Dairesi Başkanlığı' },
  'Enerji Yönetimi ve Etüt Proje Şube Müdürlüğü Personeli': { daire: 'Etüt ve Projeler Dairesi Başkanlığı' },
  'Yapı ve Kontrol İşleri Şube Müdürlüğü Personeli': { daire: 'Etüt ve Projeler Dairesi Başkanlığı' },
  'Özel Kalem Müdürlüğü Personeli': { daire: 'Özel Kalem Müdürlüğü' },
  'Muhtarlık İşleri Şube Müdürlüğü Personeli': { daire: 'Muhtarlık İşleri Dairesi Başkanlığı' },
  'Hal Şube Müdürlüğü Personeli': { daire: 'Zabıta Dairesi Başkanlığı' },
  'Ulaşım Dairesi Başkanlığı': { daire: 'Ulaşım Dairesi Başkanlığı' },
  'Zabıta Dairesi Başkanlığı': { daire: 'Zabıta Dairesi Başkanlığı' },
  'İtfaiye Dairesi Başkanlığı': { daire: 'İtfaiye Dairesi Başkanlığı' },
  'Fen İşleri Dairesi Başkanlığı': { daire: 'Fen İşleri Dairesi Başkanlığı' },
  'Akıllı Şehir ve Kent Bilgi Sistemleri Dairesi Başkanlığı Personeli': { daire: 'Akıllı Şehir ve Kent Bilgi Sistemleri Dairesi Başkanlığı' },
  'AKOM Şube Müdürlüğü Personeli': { daire: 'Afet İşleri ve Risk Yönetimi Dairesi Başkanlığı' },
  'Planlama ve Eğitim Şube Müdürlüğü Personeli': { daire: 'Afet İşleri ve Risk Yönetimi Dairesi Başkanlığı' },
  'İdari İşler ve Lojistik Şube Müdürlüğü Personeli': { daire: 'Afet İşleri ve Risk Yönetimi Dairesi Başkanlığı' },
  'Bina, Tesis Bakım Onarım ve İdari İşler Şube Müdürlüğü Personeli': { daire: 'Destek Hizmetleri Dairesi Başkanlığı' },
  'Tarımsal Yapı Şube Müdürlüğü Personeli': { daire: 'Tarımsal Hizmetler Dairesi Başkanlığı' },
  'Yazı İşleri Şube Müdürlüğü Personeli': { daire: 'Yazı İşleri ve Kararlar Dairesi Başkanlığı' },
  'Uluslararası İlişkiler Şube Müdürlüğü Personeli': { daire: 'Dış İlişkiler Dairesi Başkanlığı' },
  'Genel Sekreterlik': { daire: 'Genel Sekreterlik' },
  'Mezbaha Hizmetleri Şube Müdürlüğü Personeli': { daire: 'Tarımsal Hizmetler Dairesi Başkanlığı' },
  '1. Hukuk Müşavirliği Personeli': { daire: 'Hukuk Müşavirliği' },
  'Rehberlik ve Teftiş Kurulu Başkanlığı Personeli': { daire: 'Teftiş Kurulu Başkanlığı' },
  'Çocuk Politikaları Şube Müdürlüğü Personeli': { daire: 'Kadın ve Aile Hizmetleri Dairesi Başkanlığı' },
  'İdari İşler Şefliği': { daire: 'Ulaşım Dairesi Başkanlığı' },
  'Kültür, Sanat ve Sosyal İşler Dairesi Başkanlığı': { daire: 'Kültür, Sanat ve Sosyal İşler Dairesi Başkanlığı' },
  'Kültür ve Sosyal İşler Şube Müdürlüğü': { daire: 'Kültür, Sanat ve Sosyal İşler Dairesi Başkanlığı' },
  'Çevre Yönetimi ve Kent Temizliği Şube Müdürlüğü': { daire: 'Çevre Koruma ve Kontrol Dairesi Başkanlığı' },
  'Trafik Hizmetleri Şube Müdürlüğü': { daire: 'Ulaşım Dairesi Başkanlığı' },
  'Sosyal Hizmetler Şube Müdürlüğü': { daire: 'Sağlık ve Sosyal Hizmetler Dairesi Başkanlığı' },
  'Etüt ve Projeler Dairesi Başkanlığı': { daire: 'Etüt ve Projeler Dairesi Başkanlığı' },
  'Çevre Koruma ve Kontrol Dairesi Başkanlığı': { daire: 'Çevre Koruma ve Kontrol Dairesi Başkanlığı' },
  'İlçe Hizmetleri 1. Bölge Dairesi Başkanlığı ': { daire: 'İlçe Hizmetleri Dairesi Başkanlığı' },
  'İlçe Hizmetleri 2. Bölge Dairesi Başkanlığı ': { daire: 'İlçe Hizmetleri Dairesi Başkanlığı' },
  'İlçe Hizmetleri 3. Bölge Dairesi Başkanlığı': { daire: 'İlçe Hizmetleri Dairesi Başkanlığı' },
  'İlçe Hizmetleri 4. Bölge Dairesi Başkanlığı ': { daire: 'İlçe Hizmetleri Dairesi Başkanlığı' },
  'Çağrı Merkezi': { daire: null },
  'MELSA': { daire: null },
  'Muğla Büyükşehir Belediyesi MKS Turizm İnşaat TAŞ.SAN.TİC. A.Ş': { daire: null },
  'Muski G.M.': { daire: null },
};

const KONULAR = [
  { id: 4,   ad: 'Bilgisayar Arızası ve Kurulum', birim: 'Bilgi İşlem Dairesi Başkanlığı', tur: 'Personele Yönelik Konular' },
  { id: 11,  ad: 'Hizmet Binası İnternet Talebi', birim: 'Bilgi İşlem Dairesi Başkanlığı', tur: 'Personele Yönelik Konular' },
  { id: 68,  ad: 'Havalimanı Sefer Saatleri (Ulaşım)', birim: 'Toplu Ulaşım Hizmetleri Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 71,  ad: 'Hasta Nakil Ambulans Talebi', birim: 'Sağlık Hizmetleri Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 73,  ad: 'Seyahat Kartı (Ulaşım)', birim: 'Toplu Ulaşım Hizmetleri Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 85,  ad: 'Gıda Yardımı', birim: 'Sosyal Hizmetler Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 87,  ad: 'Evde Bakım Hizmetleri Talebi', birim: 'Sağlık Hizmetleri Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 98,  ad: 'Zabıta Çevre İle İlgili', birim: 'Çevre ve İmar Zabıtası Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 100, ad: 'Trafik Levha, Direk Vb.', birim: 'Trafik Hizmetleri Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 103, ad: 'Engelli Nakil Aracı Talebi', birim: 'Engelli Hizmetleri Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 104, ad: 'Yakacak Yardımı', birim: 'Sosyal Hizmetler Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 123, ad: 'Sokak Hayvan Ölüsü', birim: 'Çağrı Merkezi', tur: 'Tüm Konular' },
  { id: 126, ad: 'Yama Talebi (Fen İşleri)', birim: 'Yol Bakım Ve İşletme Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 127, ad: 'Kasis (Ulaşım)', birim: 'Trafik Hizmetleri Şube Müdürlüğü', tur: 'Vatandaşa Yönelik Konular' },
  { id: 129, ad: 'Kent Tarihi ve Tanıtımı Dairesi Başkanlığı', birim: 'Çağrı Merkezi', tur: 'Tüm Konular' },
  { id: 134, ad: 'Başıboş Hayvan Şikayetleri', birim: 'Veteriner Hizmetleri Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 157, ad: 'Başıboş Köpek Şikayetleri', birim: 'Veteriner Hizmetleri Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 158, ad: 'İşletme İştirakler Dairesi Başkanlığı', birim: 'Çağrı Merkezi', tur: 'Tüm Konular' },
  { id: 170, ad: 'Ağaç Talebi (Tarımsal)', birim: 'Yeşil Alanlar Bakım ve Onarım Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 187, ad: 'Ruhsatsız yapılar şikayeti', birim: 'Yapı Ruhsatı ve Kontrol Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 189, ad: 'Parke, Bordür ve Kaldırım Tamiratı', birim: 'Yol Bakım Ve İşletme Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 200, ad: 'Baca Temizleme Kontrolü (İtfaiye)', birim: 'Müdahale ve Kentsel Arama Kurtarma Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 215, ad: 'Akıllı Şehirler Dairesi Başkanlığı', birim: 'Akıllı Şehir ve Kent Bilgi Sistemleri Dairesi Başkanlığı Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 217, ad: 'Web İle İlgili Şikayetler Ve Talepler', birim: 'Yazılım Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 220, ad: 'Gıda Denetim Şikayetleri', birim: 'Çağrı Merkezi', tur: 'Tüm Konular' },
  { id: 229, ad: 'Dilenci Şikayetleri', birim: 'Çağrı Merkezi', tur: 'Tüm Konular' },
  { id: 244, ad: 'Ot Biçme Talebi', birim: 'Yeşil Alanlar Bakım ve Onarım Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 249, ad: 'Seyyar Satıcı', birim: 'Çağrı Merkezi', tur: 'Tüm Konular' },
  { id: 259, ad: 'Tehlikeli Ağaç Bildirimi', birim: 'Yeşil Alanlar Bakım ve Onarım Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 268, ad: 'Yol Yapım Talepleri', birim: 'Yol Proje Ve Yapım Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 283, ad: 'Buzlanma Şikayetleri', birim: 'Çağrı Merkezi', tur: 'Tüm Konular' },
  { id: 288, ad: 'Budama/Kesim Talebi', birim: 'Yeşil Alanlar Bakım ve Onarım Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 294, ad: 'Çevre ve Temizlik İşleri', birim: 'Çevre Yönetimi ve Kent Temizliği Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 299, ad: 'Ev Yangını', birim: 'Müdahale ve Kentsel Arama Kurtarma Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 304, ad: 'Kazı Harfiyat İzinsiz Yol Bozumu', birim: 'Çağrı Merkezi', tur: 'Tüm Konular' },
  { id: 309, ad: 'Yangın Tankeri Ve Hidrant Talebi', birim: 'Müdahale ve Kentsel Arama Kurtarma Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 321, ad: 'Ağaç Yangını', birim: 'Müdahale ve Kentsel Arama Kurtarma Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 366, ad: 'Melsa', birim: 'Çağrı Merkezi', tur: 'Tüm Konular' },
  { id: 378, ad: 'Orman-Maki-Çalılık Yangını', birim: 'Müdahale ve Kentsel Arama Kurtarma Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 386, ad: 'Kayıp Cüzdan', birim: 'Çağrı Merkezi', tur: 'Tüm Konular' },
  { id: 392, ad: 'Su Baskını (İtfaiye)', birim: 'Müdahale ve Kentsel Arama Kurtarma Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 396, ad: 'Elektrik Yangını', birim: 'Müdahale ve Kentsel Arama Kurtarma Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 397, ad: 'Koku Şikayetleri', birim: 'Çağrı Merkezi', tur: 'Tüm Konular' },
  { id: 402, ad: 'Heyelan', birim: 'Çağrı Merkezi', tur: 'Tüm Konular' },
  { id: 413, ad: 'Trafik Kazası (İtfaiye)', birim: 'Müdahale ve Kentsel Arama Kurtarma Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 415, ad: 'Kurtarma Talebi (İtfaiye)', birim: 'Müdahale ve Kentsel Arama Kurtarma Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 432, ad: 'ÇEVRE VE KORUMA DAİRESİ BAŞKANLIĞI', birim: 'Çevre Yönetimi ve Kent Temizliği Şube Müdürlüğü', tur: 'Tüm Konular' },
  { id: 459, ad: 'Deniz Kirliliği Şikayetleri', birim: 'Çevre Yönetimi ve Kent Temizliği Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 463, ad: 'Baca Şikayetleri (Zabıta)', birim: 'Çevre ve İmar Zabıtası Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 478, ad: 'Yol Onarım Talebi', birim: 'Yol Bakım Ve İşletme Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 486, ad: 'Karla Mücadele', birim: 'Yol Bakım Ve İşletme Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 505, ad: 'Park/Mesire Alanı Yapım Talebi', birim: 'Yeşil Alanlar Bakım ve Onarım Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 511, ad: 'Hafriyat Şikayetleri', birim: 'Hafriyat Yönetimi ve Denetim Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 534, ad: 'Muhtar Talepleri', birim: 'Muhtarlık İşleri Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 570, ad: 'Oyun Grubu Talebi', birim: 'Yeşil Alanlar Bakım ve Onarım Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 572, ad: 'Eğitim ve Tatbikat Talebi (İtfaiye)', birim: 'Eğitim ve İdari İşler Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 596, ad: 'E-Posta Hesabı Sorunları', birim: 'Bilgi İşlem Dairesi Başkanlığı', tur: 'Personele Yönelik Konular' },
  { id: 735, ad: 'Bilgilendirme Yapıldı', birim: 'Çağrı Merkezi', tur: 'Vatandaşa Yönelik Konular' },
  { id: 745, ad: 'Ev Yangını (İtfaiye)', birim: 'Müdahale ve Kentsel Arama Kurtarma Şube Müdürlüğü Personeli', tur: 'Vatandaşa Yönelik Konular' },
  { id: 821, ad: 'MuglaApp Başkana Ulaş', birim: 'Çağrı Merkezi', tur: 'Vatandaşa Yönelik Konular' },
];

async function main() {
  let count = 0;

  for (const konu of KONULAR) {
    const eslestirme = BIRIM_DAIRE_MAP[konu.birim] || { daire: null };

    await prisma.ulakbellKonuEslestirme.upsert({
      where: { ulakbellKonuId: konu.id },
      create: {
        ulakbellKonuId: konu.id,
        konuAdi:        konu.ad,
        konuTuru:       konu.tur,
        ulakbellBirim:  konu.birim,
        portalDaire:    eslestirme.daire || null,
        portalMudurluk: eslestirme.mudurluk || null,
        bildirimAktif:  konu.tur !== 'Personele Yönelik Konular',
      },
      update: {
        konuAdi:        konu.ad,
        konuTuru:       konu.tur,
        ulakbellBirim:  konu.birim,
        portalDaire:    eslestirme.daire || null,
        portalMudurluk: eslestirme.mudurluk || null,
      },
    });
    count++;
  }

  console.log(`${count} konu eslestirmesi upsert edildi`);

  const vatandasDaire = await prisma.ulakbellKonuEslestirme.count({
    where: { konuTuru: 'Vatandaşa Yönelik Konular', portalDaire: { not: null } },
  });
  const cagriMerkezi = await prisma.ulakbellKonuEslestirme.count({
    where: { portalDaire: null },
  });

  console.log(`Vatandas + daire eslesmeli: ${vatandasDaire}`);
  console.log(`Cagri merkezi direkt: ${cagriMerkezi}`);

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
