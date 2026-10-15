import { bench, describe } from 'vitest';
import { parseEntries } from './parseEntries';
const flags = { below: { negative: 0, low: 200, uncomfortable: 500 }, above: { goal: 2500 } };
describe('24-month forecast', () => {
  for (const count of [100, 1000]) {
    const raw = ['B-CHCK-main|2026-10-01|50000|Start', ...Array.from({ length: count }, (_, i) => `D|2026-10-02,R|1|Bill ${i}`)].join('\n');
    bench(
      `${count} recurring lines`,
      () => {
        parseEntries(raw, 24, flags);
      },
      { time: 500, iterations: 5 },
    );
  }
});
