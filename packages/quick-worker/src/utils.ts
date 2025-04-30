export function generateUUID(): string {
  return new Array(4)
    .fill(0)
    .map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16))
    .join('-');
}

export function isAllowedOrigin(allowedOrigins: (string | RegExp)[], origin: string): boolean {
  for (const allowedOrigin of allowedOrigins) {
    if (origin === allowedOrigin || allowedOrigin === '*') {
      return true;
    }
    if (allowedOrigin instanceof RegExp && allowedOrigin.test(origin)) {
      return true;
    }
  }
  return false;
}

export function isNumber(value: any) {
  return typeof value === 'number';
}

export function isInteger(value: number) {
  return Math.round(value) == value;
}

export function isObject(val: unknown): val is object {
  return (typeof val === 'object' && val !== null) || typeof val === 'function';
}

export interface Deferred<T = any> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
}

export function createDefer<T = any>(): Deferred<T> {
  const deferred = {} as Deferred<T>;

  deferred.promise = new Promise<T>((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });

  return deferred;
}
