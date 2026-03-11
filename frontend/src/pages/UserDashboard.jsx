import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTickets } from '../api/tickets';
import { StatusBadge, PriorityBadge } from '../components/badges';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function authHeaders() {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
}

async function authFetch(path) {
  const res = await fetch(`${API_URL}${path}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'İstek başarısız');
  return data;
}

async function approveTicket(id) {
  const res = await fetch(`${API_URL}/api/tickets/${id}/approve`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Onaylanamadı');
  return data;
}

async function rejectTicket(id, reason) {
  const res = await fetch(`${API_URL}/api/tickets/${id}/reject`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Reddedilemedi');
  return data;
}

const DEVICE_ICONS = {
  BILGISAYAR: '💻', DIZUSTU: '💻', IPAD_TABLET: '📱',
  IP_TELEFON: '☎️', YAZICI: '🖨️', MONITOR: '🖥️',
  SWITCH: '🔌', ACCESS_POINT: '📡', SUNUCU: '🗄️', UPS: '🔋', DIGER: '📦',
};

const DEVICE_STATUS_STYLES = {
  ACTIVE:      'bg-green-100 text-green-700',
  PASSIVE:     'bg-gray-100 text-gray-500',
  BROKEN:      'bg-red-100 text-red-700',
  TRANSFERRED: 'bg-blue-100 text-blue-700',
};

const DEVICE_STATUS_LABELS = {
  ACTIVE: 'Aktif', PASSIVE: 'Pasif', BROKEN: 'Arızalı', TRANSFERRED: 'Devredildi',
};

// ─── WelcomeBar ───────────────────────────────────────────────────────────────
function WelcomeBar({ user }) {
  const today = new Date().toLocaleDateString('tr-TR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          Hoş geldiniz, {user.displayName || user.username}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {[user.directorate, user.department].filter(Boolean).join(' · ')}
        </p>
      </div>
      <span className="text-sm text-gray-400">{today}</span>
    </div>
  );
}

// ─── MyDevicesCard ────────────────────────────────────────────────────────────
function MyDevicesCard() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/inventory?assignedTo=me')
      .then(d => setDevices(d.devices || d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h2 className="font-semibold text-gray-700 text-sm mb-3">Envanterim</h2>
      {loading ? (
        <p className="text-xs text-gray-400 py-4 text-center">Yükleniyor...</p>
      ) : devices.length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center">Kayıtlı cihaz yok</p>
      ) : (
        <ul className="space-y-2">
          {devices.map(dev => (
            <li key={dev.id} className="flex items-center gap-2 text-sm">
              <span className="text-lg">{DEVICE_ICONS[dev.type] || '📦'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{dev.name}</p>
                <p className="text-xs text-gray-400 truncate">{dev.brand} {dev.model}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DEVICE_STATUS_STYLES[dev.status] || 'bg-gray-100 text-gray-500'}`}>
                {DEVICE_STATUS_LABELS[dev.status] || dev.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── MyTicketsCard ────────────────────────────────────────────────────────────
function MyTicketsCard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getTickets({ createdBy: 'me', limit: 5 })
      .then(setTickets)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-700 text-sm">Başvurularım</h2>
        <button
          onClick={() => navigate('/itsm/new')}
          className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Yeni Başvuru
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-gray-400 py-4 text-center">Yükleniyor...</p>
      ) : tickets.length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center">Henüz başvuru yok</p>
      ) : (
        <div className="overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100">
                <th className="text-left py-1.5 font-medium w-8">#</th>
                <th className="text-left py-1.5 font-medium">Konu</th>
                <th className="text-left py-1.5 font-medium">Durum</th>
                <th className="text-left py-1.5 font-medium">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 text-gray-400">{t.id}</td>
                  <td className="py-2">
                    <Link to={`/itsm/${t.id}`} className="text-indigo-600 hover:underline truncate block max-w-[200px]">
                      {t.title}
                    </Link>
                  </td>
                  <td className="py-2"><StatusBadge status={t.status} /></td>
                  <td className="py-2 text-gray-400">
                    {new Date(t.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-gray-100">
        <Link to="/itsm" className="text-xs text-indigo-600 hover:underline">
          Tümünü Gör →
        </Link>
      </div>
    </div>
  );
}

// ─── MyTasksCard ──────────────────────────────────────────────────────────────
function MyTasksCard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTickets({ assignedTo: 'me' })
      .then(setTickets)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const total     = tickets.length;
  const pending   = tickets.filter(t => ['OPEN', 'ASSIGNED'].includes(t.status)).length;
  const inProg    = tickets.filter(t => t.status === 'IN_PROGRESS').length;
  const resolved  = tickets.filter(t =>
    t.status === 'RESOLVED' && new Date(t.updatedAt) >= thisMonthStart
  ).length;

  const ratio = total > 0 ? resolved / total : 0;
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - ratio);
  const circleColor = ratio >= 0.8 ? '#22c55e' : ratio >= 0.5 ? '#f59e0b' : '#ef4444';

  const pendingTickets = tickets
    .filter(t => ['OPEN', 'ASSIGNED'].includes(t.status))
    .slice(0, 5);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h2 className="font-semibold text-gray-700 text-sm mb-3">Görevlerim</h2>

      {loading ? (
        <p className="text-xs text-gray-400 py-4 text-center">Yükleniyor...</p>
      ) : (
        <>
          {/* Stat kutuları + progress */}
          <div className="flex items-center gap-3 mb-4">
            <div className="grid grid-cols-4 gap-2 flex-1">
              {[
                { label: 'Toplam', value: total, color: 'text-gray-700' },
                { label: 'Bekleyen', value: pending, color: 'text-amber-600' },
                { label: 'Devam Eden', value: inProg, color: 'text-blue-600' },
                { label: 'Bu Ay Çözülen', value: resolved, color: 'text-green-600' },
              ].map(stat => (
                <div key={stat.label} className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-gray-400 leading-tight mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="flex-shrink-0">
              <svg width="72" height="72" viewBox="0 0 72 72">
                <circle cx="36" cy="36" r={r} fill="none" stroke="#e5e7eb" strokeWidth="6" />
                <circle
                  cx="36" cy="36" r={r} fill="none"
                  stroke={circleColor} strokeWidth="6"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  transform="rotate(-90 36 36)"
                />
                <text x="36" y="40" textAnchor="middle" fontSize="13" fontWeight="600" fill="#374151">
                  {Math.round(ratio * 100)}%
                </text>
              </svg>
            </div>
          </div>

          {/* Bekleyen görevler tablosu */}
          {pendingTickets.length > 0 ? (
            <div className="overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-100">
                    <th className="text-left py-1.5 font-medium w-8">#</th>
                    <th className="text-left py-1.5 font-medium">Başlık</th>
                    <th className="text-left py-1.5 font-medium">Öncelik</th>
                    <th className="text-left py-1.5 font-medium">Kaynak</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingTickets.map(t => (
                    <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 text-gray-400">{t.id}</td>
                      <td className="py-2">
                        <Link to={`/itsm/${t.id}`} className="text-indigo-600 hover:underline truncate block max-w-[160px]">
                          {t.title}
                        </Link>
                      </td>
                      <td className="py-2"><PriorityBadge priority={t.priority} /></td>
                      <td className="py-2 text-gray-400 truncate max-w-[100px]">
                        {t.createdBy?.directorate || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-400 py-2 text-center">Bekleyen görev yok</p>
          )}

          <div className="mt-3 pt-2 border-t border-gray-100">
            <Link to="/my-tasks" className="text-xs text-indigo-600 hover:underline">
              Tümünü Gör →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

// ─── PendingApprovalsCard ─────────────────────────────────────────────────────
function PendingApprovalsCard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState(null); // ticketId
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = () => {
    authFetch('/api/tickets/pending-approval')
      .then(setTickets)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id) => {
    setActionLoading(true);
    try {
      await approveTicket(id);
      setTickets(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await rejectTicket(rejectModal, rejectReason);
      setTickets(prev => prev.filter(t => t.id !== rejectModal));
      setRejectModal(null);
      setRejectReason('');
    } catch (e) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const shown = tickets.slice(0, 3);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-700 text-sm">Onay Bekleyenler</h2>
        {tickets.length > 0 && (
          <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {tickets.length > 9 ? '9+' : tickets.length}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-gray-400 py-4 text-center">Yükleniyor...</p>
      ) : shown.length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center">Onay bekleyen talep yok</p>
      ) : (
        <ul className="space-y-2">
          {shown.map(t => (
            <li key={t.id} className="border border-gray-100 rounded-lg p-2">
              <p className="text-xs font-medium text-gray-800 truncate">{t.title}</p>
              <p className="text-xs text-gray-400 mb-2">
                {t.createdBy?.displayName || t.createdBy?.username} · #{t.id}
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => handleApprove(t.id)}
                  disabled={actionLoading}
                  className="flex-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded px-2 py-1 hover:bg-green-100 transition-colors disabled:opacity-50"
                >
                  Onayla
                </button>
                <button
                  onClick={() => { setRejectModal(t.id); setRejectReason(''); }}
                  disabled={actionLoading}
                  className="flex-1 text-xs bg-red-50 text-red-700 border border-red-200 rounded px-2 py-1 hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  Reddet
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 pt-2 border-t border-gray-100">
        <Link to="/pending-approvals" className="text-xs text-indigo-600 hover:underline">
          Tümünü Gör →
        </Link>
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-5 w-80">
            <h3 className="font-semibold text-gray-800 mb-2">Reddetme Nedeni</h3>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Neden reddediyorsunuz?"
              className="w-full border border-gray-200 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 text-sm border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
                className="flex-1 text-sm bg-red-600 text-white rounded-lg py-1.5 hover:bg-red-700 disabled:opacity-50"
              >
                Reddet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── UserDashboard ────────────────────────────────────────────────────────────
export default function UserDashboard() {
  const { user } = useAuth();

  if (!user) return null;

  const isManagerOrAdmin = ['admin', 'manager'].includes(user.role);

  return (
    <div className="space-y-4">
      <WelcomeBar user={user} />

      {isManagerOrAdmin && (
        <Link
          to="/manager-dashboard"
          className="flex items-center justify-between px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition group"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">📊</span>
            <div>
              <p className="text-sm font-semibold">Birim Performans Raporunu Görüntüle</p>
              <p className="text-xs text-indigo-200">Başvuru istatistikleri, personel performansı ve SLA takibi</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-indigo-300 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}

      <div className="grid grid-cols-3 gap-4">
        {/* Sol kolon — col-span-2 */}
        <div className="col-span-2 space-y-4">
          <MyTicketsCard />
          {isManagerOrAdmin && <MyTasksCard />}
        </div>

        {/* Sağ kolon — col-span-1 */}
        <div className="col-span-1 space-y-4">
          <MyDevicesCard />
          {isManagerOrAdmin && <PendingApprovalsCard />}
        </div>
      </div>
    </div>
  );
}
