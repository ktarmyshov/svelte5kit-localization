# Summary

Inspired by https://github.com/sveltekit-i18n/lib.

Written for Svelte 5 reactivity.

- SSR enabled
- lazy loading
- some DX improvements
- named format (custom see below)
- IUC format (via 'intl-messageformat'), not tested yet

No automation yet.

# Localizations folder `src/lib/localization`

`index.ts`

```ts
import { browser, dev } from '$app/environment';
import { LocalizationFactory, type ImportLoads } from 'svelte5kit-localization';

// Place your jsons in the folder below
// e.g. /src/lib/localization/locales/en-US/navigation.json
const importDirPath = '/src/lib/localization/locales';
const importLoads = import.meta.glob(['/src/lib/localization/locales/**/*']) as ImportLoads;
// Configure the factory
LocalizationFactory.configure({
  browser,
  contextName: 'i18n',
  importDirPath,
  importLoads
});
// Now configure the service
const importLoaderFactory = LocalizationFactory.importLoaderFactory();
LocalizationFactory.setCommonServiceConfig({
  availableLocales: ['en'],
  loaders: [
    {
      key: 'navigation',
      load: importLoaderFactory('navigation.json')
    },
    {
      key: 'another',
      load: importLoaderFactory('another.json'),
      routes: ['/onemore']
    }
  ],
  logger: dev && browser ? console : undefined
});

export const {
  initialLoadLocalizations,
  setContextService: setLocalizationContextService,
  getContextService: getLocalizationContextService
} = LocalizationFactory;

export function loadLocalizations(pathname: string) {
  return getLocalizationContextService().loadLocalizations(pathname);
}
export function setActiveLocale(locale: string) {
  return getLocalizationContextService().setActiveLocale(locale);
}
```

# Root `+layout.server.ts`

```ts
import { extractLocales } from 'svelte5kit-localization';
load(...
...
    ...
    return {
      ...
      // extractLocales uses event.untrack to extract all locales, so it won't trigger reload
      i18n: extractLocales(event),
    };
```

# Root `+layout.ts`

```ts
import { initialLoadLocalizations } from '$lib/localization';
load(...
...
    // Get url path without tracking
    // Otherwise this will trigger on every navigation
    const urlpathname = event.untrack(() => event.url.pathname);
    const requestedLocales = browser ? [...navigator.languages] : event.data.i18n.requestedLocales;
    // Find the first requested locale that is available
    const availableLocales = LocalizationFactory.commonServiceConfig.availableLocales;
    const activeLocale = requestedLocales.find(
      (locale) => availableLocales.includes(locale)
    ) || availableLocales[0];
    const i18n = await initialLoadLocalizations(
      {
        activeLocale: activeLocale
      },
      urlpathname
    );
    ...
    return {
      ...
      i18n
    }
```

# Root `+layout.svelte`

```ts
  import { loadLocalizations, setLocalizationContextService } from '$lib/localization';
  ...
  // Set Localization Context Service
  setLocalizationContextService(data.i18n);
  beforeNavigate((navigation) => {
    if (navigation.to?.url.pathname) {
      loadLocalizations(navigation.to.url.pathname);
    }
  });
  ...
```

# Somewhere in your `myComponent.svelte`

```ts
  import { getLocalizationContextService } from '$lib/localization';
  ....
  const { text, getPSText, setActiveLocale } = getLocalizationContextService();
  ...
  text('my.some.key.maybeformat', {param1: "whatever"});
  const pstext = getPSText('prefix', 'suffix');
  pstext('my.some', {param1: "whatever"}); // = text('prefix.my.some.suffix')

  // Will trigger loading (if not loaded already) for the last pathname, which was loaded
  setActiveLocale('de');

  ...
  <span>{text('my.some.key.maybeformat', {param1: "whatever"})}</span>
  <span>{pstext('my.some', {param1: "whatever"})}</span> <!-- same as above -->
```

# Named format

## Implementation

```ts
export function namedFormat(
  str: string,
  replacements?: Record<string, string | undefined>
): string {
  return str.replace(/{([^{}]*)}/g, function (match, key) {
    return replacements?.[key] || match;
  });
}
```

## Prepare function

```ts
export const prepareNamedFormat: PrepareFunction = (_: Locale, value: string) => {
  return function (params?: FormatParams) {
    return namedFormat(value, params);
  };
};
```

# ICU format prepare function

```ts
export const prepareICUFormat: PrepareFunction = (locale: Locale, value: string) => {
  const msg = new IntlMessageFormat(value, locale);
  return function (params?: FormatParams) {
    return msg.format(params);
  };
};
```
