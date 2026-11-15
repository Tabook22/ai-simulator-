import { expect, test } from '@playwright/test';

test('answers why and auto-trains toward a target from the chat', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ask the tutor' }).click();
  const tutor = page.locator('.tutor-panel');
  await expect(tutor).toBeVisible();
  await expect(tutor).toContainText('Prediction');

  await page.getByRole('button', { name: /Why is the output/ }).click();
  await expect(tutor).toContainText('ReLU');
  await expect(tutor).toContainText('multiplies each incoming');

  await page.getByRole('button', { name: /How can I reach/ }).click();
  await expect(tutor).toContainText('Auto-train');
  await page.getByRole('button', { name: /Auto-train toward 1/ }).click();
  await expect(page.locator('.auto-backprop')).toBeVisible();
  await expect(tutor).toContainText('Auto-train finished');
});
