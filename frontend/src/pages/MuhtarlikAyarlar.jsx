import { useState } from 'react';
import { YATIRIM_SUTUNLARI, BASVURU_SUTUNLARI, LS_KEY_YATIRIM, LS_KEY_BASVURU, loadVisibility, saveVisibility } from './MahalleDetay';

function SutunKarti({ baslik, sutunlar, lsKey }) {
  const [vis, setVis] = useState(() => loadVisibility(lsKey, sutunlar));

  function toggle(key) {
    const next = { ...vis, [key]: !vis[key] };
    setVis(next);
    saveVisibility(lsKey, next);
  }

  function toggleAll(val) {
    const next = Object.fromEntries(sutunlar.map(s => [s.key, val]));
    setVis(next);
    saveVisibility(lsKey, next);
  }

  const hepsiAcik = sutunlar.every(s => vis[s.key]);

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EEEEEE', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #EEEEEE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#212529' }}>{baslik}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => toggleAll(true)}
            style={{ padding: '4px 12px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 12 }}>
            Tümünü Göster
          </button>
          <button onClick={() => toggleAll(false)}
            style={{ padding: '4px 12px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 12 }}>
            Tümünü Gizle
          </button>
        </div>
      </div>
      <div style={{ padding: '8px 0' }}>
        {sutunlar.map(col => (
          <label key={col.key}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', cursor: 'pointer', userSelect: 'none' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f9f9f9'}
            onMouseLeave={e => e.currentTarget.style.background = ''}>
            <div
              onClick={() => toggle(col.key)}
              style={{
                width: 40, height: 22, borderRadius: 11, cursor: 'pointer', transition: 'background 0.2s',
                background: vis[col.key] ? '#26af68' : '#d1d5db',
                position: 'relative', flexShrink: 0,
              }}>
              <div style={{
                position: 'absolute', top: 3, left: vis[col.key] ? 21 : 3,
                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#212529' }}>{col.label}</div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>
                {col.wrap ? 'Uzun metin — tam gösterim' : `Sabit genişlik: ${col.width}`}
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function MuhtarlikAyarlar() {
  return (
    <div style={{ padding: '32px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(38,175,104,0.12)', color: '#26af68', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
          <i className="bi bi-gear" />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#212529', margin: 0 }}>Muhtarlık Ayarları</h1>
          <p style={{ fontSize: 12, color: '#7e7e7e', margin: 0 }}>Tablo sütunlarını özelleştir — ayarlar tarayıcıda kaydedilir</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <SutunKarti baslik="Yatırımlar Tablosu Sütunları" sutunlar={YATIRIM_SUTUNLARI} lsKey={LS_KEY_YATIRIM} />
        <SutunKarti baslik="Başvurular Tablosu Sütunları" sutunlar={BASVURU_SUTUNLARI} lsKey={LS_KEY_BASVURU} />
      </div>
    </div>
  );
}
