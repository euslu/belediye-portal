import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken } from '../lib/muhtarlik_api';

const S = {
  label:   { display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' },
  input:   { width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#212529', outline: 'none', background: '#fff', boxSizing: 'border-box' },
  pageBtn: { padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 13 },
};

function authFetch(url, opts = {}) {
  return fetch(url, { ...opts, headers: { Authorization: `Bearer ${getToken()}`, ...opts.headers } });
}

function FotoCell({ ilce, mahalle, fotoUrl, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  async function handleFile(file) {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('foto', file);
      const res = await authFetch(
        `/api/muhtarbis/muhtar-foto/${encodeURIComponent(ilce)}/${encodeURIComponent(mahalle)}`,
        { method: 'POST', body: fd }
      );
      const data = await res.json();
      if (data.url) onUploaded(data.url + '?t=' + Date.now());
    } catch (_) {}
    finally { setUploading(false); }
  }

  if (uploading) return (
    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 16, height: 16, border: '2px solid #26af68', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (fotoUrl) return (
    <img src={fotoUrl} alt="" loading="eager"
      style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e5e7eb', display: 'block', opacity: 0, transition: 'opacity 0.2s' }}
      onLoad={e => { e.target.style.opacity = 1; }}
      onError={e => { e.target.style.display = 'none'; }} />
  );

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files[0])} />
      <button onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
        title="Fotoğraf Ekle"
        style={{ width: 40, height: 40, borderRadius: '50%', background: '#f3f4f6', border: '2px dashed #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9ca3af', fontSize: 15 }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#26af68'; e.currentTarget.style.color = '#26af68'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#9ca3af'; }}>
        <i className="bi bi-camera" />
      </button>
    </>
  );
}

export default function MuhtarlarPage() {
  const navigate = useNavigate();
  const [rows,    setRows]    = useState([]);
  const [ilceler, setIlceler] = useState([]);
  const [fotolar, setFotolar] = useState({});   // { "MAHALLE_ADI": url }
  const [loading, setLoading] = useState(true);
  const [q,       setQ]       = useState('');
  const [ilce,    setIlce]    = useState('');
  const [sayfa,   setSayfa]   = useState(1);
  const [toplam,  setToplam]  = useState(0);
  const LIMIT = 50;

  // Muhtarları yükle
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: 9999 });
    authFetch(`/api/muhtarbis/muhtarlar?${params}`)
      .then(r => r.ok ? r.json() : { rows: [] })
      .then(data => {
        const all = data.rows || [];
        setRows(all);
        setToplam(data.toplam || all.length);
        setIlceler([...new Set(all.map(r => r.ilce))].sort((a, b) => a.localeCompare(b, 'tr')));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Fotoları ilçe bazlı tek istekle çek
  useEffect(() => {
    const url = ilce
      ? `/api/muhtarbis/muhtar-fotolar?ilce=${encodeURIComponent(ilce)}`
      : '/api/muhtarbis/muhtar-fotolar';
    authFetch(url)
      .then(r => r.ok ? r.json() : {})
      .then(data => {
        // { ILCE: { "MAHALLE MUHTARI": { foto, ad_soyad } } }
        const map = {};
        Object.values(data).forEach(ilceData => {
          Object.entries(ilceData).forEach(([mahalleKey, info]) => {
            // "ADAKÖY MAHALLESİ MUHTARI" → mahalle adını çıkar
            const mahalle = mahalleKey
              .replace(/\s+MUHTARI\s*$/i, '')
              .replace(/\s+MAHALLESİ\s*$/i, ' MAHALLESİ')
              .trim();
            if (info.foto) map[mahalle] = info.foto;
            // Orijinal key ile de kaydet (fallback)
            if (info.foto) map[mahalleKey] = info.foto;
          });
        });
        setFotolar(map);
      })
      .catch(() => {});
  }, [ilce]);

  // Filtrelenmiş satırlar (client-side)
  const filtered = useMemo(() => {
    const ql = q.toLocaleLowerCase('tr');
    return rows.filter(r =>
      (!ilce || r.ilce === ilce) &&
      (!q || r.mahalle.toLocaleLowerCase('tr').includes(ql) || r.ad_soyad.toLocaleLowerCase('tr').includes(ql))
    );
  }, [rows, ilce, q]);

  const totalPages = Math.ceil(filtered.length / LIMIT);
  const page = filtered.slice((sayfa - 1) * LIMIT, sayfa * LIMIT);

  function setFilter(fn) { fn(); setSayfa(1); }

  return (
    <div style={{ padding: '32px 40px' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(38,175,104,0.12)', color: '#26af68', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
          <i className="bi bi-person-badge" />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#212529', margin: 0 }}>Muhtarlar</h1>
          <p style={{ fontSize: 12, color: '#7e7e7e', margin: 0 }}>
            {loading ? 'Yükleniyor…' : `${filtered.length.toLocaleString('tr')} mahalle muhtarı`}
          </p>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EEEEEE', padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <div>
            <label style={S.label}>Muhtar Adı veya Mahalle Ara</label>
            <input type="text" placeholder="Muhtar adı veya mahalle…" value={q}
              onChange={e => setFilter(() => setQ(e.target.value))} style={S.input} />
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
                {['', 'İlçe', 'Mahalle', 'Muhtar Adı', 'Nüfus', 'Tür', 'Talep', 'Tamamlandı'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: (h==='Nüfus'||h==='Talep'||h==='Tamamlandı') ? 'right' : 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #EEEEEE', whiteSpace: 'nowrap', fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Yükleniyor…</td></tr>
              ) : page.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Kayıt bulunamadı</td></tr>
              ) : page.map((row, i) => {
                // JSON mahalle key'i: "ADAKÖY MAHALLESİ MUHTARI" veya "ADAKÖY MAHALLESİ"
                const fotoSrc = fotolar[row.mahalle]
                  || fotolar[`${row.mahalle} MUHTARI`]
                  || fotolar[`${row.mahalle} MUHTARLIĞI`]
                  || null;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                    onClick={() => navigate(`/mahalle/${encodeURIComponent(row.ilce)}/${encodeURIComponent(row.mahalle)}`)}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '8px 12px 8px 16px' }} onClick={e => e.stopPropagation()}>
                      {fotoSrc ? (
                        <FotoCell ilce={row.ilce} mahalle={row.mahalle} fotoUrl={fotoSrc}
                          onUploaded={url => setFotolar(prev => ({ ...prev, [row.mahalle]: url }))} />
                      ) : (
                        <FotoCell ilce={row.ilce} mahalle={row.mahalle} fotoUrl={null}
                          onUploaded={url => setFotolar(prev => ({ ...prev, [row.mahalle]: url }))} />
                      )}
                    </td>
                    <td style={{ padding: '10px 16px', color: '#6b7280', whiteSpace: 'nowrap' }}>{row.ilce}</td>
                    <td style={{ padding: '10px 16px', fontWeight: 500, color: '#26af68' }}>{row.mahalle}</td>
                    <td style={{ padding: '10px 16px', color: '#212529' }}>{row.ad_soyad}</td>
                    <td style={{ padding: '10px 16px', color: '#374151', textAlign: 'right', whiteSpace: 'nowrap' }}>{row.nufus ? row.nufus.toLocaleString('tr') : '—'}</td>
                    <td style={{ padding: '10px 16px' }}>
                      {row.kirsal_merkez
                        ? <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: '#fef3c7', color: '#92400e' }}>Kırsal</span>
                        : <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: '#dbeafe', color: '#1d4ed8' }}>Kentsel</span>}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: '#374151', fontWeight: 600 }}>{row.toplamTalep > 0 ? row.toplamTalep.toLocaleString('tr') : '—'}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: '#22c55e', fontWeight: 600 }}>{row.tamamlanan > 0 ? row.tamamlanan.toLocaleString('tr') : '—'}</td>
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
              return <button key={p} onClick={() => setSayfa(p)} style={{ ...S.pageBtn, background: p === sayfa ? '#26af68' : '', color: p === sayfa ? '#fff' : '', borderColor: p === sayfa ? '#26af68' : '' }}>{p}</button>;
            })}
            <button onClick={() => setSayfa(p => Math.min(totalPages, p+1))} disabled={sayfa === totalPages} style={S.pageBtn}>Sonraki ›</button>
          </div>
        )}
      </div>
    </div>
  );
}
