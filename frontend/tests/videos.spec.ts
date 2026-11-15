import { expect, test } from '@playwright/test';

test('opens the screening room and plays the primer', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Watch video lectures' }).click();
  await expect(page.getByRole('heading', { name: /the best llm lectures, curated/i })).toBeVisible();
  await expect(page.locator('.video-card')).toHaveCount(23);
  await expect(page.locator('.video-stage-info h2')).toHaveText('Deep Dive into LLMs like ChatGPT');
  await expect(page.getByText('Only 9.0+ picks')).toBeVisible();
  await page.getByRole('button', { name: /Play Deep Dive into LLMs/ }).click();
  await expect(page.locator('.video-player iframe')).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/7xTGNNLPyMI/);
});

test('filters by topic and freshness, and selects a video', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Watch video lectures' }).click();
  await page.getByLabel('Search the video library').fill('Karpathy');
  expect(await page.locator('.video-card').count()).toBeGreaterThan(2);
  await page.getByRole('button', { name: 'Clear filters' }).click();

  await page.getByRole('button', { name: 'Attention', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Attention in transformers/ })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();

  await page.getByRole('button', { name: 'New 2025–26', exact: true }).click();
  await expect(page.locator('.video-card')).toHaveCount(12);
  await expect(page.getByRole('heading', { name: /But what is cross-entropy/ })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();

  await page.getByRole('button', { name: /Select Let's build GPT/ }).click();
  await expect(page.locator('.video-stage-info h2')).toContainText("Let's build GPT");
});

test('saves, marks watched, and opens the lab', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Watch video lectures' }).click();
  const card = page.locator('.video-card', { hasText: 'Deep Dive into LLMs like ChatGPT' }).first();
  await card.getByRole('button', { name: 'Save for later' }).click();
  await card.getByRole('button', { name: 'Mark as watched' }).click();
  await expect(page.locator('.video-stats > div').nth(3)).toContainText('1');

  await page.locator('.saved-chip').click();
  await expect(page.locator('.video-card')).toHaveCount(1);
  await page.locator('.video-stage-info').getByRole('button', { name: 'Open the LLM lab' }).click();
  await expect(page.getByRole('button', { name: 'LLM playground' })).toHaveAttribute('aria-current', 'page');
});

test('fits the screening room on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Watch video lectures' }).click();
  await expect(page.getByRole('heading', { name: /the best llm lectures, curated/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await expect(page.locator('.video-card').first()).toBeVisible();
});
