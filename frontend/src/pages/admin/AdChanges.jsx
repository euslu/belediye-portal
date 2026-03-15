import { useEffect, useState, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || '';

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

const CHANGE_LABELS = {
  DEPARTMENT_CHANGE: 'Departman Değişikliği',
  LEFT_COMPANY:      'Kurumdan Ayrılma',
  TITLE_CHANGE:      'Unvan Değişikliği',
};

const CHANGE_COLORS = {
  DEPARTMENT_CHANGE: 'bg-yellow-100 text-yellow-800',
  LEFT_COMPANY:      'bg-red-100 text-red-800',
  TITLE_CHANGE:      'bg-blue-100 text-blue-800',
};

export default function AdChanges() {
  const [logs, setLogs]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [syncing, setSyncing]   = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [filter, setFilter]     = useState({ changeType: '', notified: '' });

  const LIMIT = 50;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: LIMIT });
    if (filter.changeType) params.set('changeType', filter.changeType);
    if (filter.notified !== '') params.set('notified', filter.notified);

    try {
      const res  = await fetch(`${API}/api/admin/ad-sync/changes?${params}`, { headers: authHeaders() });
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);

  async function handleSync() {
    if (!confirm('AD senkronizasyonu başlatılsın mı? Bu işlem biraz zaman alabilir.')) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const res  = await fetch(`${API}/api/admin/ad-sync`, {
        method:  'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hata');
      setSyncResult({ ok: true, count: data.count });
      await load();
    } catch (err) {
      setSyncResult({ ok: false, message: err.message });
    } finally {
      setSyncing(false);
    }
  }

  async function markNotified(id) {
    await fetch(`${API}/api/admin/ad-sync/changes/${id}/notified`, {
      method:  'PATCH',
      headers: authHeaders(),
    });
    setLogs((prev) => prev.map((l) => l.id === id ? { ...l, notified: true } : l));
  }

  async function markAllNotified() {
    await fetch(`${API}/api/admin/ad-sync/changes/mark-all-notified`, {
      method:  'PATCH',
      headers: authHeaders(),
    });
    await load();
  }

  const totalPages = Math.ceil(total / LIMIT);
  const unnotified = logs.filter((l) => !l.notified).length;

  return (
    <div className="p-8">
      {/* Başlık */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Personel Değişiklikleri</h1>
          <p className="text-sm text-gray-400 mt-1">
            {total.toLocaleString('tr-TR')} kayıt
            {unnotified > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                {unnotified} yeni
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unnotified > 0 && (
            <button
              onClick={markAllNotified}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
            >
              Tümünü okundu işaretle
            </button>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition"
          >
            {syncing ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Senkronize ediliyor...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                AD Sync
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sync sonucu */}
      {syncResult && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${syncResult.ok ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {syncResult.ok
            ? `Senkronizasyon tamamlandı — ${syncResult.count} değişiklik tespit edildi`
            : `Hata: ${syncResult.message}`}
        </div>
      )}

      {/* Filtreler */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={filter.changeType}
          onChange={(e) => { setFilter((f) => ({ ...f, changeType: e.target.value })); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tüm değişiklik türleri</option>
          <option value="DEPARTMENT_CHANGE">Departman Değişikliği</option>
          <option value="LEFT_COMPANY">Kurumdan Ayrılma</option>
          <option value="TITLE_CHANGE">Unvan Değişikliği</option>
        </select>
        <select
          value={filter.notified}
          onChange={(e) => { setFilter((f) => ({ ...f, notified: e.target.value })); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tümü</option>
          <option value="false">Yeni (okunmamış)</option>
          <option value="true">Okunmuş</option>
        </select>
      </div>

      {/* Tablo */}
      {loading ? (
        <div className="text-center py-20 text-sm text-gray-400">Yükleniyor...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 text-sm text-gray-400">Kayıt bulunamadı</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Ad Soyad</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Kullanıcı Adı</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Değişiklik</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Eski Değer</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Yeni Değer</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tarih</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className={`hover:bg-gray-50 transition ${!log.notified ? 'bg-blue-50/30' : ''}`}
                >
                  <td className="px-5 py-3.5 font-medium text-gray-800">
                    <div className="flex items-center gap-2">
                      {!log.notified && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      )}
                      {log.displayName}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 font-mono text-xs">{log.username}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CHANGE_COLORS[log.changeType] || 'bg-gray-100 text-gray-700'}`}>
                      {CHANGE_LABELS[log.changeType] || log.changeType}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 max-w-[200px] truncate">{log.oldValue || '—'}</td>
                  <td className="px-5 py-3.5 text-gray-800 max-w-[200px] truncate">{log.newValue || '—'}</td>
                  <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap">
                    {new Date(log.detectedAt).toLocaleString('tr-TR', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="px-5 py-3.5">
                    {!log.notified && (
                      <button
                        onClick={() => markNotified(log.id)}
                        className="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap"
                      >
                        Okundu
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Sayfalama */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
              <span className="text-xs text-gray-400">
                Sayfa {page} / {totalPages} — toplam {total} kayıt
              </span>
              <div className="flex gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-100 transition"
                >
                  ‹ Önceki
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-100 transition"
                >
                  Sonraki ›
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
