<script lang="ts">
  import { wrap } from 'comlink';
  // @ts-expect-error
  import url from './worker?url&worker';

  const worker = new Worker(url, { type: 'module' });

  const obj = wrap<{ count: number }>(worker);

  async function init() {
    console.log(await obj.count);
  }

  init();
</script>

<main>测试</main>

<style>
</style>
