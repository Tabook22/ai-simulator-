import { expect, test } from '@playwright/test';

test('walks the house-price case study and runs the batch lab', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'House case' }).click();
  await expect(page.locator('.house-hero h1')).toContainText('house prices');
  await expect(page.locator('.house-step-rail button')).toHaveCount(10);
  await expect(page.locator('.house-ref-card')).toHaveCount(2);
  await page.getByRole('button', { name: /Open reference poster: How a neural network learns house prices/ }).click();
  await expect(page.locator('.house-poster-dialog')).toBeVisible();
  await expect(page.locator('.house-poster-dialog img')).toBeVisible();
  await page.getByRole('button', { name: 'Close reference poster' }).click();
  await expect(page.locator('.house-poster-dialog')).toHaveCount(0);
  await expect(page.locator('.house-document h2')).toHaveText('Define the task');
  await expect(page.locator('.house-card .house-table').first()).toContainText('House 1,000');
  await expect(page.locator('.house-metric')).toHaveCount(3);
  await expect(page.locator('.house-batch-list span')).toHaveCount(10);
  await expect(page.locator('.house-predictions tbody tr')).toHaveCount(4);

  await page.locator('.house-step-rail button').nth(6).click();
  await expect(page.locator('.house-document h2')).toHaveText('Train using batches');
  await expect(page.locator('.house-batch-shape')).toContainText('200 input values');

  await page.locator('.house-step-rail button').nth(4).click();
  await expect(page.locator('.house-document h2')).toHaveText('Choose the network');
  await expect(page.locator('.house-network-foot')).toContainText('9');
  await expect(page.locator('.house-network-foot')).toContainText('4');
});
