import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import UserDrawer from '../components/UserDrawer';
import muglaLogo from '../assets/mugla_logo.png';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, LabelList,
} from 'recharts';

const API = import.meta.env.VITE_API_URL || '';

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}


const USR_TYPE_COLORS = {
  BILGISAYAR: 'bg-blue-100 text-blue-700',
  DIZUSTU:    'bg-indigo-100 text-indigo-700',
  IP_TELEFON: 'bg-green-100 text-green-700',
  TABLET:     'bg-purple-100 text-purple-700',
  MONITOR:    'bg-amber-100 text-amber-700',
  DIGER:      'bg-gray-100 text-gray-600',
};

// ─── Cihaz Modal ───────────────────────────────────────────────────────────────
function DeviceModal({ user, onClose }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/devices?username=${encodeURIComponent(user.username)}`, { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : [])
      .then(setDevices)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user.username]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-800">{user.displayName}</h2>
            <p className="text-xs text-gray-400">{user.username}{user.department ? ` · ${user.department}` : ''}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-gray-400">Yükleniyor...</div>
        ) : devices.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">Bu kullanıcıya cihaz atanmamış</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left pb-2 font-medium">Cihaz</th>
                <th className="text-left pb-2 font-medium">Tip</th>
                <th className="text-left pb-2 font-medium">Seri No</th>
                <th className="text-left pb-2 font-medium">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {devices.map((d) => (
                <tr key={d.id}>
                  <td className="py-2 font-medium text-gray-800">{d.deviceName}</td>
                  <td className="py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${USR_TYPE_COLORS[d.deviceType] || USR_TYPE_COLORS.DIGER}`}>
                      {d.deviceType}
                    </span>
                  </td>
                  <td className="py-2 text-gray-500">{d.serialNumber || '—'}</td>
                  <td className="py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                      ${d.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {d.active ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}




// ─── Doğum günü tebrik kartı önizleme ───────────────────────────────────────
function BirthdayCardPreview({ user }) {
  const birthYear = user.birthday?.split('.')?.[2];
  const age = birthYear ? new Date().getFullYear() - parseInt(birthYear) : null;
  const today = new Date();
  const dateStr = today.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', background: 'white', border: '1px solid #e2e8f0', position: 'relative', fontFamily: 'Inter, Arial, sans-serif' }}>
      {/* Köşe süslemeleri */}
      <div style={{ position: 'absolute', top: 12, left: 12, width: 24, height: 24, borderTop: '2px solid #991b1b', borderLeft: '2px solid #991b1b' }} />
      <div style={{ position: 'absolute', top: 12, right: 12, width: 24, height: 24, borderTop: '2px solid #991b1b', borderRight: '2px solid #991b1b' }} />
      <div style={{ position: 'absolute', bottom: 12, left: 12, width: 24, height: 24, borderBottom: '2px solid #991b1b', borderLeft: '2px solid #991b1b' }} />
      <div style={{ position: 'absolute', bottom: 12, right: 12, width: 24, height: 24, borderBottom: '2px solid #991b1b', borderRight: '2px solid #991b1b' }} />

      <div style={{ padding: '48px 56px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img src={muglaLogo} alt="MBB"
            style={{ height: '56px', marginBottom: '10px' }} />
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em', color: '#1e40af', textTransform: 'uppercase' }}>
            MUĞLA BÜYÜKŞEHİR BELEDİYESİ
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>T.C. Muğla</div>
        </div>

        {/* Kırmızı ayraç */}
        <div style={{ width: 40, height: 2, background: '#991b1b', margin: '0 auto 28px' }} />

        {/* Pasta */}
        <div style={{ textAlign: 'center', fontSize: '40px', marginBottom: '14px' }}>🎂</div>

        {/* Başlık */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a', fontFamily: 'Georgia, serif' }}>
            Doğum Günü Tebrik Mektubu
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#991b1b', fontStyle: 'italic' }}>Nice Mutlu Senelere</p>
        </div>

        <div style={{ width: 30, height: 1, background: '#e2e8f0', margin: '18px auto' }} />

        {/* İsim */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.2em', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>SAYIN</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', fontFamily: 'Georgia, serif', letterSpacing: '0.05em' }}>
            {user.displayName}
          </div>
          {age && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{age}. Yaş</div>}
        </div>

        {/* Metin */}
        <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.8, textAlign: 'center', marginBottom: '18px' }}>
          <p style={{ margin: '0 0 10px' }}>
            Doğum gününüzü en içten dileklerimizle kutlar, sağlık, huzur ve başarı dolu nice yıllar dileriz.
          </p>
          <p style={{ margin: 0 }}>
            <strong style={{ color: '#1e40af' }}>Muğla Büyükşehir Belediyesi</strong> ailesinin değerli bir üyesi
            olarak gösterdiğiniz özveri ve katkılarınız için teşekkür eder, birlikte geçireceğimiz daha
            nice güzel yıllara sabırsızlıkla bakıyoruz.
          </p>
        </div>

        {/* Alıntı */}
        <div style={{ background: '#fef2f2', borderLeft: '3px solid #991b1b', borderRadius: '0 4px 4px 0', padding: '14px 18px', margin: '20px 0', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#7f1d1d', fontStyle: 'italic', lineHeight: 1.8 }}>
            "Hayatınızın her yeni yılı,<br/>umutlarınızın gerçekleştiği,<br/>sevdiklerinizle mutlu olduğunuz<br/>güzel günlerle dolsun."
          </p>
        </div>

        {/* İmza */}
        <div style={{ marginTop: '28px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', fontFamily: 'Georgia, serif' }}>Ahmet ARAS</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Belediye Başkanı</div>
        </div>

        {/* Tarih */}
        <div style={{ textAlign: 'right', marginTop: '14px', fontSize: '12px', color: '#94a3b8' }}>{dateStr}</div>


      </div>
    </div>
  );
}

// Kart bileşeni
function Card({ title, children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl p-5 border border-slate-100 ${className}`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)' }}>
      {title && (
        <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

// Donut pie orta toplam
function DonutCenter({ cx, cy, total }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-6" fontSize="22" fontWeight="700" fill="#1e293b">{total?.toLocaleString('tr-TR')}</tspan>
      <tspan x={cx} dy="18" fontSize="11" fill="#94a3b8">kişi</tspan>
    </text>
  );
}

// Custom tooltip
function ChartTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-lg px-3 py-2 text-xs shadow-lg">
      <span className="font-semibold text-slate-700">{payload[0].name}</span>
      <span className="ml-2 text-slate-500">{Number(payload[0].value).toLocaleString('tr-TR')}</span>
    </div>
  );
}

// Avatar initials
function Avatar({ name, size = 32, bg = '#1e40af' }) {
  const initials = name?.split(' ').slice(0, 2).map(w => w[0]).join('') || '?';
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: size * 0.35, fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

// FC TURU → okunabilir ad
const TURU_LABEL = {
  MEMUR:         'Memur',
  ISCI:          'İşçi',
  HIZMET_ALIMI:  'Hizmet Alımı',
  DIS_KULLANICI: 'Dış Kullanıcı',
  DIGER:         'Diğer',
};

export default function Personel() {
  const { user: currentUser } = useAuth();
  const [deviceModal, setDeviceModal] = useState(null);
  const [drawerUser, setDrawerUser]   = useState(null);
  const [demo, setDemo]               = useState(null);
  const [flexData, setFlexData]       = useState(null);
  const [previewUser, setPreviewUser] = useState(null);
  const [dairePage, setDairePage]     = useState(0);
  const [dogumPage, setDogumPage]     = useState(0);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) return;
    fetch(`${API}/api/users/demographics`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setDemo(d))
      .catch(() => {});
    fetch(`${API}/api/flexcity/istatistik`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => d && !d.error && setFlexData(d))
      .catch(() => {});
  }, [isAdmin]);

  return (
    <div className="p-8">
      {/* Demografik dashboard (admin only) */}
      {isAdmin && demo && (
        <div className="mb-8">
          {/* Satır 1: Cinsiyet + Kadro + Daire (row-span-2) | Satır 2: Yaş + Sendika */}
          <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: '1fr 1fr 2fr', gridTemplateRows: 'auto auto' }}>

            {/* Cinsiyet Dağılımı — FC öncelikli */}
            <Card title="Cinsiyet Dağılımı">
              {(() => {
                const colors = { Erkek: '#1e40af', Kadın: '#ec4899', Belirtilmemiş: '#cbd5e1' };
                const fcP = flexData?.personel;
                const genderData = fcP
                  ? [{ name: 'Erkek', value: fcP.erkek }, { name: 'Kadın', value: fcP.kadin }]
                  : demo.gender;
                const gTotal = genderData.reduce((s, r) => s + r.value, 0);
                return (
                  <>
                    {fcP && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                        <span style={{ fontSize: 10, background: '#dcfce7', color: '#15803d', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>FlexCity</span>
                      </div>
                    )}
                    <div className="relative">
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={genderData} dataKey="value" nameKey="name"
                            cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2}>
                            {genderData.map((r) => <Cell key={r.name} fill={colors[r.name] || '#94a3b8'} />)}
                          </Pie>
                          <Tooltip content={<ChartTip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                          <p className="text-xl font-bold text-slate-800">{gTotal.toLocaleString('tr-TR')}</p>
                          <p style={{ fontSize: 10, color: '#94a3b8' }}>kişi</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 mt-2">
                      {genderData.map(r => (
                        <div key={r.name} className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colors[r.name] || '#94a3b8' }} />
                          <span className="text-xs text-slate-600 flex-1">{r.name}</span>
                          <span className="text-xs font-semibold text-slate-800">{r.value.toLocaleString('tr-TR')}</span>
                          <span className="text-xs text-slate-400">%{((r.value / gTotal) * 100).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </Card>

            {/* Kadro Türü — FC öncelikli */}
            <Card title="Kadro Türü">
              {(() => {
                const kadroColors = { Memur: '#0ea5e9', 'Hizmet Alımı': '#f59e0b', İşçi: '#10b981', 'Dış Kullanıcı': '#8b5cf6', Diğer: '#94a3b8' };
                const fcP = flexData?.personel;
                let data;
                if (fcP?.turler?.length) {
                  data = fcP.turler.map(r => ({ name: TURU_LABEL[r.ad] || r.ad, value: r.sayi }));
                } else {
                  const main = demo.employeeType.filter(r => ['Memur','Hizmet Alımı','İşçi'].includes(r.name));
                  const otherVal = demo.employeeType.filter(r => !['Memur','Hizmet Alımı','İşçi'].includes(r.name)).reduce((s, r) => s + r.value, 0);
                  data = otherVal > 0 ? [...main, { name: 'Diğer', value: otherVal }] : main;
                }
                const eTotal = data.reduce((s, r) => s + r.value, 0);
                return (
                  <>
                    {fcP && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                        <span style={{ fontSize: 10, background: '#dcfce7', color: '#15803d', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>FlexCity</span>
                      </div>
                    )}
                    <div className="relative">
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={data} dataKey="value" nameKey="name"
                            cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2}>
                            {data.map((r) => <Cell key={r.name} fill={kadroColors[r.name] || '#94a3b8'} />)}
                          </Pie>
                          <Tooltip content={<ChartTip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                          <p className="text-xl font-bold text-slate-800">{eTotal.toLocaleString('tr-TR')}</p>
                          <p style={{ fontSize: 10, color: '#94a3b8' }}>kişi</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 mt-2">
                      {data.map(r => (
                        <div key={r.name} className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: kadroColors[r.name] || '#94a3b8' }} />
                          <span className="text-xs text-slate-600 flex-1">{r.name}</span>
                          <span className="text-xs font-semibold text-slate-800">{r.value.toLocaleString('tr-TR')}</span>
                          <span className="text-xs text-slate-400">%{((r.value / eTotal) * 100).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </Card>

            {/* Daire Dağılımı — FC öncelikli (toplam), AD fallback (erkek/kadın) */}
            <Card title="Daire Dağılımı" className="row-span-2">
              {(() => {
                const fcDaire = flexData?.personel?.dairePersonelTum;
                if (fcDaire?.length) {
                  const PAGE_SIZE = 16;
                  const totalPages = Math.ceil(fcDaire.length / PAGE_SIZE);
                  const page = Math.min(dairePage, totalPages - 1);
                  const slice = fcDaire.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
                  const maxVal = fcDaire[0]?.sayi || 1;
                  return (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: '#64748b' }}>
                          {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, fcDaire.length)} / {fcDaire.length} birim
                        </span>
                        <span style={{ fontSize: 10, background: '#dcfce7', color: '#15803d', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>FlexCity</span>
                      </div>
                      <div>
                        {slice.map(dir => (
                          <div key={dir.ad} style={{ marginBottom: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                              <span title={dir.ad} style={{ fontSize: '12px', color: '#0f172a', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '75%' }}>
                                {dir.ad}
                              </span>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e40af', flexShrink: 0 }}>{dir.sayi}</span>
                            </div>
                            <div style={{ background: '#f1f5f9', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                              <div style={{ width: `${Math.max(3, (dir.sayi / maxVal) * 100)}%`, height: '100%', background: '#1e40af', transition: 'width 0.6s ease' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                          <button
                            onClick={() => setDairePage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            style={{ padding: '3px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #e2e8f0', background: page === 0 ? '#f8fafc' : '#fff', color: page === 0 ? '#cbd5e1' : '#374151', cursor: page === 0 ? 'default' : 'pointer' }}
                          >‹</button>
                          {Array.from({ length: totalPages }, (_, i) => (
                            <button key={i}
                              onClick={() => setDairePage(i)}
                              style={{ padding: '3px 9px', fontSize: 12, borderRadius: 6, border: '1px solid', borderColor: i === page ? '#1e40af' : '#e2e8f0', background: i === page ? '#1e40af' : '#fff', color: i === page ? '#fff' : '#374151', fontWeight: i === page ? 700 : 400, cursor: 'pointer' }}
                            >{i + 1}</button>
                          ))}
                          <button
                            onClick={() => setDairePage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page === totalPages - 1}
                            style={{ padding: '3px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #e2e8f0', background: page === totalPages - 1 ? '#f8fafc' : '#fff', color: page === totalPages - 1 ? '#cbd5e1' : '#374151', cursor: page === totalPages - 1 ? 'default' : 'pointer' }}
                          >›</button>
                        </div>
                      )}
                    </>
                  );
                }
                // AD fallback
                const maxTotal = Math.max(...demo.byDirectorate.map(d => d.total));
                return (
                  <>
                    <div style={{ overflowY: 'auto', maxHeight: '480px', paddingRight: '4px' }}>
                      {demo.byDirectorate.map(dir => {
                        const erkekPct = (dir.erkek / maxTotal) * 100;
                        const kadinPct = (dir.kadin / maxTotal) * 100;
                        return (
                          <div key={dir.name} style={{ marginBottom: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                              <span title={dir.fullName} style={{ fontSize: '12px', color: '#0f172a', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '75%' }}>
                                {dir.name}
                              </span>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e40af', flexShrink: 0 }}>{dir.total}</span>
                            </div>
                            <div style={{ background: '#f1f5f9', borderRadius: '4px', height: '6px', overflow: 'hidden', display: 'flex' }}>
                              <div style={{ width: `${erkekPct}%`, height: '100%', background: '#1e40af', transition: 'width 0.6s ease' }} />
                              <div style={{ width: `${kadinPct}%`, height: '100%', background: '#a855f7', transition: 'width 0.6s ease' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '11px', color: '#64748b' }}>
                      <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#1e40af', borderRadius: 2, marginRight: 4 }} />Erkek</span>
                      <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#a855f7', borderRadius: 2, marginRight: 4 }} />Kadın</span>
                    </div>
                  </>
                );
              })()}
            </Card>

            {/* Yaş Dağılımı */}
            <Card title="Yaş Dağılımı">
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={demo.ageGroups} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={42}>
                    {demo.ageGroups.map((_, i) => (
                      <Cell key={i} fill={`hsl(${215 + i * 8}, ${75 - i * 5}%, ${35 + i * 5}%)`} />
                    ))}
                    <LabelList dataKey="value" position="top" style={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Sendika Dağılımı — YENİ (FC) */}
            <Card title="Sendika Dağılımı">
              {flexData?.personel?.sendika?.length ? (
                (() => {
                  const sendData = flexData.personel.sendika;
                  const maxVal = sendData[0]?.sayi || 1;
                  const total  = sendData.reduce((s, r) => s + r.sayi, 0);
                  const SEND_COLORS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16'];
                  return (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                        <span style={{ fontSize: 10, background: '#dcfce7', color: '#15803d', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>FlexCity</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {sendData.map((s, i) => (
                          <div key={s.ad} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: SEND_COLORS[i % SEND_COLORS.length], flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.ad}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', flexShrink: 0 }}>{s.sayi.toLocaleString('tr-TR')}</span>
                            <span style={{ fontSize: 10, color: '#94a3b8', width: 32, textAlign: 'right', flexShrink: 0 }}>%{total ? Math.round((s.sayi/total)*100) : 0}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #f1f5f9', fontSize: 11, color: '#94a3b8', textAlign: 'right' }}>
                        Toplam: {total.toLocaleString('tr-TR')}
                      </div>
                    </>
                  );
                })()
              ) : (
                <p className="text-sm text-slate-400 py-4 text-center">Sendika verisi yükleniyor…</p>
              )}
            </Card>
          </div>

          {/* Satır 2: Doğum Günü + Yeni Katılanlar + Evlilik Yıl Dönümü */}
          <div className="grid gap-4" style={{ gridTemplateColumns: flexData?.evlenmeListesi?.length ? '1fr 1fr 1fr' : '1fr 1fr' }}>

            {/* Doğum Günü — FC öncelikli, AD fallback */}
            {(() => {
              const D_PAGE = 15;
              const fcList = flexData?.dogumListesi;
              const list   = fcList ?? (demo.birthdayToday || []);
              const totalP = Math.ceil(list.length / D_PAGE);
              const pg     = Math.min(dogumPage, Math.max(0, totalP - 1));
              const slice  = list.slice(pg * D_PAGE, (pg + 1) * D_PAGE);

              const Pagination = () => totalP > 1 ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 8, paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                  <button onClick={() => setDogumPage(p => Math.max(0, p - 1))} disabled={pg === 0}
                    style={{ padding: '2px 8px', fontSize: 12, borderRadius: 5, border: '1px solid #e2e8f0', background: pg === 0 ? '#f8fafc' : '#fff', color: pg === 0 ? '#cbd5e1' : '#374151', cursor: pg === 0 ? 'default' : 'pointer' }}>‹</button>
                  {Array.from({ length: totalP }, (_, i) => (
                    <button key={i} onClick={() => setDogumPage(i)}
                      style={{ padding: '2px 7px', fontSize: 12, borderRadius: 5, border: '1px solid', borderColor: i === pg ? '#1e40af' : '#e2e8f0', background: i === pg ? '#1e40af' : '#fff', color: i === pg ? '#fff' : '#374151', fontWeight: i === pg ? 700 : 400, cursor: 'pointer' }}>{i + 1}</button>
                  ))}
                  <button onClick={() => setDogumPage(p => Math.min(totalP - 1, p + 1))} disabled={pg === totalP - 1}
                    style={{ padding: '2px 8px', fontSize: 12, borderRadius: 5, border: '1px solid #e2e8f0', background: pg === totalP - 1 ? '#f8fafc' : '#fff', color: pg === totalP - 1 ? '#cbd5e1' : '#374151', cursor: pg === totalP - 1 ? 'default' : 'pointer' }}>›</button>
                </div>
              ) : null;

              if (fcList) {
                return (
                  <Card title={`🎂 Doğum Günü (${fcList.length})`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{pg * D_PAGE + 1}–{Math.min((pg + 1) * D_PAGE, fcList.length)} / {fcList.length}</span>
                      <span style={{ fontSize: 10, background: '#dcfce7', color: '#15803d', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>FlexCity</span>
                    </div>
                    {!fcList.length ? (
                      <p className="text-sm text-slate-400 py-4 text-center">Yakın tarihte doğum günü yok</p>
                    ) : (
                      <>
                        <div className="space-y-0.5">
                          {slice.map((u, i) => {
                            const adUser = demo.birthdayToday?.find(a =>
                              a.displayName?.toUpperCase().includes(u.adSoyad.split(' ')[0]) ||
                              u.adSoyad.toUpperCase().includes((a.displayName||'').split(' ')[0])
                            );
                            return (
                              <div key={i} className="flex items-center gap-2 py-1 px-1.5 rounded hover:bg-slate-50 transition">
                                <Avatar name={u.adSoyad} bg="#1e40af" size={28} />
                                <span className="text-xs font-semibold text-slate-800 truncate flex-1" title={u.adSoyad}>{u.adSoyad}</span>
                                <span className="text-xs text-slate-400 truncate shrink-0" style={{ maxWidth: '38%' }} title={u.daire}>{u.daire || '—'}</span>
                                {adUser && (
                                  <button onClick={() => setPreviewUser(adUser)} title="Tebrik kartı" className="p-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs shrink-0">📧</button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <Pagination />
                      </>
                    )}
                  </Card>
                );
              }
              // AD fallback
              return (
                <Card title={`🎂 Bugün Doğum Günü (${list.length})`}>
                  {!list.length ? (
                    <p className="text-sm text-slate-400 py-4 text-center">Bugün doğum günü olan personel yok</p>
                  ) : (
                    <>
                      <div className="space-y-0.5">
                        {slice.map(u => (
                          <div key={u.username} className="flex items-center gap-2 py-1 px-1.5 rounded hover:bg-slate-50 transition">
                            <Avatar name={u.displayName} bg="#1e40af" size={28} />
                            <span className="text-xs font-semibold text-slate-800 truncate flex-1" title={u.displayName}>{u.displayName}</span>
                            <span className="text-xs text-slate-400 truncate shrink-0" style={{ maxWidth: '38%' }}>{u.directorate || u.department || '—'}</span>
                            <button onClick={() => setPreviewUser(u)} title="Tebrik kartı" className="p-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs shrink-0">📧</button>
                          </div>
                        ))}
                      </div>
                      <Pagination />
                    </>
                  )}
                </Card>
              );
            })()}

            {/* Bu Hafta Yeni Katılanlar — AD */}
            <Card title={`👋 Bu Hafta Yeni Katılanlar (${demo.newThisWeek?.length || 0})`}>
              {!demo.newThisWeek?.length ? (
                <p className="text-sm text-slate-400 py-4 text-center">Bu hafta yeni personel eklenmedi</p>
              ) : (
                <div className="space-y-0.5 max-h-64 overflow-y-auto pr-1">
                  {demo.newThisWeek.map(u => {
                    const daysAgo = Math.floor((Date.now() - new Date(u.adCreatedAt)) / 86400000);
                    return (
                      <div key={u.username} className="flex items-center gap-2 py-1 px-1.5 rounded hover:bg-slate-50 transition">
                        <Avatar name={u.displayName} bg="#0f766e" size={28} />
                        <span className="text-xs font-semibold text-slate-800 truncate flex-1" title={u.displayName}>{u.displayName}</span>
                        <span className="text-xs text-slate-400 truncate shrink-0" style={{ maxWidth: '32%' }}>{u.directorate || u.department || '—'}</span>
                        <span className="text-xs text-slate-400 shrink-0">{daysAgo === 0 ? 'bugün' : `${daysAgo}g önce`}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Evlilik Yıl Dönümü — FC (varsa) */}
            {flexData?.evlenmeListesi?.length > 0 && (
              <Card title={`💍 Evlilik Yıl Dönümü (${flexData.evlenmeListesi.length})`}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, background: '#dcfce7', color: '#15803d', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>FlexCity</span>
                </div>
                <div className="space-y-0.5 max-h-64 overflow-y-auto pr-1">
                  {flexData.evlenmeListesi.map((u, i) => (
                    <div key={i} className="flex items-center gap-2 py-1 px-1.5 rounded hover:bg-slate-50 transition">
                      <Avatar name={u.adSoyad} bg="#9333ea" size={28} />
                      <span className="text-xs font-semibold text-slate-800 truncate flex-1" title={u.adSoyad}>{u.adSoyad}</span>
                      <span className="text-xs text-slate-400 truncate shrink-0" style={{ maxWidth: '32%' }} title={u.yakin}>💑 {u.yakin}</span>
                      <span className="text-xs font-bold text-purple-600 shrink-0">{u.yil} yıl</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {deviceModal && (
        <DeviceModal user={deviceModal} onClose={() => setDeviceModal(null)} />
      )}

      {previewUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Tebrik Kartı Önizleme</h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>{previewUser.displayName} · {previewUser.email || previewUser.username}</p>
              </div>
              <button onClick={() => setPreviewUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#64748b', padding: '4px' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
              <BirthdayCardPreview user={previewUser} />
            </div>
            <div style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setPreviewUser(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '13px' }}>
                İptal
              </button>
              <button
                onClick={async () => {
                  await fetch(`${API}/api/users/send-birthday-mail/${previewUser.username}`, { method: 'POST', headers: authHeaders() });
                  setPreviewUser(null);
                  alert(`✅ ${previewUser.displayName}'e tebrik maili gönderildi!`);
                }}
                style={{ padding: '8px 16px', borderRadius: '8px', background: '#1e40af', color: 'white', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
              >
                📧 Gönder
              </button>
            </div>
          </div>
        </div>
      )}

      {drawerUser && (
        <UserDrawer username={drawerUser} onClose={() => setDrawerUser(null)} />
      )}
    </div>
  );
}
