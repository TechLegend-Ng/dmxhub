import { jsonResponse, getUserFromSession, generateId } from './auth/_utils.js';
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url); const movieId = url.searchParams.get('movie_id');
  if (!movieId) return jsonResponse({ error: 'movie_id required' }, 400);
  const reviews = await env.DB.prepare('SELECT r.*, u.name, u.avatar_url FROM reviews r LEFT JOIN users u ON r.user_id = u.id WHERE r.movie_id = ? ORDER BY r.created_at DESC LIMIT 100').bind(movieId).all();
  return jsonResponse({ reviews: reviews.results });
}
export async function onRequestPost({ request, env }) {
  const user = await getUserFromSession(request, env);
  const { movie_id, rating, comment, guest_name } = await request.json();
  if (!movie_id) return jsonResponse({ error: 'movie_id required' }, 400);
  if (!rating && !comment) return jsonResponse({ error: 'Rating or comment required' }, 400);
  const id = generateId(); const now = Date.now();
  await env.DB.prepare('INSERT INTO reviews (id, user_id, movie_id, rating, comment, guest_name, created_at, verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(id, user?.id||null, movie_id, rating||null, comment||null, guest_name||null, now, user?1:0).run();
  return jsonResponse({ success: true, id });
}
