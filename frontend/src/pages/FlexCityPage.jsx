import { useState, useEffect } from 'react';

// ── Yardımcılar ──────────────────────────────────────────────────────────────
function n(v) { return (v ?? 0).toLocaleString('tr'); }

function StatKart({ baslik, deger, alt, renk = '#26af68', ikon }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e8ede9', padding: '20px 24px', flex: 1, minWidth: 160 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${renk}18`, color: renk, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
          <i className={`bi ${ikon}`} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#9aa8a0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{baslik}</span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 700, color: '#1a2e23', lineHeight: 1 }}>{n(deger)}</div>
      {alt && <div style={{ fontSize: 12, color: '#9aa8a0', marginTop: 6 }}>{alt}</div>}
    </div>
  );
}

function BarChart({ baslik, data, renk = '#26af68', maxShow = 10 }) {
  if (!data?.length) return null;
  const max = data[0]?.sayi || 1;
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e8ede9', padding: '20px 24px' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2e23', marginBottom: 16 }}>{baslik}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.slice(0, maxShow).map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 12, color: '#374151', width: 160, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.ad}</div>
            <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 4, height: 18, overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(3, (d.sayi / max) * 100)}%`, height: '100%', background: renk, borderRadius: 4, transition: 'width 0.4s' }} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', width: 40, textAlign: 'right', flexShrink: 0 }}>{n(d.sayi)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PieChart({ baslik, data, renkler }) {
  if (!data?.length) return null;
  const toplam = data.reduce((s, d) => s + d.sayi, 0);
  const rl = renkler || ['#26af68','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16'];
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e8ede9', padding: '20px 24px' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2e23', marginBottom: 16 }}>{baslik}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map((d, i) => {
          const yuzde = toplam ? Math.round((d.sayi / toplam) * 100) : 0;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: rl[i % rl.length], flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: '#374151', flex: 1 }}>{d.ad}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{n(d.sayi)}</div>
              <div style={{ fontSize: 11, color: '#9aa8a0', width: 35, textAlign: 'right' }}>%{yuzde}</div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 12, borderTop: '1px solid #f3f4f6', paddingTop: 10, fontSize: 11, color: '#9aa8a0', textAlign: 'right' }}>
        Toplam: {n(toplam)}
      </div>
    </div>
  );
}

// ── Bölüm başlığı ─────────────────────────────────────────────────────────────
function Bolum({ ikon, baslik, renk = '#26af68' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '32px 0 16px' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${renk}18`, color: renk, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
        <i className={`bi ${ikon}`} />
      </div>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a2e23', margin: 0 }}>{baslik}</h2>
      <div style={{ flex: 1, height: 1, background: '#e8ede9' }} />
    </div>
  );
}

// ── Ana sayfa ─────────────────────────────────────────────────────────────────
export default function FlexCityPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    fetch('/api/flexcity/istatistik', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '3px solid #e8ede9', borderTop: '3px solid #26af68', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ color: '#9aa8a0', fontSize: 13 }}>FlexCity verisi yükleniyor…</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '24px 32px', color: '#dc2626', maxWidth: 500, textAlign: 'center' }}>
        <i className="bi bi-exclamation-triangle" style={{ fontSize: 32, display: 'block', marginBottom: 12 }} />
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Veri alınamadı</div>
        <div style={{ fontSize: 13 }}>{error}</div>
      </div>
    </div>
  );

  const { mahalle, personel, sosyal, sehitGazi } = data;

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1200 }}>

      {/* Başlık */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(38,175,104,0.12)', color: '#26af68', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
            <i className="bi bi-database-check" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a2e23', margin: 0 }}>FlexCity İstatistikleri</h1>
            <p style={{ fontSize: 12, color: '#9aa8a0', margin: 0 }}>Muğla Büyükşehir Belediyesi — Canlı Veri</p>
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#9aa8a0' }}>
          Güncellendi: {new Date(data.cachedAt).toLocaleTimeString('tr-TR')}
        </div>
      </div>

      {/* ── MAHALLE ─────────────────────────────────────────────────────────── */}
      <Bolum ikon="bi-geo-alt" baslik="Mahalle Bilgileri" renk="#26af68" />

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <StatKart baslik="Toplam Mahalle"  deger={mahalle.toplam}        ikon="bi-map"        renk="#26af68" />
        <StatKart baslik="Toplam Nüfus"    deger={mahalle.nufus.erkek + mahalle.nufus.kadin}
                  alt={`${n(mahalle.nufus.erkek)} erkek · ${n(mahalle.nufus.kadin)} kadın`}
                  ikon="bi-people"         renk="#3b82f6" />
        <StatKart baslik="Hane Sayısı"     deger={mahalle.nufus.hane}    ikon="bi-house"      renk="#f59e0b" />
        <StatKart baslik="İlçe Sayısı"     deger={mahalle.ilceler.length} ikon="bi-pin-map"   renk="#8b5cf6" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <BarChart baslik="İlçe Bazlı Mahalle Sayısı"  data={mahalle.ilceler}  renk="#26af68" maxShow={13} />
        <PieChart baslik="Muhtar Parti Dağılımı"       data={mahalle.partiler} />
      </div>

      {/* ── PERSONEL ─────────────────────────────────────────────────────────── */}
      <Bolum ikon="bi-person-badge" baslik="Personel Bilgileri" renk="#3b82f6" />

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <StatKart baslik="Toplam Personel" deger={personel.toplam}           ikon="bi-person-badge" renk="#3b82f6" />
        <StatKart baslik="Daire Sayısı"    deger={personel.daireler.length}  ikon="bi-building"    renk="#26af68" />
        <StatKart baslik="Müdürlük"        deger={personel.mudurlukler.length} ikon="bi-diagram-3" renk="#f59e0b" />
        <StatKart baslik="Lokasyon"        deger={personel.lokasyonlar.length} ikon="bi-geo"       renk="#8b5cf6" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <BarChart baslik="Daire Bazlı Personel Sayısı" data={personel.daireler}    renk="#3b82f6" maxShow={10} />
        <PieChart baslik="Personel Türü Dağılımı"      data={personel.turler} renkler={['#3b82f6','#26af68','#f59e0b','#ef4444']} />
      </div>

      {/* ── SOSYAL HİZMETLER ─────────────────────────────────────────────────── */}
      <Bolum ikon="bi-heart" baslik="Sosyal Hizmetler" renk="#ef4444" />

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <StatKart baslik="Sosyal Yardım"  deger={sosyal.yardimToplam}     ikon="bi-gift"         renk="#ef4444" />
        <StatKart baslik="Evde Bakım"     deger={sosyal.evdeBakimToplam}  ikon="bi-house-heart"  renk="#ec4899" />
        <StatKart baslik="Hasta Nakil"    deger={sosyal.hastaNakilToplam} ikon="bi-ambulance"    renk="#f97316" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <BarChart baslik="Evde Bakım — İlçe Dağılımı"    data={sosyal.evdeBakimIlceler}  renk="#ec4899" />
        <BarChart baslik="Hasta Nakil — İlçe Dağılımı"   data={sosyal.hastaNakilIlceler} renk="#f97316" />
      </div>

      {/* ── ŞEHİT/GAZİ ──────────────────────────────────────────────────────── */}
      <Bolum ikon="bi-shield-star" baslik="Şehit/Gazi" renk="#8b5cf6" />

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <StatKart baslik="Toplam Kayıt"   deger={sehitGazi.toplam}      ikon="bi-shield-star" renk="#8b5cf6" />
        <StatKart baslik="Şehit Ailesi"   deger={sehitGazi.sehitAilesi} ikon="bi-flag"        renk="#ef4444" />
        <StatKart baslik="Gazi"           deger={sehitGazi.gazi}        ikon="bi-award"       renk="#f59e0b" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <BarChart baslik="İlçe Bazlı Dağılım"    data={sehitGazi.ilceler}      renk="#8b5cf6" />
        <PieChart baslik="Engel Türü Dağılımı"   data={sehitGazi.engelTurleri} />
      </div>


    </div>
  );
}
