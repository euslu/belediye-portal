import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTicket, uploadAttachments } from '../../api/tickets';
import { getSubmitTypes } from '../../api/settings';
import { useAuth } from '../../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || '';
function authFetch(path) {
  return fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  }).then(r => r.json());
}

// ─── Renk haritası (SubmitType.color → Tailwind sınıfları) ────────────────────
const TYPE_COLORS = {
  red:    { gradient: 'from-red-500 to-orange-500',    hover: 'hover:border-red-400',    hoverbg: 'from-red-50 to-orange-50',     action: 'text-red-600',    badge: 'bg-red-100 text-red-700',       btn: 'bg-red-600 hover:bg-red-700',    ring: 'focus:ring-red-200 focus:border-red-400',     selCat: 'border-red-500 bg-red-50 text-red-700',     catHover: 'hover:border-red-300 hover:bg-red-50',    borderHex: '#ef4444', hoverBorderHex: '#dc2626', iconBg: '#fee2e2', iconFg: '#ef4444',  softBg: 'from-red-50 via-white to-orange-50', pillActive: 'from-red-500 to-orange-500', pillSoft: 'border-red-200/70 text-red-700 bg-red-50/80' },
  indigo: { gradient: 'from-indigo-500 to-blue-500',   hover: 'hover:border-indigo-400', hoverbg: 'from-indigo-50 to-blue-50',    action: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700', btn: 'bg-indigo-600 hover:bg-indigo-700', ring: 'focus:ring-indigo-200 focus:border-indigo-300', selCat: 'border-indigo-500 bg-indigo-50 text-indigo-700', catHover: 'hover:border-indigo-300 hover:bg-indigo-50', borderHex: '#4f46e5', hoverBorderHex: '#4338ca', iconBg: '#eef2ff', iconFg: '#4f46e5', softBg: 'from-indigo-50 via-white to-cyan-50',   pillActive: 'from-indigo-500 to-blue-500',   pillSoft: 'border-indigo-200/70 text-indigo-700 bg-indigo-50/80' },
  orange: { gradient: 'from-orange-500 to-amber-500',  hover: 'hover:border-orange-400', hoverbg: 'from-orange-50 to-amber-50',   action: 'text-orange-600', badge: 'bg-orange-100 text-orange-700', btn: 'bg-orange-600 hover:bg-orange-700', ring: 'focus:ring-orange-200 focus:border-orange-400', selCat: 'border-orange-500 bg-orange-50 text-orange-700', catHover: 'hover:border-orange-300 hover:bg-orange-50', borderHex: '#f97316', hoverBorderHex: '#ea580c', iconBg: '#fff7ed', iconFg: '#f97316', softBg: 'from-orange-50 via-white to-amber-50',  pillActive: 'from-orange-500 to-amber-500',  pillSoft: 'border-orange-200/70 text-orange-700 bg-orange-50/80' },
  green:  { gradient: 'from-green-500 to-emerald-500', hover: 'hover:border-green-400',  hoverbg: 'from-green-50 to-emerald-50',  action: 'text-green-600',  badge: 'bg-green-100 text-green-700',   btn: 'bg-green-600 hover:bg-green-700',  ring: 'focus:ring-green-200 focus:border-green-400',   selCat: 'border-green-500 bg-green-50 text-green-700',   catHover: 'hover:border-green-300 hover:bg-green-50',   borderHex: '#22c55e', hoverBorderHex: '#16a34a', iconBg: '#dcfce7', iconFg: '#16a34a', softBg: 'from-green-50 via-white to-emerald-50', pillActive: 'from-green-500 to-emerald-500', pillSoft: 'border-green-200/70 text-green-700 bg-green-50/80' },
  blue:   { gradient: 'from-blue-500 to-cyan-500',     hover: 'hover:border-blue-400',   hoverbg: 'from-blue-50 to-cyan-50',      action: 'text-blue-600',   badge: 'bg-blue-100 text-blue-700',     btn: 'bg-blue-600 hover:bg-blue-700',    ring: 'focus:ring-blue-200 focus:border-blue-400',     selCat: 'border-blue-500 bg-blue-50 text-blue-700',     catHover: 'hover:border-blue-300 hover:bg-blue-50',     borderHex: '#3b82f6', hoverBorderHex: '#2563eb', iconBg: '#dbeafe', iconFg: '#3b82f6', softBg: 'from-blue-50 via-white to-cyan-50',   pillActive: 'from-blue-500 to-cyan-500',     pillSoft: 'border-blue-200/70 text-blue-700 bg-blue-50/80' },
  purple: { gradient: 'from-purple-500 to-violet-500', hover: 'hover:border-purple-400', hoverbg: 'from-purple-50 to-violet-50',  action: 'text-purple-600', badge: 'bg-purple-100 text-purple-700', btn: 'bg-purple-600 hover:bg-purple-700', ring: 'focus:ring-purple-200 focus:border-purple-400', selCat: 'border-purple-500 bg-purple-50 text-purple-700', catHover: 'hover:border-purple-300 hover:bg-purple-50', borderHex: '#a855f7', hoverBorderHex: '#9333ea', iconBg: '#f3e8ff', iconFg: '#a855f7', softBg: 'from-purple-50 via-white to-fuchsia-50', pillActive: 'from-purple-500 to-violet-500', pillSoft: 'border-purple-200/70 text-purple-700 bg-purple-50/80' },
  gray:   { gradient: 'from-slate-500 to-zinc-500',    hover: 'hover:border-slate-400',   hoverbg: 'from-slate-50 to-zinc-50',     action: 'text-slate-600',   badge: 'bg-slate-100 text-slate-700',     btn: 'bg-slate-600 hover:bg-slate-700',    ring: 'focus:ring-slate-200 focus:border-slate-400',     selCat: 'border-slate-500 bg-slate-50 text-slate-700',     catHover: 'hover:border-slate-300 hover:bg-slate-50',     borderHex: '#64748b', hoverBorderHex: '#475569', iconBg: '#f1f5f9', iconFg: '#64748b', softBg: 'from-slate-50 via-white to-zinc-50', pillActive: 'from-slate-500 to-zinc-500', pillSoft: 'border-slate-200/70 text-slate-700 bg-slate-50/80' },
  amber:  { gradient: 'from-amber-500 to-yellow-500',  hover: 'hover:border-amber-400',  hoverbg: 'from-amber-50 to-yellow-50',   action: 'text-amber-600',  badge: 'bg-amber-100 text-amber-700',   btn: 'bg-amber-600 hover:bg-amber-700',  ring: 'focus:ring-amber-200 focus:border-amber-400',   selCat: 'border-amber-500 bg-amber-50 text-amber-700',   catHover: 'hover:border-amber-300 hover:bg-amber-50',   borderHex: '#f59e0b', hoverBorderHex: '#d97706', iconBg: '#fef3c7', iconFg: '#f59e0b', softBg: 'from-amber-50 via-white to-yellow-50', pillActive: 'from-amber-500 to-yellow-500', pillSoft: 'border-amber-200/70 text-amber-700 bg-amber-50/80' },
};
function tc(color) { return TYPE_COLORS[color] || TYPE_COLORS.indigo; }

const PRIORITIES = [
  { value: 'LOW',      label: 'Düşük',  sla: '72 sa' },
  { value: 'MEDIUM',   label: 'Orta',   sla: '24 sa' },
  { value: 'HIGH',     label: 'Yüksek', sla: '8 sa'  },
  { value: 'CRITICAL', label: 'Kritik', sla: '4 sa'  },
];
const PRIORITY_COLORS = {
  LOW:      { border: '#94a3b8', bg: '#f8fafc', color: '#475569', ring: '#cbd5e1' },
  MEDIUM:   { border: '#3b82f6', bg: '#eff6ff', color: '#1d4ed8', ring: '#93c5fd' },
  HIGH:     { border: '#f97316', bg: '#fff7ed', color: '#c2410c', ring: '#fdba74' },
  CRITICAL: { border: '#ef4444', bg: '#fef2f2', color: '#b91c1c', ring: '#fca5a5' },
};

// ─── İlerleme adımları ─────────────────────────────────────────────────────────
function StepIndicator({ step, submitType }) {
  const c = tc(submitType?.color);
  const steps = [
    { n: 1, label: 'Başvuru Tipi' },
    { n: 2, label: 'Başvuru Konusu' },
    { n: 3, label: 'Konu & Form'  },
  ];
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all
            ${step === s.n ? `${c.badge}` : step > s.n ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold
              border border-current">
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

// ─── Tip başvuru ikonu haritası ────────────────────────────────────────────────
const KEY_ICONS = {
  ARIZA:         'bi-lightning-charge-fill',
  TALEP:         'bi-clipboard-check',
  HIZMET_TALEBI: 'bi-clipboard-check',
};

// ─── ADIM 1: Başvuru Tipi ──────────────────────────────────────────────────────
function Step1TypeSelect({ onSelect }) {
  const [types, setTypes]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredKey, setHoveredKey] = useState(null);

  useEffect(() => {
    getSubmitTypes().then(setTypes).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-gray-400 py-10 text-center">Yükleniyor…</div>;

  return (
    <div>
      <div className={`grid gap-5 ${types.length > 2 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {types.map((st) => {
          const c = tc(st.color);
          const isHovered = hoveredKey === st.key;
          return (
            <button key={st.key} onClick={() => onSelect(st)}
              onMouseEnter={() => setHoveredKey(st.key)}
              onMouseLeave={() => setHoveredKey(null)}
              style={{
                position: 'relative', overflow: 'hidden',
                borderRadius: 16, padding: 28, textAlign: 'left',
                border: `1.5px solid ${isHovered ? '#43DC80' : '#e5e7eb'}`,
                background: isHovered ? '#f0fdf4' : '#fff',
                transform: isHovered ? 'translateY(-4px)' : 'none',
                boxShadow: isHovered ? '0 12px 32px rgba(0,0,0,0.12)' : '0 1px 4px rgba(0,0,0,0.06)',
                transition: 'all 0.15s', cursor: 'pointer', fontFamily: 'inherit',
              }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16, marginBottom: 20,
                background: c.iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {KEY_ICONS[st.key]
                  ? <i className={`bi ${KEY_ICONS[st.key]}`} style={{ fontSize: 26, color: c.iconFg }} />
                  : <span style={{ fontSize: 24 }}>{st.icon || '📋'}</span>
                }
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 6 }}>{st.name}</div>
              {st.description && <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.5 }}>{st.description}</div>}
              <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: c.iconFg }}>
                Devam Et
                <span style={{ fontSize: 14 }}>›</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Kategori kartı (hover efektli) ──────────────────────────────────────────
function CatCard({ cat, c, onSelect }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={() => onSelect(cat)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: 16,
        background: hover ? '#f0fdf4' : '#fff',
        border: `1.5px solid ${hover ? '#43DC80' : '#e5e7eb'}`,
        borderRadius: 16, textAlign: 'left', cursor: 'pointer',
        transition: 'all 0.15s',
        boxShadow: hover ? '0 12px 32px rgba(0,0,0,0.12)' : '0 1px 4px rgba(0,0,0,0.06)',
        transform: hover ? 'translateY(-4px)' : 'none',
        fontFamily: 'inherit',
      }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12, flexShrink: 0,
        background: c.iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24,
      }}>
        {cat.icon || '📁'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2937', lineHeight: 1.4 }}>{cat.name}</div>
        {cat._count?.subjects > 0 && (
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{cat._count.subjects} konu</div>
        )}
      </div>
      <span style={{ color: '#d1d5db', fontSize: 18, flexShrink: 0 }}>›</span>
    </button>
  );
}

// ─── ADIM 2: Kategori ─────────────────────────────────────────────────────────
function Step2CategorySelect({ submitType, onSelect, onBack }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const c = tc(submitType.color);

  useEffect(() => {
    authFetch(`/api/categories?typeId=${submitType.id}`)
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [submitType.id]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="portal-soft-btn rounded-2xl" style={{ width: 44, height: 44, padding: 0 }}>
          <svg className="w-5 h-5" style={{width:20,height:20,flexShrink:0}} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.badge}`}>
            {submitType.icon} {submitType.name}
          </span>
          <h2 className="text-xl font-bold text-gray-900 mt-1">Sorununuz hangi konuyla ilgili?</h2>
          <p className="text-sm text-gray-400 mt-0.5">En uygun kategoriyi seçin</p>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-10 text-center">Yükleniyor…</div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat) => (
            <CatCard key={cat.id} cat={cat} c={c} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ADIM 3: Konu & Form ──────────────────────────────────────────────────────
const SOURCE_OPTIONS = [
  { value: 'PORTAL',    label: '🌐 Portal (çevrimiçi)' },
  { value: 'PHONE',     label: '📞 Telefon'            },
  { value: 'IN_PERSON', label: '👤 Yüz yüze'          },
  { value: 'EMAIL',     label: '📧 E-posta'            },
  { value: 'API',       label: '⚡ API'                 },
  { value: 'MUHTAR',    label: '🏘️ Muhtar'             },
  { value: 'VATANDAS',  label: '👥 Vatandaş'           },
  { value: 'DIGER',     label: '📌 Diğer'              },
];

// Adres girişi gerektiren kaynaklar (ulakBELL entegrasyonu)
const ADDRESS_SOURCES = ['MUHTAR', 'VATANDAS', 'DIGER'];

function Step3Form({ submitType, category, onBack }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const c = tc(submitType.color);
  const isPrivileged = ['admin', 'manager'].includes(user?.role);

  const [subjects, setSubjects]     = useState([]);
  const [selectedSubj, setSelectedSubj] = useState(null);
  const [form, setForm]             = useState({ title: '', description: '', priority: 'MEDIUM', source: 'PORTAL' });
  const [files, setFiles]           = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [subjLoading, setSubjLoading] = useState(true);
  const [submitted, setSubmitted]   = useState(null); // { ticket, isRequest }

  // ulakBELL toggle + form
  const [ubEnabled,   setUbEnabled]   = useState(false);
  const [ubPhone,     setUbPhone]     = useState('');
  const [ubType,      setUbType]      = useState('incident');
  const [ubSyncing,   setUbSyncing]   = useState(false);
  const [ubToast,     setUbToast]     = useState(null); // { ok, msg }

  // Adres kaskad state
  const [ilceler,    setIlceler]    = useState([]);
  const [mahalleler, setMahalleler] = useState([]);
  const [sokaklar,   setSokaklar]   = useState([]);
  const [binalar,    setBinalar]    = useState([]);
  const [daireler,   setDaireler]   = useState([]);
  const [addr, setAddr_] = useState({
    ilce_id: '', mahalle_id: '', sokak_id: '', bina_no: '', adres_no: '',
  });
  const [addrLoading, setAddrLoading] = useState('');

  // ulakBELL toggle otomatik aç: kaynak MUHTAR/VATANDAS/DIGER ise
  const needsUlakbell = ADDRESS_SOURCES.includes(form.source);

  useEffect(() => {
    authFetch(`/api/subjects?categoryId=${category.id}`)
      .then(data => setSubjects(Array.isArray(data) ? data : []))
      .finally(() => setSubjLoading(false));
  }, [category.id]);

  // İlçeleri ilk kez yükle (toggle açılınca veya kaynak değişince)
  useEffect(() => {
    if (!(ubEnabled || needsUlakbell) || ilceler.length > 0) return;
    setAddrLoading('ilce');
    authFetch('/api/ulakbell/ilceler')
      .then(d => setIlceler(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setAddrLoading(''));
  }, [ubEnabled, needsUlakbell, ilceler.length]);

  function setAddr(field, value) {
    setAddr_(prev => {
      const n = { ...prev, [field]: value };
      if (field === 'ilce_id')    { n.mahalle_id = ''; n.sokak_id = ''; n.bina_no = ''; n.adres_no = ''; setMahalleler([]); setSokaklar([]); setBinalar([]); setDaireler([]); }
      if (field === 'mahalle_id') { n.sokak_id   = ''; n.bina_no  = ''; n.adres_no = ''; setSokaklar([]); setBinalar([]); setDaireler([]); }
      if (field === 'sokak_id')   { n.bina_no    = ''; n.adres_no = ''; setBinalar([]); setDaireler([]); }
      if (field === 'bina_no')    { n.adres_no   = ''; setDaireler([]); }
      return n;
    });
    if (field === 'ilce_id' && value) {
      setAddrLoading('mahalle');
      authFetch(`/api/ulakbell/mahalleler?ilce_id=${value}`)
        .then(d => setMahalleler(Array.isArray(d) ? d : []))
        .catch(() => {})
        .finally(() => setAddrLoading(''));
    }
    if (field === 'mahalle_id' && value) {
      setAddrLoading('sokak');
      authFetch(`/api/ulakbell/sokaklar?mahalle_id=${value}`)
        .then(d => setSokaklar(Array.isArray(d) ? d : []))
        .catch(() => {})
        .finally(() => setAddrLoading(''));
    }
    if (field === 'sokak_id' && value) {
      setAddrLoading('bina');
      authFetch(`/api/ulakbell/binalar?sokak_id=${value}`)
        .then(d => setBinalar(Array.isArray(d) ? d : []))
        .catch(() => {})
        .finally(() => setAddrLoading(''));
    }
    if (field === 'bina_no' && value) {
      setAddrLoading('daire');
      authFetch(`/api/ulakbell/daireler?bina_no=${value}`)
        .then(d => setDaireler(Array.isArray(d) ? d : []))
        .catch(() => {})
        .finally(() => setAddrLoading(''));
    }
  }

  function set(field, value) { setForm(f => ({ ...f, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedSubj) { setError('Lütfen bir başvuru konusu seçin'); return; }
    setError('');
    setLoading(true);
    try {
      const isRequest = submitType.key !== 'ARIZA';
      const doUlakbell = ubEnabled || needsUlakbell;

      // 1. Ticket'ı DB'ye kaydet
      const ticket = await createTicket({
        title:       form.title,
        description: form.description,
        priority:    form.priority,
        type:        isRequest ? 'REQUEST' : 'INCIDENT',
        categoryId:  category.id,
        subjectId:   selectedSubj.id,
        source:      form.source || 'PORTAL',
        ...(doUlakbell && addr.ilce_id    ? { ilceId:    addr.ilce_id }    : {}),
        ...(doUlakbell && addr.mahalle_id ? { mahalleId: addr.mahalle_id } : {}),
        ...(doUlakbell && addr.sokak_id   ? { sokakId:   addr.sokak_id }   : {}),
        ...(doUlakbell && addr.bina_no    ? { binaId:    addr.bina_no }    : {}),
        ...(doUlakbell && addr.adres_no   ? { adresId:   addr.adres_no }   : {}),
      });

      if (files.length > 0) await uploadAttachments(ticket.id, files).catch(() => {});

      // 2. ulakBELL senkronizasyonu
      if (doUlakbell) {
        setUbSyncing(true);
        const token = localStorage.getItem('token');
        try {
          const syncRes = await fetch(
            `${API_URL}/api/ulakbell/sync-incident/${ticket.id}`,
            {
              method:  'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body:    JSON.stringify({
                mobile_phone:  ubPhone || undefined,
                incident_type: ubType,
                ...(addr.ilce_id    ? { ilce_id:    +addr.ilce_id }    : {}),
                ...(addr.mahalle_id ? { mahalle_id: +addr.mahalle_id } : {}),
                ...(addr.sokak_id   ? { sokak_id:   +addr.sokak_id }   : {}),
                ...(addr.bina_no    ? { bina_no:    +addr.bina_no }    : {}),
                ...(addr.adres_no   ? { adres_no:   +addr.adres_no }   : {}),
              }),
            }
          );
          const syncData = await syncRes.json();
          if (syncData.ok) {
            setUbToast({ ok: true, msg: `ulakBELL'e iletildi${syncData.ulakbellNumber ? ` (#${syncData.ulakbellNumber})` : ''}` });
          } else {
            setUbToast({ ok: false, msg: 'ulakBELL iletilemedi, ticket yine de kaydedildi' });
          }
        } catch {
          setUbToast({ ok: false, msg: 'ulakBELL iletilemedi, ticket yine de kaydedildi' });
        } finally {
          setUbSyncing(false);
        }
      }

      setSubmitted({ ticket, isRequest, ubToast });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Başarı ekranı
  if (submitted) {
    const { ticket, isRequest } = submitted;
    return (
      <div className="py-12 flex flex-col items-center text-center gap-6 max-w-md mx-auto">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl
          ${isRequest ? 'bg-amber-100' : 'bg-green-100'}`}>
          {isRequest ? '⏳' : '✅'}
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {isRequest ? 'Talebiniz onaya gönderildi' : 'Talebiniz ekibe iletildi'}
          </h2>
          <p className="text-sm text-gray-500">
            {isRequest
              ? 'Yöneticiniz talebinizi inceleyecek ve en kısa sürede bilgilendirileceksiniz.'
              : 'Teknik ekip talebinizi aldı ve en kısa sürede ilgilenecek.'}
          </p>
        </div>
        {ubSyncing && (
          <div className="text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <span className="animate-spin">⟳</span> ulakBELL'e iletiliyor…
          </div>
        )}
        {ubToast && !ubSyncing && (
          <div className={`text-sm rounded-xl px-4 py-3 border ${ubToast.ok
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
            {ubToast.ok ? '✅' : '⚠️'} {ubToast.msg}
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/itsm/${ticket.id}`)}
            className="portal-cta-btn portal-cta-btn--green text-sm">
            Talep Detayı →
          </button>
          <button
            onClick={() => navigate('/itsm')}
            className="portal-pill-btn text-sm">
            Taleplerim
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Başlık */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="portal-soft-btn rounded-2xl" style={{ width: 44, height: 44, padding: 0 }}>
          <svg className="w-5 h-5" style={{width:20,height:20,flexShrink:0}} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.badge}`}>
              {submitType.icon} {submitType.name}
            </span>
            <span className="text-gray-300">›</span>
            <span className="text-xs font-medium text-gray-500">{category.icon} {category.name}</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mt-1">Başvuru detayları</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Konu Seçimi */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Başvuru Konusu <span className="text-red-500">*</span>
          </h3>
          {subjLoading ? (
            <p className="text-sm text-gray-400 py-2">Yükleniyor…</p>
          ) : subjects.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">Bu kategoriye ait konu bulunamadı.</p>
          ) : (
            <div className="space-y-1.5">
              {subjects.map((subj) => {
                const selected = selectedSubj?.id === subj.id;
                return (
                  <button key={subj.id} type="button" onClick={() => setSelectedSubj(subj)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      borderRadius: 12,
                      border: `2px solid ${selected ? c.borderHex : '#e5e7eb'}`,
                      background: selected ? c.iconBg : '#fff',
                      color: selected ? c.borderHex : '#374151',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 200ms ease',
                      boxShadow: selected ? `0 4px 14px ${c.borderHex}20` : '0 1px 4px rgba(0,0,0,0.04)',
                    }}>
                    {/* Radio circle */}
                    <span style={{
                      width: 16, height: 16, borderRadius: '50%',
                      border: `2px solid ${selected ? c.borderHex : '#d1d5db'}`,
                      flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {selected && <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.borderHex, display: 'block' }} />}
                    </span>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{subj.name}</span>
                    {subj.defaultGroup && (
                      <span style={{
                        fontSize: 12, padding: '4px 10px', borderRadius: 20, flexShrink: 0,
                        border: `1px solid ${selected ? c.borderHex + '40' : '#e5e7eb'}`,
                        background: selected ? '#fff' : '#f8fafc',
                        color: selected ? c.borderHex : '#6b7280',
                      }}>
                        {subj.defaultGroup.name}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {selectedSubj?.defaultGroup && (
            <p className="mt-3 text-xs text-gray-400 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" style={{width:14,height:14,flexShrink:0}} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Otomatik yönlendirilecek grup: <strong className="text-gray-600">{selectedSubj.defaultGroup.name}</strong>
            </p>
          )}
        </div>

        {/* Talep Bilgileri */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Detaylar</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Başlık <span className="text-red-500">*</span>
            </label>
            <input type="text" required value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Kısa ve açıklayıcı bir başlık"
              className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 ${c.ring} transition`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Açıklama <span className="text-red-500">*</span>
            </label>
            <textarea required rows={4} value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder={submitType.key === 'ARIZA'
                ? 'Sorunu detaylı anlatın: ne zaman başladı, hangi hata oluşuyor…'
                : 'Talebinizi detaylı açıklayın: ne istiyorsunuz, neden gerekli…'}
              className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 ${c.ring} resize-none transition`} />
          </div>
        </div>

        {/* Öncelik */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Öncelik</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {PRIORITIES.map(p => {
              const pc     = PRIORITY_COLORS[p.value];
              const active = form.priority === p.value;
              return (
                <button key={p.value} type="button" onClick={() => set('priority', p.value)}
                  style={{
                    borderRadius: 14,
                    border: `2px solid ${active ? pc.border : '#e5e7eb'}`,
                    padding: '12px 10px',
                    textAlign: 'center',
                    background: active ? pc.bg : '#fff',
                    color: active ? pc.color : '#6b7280',
                    fontWeight: active ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 200ms ease',
                    boxShadow: active ? `0 4px 14px ${pc.ring}40` : '0 1px 4px rgba(0,0,0,0.04)',
                    transform: active ? 'translateY(-2px)' : 'none',
                  }}>
                  <div style={{ fontSize: 14, fontWeight: 'inherit' }}>{p.label}</div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>SLA: {p.sla}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Kaynak — sadece admin/manager görebilir */}
        {isPrivileged && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Başvuru Kaynağı</h3>
            <p className="text-xs text-gray-400 mb-3">Başvuru telefon, yüz yüze vb. kanaldan geldiyse seçin.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SOURCE_OPTIONS.map(opt => {
                const active = form.source === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set('source', opt.value)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 14,
                      fontSize: 13,
                      border: `1.5px solid ${active ? c.borderHex : '#e5e7eb'}`,
                      background: active ? c.iconBg : '#fff',
                      color: active ? c.borderHex : '#6b7280',
                      fontWeight: active ? 600 : 500,
                      cursor: 'pointer',
                      transition: 'all 200ms ease',
                      boxShadow: active ? `0 4px 14px ${c.borderHex}25` : '0 1px 4px rgba(0,0,0,0.04)',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ulakBELL Bölümü — kaynak MUHTAR/VATANDAS/DIGER ise veya toggle açıksa */}
        {isPrivileged && (needsUlakbell || ubEnabled) && (
          <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/50 p-5 space-y-4">
            {/* Başlık + toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🔗</span>
                <h3 className="text-sm font-semibold text-blue-800">ulakBELL'e İlet</h3>
              </div>
              {!needsUlakbell && (
                <button type="button" onClick={() => setUbEnabled(v => !v)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${ubEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${ubEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              )}
            </div>

            {(ubEnabled || needsUlakbell) && (<>
              {/* Başvuru Tipi */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Başvuru Tipi</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { v: 'incident', l: '🔧 Arıza' },
                    { v: 'demand',   l: '📋 İstek' },
                    { v: 'complaint',l: '😠 Şikayet' },
                    { v: 'thanks',   l: '🙏 Teşekkür' },
                    { v: 'notice',   l: '📢 İhbar' },
                  ].map(({ v, l }) => (
                    <button key={v} type="button" onClick={() => setUbType(v)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 14,
                        fontSize: 13,
                        border: `1.5px solid ${ubType === v ? '#3b82f6' : '#e5e7eb'}`,
                        background: ubType === v ? '#eff6ff' : '#fff',
                        color: ubType === v ? '#2563eb' : '#6b7280',
                        fontWeight: ubType === v ? 600 : 500,
                        cursor: 'pointer',
                        transition: 'all 200ms ease',
                        boxShadow: ubType === v ? '0 4px 14px rgba(59,130,246,0.15)' : '0 1px 4px rgba(0,0,0,0.04)',
                      }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vatandaş Telefonu */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Vatandaş Telefonu <span className="text-gray-400">(opsiyonel)</span></label>
                <input type="tel" value={ubPhone} onChange={e => setUbPhone(e.target.value)}
                  placeholder="5__ ___ __ __"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>

              {/* Adres Kaskadı */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">📍 Adres Bilgileri <span className="text-gray-400">(opsiyonel)</span></label>
                <div className="grid grid-cols-2 gap-2.5">

                  {/* İlçe  → { ilce_key, ilce_title } */}
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">İlçe</label>
                    <select value={addr.ilce_id} onChange={e => setAddr('ilce_id', e.target.value)}
                      disabled={addrLoading === 'ilce'}
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60 bg-white">
                      <option value="">{addrLoading === 'ilce' ? '⟳ Yükleniyor…' : '— Seçin —'}</option>
                      {ilceler.map(i => <option key={i.ilce_key} value={i.ilce_key}>{i.ilce_title}</option>)}
                    </select>
                  </div>

                  {/* Mahalle → { mahalle_key, mahalle_title } */}
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Mahalle</label>
                    <select value={addr.mahalle_id} onChange={e => setAddr('mahalle_id', e.target.value)}
                      disabled={!addr.ilce_id || addrLoading === 'mahalle'}
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60 bg-white">
                      <option value="">{addrLoading === 'mahalle' ? '⟳ Yükleniyor…' : addr.ilce_id ? '— Seçin —' : 'Önce ilçe'}</option>
                      {mahalleler.map(m => <option key={m.mahalle_key} value={m.mahalle_key}>{m.mahalle_title}</option>)}
                    </select>
                  </div>

                  {/* Sokak → { sokak_cadde_id, sokak_cadde_title } */}
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Sokak / Cadde</label>
                    <select value={addr.sokak_id} onChange={e => setAddr('sokak_id', e.target.value)}
                      disabled={!addr.mahalle_id || addrLoading === 'sokak'}
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60 bg-white">
                      <option value="">{addrLoading === 'sokak' ? '⟳ Yükleniyor…' : addr.mahalle_id ? '— Seçin —' : 'Önce mahalle'}</option>
                      {sokaklar.map(s => <option key={s.sokak_cadde_id} value={s.sokak_cadde_id}>{s.sokak_cadde_title}</option>)}
                    </select>
                  </div>

                  {/* Bina → { id, title } */}
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Bina No</label>
                    <select value={addr.bina_no} onChange={e => setAddr('bina_no', e.target.value)}
                      disabled={!addr.sokak_id || addrLoading === 'bina'}
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60 bg-white">
                      <option value="">{addrLoading === 'bina' ? '⟳ Yükleniyor…' : addr.sokak_id ? '— Seçin —' : 'Önce sokak'}</option>
                      {binalar.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                    </select>
                  </div>

                  {/* Daire → { id, title } */}
                  <div className="col-span-2">
                    <label className="block text-[11px] text-gray-500 mb-1">Daire / İç Kapı No <span className="text-gray-400">(opsiyonel)</span></label>
                    <select value={addr.adres_no} onChange={e => setAddr('adres_no', e.target.value)}
                      disabled={!addr.bina_no || addrLoading === 'daire'}
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60 bg-white">
                      <option value="">{addrLoading === 'daire' ? '⟳ Yükleniyor…' : addr.bina_no ? '— Seçin —' : 'Önce bina'}</option>
                      {daireler.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </>)}
          </div>
        )}

        {/* Ekler */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Ekler</h3>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl px-6 py-6 cursor-pointer hover:border-gray-300 transition">
            <svg className="w-7 h-7 text-gray-300 mb-2" style={{width:28,height:28}} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 0-3 3m3-3 3 3M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1" />
            </svg>
            <span className="text-sm text-gray-400">Dosya seçin veya sürükleyin</span>
            <span className="text-xs text-gray-300 mt-1">PNG, JPG, PDF — maks. 10 MB</span>
            <input type="file" multiple className="hidden" onChange={e => setFiles(Array.from(e.target.files))} />
          </label>
          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map(f => (
                <li key={f.name} className="text-xs text-gray-500 flex items-center gap-2">
                  <span>📎</span>{f.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="portal-cta-btn portal-cta-btn--green text-sm disabled:opacity-60">
            {loading ? 'Gönderiliyor…' : 'Başvuruyu Gönder'}
          </button>
          <button type="button" onClick={() => navigate('/itsm')}
            className="portal-pill-btn text-sm">
            İptal
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────
export default function TicketNew() {
  const [step, setStep]           = useState(1);
  const [submitType, setSubmitType] = useState(null);
  const [category, setCategory]   = useState(null);

  function selectType(st) { setSubmitType(st); setStep(2); }
  function selectCat(cat) { setCategory(cat); setStep(3); }
  function backToStep1()  { setSubmitType(null); setCategory(null); setStep(1); }
  function backToStep2()  { setCategory(null); setStep(2); }

  return (
    <div style={{ padding: '32px 20px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Sayfa başlığı */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: '#f0fdf4',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <i className="bi bi-laptop" style={{ fontSize: 22, color: '#43DC80' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>
            Bilgi İşlem Talebi
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>
            Bilgi İşlem Dairesi Başkanlığı
          </p>
        </div>
      </div>

      <StepIndicator step={step} submitType={submitType} />
      {step === 1 && <Step1TypeSelect onSelect={selectType} />}
      {step === 2 && <Step2CategorySelect submitType={submitType} onSelect={selectCat} onBack={backToStep1} />}
      {step === 3 && <Step3Form submitType={submitType} category={category} onBack={backToStep2} />}
    </div>
  );
}
