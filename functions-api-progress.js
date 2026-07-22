import { jsonResponse, getUserFromSession, generateId } from './auth/_utils.js';
export async function onRequestPost({ request, env }) {
  const user = await getUserFromSession(request, env);
  if (!user) return jsonResponse({ error: 'Login required for progress sync' }, 401);
  const { movie_id, seconds, duration } = await request.json();
  if (!movie_id) return jsonResponse({ error: 'movie_id required' }, 400);
  const now = Date.now();
  await env.DB.prepare('INSERT INTO watch_progress (user_id, movie_id, seconds, duration, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, movie_id) DO UPDATE SET seconds=excluded.seconds, duration=excluded.duration, updated_at=excluded.updated_at').bind(user.id, movie_id, seconds, duration||0, now).run();
  return jsonResponse({ success: true });
}
export async function onRequestGet({ request, env }) {
  const user = await getUserFromSession(request, env);
  if (!user) return jsonResponse({ progress: {} });
  const url = new URL(request.url); const movieId = url.searchParams.get('movie_id');
  if (movieId) {
    const row = await env.DB.prepare('SELECT * FROM watch_progress WHERE user_id = ? AND movie_id = ?').bind(user.id, movieId).first();
    return jsonResponse({ progress: row || null });
  }
  const all = await env.DB.prepare('SELECT * FROM watch_progress WHERE user_id = ? ORDER BY updated_at DESC LIMIT 100').bind(user.id).all();
  return jsonResponse({ progress: all.results });
}
