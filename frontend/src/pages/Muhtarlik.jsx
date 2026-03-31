import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';
function authFetch(path, opts = {}) {
  return fetch(`${API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  }).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); });
}

// ─── Renk yardımcıları ────────────────────────────────────────────────────────
const DURUM_STYLE = {
  'Tamamlandı':    { bg: '#dcfce7', color: '#15803d', dot: '#22c55e' },
  'Devam Etmekte': { bg: '#dbeafe', color: '#1d4ed8', dot: '#3b82f6' },
  'Tamamlanmadı':  { bg: '#fee2e2', color: '#b91c1c', dot: '#ef4444' },
  'Beklemede':     { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
};
function durumStyle(d) { return DURUM_STYLE[d] || { bg: '#f3f4f6', color: '#4b5563', dot: '#9ca3af' }; }
function surRenk(gun) {
  if (gun == null) return '#9ca3af';
  if (gun <= 7)  return '#22c55e';
  if (gun <= 30) return '#f59e0b';
  return '#ef4444';
}

// ─── Stat kartı ───────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, borderColor, loading }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '20px 24px',
      border: '1px solid #EEEEEE', borderTop: `4px solid ${borderColor}`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    }}>
      <div>
        <div style={{ fontSize: 12, color: '#7e7e7e', marginBottom: 8 }}>{label}</div>
        <div style={{ fontSize: 36, fontWeight: 800, color: '#212529', lineHeight: 1 }}>
          {loading ? '…' : (value ?? '—')}
        </div>
      </div>
      <div style={{
        width: 52, height: 52, borderRadius: 12,
        background: borderColor + '20', color: borderColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
      }}>
        {icon}
      </div>
    </div>
  );
}

// ─── Bar chart (yatay) ────────────────────────────────────────────────────────
function HBarChart({ data, valueKey = 'toplam', labelKey, color = '#26af68', title, maxRows = 10 }) {
  const rows   = data.slice(0, maxRows);
  const maxVal = Math.max(...rows.map(r => r[valueKey] || 0), 1);
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EEEEEE', padding: 24 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#212529', margin: '0 0 20px' }}>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((row, i) => {
          const val = row[valueKey] || 0;
          const pct = Math.round((val / maxVal) * 100);
          return (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: '#374151', maxWidth: '75%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row[labelKey]}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#212529' }}>{val.toLocaleString('tr')}</span>
              </div>
              <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Dashboard sekmesi ────────────────────────────────────────────────────────
function DashboardTab({ yilFilter }) {
  const [stats,   setStats]   = useState(null);
  const [daire,   setDaire]   = useState([]);
  const [ilce,    setIlce]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const yilQ = yilFilter ? `?yil=${yilFilter}` : '';
    Promise.all([
      authFetch(`/api/muhtarbis/stats${yilQ}`),
      authFetch(`/api/muhtarbis/daire-dagilim${yilQ}`),
      authFetch(`/api/muhtarbis/ilce-dagilim${yilQ}`),
    ]).then(([s, d, i]) => {
      setStats(s); setDaire(d); setIlce(i);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [yilFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard label="Toplam Başvuru"    value={stats?.toplam?.toLocaleString('tr')}       icon="📋" borderColor="#26af68" loading={loading} />
        <StatCard label="Devam Etmekte"     value={stats?.devam?.toLocaleString('tr')}         icon="🔄" borderColor="#3b82f6" loading={loading} />
        <StatCard label="Tamamlandı"        value={stats?.tamamlandi?.toLocaleString('tr')}   icon="✅" borderColor="#22c55e" loading={loading} />
        <StatCard label="Tamamlanmadı"      value={stats?.tamamlanmadi?.toLocaleString('tr')} icon="❌" borderColor="#ef4444" loading={loading} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <StatCard label="Beklemede"         value={stats?.beklemede?.toLocaleString('tr')}    icon="⏳" borderColor="#f59e0b" loading={loading} />
        <StatCard label="Birim Atanmamış"   value={stats?.atanmamis?.toLocaleString('tr')}   icon="⚠️" borderColor="#9ca3af" loading={loading} />
        <StatCard label="Ort. Cevap Süresi" value={stats?.ort_sure != null ? `${stats.ort_sure} gün` : null} icon="⏱️" borderColor="#7c3aed" loading={loading} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
        <HBarChart data={daire} valueKey="toplam" labelKey="daire" color="#26af68" title="Daire Bazlı Başvuru Dağılımı" />
        <HBarChart data={ilce}  valueKey="toplam" labelKey="ilce"  color="#3b82f6" title="İlçe Bazlı Dağılım" />
      </div>
      {daire.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EEEEEE', padding: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#212529', margin: '0 0 20px' }}>Daire Bazlı Durum Dağılımı</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {daire.slice(0, 8).map((row, i) => {
              const top = row.toplam || 1;
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: '#374151', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.daire}</span>
                    <span style={{ fontSize: 11, color: '#7e7e7e' }}>{row.toplam.toLocaleString('tr')} toplam</span>
                  </div>
                  <div style={{ height: 10, background: '#f3f4f6', borderRadius: 5, overflow: 'hidden', display: 'flex' }}>
                    <div style={{ height: '100%', width: `${Math.round(row.tamamlandi/top*100)}%`, background: '#22c55e' }} />
                    <div style={{ height: '100%', width: `${Math.round(row.devam/top*100)}%`,       background: '#3b82f6' }} />
                    <div style={{ height: '100%', width: `${Math.round(row.tamamlanmadi/top*100)}%`,background: '#ef4444' }} />
                  </div>
                </div>
              );
            })}
            <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
              {[['#22c55e','Tamamlandı'], ['#3b82f6','Devam Etmekte'], ['#ef4444','Tamamlanmadı']].map(([c,l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6b7280' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: 'inline-block' }} />
                  {l}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Düzenleme modalı ─────────────────────────────────────────────────────────
const DURUMLAR = ['Tamamlandı', 'Devam Etmekte', 'Tamamlanmadı', 'Beklemede'];

function EditModal({ row, daireler, onClose, onSaved }) {
  const [form, setForm]       = useState({
    KONUSU:        row.KONUSU       || '',
    TALEP_GENE:    row.TALEP_GENE   || '',
    DAIRE_BASK_ADI:row.DAIRE_BASK_ADI || '',
    BIRIM_ISLE:    row.BIRIM_ISLE   || '',
    BIRIM_CEVA:    row.BIRIM_CEVA   || '',
  });
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [log,      setLog]      = useState([]);
  const [logOpen,  setLogOpen]  = useState(false);
  const [logLoading, setLogLoading] = useState(false);

  function setF(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSave() {
    setSaving(true); setError('');
    try {
      const res = await authFetch(`/api/muhtarbis/basvuru/${row.OBJECTID}`, {
        method: 'PUT', body: JSON.stringify(form),
      });
      onSaved(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function loadLog() {
    setLogLoading(true);
    try {
      const data = await authFetch(`/api/muhtarbis/basvuru/${row.OBJECTID}/log`);
      setLog(data);
    } catch (_) {}
    setLogLoading(false);
  }

  function toggleLog() {
    if (!logOpen && !log.length) loadLog();
    setLogOpen(o => !o);
  }

  const tarih = row.BASVURU_TA ? new Date(row.BASVURU_TA).toLocaleDateString('tr-TR') : '—';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #EEEEEE', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#212529' }}>Başvuru Düzenle</div>
            <div style={{ fontSize: 12, color: '#7e7e7e', marginTop: 2 }}>
              {row.MAHALLE_AD_1} / {row.MAHALLE_AD} — {tarih} — ID: {row.OBJECTID}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#9ca3af', lineHeight: 1 }}>×</button>
        </div>

        {/* Form */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={S.label}>Konu</label>
            <input value={form.KONUSU} onChange={e => setF('KONUSU', e.target.value)} style={S.input} />
          </div>
          <div>
            <label style={S.label}>Talep Genel</label>
            <textarea value={form.TALEP_GENE} onChange={e => setF('TALEP_GENE', e.target.value)}
              rows={3} style={{ ...S.input, resize: 'vertical' }} />
          </div>
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
          <div>
            <label style={S.label}>Cevap Notu</label>
            <textarea value={form.BIRIM_CEVA} onChange={e => setF('BIRIM_CEVA', e.target.value)}
              rows={3} style={{ ...S.input, resize: 'vertical' }} />
          </div>

          {error && <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#b91c1c', borderRadius: 8, fontSize: 13 }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={onClose} style={S.btnSecondary}>İptal</button>
            <button onClick={handleSave} disabled={saving} style={S.btnPrimary}>
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </div>

        {/* Değişiklik geçmişi accordion */}
        <div style={{ borderTop: '1px solid #EEEEEE' }}>
          <button onClick={toggleLog} style={{
            width: '100%', padding: '14px 24px', background: 'none', border: 'none',
            cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: 13, fontWeight: 600, color: '#374151',
          }}>
            <span><i className="bi bi-clock-history" style={{ marginRight: 6 }} />Değişiklik Geçmişi</span>
            <i className={`bi bi-chevron-${logOpen ? 'up' : 'down'}`} />
          </button>
          {logOpen && (
            <div style={{ padding: '0 24px 20px' }}>
              {logLoading ? (
                <div style={{ color: '#9ca3af', fontSize: 13 }}>Yükleniyor…</div>
              ) : log.length === 0 ? (
                <div style={{ color: '#9ca3af', fontSize: 13 }}>Henüz değişiklik kaydı yok.</div>
              ) : (
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #EEEEEE' }}>
                      {['Tarih', 'Alan', 'Eski', 'Yeni', 'Düzenleyen'].map(h => (
                        <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {log.map(l => (
                      <tr key={l.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', color: '#6b7280' }}>
                          {new Date(l.tarih).toLocaleString('tr-TR')}
                        </td>
                        <td style={{ padding: '6px 8px', fontWeight: 600, color: '#374151' }}>{l.alan}</td>
                        <td style={{ padding: '6px 8px', color: '#b91c1c', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.eskiDeger || '—'}</td>
                        <td style={{ padding: '6px 8px', color: '#15803d', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.yeniDeger || '—'}</td>
                        <td style={{ padding: '6px 8px', color: '#374151' }}>{l.duzenleyenAd}</td>
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

// ─── Takip sekmesi ────────────────────────────────────────────────────────────
function TakipTab({ yilFilter }) {
  const navigate = useNavigate();
  const [filtreler, setFiltreler]     = useState({ ilceler: [], mahalleler: [], daireler: [], yillar: [], durumlar: [], turler: [] });
  const [mahalleler, setMahalleler]   = useState([]); // ilçeye göre dinamik
  const [filters,   setFilters]       = useState({ ilce: '', mahalle: '', daire: '', durum: '', tur: '', q: '' });
  const [data,      setData]          = useState({ rows: [], toplam: 0, sayfa: 1 });
  const [sayfa,     setSayfa]         = useState(1);
  const [loading,   setLoading]       = useState(false);
  const [editRow,   setEditRow]       = useState(null);

  // Filtre seçeneklerini yükle
  useEffect(() => {
    authFetch('/api/muhtarbis/filtreler').then(setFiltreler).catch(() => {});
  }, []);

  // İlçe değişince mahalle dropdown'ını yükle
  useEffect(() => {
    if (!filters.ilce) {
      setMahalleler([]);
      return;
    }
    authFetch(`/api/muhtarbis/filtreler?ilce=${encodeURIComponent(filters.ilce)}`)
      .then(d => setMahalleler(d.mahalleler || []))
      .catch(() => {});
  }, [filters.ilce]);

  const fetchListe = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ sayfa, limit: 50 });
    if (filters.ilce)    params.set('ilce',    filters.ilce);
    if (filters.mahalle) params.set('mahalle', filters.mahalle);
    if (filters.daire)   params.set('daire',   filters.daire);
    if (filters.durum)   params.set('durum',   filters.durum);
    if (filters.tur)     params.set('tur',     filters.tur);
    if (filters.q)       params.set('q',       filters.q);
    if (yilFilter)       params.set('yil',     yilFilter);
    authFetch(`/api/muhtarbis/liste?${params}`)
      .then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [filters, sayfa, yilFilter]);

  useEffect(() => { fetchListe(); }, [fetchListe]);

  function setF(k, v) {
    setFilters(p => {
      const next = { ...p, [k]: v };
      if (k === 'ilce') next.mahalle = ''; // ilçe değişince mahalle sıfırla
      return next;
    });
    setSayfa(1);
  }

  const totalPages = Math.ceil(data.toplam / 50);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Filtreler */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EEEEEE', padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 12 }}>
          <div>
            <label style={S.label}>Arama</label>
            <input type="text" placeholder="Konu, talep, muhtar adı…"
              value={filters.q} onChange={e => setF('q', e.target.value)} style={S.input} />
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
            <select value={filters.mahalle} onChange={e => setF('mahalle', e.target.value)}
              disabled={!filters.ilce} style={{ ...S.input, opacity: filters.ilce ? 1 : 0.5 }}>
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
                {['Tarih','İlçe / Mahalle','Muhtar','Konu','Daire','Süre','Durum',''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #EEEEEE', whiteSpace: 'nowrap', fontSize: 12 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Yükleniyor…</td></tr>
              ) : data.rows.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Kayıt bulunamadı</td></tr>
              ) : data.rows.map((row, i) => {
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
                        onClick={() => navigate(`/muhtarlik/mahalle/${encodeURIComponent(row.MAHALLE_AD_1)}/${encodeURIComponent(row.MAHALLE_AD)}`)}
                        style={{ fontSize: 11, color: '#26af68', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}>
                        {row.MAHALLE_AD}
                      </button>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#374151', whiteSpace: 'nowrap' }}>{row.MUHTAR_ADI || '—'}</td>
                    <td style={{ padding: '10px 14px', maxWidth: 260 }}>
                      <div style={{ color: '#212529', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.KONUSU || '—'}</div>
                      {row.TALEP_GENE && (
                        <div style={{ fontSize: 11, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.TALEP_GENE}</div>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', maxWidth: 160 }}>
                      <span style={{ fontSize: 11, color: '#6b7280', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.DAIRE_BASK_ADI || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      {row.CEVAP_SURE != null ? (
                        <span style={{ fontWeight: 700, color: surRenk(row.CEVAP_SURE) }}>{row.CEVAP_SURE}g</span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: ds.bg, color: ds.color,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: ds.dot }} />
                        {row.BIRIM_ISLE || 'Atanmadı'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button onClick={() => setEditRow(row)}
                        title="Düzenle"
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
            <button onClick={() => setSayfa(p => Math.max(1, p-1))} disabled={sayfa === 1} style={S.pageBtn}>‹ Önceki</button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              const p = sayfa <= 4 ? i + 1 : sayfa - 3 + i;
              if (p < 1 || p > totalPages) return null;
              return (
                <button key={p} onClick={() => setSayfa(p)}
                  style={{ ...S.pageBtn, background: p === sayfa ? '#26af68' : '', color: p === sayfa ? '#fff' : '', borderColor: p === sayfa ? '#26af68' : '' }}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => setSayfa(p => Math.min(totalPages, p+1))} disabled={sayfa === totalPages} style={S.pageBtn}>Sonraki ›</button>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editRow && (
        <EditModal
          row={editRow}
          daireler={filtreler.daireler}
          onClose={() => setEditRow(null)}
          onSaved={() => { setEditRow(null); fetchListe(); }}
        />
      )}
    </div>
  );
}

// ─── Stil sabitleri ───────────────────────────────────────────────────────────
const S = {
  label:       { display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' },
  input:       { width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#212529', outline: 'none', background: '#fff', boxSizing: 'border-box' },
  pageBtn:     { padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 13 },
  btnPrimary:  { padding: '8px 20px', background: '#26af68', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  btnSecondary:{ padding: '8px 20px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 },
};

// ─── Ana bileşen ──────────────────────────────────────────────────────────────
export default function Muhtarlik() {
  const [tab,       setTab]       = useState('dashboard');
  const [yilFilter, setYilFilter] = useState('2025');
  const [yillar,    setYillar]    = useState(['2025', '2026']);

  useEffect(() => {
    authFetch('/api/muhtarbis/filtreler')
      .then(d => { if (d.yillar?.length) setYillar(d.yillar.map(String)); })
      .catch(() => {});
  }, []);

  return (
    <div style={{ padding: '32px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(38,175,104,0.12)', color: '#26af68', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
            🏘️
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#212529', margin: 0 }}>Muhtarlık Başvuruları</h1>
            <p style={{ fontSize: 12, color: '#7e7e7e', margin: 0 }}>Muhtarlık İşleri Dairesi Başkanlığı</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#7e7e7e' }}>Yıl:</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setYilFilter('')}
              style={{ ...S.pageBtn, background: !yilFilter ? '#26af68' : '', color: !yilFilter ? '#fff' : '', borderColor: !yilFilter ? '#26af68' : '' }}>
              Tümü
            </button>
            {yillar.map(y => (
              <button key={y} onClick={() => setYilFilter(y)}
                style={{ ...S.pageBtn, background: yilFilter === y ? '#26af68' : '', color: yilFilter === y ? '#fff' : '', borderColor: yilFilter === y ? '#26af68' : '' }}>
                {y}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid #EEEEEE' }}>
        {[
          { key: 'dashboard', label: '📊 Dashboard' },
          { key: 'takip',     label: '📋 Tüm Başvurular' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 24px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: tab === t.key ? 700 : 500,
            color: tab === t.key ? '#26af68' : '#6b7280',
            borderBottom: `2px solid ${tab === t.key ? '#26af68' : 'transparent'}`,
            marginBottom: -2,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <DashboardTab yilFilter={yilFilter} />}
      {tab === 'takip'     && <TakipTab     yilFilter={yilFilter} />}
    </div>
  );
}
