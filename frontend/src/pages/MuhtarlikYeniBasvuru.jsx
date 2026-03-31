import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';
function authFetch(path, opts = {}) {
  return fetch(`${API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
      ...opts.headers,
    },
  }).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); });
}

const today = () => new Date().toISOString().split('T')[0];

const S = {
  card:   { background: '#fff', borderRadius: 12, border: '1px solid #EEEEEE', padding: 24, marginBottom: 20 },
  label:  { display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' },
  input:  { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#212529', outline: 'none', background: '#fff', boxSizing: 'border-box' },
  select: { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#212529', outline: 'none', background: '#fff', boxSizing: 'border-box', cursor: 'pointer' },
};

const EMPTY_FORM = () => ({ ilce: '', mahalle: '', konu: '', aciklama: '', daire: '', tur: 'İş Emri', tarih: today() });

export default function MuhtarlikYeniBasvuru() {
  const navigate = useNavigate();
  const [filtreler,  setFiltreler]  = useState({ ilceler: [], daireler: [], mahalleler: [] });
  const [mahalleler, setMahalleler] = useState([]);
  const [form,    setForm]    = useState(EMPTY_FORM());
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    authFetch('/api/muhtarbis/filtreler')
      .then(d => setFiltreler(d))
      .catch(() => {});
  }, []);

  // İlçe değişince mahalle listesini güncelle
  useEffect(() => {
    if (!form.ilce) { setMahalleler([]); return; }
    authFetch(`/api/muhtarbis/filtreler?ilce=${encodeURIComponent(form.ilce)}`)
      .then(d => setMahalleler(d.mahalleler || []))
      .catch(() => {});
  }, [form.ilce]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.ilce || !form.mahalle || !form.konu.trim()) {
      setError('İlçe, mahalle ve konu zorunludur.'); return;
    }
    setError(''); setLoading(true);
    try {
      await authFetch('/api/muhtarbis/basvuru', { method: 'POST', body: JSON.stringify(form) });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={{ padding: '32px 40px' }}>
        <div style={{ ...S.card, textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#212529', marginBottom: 8 }}>Başvuru Kaydedildi</h2>
          <p style={{ color: '#7e7e7e', fontSize: 14, marginBottom: 28 }}>
            Başvuru başarıyla Muhtarbis sistemine kaydedildi.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => navigate('/muhtarlik')}
              style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 14, color: '#374151' }}>
              Listeye Dön
            </button>
            <button onClick={() => { setSuccess(false); setForm(EMPTY_FORM()); }}
              style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#26af68', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#fff' }}>
              Yeni Başvuru
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 40px' }}>
      {/* Başlık */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(38,175,104,0.12)', color: '#26af68', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
          <i className="bi bi-plus-circle" />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#212529', margin: 0 }}>Yeni Muhtar Başvurusu</h1>
          <p style={{ fontSize: 12, color: '#7e7e7e', margin: 0 }}>Muhtarbis sistemine yeni başvuru kaydı</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={S.card}>
          {/* İlçe + Mahalle */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={S.label}>İlçe *</label>
              <select value={form.ilce} onChange={e => { set('ilce', e.target.value); set('mahalle', ''); }} style={S.select}>
                <option value="">Seçiniz…</option>
                {filtreler.ilceler.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Mahalle *</label>
              <select value={form.mahalle} onChange={e => set('mahalle', e.target.value)} style={S.select} disabled={!form.ilce}>
                <option value="">Seçiniz…</option>
                {mahalleler.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          {/* Konu */}
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Konu *</label>
            <input type="text" value={form.konu} onChange={e => set('konu', e.target.value)}
              placeholder="Başvuru konusu…" style={S.input} />
          </div>

          {/* Açıklama */}
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Açıklama / Talep</label>
            <textarea value={form.aciklama} onChange={e => set('aciklama', e.target.value)}
              placeholder="Ayrıntılı açıklama…" rows={4}
              style={{ ...S.input, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          {/* Daire + Tür + Tarih */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
            <div>
              <label style={S.label}>Daire</label>
              <select value={form.daire} onChange={e => set('daire', e.target.value)} style={S.select}>
                <option value="">Seçiniz…</option>
                {filtreler.daireler.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Tür</label>
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                {['İş Emri', 'Dilekçe'].map(t => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                    <input type="radio" name="tur" value={t} checked={form.tur === t} onChange={() => set('tur', t)} />
                    {t}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={S.label}>Tarih</label>
              <input type="date" value={form.tarih} onChange={e => set('tarih', e.target.value)} style={S.input} />
            </div>
          </div>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#dc2626', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => navigate('/muhtarlik')}
            style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 14, color: '#374151' }}>
            İptal
          </button>
          <button type="submit" disabled={loading}
            style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: loading ? '#9ca3af' : '#26af68', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, color: '#fff' }}>
            {loading ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
}
