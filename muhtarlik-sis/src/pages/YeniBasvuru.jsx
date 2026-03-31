import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken, muhtarlikApi } from '../lib/muhtarlik_api';

const today = () => new Date().toISOString().split('T')[0];
const EMPTY = () => ({ ilce: '', mahalle: '', konu: '', aciklama: '', daire: '', tur: 'İş Emri', tarih: today(), resmiYaziNo: '', koordinasyonDaireleri: [] });


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

const TUR_OPTIONS = [
  { value: 'İş Emri', icon: 'bi-file-earmark-check' },
  { value: 'Dilekçe', icon: 'bi-envelope' },
];

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function Dropzone({ file, onFile }) {
  const inputRef = useRef();
  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }

  if (file) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1.5px solid #43DC80', borderRadius: 10, background: '#f0fdf4' }}>
      <i className="bi bi-file-earmark" style={{ color: '#43DC80', fontSize: 18 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#1a2e23', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
        <div style={{ fontSize: 11, color: '#9aa8a0' }}>{formatFileSize(file.size)}</div>
      </div>
      <button type="button" onClick={() => onFile(null)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9aa8a0', fontSize: 18, lineHeight: 1, padding: 0 }}
        onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
        onMouseLeave={e => e.currentTarget.style.color = '#9aa8a0'}>
        ✕
      </button>
    </div>
  );

  return (
    <>
      <input ref={inputRef} type="file" accept=".pdf,image/*" style={{ display: 'none' }} onChange={e => onFile(e.target.files[0] || null)} />
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          border: '2px dashed #43DC80', borderRadius: 10, padding: 24,
          textAlign: 'center', cursor: 'pointer',
          background: dragOver ? '#dcfce7' : '#f0fdf4',
          transition: 'background 0.15s',
        }}>
        <i className="bi bi-paperclip" style={{ fontSize: 24, color: '#43DC80', display: 'block', marginBottom: 8 }} />
        <div style={{ fontSize: 13, color: '#6b7a74' }}>Dosya seç veya sürükle</div>
        <div style={{ fontSize: 11, color: '#9aa8a0', marginTop: 4 }}>PDF veya görsel (max 10MB)</div>
      </div>
    </>
  );
}

function KoordinasyonPicker({ daireler, secili, onChange }) {
  const [open, setOpen] = useState(false);
  const available = daireler.filter(d => !secili.includes(d));

  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7a74', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        Koordinasyon Daireleri <span style={{ color: '#9aa8a0', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opsiyonel)</span>
      </label>
      {/* Chip'ler */}
      {secili.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {secili.map(d => (
            <span key={d} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 12px', background: '#e8f9f0', border: '1px solid #43DC80', color: '#0d5c42', borderRadius: 20, fontSize: 12 }}>
              {d}
              <button type="button" onClick={() => onChange(secili.filter(x => x !== d))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#43DC80', fontSize: 14, lineHeight: 1, padding: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
                onMouseLeave={e => e.currentTarget.style.color = '#43DC80'}>
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      {/* + Daire Ekle */}
      <div style={{ position: 'relative' }}>
        <button type="button" onClick={() => setOpen(v => !v)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: '1.5px solid #43DC80', borderRadius: 8, background: 'transparent', color: '#43DC80', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <i className="bi bi-plus" /> Daire Ekle
        </button>
        {open && available.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#fff', border: '1px solid #e8ede9', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50, maxHeight: 220, overflowY: 'auto', minWidth: 260 }}>
            {available.map(d => (
              <button key={d} type="button"
                onClick={() => { onChange([...secili, d]); setOpen(false); }}
                style={{ width: '100%', padding: '9px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#374740' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                {d}
              </button>
            ))}
          </div>
        )}
        {open && available.length === 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#fff', border: '1px solid #e8ede9', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#9aa8a0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
            Tüm daireler eklendi
          </div>
        )}
      </div>
    </div>
  );
}

export default function YeniBasvuru() {
  const navigate = useNavigate();
  const [filtreler,  setFiltreler]  = useState({ ilceler: [], daireler: [] });
  const [mahalleler, setMahalleler] = useState([]);
  const [form,    setForm]    = useState(EMPTY());
  const [ekDosya, setEkDosya] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);
  const [konular,    setKonular]    = useState([]);
  const [konuOneri,  setKonuOneri]  = useState([]);
  const [konuAcik,   setKonuAcik]   = useState(false);

  useEffect(() => { muhtarlikApi.getFiltreler().then(d => setFiltreler(d)).catch(() => {}); }, []);

  useEffect(() => {
    fetch('/api/muhtarbis/konular', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json()).then(d => setKonular(d.konular || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.ilce) { setMahalleler([]); return; }
    muhtarlikApi.getFiltreler(form.ilce).then(d => setMahalleler(d.mahalleler || [])).catch(() => {});
  }, [form.ilce]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function handleKonuChange(val) {
    set('konu', val);
    if (val.length >= 2) {
      const filtered = konular.filter(k => k.toLowerCase().includes(val.toLowerCase())).slice(0, 8);
      setKonuOneri(filtered);
      setKonuAcik(filtered.length > 0);
    } else {
      setKonuAcik(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.ilce || !form.mahalle || !form.konu.trim()) { setError('İlçe, mahalle ve konu zorunludur.'); return; }
    setError(''); setLoading(true);
    try {
      if (ekDosya) {
        // multipart/form-data
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => {
          if (Array.isArray(v)) fd.append(k, JSON.stringify(v));
          else fd.append(k, v);
        });
        fd.append('ekDosya', ekDosya);
        const res = await fetch('/api/muhtarbis/basvuru', {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
          body: fd,
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Hata');
      } else {
        await muhtarlikApi.createBasvuru(form);
      }
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
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a2e23', marginBottom: 8 }}>Başvuru Kaydedildi</h2>
        <p style={{ color: '#6b7a74', fontSize: 14, marginBottom: 32 }}>Başvuru başarıyla sisteme kaydedildi.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={() => navigate('/')}
            style={{ padding: '10px 24px', borderRadius: 10, border: '1.5px solid #dde5e0', background: '#fff', cursor: 'pointer', fontSize: 14, color: '#6b7a74' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
            Listeye Dön
          </button>
          <button onClick={() => { setSuccess(false); setForm(EMPTY()); setEkDosya(null); }}
            style={{ padding: '10px 28px', borderRadius: 10, border: 'none', background: '#43DC80', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#fff', boxShadow: '0 4px 12px rgba(67,220,128,0.35)' }}
            onMouseEnter={e => e.currentTarget.style.background = '#2bc96a'}
            onMouseLeave={e => e.currentTarget.style.background = '#43DC80'}>
            Yeni Başvuru
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
          <i className="bi bi-plus-circle" />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a2e23', margin: 0 }}>Yeni Muhtar Başvurusu</h1>
          <p style={{ fontSize: 12, color: '#6b7a74', margin: 0 }}>Muhtarbis sistemine yeni başvuru kaydı</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 24 }}>

          {/* SOL KART */}
          <div style={cardStyle}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#43DC80', letterSpacing: '0.1em', textTransform: 'uppercase', borderBottom: '1px solid #e8ede9', paddingBottom: 10, marginBottom: 20 }}>
              Başvuru Bilgileri
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <Field label="İlçe" required>
                <FocusInput as="select" value={form.ilce} onChange={e => { set('ilce', e.target.value); set('mahalle', ''); }}>
                  <option value="">Seçiniz…</option>
                  {filtreler.ilceler.map(v => <option key={v} value={v}>{v}</option>)}
                </FocusInput>
              </Field>
              <Field label="Mahalle" required>
                <FocusInput as="select" value={form.mahalle} onChange={e => set('mahalle', e.target.value)} disabled={!form.ilce}>
                  <option value="">Seçiniz…</option>
                  {mahalleler.map(v => <option key={v} value={v}>{v}</option>)}
                </FocusInput>
              </Field>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Field label="Konu" required>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={form.konu}
                    onChange={e => handleKonuChange(e.target.value)}
                    onFocus={e => {
                      e.target.style.borderColor = '#43DC80';
                      e.target.style.boxShadow = '0 0 0 3px rgba(67,220,128,0.12)';
                      if (form.konu.length >= 2) setKonuAcik(true);
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = '#dde5e0';
                      e.target.style.boxShadow = 'none';
                      setTimeout(() => setKonuAcik(false), 150);
                    }}
                    placeholder="Başvuru konusu…"
                    required
                    style={{ ...inputStyle }}
                  />
                  {konuAcik && konuOneri.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0,
                      background: '#ffffff', border: '1.5px solid #43DC80',
                      borderTop: 'none', borderRadius: '0 0 10px 10px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                      zIndex: 100, maxHeight: 280, overflowY: 'auto',
                    }}>
                      {konuOneri.map((oneri, i) => {
                        const idx    = oneri.toLowerCase().indexOf(form.konu.toLowerCase());
                        const before = oneri.slice(0, idx);
                        const match  = oneri.slice(idx, idx + form.konu.length);
                        const after  = oneri.slice(idx + form.konu.length);
                        return (
                          <div key={i}
                            onMouseDown={() => { set('konu', oneri); setKonuAcik(false); }}
                            style={{
                              padding: '10px 14px', fontSize: 13, cursor: 'pointer',
                              borderBottom: i < konuOneri.length - 1 ? '1px solid #f0f4f0' : 'none',
                              color: '#374740',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            {before}<strong style={{ color: '#0d5c42' }}>{match}</strong>{after}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Field>
            </div>
            <div>
              <Field label="Açıklama / Talep">
                <FocusInput as="textarea" value={form.aciklama} onChange={e => set('aciklama', e.target.value)} placeholder="Ayrıntılı açıklama…" rows={7} style={{ resize: 'vertical' }} />
              </Field>
            </div>
          </div>

          {/* SAĞ KART */}
          <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#43DC80', letterSpacing: '0.1em', textTransform: 'uppercase', borderBottom: '1px solid #e8ede9', paddingBottom: 10 }}>
              Detaylar
            </div>

            <Field label="Daire Başkanlığı">
              <FocusInput as="select" value={form.daire} onChange={e => set('daire', e.target.value)}>
                <option value="">Seçiniz…</option>
                {filtreler.daireler.map(v => <option key={v} value={v}>{v}</option>)}
              </FocusInput>
            </Field>

            {/* Koordinasyon daireleri */}
            <KoordinasyonPicker
              daireler={filtreler.daireler}
              secili={form.koordinasyonDaireleri}
              onChange={v => set('koordinasyonDaireleri', v)}
            />

            {/* Başvuru Türü */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7a74', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Başvuru Türü
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {TUR_OPTIONS.map(({ value, icon }) => {
                  const active = form.tur === value;
                  return (
                    <div key={value} onClick={() => set('tur', value)}
                      style={{
                        border: `1.5px solid ${active ? '#43DC80' : '#dde5e0'}`,
                        borderRadius: 10, padding: '12px 16px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: active ? '#e8f9f0' : '#fafcfb',
                        color: active ? '#0d5c42' : '#6b7a74',
                        fontWeight: active ? 600 : 400,
                        fontSize: 14, transition: 'all 0.15s',
                      }}>
                      <i className={`bi ${icon}`} style={{ fontSize: 16 }} />
                      {value}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dilekçe ek alanları */}
            {form.tur === 'Dilekçe' && (
              <div style={{ background: '#f8faf9', border: '1px solid #e8ede9', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#43DC80', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Dilekçe Eki</div>
                <Field label="Resmi Yazı No">
                  <FocusInput type="text" value={form.resmiYaziNo} onChange={e => set('resmiYaziNo', e.target.value)} placeholder="örn. 2026/1234" />
                </Field>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7a74', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Dilekçe / Yazı Yükle <span style={{ color: '#9aa8a0', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opsiyonel)</span>
                  </label>
                  <Dropzone file={ekDosya} onFile={setEkDosya} />
                </div>
              </div>
            )}

            <Field label="Tarih">
              <FocusInput type="date" value={form.tarih} onChange={e => set('tarih', e.target.value)} />
            </Field>
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
