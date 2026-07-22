import { jsonResponse, getUserFromSession } from './_utils.js';
export async function onRequestGet({ request, env }) {
  const user = await getUserFromSession(request, env);
  return jsonResponse({ user: user || null });
}
