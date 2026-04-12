import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTickets } from '../api/tickets';
import { StatusBadge, PriorityBadge } from '../components/badges';

const TABS = [
  { key: 'assigned', label: 'Bana Atananlar',   icon: '📋' },
  { key: 'created',  label: 'Açtıklarım',        icon: '📝' },
  { key: 'approvals',label: 'Bekleyen Onaylar',  icon: '⏳' },
];

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function slaStatus(dueDate, status) {
  if (!dueDate || status === 'CLOSED' || status === 'RESOLVED') return null;
  const now = Date.now();
  const due = new Date(dueDate).getTime();
  if (due < now)                      return 'breached';
  if (due - now < 2 * 60 * 60 * 1000) return 'warning';
  return null;
}

function TicketTable({ tickets, loading, error }) {
  const navigate = useNavigate();

  if (loading) return <div className="py-16 text-center text-sm text-gray-400">Yükleniyor...</div>;
  if (error)   return <div className="py-8 text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4">{error}</div>;
  if (tickets.length === 0) return (
    <div className="py-20 text-center">
      <p className="text-4xl mb-3">📭</p>
      <p className="text-sm text-gray-400">Gösterilecek kayıt yok.</p>
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {['#', 'Başlık', 'Öncelik', 'Durum', 'Son Tarih', 'Oluşturulma'].map((h) => (
              <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {tickets.map((t) => {
            const sla = slaStatus(t.dueDate, t.status);
            const rowCls = sla === 'breached' ? 'bg-red-50 hover:bg-red-100'
                         : sla === 'warning'  ? 'bg-yellow-50 hover:bg-yellow-100'
                         : 'hover:bg-gray-50';
            return (
              <tr
                key={t.id}
                onClick={() => navigate(`/itsm/${t.id}`)}
                className={`cursor-pointer transition ${rowCls}`}
              >
                <td className="px-4 py-3 text-gray-400 font-mono">#{t.id}</td>
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-800 line-clamp-1">{t.title}</span>
                  {t.category && <span className="block text-xs text-gray-400">{t.category.name}</span>}
                </td>
                <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                <td className="px-4 py-3">
                  {t.dueDate ? (
                    <span className={
                      sla === 'breached' ? 'text-red-600 font-semibold' :
                      sla === 'warning'  ? 'text-yellow-600 font-semibold' :
                      'text-gray-600'
                    }>
                      {formatDate(t.dueDate)}
                      {sla === 'breached' && <span className="ml-1 text-xs">⚠ SLA</span>}
                      {sla === 'warning'  && <span className="ml-1 text-xs">⏱</span>}
                    </span>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-gray-400">{formatDate(t.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function MyTasks() {
  const navigate = useNavigate();
  const [tab, setTab]             = useState('assigned');
  const [assigned, setAssigned]   = useState([]);
  const [created, setCreated]     = useState([]);
  const [loadingA, setLoadingA]   = useState(true);
  const [loadingC, setLoadingC]   = useState(true);
  const [errorA, setErrorA]       = useState('');
  const [errorC, setErrorC]       = useState('');

  useEffect(() => {
    setLoadingA(true);
    getTickets({ assignedTo: 'me' })
      .then(setAssigned)
      .catch((e) => setErrorA(e.message))
      .finally(() => setLoadingA(false));

    setLoadingC(true);
    getTickets({ createdBy: 'me' })
      .then(setCreated)
      .catch((e) => setErrorC(e.message))
      .finally(() => setLoadingC(false));
  }, []);

  const counts = {
    assigned:  loadingA ? null : assigned.length,
    created:   loadingC ? null : created.length,
    approvals: 0,
  };

  return (
    <div className="p-8 space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Görevlerim</h1>
          <p className="text-xs text-gray-400 mt-0.5">Size atanan ve açtığınız talepler</p>
        </div>
        <button
          onClick={() => navigate('/itsm/new')}
          className="portal-cta-btn portal-cta-btn--blue"
        >
          <span className="text-lg leading-none">+</span> Yeni Talep
        </button>
      </div>

      {/* Özet kartlar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Bana Atanan',      value: loadingA ? '…' : assigned.filter(t => !['RESOLVED','CLOSED'].includes(t.status)).length, color: 'blue'   },
          { label: 'Açık Taleplerim',  value: loadingC ? '…' : created.filter(t  => !['RESOLVED','CLOSED'].includes(t.status)).length,  color: 'indigo' },
          { label: 'Bekleyen Onaylar', value: 0,                                                                                           color: 'gray'   },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <p className="text-xs text-gray-400">{label}</p>
            <p className={`text-2xl font-bold mt-1 text-${color}-700`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Sekmeler */}
      <div className="flex gap-2">
        {TABS.map(({ key, label, icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`portal-pill-btn text-sm ${active ? 'portal-pill-btn--active' : ''}`}
            >
              <span>{icon}</span>
              {label}
              {counts[key] !== null && counts[key] > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold min-w-[20px] text-center
                  ${active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {counts[key]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* İçerik */}
      {tab === 'assigned' && (
        <TicketTable tickets={assigned} loading={loadingA} error={errorA} />
      )}
      {tab === 'created' && (
        <TicketTable tickets={created} loading={loadingC} error={errorC} />
      )}
      {tab === 'approvals' && (
        <div className="py-20 text-center">
          <p className="text-4xl mb-3">🔒</p>
          <p className="text-sm font-medium text-gray-600">Onay akışı henüz aktif değil</p>
          <p className="text-xs text-gray-400 mt-1">Bu özellik yakında eklenecektir.</p>
        </div>
      )}
    </div>
  );
}
