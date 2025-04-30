import { Endpoint, Message } from './protocol';
import { createDefer, Deferred, generateUUID } from './utils';

export type FnWorker = new () => Worker;
export type WorkerInstance = Worker | MessagePort;
export type Script = string | URL | FnWorker | WorkerInstance;

export class WorkerHandler {
  #workerID: string;
  #worker: Endpoint;
  #requestQueue: string[];

  #terminated: boolean;
  #processing: Map<string, Deferred>;
  #tracking: Set<Deferred>;
  #lastId: number;

  constructor(script?: Script, options?: WorkerOptions) {
    this.#worker = createWorker();
    this.#workerID = generateUUID();

    this.#worker.addEventListener('message', (ev: Event) => {
      if (this.#terminated) {
        return;
      }
      const { data } = ev as MessageEvent;
      if (!data || !data.id) {
        return;
      }

      const task = this.#processing.get(data.id);
      if (task) {
        try {
          task.resolve(data);
        } finally {
          this.#processing.delete(data.id);
        }
      }
    });

    this.#worker.addEventListener('error', (e) => {
      this.#terminated = true;
      this.#processing.forEach((value) => value.reject(e));
      this.#processing.clear();
    });

    this.#terminated = false;
    this.#processing = new Map();
    this.#lastId = 0;
  }

  exec(msg: Message, resolver?: Deferred, transfers?: Transferable[]) {
    if (!resolver) {
      resolver = createDefer();
    }

    const id = (++this.#lastId).toString();

    this.#processing.set(id, resolver);

    if (this.#terminated) {
      resolver.reject(new Error('Worker is terminated'));
    } else {
      if (this.#worker.start) {
        this.#worker.start();
      }
      this.#worker.postMessage({ id, ...msg }, transfers);
    }

    return resolver.promise;
  }

  getWorkerID() {
    return this.#workerID;
  }

  busy() {
    return this.#processing.size > 0;
  }

  terminate(force: boolean = false, callback?: () => void) {
    if (force) {
      this.#processing.forEach((value) => value.reject(new Error('Worker terminated')));
      this.#processing.clear();
    }

    if (!this.busy()) {
      if (this.#worker) {
        if (this.#worker.terminate) {
          this.#worker.terminate();
        }
      }
    }
  }
}

function createWorker(script?: Script, options?: WorkerOptions) {
  ensureWebWorker();
  if (script instanceof Worker || script instanceof MessagePort) {
    return script;
  } else if (typeof script === 'string' || script instanceof URL) {
    return new Worker(script, options);
  } else if (typeof script === 'function') {
    return new script();
  } else {
    return new Worker(getDefaultWorker(), options);
  }
}

function ensureWebWorker() {
  // Workaround for a bug in PhantomJS (Or QtWebkit): https://github.com/ariya/phantomjs/issues/14534
  if (
    typeof Worker !== 'function' &&
    // @ts-expect-error TS error
    (typeof Worker !== 'object' || typeof Worker.prototype.constructor !== 'function')
  ) {
    throw new Error('QuickWorker: Web Workers not supported');
  }
}

function getDefaultWorker() {
  // test whether the browser supports all features that we need
  if (typeof Blob === 'undefined') {
    throw new Error('Blob not supported by the browser');
  }
  if (!window.URL || typeof window.URL.createObjectURL !== 'function') {
    throw new Error('URL.createObjectURL not supported by the browser');
  }

  // use embedded worker.js
  const blob = new Blob([''], { type: 'text/javascript' });
  return window.URL.createObjectURL(blob);
}
