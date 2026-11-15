import { expect, test } from '@playwright/test';

test('shows the neuron anatomy, the activation curve, and the real slope in the backward pass', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('img', { name: /Neuron anatomy: 2 inputs/ })).toBeVisible();
  await expect(page.getByRole('img', { name: /ReLU curve\. This neuron is at z 3, output 3/ })).toBeVisible();

  // A sigmoid neuron: its slope is a × (1 − a), never a flat 1.
  await page.getByRole('button', { name: 'AND gate' }).first().click();
  await expect(page.getByRole('img', { name: /Sigmoid curve/ })).toBeVisible();
  await page.getByRole('button', { name: 'Run backward pass' }).click();
  await page.getByRole('button', { name: 'Next step' }).click();
  await page.getByRole('button', { name: 'Next step' }).click();
  const math = page.locator('.backprop-math');
  await expect(math).toContainText('Sigmoid slope: f′(z) = a × (1 − a)');
  await expect(math).toContainText(/δ = ∂L\/∂a × f′\(z\) = -?[\d.]+ × 0\.2\d+ =/);
});

test('walks the lesson guide, hides the intro, and searches the glossary', async ({ page }) => {
  await page.goto('/');
  const guide = page.getByRole('region', { name: 'Lesson guide' });
  await expect(guide).toContainText('Lesson 1');
  await expect(guide).toContainText('What does one neuron actually calculate?');
  await expect(page.locator('.tab-number')).toHaveCount(8);

  await page.getByRole('button', { name: 'Hide intro' }).click();
  await expect(page.locator('.hero')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Show intro' })).toBeVisible();
  await page.getByRole('button', { name: 'Show intro' }).click();
  await expect(page.locator('.hero')).toBeVisible();

  await page.getByRole('button', { name: 'Continue to lesson 2 of 8' }).click();
  await expect(guide).toContainText('How does a network learn from examples?');
  await expect(page.locator('.workspace-tabs button.current')).toContainText('Teach the network');

  await page.getByRole('button', { name: 'Glossary' }).click();
  await page.getByLabel('Search the glossary').fill('softmax');
  await expect(page.locator('.glossary dt', { hasText: 'Softmax' })).toBeVisible();
  await expect(page.locator('.glossary dt', { hasText: 'Bias' })).toHaveCount(0);
  await page.locator('.glossary dl > div', { hasText: 'Softmax' }).first().getByRole('button').click();
  await expect(page.getByRole('heading', { name: /language model guesses the next token/i })).toBeVisible();
});

test('walks the LLM pipeline stage by stage and reports unknown words', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'LLM playground' }).click();
  await expect(page.locator('.llm-stage')).toHaveCount(6);
  await expect(page.locator('.llm-answer strong')).toHaveText('mat');

  // Tokens: every word becomes its number in the vocabulary.
  await expect(page.locator('.llm-token-chip')).toHaveCount(5);
  await expect(page.locator('.llm-vocab .used')).toHaveCount(4);

  // Embeddings: token row + position row = the vector the model reads.
  const embeddings = page.locator('#llm-embeddings');
  await expect(embeddings.locator('.llm-strip')).toHaveCount(3);
  await embeddings.getByRole('button', { name: 'Inspect position 2: cat' }).click();
  await expect(embeddings).toContainText('Token row for “cat”');

  // The rail jumps to a stage and shows its live value.
  const rail = page.getByRole('navigation', { name: 'Stages of the model' });
  await rail.getByRole('button', { name: 'Stage 4: MLP' }).click();
  await expect(rail.getByRole('button', { name: 'Stage 4: MLP' })).toHaveAttribute('aria-current', 'step');
  await expect(page.locator('.llm-neuron')).toHaveCount(32);
  await expect(page.locator('#llm-attention')).toContainText('weights that add up to 1');
  await expect(page.locator('#llm-learn')).toContainText('loss = −ln(');
  await expect(page.locator('.llm-error-path li')).toHaveCount(5);

  await page.getByLabel('Prompt').fill('the zebra ran to the');
  await page.getByRole('button', { name: 'Predict next' }).click();
  await expect(page.locator('.llm-unknown')).toContainText('zebra');
});
