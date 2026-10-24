// Every HTML page: the stylesheet, font, script and favicon come from the site
// itself, and avatars from GitHub.
export const PAGE_CSP = "default-src 'self'; img-src 'self' https://avatars.githubusercontent.com; style-src 'self' 'unsafe-inline'; base-uri 'self'; form-action 'self'";

export function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
}

export function html(body: string, init?: ResponseInit): Response {
  return new Response(body, {
    ...init,
    headers: { 'content-type': 'text/html; charset=utf-8', ...(init?.headers ?? {}) },
  });
}

export function error(status: number, message: string): Response {
  return json({ error: message }, { status });
}
