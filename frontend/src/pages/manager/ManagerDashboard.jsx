import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Sector,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || '';
function authHeaders() { return { Authorization: `Bearer ${localStorage.getItem('token')}` }; }

async function approveTicket(id) {
  const r = await fetch(`${API}/api/tickets/${id}/approve`, { method: 'POST', headers: authHeaders() });
  if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
}
async function rejectTicket(id, reason) {
  const r = await fetch(`${API}/api/tickets/${id}/reject`, {
    method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
}

const PERIOD_LABELS = { week: 'Bu Hafta', month: 'Bu Ay', '3months': 'Son 3 Ay' };

const STATUS_COLORS = {
  OPEN: '#6366f1', IN_PROGRESS: '#f59e0b', PENDING_APPROVAL: '#f97316',
  RESOLVED: '#22c55e', CLOSED: '#6b7280', REJECTED: '#ef4444',
};
const STATUS_LABELS = {
  OPEN: 'Açık', IN_PROGRESS: 'İşlemde', PENDING_APPROVAL: 'Onay Bekliyor',
  RESOLVED: 'Çözüldü', CLOSED: 'Kapalı', REJECTED: 'Reddedildi',
};

// ─── Özet Kart ────────────────────────────────────────────────────────────────
function SummaryCard({ label, value, sub, change, color, icon }) {
  const isPositive = change > 0;
  const isNeutral  = change === null || change === undefined;
  // İhlal/geç için düşmek iyidir, artmak kötüdür
  const invertColors = label.includes('İhlal') || label.includes('Geç');
  const good = invertColors ? !isPositive : isPositive;

  return (
    <div className={`bg-white border border-gray-100 rounded-2xl p-5 shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value ?? '—'}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
      {!isNeutral && (
        <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${good ? 'text-green-600' : 'text-red-500'}`}>
          <span>{isPositive ? '↑' : '↓'}</span>
          <span>{Math.abs(change)}% geçen döneme göre</span>
        </div>
      )}
    </div>
  );
}

// ─── Donut PieChart ───────────────────────────────────────────────────────────
function StatusDonut({ data, total }) {
  const [activeIdx, setActiveIdx] = useState(null);
  const pieData = Object.entries(data).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status, value: count, status,
  }));

  const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius - 3} outerRadius={outerRadius + 6}
          startAngle={startAngle} endAngle={endAngle} fill={fill} />
      </g>
    );
  };

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={90}
            dataKey="value" activeIndex={activeIdx} activeShape={renderActiveShape}
            onMouseEnter={(_, i) => setActiveIdx(i)} onMouseLeave={() => setActiveIdx(null)}>
            {pieData.map((entry) => (
              <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
            ))}
          </Pie>
          <Tooltip formatter={(v, n) => [v, n]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-800">{total}</p>
          <p className="text-xs text-gray-400">toplam</p>
        </div>
      </div>
    </div>
  );
}

// ─── Pending Onay Satırı ─────────────────────────────────────────────────────
function PendingRow({ ticket, onAction }) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason]         = useState('');
  const [loading, setLoading]       = useState(false);

  async function doApprove() {
    setLoading(true);
    try { await approveTicket(ticket.id); onAction(ticket.id); }
    catch (e) { alert(e.message); }
    finally { setLoading(false); }
  }
  async function doReject() {
    if (!reason.trim()) return;
    setLoading(true);
    try { await rejectTicket(ticket.id, reason); onAction(ticket.id); }
    catch (e) { alert(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <Link to={`/itsm/${ticket.id}`} className="text-sm font-medium text-gray-800 hover:text-indigo-600 truncate block">
          #{ticket.id} {ticket.title}
        </Link>
        <p className="text-xs text-gray-400">{ticket.createdBy?.displayName} · {new Date(ticket.createdAt).toLocaleDateString('tr-TR')}</p>
      </div>
      {rejectOpen ? (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Sebep..."
            className="text-xs border rounded px-2 py-1 w-32 focus:outline-none focus:ring-1 focus:ring-red-300" />
          <button onClick={doReject} disabled={loading || !reason.trim()}
            className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 disabled:opacity-50">Gönder</button>
          <button onClick={() => setRejectOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">İptal</button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={doApprove} disabled={loading}
            className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-lg hover:bg-green-100 disabled:opacity-50">
            Onayla
          </button>
          <button onClick={() => setRejectOpen(true)} disabled={loading}
            className="text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-100 disabled:opacity-50">
            Reddet
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Ana Bileşen ─────────────────────────────────────────────────────────────
export default function ManagerDashboard() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [period, setPeriod]   = useState('month');
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [pendingList, setPendingList] = useState([]);

  const load = useCallback(async (p) => {
    setLoading(true); setError('');
    try {
      const r = await fetch(`${API}/api/dashboard/manager-stats?period=${p}`, { headers: authHeaders() });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setData(d);
      setPendingList(d.pendingApprovals || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  if (!['admin', 'manager'].includes(user?.role))
    return <div className="p-8 text-sm text-gray-400">Bu sayfaya erişim yetkiniz yok.</div>;

  const title = user.role === 'admin'
    ? 'Genel Birim Performans Raporu'
    : `${user.directorate || 'Biriminiz'} — Performans Raporu`;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Başlık */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">📊 {title}</h1>
          <p className="text-sm text-gray-400 mt-0.5">Başvuru ve personel performans istatistikleri</p>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {Object.entries(PERIOD_LABELS).map(([key, label]) => (
            <button key={key} onClick={() => setPeriod(key)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition
                ${period === key ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-sm text-gray-400">Yükleniyor...</div>
      ) : error ? (
        <div className="py-12 text-center text-sm text-red-500">{error}</div>
      ) : !data ? null : (
        <>
          {/* BÖLÜM 1 — Özet Kartlar */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <SummaryCard label="Toplam Başvuru"   value={data.summary.total}            icon="📋" color="text-indigo-600" change={data.summary.totalChange} />
            <SummaryCard label="Çözülen"          value={data.summary.resolved}         icon="✅" color="text-green-600"  change={data.summary.resolvedChange}
              sub={data.summary.total > 0 ? `%${data.summary.resolvedRate} oran` : null} />
            <SummaryCard label="Ort. Çözüm Süresi" value={data.summary.avgResolutionHours !== null ? `${data.summary.avgResolutionHours}s` : '—'} icon="⏱️" color="text-purple-600" change={data.summary.avgResolutionChange} />
            <SummaryCard label="SLA İhlali"       value={data.summary.slaBreaches}      icon="🚨" color="text-red-600"    change={data.summary.slaBreachesChange} />
            <SummaryCard label="Bekleyen Onay"    value={data.summary.pendingApproval}  icon="⏳" color="text-amber-600" />
            <SummaryCard label="Aktarılan"        value={data.summary.transferred}      icon="🔄" color="text-gray-600" />
          </div>

          {/* BÖLÜM 2 — Grafikler */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Günlük trend */}
            <div className="xl:col-span-2 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Günlük Trend</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.daily} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }}
                    tickFormatter={d => { const dt = new Date(d); return `${dt.getDate()}/${dt.getMonth()+1}`; }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip labelFormatter={d => new Date(d).toLocaleDateString('tr-TR')} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="opened" name="Açılan" stroke="#6366f1" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="closed" name="Kapanan" stroke="#22c55e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Durum dağılımı */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Durum Dağılımı</h2>
              <StatusDonut data={data.statusDist} total={data.summary.total} />
              <div className="grid grid-cols-2 gap-1 mt-2">
                {Object.entries(data.statusDist).map(([status, count]) => (
                  <div key={status} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[status] || '#94a3b8' }} />
                    <span className="truncate">{STATUS_LABELS[status] || status}</span>
                    <span className="ml-auto font-medium text-gray-800">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* BÖLÜM 3 — Personel Performansı */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Top performans */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">🏆 En Çok Çözen</h2>
              {data.topPerformers.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">Veri yok</p>
              ) : (
                <ol className="space-y-2.5">
                  {data.topPerformers.map((p, i) => (
                    <li key={p.username} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                        ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-500' : 'bg-gray-50 text-gray-400'}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{p.displayName}</p>
                        <p className="text-xs text-gray-400">Ort. {p.avgHours}s</p>
                      </div>
                      <span className="text-sm font-semibold text-green-600 shrink-0">{p.resolved} talep</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* SLA ihlali */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">⚠️ SLA İhlali Yapanlar</h2>
              {data.slaBreachUsers.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">SLA ihlali yok 🎉</p>
              ) : (
                <ul className="space-y-2.5">
                  {data.slaBreachUsers.map((u) => (
                    <li key={u.username} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{u.displayName}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full
                        ${u.breachCount >= 5 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {u.breachCount} ihlal
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* BÖLÜM 4 — Top 5 Konu */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">📌 En Çok Gelen Konular</h2>
            {data.topSubjects.length === 0 ? (
              <p className="text-xs text-gray-400 py-2 text-center">Veri yok</p>
            ) : (
              <div className="space-y-2.5">
                {data.topSubjects.map((s, i) => {
                  const max = data.topSubjects[0].count;
                  const pct = Math.round(s.count / max * 100);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-4 text-right shrink-0">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between mb-0.5">
                          <span className="text-sm text-gray-700 truncate">{s.name}</span>
                          <span className="text-sm font-semibold text-gray-800 ml-2 shrink-0">{s.count}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* BÖLÜM 5 — Aktarma Kayıtları */}
          {data.transfers.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">🔄 Aktarma Kayıtları</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100 font-semibold uppercase">
                      <th className="text-left pb-2 px-1">#</th>
                      <th className="text-left pb-2 px-1">Talep</th>
                      <th className="text-left pb-2 px-1">Kimden</th>
                      <th className="text-left pb-2 px-1">Kime</th>
                      <th className="text-left pb-2 px-1">Kim Tarafından</th>
                      <th className="text-left pb-2 px-1">Tarih</th>
                      <th className="text-left pb-2 px-1">Sebep</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.transfers.map((t, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="py-2 px-1 text-gray-400 font-mono text-xs">{t.ticketId}</td>
                        <td className="py-2 px-1">
                          <Link to={`/itsm/${t.ticketId}`} className="text-indigo-600 hover:underline truncate block max-w-[160px]">
                            {t.title}
                          </Link>
                        </td>
                        <td className="py-2 px-1 text-xs text-gray-600">{t.fromValue}</td>
                        <td className="py-2 px-1 text-xs text-gray-600">{t.toValue}</td>
                        <td className="py-2 px-1 text-xs text-gray-500">{t.by}</td>
                        <td className="py-2 px-1 text-xs text-gray-400 whitespace-nowrap">
                          {new Date(t.date).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="py-2 px-1 text-xs text-gray-400 max-w-[120px] truncate">{t.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* BÖLÜM 6 — Bekleyen Onaylar */}
          {['admin', 'manager'].includes(user.role) && pendingList.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-700">
                  ⏳ Bekleyen Onaylar
                  <span className="ml-2 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {pendingList.length}
                  </span>
                </h2>
                <Link to="/pending-approvals" className="text-xs text-indigo-600 hover:underline">Tümünü Gör →</Link>
              </div>
              <div className="space-y-1">
                {pendingList.map(t => (
                  <PendingRow key={t.id} ticket={t}
                    onAction={(id) => setPendingList(prev => prev.filter(x => x.id !== id))} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
