import { SvelteMap } from 'svelte/reactivity';

export type LocalizationTextFunction = (key: string, comment?: string) => string;
type LocalizationMap = Map<string, string>;
export type Locale = string;
type Key = string;
type Route = string | RegExp;

export type LocalizationLoaderInput<V = string> = {
  [K in Exclude<string, 'comment'>]: LocalizationLoaderInput<V> | V;
};

export type LocalizationLoaderFunction = (
  locale: Locale
) => Promise<LocalizationLoaderInput | undefined>;
export type LocalizationLoaderModule = {
  /**
   * Represents the translation namespace. This key is used as a translation prefix so it should be module-unique. You can access your translation later using `$t('key.yourTranslation')`. It shouldn't include `.` (dot) character.
   */
  key: Key;
  /**
   * Function returning a `Promise` with translation data. You can use it to load files locally, fetch it from your API etc...
   */
  loader: LocalizationLoaderFunction;
  /**
   * Define routes this loader should be triggered for. You can use Regular expressions too. For example `[/\/.ome/]` will be triggered for `/home` and `/rome` route as well (but still only once). Leave this `undefined` in case you want to load this module with any route (useful for common translations).
   * Regex or prefix of the route
   */
  routes?: Route[];
};

type Logger = Pick<Console, 'error' | 'warn' | 'info' | 'debug' | 'trace'>;

export interface LocalizationServiceConfig {
  locales?: Locale[];
  activeLocale?: Locale;
  loaders?: LocalizationLoaderModule[];
  logger?: Logger;
}

export interface ILocalizationService {
  locales: Locale[];
  activeLocale: Locale | undefined;
  setActiveLocale(locale: string): void;
  loadLocalizations(pathname: string): Promise<void>;
  text(key: string, comment?: string): string;
  getPSText(prefix: string | undefined, suffix?: string): LocalizationTextFunction;
}

export class LocalizationService implements ILocalizationService {
  readonly #config: LocalizationServiceConfig;
  #locales: Locale[] = $state([]);
  #activeLocale: Locale | undefined = $state(undefined);
  // Loaded localizations: locale -> key -> value, flattened and expanded
  readonly #localizations: Map<string, LocalizationMap> = new SvelteMap();
  // Which localizations have alread been loaded: locale -> loader -> boolean
  #executedLoaders: Map<string, Set<LocalizationLoaderModule>> = new Map();
  readonly #logger?: Logger;
  #lastLoadedPathname: string | undefined = undefined;

  constructor(config: LocalizationServiceConfig) {
    this.#config = config;
    this.#locales = config.locales ?? [];
    this.#logger = config.logger;
    this.#activeLocale = config.activeLocale;
  }

  get locales() {
    return this.#locales;
  }
  get activeLocale() {
    return this.#activeLocale;
  }
  setActiveLocale(locale: Locale): void {
    if (this.#activeLocale === locale) return;
    this.#activeLocale = locale;
    if (!this.#locales.includes(locale)) {
      this.#locales.push(locale);
    }
    if (this.#lastLoadedPathname) {
      this.#logger?.debug(
        `Reloading localizations for locale ${locale} and pathname ${this.#lastLoadedPathname}`
      );
      this.loadLocalizations(this.#lastLoadedPathname);
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  text(key: string, comment?: string): string {
    if (!this.#activeLocale) return key;
    const text = this.#localizations.get(this.#activeLocale)?.get(key);
    if (!text) {
      this.#logger?.debug(
        `Translation not found for key neither in currently active locale ${this.activeLocale} of ${this.#locales}: ${key}`
      );
    }
    return text || key;
  }
  getPSText(prefix: string | undefined, suffix?: string): LocalizationTextFunction {
    return (key: string, comment?: string) => {
      const prefixKey = prefix ? `${prefix}.${key}` : key;
      const suffixKey = suffix ? `${prefixKey}.${suffix}` : prefixKey;
      return this.text(suffixKey, comment);
    };
  }
  async loadLocalizations(pathname: string): Promise<void> {
    if (pathname === '') throw new Error('Pathname must not be empty');
    // Do not react to locale changes in this method
    const loadLocales = this.#activeLocale ? [this.#activeLocale] : this.#locales;
    // Get relevant loaders
    const loaders = this.getRelevantLoaders(pathname);
    for (const loader of loaders) {
      for (const loadLocale of loadLocales) {
        if (this.#executedLoaders.get(loadLocale)?.has(loader)) continue;
        let localeExecutedLoaders = this.#executedLoaders.get(loadLocale);
        if (!localeExecutedLoaders) {
          localeExecutedLoaders = new Set([loader]);
          this.#executedLoaders.set(loadLocale, localeExecutedLoaders);
        } else {
          localeExecutedLoaders.add(loader);
        }
        try {
          const data = await loader.loader(loadLocale);
          if (!data) {
            this.#logger?.debug(
              `No data loaded for locale ${loadLocale} and loader ${loader.key} [${loader.routes ?? '/*'}]`
            );
            continue;
          } else if (this.#activeLocale === undefined) {
            this.setActiveLocale(loadLocale);
          }
          const flatData = this.flattenLocalizationWithPrefix(loader.key, data);
          let localeLocalization = this.#localizations.get(loadLocale);
          if (!localeLocalization) {
            localeLocalization = new SvelteMap(flatData);
            this.#localizations.set(loadLocale, localeLocalization);
          } else {
            for (const [key, value] of flatData) {
              localeLocalization.set(key, value);
            }
          }
          // Successfully loaded, no need to try other locales
          break;
        } catch (error) {
          this.#logger?.debug(
            `Failed to load localization for locale ${loadLocale} and loader ${loader.key}/${loader.routes ?? 'all'}: ${error}`
          );
        }
      }
      this.#lastLoadedPathname = pathname;
    }
  }

  private getRelevantLoaders(pathname: string): LocalizationLoaderModule[] {
    return (
      this.#config.loaders?.filter((loader) => {
        if (!loader.routes || loader.routes.length === 0) return true;
        return loader.routes?.some((route) => {
          if (typeof route === 'string') {
            return pathname.startsWith(route);
          }
          return route.test(pathname);
        });
      }) || []
    );
  }

  private flattenLocalizationWithPrefix(
    prefixKey: Key | undefined,
    localization: LocalizationLoaderInput
  ): LocalizationMap {
    const flatLocalization: LocalizationMap = this.flattenLocalization(localization);
    const prefix = prefixKey || prefixKey == '' ? `${prefixKey}.` : '';
    const result: LocalizationMap = new SvelteMap();
    for (const [key, value] of flatLocalization) {
      result.set(`${prefix}${key}`, value);
    }
    return result;
  }

  private flattenLocalization(localization: LocalizationLoaderInput): LocalizationMap {
    const result: LocalizationMap = new Map();
    for (const key in localization) {
      const value = localization[key];
      if (typeof value === 'object') {
        const nested = this.flattenLocalization(value);
        for (const [nestedKey, nestedValue] of nested) {
          result.set(key + '.' + nestedKey, nestedValue);
        }
      } else {
        result.set(key, value);
      }
    }
    return result;
  }
}

export type LocalizationImportLoaderInput = { default: LocalizationLoaderInput };
export type LocalizationImports = Record<string, () => Promise<LocalizationImportLoaderInput>>;
export type LocalizationImportLoaderFactory = (importPath: string) => LocalizationLoaderFunction;
export function localizationImportLoaderFactory(
  localizationsPath: string,
  importLocalizations: LocalizationImports
): LocalizationImportLoaderFactory {
  return (importPath: string): LocalizationLoaderFunction => {
    return async (locale: Locale) => {
      const importLocalizationPath = `${localizationsPath}/${locale}/${importPath}`;
      const importFunc = importLocalizations[importLocalizationPath];
      if (!importFunc) return undefined;
      const data = (await importFunc()) as LocalizationImportLoaderInput;
      return data.default;
    };
  };
}
