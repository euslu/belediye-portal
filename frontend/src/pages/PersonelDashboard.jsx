import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API  = import.meta.env.VITE_API_URL || '';
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

// ── Sabitler ──────────────────────────────────────────────────────────────────
const C = {
  primary: '#43DC80', primaryDark: '#2db866',
  danger:  '#ef4444', warning: '#f59e0b',
  info:    '#3b82f6', purple: '#8b5cf6',
  gray:    '#6b7280', bg: '#f8fafc', card: '#ffffff',
};

const STATUS_TR = {
  OPEN: 'Açık', PENDING_APPROVAL: 'Onay Bekliyor', ASSIGNED: 'Atandı',
  IN_PROGRESS: 'İşlemde', RESOLVED: 'Çözüldü', CLOSED: 'Kapalı', REJECTED: 'Reddedildi',
};
const STATUS_COLOR = {
  OPEN: '#3b82f6', PENDING_APPROVAL: '#f59e0b', ASSIGNED: '#8b5cf6',
  IN_PROGRESS: '#06b6d4', RESOLVED: '#43DC80', CLOSED: '#9ca3af', REJECTED: '#ef4444',
};
const SISTEM_ROL_TR = {
  admin: 'Sistem Yöneticisi', daire_baskani: 'Daire Başkanı',
  mudur: 'Müdür', sef: 'Şef', personel: 'Personel',
};
const ROL_TR = { admin: 'Yönetici', manager: 'Müdür', user: 'Personel' };

// ── Küçük bileşenler ──────────────────────────────────────────────────────────
function Badge({ status }) {
  const color = STATUS_COLOR[status] || C.gray;
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, color,
      background: color + '18', borderRadius: 6, padding: '2px 8px',
      border: `1px solid ${color}33`, whiteSpace: 'nowrap',
    }}>{STATUS_TR[status] || status}</span>
  );
}

function KPI({ icon, label, value, color, to, sub }) {
  const inner = (
    <div style={{
      background: C.card, borderRadius: 14, padding: '18px 20px',
      border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      display: 'flex', alignItems: 'center', gap: 14,
      textDecoration: 'none',
    }}>
      <span style={{ fontSize: 30 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, color: color || '#111827', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: C.gray, marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
  return to
    ? <Link to={to} style={{ textDecoration: 'none', display: 'block' }}>{inner}</Link>
    : inner;
}

function SectionTitle({ children, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: 0 }}>{children}</h3>
      {action}
    </div>
  );
}

function TicketRow({ t, showFrom }) {
  return (
    <Link to={`/itsm/${t.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: '#fafafa', borderRadius: 10, padding: '10px 14px',
        border: '1px solid #e5e7eb', marginBottom: 6,
        borderLeft: `3px solid ${STATUS_COLOR[t.status] || C.gray}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              #{t.id} {t.title}
            </div>
            <div style={{ fontSize: 11, color: C.gray, marginTop: 2 }}>
              {showFrom
                ? `${t.createdBy?.displayName || '—'} · ${t.createdBy?.directorate || '—'}`
                : `${t.createdBy?.displayName || '—'}`
              }
              {' · '}{new Date(t.createdAt).toLocaleDateString('tr-TR')}
              {t.group ? ` · ${t.group.name}` : ''}
            </div>
          </div>
          <Badge status={t.status} />
        </div>
      </div>
    </Link>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: C.card, borderRadius: 14, padding: '18px 20px',
      border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      ...style,
    }}>
      {children}
    </div>
  );
}

function Empty({ text }) {
  return (
    <div style={{ color: C.gray, fontSize: 13, textAlign: 'center', padding: '20px 0', background: '#f9fafb', borderRadius: 10 }}>
      {text}
    </div>
  );
}

// ── Canlı saat ────────────────────────────────────────────────────────────────
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  const weekDays = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  return (
    <div style={{ textAlign: 'right', flexShrink: 0 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
        {now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div style={{ fontSize: 12, color: C.gray, marginTop: 1 }}>
        {weekDays[now.getDay()]}, {now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  );
}

// ── Durum dağılım şeridi ──────────────────────────────────────────────────────
function StatusBar({ groups }) {
  if (!groups || groups.length === 0) return null;
  const total = groups.reduce((s, g) => s + g._count, 0);
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
      {groups.map(g => (
        <div key={g.status} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: (STATUS_COLOR[g.status] || C.gray) + '15',
          border: `1px solid ${(STATUS_COLOR[g.status] || C.gray)}33`,
          borderRadius: 8, padding: '4px 10px',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[g.status] || C.gray, display: 'inline-block' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{g._count}</span>
          <span style={{ fontSize: 11, color: C.gray }}>{STATUS_TR[g.status] || g.status}</span>
        </div>
      ))}
      <div style={{ fontSize: 11, color: C.gray, alignSelf: 'center', marginLeft: 4 }}>
        Toplam: <strong>{total}</strong>
      </div>
    </div>
  );
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────
export default function PersonelDashboard() {
  const { user } = useAuth();

  const sistemRol = user?.sistemRol || (
    user?.role === 'admin' ? 'admin' :
    user?.role === 'manager' ? 'mudur' : 'personel'
  );
  const isYonetici = ['admin', 'daire_baskani', 'mudur'].includes(sistemRol);

  // Kişisel veriler
  const [ozet,       setOzet]       = useState(null);
  const [taleplerim, setTaleplerim] = useState([]);
  const [gorevlerim, setGorevlerim] = useState([]);
  // Birim talepler (yönetici)
  const [daireTalepler, setDaireTalepler] = useState([]);
  const [daireOzet,     setDaireOzet]     = useState([]);
  // Onay bekleyenler
  const [pendingApproval, setPendingApproval] = useState([]);
  // Lokasyon
  const [lokasyon,       setLokasyon]       = useState(null);
  const [lokasyonPersonel, setLokasyonPersonel] = useState([]);

  const [loading,      setLoading]      = useState(true);
  const [daireLoading, setDaireLoading] = useState(isYonetici);

  useEffect(() => {
    const fetches = [
      apiFetch('/api/dashboard/benim')
        .then(d => {
          setOzet(d.ozet || {});
          setTaleplerim(d.taleplerim || []);
          setGorevlerim(d.gorevlerim || []);
        })
        .catch(() => {}),
      apiFetch('/api/lokasyon/benim')
        .then(d => {
          if (d) {
            setLokasyon(d.lokasyon || null);
            setLokasyonPersonel(d.personel || []);
          }
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
      .then(d => {
        setDaireTalepler(d.talepler || []);
        setDaireOzet(d.statusGruplari || []);
      })
      .catch(() => {})
      .finally(() => setDaireLoading(false));
  }, [isYonetici]);

  const handleApprove = async (id, action) => {
    await apiPost(`/api/tickets/${id}/${action === 'approve' ? 'approve' : 'reject'}`, {});
    apiFetch('/api/tickets/pending-approval').then(setPendingApproval).catch(() => {});
  };

  const initials = user?.displayName
    ? user.displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : (user?.username?.[0] || '?').toUpperCase();

  const totalDaire = daireTalepler.length;

  return (
    <div style={{ fontFamily: "'Poppins','Segoe UI',sans-serif", background: C.bg, minHeight: '100vh', padding: '24px 20px 48px' }}>
      <div style={{ maxWidth: 1140, margin: '0 auto' }}>

        {/* ── KULLANICI KARTI ────────────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          borderRadius: 18, padding: '24px 28px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
        }}>
          {/* Avatar */}
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: C.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 22, flexShrink: 0,
          }}>
            {initials}
          </div>

          {/* Bilgiler */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>
                Hoş geldiniz, {user?.displayName?.split(' ')[0]} 👋
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600, color: '#1e293b',
                background: C.primary, borderRadius: 6, padding: '2px 10px',
              }}>
                {SISTEM_ROL_TR[sistemRol] || ROL_TR[user?.role] || 'Personel'}
              </span>
            </div>
            {user?.title && (
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{user.title}</div>
            )}
            <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
              {user?.directorate && (
                <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                  🏢 <strong style={{ color: '#fff' }}>{user.directorate}</strong>
                </div>
              )}
              {user?.department && user.department !== user.directorate && (
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  📂 {user.department}
                </div>
              )}
              {user?.city && user.city !== '-' && (
                <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                  📍 {user.city}
                  {lokasyon?.personelSayisi && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, color: '#1e293b',
                      background: C.primary + 'cc', borderRadius: 4, padding: '1px 6px', marginLeft: 4,
                    }}>
                      {lokasyon.personelSayisi} kişi
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Saat + Butonlar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12, flexShrink: 0 }}>
            <LiveClock />
            <div style={{ display: 'flex', gap: 8 }}>
              <Link to="/itsm/new" style={{
                padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                background: C.primary, color: '#fff', textDecoration: 'none',
              }}>+ Bilgi İşlem Talebi</Link>
              <Link to="/tickets/new/destek" style={{
                padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                background: 'rgba(255,255,255,0.1)', color: '#e2e8f0', textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.15)',
              }}>+ Destek Talebi</Link>
            </div>
          </div>
        </div>

        {/* ── LOKASYON + ÇALIŞMA GRUPLARI ──────────────────────────────────── */}
        {(user?.city || user?.calismaGruplari?.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: user?.city && user?.calismaGruplari?.length > 0 ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 20 }}>
            {/* Lokasyon kartı */}
            {user?.city && user.city !== '-' && (
              <div style={{
                background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                border: '1.5px solid #86efac', borderRadius: 14,
                padding: '16px 20px',
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#16a34a',
                  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                  📍 Çalışma Lokasyonu
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1a2e23' }}>
                  {lokasyon?.ad || user.city}
                </div>
                {lokasyon?.ilce && (
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    📌 {lokasyon.ilce} ilçesi
                  </div>
                )}
                {lokasyon?.personelSayisi && (
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    👥 Bu lokasyonda {lokasyon.personelSayisi} personel
                  </div>
                )}
                {lokasyon?.adres && (
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6, lineHeight: 1.4 }}>
                    {lokasyon.adres}
                  </div>
                )}
                <button disabled style={{
                  marginTop: 12, padding: '6px 14px', fontSize: 12,
                  background: '#f1f5f9', color: '#9aa8a0',
                  border: '1px solid #e2e8f0', borderRadius: 8,
                  cursor: 'not-allowed',
                }}>
                  🗺️ Haritada Göster (yakında)
                </button>
              </div>
            )}

            {/* Çalışma Grupları kartı */}
            {user?.calismaGruplari?.length > 0 && (
              <div style={{
                background: '#fff', border: '1px solid #e8ede9',
                borderRadius: 14, padding: '16px 20px',
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#9aa8a0',
                  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                  👥 Çalışma Grupları
                </div>
                {user.calismaGruplari.map(g => (
                  <div key={g.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 0', fontSize: 13, color: '#374151',
                    borderBottom: '1px solid #f3f4f6',
                  }}>
                    <span style={{ fontWeight: 500 }}>{g.ad}</span>
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 20,
                      background: g.rol === 'lider' ? '#fef9c3' : '#f0fdf4',
                      color: g.rol === 'lider' ? '#a16207' : '#166534',
                      fontWeight: 600,
                    }}>
                      {g.rol === 'lider' ? '👑 Lider' : 'Üye'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── KPI ŞERİT ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
          <KPI icon="🔄" label="Açık Görevlerim"   value={loading ? '…' : (ozet?.acikGorev ?? 0)}      color={C.info}        to="/my-tasks" />
          <KPI icon="⏳" label="Onay Bekliyor"      value={loading ? '…' : (ozet?.bekleyenOnay ?? 0)}   color={C.warning}     to="/my-tickets" />
          <KPI icon="✅" label="Tamamlanan"          value={loading ? '…' : (ozet?.tamamlanan ?? 0)}    color={C.primaryDark} to="/my-tickets" />
          <KPI icon="⚠️" label="SLA İhlali"          value={loading ? '…' : (ozet?.slaIhlali ?? 0)}     color={C.danger}      to="/my-tasks"
            sub={ozet?.slaIhlali > 0 ? 'Acil aksiyon gerekiyor!' : undefined}
          />
        </div>

        {/* ── KİŞİSEL TALEPLER + GÖREVLER ──────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

          {/* Taleplerim */}
          <Card>
            <SectionTitle action={
              <Link to="/my-tickets" style={{ fontSize: 12, color: C.primaryDark }}>Tümü →</Link>
            }>
              📋 Son Taleplerim
            </SectionTitle>
            {loading ? (
              <Empty text="Yükleniyor…" />
            ) : taleplerim.length === 0 ? (
              <Empty text="Henüz başvuru yok." />
            ) : (
              taleplerim.slice(0, 6).map(t => <TicketRow key={t.id} t={t} showFrom={false} />)
            )}
          </Card>

          {/* Görevlerim */}
          <Card>
            <SectionTitle action={
              <Link to="/my-tasks" style={{ fontSize: 12, color: C.primaryDark }}>Tümü →</Link>
            }>
              🎯 Aktif Görevlerim
            </SectionTitle>
            {loading ? (
              <Empty text="Yükleniyor…" />
            ) : gorevlerim.length === 0 ? (
              <Empty text="Atanmış aktif görev yok." />
            ) : (
              gorevlerim.slice(0, 6).map(t => <TicketRow key={t.id} t={t} showFrom={false} />)
            )}
          </Card>

        </div>

        {/* ── YÖNETİCİ: ONAY BEKLEYENLER ───────────────────────────────────── */}
        {isYonetici && (
          <Card style={{ border: '1px solid #fde68a', marginBottom: 20 }}>
            <SectionTitle action={
              <Link to="/pending-approvals" style={{ fontSize: 12, color: '#d97706' }}>Tümü →</Link>
            }>
              <span>
                ⏳ Onay Bekleyen Talepler
                {pendingApproval.length > 0 && (
                  <span style={{
                    marginLeft: 8, fontSize: 11, fontWeight: 700, color: '#fff',
                    background: C.warning, borderRadius: '50%',
                    width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {pendingApproval.length}
                  </span>
                )}
              </span>
            </SectionTitle>
            {loading ? (
              <Empty text="Yükleniyor…" />
            ) : pendingApproval.length === 0 ? (
              <div style={{ color: '#92400e', fontSize: 13, textAlign: 'center', padding: '16px 0', background: '#fffbeb', borderRadius: 10 }}>
                Onay bekleyen talep yok. ✓
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pendingApproval.slice(0, 6).map(t => (
                  <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: '#fffbeb', borderRadius: 12, padding: '10px 14px',
                    border: '1px solid #fde68a',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        #{t.id} {t.title}
                      </div>
                      <div style={{ fontSize: 11, color: C.gray, marginTop: 2 }}>
                        {t.createdBy?.displayName} · {t.createdBy?.directorate || '—'} · {new Date(t.createdAt).toLocaleDateString('tr-TR')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => handleApprove(t.id, 'approve')} style={{
                        padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        background: C.primary, color: '#fff', border: 'none', cursor: 'pointer',
                      }}>✓ Onayla</button>
                      <button onClick={() => handleApprove(t.id, 'reject')} style={{
                        padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        background: '#fee2e2', color: C.danger, border: 'none', cursor: 'pointer',
                      }}>✕ Reddet</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* ── YÖNETİCİ: BİRİM TALEPLERİ ───────────────────────────────────── */}
        {isYonetici && (
          <Card style={{ border: '1px solid #e0e7ff' }}>
            <SectionTitle>
              <span>
                🏢 {sistemRol === 'mudur' ? 'Müdürlüğüme Gelen Talepler' : 'Daireye Gelen Talepler'}
                {totalDaire > 0 && (
                  <span style={{
                    marginLeft: 8, fontSize: 11, fontWeight: 700, color: '#4f46e5',
                    background: '#eef2ff', borderRadius: 6, padding: '1px 7px',
                  }}>
                    {totalDaire}
                  </span>
                )}
              </span>
            </SectionTitle>
            <StatusBar groups={daireOzet} />
            <div style={{ marginTop: 12 }}>
              {daireLoading ? (
                <Empty text="Yükleniyor…" />
              ) : daireTalepler.length === 0 ? (
                <Empty text="Biriminize gelen talep yok." />
              ) : (
                daireTalepler.slice(0, 10).map(t => <TicketRow key={t.id} t={t} showFrom={true} />)
              )}
            </div>
            {daireTalepler.length > 10 && (
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <Link to="/itsm" style={{ fontSize: 12, color: '#4f46e5' }}>
                  Tümünü gör ({daireTalepler.length}) →
                </Link>
              </div>
            )}
          </Card>
        )}

      </div>
    </div>
  );
}
