
export const isObject = (o: any) => typeof o === 'object' && o !== null;
export const isArray = Array.isArray;
export const isNull = (o: any) => o === null;
export const isUndefined = (o: any) => typeof o === 'undefined';
export const isNumber = (n: any): n is number => typeof n === 'number';
export const unique = <T>(a: ReadonlyArray<T>) => Array.from(new Set(a));
export const setDifference = <T>(a: Set<T>, b: Set<T>) =>
    ([...(a as any)].filter(x => !b.has(x)));
