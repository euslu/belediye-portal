const API_URL = import.meta.env.VITE_API_URL || '';

function authHeaders() {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// ─── Settings (SLA vb.) ───────────────────────────────────────────────────────
export async function getSettings() {
  const res  = await fetch(`${API_URL}/api/settings`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ayarlar alınamadı');
  return data;
}

export async function patchSettings(updates) {
  const res  = await fetch(`${API_URL}/api/settings`, {
    method: 'PATCH', headers: authHeaders(), body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ayarlar kaydedilemedi');
  return data;
}

// ─── Başvuru Tipleri ──────────────────────────────────────────────────────────
export async function getSubmitTypes(all = false) {
  const params = all ? '?all=true' : '';
  const res    = await fetch(`${API_URL}/api/submit-types${params}`, { headers: authHeaders() });
  const data   = await res.json();
  if (!res.ok) throw new Error(data.error || 'Başvuru tipleri alınamadı');
  return data;
}

export async function createSubmitType(payload) {
  const res  = await fetch(`${API_URL}/api/submit-types`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Oluşturulamadı');
  return data;
}

export async function updateSubmitType(id, payload) {
  const res  = await fetch(`${API_URL}/api/submit-types/${id}`, {
    method: 'PATCH', headers: authHeaders(), body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Güncellenemedi');
  return data;
}

export async function deleteSubmitType(id) {
  const res  = await fetch(`${API_URL}/api/submit-types/${id}`, {
    method: 'DELETE', headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Silinemedi');
  return data;
}
