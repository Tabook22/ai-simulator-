import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function openTokenizer(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Tokenizer$/ }).first().click();
  await expect(page.getByRole('heading', { name: 'See how a real tokenizer cuts your text' })).toBeVisible();
}

/** The count on screen must equal the number of token IDs the backend's tokenizer returned. */
async function analyze(page: Page, text: string) {
  const response = page.waitForResponse(reply => reply.url().endsWith('/api/tokenize') && reply.request().postDataJSON().text === text);
  await page.getByTestId('tk-input').fill(text);
  await page.getByRole('button', { name: 'Analyze text' }).click();
  const data = await (await response).json() as { token_count: number; tokens: { id: number }[]; segments: { text: string }[] };
  expect(data.token_count).toBe(data.tokens.length);
  await expect(page.getByTestId('tk-token-count')).toHaveText(data.token_count.toLocaleString('en-US'));
  return data;
}

test('tokenizer: counts, preview, hover details and the token table', async ({ page }) => {
  await openTokenizer(page);
  await expect(page.getByTestId('tk-engine')).toContainText('tiktoken');
  await expect(page.getByTestId('tk-engine')).toContainText('o200k_base');

  // The English example: 6 tokens and 5 words, with the real IDs.
  await page.getByRole('button', { name: 'The ship reached the port.' }).click();
  await expect(page.getByTestId('tk-token-count')).toHaveText('6');
  await expect(page.getByTestId('tk-word-count')).toHaveText('5');
  const preview = page.getByTestId('tk-preview');
  await expect(preview.locator('.tk-seg')).toHaveCount(6);
  await expect(preview).toHaveText('The ship reached the port.');

  // Hover shows the labelled position and ID; keyboard focus does too.
  await preview.locator('.tk-seg').nth(1).hover();
  await expect(page.getByTestId('tk-tip')).toContainText('Token position');
  await expect(page.getByTestId('tk-tip')).toContainText('12407');
  await preview.locator('.tk-seg').first().focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('tk-tip')).toContainText('15237');

  // The table: Position, Token piece, Token ID, with spaces made visible.
  await page.getByText(/Every token in a table/).click();
  const table = page.getByTestId('tk-table');
  await expect(table.locator('thead')).toContainText('Position');
  await expect(table.locator('thead')).toContainText('Token piece');
  await expect(table.locator('tbody tr')).toHaveCount(6);
  await expect(table.locator('tbody tr').nth(1)).toContainText('·ship');

  await expect(page.getByTestId('tk-explain')).toContainText('A token is a piece of text.');
});

test('tokenizer: Arabic, mixed text, emoji, spaces, blank, a full page and the limit', async ({ page }) => {
  await openTokenizer(page);
  for (const text of [
    'ship',
    'In the name of Allah, the Most Gracious, the Most Merciful.',
    'بسم الله الرحمن الرحيم',
    'The Arabic word سفينة means ship.\nوكلمة port تعني الميناء.',
    'Ship 🚢 and astronaut 👩🏽‍🚀',
    '   repeated   spaces\n\n',
  ]) {
    const data = await analyze(page, text);
    // The coloured preview rebuilds the submitted text exactly.
    expect(data.segments.map(segment => segment.text).join('')).toBe(text);
    const shown = await page.getByTestId('tk-preview').locator('.tk-seg').evaluateAll(nodes => nodes.map(node => node.textContent!.replace(/↵/g, '')).join(''));
    expect(shown).toBe(text);
  }

  // Emoji: some tokens hold only part of a character; the table shows their bytes.
  await analyze(page, '🚢');
  await page.getByText(/Every token in a table/).click();
  await expect(page.getByTestId('tk-table').locator('.tk-bytes').first()).toBeVisible();

  // Blank input.
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(page.getByTestId('tk-token-count')).toHaveText('0');
  await expect(page.getByTestId('tk-empty')).toBeVisible();

  // A full page of text.
  const fullPage = 'The ship reached the port after a long voyage. وصلت السفينة إلى الميناء بعد رحلة طويلة.\n'.repeat(40);
  await analyze(page, fullPage);

  // Over the limit: a clear message, and Analyze is disabled.
  await page.getByTestId('tk-input').fill('a'.repeat(20_001));
  await expect(page.getByTestId('tk-limit')).toContainText('up to 20,000 characters');
  await expect(page.getByRole('button', { name: 'Analyze text' })).toBeDisabled();
});

test('tokenizer: live counting as you type, in Arabic', async ({ page }) => {
  await openTokenizer(page);
  await page.getByRole('button', { name: 'العربية' }).click();
  await expect(page.getByRole('heading', { name: 'شاهد كيف يقطّع مُرمِّز حقيقي نصّك' })).toBeVisible();
  await page.getByTestId('tk-input').fill('السفينة وصلت');
  await expect(page.getByTestId('tk-word-count')).toHaveText('2');
  await page.getByTestId('tk-input').pressSequentially(' إلى الميناء.');
  await expect(page.getByTestId('tk-word-count')).toHaveText('4');
  await expect(page.getByTestId('tk-explain')).toContainText('الرمز قطعة من النص');
});
