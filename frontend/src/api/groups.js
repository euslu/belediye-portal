const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function getGroups() {
  const res = await fetch(`${API_URL}/api/groups`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gruplar alınamadı');
  return data;
}

export async function getGroupMembers(groupId) {
  const res = await fetch(`${API_URL}/api/groups/${groupId}/members`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Üyeler alınamadı');
  return data;
}

export async function createGroup({ name, description, memberIds }) {
  const res = await fetch(`${API_URL}/api/groups`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name, description, memberIds }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Grup oluşturulamadı');
  return data;
}

export async function updateGroup(id, { name, description }) {
  const res = await fetch(`${API_URL}/api/groups/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ name, description }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Grup güncellenemedi');
  return data;
}

export async function deleteGroup(id) {
  const res = await fetch(`${API_URL}/api/groups/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Grup silinemedi');
  return data;
}

export async function addGroupMembers(groupId, userIds) {
  const res = await fetch(`${API_URL}/api/groups/${groupId}/members`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ userIds }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Üye eklenemedi');
  return data;
}

export async function removeGroupMember(groupId, userId) {
  const res = await fetch(`${API_URL}/api/groups/${groupId}/members/${userId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Üye çıkarılamadı');
  return data;
}

export async function searchUsers(query) {
  const params = new URLSearchParams({ search: query, limit: '20' });
  const res = await fetch(`${API_URL}/api/users?${params}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Kullanıcılar alınamadı');
  return data.users;
}

export async function setGroupLeader(groupId, leaderId) {
  const res = await fetch(`${API_URL}/api/groups/${groupId}/leader`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ leaderId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Lider atanamadı');
  return data;
}

export async function assignTicket(ticketId, { groupId, assignedToId }) {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/assign`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ groupId, assignedToId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Atama yapılamadı');
  return data;
}
