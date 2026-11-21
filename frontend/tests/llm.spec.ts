import { expect, test } from '@playwright/test';

test('shows token attention flow and writes the next token', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'LLM playground' }).click();
  await expect(page.getByRole('heading', { name: /language model guesses the next token/i })).toBeVisible();
  await expect(page.locator('.llm-predicted-char')).toHaveText('mat');
  await expect(page.getByRole('button', { name: /^Token \d/ })).toHaveCount(5);
  await expect(page.locator('circle.llm-dot').first()).toBeVisible();
  await expect(page.getByText('In the story', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Token 2: cat' }).click();
  await expect(page.getByRole('button', { name: 'Token 2: cat, selected query' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Append top token' })).toBeDisabled();

  await page.getByRole('button', { name: 'Token 5: the' }).click();
  await expect(page.getByRole('button', { name: 'Append top token' })).toBeEnabled();
  await page.getByRole('button', { name: 'Append top token' }).click();
  await expect(page.getByLabel('Prompt')).toHaveValue('the cat ran to the mat');
  await expect(page.getByRole('button', { name: /^Token \d/ })).toHaveCount(6);
});

test('flows the error backward and takes a gradient step', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'LLM playground' }).click();
  await expect(page.locator('.llm-predicted-char')).toHaveText('mat');
  await page.getByRole('button', { name: 'Backprop one step' }).click();
  await expect(page.locator('.llm-back')).toBeVisible();
  await expect(page.getByText('The error is flowing backward')).toBeVisible();
  await expect(page.locator('.llm-status')).toContainText('gradient step', { timeout: 12000 });
  await expect(page.locator('.llm-spark polyline')).toBeVisible();
  await expect(page.locator('.llm-loss strong').first()).toHaveText(/0\./);
  await page.getByRole('button', { name: 'Reset model' }).click();
  await expect(page.locator('.llm-status')).toContainText('saved classroom weights');
});

test('traces the loss back through the chain rule to an attention link', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'LLM playground' }).click();
  await expect(page.locator('.llm-predicted-char')).toHaveText('mat');
  await page.getByRole('button', { name: 'Trace top link' }).click();
  await expect(page.locator('.llm-tracer')).toBeVisible();
  await expect(page.locator('.llm-chain-card')).toHaveCount(9);
  await expect(page.locator('.llm-chain-card.key')).toContainText('Attention link');
  await expect(page.locator('.llm-arc-group.traced')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Next chain step' })).toBeEnabled();
  await page.getByRole('button', { name: 'Next chain step' }).click();
  await expect(page.locator('.llm-chain-card.active')).toHaveCount(1);
  await expect(page.locator('.llm-chain-card.active')).toContainText('Softmax → probability');

  await page.getByRole('button', { name: 'Trace link from cat' }).click();
  await expect(page.locator('.llm-chain-card.key')).toContainText('cat');
  await expect(page.getByRole('button', { name: 'Close tracer' })).toBeVisible();
  await page.getByRole('button', { name: 'Close tracer' }).click();
  await expect(page.locator('.llm-tracer')).toHaveCount(0);
});
