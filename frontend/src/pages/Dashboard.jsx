import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || '';
function authHeaders() { return { Authorization: `Bearer ${localStorage.getItem('token')}` }; }

// ─── SVG ikonlar ─────────────────────────────────────────────────────────────
function HomeIcon()      { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H15v-6h-6v6H3.75A.75.75 0 013 21V9.75z" /></svg>; }
function TicketIcon()    { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>; }
function TaskIcon()      { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>; }
function PersonIcon()    { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>; }
function ProfileIcon()   { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>; }
function TagIcon()       { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" /></svg>; }
function SettingsIcon()  { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>; }
function SyncIcon()      { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>; }
function ServerIcon()    { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>; }
function ClipboardIcon() { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>; }
function SearchIcon()    { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>; }
function ChartIcon()     { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>; }
function NewTicketIcon() { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>; }
function ListIcon()      { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6m-6 4h4" /></svg>; }
function BellIcon()      { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>; }
function ClockIcon()     { return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" /></svg>; }
function BuildingIcon()  { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>; }
function WrenchIcon()    { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" /></svg>; }
function BookIcon()      { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>; }
function GroupIcon()     { return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm5-4v2m8-2v2M3 11h18" /></svg>; }

// ─── Menü Yapısı ──────────────────────────────────────────────────────────────
// Her grup:  { label?, separator?, items[], roles? }
// Her item:  { label, icon, to, roles?, adminOnly?, badge?, approvalBadge?, disabled? }

function buildGroups(role) {
  const isAdmin   = role === 'admin';
  const isMgr     = ['admin', 'manager'].includes(role);
  const homeRoute = isMgr ? '/' : '/home';

  return [
    // ── Anasayfa ──────────────────────────────────────────
    {
      items: [
        { label: 'Anasayfa', icon: HomeIcon, to: homeRoute, exactEnd: true },
      ],
    },

    // ── TALEPLERİM ────────────────────────────────────────
    {
      label: 'TALEPLERİM',
      separator: true,
      items: [
        { label: 'Talep / Arıza Bildir', icon: NewTicketIcon, to: '/itsm/new'           },
        { label: 'Tüm Başvurularım',     icon: ListIcon,      to: '/my-tickets'          },
        { label: 'Tüm Talepler',         icon: TicketIcon,    to: '/itsm',
          roles: ['admin', 'manager'] },
        { label: 'Onay Bekleyenler',     icon: ClipboardIcon, to: '/pending-approvals',
          roles: ['admin', 'manager'], approvalBadge: true },
      ],
    },

    // ── GÖREVLERİM (sadece admin/manager) ─────────────────
    ...(isMgr ? [{
      label: 'GÖREVLERİM',
      separator: true,
      items: [
        { label: 'Aktif Görevlerim', icon: TaskIcon,  to: '/my-tasks'         },
        { label: 'Birim Raporu',     icon: ChartIcon, to: '/manager-dashboard' },
      ],
    }] : []),

    // ── ARAÇLAR (sadece admin/manager) ────────────────────
    ...(isMgr ? [{
      label: 'ARAÇLAR',
      separator: true,
      items: [
        { label: 'Personel',     icon: PersonIcon,  to: '/admin/users'    },
        { label: 'Envanter',          icon: ServerIcon,  to: '/admin/envanter'      },
        { label: 'ulakBELL Talepleri', icon: BellIcon,    to: '/ulakbell-incidents'  },
        { label: 'PDKS',              icon: ClockIcon,   to: '/pdks'                },
        { label: 'Bilgi Tabanı',      icon: BookIcon,    to: '/kb', disabled: true  },
      ],
    }] : []),

    // ── SİSTEM (sadece admin) ─────────────────────────────
    ...(isAdmin ? [{
      label: 'SİSTEM',
      separator: true,
      items: [
        { label: 'Ayarlar', icon: SettingsIcon, to: '/admin/settings' },
      ],
    }] : []),

    // ── Profilim ──────────────────────────────────────────
    {
      separator: true,
      items: [
        { label: 'Profilim', icon: ProfileIcon, to: '/profile' },
      ],
    },
  ];
}

// ─── NavItem ─────────────────────────────────────────────────────────────────
function NavItem({ item, approvalBadge = 0, adBadge = 0 }) {
  const BASE = 'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors w-full';
  const ACTIVE = 'bg-indigo-50 text-indigo-700';
  const IDLE   = 'text-gray-500 hover:bg-gray-50 hover:text-gray-800';

  if (item.disabled) {
    return (
      <div className={`${BASE} ${IDLE} opacity-40 cursor-not-allowed`}>
        <span className="shrink-0"><item.icon /></span>
        <span className="flex-1">{item.label}</span>
        <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">Yakında</span>
      </div>
    );
  }

  const showApproval = item.approvalBadge && approvalBadge > 0;
  const showAd       = item.adBadge       && adBadge       > 0;

  return (
    <NavLink
      to={item.to}
      end={item.exactEnd}
      className={({ isActive }) => `${BASE} ${isActive ? ACTIVE : IDLE}`}
    >
      <span className="shrink-0"><item.icon /></span>
      <span className="flex-1">{item.label}</span>

      {showApproval && (
        <span className="relative flex items-center justify-center w-5 h-5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
          <span className="relative inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold">
            {approvalBadge > 9 ? '9+' : approvalBadge}
          </span>
        </span>
      )}
      {showAd && (
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
          {adBadge > 99 ? '99+' : adBadge}
        </span>
      )}
    </NavLink>
  );
}

// ─── UserDropdown ─────────────────────────────────────────────────────────────
function UserDropdown({ user, logout, align = 'up' }) {
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

  const go = (path) => { setOpen(false); navigate(path); };
  const initial = (user?.displayName || user?.username || '?')[0].toUpperCase();
  const dropdownPos = align === 'up' ? 'bottom-full mb-2 left-0' : 'top-full mt-2 right-0';
  const roleLabel = user?.role === 'admin' ? 'Yönetici' : user?.role === 'manager' ? 'Müdür' : 'Kullanıcı';

  return (
    <div ref={ref} className="relative">
      {align === 'up' ? (
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-3 w-full rounded-xl hover:bg-gray-50 px-2 py-2 transition"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initial}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-xs font-semibold text-gray-800 truncate leading-tight">{user?.displayName || user?.username}</p>
            <p className="text-[11px] text-gray-400 truncate leading-tight mt-0.5">{roleLabel}</p>
          </div>
          <svg className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      ) : (
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition px-2 py-1.5 rounded-xl hover:bg-indigo-50"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initial}
          </div>
          <span className="font-medium">{user?.displayName?.split(' ')[0] || user?.username}</span>
          <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {open && (
        <div className={`absolute ${dropdownPos} w-48 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 py-1.5 overflow-hidden`}>
          <button onClick={() => go('/profile')}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition">
            <ProfileIcon /> Hesabım
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button
            onClick={() => { setOpen(false); logout(); navigate('/login', { replace: true }); }}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Çıkış Yap
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
  const [search, setSearch]               = useState('');
  const [adBadge, setAdBadge]             = useState(0);
  const [approvalBadge, setApprovalBadge] = useState(0);

  // AD değişiklik badge'i (admin için)
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
    <div className="flex min-h-screen bg-gray-50">

      {/* ── Sol Sidebar ───────────────────────────────────────────────────── */}
      <aside className="w-60 bg-white border-r border-gray-100 flex flex-col shrink-0">

        {/* Logo */}
        <div
          className="flex items-center gap-3 px-4 h-16 border-b border-gray-100 cursor-pointer shrink-0"
          onClick={() => navigate('/')}
        >
          <img src="/mugla-logo.svg" alt="Muğla" className="w-10 h-10 object-contain shrink-0" />
          <div className="leading-tight min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">Muğla</p>
            <p className="text-[11px] text-gray-500 truncate">Uygulama Portalı</p>
          </div>
        </div>

        {/* Navigasyon */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {groups.map((group, idx) => {
            // Roldeki kullanıcının görebileceği item'ları filtrele
            const visibleItems = group.items.filter(item =>
              !item.roles || item.roles.includes(user?.role)
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={idx}>
                {/* Ayraç + grup başlığı (ilk grup hariç) */}
                {group.separator && (
                  <div className={`${idx === 0 ? '' : 'mt-4 pt-3 border-t border-gray-100'}`}>
                    {group.label && (
                      <p className="px-3 mb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                        {group.label}
                      </p>
                    )}
                  </div>
                )}
                {!group.separator && idx > 0 && <div className="mt-1" />}

                <div className={`space-y-0.5 ${group.separator && group.label ? '' : idx === 0 ? '' : 'mt-1'}`}>
                  {visibleItems.map(item => (
                    <NavItem
                      key={item.to}
                      item={item}
                      approvalBadge={approvalBadge}
                      adBadge={adBadge}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Alt kullanıcı */}
        <div className="px-3 py-4 border-t border-gray-100 shrink-0">
          <UserDropdown user={user} logout={logout} align="up" />
        </div>
      </aside>

      {/* ── Ana içerik ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Üst bar */}
        <header className="bg-white border-b border-gray-100 px-6 h-16 flex items-center justify-between shrink-0">
          <div className="relative w-72">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="Ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-100 rounded-xl
                focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300
                placeholder-gray-400 transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <button className="relative w-9 h-9 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition">
              <BellIcon />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <div className="w-px h-6 bg-gray-100 mx-1" />
            <UserDropdown user={user} logout={logout} align="down" />
          </div>
        </header>

        {/* Sayfa içeriği */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
