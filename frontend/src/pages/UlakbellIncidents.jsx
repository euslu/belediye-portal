import { useState, useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || '';

function authFetch(path) {
  return fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  });
}

// ─── Sabitler ────────────────────────────────────────────────────────────────
const STATUSES = [
  { value: 'new',                  label: 'Yeni',            color: 'bg-gray-100 text-gray-700' },
  { value: 'pending',              label: 'Beklemede',       color: 'bg-yellow-100 text-yellow-700' },
  { value: 'in_process',           label: 'İşlemde',         color: 'bg-blue-100 text-blue-700' },
  { value: 'completed',            label: 'Sonuçlandı',      color: 'bg-green-100 text-green-700' },
  { value: 'waiting_for_approval', label: 'Onay Bekliyor',   color: 'bg-orange-100 text-orange-700' },
];

const STATUS_MAP = Object.fromEntries(STATUSES.map(s => [s.value, s]));

const INCIDENT_TYPES = {
  incident:  'Arıza',
  demand:    'İstek',
  complaint: 'Şikayet',
  thanks:    'Teşekkür',
  notice:    'İhbar',
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status];
  if (!s) return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{status}</span>;
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>;
}

function maskPhone(phone) {
  if (!phone) return '—';
  const p = String(phone).replace(/\D/g, '');
  if (p.length < 10) return p;
  return `0${p.slice(-10, -8)}** *** **${p.slice(-2)}`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="h-11 bg-gray-100 rounded-lg" />
      ))}
    </div>
  );
}

// ─── Detay Modalı ─────────────────────────────────────────────────────────────
function DetailModal({ token, onClose }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    authFetch(`/api/ulakbell/incidents/${token}`)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <span>🔔</span> Başvuru Detayı
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="p-5">
          {loading && <div className="animate-pulse space-y-3">{[...Array(5)].map((_,i) => <div key={i} className="h-8 bg-gray-100 rounded" />)}</div>}
          {error   && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}
          {data && !loading && <IncidentDetail data={data} />}
        </div>
      </div>
    </div>
  );
}

function IncidentDetail({ data }) {
  // ulakBELL response farklı şekillerde olabilir — düzleştir
  const d = data?.data ?? data;

  const rows = [
    ['Başvuru No',    d.number      || d.id || '—'],
    ['Tarih',         fmtDate(d.created_at || d.createdAt)],
    ['Tür',           INCIDENT_TYPES[d.incident_type] || d.incident_type || '—'],
    ['Durum',         <StatusBadge key="st" status={d.status} />],
    ['Kaynak',        d.source?.title || d.incident_source?.title || '—'],
    ['Telefon',       maskPhone(d.mobile_phone)],
    ['İlçe',          d.ilce?.title || d.ilce_title || '—'],
    ['Mahalle',       d.mahalle?.title || d.mahalle_title || '—'],
    ['Sokak',         d.sokak?.title || d.sokak_cadde_title || '—'],
    ['Bina',          d.bina?.title || d.dis_kapi_no || '—'],
    ['Daire',         d.daire?.title || d.ic_kapi_no || '—'],
  ].filter(([, v]) => v && v !== '—');

  return (
    <div className="space-y-4">
      {/* Meta bilgiler */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{label}</dt>
            <dd className="text-gray-800 font-medium mt-0.5">{value}</dd>
          </div>
        ))}
      </dl>

      {/* Başvuru metni */}
      {(d.text || d.description) && (
        <div>
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">Başvuru Metni</p>
          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap leading-relaxed">
            {d.text || d.description}
          </p>
        </div>
      )}

      {/* Ekler */}
      {d.attachments?.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">Ekler</p>
          <ul className="space-y-1">
            {d.attachments.map((a, i) => (
              <li key={i} className="text-sm text-blue-600 flex items-center gap-2">
                <span>📎</span> {a.real_name || a.name || `Dosya ${i + 1}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────
export default function UlakbellIncidents() {
  const [incidents,    setIncidents]    = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [notConfigured, setNotConfigured] = useState(false);
  const [lastUpdated,  setLastUpdated]  = useState(null);
  const [detailToken,  setDetailToken]  = useState(null);

  // Filtreler
  const [search,      setSearch]      = useState('');
  const [activeStats, setActiveStats] = useState(['new', 'pending', 'in_process']);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);

  const COUNT = 20;

  const load = useCallback(async (p = page) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page:  p,
        count: COUNT,
        resource: 'all',
        show_all_incidents: 1,
      });

      activeStats.forEach(s => params.append('status[]', s));

      // Ara: rakam → number, diğer → mobile_phone
      if (search.trim()) {
        if (/^\d+$/.test(search.trim())) params.set('number', search.trim());
        else params.set('mobile_phone', search.trim());
      }

      const data = await authFetch(`/api/ulakbell/incidents?${params}`);

      // ulakBELL yanıt yapısı: { data: [...], meta: { total, per_page } } veya [...]
      const list  = Array.isArray(data) ? data : (data?.data || data?.incidents || []);
      const meta  = data?.meta || data?.pagination || {};
      const total = meta.total || meta.last_page || list.length;
      setIncidents(list);
      setTotalPages(Math.max(1, Math.ceil(total / COUNT)));
      setLastUpdated(new Date());
    } catch (e) {
      if (e.message.includes('yapılandırılmamış')) setNotConfigured(true);
      else setError(e.message);
    }
    setLoading(false);
  }, [page, activeStats, search]);

  useEffect(() => { load(1); setPage(1); }, [activeStats]);

  function toggleStatus(value) {
    setActiveStats(prev =>
      prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]
    );
  }

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    load(1);
  }

  function goPage(p) {
    setPage(p);
    load(p);
  }

  // ─── Yapılandırılmamış ────────────────────────────────────────────────────
  if (notConfigured) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <div className="text-4xl">🔔</div>
        <div>
          <p className="text-base font-semibold text-gray-800 mb-1">ulakBELL entegrasyonu yapılandırılmamış</p>
          <p className="text-sm text-gray-500">
            <a href="/admin/settings" className="text-indigo-600 hover:underline">Ayarlar › ulakBELL</a> sekmesinden
            URL ve token bilgilerini girin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span>🔔</span> ulakBELL Başvuruları
          </h1>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-0.5">
              Son güncelleme: {lastUpdated.toLocaleTimeString('tr-TR')}
            </p>
          )}
        </div>
        <button onClick={() => load(page)} disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50">
          <span className={loading ? 'animate-spin' : ''}>🔄</span> Yenile
        </button>
      </div>

      {/* Filtre Satırı */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Durum Checkboxları */}
          <div className="flex flex-wrap gap-2">
            {STATUSES.map(s => (
              <button key={s.value} type="button" onClick={() => toggleStatus(s.value)}
                className={`text-xs px-2.5 py-1 rounded-full border-2 transition font-medium
                  ${activeStats.includes(s.value)
                    ? `${s.color} border-current`
                    : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                {activeStats.includes(s.value) ? '✓ ' : ''}{s.label}
              </button>
            ))}
          </div>

          {/* Arama */}
          <form onSubmit={handleSearch} className="flex items-center gap-2 ml-auto">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Başvuru no veya telefon ara…"
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button type="submit"
              className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition">
              Ara
            </button>
            {search && (
              <button type="button" onClick={() => { setSearch(''); setPage(1); load(1); }}
                className="text-xs text-gray-400 hover:text-gray-600">✕</button>
            )}
          </form>
        </div>
      </div>

      {/* Hata */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-lg">❌</span>
          <div>
            <p className="text-sm font-semibold text-red-800">ulakBELL bağlantısı kurulamadı</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Tablo */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-5"><Skeleton /></div>
        ) : incidents.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            {error ? '' : 'Başvuru bulunamadı'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-8">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Başvuru No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Metin</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tür</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Durum</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tarih</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {incidents.map((inc, idx) => {
                const d = inc?.data ?? inc;
                const token = d.public_token || d.token || d.id;
                const num   = d.number || d.id || '—';
                const text  = d.text || d.description || '';
                const type  = INCIDENT_TYPES[d.incident_type] || d.incident_type || '—';
                const date  = fmtDate(d.created_at || d.createdAt);

                return (
                  <tr key={token || idx} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs">{(page - 1) * COUNT + idx + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 whitespace-nowrap">#{num}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs">
                      <span title={text}>{text.length > 65 ? text.slice(0, 65) + '…' : text}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{type}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={d.status} /></td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{date}</td>
                    <td className="px-4 py-3 text-right">
                      {token && (
                        <button onClick={() => setDetailToken(String(token))}
                          className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition font-medium">
                          Detay
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Sayfalama */}
      {!loading && incidents.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <p className="text-xs text-gray-400">{COUNT} kayıt / sayfa</p>
          <div className="flex items-center gap-2">
            <button onClick={() => goPage(page - 1)} disabled={page <= 1}
              className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition text-xs">
              ← Önceki
            </button>
            <span className="text-xs font-medium px-3">
              Sayfa {page} / {totalPages}
            </span>
            <button onClick={() => goPage(page + 1)} disabled={page >= totalPages}
              className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition text-xs">
              Sonraki →
            </button>
          </div>
        </div>
      )}

      {/* Detay Modalı */}
      {detailToken && (
        <DetailModal token={detailToken} onClose={() => setDetailToken(null)} />
      )}
    </div>
  );
}
