import { expect, test } from '@playwright/test';

test('trains a LoRA adapter beside frozen weights and shows rank matters', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();
  await expect(page.getByRole('heading', { name: 'Teach a ready-made model your own subject' })).toBeVisible();
  await expect(page.locator('.llm-stage')).toHaveCount(12);

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
  await quant.getByRole('button', { name: '2 bits', exact: true }).click();
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
  await expect(quiz.getByTestId('quiz-score')).toHaveText('1 / 10');
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

  // Pointing at a bit magnifies its weight's 16 bits with each 1 and 0 written in.
  await quant.getByRole('button', { name: /^1: Weights stored/ }).click();
  await quant.locator('.ft-bit-hits > g').first().locator('rect').nth(3).hover();
  const lens = quant.locator('.ft-lens');
  await expect(lens).toContainText('Weight 1: 0.42 stored in 16 bits');
  await expect(lens.locator('.ft-lens-digit')).toHaveText('0011011010111000'.split(''));
  await expect(lens).toContainText('This bar is blue, so it is 1 (bit 4 of 16, exponent)');
  await page.mouse.move(5, 5);
  await expect(lens).toHaveCount(0);

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

test('teaches the key words: the loop scene, the locked calculator and the glossary', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();
  const words = page.locator('#ft-words');
  const loop = words.locator('#ft-scene-terms');
  await loop.getByRole('button', { name: /^6: Gradient/ }).click();
  await expect(loop.locator('.ls-node.current')).toContainText('Gradient');
  await expect(loop.locator('.ft-packet.error')).toHaveCount(6);

  // Only the free knob turns; the locked base keeps doing most of the work.
  const body = words.locator('.llm-stage-body');
  await expect(body.getByTestId('calc-error')).toContainText('-2.00');
  for (let step = 0; step < 12; step++) await body.getByRole('button', { name: 'Train one step' }).click();
  await expect(body.getByTestId('calc-error')).toContainText('0.00');
  await expect(body).toContainText('12 steps · the locked knob never moved');

  await body.getByRole('searchbox', { name: 'Search the glossary' }).fill('accumulation');
  await expect(body.locator('.lx-term')).toHaveCount(1);
  await body.locator('.lx-term', { hasText: 'Gradient accumulation' }).getByRole('button', { name: 'See it in part 9' }).click();
  await expect(page.locator('#ft-step')).toBeInViewport();
});

test('turns documents into JSONL: formats, the line checker and the token mask', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();
  const docs = page.locator('#ft-scene-docs');
  await docs.getByRole('button', { name: /^6: Save each pair/ }).click();
  await expect(docs.locator('.ls-jline')).toHaveCount(3);

  const data = page.locator('#ft-data .llm-stage-body');
  await data.getByRole('tab', { name: /instruction \(Alpaca\)/ }).click();
  await expect(data.locator('.lx-json')).toContainText('"instruction"');
  await data.getByRole('tab', { name: /preference pairs/ }).click();
  await expect(data.locator('.lx-json')).toContainText('"rejected"');

  // The checker finds each kind of mistake, and a clean file passes.
  await expect(data.getByTestId('jsonl-summary')).toHaveText('2 valid records · 6 lines with problems');
  await expect(data.locator('.lx-results')).toContainText('not single quotes');
  await expect(data.locator('.lx-results')).toContainText('comma before a closing bracket');
  await data.getByRole('button', { name: 'Load a clean file' }).click();
  await expect(data.getByTestId('jsonl-summary')).toHaveText('2 valid records · 0 lines with problems');
  await data.getByRole('textbox', { name: 'JSONL text' }).fill('{"messages":[{"role":"user","content":"Hi"}]}');
  await expect(data.locator('.lx-results')).toContainText('The last turn should be the assistant’s answer.');

  // Masking the prompt trains on the answer only; a short limit cuts the answer.
  const trained = async () => Number(await data.getByTestId('token-trained').textContent());
  const answerOnly = await trained();
  await data.getByRole('checkbox', { name: 'Train on the answer only (mask the prompt)' }).uncheck();
  expect(await trained()).toBeGreaterThan(answerOnly);
  await data.getByRole('slider', { name: 'Maximum sequence length' }).fill('20');
  await expect(data.getByTestId('token-warning')).toContainText('The answer is cut off');
});

test('compares the approaches and works through LoRA, QLoRA and a training step', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();
  const freeze = page.locator('#ft-freeze .llm-stage-body');
  await freeze.getByRole('button', { name: 'Full fine-tuning' }).click();
  await expect(freeze.getByTestId('approach-learn')).toHaveText('8.2B');
  await freeze.getByRole('button', { name: 'QLoRA', exact: true }).click();
  await expect(freeze.locator('.lx-wall-cells.q4')).toHaveCount(8);

  // Activity 2 from the notes: 2,000 × 2,000 at rank 4.
  const lora = page.locator('#ft-lora .llm-stage-body');
  await expect(lora.getByTestId('lora-total')).toContainText('16,000 (1.60%)');
  await lora.getByRole('button', { name: 'Activity 2' }).click();
  await expect(lora.getByTestId('lora-total')).toHaveText('?');
  await lora.getByRole('textbox', { name: 'Your answer' }).fill('16000');
  await expect(lora.locator('.lx-activity')).toContainText('Correct');
  await expect(lora.getByTestId('init-zero')).toHaveText('2.01');
  expect(Number(await lora.getByTestId('init-good').textContent())).toBeLessThan(0.05);

  const qlora = page.locator('#ft-qlora .llm-stage-body');
  await qlora.getByRole('button', { name: 'LoRA, then quantize later' }).click();
  await expect(qlora.locator('.lx-order-steps')).toContainText('Merge, then quantize');
  await expect(qlora.locator('.lx-memory-row').last()).toContainText('13.5 GB');

  const step = page.locator('#ft-step');
  await step.locator('#ft-scene-step').getByRole('button', { name: /^4: Loss/ }).click();
  await expect(step.locator('.ls-loss')).toHaveText('−log 0.22 = 1.51');
  const body = step.locator('.llm-stage-body');
  await expect(body.getByTestId('effective-batch')).toHaveText('16');
  await expect(body.getByTestId('steps-epoch')).toHaveText('50');
  await body.getByRole('button', { name: 'Accumulation 4' }).click();
  await expect(body.getByTestId('effective-batch')).toHaveText('8');
  await body.getByRole('button', { name: /Too large/ }).click();
  await body.getByRole('button', { name: '8 steps' }).click();
  expect(Number((await body.getByTestId('lr-loss').textContent())!.match(/loss ([\d.]+)/)![1])).toBeGreaterThan(5);
});

test('walks the workflow: order the cards, unpack the adapter and judge the myths', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();
  const flow = page.locator('#ft-workflow .llm-stage-body');
  for (const card of ['Prepare source-based examples', 'Load the 4-bit base', 'Attach adapters', 'Train', 'Evaluate on unseen questions', 'Save the adapters']) {
    await flow.locator('.lx-cards').getByRole('button', { name: card, exact: true }).click();
  }
  await expect(flow.getByTestId('order-result')).toContainText('A defensible order');

  await flow.getByRole('button', { name: 'adapter_config.json' }).click();
  await expect(flow.locator('.lx-package-what')).toContainText('Rank, alpha, target modules');
  await flow.getByRole('button', { name: 'Merged model' }).click();
  await expect(flow.locator('.lx-deploy')).toContainText('W′ = W + s·B·A');

  const myth = flow.locator('.lx-myths li').first();
  await myth.getByRole('button', { name: 'False' }).click();
  await expect(myth).toContainText('Freezing is a choice');
  await expect(flow.getByTestId('myth-score')).toHaveText('1 of 10 right');
});

test('shows the new parts and the kitchen scene in Arabic', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'العربية' }).click();
  await page.getByRole('button', { name: 'مختبر الضبط الدقيق' }).click();
  await expect(page.locator('#ft-words-title')).toHaveText('الكلمات الأساسية');
  await expect(page.locator('#ft-data-title')).toHaveText('من المستندات إلى JSONL');
  const kitchen = page.locator('#ft-scene-kitchen');
  await kitchen.getByRole('button', { name: /^4: إلى الفرن/ }).click();
  await expect(kitchen.locator('.ls-chip-text').first()).toHaveText('أوزان الأساس:');
  await kitchen.getByRole('button', { name: 'اشرح: الطاهي: شيفرتك مع Unsloth' }).locator('rect').first().click();
  await expect(kitchen.locator('.ft-explain-card')).toContainText('الباحث ما زال يختار');
  await expect(page.locator('#ft-data .lx-results').first()).toContainText('علامات تنصيص مزدوجة');
});

test('explains fine-tuning versus RAG: the storyteller scene, the decision, the data sorting', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();
  const hybrid = page.locator('#ft-hybrid');
  const scene = hybrid.locator('#ft-scene-hybrid');

  // With the library, the answer names its source; without it, details are invented.
  await scene.getByRole('button', { name: /^5: …and names the source/ }).click();
  await expect(scene.locator('.hy-tag-text')).toHaveText('Source: Dhofar oral collection, 2019');
  await scene.getByRole('button', { name: /^6: A story the library/ }).click();
  await expect(scene.locator('.hy-answer')).toContainText('I don’t have a recorded source for this story.');
  await scene.getByRole('button', { name: /^7: Without the library/ }).click();
  await expect(scene.locator('.hy-answer.invented')).toBeVisible();

  const body = hybrid.locator('.llm-stage-body');
  await body.getByRole('button', { name: 'New facts or documents' }).click();
  await expect(body.getByTestId('decide-usual')).toHaveText('RAG (retrieval)');

  await expect(body.getByTestId('strength-total')).toContainText('Score: 10 of 10');
  await body.getByRole('button', { name: 'Fine-tuning only' }).click();
  await expect(body.getByTestId('strength-total')).toContainText('Score: 4 of 10');

  // Sort the data: real stories to the library, behaviour examples to fine-tuning.
  const items = body.locator('.hy-items li');
  await items.nth(0).getByRole('button', { name: 'RAG library' }).click();
  await items.nth(1).getByRole('button', { name: 'Fine-tuning set' }).click();
  await items.nth(2).getByRole('button', { name: 'Fine-tuning set' }).click();
  await expect(items.nth(2)).toContainText('It belongs in the library.');
  await expect(body.getByTestId('sorter-score')).toContainText('2 of 6 placed correctly');
  await expect(body.locator('.hy-bin.rag span')).toHaveCount(1);

  await body.getByRole('button', { name: 'Same data in both' }).click();
  await expect(body.getByTestId('split-note')).toContainText('Avoid this');
  await expect(body.locator('.hy-tune .lx-json')).toContainText('"system"');
});

test('shows the three analogies: extra lessons, sticky notes and a compressed photo', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();
  await expect(page.locator('#ft-why .hy-analogy')).toHaveCount(3);

  const lora = page.locator('#ft-lora .llm-stage-body');
  await lora.getByRole('button', { name: 'Train: add a note' }).click();
  await lora.getByRole('button', { name: 'Train: add a note' }).click();
  await expect(lora.locator('.hy-note')).toHaveCount(2);
  await lora.getByRole('button', { name: 'Merge: print a new edition' }).click();
  await expect(lora.locator('.hy-printed')).toHaveCount(2);
  await expect(lora.getByTestId('sticky-note')).toContainText('W′ = W + B·A');

  const quant = page.locator('#ft-quant .llm-stage-body');
  await quant.getByRole('button', { name: '2 bits per colour' }).click();
  await expect(quant.locator('.hy-photos figcaption').last()).toContainText('4 shades per colour · file 25%');
});

test('explains what a parameter is: the neuron, the ladder and facts versus patterns', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();
  const words = page.locator('#ft-words .llm-stage-body');

  // The worked example: z = 2 × 0.5 + 3 × 0.4 + 0.2 = 2.4.
  await expect(words.getByTestId('neuron-equation')).toContainText('= 2.40');
  await words.getByRole('slider', { name: 'b', exact: true }).fill('0.5');
  await expect(words.getByTestId('neuron-equation')).toContainText('= 2.70');

  // Full fine-tuning moves the original parameters; LoRA leaves them alone.
  await words.getByRole('button', { name: 'Train every parameter' }).click();
  await words.getByRole('button', { name: 'Train one step' }).first().click();
  await expect(words.getByTestId('neuron-changed')).toHaveText('3');
  await words.getByRole('button', { name: 'Train the LoRA way' }).click();
  for (let step = 0; step < 15; step++) await words.getByRole('button', { name: 'Train one step' }).first().click();
  await expect(words.getByTestId('neuron-changed')).toHaveText('0');
  await expect(words.getByTestId('neuron-error')).toHaveText('-0.00');
  await expect(words.getByTestId('neuron-equation')).toContainText('2.0 × (0.50 +');

  await words.getByRole('button', { name: 'Zoom out' }).click();
  await words.getByRole('button', { name: 'Zoom out' }).click();
  await expect(words.locator('.pm-rungs li.shown')).toHaveCount(3);

  await words.getByRole('button', { name: 'Muscat is the capital of Oman' }).click();
  await expect(words.locator('.pm-rows li.hit')).toHaveText('Muscat is the capital of Oman');
  expect(await words.locator('.pm-cells i.strong').count()).toBeGreaterThan(20);
});
