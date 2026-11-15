import { expect, test } from '@playwright/test';

test('opens the reading room, searches, and filters by type', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Library' }).click();
  await expect(page.getByRole('heading', { name: /go deeper than the demo/i })).toBeVisible();
  await expect(page.locator('.path-card')).toHaveCount(6);
  expect(await page.locator('.lib-card').count()).toBeGreaterThan(30);

  await page.getByLabel('Search the library').fill('transformer');
  await expect(page.getByRole('heading', { name: 'The Illustrated Transformer' })).toBeVisible();
  await page.getByRole('button', { name: 'Paper', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Attention Is All You Need' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Illustrated Transformer' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Clear filters' }).click();
  expect(await page.locator('.lib-card').count()).toBeGreaterThan(30);

  await page.getByRole('button', { name: /Inside the transformer/ }).click();
  await expect(page.locator('.library-count')).toContainText('5 of 43');
  await expect(page.getByRole('heading', { name: 'The Illustrated Transformer' })).toBeVisible();
});

test('saves a resource, filters saved, and jumps into the lab', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Library' }).click();
  const card = page.locator('.lib-card', { hasText: 'Neural Networks and Deep Learning' }).first();
  await card.getByRole('button', { name: 'Save to my list' }).click();
  await expect(page.locator('.library-stats > div').nth(2)).toContainText('1');
  await card.getByRole('button', { name: 'Mark as finished' }).click();
  await expect(page.locator('.library-stats > div').nth(3)).toContainText('1');
  await expect(card.locator('.lib-done')).toBeVisible();

  await page.getByRole('button', { name: /^Saved/ }).click();
  await expect(page.locator('.lib-card')).toHaveCount(1);
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Worked examples' }).click();
  await expect(page.getByRole('heading', { name: /forward, then backward, one number at a time/i })).toBeVisible();
});

test('fits the reading room on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Library' }).click();
  await expect(page.getByRole('heading', { name: /go deeper than the demo/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await expect(page.locator('.lib-card').first()).toBeVisible();
});
