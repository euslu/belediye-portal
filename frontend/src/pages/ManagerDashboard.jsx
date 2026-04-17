import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || '';
const H = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

// ─── Renk paleti ─────────────────────────────────────────────────────────────
const C = {
  blue:   '#43DC80',
  green:  '#26af68',
  amber:  '#FFA500',
  red:    '#f82649',
  purple: '#7B2FBE',
  slate:  '#7e7e7e',
  bg:     '#f9f9f9',
  text:   '#212529',
};

const STATUS_META = {
  OPEN:             { label: 'Açık',          color: '#6366f1' },
  PENDING_APPROVAL: { label: 'Onay Bekliyor', color: '#f59e0b' },
  ASSIGNED:         { label: 'Atandı',        color: '#8b5cf6' },
  IN_PROGRESS:      { label: 'İşlemde',       color: '#f97316' },
  RESOLVED:         { label: 'Çözüldü',       color: '#10b981' },
  CLOSED:           { label: 'Kapalı',        color: '#94a3b8' },
  REJECTED:         { label: 'Reddedildi',    color: '#ef4444' },
};

const DEVICE_ICONS = {
  BILGISAYAR: '🖥️', DIZUSTU: '💻', IPAD_TABLET: '📱',
  IP_TELEFON: '☎️', YAZICI: '🖨️', MONITOR: '🖥️',
  SWITCH: '🔌', ACCESS_POINT: '📡', SUNUCU: '🗄️', UPS: '🔋', DIGER: '📦',
};

// ─── Canlı saat ───────────────────────────────────────────────────────────────
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-right">
      <p className="text-2xl font-bold tabular-nums" style={{ color: C.text }}>
        {now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
      <p className="text-xs mt-0.5" style={{ color: C.slate }}>
        {now.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
    </div>
  );
}

// ─── Özet kart ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, borderColor, change, pulse, suffix = '' }) {
  const isUp  = change > 0;
  const isNeg = change < 0;
  const hasTrend = change !== null && change !== undefined;
  const invertGood = label.includes('İhlal') || label.includes('SLA');
  const trendGood  = invertGood ? isNeg : isUp;

  return (
    <div style={{
      background: 'white', borderRadius: 12,
      padding: '28px 24px',
      border: '1px solid #EEEEEE',
      borderTop: `4px solid ${borderColor}`,
      position: 'relative', overflow: 'hidden',
    }}>
      {pulse && (value > 0) && (
        <span style={{ position: 'absolute', top: 10, right: 10, width: 10, height: 10, borderRadius: '50%', background: C.red, display: 'inline-block' }} />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 13, color: C.slate, marginBottom: 10 }}>{label}</div>
          <div style={{ fontSize: 42, fontWeight: 800, color: C.text, lineHeight: 1.1 }}>
            {value ?? '—'}{suffix && <span style={{ fontSize: 18, fontWeight: 600, color: C.slate, marginLeft: 4 }}>{suffix}</span>}
          </div>
          {hasTrend && (
            <div style={{ fontSize: 12, marginTop: 6, color: trendGood ? C.green : C.red, fontWeight: 500 }}>
              {isUp ? '↑' : '↓'} {Math.abs(change)}% geçen dönem
            </div>
          )}
        </div>
        <div style={{
          width: 64, height: 64, background: borderColor + '20',
          borderRadius: 12, display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: borderColor, fontSize: 28, flexShrink: 0,
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ─── Onay satırı ──────────────────────────────────────────────────────────────
function ApprovalRow({ ticket, onDone }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason]       = useState('');
  const [busy, setBusy]           = useState(false);

  async function act(type) {
    setBusy(true);
    try {
      const url = `${API}/api/tickets/${ticket.id}/${type}`;
      const body = type === 'reject' ? JSON.stringify({ reason }) : undefined;
      const r = await fetch(url, {
        method: 'POST',
        headers: { ...H(), 'Content-Type': 'application/json' },
        body,
      });
      if (!r.ok) throw new Error((await r.json()).error);
      onDone(ticket.id);
    } catch (e) { alert(e.message); }
    finally { setBusy(false); }
  }

  const PRIORITY_COLOR = { CRITICAL: '#dc2626', HIGH: '#d97706', MEDIUM: '#6366f1', LOW: '#94a3b8' };

  return (
    <div className="py-3 border-b last:border-0" style={{ borderColor: '#f1f5f9' }}>
      <div className="flex items-start gap-2 mb-2">
        <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: PRIORITY_COLOR[ticket.priority] || '#94a3b8' }} />
        <div className="flex-1 min-w-0">
          <Link to={`/itsm/${ticket.id}`} className="text-sm font-semibold hover:underline truncate block" style={{ color: C.text }}>
            {ticket.title}
          </Link>
          <p className="text-xs mt-0.5" style={{ color: C.slate }}>
            {ticket.createdBy?.displayName} · {new Date(ticket.createdAt).toLocaleDateString('tr-TR')}
          </p>
        </div>
      </div>

      {rejecting ? (
        <div className="flex gap-1.5 items-center">
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Red sebebi..."
            className="text-xs flex-1 border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-200"
            style={{ borderColor: '#e2e8f0', fontSize: '12px' }} />
          <button onClick={() => act('reject')} disabled={busy || !reason.trim()}
            className="text-xs text-white px-2.5 py-1.5 rounded-lg font-medium transition hover:opacity-90 disabled:opacity-50"
            style={{ background: C.red }}>Gönder</button>
          <button onClick={() => setRejecting(false)} className="text-xs px-2 py-1.5 rounded-lg transition hover:bg-gray-100" style={{ color: C.slate }}>İptal</button>
        </div>
      ) : (
        <div className="flex gap-1.5">
          <button onClick={() => act('approve')} disabled={busy}
            className="flex-1 text-xs font-medium py-1.5 rounded-lg transition hover:opacity-90 disabled:opacity-50"
            style={{ background: '#d1fae5', color: C.green }}>✓ Onayla</button>
          <button onClick={() => setRejecting(true)} disabled={busy}
            className="flex-1 text-xs font-medium py-1.5 rounded-lg transition hover:opacity-90 disabled:opacity-50"
            style={{ background: '#fee2e2', color: C.red }}>✗ Reddet</button>
        </div>
      )}
    </div>
  );
}

// ─── Personel sekme bileşeni ──────────────────────────────────────────────────
function PersonnelCard({ topPerformers = [], slaBreachUsers = [] }) {
  const [tab, setTab] = useState('top');
  const max = topPerformers[0]?.resolved || 1;

  return (
    <div className="bg-white rounded-2xl p-5 flex flex-col" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold" style={{ color: C.text }}>Personel Performansı</h3>
        <div className="flex gap-1.5">
          {[['top','🏆 En Çok Kapatan'],['sla','⚠️ SLA İhlali']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`portal-pill-btn ${tab === k ? 'portal-pill-btn--active' : ''}`}
              style={{ fontSize: 12, minHeight: 36, padding: '6px 14px' }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {tab === 'top' ? (
        <div className="space-y-3 flex-1">
          {topPerformers.length === 0 ? (
            <p className="text-xs text-center py-6" style={{ color: C.slate }}>Veri yok</p>
          ) : topPerformers.map((p, i) => (
            <div key={p.username} className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: i === 0 ? '#fef3c7' : i === 1 ? '#f1f5f9' : '#f8fafc', color: i === 0 ? '#b45309' : C.slate }}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium truncate" style={{ color: C.text }}>{p.displayName}</span>
                  <span className="text-sm font-bold ml-2 shrink-0" style={{ color: C.green }}>{p.resolved}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: '#e2e8f0' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${Math.round(p.resolved / max * 100)}%`, background: i === 0 ? C.amber : C.blue }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3 flex-1">
          {slaBreachUsers.length === 0 ? (
            <p className="text-xs text-center py-6" style={{ color: C.green }}>🎉 SLA ihlali yok!</p>
          ) : slaBreachUsers.map(u => (
            <div key={u.username} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: '#f1f5f9' }}>
              <span className="text-sm font-medium" style={{ color: C.text }}>{u.displayName}</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={u.breachCount >= 5 ? { background: '#fee2e2', color: C.red } : { background: '#fef3c7', color: C.amber }}>
                {u.breachCount} ihlal
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Cihaz kartı ──────────────────────────────────────────────────────────────
function MyDevicesCard({ devices }) {
  const STATUS_STYLE = {
    ACTIVE:      { background: '#d1fae5', color: C.green },
    PASSIVE:     { background: '#f1f5f9', color: C.slate },
    BROKEN:      { background: '#fee2e2', color: C.red },
    TRANSFERRED: { background: '#dbeafe', color: C.blue },
  };
  const STATUS_LABEL = { ACTIVE: 'Aktif', PASSIVE: 'Pasif', BROKEN: 'Arızalı', TRANSFERRED: 'Devredildi' };

  return (
    <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
      <h3 className="text-sm font-bold mb-4" style={{ color: C.text }}>Envanterim</h3>
      {devices.length === 0 ? (
        <p className="text-xs text-center py-6" style={{ color: C.slate }}>Kayıtlı cihaz yok</p>
      ) : (
        <ul className="space-y-2.5">
          {devices.map(d => (
            <li key={d.id} className="flex items-center gap-2.5">
              <span className="text-xl">{DEVICE_ICONS[d.type] || '📦'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{d.name}</p>
                <p className="text-xs truncate" style={{ color: C.slate }}>{d.brand} {d.model}</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
                style={STATUS_STYLE[d.status] || { background: '#f1f5f9', color: C.slate }}>
                {STATUS_LABEL[d.status] || d.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const date = new Date(label);
  return (
    <div className="bg-white rounded-xl p-3 shadow-lg border" style={{ borderColor: '#e2e8f0', fontSize: '12px' }}>
      <p className="font-semibold mb-1" style={{ color: C.text }}>
        {date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
      </p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

// ─── PieChart custom label ────────────────────────────────────────────────────
function PieCenterLabel({ cx, cy, total }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-8" fontSize="26" fontWeight="800" fill={C.text}>{total}</tspan>
      <tspan x={cx} dy="20" fontSize="11" fill={C.slate}>toplam</tspan>
    </text>
  );
}

// ─── Muhtarlık Özet Kartı ─────────────────────────────────────────────────────
function MuhtarlikOzetCard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/muhtarbis/rapor/ozet`, { headers: H() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!data)   return null;

  const items = [
    { label: 'Toplam Başvuru',  value: data.toplamBasvuru?.toLocaleString('tr') || '—', color: '#6366f1' },
    { label: 'Tamamlandı',      value: data.tamamlandi?.toLocaleString('tr')    || '—', color: '#10b981' },
    { label: 'Devam Etmekte',   value: data.devamEtmekte?.toLocaleString('tr')  || '—', color: '#f97316' },
    { label: 'Ort. Süre (gün)', value: data.ortSure != null ? `${data.ortSure}` : '—', color: C.slate },
    { label: 'Toplam Yatırım',  value: data.toplamYatirim?.toLocaleString('tr') || '—', color: '#7B2FBE' },
  ];

  return (
    <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold" style={{ color: C.text }}>
          <span style={{ marginRight: 8 }}>🏡</span>Muhtarlık Başvuruları
        </h3>
        <a href="/muhtarliksis/" target="_blank" rel="noopener noreferrer"
          className="text-xs font-semibold hover:underline" style={{ color: C.blue }}>
          Detay →
        </a>
      </div>
      <div className="grid grid-cols-5 gap-3">
        {items.map(it => (
          <div key={it.label} className="text-center">
            <p className="text-xl font-extrabold" style={{ color: it.color }}>{it.value}</p>
            <p className="text-xs mt-0.5" style={{ color: C.slate }}>{it.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PDKS Devam Takibi Widget ──────────────────────────────────────────────
function PdksOzetCard() {
  const [overview, setOverview] = useState(null);
  const [rawDays, setRawDays]   = useState([]);
  const [period, setPeriod]     = useState('gunluk');
  const [loading, setLoading]   = useState(true);
  const [trendReady, setTrendReady] = useState(false);

  // 1) Overview hızlı yükle
  useEffect(() => {
    fetch(`${API}/api/pdks/overview`, { headers: H() })
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
      .then(d => { if (d) setOverview(d); setLoading(false); });
  }, []);

  // 2) Trend verisini arka planda yükle (90 gün)
  useEffect(() => {
    fetch(`${API}/api/pdks/trend?period=raw`, { headers: H() })
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
      .then(d => {
        if (d?.data) setRawDays(d.data);
        setTrendReady(true);
      });
  }, []);

  // ── Ham veriyi periyoda göre aggregate et ──
  const aggregated = useMemo(() => {
    if (!rawDays.length) return { summary: null, chart: [] };

    // Tarih helper: timezone sorunsuz YYYY-MM-DD
    const pad = (n) => String(n).padStart(2, '0');
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    const daysAgo = (n) => {
      const d = new Date(now);
      d.setDate(d.getDate() - n);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };
    const weekStart = daysAgo(now.getDay() === 0 ? 6 : now.getDay() - 1); // Pazartesi
    const monthStart = todayStr.slice(0, 8) + '01';

    // tarih alanını normalize et (bazen ISO full string gelebilir)
    const days = rawDays.map(d => ({
      ...d,
      tarih: typeof d.tarih === 'string' ? d.tarih.slice(0, 10) : new Date(d.tarih).toISOString().slice(0, 10),
    }));

    let chartData;
    const ayAdlari = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
    const toplamSabit = days[0]?.toplam || overview?.toplamPersonel || 1;

    if (period === 'gunluk') {
      const filtered = days.slice(-14);
      chartData = filtered.map(d => ({
        ...d, label: d.tarih.slice(5).replace('-', '/'),
      }));
      const bugun = filtered.find(d => d.tarih === todayStr);
      const summary = bugun || (overview ? { gelen: overview.gelen, gelmedi: overview.gelmedi, izinli: overview.izinli, toplam: overview.toplamPersonel } : null);
      return { summary, chart: chartData, label: 'Bugün', sublabel: 'Son 14 iş günü' };
    }

    if (period === 'haftalik') {
      const haftaGunleri = days.filter(d => d.tarih >= weekStart && d.tarih <= todayStr);
      const gunSayisi = haftaGunleri.length || 1;
      const sum = haftaGunleri.reduce((a, d) => ({ gelen: a.gelen + (d.gelen||0), gelmedi: a.gelmedi + (d.gelmedi||0), izinli: a.izinli + (d.izinli||0) }), { gelen: 0, gelmedi: 0, izinli: 0 });
      const summary = { gelen: Math.round(sum.gelen / gunSayisi), gelmedi: Math.round(sum.gelmedi / gunSayisi), izinli: Math.round(sum.izinli / gunSayisi), toplam: toplamSabit };

      // Chart: son 8 hafta
      const weeks = new Map();
      for (const d of days) {
        const dt = new Date(d.tarih + 'T12:00:00'); // timezone safe
        const dow = dt.getDay() || 7;
        const mon = new Date(dt); mon.setDate(dt.getDate() - dow + 1);
        const key = `${mon.getFullYear()}-${pad(mon.getMonth() + 1)}-${pad(mon.getDate())}`;
        if (!weeks.has(key)) weeks.set(key, { g: 0, gm: 0, iz: 0, n: 0 });
        const w = weeks.get(key); w.g += (d.gelen||0); w.gm += (d.gelmedi||0); w.iz += (d.izinli||0); w.n++;
      }
      chartData = [...weeks.entries()].sort((a,b) => a[0].localeCompare(b[0])).slice(-8).map(([k, w]) => ({
        tarih: k, label: k.slice(5).replace('-', '/'),
        gelen: Math.round(w.g / w.n), gelmedi: Math.round(w.gm / w.n), izinli: Math.round(w.iz / w.n),
      }));
      return { summary, chart: chartData, label: `Bu Hafta (ort. ${gunSayisi} gün)`, sublabel: 'Son 8 hafta' };
    }

    if (period === 'aylik') {
      const ayGunleri = days.filter(d => d.tarih >= monthStart && d.tarih <= todayStr);
      const gunSayisi = ayGunleri.length || 1;
      const sum = ayGunleri.reduce((a, d) => ({ gelen: a.gelen + (d.gelen||0), gelmedi: a.gelmedi + (d.gelmedi||0), izinli: a.izinli + (d.izinli||0) }), { gelen: 0, gelmedi: 0, izinli: 0 });
      const summary = { gelen: Math.round(sum.gelen / gunSayisi), gelmedi: Math.round(sum.gelmedi / gunSayisi), izinli: Math.round(sum.izinli / gunSayisi), toplam: toplamSabit };

      // Chart: son 3 ay
      const months = new Map();
      for (const d of days) {
        const key = d.tarih.slice(0, 7);
        if (!months.has(key)) months.set(key, { g: 0, gm: 0, iz: 0, n: 0 });
        const m = months.get(key); m.g += (d.gelen||0); m.gm += (d.gelmedi||0); m.iz += (d.izinli||0); m.n++;
      }
      chartData = [...months.entries()].sort((a,b) => a[0].localeCompare(b[0])).slice(-3).map(([k, m]) => ({
        tarih: k, label: ayAdlari[parseInt(k.slice(5)) - 1],
        gelen: Math.round(m.g / m.n), gelmedi: Math.round(m.gm / m.n), izinli: Math.round(m.iz / m.n),
      }));
      return { summary, chart: chartData, label: `Bu Ay (ort. ${gunSayisi} gün)`, sublabel: 'Son 3 ay' };
    }

    return { summary: null, chart: [] };
  }, [rawDays, period, overview]);

  if (loading || !overview) return (
    <div style={{ background: '#fff', border: '1px solid #e8ede9', borderRadius: 14, padding: '40px 24px', marginBottom: 20, textAlign: 'center' }}>
      <div style={{ width: 28, height: 28, border: '3px solid #e2e8f0', borderTop: '3px solid #43DC80', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
    </div>
  );

  // Günlük: overview verisi kullan, diğerleri: aggregate
  const s = (period === 'gunluk' || !aggregated.summary)
    ? { gelen: overview.gelen, gelmedi: overview.gelmedi, izinli: overview.izinli, toplam: overview.toplamPersonel }
    : aggregated.summary;
  const toplam = s.toplam || overview.toplamPersonel || 1;
  const gelenPct = Math.round(((s.gelen || 0) / toplam) * 100);
  const izinliPct = Math.round(((s.izinli || 0) / toplam) * 100);
  const gelmediPct = 100 - gelenPct - izinliPct;
  const chart = aggregated.chart || [];
  const maxVal = Math.max(...chart.map(c => (c.gelen || 0) + (c.gelmedi || 0) + (c.izinli || 0)), 1);

  const periods = [
    { key: 'gunluk', label: 'Günlük' },
    { key: 'haftalik', label: 'Haftalık' },
    { key: 'aylik', label: 'Aylık' },
  ];

  return (
    <div style={{ background: '#fff', border: '1px solid #e8ede9', borderRadius: 14, padding: '20px 24px', marginBottom: 20 }}>
      {/* Başlık + periyot seçici */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <Link to="/pdks" style={{ textDecoration: 'none' }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1a2e23', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>🕐</span> PDKS — Devam Takibi
          </h3>
        </Link>
        <div style={{ display: 'flex', gap: 6 }}>
          {periods.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`portal-pill-btn ${period === p.key ? 'portal-pill-btn--green' : ''}`}
              style={{ fontSize: 11, minHeight: 32, padding: '4px 12px' }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Özet kartlar — 2x2 geniş */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
        {/* Gelen */}
        <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '14px 18px', border: '1px solid #dcfce7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 10, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>Gelen</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#16a34a', lineHeight: 1 }}>{(s.gelen ?? 0).toLocaleString('tr-TR')}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>%{gelenPct}</div>
              <div style={{ fontSize: 10, color: '#4ade80' }}>{toplam.toLocaleString('tr-TR')} kişiden</div>
            </div>
          </div>
          <div style={{ marginTop: 8, height: 4, background: '#dcfce7', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${gelenPct}%`, background: '#16a34a', borderRadius: 2 }} />
          </div>
        </div>
        {/* Gelmeyen */}
        <div style={{ background: '#fef2f2', borderRadius: 12, padding: '14px 18px', border: '1px solid #fecaca' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 10, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>Gelmeyen</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>{(s.gelmedi ?? 0).toLocaleString('tr-TR')}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626' }}>%{gelmediPct}</div>
              <div style={{ fontSize: 10, color: '#f87171' }}>{toplam.toLocaleString('tr-TR')} kişiden</div>
            </div>
          </div>
          <div style={{ marginTop: 8, height: 4, background: '#fecaca', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${gelmediPct}%`, background: '#dc2626', borderRadius: 2 }} />
          </div>
        </div>
        {/* İzinli */}
        <div style={{ background: '#fffbeb', borderRadius: 12, padding: '14px 18px', border: '1px solid #fde68a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 10, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>İzinli</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#d97706', lineHeight: 1 }}>{(s.izinli ?? 0).toLocaleString('tr-TR')}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#d97706' }}>%{izinliPct}</div>
              <div style={{ fontSize: 10, color: '#fbbf24' }}>{toplam.toLocaleString('tr-TR')} kişiden</div>
            </div>
          </div>
          <div style={{ marginTop: 8, height: 4, background: '#fde68a', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${izinliPct}%`, background: '#d97706', borderRadius: 2 }} />
          </div>
        </div>
        {/* Toplam */}
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 18px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>Toplam Personel</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#334155', lineHeight: 1 }}>{toplam.toLocaleString('tr-TR')}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{aggregated.label || 'Bugün'}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                {period !== 'gunluk' ? 'Günlük ortalama' : new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
              </div>
            </div>
          </div>
          {/* Segmented bar — oranları göster */}
          <div style={{ marginTop: 8, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
            <div style={{ height: '100%', width: `${gelenPct}%`, background: '#16a34a' }} />
            <div style={{ height: '100%', width: `${izinliPct}%`, background: '#d97706' }} />
            <div style={{ height: '100%', width: `${gelmediPct}%`, background: '#dc2626' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <span style={{ fontSize: 9, color: '#16a34a', fontWeight: 600 }}>● Gelen %{gelenPct}</span>
            <span style={{ fontSize: 9, color: '#d97706', fontWeight: 600 }}>● İzinli %{izinliPct}</span>
            <span style={{ fontSize: 9, color: '#dc2626', fontWeight: 600 }}>● Gelmedi %{gelmediPct}</span>
          </div>
        </div>
      </div>

      {/* Trend grafiği */}
      {!trendReady && (
        <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 12, color: '#9aa8a0' }}>Trend verisi yükleniyor…</div>
      )}
      {trendReady && chart.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: '#9aa8a0', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span>{aggregated.sublabel || ''}</span>
            <span>
              <span style={{ color: '#16a34a' }}>■</span> Gelen
              {' '}
              <span style={{ color: '#d97706' }}>■</span> İzinli
              {' '}
              <span style={{ color: '#dc2626' }}>■</span> Gelmedi
            </span>
          </div>
          <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 70 }}>
            {chart.map((t, i) => {
              const total = (t.gelen || 0) + (t.gelmedi || 0) + (t.izinli || 0);
              if (total === 0) return null;
              const h = (total / maxVal) * 60;
              const gP = t.gelen / total;
              const iP = t.izinli / total;
              const gmP = t.gelmedi / total;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                  title={`${t.label}\nGelen: ${t.gelen} | Gelmedi: ${t.gelmedi} | İzinli: ${t.izinli}`}>
                  <div style={{ fontSize: 8, color: '#6b7280', fontWeight: 600, marginBottom: 2 }}>{t.gelen}</div>
                  <div style={{ width: '100%', height: h, borderRadius: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: gmP, background: '#fca5a5', minHeight: gmP > 0 ? 1 : 0 }} />
                    <div style={{ flex: iP, background: '#fcd34d', minHeight: iP > 0 ? 1 : 0 }} />
                    <div style={{ flex: gP, background: '#4ade80', minHeight: gP > 0 ? 1 : 0 }} />
                  </div>
                  <span style={{ fontSize: 8, color: '#9aa8a0', marginTop: 3, whiteSpace: 'nowrap' }}>{t.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DAİRE BAŞKANI DASHBOARD ──────────────────────────────────────────────────
function DaireBaskaniDashboard({ user }) {
  const [daireTalepler, setDaireTalepler] = useState([]);
  const [daireOzet, setDaireOzet]         = useState([]);
  const [personelOzet, setPersonelOzet]   = useState(null);
  const [dogumlar, setDogumlar]           = useState([]);
  const [evlenmeler, setEvlenmeler]       = useState([]);
  const [talepleFiltre, setTalepleFiltre] = useState('TUMU');
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    const daire = user.directorate || '';
    const daireParam = daire ? `?daire=${encodeURIComponent(daire)}` : '';
    Promise.all([
      fetch(`${API}/api/dashboard/daire-talepleri`, { headers: H() }).then(r => r.json()).catch(() => ({})),
      fetch(`${API}/api/dashboard/daire-personel-ozet`, { headers: H() }).then(r => r.json()).catch(() => null),
      fetch(`${API}/api/flexcity/personel-dogum${daireParam}`, { headers: H() }).then(r => r.json()).catch(() => ({})),
      fetch(`${API}/api/flexcity/istatistik`, { headers: H() }).then(r => r.json()).catch(() => null),
    ]).then(([talepler, pOzet, dogum, fcStat]) => {
      setDaireTalepler(talepler.talepler || []);
      setDaireOzet(talepler.statusGruplari || []);
      setPersonelOzet(pOzet);
      setDogumlar(dogum.liste || []);
      // Evlenme listesini daire bazlı filtrele
      const evList = fcStat?.evlenmeListesi || [];
      if (daire) {
        const d = daire.toLowerCase();
        setEvlenmeler(evList.filter(e => (e.daire || '').toLowerCase().includes(d)));
      } else {
        setEvlenmeler(evList);
      }
    }).finally(() => setLoading(false));
  }, []);

  const initials = (user.displayName || '').split(' ').map(n => n[0]).join('').substring(0, 2);

  const DURUM_LABEL = {
    OPEN: 'Açık', PENDING_APPROVAL: 'Onay Bekl.', ASSIGNED: 'Atandı',
    IN_PROGRESS: 'İşlemde', RESOLVED: 'Çözüldü', CLOSED: 'Kapatıldı', REJECTED: 'Reddedildi',
  };
  const DURUM_RENK = {
    OPEN: '#f59e0b', PENDING_APPROVAL: '#f97316', ASSIGNED: '#3b82f6',
    IN_PROGRESS: '#43DC80', RESOLVED: '#10b981', CLOSED: '#6b7280', REJECTED: '#ef4444',
  };
  const DURUM_STIL = {
    OPEN:             { bg: '#fef9c3', color: '#a16207' },
    PENDING_APPROVAL: { bg: '#fff7ed', color: '#c2410c' },
    ASSIGNED:         { bg: '#eff6ff', color: '#1d4ed8' },
    IN_PROGRESS:      { bg: '#f0fdf4', color: '#15803d' },
    RESOLVED:         { bg: '#dcfce7', color: '#166534' },
    CLOSED:           { bg: '#f1f5f9', color: '#475569' },
    REJECTED:         { bg: '#fef2f2', color: '#dc2626' },
  };

  // Ticket durumu dağılımı (bar chart data)
  const durumSayilari = daireTalepler.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});
  const barData = Object.entries(durumSayilari).map(([k, v]) => ({
    durum: DURUM_LABEL[k] || k, sayi: v, renk: DURUM_RENK[k] || '#9aa8a0',
  }));
  const maxSayi = Math.max(...barData.map(x => x.sayi), 1);

  const filtrelenmis = daireTalepler.filter(t => talepleFiltre === 'TUMU' || t.status === talepleFiltre);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ width: 40, height: 40, border: '4px solid #e2e8f0', borderTop: '4px solid #43DC80', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Poppins','Segoe UI',sans-serif", padding: '24px 32px 48px', background: '#f8faf9', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* 1. Hoş geldiniz + personel özeti */}
        <div style={{
          background: 'linear-gradient(135deg, #1a2e23 0%, #2d5a3d 100%)',
          borderRadius: 16, padding: '24px 28px', marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', background: '#43DC80',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 700, color: '#1a2e23', flexShrink: 0,
            }}>{initials}</div>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Hoş geldiniz</div>
              <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>{user.displayName}</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>
                {user.title}{user.title ? ' · ' : ''}{(user.directorate || '').replace(' Dairesi Başkanlığı', '')}
                {user.city ? ` · 📍 ${user.city}` : ''}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'Toplam Personel', value: personelOzet?.toplam, ikon: '👥' },
              { label: 'Erkek',           value: personelOzet?.erkek,  ikon: '👔' },
              { label: 'Kadın',           value: personelOzet?.kadin,  ikon: '👩' },
              { label: 'Müdürlük',        value: personelOzet?.mudurlukSayisi, ikon: '🏢' },
            ].map(k => (
              <div key={k.label} style={{
                textAlign: 'center', background: 'rgba(255,255,255,0.1)',
                borderRadius: 10, padding: '10px 16px', minWidth: 80,
              }}>
                <div style={{ fontSize: 18 }}>{k.ikon}</div>
                <div style={{ color: '#43DC80', fontSize: 20, fontWeight: 700 }}>{k.value ?? '—'}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* PDKS Devam Özeti */}
        <PdksOzetCard />

        {/* 2+3. Talep Durumu + Daireye Gelen Talepler — yan yana */}
        <div style={{ display: 'grid', gridTemplateColumns: barData.length > 0 ? '1fr 2fr' : '1fr', gap: 16, marginBottom: 20 }}>

          {/* Talep Durumu Bar Chart */}
          {barData.length > 0 && (
            <div style={{
              background: '#fff', border: '1px solid #e8ede9', borderRadius: 14,
              padding: '20px 24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1a2e23' }}>📊 Talep Durumu</h3>
                <span style={{ fontSize: 11, color: '#9aa8a0' }}>{daireTalepler.length} talep</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 90, padding: '0 8px' }}>
                {barData.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{d.sayi}</span>
                    <div style={{
                      width: '100%', height: (d.sayi / maxSayi) * 70, background: d.renk,
                      borderRadius: '4px 4px 0 0', minHeight: 6,
                    }} title={d.durum} />
                    <span style={{ fontSize: 9, color: '#9aa8a0', textAlign: 'center', lineHeight: 1.2 }}>{d.durum}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daireye Gelen Talepler */}
          <div style={{
            background: '#fff', border: '1px solid #e8ede9', borderRadius: 14,
            padding: '20px 24px',
          }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1a2e23' }}>📋 Daireye Gelen Talepler</h3>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { key:'TUMU', label:'Tümü', active:'portal-pill-btn--green' },
                { key:'PENDING_APPROVAL', label:'Onay Bekl.', active:'portal-pill-btn--amber' },
                { key:'IN_PROGRESS', label:'İşlemde', active:'portal-pill-btn--active' },
                { key:'RESOLVED', label:'Çözüldü', active:'portal-pill-btn--green' },
              ].map(f => (
                <button key={f.key} onClick={() => setTalepleFiltre(f.key)}
                  className={`portal-pill-btn ${talepleFiltre === f.key ? f.active : ''}`}
                  style={{ fontSize: 11, minHeight: 32, padding: '4px 12px' }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtrelenmis.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#9aa8a0', fontSize: 13 }}>
                {daireTalepler.length === 0 ? 'Daireye gelen talep yok' : 'Bu filtrede talep yok'}
              </div>
            ) : filtrelenmis.slice(0, 12).map(t => {
              const stil = DURUM_STIL[t.status] || { bg: '#f8fafc', color: '#6b7280' };
              return (
                <Link key={t.id} to={`/itsm/${t.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', border: '1px solid #f0f4f0', borderRadius: 10, background: '#fafffe',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fafffe'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#9aa8a0', minWidth: 50 }}>#{t.id}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#1a2e23', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.title}
                        </div>
                        <div style={{ fontSize: 11, color: '#9aa8a0', marginTop: 2 }}>
                          {t.createdBy?.displayName} · {new Date(t.createdAt).toLocaleDateString('tr-TR')}
                          {t.group ? ` · ${t.group.name}` : ''}
                        </div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                      background: stil.bg, color: stil.color, whiteSpace: 'nowrap', flexShrink: 0,
                    }}>
                      {DURUM_LABEL[t.status] || t.status}
                    </span>
                  </div>
                </Link>
              );
            })}
            {filtrelenmis.length > 12 && (
              <div style={{ textAlign: 'center', paddingTop: 8 }}>
                <Link to="/itsm" style={{ fontSize: 13, color: '#43DC80', fontWeight: 600, textDecoration: 'none' }}>
                  Tümünü Gör ({filtrelenmis.length} talep) →
                </Link>
              </div>
            )}
          </div>
        </div>
        </div>

        {/* 4. Özel Günler — 2 kolon */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Doğum Günleri */}
          <div style={{ background: '#fff', border: '1px solid #e8ede9', borderRadius: 14, padding: '18px 20px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#1a2e23' }}>
              🎂 Bugün Doğum Günü
              {dogumlar.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 11, background: '#fef9c3', color: '#a16207', padding: '2px 8px', borderRadius: 20 }}>
                  {dogumlar.length} kişi
                </span>
              )}
            </h3>
            {dogumlar.length === 0 ? (
              <div style={{ fontSize: 12, color: '#9aa8a0', textAlign: 'center', padding: '20px 0' }}>
                Bugün doğum günü olan yok
              </div>
            ) : dogumlar.slice(0, 8).map((d, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
                borderBottom: i < Math.min(dogumlar.length, 8) - 1 ? '1px solid #f0f4f0' : 'none',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', background: '#fef9c3',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
                }}>🎂</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1a2e23' }}>
                    {d.ad ? `${d.ad} ${d.soyad || ''}` : d.adSoyad || '—'}
                  </div>
                  <div style={{ fontSize: 11, color: '#9aa8a0' }}>
                    {(d.daire || d.mudurluk || '').replace(' Dairesi Başkanlığı', ' DB')}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Evlilik Yıl Dönümleri */}
          <div style={{ background: '#fff', border: '1px solid #e8ede9', borderRadius: 14, padding: '18px 20px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#1a2e23' }}>
              💍 Evlilik Yıl Dönümü
              {evlenmeler.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 11, background: '#fdf4ff', color: '#7e22ce', padding: '2px 8px', borderRadius: 20 }}>
                  {evlenmeler.length} kişi
                </span>
              )}
            </h3>
            {evlenmeler.length === 0 ? (
              <div style={{ fontSize: 12, color: '#9aa8a0', textAlign: 'center', padding: '20px 0' }}>
                Bugün yıl dönümü olan yok
              </div>
            ) : evlenmeler.slice(0, 8).map((e, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
                borderBottom: i < Math.min(evlenmeler.length, 8) - 1 ? '1px solid #f0f4f0' : 'none',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', background: '#fdf4ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
                }}>💍</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1a2e23' }}>{e.adSoyad || '—'}</div>
                  <div style={{ fontSize: 11, color: '#9aa8a0' }}>
                    {e.yil ? `${e.yil}. yıl` : ''}{e.evlenmeTarihi ? ` · ${e.evlenmeTarihi}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── ANA BILEŞEN ──────────────────────────────────────────────────────────────
export default function ManagerDashboard() {
  const { user } = useAuth();
  const sistemRol = user?.sistemRol || (user?.role === 'admin' ? 'admin' : user?.role === 'manager' ? 'mudur' : 'personel');
  const isDaireBaskani = sistemRol === 'daire_baskani';
  const isMudur = sistemRol === 'mudur';

  const [data, setData]       = useState(null);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [approvals, setApprovals] = useState([]);

  const load = useCallback(async () => {
    if (isDaireBaskani || isMudur) { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const [statsRes, devRes] = await Promise.all([
        fetch(`${API}/api/dashboard/manager-stats?period=month`, { headers: H() }),
        fetch(`${API}/api/dashboard/my-devices`, { headers: H() }),
      ]);
      const stats = await statsRes.json();
      const devs  = await devRes.json();
      if (!statsRes.ok) throw new Error(stats.error);
      setData(stats);
      setApprovals(stats.pendingApprovals || []);
      setDevices(Array.isArray(devs) ? devs : []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [isDaireBaskani, isMudur]);

  useEffect(() => { load(); }, [load]);

  // Daire başkanı: tamamen farklı dashboard
  if (isDaireBaskani) return <DaireBaskaniDashboard user={user} />;

  // Müdür: daire başkanı dashboard'u (kendi müdürlüğü verisi)
  if (isMudur) return <DaireBaskaniDashboard user={user} />;

  if (!['admin', 'manager'].includes(sistemRol)) return null;

  const s = data?.summary;

  // Pie data
  const pieData = data
    ? Object.entries(data.statusDist || {}).map(([status, count]) => ({
        name: STATUS_META[status]?.label || status,
        value: count,
        color: STATUS_META[status]?.color || '#94a3b8',
      }))
    : [];

  return (
    <div className="min-h-full p-6 space-y-5" style={{ background: 'var(--bg)' }}>

      {/* ── Başlık ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: C.text }}>
            Hoş geldiniz, {user.displayName?.split(' ')[0] || user.username} 👋
          </h1>
          <p className="text-sm mt-1 font-medium" style={{ color: C.slate }}>
            {user.directorate || (user.role === 'admin' ? 'Tüm Birimler' : '')}
          </p>
        </div>
        <LiveClock />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-sm" style={{ color: C.red }}>{error}</div>
      ) : !data ? null : (
        <>
          {/* ── Özet Kartlar ───────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Toplam Başvuru', value: s.total           ?? 0, color: C.purple, icon: '📄' },
              { label: 'Bekleyen Onay',  value: s.pendingApproval ?? 0, color: C.amber,  icon: '⏳', pulse: true },
              { label: 'İşlemdeki',      value: s.inProgress      ?? 0, color: C.blue,   icon: '🔄' },
              { label: 'Bugün Çözülen',  value: s.resolvedToday   ?? 0, color: C.green,  icon: '✅' },
              { label: 'SLA İhlali',     value: s.slaBreaches     ?? 0, color: C.red,    icon: '⚠️' },
              { label: 'Aktarılan',      value: s.transferred     ?? 0, color: C.slate,  icon: '↗️' },
            ].map((card, i) => (
              <div key={i} style={{
                background: 'white', borderRadius: 12, padding: '20px 24px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                borderTop: `4px solid ${card.color}`,
                position: 'relative',
              }}>
                {card.pulse && (card.value > 0) && (
                  <span style={{ position: 'absolute', top: 12, right: 12 }} className="flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: C.amber }} />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: C.amber }} />
                  </span>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: C.text, marginBottom: 4 }}>{card.value}</div>
                    <div style={{ fontSize: 13, color: C.slate }}>{card.label}</div>
                  </div>
                  <div style={{
                    width: 46, height: 46, background: card.color + '20',
                    borderRadius: 10, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 20,
                  }}>{card.icon}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Orta bölüm ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">

            {/* Alan grafik — 2/4 */}
            <div className="xl:col-span-2 bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
              <h3 className="text-sm font-bold mb-4" style={{ color: C.text }}>Son 30 Gün Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.daily} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="gradOpen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.blue}  stopOpacity={0.2} />
                      <stop offset="95%" stopColor={C.blue}  stopOpacity={0}   />
                    </linearGradient>
                    <linearGradient id="gradClose" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.green} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={C.green} stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.slate }}
                    tickFormatter={d => { const dt = new Date(d); return `${dt.getDate()}/${dt.getMonth()+1}`; }} />
                  <YAxis tick={{ fontSize: 10, fill: C.slate }} allowDecimals={false} />
                  <Tooltip content={<TrendTooltip />} />
                  <Area type="monotone" dataKey="opened" name="Açılan" stroke={C.blue}  strokeWidth={2} fill="url(#gradOpen)"  dot={false} />
                  <Area type="monotone" dataKey="closed" name="Kapanan" stroke={C.green} strokeWidth={2} fill="url(#gradClose)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-3 justify-center">
                {[['Açılan', C.blue], ['Kapanan', C.green]].map(([l, c]) => (
                  <div key={l} className="flex items-center gap-1.5 text-xs" style={{ color: C.slate }}>
                    <span className="w-3 h-0.5 rounded-full" style={{ background: c }} />
                    {l}
                  </div>
                ))}
              </div>
            </div>

            {/* Donut — 1/4 */}
            <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
              <h3 className="text-sm font-bold mb-3" style={{ color: C.text }}>Durum Dağılımı</h3>
              <div className="relative">
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={72} dataKey="value" paddingAngle={2}>
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-2xl font-extrabold" style={{ color: C.text }}>{s.total}</p>
                    <p className="text-xs" style={{ color: C.slate }}>toplam</p>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5 mt-2">
                {pieData.map(e => (
                  <div key={e.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: e.color }} />
                    <span className="flex-1 truncate" style={{ color: C.slate }}>{e.name}</span>
                    <span className="font-bold" style={{ color: C.text }}>{e.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bekleyen onaylar — 1/4 */}
            <div className="bg-white rounded-2xl p-5 flex flex-col" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold" style={{ color: C.text }}>
                  Bekleyen Onaylar
                  {approvals.length > 0 && (
                    <span className="ml-2 text-xs font-bold text-white px-1.5 py-0.5 rounded-full" style={{ background: C.amber }}>
                      {approvals.length}
                    </span>
                  )}
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto" style={{ maxHeight: 240 }}>
                {approvals.length === 0 ? (
                  <p className="text-xs text-center py-8" style={{ color: C.slate }}>Bekleyen onay yok 🎉</p>
                ) : approvals.map(t => (
                  <ApprovalRow key={t.id} ticket={t} onDone={id => setApprovals(p => p.filter(x => x.id !== id))} />
                ))}
              </div>
              <Link to="/pending-approvals" className="text-xs font-semibold mt-3 pt-3 border-t text-center hover:underline" style={{ color: C.blue, borderColor: '#f1f5f9' }}>
                Tümünü Gör →
              </Link>
            </div>
          </div>

          {/* ── PDKS Özet ──────────────────────────────────────────────────── */}
          <PdksOzetCard />

          {/* ── Muhtarlık Özet ─────────────────────────────────────────────── */}
          <MuhtarlikOzetCard />

          {/* ── Alt bölüm ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

            {/* Personel performansı */}
            <PersonnelCard topPerformers={data.topPerformers} slaBreachUsers={data.slaBreachUsers} />

            {/* Sağ kolon: Envanter + Konu Dağılımı */}
            <div className="space-y-4">
              <MyDevicesCard devices={devices} />

              {/* Konu dağılımı horizontal bar */}
              <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
                <h3 className="text-sm font-bold mb-4" style={{ color: C.text }}>En Çok Gelen Konular</h3>
                {data.topSubjects.length === 0 ? (
                  <p className="text-xs text-center py-4" style={{ color: C.slate }}>Veri yok</p>
                ) : (
                  <ResponsiveContainer width="100%" height={data.topSubjects.length * 36}>
                    <BarChart data={data.topSubjects} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
                      <XAxis type="number" tick={{ fontSize: 10, fill: C.slate }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: C.text }} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(v) => [v, 'Başvuru']} />
                      <Bar dataKey="count" name="Başvuru" fill={C.blue} radius={[0, 6, 6, 0]} maxBarSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
