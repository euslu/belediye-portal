import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge, PriorityBadge } from '../../components/badges';
import Button from '../../components/ui/Button';
import DataTableShell from '../../components/ui/DataTableShell';

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
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none resize-none"
              onFocus={e => e.target.style.borderColor = '#34d399'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose}
              className="portal-pill-btn"
              style={{ fontSize: 13, padding: '8px 18px' }}>
              İptal
            </button>
            <button type="submit" disabled={saving || !reason.trim()}
              className="portal-cta-btn portal-cta-btn--red"
              style={{ fontSize: 13, padding: '8px 18px', opacity: (saving || !reason.trim()) ? 0.5 : 1 }}>
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

  useEffect(() => { load(); }, []);

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

  const sistemRol = user?.sistemRol || user?.role;
  if (!['admin', 'manager', 'daire_baskani', 'mudur'].includes(sistemRol) && !['admin', 'manager'].includes(user?.role)) {
    return <div className="p-8 text-sm text-red-500">Bu sayfaya erişim yetkiniz yok.</div>;
  }

  return (
    <>
      <DataTableShell
        icon={<i className="bi bi-hourglass-split text-xl" />}
        title="Onay Bekleyen Talepler"
        description="Onayınızı bekleyen talep ve başvuruları bu sayfadan yönetin."
        meta={loading ? 'Yükleniyor...' : `${tickets.length} talep`}
        actions={(
          <Button color="gray" onClick={load}>
            <i className="bi bi-arrow-clockwise mr-2" />
            Yenile
          </Button>
        )}
        loading={loading}
        error={error}
        isEmpty={tickets.length === 0}
        emptyIcon={<i className="bi bi-check-circle" />}
        emptyTitle="Onay bekleyen talep yok"
        emptyDescription="Tüm talepler işlendi."
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-400 font-semibold uppercase tracking-wide">
              <th className="text-left px-4 py-3 w-12">#</th>
              <th className="text-left px-4 py-3">Başlık</th>
              <th className="text-left px-4 py-3 w-36">Başvuran</th>
              <th className="text-left px-4 py-3 w-28">Öncelik</th>
              <th className="text-left px-4 py-3 w-28">Durum</th>
              <th className="text-left px-4 py-3 w-28">Tarih</th>
              <th className="text-left px-4 py-3 w-48">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {tickets.map(ticket => (
              <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{ticket.id}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => navigate(`/itsm/${ticket.id}`)}
                    className="font-medium text-gray-800 hover:text-indigo-600 transition-colors text-left line-clamp-1"
                  >
                    {ticket.title}
                  </button>
                  {ticket.category && (
                    <p className="text-xs text-gray-400 mt-0.5">{ticket.category.icon} {ticket.category.name}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-medium text-gray-700 block line-clamp-1">
                    {ticket.createdBy?.displayName || '—'}
                  </span>
                  {ticket.createdBy?.directorate && (
                    <span className="text-xs text-gray-400 block line-clamp-1">{ticket.createdBy.directorate}</span>
                  )}
                </td>
                <td className="px-4 py-3"><PriorityBadge priority={ticket.priority} /></td>
                <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
                <td className="px-4 py-3 text-xs text-gray-400">{formatDate(ticket.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => navigate(`/itsm/${ticket.id}`)}
                      className="portal-pill-btn"
                      style={{ fontSize: 11, padding: '4px 10px' }}
                    >
                      Detay
                    </button>
                    <button
                      onClick={() => handleApprove(ticket)}
                      disabled={approvingId === ticket.id}
                      className="portal-cta-btn portal-cta-btn--green"
                      style={{ fontSize: 11, padding: '4px 10px', opacity: approvingId === ticket.id ? 0.5 : 1 }}
                    >
                      {approvingId === ticket.id ? '...' : 'Onayla'}
                    </button>
                    <button
                      onClick={() => setRejectTarget(ticket)}
                      className="portal-cta-btn portal-cta-btn--red"
                      style={{ fontSize: 11, padding: '4px 10px' }}
                    >
                      Reddet
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTableShell>

      {rejectTarget && (
        <RejectModal
          ticket={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onRejected={handleRejected}
        />
      )}
    </>
  );
}
