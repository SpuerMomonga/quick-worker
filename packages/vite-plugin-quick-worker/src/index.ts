import type { PluginOption } from 'vite';

interface SimpleWorkerOptions {}

export function createSimpleWorkerPlugin(options: SimpleWorkerOptions = {}): PluginOption {
  return { name: 'vite:quick-worker', configResolved: () => {}, config: () => {} };
}
