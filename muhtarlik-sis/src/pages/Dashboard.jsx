import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { muhtarlikApi, raporApi } from '../lib/muhtarlik_api';
import { loadWidgets } from '../lib/dashboard_widgets';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
  ComposedChart, Line, LabelList,
} from 'recharts';

// ─── Renkler ──────────────────────────────────────────────────────────────────
const C = {
  green:  '#26af68',
  blue:   '#3b82f6',
  red:    '#ef4444',
  amber:  '#f59e0b',
  purple: '#7c3aed',
  slate:  '#7e7e7e',
  text:   '#212529',
};
const BAR_COLORS = ['#26af68','#3b82f6','#f59e0b','#ef4444','#7c3aed','#06b6d4','#ec4899','#84cc16','#f97316','#6366f1'];
const getBarColor = (oran) => oran >= 60 ? '#16a34a' : oran >= 30 ? '#f59e0b' : '#dc2626';

// ─── Kart şablonu ─────────────────────────────────────────────────────────────
const cardStyle = {
  background: '#fff', border: '1px solid #e8ede9',
  borderRadius: 12, padding: '20px 24px',
};

// ─── Stat kartı ───────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, loading }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', border: '1px solid #EEEEEE', borderTop: `4px solid ${color}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: 12, color: C.slate, marginBottom: 8 }}>{label}</div>
        <div style={{ fontSize: 32, fontWeight: 800, color: C.text, lineHeight: 1 }}>
          {loading ? '…' : (value ?? '—')}
        </div>
      </div>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: color + '18', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
        {icon}
      </div>
    </div>
  );
}

// ─── Legend kutusu ────────────────────────────────────────────────────────────
function LegendBox({ items }) {
  return (
    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b7a74', marginTop: 8 }}>
      {items.map(([color, label]) => (
        <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 12, height: 8, background: color, borderRadius: 2, display: 'inline-block' }} />
          {label}
        </span>
      ))}
    </div>
  );
}

// ─── Yatay bar chart (custom, recharts'sız) ───────────────────────────────────
function HBar({ data, valueKey = 'toplam', labelKey, color = C.green, title, maxRows = 12 }) {
  const rows   = data.slice(0, maxRows);
  const maxVal = Math.max(...rows.map(r => r[valueKey] || 0), 1);
  return (
    <div style={{ ...cardStyle, height: '100%' }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 18px' }}>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {rows.map((row, i) => {
          const val = row[valueKey] || 0;
          const pct = Math.round((val / maxVal) * 100);
          return (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: '#374151', maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row[labelKey]}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{val.toLocaleString('tr')}</span>
              </div>
              <div style={{ height: 7, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── İlçe dağılım bar ────────────────────────────────────────────────────────
function IlceDagilimChart({ data }) {
  if (!data.length) return null;
  const rows = data.slice(0, 14);
  return (
    <div style={cardStyle}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 20px' }}>İlçe Bazlı Başvuru Dağılımı</h3>
      <ResponsiveContainer width="100%" height={Math.max(200, rows.length * 30)}>
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: C.slate }} allowDecimals={false} />
          <YAxis type="category" dataKey="ilce" width={90} tick={{ fontSize: 11, fill: C.text }} />
          <Tooltip formatter={v => [v.toLocaleString('tr'), 'Başvuru']} cursor={{ fill: '#f8fafc' }} />
          <Bar dataKey="toplam" name="Başvuru" maxBarSize={14} radius={[0, 4, 4, 0]}>
            {rows.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Yatırım grouped bar ──────────────────────────────────────────────────────
function YatirimGroupedBar({ data }) {
  if (!data.length) return null;
  const rows = data.filter(d => d.toplamYatirim > 0).slice(0, 15);
  return (
    <div style={cardStyle}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 20px' }}>İlçe Bazlı Yatırım & Tamamlanma</h3>
      <ResponsiveContainer width="100%" height={Math.max(200, rows.length * 28)}>
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 60, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: C.slate }} allowDecimals={false} />
          <YAxis type="category" dataKey="ilce" width={90} tick={{ fontSize: 11, fill: C.text }} />
          <Tooltip
            formatter={(v, n) => [v.toLocaleString('tr'), n === 'toplamYatirim' ? 'Toplam' : 'Tamamlanan']}
            cursor={{ fill: '#f8fafc' }}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e8ede9' }}
          />
          <Bar dataKey="toplamYatirim" name="toplamYatirim" fill={C.blue}  radius={[0, 4, 4, 0]} maxBarSize={14} />
          <Bar dataKey="tamamlanan"    name="tamamlanan"    fill={C.green} radius={[0, 4, 4, 0]} maxBarSize={14} />
        </BarChart>
      </ResponsiveContainer>
      <LegendBox items={[[C.blue, 'Toplam'], [C.green, 'Tamamlanan']]} />
    </div>
  );
}

// ─── Konu dağılım ─────────────────────────────────────────────────────────────
function KonuDagilimChart({ data }) {
  if (!data.length) return null;
  const rows = data.slice(0, 15);
  return (
    <div style={cardStyle}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 16px' }}>Top 15 Başvuru Konusu</h3>
      <ResponsiveContainer width="100%" height={Math.max(300, rows.length * 26)}>
        <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 60, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f4f0" />
          <XAxis type="number" tick={{ fontSize: 10, fill: '#9aa8a0' }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="konu" width={160} tick={{ fontSize: 10, fill: '#374740' }} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(v, n) => [v.toLocaleString('tr-TR'), n === 'toplam' ? 'Toplam' : 'Tamamlandı']}
            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e8ede9' }}
          />
          <Bar dataKey="toplam"     fill="#e0f2fe" radius={[0, 4, 4, 0]} barSize={10} />
          <Bar dataKey="tamamlandi" fill="#43DC80" radius={[0, 4, 4, 0]} barSize={10} />
        </BarChart>
      </ResponsiveContainer>
      <LegendBox items={[['#e0f2fe', 'Toplam'], ['#43DC80', 'Tamamlandı']]} />
    </div>
  );
}

// ─── Daire tamamlanma oranı ────────────────────────────────────────────────────
function DaireTamamlanmaChart({ data }) {
  if (!data.length) return null;
  return (
    <div style={cardStyle}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 16px' }}>Daire Başkanlığı Tamamlanma Oranı</h3>
      <ResponsiveContainer width="100%" height={Math.max(300, data.length * 26)}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 60, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f4f0" />
          <XAxis type="number" domain={[0, 100]} tickFormatter={v => `%${v}`}
            tick={{ fontSize: 10, fill: '#9aa8a0' }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="kisa" width={100}
            tick={{ fontSize: 10, fill: '#374740' }} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={v => [`%${v}`, 'Tamamlanma Oranı']}
            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e8ede9' }}
          />
          <Bar dataKey="oran" radius={[0, 4, 4, 0]} barSize={14}>
            {data.map((entry, i) => <Cell key={i} fill={getBarColor(entry.oran)} />)}
            <LabelList dataKey="oran" position="right" formatter={v => `%${v}`}
              style={{ fontSize: 10, fill: '#374740' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#6b7a74', marginTop: 8 }}>
        <span>🟢 ≥%60 iyi</span>
        <span>🟡 %30–60 orta</span>
        <span>🔴 &lt;%30 düşük</span>
      </div>
    </div>
  );
}

// ─── İlçe tamamlanma (ComposedChart) ─────────────────────────────────────────
function IlceTamamlanmaChart({ data }) {
  if (!data.length) return null;
  return (
    <div style={cardStyle}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 16px' }}>İlçe Bazlı Tamamlanma Oranı</h3>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ left: 8, right: 32, top: 4, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f0" vertical={false} />
          <XAxis dataKey="ilce" tick={{ fontSize: 10, fill: '#374740' }}
            angle={-35} textAnchor="end" interval={0} tickLine={false} axisLine={false} />
          <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#9aa8a0' }} tickLine={false} axisLine={false} />
          <YAxis yAxisId="right" orientation="right" domain={[0, 100]}
            tickFormatter={v => `%${v}`} tick={{ fontSize: 10, fill: '#43DC80' }}
            tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(v, n) => [
              n === 'toplam' ? v.toLocaleString('tr-TR') : `%${v}`,
              n === 'toplam' ? 'Toplam Başvuru' : 'Tamamlanma %',
            ]}
            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e8ede9' }}
          />
          <Bar yAxisId="left" dataKey="toplam" fill="#dbeafe" radius={[4, 4, 0, 0]} barSize={28} />
          <Line yAxisId="right" type="monotone" dataKey="oran" stroke="#43DC80"
            strokeWidth={2.5} dot={{ fill: '#43DC80', r: 4 }} activeDot={{ r: 6 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Durum Pie ────────────────────────────────────────────────────────────────
const DURUM_DATA = (ozet) => [
  { name: 'Tamamlandı',      value: ozet?.tamamlandi   || 0, color: '#16a34a' },
  { name: 'Devam Etmekte',   value: ozet?.devamEtmekte || 0, color: '#2563eb' },
  { name: 'Tamamlanmadı',    value: ozet?.tamamlanmadi || 0, color: '#dc2626' },
  { name: 'Beklemede',       value: ozet?.beklemede    || 0, color: '#f59e0b' },
  { name: 'Birim Atanmamış', value: ozet?.atanmamis    || 0, color: '#94a3b8' },
];

const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, name, value, percent, fill }) => {
  const RADIAN = Math.PI / 180;
  const sin = Math.sin(-midAngle * RADIAN);
  const cos = Math.cos(-midAngle * RADIAN);
  const sx = cx + (outerRadius + 8)  * cos, sy = cy + (outerRadius + 8)  * sin;
  const mx = cx + (outerRadius + 26) * cos, my = cy + (outerRadius + 26) * sin;
  const ex = cx + (outerRadius + 32) * cos, ey = cy + (outerRadius + 32) * sin;
  const textAnchor = cos >= 0 ? 'start' : 'end';
  const xOff = cos >= 0 ? 6 : -6;
  return (
    <g>
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={1.5} />
      <circle cx={ex} cy={ey} r={2} fill={fill} />
      <text x={ex + xOff} y={ey} textAnchor={textAnchor} fill={fill} fontSize={11} fontWeight={600}>{name}</text>
      <text x={ex + xOff} y={ey + 13} textAnchor={textAnchor} fill="#94a3b8" fontSize={10}>
        {value.toLocaleString('tr-TR')} (%{(percent * 100).toFixed(1)})
      </text>
    </g>
  );
};

// ─── ANA SAYFA ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();

  const [ozet,             setOzet]             = useState(null);
  const [ilceDagilim,      setIlceDagilim]      = useState([]);
  const [daireDagilim,     setDaireDagilim]     = useState([]);
  const [yatirimOzet,      setYatirimOzet]      = useState([]);
  const [konuData,         setKonuData]         = useState([]);
  const [daireTamamlanma,  setDaireTamamlanma]  = useState([]);
  const [ilceTamamlanma,   setIlceTamamlanma]   = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [widgets,          setWidgets]          = useState(() => loadWidgets());

  // Widget değişikliklerini aynı tab'da takip et (Ayarlar → Dashboard)
  useEffect(() => {
    const onStorage = () => setWidgets(loadWidgets());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    Promise.all([
      raporApi.getOzet(),
      muhtarlikApi.getIlceDagilim(),
      muhtarlikApi.getDaireDagilim(),
      raporApi.getYatirimOzet(),
    ])
      .then(([o, ilce, daire, yatirim]) => {
        setOzet(o);
        setIlceDagilim(ilce);
        setDaireDagilim(daire);
        setYatirimOzet(yatirim);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    raporApi.getKonuDagilim().then(d => setKonuData(d.konuDagilim || [])).catch(() => {});
    raporApi.getDaireTamamlanma().then(d => setDaireTamamlanma(d.daireTamamlanma || [])).catch(() => {});
    raporApi.getIlceTamamlanma().then(d => setIlceTamamlanma(d.ilceTamamlanma || [])).catch(() => {});
  }, []);

  const toplamYatirim = yatirimOzet.reduce((s, r) => s + r.toplamYatirim, 0);
  const tamamlananYat = yatirimOzet.reduce((s, r) => s + r.tamamlanan,    0);
  const toplamMahalle = yatirimOzet.reduce((s, r) => s + (r.toplamMahalle || 0), 0);

  // Widget görünürlük yardımcısı
  const w = (id) => widgets.find(x => x.id === id)?.visible !== false;

  // Stat satırları
  const statRow1 = [
    { id: 'toplam-basvuru',  label: 'Toplam Başvuru',   value: ozet?.toplamBasvuru?.toLocaleString('tr'),                                   icon: '📋', color: C.green   },
    { id: 'tamamlandi',      label: 'Tamamlandı',        value: ozet?.tamamlandi?.toLocaleString('tr'),                                       icon: '✅', color: '#22c55e' },
    { id: 'devam',           label: 'Devam Etmekte',     value: ozet?.devamEtmekte?.toLocaleString('tr'),                                     icon: '🔄', color: C.blue    },
    { id: 'tamamlanmadi',    label: 'Tamamlanmadı',      value: ozet?.tamamlanmadi?.toLocaleString('tr'),                                     icon: '❌', color: C.red     },
    { id: 'ort-sure',        label: 'Ort. Süre (gün)',   value: ozet?.ortSure != null ? `${ozet.ortSure}` : null,                             icon: '⏱️', color: C.purple  },
  ].filter(s => w(s.id));

  const statRow2 = [
    { id: 'toplam-yatirim',     label: 'Toplam Yatırım',     value: toplamYatirim > 0 ? toplamYatirim.toLocaleString('tr') : ozet?.toplamYatirim?.toLocaleString('tr'), icon: '🏗️', color: C.amber   },
    { id: 'tamamlanan-yatirim', label: 'Tamamlanan Yatırım', value: tamamlananYat > 0 ? tamamlananYat.toLocaleString('tr') : null,                                      icon: '🏆', color: '#14b8a6' },
    { id: 'beklemede',          label: 'Beklemede',          value: ozet?.beklemede?.toLocaleString('tr'),                                                              icon: '⏳', color: '#f97316' },
    { id: 'atanmamis',          label: 'Birim Atanmamış',    value: ozet?.atanmamis?.toLocaleString('tr'),                                                             icon: '⚠️', color: '#9ca3af' },
    { id: 'toplam-mahalle',     label: 'Toplam Mahalle',     value: toplamMahalle > 0 ? toplamMahalle.toLocaleString('tr') : null,                                      icon: '🏡', color: '#6366f1' },
  ].filter(s => w(s.id));

  return (
    <div style={{ padding: '32px 40px' }}>
      {/* Başlık */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(38,175,104,0.12)', color: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
          <i className="bi bi-house-door" />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0 }}>Anasayfa</h1>
          <p style={{ fontSize: 12, color: C.slate, margin: 0 }}>Muhtarlık başvuru ve yatırım özeti</p>
        </div>
        {ozet?.sonGuncelleme && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af' }}>
            Son güncelleme: {new Date(ozet.sonGuncelleme).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        )}
      </div>

      {/* Hızlı İşlemler */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/yeni-basvuru')}
          style={{ padding: '10px 24px', borderRadius: 10, fontWeight: 600, fontSize: 14, background: '#43DC80', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 10px rgba(67,220,128,0.35)', transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#2bc96a'}
          onMouseLeave={e => e.currentTarget.style.background = '#43DC80'}>
          <i className="bi bi-plus-circle" /> Yeni Başvuru
        </button>
        <button onClick={() => navigate('/yeni-yatirim')}
          style={{ padding: '10px 24px', borderRadius: 10, fontWeight: 600, fontSize: 14, background: 'transparent', color: '#43DC80', border: '1.5px solid #43DC80', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <i className="bi bi-graph-up-arrow" /> Yeni Yatırım
        </button>
      </div>

      {/* Stat Satır 1 — Başvuru */}
      {statRow1.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${statRow1.length}, 1fr)`, gap: 16, marginBottom: 16 }}>
          {statRow1.map(s => <StatCard key={s.id} {...s} loading={loading} />)}
        </div>
      )}

      {/* Stat Satır 2 — Yatırım */}
      {statRow2.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${statRow2.length}, 1fr)`, gap: 16, marginBottom: 24 }}>
          {statRow2.map(s => <StatCard key={s.id} {...s} loading={loading} />)}
        </div>
      )}

      {/* Grafik Satır 1 — Durum pie + Yatırım bar */}
      {(w('durum-pie') || w('yatirim-bar')) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 20 }}>
          {w('durum-pie') && (
            <div style={cardStyle}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1a2e23', margin: '0 0 8px' }}>Başvuru Durum Dağılımı</p>
              {ozet && (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={DURUM_DATA(ozet)} cx="50%" cy="50%"
                      innerRadius={52} outerRadius={72} paddingAngle={2}
                      dataKey="value" labelLine={false} label={renderCustomLabel}>
                      {DURUM_DATA(ozet).map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v.toLocaleString('tr-TR'), n]}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e8ede9' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
          {w('yatirim-bar') && (
            <div style={cardStyle}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1a2e23', marginBottom: 16 }}>İlçe Yatırım Tamamlanma</div>
              {yatirimOzet.length > 0 && (
                <>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={yatirimOzet.filter(r => r.toplamYatirim > 0).slice(0, 15)}
                      layout="vertical" margin={{ left: 4, right: 48, top: 4, bottom: 4 }}
                      barGap={2} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f4f0" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#9aa8a0' }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="ilce" width={88} tick={{ fontSize: 11, fill: '#374740' }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e8ede9' }}
                        formatter={(v, n) => [v.toLocaleString('tr-TR'), n === 'toplamYatirim' ? 'Toplam' : 'Tamamlandı']} />
                      <Bar dataKey="toplamYatirim" fill="#e2e8f0" radius={[0, 4, 4, 0]} barSize={8} />
                      <Bar dataKey="tamamlanan"    fill="#43DC80" radius={[0, 4, 4, 0]} barSize={8} />
                    </BarChart>
                  </ResponsiveContainer>
                  <LegendBox items={[['#e2e8f0', 'Toplam'], ['#43DC80', 'Tamamlandı']]} />
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Grafik Satır 2 — İlçe & Daire dağılımı */}
      {(w('ilce-basvuru') || w('daire-basvuru')) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          {w('ilce-basvuru') && <IlceDagilimChart data={ilceDagilim} />}
          {w('daire-basvuru') && <HBar data={daireDagilim} valueKey="toplam" labelKey="daire" color={C.purple} title="Daire Bazlı Başvuru Dağılımı" />}
        </div>
      )}

      {/* Grafik Satır 3 — Konu dağılım */}
      {w('konu-dagilim') && konuData.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <KonuDagilimChart data={konuData} />
        </div>
      )}

      {/* Grafik Satır 4 — Daire tamamlanma */}
      {w('daire-tamamlanma') && daireTamamlanma.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <DaireTamamlanmaChart data={daireTamamlanma} />
        </div>
      )}

      {/* Grafik Satır 5 — İlçe tamamlanma */}
      {w('ilce-tamamlanma') && ilceTamamlanma.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <IlceTamamlanmaChart data={ilceTamamlanma} />
        </div>
      )}

      {/* Grafik Satır 6 — Yatırım grouped bar */}
      {yatirimOzet.length > 0 && (
        <YatirimGroupedBar data={yatirimOzet} />
      )}
    </div>
  );
}
