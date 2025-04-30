<script lang="ts">
  import { createPool } from 'quick-worker';
  // @ts-ignore
  import url from './worker?url&worker';

  const pool = createPool(url, { workerOpts: { type: 'module' } });

  async function init() {
    console.log(await pool.count);
  }

  init();
</script>

<main>测试</main>

<style>
</style>
