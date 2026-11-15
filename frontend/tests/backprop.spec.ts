import { expect, test } from '@playwright/test';

test('walks a backward pass and applies the correction', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Target 1')).toHaveValue('1');
  await page.getByRole('button', { name: 'Run backward pass' }).click();

  await expect(page.locator('.backprop-playback')).toBeVisible();
  await expect(page.locator('.backprop-copy h4')).toHaveText('Compare the prediction with the target');
  await expect(page.locator('.backprop-numbers')).toContainText('3');
  await expect(page.locator('.backprop-math')).toContainText('loss');

  await page.getByRole('button', { name: 'Next step' }).click();
  await expect(page.locator('.backprop-copy h4')).toContainText('slope');
  await page.getByRole('button', { name: 'Next step' }).click();
  await expect(page.locator('.backprop-copy h4')).toContainText('Outputs');
  await expect(page.locator('.backward-packet').first()).toBeVisible();
  await expect(page.locator('.backward-label').first()).toBeVisible();
  await expect(page.locator('.backprop-table')).toContainText('Weight Input 1 → Output 1');

  while (await page.getByRole('button', { name: 'Next step' }).isEnabled()) {
    await page.getByRole('button', { name: 'Next step' }).click();
  }
  await expect(page.locator('.backprop-copy h4')).toHaveText('Check the new prediction');
  await page.getByRole('button', { name: 'Apply correction' }).click();
  await expect(page.locator('.output-value strong').first()).toHaveText('0');
  await expect(page.getByRole('button', { name: 'Correction applied' })).toBeDisabled();
});
