export function namedFormat(
  str: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  replacements?: Record<string, any>
): string {
  return str.replace(/{([^{}]*)}/g, function (match, key) {
    return replacements?.[key] ? `${replacements[key]}` : match;
  });
}
