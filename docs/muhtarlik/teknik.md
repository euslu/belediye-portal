# Teknik Detaylar — Muhtarlık Modülü

---

## Veritabanı Bağlantısı

| Parametre  | Değer                  |
|------------|------------------------|
| Host       | 10.5.2.69              |
| Port       | 3322                   |
| Database   | Muhtarbis              |
| Auth Type  | NTLM (Windows Domain)  |
| Domain     | MUGLABB                |
| User       | ethem.usluoglu         |

**Not:** Mac'ten bağlanmak için `authentication: { type: 'ntlm', options: { domain, userName, password } }` formatı kullanılmalı (klasik `user/domain` formatı çalışmıyor).

**Not:** Backend sunucusu (10.5.1.180) → 10.5.2.69:3322 erişimi YOK (firewall). Geliştirme Mac üzerinden, prodüksiyonda farklı bir çözüm gerekecek (port açtırılacak).

---

## View: view_Mahalle_Basvuru_AtananIs

**Toplam kayıt:** 14.802

### Kolon Yapısı

| Kolon                   | Tip            | Açıklama                        |
|-------------------------|----------------|---------------------------------|
| OBJECTID                | int            | Birincil anahtar                |
| MAHALLE_OBJECTID        | int            | Mahalle ID                      |
| MAHALLE_AD              | nvarchar(50)   | Mahalle adı                     |
| MAHALLE_AD_1            | nvarchar(50)   | İlçe adı                        |
| MUHTAR_ADI              | nvarchar(255)  | Muhtarın adı soyadı             |
| MAHALLE_UAVT            | int            | UAVT kodu                       |
| SHAPE                   | geometry       | Coğrafi veri (srid:3857)        |
| BASVURU_OBJECTID        | int            | Başvuru ID                      |
| BASVURU_TU              | nvarchar(50)   | Başvuru türü                    |
| BASVURU_TA              | datetime2      | Başvuru tarihi                  |
| BASVURU_SA              | int            | Başvuru saati (?)               |
| CEVAP_SURE              | int            | Cevap süresi                    |
| MUHTAR_DOS              | int            | Muhtar dosya no                 |
| M_Dosya_Tarihi          | datetime2      | Dosya tarihi                    |
| KONUSU                  | nvarchar(254)  | Başvuru konusu                  |
| TALEP_GENE              | nvarchar(254)  | Genel talep açıklaması          |
| BASVURU_created_user    | nvarchar(255)  | Oluşturan kullanıcı             |
| BASVURU_created_date    | datetime2      | Oluşturma tarihi                |
| BASVURU_last_edited_user| nvarchar(255)  | Son düzenleyen                  |
| BASVURU_last_edited_date| datetime2      | Son düzenleme tarihi            |
| BASVURU_GLOBALID        | uniqueidentifier | Başvuru GUID                  |
| MAHALLE_ID              | uniqueidentifier | Mahalle GUID                  |
| BIRIM_IS_OBJECTID       | int            | Birim iş ID                     |
| DAIRE_BASK              | int            | Daire başkanlığı kodu           |
| DAIRE_BASK_ADI          | varchar(50)    | Daire başkanlığı adı            |
| BIRIM_TALE              | nvarchar(255)  | Birime atanan talep             |
| BIRIM_TA_1              | nvarchar(254)  | Birim talep detayı              |
| BIRIM_CEVA              | datetime2      | Birim cevap tarihi              |
| BIRIM_CE_1              | int            | Birim cevap kodu                |
| BIRIM_ISLE              | nvarchar(50)   | Birim işlem durumu              |
| BIRIM_CE_2              | nvarchar(254)  | Birim cevap metni               |
| BIRIM_created_user      | nvarchar(255)  | Birimi oluşturan                |
| BIRIM_created_date      | datetime2      | Birim oluşturma tarihi          |
| BIRIM_last_edited_user  | nvarchar(255)  | Birimi son düzenleyen           |
| BIRIM_last_edited_date  | datetime2      | Son düzenleme tarihi            |
| BASVURU_ID              | uniqueidentifier | Başvuru GUID (ikinci)         |

### Örnek Veri

```json
{
  "MAHALLE_AD": "ÇANDIR",
  "MAHALLE_AD_1": "KÖYCEĞİZ",
  "MUHTAR_ADI": "Salih YUKARLI",
  "MAHALLE_UAVT": 176391,
  "KONUSU": "...",
  "DAIRE_BASK_ADI": "..."
}
```

---

## mssql Bağlantı Kodu (Node.js)

```js
const sql = require('mssql');

const config = {
  server: process.env.MUHTARBIS_HOST,
  port: +process.env.MUHTARBIS_PORT,
  database: process.env.MUHTARBIS_DB,
  authentication: {
    type: 'ntlm',
    options: {
      domain:   process.env.MUHTARBIS_DOMAIN,
      userName: process.env.MUHTARBIS_USER,
      password: process.env.MUHTARBIS_PASS,
    }
  },
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  connectionTimeout: 15000,
};
```

---

## API Endpoint'leri

> *Geliştirme süreci içinde eklenecek*

---

## Frontend Route'ları

> *Geliştirme süreci içinde eklenecek*
