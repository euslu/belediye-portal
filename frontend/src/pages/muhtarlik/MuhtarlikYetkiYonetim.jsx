import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || '';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' });

const ILCELER = [
  'BODRUM','DALAMAN','DATÇA','FETHİYE','KAVAKLIDERE',
  'KÖYCEĞİZ','MARMARİS','MENTEŞE','MİLAS','ORTACA',
  'SEYDİKEMER','ULA','YATAĞAN',
];

const YETKI_TURU = [
  { value: 'okuma',  label: 'Okuma',  color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'yazma',  label: 'Yazma',  color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'tam',    label: 'Tam',    color: 'text-green-600 bg-green-50 border-green-200' },
];

const ROL_BADGE = {
  admin:         { label: 'Admin',         cls: 'bg-red-100 text-red-700' },
  daire_baskani: { label: 'Daire Başkanı', cls: 'bg-purple-100 text-purple-700' },
  mudur:         { label: 'Müdür',         cls: 'bg-indigo-100 text-indigo-700' },
  personel:      { label: 'Personel',      cls: 'bg-gray-100 text-gray-600' },
};

export default function MuhtarlikYetkiYonetim() {
  const { user } = useAuth();
  const [kullanicilar, setKullanicilar] = useState([]);
  const [secili, setSecili]   = useState(null);
  const [yetkiler, setYetkiler] = useState([]);
  const [aramaQ, setAramaQ]   = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [mesaj, setMesaj]     = useState(null);

  const canEdit = user?.muhtarlikRole === 'admin' || user?.muhtarlikRole === 'daire_baskani' || user?.sistemRol === 'admin';

  useEffect(() => {
    fetch(`${API}/api/muhtarbis/admin/kullanicilar`, { headers: authH() })
      .then(r => r.json()).then(setKullanicilar).catch(() => {});
  }, []);

  function secKullanici(k) {
    setSecili(k);
    setMesaj(null);
    fetch(`${API}/api/muhtarbis/admin/yetkiler?username=${k.username}`, { headers: authH() })
      .then(r => r.json()).then(setYetkiler).catch(() => setYetkiler([]));
  }

  function getYetki(ilce) {
    return yetkiler.find(y => y.ilce === ilce && y.active);
  }

  async function ilceYetkiDegistir(ilce, yetkiTuru) {
    if (!canEdit || !secili) return;
    setYukleniyor(true);
    try {
      const r = await fetch(`${API}/api/muhtarbis/admin/yetkiler`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({ username: secili.username, ilce, yetkiTuru }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      const yeni = await r.json();
      setYetkiler(prev => {
        const filtered = prev.filter(y => y.ilce !== ilce);
        return [...filtered, yeni];
      });
      flash(`${ilce} → ${yetkiTuru}`, 'success');
    } catch (e) { flash(e.message, 'error'); }
    setYukleniyor(false);
  }

  async function ilceYetkiKaldir(ilce) {
    if (!canEdit || !secili) return;
    const mevcut = getYetki(ilce);
    if (!mevcut) return;
    setYukleniyor(true);
    try {
      const r = await fetch(`${API}/api/muhtarbis/admin/yetkiler/${mevcut.id}`, {
        method: 'DELETE', headers: authH(),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      setYetkiler(prev => prev.filter(y => y.ilce !== ilce));
      flash(`${ilce} yetkisi kaldırıldı`, 'success');
    } catch (e) { flash(e.message, 'error'); }
    setYukleniyor(false);
  }

  function flash(msg, type) {
    setMesaj({ msg, type });
    setTimeout(() => setMesaj(null), 3000);
  }

  const filtreliKullanicilar = kullanicilar.filter(k =>
    !aramaQ ||
    k.username?.toLowerCase().includes(aramaQ.toLowerCase()) ||
    k.displayName?.toLowerCase().includes(aramaQ.toLowerCase())
  );

  // Tam erişimli roller (ilçe kısıtlaması yoktur, yetki atamasına gerek yok)
  const tamErisimRoller = ['admin', 'daire_baskani', 'mudur'];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">Muhtarlık İlçe Yetki Yönetimi</h1>
        <p className="text-sm text-gray-500 mt-1">
          Personelin hangi ilçe(lerde) okuma/yazma/tam yetkisine sahip olduğunu belirleyin.
          Daire başkanı ve müdür tüm ilçelere sınırsız erişebilir.
        </p>
      </div>

      <div className="flex gap-4" style={{ minHeight: 520 }}>
        {/* Sol: Kullanıcı listesi */}
        <div className="w-72 flex-shrink-0 bg-white border border-gray-200 rounded-xl flex flex-col">
          <div className="p-3 border-b border-gray-100">
            <input
              value={aramaQ}
              onChange={e => setAramaQ(e.target.value)}
              placeholder="Kullanıcı ara..."
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtreliKullanicilar.map(k => {
              const badge = ROL_BADGE[k.role] || ROL_BADGE.personel;
              const tamErisim = tamErisimRoller.includes(k.role);
              return (
                <button
                  key={k.username}
                  onClick={() => secKullanici(k)}
                  className={`w-full text-left px-3 py-2.5 border-b border-gray-50 hover:bg-gray-50 transition-colors ${secili?.username === k.username ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-medium text-gray-800 truncate">{k.displayName || k.username}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${badge.cls}`}>{badge.label}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <span className="truncate">{k.username}</span>
                    {tamErisim && <span className="text-green-600 flex-shrink-0">● tam erişim</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sağ: İlçe yetkileri */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl">
          {!secili ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <i className="bi bi-person-badge text-4xl block mb-2" />
                <p className="text-sm">Soldan bir kullanıcı seçin</p>
              </div>
            </div>
          ) : (
            <div className="p-5">
              {/* Başlık */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-base font-semibold text-gray-800">{secili.displayName || secili.username}</h2>
                  <p className="text-sm text-gray-500">{secili.username}</p>
                  {secili.department && <p className="text-xs text-gray-400 mt-0.5">{secili.department}</p>}
                </div>
                <span className={`text-sm px-2 py-1 rounded-full font-medium ${ROL_BADGE[secili.role]?.cls || 'bg-gray-100 text-gray-600'}`}>
                  {ROL_BADGE[secili.role]?.label || secili.role}
                </span>
              </div>

              {/* Tam erişim uyarısı */}
              {tamErisimRoller.includes(secili.role) ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                  <i className="bi bi-shield-check text-green-600 text-xl flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Tüm ilçelere tam erişim</p>
                    <p className="text-xs text-green-600 mt-0.5">
                      Bu kullanıcı <strong>{ROL_BADGE[secili.role]?.label}</strong> rolünde olduğu için
                      tüm ilçelere otomatik olarak erişebilir. İlçe yetkisi atamanıza gerek yoktur.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {mesaj && (
                    <div className={`mb-4 px-3 py-2 rounded-lg text-sm ${mesaj.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {mesaj.msg}
                    </div>
                  )}

                  {/* Yetki açıklaması */}
                  <div className="flex gap-3 mb-4 text-xs text-gray-500">
                    {YETKI_TURU.map(y => (
                      <span key={y.value} className={`px-2 py-0.5 rounded border ${y.color}`}>
                        {y.label}: {y.value === 'okuma' ? 'sadece görüntüleme' : y.value === 'yazma' ? 'görüntüleme + kayıt girme' : 'tüm işlemler'}
                      </span>
                    ))}
                  </div>

                  {/* İlçe grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {ILCELER.map(ilce => {
                      const yetki = getYetki(ilce);
                      const yetkiTuruBilgi = YETKI_TURU.find(y => y.value === yetki?.yetkiTuru);
                      return (
                        <div
                          key={ilce}
                          className={`border rounded-lg p-3 transition-all ${yetki ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200 bg-gray-50'}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">{ilce}</span>
                            {yetki && (
                              <button
                                disabled={!canEdit || yukleniyor}
                                onClick={() => ilceYetkiKaldir(ilce)}
                                className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40"
                                title="Yetkiyi kaldır"
                              >
                                <i className="bi bi-x-circle" />
                              </button>
                            )}
                          </div>
                          {yetki ? (
                            <div className="flex gap-1">
                              {YETKI_TURU.map(y => (
                                <button
                                  key={y.value}
                                  disabled={!canEdit || yukleniyor}
                                  onClick={() => ilceYetkiDegistir(ilce, y.value)}
                                  className={`flex-1 text-xs py-1 rounded border transition-all disabled:opacity-40 ${yetki.yetkiTuru === y.value ? y.color + ' font-semibold' : 'border-gray-200 text-gray-400 hover:border-gray-300 bg-white'}`}
                                >
                                  {y.label}
                                </button>
                              ))}
                            </div>
                          ) : (
                            canEdit ? (
                              <button
                                disabled={yukleniyor}
                                onClick={() => ilceYetkiDegistir(ilce, 'okuma')}
                                className="w-full text-xs py-1.5 border border-dashed border-gray-300 rounded text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors disabled:opacity-40"
                              >
                                + Yetki ekle
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">Yetkisiz</span>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
