import { useState, useEffect, useRef, useCallback } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Surface from '../../components/ui/Surface';

const API = import.meta.env.VITE_API_URL || '';
function authFetch(url, opts = {}) {
  const token = localStorage.getItem('token');
  return fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts.headers },
  });
}

// Sistem rolleri
const SISTEM_ROLLERI = ['admin', 'daire_baskani', 'mudur', 'sef', 'personel'];

// JSON string → array
function parseJson(str) {
  if (!str) return [];
  try { return JSON.parse(str); } catch { return []; }
}

// ─── TagSelector ─────────────────────────────────────────────────────────────
function TagSelector({ label, tags, options, onAdd, onRemove, asyncSearch, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [asyncOptions, setAsyncOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Async arama (personel için)
  useEffect(() => {
    if (!asyncSearch || !open) return;
    if (search.length < 2) { setAsyncOptions([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await authFetch(`${API}/api/users?search=${encodeURIComponent(search)}&limit=10`);
        if (r.ok) {
          const data = await r.json();
          const users = data.users || data;
          setAsyncOptions(users.map(u => ({ value: u.username, label: `${u.displayName} (${u.username})` })));
        }
      } catch { /* ignore */ }
      setLoading(false);
    }, 300);
  }, [search, open, asyncSearch]);

  const displayOptions = asyncSearch ? asyncOptions : (options || []);
  const filtered = displayOptions.filter(o => {
    const val = typeof o === 'string' ? o : o.value;
    if (tags.includes(val)) return false;
    if (!asyncSearch && search) {
      const label = typeof o === 'string' ? o : o.label;
      return label.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>{label}</div>
      <div style={{
        border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '6px 8px',
        minHeight: 36, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center',
        cursor: 'pointer', background: '#fff',
      }} onClick={() => setOpen(true)}>
        {tags.length === 0 && <span style={{ color: '#94a3b8', fontSize: 13 }}>{placeholder || '(boş)'}</span>}
        {tags.map(t => (
          <span key={t} style={{
            background: '#e0f2fe', color: '#0369a1', borderRadius: 6,
            padding: '2px 8px', fontSize: 12, fontWeight: 500,
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            {t}
            <span onClick={e => { e.stopPropagation(); onRemove(t); }}
              style={{ cursor: 'pointer', fontWeight: 700, fontSize: 14, lineHeight: 1 }}>&times;</span>
          </span>
        ))}
        <span style={{
          marginLeft: 'auto', color: '#94a3b8', fontSize: 16, fontWeight: 700,
          padding: '0 4px', flexShrink: 0,
        }}>+</span>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)', marginTop: 4, maxHeight: 200, overflow: 'auto',
        }}>
          <div style={{ padding: 6, borderBottom: '1px solid #f1f5f9' }}>
            <input
              autoFocus
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Ara..."
              style={{
                width: '100%', border: '1px solid #e2e8f0', borderRadius: 6,
                padding: '4px 8px', fontSize: 13, outline: 'none',
              }}
            />
          </div>
          {loading && <div style={{ padding: 8, fontSize: 13, color: '#94a3b8' }}>Aranıyor...</div>}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: 8, fontSize: 13, color: '#94a3b8' }}>
              {asyncSearch && search.length < 2 ? 'En az 2 karakter girin' : 'Sonuç yok'}
            </div>
          )}
          {filtered.map(o => {
            const val = typeof o === 'string' ? o : o.value;
            const lbl = typeof o === 'string' ? o : o.label;
            return (
              <div key={val}
                onClick={() => { onAdd(val); setSearch(''); if (!asyncSearch) setOpen(false); }}
                style={{
                  padding: '6px 10px', fontSize: 13, cursor: 'pointer',
                  borderBottom: '1px solid #f8fafc',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >{lbl}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── MenuCard ────────────────────────────────────────────────────────────────
function MenuCard({ menu, directorateOptions, departmentOptions, grupOptions, onChange }) {
  const sistemRoller = parseJson(menu.sistemRoller);
  const directorates = parseJson(menu.directorates);
  const departments  = parseJson(menu.departments);
  const grupIds      = parseJson(menu.grupIds);
  const usernames    = parseJson(menu.usernames);

  const update = (field, value) => onChange(menu.menuKey, field, value);

  const borderColor = menu._dirty ? '#f59e0b' : '#e2e8f0';

  return (
    <div style={{
      border: `1.5px solid ${borderColor}`, borderRadius: 12,
      padding: 16, background: '#fff', position: 'relative',
      transition: 'border-color 0.2s',
    }}>
      {/* Başlık */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <i className={`bi ${menu.icon}`} style={{ fontSize: 18, color: '#0ea5e9' }} />
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b' }}>{menu.label}</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>{menu.route}</div>
        </div>
        {menu._dirty && (
          <span style={{
            marginLeft: 'auto', fontSize: 11, color: '#f59e0b', fontWeight: 600,
            background: '#fffbeb', borderRadius: 6, padding: '2px 8px',
          }}>Kaydedilmedi</span>
        )}
      </div>

      {/* Herkes toggle */}
      <label style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
        cursor: 'pointer', fontSize: 14,
      }}>
        <input type="checkbox" checked={menu.herkes}
          onChange={e => update('herkes', e.target.checked)}
          style={{ width: 18, height: 18, accentColor: '#10b981' }}
        />
        <span style={{ fontWeight: 500 }}>Herkes</span>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>— Tüm kullanıcılar bu menüyü görür</span>
      </label>

      {/* Kural alanları */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
        opacity: menu.herkes ? 0.4 : 1, pointerEvents: menu.herkes ? 'none' : 'auto',
      }}>
        <TagSelector
          label="Sistem Rolü"
          tags={sistemRoller}
          options={SISTEM_ROLLERI}
          onAdd={v => update('sistemRoller', JSON.stringify([...sistemRoller, v]))}
          onRemove={v => update('sistemRoller', JSON.stringify(sistemRoller.filter(x => x !== v)))}
        />
        <TagSelector
          label="Daire Başkanlığı"
          tags={directorates}
          options={directorateOptions}
          onAdd={v => update('directorates', JSON.stringify([...directorates, v]))}
          onRemove={v => update('directorates', JSON.stringify(directorates.filter(x => x !== v)))}
        />
        <TagSelector
          label="Müdürlük"
          tags={departments}
          options={departmentOptions}
          onAdd={v => update('departments', JSON.stringify([...departments, v]))}
          onRemove={v => update('departments', JSON.stringify(departments.filter(x => x !== v)))}
        />
        <TagSelector
          label="Çalışma Grubu"
          tags={grupIds.map(String)}
          options={grupOptions.map(g => ({ value: String(g.id), label: g.ad }))}
          onAdd={v => update('grupIds', JSON.stringify([...grupIds, Number(v)]))}
          onRemove={v => update('grupIds', JSON.stringify(grupIds.filter(x => x !== Number(v))))}
        />
      </div>
      <div style={{
        marginTop: 10,
        opacity: menu.herkes ? 0.4 : 1, pointerEvents: menu.herkes ? 'none' : 'auto',
      }}>
        <TagSelector
          label="Personel (kullanıcı adı)"
          tags={usernames}
          asyncSearch
          placeholder="Kullanıcı ara..."
          onAdd={v => update('usernames', JSON.stringify([...usernames, v]))}
          onRemove={v => update('usernames', JSON.stringify(usernames.filter(x => x !== v)))}
        />
      </div>
    </div>
  );
}

// ─── Ana Bileşen ─────────────────────────────────────────────────────────────
export default function MenuYetkilendirme() {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [directorateOptions, setDirectorateOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [grupOptions, setGrupOptions] = useState([]);
  const [saveMsg, setSaveMsg] = useState('');

  // Menü öğelerini yükle
  useEffect(() => {
    authFetch(`${API}/api/menu-permission`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setMenus(data.map(m => ({ ...m, _dirty: false }))))
      .catch(() => setMenus([]))
      .finally(() => setLoading(false));
  }, []);

  // Dropdown seçeneklerini yükle
  useEffect(() => {
    // Daire başkanlıkları
    authFetch(`${API}/api/arge/daireler`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setDirectorateOptions(data.map(d => d.ad)))
      .catch(() => {});

    // Müdürlükler (tüm)
    authFetch(`${API}/api/arge/mudurlukleri`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setDepartmentOptions(data.map(d => d.ad)))
      .catch(() => {});

    // Çalışma grupları
    authFetch(`${API}/api/calisma-grubu`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setGrupOptions(Array.isArray(data) ? data : data.gruplar || []))
      .catch(() => {});
  }, []);

  const handleChange = useCallback((menuKey, field, value) => {
    setMenus(prev => prev.map(m =>
      m.menuKey === menuKey ? { ...m, [field]: value, _dirty: true } : m
    ));
  }, []);

  const dirtyMenus = menus.filter(m => m._dirty);

  const handleSaveAll = async () => {
    if (dirtyMenus.length === 0) return;
    setSaving(true);
    setSaveMsg('');
    let ok = 0;
    let fail = 0;
    for (const m of dirtyMenus) {
      try {
        const r = await authFetch(`${API}/api/menu-permission/${m.menuKey}`, {
          method: 'PUT',
          body: JSON.stringify({
            herkes: m.herkes,
            sistemRoller: parseJson(m.sistemRoller),
            directorates: parseJson(m.directorates),
            departments: parseJson(m.departments),
            grupIds: parseJson(m.grupIds),
            usernames: parseJson(m.usernames),
            disabled: m.disabled,
            showApprovalBadge: m.showApprovalBadge,
          }),
        });
        if (r.ok) ok++;
        else fail++;
      } catch { fail++; }
    }
    // _dirty temizle
    setMenus(prev => prev.map(m => ({ ...m, _dirty: false })));
    setSaving(false);
    setSaveMsg(fail ? `${ok} kaydedildi, ${fail} hata` : `${ok} menü öğesi kaydedildi`);
    setTimeout(() => setSaveMsg(''), 3000);
  };

  // Grupla
  const grouped = [];
  const groupMap = new Map();
  for (const m of menus) {
    const key = m.groupLabel || '__toplevel_' + m.menuKey;
    if (!groupMap.has(key)) {
      groupMap.set(key, { label: m.groupLabel, items: [] });
      grouped.push(groupMap.get(key));
    }
    groupMap.get(key).items.push(m);
  }

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
        Menü öğeleri yükleniyor...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 20px', maxWidth: 900, margin: '0 auto' }}>
      <PageHeader
        icon={<i className="bi bi-shield-lock" style={{ fontSize: 22 }} />}
        title="Menü Yetkilendirme"
        description="Sidebar menü görünürlüğünü yapılandırın"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {saveMsg && (
              <span style={{
                fontSize: 13, fontWeight: 500,
                color: saveMsg.includes('hata') ? '#ef4444' : '#10b981',
              }}>{saveMsg}</span>
            )}
            <Button
              color="blue"
              onClick={handleSaveAll}
              disabled={saving || dirtyMenus.length === 0}
            >
              {saving ? 'Kaydediliyor...' : `Tüm Değişiklikleri Kaydet${dirtyMenus.length ? ` (${dirtyMenus.length})` : ''}`}
            </Button>
          </div>
        }
      />

      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {grouped.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <div style={{
                fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: 1,
                marginBottom: 10, paddingLeft: 4,
                borderBottom: '2px solid #e2e8f0', paddingBottom: 6,
              }}>{group.label}</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {group.items.map(m => (
                <MenuCard
                  key={m.menuKey}
                  menu={m}
                  directorateOptions={directorateOptions}
                  departmentOptions={departmentOptions}
                  grupOptions={grupOptions}
                  onChange={handleChange}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
