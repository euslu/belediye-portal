import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || '';

function authFetch(url, opts = {}) {
  return fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      ...(opts.headers || {}),
    },
  });
}

const today = () => new Date().toISOString().slice(0, 10);
const PER_PAGE = 50;

// ─── Sayfalama ───────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, total, onPage }) {
  if (totalPages <= 1) return null;
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) pages.push(i);
    else if (pages[pages.length - 1] !== '...') pages.push('...');
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #f1f5f9' }}>
      <span style={{ fontSize: 12, color: '#9ca3af' }}>Toplam {total} kayıt</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button onClick={() => onPage(page - 1)} disabled={page <= 1}
          style={{ padding: '4px 8px', fontSize: 12, borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: page <= 1 ? '#d1d5db' : '#374151', cursor: page <= 1 ? 'default' : 'pointer' }}>‹</button>
        {pages.map((p, i) => p === '...'
          ? <span key={`d${i}`} style={{ padding: '4px 6px', fontSize: 12, color: '#9ca3af' }}>…</span>
          : <button key={p} onClick={() => onPage(p)}
              style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid', borderColor: p === page ? '#4f46e5' : '#e2e8f0', background: p === page ? '#4f46e5' : '#fff', color: p === page ? '#fff' : '#374151', cursor: 'pointer', fontWeight: p === page ? 600 : 400 }}>{p}</button>
        )}
        <button onClick={() => onPage(page + 1)} disabled={page >= totalPages}
          style={{ padding: '4px 8px', fontSize: 12, borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: page >= totalPages ? '#d1d5db' : '#374151', cursor: page >= totalPages ? 'default' : 'pointer' }}>›</button>
      </div>
    </div>
  );
}

// ─── Stat Kartı ───────────────────────────────────────────────────────────────
function StatCard({ label, value, total, color, icon }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</span>
        <span className="text-base text-gray-300">{icon}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{(value ?? 0).toLocaleString('tr-TR')}</p>
      {total > 0 && (
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full ${color.replace('text-', 'bg-')}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-gray-400 font-medium">%{pct}</span>
        </div>
      )}
    </div>
  );
}

// ─── Durum badge ──────────────────────────────────────────────────────────────
function DurumBadge({ durum }) {
  const map = {
    GELDI:    'bg-green-100 text-green-700',
    GELMEDI:  'bg-red-100 text-red-700',
    IZINLI:   'bg-amber-100 text-amber-700',
  };
  const labels = { GELDI: 'Geldi', GELMEDI: 'Gelmedi', IZINLI: 'İzinli' };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[durum] || 'bg-gray-100 text-gray-500'}`}>
      {labels[durum] || durum}
    </span>
  );
}

// ─── Arama input ──────────────────────────────────────────────────────────────
function SearchInput({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || 'Ara…'}
      className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
  );
}

// ─── Tab: Devam Listesi ───────────────────────────────────────────────────────
function TabDevam({ date, directorate, externalFilter, externalSearch }) {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const search = externalSearch || '';
  const filter = externalFilter || 'TUMU';

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ date });
    if (directorate) params.set('directorate', directorate);
    authFetch(`${API}/api/pdks/attendance?${params}`)
      .then(r => r.json())
      .then(d => setRows(d.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [date, directorate]);

  // Filtre/arama değişince sayfa 1'e dön
  useEffect(() => { setPage(1); }, [filter, search]);

  const filtered = useMemo(() => {
    let list = rows;
    if (filter !== 'TUMU') list = list.filter(r => r.durum === filter);
    if (search) list = list.filter(r => r.adSoyad?.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [rows, filter, search]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const counts = useMemo(() => ({
    TUMU: rows.length,
    GELDI: rows.filter(r => r.durum === 'GELDI').length,
    GELMEDI: rows.filter(r => r.durum === 'GELMEDI').length,
    IZINLI: rows.filter(r => r.durum === 'IZINLI').length,
  }), [rows]);

  if (loading) return <div className="text-center py-16 text-sm text-gray-400">Yükleniyor…</div>;

  return (
    <div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">Kayıt bulunamadı</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="text-xs text-gray-500">
                  <th className="text-left px-5 py-3 font-medium">Ad Soyad</th>
                  <th className="text-left px-4 py-3 font-medium">Birim</th>
                  <th className="text-left px-4 py-3 font-medium">Görev</th>
                  <th className="text-left px-4 py-3 font-medium">Giriş</th>
                  <th className="text-left px-4 py-3 font-medium">Çıkış</th>
                  <th className="text-left px-4 py-3 font-medium">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paged.map((r, i) => (
                  <tr key={i} className={`hover:bg-gray-50 ${r.durum === 'GELMEDI' ? 'bg-red-50/30' : ''}`}>
                    <td className="px-5 py-2.5 font-medium text-gray-800">{r.adSoyad}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs max-w-[200px] truncate">{r.birim || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{r.gorev || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{r.giris || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{r.cikis || '—'}</td>
                    <td className="px-4 py-2.5"><DurumBadge durum={r.durum} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} total={filtered.length} onPage={setPage} />
        </div>
      )}
    </div>
  );
}

// ─── Tab: Geç Kalanlar ───────────────────────────────────────────────────────
function TabGecKalanlar({ date, directorate }) {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    const params = new URLSearchParams({ date });
    if (directorate) params.set('directorate', directorate);
    authFetch(`${API}/api/pdks/late?${params}`)
      .then(r => r.json())
      .then(d => setRows(d.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [date, directorate]);

  const totalPages = Math.ceil(rows.length / PER_PAGE);
  const paged = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (loading) return <div className="text-center py-16 text-sm text-gray-400">Yükleniyor…</div>;
  if (!rows.length) return <div className="text-center py-12 text-sm text-gray-400">Geç kalan personel yok</div>;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr className="text-xs text-gray-500">
            <th className="text-left px-5 py-3 font-medium">Ad Soyad</th>
            <th className="text-left px-4 py-3 font-medium">Birim</th>
            <th className="text-left px-4 py-3 font-medium">Görev</th>
            <th className="text-left px-4 py-3 font-medium">İlk Giriş</th>
            <th className="text-left px-4 py-3 font-medium">Gecikme</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {paged.map((r, i) => {
            const [h, m] = (r.ilkGiris || '08:35').split(':').map(Number);
            const diff = (h * 60 + m) - (8 * 60 + 30);
            return (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-5 py-2.5 font-medium text-gray-800">{r.adSoyad}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs max-w-[200px] truncate">{r.birim || '—'}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{r.gorev || '—'}</td>
                <td className="px-4 py-2.5 text-red-600 font-medium">{r.ilkGiris || '—'}</td>
                <td className="px-4 py-2.5">
                  {diff > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">+{diff} dk</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Pagination page={page} totalPages={totalPages} total={rows.length} onPage={setPage} />
    </div>
  );
}

// ─── Tab: İzinler ─────────────────────────────────────────────────────────────
function TabIzinler({ date, directorate }) {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    const params = new URLSearchParams({ date });
    if (directorate) params.set('directorate', directorate);
    authFetch(`${API}/api/pdks/leaves?${params}`)
      .then(r => r.json())
      .then(d => setRows(d.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [date, directorate]);

  useEffect(() => { setPage(1); }, [search]);

  const filtered = search
    ? rows.filter(r => r.adSoyad?.toLowerCase().includes(search.toLowerCase()))
    : rows;

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (loading) return <div className="text-center py-16 text-sm text-gray-400">Yükleniyor…</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm text-gray-500">{rows.length} personel izinli</span>
        <SearchInput value={search} onChange={setSearch} placeholder="İsim ara…" />
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">İzinli personel yok</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-xs text-gray-500">
                <th className="text-left px-5 py-3 font-medium">Ad Soyad</th>
                <th className="text-left px-4 py-3 font-medium">Birim</th>
                <th className="text-left px-4 py-3 font-medium">İzin Türü</th>
                <th className="text-left px-4 py-3 font-medium">Başlangıç</th>
                <th className="text-left px-4 py-3 font-medium">Bitiş</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-5 py-2.5 font-medium text-gray-800">{r.adSoyad}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs max-w-[200px] truncate">{r.birim || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                      {r.izinTur || 'İzin'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 text-xs">
                    {r.baslamaTarihi ? new Date(r.baslamaTarihi).toLocaleDateString('tr-TR') : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 text-xs">
                    {r.bitisTarihi ? new Date(r.bitisTarihi).toLocaleDateString('tr-TR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} total={filtered.length} onPage={setPage} />
        </div>
      )}
    </div>
  );
}

// ─── Tab: Daire Özeti ─────────────────────────────────────────────────────────
function TabOzet({ date, onSelectDir }) {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    authFetch(`${API}/api/pdks/summary?date=${date}`)
      .then(r => r.json())
      .then(d => setRows(d.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [date]);

  if (loading) return <div className="text-center py-16 text-sm text-gray-400">Yükleniyor…</div>;
  if (!rows.length) return <div className="text-center py-12 text-sm text-gray-400">Veri bulunamadı</div>;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-xs text-gray-500">
            <th className="text-left px-5 py-3 font-medium">Daire Başkanlığı</th>
            <th className="text-right px-4 py-3 font-medium">Toplam</th>
            <th className="text-right px-4 py-3 font-medium text-green-600">Gelen</th>
            <th className="text-right px-4 py-3 font-medium text-red-600">Gelmedi</th>
            <th className="text-right px-4 py-3 font-medium text-amber-600">İzinli</th>
            <th className="text-right px-5 py-3 font-medium">Devam %</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((row, i) => {
            const toplam  = Number(row.toplam)  || 0;
            const gelen   = Number(row.gelen)   || 0;
            const gelmedi = Number(row.gelmedi) || 0;
            const izinli  = Number(row.izinli)  || 0;
            const pct     = toplam > 0 ? Math.round((gelen / toplam) * 100) : 0;
            const pctColor = pct >= 90 ? 'text-green-600' : pct >= 70 ? 'text-amber-600' : 'text-red-600';
            const barColor = pct >= 90 ? 'bg-green-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500';

            return (
              <tr
                key={i}
                onClick={() => onSelectDir && onSelectDir(row.directorate)}
                className="hover:bg-indigo-50 cursor-pointer transition"
              >
                <td className="px-5 py-3 font-medium text-gray-800">{row.directorate}</td>
                <td className="px-4 py-3 text-right text-gray-600">{toplam}</td>
                <td className="px-4 py-3 text-right font-medium text-green-600">{gelen}</td>
                <td className="px-4 py-3 text-right font-medium text-red-600">{gelmedi}</td>
                <td className="px-4 py-3 text-right font-medium text-amber-600">{izinli}</td>
                <td className="px-5 py-3 text-right">
                  <span className={`font-bold ${pctColor}`}>%{pct}</span>
                  <div className="w-16 h-1.5 bg-gray-100 rounded-full ml-auto mt-1">
                    <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────
export default function PDKSDashboard() {
  const { user } = useAuth();
  const sistemRol   = user?.sistemRol || user?.role || 'personel';
  const isAdmin     = sistemRol === 'admin' || sistemRol === 'manager';
  const isDaire     = sistemRol === 'daire_baskani';
  const isMudur     = sistemRol === 'mudur';
  const userDaire   = user?.directorate || '';
  const userDept    = user?.department || '';

  const [date, setDate]               = useState(today());
  const [tab, setTab]                 = useState('devam');
  const [overview, setOverview]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [refreshing, setRefreshing]   = useState(false);
  // Admin daire filtresi
  const [selectedDir, setSelectedDir] = useState('');
  // Devam listesi filtre + arama (tab satırına taşındı)
  const [devamFilter, setDevamFilter] = useState('TUMU');
  const [devamSearch, setDevamSearch] = useState('');

  // Daire başkanı kendi dairesini, müdür kendi müdürlüğünü görür, admin seçebilir
  const activeDir = isMudur ? userDept : (isDaire ? userDaire : (isAdmin ? selectedDir : ''));

  const loadOverview = useCallback(async (d = date, isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const r = await authFetch(`${API}/api/pdks/overview?date=${d}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      setOverview(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date]);

  useEffect(() => { loadOverview(date); }, [date]);

  const tabs = [
    { key: 'devam',   label: 'Devam Listesi',  icon: 'bi-list-check' },
    { key: 'geldi',   label: 'Geldi',           icon: 'bi-check-circle' },
    { key: 'gelmedi', label: 'Gelmedi',         icon: 'bi-x-circle' },
    { key: 'gec',     label: 'Geç Kalanlar',    icon: 'bi-clock-history' },
    { key: 'izin',    label: 'İzinliler',       icon: 'bi-calendar-minus' },
    ...(isAdmin ? [{ key: 'ozet', label: 'Daire Özeti', icon: 'bi-building' }] : []),
  ];

  return (
    <div className="p-8">
      {/* Başlık */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Personel Devam Takip Sistemi</h1>
          <p className="text-sm text-gray-400 mt-1">
            {isMudur
              ? (userDept || 'Müdürlük bazlı devam takibi')
              : isDaire
                ? (userDaire || 'Daire bazlı devam takibi')
                : 'Günlük devam/devamsızlık özeti'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Admin: daire seçici */}
          {isAdmin && tab !== 'ozet' && (
            <select
              value={selectedDir}
              onChange={e => setSelectedDir(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[260px]"
            >
              <option value="">Tüm Daireler</option>
              {(overview?._daireler || []).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}
          <input
            type="date"
            value={date}
            max={today()}
            onChange={e => setDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => loadOverview(date, true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#4f46e5] text-white rounded-lg text-sm font-semibold hover:bg-[#4338ca] disabled:opacity-60"
          >
            {refreshing ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            ) : <i className="bi bi-arrow-clockwise" />} Yenile
          </button>
        </div>
      </div>

      {/* Daire Başkanı / Müdür banner */}
      {isDaire && userDaire && (
        <div className="mb-4 flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
          <i className="bi bi-building text-indigo-500" />
          <span className="text-sm font-medium text-indigo-800">{userDaire}</span>
        </div>
      )}
      {isMudur && userDept && (
        <div className="mb-4 flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
          <i className="bi bi-diagram-3 text-indigo-500" />
          <span className="text-sm font-medium text-indigo-800">{userDept}</span>
        </div>
      )}

      {/* Hata */}
      {error && (
        <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <i className="bi bi-exclamation-triangle" /> {error}
        </div>
      )}

      {/* Özet Kartlar */}
      {overview && !loading && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          <StatCard label="Toplam Personel" value={overview.toplamPersonel} total={0} color="text-gray-800" icon={<i className="bi bi-people" />} />
          <StatCard label="Gelen" value={overview.gelen} total={overview.toplamPersonel} color="text-green-600" icon={<i className="bi bi-check-circle" />} />
          <StatCard label="Gelmeyen" value={overview.gelmedi} total={overview.toplamPersonel} color="text-red-600" icon={<i className="bi bi-x-circle" />} />
          <StatCard label="İzinli" value={overview.izinli} total={overview.toplamPersonel} color="text-amber-600" icon={<i className="bi bi-calendar-event" />} />
        </div>
      )}
      {loading && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 h-20 animate-pulse" />
          ))}
        </div>
      )}

      {/* Tablar + Gelmedi butonu + Arama */}
      <div className="flex items-center gap-2.5 mb-6 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              if (t.key === 'geldi') setDevamFilter('GELDI');
              else if (t.key === 'gelmedi') setDevamFilter('GELMEDI');
              else { setDevamFilter('TUMU'); setDevamSearch(''); }
            }}
            className={`portal-pill-btn text-sm ${tab === t.key ? 'portal-pill-btn--active' : ''}`}
          >
            <i className={`bi ${t.icon}`} />
            {t.label}
          </button>
        ))}
        {/* Arama — devam, geldi, gelmedi tablarında */}
        {['devam', 'geldi', 'gelmedi'].includes(tab) && (
          <div style={{ marginLeft: 'auto' }}>
            <SearchInput value={devamSearch} onChange={setDevamSearch} placeholder="Personel ara…" />
          </div>
        )}
      </div>

      {/* Tab İçerikleri */}
      {tab === 'devam'   && <TabDevam date={date} directorate={activeDir} externalFilter={devamFilter} externalSearch={devamSearch} />}
      {tab === 'geldi'   && <TabDevam date={date} directorate={activeDir} externalFilter="GELDI" externalSearch={devamSearch} />}
      {tab === 'gelmedi' && <TabDevam date={date} directorate={activeDir} externalFilter="GELMEDI" externalSearch={devamSearch} />}
      {tab === 'gec'     && <TabGecKalanlar date={date} directorate={activeDir} />}
      {tab === 'izin'    && <TabIzinler date={date} directorate={activeDir} />}
      {tab === 'ozet'  && isAdmin && (
        <TabOzet
          date={date}
          onSelectDir={(dir) => { setSelectedDir(dir); setTab('devam'); }}
        />
      )}
    </div>
  );
}
