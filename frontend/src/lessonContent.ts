/**
 * Teaching content for the fine-tuning lab, built from the course notes
 * "Fine tuning language models with LoRA, QLoRA and Unsloth": the key words, the data formats,
 * the four ways to fine-tune, one training step, the workflow, evaluation and common mistakes.
 * Every text has an English and an Arabic version.
 */
import type { Text } from './finetuneContent';

const t = (en: string, ar: string): Text => ({ en, ar });

/** Lab parts, numbered as the student sees them (Part 1 is "Why fine-tune"). */
export const PART = { why: 1, words: 2, data: 3, freeze: 4, lora: 5, quant: 6, qlora: 7, unsloth: 8, step: 9, workflow: 10, hybrid: 11, turath: 12, vision: 13, utas: 14 };

// ------------------------------------------------------------------ key words

export const KEY_SENTENCE = t('Frozen means not updated. It does not mean inactive.', 'المجمَّد يعني أنه لا يُحدَّث، ولا يعني أنه لا يعمل.');

export interface Term { name: Text; plain: Text; example: Text; part: number }

/** The words in the order they happen in one round of training. */
export const LOOP_TERMS: Term[] = [
  { name: t('Parameter (weight)', 'المعامل (الوزن)'), part: PART.words,
    plain: t('A learned number inside the model or the adapter. There are two kinds: weights (w), which set how strongly each input counts, and biases (b), extra numbers added before the activation function. A “27B” model holds 27 billion such numbers: numbers, not facts or documents. Knowledge is spread across many of them.',
      'رقم متعلَّم داخل النموذج أو المهايئ. وهو نوعان: الأوزان (w) التي تحدد مقدار تأثير كل مدخل، والانحيازات (b) وهي أرقام إضافية تُضاف قبل دالة التنشيط. ونموذج “27B” يحمل 27 مليار رقم كهذا: أرقامًا لا حقائق ولا مستندات. والمعرفة موزعة على كثير منها.'),
    example: t('z = (2 × 0.5) + (3 × 0.4) + 0.2 = 2.4: two weights and one bias.', 'z = (2 × 0.5) + (3 × 0.4) + 0.2 = 2.4: وزنان وانحياز واحد.') },
  { name: t('Frozen parameter', 'المعامل المجمَّد'), part: PART.freeze,
    plain: t('A parameter that training is told not to change. It still takes part in every calculation: frozen means not updated, not inactive.',
      'معامل يُطلب من التدريب ألا يغيّره. لكنه يشارك في كل حساب: المجمَّد يعني أنه لا يُحدَّث، لا أنه لا يعمل.'),
    example: t('All the original weights of the base model, shown with a lock.', 'كل الأوزان الأصلية للنموذج الأساسي، وتظهر بقفل.') },
  { name: t('Trainable parameter', 'المعامل القابل للتدريب'), part: PART.lora,
    plain: t('A parameter the optimizer is allowed to change. In LoRA these are only the numbers in the small matrices A and B: the adapter.',
      'معامل يُسمح للمحسّن بتغييره. وفي LoRA هي أرقام المصفوفتين الصغيرتين A و B فقط: المهايئ.'),
    example: t('The orange A and B, under 1% of the model.', 'المصفوفتان البرتقاليتان A و B، أقل من 1٪ من النموذج.') },
  { name: t('Activation (forward pass)', 'التنشيط (التمرير الأمامي)'), part: PART.step,
    plain: t('An in-between value computed for the current input as it passes through the layers. The frozen layers and the adapters both compute activations.',
      'قيمة وسيطة تُحسب للمدخل الحالي وهو يمر عبر الطبقات. والطبقات المجمَّدة والمهايئات كلاهما يحسب تنشيطات.'),
    example: t('The vector x entering q_proj, and the output h leaving it.', 'المتجه x الداخل إلى q_proj، والمخرج h الخارج منها.') },
  { name: t('Loss', 'الخسارة'), part: PART.step,
    plain: t('One number that says how far the model’s predicted next tokens are from the target answer. Lower is a better fit to the training examples.',
      'رقم واحد يقول كم تبعد الرموز التالية التي توقعها النموذج عن الإجابة المستهدفة. والأقل يعني ملاءمة أفضل لأمثلة التدريب.'),
    example: t('Cross-entropy: −log of the probability given to the right token.', 'الإنتروبيا المتقاطعة: سالب لوغاريتم الاحتمال المعطى للرمز الصحيح.') },
  { name: t('Gradient (backward pass)', 'التدرّج (التمرير الخلفي)'), part: PART.step,
    plain: t('A signal for each trainable number: which way, and how strongly, a small change would lower the loss. It travels back through the frozen layers to reach the adapters, but the frozen layers keep no gradient of their own.',
      'إشارة لكل رقم قابل للتدريب: في أي اتجاه، وبأي قوة، سيخفض تغيير صغير الخسارة. وتعود عبر الطبقات المجمَّدة لتصل إلى المهايئات، لكن الطبقات المجمَّدة لا تحتفظ بتدرّج خاص بها.'),
    example: t('The red packets flowing backwards in the adapter scene.', 'الحزم الحمراء العائدة للخلف في مشهد المهايئ.') },
  { name: t('Optimizer (update)', 'المحسّن (التحديث)'), part: PART.step,
    plain: t('The algorithm, for example AdamW, that uses the gradients to change the trainable numbers a little. The learning rate sets how big each change is.',
      'الخوارزمية، مثل AdamW، التي تستخدم التدرجات لتغيير الأرقام القابلة للتدريب قليلًا. ومعدل التعلم يحدد حجم كل تغيير.'),
    example: t('A ← A − learning rate × gradient of A.', 'A ← A − معدل التعلم × تدرّج A.') },
  { name: t('Batch, step and epoch', 'الدفعة والخطوة والحقبة'), part: PART.step,
    plain: t('A batch is the group of examples handled together; one step is one update after a batch; an epoch is one full pass through the training data. Then it all repeats.',
      'الدفعة مجموعة الأمثلة التي تُعالج معًا؛ والخطوة تحديث واحد بعد دفعة؛ والحقبة مرور كامل على بيانات التدريب. ثم يتكرر كل ذلك.'),
    example: t('800 examples with an effective batch of 16 = 50 steps per epoch.', '800 مثال بدفعة فعلية 16 = 50 خطوة في كل حقبة.') },
];

/** The glossary from the notes, each linked to the part of the lab where it is shown. */
export const GLOSSARY: Term[] = [
  ...LOOP_TERMS,
  { name: t('Transfer learning', 'التعلم بالنقل'), part: PART.vision,
    plain: t('Starting from a model trained on a large general task and fine-tuning it for yours, instead of training from zero.',
      'البدء من نموذج مدرَّب على مهمة عامة كبيرة وضبطه لمهمتك، بدلًا من التدريب من الصفر.'), example: t('A CNN trained on ImageNet, fine-tuned for six Dhofar plants.', 'شبكة CNN مدرَّبة على ImageNet، مضبوطة لستة نباتات من ظفار.') },
  { name: t('CNN (convolutional neural network)', 'CNN (شبكة عصبية التفافية)'), part: PART.vision,
    plain: t('A network for images. Small filters slide over the picture; early layers find edges, later layers whole shapes.',
      'شبكة للصور. مرشحات صغيرة تنزلق على الصورة؛ فتجد الطبقات الأولى الحواف، والأخيرة الأشكال الكاملة.'), example: t('MobileNetV2, EfficientNet-B0, ResNet50.', 'MobileNetV2 و EfficientNet-B0 و ResNet50.') },
  { name: t('Backbone and head', 'العمود الفقري والرأس'), part: PART.vision,
    plain: t('The backbone turns a photo into features; the head is the last layer that turns features into one score per class.',
      'العمود الفقري يحوّل الصورة إلى سمات، والرأس هو الطبقة الأخيرة التي تحوّل السمات إلى درجة لكل فئة.'), example: t('MobileNetV2 head for 6 species: 1,280 × 6 + 6 = 7,686 numbers.', 'رأس MobileNetV2 لستة أنواع: 1,280 × 6 + 6 = 7,686 رقمًا.') },
  { name: t('Data augmentation', 'زيادة البيانات'), part: PART.vision,
    plain: t('Making changed copies of training photos (turned, flipped, zoomed, brighter) so the model learns the plant, not one picture.',
      'صنع نسخ معدّلة من صور التدريب (مدوّرة ومقلوبة ومكبّرة وأكثر إضاءة) حتى يتعلم النموذج النبات لا صورة واحدة.'), example: t('Training set only, never validation or test.', 'لمجموعة التدريب فقط، لا للتحقق ولا للاختبار.') },
  { name: t('Precision, recall and F1', 'الضبط والاستدعاء و F1'), part: PART.vision,
    plain: t('Precision: of what it called X, how much was X. Recall: of all real X, how much it found. F1 balances the two; macro F1 averages it over classes.',
      'الضبط: مما سمّاه X، كم كان X فعلًا. الاستدعاء: من كل X الحقيقية، كم وجد. و F1 يوازن بينهما، و F1 الكلي متوسطه على الفئات.'), example: t('Myrrh: precision 81%, recall 73%.', 'المُرّ: ضبط 81٪ واستدعاء 73٪.') },
  { name: t('Confusion matrix', 'مصفوفة الالتباس'), part: PART.vision,
    plain: t('A table of real class (rows) against predicted class (columns). The diagonal is right; the other cells show which mistakes happen.',
      'جدول الفئة الحقيقية (الصفوف) مقابل الفئة المتوقعة (الأعمدة). القطر صحيح، والخلايا الأخرى تُظهر الأخطاء التي تحدث.'), example: t('5 myrrh photos called frankincense.', '5 صور للمُرّ سُمّيت لبانًا.') },
  { name: t('Confidence threshold', 'عتبة الثقة'), part: PART.vision,
    plain: t('The lowest probability at which the system accepts a prediction; below it, it asks for a better photo.',
      'أدنى احتمال يقبل عنده النظام التنبؤ؛ وتحته يطلب صورة أفضل.'), example: t('70%, chosen on validation data.', '70٪، تُختار على بيانات التحقق.') },
  { name: t('Knowledge base', 'قاعدة المعرفة'), part: PART.utas,
    plain: t('Structured records (here one JSON record per species), every fact with its source and page.',
      'سجلات منظمة (هنا سجل JSON لكل نوع)، وكل حقيقة مع مصدرها وصفحتها.'), example: t('Boswellia sacra → family, names, habitat, uses, source.', 'Boswellia sacra ← الفصيلة والأسماء والموطن والاستخدامات والمصدر.') },
  { name: t('Open weight', 'مفتوح الأوزان'), part: PART.why,
    plain: t('The weights can be downloaded under a licence. It does not mean frozen, and not always free to use for anything: check the licence.',
      'يمكن تنزيل الأوزان بموجب ترخيص. ولا يعني ذلك أنها مجمَّدة، ولا أنها حرة لأي استخدام دائمًا: راجع الترخيص.'), example: t('Qwen, Llama, Gemma.', 'Qwen و Llama و Gemma.') },
  { name: t('Token and tokenizer', 'الرمز والمقطِّع'), part: PART.data,
    plain: t('The tokenizer cuts text into pieces called tokens and gives each an ID number. The model only ever sees these numbers.',
      'المقطِّع يقطع النص إلى قطع تسمى رموزًا ويعطي كلًّا منها رقمًا. والنموذج لا يرى إلا هذه الأرقام.'), example: t('“Bar’ah” might become two tokens.', 'قد تصبح “البرعة” رمزين.') },
  { name: t('Chat template', 'قالب المحادثة'), part: PART.data,
    plain: t('The model’s own markers that show where the user’s turn and the assistant’s turn begin and end. Each model family has its own.',
      'علامات النموذج الخاصة التي تبيّن أين يبدأ دور المستخدم ودور المساعد وأين ينتهيان. ولكل عائلة نماذج قالبها.'), example: t('<|im_start|>user … <|im_end|>', '<|im_start|>user … <|im_end|>') },
  { name: t('JSONL', 'JSONL'), part: PART.data,
    plain: t('A text file with one complete JSON object per line. A storage format, not a teaching method: it guarantees neither truth nor coverage.',
      'ملف نصي فيه كائن JSON كامل في كل سطر. صيغة تخزين لا طريقة تعليم: لا تضمن صحة المحتوى ولا شموله.'), example: t('{"messages": [...]}', '{"messages": [...]}') },
  { name: t('SFT', 'SFT'), part: PART.data,
    plain: t('Supervised fine-tuning: training on examples that come with the target answer.',
      'الضبط الدقيق الموجَّه: التدريب على أمثلة معها الإجابة المستهدفة.'), example: t('Question → reviewed answer pairs.', 'أزواج سؤال ← إجابة مراجَعة.') },
  { name: t('PEFT', 'PEFT'), part: PART.freeze,
    plain: t('Parameter-efficient fine-tuning: adapting a model by training relatively few parameters. LoRA is the best-known PEFT method.',
      'الضبط الدقيق الموفّر للمعاملات: تكييف النموذج بتدريب عدد قليل نسبيًا من المعاملات. و LoRA أشهر طرقه.'), example: t('Also the name of the Hugging Face library.', 'وهو أيضًا اسم مكتبة من Hugging Face.') },
  { name: t('RAG', 'RAG'), part: PART.hybrid,
    plain: t('Retrieval-augmented generation: find relevant source passages at answer time and give them to the model as context. It changes no weights.',
      'التوليد المعزَّز بالاسترجاع: إيجاد مقاطع المصادر المناسبة وقت الإجابة وإعطاؤها للنموذج سياقًا. ولا يغيّر أي وزن.'), example: t('Used in TurathAI to cite the archive.', 'يُستخدم في تراث AI للاستشهاد بالأرشيف.') },
  { name: t('Adapter', 'المهايئ'), part: PART.lora,
    plain: t('A small trainable part added to an existing model to adapt it. It cannot answer on its own: it needs its matching base model.',
      'جزء صغير قابل للتدريب يُضاف إلى نموذج موجود لتكييفه. ولا يجيب وحده: يحتاج إلى نموذجه الأساسي المطابق.'), example: t('A file of a few tens of MB.', 'ملف ببضع عشرات من الميغابايت.') },
  { name: t('LoRA', 'LoRA'), part: PART.lora,
    plain: t('Low-Rank Adaptation: learn a change to a weight matrix written as two thin matrices, ΔW = s × B·A. “Low rank”, not “a low number of adapters”.',
      'التكييف منخفض الرتبة: تعلّم تغيير على مصفوفة أوزان مكتوب كمصفوفتين رفيعتين، ΔW = s × B·A. أي “رتبة منخفضة” لا “عدد قليل من المهايئات”.'), example: t('y = W·x + s × B(A·x)', 'y = W·x + s × B(A·x)') },
  { name: t('Rank r and alpha', 'الرتبة r و alpha'), part: PART.lora,
    plain: t('r is the width of the bottleneck between A and B: more rank, more capacity and more trainable numbers. alpha sets the scale s = alpha ÷ r of the adapter’s effect.',
      'r هي عرض عنق الزجاجة بين A و B: رتبة أكبر تعني سعة أكبر وأرقامًا قابلة للتدريب أكثر. و alpha تحدد المقياس s = alpha ÷ r لأثر المهايئ.'), example: t('r = 16, alpha = 16 → s = 1.', 'r = 16 و alpha = 16 ← s = 1.') },
  { name: t('Quantization', 'التكميم'), part: PART.quant,
    plain: t('Storing numbers with fewer bits, usually as an approximation. The number of weights stays the same; each takes less memory.',
      'تخزين الأرقام ببتات أقل، تقريبيًا في العادة. يبقى عدد الأوزان كما هو، ويشغل كل منها ذاكرة أقل.'), example: t('16-bit → 4-bit: 4 times smaller.', '16 بت ← 4 بت: أصغر أربع مرات.') },
  { name: t('NF4', 'NF4'), part: PART.quant,
    plain: t('“4-bit NormalFloat”: a 4-bit format whose 16 levels are packed near zero, where trained weights usually are. Used by QLoRA.',
      '“العدد العائم الطبيعي بـ 4 بتات”: صيغة 4 بت مستوياتها الستة عشر متراصة قرب الصفر حيث تكون الأوزان المدرَّبة عادةً. تستخدمها QLoRA.'), example: t('16 levels from −1 to +1.', '16 مستوى من −1 إلى +1.') },
  { name: t('QLoRA', 'QLoRA'), part: PART.qlora,
    plain: t('Train LoRA adapters on top of a frozen base model that is stored in 4-bit during training. Not a compression step after training.',
      'تدريب مهايئات LoRA فوق نموذج أساسي مجمَّد مخزَّن بدقة 4 بت أثناء التدريب. وليس خطوة ضغط بعد التدريب.'), example: t('4-bit base + 16-bit adapters.', 'أساس 4 بت + مهايئات 16 بت.') },
  { name: t('VRAM', 'VRAM'), part: PART.qlora,
    plain: t('The memory on the GPU. The weights, adapters, optimizer state and activations must all fit in it.',
      'ذاكرة بطاقة GPU. ويجب أن تتسع فيها الأوزان والمهايئات وحالة المحسّن والتنشيطات كلها.'), example: t('A free cloud T4 has 16 GB.', 'بطاقة T4 السحابية المجانية فيها 16 غ.ب.') },
  { name: t('Unsloth', 'Unsloth'), part: PART.unsloth,
    plain: t('A software toolkit that loads supported models, attaches adapters and makes training faster and lighter. It is software, not a method and not a layer.',
      'أداة برمجية تحمّل النماذج المدعومة وتربط المهايئات وتجعل التدريب أسرع وأخف. إنها برنامج، لا طريقة تدريب ولا طبقة.'), example: t('The chef in the kitchen picture.', 'الطاهي في صورة المطبخ.') },
  { name: t('Learning rate', 'معدل التعلم'), part: PART.step,
    plain: t('How big each optimizer step is. Too small: slow. Too large: the loss jumps around or blows up.',
      'حجم كل خطوة يخطوها المحسّن. صغير جدًا: بطء. كبير جدًا: تقفز الخسارة أو تنفجر.'), example: t('2e-4 is common for LoRA.', 'القيمة 2e-4 شائعة في LoRA.') },
  { name: t('Gradient accumulation', 'تجميع التدرّجات'), part: PART.step,
    plain: t('Add up the gradients of several small batches before one update, to act like a bigger batch without the memory.',
      'جمع تدرجات عدة دفعات صغيرة قبل تحديث واحد، لتعمل كدفعة أكبر دون ذاكرتها.'), example: t('2 × 8 = an effective batch of 16.', '2 × 8 = دفعة فعلية من 16.') },
  { name: t('Validation set', 'مجموعة التحقق'), part: PART.workflow,
    plain: t('Examples kept out of training and used to guide decisions while training, such as when to stop.',
      'أمثلة تُبعد عن التدريب وتُستخدم لتوجيه القرارات أثناءه، مثل متى نتوقف.'), example: t('About 10% of the data.', 'نحو 10٪ من البيانات.') },
  { name: t('Test set', 'مجموعة الاختبار'), part: PART.workflow,
    plain: t('Examples held back until the very end for the final, honest assessment. Never tune settings on it.',
      'أمثلة تُحجز حتى النهاية للتقييم النهائي الصادق. ولا تُضبط الإعدادات عليها أبدًا.'), example: t('About 10% of the data, from different sources.', 'نحو 10٪ من البيانات، من مصادر مختلفة.') },
  { name: t('Checkpoint', 'نقطة الحفظ'), part: PART.workflow,
    plain: t('A saved snapshot of the training state or of the adapter, so a good earlier version can be recovered.',
      'لقطة محفوظة لحالة التدريب أو للمهايئ، لاستعادة نسخة سابقة جيدة.'), example: t('checkpoint-200/', 'checkpoint-200/') },
  { name: t('Merge', 'الدمج'), part: PART.workflow,
    plain: t('Adding the learned change B·A into W once, so the model has its original shape with the skill built in and no separate adapter.',
      'إضافة التغيير المتعلَّم B·A إلى W مرة واحدة، فيبقى للنموذج شكله الأصلي والمهارة مبنية فيه دون مهايئ منفصل.'), example: t('W′ = W + s × B·A', 'W′ = W + s × B·A') },
];

// --------------------------------------------------------------- the four ways

export interface Approach { key: 'full' | 'partial' | 'lora' | 'qlora'; name: Text; updated: Text; base: Text; purpose: Text }

export const APPROACHES: Approach[] = [
  { key: 'full', name: t('Full fine-tuning', 'ضبط دقيق كامل'),
    updated: t('All original parameters', 'كل المعاملات الأصلية'), base: t('Trainable', 'قابلة للتدريب'),
    purpose: t('Broad adaptation, when memory and budget allow', 'تكييف واسع، حين تسمح الذاكرة والميزانية') },
  { key: 'partial', name: t('Partial fine-tuning', 'ضبط دقيق جزئي'),
    updated: t('Selected original layers', 'طبقات أصلية مختارة'), base: t('Some trainable', 'بعضها قابل للتدريب'),
    purpose: t('Limit the change to part of the model', 'حصر التغيير في جزء من النموذج') },
  { key: 'lora', name: t('LoRA', 'LoRA'),
    updated: t('Added low-rank matrices A and B', 'مصفوفات منخفضة الرتبة مضافة A و B'), base: t('Frozen (usually 16-bit)', 'مجمَّدة (16 بت عادةً)'),
    purpose: t('Compact adapters for a domain or a task', 'مهايئات صغيرة لمجال أو مهمة') },
  { key: 'qlora', name: t('QLoRA', 'QLoRA'),
    updated: t('Added low-rank matrices A and B', 'مصفوفات منخفضة الرتبة مضافة A و B'), base: t('Frozen and stored in 4-bit', 'مجمَّدة ومخزَّنة بدقة 4 بت'),
    purpose: t('Same as LoRA, with far less memory for the base', 'كـ LoRA، بذاكرة أقل بكثير للأساس') },
];

// ------------------------------------------------------------------- data

/** One reviewed question–answer pair, used to show the same example in every format. */
export const PAIR = {
  question: t('What is Al-Bar’ah?', 'ما هي البرعة؟'),
  answer: t('Al-Bar’ah is a performing art from the Dhofari valleys of Oman that combines dance, music and poetry.',
    'البرعة فن أدائي من أودية ظفار في عُمان يجمع بين الرقص والموسيقى والشعر.'),
  wrong: t('Al-Bar’ah is a traditional Omani bread.', 'البرعة خبز عُماني تقليدي.'),
  passage: t('Al-Bar’ah is a Bedouin music and dance tradition of the Dhofari valleys, inscribed by UNESCO in 2010.',
    'البرعة تقليد بدوي من الموسيقى والرقص في أودية ظفار، أدرجته اليونسكو عام 2010.'),
  system: t('You answer questions about Omani heritage.', 'أنت تجيب عن أسئلة التراث العُماني.'),
};

export interface Format {
  key: string; name: Text; tag: Text; build: (q: string, a: string, extra: { wrong: string; passage: string; system: string }) => string;
  fields: { field: string; meaning: Text }[]; use: Text; note: Text; lines?: boolean;
}

const json = (value: unknown) => JSON.stringify(value);

export const FORMATS: Format[] = [
  { key: 'messages', name: t('JSONL · chat messages', 'JSONL · رسائل محادثة'), tag: t('most common', 'الأكثر شيوعًا'), lines: true,
    build: (q, a, x) => [json({ messages: [{ role: 'user', content: q }, { role: 'assistant', content: a }] }),
      json({ messages: [{ role: 'system', content: x.system }, { role: 'user', content: q }, { role: 'assistant', content: a }] })].join('\n'),
    fields: [
      { field: 'messages', meaning: t('The whole conversation, as a list of turns.', 'المحادثة كلها، كقائمة من الأدوار.') },
      { field: 'role', meaning: t('Who speaks: "system" (optional instructions), "user" (the question) or "assistant" (the answer to learn).', 'من يتكلم: "system" (تعليمات اختيارية) أو "user" (السؤال) أو "assistant" (الإجابة المراد تعلمها).') },
      { field: 'content', meaning: t('The text of that turn, in UTF-8, so Arabic is stored as it is.', 'نص ذلك الدور، بترميز UTF-8، فتُخزَّن العربية كما هي.') },
    ],
    use: t('Question-and-answer or chat data for instruction-tuned models. TRL’s SFTTrainer and Unsloth read it directly and apply the model’s chat template for you.',
      'بيانات السؤال والجواب أو المحادثة للنماذج المضبوطة على التعليمات. ويقرؤها SFTTrainer من TRL و Unsloth مباشرةً ويطبقان قالب المحادثة للنموذج نيابةً عنك.'),
    note: t('The second line adds an optional system turn. A conversation can also have several user/assistant turns.',
      'السطر الثاني يضيف دور system اختياريًا. ويمكن أن تحتوي المحادثة أيضًا على عدة أدوار للمستخدم والمساعد.') },
  { key: 'alpaca', name: t('JSONL · instruction (Alpaca)', 'JSONL · تعليمات (Alpaca)'), tag: t('instruction', 'تعليمات'), lines: true,
    build: (q, a) => json({ instruction: q, input: '', output: a }),
    fields: [
      { field: 'instruction', meaning: t('The task or question.', 'المهمة أو السؤال.') },
      { field: 'input', meaning: t('Optional extra material for the task, such as a passage to summarise. Empty here.', 'مادة إضافية اختيارية للمهمة، مثل مقطع يُلخَّص. وهو فارغ هنا.') },
      { field: 'output', meaning: t('The answer the model should learn to give.', 'الإجابة التي يجب أن يتعلم النموذج إعطاءها.') },
    ],
    use: t('Single-turn tasks. Your code must turn the three fields into a chat (for example instruction + input → user, output → assistant) before training.',
      'المهام ذات الدور الواحد. ويجب أن تحوّل شيفرتك الحقول الثلاثة إلى محادثة (مثلًا instruction + input ← user و output ← assistant) قبل التدريب.'),
    note: t('Named after the Stanford Alpaca dataset, which made this layout popular.', 'سُميت باسم مجموعة بيانات Stanford Alpaca التي نشرت هذا الشكل.') },
  { key: 'sharegpt', name: t('JSONL · ShareGPT', 'JSONL · ShareGPT'), tag: t('chat, older style', 'محادثة، نمط أقدم'), lines: true,
    build: (q, a) => json({ conversations: [{ from: 'human', value: q }, { from: 'gpt', value: a }] }),
    fields: [
      { field: 'conversations', meaning: t('The list of turns.', 'قائمة الأدوار.') },
      { field: 'from', meaning: t('"human" or "gpt" instead of "user" and "assistant".', '"human" أو "gpt" بدلًا من "user" و "assistant".') },
      { field: 'value', meaning: t('The text of the turn.', 'نص الدور.') },
    ],
    use: t('Many public chat datasets use it. Unsloth has a helper (standardize_sharegpt) that converts it to the messages format.',
      'كثير من مجموعات بيانات المحادثة العامة تستخدمه. ولدى Unsloth دالة مساعدة (standardize_sharegpt) تحوّله إلى صيغة messages.'),
    note: t('Same information as the messages format, different key names.', 'المعلومات نفسها كصيغة messages، بأسماء مفاتيح مختلفة.') },
  { key: 'text', name: t('JSONL · plain text', 'JSONL · نص خام'), tag: t('raw documents', 'مستندات خام'), lines: true,
    build: (_q, _a, x) => json({ text: x.passage }),
    fields: [
      { field: 'text', meaning: t('A block of text. The model learns to continue it, token by token. There is no question and no answer.', 'كتلة من النص. يتعلم النموذج إكمالها رمزًا بعد رمز. ولا يوجد سؤال ولا جواب.') },
    ],
    use: t('Continued pre-training on your documents, so the model absorbs vocabulary and style. It does not teach it to answer questions; that needs pairs.',
      'مواصلة التدريب المسبق على مستنداتك، فيكتسب النموذج المفردات والأسلوب. لكنه لا يعلّمه الإجابة عن الأسئلة؛ فذلك يحتاج إلى أزواج.'),
    note: t('Some pipelines also store conversations here after applying the chat template, so "text" already contains the markers.',
      'وبعض خطوط المعالجة تخزّن المحادثات هنا بعد تطبيق قالب المحادثة، فيحتوي "text" على العلامات مسبقًا.') },
  { key: 'dpo', name: t('JSONL · preference pairs', 'JSONL · أزواج تفضيل'), tag: t('DPO / ORPO', 'DPO / ORPO'), lines: true,
    build: (q, a, x) => json({ prompt: q, chosen: a, rejected: x.wrong }),
    fields: [
      { field: 'prompt', meaning: t('The question.', 'السؤال.') },
      { field: 'chosen', meaning: t('The better answer, which the model should prefer.', 'الإجابة الأفضل التي يجب أن يفضلها النموذج.') },
      { field: 'rejected', meaning: t('A worse answer, which it should learn to avoid.', 'إجابة أسوأ يجب أن يتعلم تجنبها.') },
    ],
    use: t('A second stage after SFT, to teach the model which of two answers is better (for example DPO in TRL). Not needed for a first project.',
      'مرحلة ثانية بعد SFT لتعليم النموذج أي الإجابتين أفضل (مثل DPO في TRL). ولا حاجة إليها في المشروع الأول.'),
    note: t('Each line holds one question and two answers to compare.', 'كل سطر يحمل سؤالًا واحدًا وإجابتين للمقارنة.') },
  { key: 'json', name: t('JSON · one big array', 'JSON · مصفوفة واحدة كبيرة'), tag: t('not JSONL', 'ليس JSONL'), lines: false,
    build: (q, a) => `[\n  ${json({ question: q, answer: a })},\n  ${json({ question: '…', answer: '…' })}\n]`,
    fields: [
      { field: '[ … ]', meaning: t('All records inside one array. The whole file must be read and parsed at once.', 'كل السجلات داخل مصفوفة واحدة. ويجب قراءة الملف كله وتحليله دفعة واحدة.') },
    ],
    use: t('Fine for small files. JSONL is preferred for training data: it can be read line by line, new records are simply appended, and one broken line does not break the whole file.',
      'مناسبة للملفات الصغيرة. لكن JSONL مفضلة لبيانات التدريب: تُقرأ سطرًا بسطر، وتُضاف السجلات الجديدة في آخرها ببساطة، والسطر المكسور لا يكسر الملف كله.'),
    note: t('load_dataset("json", …) reads both kinds of file.', 'الدالة load_dataset("json", …) تقرأ النوعين.') },
  { key: 'csv', name: t('CSV / Parquet', 'CSV / Parquet'), tag: t('tables', 'جداول'), lines: false,
    build: (q, a) => `question,answer\n"${q}","${a}"`,
    fields: [
      { field: 'question,answer', meaning: t('The header row names the columns.', 'سطر العنوان يسمّي الأعمدة.') },
      { field: '"…"', meaning: t('Values with commas must be quoted, and line breaks inside answers are easy to get wrong.', 'القيم التي فيها فواصل يجب أن توضع بين علامتي تنصيص، والأسطر الجديدة داخل الإجابات سهلة الإفساد.') },
    ],
    use: t('Spreadsheet-friendly: good for writing and reviewing pairs with experts. Convert to JSONL (or let load_dataset read it) before training. Parquet is a compressed column file that Hugging Face uses to publish big datasets.',
      'سهلة مع جداول البيانات: جيدة لكتابة الأزواج ومراجعتها مع الخبراء. حوّلها إلى JSONL (أو دع load_dataset يقرؤها) قبل التدريب. و Parquet ملف أعمدة مضغوط تستخدمه Hugging Face لنشر مجموعات البيانات الكبيرة.'),
    note: t('Parquet is binary: same rows, but not readable in a text editor.', 'Parquet ملف ثنائي: الصفوف نفسها لكنه لا يُقرأ في محرر نصوص.') },
];

/** A training file with typical mistakes, for the JSONL checker. Values are filled in per language. */
export function brokenJsonl(q: string, a: string, q2: string, a2: string) {
  const record = (question: string, answer: string) => json({ messages: [{ role: 'user', content: question }, { role: 'assistant', content: answer }] });
  return [
    record(q, a),
    `{"messages":[{"role":"user","content":${json(q2)}},`,
    `{"role":"assistant","content":${json(a2)}}]}`,
    `{'messages':[{'role':'user','content':'${q}'},{'role':'assistant','content':'${a}'}]}`,
    `{"messages":[{"role":"user","content":${json(q)}},{"role":"assistant","content":${json(a)}},]}`,
    json({ question: q, answer: a }),
    json({ messages: [{ role: 'user', content: q }, { role: 'assistant', content: '' }] }),
    record(q2, a2),
  ].join('\n');
}

export function cleanJsonl(q: string, a: string, q2: string, a2: string) {
  const record = (question: string, answer: string) => json({ messages: [{ role: 'user', content: question }, { role: 'assistant', content: answer }] });
  return [record(q, a), record(q2, a2)].join('\n');
}

export const PAIR_2 = {
  question: t('How is Al-Bar’ah performed?', 'كيف تُؤدّى البرعة؟'),
  answer: t('Men and women stand in a half circle, chanting and clapping, while two dancers holding khanjars perform set movements.',
    'يقف الرجال والنساء في نصف دائرة يرددون ويصفقون، بينما يؤدي راقصان يحملان الخناجر حركات محددة.'),
};

export interface LineCheck { ok: boolean; kind: 'empty' | 'ok' | 'json' | 'schema'; reason: Text }

/** Check one line of a chat-messages JSONL file the way a training script would. */
export function checkLine(line: string): LineCheck {
  if (!line.trim()) return { ok: true, kind: 'empty', reason: t('Empty line: skipped.', 'سطر فارغ: يُتخطّى.') };
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    const trimmed = line.trim();
    if (/'(messages|role|content)'/.test(trimmed) || trimmed.startsWith("{'")) return { ok: false, kind: 'json',
      reason: t('Not valid JSON: JSON needs double quotes "…", not single quotes.', 'ليس JSON صحيحًا: يحتاج JSON إلى علامات تنصيص مزدوجة "…" لا مفردة.') };
    if (/,\s*[\]}]/.test(trimmed)) return { ok: false, kind: 'json',
      reason: t('Not valid JSON: there is a comma before a closing bracket.', 'ليس JSON صحيحًا: توجد فاصلة قبل قوس إغلاق.') };
    const opens = (trimmed.match(/[[{]/g) ?? []).length;
    const closes = (trimmed.match(/[\]}]/g) ?? []).length;
    if (opens !== closes) return { ok: false, kind: 'json',
      reason: t('Not valid JSON: the object is split across lines. In JSONL one record must fit on one line.', 'ليس JSON صحيحًا: الكائن مقسوم على أكثر من سطر. وفي JSONL يجب أن يتسع السجل كله في سطر واحد.') };
    return { ok: false, kind: 'json', reason: t('Not valid JSON.', 'ليس JSON صحيحًا.') };
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, kind: 'schema',
    reason: t('Valid JSON, but each line must be one object { … }.', 'JSON صحيح، لكن يجب أن يكون كل سطر كائنًا واحدًا { … }.') };
  const messages = (value as { messages?: unknown }).messages;
  if (!Array.isArray(messages)) return { ok: false, kind: 'schema',
    reason: t('Valid JSON, but there is no "messages" list, which the training code expects.', 'JSON صحيح، لكن لا توجد قائمة "messages" التي تتوقعها شيفرة التدريب.') };
  for (const message of messages) {
    const role = (message as { role?: unknown })?.role;
    const content = (message as { content?: unknown })?.content;
    if (role !== 'system' && role !== 'user' && role !== 'assistant') return { ok: false, kind: 'schema',
      reason: t('A role must be "system", "user" or "assistant".', 'يجب أن يكون الدور "system" أو "user" أو "assistant".') };
    if (typeof content !== 'string' || !content.trim()) return { ok: false, kind: 'schema',
      reason: t(`The ${role} turn is empty: there is nothing to learn from it.`, `دور ${role} فارغ: لا يوجد ما يُتعلَّم منه.`) };
  }
  if ((messages[messages.length - 1] as { role?: string })?.role !== 'assistant') return { ok: false, kind: 'schema',
    reason: t('The last turn should be the assistant’s answer.', 'يجب أن يكون الدور الأخير إجابة المساعد.') };
  return { ok: true, kind: 'ok', reason: t(`A valid record with ${messages.length} turns.`, `سجل صحيح فيه ${messages.length} أدوار.`) };
}

// ------------------------------------------------------------ training step

export const SETTINGS = [
  { name: t('Rank r', 'الرتبة r'), meaning: t('Size of the adapter bottleneck', 'حجم عنق الزجاجة في المهايئ'), effect: t('More rank: more capacity and more trainable numbers', 'رتبة أكبر: سعة أكبر وأرقام قابلة للتدريب أكثر'), code: 'r = 16' },
  { name: t('Target modules', 'الوحدات المستهدفة'), meaning: t('Which matrices get adapters', 'أي المصفوفات تحصل على مهايئات'), effect: t('Changes coverage and memory use', 'يغيّر التغطية واستهلاك الذاكرة'), code: 'target_modules = ["q_proj", …]' },
  { name: t('Learning rate', 'معدل التعلم'), meaning: t('Size of each optimizer step', 'حجم كل خطوة للمحسّن'), effect: t('Too large can make training unstable', 'الكبير جدًا قد يجعل التدريب غير مستقر'), code: 'learning_rate = 2e-4' },
  { name: t('Batch size', 'حجم الدفعة'), meaning: t('Examples processed together', 'الأمثلة التي تُعالج معًا'), effect: t('Affects memory and how smooth the gradients are', 'يؤثر في الذاكرة وفي نعومة التدرجات'), code: 'per_device_train_batch_size = 2' },
  { name: t('Gradient accumulation', 'تجميع التدرّجات'), meaning: t('Add up gradients over several small batches', 'جمع التدرجات عبر عدة دفعات صغيرة'), effect: t('Acts like a bigger batch without its memory', 'يعمل كدفعة أكبر دون ذاكرتها'), code: 'gradient_accumulation_steps = 8' },
  { name: t('Epoch', 'الحقبة'), meaning: t('One pass through the training data', 'مرور واحد على بيانات التدريب'), effect: t('More passes can lead to overfitting', 'المرور مرات أكثر قد يؤدي إلى فرط التخصيص'), code: 'num_train_epochs = 2' },
  { name: t('Sequence length', 'طول التسلسل'), meaning: t('Maximum tokens per example', 'أقصى عدد من الرموز لكل مثال'), effect: t('Longer uses more memory; too short cuts answers', 'الأطول يستهلك ذاكرة أكثر، والأقصر جدًا يقطع الإجابات'), code: 'max_seq_length = 2048' },
  { name: t('Seed', 'البذرة'), meaning: t('Fixes the random choices where supported', 'تثبّت الاختيارات العشوائية حيث يمكن'), effect: t('Helps repeat a run, but cannot guarantee identical results', 'تساعد على تكرار التجربة، لكنها لا تضمن نتائج متطابقة'), code: 'seed = 3407' },
];

// --------------------------------------------------------------- workflow

export const WORKFLOW = [
  { title: t('Define and measure the starting point', 'حدّد وقِس نقطة البداية'),
    do: t('Choose the tasks and a marking rubric. Save unseen questions and record the base model’s answers before any training.',
      'اختر المهام ومعيار التقييم. احفظ أسئلة لم يرها النموذج وسجّل إجابات النموذج الأساسي قبل أي تدريب.'),
    check: t('A baseline exists to compare against.', 'يوجد خط أساس للمقارنة.') },
  { title: t('Choose a supported model and environment', 'اختر نموذجًا مدعومًا وبيئة'),
    do: t('Check the exact model ID, revision, licence, tokenizer, chat template and Unsloth support. Pilot with a smaller model first.',
      'تحقق من معرّف النموذج الدقيق ونسخته وترخيصه ومقطِّعه وقالب محادثته ودعم Unsloth له. وجرّب أولًا بنموذج أصغر.'),
    check: t('GPU memory, software versions and storage are recorded.', 'ذاكرة GPU وإصدارات البرامج والتخزين مسجلة.') },
  { title: t('Prepare and validate the dataset', 'جهّز البيانات وتحقق منها'),
    do: t('Review sources, clean, split by source and check every JSONL line. Look at several rendered and tokenized examples.',
      'راجع المصادر ونظّف وقسّم حسب المصدر وافحص كل سطر JSONL. وانظر إلى عدة أمثلة بعد القالب والتقطيع.'),
    check: t('Dataset version and source groups are saved.', 'نسخة البيانات ومجموعات المصادر محفوظة.') },
  { title: t('Configure QLoRA', 'اضبط QLoRA'),
    do: t('Load the base in 4-bit, attach adapters to the chosen modules, set rank and scale.',
      'حمّل الأساس بدقة 4 بت، واربط المهايئات بالوحدات المختارة، وحدد الرتبة والمقياس.'),
    check: t('The trainable parameter count is printed and the base is frozen.', 'عدد المعاملات القابلة للتدريب مطبوع والأساس مجمَّد.') },
  { title: t('Run a short training check', 'شغّل تجربة تدريب قصيرة'),
    do: t('Train a few batches only.', 'درّب بضع دفعات فقط.'),
    check: t('It fits in memory, the loss is a real number, labels are right, only the adapters update. This proves it runs, not that it is good.',
      'يتسع في الذاكرة، والخسارة رقم حقيقي، والتسميات صحيحة، والمهايئات وحدها تُحدَّث. هذا يثبت أنه يعمل لا أنه جيد.') },
  { title: t('Train and monitor validation', 'درّب وراقب التحقق'),
    do: t('Run the full schedule with checkpoints. Watch training and validation loss, memory and sample answers.',
      'شغّل الجدول كاملًا مع نقاط حفظ. وراقب خسارة التدريب والتحقق والذاكرة وعينات من الإجابات.'),
    check: t('Stop if validation gets worse; keep a good earlier checkpoint.', 'توقف إذا ساء التحقق، واحتفظ بنقطة حفظ سابقة جيدة.') },
  { title: t('Evaluate and package', 'قيّم وجمّع'),
    do: t('Compare base and adapter on the same unseen questions and settings. Review errors with a subject expert.',
      'قارن الأساس والمهايئ على الأسئلة نفسها التي لم يرها النموذج وبالإعدادات نفسها. وراجع الأخطاء مع خبير في الموضوع.'),
    check: t('Adapter, configuration, model revision, tokenizer and report are saved together.', 'المهايئ والإعدادات ونسخة النموذج والمقطِّع والتقرير محفوظة معًا.') },
  { title: t('Deploy and reassess', 'انشر وأعد التقييم'),
    do: t('Load the exact matching base with the adapter. Add retrieval for source-backed answers.',
      'حمّل الأساس المطابق تمامًا مع المهايئ. وأضف الاسترجاع للإجابات المدعومة بالمصادر.'),
    check: t('Any change to sources, base revision or quantization means evaluating again.', 'أي تغيير في المصادر أو نسخة الأساس أو التكميم يعني إعادة التقييم.') },
];

/** Activity 3 from the notes: put the cards in a defensible order. */
export const ORDER_CARDS = [
  t('Prepare source-based examples', 'جهّز أمثلة مبنية على المصادر'),
  t('Load the 4-bit base', 'حمّل الأساس بدقة 4 بت'),
  t('Attach adapters', 'اربط المهايئات'),
  t('Train', 'درّب'),
  t('Evaluate on unseen questions', 'قيّم على أسئلة لم يرها النموذج'),
  t('Save the adapters', 'احفظ المهايئات'),
];
export const ORDER_SHUFFLE = [3, 5, 1, 4, 0, 2];

export const CRITERIA = [
  { name: t('Heritage accuracy', 'دقة المعلومة التراثية'), test: t('Do answers to unseen questions match the documented evidence?', 'هل تطابق إجابات الأسئلة الجديدة الأدلة الموثقة؟') },
  { name: t('Local language', 'اللغة المحلية'), test: t('Are Arabic and local terms used correctly and clearly?', 'هل تُستخدم العربية والمصطلحات المحلية بشكل صحيح وواضح؟') },
  { name: t('Uncertainty', 'عدم اليقين'), test: t('Does it say when evidence is missing, and mention variant accounts?', 'هل يقول متى يغيب الدليل ويذكر الروايات المختلفة؟') },
  { name: t('Generalization', 'التعميم'), test: t('Can it handle new wordings and sources it never saw?', 'هل يتعامل مع صياغات جديدة ومصادر لم يرها؟') },
  { name: t('Source handling', 'التعامل مع المصادر'), test: t('Are citations real, and do they support the claims?', 'هل الاستشهادات حقيقية وتدعم الادعاءات؟') },
  { name: t('General abilities', 'القدرات العامة'), test: t('Has it lost useful skills it had before?', 'هل فقد مهارات مفيدة كانت لديه؟') },
  { name: t('Operation', 'التشغيل'), test: t('Does it meet the measured memory and response-time needs?', 'هل يلبّي احتياجات الذاكرة وزمن الاستجابة المقيسة؟') },
];

export const PACKAGE = [
  { file: 'adapter_model.safetensors', what: t('The learned A and B numbers. The only file that holds what was learned.', 'أرقام A و B المتعلَّمة. الملف الوحيد الذي يحمل ما تعلّمه النموذج.') },
  { file: 'adapter_config.json', what: t('Rank, alpha, target modules and the base model’s name: how to plug the adapter back in.', 'الرتبة و alpha والوحدات المستهدفة واسم النموذج الأساسي: كيف يُعاد تركيب المهايئ.') },
  { file: 'tokenizer + chat_template', what: t('The exact tokenizer and template used in training. A different one changes the input.', 'المقطِّع والقالب نفسيهما المستخدمين في التدريب. واختلافهما يغيّر المدخل.') },
  { file: 'base: model ID + revision', what: t('The adapter is useless without its exact matching base model.', 'المهايئ بلا فائدة من دون نموذجه الأساسي المطابق تمامًا.') },
  { file: 'training settings', what: t('Learning rate, batch, epochs, seed, software versions: to repeat the run.', 'معدل التعلم والدفعة والحقب والبذرة وإصدارات البرامج: لتكرار التجربة.') },
  { file: 'data provenance', what: t('Which sources and dataset version were used, and how they were split.', 'أي المصادر ونسخة البيانات استُخدمت وكيف قُسّمت.') },
  { file: 'evaluation report', what: t('Base versus adapter on the same unseen questions.', 'الأساس مقابل المهايئ على الأسئلة الجديدة نفسها.') },
];

/** Statements to judge. Most are the common mistakes listed in the notes. */
export const MYTHS = [
  { claim: t('Open weight means the weights are frozen forever.', 'مفتوح الأوزان يعني أن الأوزان مجمَّدة إلى الأبد.'), fact: false,
    fix: t('Open weight is about access and licence. Freezing is a choice you make for one training run.', 'مفتوح الأوزان يتعلق بالإتاحة والترخيص. والتجميد خيار تتخذه لتجربة تدريب واحدة.') },
  { claim: t('Frozen weights do no work during training.', 'الأوزان المجمَّدة لا تعمل أثناء التدريب.'), fact: false,
    fix: t('They compute on every pass; only their values are not updated.', 'إنها تحسب في كل تمرير، لكن قيمها لا تُحدَّث.') },
  { claim: t('LoRA means using a low number of adapters.', 'LoRA تعني استخدام عدد قليل من المهايئات.'), fact: false,
    fix: t('It means Low-Rank Adaptation: the change is written as two thin matrices.', 'إنها تعني التكييف منخفض الرتبة: يُكتب التغيير كمصفوفتين رفيعتين.') },
  { claim: t('QLoRA compresses the model after training.', 'QLoRA تضغط النموذج بعد التدريب.'), fact: false,
    fix: t('In QLoRA the base is already 4-bit during adapter training. Quantizing after training is a different, also valid, path.', 'في QLoRA يكون الأساس بدقة 4 بت أثناء تدريب المهايئ. أما التكميم بعد التدريب فمسار آخر صحيح أيضًا.') },
  { claim: t('In QLoRA every calculation uses 4 bits.', 'في QLoRA يستخدم كل حساب 4 بتات.'), fact: false,
    fix: t('4 bits is how the base is stored. Weights are turned back into 16-bit (bfloat16) for the calculation, and the adapters train in 16-bit.', '4 بتات هي طريقة تخزين الأساس. تُعاد الأوزان إلى 16 بت (bfloat16) للحساب، وتتدرب المهايئات بدقة 16 بت.') },
  { claim: t('Unsloth is a different training method from LoRA.', 'Unsloth طريقة تدريب مختلفة عن LoRA.'), fact: false,
    fix: t('Unsloth is software that runs methods such as LoRA and QLoRA, faster and with less memory.', 'Unsloth برنامج ينفذ طرقًا مثل LoRA و QLoRA بسرعة أكبر وذاكرة أقل.') },
  { claim: t('A saved adapter can answer questions on its own.', 'المهايئ المحفوظ يستطيع الإجابة عن الأسئلة وحده.'), fact: false,
    fix: t('It needs its matching base model, unless you export a complete merged model.', 'يحتاج إلى نموذجه الأساسي المطابق، إلا إذا صدّرت نموذجًا مدموجًا كاملًا.') },
  { claim: t('If the file is valid JSONL, the dataset is good.', 'إذا كان الملف JSONL صحيحًا فالبيانات جيدة.'), fact: false,
    fix: t('JSONL is only a format. It says nothing about truth, coverage or balance.', 'JSONL مجرد صيغة. ولا تقول شيئًا عن الصحة أو الشمول أو التوازن.') },
  { claim: t('Quantization keeps the number of weights; pruning removes some.', 'التكميم يُبقي عدد الأوزان، والتقليم يحذف بعضها.'), fact: true,
    fix: t('Right. A 27B model quantized to 4-bit still has 27 billion weights; each just takes fewer bits.', 'صحيح. نموذج 27B المكمَّم إلى 4 بت ما زال فيه 27 مليار وزن، لكن كلًّا منها يأخذ بتات أقل.') },
  { claim: t('A lower training loss proves the model gives more accurate answers.', 'انخفاض خسارة التدريب يثبت أن النموذج يعطي إجابات أدق.'), fact: false,
    fix: t('It only shows a better fit to the training examples. Accuracy must be tested on unseen questions.', 'إنه يُظهر فقط ملاءمة أفضل لأمثلة التدريب. ويجب اختبار الدقة على أسئلة لم يرها النموذج.') },
];

/** Extra quiz questions drawn from the notes. */
export const EXTRA_QUIZ = [
  { ask: t('What does the “Lo-R-A” in LoRA stand for?', 'إلامَ تشير الأحرف في LoRA؟'),
    options: [t('Low-Rank Adaptation', 'التكييف منخفض الرتبة'), t('Low number of Adapters', 'عدد قليل من المهايئات'), t('Long Range Attention', 'انتباه بعيد المدى')],
    right: 0, why: t('The change to W is written as two thin matrices, so it has a low rank.', 'التغيير على W يُكتب كمصفوفتين رفيعتين، فتكون رتبته منخفضة.') },
  { ask: t('What is JSONL?', 'ما هي JSONL؟'),
    options: [t('A training method', 'طريقة تدريب'), t('A file with one complete JSON object per line', 'ملف فيه كائن JSON كامل في كل سطر'), t('A type of model layer', 'نوع من طبقات النموذج')],
    right: 1, why: t('It is a storage format. Each line is one training record.', 'إنها صيغة تخزين. وكل سطر سجل تدريب واحد.') },
  { ask: t('A batch of 2, gradient accumulation of 8, one GPU. What is the effective batch?', 'دفعة 2 وتجميع تدرجات 8 وبطاقة GPU واحدة. ما الدفعة الفعلية؟'),
    options: [t('10', '10'), t('16', '16'), t('2', '2')],
    right: 1, why: t('2 × 8 × 1 = 16 examples per update.', '2 × 8 × 1 = 16 مثالًا لكل تحديث.') },
  { ask: t('A 1,000 × 1,000 matrix gets a rank-8 adapter. How many numbers train?', 'مصفوفة 1,000 × 1,000 حصلت على مهايئ برتبة 8. كم رقمًا يتدرب؟'),
    options: [t('1,000,000', '1,000,000'), t('8,000', '8,000'), t('16,000', '16,000')],
    right: 2, why: t('A is 8 × 1,000 and B is 1,000 × 8: 8,000 + 8,000 = 16,000, which is 1.6% of the matrix.', 'A أبعادها 8 × 1,000 و B أبعادها 1,000 × 8: ‏8,000 + 8,000 = 16,000، أي 1.6٪ من المصفوفة.') },
  { ask: t('Which is true about frozen weights?', 'أي العبارات صحيحة عن الأوزان المجمَّدة؟'),
    options: [t('They are skipped in the forward pass.', 'تُتخطّى في التمرير الأمامي.'), t('They still calculate, but are not updated.', 'ما زالت تحسب لكنها لا تُحدَّث.'), t('They are deleted to save memory.', 'تُحذف لتوفير الذاكرة.')],
    right: 1, why: t('Frozen means not updated. It does not mean inactive.', 'المجمَّد يعني أنه لا يُحدَّث، ولا يعني أنه لا يعمل.') },
  { ask: t('In transfer learning for a plant classifier, what is trained first?', 'في التعلم بالنقل لمصنِّف نباتات، ما الذي يُدرَّب أولًا؟'),
    options: [t('The whole CNN from random weights', 'شبكة CNN كاملة من أوزان عشوائية'), t('A new head, with the body frozen', 'رأس جديد، مع تجميد الجسم'), t('Only the first convolution layer', 'أول طبقة التفافية فقط')],
    right: 1, why: t('The ImageNet body already finds useful features; the new head learns to map them to the species. Top blocks are unfrozen later, slowly.', 'جسم ImageNet يجد مسبقًا سمات مفيدة، والرأس الجديد يتعلم ربطها بالأنواع. وتُفك الكتل العليا لاحقًا ببطء.') },
  { ask: t('Photos of the same tree end up in both training and test. What happens?', 'انتهت صور الشجرة نفسها في التدريب والاختبار معًا. ماذا يحدث؟'),
    options: [t('The test score is too optimistic', 'تصبح درجة الاختبار متفائلة أكثر من اللازم'), t('Training becomes slower', 'يصبح التدريب أبطأ'), t('Nothing, more data is better', 'لا شيء، فالبيانات الأكثر أفضل')],
    right: 0, why: t('This is leakage: the test measures memory of near-identical photos. Split by tree or observation.', 'هذا تسرّب: يقيس الاختبار حفظ صور شبه متطابقة. فقسّم حسب الشجرة أو المشاهدة.') },
];
