import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login } from '../api/auth';

function Field({ label, icon, type, value, onChange, placeholder }) {
  return (
    <div className="portal-login-field">
      <label>{label}</label>
      <div className="portal-login-input-wrap">
        <span className="portal-login-input-icon">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required
        />
      </div>
    </div>
  );
}

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [remember, setRemember] = useState(false);
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
    <div className="portal-login-page">
      <div className="portal-login-shell-simple">
        <div className="portal-login-illustration">
          <img
            src="/login-slides/mugla_slider_2.jpg"
            alt="MBB Kurumsal"
            className="portal-login-illustration-image"
          />
          <p className="portal-login-illustration-caption">Bilgi İşlem Daire Başkanlığı</p>
        </div>

        <div className="portal-login-panel">
          <form onSubmit={handleSubmit} className="portal-login-form-simple">
            <Field
              label="Kullanıcı Adı"
              icon="✉"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder=""
            />

            <Field
              label="Parola"
              icon="🔒"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=""
            />

            <div className="portal-login-row">
              <label className="portal-login-checkbox">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Beni Hatırla</span>
              </label>

              <button type="button" className="portal-login-link">
                Şifremi Unuttum
              </button>
            </div>

            {error && (
              <div className="portal-login-error">
                {error}
              </div>
            )}

            <button type="submit" className="portal-login-submit" disabled={loading}>
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>

            <p className="portal-login-ip">IP adresiniz: 10.100.40.135</p>
          </form>
        </div>
      </div>
    </div>
  );
}
