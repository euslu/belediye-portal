// ─── Token yönetimi ───────────────────────────────────────────────────────────
const TOKEN_KEY = 'ms_token';

export function getToken()      { return localStorage.getItem(TOKEN_KEY); }
export function setToken(t)     { localStorage.setItem(TOKEN_KEY, t); }
export function clearToken()    { localStorage.removeItem(TOKEN_KEY); }

// ─── HTTP yardımcıları ────────────────────────────────────────────────────────
async function req(method, path, params, body) {
  let url = path;
  if (params) {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== '')
    );
    if ([...q].length) url += '?' + q;
  }
  const r = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.error || r.statusText);
  }
  return r.json();
}

const get  = (path, params) => req('GET',  path, params);
const post = (path, data)   => req('POST', path, null, data);
const put  = (path, data)   => req('PUT',  path, null, data);
const enc  = encodeURIComponent;

// ─── Auth ─────────────────────────────────────────────────────────────────────
export async function login(username, password) {
  const r = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.error || 'Kullanıcı adı veya şifre hatalı');
  }
  return r.json(); // { token, user }
}

// ─── Muhtarlık API ────────────────────────────────────────────────────────────
export const muhtarlikApi = {
  getFiltreler:        (ilce)           => get('/api/muhtarbis/filtreler', ilce ? { ilce } : {}),
  getBasvurular:       (params)         => get('/api/muhtarbis/liste', params),
  getStats:            (params)         => get('/api/muhtarbis/stats', params),
  getIlceDagilim:      (params)         => get('/api/muhtarbis/ilce-dagilim', params),
  getDaireDagilim:     (params)         => get('/api/muhtarbis/daire-dagilim', params),
  getMahalleDetay:     (ilce, mahalle)  => get(`/api/muhtarbis/mahalle/${enc(ilce)}/${enc(mahalle)}`),
  getMuhtarFoto:       (ilce, mahalle)  => get(`/api/muhtarbis/muhtar-foto/${enc(ilce)}/${enc(mahalle)}`),
  getMahalleBasvurular:(ilce, mahalle, params) => get(`/api/muhtarbis/mahalle/${enc(ilce)}/${enc(mahalle)}/basvurular`, params),
  getMahalleYatirimlar:(ilce, mahalle)  => get(`/api/muhtarbis/mahalle/${enc(ilce)}/${enc(mahalle)}/yatirimlar`),
  updateBasvuru:       (objectId, data) => put(`/api/muhtarbis/basvuru/${objectId}`, data),
  updateYatirim:       (ilce, mahalle, index, data) => put(`/api/muhtarbis/yatirim/${enc(ilce)}/${enc(mahalle)}/${index}`, data),
  getBasvuruLog:       (objectId)       => get(`/api/muhtarbis/basvuru/${objectId}/log`),
  createBasvuru:       (data)           => post('/api/muhtarbis/basvuru', data),
  createYatirim:       (data)           => post('/api/muhtarbis/yatirim', data),
  getYatirimlarOzet:   ()               => get('/api/muhtarbis/yatirimlar'),
  getYatirimlarIlce:   (ilce)           => get('/api/muhtarbis/yatirimlar', { ilce }),
};

export const raporApi = {
  getOzet:            ()     => get('/api/muhtarbis/rapor/ozet'),
  getIlceOzet:        (ilce) => get(`/api/muhtarbis/rapor/ilce/${enc(ilce)}`),
  getYatirimOzet:     ()     => get('/api/muhtarbis/rapor/yatirim-ozet'),
  getKonuDagilim:     ()     => get('/api/muhtarbis/rapor/konu-dagilim'),
  getDaireTamamlanma: ()     => get('/api/muhtarbis/rapor/daire-tamamlanma'),
  getIlceTamamlanma:  ()     => get('/api/muhtarbis/rapor/ilce-tamamlanma'),
};
