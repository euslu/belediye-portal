import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/ui/PageHeader';

const API = import.meta.env.VITE_API_URL || '';
function authFetch(url, opts = {}) {
  const token = localStorage.getItem('token');
  return fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts.headers },
  });
}

const SISTEM_ROL_SEVIYE = { admin: 5, daire_baskani: 4, mudur: 3, sef: 2, personel: 1 };
function getSeviye(user) {
  if (user?.sistemRol && SISTEM_ROL_SEVIYE[user.sistemRol]) return SISTEM_ROL_SEVIYE[user.sistemRol];
  if (user?.role === 'admin') return 5;
  if (user?.role === 'manager') return 3;
  return 1;
}

const DURUM_COLORS = {
  beklemede:   { bg: '#fffbeb', color: '#d97706' },
  inceleniyor: { bg: '#eff6ff', color: '#2563eb' },
  tamamlandi:  { bg: '#ecfdf5', color: '#059669' },
  reddedildi:  { bg: '#fef2f2', color: '#dc2626' },
};
const DURUM_LABEL = { beklemede: 'Beklemede', inceleniyor: 'İnceleniyor', tamamlandi: 'Tamamlandı', reddedildi: 'Reddedildi' };

const ACILIYET_COLORS = {
  normal: { bg: '#f1f5f9', color: '#64748b' },
  acil:   { bg: '#fff7ed', color: '#ea580c' },
  kritik: { bg: '#fef2f2', color: '#dc2626' },
};
const ACILIYET_LABEL = { normal: 'Normal', acil: 'Acil', kritik: 'Kritik' };

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const DURUM_OPTIONS = [
  { value: '', label: 'Tüm Durumlar' },
  { value: 'beklemede', label: 'Beklemede' },
  { value: 'inceleniyor', label: 'İnceleniyor' },
  { value: 'tamamlandi', label: 'Tamamlandı' },
  { value: 'reddedildi', label: 'Reddedildi' },
];

export default function Gelistirme() {
  const { user } = useAuth();
  const canManage = getSeviye(user) >= 3;

  const [stats, setStats] = useState(null);
  const [talepler, setTalepler] = useState([]);
  const [toplam, setToplam] = useState(0);
  const [sayfa, setSayfa] = useState(1);
  const [toplamSayfa, setToplamSayfa] = useState(1);
  const [durumFiltre, setDurumFiltre] = useState('');
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ konu: '', icerik: '', aciliyet: 'normal', baskaAdina: '' });
  const [saving, setSaving] = useState(false);

  // Modal state
  const [selected, setSelected] = useState(null);
  const [modalDurum, setModalDurum] = useState('');
  const [modalYanit, setModalYanit] = useState('');
  const [modalSaving, setModalSaving] = useState(false);

  const loadStats = () =>
    authFetch(`${API}/api/gelistirme/istatistik`).then(r => r.json()).then(setStats).catch(() => {});

  const loadList = () => {
    setLoading(true);
    const params = new URLSearchParams({ sayfa, limit: 30 });
    if (durumFiltre) params.set('durum', durumFiltre);
    authFetch(`${API}/api/gelistirme?${params}`)
      .then(r => r.json())
      .then(d => {
        setTalepler(d.talepler || []);
        setToplam(d.toplam || 0);
        setToplamSayfa(d.toplamSayfa || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { loadList(); }, [sayfa, durumFiltre]);

  const handleCreate = async () => {
    if (!form.konu.trim() || !form.icerik.trim()) return;
    setSaving(true);
    try {
      const r = await authFetch(`${API}/api/gelistirme`, { method: 'POST', body: JSON.stringify(form) });
      if (r.ok) {
        setForm({ konu: '', icerik: '', aciliyet: 'normal', baskaAdina: '' });
        setShowForm(false);
        setSayfa(1);
        loadStats();
        loadList();
      }
    } catch {}
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!selected) return;
    setModalSaving(true);
    try {
      const r = await authFetch(`${API}/api/gelistirme/${selected.id}`, {
        method: 'PUT',
        body: JSON.stringify({ durum: modalDurum, yanit: modalYanit }),
      });
      if (r.ok) { setSelected(null); loadStats(); loadList(); }
    } catch {}
    setModalSaving(false);
  };

  const openModal = (t) => { setSelected(t); setModalDurum(t.durum); setModalYanit(t.yanit || ''); };

  // ─── Styles ─────────────────────────────────────────────────────────────────
  const labelStyle = { fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4, display: 'block' };
  const baseField = { width: '100%', height: 38, padding: '0 12px', fontSize: 13, border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', color: '#1e293b', outline: 'none', boxSizing: 'border-box' };
  const activeGlow = { border: '1.5px solid #10b981', background: '#f0fdf9', boxShadow: '0 0 0 3px rgba(16,185,129,0.10), 0 0 8px rgba(16,185,129,0.08)' };
  const selectStyle = (val) => ({ ...baseField, WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 30, ...(val ? activeGlow : {}) });
  const inputStyle = (val) => ({ ...baseField, ...(val ? activeGlow : {}) });
  const cardStyle = { background: '#fff', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' };
  const btnPrimary = { padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 };
  const btnSecondary = { padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 };

  const statItems = stats ? [
    { label: 'Toplam', value: stats.toplam, bg: '#f8fafc', color: '#475569' },
    { label: 'Beklemede', value: stats.beklemede, bg: '#fffbeb', color: '#d97706' },
    { label: 'İnceleniyor', value: stats.inceleniyor, bg: '#eff6ff', color: '#2563eb' },
    { label: 'Tamamlandı', value: stats.tamamlandi, bg: '#ecfdf5', color: '#059669' },
    { label: 'Reddedildi', value: stats.reddedildi, bg: '#fef2f2', color: '#dc2626' },
  ] : [];

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1200, margin: '0 auto' }}>
      <PageHeader title="Geliştirme Talepleri" icon={<i className="bi bi-lightbulb" style={{ fontSize: 22 }} />} />

      {/* İstatistik kartları */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginTop: 20 }}>
          {statItems.map(c => (
            <div key={c.label} style={{ background: c.bg, borderRadius: 12, padding: '16px 12px', textAlign: 'center', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtre + Yeni Talep */}
      <div style={{ ...cardStyle, marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: showForm ? 16 : 0 }}>
          <div style={{ width: 200 }}>
            <label style={labelStyle}>Durum</label>
            <select style={selectStyle(durumFiltre)} value={durumFiltre} onChange={e => { setDurumFiltre(e.target.value); setSayfa(1); }}>
              {DURUM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowForm(v => !v)} style={showForm ? { ...btnSecondary } : { ...btnPrimary }}>
            <i className={`bi ${showForm ? 'bi-x-lg' : 'bi-plus-lg'}`} />
            {showForm ? 'İptal' : 'Yeni Talep'}
          </button>
        </div>

        {/* Inline form */}
        {showForm && (
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: 20, border: '1px solid #e2e8f0' }}>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Konu *</label>
              <input style={inputStyle(form.konu)} value={form.konu} onChange={e => setForm({ ...form, konu: e.target.value })} placeholder="Geliştirme talebinin konusu" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>İçerik *</label>
              <textarea style={{ ...baseField, height: 80, padding: '8px 12px', resize: 'none', ...(form.icerik ? activeGlow : {}) }} value={form.icerik} onChange={e => setForm({ ...form, icerik: e.target.value })} placeholder="Detaylı açıklama yazın..." />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Aciliyet</label>
                <select style={selectStyle(form.aciliyet !== 'normal' ? form.aciliyet : '')} value={form.aciliyet} onChange={e => setForm({ ...form, aciliyet: e.target.value })}>
                  <option value="normal">Normal</option>
                  <option value="acil">Acil</option>
                  <option value="kritik">Kritik</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Başka Adına (opsiyonel)</label>
                <input style={inputStyle(form.baskaAdina)} value={form.baskaAdina} onChange={e => setForm({ ...form, baskaAdina: e.target.value })} placeholder="Kullanıcı adı veya isim" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handleCreate} disabled={saving || !form.konu.trim() || !form.icerik.trim()} style={{ ...btnPrimary, opacity: (saving || !form.konu.trim() || !form.icerik.trim()) ? 0.5 : 1 }}>
                {saving ? 'Kaydediliyor...' : 'Talep Oluştur'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tablo */}
      <div style={{ ...cardStyle, marginTop: 16 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Talepler yükleniyor...</div>
        ) : talepler.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
            <i className="bi bi-lightbulb" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
            Henüz talep yok
          </div>
        ) : (
          <>
            <div style={{ borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Tarih / Saat', 'Talep Eden', 'Konu', 'Aciliyet', 'Durum', 'Yanıt'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {talepler.map((t, idx) => (
                    <tr
                      key={t.id}
                      onClick={() => canManage && openModal(t)}
                      style={{ background: idx % 2 === 0 ? '#fff' : '#fafbfc', borderBottom: '1px solid #f1f5f9', cursor: canManage ? 'pointer' : 'default' }}
                    >
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: '#475569' }}>{formatDate(t.olusturmaTarih)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{t.talepEdenAd || t.talepEden}</div>
                        {t.baskaAdina && <div style={{ fontSize: 11, color: '#94a3b8' }}>{t.baskaAdina} adına</div>}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 500, color: '#1e293b' }}>{t.konu}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                          background: (ACILIYET_COLORS[t.aciliyet] || {}).bg || '#f1f5f9',
                          color: (ACILIYET_COLORS[t.aciliyet] || {}).color || '#64748b',
                        }}>{ACILIYET_LABEL[t.aciliyet] || t.aciliyet}</span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                          background: (DURUM_COLORS[t.durum] || {}).bg || '#f1f5f9',
                          color: (DURUM_COLORS[t.durum] || {}).color || '#64748b',
                        }}>{DURUM_LABEL[t.durum] || t.durum}</span>
                      </td>
                      <td style={{ padding: '10px 14px', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64748b', fontSize: 12 }}>
                        {t.yanit || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Sayfalama */}
            {toplamSayfa > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  Toplam {toplam} kayıt — Sayfa {sayfa}/{toplamSayfa}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button disabled={sayfa <= 1} onClick={() => setSayfa(s => s - 1)}
                    style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: sayfa <= 1 ? '#f1f5f9' : '#fff', cursor: sayfa <= 1 ? 'default' : 'pointer', color: '#64748b', fontSize: 13 }}>
                    <i className="bi bi-chevron-left" />
                  </button>
                  <button disabled={sayfa >= toplamSayfa} onClick={() => setSayfa(s => s + 1)}
                    style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: sayfa >= toplamSayfa ? '#f1f5f9' : '#fff', cursor: sayfa >= toplamSayfa ? 'default' : 'pointer', color: '#64748b', fontSize: 13 }}>
                    <i className="bi bi-chevron-right" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Durum güncelleme modalı */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={() => setSelected(null)}>
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: 480, padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>Talep Güncelle</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#94a3b8' }}>
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, marginBottom: 16, border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14, marginBottom: 4 }}>{selected.konu}</div>
              <div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.5 }}>{selected.icerik}</div>
              <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 8 }}>
                Talep Eden: {selected.talepEdenAd || selected.talepEden} — {formatDate(selected.olusturmaTarih)}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Durum</label>
              <select style={selectStyle(modalDurum)} value={modalDurum} onChange={e => setModalDurum(e.target.value)}>
                <option value="beklemede">Beklemede</option>
                <option value="inceleniyor">İnceleniyor</option>
                <option value="tamamlandi">Tamamlandı</option>
                <option value="reddedildi">Reddedildi</option>
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Yanıt</label>
              <textarea style={{ ...baseField, height: 80, padding: '8px 12px', resize: 'none' }} value={modalYanit} onChange={e => setModalYanit(e.target.value)} placeholder="Talep edene yanıt yazın..." />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setSelected(null)} style={btnSecondary}>İptal</button>
              <button onClick={handleUpdate} disabled={modalSaving} style={{ ...btnPrimary, opacity: modalSaving ? 0.5 : 1 }}>
                {modalSaving ? 'Kaydediliyor...' : 'Güncelle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
