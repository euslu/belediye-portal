const express = require('express');
const router  = express.Router();
const PDFDocument = require('pdfkit');
const fs   = require('fs');
const path = require('path');

const TUTANAK_DIR = path.join(__dirname, '../public/tutanaklar');
if (!fs.existsSync(TUTANAK_DIR)) fs.mkdirSync(TUTANAK_DIR, { recursive: true });

// ─── Yardımcı: tablo çiz ────────────────────────────────────────────────────
function drawTable(doc, x, y, cols, rows, rowH = 22) {
  const tableW = cols.reduce((s, c) => s + c.w, 0);

  // Başlık satırı
  doc.rect(x, y, tableW, rowH).fillAndStroke('#f3f4f6', '#9ca3af');
  let cx = x;
  cols.forEach(col => {
    doc.fillColor('#374151').fontSize(8).font('Helvetica-Bold')
       .text(col.label, cx + 4, y + 7, { width: col.w - 8, align: 'center' });
    cx += col.w;
  });
  y += rowH;

  // Veri satırları
  rows.forEach((row, ri) => {
    const bg = ri % 2 === 0 ? '#ffffff' : '#f9fafb';
    doc.rect(x, y, tableW, rowH).fillAndStroke(bg, '#e5e7eb');
    cx = x;
    cols.forEach(col => {
      const val = row[col.key] ?? '—';
      doc.fillColor('#111827').fontSize(8).font('Helvetica')
         .text(String(val), cx + 4, y + 7, { width: col.w - 8, align: 'center' });
      cx += col.w;
    });
    y += rowH;
  });

  return y; // son y pozisyonu
}

// ─── Yardımcı: bilgi kutusu ─────────────────────────────────────────────────
function infoBox(doc, x, y, w, label, value, h = 36) {
  doc.rect(x, y, w, h).fillAndStroke('#f9fafb', '#d1d5db');
  doc.fillColor('#6b7280').fontSize(7).font('Helvetica-Bold')
     .text(label, x + 8, y + 6);
  doc.fillColor('#111827').fontSize(10).font('Helvetica')
     .text(value || '—', x + 8, y + 18, { width: w - 16 });
  return y + h;
}

// ─── POST /api/tutanak/olustur ───────────────────────────────────────────────
router.post('/olustur', async (req, res) => {
  try {
    const {
      tur,          // 'sim' | 'sim_modem'
      tarih,
      saat,
      talepDaire,
      talepMudurluk,
      teslimAlan,   // kişi adı
      simSatirlari, // [{ gsm, iccid, paket }]
      cihazSatirlari, // [{ cihaz, seriNo, imei }]  — sadece sim_modem
      teslimEdenImza, // base64 PNG
      teslimAlanImza, // base64 PNG
    } = req.body;

    // Dosya adı
    const ts       = Date.now();
    const fileName = `tutanak_${ts}.pdf`;
    const filePath = path.join(TUTANAK_DIR, fileName);

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const PW = doc.page.width - 80; // kullanılabilir genişlik (40+40 margin)
    const X  = 40;
    let   Y  = 40;

    // ── Başlık ──────────────────────────────────────────────────────────────
    doc.rect(X, Y, PW, 44).fillAndStroke('#1e40af', '#1e40af');
    doc.fillColor('#ffffff').fontSize(15).font('Helvetica-Bold')
       .text('SIM KART TESLİM TUTANAĞI', X, Y + 14, { width: PW, align: 'center' });
    Y += 52;

    // ── Bilgi kutuları (2 sütun) ─────────────────────────────────────────────
    const HW = (PW - 8) / 2;
    infoBox(doc, X,      Y, HW, 'Teslim Tarih', tarih || '—');
    infoBox(doc, X + HW + 8, Y, HW, 'Teslim Saati', saat || '—');
    Y += 44;

    infoBox(doc, X, Y, PW, 'Teslim Yeri', 'Muğla Büyükşehir Belediyesi Bilgi İşlem Dairesi Başkanlığı');
    Y += 44;

    infoBox(doc, X,      Y, HW, 'Talep Eden Daire Başkanlığı', talepDaire || '—');
    infoBox(doc, X + HW + 8, Y, HW, 'Talep Eden Şube Müdürlüğü', talepMudurluk || '—');
    Y += 44;

    // ── Açıklama metni ───────────────────────────────────────────────────────
    Y += 8;
    const aciklama = tur === 'sim_modem'
      ? `Aşağıda GSM numarası, ICCID kodu ve paketi belirtilen SIM kart/kartları ve Cihaz adı, Seri numarası ve IMEI numarası belirtilen cihazların ${teslimAlan || '……………………………………………'} kullanılmak üzere çalışır şekilde teslim ve zimmet edilmiştir.`
      : `Aşağıda GSM numarası, ICCID kodu ve paketi belirtilen SIM kart/kartları ${teslimAlan || '……………………………………………'} kullanılmak üzere çalışır şekilde teslim edilmiştir.`;

    doc.fillColor('#111827').fontSize(9).font('Helvetica')
       .text(aciklama, X, Y, { width: PW });
    Y += doc.heightOfString(aciklama, { width: PW }) + 12;

    // ── SIM tablosu ──────────────────────────────────────────────────────────
    doc.fillColor('#374151').fontSize(9).font('Helvetica-Bold').text('SIM Kart Bilgileri', X, Y);
    Y += 14;

    const simCols = [
      { key: 'no',    label: 'NO',     w: 30  },
      { key: 'gsm',   label: 'GSM NO', w: 120 },
      { key: 'iccid', label: 'ICCID',  w: 180 },
      { key: 'paket', label: 'PAKET',  w: PW - 330 },
    ];
    const simRows = (simSatirlari || []).map((r, i) => ({ no: i + 1, ...r }));
    Y = drawTable(doc, X, Y, simCols, simRows);
    Y += 12;

    // ── Cihaz tablosu (sim_modem) ────────────────────────────────────────────
    if (tur === 'sim_modem' && cihazSatirlari?.length) {
      doc.fillColor('#374151').fontSize(9).font('Helvetica-Bold').text('Cihaz Bilgileri', X, Y);
      Y += 14;

      const cihazCols = [
        { key: 'no',     label: 'NO',           w: 30  },
        { key: 'cihaz',  label: 'CİHAZ',        w: 120 },
        { key: 'seriNo', label: 'CİHAZ SERİ NO', w: 160 },
        { key: 'imei',   label: 'IMEİ',          w: PW - 310 },
      ];
      const cihazRows = (cihazSatirlari || []).map((r, i) => ({ no: i + 1, ...r }));
      Y = drawTable(doc, X, Y, cihazCols, cihazRows);
      Y += 12;
    }

    // ── Dipnot ───────────────────────────────────────────────────────────────
    doc.fillColor('#6b7280').fontSize(8).font('Helvetica-Oblique')
       .text('İş bu tutanak tarafımızdan imza edilerek 2 nüsha olarak düzenlenmiştir.', X, Y, { width: PW });
    Y += 20;

    // ── İmza kutuları ────────────────────────────────────────────────────────
    const IW = (PW - 16) / 2;
    const IH = 110;

    // Sol: Teslim Eden
    doc.rect(X, Y, IW, IH).fillAndStroke('#f9fafb', '#d1d5db');
    doc.fillColor('#374151').fontSize(9).font('Helvetica-Bold')
       .text('TESLİM EDEN', X, Y + 8, { width: IW, align: 'center' });

    if (teslimEdenImza) {
      const buf = Buffer.from(teslimEdenImza.replace(/^data:image\/png;base64,/, ''), 'base64');
      doc.image(buf, X + 10, Y + 24, { width: IW - 20, height: 70, fit: [IW - 20, 70] });
    }

    // Sağ: Teslim Alan
    doc.rect(X + IW + 16, Y, IW, IH).fillAndStroke('#f9fafb', '#d1d5db');
    doc.fillColor('#374151').fontSize(9).font('Helvetica-Bold')
       .text('TESLİM ALAN', X + IW + 16, Y + 8, { width: IW, align: 'center' });

    if (teslimAlanImza) {
      const buf = Buffer.from(teslimAlanImza.replace(/^data:image\/png;base64,/, ''), 'base64');
      doc.image(buf, X + IW + 26, Y + 24, { width: IW - 20, height: 70, fit: [IW - 20, 70] });
    }

    doc.end();

    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    res.json({ ok: true, url: `/tutanaklar/${fileName}`, fileName });
  } catch (e) {
    console.error('[tutanak] PDF hatası:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/tutanak/liste ──────────────────────────────────────────────────
router.get('/liste', (req, res) => {
  try {
    const files = fs.readdirSync(TUTANAK_DIR)
      .filter(f => f.endsWith('.pdf'))
      .map(f => {
        const stat = fs.statSync(path.join(TUTANAK_DIR, f));
        return { fileName: f, url: `/tutanaklar/${f}`, olusturmaTarihi: stat.mtime };
      })
      .sort((a, b) => new Date(b.olusturmaTarihi) - new Date(a.olusturmaTarihi));
    res.json(files);
  } catch (e) {
    res.json([]);
  }
});

module.exports = router;
