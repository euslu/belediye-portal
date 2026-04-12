import { useState, useEffect, useCallback } from 'react';
import AdminCategoriesPage from './SubjectManager';
import AdChangesPage from './AdChanges';
import { GS_WIDGET_TANIMLARI } from '../GenelSekreterDashboard';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || '';

function authFetch(url, opts = {}) {
  const token = localStorage.getItem('token');
  return fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts.headers },
  });
}

// ─── Yardımcı bileşenler ──────────────────────────────────────────────────────

function Field({ label, children, hint }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, type = 'text', placeholder, disabled }) {
  return (
    <input
      type={type} value={value ?? ''} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} disabled={disabled}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
    />
  );
}

function PasswordInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'} value={value ?? ''} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <button type="button" onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
        {show ? '🙈' : '👁️'}
      </button>
    </div>
  );
}

function Toggle({ value, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div onClick={() => onChange(!value)}
        className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${value ? 'bg-indigo-600' : 'bg-gray-300'}`}>
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-1'}`} />
      </div>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  );
}

function TestResult({ result }) {
  if (!result) return null;
  return (
    <div className={`mt-3 p-3 rounded-lg text-sm flex items-start gap-2 ${result.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
      <span>{result.success ? '✅' : '❌'}</span>
      <span>{result.message}{result.userCount !== undefined ? ` — ${result.userCount} kullanıcı bulundu` : ''}</span>
    </div>
  );
}

const BTN = {
  primary: { background:'#4f46e5', color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', fontSize:13, fontWeight:600, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6 },
  teal:    { background:'#0d9488', color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', fontSize:13, fontWeight:600, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6 },
  violet:  { background:'#7c3aed', color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', fontSize:13, fontWeight:600, cursor:'pointer' },
  outline: { background:'#fff',    color:'#374151', border:'1px solid #d1d5db', borderRadius:8, padding:'8px 18px', fontSize:13, fontWeight:500, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6 },
  sm:      { background:'#4f46e5', color:'#fff', border:'none', borderRadius:6, padding:'5px 12px', fontSize:12, fontWeight:600, cursor:'pointer' },
  gray:    { background:'#f1f5f9', color:'#475569', border:'1px solid #e2e8f0', borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:500, cursor:'pointer' },
};

function SaveButton({ onClick, loading }) {
  return (
    <button onClick={onClick} disabled={loading}
      style={{ ...BTN.primary, opacity: loading ? 0.6 : 1 }}>
      {loading ? 'Kaydediliyor…' : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          Kaydet
        </>
      )}
    </button>
  );
}

// ─── Sekmeler ─────────────────────────────────────────────────────────────────

// ─── ManageEngine SDP Entegrasyon Tabı ───────────────────────────────────────

function ManageEngineTab() {
  const [cfg, setCfg]           = useState({ url: 'https://epc.mugla.bel.tr:8383', apiKey: '', enabled: false });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [testing, setTesting]   = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showKey, setShowKey]   = useState(false);
  const [syncing, setSyncing]   = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API}/api/servicedesk/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.url) setCfg(p => ({ ...p, url: d.url }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true); setSaved(false);
    const token = localStorage.getItem('token');
    await fetch(`${API}/api/servicedesk/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sdp_url: cfg.url, sdp_api_key: cfg.apiKey, sdp_enabled: cfg.enabled }),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const test = async () => {
    setTesting(true); setTestResult(null);
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(`${API}/api/servicedesk/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sdp_url: cfg.url, sdp_api_key: cfg.apiKey }),
      });
      setTestResult(await r.json());
    } catch (e) { setTestResult({ success: false, message: e.message }); }
    setTesting(false);
  };

  const sync = async () => {
    setSyncing(true); setSyncResult(null);
    const token = localStorage.getItem('token');
    try {
      const r = await fetch(`${API}/api/servicedesk/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setSyncResult(await r.json());
    } catch (e) { setSyncResult({ success: false, error: e.message }); }
    setSyncing(false);
  };

  if (loading) return <div className="text-sm text-gray-400 p-2">Yükleniyor…</div>;

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">🖥️</span>
        <h3 className="text-base font-semibold text-gray-800">ManageEngine Endpoint Central</h3>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        EPC API v1.4 entegrasyonu — 1689 yönetilen bilgisayar, cihaz envanter senkronizasyonu.
      </p>

      <Field label="Aktif">
        <Toggle label="EPC entegrasyonu aktif" value={cfg.enabled} onChange={v => setCfg(p => ({ ...p, enabled: v }))} />
      </Field>
      <Field label="Sunucu URL">
        <Input value={cfg.url} onChange={v => setCfg(p => ({ ...p, url: v }))} placeholder="https://epc.mugla.bel.tr:8383" />
      </Field>
      <Field label="API Key">
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={cfg.apiKey}
            onChange={e => setCfg(p => ({ ...p, apiKey: e.target.value }))}
            placeholder="••••••••-••••-••••-••••-••••••••••••"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
          />
          <button type="button" onClick={() => setShowKey(v => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
            {showKey ? '🙈' : '👁'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">EPC Admin panelinden alınır. Bearer prefix olmadan gönderilir.</p>
      </Field>

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <button onClick={test} disabled={testing} style={{ ...BTN.teal, opacity: testing?0.6:1 }}>
          {testing ? '⟳ Test ediliyor…' : 'Bağlantıyı Test Et'}
        </button>
        <button onClick={sync} disabled={syncing} style={{ ...BTN.violet, opacity: syncing?0.6:1 }}>
          {syncing ? '⟳ Senkronize ediliyor…' : 'Senkronize Et'}
        </button>
        <button onClick={save} disabled={saving} style={{ ...BTN.primary, opacity: saving?0.6:1 }}>
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        {saved && <span className="text-sm text-green-600">✓ Kaydedildi</span>}
      </div>

      {testResult && (
        <div className={`mt-4 p-3 rounded-lg text-sm ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <p className={`font-medium ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
            {testResult.success ? '✅' : '❌'} {testResult.message}
          </p>
        </div>
      )}

      {syncResult && (
        <div className={`mt-3 p-3 rounded-lg text-sm ${syncResult.success ? 'bg-violet-50 border border-violet-200' : 'bg-red-50 border border-red-200'}`}>
          {syncResult.success ? (
            <p className="text-violet-800 font-medium">
              🔄 Sync tamamlandı — {syncResult.created} eklendi, {syncResult.updated} güncellendi, {syncResult.errors} hata
            </p>
          ) : (
            <p className="text-red-700">❌ {syncResult.error || syncResult.message}</p>
          )}
        </div>
      )}

      <div className="mt-5 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-500 space-y-1">
        <p>📡 Otomatik sync: <strong>Her gece 02:00</strong> (Türkiye saati)</p>
        <p>🖥️ Çalışan endpoint'ler: <code className="bg-white px-1 rounded">/api/1.4/som/computers</code>, <code className="bg-white px-1 rounded">/api/1.4/patch/allsystems</code></p>
      </div>
    </div>
  );
}

// ─── ulakBELL Entegrasyon Tabı ───────────────────────────────────────────────

function UlakbellTab() {
  const [cfg, setCfg] = useState({ url: '', token: '', sync: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API}/api/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(obj => {
        setCfg({
          url:   obj.ulakbell_url   || '',
          token: obj.ulakbell_token || '',
          sync:  obj.ulakbell_sync === 'true',
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true); setSaved(false);
    const token = localStorage.getItem('token');
    await fetch(`${API}/api/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        ulakbell_url:   cfg.url,
        ulakbell_token: cfg.token,
        ulakbell_sync:  String(cfg.sync),
      }),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const testConn = async () => {
    setTesting(true); setTestResult(null);
    try {
      const token = localStorage.getItem('token');
      const res  = await fetch(`${API}/api/ulakbell/test`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setTestResult(await res.json());
    } catch (err) {
      setTestResult({ ok: false, error: err.message });
    }
    setTesting(false);
  };

  if (loading) return <div className="text-sm text-gray-400 p-2">Yükleniyor…</div>;

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">🔔</span>
        <h3 className="text-base font-semibold text-gray-800">ulakBELL Entegrasyonu</h3>
      </div>
      <p className="text-sm text-gray-500 mb-5">ulakBELL platformu ile bağlantı yapılandırması.</p>

      <Field label="Ulakbell Aktif">
        <Toggle label="Otomatik gönderim aktif" value={cfg.sync} onChange={v => setCfg(p => ({ ...p, sync: v }))} />
        <p className="text-xs text-gray-400 mt-1">Açıkken yeni arıza bildirimleri ulakBELL'e otomatik iletilir.</p>
      </Field>

      <Field label="API URL" hint="Örn: https://mugla.ulakbell.com">
        <Input value={cfg.url} onChange={v => setCfg(p => ({ ...p, url: v }))} placeholder="https://______.ulakbell.com" />
      </Field>

      <Field label="API Token (Bearer)">
        <PasswordInput value={cfg.token} onChange={v => setCfg(p => ({ ...p, token: v }))} placeholder="Token bilginizi girin…" />
      </Field>

      <div className="flex items-center gap-3 flex-wrap mt-2">
        <button onClick={save} disabled={saving} style={{ ...BTN.primary, opacity: saving?0.6:1 }}>
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        <button onClick={testConn} disabled={testing} style={{ ...BTN.outline, opacity: testing?0.6:1 }}>
          {testing ? '⟳ Test ediliyor…' : 'Bağlantıyı Test Et'}
        </button>
        {saved && <span className="text-sm text-green-600">✓ Kaydedildi</span>}
      </div>

      {testResult && (
        <div className={`mt-4 p-3.5 rounded-xl text-sm flex items-start gap-2
          ${testResult.success
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'}`}>
          <span className="text-base mt-0.5">{testResult.success ? '✅' : '❌'}</span>
          <div>
            {testResult.success
              ? <strong>Bağlantı başarılı</strong>
              : <><strong>Bağlantı hatası</strong> — {testResult.message}</>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab listesi ─────────────────────────────────────────────────────────────

// ─── Servis Durumları Tabı ────────────────────────────────────────────────────

const SERVICE_LABELS = {
  SERVICE_STATUS_AD_SYNC:       { label: 'AD Senkronizasyonu',    icon: '🔄', runKey: 'ad-sync' },
  SERVICE_STATUS_BIRTHDAY_MAIL: { label: 'Doğum Günü Maili',      icon: '🎂', runKey: 'birthday-mail' },
  SERVICE_STATUS_WELCOME_MAIL:  { label: 'Hoş Geldiniz Maili',    icon: '📨', runKey: 'welcome-mail' },
  SERVICE_STATUS_EPC_SYNC:      { label: 'ManageEngine EPC Sync', icon: '🏗️', runKey: 'epc-sync' },
  SERVICE_STATUS_EMAIL_POLL:    { label: 'E-Posta Tarama',        icon: '📬', runKey: null },
};

function ServicesTab() {
  const [statuses, setStatuses] = useState({});
  const [loading, setLoading]   = useState(true);
  const [running, setRunning]   = useState({});

  const load = () => {
    const token = localStorage.getItem('token');
    setLoading(true);
    fetch(`${API}/api/services/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setStatuses)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const run = async (runKey) => {
    if (!runKey) return;
    setRunning(r => ({ ...r, [runKey]: true }));
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API}/api/services/run/${runKey}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      load();
    } catch { /* ignore */ }
    setRunning(r => ({ ...r, [runKey]: false }));
  };

  const statusColor = (s) => {
    if (!s || s === 'never') return 'bg-gray-100 text-gray-500';
    if (s === 'ok') return 'bg-green-100 text-green-700';
    if (s === 'warning') return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-semibold text-gray-800">Servis Durumları</h3>
        <button onClick={load} style={BTN.gray}>🔃 Yenile</button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Yükleniyor…</div>
      ) : (
        <div className="space-y-3">
          {Object.entries(SERVICE_LABELS).map(([key, meta]) => {
            const s = statuses[key] || {};
            return (
              <div key={key} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
                <span className="text-2xl">{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-800">{meta.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(s.status)}`}>
                      {s.status === 'ok' ? 'Başarılı' : s.status === 'warning' ? 'Uyarı' : s.status === 'never' ? 'Hiç çalışmadı' : s.status || '—'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{s.message || '—'}</p>
                  {s.lastRun && (
                    <p className="text-xs text-gray-300 mt-0.5">
                      Son çalışma: {new Date(s.lastRun).toLocaleString('tr-TR')}
                    </p>
                  )}
                </div>
                {meta.runKey && (
                  <button
                    onClick={() => run(meta.runKey)}
                    disabled={!!running[meta.runKey]}
                    style={{ background:'#eef2ff', color:'#4338ca', border:'1px solid #c7d2fe', borderRadius:8, padding:'6px 14px', fontSize:12, fontWeight:600, cursor:'pointer', opacity:running[meta.runKey]?0.5:1 }}
                  >
                    {running[meta.runKey] ? 'Çalışıyor…' : '▶ Çalıştır'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const TAB_GROUPS = [
  {
    title: 'SİSTEM',
    tabs: [
      { key: 'GENERAL', label: 'Genel' },
      { key: 'AD',      label: 'Aktif Dizin' },
    ],
  },
  {
    title: 'ENTEGRASYONLAR',
    tabs: [
      { key: 'SMTP',        label: 'E-Posta' },
      { key: 'PDKS',        label: 'PDKS' },
      { key: 'FLEXCITY',    label: 'FlexCity' },
      { key: 'ULAKBELL',    label: 'ulakBELL' },
      { key: 'MANAGEENGINE', label: 'ManageEngine EPC' },
    ],
  },
  {
    title: 'PORTAL',
    tabs: [
      { key: 'DASHBOARD',    label: 'Dashboard' },
      { key: 'GS_DASHBOARD', label: 'GS Paneli' },
      { key: 'ITSM',         label: 'ITSM / SLA' },
      { key: 'SUBJECTS',     label: 'Başvuru Konuları' },
      { key: 'AD_CHANGES',   label: 'AD Değişiklikleri' },
    ],
  },
  {
    title: 'YETKİLER',
    tabs: [
      { key: 'RBAC', label: 'Kullanıcı Yetkileri' },
    ],
  },
  {
    title: 'İZLEME',
    tabs: [
      { key: 'SERVICES', label: 'Servis Durumları' },
    ],
  },
];

// Flat list for compatibility
const TABS = TAB_GROUPS.flatMap(g => g.tabs);

// ─── Ana bileşen ──────────────────────────────────────────────────────────────

export default function Settings() {
  const { user } = useAuth();
  const sistemRol = user?.sistemRol;
  const isDaireBaskani = sistemRol === 'daire_baskani';
  // daire_baskani sadece YETKİLER sekmelerini görür, kendi dairesine filtreli
  const GORUNUR_TAB_GROUPS = isDaireBaskani
    ? TAB_GROUPS.filter(g => g.title === 'YETKİLER')
    : TAB_GROUPS;

  const [activeTab, setActiveTab] = useState(isDaireBaskani ? 'RBAC' : 'GENERAL');
  const [data, setData]           = useState({});
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting]     = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sla, setSla]             = useState({ sla_critical: '4', sla_high: '8', sla_medium: '24', sla_low: '72' });
  const [widgets, setWidgets]     = useState([]);
  const [roleWidgets, setRoleWidgets] = useState({ admin: [], manager: [], user: [] });

  // GS Dashboard widget görünürlük ayarları
  const [gsWidgetAyarlari, setGsWidgetAyarlari] = useState(() => {
    try {
      const kayitli = localStorage.getItem('gs_widget_ayarlari');
      if (kayitli) return JSON.parse(kayitli);
    } catch {}
    return Object.fromEntries(GS_WIDGET_TANIMLARI.map(w => [w.id, w.varsayilan]));
  });

  // RBAC state
  const [rbacSubTab, setRbacSubTab]           = useState('ROLLER');
  const [rbacKullanicilar, setRbacKullanicilar] = useState([]);
  const [rbacLoading, setRbacLoading]         = useState(false);
  const [rbacDirektorler, setRbacDirektorler] = useState([]);
  const [rbacFilter, setRbacFilter]           = useState({ directorate: '', rol: '', arama: '' });
  const [rbacDegisiklikler, setRbacDegisiklikler] = useState({});
  const [rbacKaydediliyor, setRbacKaydediliyor]   = useState({});
  const [calismaGruplari, setCalismaGruplari]     = useState([]);
  const [grupLoading, setGrupLoading]             = useState(false);
  const [yeniGrupModal, setYeniGrupModal]         = useState(false);
  const [yeniGrup, setYeniGrup]                   = useState({ ad: '', aciklama: '', department: '' });
  const [grupDaire, setGrupDaire]                 = useState('');
  const [grupDaireler, setGrupDaireler]           = useState([]);
  const [grupMudurlukleri, setGrupMudurlukleri]   = useState([]);
  const [grupAcik, setGrupAcik]                   = useState({});
  const [uyeEkleArama, setUyeEkleArama]           = useState({});
  const [liderAtaAcik, setLiderAtaAcik]           = useState({});

  const loadTab = useCallback(async (category) => {
    if (data[category] !== undefined) return;
    try {
      const r = await authFetch(`${API}/api/system-settings/${category}`);
      if (r.ok) {
        const json = await r.json();
        const flat = Object.fromEntries(Object.entries(json).map(([k, v]) => [k, v.value ?? '']));
        setData(prev => ({ ...prev, [category]: flat }));
      } else {
        setData(prev => ({ ...prev, [category]: {} }));
      }
    } catch {
      setData(prev => ({ ...prev, [category]: {} }));
    }
  }, [data]);

  useEffect(() => {
    if (activeTab === 'ITSM') {
      authFetch(`${API}/api/settings`).then(r => r.json()).then(d => setSla(prev => ({ ...prev, ...d }))).catch(() => {});
      loadTab('ITSM');
    } else if (activeTab === 'DASHBOARD') {
      loadDashboardData();
    } else if (activeTab === 'GS_DASHBOARD') {
      // localStorage tabanlı — API yüklemesi gerekmez
    } else if (activeTab === 'RBAC') {
      loadRbacKullanicilar();
      loadRbacDirektorler();
    } else {
      loadTab(activeTab);
    }
    setTestResult(null);
    setSaved(false);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'RBAC' && rbacSubTab === 'CALISMA_GRUPLARI') {
      loadCalismaGruplari();
    }
  }, [rbacSubTab, activeTab]);

  const loadRbacKullanicilar = async () => {
    setRbacLoading(true);
    try {
      const url = isDaireBaskani && user?.directorate
        ? `${API}/api/rbac/kullanicilar?directorate=${encodeURIComponent(user.directorate)}`
        : `${API}/api/rbac/kullanicilar`;
      const r = await authFetch(url);
      if (r.ok) setRbacKullanicilar(await r.json());
      // daire_baskani: filtre kendi daireye kilitlenir
      if (isDaireBaskani && user?.directorate) {
        setRbacFilter(prev => ({ ...prev, directorate: user.directorate }));
      }
    } catch {}
    setRbacLoading(false);
  };

  const loadRbacDirektorler = async () => {
    try {
      const r = await authFetch(`${API}/api/rbac/directorates`);
      if (r.ok) setRbacDirektorler(await r.json());
    } catch {}
  };

  const loadCalismaGruplari = async () => {
    setGrupLoading(true);
    try {
      const url = isDaireBaskani && user?.directorate
        ? `${API}/api/calisma-grubu?directorate=${encodeURIComponent(user.directorate)}`
        : `${API}/api/calisma-grubu`;
      const r = await authFetch(url);
      if (r.ok) setCalismaGruplari(await r.json());
    } catch {}
    setGrupLoading(false);
  };

  // Yeni grup modal açıldığında daireleri yükle
  useEffect(() => {
    if (!yeniGrupModal) return;
    const token = localStorage.getItem('token');
    fetch(`${API}/api/arge/daireler`, { headers: { Authorization: 'Bearer ' + token } })
      .then(r => r.json()).then(setGrupDaireler).catch(() => {});
  }, [yeniGrupModal]);

  // Daire seçilince müdürlükleri yükle
  useEffect(() => {
    if (!grupDaire) { setGrupMudurlukleri([]); return; }
    const token = localStorage.getItem('token');
    fetch(`${API}/api/arge/mudurlukleri?directorate=${encodeURIComponent(grupDaire)}`, {
      headers: { Authorization: 'Bearer ' + token },
    }).then(r => r.json()).then(setGrupMudurlukleri).catch(() => {});
  }, [grupDaire]);

  const rbacKullaniciKaydet = async (username) => {
    const yeniRol = rbacDegisiklikler[username];
    if (!yeniRol) return;
    setRbacKaydediliyor(p => ({ ...p, [username]: true }));
    try {
      const r = await authFetch(`${API}/api/rbac/kullanici/${username}`, {
        method: 'PUT', body: JSON.stringify({ rol: yeniRol, aktif: true }),
      });
      if (r.ok) {
        setRbacKullanicilar(prev => prev.map(u => u.username === username ? { ...u, sistemRol: yeniRol } : u));
        setRbacDegisiklikler(p => { const n = { ...p }; delete n[username]; return n; });
      }
    } catch {}
    setRbacKaydediliyor(p => ({ ...p, [username]: false }));
  };

  const calismaGrubuSil = async (id) => {
    await authFetch(`${API}/api/calisma-grubu/${id}`, { method: 'DELETE' });
    setCalismaGruplari(prev => prev.filter(g => g.id !== id));
  };

  const uyeEkle = async (grupId, kullanici) => {
    const r = await authFetch(`${API}/api/calisma-grubu/${grupId}/uye`, {
      method: 'POST', body: JSON.stringify({ username: kullanici.username, displayName: kullanici.displayName, rol: 'uye' }),
    });
    if (r.ok) {
      const uye = await r.json();
      setCalismaGruplari(prev => prev.map(g => g.id === grupId ? { ...g, uyeler: [...g.uyeler.filter(u => u.username !== kullanici.username), uye] } : g));
    }
    setUyeEkleArama(p => ({ ...p, [grupId]: '' }));
  };

  const uyeCikar = async (grupId, username) => {
    await authFetch(`${API}/api/calisma-grubu/${grupId}/uye/${username}`, { method: 'DELETE' });
    setCalismaGruplari(prev => prev.map(g => g.id === grupId ? { ...g, uyeler: g.uyeler.filter(u => u.username !== username) } : g));
  };

  const liderAta = async (grupId, kullanici) => {
    await authFetch(`${API}/api/calisma-grubu/${grupId}/lider`, {
      method: 'PUT', body: JSON.stringify({ username: kullanici.username, displayName: kullanici.displayName }),
    });
    setCalismaGruplari(prev => prev.map(g => g.id === grupId
      ? { ...g, lider: kullanici.username, liderAd: kullanici.displayName, uyeler: g.uyeler.map(u => ({ ...u, rol: u.username === kullanici.username ? 'lider' : (u.rol === 'lider' ? 'uye' : u.rol) })) }
      : g
    ));
    setLiderAtaAcik(p => ({ ...p, [grupId]: false }));
  };

  const yeniGrupKaydet = async () => {
    if (!yeniGrup.ad.trim()) return;
    const r = await authFetch(`${API}/api/calisma-grubu`, {
      method: 'POST', body: JSON.stringify(yeniGrup),
    });
    if (r.ok) {
      const grup = await r.json();
      setCalismaGruplari(prev => [grup, ...prev]);
      setYeniGrupModal(false);
      setYeniGrup({ ad: '', aciklama: '', department: '' });
      setGrupDaire('');
      setGrupMudurlukleri([]);
    }
  };

  const loadDashboardData = async () => {
    try {
      const wRes = await authFetch(`${API}/api/dashboard/widgets`);
      if (wRes.ok) setWidgets(await wRes.json());
      const [adminRes, managerRes] = await Promise.all([
        authFetch(`${API}/api/dashboard/role-config/admin`),
        authFetch(`${API}/api/dashboard/role-config/manager`),
      ]);
      const adminData   = adminRes.ok   ? await adminRes.json()   : null;
      const managerData = managerRes.ok ? await managerRes.json() : null;
      setRoleWidgets(prev => ({
        ...prev,
        ...(adminData   ? { admin:   adminData }   : {}),
        ...(managerData ? { manager: managerData } : {}),
      }));
    } catch {}
  };

  const set = (key, value) => {
    setData(prev => ({ ...prev, [activeTab]: { ...(prev[activeTab] || {}), [key]: value } }));
  };
  const get = (key, def = '') => data[activeTab]?.[key] ?? def;

  const save = async () => {
    setSaving(true); setSaved(false);
    try {
      const r = await authFetch(`${API}/api/system-settings/${activeTab}`, {
        method: 'POST', body: JSON.stringify(data[activeTab] || {}),
      });
      if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    } finally { setSaving(false); }
  };

  const saveSla = async () => {
    setSaving(true);
    try {
      await authFetch(`${API}/api/settings`, { method: 'PATCH', body: JSON.stringify(sla) });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  const testAd = async () => {
    setTesting(true); setTestResult(null);
    try {
      const r = await authFetch(`${API}/api/system-settings/test/ad`, { method: 'POST', body: JSON.stringify(data.AD || {}) });
      setTestResult(await r.json());
    } catch (e) { setTestResult({ success: false, message: e.message }); }
    finally { setTesting(false); }
  };

  const testSmtp = async () => {
    setTesting(true); setTestResult(null);
    try {
      const r = await authFetch(`${API}/api/system-settings/test/smtp`, {
        method: 'POST', body: JSON.stringify({ ...(data.SMTP || {}), test_email: testEmail }),
      });
      setTestResult(await r.json());
    } catch (e) { setTestResult({ success: false, message: e.message }); }
    finally { setTesting(false); }
  };

  const testPdks = async () => {
    setTesting(true); setTestResult(null);
    try {
      const r = await authFetch(`${API}/api/pdks/test`, { method: 'POST', body: JSON.stringify(data.PDKS || {}) });
      const json = await r.json();
      setTestResult(json);
    } catch (e) { setTestResult({ success: false, message: e.message }); }
    finally { setTesting(false); }
  };

  const toggleRoleWidget = (role, key) => {
    setRoleWidgets(prev => {
      const cur = prev[role] || [];
      return { ...prev, [role]: cur.includes(key) ? cur.filter(k => k !== key) : [...cur, key] };
    });
  };

  const saveRoleWidgets = async (role) => {
    await authFetch(`${API}/api/dashboard/role-config/${role}`, {
      method: 'POST', body: JSON.stringify(roleWidgets[role]),
    });
    setSaved(true); setTimeout(() => setSaved(false), 3000);
  };

  // ─── Tab içerikleri ─────────────────────────────────────────────────────────

  const renderGeneral = () => (
    <div className="max-w-lg">
      <h3 className="text-base font-semibold text-gray-800 mb-5">Genel Ayarlar</h3>
      <Field label="Kurum Adı">
        <Input value={get('institution_name')} onChange={v => set('institution_name', v)} placeholder="Muğla Büyükşehir Belediyesi" />
      </Field>
      <Field label="Varsayılan Dil">
        <select value={get('default_language', 'tr')} onChange={e => set('default_language', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="tr">Türkçe</option>
          <option value="en">English</option>
        </select>
      </Field>
      <Field label="Oturum Süresi (dakika)" hint="Kullanıcı bu süre sonunda otomatik çıkış yapar">
        <Input value={get('session_timeout', '480')} onChange={v => set('session_timeout', v)} type="number" placeholder="480" />
      </Field>
      <Field label="Uygulama URL'i">
        <Input value={get('app_url')} onChange={v => set('app_url', v)} placeholder="http://portal.mugla.bel.tr" />
      </Field>
      <div className="pt-2 flex items-center gap-3">
        <SaveButton onClick={save} loading={saving} />
        {saved && <span className="text-sm text-green-600">✓ Kaydedildi</span>}
      </div>
    </div>
  );

  const renderAd = () => (
    <div className="max-w-lg">
      <h3 className="text-base font-semibold text-gray-800 mb-5">Aktif Dizin (LDAP) Ayarları</h3>
      <Field label="AD Sunucu URL">
        <Input value={get('ad_url')} onChange={v => set('ad_url', v)} placeholder="ldap://10.30.40.50" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Host IP">
          <Input value={get('ad_host')} onChange={v => set('ad_host', v)} placeholder="10.30.40.50" />
        </Field>
        <Field label="Port">
          <div className="flex gap-4 pt-2">
            {[['389', '389 (Normal)'], ['636', '636 (SSL)']].map(([val, lbl]) => (
              <label key={val} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input type="radio" value={val} checked={get('ad_port', '389') === val} onChange={() => set('ad_port', val)} className="text-indigo-600" />
                {lbl}
              </label>
            ))}
          </div>
        </Field>
      </div>
      <Field label="Domain">
        <Input value={get('ad_domain')} onChange={v => set('ad_domain', v)} placeholder="muglabb.lcl" />
      </Field>
      <Field label="Base DN">
        <Input value={get('ad_base_dn')} onChange={v => set('ad_base_dn', v)} placeholder="DC=muglabb,DC=lcl" />
      </Field>
      <Field label="Servis Hesabı">
        <Input value={get('ad_username')} onChange={v => set('ad_username', v)} placeholder="servis.test" />
      </Field>
      <Field label="Şifre">
        <PasswordInput value={get('ad_password')} onChange={v => set('ad_password', v)} placeholder="••••••••" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Admin Grubu">
          <Input value={get('ad_admin_group')} onChange={v => set('ad_admin_group', v)} placeholder="Domain Admins" />
        </Field>
        <Field label="Yönetici Grubu">
          <Input value={get('ad_manager_group')} onChange={v => set('ad_manager_group', v)} placeholder="paylasim_BI_yonetici_WR" />
        </Field>
      </div>
      <Field label="Mock Auth (Geliştirme Modu)" hint="Açıkken gerçek AD yerine test hesapları kullanılır">
        <Toggle
          value={get('mock_auth', 'false') === 'true'}
          onChange={v => set('mock_auth', v ? 'true' : 'false')}
          label={get('mock_auth', 'false') === 'true' ? 'Açık — test hesapları aktif' : 'Kapalı — gerçek AD'}
        />
      </Field>
      <div className="flex items-center gap-3 pt-2 flex-wrap">
        <button onClick={testAd} disabled={testing} style={{ ...BTN.teal, opacity: testing?0.6:1 }}>
          {testing ? 'Test ediliyor…' : 'Bağlantıyı Test Et'}
        </button>
        <SaveButton onClick={save} loading={saving} />
        {saved && <span className="text-sm text-green-600">✓ Kaydedildi</span>}
      </div>
      <TestResult result={testResult} />
    </div>
  );

  const renderSmtp = () => (
    <div className="max-w-lg">
      <h3 className="text-base font-semibold text-gray-800 mb-5">E-Posta (SMTP) Ayarları</h3>
      <div className="grid grid-cols-2 gap-3">
        <Field label="SMTP Host">
          <Input value={get('smtp_host')} onChange={v => set('smtp_host', v)} placeholder="mail.mugla.bel.tr" />
        </Field>
        <Field label="Port">
          <Input value={get('smtp_port', '587')} onChange={v => set('smtp_port', v)} type="number" placeholder="587" />
        </Field>
      </div>
      <Field label="Kullanıcı Adı">
        <Input value={get('smtp_user')} onChange={v => set('smtp_user', v)} placeholder="servis.test@muglabb.lcl" />
      </Field>
      <Field label="Şifre">
        <PasswordInput value={get('smtp_pass')} onChange={v => set('smtp_pass', v)} placeholder="••••••••" />
      </Field>
      <Field label="Gönderen">
        <Input value={get('smtp_from')} onChange={v => set('smtp_from', v)} placeholder="Muğla BB Portal <portal@mugla.bel.tr>" />
      </Field>
      <Field label="Mail Gönderimi Aktif">
        <Toggle value={get('mail_enabled', 'false') === 'true'} onChange={v => set('mail_enabled', v ? 'true' : 'false')} label={get('mail_enabled', 'false') === 'true' ? 'Aktif' : 'Pasif'} />
      </Field>

      <div className="border-t border-gray-100 my-5" />
      <h3 className="text-base font-semibold text-gray-800 mb-1">IMAP — E-posta ile Ticket Oluşturma</h3>
      <p className="text-xs text-gray-400 mb-4">Belirtilen posta kutusunu 5 dakikada bir tarar, okunmamış e-postalardan otomatik ticket oluşturur.</p>
      <Field label="IMAP Aktif">
        <Toggle value={get('imap_enabled', 'false') === 'true'} onChange={v => set('imap_enabled', v ? 'true' : 'false')} label={get('imap_enabled', 'false') === 'true' ? 'Aktif' : 'Pasif'} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="IMAP Host">
          <Input value={get('imap_host')} onChange={v => set('imap_host', v)} placeholder="imap.mugla.bel.tr" />
        </Field>
        <Field label="Port">
          <Input value={get('imap_port', '993')} onChange={v => set('imap_port', v)} type="number" placeholder="993" />
        </Field>
      </div>
      <Field label="Kullanıcı Adı (e-posta)">
        <Input value={get('imap_user')} onChange={v => set('imap_user', v)} placeholder="destek@mugla.bel.tr" />
      </Field>
      <Field label="Şifre">
        <PasswordInput value={get('imap_pass')} onChange={v => set('imap_pass', v)} placeholder="••••••••" />
      </Field>
      <Field label="Klasör">
        <Input value={get('imap_mailbox', 'INBOX')} onChange={v => set('imap_mailbox', v)} placeholder="INBOX" />
      </Field>

      <div className="border-t border-gray-100 my-5" />
      <h4 className="text-sm font-semibold text-gray-700 mb-3">Test Maili Gönder</h4>
      <div className="flex gap-2">
        <input value={testEmail} onChange={e => setTestEmail(e.target.value)}
          placeholder="test@example.com" type="email"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <button onClick={testSmtp} disabled={testing} style={{ ...BTN.teal, opacity: testing?0.6:1, whiteSpace:'nowrap' }}>
          {testing ? '…' : 'Gönder'}
        </button>
      </div>
      <TestResult result={testResult} />

      <div className="border-t border-gray-100 my-5" />
      <h4 className="text-sm font-semibold text-gray-700 mb-3">Grup Mail Adresleri</h4>
      {[
        ['group_mail_ag',        'Ağ ve Altyapı'],
        ['group_mail_donanim',   'Donanım Destek'],
        ['group_mail_yazilim',   'Yazılım Geliştirme'],
        ['group_mail_guvenlik',  'Güvenlik'],
        ['group_mail_sunucu',    'Sunucu ve Sistem'],
        ['group_mail_kullanici', 'Kullanıcı Destek'],
      ].map(([key, label]) => (
        <Field key={key} label={label}>
          <Input value={get(key)} onChange={v => set(key, v)} placeholder={`${label.split(' ')[0].toLowerCase()}@mugla.bel.tr`} />
        </Field>
      ))}
      <div className="pt-2 flex items-center gap-3">
        <SaveButton onClick={save} loading={saving} />
        {saved && <span className="text-sm text-green-600">✓ Kaydedildi</span>}
      </div>
    </div>
  );

  const renderPdks = () => (
    <div className="max-w-lg">
      <h3 className="text-base font-semibold text-gray-800 mb-5">PDKS Veritabanı Entegrasyonu</h3>
      <Field label="PDKS Aktif">
        <Toggle value={get('pdks_enabled', 'false') === 'true'} onChange={v => set('pdks_enabled', v ? 'true' : 'false')} label={get('pdks_enabled', 'false') === 'true' ? 'Aktif' : 'Pasif'} />
      </Field>
      <Field label="Veritabanı Tipi">
        <div className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
          Microsoft SQL Server (MSSQL)
        </div>
      </Field>
      <Field label="Host / Sunucu">
        <Input value={get('pdks_host')} onChange={v => set('pdks_host', v)} placeholder="10.100.0.159" />
      </Field>
      <Field label="Port">
        <Input value={get('pdks_port', '1433')} onChange={v => set('pdks_port', v)} placeholder="1433" />
      </Field>
      <Field label="Instance (opsiyonel)">
        <Input value={get('pdks_instance', '')} onChange={v => set('pdks_instance', v)} placeholder="SQLEXPRESS (named instance varsa)" />
      </Field>
      <Field label="Veritabanı Adı">
        <Input value={get('pdks_db')} onChange={v => set('pdks_db', v)} placeholder="PDKS" />
      </Field>
      <Field label="Kullanıcı Adı">
        <Input value={get('pdks_user')} onChange={v => set('pdks_user', v)} placeholder="ethem.usluoglu" />
      </Field>
      <Field label="Şifre">
        <PasswordInput value={get('pdks_password')} onChange={v => set('pdks_password', v)} placeholder="••••••••" />
      </Field>
      <div className="flex items-center gap-3 pt-2">
        <button onClick={testPdks} disabled={testing} style={{ ...BTN.teal, opacity: testing?0.6:1 }}>
          {testing ? 'Test ediliyor…' : 'Bağlantıyı Test Et'}
        </button>
        <SaveButton onClick={save} loading={saving} />
        {saved && <span className="text-sm text-green-600">✓ Kaydedildi</span>}
      </div>
      {testResult && (
        <div className={`mt-4 p-3 rounded-lg text-sm ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <p className={`font-medium ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
            {testResult.success ? '✅' : '❌'} {testResult.message}
          </p>
          {testResult.success && testResult.tables?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-gray-600 mb-1">Bulunan tablolar ({testResult.tables.length}):</p>
              <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                {testResult.tables.map(t => (
                  <span key={t} className="px-2 py-0.5 bg-white border border-green-200 rounded text-xs text-gray-700 font-mono">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <p className="text-xs text-gray-400 mt-4">
        Instance adı yalnızca named instance kullanıyorsanız gereklidir (örn. SQLEXPRESS).
        Named instance kullanılırsa Port alanı göz ardı edilir.
      </p>
    </div>
  );

  const renderFlexcity = () => (
    <div className="max-w-lg">
      <h3 className="text-base font-semibold text-gray-800 mb-5">FlexCity Entegrasyonu</h3>
      <Field label="FlexCity Aktif">
        <Toggle value={get('flexcity_enabled', 'false') === 'true'} onChange={v => set('flexcity_enabled', v ? 'true' : 'false')} label={get('flexcity_enabled', 'false') === 'true' ? 'Aktif' : 'Pasif'} />
      </Field>
      <Field label="API URL">
        <Input value={get('flexcity_url')} onChange={v => set('flexcity_url', v)} placeholder="https://flexcity.mugla.bel.tr/api" />
      </Field>
      <Field label="API Key">
        <PasswordInput value={get('flexcity_api_key')} onChange={v => set('flexcity_api_key', v)} placeholder="••••••••" />
      </Field>
      <Field label="Tenant ID">
        <Input value={get('flexcity_tenant_id')} onChange={v => set('flexcity_tenant_id', v)} placeholder="mugla-bb" />
      </Field>
      <div className="pt-2 flex items-center gap-3">
        <SaveButton onClick={save} loading={saving} />
        {saved && <span className="text-sm text-green-600">✓ Kaydedildi</span>}
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div>
      <h3 className="text-base font-semibold text-gray-800 mb-2">Dashboard Widget Ayarları</h3>
      <p className="text-sm text-gray-500 mb-6">Her rol için hangi widget'ların varsayılan açık geleceğini belirleyin. Kullanıcılar kendi tercihlerini değiştirebilir.</p>
      {[['admin', '🔑 Admin'], ['manager', '👔 Yönetici'], ['user', '👤 Kullanıcı']].map(([role, label]) => {
        const roleWList = widgets.filter(w => w.roles.split(',').includes(role));
        if (!roleWList.length) return null;
        return (
          <div key={role} className="mb-7">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">{label} — Varsayılan Widgetlar</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
              {roleWList.map(w => (
                <label key={w.key} className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                  <input type="checkbox"
                    checked={(roleWidgets[role] || []).includes(w.key)}
                    onChange={() => toggleRoleWidget(role, w.key)}
                    className="rounded text-indigo-600" />
                  <span className="text-sm">{w.icon} {w.name}</span>
                </label>
              ))}
            </div>
            <button onClick={() => saveRoleWidgets(role)} style={BTN.sm}>
              {label} varsayılanlarını kaydet
            </button>
          </div>
        );
      })}
      {saved && <p className="text-sm text-green-600 mt-2">✓ Kaydedildi</p>}
    </div>
  );

  const renderItsm = () => (
    <div className="max-w-lg">
      <h3 className="text-base font-semibold text-gray-800 mb-5">ITSM / SLA Ayarları</h3>
      <p className="text-sm text-gray-500 mb-4">Ticket önceliklerine göre maksimum çözüm süresi (saat)</p>
      <div className="grid grid-cols-2 gap-4">
        {[['sla_critical','🔴 Kritik','4'],['sla_high','🟠 Yüksek','8'],['sla_medium','🟡 Orta','24'],['sla_low','🟢 Düşük','72']].map(([key, label, def]) => (
          <Field key={key} label={label} hint="saat">
            <Input value={sla[key] ?? def} onChange={v => setSla(prev => ({ ...prev, [key]: v }))} type="number" placeholder={def} />
          </Field>
        ))}
      </div>
      <div className="border-t border-gray-100 my-5" />
      <h4 className="text-sm font-semibold text-gray-700 mb-3">Diğer Ayarlar</h4>
      <Field label="Maks. Ek Dosya Boyutu (MB)">
        <Input value={get('max_attachment_mb', '10')} onChange={v => set('max_attachment_mb', v)} type="number" placeholder="10" />
      </Field>
      <Field label="Otomatik Kapanma (gün)" hint="Çözüldükten bu gün sonra ticket otomatik kapanır. 0 = devre dışı">
        <Input value={get('auto_close_days', '7')} onChange={v => set('auto_close_days', v)} type="number" placeholder="7" />
      </Field>
      <Field label="SLA Bildirim Tekrarı (saat)" hint="SLA yaklaşırken kaç saatte bir bildirim gönderilsin">
        <Input value={get('notify_interval_hours', '2')} onChange={v => set('notify_interval_hours', v)} type="number" placeholder="2" />
      </Field>
      <div className="pt-2 flex items-center gap-3">
        <button onClick={saveSla} disabled={saving} style={{ ...BTN.primary, opacity: saving?0.6:1 }}>
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        {saved && <span className="text-sm text-green-600">✓ Kaydedildi</span>}
      </div>
    </div>
  );

  const renderUlakbell = () => <UlakbellTab />;

  const renderManageengine = () => <ManageEngineTab />;
  const renderServices     = () => <ServicesTab />;

  const toggleGsWidget = (id) => {
    const yeni = { ...gsWidgetAyarlari, [id]: !gsWidgetAyarlari[id] };
    setGsWidgetAyarlari(yeni);
    localStorage.setItem('gs_widget_ayarlari', JSON.stringify(yeni));
  };

  const renderGsDashboard = () => (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Genel Sekreter Dashboard Widget'ları</h3>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
        Hangi widget'ların Genel Sekreter panosunda görüneceğini ayarlayın.
        Ayarlar tarayıcıda saklanır; her kullanıcı kendi tercihini belirler.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {GS_WIDGET_TANIMLARI.map(widget => {
          const aktif = gsWidgetAyarlari[widget.id] !== false;
          return (
            <div key={widget.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 18px',
              border: aktif ? '1.5px solid #86efac' : '1.5px solid #e2e8f0',
              borderRadius: 12,
              background: aktif ? '#f0fdf4' : '#f8fafc',
              opacity: aktif ? 1 : 0.75,
              transition: 'all .15s',
              cursor: 'default',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{widget.ikon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{widget.baslik}</div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 3, lineHeight: 1.4 }}>{widget.aciklama}</div>
                </div>
              </div>
              {/* Toggle — div kullanılıyor (button'da overflow:hidden sorunu) */}
              <div
                onClick={() => toggleGsWidget(widget.id)}
                style={{
                  width: 48, height: 26, borderRadius: 13,
                  background: aktif ? '#43DC80' : '#cbd5e1',
                  cursor: 'pointer', position: 'relative',
                  transition: 'background 0.25s', flexShrink: 0, marginLeft: 16,
                  border: aktif ? '2px solid #2ecc71' : '2px solid #94a3b8',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{
                  position: 'absolute', top: 1,
                  left: aktif ? 22 : 1,
                  width: 20, height: 20, borderRadius: '50%',
                  background: '#ffffff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
                  transition: 'left 0.25s',
                }} />
              </div>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 16 }}>
        💡 Değişiklikler Genel Sekreter panelinde anında yansır (sayfa yenilendiğinde).
      </p>
    </div>
  );

  // ─── RBAC rol badge ───────────────────────────────────────────────────────────
  const ROL_BADGE = {
    admin:         { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5', label: 'Admin' },
    daire_baskani: { bg: '#f3e8ff', color: '#9333ea', border: '#d8b4fe', label: 'Daire Başkanı' },
    mudur:         { bg: '#eff6ff', color: '#1d4ed8', border: '#93c5fd', label: 'Müdür' },
    sef:           { bg: '#fff7ed', color: '#c2410c', border: '#fdba74', label: 'Şef' },
    personel:      { bg: '#f0fdf4', color: '#15803d', border: '#86efac', label: 'Personel' },
  };

  const RolBadge = ({ rol }) => {
    const s = ROL_BADGE[rol] || ROL_BADGE.personel;
    return (
      <span style={{ display:'inline-block', padding:'2px 10px', borderRadius:99, fontSize:11, fontWeight:600, background:s.bg, color:s.color, border:`1px solid ${s.border}` }}>
        {s.label}
      </span>
    );
  };

  const renderRbac = () => {
    // --- Kullanıcı Rolleri alt sekmesi ---
    const filtreliKullanicilar = rbacKullanicilar.filter(u => {
      if (rbacFilter.directorate && u.directorate !== rbacFilter.directorate) return false;
      if (rbacFilter.rol && (rbacDegisiklikler[u.username] || u.sistemRol) !== rbacFilter.rol) return false;
      if (rbacFilter.arama) {
        const q = rbacFilter.arama.toLowerCase();
        if (!u.displayName?.toLowerCase().includes(q) && !u.username?.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    const rolSayilari = Object.fromEntries(['admin','daire_baskani','mudur','sef','personel'].map(r => [
      r, rbacKullanicilar.filter(u => (rbacDegisiklikler[u.username] || u.sistemRol) === r).length
    ]));

    // --- Çalışma grupları ---
    const uyeListesiKullanicilar = rbacKullanicilar; // ad arama için

    return (
      <div>
        {/* Alt sekme bar */}
        <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'1px solid #e2e8f0', paddingBottom:0 }}>
          {[['ROLLER','👥 Kullanıcı Rolleri'],['CALISMA_GRUPLARI','🏢 Çalışma Grupları']].map(([key, label]) => (
            <button key={key} onClick={() => setRbacSubTab(key)} style={{
              padding:'8px 18px', fontSize:13, fontWeight: rbacSubTab===key ? 600 : 400,
              border:'none', background:'transparent', cursor:'pointer',
              borderBottom: rbacSubTab===key ? '2.5px solid #6366f1' : '2.5px solid transparent',
              color: rbacSubTab===key ? '#6366f1' : '#64748b', transition:'all .15s',
            }}>{label}</button>
          ))}
        </div>

        {rbacSubTab === 'ROLLER' && (
          <div>
            {/* Özet kartlar */}
            <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
              {['admin','daire_baskani','mudur','sef','personel'].map(r => {
                const s = ROL_BADGE[r];
                const aktif = rbacFilter.rol === r;
                return (
                  <div key={r} onClick={() => setRbacFilter(f => ({ ...f, rol: aktif ? '' : r }))}
                    style={{ padding:'10px 16px', borderRadius:10, border:`1.5px solid ${aktif ? s.border : '#e2e8f0'}`, background: aktif ? s.bg : '#fff', cursor:'pointer', minWidth:90, textAlign:'center', transition:'all .15s' }}>
                    <div style={{ fontSize:18, fontWeight:700, color:s.color }}>{rolSayilari[r] ?? 0}</div>
                    <div style={{ fontSize:11, color: aktif ? s.color : '#64748b', fontWeight: aktif ? 600 : 400 }}>{s.label}</div>
                  </div>
                );
              })}
              {rbacFilter.rol && (
                <button onClick={() => setRbacFilter(f => ({ ...f, rol:'' }))} style={{ padding:'10px 12px', borderRadius:10, border:'1px dashed #cbd5e1', background:'transparent', cursor:'pointer', fontSize:12, color:'#94a3b8' }}>
                  ✕ Filtre temizle
                </button>
              )}
            </div>

            {/* Filtreler */}
            <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
              <select value={rbacFilter.directorate} onChange={e => setRbacFilter(f => ({ ...f, directorate:e.target.value }))}
                disabled={isDaireBaskani}
                style={{ padding:'7px 12px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:13, color:'#374151', background: isDaireBaskani ? '#f1f5f9' : '#fff', minWidth:180 }}>
                <option value="">Tüm Daireler</option>
                {rbacDirektorler.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={rbacFilter.rol} onChange={e => setRbacFilter(f => ({ ...f, rol:e.target.value }))}
                style={{ padding:'7px 12px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:13, color:'#374151', background:'#fff' }}>
                <option value="">Tüm Roller</option>
                {['admin','daire_baskani','mudur','sef','personel'].map(r => <option key={r} value={r}>{ROL_BADGE[r].label}</option>)}
              </select>
              <input value={rbacFilter.arama} onChange={e => setRbacFilter(f => ({ ...f, arama:e.target.value }))}
                placeholder="İsim veya kullanıcı adı ara…"
                style={{ padding:'7px 12px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:13, color:'#374151', flex:1, minWidth:200 }} />
              <button onClick={loadRbacKullanicilar} style={{ padding:'7px 14px', borderRadius:8, border:'1px solid #e2e8f0', background:'#f8fafc', cursor:'pointer', fontSize:12, color:'#64748b' }}>
                🔃 Yenile
              </button>
            </div>

            {/* Tablo */}
            {rbacLoading ? (
              <div style={{ padding:40, textAlign:'center', color:'#94a3b8', fontSize:14 }}>Yükleniyor…</div>
            ) : (
              <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', overflow:'hidden' }}>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                    <thead>
                      <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
                        {['Ad Soyad','Kullanıcı Adı','Daire','Müdürlük','Unvan','Rol',''].map((h,i) => (
                          <th key={i} style={{ padding:'10px 12px', textAlign:'left', fontWeight:600, color:'#64748b', fontSize:11, letterSpacing:'0.05em', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtreliKullanicilar.slice(0, 200).map((u, idx) => {
                        const mevcutRol = rbacDegisiklikler[u.username] || u.sistemRol;
                        const degisti   = !!rbacDegisiklikler[u.username];
                        return (
                          <tr key={u.username} style={{ borderBottom:'1px solid #f1f5f9', background: idx%2===0 ? '#fff':'#fafafa' }}>
                            <td style={{ padding:'9px 12px', fontWeight:500, color:'#1e293b' }}>{u.displayName || u.username}</td>
                            <td style={{ padding:'9px 12px', color:'#64748b', fontFamily:'monospace', fontSize:12 }}>{u.username}</td>
                            <td style={{ padding:'9px 12px', color:'#64748b', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.directorate || '—'}</td>
                            <td style={{ padding:'9px 12px', color:'#64748b', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.department || '—'}</td>
                            <td style={{ padding:'9px 12px', color:'#94a3b8', fontSize:11, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.title || '—'}</td>
                            <td style={{ padding:'9px 12px' }}>
                              <select
                                value={mevcutRol}
                                onChange={e => {
                                  const yeni = e.target.value;
                                  if (yeni === u.sistemRol) {
                                    setRbacDegisiklikler(p => { const n={...p}; delete n[u.username]; return n; });
                                  } else {
                                    setRbacDegisiklikler(p => ({ ...p, [u.username]: yeni }));
                                  }
                                }}
                                style={{
                                  padding:'4px 8px', borderRadius:6, fontSize:12, fontWeight:600,
                                  border: degisti ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                                  background: degisti ? '#fffbeb' : ROL_BADGE[mevcutRol]?.bg || '#f8fafc',
                                  color: ROL_BADGE[mevcutRol]?.color || '#374151',
                                  cursor:'pointer',
                                }}
                              >
                                {['admin','daire_baskani','mudur','sef','personel'].map(r => (
                                  <option key={r} value={r}>{ROL_BADGE[r].label}</option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding:'9px 12px' }}>
                              {degisti && (
                                <button onClick={() => rbacKullaniciKaydet(u.username)} disabled={rbacKaydediliyor[u.username]}
                                  style={{ padding:'4px 12px', borderRadius:6, border:'none', background:'#6366f1', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', opacity:rbacKaydediliyor[u.username]?0.6:1 }}>
                                  {rbacKaydediliyor[u.username] ? '…' : 'Kaydet'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {filtreliKullanicilar.length === 0 && !rbacLoading && (
                        <tr><td colSpan={7} style={{ padding:32, textAlign:'center', color:'#94a3b8' }}>Sonuç bulunamadı</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {filtreliKullanicilar.length > 200 && (
                  <div style={{ padding:'8px 16px', fontSize:12, color:'#94a3b8', borderTop:'1px solid #f1f5f9' }}>
                    {filtreliKullanicilar.length} kayıt — ilk 200 gösteriliyor. Daraltmak için filtre kullanın.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {rbacSubTab === 'CALISMA_GRUPLARI' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:'#1e293b' }}>Çalışma Grupları</div>
                <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>Müdürlük bazlı çalışma grupları ve takım liderleri</div>
              </div>
              <button onClick={() => setYeniGrupModal(true)}
                style={{ padding:'8px 16px', borderRadius:8, border:'none', background:'#6366f1', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                + Yeni Grup
              </button>
            </div>

            {/* Yeni grup modal */}
            {yeniGrupModal && (
              <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}
                onClick={e => { if(e.target===e.currentTarget) setYeniGrupModal(false); }}>
                <div style={{ background:'#fff', borderRadius:16, padding:28, width:420, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
                  <div style={{ fontWeight:700, fontSize:16, color:'#1e293b', marginBottom:16 }}>Yeni Çalışma Grubu</div>
                  <div style={{ marginBottom:12 }}>
                    <label style={{ fontSize:12, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>Grup Adı *</label>
                    <input value={yeniGrup.ad} onChange={e => setYeniGrup(p=>({...p,ad:e.target.value}))}
                      placeholder="Örn: Ağ Altyapı Ekibi"
                      style={{ width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:13, boxSizing:'border-box' }} />
                  </div>
                  <div style={{ marginBottom:12 }}>
                    <label style={{ fontSize:12, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>Açıklama</label>
                    <input value={yeniGrup.aciklama} onChange={e => setYeniGrup(p=>({...p,aciklama:e.target.value}))}
                      placeholder="Kısa açıklama…"
                      style={{ width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:13, boxSizing:'border-box' }} />
                  </div>
                  <div style={{ marginBottom:12 }}>
                    <label style={{ fontSize:12, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>Daire Başkanlığı</label>
                    <select value={grupDaire} onChange={e => { setGrupDaire(e.target.value); setYeniGrup(p=>({...p,department:''})); }}
                      style={{ width:'100%', padding:'9px 12px', fontSize:13, border:'1.5px solid #e2e8f0', borderRadius:8, background:'#f8fafc', color:'#1e293b', outline:'none', boxSizing:'border-box' }}>
                      <option value="">— Daire seçin —</option>
                      {grupDaireler.map(d => <option key={d.ad} value={d.ad}>{d.ad}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom:20 }}>
                    <label style={{ fontSize:12, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>Müdürlük</label>
                    <select value={yeniGrup.department} onChange={e => setYeniGrup(p=>({...p,department:e.target.value}))}
                      disabled={!grupDaire}
                      style={{ width:'100%', padding:'9px 12px', fontSize:13, border:'1.5px solid #e2e8f0', borderRadius:8, background:grupDaire?'#f8fafc':'#f1f5f9', color:'#1e293b', outline:'none', boxSizing:'border-box' }}>
                      <option value="">— Müdürlük seçin (isteğe bağlı) —</option>
                      {grupMudurlukleri.map(m => <option key={m.ad} value={m.ad}>{m.ad}</option>)}
                    </select>
                  </div>
                  <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                    <button onClick={() => setYeniGrupModal(false)} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #e2e8f0', background:'#f8fafc', cursor:'pointer', fontSize:13 }}>İptal</button>
                    <button onClick={yeniGrupKaydet} disabled={!yeniGrup.ad.trim()} style={{ padding:'8px 18px', borderRadius:8, border:'none', background:'#6366f1', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', opacity:!yeniGrup.ad.trim()?0.5:1 }}>Kaydet</button>
                  </div>
                </div>
              </div>
            )}

            {grupLoading ? (
              <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>Yükleniyor…</div>
            ) : calismaGruplari.length === 0 ? (
              <div style={{ padding:40, textAlign:'center', color:'#94a3b8', border:'1px dashed #e2e8f0', borderRadius:12 }}>Henüz çalışma grubu oluşturulmadı</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {calismaGruplari.map(grup => {
                  const acik = grupAcik[grup.id];
                  const uyeArama = uyeEkleArama[grup.id] || '';
                  const uyeArama_lower = uyeArama.toLowerCase();
                  const aramaFiltreliKullanicilar = uyeArama.length >= 2
                    ? uyeListesiKullanicilar.filter(u =>
                        (u.displayName?.toLowerCase().includes(uyeArama_lower) || u.username?.toLowerCase().includes(uyeArama_lower))
                        && !grup.uyeler.find(gu => gu.username === u.username)
                      ).slice(0, 8)
                    : [];
                  const liderAcik = liderAtaAcik[grup.id];
                  const liderArama = uyeEkleArama[`lider_${grup.id}`] || '';
                  const liderFiltreliUyeler = liderArama.length >= 1
                    ? grup.uyeler.filter(u => (u.displayName || u.username).toLowerCase().includes(liderArama.toLowerCase()))
                    : grup.uyeler;

                  return (
                    <div key={grup.id} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, overflow:'hidden' }}>
                      {/* Kart başlık */}
                      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px' }}>
                        <span style={{ fontSize:20 }}>🏢</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:700, fontSize:14, color:'#1e293b' }}>{grup.ad}</div>
                          <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>
                            {grup.directorate}{grup.department ? ` / ${grup.department}` : ''}
                          </div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          {grup.liderAd && (
                            <span style={{ fontSize:11, color:'#92400e', background:'#fef3c7', border:'1px solid #fde68a', padding:'2px 8px', borderRadius:99 }}>
                              👑 {grup.liderAd}
                            </span>
                          )}
                          <span style={{ fontSize:11, color:'#64748b', background:'#f1f5f9', padding:'3px 10px', borderRadius:99 }}>
                            👥 {grup._count?.uyeler ?? grup.uyeler?.length ?? 0} üye
                          </span>
                          <button onClick={() => setGrupAcik(p => ({ ...p, [grup.id]: !p[grup.id] }))}
                            style={{ padding:'5px 12px', borderRadius:8, border:'1px solid #e2e8f0', background:'#f8fafc', cursor:'pointer', fontSize:12, color:'#64748b' }}>
                            {acik ? '▲ Kapat' : '▼ Üyeler'}
                          </button>
                          <button onClick={() => { if(window.confirm('Grubu pasife al?')) calismaGrubuSil(grup.id); }}
                            style={{ padding:'5px 10px', borderRadius:8, border:'1px solid #fee2e2', background:'#fff', cursor:'pointer', fontSize:12, color:'#ef4444' }}>
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Üye listesi (açık ise) */}
                      {acik && (
                        <div style={{ borderTop:'1px solid #f1f5f9', padding:'12px 18px' }}>
                          <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:12 }}>
                            {grup.uyeler?.length === 0 && (
                              <div style={{ fontSize:12, color:'#94a3b8', textAlign:'center', padding:12 }}>Henüz üye yok</div>
                            )}
                            {grup.uyeler?.map(uye => (
                              <div key={uye.username} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 10px', borderRadius:8, background:'#f8fafc' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                  {uye.rol === 'lider' && <span style={{ fontSize:12 }}>👑</span>}
                                  <span style={{ fontSize:13, fontWeight: uye.rol==='lider' ? 600 : 400, color:'#374151' }}>
                                    {uye.displayName || uye.username}
                                  </span>
                                  {uye.rol === 'lider' && <span style={{ fontSize:10, color:'#92400e', background:'#fef3c7', padding:'1px 6px', borderRadius:99, border:'1px solid #fde68a' }}>Lider</span>}
                                </div>
                                <button onClick={() => uyeCikar(grup.id, uye.username)}
                                  style={{ padding:'2px 8px', borderRadius:6, border:'1px solid #e2e8f0', background:'#fff', cursor:'pointer', fontSize:11, color:'#94a3b8' }}>
                                  Çıkar
                                </button>
                              </div>
                            ))}
                          </div>

                          {/* Üye ekle */}
                          <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:10 }}>
                            <div style={{ display:'flex', gap:6 }}>
                              <input
                                value={uyeArama}
                                onChange={e => setUyeEkleArama(p => ({ ...p, [grup.id]: e.target.value }))}
                                placeholder="Üye eklemek için isim ara (min 2 karakter)…"
                                style={{ flex:1, padding:'7px 12px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:13 }}
                              />
                            </div>
                            {aramaFiltreliKullanicilar.length > 0 && (
                              <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:8, overflow:'hidden' }}>
                                {aramaFiltreliKullanicilar.map(u => (
                                  <div key={u.username} onClick={() => uyeEkle(grup.id, u)}
                                    style={{ padding:'7px 12px', cursor:'pointer', fontSize:13, color:'#374151', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}
                                    onMouseEnter={e => e.currentTarget.style.background='#f0f9ff'}
                                    onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                                    <span>{u.displayName}</span>
                                    <span style={{ fontSize:11, color:'#94a3b8' }}>{u.username}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Lider ata */}
                          <div>
                            <button onClick={() => setLiderAtaAcik(p => ({ ...p, [grup.id]: !p[grup.id] }))}
                              style={{ padding:'6px 12px', borderRadius:8, border:'1px solid #fde68a', background:'#fffbeb', cursor:'pointer', fontSize:12, color:'#92400e', fontWeight:600 }}>
                              👑 Lider Ata
                            </button>
                            {liderAcik && (
                              <div style={{ marginTop:8, background:'#fff', border:'1px solid #e2e8f0', borderRadius:8, overflow:'hidden' }}>
                                <input
                                  value={liderArama}
                                  onChange={e => setUyeEkleArama(p => ({ ...p, [`lider_${grup.id}`]: e.target.value }))}
                                  placeholder="Üyeler arasından ara…"
                                  style={{ width:'100%', padding:'7px 12px', border:'none', borderBottom:'1px solid #f1f5f9', fontSize:13, outline:'none', boxSizing:'border-box' }}
                                />
                                {liderFiltreliUyeler.map(u => (
                                  <div key={u.username} onClick={() => liderAta(grup.id, u)}
                                    style={{ padding:'7px 12px', cursor:'pointer', fontSize:13, color:'#374151', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between' }}
                                    onMouseEnter={e => e.currentTarget.style.background='#fffbeb'}
                                    onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                                    <span>{u.displayName || u.username}</span>
                                    {u.rol==='lider' && <span style={{ fontSize:10, color:'#92400e' }}>Mevcut lider</span>}
                                  </div>
                                ))}
                                {liderFiltreliUyeler.length === 0 && (
                                  <div style={{ padding:12, fontSize:12, color:'#94a3b8', textAlign:'center' }}>Önce üye ekleyin</div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const RENDERERS = { GENERAL: renderGeneral, AD: renderAd, SMTP: renderSmtp, PDKS: renderPdks, FLEXCITY: renderFlexcity, DASHBOARD: renderDashboard, GS_DASHBOARD: renderGsDashboard, ITSM: renderItsm, ULAKBELL: renderUlakbell, MANAGEENGINE: renderManageengine, SERVICES: renderServices, RBAC: renderRbac };

  // Bazı sekmeler kendi padding'ini yönetir
  const FULL_PAGE_TABS = ['SUBJECTS', 'AD_CHANGES'];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Sol dikey sekmeler */}
      <aside style={{ width: 200, flexShrink: 0, background: '#fff', borderRight: '1px solid #e2e8f0', paddingTop: 12, paddingBottom: 24 }}>
        <nav>
          {GORUNUR_TAB_GROUPS.map(group => (
            <div key={group.title} style={{ marginTop: 16 }}>
              <p style={{ padding: '0 16px', marginBottom: 4, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', textTransform: 'uppercase' }}>
                {group.title}
              </p>
              {group.tabs.map(t => {
                const active = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '9px 16px 9px 19px',
                      fontSize: 13, fontWeight: active ? 600 : 400,
                      border: 'none', outline: 'none',
                      borderLeft: active ? '3px solid #43DC80' : '3px solid transparent',
                      background: active ? '#f0fdf4' : 'transparent',
                      color: active ? '#15803d' : '#64748b',
                      cursor: 'pointer', transition: 'all .15s',
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* İçerik */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'SUBJECTS'   ? <AdminCategoriesPage /> :
         activeTab === 'AD_CHANGES' ? <AdChangesPage /> :
         <div style={{ padding: 32 }}>{RENDERERS[activeTab]?.()}</div>}
      </main>
    </div>
  );
}
