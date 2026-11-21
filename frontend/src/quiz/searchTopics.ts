/**
 * "Read more sources": turns a checked question into good search topics, then into web-search links
 * and a live Wikipedia lookup. Topics are matched on the question's English text (answer first), so
 * the search is about the idea being tested, not the exact wording of the question.
 */
import type { Pair } from './types';

export interface Topic {
  key: string;
  /** What the student sees on the topic chip. */
  label: Pair;
  /** Whole-word patterns matched on the English text of the answer, question and explanation. */
  match: RegExp;
  /** The Wikipedia search, in English and Arabic ('' when Arabic Wikipedia has no good article: use English). */
  wiki: Pair;
}

const topic = (key: string, label: Pair, match: RegExp, wiki: Pair = label): Topic => ({ key, label, match, wiki });

/** Most specific first: the first topics that match are the ones searched. */
export const TOPICS: Topic[] = [
  topic('qlora', ['QLoRA', 'QLoRA'], /\bqlora\b/i, ['LoRA (machine learning)', '']),
  topic('lora', ['LoRA (low-rank adaptation)', 'LoRA (التكيّف منخفض الرتبة)'], /\blora\b|low-rank|\brank\b/i, ['LoRA (machine learning)', '']),
  topic('unsloth', ['Unsloth fine-tuning', 'الضبط الدقيق بـ Unsloth'], /\bunsloth\b/i, ['Fine-tuning (deep learning)', '']),
  topic('overfit', ['Overfitting', 'فرط التخصيص'], /over-?fit/i, ['Overfitting', 'فرط التخصيص']),
  topic('underfit', ['Underfitting', 'نقص التخصيص'], /under-?fit/i, ['Overfitting underfitting', 'فرط التخصيص']),
  topic('hallucination', ['AI hallucination', 'هلوسة الذكاء الاصطناعي'], /hallucinat|makes? (things )?up|invent/i, ['Hallucination (artificial intelligence)', 'هلوسة ذكاء اصطناعي']),
  topic('rag', ['Retrieval-augmented generation (RAG)', 'التوليد المعزّز بالاسترجاع (RAG)'], /\brag\b|retriev/i, ['Retrieval-augmented generation', 'التوليد المعزز بالاسترجاع']),
  topic('rerank', ['Hybrid search and reranking', 'البحث الهجين وإعادة الترتيب'], /rerank|hybrid search|keyword search|bm25/i, ['Learning to rank', '']),
  topic('cosine', ['Cosine similarity', 'تشابه جيب التمام'], /cosine/i, ['Cosine similarity', 'تشابه جيب التمام']),
  topic('vectordb', ['Vector database', 'قاعدة بيانات المتجهات'], /vector (database|store|db)/i, ['Vector database', '']),
  topic('embedding', ['Embeddings', 'التضمينات'], /embedding|\bvectors?\b/i, ['Sentence embedding', 'تضمين الكلمات']),
  topic('chunk', ['Chunking documents for RAG', 'تقطيع المستندات لـ RAG'], /\bchunk|overlap/i, ['Retrieval-augmented generation', 'التوليد المعزز بالاسترجاع']),
  topic('quant', ['Quantization', 'التكميم'], /quanti[sz]|\b(4|8|16)-bit|\bnf4\b|precision of (each )?number/i, ['Quantization (signal processing)', '']),
  topic('vram', ['GPU memory (VRAM)', 'ذاكرة بطاقة الرسوميات (VRAM)'], /\bvram\b|\bgpu\b|out of memory/i, ['Video random-access memory', 'وحدة معالجة الرسوميات']),
  topic('peft', ['Parameter-efficient fine-tuning (PEFT)', 'الضبط الدقيق الموفّر للمعاملات'], /\bpeft\b|frozen|freez|adapter/i, ['Fine-tuning (deep learning)', '']),
  topic('template', ['Chat templates', 'قوالب المحادثة'], /chat template|special token|system prompt/i, ['Prompt engineering', '']),
  topic('jsonl', ['JSON Lines (JSONL)', 'أسطر JSON (JSONL)'], /\bjsonl?\b/i, ['JSON streaming', '']),
  topic('token', ['Tokens and tokenizers', 'الرموز والمقطِّعات'], /\btokeni[sz]|\btokens?\b/i, ['Large language model tokenization', 'نموذج لغوي كبير']),
  topic('lr', ['Learning rate', 'معدل التعلم'], /learning rate/i, ['Learning rate', 'معدل التعلم']),
  topic('epoch', ['Epochs and batches', 'الحقب والدفعات'], /\bepochs?\b|\bbatch|accumulat/i, ['Stochastic gradient descent', 'انحدار التدرج العشوائي']),
  topic('backprop', ['Backpropagation', 'الانتشار الخلفي'], /backprop|backward pass/i, ['Backpropagation', 'انتشار خلفي']),
  topic('gradient', ['Gradient descent', 'الانحدار التدريجي'], /gradient|optimi[sz]er/i, ['Gradient descent', 'انحدار التدرج']),
  topic('loss', ['Loss function', 'دالة الخسارة'], /\bloss\b/i, ['Loss function', 'دالة الخسارة']),
  topic('validation', ['Training, validation and test sets', 'مجموعات التدريب والتحقق والاختبار'], /validation|test set|held-out|unseen/i, ['Training, validation, and test data sets', 'مجموعة بيانات التدريب']),
  topic('activation', ['Activation functions', 'دوال التنشيط'], /activation|\brelu\b|sigmoid|step function/i, ['Activation function', 'دالة التنشيط']),
  topic('neuron', ['Artificial neuron (weights and bias)', 'العصبون الاصطناعي (الأوزان والانحياز)'], /neuron|(?<!open-)\bweights?\b|\bbias(es)?\b/i, ['Artificial neuron', 'عصبون اصطناعي']),
  topic('yolo', ['Object detection (YOLO)', 'كشف الأجسام (YOLO)'], /\byolo\b|bounding box|detect/i, ['Object detection', '']),
  topic('confusion', ['Confusion matrix', 'مصفوفة الالتباس'], /confusion/i, ['Confusion matrix', '']),
  topic('precision', ['Precision and recall', 'الضبط والاستدعاء'], /\brecall\b|\bf1\b|precision and recall/i, ['Precision and recall', 'الدقة والاستدعاء']),
  topic('augment', ['Data augmentation', 'زيادة البيانات'], /augment/i, ['Data augmentation', 'زيادة البيانات']),
  topic('cnn', ['Convolutional neural networks (CNN)', 'الشبكات العصبية الالتفافية (CNN)'], /\bcnn\b|convolution/i, ['Convolutional neural network', 'شبكة عصبونية التفافية']),
  topic('transfer', ['Transfer learning', 'التعلم بالنقل'], /transfer learning|backbone|pre-?train/i, ['Transfer learning', 'نقل التعلم']),
  topic('heritage', ['Intangible cultural heritage', 'التراث الثقافي غير المادي'], /heritage|proverb|oral histor|interview/i, ['Intangible cultural heritage', 'تراث ثقافي غير مادي']),
  topic('finetune', ['Fine-tuning a language model', 'الضبط الدقيق للنموذج اللغوي'], /fine-?tun/i, ['Fine-tuning (deep learning)', '']),
  topic('llm', ['Large language models', 'النماذج اللغوية الكبيرة'], /\bqwen\b|language model|\bllm\b/i, ['Large language model', 'نموذج لغوي كبير']),
];

const byKey = (key: string) => TOPICS.find(item => item.key === key)!;

/** A safe topic for each lab part (0-based), used when nothing more specific matches. */
const PART_TOPIC = ['finetune', 'neuron', 'jsonl', 'peft', 'lora', 'quant', 'qlora', 'unsloth', 'gradient', 'validation',
  'rag', 'rag', 'finetune', 'heritage', 'transfer', 'yolo'];

/**
 * Up to three topics for a question. `clues` are English texts, most telling first (the right answer,
 * then the question, then the explanation).
 */
export function topicsFor(part: number, clues: string[]): Topic[] {
  const found: Topic[] = [];
  for (const clue of clues) {
    for (const item of TOPICS) {
      if (found.length < 3 && !found.includes(item) && item.match.test(clue)) found.push(item);
    }
    if (found.length >= 3) break;
  }
  const fallback = byKey(PART_TOPIC[part] ?? 'finetune');
  if (!found.includes(fallback) && found.length < 3) found.push(fallback);
  return found;
}

export type Lang = 'en' | 'ar';

/** Search pages that open in a new tab. Nothing about the student is sent: only the topic. */
export function webSearches(item: Topic, lang: Lang) {
  const name = lang === 'ar' ? item.label[1] : item.label[0];
  const simple = lang === 'ar' ? `${name} شرح مبسط` : `${item.label[0]} explained simply`;
  const enc = encodeURIComponent;
  return [
    { key: 'google', name: ['Google', 'Google'] as Pair, hint: ['articles and guides', 'مقالات وأدلة'] as Pair,
      url: `https://www.google.com/search?q=${enc(simple)}${lang === 'ar' ? '&hl=ar' : ''}` },
    { key: 'youtube', name: ['YouTube', 'YouTube'] as Pair, hint: ['short video lessons', 'دروس فيديو قصيرة'] as Pair,
      url: `https://www.youtube.com/results?search_query=${enc(lang === 'ar' ? `${name} شرح` : `${item.label[0]} explained`)}` },
    { key: 'wikipedia', name: ['Wikipedia', 'ويكيبيديا'] as Pair, hint: ['encyclopedia', 'موسوعة'] as Pair,
      url: lang === 'ar' && item.wiki[1] ? `https://ar.wikipedia.org/w/index.php?search=${enc(item.wiki[1])}` : `https://en.wikipedia.org/w/index.php?search=${enc(item.wiki[0])}` },
    { key: 'scholar', name: ['Google Scholar', 'الباحث العلمي من Google'] as Pair, hint: ['research papers, for going deeper', 'أوراق بحثية للتعمّق'] as Pair,
      url: `https://scholar.google.com/scholar?q=${enc(item.label[0])}` },
  ];
}

export interface WikiHit { title: string; extract: string; url: string; lang: Lang }

/** Words that show a page is about AI, data or heritage (Wikipedia search also returns loose matches). */
const FIELD_WORDS = [
  'machine learning', 'neural', 'artificial intelligence', 'algorithm', 'statistic', 'data', 'computer', 'model',
  'software', 'heritage', 'unesco', 'signal', 'digital', 'gpu', 'graphics', 'retriev', 'search engine', 'information',
  'تعلم الآلة', 'التعلم الآلي', 'الذكاء الاصطناعي', 'عصبون', 'عصبية اصطناعية', 'نموذج', 'نمذجة', 'خوارزم', 'بيانات',
  'إحصاء', 'حاسوب', 'حاسب', 'برمج', 'تراث', 'يونسكو', 'رقمي', 'معلومات', 'رسوميات',
];

/** Words too common to show that a page is about this topic. */
const COMMON = new Set(['learning', 'machine', 'deep', 'model', 'models', 'large', 'data', 'with', 'from', 'neural', 'network',
  'generation', 'search', 'تعلم', 'عميق', 'دقيق', 'ضبط', 'نموذج', 'لغوي', 'كبير', 'كبيرة', 'بيانات', 'شبكة', 'توليد', 'بحث']);

/** The topic's own distinctive words; Arabic words lose a leading "ال" so both forms match. */
function ownWords(item: Topic) {
  return [...item.wiki, ...item.label].join(' ').toLowerCase().replace(/[()]/g, ' ').split(/\s+/)
    .map(word => word.replace(/^ال/, ''))
    .filter(word => word.length >= 5 && !COMMON.has(word));
}

/**
 * Wikipedia search also returns loose matches (people, places, medicine). A page is shown only if it
 * names the topic AND clearly belongs to AI, data or heritage. The article whose title is exactly the
 * hand-picked query always counts and comes first, then pages naming the topic in their title.
 */
export function pickRelevant(hits: WikiHit[], item: Topic) {
  const own = ownWords(item);
  const exact = (hit: WikiHit) => item.wiki.some(query => query !== '' && hit.title.toLowerCase() === query.toLowerCase());
  const names = (text: string) => own.some(word => text.toLowerCase().includes(word));
  const field = (hit: WikiHit) => FIELD_WORDS.some(word => `${hit.title} ${hit.extract}`.toLowerCase().includes(word));
  const kept = hits.filter(hit => exact(hit) || (field(hit) && (names(hit.title) || names(hit.extract))));
  const rank = (hit: WikiHit) => exact(hit) ? 0 : names(hit.title) ? 1 : 2;
  return [...kept].sort((a, b) => rank(a) - rank(b)).slice(0, 3);
}

/** Live Wikipedia search (CORS-enabled public API). Returns the top pages with a two-sentence summary. */
export async function searchWikipedia(query: string, lang: Lang, signal?: AbortSignal): Promise<WikiHit[]> {
  const params = new URLSearchParams({
    action: 'query', format: 'json', origin: '*', generator: 'search', gsrsearch: query, gsrlimit: '8',
    prop: 'extracts|info', inprop: 'url', exintro: '1', explaintext: '1', exsentences: '2', exlimit: '8',
  });
  const response = await fetch(`https://${lang}.wikipedia.org/w/api.php?${params}`, { signal });
  if (!response.ok) throw new Error(`Wikipedia answered ${response.status}`);
  const data = await response.json() as { query?: { pages?: Record<string, { title: string; extract?: string; fullurl: string; index: number }> } };
  return Object.values(data.query?.pages ?? {})
    .sort((a, b) => a.index - b.index)
    .filter(page => page.extract && page.extract.trim().length > 0)
    .map(page => ({ title: page.title, extract: page.extract!.trim(), url: page.fullurl, lang }));
}
