import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { clearToken, getToken } from '../lib/muhtarlik_api';
import muglaLogo from '../assets/mugla_logo.png';

function decodeJwt(token) {
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
}

const NAV = [
  { label: 'Anasayfa',        icon: 'bi-house',          to: '/',               exact: true },
  { label: 'Muhtarlar',       icon: 'bi-person-badge',   to: '/muhtarlar' },
  { divider: true },
  { group: 'BAŞVURULAR' },
  { label: 'Tüm Başvurular',  icon: 'bi-journal-text',   to: '/basvurular' },
  { label: 'Yeni Başvuru',    icon: 'bi-plus-circle',    to: '/yeni-basvuru' },
  { divider: true },
  { group: 'YATIRIMLAR' },
  { label: 'Tüm Yatırımlar',  icon: 'bi-list-ul',        to: '/yatirimlar' },
  { label: 'Yeni Yatırım',    icon: 'bi-graph-up-arrow', to: '/yeni-yatirim' },
  { divider: true },
  { label: 'Raporlar',        icon: 'bi-bar-chart-line', to: '/raporlar' },
  { label: 'Ayarlar',         icon: 'bi-gear',           to: '/ayarlar' },
];

export default function Layout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = decodeJwt(getToken() || '');
  const userName  = user?.displayName || user?.username || '—';

  function isActive(to, exact) {
    if (exact) return location.pathname === to || location.pathname === to + '/';
    return location.pathname.startsWith(to);
  }

  function handleLogout() {
    clearToken();
    navigate('/login', { replace: true });
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f5fb' }}>

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside style={{
        width: 240, minHeight: '100vh',
        background: '#ffffff',
        borderRight: '1px solid #e8ede9',
        flexShrink: 0, display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
        fontFamily: "'Poppins', sans-serif",
      }}>

        {/* Header */}
        <div style={{ background: '#43DC80', padding: '14px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 3, flexShrink: 0,
          }}>
            <img src={muglaLogo} alt="MBB"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>Muğla BB</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 700, fontSize: 11, lineHeight: 1.3 }}>Muhtarlıklar Bilgi Sistemi</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {NAV.map((item, i) => {
            if (item.divider) return (
              <div key={i} style={{ borderTop: '1px solid #e8ede9', margin: '8px 16px' }} />
            );
            if (item.group) return (
              <div key={i} style={{
                color: '#adb5bd', fontSize: 11, fontWeight: 600,
                letterSpacing: '1.1px', textTransform: 'uppercase',
                padding: '12px 20px 6px',
              }}>
                {item.group}
              </div>
            );
            const active = isActive(item.to, item.exact);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 20px', margin: '1px 8px',
                  borderRadius: 10, textDecoration: 'none',
                  background: active ? '#e8f9f0' : 'transparent',
                  color: active ? '#43DC80' : '#374740',
                  fontWeight: active ? 500 : 400,
                  fontSize: 16,
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => {
                  if (!active) { e.currentTarget.style.background = '#f0f9f4'; e.currentTarget.style.color = '#0d5c42'; }
                }}
                onMouseLeave={e => {
                  if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#374740'; }
                }}
              >
                <i className={`bi ${item.icon}`} style={{
                  fontSize: 15, width: 18, textAlign: 'center', flexShrink: 0,
                  color: active ? '#43DC80' : '#9aa8a0',
                }} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* User / Logout */}
        <div style={{ borderTop: '1px solid #e8ede9', padding: '16px 20px', flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: '#9aa8a0', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userName}
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '7px 12px',
              background: 'transparent', border: '1px solid #fca5a5',
              borderRadius: 8, color: '#dc2626',
              cursor: 'pointer', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <i className="bi bi-box-arrow-right" /> Çıkış Yap
          </button>
        </div>
      </aside>

      {/* ── İçerik ──────────────────────────────────────── */}
      <main style={{ flex: 1, overflow: 'auto', minHeight: '100vh' }}>
        <Outlet />
      </main>

    </div>
  );
}
