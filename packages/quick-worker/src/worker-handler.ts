import { Endpoint, Message } from './protocol';
import { createDefer, Deferred } from './utils';

export type FnWorker = new () => Worker;
export type WorkerInstance = Worker | MessagePort;
export type Script = string | URL | FnWorker | WorkerInstance;

export class WorkerHandler {
  #worker: Endpoint;
  #requestQueue: string[];

  #terminated: boolean;
  #processing: Map<string, Deferred>;
  #lastId: number;

  constructor(script?: Script, options?: WorkerOptions) {
    if (script instanceof Worker || script instanceof MessagePort) {
      this.#worker = script;
    } else if (typeof script === 'string' || script instanceof URL) {
      this.#worker = new Worker(script, options);
    } else if (typeof script === 'function') {
      this.#worker = new script();
    } else {
      this.#worker = new Worker(getDefaultWorker(), options);
    }

    console.log(this.#worker);

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
      console.log(e);
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

  busy() {
    return this.#processing.size > 0;
  }

  terminate(force: boolean = false, callback?: () => void) {
    if (force) {
      this.#processing.forEach((value) => value.reject(new Error('Worker terminated')));
    }
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
