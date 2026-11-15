import { test, expect } from '@playwright/test';

test('opens the exam case, shows both posters, and runs the 2 -> 3 -> 1 lab', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Exam case', exact: true }).click();

  await expect(page.locator('.house-hero h1')).toContainText('exam scores');
  const excel = page.getByRole('link', { name: 'Download Excel dataset' });
  await expect(excel).toHaveAttribute('href', /exam_data\.xlsx$/);
  const download = await page.request.get(await excel.getAttribute('href') || '');
  expect(download.status()).toBe(200);
  await expect(page.getByRole('link', { name: 'Download Python project' })).toHaveAttribute('href', /exam-python\.zip$/);
  await expect(page.getByRole('button', { name: 'Copy Python code' })).toBeVisible();
  await expect(page.locator('.house-ref-card')).toHaveCount(2);
  await expect(page.locator('.house-ref-card').first()).toContainText('English');
  await expect(page.locator('.house-ref-card').last()).toContainText('العربية');

  await page.locator('.house-ref-card').first().getByRole('button', { name: /Open reference poster/ }).click();
  await expect(page.locator('.house-poster-dialog')).toBeVisible();
  await expect(page.locator('.house-poster-dialog img')).toBeVisible();
  await page.keyboard.press('Escape');

  await expect(page.locator('.house-lab-summary')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.house-lab-summary')).toContainText('9 weights');
  await expect(page.locator('.house-lab-summary')).toContainText('4 biases');
  await expect(page.locator('.house-batch-list > span')).toHaveCount(10);
  await expect(page.locator('.house-table').last()).toContainText('Student 1');
  await expect(page.locator('.house-table').last()).toContainText('70%');
  await expect(page.locator('.house-table').last()).toContainText('58 / 100');
});
