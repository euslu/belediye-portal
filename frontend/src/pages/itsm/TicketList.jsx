import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTickets } from '../../api/tickets';
import { StatusBadge, PriorityBadge, TypeBadge, SourceBadge } from '../../components/badges';

const API = import.meta.env.VITE_API_URL || '';
function authHeaders() { return { Authorization: `Bearer ${localStorage.getItem('token')}` }; }

const STATUSES   = ['', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PRIORITIES = ['', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const SOURCES    = ['', 'PORTAL', 'EMAIL', 'PHONE', 'IN_PERSON', 'API'];
const STATUS_LABELS   = { '': 'Tüm Durumlar', OPEN: 'Açık', ASSIGNED: 'Atandı', IN_PROGRESS: 'İşlemde', RESOLVED: 'Çözüldü', CLOSED: 'Kapalı' };
const PRIORITY_LABELS = { '': 'Tüm Öncelikler', LOW: 'Düşük', MEDIUM: 'Orta', HIGH: 'Yüksek', CRITICAL: 'Kritik' };
const SOURCE_LABELS   = { '': 'Tüm Kaynaklar', PORTAL: 'Portal', EMAIL: 'E-posta', PHONE: 'Telefon', IN_PERSON: 'Yüz yüze', API: 'API' };

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

function rowClass(sla) {
  if (sla === 'breached') return 'bg-red-50 hover:bg-red-100';
  if (sla === 'warning')  return 'bg-yellow-50 hover:bg-yellow-100';
  return 'hover:bg-gray-50';
}

// Daire adını kısalt: "Bilgi İşlem Dairesi Başkanlığı" → "Bilgi İşlem DB"
function shortDir(name) {
  if (!name) return '';
  return name
    .replace(' Dairesi Başkanlığı', ' DB')
    .replace(' Daire Başkanlığı', ' DB');
}

export default function TicketList() {
  const navigate = useNavigate();
  const [tickets, setTickets]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [filters, setFilters]           = useState({ status: '', priority: '', directorate: '', source: '' });
  const [directorates, setDirectorates] = useState([]);

  // Daire başkanlıklarını çek (filtre dropdown için)
  useEffect(() => {
    fetch(`${API}/api/users/directorates`, { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : [])
      .then(setDirectorates)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    const active = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    getTickets(active)
      .then(setTickets)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filters]);

  return (
    <div className="p-8 space-y-5">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Destek Talepleri</h1>
          <p className="text-xs text-gray-400 mt-0.5">{tickets.length} kayıt</p>
        </div>
        <button
          onClick={() => navigate('/itsm/new')}
          className="portal-cta-btn portal-cta-btn--blue"
        >
          <span className="text-lg leading-none">+</span> Yeni Talep
        </button>
      </div>

      {/* Filtreler */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select
          value={filters.priority}
          onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
        </select>
        <select
          value={filters.directorate}
          onChange={(e) => setFilters((f) => ({ ...f, directorate: e.target.value }))}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="">Tüm Daireler</option>
          {directorates.map((d) => (
            <option key={d.name} value={d.name}>{d.name}</option>
          ))}
        </select>
        <select
          value={filters.source}
          onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value }))}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          {SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
        </select>
      </div>

      {/* SLA açıklaması */}
      <div className="flex gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-100 border border-red-300 inline-block" />
          SLA ihlali
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-yellow-100 border border-yellow-300 inline-block" />
          2 saat içinde dolacak
        </span>
      </div>

      {/* Tablo */}
      {loading ? (
        <div className="text-sm text-gray-400 py-10 text-center">Yükleniyor...</div>
      ) : error ? (
        <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>
      ) : tickets.length === 0 ? (
        <div className="text-sm text-gray-400 py-10 text-center">Talep bulunamadı.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['#', 'Başlık', 'Daire', 'Lokasyon', 'Kaynak', 'Öncelik', 'Durum', 'Son Tarih'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.map((t) => {
                const sla      = slaStatus(t.dueDate, t.status);
                const dir      = t.createdBy?.directorate || '';
                const location = t.createdBy?.office || t.createdBy?.city || '';
                return (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`/itsm/${t.id}`)}
                    className={`cursor-pointer transition ${rowClass(sla)}`}
                  >
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">#{t.id}</td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <span className="font-medium text-gray-800 line-clamp-1">{t.title}</span>
                      {t.category && <span className="block text-xs text-gray-400">{t.category.name}</span>}
                    </td>
                    <td className="px-4 py-3 max-w-[140px]">
                      {dir ? (
                        <span
                          title={dir}
                          className="block text-xs text-gray-600 truncate"
                        >
                          {shortDir(dir)}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 max-w-[120px]">
                      {location ? (
                        <span className="text-xs text-gray-500 truncate block">{location}</span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3"><SourceBadge source={t.source} /></td>
                    <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-3">
                      {t.dueDate ? (
                        <span className={
                          sla === 'breached' ? 'text-red-600 font-semibold text-xs' :
                          sla === 'warning'  ? 'text-yellow-600 font-semibold text-xs' :
                          'text-gray-600 text-xs'
                        }>
                          {formatDate(t.dueDate)}
                          {sla === 'breached' && <span className="ml-1">⚠</span>}
                          {sla === 'warning'  && <span className="ml-1">⏱</span>}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
