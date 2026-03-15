import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || '';

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}
async function authFetch(path) {
  const r = await fetch(`${API_URL}${path}`, { headers: authHeaders() });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'İstek başarısız');
  return d;
}
async function authPost(path, body) {
  const r = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'İşlem başarısız');
  return d;
}

// ─── Sabitler ─────────────────────────────────────────────────────────────────

const DEVICE_ICONS = {
  BILGISAYAR: '💻', DIZUSTU: '💻', IPAD_TABLET: '📱',
  IP_TELEFON: '☎️', YAZICI: '🖨️', MONITOR: '🖥️',
  SWITCH: '🔌', ACCESS_POINT: '📡', SUNUCU: '🗄️', UPS: '🔋', DIGER: '📦',
};

const STATUS_LABELS = {
  OPEN: 'Açık', PENDING_APPROVAL: 'Onay Bekl.', ASSIGNED: 'Atandı',
  IN_PROGRESS: 'İşlemde', RESOLVED: 'Çözüldü', CLOSED: 'Kapalı', REJECTED: 'Reddedildi',
};
const STATUS_COLORS = {
  OPEN: 'bg-blue-100 text-blue-700', PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
  ASSIGNED: 'bg-indigo-100 text-indigo-700', IN_PROGRESS: 'bg-purple-100 text-purple-700',
  RESOLVED: 'bg-green-100 text-green-700', CLOSED: 'bg-gray-100 text-gray-500',
  REJECTED: 'bg-red-100 text-red-700',
};
const PRIORITY_COLORS = {
  CRITICAL: 'bg-red-100 text-red-700', HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-amber-100 text-amber-700', LOW: 'bg-gray-100 text-gray-500',
};
const PRIORITY_LABELS = { CRITICAL: 'Kritik', HIGH: 'Yüksek', MEDIUM: 'Orta', LOW: 'Düşük' };

const DEVICE_STATUS = {
  ACTIVE:      { cls: 'bg-green-50 text-green-700',  label: 'Aktif'      },
  PASSIVE:     { cls: 'bg-gray-50 text-gray-500',    label: 'Pasif'      },
  BROKEN:      { cls: 'bg-red-50 text-red-700',      label: 'Arızalı'    },
  TRANSFERRED: { cls: 'bg-blue-50 text-blue-700',    label: 'Devredildi' },
};

// ─── WelcomeBanner ────────────────────────────────────────────────────────────
function WelcomeBanner({ user }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hour = time.getHours();
  const greeting = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';
  const timeStr = time.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const dateStr = time.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
  const roleLabel = user.role === 'admin' ? 'Yönetici' : user.role === 'manager' ? 'Birim Yöneticisi' : 'Kullanıcı';

  return (
    <div className="animate-fadeIn relative overflow-hidden rounded-2xl px-8 py-6 shadow-md shadow-blue-900/15"
      style={{ background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 60%, #3b82f6 100%)' }}>
      <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-white/5" />
      <div className="absolute top-4 right-28 w-24 h-24 rounded-full bg-white/5" />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-blue-200 text-sm font-medium mb-1">{greeting} 👋</p>
          <h1 className="text-2xl font-bold text-white">{user.displayName || user.username}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <span className="text-xs px-2.5 py-1 rounded-full bg-white/15 text-blue-100 font-medium">{roleLabel}</span>
            {user.directorate && <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-blue-200">{user.directorate}</span>}
            {user.department  && <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-blue-200">{user.department}</span>}
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-4xl font-bold text-white/90 tabular-nums">{timeStr}</p>
          <p className="text-blue-200 text-xs mt-1.5 capitalize">{dateStr}</p>
        </div>
      </div>
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, valueColor = 'text-gray-800', sub, delay = '', loading }) {
  return (
    <div className={`animate-fadeIn ${delay} bg-white rounded-2xl p-5 shadow-sm border border-gray-100`}>
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        <span className="text-xl leading-none">{icon}</span>
      </div>
      {loading ? (
        <div className="mt-3 h-9 w-16 bg-gray-100 rounded-lg animate-pulse" />
      ) : (
        <p className={`mt-2 text-3xl font-bold tabular-nums ${valueColor}`}>{value ?? '—'}</p>
      )}
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// ─── SonBasvurularCard ────────────────────────────────────────────────────────
function SonBasvurularCard({ delay = '' }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    authFetch('/api/tickets?createdBy=me&limit=5')
      .then(d => setTickets(Array.isArray(d) ? d : d.tickets || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={`animate-fadeIn ${delay} bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden`}>
      {/* Başlık */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-base">📋</span>
          <h2 className="font-semibold text-gray-800 text-sm">Son Başvurularım</h2>
        </div>
        <button
          onClick={() => navigate('/itsm/new')}
          className="text-xs font-semibold bg-[#1e40af] hover:bg-[#1d4ed8] text-white px-3 py-1.5 rounded-xl transition-colors"
        >
          + Yeni
        </button>
      </div>

      {/* Liste */}
      <div className="divide-y divide-gray-50">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-3">
              <div className="h-3.5 w-8 bg-gray-100 rounded animate-pulse" />
              <div className="h-3.5 flex-1 bg-gray-100 rounded animate-pulse" />
              <div className="h-5 w-20 bg-gray-100 rounded-full animate-pulse" />
            </div>
          ))
        ) : tickets.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-2xl mb-1">📭</p>
            <p className="text-xs text-gray-400">Henüz başvurunuz yok</p>
          </div>
        ) : (
          tickets.map(t => (
            <div key={t.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/70 transition-colors group">
              <span className="text-xs text-gray-300 font-mono w-8 shrink-0">#{t.id}</span>
              <Link
                to={`/itsm/${t.id}`}
                className="flex-1 text-sm text-gray-800 group-hover:text-[#1e40af] font-medium truncate transition-colors"
              >
                {t.title}
              </Link>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${STATUS_COLORS[t.status] || 'bg-gray-100 text-gray-500'}`}>
                {STATUS_LABELS[t.status] || t.status}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="px-5 py-3 border-t border-gray-50">
        <Link to="/my-tickets" className="text-xs font-medium text-[#1e40af] hover:text-[#1d4ed8] transition-colors">
          Tüm Başvurularım →
        </Link>
      </div>
    </div>
  );
}

// ─── AktifGorevlerCard ────────────────────────────────────────────────────────
function AktifGorevlerCard({ delay = '' }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/tickets?assignedTo=me')
      .then(d => setTickets(Array.isArray(d) ? d : d.tickets || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const total    = tickets.length;
  const active   = tickets.filter(t => ['OPEN', 'ASSIGNED', 'IN_PROGRESS'].includes(t.status));
  const pending  = tickets.filter(t => ['OPEN', 'ASSIGNED'].includes(t.status)).length;
  const inProg   = tickets.filter(t => t.status === 'IN_PROGRESS').length;
  const resolved = tickets.filter(t =>
    ['RESOLVED', 'CLOSED'].includes(t.status) && new Date(t.updatedAt) >= monthStart
  ).length;

  const ratio = total > 0 ? resolved / total : 0;
  const r = 28, circ = 2 * Math.PI * r;
  const offset = circ * (1 - ratio);
  const circColor = ratio >= 0.8 ? '#22c55e' : ratio >= 0.5 ? '#f59e0b' : '#ef4444';

  function slaRowCls(t) {
    if (!t.dueDate) return '';
    const diff = new Date(t.dueDate) - now;
    if (diff < 0 || diff < 3600000) return 'bg-red-50';
    if (diff < 4 * 3600000) return 'bg-amber-50';
    return '';
  }

  return (
    <div className={`animate-fadeIn ${delay} bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden`}>
      <div className="px-5 py-4 flex items-center gap-2 border-b border-gray-50">
        <span className="text-base">✅</span>
        <h2 className="font-semibold text-gray-800 text-sm">Aktif Görevlerim</h2>
      </div>

      <div className="px-5 py-4">
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* İstatistikler + progress */}
            <div className="flex items-center gap-3 mb-4">
              <div className="grid grid-cols-4 gap-2 flex-1">
                {[
                  { label: 'Toplam',    v: total,    cls: 'text-gray-700',   bg: 'bg-gray-50'   },
                  { label: 'Bekleyen',  v: pending,  cls: 'text-amber-700',  bg: 'bg-amber-50'  },
                  { label: 'İşlemde',   v: inProg,   cls: 'text-indigo-700', bg: 'bg-indigo-50' },
                  { label: 'Bu Ay ✓',  v: resolved, cls: 'text-green-700',  bg: 'bg-green-50'  },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} rounded-xl p-2.5 text-center`}>
                    <p className={`text-xl font-bold ${s.cls}`}>{s.v}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{s.label}</p>
                  </div>
                ))}
              </div>
              <svg width="72" height="72" viewBox="0 0 72 72" className="shrink-0">
                <circle cx="36" cy="36" r={r} fill="none" stroke="#f3f4f6" strokeWidth="6" />
                <circle cx="36" cy="36" r={r} fill="none" stroke={circColor} strokeWidth="6"
                  strokeDasharray={circ} strokeDashoffset={offset}
                  strokeLinecap="round" transform="rotate(-90 36 36)"
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
                <text x="36" y="41" textAnchor="middle" fontSize="13" fontWeight="700" fill="#374151">
                  {Math.round(ratio * 100)}%
                </text>
              </svg>
            </div>

            {/* Görev listesi (max 5 aktif) */}
            {active.length > 0 ? (
              <div className="divide-y divide-gray-50 -mx-5">
                {active.slice(0, 5).map(t => {
                  const bg = slaRowCls(t);
                  return (
                    <div key={t.id} className={`px-5 py-2.5 flex items-center gap-3 ${bg} hover:bg-gray-50/70 transition-colors group`}>
                      <span className="text-xs text-gray-300 font-mono w-8 shrink-0">#{t.id}</span>
                      <Link to={`/itsm/${t.id}`}
                        className="flex-1 text-sm text-gray-800 group-hover:text-[#1e40af] font-medium truncate transition-colors">
                        {t.title}
                      </Link>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${PRIORITY_COLORS[t.priority] || 'bg-gray-100 text-gray-500'}`}>
                        {PRIORITY_LABELS[t.priority] || t.priority}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-3">Aktif görev yok</p>
            )}
          </>
        )}
      </div>

      <div className="px-5 py-3 border-t border-gray-50">
        <Link to="/my-tasks" className="text-xs font-medium text-[#1e40af] hover:text-[#1d4ed8] transition-colors">
          Tüm Görevlerim →
        </Link>
      </div>
    </div>
  );
}

// ─── EnvanterimCard ───────────────────────────────────────────────────────────
function EnvanterimCard({ delay = '' }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/inventory?assignedTo=me')
      .then(d => setDevices(Array.isArray(d) ? d : d.devices || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={`animate-fadeIn ${delay} bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden`}>
      <div className="px-5 py-4 flex items-center gap-2 border-b border-gray-50">
        <span className="text-base">🖥️</span>
        <h2 className="font-semibold text-gray-800 text-sm">Envanterim</h2>
        {!loading && devices.length > 0 && (
          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-semibold">
            {devices.length}
          </span>
        )}
      </div>

      <div className="divide-y divide-gray-50">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-xl animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-gray-100 rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse" />
              </div>
            </div>
          ))
        ) : devices.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-2xl mb-1">📦</p>
            <p className="text-xs text-gray-400">Kayıtlı cihaz yok</p>
          </div>
        ) : (
          devices.map(dev => {
            const s = DEVICE_STATUS[dev.status] || { cls: 'bg-gray-50 text-gray-500', label: dev.status };
            return (
              <div key={dev.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/70 transition-colors">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${s.cls.split(' ')[0]}`}>
                  {DEVICE_ICONS[dev.type] || '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{dev.name}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {[dev.brand, dev.model].filter(Boolean).join(' ') || dev.type}
                  </p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${s.cls}`}>
                  {s.label}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── OnayBekleyenlerCard ──────────────────────────────────────────────────────
function OnayBekleyenlerCard({ delay = '' }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    authFetch('/api/tickets/pending-approval')
      .then(d => setTickets(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleApprove = async (id) => {
    setBusy(true);
    try {
      await authPost(`/api/tickets/${id}/approve`);
      setTickets(p => p.filter(t => t.id !== id));
    } catch (e) { alert(e.message); }
    finally { setBusy(false); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setBusy(true);
    try {
      await authPost(`/api/tickets/${rejectId}/reject`, { reason: rejectReason });
      setTickets(p => p.filter(t => t.id !== rejectId));
      setRejectId(null); setRejectReason('');
    } catch (e) { alert(e.message); }
    finally { setBusy(false); }
  };

  const shown = tickets.slice(0, 4);

  return (
    <>
      <div className={`animate-fadeIn ${delay} bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden`}>
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50">
          <div className="flex items-center gap-2">
            <span className="text-base">⏳</span>
            <h2 className="font-semibold text-gray-800 text-sm">Onay Bekleyenler</h2>
          </div>
          {!loading && tickets.length > 0 && (
            <span className="relative flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
              <span className="relative flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {tickets.length > 9 ? '9+' : tickets.length}
              </span>
            </span>
          )}
        </div>

        <div className="divide-y divide-gray-50">
          {loading ? (
            [...Array(2)].map((_, i) => (
              <div key={i} className="px-5 py-4 space-y-2">
                <div className="h-3.5 bg-gray-100 rounded w-3/4 animate-pulse" />
                <div className="flex gap-2 pt-1">
                  <div className="h-7 bg-gray-100 rounded-xl flex-1 animate-pulse" />
                  <div className="h-7 bg-gray-100 rounded-xl flex-1 animate-pulse" />
                </div>
              </div>
            ))
          ) : shown.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-2xl mb-1">✅</p>
              <p className="text-xs text-gray-400">Onay bekleyen yok</p>
            </div>
          ) : (
            shown.map(t => (
              <div key={t.id} className="px-5 py-3.5">
                <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {t.createdBy?.displayName || t.createdBy?.username} · #{t.id}
                </p>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => handleApprove(t.id)} disabled={busy}
                    className="flex-1 text-xs font-semibold bg-green-50 text-green-700 border border-green-200 rounded-xl py-1.5 hover:bg-green-100 transition-colors disabled:opacity-50">
                    Onayla
                  </button>
                  <button onClick={() => { setRejectId(t.id); setRejectReason(''); }} disabled={busy}
                    className="flex-1 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded-xl py-1.5 hover:bg-red-100 transition-colors disabled:opacity-50">
                    Reddet
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-50">
          <Link to="/pending-approvals" className="text-xs font-medium text-[#1e40af] hover:text-[#1d4ed8] transition-colors">
            Tümünü Gör →
          </Link>
        </div>
      </div>

      {rejectId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-3">Reddetme Nedeni</h3>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Neden reddediyorsunuz?"
              className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-200"
            />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setRejectId(null)}
                className="flex-1 text-sm font-medium border border-gray-200 rounded-xl py-2 hover:bg-gray-50 transition-colors">
                İptal
              </button>
              <button onClick={handleReject} disabled={busy || !rejectReason.trim()}
                className="flex-1 text-sm font-semibold bg-red-600 text-white rounded-xl py-2 hover:bg-red-700 disabled:opacity-50 transition-colors">
                Reddet
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── HizliBasvuruCard ─────────────────────────────────────────────────────────
function HizliBasvuruCard({ delay = '' }) {
  const navigate = useNavigate();
  return (
    <div className={`animate-fadeIn ${delay} bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden`}>
      <div className="px-5 py-4 flex items-center gap-2 border-b border-gray-50">
        <span className="text-base">🚀</span>
        <h2 className="font-semibold text-gray-800 text-sm">Hızlı Başvuru</h2>
      </div>
      <div className="p-4 space-y-2">
        {[
          { icon: '⚡', label: 'Arıza Bildir',    desc: 'Donanım / yazılım sorunu'    },
          { icon: '📋', label: 'Hizmet Talebi',   desc: 'İstek ve talep bildirimi'    },
          { icon: '🖥️', label: 'Envanter Sorunu', desc: 'Cihaz güncelle veya bildir'  },
        ].map(item => (
          <button
            key={item.label}
            onClick={() => navigate('/itsm/new')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all group text-left"
          >
            <span className="text-xl">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 group-hover:text-[#1e40af] transition-colors">{item.label}</p>
              <p className="text-xs text-gray-400">{item.desc}</p>
            </div>
            <svg className="w-4 h-4 text-gray-300 group-hover:text-[#1e40af] transition-colors shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── UserDashboard ────────────────────────────────────────────────────────────
export default function UserDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    authFetch('/api/dashboard/my-stats')
      .then(setStats)
      .catch(() => {});
  }, []);

  if (!user) return null;
  const isMgr = ['admin', 'manager'].includes(user.role);

  return (
    <div className="p-6 space-y-5" style={{ background: '#f0f4f8', minHeight: '100%' }}>

      {/* ── 1. Banner ───────────────────────────────────── */}
      <WelcomeBanner user={user} />

      {/* ── 2. Stat Kartları ────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Açık Taleplerim"  value={stats?.openTickets}      icon="📂" loading={!stats} />
        <StatCard label="Bu Ay Çözülen"    value={stats?.resolvedThisMonth} icon="✅" valueColor="text-green-700" loading={!stats} delay="delay-100" />
        <StatCard label="Görevlerim"       value={stats?.myTasks}          icon="📌" valueColor="text-indigo-700" loading={!stats} delay="delay-200" />
        <StatCard
          label="SLA Riski"
          value={stats?.slaRisk ?? '—'}
          icon="⏱️"
          valueColor={stats?.slaRisk > 0 ? 'text-red-700' : 'text-gray-700'}
          sub={stats?.slaRisk > 0 ? '2 saatten az süresi var' : undefined}
          loading={!stats}
          delay="delay-300"
        />
      </div>

      {/* ── 3. Ana İçerik: Sol + Sağ ─────────────────────── */}
      <div className="flex gap-4 items-start">

        {/* Sol — esnek genişlik */}
        <div className="flex-1 min-w-0 space-y-4">
          <SonBasvurularCard delay="delay-100" />
          {isMgr && <AktifGorevlerCard delay="delay-200" />}
        </div>

        {/* Sağ — sabit 288px */}
        <div className="w-72 shrink-0 space-y-4">
          <EnvanterimCard delay="delay-100" />
          {isMgr && <OnayBekleyenlerCard delay="delay-200" />}
          <HizliBasvuruCard delay="delay-300" />
        </div>

      </div>
    </div>
  );
}
