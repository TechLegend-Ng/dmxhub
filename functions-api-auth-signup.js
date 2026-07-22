import { jsonResponse, generateId, hashPassword, setSessionCookie } from './_utils.js';
export async function onRequestPost({ request, env }) {
  try {
    const { email, name, password } = await request.json();
    if (!email || !password || password.length < 6) {
      return jsonResponse({ error: 'Email and password (min 6 chars) required' }, 400);
    }
    const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase()).first();
    if (existing) return jsonResponse({ error: 'Email already registered. Please login.' }, 409);
    const passwordHash = await hashPassword(password);
    const userId = generateId(); const now = Date.now();
    await env.DB.prepare('INSERT INTO users (id, email, name, password_hash, provider, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(userId, email.toLowerCase(), name || email.split('@')[0], passwordHash, 'email', now).run();
    const sessionId = generateId(); const expiresAt = now + 30*24*60*60*1000;
    await env.DB.prepare('INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').bind(sessionId, userId, expiresAt, now).run();
    const user = { id: userId, email: email.toLowerCase(), name: name || email.split('@')[0] };
    return jsonResponse({ success: true, user }, 200, { 'Set-Cookie': setSessionCookie(sessionId, expiresAt) });
  } catch (e) {
    return jsonResponse({ error: 'Server error: ' + e.message }, 500);
  }
}
