import { IntlMessageFormat } from 'intl-messageformat';
import { SvelteMap } from 'svelte/reactivity';
import { namedFormat } from './string.js';

export type Locale = string;

export type LoadResult<V = string> = {
  [K in string]: LoadResult<V> | V;
};

export type LoadFunction = (locale: Locale) => Promise<LoadResult | undefined>;

type Key = string;
type Route = string | RegExp;
type FormatFunction = (params?: FormatParams) => string;
type PrepareFunction = (locale: Locale, format: string) => FormatFunction;
export type LoaderModule = {
  /**
   * Represents the translation namespace. This key is used as a translation prefix so it should be module-unique. You can access your translation later using `$t('key.yourTranslation')`. It shouldn't include `.` (dot) character.
   */
  key: Key;
  /**
   * Function returning a `Promise` with translation data. You can use it to load files locally, fetch it from your API etc...
   */
  load: LoadFunction;
  /**
   * Prepare function for the format. Default is `prepareNamedFormat`.
   */
  prepare?: PrepareFunction;
  /**
   * Define routes this loader should be triggered for. You can use Regular expressions too. For example `[/\/.ome/]` will be triggered for `/home` and `/rome` route as well (but still only once). Leave this `undefined` in case you want to load this module with any route (useful for common translations).
   * Regex or prefix of the route
   */
  routes?: Route[];
};

type Logger = Pick<Console, 'error' | 'warn' | 'info' | 'debug' | 'trace'>;
export interface ServiceConfig {
  locales?: Locale[];
  activeLocale?: Locale;
  prepare?: PrepareFunction;
  loaders?: LoaderModule[];
  logger?: Logger;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FormatParams = Record<string, any>;
export type TextFunction = (key: string, params?: FormatParams) => string;
export interface ILocalizationService {
  readonly locales: Locale[];
  getActiveLocale(): Locale | undefined;
  setActiveLocale(locale: string): void;
  loadLocalizations(pathname: string): Promise<void>;
  text: TextFunction;
  getPSText(prefix: string | undefined, suffix?: string): TextFunction;
}
type LocalizationMap = Map<string, FormatFunction>;
export class LocalizationService implements ILocalizationService {
  readonly #config: ServiceConfig;
  #locales: Locale[] = $state([]);
  #activeLocale: Locale | undefined = $state(undefined);
  // Loaded localizations: locale -> key -> value, flattened and expanded
  readonly #localizations: Map<Locale, LocalizationMap> = new SvelteMap();
  // Which localizations have alread been loaded: locale -> loader -> boolean
  #executedLoaders: Map<Locale, Set<LoaderModule>> = new Map();
  readonly #logger?: Logger;
  #lastLoadedPathname: string | undefined = undefined;

  constructor(config: ServiceConfig) {
    this.#config = config;
    this.#locales = config.locales ?? [];
    this.#logger = config.logger;
    this.#activeLocale = config.activeLocale;
  }

  get locales() {
    return this.#locales;
  }
  getActiveLocale = () => {
    return this.#activeLocale;
  };
  setActiveLocale = (locale: Locale) => {
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
  };
  text: TextFunction = (key: string, params?: FormatParams) => {
    if (!this.#activeLocale) return key;
    const text = this.#localizations.get(this.#activeLocale)?.get(key);
    if (!text) {
      this.#logger?.debug(
        `Translation not found for key neither in currently active locale ${this.#activeLocale} of ${this.#locales}: ${key}`
      );
      return key;
    }
    return text(params);
  };
  getPSText = (prefix: string | undefined, suffix?: string) => {
    return (key: string, params?: FormatParams) => {
      const prefixKey = prefix ? `${prefix}.${key}` : key;
      const suffixKey = suffix ? `${prefixKey}.${suffix}` : prefixKey;
      return this.text(suffixKey, params);
    };
  };
  loadLocalizations = async (pathname: string) => {
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
          const data = await loader.load(loadLocale);
          if (!data) {
            this.#logger?.debug(
              `No data loaded for locale ${loadLocale} and loader ${loader.key} [${loader.routes ?? '/*'}]`
            );
            continue;
          } else if (this.#activeLocale === undefined) {
            this.setActiveLocale(loadLocale);
          }
          const flatStringData = this.flattenLocalizationWithPrefix(loader.key, data);
          let localeLocalization = this.#localizations.get(loadLocale);
          if (!localeLocalization) {
            localeLocalization = new SvelteMap();
            this.#localizations.set(loadLocale, localeLocalization);
          }
          const prepare: PrepareFunction =
            loader.prepare ?? this.#config.prepare ?? prepareNamedFormat;
          for (const [key, value] of flatStringData) {
            localeLocalization.set(key, prepare(loadLocale, value));
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
  };

  private getRelevantLoaders(pathname: string): LoaderModule[] {
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
    localization: LoadResult
  ): Map<string, string> {
    const flatLocalization: Map<string, string> = this.flattenLocalization(localization);
    const prefix = prefixKey || prefixKey == '' ? `${prefixKey}.` : '';
    const result: Map<string, string> = new Map();
    for (const [key, value] of flatLocalization) {
      result.set(`${prefix}${key}`, value);
    }
    return result;
  }

  private flattenLocalization(localization: LoadResult): Map<string, string> {
    const result: Map<string, string> = new Map();
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

export const prepareNamedFormat: PrepareFunction = (_: Locale, value: string) => {
  return function (params?: FormatParams) {
    return namedFormat(value, params);
  };
};

export const prepareICUFormat: PrepareFunction = (locale: Locale, value: string) => {
  const msg = new IntlMessageFormat(value, locale);
  return function (params?: FormatParams) {
    return msg.format(params);
  };
};
