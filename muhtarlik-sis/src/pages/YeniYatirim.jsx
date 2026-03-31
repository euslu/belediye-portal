import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { muhtarlikApi } from '../lib/muhtarlik_api';

const today = () => new Date().toISOString().split('T')[0];
const EMPTY = () => ({ ilce: '', mahalle: '', aciklama: '', tahmini_bedel: '', daire: '', durum: 'İşlemde', tarih: today() });

const inputStyle = {
  width: '100%', padding: '11px 14px', fontSize: 14,
  border: '1.5px solid #dde5e0', borderRadius: 10,
  background: '#fafcfb', color: '#1a2e23',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  boxSizing: 'border-box', outline: 'none',
  fontFamily: 'inherit',
};

function Field({ label, required, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7a74', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        {label}{required && <span style={{ color: '#dc2626', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function FocusInput({ as: Tag = 'input', ...props }) {
  return (
    <Tag
      {...props}
      style={{ ...inputStyle, ...props.style }}
      onFocus={e => { e.target.style.borderColor = '#43DC80'; e.target.style.boxShadow = '0 0 0 3px rgba(67,220,128,0.12)'; }}
      onBlur={e => { e.target.style.borderColor = '#dde5e0'; e.target.style.boxShadow = 'none'; }}
    />
  );
}

const DURUM_OPTIONS = [
  { value: 'Tamamlandı',       icon: 'bi-check-circle',    activeBg: '#e8f9f0', activeBorder: '#43DC80', activeColor: '#0d5c42' },
  { value: 'İşlemde',          icon: 'bi-arrow-repeat',    activeBg: '#eff6ff', activeBorder: '#3b82f6', activeColor: '#1d4ed8' },
  { value: 'Reddedildi',       icon: 'bi-x-circle',        activeBg: '#fef2f2', activeBorder: '#ef4444', activeColor: '#dc2626' },
  { value: 'Yanıt Bekleniyor', icon: 'bi-hourglass-split', activeBg: '#fefce8', activeBorder: '#f59e0b', activeColor: '#92400e' },
];

export default function YeniYatirim() {
  const navigate = useNavigate();
  const [ilceler,    setIlceler]    = useState([]);
  const [mahalleler, setMahalleler] = useState([]);
  const [daireler,   setDaireler]   = useState([]);
  const [form,       setForm]       = useState(EMPTY());
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState(false);

  useEffect(() => {
    muhtarlikApi.getYatirimlarOzet()
      .then(data => setIlceler(Object.keys(data).sort((a, b) => a.localeCompare(b, 'tr'))))
      .catch(() => {});
    muhtarlikApi.getFiltreler()
      .then(d => setDaireler(d.daireler || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.ilce) { setMahalleler([]); return; }
    muhtarlikApi.getYatirimlarIlce(form.ilce)
      .then(data => setMahalleler(Object.keys(data).sort((a, b) => a.localeCompare(b, 'tr'))))
      .catch(() => {});
  }, [form.ilce]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.ilce || !form.mahalle || !form.aciklama.trim()) { setError('İlçe, mahalle ve açıklama zorunludur.'); return; }
    setError(''); setLoading(true);
    try {
      await muhtarlikApi.createYatirim(form);
      setSuccess(true);
    } catch (err) { setError(err.message || 'Bir hata oluştu.'); }
    finally { setLoading(false); }
  }

  const cardStyle = {
    background: '#ffffff', border: '2px solid #43DC80',
    borderRadius: 16, padding: '32px 36px',
    boxShadow: '0 4px 24px rgba(67,220,128,0.08)',
  };

  if (success) return (
    <div style={{ padding: '32px 40px', maxWidth: 1100 }}>
      <div style={{ ...cardStyle, textAlign: 'center', padding: '56px 32px' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#e8f9f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 20px' }}>✅</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a2e23', marginBottom: 8 }}>Yatırım Kaydedildi</h2>
        <p style={{ color: '#6b7a74', fontSize: 14, marginBottom: 32 }}>Yatırım bilgisi başarıyla sisteme kaydedildi.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={() => navigate('/')}
            style={{ padding: '10px 24px', borderRadius: 10, border: '1.5px solid #dde5e0', background: '#fff', cursor: 'pointer', fontSize: 14, color: '#6b7a74' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
            Listeye Dön
          </button>
          <button onClick={() => { setSuccess(false); setForm(EMPTY()); }}
            style={{ padding: '10px 28px', borderRadius: 10, border: 'none', background: '#43DC80', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#fff', boxShadow: '0 4px 12px rgba(67,220,128,0.35)' }}
            onMouseEnter={e => e.currentTarget.style.background = '#2bc96a'}
            onMouseLeave={e => e.currentTarget.style.background = '#43DC80'}>
            Yeni Yatırım
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100 }}>
      {/* Başlık */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(67,220,128,0.12)', color: '#43DC80', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
          <i className="bi bi-graph-up-arrow" />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a2e23', margin: 0 }}>Yeni Yatırım Kaydı</h1>
          <p style={{ fontSize: 12, color: '#6b7a74', margin: 0 }}>Muhtarbis sistemine yeni yatırım girişi</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 24 }}>

          {/* SOL KART */}
          <div style={cardStyle}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#43DC80', letterSpacing: '0.1em', textTransform: 'uppercase', borderBottom: '1px solid #e8ede9', paddingBottom: 10, marginBottom: 20 }}>
              Yatırım Bilgileri
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <Field label="İlçe" required>
                <FocusInput as="select" value={form.ilce} onChange={e => { set('ilce', e.target.value); set('mahalle', ''); }}>
                  <option value="">Seçiniz…</option>
                  {ilceler.map(v => <option key={v} value={v}>{v}</option>)}
                </FocusInput>
              </Field>
              <Field label="Mahalle" required>
                <FocusInput as="select" value={form.mahalle} onChange={e => set('mahalle', e.target.value)} disabled={!form.ilce}>
                  <option value="">Seçiniz…</option>
                  {mahalleler.map(v => <option key={v} value={v}>{v}</option>)}
                </FocusInput>
              </Field>
            </div>
            <div>
              <Field label="Açıklama" required>
                <FocusInput as="textarea" value={form.aciklama} onChange={e => set('aciklama', e.target.value)} placeholder="Yatırım açıklaması…" rows={7} style={{ resize: 'vertical' }} />
              </Field>
            </div>
          </div>

          {/* SAĞ KART */}
          <div style={cardStyle}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#43DC80', letterSpacing: '0.1em', textTransform: 'uppercase', borderBottom: '1px solid #e8ede9', paddingBottom: 10, marginBottom: 20 }}>
              Detaylar
            </div>

            <div style={{ marginBottom: 20 }}>
              <Field label="Tahmini Bedel">
                <FocusInput type="text" value={form.tahmini_bedel} onChange={e => set('tahmini_bedel', e.target.value)} placeholder="ör: 1.200.000 ₺" />
              </Field>
            </div>

            <div style={{ marginBottom: 20 }}>
              <Field label="Daire Başkanlığı">
                <FocusInput as="select" value={form.daire} onChange={e => set('daire', e.target.value)}>
                  <option value="">Seçiniz…</option>
                  {daireler.map(v => <option key={v} value={v}>{v}</option>)}
                </FocusInput>
              </Field>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7a74', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Durum
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {DURUM_OPTIONS.map(({ value, icon, activeBg, activeBorder, activeColor }) => {
                  const active = form.durum === value;
                  return (
                    <div key={value} onClick={() => set('durum', value)}
                      style={{
                        border: `1.5px solid ${active ? activeBorder : '#dde5e0'}`,
                        borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: active ? activeBg : '#fafcfb',
                        color: active ? activeColor : '#6b7a74',
                        fontWeight: active ? 600 : 400,
                        fontSize: 13, transition: 'all 0.15s',
                      }}>
                      <i className={`bi ${icon}`} style={{ fontSize: 15 }} />
                      {value}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <Field label="Tarih">
                <FocusInput type="date" value={form.tarih} onChange={e => set('tarih', e.target.value)} />
              </Field>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginTop: 16, color: '#dc2626', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
          <button type="button" onClick={() => navigate('/')}
            style={{ padding: '10px 24px', borderRadius: 10, border: '1.5px solid #dde5e0', background: '#fff', cursor: 'pointer', fontSize: 14, color: '#6b7a74', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
            İptal
          </button>
          <button type="submit" disabled={loading}
            style={{ padding: '10px 28px', borderRadius: 10, border: 'none', background: loading ? '#a8e6c6' : '#43DC80', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, color: '#fff', boxShadow: loading ? 'none' : '0 4px 12px rgba(67,220,128,0.35)', transition: 'background 0.15s' }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#2bc96a'; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#43DC80'; }}>
            {loading ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
}
