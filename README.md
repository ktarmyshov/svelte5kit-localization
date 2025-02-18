# Summary
Inspired by https://github.com/sveltekit-i18n/lib.

Written for Svelte 5 reactivity.
- SSR enabled
- lazy loading

No automation yet.

# Localizations folder `src/lib/localization`
`index.ts`
```ts
import { browser, dev } from "$app/environment";
import type { LocalizationImports } from "svelte5kit-localization";
import { LocalizationKitService } from "svelte5kit-localization";

// Place your jsons in the folder below
// e.g. /src/lib/localization/locales/en-US/navigation.json
const localizationsPath = '/src/lib/localization/locales';
const localizationImports = import.meta.glob([
  '/src/lib/localization/locales/**/*',
]) as LocalizationImports;

LocalizationKitService.configure({
  browser,
  contextName: 'i18n',
  localizationsPath,
  localizationImports,
});
const importLoaderFactory = LocalizationKitService.importLoaderFactory();
LocalizationKitService.setCommonServiceConfig({
  loaders: [
    {
      key: 'navigation',
      loader: importLoaderFactory('navigation.json'),
    },
    {
      key: 'another',
      loader: importLoaderFactory('another.json'),
      routes: ['/another'],
    }
  ],
  logger: dev && browser ? console : undefined,
});

const Service = {
  initialLoadLocalizations: LocalizationKitService.initialLoadLocalizations,
  loadLocalizations: LocalizationKitService.loadLocalizations,
  localizedText: LocalizationKitService.text,
  getLocalizedPSText: LocalizationKitService.getPSText,
  setLocalizationContextService: LocalizationKitService.setContextService,
  setActiveLocale: LocalizationKitService.setActiveLocale,
  getActiveLocale: () => LocalizationKitService.activeLocale,
};

export const {
  initialLoadLocalizations,
  loadLocalizations,
  localizedText,
  getLocalizedPSText,
  setLocalizationContextService,
  setActiveLocale,
  getActiveLocale,
} = Service;
```

# Root `+layout.server.ts`
```ts
import { extractLocales } from 'svelte5kit-localization';
load(...
...
    const locales = extractLocales(event);
    ...
    return {
      ...
      locales
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
    const locales = browser ? [...navigator.languages] : event.data.locales;
    if (!locales.includes('en')) {
      locales.push('en'); // Add English as a fallback
    }
    // If activeLocale is not provided, the first locale, for which load is successful, will be set as active
    const i18n = await initialLoadLocalizations({ locales }, urlpathname);
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
  import { getLocalizationPSText, localizationText, setActiveLocale } from '$lib/localization';
  ....
  const localizationTitle = getLocalizationPSText('navigation', 'title');
  ...

  setActiveLocale('de'); // Will trigger loading (if not loaded already) for the last pathname, which was loaded

  ...
  <span>{localizationTitle('myelement')}</span> <!-- = localizationText('navigation.myelement.title') -->
  <span>{localizationText('navigation.myelement.title')}</span> <!-- same as above -->
```
