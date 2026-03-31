import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken, muhtarlikApi } from '../lib/muhtarlik_api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

function authFetch(url, opts = {}) {
  return fetch(url, { ...opts, headers: { Authorization: `Bearer ${getToken()}`, ...opts.headers } });
}

const DURUM_STYLE = {
  'Tamamlandı':       { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0' },
  'İşlemde':          { bg: '#dbeafe', color: '#2563eb', border: '#bfdbfe' },
  'Reddedildi':       { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
  'Yanıtlandı':       { bg: '#f3e8ff', color: '#9333ea', border: '#e9d5ff' },
  'Yanıt Bekleniyor': { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },
};
function durumStyle(d) { return DURUM_STYLE[d] || { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' }; }

const YATIRIM_DURUMLAR = ['Tamamlandı', 'İşlemde', 'Reddedildi', 'Yanıtlandı', 'Yanıt Bekleniyor'];

const S = {
  label:        { display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' },
  input:        { width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#212529', outline: 'none', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit' },
  pageBtn:      { padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 13 },
  btnPrimary:   { padding: '8px 20px', background: '#43DC80', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  btnSecondary: { padding: '8px 20px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 },
};

function StatCard({ label, value, color, icon, loading }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #EEEEEE', borderTop: `4px solid ${color}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: 12, color: '#7e7e7e', marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#212529', lineHeight: 1 }}>
          {loading ? '…' : (value ?? '—')}
        </div>
      </div>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: color + '18', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
        {icon}
      </div>
    </div>
  );
}

function YatirimEditModal({ row, onClose, onSaved }) {
  const [form, setForm] = useState({
    aciklama: row.aciklama || '', tahmini_bedel: row.tahmini_bedel || '',
    daire: row.daire || '', durum: row.durum || '', cevap: row.cevap || '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  function setF(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSave() {
    setSaving(true); setError('');
    try {
      await muhtarlikApi.updateYatirim(row.ilce, row.mahalle, row.index, form);
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
            <div style={{ fontSize: 12, color: '#7e7e7e', marginTop: 2 }}>{row.ilce} / {row.mahalle} — {row.tarih || '—'}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#9ca3af' }}>×</button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={S.label}>Açıklama</label>
            <textarea value={form.aciklama} onChange={e => setF('aciklama', e.target.value)} rows={4} style={{ ...S.input, resize: 'vertical' }} />
          </div>
          <div>
            <label style={S.label}>Tahmini Bedel</label>
            <input value={form.tahmini_bedel} onChange={e => setF('tahmini_bedel', e.target.value)} placeholder="ör: 1.200.000 ₺" style={S.input} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={S.label}>Daire</label>
              <input value={form.daire} onChange={e => setF('daire', e.target.value)} style={S.input} />
            </div>
            <div>
              <label style={S.label}>Durum</label>
              <select value={form.durum} onChange={e => setF('durum', e.target.value)} style={S.input}>
                <option value="">— Seçiniz —</option>
                {YATIRIM_DURUMLAR.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={S.label}>Cevap Notu</label>
            <textarea value={form.cevap} onChange={e => setF('cevap', e.target.value)} rows={3} style={{ ...S.input, resize: 'vertical' }} />
          </div>
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

export default function YatirimlarPage() {
  const navigate  = useNavigate();
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [ilceler, setIlceler] = useState([]);
  const [ilce,    setIlce]    = useState('');
  const [durum,   setDurum]   = useState('');
  const [arama,   setArama]   = useState('');
  const [sayfa,   setSayfa]   = useState(1);
  const [editRow, setEditRow] = useState(null);
  const LIMIT = 50;

  function loadRows() {
    setLoading(true);
    authFetch('/api/muhtarbis/yatirimlar/liste?limit=9999')
      .then(r => r.ok ? r.json() : { rows: [] })
      .then(data => {
        const all = data.rows || [];
        setRows(all);
        setIlceler([...new Set(all.map(r => r.ilce))].sort((a, b) => a.localeCompare(b, 'tr')));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadRows(); }, []);

  const filtered = useMemo(() => {
    const al = arama.toLocaleLowerCase('tr');
    return rows.filter(r =>
      (!ilce  || r.ilce  === ilce) &&
      (!durum || r.durum === durum) &&
      (!arama || r.aciklama.toLocaleLowerCase('tr').includes(al) || r.mahalle.toLocaleLowerCase('tr').includes(al))
    );
  }, [rows, ilce, durum, arama]);

  const ilceOzet = useMemo(() => {
    const map = {};
    rows.forEach(r => {
      if (!map[r.ilce]) map[r.ilce] = { ilce: r.ilce, toplam: 0, tamamlandi: 0 };
      map[r.ilce].toplam++;
      if (r.durum === 'Tamamlandı') map[r.ilce].tamamlandi++;
    });
    return Object.values(map).sort((a, b) => b.toplam - a.toplam).slice(0, 12);
  }, [rows]);

  const totalPages = Math.ceil(filtered.length / LIMIT);
  const page = filtered.slice((sayfa - 1) * LIMIT, sayfa * LIMIT);

  const toplamYatirim = rows.length;
  const tamamlandi    = rows.filter(r => r.durum === 'Tamamlandı').length;
  const devamEdiyor   = rows.filter(r => r.durum === 'İşlemde').length;
  const diger         = rows.filter(r => r.durum && r.durum !== 'Tamamlandı' && r.durum !== 'İşlemde').length;

  const durumlar = [...new Set(rows.map(r => r.durum).filter(Boolean))].sort();

  function setFilter(fn) { fn(); setSayfa(1); }

  return (
    <div style={{ padding: '32px 40px' }}>
      {/* Başlık */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(38,175,104,0.12)', color: '#26af68', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
          <i className="bi bi-list-ul" />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#212529', margin: 0 }}>Tüm Yatırımlar</h1>
          <p style={{ fontSize: 12, color: '#7e7e7e', margin: 0 }}>
            {loading ? 'Yükleniyor…' : `${rows.length.toLocaleString('tr')} yatırım kaydı`}
          </p>
        </div>
      </div>

      {/* Stat kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Toplam Yatırım" value={toplamYatirim.toLocaleString('tr')} color="#43DC80" icon="🏗️" loading={loading} />
        <StatCard label="Tamamlandı"     value={tamamlandi.toLocaleString('tr')}    color="#22c55e" icon="✅" loading={loading} />
        <StatCard label="İşlemde"        value={devamEdiyor.toLocaleString('tr')}   color="#3b82f6" icon="🔄" loading={loading} />
        <StatCard label="Diğer"          value={diger.toLocaleString('tr')}         color="#f59e0b" icon="⏳" loading={loading} />
      </div>

      {/* Filtreler */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EEEEEE', padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
          <div>
            <label style={S.label}>Arama</label>
            <input type="text" placeholder="Açıklama veya mahalle…" value={arama}
              onChange={e => setFilter(() => setArama(e.target.value))} style={S.input} />
          </div>
          <div>
            <label style={S.label}>İlçe</label>
            <select value={ilce} onChange={e => setFilter(() => setIlce(e.target.value))} style={S.input}>
              <option value="">Tüm İlçeler</option>
              {ilceler.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Durum</label>
            <select value={durum} onChange={e => setFilter(() => setDurum(e.target.value))} style={S.input}>
              <option value="">Tüm Durumlar</option>
              {durumlar.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Tablo */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EEEEEE', overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #EEEEEE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#212529' }}>
            {loading ? 'Yükleniyor…' : `${filtered.length.toLocaleString('tr')} kayıt`}
          </span>
          <span style={{ fontSize: 12, color: '#7e7e7e' }}>Sayfa {sayfa} / {totalPages || 1}</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9f9f9' }}>
                {['Tarih', 'İlçe', 'Mahalle', 'Açıklama', 'Tahmini Bedel', 'Daire', 'Durum', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #EEEEEE', whiteSpace: 'nowrap', fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Yükleniyor…</td></tr>
                : page.length === 0
                  ? <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Kayıt bulunamadı</td></tr>
                  : page.map((row, i) => {
                    const ds = durumStyle(row.durum);
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fffe'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <td style={{ padding: '10px 16px', color: '#6b7280', whiteSpace: 'nowrap' }}>{row.tarih || '—'}</td>
                        <td style={{ padding: '10px 16px', color: '#6b7280', whiteSpace: 'nowrap' }}>{row.ilce}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <button
                            onClick={() => navigate(`/mahalle/${encodeURIComponent(row.ilce)}/${encodeURIComponent(row.mahalle)}`)}
                            style={{ fontWeight: 500, color: '#26af68', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13 }}>
                            {row.mahalle}
                          </button>
                        </td>
                        <td style={{ padding: '10px 16px', color: '#212529', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.aciklama || '—'}</td>
                        <td style={{ padding: '10px 16px', color: '#374151', whiteSpace: 'nowrap' }}>{row.tahmini_bedel || '—'}</td>
                        <td style={{ padding: '10px 16px', color: '#6b7280', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.daire || '—'}</td>
                        <td style={{ padding: '10px 16px' }}>
                          {row.durum
                            ? <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: ds.bg, color: ds.color, border: `1px solid ${ds.border}` }}>{row.durum}</span>
                            : <span style={{ color: '#9ca3af' }}>—</span>}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <button onClick={() => setEditRow(row)} title="Düzenle"
                            style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#6b7280' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#43DC80'; e.currentTarget.style.color = '#43DC80'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#6b7280'; }}>
                            <i className="bi bi-pencil-square" style={{ fontSize: 13 }} />
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

      {/* İlçe bazlı grafik */}
      {ilceOzet.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EEEEEE', padding: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#212529', margin: '0 0 20px' }}>İlçe Bazlı Yatırım Dağılımı</h3>
          <ResponsiveContainer width="100%" height={Math.max(200, ilceOzet.length * 28)}>
            <BarChart data={ilceOzet} layout="vertical" margin={{ top: 0, right: 60, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#7e7e7e' }} allowDecimals={false} />
              <YAxis type="category" dataKey="ilce" width={90} tick={{ fontSize: 11, fill: '#212529' }} />
              <Tooltip formatter={(v, n) => [v.toLocaleString('tr'), n]} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="toplam"     name="Toplam"     fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={14} />
              <Bar dataKey="tamamlandi" name="Tamamlandı" fill="#43DC80" radius={[0, 4, 4, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 20, marginTop: 12, justifyContent: 'center' }}>
            {[['#3b82f6', 'Toplam'], ['#43DC80', 'Tamamlandı']].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#7e7e7e' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: 'inline-block' }} />
                {l}
              </div>
            ))}
          </div>
        </div>
      )}

      {editRow && (
        <YatirimEditModal
          row={editRow}
          onClose={() => setEditRow(null)}
          onSaved={() => { setEditRow(null); loadRows(); }}
        />
      )}
    </div>
  );
}
