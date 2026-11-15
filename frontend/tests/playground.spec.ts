import { test, expect } from '@playwright/test';
import {
  evaluate, makeDataset, makeNetwork, parameterCount, trainEpoch,
} from '../src/playgroundModel';

test('trains classification and regression networks with the TF-style model', () => {
  const xor = makeDataset('xor', 42, 0.02, 0.7);
  const xorTrain = xor.filter(point => point.split === 'train');
  const xorTest = xor.filter(point => point.split === 'test');
  expect(xor).toHaveLength(500);
  expect(xorTrain.length + xorTest.length).toBe(500);
  for (const point of xor) expect([-1, 1]).toContain(point.label);

  const xorNetwork = makeNetwork(2, [4], 'tanh', 'classification', 42);
  expect(parameterCount(xorNetwork)).toBe(17);
  const before = evaluate(xorNetwork, xorTest, ['x1', 'x2'], 'classification');
  for (let epoch = 0; epoch < 200; epoch += 1) {
    trainEpoch(xorNetwork, xorTrain, ['x1', 'x2'], {
      batchSize: 10, learningRate: 0.1, regularization: 'none', regularizationRate: 0, seed: 42 + epoch * 7919,
    });
  }
  const after = evaluate(xorNetwork, xorTest, ['x1', 'x2'], 'classification');
  expect(after.loss).toBeLessThan(before.loss);
  expect(after.accuracy).toBeGreaterThan(0.85);

  const circle = makeDataset('circle', 42, 0.05, 0.7);
  const circleTrain = circle.filter(point => point.split === 'train');
  const circleTest = circle.filter(point => point.split === 'test');
  const featureNetwork = makeNetwork(2, [], 'tanh', 'classification', 42);
  for (let epoch = 0; epoch < 120; epoch += 1) {
    trainEpoch(featureNetwork, circleTrain, ['x1sq', 'x2sq'], {
      batchSize: 10, learningRate: 0.1, regularization: 'none', regularizationRate: 0, seed: 42 + epoch * 7919,
    });
  }
  expect(evaluate(featureNetwork, circleTest, ['x1sq', 'x2sq'], 'classification').accuracy).toBeGreaterThan(0.9);

  const plane = makeDataset('plane', 42, 0.02, 0.5);
  const planeTrain = plane.filter(point => point.split === 'train');
  const planeTest = plane.filter(point => point.split === 'test');
  const regressionNetwork = makeNetwork(2, [4], 'tanh', 'regression', 42);
  const regressionBefore = evaluate(regressionNetwork, planeTest, ['x1', 'x2'], 'regression');
  for (let epoch = 0; epoch < 30; epoch += 1) {
    trainEpoch(regressionNetwork, planeTrain, ['x1', 'x2'], {
      batchSize: 10, learningRate: 0.03, regularization: 'l2', regularizationRate: 0.001, seed: 42 + epoch * 7919,
    });
  }
  expect(evaluate(regressionNetwork, planeTest, ['x1', 'x2'], 'regression').loss)
    .toBeLessThan(regressionBefore.loss);
});

test('opens the TensorFlow-style board, steps, switches problem type, and changes a layer', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Playground', exact: true }).click();
  await expect(page.locator('.tf-board')).toBeVisible();
  await expect(page.locator('.tf-flow')).toBeVisible();
  await expect(page.locator('.tf-intro h1')).toContainText('Tinker');
  const flow = page.locator('.tf-flow');
  const pausedA = await flow.evaluate(canvas => canvas.toDataURL());
  await page.waitForTimeout(300);
  const pausedB = await flow.evaluate(canvas => canvas.toDataURL());
  expect(pausedA).toBe(pausedB);

  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.waitForTimeout(400);
  const playingA = await flow.evaluate(canvas => canvas.toDataURL());
  await page.waitForTimeout(350);
  const playingB = await flow.evaluate(canvas => canvas.toDataURL());
  expect(playingA).not.toBe(playingB);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.waitForTimeout(200);
  const stoppedA = await flow.evaluate(canvas => canvas.toDataURL());
  await page.waitForTimeout(300);
  const stoppedB = await flow.evaluate(canvas => canvas.toDataURL());
  expect(stoppedA).toBe(stoppedB);
  await expect(page.locator('.tf-dataset.selected')).toContainText('Circle');
  await expect(page.locator('.tf-losses')).toContainText('Test loss');

  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.locator('.tf-epoch')).toContainText('000000');
  await page.getByRole('button', { name: 'Step one epoch' }).click();
  await expect(page.locator('.tf-epoch')).toContainText('000001');
  await expect(page.locator('.tf-losses')).toContainText('0.');

  await page.getByLabel('Problem type').selectOption('regression');
  await expect(page.locator('.tf-dataset.selected')).toContainText('Plane');
  await expect(page.locator('.tf-dataset')).toHaveCount(2);

  await page.getByRole('button', { name: 'Add hidden layer' }).click();
  await expect(page.locator('.tf-architecture')).toContainText('3');
  await page.getByRole('button', { name: 'Remove hidden layer' }).click();
  await expect(page.locator('.tf-architecture')).toContainText('2');

  await page.getByLabel('Regularization', { exact: true }).selectOption('l2');
  await page.getByLabel('Regularization rate').selectOption('0.03');
  await page.getByLabel('Activation').selectOption('relu');
  await expect(page.locator('.tf-heatmap')).toBeVisible();
});
