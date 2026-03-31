import { useState, useEffect } from 'react';
import { YATIRIM_SUTUNLARI, BASVURU_SUTUNLARI, LS_KEY_YATIRIM, LS_KEY_BASVURU, loadVisibility, saveVisibility } from './MahalleDetay';
import { DEFAULT_WIDGETS, LS_KEY_WIDGETS, loadWidgets, saveWidgets } from '../lib/dashboard_widgets';
import { getToken } from '../lib/muhtarlik_api';

// ─── Yardımcılar ─────────────────────────────────────────────────────────────
function authFetch(path, opts = {}) {
  return fetch(path, {
    ...opts,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.headers || {}),
    },
  });
}

function getMyRoleLevel() {
  try {
    const token = getToken();
    if (!token) return 0;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.muhtarlikRoleLevel || 0;
  } catch { return 0; }
}

// ─── Rol badge renkleri ───────────────────────────────────────────────────────
const ROL_RENK = {
  admin:         { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  daire_baskani: { bg: '#f3e8ff', color: '#9333ea', border: '#e9d5ff' },
  mudur:         { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  personel:      { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  user:          { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
};
const ROL_ETIKET = {
  admin: 'Admin', daire_baskani: 'Daire Başkanı', mudur: 'Müdür', personel: 'Personel', user: 'Kullanıcı',
};

function RolBadge({ role }) {
  const c = ROL_RENK[role] || ROL_RENK.user;
  return (
    <span style={{
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600,
    }}>
      {ROL_ETIKET[role] || role}
    </span>
  );
}

// ─── Yetkilendirme Sekmesi ────────────────────────────────────────────────────
function YetkilendirmeSekmesi() {
  const [roller, setRoller]         = useState([]);
  const [personel, setPersonel]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [editRow, setEditRow]       = useState(null); // username
  const [editRole, setEditRole]     = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole]       = useState('personel');
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState('');

  const myLevel = getMyRoleLevel();

  function flash(text) { setMsg(text); setTimeout(() => setMsg(''), 3000); }

  useEffect(() => {
    setLoading(true);
    Promise.all([
      authFetch('/api/muhtarbis/admin/roller').then(r => r.json()).catch(() => []),
      authFetch('/api/muhtarbis/admin/daire-personel?daire=Muhtarl').then(r => r.json()).catch(() => []),
    ]).then(([r, p]) => {
      setRoller(Array.isArray(r) ? r : []);
      setPersonel(Array.isArray(p) ? p : []);
    }).finally(() => setLoading(false));
  }, []);

  async function handleSaveEdit(username) {
    setSaving(true);
    try {
      const res = await authFetch(`/api/muhtarbis/admin/roller/${username}`, {
        method: 'PUT',
        body: JSON.stringify({ role: editRole }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Hata'); return; }
      setRoller(prev => prev.map(r => r.username === username ? { ...r, role: editRole, rolEtiket: ROL_ETIKET[editRole] } : r));
      setEditRow(null);
      flash('Rol güncellendi');
    } finally { setSaving(false); }
  }

  async function handlePassif(username) {
    if (!confirm(`${username} kullanıcısının erişimi kaldırılsın mı?`)) return;
    setSaving(true);
    try {
      const res = await authFetch(`/api/muhtarbis/admin/roller/${username}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Hata'); return; }
      setRoller(prev => prev.map(r => r.username === username ? { ...r, active: false } : r));
      flash('Erişim kaldırıldı');
    } finally { setSaving(false); }
  }

  async function handleEkle() {
    if (!newUsername) return;
    const sel = personel.find(p => p.username === newUsername);
    setSaving(true);
    try {
      const res = await authFetch(`/api/muhtarbis/admin/roller/${newUsername}`, {
        method: 'PUT',
        body: JSON.stringify({
          role: newRole,
          displayName: sel?.displayName || newUsername,
          directorate: sel?.directorate || null,
          department: sel?.department || null,
          active: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Hata'); return; }
      setRoller(prev => {
        const idx = prev.findIndex(r => r.username === newUsername);
        if (idx >= 0) return prev.map(r => r.username === newUsername ? data : r);
        return [...prev, data];
      });
      setNewUsername(''); setNewRole('personel');
      flash('Kullanıcı eklendi');
    } finally { setSaving(false); }
  }

  if (loading) return <div style={{ padding: 20, color: '#9ca3af', fontSize: 13 }}>Yükleniyor…</div>;

  const aktif  = roller.filter(r => r.active);
  const pasif  = roller.filter(r => !r.active);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {msg && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 16px', fontSize: 13, color: '#16a34a' }}>
          ✓ {msg}
        </div>
      )}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 16px', fontSize: 13, color: '#dc2626' }}>
          ✗ {error} <button onClick={() => setError('')} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: 700 }}>×</button>
        </div>
      )}

      {/* Mevcut yetkili kullanıcılar */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EEEEEE', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #EEEEEE' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#212529' }}>Yetkili Kullanıcılar</span>
          <span style={{ marginLeft: 10, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 20, padding: '2px 10px', fontSize: 12 }}>
            {aktif.length} aktif
          </span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
              {['Kullanıcı', 'Ad Soyad', 'Birim', 'Rol', 'İşlemler'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {aktif.length === 0 && (
              <tr><td colSpan={5} style={{ padding: '20px 16px', color: '#9ca3af', textAlign: 'center' }}>Yetkili kullanıcı bulunamadı</td></tr>
            )}
            {aktif.map(r => (
              <tr key={r.username} style={{ borderBottom: '1px solid #f9fafb' }}
                onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <td style={{ padding: '11px 16px', fontWeight: 500, color: '#1f2937' }}>{r.username}</td>
                <td style={{ padding: '11px 16px', color: '#374151' }}>{r.displayName || '—'}</td>
                <td style={{ padding: '11px 16px', color: '#6b7280', maxWidth: 180 }}>
                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.directorate || r.department || '—'}
                  </span>
                </td>
                <td style={{ padding: '11px 16px' }}>
                  {editRow === r.username ? (
                    <select value={editRole} onChange={e => setEditRole(e.target.value)}
                      style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '4px 8px', fontSize: 12 }}>
                      {Object.entries(ROL_ETIKET).filter(([k]) => k !== 'admin' || myLevel >= 5).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  ) : (
                    <RolBadge role={r.role} />
                  )}
                </td>
                <td style={{ padding: '11px 16px' }}>
                  {editRow === r.username ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleSaveEdit(r.username)} disabled={saving}
                        style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: '#43DC80', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        Kaydet
                      </button>
                      <button onClick={() => setEditRow(null)}
                        style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#6b7280' }}>
                        İptal
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => { setEditRow(r.username); setEditRole(r.role); }}
                        style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#374151' }}>
                        Düzenle
                      </button>
                      <button onClick={() => handlePassif(r.username)}
                        style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer', fontSize: 12, color: '#dc2626' }}>
                        Kaldır
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pasif kullanıcılar (varsa) */}
        {pasif.length > 0 && (
          <details style={{ borderTop: '1px solid #f3f4f6' }}>
            <summary style={{ padding: '10px 16px', fontSize: 12, color: '#9ca3af', cursor: 'pointer' }}>
              {pasif.length} pasif kullanıcı
            </summary>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <tbody>
                {pasif.map(r => (
                  <tr key={r.username} style={{ borderBottom: '1px solid #f9fafb', opacity: 0.5 }}>
                    <td style={{ padding: '8px 16px', color: '#374151' }}>{r.username}</td>
                    <td style={{ padding: '8px 16px', color: '#6b7280' }}>{r.displayName}</td>
                    <td style={{ padding: '8px 16px' }}><RolBadge role={r.role} /></td>
                    <td style={{ padding: '8px 16px' }}>
                      <button onClick={() => { authFetch(`/api/muhtarbis/admin/roller/${r.username}`, { method: 'PUT', body: JSON.stringify({ active: true }) }).then(() => { setRoller(prev => prev.map(x => x.username === r.username ? { ...x, active: true } : x)); flash('Erişim yeniden aktifleştirildi'); }); }}
                        style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#374151' }}>
                        Aktifleştir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        )}
      </div>

      {/* Yeni kullanıcı ekle */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EEEEEE', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #EEEEEE' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#212529' }}>Yeni Kullanıcı Ekle</span>
        </div>
        <div style={{ padding: '20px', display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: 200 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Personel</label>
            <select value={newUsername} onChange={e => setNewUsername(e.target.value)}
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 13, background: '#fff', outline: 'none' }}>
              <option value="">— Personel Seç —</option>
              {personel.map(p => (
                <option key={p.username} value={p.username}>
                  {p.displayName || p.username}{p.title ? ` — ${p.title}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Rol</label>
            <select value={newRole} onChange={e => setNewRole(e.target.value)}
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 13, background: '#fff', outline: 'none' }}>
              {Object.entries(ROL_ETIKET).filter(([k]) => k !== 'admin' || myLevel >= 5).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <button onClick={handleEkle} disabled={saving || !newUsername}
            style={{
              padding: '9px 20px', borderRadius: 8, border: 'none',
              background: !newUsername ? '#e5e7eb' : '#43DC80',
              color: !newUsername ? '#9ca3af' : '#fff',
              cursor: !newUsername ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
            }}>
            + Ekle
          </button>
        </div>
      </div>

    </div>
  );
}

// ─── Sütun ayarları ───────────────────────────────────────────────────────────
function SutunKarti({ baslik, sutunlar, lsKey }) {
  const [vis, setVis] = useState(() => loadVisibility(lsKey, sutunlar));

  function toggle(key) {
    const next = { ...vis, [key]: !vis[key] };
    setVis(next); saveVisibility(lsKey, next);
  }
  function toggleAll(val) {
    const next = Object.fromEntries(sutunlar.map(s => [s.key, val]));
    setVis(next); saveVisibility(lsKey, next);
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EEEEEE', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #EEEEEE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#212529' }}>{baslik}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => toggleAll(true)} style={{ padding: '4px 12px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 12 }}>Tümünü Göster</button>
          <button onClick={() => toggleAll(false)} style={{ padding: '4px 12px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 12 }}>Tümünü Gizle</button>
        </div>
      </div>
      <div style={{ padding: '8px 0' }}>
        {sutunlar.map(col => (
          <label key={col.key}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', cursor: 'pointer', userSelect: 'none' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f9f9f9'}
            onMouseLeave={e => e.currentTarget.style.background = ''}>
            <div onClick={() => toggle(col.key)}
              style={{ width: 40, height: 22, borderRadius: 11, cursor: 'pointer', transition: 'background 0.2s', background: vis[col.key] ? '#26af68' : '#d1d5db', position: 'relative', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 3, left: vis[col.key] ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#212529' }}>{col.label}</div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>{col.wrap ? 'Uzun metin — tam gösterim' : `Sabit genişlik: ${col.width}`}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

// ─── Widget ayarları ─────────────────────────────────────────────────────────
const WIDGET_TYPE_LABELS = { stat: 'Stat Kartı', chart: 'Grafik' };

function WidgetKarti() {
  const [widgets, setWidgets] = useState(() => loadWidgets());

  function toggle(id) {
    const next = widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w);
    setWidgets(next); saveWidgets(next);
    window.dispatchEvent(new Event('storage'));
  }
  function reset() {
    const next = DEFAULT_WIDGETS.map(w => ({ ...w }));
    setWidgets(next); saveWidgets(next);
    window.dispatchEvent(new Event('storage'));
  }

  const statWidgets  = widgets.filter(w => w.type === 'stat');
  const chartWidgets = widgets.filter(w => w.type === 'chart');

  function ToggleRow({ w }) {
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', cursor: 'pointer', userSelect: 'none' }}
        onMouseEnter={e => e.currentTarget.style.background = '#f9f9f9'}
        onMouseLeave={e => e.currentTarget.style.background = ''}>
        <div onClick={() => toggle(w.id)}
          style={{ width: 40, height: 22, borderRadius: 11, cursor: 'pointer', transition: 'background 0.2s', background: w.visible ? '#43DC80' : '#d1d5db', position: 'relative', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: 3, left: w.visible ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#212529' }}>{w.label}</div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>{WIDGET_TYPE_LABELS[w.type]}</div>
        </div>
      </label>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EEEEEE', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #EEEEEE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#212529' }}>Dashboard Widget Ayarları</span>
        <button onClick={reset} style={{ padding: '4px 12px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 12 }}>Sıfırla</button>
      </div>
      <div style={{ padding: '12px 20px 4px', borderBottom: '1px solid #f3f4f6' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Stat Kartları</span>
      </div>
      <div style={{ padding: '4px 0' }}>
        {statWidgets.map(w => <ToggleRow key={w.id} w={w} />)}
      </div>
      <div style={{ padding: '12px 20px 4px', borderBottom: '1px solid #f3f4f6', borderTop: '1px solid #f3f4f6' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Grafikler</span>
      </div>
      <div style={{ padding: '4px 0' }}>
        {chartWidgets.map(w => <ToggleRow key={w.id} w={w} />)}
      </div>
    </div>
  );
}

// ─── Sekmeler ─────────────────────────────────────────────────────────────────
const SEKMELER = [
  { id: 'gorunum',       label: 'Görünüm',         minLevel: 0 },
  { id: 'yetkilendirme', label: 'Yetkilendirme',   minLevel: 3 }, // müdür+
];

export default function MuhtarlikAyarlar() {
  const myLevel = getMyRoleLevel();
  const gorunenSekmeler = SEKMELER.filter(s => myLevel >= s.minLevel);
  const [aktifSekme, setAktifSekme] = useState(gorunenSekmeler[0]?.id || 'gorunum');

  return (
    <div style={{ padding: '32px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(38,175,104,0.12)', color: '#26af68', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
          <i className="bi bi-gear" />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#212529', margin: 0 }}>Ayarlar</h1>
          <p style={{ fontSize: 12, color: '#7e7e7e', margin: 0 }}>Sistem ayarlarını yönetin</p>
        </div>
      </div>

      {/* Sekmeler */}
      {gorunenSekmeler.length > 1 && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #e5e7eb', paddingBottom: 0 }}>
          {gorunenSekmeler.map(s => (
            <button key={s.id} onClick={() => setAktifSekme(s.id)}
              style={{
                padding: '9px 20px', border: 'none', background: 'none',
                cursor: 'pointer', fontSize: 14, fontWeight: aktifSekme === s.id ? 600 : 400,
                color: aktifSekme === s.id ? '#43DC80' : '#6b7280',
                borderBottom: aktifSekme === s.id ? '2px solid #43DC80' : '2px solid transparent',
                marginBottom: -1, transition: 'all 0.15s',
              }}>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* İçerik */}
      {aktifSekme === 'gorunum' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <SutunKarti baslik="Yatırımlar Tablosu Sütunları" sutunlar={YATIRIM_SUTUNLARI} lsKey={LS_KEY_YATIRIM} />
          <SutunKarti baslik="Başvurular Tablosu Sütunları" sutunlar={BASVURU_SUTUNLARI} lsKey={LS_KEY_BASVURU} />
          <WidgetKarti />
        </div>
      )}

      {aktifSekme === 'yetkilendirme' && myLevel >= 3 && <YetkilendirmeSekmesi />}
    </div>
  );
}
