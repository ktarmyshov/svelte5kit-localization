export function namedFormat(str: string, replacements?: Record<string, string | undefined>): string {
  return str.replace(/{([^{}]*)}/g, function (match, key) {
    return replacements?.[key] || match;
  });
}
