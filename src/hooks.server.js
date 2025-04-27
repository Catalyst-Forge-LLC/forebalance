/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  if (event.url.pathname.startsWith('/.well-known')) {
    return new Response(null, { status: 404 }); // Silently return 404
  }
  return await resolve(event);
}
