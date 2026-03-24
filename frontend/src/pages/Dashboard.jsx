import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useMatch, useResolvedPath } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || '';
function authHeaders() { return { Authorization: `Bearer ${localStorage.getItem('token')}` }; }

// ─── Menü Yapısı ──────────────────────────────────────────────────────────────
function buildGroups(role) {
  const isAdmin = role === 'admin';
  const isMgr   = ['admin', 'manager'].includes(role);
  const homeRoute = isMgr ? '/' : '/home';

  return [
    {
      items: [
        { label: 'Anasayfa', icon: 'bi-house-door', to: homeRoute, exactEnd: true },
      ],
    },
    {
      label: 'TALEPLERİM',
      items: [
        { label: 'Bilgi İşlem Talebi',     icon: 'bi-laptop',           to: '/itsm/new'               },
        { label: 'Destek Hizmetleri',      icon: 'bi-wrench-adjustable', to: '/tickets/new/destek'    },
        { label: 'Tüm Başvurularım',       icon: 'bi-list-ul',          to: '/my-tickets'             },
        { label: 'Tüm Talepler',           icon: 'bi-ticket-detailed',  to: '/itsm',
          roles: ['admin', 'manager'] },
        { label: 'Onay Bekleyenler',       icon: 'bi-clipboard-check',  to: '/pending-approvals',
          roles: ['admin', 'manager'], approvalBadge: true },
      ],
    },
    ...(isMgr ? [{
      label: 'GÖREVLERİM',
      items: [
        { label: 'Aktif Görevlerim', icon: 'bi-check2-square', to: '/my-tasks'          },
        { label: 'Birim Raporu',     icon: 'bi-bar-chart-line', to: '/manager-dashboard' },
      ],
    }] : []),
    ...(isMgr ? [{
      label: 'ARAÇLAR',
      items: [
        { label: 'Personel',            icon: 'bi-people',          to: '/personel'           },
        { label: 'Envanter',            icon: 'bi-server',          to: '/admin/envanter'     },
        { label: 'ulakBELL Talepleri',  icon: 'bi-bell',            to: '/ulakbell-incidents' },
        { label: 'PDKS',                icon: 'bi-clock',           to: '/pdks'               },
        { label: 'Bilgi Tabanı',        icon: 'bi-book',            to: '/kb', disabled: true },
      ],
    }] : []),
    ...(isAdmin ? [{
      label: 'SİSTEM',
      items: [
        { label: 'Ayarlar', icon: 'bi-gear', to: '/admin/settings' },
      ],
    }] : []),
    {
      items: [
        { label: 'Profilim', icon: 'bi-person-circle', to: '/profile' },
      ],
    },
  ];
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
  const roleLabel = user?.role === 'admin' ? 'Yönetici' : user?.role === 'manager' ? 'Müdür' : 'Kullanıcı';

  return (
    <div ref={ref} className="nav-item dropdown header-profile" style={{ position: 'relative', listStyle: 'none' }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="nav-link i-false c-pointer"
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <div style={{
          width: 34, height: 34, borderRadius: '50%', background: 'var(--primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0,
        }}>
          {initials}
        </div>
        <div className="header-info" style={{ textAlign: 'left' }}>
          <span style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#374557', lineHeight: 1.2 }}>
            {user?.displayName?.split(' ')[0] || user?.username}
          </span>
          <small style={{ color: '#888', fontSize: 11 }}>{roleLabel}</small>
        </div>
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 8,
          background: '#fff', border: '1px solid #e6e6e6', borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)', zIndex: 9999, minWidth: 180,
          padding: '6px 0', overflow: 'hidden',
        }}>
          <button
            onClick={() => { setOpen(false); navigate('/profile'); }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#374557' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f0faf5'; e.currentTarget.style.color = 'var(--primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = '#374557'; }}
          >
            <i className="bi bi-person" style={{ fontSize: 15 }} /> Hesabım
          </button>
          <div style={{ borderTop: '1px solid #f0f0f0', margin: '4px 0' }} />
          <button
            onClick={() => { setOpen(false); logout(); navigate('/login', { replace: true }); }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#f82649' }}
            onMouseEnter={e => e.currentTarget.style.background = '#fff0f3'}
            onMouseLeave={e => e.currentTarget.style.background = ''}
          >
            <i className="bi bi-box-arrow-right" style={{ fontSize: 15 }} /> Çıkış Yap
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

  // Fade in after mount
  useEffect(() => { setMounted(true); }, []);

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

  // Onay bekleyen badge'i (admin + manager)
  useEffect(() => {
    if (!['admin', 'manager'].includes(user?.role)) return;
    const load = () =>
      fetch(`${API}/api/tickets/pending-approval/count`, { headers: authHeaders() })
        .then(r => r.ok ? r.json() : { count: 0 })
        .then(d => setApprovalBadge(d.count || 0))
        .catch(() => {});
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [user]);

  const groups = buildGroups(user?.role || 'user');

  return (
    <div id="main-wrapper" className={[mounted ? 'show' : '', sideMenu ? 'menu-toggle' : ''].join(' ').trim()}>

      {/* ── nav-header (Logo) ─────────────────────────────────────── */}
      <div className="nav-header">
        <span
          className="brand-logo"
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}
          onClick={() => navigate('/')}
        >
          {/* Logo icon */}
          <div style={{
            width: 42, height: 42, background: 'rgba(255,255,255,0.2)', borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 20, flexShrink: 0,
          }}>
            M
          </div>
          <div className="brand-title" style={{ lineHeight: 1.2 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Muğla BB</div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>Uygulama Portalı</div>
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
                <div className="input-group search-area d-lg-inline-flex">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ara..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ borderRadius: '30px 0 0 30px', background: '#f4f5fb', border: '1px solid #e6e6e6' }}
                  />
                  <div className="input-group-append">
                    <button className="input-group-text" style={{ borderRadius: '0 30px 30px 0', background: '#f4f5fb', border: '1px solid #e6e6e6', borderLeft: 'none', color: '#aaa' }}>
                      <i className="bi bi-search" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Sağ: Bildirimler + Kullanıcı */}
              <ul className="navbar-nav header-right main-notification">
                {/* Bell badge */}
                <li className="nav-item" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <button
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      width: 38, height: 38, borderRadius: '50%', color: '#888',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f0faf5'; e.currentTarget.style.color = 'var(--primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = '#888'; }}
                  >
                    <i className="bi bi-bell" style={{ fontSize: 18 }} />
                    {approvalBadge > 0 && (
                      <span style={{
                        position: 'absolute', top: 4, right: 4,
                        width: 16, height: 16, background: 'var(--primary)',
                        borderRadius: '50%', color: '#fff', fontSize: 9,
                        fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {approvalBadge > 9 ? '9+' : approvalBadge}
                      </span>
                    )}
                  </button>
                </li>

                <li style={{ width: 1, height: 24, background: '#e6e6e6', margin: '0 4px', alignSelf: 'center' }} />

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
                <span key={gIdx}>
                  {group.label && (
                    <li className={`nav-label${isFirstLabel ? ' first' : ''}`}>{group.label}</li>
                  )}
                  {visibleItems.map(item => (
                    <SidebarItem
                      key={item.to}
                      item={item}
                      approvalBadge={approvalBadge}
                      adBadge={adBadge}
                    />
                  ))}
                </span>
              );
            });
            })()}
          </ul>

          {/* Alt bilgi */}
          <div className="copyright" style={{ padding: '16px 20px', fontSize: 11, color: '#bbb', marginTop: 8 }}>
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

// ─── SidebarItem ─────────────────────────────────────────────────────────────
function SidebarItem({ item, approvalBadge, adBadge }) {
  const resolved = useResolvedPath(item.to);
  const match    = useMatch({ path: resolved.pathname, end: item.exactEnd ?? false });
  const isActive = !!match;

  if (item.disabled) {
    return (
      <li>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px',
          color: '#ccc', cursor: 'not-allowed', fontSize: 14,
        }}>
          <i className={`bi ${item.icon}`} style={{ fontSize: 16, width: 20, textAlign: 'center' }} />
          <span className="nav-text">{item.label}</span>
          <span style={{
            marginLeft: 'auto', fontSize: 10, background: '#f0f0f0',
            color: '#bbb', padding: '2px 6px', borderRadius: 10,
          }}>Yakında</span>
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
        style={{ display: 'flex', alignItems: 'center', gap: 10 }}
      >
        <i className={`bi ${item.icon}`} style={{ fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 }} />
        <span className="nav-text">{item.label}</span>

        {showApproval && (
          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{
              width: 20, height: 20, background: '#f82649',
              borderRadius: '50%', color: '#fff', fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {approvalBadge > 9 ? '9+' : approvalBadge}
            </span>
          </span>
        )}
        {showAd && (
          <span style={{
            marginLeft: 'auto', minWidth: 20, height: 20, background: '#f82649',
            borderRadius: 10, color: '#fff', fontSize: 10, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px',
          }}>
            {adBadge > 99 ? '99+' : adBadge}
          </span>
        )}
      </NavLink>
    </li>
  );
}
