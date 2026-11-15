import { expect, test } from '@playwright/test';

test('opens the full calculation explainer with names and step details', async ({ page }) => {
  await page.goto('/');
  await page.locator('.neuron').last().click();
  await expect(page.locator('.calc-panel')).toBeVisible();

  const panel = page.locator('.calc-panel');
  const before = await panel.boundingBox();
  const head = await page.locator('.calc-panel-head').boundingBox();
  if (!before || !head) throw new Error('The calculation panel is missing.');
  await page.mouse.move(head.x + 14, head.y + 10);
  await page.mouse.down();
  await page.mouse.move(head.x + 90, head.y + 65, { steps: 6 });
  await page.mouse.up();
  const after = await panel.boundingBox();
  expect(after?.x).not.toBe(before.x);
  expect(await panel.evaluate(element => getComputedStyle(element).resize)).toBe('both');

  await page.locator('.header-explain').click();
  const modal = page.locator('.calc-modal');
  await expect(modal).toBeVisible();
  await expect(modal.locator('h2')).toHaveText('Inside Output 1');
  await expect(modal.locator('.calc-equation-main')).toContainText('a = f');
  expect(await modal.locator('.calc-var-table tbody tr').count()).toBeGreaterThan(5);
  await expect(modal).toContainText('Add the bias');
  await expect(modal).toContainText('What if');

  await page.getByRole('button', { name: 'Close explanation' }).click();
  await expect(modal).toHaveCount(0);

  await page.locator('.neuron-equation-row .equation-explain').first().click();
  await expect(page.locator('.calc-modal .calc-step.focused h4')).toContainText('Multiply');
  await page.getByRole('button', { name: 'Close explanation' }).click();

  await page.getByRole('button', { name: 'Explain', exact: true }).click();
  await expect(page.locator('.calc-modal')).toBeVisible();
});
