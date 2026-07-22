export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    // API ROUTES
    if (path.startsWith('/api/')) {
      return handleApi(request, env, url);
    }

    // Static assets fallback (your HTML, CSS, JS)
    try {
      return await env.ASSETS.fetch(request);
    } catch (e) {
      return new Response('Not found', { status: 404 });
    }
  }
};

async function handleApi(request, env, url) {
  const path = url.pathname;
  if (path === '/api/auth/signup' && request.method === 'POST') return signup(request, env);
  if (path === '/api/auth/login' && request.method === 'POST') return login(request, env);
  if (path === '/api/auth/google' && request.method === 'POST') return googleLogin(request, env);
  if (path === '/api/auth/logout' && request.method === 'POST') return logout(request, env);
  if (path === '/api/auth/me' && request.method === 'GET') return me(request, env);
  if (path === '/api/progress' && request.method === 'POST') return saveProgress(request, env);
  if (path === '/api/progress' && request.method === 'GET') return getProgress(request, env, url);
  if (path === '/api/reviews' && request.method === 'GET') return getReviews(request, env, url);
  if (path === '/api/reviews' && request.method === 'POST') return postReview(request, env);
  return jsonResponse({ error: 'Not found' }, 404);
}

// ===== UTILS =====
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Cookie',
    'Access-Control-Allow-Credentials': 'true'
  };
}
function jsonResponse(data, status=200, extraHeaders={}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(), ...extraHeaders }
  });
}
function generateId() { return crypto.randomUUID(); }
async function hashPassword(password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  const hashArray = new Uint8Array(bits);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(salt, 0); combined.set(hashArray, salt.length);
  return btoa(String.fromCharCode(...combined));
}
async function verifyPassword(password, stored) {
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
function getCookie(request, name) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(new RegExp('(^| )'+name+'=([^;]+)'));
  return match ? match[2] : null;
}
function setSessionCookie(sessionId, expiresAt) {
  const expires = new Date(expiresAt).toUTCString();
  return `dmxhub_session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expires}`;
}
async function getUserFromSession(request, env) {
  const sessionId = getCookie(request, 'dmxhub_session');
  if (!sessionId) return null;
  const session = await env.DB.prepare('SELECT * FROM sessions WHERE id = ? AND expires_at > ?').bind(sessionId, Date.now()).first();
  if (!session) return null;
  const user = await env.DB.prepare('SELECT id, email, name, avatar_url, provider, created_at FROM users WHERE id = ?').bind(session.user_id).first();
  return user ? { ...user, sessionId } : null;
}

// ===== AUTH =====
async function signup(request, env) {
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
async function login(request, env) {
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
async function googleLogin(request, env) {
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
async function logout(request, env) {
  const sessionId = getCookie(request, 'dmxhub_session');
  if (sessionId) await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
  return jsonResponse({ success: true }, 200, { 'Set-Cookie': 'dmxhub_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT' });
}
async function me(request, env) {
  const user = await getUserFromSession(request, env);
  return jsonResponse({ user: user || null });
}
async function saveProgress(request, env) {
  const user = await getUserFromSession(request, env);
  if (!user) return jsonResponse({ error: 'Login required' }, 401);
  const { movie_id, seconds, duration } = await request.json();
  if (!movie_id) return jsonResponse({ error: 'movie_id required' }, 400);
  const now = Date.now();
  await env.DB.prepare('INSERT INTO watch_progress (user_id, movie_id, seconds, duration, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, movie_id) DO UPDATE SET seconds=excluded.seconds, duration=excluded.duration, updated_at=excluded.updated_at').bind(user.id, movie_id, seconds, duration||0, now).run();
  return jsonResponse({ success: true });
}
async function getProgress(request, env, url) {
  const user = await getUserFromSession(request, env);
  if (!user) return jsonResponse({ progress: {} });
  const movieId = url.searchParams.get('movie_id');
  if (movieId) {
    const row = await env.DB.prepare('SELECT * FROM watch_progress WHERE user_id = ? AND movie_id = ?').bind(user.id, movieId).first();
    return jsonResponse({ progress: row || null });
  }
  const all = await env.DB.prepare('SELECT * FROM watch_progress WHERE user_id = ? ORDER BY updated_at DESC LIMIT 100').bind(user.id).all();
  return jsonResponse({ progress: all.results });
}
async function getReviews(request, env, url) {
  const movieId = url.searchParams.get('movie_id');
  if (!movieId) return jsonResponse({ error: 'movie_id required' }, 400);
  const reviews = await env.DB.prepare('SELECT r.*, u.name, u.avatar_url FROM reviews r LEFT JOIN users u ON r.user_id = u.id WHERE r.movie_id = ? ORDER BY r.created_at DESC LIMIT 100').bind(movieId).all();
  return jsonResponse({ reviews: reviews.results });
}
async function postReview(request, env) {
  const user = await getUserFromSession(request, env);
  const { movie_id, rating, comment, guest_name } = await request.json();
  if (!movie_id) return jsonResponse({ error: 'movie_id required' }, 400);
  if (!rating && !comment) return jsonResponse({ error: 'Rating or comment required' }, 400);
  const id = generateId(); const now = Date.now();
  await env.DB.prepare('INSERT INTO reviews (id, user_id, movie_id, rating, comment, guest_name, created_at, verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(id, user?.id||null, movie_id, rating||null, comment||null, guest_name||null, now, user?1:0).run();
  return jsonResponse({ success: true, id });
}
