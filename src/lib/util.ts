import type { ServerLoadEvent } from '@sveltejs/kit';

export type ExtractedLocales = {
  requestedLocales: string[];
  activeLocale?: string;
};
type SearchOptions = {
  params?: string[];
  searchParams?: string[];
  cookies?: string[];
};
export function extractLocales(
  event: ServerLoadEvent,
  searchOptions: SearchOptions | undefined = {
    params: ['lang', 'locale', 'language'],
    searchParams: ['lang', 'locale', 'language'],
    cookies: ['lang', 'locale', 'language']
  }
): ExtractedLocales {
  return event.untrack(() => {
    // Extract requested locales from headers
    const requestedLocales =
      event.request.headers
        .get('accept-language')
        ?.split(',')
        .map((locale) => locale.split(';', 1)[0]) ?? [];
    // Now try to finde the active locale
    let activeLocale: string | null | undefined = undefined;
    // Check event params
    if (searchOptions.params) {
      for (const param of searchOptions.params) {
        if (event.params[param]) {
          activeLocale = event.params[param] as string;
          break;
        }
      }
    }
    // Check event cookies
    if (!activeLocale && searchOptions.cookies) {
      for (const param of searchOptions.cookies) {
        activeLocale = event.cookies.get(param);
        if (activeLocale) {
          break;
        }
      }
    }
    // Check event query
    if (!activeLocale && searchOptions.searchParams) {
      for (const param of searchOptions.searchParams) {
        activeLocale = event.url.searchParams.get(param);
        if (activeLocale) {
          break;
        }
      }
    }
    return {
      requestedLocales,
      activeLocale: activeLocale ?? undefined
    };
  });
}
