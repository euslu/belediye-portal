import { useState, useRef, useEffect, Fragment } from 'react';
import { NavLink, Outlet, useNavigate, useMatch, useResolvedPath, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import muglaMark from '../assets/mugla_logo.png';
import UlakbellBildirimIcon from '../components/UlakbellBildirimIcon';

const API = import.meta.env.VITE_API_URL || '';
function authHeaders() { return { Authorization: `Bearer ${localStorage.getItem('token')}` }; }

// sistemRol hiyerarşisi
const SISTEM_ROL_SEVIYE = { admin: 5, daire_baskani: 4, mudur: 3, sef: 2, personel: 1 };
function getSistemRolSeviye(user) {
  const sr = user?.sistemRol;
  if (sr && SISTEM_ROL_SEVIYE[sr]) return SISTEM_ROL_SEVIYE[sr];
  if (user?.role === 'admin')   return 5;
  if (user?.role === 'manager') return 3;
  return 1;
}

// ─── UserDropdown (header) ───────────────────────────────────────────────────
function UserDropdown({ user, logout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const initials = user?.displayName
    ? user.displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : (user?.username?.[0] || '?').toUpperCase();
  const roleLabel = (user?.sistemRol === 'admin' || user?.role === 'admin') ? 'Yönetici'
    : (user?.sistemRol === 'daire_baskani') ? 'Daire Başkanı'
    : (user?.sistemRol === 'mudur' || user?.role === 'manager') ? 'Müdür'
    : (user?.sistemRol === 'sef') ? 'Şef'
    : 'Kullanıcı';

  return (
    <div ref={ref} className="nav-item dropdown header-profile portal-user-dropdown">
      <button
        onClick={() => setOpen(v => !v)}
        className="nav-link i-false c-pointer portal-user-dropdown__trigger"
      >
        <div className="portal-user-dropdown__avatar">
          {initials}
        </div>
        <div className="header-info portal-user-dropdown__info">
          <span className="portal-user-dropdown__name">
            {user?.displayName?.split(' ')[0] || user?.username}
          </span>
          <small className="portal-user-dropdown__role">{roleLabel}</small>
        </div>
      </button>

      {open && (
        <div className="portal-user-dropdown__menu">
          <button
            onClick={() => { setOpen(false); navigate('/profile'); }}
            className="portal-user-dropdown__action"
          >
            <i className="bi bi-person" /> Hesabım
          </button>
          <div className="portal-user-dropdown__divider" />
          <button
            onClick={() => { setOpen(false); logout(); navigate('/login', { replace: true }); }}
            className="portal-user-dropdown__action portal-user-dropdown__action--danger"
          >
            <i className="bi bi-box-arrow-right" /> Çıkış Yap
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sideMenu, setSideMenu]   = useState(false);
  const [mounted, setMounted]     = useState(false);
  const [search, setSearch]       = useState('');
  const [adBadge, setAdBadge]             = useState(0);
  const [approvalBadge, setApprovalBadge] = useState(0);

  const [groups, setGroups]         = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);

  const isMgrUser = getSistemRolSeviye(user) >= 3 || ['admin', 'manager'].includes(user?.role);

  // Fade in after mount
  useEffect(() => { setMounted(true); }, []);

  // Menü öğelerini API'den çek
  useEffect(() => {
    if (!user) return;
    fetch(`${API}/api/menu-permission/my-menu`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(setGroups)
      .catch(() => setGroups([]))
      .finally(() => setMenuLoading(false));
  }, [user]);

  // AD değişiklik badge'i (admin)
  useEffect(() => {
    if (user?.role !== 'admin') return;
    const load = () =>
      fetch(`${API}/api/admin/ad-sync/changes/unnotified-count`, { headers: authHeaders() })
        .then(r => r.ok ? r.json() : { count: 0 })
        .then(d => setAdBadge(d.count || 0))
        .catch(() => {});
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [user]);

  // Onay bekleyen badge'i (admin + daire_baskani + mudur + manager)
  useEffect(() => {
    const seviye = getSistemRolSeviye(user);
    if (seviye < 3 && !['admin', 'manager'].includes(user?.role)) return;
    const load = () =>
      fetch(`${API}/api/tickets/pending-approval/count`, { headers: authHeaders() })
        .then(r => r.ok ? r.json() : { count: 0 })
        .then(d => setApprovalBadge(d.count || 0))
        .catch(() => {});
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [user]);

  return (
    <div id="main-wrapper" className={[mounted ? 'show' : '', sideMenu ? 'menu-toggle' : ''].join(' ').trim()}>

      {/* ── nav-header (Logo) ─────────────────────────────────────── */}
      <div className="nav-header">
        <span
          className="brand-logo portal-brand-logo"
          onClick={() => navigate('/')}
        >
          <div className="portal-brand-logo__card">
            <div className="portal-brand-logo__mark">
              <img
                src={muglaMark}
                alt="Muğla Büyükşehir Belediyesi"
                className="portal-brand-logo__mark-image"
              />
            </div>
            <div className="portal-brand-logo__copy">
              <div className="portal-brand-logo__title">MUĞLA</div>
              <div className="portal-brand-logo__subtitle">
                Büyükşehir Belediyesi
              </div>
            </div>
          </div>
        </span>

        <div
          className="nav-control"
          onClick={() => setSideMenu(v => !v)}
        >
          <div className={`hamburger ${sideMenu ? 'is-active' : ''}`}>
            <span className="line" />
            <span className="line" />
            <span className="line" />
          </div>
        </div>
      </div>

      {/* ── header (Top bar) ──────────────────────────────────────── */}
      <div className="header">
        <div className="header-content">
          <nav className="navbar navbar-expand">
            <div className="collapse navbar-collapse justify-content-between">

              {/* Sol: Arama */}
              <div className="header-left">
                <div className="input-group search-area d-lg-inline-flex portal-shell-search">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ara..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  <div className="input-group-append portal-shell-search__append">
                    <button className="input-group-text portal-shell-search__button">
                      <i className="bi bi-search" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Sağ: Bildirimler + Kullanıcı */}
              <ul className="navbar-nav header-right main-notification">
                {/* ulakBELL bildirim ikonu */}
                {isMgrUser && <UlakbellBildirimIcon />}

                {/* Bell badge */}
                <li className="nav-item portal-shell-bell">
                  <button
                    className="portal-shell-bell__button"
                  >
                    <i className="bi bi-bell portal-shell-bell__icon" />
                    {approvalBadge > 0 && (
                      <span className="portal-shell-bell__badge">
                        {approvalBadge > 9 ? '9+' : approvalBadge}
                      </span>
                    )}
                  </button>
                </li>

                <li className="portal-shell-divider" />

                {/* User dropdown */}
                <UserDropdown user={user} logout={logout} />
              </ul>
            </div>
          </nav>
        </div>
      </div>

      {/* ── deznav (Sidebar) ──────────────────────────────────────── */}
      <div className="deznav">
        <div className="deznav-scroll" style={{ overflowY: 'auto', height: '100%' }}>
          <ul className="metismenu" id="menu">
            {(() => {
              let firstLabel = true;
              return groups.map((group, gIdx) => {
              const visibleItems = group.items.filter(item =>
                !item.roles || item.roles.includes(user?.role)
              );
              if (visibleItems.length === 0) return null;

              const isFirstLabel = group.label && firstLabel;
              if (group.label) firstLabel = false;

              return (
                <Fragment key={gIdx}>
                  {group.label && (
                    <li className={`nav-label${isFirstLabel ? ' first' : ''}`}>{group.label}</li>
                  )}
                  {visibleItems.map(item =>
                    item.subGroup
                      ? <SidebarGroupItem key={item.label} item={item} />
                      : <SidebarItem key={item.to} item={item} approvalBadge={approvalBadge} adBadge={adBadge} />
                  )}
                </Fragment>
              );
            });
            })()}

          </ul>

          {/* Çıkış Yap */}
          <div className="portal-shell-logout-wrap">
            <button
              onClick={() => { logout(); navigate('/login', { replace: true }); }}
              className="portal-shell-logout"
            >
              <i className="bi bi-box-arrow-right" />
              <span className="nav-text">Çıkış Yap</span>
            </button>
          </div>

          {/* Alt bilgi */}
          <div className="copyright" style={{ padding: '12px 20px 16px', fontSize: 11, color: '#bbb' }}>
            <p style={{ margin: 0 }}>© {new Date().getFullYear()} Muğla Büyükşehir Belediyesi</p>
          </div>
        </div>
      </div>

      {/* ── content-body ──────────────────────────────────────────── */}
      <div className="content-body">
        <div className="container-fluid" style={{ padding: 0 }}>
          <Outlet />
        </div>
      </div>

    </div>
  );
}

// ─── SidebarGroupItem (her zaman açık alt menü) ──────────────────────────────
function SidebarGroupItem({ item }) {
  const location = useLocation();
  const isAnyActive = item.subItems.some(s => location.pathname.startsWith(s.to));

  return (
    <li className={isAnyActive ? 'mm-active' : ''}>
      {/* Grup etiketi — tıklanamaz, sadece başlık */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 20px',
        color: isAnyActive ? 'var(--primary)' : 'inherit',
      }}>
        <i className={`bi ${item.icon}`} style={{ fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 }} />
        <span className="nav-text">{item.label}</span>
      </div>

      {/* Alt öğeler — her zaman görünür */}
      <ul style={{ listStyle: 'none', margin: 0, padding: '2px 0 6px 0' }}>
        {item.subItems.map(sub => (
          <SidebarSubItem key={sub.to} item={sub} />
        ))}
      </ul>
    </li>
  );
}

function SidebarSubItem({ item }) {
  const resolved = useResolvedPath(item.to);
  const match    = useMatch({ path: resolved.pathname, end: item.exactEnd ?? false });
  const isActive = !!match;

  return (
    <li style={{ margin: 0 }}>
      <NavLink
        to={item.to}
        end={item.exactEnd}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 20px 8px 36px',
          color: isActive ? 'var(--primary)' : '#888',
          fontWeight: isActive ? 600 : 400,
          fontSize: 13,
          borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
          marginLeft: 20,
          transition: 'color 0.15s, border-color 0.15s',
          textDecoration: 'none',
        }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--primary)'; }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#888'; }}
      >
        <i className={`bi ${item.icon}`} style={{ fontSize: 14, width: 16, textAlign: 'center', flexShrink: 0 }} />
        <span>{item.label}</span>
      </NavLink>
    </li>
  );
}

// ─── SidebarItem ─────────────────────────────────────────────────────────────
function SidebarItem({ item, approvalBadge, adBadge }) {
  const resolved = useResolvedPath(item.to);
  const match    = useMatch({ path: resolved.pathname, end: item.exactEnd ?? false });
  const isActive = !!match;

  if (item.disabled) {
    return (
      <li>
        <span className="portal-sidebar-disabled">
          <i className={`bi ${item.icon} portal-sidebar-disabled__icon`} />
          <span className="nav-text">{item.label}</span>
          <span className="portal-sidebar-disabled__badge">Yakında</span>
        </span>
      </li>
    );
  }

  const showApproval = item.approvalBadge && approvalBadge > 0;
  const showAd       = item.adBadge       && adBadge       > 0;

  return (
    <li className={isActive ? 'mm-active' : ''}>
      <NavLink
        to={item.to}
        end={item.exactEnd}
        className="portal-sidebar-link"
      >
        <i className={`bi ${item.icon} portal-sidebar-link__icon`} />
        <span className="nav-text">{item.label}</span>

        {showApproval && (
          <span className="portal-sidebar-link__badge-wrap">
            <span className="portal-sidebar-link__badge portal-sidebar-link__badge--round">
              {approvalBadge > 9 ? '9+' : approvalBadge}
            </span>
          </span>
        )}
        {showAd && (
          <span className="portal-sidebar-link__badge portal-sidebar-link__badge--pill">
            {adBadge > 99 ? '99+' : adBadge}
          </span>
        )}
      </NavLink>
    </li>
  );
}
