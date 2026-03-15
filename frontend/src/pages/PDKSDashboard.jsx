import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
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

// ─── Stat Kartı ───────────────────────────────────────────────────────────────
function StatCard({ label, value, total, color, icon }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <p className={`text-3xl font-bold ${color}`}>{value.toLocaleString('tr-TR')}</p>
      {total > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full ${color.replace('text-', 'bg-')}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-gray-400">%{pct}</span>
        </div>
      )}
    </div>
  );
}

// ─── Durum badge ──────────────────────────────────────────────────────────────
function DurumBadge({ durum }) {
  const map = {
    GELDI:          'bg-green-100 text-green-700',
    GELMEDI:        'bg-red-100 text-red-700',
    IZINLI:         'bg-amber-100 text-amber-700',
    RESMI_TATIL:    'bg-blue-100 text-blue-700',
    GOREVLENDIRME:  'bg-purple-100 text-purple-700',
  };
  const labels = {
    GELDI: 'Geldi', GELMEDI: 'Gelmedi', IZINLI: 'İzinli',
    RESMI_TATIL: 'Resmi Tatil', GOREVLENDIRME: 'Görevlendirme',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[durum] || 'bg-gray-100 text-gray-500'}`}>
      {labels[durum] || durum}
    </span>
  );
}

// ─── Personel Detay Modal ─────────────────────────────────────────────────────
function PersonelModal({ directorate, date, onClose }) {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    const params = new URLSearchParams({ date, directorate });
    authFetch(`${API}/api/pdks/attendance?${params}`)
      .then(r => r.json())
      .then(d => setRows(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [directorate, date]);

  const filtered = search
    ? rows.filter(r => r.adSoyad?.toLowerCase().includes(search.toLowerCase()))
    : rows;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-800">{directorate}</h2>
            <p className="text-xs text-gray-400">{new Date(date).toLocaleDateString('tr-TR', { dateStyle: 'long' })}</p>
          </div>
          <div className="flex items-center gap-3">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Personel ara…"
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Yükleniyor…</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">Personel bulunamadı</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="text-xs text-gray-500">
                  <th className="text-left px-5 py-3 font-medium">Ad Soyad</th>
                  <th className="text-left px-4 py-3 font-medium">Birim</th>
                  <th className="text-left px-4 py-3 font-medium">Giriş</th>
                  <th className="text-left px-4 py-3 font-medium">Çıkış</th>
                  <th className="text-left px-4 py-3 font-medium">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((r, i) => (
                  <tr key={i} className={`hover:bg-gray-50 ${r.durum === 'GELMEDI' ? 'bg-red-50/30' : ''}`}>
                    <td className="px-5 py-2.5 font-medium text-gray-800">{r.adSoyad}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{r.sube || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{r.girisSaati ? String(r.girisSaati).slice(0, 5) : '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{r.cikisSaati ? String(r.cikisSaati).slice(0, 5) : '—'}</td>
                    <td className="px-4 py-2.5"><DurumBadge durum={r.durum} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────
export default function PDKSDashboard() {
  const [date, setDate]           = useState(today());
  const [summary, setSummary]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [configured, setConfigured] = useState(true);
  const [error, setError]         = useState(null);
  const [modal, setModal]         = useState(null);   // directorate name
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (d = date, isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const r = await authFetch(`${API}/api/pdks/summary?date=${d}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      if (!json.configured) { setConfigured(false); setSummary([]); return; }
      setConfigured(true);
      setSummary(json.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date]);

  useEffect(() => { load(date); }, [date]);

  // Toplam istatistikler
  const totals = summary.reduce(
    (acc, row) => ({
      toplam:  acc.toplam  + (Number(row.toplam)  || 0),
      gelen:   acc.gelen   + (Number(row.gelen)   || 0),
      gelmedi: acc.gelmedi + (Number(row.gelmedi) || 0),
      izinli:  acc.izinli  + (Number(row.izinli)  || 0),
    }),
    { toplam: 0, gelen: 0, gelmedi: 0, izinli: 0 }
  );

  return (
    <div className="p-8">
      {/* Başlık */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Personel Devam Takip Sistemi</h1>
          <p className="text-sm text-gray-400 mt-1">Günlük devam/devamsızlık özeti</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            max={today()}
            onChange={e => setDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => load(date, true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
          >
            {refreshing ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            ) : '🔄'} Yenile
          </button>
        </div>
      </div>

      {/* PDKS yapılandırılmamış uyarısı */}
      {!configured && (
        <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-medium text-amber-800">PDKS bağlantısı yapılandırılmamış</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Devam verilerini görüntülemek için{' '}
              <Link to="/settings" className="underline font-medium">Ayarlar → PDKS</Link>{' '}
              bölümünden veritabanı bağlantısını yapılandırın.
            </p>
          </div>
        </div>
      )}

      {/* Hata */}
      {error && (
        <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <span>❌</span> {error}
        </div>
      )}

      {/* Özet Kartlar */}
      {configured && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Toplam Personel" value={totals.toplam} total={0} color="text-gray-800" icon="👥" />
            <StatCard label="Gelen" value={totals.gelen} total={totals.toplam} color="text-green-600" icon="✅" />
            <StatCard label="Gelmeyen" value={totals.gelmedi} total={totals.toplam} color="text-red-600" icon="❌" />
            <StatCard label="İzinli" value={totals.izinli} total={totals.toplam} color="text-amber-600" icon="🏖️" />
          </div>

          {/* Daire Tablosu */}
          {loading ? (
            <div className="text-center py-16 text-sm text-gray-400">Yükleniyor…</div>
          ) : summary.length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-400">
              {configured ? 'Bu tarihe ait veri bulunamadı' : ''}
            </div>
          ) : (
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
                  {summary.map((row, i) => {
                    const toplam  = Number(row.toplam)  || 0;
                    const gelen   = Number(row.gelen)   || 0;
                    const gelmedi = Number(row.gelmedi) || 0;
                    const izinli  = Number(row.izinli)  || 0;
                    const pct     = toplam > 0 ? Math.round((gelen / toplam) * 100) : 0;
                    const pctColor = pct >= 90 ? 'text-green-600' : pct >= 70 ? 'text-amber-600' : 'text-red-600';

                    return (
                      <tr
                        key={i}
                        onClick={() => setModal(row.directorate)}
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
                            <div
                              className={`h-1.5 rounded-full ${pct >= 90 ? 'bg-green-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Personel Detay Modal */}
      {modal && (
        <PersonelModal
          directorate={modal}
          date={date}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
