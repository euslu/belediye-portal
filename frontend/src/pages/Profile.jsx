import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || '';

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

const STATUS_TR    = { OPEN: 'Açık', ASSIGNED: 'Atandı', IN_PROGRESS: 'İşlemde', RESOLVED: 'Çözüldü', CLOSED: 'Kapalı', PENDING_APPROVAL: 'Onay Bekl.', REJECTED: 'Reddedildi' };
const PRIORITY_TR  = { LOW: 'Düşük', MEDIUM: 'Orta', HIGH: 'Yüksek', CRITICAL: 'Kritik' };
const STATUS_COLOR = {
  OPEN:             'bg-blue-100 text-blue-700',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
  ASSIGNED:         'bg-purple-100 text-purple-700',
  IN_PROGRESS:      'bg-yellow-100 text-yellow-700',
  RESOLVED:         'bg-green-100 text-green-700',
  CLOSED:           'bg-gray-100 text-gray-500',
  REJECTED:         'bg-red-100 text-red-700',
};

function maskPhone(phone) {
  if (!phone) return null;
  const p = phone.replace(/\D/g, '');
  if (p.length === 10) return `0${p.slice(0, 3)} XXX XX ${p.slice(-2)}`;
  if (p.length === 11) return `${p.slice(0, 4)} XXX XX ${p.slice(-2)}`;
  return phone;
}

export default function Profile() {
  const { user: authUser } = useAuth();
  const [adUser,          setAdUser]          = useState(null);
  const [createdTickets,  setCreatedTickets]  = useState([]);
  const [assignedTickets, setAssignedTickets] = useState([]);
  const [loading,         setLoading]         = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/users/me`,               { headers: authHeaders() }).then(r => r.ok ? r.json() : null),
      fetch(`${API}/api/tickets?createdBy=me`,   { headers: authHeaders() }).then(r => r.json()),
      fetch(`${API}/api/tickets?assignedTo=me`,  { headers: authHeaders() }).then(r => r.json()),
    ])
      .then(([adData, created, assigned]) => {
        setAdUser(adData);
        setCreatedTickets(Array.isArray(created) ? created : []);
        setAssignedTickets(Array.isArray(assigned) ? assigned : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const user = adUser || authUser;

  const openCreated   = createdTickets.filter(t => !['RESOLVED', 'CLOSED', 'REJECTED'].includes(t.status)).length;
  const resolvedCount = createdTickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status)).length;

  const initials = user?.displayName
    ? user.displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : (user?.username?.[0] || '?').toUpperCase();

  const roleLabel = { admin: 'Yönetici', manager: 'Müdür', user: 'Kullanıcı' }[user?.role] || 'Kullanıcı';
  const roleColor = { admin: 'bg-red-100 text-red-700', manager: 'bg-purple-100 text-purple-700', user: 'bg-gray-100 text-gray-600' }[user?.role] || 'bg-gray-100 text-gray-600';

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">

      {/* ── Üst Kart: Kimlik ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-lg font-bold text-gray-800">{user?.displayName}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleColor}`}>{roleLabel}</span>
            </div>
            {user?.directorate && (
              <p className="text-sm text-indigo-600 font-medium mt-0.5">{user.directorate}</p>
            )}
            <p className="text-sm text-gray-500 mt-0.5">{user?.department || '—'}</p>
            {user?.title && <p className="text-xs text-gray-400 mt-0.5">{user.title}</p>}
          </div>
        </div>

        {/* İletişim bilgileri */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ContactRow icon="📧" label="E-posta"
            value={user?.email
              ? <a href={`mailto:${user.email}`} className="text-indigo-600 hover:underline">{user.email}</a>
              : '—'}
          />
          <ContactRow icon="📞" label="GSM"
            value={adUser?.phone ? maskPhone(adUser.phone) : '—'}
          />
          <ContactRow icon="☎️" label="Dahili"
            value={adUser?.ipPhone || '—'}
          />
          <ContactRow icon="🏢" label="Ofis / Lokasyon"
            value={adUser?.office || adUser?.city || '—'}
          />
          <ContactRow icon="🪪" label="Sicil No"
            value={adUser?.employeeNumber || '—'}
          />
          <ContactRow icon="👤" label="AD Hesabı"
            value={
              <span className="flex items-center gap-1.5">
                <span className="font-mono text-sm">{user?.username}</span>
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" title="Aktif" />
                <span className="text-xs text-green-600">Aktif</span>
              </span>
            }
          />
        </div>
      </div>

      {/* ── İki Kolon ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Sol: İstatistikler */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">İstatistiklerim</h2>
          <div className="space-y-3">
            <StatRow icon="📋" label="Açtığım Talepler"   value={loading ? '…' : createdTickets.length}  color="blue" />
            <StatRow icon="✅" label="Üzerime Atanan"      value={loading ? '…' : assignedTickets.length} color="purple" />
            <StatRow icon="🔓" label="Açık Talepler"       value={loading ? '…' : openCreated}            color="amber" />
            <StatRow icon="🏁" label="Çözülen"             value={loading ? '…' : resolvedCount}          color="green" />
            <StatRow icon="💻" label="Kayıtlı Cihazlarım"  value={loading ? '…' : (adUser?._count?.devices ?? '—')} color="indigo" />
          </div>
        </div>

        {/* Sağ: Gruplar */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Grup Üyeliklerim</h2>
          {adUser?.groups?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {adUser.groups.map(g => (
                <span key={g.group.id}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium
                    ${g.role === 'leader' ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300' : 'bg-gray-100 text-gray-600'}`}
                >
                  {g.group.name}
                  {g.role === 'leader' && <span className="ml-1 opacity-70">★</span>}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Grup üyeliği yok</p>
          )}

          {/* JWT'deki AD grupları */}
          {authUser?.groups?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2">AD Grupları</p>
              <div className="flex flex-wrap gap-1.5">
                {authUser.groups.map(g => (
                  <span key={g} className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{g}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── İstatistik kartları (4'lü grid) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat label="Oluşturulan" value={loading ? '…' : createdTickets.length}  color="blue" />
        <MiniStat label="Atanan"      value={loading ? '…' : assignedTickets.length} color="purple" />
        <MiniStat label="Açık"        value={loading ? '…' : openCreated}            color="yellow" />
        <MiniStat label="Çözülen"     value={loading ? '…' : resolvedCount}          color="green" />
      </div>

      {/* ── Biletler ── */}
      {createdTickets.slice(0, 5).length > 0 && (
        <TicketTable title="Son Oluşturduğum Talepler" tickets={createdTickets.slice(0, 5)} />
      )}
      {assignedTickets.slice(0, 5).length > 0 && (
        <TicketTable title="Üzerime Atanan Talepler"   tickets={assignedTickets.slice(0, 5)} />
      )}
      {!loading && createdTickets.length === 0 && assignedTickets.length === 0 && (
        <div className="text-center py-12 text-sm text-gray-400">Henüz hiç talebiniz yok.</div>
      )}
    </div>
  );
}

function ContactRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-base w-5 text-center shrink-0">{icon}</span>
      <div>
        <p className="text-[11px] text-gray-400">{label}</p>
        <div className="text-sm font-medium text-gray-800">{value}</div>
      </div>
    </div>
  );
}

function StatRow({ icon, label, value, color }) {
  const cls = { blue: 'text-blue-600', purple: 'text-purple-600', amber: 'text-amber-600', green: 'text-green-600', indigo: 'text-indigo-600' }[color] || 'text-gray-600';
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="flex items-center gap-2 text-sm text-gray-600">
        <span>{icon}</span> {label}
      </span>
      <span className={`text-sm font-bold ${cls}`}>{value}</span>
    </div>
  );
}

function MiniStat({ label, value, color }) {
  const cls = { blue: 'bg-blue-50 text-blue-700', purple: 'bg-purple-50 text-purple-700', yellow: 'bg-yellow-50 text-yellow-700', green: 'bg-green-50 text-green-700' }[color] || 'bg-gray-50 text-gray-700';
  return (
    <div className={`rounded-xl p-4 ${cls}`}>
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
              <td className="px-5 py-2.5 text-xs text-gray-500">{PRIORITY_TR[t.priority] || t.priority}</td>
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
