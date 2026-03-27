import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Search, ChevronDown, ChevronRight } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

const TYPE_ICONS = {
  BILGISAYAR:   '🖥️',
  DIZUSTU:      '💻',
  IP_TELEFON:   '📞',
  YAZICI:       '🖨️',
  SWITCH:       '🔀',
  ACCESS_POINT: '📡',
  SUNUCU:       '🗄️',
  MONITOR:      '🖵',
  IPAD_TABLET:  '📱',
  UPS:          '🔋',
  DIGER:        '📦',
};

const EPC_BADGE = {
  online:  { color: '#16a34a', bg: '#dcfce7', label: 'Çevrimiçi' },
  passive: { color: '#d97706', bg: '#fef3c7', label: 'Pasif' },
  offline: { color: '#dc2626', bg: '#fee2e2', label: 'Çevrimdışı' },
  unknown: { color: '#94a3b8', bg: '#f1f5f9', label: 'Bilinmiyor' },
};

const cardStyle = {
  background: 'white', borderRadius: '12px', padding: '20px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9',
};

export default function Envanter() {
  const [directorates, setDirectorates] = useState([]);
  const [openDirs, setOpenDirs]         = useState({});
  const [devices, setDevices]           = useState({});
  const [loadingDirs, setLoadingDirs]   = useState(new Set());
  const [stats, setStats]               = useState({});
  const [searchQuery, setSearchQuery]   = useState('');
  const [typeFilter, setTypeFilter]     = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [syncing, setSyncing]           = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [loadingList, setLoadingList]   = useState(true);

  const H = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  const loadDirectorates = useCallback(() => {
    setLoadingList(true);
    Promise.all([
      fetch(`${API}/api/inventory/stats`,          { headers: H() }).then(r => r.json()),
      fetch(`${API}/api/inventory/by-directorate`, { headers: H() }).then(r => r.json()),
    ]).then(([s, d]) => {
      setStats(s);
      setDirectorates(Array.isArray(d) ? d : []);
    }).catch(() => {}).finally(() => setLoadingList(false));
  }, []);

  useEffect(() => { loadDirectorates(); }, [loadDirectorates]);

  const toggleDir = useCallback(async (directorate) => {
    if (openDirs[directorate]) {
      setOpenDirs(p => ({ ...p, [directorate]: false }));
      return;
    }
    setOpenDirs(p => ({ ...p, [directorate]: true }));
    if (devices[directorate]) return;

    setLoadingDirs(p => new Set([...p, directorate]));
    try {
      const params = new URLSearchParams({ directorate, limit: '500' });
      if (typeFilter   !== 'all') params.append('type',   typeFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const r    = await fetch(`${API}/api/inventory?${params}`, { headers: H() });
      const data = await r.json();
      setDevices(p => ({ ...p, [directorate]: data.devices || [] }));
    } catch (e) { console.error(e); }
    finally {
      setLoadingDirs(p => { const s = new Set(p); s.delete(directorate); return s; });
    }
  }, [openDirs, devices, typeFilter, statusFilter]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) { setSearchResults(null); return; }
    const r    = await fetch(`${API}/api/inventory?search=${encodeURIComponent(searchQuery)}&limit=200`, { headers: H() });
    const data = await r.json();
    setSearchResults(data.devices || []);
  };

  const handleEpcSync = async () => {
    setSyncing('epc');
    try {
      const r    = await fetch(`${API}/api/servicedesk/sync`, { method: 'POST', headers: H() });
      const data = await r.json();
      alert(`EPC Sync: ${data.updated || 0} güncellendi, ${data.created || 0} eklendi`);
      setDevices({});
      loadDirectorates();
    } catch (e) { alert('Hata: ' + e.message); }
    setSyncing('');
  };

  const handleAdSync = async () => {
    setSyncing('ad');
    try {
      const r    = await fetch(`${API}/api/inventory/sync`, { method: 'POST', headers: H() });
      const data = await r.json();
      alert(`AD Sync: ${data.synced || 0} cihaz`);
      setDevices({});
      loadDirectorates();
    } catch (e) { alert('Hata: ' + e.message); }
    setSyncing('');
  };

  const byType = stats.totalByType || {};

  return (
    <div style={{ padding: '24px', fontFamily: 'Inter, sans-serif' }}>

      {/* Başlık */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Envanter</h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>Daire bazlı cihaz yönetimi</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleEpcSync} disabled={!!syncing} style={{
            padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
            background: '#7c3aed', color: 'white', border: 'none', cursor: syncing ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px', opacity: syncing === 'epc' ? 0.7 : 1,
          }}>
            <RefreshCw size={14} />
            {syncing === 'epc' ? 'Senkronize ediliyor...' : "EPC'den Senkronize Et"}
          </button>
          <button onClick={handleAdSync} disabled={!!syncing} style={{
            padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
            background: '#1e40af', color: 'white', border: 'none', cursor: syncing ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px', opacity: syncing === 'ad' ? 0.7 : 1,
          }}>
            <RefreshCw size={14} />
            {syncing === 'ad' ? 'Senkronize ediliyor...' : "AD'den Senkronize Et"}
          </button>
        </div>
      </div>

      {/* Özet kartlar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { icon: '🖥️', label: 'Bilgisayar',    value: byType.BILGISAYAR || 0,      color: '#1e40af' },
          { icon: '💻', label: 'Dizüstü',        value: byType.DIZUSTU    || 0,      color: '#7c3aed' },
          { icon: '📞', label: 'IP Telefon',     value: byType.IP_TELEFON || 0,      color: '#0891b2' },
          { icon: '🖨️', label: 'Yazıcı',         value: byType.YAZICI     || 0,      color: '#059669' },
          { icon: '📅', label: 'Bugün Eklenen',  value: `+${stats.addedToday || 0}`, color: '#d97706' },
        ].map((c, i) => (
          <div key={i} style={{ ...cardStyle, borderLeft: `4px solid ${c.color}` }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>
              {c.icon} {c.label}
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a' }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Arama ve filtreler */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Cihaz adı, seri no, kullanıcı, IP..."
            style={{
              width: '100%', height: '40px', paddingLeft: '36px', paddingRight: '12px',
              border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        </div>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setDevices({}); setOpenDirs({}); }}
          style={{ height: '40px', padding: '0 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', background: 'white' }}>
          <option value="all">Tüm Tipler</option>
          <option value="BILGISAYAR">Bilgisayar</option>
          <option value="DIZUSTU">Dizüstü</option>
          <option value="IP_TELEFON">IP Telefon</option>
          <option value="YAZICI">Yazıcı</option>
          <option value="SUNUCU">Sunucu</option>
          <option value="SWITCH">Switch</option>
          <option value="ACCESS_POINT">Access Point</option>
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setDevices({}); setOpenDirs({}); }}
          style={{ height: '40px', padding: '0 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', background: 'white' }}>
          <option value="all">Tüm Durumlar</option>
          <option value="ACTIVE">Aktif</option>
          <option value="PASSIVE">Pasif</option>
          <option value="BROKEN">Arızalı</option>
        </select>
        <button onClick={handleSearch} style={{
          height: '40px', padding: '0 16px', background: '#1e40af', color: 'white',
          border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
        }}>Ara</button>
        {searchResults && (
          <button onClick={() => { setSearchResults(null); setSearchQuery(''); }} style={{
            height: '40px', padding: '0 12px', background: '#f1f5f9', color: '#64748b',
            border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
          }}>✕ Temizle</button>
        )}
      </div>

      {/* Arama sonuçları */}
      {searchResults && (
        <div style={{ ...cardStyle, marginBottom: '16px', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Arama Sonuçları — {searchResults.length} cihaz
          </div>
          <DeviceTable devices={searchResults} />
        </div>
      )}

      {/* Daire accordion */}
      {!searchResults && (
        loadingList ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8', fontSize: '14px' }}>
            Yükleniyor...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {directorates.map(dir => {
              const isOpen    = !!openDirs[dir.directorate];
              const isLoading = loadingDirs.has(dir.directorate);
              const dirDevs   = devices[dir.directorate] || [];

              return (
                <div key={dir.directorate} style={{
                  background: 'white', borderRadius: '12px', overflow: 'hidden',
                  border: `1px solid ${isOpen ? '#c7d2fe' : '#e2e8f0'}`,
                }}>
                  <div
                    onClick={() => toggleDir(dir.directorate)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 20px', cursor: 'pointer', userSelect: 'none',
                      background: isOpen ? '#f8fafc' : 'white',
                      borderBottom: isOpen ? '1px solid #e2e8f0' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {isOpen
                        ? <ChevronDown  size={15} color="#6366f1" />
                        : <ChevronRight size={15} color="#94a3b8" />
                      }
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                        {dir.directorate}
                      </span>
                      <span style={{ fontSize: '11px', color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                        {dir.total} cihaz
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: '#94a3b8', alignItems: 'center' }}>
                      {dir.bilgisayar  > 0 && <span>🖥️ {dir.bilgisayar}</span>}
                      {dir.dizustu    > 0 && <span>💻 {dir.dizustu}</span>}
                      {dir.ip_telefon > 0 && <span>📞 {dir.ip_telefon}</span>}
                      {dir.yazici     > 0 && <span>🖨️ {dir.yazici}</span>}
                      {dir.diger      > 0 && <span>📦 {dir.diger}</span>}
                      {dir.online     > 0 && (
                        <span style={{ color: '#16a34a', background: '#dcfce7', padding: '2px 7px', borderRadius: '8px', fontSize: '11px', fontWeight: 600 }}>
                          🟢 {dir.online}
                        </span>
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    isLoading ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                        Yükleniyor...
                      </div>
                    ) : dirDevs.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                        Bu daire için cihaz bulunamadı
                      </div>
                    ) : (
                      <DeviceTable devices={dirDevs} />
                    )
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

const tdStyle = { padding: '10px 16px', borderBottom: '1px solid #f1f5f9' };
const Dash    = () => <span style={{ color: '#cbd5e1' }}>—</span>;

function DeviceTable({ devices }) {
  const cols = ['Cihaz Adı', 'Tip', 'Kullanıcı', 'Müdürlük', 'IP Adresi', 'Model', 'EPC Durumu'];
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            {cols.map(h => (
              <th key={h} style={{
                padding: '10px 16px', textAlign: 'left', whiteSpace: 'nowrap',
                fontSize: '11px', fontWeight: 700, color: '#64748b',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                borderBottom: '1px solid #e2e8f0',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {devices.map((d, i) => {
            const epc = EPC_BADGE[d.epcStatus] || EPC_BADGE.unknown;
            return (
              <tr key={d.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                <td style={tdStyle}><span style={{ fontWeight: 600, color: '#0f172a' }}>{d.name}</span></td>
                <td style={tdStyle}>
                  <span style={{ background: '#eff6ff', color: '#1e40af', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {TYPE_ICONS[d.type] || '📦'} {d.type}
                  </span>
                </td>
                <td style={{ ...tdStyle, color: '#475569' }}>{d.userName || d.assignedTo || <Dash />}</td>
                <td style={{ ...tdStyle, color: '#64748b', fontSize: '12px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.userDepartment || <Dash />}
                </td>
                <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '12px', color: '#475569' }}>
                  {d.ipAddress || <Dash />}
                </td>
                <td style={{ ...tdStyle, color: '#64748b', fontSize: '12px' }}>{d.model || <Dash />}</td>
                <td style={tdStyle}>
                  <span style={{
                    background: epc.bg, color: epc.color, padding: '3px 8px',
                    borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: epc.color, display: 'inline-block' }} />
                    {epc.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
