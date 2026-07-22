import { jsonResponse, getCookie } from './_utils.js';
export async function onRequestPost({ request, env }) {
  const sessionId = getCookie(request, 'dmxhub_session');
  if (sessionId) await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
  return jsonResponse({ success: true }, 200, { 'Set-Cookie': 'dmxhub_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT' });
}
