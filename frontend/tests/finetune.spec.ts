import { expect, test } from '@playwright/test';

test('trains a LoRA adapter beside frozen weights and shows rank matters', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();
  await expect(page.getByRole('heading', { name: 'Teach a ready-made model your own subject' })).toBeVisible();
  await expect(page.locator('.llm-stage')).toHaveCount(8);

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

test('explains each part of a scene when it is clicked', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();
  const quant = page.locator('#ft-scene-quant');

  // Clicking a part of the picture opens its explanation, which follows the current step.
  // (the bars area is eight separate columns, so click one of them, not the gap in the middle)
  await quant.getByRole('button', { name: 'Explain: The coloured bars' }).locator('rect').first().click();
  const card = quant.locator('.ft-explain-card');
  await expect(card.getByRole('heading', { name: 'The coloured bars' })).toBeVisible();
  await expect(card).toContainText('These are the raw weights');
  await quant.getByRole('button', { name: /^3: Divide by absmax/ }).click();
  await expect(card).toContainText('All bars grew by the same factor');

  // A part that is not on screen yet can be reached from its name.
  await quant.locator('.ft-explain-chip[data-figure="levels"]').click();
  await expect(card).toContainText('This part appears in step 4');
  await card.getByRole('button', { name: 'Show me' }).click();
  await expect(quant.locator('.ft-scene-count')).toHaveText('4 / 8');
  await expect(quant.getByRole('button', { name: 'Explain: The 16 NF4 levels' })).toHaveAttribute('aria-pressed', 'true');

  await card.getByRole('button', { name: 'Close the explanation' }).click();
  await expect(card).toHaveCount(0);

  // The other scenes are explained the same way, in Arabic too.
  await page.getByRole('button', { name: 'العربية' }).click();
  const unsloth = page.locator('#ft-scene-unsloth');
  await unsloth.getByRole('button', { name: 'اشرح: بطاقة GPU وشريط ذاكرتها' }).click();
  await expect(unsloth.locator('.ft-explain-card')).toContainText('نفاد الذاكرة');
});

test('walks the TurathAI case study: journey, dataset split, evaluation and checklist', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();
  const turath = page.locator('#ft-turath');
  await expect(turath.getByRole('heading', { name: 'TurathAI: fine-tuning a model on Omani heritage' })).toBeVisible();
  await expect(turath.locator('.tj-questions > div')).toHaveCount(4);

  // The journey follows the report's phases.
  const journey = page.locator('#tj-journey');
  await expect(journey.locator('.ft-scene-count')).toHaveText('1 / 9');
  await journey.getByRole('button', { name: /^5: Phase 3 · Split by story family/ }).click();
  await expect(journey.locator('.tj-card')).toHaveCount(10);
  await journey.getByRole('button', { name: /^7: Phase 5/ }).click();
  await expect(journey.locator('.ft-scene-caption strong')).toHaveText('Phase 5 · Fine-tune with QLoRA and Unsloth');

  // Real Arabic records become JSONL, and splitting one story across sets is flagged as a leak.
  const builder = turath.locator('.tj-builder');
  await builder.getByRole('button', { name: 'Al-Khanjar' }).click();
  await expect(builder.locator('.tj-jsonl code')).toHaveCount(3);
  await expect(builder.locator('.tj-jsonl')).toContainText('ممّ يُصنع الخنجر؟');
  await expect(builder.locator('.tj-verdict-box')).toHaveClass(/ok/);
  await builder.getByRole('combobox', { name: 'Set for question 3' }).selectOption('test');
  await expect(builder.locator('.tj-verdict-box')).toHaveClass(/bad/);
  await expect(builder.locator('.tj-verdict-box')).toContainText('Leak!');

  // The RAG scene ends with an admin update that needs no retraining.
  const rag = page.locator('#tj-rag');
  await rag.getByRole('button', { name: /^7: An admin adds new heritage/ }).click();
  await expect(rag.locator('.ft-scene-caption strong')).toHaveText('An admin adds new heritage, no retraining needed');

  // Scoring an answer, then revealing the teacher's scores.
  const evaluation = turath.locator('.tj-eval');
  await evaluation.getByRole('group', { name: 'Original model: Factual accuracy' }).getByRole('button', { name: '2' }).click();
  await expect(evaluation.getByTestId('eval-total-0')).toHaveText('2 / 20');
  await evaluation.getByRole('button', { name: 'Compare with the teacher’s scoring' }).click();
  await expect(evaluation.locator('.tj-why')).toHaveCount(3);

  // The phase checklist is remembered.
  const checklist = turath.locator('.tj-checklist');
  await checklist.getByRole('checkbox').first().check();
  await expect(checklist.locator('.tj-progress span')).toHaveText('1 / 8');
  await page.reload();
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();
  await expect(page.locator('#ft-turath .tj-progress span')).toHaveText('1 / 8');
});

test('shows the TurathAI case study in Arabic', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'العربية' }).click();
  await page.getByRole('button', { name: 'مختبر الضبط الدقيق' }).click();
  const turath = page.locator('#ft-turath');
  await expect(turath.getByRole('heading', { name: 'تراث AI: ضبط نموذج بدقة على التراث العُماني' })).toBeVisible();
  await expect(page.locator('#tj-journey .ft-scene-caption strong')).toHaveText('المرحلة 2 · جمع التراث من مصادر موثوقة');
  await expect(turath.locator('.tj-builder')).toContainText('مدخل في سجل المصادر');
});
