import { getContext, setContext } from 'svelte';
import {
  LocalizationService,
  type ILocalizationService,
  type LoadFunction,
  type LoadResult,
  type Locale,
  type ServiceConfig
} from './service.svelte.js';

export type ImportLoadResult = {
  default: LoadResult;
};
export type ImportLoads = Record<string, () => Promise<ImportLoadResult>>;
export type ImportLoadFactory = (importFilePath: string) => LoadFunction;
export type FactoryConfig = {
  readonly browser: boolean;
  readonly contextName: string;
  readonly importDirPath: string;
  readonly importLoads: ImportLoads;
};

type Context = {
  service(): ILocalizationService;
};

class Factory {
  private static __instance: ILocalizationService | undefined = undefined;
  private static __config: FactoryConfig | undefined = undefined;
  private static __commonServiceConfig: ServiceConfig | undefined = undefined;

  public static configure(config: FactoryConfig) {
    Factory.__config = config;
  }
  public static get config(): FactoryConfig {
    if (!Factory.__config) {
      throw new Error('Localization Service Factory not initialized, use configure() first');
    }
    return Factory.__config;
  }
  public static setCommonServiceConfig(config: ServiceConfig) {
    Factory.__commonServiceConfig = config;
  }
  public static get commonServiceConfig(): ServiceConfig {
    if (!Factory.__commonServiceConfig) {
      throw new Error(
        'Localization Common Service Config not initialized, use setCommonServiceConfig() first'
      );
    }
    return Factory.__commonServiceConfig;
  }
  public static createService(config: ServiceConfig): ILocalizationService {
    if (!this.config.browser) {
      return new LocalizationService(config);
    }
    if (!this.__instance) {
      this.__instance = new LocalizationService(config);
    }
    return this.__instance;
  }
  public static getContextService(): ILocalizationService {
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
  public static setContextService(service: ILocalizationService) {
    setContext<Context>(this.config.contextName, { service: () => service });
  }
}

export interface ILocalizationFactory {
  readonly availableLocales: Locale[];
  configure(config: FactoryConfig): void;
  setCommonServiceConfig(config: ServiceConfig): void;
  importLoaderFactory(): ImportLoadFactory;
  setContextService(service: ILocalizationService): void;
  getContextService(): ILocalizationService;
  initialLoadLocalizations(
    config: Partial<ServiceConfig>,
    pathname: string
  ): Promise<ILocalizationService>;
}

export function importLoadFactory(
  importDirPath: string,
  importLoads: ImportLoads
): ImportLoadFactory {
  return (importFilePath: string): LoadFunction => {
    return async (locale: Locale) => {
      const importLocalizationPath = `${importDirPath}/${locale}/${importFilePath}`;
      const importFunc = importLoads[importLocalizationPath];
      if (!importFunc) return undefined;
      const data = (await importFunc()) as ImportLoadResult;
      return data.default;
    };
  };
}

export const LocalizationFactory: ILocalizationFactory = {
  get availableLocales(): Locale[] {
    // Scan the import map for available locales
    return Array.from(
      new Set(
        Object.keys(Factory.config.importLoads).map(
          (key) => key.substring(Factory.config.importDirPath.length + 1).split('/')[0]
        )
      )
    );
  },
  configure(config: FactoryConfig): void {
    Factory.configure(config);
  },
  setCommonServiceConfig(config: ServiceConfig): void {
    Factory.setCommonServiceConfig(config);
  },
  importLoaderFactory() {
    return importLoadFactory(Factory.config.importDirPath, Factory.config.importLoads);
  },
  setContextService(service: ILocalizationService): void {
    Factory.setContextService(service);
  },
  getContextService() {
    return Factory.getContextService();
  },
  async initialLoadLocalizations(
    config: Partial<ServiceConfig>,
    pathname: string
  ): Promise<ILocalizationService> {
    const _config = { ...Factory.commonServiceConfig, ...config };
    if (!_config.locales || _config.locales.length === 0) {
      throw new Error('Service Config must have at least one locale');
    }
    const service = Factory.createService(_config);
    await service.loadLocalizations(pathname);
    return service;
  }
};
