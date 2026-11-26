import { expect, test } from '@playwright/test';

test('self-attention, step by step: "it" finds "cat", only earlier tokens are visible, heads differ', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tokenizer' }).click();
  const panel = page.getByTestId('sa-panel');
  await expect(panel).toContainText('Self-attention, step by step');
  await expect(page.getByTestId('sa-sentence').locator('button')).toHaveCount(11);
  await expect(page.getByTestId('sa-steps').locator('li')).toHaveCount(6);
  await expect(page.getByTestId('sa-stage')).toContainText('what it can be matched on');

  // Compare, then softmax: "cat" wins, later tokens stay hidden, and the weights add up to 100%.
  await page.getByTestId('sa-next').click();
  await expect(page.getByTestId('sa-bars').locator('.sa-bar')).toHaveCount(8);
  await expect(page.getByTestId('sa-bars').locator('.sa-bar.best')).toContainText('cat');
  await page.getByTestId('sa-next').click();
  const shares = await page.getByTestId('sa-bars').locator('.sa-bar b').allTextContents();
  const total = shares.reduce((sum, share) => sum + Number(share.replace('%', '')), 0);
  expect(total).toBeGreaterThanOrEqual(99);
  expect(total).toBeLessThanOrEqual(101);
  await expect(page.getByTestId('sa-tok-1')).toHaveClass(/best/);
  await expect(page.getByTestId('sa-tok-9')).toHaveClass(/hidden/);

  // Weighted sum, then the pattern for every token.
  await page.getByTestId('sa-next').click();
  await expect(page.getByTestId('sa-sum')).toContainText('it + 69% cat');
  await page.getByTestId('sa-next').click();
  await expect(page.getByTestId('sa-matrix').locator('tbody tr')).toHaveCount(11);
  await expect(page.getByTestId('sa-matrix').locator('td.future')).toHaveCount(55);
  await page.getByTestId('sa-row-2').click();
  await expect(page.getByTestId('sa-stage')).toContainText('Row “·sat” looks most at “·cat”');

  // A different head learns a different pattern.
  await page.getByTestId('sa-step-6').click();
  await page.getByTestId('sa-head-previous').click();
  await page.getByTestId('sa-tok-7').click();
  await expect(page.getByTestId('sa-tok-6')).toHaveClass(/best/);
  await expect(page.getByTestId('sa-source')).toHaveAttribute('href', 'https://www.instagram.com/reel/DetrQtNBVX-/');
});
