import { browser, dev } from '$app/environment';
import { env } from '$env/dynamic/public';
import { LocalizationFactory, type ImportLoads } from '$lib/index.js';

// Place your jsons in the folder below
// e.g. /src/lib/localization/locales/en-US/navigation.json
const isICU = env.PUBLIC_S5K_ICU === 'true';
// This is the path to the locales folder
const importDirPathNamed = '/src/routes/localization/locales/named';
const importDirPathICU = '/src/routes/localization/locales/icu';
const importDirPath = isICU ? importDirPathICU : importDirPathNamed;

// This is the glob import for the locales
const importLoadsNamed = import.meta.glob([
  '/src/routes/localization/locales/named/**/*'
]) as ImportLoads;
const importLoadsICU = import.meta.glob([
  '/src/routes/localization/locales/icu/**/*'
]) as ImportLoads;
const importLoads = isICU ? importLoadsICU : importLoadsNamed;

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
  availableLocales: ['en', 'de'],
  // Set prepare on the top level
  // IMPL: const prepare = config.prepare ?? prepareNamedFormat
  // Use this option for ICU format, so the localizations are preparsed (see impl below)
  // prepare: prepareICUFormat
  loaders: [
    {
      key: 'apples',
      load: importLoaderFactory('apples.json')
    },
    {
      key: 'prefix.oranges',
      load: importLoaderFactory('prefix/oranges.json'),
      routes: ['/oranges']
    },
    {
      key: 'regex.ananas_and_bananas',
      load: importLoaderFactory('regex/ananas_and_bananas.json'),
      // Regex that matches *anana*
      routes: [/.*ana.*/]
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
