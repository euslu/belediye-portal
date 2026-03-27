import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTicket, uploadAttachments } from '../api/tickets';

// ─── Veri yapısı ──────────────────────────────────────────────────────────────
const DESTEK_DATA = {
  daire: 'Destek Hizmetleri Dairesi Başkanlığı',
  mudürlükler: [
    {
      id: 'bina-tesis',
      ad: 'Bina, Tesis Bakım Onarım ve İdari İşler Şube Müdürlüğü',
      icon: '🏗️',
      birimler: [
        {
          id: 'insaat',
          ad: 'İnşaat',
          kategoriler: [
            'Alüminyum - PVC Kapı Arızası',
            'Alüminyum - PVC Pencere Arızası',
            'Diğer',
          ],
        },
        {
          id: 'elektrik',
          ad: 'Elektrik',
          kategoriler: [
            'Genel Enerji Kesintisi',
            'Elektrik Arızası',
            'Aydınlatma Arızası',
            'Yangın Alarm Sistemi',
            'Otomatik Kapı Arızaları',
            'Acil Yönlendirme',
            'Jeneratör Sistem Arızaları',
            'Diğer',
          ],
        },
        {
          id: 'sihhi-tesisat',
          ad: 'Sıhhi Tesisat',
          kategoriler: [
            'Sıhhi Tesisat Arızası',
            'Hidrofor Sistemi Arızası',
            'Kalorifer Tesisatı Arızası',
            'Doğalgaz Sistemi Arızası',
            'Yangın Sistemi Arızası',
            'Havalandırma Sistemi Arızası',
            'Asansör Sistemi Arızası',
            'Yürüyen Merdiven Sistemi Arızası',
            'Hareketli Cephe Sistemi',
            'Klima Arızası',
            'Diğer',
          ],
        },
        {
          id: 'marangoz',
          ad: 'Marangozhane',
          kategoriler: [
            'Koltuk Arızası',
            'Ahşap Kapı Kilidi Arızası',
            'Çekmece Kilit Arızası',
            'Keson Tekerlek Değişimi',
            'Tablo / Pano Asılması',
            'Diğer',
          ],
        },
      ],
    },
    {
      id: 'ihale-satin-alma',
      ad: 'İhale, Satın Alma, Taşınır Mal ve Ambarlar Şube Müdürlüğü',
      icon: '📦',
      birimler: [
        {
          id: 'tasinir-mal',
          ad: 'Taşınır Mal ve Ambarlar',
          kategoriler: ['Eşya Taşıma İşleri'],
        },
        {
          id: 'satin-alma',
          ad: 'Satın Alma',
          kategoriler: ['Rutin Dışı Temizlik'],
        },
      ],
    },
  ],
};

// ─── Kart stili sabitleri ──────────────────────────────────────────────────────
const S = {
  card: {
    background: 'white',
    borderRadius: 12,
    padding: 20,
    border: '1px solid #EEEEEE',
    marginBottom: 12,
  },
  label: { fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 },
  input: {
    width: '100%', padding: '10px 14px',
    border: '1px solid #e2e8f0', borderRadius: 8,
    fontSize: 14, boxSizing: 'border-box', outline: 'none',
    fontFamily: 'inherit',
  },
};

// ─── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ step }) {
  const labels = ['Birim', 'Konu', 'Detay'];
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: step >= s ? '#26af68' : '#e2e8f0',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {labels.map((l, i) => (
          <span key={l} style={{ fontSize: 11, color: step >= i + 1 ? '#26af68' : '#aaa', fontWeight: step === i + 1 ? 600 : 400 }}>
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Geri butonu ──────────────────────────────────────────────────────────────
function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{
      background: 'none', border: 'none', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 6,
      color: '#7e7e7e', marginBottom: 16, fontSize: 14, padding: '4px 0',
    }}>
      <span style={{ fontSize: 16 }}>←</span> Geri
    </button>
  );
}

// ─── Seçim breadcrumb ─────────────────────────────────────────────────────────
function Breadcrumb({ mudurluk, birim, kategori }) {
  const parts = [birim?.ad, kategori].filter(Boolean);
  if (!parts.length) return null;
  return (
    <div style={{
      background: 'rgba(38,175,104,0.08)', borderRadius: 8,
      padding: '10px 14px', marginBottom: 20,
      fontSize: 13, color: '#26af68', fontWeight: 500,
      display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 15 }}>🔧</span>
      {parts.join(' › ')}
    </div>
  );
}

// ─── Başarı ekranı ────────────────────────────────────────────────────────────
function SuccessScreen({ ticketId, onNew }) {
  const navigate = useNavigate();
  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#212529', marginBottom: 8 }}>
        Talebiniz İletildi
      </h2>
      <p style={{ color: '#7e7e7e', fontSize: 14, marginBottom: 28 }}>
        Destek Hizmetleri ekibi en kısa sürede talebinizi değerlendirecektir.
        {ticketId && <><br /><strong style={{ color: '#26af68' }}>#{ticketId}</strong> numarasıyla takip edebilirsiniz.</>}
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button
          onClick={() => navigate('/my-tickets')}
          style={{
            padding: '10px 24px', borderRadius: 8, border: '1px solid #e2e8f0',
            background: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#374151',
          }}
        >
          Başvurularım
        </button>
        <button
          onClick={onNew}
          style={{
            padding: '10px 24px', borderRadius: 8, border: 'none',
            background: '#26af68', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'white',
          }}
        >
          Yeni Talep
        </button>
      </div>
    </div>
  );
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────
export default function DestekHizmetleriTicket() {
  const navigate = useNavigate();
  const [step, setStep]                     = useState(1);
  const [selectedMudurluk, setSelectedMudurluk] = useState(null);
  const [selectedBirim, setSelectedBirim]   = useState(null);
  const [selectedKategori, setSelectedKategori] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', location: '', priority: 'MEDIUM' });
  const [files, setFiles]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [done, setDone]     = useState(null); // { ticketId }

  function reset() {
    setStep(1); setSelectedMudurluk(null); setSelectedBirim(null);
    setSelectedKategori(null); setForm({ title: '', description: '', location: '', priority: 'MEDIUM' });
    setFiles([]); setError(''); setDone(null);
  }

  async function handleSubmit() {
    if (!form.title.trim()) { setError('Lütfen bir başlık girin.'); return; }
    setError('');
    setLoading(true);
    try {
      const descParts = [
        form.description.trim(),
        form.location.trim() ? `📍 Konum: ${form.location.trim()}` : null,
        `🏢 Müdürlük: ${selectedMudurluk?.ad}`,
        `🔧 Birim: ${selectedBirim?.ad}`,
        `📋 Kategori: ${selectedKategori}`,
      ].filter(Boolean);

      const ticket = await createTicket({
        title:       form.title.trim(),
        description: descParts.join('\n\n'),
        priority:    form.priority,
        type:        'INCIDENT',
        source:      'PORTAL',
      });

      if (files.length > 0) {
        await uploadAttachments(ticket.id, files).catch(() => {});
      }

      setDone({ ticketId: ticket.id });
    } catch (e) {
      setError(e.message || 'Talep gönderilemedi.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div style={{ padding: '32px 40px' }}>
        <SuccessScreen ticketId={done.ticketId} onNew={reset} />
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 40px' }}>

      {/* Sayfa başlığı */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'rgba(38,175,104,0.12)', color: '#26af68',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        }}>
          🔧
        </div>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#212529', margin: 0 }}>
            Destek Hizmetleri Talebi
          </h1>
          <p style={{ fontSize: 12, color: '#7e7e7e', margin: 0 }}>
            {DESTEK_DATA.daire}
          </p>
        </div>
      </div>

      <ProgressBar step={step} />

      {/* ── ADIM 1: Müdürlük & Birim ───────────────────────────────────────── */}
      {step === 1 && (
        <div>
          <p style={{ fontSize: 14, color: '#7e7e7e', marginBottom: 20, marginTop: 0 }}>
            Hangi birimle ilgili talebiniz var?
          </p>

          {DESTEK_DATA.mudürlükler.map(m => (
            <div key={m.id} style={S.card}>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#374151', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{m.icon}</span>
                {m.ad}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {m.birimler.map(b => (
                  <BirimButton
                    key={b.id}
                    label={b.ad}
                    onClick={() => {
                      setSelectedMudurluk(m);
                      setSelectedBirim(b);
                      setStep(2);
                    }}
                  />
                ))}
              </div>
            </div>
          ))}

          <button
            onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7e7e7e', fontSize: 13, marginTop: 8, padding: '4px 0' }}
          >
            ← Ana sayfaya dön
          </button>
        </div>
      )}

      {/* ── ADIM 2: Kategori ───────────────────────────────────────────────── */}
      {step === 2 && selectedBirim && (
        <div>
          <BackBtn onClick={() => { setStep(1); setSelectedBirim(null); setSelectedMudurluk(null); }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 20 }}>{selectedMudurluk?.icon}</span>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#212529', margin: 0 }}>
              {selectedBirim.ad}
            </h2>
          </div>
          <p style={{ fontSize: 14, color: '#7e7e7e', marginBottom: 20, marginLeft: 30 }}>
            Arıza konusunu seçin
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedBirim.kategoriler.map(k => (
              <button
                key={k}
                onClick={() => {
                  setSelectedKategori(k);
                  setForm(f => ({ ...f, title: k }));
                  setStep(3);
                }}
                style={{
                  padding: '13px 18px', borderRadius: 10,
                  border: '1px solid #e2e8f0', background: 'white',
                  cursor: 'pointer', textAlign: 'left', fontSize: 14,
                  color: '#374151', fontWeight: 500, fontFamily: 'inherit',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#26af68'; e.currentTarget.style.background = '#fafffe'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'white'; }}
              >
                <span>{k}</span>
                <span style={{ color: '#cbd5e1', fontSize: 16 }}>›</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── ADIM 3: Form ───────────────────────────────────────────────────── */}
      {step === 3 && (
        <div>
          <BackBtn onClick={() => { setStep(2); setSelectedKategori(null); }} />

          <Breadcrumb mudurluk={selectedMudurluk} birim={selectedBirim} kategori={selectedKategori} />

          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#212529', marginBottom: 20 }}>
            Talep Detayları
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Başlık */}
            <div>
              <label style={S.label}>Başlık</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                style={S.input}
                onFocus={e => e.target.style.borderColor = '#26af68'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            {/* Açıklama */}
            <div>
              <label style={S.label}>Açıklama <span style={{ color: '#aaa', fontWeight: 400 }}>(opsiyonel)</span></label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={4}
                placeholder="Arızayı veya talebinizi detaylı açıklayın..."
                style={{ ...S.input, resize: 'vertical' }}
                onFocus={e => e.target.style.borderColor = '#26af68'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            {/* Konum */}
            <div>
              <label style={S.label}>Konum / Kat <span style={{ color: '#aaa', fontWeight: 400 }}>(opsiyonel)</span></label>
              <input
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="Örn: B Blok 3. Kat, Toplantı Salonu..."
                style={S.input}
                onFocus={e => e.target.style.borderColor = '#26af68'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            {/* Öncelik */}
            <div>
              <label style={S.label}>Öncelik</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { val: 'MEDIUM', label: '📋 Normal', desc: 'İş saatleri içinde' },
                  { val: 'HIGH',   label: '🚨 Acil',   desc: 'İvedi müdahale gerekiyor' },
                ].map(p => (
                  <button
                    key={p.val}
                    onClick={() => setForm(f => ({ ...f, priority: p.val }))}
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                      fontSize: 13, fontWeight: 600, fontFamily: 'inherit', textAlign: 'left',
                      border: form.priority === p.val ? '2px solid #26af68' : '1px solid #e2e8f0',
                      background: form.priority === p.val ? 'rgba(38,175,104,0.06)' : 'white',
                      color: form.priority === p.val ? '#26af68' : '#374151',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div>{p.label}</div>
                    <div style={{ fontSize: 11, fontWeight: 400, color: form.priority === p.val ? '#16a34a' : '#aaa', marginTop: 2 }}>{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Dosya eki */}
            <div>
              <label style={S.label}>Dosya Ekle <span style={{ color: '#aaa', fontWeight: 400 }}>(opsiyonel)</span></label>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 8,
                border: '1px dashed #cbd5e1', cursor: 'pointer', fontSize: 13, color: '#7e7e7e',
                background: files.length > 0 ? 'rgba(38,175,104,0.04)' : 'white',
              }}>
                <span style={{ fontSize: 18 }}>📎</span>
                {files.length > 0
                  ? `${files.length} dosya seçildi`
                  : 'Dosya seçmek için tıklayın (PNG, JPG, PDF)'}
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  style={{ display: 'none' }}
                  onChange={e => setFiles(Array.from(e.target.files || []))}
                />
              </label>
              {files.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {files.map((f, i) => (
                    <span key={i} style={{
                      fontSize: 11, background: '#f0faf5', color: '#26af68',
                      borderRadius: 6, padding: '3px 8px',
                    }}>
                      {f.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div style={{ background: '#fff0f3', border: '1px solid #f82649', borderRadius: 8, padding: '10px 14px', marginTop: 16, fontSize: 13, color: '#f82649' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !form.title.trim()}
            style={{
              width: '100%', padding: '14px', marginTop: 24,
              background: loading || !form.title.trim() ? '#aaa' : '#26af68',
              color: 'white', border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 700, cursor: loading || !form.title.trim() ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', boxShadow: !form.title.trim() ? 'none' : '0 4px 14px rgba(38,175,104,0.3)',
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'Gönderiliyor...' : 'Talebi Gönder →'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Birim butonu ─────────────────────────────────────────────────────────────
function BirimButton({ label, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '8px 16px', borderRadius: 8, fontFamily: 'inherit',
        border: hover ? '1px solid #26af68' : '1px solid #e2e8f0',
        background: hover ? 'rgba(38,175,104,0.06)' : 'white',
        cursor: 'pointer', fontSize: 13, fontWeight: 500,
        color: hover ? '#26af68' : '#374151',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}
