import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const H = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

// ─── Renk paleti ─────────────────────────────────────────────────────────────
const C = {
  blue:   '#1e40af',
  green:  '#059669',
  amber:  '#d97706',
  red:    '#dc2626',
  purple: '#7c3aed',
  slate:  '#475569',
  bg:     '#f0f4f8',
  text:   '#1e293b',
};

const STATUS_META = {
  OPEN:             { label: 'Açık',          color: '#6366f1' },
  PENDING_APPROVAL: { label: 'Onay Bekliyor', color: '#f59e0b' },
  ASSIGNED:         { label: 'Atandı',        color: '#8b5cf6' },
  IN_PROGRESS:      { label: 'İşlemde',       color: '#f97316' },
  RESOLVED:         { label: 'Çözüldü',       color: '#10b981' },
  CLOSED:           { label: 'Kapalı',        color: '#94a3b8' },
  REJECTED:         { label: 'Reddedildi',    color: '#ef4444' },
};

const DEVICE_ICONS = {
  BILGISAYAR: '🖥️', DIZUSTU: '💻', IPAD_TABLET: '📱',
  IP_TELEFON: '☎️', YAZICI: '🖨️', MONITOR: '🖥️',
  SWITCH: '🔌', ACCESS_POINT: '📡', SUNUCU: '🗄️', UPS: '🔋', DIGER: '📦',
};

// ─── Canlı saat ───────────────────────────────────────────────────────────────
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-right">
      <p className="text-2xl font-bold tabular-nums" style={{ color: C.text }}>
        {now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
      <p className="text-xs mt-0.5" style={{ color: C.slate }}>
        {now.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
    </div>
  );
}

// ─── Özet kart ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, borderColor, change, pulse, suffix = '' }) {
  const isUp  = change > 0;
  const isNeg = change < 0;
  const hasTrend = change !== null && change !== undefined;
  const invertGood = label.includes('İhlal') || label.includes('SLA');
  const trendGood  = invertGood ? isNeg : isUp;

  return (
    <div
      className="relative bg-white rounded-2xl p-5 flex flex-col gap-3 overflow-hidden"
      style={{ borderLeft: `4px solid ${borderColor}`, boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}
    >
      {pulse && (value > 0) && (
        <span className="absolute top-3 right-3 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: C.red }} />
          <span className="relative inline-flex rounded-full h-3 w-3" style={{ background: C.red }} />
        </span>
      )}
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.slate }}>{label}</p>
        <span className="text-xl leading-none">{icon}</span>
      </div>
      <p className="text-4xl font-extrabold leading-none" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {value ?? '—'}<span className="text-lg font-semibold ml-1" style={{ color: C.slate }}>{suffix}</span>
      </p>
      {hasTrend && (
        <p className="text-xs font-medium" style={{ color: trendGood ? C.green : C.red }}>
          {isUp ? '↑' : '↓'} {Math.abs(change)}% geçen döneme göre
        </p>
      )}
      {!hasTrend && <p className="text-xs" style={{ color: C.slate }}>Bu dönem</p>}
    </div>
  );
}

// ─── Onay satırı ──────────────────────────────────────────────────────────────
function ApprovalRow({ ticket, onDone }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason]       = useState('');
  const [busy, setBusy]           = useState(false);

  async function act(type) {
    setBusy(true);
    try {
      const url = `${API}/api/tickets/${ticket.id}/${type}`;
      const body = type === 'reject' ? JSON.stringify({ reason }) : undefined;
      const r = await fetch(url, {
        method: 'POST',
        headers: { ...H(), 'Content-Type': 'application/json' },
        body,
      });
      if (!r.ok) throw new Error((await r.json()).error);
      onDone(ticket.id);
    } catch (e) { alert(e.message); }
    finally { setBusy(false); }
  }

  const PRIORITY_COLOR = { CRITICAL: '#dc2626', HIGH: '#d97706', MEDIUM: '#6366f1', LOW: '#94a3b8' };

  return (
    <div className="py-3 border-b last:border-0" style={{ borderColor: '#f1f5f9' }}>
      <div className="flex items-start gap-2 mb-2">
        <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: PRIORITY_COLOR[ticket.priority] || '#94a3b8' }} />
        <div className="flex-1 min-w-0">
          <Link to={`/itsm/${ticket.id}`} className="text-sm font-semibold hover:underline truncate block" style={{ color: C.text }}>
            {ticket.title}
          </Link>
          <p className="text-xs mt-0.5" style={{ color: C.slate }}>
            {ticket.createdBy?.displayName} · {new Date(ticket.createdAt).toLocaleDateString('tr-TR')}
          </p>
        </div>
      </div>

      {rejecting ? (
        <div className="flex gap-1.5 items-center">
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Red sebebi..."
            className="text-xs flex-1 border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-200"
            style={{ borderColor: '#e2e8f0', fontSize: '12px' }} />
          <button onClick={() => act('reject')} disabled={busy || !reason.trim()}
            className="text-xs text-white px-2.5 py-1.5 rounded-lg font-medium transition hover:opacity-90 disabled:opacity-50"
            style={{ background: C.red }}>Gönder</button>
          <button onClick={() => setRejecting(false)} className="text-xs px-2 py-1.5 rounded-lg transition hover:bg-gray-100" style={{ color: C.slate }}>İptal</button>
        </div>
      ) : (
        <div className="flex gap-1.5">
          <button onClick={() => act('approve')} disabled={busy}
            className="flex-1 text-xs font-medium py-1.5 rounded-lg transition hover:opacity-90 disabled:opacity-50"
            style={{ background: '#d1fae5', color: C.green }}>✓ Onayla</button>
          <button onClick={() => setRejecting(true)} disabled={busy}
            className="flex-1 text-xs font-medium py-1.5 rounded-lg transition hover:opacity-90 disabled:opacity-50"
            style={{ background: '#fee2e2', color: C.red }}>✗ Reddet</button>
        </div>
      )}
    </div>
  );
}

// ─── Personel sekme bileşeni ──────────────────────────────────────────────────
function PersonnelCard({ topPerformers = [], slaBreachUsers = [] }) {
  const [tab, setTab] = useState('top');
  const max = topPerformers[0]?.resolved || 1;

  return (
    <div className="bg-white rounded-2xl p-5 flex flex-col" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold" style={{ color: C.text }}>Personel Performansı</h3>
        <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
          {[['top','🏆 En Çok Kapatan'],['sla','⚠️ SLA İhlali']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className="text-xs px-3 py-1 rounded-md font-medium transition"
              style={tab === k ? { background: 'white', color: C.blue, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } : { color: C.slate }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {tab === 'top' ? (
        <div className="space-y-3 flex-1">
          {topPerformers.length === 0 ? (
            <p className="text-xs text-center py-6" style={{ color: C.slate }}>Veri yok</p>
          ) : topPerformers.map((p, i) => (
            <div key={p.username} className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: i === 0 ? '#fef3c7' : i === 1 ? '#f1f5f9' : '#f8fafc', color: i === 0 ? '#b45309' : C.slate }}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium truncate" style={{ color: C.text }}>{p.displayName}</span>
                  <span className="text-sm font-bold ml-2 shrink-0" style={{ color: C.green }}>{p.resolved}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: '#e2e8f0' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${Math.round(p.resolved / max * 100)}%`, background: i === 0 ? C.amber : C.blue }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3 flex-1">
          {slaBreachUsers.length === 0 ? (
            <p className="text-xs text-center py-6" style={{ color: C.green }}>🎉 SLA ihlali yok!</p>
          ) : slaBreachUsers.map(u => (
            <div key={u.username} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: '#f1f5f9' }}>
              <span className="text-sm font-medium" style={{ color: C.text }}>{u.displayName}</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={u.breachCount >= 5 ? { background: '#fee2e2', color: C.red } : { background: '#fef3c7', color: C.amber }}>
                {u.breachCount} ihlal
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Cihaz kartı ──────────────────────────────────────────────────────────────
function MyDevicesCard({ devices }) {
  const STATUS_STYLE = {
    ACTIVE:      { background: '#d1fae5', color: C.green },
    PASSIVE:     { background: '#f1f5f9', color: C.slate },
    BROKEN:      { background: '#fee2e2', color: C.red },
    TRANSFERRED: { background: '#dbeafe', color: C.blue },
  };
  const STATUS_LABEL = { ACTIVE: 'Aktif', PASSIVE: 'Pasif', BROKEN: 'Arızalı', TRANSFERRED: 'Devredildi' };

  return (
    <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
      <h3 className="text-sm font-bold mb-4" style={{ color: C.text }}>Envanterim</h3>
      {devices.length === 0 ? (
        <p className="text-xs text-center py-6" style={{ color: C.slate }}>Kayıtlı cihaz yok</p>
      ) : (
        <ul className="space-y-2.5">
          {devices.map(d => (
            <li key={d.id} className="flex items-center gap-2.5">
              <span className="text-xl">{DEVICE_ICONS[d.type] || '📦'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{d.name}</p>
                <p className="text-xs truncate" style={{ color: C.slate }}>{d.brand} {d.model}</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
                style={STATUS_STYLE[d.status] || { background: '#f1f5f9', color: C.slate }}>
                {STATUS_LABEL[d.status] || d.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const date = new Date(label);
  return (
    <div className="bg-white rounded-xl p-3 shadow-lg border" style={{ borderColor: '#e2e8f0', fontSize: '12px' }}>
      <p className="font-semibold mb-1" style={{ color: C.text }}>
        {date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
      </p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

// ─── PieChart custom label ────────────────────────────────────────────────────
function PieCenterLabel({ cx, cy, total }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-8" fontSize="26" fontWeight="800" fill={C.text}>{total}</tspan>
      <tspan x={cx} dy="20" fontSize="11" fill={C.slate}>toplam</tspan>
    </text>
  );
}

// ─── ANA BILEŞEN ──────────────────────────────────────────────────────────────
export default function ManagerDashboard() {
  const { user } = useAuth();
  const [data, setData]       = useState(null);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [approvals, setApprovals] = useState([]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [statsRes, devRes] = await Promise.all([
        fetch(`${API}/api/dashboard/manager-stats?period=month`, { headers: H() }),
        fetch(`${API}/api/dashboard/my-devices`, { headers: H() }),
      ]);
      const stats = await statsRes.json();
      const devs  = await devRes.json();
      if (!statsRes.ok) throw new Error(stats.error);
      setData(stats);
      setApprovals(stats.pendingApprovals || []);
      setDevices(Array.isArray(devs) ? devs : []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!['admin', 'manager'].includes(user?.role)) return null;

  const s = data?.summary;

  // Pie data
  const pieData = data
    ? Object.entries(data.statusDist || {}).map(([status, count]) => ({
        name: STATUS_META[status]?.label || status,
        value: count,
        color: STATUS_META[status]?.color || '#94a3b8',
      }))
    : [];

  return (
    <div className="min-h-full p-6 space-y-5" style={{ background: C.bg, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Başlık ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: C.text }}>
            Hoş geldiniz, {user.displayName?.split(' ')[0] || user.username} 👋
          </h1>
          <p className="text-sm mt-1 font-medium" style={{ color: C.slate }}>
            {user.directorate || (user.role === 'admin' ? 'Tüm Birimler' : '')}
          </p>
        </div>
        <LiveClock />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-sm" style={{ color: C.red }}>{error}</div>
      ) : !data ? null : (
        <>
          {/* ── Özet Kartlar ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard label="Toplam Başvuru"    value={s.total}          icon="📋" borderColor={C.blue}   change={s.totalChange} />
            <StatCard label="Bekleyen Onay"     value={s.pendingApproval} icon="⏳" borderColor={C.amber}  />
            <StatCard label="İşlemdeki"         value={s.inProgress}     icon="🔧" borderColor="#f97316" />
            <StatCard label="Bugün Çözülen"     value={s.resolvedToday}  icon="✅" borderColor={C.green}  change={s.resolvedChange} />
            <StatCard label="SLA İhlali"        value={s.slaBreaches}    icon="🚨" borderColor={C.red}    change={s.slaBreachesChange} pulse />
            <StatCard label="Aktarılan"         value={s.transferred}    icon="🔄" borderColor={C.slate}  />
          </div>

          {/* ── Orta bölüm ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">

            {/* Alan grafik — 2/4 */}
            <div className="xl:col-span-2 bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
              <h3 className="text-sm font-bold mb-4" style={{ color: C.text }}>Son 30 Gün Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.daily} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="gradOpen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.blue}  stopOpacity={0.2} />
                      <stop offset="95%" stopColor={C.blue}  stopOpacity={0}   />
                    </linearGradient>
                    <linearGradient id="gradClose" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.green} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={C.green} stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.slate }}
                    tickFormatter={d => { const dt = new Date(d); return `${dt.getDate()}/${dt.getMonth()+1}`; }} />
                  <YAxis tick={{ fontSize: 10, fill: C.slate }} allowDecimals={false} />
                  <Tooltip content={<TrendTooltip />} />
                  <Area type="monotone" dataKey="opened" name="Açılan" stroke={C.blue}  strokeWidth={2} fill="url(#gradOpen)"  dot={false} />
                  <Area type="monotone" dataKey="closed" name="Kapanan" stroke={C.green} strokeWidth={2} fill="url(#gradClose)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-3 justify-center">
                {[['Açılan', C.blue], ['Kapanan', C.green]].map(([l, c]) => (
                  <div key={l} className="flex items-center gap-1.5 text-xs" style={{ color: C.slate }}>
                    <span className="w-3 h-0.5 rounded-full" style={{ background: c }} />
                    {l}
                  </div>
                ))}
              </div>
            </div>

            {/* Donut — 1/4 */}
            <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
              <h3 className="text-sm font-bold mb-3" style={{ color: C.text }}>Durum Dağılımı</h3>
              <div className="relative">
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={72} dataKey="value" paddingAngle={2}>
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-2xl font-extrabold" style={{ color: C.text }}>{s.total}</p>
                    <p className="text-xs" style={{ color: C.slate }}>toplam</p>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5 mt-2">
                {pieData.map(e => (
                  <div key={e.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: e.color }} />
                    <span className="flex-1 truncate" style={{ color: C.slate }}>{e.name}</span>
                    <span className="font-bold" style={{ color: C.text }}>{e.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bekleyen onaylar — 1/4 */}
            <div className="bg-white rounded-2xl p-5 flex flex-col" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold" style={{ color: C.text }}>
                  Bekleyen Onaylar
                  {approvals.length > 0 && (
                    <span className="ml-2 text-xs font-bold text-white px-1.5 py-0.5 rounded-full" style={{ background: C.amber }}>
                      {approvals.length}
                    </span>
                  )}
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto" style={{ maxHeight: 240 }}>
                {approvals.length === 0 ? (
                  <p className="text-xs text-center py-8" style={{ color: C.slate }}>Bekleyen onay yok 🎉</p>
                ) : approvals.map(t => (
                  <ApprovalRow key={t.id} ticket={t} onDone={id => setApprovals(p => p.filter(x => x.id !== id))} />
                ))}
              </div>
              <Link to="/pending-approvals" className="text-xs font-semibold mt-3 pt-3 border-t text-center hover:underline" style={{ color: C.blue, borderColor: '#f1f5f9' }}>
                Tümünü Gör →
              </Link>
            </div>
          </div>

          {/* ── Alt bölüm ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

            {/* Personel performansı */}
            <PersonnelCard topPerformers={data.topPerformers} slaBreachUsers={data.slaBreachUsers} />

            {/* Sağ kolon: Envanter + Konu Dağılımı */}
            <div className="space-y-4">
              <MyDevicesCard devices={devices} />

              {/* Konu dağılımı horizontal bar */}
              <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
                <h3 className="text-sm font-bold mb-4" style={{ color: C.text }}>En Çok Gelen Konular</h3>
                {data.topSubjects.length === 0 ? (
                  <p className="text-xs text-center py-4" style={{ color: C.slate }}>Veri yok</p>
                ) : (
                  <ResponsiveContainer width="100%" height={data.topSubjects.length * 36}>
                    <BarChart data={data.topSubjects} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
                      <XAxis type="number" tick={{ fontSize: 10, fill: C.slate }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: C.text }} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(v) => [v, 'Başvuru']} />
                      <Bar dataKey="count" name="Başvuru" fill={C.blue} radius={[0, 6, 6, 0]} maxBarSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
