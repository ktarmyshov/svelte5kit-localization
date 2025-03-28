import type { LayoutServerLoadEvent } from './$types.js';
import { extractLocales } from './localization/index.js';

export async function load(event: LayoutServerLoadEvent) {
  const i18n = extractLocales(event);
  console.log('i18n', JSON.stringify(i18n, null, 2));
  return {
    i18n
  };
}
