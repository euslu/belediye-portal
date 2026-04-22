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

const MODUL_OPTIONS = [
  { value: '',               label: 'Tüm Modüller' },
  { value: 'ticket',         label: 'Talepler' },
  { value: 'inventory',      label: 'Envanter' },
  { value: 'work-order',     label: 'İş Emirleri' },
  { value: 'gelistirme',     label: 'Geliştirme' },
];

const ISLEM_OPTIONS = [
  { value: '',       label: 'Tüm İşlemler' },
  { value: 'CREATE', label: 'Oluşturma' },
  { value: 'UPDATE', label: 'Güncelleme' },
  { value: 'DELETE', label: 'Silme' },
  { value: 'ASSIGN', label: 'Atama' },
  { value: 'STATUS_CHANGED', label: 'Durum Değişikliği' },
];

const ISLEM_BADGE = {
  CREATE:         'bg-green-100 text-green-700',
  UPDATE:         'bg-blue-100 text-blue-700',
  DELETE:         'bg-red-100 text-red-700',
  ASSIGN:         'bg-purple-100 text-purple-700',
  STATUS_CHANGED: 'bg-amber-100 text-amber-700',
  MATCH_RUN:      'bg-indigo-100 text-indigo-700',
  LICENSE_ADD:    'bg-teal-100 text-teal-700',
  LICENSE_DELETE: 'bg-orange-100 text-orange-700',
};

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function parseDetay(detay) {
  if (!detay) return '-';
  try {
    const obj = typeof detay === 'string' ? JSON.parse(detay) : detay;
    return Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(', ');
  } catch {
    return String(detay);
  }
}

export default function IslemGecmisi() {
  const { user } = useAuth();
  const isAdmin = ['admin', 'daire_baskani'].includes(user?.sistemRol) || user?.role === 'admin';

  const [kayitlar, setKayitlar] = useState([]);
  const [toplam, setToplam] = useState(0);
  const [sayfa, setSayfa] = useState(1);
  const [toplamSayfa, setToplamSayfa] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filtreler
  const [modul, setModul] = useState('');
  const [kullanici, setKullanici] = useState('');
  const [islem, setIslem] = useState('');
  const [baslangic, setBaslangic] = useState('');
  const [bitis, setBitis] = useState('');

  const loadData = () => {
    setLoading(true);
    const params = new URLSearchParams({ sayfa, limit: 50 });
    if (modul)     params.set('modul', modul);
    if (kullanici) params.set('kullanici', kullanici);
    if (islem)     params.set('islem', islem);
    if (baslangic) params.set('baslangic', baslangic);
    if (bitis)     params.set('bitis', bitis);

    authFetch(`${API}/api/islem-gecmisi?${params}`)
      .then(r => {
        if (r.status === 403) throw new Error('Yetki yok');
        return r.json();
      })
      .then(d => {
        setKayitlar(d.kayitlar || []);
        setToplam(d.toplam || 0);
        setToplamSayfa(d.toplamSayfa || 1);
      })
      .catch(() => { setKayitlar([]); setToplam(0); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [sayfa]);

  const handleFilter = () => {
    setSayfa(1);
    loadData();
  };

  if (!isAdmin) {
    return (
      <div className="p-4 md:p-6">
        <PageHeader title="İşlem Geçmişi" icon={<i className="bi bi-clock-history" style={{ fontSize: 22 }} />} />
        <Surface>
          <EmptyState icon="bi-shield-lock" text="Bu sayfaya erişim yetkiniz yok" />
        </Surface>
      </div>
    );
  }

  const labelStyle = { fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4, display: 'block' };
  const baseField = { width: '100%', height: 38, padding: '0 12px', fontSize: 13, border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', color: '#1e293b', outline: 'none', boxSizing: 'border-box', WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' };
  const activeGlow = { border: '1.5px solid #10b981', background: '#f0fdf9', boxShadow: '0 0 0 3px rgba(16,185,129,0.10), 0 0 8px rgba(16,185,129,0.08)' };
  const selectStyle = (val) => ({ ...baseField, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 30, ...(val ? activeGlow : {}) });
  const inputStyle = (val) => ({ ...baseField, ...(val ? activeGlow : {}) });

  const ISLEM_COLORS = {
    CREATE: { bg: '#ecfdf5', color: '#059669' },
    UPDATE: { bg: '#eff6ff', color: '#2563eb' },
    DELETE: { bg: '#fef2f2', color: '#dc2626' },
    ASSIGN: { bg: '#f5f3ff', color: '#7c3aed' },
    STATUS_CHANGED: { bg: '#fffbeb', color: '#d97706' },
    MATCH_RUN: { bg: '#eef2ff', color: '#4f46e5' },
    LICENSE_ADD: { bg: '#f0fdfa', color: '#0d9488' },
    LICENSE_DELETE: { bg: '#fff7ed', color: '#ea580c' },
  };

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1200, margin: '0 auto' }}>
      <PageHeader title="İşlem Geçmişi" icon={<i className="bi bi-clock-history" style={{ fontSize: 22 }} />} />

      {/* Filtreler */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', marginTop: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Modül</label>
            <select style={selectStyle(modul)} value={modul} onChange={e => setModul(e.target.value)}>
              {MODUL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Kullanıcı</label>
            <input style={inputStyle(kullanici)} value={kullanici} onChange={e => setKullanici(e.target.value)} placeholder="Kullanıcı adı..." />
          </div>
          <div>
            <label style={labelStyle}>İşlem Tipi</label>
            <select style={selectStyle(islem)} value={islem} onChange={e => setIslem(e.target.value)}>
              {ISLEM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Başlangıç</label>
            <input type="date" style={inputStyle(baslangic)} value={baslangic} onChange={e => setBaslangic(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Bitiş</label>
            <input type="date" style={inputStyle(bitis)} value={bitis} onChange={e => setBitis(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={handleFilter} style={{
            padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <i className="bi bi-funnel" /> Filtrele
          </button>
        </div>
      </div>

      {/* Tablo */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', marginTop: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Kayıtlar yükleniyor...</div>
        ) : kayitlar.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
            <i className="bi bi-clock-history" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
            Kayıt bulunamadı
          </div>
        ) : (
          <>
            <div style={{ borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Tarih / Saat', 'Kullanıcı', 'İşlem', 'Modül', 'Kayıt ID', 'Detay'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderBottom: '2px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {kayitlar.map((k, idx) => (
                    <tr key={k.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafbfc', borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: '#475569' }}>{formatDate(k.tarih)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{k.kullaniciAd || k.kullanici}</div>
                        {k.kullaniciAd && <div style={{ fontSize: 11, color: '#94a3b8' }}>{k.kullanici}</div>}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                          background: (ISLEM_COLORS[k.islem] || {}).bg || '#f1f5f9',
                          color: (ISLEM_COLORS[k.islem] || {}).color || '#64748b',
                        }}>{k.islem}</span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748b' }}>{k.modul}</td>
                      <td style={{ padding: '10px 14px' }}>
                        {k.kayitId ? <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#94a3b8' }}>#{k.kayitId}</span> : '-'}
                      </td>
                      <td style={{ padding: '10px 14px', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64748b', fontSize: 12 }}>
                        {parseDetay(k.detay)}
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
    </div>
  );
}
