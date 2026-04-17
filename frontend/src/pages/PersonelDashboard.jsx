import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import LoadingState from '../components/ui/LoadingState';
import PageHeader from '../components/ui/PageHeader';
import Surface from '../components/ui/Surface';

const API = import.meta.env.VITE_API_URL || '';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

async function apiFetch(path) {
  const r = await fetch(API + path, { headers: authH() });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function apiPost(path, body) {
  const r = await fetch(API + path, {
    method: 'POST',
    headers: { ...authH(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

const STATUS_TR = {
  OPEN: 'Açık',
  PENDING_APPROVAL: 'Onay Bekliyor',
  ASSIGNED: 'Atandı',
  IN_PROGRESS: 'İşlemde',
  RESOLVED: 'Çözüldü',
  CLOSED: 'Kapalı',
  REJECTED: 'Reddedildi',
};

const STATUS_CLASS = {
  OPEN: 'bg-blue-100 text-blue-700 border-blue-200',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700 border-amber-200',
  ASSIGNED: 'bg-violet-100 text-violet-700 border-violet-200',
  IN_PROGRESS: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  RESOLVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  CLOSED: 'bg-slate-100 text-slate-600 border-slate-200',
  REJECTED: 'bg-red-100 text-red-700 border-red-200',
};

const SISTEM_ROL_TR = {
  admin: 'Sistem Yöneticisi',
  daire_baskani: 'Daire Başkanı',
  mudur: 'Müdür',
  sef: 'Şef',
  personel: 'Personel',
};

const ROL_TR = { admin: 'Yönetici', manager: 'Müdür', user: 'Personel' };

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ${STATUS_CLASS[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {STATUS_TR[status] || status}
    </span>
  );
}

function StatCard({ icon, label, value, colorClass, to, sub }) {
  const content = (
    <Surface className="p-5 h-full">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-2xl">
          {icon}
        </div>
        <div className="min-w-0">
          <div className={`text-3xl font-bold leading-none ${colorClass || 'text-slate-900'}`}>{value}</div>
          <div className="text-sm font-semibold text-slate-700 mt-2">{label}</div>
          {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
        </div>
      </div>
    </Surface>
  );

  return to ? <Link to={to} className="block no-underline">{content}</Link> : content;
}

function SectionHeader({ children, action, tone = 'default' }) {
  const toneClass = tone === 'amber' ? 'text-amber-700' : tone === 'indigo' ? 'text-indigo-700' : 'text-slate-800';
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <h3 className={`text-base font-bold m-0 ${toneClass}`}>{children}</h3>
      {action}
    </div>
  );
}

function TicketRow({ ticket, showFrom }) {
  return (
    <Link to={`/itsm/${ticket.id}`} className="block no-underline">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 hover:bg-white hover:shadow-sm transition">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-800 truncate">
              #{ticket.id} {ticket.title}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {showFrom
                ? `${ticket.createdBy?.displayName || '—'} · ${ticket.createdBy?.directorate || '—'}`
                : `${ticket.createdBy?.displayName || '—'}`}
              {' · '}
              {new Date(ticket.createdAt).toLocaleDateString('tr-TR')}
              {ticket.group ? ` · ${ticket.group.name}` : ''}
            </div>
          </div>
          <StatusBadge status={ticket.status} />
        </div>
      </div>
    </Link>
  );
}

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const weekDays = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

  return (
    <div className="text-right">
      <div className="text-2xl font-bold text-white leading-none">
        {now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="text-xs text-slate-300 mt-1">
        {weekDays[now.getDay()]}, {now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  );
}

function StatusBar({ groups }) {
  if (!groups?.length) return null;
  const total = groups.reduce((sum, group) => sum + group._count, 0);

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {groups.map((group) => (
        <span
          key={group.status}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${STATUS_CLASS[group.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}
        >
          {group._count} {STATUS_TR[group.status] || group.status}
        </span>
      ))}
      <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold">
        Toplam: {total}
      </span>
    </div>
  );
}

export default function PersonelDashboard() {
  const { user } = useAuth();

  const sistemRol = user?.sistemRol || (
    user?.role === 'admin' ? 'admin' : user?.role === 'manager' ? 'mudur' : 'personel'
  );
  const isYonetici = ['admin', 'daire_baskani', 'mudur'].includes(sistemRol);

  const [ozet, setOzet] = useState(null);
  const [taleplerim, setTaleplerim] = useState([]);
  const [gorevlerim, setGorevlerim] = useState([]);
  const [daireTalepler, setDaireTalepler] = useState([]);
  const [daireOzet, setDaireOzet] = useState([]);
  const [pendingApproval, setPendingApproval] = useState([]);
  const [lokasyon, setLokasyon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [daireLoading, setDaireLoading] = useState(isYonetici);

  useEffect(() => {
    const fetches = [
      apiFetch('/api/dashboard/benim')
        .then((data) => {
          setOzet(data.ozet || {});
          setTaleplerim(data.taleplerim || []);
          setGorevlerim(data.gorevlerim || []);
        })
        .catch(() => {}),
      apiFetch('/api/lokasyon/benim')
        .then((data) => {
          if (data) setLokasyon(data.lokasyon || null);
        })
        .catch(() => {}),
    ];

    if (isYonetici) {
      fetches.push(
        apiFetch('/api/tickets/pending-approval')
          .then(setPendingApproval)
          .catch(() => {})
      );
    }

    Promise.all(fetches).finally(() => setLoading(false));
  }, [isYonetici]);

  useEffect(() => {
    if (!isYonetici) return;
    apiFetch('/api/dashboard/daire-talepleri')
      .then((data) => {
        setDaireTalepler(data.talepler || []);
        setDaireOzet(data.statusGruplari || []);
      })
      .catch(() => {})
      .finally(() => setDaireLoading(false));
  }, [isYonetici]);

  const handleApprove = async (id, action) => {
    await apiPost(`/api/tickets/${id}/${action === 'approve' ? 'approve' : 'reject'}`, {});
    apiFetch('/api/tickets/pending-approval').then(setPendingApproval).catch(() => {});
  };

  const initials = user?.displayName
    ? user.displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : (user?.username?.[0] || '?').toUpperCase();

  return (
    <div className="portal-page portal-page--wide space-y-5">
      <Surface className="p-6 lg:p-7 bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_55%,#0f766e_100%)] border-0 shadow-[0_20px_48px_rgba(15,23,42,0.18)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-16 h-16 rounded-[20px] bg-white/15 border border-white/10 backdrop-blur-sm text-white flex items-center justify-center text-2xl font-extrabold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <PageHeader
                icon={null}
                title={`Hoş geldiniz, ${user?.displayName?.split(' ')[0] || user?.username}`}
                description={user?.title || 'Kurumsal görev ve talep özetiniz'}
                meta={
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-300/90 text-slate-900 text-xs font-bold">
                      {SISTEM_ROL_TR[sistemRol] || ROL_TR[user?.role] || 'Personel'}
                    </span>
                    {user?.directorate && <span className="text-xs text-slate-200">🏢 {user.directorate}</span>}
                    {user?.department && user.department !== user.directorate && <span className="text-xs text-slate-300">📂 {user.department}</span>}
                    {user?.city && user.city !== '-' && <span className="text-xs text-slate-300">📍 {lokasyon?.ad || user.city}</span>}
                  </div>
                }
                className="text-white"
              />
            </div>
          </div>

          <div className="flex flex-col items-start xl:items-end gap-4">
            <LiveClock />
            <div className="flex flex-wrap gap-2">
              <Link to="/itsm/new" className="no-underline">
                <Button color="green" className="text-sm">+ Bilgi İşlem Talebi</Button>
              </Link>
              <Link to="/tickets/new/destek" className="no-underline">
                <Button variant="soft" className="text-sm bg-white/12 border-white/15 text-white hover:text-white">+ Destek Talebi</Button>
              </Link>
            </div>
          </div>
        </div>
      </Surface>

      {(user?.city || user?.calismaGruplari?.length > 0) && (
        <div className={`grid gap-4 ${user?.city && user?.calismaGruplari?.length > 0 ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
          {user?.city && user.city !== '-' && (
            <Surface soft className="p-5">
              <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-emerald-600 m-0">Çalışma Lokasyonu</p>
              <div className="text-lg font-bold text-slate-800 mt-3">{lokasyon?.ad || user.city}</div>
              {lokasyon?.ilce && <p className="text-sm text-slate-500 mt-2 m-0">📌 {lokasyon.ilce} ilçesi</p>}
              {lokasyon?.personelSayisi && <p className="text-sm text-slate-500 mt-1.5 m-0">👥 Bu lokasyonda {lokasyon.personelSayisi} personel</p>}
              {lokasyon?.adres && <p className="text-xs text-slate-400 mt-3 mb-0 leading-relaxed">{lokasyon.adres}</p>}
              <div className="mt-4">
                <Button variant="soft" className="text-sm" disabled>🗺️ Haritada Göster (yakında)</Button>
              </div>
            </Surface>
          )}

          {user?.calismaGruplari?.length > 0 && (
            <Surface className="p-5">
              <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-slate-400 m-0">Çalışma Grupları</p>
              <div className="mt-4 space-y-2">
                {user.calismaGruplari.map((group) => (
                  <div key={group.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3">
                    <span className="text-sm font-semibold text-slate-700">{group.ad}</span>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${group.rol === 'lider' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {group.rol === 'lider' ? '👑 Lider' : 'Üye'}
                    </span>
                  </div>
                ))}
              </div>
            </Surface>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="🔄" label="Açık Görevlerim" value={loading ? '…' : (ozet?.acikGorev ?? 0)} colorClass="text-blue-600" to="/my-tasks" />
        <StatCard icon="⏳" label="Onay Bekliyor" value={loading ? '…' : (ozet?.bekleyenOnay ?? 0)} colorClass="text-amber-600" to="/my-tickets" />
        <StatCard icon="✅" label="Tamamlanan" value={loading ? '…' : (ozet?.tamamlanan ?? 0)} colorClass="text-emerald-600" to="/my-tickets" />
        <StatCard icon="⚠️" label="SLA İhlali" value={loading ? '…' : (ozet?.slaIhlali ?? 0)} colorClass="text-red-600" to="/my-tasks" sub={ozet?.slaIhlali > 0 ? 'Acil aksiyon gerekiyor!' : undefined} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Surface className="p-5">
          <SectionHeader action={<Link to="/my-tickets" className="text-sm font-semibold text-emerald-600 no-underline">Tümü →</Link>}>
            📋 Son Taleplerim
          </SectionHeader>
          {loading ? (
            <LoadingState compact title="Talepler yükleniyor..." />
          ) : taleplerim.length === 0 ? (
            <EmptyState compact icon="📭" title="Henüz başvuru yok" description="İlk talebinizi oluşturarak bu alanı doldurabilirsiniz." />
          ) : (
            <div className="space-y-2">
              {taleplerim.slice(0, 6).map((ticket) => <TicketRow key={ticket.id} ticket={ticket} showFrom={false} />)}
            </div>
          )}
        </Surface>

        <Surface className="p-5">
          <SectionHeader action={<Link to="/my-tasks" className="text-sm font-semibold text-emerald-600 no-underline">Tümü →</Link>}>
            🎯 Aktif Görevlerim
          </SectionHeader>
          {loading ? (
            <LoadingState compact title="Görevler yükleniyor..." />
          ) : gorevlerim.length === 0 ? (
            <EmptyState compact icon="🧭" title="Aktif görev yok" description="Atanmış aktif görevler burada listelenecek." />
          ) : (
            <div className="space-y-2">
              {gorevlerim.slice(0, 6).map((ticket) => <TicketRow key={ticket.id} ticket={ticket} showFrom={false} />)}
            </div>
          )}
        </Surface>
      </div>

      {isYonetici && (
        <Surface className="p-5 border-amber-200 bg-amber-50/40">
          <SectionHeader
            tone="amber"
            action={<Link to="/pending-approvals" className="text-sm font-semibold text-amber-700 no-underline">Tümü →</Link>}
          >
            ⏳ Onay Bekleyen Talepler
          </SectionHeader>

          {loading ? (
            <LoadingState compact title="Onay bekleyen talepler yükleniyor..." />
          ) : pendingApproval.length === 0 ? (
            <EmptyState compact icon="✅" title="Onay bekleyen talep yok" description="Şu an aksiyon gerektiren bekleyen bir kayıt görünmüyor." />
          ) : (
            <div className="space-y-2">
              {pendingApproval.slice(0, 6).map((ticket) => (
                <div key={ticket.id} className="rounded-2xl border border-amber-200 bg-white px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">#{ticket.id} {ticket.title}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {ticket.createdBy?.displayName} · {ticket.createdBy?.directorate || '—'} · {new Date(ticket.createdAt).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button color="green" className="text-xs" onClick={() => handleApprove(ticket.id, 'approve')}>✓ Onayla</Button>
                    <Button variant="soft" className="text-xs border-red-200 text-red-700 hover:text-red-800" onClick={() => handleApprove(ticket.id, 'reject')}>✕ Reddet</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Surface>
      )}

      {isYonetici && (
        <Surface className="p-5">
          <SectionHeader tone="indigo">
            🏢 {sistemRol === 'mudur' ? 'Müdürlüğüme Gelen Talepler' : 'Daireye Gelen Talepler'}
          </SectionHeader>
          <StatusBar groups={daireOzet} />
          {daireLoading ? (
            <LoadingState compact title="Birim talepleri yükleniyor..." />
          ) : daireTalepler.length === 0 ? (
            <EmptyState compact icon="🏢" title="Biriminize gelen talep yok" description="Yeni kayıtlar geldiğinde burada listelenecek." />
          ) : (
            <div className="space-y-2">
              {daireTalepler.slice(0, 10).map((ticket) => <TicketRow key={ticket.id} ticket={ticket} showFrom={true} />)}
            </div>
          )}
          {daireTalepler.length > 10 && (
            <div className="text-center mt-4">
              <Link to="/itsm" className="text-sm font-semibold text-indigo-600 no-underline">Tümünü gör ({daireTalepler.length}) →</Link>
            </div>
          )}
        </Surface>
      )}
    </div>
  );
}
