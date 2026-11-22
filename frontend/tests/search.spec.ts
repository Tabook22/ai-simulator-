import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';

const highlighted = (page: Page) => page.evaluate(() => {
  const registry = (CSS as unknown as { highlights?: Map<string, { size: number }> }).highlights;
  return registry?.get('site-search')?.size ?? 0;
});

test('searches the whole app and jumps to a section inside the fine-tuning lab', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('site-search-open').click();
  const dialog = page.getByTestId('site-search');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.site-search-chips button').first()).toBeVisible();

  await page.getByTestId('site-search-input').fill('Qdrant');
  const results = page.getByTestId('site-search-results');
  const first = results.locator('li').first();
  await expect(first).toContainText('Part 12: RAG in depth');
  await expect(first.locator('mark').first()).toHaveText(/qdrant/i);
  await page.keyboard.press('Enter');

  await expect(dialog).toBeHidden();
  await expect(page.locator('.ft-rail button[aria-current="step"]')).toHaveAttribute('aria-label', /Part 12:/);
  await expect(page.locator('#ft-rag .ft-part-tabs [role="tab"][aria-selected="true"]')).toContainText('Try');
  const flash = page.locator('.site-search-flash');
  await expect(flash).toBeInViewport();
  await expect(flash).toContainText(/Qdrant/);
  expect(await highlighted(page)).toBeGreaterThan(0);
});

test('opens the inner tab or step that holds the words', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+k');
  await page.getByTestId('site-search-input').fill('documented_in at least one Source');
  await expect(page.getByTestId('site-search-results').locator('li').first()).toContainText('Ontology');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('kn-tab-ontology')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.site-search-flash')).toBeInViewport();

  // A step of the house case: the step button is pressed for you.
  await page.keyboard.press('Control+k');
  await page.getByTestId('site-search-input').fill('What cleaning means');
  await expect(page.getByTestId('site-search-results').locator('li').first()).toContainText('House case');
  await page.keyboard.press('Enter');
  await expect(page.locator('.house-step-rail button[aria-current="step"]')).toContainText('Collect');
  await expect(page.locator('.site-search-flash')).toBeInViewport();
});

test('filters by lab, moves with the keyboard and closes with Escape', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('/');
  const input = page.getByTestId('site-search-input');
  await input.fill('LoRA');
  await page.getByTestId('site-search-lab-finetune').click();
  const items = page.getByTestId('site-search-results').locator('li');
  await expect(items.first()).toContainText('Fine-tuning lab');
  for (const text of await items.locator('.site-search-path span:first-child').allTextContents()) expect(text).toBe('Fine-tuning lab');
  await input.press('ArrowDown');
  await expect(items.nth(1)).toHaveAttribute('aria-selected', 'true');
  await input.fill('zzzz-no-such-word');
  await expect(page.getByTestId('site-search')).toContainText('Nothing found');
  await input.press('Escape');
  await expect(input).toHaveValue('');
  await input.press('Escape');
  await expect(page.getByTestId('site-search')).toBeHidden();
});

test('searches in Arabic, ignoring letter forms, and opens the result', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'العربية' }).click();
  await page.getByTestId('site-search-open').click();
  // Written without the hamza: still finds “الأنطولوجيا”.
  await page.getByTestId('site-search-input').fill('الانطولوجيا');
  const first = page.getByTestId('site-search-results').locator('li').first();
  await expect(first).toContainText('الجزء 12');
  await first.locator('button').click();
  await expect(page.locator('.ft-rail button[aria-current="step"]')).toHaveAttribute('aria-label', /الجزء 12:/);
  await expect(page.locator('.site-search-flash')).toBeInViewport();
});

test('the search index is up to date: every heading in every lab and part is in it', async ({ page }) => {
  test.setTimeout(120_000);
  const index = JSON.parse(readFileSync(new URL('../public/search-index.en.json', import.meta.url), 'utf8')) as { entries: { heading: string }[] };
  const known = new Set(index.entries.map(entry => entry.heading));
  const missing: string[] = [];
  const check = async (where: string) => {
    const headings = await page.evaluate(() => [...document.querySelectorAll('main h1, main h2, main h3, main h4, main h5, main h6')]
      .filter(heading => heading.getClientRects().length && !heading.closest('nav, [aria-hidden="true"], .ft-rail, .ft-part-tabs'))
      .map(heading => (heading.textContent ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean));
    for (const heading of headings) if (!known.has(heading)) missing.push(`${where}: ${heading}`);
  };
  await page.goto('/');
  const labs = page.locator('.workspace-tabs button');
  for (let i = 0; i < await labs.count(); i++) {
    await labs.nth(i).click();
    await page.waitForTimeout(300);
    await check(await labs.nth(i).innerText());
  }
  const rail = page.locator('.ft-rail button');
  for (let j = 0; j < await rail.count(); j++) {
    await rail.nth(j).click();
    const tabs = page.locator('.ft-part-tabs [role="tab"]');
    for (let k = 0; k < Math.max(1, await tabs.count()); k++) {
      if (await tabs.count()) await tabs.nth(k).click();
      await page.waitForTimeout(150);
      await check(`Fine-tuning part ${j + 1}, tab ${k + 1}`);
    }
  }
  expect(missing, 'Run "npm run build && npm run search-index" to rebuild the search index.').toEqual([]);
});

test('the fine-tuning lab search button opens the site search', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();
  await page.locator('.ft-search-button').click();
  await expect(page.getByTestId('site-search')).toBeVisible();
});
