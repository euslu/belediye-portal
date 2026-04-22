import { useState, useRef, useEffect, useMemo } from 'react';

const API = import.meta.env.VITE_API_URL || '';
const H = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const PAGE_SIZE = 20;

const cardStyle = {
  background: 'white', borderRadius: '14px', padding: '24px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.03)',
};

const btnStyle = (bg, disabled) => ({
  padding: '9px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
  background: disabled ? '#cbd5e1' : bg, color: 'white', border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  transition: 'all 0.15s ease',
  boxShadow: disabled ? 'none' : `0 1px 3px ${bg}44`,
});

const inputStyle = {
  height: '42px', padding: '0 14px', border: '1.5px solid #e2e8f0',
  borderRadius: '10px', fontSize: '13px', outline: 'none', width: '100%',
  boxSizing: 'border-box', background: '#fafbfc',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

const inputFocusStyle = {
  borderColor: '#818cf8', boxShadow: '0 0 0 3px rgba(129,140,248,0.12)',
  background: '#fff',
};

const labelStyle = {
  display: 'block', fontSize: '12px', fontWeight: 600,
  color: '#475569', marginBottom: '6px', letterSpacing: '0.01em',
};

const thStyle = {
  padding: '11px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700,
  color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em',
  borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap', background: '#f8fafc',
};

// ─── Autocomplete Hook ──────────────────────────────────────────────────────
function useAutocomplete(endpoint) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); setOpen(false); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`${API}${endpoint}${encodeURIComponent(query)}&limit=10`, { headers: H() });
        const data = await r.json();
        const items = Array.isArray(data) ? data : (data.devices || data.users || data.data || []);
        setResults(items);
        setOpen(items.length > 0);
      } catch { setResults([]); }
    }, 300);
    return () => clearTimeout(timer.current);
  }, [query, endpoint]);

  const select = (item) => { setSelected(item); setQuery(''); setOpen(false); setResults([]); };
  const clear = () => { setSelected(null); setQuery(''); };

  return { query, setQuery, results, open, setOpen, selected, select, clear };
}

export default function EnvanterEslestirme() {
  // ─── A) Otomatik Eşleştirme ─────────────────────────────────────────────
  const [matchData, setMatchData] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchApplying, setMatchApplying] = useState(false);
  const [matchPage, setMatchPage] = useState(1);
  const [matchSearch, setMatchSearch] = useState('');
  const [notes, setNotes] = useState({});
  const [selected, setSelected] = useState({}); // { "cihazId": true/false }

  const handleMatchPreview = async () => {
    setMatchLoading(true);
    setMatchPage(1);
    setMatchSearch('');
    setSelected({});
    setNotes({});
    try {
      const r = await fetch(`${API}/api/inventory/match-preview?limit=1000`, { headers: H() });
      setMatchData(await r.json());
    } catch (e) { alert('Hata: ' + e.message); }
    setMatchLoading(false);
  };

  // Seçili olanları uygula
  const handleApplySelected = async () => {
    const matches = [];
    for (const [key, val] of Object.entries(selected)) {
      if (!val) continue;
      // Key: "cihazId" — detaydan username'i bul
      const detail = (matchData?.detay || []).find(d => String(d.cihazId) === key);
      if (detail?.username) {
        matches.push({ cihazId: detail.cihazId, username: detail.username });
      }
    }
    if (matches.length === 0) return alert('Onaylanacak eşleştirme seçilmedi');

    setMatchApplying(true);
    try {
      const r = await fetch(`${API}/api/inventory/match-apply`, {
        method: 'POST',
        headers: { ...H(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ matches }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      alert(`${data.applied} cihaz eşleştirildi`);
      fetchMatched(); // eşleşmiş listeyi yenile
      // Onaylananları listeden çıkar
      const appliedIds = new Set(matches.map(m => m.cihazId));
      setMatchData(prev => {
        if (!prev) return prev;
        const newDetay = prev.detay.filter(d => !appliedIds.has(d.cihazId));
        return { ...prev, detay: newDetay };
      });
      setSelected({});
    } catch (e) { alert('Hata: ' + e.message); }
    setMatchApplying(false);
  };

  // Kullanıcıya göre grupla
  const groupedByUser = useMemo(() => {
    if (!matchData?.detay) return [];
    const filtered = matchSearch
      ? matchData.detay.filter(m =>
          (m.username || '').toLowerCase().includes(matchSearch.toLowerCase()) ||
          (m.displayName || '').toLowerCase().includes(matchSearch.toLowerCase()) ||
          (m.cihazAdi || '').toLowerCase().includes(matchSearch.toLowerCase()) ||
          (m.owner || '').toLowerCase().includes(matchSearch.toLowerCase()) ||
          (m.birimAdi || '').toLowerCase().includes(matchSearch.toLowerCase())
        )
      : matchData.detay;

    const map = {};
    for (const m of filtered) {
      const key = m.username || m.birimAdi || `__no_match_${m.cihazId}`;
      if (!map[key]) {
        map[key] = {
          key,
          username: m.username,
          displayName: m.displayName,
          birimAdi: m.birimAdi,
          directorate: m.directorate,
          confidence: m.confidence,
          method: m.method,
          devices: [],
        };
      }
      map[key].devices.push(m);
      if (m.confidence > map[key].confidence) {
        map[key].confidence = m.confidence;
        map[key].method = m.method;
      }
    }
    return Object.values(map).sort((a, b) => b.confidence - a.confidence || (a.username || '').localeCompare(b.username || ''));
  }, [matchData, matchSearch]);

  const totalGroupPages = Math.ceil(groupedByUser.length / PAGE_SIZE) || 1;
  const pagedGroups = groupedByUser.slice((matchPage - 1) * PAGE_SIZE, matchPage * PAGE_SIZE);

  // Seçim sayıları
  const selectedCount = Object.values(selected).filter(Boolean).length;
  const selectableOnPage = pagedGroups.flatMap(g => g.devices.filter(d => d.username && d.confidence > 0));

  const toggleGroupDevices = (group, val) => {
    setSelected(prev => {
      const next = { ...prev };
      for (const d of group.devices) {
        if (d.username) next[String(d.cihazId)] = val;
      }
      return next;
    });
  };

  const toggleAllOnPage = (val) => {
    setSelected(prev => {
      const next = { ...prev };
      for (const d of selectableOnPage) {
        next[String(d.cihazId)] = val;
      }
      return next;
    });
  };

  const isGroupSelected = (group) => group.devices.every(d => !d.username || selected[String(d.cihazId)]);
  const isGroupPartial = (group) => group.devices.some(d => d.username && selected[String(d.cihazId)]) && !isGroupSelected(group);

  // ─── Eşleşmiş Cihazlar (sayfa açılışında) ───────────────────────────────
  const [matched, setMatched] = useState([]);
  const [matchedTotal, setMatchedTotal] = useState(0);
  const [matchedPage, setMatchedPage] = useState(1);
  const [matchedSearch, setMatchedSearch] = useState('');
  const [matchedSearchDebounce, setMatchedSearchDebounce] = useState('');
  const [matchedLoading, setMatchedLoading] = useState(false);
  const MATCHED_PAGE_SIZE = 20;

  useEffect(() => {
    const t = setTimeout(() => { setMatchedSearchDebounce(matchedSearch); setMatchedPage(1); }, 400);
    return () => clearTimeout(t);
  }, [matchedSearch]);

  useEffect(() => { fetchMatched(); }, [matchedPage, matchedSearchDebounce]);

  const fetchMatched = async () => {
    setMatchedLoading(true);
    try {
      const params = new URLSearchParams({ sayfa: matchedPage, limit: MATCHED_PAGE_SIZE });
      if (matchedSearchDebounce) params.set('search', matchedSearchDebounce);
      const r = await fetch(`${API}/api/inventory/license-management?${params}`, { headers: H() });
      const data = await r.json();
      setMatched(data.devices || []);
      setMatchedTotal(data.toplam || 0);
    } catch { setMatched([]); }
    setMatchedLoading(false);
  };

  const matchedTotalPages = Math.ceil(matchedTotal / MATCHED_PAGE_SIZE) || 1;

  // ─── B) Manuel Eşleştirme ───────────────────────────────────────────────
  const deviceAc = useAutocomplete('/api/inventory?search=');
  const userAc = useAutocomplete('/api/users?search=');
  const [manuelLog, setManuelLog] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [unassigning, setUnassigning] = useState(null); // deviceId being unassigned

  const handleManuelAssign = async () => {
    if (!deviceAc.selected || !userAc.selected) return;
    setAssigning(true);
    try {
      const r = await fetch(`${API}/api/inventory/${deviceAc.selected.id}/assign`, {
        method: 'POST', headers: { ...H(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userAc.selected.username }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setManuelLog(prev => [{ device: deviceAc.selected.name, user: userAc.selected.displayName, at: new Date() }, ...prev]);
      fetchMatched(); // eşleşmiş listeyi yenile
      deviceAc.clear();
      userAc.clear();
    } catch (e) { alert('Hata: ' + e.message); }
    setAssigning(false);
  };

  const handleUnassign = async (deviceId, deviceName) => {
    if (!confirm(`"${deviceName}" cihazının kullanıcı atamasını kaldırmak istediğinize emin misiniz?`)) return;
    setUnassigning(deviceId);
    try {
      const r = await fetch(`${API}/api/inventory/${deviceId}/unassign`, {
        method: 'DELETE', headers: H(),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      fetchMatched();
    } catch (e) { alert('Hata: ' + e.message); }
    setUnassigning(null);
  };

  const methodLabels = {
    direkt_username: 'Direkt', normalized_username: 'Normalize',
    devicename_match: 'Cihaz Adı', partial_name_match: 'Kısmi Eşleşme', birim_match: 'Birim',
  };
  const methodColors = {
    direkt_username: { bg: '#dcfce7', color: '#16a34a' },
    normalized_username: { bg: '#dbeafe', color: '#1e40af' },
    devicename_match: { bg: '#fef3c7', color: '#d97706' },
    partial_name_match: { bg: '#fce7f3', color: '#be185d' },
    birim_match: { bg: '#f3e8ff', color: '#7c3aed' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── A) Otomatik Eşleştirme ──────────────────────────────────── */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Otomatik Eşleştirme
            </h2>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0' }}>
              EPC owner bilgisini Portal kullanıcılarıyla eşleştirir — önerileri tek tek onaylayın
            </p>
          </div>
          <button onClick={handleMatchPreview} disabled={matchLoading} style={btnStyle('#16a34a', matchLoading)}>
            <i className="bi bi-arrow-repeat" style={{ fontSize: 14 }} />
            {matchLoading ? 'Yükleniyor...' : 'Önizleme Getir'}
          </button>
        </div>

        {matchData && (
          <>
            {/* Özet kartları */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {[
                { label: 'Toplam Cihaz', value: matchData.toplam || 0, color: '#1e40af', bg: '#eff6ff', icon: 'bi-hdd' },
                { label: 'Eşleşti', value: matchData.eslesti || 0, color: '#16a34a', bg: '#f0fdf4', icon: 'bi-check-circle' },
                { label: 'Öneri Var', value: matchData.oneriVar || 0, color: '#be185d', bg: '#fdf2f8', icon: 'bi-lightbulb' },
                { label: 'Birim Atandı', value: matchData.birimAtandi || 0, color: '#d97706', bg: '#fffbeb', icon: 'bi-building' },
                { label: 'Eşleşmedi', value: matchData.eslesmedi || 0, color: '#dc2626', bg: '#fef2f2', icon: 'bi-x-circle' },
              ].map((s, i) => (
                <div key={i} style={{
                  background: s.bg, borderRadius: '12px', padding: '14px 16px',
                  borderLeft: `4px solid ${s.color}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                    <i className={`bi ${s.icon}`} style={{ fontSize: 12, color: s.color }} />
                    <span style={{ fontSize: '10px', fontWeight: 700, color: s.color, textTransform: 'uppercase' }}>{s.label}</span>
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Arama + seçim bilgisi */}
            <div style={{ display: 'flex', gap: 12, marginBottom: '16px', alignItems: 'center' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <i className="bi bi-search" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 14 }} />
                <input
                  value={matchSearch}
                  onChange={e => { setMatchSearch(e.target.value); setMatchPage(1); }}
                  placeholder="Kullanıcı adı, cihaz adı veya owner ile ara..."
                  style={{ ...inputStyle, paddingLeft: 38 }}
                  onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
                  onBlur={e => Object.assign(e.target.style, { borderColor: '#e2e8f0', boxShadow: 'none', background: '#fafbfc' })}
                />
              </div>
              {selectedCount > 0 && (
                <div style={{
                  background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 10,
                  padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 13, fontWeight: 600, color: '#1e40af', whiteSpace: 'nowrap',
                }}>
                  <i className="bi bi-check2-square" />
                  {selectedCount} seçili
                </div>
              )}
            </div>

            {/* Tablo */}
            <div style={{ borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: 40, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectableOnPage.length > 0 && selectableOnPage.every(d => selected[String(d.cihazId)])}
                        onChange={e => toggleAllOnPage(e.target.checked)}
                        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#4f46e5' }}
                        title="Sayfadakileri seç/bırak"
                      />
                    </th>
                    <th style={thStyle}>Kullanıcı / Birim</th>
                    <th style={thStyle}>Cihazlar</th>
                    <th style={thStyle}>Owner</th>
                    <th style={thStyle}>Metod</th>
                    <th style={thStyle}>Güven</th>
                    <th style={{ ...thStyle, minWidth: 160 }}>Not</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedGroups.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                      {matchSearch ? 'Aramayla eşleşen kayıt bulunamadı' : 'Eşleşme bulunamadı'}
                    </td></tr>
                  )}
                  {pagedGroups.map((group, gIdx) => {
                    const conf = group.confidence || 0;
                    const confColor = conf >= 95 ? { bg: '#dcfce7', color: '#16a34a' }
                      : conf >= 80 ? { bg: '#dbeafe', color: '#1e40af' }
                      : conf >= 60 ? { bg: '#fce7f3', color: '#be185d' }
                      : conf >= 50 ? { bg: '#fef3c7', color: '#d97706' }
                      : { bg: '#fee2e2', color: '#dc2626' };
                    const mc = methodColors[group.method] || { bg: '#f1f5f9', color: '#475569' };
                    const rowBg = gIdx % 2 === 0 ? '#fff' : '#fafbfc';
                    const hasUsername = !!group.username;
                    const groupChecked = isGroupSelected(group);
                    const groupPartial = isGroupPartial(group);

                    return (
                      <tr key={group.key} style={{
                        background: groupChecked ? '#f0fdf4' : rowBg,
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s',
                      }}>
                        {/* Checkbox */}
                        <td style={{ padding: '12px 10px', verticalAlign: 'top', textAlign: 'center' }}>
                          {hasUsername && (
                            <input
                              type="checkbox"
                              checked={groupChecked}
                              ref={el => { if (el) el.indeterminate = groupPartial; }}
                              onChange={e => toggleGroupDevices(group, e.target.checked)}
                              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#4f46e5' }}
                            />
                          )}
                        </td>

                        {/* Kullanıcı */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                          {group.username ? (
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
                                <i className="bi bi-person-fill" style={{ color: '#6366f1', marginRight: 5, fontSize: 13 }} />
                                {group.displayName || group.username}
                              </div>
                              <div style={{ fontSize: 11, color: '#64748b', marginTop: 1, paddingLeft: 20, fontFamily: 'monospace' }}>{group.username}</div>
                              {group.directorate && (
                                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1, paddingLeft: 20 }}>{group.directorate}</div>
                              )}
                            </div>
                          ) : group.birimAdi ? (
                            <div>
                              <div style={{ fontWeight: 600, color: '#7c3aed', fontSize: 13 }}>
                                <i className="bi bi-building" style={{ marginRight: 5, fontSize: 12 }} />
                                {group.birimAdi}
                              </div>
                              {group.directorate && (
                                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, paddingLeft: 20 }}>{group.directorate}</div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#dc2626', fontWeight: 500, fontSize: 12 }}>
                              <i className="bi bi-question-circle" style={{ marginRight: 4 }} />Eşleşmedi
                            </span>
                          )}
                        </td>

                        {/* Cihazlar */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {group.devices.map((d, di) => (
                              <div key={di} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                background: '#f1f5f9', padding: '4px 10px', borderRadius: 7,
                                fontSize: 12, fontWeight: 600, color: '#334155', width: 'fit-content',
                              }}>
                                <i className="bi bi-pc-display" style={{ fontSize: 11, color: '#64748b' }} />
                                {d.cihazAdi}
                              </div>
                            ))}
                          </div>
                          {group.devices.length > 1 && (
                            <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600, marginTop: 4 }}>
                              <i className="bi bi-exclamation-triangle" style={{ marginRight: 3 }} />
                              {group.devices.length} cihaz bu kullanıcıda
                            </div>
                          )}
                        </td>

                        {/* Owner */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {group.devices.map((d, di) => (
                              <span key={di} style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>{d.owner || '—'}</span>
                            ))}
                          </div>
                        </td>

                        {/* Metod */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                          <span style={{
                            background: mc.bg, color: mc.color,
                            padding: '3px 10px', borderRadius: '8px',
                            fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap',
                          }}>
                            {methodLabels[group.method] || group.method}
                          </span>
                        </td>

                        {/* Güven */}
                        <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                          <span style={{
                            background: confColor.bg, color: confColor.color,
                            padding: '3px 10px', borderRadius: '8px',
                            fontSize: '12px', fontWeight: 700,
                          }}>
                            %{conf}
                          </span>
                        </td>

                        {/* Not */}
                        <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
                          <textarea
                            value={notes[group.key] || ''}
                            onChange={e => setNotes(prev => ({ ...prev, [group.key]: e.target.value }))}
                            placeholder="Not ekle..."
                            rows={1}
                            style={{
                              width: '100%', padding: '7px 10px', border: '1.5px solid #e2e8f0',
                              borderRadius: '8px', fontSize: '12px', resize: 'vertical',
                              outline: 'none', background: '#fafbfc', minHeight: 34, maxHeight: 80,
                              fontFamily: 'inherit', transition: 'border-color 0.15s',
                            }}
                            onFocus={e => { e.target.style.borderColor = '#818cf8'; e.target.style.background = '#fff'; }}
                            onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#fafbfc'; }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Sayfalama */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                Toplam {groupedByUser.length} kullanıcı/birim — Sayfa {matchPage}/{totalGroupPages}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setMatchPage(p => Math.max(1, p - 1))}
                  disabled={matchPage <= 1}
                  style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: matchPage <= 1 ? '#f1f5f9' : '#fff', color: matchPage <= 1 ? '#cbd5e1' : '#475569',
                    border: '1px solid #e2e8f0', cursor: matchPage <= 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <i className="bi bi-chevron-left" />
                </button>
                <button
                  onClick={() => setMatchPage(p => Math.min(totalGroupPages, p + 1))}
                  disabled={matchPage >= totalGroupPages}
                  style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: matchPage >= totalGroupPages ? '#f1f5f9' : '#fff',
                    color: matchPage >= totalGroupPages ? '#cbd5e1' : '#475569',
                    border: '1px solid #e2e8f0',
                    cursor: matchPage >= totalGroupPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  <i className="bi bi-chevron-right" />
                </button>
              </div>
            </div>

            {/* Aksiyon butonları */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <button onClick={() => { setMatchData(null); setNotes({}); setSelected({}); }} style={{
                padding: '9px 22px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                background: '#fff', color: '#64748b', border: '1.5px solid #e2e8f0', cursor: 'pointer',
              }}>Temizle</button>
              <button
                onClick={handleApplySelected}
                disabled={matchApplying || selectedCount === 0}
                style={btnStyle('#4f46e5', matchApplying || selectedCount === 0)}
              >
                <i className="bi bi-check2-all" style={{ fontSize: 14 }} />
                {matchApplying ? 'Uygulanıyor...' : `Seçilenleri Onayla (${selectedCount})`}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Eşleşmiş Cihazlar ──────────────────────────────────────── */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              <i className="bi bi-check-circle-fill" style={{ color: '#16a34a', marginRight: 6 }} />
              Eşleşmiş Cihazlar
            </h2>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0' }}>
              Kullanıcı ataması yapılmış cihazlar ({matchedTotal})
            </p>
          </div>
          <button onClick={fetchMatched} style={btnStyle('#6366f1', false)}>
            <i className="bi bi-arrow-clockwise" style={{ fontSize: 13 }} /> Yenile
          </button>
        </div>

        <div style={{ marginBottom: 12, position: 'relative' }}>
          <i className="bi bi-search" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 14 }} />
          <input
            value={matchedSearch}
            onChange={e => setMatchedSearch(e.target.value)}
            placeholder="Kullanıcı, cihaz adı veya birim ara..."
            style={{ ...inputStyle, paddingLeft: 38 }}
            onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
            onBlur={e => Object.assign(e.target.style, { borderColor: '#e2e8f0', boxShadow: 'none', background: '#fafbfc' })}
          />
        </div>

        {matchedLoading ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>Yükleniyor...</div>
        ) : matched.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: 13,
            background: '#fafbfc', borderRadius: 12, border: '1px dashed #e2e8f0',
          }}>
            <i className="bi bi-link-45deg" style={{ fontSize: 24, display: 'block', marginBottom: 8, opacity: 0.4 }} />
            Henüz eşleşmiş cihaz yok. Yukarıdan otomatik eşleştirme yapabilir veya aşağıdan manuel atayabilirsiniz.
          </div>
        ) : (
          <>
            <div style={{ borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Cihaz</th>
                    <th style={thStyle}>Kullanıcı</th>
                    <th style={thStyle}>Birim</th>
                    <th style={thStyle}>Lisanslar</th>
                    <th style={{ ...thStyle, width: 90, textAlign: 'center' }}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {matched.map((d, idx) => (
                    <tr key={d.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafbfc', borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: '#f1f5f9', padding: '3px 8px', borderRadius: 6,
                          fontSize: 12, fontWeight: 600, color: '#334155',
                        }}>
                          <i className="bi bi-pc-display" style={{ fontSize: 10, color: '#64748b' }} />
                          {d.name}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
                          <i className="bi bi-person-fill" style={{ color: '#16a34a', marginRight: 5, fontSize: 12 }} />
                          {d.assignedTo}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b' }}>
                        {d.directorate || '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {(d.licenses || []).map(lic => (
                            <span key={lic.id} style={{
                              background: '#ecfdf5', color: '#059669', padding: '2px 8px',
                              borderRadius: 5, fontSize: 11, fontWeight: 500,
                            }}>
                              {lic.name}
                            </span>
                          ))}
                          {(!d.licenses || d.licenses.length === 0) && (
                            <span style={{ color: '#cbd5e1', fontSize: 11, fontStyle: 'italic' }}>—</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleUnassign(d.id, d.name)}
                          disabled={unassigning === d.id}
                          title="Atamayı kaldır"
                          style={{
                            padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                            background: unassigning === d.id ? '#f1f5f9' : '#fef2f2',
                            color: unassigning === d.id ? '#94a3b8' : '#dc2626',
                            border: `1px solid ${unassigning === d.id ? '#e2e8f0' : '#fecaca'}`,
                            cursor: unassigning === d.id ? 'not-allowed' : 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            transition: 'all 0.15s',
                          }}
                        >
                          <i className={unassigning === d.id ? 'bi bi-arrow-clockwise spin' : 'bi bi-x-circle'} style={{ fontSize: 12 }} />
                          Kaldır
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {matchedTotalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  {matchedTotal} cihaz — Sayfa {matchedPage}/{matchedTotalPages}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setMatchedPage(p => Math.max(1, p - 1))} disabled={matchedPage <= 1}
                    style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: matchedPage <= 1 ? '#f1f5f9' : '#fff', color: matchedPage <= 1 ? '#cbd5e1' : '#475569', border: '1px solid #e2e8f0', cursor: matchedPage <= 1 ? 'not-allowed' : 'pointer' }}>
                    <i className="bi bi-chevron-left" />
                  </button>
                  <button onClick={() => setMatchedPage(p => Math.min(matchedTotalPages, p + 1))} disabled={matchedPage >= matchedTotalPages}
                    style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: matchedPage >= matchedTotalPages ? '#f1f5f9' : '#fff', color: matchedPage >= matchedTotalPages ? '#cbd5e1' : '#475569', border: '1px solid #e2e8f0', cursor: matchedPage >= matchedTotalPages ? 'not-allowed' : 'pointer' }}>
                    <i className="bi bi-chevron-right" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── B) Manuel Eşleştirme ─────────────────────────────────────── */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '0 0 20px' }}>
          <i className="bi bi-link-45deg" style={{ color: '#6366f1', marginRight: 6 }} />
          Manuel Eşleştirme
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '14px', alignItems: 'end' }}>
          <AutocompleteField
            label="Kullanıcı"
            placeholder="Ad veya username yazın..."
            ac={userAc}
            renderItem={u => `${u.displayName} (${u.username})`}
            renderSelected={u => `${u.displayName} (${u.username})`}
          />
          <AutocompleteField
            label="Cihaz"
            placeholder="Cihaz adı yazın..."
            ac={deviceAc}
            renderItem={d => `${d.name} (${d.ipAddress || d.type})`}
            renderSelected={d => d.name}
          />
          <button onClick={handleManuelAssign} disabled={assigning || !deviceAc.selected || !userAc.selected}
            style={{ ...btnStyle('#4f46e5', assigning || !deviceAc.selected || !userAc.selected), height: '42px' }}>
            <i className="bi bi-link" style={{ fontSize: 14 }} />
            {assigning ? '...' : 'Eşle'}
          </button>
        </div>

        {manuelLog.length > 0 && (
          <div style={{ marginTop: '18px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Son Eşleştirmeler</div>
            {manuelLog.slice(0, 5).map((l, i) => (
              <div key={i} style={{
                fontSize: '13px', color: '#475569', padding: '8px 12px', borderRadius: 8,
                background: i % 2 === 0 ? '#f8fafc' : 'transparent',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <i className="bi bi-pc-display" style={{ color: '#6366f1', fontSize: 12 }} />
                <strong>{l.device}</strong>
                <i className="bi bi-arrow-right" style={{ color: '#cbd5e1', fontSize: 11 }} />
                <i className="bi bi-person" style={{ color: '#16a34a', fontSize: 12 }} />
                {l.user}
                <span style={{ color: '#94a3b8', fontSize: '11px', marginLeft: 'auto' }}>
                  {l.at.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// ─── Autocomplete Field Component ──────────────────────────────────────────
function AutocompleteField({ label, placeholder, ac, renderItem, renderSelected }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) ac.setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (ac.selected) {
    return (
      <div>
        <label style={labelStyle}>{label}</label>
        <div style={{
          ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#f0fdf4', borderColor: '#86efac', borderWidth: '1.5px',
        }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#166534', display: 'flex', alignItems: 'center', gap: 5 }}>
            <i className="bi bi-check-circle-fill" style={{ fontSize: 13 }} />
            {renderSelected(ac.selected)}
          </span>
          <button onClick={ac.clear} style={{
            background: '#dcfce7', border: 'none', cursor: 'pointer', color: '#16a34a',
            fontSize: '14px', lineHeight: 1, borderRadius: '50%', width: 22, height: 22,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <label style={labelStyle}>{label}</label>
      <input
        value={ac.query}
        onChange={e => ac.setQuery(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
        onFocus={e => Object.assign(e.target.style, inputFocusStyle)}
        onBlur={e => Object.assign(e.target.style, { borderColor: '#e2e8f0', boxShadow: 'none', background: '#fafbfc' })}
      />
      {ac.open && ac.results.length > 0 && (
        <div style={{
          position: 'relative', left: 0, right: 0, zIndex: 50,
          background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: '220px', overflow: 'auto', marginTop: '4px',
        }}>
          {ac.results.map((item, i) => (
            <div
              key={item.id || i}
              onClick={() => ac.select(item)}
              style={{
                padding: '10px 14px', fontSize: '13px', cursor: 'pointer', color: '#1e293b',
                borderBottom: i < ac.results.length - 1 ? '1px solid #f1f5f9' : 'none',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}
            >
              {renderItem(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
