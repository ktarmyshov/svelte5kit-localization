[![CI](https://github.com/ktarmyshov/svelte5kit-localization/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/ktarmyshov/svelte5kit-localization/actions/workflows/ci.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=ktarmyshov_svelte-adapter-azure-swa&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=ktarmyshov_svelte-adapter-azure-swa)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=ktarmyshov_svelte-adapter-azure-swa&metric=bugs)](https://sonarcloud.io/summary/new_code?id=ktarmyshov_svelte-adapter-azure-swa)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=ktarmyshov_svelte-adapter-azure-swa&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=ktarmyshov_svelte-adapter-azure-swa)
[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=ktarmyshov_svelte-adapter-azure-swa&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=ktarmyshov_svelte-adapter-azure-swa)

# Summary

Localization for SvelteKit with Svelte 5 reactivity.

- SSR enabled
- lazy loading
- some DX improvements
- named format (custom see below)
- ICU format (via 'intl-messageformat'), not tested yet

Not all tested thoroughly.

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
  // Set prepare on the top level
  // IMPL: const prepare = config.prepare ?? prepareNamedFormat
  // Use this option for ICU format, so the localizations are preparsed (see impl below)
  // prepare: prepareICUFormat
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
  getContextService: getLocalizationContextService,
  extractLocales
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
import { extractLocales } from '$lib/localization';
load(...
...
    ...
    return {
      ...
      // extractLocales uses event.untrack to extract data, so it won't trigger reload
      // Default search options for the active locale
      // The requested locales are extracted from the headers on the server side or from navigator.languages on the client side
      // const DefaultActiveLocaleSearchOptions: ActiveLocaleSearchOptions = {
      //   params: ['lang', 'locale', 'language'],
      //   searchParams: ['lang', 'locale', 'language'],
      //   cookies: ['lang', 'locale', 'language']
      // };
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
    const i18n = await initialLoadLocalizations(
      urlpathname,
      {
        activeLocale: event.data.i18n.activeLocale
      },
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

  // default fallback
  // Avoid using with the ICU format, because this will cause additional parsing on the request
  text('my.some.key.maybeformat', {param1: "whatever", default:"Hi, {name}!"})

  // Will trigger loading (if not loaded already) for the last pathname, which was loaded
  setActiveLocale('de');

  ...
  <span>{text('my.some.key.maybeformat', {param1: "whatever"})}</span>
  <span>{pstext('my.some', {param1: "whatever"})}</span> <!-- same as above -->
  <span>{text('my.some.key.maybeformat', {param1: "whatever", default:"Hi, {name}!"})}</span>
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
export const prepareNamedFormat: PrepareFunction = (_: string, value: string) => {
  return function (params?: FormatParams) {
    return namedFormat(value, params);
  };
};
```

# ICU format prepare function

```ts
export const prepareICUFormat: PrepareFunction = (locale: string, value: string) => {
  const msg = new IntlMessageFormat(value, locale);
  return function (params?: FormatParams) {
    return msg.format(params);
  };
};
```
