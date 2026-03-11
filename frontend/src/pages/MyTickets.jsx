import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getTickets } from '../api/tickets';
import { TypeBadge } from '../components/badges';

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
    <div className="p-6 max-w-5xl mx-auto">
      {/* Başlık */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Taleplerim</h1>
          <p className="text-sm text-gray-400 mt-0.5">Açtığınız tüm talep ve arıza bildirimleri</p>
        </div>
        <button
          onClick={() => navigate('/itsm/new')}
          className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-indigo-700 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Yeni Talep
        </button>
      </div>

      {/* Filtre sekmeleri */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5
              ${activeTab === tab.key
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab.label}
            {!loading && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 leading-none font-semibold
                ${activeTab === tab.key ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
                {tabCount(tab.key)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tablo */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Yükleniyor...</div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">Bu kategoride talep bulunamadı</div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
