import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';
function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

function maskPhone(phone) {
  if (!phone) return null;
  const p = phone.replace(/\D/g, '');
  if (p.length === 10) return `0${p.slice(0, 3)} XXX XX ${p.slice(-2)}`;
  if (p.length === 11) return `${p.slice(0, 4)} XXX XX ${p.slice(-2)}`;
  return phone;
}

function DrawerField({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-sm w-5 text-center shrink-0">{icon}</span>
      <span className="text-xs text-gray-400 w-14 shrink-0">{label}</span>
      <span className="text-xs font-medium text-gray-800 flex-1 min-w-0 truncate">{value}</span>
    </div>
  );
}

const TYPE_ICONS = {
  BILGISAYAR: '🖥️', DIZUSTU: '💻', IP_TELEFON: '☎️',
  IPAD_TABLET: '📱', MONITOR: '🖥', YAZICI: '🖨️',
  SWITCH: '🔌', ACCESS_POINT: '📡', SUNUCU: '🗄️', UPS: '🔋', DIGER: '📦',
};

function UserDevices({ username }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/inventory?assignedTo=${encodeURIComponent(username)}&limit=10`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : { devices: [] })
      .then(d => setDevices(d.devices || []))
      .catch(() => setDevices([]))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) return <div className="py-3 text-xs text-gray-400 text-center">Cihazlar yükleniyor...</div>;
  if (devices.length === 0) return <div className="py-2 text-xs text-gray-400 text-center italic">Cihaz atanmamış</div>;

  return (
    <div className="space-y-1">
      {devices.slice(0, 5).map(d => (
        <div key={d.id} className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-lg">
          <span className="text-sm shrink-0">{TYPE_ICONS[d.type] || '📦'}</span>
          <span className="text-xs font-medium text-gray-800 flex-1 truncate">{d.name}</span>
          <span className="text-xs font-mono text-gray-400">{d.ipAddress || ''}</span>
          {d.epcStatus === 'online'  && <span title="EPC: Çevrimiçi" className="text-[10px]">🟢</span>}
          {d.epcStatus === 'passive' && <span title="EPC: Pasif"     className="text-[10px]">🟡</span>}
          {d.epcStatus === 'offline' && <span title="EPC: Çevrimdışı" className="text-[10px]">🔴</span>}
          {d.epcStatus === 'unknown' && <span title="EPC: Bilinmiyor" className="text-[10px]">⚫</span>}
        </div>
      ))}
      {devices.length > 5 && (
        <p className="text-[10px] text-gray-400 text-center">+{devices.length - 5} daha</p>
      )}
    </div>
  );
}

export default function UserDrawer({ username, onClose }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    setLoading(true); setErr(null); setUser(null);
    fetch(`${API}/api/users/${encodeURIComponent(username)}`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : Promise.reject('Kullanıcı bulunamadı'))
      .then(setUser)
      .catch(e => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [username]);

  const initials = user?.displayName
    ? user.displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : (username?.[0] || '?').toUpperCase();

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Personel Detayı</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-5 space-y-3">
              <div className="flex gap-3 items-center">
                <div className="w-12 h-12 bg-gray-100 rounded-xl animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse" />
                </div>
              </div>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : err ? (
            <div className="p-8 text-center text-sm text-gray-400">{err}</div>
          ) : user ? (
            <div className="p-5 space-y-4">
              {/* Avatar + isim */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-base shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{user.displayName}</p>
                  {user.title && <p className="text-xs text-gray-400 truncate">{user.title}</p>}
                </div>
              </div>

              {/* Birim */}
              {(user.directorate || user.department) && (
                <div className="bg-indigo-50 rounded-xl px-4 py-3">
                  {user.directorate && <p className="text-xs font-semibold text-indigo-700">{user.directorate}</p>}
                  {user.department  && <p className="text-xs text-indigo-500 mt-0.5">{user.department}</p>}
                </div>
              )}

              {/* İletişim */}
              <div className="space-y-2">
                <DrawerField icon="📧" label="E-posta"
                  value={user.email ? (
                    <a href={`mailto:${user.email}`} className="text-indigo-600 hover:underline text-xs">{user.email}</a>
                  ) : '—'} />
                <DrawerField icon="📞" label="GSM"      value={user.phone ? maskPhone(user.phone) : '—'} />
                <DrawerField icon="☎️" label="Dahili"   value={user.ipPhone || '—'} />
                <DrawerField icon="🏢" label="Ofis"     value={user.office || user.city || '—'} />
                <DrawerField icon="🪪" label="Sicil"    value={user.employeeNumber || '—'} />
                <DrawerField icon="👤" label="AD Hesabı" value={<span className="font-mono text-xs">{user.username}</span>} />
              </div>

              {/* Özet */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-blue-700">{user._count?.devices ?? '—'}</p>
                  <p className="text-[10px] text-blue-500 mt-0.5">Cihaz</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-purple-700">{user._count?.tickets ?? '—'}</p>
                  <p className="text-[10px] text-purple-500 mt-0.5">Talep</p>
                </div>
                {user.openTickets !== undefined && (
                  <div className="col-span-2 bg-amber-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-amber-700">{user.openTickets}</p>
                    <p className="text-[10px] text-amber-500 mt-0.5">Açık Talep</p>
                  </div>
                )}
              </div>

              {/* Cihazlar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cihazlar</p>
                  <Link
                    to={`/admin/envanter?assignedTo=${encodeURIComponent(username)}`}
                    onClick={onClose}
                    className="text-[10px] text-indigo-600 hover:underline font-medium"
                  >
                    Tümü →
                  </Link>
                </div>
                <UserDevices username={username} />
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {user && (
          <div className="px-5 py-4 border-t border-gray-100">
            <Link
              to="/profile"
              onClick={onClose}
              className="w-full block text-center text-xs font-semibold text-[#1e40af] hover:text-[#1d4ed8] transition-colors"
            >
              Tam Profili Gör →
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
