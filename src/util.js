export function toArray(x) {
  return [x].flat();
}

export function escapeSingleQuotedYamlString(s) {
  return s.replaceAll("'", "''");
}

export function aliasIfNeeded(sanitized, original) {
  if (sanitized === original) {
    return sanitized;
  }

  return `${sanitized}|${original.replaceAll('|', '')}`;
}

export function pick(obj, propTransformers) {
  const entries = Object.entries(propTransformers).map(([key, transformer]) => {
    const value = (
      {
        string: () => obj[transformer],
        function: () => transformer(obj[key], obj, key),
      }[typeof transformer] ?? (() => obj[key])
    )();

    return [key, value];
  });

  return Object.fromEntries(entries);
}
