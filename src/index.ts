import { Endpoint, Message, MessageType, WireValue, WireValueType } from './protocol';
import { isAllowedOrigin, isObject } from './utils';
import { Script } from './worker-handler';
import { WorkerPoolOptions, WorkerPool } from './worker-pool';

const throwMarker = Symbol('thrown');

interface ThrownValue {
  [throwMarker]: unknown; // just needs to be present
  value: unknown;
}
type SerializedThrownValue = { isError: true; value: Error } | { isError: false; value: unknown };

export interface TransferHandler<T, S> {
  /**
   * Gets called for every value to determine whether this transfer handler
   * should serialize the value, which includes checking that it is of the right
   * type (but can perform checks beyond that as well).
   */
  canHandle(value: unknown): value is T;

  /**
   * Gets called with the value if `canHandle()` returned `true` to produce a
   * value that can be sent in a message, consisting of structured-cloneable
   * values and/or transferrable objects.
   */
  serialize(value: T): [S, Transferable[]];

  /**
   * Gets called to deserialize an incoming value that was serialized in the
   * other thread with this transfer handler (known through the name it was
   * registered under).
   */
  deserialize(value: S): T;
}

/**
 * Internal transfer handler to handle thrown exceptions.
 */
const throwTransferHandler: TransferHandler<ThrownValue, SerializedThrownValue> = {
  canHandle: (value): value is ThrownValue => isObject(value) && throwMarker in value,
  serialize({ value }) {
    let serialized: SerializedThrownValue;
    if (value instanceof Error) {
      serialized = {
        isError: true,
        value: {
          message: value.message,
          name: value.name,
          stack: value.stack,
        },
      };
    } else {
      serialized = { isError: false, value };
    }
    return [serialized, []];
  },
  deserialize(serialized) {
    if (serialized.isError) {
      throw Object.assign(new Error(serialized.value.message), serialized.value);
    }
    throw serialized.value;
  },
};

function myFlat<T>(arr: (T | T[])[]): T[] {
  return Array.prototype.concat.apply([], arr);
}

function processArguments(argumentList: any[]): [WireValue[], Transferable[]] {
  const processed = argumentList.map(toWireValue);
  return [processed.map((v) => v[0]), myFlat(processed.map((v) => v[1]))];
}

const transferCache = new WeakMap<any, Transferable[]>();
export function transfer<T>(obj: T, transfers: Transferable[]): T {
  transferCache.set(obj, transfers);
  return obj;
}

/**
 * 创建一个Worker链接池
 * @param script 传入的为数组，最少会创建length数量的Worker，maxWorkers无法约束
 * @example
 * // main.ts
 * import WorkerUrl from './worker?url&worker';
 * import { createPool } from 'quick-worker';
 *
 * let pool = createPool(WorkerUrl);
 * pool.add(1,2);
 *
 * // worker.ts
 * import { expose } from 'quick-worker';
 *
 * function add(num1: number; num2: number) {
 *   return num1 + num2;
 * }
 *
 * expose({ add });
 */
export function createPool<T = any>(script?: Script, options?: WorkerPoolOptions) {
  const pool = new WorkerPool(script, options);
  return createProxy<T>(pool);
}

function createProxy<T>(pool: WorkerPool, path: (string | number | symbol)[] = [], target: object = function () {}) {
  const proxy = new Proxy(target, {
    get(_target, p) {
      console.log(_target, p, 'get ---------------> ');
      if (p === 'then') {
        console.log(path);
        const r = pool.execute({ type: MessageType.GET, path: path.map((p) => p.toString()) }).then(fromWireValue);
        return r.then.bind(r);
      }
      return createProxy(pool, [...path, p]);
    },
    set(_target, p, newValue) {
      console.log(_target, p, newValue, 'set ---------------> ');
      return true;
    },
    apply(_target, thisArg, rawArgumentList) {
      console.log(_target, thisArg, rawArgumentList, 'apply ---------------> ');
      const last = path[path.length - 1];
      if (last === 'execute') {
        const fn = rawArgumentList.shift();
        const [argumentList, transferables] = processArguments(rawArgumentList);
        pool.execute({ type: MessageType.RUN, argumentList, fn: `${String(fn)}` }, transferables);
        return;
      }
    },
    construct(_target, argArray, newTarget) {
      console.log(_target, argArray, newTarget, 'construct ---------------> ');
      return {};
    },
  });

  return proxy as T;
}

export function expose<T extends { [key: string]: any } = any>(
  obj: T = {} as any,
  ep: Endpoint = globalThis as any,
  allowedOrigins: (string | RegExp)[] = ['*'],
) {
  console.log('expose ---------------> ');
  ep.addEventListener('message', function callback(ev: MessageEvent) {
    console.log('message ---------------> ');
    if (!ev || !ev.data) {
      return;
    }
    if (!isAllowedOrigin(allowedOrigins, ev.origin)) {
      console.warn(`Invalid origin '${ev.origin}' for quick-worker proxy`);
      return;
    }
    const { id, type, path } = {
      path: [] as string[],
      ...(ev.data as Message),
    };

    let returnValue;
    try {
      const parent = path.slice(0, -1).reduce((obj, prop) => obj[prop], obj);
      const rawValue = path.reduce((obj, prop) => obj[prop], obj);
      switch (type) {
        case MessageType.GET:
          {
            returnValue = rawValue;
          }
          break;
        case MessageType.SET:
          {
            // parent[path.slice(-1)[0]] = fromWireValue(ev.data.value);
            // returnValue = true;
          }
          break;
        case MessageType.RUN:
          {
            //
          }
          break;
        case MessageType.APPLY:
          {
            // returnValue = rawValue.apply(parent, argumentList);
          }
          break;
        case MessageType.CONSTRUCT:
          {
            // const value = new rawValue(...argumentList);
            // returnValue = proxy(value);
          }
          break;
        case MessageType.ENDPOINT:
          {
            // const { port1, port2 } = new MessageChannel();
            // expose(obj, port2);
            // returnValue = transfer(port1, [port1]);
          }
          break;
        case MessageType.RELEASE:
          {
            // returnValue = undefined;
          }
          break;
        default:
          return;
      }
    } catch (_error) {
      console.warn(_error);
    }
    Promise.resolve(returnValue)
      .catch((value) => {
        console.log(value);
      })
      .then((returnValue) => {
        ep.postMessage({ id, type: WireValueType.RAW, value: returnValue });
      });
  });
  if (ep.start) {
    ep.start();
  }
}

function toWireValue(value: any): [WireValue, Transferable[]] {
  if (throwTransferHandler.canHandle(value)) {
    const [serializedValue, transferables] = throwTransferHandler.serialize(value);
    return [
      {
        type: WireValueType.HANDLER,
        name: 'throw',
        value: serializedValue,
      },
      transferables,
    ];
  }
  return [
    {
      type: WireValueType.RAW,
      value,
    },
    transferCache.get(value) || [],
  ];
}

function fromWireValue(value: WireValue): any {
  switch (value.type) {
    case WireValueType.HANDLER:
      return throwTransferHandler!.deserialize(value.value as any);
    case WireValueType.RAW:
      return value.value;
  }
}
