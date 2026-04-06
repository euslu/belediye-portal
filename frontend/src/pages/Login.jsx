import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login } from '../api/auth';
import muglaLogo from '../assets/mugla_logo.png';

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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', background: '#f8fafc' }}>

      {/* Login formu */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        width: '100%',
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
              <img src={muglaLogo} alt="Muğla BB"
                style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Kurumsal Muğla
              </h1>
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
