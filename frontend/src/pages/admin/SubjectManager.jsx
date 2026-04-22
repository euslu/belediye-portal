import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL || '';

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

async function fetchGroups() {
  const res = await fetch(`${API}/api/groups`, { headers: authHeaders() });
  return res.json();
}

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [groups, setGroups]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  // Modal state
  const [modal, setModal]     = useState(null); // null | { mode: 'add' | 'edit', cat?: obj }
  const [formName, setFormName]                 = useState('');
  const [formGroupId, setFormGroupId]           = useState('');
  const [formSlaHours, setFormSlaHours]         = useState('');
  const [formSlaWarning, setFormSlaWarning]     = useState('');
  const [saving, setSaving]   = useState(false);
  const [formError, setFormError] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([fetchCategories(), fetchGroups()])
      .then(([cats, grps]) => { setCategories(cats); setGroups(grps); })
      .catch(() => setError('Başvuru konuları yüklenemedi'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openAdd = () => {
    setFormName(''); setFormGroupId(''); setFormSlaHours(''); setFormSlaWarning(''); setFormError('');
    setModal({ mode: 'add' });
  };
  const openEdit = (cat) => {
    setFormName(cat.name);
    setFormGroupId(cat.assignedGroupId || '');
    setFormSlaHours(cat.slaHours ?? '');
    setFormSlaWarning(cat.slaWarningHours ?? '');
    setFormError('');
    setModal({ mode: 'edit', cat });
  };
  const closeModal = () => setModal(null);

  const handleSave = async () => {
    if (!formName.trim()) { setFormError('Başvuru konusu adı boş olamaz'); return; }
    setSaving(true); setFormError('');
    const body = {
      name: formName,
      assignedGroupId: formGroupId ? parseInt(formGroupId) : null,
      slaHours: formSlaHours !== '' ? parseInt(formSlaHours) : null,
      slaWarningHours: formSlaWarning !== '' ? parseInt(formSlaWarning) : null,
    };
    try {
      if (modal.mode === 'add') {
        const res = await fetch(`${API}/api/categories`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      } else {
        const res = await fetch(`${API}/api/categories/${modal.cat.id}`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify(body),
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
          style={{ display:'flex', alignItems:'center', gap:6, background:'#1d4ed8', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer' }}
        >
          <span style={{ fontSize:18, lineHeight:1 }}>+</span> Yeni Başvuru Konusu
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
                <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Tip</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Atanmış Grup</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">SLA</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Ticket</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Durum</th>
                <th className="text-right text-xs font-semibold text-gray-500 px-5 py-3">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((cat) => (
                <tr key={cat.id} className={`transition ${!cat.active ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-3.5 font-medium text-gray-800">{cat.name}</td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs">
                    {cat.submitType?.name ? (
                      <span style={{ background: cat.submitType.color === 'indigo' ? '#eef2ff' : '#f0fdf4', color: cat.submitType.color === 'indigo' ? '#4338ca' : '#166534', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                        {cat.submitType.name}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs">
                    {cat.assignedGroup?.name || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs">
                    {cat.slaHours ? `${cat.slaHours} saat` : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">{cat._count?.tickets ?? 0}</td>
                  <td className="px-5 py-3.5">
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div
                        onClick={() => toggleActive(cat)}
                        title={cat.active ? 'Pasife al' : 'Aktife al'}
                        style={{
                          width:36, height:20, borderRadius:10, cursor:'pointer',
                          background: cat.active ? '#2563eb' : '#d1d5db',
                          position:'relative', flexShrink:0,
                          transition:'background .2s',
                        }}
                      >
                        <div style={{
                          position:'absolute', top:2,
                          left: cat.active ? 18 : 2,
                          width:16, height:16, borderRadius:'50%',
                          background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,.25)',
                          transition:'left .2s',
                        }} />
                      </div>
                      <span style={{ fontSize:12, fontWeight:600, whiteSpace:'nowrap', color: cat.active ? '#16a34a' : '#9ca3af' }}>
                        {cat.active ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:6 }}>
                      <button
                        onClick={() => openEdit(cat)}
                        style={{ background:'#eff6ff', color:'#1d4ed8', border:'1px solid #bfdbfe', borderRadius:6, padding:'4px 12px', fontSize:12, fontWeight:600, cursor:'pointer' }}
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        style={{ background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca', borderRadius:6, padding:'4px 12px', fontSize:12, fontWeight:600, cursor:'pointer' }}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }} onClick={closeModal}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)',
              width: '100%',
              maxWidth: 460,
              margin: '0 16px',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                {modal.mode === 'add' ? 'Yeni Başvuru Konusu Ekle' : 'Başvuru Konusu Düzenle'}
              </h2>
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                {modal.mode === 'add' ? 'Yeni bir başvuru konusu tanımlayın' : 'Başvuru konusu bilgilerini güncelleyin'}
              </p>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px' }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                  Başvuru Konusu Adı <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  autoFocus
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  placeholder="örn. Talep"
                  style={{
                    width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 14px',
                    fontSize: 14, outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
                    background: '#fff', color: '#1e293b',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                  ITSM Grubu
                </label>
                <select
                  value={formGroupId}
                  onChange={(e) => setFormGroupId(e.target.value)}
                  style={{
                    width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 14px',
                    fontSize: 14, outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
                    background: '#fff', color: '#1e293b', cursor: 'pointer',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <option value="">Grup seçin (opsiyonel)</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Bu kategorideki ticketlar otomatik olarak bu gruba atanır</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                    SLA Süresi (saat)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formSlaHours}
                    onChange={(e) => setFormSlaHours(e.target.value)}
                    placeholder="örn. 24"
                    style={{
                      width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 14px',
                      fontSize: 14, outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
                      background: '#fff', color: '#1e293b',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                    SLA Uyarı (saat)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formSlaWarning}
                    onChange={(e) => setFormSlaWarning(e.target.value)}
                    placeholder="örn. 20"
                    style={{
                      width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 14px',
                      fontSize: 14, outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
                      background: '#fff', color: '#1e293b',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              {formError && <p style={{ flex: 1, fontSize: 12, color: '#ef4444', alignSelf: 'center', margin: 0 }}>{formError}</p>}
              <button
                onClick={closeModal}
                style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, padding: '9px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1, transition: 'background 0.15s' }}
                onMouseEnter={e => !saving && (e.currentTarget.style.background = '#1e40af')}
                onMouseLeave={e => e.currentTarget.style.background = '#1d4ed8'}
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
