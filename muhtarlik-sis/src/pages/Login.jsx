import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setToken } from '../lib/muhtarlik_api'
import muglaLogo from '../assets/mugla_logo.png'
import muglaLogoYatay from '../assets/mugla_logo_yatay.png'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [tooltip, setTooltip]         = useState(false)
  const [accessDenied, setAccessDenied] = useState(null) // { message }
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setAccessDenied(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()
      if (data.token) {
        if (!data.muhtarlikAccess) {
          // Giriş başarılı ama muhtarlik yetkisi yok
          setAccessDenied({ message: "Muhtarlıklar Bilgi Sistemi'ne erişim için yetkiniz bulunmamaktadır. Lütfen daire başkanlığınızla iletişime geçin." })
          return
        }
        setToken(data.token)
        navigate('/')
      } else {
        setError(data.error || data.message || 'Kullanıcı adı veya şifre hatalı')
      }
    } catch {
      setError('Sunucuya bağlanılamadı')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      fontFamily: "'Poppins', sans-serif",
      background: '#f0f4f8',
    }}>
      {/* SOL PANEL */}
      <div style={{
        flex: 1,
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 48px',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100vh',
        borderRight: '1px solid #e8edf5',
      }}>
        {/* Çok hafif dekoratif daire */}
        <div style={{
          position: 'absolute',
          width: 500, height: 500,
          borderRadius: '50%',
          background: 'rgba(2,34,95,0.03)',
          top: -150, right: -150,
          pointerEvents: 'none',
        }} />

        {/* Logo — arka plan beyaz, logo da beyaz, sorunsuz */}
        <img
          src={muglaLogoYatay}
          alt="Muğla Büyükşehir Belediyesi"
          style={{
            width: 500,
            objectFit: 'contain',
            marginBottom: 16,
          }}
        />

        <h2 style={{
          color: '#02225F',
          fontSize: 22,
          fontWeight: 700,
          textAlign: 'center',
          margin: '0 0 8px',
          fontFamily: "'Poppins', sans-serif",
        }}>
          Muhtarlıklar Daire Başkanlığı
        </h2>
        <h3 style={{
          color: '#9aa8a0',
          fontSize: 12,
          fontWeight: 400,
          textAlign: 'center',
          margin: 0,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          fontFamily: "'Poppins', sans-serif",
        }}>
          Muhtarlıklar Bilgi Sistemi
        </h3>

        <p style={{
          position: 'absolute', bottom: 24,
          color: '#c5cfd6', fontSize: 11, margin: 0,
          textAlign: 'center',
        }}>
          © 2026 Muğla Büyükşehir Belediyesi | Bilgi İşlem Daire Başkanlığı
        </p>
      </div>

      {/* SAĞ PANEL — LOGIN FORMU */}
      <div style={{
        width: 460,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 48px',
        background: '#ffffff',
        boxShadow: '-4px 0 40px rgba(0,0,0,0.06)',
      }}>
        <div style={{ width: '100%', maxWidth: 340 }}>

          <h2 style={{
            fontSize: 24, fontWeight: 600, color: '#1a2e23', margin: '0 0 8px',
          }}>
            Giriş Yap
          </h2>
          <p style={{ color: '#6b7a74', fontSize: 14, margin: '0 0 36px' }}>
            Sisteme erişmek için bilgilerinizi girin
          </p>

          <form onSubmit={handleSubmit}>
            {/* Kullanıcı Adı */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374740' }}>
                  Kullanıcı Adı
                </label>
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onMouseEnter={() => setTooltip(true)}
                    onMouseLeave={() => setTooltip(false)}
                    onClick={() => setTooltip(t => !t)}
                    style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: '#e8f4ee', border: '1px solid #43DC80',
                      color: '#0d5c42', fontSize: 11, fontWeight: 600,
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', padding: 0, lineHeight: 1,
                    }}
                  >
                    i
                  </button>
                  {tooltip && (
                    <div style={{
                      position: 'absolute', left: 24, top: -8,
                      background: '#1a2e23', color: '#fff', fontSize: 12,
                      padding: '8px 12px', borderRadius: 8, width: 220,
                      zIndex: 100, lineHeight: 1.5,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)', whiteSpace: 'normal',
                    }}>
                      Bilgisayarınızın kullanıcı adı ve şifresiyle giriş yapabilirsiniz.
                      <div style={{
                        position: 'absolute', left: -5, top: 12,
                        width: 8, height: 8, background: '#1a2e23',
                        transform: 'rotate(45deg)',
                      }} />
                    </div>
                  )}
                </div>
              </div>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoComplete="username"
                style={{
                  width: '100%', padding: '12px 14px', fontSize: 14,
                  border: '1.5px solid #dde5e0', borderRadius: 10,
                  outline: 'none', transition: 'border-color 0.2s',
                  boxSizing: 'border-box', color: '#1a2e23', background: '#fafcfb',
                }}
                onFocus={e => e.target.style.borderColor = '#43DC80'}
                onBlur={e => e.target.style.borderColor = '#dde5e0'}
              />
            </div>

            {/* Şifre */}
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374740', marginBottom: 8 }}>
                Şifre
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{
                  width: '100%', padding: '12px 14px', fontSize: 14,
                  border: '1.5px solid #dde5e0', borderRadius: 10,
                  outline: 'none', transition: 'border-color 0.2s',
                  boxSizing: 'border-box', color: '#1a2e23', background: '#fafcfb',
                }}
                onFocus={e => e.target.style.borderColor = '#43DC80'}
                onBlur={e => e.target.style.borderColor = '#dde5e0'}
              />
            </div>

            {/* Giriş hatası */}
            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fca5a5',
                borderRadius: 8, padding: '10px 14px', marginBottom: 20,
                fontSize: 13, color: '#dc2626',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <i className="bi bi-exclamation-circle" />
                {error}
              </div>
            )}

            {/* Erişim reddedildi */}
            {accessDenied && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 12, padding: '20px 24px', marginBottom: 20,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#dc2626', marginBottom: 6 }}>
                  Erişim Reddedildi
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
                  {accessDenied.message}
                </div>
                <div style={{
                  marginTop: 12, fontSize: 12, color: '#9ca3af',
                  padding: '8px 12px', background: '#f9fafb', borderRadius: 8,
                }}>
                  Yetki talebi için: <strong>Muhtarlıklar Daire Başkanlığı</strong>
                </div>
                <button
                  onClick={() => setAccessDenied(null)}
                  style={{
                    marginTop: 12, padding: '8px 20px',
                    background: 'transparent', border: '1px solid #e5e7eb',
                    borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#6b7280',
                  }}
                >
                  Geri Dön
                </button>
              </div>
            )}

            {/* Giriş Butonu */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px',
                background: loading ? '#a8e6c6' : '#43DC80',
                color: '#fff', fontWeight: 600, fontSize: 15,
                border: 'none', borderRadius: 10,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s', letterSpacing: '0.02em',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(67,220,128,0.4)',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#2bc96a' }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#43DC80' }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{
                    width: 16, height: 16,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    display: 'inline-block', animation: 'spin 0.8s linear infinite',
                  }} />
                  Giriş yapılıyor...
                </span>
              ) : 'Giriş Yap'}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}
