export type Any = { [key: string]: any };

export function combineAsKeyValuePairs<T extends string | number | symbol, U>(keys: T[], values: U[]): Record<T, U> {
  if (keys.length !== values.length) throw new Error('Keys and values must be the same length.');
  
  return keys.reduce((acc, key, index) => {
    acc[key] = values[index];
    return acc;
  }, {} as Record<T, U>);
}

type Function<T> = () => T;

export function executeIfFunction<T>(value: T | Function<T>): T {
  return typeof value === 'function' ? (value as Function<T>)() : value;
}