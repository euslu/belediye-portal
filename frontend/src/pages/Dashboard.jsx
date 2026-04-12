import { useState, useRef, useEffect, Fragment } from 'react';
import { NavLink, Outlet, useNavigate, useMatch, useResolvedPath, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import muglaLogo from '../assets/mugla_logo.png';

const API = import.meta.env.VITE_API_URL || '';
function authHeaders() { return { Authorization: `Bearer ${localStorage.getItem('token')}` }; }

// ─── Menü Yapısı ──────────────────────────────────────────────────────────────
const GS_YETKILI = ['portal.admin', 'tayfun.yilmaz'];

// sistemRol hiyerarşisi
const SISTEM_ROL_SEVIYE = { admin: 5, daire_baskani: 4, mudur: 3, sef: 2, personel: 1 };
function getSistemRolSeviye(user) {
  const sr = user?.sistemRol;
  if (sr && SISTEM_ROL_SEVIYE[sr]) return SISTEM_ROL_SEVIYE[sr];
  // Fallback → mevcut role
  if (user?.role === 'admin')   return 5;
  if (user?.role === 'manager') return 3;
  return 1;
}

function buildGroups(role, username, user) {
  const sistemRol = user?.sistemRol;
  const seviye    = getSistemRolSeviye(user || { role });

  // sistemRol varsa onu esas al (RBAC), yoksa JWT role'a dön
  const isAdmin   = sistemRol ? sistemRol === 'admin' : role === 'admin';
  // daire_baskani ve üzeri yönetici menüsünü görür
  const isMgr     = seviye >= 3 || ['admin', 'manager'].includes(role);
  // AR-GE: admin | Bilgi İşlem daire_baskani | Sistem Ağ müdürlüğü personeli | çalışma grubu üyesi
  const biDir     = user?.directorate || '';
  const biDept    = user?.department  || '';
  const gruplar   = user?.calismaGruplari || [];
  const isArge    = isAdmin
    || (sistemRol === 'daire_baskani' && /bilgi.i[̇i]şlem/i.test(biDir))
    || /sistem.*ağ.*veri güvenliği/i.test(biDept)
    || gruplar.some(g => /ar-?ge/i.test(g.ad));
  const isGS      = GS_YETKILI.includes(username || '');
  const homeRoute = isMgr ? '/' : '/home';

  return [
    {
      items: [
        { label: 'Anasayfa',      icon: 'bi-house-door',    to: homeRoute,         exactEnd: true },
        ...(isGS ? [{ label: 'Genel Sekreter', icon: 'bi-speedometer2', to: '/genel-sekreter' }] : []),
      ],
    },
    {
      label: 'TALEPLERİM',
      items: [
        { label: 'Bilgi İşlem Talebi',  icon: 'bi-laptop',            to: '/itsm/new',           exactEnd: true },
        { label: 'Destek Hizmetleri',   icon: 'bi-wrench-adjustable', to: '/tickets/new/destek', exactEnd: true },
        { label: 'Tüm Başvurularım',    icon: 'bi-list-ul',           to: '/my-tickets'          },
      ],
    },
    ...(isMgr ? [{
      label: 'GÖREVLERİM',
      items: [
        { label: 'Tüm Talepler',     icon: 'bi-ticket-detailed',  to: '/itsm'                                       },
        { label: 'Onay Bekleyenler', icon: 'bi-clipboard-check',  to: '/pending-approvals', approvalBadge: true     },
        { label: 'Aktif Görevlerim', icon: 'bi-check2-square',    to: '/my-tasks'                                   },
        { label: 'Birim Raporu',     icon: 'bi-bar-chart-line',   to: '/manager-dashboard'                          },
      ],
    }] : []),
    ...(isAdmin ? [{
      label: 'ARAÇLAR',
      items: [
        { label: 'Personel',           icon: 'bi-people', to: '/personel'           },
        { label: 'Envanter',           icon: 'bi-server', to: '/admin/envanter'     },
        { label: 'ulakBELL Talepleri', icon: 'bi-bell',   to: '/ulakbell-incidents' },
        { label: 'PDKS',               icon: 'bi-clock',  to: '/pdks'               },
        { label: 'Bilgi Tabanı',       icon: 'bi-book',   to: '/kb', disabled: true },
        { label: 'FlexCity',           icon: 'bi-database-check', to: '/flexcity' },
      ],
    }] : sistemRol === 'daire_baskani' ? [{
      label: 'ARAÇLAR',
      items: [
        { label: 'Personel', icon: 'bi-people', to: '/personel' },
        { label: 'PDKS',     icon: 'bi-clock',  to: '/pdks'     },
      ],
    }] : sistemRol === 'mudur' ? [{
      label: 'ARAÇLAR',
      items: [
        { label: 'PDKS',     icon: 'bi-clock',  to: '/pdks'     },
      ],
    }] : []),
    ...(isArge ? [{
      label: 'AR-GE',
      items: [
        { label: 'GSM / Data Hatları', icon: 'bi-phone',        to: '/arge/gsm-hat' },
        { label: 'Teslim Tutanağı',   icon: 'bi-file-earmark-text', to: '/arge/tutanak' },
      ],
    }] : []),
    ...(isAdmin || sistemRol === 'daire_baskani' ? [{
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

  const groups = buildGroups(user?.role || 'user', user?.username, user);

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
            width: 36, height: 36, borderRadius: 8, background: '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 3, flexShrink: 0,
          }}>
            <img src={muglaLogo} alt="MBB"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
          <div style={{ padding: '8px 12px 4px' }}>
            <button
              onClick={() => { logout(); navigate('/login', { replace: true }); }}
              style={{
                width: '100%', padding: '9px 16px',
                background: 'transparent', border: '1px solid #fca5a5',
                borderRadius: 8, color: '#dc2626',
                cursor: 'pointer', fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <i className="bi bi-box-arrow-right" style={{ fontSize: 15 }} />
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
