const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function login(username, password) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  let res;
  try {
    res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Sunucu yanıt vermedi, lütfen tekrar deneyin');
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Giriş başarısız');
  }

  return data; // { token, user }
}

export async function getMe(token) {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Oturum doğrulanamadı');
  }

  return data.user;
}
