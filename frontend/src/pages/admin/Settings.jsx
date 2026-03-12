import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

function SaveButton({ onClick, loading }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors">
      {loading ? 'Kaydediliyor…' : '💾 Kaydet'}
    </button>
  );
}

// ─── Sekmeler ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'GENERAL',   label: 'Genel',         icon: '⚙️' },
  { key: 'AD',        label: 'Aktif Dizin',   icon: '🔗' },
  { key: 'SMTP',      label: 'E-Posta',       icon: '📧' },
  { key: 'PDKS',      label: 'PDKS',          icon: '🕐' },
  { key: 'FLEXCITY',  label: 'FlexCity',      icon: '🏛️' },
  { key: 'DASHBOARD', label: 'Dashboard',     icon: '📊' },
  { key: 'ITSM',      label: 'ITSM',          icon: '🎫' },
];

// ─── Ana bileşen ──────────────────────────────────────────────────────────────

export default function Settings() {
  const [activeTab, setActiveTab] = useState('GENERAL');
  const [data, setData]           = useState({});
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting]     = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sla, setSla]             = useState({ sla_critical: '4', sla_high: '8', sla_medium: '24', sla_low: '72' });
  const [widgets, setWidgets]     = useState([]);
  const [roleWidgets, setRoleWidgets] = useState({ admin: [], manager: [], user: [] });

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
    } else {
      loadTab(activeTab);
    }
    setTestResult(null);
    setSaved(false);
  }, [activeTab]);

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
      const r = await authFetch(`${API}/api/system-settings/test/pdks`, { method: 'POST', body: JSON.stringify(data.PDKS || {}) });
      setTestResult(await r.json());
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
        <button onClick={testAd} disabled={testing}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-60 transition-colors">
          {testing ? 'Test ediliyor…' : '🔌 Bağlantıyı Test Et'}
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
        <button onClick={testSmtp} disabled={testing}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-60 whitespace-nowrap">
          {testing ? '…' : '📨 Gönder'}
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
      <h3 className="text-base font-semibold text-gray-800 mb-5">PDKS Entegrasyonu</h3>
      <Field label="PDKS Aktif">
        <Toggle value={get('pdks_enabled', 'false') === 'true'} onChange={v => set('pdks_enabled', v ? 'true' : 'false')} label={get('pdks_enabled', 'false') === 'true' ? 'Aktif' : 'Pasif'} />
      </Field>
      <Field label="Sunucu URL">
        <Input value={get('pdks_url')} onChange={v => set('pdks_url', v)} placeholder="http://pdks.mugla.bel.tr/api" />
      </Field>
      <Field label="Kullanıcı Adı">
        <Input value={get('pdks_username')} onChange={v => set('pdks_username', v)} placeholder="api_user" />
      </Field>
      <Field label="Şifre">
        <PasswordInput value={get('pdks_password')} onChange={v => set('pdks_password', v)} placeholder="••••••••" />
      </Field>
      <Field label="API Key" hint="Bazı PDKS sistemlerinde ek API anahtarı gerekebilir">
        <PasswordInput value={get('pdks_api_key')} onChange={v => set('pdks_api_key', v)} placeholder="••••••••" />
      </Field>
      <div className="flex items-center gap-3 pt-2">
        <button onClick={testPdks} disabled={testing}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-60">
          {testing ? 'Test ediliyor…' : '🔌 Bağlantıyı Test Et'}
        </button>
        <SaveButton onClick={save} loading={saving} />
        {saved && <span className="text-sm text-green-600">✓ Kaydedildi</span>}
      </div>
      <TestResult result={testResult} />
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
            <button onClick={() => saveRoleWidgets(role)}
              className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors">
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
        <button onClick={saveSla} disabled={saving}
          className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors">
          {saving ? 'Kaydediliyor…' : '💾 Kaydet'}
        </button>
        {saved && <span className="text-sm text-green-600">✓ Kaydedildi</span>}
      </div>
    </div>
  );

  const RENDERERS = { GENERAL: renderGeneral, AD: renderAd, SMTP: renderSmtp, PDKS: renderPdks, FLEXCITY: renderFlexcity, DASHBOARD: renderDashboard, ITSM: renderItsm };

  return (
    <div className="flex h-full min-h-screen bg-gray-50">
      {/* Sol dikey sekmeler */}
      <aside className="w-48 shrink-0 bg-white border-r border-gray-200 pt-6">
        <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Ayarlar</p>
        <nav className="space-y-0.5 px-2">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left
                ${activeTab === t.key ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* İçerik */}
      <main className="flex-1 p-8 overflow-y-auto">
        {RENDERERS[activeTab]?.()}
      </main>
    </div>
  );
}
