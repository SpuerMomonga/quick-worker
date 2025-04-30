import { expose } from 'quick-worker';

const count = 10;

expose({
  count,
});
