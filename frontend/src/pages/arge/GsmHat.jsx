import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';

function authHeaders() {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
}
function apiFetch(url, opts = {}) {
  return fetch(`${API}${url}`, {
    ...opts,
    headers: { ...authHeaders(), ...opts.headers },
  });
}

const HAT_TIPI = {
  ses:      { bg: '#f0fdf4', color: '#166534', border: '#86efac', label: '📞 Ses' },
  m2m_data: { bg: '#eff6ff', color: '#1d4ed8', border: '#93c5fd', label: '📡 M2M Data' },
  ses_data: { bg: '#fdf4ff', color: '#7e22ce', border: '#d8b4fe', label: '📱 Ses+Data' },
};

const TESLIM_RENK = {
  'TESLİM EDİLDİ':            { bg: '#f0fdf4', color: '#166534' },
  'YENİ HAT TESLİM EDİLMEDİ': { bg: '#fef9c3', color: '#854d0e' },
};

const SUTUNLAR = [
  { key: 'displayName',  label: 'Ad Soyad',  minWidth: 100, defaultWidth: 160 },
  { key: 'directorate',  label: 'Daire',     minWidth: 100, defaultWidth: 160 },
  { key: 'department',   label: 'Müdürlük',  minWidth: 100, defaultWidth: 150, defaultGizli: true },
  { key: 'hatTipi',      label: 'Tip',       minWidth: 80,  defaultWidth: 100 },
  { key: 'hatNo',        label: 'Hat No',    minWidth: 110, defaultWidth: 130 },
  { key: 'iccid',        label: 'ICCID',     minWidth: 120, defaultWidth: 160 },
  { key: 'cihaz',        label: 'Cihaz',     minWidth: 100, defaultWidth: 150 },
  { key: 'network',      label: 'Network',   minWidth: 80,  defaultWidth: 110, defaultGizli: true },
  { key: 'ip',           label: 'IP',        minWidth: 80,  defaultWidth: 110 },
  { key: 'paket',        label: 'Paket',     minWidth: 80,  defaultWidth: 130 },
  { key: 'operator',     label: 'Operatör',  minWidth: 80,  defaultWidth: 100 },
  { key: 'teslimDurumu', label: 'Teslim',    minWidth: 80,  defaultWidth: 110 },
  { key: 'notlar',       label: 'Notlar',    minWidth: 80,  defaultWidth: 120 },
];

const inputStyle = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: '1.5px solid #e2e8f0', borderRadius: 8,
  background: '#f8fafc', color: '#1e293b', outline: 'none',
  boxSizing: 'border-box',
};
const labelStyle = {
  fontSize: 11, fontWeight: 600, color: '#64748b',
  textTransform: 'uppercase', letterSpacing: '0.06em',
  display: 'block', marginBottom: 4,
};

function OzetKart({ label, value, bg = '#f8fafc', color = '#1e293b' }) {
  return (
    <div style={{ background: bg, border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 18px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, marginTop: 6 }}>{value ?? '—'}</div>
    </div>
  );
}

function Toast({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, []);
  if (!msg) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: '#1e293b', color: '#fff', padding: '12px 20px',
      borderRadius: 10, fontSize: 13, fontWeight: 500,
      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
    }}>
      ✅ {msg}
    </div>
  );
}

export default function GsmHat() {
  const [sekme, setSekme] = useState('gsm');
  const navigate = useNavigate();
  const [toast, setToast] = useState('');
  const [tutanaklar, setTutanaklar] = useState([]);
  const [tutanakYukleniyor, setTutanakYukleniyor] = useState(false);
  const [modalAcik,     setModalAcik]     = useState(false);
  const [duzenlenenHat, setDuzenlenenHat] = useState(null);

  // ── GSM state ───────────────────────────────────────────────────────────────
  const [daireler,       setDaireler]       = useState([]);
  const [mudurluker,     setMudurluker]     = useState([]);
  const [personeller,    setPersoneller]    = useState([]);
  const [seciliDaire,    setSeciliDaire]    = useState('');
  const [seciliMudurluk, setSeciliMudurluk] = useState('');
  const [seciliPersonel, setSeciliPersonel] = useState('');
  const [hatTipi,   setHatTipi]   = useState('ses');
  const [hatNo,     setHatNo]     = useState('');
  const [operator,  setOperator]  = useState('');
  const [simNo,     setSimNo]     = useState('');
  const [paket,     setPaket]     = useState('');
  const [notlar,    setNotlar]    = useState('');
  const [atamalar,  setAtamalar]  = useState([]);
  const [hatOzet,   setHatOzet]   = useState(null);
  const [filtreDaire,   setFiltreDaire]   = useState('');
  const [filtreHatTipi, setFiltreHatTipi] = useState('');
  const [kaydediliyor,  setKaydediliyor]  = useState(false);
  const [sayfaNo,       setSayfaNo]       = useState(1);
  const SAYFA_BOYUTU = 50;

  // ── Tablo sütun state ────────────────────────────────────────────────────────
  const [sutunGenislikleri, setSutunGenislikleri] = useState({});
  const [suruklenenSutun,   setSuruklenenSutun]   = useState(null);
  const [sutunMenuAcik,     setSutunMenuAcik]     = useState(false);
  const [gizliSutunlar,     setGizliSutunlar]     = useState(() =>
    new Set(SUTUNLAR.filter(s => s.defaultGizli).map(s => s.key))
  );
  const suruklemeBaslangic = useRef(null);
  const sutunMenuRef = useRef(null);

  // ── Cihaz state ─────────────────────────────────────────────────────────────
  const [cihazlar,         setCihazlar]         = useState([]);
  const [cihazOzet,        setCihazOzet]        = useState(null);
  const [cihazFiltreDaire, setCihazFiltreDaire] = useState('');
  const [cihazFiltreTur,   setCihazFiltreTur]   = useState('');
  const [cihazArama,       setCihazArama]       = useState('');

  // ── Import refs ─────────────────────────────────────────────────────────────
  const fileGsmRef   = useRef();
  const fileCihazRef = useRef();
  const [importing, setImporting] = useState('');

  // ── Loaders ─────────────────────────────────────────────────────────────────
  const yukleHatOzet = () =>
    apiFetch('/api/arge/hat-ozet').then(r => r.json()).then(setHatOzet).catch(() => {});

  const yukleAtamalar = useCallback((daire = filtreDaire, tip = filtreHatTipi) => {
    const p = new URLSearchParams();
    if (daire) p.set('directorate', daire);
    if (tip)   p.set('hatTipi', tip);
    apiFetch(`/api/arge/hat-atamalari?${p}`).then(r => r.json()).then(setAtamalar).catch(() => {});
  }, [filtreDaire, filtreHatTipi]);

  const yukleCihazlar = useCallback((daire = cihazFiltreDaire, tur = cihazFiltreTur, q = cihazArama) => {
    const p = new URLSearchParams();
    if (daire) p.set('daire', daire);
    if (tur)   p.set('cihazTuru', tur);
    if (q)     p.set('q', q);
    apiFetch(`/api/arge/cihaz-envanter?${p}`).then(r => r.json()).then(setCihazlar).catch(() => {});
  }, [cihazFiltreDaire, cihazFiltreTur, cihazArama]);

  const yukleCihazOzet = () =>
    apiFetch('/api/arge/cihaz-ozet').then(r => r.json()).then(setCihazOzet).catch(() => {});

  useEffect(() => {
    apiFetch('/api/arge/daireler').then(r => r.json()).then(setDaireler).catch(() => {});
    yukleHatOzet();
    yukleAtamalar('', '');
    yukleCihazlar('', '', '');
    yukleCihazOzet();
  }, []);

  useEffect(() => {
    if (sekme !== 'tutanak') return;
    setTutanakYukleniyor(true);
    apiFetch('/api/tutanak/liste').then(r => r.json()).then(setTutanaklar).catch(() => {}).finally(() => setTutanakYukleniyor(false));
  }, [sekme]);

  useEffect(() => {
    if (!seciliDaire) { setMudurluker([]); return; }
    apiFetch(`/api/arge/mudurlukleri?directorate=${encodeURIComponent(seciliDaire)}`)
      .then(r => r.json()).then(setMudurluker).catch(() => {});
    setSeciliMudurluk(''); setSeciliPersonel('');
  }, [seciliDaire]);

  useEffect(() => {
    if (!seciliDaire) { setPersoneller([]); return; }
    const p = new URLSearchParams();
    p.set('directorate', seciliDaire);
    if (seciliMudurluk) p.set('department', seciliMudurluk);
    apiFetch(`/api/arge/personel-ara?${p}`).then(r => r.json()).then(setPersoneller).catch(() => {});
    setSeciliPersonel('');
  }, [seciliDaire, seciliMudurluk]);

  // Sütun menüsü dışına tıklayınca kapat
  useEffect(() => {
    if (!sutunMenuAcik) return;
    const handler = (e) => {
      if (sutunMenuRef.current && !sutunMenuRef.current.contains(e.target))
        setSutunMenuAcik(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [sutunMenuAcik]);

  // ── Boş sütunları otomatik gizle (<%10 dolu) ────────────────────────────────
  const otomatikGizliSutunlar = useMemo(() => {
    if (!atamalar.length) return new Set();
    const boslar = new Set();
    const kontrol = ['operator', 'teslimDurumu', 'department', 'ip', 'notlar'];
    kontrol.forEach(alan => {
      const dolu = atamalar.filter(a => a[alan] && a[alan] !== '' && a[alan] !== '-').length;
      if (dolu < atamalar.length * 0.1) boslar.add(alan);
    });
    return boslar;
  }, [atamalar]);

  const tumGizliSutunlar = useMemo(
    () => new Set([...otomatikGizliSutunlar, ...gizliSutunlar]),
    [otomatikGizliSutunlar, gizliSutunlar]
  );

  const gorunenSutunlar = SUTUNLAR.filter(s => !tumGizliSutunlar.has(s.key));

  const getSutunGenislik = (key, defaultWidth) => sutunGenislikleri[key] ?? defaultWidth;

  // ── Modal açılınca formu doldur/temizle ─────────────────────────────────────
  useEffect(() => {
    if (!modalAcik) return;
    if (duzenlenenHat) {
      setSeciliDaire(duzenlenenHat.directorate || '');
      setHatTipi(duzenlenenHat.hatTipi || 'ses');
      setHatNo(duzenlenenHat.hatNo || '');
      setOperator(duzenlenenHat.operator || '');
      setSimNo(duzenlenenHat.iccid || '');
      setPaket(duzenlenenHat.paket || '');
      setNotlar(duzenlenenHat.notlar || '');
    } else {
      setSeciliDaire(''); setSeciliMudurluk(''); setSeciliPersonel('');
      setHatTipi('ses'); setHatNo(''); setOperator('');
      setSimNo(''); setPaket(''); setNotlar('');
    }
  }, [modalAcik, duzenlenenHat]);

  // ── Hat kaydet ───────────────────────────────────────────────────────────────
  const hatKaydet = async () => {
    if (!hatNo.trim()) return;
    setKaydediliyor(true);
    try {
      if (duzenlenenHat) {
        await apiFetch(`/api/arge/hat-atamasi/${duzenlenenHat.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hatTipi, hatNo: hatNo.trim(), operator: operator || null, iccid: simNo || null, paket: paket || null, notlar: notlar || null }),
        });
        setToast('Hat güncellendi');
      } else {
        const personel = personeller.find(p => p.username === seciliPersonel);
        await apiFetch('/api/arge/hat-atamasi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: seciliPersonel || null,
            displayName: personel?.displayName || null,
            directorate: personel?.directorate || seciliDaire || null,
            department:  personel?.department  || seciliMudurluk || null,
            hatTipi, hatNo: hatNo.trim(), operator: operator || null, iccid: simNo || null, paket: paket || null, notlar: notlar || null,
          }),
        });
        setToast('Hat kaydı eklendi');
      }
      setModalAcik(false);
      yukleAtamalar(); yukleHatOzet();
    } catch {}
    setKaydediliyor(false);
  };

  const hatSil = async (id) => {
    if (!confirm('Bu hat kaydını silmek istiyor musunuz?')) return;
    await apiFetch(`/api/arge/hat-atamasi/${id}`, { method: 'DELETE' });
    yukleAtamalar(); yukleHatOzet();
  };

  const handleImport = async (endpoint, file, onSuccess) => {
    if (!file) return;
    setImporting(endpoint);
    const form = new FormData();
    form.append('dosya', file);
    try {
      const r = await apiFetch(`/api/arge/import/${endpoint}`, { method: 'POST', body: form });
      const d = await r.json();
      if (r.ok) { setToast(d.mesaj); onSuccess(); }
      else alert(d.error || 'Import hatası');
    } catch (e) { alert('Import hatası: ' + e.message); }
    setImporting('');
  };

  // Filtre/veri değişince sayfayı sıfırla
  useEffect(() => { setSayfaNo(1); }, [atamalar]);

  const toplamSayfa  = Math.ceil(atamalar.length / SAYFA_BOYUTU);
  const sayfaAtamalar = atamalar.slice((sayfaNo - 1) * SAYFA_BOYUTU, sayfaNo * SAYFA_BOYUTU);

  const canSubmit = hatNo.trim() && !kaydediliyor;
  const cihazTurleri = cihazOzet?.turDagilim?.map(t => t.ad).filter(Boolean) || [];
  const STATIK_OPS = ['Turkcell', 'Vodafone', 'Türk Telekom'];
  const dbOps = (hatOzet?.operatorDagilim || []).filter(o => o.ad).map(o => o.ad);
  const operatorler = [...new Set([...STATIK_OPS, ...dbOps])];

  // ── Sütun resize handler ─────────────────────────────────────────────────────
  const baslatSurukleme = (e, sutun) => {
    e.preventDefault();
    suruklemeBaslangic.current = {
      x: e.clientX,
      key: sutun.key,
      baslangicGenislik: getSutunGenislik(sutun.key, sutun.defaultWidth),
    };
    setSuruklenenSutun(sutun.key);

    const onMouseMove = (e) => {
      if (!suruklemeBaslangic.current) return;
      const fark = e.clientX - suruklemeBaslangic.current.x;
      const yeni = Math.max(sutun.minWidth, suruklemeBaslangic.current.baslangicGenislik + fark);
      setSutunGenislikleri(prev => ({ ...prev, [suruklemeBaslangic.current.key]: yeni }));
    };
    const onMouseUp = () => {
      suruklemeBaslangic.current = null;
      setSuruklenenSutun(null);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // ── Cell render ──────────────────────────────────────────────────────────────
  const renderHucre = (sutun, a) => {
    if (sutun.key === 'hatTipi') {
      const t = HAT_TIPI[a.hatTipi] || HAT_TIPI.m2m_data;
      return <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: t.bg, color: t.color }}>{t.label}</span>;
    }
    if (sutun.key === 'hatNo') {
      return <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{a.hatNo || '—'}</span>;
    }
    if (sutun.key === 'teslimDurumu' && a.teslimDurumu) {
      const s = TESLIM_RENK[a.teslimDurumu] || { bg: '#f8fafc', color: '#6b7280' };
      return (
        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: s.bg, color: s.color }}>
          {a.teslimDurumu === 'TESLİM EDİLDİ' ? '✅' : '⏳'} {a.teslimDurumu}
        </span>
      );
    }
    if (sutun.key === 'directorate') {
      const v = a.directorate || '—';
      return <span title={v}>{v.replace('Dairesi Başkanlığı', 'DB').replace(' Başkanlığı', '')}</span>;
    }
    if (sutun.key === 'iccid') {
      return <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{a.iccid || a.simNo || '—'}</span>;
    }
    const v = a[sutun.key];
    return <span title={v || ''}>{v || '—'}</span>;
  };

  return (
    <div style={{ padding: '24px 32px' }}>

      {/* ── Başlık + aksiyonlar ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a2e23', margin: 0 }}>📱 GSM / Data Hat Yönetimi</h1>
          <p style={{ fontSize: 13, color: '#9aa8a0', margin: '4px 0 0' }}>Personel GSM ve M2M data hatlarını yönetin</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input ref={fileGsmRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
            onChange={e => { handleImport('gsm-hatlar', e.target.files[0], () => { yukleAtamalar(); yukleHatOzet(); }); e.target.value = ''; }} />
          <input ref={fileCihazRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
            onChange={e => { handleImport('cihaz-envanter', e.target.files[0], () => { yukleCihazlar(); yukleCihazOzet(); }); e.target.value = ''; }} />
          <button onClick={() => navigate('/arge/tutanak')}
            style={{ padding: '9px 14px', fontSize: 12, fontWeight: 600, background: '#eef2ff', color: '#4338ca', border: '1px solid #a5b4fc', borderRadius: 8, cursor: 'pointer' }}>
            📄 Tutanak Oluştur
          </button>
          <button onClick={() => fileGsmRef.current.click()} disabled={importing === 'gsm-hatlar'}
            style={{ padding: '9px 14px', fontSize: 12, fontWeight: 600, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #93c5fd', borderRadius: 8, cursor: 'pointer' }}>
            {importing === 'gsm-hatlar' ? '⏳ Aktarılıyor…' : '📥 GSM Hatları İçe Aktar'}
          </button>
          <button onClick={() => fileCihazRef.current.click()} disabled={importing === 'cihaz-envanter'}
            style={{ padding: '9px 14px', fontSize: 12, fontWeight: 600, background: '#f0fdf4', color: '#166534', border: '1px solid #86efac', borderRadius: 8, cursor: 'pointer' }}>
            {importing === 'cihaz-envanter' ? '⏳ Aktarılıyor…' : '📥 Cihaz Envanteri İçe Aktar'}
          </button>
          {sekme === 'gsm' && (
            <button onClick={() => { setDuzenlenenHat(null); setModalAcik(true); }}
              style={{ padding: '10px 20px', fontSize: 14, fontWeight: 600, background: '#43DC80', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', boxShadow: '0 4px 12px rgba(67,220,128,0.35)', display: 'flex', alignItems: 'center', gap: 8 }}>
              ➕ Yeni Hat Ekle
            </button>
          )}
        </div>
      </div>

      {/* ── Sekmeler ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid #e2e8f0' }}>
        {[
          { key: 'gsm',      label: `📡 GSM Hatları${hatOzet ? ` (${hatOzet.ozet.toplam.toLocaleString('tr')})` : ''}` },
          { key: 'cihaz',    label: `💻 Cihaz Envanteri${cihazOzet ? ` (${cihazOzet.toplamCihaz})` : ''}` },
          { key: 'tutanak',  label: '📄 Tutanaklar' },
        ].map(s => (
          <button key={s.key} onClick={() => setSekme(s.key)}
            style={{ padding: '10px 24px', fontSize: 13, fontWeight: sekme === s.key ? 700 : 400, border: 'none', background: 'transparent', cursor: 'pointer', borderBottom: sekme === s.key ? '2.5px solid #6366f1' : '2.5px solid transparent', color: sekme === s.key ? '#6366f1' : '#64748b', marginBottom: -2, transition: 'all .15s' }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ══ GSM HATLARI ════════════════════════════════════════════════════════ */}
      {sekme === 'gsm' && (
        <>
          {/* Özet kartlar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 24 }}>
            <OzetKart label="Toplam Hat"  value={hatOzet?.ozet?.toplam?.toLocaleString('tr')} bg="#f8fafc" color="#1e293b" />
            <OzetKart label="📞 Ses"      value={hatOzet?.ozet?.toplamSes}     bg="#f0fdf4" color="#166534" />
            <OzetKart label="📡 M2M Data" value={hatOzet?.ozet?.toplamM2m}     bg="#eff6ff" color="#1d4ed8" />
            <OzetKart label="📱 Ses+Data" value={hatOzet?.ozet?.toplamSesData} bg="#fdf4ff" color="#7e22ce" />
            <OzetKart label="⏳ Bekleyen" value={hatOzet?.ozet?.bekleyen}      bg="#fef9c3" color="#854d0e" />
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>📶 Network</div>
              {hatOzet?.networkDagilim?.slice(0, 3).map(n => (
                <div key={n.ad} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                  <span style={{ color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>{n.ad || '—'}</span>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>{n.sayi}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Filtreler + sütun toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
            <select value={filtreDaire}
              onChange={e => { setFiltreDaire(e.target.value); yukleAtamalar(e.target.value, filtreHatTipi); }}
              style={{ flex: 2, padding: '8px 12px', fontSize: 13, border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', outline: 'none' }}>
              <option value="">Tüm Daireler</option>
              {daireler.map(d => <option key={d.ad} value={d.ad}>{d.ad}</option>)}
            </select>
            <select value={filtreHatTipi}
              onChange={e => { setFiltreHatTipi(e.target.value); yukleAtamalar(filtreDaire, e.target.value); }}
              style={{ flex: 1, padding: '8px 12px', fontSize: 13, border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', outline: 'none' }}>
              <option value="">Tüm Tipler</option>
              {Object.entries(HAT_TIPI).map(([key, t]) => <option key={key} value={key}>{t.label}</option>)}
            </select>
            <button onClick={() => yukleAtamalar()}
              style={{ padding: '8px 14px', fontSize: 12, background: '#43DC80', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              🔃
            </button>
            {/* Sütun görünürlük */}
            <div style={{ position: 'relative' }} ref={sutunMenuRef}>
              <button onClick={() => setSutunMenuAcik(v => !v)}
                style={{ padding: '8px 14px', fontSize: 12, fontWeight: 600, background: '#f8fafc', color: '#475569', border: '1.5px solid #e2e8f0', borderRadius: 8, cursor: 'pointer' }}>
                ⚙️ Sütunlar
              </button>
              {sutunMenuAcik && (
                <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: '#fff', border: '1px solid #e8ede9', borderRadius: 10, padding: 8, zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 200 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#9aa8a0', padding: '4px 8px 8px', borderBottom: '1px solid #f0f4f0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Sütun Görünürlüğü
                  </div>
                  {SUTUNLAR.map(s => (
                    <label key={s.key}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', cursor: 'pointer', fontSize: 13, borderRadius: 6 }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <input type="checkbox"
                        checked={!tumGizliSutunlar.has(s.key)}
                        onChange={() => setGizliSutunlar(prev => {
                          const yeni = new Set(prev);
                          if (yeni.has(s.key)) yeni.delete(s.key); else yeni.add(s.key);
                          return yeni;
                        })}
                        style={{ accentColor: '#43DC80', width: 14, height: 14 }}
                      />
                      <span style={{ color: tumGizliSutunlar.has(s.key) ? '#9aa8a0' : '#1a2e23' }}>{s.label}</span>
                      {otomatikGizliSutunlar.has(s.key) && (
                        <span style={{ fontSize: 10, color: '#f59e0b', marginLeft: 'auto' }}>boş</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tablo */}
          <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #e8ede9' }}>
            <table style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {gorunenSutunlar.map(sutun => (
                    <th key={sutun.key}
                      style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9aa8a0', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', width: getSutunGenislik(sutun.key, sutun.defaultWidth), minWidth: sutun.minWidth, position: 'relative', userSelect: 'none' }}>
                      {sutun.label}
                      {/* Resize handle */}
                      <div
                        onMouseDown={e => baslatSurukleme(e, sutun)}
                        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, cursor: 'col-resize', background: suruklenenSutun === sutun.key ? 'rgba(67,220,128,0.5)' : 'transparent', borderRight: suruklenenSutun === sutun.key ? '2px solid #43DC80' : '2px solid transparent' }}
                        onMouseEnter={e => { if (suruklenenSutun !== sutun.key) e.currentTarget.style.borderRight = '2px solid #43DC8066'; }}
                        onMouseLeave={e => { if (suruklenenSutun !== sutun.key) e.currentTarget.style.borderRight = '2px solid transparent'; }}
                      />
                    </th>
                  ))}
                  <th style={{ padding: '10px 12px', width: 90, minWidth: 90, fontSize: 11, fontWeight: 600, color: '#9aa8a0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {atamalar.length === 0 ? (
                  <tr><td colSpan={gorunenSutunlar.length + 1} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Kayıt yok</td></tr>
                ) : sayfaAtamalar.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    {gorunenSutunlar.map(sutun => (
                      <td key={sutun.key}
                        style={{ padding: '9px 12px', width: getSutunGenislik(sutun.key, sutun.defaultWidth), maxWidth: getSutunGenislik(sutun.key, sutun.defaultWidth), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {renderHucre(sutun, a)}
                      </td>
                    ))}
                    <td style={{ padding: '9px 12px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => navigate('/arge/tutanak', { state: {
                            talepDaire: a.directorate || '',
                            displayName: a.displayName || '',
                            hatlar: [{ gsm: a.hatNo || '', iccid: a.iccid || '', paket: a.paket || '' }],
                          }})}
                          title="Tutanak Oluştur"
                          style={{ fontSize: 13, padding: '3px 8px', background: '#f0fdf4', color: '#166534', border: '1px solid #86efac', borderRadius: 6, cursor: 'pointer' }}>
                          📄
                        </button>
                        <button onClick={() => { setDuzenlenenHat(a); setModalAcik(true); }}
                          style={{ fontSize: 11, padding: '3px 8px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #93c5fd', borderRadius: 6, cursor: 'pointer' }}>
                          ✏️
                        </button>
                        <button onClick={() => hatSil(a.id)}
                          style={{ fontSize: 11, padding: '3px 8px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, cursor: 'pointer' }}>
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {atamalar.length > 0 && (
            <div style={{ marginTop: 4, fontSize: 12, color: '#94a3b8', textAlign: 'right' }}>
              {gorunenSutunlar.length}/{SUTUNLAR.length} sütun görünür
            </div>
          )}
          {toplamSayfa > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', marginTop: 4, background: '#fafffe', border: '1px solid #e8ede9', borderRadius: 12 }}>
              {/* Sol: bilgi */}
              <span style={{ fontSize: 12, color: '#9aa8a0' }}>
                {(sayfaNo - 1) * SAYFA_BOYUTU + 1}–{Math.min(sayfaNo * SAYFA_BOYUTU, atamalar.length)} / {atamalar.length.toLocaleString('tr')} kayıt
              </span>

              {/* Orta: sayfa numaraları */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button onClick={() => setSayfaNo(p => Math.max(1, p - 1))} disabled={sayfaNo === 1}
                  style={{ padding: '5px 12px', fontSize: 12, borderRadius: 7, border: '1.5px solid #e2e8f0', background: sayfaNo === 1 ? '#f8fafc' : '#fff', color: sayfaNo === 1 ? '#cbd5e1' : '#374151', cursor: sayfaNo === 1 ? 'default' : 'pointer' }}>
                  ← Önceki
                </button>
                {Array.from({ length: toplamSayfa }, (_, i) => i + 1)
                  .filter(n => toplamSayfa <= 7 || n === 1 || n === toplamSayfa || Math.abs(n - sayfaNo) <= 2)
                  .reduce((acc, n, i, arr) => { if (i > 0 && n - arr[i - 1] > 1) acc.push('...'); acc.push(n); return acc; }, [])
                  .map((n, i) => n === '...' ? (
                    <span key={'d' + i} style={{ padding: '0 4px', color: '#9aa8a0', fontSize: 12 }}>…</span>
                  ) : (
                    <button key={n} onClick={() => setSayfaNo(n)}
                      style={{ width: 32, height: 32, fontSize: 12, borderRadius: 7, border: n === sayfaNo ? '1.5px solid #43DC80' : '1.5px solid #e2e8f0', background: n === sayfaNo ? '#43DC80' : '#fff', color: n === sayfaNo ? '#fff' : '#374151', cursor: 'pointer', fontWeight: n === sayfaNo ? 700 : 400 }}>
                      {n}
                    </button>
                  ))}
                <button onClick={() => setSayfaNo(p => Math.min(toplamSayfa, p + 1))} disabled={sayfaNo === toplamSayfa}
                  style={{ padding: '5px 12px', fontSize: 12, borderRadius: 7, border: '1.5px solid #e2e8f0', background: sayfaNo === toplamSayfa ? '#f8fafc' : '#fff', color: sayfaNo === toplamSayfa ? '#cbd5e1' : '#374151', cursor: sayfaNo === toplamSayfa ? 'default' : 'pointer' }}>
                  Sonraki →
                </button>
              </div>

              {/* Sağ: sayfaya git */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#9aa8a0' }}>Sayfaya git:</span>
                <input type="number" min={1} max={toplamSayfa} value={sayfaNo}
                  onChange={e => { const v = parseInt(e.target.value); if (v >= 1 && v <= toplamSayfa) setSayfaNo(v); }}
                  style={{ width: 48, padding: '4px 8px', fontSize: 12, border: '1.5px solid #e2e8f0', borderRadius: 7, textAlign: 'center', outline: 'none' }} />
                <span style={{ fontSize: 12, color: '#9aa8a0' }}>/ {toplamSayfa}</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══ CİHAZ ENVANTERİ ════════════════════════════════════════════════════ */}
      {sekme === 'cihaz' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 24 }}>
            <OzetKart label="Toplam Cihaz" value={cihazOzet?.toplamCihaz} bg="#f8fafc" color="#1e293b" />
            {cihazOzet?.turDagilim?.slice(0, 4).map(t => (
              <OzetKart key={t.ad} label={t.ad || 'Diğer'} value={t.sayi} bg="#f0fdf4" color="#166534" />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <select value={cihazFiltreDaire}
              onChange={e => { setCihazFiltreDaire(e.target.value); yukleCihazlar(e.target.value, cihazFiltreTur, cihazArama); }}
              style={{ flex: 2, padding: '9px 12px', fontSize: 13, border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', outline: 'none' }}>
              <option value="">Tüm Daireler</option>
              {daireler.map(d => <option key={d.ad} value={d.ad}>{d.ad}</option>)}
            </select>
            <select value={cihazFiltreTur}
              onChange={e => { setCihazFiltreTur(e.target.value); yukleCihazlar(cihazFiltreDaire, e.target.value, cihazArama); }}
              style={{ flex: 1, padding: '9px 12px', fontSize: 13, border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', outline: 'none' }}>
              <option value="">Tüm Türler</option>
              {cihazTurleri.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input value={cihazArama} onChange={e => setCihazArama(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && yukleCihazlar()}
              placeholder="Kullanıcı / IMEI / Hat No…"
              style={{ flex: 2, padding: '9px 12px', fontSize: 13, border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', outline: 'none' }} />
            <button onClick={() => yukleCihazlar()}
              style={{ padding: '9px 16px', fontSize: 13, fontWeight: 600, background: '#43DC80', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              🔍
            </button>
          </div>
          <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #e8ede9' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['Kullanıcı','Daire','Tür','Marka','Model','Seri No','IMEI','Hat No','ICCID','Paket','GB'].map(h => (
                    <th key={h} style={{ padding: '9px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cihazlar.length === 0 ? (
                  <tr><td colSpan={11} style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>Kayıt yok — Excel dosyası içe aktarın</td></tr>
                ) : cihazlar.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '8px 10px', fontWeight: 500 }}>{c.kullanici || '—'}</td>
                    <td style={{ padding: '8px 10px', color: '#6b7280', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(c.daireBaskanlik || '—').replace('Dairesi Başkanlığı','DB').replace(' Başkanlığı','')}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: '#eff6ff', color: '#1d4ed8' }}>{c.cihazTuru || '—'}</span>
                    </td>
                    <td style={{ padding: '8px 10px', color: '#374151' }}>{c.cihazMarka || '—'}</td>
                    <td style={{ padding: '8px 10px', color: '#6b7280' }}>{c.cihazModel || '—'}</td>
                    <td style={{ padding: '8px 10px', color: '#6b7280', fontFamily: 'monospace', fontSize: 11 }}>{c.cihazSeriNo || '—'}</td>
                    <td style={{ padding: '8px 10px', color: '#6b7280', fontFamily: 'monospace', fontSize: 11 }}>{c.cihazImei || '—'}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600, fontFamily: 'monospace' }}>{c.gsmHatTelNo || '—'}</td>
                    <td style={{ padding: '8px 10px', color: '#6b7280', fontFamily: 'monospace', fontSize: 11 }}>{c.gsmHatSeriNo || '—'}</td>
                    <td style={{ padding: '8px 10px', color: '#6b7280' }}>{c.paketTuru || '—'}</td>
                    <td style={{ padding: '8px 10px', color: '#6b7280' }}>{c.paketGb || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {cihazlar.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 12, color: '#94a3b8', textAlign: 'right' }}>
              {cihazlar.length.toLocaleString('tr')} kayıt
            </div>
          )}
        </>
      )}

      {/* ══ TUTANAKLAR ═════════════════════════════════════════════════════════ */}
      {sekme === 'tutanak' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              {tutanakYukleniyor ? 'Yükleniyor…' : `${tutanaklar.length} tutanak`}
            </div>
            <button onClick={() => navigate('/arge/tutanak')}
              style={{ padding: '10px 20px', fontSize: 13, fontWeight: 600, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              📄 Yeni Tutanak Oluştur
            </button>
          </div>
          <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #e8ede9' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>#</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Tutanak</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Hat No</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Tarih</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Saat</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Teslim Alan</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {tutanaklar.length === 0 && !tutanakYukleniyor ? (
                  <tr><td colSpan={7} style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>Henüz tutanak oluşturulmamış</td></tr>
                ) : tutanaklar.map((t, i) => (
                  <tr key={t.fileName} style={{ borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '10px 16px', color: '#94a3b8' }}>{i + 1}</td>
                    <td style={{ padding: '10px 16px', fontWeight: 500, color: '#1e293b' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{t.fileName}</span>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#1e293b', fontFamily: 'monospace', fontSize: 12 }}>
                      {t.hatlar?.length ? t.hatlar.join(', ') : '—'}
                    </td>
                    <td style={{ padding: '10px 16px', color: '#64748b' }}>
                      {t.tarih || new Date(t.olusturmaTarihi).toLocaleDateString('tr-TR')}
                    </td>
                    <td style={{ padding: '10px 16px', color: '#64748b' }}>
                      {t.saat || new Date(t.olusturmaTarihi).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '10px 16px', color: '#1e293b', fontWeight: 500 }}>
                      {t.teslimAlan || '—'}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                      <a href={`${API}/api/tutanak/indir/${t.fileName}?token=${localStorage.getItem('token')}`}
                        target="_blank" rel="noreferrer"
                        style={{ padding: '5px 14px', background: '#6366f1', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
                        İndir
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══ MODAL ══════════════════════════════════════════════════════════════ */}
      {modalAcik && (
        <>
          <div onClick={() => setModalAcik(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 480, maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 16, padding: '28px 32px', zIndex: 1001, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a2e23', margin: 0 }}>
                {duzenlenenHat ? '✏️ Hat Düzenle' : '➕ Yeni Hat Ekle'}
              </h3>
              <button onClick={() => setModalAcik(false)} style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', color: '#9aa8a0', lineHeight: 1 }}>✕</button>
            </div>

            {duzenlenenHat ? (
              <div style={{ padding: '12px 14px', background: '#f0fdf4', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                <strong style={{ color: '#1a2e23' }}>{duzenlenenHat.displayName || duzenlenenHat.username || '—'}</strong>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{duzenlenenHat.directorate || ''}</div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 10 }}>
                  <label style={labelStyle}>Daire</label>
                  <select value={seciliDaire} onChange={e => setSeciliDaire(e.target.value)} style={inputStyle}>
                    <option value="">— Daire seçin —</option>
                    {daireler.map(d => <option key={d.ad} value={d.ad}>{d.ad}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={labelStyle}>Müdürlük</label>
                  <select value={seciliMudurluk} onChange={e => setSeciliMudurluk(e.target.value)}
                    disabled={!seciliDaire} style={{ ...inputStyle, background: seciliDaire ? '#f8fafc' : '#f1f5f9' }}>
                    <option value="">— Müdürlük —</option>
                    {mudurluker.map(m => <option key={m.ad} value={m.ad}>{m.ad}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Personel</label>
                  <select value={seciliPersonel} onChange={e => setSeciliPersonel(e.target.value)}
                    disabled={!seciliDaire} style={{ ...inputStyle, background: seciliDaire ? '#f8fafc' : '#f1f5f9' }}>
                    <option value="">— Personel seçin —</option>
                    {personeller.map(p => <option key={p.username} value={p.username}>{p.displayName}</option>)}
                  </select>
                </div>
              </>
            )}

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Hat Tipi</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {Object.entries(HAT_TIPI).map(([key, t]) => (
                  <button key={key} onClick={() => setHatTipi(key)}
                    style={{ flex: 1, padding: '7px 4px', fontSize: 11, fontWeight: hatTipi === key ? 700 : 400, border: hatTipi === key ? `2px solid ${t.border}` : '1.5px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', background: hatTipi === key ? t.bg : '#fff', color: hatTipi === key ? t.color : '#6b7280' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={labelStyle}>Hat No *</label>
              <input value={hatNo} onChange={e => setHatNo(e.target.value)} placeholder="05XX XXX XX XX" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={labelStyle}>Operatör</label>
              <select value={operator} onChange={e => setOperator(e.target.value)} style={inputStyle}>
                <option value="">— Seçin —</option>
                {operatorler.map(op => <option key={op} value={op}>{op}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={labelStyle}>SIM / ICCID</label>
              <input value={simNo} onChange={e => setSimNo(e.target.value)} placeholder="8990..." style={inputStyle} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={labelStyle}>Paket</label>
              <select value={paket} onChange={e => setPaket(e.target.value)} style={inputStyle}>
                <option value="">— Seçin —</option>
                {(hatOzet?.paketDagilim || []).filter(p => p.ad).map(p => (
                  <option key={p.ad} value={p.ad}>{p.ad} ({p.sayi})</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Notlar</label>
              <textarea value={notlar} onChange={e => setNotlar(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setModalAcik(false)}
                style={{ flex: 1, padding: '10px', fontSize: 14, background: '#f1f5f9', color: '#64748b', border: '1.5px solid #e2e8f0', borderRadius: 10, cursor: 'pointer' }}>
                İptal
              </button>
              <button onClick={hatKaydet} disabled={!canSubmit}
                style={{ flex: 2, padding: '10px', fontSize: 14, fontWeight: 600, background: canSubmit ? '#43DC80' : '#e2e8f0', color: canSubmit ? '#fff' : '#9aa8a0', border: 'none', borderRadius: 10, cursor: canSubmit ? 'pointer' : 'not-allowed', boxShadow: canSubmit ? '0 4px 12px rgba(67,220,128,0.35)' : 'none' }}>
                {kaydediliyor ? 'Kaydediliyor…' : duzenlenenHat ? '💾 Güncelle' : '➕ Ekle'}
              </button>
            </div>
          </div>
        </>
      )}

      <Toast msg={toast} onClose={() => setToast('')} />
    </div>
  );
}
