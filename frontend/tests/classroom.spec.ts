import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

function output(page: Page) {
  return page.getByRole('region', { name: 'Network output' }).locator('.output-value strong');
}

test('loads both classroom presets, traces a neuron, edits a weight, and walks the layers', async ({ page }) => {
  await page.goto('/');
  await expect(output(page)).toHaveText('3');
  await expect(page.getByText('max(0, 3) = 3')).toBeVisible();
  await page.getByRole('button', { name: 'Next layer' }).click();
  await expect(page.getByText('Layer 1 of 1 · Outputs · Values from Inputs')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next layer' })).toBeDisabled();
  await page.getByRole('button', { name: 'Reset walkthrough' }).click();
  await expect(page.getByText('Walkthrough · Start with Next layer')).toBeVisible();

  await page.getByLabel('Classroom preset').selectOption('two-layers');
  await expect(output(page)).toHaveText('1.75');
  const hidden = page.getByRole('button', { name: 'Hidden 1 · Neuron 1, value 3' });
  await hidden.focus();
  await hidden.press('Enter');
  await expect(hidden).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Weight 1', { exact: true }).fill('1');
  await expect(page.getByText('Needs a new run')).toBeVisible();
  await page.getByRole('button', { name: 'Run forward pass' }).click();
  await page.getByRole('button', { name: 'Show result' }).click();
  await expect(output(page)).toHaveText('2.25');
  await expect(page.getByText('max(0, 4) = 4', { exact: true })).toBeVisible();

  const next = page.getByRole('button', { name: 'Next layer' });
  await next.click();
  await expect(page.getByText('Layer 1 of 2 · Hidden Layer 1 · Values from Inputs')).toBeVisible();
  await next.click();
  await expect(page.getByText('Layer 2 of 2 · Outputs · Values from Hidden Layer 1')).toBeVisible();
  await page.getByRole('button', { name: 'Previous layer' }).click();
  await expect(page.getByText('Layer 1 of 2 · Hidden Layer 1 · Values from Inputs')).toBeVisible();

  await page.getByLabel('Classroom preset').selectOption('activation');
  await expect(output(page)).toHaveText('-3');
  await page.getByRole('button', { name: 'Run ReLU' }).click();
  await expect(output(page)).toHaveText('0');
  await expect(page.getByText('max(0, -3) = 0')).toBeVisible();
});

test('trains one AND step, resets the weights, and reopens a saved lesson', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Teach the network' }).click();
  await page.getByRole('button', { name: 'Load AND gate' }).click();
  await expect(page.getByLabel('Row 4 label')).toHaveValue('1 AND 1');
  await page.getByRole('button', { name: 'One training step' }).click();
  await expect(page.getByText('One full-batch update complete.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Weight update' })).toBeVisible();
  await expect(page.getByRole('img', { name: /Loss over 1 training step/ })).toBeVisible();
  await page.getByRole('button', { name: 'Reset training' }).click();
  await expect(page.getByText('Restored the weights and biases from the start of training.')).toBeVisible();
  await page.getByRole('button', { name: 'Explore the network' }).click();
  await expect(page.getByLabel('Weight 1', { exact: true })).toHaveValue('0.2');

  await page.getByRole('button', { name: 'Lessons', exact: true }).click();
  await page.getByLabel('Lesson name').fill('AND classroom check');
  await page.getByRole('button', { name: 'Save lesson' }).click();
  await expect(page.getByText('Saved “AND classroom check”.')).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByLabel('Classroom preset').selectOption('one-neuron');
  await expect(output(page)).toHaveText('3');
  await page.getByRole('button', { name: 'Lessons', exact: true }).click();
  await page.getByRole('button', { name: 'Open', exact: true }).click();
  await expect(page.getByLabel('Weight 1', { exact: true })).toHaveValue('0.2');
  await page.getByRole('button', { name: 'Teach the network' }).click();
  await expect(page.getByLabel('Row 4 target 1')).toHaveValue('1');

  await page.getByRole('button', { name: 'Lessons', exact: true }).click();
  await page.getByRole('button', { name: 'Delete AND classroom check' }).click();
  await page.getByRole('button', { name: 'Confirm delete' }).click();
  await expect(page.getByText('No lessons saved yet.')).toBeVisible();
});

test('keeps a resized network usable on a narrow screen and in presentation view', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(output(page)).toHaveText('3');
  expect(await page.locator('.diagram-scroll').evaluate(element => element.scrollWidth)).toBe(
    await page.locator('.diagram-scroll').evaluate(element => element.clientWidth),
  );
  await page.getByRole('button', { name: 'Show settings' }).click();
  await page.getByRole('button', { name: 'More inputs', exact: true }).click();
  await expect(page.getByLabel('Network shape')).toHaveText('3 → 1');
  await expect(page.getByLabel('Weight 1', { exact: true })).toHaveValue('0.5');
  await page.getByLabel('Weight 3', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Run forward pass' }).click();
  await page.getByRole('button', { name: 'Show result' }).click();
  await expect(output(page)).toHaveText('3');
  await page.getByRole('button', { name: 'Presentation view' }).click();
  await expect(page.getByRole('button', { name: 'Exit presentation' })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('lights up the quest, changes the animation speed, and completes the four moves', async ({ page }) => {
  await page.goto('/');
  const quest = page.getByRole('region', { name: 'Classroom quest' });
  await expect(quest.locator('li.done')).toHaveCount(0);
  await page.getByRole('button', { name: 'Run forward pass' }).click();
  await expect(quest.locator('li.done')).toHaveCount(1);
  const faster = page.getByRole('button', { name: 'Animation speed 2 times' });
  await faster.click();
  await expect(faster).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Show result' }).click();

  await page.getByRole('button', { name: /Output 1, value/ }).click();
  await expect(quest.locator('li.done')).toHaveCount(2);
  await page.getByLabel('Weight 1', { exact: true }).fill('0.75');
  await expect(quest.locator('li.done')).toHaveCount(3);

  await page.getByRole('button', { name: 'Teach the network' }).click();
  await page.getByRole('button', { name: 'Load AND gate' }).click();
  await page.getByRole('button', { name: 'One training step' }).click();
  await expect(quest.getByText('Quest complete')).toBeVisible();
  await expect(quest.locator('li.done')).toHaveCount(4);
  await page.getByRole('button', { name: 'Reset quest progress' }).click();
  await expect(quest.locator('li.done')).toHaveCount(0);
});

test('moves data with every neuron closed and opens only the neuron the student clicks', async ({ page }) => {
  test.setTimeout(45000);
  await page.goto('/');
  await page.getByLabel('Classroom preset').selectOption('two-layers');
  await expect(output(page)).toHaveText('1.75');
  await page.getByRole('button', { name: 'Run forward pass' }).click();

  const animation = page.getByRole('region', { name: 'Forward pass animation' });
  const packet = page.locator('circle.flow-packet').first();
  const calculation = page.locator('.calc-panel');
  const hidden = page.getByRole('button', { name: /Hidden 1 · Neuron 1, value/ });
  const otherHidden = page.getByRole('button', { name: /Hidden 1 · Neuron 2, value/ });
  const outputNode = page.getByRole('button', { name: /Output 1, value/ });
  await expect(animation.getByText('Move inputs', { exact: true })).toBeVisible();
  await expect(calculation).toHaveCount(0);
  await animation.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.locator('circle.flow-packet')).toHaveCount(4);
  await expect(packet).toHaveCSS('animation-play-state', 'paused');
  await expect(animation.locator('.playback-track > div')).toHaveCSS('animation-play-state', 'paused');
  const elapsed = await packet.evaluate(element => element.getAnimations()[0].currentTime);
  await hidden.click();
  await expect(hidden).toHaveAttribute('aria-expanded', 'true');
  await page.locator('.calc-panel-close').click();
  await expect(calculation).toHaveCount(0);
  await otherHidden.click();
  await expect(otherHidden).toHaveAttribute('aria-expanded', 'true');
  await page.locator('.calc-panel-close').click();
  await hidden.click();
  await expect(otherHidden).toHaveAttribute('aria-expanded', 'false');
  await expect(calculation).toHaveCount(1);
  expect(await packet.evaluate(element => element.getAnimations()[0].currentTime)).toBe(elapsed);
  const alignment = await packet.evaluate(element => {
    const curve = element.closest('svg')!.querySelector<SVGPathElement>('.edge-line')!;
    const progress = parseFloat(getComputedStyle(element).offsetDistance) / 100;
    const point = curve.getPointAtLength(curve.getTotalLength() * progress).matrixTransform(curve.getScreenCTM()!);
    const dot = element.getBoundingClientRect();
    return Math.hypot(point.x - dot.x - dot.width / 2, point.y - dot.y - dot.height / 2);
  });
  expect(alignment).toBeLessThan(2);
  const position = await packet.evaluate(element => element.getBoundingClientRect().left);
  await animation.getByRole('button', { name: 'Resume' }).click();
  await expect.poll(() => packet.evaluate(element => element.getBoundingClientRect().left)).not.toBe(position);

  await expect(calculation.getByText('2 × 0.5 = 1', { exact: true })).toBeVisible();
  await expect(calculation.getByText('3 × 1 = 3', { exact: true })).toBeVisible();
  await expect(calculation.getByText('1 + 3 = 4', { exact: true })).toBeVisible();
  await expect(calculation.getByText('4 + (-1) = 3', { exact: true })).toBeVisible();
  await expect(output(page)).toHaveText('—');
  await expect(calculation.getByText('ReLU: max(0, 3) = 3', { exact: true })).toBeVisible();
  await expect(calculation.getByText('3 → Outputs', { exact: true })).toBeVisible();
  await expect(page.locator('circle.flow-packet')).toHaveCount(2);
  await page.locator('.calc-panel-close').click();
  await outputNode.click();
  await expect(hidden).toHaveAttribute('aria-expanded', 'false');
  await expect(outputNode).toHaveAttribute('aria-expanded', 'true');
  await expect(animation.getByText('Layer 2 of 2 · Outputs', { exact: true })).toBeVisible();
  await expect(output(page)).toHaveText('1.75', { timeout: 12000 });
  await expect(animation.getByText('Forward pass complete')).toBeVisible();
  await expect(calculation.getByText('3 × 0.5 = 1.5', { exact: true })).toBeVisible();
  await page.locator('.calc-panel-close').click();

  await animation.getByRole('button', { name: 'Replay animation' }).click();
  await expect(animation.getByText('Layer 1 of 2 · Hidden Layer 1', { exact: true })).toBeVisible();
  await expect(animation.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await expect(calculation).toHaveCount(0);
  await expect(output(page)).toHaveText('—');
  await animation.getByRole('button', { name: 'Show result' }).click();
  await expect(output(page)).toHaveText('1.75');
});
