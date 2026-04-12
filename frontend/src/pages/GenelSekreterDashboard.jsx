import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const RANDEVU_BASE = "/api/randevu";
const RANDEVU_KEY  = "";

async function randevuFetch(path) {
  const token = localStorage.getItem("token");
  const res = await fetch(RANDEVU_BASE + path, {
    signal: AbortSignal.timeout(8000),
    headers: {
      ...(RANDEVU_KEY ? { "X-API-Key": RANDEVU_KEY } : {}),
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`API hatası: ${res.status}`);
  return res.json();
}

async function flexcityFetch(path) {
  const token = localStorage.getItem("token");
  const res = await fetch("/api/flexcity" + path, {
    signal: AbortSignal.timeout(30000),
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`FlexCity API hatası: ${res.status}`);
  return res.json();
}

const todayISO = new Date().toISOString().slice(0, 10);

const C = {
  primary:     "#43DC80",
  primaryDark: "#2db866",
  danger:      "#ef4444",
  warning:     "#f59e0b",
  info:        "#3b82f6",
  gray:        "#6b7280",
  bg:          "#f1f5f9",
  card:        "#ffffff",
};

const yatirimOzet = {
  toplamProje:       5679,
  tamamlanan:        1019,
  tamamlanmaOrani:   17.9,
  toplamBedel:       285_000_000,
};

const ilceDagilim = [
  { ilce: "Fethiye",     toplam: 847, tamamlanan: 198 },
  { ilce: "Milas",       toplam: 712, tamamlanan: 187 },
  { ilce: "Menteşe",     toplam: 634, tamamlanan: 145 },
  { ilce: "Bodrum",      toplam: 589, tamamlanan: 112 },
  { ilce: "Marmaris",    toplam: 445, tamamlanan:  98 },
  { ilce: "Seydikemer",  toplam: 398, tamamlanan:  87 },
  { ilce: "Yatağan",     toplam: 367, tamamlanan:  76 },
  { ilce: "Köyceğiz",    toplam: 356, tamamlanan:  72 },
  { ilce: "Ortaca",      toplam: 312, tamamlanan:  65 },
  { ilce: "Dalaman",     toplam: 287, tamamlanan:  54 },
  { ilce: "Kavaklidere", toplam: 300, tamamlanan:  44 },
  { ilce: "Ula",         toplam: 234, tamamlanan:  47 },
  { ilce: "Datça",       toplam: 198, tamamlanan:  34 },
];

const butce = {
  odenek:   285_000_000,
  harcama:  165_800_000,
  bloke:     18_500_000,
  bekleyen:  22_300_000,
  buAyHarcama: 12_400_000,
  gunluk:  [
    { label: "Pzt", odeme: 1_200_000 },
    { label: "Sal", odeme:   890_000 },
    { label: "Çar", odeme: 1_450_000 },
    { label: "Per", odeme: 2_100_000 },
    { label: "Cum", odeme: 1_780_000 },
  ],
  haftalik: [
    { label: "H1", odeme:  8_200_000 },
    { label: "H2", odeme: 11_400_000 },
    { label: "H3", odeme:  9_800_000 },
    { label: "H4", odeme: 13_200_000 },
  ],
  aylik: [
    { label: "Oca", odeme: 18_000_000 },
    { label: "Şub", odeme: 22_000_000 },
    { label: "Mar", odeme: 12_400_000 },
  ],
};

const PERSONEL_FALLBACK = { toplam: 4318, erkek: 3397, kadin: 907, daireSayisi: 37 };

const cagri = {
  bugunToplam:  142,
  bugunCozulen: 126,
  bugunBekleyen: 16,
  cozumOrani:   88.7,
  haftaToplam:  687,
  haftaCozulen: 621,
};

const esm = {
  bilgiIslem: {
    acik: 47, kapanan: 28, geciken: 5, ortSure: "2.3 gün",
    oncelik: [
      { tip: "Kritik", sayi: 5,  renk: C.danger },
      { tip: "Yüksek", sayi: 12, renk: C.warning },
      { tip: "Normal", sayi: 30, renk: C.primary },
    ],
  },
  destekHizmetleri: {
    acik: 63, kapanan: 41, geciken: 8, ortSure: "3.1 gün",
    oncelik: [
      { tip: "Kritik", sayi: 8,  renk: C.danger },
      { tip: "Yüksek", sayi: 19, renk: C.warning },
      { tip: "Normal", sayi: 36, renk: C.primary },
    ],
  },
};

const fmtPara = (v) => {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)} Mrd ₺`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(1)} Mn ₺`;
  if (v >= 1_000)         return `${(v / 1_000).toFixed(0)} B ₺`;
  return `${v} ₺`;
};
const pct = (a, b) => ((a / b) * 100).toFixed(1);

// ── Widget tanımları ──────────────────────────────────────────────────────────
export const GS_WIDGET_TANIMLARI = [
  { id: 'ozet_kartlar',     baslik: 'Özet Kartlar',                  aciklama: 'Toplam proje/talep, tamamlanma oranı, toplam ödenek ve bu ay harcama',  ikon: '📊', varsayilan: true  },
  { id: 'butce_durumu',     baslik: 'Bütçe Durumu',                  aciklama: 'Harcama gerçekleşmesi, bloke ve bekleyen ödemeler (mock veri)',           ikon: '💰', varsayilan: true  },
  { id: 'proje_tamamlanma', baslik: 'Proje Tamamlanma',              aciklama: 'Tamamlanan/devam eden proje sayısı ve toplam yatırım bedeli',            ikon: '✅', varsayilan: true  },
  { id: 'ilce_dagilim',     baslik: 'İlçe Bazlı Yatırım Dağılımı',  aciklama: '13 ilçe bazında toplam ve tamamlanan yatırım karşılaştırması',           ikon: '🗺️', varsayilan: true  },
  { id: 'randevu',          baslik: 'Randevu Sistemi',               aciklama: 'Günlük randevu sayısı, bekleyen talepler ve haftalık takvim',            ikon: '📅', varsayilan: true  },
  { id: 'personel',         baslik: 'Personel İstatistikleri',       aciklama: 'FlexCity canlı: toplam personel, erkek/kadın dağılımı, daire sayısı',   ikon: '👥', varsayilan: true  },
  { id: 'cagri_merkezi',    baslik: 'Çağrı Merkezi',                 aciklama: 'Günlük çağrı sayısı, çözüm oranı ve haftalık özet',                      ikon: '📞', varsayilan: true  },
  { id: 'esm_talepler',     baslik: 'Servis Talep İstatistikleri',   aciklama: 'Bilgi işlem ve destek hizmetleri ticket sayıları',                        ikon: '🖥️', varsayilan: true  },
  { id: 'sosyal_hizmetler', baslik: 'Sosyal Hizmetler',              aciklama: 'FlexCity: Evde bakım (16.588), hasta nakil (11.676), şehit/gazi',         ikon: '🤝', varsayilan: true  },
  { id: 'tasinmaz',         baslik: 'Belediye Taşınmazları',         aciklama: 'FlexCity: 6.057 taşınmaz, rayiç değer ~12.2 Milyar ₺',                   ikon: '🏢', varsayilan: false },
];

const getWidgetAyarlari = () => {
  try {
    const kayitli = localStorage.getItem('gs_widget_ayarlari');
    if (kayitli) return JSON.parse(kayitli);
  } catch {}
  return Object.fromEntries(GS_WIDGET_TANIMLARI.map(w => [w.id, w.varsayilan]));
};

// ── Bileşenler ────────────────────────────────────────────────────────────────

function KPICard({ icon, title, value, sub, valueColor }) {
  return (
    <div style={{
      background: C.card, borderRadius: 16, padding: "18px 20px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.07)", border: "1px solid #e5e7eb",
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: C.gray, fontWeight: 500 }}>{title}</span>
        <span style={{ fontSize: 22 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: valueColor || "#1a1a2e", lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: "#9ca3af" }}>{sub}</div>}
    </div>
  );
}

function Card({ title, badge, children, style }) {
  return (
    <div style={{
      background: C.card, borderRadius: 16, padding: "20px 20px 16px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.07)", border: "1px solid #e5e7eb",
      ...style,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>{title}</span>
        {badge && (
          <span style={{
            fontSize: 10, fontWeight: 600, color: "#92400e",
            background: "#fef3c7", borderRadius: 6, padding: "2px 7px",
          }}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function BarItem({ label, value, max, color, showTL }) {
  const w = Math.min((value / max) * 100, 100);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: "#6b7280" }}>{label}</span>
        <span style={{ fontWeight: 600, color: "#374151" }}>
          {showTL ? fmtPara(value) : `%${w.toFixed(1)}`}
        </span>
      </div>
      <div style={{ background: "#f1f5f9", borderRadius: 8, height: 8 }}>
        <div style={{ width: `${w}%`, height: 8, borderRadius: 8, background: color, transition: "width .4s" }} />
      </div>
    </div>
  );
}

function StatRow({ label, value, bg, color }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 14px", borderRadius: 12, background: bg || "#f9fafb", marginBottom: 8,
    }}>
      <span style={{ fontSize: 13, color: "#6b7280" }}>{label}</span>
      <span style={{ fontWeight: 700, fontSize: 16, color: color || "#1a1a2e" }}>{value}</span>
    </div>
  );
}

function ESMBlock({ label, data }) {
  return (
    <div style={{ background: "#f9fafb", borderRadius: 12, padding: "12px 14px", marginBottom: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 10 }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", textAlign: "center", gap: 4 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, color: C.info }}>{data.acik}</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>Açık</div>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, color: C.primaryDark }}>{data.kapanan}</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>Bu Hafta</div>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, color: C.danger }}>{data.geciken}</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>Geciken</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
        Ort. çözüm süresi: <strong>{data.ortSure}</strong>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 10, justifyContent: "center" }}>
        {data.oncelik.map((o) => (
          <div key={o.tip} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: o.renk }} />
            <span style={{ fontSize: 10, color: "#6b7280" }}>{o.tip}: {o.sayi}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutLabel({ cx, cy, value, label }) {
  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" style={{ fontSize: 22, fontWeight: 700, fill: "#1a1a2e" }}>
        %{value}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" style={{ fontSize: 11, fill: "#9ca3af" }}>
        {label}
      </text>
    </g>
  );
}

const DURUM_MAP = {
  beklemede:   { renk: C.warning,  bg: "#fffbeb", label: "Beklemede" },
  onaylandi:   { renk: C.primary,  bg: "#f0fdf4", label: "Onaylandı" },
  tamamlandi:  { renk: C.info,     bg: "#eff6ff", label: "Tamamlandı" },
  iptal:       { renk: C.danger,   bg: "#fef2f2", label: "İptal" },
  reddedildi:  { renk: "#9ca3af",  bg: "#f9fafb", label: "Reddedildi" },
};

function DurumBadge({ durum }) {
  const d = DURUM_MAP[durum] || { renk: C.gray, bg: "#f9fafb", label: durum };
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, color: d.renk,
      background: d.bg, borderRadius: 6, padding: "2px 8px",
      border: `1px solid ${d.renk}22`,
    }}>
      {d.label}
    </span>
  );
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────

export default function GenelSekreterDashboard() {
  const [donem, setDonem] = useState("aylik");

  const [randevuStats,   setRandevuStats]   = useState(null);
  const [bugunTakvim,    setBugunTakvim]    = useState([]);
  const [onTalepBekl,    setOnTalepBekl]    = useState(null);
  const [randevuYukleme, setRandevuYukleme] = useState(true);
  const [randevuHata,    setRandevuHata]    = useState(null);

  const [personel,  setPersonel]  = useState(PERSONEL_FALLBACK);
  const [sosyal,    setSosyal]    = useState(null);
  const [tasinmaz,  setTasinmaz]  = useState(null);

  // Widget görünürlük ayarları (localStorage)
  const [widgetAyarlari, setWidgetAyarlari] = useState(getWidgetAyarlari);

  useEffect(() => {
    localStorage.setItem('gs_widget_ayarlari', JSON.stringify(widgetAyarlari));
  }, [widgetAyarlari]);

  // localStorage değişikliklerini (diğer sekme/sayfa) izle
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'gs_widget_ayarlari' && e.newValue) {
        try { setWidgetAyarlari(JSON.parse(e.newValue)); } catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const widgetGoster = (id) => widgetAyarlari[id] !== false;

  // Randevu verileri
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [istat, takvim, onT] = await Promise.all([
          randevuFetch("/istatistikler"),
          randevuFetch(`/takvim/${todayISO}`),
          randevuFetch("/on-talepler?status=beklemede"),
        ]);
        if (!mounted) return;
        setRandevuStats(istat.randevular);
        setBugunTakvim(takvim.veri || []);
        setOnTalepBekl(onT.toplam ?? onT.veri?.length ?? 0);
      } catch (e) {
        if (mounted) setRandevuHata(e.message);
      } finally {
        if (mounted) setRandevuYukleme(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // FlexCity personel + sosyal + taşınmaz
  useEffect(() => {
    flexcityFetch("/istatistik")
      .then(d => {
        if (d?.personel?.toplam) {
          setPersonel({
            toplam:      d.personel.toplam,
            erkek:       d.personel.erkek      || 0,
            kadin:       d.personel.kadin       || 0,
            daireSayisi: d.personel.daireSayisi || 0,
          });
        }
      })
      .catch(() => {});

    flexcityFetch("/sosyal")
      .then(d => !d.error && setSosyal(d))
      .catch(() => {});

    flexcityFetch("/tasinmaz")
      .then(d => !d.error && setTasinmaz(d))
      .catch(() => {});
  }, []);

  const harcamaOrani = parseFloat(pct(butce.harcama, butce.odenek));
  const blokeOrani   = parseFloat(pct(butce.bloke,   butce.odenek));

  const donemData = {
    gunluk:   butce.gunluk.map((d)   => ({ name: d.label, Ödeme: d.odeme })),
    haftalik: butce.haftalik.map((d) => ({ name: d.label, Ödeme: d.odeme })),
    aylik:    butce.aylik.map((d)    => ({ name: d.label, Ödeme: d.odeme })),
  };

  const tamamlanmaDonut = [
    { name: "Tamamlandı", value: yatirimOzet.tamamlanan,                              color: C.primary },
    { name: "Devam Eden", value: yatirimOzet.toplamProje - yatirimOzet.tamamlanan,    color: "#e5e7eb" },
  ];

  const today = new Date().toLocaleDateString("tr-TR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const donemBtn = (key, label) => (
    <button key={key} onClick={() => setDonem(key)} style={{
      padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
      border: "none", cursor: "pointer", transition: "all .2s",
      background: donem === key ? C.primary : "#f1f5f9",
      color:      donem === key ? "#fff"    : C.gray,
    }}>
      {label}
    </button>
  );

  const altSatirGorunur = widgetGoster('personel') || widgetGoster('cagri_merkezi') || widgetGoster('esm_talepler');
  const butceProjeGorunur = widgetGoster('butce_durumu') || widgetGoster('proje_tamamlanma');

  return (
    <div style={{ fontFamily: "'Poppins', 'Segoe UI', sans-serif", background: C.bg, minHeight: "100vh" }}>

      {/* ── HEADER ── */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #e5e7eb",
        padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>M</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>Muğla Büyükşehir Belediyesi</div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>Genel Sekreter Paneli</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "right" }}>{today}</div>
      </div>

      {/* ── İÇERİK ── */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 16px 40px" }}>

        {/* KPI ŞERİT */}
        {widgetGoster('ozet_kartlar') && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 18 }}>
            <KPICard icon="📋" title="Toplam Proje / Talep"
              value={yatirimOzet.toplamProje.toLocaleString("tr-TR")}
              sub="13 ilçe · 538 muhtarlık" />
            <KPICard icon="✅" title="Tamamlanma Oranı"
              value={`%${yatirimOzet.tamamlanmaOrani}`}
              sub={`${yatirimOzet.tamamlanan.toLocaleString("tr-TR")} proje tamamlandı`}
              valueColor={C.primaryDark} />
            <KPICard icon="💰" title="Toplam Ödenek"
              value={fmtPara(butce.odenek)}
              sub={`%${harcamaOrani} gerçekleşme`} />
            <KPICard icon="📊" title="Bu Ay Harcama"
              value={fmtPara(butce.buAyHarcama)}
              sub="Mart 2026" valueColor={C.info} />
          </div>
        )}

        {/* BÜTÇE + PROJE */}
        {butceProjeGorunur && (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)", gap: 14, marginBottom: 14 }}>
            {widgetGoster('butce_durumu') && (
              <Card title="💰 Bütçe Durumu">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 16 }}>
                  <div>
                    <BarItem label="Harcama Gerçekleşmesi" value={butce.harcama}  max={butce.odenek} color={C.primary} showTL />
                    <BarItem label="Bloke"                  value={butce.bloke}    max={butce.odenek} color={C.warning} showTL />
                    <BarItem label="Bekleyen Ödemeler"      value={butce.bekleyen} max={butce.odenek} color={C.danger}  showTL />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: C.primaryDark }}>%{harcamaOrani}</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>Ödenek Gerçekleşmesi</div>
                    </div>
                    <div style={{ background: "#fffbeb", borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: "#d97706" }}>%{blokeOrani}</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>Bloke Oranı</div>
                    </div>
                    <div style={{ background: "#fef2f2", borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: C.danger }}>{fmtPara(butce.bekleyen)}</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>Bekleyen Ödeme</div>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                  {donemBtn("gunluk", "Günlük")}
                  {donemBtn("haftalik", "Haftalık")}
                  {donemBtn("aylik", "Aylık")}
                </div>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={donemData[donem]} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: C.gray }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: C.gray }}
                      tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}Mn`}
                      axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => [fmtPara(v), "Ödeme"]} />
                    <Bar dataKey="Ödeme" fill={C.primary} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {widgetGoster('proje_tamamlanma') && (
              <Card title="📋 Proje Tamamlanma">
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={tamamlanmaDonut} cx="50%" cy="50%"
                        innerRadius={64} outerRadius={88} dataKey="value"
                        startAngle={90} endAngle={-270} labelLine={false}>
                        {tamamlanmaDonut.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <DonutLabel cx="50%" cy="50%" value={yatirimOzet.tamamlanmaOrani} label="Tamamlandı" />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ width: "100%", marginTop: 8 }}>
                    {[
                      { label: "✅ Tamamlanan", value: yatirimOzet.tamamlanan, color: C.primaryDark },
                      { label: "🔄 Devam Eden", value: yatirimOzet.toplamProje - yatirimOzet.tamamlanan, color: C.gray },
                      { label: "📍 Toplam",     value: yatirimOzet.toplamProje, color: "#111827" },
                    ].map((r) => (
                      <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                        <span style={{ color: "#6b7280" }}>{r.label}</span>
                        <span style={{ fontWeight: 600, color: r.color }}>{r.value.toLocaleString("tr-TR")}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 10, background: "#f0fdf4", textAlign: "center" }}>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>Toplam Yatırım Bedeli </span>
                      <span style={{ fontWeight: 700, color: C.primaryDark }}>{fmtPara(yatirimOzet.toplamBedel)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* İLÇE DAĞILIMI */}
        {widgetGoster('ilce_dagilim') && (
          <Card title="🏘️ İlçe Bazlı Yatırım Dağılımı (Toplam & Tamamlanan)" style={{ marginBottom: 14 }}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ilceDagilim} layout="vertical" barGap={2} barSize={10}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11, fill: C.gray }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="ilce" width={88}
                  tick={{ fontSize: 12, fill: "#374151" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v, name) => [v.toLocaleString("tr-TR"), name === "toplam" ? "Toplam" : "Tamamlanan"]} />
                <Bar dataKey="toplam"    fill="#e5e7eb" radius={[0, 4, 4, 0]} name="toplam" />
                <Bar dataKey="tamamlanan" fill={C.primary} radius={[0, 4, 4, 0]} name="tamamlanan" />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
              {[["#e5e7eb","Toplam"],[C.primary,"Tamamlanan"]].map(([bg, lbl]) => (
                <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: bg }} />
                  <span style={{ fontSize: 12, color: C.gray }}>{lbl}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* RANDEVULAR */}
        {widgetGoster('randevu') && (
          <Card title="📅 Başkan Randevuları & Ön Talepler" style={{ marginBottom: 14 }}>
            {randevuYukleme && (
              <div style={{ textAlign: "center", padding: "24px 0", color: C.gray, fontSize: 13 }}>Veriler yükleniyor…</div>
            )}
            {randevuHata && (
              <div style={{ background: "#fef2f2", borderRadius: 10, padding: "10px 14px", color: C.danger, fontSize: 12 }}>
                ⚠️ API bağlantı hatası: {randevuHata}
              </div>
            )}
            {!randevuYukleme && !randevuHata && randevuStats && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                    {[
                      { label: "Bugün",    value: randevuStats.bugun,   bg: "#f0fdf4", color: C.primaryDark },
                      { label: "Bu Hafta", value: randevuStats.buHafta, bg: "#eff6ff", color: C.info },
                      { label: "Toplam",   value: randevuStats.toplam,  bg: "#f9fafb", color: "#111827" },
                    ].map((r) => (
                      <div key={r.label} style={{ background: r.bg, borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                        <div style={{ fontWeight: 700, fontSize: 22, color: r.color }}>{r.value}</div>
                        <div style={{ fontSize: 11, color: C.gray }}>{r.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.gray, marginBottom: 8 }}>Durum Dağılımı</div>
                  {Object.entries(randevuStats.durumDagilim || {}).map(([durum, sayi]) => {
                    const d = DURUM_MAP[durum] || { renk: C.gray, label: durum };
                    const max = randevuStats.toplam || 1;
                    return (
                      <div key={durum} style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                          <span style={{ color: "#6b7280" }}>{d.label}</span>
                          <span style={{ fontWeight: 600, color: d.renk }}>{sayi}</span>
                        </div>
                        <div style={{ background: "#f1f5f9", borderRadius: 8, height: 6 }}>
                          <div style={{ width: `${Math.min((sayi / max) * 100, 100)}%`, height: 6, borderRadius: 8, background: d.renk, transition: "width .4s" }} />
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ marginTop: 12, background: "#fffbeb", borderRadius: 12, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "#6b7280" }}>⏳ Ön Talep Bekleyen</span>
                    <span style={{ fontWeight: 700, fontSize: 18, color: "#d97706" }}>{onTalepBekl}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.gray, marginBottom: 10 }}>
                    📆 Bugünün Programı — {new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}
                  </div>
                  {bugunTakvim.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "28px 0", color: C.gray, fontSize: 13, background: "#f9fafb", borderRadius: 12 }}>
                      Bugün randevu bulunmuyor.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 240, overflowY: "auto" }}>
                      {bugunTakvim.map((r) => (
                        <div key={r.id} style={{ background: "#f9fafb", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, borderLeft: `3px solid ${DURUM_MAP[r.durum]?.renk || C.gray}` }}>
                          <div style={{ fontWeight: 700, fontSize: 15, color: C.primaryDark, minWidth: 40, textAlign: "center" }}>{r.saat}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.adSoyad}</div>
                            <div style={{ fontSize: 11, color: C.gray, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.konu || "—"}</div>
                          </div>
                          <DurumBadge durum={r.durum} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ALT SATIR */}
        {altSatirGorunur && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
            {widgetGoster('personel') && (
              <Card title="👥 Personel" badge="FlexCity Canlı">
                <StatRow label="Toplam Personel" value={personel.toplam.toLocaleString("tr-TR")} bg="#f9fafb" />
                <StatRow label="Daire Sayısı"    value={personel.daireSayisi} bg="#f0fdf4" color={C.primaryDark} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                  {[{ l: "👨 Erkek", v: personel.erkek.toLocaleString("tr-TR") }, { l: "👩 Kadın", v: personel.kadin.toLocaleString("tr-TR") }].map((r) => (
                    <div key={r.l} style={{ textAlign: "center", padding: "10px", borderRadius: 12, background: "#f9fafb" }}>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{r.v}</div>
                      <div style={{ fontSize: 11, color: C.gray }}>{r.l}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {widgetGoster('cagri_merkezi') && (
              <Card title="📞 Çağrı Merkezi" badge="Mock Veri">
                <StatRow label="Bugün Gelen"  value={cagri.bugunToplam}   bg="#f9fafb" />
                <StatRow label="Çözülen"      value={cagri.bugunCozulen}  bg="#f0fdf4" color={C.primaryDark} />
                <StatRow label="Bekleyen"     value={cagri.bugunBekleyen} bg="#fef2f2" color={C.danger} />
                <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "12px 16px", textAlign: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: C.primaryDark }}>%{cagri.cozumOrani}</div>
                  <div style={{ fontSize: 11, color: C.gray }}>Bugün Çözüm Oranı</div>
                </div>
                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10, marginTop: 4 }}>
                  <div style={{ fontSize: 11, color: C.gray, marginBottom: 6 }}>Bu Hafta</div>
                  {[
                    { l: "Toplam",   v: cagri.haftaToplam,  c: "#111827" },
                    { l: "Çözülen",  v: cagri.haftaCozulen, c: C.primaryDark },
                    { l: "Bekleyen", v: cagri.haftaToplam - cagri.haftaCozulen, c: C.danger },
                  ].map((r) => (
                    <div key={r.l} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: C.gray }}>{r.l}</span>
                      <span style={{ fontWeight: 600, color: r.c }}>{r.v}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {widgetGoster('esm_talepler') && (
              <Card title="🖥️ Servis Talepleri" badge="Mock Veri">
                <ESMBlock label="💻 Bilgi İşlem"       data={esm.bilgiIslem} />
                <ESMBlock label="🔧 Destek Hizmetleri" data={esm.destekHizmetleri} />
              </Card>
            )}
          </div>
        )}

        {/* ── SOSYAL HİZMETLER & BELEDİYE VARLIKLARI ── */}
        {(sosyal || tasinmaz) && (widgetGoster('sosyal_hizmetler') || widgetGoster('tasinmaz')) && (
          <div style={{ marginTop: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>🤝 Sosyal Hizmetler & Belediye Varlıkları</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#15803d", background: "#dcfce7", borderRadius: 6, padding: "2px 8px" }}>FlexCity Canlı</span>
            </div>

            {/* Sosyal KPI'lar */}
            {sosyal && widgetGoster('sosyal_hizmetler') && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 14 }}>

                {/* Evde Bakım */}
                <div style={{ background: C.card, borderRadius: 16, padding: "18px 20px", border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: C.gray, fontWeight: 500 }}>🏠 Evde Bakım</span>
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>{sosyal.evdeBakim.kayitSayisi.toLocaleString("tr-TR")} kayıt</span>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: "#1a1a2e", lineHeight: 1.1, marginBottom: 4 }}>
                    {sosyal.evdeBakim.toplamKisi.toLocaleString("tr-TR")}
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 10 }}>2016'dan bugüne toplam kişi</div>
                  {(() => {
                    const son3 = sosyal.evdeBakim.yillik.filter(d => d.yil >= 2024).slice(-3);
                    const maxY = Math.max(...son3.map(d => d.toplam), 1);
                    return (
                      <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 44 }}>
                        {son3.map(d => (
                          <div key={d.yil} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                            <div style={{ width: "100%", background: "#43DC80", borderRadius: 3, height: `${Math.max(8, (d.toplam / maxY) * 36)}px`, transition: "height .4s" }} />
                            <span style={{ fontSize: 10, color: "#9ca3af" }}>{d.yil}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Hasta Nakil */}
                <div style={{ background: C.card, borderRadius: 16, padding: "18px 20px", border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: C.gray, fontWeight: 500 }}>🚑 Hasta Nakil</span>
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>{sosyal.hastaNakil.kayitSayisi.toLocaleString("tr-TR")} kayıt</span>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: "#1a1a2e", lineHeight: 1.1, marginBottom: 4 }}>
                    {sosyal.hastaNakil.toplamKisi.toLocaleString("tr-TR")}
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 10 }}>2017'den bugüne toplam kişi</div>
                  {(() => {
                    const son3 = sosyal.hastaNakil.yillik.filter(d => d.yil >= 2024).slice(-3);
                    const maxY = Math.max(...son3.map(d => d.toplam), 1);
                    return (
                      <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 44 }}>
                        {son3.map(d => (
                          <div key={d.yil} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                            <div style={{ width: "100%", background: C.info, borderRadius: 3, height: `${Math.max(8, (d.toplam / maxY) * 36)}px`, transition: "height .4s" }} />
                            <span style={{ fontSize: 10, color: "#9ca3af" }}>{d.yil}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Şehit/Gazi */}
                <KPICard icon="🎖️" title="Şehit / Gazi"
                  value={sosyal.sehitGazi.toplam.toLocaleString("tr-TR")}
                  sub={`${sosyal.sehitGazi.sehitAilesi} şehit ailesi · ${sosyal.sehitGazi.gazi} gazi`} />

                {/* Sosyal Yardım */}
                <KPICard icon="💝" title="Sosyal Yardım Alıcısı"
                  value={sosyal.sosyalYardim.toplamKisi.toLocaleString("tr-TR")}
                  sub={`${sosyal.sosyalYardim.kayitSayisi} mahalle kaydı`} />
              </div>
            )}

            {/* Taşınmaz */}
            {tasinmaz && widgetGoster('tasinmaz') && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                <KPICard icon="🏢" title="Toplam Taşınmaz"
                  value={tasinmaz.toplam.toLocaleString("tr-TR")}
                  sub={`Alan: ${(tasinmaz.toplamAlanM2 / 1_000_000).toFixed(2)} km²`} />
                <KPICard icon="📊" title="Rayiç Değer Toplamı"
                  value={fmtPara(tasinmaz.rayicDegerToplam)}
                  sub="Tapu/kadastro rayiç değeri" valueColor={C.primaryDark} />
                <KPICard icon="🏷️" title="Güncel Değer Toplamı"
                  value={fmtPara(tasinmaz.guncelDegerToplam)}
                  sub="Güncel beyan değeri" />
                <div style={{ background: C.card, borderRadius: 16, padding: "18px 20px", border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                  <div style={{ fontSize: 13, color: C.gray, fontWeight: 500, marginBottom: 12 }}>📍 İlçe Dağılımı</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 160, overflowY: "auto" }}>
                    {tasinmaz.ilceDagilim.slice(0, 8).map(d => {
                      const p = ((d.sayi / tasinmaz.toplam) * 100).toFixed(0);
                      return (
                        <div key={d.ad} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: "#374151", width: 80, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.ad}</span>
                          <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 4, height: 6 }}>
                            <div style={{ width: `${p}%`, height: "100%", background: C.primary, borderRadius: 4 }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", width: 30, textAlign: "right", flexShrink: 0 }}>{d.sayi}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 28, fontSize: 11, color: "#9ca3af" }}>
          Muğla Büyükşehir Belediyesi · Genel Sekreter Paneli v1.0 &nbsp;·&nbsp;
          Son güncelleme: {new Date().toLocaleTimeString("tr-TR")}
        </div>
      </div>
    </div>
  );
}
