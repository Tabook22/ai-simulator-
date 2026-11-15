import { expect, test } from '@playwright/test';

test('walks one example from the setup to the updated loss', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Worked examples' }).click();
  await expect(page.getByRole('heading', { name: /forward, then backward, one number at a time/i })).toBeVisible();
  await expect(page.locator('.example-card')).toHaveCount(5);
  await expect(page.locator('.example-step-panel h2')).toContainText('The setup');
  await expect(page.locator('.example-node-value').first()).toHaveText('2');
  await expect(page.getByText('The shortest chain rule there is.')).toBeVisible();

  for (let index = 0; index < 7; index++) {
    await page.getByRole('button', { name: 'Next' }).click();
  }
  await expect(page.locator('.example-step-panel h2')).toContainText('After one step');
  await expect(page.locator('.example-ribbon')).toContainText('1 → 0');
  await expect(page.locator('.example-ribbon')).toContainText('100% lower');
});

test('directs the data with gold forward and green backward arrows', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Worked examples' }).click();
  await expect(page.locator('.example-flow-bar')).toBeVisible();
  await expect(page.locator('.lane-arrow')).toHaveCount(0);

  await page.getByRole('button', { name: 'Both', exact: true }).click();
  await expect(page.locator('.lane-arrow')).toHaveCount(8);
  await expect(page.locator('.example-lane.forward.active')).toHaveCount(1);
  await expect(page.locator('.example-lane.backward.active')).toHaveCount(1);

  await page.getByRole('button', { name: 'Forward', exact: true }).click();
  await expect(page.locator('.example-lane.forward.active')).toHaveCount(1);
  await expect(page.locator('.example-lane.backward.active')).toHaveCount(0);

  await page.getByRole('button', { name: 'Auto', exact: true }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.locator('.example-step-panel h2')).toContainText('weighted sum');
  await expect(page.locator('.example-lane.forward.active')).toHaveCount(1);

  await page.getByRole('button', { name: 'Backward', exact: true }).click();
  await expect(page.locator('.example-lane.backward.active')).toHaveCount(1);
  await expect(page.locator('.example-lane.forward.active')).toHaveCount(0);

  await page.getByRole('button', { name: '1.6×', exact: true }).click();
  await expect(page.getByRole('button', { name: '1.6×', exact: true })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Pause arrows' }).click();
  await expect(page.locator('.example-net')).toHaveClass(/paused/);
  await expect(page.getByRole('button', { name: 'Play arrows' })).toBeVisible();
  await page.getByRole('button', { name: 'Play arrows' }).click();
  await expect(page.locator('.example-net')).not.toHaveClass(/paused/);

  await page.locator('.example-edge-label').first().click();
  await expect(page.getByRole('button', { name: 'Auto', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('keeps the direction arrows moving with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Worked examples' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  const animation = await page.locator('.lane-arrow').first()
    .evaluate(element => getComputedStyle(element).animationName);
  expect(animation).not.toBe('none');
});

test('follows the error into a hidden layer', async ({ page }) => {  await page.goto('/');
  await page.getByRole('button', { name: 'Worked examples' }).click();
  await page.getByRole('button', { name: /Two layers, hidden error/ }).click();
  await expect(page.locator('.example-step-panel').getByText('1 / 13')).toBeVisible();

  for (let index = 0; index < 8; index++) {
    await page.getByRole('button', { name: 'Next' }).click();
  }
  await expect(page.locator('.example-step-panel h2')).toContainText('error arriving at layer 1');
  await expect(page.getByText('1 × -2.4')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.locator('.example-step-panel h2')).toContainText('delta for layer 1');
  await expect(page.locator('.example-badge').first()).toContainText('delta -2.4');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.locator('.example-step-panel h2')).toContainText('gradients for layer 1');
  await expect(page.locator('.example-edge-label.gradient')).toHaveCount(4);
});
