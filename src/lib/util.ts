import type { RequestEvent } from "@sveltejs/kit";

export function extractLocales(event: RequestEvent): string[] {
  const locales = event.request.headers
    .get('accept-language')
    ?.split(',')
    .map((locale) => locale.split(';', 1)[0]) ?? ['en'];
  return locales;
}
