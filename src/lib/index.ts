// Reexport your entry components here
export {
  LocalizationFactory,
  type ILocalizationFactory,
  type LocalizationFactoryConfig
} from './factory.js';
export {
  localizationImportLoaderFactory,
  LocalizationServiceImpl,
  type ILocalizationService,
  type Locale,
  type LocalizationImportLoaderFactory,
  type LocalizationImportLoaderInput,
  type LocalizationImports,
  type LocalizationLoaderFunction,
  type LocalizationLoaderInput,
  type LocalizationLoaderModule,
  type LocalizationServiceConfig,
  type LocalizationTextFunction
} from './service.svelte.js';
export { namedFormat } from './string.js';
export { extractLocales } from './util.js';

