// The gem from the top bar on the dark background, its facets in fixed colors
// because a favicon cannot read the page's tokens. Same as assets/favicon.svg.
export const FAVICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0B0A0F"/><g transform="translate(7 7) scale(.78)"><path fill="#C4B5FD" d="M32 4 4 30 28 34Z"/><path fill="#A78BFA" d="M32 4 28 34 60 30Z"/><path fill="#7C3AED" d="M4 30 32 60 28 34Z"/><path fill="#5B21B6" d="M28 34 32 60 60 30Z"/></g></svg>';

export function faviconResponse(): Response {
  return new Response(FAVICON_SVG, {
    headers: {
      'content-type': 'image/svg+xml',
      'cache-control': 'public, max-age=86400',
    },
  });
}
