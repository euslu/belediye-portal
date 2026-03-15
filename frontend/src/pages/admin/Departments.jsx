import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || '';
function authFetch(url, opts = {}) {
  const token = localStorage.getItem('token');
  return fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts.headers },
  });
}

const EMPTY_FORM = { name: '', shortCode: '', description: '', managerId: '', isActive: true };

export default function Departments() {
  const [depts, setDepts]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showAll, setShowAll]   = useState(false);
  const [modal, setModal]       = useState(null); // null | 'add' | dept object
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const load = async (all = showAll) => {
    setLoading(true);
    try {
      const r = await authFetch(`${API}/api/departments?all=${all}`);
      if (r.ok) setDepts(await r.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [showAll]);

  const openAdd  = () => { setForm(EMPTY_FORM); setError(''); setModal('add'); };
  const openEdit = (d) => { setForm({ name: d.name, shortCode: d.shortCode, description: d.description || '', managerId: d.managerId || '', isActive: d.isActive }); setError(''); setModal(d); };
  const closeModal = () => setModal(null);

  const handleSave = async () => {
    if (!form.name.trim() || !form.shortCode.trim()) {
      setError('Ad ve kısa kod zorunludur');
      return;
    }
    setSaving(true); setError('');
    try {
      const isEdit = modal !== 'add';
      const r = await authFetch(
        isEdit ? `${API}/api/departments/${modal.id}` : `${API}/api/departments`,
        { method: isEdit ? 'PATCH' : 'POST', body: JSON.stringify(form) }
      );
      const data = await r.json();
      if (!r.ok) { setError(data.error || 'Hata'); return; }
      closeModal();
      load();
    } finally { setSaving(false); }
  };

  const handleDeactivate = async (d) => {
    if (!confirm(`"${d.name}" dairesini pasife almak istediğinize emin misiniz?`)) return;
    await authFetch(`${API}/api/departments/${d.id}`, { method: 'DELETE' });
    load();
  };

  const handleActivate = async (d) => {
    await authFetch(`${API}/api/departments/${d.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: true }) });
    load();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Daireler / Birimler</h1>
          <p className="text-sm text-gray-500 mt-0.5">Sistemde kayıtlı daire ve birimler</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
            <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} className="rounded text-indigo-600" />
            Pasif dahil
          </label>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
            + Yeni Daire
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Yükleniyor…</p>
      ) : depts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🏛️</p>
          <p className="text-sm">Henüz daire eklenmemiş.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3 text-left">Daire Adı</th>
                <th className="px-5 py-3 text-left">Kısa Kod</th>
                <th className="px-5 py-3 text-left">Açıklama</th>
                <th className="px-5 py-3 text-left">Yönetici</th>
                <th className="px-5 py-3 text-center">Talepler</th>
                <th className="px-5 py-3 text-center">Durum</th>
                <th className="px-5 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {depts.map(d => (
                <tr key={d.id} className={`hover:bg-gray-50 transition ${!d.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-3 font-medium text-gray-800">{d.name}</td>
                  <td className="px-5 py-3">
                    <span className="inline-block bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded">
                      {d.shortCode}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 max-w-xs truncate">{d.description || '—'}</td>
                  <td className="px-5 py-3 text-gray-500">{d.managerId || '—'}</td>
                  <td className="px-5 py-3 text-center text-gray-600">{d._count?.tickets ?? 0}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${d.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {d.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(d)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50 transition">
                        Düzenle
                      </button>
                      {d.isActive ? (
                        <button onClick={() => handleDeactivate(d)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition">
                          Pasife Al
                        </button>
                      ) : (
                        <button onClick={() => handleActivate(d)}
                          className="text-xs text-green-600 hover:text-green-800 font-medium px-2 py-1 rounded hover:bg-green-50 transition">
                          Aktifleştir
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900">
              {modal === 'add' ? 'Yeni Daire Ekle' : `Düzenle — ${modal.name}`}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Daire Adı <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Destek Hizmetleri Dairesi"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Kısa Kod <span className="text-red-500">*</span></label>
                <input value={form.shortCode} onChange={e => setForm(p => ({ ...p, shortCode: e.target.value.toUpperCase() }))}
                  placeholder="DHD" maxLength={10}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Açıklama</label>
                <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Kısa açıklama (opsiyonel)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Yönetici (AD Kullanıcı Adı)</label>
                <input value={form.managerId} onChange={e => setForm(p => ({ ...p, managerId: e.target.value }))}
                  placeholder="ahmet.yilmaz"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              {modal !== 'add' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} className="rounded text-indigo-600" />
                  <span className="text-sm text-gray-700">Aktif</span>
                </label>
              )}
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

            <div className="flex gap-2 justify-end pt-2">
              <button onClick={closeModal}
                className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
                İptal
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
                {saving ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
