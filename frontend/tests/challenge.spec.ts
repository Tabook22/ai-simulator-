import { expect, test } from '@playwright/test';

test('reveals the full challenge explanation and runs the bias what-ifs', async ({ page }) => {
  await page.goto('/');
  const challenge = page.locator('.challenge');
  await expect(challenge).toContainText('Student challenge');

  await challenge.locator('summary').click();
  await expect(challenge).toContainText('What is the neuron doing?');
  await expect(challenge).toContainText('What if we try different biases?');
  await expect(challenge.locator('.challenge-table')).toContainText('−5');

  await challenge.getByRole('button', { name: 'Try bias −5' }).click();
  await expect(page.locator('.output-value strong').first()).toHaveText('0');

  await challenge.getByRole('button', { name: 'Try bias −3' }).click();
  await expect(page.locator('.output-value strong').first()).toHaveText('1');

  await challenge.getByRole('button', { name: 'Back to original' }).click();
  await expect(page.locator('.output-value strong').first()).toHaveText('3');
});
