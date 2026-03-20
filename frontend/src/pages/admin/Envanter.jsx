import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || '';
function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

// ─── Cihaz tipi badge renkleri ────────────────────────────────────────────────
const LOC_TYPE_COLORS = {
  SWITCH:       'bg-blue-100 text-blue-700',
  ACCESS_POINT: 'bg-purple-100 text-purple-700',
  YAZICI:       'bg-amber-100 text-amber-700',
  UPS:          'bg-red-100 text-red-700',
  DIGER:        'bg-gray-100 text-gray-600',
};
const USR_TYPE_COLORS = {
  BILGISAYAR: 'bg-blue-100 text-blue-700',
  DIZUSTU:    'bg-indigo-100 text-indigo-700',
  IP_TELEFON: 'bg-green-100 text-green-700',
  TABLET:     'bg-purple-100 text-purple-700',
  MONITOR:    'bg-amber-100 text-amber-700',
  DIGER:      'bg-gray-100 text-gray-600',
};

const LOC_DEVICE_TYPES   = ['SWITCH', 'ACCESS_POINT', 'YAZICI', 'UPS', 'DIGER'];
const USER_DEVICE_TYPES  = ['BILGISAYAR', 'DIZUSTU', 'IP_TELEFON', 'TABLET', 'MONITOR', 'DIGER'];

// ─── SVG ─────────────────────────────────────────────────────────────────────
function ChevronIcon({ open }) {
  return (
    <svg className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
      fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

// ─── Lokasyon Formu ───────────────────────────────────────────────────────────
function LocationForm({ initial = {}, onSave, onCancel }) {
  const [form, setForm] = useState({
    name:    initial.name    || '',
    address: initial.address || '',
    city:    initial.city    || '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setErr('');
    try {
      await onSave(form);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
      <div className="col-span-2">
        <label className="block text-xs font-medium text-gray-600 mb-1">Lokasyon Adı *</label>
        <input value={form.name} onChange={f('name')} required
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="Merkez Hizmet Binası" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Adres</label>
        <input value={form.address} onChange={f('address')}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="Atatürk Cad. No:1" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Şehir</label>
        <input value={form.city} onChange={f('city')}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="Muğla" />
      </div>
      {err && <p className="col-span-2 text-xs text-red-600">{err}</p>}
      <div className="col-span-2 flex gap-2 justify-end">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition">
          İptal
        </button>
        <button type="submit" disabled={saving}
          className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
    </form>
  );
}

// ─── Lokasyon Cihaz Formu ─────────────────────────────────────────────────────
function LocDeviceForm({ initial = {}, onSave, onCancel }) {
  const [form, setForm] = useState({
    deviceName: initial.deviceName || '',
    deviceType: initial.deviceType || 'DIGER',
    serialNumber: initial.serialNumber || '',
    ipAddress: initial.ipAddress || '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setErr('');
    try {
      await onSave(form);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
      <div className="col-span-2">
        <label className="block text-xs font-medium text-gray-600 mb-1">Cihaz Adı *</label>
        <input value={form.deviceName} onChange={f('deviceName')} required
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="Core-Switch-01" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Tip</label>
        <select value={form.deviceType} onChange={f('deviceType')}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
          {LOC_DEVICE_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Seri No</label>
        <input value={form.serialNumber} onChange={f('serialNumber')}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="SN-123456" />
      </div>
      <div className="col-span-2">
        <label className="block text-xs font-medium text-gray-600 mb-1">IP Adresi</label>
        <input value={form.ipAddress} onChange={f('ipAddress')}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="192.168.1.1" />
      </div>
      {err && <p className="col-span-2 text-xs text-red-600">{err}</p>}
      <div className="col-span-2 flex gap-2 justify-end">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition">
          İptal
        </button>
        <button type="submit" disabled={saving}
          className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">
          {saving ? 'Kaydediliyor...' : 'Ekle'}
        </button>
      </div>
    </form>
  );
}

// ─── Lokasyon Accordion Satırı ────────────────────────────────────────────────
function LocationRow({ loc, userRole, onUpdated, onDeleted }) {
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState(null);
  const [loadingDev, setLoadingDev] = useState(false);
  const [editing, setEditing] = useState(false);
  const [addingDev, setAddingDev] = useState(false);

  async function loadDevices() {
    if (devices !== null) return;
    setLoadingDev(true);
    try {
      const r = await fetch(`${API}/api/locations/${loc.id}/devices`, { headers: authHeaders() });
      setDevices(await r.json());
    } finally {
      setLoadingDev(false);
    }
  }

  async function toggle() {
    if (!open) await loadDevices();
    setOpen((v) => !v);
  }

  async function handleEdit(form) {
    const r = await fetch(`${API}/api/locations/${loc.id}`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Hata'); }
    setEditing(false);
    onUpdated(await r.json());
  }

  async function handleDelete() {
    if (!confirm(`"${loc.name}" lokasyonunu silmek istiyor musunuz?`)) return;
    const r = await fetch(`${API}/api/locations/${loc.id}`, {
      method: 'DELETE', headers: authHeaders(),
    });
    if (!r.ok) { const e = await r.json(); alert(e.error); return; }
    onDeleted(loc.id);
  }

  async function handleAddDevice(form) {
    const r = await fetch(`${API}/api/locations/${loc.id}/devices`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Hata'); }
    const dev = await r.json();
    setDevices((prev) => [...(prev || []), dev]);
    setAddingDev(false);
    onUpdated({ ...loc, _count: { ...loc._count, devices: (loc._count?.devices || 0) + 1 } });
  }

  async function handleDeleteDevice(devId) {
    if (!confirm('Bu cihazı silmek istiyor musunuz?')) return;
    const r = await fetch(`${API}/api/locations/${loc.id}/devices/${devId}`, {
      method: 'DELETE', headers: authHeaders(),
    });
    if (!r.ok) { const e = await r.json(); alert(e.error); return; }
    setDevices((prev) => prev.filter((d) => d.id !== devId));
    onUpdated({ ...loc, _count: { ...loc._count, devices: Math.max(0, (loc._count?.devices || 1) - 1) } });
  }

  const canEdit   = ['admin', 'manager'].includes(userRole);
  const canDelete = userRole === 'admin';

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {editing ? (
        <div className="p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Lokasyon Düzenle</p>
          <LocationForm initial={loc} onSave={handleEdit} onCancel={() => setEditing(false)} />
        </div>
      ) : (
        <button
          onClick={toggle}
          className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition
            ${open ? 'bg-indigo-600 text-white' : 'bg-white text-gray-800 hover:bg-gray-50'}`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{loc.name}</p>
            <p className={`text-xs ${open ? 'text-indigo-200' : 'text-gray-400'}`}>
              {[loc.city, loc.address].filter(Boolean).join(' · ') || '—'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium
              ${open ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {loc._count?.devices || 0} cihaz
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium
              ${open ? 'bg-indigo-500 text-white' : 'bg-blue-50 text-blue-600'}`}>
              {loc._count?.users || 0} personel
            </span>
            {canEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); setEditing(true); setOpen(false); }}
                className={`p-1 rounded hover:bg-white/20 transition ${open ? 'text-indigo-100' : 'text-gray-400 hover:text-indigo-600'}`}
                title="Düzenle"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {canDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                className={`p-1 rounded hover:bg-white/20 transition ${open ? 'text-red-300 hover:text-red-100' : 'text-gray-400 hover:text-red-600'}`}
                title="Sil"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            <ChevronIcon open={open} />
          </div>
        </button>
      )}

      {open && (
        <div className="border-t border-gray-100 bg-white p-4 space-y-3">
          {loadingDev ? (
            <p className="text-sm text-gray-400 text-center py-4">Yükleniyor...</p>
          ) : (
            <>
              {devices && devices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-400 border-b border-gray-100">
                        <th className="text-left pb-2 font-medium">Cihaz</th>
                        <th className="text-left pb-2 font-medium">Tip</th>
                        <th className="text-left pb-2 font-medium">Seri No</th>
                        <th className="text-left pb-2 font-medium">IP</th>
                        {canDelete && <th className="pb-2" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {devices.map((d) => (
                        <tr key={d.id} className={`${!d.active ? 'opacity-50' : ''}`}>
                          <td className="py-2 font-medium text-gray-800">{d.deviceName}</td>
                          <td className="py-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LOC_TYPE_COLORS[d.deviceType] || LOC_TYPE_COLORS.DIGER}`}>
                              {d.deviceType}
                            </span>
                          </td>
                          <td className="py-2 text-gray-500">{d.serialNumber || '—'}</td>
                          <td className="py-2 text-gray-500 font-mono text-xs">{d.ipAddress || '—'}</td>
                          {canDelete && (
                            <td className="py-2">
                              <button onClick={() => handleDeleteDevice(d.id)}
                                className="text-gray-300 hover:text-red-500 transition p-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-2">Bu lokasyonda cihaz yok</p>
              )}

              {canEdit && (
                addingDev ? (
                  <LocDeviceForm onSave={handleAddDevice} onCancel={() => setAddingDev(false)} />
                ) : (
                  <button onClick={() => setAddingDev(true)}
                    className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 transition font-medium">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Cihaz Ekle
                  </button>
                )
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sekme 1: Lokasyonlar ─────────────────────────────────────────────────────
function LocationsTab({ userRole }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [adding, setAdding]       = useState(false);
  const [search, setSearch]       = useState('');

  useEffect(() => {
    fetch(`${API}/api/locations`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setLocations(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(form) {
    const r = await fetch(`${API}/api/locations`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Hata'); }
    const loc = await r.json();
    setLocations((prev) => [...prev, { ...loc, _count: { users: 0, devices: 0 } }]);
    setAdding(false);
  }

  function handleUpdated(updated) {
    setLocations((prev) => prev.map((l) => l.id === updated.id ? { ...l, ...updated } : l));
  }

  function handleDeleted(id) {
    setLocations((prev) => prev.filter((l) => l.id !== id));
  }

  const canEdit = ['admin', 'manager'].includes(userRole);
  const filtered = search
    ? locations.filter((l) => {
        const q = search.toLowerCase();
        return l.name.toLowerCase().includes(q) ||
               (l.city    || '').toLowerCase().includes(q) ||
               (l.address || '').toLowerCase().includes(q);
      })
    : locations;

  if (loading) return <div className="py-12 text-center text-sm text-gray-400">Yükleniyor...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Lokasyon ara..."
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <span className="text-sm text-gray-400">{filtered.length} lokasyon</span>
        {canEdit && !adding && (
          <button onClick={() => setAdding(true)}
            className="ml-auto flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Lokasyon Ekle
          </button>
        )}
      </div>

      {adding && (
        <div className="border border-indigo-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Yeni Lokasyon</p>
          <LocationForm onSave={handleAdd} onCancel={() => setAdding(false)} />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">
          {search ? 'Sonuç bulunamadı' : 'Henüz lokasyon eklenmemiş'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((loc) => (
            <LocationRow key={loc.id} loc={loc} userRole={userRole}
              onUpdated={handleUpdated} onDeleted={handleDeleted} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AD Bilgisayar Seçici ─────────────────────────────────────────────────────
function AdComputerPicker({ onSelect }) {
  const [open, setOpen]         = useState(false);
  const [computers, setComputers] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState('');

  async function load() {
    if (computers.length > 0) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/inventory/ad-computers`, { headers: authHeaders() });
      setComputers(r.ok ? await r.json() : []);
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    if (!open) load();
    setOpen(v => !v);
  }

  const filtered = search
    ? computers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.department || '').toLowerCase().includes(search.toLowerCase()))
    : computers;

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('tr-TR');
  }

  return (
    <div className="col-span-3 mb-1">
      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition mb-2 px-2 py-1 rounded-lg hover:bg-indigo-50"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        AD'den Seç
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {open && (
        <div className="border border-indigo-200 rounded-xl overflow-hidden mb-3 shadow-sm">
          {/* Arama */}
          <div className="px-3 py-2 bg-indigo-50 border-b border-indigo-100">
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Bilgisayar adı veya departman ara..."
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          {loading ? (
            <div className="py-6 text-center text-xs text-gray-400">Yükleniyor...</div>
          ) : filtered.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-400">Sonuç bulunamadı</div>
          ) : (
            <div className="max-h-60 overflow-y-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr className="text-gray-500">
                    <th className="text-left px-3 py-2 font-medium">Ad</th>
                    <th className="text-left px-3 py-2 font-medium">İşletim Sistemi</th>
                    <th className="text-left px-3 py-2 font-medium">Son Giriş</th>
                    <th className="text-left px-3 py-2 font-medium">Departman</th>
                    <th className="text-left px-3 py-2 font-medium">Lokasyon / OU</th>
                    <th className="text-left px-3 py-2 font-medium">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(c => (
                    <tr
                      key={c.name}
                      onClick={() => { if (!c.alreadyInInventory) { onSelect(c); setOpen(false); } }}
                      title={c.alreadyInInventory ? 'Bu cihaz zaten envantere kayıtlı' : 'Seçmek için tıklayın'}
                      className={`transition
                        ${c.alreadyInInventory
                          ? 'opacity-50 cursor-not-allowed bg-gray-50'
                          : c.inactive
                            ? 'opacity-60 hover:bg-amber-50 cursor-pointer'
                            : 'hover:bg-indigo-50 cursor-pointer'}`}
                    >
                      <td className="px-3 py-2 font-mono font-medium text-gray-800">{c.name}</td>
                      <td className="px-3 py-2 text-gray-600 max-w-[180px] truncate" title={c.os}>
                        {c.os || '—'}{c.osVersion ? ` (${c.osVersion})` : ''}
                      </td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{formatDate(c.lastLogon)}</td>
                      <td className="px-3 py-2 text-gray-500">{c.department || '—'}</td>
                      <td className="px-3 py-2 text-gray-500 max-w-[160px] truncate" title={c.ou}>
                        {c.location || c.ou || '—'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {c.alreadyInInventory ? (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">Kayıtlı</span>
                        ) : c.inactive ? (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">Pasif &gt;90g</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">Aktif</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Cihaz tipi tahmini (AD bilgisayar adına göre) ────────────────────────────
function guessDeviceType(c) {
  const name = (c.name || '').toLowerCase();
  const os   = (c.os   || '').toLowerCase();
  if (name.includes('laptop') || name.includes('nb') || name.includes('dizustu')) return 'DIZUSTU';
  if (name.includes('srv') || name.includes('server') || os.includes('server')) return 'DIGER';
  return 'BILGISAYAR';
}

// ─── Kişisel Cihaz Formu ──────────────────────────────────────────────────────
function UserDeviceForm({ username, onSave, onCancel }) {
  const [form, setForm] = useState({ deviceName: '', deviceType: 'BILGISAYAR', serialNumber: '' });
  const [adInfo, setAdInfo] = useState(null); // AD'den seçilen bilgisayar
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  function handleAdSelect(computer) {
    setForm(prev => ({
      ...prev,
      deviceName:   computer.name,
      deviceType:   guessDeviceType(computer),
      serialNumber: computer.serialNumber || prev.serialNumber,
    }));
    setAdInfo(computer);
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setErr('');
    try {
      await onSave({ ...form, username });
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-3 gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
      {/* AD Seçici */}
      <AdComputerPicker onSelect={handleAdSelect} />

      {/* AD'den alınan bilgiler — info kutusu */}
      {adInfo && (
        <div className="col-span-3 flex items-start gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 text-xs">
          <svg className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-indigo-700 space-y-0.5">
            {adInfo.os && (
              <p><span className="font-medium">İşletim Sistemi:</span> {adInfo.os}{adInfo.osVersion ? ` — ${adInfo.osVersion}` : ''}{adInfo.osSP ? ` (${adInfo.osSP})` : ''}</p>
            )}
            {adInfo.description && (
              <p><span className="font-medium">Kullanıcı önerisi:</span> {adInfo.description}</p>
            )}
            {(adInfo.location || adInfo.ou) && (
              <p><span className="font-medium">Lokasyon / OU:</span> {adInfo.location || adInfo.ou}</p>
            )}
            {adInfo.managedBy && (
              <p><span className="font-medium">Sorumlu:</span> {adInfo.managedBy}</p>
            )}
          </div>
          <button type="button" onClick={() => setAdInfo(null)}
            className="ml-auto text-indigo-300 hover:text-indigo-600 transition shrink-0">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Form alanları */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Cihaz Adı *</label>
        <input value={form.deviceName} onChange={f('deviceName')} required
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="PC-001" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Tip</label>
        <select value={form.deviceType} onChange={f('deviceType')}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
          {USER_DEVICE_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Seri No</label>
        <input value={form.serialNumber} onChange={f('serialNumber')}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="SN-123456" />
      </div>
      {err && <p className="col-span-3 text-xs text-red-600">{err}</p>}
      <div className="col-span-3 flex gap-2 justify-end">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition">
          İptal
        </button>
        <button type="submit" disabled={saving}
          className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">
          {saving ? 'Ekleniyor...' : 'Ekle'}
        </button>
      </div>
    </form>
  );
}

// ─── Kullanıcı Cihaz Satırı ───────────────────────────────────────────────────
function UserDeviceRow({ user, userRole }) {
  const [open, setOpen]       = useState(false);
  const [devices, setDevices] = useState(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding]   = useState(false);

  async function loadDevices() {
    if (devices !== null) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/devices?username=${encodeURIComponent(user.username)}`, { headers: authHeaders() });
      setDevices(await r.json());
    } finally {
      setLoading(false);
    }
  }

  async function toggle() {
    if (!open) await loadDevices();
    setOpen((v) => !v);
  }

  async function handleAdd(form) {
    const r = await fetch(`${API}/api/devices`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Hata'); }
    const newDevice = await r.json();
    setDevices((prev) => [...(prev || []), newDevice]);
    setAdding(false);
  }

  async function handleDelete(id) {
    if (!confirm('Bu cihazı silmek istiyor musunuz?')) return;
    const r = await fetch(`${API}/api/devices/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (!r.ok) { const e = await r.json(); alert(e.error); return; }
    setDevices((prev) => prev.filter((d) => d.id !== id));
  }

  const canDelete = userRole === 'admin';
  const canEdit   = ['admin', 'manager'].includes(userRole);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button onClick={toggle}
        className={`w-full flex items-center gap-3 px-5 py-3 text-left transition
          ${open ? 'bg-indigo-600 text-white' : 'bg-white text-gray-800 hover:bg-gray-50'}`}>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
          ${open ? 'bg-indigo-500 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
          {user.displayName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{user.displayName}</p>
          <p className={`text-xs ${open ? 'text-indigo-200' : 'text-gray-400'}`}>
            {user.username}{user.department ? ` · ${user.department}` : ''}
          </p>
        </div>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="border-t border-gray-100 bg-white p-4 space-y-3">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-2">Yükleniyor...</p>
          ) : (
            <>
              {devices && devices.length > 0 ? (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="text-left pb-2 font-medium">Cihaz</th>
                      <th className="text-left pb-2 font-medium">Tip</th>
                      <th className="text-left pb-2 font-medium">Seri No</th>
                      <th className="text-left pb-2 font-medium">Durum</th>
                      {canDelete && <th className="pb-2" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {devices.map((d) => (
                      <tr key={d.id}>
                        <td className="py-2 font-medium text-gray-800">{d.deviceName}</td>
                        <td className="py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${USR_TYPE_COLORS[d.deviceType] || USR_TYPE_COLORS.DIGER}`}>
                            {d.deviceType}
                          </span>
                        </td>
                        <td className="py-2 text-gray-500">{d.serialNumber || '—'}</td>
                        <td className="py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                            ${d.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {d.active ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        {canDelete && (
                          <td className="py-2">
                            <button onClick={() => handleDelete(d.id)}
                              className="text-gray-300 hover:text-red-500 transition p-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-gray-400 text-center py-2">Bu kullanıcıya cihaz atanmamış</p>
              )}

              {canEdit && (
                adding ? (
                  <UserDeviceForm username={user.username} onSave={handleAdd} onCancel={() => setAdding(false)} />
                ) : (
                  <button onClick={() => setAdding(true)}
                    className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 transition font-medium">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Cihaz Ekle
                  </button>
                )
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sekme 2: Kişisel Cihazlar ────────────────────────────────────────────────
// ─── Cihaz Detay Modal ────────────────────────────────────────────────────────
function DeviceDetailModal({ device, onClose }) {
  if (!device) return null;
  const rows = [
    ['Cihaz Adı',    device.name],
    ['Tip',          device.type],
    ['Marka',        device.brand],
    ['Model / OS',   device.model],
    ['Seri No',      device.serialNumber],
    ['IP / DNS',     device.ipAddress],
    ['MAC',          device.macAddress],
    ['Durum',        device.status],
    ['Daire',        device.directorate],
    ['Şube',         device.department],
    ['Atanan',       device.userName || device.assignedTo],
    ['Lokasyon',     device.location?.name],
    ['Notlar',       device.notes],
    ['Son Sync',     device.lastSyncAt ? new Date(device.lastSyncAt).toLocaleString('tr-TR') : null],
    ['Alım Tarihi',  device.purchaseDate ? new Date(device.purchaseDate).toLocaleDateString('tr-TR') : null],
    ['Garanti Sonu', device.warrantyEnd  ? new Date(device.warrantyEnd).toLocaleDateString('tr-TR')  : null],
  ].filter(([, v]) => v);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 bg-indigo-600 text-white">
          <div>
            <p className="font-bold text-base">{device.name}</p>
            <p className="text-xs text-indigo-200">{device.type}</p>
          </div>
          <button onClick={onClose} className="text-indigo-200 hover:text-white text-xl font-bold">✕</button>
        </div>
        <dl className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
          {rows.map(([label, val]) => (
            <div key={label} className="flex items-start px-6 py-2.5">
              <dt className="text-xs text-gray-400 w-28 shrink-0 pt-0.5">{label}</dt>
              <dd className="text-sm text-gray-800 font-medium">{val}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

// ─── Cihazlar Sekmesi — Daire bazlı, önce daire seç ──────────────────────────
const ALL_TYPES    = ['BILGISAYAR', 'DIZUSTU', 'SUNUCU', 'IPAD_TABLET', 'IP_TELEFON', 'MONITOR', 'YAZICI', 'UPS', 'SWITCH', 'ACCESS_POINT', 'DIGER'];
const ALL_STATUSES = ['ACTIVE', 'PASSIVE', 'BROKEN', 'TRANSFERRED'];
const STATUS_LABELS = { ACTIVE: 'Aktif', PASSIVE: 'Pasif', BROKEN: 'Arızalı', TRANSFERRED: 'Devredildi' };
const STATUS_COLORS = { ACTIVE: 'bg-green-100 text-green-700', PASSIVE: 'bg-gray-100 text-gray-500', BROKEN: 'bg-red-100 text-red-700', TRANSFERRED: 'bg-amber-100 text-amber-700' };
const TYPE_COLORS   = { BILGISAYAR: 'bg-blue-100 text-blue-700', DIZUSTU: 'bg-indigo-100 text-indigo-700', SUNUCU: 'bg-purple-100 text-purple-700', IP_TELEFON: 'bg-green-100 text-green-700', IPAD_TABLET: 'bg-pink-100 text-pink-700', MONITOR: 'bg-amber-100 text-amber-700', YAZICI: 'bg-orange-100 text-orange-700', SWITCH: 'bg-teal-100 text-teal-700', ACCESS_POINT: 'bg-cyan-100 text-cyan-700', UPS: 'bg-red-100 text-red-600', DIGER: 'bg-gray-100 text-gray-600' };

// ─── Stats Paneli ─────────────────────────────────────────────────────────────
function StatsPanel() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/inventory/stats`, { headers: authHeaders() })
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  if (!stats) {
    return (
      <div className="grid grid-cols-5 gap-3 mb-6">
        {Array(5).fill(0).map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  const t = stats.totalByType || {};
  const cards = [
    { label: 'Bilgisayar',    value: (t.BILGISAYAR || 0), icon: '🖥️',  color: 'border-blue-100' },
    { label: 'Dizüstü',       value: (t.DIZUSTU || 0),    icon: '💻',  color: 'border-indigo-100' },
    { label: 'IP Telefon',    value: (t.IP_TELEFON || 0), icon: '☎️',  color: 'border-green-100' },
    { label: 'Yazıcı',        value: (t.YAZICI || 0),     icon: '🖨️',  color: 'border-amber-100' },
    { label: 'Bugün Eklenen', value: (stats.addedToday || 0), icon: '➕', color: 'border-emerald-100', prefix: '+' },
  ];

  return (
    <div className="grid grid-cols-5 gap-3 mb-6">
      {cards.map(c => (
        <div key={c.label} className={`bg-white border ${c.color} rounded-2xl p-4 shadow-sm`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{c.icon}</span>
            <p className="text-xs text-gray-400">{c.label}</p>
          </div>
          <p className="text-2xl font-bold text-gray-800 tabular-nums">
            {c.prefix || ''}{c.value.toLocaleString('tr-TR')}
          </p>
        </div>
      ))}
    </div>
  );
}

function DevicesTab({ user }) {
  const isAdmin = user?.role === 'admin' || (user?.groups || []).includes('int_bislem');

  const [directorates, setDirs]   = useState([]);
  const [selectedDir, setSelectedDir] = useState('');
  const [devices, setDevices]     = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(false);
  const [detail, setDetail]       = useState(null);

  const [search, setSearch]           = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage]               = useState(1);
  const LIMIT = 50;

  // Daire listesini çek
  useEffect(() => {
    fetch(`${API}/api/inventory/directorates`, { headers: authHeaders() })
      .then(r => r.json())
      .then(dirs => {
        setDirs(dirs);
        // manager → sadece kendi dairesi, otomatik seç
        if (!isAdmin && user?.directorate) {
          setSelectedDir(user.directorate);
        } else if (!isAdmin && dirs.length === 1) {
          setSelectedDir(dirs[0]);
        }
      })
      .catch(() => {});
  }, [isAdmin, user?.directorate]);

  // Daire seçili olunca veri çek
  useEffect(() => {
    if (!selectedDir) { setDevices([]); setTotal(0); return; }

    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({ directorate: selectedDir, page: String(page), limit: String(LIMIT) });
    if (searchQuery)  params.set('search', searchQuery);
    if (filterType)   params.set('type', filterType);
    if (filterStatus) params.set('status', filterStatus);

    fetch(`${API}/api/inventory?${params}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (!cancelled) { setDevices(d.devices || []); setTotal(d.total || 0); } })
      .catch(() => { if (!cancelled) setDevices([]); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [selectedDir, searchQuery, filterType, filterStatus, page]);

  function handleSearch(e) { e.preventDefault(); setPage(1); setSearchQuery(search); }
  function handleDirChange(e) { setSelectedDir(e.target.value); setPage(1); setSearchQuery(''); setSearch(''); }

  const pages = Math.ceil(total / LIMIT);
  const selectCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white';

  return (
    <div className="space-y-4">
      {/* Filtre satırı */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={selectedDir}
          onChange={handleDirChange}
          className={`${selectCls} min-w-[220px] font-medium cursor-pointer`}
        >
          <option value="">— Daire Başkanlığı Seçin —</option>
          <option value="__unassigned__">📋 Atanmamış / Daire Bilinmiyor</option>
          {directorates.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }} className={`${selectCls} cursor-pointer`}>
          <option value="">Tüm Tipler</option>
          {ALL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className={`${selectCls} cursor-pointer`}>
          <option value="">Tüm Durumlar</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>

        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-52">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cihaz adı, seri no, kullanıcı..."
            className={`${selectCls} flex-1`}
          />
          <button type="submit"
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
            Ara
          </button>
        </form>

        {selectedDir && <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">{total} cihaz</span>}
      </div>

      {/* İçerik */}
      {!selectedDir ? (
        <div className="py-24 flex flex-col items-center gap-3 text-center">
          <span className="text-5xl">🏢</span>
          <p className="text-base font-medium text-gray-500">Listelemek için daire başkanlığı seçin</p>
          <p className="text-sm text-gray-400">Soldaki açılır menüden bir daire başkanlığı seçerek cihazları listeleyin</p>
        </div>
      ) : loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Yükleniyor...</div>
      ) : devices.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">Bu daire için cihaz bulunamadı</div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500">
                <th className="text-left px-4 py-3 font-medium">Cihaz Adı</th>
                <th className="text-left px-3 py-3 font-medium">Tip</th>
                <th className="text-left px-3 py-3 font-medium">Kullanıcı</th>
                <th className="text-left px-3 py-3 font-medium">Müdürlük</th>
                <th className="text-left px-3 py-3 font-medium">IP / Hostname</th>
                <th className="text-left px-3 py-3 font-medium">OS</th>
                <th className="text-left px-3 py-3 font-medium">Durum</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {devices.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{d.name}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[d.type] || TYPE_COLORS.DIGER}`}>
                      {d.type}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 text-xs">
                    {d.userName
                      ? <span>{d.userName}<span className="text-gray-400 ml-1">({d.assignedTo})</span></span>
                      : d.assignedTo || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-gray-500 text-xs max-w-[140px] truncate" title={d.userDepartment || d.department}>{d.userDepartment || d.department || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-500 text-xs font-mono">{d.ipAddress || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-500 text-xs max-w-[150px] truncate" title={d.model}>{d.model || '—'}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[d.status] || ''}`}>
                        {STATUS_LABELS[d.status] || d.status}
                      </span>
                      {d.epcStatus === 'online'  && <span title="EPC: Çevrimiçi"    className="text-xs">🟢</span>}
                      {d.epcStatus === 'passive' && <span title="EPC: Pasif (1-7g)"  className="text-xs">🟡</span>}
                      {d.epcStatus === 'offline' && <span title="EPC: Çevrimdışı (7g+)" className="text-xs">🔴</span>}
                      {d.epcStatus === 'unknown' && <span title="EPC: Bilinmiyor"   className="text-xs">⚫</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => setDetail(d)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline">
                      Detay
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sayfalama */}
      {pages > 1 && selectedDir && (
        <div className="flex justify-center gap-1">
          {Array.from({ length: Math.min(pages, 10) }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`px-3 py-1 rounded text-sm ${p === page ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {detail && <DeviceDetailModal device={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

// ─── Sync Sonuç Modal ─────────────────────────────────────────────────────────
function SyncResultModal({ result, onClose }) {
  if (!result) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <span className="text-2xl">✅</span>
          <h2 className="text-lg font-semibold text-gray-800">Senkronizasyon Tamamlandı</h2>
        </div>

        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          {/* Özet istatistikler */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Toplam AD Bilgisayarı', value: result.total,     color: 'text-gray-700' },
              { label: 'Güncellenen',           value: result.updated,   color: 'text-amber-600' },
              { label: 'Yeni Eklenen',          value: result.new,       color: 'text-green-600' },
              { label: 'Değişmeyen',            value: result.unchanged, color: 'text-gray-400' },
            ].map((s) => (
              <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Değişiklikler listesi */}
          {result.changes.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Değişiklikler</p>
              <ul className="space-y-2">
                {result.changes.map((c, i) => (
                  <li key={i} className={`text-sm px-3 py-2 rounded-lg border ${
                    c.type === 'NEW'
                      ? 'bg-green-50 border-green-100 text-green-800'
                      : 'bg-amber-50 border-amber-100 text-amber-800'
                  }`}>
                    <span className="font-medium">{c.deviceName}</span>
                    <span className="text-xs ml-2 opacity-70">{c.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-2">Hiçbir değişiklik tespit edilmedi</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button onClick={onClose}
            className="px-5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Değişiklik Geçmişi (kaldırıldı) ─────────────────────────────────────────
function ChangeLogsTab() {
  const [logs, setLogs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [deviceName, setDeviceName] = useState('');
  const [from, setFrom]           = useState('');
  const [to, setTo]               = useState('');

  const load = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200', ...filters }).toString();
      const r = await fetch(`${API}/api/inventory/sync-logs?${params}`, { headers: authHeaders() });
      setLogs(await r.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function applyFilters() {
    const f = {};
    if (deviceName.trim()) f.deviceName = deviceName.trim();
    if (from) f.from = from;
    if (to)   f.to   = to + 'T23:59:59';
    load(f);
  }

  function exportCsv() {
    const header = 'Tarih,Cihaz,Alan,Eski Değer,Yeni Değer,Kim\n';
    const rows = logs.map((l) =>
      [
        new Date(l.createdAt).toLocaleString('tr-TR'),
        l.device?.name || l.deviceId,
        FIELD_LABELS[l.field] || l.field,
        l.oldValue || '',
        l.newValue || '',
        l.changedBy || '',
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `envanter-degisiklik-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Filtreler */}
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Cihaz Adı</label>
          <input value={deviceName} onChange={(e) => setDeviceName(e.target.value)}
            placeholder="MBB-PC-001"
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-44" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Başlangıç</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Bitiş</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
        <button onClick={applyFilters}
          className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
          Filtrele
        </button>
        <button onClick={exportCsv} disabled={logs.length === 0}
          className="px-4 py-1.5 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition disabled:opacity-40 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          CSV İndir
        </button>
      </div>

      {/* Tablo */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Yükleniyor...</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">Kayıt bulunamadı</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-400 font-semibold uppercase tracking-wide">
                <th className="text-left px-4 py-3">Tarih</th>
                <th className="text-left px-4 py-3">Cihaz</th>
                <th className="text-left px-4 py-3">Alan</th>
                <th className="text-left px-4 py-3">Eski Değer</th>
                <th className="text-left px-4 py-3">Yeni Değer</th>
                <th className="text-left px-4 py-3">Kim</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(l.createdAt).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">
                    {l.device?.name || `#${l.deviceId}`}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {FIELD_LABELS[l.field] || l.field}
                  </td>
                  <td className="px-4 py-2.5 text-red-500 font-mono text-xs">
                    {l.oldValue || <span className="text-gray-300 italic">boş</span>}
                  </td>
                  <td className="px-4 py-2.5 text-green-600 font-mono text-xs">
                    {l.newValue || <span className="text-gray-300 italic">boş</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-400">
                    {l.changedBy || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── EPC Sync Sonuç Modal ─────────────────────────────────────────────────────
function EpcSyncResultModal({ result, onClose }) {
  if (!result) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <span className="text-2xl">🔧</span>
          <h2 className="text-lg font-semibold text-gray-800">EPC Senkronizasyonu Tamamlandı</h2>
        </div>
        <div className="px-6 py-4 grid grid-cols-2 gap-3">
          {[
            { label: 'Toplam EPC',    value: result.total,   color: 'text-gray-700' },
            { label: 'Güncellenen',   value: result.updated, color: 'text-amber-600' },
            { label: 'Yeni Eklenen',  value: result.created, color: 'text-green-600' },
            { label: 'Hata',          value: result.errors,  color: 'text-red-500' },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value ?? 0}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button onClick={onClose}
            className="px-5 py-2 text-sm font-medium bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────
export default function Envanter() {
  const { user } = useAuth();
  const [tab, setTab]             = useState('devices');
  const [syncing, setSyncing]     = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [syncError, setSyncError] = useState('');
  const [epcSyncing, setEpcSyncing]       = useState(false);
  const [epcSyncResult, setEpcSyncResult] = useState(null);
  const [epcSyncError, setEpcSyncError]   = useState('');

  async function handleSync() {
    setSyncing(true); setSyncError('');
    try {
      const r = await fetch(`${API}/api/inventory/sync-ad`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Senkronizasyon başarısız');
      setSyncResult(data);
    } catch (err) {
      setSyncError(err.message);
    } finally {
      setSyncing(false);
    }
  }

  async function handleEpcSync() {
    setEpcSyncing(true); setEpcSyncError('');
    try {
      const r = await fetch(`${API}/api/servicedesk/sync`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await r.json();
      if (!r.ok || !data.success) throw new Error(data.error || 'EPC senkronizasyonu başarısız');
      setEpcSyncResult(data);
    } catch (err) {
      setEpcSyncError(err.message);
    } finally {
      setEpcSyncing(false);
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Envanter</h1>
          <p className="text-sm text-gray-400 mt-1">Lokasyonlar ve cihaz yönetimi</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleEpcSync}
            disabled={epcSyncing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition disabled:opacity-60"
          >
            <svg className={`w-4 h-4 ${epcSyncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
            </svg>
            {epcSyncing ? 'EPC Senkronize...' : 'EPC\'den Senkronize Et'}
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-60"
          >
            <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {syncing ? 'Senkronize ediliyor...' : 'AD\'den Senkronize Et'}
          </button>
        </div>
      </div>

      {syncError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
          {syncError}
        </div>
      )}
      {epcSyncError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
          EPC: {epcSyncError}
        </div>
      )}

      {/* Stats her zaman görünür */}
      <StatsPanel />

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'devices',   label: 'Cihazlar' },
          { key: 'locations', label: 'Lokasyonlar' },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-2 text-sm font-medium rounded-lg transition
              ${tab === t.key
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'devices'   && <DevicesTab user={user} />}
      {tab === 'locations' && <LocationsTab userRole={user?.role} />}

      <SyncResultModal result={syncResult} onClose={() => setSyncResult(null)} />
      <EpcSyncResultModal result={epcSyncResult} onClose={() => setEpcSyncResult(null)} />
    </div>
  );
}
