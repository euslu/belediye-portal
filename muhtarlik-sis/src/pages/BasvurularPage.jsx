import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { muhtarlikApi, getToken } from '../lib/muhtarlik_api';

function authFetch(url, opts = {}) {
  return fetch(url, { ...opts, headers: { Authorization: `Bearer ${getToken()}`, ...opts.headers } });
}

function DonemKart({ baslik, ikon, veri, loading }) {
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e8ede9', borderRadius: 12, padding: '16px 20px', flex: 1 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#9aa8a0', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        {ikon} {baslik}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#1a2e23', marginBottom: 6, lineHeight: 1 }}>
        {loading ? '…' : (veri?.toplam?.toLocaleString('tr') ?? '—')}
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <span style={{ fontSize: 13, color: '#16a34a' }}>✓ {loading ? '…' : (veri?.tamamlandi?.toLocaleString('tr') ?? '—')}</span>
        <span style={{ fontSize: 13, color: '#2563eb' }}>↻ {loading ? '…' : (veri?.devam?.toLocaleString('tr') ?? '—')}</span>
      </div>
    </div>
  );
}

const DURUM_STYLE = {
  'Tamamlandı':    { bg: '#dcfce7', color: '#15803d', dot: '#22c55e' },
  'Devam Etmekte': { bg: '#dbeafe', color: '#1d4ed8', dot: '#3b82f6' },
  'Tamamlanmadı':  { bg: '#fee2e2', color: '#b91c1c', dot: '#ef4444' },
  'Beklemede':     { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
};
function durumStyle(d) { return DURUM_STYLE[d] || { bg: '#f3f4f6', color: '#4b5563', dot: '#9ca3af' }; }
function surRenk(g)    { return g == null ? '#9ca3af' : g <= 7 ? '#22c55e' : g <= 30 ? '#f59e0b' : '#ef4444'; }

const DURUMLAR = ['Tamamlandı', 'Devam Etmekte', 'Tamamlanmadı', 'Beklemede'];

function EditModal({ row, daireler, onClose, onSaved }) {
  const [form, setForm] = useState({
    KONUSU: row.KONUSU || '', TALEP_GENE: row.TALEP_GENE || '',
    DAIRE_BASK_ADI: row.DAIRE_BASK_ADI || '', BIRIM_ISLE: row.BIRIM_ISLE || '', BIRIM_CEVA: row.BIRIM_CEVA || '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const [log, setLog] = useState([]);
  const [logOpen, setLogOpen] = useState(false);

  function setF(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSave() {
    setSaving(true); setError('');
    try { await muhtarlikApi.updateBasvuru(row.OBJECTID, form); onSaved(); }
    catch (e) { setError(e.message); } finally { setSaving(false); }
  }

  async function toggleLog() {
    if (!logOpen && !log.length) {
      try { setLog(await muhtarlikApi.getBasvuruLog(row.OBJECTID)); } catch (_) {}
    }
    setLogOpen(v => !v);
  }

  const tarih = row.BASVURU_TA ? new Date(row.BASVURU_TA).toLocaleDateString('tr-TR') : '—';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #EEEEEE', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#212529' }}>Başvuru Düzenle</div>
            <div style={{ fontSize: 12, color: '#7e7e7e', marginTop: 2 }}>{row.MAHALLE_AD_1} / {row.MAHALLE_AD} — {tarih}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#9ca3af', lineHeight: 1 }}>×</button>
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
                {DURUMLAR.map(d => <option key={d} value={d}>{d}</option>)}
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
          <button onClick={toggleLog} style={{ width: '100%', padding: '14px 24px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 600, color: '#374151' }}>
            <span><i className="bi bi-clock-history" style={{ marginRight: 6 }} />Değişiklik Geçmişi</span>
            <i className={`bi bi-chevron-${logOpen ? 'up' : 'down'}`} />
          </button>
          {logOpen && (
            <div style={{ padding: '0 24px 20px' }}>
              {log.length === 0
                ? <div style={{ color: '#9ca3af', fontSize: 13 }}>Henüz değişiklik kaydı yok.</div>
                : (
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead><tr style={{ borderBottom: '1px solid #EEEEEE' }}>
                      {['Tarih', 'Alan', 'Eski', 'Yeni', 'Düzenleyen'].map(h => <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>{h}</th>)}
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

const S = {
  label:       { display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' },
  input:       { width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#212529', outline: 'none', background: '#fff', boxSizing: 'border-box' },
  pageBtn:     { padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 13 },
  btnPrimary:  { padding: '8px 20px', background: '#26af68', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  btnSecondary:{ padding: '8px 20px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 },
};

export default function BasvurularPage() {
  const navigate = useNavigate();
  const [filtreler,  setFiltreler]  = useState({ ilceler: [], mahalleler: [], daireler: [], durumlar: [], yillar: [] });
  const [mahalleler, setMahalleler] = useState([]);
  const [filters,    setFilters]    = useState({ ilce: '', mahalle: '', daire: '', durum: '', tur: '', q: '' });
  const [data,       setData]       = useState({ rows: [], toplam: 0 });
  const [sayfa,      setSayfa]      = useState(1);
  const [loading,    setLoading]    = useState(false);
  const [editRow,    setEditRow]    = useState(null);
  const [yilFilter,  setYilFilter]  = useState('2025');
  const [yillar,     setYillar]     = useState(['2025', '2026']);
  const [donem,      setDonem]      = useState({ hafta: null, ay: null, yil: null });
  const [donemLoad,  setDonemLoad]  = useState(true);

  useEffect(() => {
    muhtarlikApi.getFiltreler().then(d => {
      setFiltreler(d);
      if (d.yillar?.length) setYillar(d.yillar.map(String));
    }).catch(() => {});
    // 3 dönem paralel
    Promise.all([
      authFetch('/api/muhtarbis/rapor/donem?tip=hafta').then(r => r.ok ? r.json() : null),
      authFetch('/api/muhtarbis/rapor/donem?tip=ay').then(r => r.ok ? r.json() : null),
      authFetch('/api/muhtarbis/rapor/donem?tip=yil').then(r => r.ok ? r.json() : null),
    ]).then(([hafta, ay, yil]) => setDonem({ hafta, ay, yil }))
      .catch(() => {})
      .finally(() => setDonemLoad(false));
  }, []);

  useEffect(() => {
    if (!filters.ilce) { setMahalleler([]); return; }
    muhtarlikApi.getFiltreler(filters.ilce).then(d => setMahalleler(d.mahalleler || [])).catch(() => {});
  }, [filters.ilce]);

  const fetchListe = useCallback(() => {
    setLoading(true);
    const params = { sayfa, limit: 50 };
    if (filters.ilce)    params.ilce    = filters.ilce;
    if (filters.mahalle) params.mahalle = filters.mahalle;
    if (filters.daire)   params.daire   = filters.daire;
    if (filters.durum)   params.durum   = filters.durum;
    if (filters.tur)     params.tur     = filters.tur;
    if (filters.q)       params.q       = filters.q;
    if (yilFilter)       params.yil     = yilFilter;
    muhtarlikApi.getBasvurular(params).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [filters, sayfa, yilFilter]);

  useEffect(() => { fetchListe(); }, [fetchListe]);

  function setF(k, v) {
    setFilters(p => { const n = { ...p, [k]: v }; if (k === 'ilce') n.mahalle = ''; return n; });
    setSayfa(1);
  }

  const totalPages = Math.ceil(data.toplam / 50);

  return (
    <div style={{ padding: '32px 40px' }}>
      {/* Başlık */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(38,175,104,0.12)', color: '#26af68', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
            <i className="bi bi-journal-text" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#212529', margin: 0 }}>Tüm Başvurular</h1>
            <p style={{ fontSize: 12, color: '#7e7e7e', margin: 0 }}>Muhtarlıklar Daire Başkanlığı</p>
          </div>
        </div>
        {/* Yıl filtresi */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#7e7e7e' }}>Yıl:</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => { setYilFilter(''); setSayfa(1); }} style={{ ...S.pageBtn, background: !yilFilter ? '#26af68' : '', color: !yilFilter ? '#fff' : '', borderColor: !yilFilter ? '#26af68' : '' }}>Tümü</button>
            {yillar.map(y => (
              <button key={y} onClick={() => { setYilFilter(y); setSayfa(1); }} style={{ ...S.pageBtn, background: yilFilter === y ? '#26af68' : '', color: yilFilter === y ? '#fff' : '', borderColor: yilFilter === y ? '#26af68' : '' }}>{y}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Dönem kartları */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <DonemKart baslik="Bu Hafta" ikon="📅" veri={donem.hafta} loading={donemLoad} />
        <DonemKart baslik="Bu Ay"    ikon="🗓️"  veri={donem.ay}   loading={donemLoad} />
        <DonemKart baslik="Bu Yıl"   ikon="📆" veri={donem.yil}  loading={donemLoad} />
      </div>

      {/* Filtreler */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EEEEEE', padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 12 }}>
          <div>
            <label style={S.label}>Arama</label>
            <input type="text" placeholder="Konu, talep, muhtar adı…" value={filters.q} onChange={e => setF('q', e.target.value)} style={S.input} />
          </div>
          <div>
            <label style={S.label}>İlçe</label>
            <select value={filters.ilce} onChange={e => setF('ilce', e.target.value)} style={S.input}>
              <option value="">Tümü</option>
              {filtreler.ilceler.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Mahalle</label>
            <select value={filters.mahalle} onChange={e => setF('mahalle', e.target.value)} disabled={!filters.ilce} style={{ ...S.input, opacity: filters.ilce ? 1 : 0.5 }}>
              <option value="">Tümü</option>
              {mahalleler.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Daire</label>
            <select value={filters.daire} onChange={e => setF('daire', e.target.value)} style={S.input}>
              <option value="">Tümü</option>
              {filtreler.daireler.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Durum</label>
            <select value={filters.durum} onChange={e => setF('durum', e.target.value)} style={S.input}>
              <option value="">Tümü</option>
              {filtreler.durumlar.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Tablo */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EEEEEE', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #EEEEEE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#212529' }}>
            {loading ? 'Yükleniyor…' : `${data.toplam.toLocaleString('tr')} başvuru`}
          </span>
          <span style={{ fontSize: 12, color: '#7e7e7e' }}>Sayfa {sayfa} / {totalPages || 1}</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9f9f9' }}>
                {['Tarih', 'İlçe / Mahalle', 'Muhtar', 'Konu', 'Daire', 'Süre', 'Durum', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #EEEEEE', whiteSpace: 'nowrap', fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Yükleniyor…</td></tr>
                : data.rows.length === 0
                  ? <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Kayıt bulunamadı</td></tr>
                  : data.rows.map((row, i) => {
                    const ds    = durumStyle(row.BIRIM_ISLE);
                    const tarih = row.BASVURU_TA ? new Date(row.BASVURU_TA).toLocaleDateString('tr-TR') : '—';
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <td style={{ padding: '10px 14px', color: '#6b7280', whiteSpace: 'nowrap' }}>{tarih}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 500, color: '#212529' }}>{row.MAHALLE_AD_1}</div>
                          <button
                            onClick={() => navigate(`/mahalle/${encodeURIComponent(row.MAHALLE_AD_1)}/${encodeURIComponent(row.MAHALLE_AD)}`)}
                            style={{ fontSize: 11, color: '#26af68', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}>
                            {row.MAHALLE_AD}
                          </button>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#374151', whiteSpace: 'nowrap' }}>{row.MUHTAR_ADI || '—'}</td>
                        <td style={{ padding: '10px 14px', maxWidth: 260 }}>
                          <div style={{ color: '#212529', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.KONUSU || '—'}</div>
                          {row.TALEP_GENE && <div style={{ fontSize: 11, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.TALEP_GENE}</div>}
                        </td>
                        <td style={{ padding: '10px 14px', maxWidth: 160 }}>
                          <span style={{ fontSize: 11, color: '#6b7280', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.DAIRE_BASK_ADI || '—'}</span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          {row.CEVAP_SURE != null ? <span style={{ fontWeight: 700, color: surRenk(row.CEVAP_SURE) }}>{row.CEVAP_SURE}g</span> : '—'}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: ds.bg, color: ds.color }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: ds.dot }} />
                            {row.BIRIM_ISLE || 'Atanmadı'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <button onClick={() => setEditRow(row)} title="Düzenle"
                            style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#6b7280' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#26af68'; e.currentTarget.style.color = '#26af68'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#6b7280'; }}>
                            <i className="bi bi-pencil" style={{ fontSize: 13 }} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #EEEEEE', display: 'flex', justifyContent: 'center', gap: 8 }}>
            <button onClick={() => setSayfa(p => Math.max(1, p - 1))} disabled={sayfa === 1} style={S.pageBtn}>‹ Önceki</button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              const p = sayfa <= 4 ? i + 1 : sayfa - 3 + i;
              if (p < 1 || p > totalPages) return null;
              return <button key={p} onClick={() => setSayfa(p)} style={{ ...S.pageBtn, background: p === sayfa ? '#26af68' : '', color: p === sayfa ? '#fff' : '', borderColor: p === sayfa ? '#26af68' : '' }}>{p}</button>;
            })}
            <button onClick={() => setSayfa(p => Math.min(totalPages, p + 1))} disabled={sayfa === totalPages} style={S.pageBtn}>Sonraki ›</button>
          </div>
        )}
      </div>

      {editRow && (
        <EditModal row={editRow} daireler={filtreler.daireler} onClose={() => setEditRow(null)} onSaved={() => { setEditRow(null); fetchListe(); }} />
      )}
    </div>
  );
}
