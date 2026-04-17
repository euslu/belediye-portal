import { useRef, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';

const API = import.meta.env.VITE_API_URL || '';

function authH() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' };
}
function apiFetch(url) {
  return fetch(`${API}${url}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
}

// ─── İmza Pedi ────────────────────────────────────────────────────────────────
function ImzaPedi({ label, sigRef }) {
  const [dolu, setDolu] = useState(false);
  function temizle() { sigRef.current?.clear(); setDolu(false); }
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{label}</div>
      <div style={{ border: `2px solid ${dolu ? '#6366f1' : '#e2e8f0'}`, borderRadius: 10, background: '#fff', overflow: 'hidden', touchAction: 'none' }}>
        <SignatureCanvas
          ref={sigRef}
          penColor="#1e293b"
          canvasProps={{ width: 280, height: 140, style: { display: 'block', width: '100%', height: 140 } }}
          onEnd={() => setDolu(true)}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        {dolu
          ? <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 600 }}>✓ İmza alındı</span>
          : <span style={{ fontSize: 11, color: '#9ca3af' }}>Yukarıya imza atın</span>
        }
        <button onClick={temizle} style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>
          Temizle
        </button>
      </div>
    </div>
  );
}

// ─── GSM Autocomplete input ────────────────────────────────────────────────────
function GsmInput({ value, onChange, onSelect, hatlar, placeholder }) {
  const [acik, setAcik] = useState(false);
  const [aramaMetni, setAramaMetni] = useState(value);
  const wrapRef = useRef(null);

  useEffect(() => { setAramaMetni(value); }, [value]);

  useEffect(() => {
    function tiklama(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setAcik(false); }
    document.addEventListener('mousedown', tiklama);
    return () => document.removeEventListener('mousedown', tiklama);
  }, []);

  const filtreli = aramaMetni.length >= 2
    ? hatlar.filter(h => h.hatNo?.toLowerCase().includes(aramaMetni.toLowerCase())).slice(0, 8)
    : [];

  function handleChange(e) {
    setAramaMetni(e.target.value);
    onChange(e.target.value);
    setAcik(true);
  }

  function handleSelect(hat) {
    setAramaMetni(hat.hatNo);
    onSelect(hat);
    setAcik(false);
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <input
        value={aramaMetni}
        onChange={handleChange}
        onFocus={() => aramaMetni.length >= 2 && setAcik(true)}
        placeholder={placeholder || '0539...'}
        style={{ padding: '8px 10px', fontSize: 13, border: 'none', background: 'transparent', outline: 'none', width: '100%', boxSizing: 'border-box' }}
      />
      {acik && filtreli.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 200, overflowY: 'auto' }}>
          {filtreli.map(h => (
            <div key={h.id} onMouseDown={() => handleSelect(h)}
              style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
              onMouseLeave={e => e.currentTarget.style.background = ''}>
              <span style={{ fontWeight: 600 }}>{h.hatNo}</span>
              {h.iccid && <span style={{ color: '#6b7280', marginLeft: 8 }}>{h.iccid}</span>}
              {h.paket && <span style={{ color: '#9ca3af', marginLeft: 8 }}>{h.paket}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SIM Satır tablosu (GSM autocomplete'li) ──────────────────────────────────
function SimSatirTablosu({ satirlar, setSatirlar, hatlar }) {
  function guncelle(i, key, val) {
    setSatirlar(prev => prev.map((r, ri) => ri === i ? { ...r, [key]: val } : r));
  }
  function secimYap(i, hat) {
    setSatirlar(prev => prev.map((r, ri) => ri === i ? { ...r, gsm: hat.hatNo, iccid: hat.iccid || '', paket: hat.paket || '' } : r));
  }
  function ekle() { setSatirlar(prev => [...prev, { gsm: '', iccid: '', paket: '' }]); }
  function sil(i) { setSatirlar(prev => prev.filter((_, ri) => ri !== i)); }

  const kolonlar = ['GSM No', 'ICCID', 'Paket'];
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>SIM Kart Listesi</div>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 32px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          {kolonlar.map(k => (
            <div key={k} style={{ padding: '8px 10px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k}</div>
          ))}
          <div />
        </div>
        {satirlar.map((satir, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 32px', borderBottom: '1px solid #f1f5f9', background: i % 2 ? '#fafafa' : '#fff' }}>
            <GsmInput
              value={satir.gsm || ''}
              onChange={val => guncelle(i, 'gsm', val)}
              onSelect={hat => secimYap(i, hat)}
              hatlar={hatlar}
            />
            <input value={satir.iccid || ''} onChange={e => guncelle(i, 'iccid', e.target.value)}
              placeholder="8990011..."
              style={{ padding: '8px 10px', fontSize: 13, border: 'none', background: 'transparent', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
            <input value={satir.paket || ''} onChange={e => guncelle(i, 'paket', e.target.value)}
              placeholder="Data Paketi 2"
              style={{ padding: '8px 10px', fontSize: 13, border: 'none', background: 'transparent', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
            <button onClick={() => sil(i)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
        ))}
        {satirlar.length === 0 && (
          <div style={{ padding: '14px 10px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Satır yok</div>
        )}
      </div>
      <button onClick={ekle} style={{ marginTop: 8, padding: '6px 14px', fontSize: 12, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, color: '#0369a1', cursor: 'pointer', fontWeight: 600 }}>
        + Satır Ekle
      </button>
    </div>
  );
}

// ─── Cihaz satır tablosu ──────────────────────────────────────────────────────
function CihazSatirTablosu({ satirlar, setSatirlar }) {
  function guncelle(i, key, val) { setSatirlar(prev => prev.map((r, ri) => ri === i ? { ...r, [key]: val } : r)); }
  function ekle() { setSatirlar(prev => [...prev, { cihaz: '', seriNo: '', imei: '' }]); }
  function sil(i) { setSatirlar(prev => prev.filter((_, ri) => ri !== i)); }

  const kolonlar = [
    { key: 'cihaz', label: 'Cihaz', placeholder: 'TP-Link M700' },
    { key: 'seriNo', label: 'Seri No', placeholder: '22495S...' },
    { key: 'imei', label: 'IMEI', placeholder: '862562...' },
  ];
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Cihaz / Modem Listesi</div>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${kolonlar.length}, 1fr) 32px`, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          {kolonlar.map(k => (
            <div key={k.key} style={{ padding: '8px 10px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k.label}</div>
          ))}
          <div />
        </div>
        {satirlar.map((satir, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: `repeat(${kolonlar.length}, 1fr) 32px`, borderBottom: '1px solid #f1f5f9', background: i % 2 ? '#fafafa' : '#fff' }}>
            {kolonlar.map(k => (
              <input key={k.key} value={satir[k.key] || ''} onChange={e => guncelle(i, k.key, e.target.value)}
                placeholder={k.placeholder}
                style={{ padding: '8px 10px', fontSize: 13, border: 'none', background: 'transparent', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
            ))}
            <button onClick={() => sil(i)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
        ))}
        {satirlar.length === 0 && (
          <div style={{ padding: '14px 10px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Satır yok</div>
        )}
      </div>
      <button onClick={ekle} style={{ marginTop: 8, padding: '6px 14px', fontSize: 12, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, color: '#0369a1', cursor: 'pointer', fontWeight: 600 }}>
        + Satır Ekle
      </button>
    </div>
  );
}

// ─── Custom Date Picker ──────────────────────────────────────────────────────
function DatePicker({ value, onChange }) {
  const [acik, setAcik] = useState(false);
  const [gorunenAy, setGorunenAy] = useState(() => {
    const d = value ? parseDateStr(value) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const dpRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (dpRef.current && !dpRef.current.contains(e.target)) setAcik(false);
    }
    if (acik) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [acik]);

  function parseDateStr(str) {
    const [d, m, y] = str.split('.');
    return new Date(y, m - 1, d);
  }
  function formatDateStr(date) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}.${m}.${y}`;
  }

  const AYLAR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const GUNLER = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];

  function getAyGunleri() {
    const yil = gorunenAy.getFullYear();
    const ay = gorunenAy.getMonth();
    const ilkGun = new Date(yil, ay, 1);
    const sonGun = new Date(yil, ay + 1, 0);
    let baslangic = ilkGun.getDay() - 1;
    if (baslangic < 0) baslangic = 6;
    const gunler = [];
    for (let i = 0; i < baslangic; i++) {
      const d = new Date(yil, ay, -baslangic + i + 1);
      gunler.push({ tarih: d, buAy: false });
    }
    for (let i = 1; i <= sonGun.getDate(); i++) {
      gunler.push({ tarih: new Date(yil, ay, i), buAy: true });
    }
    while (gunler.length < 42) {
      const son = gunler[gunler.length - 1].tarih;
      const yeniGun = new Date(son);
      yeniGun.setDate(son.getDate() + 1);
      gunler.push({ tarih: yeniGun, buAy: false });
    }
    return gunler;
  }

  const seciliTarih = value ? parseDateStr(value) : null;
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);

  function ayDegistir(fark) {
    setGorunenAy(prev => new Date(prev.getFullYear(), prev.getMonth() + fark, 1));
  }

  function gunSec(tarih) {
    onChange(formatDateStr(tarih));
    setAcik(false);
  }

  function ayniGunMu(a, b) {
    return a && b && a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  }

  return (
    <div ref={dpRef} style={{ position: 'relative' }}>
      <div
        onClick={() => setAcik(!acik)}
        style={{
          width: '100%', padding: '9px 12px', fontSize: 13,
          border: `1.5px solid ${acik ? '#43DC80' : '#e2e8f0'}`, borderRadius: 8,
          background: '#f8fafc', color: '#1e293b', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxSizing: 'border-box', transition: 'border-color .15s',
        }}>
        <span>{value || 'Tarih seçin'}</span>
        <span style={{ fontSize: 16, color: '#43DC80' }}>📅</span>
      </div>

      {acik && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          zIndex: 200, background: '#fff', borderRadius: 12,
          border: '1px solid #e2e8f0', boxShadow: '0 12px 36px rgba(0,0,0,0.15)',
          padding: 16, width: 300, userSelect: 'none',
        }}>
          {/* Ay navigasyon */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button onClick={() => ayDegistir(-1)}
              style={{ width: 32, height: 32, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ◀
            </button>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
              {AYLAR[gorunenAy.getMonth()]} {gorunenAy.getFullYear()}
            </span>
            <button onClick={() => ayDegistir(1)}
              style={{ width: 32, height: 32, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ▶
            </button>
          </div>

          {/* Gün başlıkları */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {GUNLER.map(g => (
              <div key={g} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#94a3b8', padding: '4px 0', textTransform: 'uppercase' }}>
                {g}
              </div>
            ))}
          </div>

          {/* Günler */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {getAyGunleri().map((g, i) => {
              const secili = ayniGunMu(g.tarih, seciliTarih);
              const bugunMu = ayniGunMu(g.tarih, bugun);
              return (
                <div key={i} onClick={() => gunSec(g.tarih)}
                  style={{
                    textAlign: 'center', padding: '7px 0', fontSize: 12,
                    borderRadius: 8, cursor: 'pointer', fontWeight: secili ? 700 : 400,
                    background: secili ? '#43DC80' : bugunMu ? '#f0fdf4' : 'transparent',
                    color: secili ? '#fff' : !g.buAy ? '#cbd5e1' : bugunMu ? '#166534' : '#1e293b',
                    border: bugunMu && !secili ? '1px solid #86efac' : '1px solid transparent',
                    transition: 'all .1s',
                  }}
                  onMouseEnter={e => { if (!secili) e.currentTarget.style.background = '#f0fdf4'; }}
                  onMouseLeave={e => { if (!secili) e.currentTarget.style.background = bugunMu ? '#f0fdf4' : 'transparent'; }}>
                  {g.tarih.getDate()}
                </div>
              );
            })}
          </div>

          {/* Bugün butonu */}
          <div style={{ marginTop: 10, textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
            <button onClick={() => { gunSec(bugun); setGorunenAy(new Date(bugun.getFullYear(), bugun.getMonth(), 1)); }}
              style={{ fontSize: 12, fontWeight: 600, color: '#43DC80', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 12px' }}>
              Bugün
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────
export default function TutanakOlustur({ onKapat }) {
  const location = useLocation();
  const navState = location.state || {};

  const [tur, setTur]               = useState('sim');
  const [teslimTarihi, setTeslimTarihi] = useState(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
  });
  const [saat, setSaat]             = useState(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
  const [talepDaire, setTalepDaire] = useState(navState.talepDaire || '');
  const [talepMudurluk, setTalepMudurluk] = useState('');
  const [teslimAlan, setTeslimAlan] = useState(navState.displayName || '');
  const [teslimAlanSerbest, setTeslimAlanSerbest] = useState('');
  const [simSatirlari, setSimSatirlari]     = useState(navState.hatlar || [{ gsm: '', iccid: '', paket: '', notlar: '' }]);
  const [iccidGoster, setIccidGoster] = useState(false);
  const [notlarGoster, setNotlarGoster] = useState(false);
  const [cihazSatirlari, setCihazSatirlari] = useState([{ cihaz: '', seriNo: '', imei: '' }]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata]             = useState('');
  const [pdfUrl, setPdfUrl]         = useState('');

  // Dropdown verileri
  const [daireler, setDaireler]     = useState([]);
  const [mudurlukler, setMudurlukler] = useState([]);
  const [personeller, setPersoneller] = useState([]);
  const [tumHatlar, setTumHatlar]   = useState([]);
  const [simOneri, setSimOneri]     = useState({});

  const token = localStorage.getItem('token');
  const headers = { Authorization: 'Bearer ' + token };

  // Daireleri yükle
  useEffect(() => {
    fetch(`${API}/api/arge/daireler`, { headers }).then(r => r.json()).then(setDaireler).catch(() => {});
    apiFetch('/api/arge/hat-atamalari').then(r => r.json()).then(d => setTumHatlar(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  // Daire seçince müdürlükleri yükle
  useEffect(() => {
    if (!talepDaire) { setMudurlukler([]); return; }
    fetch(`${API}/api/arge/mudurlukleri?directorate=${encodeURIComponent(talepDaire)}`, { headers })
      .then(r => r.json()).then(setMudurlukler).catch(() => {});
    setTalepMudurluk('');
  }, [talepDaire]);

  // Müdürlük seçince personelleri yükle
  useEffect(() => {
    const params = new URLSearchParams();
    if (talepDaire) params.set('directorate', talepDaire);
    if (talepMudurluk) params.set('department', talepMudurluk);
    if (!talepDaire) { setPersoneller([]); return; }
    fetch(`${API}/api/arge/personel-ara?${params}`, { headers })
      .then(r => r.json()).then(setPersoneller).catch(() => {});
  }, [talepDaire, talepMudurluk]);

  const teslimEdenRef = useRef(null);
  const teslimAlanRef = useRef(null);

  const selectSt = {
    width: '100%', padding: '9px 12px', fontSize: 13,
    border: '1.5px solid #e2e8f0', borderRadius: 8,
    background: '#f8fafc', color: '#1e293b', outline: 'none',
    boxSizing: 'border-box', appearance: 'auto',
  };
  const inputSt = {
    width: '100%', padding: '9px 12px', fontSize: 13,
    border: '1.5px solid #e2e8f0', borderRadius: 8,
    background: '#f8fafc', color: '#1e293b', outline: 'none',
    boxSizing: 'border-box',
  };
  const labelSt = { fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 };

  function simAra(index, deger) {
    const yeni = [...simSatirlari];
    yeni[index] = { ...yeni[index], gsm: deger };
    setSimSatirlari(yeni);
    if (deger.length < 2) { setSimOneri(prev => ({ ...prev, [index]: [] })); return; }
    const oneri = tumHatlar.filter(h =>
      h.hatNo?.includes(deger) || h.iccid?.includes(deger) || h.displayName?.toLowerCase().includes(deger.toLowerCase())
    ).slice(0, 8);
    setSimOneri(prev => ({ ...prev, [index]: oneri }));
  }

  async function olustur() {
    const sonTeslimAlan = teslimAlan || teslimAlanSerbest;
    if (!sonTeslimAlan) { setHata('Teslim Alan kişi/birim girilmeli'); return; }
    if (simSatirlari.every(r => !r.gsm)) { setHata('En az bir SIM satırı doldurulmalı'); return; }
    if (teslimEdenRef.current?.isEmpty()) { setHata('Teslim Eden imzası gerekli'); return; }
    if (teslimAlanRef.current?.isEmpty()) { setHata('Teslim Alan imzası gerekli'); return; }

    setHata('');
    setYukleniyor(true);
    try {
      const teslimEdenImza = teslimEdenRef.current.getTrimmedCanvas().toDataURL('image/png');
      const teslimAlanImza = teslimAlanRef.current.getTrimmedCanvas().toDataURL('image/png');

      const r = await fetch(`${API}/api/tutanak/olustur`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({
          tur, tarih: teslimTarihi, saat, talepDaire, talepMudurluk, teslimAlan: sonTeslimAlan,
          simSatirlari: simSatirlari.filter(r => r.gsm),
          cihazSatirlari: tur === 'sim_modem' ? cihazSatirlari.filter(r => r.cihaz) : [],
          teslimEdenImza, teslimAlanImza,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setPdfUrl(d.url);
    } catch (e) {
      setHata(e.message);
    }
    setYukleniyor(false);
  }

  // ── PDF hazır ekranı ────────────────────────────────────────────────────────
  if (pdfUrl) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Tutanak Oluşturuldu</div>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>PDF hazır — indirebilir veya yazdırabilirsiniz.</div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <a href={`${API}/api/tutanak/indir/${pdfUrl.split('/').pop()}?token=${localStorage.getItem('token')}`} target="_blank" rel="noreferrer"
            className="portal-cta-btn portal-cta-btn--green"
            style={{ fontSize: 14, textDecoration: 'none' }}>
            📄 PDF İndir
          </a>
          <button onClick={() => { setPdfUrl(''); setSimSatirlari([{ gsm: '', iccid: '', paket: '' }]); setCihazSatirlari([{ cihaz: '', seriNo: '', imei: '' }]); teslimEdenRef.current?.clear(); teslimAlanRef.current?.clear(); }}
            className="portal-cta-btn portal-cta-btn--green-outline"
            style={{ fontSize: 14 }}>
            Yeni Tutanak
          </button>
          {onKapat && (
            <button onClick={onKapat}
              className="portal-pill-btn"
              style={{ fontSize: 14 }}>
              Kapat
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 900, margin: '0 auto' }}>

      {/* Başlık */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>SIM Kart Teslim Tutanağı</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Formu doldurun, imzaları alın ve PDF oluşturun</p>
        </div>
        {onKapat && (
          <button onClick={onKapat} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#9ca3af' }}>✕</button>
        )}
      </div>

      {/* Tutanak türü */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        {[
          { value: 'sim', label: '📶 Sadece SIM Kart' },
          { value: 'sim_modem', label: '📶 SIM Kart + Modem/Cihaz' },
        ].map(t => (
          <button key={t.value} onClick={() => setTur(t.value)}
            style={{ padding: '10px 20px', borderRadius: 10, border: `2px solid ${tur === t.value ? '#6366f1' : '#e2e8f0'}`, background: tur === t.value ? '#eef2ff' : '#fff', color: tur === t.value ? '#4338ca' : '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Form alanları */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div>
          <label style={labelSt}>Teslim Tarihi</label>
          <DatePicker value={teslimTarihi} onChange={setTeslimTarihi} />
        </div>
        <div>
          <label style={labelSt}>Teslim Saati</label>
          <input value={saat} onChange={e => setSaat(e.target.value)} style={inputSt} />
        </div>
        <div>
          <label style={labelSt}>Talep Eden Daire Başkanlığı</label>
          <select value={talepDaire} onChange={e => setTalepDaire(e.target.value)} style={selectSt}>
            <option value="">— Daire seçin —</option>
            {daireler.map(d => (
              <option key={d.ad} value={d.ad}>{d.ad}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelSt}>Talep Eden Şube Müdürlüğü <span style={{ color: '#94a3b8', fontWeight: 400, textTransform: 'none' }}>(isteğe bağlı)</span></label>
          <select value={talepMudurluk} onChange={e => setTalepMudurluk(e.target.value)}
            disabled={!talepDaire}
            style={{ ...selectSt, background: talepDaire ? '#f8fafc' : '#f1f5f9' }}>
            <option value="">— Müdürlük seçin —</option>
            {mudurlukler.map(m => (
              <option key={m.ad} value={m.ad}>{m.ad}</option>
            ))}
          </select>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelSt}>Teslim Alan (Kişi / Birim Adı) <span style={{ color: '#94a3b8', fontWeight: 400, textTransform: 'none' }}>(isteğe bağlı)</span></label>
          <select value={teslimAlan} onChange={e => { setTeslimAlan(e.target.value); if (e.target.value) setTeslimAlanSerbest(''); }} style={selectSt}>
            <option value="">— Kişi seçin veya yazın —</option>
            {personeller.map(p => (
              <option key={p.username} value={p.displayName}>
                {p.displayName} — {p.title?.substring(0, 30)}
              </option>
            ))}
          </select>
          {!teslimAlan && (
            <input
              type="text"
              placeholder="Ad Soyad / Birim adı yazın..."
              value={teslimAlanSerbest}
              onChange={e => setTeslimAlanSerbest(e.target.value)}
              style={{ ...inputSt, marginTop: 6 }}
            />
          )}
        </div>
      </div>

      {/* SIM satırları */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>SIM Kart Listesi</div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'visible' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '8px 10px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left' }}>GSM No</th>
                <th style={{ padding: '8px 10px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    ICCID
                    <button onClick={() => setIccidGoster(!iccidGoster)}
                      style={{ fontSize: 10, padding: '1px 6px', background: iccidGoster ? '#43DC80' : '#f1f5f9', color: iccidGoster ? '#fff' : '#9aa8a0', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                      {iccidGoster ? '−' : '+'}
                    </button>
                  </div>
                </th>
                <th style={{ padding: '8px 10px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left' }}>Paket</th>
                <th style={{ padding: '8px 10px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    Notlar
                    <button onClick={() => setNotlarGoster(!notlarGoster)}
                      style={{ fontSize: 10, padding: '1px 6px', background: notlarGoster ? '#43DC80' : '#f1f5f9', color: notlarGoster ? '#fff' : '#9aa8a0', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                      {notlarGoster ? '−' : '+'}
                    </button>
                  </div>
                </th>
                <th style={{ width: 32 }} />
              </tr>
            </thead>
            <tbody>
              {simSatirlari.map((satir, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #f1f5f9', background: index % 2 ? '#fafafa' : '#fff' }}>
                  <td style={{ padding: '6px 8px', position: 'relative' }}>
                    <input
                      value={satir.gsm}
                      onChange={e => simAra(index, e.target.value)}
                      placeholder="GSM no veya ad ara..."
                      style={{ width: '100%', padding: '7px 10px', fontSize: 13, border: '1.5px solid #e2e8f0', borderRadius: 7, outline: 'none', boxSizing: 'border-box' }}
                    />
                    {simOneri[index]?.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 8, right: 8, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 240, overflowY: 'auto' }}>
                        {simOneri[index].map((h, i) => (
                          <div key={i}
                            onClick={() => {
                              const yeni = [...simSatirlari];
                              yeni[index] = { gsm: h.hatNo || '', iccid: h.iccid || '', paket: h.paket || '' };
                              setSimSatirlari(yeni);
                              setSimOneri(prev => ({ ...prev, [index]: [] }));
                            }}
                            style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid #f0f4f0' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}>
                            <div style={{ fontWeight: 600, color: '#1a2e23', fontFamily: 'monospace' }}>{h.hatNo}</div>
                            <div style={{ color: '#6b7280', marginTop: 2 }}>
                              {h.displayName && <span>{h.displayName} · </span>}
                              <span>ICCID: {h.iccid?.substring(0, 15)}...</span>
                              <span style={{ marginLeft: 8, color: '#43DC80' }}>{h.paket}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  {iccidGoster ? (
                    <td style={{ padding: '6px 8px' }}>
                      <input value={satir.iccid} onChange={e => { const yeni = [...simSatirlari]; yeni[index] = { ...yeni[index], iccid: e.target.value }; setSimSatirlari(yeni); }}
                        placeholder="ICCID" style={{ width: '100%', padding: '7px 10px', fontSize: 12, border: '1.5px solid #e2e8f0', borderRadius: 7, outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' }} />
                    </td>
                  ) : <td />}
                  <td style={{ padding: '6px 8px' }}>
                    <input value={satir.paket} onChange={e => { const yeni = [...simSatirlari]; yeni[index] = { ...yeni[index], paket: e.target.value }; setSimSatirlari(yeni); }}
                      placeholder="Paket" style={{ width: '100%', padding: '7px 10px', fontSize: 12, border: '1.5px solid #e2e8f0', borderRadius: 7, outline: 'none', boxSizing: 'border-box' }} />
                  </td>
                  {notlarGoster ? (
                    <td style={{ padding: '6px 8px' }}>
                      <input value={satir.notlar || ''} onChange={e => { const yeni = [...simSatirlari]; yeni[index] = { ...yeni[index], notlar: e.target.value }; setSimSatirlari(yeni); }}
                        placeholder="Not..." style={{ width: '100%', padding: '7px 10px', fontSize: 12, border: '1.5px solid #e2e8f0', borderRadius: 7, outline: 'none', boxSizing: 'border-box' }} />
                    </td>
                  ) : <td />}
                  <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                    {simSatirlari.length > 1 && (
                      <button onClick={() => { setSimSatirlari(simSatirlari.filter((_, i) => i !== index)); setSimOneri(prev => { const yeni = { ...prev }; delete yeni[index]; return yeni; }); }}
                        style={{ fontSize: 14, background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px 6px' }}>✕</button>
                    )}
                  </td>
                </tr>
              ))}
              {simSatirlari.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '14px 10px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Satır yok</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <button onClick={() => setSimSatirlari([...simSatirlari, { gsm: '', iccid: '', paket: '' }])}
          style={{ marginTop: 8, padding: '6px 14px', fontSize: 12, background: '#f0fdf4', color: '#166534', border: '1.5px solid #86efac', borderRadius: 7, cursor: 'pointer', fontWeight: 600 }}>
          + Satır Ekle
        </button>
      </div>

      {/* Cihaz satırları (sim_modem) */}
      {tur === 'sim_modem' && (
        <div style={{ marginBottom: 20 }}>
          <CihazSatirTablosu satirlar={cihazSatirlari} setSatirlar={setCihazSatirlari} />
        </div>
      )}

      {/* İmza pedleri */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>İmzalar</div>
        <div style={{ display: 'flex', gap: 20 }}>
          <ImzaPedi label="Teslim Eden" sigRef={teslimEdenRef} />
          <ImzaPedi label="Teslim Alan" sigRef={teslimAlanRef} />
        </div>
      </div>

      {/* Hata */}
      {hata && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
          ⚠️ {hata}
        </div>
      )}

      {/* Oluştur butonu */}
      <button onClick={olustur} disabled={yukleniyor}
        style={{
          width: '100%', padding: '13px', fontSize: 15, fontWeight: 700,
          background: yukleniyor ? '#a5b4fc' : '#6366f1',
          color: '#fff', border: 'none', borderRadius: 10, cursor: yukleniyor ? 'wait' : 'pointer',
        }}>
        {yukleniyor ? '⏳ PDF Oluşturuluyor...' : '📄 Tutanak PDF Oluştur'}
      </button>

    </div>
  );
}
