/**
 * Content for "RAG in depth" (part 12 of the fine-tuning lab): two sample documents to chunk,
 * a small search corpus from the two student projects (TurathAI and UTAS-70), sentences for the
 * token → embedding → vector tool, and the RAG design sheets of both projects.
 * Documents, scores, token IDs and vectors are illustrations for the lesson.
 */
import type { Text } from './finetuneContent';

const t = (en: string, ar: string): Text => ({ en, ar });

// ------------------------------------------------------------ what and why

export const RAG_DEFINITION = t(
  'Retrieval-Augmented Generation (RAG) is a way of building an AI assistant in which, before the language model writes an answer, the system searches a collection of trusted documents, picks the passages that best match the question, and gives them to the model as evidence. The model answers from that evidence and cites it.',
  'التوليد المعزَّز بالاسترجاع (RAG) طريقة لبناء مساعد ذكاء اصطناعي، يبحث فيها النظام، قبل أن يكتب النموذج اللغوي إجابته، في مجموعة من الوثائق الموثوقة، ويختار المقاطع الأقرب إلى السؤال، ويعطيها للنموذج دليلًا. فيجيب النموذج من ذلك الدليل ويستشهد به.');

export const RAG_REASONS: { title: Text; problem: Text; fix: Text }[] = [
  { title: t('Knowledge the model never saw', 'معرفة لم يرها النموذج'),
    problem: t('A model knows only what was in its training data, up to a cut-off date. Local heritage stories and Dhofar flora books were never in it.', 'النموذج لا يعرف إلا ما كان في بيانات تدريبه حتى تاريخ معين. وقصص التراث المحلي وكتب نباتات ظفار لم تكن فيها.'),
    fix: t('RAG brings your own documents to the model at the moment of the question.', 'يأتي RAG بوثائقك أنت إلى النموذج لحظة السؤال.') },
  { title: t('Fewer invented answers', 'إجابات مختلَقة أقل'),
    problem: t('Asked about something it does not know, a model often writes a fluent, confident guess: a hallucination.', 'حين يُسأل النموذج عن شيء لا يعرفه، كثيرًا ما يكتب تخمينًا سلسًا واثقًا: وهذه هلوسة.'),
    fix: t('The answer is grounded in retrieved passages; if nothing relevant is found, the rules say “not in my sources”.', 'تُبنى الإجابة على مقاطع مسترجعة، وإن لم يوجد شيء مناسب تقول القواعد: “غير موجود في مصادري”.') },
  { title: t('Every claim has a source', 'لكل معلومة مصدر'),
    problem: t('Facts stored inside the weights cannot be traced: no book, no page, no storyteller.', 'الحقائق المخزنة داخل الأوزان لا يمكن تتبعها: لا كتاب ولا صفحة ولا راوٍ.'),
    fix: t('Each passage carries its metadata, so the answer can cite “Source A, p. 112” or “story DHF-2018-014”.', 'يحمل كل مقطع بياناته الوصفية، فتستشهد الإجابة بـ “المصدر A، ص 112” أو “القصة DHF-2018-014”.') },
  { title: t('Update without retraining', 'تحديث دون إعادة تدريب'),
    problem: t('Teaching a fine-tuned model a new fact means preparing data and training again.', 'تعليم نموذج مضبوط حقيقة جديدة يعني إعداد بيانات وتدريبه من جديد.'),
    fix: t('Add, correct or delete a document and re-index it. The model is untouched.', 'أضف وثيقة أو صحّحها أو احذفها وأعد فهرستها. والنموذج لا يُمس.') },
];

// ------------------------------------------------------- documents to chunk

export interface DocSection { heading: Text; sentences: Text[] }
export interface SampleDoc { key: string; title: Text; source: string; question: Text; answer: [number, number[]]; sections: DocSection[] }

export const SAMPLE_DOCS: SampleDoc[] = [
  { key: 'utas', title: t('UTAS-70 · flora entry: Boswellia sacra', 'UTAS-70 · مدخل نباتي: Boswellia sacra'), source: 'Source A, pp. 112–113',
    question: t('How is the resin collected, and what is it used for?', 'كيف يُجمع الراتنج، وفيمَ يُستخدم؟'),
    answer: [3, [0, 1, 2]],
    sections: [
      { heading: t('Names', 'الأسماء'), sentences: [
        t('Boswellia sacra belongs to the family Burseraceae.', 'تنتمي Boswellia sacra إلى الفصيلة البخورية Burseraceae.'),
        t('In Arabic it is called shajarat al-luban, and in English the frankincense tree.', 'وتُسمى بالعربية شجرة اللبان، وبالإنجليزية frankincense tree.')] },
      { heading: t('Description', 'الوصف'), sentences: [
        t('It is a small tree, usually two to five metres tall.', 'هي شجرة صغيرة يتراوح طولها عادة بين مترين وخمسة أمتار.'),
        t('The bark is papery and peels away in thin layers.', 'لحاؤها ورقي يتقشر في طبقات رقيقة.'),
        t('The leaves are crowded at the tips of the branches.', 'وأوراقها متزاحمة عند أطراف الأغصان.'),
        t('Small pale flowers grow on short stalks.', 'وتنمو أزهار صغيرة شاحبة على سيقان قصيرة.')] },
      { heading: t('Distribution in Dhofar', 'الانتشار في ظفار'), sentences: [
        t('In Dhofar it grows on dry slopes and plains.', 'تنمو في ظفار على المنحدرات والسهول الجافة.'),
        t('Most trees stand beyond the reach of the monsoon mist, in the dry zone behind the mountains.', 'ومعظم الأشجار خارج نطاق ضباب الخريف، في المنطقة الجافة خلف الجبال.')] },
      { heading: t('Uses', 'الاستخدامات'), sentences: [
        t('The resin is collected by making small cuts in the bark.', 'يُجمع الراتنج بإحداث جروح صغيرة في اللحاء.'),
        t('The milky sap that flows out hardens into tears over several weeks.', 'وتتصلب العصارة اللبنية التي تسيل منه إلى حبيبات خلال عدة أسابيع.'),
        t('The dried resin is burned as incense and used in traditional practices.', 'ويُحرق الراتنج الجاف بخورًا ويُستخدم في الممارسات التقليدية.')] },
      { heading: t('Note', 'ملاحظة'), sentences: [
        t('This entry is for education only and is not medical advice.', 'هذا المدخل للتعليم فقط وليس نصيحة طبية.')] },
    ] },
  { key: 'turath', title: t('TurathAI · oral story DHF-2018-014', 'تراث AI · قصة شفهية DHF-2018-014'), source: 'Oral collection, Salalah, 2018',
    question: t('What did the older men do before the heavy rain?', 'ماذا كان يفعل كبار الرجال قبل اشتداد المطر؟'),
    answer: [1, [2, 3]],
    sections: [
      { heading: t('Record', 'السجل'), sentences: [
        t('Story DHF-2018-014 was recorded in Salalah in 2018 from an elder whose name is kept in the archive.', 'سُجّلت القصة DHF-2018-014 في صلالة عام 2018 من أحد كبار السن، واسمه محفوظ في الأرشيف.'),
        t('Category: the monsoon and traditional knowledge.', 'التصنيف: الخريف والمعارف التقليدية.')] },
      { heading: t('The story', 'القصة'), sentences: [
        t('Every year, when the monsoon clouds arrived from the sea, the people of the mountains prepared their homes.', 'في كل عام، حين تصل غيوم الخريف من البحر، كان أهل الجبال يجهّزون بيوتهم.'),
        t('The rain brought life to the dry land, but the strong winds tested the houses.', 'كان المطر يحيي الأرض الجافة، لكن الرياح القوية كانت تختبر البيوت.'),
        t('When the first clouds appeared, the families gathered firewood and stored water.', 'وحين تظهر أولى الغيوم، كانت الأسر تجمع الحطب وتخزّن الماء.'),
        t('The older men walked around the village to check which roofs needed repair before the heavy rain.', 'ويطوف كبار الرجال في القرية ليتفقدوا الأسقف التي تحتاج إلى إصلاح قبل اشتداد المطر.'),
        t('The elders used to say: “The monsoon is both a guest and a teacher.”', 'وكان الكبار يقولون: «الخريف ضيفٌ ومعلّم».')] },
      { heading: t('Notes', 'ملاحظات'), sentences: [
        t('Transcribed from audio and checked by a second listener.', 'نُسخت من التسجيل الصوتي وراجعها مستمع ثانٍ.'),
        t('Place names were kept as the storyteller said them.', 'وأُبقيت أسماء الأماكن كما نطقها الراوي.')] },
    ] },
];

export type ChunkMode = 'fixed' | 'sentence' | 'section';
export const CHUNK_MODES: { key: ChunkMode; name: Text; how: Text }[] = [
  { key: 'fixed', name: t('Fixed size', 'حجم ثابت'),
    how: t('Cut every N tokens, wherever that falls. Simple and predictable, but it can cut a sentence or a section in half.', 'اقطع كل N رمزًا أينما وقع القطع. بسيط ومتوقع، لكنه قد يشطر جملة أو قسمًا إلى نصفين.') },
  { key: 'sentence', name: t('By sentence', 'حسب الجمل'),
    how: t('Pack whole sentences until the size is reached. No sentence is ever cut, but a chunk can still mix two sections.', 'اجمع جملًا كاملة حتى يبلغ الحجم. لا تُقطع جملة أبدًا، لكن المقطع قد يخلط بين قسمين.') },
  { key: 'section', name: t('By section (structure-aware)', 'حسب الأقسام (يراعي البنية)'),
    how: t('Respect the document’s headings: a chunk never crosses a section, long sections are split by sentence, and the heading is added to every chunk as context.', 'احترم عناوين الوثيقة: لا يعبر المقطع قسمًا، وتُقسم الأقسام الطويلة حسب الجمل، ويُضاف العنوان إلى كل مقطع سياقًا.') },
];

// -------------------------------------------------- tokens → embeddings

/** Concept axes used to make the illustrative embeddings behave like real ones. */
export const CONCEPTS = ['plant', 'resin', 'use', 'monsoon', 'home', 'story', 'animal', 'desert'];
export const SENTENCES: { text: Text; weights: number[] }[] = [
  { text: t('Frankincense resin is burned as incense.', 'Frankincense resin is burned as incense.'), weights: [0.8, 1, 0.8, 0, 0, 0, 0, 0.1] },
  { text: t('The tree’s dried sap is used for perfume and smoke.', 'The tree’s dried sap is used for perfume and smoke.'), weights: [0.7, 0.9, 0.9, 0, 0.1, 0, 0, 0] },
  { text: t('اللبان يُحرق بخورًا في البيوت.', 'اللبان يُحرق بخورًا في البيوت.'), weights: [0.8, 0.95, 0.75, 0, 0.2, 0, 0, 0.1] },
  { text: t('Families stored water before the monsoon rain.', 'Families stored water before the monsoon rain.'), weights: [0, 0, 0.1, 1, 0.7, 0.5, 0, 0] },
  { text: t('The camel crossed the desert at night.', 'The camel crossed the desert at night.'), weights: [0, 0, 0, 0, 0, 0.3, 1, 0.9] },
];

// ------------------------------------------------------------ the search lab

export type Collection = 'turath' | 'utas';
export interface CorpusChunk { id: string; collection: Collection; title: Text; text: Text; source: string; x: number; y: number; terms: string[] }

/** Chunks from both projects on a 2-D picture of the embedding space (illustrative positions). */
export const CORPUS: CorpusChunk[] = [
  { id: 'T-014-2', collection: 'turath', title: t('Preparing homes for the monsoon', 'تجهيز البيوت للخريف'), source: 'DHF-2018-014', x: 70, y: 60, terms: ['monsoon', 'خريف', 'rain'],
    text: t('When the first clouds appeared, families gathered firewood and stored water.', 'حين تظهر أولى الغيوم كانت الأسر تجمع الحطب وتخزّن الماء.') },
  { id: 'T-014-3', collection: 'turath', title: t('Checking the roofs before the rain', 'تفقد الأسقف قبل المطر'), source: 'DHF-2018-014', x: 92, y: 84, terms: ['monsoon', 'rain', 'roof'],
    text: t('The older men walked around the village to check which roofs needed repair.', 'يطوف كبار الرجال في القرية ليتفقدوا الأسقف التي تحتاج إلى إصلاح.') },
  { id: 'T-031-1', collection: 'turath', title: t('Al-Bar’ah: a Dhofari dance', 'البرعة: رقصة ظفارية'), source: 'UNESCO element, 2010', x: 150, y: 46, terms: ['al-bar’ah', 'barah', 'البرعة', 'dance'],
    text: t('Al-Bar’ah is a Bedouin dance from the Dhofar mountains, performed with a khanjar and accompanied by drums and poetry.', 'البرعة رقصة بدوية من جبال ظفار تُؤدى بالخنجر ويصاحبها الطبل والشعر.') },
  { id: 'T-044-2', collection: 'turath', title: t('Welcoming a guest with coffee', 'استقبال الضيف بالقهوة'), source: 'Oral collection, Nizwa, 2019', x: 132, y: 70, terms: ['coffee', 'guest', 'قهوة'],
    text: t('A guest is welcomed with coffee and dates, and the cup is refilled until the guest shakes it.', 'يُستقبل الضيف بالقهوة والتمر، ويُعاد ملء الفنجان حتى يهزه الضيف.') },
  { id: 'T-052-1', collection: 'turath', title: t('Alheda’a: calling the camels', 'الهداء: نداء الإبل'), source: 'UNESCO element, 2022', x: 104, y: 128, terms: ['alheda’a', 'camel', 'الهداء'],
    text: t('Herders call their camels with short sung phrases that each herd recognises.', 'ينادي الرعاة إبلهم بعبارات قصيرة مغنّاة تعرفها كل قطيع.') },
  { id: 'U-BS-uses', collection: 'utas', title: t('Frankincense: uses', 'اللبان: الاستخدامات'), source: 'Source A, p. 113', x: 238, y: 150, terms: ['frankincense', 'boswellia', 'resin', 'لبان'],
    text: t('The dried resin is burned as incense and used in traditional practices.', 'يُحرق الراتنج الجاف بخورًا ويُستخدم في الممارسات التقليدية.') },
  { id: 'U-BS-harvest', collection: 'utas', title: t('Frankincense: collecting the resin', 'اللبان: جمع الراتنج'), source: 'Field notes 3', x: 256, y: 172, terms: ['frankincense', 'boswellia', 'resin', 'bark'],
    text: t('Small cuts are made in the bark; the sap hardens into tears over several weeks.', 'تُحدث جروح صغيرة في اللحاء، فتتصلب العصارة إلى حبيبات خلال أسابيع.') },
  { id: 'U-BS-place', collection: 'utas', title: t('Frankincense: where it grows', 'اللبان: أين ينمو'), source: 'Source A, p. 112', x: 210, y: 188, terms: ['frankincense', 'boswellia', 'dhofar'],
    text: t('It grows on dry slopes and plains, mostly beyond the monsoon mist.', 'ينمو على المنحدرات والسهول الجافة، وأغلبه خارج ضباب الخريف.') },
  { id: 'U-CM-uses', collection: 'utas', title: t('Myrrh: uses', 'المُرّ: الاستخدامات'), source: 'Source B, p. 41', x: 270, y: 132, terms: ['myrrh', 'commiphora', 'resin', 'مر'],
    text: t('Myrrh resin is gathered from the stems and used in perfumes and traditional remedies.', 'يُجمع راتنج المُرّ من السيقان ويُستخدم في العطور والعلاجات التقليدية.') },
  { id: 'U-AO-sap', collection: 'utas', title: t('Desert rose: poisonous sap', 'وردة الصحراء: عصارة سامة'), source: 'Source D, p. 77', x: 288, y: 196, terms: ['desert rose', 'adenium', 'sap'],
    text: t('The milky sap is poisonous and must not be eaten.', 'العصارة اللبنية سامة ولا يجوز تناولها.') },
];

export const QUERIES: { text: Text; x: number; y: number; terms: string[] }[] = [
  { text: t('How did people prepare for the monsoon?', 'كيف كان الناس يستعدون للخريف؟'), x: 80, y: 74, terms: ['monsoon', 'خريف'] },
  { text: t('What is frankincense resin used for?', 'فيمَ يُستخدم راتنج اللبان؟'), x: 228, y: 166, terms: ['frankincense', 'resin', 'لبان'] },
  { text: t('What is Al-Bar’ah?', 'ما هي البرعة؟'), x: 128, y: 82, terms: ['al-bar’ah', 'البرعة'] },
  { text: t('How tall does a date palm grow?', 'ما طول نخلة التمر؟'), x: 176, y: 214, terms: ['date palm'] },
];

// ------------------------------------------------------- the two projects

export interface DesignRow { key: Text; turath: Text; utas: Text }
export const DESIGN: DesignRow[] = [
  { key: t('Documents', 'الوثائق'),
    turath: t('Transcribed oral stories, UNESCO element files, books and articles on Omani heritage.', 'قصص شفهية منسوخة، وملفات عناصر اليونسكو، وكتب ومقالات عن التراث العُماني.'),
    utas: t('Flora books, research papers, field notes, herbarium sheets.', 'كتب النباتات، والأبحاث، والملاحظات الميدانية، وعيّنات المعشبة.') },
  { key: t('Extraction', 'الاستخراج'),
    turath: t('Audio → transcript, checked by a second listener; OCR for printed books; dialect words kept.', 'صوت ← نص منسوخ يراجعه مستمع ثانٍ؛ و OCR للكتب المطبوعة؛ مع إبقاء كلمات اللهجة.'),
    utas: t('PyMuPDF for digital PDFs; Tesseract OCR (Arabic + English) for scans; page numbers kept.', 'PyMuPDF لملفات PDF الرقمية، و Tesseract OCR (عربي + إنجليزي) للمسوحات، مع إبقاء أرقام الصفحات.') },
  { key: t('Chunk unit', 'وحدة التقطيع'),
    turath: t('One story, or one scene of a long story. A story is never split mid-scene: its meaning is in the whole.', 'قصة واحدة، أو مشهد واحد من قصة طويلة. ولا تُقطع القصة وسط مشهد: فمعناها في كليتها.'),
    utas: t('One topic of one species (names, description, distribution, uses), following the book’s headings.', 'موضوع واحد لنوع واحد (الأسماء، الوصف، الانتشار، الاستخدامات)، باتباع عناوين الكتاب.') },
  { key: t('Size and overlap', 'الحجم والتداخل'),
    turath: t('About 300–500 tokens per scene, one sentence of overlap between scenes.', 'نحو 300–500 رمز لكل مشهد، مع جملة تداخل واحدة بين المشاهد.'),
    utas: t('About 150–300 tokens per topic; overlap rarely needed because topics are self-contained.', 'نحو 150–300 رمز لكل موضوع؛ ونادرًا ما يلزم التداخل لأن المواضيع مكتفية بذاتها.') },
  { key: t('Linking the pieces', 'ربط القطع'),
    turath: t('story_id, scene number, previous / next scene; the full story is the parent.', 'story_id ورقم المشهد والمشهد السابق / التالي؛ والقصة كاملة هي الأصل.'),
    utas: t('species key, topic, source and page; the full species entry is the parent.', 'مفتاح النوع والموضوع والمصدر والصفحة؛ ومدخل النوع كاملًا هو الأصل.') },
  { key: t('The question comes from', 'يأتي السؤال من'),
    turath: t('The user’s text, often in Arabic or a dialect.', 'نص المستخدم، بالعربية أو اللهجة غالبًا.'),
    utas: t('The species name from YOLO + the user’s question.', 'اسم النوع من YOLO + سؤال المستخدم.') },
  { key: t('Filter before searching', 'التصفية قبل البحث'),
    turath: t('Optional: region, category or collection, when the user names one.', 'اختيارية: المنطقة أو التصنيف أو المجموعة، حين يذكرها المستخدم.'),
    utas: t('Always: species = the YOLO name, so another plant cannot answer.', 'دائمًا: النوع = اسم YOLO، فلا يجيب نبات آخر.') },
  { key: t('Search', 'البحث'),
    turath: t('Hybrid: vectors for meaning + keywords for names such as Al-Bar’ah; Arabic spelling normalised.', 'هجين: متجهات للمعنى + كلمات مفتاحية لأسماء مثل البرعة؛ مع توحيد الإملاء العربي.'),
    utas: t('Vectors within the filtered species, keywords for Latin names; top 3 after reranking.', 'متجهات داخل النوع المصفّى، وكلمات مفتاحية للأسماء اللاتينية؛ وأفضل 3 بعد إعادة الترتيب.') },
  { key: t('Citation', 'الاستشهاد'),
    turath: t('(Story DHF-2018-014, oral collection, Salalah, 2018)', '(القصة DHF-2018-014، مجموعة شفهية، صلالة، 2018)'),
    utas: t('(Source A, p. 113) · (Field notes 3)', '(المصدر A، ص 113) · (ملاحظات ميدانية 3)') },
  { key: t('When nothing is found', 'حين لا يوجد شيء'),
    turath: t('“I don’t have a recorded source for this story.”', '“ليس لدي مصدر مسجّل لهذه القصة.”'),
    utas: t('“My sources do not say. Please check with a botanist.”', '“مصادري لا تذكر ذلك. راجع مختصًا في النبات من فضلك.”') },
];

export const METADATA: Record<Collection, object> = {
  turath: { chunk_id: 'T-014-3', story_id: 'DHF-2018-014', scene: 3, prev: 'T-014-2', next: 'T-014-4', region: 'Dhofar', place: 'Salalah', year: 2018,
    category: 'monsoon / traditional knowledge', language: 'ar', narrator: 'kept in archive', source: 'Oral collection, Salalah' },
  utas: { chunk_id: 'U-BS-uses', species: 'Boswellia sacra', names: ['شجرة اللبان', 'frankincense tree'], topic: 'uses', section: 'Uses',
    parent: 'U-BS', source: 'Source A', page: 113, language: 'en' },
};

// --------------------------------------------------------- the RAG doctor

export const SYMPTOMS: { symptom: Text; cause: Text; fix: Text; tool: string }[] = [
  { symptom: t('The answer talks about the wrong plant or story.', 'الإجابة تتحدث عن نبات أو قصة خاطئة.'),
    cause: t('Passages from similar items competed freely.', 'تنافست مقاطع عناصر متشابهة بحرية.'),
    fix: t('Filter by metadata (species, story, region) before ranking.', 'صفِّ بالبيانات الوصفية (النوع، القصة، المنطقة) قبل الترتيب.'), tool: '.rd-search' },
  { symptom: t('The answer is only half right.', 'الإجابة صحيحة نصفها فقط.'),
    cause: t('The answer was cut across two chunks, and only one was retrieved.', 'قُطعت الإجابة بين مقطعين، واستُرجع أحدهما فقط.'),
    fix: t('Chunk by section, add overlap, or return the parent section.', 'قطّع حسب الأقسام، أو أضف تداخلًا، أو أعد القسم الأصل.'), tool: '.rd-chunk' },
  { symptom: t('Names such as Al-Bar’ah or Boswellia are not found.', 'لا يُعثر على أسماء مثل البرعة أو Boswellia.'),
    cause: t('Embeddings capture meaning, and rare names carry little of it.', 'التضمينات تلتقط المعنى، والأسماء النادرة تحمل القليل منه.'),
    fix: t('Add keyword (BM25) search and fuse the two lists; normalise Arabic spelling.', 'أضف بحثًا بالكلمات المفتاحية (BM25) وادمج القائمتين؛ ووحّد الإملاء العربي.'), tool: '.rd-search' },
  { symptom: t('It invents an answer when the archive has nothing.', 'يختلق إجابة حين لا يحوي الأرشيف شيئًا.'),
    cause: t('The top passages were sent even though none was close.', 'أُرسلت أفضل المقاطع رغم أن أيًّا منها لم يكن قريبًا.'),
    fix: t('Set a similarity threshold, and add a “not in the sources” rule and training examples.', 'ضع عتبة تشابه، وأضف قاعدة “غير موجود في المصادر” وأمثلة تدريب عليها.'), tool: '.rd-cite' },
  { symptom: t('An Arabic question finds nothing in English documents.', 'السؤال العربي لا يجد شيئًا في الوثائق الإنجليزية.'),
    cause: t('The embedding model was trained on one language.', 'نموذج التضمين مدرَّب على لغة واحدة.'),
    fix: t('Use a multilingual embedding model, the same one for documents and questions.', 'استخدم نموذج تضمين متعدد اللغات، والنموذج نفسه للوثائق والأسئلة.'), tool: '.rd-vectors' },
  { symptom: t('A corrected fact is still answered the old way.', 'حقيقة صُحّحت ما زالت تُجاب بالطريقة القديمة.'),
    cause: t('The old vectors are still in the database.', 'المتجهات القديمة ما زالت في قاعدة البيانات.'),
    fix: t('Delete the document’s chunks by doc_id, then re-embed and insert the new version.', 'احذف مقاطع الوثيقة بـ doc_id، ثم أعد تضمين النسخة الجديدة وأدخلها.'), tool: '.rd-projects' },
];
