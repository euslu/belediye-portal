# Muhtarlık İşleri Dairesi Başkanlığı — Geliştirme Dokümanı

**Başlangıç Tarihi:** 25 Mart 2026
**Proje:** Muğla BB Uygulama Portalı — Muhtarlık Modülü
**Sorumlu:** Bilgi İşlem Dairesi Başkanlığı

---

## Genel Bakış

Muhtarbis veritabanındaki mahalle başvuru ve iş takip verilerini
portal üzerinden görselleştiren modül.

**Veri Kaynağı:** Muhtarbis DB → `view_Mahalle_Basvuru_AtananIs`
**Kayıt sayısı:** 14.802 (2025-2026 ağırlıklı)
**Kolonlar:** Mahalle, Başvuru, Atanan İş, Durum, Tarih, İlçe, Daire

---

## Hedefler

- [x] Muhtarbis DB bağlantısı (NTLM auth)
- [x] Backend API endpoint'leri (5 adet)
- [x] Dashboard: istatistik kartları + bar grafikler + stacked durum çubuğu
- [x] Takip tablosu: sayfalı, filtrelenebilir, renk kodlu
- [x] Sidebar'a "Muhtarlık" linki
- [ ] Firewall kuralı — **BEKLIYOR** (IT'ye iletildi)
- [ ] Gerçek veriyle ekran testi
- [ ] Mahalle detay sayfası (ileride)

---

## Checkpointler

| CP     | Tarih         | Başlık                           | Durum                     |
|--------|---------------|----------------------------------|---------------------------|
| CP-001 | 25 Mar 2026   | Başlangıç / Planlama             | ✅ Tamam                  |
| CP-002 | 25 Mar 2026   | DB Bağlantısı Kuruldu            | ✅ Tamam                  |
| CP-003 | 25 Mar 2026   | Veri Analizi Tamamlandı          | ✅ Tamam                  |
| CP-004 | 25 Mar 2026   | Dashboard + Takip Ekranı Yapıldı | ✅ Tamam                  |
| CP-005 | 25 Mar 2026   | Firewall Açıldı, Backend Canlıya Alındı | ✅ Tamam           |

---

## Firewall Talebi

| Alan      | Değer                                    |
|-----------|------------------------------------------|
| Kaynak    | 10.5.1.180 (portal sunucusu)             |
| Hedef     | 10.5.2.69:3322 (Muhtarbis MSSQL)         |
| Protokol  | TCP                                      |
| Durum     | IT birimine iletildi — açılıyor          |

Firewall açılınca test komutu:
```bash
sshpass -p '1retiP1eprU6' ssh mbb@10.5.1.180 \
  "node -e \"require('/var/www/belediye-portal/backend/node_modules/mssql').connect({server:'10.5.2.69',port:3322,database:'Muhtarbis',authentication:{type:'ntlm',options:{domain:'MUGLABB',userName:'ethem.usluoglu',password:'5Ec9f39fd0'}},options:{encrypt:false,trustServerCertificate:true}}).then(p=>{console.log('OK');p.close()}).catch(e=>console.log('FAIL:',e.message))\""
```

---

## Dosya Yapısı

```
docs/muhtarlik/
├── README.md                → Bu dosya
├── gereksinimler.md         → İş gereksinimleri
├── teknik.md                → DB şema, API listesi, bağlantı kodu
└── checkpoints/
    ├── CP-001.md            → Başlangıç
    ├── CP-002.md            → DB bağlantısı
    ├── CP-003.md            → Veri analizi
    └── CP-004.md            → Dashboard + Takip ekranı

backend/
├── routes/muhtarbis.js      → 5 GET endpoint
└── services/muhtarbis.js    → DB bağlantı havuzu + sorgular

frontend/src/pages/
└── Muhtarlik.jsx            → Dashboard + Takip (tek dosya)
```

---

## Linkler

- Portal: http://10.5.1.180/muhtarlik
- Muhtarbis DB: 10.5.2.69:3322
- Ana Proje Dokümanı: https://docs.google.com/document/d/1tf2SYDueJl7hay5gTfaTN7Feh4PRDWwWeQk4ffbMGes/edit
