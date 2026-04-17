import { useEffect, useState, useCallback } from 'react';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import FilterTabs from '../components/ui/FilterTabs';
import LoadingState from '../components/ui/LoadingState';
import PageHeader from '../components/ui/PageHeader';
import Surface from '../components/ui/Surface';

const API = import.meta.env.VITE_API_URL || '';

function authFetch(path) {
  return fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  }).then(async (r) => {
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || data.message || `HTTP ${r.status}`);
    return data;
  });
}

const STATUS_OPTIONS = [
  { key: 'new', label: 'Yeni' },
  { key: 'pending', label: 'Beklemede' },
  { key: 'in_process', label: 'İşlemde' },
  { key: 'completed', label: 'Sonuçlandı' },
  { key: 'waiting_for_approval', label: 'Onay Bekliyor' },
];

const STATUS_STYLES = {
  new: 'bg-slate-100 text-slate-700',
  pending: 'bg-amber-100 text-amber-700',
  in_process: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  waiting_for_approval: 'bg-orange-100 text-orange-700',
};

const INCIDENT_TYPES = {
  incident: 'Arıza',
  demand: 'İstek',
  complaint: 'Şikayet',
  thanks: 'Teşekkür',
  notice: 'İhbar',
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[status] || 'bg-slate-100 text-slate-500'}`}>
      {STATUS_OPTIONS.find((item) => item.key === status)?.label || status || '—'}
    </span>
  );
}

function fmtDate(value) {
  if (!value) return '—';
  const num = Number(value);
  const date = !Number.isNaN(num) && num > 1e9 && num < 1e11 ? new Date(num * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function maskPhone(phone) {
  if (!phone) return '—';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 10) return digits;
  return `0${digits.slice(-10, -8)}** *** **${digits.slice(-2)}`;
}

function DetailModal({ token, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    authFetch(`/api/ulakbell/basvurular/${token}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const d = data?.data ?? data;
  const rows = d ? [
    ['Başvuru No', d.number || d.id || '—'],
    ['Tür', INCIDENT_TYPES[d.incident_type] || d.incident_type || '—'],
    ['Durum', d.status || '—'],
    ['Tarih', fmtDate(d.created_at || d.createdAt)],
    ['Telefon', maskPhone(d.mobile_phone)],
    ['İlçe', d.ilce?.title || d.ilce_title || '—'],
    ['Mahalle', d.mahalle?.title || d.mahalle_title || '—'],
  ].filter(([, value]) => value && value !== '—') : [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/45 flex items-center justify-center p-4" onClick={onClose}>
      <Surface className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" soft>
        <div className="p-5 border-b border-slate-200 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <i className="bi bi-bell text-emerald-600" /> Başvuru Detayı
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">&times;</button>
        </div>

        <div className="p-5" onClick={(e) => e.stopPropagation()}>
          {loading && <LoadingState compact title="Başvuru detayları yükleniyor..." />}
          {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {!loading && !error && d && (
            <div className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                {rows.map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 m-0">{label}</p>
                    <div className="text-sm font-medium text-slate-800 mt-2">
                      {label === 'Durum' ? <StatusBadge status={value} /> : value}
                    </div>
                  </div>
                ))}
              </div>

              {(d.text || d.description) && (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-3">Başvuru Metni</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed m-0">{d.text || d.description}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </Surface>
    </div>
  );
}

export default function UlakbellIncidents() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notConfigured, setNotConfigured] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('new');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [detailToken, setDetailToken] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async (nextPage = page, nextStatus = status, nextSearch = search) => {
    setLoading(true);
    setError('');
    setNotConfigured(false);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        count: '20',
        status: nextStatus,
      });
      if (nextSearch.trim()) params.set('q', nextSearch.trim());

      const data = await authFetch(`/api/ulakbell/basvurular?${params.toString()}`);
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setItems(list);
      setTotalPages(Math.max(1, data?.meta?.last_page || data?.last_page || 1));
      setLastUpdated(new Date());
    } catch (e) {
      if (e.message.includes('yapılandırılmamış')) setNotConfigured(true);
      else setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    load(1, status, search);
    setPage(1);
  }, [status]);

  const submitSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load(1, status, search);
  };

  const goPage = (nextPage) => {
    setPage(nextPage);
    load(nextPage, status, search);
  };

  return (
    <div className="portal-page portal-page--wide space-y-5">
      <PageHeader
        icon={<i className="bi bi-bell-fill text-xl" />}
        title="ulakBELL Talepleri"
        description="Dış sistemden gelen başvuruları listeleyin, filtreleyin ve detaylarını inceleyin."
        meta={lastUpdated ? `Son güncelleme: ${lastUpdated.toLocaleTimeString('tr-TR')}` : null}
        actions={(
          <Button color="green" className="text-sm" onClick={() => load(page, status, search)} disabled={loading}>
            <i className={`bi bi-arrow-clockwise ${loading ? 'animate-spin' : ''}`} /> Yenile
          </Button>
        )}
      />

      {notConfigured ? (
        <EmptyState
          icon={<i className="bi bi-bell text-slate-300" />}
          title="ulakBELL entegrasyonu yapılandırılmamış"
          description="Ayarlar ekranından doğru URL ve token bilgilerini girerek bu modülü aktif hale getirebilirsiniz."
          action={<a href="/admin/settings" className="text-sm font-semibold text-emerald-600 hover:underline">Ayarlar &rsaquo; ulakBELL</a>}
        />
      ) : (
        <>
          <Surface className="p-4 md:p-5" soft>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <FilterTabs
                tabs={STATUS_OPTIONS}
                value={status}
                onChange={setStatus}
              />

              <form onSubmit={submitSearch} className="flex items-center gap-2">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Başvuru no ara..."
                  className="w-full lg:w-64 h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                />
                <Button type="submit" color="green" className="text-sm">Ara</Button>
                {search && (
                  <Button type="button" variant="soft" className="text-sm" onClick={() => { setSearch(''); load(1, status, ''); setPage(1); }}>
                    Temizle
                  </Button>
                )}
              </form>
            </div>
          </Surface>

          {error && (
            <Surface className="p-4 border-red-200 bg-red-50">
              <div className="flex items-start gap-3">
                <i className="bi bi-exclamation-triangle-fill text-red-500 text-lg" />
                <div>
                  <p className="text-sm font-semibold text-red-800 m-0">Bağlantı kurulamadı</p>
                  <p className="text-xs text-red-600 mt-1 m-0">{error}</p>
                </div>
              </div>
            </Surface>
          )}

          <Surface className="overflow-hidden">
            {loading ? (
              <div className="p-5">
                <LoadingState compact title="ulakBELL başvuruları yükleniyor..." />
              </div>
            ) : items.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  compact
                  icon={<i className="bi bi-inbox text-slate-300" />}
                  title="Başvuru bulunamadı"
                  description="Seçili filtrelerde gösterilecek bir kayıt yok."
                />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">No</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Başvuru</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Metin</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tür</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Durum</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tarih</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, index) => {
                    const d = item?.data ?? item;
                    const token = d.public_token || d.token || d.id;
                    const text = d.text || d.description || '';
                    return (
                      <tr key={token || index} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">#{d.number || d.id || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{maskPhone(d.mobile_phone)}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{d.ilce?.title || d.ilce_title || 'Muğla'}</div>
                        </td>
                        <td className="px-4 py-3 max-w-md text-slate-600">
                          {text.length > 90 ? `${text.slice(0, 90)}...` : text || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{INCIDENT_TYPES[d.incident_type] || d.incident_type || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={d.status} /></td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(d.created_at || d.createdAt)}</td>
                        <td className="px-4 py-3 text-right">
                          {token && (
                            <Button color="green" className="text-xs" onClick={() => setDetailToken(String(token))}>
                              Detay
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Surface>

          {!loading && items.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400 m-0">20 kayıt / sayfa</p>
              <div className="flex items-center gap-2">
                <Button variant="soft" className="text-xs" onClick={() => goPage(page - 1)} disabled={page <= 1}>
                  &larr; Önceki
                </Button>
                <span className="text-sm font-semibold text-slate-700 px-2">{page} / {totalPages}</span>
                <Button variant="soft" className="text-xs" onClick={() => goPage(page + 1)} disabled={page >= totalPages}>
                  Sonraki &rarr;
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {detailToken && <DetailModal token={detailToken} onClose={() => setDetailToken(null)} />}
    </div>
  );
}
