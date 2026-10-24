import OG_PNG from '../../assets/og.png';

export function ogImageResponse(): Response {
  return new Response(OG_PNG, {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=86400',
    },
  });
}
