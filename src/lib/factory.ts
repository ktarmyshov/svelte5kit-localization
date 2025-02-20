import { getContext, setContext } from 'svelte';
import {
  LocalizationService,
  type ILocalizationService,
  type LoadFunction,
  type LoadResult,
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

export type CommonServiceConfig = Omit<ServiceConfig, 'activeLocale'>;
export type InitialServiceConfig = Partial<ServiceConfig> & Pick<ServiceConfig, 'activeLocale'>;

class Factory {
  private static __instance: ILocalizationService | undefined = undefined;
  private static __config: FactoryConfig | undefined = undefined;
  private static __commonServiceConfig: CommonServiceConfig | undefined = undefined;

  public static configure(config: FactoryConfig) {
    Factory.__config = config;
  }
  public static get config(): FactoryConfig {
    if (!Factory.__config) {
      throw new Error('Localization Service Factory not initialized, use configure() first');
    }
    return Factory.__config;
  }
  public static setCommonServiceConfig(config: CommonServiceConfig) {
    if (config.availableLocales.length === 0) {
      throw new Error('At least one available locale must be provided');
    }
    Factory.__commonServiceConfig = config;
  }
  public static get commonServiceConfig(): CommonServiceConfig {
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
  configure(config: FactoryConfig): void;
  config: FactoryConfig;
  setCommonServiceConfig(config: CommonServiceConfig): void;
  commonServiceConfig: CommonServiceConfig;
  importLoaderFactory(): ImportLoadFactory;
  setContextService(service: ILocalizationService): void;
  getContextService(): ILocalizationService;
  initialLoadLocalizations(
    config: InitialServiceConfig,
    pathname: string
  ): Promise<ILocalizationService>;
}

export function importLoadFactory(
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

export const LocalizationFactory: ILocalizationFactory = {
  configure(config: FactoryConfig): void {
    Factory.configure(config);
  },
  get config() {
    return Factory.config;
  },
  setCommonServiceConfig(config: CommonServiceConfig): void {
    Factory.setCommonServiceConfig(config);
  },
  get commonServiceConfig() {
    return Factory.commonServiceConfig;
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
    config: InitialServiceConfig,
    pathname: string
  ): Promise<ILocalizationService> {
    const _config = { ...Factory.commonServiceConfig, ...config };
    if (!_config.activeLocale) {
      throw new Error('activeLocale is required in initialLoadLocalizations');
    }
    const service = Factory.createService(_config);
    await service.loadLocalizations(pathname);
    return service;
  }
};
