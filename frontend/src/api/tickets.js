const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function getTickets(filters = {}) {
  const params = new URLSearchParams(filters).toString();
  const res = await fetch(`${API_URL}/api/tickets${params ? `?${params}` : ''}`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ticketlar alınamadı');
  return data;
}

export async function getTicket(id) {
  const res = await fetch(`${API_URL}/api/tickets/${id}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ticket alınamadı');
  return data;
}

export async function createTicket(payload) {
  const res = await fetch(`${API_URL}/api/tickets`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ticket oluşturulamadı');
  return data;
}

export async function updateTicket(id, payload) {
  const res = await fetch(`${API_URL}/api/tickets/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ticket güncellenemedi');
  return data;
}

export async function addComment(ticketId, content, isInternal = false) {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/comments`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ content, isInternal }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Yorum eklenemedi');
  return data;
}

export async function getAttachments(ticketId) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ekler alınamadı');
  return data;
}

export async function uploadAttachments(ticketId, files) {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  files.forEach(f => formData.append('files', f));
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Dosya yüklenemedi');
  return data;
}

export function getDownloadUrl(attachmentId) {
  const token = localStorage.getItem('token');
  return `${API_URL}/api/tickets/attachments/${attachmentId}/download?token=${token}`;
}
