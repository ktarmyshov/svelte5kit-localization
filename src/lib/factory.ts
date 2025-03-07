import type { ServerLoadEvent } from '@sveltejs/kit';
import { getContext, setContext } from 'svelte';
import {
  LocalizationService,
  type ILocalizationService,
  type LoadFunction,
  type LoadResult,
  type ServiceConfig
} from './service.svelte.js';

type ImportLoadResult = {
  default: LoadResult;
};
export type ImportLoads = Record<string, () => Promise<ImportLoadResult>>;
type CommonServiceConfig = Omit<ServiceConfig, 'activeLocale'>;
type InitialServiceConfig = Partial<ServiceConfig> & Pick<ServiceConfig, 'activeLocale'>;
type ExtractedLocales = {
  availableLocales: string[];
  requestedLocales: string[];
  activeLocale: string;
};
type ActiveLocaleSearchOptions = {
  params?: string[];
  searchParams?: string[];
  cookies?: string[];
};
const DefaultActiveLocaleSearchOptions: ActiveLocaleSearchOptions = {
  params: ['lang', 'locale', 'language'],
  searchParams: ['lang', 'locale', 'language'],
  cookies: ['lang', 'locale', 'language']
};

type FactoryConfig = {
  readonly browser: boolean;
  readonly contextName: string;
  readonly importDirPath: string;
  readonly importLoads: ImportLoads;
};
type ImportLoadFactory = (importFilePath: string) => LoadFunction;

export interface ILocalizationFactory {
  configure(config: FactoryConfig): void;
  config: FactoryConfig;
  setCommonServiceConfig(config: CommonServiceConfig): void;
  commonServiceConfig: CommonServiceConfig;
  importLoaderFactory(): ImportLoadFactory;
  extractLocales(event: ServerLoadEvent, searchOptions?: ActiveLocaleSearchOptions): ExtractedLocales;
  setContextService(service: ILocalizationService): void;
  getContextService(): ILocalizationService;
  initialLoadLocalizations(
    pathname: string,
    config: InitialServiceConfig,
  ): Promise<ILocalizationService>;
}

type Context = {
  service(): ILocalizationService;
};

class LocalizationFactoryImpl implements ILocalizationFactory {
  private __instance: ILocalizationService | undefined = undefined;
  private __config: FactoryConfig | undefined = undefined;
  private __commonServiceConfig: CommonServiceConfig | undefined = undefined;

  configure = (config: FactoryConfig) => {
    this.__config = config;
  }
  get config() {
    if (!this.__config) {
      throw new Error('Localization Service Factory not initialized, use configure() first');
    }
    return this.__config;
  }
  setCommonServiceConfig = (config: CommonServiceConfig) => {
    if (config.availableLocales.length === 0) {
      throw new Error('At least one available locale must be provided');
    }
    this.__commonServiceConfig = config;
  }
  get commonServiceConfig(): CommonServiceConfig {
    if (!this.__commonServiceConfig) {
      throw new Error(
        'Localization Common Service Config not initialized, use setCommonServiceConfig() first'
      );
    }
    return this.__commonServiceConfig;
  }
  importLoaderFactory = () => {
    return importLoaderFactory(this.config.importDirPath, this.config.importLoads);
  }
  extractLocales = (event: ServerLoadEvent, searchOptions: ActiveLocaleSearchOptions = DefaultActiveLocaleSearchOptions): ExtractedLocales => {
    return event.untrack(() => {
      const availableLocales = this.commonServiceConfig.availableLocales;
      // Extract requested locales from headers or from navigator
      const requestedLocales = this.__config?.browser ? [...navigator.languages] :
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
      // If nothing was found use the first available locale
      if (!activeLocale) {
        activeLocale = requestedLocales.find((locale) => availableLocales.includes(locale)) ||
          availableLocales[0];
      }
      return {
        availableLocales,
        requestedLocales,
        activeLocale
      };
    });
  }
  getContextService = (): ILocalizationService => {
    if (!this.config.browser) {
      const service = getContext<Context | undefined>(this.config.contextName)?.service();
      if (!service) {
        throw new Error(`Localization service not found in context ${this.config.contextName}`);
      }
      return service;
    }
    if (!this.__instance) {
      throw new Error(
        'Localization service is not initialized, use initialLoadLocalizations() first'
      );
    }
    return this.__instance;
  }
  setContextService = (service: ILocalizationService) => {
    setContext<Context>(this.config.contextName, { service: () => service });
  }
  initialLoadLocalizations = async (
    pathname: string,
    config: InitialServiceConfig,
  ): Promise<ILocalizationService> => {
    const _config = { ...this.commonServiceConfig, ...config };
    if (!_config.activeLocale) {
      throw new Error('activeLocale is required in initialLoadLocalizations');
    }
    const service = this.createService(_config);
    await service.loadLocalizations(pathname);
    return service;
  }
  private createService = (config: ServiceConfig): ILocalizationService => {
    if (!this.config.browser) {
      return new LocalizationService(config);
    }
    if (!this.__instance) {
      this.__instance = new LocalizationService(config);
    }
    return this.__instance;
  }
}


function importLoaderFactory(
  importDirPath: string,
  importLoads: ImportLoads
): ImportLoadFactory {
  return (importFilePath: string): LoadFunction => {
    return async (locale: string) => {
      const importLocalizationPath = `${importDirPath}/${locale}/${importFilePath}`;
      const importFunc = importLoads[importLocalizationPath];
      if (!importFunc) return undefined;
      const data = (await importFunc()) as ImportLoadResult;
      return data.default;
    };
  };
}

export const LocalizationFactory: ILocalizationFactory = new LocalizationFactoryImpl();
