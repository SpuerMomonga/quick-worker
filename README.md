# QuickWorker

![Static Badge](https://img.shields.io/badge/License-MIT-green)

## Introduction

## Use

## API

### `createPool<T = any>(script?: Script, options?: WorkerPoolOptions): T`

创建一个worker池并行执行任务。返回一个代理对象，使用RPC方式调用worker中的方法。

#### Parameters

`script?: Script` 参数未传入会提供默认脚本创建worker池，传入`string`、`new () => Worker`和`URL`会创建worker池。传入实例化worker将不会创建线程池，`minWorkers`、`maxWorkers`、`onCreateWorker`、`onTerminateWorker`、`workerOpts`等options参数在传入worker实例时不会生效。

`options?: WorkerPoolOptions`参数说明

| Property                     | Type                    | Default                                      | Description                                                                             |
| ---------------------------- | ----------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------- |
| **`minWorkers`**             | `number \| 'max'`       | `1`                                          | 保持最低worker池数量。当设置为`max`时，使用与`maxWorkers`相同的值。                     |
| **`maxWorkers`**             | `number`                | (`navigator.hardwareConcurrency \|\| 4`) - 1 | worker池中最大的并发工作线程数（推荐 <= CPU核心数）。                                   |
| **`maxQueueSize`**           | `number`                | `Infinity`                                   | 队列中待执行任务数量。                                                                  |
| **`workerTerminateTimeout`** | `number`                | `5000` (ms)                                  | 待补充                                                                                  |
| **`onCreateWorker`**         | `(id?: string) => void` | —                                            | 当一个新的worker被创建时触发的回调。接收worker ID。                                     |
| **`onTerminateWorker`**      | `(id?: string) => void` | —                                            | 当worker终止时触发的回调。接收worker ID。                                               |
| **`workerOpts`**             | `WorkerOptions`         | —                                            | 传递给`Worker`构造函数的选项 (例如： `{ type: 'module', credentials: 'same-origin' }`). |

#### Examples

默认脚本创建线程池

```ts
import { createPool } from 'quick-worker';
import url from './worker?url&worker';

const pool = createPool();
```

使用URL创建线程池

```ts
import { createPool } from 'quick-worker';

const pool = createPool(new URL('./worker.ts', import.meta.url));
```

### `execute(fn: () => void, param, transfer)`
