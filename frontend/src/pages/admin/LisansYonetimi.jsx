import { useState, useEffect, useRef, useMemo } from 'react';

const API = import.meta.env.VITE_API_URL || '';
const H = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const PAGE_SIZE = 30;

const cardStyle = {
  background: 'white', borderRadius: '14px', padding: '24px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.03)',
};

const inputStyle = {
  height: '40px', padding: '0 14px', border: '1.5px solid #e2e8f0',
  borderRadius: '10px', fontSize: '13px', outline: 'none', width: '100%',
  boxSizing: 'border-box', background: '#fafbfc',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

const btnStyle = (bg, disabled) => ({
  padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
  background: disabled ? '#cbd5e1' : bg, color: 'white', border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  transition: 'all 0.15s ease',
  boxShadow: disabled ? 'none' : `0 1px 3px ${bg}44`,
});

const thStyle = {
  padding: '12px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b',
  background: '#f8fafc', borderBottom: '2px solid #e2e8f0',
};

export default function LisansYonetimi() {
  const [devices, setDevices] = useState([]);
  const [toplam, setToplam] = useState(0);
  const [sayfa, setSayfa] = useState(1);
  const [toplamSayfa, setToplamSayfa] = useState(1);
  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [loading, setLoading] = useState(false);

  // Sekme: 'devices' (cihaz bazlı) veya 'records' (kalıcı kayıtlar)
  const [tab, setTab] = useState('devices');

  // Lisans Kayıtları tablosu
  const [records, setRecords] = useState([]);
  const [recordsToplam, setRecordsToplam] = useState(0);
  const [recordsSayfa, setRecordsSayfa] = useState(1);
  const [recordsToplamSayfa, setRecordsToplamSayfa] = useState(1);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  // Yazılım Kataloğu (DB tabanlı)
  const [catalog, setCatalog] = useState([]);
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [newSw, setNewSw] = useState({ name: '', category: '', totalLicenses: '' });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: '', category: '', totalLicenses: '' });
  const fileInputRef = useRef(null);

  // Lisans ekleme state
  const [addingFor, setAddingFor] = useState(null);
  const [selectedSoftware, setSelectedSoftware] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [customName, setCustomName] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [baslangicTarihi, setBaslangicTarihi] = useState('');
  const [bitisTarihi, setBitisTarihi] = useState('');
  const [sinirsiz, setSinirsiz] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearchDebounce(search); setSayfa(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch devices
  useEffect(() => { if (tab === 'devices') fetchDevices(); }, [sayfa, searchDebounce, tab]);

  // Fetch records
  useEffect(() => { if (tab === 'records') fetchRecords(); }, [recordsSayfa, searchDebounce, tab, showInactive]);

  // Fetch catalog when panel opens
  useEffect(() => { if (showCatalog) fetchCatalog(); }, [showCatalog]);

  // Initial catalog fetch for dropdown
  useEffect(() => { fetchCatalog(); }, []);

  async function fetchCatalog() {
    setCatalogLoading(true);
    try {
      const res = await fetch(`${API}/api/inventory/software-catalog`, { headers: H() });
      const data = await res.json();
      setCatalog(data);
    } catch (e) { console.error(e); }
    setCatalogLoading(false);
  }

  async function fetchDevices() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sayfa, limit: PAGE_SIZE });
      if (searchDebounce) params.set('search', searchDebounce);
      const res = await fetch(`${API}/api/inventory/license-management?${params}`, { headers: H() });
      const data = await res.json();
      setDevices(data.devices || []);
      setToplam(data.toplam || 0);
      setToplamSayfa(data.toplamSayfa || 1);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function fetchRecords() {
    setRecordsLoading(true);
    try {
      const params = new URLSearchParams({ sayfa: recordsSayfa, limit: PAGE_SIZE });
      if (searchDebounce) params.set('search', searchDebounce);
      if (showInactive) params.set('showInactive', 'true');
      const res = await fetch(`${API}/api/inventory/license-records?${params}`, { headers: H() });
      const data = await res.json();
      setRecords(data.records || []);
      setRecordsToplam(data.toplam || 0);
      setRecordsToplamSayfa(data.toplamSayfa || 1);
    } catch (e) { console.error(e); }
    setRecordsLoading(false);
  }

  // Katalog CRUD
  async function handleAddSoftware() {
    if (!newSw.name.trim()) return;
    try {
      const res = await fetch(`${API}/api/inventory/software-catalog`, {
        method: 'POST', headers: { ...H(), 'Content-Type': 'application/json' },
        body: JSON.stringify(newSw),
      });
      if (res.ok) {
        setNewSw({ name: '', category: '', totalLicenses: '' });
        fetchCatalog();
      } else {
        const err = await res.json();
        alert(err.error || 'Hata oluştu');
      }
    } catch (e) { console.error(e); }
  }

  async function handleUpdateSoftware(id) {
    try {
      const res = await fetch(`${API}/api/inventory/software-catalog/${id}`, {
        method: 'PUT', headers: { ...H(), 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      if (res.ok) {
        setEditingId(null);
        fetchCatalog();
      } else {
        const err = await res.json();
        alert(err.error || 'Hata oluştu');
      }
    } catch (e) { console.error(e); }
  }

  async function handleDeleteSoftware(id, name) {
    if (!confirm(`"${name}" kataloğdan silinecek. Emin misiniz?`)) return;
    try {
      await fetch(`${API}/api/inventory/software-catalog/${id}`, { method: 'DELETE', headers: H() });
      fetchCatalog();
    } catch (e) { console.error(e); }
  }

  async function handleExcelImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API}/api/inventory/software-catalog/import`, {
        method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Import tamamlandı: ${data.created} eklendi/güncellendi, ${data.skipped} atlandı`);
        fetchCatalog();
      } else {
        alert(data.error || 'Import başarısız');
      }
    } catch (e) { console.error(e); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // Lisans ekle
  async function handleAddLicense(deviceId) {
    const name = showCustom ? customName.trim() : selectedSoftware;
    if (!name) return;
    try {
      await fetch(`${API}/api/inventory/${deviceId}/licenses`, {
        method: 'POST', headers: { ...H(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          key: licenseKey.trim() || null,
          baslangicTarihi: baslangicTarihi || null,
          bitisTarihi: sinirsiz ? null : (bitisTarihi || null),
          sinirsiz,
        }),
      });
      setAddingFor(null);
      setSelectedSoftware('');
      setLicenseKey('');
      setCustomName('');
      setShowCustom(false);
      setBaslangicTarihi('');
      setBitisTarihi('');
      setSinirsiz(false);
      fetchDevices();
      fetchCatalog();
    } catch (e) { console.error(e); }
  }

  // Lisans sil
  async function handleDeleteLicense(licenseId) {
    if (!confirm('Bu lisansı silmek istediğinize emin misiniz?')) return;
    try {
      await fetch(`${API}/api/inventory/licenses/${licenseId}`, { method: 'DELETE', headers: H() });
      fetchDevices();
      fetchCatalog();
    } catch (e) { console.error(e); }
  }

  // Stok badge rengi
  function stockBadge(remaining, total) {
    if (total === 0) return { bg: '#f1f5f9', color: '#64748b' };
    if (remaining <= 0) return { bg: '#fef2f2', color: '#dc2626' };
    if (remaining <= Math.ceil(total * 0.2)) return { bg: '#fffbeb', color: '#d97706' };
    return { bg: '#ecfdf5', color: '#059669' };
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
            <i className="bi bi-key" style={{ marginRight: 10, color: '#6366f1' }} />
            Lisans Yönetimi
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
            Kullanıcı eşleşmesi olan cihazların yazılım lisansları
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            background: '#f0f9ff', color: '#0369a1', padding: '6px 14px',
            borderRadius: 8, fontSize: 13, fontWeight: 600,
          }}>
            <i className="bi bi-pc-display" style={{ marginRight: 5 }} />
            {tab === 'devices' ? toplam : recordsToplam} {tab === 'devices' ? 'cihaz' : 'kayıt'}
          </span>
          <button onClick={() => setShowCatalog(!showCatalog)} style={btnStyle('#6366f1', false)}>
            <i className={showCatalog ? 'bi bi-x-lg' : 'bi bi-plus-lg'} /> Yazılım Kataloğu
          </button>
        </div>
      </div>

      {/* ════════ Katalog Paneli ════════ */}
      {showCatalog && (
        <div style={{ ...cardStyle, marginBottom: 16, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="bi bi-bookmark-plus" style={{ color: '#6366f1', fontSize: 18 }} />
              <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Yazılım Kataloğu Yönetimi</span>
              <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 8 }}>
                {catalog.length} yazılım
              </span>
            </div>
            <div>
              <input type="file" ref={fileInputRef} accept=".xlsx,.xls" onChange={handleExcelImport}
                style={{ display: 'none' }} />
              <button onClick={() => fileInputRef.current?.click()} style={btnStyle('#0ea5e9', false)}>
                <i className="bi bi-file-earmark-excel" /> Excel Yükle
              </button>
            </div>
          </div>

          {/* Manuel ekleme formu */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'end' }}>
            <div style={{ flex: '1 1 220px' }}>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4, display: 'block' }}>Yazılım Adı *</label>
              <input type="text" placeholder="ör: Photoshop 2025"
                value={newSw.name} onChange={e => setNewSw({ ...newSw, name: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleAddSoftware()}
                style={{ ...inputStyle, height: 38 }} />
            </div>
            <div style={{ flex: '0 1 160px' }}>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4, display: 'block' }}>Kategori</label>
              <input type="text" placeholder="ör: CAD"
                value={newSw.category} onChange={e => setNewSw({ ...newSw, category: e.target.value })}
                style={{ ...inputStyle, height: 38 }} />
            </div>
            <div style={{ flex: '0 1 120px' }}>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4, display: 'block' }}>Toplam Lisans</label>
              <input type="number" min="0" placeholder="0"
                value={newSw.totalLicenses} onChange={e => setNewSw({ ...newSw, totalLicenses: e.target.value })}
                style={{ ...inputStyle, height: 38 }} />
            </div>
            <button onClick={handleAddSoftware} disabled={!newSw.name.trim()} style={btnStyle('#10b981', !newSw.name.trim())}>
              <i className="bi bi-plus" /> Ekle
            </button>
          </div>

          {/* Katalog tablosu */}
          {catalogLoading ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
              <i className="bi bi-arrow-clockwise spin" style={{ fontSize: 18 }} /> Yükleniyor...
            </div>
          ) : (
            <div style={{ borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden', maxHeight: 400, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    <th style={thStyle}>Yazılım</th>
                    <th style={thStyle}>Kategori</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Toplam</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Kullanılan</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Kalan</th>
                    <th style={{ ...thStyle, width: 100, textAlign: 'center' }}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {catalog.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                      Katalogda yazılım yok
                    </td></tr>
                  )}
                  {catalog.map((sw, idx) => {
                    const badge = stockBadge(sw.remaining, sw.totalLicenses);
                    const isEditing = editingId === sw.id;
                    return (
                      <tr key={sw.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafbfc', borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 14px', fontWeight: 600, color: '#0f172a' }}>
                          {isEditing ? (
                            <input type="text" value={editData.name}
                              onChange={e => setEditData({ ...editData, name: e.target.value })}
                              style={{ ...inputStyle, height: 30, fontSize: 12 }} />
                          ) : sw.name}
                        </td>
                        <td style={{ padding: '8px 14px', color: '#64748b' }}>
                          {isEditing ? (
                            <input type="text" value={editData.category}
                              onChange={e => setEditData({ ...editData, category: e.target.value })}
                              style={{ ...inputStyle, height: 30, fontSize: 12 }} />
                          ) : (
                            sw.category && <span style={{
                              background: '#f1f5f9', padding: '2px 8px', borderRadius: 4, fontSize: 11,
                            }}>{sw.category}</span>
                          )}
                        </td>
                        <td style={{ padding: '8px 14px', textAlign: 'center', fontWeight: 600 }}>
                          {isEditing ? (
                            <input type="number" min="0" value={editData.totalLicenses}
                              onChange={e => setEditData({ ...editData, totalLicenses: e.target.value })}
                              style={{ ...inputStyle, height: 30, fontSize: 12, width: 70, textAlign: 'center' }} />
                          ) : sw.totalLicenses}
                        </td>
                        <td style={{ padding: '8px 14px', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>
                          {sw.usedCount}
                        </td>
                        <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 10px', borderRadius: 6,
                            fontWeight: 700, fontSize: 12,
                            background: badge.bg, color: badge.color,
                          }}>
                            {sw.totalLicenses === 0 ? '-' : sw.remaining}
                          </span>
                        </td>
                        <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                              <button onClick={() => handleUpdateSoftware(sw.id)}
                                style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: '#10b981', color: 'white', border: 'none', cursor: 'pointer' }}>
                                <i className="bi bi-check" />
                              </button>
                              <button onClick={() => setEditingId(null)}
                                style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: '#94a3b8', color: 'white', border: 'none', cursor: 'pointer' }}>
                                <i className="bi bi-x" />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                              <button onClick={() => { setEditingId(sw.id); setEditData({ name: sw.name, category: sw.category || '', totalLicenses: sw.totalLicenses }); }}
                                style={{ padding: '4px 8px', borderRadius: 6, fontSize: 12, background: 'transparent', border: '1px solid #e2e8f0', cursor: 'pointer', color: '#6366f1' }}
                                title="Düzenle">
                                <i className="bi bi-pencil" />
                              </button>
                              <button onClick={() => handleDeleteSoftware(sw.id, sw.name)}
                                style={{ padding: '4px 8px', borderRadius: 6, fontSize: 12, background: 'transparent', border: '1px solid #e2e8f0', cursor: 'pointer', color: '#ef4444' }}
                                title="Sil">
                                <i className="bi bi-trash" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>
            Excel formatı: Yazılım Adı | Kategori | Toplam Lisans (ilk satır başlık)
          </div>
        </div>
      )}

      {/* Sekme + Arama */}
      <div style={{ ...cardStyle, marginBottom: 16, padding: '12px 20px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {[
            { key: 'devices', label: 'Cihaz Bazlı', icon: 'bi-pc-display' },
            { key: 'records', label: 'Lisans Kayıtları (Kalıcı)', icon: 'bi-shield-check' },
          ].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setSayfa(1); setRecordsSayfa(1); }}
              style={{
                padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: tab === t.key ? '#6366f1' : '#f1f5f9',
                color: tab === t.key ? 'white' : '#64748b',
                border: 'none', cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: tab === t.key ? '0 2px 8px #6366f133' : 'none',
              }}>
              <i className={`bi ${t.icon}`} style={{ marginRight: 6 }} />
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative' }}>
          <i className="bi bi-search" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 14 }} />
          <input
            type="text"
            placeholder="Cihaz adı, kullanıcı, birim veya lisans ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 40 }}
          />
        </div>
      </div>

      {/* ════════ Lisans Kayıtları Tablosu (Kalıcı) ════════ */}
      {tab === 'records' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
              <i className="bi bi-shield-check" style={{ marginRight: 4, color: '#6366f1' }} />
              Bu tablo eşleşme bağımsızdır. Cihaz atamaları kaybolsa bile lisans kayıtları burada korunur.
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', cursor: 'pointer' }}>
              <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} style={{ accentColor: '#6366f1' }} />
              Silinen lisansları göster
            </label>
          </div>

          {recordsLoading ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
              <i className="bi bi-arrow-clockwise spin" style={{ fontSize: 20 }} /> Yükleniyor...
            </div>
          ) : (
            <div style={{ borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Kullanıcı</th>
                    <th style={thStyle}>Cihaz</th>
                    <th style={thStyle}>Birim</th>
                    <th style={thStyle}>Lisans</th>
                    <th style={thStyle}>Anahtar</th>
                    <th style={thStyle}>Tarih</th>
                    <th style={{ ...thStyle, width: 70 }}>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                      {search ? 'Aramayla eşleşen kayıt bulunamadı' : 'Henüz lisans kaydı yok'}
                    </td></tr>
                  )}
                  {records.map((r, idx) => (
                    <tr key={r.id} style={{ background: !r.active ? '#fef2f2' : idx % 2 === 0 ? '#fff' : '#fafbfc', borderBottom: '1px solid #f1f5f9', opacity: r.active ? 1 : 0.7 }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>
                        <i className="bi bi-person-fill" style={{ color: '#6366f1', marginRight: 5 }} />
                        {r.username || <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>Atanmamış</span>}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          background: '#f1f5f9', padding: '3px 8px', borderRadius: 6,
                          fontSize: 12, fontWeight: 600, color: '#334155',
                        }}>
                          <i className="bi bi-pc-display" style={{ fontSize: 11, color: '#64748b' }} />
                          {r.deviceName}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b' }}>
                        {r.directorate && <div>{r.directorate}</div>}
                        {r.department && <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.department}</div>}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>
                        {r.licenseName}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>
                        {r.licenseKey ? `${r.licenseKey.slice(0, 12)}${r.licenseKey.length > 12 ? '...' : ''}` : '-'}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 11, color: '#64748b' }}>
                        {r.sinirsiz ? (
                          <span style={{ color: '#6366f1', fontWeight: 600 }}>Süresiz</span>
                        ) : (
                          <>
                            {r.baslangicTarihi && <div>{new Date(r.baslangicTarihi).toLocaleDateString('tr')}</div>}
                            {r.bitisTarihi && <div style={{ color: new Date(r.bitisTarihi) < new Date() ? '#ef4444' : '#64748b' }}>
                              → {new Date(r.bitisTarihi).toLocaleDateString('tr')}
                            </div>}
                          </>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 10px', borderRadius: 6,
                          fontWeight: 700, fontSize: 11,
                          background: r.active ? '#ecfdf5' : '#fef2f2',
                          color: r.active ? '#059669' : '#dc2626',
                        }}>
                          {r.active ? 'Aktif' : 'Silindi'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Sayfalama */}
          {recordsToplamSayfa > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
              <button onClick={() => setRecordsSayfa(s => Math.max(1, s - 1))} disabled={recordsSayfa <= 1}
                style={{ ...btnStyle('#6366f1', recordsSayfa <= 1), padding: '6px 14px', fontSize: 12 }}>
                <i className="bi bi-chevron-left" /> Önceki
              </button>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                {recordsSayfa} / {recordsToplamSayfa}
              </span>
              <button onClick={() => setRecordsSayfa(s => Math.min(recordsToplamSayfa, s + 1))} disabled={recordsSayfa >= recordsToplamSayfa}
                style={{ ...btnStyle('#6366f1', recordsSayfa >= recordsToplamSayfa), padding: '6px 14px', fontSize: 12 }}>
                Sonraki <i className="bi bi-chevron-right" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ════════ Cihaz Bazlı Tablo ════════ */}
      {tab === 'devices' && <div style={cardStyle}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
            <i className="bi bi-arrow-clockwise spin" style={{ fontSize: 20 }} /> Yükleniyor...
          </div>
        )}
        {!loading && (
          <div style={{ borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Kullanıcı</th>
                  <th style={thStyle}>Cihaz</th>
                  <th style={thStyle}>Birim</th>
                  <th style={{ ...thStyle, minWidth: 300 }}>Lisanslar</th>
                  <th style={{ ...thStyle, width: 100 }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {devices.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                    {search ? 'Aramayla eşleşen cihaz bulunamadı' : 'Kullanıcı eşleşmesi olan cihaz bulunamadı'}
                  </td></tr>
                )}
                {devices.map((d, idx) => (
                  <tr key={d.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafbfc', borderBottom: '1px solid #f1f5f9' }}>
                    {/* Kullanıcı */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
                        <i className="bi bi-person-fill" style={{ color: '#6366f1', marginRight: 5 }} />
                        {d.assignedTo}
                      </div>
                    </td>

                    {/* Cihaz */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: '#f1f5f9', padding: '4px 10px', borderRadius: 7,
                        fontSize: 12, fontWeight: 600, color: '#334155',
                      }}>
                        <i className="bi bi-pc-display" style={{ fontSize: 11, color: '#64748b' }} />
                        {d.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                        {d.type === 'DIZUSTU' ? 'Dizüstü' : 'Masaüstü'}
                      </div>
                    </td>

                    {/* Birim */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'top', fontSize: 12, color: '#64748b' }}>
                      {d.directorate && <div>{d.directorate}</div>}
                      {d.department && <div style={{ fontSize: 11, color: '#94a3b8' }}>{d.department}</div>}
                    </td>

                    {/* Lisanslar */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {d.licenses.map(lic => (
                          <span key={lic.id} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: '#ecfdf5', color: '#059669', padding: '4px 10px',
                            borderRadius: 6, fontSize: 12, fontWeight: 500,
                          }}>
                            <i className="bi bi-check-circle-fill" style={{ fontSize: 10 }} />
                            {lic.name}
                            {lic.key && <span style={{ color: '#94a3b8', fontSize: 10, marginLeft: 2 }}>({lic.key.slice(0, 8)}...)</span>}
                            {lic.sinirsiz && <span style={{ color: '#6366f1', fontSize: 9, marginLeft: 2 }}>Süresiz</span>}
                            {!lic.sinirsiz && lic.bitisTarihi && (() => {
                              const bitis = new Date(lic.bitisTarihi);
                              const kalan = Math.ceil((bitis - new Date()) / 86400000);
                              if (kalan < 0) return <span style={{ color: '#ef4444', fontSize: 9, marginLeft: 2 }}>Süresi doldu</span>;
                              if (kalan <= 30) return <span style={{ color: '#f59e0b', fontSize: 9, marginLeft: 2 }}>{kalan}g kaldı</span>;
                              return <span style={{ color: '#94a3b8', fontSize: 9, marginLeft: 2 }}>{bitis.toLocaleDateString('tr')}</span>;
                            })()}
                            <i className="bi bi-x" style={{
                              cursor: 'pointer', fontSize: 14, color: '#ef4444', marginLeft: 2,
                              opacity: 0.6, transition: 'opacity 0.15s',
                            }} onClick={() => handleDeleteLicense(lic.id)} title="Lisansı sil" />
                          </span>
                        ))}
                        {d.licenses.length === 0 && (
                          <span style={{ color: '#cbd5e1', fontSize: 12, fontStyle: 'italic' }}>Lisans yok</span>
                        )}
                      </div>

                      {/* Lisans ekleme formu */}
                      {addingFor === d.id && (
                        <div style={{
                          marginTop: 10, padding: '12px', background: '#f8fafc',
                          borderRadius: 10, border: '1px solid #e2e8f0',
                        }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'end' }}>
                            {!showCustom ? (
                              <div style={{ flex: '1 1 200px' }}>
                                <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4, display: 'block' }}>Yazılım</label>
                                <select
                                  value={selectedSoftware}
                                  onChange={e => setSelectedSoftware(e.target.value)}
                                  style={{ ...inputStyle, height: 38, background: 'white', cursor: 'pointer' }}
                                >
                                  <option value="">Yazılım seçin...</option>
                                  {catalog.map(sw => {
                                    const badge = stockBadge(sw.remaining, sw.totalLicenses);
                                    const stockInfo = sw.totalLicenses > 0 ? ` (${sw.remaining} kalan)` : '';
                                    return (
                                      <option key={sw.id} value={sw.name}
                                        style={{ color: sw.totalLicenses > 0 && sw.remaining <= 0 ? '#dc2626' : undefined }}>
                                        {sw.name}{stockInfo}
                                      </option>
                                    );
                                  })}
                                </select>
                                {/* Stok uyarısı */}
                                {selectedSoftware && (() => {
                                  const sw = catalog.find(c => c.name === selectedSoftware);
                                  if (sw && sw.totalLicenses > 0 && sw.remaining <= 0) {
                                    return (
                                      <div style={{ marginTop: 4, fontSize: 11, color: '#dc2626', fontWeight: 600 }}>
                                        <i className="bi bi-exclamation-triangle" style={{ marginRight: 4 }} />
                                        Bu yazılımın tüm lisansları kullanımda!
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            ) : (
                              <div style={{ flex: '1 1 200px' }}>
                                <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4, display: 'block' }}>Yazılım Adı</label>
                                <input
                                  type="text"
                                  placeholder="Yazılım adı girin..."
                                  value={customName}
                                  onChange={e => setCustomName(e.target.value)}
                                  style={{ ...inputStyle, height: 38 }}
                                />
                              </div>
                            )}
                            <div style={{ flex: '0 1 180px' }}>
                              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4, display: 'block' }}>Lisans Anahtarı</label>
                              <input
                                type="text"
                                placeholder="Opsiyonel"
                                value={licenseKey}
                                onChange={e => setLicenseKey(e.target.value)}
                                style={{ ...inputStyle, height: 38 }}
                              />
                            </div>
                            <div style={{ flex: '0 1 140px' }}>
                              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4, display: 'block' }}>Başlangıç</label>
                              <input type="date" value={baslangicTarihi} onChange={e => setBaslangicTarihi(e.target.value)}
                                style={{ ...inputStyle, height: 38 }} />
                            </div>
                            <div style={{ flex: '0 1 140px' }}>
                              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4, display: 'block' }}>Bitiş</label>
                              <input type="date" value={bitisTarihi} onChange={e => setBitisTarihi(e.target.value)}
                                disabled={sinirsiz}
                                style={{ ...inputStyle, height: 38, opacity: sinirsiz ? 0.5 : 1 }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingBottom: 2 }}>
                              <input type="checkbox" checked={sinirsiz} onChange={e => { setSinirsiz(e.target.checked); if(e.target.checked) setBitisTarihi(''); }}
                                id={`sinir_${d.id}`} style={{ accentColor: '#6366f1' }} />
                              <label htmlFor={`sinir_${d.id}`} style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', cursor: 'pointer' }}>Süresiz</label>
                            </div>
                            <button onClick={() => handleAddLicense(d.id)}
                              disabled={showCustom ? !customName.trim() : !selectedSoftware}
                              style={btnStyle('#10b981', showCustom ? !customName.trim() : !selectedSoftware)}>
                              <i className="bi bi-plus" /> Ekle
                            </button>
                            <button onClick={() => setShowCustom(!showCustom)}
                              style={{ ...btnStyle('#6366f1', false), padding: '8px 12px' }}
                              title={showCustom ? 'Listeden seç' : 'Manuel gir'}>
                              <i className={showCustom ? 'bi bi-list-ul' : 'bi bi-pencil'} />
                            </button>
                            <button onClick={() => { setAddingFor(null); setShowCustom(false); setSelectedSoftware(''); setCustomName(''); setLicenseKey(''); }}
                              style={{ ...btnStyle('#94a3b8', false), padding: '8px 12px' }}>
                              <i className="bi bi-x-lg" />
                            </button>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* İşlem */}
                    <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                      {addingFor !== d.id && (
                        <button onClick={() => { setAddingFor(d.id); setSelectedSoftware(''); setLicenseKey(''); setCustomName(''); setShowCustom(false); }}
                          style={{
                            padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                            background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
                            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                          }}>
                          <i className="bi bi-plus-circle" /> Lisans
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Sayfalama */}
        {toplamSayfa > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
            <button onClick={() => setSayfa(s => Math.max(1, s - 1))} disabled={sayfa <= 1}
              style={{ ...btnStyle('#6366f1', sayfa <= 1), padding: '6px 14px', fontSize: 12 }}>
              <i className="bi bi-chevron-left" /> Önceki
            </button>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
              {sayfa} / {toplamSayfa}
            </span>
            <button onClick={() => setSayfa(s => Math.min(toplamSayfa, s + 1))} disabled={sayfa >= toplamSayfa}
              style={{ ...btnStyle('#6366f1', sayfa >= toplamSayfa), padding: '6px 14px', fontSize: 12 }}>
              Sonraki <i className="bi bi-chevron-right" />
            </button>
          </div>
        )}
      </div>}
    </div>
  );
}
