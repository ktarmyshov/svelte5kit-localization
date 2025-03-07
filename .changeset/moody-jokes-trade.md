---
'svelte5kit-localization': minor
---

Ready for the first 0.1.0

Minimal breaking changes:
Too many exports from the library were removed
- extractLocales
  - moved to the LocalizationFactory
  - updated so no additional preparation of the activeLocale is necessary (see README)
- initialLoadLocalization
  - changed order of params, better readable
