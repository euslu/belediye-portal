import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge, PriorityBadge } from '../../components/badges';

const API = import.meta.env.VITE_API_URL || '';

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

function authPost(path, body) {
  return fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'İşlem başarısız');
    return data;
  });
}

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ─── Red Modalı ───────────────────────────────────────────────────────────────
function RejectModal({ ticket, onClose, onRejected }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!reason.trim()) return;
    setSaving(true);
    try {
      await authPost(`/api/tickets/${ticket.id}/reject`, { reason });
      onRejected(ticket.id);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">Talebi Reddet</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            <span className="font-medium text-gray-700">#{ticket.id}</span> — {ticket.title}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Red Gerekçesi <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              required
              autoFocus
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Talebin neden reddedildiğini açıklayın..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose}
              className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
              İptal
            </button>
            <button type="submit" disabled={saving || !reason.trim()}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-semibold px-5 py-2 rounded-lg transition">
              {saving ? 'Kaydediliyor...' : 'Reddet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────
export default function PendingApprovals() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tickets, setTickets]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [approvingId, setApprovingId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    fetch(`${API}/api/tickets/pending-approval`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setTickets(data);
        else setError(data.error || 'Talepler alınamadı');
      })
      .catch(() => setError('Sunucuya bağlanılamadı'))
      .finally(() => setLoading(false));
  }

  async function handleApprove(ticket) {
    setApprovingId(ticket.id);
    try {
      await authPost(`/api/tickets/${ticket.id}/approve`, {});
      setTickets(prev => prev.filter(t => t.id !== ticket.id));
    } catch (err) {
      alert(err.message);
    } finally {
      setApprovingId(null);
    }
  }

  function handleRejected(ticketId) {
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    setRejectTarget(null);
  }

  if (!['admin', 'manager'].includes(user?.role)) {
    return <div className="p-8 text-sm text-red-500">Bu sayfaya erişim yetkiniz yok.</div>;
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Onay Bekleyen Talepler</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Yükleniyor...' : `${tickets.length} talep onay bekliyor`}
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Yenile
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {!loading && tickets.length === 0 && !error && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-sm font-medium text-gray-700">Onay bekleyen talep yok</p>
          <p className="text-xs text-gray-400 mt-1">Tüm talepler işlendi.</p>
        </div>
      )}

      {tickets.length > 0 && (
        <div className="space-y-3">
          {tickets.map(ticket => (
            <div key={ticket.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition">
              <div className="flex items-start justify-between gap-4">
                {/* Sol: talep bilgileri */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <button
                      onClick={() => navigate(`/itsm/${ticket.id}`)}
                      className="text-sm font-semibold text-gray-900 hover:text-indigo-700 transition text-left"
                    >
                      {ticket.title}
                    </button>
                    <span className="text-gray-300 font-mono text-xs">#{ticket.id}</span>
                    <StatusBadge status={ticket.status} />
                    <PriorityBadge priority={ticket.priority} />
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span>
                      <span className="text-gray-400">Başvuran:</span>{' '}
                      <span className="font-medium text-gray-700">{ticket.createdBy?.displayName || '—'}</span>
                    </span>
                    {ticket.createdBy?.directorate && (
                      <span>
                        <span className="text-gray-400">Daire:</span>{' '}
                        <span className="font-medium text-gray-700">{ticket.createdBy.directorate}</span>
                      </span>
                    )}
                    {ticket.createdBy?.department && (
                      <span>
                        <span className="text-gray-400">Birim:</span>{' '}
                        <span className="font-medium text-gray-700">{ticket.createdBy.department}</span>
                      </span>
                    )}
                    {ticket.category && (
                      <span>
                        <span className="text-gray-400">Konu:</span>{' '}
                        <span className="font-medium text-gray-700">{ticket.category.icon} {ticket.category.name}</span>
                      </span>
                    )}
                    {ticket.subject && (
                      <span>
                        <span className="text-gray-400">Alt konu:</span>{' '}
                        <span className="font-medium text-gray-700">{ticket.subject.name}</span>
                      </span>
                    )}
                    <span className="text-gray-400">{formatDate(ticket.createdAt)}</span>
                  </div>
                </div>

                {/* Sağ: onay/red butonları */}
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => navigate(`/itsm/${ticket.id}`)}
                    className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition"
                  >
                    Detay
                  </button>
                  <button
                    onClick={() => handleApprove(ticket)}
                    disabled={approvingId === ticket.id}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition"
                  >
                    {approvingId === ticket.id ? 'Onaylanıyor...' : 'Onayla'}
                  </button>
                  <button
                    onClick={() => setRejectTarget(ticket)}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition"
                  >
                    Reddet
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Red Modalı */}
      {rejectTarget && (
        <RejectModal
          ticket={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onRejected={handleRejected}
        />
      )}
    </div>
  );
}
