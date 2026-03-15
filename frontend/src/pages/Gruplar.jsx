import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getGroups, getGroupMembers, createGroup, updateGroup,
  deleteGroup, addGroupMembers, removeGroupMember, setGroupLeader,
} from '../api/groups';

// ─── Basit Toast ──────────────────────────────────────────────────────────────
function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-sm font-medium
      ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
      <span>{type === 'success' ? '✅' : '❌'}</span>
      {message}
    </div>
  );
}

const API = import.meta.env.VITE_API_URL || '';

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` };
}

// ─── Daire bazlı kullanıcı yükleme ───────────────────────────────────────────
async function fetchDirectorates() {
  const res = await fetch(`${API}/api/users/directorates`, { headers: authHeaders() });
  return res.ok ? res.json() : [];
}

async function fetchUsersByDir(directorate) {
  const params = new URLSearchParams({ directorate, limit: '500' });
  const res = await fetch(`${API}/api/users?${params}`, { headers: authHeaders() });
  const data = await res.json();
  return data.users || [];
}

// Non-admin: backend zaten filtreliyor, direkt çek
async function fetchVisibleUsers() {
  const params = new URLSearchParams({ limit: '500' });
  const res = await fetch(`${API}/api/users?${params}`, { headers: authHeaders() });
  const data = await res.json();
  return data.users || [];
}

// ─── Kullanıcı satırı (paylaşımlı) ───────────────────────────────────────────
function UserRow({ u, selected, onToggle }) {
  return (
    <label className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer border-t border-gray-50">
      {selected !== undefined ? (
        <input
          type="checkbox"
          checked={selected.has(u.id)}
          onChange={() => onToggle(u.id)}
          className="rounded border-gray-300 text-blue-600"
        />
      ) : null}
      <span className="flex-1 text-sm text-gray-800">{u.displayName}</span>
      {u.title && <span className="text-xs text-gray-400 truncate max-w-[120px]">{u.title}</span>}
      {selected === undefined && (
        <button
          type="button"
          onClick={() => onToggle(u.id)}
          className="text-xs text-blue-600 hover:text-blue-800 px-2 py-0.5 rounded hover:bg-blue-50 shrink-0"
        >+ Ekle</button>
      )}
    </label>
  );
}

// ─── Daire bazlı kullanıcı seçici (GroupForm + GroupDetail paylaşımlı) ───────
// isAdmin=true  → accordion (daire başlıkları + lazy-load)
// isAdmin=false → düz liste (backend zaten sadece kendi dairesini döndürür)
function DirUserPicker({ selected, onToggle, memberIds = new Set(), isAdmin = true }) {
  const [directorates, setDirectorates] = useState([]);
  const [openDir, setOpenDir]           = useState(null);
  const [dirUsers, setDirUsers]         = useState({});
  const [loadingDir, setLoadingDir]     = useState(null);
  const [flatUsers, setFlatUsers]       = useState([]);   // non-admin modu
  const [loadingFlat, setLoadingFlat]   = useState(false);
  const [search, setSearch]             = useState('');

  useEffect(() => {
    if (isAdmin) {
      fetchDirectorates().then(setDirectorates);
    } else {
      setLoadingFlat(true);
      fetchVisibleUsers()
        .then(setFlatUsers)
        .finally(() => setLoadingFlat(false));
    }
  }, [isAdmin]);

  async function toggleDir(name) {
    if (openDir === name) { setOpenDir(null); return; }
    setOpenDir(name);
    if (dirUsers[name]) return;
    setLoadingDir(name);
    try {
      const users = await fetchUsersByDir(name);
      setDirUsers((prev) => ({ ...prev, [name]: users }));
    } finally { setLoadingDir(null); }
  }

  const searchLower = search.toLowerCase();

  // ── Non-admin: düz liste ──────────────────────────────────────────────────
  if (!isAdmin) {
    const visible = flatUsers.filter(
      (u) => !memberIds.has(u.id) &&
        (!search || u.displayName.toLowerCase().includes(searchLower))
    );
    return (
      <div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="İsim ara..."
          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
        />
        <div className="border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
          {loadingFlat ? (
            <div className="px-3 py-4 text-xs text-gray-400 text-center">Yükleniyor...</div>
          ) : visible.length === 0 ? (
            <div className="px-3 py-4 text-xs text-gray-400 text-center">Eklenecek personel bulunamadı.</div>
          ) : (
            visible.map((u) => (
              <UserRow key={u.id} u={u} selected={selected} onToggle={onToggle} />
            ))
          )}
        </div>
        {selected !== undefined && selected.size > 0 && (
          <p className="text-xs text-gray-400 mt-1">{selected.size} kişi seçili</p>
        )}
      </div>
    );
  }

  // ── Admin: daire accordion ────────────────────────────────────────────────
  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="İsim ara..."
        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
      />
      <div className="border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
        {directorates.map((dir) => {
          const isOpen   = openDir === dir.name;
          const allUsers = dirUsers[dir.name] || [];
          const visible  = allUsers.filter(
            (u) => !memberIds.has(u.id) &&
              (!search || u.displayName.toLowerCase().includes(searchLower))
          );
          const shouldShow = isOpen || (search && visible.length > 0);

          return (
            <div key={dir.name} className="border-b border-gray-100 last:border-0">
              <button
                type="button"
                onClick={() => toggleDir(dir.name)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide transition
                  ${isOpen ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
              >
                <span className="flex-1">── {dir.name} ──</span>
                <span className="font-normal normal-case text-[11px] opacity-70">{dir.count}</span>
                <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                  fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {shouldShow && (
                loadingDir === dir.name ? (
                  <div className="px-3 py-2 text-xs text-gray-400">Yükleniyor...</div>
                ) : visible.length === 0 ? (
                  search ? null : <div className="px-3 py-2 text-xs text-gray-400">Bu daireden eklenecek kişi yok.</div>
                ) : (
                  visible.map((u) => (
                    <UserRow key={u.id} u={u} selected={selected} onToggle={onToggle} />
                  ))
                )
              )}
            </div>
          );
        })}
      </div>
      {selected !== undefined && selected.size > 0 && (
        <p className="text-xs text-gray-400 mt-1">{selected.size} kişi seçili</p>
      )}
    </div>
  );
}

// ─── Grup Formu (oluştur / düzenle) ──────────────────────────────────────────
function GroupForm({ initial, onSave, onCancel, isAdmin = true }) {
  const [name, setName]         = useState(initial?.name || '');
  const [desc, setDesc]         = useState(initial?.description || '');
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const isEdit = !!initial;

  function toggleUser(id) {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Grup adı zorunlu'); return; }
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await onSave({ name, description: desc });
      } else {
        await onSave({ name, description: desc, memberIds: [...selected] });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Başlık */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800">
            {isEdit ? 'Grubu Düzenle' : 'Yeni Grup Oluştur'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Grup Adı *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="örn. Bilgi İşlem – Yazılım Ekibi"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Açıklama</label>
              <input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="İsteğe bağlı"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {!isEdit && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  {isAdmin ? 'Üye Ekle — Daire Başkanlığına Göre' : 'Üye Ekle'}
                </label>
                <DirUserPicker selected={selected} onToggle={toggleUser} isAdmin={isAdmin} />
              </div>
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
            <button type="button" onClick={onCancel}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
              İptal
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:bg-blue-300 font-semibold">
              {saving ? 'Kaydediliyor...' : isEdit ? 'Kaydet' : 'Grubu Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Lider Atama Modalı ───────────────────────────────────────────────────────
function LeaderModal({ group, members, onClose, onSuccess }) {
  const currentLeader = members.find(m => m.groupRole === 'leader');
  const [selectedId, setSelectedId] = useState(currentLeader?.id || '');
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  async function handleSave() {
    if (!selectedId) { setError('Lütfen bir üye seçin'); return; }
    setSaving(true);
    setError('');
    try {
      await setGroupLeader(group.id, parseInt(selectedId));
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800">Lider Ata — {group.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Grup Lideri</label>
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">— Üye seçin —</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.displayName}{m.groupRole === 'leader' ? ' (mevcut lider)' : ''}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          {currentLeader && (
            <p className="text-xs text-gray-400">
              Mevcut lider: <strong className="text-gray-600">{currentLeader.displayName}</strong>
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">
            İptal
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedId}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold rounded-xl transition"
          >
            {saving ? 'Kaydediliyor...' : 'Lideri Ata'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Grup Detay / Üye Yönetimi ────────────────────────────────────────────────
function GroupDetail({ group, onClose, onUpdated, canManage, onToast, isAdmin = true }) {
  const [members, setMembers]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [removing, setRemoving]     = useState(null);
  const [showLeader, setShowLeader] = useState(false);

  const loadMembers = useCallback(() => {
    setLoading(true);
    getGroupMembers(group.id).then((m) => { setMembers(m); setLoading(false); });
  }, [group.id]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const memberIds = new Set(members.map((m) => m.id));

  async function handleAddOne(userId) {
    try {
      await addGroupMembers(group.id, [userId]);
      loadMembers();
      onUpdated();
    } catch (err) { alert(err.message); }
  }

  async function handleRemove(userId) {
    setRemoving(userId);
    try {
      await removeGroupMember(group.id, userId);
      loadMembers();
      onUpdated();
    } catch (err) { alert(err.message); }
    finally { setRemoving(null); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-800">{group.name}</h2>
            {group.description && <p className="text-xs text-gray-400">{group.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            {canManage && members.length > 0 && (
              <button
                onClick={() => setShowLeader(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition"
              >
                ★ Lider Ata
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          </div>
        </div>

        {showLeader && (
          <LeaderModal
            group={group}
            members={members}
            onClose={() => setShowLeader(false)}
            onSuccess={() => {
              setShowLeader(false);
              loadMembers();
              onUpdated();
              onToast('Lider atandı ✅');
            }}
          />
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Mevcut Üyeler */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Mevcut Üyeler ({members.length})
            </h3>
            {loading ? (
              <p className="text-sm text-gray-400">Yükleniyor...</p>
            ) : members.length === 0 ? (
              <p className="text-sm text-gray-400">Henüz üye yok.</p>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-3 py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {m.displayName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{m.displayName}</p>
                      {m.department && <p className="text-xs text-gray-400 truncate">{m.department}</p>}
                    </div>
                    {m.groupRole === 'leader' && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">Lider</span>
                    )}
                    {canManage && (
                      <button
                        onClick={() => handleRemove(m.id)}
                        disabled={removing === m.id}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition"
                      >
                        Çıkar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Üye Ekle */}
          {canManage && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {isAdmin ? 'Daire Başkanlığından Üye Ekle' : 'Üye Ekle'}
              </h3>
              <DirUserPicker
                selected={undefined}
                onToggle={handleAddOne}
                memberIds={memberIds}
                isAdmin={isAdmin}
              />
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────
export default function Gruplar() {
  const { user } = useAuth();
  const isAdmin   = user?.role === 'admin';
  const canManage = isAdmin || user?.role === 'manager';

  const [groups, setGroups]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [detailGroup, setDetail]  = useState(null);
  const [deleting, setDeleting]   = useState(null);
  const [toast, setToast]         = useState(null); // { message, type }

  const loadGroups = useCallback(() => {
    setLoading(true);
    getGroups().then((g) => { setGroups(g); setLoading(false); });
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const filtered = groups.filter((g) =>
    !search || g.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate(data) {
    await createGroup(data);
    setShowForm(false);
    loadGroups();
  }

  async function handleEdit(data) {
    await updateGroup(editGroup.id, data);
    setEditGroup(null);
    loadGroups();
  }

  async function handleDelete(group) {
    if (!window.confirm(`"${group.name}" grubunu silmek istediğinize emin misiniz?`)) return;
    setDeleting(group.id);
    try {
      await deleteGroup(group.id);
      loadGroups();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="p-8">
      {/* Başlık */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Gruplar</h1>
          <p className="text-sm text-gray-400 mt-1">{groups.length} grup tanımlı</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"
          >
            + Yeni Grup
          </button>
        )}
      </div>

      {/* Arama */}
      <div className="mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Grup adı ara..."
          className="border border-gray-200 rounded-lg px-4 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Grup Listesi */}
      {loading ? (
        <div className="text-center py-20 text-sm text-gray-400">Yükleniyor...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-sm text-gray-400">
          {search ? 'Sonuç bulunamadı' : 'Henüz grup yok'}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Grup Adı</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Açıklama</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Lider</th>
                <th className="text-center px-5 py-3 font-medium text-gray-500">Üye</th>
                <th className="text-center px-5 py-3 font-medium text-gray-500">Açık Talep</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-3">
                    <button
                      onClick={() => setDetail(g)}
                      className="font-semibold text-blue-700 hover:underline text-left"
                    >
                      {g.name}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{g.description || '—'}</td>
                  <td className="px-5 py-3">
                    {g.members?.[0]?.user ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                        ★ {g.members[0].user.displayName}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                      {g._count.members}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                      {g._count.tickets}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {canManage && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditGroup(g)}
                          className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50"
                        >
                          Düzenle
                        </button>
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => handleDelete(g)}
                            disabled={deleting === g.id}
                            className="text-xs text-gray-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 disabled:opacity-40"
                          >
                            Sil
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Yeni Grup Formu */}
      {showForm && (
        <GroupForm
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
          isAdmin={isAdmin}
        />
      )}

      {/* Düzenleme Formu */}
      {editGroup && (
        <GroupForm
          initial={editGroup}
          onSave={handleEdit}
          onCancel={() => setEditGroup(null)}
          isAdmin={isAdmin}
        />
      )}

      {/* Grup Detayı */}
      {detailGroup && (
        <GroupDetail
          group={detailGroup}
          canManage={canManage}
          onClose={() => setDetail(null)}
          onUpdated={loadGroups}
          onToast={(msg) => setToast({ message: msg, type: 'success' })}
          isAdmin={isAdmin}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
