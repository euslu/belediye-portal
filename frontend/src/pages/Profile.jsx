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

      {/* ── Hero Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1a2e23 0%, #2d5a3d 100%)',
        borderRadius: 16, padding: '24px 28px',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%', background: '#43DC80',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 700, color: '#1a2e23', flexShrink: 0,
        }}>{initials}</div>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Hoş geldiniz</div>
          <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>{user?.displayName}</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>
            {[user?.title, (user?.directorate || '').replace(' Dairesi Başkanlığı', '')]
              .filter(Boolean).join(' · ')}
            {user?.city ? ` · 📍 ${user.city}` : ''}
          </div>
        </div>
      </div>

      {/* ── İletişim & Kimlik Kartları ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#43DC80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,7 12,13 2,7"/></svg>, label: 'E-posta', value: user?.email || '—', link: user?.email ? `mailto:${user.email}` : null },
          { svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#43DC80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg>, label: 'GSM', value: adUser?.phone ? maskPhone(adUser.phone) : '—' },
          { svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#43DC80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.96.35 1.9.67 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.32 1.85.55 2.81.67A2 2 0 0122 16.92z"/></svg>, label: 'Dahili', value: adUser?.ipPhone || '—' },
          { svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#43DC80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="12"/></svg>, label: 'Sicil No', value: adUser?.employeeNumber || '—' },
          { svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#43DC80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>, label: 'Lokasyon', value: adUser?.office || adUser?.city || '—' },
          { svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#43DC80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, label: 'AD Hesabı', value: user?.username || '—' },
        ].map((item, i) => (
          <div key={i} style={{
            background: '#fff', border: '1px solid #e8ede9', borderRadius: 12,
            padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#f0fdf4', display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0,
            }}>{item.svg}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, color: '#9aa8a0', fontWeight: 500 }}>{item.label}</div>
              {item.link ? (
                <a href={item.link} style={{ fontSize: 13, fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}>{item.value}</a>
              ) : (
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2e23', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.value}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── İstatistiklerim ── */}
      <div style={{ background: '#fff', border: '1px solid #e8ede9', borderRadius: 14, padding: '18px 22px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a2e23', margin: '0 0 14px' }}>İstatistiklerim</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {[
            { label: 'Açtığım Talepler',   value: loading ? '…' : createdTickets.length,  color: '#3b82f6' },
            { label: 'Üzerime Atanan',      value: loading ? '…' : assignedTickets.length, color: '#8b5cf6' },
            { label: 'Açık Talepler',        value: loading ? '…' : openCreated,            color: '#f59e0b' },
            { label: 'Çözülen',             value: loading ? '…' : resolvedCount,          color: '#10b981' },
            { label: 'Cihazlarım',           value: loading ? '…' : (adUser?._count?.devices ?? '—'), color: '#6366f1' },
          ].map((s, i) => (
            <div key={i} style={{
              textAlign: 'center', padding: '12px 8px', borderRadius: 10,
              background: s.color + '0d', border: `1px solid ${s.color}22`,
            }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
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
