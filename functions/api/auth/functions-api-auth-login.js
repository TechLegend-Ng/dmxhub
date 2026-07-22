import { jsonResponse, generateId, verifyPassword, setSessionCookie } from './_utils.js';
export async function onRequestPost({ request, env }) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) return jsonResponse({ error: 'Email and password required' }, 400);
    const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email.toLowerCase()).first();
    if (!user) return jsonResponse({ error: 'No account found' }, 404);
    if (!user.password_hash) return jsonResponse({ error: 'Use Continue with Google' }, 400);
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return jsonResponse({ error: 'Incorrect password' }, 401);
    const sessionId = generateId(); const now = Date.now(); const expiresAt = now + 30*24*60*60*1000;
    await env.DB.prepare('INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').bind(sessionId, user.id, expiresAt, now).run();
    return jsonResponse({ success: true, user: { id: user.id, email: user.email, name: user.name } }, 200, { 'Set-Cookie': setSessionCookie(sessionId, expiresAt) });
  } catch (e) { return jsonResponse({ error: 'Server error' }, 500); }
}
