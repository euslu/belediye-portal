import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  };
}

async function fetchCategories() {
  const res = await fetch(`${API}/api/categories?all=true`, { headers: authHeaders() });
  return res.json();
}

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  // Modal state
  const [modal, setModal]     = useState(null); // null | { mode: 'add' | 'edit', cat?: obj }
  const [formName, setFormName] = useState('');
  const [saving, setSaving]   = useState(false);
  const [formError, setFormError] = useState('');

  const load = () => {
    setLoading(true);
    fetchCategories()
      .then(setCategories)
      .catch(() => setError('Başvuru konuları yüklenemedi'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openAdd  = () => { setFormName(''); setFormError(''); setModal({ mode: 'add' }); };
  const openEdit = (cat) => { setFormName(cat.name); setFormError(''); setModal({ mode: 'edit', cat }); };
  const closeModal = () => setModal(null);

  const handleSave = async () => {
    if (!formName.trim()) { setFormError('Başvuru konusu adı boş olamaz'); return; }
    setSaving(true); setFormError('');
    try {
      if (modal.mode === 'add') {
        const res = await fetch(`${API}/api/categories`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ name: formName }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      } else {
        const res = await fetch(`${API}/api/categories/${modal.cat.id}`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify({ name: formName }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      }
      closeModal();
      load();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (cat) => {
    try {
      await fetch(`${API}/api/categories/${cat.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ active: !cat.active }),
      });
      load();
    } catch { /* ignore */ }
  };

  const handleDelete = async (cat) => {
    if (!confirm(`"${cat.name}" başvuru konusunu silmek istediğinize emin misiniz?`)) return;
    try {
      const res = await fetch(`${API}/api/categories/${cat.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error); return; }
      load();
    } catch { alert('Silinemedi'); }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Başvuru Konusu Yönetimi</h1>
          <p className="text-xs text-gray-400 mt-0.5">{categories.length} başvuru konusu</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition"
        >
          <span className="text-lg leading-none">+</span> Yeni Başvuru Konusu
        </button>
      </div>

      {/* Tablo */}
      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">Yükleniyor...</div>
      ) : error ? (
        <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Başvuru Konusu Adı</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Ticket Sayısı</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Durum</th>
                <th className="text-right text-xs font-semibold text-gray-500 px-5 py-3">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((cat) => (
                <tr key={cat.id} className={`transition ${!cat.active ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-3.5 font-medium text-gray-800">{cat.name}</td>
                  <td className="px-5 py-3.5 text-gray-500">{cat._count?.tickets ?? 0}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(cat)}
                        title={cat.active ? 'Pasife al' : 'Aktife al'}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none
                          ${cat.active ? 'bg-blue-600' : 'bg-gray-200'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform`}
                          style={{ transform: cat.active ? 'translateX(18px)' : 'translateX(2px)' }}
                        />
                      </button>
                      <span className={`text-sm font-medium whitespace-nowrap ${cat.active ? 'text-green-600' : 'text-gray-400'}`}>
                        {cat.active ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(cat)}
                        className="text-xs text-blue-600 hover:text-blue-800 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        className="text-xs text-red-500 hover:text-red-700 px-2.5 py-1 rounded-lg hover:bg-red-50 transition"
                      >
                        Sil
                      </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold text-gray-800 mb-4">
              {modal.mode === 'add' ? 'Yeni Başvuru Konusu Ekle' : 'Başvuru Konusu Düzenle'}
            </h2>
            <label className="block text-xs font-medium text-gray-600 mb-1">Başvuru Konusu Adı</label>
            <input
              autoFocus
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="örn. Talep"
            />
            {formError && <p className="text-xs text-red-500 mt-1.5">{formError}</p>}
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition disabled:opacity-50"
              >
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
