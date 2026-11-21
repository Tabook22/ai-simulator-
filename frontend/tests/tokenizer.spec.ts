import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { addVectors, averageVector, embeddingRow, formatNumber, inputVector, positionVector } from '../src/vectors';

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

  // Every token is also a card with its ID underneath.
  const cards = page.getByTestId('tk-cards').locator('.tk-card');
  await expect(cards).toHaveCount(6);
  await expect(cards.nth(1)).toContainText('ship');
  await expect(cards.nth(1).locator('.tk-card-ids')).toHaveText('12407');

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

  // Long text: no cards, just the total and how to read any token.
  await expect(page.getByTestId('tk-many')).toContainText('too many to list one by one');
  await expect(page.getByTestId('tk-cards')).toHaveCount(0);

  // Arabic cards run right to left, English cards left to right.
  await analyze(page, 'بسم الله الرحمن الرحيم\nThe ship reached the port.');
  await expect(page.locator('.tk-cards-line').first()).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('.tk-cards-line').nth(1)).toHaveAttribute('dir', 'ltr');

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

test('tokenizer: click a token to follow it into a vector, then the sentence vector', async ({ page }) => {
  await openTokenizer(page);
  await page.getByRole('button', { name: 'The ship reached the port.' }).click();
  await expect(page.getByTestId('tk-token-count')).toHaveText('6');

  // Click " ship" (ID 12407, position 2): the panel follows it.
  await page.getByTestId('tk-cards').locator('.tk-card').nth(1).click();
  const lab = page.getByTestId('vx-lab');
  await expect(lab.getByTestId('vx-picked')).toContainText('12407');
  await expect(lab.getByTestId('vx-badge')).toContainText('Demonstration table');

  // Token row + position vector = input vector, number by number.
  const row = embeddingRow(12407), place = positionVector(1), total = addVectors(row, place);
  expect(place.slice(0, 2)).toEqual([0.84, 0.54]);
  await expect(lab.getByTestId('vx-token-vector')).toHaveAttribute('aria-label', `Token vector: ${row.map(formatNumber).join(', ')}`);
  await expect(lab.getByTestId('vx-input-vector')).toHaveAttribute('aria-label', `Input vector: ${total.map(formatNumber).join(', ')}`);

  // The whole sentence: 6 rows, then the column averages.
  await expect(lab.getByTestId('vx-matrix').locator('.vx-matrix-row:not(.head)')).toHaveCount(6);
  const ids = [976, 12407, 15237, 290, 3135, 13];
  const sentence = averageVector(ids.map((id, pos) => inputVector(id, pos)));
  await expect(lab.getByTestId('vx-sentence-vector')).toHaveAttribute('aria-label', `Sentence vector: ${sentence.map(formatNumber).join(', ')}`);
  await expect(lab.getByTestId('vx-average-sum')).toContainText(`÷ 6 = ${formatNumber(sentence[0])}`);

  // Clicking a matrix row selects that token; the next button moves along.
  await lab.getByTestId('vx-matrix').locator('.vx-matrix-row:not(.head)').nth(4).click();
  await expect(lab.getByTestId('vx-picked')).toContainText('3135');
  await lab.getByRole('button', { name: 'Next token' }).click();
  await expect(lab.getByTestId('vx-picked')).toContainText('13');
  await lab.getByRole('button', { name: 'Play the steps' }).click();
  await expect(lab.locator('.vx-stage.spot')).toHaveCount(1);
});

test('vectors: same ID, same row; position changes the input vector', () => {
  expect(embeddingRow(1645)).toEqual(embeddingRow(1645));
  expect(embeddingRow(1645)).toHaveLength(8);
  expect(inputVector(1645, 5)).not.toEqual(inputVector(1645, 8));
  expect(positionVector(0)).toEqual([0, 1, 0, 1, 0, 1, 0, 1]);
  expect(averageVector([[0.1, -0.385, 0, 0, 0, 0, 0, 0], [0.2, -0.385, 0, 0, 0, 0, 0, 0]])[1]).toBe(-0.39);
});
