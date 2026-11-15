import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

const port = 8011;
const url = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: url,
    channel: process.env.NEURON_LAB_BROWSER,
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `python -m uvicorn backend.main:app --host 127.0.0.1 --port ${port}`,
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: { NEURON_LAB_DB: join(tmpdir(), `neuron-lab-test-${randomUUID()}.sqlite3`) },
    url: `${url}/api/presets/one-neuron`,
  },
});
