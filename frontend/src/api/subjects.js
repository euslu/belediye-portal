const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function authHeaders() {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export async function getSubjects({ categoryId, all = false } = {}) {
  const params = new URLSearchParams();
  if (categoryId) params.set('categoryId', categoryId);
  if (all) params.set('all', 'true');
  const res  = await fetch(`${API_URL}/api/subjects?${params}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Konular alınamadı');
  return data;
}

export async function createSubject(payload) {
  const res  = await fetch(`${API_URL}/api/subjects`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Konu oluşturulamadı');
  return data;
}

export async function updateSubject(id, payload) {
  const res  = await fetch(`${API_URL}/api/subjects/${id}`, {
    method: 'PATCH', headers: authHeaders(), body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Konu güncellenemedi');
  return data;
}

export async function deleteSubject(id) {
  const res  = await fetch(`${API_URL}/api/subjects/${id}`, {
    method: 'DELETE', headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Konu silinemedi');
  return data;
}
