import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import UserDrawer from '../components/UserDrawer';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, LabelList,
} from 'recharts';

const API = import.meta.env.VITE_API_URL || '';

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}


const USR_TYPE_COLORS = {
  BILGISAYAR: 'bg-blue-100 text-blue-700',
  DIZUSTU:    'bg-indigo-100 text-indigo-700',
  IP_TELEFON: 'bg-green-100 text-green-700',
  TABLET:     'bg-purple-100 text-purple-700',
  MONITOR:    'bg-amber-100 text-amber-700',
  DIGER:      'bg-gray-100 text-gray-600',
};

// ─── Cihaz Modal ───────────────────────────────────────────────────────────────
function DeviceModal({ user, onClose }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/devices?username=${encodeURIComponent(user.username)}`, { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : [])
      .then(setDevices)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user.username]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-800">{user.displayName}</h2>
            <p className="text-xs text-gray-400">{user.username}{user.department ? ` · ${user.department}` : ''}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-gray-400">Yükleniyor...</div>
        ) : devices.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">Bu kullanıcıya cihaz atanmamış</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left pb-2 font-medium">Cihaz</th>
                <th className="text-left pb-2 font-medium">Tip</th>
                <th className="text-left pb-2 font-medium">Seri No</th>
                <th className="text-left pb-2 font-medium">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {devices.map((d) => (
                <tr key={d.id}>
                  <td className="py-2 font-medium text-gray-800">{d.deviceName}</td>
                  <td className="py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${USR_TYPE_COLORS[d.deviceType] || USR_TYPE_COLORS.DIGER}`}>
                      {d.deviceType}
                    </span>
                  </td>
                  <td className="py-2 text-gray-500">{d.serialNumber || '—'}</td>
                  <td className="py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                      ${d.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {d.active ? 'Aktif' : 'Pasif'}
                    </span>
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

// ─── Personel satırı ────────────────────────────────────────────────────────
function PersonelRow({ u, canViewDevices, onDeviceClick, onUserClick }) {
  return (
    <div
      className="flex items-center gap-3 px-6 py-2 hover:bg-gray-50 cursor-pointer"
      onClick={() => onUserClick(u)}
    >
      <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
        {u.displayName[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 font-medium truncate">{u.displayName}</p>
        <p className="text-xs text-gray-400 truncate">{u.username}</p>
      </div>
      {u.title && (
        <span className="text-xs text-gray-400 shrink-0 truncate max-w-[160px]">{u.title}</span>
      )}
      {canViewDevices && (
        <button
          onClick={(e) => { e.stopPropagation(); onDeviceClick(u); }}
          className="ml-2 p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
          title="Cihazları görüntüle"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── Şube Müdürlüğü accordion (Level 2) ────────────────────────────────────
function SubeAccordion({ name, users, canViewDevices, onDeviceClick, onUserClick }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-gray-100">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-2 px-5 py-2.5 text-left transition
          ${open ? 'bg-indigo-50' : 'bg-gray-50 hover:bg-gray-100'}`}
      >
        <span className="text-xs select-none">📂</span>
        <span className="flex-1 text-xs font-semibold text-gray-700">
          {name}
          <span className="font-normal text-gray-400 ml-1.5">({users.length})</span>
        </span>
        <svg
          className={`w-3.5 h-3.5 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`}
          fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {open && (
        <div className="divide-y divide-gray-50">
          {users.map((u) => (
            <PersonelRow
              key={u.id}
              u={u}
              canViewDevices={canViewDevices}
              onDeviceClick={onDeviceClick}
              onUserClick={onUserClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

async function fetchDirectorates() {
  const res = await fetch(`${API}/api/users/directorates`, { headers: authHeaders() });
  return res.ok ? res.json() : [];
}

async function fetchUsersByDirectorate(directorate) {
  const params = new URLSearchParams({ directorate, limit: '500' });
  const res = await fetch(`${API}/api/users?${params}`, { headers: authHeaders() });
  const data = await res.json();
  return data.users || [];
}

// Kullanıcıları department'a göre grupla; null/boş → "Diğer"
function groupByDept(users) {
  const groups = {};
  for (const u of users) {
    const key = u.department || 'Diğer';
    if (!groups[key]) groups[key] = [];
    groups[key].push(u);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, 'tr'));
}

// Daire adını kısalt: "X Dairesi Başkanlığı" → "X DB"
function shortenDir(name = '') {
  return name
    .replace(' Dairesi Başkanlığı', ' DB')
    .replace(' Müdürlüğü', ' Müd.')
    .replace('Hizmetleri', 'Hiz.');
}

// Kart bileşeni
function Card({ title, children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl p-5 border border-slate-100 ${className}`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)' }}>
      {title && (
        <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

// Donut pie orta toplam
function DonutCenter({ cx, cy, total }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-6" fontSize="22" fontWeight="700" fill="#1e293b">{total?.toLocaleString('tr-TR')}</tspan>
      <tspan x={cx} dy="18" fontSize="11" fill="#94a3b8">kişi</tspan>
    </text>
  );
}

// Custom tooltip
function ChartTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-lg px-3 py-2 text-xs shadow-lg">
      <span className="font-semibold text-slate-700">{payload[0].name}</span>
      <span className="ml-2 text-slate-500">{Number(payload[0].value).toLocaleString('tr-TR')}</span>
    </div>
  );
}

// Avatar initials
function Avatar({ name, size = 32, bg = '#1e40af' }) {
  const initials = name?.split(' ').slice(0, 2).map(w => w[0]).join('') || '?';
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: size * 0.35, fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

export default function Personel() {
  const { user: currentUser } = useAuth();
  const [directorates, setDirectorates] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [openDir, setOpenDir]           = useState(null);
  const [dirUsers, setDirUsers]         = useState({});
  const [loadingDir, setLoadingDir]     = useState(null);
  const [deviceModal, setDeviceModal]   = useState(null);
  const [drawerUser, setDrawerUser]     = useState(null);
  const [demo, setDemo]                 = useState(null);

  const isAdmin       = currentUser?.role === 'admin';
  const canViewDevices = ['admin', 'manager'].includes(currentUser?.role);

  useEffect(() => {
    fetchDirectorates()
      .then((d) => { setDirectorates(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    fetch(`${API}/api/users/demographics`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setDemo(d))
      .catch(() => {});
  }, [isAdmin]);

  async function toggleDir(name) {
    if (openDir === name) { setOpenDir(null); return; }
    setOpenDir(name);
    if (dirUsers[name]) return;
    setLoadingDir(name);
    try {
      const users = await fetchUsersByDirectorate(name);
      setDirUsers((prev) => ({ ...prev, [name]: users }));
    } finally {
      setLoadingDir(null);
    }
  }

  const total    = directorates.reduce((s, d) => s + d.count, 0);
  const filtered = search
    ? directorates.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()))
    : directorates;

  return (
    <div className="p-8">
      {/* Başlık */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Daire Başkanlıkları</h1>
          <p className="text-sm text-gray-400 mt-1">
            {directorates.length} daire · {total.toLocaleString('tr-TR')} personel
          </p>
        </div>
        <input
          type="text"
          placeholder="Daire ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Demografik dashboard (admin only) */}
      {isAdmin && demo && (
        <div className="mb-8">
          {/* Satır 1: Cinsiyet + Kadro + Daire (row-span-2) */}
          <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: '1fr 1fr 2fr', gridTemplateRows: 'auto auto' }}>

            {/* Cinsiyet Dağılımı */}
            <Card title="Cinsiyet Dağılımı">
              {(() => {
                const gTotal = demo.gender.reduce((s, r) => s + r.value, 0);
                const colors = { Erkek: '#1e40af', Kadın: '#ec4899', Belirtilmemiş: '#cbd5e1' };
                return (
                  <>
                    <div className="relative">
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={demo.gender} dataKey="value" nameKey="name"
                            cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2}>
                            {demo.gender.map((r) => <Cell key={r.name} fill={colors[r.name] || '#94a3b8'} />)}
                          </Pie>
                          <Tooltip content={<ChartTip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                          <p className="text-xl font-bold text-slate-800">{gTotal.toLocaleString('tr-TR')}</p>
                          <p style={{ fontSize: 10, color: '#94a3b8' }}>kişi</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 mt-2">
                      {demo.gender.map(r => (
                        <div key={r.name} className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colors[r.name] || '#94a3b8' }} />
                          <span className="text-xs text-slate-600 flex-1">{r.name}</span>
                          <span className="text-xs font-semibold text-slate-800">{r.value.toLocaleString('tr-TR')}</span>
                          <span className="text-xs text-slate-400">%{((r.value / gTotal) * 100).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </Card>

            {/* Kadro Türü */}
            <Card title="Kadro Türü">
              {(() => {
                const kadroColors = { Memur: '#0ea5e9', 'Hizmet Alımı': '#f59e0b', İşçi: '#10b981' };
                // Sadece ana 3 + Diğer olarak grupla
                const main = demo.employeeType.filter(r => ['Memur','Hizmet Alımı','İşçi'].includes(r.name));
                const otherVal = demo.employeeType.filter(r => !['Memur','Hizmet Alımı','İşçi'].includes(r.name)).reduce((s, r) => s + r.value, 0);
                const data = otherVal > 0 ? [...main, { name: 'Diğer', value: otherVal }] : main;
                const eTotal = data.reduce((s, r) => s + r.value, 0);
                return (
                  <>
                    <div className="relative">
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={data} dataKey="value" nameKey="name"
                            cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2}>
                            {data.map((r) => <Cell key={r.name} fill={kadroColors[r.name] || '#94a3b8'} />)}
                          </Pie>
                          <Tooltip content={<ChartTip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                          <p className="text-xl font-bold text-slate-800">{eTotal.toLocaleString('tr-TR')}</p>
                          <p style={{ fontSize: 10, color: '#94a3b8' }}>kişi</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 mt-2">
                      {data.map(r => (
                        <div key={r.name} className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: kadroColors[r.name] || '#94a3b8' }} />
                          <span className="text-xs text-slate-600 flex-1">{r.name}</span>
                          <span className="text-xs font-semibold text-slate-800">{r.value.toLocaleString('tr-TR')}</span>
                          <span className="text-xs text-slate-400">%{((r.value / eTotal) * 100).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </Card>

            {/* Daire Dağılımı — tüm daireler */}
            <Card title="Daire Dağılımı" className="row-span-2">
              <div style={{ overflowY: 'auto', maxHeight: 420 }}>
                <ResponsiveContainer width="100%" height={demo.byDirectorate.length * 40}>
                  <BarChart
                    data={demo.byDirectorate.map(r => ({
                      ...r,
                      short: r.name
                        .replace(' Dairesi Başkanlığı', '')
                        .replace(' Şube Müdürlüğü', '')
                        .replace(' Daire Başkanlığı', ''),
                    }))}
                    layout="vertical"
                    margin={{ top: 2, right: 48, left: 4, bottom: 2 }}
                  >
                    <XAxis type="number" tick={false} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="short" width={140} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Bar dataKey="value" fill="#1e40af" radius={[0, 4, 4, 0]} barSize={18}>
                      <LabelList dataKey="value" position="right" style={{ fontSize: 11, fill: '#1e40af', fontWeight: 600 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Yaş Dağılımı */}
            <Card title="Yaş Dağılımı" className="col-span-2">
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={demo.ageGroups} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={42}>
                    {demo.ageGroups.map((_, i) => (
                      <Cell key={i} fill={`hsl(${215 + i * 8}, ${75 - i * 5}%, ${35 + i * 5}%)`} />
                    ))}
                    <LabelList dataKey="value" position="top" style={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Satır 2: Bugün Doğum Günü + Yeni Katılanlar */}
          <div className="grid grid-cols-2 gap-4">
            {/* Bugün Doğum Günü */}
            <Card title={`🎂 Bugün Doğum Günü (${demo.birthdayToday?.length || 0})`}>
              {!demo.birthdayToday?.length ? (
                <p className="text-sm text-slate-400 py-4 text-center">Bugün doğum günü olan personel yok</p>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {demo.birthdayToday.map(u => (
                    <div key={u.username} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition">
                      <Avatar name={u.displayName} bg="#1e40af" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{u.displayName}</p>
                        <p className="text-xs text-slate-400 truncate">{u.directorate || u.department || '—'}</p>
                      </div>
                      <button
                        onClick={() => fetch(`${API}/api/users/send-birthday-mail/${u.username}`, { method: 'POST', headers: authHeaders() })}
                        title="Tebrik maili gönder"
                        className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition text-xs"
                      >📧</button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Bu Hafta Yeni Katılanlar */}
            <Card title={`👋 Bu Hafta Yeni Katılanlar (${demo.newThisWeek?.length || 0})`}>
              {!demo.newThisWeek?.length ? (
                <p className="text-sm text-slate-400 py-4 text-center">Bu hafta yeni personel eklenmedi</p>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {demo.newThisWeek.map(u => {
                    const daysAgo = Math.floor((Date.now() - new Date(u.adCreatedAt)) / 86400000);
                    return (
                      <div key={u.username} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition">
                        <Avatar name={u.displayName} bg="#0f766e" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{u.displayName}</p>
                          <p className="text-xs text-slate-400 truncate">{u.directorate || u.department || '—'}</p>
                        </div>
                        <span className="text-xs text-slate-400 shrink-0">{daysAgo === 0 ? 'bugün' : `${daysAgo}g önce`}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* TODO: FlexCity entegrasyonu ile yeniden yapılacak */}
      {false && (loading ? (
        <div className="text-center py-20 text-sm text-gray-400">Yükleniyor...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-sm text-gray-400">Sonuç bulunamadı</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((d) => {
            const isOpen    = openDir === d.name;
            const users     = dirUsers[d.name] || [];
            const isLoading = loadingDir === d.name;
            const subeGroups = isOpen && !isLoading ? groupByDept(users) : [];

            return (
              <div key={d.name} className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Level 1: Daire başlığı */}
                <button
                  onClick={() => toggleDir(d.name)}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition
                    ${isOpen
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-800 hover:bg-gray-50'}`}
                >
                  <span className="text-base select-none">🏢</span>
                  <span className="flex-1 font-semibold text-sm">
                    {d.name}
                    <span className={`font-normal ml-1.5 ${isOpen ? 'text-indigo-200' : 'text-gray-400'}`}>
                      ({d.count})
                    </span>
                  </span>
                  <svg
                    className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                    fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Level 2+3: Şube → Personel */}
                {isOpen && (
                  <div className="bg-white">
                    {isLoading ? (
                      <div className="py-6 text-center text-sm text-gray-400">Yükleniyor...</div>
                    ) : users.length === 0 ? (
                      <div className="py-6 text-center text-sm text-gray-400">Personel bulunamadı</div>
                    ) : subeGroups.length === 1 && subeGroups[0][0] === 'Diğer' ? (
                      // Şube ayrımı yoksa doğrudan listele
                      <div className="divide-y divide-gray-50">
                        {users.map((u) => (
                          <PersonelRow
                            key={u.id}
                            u={u}
                            canViewDevices={canViewDevices}
                            onDeviceClick={setDeviceModal}
                            onUserClick={(u) => setDrawerUser(u.username)}
                          />
                        ))}
                      </div>
                    ) : (
                      // Şube accordion
                      subeGroups.map(([subeName, subeUsers]) => (
                        <SubeAccordion
                          key={subeName}
                          name={subeName}
                          users={subeUsers}
                          canViewDevices={canViewDevices}
                          onDeviceClick={setDeviceModal}
                          onUserClick={(u) => setDrawerUser(u.username)}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {deviceModal && (
        <DeviceModal user={deviceModal} onClose={() => setDeviceModal(null)} />
      )}

      {drawerUser && (
        <UserDrawer username={drawerUser} onClose={() => setDrawerUser(null)} />
      )}
    </div>
  );
}
