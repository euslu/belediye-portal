import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';
function authFetch(path, opts = {}) {
  return fetch(`${API}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  }).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); });
}

// ─── Sütun konfigürasyonları ──────────────────────────────────────────────────
export const YATIRIM_SUTUNLARI = [
  { key: 'tarih',         label: 'Tarih',         visible: true,  width: '110px' },
  { key: 'aciklama',      label: 'Açıklama',      visible: true,  width: 'auto',  wrap: true },
  { key: 'tahmini_bedel', label: 'Tahmini Bedel', visible: true,  width: '140px' },
  { key: 'daire',         label: 'Daire',         visible: true,  width: '180px' },
  { key: 'cevap',         label: 'Cevap',         visible: true,  width: 'auto',  wrap: true },
  { key: 'durum',         label: 'Durum',         visible: true,  width: '130px' },
];

export const BASVURU_SUTUNLARI = [
  { key: 'BASVURU_TA',     label: 'Tarih',    visible: true,  width: '110px' },
  { key: 'KONUSU',         label: 'Konu',     visible: true,  width: 'auto',  wrap: true },
  { key: 'TALEP_GENE',     label: 'Açıklama', visible: false, width: 'auto',  wrap: true },
  { key: 'DAIRE_BASK_ADI', label: 'Daire',    visible: true,  width: '180px' },
  { key: 'CEVAP_SURE',     label: 'Süre',     visible: true,  width: '80px'  },
  { key: 'BIRIM_CEVA',     label: 'Cevap',    visible: false, width: 'auto',  wrap: true },
  { key: 'BIRIM_ISLE',     label: 'Durum',    visible: true,  width: '130px' },
];

export const LS_KEY_YATIRIM = 'muhtarlik_yatirim_sutunlar';
export const LS_KEY_BASVURU = 'muhtarlik_basvuru_sutunlar';

export function loadVisibility(lsKey, sutunlar) {
  const defaults = Object.fromEntries(sutunlar.map(s => [s.key, s.visible]));
  try {
    const stored = localStorage.getItem(lsKey);
    if (stored) return { ...defaults, ...JSON.parse(stored) };
  } catch (_) {}
  return defaults;
}

export function saveVisibility(lsKey, vis) {
  localStorage.setItem(lsKey, JSON.stringify(vis));
}

// ─── Renk & stil yardımcıları ─────────────────────────────────────────────────
const DURUM_STYLE = {
  'Tamamlandı':    { bg: '#dcfce7', color: '#15803d', dot: '#22c55e' },
  'Devam Etmekte': { bg: '#dbeafe', color: '#1d4ed8', dot: '#3b82f6' },
  'Tamamlanmadı':  { bg: '#fee2e2', color: '#b91c1c', dot: '#ef4444' },
  'Beklemede':     { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
};
const YATIRIM_DURUM_STYLE = {
  'Tamamlandı':       { bg: '#dcfce7', color: '#15803d', dot: '#22c55e' },
  'İşlemde':          { bg: '#dbeafe', color: '#1d4ed8', dot: '#3b82f6' },
  'Reddedildi':       { bg: '#fee2e2', color: '#b91c1c', dot: '#ef4444' },
  'Yanıtlandı':       { bg: '#f3e8ff', color: '#7c3aed', dot: '#a855f7' },
  'Yanıt Bekleniyor': { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
};
function durumBadge(text, styleMap) {
  const ds = styleMap[text] || { bg: '#f3f4f6', color: '#4b5563', dot: '#9ca3af' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: ds.bg, color: ds.color, whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: ds.dot, flexShrink: 0 }} />
      {text}
    </span>
  );
}
function surRenk(g) { return g == null ? '#9ca3af' : g <= 7 ? '#22c55e' : g <= 30 ? '#f59e0b' : '#ef4444'; }

const BASVURU_DURUMLAR = ['Tamamlandı', 'Devam Etmekte', 'Tamamlanmadı', 'Beklemede'];
const YATIRIM_DURUMLAR = ['Tamamlandı', 'İşlemde', 'Reddedildi', 'Yanıtlandı', 'Yanıt Bekleniyor'];

// ─── Stil sabitleri ───────────────────────────────────────────────────────────
const S = {
  label:       { display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' },
  input:       { width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#212529', outline: 'none', background: '#fff', boxSizing: 'border-box' },
  pageBtn:     { padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 13 },
  btnPrimary:  { padding: '8px 20px', background: '#26af68', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  btnSecondary:{ padding: '8px 20px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 },
};

// ─── Sütunlar dropdown ────────────────────────────────────────────────────────
function SutunlarDropdown({ sutunlar, visibility, lsKey, onChangeVisibility }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  function toggle(key, checked) {
    const next = { ...visibility, [key]: checked };
    onChangeVisibility(next);
    saveVisibility(lsKey, next);
  }

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button onClick={() => setOpen(v => !v)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 8, background: open ? '#f3f4f6' : '#fff', color: '#374151', cursor: 'pointer', fontSize: 12 }}>
        <i className="bi bi-layout-three-columns" />
        Sütunlar
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 200, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '4px 0', minWidth: 190, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
          {sutunlar.map(col => (
            <label key={col.key}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13, userSelect: 'none' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f9f9f9'}
              onMouseLeave={e => e.currentTarget.style.background = ''}>
              <input type="checkbox" checked={!!visibility[col.key]} onChange={e => toggle(col.key, e.target.checked)} style={{ cursor: 'pointer', width: 14, height: 14 }} />
              {col.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Başvuru düzenleme modalı ─────────────────────────────────────────────────
function BasvuruEditModal({ row, daireler, onClose, onSaved }) {
  const [form, setForm] = useState({
    KONUSU:        row.KONUSU         || '',
    TALEP_GENE:    row.TALEP_GENE     || '',
    DAIRE_BASK_ADI:row.DAIRE_BASK_ADI || '',
    BIRIM_ISLE:    row.BIRIM_ISLE     || '',
    BIRIM_CEVA:    row.BIRIM_CEVA     || '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const [log,    setLog]    = useState([]);
  const [logOpen, setLogOpen] = useState(false);
  const [logLoading, setLogLoading] = useState(false);

  function setF(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSave() {
    setSaving(true); setError('');
    try {
      await authFetch(`/api/muhtarbis/basvuru/${row.OBJECTID}`, { method: 'PUT', body: JSON.stringify(form) });
      onSaved();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }

  async function loadLog() {
    setLogLoading(true);
    try { setLog(await authFetch(`/api/muhtarbis/basvuru/${row.OBJECTID}/log`)); } catch (_) {}
    setLogLoading(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #EEEEEE', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#212529' }}>Başvuru Düzenle</div>
            <div style={{ fontSize: 12, color: '#7e7e7e', marginTop: 2 }}>
              {row.MAHALLE_AD} — {row.BASVURU_TA ? new Date(row.BASVURU_TA).toLocaleDateString('tr-TR') : '—'} — ID: {row.OBJECTID}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#9ca3af' }}>×</button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div><label style={S.label}>Konu</label><input value={form.KONUSU} onChange={e => setF('KONUSU', e.target.value)} style={S.input} /></div>
          <div><label style={S.label}>Talep Genel</label><textarea value={form.TALEP_GENE} onChange={e => setF('TALEP_GENE', e.target.value)} rows={3} style={{ ...S.input, resize: 'vertical' }} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={S.label}>Daire</label>
              <select value={form.DAIRE_BASK_ADI} onChange={e => setF('DAIRE_BASK_ADI', e.target.value)} style={S.input}>
                <option value="">— Seçiniz —</option>
                {daireler.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Durum</label>
              <select value={form.BIRIM_ISLE} onChange={e => setF('BIRIM_ISLE', e.target.value)} style={S.input}>
                <option value="">— Seçiniz —</option>
                {BASVURU_DURUMLAR.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div><label style={S.label}>Cevap Notu</label><textarea value={form.BIRIM_CEVA} onChange={e => setF('BIRIM_CEVA', e.target.value)} rows={3} style={{ ...S.input, resize: 'vertical' }} /></div>
          {error && <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#b91c1c', borderRadius: 8, fontSize: 13 }}>{error}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={onClose} style={S.btnSecondary}>İptal</button>
            <button onClick={handleSave} disabled={saving} style={S.btnPrimary}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
          </div>
        </div>
        <div style={{ borderTop: '1px solid #EEEEEE' }}>
          <button onClick={() => { if (!logOpen && !log.length) loadLog(); setLogOpen(v => !v); }}
            style={{ width: '100%', padding: '14px 24px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 600, color: '#374151' }}>
            <span><i className="bi bi-clock-history" style={{ marginRight: 6 }} />Değişiklik Geçmişi</span>
            <i className={`bi bi-chevron-${logOpen ? 'up' : 'down'}`} />
          </button>
          {logOpen && (
            <div style={{ padding: '0 24px 20px' }}>
              {logLoading ? <div style={{ color: '#9ca3af', fontSize: 13 }}>Yükleniyor…</div>
                : log.length === 0 ? <div style={{ color: '#9ca3af', fontSize: 13 }}>Henüz değişiklik kaydı yok.</div>
                : (
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead><tr style={{ borderBottom: '1px solid #EEEEEE' }}>
                      {['Tarih','Alan','Eski','Yeni','Düzenleyen'].map(h => <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {log.map(l => (
                        <tr key={l.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', color: '#6b7280' }}>{new Date(l.tarih).toLocaleString('tr-TR')}</td>
                          <td style={{ padding: '6px 8px', fontWeight: 600 }}>{l.alan}</td>
                          <td style={{ padding: '6px 8px', color: '#b91c1c', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.eskiDeger || '—'}</td>
                          <td style={{ padding: '6px 8px', color: '#15803d', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.yeniDeger || '—'}</td>
                          <td style={{ padding: '6px 8px' }}>{l.duzenleyenAd}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Yatırım düzenleme modalı ─────────────────────────────────────────────────
function YatirimEditModal({ yatirim, index, ilce, mahalle, onClose, onSaved }) {
  const [form, setForm] = useState({
    aciklama:      yatirim.talep         || '',
    tahmini_bedel: yatirim.tahmini_bedel || '',
    daire:         yatirim.daire         || '',
    durum:         yatirim.durum         || '',
    cevap:         yatirim.cevap         || '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  function setF(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSave() {
    setSaving(true); setError('');
    try {
      await authFetch(
        `/api/muhtarbis/yatirim/${encodeURIComponent(ilce)}/${encodeURIComponent(mahalle)}/${index}`,
        { method: 'PUT', body: JSON.stringify(form) }
      );
      onSaved();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #EEEEEE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#212529' }}>Yatırım Düzenle</div>
            <div style={{ fontSize: 12, color: '#7e7e7e', marginTop: 2 }}>{yatirim.tarih || '—'} — #{index + 1}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#9ca3af' }}>×</button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div><label style={S.label}>Açıklama</label><textarea value={form.aciklama} onChange={e => setF('aciklama', e.target.value)} rows={4} style={{ ...S.input, resize: 'vertical' }} /></div>
          <div><label style={S.label}>Tahmini Bedel</label><input value={form.tahmini_bedel} onChange={e => setF('tahmini_bedel', e.target.value)} placeholder="ör: 1.200.000 ₺" style={S.input} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={S.label}>Daire</label><input value={form.daire} onChange={e => setF('daire', e.target.value)} style={S.input} /></div>
            <div>
              <label style={S.label}>Durum</label>
              <select value={form.durum} onChange={e => setF('durum', e.target.value)} style={S.input}>
                <option value="">— Seçiniz —</option>
                {YATIRIM_DURUMLAR.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div><label style={S.label}>Cevap Notu</label><textarea value={form.cevap} onChange={e => setF('cevap', e.target.value)} rows={3} style={{ ...S.input, resize: 'vertical' }} /></div>
          {error && <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#b91c1c', borderRadius: 8, fontSize: 13 }}>{error}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={onClose} style={S.btnSecondary}>İptal</button>
            <button onClick={handleSave} disabled={saving} style={S.btnPrimary}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Başvurular sekmesi ───────────────────────────────────────────────────────
function BasvurularTab({ ilce, mahalle, daireler }) {
  const [durumFilter, setDurumFilter] = useState('');
  const [data,        setData]        = useState({ rows: [], toplam: 0 });
  const [sayfa,       setSayfa]       = useState(1);
  const [loading,     setLoading]     = useState(false);
  const [editRow,     setEditRow]     = useState(null);
  const [vis, setVis] = useState(() => loadVisibility(LS_KEY_BASVURU, BASVURU_SUTUNLARI));

  const fetch_ = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ sayfa, limit: 50 });
    if (durumFilter) p.set('durum', durumFilter);
    authFetch(`/api/muhtarbis/mahalle/${encodeURIComponent(ilce)}/${encodeURIComponent(mahalle)}/basvurular?${p}`)
      .then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [ilce, mahalle, durumFilter, sayfa]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const totalPages = Math.ceil(data.toplam / 50);
  const visCols = BASVURU_SUTUNLARI.filter(c => vis[c.key]);

  function renderCell(row, col) {
    const tdStyle = {
      padding: '10px 14px',
      verticalAlign: 'top',
      ...(col.wrap
        ? { whiteSpace: 'normal', wordBreak: 'break-word' }
        : { whiteSpace: 'nowrap' }),
    };
    switch (col.key) {
      case 'BASVURU_TA':
        return <td key={col.key} style={{ ...tdStyle, color: '#6b7280' }}>{row.BASVURU_TA ? new Date(row.BASVURU_TA).toLocaleDateString('tr-TR') : '—'}</td>;
      case 'KONUSU':
        return <td key={col.key} style={{ ...tdStyle, color: '#212529', maxWidth: 300 }}>{row.KONUSU || '—'}</td>;
      case 'TALEP_GENE':
        return <td key={col.key} style={{ ...tdStyle, color: '#6b7280', fontSize: 12, maxWidth: 260 }}>{row.TALEP_GENE || '—'}</td>;
      case 'DAIRE_BASK_ADI':
        return <td key={col.key} style={{ ...tdStyle }}><span style={{ fontSize: 11, color: '#6b7280' }}>{row.DAIRE_BASK_ADI || '—'}</span></td>;
      case 'CEVAP_SURE':
        return <td key={col.key} style={{ ...tdStyle, textAlign: 'center' }}>
          {row.CEVAP_SURE != null ? <span style={{ fontWeight: 700, color: surRenk(row.CEVAP_SURE) }}>{row.CEVAP_SURE}g</span> : '—'}
        </td>;
      case 'BIRIM_CEVA':
        return <td key={col.key} style={{ ...tdStyle, color: '#374151', fontSize: 12, maxWidth: 240 }}>{row.BIRIM_CEVA || '—'}</td>;
      case 'BIRIM_ISLE':
        return <td key={col.key} style={{ ...tdStyle }}>
          {row.BIRIM_ISLE ? durumBadge(row.BIRIM_ISLE, DURUM_STYLE) : <span style={{ color: '#9ca3af', fontSize: 11 }}>Atanmadı</span>}
        </td>;
      default:
        return <td key={col.key} style={tdStyle}>—</td>;
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#6b7280' }}>Durum:</span>
        {['', ...BASVURU_DURUMLAR].map(d => {
          const active = durumFilter === d;
          const ds = d ? (DURUM_STYLE[d] || {}) : {};
          return (
            <button key={d} onClick={() => { setDurumFilter(d); setSayfa(1); }}
              style={{ padding: '4px 12px', borderRadius: 20, border: `1px solid ${active && ds.dot ? ds.dot : '#e5e7eb'}`, background: active && ds.bg ? ds.bg : (active ? '#26af68' : '#fff'), color: active && ds.color ? ds.color : (active ? '#fff' : '#374151'), cursor: 'pointer', fontSize: 12, fontWeight: active ? 600 : 400 }}>
              {d || 'Tümü'}
            </button>
          );
        })}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#7e7e7e' }}>
          {loading ? '…' : `${data.toplam.toLocaleString('tr')} başvuru`}
        </span>
        <SutunlarDropdown sutunlar={BASVURU_SUTUNLARI} visibility={vis} lsKey={LS_KEY_BASVURU} onChangeVisibility={setVis} />
      </div>

      {/* Tablo */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EEEEEE', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9f9f9' }}>
                {visCols.map(col => (
                  <th key={col.key} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #EEEEEE', fontSize: 12, whiteSpace: 'nowrap', width: col.width !== 'auto' ? col.width : undefined }}>
                    {col.label}
                  </th>
                ))}
                <th style={{ padding: '10px 14px', borderBottom: '1px solid #EEEEEE', width: 48 }} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={visCols.length + 1} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>Yükleniyor…</td></tr>
              ) : data.rows.length === 0 ? (
                <tr><td colSpan={visCols.length + 1} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>Kayıt bulunamadı</td></tr>
              ) : data.rows.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  {visCols.map(col => renderCell(row, col))}
                  <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
                    <button onClick={() => setEditRow(row)} title="Düzenle"
                      style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#6b7280' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#26af68'; e.currentTarget.style.color = '#26af68'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#6b7280'; }}>
                      <i className="bi bi-pencil" style={{ fontSize: 13 }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #EEEEEE', display: 'flex', justifyContent: 'center', gap: 8 }}>
            <button onClick={() => setSayfa(p => Math.max(1, p-1))} disabled={sayfa === 1} style={S.pageBtn}>‹ Önceki</button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              const p = sayfa <= 4 ? i + 1 : sayfa - 3 + i;
              if (p < 1 || p > totalPages) return null;
              return <button key={p} onClick={() => setSayfa(p)} style={{ ...S.pageBtn, background: p === sayfa ? '#26af68' : '', color: p === sayfa ? '#fff' : '', borderColor: p === sayfa ? '#26af68' : '' }}>{p}</button>;
            })}
            <button onClick={() => setSayfa(p => Math.min(totalPages, p+1))} disabled={sayfa === totalPages} style={S.pageBtn}>Sonraki ›</button>
          </div>
        )}
      </div>

      {editRow && <BasvuruEditModal row={editRow} daireler={daireler} onClose={() => setEditRow(null)} onSaved={() => { setEditRow(null); fetch_(); }} />}
    </div>
  );
}

// ─── Yatırımlar sekmesi ───────────────────────────────────────────────────────
function YatirimlarTab({ ilce, mahalle }) {
  const [yatirimlar, setYatirimlar] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [editIdx,    setEditIdx]    = useState(null);
  const [vis, setVis] = useState(() => loadVisibility(LS_KEY_YATIRIM, YATIRIM_SUTUNLARI));

  const load = useCallback(() => {
    setLoading(true);
    authFetch(`/api/muhtarbis/mahalle/${encodeURIComponent(ilce)}/${encodeURIComponent(mahalle)}/yatirimlar`)
      .then(setYatirimlar).catch(() => {}).finally(() => setLoading(false));
  }, [ilce, mahalle]);

  useEffect(() => { load(); }, [load]);

  const visCols = YATIRIM_SUTUNLARI.filter(c => vis[c.key]);

  function renderCell(y, col) {
    const tdStyle = {
      padding: '10px 14px',
      verticalAlign: 'top',
      ...(col.wrap
        ? { whiteSpace: 'normal', wordBreak: 'break-word' }
        : { whiteSpace: 'nowrap' }),
    };
    switch (col.key) {
      case 'tarih':
        return <td key={col.key} style={{ ...tdStyle, color: '#6b7280' }}>{y.tarih || '—'}</td>;
      case 'aciklama':
        return <td key={col.key} style={{ ...tdStyle, color: '#212529', maxWidth: 340 }}>{y.talep || '—'}</td>;
      case 'tahmini_bedel':
        return <td key={col.key} style={{ ...tdStyle, color: '#374151', fontWeight: y.tahmini_bedel ? 500 : 400 }}>{y.tahmini_bedel || '—'}</td>;
      case 'daire':
        return <td key={col.key} style={{ ...tdStyle }}><span style={{ fontSize: 11, color: '#6b7280' }}>{y.daire || '—'}</span></td>;
      case 'cevap':
        return <td key={col.key} style={{ ...tdStyle, color: '#374151', fontSize: 12, maxWidth: 240 }}>{y.cevap || '—'}</td>;
      case 'durum':
        return <td key={col.key} style={{ ...tdStyle }}>
          {y.durum ? durumBadge(y.durum, YATIRIM_DURUM_STYLE) : <span style={{ color: '#9ca3af', fontSize: 11 }}>—</span>}
        </td>;
      default:
        return <td key={col.key} style={tdStyle}>—</td>;
    }
  }

  if (loading) return <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>Yükleniyor…</div>;
  if (!yatirimlar.length) return <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>Bu mahalle için yatırım kaydı bulunamadı.</div>;

  return (
    <>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: '#7e7e7e' }}>{yatirimlar.length.toLocaleString('tr')} kayıt</span>
        <SutunlarDropdown sutunlar={YATIRIM_SUTUNLARI} visibility={vis} lsKey={LS_KEY_YATIRIM} onChangeVisibility={setVis} />
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EEEEEE', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9f9f9' }}>
                {visCols.map(col => (
                  <th key={col.key} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #EEEEEE', fontSize: 12, whiteSpace: 'nowrap', width: col.width !== 'auto' ? col.width : undefined }}>
                    {col.label}
                  </th>
                ))}
                <th style={{ padding: '10px 14px', borderBottom: '1px solid #EEEEEE', width: 48 }} />
              </tr>
            </thead>
            <tbody>
              {yatirimlar.map((y, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  {visCols.map(col => renderCell(y, col))}
                  <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
                    <button onClick={() => setEditIdx(i)} title="Düzenle"
                      style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#6b7280' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#26af68'; e.currentTarget.style.color = '#26af68'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#6b7280'; }}>
                      <i className="bi bi-pencil-square" style={{ fontSize: 13 }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editIdx !== null && (
        <YatirimEditModal
          yatirim={yatirimlar[editIdx]}
          index={editIdx}
          ilce={ilce}
          mahalle={mahalle}
          onClose={() => setEditIdx(null)}
          onSaved={() => { setEditIdx(null); load(); }}
        />
      )}
    </>
  );
}

// ─── Ana sayfa bileşeni ───────────────────────────────────────────────────────
export default function MahalleDetay() {
  const { ilce: ilceParam, mahalle: mahalleParam } = useParams();
  const navigate = useNavigate();

  const ilce    = decodeURIComponent(ilceParam    || '');
  const mahalle = decodeURIComponent(mahalleParam || '');

  const [detay,    setDetay]    = useState(null);
  const [daireler, setDaireler] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('basvurular');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      authFetch(`/api/muhtarbis/mahalle/${ilceParam}/${mahalleParam}`),
      authFetch('/api/muhtarbis/filtreler'),
    ]).then(([d, f]) => { setDetay(d); setDaireler(f.daireler || []); })
      .catch(() => {}).finally(() => setLoading(false));
  }, [ilceParam, mahalleParam]);

  const ist = detay?.istatistik || {};
  const mb  = detay?.muhtarBilgi;

  return (
    <div style={{ padding: '32px 40px' }}>
      {/* Başlık — mahalle adını olduğu gibi göster */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button onClick={() => navigate(-1)}
          style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', color: '#374151', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="bi bi-arrow-left" /> Geri
        </button>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(38,175,104,0.12)', color: '#26af68', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
          🏘️
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#212529', margin: 0 }}>{mahalle}</h1>
          <p style={{ fontSize: 12, color: '#7e7e7e', margin: 0 }}>{ilce}</p>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>Yükleniyor…</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EEEEEE', padding: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Muhtar Bilgisi</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#212529', marginBottom: 8 }}>
                {detay?.muhtar || mb?.ad?.split('\n')[0] || '—'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {mb?.nufus && <div style={{ fontSize: 13, color: '#6b7280' }}><i className="bi bi-people" style={{ marginRight: 6, color: '#26af68' }} />Nüfus: <strong style={{ color: '#212529' }}>{mb.nufus.toLocaleString?.('tr') ?? mb.nufus}</strong></div>}
                {mb?.kirsal && <div style={{ fontSize: 13, color: '#6b7280' }}><i className="bi bi-geo-alt" style={{ marginRight: 6, color: '#26af68' }} />{mb.kirsal}</div>}
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EEEEEE', padding: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Başvuru Özeti</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Toplam',        value: ist.toplam,       color: '#26af68' },
                  { label: 'Tamamlandı',    value: ist.tamamlandi,   color: '#22c55e' },
                  { label: 'Devam Etmekte', value: ist.devam,        color: '#3b82f6' },
                  { label: 'Tamamlanmadı',  value: ist.tamamlanmadi, color: '#ef4444' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#6b7280' }}>{label}:</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#212529' }}>{value ?? 0}</span>
                  </div>
                ))}
              </div>
              {ist.ort_sure != null && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f3f4f6', fontSize: 13, color: '#6b7280' }}>
                  <i className="bi bi-clock" style={{ marginRight: 6, color: '#7c3aed' }} />
                  Ort. Cevap Süresi: <strong style={{ color: '#212529' }}>{ist.ort_sure} gün</strong>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #EEEEEE' }}>
            {[{ key: 'basvurular', label: '📋 Başvurular' }, { key: 'yatirimlar', label: '🏗️ Yatırımlar' }].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '10px 24px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: tab === t.key ? 700 : 500,
                color: tab === t.key ? '#26af68' : '#6b7280',
                borderBottom: `2px solid ${tab === t.key ? '#26af68' : 'transparent'}`, marginBottom: -2,
              }}>{t.label}</button>
            ))}
          </div>

          {tab === 'basvurular' && <BasvurularTab ilce={ilce} mahalle={mahalle} daireler={daireler} />}
          {tab === 'yatirimlar' && <YatirimlarTab ilce={ilce} mahalle={mahalle} />}
        </>
      )}
    </div>
  );
}
