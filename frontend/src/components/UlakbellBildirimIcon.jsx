import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

const TIP_LABEL = {
  demand:      { label: 'Talep',    color: '#3b82f6' },
  complaint:   { label: 'Şikayet',  color: '#ef4444' },
  thank:       { label: 'Teşekkür', color: '#22c55e' },
  information: { label: 'Bilgi',    color: '#f59e0b' },
  notice:      { label: 'İhbar',    color: '#dc2626' },
};

export default function UlakbellBildirimIcon() {
  const [okunmamis, setOkunmamis]     = useState(0);
  const [bildirimler, setBildirimler] = useState([]);
  const [acik, setAcik]               = useState(false);
  const [yukleniyor, setYukleniyor]   = useState(false);
  const ref      = useRef(null);
  const navigate = useNavigate();

  // Sayaç — 60 saniyede bir güncelle
  const fetchSayac = useCallback(() => {
    fetch(`${API}/api/ulakbell-bildirimler/sayac`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : { okunmamis: 0 })
      .then(d => setOkunmamis(d.okunmamis || 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchSayac();
    const id = setInterval(fetchSayac, 60000);
    return () => clearInterval(id);
  }, [fetchSayac]);

  // Dışarı tıklayınca kapat
  useEffect(() => {
    if (!acik) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setAcik(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [acik]);

  // Dropdown açılınca son 10 okunmamış bildirimi yükle
  function toggleDropdown() {
    if (!acik) {
      setYukleniyor(true);
      fetch(`${API}/api/ulakbell-bildirimler?limit=10&okundu=false`, { headers: authHeaders() })
        .then(r => r.ok ? r.json() : { bildirimler: [] })
        .then(d => setBildirimler(d.bildirimler || []))
        .catch(() => {})
        .finally(() => setYukleniyor(false));
    }
    setAcik(v => !v);
  }

  async function tumunuOku() {
    await fetch(`${API}/api/ulakbell-bildirimler/tumunu-oku`, {
      method: 'PUT',
      headers: authHeaders(),
    });
    setOkunmamis(0);
    setBildirimler(prev => prev.map(b => ({ ...b, okundu: true })));
  }

  async function tekOku(b) {
    if (!b.okundu) {
      fetch(`${API}/api/ulakbell-bildirimler/${b.id}/oku`, {
        method: 'PUT',
        headers: authHeaders(),
      }).catch(() => {});
      setOkunmamis(n => Math.max(0, n - 1));
    }
    setAcik(false);
    navigate('/ulakbell-incidents');
  }

  return (
    <li ref={ref} className="nav-item" style={{ position: 'relative' }}>
      <button
        onClick={toggleDropdown}
        style={{
          position: 'relative', background: 'none', border: 'none',
          cursor: 'pointer', padding: '8px', borderRadius: 8,
          color: acik ? '#6366f1' : '#6b7280',
          transition: 'color 0.15s',
        }}
        title="ulakBELL Bildirimleri"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>

        {okunmamis > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            minWidth: 16, height: 16, borderRadius: '50%',
            background: '#ef4444', color: '#fff',
            fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px',
          }}>
            {okunmamis > 99 ? '99+' : okunmamis}
          </span>
        )}
      </button>

      {acik && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 360, maxHeight: 480, overflowY: 'auto',
          background: '#fff', borderRadius: 14,
          boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
          border: '1px solid #e5e7eb', zIndex: 999,
        }}>
          {/* Başlık */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', padding: '14px 16px',
            borderBottom: '1px solid #f3f4f6',
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1f2937' }}>
              ulakBELL Bildirimleri
              {okunmamis > 0 && (
                <span style={{
                  marginLeft: 8, fontSize: 11,
                  background: '#fef2f2', color: '#dc2626',
                  padding: '1px 8px', borderRadius: 10,
                }}>
                  {okunmamis} yeni
                </span>
              )}
            </div>
            {okunmamis > 0 && (
              <button
                onClick={tumunuOku}
                style={{
                  fontSize: 11, color: '#6366f1', background: 'none',
                  border: 'none', cursor: 'pointer', fontWeight: 600,
                }}
              >
                Tümünü oku
              </button>
            )}
          </div>

          {/* Liste */}
          {yukleniyor ? (
            <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af', fontSize: 13 }}>
              Yükleniyor...
            </div>
          ) : bildirimler.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af', fontSize: 13 }}>
              Yeni bildirim yok
            </div>
          ) : (
            bildirimler.map((b, i) => {
              const tip = TIP_LABEL[b.basvuruTipi] || { label: 'Başvuru', color: '#9ca3af' };
              return (
                <div
                  key={b.id}
                  onClick={() => tekOku(b)}
                  style={{
                    padding: '12px 16px', cursor: 'pointer',
                    borderBottom: i < bildirimler.length - 1 ? '1px solid #f9fafb' : 'none',
                    background: b.okundu ? '#fff' : '#fffbeb',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = b.okundu ? '#fff' : '#fffbeb'; }}
                >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    {/* Okunmamış nokta */}
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%', marginTop: 6,
                      background: b.okundu ? 'transparent' : '#ef4444',
                      flexShrink: 0,
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', marginBottom: 2,
                      }}>
                        <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#9ca3af' }}>
                          #{b.basvuruNo}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 600,
                          color: tip.color, background: tip.color + '15',
                          padding: '1px 6px', borderRadius: 8,
                        }}>
                          {tip.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#1f2937' }}>
                        {b.basvuranAd || 'Vatandaş'}
                      </div>
                      {(b.ilce || b.mahalle) && (
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                          {[b.ilce, b.mahalle].filter(Boolean).join(' / ')}
                        </div>
                      )}
                      {b.portalDaire && (
                        <div style={{ fontSize: 10, color: '#6366f1', marginTop: 2 }}>
                          {b.portalDaire}
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: '#d1d5db', marginTop: 2 }}>
                        {new Date(b.olusturmaTarih).toLocaleString('tr-TR')}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Alt — tümünü gör */}
          <div style={{
            padding: '10px 16px', borderTop: '1px solid #f3f4f6',
            textAlign: 'center',
          }}>
            <button
              onClick={() => { setAcik(false); navigate('/ulakbell-incidents'); }}
              style={{
                fontSize: 12, color: '#6366f1', fontWeight: 600,
                background: 'none', border: 'none', cursor: 'pointer',
              }}
            >
              Tüm Başvuruları Gör
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
