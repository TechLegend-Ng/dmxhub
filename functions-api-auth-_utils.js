export function jsonResponse(data, status=200, headers={}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', ...headers }
  });
}
export function generateId() { return crypto.randomUUID(); }
export async function hashPassword(password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  const hashArray = new Uint8Array(bits);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(salt, 0); combined.set(hashArray, salt.length);
  return btoa(String.fromCharCode(...combined));
}
export async function verifyPassword(password, stored) {
  try {
    const combined = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
    const salt = combined.slice(0, 16); const hash = combined.slice(16);
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
    const testHash = new Uint8Array(bits);
    if (testHash.length !== hash.length) return false;
    for (let i=0;i<testHash.length;i++) if (testHash[i] !== hash[i]) return false;
    return true;
  } catch { return false; }
}
export function getCookie(request, name) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(new RegExp('(^| )'+name+'=([^;]+)'));
  return match ? match[2] : null;
}
export function setSessionCookie(sessionId, expiresAt) {
  const expires = new Date(expiresAt).toUTCString();
  return `dmxhub_session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expires}`;
}
export async function getUserFromSession(request, env) {
  const sessionId = getCookie(request, 'dmxhub_session');
  if (!sessionId) return null;
  const session = await env.DB.prepare('SELECT * FROM sessions WHERE id = ? AND expires_at > ?').bind(sessionId, Date.now()).first();
  if (!session) return null;
  const user = await env.DB.prepare('SELECT id, email, name, avatar_url, provider, created_at FROM users WHERE id = ?').bind(session.user_id).first();
  return user ? { ...user, sessionId } : null;
}
