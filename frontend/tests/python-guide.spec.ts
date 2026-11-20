import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildGuide } from '../src/guideGenerator';
import type { GuideConfig } from '../src/guideGenerator';

const network = {
  seed: 42,
  inputs: [0, 0],
  layers: [
    { activation: 'relu' as const, weights: [[0.1, 0.2], [0.3, 0.4], [0.5, 0.6]], biases: [0, 0, 0] },
    { activation: 'linear' as const, weights: [[0.7, 0.8, 0.9]], biases: [0] },
  ],
};

const config: GuideConfig = {
  source: 'synthetic-house',
  featureNames: ['area', 'bedrooms'],
  targetNames: ['price'],
  trainRows: 120,
  validationRows: 20,
  testRows: 20,
  batchSize: 10,
  epochs: 2,
  learningRate: 0.01,
  optimizer: 'sgd',
  device: 'cpu',
  targetScaled: true,
  earlyStopping: false,
  patience: 5,
  newExample: [180, 3],
  seed: 42,
};

test('builds the 15 steps, notebook, and incomplete-batch counts', () => {
  const guide = buildGuide(network, config);
  expect(guide.errors).toEqual([]);
  expect(guide.steps).toHaveLength(15);
  expect(guide.summary).toMatchObject({
    architecture: '2 → 3 → 1', weights: 9, biases: 4, parameters: 13,
    trainRows: 120, batchesPerEpoch: 12, updates: 24,
  });
  expect(guide.steps[6].code).toContain('nn.Linear(2, 3)');
  expect(guide.steps[6].code).toContain('nn.Linear(3, 1)');
  expect(guide.steps[6].code).toContain('EXPECTED_TRAINABLE = 13');
  expect(guide.steps[8].code).toContain('copy.deepcopy(model)');
  expect(guide.steps[9].code).toContain('optimizer.zero_grad(set_to_none=True)');
  expect(guide.steps[9].code).toContain('optimizer.step()');
  expect(guide.steps[9].code).toContain('loss.backward()');
  expect(guide.script).toContain('weights_only=False');
  expect(guide.script).toContain('np.allclose');
  expect(guide.script).not.toContain('TODO');
  expect(guide.requirements).toContain('torch');
  const notebook = JSON.parse(guide.notebook) as { cells: { cell_type: string }[] };
  expect(notebook.cells.filter(cell => cell.cell_type === 'code')).toHaveLength(15);

  const incomplete = buildGuide(network, {
    ...config, trainRows: 1005, validationRows: 100, testRows: 100, batchSize: 100,
  });
  expect(incomplete.summary.batchesPerEpoch).toBe(11);
  expect(incomplete.summary.updates).toBe(22);
  expect(incomplete.script).toContain('TRAIN_ROWS = 1005');
});

test('a small generated guide runs end to end and reload matches', () => {
  test.setTimeout(180_000);
  const guide = buildGuide(network, config);
  expect(guide.errors).toEqual([]);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'neuron-guide-'));
  const scriptPath = path.join(directory, safeFilename(guide.scriptFilename));
  fs.writeFileSync(scriptPath, guide.script);
  try {
    const output = execFileSync('python', [scriptPath], {
      cwd: directory, encoding: 'utf8', timeout: 150_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    expect(output).toContain('Total trainable parameters: 13');
    expect(output).toContain('Batches per epoch: 12');
    expect(output).toContain('Main model unchanged by the demonstration: True');
    expect(output).toContain('Epochs completed: 2');
    expect(output).toContain('Test MAE (original target units):');
    expect(output).toContain('Reloaded prediction matches: True');
    expect(output).toContain('Guide complete');
    expect(fs.existsSync(path.join(directory, 'learning_curves.png'))).toBe(true);
    expect(fs.existsSync(path.join(directory, 'house_price_model.pt'))).toBe(true);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('opens the Python guide, matches the house architecture, and downloads files', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.getByRole('button', { name: 'Python guide' }).click();
  await expect(page.locator('.py-hero h1')).toContainText('trains your network');
  await page.getByRole('button', { name: 'Use the house-price setup' }).first().click();
  await expect(page.locator('.py-arch-badge')).toContainText('2 → 3 → 1');
  const summary = page.locator('.py-summary');
  await expect(summary).toContainText('13');
  await expect(summary).toContainText('10');
  await expect(summary).toContainText('200');
  await expect(page.locator('.py-step')).toHaveCount(15);

  await page.locator('.py-step').nth(6).locator('summary').click();
  await expect(page.locator('.py-step').nth(6)).toContainText('nn.Linear(2, 3)');
  await expect(page.locator('.py-step').nth(6)).toContainText('EXPECTED_TRAINABLE = 13');

  await page.getByRole('button', { name: 'Copy complete script' }).click();
  await expect(page.getByRole('button', { name: 'Copied script' })).toBeVisible();

  const scriptDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download .py' }).click();
  expect((await scriptDownload).suggestedFilename()).toBe('house_price_training_guide.py');

  const notebookDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download notebook' }).click();
  expect((await notebookDownload).suggestedFilename()).toBe('house_price_training_guide.ipynb');
});

function safeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

test('builds a neuron from scratch: the picture, the code and the terminal move in step', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Python guide' }).click();
  const scratch = page.locator('.fs');
  await expect(scratch.getByRole('heading', { name: /Part 1: The neuron/ })).toBeVisible();

  // Part 1: the loop prints 0.75; np.dot shows the floating-point tail; rain flips it.
  await scratch.getByRole('button', { name: 'Print it: 0.75 → ride' }).click();
  await expect(scratch.getByTestId('fs-terminal')).toContainText('0.75');
  await expect(scratch.locator('.fs-pill')).toContainText('RIDE');
  await scratch.getByRole('button', { name: '−0.75 → stay home' }).click();
  await expect(scratch.getByTestId('fs-terminal')).toContainText('0.7499999999999999');
  await expect(scratch.getByTestId('fs-terminal')).toContainText('-0.7500000000000001');
  await expect(scratch.locator('.fs-pill')).toContainText('STAY HOME');
  await expect(scratch.getByTestId('fs-code').locator('li')).toHaveCount(12);

  // Changing the day rewrites the code and the output.
  await scratch.getByRole('slider', { name: 'sunny' }).fill('0');
  await expect(scratch.getByTestId('fs-code')).toContainText('inputs  = [0.0, 0.7, 0.0]');

  // Part 2: the three activations, before and after the rain.
  await scratch.getByRole('button', { name: 'Reset' }).click();
  await scratch.getByRole('tab', { name: /Activation functions/ }).click();
  await scratch.getByRole('button', { name: /0.0 · 0.32 · 0.0/ }).click();
  await expect(scratch.getByTestId('fs-terminal')).toContainText('0.7499999999999999 1.0 0.679178699175393 0.7499999999999999');
  await expect(scratch.getByTestId('fs-terminal')).toContainText('-0.7500000000000001 0.0 0.320821300824607 0.0');
  await expect(scratch.locator('.fs-act.on')).toHaveCount(3);
});
