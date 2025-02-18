import { getContext, setContext } from 'svelte';
import {
  localizationImportLoaderFactory,
  LocalizationService,
  type ILocalizationService,
  type Locale,
  type LocalizationImportLoaderFactory,
  type LocalizationLoaderInput,
  type LocalizationServiceConfig,
  type LocalizationTextFunction
} from './service.svelte';

export type LocalizationKitServiceConfig = {
  readonly browser: boolean;
  readonly contextName: string;
  readonly localizationsPath: string;
  readonly localizationImports: Record<string, () => Promise<{ default: LocalizationLoaderInput }>>;
};

export type LocalizationKitServiceContext = {
  service(): ILocalizationService;
};

export class LocalizationKitFactory {
  private static __instance: ILocalizationService | undefined = undefined;
  private static __config: LocalizationKitServiceConfig | undefined = undefined;
  private static __commonServiceConfig: LocalizationServiceConfig | undefined = undefined;

  public static configure(config: LocalizationKitServiceConfig) {
    LocalizationKitFactory.__config = config;
  }
  public static get config(): LocalizationKitServiceConfig {
    if (!LocalizationKitFactory.__config) {
      throw new Error('Localization Service Factory not initialized, use configure() first');
    }
    return LocalizationKitFactory.__config;
  }
  public static setCommonServiceConfig(config: LocalizationServiceConfig) {
    LocalizationKitFactory.__commonServiceConfig = config;
  }
  public static get commonServiceConfig(): LocalizationServiceConfig {
    if (!LocalizationKitFactory.__commonServiceConfig) {
      throw new Error(
        'Localization Service Factory Common config not initialized, use setCommonServiceConfig() first'
      );
    }
    return LocalizationKitFactory.__commonServiceConfig;
  }
  public static getService(config?: LocalizationServiceConfig): ILocalizationService {
    if (!this.config.browser) {
      if (!config) {
        throw new Error('ServiceConfig is required in non-browser environment');
      }
      return new LocalizationService(config);
    }
    if (!this.__instance) {
      if (!config) {
        throw new Error(
          ' Localization service is not initialized, ServiceConfig is required in browser environment when first initializing'
        );
      }
      this.__instance = new LocalizationService(config);
    }
    return this.__instance;
  }
  public static getContextService(config?: LocalizationServiceConfig): ILocalizationService {
    if (!this.config.browser) {
      const service = getContext<LocalizationKitServiceContext | undefined>(
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
    setContext<LocalizationKitServiceContext>(this.config.contextName, { service: () => service });
  }
}

export interface ILocalizationKitService extends ILocalizationService {
  // Additional factory methods
  configure(config: LocalizationKitServiceConfig): void;
  setCommonServiceConfig(config: LocalizationServiceConfig): void;
  importLoaderFactory(): LocalizationImportLoaderFactory;
  setContextService(service: ILocalizationService): void;
  initialLoadLocalizations(
    config: Partial<LocalizationServiceConfig>,
    pathname: string
  ): Promise<ILocalizationService>;
}

export const LocalizationKitService: ILocalizationKitService = {
  // IService methods
  get locales(): Locale[] {
    return LocalizationKitFactory.getContextService().locales;
  },
  get activeLocale(): Locale | undefined {
    return LocalizationKitFactory.getContextService().activeLocale;
  },
  setActiveLocale(locale: string): void {
    LocalizationKitFactory.getContextService().setActiveLocale(locale);
  },
  loadLocalizations(pathname: string): Promise<void> {
    return LocalizationKitFactory.getContextService().loadLocalizations(pathname);
  },
  text(key: string): string {
    return LocalizationKitFactory.getContextService().text(key);
  },
  getPSText(prefix: string | undefined, suffix?: string): LocalizationTextFunction {
    return LocalizationKitFactory.getContextService().getPSText(prefix, suffix);
  },
  // Additional factory methods
  configure(config: LocalizationKitServiceConfig): void {
    LocalizationKitFactory.configure(config);
  },
  setCommonServiceConfig(config: LocalizationServiceConfig): void {
    LocalizationKitFactory.setCommonServiceConfig(config);
  },
  importLoaderFactory() {
    return localizationImportLoaderFactory(
      LocalizationKitFactory.config.localizationsPath,
      LocalizationKitFactory.config.localizationImports
    );
  },
  setContextService(service: ILocalizationService): void {
    LocalizationKitFactory.setContextService(service);
  },
  async initialLoadLocalizations(
    config: Partial<LocalizationServiceConfig>,
    pathname: string
  ): Promise<ILocalizationService> {
    const _config = { ...LocalizationKitFactory.commonServiceConfig, ...config };
    if (!_config.locales || _config.locales.length === 0) {
      throw new Error('ServiceConfig must have at least one locale');
    }
    const service = LocalizationKitFactory.getService(_config);
    await service.loadLocalizations(pathname);
    return service;
  }
};
