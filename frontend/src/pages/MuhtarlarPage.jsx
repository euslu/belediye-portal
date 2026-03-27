import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';
function authFetch(path) {
  return fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  }).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); });
}

const S = {
  label: { display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: { width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#212529', outline: 'none', background: '#fff', boxSizing: 'border-box' },
  pageBtn: { padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 13 },
};

export default function MuhtarlarPage() {
  const navigate = useNavigate();
  const [data,    setData]    = useState({}); // { İLÇE: { MAHALLE: [ad, nufus, kirsal, ...] } }
  const [loading, setLoading] = useState(true);
  const [q,       setQ]       = useState('');
  const [ilce,    setIlce]    = useState('');
  const [sayfa,   setSayfa]   = useState(1);
  const LIMIT = 50;

  useEffect(() => {
    authFetch('/api/muhtarbis/yatirimlar')
      .then(summary => {
        // summary döner: { İLÇE: { mahalle, talep } } — tüm veriyi çekmek için ilçe bazlı yükle
        const ilceler = Object.keys(summary);
        return Promise.all(
          ilceler.map(il =>
            authFetch(`/api/muhtarbis/yatirimlar?ilce=${encodeURIComponent(il)}`)
              .then(d => ({ ilce: il, mahalleler: d }))
          )
        );
      })
      .then(results => {
        const merged = {};
        results.forEach(({ ilce, mahalleler }) => { merged[ilce] = mahalleler; });
        setData(merged);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Tüm muhtarları düz liste olarak çıkar
  const rows = useMemo(() => {
    const list = [];
    for (const [il, mahalleler] of Object.entries(data)) {
      for (const [mahalle, d] of Object.entries(mahalleler)) {
        list.push({
          ilce:    il,
          mahalle: mahalle,
          muhtar:  d[0] || '—',
          nufus:   d[1] || 0,
          kirsal:  d[2] || '',
          talep:   typeof d[3] === 'number' ? d[3] : (Array.isArray(d[3]) ? d[3].length : 0),
        });
      }
    }
    return list.sort((a, b) => a.ilce.localeCompare(b.ilce, 'tr') || a.mahalle.localeCompare(b.mahalle, 'tr'));
  }, [data]);

  const ilceler = useMemo(() => [...new Set(rows.map(r => r.ilce))].sort((a, b) => a.localeCompare(b, 'tr')), [rows]);

  const filtered = useMemo(() => {
    const ql = q.toLocaleLowerCase('tr');
    return rows.filter(r =>
      (!ilce || r.ilce === ilce) &&
      (!q || r.mahalle.toLocaleLowerCase('tr').includes(ql) || r.muhtar.toLocaleLowerCase('tr').includes(ql))
    );
  }, [rows, ilce, q]);

  const totalPages = Math.ceil(filtered.length / LIMIT);
  const page = filtered.slice((sayfa - 1) * LIMIT, sayfa * LIMIT);

  function setFilter(fn) { fn(); setSayfa(1); }

  return (
    <div style={{ padding: '32px 40px' }}>
      {/* Başlık */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(38,175,104,0.12)', color: '#26af68', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
          <i className="bi bi-person-badge" />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#212529', margin: 0 }}>Muhtarlar</h1>
          <p style={{ fontSize: 12, color: '#7e7e7e', margin: 0 }}>
            {loading ? 'Yükleniyor…' : `${rows.length} mahalle muhtarı`}
          </p>
        </div>
      </div>

      {/* Filtreler */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EEEEEE', padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <div>
            <label style={S.label}>Muhtar Adı veya Mahalle Ara</label>
            <input
              type="text"
              placeholder="Muhtar adı veya mahalle…"
              value={q}
              onChange={e => setFilter(() => setQ(e.target.value))}
              style={S.input}
            />
          </div>
          <div>
            <label style={S.label}>İlçe</label>
            <select value={ilce} onChange={e => setFilter(() => setIlce(e.target.value))} style={S.input}>
              <option value="">Tüm İlçeler</option>
              {ilceler.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Tablo */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EEEEEE', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #EEEEEE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#212529' }}>
            {loading ? 'Yükleniyor…' : `${filtered.length.toLocaleString('tr')} muhtar`}
          </span>
          <span style={{ fontSize: 12, color: '#7e7e7e' }}>Sayfa {sayfa} / {totalPages || 1}</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9f9f9' }}>
                {['İlçe', 'Mahalle', 'Muhtar Adı', 'Nüfus', 'Tür', 'Başvuru'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #EEEEEE', whiteSpace: 'nowrap', fontSize: 12 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Yükleniyor…</td></tr>
              ) : page.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Kayıt bulunamadı</td></tr>
              ) : page.map((row, i) => (
                <tr key={i}
                  style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                  onClick={() => navigate(`/muhtarlik/mahalle/${encodeURIComponent(row.ilce)}/${encodeURIComponent(row.mahalle)}`)}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '10px 16px', color: '#6b7280', whiteSpace: 'nowrap' }}>{row.ilce}</td>
                  <td style={{ padding: '10px 16px', fontWeight: 500, color: '#26af68' }}>{row.mahalle}</td>
                  <td style={{ padding: '10px 16px', color: '#212529' }}>{row.muhtar}</td>
                  <td style={{ padding: '10px 16px', color: '#374151', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {row.nufus ? row.nufus.toLocaleString('tr') : '—'}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    {row.kirsal ? (
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: '#fef3c7', color: '#92400e' }}>Kırsal</span>
                    ) : (
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: '#dbeafe', color: '#1d4ed8' }}>Kentsel</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'center', color: '#374151', fontWeight: 600 }}>
                    {row.talep > 0 ? row.talep.toLocaleString('tr') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #EEEEEE', display: 'flex', justifyContent: 'center', gap: 8 }}>
            <button onClick={() => setSayfa(p => Math.max(1, p - 1))} disabled={sayfa === 1} style={S.pageBtn}>‹ Önceki</button>
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
            <button onClick={() => setSayfa(p => Math.min(totalPages, p + 1))} disabled={sayfa === totalPages} style={S.pageBtn}>Sonraki ›</button>
          </div>
        )}
      </div>
    </div>
  );
}
