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
  red:    { gradient: 'from-red-500 to-orange-500',    hover: 'hover:border-red-400',    hoverbg: 'from-red-50 to-orange-50',     action: 'text-red-600',    badge: 'bg-red-100 text-red-700',       btn: 'bg-red-600 hover:bg-red-700',    ring: 'focus:ring-red-200 focus:border-red-400',     selCat: 'border-red-500 bg-red-50 text-red-700',     catHover: 'hover:border-red-300 hover:bg-red-50'   },
  indigo: { gradient: 'from-indigo-500 to-blue-500',   hover: 'hover:border-indigo-400', hoverbg: 'from-indigo-50 to-blue-50',    action: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700', btn: 'bg-indigo-600 hover:bg-indigo-700', ring: 'focus:ring-indigo-200 focus:border-indigo-300', selCat: 'border-indigo-500 bg-indigo-50 text-indigo-700', catHover: 'hover:border-indigo-300 hover:bg-indigo-50' },
  orange: { gradient: 'from-orange-500 to-amber-500',  hover: 'hover:border-orange-400', hoverbg: 'from-orange-50 to-amber-50',   action: 'text-orange-600', badge: 'bg-orange-100 text-orange-700', btn: 'bg-orange-600 hover:bg-orange-700', ring: 'focus:ring-orange-200 focus:border-orange-400', selCat: 'border-orange-500 bg-orange-50 text-orange-700', catHover: 'hover:border-orange-300 hover:bg-orange-50' },
  green:  { gradient: 'from-green-500 to-emerald-500', hover: 'hover:border-green-400',  hoverbg: 'from-green-50 to-emerald-50',  action: 'text-green-600',  badge: 'bg-green-100 text-green-700',   btn: 'bg-green-600 hover:bg-green-700',  ring: 'focus:ring-green-200 focus:border-green-400',   selCat: 'border-green-500 bg-green-50 text-green-700',   catHover: 'hover:border-green-300 hover:bg-green-50'  },
  blue:   { gradient: 'from-blue-500 to-cyan-500',     hover: 'hover:border-blue-400',   hoverbg: 'from-blue-50 to-cyan-50',      action: 'text-blue-600',   badge: 'bg-blue-100 text-blue-700',     btn: 'bg-blue-600 hover:bg-blue-700',    ring: 'focus:ring-blue-200 focus:border-blue-400',     selCat: 'border-blue-500 bg-blue-50 text-blue-700',     catHover: 'hover:border-blue-300 hover:bg-blue-50'    },
  purple: { gradient: 'from-purple-500 to-violet-500', hover: 'hover:border-purple-400', hoverbg: 'from-purple-50 to-violet-50',  action: 'text-purple-600', badge: 'bg-purple-100 text-purple-700', btn: 'bg-purple-600 hover:bg-purple-700', ring: 'focus:ring-purple-200 focus:border-purple-400', selCat: 'border-purple-500 bg-purple-50 text-purple-700', catHover: 'hover:border-purple-300 hover:bg-purple-50' },
  gray:   { gradient: 'from-gray-500 to-slate-500',    hover: 'hover:border-gray-400',   hoverbg: 'from-gray-50 to-slate-50',     action: 'text-gray-600',   badge: 'bg-gray-100 text-gray-700',     btn: 'bg-gray-600 hover:bg-gray-700',    ring: 'focus:ring-gray-200 focus:border-gray-400',     selCat: 'border-gray-500 bg-gray-50 text-gray-700',     catHover: 'hover:border-gray-300 hover:bg-gray-50'    },
  amber:  { gradient: 'from-amber-500 to-yellow-500',  hover: 'hover:border-amber-400',  hoverbg: 'from-amber-50 to-yellow-50',   action: 'text-amber-600',  badge: 'bg-amber-100 text-amber-700',   btn: 'bg-amber-600 hover:bg-amber-700',  ring: 'focus:ring-amber-200 focus:border-amber-400',   selCat: 'border-amber-500 bg-amber-50 text-amber-700',   catHover: 'hover:border-amber-300 hover:bg-amber-50'  },
};
function tc(color) { return TYPE_COLORS[color] || TYPE_COLORS.indigo; }

const PRIORITIES = [
  { value: 'LOW',      label: 'Düşük',  sla: '72 sa' },
  { value: 'MEDIUM',   label: 'Orta',   sla: '24 sa' },
  { value: 'HIGH',     label: 'Yüksek', sla: '8 sa'  },
  { value: 'CRITICAL', label: 'Kritik', sla: '4 sa'  },
];
const PRIORITY_COLORS = {
  LOW:      { ring: 'ring-gray-300',   bg: 'bg-gray-50',    text: 'text-gray-600'   },
  MEDIUM:   { ring: 'ring-blue-400',   bg: 'bg-blue-50',    text: 'text-blue-700'   },
  HIGH:     { ring: 'ring-orange-400', bg: 'bg-orange-50',  text: 'text-orange-700' },
  CRITICAL: { ring: 'ring-red-500',    bg: 'bg-red-50',     text: 'text-red-700'    },
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

// ─── ADIM 1: Başvuru Tipi ──────────────────────────────────────────────────────
function Step1TypeSelect({ onSelect }) {
  const [types, setTypes]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSubmitTypes().then(setTypes).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-gray-400 py-10 text-center">Yükleniyor…</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Yeni Başvuru</h1>
        <p className="text-sm text-gray-500 mt-1">Başvurunuzun türünü seçin</p>
      </div>
      <div className={`grid gap-5 ${types.length > 2 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {types.map((st) => {
          const c = tc(st.color);
          return (
            <button key={st.key} onClick={() => onSelect(st)}
              className={`group relative overflow-hidden rounded-2xl border-2 border-transparent
                bg-white p-7 text-left shadow-sm ${c.hover} hover:shadow-md transition-all duration-200`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${c.hoverbg} opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className="relative">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${c.gradient} flex items-center justify-center mb-5 shadow-md text-2xl`}>
                  {st.icon || '📋'}
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-1.5">{st.name}</h2>
                {st.description && <p className="text-sm text-gray-500 leading-relaxed">{st.description}</p>}
                <div className={`mt-5 flex items-center gap-1.5 text-xs font-semibold ${c.action}`}>
                  Devam Et
                  <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" style={{width:14,height:14,flexShrink:0}} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
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
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition">
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
            <button key={cat.id} onClick={() => onSelect(cat)}
              className={`group flex items-center gap-4 p-4 bg-white border-2 border-gray-100 rounded-2xl
                text-left ${c.catHover} hover:shadow-md transition-all duration-150`}>
              {/* İkon kutusu */}
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.gradient} bg-opacity-10
                flex items-center justify-center text-2xl flex-shrink-0 shadow-sm`}>
                {cat.icon || '📁'}
              </div>
              {/* Metin */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 leading-snug group-hover:text-gray-900">
                  {cat.name}
                </p>
                {cat._count?.subjects > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">{cat._count.subjects} konu</p>
                )}
              </div>
              {/* Ok */}
              <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0 group-hover:translate-x-0.5 transition-transform"
                style={{width:16,height:16,flexShrink:0}}
                fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
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
            className={`${c.btn} text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition`}
          >
            Talep Detayı →
          </button>
          <button
            onClick={() => navigate('/itsm')}
            className="text-sm text-gray-500 hover:text-gray-700 px-5 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition"
          >
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
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition">
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
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all
                      ${selected
                        ? `${c.selCat} shadow-sm`
                        : 'border-gray-100 text-gray-700 hover:border-gray-200 hover:bg-gray-50'}`}>
                    {/* Radio circle */}
                    <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
                      ${selected ? 'border-current' : 'border-gray-300'}`}>
                      {selected && <span className="w-2 h-2 rounded-full bg-current block" />}
                    </span>
                    <span className="flex-1 text-sm font-medium">{subj.name}</span>
                    {subj.defaultGroup && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded flex-shrink-0">
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
          <div className="grid grid-cols-4 gap-2">
            {PRIORITIES.map(p => {
              const pc     = PRIORITY_COLORS[p.value];
              const active = form.priority === p.value;
              return (
                <button key={p.value} type="button" onClick={() => set('priority', p.value)}
                  className={`rounded-xl border-2 px-3 py-2.5 text-center transition
                    ${active
                      ? `${pc.bg} ${pc.text} ${pc.ring} ring-2 border-transparent font-semibold`
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  <div className="text-sm font-medium">{p.label}</div>
                  <div className="text-xs opacity-70 mt-0.5">SLA: {p.sla}</div>
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
            <div className="flex flex-wrap gap-2">
              {SOURCE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('source', opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm border-2 transition
                    ${form.source === opt.value
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                >
                  {opt.label}
                </button>
              ))}
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
                <div className="flex flex-wrap gap-2">
                  {[
                    { v: 'incident', l: '🔧 Arıza' },
                    { v: 'demand',   l: '📋 İstek' },
                    { v: 'complaint',l: '😠 Şikayet' },
                    { v: 'thanks',   l: '🙏 Teşekkür' },
                    { v: 'notice',   l: '📢 İhbar' },
                  ].map(({ v, l }) => (
                    <button key={v} type="button" onClick={() => setUbType(v)}
                      className={`px-3 py-1.5 rounded-lg text-sm border-2 transition
                        ${ubType === v ? 'border-blue-500 bg-blue-100 text-blue-700 font-semibold' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
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
            className={`${c.btn} text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition disabled:opacity-60`}>
            {loading ? 'Gönderiliyor…' : 'Başvuruyu Gönder'}
          </button>
          <button type="button" onClick={() => navigate('/itsm')}
            className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition">
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
    <div className="p-8 max-w-3xl">
      <StepIndicator step={step} submitType={submitType} />
      {step === 1 && <Step1TypeSelect onSelect={selectType} />}
      {step === 2 && <Step2CategorySelect submitType={submitType} onSelect={selectCat} onBack={backToStep1} />}
      {step === 3 && <Step3Form submitType={submitType} category={category} onBack={backToStep2} />}
    </div>
  );
}
