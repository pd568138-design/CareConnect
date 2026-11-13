const configured = import.meta.env.VITE_API_URL || 'https://careconnect-lp78.onrender.com/api';
const API_BASE = configured.trim().replace(/\/+$/, '');

export async function api(path, { token, ...options } = {}) {
  const cleanPath = String(path).replace(/^\/+/, '');
  const response = await fetch(`${API_BASE}/${cleanPath}`, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data;
}
export const json = (value) => JSON.stringify(value);
