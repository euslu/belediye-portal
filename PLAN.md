# Doğum Günü & Evlilik Yıldönümü — Daire Bazlı Filtreleme

## Mevcut Durum
- `BSK_PERSONEL_DOGUM` dataset: `DAIRE`, `MUDURLUK` alanları **var** → doğrudan filtrelenebilir
- `BSK_PERSONEL_EVLENME` dataset: `DAIRE`/`MUDURLUK` alanları **yok** → TC_KIMLIK_NO üzerinden BSK_PERSONEL_BILGI ile eşleştirmek gerekiyor

## Plan

### 1. Backend — `routes/flexcity.js`

**a) `GET /api/flexcity/personel-dogum?daire=...`**
- `daire` query param'ı gelirse, `DAIRE` alanına göre filtrele (case-insensitive includes)
- Param yoksa tüm listeyi döndür (mevcut davranış korunur)

**b) `GET /api/flexcity/istatistik` → `evlenmeListesi`'ne daire bilgisi ekle**
- `getBskIstatistik()` fonksiyonunda BSK_PERSONEL_BILGI zaten çekiliyor (değişken `P`)
- `TC_KIMLIK_NO` ile eşleştirerek evlenme listesine `daire` ve `mudurluk` ekle
- `evlenmeListesi` objelerine `daire` alanı eklenmesi yeterli

### 2. Frontend — `ManagerDashboard.jsx` → `DaireBaskaniDashboard`

**a) Doğum günleri fetch'ine `daire` param ekle:**
```
/api/flexcity/personel-dogum?daire=${encodeURIComponent(user.directorate)}
```

**b) Evlenme listesini frontend'de filtrele:**
- `istatistik` endpoint'inden gelen `evlenmeListesi`'ndeki `daire` alanı ile `user.directorate` karşılaştır

### Değişecek Dosyalar
1. `backend/services/flexcity.js` — `evlenmeListesi`'ne `daire` alanı ekle (BSK_PERSONEL_BILGI cross-ref)
2. `backend/routes/flexcity.js` — `personel-dogum` endpoint'ine `daire` filtresi ekle
3. `frontend/src/pages/ManagerDashboard.jsx` — fetch URL'lerine daire param ekle + evlenme listesini filtrele
