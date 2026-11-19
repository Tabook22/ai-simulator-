/**
 * How the fine-tuning lab is organised: six chapters that follow the real fine-tuning
 * pipeline, a one-screen summary card for every part (the reference sheet), and the
 * search index of tools and scenes.
 */
import type { IconName } from './ui';
import type { Text } from './finetuneContent';

const t = (en: string, ar: string): Text => ({ en, ar });

export type PartTab = 'watch' | 'try' | 'remember';

export const CHAPTERS: { key: string; icon: IconName; name: Text; stage: Text; parts: number[] }[] = [
  { key: 'foundations', icon: 'bulb', name: t('Foundations', 'الأساسيات'), stage: t('the base model', 'النموذج الأساسي'), parts: [0, 1] },
  { key: 'data', icon: 'file', name: t('Data', 'البيانات'), stage: t('the examples', 'الأمثلة'), parts: [2] },
  { key: 'methods', icon: 'layers', name: t('Methods', 'الطرق'), stage: t('LoRA · 4-bit · QLoRA', 'LoRA · 4 بت · QLoRA'), parts: [3, 4, 5, 6] },
  { key: 'training', icon: 'refresh', name: t('Training', 'التدريب'), stage: t('Unsloth · the loop', 'Unsloth · الحلقة'), parts: [7, 8] },
  { key: 'deploy', icon: 'target', name: t('Evaluate and deploy', 'التقييم والنشر'), stage: t('test · RAG', 'اختبار · RAG'), parts: [9, 10] },
  { key: 'projects', icon: 'sparkle', name: t('Real projects', 'مشاريع حقيقية'), stage: t('TurathAI · vision · UTAS-70', 'تراث AI · الرؤية · UTAS-70'), parts: [11, 12, 13] },
];

export const chapterOf = (part: number) => CHAPTERS.findIndex(chapter => chapter.parts.includes(part));

export interface Card { headline: Text; facts: Text[]; mistake: Text; fix: Text }

/** One summary card per part: what to remember. Shown in the Remember tab and in the reference sheet. */
export const CARDS: Card[] = [
  { headline: t('base model + your examples → specialist', 'نموذج أساسي + أمثلتك ← نموذج متخصص'),
    facts: [
      t('Fine-tuning continues the training of a model that already knows language, on your own examples.', 'الضبط الدقيق يكمل تدريب نموذج يعرف اللغة مسبقًا، على أمثلتك أنت.'),
      t('It teaches a subject, a format or a way of answering; it starts from open weights, not from zero.', 'يعلّم مادة أو شكلًا أو طريقة إجابة؛ ويبدأ من أوزان مفتوحة لا من الصفر.'),
      t('It is not always needed: try prompting first, and use RAG for new facts.', 'ليس ضروريًا دائمًا: جرّب التلقين أولًا، واستخدم RAG للحقائق الجديدة.'),
    ],
    mistake: t('“You must fine-tune to add knowledge.”', '“يجب الضبط الدقيق لإضافة المعرفة.”'),
    fix: t('New facts and documents usually belong in RAG.', 'الحقائق والمستندات الجديدة مكانها عادةً RAG.') },
  { headline: t('z = x₁w₁ + x₂w₂ + b', 'z = x₁w₁ + x₂w₂ + b'),
    facts: [
      t('Parameters are learned numbers: weights (w) and biases (b).', 'المعاملات أرقام متعلَّمة: أوزان (w) وانحيازات (b).'),
      t('Training is one loop: forward → loss → gradient → update → next batch.', 'التدريب حلقة واحدة: أمامي ← خسارة ← تدرّج ← تحديث ← الدفعة التالية.'),
      t('Frozen means not updated. It does not mean inactive.', 'المجمَّد يعني أنه لا يُحدَّث، ولا يعني أنه لا يعمل.'),
    ],
    mistake: t('“The model stores facts in its parameters like a file.”', '“النموذج يخزّن الحقائق في معاملاته كملف.”'),
    fix: t('Knowledge is a pattern spread over many numbers.', 'المعرفة نمط موزع على أرقام كثيرة.') },
  { headline: t('document → text → pairs → JSONL → tokens', 'مستند ← نص ← أزواج ← JSONL ← رموز'),
    facts: [
      t('JSONL: one complete JSON object per line, in UTF-8.', 'JSONL: كائن JSON كامل في كل سطر، بترميز UTF-8.'),
      t('Split by source (about 80 / 10 / 10), never by random lines.', 'قسّم حسب المصدر (نحو 80 / 10 / 10)، لا حسب أسطر عشوائية.'),
      t('Mask the prompt and train on the answer; check max_seq_length does not cut answers.', 'احجب السؤال ودرّب على الإجابة، وتأكد أن max_seq_length لا يقطع الإجابات.'),
    ],
    mistake: t('“Valid JSONL means good data.”', '“JSONL صحيح يعني بيانات جيدة.”'),
    fix: t('JSONL is only a format; truth needs expert review.', 'JSONL مجرد صيغة؛ والصحة تحتاج إلى مراجعة خبير.') },
  { headline: t('full · partial · LoRA · QLoRA', 'كامل · جزئي · LoRA · QLoRA'),
    facts: [
      t('Full fine-tuning updates every weight; partial updates chosen layers.', 'الضبط الكامل يحدّث كل الأوزان، والجزئي يحدّث طبقات مختارة.'),
      t('LoRA freezes the base and trains small added matrices A and B.', 'LoRA تجمّد الأساس وتدرّب مصفوفتين صغيرتين مضافتين A و B.'),
      t('QLoRA is LoRA on a base stored in 4-bit.', 'QLoRA هي LoRA على أساس مخزَّن بدقة 4 بت.'),
    ],
    mistake: t('“Quantization removes weights.”', '“التكميم يحذف أوزانًا.”'),
    fix: t('That is pruning. Quantization keeps every weight with fewer bits.', 'ذلك هو التقليم. أما التكميم فيُبقي كل وزن ببتات أقل.') },
  { headline: t('y = W·x + (α/r)·B(A·x)', 'y = W·x + (α/r)·B(A·x)'),
    facts: [
      t('A is r × in, B is out × r: 1,000 × 1,000 at r = 8 trains 16,000 numbers (1.6%).', 'A أبعادها r × المدخلات و B المخرجات × r: مصفوفة 1,000 × 1,000 برتبة 8 تدرّب 16,000 رقم (1.6٪).'),
      t('A starts random, B starts at zero, so training starts exactly from the base model.', 'تبدأ A عشوائية و B صفرًا، فيبدأ التدريب من النموذج الأساسي تمامًا.'),
      t('After training, merge once: W′ = W + s·B·A, or keep the adapter as a small file.', 'بعد التدريب ادمج مرة واحدة: W′ = W + s·B·A، أو أبقِ المهايئ ملفًا صغيرًا.'),
    ],
    mistake: t('“LoRA means a low number of adapters.”', '“LoRA تعني عددًا قليلًا من المهايئات.”'),
    fix: t('It means Low-Rank Adaptation.', 'إنها تعني التكييف منخفض الرتبة.') },
  { headline: t('memory = parameters × bits ÷ 8', 'الذاكرة = المعاملات × البتات ÷ 8'),
    facts: [
      t('4 bits name only 16 levels; each weight is rounded to the nearest one.', '4 بتات لا تسمّي إلا 16 مستوى، ويُقرَّب كل وزن إلى أقربها.'),
      t('NF4 packs its levels near zero, where most weights are.', 'NF4 تركّز مستوياتها قرب الصفر حيث تكون معظم الأوزان.'),
      t('One scale (absmax) is stored per block of 64 weights.', 'يُخزَّن مقياس واحد (absmax) لكل كتلة من 64 وزنًا.'),
    ],
    mistake: t('“Fewer bits means fewer weights.”', '“بتات أقل تعني أوزانًا أقل.”'),
    fix: t('The count stays the same; each weight just takes less memory.', 'العدد يبقى كما هو، لكن كل وزن يأخذ ذاكرة أقل.') },
  { headline: t('4-bit frozen base + 16-bit LoRA adapters', 'أساس مجمَّد بـ 4 بت + مهايئات LoRA بـ 16 بت'),
    facts: [
      t('Order: load the base in 4-bit, freeze it, attach adapters, train.', 'الترتيب: حمّل الأساس بدقة 4 بت، وجمّده، واربط المهايئات، ثم درّب.'),
      t('Stored in 4-bit, calculated in 16-bit (bfloat16).', 'يُخزَّن بـ 4 بت ويُحسب بـ 16 بت (bfloat16).'),
      t('27B: 54 GB at 16-bit, 13.5 GB at 4-bit for the raw weights, which is not a full GPU budget.', 'نموذج 27B: 54 غ.ب بدقة 16 بت و 13.5 غ.ب بدقة 4 بت للأوزان الخام، وليست ميزانية GPU كاملة.'),
    ],
    mistake: t('“QLoRA compresses the model after training.”', '“QLoRA تضغط النموذج بعد التدريب.”'),
    fix: t('The base is already 4-bit during training.', 'الأساس بدقة 4 بت أثناء التدريب نفسه.') },
  { headline: t('from_pretrained(load_in_4bit) → get_peft_model(r) → train → save', 'from_pretrained(load_in_4bit) ← get_peft_model(r) ← تدريب ← حفظ'),
    facts: [
      t('Unsloth is software that runs LoRA and QLoRA faster and with less memory.', 'Unsloth برنامج ينفذ LoRA و QLoRA بسرعة أكبر وذاكرة أقل.'),
      t('It works with PyTorch, a trainer (TRL) and the GPU; you still choose data, model and settings.', 'يعمل مع PyTorch ومدرِّب (TRL) وبطاقة GPU؛ وأنت ما زلت تختار البيانات والنموذج والإعدادات.'),
      t('Export the adapter alone, a merged 16-bit model, or a 4-bit GGUF file.', 'صدّر المهايئ وحده، أو نموذجًا مدموجًا بـ 16 بت، أو ملف GGUF بـ 4 بت.'),
    ],
    mistake: t('“Unsloth is a different training method.”', '“Unsloth طريقة تدريب مختلفة.”'),
    fix: t('It is a toolkit that implements LoRA and QLoRA.', 'إنه أداة تنفّذ LoRA و QLoRA.') },
  { headline: t('loss = −log p(correct token)', 'الخسارة = −log p(الرمز الصحيح)'),
    facts: [
      t('One step: forward → loss → backward → optimizer update, on one batch.', 'الخطوة الواحدة: أمامي ← خسارة ← خلفي ← تحديث المحسّن، على دفعة واحدة.'),
      t('Effective batch = batch × accumulation × GPUs (2 × 8 × 1 = 16).', 'الدفعة الفعلية = الدفعة × التجميع × بطاقات GPU (2 × 8 × 1 = 16).'),
      t('Too large a learning rate diverges; rising validation loss means overfitting.', 'معدل التعلم الكبير جدًا يتباعد، وارتفاع خسارة التحقق يعني فرط التخصيص.'),
    ],
    mistake: t('“Lower training loss means better answers.”', '“خسارة تدريب أقل تعني إجابات أفضل.”'),
    fix: t('Only unseen test questions show that.', 'وحدها أسئلة الاختبار الجديدة تُظهر ذلك.') },
  { headline: t('baseline → data → configure → pilot → train → evaluate → deploy', 'خط الأساس ← البيانات ← الإعداد ← تجربة ← تدريب ← تقييم ← نشر'),
    facts: [
      t('Record the base model’s answers first, so there is something to compare with.', 'سجّل إجابات النموذج الأساسي أولًا، ليكون هناك ما تقارن به.'),
      t('Compare base and adapter on the same unseen questions; let an expert judge.', 'قارن الأساس والمهايئ على الأسئلة الجديدة نفسها، ودع خبيرًا يحكم.'),
      t('An adapter needs its exact base model; re-evaluate after merging or quantizing.', 'المهايئ يحتاج إلى نموذجه الأساسي الدقيق؛ وأعد التقييم بعد الدمج أو التكميم.'),
    ],
    mistake: t('“If training runs, the model is good.”', '“إذا جرى التدريب فالنموذج جيد.”'),
    fix: t('Running proves execution, not quality.', 'الجريان يثبت التنفيذ لا الجودة.') },
  { headline: t('RAG = the library · fine-tuning = the storyteller', 'RAG = المكتبة · الضبط الدقيق = الراوي'),
    facts: [
      t('All real stories go into RAG; 5–20% curated teaching examples go into fine-tuning.', 'كل القصص الحقيقية تذهب إلى RAG، و 5–20٪ من الأمثلة التعليمية المنتقاة تذهب إلى الضبط الدقيق.'),
      t('Write training examples as question + retrieved context → answer with the source.', 'اكتب أمثلة التدريب على شكل سؤال + سياق مسترجَع ← إجابة مع المصدر.'),
      t('Vector search finds by meaning; when nothing matches, the model should say so.', 'البحث المتجهي يجد بالمعنى، وحين لا يطابق شيء يجب أن يقول النموذج ذلك.'),
    ],
    mistake: t('“Put the same stories in both.”', '“ضع القصص نفسها في الاثنين.”'),
    fix: t('The model then mixes memorized and retrieved versions.', 'حينها يخلط النموذج النسخ المحفوظة بالمسترجَعة.') },
  { headline: t('verified heritage + QLoRA + RAG with citations', 'تراث موثَّق + QLoRA + RAG مع الاستشهادات'),
    facts: [
      t('Verified, credited sources; split by story family so the test is truly unseen.', 'مصادر موثقة منسوبة لأصحابها، وتقسيم حسب عائلة القصة ليكون الاختبار جديدًا فعلًا.'),
      t('QLoRA with Unsloth on a rented GPU, after a short pilot run.', 'QLoRA مع Unsloth على بطاقة GPU مستأجرة، بعد تجربة قصيرة.'),
      t('Judge faithfulness, cultural tone and honest “not found” answers.', 'قيّم الأمانة والنبرة الثقافية والإجابة الأمينة بـ“غير موجود”.'),
    ],
    mistake: t('“The model should memorize every story.”', '“يجب أن يحفظ النموذج كل قصة.”'),
    fix: t('The archive stays in RAG; the model learns to tell and cite.', 'يبقى الأرشيف في RAG، ويتعلم النموذج الرواية والاستشهاد.') },
  { headline: t('frozen CNN body + new head (1 output per species)', 'جسم CNN مجمَّد + رأس جديد (مخرج لكل نوع)'),
    facts: [
      t('Transfer learning: start from ImageNet weights, replace the head, train it; then unfreeze the top blocks at about 1/100 of the learning rate.', 'التعلم بالنقل: ابدأ من أوزان ImageNet، واستبدل الرأس ودرّبه، ثم فكّ تجميد الكتل العليا بنحو 1/100 من معدل التعلم.'),
      t('224 × 224, ImageNet normalization; augment the training set only, after a split by tree or observation.', '224 × 224 مع توحيد ImageNet؛ ولا تُزاد إلا مجموعة التدريب، بعد تقسيم حسب الشجرة أو المشاهدة.'),
      t('Report precision, recall, macro F1 and the confusion matrix; set the threshold on validation data.', 'أبلغ عن الضبط والاستدعاء و F1 الكلي ومصفوفة الالتباس، واختر العتبة على بيانات التحقق.'),
    ],
    mistake: t('“A confident prediction means a known plant.”', '“التنبؤ الواثق يعني نباتًا معروفًا.”'),
    fix: t('Softmax always picks a known class; test with out-of-scope photos.', 'softmax تختار دائمًا فئة معروفة؛ فاختبر بصور خارج النطاق.') },
  { headline: t('photo → CNN → record → QLoRA model → sourced answer', 'صورة ← CNN ← سجل ← نموذج QLoRA ← إجابة بمصدرها'),
    facts: [
      t('Two tracks in parallel (text → LLM, images → CNN) that join at integration.', 'مساران بالتوازي (النص ← النموذج اللغوي، والصور ← CNN) يلتقيان عند الربط.'),
      t('One key, the scientific name, joins the photo folder, the class label and the knowledge-base record.', 'مفتاح واحد، الاسم العلمي، يربط مجلد الصور وتسمية الفئة وسجل قاعدة المعرفة.'),
      t('Compare base, fine-tuned, and fine-tuned + record on the same unseen questions.', 'قارن الأساسي والمضبوط والمضبوط + السجل على الأسئلة الجديدة نفسها.'),
    ],
    mistake: t('“Training on question → answer is enough.”', '“التدريب على سؤال ← إجابة يكفي.”'),
    fix: t('Train in the shape you use: question + record → answer.', 'درّب بالشكل الذي تستخدمه: سؤال + سجل ← إجابة.') },
];

export interface SearchItem { name: Text; part: number; tab: PartTab; selector?: string; kind: 'tool' | 'scene' }

/** The tools and scenes, so the search can jump straight to them. */
export const TOOLS: SearchItem[] = [
  { kind: 'tool', part: 0, tab: 'try', selector: '.hy-trio', name: t('Three pictures to remember: lessons, sticky notes, photo', 'ثلاث صور لتتذكرها: دروس وملاحظات لاصقة وصورة') },
  { kind: 'scene', part: 1, tab: 'watch', selector: '#ft-scene-terms', name: t('The key words loop: input, processing, output', 'حلقة الكلمات الأساسية: مدخل ومعالجة ومخرج') },
  { kind: 'tool', part: 1, tab: 'try', selector: '.pm-neuron', name: t('One neuron: weights, bias, LoRA training', 'عصبون واحد: الأوزان والانحياز وتدريب LoRA') },
  { kind: 'tool', part: 1, tab: 'try', selector: '.pm-ladder', name: t('From 3 parameters to billions', 'من 3 معاملات إلى المليارات') },
  { kind: 'tool', part: 1, tab: 'try', selector: '.pm-facts', name: t('Parameters are not a file of facts', 'المعاملات ليست ملفًا من الحقائق') },
  { kind: 'scene', part: 2, tab: 'watch', selector: '#ft-scene-docs', name: t('From documents to JSONL lines', 'من المستندات إلى أسطر JSONL') },
  { kind: 'tool', part: 2, tab: 'try', selector: '.lx-formats', name: t('Data formats: messages, Alpaca, ShareGPT, CSV…', 'صيغ البيانات: messages و Alpaca و ShareGPT و CSV…') },
  { kind: 'tool', part: 2, tab: 'try', selector: '.lx-checker', name: t('JSONL checker', 'فاحص JSONL') },
  { kind: 'tool', part: 2, tab: 'try', selector: '.lx-tokens', name: t('Chat template, tokens and the prompt mask', 'قالب المحادثة والرموز وحجب السؤال') },
  { kind: 'tool', part: 3, tab: 'try', selector: '.lx-approach', name: t('Full, partial, LoRA and QLoRA compared', 'مقارنة الكامل والجزئي و LoRA و QLoRA') },
  { kind: 'tool', part: 3, tab: 'try', selector: '.lx-compare', name: t('Quantization vs pruning · fine-tuning vs RAG', 'التكميم مقابل التقليم · الضبط الدقيق مقابل RAG') },
  { kind: 'scene', part: 4, tab: 'watch', selector: '#ft-scene-adapter', name: t('How LoRA adapters are added', 'كيف تُضاف مهايئات LoRA') },
  { kind: 'tool', part: 4, tab: 'try', selector: '.ft-lora', name: t('Train a real LoRA adapter (rank 1, 2, 4)', 'درّب مهايئ LoRA حقيقيًا (الرتبة 1 و 2 و 4)') },
  { kind: 'tool', part: 4, tab: 'try', selector: '.hy-sticky', name: t('Sticky notes on a textbook', 'ملاحظات لاصقة على كتاب') },
  { kind: 'tool', part: 4, tab: 'try', selector: '.lx-loracalc', name: t('LoRA parameter calculator and alpha / r', 'حاسبة معاملات LoRA و alpha / r') },
  { kind: 'tool', part: 4, tab: 'try', selector: '.lx-init', name: t('Why B starts at zero', 'لماذا تبدأ B من الصفر') },
  { kind: 'scene', part: 5, tab: 'watch', selector: '#ft-scene-quant', name: t('How a block of weights becomes 4-bit (NF4)', 'كيف تصبح كتلة الأوزان 4 بت (NF4)') },
  { kind: 'tool', part: 5, tab: 'try', selector: '.ft-line', name: t('Quantize a layer: bits, levels, error', 'كمّم طبقة: البتات والمستويات والخطأ') },
  { kind: 'tool', part: 5, tab: 'try', selector: '.hy-photo', name: t('A photo saved with fewer bits', 'صورة محفوظة ببتات أقل') },
  { kind: 'tool', part: 6, tab: 'try', selector: '.ft-gpus', name: t('Will it fit? GPU memory calculator', 'هل يتسع؟ حاسبة ذاكرة GPU') },
  { kind: 'tool', part: 6, tab: 'try', selector: '.lx-order', name: t('Why the order matters in QLoRA', 'لماذا الترتيب مهم في QLoRA') },
  { kind: 'tool', part: 6, tab: 'try', selector: '.lx-precision', name: t('Stored in 4-bit, calculated in 16-bit', 'يُخزَّن بـ 4 بت ويُحسب بـ 16 بت') },
  { kind: 'tool', part: 6, tab: 'try', selector: '.lx-memory', name: t('Memory sum for a 27B model', 'حساب الذاكرة لنموذج 27B') },
  { kind: 'scene', part: 7, tab: 'watch', selector: '#ft-scene-kitchen', name: t('The AI kitchen: Unsloth, LoRA and the GPU', 'مطبخ الذكاء الاصطناعي: Unsloth و LoRA وبطاقة GPU') },
  { kind: 'tool', part: 7, tab: 'try', selector: '.ft-steps', name: t('The Unsloth code, step by step', 'شيفرة Unsloth خطوة بخطوة') },
  { kind: 'scene', part: 8, tab: 'watch', selector: '#ft-scene-step', name: t('One training step, from example to update', 'خطوة تدريب واحدة، من المثال إلى التحديث') },
  { kind: 'tool', part: 8, tab: 'try', selector: '.lx-lr', name: t('Learning rate: too small, good, too large', 'معدل التعلم: صغير جدًا ومناسب وكبير جدًا') },
  { kind: 'tool', part: 8, tab: 'try', selector: '.lx-batch', name: t('Batch size, gradient accumulation, epochs', 'حجم الدفعة وتجميع التدرجات والحقب') },
  { kind: 'tool', part: 8, tab: 'try', selector: '.lx-overfit', name: t('Training vs validation loss (overfitting)', 'خسارة التدريب مقابل التحقق (فرط التخصيص)') },
  { kind: 'tool', part: 8, tab: 'try', selector: '.lx-settings', name: t('Training settings table', 'جدول إعدادات التدريب') },
  { kind: 'tool', part: 9, tab: 'try', selector: '.lx-workflow', name: t('The workflow in eight stages', 'سير العمل في ثماني مراحل') },
  { kind: 'tool', part: 9, tab: 'try', selector: '.lx-ordergame', name: t('Put the workflow in order', 'رتّب سير العمل') },
  { kind: 'tool', part: 9, tab: 'try', selector: '.lx-eval', name: t('Evaluation, the adapter package, merged or separate', 'التقييم وحزمة المهايئ والدمج أو الفصل') },
  { kind: 'tool', part: 9, tab: 'try', selector: '.lx-myths', name: t('True or false: common mistakes', 'صح أم خطأ: أخطاء شائعة') },
  { kind: 'scene', part: 10, tab: 'watch', selector: '#ft-scene-hybrid', name: t('The storyteller and the library', 'الراوي والمكتبة') },
  { kind: 'scene', part: 10, tab: 'watch', selector: '#ft-scene-ragapp', name: t('The whole RAG application flow', 'تدفق تطبيق RAG كاملًا') },
  { kind: 'tool', part: 10, tab: 'try', selector: '.hy-decide', name: t('Do you need fine-tuning?', 'هل تحتاج إلى ضبط دقيق؟') },
  { kind: 'tool', part: 10, tab: 'try', selector: '.hy-sorter', name: t('Library or lesson? Sort the data', 'مكتبة أم درس؟ صنّف البيانات') },
  { kind: 'tool', part: 10, tab: 'try', selector: '.rg-same', name: t('One story, two uses: RAG entry vs training example', 'قصة واحدة واستخدامان: مدخل RAG ومثال التدريب') },
  { kind: 'tool', part: 10, tab: 'try', selector: '.rg-builder', name: t('Write a fine-tuning example as JSONL', 'اكتب مثالًا للضبط الدقيق بصيغة JSONL') },
  { kind: 'tool', part: 10, tab: 'try', selector: '.rg-search', name: t('Vector search: the meaning map', 'البحث المتجهي: خريطة المعاني') },
  { kind: 'tool', part: 11, tab: 'try', selector: '#ft-turath', name: t('TurathAI: the whole student project', 'تراث AI: مشروع الطلاب كاملًا') },
  { kind: 'scene', part: 12, tab: 'watch', selector: '#ft-scene-transfer', name: t('Transfer learning: fine-tuning a CNN', 'التعلم بالنقل: ضبط شبكة CNN') },
  { kind: 'tool', part: 12, tab: 'try', selector: '.pc-two', name: t('CNN fine-tuning vs LLM fine-tuning', 'ضبط CNN مقابل ضبط النموذج اللغوي') },
  { kind: 'tool', part: 12, tab: 'try', selector: '.pc-backbone', name: t('MobileNetV2, EfficientNet-B0, ResNet50: what is trained', 'MobileNetV2 و EfficientNet-B0 و ResNet50: ما يُدرَّب') },
  { kind: 'tool', part: 12, tab: 'try', selector: '.pc-prep', name: t('Resize, normalize and augment a photo', 'تغيير حجم الصورة وتوحيدها وزيادتها') },
  { kind: 'tool', part: 12, tab: 'try', selector: '.pc-split', name: t('Split by tree, not by photo (leakage)', 'التقسيم حسب الشجرة لا الصورة (التسرّب)') },
  { kind: 'tool', part: 12, tab: 'try', selector: '.pc-confusion', name: t('Confusion matrix, precision, recall, F1', 'مصفوفة الالتباس والضبط والاستدعاء و F1') },
  { kind: 'tool', part: 12, tab: 'try', selector: '.pc-threshold', name: t('Confidence threshold and unknown plants', 'عتبة الثقة والنباتات المجهولة') },
  { kind: 'scene', part: 13, tab: 'watch', selector: '#ft-scene-utas', name: t('UTAS-70: from a plant photo to a sourced answer', 'UTAS-70: من صورة نبات إلى إجابة موثقة') },
  { kind: 'tool', part: 13, tab: 'try', selector: '.pc-brief', name: t('UTAS-70: problem, research questions, gap', 'UTAS-70: المشكلة وأسئلة البحث والفجوة') },
  { kind: 'tool', part: 13, tab: 'try', selector: '.pc-tracks', name: t('The twelve steps in two tracks', 'الخطوات الاثنتا عشرة في مسارين') },
  { kind: 'tool', part: 13, tab: 'try', selector: '.pc-layers', name: t('The four-layer architecture', 'البنية ذات الطبقات الأربع') },
  { kind: 'tool', part: 13, tab: 'try', selector: '.pc-jsonl', name: t('Species record → JSONL lines', 'سجل النوع ← أسطر JSONL') },
  { kind: 'tool', part: 13, tab: 'try', selector: '.pc-configs', name: t('Base vs fine-tuned vs fine-tuned + record', 'الأساسي مقابل المضبوط مقابل المضبوط + السجل') },
  { kind: 'tool', part: 13, tab: 'try', selector: '.pc-guide', name: t('A guide for your own project', 'دليل لمشروعك أنت') },
];
