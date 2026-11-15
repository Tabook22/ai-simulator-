import { expect, test } from '@playwright/test';

test('explains the network settings in plain language', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Explain the architecture' }).click();
  const guide = page.locator('.guide-modal');
  await expect(guide).toBeVisible();
  await expect(guide.locator('h2')).toHaveText('Architecture');
  await expect(guide).toContainText('The simple idea');
  await expect(guide).toContainText('Why it matters');
  await expect(guide).toContainText('What it changes in the calculation');
  await expect(guide).toContainText('Shape: 2 → 1');
  await expect(guide).toContainText('Remember');
  await page.getByRole('button', { name: 'Close explanation' }).click();
  await expect(guide).toHaveCount(0);

  await page.getByRole('button', { name: 'Explain the input values' }).click();
  await expect(page.locator('.guide-modal')).toContainText('Input 1 = 2');
  await expect(page.locator('.guide-modal')).toContainText('What if');
  await page.getByRole('button', { name: 'Close explanation' }).click();

  await page.getByRole('button', { name: 'Explain the number of hidden layers' }).click();
  await expect(page.locator('.guide-modal h2')).toHaveText('Hidden layers');
  await expect(page.locator('.guide-modal')).toContainText('build new ideas');
});
