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
const DURUMLAR = ['İşlemde', 'Tamamlandı', 'Yanıt Bekleniyor'];

const S = {
  card:   { background: '#fff', borderRadius: 12, border: '1px solid #EEEEEE', padding: 24, marginBottom: 20 },
  label:  { display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' },
  input:  { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#212529', outline: 'none', background: '#fff', boxSizing: 'border-box' },
  select: { width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#212529', outline: 'none', background: '#fff', boxSizing: 'border-box', cursor: 'pointer' },
};

const EMPTY_FORM = () => ({ ilce: '', mahalle: '', aciklama: '', tahmini_bedel: '', daire: '', durum: 'İşlemde', tarih: today() });

export default function MuhtarlikYeniYatirim() {
  const navigate = useNavigate();
  // ilceler from yatirimlar, daireler from filtreler
  const [ilceler,    setIlceler]    = useState([]);
  const [daireler,   setDaireler]   = useState([]);
  const [mahalleler, setMahalleler] = useState([]);
  const [form,    setForm]    = useState(EMPTY_FORM());
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // ilceler: yatirimlar.json özeti
    authFetch('/api/muhtarbis/yatirimlar')
      .then(d => setIlceler(Object.keys(d).sort((a, b) => a.localeCompare(b, 'tr'))))
      .catch(() => {});
    // daireler: MSSQL filtreler
    authFetch('/api/muhtarbis/filtreler')
      .then(d => setDaireler(d.daireler || []))
      .catch(() => {});
  }, []);

  // İlçe değişince mahalleler yükle (yatirimlar.json'dan)
  useEffect(() => {
    if (!form.ilce) { setMahalleler([]); return; }
    authFetch(`/api/muhtarbis/yatirimlar?ilce=${encodeURIComponent(form.ilce)}`)
      .then(d => setMahalleler(Object.keys(d).sort((a, b) => a.localeCompare(b, 'tr'))))
      .catch(() => {});
  }, [form.ilce]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.ilce || !form.mahalle || !form.aciklama.trim()) {
      setError('İlçe, mahalle ve açıklama zorunludur.'); return;
    }
    setError(''); setLoading(true);
    try {
      await authFetch('/api/muhtarbis/yatirim', { method: 'POST', body: JSON.stringify(form) });
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
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#212529', marginBottom: 8 }}>Yatırım Kaydedildi</h2>
          <p style={{ color: '#7e7e7e', fontSize: 14, marginBottom: 28 }}>
            Yatırım başarıyla sisteme kaydedildi.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => navigate('/muhtarlik')}
              style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 14, color: '#374151' }}>
              Listeye Dön
            </button>
            <button onClick={() => { setSuccess(false); setForm(EMPTY_FORM()); }}
              style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#26af68', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#fff' }}>
              Yeni Yatırım
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
          <i className="bi bi-graph-up-arrow" />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#212529', margin: 0 }}>Yeni Yatırım Kaydı</h1>
          <p style={{ fontSize: 12, color: '#7e7e7e', margin: 0 }}>Yatırım takip listesine yeni kayıt ekle</p>
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
                {ilceler.map(v => <option key={v} value={v}>{v}</option>)}
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

          {/* Açıklama */}
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Açıklama *</label>
            <textarea value={form.aciklama} onChange={e => set('aciklama', e.target.value)}
              placeholder="Yatırım açıklaması…" rows={4}
              style={{ ...S.input, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          {/* Tahmini Bedel + Daire + Durum + Tarih */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr', gap: 16 }}>
            <div>
              <label style={S.label}>Tahmini Bedel</label>
              <input type="text" value={form.tahmini_bedel} onChange={e => set('tahmini_bedel', e.target.value)}
                placeholder="ör: 1.200.000 ₺" style={S.input} />
            </div>
            <div>
              <label style={S.label}>Daire</label>
              <select value={form.daire} onChange={e => set('daire', e.target.value)} style={S.select}>
                <option value="">Seçiniz…</option>
                {daireler.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Durum</label>
              <select value={form.durum} onChange={e => set('durum', e.target.value)} style={S.select}>
                {DURUMLAR.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
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
