import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { BANK, BANK_SIZE } from '../src/quiz/bank';
import { RESOURCES, STEPS } from '../src/quiz/learnMore';
import { topicsFor, webSearches } from '../src/quiz/searchTopics';

/** The lab shows one part at a time; open a part, then one of its Watch / Try / Remember tabs. */
const PARTS = ['why', 'words', 'data', 'freeze', 'lora', 'quant', 'qlora', 'unsloth', 'step', 'workflow', 'hybrid', 'rag', 'recipe', 'turath', 'vision', 'utas'];
const TABS = { watch: /^(Watch|شاهد)/, try: /^(Try|جرّب)/, remember: /^(Remember|تذكّر)/ };
async function part(page: Page, key: string, tab: keyof typeof TABS = 'try', scene = 0) {
  const number = PARTS.indexOf(key) + 1;
  await page.locator('.ft-rail').getByRole('button', { name: new RegExp(`^(Part|الجزء) ${number}:`) }).click();
  if (key === 'turath') return;
  await page.locator(`#ft-${key} .ft-part-tabs`).getByRole('tab', { name: TABS[tab] }).click();
  if (tab === 'watch' && scene) await page.locator(`#ft-${key} .ft-scene-pick button`).nth(scene).click();
}

test('trains a LoRA adapter beside frozen weights and shows rank matters', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();
  await expect(page.getByRole('heading', { name: 'Teach a ready-made model your own subject' })).toBeVisible();
  // One part at a time: six chapters on the pipeline map, 14 parts and 2 review pages in the rail.
  await expect(page.locator('.llm-stage')).toHaveCount(1);
  await expect(page.locator('.ft-map-step')).toHaveCount(6);
  await expect(page.locator('.ft-rail .llm-rail-dot')).toHaveCount(18);
  await part(page, 'lora');

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

  await part(page, 'quant');
  const quant = page.locator('#ft-quant .llm-stage-body');
  const error = async () => Number(await quant.getByTestId('quant-error').textContent());
  const even = await error();
  await quant.getByRole('button', { name: 'NF4' }).click();
  expect(await error()).toBeLessThan(even);
  await quant.getByRole('button', { name: '2 bits', exact: true }).click();
  expect(await error()).toBeGreaterThan(even);

  // An 8B model at 4-bit trains on a 16 GB card; at 16-bit it does not.
  await part(page, 'qlora');
  const qlora = page.locator('#ft-qlora');
  const sixteen = qlora.locator('.ft-gpus li', { hasText: '16 GB' });
  await expect(sixteen).toHaveClass(/fits/);
  await qlora.getByRole('button', { name: '16-bit base' }).click();
  await expect(sixteen).not.toHaveClass(/fits/);

  await part(page, 'unsloth');
  const unsloth = page.locator('#ft-unsloth .llm-stage-body');
  await expect(unsloth.locator('pre')).toContainText('load_in_4bit = True');
  await unsloth.getByRole('button', { name: 'Next step' }).click();
  await expect(unsloth.locator('pre')).toContainText('get_peft_model');

  await page.locator('.ft-rail').getByRole('button', { name: /Check yourself/ }).click();
  const quiz = page.locator('.ft-quiz');
  await expect(quiz.locator('.qz-q')).toHaveCount(20);
  await expect(quiz.getByTestId('quiz-score')).toHaveText('0 / 20');
});

test('shows the fine-tuning lab in Arabic', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'العربية' }).click();
  await page.getByRole('button', { name: 'مختبر الضبط الدقيق' }).click();
  await expect(page.getByRole('heading', { name: 'علّم نموذجًا جاهزًا مادتك أنت' })).toBeVisible();
  await part(page, 'lora');
  await expect(page.locator('#ft-lora')).toContainText('الأوزان الأصلية');
  await part(page, 'unsloth');
  await expect(page.locator('#ft-unsloth pre')).toContainText('load_in_4bit = True');
});

test('steps through the animated scenes for adapters, quantization and Unsloth', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();

  // Adding adapters: the frozen W gets a lock, then A and B appear and finally merge into W.
  await part(page, 'lora', 'watch');
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
  await part(page, 'quant', 'watch');
  const quant = page.locator('#ft-scene-quant');
  await expect(quant.locator('.ft-memory-line')).toHaveText('8 × 16 bits = 128 bits');
  await quant.getByRole('button', { name: /^6: Keep the 4-bit code/ }).click();
  await expect(quant.locator('.ft-memory-line')).toContainText('8 × 4 bits = 32 bits');

  // Unsloth: the code line follows the step, and Play advances on its own.
  await part(page, 'unsloth', 'watch', 1);
  const unsloth = page.locator('#ft-scene-unsloth');
  await expect(unsloth.locator('.ft-code-text')).toHaveText('pip install unsloth');
  await unsloth.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(unsloth.locator('.ft-code-text')).toContainText('load_in_4bit = True', { timeout: 8000 });
  await expect(unsloth.locator('.ft-scene-count')).toHaveText('2 / 7');
});

test('explains each part of a scene when it is clicked', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();
  await part(page, 'quant', 'watch');
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
  await part(page, 'unsloth', 'watch', 1);
  const unsloth = page.locator('#ft-scene-unsloth');
  await unsloth.getByRole('button', { name: 'اشرح: بطاقة GPU وشريط ذاكرتها' }).click();
  await expect(unsloth.locator('.ft-explain-card')).toContainText('نفاد الذاكرة');
});

test('walks the TurathAI case study: journey, dataset split, evaluation and checklist', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();
  await part(page, 'turath');
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

  // The online RAG flow is shown once, in part 11; TurathAI links to it.
  await turath.getByRole('button', { name: 'Watch the RAG application' }).click();
  await expect(page.locator('#ft-scene-hybrid')).toBeVisible();
  await part(page, 'turath');

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
  await part(page, 'turath');
  const turath = page.locator('#ft-turath');
  await expect(turath.getByRole('heading', { name: 'تراث AI: ضبط نموذج بدقة على التراث العُماني' })).toBeVisible();
  await expect(page.locator('#tj-journey .ft-scene-caption strong')).toHaveText('المرحلة 2 · جمع التراث من مصادر موثوقة');
  await expect(turath.locator('.tj-builder')).toContainText('مدخل في سجل المصادر');
});

test('teaches the key words: the loop scene, and the glossary in the reference sheet', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();
  await part(page, 'words', 'watch');
  const loop = page.locator('#ft-scene-terms');
  await loop.getByRole('button', { name: /^6: Gradient/ }).click();
  await expect(loop.locator('.ls-node.current')).toContainText('Gradient');
  await expect(loop.locator('.ft-packet.error')).toHaveCount(6);

  // The reference sheet: every part's summary card and the glossary on one page.
  await page.locator('.ft-rail').getByRole('button', { name: /Reference sheet/ }).click();
  const sheet = page.locator('.ft-reference');
  await expect(sheet.locator('.ft-card')).toHaveCount(16);
  await sheet.getByRole('searchbox', { name: 'Search the glossary' }).fill('accumulation');
  await expect(sheet.locator('.ft-glossary > div')).toHaveCount(1);
  await sheet.getByTestId('card-step').getByRole('button', { name: 'Open the part' }).click();
  await expect(page.locator('#ft-step-title')).toHaveText('One training step');
});

test('turns documents into JSONL: formats, the line checker and the token mask', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();
  await part(page, 'data', 'watch');
  const docs = page.locator('#ft-scene-docs');
  await docs.getByRole('button', { name: /^6: Save each pair/ }).click();
  await expect(docs.locator('.ls-jline')).toHaveCount(3);

  await part(page, 'data');
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
  await part(page, 'freeze');
  const freeze = page.locator('#ft-freeze .llm-stage-body');
  await freeze.getByRole('button', { name: 'Full fine-tuning' }).click();
  await expect(freeze.getByTestId('approach-learn')).toHaveText('8.2B');
  await freeze.getByRole('button', { name: 'QLoRA', exact: true }).click();
  await expect(freeze.locator('.lx-wall-cells.q4')).toHaveCount(8);

  // Activity 2 from the notes: 2,000 × 2,000 at rank 4.
  await part(page, 'lora');
  const lora = page.locator('#ft-lora .llm-stage-body');
  await expect(lora.getByTestId('lora-total')).toContainText('16,000 (1.60%)');
  await lora.getByRole('button', { name: 'Activity 2' }).click();
  await expect(lora.getByTestId('lora-total')).toHaveText('?');
  await lora.getByRole('textbox', { name: 'Your answer' }).fill('16000');
  await expect(lora.locator('.lx-activity')).toContainText('Correct');
  await expect(lora.getByTestId('init-zero')).toHaveText('2.01');
  expect(Number(await lora.getByTestId('init-good').textContent())).toBeLessThan(0.05);

  await part(page, 'qlora');
  const qlora = page.locator('#ft-qlora .llm-stage-body');
  await qlora.getByRole('button', { name: 'LoRA, then quantize later' }).click();
  await expect(qlora.locator('.lx-order-steps')).toContainText('Merge, then quantize');
  await expect(qlora.locator('.lx-memory-row').last()).toContainText('13.5 GB');

  await part(page, 'step', 'watch');
  const step = page.locator('#ft-step');
  await step.locator('#ft-scene-step').getByRole('button', { name: /^4: Loss/ }).click();
  await expect(step.locator('.ls-loss')).toHaveText('−log 0.22 = 1.51');
  await part(page, 'step');
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
  await part(page, 'workflow');
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
  await expect(page.locator('.ft-rail')).toContainText('الكلمات الأساسية');
  await expect(page.locator('.ft-rail')).toContainText('من المستندات إلى JSONL');
  await part(page, 'unsloth', 'watch');
  const kitchen = page.locator('#ft-scene-kitchen');
  await kitchen.getByRole('button', { name: /^4: إلى الفرن/ }).click();
  await expect(kitchen.locator('.ls-chip-text').first()).toHaveText('أوزان الأساس:');
  await kitchen.getByRole('button', { name: 'اشرح: الطاهي: شيفرتك مع Unsloth' }).locator('rect').first().click();
  await expect(kitchen.locator('.ft-explain-card')).toContainText('الباحث ما زال يختار');
  await part(page, 'data');
  await expect(page.locator('#ft-data .lx-results').first()).toContainText('علامات تنصيص مزدوجة');
});

test('explains fine-tuning versus RAG: the storyteller scene, the decision, the data sorting', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();
  await part(page, 'hybrid', 'watch');
  const hybrid = page.locator('#ft-hybrid');
  const scene = hybrid.locator('#ft-scene-hybrid');

  // With the library, the answer names its source; without it, details are invented.
  await scene.getByRole('button', { name: /^5: …and names the source/ }).click();
  await expect(scene.locator('.hy-tag-text')).toHaveText('Source: Dhofar oral collection, 2019');
  await scene.getByRole('button', { name: /^6: A story the library/ }).click();
  await expect(scene.locator('.hy-answer')).toContainText('I don’t have a recorded source for this story.');
  await scene.getByRole('button', { name: /^7: Without the library/ }).click();
  await expect(scene.locator('.hy-answer.invented')).toBeVisible();

  await part(page, 'hybrid');
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
  await expect(body.locator('.rg-entry')).toContainText('DHF-2018-014');
});

test('shows the three analogies: extra lessons, sticky notes and a compressed photo', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();
  await expect(page.locator('#ft-why .hy-analogy')).toHaveCount(3);

  await part(page, 'lora');
  const lora = page.locator('#ft-lora .llm-stage-body');
  await lora.getByRole('button', { name: 'Train: add a note' }).click();
  await lora.getByRole('button', { name: 'Train: add a note' }).click();
  await expect(lora.locator('.hy-note')).toHaveCount(2);
  await lora.getByRole('button', { name: 'Merge: print a new edition' }).click();
  await expect(lora.locator('.hy-printed')).toHaveCount(2);
  await expect(lora.getByTestId('sticky-note')).toContainText('W′ = W + B·A');

  await part(page, 'quant');
  const quant = page.locator('#ft-quant .llm-stage-body');
  await quant.getByRole('button', { name: '2 bits per colour' }).click();
  await expect(quant.locator('.hy-photos figcaption').last()).toContainText('4 shades per colour · file 25%');
});

test('explains what a parameter is: the neuron, the ladder and facts versus patterns', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();
  await part(page, 'words');
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

test('explains each key-word step as input, processing and output with one worked example', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();
  await part(page, 'words', 'watch');
  const scene = page.locator('#ft-scene-terms');
  const detail = scene.locator('.ts-detail');

  await expect(detail.locator('.ts-card.input')).toContainText('pre-training');
  await expect(detail.getByTestId('term-output')).toHaveText('w = [0.5, 0.4] · b = 0.2');

  // The output of each step is the input of the next.
  const outputs = ['w = [0.5, 0.4] 🔒', 'Δ = [0, 0]', 'ŷ = 2.4', 'loss = 0.64', '∇Δ = [−3.2, −4.8]', 'Δ = [0.038, 0.058]', 'ŷ = 2.65 → 3.2'];
  for (const [index, value] of outputs.entries()) {
    await detail.getByRole('button', { name: `Go to step ${index + 2}` }).click();
    await expect(detail.getByTestId('term-output')).toHaveText(value);
    await expect(scene.locator('.ft-scene-count')).toHaveText(`${index + 2} / 8`);
  }
  await expect(detail.locator('.ts-maths')).toContainText('= 2.65');
  await detail.getByRole('button', { name: 'Go round again: step 4' }).click();
  await expect(scene.locator('.ls-node.current')).toContainText('Activation');

  // The trail jumps straight to any step.
  await detail.getByRole('button', { name: 'Step 5 output' }).click();
  await expect(detail.locator('.ts-card.process')).toContainText('squared error');
  await expect(scene.locator('.ls-value.hot')).toHaveText('2.4');
});

test('teaches RAG and JSONL in fine-tuning: one story two uses, the builder, the app flow and vector search', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();
  await part(page, 'hybrid');
  const hybrid = page.locator('#ft-hybrid');
  const body = hybrid.locator('.llm-stage-body');

  // The same story: highlighting shows what fine-tuning adds.
  await body.getByRole('button', { name: 'what fine-tuning adds' }).click();
  await expect(body.locator('.rg-same-grid')).toHaveClass(/mark-style/);
  await expect(body.locator('.rg-same')).toContainText('the full original story lives in RAG');

  // The builder turns the example into one valid JSONL line, in either style.
  const builder = body.locator('.rg-builder');
  await expect(builder.getByTestId('builder-check')).toContainText('A valid record with 2 turns.');
  await expect(builder.locator('.lx-json')).toContainText('Context:');
  await builder.getByRole('button', { name: 'Question → answer' }).click();
  await expect(builder.locator('.lx-json')).not.toContainText('Context:');
  await expect(builder.locator('.lx-warning')).toContainText('recall the story from memory');
  await builder.getByRole('button', { name: 'Add to train.jsonl' }).click();
  await builder.getByRole('button', { name: 'Add to train.jsonl' }).click();
  await expect(builder.getByTestId('train-file').locator('li')).toHaveCount(2);

  // The application flow, as a cartoon.
  await part(page, 'hybrid', 'watch', 1);
  const app = hybrid.locator('#ft-scene-ragapp');
  await app.getByRole('button', { name: /^3: Upload sources/ }).click();
  await expect(app.locator('.rg-chunk')).toHaveCount(3);
  await app.getByRole('button', { name: /^5: Search the vector database/ }).click();
  await expect(app.locator('.rg-db .dot.hit')).toHaveCount(2);
  await app.getByRole('button', { name: /^7: The answer/ }).click();
  await expect(app.locator('.rg-answer-cite')).toContainText('Source: oral collection from Salalah');

  // Vector search: near questions find chunks; the flying camel finds nothing.
  await part(page, 'hybrid');
  const search = body.locator('.rg-search');
  await expect(search.locator('.rg-results li.found')).toHaveCount(2);
  await search.getByRole('button', { name: 'Tell me about the flying camel.' }).click();
  await expect(search.locator('.rg-results li.found')).toHaveCount(0);
  await expect(search.getByTestId('search-result')).toContainText('I don’t have a recorded source');
});

test('navigates the lab: tabs, remember cards, next part, search and remembered progress', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();

  // A part without an animation opens on Try; the Remember tab holds its summary card.
  await expect(page.locator('#ft-why .ft-part-tabs [role="tab"]')).toHaveCount(2);
  await page.locator('#ft-why').getByRole('tab', { name: /^Remember/ }).click();
  await expect(page.getByTestId('card-why')).toContainText('Common mistake');

  // Next part, and the pipeline map follows.
  await page.locator('.ft-part-footer').getByRole('button', { name: /Key words/ }).click();
  await expect(page.locator('#ft-words-title')).toHaveText('Key words');
  await expect(page.locator('#ft-words .ft-part-tabs [role="tab"][aria-selected="true"]')).toContainText('Watch');
  await page.locator('.ft-map').getByRole('button', { name: /Methods/ }).click();
  await expect(page.locator('#ft-freeze-title')).toHaveText('Four ways to fine-tune');
  await expect(page.locator('.ft-map-step.current')).toContainText('Methods');

  // Search jumps straight to a tool inside a part.
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog').getByRole('textbox', { name: 'Search' }).fill('meaning map');
  await page.keyboard.press('Enter');
  await expect(page.locator('#ft-hybrid-title')).toBeVisible();
  await expect(page.locator('.rg-search')).toBeVisible();

  // The position and the visited parts are remembered.
  await page.reload();
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();
  await expect(page.locator('#ft-hybrid-title')).toBeVisible();
  await expect(page.locator('.ft-rail button.seen')).toHaveCount(4);
});

test('fine-tunes a CNN: transfer learning scene, trained share, split, matrix and threshold', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();

  // The scene: the body is frozen, then only the head learns, then the top blocks join.
  await part(page, 'vision', 'watch');
  const scene = page.locator('#ft-scene-transfer');
  await scene.locator('.ft-scene-dots button').nth(4).click();
  await expect(scene.locator('.pc-block.frozen')).toHaveCount(5);
  await expect(scene.locator('.pc-row')).toHaveCount(6);
  await scene.locator('.ft-scene-dots button').nth(5).click();
  await expect(scene.locator('.pc-block.frozen')).toHaveCount(3);
  await expect(scene.locator('.pc-block.training')).toHaveCount(2);

  await part(page, 'vision', 'try');
  // MobileNetV2 with 6 species trains only its new head: 1,280 × 6 + 6 numbers.
  const backbone = page.locator('.pc-backbone');
  await expect(backbone.getByTestId('backbone-share')).toHaveText('7,686 (0.34%)');
  await backbone.getByRole('button', { name: 'ResNet50' }).click();
  await expect(backbone.getByTestId('backbone-share')).toHaveText('12,294 (0.05%)');

  // A random split puts the same trees in training and test; a split by tree does not.
  const split = page.locator('.pc-split');
  await expect(split.locator('.pc-tree.leak')).toHaveCount(4);
  await split.getByRole('button', { name: /By tree/ }).click();
  await expect(split.locator('.pc-tree.leak')).toHaveCount(0);
  await expect(split.getByTestId('split-verdict')).toContainText('No tree is in both');

  // Precision and recall of one species, read from the confusion matrix.
  const matrix = page.locator('.pc-confusion');
  await expect(matrix.getByTestId('matrix-scores')).toContainText('81.5%');
  await expect(matrix.getByTestId('matrix-scores')).toContainText('73.3%');
  await matrix.locator('.pc-matrix .label').filter({ hasText: 'Baobab' }).first().click();
  await expect(matrix.getByTestId('matrix-scores')).toContainText('96.6%');

  // A higher threshold refuses the confident unknown plant, but also good photos.
  const threshold = page.locator('.pc-threshold');
  await expect(threshold.getByTestId('threshold-counts')).toContainText('2/3');
  await threshold.locator('input[type="range"]').fill('0.85');
  await expect(threshold.getByTestId('threshold-value')).toHaveText('85%');
  await expect(threshold.getByTestId('threshold-counts')).toContainText('3/3');
  await expect(threshold.locator('.pc-pred.bad')).toHaveCount(0);
});

test('walks through the UTAS-70 project: YOLO, RAG archive, fine-tuning, tracks and the guide', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();

  // The flow from a photo to a sourced answer.
  await part(page, 'utas', 'watch');
  // The relay: YOLO sees, RAG remembers, the fine-tuned model speaks.
  const relay = page.locator('#ft-scene-relay');
  await expect(relay.getByTestId('relay-definition')).toContainText('You Only Look Once');
  await relay.locator('.pr-dots button').nth(3).click();
  await expect(relay.locator('.pr-cand.final')).toHaveCount(1);
  await expect(relay.locator('.pr-meter strong')).toHaveText('89%');
  await relay.getByRole('button', { name: /RAG archive/ }).click();
  await expect(relay.getByTestId('relay-definition')).toContainText('Retrieval-Augmented Generation');
  await relay.locator('.pr-dots button').nth(7).click();
  await expect(relay.locator('.pr-passage.out')).toHaveCount(5);
  await expect(relay.locator('.pr-passage.top')).toHaveCount(2);
  await relay.locator('.pr-dots button').nth(11).click();
  await expect(relay.getByTestId('relay-answer')).toContainText('Field notes 3');
  await expect(relay.locator('.pr-node.lit')).toHaveCount(4);

  await page.getByRole('button', { name: 'The whole system' }).click();
  const flow = page.locator('#ft-scene-utas');
  await flow.locator('.ft-scene-dots button').nth(3).click();
  await expect(flow.locator('.pc-archive .tile.dim')).toHaveCount(3);
  await flow.locator('.ft-scene-dots button').nth(7).click();
  await expect(flow.locator('.rg-answer-cite')).toContainText('Source C');
  await flow.getByRole('button', { name: 'Memory: RAG digital archive' }).first().click();
  await expect(flow).toContainText('filter by name, then by meaning');

  await part(page, 'utas', 'try');
  const brief = page.locator('.pc-brief');
  await brief.getByRole('tab', { name: 'RQ2' }).click();
  await expect(brief.getByTestId('rq-detail')).toContainText('YOLO');

  // Eyes, memory, brain: switching a part off shows what it was for.
  const system = page.locator('.pc-system');
  await expect(system.getByTestId('system-checks').locator('.good')).toHaveCount(3);
  await system.getByRole('button', { name: /Eyes · computer vision/ }).click();
  await expect(system.getByTestId('part-detail')).toContainText('yolo detect train');
  await system.locator('.pc-part.memory').getByRole('checkbox').uncheck();
  await expect(system.getByTestId('system-checks').locator('.bad')).toHaveCount(1);
  await expect(system.locator('.pc-reply')).toContainText('no source');

  // Style from a slice of the references, facts from all of them.
  const refs = page.locator('.pc-refsplit');
  await expect(refs.getByTestId('split-stats')).toContainText('4 / 20');
  await expect(refs.getByTestId('split-stats')).toContainText('20 / 20');
  await refs.getByRole('checkbox').uncheck();
  await expect(refs.getByTestId('split-stats')).toContainText('16 / 20');
  await expect(refs.locator('.pc-split-stats .bad')).toContainText('4');

  // The archive search: without the name filter another plant's passage can win.
  const archive = page.locator('.pc-archive-tool');
  await expect(archive.locator('.pc-hits li')).toHaveCount(2);
  await archive.getByRole('checkbox').uncheck();
  await expect(archive.locator('.pc-hits li.wrong')).toHaveCount(2);
  await archive.getByRole('checkbox').check();
  await archive.getByRole('button', { name: 'When does it flower?' }).click();
  await expect(archive.getByTestId('archive-verdict')).toContainText('my sources do not say');

  // The tracks: steps open with their output and links to the parts that teach them.
  const tracks = page.locator('.pc-tracks');
  await tracks.getByRole('button', { name: /Fine-tune YOLO/ }).click();
  await expect(tracks.getByTestId('step-detail')).toContainText('confidence threshold');
  await tracks.getByRole('checkbox').check();
  await expect(tracks.locator('.pc-step.is-critical')).toHaveCount(6);

  // A record field becomes a JSONL line; the empty field teaches “not in the sources”.
  const jsonl = page.locator('.pc-jsonl');
  await expect(jsonl.locator('.lx-json')).toContainText('"context"');
  await jsonl.getByRole('button', { name: /Season/ }).click();
  await expect(jsonl.locator('.lx-json')).toContainText('do not give the flowering season');
  await jsonl.getByRole('button', { name: /add to train.jsonl/ }).click();
  await jsonl.getByRole('button', { name: 'العربية' }).click();
  await expect(jsonl.locator('.lx-json')).toContainText('لا تذكر مصادري');
  await jsonl.getByRole('button', { name: /add to train.jsonl/ }).click();
  await expect(jsonl.getByTestId('utas-train').locator('li')).toHaveCount(2);

  // Three systems on the same question, then the guide and its GPU check.
  const configs = page.locator('.pc-configs');
  await expect(configs.locator('.pc-config')).toHaveCount(2);
  await configs.getByRole('button', { name: 'Ask the next system' }).click();
  await expect(configs.locator('.pc-config')).toHaveCount(3);
  const guide = page.locator('.pc-guide');
  await guide.getByRole('checkbox').first().check();
  await expect(guide.getByTestId('guide-count')).toHaveText('1 / 12');
  await expect(guide.getByTestId('gpu-fit')).toContainText('16 GB ✕');

  // Arabic.
  await page.getByRole('button', { name: 'العربية' }).first().click();
  await expect(page.locator('#ft-utas-title')).toHaveText('مشروع حقيقي: UTAS-70');
});

test('teaches RAG in depth: indexing and answering scenes, chunking, vectors, search, citations', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();

  // Indexing: eight stations from upload to a ready archive.
  await part(page, 'rag', 'watch');
  const index = page.locator('#ft-scene-index');
  await expect(index.locator('.rd-stations li')).toHaveCount(8);
  await index.locator('.rd-dots button').nth(3).click();
  await expect(index.locator('.rd-chunkcard')).toHaveCount(4);
  await index.locator('.rd-dots button').nth(4).click();
  await expect(index.locator('.rd-token').first()).toBeVisible();
  await index.locator('.rd-dots button').nth(6).click();
  await expect(index.locator('.rd-hnsw')).toBeVisible();

  // Answering: the filter removes other items, the reranker reorders, the answer cites.
  await page.getByRole('button', { name: /2 · Answering/ }).click();
  const query = page.locator('#ft-scene-query');
  await query.locator('.rd-dots button').nth(3).click();
  await expect(query.locator('.rd-pt.out')).toHaveCount(7);
  await query.locator('.rd-dots button').nth(5).click();
  await expect(query.locator('.rd-rung.cut')).toHaveCount(1);
  await query.locator('.rd-dots button').nth(7).click();
  await expect(query.locator('.rd-final')).toContainText('Source A');

  await part(page, 'rag', 'try');
  const intro = page.locator('.rd-intro');
  await expect(intro.getByTestId('rag-exam')).toContainText('cited');
  await intro.getByRole('button', { name: /Closed-book/ }).click();
  await expect(intro.getByTestId('rag-exam')).toContainText('no source');

  // Chunking: small fixed chunks split the answer; by section with a larger size keeps it whole.
  const chunk = page.locator('.rd-chunk');
  await expect(chunk.getByTestId('chunk-verdict')).toContainText('split across');
  await chunk.getByRole('button', { name: /By section/ }).click();
  await chunk.locator('input[type="range"]').first().fill('40');
  await expect(chunk.getByTestId('chunk-size')).toHaveText('40');
  await expect(chunk.getByTestId('chunk-verdict')).toContainText('holds the whole answer');
  await expect(chunk.locator('.rd-ctx')).toBeVisible();

  // Similar meanings, different words: the resin sentences are close, the camel is far.
  const vectors = page.locator('.rd-vectors');
  const sims = vectors.getByTestId('similarities').locator('.rd-sim b');
  const second = Number(await sims.nth(1).textContent());
  const camel = Number(await sims.nth(4).textContent());
  expect(second).toBeGreaterThan(0.8);
  expect(camel).toBeLessThan(0.5);

  // Search: a rare name needs keyword search; an unknown topic returns nothing.
  const search = page.locator('.rd-search');
  await search.getByRole('button', { name: 'What is Al-Bar’ah?' }).click();
  await expect(search.getByTestId('search-results').locator('li').first()).toContainText('coffee');
  await search.getByRole('checkbox').check();
  await expect(search.getByTestId('search-results').locator('li').first()).toContainText('Al-Bar’ah');
  await search.getByRole('button', { name: 'How tall does a date palm grow?' }).click();
  await search.locator('input[type="range"]').nth(1).fill('0.75');
  await search.getByRole('checkbox').uncheck();
  await expect(search.getByTestId('search-empty')).toBeVisible();

  // Citations follow back to their chunk; an empty search gives an honest answer.
  const cite = page.locator('.rd-cite');
  await cite.locator('.rd-cite-chip').first().click();
  await expect(cite.locator('.src.focus')).toContainText('Field notes 3');
  await cite.getByRole('button', { name: 'When does it flower?' }).click();
  await expect(cite.getByTestId('cited-answer')).toContainText('My sources do not say');

  // Both projects, their metadata, and the doctor.
  const projects = page.locator('.rd-projects');
  await expect(projects.getByTestId('project-metadata')).toContainText('Boswellia sacra');
  await projects.getByRole('button', { name: 'TurathAI', exact: true }).click();
  await expect(projects.getByTestId('project-metadata')).toContainText('DHF-2018-014');
  const doctor = page.locator('.rd-doctor');
  await doctor.getByRole('button', { name: /half right/ }).click();
  await expect(doctor.getByTestId('diagnosis')).toContainText('overlap');
});

test('shows the two projects as one recipe: lanes, model size, roadmap and jobs', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('neuron-lab-project-roadmap'));
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();

  await part(page, 'recipe', 'watch');
  const scene = page.locator('#ft-scene-recipe');
  await expect(scene.locator('.po-lane')).toHaveCount(2);
  await scene.locator('.rd-dots button').nth(4).click();
  await expect(scene.locator('.po-lane.turath .po-cell.vision')).toContainText('not needed');
  await scene.locator('.rd-dots button').nth(6).click();
  await expect(scene.locator('.po-lane.utas.run .po-packet')).toHaveCount(1);
  await expect(scene.locator('.po-lane.turath.quiet')).toHaveCount(1);

  await part(page, 'recipe', 'try');
  await expect(page.locator('.po-card')).toHaveCount(2);
  const model = page.locator('.po-model');
  await expect(model.getByTestId('gpu-fits').locator('.fits')).toHaveCount(4);
  await model.getByRole('button', { name: 'Qwen3.8 27B' }).click();
  await expect(model.getByTestId('gpu-fits').locator('.no')).toHaveCount(1);

  const roadmap = page.locator('.po-roadmap');
  await expect(roadmap.locator('.po-steps li')).toHaveCount(8);
  await roadmap.getByRole('checkbox').first().check();
  await expect(roadmap.getByTestId('roadmap-count')).toHaveText('1 / 8');
  await roadmap.getByRole('button', { name: 'TurathAI' }).click();
  await expect(roadmap.locator('.po-steps li')).toHaveCount(7);

  const who = page.locator('.po-who');
  const first = who.locator('.po-items li').first();
  await first.getByRole('button', { name: /YOLO/ }).click();
  await expect(first).toHaveClass(/right/);
  const second = who.locator('.po-items li').nth(1);
  await second.getByRole('button', { name: /Fine-tuned/ }).click();
  await expect(second).toHaveClass(/wrong/);
  await expect(who.getByTestId('who-score')).toHaveText('1 / 8');
});

test('shows RAG and fine-tuning together: open book + coach, one answer three ways, is one enough, two checks', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();
  await part(page, 'hybrid', 'watch', 2);
  const scene = page.locator('#ft-scene-together');
  await scene.getByRole('button', { name: /The sources do not agree/ }).click();
  await expect(scene.locator('.rt-differ')).toBeVisible();
  await scene.getByRole('button', { name: /The answer: evidence \+ style/ }).click();
  await expect(scene.getByTestId('together-answer').locator('li')).toHaveCount(2);
  await scene.getByRole('button', { name: /Asked again, the new source appears/ }).click();
  await expect(scene.getByTestId('together-answer').locator('li')).toHaveCount(3);
  await expect(scene.locator('.rt-lock')).toContainText('no retraining');

  await part(page, 'hybrid');
  const body = page.locator('#ft-hybrid .llm-stage-body');
  const ways = body.locator('.rt-ways');
  await ways.getByRole('button', { name: 'Without RAG' }).click();
  await ways.locator('.rt-piece.invented').first().click();
  await expect(ways.getByTestId('ways-why')).toContainText('Invented');
  await ways.getByRole('button', { name: 'Without fine-tuning' }).click();
  await expect(ways.getByTestId('ways-verdict')).toContainText('paraphrased');

  const enough = body.locator('.rt-enough');
  await expect(enough.getByTestId('enough-pick')).toContainText('RAG + fine-tuning');
  await enough.getByRole('button', { name: 'A museum help desk' }).click();
  await expect(enough.getByTestId('enough-pick')).toContainText('RAG alone');
  await enough.getByRole('button', { name: 'A passage simplifier' }).click();
  await expect(enough.getByTestId('enough-pick')).toContainText('Fine-tuning alone');

  const checks = body.locator('.rt-checks');
  const marks = [[true, true], [false, true], [true, false], [true, false], [false, false]];
  for (const [index, [found, explained]] of marks.entries()) {
    const item = checks.locator('.rt-cases > li').nth(index);
    await item.locator('.rt-mark').nth(0).getByRole('button', { name: found ? '✓' : '✗' }).click();
    await item.locator('.rt-mark').nth(1).getByRole('button', { name: explained ? '✓' : '✗' }).click();
  }
  await expect(checks.getByTestId('checks-tally')).toContainText('10 of 10 marks agree');
  await expect(checks.getByTestId('checks-tally')).toContainText('Search or collection problems: 2');
  await expect(checks.getByTestId('checks-tally')).toContainText('weak explanation: 2');
});

test('gives evidence for RAG + fine-tuning: who writes, what to fix first, a fair test, the claim', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();
  await part(page, 'rag');
  const body = page.locator('#ft-rag .llm-stage-body');

  const writers = body.locator('.re-writers');
  await expect(writers.getByTestId('writer-answer')).toContainText('In Dhofar, coffee is served to guests first');
  await writers.getByRole('button', { name: 'Qwen + clearer instructions' }).click();
  await expect(writers.locator('.re-checks .bad')).toContainText('as a drink');
  await writers.getByRole('button', { name: 'Fine-tuned Qwen' }).click();
  await expect(writers.getByTestId('writer-answer')).toContainText('dates, fruit and sweets offered to guests');
  await expect(writers.locator('.re-checks .bad')).toHaveCount(0);

  const ladder = body.locator('.re-ladder');
  await ladder.getByRole('button', { name: /retrieves an unrelated interview/ }).click();
  await expect(ladder.getByTestId('ladder-first')).toContainText('Improve the archive search');
  await ladder.getByRole('button', { name: /all families in Dhofar/ }).click();
  await expect(ladder.getByTestId('ladder-first')).toContainText('Clearer instructions');
  await expect(ladder.locator('.re-rung.then')).toContainText('Fine-tune Qwen');

  const fair = body.locator('.re-fair');
  await expect(fair.getByTestId('fair-verdict')).toContainText('fine-tuning adds accuracy');
  await fair.getByRole('button', { name: 'Example result B' }).click();
  await expect(fair.getByTestId('fair-verdict')).toContainText('Qwen + RAG is enough');

  await expect(body.locator('.re-claim .re-chain > div')).toHaveCount(3);
});

test('the question bank has 225 well-formed questions in five kinds', () => {
  expect(BANK_SIZE).toBe(225);
  expect(BANK.mcq).toHaveLength(100);
  expect(BANK.fill).toHaveLength(50);
  expect(BANK.explain).toHaveLength(25);
  expect(BANK.match).toHaveLength(25);
  expect(BANK.image).toHaveLength(25);
  const all = Object.values(BANK).flat();
  expect(new Set(all.map(question => question.id)).size).toBe(225);
  for (const question of all) {
    expect(question.part).toBeGreaterThanOrEqual(0);
    expect(question.part).toBeLessThanOrEqual(15);
    expect(question.ask.en.length).toBeGreaterThan(5);
    expect(question.ask.ar.length).toBeGreaterThan(5);
    if (question.kind === 'mcq' || question.kind === 'fill' || question.kind === 'image') {
      expect(question.options).toHaveLength(4);
      expect(question.right).toBeLessThan(4);
      expect(new Set(question.options.map(option => option.en)).size).toBe(4);
    }
    if (question.kind === 'fill') {
      expect(question.ask.en.split('____')).toHaveLength(2);
      expect(question.ask.ar.split('____')).toHaveLength(2);
    }
    if (question.kind === 'match') expect(question.pairs).toHaveLength(4);
    if (question.kind === 'explain') expect(question.points.length).toBeGreaterThanOrEqual(3);
  }
});

test('check yourself: five question kinds, fresh sets, scoring', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();
  await page.locator('.ft-rail').getByRole('button', { name: /Check yourself/ }).click();
  const quiz = page.locator('.ft-quiz');
  await expect(quiz).toContainText('A bank of 225 questions');

  // Multiple choice: answer one, the score and feedback appear.
  await quiz.getByRole('tab', { name: /Multiple choice/ }).click();
  await expect(quiz.locator('.qz-q')).toHaveCount(10);
  const first = await quiz.locator('.qz-q').evaluateAll(items => items.map(item => item.getAttribute('data-qid')));
  const q1 = quiz.locator('.qz-q').first();
  await q1.locator('.qz-options button').first().click();
  await expect(q1.getByTestId('qz-feedback')).toHaveCount(0);
  await q1.getByRole('button', { name: 'Check my answer' }).click();
  await expect(q1.getByTestId('qz-feedback')).toBeVisible();
  await expect(quiz.locator('.qz-progress')).toContainText('1 of 10 answered');

  // Explain it step by step: numbered reasons that end with the answer.
  await q1.getByRole('button', { name: 'Explain it step by step' }).click();
  await expect(q1.getByTestId('qz-steps').locator('li').first()).toBeVisible();
  expect(await q1.getByTestId('qz-steps').locator('li').count()).toBeGreaterThanOrEqual(3);
  await expect(q1.getByTestId('qz-steps')).toContainText('So the answer is:');
  // Learn more: the lab part, key words and trusted resources.
  await q1.getByRole('button', { name: 'Learn more' }).click();
  await expect(q1.getByTestId('qz-more')).toContainText('Read it again in the lab');
  await expect(q1.getByTestId('qz-more').locator('a[target="_blank"]').first()).toHaveAttribute('rel', /noopener/);

  // A new set brings different questions (unseen ones first).
  await quiz.getByRole('button', { name: 'New questions' }).click();
  const second = await quiz.locator('.qz-q').evaluateAll(items => items.map(item => item.getAttribute('data-qid')));
  expect(second.filter(id => first.includes(id))).toHaveLength(0);

  // Fill the blank.
  await quiz.getByRole('tab', { name: /Fill the blank/ }).click();
  const blank = quiz.locator('.qz-q').first();
  await blank.locator('.qz-options button').first().click();
  await expect(blank.locator('.qz-blank')).not.toHaveText(/^\s*$/);
  await blank.getByRole('button', { name: 'Check my answer' }).click();
  await expect(blank.getByRole('button', { name: 'Explain it step by step' })).toBeVisible();

  // Explain in your words: key points and a model answer.
  await quiz.getByRole('tab', { name: /Explain in your words/ }).click();
  const open = quiz.locator('.qz-q').first();
  await open.locator('textarea').fill('The model is trained on examples; the loss and gradients update the weights; RAG retrieves sources.');
  await open.getByRole('button', { name: 'Check my answer' }).click();
  await expect(open.getByTestId('qz-explain-result')).toContainText('key points');
  await expect(open.locator('.qz-model')).toBeVisible();

  // Match and link: tap each card, then a slot.
  await quiz.getByRole('tab', { name: /Match and link/ }).click();
  const link = quiz.locator('.qz-q').first();
  for (let slot = 0; slot < 4; slot += 1) {
    await link.locator('.qz-card').first().click();
    await link.locator('.qz-slot').nth(slot).click();
  }
  await link.getByRole('button', { name: 'Check the links' }).click();
  await expect(link.getByTestId('qz-feedback')).toContainText('of 4 linked correctly');
  await link.getByRole('button', { name: 'Explain it step by step' }).click();
  await expect(link.getByTestId('qz-steps')).toBeVisible();

  // Look at the picture: every question has a drawn figure.
  await quiz.getByRole('tab', { name: /Look at the picture/ }).click();
  await expect(quiz.locator('.qz-q')).toHaveCount(5);
  await expect(quiz.locator('.qz-q svg.qz-fig')).toHaveCount(5);
});

test('read more sources: topics, live Wikipedia summaries and web searches', async ({ page }) => {
  // Mock Wikipedia so the test does not depend on the network; record what was searched.
  const searched: string[] = [];
  await page.route(/wikipedia\.org\/w\/api\.php/, async route => {
    const url = new URL(route.request().url());
    searched.push(`${url.hostname}|${url.searchParams.get('gsrsearch')}`);
    const arabic = url.hostname.startsWith('ar.');
    const query = url.searchParams.get('gsrsearch') ?? '';
    // The article named exactly as the searched topic, an unrelated page (dropped by the filter), and an Arabic miss.
    await route.fulfill({ contentType: 'application/json', json: arabic ? { batchcomplete: '' } : { query: { pages: {
      1: { title: query, index: 1, fullurl: 'https://en.wikipedia.org/wiki/Topic', extract: `${query} is an idea in machine learning.` },
      2: { title: 'A famous footballer', index: 2, fullurl: 'https://en.wikipedia.org/wiki/Footballer', extract: 'A footballer who played for many clubs.' },
    } } } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Fine-tuning lab' }).click();
  await page.locator('.ft-rail').getByRole('button', { name: /Check yourself/ }).click();
  const quiz = page.locator('.ft-quiz');
  await quiz.getByRole('tab', { name: /Multiple choice/ }).click();
  const q1 = quiz.locator('.qz-q').first();
  await q1.locator('.qz-options button').first().click();
  await q1.getByRole('button', { name: 'Check my answer' }).click();
  await q1.getByRole('button', { name: 'Explain it step by step' }).click();
  await q1.getByRole('button', { name: 'Read more sources' }).click();

  const panel = q1.getByTestId('qz-sources');
  await expect(panel.getByTestId('qz-src-hits').locator('li')).toHaveCount(1);
  await expect(panel.getByTestId('qz-src-hits').getByRole('link')).toHaveAttribute('href', 'https://en.wikipedia.org/wiki/Topic');
  await expect(panel).not.toContainText('footballer');
  const tabs = panel.getByRole('tab');
  expect(await tabs.count()).toBeGreaterThanOrEqual(1);
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
  // Four web searches, each opening safely in a new tab with only the topic in the query.
  const sites = panel.locator('.qz-src-site');
  await expect(sites).toHaveCount(4);
  for (const site of await sites.all()) {
    await expect(site).toHaveAttribute('target', '_blank');
    await expect(site).toHaveAttribute('rel', /noopener/);
  }
  await expect(sites.first()).toHaveAttribute('href', /^https:\/\/www\.google\.com\/search\?q=/);
  expect(searched[0]).toMatch(/^en\.wikipedia\.org\|/);

  // Arabic: searches again (Arabic Wikipedia first, or straight to English for topics it lacks)
  // and labels the English article it falls back to.
  const before = searched.length;
  await page.getByRole('button', { name: 'العربية' }).click();
  await expect(q1.getByRole('button', { name: 'اقرأ مصادر أخرى' })).toBeVisible();
  await expect(panel.getByTestId('qz-src-hits').locator('li').first()).toContainText('بالإنجليزية');
  expect(searched.length).toBeGreaterThan(before);
});

test('every question gets a search topic', () => {
  for (const question of Object.values(BANK).flat()) {
    const clues = question.kind === 'explain' ? [question.ask.en] : question.kind === 'match' ? [question.ask.en] : [question.options[question.right].en];
    const topics = topicsFor(question.part, clues);
    expect(topics.length, question.id).toBeGreaterThanOrEqual(1);
    expect(topics.length, question.id).toBeLessThanOrEqual(3);
    for (const site of webSearches(topics[0], 'ar')) expect(site.url, question.id).toMatch(/^https:\/\//);
  }
});

test('every question has a step-by-step explanation and every part has resources', () => {
  for (const question of Object.values(BANK).flat()) {
    const steps = STEPS[question.id];
    expect(steps, question.id).toBeDefined();
    expect(steps.length, question.id).toBeGreaterThanOrEqual(3);
    for (const [en, ar] of steps) {
      expect(en.length, question.id).toBeGreaterThan(10);
      expect(ar.length, question.id).toBeGreaterThan(10);
    }
  }
  expect(Object.keys(STEPS)).toHaveLength(225);
  expect(RESOURCES).toHaveLength(16);
  for (const list of RESOURCES) {
    expect(list.length).toBeGreaterThanOrEqual(2);
    for (const resource of list) expect(resource.url).toMatch(/^https:\/\//);
  }
});
