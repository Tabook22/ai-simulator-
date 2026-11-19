/**
 * Part 12 of the fine-tuning lab, "RAG in depth": what RAG is and why it is needed, then the two
 * pipelines in full. Indexing (offline): upload → extract → clean → chunk → tokenize → embed →
 * store. Answering (online): question → tokenize → embed → filter → search → hybrid + rerank →
 * prompt → cited answer. Tools let students chunk real documents, watch text become vectors,
 * search a small archive from the TurathAI and UTAS-70 projects, and follow the citations.
 * Token IDs, vectors and scores are illustrations computed in the browser.
 */
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import './relay.css';
import './ragdeep.css';
import { Icon } from './ui';
import type { IconName } from './ui';
import { useI18n } from './i18n';
import { usePartNav } from './LabShell';
import { t, usePlayer, useTx } from './FineTuneScenes';
import type { Text } from './FineTuneScenes';
import { JsonCode } from './FineTuneLessons';
import {
  CHUNK_MODES, CONCEPTS, CORPUS, DESIGN, METADATA, QUERIES, RAG_DEFINITION, RAG_REASONS, SAMPLE_DOCS, SENTENCES, SYMPTOMS,
} from './ragDeepContent';
import type { ChunkMode, Collection } from './ragDeepContent';

const cls = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');
const delay = (index: number, step = 0.1): CSSProperties => ({ animationDelay: `${index * step}s` });

function Heading({ icon, children, first }: { icon: IconName; children: ReactNode; first?: boolean }) {
  return <h4 className={cls('llm-sub ft-handson', first && 'first')}><Icon name={icon} size={13}/>{children}</h4>;
}

function PartLink({ part }: { part: number }) {
  const say = useTx();
  const nav = usePartNav();
  return <button type="button" className="lx-link" onClick={() => nav.go(part)}>
    {say(t(`Part ${part + 1}`, `الجزء ${part + 1}`))}: {say(nav.parts[part].label)}<Icon name="next" size={11}/>
  </button>;
}

// --------------------------------------------------- tokens, ids and vectors

function hash(text: string) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) { value ^= text.charCodeAt(index); value = Math.imul(value, 16777619); }
  return value >>> 0;
}
const PUNCT = /^[.,?!؟،:;()“”"«»]$/;

/** A simplified SentencePiece-style tokenizer: ▁ marks the start of a word. IDs are illustrative. */
export function tokenize(text: string) {
  const words = text.replace(/([.,?!؟،:;()“”"«»])/g, ' $1 ').split(/\s+/).filter(Boolean);
  const pieces: string[] = [];
  for (const word of words) {
    if (PUNCT.test(word)) pieces.push(word);
    else if (/^[؀-ۿ]/.test(word) && word.startsWith('ال') && word.length > 4) pieces.push('▁ال', word.slice(2));
    else if (word.length > 8) pieces.push(`▁${word.slice(0, 5)}`, word.slice(5));
    else pieces.push(`▁${word}`);
  }
  return pieces.map(piece => ({ piece, id: hash(piece) % 249000 + 1000 }));
}

/** Deterministic numbers in [-1, 1] standing in for a real embedding. */
function noise(seed: string, size: number) {
  return Array.from({ length: size }, (_, index) => ((hash(`${seed}#${index}`) % 2001) / 1000) - 1);
}
const DIMS = 16;
const BASIS = Array.from({ length: DIMS }, (_, dim) => noise(`axis${dim}`, CONCEPTS.length));
function embed(weights: number[], seed: string) {
  const extra = noise(seed, DIMS);
  const raw = BASIS.map((row, dim) => row.reduce((sum, value, concept) => sum + value * weights[concept], 0) + 0.08 * extra[dim]);
  const length = Math.hypot(...raw) || 1;
  return raw.map(value => value / length);
}
const cosine = (left: number[], right: number[]) => left.reduce((sum, value, index) => sum + value * right[index], 0);

function VectorBars({ values, tone = '#60a5fa', label }: { values: number[]; tone?: string; label?: string }) {
  return <div className="rd-bars" style={{ '--bar': tone } as CSSProperties} aria-label={label} role="img">
    {values.map((value, index) => <i key={index} className={value < 0 ? 'neg' : ''} style={{ height: `${Math.max(4, Math.abs(value) * 100)}%`, ...delay(index, 0.03) }}/>)}
  </div>;
}

function TokenChips({ text, limit = 99 }: { text: string; limit?: number }) {
  const tokens = tokenize(text).slice(0, limit);
  return <div className="rd-tokens" dir="ltr">
    {tokens.map((token, index) => <span key={index} className="rd-token" style={delay(index, 0.07)}><b>{token.piece}</b><small>{token.id}</small></span>)}
  </div>;
}

// ------------------------------------------------------ the flow scene shell

interface FlowStep { station: number; title: Text; text: Text; note?: Text }

function FlowScene({ id, title, tone, stations, steps, children }: {
  id: string; title: Text; tone: string; stations: { icon: IconName; name: Text }[]; steps: FlowStep[]; children: (step: number) => ReactNode;
}) {
  const say = useTx();
  const player = usePlayer(steps.length);
  const { step, playing } = player;
  const current = steps[step];
  return <section className="pr rd-flow" id={id} style={{ '--act': tone } as CSSProperties} aria-label={say(title)}>
    <h4 className="rd-flow-title"><Icon name="play" size={13}/>{say(title)}</h4>
    <ol className="rd-stations">
      {stations.map((station, index) => <li key={station.name.en} className={cls(index === current.station && 'on', index < current.station && 'done')}>
        <button type="button" onClick={() => player.go(steps.findIndex(item => item.station === index))}>
          <span className="dot"><Icon name={station.icon} size={14}/></span><b>{say(station.name)}</b>
        </button>
      </li>)}
    </ol>
    <div className="pr-body">
      <div className="pr-stage rd-stage" key={step}>{children(step)}</div>
      <aside className="pr-explain">
        <div className="pr-beat" key={step}>
          <span className="pr-count" dir="ltr">{step + 1} / {steps.length}</span>
          <h4>{say(current.title)}</h4>
          <p>{say(current.text)}</p>
        </div>
        {current.note && <div className="rd-tech" key={`n${step}`}><b><Icon name="code" size={12}/>{say(t('In practice', 'في التطبيق'))}</b><p>{say(current.note)}</p></div>}
      </aside>
    </div>
    <div className="pr-controls">
      <button type="button" className="button small" onClick={() => player.go(step - 1)} disabled={step === 0} aria-label={say(t('Previous step', 'الخطوة السابقة'))}><Icon name="previous" size={13}/></button>
      <button type="button" className="button small pr-play" onClick={player.toggle}>
        <Icon name={playing ? 'pause' : 'play'} size={13}/>{say(playing ? t('Pause', 'إيقاف مؤقت') : step === steps.length - 1 ? t('Play again', 'شغّل من جديد') : t('Play', 'تشغيل'))}</button>
      <button type="button" className="button small" onClick={() => player.go(step + 1)} disabled={step === steps.length - 1} aria-label={say(t('Next step', 'الخطوة التالية'))}><Icon name="next" size={13}/></button>
      <div className="pr-dots rd-dots">
        {steps.map((item, index) => <button key={item.title.en} type="button" className={cls(index === step && 'on', index < step && 'past')}
          onClick={() => player.go(index)} aria-label={say(item.title)} aria-current={index === step ? 'step' : undefined}/>)}
      </div>
    </div>
  </section>;
}

// ------------------------------------------------- scene 1: indexing (offline)

const INDEX_STATIONS: { icon: IconName; name: Text }[] = [
  { icon: 'download', name: t('Upload', 'الرفع') }, { icon: 'file', name: t('Extract', 'الاستخراج') }, { icon: 'sparkle', name: t('Clean', 'التنظيف') },
  { icon: 'grid', name: t('Chunk', 'التقطيع') }, { icon: 'code', name: t('Tokenize', 'الترميز') }, { icon: 'chip', name: t('Embed', 'التضمين') },
  { icon: 'library', name: t('Store', 'التخزين') }, { icon: 'check', name: t('Ready', 'جاهز') },
];

const INDEX_STEPS: FlowStep[] = [
  { station: 0, title: t('Upload the documents', 'ارفع الوثائق'),
    text: t('Indexing happens once, before anyone asks anything. The team uploads every trusted source: digital PDFs, scanned pages and transcripts. Each file gets a doc_id and its source details.',
      'تحدث الفهرسة مرة واحدة، قبل أن يسأل أحد. يرفع الفريق كل مصدر موثوق: ملفات PDF رقمية وصفحات ممسوحة ونصوص منسوخة. ويحصل كل ملف على doc_id وتفاصيل مصدره.'),
    note: t('Keep a source register: title, author, year, licence, language and pages for every file. Citations later come from here.', 'احتفظ بسجل للمصادر: العنوان والمؤلف والسنة والترخيص واللغة والصفحات لكل ملف. فالاستشهادات تأتي من هنا لاحقًا.') },
  { station: 1, title: t('Extract the text', 'استخرج النص'),
    text: t('A digital PDF already contains text, so it is read directly. A scan is only a picture, so optical character recognition (OCR) reads the letters. The page number travels with every line.',
      'ملف PDF الرقمي يحوي نصًا، فيُقرأ مباشرة. أما المسح فهو صورة فقط، فيقرأ التعرّف الضوئي على الحروف (OCR) الحروف. ويرافق رقم الصفحة كل سطر.'),
    note: t('PyMuPDF for digital PDFs; Tesseract OCR with Arabic and English models for scans; audio is transcribed, then checked by a person.', 'PyMuPDF لملفات PDF الرقمية؛ و Tesseract OCR بنماذج العربية والإنجليزية للمسوحات؛ والصوت يُنسخ ثم يراجعه شخص.') },
  { station: 2, title: t('Clean and find the structure', 'نظّف واعثر على البنية'),
    text: t('Running headers and page numbers are removed, words broken across lines are joined, OCR mistakes are fixed, and headings are detected. The headings are what make good chunks possible.',
      'تُحذف الترويسات المتكررة وأرقام الصفحات، وتُوصل الكلمات المقسومة بين الأسطر، وتُصحح أخطاء OCR، وتُكتشف العناوين. فالعناوين هي ما يجعل التقطيع الجيد ممكنًا.'),
    note: t('Normalise Arabic consistently (for example the forms of alef and ta marbuta) in both documents and questions.', 'وحّد الإملاء العربي بالطريقة نفسها (مثل صور الألف والتاء المربوطة) في الوثائق والأسئلة معًا.') },
  { station: 3, title: t('Chop the document into chunks', 'قطّع الوثيقة إلى مقاطع'),
    text: t('A whole book cannot be one vector, and a single word means nothing alone. So the text is cut into chunks of a few hundred tokens, following the headings, with a small overlap. Each chunk remembers its neighbours and its parent section.',
      'لا يمكن أن يكون الكتاب كله متجهًا واحدًا، والكلمة الواحدة لا تعني شيئًا وحدها. فيُقطع النص إلى مقاطع من بضع مئات من الرموز، باتباع العناوين، مع تداخل صغير. ويتذكر كل مقطع جيرانه وقسمه الأصل.'),
    note: t('A common start: 200–500 tokens with 10–20% overlap, then tune with your own test questions. Try it in the chunking lab below.', 'بداية شائعة: 200–500 رمز مع تداخل 10–20٪، ثم اضبطها بأسئلة اختبارك. جرّبها في مختبر التقطيع أدناه.') },
  { station: 4, title: t('Turn each chunk into tokens', 'حوّل كل مقطع إلى رموز'),
    text: t('The embedding model cannot read letters. Its tokenizer splits the chunk into tokens, pieces of words, and replaces each with its number in the model’s vocabulary.',
      'لا يقرأ نموذج التضمين الحروف. فيقسم مقطِّعه المقطعَ إلى رموز، أي أجزاء كلمات، ويستبدل كلًّا منها برقمه في مفردات النموذج.'),
    note: t('Check that every chunk fits the embedding model’s input limit (for example 512 or 8,192 tokens). Arabic usually needs more tokens per word than English.', 'تأكد أن كل مقطع يتسع لحد مدخلات نموذج التضمين (مثل 512 أو 8,192 رمزًا). والعربية تحتاج عادة رموزًا أكثر لكل كلمة من الإنجليزية.') },
  { station: 5, title: t('Embed: tokens become one vector', 'التضمين: الرموز تصبح متجهًا واحدًا'),
    text: t('The token numbers pass through the embedding model, a transformer encoder. It produces a vector for each token, and these are pooled into one vector for the whole chunk: hundreds of numbers that describe its meaning.',
      'تمر أرقام الرموز عبر نموذج التضمين، وهو مُرمِّز من نوع transformer. ينتج متجهًا لكل رمز، وتُجمع هذه في متجه واحد للمقطع كله: مئات الأرقام التي تصف معناه.'),
    note: t('A multilingual model such as BGE-M3 gives 1,024 numbers per chunk and puts Arabic and English with the same meaning close together. Vectors are usually normalised to length 1.', 'نموذج متعدد اللغات مثل BGE-M3 يعطي 1,024 رقمًا لكل مقطع، ويضع العربية والإنجليزية ذات المعنى الواحد متقاربتين. وتُطبَّع المتجهات عادة إلى طول 1.') },
  { station: 6, title: t('Store vector + text + metadata', 'خزّن المتجه + النص + البيانات الوصفية'),
    text: t('Each chunk is saved as one row: its id, its vector, its original text, and its metadata (document, page, section, species or story, neighbours). An index is then built so the nearest vectors can be found fast.',
      'يُحفظ كل مقطع صفًّا واحدًا: معرّفه ومتجهه ونصه الأصلي وبياناته الوصفية (الوثيقة والصفحة والقسم والنوع أو القصة والجيران). ثم يُبنى فهرس ليُعثر على أقرب المتجهات بسرعة.'),
    note: t('Vector databases such as Chroma, Qdrant, FAISS or pgvector. An HNSW index links each vector to its near neighbours in a graph, so a search visits a few hundred vectors instead of millions.', 'قواعد بيانات متجهات مثل Chroma أو Qdrant أو FAISS أو pgvector. ويربط فهرس HNSW كل متجه بجيرانه القريبين في رسم بياني، فيزور البحث بضع مئات من المتجهات بدل الملايين.') },
  { station: 7, title: t('The archive is ready', 'الأرشيف جاهز'),
    text: t('Documents became chunks, chunks became vectors, vectors sit in an index with their text and sources. A new or corrected document goes through the same steps; the language model is never retrained.',
      'صارت الوثائق مقاطع، والمقاطع متجهات، والمتجهات في فهرس مع نصوصها ومصادرها. والوثيقة الجديدة أو المصحَّحة تمر بالخطوات نفسها، ولا يُعاد تدريب النموذج اللغوي أبدًا.'),
    note: t('To update a document: delete its rows by doc_id, then index the new version. Re-index everything only if you change the embedding model.', 'لتحديث وثيقة: احذف صفوفها بـ doc_id، ثم فهرس النسخة الجديدة. ولا تُعِد فهرسة كل شيء إلا إن غيّرت نموذج التضمين.') },
];

const FILES: { name: string; kind: Text; tone: string }[] = [
  { name: 'flora_of_dhofar.pdf', kind: t('digital PDF · 312 pages', 'PDF رقمي · 312 صفحة'), tone: '#5ef2a0' },
  { name: 'herbarium_sheet_07.jpg', kind: t('scanned page', 'صفحة ممسوحة'), tone: '#f9a8d4' },
  { name: 'DHF-2018-014.docx', kind: t('story transcript', 'نص قصة منسوخ'), tone: '#2dd4bf' },
];
const CHUNK_TEXT = 'The dried resin is burned as incense and used in traditional practices.';

function IndexVisual({ step }: { step: number }) {
  const say = useTx();
  const vector = useMemo(() => noise('chunk-uses', 24), []);
  if (step === 0) return <div className="rd-files">
    {FILES.map((file, index) => <div key={file.name} className="rd-file" style={{ '--file': file.tone, ...delay(index, 0.25) } as CSSProperties}>
      <span className="ico"><Icon name="file" size={22}/></span><b dir="ltr">{file.name}</b><small>{say(file.kind)}</small>
      <code dir="ltr">doc_id: D{index + 1}</code>
    </div>)}
    <div className="rd-drop"><Icon name="download" size={18}/>{say(t('drop documents here', 'أفلت الوثائق هنا'))}</div>
  </div>;
  if (step === 1) return <div className="rd-extract">
    <div className="rd-page"><span className="beam"/>{[90, 76, 84, 60, 88, 70, 82].map((width, index) => <i key={index} style={{ width: `${width}%` }}/>)}<em dir="ltr">p. 113</em></div>
    <Icon name="next" size={20}/>
    <div className="rd-lines" dir="ltr">
      {['## Uses', 'The resin is collected by making', 'small cuts in the bark. The milky', 'sap hardens into tears over several', 'weeks. The dried resin is burned', 'as incense …', '[page 113]'].map((line, index) =>
        <span key={line} style={delay(index, 0.2)}>{line}</span>)}
    </div>
  </div>;
  if (step === 2) return <div className="rd-clean" dir="ltr">
    {[['FLORA OF DHOFAR — 113', '', t('running header removed', 'حُذفت الترويسة')], ['Bosweilia sacra', 'Boswellia sacra', t('OCR error fixed', 'صُحح خطأ OCR')],
      ['frank-\nincense', 'frankincense', t('broken word joined', 'وُصلت الكلمة')], ['USES', '## Uses', t('heading detected', 'اكتُشف عنوان')]].map(([before, after, why], index) =>
      <div key={before as string} className="rd-fix" style={delay(index, 0.3)}>
        <s>{before as string}</s><Icon name="next" size={13}/><b>{(after as string) || '∅'}</b><small>{say(why as Text)}</small>
      </div>)}
  </div>;
  if (step === 3) return <div className="rd-chunks-demo">
    <span className="parent">{say(t('parent: Boswellia sacra entry (pp. 112–113)', 'الأصل: مدخل Boswellia sacra (ص 112–113)'))}</span>
    {[t('Names', 'الأسماء'), t('Description', 'الوصف'), t('Distribution', 'الانتشار'), t('Uses', 'الاستخدامات')].map((name, index) =>
      <div key={name.en} className={`rd-chunkcard c${index}`} style={delay(index, 0.3)}>
        <code dir="ltr">U-BS-{index + 1}</code><b>{say(name)}</b>
        <span className="lines"><i/><i/><i/></span>
        {index > 0 && <span className="overlap" title={say(t('overlap', 'تداخل'))}/>}
        <small dir="ltr">prev: {index ? `U-BS-${index}` : '—'} · next: {index < 3 ? `U-BS-${index + 2}` : '—'}</small>
      </div>)}
  </div>;
  if (step === 4) return <div className="rd-tokenize">
    <p className="rd-chunk-text" dir="ltr">“{CHUNK_TEXT}”</p>
    <TokenChips text={CHUNK_TEXT}/>
    <span className="rd-count" dir="ltr">{tokenize(CHUNK_TEXT).length} tokens · max 8,192</span>
  </div>;
  if (step === 5) return <div className="rd-embed">
    <div className="rd-ids" dir="ltr">{tokenize(CHUNK_TEXT).slice(0, 8).map((token, index) => <span key={index} style={delay(index, 0.08)}>{token.id}</span>)}<span>…</span></div>
    <div className="rd-encoder"><b>{say(t('embedding model', 'نموذج التضمين'))}</b>{[0, 1, 2, 3].map(index => <i key={index} style={delay(index, 0.2)}/>)}<small>{say(t('one vector per token → pooled', 'متجه لكل رمز ← تجميع'))}</small></div>
    <div className="rd-vec"><VectorBars values={vector}/><code dir="ltr">[{vector.slice(0, 4).map(value => value.toFixed(2)).join(', ')}, … 1,024 numbers]</code></div>
  </div>;
  if (step === 6) return <div className="rd-store">
    <div className="rd-table" role="table">
      <div className="head" role="row"><span>id</span><span>{say(t('vector', 'المتجه'))}</span><span>{say(t('text', 'النص'))}</span><span>{say(t('metadata', 'البيانات الوصفية'))}</span></div>
      {[['U-BS-3', t('In Dhofar it grows on dry slopes…', 'تنمو في ظفار على المنحدرات…'), 'species · p. 112'], ['U-BS-4', t('The resin is collected by…', 'يُجمع الراتنج بإحداث…'), 'species · p. 113'],
        ['T-014-3', t('The older men walked around…', 'يطوف كبار الرجال…'), 'story · Salalah']].map(([id, text, meta], index) =>
        <div key={id as string} role="row" style={delay(index, 0.35)}><code dir="ltr">{id as string}</code><VectorBars values={noise(id as string, 10)}/><span>{say(text as Text)}</span><small dir="ltr">{meta as string}</small></div>)}
    </div>
    <svg viewBox="0 0 220 120" className="rd-hnsw" role="img" aria-label="HNSW">
      {[[30, 30, 80, 20], [80, 20, 130, 50], [130, 50, 190, 30], [30, 30, 60, 90], [60, 90, 130, 50], [130, 50, 160, 100], [60, 90, 110, 105], [110, 105, 160, 100]].map(([x1, y1, x2, y2], index) =>
        <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} style={delay(index, 0.1)}/>)}
      {[[30, 30], [80, 20], [130, 50], [190, 30], [60, 90], [160, 100], [110, 105]].map(([x, y], index) => <circle key={index} cx={x} cy={y} r="6"/>)}
      <circle className="new" cx="98" cy="68" r="7"/><line className="new" x1="98" y1="68" x2="130" y2="50"/><line className="new" x1="98" y1="68" x2="60" y2="90"/>
      <text x="110" y="116" textAnchor="middle">{say(t('HNSW index: a new vector joins its neighbours', 'فهرس HNSW: متجه جديد ينضم إلى جيرانه'))}</text>
    </svg>
  </div>;
  return <div className="rd-ready">
    {[[t('documents', 'وثائق'), '3'], [t('chunks', 'مقاطع'), '412'], [t('vectors', 'متجهات'), '412'], [t('numbers per vector', 'رقمًا لكل متجه'), '1,024']].map(([name, value], index) =>
      <div key={(name as Text).en} className="rd-stat" style={delay(index, 0.2)}><b dir="ltr">{value as string}</b><span>{say(name as Text)}</span></div>)}
    <div className="rd-loop">{[t('new / corrected document', 'وثيقة جديدة / مصحَّحة'), t('delete old rows by doc_id', 'احذف الصفوف القديمة بـ doc_id'), t('extract → chunk → embed', 'استخراج ← تقطيع ← تضمين'), t('insert', 'إدراج')].map((item, index) =>
      <span key={item.en} style={delay(index, 0.2)}>{say(item)}</span>)}</div>
    <p className="rd-ready-note"><Icon name="check" size={14}/>{say(t('No retraining: the language model is untouched.', 'دون إعادة تدريب: النموذج اللغوي لا يُمس.'))}</p>
  </div>;
}

export function IndexScene() {
  return <FlowScene id="ft-scene-index" title={t('Indexing: how documents enter the archive', 'الفهرسة: كيف تدخل الوثائق إلى الأرشيف')} tone="#60a5fa"
    stations={INDEX_STATIONS} steps={INDEX_STEPS}>{step => <IndexVisual step={step}/>}</FlowScene>;
}

// --------------------------------------------------- scene 2: answering (online)

const QUERY_STATIONS: { icon: IconName; name: Text }[] = [
  { icon: 'help', name: t('Question', 'السؤال') }, { icon: 'code', name: t('Tokenize', 'الترميز') }, { icon: 'chip', name: t('Embed', 'التضمين') },
  { icon: 'sliders', name: t('Filter', 'التصفية') }, { icon: 'search', name: t('Search', 'البحث') }, { icon: 'chart', name: t('Rerank', 'إعادة الترتيب') },
  { icon: 'file', name: t('Prompt', 'التلقين') }, { icon: 'check', name: t('Answer', 'الإجابة') },
];

const QUERY_STEPS: FlowStep[] = [
  { station: 0, title: t('A question arrives', 'يصل سؤال'),
    text: t('Answering happens every time someone asks. In UTAS-70 the species name comes from YOLO; the user adds the question.',
      'تحدث الإجابة في كل مرة يسأل فيها أحد. وفي UTAS-70 يأتي اسم النوع من YOLO، ويضيف المستخدم السؤال.') },
  { station: 1, title: t('The question becomes tokens', 'يتحول السؤال إلى رموز'),
    text: t('The question goes through the same tokenizer as the documents, with the same normalisation. Different tokenizers would give numbers that do not match.',
      'يمر السؤال عبر المقطِّع نفسه الذي مرت به الوثائق، وبالتوحيد الإملائي نفسه. فالمقطِّعات المختلفة تعطي أرقامًا لا تتطابق.') },
  { station: 2, title: t('…and one vector, in the same space', '…ثم متجهًا واحدًا في الفضاء نفسه'),
    text: t('The same embedding model turns the question into a vector. Because questions and chunks live in the same space, “close” means “about the same thing”.',
      'يحوّل نموذج التضمين نفسه السؤال إلى متجه. ولأن الأسئلة والمقاطع في الفضاء نفسه، فـ “قريب” تعني “عن الشيء نفسه”.'),
    note: t('Some embedding models expect a prefix such as “query:” for questions and “passage:” for chunks. Follow the model card.', 'بعض نماذج التضمين تتوقع بادئة مثل “query:” للأسئلة و“passage:” للمقاطع. اتبع بطاقة النموذج.') },
  { station: 3, title: t('Filter by metadata first', 'صفِّ بالبيانات الوصفية أولًا'),
    text: t('Only chunks whose metadata says species = Boswellia sacra stay in the race. Stories, myrrh and desert rose are set aside before any similarity is computed.',
      'لا يبقى في السباق إلا المقاطع التي تقول بياناتها الوصفية إن النوع = Boswellia sacra. وتُستبعد القصص والمُرّ ووردة الصحراء قبل حساب أي تشابه.') },
  { station: 4, title: t('Nearest neighbours', 'أقرب الجيران'),
    text: t('The index returns the k chunks whose vectors point most nearly in the same direction as the question’s: cosine similarity, from −1 to 1.',
      'يعيد الفهرس k مقطعًا تشير متجهاتها في أقرب اتجاه لمتجه السؤال: تشابه جيب التمام، من −1 إلى 1.'),
    note: t('Retrieve generously (k = 10–20) at this stage; the reranker will choose the best few.', 'استرجع بسخاء (k = 10–20) في هذه المرحلة؛ وسيختار مُعيد الترتيب أفضل القليل.') },
  { station: 5, title: t('Hybrid search and reranking', 'البحث الهجين وإعادة الترتيب'),
    text: t('Keyword search (BM25) runs in parallel to catch exact names, and the two lists are fused. Then a reranker reads the question and each chunk together and gives a sharper score: “used for” now points clearly at the uses passage.',
      'يجري البحث بالكلمات المفتاحية (BM25) بالتوازي ليلتقط الأسماء الدقيقة، وتُدمج القائمتان. ثم يقرأ مُعيد الترتيب السؤال وكل مقطع معًا ويعطي درجة أدق: فـ “يُستخدم” تشير الآن بوضوح إلى مقطع الاستخدامات.'),
    note: t('Fusion: reciprocal rank fusion (RRF). Reranker: a cross-encoder such as bge-reranker. Keep only scores above a threshold.', 'الدمج: دمج الرتب التبادلي (RRF). ومُعيد الترتيب: مُرمِّز متقاطع مثل bge-reranker. واحتفظ بالدرجات فوق العتبة فقط.') },
  { station: 6, title: t('Build the prompt with numbered sources', 'ابنِ التلقين بمصادر مرقّمة'),
    text: t('The best chunks are placed in the prompt, each with a number and its source, after the rules: answer only from the sources, cite them by number, say when the answer is not there.',
      'توضع أفضل المقاطع في التلقين، كلٌّ برقم ومصدر، بعد القواعد: أجب من المصادر فقط، واستشهد بها بأرقامها، وقل حين لا تكون الإجابة فيها.') },
  { station: 7, title: t('A grounded, cited answer', 'إجابة مؤسَّسة وموثَّقة'),
    text: t('The (fine-tuned) model writes the answer from the passages and keeps the numbers. The application turns each number into a full reference the user can check.',
      'يكتب النموذج (المضبوط) الإجابة من المقاطع ويحتفظ بالأرقام. ويحوّل التطبيق كل رقم إلى مرجع كامل يستطيع المستخدم التحقق منه.') },
];

const Q_TEXT = t('What is frankincense resin used for?', 'فيمَ يُستخدم راتنج اللبان؟');
const VECTOR_ORDER = [
  { id: 'U-BS-harvest', name: t('collecting the resin', 'جمع الراتنج'), vector: 0.93, rerank: 0.88 },
  { id: 'U-BS-uses', name: t('uses', 'الاستخدامات'), vector: 0.91, rerank: 0.97 },
  { id: 'U-BS-place', name: t('where it grows', 'أين ينمو'), vector: 0.8, rerank: 0.21 },
];

function RerankList() {
  const say = useTx();
  const [done, setDone] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => setDone(true), 1400); return () => window.clearTimeout(timer); }, []);
  const order = [...VECTOR_ORDER].sort((a, b) => done ? b.rerank - a.rerank : b.vector - a.vector);
  return <div className="rd-rerank">
    <div className="rd-rerank-head"><span>{say(t('vector + keyword (fused)', 'متجهات + كلمات (مدموجة)'))}</span><Icon name="next" size={12}/><span className={done ? 'on' : ''}>{say(t('reranker', 'مُعيد الترتيب'))}</span></div>
    <div className="rd-ladder">
      {VECTOR_ORDER.map(item => {
        const rank = order.indexOf(item);
        return <div key={item.id} className={cls('rd-rung', done && item.rerank < 0.5 && 'cut')} style={{ transform: `translateY(${rank * 52}px)` }}>
          <b dir="ltr">#{rank + 1}</b><span><code dir="ltr">{item.id}</code>{say(item.name)}</span>
          <em dir="ltr">{done ? item.rerank.toFixed(2) : item.vector.toFixed(2)}</em>
        </div>;
      })}
    </div>
    <small className={done ? 'on' : ''}>{say(t('kept: score ≥ 0.50 → 2 passages', 'المُبقى: الدرجة ≥ 0.50 ← مقطعان'))}</small>
  </div>;
}

function QueryMap({ step }: { step: number }) {
  const say = useTx();
  const query = QUERIES[1];
  const keep = (id: string) => id.startsWith('U-BS');
  const near = CORPUS.filter(chunk => keep(chunk.id)).map(chunk => ({ chunk, d: Math.hypot(chunk.x - query.x, chunk.y - query.y) })).sort((a, b) => a.d - b.d);
  return <svg viewBox="0 0 330 240" className="rd-map" role="img" aria-label={say(t('Vector space with the question', 'فضاء المتجهات مع السؤال'))}>
    <rect x="2" y="2" width="326" height="236" rx="14" className="bg"/>
    <text x="14" y="20" className="lab">{say(t('embedding space (squeezed to 2-D)', 'فضاء التضمين (مضغوطًا إلى بُعدين)'))}</text>
    {step >= 4 && near.map(({ chunk }, index) => <line key={chunk.id} className="rd-ray" x1={query.x} y1={query.y} x2={chunk.x} y2={chunk.y} style={delay(index, 0.25)}/>)}
    {CORPUS.map(chunk => <g key={chunk.id} className={cls('rd-pt', chunk.collection, step >= 3 && !keep(chunk.id) && 'out', step >= 4 && keep(chunk.id) && 'hit')}>
      <circle cx={chunk.x} cy={chunk.y} r="7"/><text x={chunk.x} y={chunk.y - 11} textAnchor="middle" direction="ltr">{chunk.id.replace('U-', '').replace('T-', '')}</text>
    </g>)}
    <g className="rd-star"><circle cx={query.x} cy={query.y} r="16" className="halo"/><path d={`M ${query.x} ${query.y - 9} l 3 6 l 6 1 l -4.5 4.5 l 1 6.5 l -5.5 -3 l -5.5 3 l 1 -6.5 l -4.5 -4.5 l 6 -1 z`}/></g>
    {step >= 3 && <text x="14" y="228" className="lab filter" direction="ltr">filter: species = Boswellia sacra</text>}
    <g className="legend"><circle cx="220" cy="16" r="5" className="turath"/><text x="229" y="20">TurathAI</text><circle cx="276" cy="16" r="5" className="utas"/><text x="285" y="20">UTAS-70</text></g>
  </svg>;
}

function QueryVisual({ step }: { step: number }) {
  const say = useTx();
  const { isArabic } = useI18n();
  const question = isArabic ? Q_TEXT.ar : Q_TEXT.en;
  const qVector = useMemo(() => noise('q-uses', 24), []);
  const cVector = useMemo(() => noise('q-uses', 24).map((value, index) => value * 0.85 + noise('chunk-uses', 24)[index] * 0.15), []);
  if (step === 0) return <div className="rd-ask">
    <span className="rd-yolo"><Icon name="grid" size={14}/>YOLO → <i dir="ltr">Boswellia sacra · 0.89</i></span>
    <div className="rd-typing"><Icon name="help" size={16}/><span style={{ '--chars': question.length } as CSSProperties}>{question}</span></div>
  </div>;
  if (step === 1) return <div className="rd-tokenize"><p className="rd-chunk-text">“{question}”</p><TokenChips text={question}/>
    <span className="rd-count">{say(t('same tokenizer as the documents', 'المقطِّع نفسه الذي للوثائق'))}</span></div>;
  if (step === 2) return <div className="rd-compare">
    <div><b>{say(t('question vector', 'متجه السؤال'))}</b><VectorBars values={qVector} tone="#facc15"/></div>
    <div><b>{say(t('the “uses” chunk’s vector', 'متجه مقطع “الاستخدامات”'))}</b><VectorBars values={cVector}/></div>
    <p dir="ltr" className="rd-cos">cos(q, chunk) = {cosine(qVector.map(v => v / Math.hypot(...qVector)), cVector.map(v => v / Math.hypot(...cVector))).toFixed(2)}</p>
  </div>;
  if (step === 3 || step === 4) return <QueryMap step={step}/>;
  if (step === 5) return <RerankList/>;
  if (step === 6) return <div className="rd-prompt">
    <span className="rules">{say(t('Rules: answer only from the sources · cite them as [1], [2] · if the answer is not there, say so', 'القواعد: أجب من المصادر فقط · استشهد بها [1]، [2] · وإن لم تكن الإجابة فيها فقل ذلك'))}</span>
    <span className="src" style={delay(1, 0.3)}><b>[1]</b> {say(t('The dried resin is burned as incense and used in traditional practices.', 'يُحرق الراتنج الجاف بخورًا ويُستخدم في الممارسات التقليدية.'))} <small dir="ltr">Source A, p. 113</small></span>
    <span className="src" style={delay(2, 0.3)}><b>[2]</b> {say(t('Small cuts are made in the bark; the sap hardens into tears over several weeks.', 'تُحدث جروح صغيرة في اللحاء، فتتصلب العصارة إلى حبيبات خلال أسابيع.'))} <small dir="ltr">Field notes 3</small></span>
    <span className="q" style={delay(3, 0.3)}>{say(t('Question:', 'السؤال:'))} {question}</span>
  </div>;
  return <div className="rd-final">
    <p>{say(t('Frankincense resin is collected through small cuts in the bark', 'يُجمع راتنج اللبان عبر جروح صغيرة في اللحاء'))} <sup>[2]</sup>{say(t(', and once dry it is burned as incense and used in traditional practices', '، وبعد أن يجف يُحرق بخورًا ويُستخدم في الممارسات التقليدية'))} <sup>[1]</sup>.</p>
    <ol>
      <li style={delay(1, 0.3)} dir="ltr">[1] Source A — Flora of Dhofar, p. 113 · chunk U-BS-uses</li>
      <li style={delay(2, 0.3)} dir="ltr">[2] Field notes 3 — harvest season survey · chunk U-BS-harvest</li>
    </ol>
    <span className="rd-guard" style={delay(3, 0.3)}><Icon name="help" size={13}/>{say(t('If no passage had passed the threshold, the answer would be: “My sources do not say.”', 'لو لم يتجاوز أي مقطع العتبة، لكانت الإجابة: “مصادري لا تذكر ذلك.”'))}</span>
  </div>;
}

export function QueryScene() {
  return <FlowScene id="ft-scene-query" title={t('Answering: how a question finds its sources', 'الإجابة: كيف يجد السؤال مصادره')} tone="#facc15"
    stations={QUERY_STATIONS} steps={QUERY_STEPS}>{step => <QueryVisual step={step}/>}</FlowScene>;
}

// ================================================================= the tools

/** What RAG is, why it is needed, and its two phases. */
export function RagIntro() {
  const say = useTx();
  const [phase, setPhase] = useState<'index' | 'answer'>('index');
  const [mode, setMode] = useState<'closed' | 'open'>('open');
  const index: Text[] = [t('upload', 'رفع'), t('extract', 'استخراج'), t('clean', 'تنظيف'), t('chunk', 'تقطيع'), t('tokenize', 'ترميز'), t('embed', 'تضمين'), t('store', 'تخزين')];
  const answer: Text[] = [t('question', 'سؤال'), t('tokenize', 'ترميز'), t('embed', 'تضمين'), t('filter + search', 'تصفية + بحث'), t('rerank', 'إعادة ترتيب'), t('prompt', 'تلقين'), t('cited answer', 'إجابة موثقة')];
  return <div className="rd-intro">
    <Heading icon="bulb" first>{say(t('What is RAG?', 'ما RAG؟'))}</Heading>
    <p className="rd-definition">{say(RAG_DEFINITION)}</p>
    <div className="rd-exam">
      <div className="ft-tabs" role="group" aria-label={say(t('Exam', 'الامتحان'))}>
        <button type="button" className={mode === 'closed' ? 'current' : ''} aria-pressed={mode === 'closed'} onClick={() => setMode('closed')}>{say(t('Closed-book exam (no RAG)', 'امتحان بلا كتاب (دون RAG)'))}</button>
        <button type="button" className={mode === 'open' ? 'current' : ''} aria-pressed={mode === 'open'} onClick={() => setMode('open')}>{say(t('Open-book exam (RAG)', 'امتحان بالكتاب (RAG)'))}</button>
      </div>
      <div className={cls('rd-exam-card', mode)} data-testid="rag-exam">
        <b>{say(t('“What is frankincense resin used for in Dhofar?”', '“فيمَ يُستخدم راتنج اللبان في ظفار؟”'))}</b>
        <p>{say(mode === 'closed'
          ? t('“Frankincense is used across Arabia and Africa for medicine, perfume and religious rituals, and it is exported worldwide.” Fluent, general, partly guessed, and no source.', '“يُستخدم اللبان في أنحاء الجزيرة العربية وأفريقيا للطب والعطور والطقوس الدينية، ويُصدَّر إلى العالم.” سلس وعام ومخمَّن جزئيًا، ودون مصدر.')
          : t('“In Dhofar the dried resin is burned as incense and used in traditional practices [1]; it is collected through small cuts in the bark [2].” Specific, checkable, cited.', '“في ظفار يُحرق الراتنج الجاف بخورًا ويُستخدم في الممارسات التقليدية [1]، ويُجمع عبر جروح صغيرة في اللحاء [2].” محدد وقابل للتحقق وموثَّق.'))}</p>
        <small>{say(mode === 'closed' ? t('The model answers from memory: whatever it absorbed in training.', 'يجيب النموذج من ذاكرته: مما امتصه في التدريب.') : t('The model answers from passages it was handed a second ago.', 'يجيب النموذج من مقاطع سُلّمت إليه قبل لحظة.'))}</small>
      </div>
    </div>
    <h5 className="pc-h5">{say(t('Why we need it', 'لماذا نحتاج إليه'))}</h5>
    <div className="rd-reasons">
      {RAG_REASONS.map((reason, number) => <article key={reason.title.en} style={delay(number, 0.1)}>
        <b>{say(reason.title)}</b><p className="problem">{say(reason.problem)}</p><p className="fix"><Icon name="check" size={12}/>{say(reason.fix)}</p>
      </article>)}
    </div>
    <h5 className="pc-h5">{say(t('Two phases, two times', 'مرحلتان في وقتين'))}</h5>
    <div className="ft-tabs" role="group" aria-label={say(t('Phase', 'المرحلة'))}>
      <button type="button" className={phase === 'index' ? 'current' : ''} aria-pressed={phase === 'index'} onClick={() => setPhase('index')}>{say(t('1 · Indexing (once, offline)', '1 · الفهرسة (مرة واحدة، دون اتصال)'))}</button>
      <button type="button" className={phase === 'answer' ? 'current' : ''} aria-pressed={phase === 'answer'} onClick={() => setPhase('answer')}>{say(t('2 · Answering (every question)', '2 · الإجابة (مع كل سؤال)'))}</button>
    </div>
    <ol className={cls('rd-phase', phase)} key={phase}>{(phase === 'index' ? index : answer).map((item, number) => <li key={item.en} style={delay(number, 0.08)}><span dir="ltr">{number + 1}</span>{say(item)}</li>)}</ol>
    <p className="pc-note"><Icon name="bulb" size={13}/>{say(t('RAG and fine-tuning are partners, not rivals: RAG supplies the facts at answer time, fine-tuning teaches the model how to use them. Both student projects use both.',
      'RAG والضبط الدقيق شريكان لا متنافسان: يقدّم RAG الحقائق وقت الإجابة، ويعلّم الضبط الدقيق النموذج كيف يستخدمها. وكلا المشروعين الطلابيين يستخدمان الاثنين.'))}</p>
    <PartLink part={10}/>
  </div>;
}

// ----------------------------------------------------------- chunking lab

interface Word { text: string; section: number; sentence: number }
interface Chunk { start: number; end: number; section: number | null }

function chunkDoc(words: Word[], mode: ChunkMode, size: number, overlap: number): Chunk[] {
  const chunks: Chunk[] = [];
  if (mode === 'fixed') {
    const stride = Math.max(1, size - overlap);
    for (let start = 0; start < words.length; start += stride) {
      chunks.push({ start, end: Math.min(words.length, start + size), section: null });
      if (start + size >= words.length) break;
    }
    return chunks;
  }
  // sentence spans: [start, end) per sentence, with section
  const spans: { start: number; end: number; section: number }[] = [];
  words.forEach((word, index) => {
    const last = spans[spans.length - 1];
    if (last && words[last.start].sentence === word.sentence && words[last.start].section === word.section) last.end = index + 1;
    else spans.push({ start: index, end: index + 1, section: word.section });
  });
  let group: typeof spans = [];
  const flush = () => { if (group.length) chunks.push({ start: group[0].start, end: group[group.length - 1].end, section: mode === 'section' ? group[0].section : null }); };
  spans.forEach(span => {
    const length = group.length ? span.end - group[0].start : 0;
    const crosses = mode === 'section' && group.length > 0 && group[0].section !== span.section;
    if (group.length && (length > size || crosses)) {
      flush();
      const carry = overlap > 0 && !crosses ? group[group.length - 1] : null;
      group = carry && carry.end - carry.start <= overlap + 4 ? [carry] : [];
    }
    group.push(span);
  });
  flush();
  return chunks;
}

const PALETTE = ['#60a5fa', '#5ef2a0', '#f9a8d4', '#facc15', '#a78bfa', '#2dd4bf', '#fb923c', '#93c5fd'];

/** Cut a real document into chunks and see what the size, overlap and strategy do. */
export function ChunkingLab() {
  const say = useTx();
  const { isArabic } = useI18n();
  const [docKey, setDocKey] = useState('utas');
  const [mode, setMode] = useState<ChunkMode>('fixed');
  const [size, setSize] = useState(25);
  const [overlapShare, setOverlapShare] = useState(0);
  const [open, setOpen] = useState(0);
  const doc = SAMPLE_DOCS.find(item => item.key === docKey)!;
  const words = useMemo(() => doc.sections.flatMap((section, sectionIndex) => section.sentences.flatMap((sentence, sentenceIndex) =>
    (isArabic ? sentence.ar : sentence.en).split(/\s+/).filter(Boolean).map(text => ({ text, section: sectionIndex, sentence: sentenceIndex })))), [doc, isArabic]);
  const overlap = Math.round(size * overlapShare / 100);
  const chunks = useMemo(() => chunkDoc(words, mode, size, overlap), [words, mode, size, overlap]);
  const [answerSection, answerSentences] = doc.answer;
  const answerIdx = words.map((word, index) => word.section === answerSection && answerSentences.includes(word.sentence) ? index : -1).filter(index => index >= 0);
  const aStart = answerIdx[0];
  const aEnd = answerIdx[answerIdx.length - 1] + 1;
  const whole = chunks.findIndex(chunk => chunk.start <= aStart && chunk.end >= aEnd);
  const partial = chunks.map((chunk, index) => chunk.start < aEnd && chunk.end > aStart ? index : -1).filter(index => index >= 0);
  const tokensPerWord = isArabic ? 1.8 : 1.3;
  const chosen = chunks[Math.min(open, chunks.length - 1)];
  const sectionStarts = doc.sections.map((_, sectionIndex) => words.findIndex(word => word.section === sectionIndex));
  const verdict = whole >= 0
    ? t(`Chunk ${whole + 1} holds the whole answer, so one retrieved chunk is enough.`, `المقطع ${whole + 1} يحوي الإجابة كاملة، فيكفي استرجاع مقطع واحد.`)
    : t(`The answer is split across chunks ${partial.map(index => index + 1).join(' and ')}. If the search returns only one of them, the model gets half the answer.`,
      `الإجابة مقسومة بين المقاطع ${partial.map(index => index + 1).join(' و ')}. وإن أعاد البحث أحدها فقط، تلقى النموذج نصف الإجابة.`);
  const sizeNote = size < 22
    ? t('Very small chunks lose their context: a chunk like “it hardens into tears” no longer says which plant or which story.', 'المقاطع الصغيرة جدًا تفقد سياقها: فمقطع مثل “تتصلب إلى حبيبات” لم يعد يقول أي نبات أو أي قصة.')
    : size > 70
      ? t('Very large chunks mix several topics into one vector, so they match many questions weakly and fill the prompt with text the question did not need.', 'المقاطع الكبيرة جدًا تخلط مواضيع عدة في متجه واحد، فتطابق أسئلة كثيرة مطابقة ضعيفة، وتملأ التلقين بنص لم يحتجه السؤال.')
      : t('A balanced size: each chunk is about one idea, and still says what it is about.', 'حجم متوازن: كل مقطع عن فكرة واحدة تقريبًا، وما زال يقول عمّ يتحدث.');
  const total = words.length;
  return <div className="rd-chunk">
    <Heading icon="grid">{say(t('The chunking lab: how to slice a document', 'مختبر التقطيع: كيف تُقسَّم الوثيقة'))}</Heading>
    <div className="rd-controls">
      <div className="ft-tabs" role="group" aria-label={say(t('Document', 'الوثيقة'))}>
        {SAMPLE_DOCS.map(item => <button key={item.key} type="button" className={docKey === item.key ? 'current' : ''} aria-pressed={docKey === item.key}
          onClick={() => { setDocKey(item.key); setOpen(0); }}>{say(item.title)}</button>)}
      </div>
      <div className="ft-tabs" role="group" aria-label={say(t('Strategy', 'الطريقة'))}>
        {CHUNK_MODES.map(item => <button key={item.key} type="button" className={mode === item.key ? 'current' : ''} aria-pressed={mode === item.key}
          onClick={() => { setMode(item.key); setOpen(0); }}>{say(item.name)}</button>)}
      </div>
      <p className="rd-how">{say(CHUNK_MODES.find(item => item.key === mode)!.how)}</p>
      <div className="rd-sliders">
        <label className="pc-slider">{say(t('Chunk size (words)', 'حجم المقطع (كلمات)'))} <b data-testid="chunk-size">{size}</b>
          <input type="range" min="10" max="100" step="5" value={size} onChange={event => { setSize(Number(event.target.value)); setOpen(0); }}/></label>
        <label className="pc-slider">{say(t('Overlap', 'التداخل'))} <b>{overlapShare}% · {overlap}</b>
          <input type="range" min="0" max="40" step="10" value={overlapShare} onChange={event => setOverlapShare(Number(event.target.value))}/></label>
      </div>
    </div>
    <div className="rd-ribbon" aria-label={say(t('Where each chunk sits in the document', 'موقع كل مقطع في الوثيقة'))}>
      <div className="rd-answer-band" style={{ insetInlineStart: `${aStart / total * 100}%`, width: `${(aEnd - aStart) / total * 100}%` }}><span>{say(t('answer', 'الإجابة'))}</span></div>
      {sectionStarts.map((start, index) => <i key={index} className="rd-sec" style={{ insetInlineStart: `${start / total * 100}%` }}><em>{say(doc.sections[index].heading)}</em></i>)}
      {chunks.map((chunk, index) => <button key={`${chunk.start}-${index}`} type="button" className={cls('rd-seg', index === open && 'on', index === whole && 'whole', partial.includes(index) && whole < 0 && 'part')}
        style={{ insetInlineStart: `${chunk.start / total * 100}%`, width: `${(chunk.end - chunk.start) / total * 100}%`, top: `${34 + (index % 2) * 20}px`, '--seg': PALETTE[index % PALETTE.length] } as CSSProperties}
        onClick={() => setOpen(index)} aria-label={say(t(`Chunk ${index + 1}`, `المقطع ${index + 1}`))}>{index + 1}</button>)}
    </div>
    <div className="rd-chunk-stats" data-testid="chunk-stats">
      <span><b>{chunks.length}</b>{say(t('chunks', 'مقاطع'))}</span>
      <span><b>≈{Math.round(size * tokensPerWord)}</b>{say(t('tokens per chunk', 'رمزًا لكل مقطع'))}</span>
      <span className={whole >= 0 ? 'good' : 'bad'}><b>{whole >= 0 ? '✓' : '✕'}</b>{say(t('answer in one chunk', 'الإجابة في مقطع واحد'))}</span>
    </div>
    <p className={cls('pc-kind', whole < 0 && 'missing')} data-testid="chunk-verdict"><b>{say(t('Test question:', 'سؤال الاختبار:'))}</b> {say(doc.question)} {say(verdict)}</p>
    <p className="rd-size-note">{say(sizeNote)}</p>
    {chosen && <div className="rd-open">
      <div className="rd-open-text" style={{ '--seg': PALETTE[open % PALETTE.length] } as CSSProperties}>
        <b>{say(t(`Chunk ${open + 1}`, `المقطع ${open + 1}`))}</b>
        {mode === 'section' && chosen.section !== null && <span className="rd-ctx">{say(doc.sections[chosen.section].heading)} · <bdi>{say(doc.title)}</bdi></span>}
        <p>{words.slice(chosen.start, chosen.end).map((word, index) => {
          const at = chosen.start + index;
          const shared = chunks.some((other, otherIndex) => otherIndex !== open && other.start <= at && other.end > at);
          return <span key={at} className={cls(at >= aStart && at < aEnd && 'ans', shared && 'shared')}>{word.text} </span>;
        })}</p>
      </div>
      <JsonCode text={JSON.stringify({
        chunk_id: `${docKey === 'utas' ? 'U-BS' : 'T-014'}-${open + 1}`, doc: doc.source,
        section: chosen.section !== null ? doc.sections[chosen.section].heading.en : 'n/a',
        prev: open > 0 ? `${docKey === 'utas' ? 'U-BS' : 'T-014'}-${open}` : null,
        next: open < chunks.length - 1 ? `${docKey === 'utas' ? 'U-BS' : 'T-014'}-${open + 2}` : null,
        words: chosen.end - chosen.start,
      })}/>
    </div>}
    <p className="pc-note"><Icon name="bulb" size={13}/>{say(t('Real documents are longer, so real chunks are larger: a common start is 200–500 tokens with 10–20% overlap. Choose with evidence: write 20 test questions, chunk two or three ways, and keep the setting whose top results contain the answers most often. Shaded words are shared with a neighbour (overlap); gold words are the answer.',
      'الوثائق الحقيقية أطول، فالمقاطع الحقيقية أكبر: بداية شائعة 200–500 رمز مع تداخل 10–20٪. واختر بالدليل: اكتب 20 سؤال اختبار، وقطّع بطريقتين أو ثلاث، واحتفظ بالإعداد الذي تحوي نتائجه الأولى الإجابات أكثر. والكلمات المظللة مشتركة مع الجار (تداخل)، والذهبية هي الإجابة.'))}</p>
  </div>;
}

// ---------------------------------------------------- tokens → vectors tool

/** Text → tokens → ids → embedding → vector, and why ids are not meaning. */
export function TokensToVectors() {
  const say = useTx();
  const [pick, setPick] = useState(0);
  const vectors = useMemo(() => SENTENCES.map((sentence, index) => embed(sentence.weights, `s${index}`)), []);
  const chosen = SENTENCES[pick];
  const sims = vectors.map(vector => cosine(vectors[pick], vector));
  return <div className="rd-vectors">
    <Heading icon="chip">{say(t('From text to tokens to a vector', 'من النص إلى الرموز إلى المتجه'))}</Heading>
    <div className="ft-tabs rd-sentences" role="group" aria-label={say(t('Sentence', 'الجملة'))}>
      {SENTENCES.map((sentence, index) => <button key={sentence.text.en} type="button" className={pick === index ? 'current' : ''} aria-pressed={pick === index}
        onClick={() => setPick(index)}><bdi>{sentence.text.en}</bdi></button>)}
    </div>
    <div className="rd-pipe" key={pick}>
      <div className="rd-pipe-step"><span className="n">1</span><b>{say(t('Tokens and their IDs', 'الرموز وأرقامها'))}</b><TokenChips text={chosen.text.en}/>
        <small>{say(t('IDs are positions in the vocabulary. They carry no meaning: “resin” and “sap” get unrelated numbers.', 'الأرقام مواقع في المفردات ولا تحمل معنى: فـ “resin” و“sap” تأخذان رقمين لا علاقة بينهما.'))}</small></div>
      <div className="rd-pipe-step"><span className="n">2</span><b>{say(t('Embedding model', 'نموذج التضمين'))}</b>
        <div className="rd-encoder small">{[0, 1, 2, 3].map(index => <i key={index} style={delay(index, 0.15)}/>)}</div>
        <small>{say(t('Every layer mixes each token with its context; the token vectors are then averaged into one.', 'تمزج كل طبقة كل رمز بسياقه، ثم تُحسب المتوسطات لتصير متجهًا واحدًا.'))}</small></div>
      <div className="rd-pipe-step"><span className="n">3</span><b>{say(t('The vector (16 of 1,024 numbers shown)', 'المتجه (16 من 1,024 رقمًا معروضة)'))}</b><VectorBars values={vectors[pick]}/>
        <code dir="ltr" data-testid="vector-preview">[{vectors[pick].slice(0, 4).map(value => value.toFixed(2)).join(', ')}, …]</code></div>
    </div>
    <h5 className="pc-h5">{say(t('Cosine similarity: how close is the meaning?', 'تشابه جيب التمام: ما مدى قرب المعنى؟'))}</h5>
    <div className="rd-sims" data-testid="similarities">
      {SENTENCES.map((sentence, index) => <div key={sentence.text.en} className={cls('rd-sim', index === pick && 'self')}>
        <bdi>{sentence.text.en}</bdi>
        <span className="track"><i style={{ width: `${Math.max(0, sims[index]) * 100}%` }}/></span>
        <b dir="ltr">{sims[index].toFixed(2)}</b>
      </div>)}
    </div>
    <p className="pc-note"><Icon name="bulb" size={13}/>{say(t('The two English sentences about resin share almost no words, and one Arabic sentence shares none, yet their vectors are close. The camel sentence is far away. This is why RAG searches by meaning, not by spelling. The numbers here are computed in your browser to behave like a real multilingual model.',
      'الجملتان الإنجليزيتان عن الراتنج لا تشتركان تقريبًا في أي كلمة، والجملة العربية لا تشترك في أي كلمة، ومع ذلك متجهاتها متقاربة. أما جملة الجمل فبعيدة. لهذا يبحث RAG بالمعنى لا بالإملاء. والأرقام هنا تُحسب في متصفحك لتتصرف كنموذج حقيقي متعدد اللغات.'))}</p>
  </div>;
}

// ---------------------------------------------------------- the search lab

const RRF_K = 60;

/** Search a small archive from both projects: filter, k, threshold, and hybrid keyword search. */
export function SearchLab() {
  const say = useTx();
  const [pick, setPick] = useState(1);
  const [collection, setCollection] = useState<'all' | Collection>('all');
  const [k, setK] = useState(3);
  const [threshold, setThreshold] = useState(0.6);
  const [hybrid, setHybrid] = useState(false);
  const query = QUERIES[pick];
  const pool = CORPUS.filter(chunk => collection === 'all' || chunk.collection === collection);
  const vector = pool.map(chunk => ({ chunk, score: Math.max(0, 1 - Math.hypot(chunk.x - query.x, chunk.y - query.y) / 140) })).sort((a, b) => b.score - a.score);
  const keyword = pool.filter(chunk => chunk.terms.some(term => query.terms.includes(term)));
  const fused = new Map<string, number>();
  vector.forEach((item, rank) => fused.set(item.chunk.id, 1 / (RRF_K + rank + 1)));
  keyword.forEach((chunk, rank) => fused.set(chunk.id, (fused.get(chunk.id) ?? 0) + 1 / (RRF_K + rank + 1)));
  const passes = (id: string) => (vector.find(item => item.chunk.id === id)?.score ?? 0) >= threshold || (hybrid && keyword.some(chunk => chunk.id === id));
  const ranked = (hybrid ? [...fused.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id) : vector.map(item => item.chunk.id)).filter(passes).slice(0, k);
  const scoreOf = (id: string) => vector.find(item => item.chunk.id === id)?.score ?? 0;
  return <div className="rd-search">
    <Heading icon="search">{say(t('The search lab: two projects, one archive', 'مختبر البحث: مشروعان وأرشيف واحد'))}</Heading>
    <div className="ft-tabs" role="group" aria-label={say(t('Question', 'السؤال'))}>
      {QUERIES.map((item, index) => <button key={item.text.en} type="button" className={pick === index ? 'current' : ''} aria-pressed={pick === index} onClick={() => setPick(index)}>{say(item.text)}</button>)}
    </div>
    <div className="rd-search-controls">
      <div className="ft-tabs" role="group" aria-label={say(t('Metadata filter', 'التصفية'))}>
        <span className="pc-label">{say(t('filter', 'التصفية'))}</span>
        {(['all', 'turath', 'utas'] as const).map(key => <button key={key} type="button" className={collection === key ? 'current' : ''} aria-pressed={collection === key}
          onClick={() => setCollection(key)}>{key === 'all' ? say(t('all', 'الكل')) : key === 'turath' ? 'TurathAI' : 'UTAS-70'}</button>)}
      </div>
      <label className="pc-slider">top-k <b>{k}</b><input type="range" min="1" max="5" value={k} onChange={event => setK(Number(event.target.value))}/></label>
      <label className="pc-slider">{say(t('threshold', 'العتبة'))} <b>{threshold.toFixed(2)}</b><input type="range" min="0.3" max="0.9" step="0.05" value={threshold} onChange={event => setThreshold(Number(event.target.value))}/></label>
      <label className="pc-check"><input type="checkbox" checked={hybrid} onChange={event => setHybrid(event.target.checked)}/>{say(t('Hybrid: add keyword search (BM25) and fuse with RRF', 'هجين: أضف البحث بالكلمات (BM25) وادمج بـ RRF'))}</label>
    </div>
    <div className="rd-search-grid">
      <svg viewBox="0 0 330 240" className="rd-map" role="img" aria-label={say(t('Embedding space', 'فضاء التضمين'))}>
        <rect x="2" y="2" width="326" height="236" rx="14" className="bg"/>
        <circle className="rd-radius" cx={query.x} cy={query.y} r={(1 - threshold) * 140}/>
        {ranked.map(id => { const chunk = CORPUS.find(item => item.id === id)!; return <line key={id} className="rd-ray" x1={query.x} y1={query.y} x2={chunk.x} y2={chunk.y}/>; })}
        {CORPUS.map(chunk => <g key={chunk.id} className={cls('rd-pt', chunk.collection, !pool.includes(chunk) && 'out', ranked.includes(chunk.id) && 'hit')}>
          <circle cx={chunk.x} cy={chunk.y} r="7"/><text x={chunk.x} y={chunk.y - 11} textAnchor="middle" direction="ltr">{chunk.id.replace('U-', '').replace('T-', '')}</text>
        </g>)}
        <g className="rd-star" key={pick}><circle cx={query.x} cy={query.y} r="16" className="halo"/><path d={`M ${query.x} ${query.y - 9} l 3 6 l 6 1 l -4.5 4.5 l 1 6.5 l -5.5 -3 l -5.5 3 l 1 -6.5 l -4.5 -4.5 l 6 -1 z`}/></g>
        <g className="legend"><circle cx="220" cy="16" r="5" className="turath"/><text x="229" y="20">TurathAI</text><circle cx="276" cy="16" r="5" className="utas"/><text x="285" y="20">UTAS-70</text></g>
      </svg>
      <ol className="rd-results" data-testid="search-results">
        {ranked.map((id, rank) => { const chunk = CORPUS.find(item => item.id === id)!; const isKeyword = hybrid && keyword.includes(chunk);
          return <li key={id} className={chunk.collection} style={delay(rank, 0.08)}>
            <span className="rank" dir="ltr">#{rank + 1}</span>
            <div><b>{say(chunk.title)}</b><p>{say(chunk.text)}</p>
              <small><code dir="ltr">{chunk.id}</code> · <span dir="ltr">{chunk.source}</span> · <span dir="ltr">cos {scoreOf(id).toFixed(2)}</span>{isKeyword && <em>{say(t('keyword match', 'تطابق كلمة'))}</em>}</small></div>
          </li>; })}
        {!ranked.length && <li className="empty" data-testid="search-empty">{say(t('Nothing passes the threshold. The prompt gets no sources, and the rules say: “My sources do not say.”', 'لا شيء يتجاوز العتبة. لا يتلقى التلقين أي مصدر، وتقول القواعد: “مصادري لا تذكر ذلك.”'))}</li>}
      </ol>
    </div>
    <p className="pc-note"><Icon name="bulb" size={13}/>{say(t('Try “What is Al-Bar’ah?” with and without hybrid search: a rare name carries little meaning for an embedding, so the vector search ranks the coffee story first; the keyword index finds the exact name. Then ask about the date palm and raise the threshold: the honest result is empty.',
      'جرّب “ما هي البرعة؟” مع البحث الهجين ودونه: الاسم النادر يحمل معنى قليلًا للتضمين، فيضع البحث المتجهي قصة القهوة أولًا، ويجد فهرس الكلمات الاسم الدقيق. ثم اسأل عن النخلة وارفع العتبة: النتيجة الأمينة فارغة.'))}</p>
  </div>;
}

// ------------------------------------------------------ prompt and citations

const CITE_SOURCES = [
  { n: 1, id: 'U-BS-uses', text: t('The dried resin is burned as incense and used in traditional practices.', 'يُحرق الراتنج الجاف بخورًا ويُستخدم في الممارسات التقليدية.'), ref: 'Source A — Flora of Dhofar, p. 113' },
  { n: 2, id: 'U-BS-harvest', text: t('Small cuts are made in the bark; the sap hardens into tears over several weeks.', 'تُحدث جروح صغيرة في اللحاء، فتتصلب العصارة إلى حبيبات خلال أسابيع.'), ref: 'Field notes 3 — harvest survey' },
];

/** The prompt with numbered sources, and an answer whose citations can be followed. */
export function CitedAnswer() {
  const say = useTx();
  const [found, setFound] = useState(true);
  const [focus, setFocus] = useState<number | null>(null);
  return <div className="rd-cite">
    <Heading icon="bookmark">{say(t('From retrieved chunks to a cited answer', 'من المقاطع المسترجعة إلى إجابة موثقة'))}</Heading>
    <div className="ft-tabs" role="group" aria-label={say(t('Question', 'السؤال'))}>
      <button type="button" className={found ? 'current' : ''} aria-pressed={found} onClick={() => { setFound(true); setFocus(null); }}>{say(t('How is the resin collected and used?', 'كيف يُجمع الراتنج ويُستخدم؟'))}</button>
      <button type="button" className={!found ? 'current' : ''} aria-pressed={!found} onClick={() => { setFound(false); setFocus(null); }}>{say(t('When does it flower?', 'متى يُزهر؟'))}</button>
    </div>
    <div className="rd-cite-grid">
      <div className="rd-prompt-box">
        <b>{say(t('The prompt the model receives', 'التلقين الذي يتلقاه النموذج'))}</b>
        <span className="rules">{say(t('SYSTEM: Answer only from the numbered sources. Cite each claim as [n]. If the sources do not contain the answer, say “My sources do not say.” Reply in the user’s language. Add: for education only.',
          'النظام: أجب من المصادر المرقمة فقط. استشهد لكل معلومة بـ [n]. وإن لم تحوِ المصادر الإجابة فقل “مصادري لا تذكر ذلك.” وأجب بلغة المستخدم. وأضف: للتعليم فقط.'))}</span>
        {found ? CITE_SOURCES.map(source => <span key={source.n} className={cls('src', focus === source.n && 'focus')}>
          <b>[{source.n}]</b> {say(source.text)} <small dir="ltr">{source.ref} · {source.id}</small></span>)
          : <span className="src none">{say(t('(no chunk scored above the 0.50 threshold: best was 0.31)', '(لم يتجاوز أي مقطع عتبة 0.50: وأفضلها 0.31)'))}</span>}
      </div>
      <div className="rd-answer-box" data-testid="cited-answer">
        <b>{say(t('The answer', 'الإجابة'))}</b>
        {found ? <p>{say(t('The resin is collected through small cuts in the bark, and the sap hardens over several weeks', 'يُجمع الراتنج عبر جروح صغيرة في اللحاء، وتتصلب العصارة خلال أسابيع'))}
          <button type="button" className="rd-cite-chip" onClick={() => setFocus(2)}>[2]</button>{say(t('. Once dry, it is burned as incense and used in traditional practices', '. وبعد أن يجف يُحرق بخورًا ويُستخدم في الممارسات التقليدية'))}
          <button type="button" className="rd-cite-chip" onClick={() => setFocus(1)}>[1]</button>. {say(t('For education only.', 'للتعليم فقط.'))}</p>
          : <p>{say(t('My sources do not say when the frankincense tree flowers. A botanist or a flora of Dhofar with phenology notes could answer this.', 'مصادري لا تذكر متى تُزهر شجرة اللبان. ويمكن أن يجيب عن هذا مختص في النبات أو كتاب نباتات ظفار فيه ملاحظات عن مواسم الإزهار.'))}</p>}
        {found && <ol className="rd-refs">{CITE_SOURCES.map(source => <li key={source.n} className={focus === source.n ? 'focus' : ''} dir="ltr">[{source.n}] {source.ref}</li>)}</ol>}
        <div className="rd-checks">
          <span className="good">✓ {say(t('every claim has a source', 'لكل معلومة مصدر'))}</span>
          <span className="good">✓ {say(t('nothing from memory', 'لا شيء من الذاكرة'))}</span>
          <span className="good">✓ {say(found ? t('sources exist and match', 'المصادر موجودة ومطابقة') : t('honest when empty', 'أمين حين لا يوجد شيء'))}</span>
        </div>
      </div>
    </div>
    <p className="pc-note"><Icon name="bulb" size={13}/>{say(t('Click a citation number to see the chunk behind it. The application, not the model, turns [1] into the full reference from the metadata, so a reference can never be invented.',
      'انقر رقم استشهاد لترى المقطع الذي خلفه. فالتطبيق، لا النموذج، هو من يحوّل [1] إلى المرجع الكامل من البيانات الوصفية، فلا يمكن اختلاق مرجع.'))}</p>
  </div>;
}

// --------------------------------------------------------- the two projects

/** RAG design of TurathAI and UTAS-70 side by side, with each project's chunk metadata. */
export function RagInProjects() {
  const say = useTx();
  const [project, setProject] = useState<Collection>('utas');
  return <div className="rd-projects">
    <Heading icon="sparkle">{say(t('RAG in the two student projects', 'RAG في المشروعين الطلابيين'))}</Heading>
    <div className="rd-design" role="table">
      <div className="row head" role="row"><span role="columnheader"/><span role="columnheader">TurathAI</span><span role="columnheader">UTAS-70</span></div>
      {DESIGN.map(row => <div key={row.key.en} className="row" role="row">
        <span role="rowheader">{say(row.key)}</span><span role="cell">{say(row.turath)}</span><span role="cell">{say(row.utas)}</span>
      </div>)}
    </div>
    <h5 className="pc-h5">{say(t('One stored chunk, with the metadata that links it', 'مقطع مخزَّن واحد، مع البيانات الوصفية التي تربطه'))}</h5>
    <div className="ft-tabs" role="group" aria-label={say(t('Project', 'المشروع'))}>
      <button type="button" className={project === 'turath' ? 'current' : ''} aria-pressed={project === 'turath'} onClick={() => setProject('turath')}>TurathAI</button>
      <button type="button" className={project === 'utas' ? 'current' : ''} aria-pressed={project === 'utas'} onClick={() => setProject('utas')}>UTAS-70</button>
    </div>
    <div data-testid="project-metadata"><JsonCode text={JSON.stringify(METADATA[project])}/></div>
    <p className="pc-lead">{say(project === 'turath'
      ? t('prev / next let the application add the neighbouring scene when a story continues; story_id lets it fetch the whole story as the parent; region, place and year allow filtering; the narrator’s name stays in the archive, not in the index.',
        'يتيح prev / next للتطبيق إضافة المشهد المجاور حين تستمر القصة، ويتيح story_id جلب القصة كاملة أصلًا، وتسمح المنطقة والمكان والسنة بالتصفية؛ ويبقى اسم الراوي في الأرشيف لا في الفهرس.')
      : t('species is the key shared with YOLO and is used as a filter; names lets an Arabic or English question find the same plant; topic, section and page make the citation; parent returns the whole species entry when needed.',
        'species هو المفتاح المشترك مع YOLO ويُستخدم للتصفية، وتتيح names لسؤال عربي أو إنجليزي أن يجد النبات نفسه، وتصنع topic و section و page الاستشهاد، ويعيد parent مدخل النوع كاملًا عند الحاجة.'))}</p>
    <div className="pc-links"><span>{say(t('See the projects:', 'انظر المشروعين:'))}</span><PartLink part={12}/><PartLink part={14}/></div>
  </div>;
}

/** Symptom → cause → fix, with a jump to the tool that shows it. */
export function RagDoctor() {
  const say = useTx();
  const [open, setOpen] = useState(0);
  const chosen = SYMPTOMS[open];
  const jump = () => document.querySelector(chosen.tool)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return <div className="rd-doctor">
    <Heading icon="help">{say(t('The RAG doctor: symptom → cause → fix', 'طبيب RAG: العَرَض ← السبب ← العلاج'))}</Heading>
    <div className="rd-doctor-grid">
      <ul>{SYMPTOMS.map((item, index) => <li key={item.symptom.en}><button type="button" className={open === index ? 'on' : ''} aria-pressed={open === index} onClick={() => setOpen(index)}>{say(item.symptom)}</button></li>)}</ul>
      <div className="rd-diagnosis" key={open} data-testid="diagnosis">
        <p><b>{say(t('Cause', 'السبب'))}</b>{say(chosen.cause)}</p>
        <p><b>{say(t('Fix', 'العلاج'))}</b>{say(chosen.fix)}</p>
        <button type="button" className="button small" onClick={jump}><Icon name="next" size={13}/>{say(t('Show me in the lab', 'أرني في المختبر'))}</button>
      </div>
    </div>
    <p className="pc-note"><Icon name="bulb" size={13}/>{say(t('Measure retrieval and generation separately. Retrieval: for a set of test questions, is the right chunk in the top k (hit rate), and how high (MRR)? Generation: is every sentence supported by its cited chunk (faithfulness), and do the citations point to the right sources?',
      'قِس الاسترجاع والتوليد كلًّا على حدة. الاسترجاع: لمجموعة من أسئلة الاختبار، هل المقطع الصحيح ضمن أفضل k (نسبة الإصابة)، وفي أي مرتبة (MRR)؟ والتوليد: هل كل جملة مدعومة بالمقطع الذي تستشهد به (الأمانة)، وهل تشير الاستشهادات إلى المصادر الصحيحة؟'))}</p>
  </div>;
}
