import { expect, test } from '@playwright/test';

test('trains a LoRA adapter beside frozen weights and shows rank matters', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();
  await expect(page.getByRole('heading', { name: 'Teach a ready-made model your own subject' })).toBeVisible();
  await expect(page.locator('.llm-stage')).toHaveCount(7);

  const lora = page.locator('#ft-lora .llm-stage-body');
  const loss = async () => Number(await lora.getByTestId('lora-loss').textContent());
  const start = await loss();

  // Rank 1 is too narrow for this task: it improves, then gets stuck.
  await lora.getByRole('button', { name: 'Rank 1', exact: true }).click();
  for (let run = 0; run < 6; run++) await lora.getByRole('button', { name: 'Train 40 steps' }).click();
  const narrow = await loss();
  expect(narrow).toBeLessThan(start);
  expect(narrow).toBeGreaterThan(0.1);

  // Rank 2 can match the change exactly, and the original weights never move.
  await lora.getByRole('button', { name: 'Rank 2', exact: true }).click();
  for (let run = 0; run < 6; run++) await lora.getByRole('button', { name: 'Train 40 steps' }).click();
  expect(await loss()).toBeLessThan(0.01);
  await expect(lora.getByTestId('lora-steps')).toHaveText('240');
  await expect(lora.getByTestId('lora-frozen')).toHaveText('0');

  await lora.getByRole('button', { name: 'Merge the adapter into W' }).click();
  await expect(lora.locator('.ft-lora.merged .ft-heat')).toHaveCount(2);
});

test('quantizes weights, sizes a QLoRA run, and walks the Unsloth steps', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();

  const quant = page.locator('#ft-quant .llm-stage-body');
  const error = async () => Number(await quant.getByTestId('quant-error').textContent());
  const even = await error();
  await quant.getByRole('button', { name: 'NF4' }).click();
  expect(await error()).toBeLessThan(even);
  await quant.getByRole('button', { name: '2 bits' }).click();
  expect(await error()).toBeGreaterThan(even);

  // An 8B model at 4-bit trains on a 16 GB card; at 16-bit it does not.
  const qlora = page.locator('#ft-qlora');
  const sixteen = qlora.locator('.ft-gpus li', { hasText: '16 GB' });
  await expect(sixteen).toHaveClass(/fits/);
  await qlora.getByRole('button', { name: '16-bit base' }).click();
  await expect(sixteen).not.toHaveClass(/fits/);

  const unsloth = page.locator('#ft-unsloth .llm-stage-body');
  await expect(unsloth.locator('pre')).toContainText('load_in_4bit = True');
  await unsloth.getByRole('button', { name: 'Next step' }).click();
  await expect(unsloth.locator('pre')).toContainText('get_peft_model');

  const quiz = page.locator('.ft-quiz');
  await quiz.getByRole('button', { name: 'They are frozen; only the small adapters change.' }).click();
  await expect(quiz.getByTestId('quiz-score')).toHaveText('1 / 5');
});

test('shows the fine-tuning lab in Arabic', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'العربية' }).click();
  await page.getByRole('button', { name: 'مختبر الضبط الدقيق' }).click();
  await expect(page.getByRole('heading', { name: 'علّم نموذجًا جاهزًا مادتك أنت' })).toBeVisible();
  await expect(page.locator('#ft-lora')).toContainText('الأوزان الأصلية');
  await expect(page.locator('#ft-unsloth pre')).toContainText('load_in_4bit = True');
});

test('steps through the animated scenes for adapters, quantization and Unsloth', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();

  // Adding adapters: the frozen W gets a lock, then A and B appear and finally merge into W.
  const adapter = page.locator('#ft-scene-adapter');
  await expect(adapter.locator('.ft-scene-caption strong')).toHaveText('A layer of the base model');
  await adapter.getByRole('button', { name: 'Next step' }).click();
  await expect(adapter.locator('.ft-scene-caption strong')).toHaveText('Freeze every original weight');
  await expect(adapter.locator('.ft-w')).toHaveClass(/frozen/);
  await adapter.getByRole('button', { name: /^6: Forward pass/ }).click();
  await expect(adapter.locator('.ft-packet')).toHaveCount(6);
  await adapter.getByRole('button', { name: /^9: Merge/ }).click();
  await expect(adapter.locator('.ft-adapter')).toHaveClass(/merged/);
  await expect(adapter.getByRole('button', { name: 'Play again' })).toBeVisible();

  // Quantization: 16 real float16 bits per weight become 4-bit codes.
  const quant = page.locator('#ft-scene-quant');
  await expect(quant.locator('.ft-memory-line')).toHaveText('8 × 16 bits = 128 bits');
  await quant.getByRole('button', { name: /^6: Keep the 4-bit code/ }).click();
  await expect(quant.locator('.ft-memory-line')).toContainText('8 × 4 bits = 32 bits');

  // Unsloth: the code line follows the step, and Play advances on its own.
  const unsloth = page.locator('#ft-scene-unsloth');
  await expect(unsloth.locator('.ft-code-text')).toHaveText('pip install unsloth');
  await unsloth.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(unsloth.locator('.ft-code-text')).toContainText('load_in_4bit = True', { timeout: 8000 });
  await expect(unsloth.locator('.ft-scene-count')).toHaveText('2 / 7');
});
