import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login } from '../api/auth';

export default function Login() {
  const { saveSession } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { token, user } = await login(username, password);
      saveSession(token, user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex w-full max-w-4xl min-h-[520px] rounded-2xl shadow-xl overflow-hidden">

        {/* Sol mavi panel */}
        <div className="hidden md:flex flex-col justify-between w-1/2 bg-blue-700 p-10 text-white">
          <div>
            <div className="w-14 h-14 mb-8">
              <img src="/mugla-logo.svg" alt="Muğla Büyükşehir Belediyesi" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold leading-snug">Muğla Büyükşehir Belediyesi</h1>
            <p className="mt-2 text-blue-200 text-sm">Kurumsal Uygulama Portalı</p>
          </div>

          <div className="space-y-4">
            {['İnsan Kaynakları', 'Evrak Takip', 'Teknik Destek', 'Mali İşler'].map((app) => (
              <div key={app} className="flex items-center gap-3 text-sm text-blue-100">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-300" />
                {app}
              </div>
            ))}
          </div>

          <p className="text-xs text-blue-300">© 2025 Muğla Büyükşehir Belediyesi</p>
        </div>

        {/* Sağ form */}
        <div className="flex flex-col justify-center w-full md:w-1/2 bg-white p-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Hoş geldiniz</h2>
          <p className="text-sm text-gray-500 mb-8">Kurumsal hesabınızla giriş yapın</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kullanıcı Adı</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                placeholder="kullanici.adi"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent transition"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-lg text-sm transition"
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <p className="mt-8 text-xs text-gray-400 text-center">
            Sorun yaşıyorsanız BT Destek ile iletişime geçin.
          </p>
        </div>
      </div>
    </div>
  );
}
