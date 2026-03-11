import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

export default function Personel() {
  const { user: currentUser } = useAuth();
  const [directorates, setDirectorates] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [openDir, setOpenDir]           = useState(null);    // currently expanded directorate name
  const [dirUsers, setDirUsers]         = useState({});      // name → users[]
  const [loadingDir, setLoadingDir]     = useState(null);    // name being loaded
  const [deviceModal, setDeviceModal]   = useState(null);    // user object

  useEffect(() => {
    fetchDirectorates()
      .then((d) => { setDirectorates(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function toggleDir(name) {
    if (openDir === name) { setOpenDir(null); return; }
    setOpenDir(name);
    if (dirUsers[name]) return; // already loaded
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
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-sm text-gray-400">Yükleniyor...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-sm text-gray-400">Sonuç bulunamadı</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((d) => {
            const isOpen      = openDir === d.name;
            const users       = dirUsers[d.name] || [];
            const isLoading   = loadingDir === d.name;

            return (
              <div key={d.name} className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Daire başlığı — tıklanabilir */}
                <button
                  onClick={() => toggleDir(d.name)}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition
                    ${isOpen
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-800 hover:bg-gray-50'}`}
                >
                  <span className="text-base select-none">🏢</span>
                  <span className="flex-1 font-semibold text-sm">
                    {d.name}
                    <span className={`font-normal ml-1.5 ${isOpen ? 'text-blue-200' : 'text-gray-400'}`}>
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

                {/* Personel listesi */}
                {isOpen && (
                  <div className="border-t border-gray-100 bg-white">
                    {isLoading ? (
                      <div className="py-6 text-center text-sm text-gray-400">Yükleniyor...</div>
                    ) : users.length === 0 ? (
                      <div className="py-6 text-center text-sm text-gray-400">Personel bulunamadı</div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {users.map((u) => (
                          <div key={u.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                              {u.displayName[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-800 font-medium truncate">{u.displayName}</p>
                              {u.department && (
                                <p className="text-xs text-gray-400 truncate">{u.department}</p>
                              )}
                            </div>
                            {u.title && (
                              <span className="text-xs text-gray-400 shrink-0 truncate max-w-[160px]">
                                {u.title}
                              </span>
                            )}
                            {['admin', 'manager'].includes(currentUser?.role) && (
                              <button
                                onClick={() => setDeviceModal(u)}
                                className="ml-2 p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                                title="Cihazları görüntüle"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {deviceModal && (
        <DeviceModal user={deviceModal} onClose={() => setDeviceModal(null)} />
      )}
    </div>
  );
}
