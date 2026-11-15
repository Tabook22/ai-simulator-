import { test, expect } from '@playwright/test';

test('switches between English and Arabic and preserves the choice', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.getByRole('button', { name: 'Explore the network' })).toBeVisible();

  await page.getByRole('button', { name: 'العربية' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.getByRole('button', { name: 'استكشف الشبكة' })).toBeVisible();
  await expect(page.locator('.brand-word')).toHaveText('مختبر الخلايا العصبية');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('button', { name: 'استكشف الشبكة' })).toBeVisible();

  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.getByRole('button', { name: 'Explore the network' })).toBeVisible();
});
