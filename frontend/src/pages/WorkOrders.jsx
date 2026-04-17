import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import LoadingState from '../components/ui/LoadingState';
import PageHeader from '../components/ui/PageHeader';
import Surface from '../components/ui/Surface';

const API = import.meta.env.VITE_API_URL || '';
function authFetch(url, opts = {}) {
  const token = localStorage.getItem('token');
  return fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts.headers },
  });
}

// ─── Sabitler ─────────────────────────────────────────────────────────────────
const COLUMNS = [
  { key: 'TODO',        label: 'Yapılacak',    color: 'bg-gray-100',   dot: 'bg-gray-400'   },
  { key: 'IN_PROGRESS', label: 'Devam Ediyor', color: 'bg-blue-50',    dot: 'bg-blue-500'   },
  { key: 'REVIEW',      label: 'İncelemede',   color: 'bg-amber-50',   dot: 'bg-amber-500'  },
  { key: 'DONE',        label: 'Tamamlandı',   color: 'bg-green-50',   dot: 'bg-green-500'  },
  { key: 'CANCELLED',   label: 'İptal',        color: 'bg-red-50',     dot: 'bg-red-400'    },
];

const PRIORITY_BADGE = {
  LOW:      'bg-gray-100 text-gray-500',
  MEDIUM:   'bg-blue-100 text-blue-700',
  HIGH:     'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};
const PRIORITY_LABEL = { LOW: 'Düşük', MEDIUM: 'Orta', HIGH: 'Yüksek', CRITICAL: 'Kritik' };
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const EMPTY_FORM = {
  title: '', description: '', priority: 'MEDIUM', status: 'TODO',
  estimatedHours: '', dueDate: '', assignedToId: '', groupId: '', departmentId: '', ticketId: '',
};

function formatDate(str) {
  if (!str) return null;
  return new Date(str).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function isOverdue(dueDate, status) {
  if (!dueDate || status === 'DONE' || status === 'CANCELLED') return false;
  return new Date(dueDate) < new Date();
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 'sm' }) {
  const initial = (name || '?')[0].toUpperCase();
  const sz = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs';
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0`}>
      {initial}
    </div>
  );
}

// ─── Kanban Kartı ──────────────────────────────────────────────────────────────
function WOCard({ order, onEdit, onDelete, onDragStart }) {
  const overdue = isOverdue(order.dueDate, order.status);

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, order.id)}
      onClick={() => onEdit(order)}
      className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:shadow-md cursor-pointer transition group select-none"
    >
      {/* Başlık + silme */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-gray-800 leading-snug flex-1">{order.title}</p>
        <button
          onClick={e => { e.stopPropagation(); onDelete(order); }}
          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 text-lg leading-none transition shrink-0 -mt-0.5"
        >
          ×
        </button>
      </div>

      {/* Öncelik */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_BADGE[order.priority]}`}>
          {PRIORITY_LABEL[order.priority]}
        </span>
        {order.ticket && (
          <span className="text-[10px] text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded font-medium">
            #{order.ticket.id}
          </span>
        )}
        {order.department && (
          <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
            {order.department.shortCode}
          </span>
        )}
      </div>

      {/* Açıklama */}
      {order.description && (
        <p className="text-xs text-gray-400 line-clamp-2 mb-2">{order.description}</p>
      )}

      {/* Alt satır: atanan + son tarih */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-1.5">
          {order.assignedTo ? (
            <Avatar name={order.assignedTo.displayName} />
          ) : (
            <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-xs">?</div>
          )}
          {order.group && (
            <span className="text-[10px] text-gray-400">{order.group.name.split(' ')[0]}</span>
          )}
        </div>
        {order.dueDate && (
          <span className={`text-[10px] font-medium ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
            {overdue && '⚠ '}{formatDate(order.dueDate)}
          </span>
        )}
      </div>

      {order.estimatedHours && (
        <div className="mt-1.5 text-[10px] text-gray-300">⏱ {order.estimatedHours} sa</div>
      )}
    </div>
  );
}

// ─── Kanban Kolonu ─────────────────────────────────────────────────────────────
function KanbanColumn({ col, orders, onEdit, onDelete, onDragStart, onDrop, onDragOver, onAddNew }) {
  const count = orders.length;

  return (
    <div
      className={`flex flex-col rounded-2xl ${col.color} min-w-[220px] w-full`}
      onDragOver={onDragOver}
      onDrop={e => onDrop(e, col.key)}
    >
      {/* Kolon başlığı */}
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
          <span className="text-sm font-semibold text-gray-700">{col.label}</span>
          <span className="text-xs text-gray-400 bg-white/60 px-1.5 py-0.5 rounded-full">{count}</span>
        </div>
        {col.key !== 'CANCELLED' && (
          <button
            onClick={() => onAddNew(col.key)}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-white transition text-lg leading-none"
            title="Yeni ekle"
          >
            +
          </button>
        )}
      </div>

      {/* Kartlar */}
      <div className="flex-1 px-2 pb-3 space-y-2 min-h-[80px]">
        {orders.map(o => (
          <WOCard
            key={o.id}
            order={o}
            onEdit={onEdit}
            onDelete={onDelete}
            onDragStart={onDragStart}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Modal Form ────────────────────────────────────────────────────────────────
function WOModal({ initial, onSave, onClose, groups, departments }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const isEdit = !!initial?.id;

  function setF(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSave() {
    if (!form.title.trim()) { setError('Başlık zorunludur'); return; }
    setSaving(true); setError('');
    try {
      const body = {
        title:          form.title.trim(),
        description:    form.description?.trim() || undefined,
        priority:       form.priority,
        status:         form.status,
        estimatedHours: form.estimatedHours || undefined,
        dueDate:        form.dueDate        || undefined,
        assignedToId:   form.assignedToId   || undefined,
        groupId:        form.groupId        || undefined,
        departmentId:   form.departmentId   || undefined,
        ticketId:       form.ticketId       || undefined,
      };
      const url    = isEdit ? `${API}/api/work-orders/${initial.id}` : `${API}/api/work-orders`;
      const method = isEdit ? 'PATCH' : 'POST';
      const r = await authFetch(url, { method, body: JSON.stringify(body) });
      const data = await r.json();
      if (!r.ok) { setError(data.error || 'Hata'); return; }
      onSave(data);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 my-4">
        <h3 className="text-base font-bold text-gray-900">
          {isEdit ? 'İş Emri Düzenle' : 'Yeni İş Emri'}
        </h3>

        <div className="space-y-3">
          {/* Başlık */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Başlık <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={e => setF('title', e.target.value)}
              placeholder="İş emri başlığı"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          {/* Açıklama */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Açıklama</label>
            <textarea rows={3} value={form.description || ''} onChange={e => setF('description', e.target.value)}
              placeholder="Detaylı açıklama..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Öncelik */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Öncelik</label>
              <select value={form.priority} onChange={e => setF('priority', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
              </select>
            </div>

            {/* Durum */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Durum</label>
              <select value={form.status} onChange={e => setF('status', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Son Tarih */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Son Tarih</label>
              <input type="date" value={form.dueDate ? form.dueDate.slice(0, 10) : ''}
                onChange={e => setF('dueDate', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            {/* Tahmini Süre */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tahmini Süre (sa)</label>
              <input type="number" min="0" step="0.5" value={form.estimatedHours || ''}
                onChange={e => setF('estimatedHours', e.target.value)}
                placeholder="8"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Grup */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Grup</label>
              <select value={form.groupId || ''} onChange={e => setF('groupId', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Seçin (opsiyonel)</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>

            {/* Daire */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Daire</label>
              <select value={form.departmentId || ''} onChange={e => setF('departmentId', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Seçin (opsiyonel)</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>

          {/* İlgili Talep ID */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">İlgili Talep ID (opsiyonel)</label>
            <input type="number" value={form.ticketId || ''} onChange={e => setF('ticketId', e.target.value)}
              placeholder="Talep #ID"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div className="flex gap-2 justify-end pt-1">
          <button onClick={onClose}
            className="portal-soft-btn">
            İptal
          </button>
          <button onClick={handleSave} disabled={saving}
            className="portal-cta-btn portal-cta-btn--violet">
            {saving ? 'Kaydediliyor…' : isEdit ? 'Güncelle' : 'Oluştur'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────
export default function WorkOrders() {
  const { user }                      = useAuth();
  const [orders, setOrders]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [groups, setGroups]           = useState([]);
  const [departments, setDepartments] = useState([]);
  const [modal, setModal]             = useState(null); // null | EMPTY_FORM (add) | order (edit)
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMine, setFilterMine]   = useState(false);
  const dragId = useRef(null);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterMine)   params.set('myOrders', 'true');
      const r = await authFetch(`${API}/api/work-orders?${params}`);
      if (r.ok) setOrders(await r.json());
    } finally { setLoading(false); }
  }

  useEffect(() => {
    load();
  }, [filterStatus, filterMine]);

  useEffect(() => {
    authFetch(`${API}/api/groups`)
      .then(r => r.ok ? r.json() : []).then(setGroups).catch(() => {});
    authFetch(`${API}/api/departments`)
      .then(r => r.ok ? r.json() : []).then(setDepartments).catch(() => {});
  }, []);

  // ─── Drag & Drop ──────────────────────────────────────────────────────────
  function handleDragStart(e, id) {
    dragId.current = id;
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  async function handleDrop(e, newStatus) {
    e.preventDefault();
    const id = dragId.current;
    if (!id) return;
    const order = orders.find(o => o.id === id);
    if (!order || order.status === newStatus) return;

    // Optimistik güncelleme
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));

    try {
      const r = await authFetch(`${API}/api/work-orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (r.ok) {
        const updated = await r.json();
        setOrders(prev => prev.map(o => o.id === id ? updated : o));
      } else {
        // Geri al
        setOrders(prev => prev.map(o => o.id === id ? order : o));
      }
    } catch {
      setOrders(prev => prev.map(o => o.id === id ? order : o));
    }
    dragId.current = null;
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────
  function handleSave(saved) {
    setOrders(prev => {
      const exists = prev.find(o => o.id === saved.id);
      return exists ? prev.map(o => o.id === saved.id ? saved : o) : [saved, ...prev];
    });
    setModal(null);
  }

  async function handleDelete(order) {
    if (!confirm(`"${order.title}" iş emrini silmek istediğinize emin misiniz?`)) return;
    const r = await authFetch(`${API}/api/work-orders/${order.id}`, { method: 'DELETE' });
    if (r.ok) setOrders(prev => prev.filter(o => o.id !== order.id));
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  const colMap = {};
  COLUMNS.forEach(c => { colMap[c.key] = orders.filter(o => o.status === c.key); });

  const visibleColumns = filterStatus
    ? COLUMNS.filter(c => c.key === filterStatus)
    : COLUMNS;

  const openOrders = orders.filter((order) => !['DONE', 'CANCELLED'].includes(order.status)).length;
  const overdueOrders = orders.filter((order) => isOverdue(order.dueDate, order.status)).length;
  const mineCount = orders.filter((order) => order.assignedTo?.username === user?.username).length;

  return (
    <div className="portal-page portal-page--wide h-full">
      <div className="flex h-full flex-col gap-6">
        <PageHeader
          icon={<i className="bi bi-kanban text-xl" />}
          title="İş Emirleri"
          description="Görevleri kanban görünümünde izleyin, duruma göre sürükleyip bırakın ve ekip akışını tek ekranda yönetin."
          meta={`${orders.length} iş emri • ${openOrders} açık iş • ${overdueOrders} geciken iş`}
          actions={(
            <>
              <Button variant="soft" onClick={() => load()}>
                <i className="bi bi-arrow-clockwise mr-2" />
                Yenile
              </Button>
              <Button color="violet" onClick={() => setModal({ ...EMPTY_FORM })}>
                <i className="bi bi-plus-lg mr-2" />
                Yeni İş Emri
              </Button>
            </>
          )}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <Surface className="p-5">
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Toplam</p>
            <p className="mt-3 mb-0 text-3xl font-bold text-slate-800">{orders.length}</p>
            <p className="mt-2 mb-0 text-sm text-slate-500">Tüm iş emri hacmi</p>
          </Surface>
          <Surface className="p-5">
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Bana Atananlar</p>
            <p className="mt-3 mb-0 text-3xl font-bold text-slate-800">{mineCount}</p>
            <p className="mt-2 mb-0 text-sm text-slate-500">Aktif kullanıcı odağı</p>
          </Surface>
          <Surface className="p-5">
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Gecikenler</p>
            <p className="mt-3 mb-0 text-3xl font-bold text-rose-600">{overdueOrders}</p>
            <p className="mt-2 mb-0 text-sm text-slate-500">Termin tarihi geçen kayıt</p>
          </Surface>
        </div>

        <Surface className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterMine}
                  onChange={(e) => setFilterMine(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                Bana atananlar
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Tüm durumlar</option>
                {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <p className="m-0 text-sm text-slate-500">Kartları sürükleyerek durum güncelleyebilirsiniz.</p>
          </div>
        </Surface>

        {loading ? (
          <LoadingState
            title="İş emirleri hazırlanıyor"
            description="Kanban görünümü ve görev dağılımları yükleniyor."
          />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<i className="bi bi-kanban" />}
            title="Henüz iş emri bulunmuyor"
            description="İlk iş emrini oluşturup ekibin iş akışını bu ekrandan yönetebilirsiniz."
            action={(
              <Button color="violet" onClick={() => setModal({ ...EMPTY_FORM })}>
                <i className="bi bi-plus-lg mr-2" />
                İş Emri Oluştur
              </Button>
            )}
          />
        ) : (
          <Surface className="flex-1 overflow-hidden p-4">
            <div className="h-full overflow-x-auto">
              <div className="flex min-w-max gap-4 h-full pb-2">
                {visibleColumns.map(col => (
                  <div key={col.key} className="w-72 flex flex-col">
                    <KanbanColumn
                      col={col}
                      orders={colMap[col.key] || []}
                      onEdit={setModal}
                      onDelete={handleDelete}
                      onDragStart={handleDragStart}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onAddNew={status => setModal({ ...EMPTY_FORM, status })}
                    />
                  </div>
                ))}
              </div>
            </div>
          </Surface>
        )}

        {modal !== null && (
          <WOModal
            initial={modal?.id ? modal : { ...EMPTY_FORM, status: modal?.status || 'TODO' }}
            onSave={handleSave}
            onClose={() => setModal(null)}
            groups={groups}
            departments={departments}
          />
        )}
      </div>
    </div>
  );
}
