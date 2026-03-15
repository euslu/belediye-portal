import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || '';

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

const STATUS_TR   = { OPEN: 'Açık', ASSIGNED: 'Atandı', IN_PROGRESS: 'İşlemde', RESOLVED: 'Çözüldü', CLOSED: 'Kapalı' };
const PRIORITY_TR = { LOW: 'Düşük', MEDIUM: 'Orta', HIGH: 'Yüksek', CRITICAL: 'Kritik' };

const STATUS_COLOR = {
  OPEN:        'bg-blue-100 text-blue-700',
  ASSIGNED:    'bg-purple-100 text-purple-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  RESOLVED:    'bg-green-100 text-green-700',
  CLOSED:      'bg-gray-100 text-gray-500',
};

export default function Profile() {
  const { user } = useAuth();
  const [createdTickets,  setCreatedTickets]  = useState([]);
  const [assignedTickets, setAssignedTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/tickets?createdBy=me`, { headers: authHeaders() }).then(r => r.json()),
      fetch(`${API}/api/tickets?assignedTo=me`, { headers: authHeaders() }).then(r => r.json()),
    ])
      .then(([created, assigned]) => {
        setCreatedTickets(Array.isArray(created) ? created : []);
        setAssignedTickets(Array.isArray(assigned) ? assigned : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openCreated   = createdTickets.filter(t => !['RESOLVED','CLOSED'].includes(t.status)).length;
  const resolvedCount = createdTickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
  const lastCreated   = createdTickets.slice(0, 5);
  const lastAssigned  = assignedTickets.slice(0, 5);

  const initials = user?.displayName
    ? user.displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : (user?.username?.[0] || '?').toUpperCase();

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">

      {/* Profil Kartı */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-start gap-5">
        <div className="w-16 h-16 rounded-full bg-blue-700 flex items-center justify-center text-white text-xl font-bold shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-800">{user?.displayName}</h1>
          <p className="text-sm text-gray-500">{user?.title || '—'}</p>
          <p className="text-xs text-gray-400 mt-0.5">{user?.department || '—'}</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${user?.role === 'admin' ? 'bg-red-100 text-red-700' : user?.role === 'manager' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
          {user?.role === 'admin' ? 'Yönetici' : user?.role === 'manager' ? 'Müdür' : 'Kullanıcı'}
        </span>
      </div>

      {/* Bilgiler */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Hesap Bilgileri</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow label="Kullanıcı Adı" value={user?.username} />
          <InfoRow label="E-posta"
            value={user?.email
              ? <a href={`mailto:${user.email}`} className="text-blue-600 hover:underline">{user.email}</a>
              : '—'}
          />
          <InfoRow label="Departman"    value={user?.department || '—'} />
          <InfoRow label="Unvan"        value={user?.title || '—'} />
        </dl>

        {user?.groups?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-2">AD Grupları</p>
            <div className="flex flex-wrap gap-1.5">
              {user.groups.map(g => (
                <span key={g} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{g}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Oluşturulan" value={loading ? '…' : createdTickets.length}  color="blue" />
        <StatCard label="Atanan"      value={loading ? '…' : assignedTickets.length} color="purple" />
        <StatCard label="Açık"        value={loading ? '…' : openCreated}            color="yellow" />
        <StatCard label="Çözülen"     value={loading ? '…' : resolvedCount}          color="green" />
      </div>

      {/* Son talepler — oluşturduklarım */}
      {lastCreated.length > 0 && (
        <TicketTable title="Son Oluşturduğum Talepler" tickets={lastCreated} />
      )}

      {/* Son talepler — atananlar */}
      {lastAssigned.length > 0 && (
        <TicketTable title="Üzerime Atanan Talepler" tickets={lastAssigned} />
      )}

      {!loading && createdTickets.length === 0 && assignedTickets.length === 0 && (
        <div className="text-center py-12 text-sm text-gray-400">Henüz hiç talebiniz yok.</div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-gray-400 mb-0.5">{label}</dt>
      <dd className="text-sm font-medium text-gray-800">{value}</dd>
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    green:  'bg-green-50 text-green-700',
  };
  return (
    <div className={`rounded-xl p-4 ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-0.5 opacity-75">{label}</p>
    </div>
  );
}

function TicketTable({ title, tickets }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-xs text-gray-400">
            <th className="px-5 py-2 text-left font-medium">#</th>
            <th className="px-5 py-2 text-left font-medium">Konu</th>
            <th className="px-5 py-2 text-left font-medium">Durum</th>
            <th className="px-5 py-2 text-left font-medium">Öncelik</th>
            <th className="px-5 py-2 text-left font-medium">Tarih</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map(t => (
            <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
              <td className="px-5 py-2.5 text-gray-400 text-xs">#{t.id}</td>
              <td className="px-5 py-2.5">
                <Link to={`/itsm/${t.id}`} className="text-blue-600 hover:underline font-medium truncate max-w-xs block">
                  {t.title}
                </Link>
              </td>
              <td className="px-5 py-2.5">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[t.status] || 'bg-gray-100 text-gray-500'}`}>
                  {STATUS_TR[t.status] || t.status}
                </span>
              </td>
              <td className="px-5 py-2.5 text-xs text-gray-500">
                {PRIORITY_TR[t.priority] || t.priority}
              </td>
              <td className="px-5 py-2.5 text-xs text-gray-400">
                {new Date(t.createdAt).toLocaleDateString('tr-TR')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
