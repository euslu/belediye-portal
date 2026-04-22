import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Search, ChevronDown, ChevronRight } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';

const API = import.meta.env.VITE_API_URL || '';

const TYPE_ICONS = {
  BILGISAYAR: '🖥️', DIZUSTU: '💻', IP_TELEFON: '📞', YAZICI: '🖨️',
  SWITCH: '🔀', ACCESS_POINT: '📡', SUNUCU: '🗄️', MONITOR: '🖵',
  IPAD_TABLET: '📱', UPS: '🔋', DIGER: '📦',
};

const EPC_BADGE = {
  online:  { color: '#16a34a', bg: '#dcfce7', label: 'Çevrimiçi' },
  passive: { color: '#d97706', bg: '#fef3c7', label: 'Pasif' },
  offline: { color: '#dc2626', bg: '#fee2e2', label: 'Çevrimdışı' },
  unknown: { color: '#94a3b8', bg: '#f1f5f9', label: 'Bilinmiyor' },
};

const cardStyle = {
  background: '#fff', borderRadius: 14, padding: '20px 24px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9',
};

export default function EnvanterCihazlar() {
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
  const baseField = { height: 38, padding: '0 12px', fontSize: 13, border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', color: '#1e293b', outline: 'none', boxSizing: 'border-box' };
  const btnSync = (bg, active) => ({
    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    background: bg, color: '#fff', border: 'none', cursor: syncing ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', gap: 6, opacity: active ? 0.7 : 1,
  });

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1200, margin: '0 auto' }}>
      <PageHeader title="Cihazlar" icon={<i className="bi bi-pc-display" style={{ fontSize: 22 }} />} />

      {/* Özet kartlar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginTop: 20 }}>
        {[
          { icon: '🖥️', label: 'Bilgisayar',   value: byType.BILGISAYAR || 0,     color: '#1e40af' },
          { icon: '💻', label: 'Dizüstü',       value: byType.DIZUSTU    || 0,     color: '#7c3aed' },
          { icon: '📞', label: 'IP Telefon',    value: byType.IP_TELEFON || 0,     color: '#0891b2' },
          { icon: '🖨️', label: 'Yazıcı',        value: byType.YAZICI     || 0,     color: '#059669' },
          { icon: '📅', label: 'Bugün Eklenen', value: `+${stats.addedToday || 0}`, color: '#d97706' },
        ].map((c, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 16, textAlign: 'center', border: '1px solid #f1f5f9', borderLeft: `4px solid ${c.color}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
              {c.icon} {c.label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a' }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Arama, filtre, sync */}
      <div style={{ ...cardStyle, marginTop: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ position: 'relative' }}>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Cihaz adı, seri no, kullanıcı, IP..."
                style={{ ...baseField, width: '100%', paddingLeft: 36 }}
              />
              <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>
          </div>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setDevices({}); setOpenDirs({}); }}
            style={baseField}>
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
            style={baseField}>
            <option value="all">Tüm Durumlar</option>
            <option value="ACTIVE">Aktif</option>
            <option value="PASSIVE">Pasif</option>
            <option value="BROKEN">Arızalı</option>
          </select>
          <button onClick={handleSearch} style={{ ...baseField, background: '#1e40af', color: '#fff', fontWeight: 600, cursor: 'pointer', border: 'none', padding: '0 16px' }}>Ara</button>
          {searchResults && (
            <button onClick={() => { setSearchResults(null); setSearchQuery(''); }} style={{ ...baseField, cursor: 'pointer', padding: '0 12px' }}>✕ Temizle</button>
          )}
          <div style={{ flex: '0 0 auto', display: 'flex', gap: 8 }}>
            <button onClick={handleEpcSync} disabled={!!syncing} style={btnSync('#7c3aed', syncing === 'epc')}>
              <RefreshCw size={14} />
              {syncing === 'epc' ? 'Sync...' : 'EPC Sync'}
            </button>
            <button onClick={handleAdSync} disabled={!!syncing} style={btnSync('#1e40af', syncing === 'ad')}>
              <RefreshCw size={14} />
              {syncing === 'ad' ? 'Sync...' : 'AD Sync'}
            </button>
          </div>
        </div>
      </div>

      {/* Arama sonuçları */}
      {searchResults && (
        <div style={{ ...cardStyle, marginTop: 16, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 24px', borderBottom: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Arama Sonuçları — {searchResults.length} cihaz
          </div>
          <DeviceTable devices={searchResults} />
        </div>
      )}

      {/* Daire accordion */}
      {!searchResults && (
        <div style={{ marginTop: 16 }}>
          {loadingList ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8', fontSize: 14 }}>Yükleniyor...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {directorates.map(dir => {
                const isOpen    = !!openDirs[dir.directorate];
                const isLoading = loadingDirs.has(dir.directorate);
                const dirDevs   = devices[dir.directorate] || [];

                return (
                  <div key={dir.directorate} style={{
                    background: '#fff', borderRadius: 12, overflow: 'hidden',
                    border: `1px solid ${isOpen ? '#c7d2fe' : '#e2e8f0'}`,
                  }}>
                    <div
                      onClick={() => toggleDir(dir.directorate)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 20px', cursor: 'pointer', userSelect: 'none',
                        background: isOpen ? '#f8fafc' : '#fff',
                        borderBottom: isOpen ? '1px solid #e2e8f0' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {isOpen ? <ChevronDown size={15} color="#6366f1" /> : <ChevronRight size={15} color="#94a3b8" />}
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{dir.directorate}</span>
                        <span style={{ fontSize: 11, color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                          {dir.total} cihaz
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#94a3b8', alignItems: 'center' }}>
                        {dir.bilgisayar > 0 && <span>🖥️ {dir.bilgisayar}</span>}
                        {dir.dizustu > 0 && <span>💻 {dir.dizustu}</span>}
                        {dir.ip_telefon > 0 && <span>📞 {dir.ip_telefon}</span>}
                        {dir.yazici > 0 && <span>🖨️ {dir.yazici}</span>}
                        {dir.diger > 0 && <span>📦 {dir.diger}</span>}
                        {dir.online > 0 && (
                          <span style={{ color: '#16a34a', background: '#dcfce7', padding: '2px 7px', borderRadius: 8, fontSize: 11, fontWeight: 600 }}>
                            🟢 {dir.online}
                          </span>
                        )}
                      </div>
                    </div>

                    {isOpen && (
                      isLoading ? (
                        <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Yükleniyor...</div>
                      ) : dirDevs.length === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Bu daire için cihaz bulunamadı</div>
                      ) : (
                        <DeviceTable devices={dirDevs} />
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            {cols.map(h => (
              <th key={h} style={{
                padding: '10px 16px', textAlign: 'left', whiteSpace: 'nowrap',
                fontSize: 11, fontWeight: 700, color: '#64748b',
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
              <tr key={d.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                <td style={tdStyle}><span style={{ fontWeight: 600, color: '#0f172a' }}>{d.name}</span></td>
                <td style={tdStyle}>
                  <span style={{ background: '#eff6ff', color: '#1e40af', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {TYPE_ICONS[d.type] || '📦'} {d.type}
                  </span>
                </td>
                <td style={{ ...tdStyle, color: '#475569' }}>{d.userName || d.assignedTo || <Dash />}</td>
                <td style={{ ...tdStyle, color: '#64748b', fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.userDepartment || <Dash />}
                </td>
                <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12, color: '#475569' }}>{d.ipAddress || <Dash />}</td>
                <td style={{ ...tdStyle, color: '#64748b', fontSize: 12 }}>{d.model || <Dash />}</td>
                <td style={tdStyle}>
                  <span style={{
                    background: epc.bg, color: epc.color, padding: '3px 8px',
                    borderRadius: 6, fontSize: 11, fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
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
