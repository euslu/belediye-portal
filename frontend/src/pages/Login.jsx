import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login } from '../api/auth';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { saveSession } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await login(username, password);
      saveSession(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'Inter, sans-serif' }}>

      {/* SOL TARAF — Hero */}
      <div style={{
        flex: 1,
        display: 'none',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #1e3a8a 100%)'
      }} className="lg-flex">
        <style>{`
          @media (min-width: 1024px) { .lg-flex { display: flex !important; flex-direction: column; justify-content: center; padding: 64px; } }
        `}</style>

        {/* Arka plan resmi */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(https://images.unsplash.com/photo-1719550371336-7bb64b5cacfa?w=1080&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.2,
          mixBlendMode: 'overlay'
        }} />

        {/* SVG network çizgileri */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15 }}>
          <defs>
            <linearGradient id="lg1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.6" />
            </linearGradient>
          </defs>
          <line x1="10%" y1="20%" x2="40%" y2="50%" stroke="url(#lg1)" strokeWidth="2" />
          <line x1="40%" y1="50%" x2="70%" y2="30%" stroke="url(#lg1)" strokeWidth="2" />
          <line x1="40%" y1="50%" x2="60%" y2="80%" stroke="url(#lg1)" strokeWidth="2" />
          <line x1="70%" y1="30%" x2="90%" y2="60%" stroke="url(#lg1)" strokeWidth="2" />
          <circle cx="10%" cy="20%" r="6" fill="#8b5cf6" opacity="0.8" />
          <circle cx="40%" cy="50%" r="8" fill="#3b82f6" opacity="0.9" />
          <circle cx="70%" cy="30%" r="6" fill="#8b5cf6" opacity="0.8" />
          <circle cx="60%" cy="80%" r="5" fill="#6366f1" opacity="0.7" />
          <circle cx="90%" cy="60%" r="6" fill="#3b82f6" opacity="0.8" />
        </svg>

        {/* İçerik */}
        <div style={{ position: 'relative', zIndex: 10, color: 'white' }}>
          {/* Logo + başlık */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '48px' }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', inset: 0,
                background: '#a855f7', filter: 'blur(16px)',
                opacity: 0.5, borderRadius: '50%'
              }} />
              <div style={{
                position: 'relative',
                padding: '16px',
                background: 'linear-gradient(135deg, #a855f7, #3b82f6)',
                borderRadius: '16px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
              }}>
                <img
                  src="https://www.mugla.bel.tr/mbb/tema/mbb/img/mbblogo.svg"
                  alt="Muğla BB"
                  style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentNode.innerHTML = '<span style="color:white;font-size:24px;font-weight:700">M</span>';
                  }}
                />
              </div>
            </div>
            <h1 style={{
              fontSize: '40px', fontWeight: 700, margin: 0,
              background: 'linear-gradient(to right, #ffffff, #bfdbfe)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Kurumsal Muğla
            </h1>
          </div>

          {/* Ana başlık */}
          <div style={{ position: 'relative', paddingLeft: '16px', marginBottom: '40px' }}>
            <div style={{
              position: 'absolute', left: 0, top: 0,
              width: '4px', height: '100%',
              background: 'linear-gradient(to bottom, #a855f7, #3b82f6)',
              borderRadius: '4px'
            }} />
            <h2 style={{ fontSize: '44px', fontWeight: 700, margin: '0 0 16px', lineHeight: 1.2 }}>
              Muğla Belediyesinin
              <span style={{
                display: 'block',
                background: 'linear-gradient(to right, #d8b4fe, #93c5fd)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Dijital Beyni
              </span>
            </h2>
            <p style={{ color: '#bfdbfe', fontSize: '16px', lineHeight: 1.6, margin: 0 }}>
              Tüm belediye operasyonlarını tek merkezden yöneten,<br />
              akıllı ve entegre platform.
            </p>
          </div>

          {/* Özellik kartları */}
          {[
            { icon: '🏛️', title: 'Merkezi Kontrol', desc: 'Tüm birimler tek platformda birleşik' },
            { icon: '⚡', title: 'Anlık Veri Akışı', desc: 'Gerçek zamanlı raporlama ve analiz' },
            { icon: '🔒', title: 'Güvenli Altyapı', desc: 'Kurumsal düzeyde veri güvenliği' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: '16px',
              padding: '16px',
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(8px)',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
              marginBottom: '12px'
            }}>
              <div style={{
                padding: '10px',
                background: i === 0
                  ? 'linear-gradient(135deg, #a855f7, #9333ea)'
                  : i === 1
                  ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                  : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                borderRadius: '10px',
                fontSize: '18px',
                flexShrink: 0
              }}>
                {item.icon}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '2px' }}>
                  {item.title}
                </div>
                <div style={{ color: '#bfdbfe', fontSize: '13px' }}>
                  {item.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SAĞ TARAF — Login formu */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        background: '#f8fafc'
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>

          {/* Mobil logo */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '12px',
            marginBottom: '32px', textAlign: 'center'
          }}>
            <div style={{
              padding: '12px',
              background: 'linear-gradient(135deg, #a855f7, #3b82f6)',
              borderRadius: '16px',
              boxShadow: '0 8px 24px rgba(168,85,247,0.3)'
            }}>
              <img
                src="https://www.mugla.bel.tr/mbb/tema/mbb/img/mbblogo.svg"
                alt="Muğla BB"
                style={{ width: '36px', height: '36px', objectFit: 'contain' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentNode.innerHTML = '<span style="color:white;font-size:20px;font-weight:700">M</span>';
                }}
              />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Kurumsal Muğla
              </h1>
              <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>
                Muğla Belediyesinin Dijital Beyni
              </p>
            </div>
          </div>

          {/* Form kartı */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            padding: '32px'
          }}>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
                Hoş Geldiniz
              </h2>
              <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
                Yönetim panelinize giriş yapın
              </p>
            </div>

            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: '8px', padding: '12px',
                color: '#dc2626', fontSize: '13px', marginBottom: '16px'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Kullanıcı adı */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block', fontSize: '13px',
                  fontWeight: 500, color: '#374151', marginBottom: '6px'
                }}>
                  Kullanıcı Adı
                </label>
                <div style={{ position: 'relative' }}>
                  <svg style={{
                    position: 'absolute', left: '12px',
                    top: '50%', transform: 'translateY(-50%)',
                    width: '18px', height: '18px', color: '#9ca3af'
                  }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Kullanıcı adınızı girin"
                    required
                    style={{
                      width: '100%', height: '44px',
                      paddingLeft: '40px', paddingRight: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px', fontSize: '14px',
                      outline: 'none', boxSizing: 'border-box',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={e => e.target.style.borderColor = '#a855f7'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
              </div>

              {/* Şifre */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block', fontSize: '13px',
                  fontWeight: 500, color: '#374151', marginBottom: '6px'
                }}>
                  Şifre
                </label>
                <div style={{ position: 'relative' }}>
                  <svg style={{
                    position: 'absolute', left: '12px',
                    top: '50%', transform: 'translateY(-50%)',
                    width: '18px', height: '18px', color: '#9ca3af'
                  }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Şifrenizi girin"
                    required
                    style={{
                      width: '100%', height: '44px',
                      paddingLeft: '40px', paddingRight: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px', fontSize: '14px',
                      outline: 'none', boxSizing: 'border-box',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={e => e.target.style.borderColor = '#a855f7'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
              </div>

              {/* Giriş butonu */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', height: '44px',
                  background: loading
                    ? '#94a3b8'
                    : 'linear-gradient(to right, #9333ea, #2563eb)',
                  color: 'white', border: 'none',
                  borderRadius: '8px', fontSize: '14px',
                  fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '8px',
                  boxShadow: loading ? 'none' : '0 4px 16px rgba(147,51,234,0.3)',
                  transition: 'all 0.2s'
                }}
              >
                {loading ? 'Giriş yapılıyor...' : (
                  <>
                    Giriş Yap
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Alt bilgi */}
            <div style={{
              marginTop: '20px', paddingTop: '16px',
              borderTop: '1px solid #f1f5f9',
              textAlign: 'center'
            }}>
              <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>
                Yardıma mı ihtiyacınız var?{' '}
                <span style={{ color: '#9333ea', fontWeight: 500, cursor: 'pointer' }}>
                  BT Destek ile İletişime Geçin
                </span>
              </p>
            </div>
          </div>

          <p style={{
            textAlign: 'center', color: '#94a3b8',
            fontSize: '11px', marginTop: '24px'
          }}>
            © 2026 Kurumsal Muğla. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </div>
  );
}
