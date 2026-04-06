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

// ─── Birim ikon haritası ───────────────────────────────────────────────────────
const BIRIM_ICONS = {
  'insaat':        { icon: 'bi-building-gear',         color: '#f97316', bg: '#fff7ed' },
  'elektrik':      { icon: 'bi-lightning-charge-fill', color: '#f59e0b', bg: '#fffbeb' },
  'sihhi-tesisat': { icon: 'bi-droplet-half',          color: '#3b82f6', bg: '#eff6ff' },
  'marangoz':      { icon: 'bi-tools',                 color: '#78716c', bg: '#f5f5f4' },
  'tasinir-mal':   { icon: 'bi-cart-check',            color: '#16a34a', bg: '#f0fdf4' },
  'satin-alma':    { icon: 'bi-bag-check',             color: '#16a34a', bg: '#f0fdf4' },
};
const DEFAULT_BIRIM_ICON = { icon: 'bi-tools', color: '#6b7280', bg: '#f9fafb' };

// ─── Adım göstergesi ──────────────────────────────────────────────────────────
function StepIndicator({ step }) {
  const steps = [
    { n: 1, label: 'Birim' },
    { n: 2, label: 'Konu' },
    { n: 3, label: 'Detay & Form' },
  ];
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            step >= s.n
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-400'
          }`}>
            <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px] font-bold flex-shrink-0">
              {step > s.n ? '✓' : s.n}
            </span>
            {s.label}
          </div>
          {i < steps.length - 1 && (
            <div className={`w-8 h-0.5 ${step > s.n ? 'bg-green-300' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Birim kartı ──────────────────────────────────────────────────────────────
function BirimKart({ birim, onClick }) {
  const [hover, setHover] = useState(false);
  const iconInfo = BIRIM_ICONS[birim.id] || DEFAULT_BIRIM_ICON;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        border: `1.5px solid ${hover ? '#43DC80' : '#e5e7eb'}`,
        background: hover ? '#f0fdf4' : 'white',
        borderRadius: 16,
        padding: '28px 24px',
        minHeight: 180,
        cursor: 'pointer',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.15s',
        fontFamily: 'inherit',
        boxShadow: hover ? '0 12px 32px rgba(0,0,0,0.12)' : '0 1px 4px rgba(0,0,0,0.06)',
        transform: hover ? 'translateY(-4px)' : 'translateY(0)',
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 12, flexShrink: 0,
        background: iconInfo.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
      }}>
        <i className={`bi ${iconInfo.icon}`} style={{ fontSize: 22, color: iconInfo.color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937', lineHeight: 1.4 }}>{birim.ad}</div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{birim.kategoriler.length} konu</div>
      </div>
    </button>
  );
}

// ─── Konu kartı ───────────────────────────────────────────────────────────────
function KonuKart({ konu, birimId, onClick }) {
  const [hover, setHover] = useState(false);
  const iconInfo = BIRIM_ICONS[birimId] || DEFAULT_BIRIM_ICON;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        border: `1.5px solid ${hover ? '#43DC80' : '#e5e7eb'}`,
        background: hover ? '#f0fdf4' : 'white',
        borderRadius: 12,
        padding: '14px 16px',
        cursor: 'pointer',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        transition: 'all 0.15s',
        fontFamily: 'inherit',
        boxShadow: hover ? '0 12px 32px rgba(0,0,0,0.12)' : '0 1px 4px rgba(0,0,0,0.06)',
        transform: hover ? 'translateY(-4px)' : 'translateY(0)',
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: iconInfo.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className={`bi ${iconInfo.icon}`} style={{ fontSize: 20, color: iconInfo.color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937', lineHeight: 1.35 }}>{konu}</div>
      </div>
      <span style={{ color: '#d1d5db', fontSize: 18, flexShrink: 0 }}>›</span>
    </button>
  );
}

// ─── Geri butonu ──────────────────────────────────────────────────────────────
function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition">
      <svg style={{ width: 20, height: 20, flexShrink: 0 }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );
}

// ─── Başarı ekranı ────────────────────────────────────────────────────────────
function SuccessScreen({ ticketId, onNew }) {
  const navigate = useNavigate();
  return (
    <div className="py-12 flex flex-col items-center text-center gap-6 max-w-md mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center text-3xl">✅</div>
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Talebiniz İletildi</h2>
        <p className="text-sm text-gray-500">
          Destek Hizmetleri ekibi en kısa sürede talebinizi değerlendirecektir.
          {ticketId && <><br /><strong className="text-green-600">#{ticketId}</strong> numarasıyla takip edebilirsiniz.</>}
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => navigate('/my-tickets')}
          className="text-sm text-gray-500 hover:text-gray-700 px-5 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition"
        >
          Başvurularım
        </button>
        <button
          onClick={onNew}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition"
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
  const [step, setStep]                         = useState(1);
  const [selectedMudurluk, setSelectedMudurluk] = useState(null);
  const [selectedBirim, setSelectedBirim]       = useState(null);
  const [selectedKategori, setSelectedKategori] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', location: '', priority: 'MEDIUM' });
  const [files, setFiles]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [done, setDone]     = useState(null);

  function reset() {
    setStep(1); setSelectedMudurluk(null); setSelectedBirim(null);
    setSelectedKategori(null); setForm({ title: '', description: '', location: '', priority: 'MEDIUM' });
    setFiles([]); setError(''); setDone(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
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

      if (files.length > 0) await uploadAttachments(ticket.id, files).catch(() => {});
      setDone({ ticketId: ticket.id });
    } catch (e) {
      setError(e.message || 'Talep gönderilemedi.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="p-8 max-w-3xl">
        <SuccessScreen ticketId={done.ticketId} onNew={reset} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">

      {/* Sayfa başlığı */}
      <div className="flex items-center gap-3 mb-6">
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'rgba(67,220,128,0.12)', color: '#16a34a',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        }}>
          🔧
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 m-0">Destek Hizmetleri Talebi</h1>
          <p className="text-xs text-gray-400 m-0">{DESTEK_DATA.daire}</p>
        </div>
      </div>

      <StepIndicator step={step} />

      {/* ── ADIM 1: Birim seçimi ────────────────────────────────────────────── */}
      {step === 1 && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">Hangi birimle ilgili talebiniz var?</h2>
            <p className="text-sm text-gray-500 mt-1">İlgili birimi seçin</p>
          </div>

          {DESTEK_DATA.mudürlükler.map(m => (
            <div key={m.id} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">{m.icon}</span>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{m.ad}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {m.birimler.map(b => (
                  <BirimKart
                    key={b.id}
                    birim={b}
                    onClick={() => { setSelectedMudurluk(m); setSelectedBirim(b); setStep(2); }}
                  />
                ))}
              </div>
            </div>
          ))}

          <button
            onClick={() => navigate(-1)}
            className="text-sm text-gray-400 hover:text-gray-600 mt-2 flex items-center gap-1.5 transition"
          >
            ← Ana sayfaya dön
          </button>
        </div>
      )}

      {/* ── ADIM 2: Konu seçimi ─────────────────────────────────────────────── */}
      {step === 2 && selectedBirim && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <BackBtn onClick={() => { setStep(1); setSelectedBirim(null); setSelectedMudurluk(null); }} />
            <div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                {selectedMudurluk?.icon} {selectedBirim.ad}
              </span>
              <h2 className="text-xl font-bold text-gray-900 mt-1">Konunuz nedir?</h2>
              <p className="text-sm text-gray-400 mt-0.5">En uygun konuyu seçin</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {selectedBirim.kategoriler.map(k => (
              <KonuKart
                key={k}
                konu={k}
                birimId={selectedBirim.id}
                onClick={() => {
                  setSelectedKategori(k);
                  setForm(f => ({ ...f, title: k }));
                  setStep(3);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── ADIM 3: Detay formu ─────────────────────────────────────────────── */}
      {step === 3 && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <BackBtn onClick={() => { setStep(2); setSelectedKategori(null); }} />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                  {selectedMudurluk?.icon} {selectedBirim?.ad}
                </span>
                <span className="text-gray-300">›</span>
                <span className="text-xs font-medium text-gray-500">🔧 {selectedKategori}</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mt-1">Talep Detayları</h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Detaylar kartı */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Detaylar</h3>

              {/* Başlık */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Başlık <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Kısa ve açıklayıcı bir başlık"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 transition"
                />
              </div>

              {/* Açıklama */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama <span className="text-gray-400 font-normal">(opsiyonel)</span>
                </label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Arızayı veya talebinizi detaylı açıklayın..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 resize-none transition"
                />
              </div>

              {/* Konum */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Konum / Kat <span className="text-gray-400 font-normal">(opsiyonel)</span>
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Örn: B Blok 3. Kat, Toplantı Salonu..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 transition"
                />
              </div>
            </div>

            {/* Öncelik kartı */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Öncelik</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { val: 'MEDIUM', label: '📋 Normal',  desc: 'İş saatleri içinde' },
                  { val: 'HIGH',   label: '🚨 Acil',    desc: 'İvedi müdahale gerekiyor' },
                ].map(p => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, priority: p.val }))}
                    className={`rounded-xl border-2 px-4 py-3 text-left transition ${
                      form.priority === p.val
                        ? 'border-green-400 bg-green-50 text-green-700 ring-2 ring-green-200'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-sm font-semibold">{p.label}</div>
                    <div className="text-xs opacity-70 mt-0.5">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Ekler kartı */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Ekler</h3>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl px-6 py-6 cursor-pointer hover:border-gray-300 transition">
                <svg style={{ width: 28, height: 28 }} className="text-gray-300 mb-2" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 0-3 3m3-3 3 3M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1" />
                </svg>
                <span className="text-sm text-gray-400">Dosya seçin veya sürükleyin</span>
                <span className="text-xs text-gray-300 mt-1">PNG, JPG, PDF — maks. 10 MB</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={e => setFiles(Array.from(e.target.files || []))}
                />
              </label>
              {files.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {files.map((f, i) => (
                    <li key={i} className="text-xs text-gray-500 flex items-center gap-2">
                      <span>📎</span>{f.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || !form.title.trim()}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition"
              >
                {loading ? 'Gönderiliyor…' : 'Talebi Gönder'}
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition"
              >
                İptal
              </button>
            </div>

          </form>
        </div>
      )}
    </div>
  );
}
