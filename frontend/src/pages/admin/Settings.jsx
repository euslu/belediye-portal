import { useState, useEffect } from 'react';
import {
  getSettings, patchSettings,
  getSubmitTypes, createSubmitType, updateSubmitType, deleteSubmitType,
} from '../../api/settings';
import { getGroups, updateGroup, setGroupLeader, getGroupMembers } from '../../api/groups';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` };
}
async function apiPatch(path, body) {
  const res  = await fetch(`${API_URL}${path}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Hata');
  return data;
}
async function apiPost(path, body) {
  const res  = await fetch(`${API_URL}${path}`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Hata');
  return data;
}
async function apiDelete(path) {
  const res  = await fetch(`${API_URL}${path}`, { method: 'DELETE', headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Hata');
  return data;
}
async function getCategories() {
  const res  = await fetch(`${API_URL}/api/categories?all=true`, { headers: authHeaders() });
  return res.json();
}
async function getAllSubjects() {
  const res = await fetch(`${API_URL}/api/subjects?all=true`, { headers: authHeaders() });
  return res.json();
}

// ─── Color palette for submit types ──────────────────────────────────────────
const COLOR_OPTIONS = [
  { key: 'red',    label: 'Kırmızı', bg: 'bg-red-100',    text: 'text-red-700',    ring: 'ring-red-400' },
  { key: 'orange', label: 'Turuncu', bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-400' },
  { key: 'amber',  label: 'Kehribar', bg: 'bg-amber-100', text: 'text-amber-700',  ring: 'ring-amber-400' },
  { key: 'green',  label: 'Yeşil',   bg: 'bg-green-100',  text: 'text-green-700',  ring: 'ring-green-400' },
  { key: 'blue',   label: 'Mavi',    bg: 'bg-blue-100',   text: 'text-blue-700',   ring: 'ring-blue-400' },
  { key: 'indigo', label: 'İndigo',  bg: 'bg-indigo-100', text: 'text-indigo-700', ring: 'ring-indigo-400' },
  { key: 'purple', label: 'Mor',     bg: 'bg-purple-100', text: 'text-purple-700', ring: 'ring-purple-400' },
  { key: 'gray',   label: 'Gri',     bg: 'bg-gray-100',   text: 'text-gray-700',   ring: 'ring-gray-400' },
];
function colorClasses(key) {
  return COLOR_OPTIONS.find((c) => c.key === key) || COLOR_OPTIONS[5];
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = (msg, type = 'success') => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  };
  return { toasts, success: (m) => add(m, 'success'), error: (m) => add(m, 'error') };
}
function Toasts({ toasts }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((t) => (
        <div key={t.id}
          className={`px-4 py-2 rounded-lg shadow-lg text-sm font-medium text-white
            ${t.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── Başvuru Tipleri Tab ──────────────────────────────────────────────────────
function SubmitTypesTab({ toast }) {
  const [types, setTypes]   = useState([]);
  const [editId, setEditId] = useState(null);
  const [form, setForm]     = useState({ name: '', key: '', icon: '', color: 'indigo', description: '' });
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSubmitTypes(true).then(setTypes).finally(() => setLoading(false));
  }, []);

  function startEdit(t) {
    setEditId(t.id);
    setForm({ name: t.name, key: t.key, icon: t.icon || '', color: t.color || 'indigo', description: t.description || '' });
    setAdding(false);
  }
  function startAdd() {
    setAdding(true);
    setEditId(null);
    setForm({ name: '', key: '', icon: '', color: 'indigo', description: '' });
  }
  function cancel() { setEditId(null); setAdding(false); }

  async function save() {
    try {
      if (adding) {
        const t = await createSubmitType(form);
        setTypes((prev) => [...prev, t].sort((a, b) => a.order - b.order));
        toast.success('Başvuru tipi oluşturuldu');
      } else {
        const t = await updateSubmitType(editId, form);
        setTypes((prev) => prev.map((x) => (x.id === editId ? t : x)));
        toast.success('Güncellendi');
      }
      cancel();
    } catch (e) { toast.error(e.message); }
  }

  async function toggleActive(t) {
    try {
      const updated = await updateSubmitType(t.id, { active: !t.active });
      setTypes((prev) => prev.map((x) => (x.id === t.id ? updated : x)));
    } catch (e) { toast.error(e.message); }
  }

  async function del(t) {
    if (!confirm(`"${t.name}" tipini silmek istediğinizden emin misiniz?`)) return;
    try {
      await deleteSubmitType(t.id);
      setTypes((prev) => prev.filter((x) => x.id !== t.id));
      toast.success('Silindi');
    } catch (e) { toast.error(e.message); }
  }

  if (loading) return <div className="text-sm text-gray-500 py-8 text-center">Yükleniyor…</div>;

  const FormRow = () => (
    <tr className="bg-indigo-50">
      <td className="px-4 py-2">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Ad (ör. Arıza)" className="w-full text-sm border border-indigo-300 rounded px-2 py-1" />
      </td>
      <td className="px-4 py-2">
        <input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value.toUpperCase() })}
          placeholder="Anahtar (ör. ARIZA)" className="w-full text-sm border border-indigo-300 rounded px-2 py-1 font-mono" />
      </td>
      <td className="px-4 py-2">
        <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}
          placeholder="Emoji" className="w-16 text-sm border border-indigo-300 rounded px-2 py-1 text-center" />
      </td>
      <td className="px-4 py-2">
        <div className="flex gap-1 flex-wrap">
          {COLOR_OPTIONS.map((c) => (
            <button key={c.key} onClick={() => setForm({ ...form, color: c.key })}
              className={`w-5 h-5 rounded-full ${c.bg} border-2 ${form.color === c.key ? 'border-gray-700 scale-110' : 'border-transparent'}`}
              title={c.label} />
          ))}
        </div>
      </td>
      <td className="px-4 py-2">
        <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Açıklama" className="w-full text-sm border border-indigo-300 rounded px-2 py-1" />
      </td>
      <td className="px-4 py-2">
        <div className="flex gap-2">
          <button onClick={save}
            className="px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700">Kaydet</button>
          <button onClick={cancel}
            className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded hover:bg-gray-200">İptal</button>
        </div>
      </td>
    </tr>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Ticket oluştururken gösterilen başvuru tipi kartları.</p>
        <button onClick={startAdd}
          className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 flex items-center gap-1">
          <span>+</span> Yeni Tip
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Ad</th>
              <th className="px-4 py-3 text-left">Anahtar</th>
              <th className="px-4 py-3 text-left">İkon</th>
              <th className="px-4 py-3 text-left">Renk</th>
              <th className="px-4 py-3 text-left">Açıklama</th>
              <th className="px-4 py-3 text-left">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {adding && <FormRow />}
            {types.map((t) =>
              editId === t.id ? (
                <FormRow key={t.id} />
              ) : (
                <tr key={t.id} className={`hover:bg-gray-50 ${!t.active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{t.key}</span>
                  </td>
                  <td className="px-4 py-3 text-lg">{t.icon || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses(t.color).bg} ${colorClasses(t.color).text}`}>
                      <span className={`w-2 h-2 rounded-full bg-current`} />
                      {colorClasses(t.color).label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{t.description || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEdit(t)}
                        className="text-indigo-600 hover:text-indigo-800 text-xs">Düzenle</button>
                      <button onClick={() => toggleActive(t)}
                        className={`text-xs whitespace-nowrap ${t.active ? 'text-amber-600 hover:text-amber-800' : 'text-green-600 hover:text-green-800'}`}>
                        {t.active ? 'Pasif Yap' : 'Aktif Yap'}
                      </button>
                      <button onClick={() => del(t)}
                        className="text-red-500 hover:text-red-700 text-xs">Sil</button>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Başvuru Konuları Tab ─────────────────────────────────────────────────────
function CategoriesTab({ toast }) {
  const [submitTypes, setSubmitTypes] = useState([]);
  const [categories, setCategories]   = useState([]);
  const [subjects, setSubjects]       = useState([]);
  const [groups, setGroups]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [openTypes, setOpenTypes]     = useState({});

  // Add category state
  const [addCatTypeId, setAddCatTypeId] = useState(null);
  const [addCatForm, setAddCatForm]     = useState({ name: '', icon: '' });

  // Add subject state
  const [addSubCatId, setAddSubCatId] = useState(null);
  const [addSubForm, setAddSubForm]   = useState({ name: '', defaultGroupId: '' });

  // Edit states
  const [editCat, setEditCat] = useState(null); // { id, name, icon }
  const [editSub, setEditSub] = useState(null); // { id, name, defaultGroupId }

  useEffect(() => { reload(); }, []);

  function reload() {
    setLoading(true);
    Promise.all([getSubmitTypes(true), getCategories(), getAllSubjects(), getGroups()])
      .then(([types, cats, subs, grps]) => {
        setSubmitTypes(types);
        setCategories(cats);
        setSubjects(subs);
        setGroups(grps);
        const opens = {};
        types.forEach((t) => { opens[t.id] = true; });
        setOpenTypes(opens);
      })
      .finally(() => setLoading(false));
  }

  function toggleType(id) {
    setOpenTypes((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // ── Category actions ────────────────────────────────────────────────────────
  async function addCategory(typeId) {
    if (!addCatForm.name.trim()) return toast.error('Kategori adı zorunludur');
    try {
      const cat = await apiPost('/api/categories', {
        name: addCatForm.name.trim(), icon: addCatForm.icon, typeId,
      });
      setCategories((prev) => [...prev, cat]);
      setAddCatTypeId(null);
      setAddCatForm({ name: '', icon: '' });
      toast.success('Kategori eklendi');
    } catch (e) { toast.error(e.message); }
  }

  async function saveEditCat() {
    try {
      const updated = await apiPatch(`/api/categories/${editCat.id}`, {
        name: editCat.name, icon: editCat.icon,
      });
      setCategories((prev) => prev.map((c) => (c.id === editCat.id ? { ...c, ...updated } : c)));
      setEditCat(null);
      toast.success('Kategori güncellendi');
    } catch (e) { toast.error(e.message); }
  }

  async function deleteCat(cat) {
    if (!confirm(`"${cat.name}" kategorisini silmek istediğinize emin misiniz?`)) return;
    try {
      await apiDelete(`/api/categories/${cat.id}`);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      toast.success('Kategori silindi');
    } catch (e) { toast.error(e.message); }
  }

  // ── Subject actions ─────────────────────────────────────────────────────────
  async function addSubject(catId) {
    if (!addSubForm.name.trim()) return toast.error('Başvuru konusu adı zorunludur');
    try {
      const sub = await apiPost('/api/subjects', {
        name: addSubForm.name.trim(),
        categoryId: catId,
        defaultGroupId: addSubForm.defaultGroupId || null,
      });
      setSubjects((prev) => [...prev, sub]);
      setAddSubCatId(null);
      setAddSubForm({ name: '', defaultGroupId: '' });
      toast.success('Başvuru konusu eklendi');
    } catch (e) { toast.error(e.message); }
  }

  async function saveEditSub() {
    try {
      const updated = await apiPatch(`/api/subjects/${editSub.id}`, {
        name: editSub.name,
        defaultGroupId: editSub.defaultGroupId || null,
      });
      setSubjects((prev) => prev.map((s) => (s.id === editSub.id ? { ...s, ...updated } : s)));
      setEditSub(null);
      toast.success('Başvuru konusu güncellendi');
    } catch (e) { toast.error(e.message); }
  }

  async function deleteSub(sub) {
    if (!confirm(`"${sub.name}" silinsin mi?`)) return;
    try {
      await apiDelete(`/api/subjects/${sub.id}`);
      setSubjects((prev) => prev.filter((s) => s.id !== sub.id));
      toast.success('Silindi');
    } catch (e) { toast.error(e.message); }
  }

  if (loading) return <div className="text-sm text-gray-500 py-8 text-center">Yükleniyor…</div>;

  return (
    <div className="space-y-3">
      {submitTypes.map((st) => {
        const cc       = colorClasses(st.color);
        const typeCats = categories.filter((c) => c.typeId === st.id);
        const isOpen   = openTypes[st.id] !== false;

        return (
          <div key={st.id} className="border border-gray-200 rounded-xl overflow-hidden">

            {/* ── Submit Type header ── */}
            <button
              onClick={() => toggleType(st.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 ${cc.bg} hover:opacity-90 transition`}
            >
              <span className="text-lg">{st.icon}</span>
              <span className={`flex-1 text-left font-semibold text-sm ${cc.text}`}>{st.name}</span>
              <span className={`text-xs ${cc.text} opacity-60`}>{typeCats.length} kategori</span>
              <svg
                className={`w-4 h-4 ${cc.text} transition-transform ${isOpen ? 'rotate-90' : ''}`}
                fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {isOpen && (
              <div className="divide-y divide-gray-100">
                {typeCats.map((cat) => {
                  const catSubs     = subjects.filter((s) => s.categoryId === cat.id);
                  const isEditingCat = editCat?.id === cat.id;

                  return (
                    <div key={cat.id} className="bg-gray-50">

                      {/* ── Category row ── */}
                      <div className="flex items-center gap-2 px-4 py-2.5 group">
                        {isEditingCat ? (
                          <>
                            <input
                              value={editCat.icon}
                              onChange={(e) => setEditCat((p) => ({ ...p, icon: e.target.value }))}
                              placeholder="🌐"
                              className="w-12 text-sm border border-gray-300 rounded px-1.5 py-1 text-center"
                            />
                            <input
                              value={editCat.name}
                              onChange={(e) => setEditCat((p) => ({ ...p, name: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && saveEditCat()}
                              className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
                            />
                            <button onClick={saveEditCat}
                              className="px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700">
                              Kaydet
                            </button>
                            <button onClick={() => setEditCat(null)}
                              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700">İptal</button>
                          </>
                        ) : (
                          <>
                            <span className="text-base w-6 text-center select-none">{cat.icon}</span>
                            <span className="flex-1 text-sm font-medium text-gray-700">{cat.name}</span>
                            <span className="text-xs text-gray-400">{catSubs.length} konu</span>
                            <div className="hidden group-hover:flex items-center gap-1 ml-2">
                              <button
                                onClick={() => setEditCat({ id: cat.id, name: cat.name, icon: cat.icon || '' })}
                                className="text-xs text-indigo-600 hover:text-indigo-800 px-2 py-0.5 rounded hover:bg-indigo-50"
                              >Düzenle</button>
                              <button
                                onClick={() => deleteCat(cat)}
                                className="text-xs text-red-500 hover:text-red-700 px-2 py-0.5 rounded hover:bg-red-50"
                              >Sil</button>
                            </div>
                          </>
                        )}
                      </div>

                      {/* ── Subjects ── */}
                      <div className="pl-12 pr-4 pb-2 space-y-1">
                        {catSubs.map((sub) => (
                          <div key={sub.id}
                            className="flex items-center gap-2 group bg-white rounded-lg px-3 py-1.5 border border-gray-100"
                          >
                            {editSub?.id === sub.id ? (
                              <>
                                <input
                                  autoFocus
                                  value={editSub.name}
                                  onChange={(e) => setEditSub((p) => ({ ...p, name: e.target.value }))}
                                  onKeyDown={(e) => e.key === 'Enter' && saveEditSub()}
                                  className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
                                />
                                <select
                                  value={editSub.defaultGroupId || ''}
                                  onChange={(e) => setEditSub((p) => ({ ...p, defaultGroupId: e.target.value }))}
                                  className="text-sm border border-gray-300 rounded px-2 py-1"
                                >
                                  <option value="">— Grup —</option>
                                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                                <button onClick={saveEditSub}
                                  className="px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700">
                                  Kaydet
                                </button>
                                <button onClick={() => setEditSub(null)}
                                  className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700">İptal</button>
                              </>
                            ) : (
                              <>
                                <span className="text-gray-300 text-xs select-none">└</span>
                                <span className="flex-1 text-sm text-gray-700">{sub.name}</span>
                                {sub.defaultGroup && (
                                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded whitespace-nowrap">
                                    {sub.defaultGroup.name}
                                  </span>
                                )}
                                <div className="hidden group-hover:flex items-center gap-1">
                                  <button
                                    onClick={() => setEditSub({ id: sub.id, name: sub.name, defaultGroupId: sub.defaultGroupId || '' })}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 px-2 py-0.5 rounded hover:bg-indigo-50"
                                  >Düzenle</button>
                                  <button
                                    onClick={() => deleteSub(sub)}
                                    className="text-xs text-red-500 hover:text-red-700 px-2 py-0.5 rounded hover:bg-red-50"
                                  >Sil</button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}

                        {/* Add subject */}
                        {addSubCatId === cat.id ? (
                          <div className="flex items-center gap-2 bg-indigo-50 rounded-lg px-3 py-2 border border-indigo-200 mt-1">
                            <input
                              autoFocus
                              value={addSubForm.name}
                              onChange={(e) => setAddSubForm((p) => ({ ...p, name: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && addSubject(cat.id)}
                              placeholder="Başvuru konusu adı"
                              className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
                            />
                            <select
                              value={addSubForm.defaultGroupId}
                              onChange={(e) => setAddSubForm((p) => ({ ...p, defaultGroupId: e.target.value }))}
                              className="text-sm border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="">— Grup —</option>
                              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                            <button onClick={() => addSubject(cat.id)}
                              className="px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700">Ekle</button>
                            <button onClick={() => setAddSubCatId(null)}
                              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700">İptal</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setAddSubCatId(cat.id); setAddSubForm({ name: '', defaultGroupId: '' }); }}
                            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-indigo-50 mt-0.5"
                          >
                            <span>+</span> Başvuru Konusu Ekle
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Add category */}
                {addCatTypeId === st.id ? (
                  <div className="flex items-center gap-2 px-4 py-3 bg-indigo-50 border-t border-indigo-100">
                    <input
                      value={addCatForm.icon}
                      onChange={(e) => setAddCatForm((p) => ({ ...p, icon: e.target.value }))}
                      placeholder="🌐"
                      className="w-12 text-sm border border-gray-300 rounded px-2 py-1.5 text-center"
                    />
                    <input
                      autoFocus
                      value={addCatForm.name}
                      onChange={(e) => setAddCatForm((p) => ({ ...p, name: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && addCategory(st.id)}
                      placeholder="Kategori adı"
                      className="flex-1 text-sm border border-gray-300 rounded px-3 py-1.5"
                    />
                    <button onClick={() => addCategory(st.id)}
                      className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">Ekle</button>
                    <button onClick={() => setAddCatTypeId(null)}
                      className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">İptal</button>
                  </div>
                ) : (
                  <div className="px-4 py-2 border-t border-gray-100 bg-white">
                    <button
                      onClick={() => { setAddCatTypeId(st.id); setAddCatForm({ name: '', icon: '' }); }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-indigo-50"
                    >
                      <span>+</span> Kategori Ekle
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Gruplar Tab ──────────────────────────────────────────────────────────────
function GroupsTab({ toast }) {
  const [groups, setGroups]     = useState([]);
  const [editId, setEditId]     = useState(null);
  const [editForm, setEditForm] = useState({});
  const [leaders, setLeaders]   = useState({});   // groupId → { members, selected }
  const [loading, setLoading]   = useState(true);
  const [openDepts, setOpenDepts] = useState({});  // dept label → boolean

  useEffect(() => {
    getGroups().then((gs) => {
      setGroups(gs);
      // default all open
      const depts = [...new Set(gs.map((g) => g.department || '—'))];
      const opens = {};
      depts.forEach((d) => { opens[d] = true; });
      setOpenDepts(opens);
    }).finally(() => setLoading(false));
  }, []);

  function startEdit(g) {
    setEditId(g.id);
    setEditForm({ name: g.name, description: g.description || '', email: g.email || '', department: g.department || '' });
  }

  async function saveGroup() {
    try {
      const updated = await apiPatch(`/api/groups/${editId}`, editForm);
      setGroups((prev) => prev.map((g) => (g.id === editId ? { ...g, ...updated } : g)));
      setEditId(null);
      toast.success('Grup güncellendi');
    } catch (e) { toast.error(e.message); }
  }

  async function loadLeaderPanel(g) {
    if (leaders[g.id]) {
      setLeaders((prev) => { const n = { ...prev }; delete n[g.id]; return n; });
      return;
    }
    try {
      const members = await getGroupMembers(g.id);
      const currentLeader = g.members?.[0]?.user?.id || null;
      setLeaders((prev) => ({ ...prev, [g.id]: { members, selected: currentLeader } }));
    } catch (e) { toast.error(e.message); }
  }

  async function assignLeader(groupId) {
    const panel = leaders[groupId];
    if (!panel?.selected) return toast.error('Lider seçin');
    try {
      const res = await fetch(`${API_URL}/api/groups/${groupId}/leader`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ leaderId: panel.selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGroups((prev) => prev.map((g) => {
        if (g.id !== groupId) return g;
        return { ...g, members: [{ user: data.leader }] };
      }));
      setLeaders((prev) => { const n = { ...prev }; delete n[groupId]; return n; });
      toast.success(`Lider atandı: ${data.leader?.displayName}`);
    } catch (e) { toast.error(e.message); }
  }

  if (loading) return <div className="text-sm text-gray-500 py-8 text-center">Yükleniyor…</div>;

  // Group by department
  const deptOrder = [...new Set(groups.map((g) => g.department || '—'))].sort((a, b) => {
    if (a === '—') return 1;
    if (b === '—') return -1;
    return a.localeCompare(b, 'tr');
  });

  function GroupCard({ g }) {
    const leader      = g.members?.[0]?.user;
    const leaderPanel = leaders[g.id];
    const isEditing   = editId === g.id;

    return (
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        {isEditing ? (
          <div className="p-4 bg-indigo-50 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Grup Adı</label>
                <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">E-posta</label>
                <input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  type="email" placeholder="grup@mugla.bel.tr"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Daire Başkanlığı</label>
              <input value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                placeholder="ör. Bilgi İşlem Dairesi Başkanlığı"
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Açıklama</label>
              <input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5" />
            </div>
            <div className="flex gap-2">
              <button onClick={saveGroup}
                className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">Kaydet</button>
              <button onClick={() => setEditId(null)}
                className="px-4 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200">İptal</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 px-4 py-3 bg-white">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0">
              {g.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 text-sm">{g.name}</span>
                <span className="text-xs text-gray-400">{g._count?.members ?? '?'} üye</span>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                {g.email
                  ? <span className="text-xs text-gray-500">✉ {g.email}</span>
                  : <span className="text-xs text-gray-300 italic">e-posta yok</span>
                }
                {leader && <span className="text-xs text-amber-600">★ {leader.displayName}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => loadLeaderPanel(g)}
                className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded hover:bg-amber-100">
                {leaderPanel ? 'Kapat' : '★ Lider'}
              </button>
              <button onClick={() => startEdit(g)}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">Düzenle</button>
            </div>
          </div>
        )}

        {leaderPanel && (
          <div className="px-4 py-3 bg-amber-50 border-t border-amber-100 flex items-center gap-3">
            <span className="text-xs font-medium text-amber-700">Lider Ata:</span>
            <select value={leaderPanel.selected || ''}
              onChange={(e) => setLeaders((prev) => ({ ...prev, [g.id]: { ...prev[g.id], selected: parseInt(e.target.value) } }))}
              className="text-sm border border-amber-300 rounded px-2 py-1 bg-white">
              <option value="">— Seç —</option>
              {leaderPanel.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName}{m.id === leader?.id ? ' (mevcut lider)' : ''}
                </option>
              ))}
            </select>
            <button onClick={() => assignLeader(g.id)}
              className="px-3 py-1 bg-amber-500 text-white text-xs rounded hover:bg-amber-600">Ata</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {deptOrder.map((dept) => {
        const deptGroups = groups.filter((g) => (g.department || '—') === dept);
        const isOpen     = openDepts[dept] !== false;

        return (
          <div key={dept} className="border border-gray-200 rounded-xl overflow-hidden">
            {/* Department header */}
            <button
              onClick={() => setOpenDepts((prev) => ({ ...prev, [dept]: !prev[dept] }))}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 text-sm flex-shrink-0">
                🏢
              </div>
              <span className="flex-1 font-semibold text-sm text-gray-800">
                {dept === '—' ? 'Daire Başkanlığı Belirsiz' : dept}
              </span>
              <span className="text-xs text-gray-400">{deptGroups.length} grup</span>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {isOpen && (
              <div className="p-3 space-y-2 bg-white">
                {deptGroups.map((g) => <GroupCard key={g.id} g={g} />)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── SLA Tab ──────────────────────────────────────────────────────────────────
function SlaTab({ toast }) {
  const [values, setValues] = useState({ sla_critical: '4', sla_high: '8', sla_medium: '24', sla_low: '72' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    getSettings()
      .then((s) => setValues((v) => ({ ...v, ...s })))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await patchSettings(values);
      toast.success('SLA ayarları kaydedildi');
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  const PRIORITIES = [
    { key: 'sla_critical', label: 'Kritik',  color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200' },
    { key: 'sla_high',     label: 'Yüksek',  color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
    { key: 'sla_medium',   label: 'Orta',    color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200' },
    { key: 'sla_low',      label: 'Düşük',   color: 'text-gray-600',   bg: 'bg-gray-50',   border: 'border-gray-200' },
  ];

  if (loading) return <div className="text-sm text-gray-500 py-8 text-center">Yükleniyor…</div>;

  return (
    <div className="max-w-md">
      <p className="text-sm text-gray-500 mb-6">
        Her öncelik seviyesi için çözüm süresi sınırı (saat). Süresi geçen ticketlar uyarı alır.
      </p>
      <div className="space-y-3">
        {PRIORITIES.map((p) => (
          <div key={p.key} className={`flex items-center gap-4 p-4 rounded-xl border ${p.bg} ${p.border}`}>
            <div className={`w-24 font-semibold text-sm ${p.color}`}>{p.label}</div>
            <div className="flex items-center gap-2">
              <input
                type="number" min="1" max="9999"
                value={values[p.key]}
                onChange={(e) => setValues({ ...values, [p.key]: e.target.value })}
                className="w-20 text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-center font-mono" />
              <span className="text-sm text-gray-500">saat</span>
            </div>
            <div className="text-xs text-gray-400">
              ({Math.floor(parseInt(values[p.key] || 0) / 24) > 0
                ? `${Math.floor(parseInt(values[p.key]) / 24)} gün `
                : ''}{parseInt(values[p.key]) % 24 > 0 ? `${parseInt(values[p.key]) % 24} saat` : ''})
            </div>
          </div>
        ))}
      </div>
      <button onClick={save} disabled={saving}
        className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 text-sm font-medium">
        {saving ? 'Kaydediliyor…' : 'Kaydet'}
      </button>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
const TABS = [
  { key: 'types',      label: 'Başvuru Tipleri', icon: '🏷' },
  { key: 'categories', label: 'Başvuru Konuları',  icon: '📂' },
  { key: 'groups',     label: 'Gruplar',          icon: '👥' },
  { key: 'sla',        label: 'SLA',              icon: '⏱' },
];

export default function AdminSettings() {
  const [tab, setTab] = useState('types');
  const { toasts, success, error } = useToast();
  const toast = { success, error };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Toasts toasts={toasts} />

      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Sistem Ayarları</h1>
        <p className="text-sm text-gray-500 mt-1">Başvuru tipleri, kategori yönlendirme, grup e-postaları ve SLA yapılandırması.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${tab === t.key
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'}`}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {tab === 'types'      && <SubmitTypesTab  toast={toast} />}
        {tab === 'categories' && <CategoriesTab   toast={toast} />}
        {tab === 'groups'     && <GroupsTab       toast={toast} />}
        {tab === 'sla'        && <SlaTab          toast={toast} />}
      </div>
    </div>
  );
}
