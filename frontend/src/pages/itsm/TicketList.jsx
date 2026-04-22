import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTickets } from '../../api/tickets';
import { StatusBadge, PriorityBadge, TypeBadge, SourceBadge } from '../../components/badges';
import PageHeader from '../../components/ui/PageHeader';

const API = import.meta.env.VITE_API_URL || '';
function authHeaders() { return { Authorization: `Bearer ${localStorage.getItem('token')}` }; }

const STATUSES   = ['', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PRIORITIES = ['', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const SOURCES    = ['', 'PORTAL', 'EMAIL', 'PHONE', 'IN_PERSON', 'API'];
const STATUS_LABELS   = { '': 'Tüm Durumlar', OPEN: 'Açık', ASSIGNED: 'Atandı', IN_PROGRESS: 'İşlemde', RESOLVED: 'Çözüldü', CLOSED: 'Kapalı' };
const PRIORITY_LABELS = { '': 'Tüm Öncelikler', LOW: 'Düşük', MEDIUM: 'Orta', HIGH: 'Yüksek', CRITICAL: 'Kritik' };
const SOURCE_LABELS   = { '': 'Tüm Kaynaklar', PORTAL: 'Portal', EMAIL: 'E-posta', PHONE: 'Telefon', IN_PERSON: 'Yüz yüze', API: 'API' };

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function slaStatus(dueDate, status) {
  if (!dueDate || status === 'CLOSED' || status === 'RESOLVED') return null;
  const now = Date.now();
  const due = new Date(dueDate).getTime();
  if (due < now)                      return 'breached';
  if (due - now < 2 * 60 * 60 * 1000) return 'warning';
  return null;
}

function shortDir(name) {
  if (!name) return '';
  return name.replace(' Dairesi Başkanlığı', ' DB').replace(' Daire Başkanlığı', ' DB');
}

export default function TicketList() {
  const navigate = useNavigate();
  const [tickets, setTickets]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [filters, setFilters]           = useState({ status: '', priority: '', directorate: '', source: '' });
  const [directorates, setDirectorates] = useState([]);

  useEffect(() => {
    fetch(`${API}/api/users/directorates`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(setDirectorates)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    const active = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    getTickets(active)
      .then(setTickets)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [filters]);

  // ─── Styles ─────────────────────────────────────────────────────────────────
  const labelStyle = { fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4, display: 'block' };
  const baseField = { width: '100%', height: 38, padding: '0 12px', fontSize: 13, border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', color: '#1e293b', outline: 'none', boxSizing: 'border-box' };
  const activeGlow = { border: '1.5px solid #10b981', background: '#f0fdf9', boxShadow: '0 0 0 3px rgba(16,185,129,0.10), 0 0 8px rgba(16,185,129,0.08)' };
  const selectStyle = (val) => ({ ...baseField, WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 30, ...(val ? activeGlow : {}) });
  const cardStyle = { background: '#fff', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' };
  const btnPrimary = { padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 };

  const slaRowBg = (sla, idx) => {
    if (sla === 'breached') return '#fef2f2';
    if (sla === 'warning') return '#fffbeb';
    return idx % 2 === 0 ? '#fff' : '#fafbfc';
  };

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1200, margin: '0 auto' }}>
      <PageHeader title="Tüm Talepler" icon={<i className="bi bi-ticket-detailed" style={{ fontSize: 22 }} />} />

      {/* Filtreler */}
      <div style={{ ...cardStyle, marginTop: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Durum</label>
            <select style={selectStyle(filters.status)} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Öncelik</label>
            <select style={selectStyle(filters.priority)} value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}>
              {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Daire Başkanlığı</label>
            <select style={selectStyle(filters.directorate)} value={filters.directorate} onChange={e => setFilters(f => ({ ...f, directorate: e.target.value }))}>
              <option value="">Tüm Daireler</option>
              {directorates.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Kaynak</label>
            <select style={selectStyle(filters.source)} value={filters.source} onChange={e => setFilters(f => ({ ...f, source: e.target.value }))}>
              {SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* SLA açıklaması */}
          <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#94a3b8' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: '#fef2f2', border: '1px solid #fecaca', display: 'inline-block' }} />
              SLA ihlali
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: '#fffbeb', border: '1px solid #fde68a', display: 'inline-block' }} />
              2 saat içinde dolacak
            </span>
          </div>
          <button onClick={() => navigate('/itsm/new')} style={btnPrimary}>
            <i className="bi bi-plus-lg" /> Yeni Talep
          </button>
        </div>
      </div>

      {/* Tablo */}
      <div style={{ ...cardStyle, marginTop: 16 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Talepler yükleniyor...</div>
        ) : error ? (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', color: '#dc2626', fontSize: 13 }}>{error}</div>
        ) : tickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
            <i className="bi bi-ticket-detailed" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
            Talep bulunamadı
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>{tickets.length} kayıt listeleniyor</div>
            <div style={{ borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['#', 'Başlık', 'Daire', 'Kaynak', 'Öncelik', 'Durum', 'Son Tarih', 'Oluşturulma'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t, idx) => {
                    const sla = slaStatus(t.dueDate, t.status);
                    const dir = t.createdBy?.directorate || '';
                    return (
                      <tr
                        key={t.id}
                        onClick={() => navigate(`/itsm/${t.id}`)}
                        style={{ background: slaRowBg(sla, idx), borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                      >
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: '#94a3b8' }}>#{t.id}</td>
                        <td style={{ padding: '10px 14px', maxWidth: 220 }}>
                          <div style={{ fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                          {t.category && <div style={{ fontSize: 11, color: '#94a3b8' }}>{t.category.name}</div>}
                        </td>
                        <td style={{ padding: '10px 14px', maxWidth: 160 }}>
                          {dir ? (
                            <span title={dir} style={{ fontSize: 12, color: '#64748b', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortDir(dir)}</span>
                          ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                        </td>
                        <td style={{ padding: '10px 14px' }}><SourceBadge source={t.source} /></td>
                        <td style={{ padding: '10px 14px' }}><PriorityBadge priority={t.priority} /></td>
                        <td style={{ padding: '10px 14px' }}><StatusBadge status={t.status} /></td>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          {t.dueDate ? (
                            <span style={{
                              fontSize: 12, fontWeight: sla ? 600 : 400,
                              color: sla === 'breached' ? '#dc2626' : sla === 'warning' ? '#d97706' : '#64748b',
                            }}>
                              {formatDate(t.dueDate)}
                              {sla === 'breached' && ' ⚠'}
                              {sla === 'warning' && ' ⏱'}
                            </span>
                          ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                        </td>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: '#475569', fontSize: 12 }}>
                          {formatDate(t.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
