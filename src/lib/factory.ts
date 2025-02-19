import { getContext, setContext } from 'svelte';
import {
  LocalizationServiceImpl,
  localizationImportLoaderFactory,
  type ILocalizationService,
  type Locale,
  type LocalizationImportLoaderFactory,
  type LocalizationLoaderInput,
  type LocalizationServiceConfig
} from './service.svelte.js';

export type LocalizationFactoryConfig = {
  readonly browser: boolean;
  readonly contextName: string;
  readonly localizationsPath: string;
  readonly localizationImports: Record<string, () => Promise<{ default: LocalizationLoaderInput }>>;
};

type LocalizationFactoryContext = {
  service(): ILocalizationService;
};

class _LocalizationFactory {
  private static __instance: ILocalizationService | undefined = undefined;
  private static __config: LocalizationFactoryConfig | undefined = undefined;
  private static __commonServiceConfig: LocalizationServiceConfig | undefined = undefined;

  public static configure(config: LocalizationFactoryConfig) {
    _LocalizationFactory.__config = config;
  }
  public static get config(): LocalizationFactoryConfig {
    if (!_LocalizationFactory.__config) {
      throw new Error('Localization Service Factory not initialized, use configure() first');
    }
    return _LocalizationFactory.__config;
  }
  public static setCommonServiceConfig(config: LocalizationServiceConfig) {
    _LocalizationFactory.__commonServiceConfig = config;
  }
  public static get commonServiceConfig(): LocalizationServiceConfig {
    if (!_LocalizationFactory.__commonServiceConfig) {
      throw new Error('Localization Service Factory Common Service Config not initialized, use setCommonServiceConfig() first');
    }
    return _LocalizationFactory.__commonServiceConfig;
  }
  public static getService(config?: LocalizationServiceConfig): ILocalizationService {
    if (!this.config.browser) {
      if (!config) {
        throw new Error('ServiceConfig is required in non-browser environment');
      }
      return new LocalizationServiceImpl(config);
    }
    if (!this.__instance) {
      if (!config) {
        throw new Error(
          ' Localization service is not initialized, ServiceConfig is required in browser environment when first initializing'
        );
      }
      this.__instance = new LocalizationServiceImpl(config);
    }
    return this.__instance;
  }
  public static getContextService(config?: LocalizationServiceConfig): ILocalizationService {
    if (!this.config.browser) {
      const service = getContext<LocalizationFactoryContext | undefined>(
        this.config.contextName
      )?.service();
      if (!service) {
        throw new Error(`Localization service not found in context ${this.config.contextName}`);
      }
      return service;
    }
    return this.getService(config);
  }
  public static setContextService(service: ILocalizationService) {
    setContext<LocalizationFactoryContext>(this.config.contextName, { service: () => service });
  }
}

export interface ILocalizationFactory {
  readonly availableLocales: Locale[];
  configure(config: LocalizationFactoryConfig): void;
  setCommonServiceConfig(config: LocalizationServiceConfig): void
  importLoaderFactory(): LocalizationImportLoaderFactory;
  setContextService(service: ILocalizationService): void;
  getContextService(): ILocalizationService;
  initialLoadLocalizations(
    config: Partial<LocalizationServiceConfig>,
    pathname: string
  ): Promise<ILocalizationService>;
}

export const LocalizationFactory: ILocalizationFactory = {
  get availableLocales(): Locale[] {
    // Scan the import map for available locales
    return Array.from(
      new Set(
        Object.keys(_LocalizationFactory.config.localizationImports).map(
          (key) =>
            key.substring(_LocalizationFactory.config.localizationsPath.length + 1).split('/')[0]
        )
      )
    );
  },
  configure(config: LocalizationFactoryConfig): void {
    _LocalizationFactory.configure(config);
  },
  setCommonServiceConfig(config: LocalizationServiceConfig): void {
    _LocalizationFactory.setCommonServiceConfig(config);
  },
  importLoaderFactory() {
    return localizationImportLoaderFactory(
      _LocalizationFactory.config.localizationsPath,
      _LocalizationFactory.config.localizationImports
    );
  },
  setContextService(service: ILocalizationService): void {
    _LocalizationFactory.setContextService(service);
  },
  getContextService() {
    return _LocalizationFactory.getContextService();
  },
  async initialLoadLocalizations(
    config: Partial<LocalizationServiceConfig>,
    pathname: string
  ): Promise<ILocalizationService> {
    const _config = { ..._LocalizationFactory.commonServiceConfig, ...config };
    if (!_config.locales || _config.locales.length === 0) {
      throw new Error('ServiceConfig must have at least one locale');
    }
    const service = _LocalizationFactory.getService(_config);
    await service.loadLocalizations(pathname);
    return service;
  }
};
