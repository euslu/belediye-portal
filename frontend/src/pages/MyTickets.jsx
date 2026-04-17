import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getTickets } from '../api/tickets';
import { TypeBadge } from '../components/badges';
import Button from '../components/ui/Button';
import DataTableShell from '../components/ui/DataTableShell';

const STATUS_CONFIG = {
  OPEN:             { label: 'Açık',            dot: 'bg-blue-400'   },
  PENDING_APPROVAL: { label: 'Onay Bekliyor',   dot: 'bg-amber-400'  },
  ASSIGNED:         { label: 'İşleme Alındı',   dot: 'bg-indigo-400' },
  IN_PROGRESS:      { label: 'Devam Ediyor',    dot: 'bg-orange-400' },
  RESOLVED:         { label: 'Çözüldü',         dot: 'bg-green-500'  },
  REJECTED:         { label: 'Reddedildi',      dot: 'bg-red-500'    },
  CLOSED:           { label: 'Kapatıldı',       dot: 'bg-gray-400'   },
};

function StatusDot({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, dot: 'bg-gray-400' };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700">
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

const TABS = [
  { key: 'all',      label: 'Tümü' },
  { key: 'active',   label: 'Aktif' },
  { key: 'resolved', label: 'Çözüldü' },
  { key: 'rejected', label: 'Reddedildi' },
];

const ACTIVE_STATUSES = ['OPEN', 'PENDING_APPROVAL', 'ASSIGNED', 'IN_PROGRESS'];

function filterTickets(tickets, tab) {
  if (tab === 'all')      return tickets;
  if (tab === 'active')   return tickets.filter(t => ACTIVE_STATUSES.includes(t.status));
  if (tab === 'resolved') return tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED');
  if (tab === 'rejected') return tickets.filter(t => t.status === 'REJECTED');
  return tickets;
}

export default function MyTickets() {
  const [tickets, setTickets]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    getTickets({ createdBy: 'me' })
      .then(setTickets)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const visible = filterTickets(tickets, activeTab);

  const tabCount = (tab) => filterTickets(tickets, tab).length;

  return (
    <DataTableShell
      icon={<i className="bi bi-inboxes text-xl" />}
      title="Taleplerim"
      description="Açtığınız tüm talep ve arıza bildirimlerini tek listede takip edin."
      meta={`${tickets.length} kayıt`}
      actions={(
        <Button color="violet" onClick={() => navigate('/itsm/new')}>
          <i className="bi bi-plus-lg mr-2" />
          Yeni Talep
        </Button>
      )}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      getTabCount={(tab) => !loading ? tabCount(tab) : null}
      loading={loading}
      error=""
      isEmpty={visible.length === 0}
      emptyIcon={<i className="bi bi-inbox" />}
      emptyTitle="Bu kategoride talep bulunamadı"
      emptyDescription="Filtreyi değiştirerek diğer taleplerinizi görüntüleyebilirsiniz."
    >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-400 font-semibold uppercase tracking-wide">
                <th className="text-left px-4 py-3 w-12">#</th>
                <th className="text-left px-4 py-3">Başlık</th>
                <th className="text-left px-4 py-3 w-28">Tip</th>
                <th className="text-left px-4 py-3 w-36">Durum</th>
                <th className="text-left px-4 py-3 w-28">Tarih</th>
                <th className="text-left px-4 py-3 w-16">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visible.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{t.id}</td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/itsm/${t.id}`}
                      className="font-medium text-gray-800 hover:text-indigo-600 transition-colors line-clamp-1"
                    >
                      {t.title}
                    </Link>
                    {t.category?.name && (
                      <p className="text-xs text-gray-400 mt-0.5">{t.category.name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge type={t.type} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusDot status={t.status} />
                    {t.status === 'REJECTED' && t.rejectedReason && (
                      <p className="text-xs text-red-400 mt-0.5 line-clamp-1">{t.rejectedReason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(t.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/itsm/${t.id}`}
                      className="text-xs text-indigo-600 hover:underline font-medium"
                    >
                      Detay
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
    </DataTableShell>
  );
}
