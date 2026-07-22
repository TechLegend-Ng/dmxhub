import { jsonResponse, generateId, setSessionCookie } from './_utils.js';
export async function onRequestPost({ request, env }) {
  try {
    const { credential } = await request.json();
    if (!credential) return jsonResponse({ error: 'Missing Google credential' }, 400);
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    const payload = await verifyRes.json();
    if (!payload || (env.GOOGLE_CLIENT_ID && payload.aud !== env.GOOGLE_CLIENT_ID)) {
      return jsonResponse({ error: 'Invalid Google token' }, 401);
    }
    const email = payload.email?.toLowerCase(); const googleId = payload.sub; const name = payload.name; const avatar = payload.picture;
    let user = await env.DB.prepare('SELECT * FROM users WHERE google_id = ? OR email = ?').bind(googleId, email).first();
    const now = Date.now();
    if (!user) {
      const userId = generateId();
      await env.DB.prepare('INSERT INTO users (id, email, name, google_id, avatar_url, provider, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(userId, email, name, googleId, avatar, 'google', now).run();
      user = { id: userId, email, name, avatar_url: avatar };
    } else if (!user.google_id) {
      await env.DB.prepare('UPDATE users SET google_id = ?, avatar_url = COALESCE(?, avatar_url) WHERE id = ?').bind(googleId, avatar, user.id).run();
    }
    const sessionId = generateId(); const expiresAt = now + 30*24*60*60*1000;
    await env.DB.prepare('INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').bind(sessionId, user.id, expiresAt, now).run();
    return jsonResponse({ success: true, user: { id: user.id, email: user.email, name: user.name } }, 200, { 'Set-Cookie': setSessionCookie(sessionId, expiresAt) });
  } catch (e) { return jsonResponse({ error: 'Google login failed: ' + e.message }, 500); }
}
