import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTickets } from '../api/tickets';
import { StatusBadge, PriorityBadge } from '../components/badges';
import Button from '../components/ui/Button';
import DataTableShell from '../components/ui/DataTableShell';
import Surface from '../components/ui/Surface';

const TABS = [
  { key: 'assigned', label: 'Bana Atananlar',   icon: '📋' },
  { key: 'created',  label: 'Açtıklarım',        icon: '📝' },
  { key: 'approvals',label: 'Bekleyen Onaylar',  icon: '⏳' },
];

const SUMMARY_COLORS = {
  blue: 'text-blue-700',
  indigo: 'text-indigo-700',
  gray: 'text-gray-700',
};

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

  return (
    <div className="overflow-hidden">
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

  const activeItems = assigned.filter(t => !['RESOLVED', 'CLOSED'].includes(t.status)).length;
  const createdItems = created.filter(t => !['RESOLVED', 'CLOSED'].includes(t.status)).length;
  const activeError = tab === 'assigned' ? errorA : tab === 'created' ? errorC : '';
  const activeLoading = tab === 'assigned' ? loadingA : tab === 'created' ? loadingC : false;
  const activeTickets = tab === 'assigned' ? assigned : tab === 'created' ? created : [];

  return (
    <DataTableShell
      icon={<i className="bi bi-check2-square text-xl" />}
      title="Görevlerim"
      description="Size atanan ve sizin açtığınız kayıtları aynı çalışma alanında izleyin."
      meta={`${assigned.length + created.length} toplam kayıt`}
      actions={(
        <Button color="blue" onClick={() => navigate('/itsm/new')}>
          <i className="bi bi-plus-lg mr-2" />
          Yeni Talep
        </Button>
      )}
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
      getTabCount={(key) => counts[key]}
      loading={activeLoading}
      error={activeError}
      isEmpty={tab !== 'approvals' && activeTickets.length === 0}
      emptyIcon={<i className="bi bi-list-task" />}
      emptyTitle="Gösterilecek kayıt yok"
      emptyDescription="Bu filtre için henüz görev veya talep bulunmuyor."
    >
      <div className="p-4">
        <div className="grid grid-cols-3 gap-4 mb-4">
        {[
          { label: 'Bana Atanan',      value: loadingA ? '…' : activeItems, color: 'blue'   },
          { label: 'Açık Taleplerim',  value: loadingC ? '…' : createdItems,  color: 'indigo' },
          { label: 'Bekleyen Onaylar', value: 0,                                                                                           color: 'gray'   },
        ].map(({ label, value, color }) => (
          <Surface key={label} className="px-5 py-4">
            <p className="text-xs text-gray-400">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${SUMMARY_COLORS[color] || 'text-gray-700'}`}>{value}</p>
          </Surface>
        ))}
        </div>

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
    </DataTableShell>
  );
}
