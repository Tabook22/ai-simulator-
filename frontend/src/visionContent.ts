/**
 * Content for the two parts built from the UTAS-70 student project (a Dhofar native-plant
 * assistant): fine-tuning a vision model with transfer learning, and the whole project as a
 * worked example of joining a CNN classifier, a knowledge base and a QLoRA fine-tuned model.
 *
 * Species records and all scores here are illustrations for the lesson, not the project's
 * results: in the real project every fact comes from the team's references, with a page.
 */
import type { Text } from './finetuneContent';

const t = (en: string, ar: string): Text => ({ en, ar });

// ------------------------------------------------------------------ species

export interface Species { key: string; latin: string; name: Text; family: string; color: string }

/** The example classes the lesson uses. Two of them (frankincense and myrrh) look alike on purpose. */
export const SPECIES: Species[] = [
  { key: 'boswellia', latin: 'Boswellia sacra', name: t('Frankincense tree', 'شجرة اللبان'), family: 'Burseraceae', color: '#ffc46b' },
  { key: 'commiphora', latin: 'Commiphora sp.', name: t('Myrrh', 'المُرّ'), family: 'Burseraceae', color: '#ff8f6b' },
  { key: 'adansonia', latin: 'Adansonia digitata', name: t('Baobab', 'التبلدي (الباوباب)'), family: 'Malvaceae', color: '#5ef2a0' },
  { key: 'adenium', latin: 'Adenium obesum', name: t('Desert rose', 'وردة الصحراء'), family: 'Apocynaceae', color: '#ff8fd0' },
  { key: 'aloe', latin: 'Aloe dhufarensis', name: t('Dhofar aloe', 'صبر ظفار'), family: 'Asphodelaceae', color: '#5ee7ff' },
  { key: 'ficus', latin: 'Ficus sycomorus', name: t('Sycamore fig', 'الجمّيز'), family: 'Moraceae', color: '#a78bfa' },
];

// ------------------------------------------------- fine-tuning a CNN, step by step

export const TRANSFER_STEPS = [
  { title: t('A CNN already trained on ImageNet', 'شبكة CNN مدرَّبة مسبقًا على ImageNet'),
    text: t('Start from a convolutional neural network (CNN) trained on ImageNet: about 1.2 million photos in 1,000 everyday classes. Its early layers learned edges and colours, the middle layers textures and shapes, and the late layers whole parts such as leaves, petals and bark.',
      'ابدأ من شبكة عصبية التفافية (CNN) مدرَّبة على ImageNet: نحو 1.2 مليون صورة في 1,000 فئة يومية. تعلمت طبقاتها الأولى الحواف والألوان، والوسطى الملمس والأشكال، والأخيرة أجزاء كاملة مثل الأوراق والبتلات واللحاء.') },
  { title: t('Freeze the body: it becomes a feature extractor', 'جمّد الجسم: يصبح مستخرِجًا للسمات'),
    text: t('The convolutional body is frozen. It still runs on every photo, but its weights are not updated. This is the same idea as the frozen base model in LoRA: keep what was learned, add something small on top.',
      'يُجمَّد الجسم الالتفافي. فهو ما زال يعمل على كل صورة، لكن أوزانه لا تُحدَّث. وهي الفكرة نفسها للنموذج الأساسي المجمَّد في LoRA: احتفظ بما تعلّمه، وأضف شيئًا صغيرًا فوقه.') },
  { title: t('Replace the head: 1,000 classes → 6 species', 'استبدل الرأس: 1,000 فئة ← 6 أنواع'),
    text: t('The last layer (the head) chose between 1,000 ImageNet classes. It is removed and replaced by a new layer with one output per Dhofar species. The new head starts with random weights.',
      'كانت الطبقة الأخيرة (الرأس) تختار بين 1,000 فئة من ImageNet. فتُزال وتُستبدل بطبقة جديدة لها مخرج واحد لكل نوع من نباتات ظفار. ويبدأ الرأس الجديد بأوزان عشوائية.') },
  { title: t('Prepare every photo the same way', 'جهّز كل صورة بالطريقة نفسها'),
    text: t('Each photo is resized to 224 × 224 pixels and normalized with the ImageNet mean and standard deviation, because that is what the body was trained on. Training photos are also augmented: turned, flipped, zoomed, made brighter or darker.',
      'تُغيَّر أبعاد كل صورة إلى 224 × 224 بكسل وتُوحَّد قيمها بمتوسط ImageNet وانحرافه المعياري، لأن الجسم دُرّب على ذلك. وتُعدَّل صور التدريب أيضًا (زيادة البيانات): تدوير وقلب وتكبير وزيادة الإضاءة أو خفضها.') },
  { title: t('Stage 1: train only the new head', 'المرحلة 1: درّب الرأس الجديد وحده'),
    text: t('The loss (cross-entropy) compares the predicted species with the label. The gradient stops at the frozen body, so only the head learns. A normal learning rate (about 0.001) and a few epochs are enough.',
      'تقارن الخسارة (الإنتروبيا المتقاطعة) النوع المتوقع بالتسمية الصحيحة. ويتوقف التدرّج عند الجسم المجمَّد، فلا يتعلم إلا الرأس. ويكفي معدل تعلم عادي (نحو 0.001) وبضع حقب.') },
  { title: t('Stage 2: unfreeze the top blocks, learn slowly', 'المرحلة 2: فكّ تجميد الكتل العليا وتعلّم ببطء'),
    text: t('Now the top blocks are unfrozen and trained together with the head, with a much smaller learning rate (about 0.00001) so the useful ImageNet features are only adjusted, not destroyed. Early stopping ends training when the validation loss stops falling.',
      'الآن تُفك الكتل العليا وتُدرَّب مع الرأس، بمعدل تعلم أصغر بكثير (نحو 0.00001) حتى تُعدَّل سمات ImageNet المفيدة ولا تُهدم. ويُنهي الإيقاف المبكر التدريب حين تتوقف خسارة التحقق عن الانخفاض.') },
  { title: t('Predict: top three species and a confidence', 'التنبؤ: أعلى ثلاثة أنواع ونسبة الثقة'),
    text: t('Softmax turns the head’s outputs into probabilities that add up to 100%. The app shows the top three. If the best one is below the confidence threshold, the honest answer is “not recognized, please send a clearer photo”.',
      'تحوّل دالة softmax مخرجات الرأس إلى احتمالات مجموعها 100٪. ويعرض التطبيق أعلى ثلاثة. وإذا كان أفضلها دون عتبة الثقة، فالإجابة الأمينة هي “لم يُتعرَّف عليه، أرسل صورة أوضح”.') },
];

/** Fine-tuning a CNN beside fine-tuning a language model: the same idea, different parts. */
export const TWO_TUNINGS: { topic: Text; cnn: Text; llm: Text }[] = [
  { topic: t('Starts from', 'يبدأ من'),
    cnn: t('A CNN pre-trained on ImageNet (MobileNetV2, EfficientNet-B0, ResNet50)', 'شبكة CNN مدرَّبة مسبقًا على ImageNet (MobileNetV2 و EfficientNet-B0 و ResNet50)'),
    llm: t('An open-weight language model (Qwen3.8-27B)', 'نموذج لغوي مفتوح الأوزان (Qwen3.8-27B)') },
  { topic: t('What stays frozen', 'ما يبقى مجمَّدًا'),
    cnn: t('The convolutional body (all of it in stage 1, the lower blocks in stage 2)', 'الجسم الالتفافي (كله في المرحلة 1، والكتل السفلى في المرحلة 2)'),
    llm: t('Every weight of the base model, stored in 4-bit', 'كل أوزان النموذج الأساسي، مخزنة بدقة 4 بت') },
  { topic: t('What is trained', 'ما يُدرَّب'),
    cnn: t('A new head (one output per species), then the top blocks', 'رأس جديد (مخرج لكل نوع)، ثم الكتل العليا'),
    llm: t('Small LoRA adapters A and B added beside the frozen matrices', 'مهايئات LoRA صغيرة A و B مضافة بجانب المصفوفات المجمَّدة') },
  { topic: t('Share of numbers trained', 'نسبة الأرقام المدرَّبة'),
    cnn: t('Head only: well under 1% of the network', 'الرأس وحده: أقل بكثير من 1٪ من الشبكة'),
    llm: t('Usually around 0.5–2% of the model', 'عادة نحو 0.5–2٪ من النموذج') },
  { topic: t('Training data', 'بيانات التدريب'),
    cnn: t('Labelled photos: one folder per species, 100–150+ photos each', 'صور موسومة: مجلد لكل نوع، 100–150 صورة أو أكثر لكل منها'),
    llm: t('JSONL lines: instruction → response, written from the sources', 'أسطر JSONL: تعليمات ← إجابة، مكتوبة من المصادر') },
  { topic: t('Loss', 'الخسارة'),
    cnn: t('Cross-entropy over the species classes', 'الإنتروبيا المتقاطعة على فئات الأنواع'),
    llm: t('Cross-entropy over the next token of the answer', 'الإنتروبيا المتقاطعة على الرمز التالي في الإجابة') },
  { topic: t('Typical learning rate', 'معدل التعلم المعتاد'),
    cnn: t('About 1e-3 for the head, then about 1e-5 for the unfrozen blocks', 'نحو 1e-3 للرأس، ثم نحو 1e-5 للكتل المفكوكة'),
    llm: t('About 2e-4 for the LoRA adapters', 'نحو 2e-4 لمهايئات LoRA') },
  { topic: t('Output', 'المخرج'),
    cnn: t('One species and a confidence (a probability)', 'نوع واحد ونسبة ثقة (احتمال)'),
    llm: t('A written answer, token by token', 'إجابة مكتوبة، رمزًا بعد رمز') },
  { topic: t('How it is judged', 'كيف يُقيَّم'),
    cnn: t('Accuracy, precision, recall, F1, confusion matrix', 'الدقة الكلية والضبط والاستدعاء و F1 ومصفوفة الالتباس'),
    llm: t('Factual accuracy, relevance, hallucination, consistency, judged by people', 'دقة الحقائق والصلة والهلوسة والاتساق، بحكم بشري') },
  { topic: t('Hardware', 'العتاد'),
    cnn: t('A free 16 GB cloud GPU is plenty', 'بطاقة GPU سحابية مجانية بـ 16 غ.ب تكفي وتزيد'),
    llm: t('A 27B model in 4-bit needs about 24 GB', 'نموذج 27B بدقة 4 بت يحتاج إلى نحو 24 غ.ب') },
];

/** The three candidate backbones. Parameter counts and ImageNet top-1 are torchvision's published figures. */
export const BACKBONES = [
  { key: 'mobilenet', name: 'MobileNetV2', total: 3_504_872, features: 1280, top1: 71.9, gflops: 0.30,
    note: t('Smallest and fastest; built for phones.', 'الأصغر والأسرع؛ صُمّمت للهواتف.') },
  { key: 'efficientnet', name: 'EfficientNet-B0', total: 5_288_548, features: 1280, top1: 77.7, gflops: 0.39,
    note: t('Most accurate on ImageNet for its small size.', 'الأدق على ImageNet بالنسبة لحجمها الصغير.') },
  { key: 'resnet', name: 'ResNet50', total: 25_557_032, features: 2048, top1: 76.1, gflops: 4.09,
    note: t('Larger and slower; a classic, strong baseline.', 'أكبر وأبطأ؛ خط أساس كلاسيكي قوي.') },
] as const;

/** Mean and standard deviation of ImageNet photos, per colour channel. */
export const IMAGENET_MEAN = [0.485, 0.456, 0.406];
export const IMAGENET_STD = [0.229, 0.224, 0.225];

// --------------------------------------------------------- evaluation examples

/** Rows are the true species, columns the predicted one. Illustrative test results for four species. */
export const MATRIX_SPECIES = ['boswellia', 'commiphora', 'adansonia', 'adenium'];
export const MATRIX = [
  [26, 3, 0, 1],
  [5, 22, 1, 2],
  [0, 1, 28, 1],
  [1, 1, 0, 28],
];

/** Example predictions for the threshold tool: the classifier's best guess and its confidence. */
export const PREDICTIONS: { id: number; truth: string | null; guess: string; confidence: number }[] = [
  { id: 1, truth: 'boswellia', guess: 'boswellia', confidence: 0.97 },
  { id: 2, truth: 'adansonia', guess: 'adansonia', confidence: 0.94 },
  { id: 3, truth: 'adenium', guess: 'adenium', confidence: 0.91 },
  { id: 4, truth: 'aloe', guess: 'aloe', confidence: 0.88 },
  { id: 5, truth: null, guess: 'aloe', confidence: 0.83 },
  { id: 6, truth: 'commiphora', guess: 'commiphora', confidence: 0.79 },
  { id: 7, truth: 'ficus', guess: 'ficus', confidence: 0.74 },
  { id: 8, truth: 'commiphora', guess: 'boswellia', confidence: 0.66 },
  { id: 9, truth: 'boswellia', guess: 'boswellia', confidence: 0.61 },
  { id: 10, truth: null, guess: 'adenium', confidence: 0.55 },
  { id: 11, truth: 'adenium', guess: 'commiphora', confidence: 0.47 },
  { id: 12, truth: null, guess: 'ficus', confidence: 0.38 },
];

// --------------------------------------------------------------- the project

export const PROJECT = {
  problem: t('Knowledge about Dhofar’s native plants is spread over botanical books and studies, and general chatbots and plant apps know little about them.',
    'المعرفة بنباتات ظفار المحلية موزعة على كتب النبات والدراسات، وروبوتات المحادثة العامة وتطبيقات النباتات لا تعرف عنها إلا القليل.'),
  idea: t('Three parts: YOLO names the plant in the photo (eyes), the name searches a RAG digital archive of all the references (memory), and a QLoRA fine-tuned Qwen writes a sourced answer in Arabic or English (brain).',
    'ثلاثة أجزاء: يسمّي YOLO النبات في الصورة (العينان)، ويبحث الاسم في أرشيف رقمي RAG لكل المراجع (الذاكرة)، ويكتب Qwen المضبوط بـ QLoRA إجابة موثقة بالعربية أو الإنجليزية (الدماغ).'),
  scope: t('Phase 1 is a proof of concept: a selected set of Dhofar species. Phase 2 adds other regions of Oman by repeating the data steps, without changing the code.',
    'المرحلة 1 إثبات مفهوم: مجموعة مختارة من أنواع ظفار. وتضيف المرحلة 2 مناطق عُمان الأخرى بتكرار خطوات البيانات، دون تغيير الشيفرة.'),
};

/** Each research question with its hypothesis and the test that answers it. */
export const QUESTIONS: { key: string; question: Text; hypothesis: Text; test: Text; part: number }[] = [
  { key: 'RQ1', part: 6,
    question: t('Does a QLoRA fine-tuned Qwen answer Dhofar plant questions more accurately, with fewer hallucinations, than the same base model?',
      'هل يجيب Qwen المضبوط بـ QLoRA عن أسئلة نباتات ظفار بدقة أكبر وهلوسة أقل من النموذج الأساسي نفسه؟'),
    hypothesis: t('H1: the fine-tuned model is more accurate, relevant and consistent.', 'H1: النموذج المضبوط أدق وأوثق صلة وأكثر اتساقًا.'),
    test: t('About 100 held-out questions, asked to the base model, the fine-tuned model, and the fine-tuned model with RAG.', 'نحو 100 سؤال محجوز، تُطرح على النموذج الأساسي والنموذج المضبوط والنموذج المضبوط مع RAG.') },
  { key: 'RQ2', part: 13,
    question: t('Can a YOLO model fine-tuned with transfer learning identify the selected species from user photos?',
      'هل يستطيع نموذج YOLO مضبوط بالتعلم بالنقل أن يتعرف على الأنواع المختارة من صور المستخدمين؟'),
    hypothesis: t('H2: accuracy comparable to the roughly 90% reported for regional flora.', 'H2: دقة قريبة من نحو 90٪ المذكورة للنباتات الإقليمية.'),
    test: t('Held-out test photos once, at the end: accuracy, precision, recall, macro F1, confusion matrix, rejection of unknown plants.', 'صور الاختبار المحجوزة مرة واحدة في النهاية: الدقة الكلية والضبط والاستدعاء و F1 الكلي ومصفوفة الالتباس ورفض النباتات المجهولة.') },
  { key: 'RQ3', part: 11,
    question: t('Can the name from YOLO, searched in the RAG archive, lead straight to the right botanical information in one conversation?',
      'هل يقود الاسم القادم من YOLO، بعد البحث عنه في أرشيف RAG، مباشرة إلى المعلومة النباتية الصحيحة في محادثة واحدة؟'),
    hypothesis: t('H3: photo → reliable answer is easier than searching books or general tools.', 'H3: من الصورة إلى إجابة موثوقة أسهل من البحث في الكتب أو الأدوات العامة.'),
    test: t('End-to-end: test photos with a follow-up question each; correct species and answer rate, response time; 5–10 student users.', 'من البداية إلى النهاية: صور اختبار مع سؤال متابعة لكل منها؛ نسبة صحة النوع والإجابة، وزمن الاستجابة؛ و 5–10 طلاب مستخدمين.') },
  { key: 'RQ4', part: 2,
    question: t('Can books and papers be turned into a JSONL instruction–response dataset good enough for fine-tuning?',
      'هل يمكن تحويل الكتب والأبحاث إلى بيانات JSONL من تعليمات وإجابات جيدة بما يكفي للضبط الدقيق؟'),
    hypothesis: t('H4: source-written pairs give enough coverage for common questions.', 'H4: الأزواج المكتوبة من المصادر تغطي الأسئلة الشائعة بما يكفي.'),
    test: t('Coverage of the question bank, every pair reviewed against its source and page.', 'تغطية بنك الأسئلة، مع مراجعة كل زوج مقابل مصدره وصفحته.') },
];

export type Track = 'plan' | 'text' | 'image' | 'join';

/** The twelve steps of the procedure. `parts` are the lab parts (0-based) that teach the step. */
export const PROCEDURE: { step: number; track: Track; name: Text; output: Text; detail: Text; critical?: boolean; parts: number[] }[] = [
  { step: 1, track: 'plan', parts: [9], name: t('Planning and scope', 'التخطيط والنطاق'),
    output: t('Species list, target scores, roles, schedule', 'قائمة الأنواع والدرجات المستهدفة والأدوار والجدول'),
    detail: t('Pick species that are documented in the references, have enough photos, and include some look-alikes. Fix the targets before collecting data, so success cannot be redefined later.',
      'اختر أنواعًا موثقة في المراجع، ولها صور كافية، وبينها أنواع متشابهة. وحدّد الأهداف قبل جمع البيانات، حتى لا يُعاد تعريف النجاح لاحقًا.') },
  { step: 2, track: 'text', critical: true, parts: [2], name: t('Collect botanical texts', 'جمع النصوص النباتية'),
    output: t('PDF library and source log', 'مكتبة PDF وسجل المصادر'),
    detail: t('Scan books at 300 dpi or more, keep the file names, and log title, authors, year, language, pages, species and usage terms for every source.',
      'امسح الكتب بدقة 300 نقطة في البوصة أو أكثر، واحتفظ بأسماء الملفات، وسجّل لكل مصدر العنوان والمؤلفين والسنة واللغة والصفحات والأنواع وشروط الاستخدام.') },
  { step: 3, track: 'text', critical: true, parts: [2, 11], name: t('Build the RAG digital archive', 'بناء الأرشيف الرقمي RAG'),
    output: t('Every reference as tagged passages in a searchable index', 'كل مرجع مقاطعَ موسومة في فهرس قابل للبحث'),
    detail: t('PyMuPDF for digital PDFs, Tesseract OCR (Arabic + English) for scans, then cleaning. Cut into passages, tag each with species, names, place, topic, source and page, embed with a multilingual model and index. Nothing is added from memory.',
      'PyMuPDF لملفات PDF الرقمية، و Tesseract OCR (عربي + إنجليزي) للصفحات الممسوحة، ثم التنظيف. قطّعها مقاطع، ووسم كلًّا بالنوع والأسماء والمكان والموضوع والمصدر والصفحة، وحوّلها إلى متجهات بنموذج متعدد اللغات وافهرسها. ولا يُضاف شيء من الذاكرة.') },
  { step: 4, track: 'text', critical: true, parts: [2, 10], name: t('Build the JSONL dataset', 'بناء بيانات JSONL'),
    output: t('Reviewed train / validation / test files', 'ملفات تدريب وتحقق واختبار مراجَعة'),
    detail: t('From about 20% of the references: question + passages → answer in the house style, rephrasings, and “not in the sources” answers; every pair checked by a person; a few hundred to about two thousand pairs.',
      'من نحو 20٪ من المراجع: سؤال + مقاطع ← إجابة بالأسلوب المعتمد، وصيغ بديلة، وإجابات “غير موجود في المصادر”؛ كل زوج يراجعه شخص؛ من بضع مئات إلى نحو ألفي زوج.') },
  { step: 5, track: 'image', parts: [13], name: t('Collect and label photos', 'جمع الصور ووسمها'),
    output: t('Labelled photos and a metadata sheet', 'صور موسومة وجدول بياناتها الوصفية'),
    detail: t('iNaturalist, GBIF and Wikimedia Commons plus the team’s own field photos; 100–150+ per species with different light, seasons, growth stages and plant parts; source, author, licence and place for each photo.',
      'iNaturalist و GBIF و Wikimedia Commons مع صور الفريق الميدانية؛ 100–150 صورة أو أكثر لكل نوع بإضاءة ومواسم ومراحل نمو وأجزاء نبات مختلفة؛ والمصدر والمصوّر والترخيص والمكان لكل صورة.') },
  { step: 6, track: 'image', parts: [13], name: t('Preprocess, split, augment', 'المعالجة والتقسيم والزيادة'),
    output: t('70 / 15 / 15 split by group, augmented training set, out-of-scope set', 'تقسيم 70 / 15 / 15 حسب المجموعة، ومجموعة تدريب مزيدة، ومجموعة خارج النطاق'),
    detail: t('For YOLO detection draw a box around each plant (one text label file per photo); for classification, one folder per species. Split before augmenting, keep photos of the same tree or photographer in one split.',
      'لكشف YOLO ارسم مربعًا حول كل نبات (ملف تسميات نصي لكل صورة)؛ وللتصنيف مجلد لكل نوع. وقسّم قبل الزيادة، وأبقِ صور الشجرة نفسها أو المصوّر نفسه في قسم واحد.') },
  { step: 7, track: 'image', parts: [13], name: t('Fine-tune YOLO', 'ضبط YOLO ضبطًا دقيقًا'),
    output: t('Chosen YOLO model, comparison with a CNN baseline, confidence threshold', 'نموذج YOLO المختار، ومقارنة بخط أساس CNN، وعتبة الثقة'),
    detail: t('Start from pretrained YOLO weights (transfer learning), compare sizes such as n, s and m with a CNN baseline under the same split; test set used once; threshold chosen on validation data.',
      'ابدأ من أوزان YOLO مدرَّبة مسبقًا (تعلم بالنقل)، وقارن أحجامًا مثل n و s و m بخط أساس CNN على التقسيم نفسه؛ مجموعة الاختبار تُستخدم مرة واحدة؛ والعتبة تُختار على بيانات التحقق.') },
  { step: 8, track: 'text', critical: true, parts: [6, 7, 8], name: t('Fine-tune the LLM with QLoRA', 'ضبط النموذج اللغوي بـ QLoRA'),
    output: t('The UTAS-70 adapter and an exported model', 'مهايئ UTAS-70 ونموذج مُصدَّر'),
    detail: t('Qwen3.8-27B loaded in 4-bit with Unsloth, LoRA rank 16, learning rate near 2e-4, 2–3 epochs, watching validation loss; free GPUs first, a rented GPU if needed.',
      'Qwen3.8-27B محمَّل بدقة 4 بت مع Unsloth، رتبة LoRA ‏16، ومعدل تعلم قرب 2e-4، و 2–3 حقب، مع مراقبة خسارة التحقق؛ بطاقات GPU مجانية أولًا، ومستأجرة عند الحاجة.') },
  { step: 9, track: 'join', critical: true, parts: [10], name: t('Join vision and language', 'ربط الرؤية واللغة'),
    output: t('Photo → YOLO name → RAG passages → fine-tuned answer', 'صورة ← اسم من YOLO ← مقاطع RAG ← إجابة النموذج المضبوط'),
    detail: t('Threshold check, archive search filtered by the species name, a prompt with the passages, the question and the answer rules; the species is remembered for follow-up questions.',
      'فحص العتبة، والبحث في الأرشيف مصفّى باسم النوع، وتلقين فيه المقاطع والسؤال وقواعد الإجابة؛ ويُتذكَّر النوع لأسئلة المتابعة.') },
  { step: 10, track: 'join', parts: [10], name: t('Web interface', 'واجهة الويب'),
    output: t('Upload, top three, information card, chat', 'رفع، وأعلى ثلاثة، وبطاقة معلومات، ومحادثة'),
    detail: t('Gradio or FastAPI; every answer shows its source and an “education only, not medical advice” notice; clear messages for missing or unsupported files.',
      'Gradio أو FastAPI؛ كل إجابة تعرض مصدرها وتنبيه “للتعليم فقط، وليست نصيحة طبية”؛ ورسائل واضحة للملفات المفقودة أو غير المدعومة.') },
  { step: 11, track: 'join', critical: true, parts: [9], name: t('Test and evaluate', 'الاختبار والتقييم'),
    output: t('Classifier, chatbot, end-to-end and usability results', 'نتائج المصنِّف وروبوت المحادثة والنظام كاملًا وسهولة الاستخدام'),
    detail: t('Each hypothesis has its own test (see the research questions). Consistency: the same question in three wordings.',
      'لكل فرضية اختبارها (انظر أسئلة البحث). والاتساق: السؤال نفسه بثلاث صيغ.') },
  { step: 12, track: 'join', parts: [9], name: t('Analysis and delivery', 'التحليل والتسليم'),
    output: t('Findings vs hypotheses, report, demo, Phase 2 plan', 'النتائج مقابل الفرضيات، والتقرير، والعرض، وخطة المرحلة 2'),
    detail: t('Answer RQ1–RQ4, list the limitations honestly, document both datasets with their licences, and leave a repository others can rerun.',
      'أجب عن RQ1–RQ4، واذكر القيود بأمانة، ووثّق مجموعتي البيانات مع تراخيصهما، واترك مستودعًا يستطيع غيرك إعادة تشغيله.') },
];

/** The four layers of the architecture, top to bottom. */
export const LAYERS: { name: Text; parts: Text; input: Text; output: Text; job: Text }[] = [
  { name: t('1 · Presentation', '1 · العرض'), parts: t('Web interface (Gradio / FastAPI)', 'واجهة الويب (Gradio / FastAPI)'),
    input: t('The user’s photo and question', 'صورة المستخدم وسؤاله'), output: t('Species, information card, answer with its source', 'النوع وبطاقة المعلومات والإجابة مع مصدرها'),
    job: t('What the user sees. It also shows the “education only” notice.', 'ما يراه المستخدم. ويعرض أيضًا تنبيه “للتعليم فقط”.') },
  { name: t('2 · Application', '2 · التطبيق'), parts: t('Integration module', 'وحدة الربط'),
    input: t('Photo, question, classifier result', 'الصورة والسؤال ونتيجة المصنِّف'), output: t('The prompt for the model and the final reply', 'التلقين للنموذج والرد النهائي'),
    job: t('The conductor: checks the threshold, sends the name to the archive, builds the prompt, remembers the species, handles errors.', 'قائد الفرقة: يفحص العتبة ويرسل الاسم إلى الأرشيف ويبني التلقين ويتذكر النوع ويعالج الأخطاء.') },
  { name: t('3 · AI models', '3 · نماذج الذكاء الاصطناعي'), parts: t('YOLO (eyes) + fine-tuned Qwen (brain)', 'YOLO (العينان) + Qwen المضبوط (الدماغ)'),
    input: t('A photo; a question with its passages', 'صورة؛ وسؤال مع مقاطعه'), output: t('Species + confidence; an answer from the passages', 'النوع + الثقة؛ وإجابة من المقاطع'),
    job: t('Two separately fine-tuned models: one sees, one writes.', 'نموذجان مضبوطان كلٌّ على حدة: أحدهما يرى والآخر يكتب.') },
  { name: t('4 · Knowledge (memory)', '4 · المعرفة (الذاكرة)'), parts: t('RAG digital archive: tagged passages, vector index, name index', 'الأرشيف الرقمي RAG: مقاطع موسومة وفهرس متجهات وفهرس أسماء'),
    input: t('A species name (Latin, Arabic or local) + the question', 'اسم نوع (لاتيني أو عربي أو محلي) + السؤال'), output: t('The top passages with their sources', 'أفضل المقاطع مع مصادرها'),
    job: t('Holds all the references. Adding a book is adding data: nothing is retrained.', 'يحفظ كل المراجع. وإضافة كتاب إضافةُ بيانات: لا يُعاد تدريب شيء.') },
];

// ------------------------------------------------------- species record → JSONL

export interface RecordField { key: string; label: Text; value: Text | null; ask: Text; answer: Text }

/** An illustrative record in the shape of the project's knowledge base. */
export const RECORD: { latin: string; source: string; fields: RecordField[] } = {
  latin: 'Boswellia sacra',
  source: 'Source A, p. __',
  fields: [
    { key: 'family', label: t('Family', 'الفصيلة'), value: t('Burseraceae', 'Burseraceae (الفصيلة البخورية)'),
      ask: t('Which plant family does the frankincense tree belong to?', 'إلى أي فصيلة نباتية تنتمي شجرة اللبان؟'),
      answer: t('The frankincense tree (Boswellia sacra) belongs to the family Burseraceae.', 'تنتمي شجرة اللبان (Boswellia sacra) إلى الفصيلة البخورية (Burseraceae).') },
    { key: 'names', label: t('Arabic and local names', 'الأسماء العربية والمحلية'), value: t('Luban (اللبان)', 'اللبان'),
      ask: t('What is the frankincense tree called in Arabic?', 'ما اسم شجرة اللبان بالعربية؟'),
      answer: t('In Arabic it is called al-luban (اللبان).', 'تُسمى بالعربية اللبان.') },
    { key: 'description', label: t('Description', 'الوصف'), value: t('A small tree with papery, peeling bark; its resin oozes from cuts in the bark.', 'شجرة صغيرة لحاؤها رقيق متقشر كالورق، ويسيل راتنجها من الجروح في اللحاء.'),
      ask: t('What does the frankincense tree look like?', 'كيف تبدو شجرة اللبان؟'),
      answer: t('It is a small tree with papery, peeling bark; its resin oozes from cuts in the bark.', 'هي شجرة صغيرة لحاؤها رقيق متقشر كالورق، ويسيل راتنجها من الجروح في اللحاء.') },
    { key: 'habitat', label: t('Habitat', 'الموطن'), value: t('Dry slopes and plains, mostly beyond the reach of the monsoon mist.', 'المنحدرات والسهول الجافة، وأغلبها خارج نطاق ضباب الخريف.'),
      ask: t('Where does the frankincense tree grow in Dhofar?', 'أين تنمو شجرة اللبان في ظفار؟'),
      answer: t('In Dhofar it grows on dry slopes and plains, mostly beyond the reach of the monsoon mist.', 'تنمو في ظفار على المنحدرات والسهول الجافة، وأغلبها خارج نطاق ضباب الخريف.') },
    { key: 'season', label: t('Season', 'الموسم'), value: null,
      ask: t('When does the frankincense tree flower?', 'متى تُزهر شجرة اللبان؟'),
      answer: t('My sources do not give the flowering season of the frankincense tree.', 'لا تذكر مصادري موسم إزهار شجرة اللبان.') },
    { key: 'uses', label: t('Uses', 'الاستخدامات'), value: t('Its resin is burned as incense and used in traditional practices.', 'يُحرق راتنجها بخورًا ويُستخدم في الممارسات التقليدية.'),
      ask: t('What is the frankincense tree used for?', 'فيمَ تُستخدم شجرة اللبان؟'),
      answer: t('Its resin is burned as incense and used in traditional practices. This is for education only, not medical advice.', 'يُحرق راتنجها بخورًا ويُستخدم في الممارسات التقليدية. وهذه المعلومة للتعليم فقط، وليست نصيحة طبية.') },
  ],
};

export type PairKind = 'field' | 'context' | 'missing';

// ----------------------------------------------------- chatbot evaluation

export const EVAL_QUESTION = t('Where does the frankincense tree grow in Dhofar?', 'أين تنمو شجرة اللبان في ظفار؟');

/** Illustrative answers from the three configurations the project compares, with reviewer marks. */
export const CONFIGS: { key: string; name: Text; answer: Text; scores: [number, number, number]; note: Text }[] = [
  { key: 'base', name: t('Base Qwen, no fine-tuning', 'Qwen الأساسي دون ضبط'),
    answer: t('Frankincense grows across the Arabian Peninsula and the Horn of Africa, often in sandy deserts and coastal areas.', 'ينمو اللبان في أنحاء شبه الجزيرة العربية والقرن الأفريقي، غالبًا في الصحاري الرملية والمناطق الساحلية.'),
    scores: [1, 1, 0], note: t('General and partly wrong for Dhofar; no source.', 'عامة وخاطئة جزئيًا بالنسبة لظفار؛ ودون مصدر.') },
  { key: 'tuned', name: t('Fine-tuned UTAS-70', 'UTAS-70 المضبوط'),
    answer: t('In Dhofar, the frankincense tree grows on dry slopes and plains, mostly away from the monsoon mist.', 'في ظفار تنمو شجرة اللبان على المنحدرات والسهول الجافة، وأغلبها بعيدًا عن ضباب الخريف.'),
    scores: [2, 2, 1], note: t('The right facts and tone, but it cannot show where they came from.', 'الحقائق والنبرة صحيحة، لكنه لا يستطيع أن يبيّن مصدرها.') },
  { key: 'record', name: t('Fine-tuned + RAG archive', 'المضبوط + أرشيف RAG'),
    answer: t('In Dhofar, the frankincense tree grows on dry slopes and plains, mostly beyond the reach of the monsoon mist. (Source A, p. __)', 'في ظفار تنمو شجرة اللبان على المنحدرات والسهول الجافة، وأغلبها خارج نطاق ضباب الخريف. (المصدر A، ص __)'),
    scores: [2, 2, 2], note: t('Answers from the retrieved passage and cites it: accurate and traceable.', 'يجيب من المقطع المسترجع ويستشهد به: دقيق ويمكن تتبعه.') },
];
export const SCORE_NAMES = [t('Accuracy', 'الدقة'), t('Relevance', 'الصلة'), t('Traceable', 'قابل للتتبع')];

// ----------------------------------------------- a guide for the next project

export const GUIDE: { title: Text; text: Text; part?: number }[] = [
  { part: 9, title: t('Fix the targets before the data', 'حدّد الأهداف قبل البيانات'),
    text: t('Write the species list, the target scores and the test plan in step 1. Each research question should already have its test.', 'اكتب قائمة الأنواع والدرجات المستهدفة وخطة الاختبار في الخطوة 1. ويجب أن يكون لكل سؤال بحثي اختباره منذ البداية.') },
  { part: 2, title: t('One key joins everything', 'مفتاح واحد يربط كل شيء'),
    text: t('Use the scientific name as the YOLO class name and as the species tag on every archive passage. Then a prediction finds its passages with no guessing.', 'استخدم الاسم العلمي اسمًا لفئة YOLO ووسمًا للنوع على كل مقطع في الأرشيف. فيجد التنبؤ مقاطعه دون تخمين.') },
  { part: 2, title: t('No fact from memory', 'لا حقيقة من الذاكرة'),
    text: t('Every fact carries its source and page; an empty field stays empty. The model can only be as true as its data.', 'كل حقيقة تحمل مصدرها وصفحتها، والحقل الفارغ يبقى فارغًا. فالنموذج لا يكون أصدق من بياناته.') },
  { part: 10, title: t('Train in the shape you will use', 'درّب بالشكل الذي ستستخدمه'),
    text: t('At answer time the model receives the retrieved passages as context. So include them in the training lines too (question + passages → answer), not only question → answer, and add lines where the passages lack the answer.', 'وقت الإجابة يتلقى النموذج المقاطع المسترجعة سياقًا. فضمّنها في أسطر التدريب أيضًا (سؤال + مقاطع ← إجابة)، لا سؤال ← إجابة فقط، وأضف أسطرًا تخلو فيها المقاطع من الإجابة.') },
  { part: 10, title: t('Facts in the archive, style in the weights', 'الحقائق في الأرشيف، والأسلوب في الأوزان'),
    text: t('Fine-tune on a slice of the references to teach how to answer; keep every reference, that slice included, in the RAG archive. Then every fact can be cited and updated without retraining.', 'اضبط على شريحة من المراجع لتعليم طريقة الإجابة، واحفظ كل المراجع، ومنها تلك الشريحة، في أرشيف RAG. فتصبح كل حقيقة قابلة للاستشهاد والتحديث دون إعادة تدريب.') },
  { part: 13, title: t('Split by group, then augment', 'قسّم حسب المجموعة، ثم زِد البيانات'),
    text: t('Photos of the same tree, day or photographer stay in one split, and only the training set is augmented. Otherwise the test score is too good to be true.', 'صور الشجرة نفسها أو اليوم نفسه أو المصوّر نفسه تبقى في قسم واحد، ولا تُزاد إلا مجموعة التدريب. وإلا كانت درجة الاختبار أفضل من أن تُصدَّق.') },
  { part: 13, title: t('A threshold is not a detector', 'العتبة ليست كاشفًا'),
    text: t('Softmax always picks one of the known species, even for a plant it has never seen. Keep an out-of-scope test set and report how many unknown plants are correctly rejected.', 'تختار softmax دائمًا أحد الأنواع المعروفة، حتى لنبات لم تره قط. فاحتفظ بمجموعة اختبار خارج النطاق، وأبلغ عن عدد النباتات المجهولة المرفوضة بشكل صحيح.') },
  { part: 6, title: t('Check that the GPU really fits', 'تأكد أن بطاقة GPU تتسع فعلًا'),
    text: t('Add up base weights, adapters and working memory before planning on a free GPU. Pilot on a small Qwen first, then train the large one on a GPU that fits.', 'اجمع الأوزان الأساسية والمهايئات وذاكرة العمل قبل التخطيط على بطاقة مجانية. وجرّب أولًا على Qwen صغير، ثم درّب الكبير على بطاقة تتسع له.') },
  { part: 9, title: t('Compare three systems, not two', 'قارن ثلاثة أنظمة لا اثنين'),
    text: t('Base model, fine-tuned model, and fine-tuned model with RAG, on the same unseen questions. Only then can you say what each part adds.', 'النموذج الأساسي والمضبوط والمضبوط مع RAG، على الأسئلة الجديدة نفسها. عندها فقط تستطيع أن تقول ماذا يضيف كل جزء.') },
  { part: 9, title: t('Name things the same everywhere', 'سمِّ الأشياء بالاسم نفسه في كل مكان'),
    text: t('Use the same model name, version and settings in the review, the method, the code and the results, so a reader can rerun exactly what you did.', 'استخدم اسم النموذج وإصداره وإعداداته نفسها في المراجعة والمنهجية والشيفرة والنتائج، حتى يستطيع القارئ إعادة ما فعلته بالضبط.') },
  { title: t('Safety is part of the design', 'السلامة جزء من التصميم'),
    text: t('A plant assistant must say it is for education, not for medicinal or safety decisions, and refuse to guess about edibility or treatment.', 'يجب أن يقول مساعد النباتات إنه للتعليم، لا لقرارات طبية أو قرارات سلامة، وأن يرفض التخمين في صلاحية الأكل أو العلاج.') },
  { title: t('Leave it rerunnable', 'اتركه قابلًا لإعادة التشغيل'),
    text: t('Fixed seeds, saved settings, licences for every photo, and species, paths and models in configuration files, so Phase 2 adds data, not code.', 'بذور ثابتة، وإعدادات محفوظة، وتراخيص لكل صورة، والأنواع والمسارات والنماذج في ملفات إعداد، فتضيف المرحلة 2 بيانات لا شيفرة.') },
];

// ------------------------------------- the three-part system: eyes, memory, brain

export type PartKey = 'eyes' | 'memory' | 'brain';

/** The three parts of the plant assistant, each trained or built from different data. */
export const BRAINS: { key: PartKey; name: Text; tool: string; job: Text; learns: Text; input: Text; output: Text; test: Text; without: Text }[] = [
  { key: 'eyes', name: t('Eyes · computer vision', 'العينان · الرؤية الحاسوبية'), tool: 'YOLO',
    job: t('Finds the plant in the photo and names its species, with a confidence.', 'يجد النبات في الصورة ويسمّي نوعه، مع درجة ثقة.'),
    learns: t('Labelled photos: a folder per species (classify) or a box around each plant (detect). It is fine-tuned from pretrained weights: the transfer learning of part 13.',
      'صور موسومة: مجلد لكل نوع (تصنيف) أو مربع حول كل نبات (كشف). ويُضبط ضبطًا دقيقًا من أوزان مدرَّبة مسبقًا: وهو التعلم بالنقل في الجزء 13.'),
    input: t('A photo', 'صورة'), output: t('“Boswellia sacra”, 89%, and a box around the plant', '“Boswellia sacra”، ‏89٪، ومربع حول النبات'),
    test: t('mAP or accuracy, a confusion matrix, and the rejection rate on plants it was not trained on.', 'mAP أو الدقة، ومصفوفة الالتباس، ونسبة رفض النباتات التي لم يُدرَّب عليها.'),
    without: t('No name: the user must type the plant’s name, and a wrong name finds the wrong documents.', 'لا اسم: على المستخدم أن يكتب اسم النبات، والاسم الخطأ يجد الوثائق الخطأ.') },
  { key: 'memory', name: t('Memory · RAG digital archive', 'الذاكرة · أرشيف رقمي RAG'), tool: 'RAG',
    job: t('Keeps every reference (books, papers, field notes, herbarium sheets) as tagged, searchable passages, and returns the ones about this plant and this question.',
      'يحفظ كل مرجع (كتب وأبحاث وملاحظات ميدانية وعيّنات معشبة) مقاطعَ موسومة قابلة للبحث، ويعيد ما يخص هذا النبات وهذا السؤال.'),
    learns: t('Nothing is trained. Documents are scanned, cleaned, cut into passages, tagged (species, names, place, topic, source, page) and indexed. Adding a book needs no retraining.',
      'لا يُدرَّب شيء. تُمسح الوثائق وتُنظَّف وتُقطَّع مقاطع وتوسم (النوع والأسماء والمكان والموضوع والمصدر والصفحة) وتُفهرس. وإضافة كتاب لا تحتاج إلى إعادة تدريب.'),
    input: t('The species name + the question', 'اسم النوع + السؤال'), output: t('The top passages, each with its source and page', 'أفضل المقاطع، كلٌّ مع مصدره وصفحته'),
    test: t('Retrieval hit rate: for test questions, is the passage holding the answer in the top 3?', 'نسبة الإصابة في الاسترجاع: هل المقطع الذي فيه الإجابة ضمن أفضل 3 لأسئلة الاختبار؟'),
    without: t('No facts to read: the model answers from what it remembers, with no source, and can invent.', 'لا حقائق يقرؤها: يجيب النموذج مما يتذكره، دون مصدر، وقد يختلق.') },
  { key: 'brain', name: t('Brain · fine-tuned Qwen', 'الدماغ · Qwen المضبوط'), tool: 'Qwen3.8-27B + LoRA',
    job: t('Reads the passages and the question and writes the answer the way a Dhofar botanist would: names, description, place, uses, cautions, source.',
      'يقرأ المقاطع والسؤال ويكتب الإجابة كما يكتبها عالم نبات في ظفار: الأسماء والوصف والمكان والاستخدامات والتحذيرات والمصدر.'),
    learns: t('A few hundred to about two thousand reviewed JSONL examples (question + passages → answer) written from about 20% of the references. It learns the style and the rules, not the facts.',
      'من بضع مئات إلى نحو ألفي مثال JSONL مراجَع (سؤال + مقاطع ← إجابة) مكتوبة من نحو 20٪ من المراجع. يتعلم الأسلوب والقواعد، لا الحقائق.'),
    input: t('Question + retrieved passages + rules', 'السؤال + المقاطع المسترجعة + القواعد'), output: t('A bilingual answer in the house style, citing its passages', 'إجابة ثنائية اللغة بالأسلوب المعتمد، تستشهد بمقاطعها'),
    test: t('Base vs fine-tuned on the same passages: format, language, citing, and saying “not in the sources”.', 'الأساسي مقابل المضبوط على المقاطع نفسها: الشكل واللغة والاستشهاد وقول “غير موجود في المصادر”.'),
    without: t('A base model gets the facts from the archive but answers loosely: it may skip the source, mix languages, or guess when the passages are silent.',
      'يأخذ النموذج الأساسي الحقائق من الأرشيف لكنه يجيب بطريقة مرتخية: قد يُسقط المصدر أو يخلط اللغات أو يخمّن حين تسكت المقاطع.') },
];

/** The style the fine-tuned model learns: the same answer shape every time. */
export const ANSWER_STYLE: Text[] = [
  t('Names: scientific, Arabic, English', 'الأسماء: العلمي والعربي والإنجليزي'),
  t('What it looks like', 'كيف يبدو'),
  t('Where it grows in Dhofar', 'أين ينمو في ظفار'),
  t('Uses, traditional and today', 'الاستخدامات، التقليدية واليوم'),
  t('Cautions, if any', 'التحذيرات، إن وُجدت'),
  t('Sources and pages', 'المصادر والصفحات'),
];

/** Kinds of reference in the illustrative library of twenty. */
export const REFERENCE_KINDS: { key: string; name: Text }[] = [
  { key: 'book', name: t('Flora books', 'كتب النباتات') },
  { key: 'paper', name: t('Research papers', 'أبحاث علمية') },
  { key: 'field', name: t('Field notes', 'ملاحظات ميدانية') },
  { key: 'herbarium', name: t('Herbarium sheets', 'عيّنات معشبة') },
];
export const REFERENCES = ['book', 'paper', 'field', 'herbarium', 'book', 'paper', 'field', 'herbarium', 'book', 'paper',
  'field', 'herbarium', 'book', 'paper', 'field', 'herbarium', 'paper', 'field', 'herbarium', 'paper'];

export type Topic = 'look' | 'place' | 'uses' | 'season';
export const TOPICS: { key: Topic; question: Text }[] = [
  { key: 'uses', question: t('What is it used for?', 'فيمَ يُستخدم؟') },
  { key: 'place', question: t('Where does it grow in Dhofar?', 'أين ينمو في ظفار؟') },
  { key: 'look', question: t('What does it look like?', 'كيف يبدو؟') },
  { key: 'season', question: t('When does it flower?', 'متى يُزهر؟') },
];

/** Passages in the digital archive, tagged with species, topic, source and page, and a made-up
 * similarity to the question (what an embedding search would score). Illustrative. */
export const PASSAGES: { id: string; species: string; topic: Topic; source: string; similarity: number; text: Text }[] = [
  { id: 'p1', species: 'boswellia', topic: 'place', source: 'Source A, p. __', similarity: 0.8,
    text: t('In Dhofar it grows on dry slopes and plains, mostly beyond the reach of the monsoon mist.', 'في ظفار ينمو على المنحدرات والسهول الجافة، وأغلبه خارج نطاق ضباب الخريف.') },
  { id: 'p2', species: 'boswellia', topic: 'uses', source: 'Source C, p. __', similarity: 0.79,
    text: t('The resin is tapped from the bark and burned as incense; it is also used in traditional practices.', 'يُستخرج الراتنج من اللحاء ويُحرق بخورًا، ويُستخدم كذلك في الممارسات التقليدية.') },
  { id: 'p3', species: 'boswellia', topic: 'look', source: 'Source A, p. __', similarity: 0.78,
    text: t('A small tree with papery, peeling bark and leaves crowded at the tips of the branches.', 'شجرة صغيرة لحاؤها ورقي متقشر، وأوراقها متزاحمة عند أطراف الأغصان.') },
  { id: 'p4', species: 'boswellia', topic: 'uses', source: 'Field notes 3', similarity: 0.71,
    text: t('Harvesters cut the bark and collect the dried resin some weeks later.', 'يجرح الجامعون اللحاء ويجمعون الراتنج الجاف بعد أسابيع.') },
  { id: 'p5', species: 'commiphora', topic: 'uses', source: 'Source B, p. __', similarity: 0.82,
    text: t('Myrrh resin is gathered from the stems and used in perfumes and traditional remedies.', 'يُجمع راتنج المُرّ من السيقان ويُستخدم في العطور والعلاجات التقليدية.') },
  { id: 'p6', species: 'commiphora', topic: 'place', source: 'Source B, p. __', similarity: 0.77,
    text: t('A spiny shrub of rocky hillsides and dry wadis.', 'شجيرة شائكة في السفوح الصخرية والأودية الجافة.') },
  { id: 'p7', species: 'commiphora', topic: 'season', source: 'Herbarium sheet 7', similarity: 0.74,
    text: t('Specimen collected in flower; the label gives the month of collection.', 'عيّنة جُمعت وهي مزهرة؛ ويذكر الملصق شهر الجمع.') },
  { id: 'p8', species: 'adenium', topic: 'uses', source: 'Source D, p. __', similarity: 0.74,
    text: t('Grown for its flowers; the milky sap is poisonous and must not be eaten.', 'يُزرع لأزهاره؛ وعصارته اللبنية سامة ولا يجوز تناولها.') },
  { id: 'p9', species: 'adenium', topic: 'look', source: 'Source D, p. __', similarity: 0.81,
    text: t('A swollen, bottle-shaped trunk with pink trumpet flowers.', 'جذع منتفخ يشبه القارورة وأزهار وردية بوقية.') },
];

/** Top passages for a question. With the name filter only this plant's passages compete;
 * without it, a similar passage about another plant can win. */
export function searchArchive(species: string, topic: Topic, filter: boolean) {
  return PASSAGES
    .filter(passage => passage.topic === topic && (!filter || passage.species === species))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);
}
