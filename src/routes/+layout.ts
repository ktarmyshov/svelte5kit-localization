import type { LayoutLoadEvent } from './$types.js';
import { initialLoadLocalizations } from './localization/index.js';

export async function load(event: LayoutLoadEvent) {
  // Get url path without tracking
  // Otherwise this will trigger on every navigation
  const urlpathname = event.untrack(() => event.url.pathname);
  console.log('load: urlpathname', urlpathname);
  const i18n = await initialLoadLocalizations(urlpathname, {
    activeLocale: event.data.i18n.activeLocale
  });
  return {
    i18n
  };
}
