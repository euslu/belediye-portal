import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTicket, updateTicket, addComment, getAttachments, uploadAttachments, getDownloadUrl } from '../../api/tickets';
import { getGroups, getGroupMembers, assignTicket, searchUsers } from '../../api/groups';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge, PriorityBadge, TypeBadge, SourceBadge } from '../../components/badges';

const API = import.meta.env.VITE_API_URL || '';
function authToken() { return localStorage.getItem('token'); }
function authPost(path, body) {
  return fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
    body: JSON.stringify(body),
  }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'İşlem başarısız');
    return data;
  });
}
function authFetch(path) {
  return fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${authToken()}` } }).then(r => r.json());
}
function authGet(path) {
  return fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${authToken()}` } }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Veri alınamadı');
    return data;
  });
}

// ─── ulakBELL Bilgi Kartı ─────────────────────────────────────────────────────
function UlakbellCard({ ticket, isPrivileged, onRefresh }) {
  const [status, setStatus]   = useState(ticket.ulakbellStatus || null);
  const [loading, setLoading] = useState(false);
  const [modal,   setModal]   = useState(false);  // "İlet" modalı
  const [syncing, setSyncing] = useState(false);
  const [syncErr, setSyncErr] = useState('');

  // Adres kaskad state (modal için)
  const [ilceler,    setIlceler]    = useState([]);
  const [mahalleler, setMahalleler] = useState([]);
  const [sokaklar,   setSokaklar]   = useState([]);
  const [binalar,    setBinalar]    = useState([]);
  const [daireler,   setDaireler]   = useState([]);
  const [addr, setAddr_]   = useState({ ilce_id: '', mahalle_id: '', sokak_id: '', bina_no: '', adres_no: '' });
  const [addrLd, setAddrLd] = useState('');
  const [phone, setPhone]   = useState('');
  const [ubType, setUbType] = useState('incident');

  useEffect(() => {
    if (!modal || ilceler.length > 0) return;
    setAddrLd('ilce');
    authFetch('/api/ulakbell/ilceler').then(d => setIlceler(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setAddrLd(''));
  }, [modal, ilceler.length]);

  function setAddr(field, value) {
    setAddr_(p => {
      const n = { ...p, [field]: value };
      if (field === 'ilce_id')    { n.mahalle_id=''; n.sokak_id=''; n.bina_no=''; n.adres_no=''; setMahalleler([]); setSokaklar([]); setBinalar([]); setDaireler([]); }
      if (field === 'mahalle_id') { n.sokak_id=''; n.bina_no=''; n.adres_no=''; setSokaklar([]); setBinalar([]); setDaireler([]); }
      if (field === 'sokak_id')   { n.bina_no=''; n.adres_no=''; setBinalar([]); setDaireler([]); }
      if (field === 'bina_no')    { n.adres_no=''; setDaireler([]); }
      return n;
    });
    if (field==='ilce_id'    && value) { setAddrLd('mahalle'); authFetch(`/api/ulakbell/mahalleler?ilce_id=${value}`).then(d=>setMahalleler(Array.isArray(d)?d:[])).catch(()=>{}).finally(()=>setAddrLd('')); }
    if (field==='mahalle_id' && value) { setAddrLd('sokak');   authFetch(`/api/ulakbell/sokaklar?mahalle_id=${value}`).then(d=>setSokaklar(Array.isArray(d)?d:[])).catch(()=>{}).finally(()=>setAddrLd('')); }
    if (field==='sokak_id'   && value) { setAddrLd('bina');    authFetch(`/api/ulakbell/binalar?sokak_id=${value}`).then(d=>setBinalar(Array.isArray(d)?d:[])).catch(()=>{}).finally(()=>setAddrLd('')); }
    if (field==='bina_no'    && value) { setAddrLd('daire');   authFetch(`/api/ulakbell/daireler?bina_no=${value}`).then(d=>setDaireler(Array.isArray(d)?d:[])).catch(()=>{}).finally(()=>setAddrLd('')); }
  }

  async function refreshStatus() {
    setLoading(true);
    try {
      const d = await authFetch(`/api/ulakbell/incident-status/${ticket.id}`);
      if (d.ok) setStatus(d.ulakbellStatus);
    } catch {}
    setLoading(false);
  }

  async function syncNow() {
    setSyncing(true); setSyncErr('');
    try {
      const res = await fetch(`${API}/api/ulakbell/sync-incident/${ticket.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
        body: JSON.stringify({
          mobile_phone: phone || undefined,
          incident_type: ubType,
          ...(addr.ilce_id    ? { ilce_id:    +addr.ilce_id }    : {}),
          ...(addr.mahalle_id ? { mahalle_id: +addr.mahalle_id } : {}),
          ...(addr.sokak_id   ? { sokak_id:   +addr.sokak_id }   : {}),
          ...(addr.bina_no    ? { bina_no:    +addr.bina_no }    : {}),
          ...(addr.adres_no   ? { adres_no:   +addr.adres_no }   : {}),
        }),
      });
      const d = await res.json();
      if (d.ok) { setModal(false); onRefresh(); }
      else setSyncErr(d.error || 'Gönderilemedi');
    } catch (e) { setSyncErr(e.message); }
    setSyncing(false);
  }

  const fmtDate = (d) => d ? new Date(d).toLocaleString('tr-TR', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';

  // Kart: ulakbell numarası var
  if (ticket.ulakbellNumber || ticket.ulakbellToken) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔗</span>
            <div>
              <p className="text-sm font-semibold text-blue-800">ulakBELL'e İletildi</p>
              {ticket.ulakbellNumber && (
                <p className="text-xs text-blue-600">Başvuru No: <span className="font-bold">#{ticket.ulakbellNumber}</span></p>
              )}
              <p className="text-xs text-blue-500">Gönderildi: {fmtDate(ticket.ulakbellSentAt)}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full
              ${status === 'Gönderildi' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
              {status || 'Beklemede'}
            </span>
            <button onClick={refreshStatus} disabled={loading}
              className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50">
              <span className={loading ? 'animate-spin' : ''}>🔄</span> Durumu Yenile
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Kart: ulakbell numarası yok — admin/manager için "İlet" butonu
  if (!isPrivileged) return null;

  return (<>
    <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-2 text-gray-500">
        <span>🔗</span>
        <span className="text-sm">ulakBELL'e henüz iletilmedi</span>
      </div>
      <button onClick={() => setModal(true)}
        className="portal-cta-btn portal-cta-btn--blue"
        style={{ fontSize: 13, padding: '6px 14px' }}>
        ulakBELL'e İlet
      </button>
    </div>

    {/* Modal */}
    {modal && (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">🔗 ulakBELL'e İlet</h3>
            <p className="text-xs text-gray-500 mt-0.5">Ticket #{ticket.id} — {ticket.title}</p>
          </div>
          <div className="p-5 space-y-4">
            {/* Başvuru Tipi */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Başvuru Tipi</label>
              <div className="flex flex-wrap gap-2">
                {[['incident','🔧 Arıza'],['demand','📋 İstek'],['complaint','😠 Şikayet'],['thanks','🙏 Teşekkür'],['notice','📢 İhbar']].map(([v,l]) => (
                  <button key={v} type="button" onClick={() => setUbType(v)}
                    className={`px-2.5 py-1 rounded-lg text-xs border-2 transition
                      ${ubType===v ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {/* Telefon */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Vatandaş Telefonu <span className="text-gray-400">(opsiyonel)</span></label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="5__ ___ __ __"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            {/* Adres */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-600">📍 Adres <span className="text-gray-400">(opsiyonel)</span></label>
              {[
                { field:'ilce_id',    label:'İlçe',   list:ilceler,    keyF:'ilce_key',        lblF:'ilce_title',         depOn:true,              ldKey:'ilce' },
                { field:'mahalle_id', label:'Mahalle', list:mahalleler, keyF:'mahalle_key',     lblF:'mahalle_title',      depOn:!!addr.ilce_id,    ldKey:'mahalle' },
                { field:'sokak_id',   label:'Sokak',   list:sokaklar,   keyF:'sokak_cadde_id',  lblF:'sokak_cadde_title',  depOn:!!addr.mahalle_id, ldKey:'sokak' },
                { field:'bina_no',    label:'Bina',    list:binalar,    keyF:'id',              lblF:'title',              depOn:!!addr.sokak_id,   ldKey:'bina' },
                { field:'adres_no',   label:'Daire',   list:daireler,   keyF:'id',              lblF:'title',              depOn:!!addr.bina_no,    ldKey:'daire' },
              ].map(({ field, label, list, keyF, lblF, depOn, ldKey }) => (
                <div key={field}>
                  <label className="block text-[11px] text-gray-500 mb-0.5">{label}</label>
                  <select value={addr[field]} onChange={e => setAddr(field, e.target.value)}
                    disabled={!depOn || addrLd === ldKey}
                    className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm disabled:opacity-60 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                    <option value="">{addrLd===ldKey ? '⟳ Yükleniyor…' : depOn ? '— Seçin —' : `Önce ${label.toLowerCase()}`}</option>
                    {list.map(item => <option key={item[keyF]} value={item[keyF]}>{item[lblF]}</option>)}
                  </select>
                </div>
              ))}
            </div>
            {syncErr && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{syncErr}</p>}
          </div>
          <div className="p-5 border-t border-gray-100 flex gap-3">
            <button onClick={syncNow} disabled={syncing}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition disabled:opacity-60">
              {syncing ? '⟳ Gönderiliyor…' : '🔗 Gönder'}
            </button>
            <button onClick={() => { setModal(false); setSyncErr(''); }}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
              İptal
            </button>
          </div>
        </div>
      </div>
    )}
  </>);
}

// ITIL akışına göre izin verilen durum geçişleri (onay akışı ayrıca ele alınıyor)
const NEXT_STATUSES = {
  OPEN:             [{ value: 'IN_PROGRESS', label: 'İşleme Al' }],
  ASSIGNED:         [{ value: 'IN_PROGRESS', label: 'İşleme Al' }, { value: 'OPEN', label: 'Atamayı Kaldır' }],
  IN_PROGRESS:      [{ value: 'RESOLVED', label: 'Çözüldü Olarak İşaretle' }, { value: 'OPEN', label: 'Geri Al' }],
  RESOLVED:         [{ value: 'CLOSED', label: 'Kapat' }, { value: 'IN_PROGRESS', label: 'Yeniden Aç' }],
  CLOSED:           [],
  PENDING_APPROVAL: [], // onay/red, ayrı API ile
  REJECTED:         [],
};

const ACTION_LABELS = {
  CREATED:          'Talep oluşturuldu',
  ASSIGNED:         'Atandı',
  REASSIGNED:       'Yeniden atandı',
  STATUS_CHANGED:   'Durum değişti',
  COMMENTED:        'Yorum ekledi',
  PRIORITY_CHANGED: 'Öncelik değişti',
  GROUP_CHANGED:    'Grup değişti',
  APPROVED:         'Talep onaylandı',
  REJECTED:         'Talep reddedildi',
  RETURN_REQUESTED: 'İade talebi',
  RETURN_APPROVED:  'İade onaylandı',
  RETURN_REJECTED:  'İade reddedildi',
};

// Sol border rengi (renk grubu)
const ACTION_BORDER = {
  CREATED:          'border-l-green-500',
  ASSIGNED:         'border-l-blue-500',
  REASSIGNED:       'border-l-blue-500',
  GROUP_CHANGED:    'border-l-blue-500',
  STATUS_CHANGED:   'border-l-orange-500',
  PRIORITY_CHANGED: 'border-l-orange-500',
  COMMENTED:        'border-l-gray-300',
  APPROVED:         'border-l-green-500',
  REJECTED:         'border-l-red-500',
  RETURN_REQUESTED: 'border-l-amber-500',
  RETURN_APPROVED:  'border-l-green-500',
  RETURN_REJECTED:  'border-l-red-500',
};

// Avatar arka plan rengi
const ACTION_AVATAR = {
  CREATED:          'bg-green-100 text-green-700',
  ASSIGNED:         'bg-blue-100 text-blue-700',
  REASSIGNED:       'bg-blue-100 text-blue-700',
  GROUP_CHANGED:    'bg-teal-100 text-teal-700',
  STATUS_CHANGED:   'bg-orange-100 text-orange-700',
  PRIORITY_CHANGED: 'bg-orange-100 text-orange-700',
  COMMENTED:        'bg-gray-100 text-gray-600',
  APPROVED:         'bg-green-100 text-green-700',
  REJECTED:         'bg-red-100 text-red-700',
  RETURN_REQUESTED: 'bg-amber-100 text-amber-700',
  RETURN_APPROVED:  'bg-green-100 text-green-700',
  RETURN_REJECTED:  'bg-red-100 text-red-700',
};

const WORK_ORDER_STATUS_META = {
  TODO: { label: 'Yapılacak', className: 'bg-slate-100 text-slate-700' },
  IN_PROGRESS: { label: 'İşlemde', className: 'bg-blue-100 text-blue-700' },
  REVIEW: { label: 'Kontrolde', className: 'bg-amber-100 text-amber-700' },
  DONE: { label: 'Tamamlandı', className: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'İptal', className: 'bg-red-100 text-red-700' },
};

function WorkOrdersPanel({ orders, loading, error, canCreate, creating, onCreate, onOpenList }) {
  const activeCount = orders.filter((order) => !['DONE', 'CANCELLED'].includes(order.status)).length;
  const completedCount = orders.filter((order) => order.status === 'DONE').length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">İş Emirleri</h2>
          <p className="text-xs text-gray-400 mt-1">Bu talepten türeyen operasyon iş akışları burada görünür.</p>
          {!loading && !error && orders.length > 0 && (
            <div className="mt-2 flex gap-2 flex-wrap">
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                {activeCount} aktif
              </span>
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                {completedCount} tamamlandı
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={onOpenList}
            className="portal-pill-btn"
            style={{ fontSize: 12, padding: '7px 14px' }}
          >
            Tümünü Aç
          </button>
          {canCreate && (
            <button
              onClick={onCreate}
              disabled={creating}
              className="portal-cta-btn portal-cta-btn--blue"
              style={{ fontSize: 12, padding: '7px 14px', opacity: creating ? 0.6 : 1 }}
            >
              {creating ? 'Oluşturuluyor...' : 'İş Emri Oluştur'}
            </button>
          )}
        </div>
      </div>

      {loading && <div className="text-sm text-gray-400">İş emirleri yükleniyor...</div>}
      {!loading && error && <div className="text-sm text-red-500">{error}</div>}

      {!loading && !error && orders.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 px-4 py-5 text-sm text-gray-500">
          Bu ticket için henüz iş emri oluşturulmamış.
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((order) => {
            const meta = WORK_ORDER_STATUS_META[order.status] || { label: order.status, className: 'bg-gray-100 text-gray-700' };
            return (
              <div key={order.id} className="rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800 truncate">{order.title}</span>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${meta.className}`}>{meta.label}</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
                    <span>#{order.id}</span>
                    <span>Öncelik: {order.priority}</span>
                    {order.assignedTo?.displayName && <span>Atanan: {order.assignedTo.displayName}</span>}
                    {order.group?.name && <span>Grup: {order.group.name}</span>}
                  </div>
                </div>
                <button
                  onClick={onOpenList}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 shrink-0"
                >
                  Gör
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const ACTION_ICONS = {
  CREATED:          '✦',
  ASSIGNED:         '→',
  REASSIGNED:       '⇄',
  STATUS_CHANGED:   '◎',
  COMMENTED:        '💬',
  PRIORITY_CHANGED: '▲',
  GROUP_CHANGED:    '⊞',
  APPROVED:         '✓',
  REJECTED:         '✕',
  RETURN_REQUESTED: '↩',
  RETURN_APPROVED:  '✓',
  RETURN_REJECTED:  '✕',
};

const STATUS_TR = {
  OPEN: 'Açık', PENDING_APPROVAL: 'Onay Bekliyor', ASSIGNED: 'Atandı',
  IN_PROGRESS: 'İşlemde', RESOLVED: 'Çözüldü', CLOSED: 'Kapalı', REJECTED: 'Reddedildi',
};
const PRIORITY_TR = {
  LOW: 'Düşük', MEDIUM: 'Orta', HIGH: 'Yüksek', CRITICAL: 'Kritik',
};

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatValue(action, val) {
  if (!val) return val;
  if (action === 'STATUS_CHANGED')   return STATUS_TR[val]   || val;
  if (action === 'PRIORITY_CHANGED') return PRIORITY_TR[val] || val;
  return val;
}

// ─── Aktivite Zaman Çizelgesi ─────────────────────────────────────────────────
function ActivityTimeline({ activities }) {
  if (!activities || activities.length === 0) {
    return <p className="text-xs text-gray-400">Henüz aktivite yok.</p>;
  }

  return (
    <div className="space-y-2">
      {activities.map((act) => {
        const avatarCls = ACTION_AVATAR[act.action]  || 'bg-gray-100 text-gray-600';
        const borderCls = ACTION_BORDER[act.action]  || 'border-l-gray-200';
        const icon      = ACTION_ICONS[act.action]   || '•';
        const actor     = act.user?.displayName      || 'Sistem';
        const isInternal = act.action === 'COMMENTED' && act.comment === '[İç Not]';

        return (
          <div
            key={act.id}
            className={`flex gap-3 items-start border-l-4 ${borderCls} pl-3 py-2 rounded-r-lg bg-white`}
          >
            {/* Avatar */}
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarCls}`}>
              {icon}
            </div>

            {/* İçerik */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                {/* Kişi adı */}
                <span className="text-sm font-semibold text-gray-800">{actor}</span>
                <span className="text-gray-300">·</span>
                {/* Açıklama (description varsa onu kullan, yoksa ACTION_LABELS) */}
                <span className="text-sm text-gray-600">
                  {act.description
                    ? act.description.replace(/^Ticket #\d+ → [^ ]+ tarafından /, '').replace(/^Ticket #\d+ → /, '')
                    : ACTION_LABELS[act.action] || act.action}
                </span>
                {isInternal && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">İç Not</span>
                )}
                <span className="text-gray-300">·</span>
                <span className="text-xs text-gray-400">{formatDate(act.createdAt)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Kullanıcı Arama Bileşeni ─────────────────────────────────────────────────
function UserSearch({ value, onChange }) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [open, setOpen]         = useState(false);
  const [selected, setSelected] = useState(value || null); // { id, displayName, department }
  const timerRef = useRef(null);
  const wrapRef  = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function handleInput(e) {
    const q = e.target.value;
    setQuery(q);
    setOpen(true);
    clearTimeout(timerRef.current);
    if (!q.trim()) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      try { setResults(await searchUsers(q)); } catch { setResults([]); }
    }, 300);
  }

  function handleSelect(u) {
    setSelected(u);
    setQuery(u.displayName);
    setOpen(false);
    onChange(u.id);
  }

  function handleClear() {
    setSelected(null);
    setQuery('');
    setResults([]);
    onChange(null);
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex gap-1">
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => query && setOpen(true)}
          placeholder="Ad veya kullanıcı adı ile ara..."
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
        {selected && (
          <button onClick={handleClear} className="text-gray-400 hover:text-red-500 px-2 text-lg leading-none">×</button>
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto text-sm">
          {results.map((u) => (
            <li
              key={u.id}
              onMouseDown={() => handleSelect(u)}
              className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
            >
              <span className="font-medium text-gray-800">{u.displayName}</span>
              {u.department && <span className="ml-2 text-xs text-gray-400">{u.department}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Atama Paneli ────────────────────────────────────────────────────────────
function AssignPanel({ ticket, onAssigned }) {
  const [groups, setGroups]   = useState([]);
  const [members, setMembers] = useState([]);
  const [groupId, setGroupId] = useState(ticket.groupId || '');
  const [userId, setUserId]   = useState(ticket.assignedToId || '');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    getGroups().then(setGroups).catch(() => {});
  }, []);

  useEffect(() => {
    if (!groupId) { setMembers([]); return; }
    getGroupMembers(groupId).then(setMembers).catch(() => {});
  }, [groupId]);

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const updated = await assignTicket(ticket.id, {
        groupId:      groupId ? parseInt(groupId) : null,
        assignedToId: userId  ? parseInt(userId)  : null,
      });
      onAssigned(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-blue-100 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
        Atama Yönetimi
      </h2>

      {/* Grup */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Grup</label>
        <select
          value={groupId}
          onChange={(e) => { setGroupId(e.target.value); setUserId(''); }}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="">Grup seçin (opsiyonel)</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </div>

      {/* Kişi — grup seçiliyse dropdown, seçili değilse arama */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Kişi</label>
        {groupId && members.length > 0 ? (
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="">Kişi seçin (opsiyonel)</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName}{m.groupRole === 'leader' ? ' ★' : ''}
              </option>
            ))}
          </select>
        ) : (
          <UserSearch
            value={userId ? { id: userId, displayName: ticket.assignedTo?.displayName } : null}
            onChange={(id) => setUserId(id || '')}
          />
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="portal-cta-btn portal-cta-btn--blue w-full"
      >
        {saving ? 'Kaydediliyor...' : 'Atamayı Kaydet'}
      </button>

      {(ticket.group || ticket.assignedTo) && (
        <div className="pt-2 border-t border-gray-100 space-y-1 text-xs text-gray-500">
          {ticket.group && (
            <div className="flex justify-between">
              <span>Mevcut Grup</span>
              <span className="font-medium text-gray-700">{ticket.group.name}</span>
            </div>
          )}
          {ticket.assignedTo && (
            <div className="flex justify-between">
              <span>Mevcut Kişi</span>
              <span className="font-medium text-gray-700">{ticket.assignedTo.displayName}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Dosya İkonu ──────────────────────────────────────────────────────────────
function FileIcon({ mime }) {
  if (mime === 'application/pdf') return <span className="text-red-500 text-base">📄</span>;
  if (mime?.startsWith('image/')) return <span className="text-green-500 text-base">🖼</span>;
  if (mime?.includes('word'))    return <span className="text-blue-500 text-base">📝</span>;
  if (mime?.includes('excel') || mime?.includes('spreadsheet')) return <span className="text-emerald-600 text-base">📊</span>;
  return <span className="text-gray-400 text-base">📎</span>;
}

function fmtSize(bytes) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ─── Ekler Paneli ────────────────────────────────────────────────────────────
function AttachmentsPanel({ ticketId, closed }) {
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading]     = useState(false);
  const [error, setError]             = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    getAttachments(ticketId).then(setAttachments).catch(() => {});
  }, [ticketId]);

  async function handleFiles(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setError('');
    setUploading(true);
    try {
      const added = await uploadAttachments(ticketId, files);
      setAttachments(prev => [...prev, ...added]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          Ekler
          {attachments.length > 0 && (
            <span className="ml-2 text-xs text-gray-400">({attachments.length})</span>
          )}
        </h2>
        {!closed && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
          >
            {uploading ? (
              <>Yükleniyor...</>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Dosya Ekle
              </>
            )}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
          className="hidden"
          onChange={handleFiles}
        />
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      {attachments.length === 0 ? (
        <p className="text-xs text-gray-400">Ek bulunmuyor.</p>
      ) : (
        <ul className="space-y-2">
          {attachments.map(att => (
            <li key={att.id} className="flex items-center gap-3 text-sm group">
              <FileIcon mime={att.mimetype} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-700 truncate">{att.originalName}</p>
                <p className="text-xs text-gray-400">{fmtSize(att.size)} · {formatDate(att.createdAt)}</p>
              </div>
              <a
                href={getDownloadUrl(att.id)}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-xs text-indigo-600 hover:text-indigo-800 font-medium opacity-0 group-hover:opacity-100 transition"
              >
                İndir ↓
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Ana bileşen ─────────────────────────────────────────────────────────────
export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticket, setTicket]         = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [comment, setComment]       = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving]   = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSaving, setRejectSaving] = useState(false);

  // Transfer state
  const [transferModal, setTransferModal]   = useState(false);
  const [transferDepts, setTransferDepts]   = useState([]);
  const [transferGroups, setTransferGroups] = useState([]);
  const [transferForm, setTransferForm]     = useState({ targetDeptId: '', targetGroupId: '', note: '' });
  const [transferring, setTransferring]     = useState(false);
  const [transferError, setTransferError]   = useState('');

  // İade state
  const [iadeModal, setIadeModal]             = useState(false);
  const [iadeNeden, setIadeNeden]             = useState('');
  const [iadeAciklama, setIadeAciklama]       = useState('');
  const [iadeYonlendirId, setIadeYonlendirId] = useState(null);
  const [iadeSaving, setIadeSaving]           = useState(false);
  const [iadeNedenleri, setIadeNedenleri]     = useState([]);
  const [workOrders, setWorkOrders]           = useState([]);
  const [workOrdersLoading, setWorkOrdersLoading] = useState(false);
  const [workOrderError, setWorkOrderError]   = useState('');
  const [creatingWorkOrder, setCreatingWorkOrder] = useState(false);

  const canAssign   = ['admin', 'manager'].includes(user?.role) || ['admin', 'daire_baskani', 'mudur'].includes(user?.sistemRol);
  const canApprove  = ['admin', 'manager'].includes(user?.role);
  const canTransfer = ['admin', 'manager'].includes(user?.role);

  async function loadTicketDetail() {
    const data = await getTicket(id);
    setTicket(data);
    return data;
  }

  async function loadWorkOrders() {
    setWorkOrdersLoading(true);
    setWorkOrderError('');
    try {
      const data = await authGet(`/api/work-orders?ticketId=${id}`);
      setWorkOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      setWorkOrderError(e.message);
    } finally {
      setWorkOrdersLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    setError('');
    loadTicketDetail()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    loadWorkOrders().catch(() => {});
    // İade nedenleri yükle
    authFetch('/api/settings').then(d => {
      if (d.iade_nedenleri) {
        setIadeNedenleri(d.iade_nedenleri.split('\n').map(s => s.trim()).filter(Boolean));
      } else {
        setIadeNedenleri(['Yanlış gruba atandı', 'Konu uzmanlık alanım dışında', 'İş yoğunluğu nedeniyle', 'Eksik/hatalı bilgi', 'Diğer']);
      }
    }).catch(() => {
      setIadeNedenleri(['Yanlış gruba atandı', 'Konu uzmanlık alanım dışında', 'İş yoğunluğu nedeniyle', 'Eksik/hatalı bilgi', 'Diğer']);
    });
  }, [id]);

  async function handleStatusChange(newStatus) {
    try {
      const updated = await updateTicket(id, { status: newStatus });
      setTicket((t) => ({ ...t, ...updated }));
      // Aktiviteleri yenilemek için ticket'ı yeniden çek
      loadTicketDetail().catch(() => {});
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleApprove() {
    setApproving(true);
    try {
      await authPost(`/api/tickets/${id}/approve`, {});
      loadTicketDetail().catch(() => {});
    } catch (err) {
      alert(err.message);
    } finally {
      setApproving(false);
    }
  }

  async function openTransferModal() {
    setTransferForm({ targetDeptId: '', targetGroupId: '', note: '' });
    setTransferError('');
    // Daireleri yükle
    const r = await fetch(`${API}/api/departments`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    if (r.ok) setTransferDepts(await r.json());
    // Grupları yükle
    const gr = await fetch(`${API}/api/groups`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    if (gr.ok) setTransferGroups(await gr.json());
    setTransferModal(true);
  }

  async function handleTransfer(e) {
    e.preventDefault();
    if (!transferForm.targetDeptId) { setTransferError('Hedef daire seçiniz'); return; }
    setTransferring(true);
    setTransferError('');
    try {
      await authPost(`/api/tickets/${id}/transfer`, {
        targetDeptId:  parseInt(transferForm.targetDeptId),
        targetGroupId: transferForm.targetGroupId ? parseInt(transferForm.targetGroupId) : undefined,
        note:          transferForm.note.trim() || undefined,
      });
      setTransferModal(false);
      loadTicketDetail().catch(() => {});
    } catch (err) {
      setTransferError(err.message);
    } finally {
      setTransferring(false);
    }
  }

  async function handleReject(e) {
    e.preventDefault();
    if (!rejectReason.trim()) return;
    setRejectSaving(true);
    try {
      await authPost(`/api/tickets/${id}/reject`, { reason: rejectReason });
      setRejectModal(false);
      setRejectReason('');
      loadTicketDetail().catch(() => {});
    } catch (err) {
      alert(err.message);
    } finally {
      setRejectSaving(false);
    }
  }

  async function handleIadeTalebi() {
    if (!iadeNeden) return;
    const fullAciklama = iadeNeden === 'Diğer'
      ? iadeAciklama.trim()
      : iadeAciklama.trim() ? `${iadeNeden} — ${iadeAciklama.trim()}` : iadeNeden;
    if (!fullAciklama) return;
    setIadeSaving(true);
    try {
      await authPost(`/api/tickets/${id}/iade-talebi`, {
        aciklama: fullAciklama,
        yonlendirId: iadeYonlendirId || undefined,
      });
      setIadeModal(false);
      setIadeNeden('');
      setIadeAciklama('');
      setIadeYonlendirId(null);
      loadTicketDetail().catch(() => {});
    } catch (err) {
      alert(err.message);
    } finally {
      setIadeSaving(false);
    }
  }

  async function handleIadeOnayla() {
    try {
      await authPost(`/api/tickets/${id}/iade-onayla`, {});
      loadTicketDetail().catch(() => {});
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleIadeReddet() {
    try {
      await authPost(`/api/tickets/${id}/iade-reddet`, {});
      loadTicketDetail().catch(() => {});
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleComment(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      const newComment = await addComment(id, comment, isInternal);
      setTicket((t) => ({ ...t, comments: [...(t.comments || []), newComment] }));
      setComment('');
      setIsInternal(false);
      // Aktiviteleri yenilemek için ticket'ı yeniden çek
      loadTicketDetail().catch(() => {});
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="p-8 text-sm text-gray-400">Yükleniyor...</div>;
  if (error)   return <div className="p-8 text-sm text-red-500">{error}</div>;
  if (!ticket) return null;

  const nextStatuses = NEXT_STATUSES[ticket.status] || [];
  const isPendingApproval = ticket.status === 'PENDING_APPROVAL';
  const isRejected        = ticket.status === 'REJECTED';
  const isAssignedToMe    = ticket.assignedTo?.username === user?.username;
  const canIade           = isAssignedToMe && !['CLOSED', 'RESOLVED', 'REJECTED'].includes(ticket.status) && ticket.iadeDurumu !== 'PENDING';
  const canApproveIade    = (canAssign || ['admin', 'manager'].includes(user?.role) || ['admin', 'daire_baskani', 'mudur', 'sef'].includes(user?.sistemRol));
  const canCreateWorkOrder = isAssignedToMe || ['admin', 'manager'].includes(user?.role) || ['admin', 'daire_baskani', 'mudur', 'sef'].includes(user?.sistemRol);
  const showWorkOrdersPanel = canCreateWorkOrder || workOrders.length > 0;

  async function handleCreateWorkOrder() {
    setCreatingWorkOrder(true);
    try {
      await authPost(`/api/tickets/${id}/work-orders`, {});
      await Promise.all([loadTicketDetail(), loadWorkOrders()]);
    } catch (err) {
      alert(err.message);
    } finally {
      setCreatingWorkOrder(false);
    }
  }

  return (
    <div className="p-8 space-y-5">
      {/* Onay bekliyor banner */}
      {isPendingApproval && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">Onay Bekleniyor</p>
              <p className="text-xs text-amber-600 mt-0.5">Bu hizmet talebi yönetici onayı bekliyor.</p>
            </div>
          </div>
          {canApprove && (
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleApprove}
                disabled={approving}
                className="portal-cta-btn portal-cta-btn--green"
                style={{ fontSize: 13, padding: '8px 16px', opacity: approving ? 0.5 : 1 }}
              >
                {approving ? 'Onaylanıyor...' : 'Onayla'}
              </button>
              <button
                onClick={() => setRejectModal(true)}
                className="portal-cta-btn portal-cta-btn--red"
                style={{ fontSize: 13, padding: '8px 16px' }}
              >
                Reddet
              </button>
            </div>
          )}
        </div>
      )}

      {/* Reddedildi banner */}
      {isRejected && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-start gap-3">
          <span className="text-2xl mt-0.5">❌</span>
          <div>
            <p className="text-sm font-semibold text-red-800">Talep Reddedildi</p>
            {ticket.rejectedReason && (
              <p className="text-xs text-red-600 mt-1">
                <span className="font-medium">Red gerekçesi:</span> {ticket.rejectedReason}
              </p>
            )}
            {ticket.approvedBy && (
              <p className="text-xs text-red-400 mt-0.5">Reddeden: {ticket.approvedBy}</p>
            )}
          </div>
        </div>
      )}

      {/* İade Talebi Bekliyor banner */}
      {ticket.iadeDurumu === 'PENDING' && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">↩</span>
            <div>
              <p className="text-sm font-semibold text-orange-800">Görev İade Talebi Bekliyor</p>
              <p className="text-xs text-orange-600 mt-0.5">{ticket.iadeAciklama}</p>
              {ticket.iadeYonlendir && (
                <p className="text-xs text-orange-500 mt-0.5">Yönlendirme önerisi: {ticket.iadeYonlendir.displayName}</p>
              )}
            </div>
          </div>
          {canApproveIade && (
            <div className="flex gap-2 shrink-0">
              <button onClick={handleIadeOnayla} className="portal-cta-btn portal-cta-btn--green" style={{ fontSize: 13, padding: '8px 16px' }}>
                Onayla
              </button>
              <button onClick={handleIadeReddet} className="portal-cta-btn portal-cta-btn--red" style={{ fontSize: 13, padding: '8px 16px' }}>
                Reddet
              </button>
            </div>
          )}
        </div>
      )}

      {/* İade Modal */}
      {iadeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900">Görevi İade Et</h3>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                İade Nedeni <span className="text-red-500">*</span>
              </label>
              <select
                value={iadeNeden}
                onChange={e => setIadeNeden(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
              >
                <option value="">Neden seçin...</option>
                {iadeNedenleri.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {iadeNeden === 'Diğer' ? <>Açıklama <span className="text-red-500">*</span></> : 'Ek Açıklama (opsiyonel)'}
              </label>
              <textarea
                rows={3}
                value={iadeAciklama}
                onChange={e => setIadeAciklama(e.target.value)}
                placeholder={iadeNeden === 'Diğer' ? 'İade nedenini açıklayın...' : 'Varsa ek bilgi ekleyin...'}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Yönlendirme Önerisi (opsiyonel)
              </label>
              <UserSearch
                value={null}
                onChange={(uid) => setIadeYonlendirId(uid)}
              />
              <p className="text-xs text-gray-400 mt-1">Görevi devralmasını önerdiğiniz kişi</p>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => { setIadeModal(false); setIadeNeden(''); setIadeAciklama(''); setIadeYonlendirId(null); }}
                className="portal-pill-btn"
                style={{ fontSize: 13, padding: '8px 18px' }}>
                İptal
              </button>
              <button
                onClick={handleIadeTalebi}
                disabled={iadeSaving || !iadeNeden || (iadeNeden === 'Diğer' && !iadeAciklama.trim())}
                style={{ fontSize: 13, padding: '8px 18px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', opacity: (iadeSaving || !iadeNeden || (iadeNeden === 'Diğer' && !iadeAciklama.trim())) ? 0.5 : 1 }}>
                {iadeSaving ? 'Gönderiliyor...' : 'İade İsteği Gönder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {transferModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900">Daireye Aktar</h3>
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Hedef Daire <span className="text-red-500">*</span>
                </label>
                <select
                  value={transferForm.targetDeptId}
                  onChange={e => setTransferForm(p => ({ ...p, targetDeptId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                >
                  <option value="">Daire seçin</option>
                  {transferDepts.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Hedef Grup (opsiyonel)
                </label>
                <select
                  value={transferForm.targetGroupId}
                  onChange={e => setTransferForm(p => ({ ...p, targetGroupId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                >
                  <option value="">Grup seçin (opsiyonel)</option>
                  {transferGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Transfer Notu</label>
                <textarea
                  rows={3}
                  value={transferForm.note}
                  onChange={e => setTransferForm(p => ({ ...p, note: e.target.value }))}
                  placeholder="Transfer gerekçesini açıklayın..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-none"
                />
              </div>
              {transferError && (
                <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{transferError}</p>
              )}
              <div className="flex gap-2 justify-end pt-1">
                <button type="button"
                  onClick={() => setTransferModal(false)}
                  className="portal-pill-btn"
                  style={{ fontSize: 13, padding: '8px 18px' }}>
                  İptal
                </button>
                <button type="submit" disabled={transferring || !transferForm.targetDeptId}
                  className="portal-cta-btn portal-cta-btn--violet"
                  style={{ fontSize: 13, padding: '8px 18px', opacity: (transferring || !transferForm.targetDeptId) ? 0.5 : 1 }}>
                  {transferring ? 'Aktarılıyor...' : 'Aktar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Red Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900">Talebi Reddet</h3>
            <form onSubmit={handleReject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Red Gerekçesi <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Talebin neden reddedildiğini açıklayın..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => { setRejectModal(false); setRejectReason(''); }}
                  className="portal-pill-btn"
                  style={{ fontSize: 13, padding: '8px 18px' }}>
                  İptal
                </button>
                <button type="submit" disabled={rejectSaving || !rejectReason.trim()}
                  className="portal-cta-btn portal-cta-btn--red"
                  style={{ fontSize: 13, padding: '8px 18px', opacity: (rejectSaving || !rejectReason.trim()) ? 0.5 : 1 }}>
                  {rejectSaving ? 'Kaydediliyor...' : 'Reddet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Breadcrumb + başlık */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => navigate('/itsm')} className="portal-pill-btn mb-2" style={{ fontSize: 12, padding: '4px 12px' }}>
            ← Talep Listesi
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-800">{ticket.title}</h1>
            <span className="text-gray-300 font-mono text-sm">#{ticket.id}</span>
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <TypeBadge type={ticket.type} />
          </div>
        </div>

        <div className="flex gap-2 shrink-0 flex-wrap justify-end">
          {nextStatuses.map((s) => (
            <button
              key={s.value}
              onClick={() => handleStatusChange(s.value)}
              className="portal-cta-btn portal-cta-btn--blue"
              style={{ fontSize: 13, padding: '8px 16px' }}
            >
              {s.label}
            </button>
          ))}
          {canTransfer && !['CLOSED', 'REJECTED'].includes(ticket.status) && (
            <button
              onClick={openTransferModal}
              className="portal-cta-btn portal-cta-btn--violet"
              style={{ fontSize: 13, padding: '8px 16px' }}
            >
              Daireye Aktar
            </button>
          )}
          {canIade && (
            <button
              onClick={() => { setIadeNeden(''); setIadeAciklama(''); setIadeYonlendirId(null); setIadeModal(true); }}
              style={{ fontSize: 13, padding: '8px 16px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
            >
              ↩ Görevi İade Et
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Sol: Bilgi + Atama */}
        <div className="col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Talep Bilgileri</h2>
            {[
              { label: 'Tip',         value: <TypeBadge type={ticket.type} /> },
              { label: 'Kaynak',      value: <SourceBadge source={ticket.source} /> },
              { label: 'Öncelik',     value: <PriorityBadge priority={ticket.priority} /> },
              { label: 'Durum',       value: <StatusBadge status={ticket.status} /> },
              { label: 'Başvuru Konusu', value: ticket.category?.name || '—' },
              { label: 'Oluşturan',   value: ticket.createdBy?.displayName || '—' },
              ...(ticket.createdBy?.directorate ? [{ label: 'Daire',      value: ticket.createdBy.directorate }] : []),
              ...(ticket.createdBy?.department  ? [{ label: 'Müdürlük',  value: ticket.createdBy.department  }] : []),
              ...((ticket.createdBy?.office || ticket.createdBy?.city) ? [{ label: 'Lokasyon', value: ticket.createdBy.office || ticket.createdBy.city }] : []),
              { label: 'Atanan Grup', value: ticket.group?.name || <span className="text-gray-300">—</span> },
              { label: 'Atanan Kişi', value: ticket.assignedTo?.displayName || <span className="text-gray-300">—</span> },
              { label: 'Oluşturulma', value: formatDate(ticket.createdAt) },
              {
                label: 'Son Tarih',
                value: ticket.dueDate
                  ? <span className={new Date(ticket.dueDate) < new Date() && ticket.status !== 'CLOSED' ? 'text-red-600 font-semibold' : ''}>
                      {formatDate(ticket.dueDate)}
                    </span>
                  : '—',
              },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-start gap-2 text-sm">
                <span className="text-gray-400 shrink-0">{row.label}</span>
                <span className="text-gray-700 text-right">{row.value}</span>
              </div>
            ))}
          </div>

          {canAssign && ticket.status !== 'CLOSED' && (
            <AssignPanel
              ticket={ticket}
              onAssigned={(updated) => {
                setTicket((t) => ({ ...t, ...updated }));
                getTicket(id).then(setTicket).catch(() => {});
              }}
            />
          )}

          <AttachmentsPanel ticketId={parseInt(id)} closed={ticket.status === 'CLOSED'} />
        </div>

        {/* Sağ: Açıklama + Aktiviteler + Yorum Formu */}
        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Açıklama</h2>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{ticket.description}</p>
          </div>

          {showWorkOrdersPanel && (
            <WorkOrdersPanel
              orders={workOrders}
              loading={workOrdersLoading}
              error={workOrderError}
              canCreate={canCreateWorkOrder && !['PENDING_APPROVAL', 'REJECTED', 'CLOSED'].includes(ticket.status)}
              creating={creatingWorkOrder}
              onCreate={handleCreateWorkOrder}
              onOpenList={() => navigate(`/work-orders?ticketId=${ticket.id}`)}
            />
          )}

          {/* ulakBELL Bilgi Kartı */}
          <UlakbellCard
            ticket={ticket}
            isPrivileged={['admin','manager'].includes(user?.role)}
            onRefresh={() => loadTicketDetail().catch(() => {})}
          />

          {/* Aktivite Zaman Çizelgesi */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">
              Aktivite
              {ticket.activities?.length > 0 && (
                <span className="ml-2 text-xs text-gray-400">({ticket.activities.length})</span>
              )}
            </h2>

            <ActivityTimeline activities={ticket.activities} />
          </div>

          {/* Yorumlar */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">
              Yorumlar
              {ticket.comments?.length > 0 && (
                <span className="ml-2 text-xs text-gray-400">({ticket.comments.length})</span>
              )}
            </h2>

            {ticket.comments?.length === 0 && (
              <p className="text-xs text-gray-400">Henüz yorum yok.</p>
            )}

            <div className="space-y-3">
              {ticket.comments?.map((c) => (
                <div key={c.id} className={`flex gap-3 ${c.isInternal ? 'opacity-80' : ''}`}>
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold shrink-0">
                    {c.author?.displayName?.charAt(0) || c.authorId}
                  </div>
                  <div className={`flex-1 rounded-lg px-4 py-3 ${c.isInternal ? 'bg-amber-50 border border-amber-100' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs text-gray-400">{formatDate(c.createdAt)}</p>
                      {c.isInternal && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">İç Not</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>

            {ticket.status !== 'CLOSED' && (
              <form onSubmit={handleComment} className="space-y-2 pt-2 border-t border-gray-100">
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Yorum ekleyin..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                    />
                    <span className="text-xs text-gray-500">İç Not (sadece ekip görür)</span>
                  </label>
                  <button
                    type="submit"
                    disabled={submitting || !comment.trim()}
                    className="portal-cta-btn portal-cta-btn--blue"
                  >
                    {submitting ? 'Gönderiliyor...' : 'Yorum Ekle'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
