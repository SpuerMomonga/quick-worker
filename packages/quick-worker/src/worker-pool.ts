import { Message } from './protocol';
import { createDefer, Deferred, isInteger, isNumber } from './utils';
import { Script, WorkerHandler } from './worker-handler';

export type WorkerType = Worker | SharedWorker | ServiceWorker;

export interface WorkerPoolOptions {
  minWorkers?: number | 'max';
  maxWorkers?: number;
  maxQueueSize?: number;
  workerTerminateTimeout?: number;
  onCreateWorker?: (id?: string) => void;
  onTerminateWorker?: (id?: string) => void;
  workerOpts?: WorkerOptions;
}

interface Task {
  msg: Message;
  timeout?: number;
  resolver: Deferred;
  transfers?: Transferable[];
}

export class WorkerPool {
  #workers: WorkerHandler[];
  #tasks: Task[];
  readonly #script?: Script;
  readonly #maxWorkers: number;
  readonly #minWorkers?: number;
  readonly #maxQueueSize: number;
  readonly #workerOpts?: WorkerOptions;
  readonly #workerTerminateTimeout: number;
  readonly #onCreateWorker: (id?: string) => void;
  readonly #onTerminateWorker: (id?: string) => void;

  constructor(script?: Script, options?: WorkerPoolOptions) {
    this.#workers = [];
    this.#tasks = [];
    this.#maxQueueSize = options?.maxQueueSize || Infinity;
    this.#workerTerminateTimeout = options?.workerTerminateTimeout || 1000;
    this.#onCreateWorker = options?.onCreateWorker || (() => null);
    this.#onTerminateWorker = options?.onTerminateWorker || (() => null);
    this.#workerOpts = options?.workerOpts;

    this.#script = script;

    if (options && 'maxWorkers' in options) {
      validateMaxWorkers(options.maxWorkers);
      this.#maxWorkers = options.maxWorkers!;
    } else {
      this.#maxWorkers = Math.max((navigator.hardwareConcurrency || 4) - 1, 1);
    }

    // 确保最小数量的workers
    if (options && 'minWorkers' in options) {
      if (options.minWorkers === 'max') {
        this.#minWorkers = this.#maxWorkers;
      } else {
        validateMinWorkers(options.minWorkers);
        this.#minWorkers = options.minWorkers!;
        this.#maxWorkers = Math.max(this.#minWorkers, this.#maxWorkers);
      }
      this.#ensureMinWorkers();
    }
  }

  #ensureMinWorkers() {
    if (this.#minWorkers) {
      for (let i = this.#workers.length; i < this.#minWorkers; i++) {
        this.#workers.push(this.#createWorkerHandler());
      }
    }
  }

  execute(msg: Message, transfers?: Transferable[]) {
    if (this.#tasks.length >= this.#maxQueueSize) {
      throw new Error('Max queue size of ' + this.#maxQueueSize + ' reached');
    }

    const resolver = createDefer();

    const task: Task = {
      resolver,
      msg,
      transfers,
    };

    this.#tasks.push(task);

    const promise = resolver.promise as Promise<any> & { timeout(delay: number): Promise<any> };

    const originalTimeout = promise.timeout;
    promise.timeout = (delay) => {
      if (this.#tasks.indexOf(task) !== -1) {
        // task is still queued -> start the timer later on
        task.timeout = delay;
        return resolver.promise;
      } else {
        // task is already being executed -> start timer immediately
        return originalTimeout.call(resolver.promise, delay);
      }
    };

    this.#processTasks();

    return resolver.promise;
  }

  #processTasks() {
    if (this.#tasks.length > 0) {
      const worker = this.#getWorker();
      if (worker) {
        const task = this.#tasks.shift();
        if (task) {
          worker.exec(task.msg, task.resolver, task.transfers).then(() => {
            this.#processTasks();
          });
        }
      }
    }
  }

  #getWorker() {
    let worker = this.#workers.find((worker) => !worker.busy());
    if (worker) return worker;

    if (this.#workers.length < this.#maxWorkers) {
      worker = this.#createWorkerHandler();
      this.#workers.push(worker);
      return worker;
    }

    return null;
  }

  #createWorkerHandler() {
    return new WorkerHandler(this.#script, this.#workerOpts);
  }

  terminate() {}

  stats() {}
}

function validateMaxWorkers(maxWorkers?: number) {
  if (!isNumber(maxWorkers) || !isInteger(maxWorkers) || maxWorkers < 1) {
    throw new TypeError('Option maxWorkers must be an integer number >= 1');
  }
}

function validateMinWorkers(minWorkers?: number) {
  if (!isNumber(minWorkers) || !isInteger(minWorkers) || minWorkers < 0) {
    throw new TypeError('Option minWorkers must be an integer number >= 0');
  }
}
