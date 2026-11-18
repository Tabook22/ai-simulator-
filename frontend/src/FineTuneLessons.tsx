/**
 * Hands-on panels for the fine-tuning lab, built from the course notes. Each one is small and
 * interactive: the student changes something and sees the consequence straight away.
 */
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import './lessons.css';
import { Icon } from './ui';
import type { IconName } from './ui';
import { useI18n } from './i18n';
import { t, useTx } from './FineTuneScenes';
import {
  APPROACHES, CRITERIA, EXTRA_QUIZ, FORMATS, GLOSSARY, KEY_SENTENCE, MYTHS, ORDER_CARDS, ORDER_SHUFFLE, PACKAGE, PAIR, PAIR_2,
  SETTINGS, WORKFLOW, brokenJsonl, checkLine, cleanJsonl,
} from './lessonContent';
import type { Approach } from './lessonContent';
import { LORA_SIZE, MODEL_SIZES, budget, createLora, loraLoss, trainLora } from './finetuneModel';
import type { LoraState } from './finetuneModel';

export { EXTRA_QUIZ };

const cls = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');
const num = (value: number) => value.toLocaleString('en-US');
const gb = (value: number) => value >= 10 ? value.toFixed(0) : value.toFixed(1);

function Sub({ icon = 'flask', children }: { icon?: IconName; children: ReactNode }) {
  return <h4 className="llm-sub ft-handson"><Icon name={icon} size={13}/>{children}</h4>;
}

/** A JSON(L) text with keys, strings and punctuation coloured. String values are isolated so Arabic reads correctly. */
export function JsonCode({ text }: { text: string }) {
  return <pre className="lx-json" dir="ltr"><code>{text.split('\n').map((line, row) => <span key={row} className="lx-json-line">
    {line.split(/("(?:\\.|[^"\\])*")/g).map((part, index, parts) => {
      if (!part) return null;
      if (part.startsWith('"') && part.endsWith('"') && part.length > 1) {
        const key = /^\s*:/.test(parts[index + 1] ?? '');
        return key ? <span key={index} className="k">{part}</span>
          : <span key={index} className="s">"<bdi dir="auto">{part.slice(1, -1)}</bdi>"</span>;
      }
      return <span key={index} className="p">{part}</span>;
    })}
    {'\n'}</span>)}</code></pre>;
}

// ============================================================ 2 key words

/** Activity 1 from the notes: a calculator with a locked rule and one adjustable correction knob. */
export function FrozenCalculator() {
  const say = useTx();
  const [x, setX] = useState(4);
  const [knob, setKnob] = useState(0);
  const [steps, setSteps] = useState(0);
  const base = 3 * x;
  const extra = knob * x;
  const target = 3.5 * x;
  const error = base + extra - target;
  const train = () => { setKnob(value => value + 0.45 * (0.5 - value)); setSteps(value => value + 1); };
  const dial = (angle: number, locked: boolean, label: string, caption: string) => <svg viewBox="0 0 120 120" className={cls('lx-dial', locked && 'locked')} aria-hidden="true">
    <circle cx="60" cy="60" r="44" className="face"/>
    {Array.from({ length: 9 }, (_, index) => { const a = (-120 + index * 30) * Math.PI / 180; return <line key={index} className="tick"
      x1={60 + Math.sin(a) * 38} y1={60 - Math.cos(a) * 38} x2={60 + Math.sin(a) * 44} y2={60 - Math.cos(a) * 44}/>; })}
    <line className="needle" x1="60" y1="60" x2={60 + Math.sin(angle * Math.PI / 180) * 34} y2={60 - Math.cos(angle * Math.PI / 180) * 34}/>
    <circle cx="60" cy="60" r="6" className="hub"/>
    <text x="60" y="88" textAnchor="middle" className="label">{label}</text>
    <text x="60" y="116" textAnchor="middle" className="caption">{caption}</text>
  </svg>;
  return <div className="lx-calc">
    <Sub>{say(t('Activity: the calculator with a locked knob', 'نشاط: الآلة الحاسبة ذات الزر المقفل'))}</Sub>
    <p className="lx-lead">{say(t('The base rule is “× 3” and it is locked. The task needs “× 3.5”. A small correction knob is added beside it, and only that knob may turn.',
      'القاعدة الأساسية “× 3” وهي مقفلة. والمهمة تحتاج إلى “× 3.5”. فيُضاف بجانبها زر تصحيح صغير، وهذا الزر وحده يُسمح بتحريكه.'))}</p>
    <div className="lx-calc-row">
      <div className="lx-calc-dial">{dial(-30, true, '× 3', say(t('base · locked', 'الأساس · مقفل')))}<Icon name="lock" size={14}/></div>
      <span className="lx-op">+</span>
      <div className="lx-calc-dial hot">{dial(knob * 160, false, `× ${knob.toFixed(2)}`, say(t('adapter · learns', 'المهايئ · يتعلم')))}</div>
      <span className="lx-op">=</span>
      <div className="lx-calc-out">
        <label>x = <input type="range" min="1" max="10" value={x} onChange={event => setX(Number(event.target.value))}
          aria-label={say(t('Input number x', 'الرقم المدخل x'))}/> <b>{x}</b></label>
        <p><span className="frozen">{say(t('base', 'الأساس'))}: 3 × {x} = {base.toFixed(1)}</span></p>
        <p><span className="hot">{say(t('adapter', 'المهايئ'))}: {knob.toFixed(2)} × {x} = {extra.toFixed(2)}</span></p>
        <p><strong>{say(t('answer', 'الإجابة'))}: {(base + extra).toFixed(2)}</strong> · {say(t('target', 'الهدف'))} {target.toFixed(1)}</p>
        <p className={Math.abs(error) < 0.05 ? 'good' : 'bad'} data-testid="calc-error">{say(t('error', 'الخطأ'))}: {error.toFixed(2)}</p>
      </div>
    </div>
    <div className="button-row">
      <button type="button" className="button primary" onClick={train}><Icon name="play" size={14}/>{say(t('Train one step', 'درّب خطوة واحدة'))}</button>
      <button type="button" className="button quiet" onClick={() => { setKnob(0); setSteps(0); }}><Icon name="reset" size={14}/>{say(t('Start again', 'ابدأ من جديد'))}</button>
      <span className="lx-muted">{say(t(`${steps} steps · the locked knob never moved`, `${steps} خطوة · الزر المقفل لم يتحرك أبدًا`))}</span>
    </div>
    <p className="lx-key"><Icon name="lock" size={14}/><span><strong>{say(KEY_SENTENCE)}</strong> {say(t('The base still produces most of the answer on every step; only the adapter learns.',
      'ما زال الأساس ينتج معظم الإجابة في كل خطوة؛ والمهايئ وحده يتعلم.'))}</span></p>
  </div>;
}

export function Glossary({ goTo }: { goTo: (part: number) => void }) {
  const say = useTx();
  const [query, setQuery] = useState('');
  const shown = GLOSSARY.filter(term => !query.trim() || `${term.name.en} ${term.name.ar} ${term.plain.en} ${term.plain.ar}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="lx-glossary">
    <Sub icon="book">{say(t('Glossary: every word, in plain language', 'المسرد: كل كلمة بلغة بسيطة'))}</Sub>
    <label className="lx-search"><Icon name="search" size={15}/>
      <input type="search" value={query} onChange={event => setQuery(event.target.value)}
        placeholder={say(t('Search a word, e.g. rank, JSONL, gradient', 'ابحث عن كلمة، مثل الرتبة أو JSONL أو التدرّج'))}
        aria-label={say(t('Search the glossary', 'ابحث في المسرد'))}/></label>
    <div className="lx-terms">
      {shown.map(term => <article key={term.name.en} className="lx-term">
        <h5>{say(term.name)}</h5>
        <p>{say(term.plain)}</p>
        <small><bdi dir="auto">{say(term.example)}</bdi></small>
        <button type="button" className="lx-link" onClick={() => goTo(term.part - 1)}>
          {say(t(`See it in part ${term.part}`, `شاهده في الجزء ${term.part}`))}<Icon name="next" size={12}/></button>
      </article>)}
      {!shown.length && <p className="lx-muted">{say(t('No word matches.', 'لا توجد كلمة مطابقة.'))}</p>}
    </div>
  </div>;
}

// ================================================================= 3 data

function usePairs() {
  const say = useTx();
  return { q: say(PAIR.question), a: say(PAIR.answer), q2: say(PAIR_2.question), a2: say(PAIR_2.answer),
    extra: { wrong: say(PAIR.wrong), passage: say(PAIR.passage), system: say(PAIR.system) } };
}

const chatml = (q: string, a: string) => `<|im_start|>user\n${q}<|im_end|>\n<|im_start|>assistant\n${a}<|im_end|>`;

export function FormatExplorer() {
  const say = useTx();
  const { q, a, extra } = usePairs();
  const [key, setKey] = useState(FORMATS[0].key);
  const format = FORMATS.find(item => item.key === key)!;
  const text = format.build(q, a, extra);
  const becomes = format.key === 'text' ? extra.passage
    : format.key === 'dpo' ? `${chatml(q, a)}\n\n${chatml(q, extra.wrong)}` : chatml(q, a);
  return <div className="lx-formats">
    <Sub icon="code">{say(t('The same example in every common format', 'المثال نفسه في كل صيغة شائعة'))}</Sub>
    <div className="ft-tabs lx-format-tabs" role="tablist" aria-label={say(t('Data formats', 'صيغ البيانات'))}>
      {FORMATS.map(item => <button key={item.key} type="button" role="tab" aria-selected={item.key === key}
        className={item.key === key ? 'current' : ''} onClick={() => setKey(item.key)}>
        {say(item.name)}<small>{say(item.tag)}</small></button>)}
    </div>
    <div className="lx-format" key={key}>
      <div className="lx-format-code">
        <span className="lx-file-name" dir="ltr">{format.key === 'csv' ? 'heritage.csv' : format.key === 'json' ? 'heritage.json' : 'heritage.jsonl'}</span>
        <JsonCode text={text}/>
        {format.lines && <p className="lx-muted">{say(t('Each line is a complete record. A file is many such lines.', 'كل سطر سجل كامل. والملف أسطر كثيرة كهذه.'))}</p>}
      </div>
      <div className="lx-format-notes">
        <dl className="lx-fields">{format.fields.map(field => <div key={field.field}><dt dir="ltr">{field.field}</dt><dd>{say(field.meaning)}</dd></div>)}</dl>
        <p><strong>{say(t('When to use it: ', 'متى تُستخدم: '))}</strong>{say(format.use)}</p>
        <p className="lx-muted">{say(format.note)}</p>
      </div>
    </div>
    <div className="lx-becomes">
      <span className="lx-becomes-label"><Icon name="next" size={14}/>{format.key === 'text'
        ? say(t('The trainer reads it as plain text, as it is:', 'يقرؤه المدرِّب نصًا خامًا كما هو:'))
        : format.key === 'dpo' ? say(t('Both answers are put into the chat template and compared:', 'توضع الإجابتان في قالب المحادثة وتُقارنان:'))
          : say(t('Whatever the format, before training it becomes this text (Qwen’s chat template):', 'أيًّا كانت الصيغة، فإنها قبل التدريب تصبح هذا النص (قالب محادثة Qwen):'))}</span>
      <pre className="lx-template" dir="ltr"><code>{becomes.split(/(<\|im_(?:start|end)\|>(?:user|assistant)?)/g).map((part, index) =>
        part.startsWith('<|') ? <span key={index} className="mark">{part}</span> : <bdi key={index} dir="auto">{part}</bdi>)}</code></pre>
      <p className="lx-muted">{say(t('Every document ends up as text. JSONL is the box the text travels in; the chat template is how the model expects to read it.',
        'كل مستند ينتهي نصًا. و JSONL هي الصندوق الذي ينتقل فيه النص، وقالب المحادثة هو الطريقة التي يتوقع النموذج قراءته بها.'))}</p>
    </div>
  </div>;
}

export function JsonlChecker() {
  const say = useTx();
  const { isArabic } = useI18n();
  const { q, a, q2, a2 } = usePairs();
  const [text, setText] = useState<string | null>(null);
  const value = text ?? brokenJsonl(q, a, q2, a2);
  const lines = value.split('\n');
  const results = lines.map(checkLine);
  const records = results.filter(result => result.kind === 'ok').length;
  const bad = results.filter(result => !result.ok).length;
  return <div className="lx-checker">
    <Sub icon="check">{say(t('Check a JSONL file line by line', 'افحص ملف JSONL سطرًا بسطر'))}</Sub>
    <p className="lx-lead">{say(t('This file has typical mistakes. The checker reads it the way a training script does: each line must be one valid JSON object with a "messages" list. Edit the text and watch the results change.',
      'في هذا الملف أخطاء شائعة. والفاحص يقرؤه كما يقرؤه برنامج التدريب: يجب أن يكون كل سطر كائن JSON صحيحًا فيه قائمة "messages". عدّل النص وراقب تغيّر النتائج.'))}</p>
    <div className="button-row">
      <button type="button" className="button small" onClick={() => setText(brokenJsonl(q, a, q2, a2))}>{say(t('Load the file with mistakes', 'حمّل الملف ذا الأخطاء'))}</button>
      <button type="button" className="button small" onClick={() => setText(cleanJsonl(q, a, q2, a2))}>{say(t('Load a clean file', 'حمّل ملفًا سليمًا'))}</button>
    </div>
    <div className="lx-checker-grid">
      <textarea dir="ltr" spellCheck={false} value={value} onChange={event => setText(event.target.value)} rows={Math.max(6, lines.length + 1)}
        aria-label={say(t('JSONL text', 'نص JSONL'))} className={isArabic ? 'ar' : ''}/>
      <ol className="lx-results" aria-live="polite">
        {results.map((result, index) => <li key={index} className={result.kind === 'empty' ? 'empty' : result.ok ? 'ok' : result.kind}>
          <span className="lx-line-no">{index + 1}</span>
          <Icon name={result.ok ? 'check' : 'close'} size={13}/>
          <span>{say(result.reason)}</span>
        </li>)}
      </ol>
    </div>
    <p className={cls('lx-summary', bad ? 'bad' : 'good')} data-testid="jsonl-summary">
      {say(t(`${records} valid records · ${bad} lines with problems`, `${records} سجلات صحيحة · ${bad} أسطر فيها مشكلات`))}</p>
    <p className="lx-muted">{say(t('Valid JSONL is necessary, not sufficient: the checker cannot tell whether an answer is true. That is the expert review.',
      'صحة JSONL ضرورية لكنها غير كافية: فالفاحص لا يعرف هل الإجابة صحيحة. فذلك عمل مراجعة الخبير.'))}</p>
  </div>;
}

/** An illustrative tokenizer: real tokenizers learn their pieces, but the idea is the same. */
function pieces(text: string) {
  const out: string[] = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const parts = word.match(/[\p{L}\p{N}’'-]+|[^\p{L}\p{N}\s]/gu) ?? [word];
    for (const part of parts) {
      if (part.length > 7) { out.push(part.slice(0, 4)); out.push(part.slice(4)); } else out.push(part);
    }
  }
  return out;
}

export function TokenView() {
  const say = useTx();
  const { q, a } = usePairs();
  const [masked, setMasked] = useState(true);
  const [limit, setLimit] = useState(40);
  const tokens = useMemo(() => [
    ...['<|im_start|>', 'user', '↵'].map(text => ({ text, part: 'special' })),
    ...pieces(q).map(text => ({ text, part: 'prompt' })),
    ...['<|im_end|>', '↵', '<|im_start|>', 'assistant', '↵'].map(text => ({ text, part: 'special' })),
    ...pieces(a).map(text => ({ text, part: 'answer' })),
    { text: '<|im_end|>', part: 'end' },
  ], [q, a]);
  const cut = tokens.length > limit;
  const answerCut = tokens.slice(limit).some(token => token.part === 'answer' || token.part === 'end');
  const trained = tokens.slice(0, limit).filter(token => !masked || token.part === 'answer' || token.part === 'end').length;
  return <div className="lx-tokens">
    <Sub icon="grid">{say(t('What the model actually receives', 'ما يتلقاه النموذج فعلًا'))}</Sub>
    <div className="ft-controls wrap">
      <label className="ft-check"><input type="checkbox" checked={masked} onChange={event => setMasked(event.target.checked)}/>
        {say(t('Train on the answer only (mask the prompt)', 'درّب على الإجابة فقط (احجب السؤال)'))}</label>
      <label className="lx-range">{say(t('max_seq_length', 'max_seq_length'))}
        <input type="range" min="12" max="40" value={limit} onChange={event => setLimit(Number(event.target.value))}
          aria-label={say(t('Maximum sequence length', 'أقصى طول للتسلسل'))}/><b data-testid="token-limit">{limit}</b></label>
    </div>
    <div className="lx-chips" dir="auto">
      {tokens.map((token, index) => {
        const graded = !masked || token.part === 'answer' || token.part === 'end';
        return <span key={index} className={cls('lx-chip', token.part, graded ? 'graded' : 'masked', index >= limit && 'cut')}
          title={index >= limit ? say(t('cut off by max_seq_length', 'قُطع بسبب max_seq_length')) : graded ? say(t('trained on', 'يُتدرَّب عليه')) : say(t('masked: label −100', 'محجوب: التسمية −100'))}>
          <bdi dir={token.part === 'special' || token.part === 'end' ? 'ltr' : 'auto'}>{token.text}</bdi>
          <small>{index >= limit ? '✂' : graded ? 1000 + ((index * 7919 + token.text.length * 31) % 90000) : '−100'}</small>
        </span>;
      })}
    </div>
    <dl className="ft-facts">
      <div><dt>{say(t('Tokens', 'الرموز'))}</dt><dd>{Math.min(limit, tokens.length)}</dd><small>{say(t(`of ${tokens.length}`, `من ${tokens.length}`))}</small></div>
      <div><dt>{say(t('Trained on', 'يُتدرَّب عليها'))}</dt><dd data-testid="token-trained">{trained}</dd>
        <small>{masked ? say(t('answer tokens only', 'رموز الإجابة فقط')) : say(t('every token', 'كل الرموز'))}</small></div>
    </dl>
    {cut && <p className={cls('lx-warning', answerCut && 'bad')} data-testid="token-warning"><Icon name="close" size={14}/>{answerCut
      ? say(t('The answer is cut off. The model would learn to stop in the middle of a sentence. Raise max_seq_length or shorten the example.',
        'الإجابة مقطوعة. سيتعلم النموذج التوقف في منتصف الجملة. ارفع max_seq_length أو اختصر المثال.'))
      : say(t('Some tokens are cut off.', 'بعض الرموز مقطوعة.'))}</p>}
    <p className="lx-muted">{say(t('Pieces and ID numbers here are illustrative; a real tokenizer splits differently. Always print a few real tokenized examples and check the mask before training.',
      'القطع والأرقام هنا توضيحية، والمقطِّع الحقيقي يقطّع بطريقة مختلفة. اطبع دائمًا بضعة أمثلة حقيقية مقطَّعة وتحقق من الحجب قبل التدريب.'))}</p>
  </div>;
}

// ============================================================ 4 approaches

export function ApproachPicker() {
  const say = useTx();
  const [key, setKey] = useState<Approach['key']>('lora');
  const approach = APPROACHES.find(item => item.key === key)!;
  const model = MODEL_SIZES[2];
  const lora16 = budget(model, 16, 16, true);
  const lora4 = budget(model, 4, 16, true);
  const share = 4 / model.layers;
  const facts = {
    full: { learn: `${(lora16.parameters / 1e9).toFixed(1)}B`, pct: '100%', memory: lora16.fullGb, file: `≈ ${gb(lora16.parameters * 2 / 1024 ** 3)} GB` },
    partial: { learn: `${(lora16.parameters * share / 1e9).toFixed(1)}B`, pct: `${(share * 100).toFixed(0)}%`,
      memory: lora16.baseGb + (lora16.fullGb - lora16.baseGb) * share + lora16.workingGb, file: `≈ ${gb(lora16.parameters * 2 / 1024 ** 3)} GB` },
    lora: { learn: `${(lora16.adapterParameters / 1e6).toFixed(0)}M`, pct: `${(lora16.trainableShare * 100).toFixed(2)}%`, memory: lora16.totalGb, file: `≈ ${lora16.adapterFileMb.toFixed(0)} MB` },
    qlora: { learn: `${(lora4.adapterParameters / 1e6).toFixed(0)}M`, pct: `${(lora4.trainableShare * 100).toFixed(2)}%`, memory: lora4.totalGb, file: `≈ ${lora4.adapterFileMb.toFixed(0)} MB` },
  }[key];
  const rows = 8;
  return <div className="lx-approach">
    <div className="ft-tabs" role="group" aria-label={say(t('Fine-tuning approach', 'طريقة الضبط الدقيق'))}>
      {APPROACHES.map(item => <button key={item.key} type="button" className={item.key === key ? 'current' : ''} aria-pressed={item.key === key}
        onClick={() => setKey(item.key)}>{say(item.name)}</button>)}
    </div>
    <div className={`lx-wall ${key}`}>
      {Array.from({ length: rows }, (_, row) => {
        const layerHot = key === 'full' || (key === 'partial' && row < 2);
        return <div key={row} className="lx-wall-row">
          <span className="lx-wall-label">{say(t(`layer ${rows - row}`, `الطبقة ${rows - row}`))}</span>
          <div className={cls('lx-wall-cells', layerHot ? 'hot' : 'frozen', key === 'qlora' && 'q4')}>
            {Array.from({ length: 18 }, (_, cell) => <i key={cell} style={{ animationDelay: `${((row * 18 + cell) * 37 % 100) / 60}s` }}/>)}
          </div>
          {(key === 'lora' || key === 'qlora') && <div className="lx-wall-adapter"><i/><i/></div>}
        </div>;
      })}
    </div>
    <dl className="lx-approach-table">
      <div><dt>{say(t('What is updated', 'ما الذي يُحدَّث'))}</dt><dd>{say(approach.updated)}</dd></div>
      <div><dt>{say(t('Base weights', 'أوزان الأساس'))}</dt><dd>{say(approach.base)}</dd></div>
      <div><dt>{say(t('Typical purpose', 'الغرض المعتاد'))}</dt><dd>{say(approach.purpose)}</dd></div>
    </dl>
    <dl className="ft-facts">
      <div><dt>{say(t('Numbers that learn (8B)', 'الأرقام التي تتعلم (8B)'))}</dt><dd data-testid="approach-learn">{facts.learn}</dd><small>{facts.pct}</small></div>
      <div><dt>{say(t('Memory to train', 'ذاكرة التدريب'))}</dt><dd>≈ {gb(facts.memory)} GB</dd></div>
      <div><dt>{say(t('What you save', 'ما تحفظه'))}</dt><dd>{facts.file}</dd>
        <small>{key === 'lora' || key === 'qlora' ? say(t('the adapter only', 'المهايئ وحده')) : say(t('a full model copy', 'نسخة كاملة من النموذج'))}</small></div>
    </dl>
    {key === 'partial' && <p className="lx-muted">{say(t('Here: the last 2 of the 8 drawn layers (in the numbers: the last 4 of 36).', 'هنا: آخر طبقتين من الطبقات الثماني المرسومة (وفي الأرقام: آخر 4 من 36).'))}</p>}
    <p className="lx-key"><Icon name="lock" size={14}/><span><strong>{say(KEY_SENTENCE)}</strong> {say(t('Blue layers still compute every answer; they just do not change.',
      'الطبقات الزرقاء ما زالت تحسب كل إجابة، لكنها لا تتغير.'))}</span></p>
  </div>;
}

export function CompareCards() {
  const say = useTx();
  return <div className="lx-compare">
    <article>
      <h5>{say(t('Quantization is not pruning', 'التكميم ليس تقليمًا'))}</h5>
      <div className="lx-mini">
        <div><small>{say(t('quantization', 'التكميم'))}</small><div className="lx-mini-grid q">{Array.from({ length: 16 }, (_, index) => <i key={index}/>)}</div>
          <small>{say(t('16 weights, fewer bits each', '16 وزنًا، بتات أقل لكل منها'))}</small></div>
        <div><small>{say(t('pruning', 'التقليم'))}</small><div className="lx-mini-grid p">{Array.from({ length: 16 }, (_, index) => <i key={index} className={[1, 4, 6, 9, 11, 14].includes(index) ? 'gone' : ''}/>)}</div>
          <small>{say(t('some weights removed', 'بعض الأوزان محذوفة'))}</small></div>
      </div>
      <p>{say(t('Quantization stores the same weights in fewer bits (an approximation). Pruning deletes weights or connections. QLoRA uses quantization: a 27B model is still 27B.',
        'التكميم يخزّن الأوزان نفسها ببتات أقل (تقريبًا). والتقليم يحذف أوزانًا أو اتصالات. و QLoRA تستخدم التكميم: فنموذج 27B يبقى 27B.'))}</p>
    </article>
    <article>
      <h5>{say(t('Fine-tuning is not retrieval (RAG)', 'الضبط الدقيق ليس استرجاعًا (RAG)'))}</h5>
      <div className="lx-mini flows">
        <p><span className="pill hot">{say(t('examples', 'أمثلة'))}</span>→<span className="pill hot">{say(t('weights change', 'الأوزان تتغير'))}</span>→<span className="pill">{say(t('answer', 'إجابة'))}</span></p>
        <p><span className="pill cool">{say(t('question', 'سؤال'))}</span>→<span className="pill cool">{say(t('find passages', 'ابحث عن مقاطع'))}</span>→<span className="pill">{say(t('answer + source', 'إجابة + مصدر'))}</span></p>
      </div>
      <p>{say(t('Fine-tuning changes learned behaviour: terms, style, careful answers. RAG fetches source passages at answer time and changes no weights: best when an answer must be tied to a source. They work together; TurathAI uses both.',
        'الضبط الدقيق يغيّر السلوك المتعلَّم: المصطلحات والأسلوب والإجابة الحذرة. و RAG يجلب مقاطع المصادر وقت الإجابة ولا يغيّر أي وزن: وهو الأفضل حين يجب ربط الإجابة بمصدر. ويعملان معًا؛ و تراث AI يستخدم الاثنين.'))}</p>
    </article>
  </div>;
}

// ================================================================= 5 LoRA

const PRESETS = [
  { name: t('Notes example', 'مثال الملاحظات'), rows: 1000, cols: 1000, rank: 8 },
  { name: t('Activity 2', 'النشاط 2'), rows: 2000, cols: 2000, rank: 4 },
  { name: t('q_proj of an 8B model', 'q_proj في نموذج 8B'), rows: 4096, cols: 4096, rank: 16 },
];

export function LoraCalculator() {
  const say = useTx();
  const [rows, setRows] = useState(1000);
  const [cols, setCols] = useState(1000);
  const [rank, setRank] = useState(8);
  const [alpha, setAlpha] = useState(16);
  const [guess, setGuess] = useState('');
  const full = rows * cols;
  const aCount = rank * cols;
  const bCount = rows * rank;
  const total = aCount + bCount;
  const scale = 170 / Math.max(rows, cols);
  const thin = (value: number) => Math.max(2.5, value * scale);
  const activity = rows === 2000 && cols === 2000 && rank === 4;
  const guessNumber = Number(guess.replace(/[,\s٬]/g, ''));
  return <div className="lx-loracalc">
    <Sub>{say(t('Count the numbers yourself', 'احسب الأرقام بنفسك'))}</Sub>
    <div className="ft-tabs" role="group" aria-label={say(t('Examples', 'أمثلة'))}>
      {PRESETS.map(preset => <button key={preset.name.en} type="button"
        className={preset.rows === rows && preset.cols === cols && preset.rank === rank ? 'current' : ''}
        onClick={() => { setRows(preset.rows); setCols(preset.cols); setRank(preset.rank); setGuess(''); }}>{say(preset.name)}</button>)}
    </div>
    <div className="lx-loracalc-grid">
      <div className="lx-loracalc-inputs">
        <label>{say(t('W rows (outputs)', 'صفوف W (المخرجات)'))}<input type="number" min="16" max="8192" value={rows} onChange={event => setRows(Math.max(16, Math.min(8192, Number(event.target.value) || 16)))}/></label>
        <label>{say(t('W columns (inputs)', 'أعمدة W (المدخلات)'))}<input type="number" min="16" max="8192" value={cols} onChange={event => setCols(Math.max(16, Math.min(8192, Number(event.target.value) || 16)))}/></label>
        <label>{say(t('Rank r', 'الرتبة r'))}<select value={rank} onChange={event => setRank(Number(event.target.value))}>
          {[1, 2, 4, 8, 16, 32, 64].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      </div>
      <svg viewBox="0 0 300 220" className="lx-shapes" role="img" aria-label={say(t('W compared with A and B, drawn to scale', 'W مقارنة بـ A و B، مرسومة بمقياس حقيقي'))}>
        <rect className="w" x="10" y="20" width={cols * scale} height={rows * scale} rx="4"/>
        <text x={10 + cols * scale / 2} y={20 + rows * scale / 2} textAnchor="middle" className="label">W</text>
        <rect className="b" x={200} y="20" width={thin(rank)} height={rows * scale} rx="2"/>
        <text x={206 + thin(rank)} y="34" className="label small">B</text>
        <rect className="a" x={228} y="20" width={Math.min(64, cols * scale * 0.35)} height={thin(rank)} rx="2"/>
        <text x={232} y={36 + thin(rank)} className="label small">A</text>
        <text x="150" y="214" textAnchor="middle" className="note">{say(t('drawn to the same scale', 'مرسومة بالمقياس نفسه'))}</text>
      </svg>
    </div>
    <div className="table-scroll ft-table">
      <table>
        <thead><tr><th>{say(t('Part', 'الجزء'))}</th><th>{say(t('Calculation', 'الحساب'))}</th><th>{say(t('Numbers', 'الأرقام'))}</th></tr></thead>
        <tbody>
          <tr><td>{say(t('Original W', 'W الأصلية'))}</td><td dir="ltr">{num(rows)} × {num(cols)}</td><td>{num(full)} {say(t('frozen', 'مجمَّدة'))}</td></tr>
          <tr><td>{say(t('Adapter A', 'المهايئ A'))}</td><td dir="ltr">{rank} × {num(cols)}</td><td>{num(aCount)} {say(t('trainable', 'تتدرب'))}</td></tr>
          <tr><td>{say(t('Adapter B', 'المهايئ B'))}</td><td dir="ltr">{num(rows)} × {rank}</td><td>{num(bCount)} {say(t('trainable', 'تتدرب'))}</td></tr>
          <tr className="total"><td>{say(t('Adapter total', 'مجموع المهايئ'))}</td><td dir="ltr">{num(aCount)} + {num(bCount)}</td>
            <td data-testid="lora-total">{activity && !guess ? '?' : num(total)} {!(activity && !guess) && <span className="lx-pct">({(total / full * 100).toFixed(2)}%)</span>}</td></tr>
        </tbody>
      </table>
    </div>
    {activity && <div className="lx-activity">
      <label>{say(t('Activity 2: how many trainable numbers does the adapter have?', 'النشاط 2: كم رقمًا قابلًا للتدريب في المهايئ؟'))}
        <input inputMode="numeric" value={guess} onChange={event => setGuess(event.target.value)} placeholder="…" aria-label={say(t('Your answer', 'إجابتك'))}/></label>
      {guess && <p className={guessNumber === total ? 'good' : 'bad'}>{guessNumber === total
        ? say(t('Correct: 8,000 + 8,000 = 16,000, which is 0.4% of the 4,000,000 frozen numbers.', 'صحيح: 8,000 + 8,000 = 16,000، أي 0.4٪ من الأرقام المجمَّدة البالغة 4,000,000.'))
        : say(t('Not yet. A is r × columns and B is rows × r. Add them.', 'ليس بعد. A أبعادها r × الأعمدة و B أبعادها الصفوف × r. اجمعهما.'))}</p>}
    </div>}
    <p className="lx-muted">{say(t('This is one matrix. The whole adapter depends on the rank, which modules get adapters, and how many layers. Rank is the width of the bottleneck, not the number of adapters.',
      'هذه مصفوفة واحدة. والمهايئ كله يعتمد على الرتبة، وأي الوحدات تحصل على مهايئات، وعدد الطبقات. والرتبة عرض عنق الزجاجة، لا عدد المهايئات.'))}</p>
    <div className="lx-scale">
      <Sub icon="target">{say(t('The scale s = alpha ÷ r', 'المقياس s = alpha ÷ r'))}</Sub>
      <div className="ft-tabs" role="group" aria-label="alpha">
        <span>alpha</span>
        {[8, 16, 32].map(value => <button key={value} type="button" className={value === alpha ? 'current' : ''} aria-pressed={value === alpha} onClick={() => setAlpha(value)}>{value}</button>)}
      </div>
      <p className="ft-equation" dir="ltr"><span className="frozen">W·x</span><b>+</b><span>{(alpha / rank).toFixed(2)}</span><b>×</b><span className="hot">B·(A·x)</span></p>
      <p className="lx-muted">{say(t(`With alpha = ${alpha} and r = ${rank}, the adapter’s output is multiplied by ${(alpha / rank).toFixed(2)}. Many recipes set alpha equal to r (s = 1) or to 2r.`,
        `مع alpha = ${alpha} و r = ${rank} يُضرب مخرج المهايئ في ${(alpha / rank).toFixed(2)}. وكثير من الوصفات تجعل alpha مساوية لـ r (‏s = 1) أو ضعفها.`))}</p>
    </div>
  </div>;
}

const zeros = (rows: number, columns: number) => Array.from({ length: rows }, () => Array(columns).fill(0) as number[]);
const INITS = [
  { key: 'good', name: t('A random, B zero', 'A عشوائية، B صفر'), make: (state: LoraState) => state },
  { key: 'zero', name: t('Both zero', 'الاثنتان صفر'), make: (state: LoraState) => ({ ...state, a: zeros(state.rank, LORA_SIZE) }) },
  { key: 'noise', name: t('Both random', 'الاثنتان عشوائيتان'), make: (state: LoraState) => ({ ...state, b: state.a[0].map((_, r) => state.a.map((row, k) => row[(r + k + 3) % LORA_SIZE] * 5)) }) },
];

export function InitDemo() {
  const say = useTx();
  const runs = useMemo(() => INITS.map(init => {
    const start = init.make(createLora(2));
    const first = { ...start, history: [loraLoss(start)] };
    const base = loraLoss({ ...start, b: zeros(LORA_SIZE, 2) });
    const done = trainLora(first, 150);
    return { ...init, startLoss: first.history[0], base, endLoss: done.history[done.history.length - 1], history: done.history };
  }), []);
  return <div className="lx-init">
    <Sub icon="help">{say(t('Why B starts at zero (and not both)', 'لماذا تبدأ B من الصفر (وليس الاثنتان)'))}</Sub>
    <p className="lx-lead">{say(t('The same adapter trained for 150 steps, starting three different ways. These are real runs in your browser.',
      'المهايئ نفسه مدرَّب 150 خطوة، يبدأ بثلاث طرق مختلفة. وهذه تجارب حقيقية في متصفحك.'))}</p>
    <div className="lx-init-grid">
      {runs.map(run => {
        const same = Math.abs(run.startLoss - run.base) < 1e-9;
        const stuck = run.endLoss > run.startLoss * 0.98;
        const max = Math.max(...run.history);
        return <article key={run.key} className={cls('lx-init-card', run.key)}>
          <h5>{say(run.name)}</h5>
          <svg viewBox="0 0 160 50" className="lx-spark" aria-hidden="true">
            <polyline points={run.history.map((value, index) => `${4 + index * 152 / (run.history.length - 1)},${46 - 40 * value / max}`).join(' ')}/>
          </svg>
          <p>{say(t('starts like the base model?', 'يبدأ مثل النموذج الأساسي؟'))} <b className={same ? 'good' : 'bad'}>{same ? say(t('yes', 'نعم')) : say(t('no', 'لا'))}</b></p>
          <p>{say(t('loss', 'الخسارة'))}: {run.startLoss.toFixed(2)} → <b data-testid={`init-${run.key}`}>{run.endLoss.toFixed(2)}</b></p>
          <p className={stuck || !same ? 'bad' : 'good'}>{run.key === 'good'
            ? say(t('Starts exactly at the base model, then learns.', 'يبدأ تمامًا من النموذج الأساسي ثم يتعلم.'))
            : run.key === 'zero' ? say(t('Stuck: with A = 0 and B = 0 every gradient is zero, so nothing ever moves.', 'عالق: مع A = 0 و B = 0 يكون كل تدرّج صفرًا، فلا يتحرك شيء أبدًا.'))
              : say(t('It learns, but starts from noise: before any training its answers are already worse than the base model, and it stays behind.', 'يتعلم، لكنه يبدأ من الضجيج: فقبل أي تدريب تكون إجاباته أسوأ من النموذج الأساسي، ويبقى متأخرًا.'))}</p>
        </article>;
      })}
    </div>
  </div>;
}

// ================================================================ 7 QLoRA

export function QloraOrder() {
  const say = useTx();
  const [path, setPath] = useState<'qlora' | 'later'>('qlora');
  const steps = path === 'qlora' ? [
    { text: t('Load the base in 4-bit (or quantize it while loading)', 'حمّل الأساس بدقة 4 بت (أو كمّمه أثناء التحميل)'), bits: '4' },
    { text: t('Freeze it and attach LoRA adapters', 'جمّده واربط مهايئات LoRA'), bits: '4' },
    { text: t('Train the adapters; the 4-bit base takes part in every calculation', 'درّب المهايئات؛ ويشارك الأساس ذو الـ 4 بت في كل حساب'), bits: '4' },
    { text: t('Save the adapters and the exact base they belong to', 'احفظ المهايئات والأساس الدقيق الذي تنتمي إليه'), bits: '4' },
  ] : [
    { text: t('Load the base in 16-bit', 'حمّل الأساس بدقة 16 بت'), bits: '16' },
    { text: t('Freeze it and attach LoRA adapters', 'جمّده واربط مهايئات LoRA'), bits: '16' },
    { text: t('Train the adapters (needs memory for the 16-bit base)', 'درّب المهايئات (يحتاج ذاكرة لأساس 16 بت)'), bits: '16' },
    { text: t('Merge, then quantize the finished model to 4-bit for deployment', 'ادمج، ثم كمّم النموذج النهائي إلى 4 بت للنشر'), bits: '16→4' },
  ];
  return <div className="lx-order">
    <Sub icon="layers">{say(t('The order matters', 'الترتيب مهم'))}</Sub>
    <div className="ft-tabs" role="group" aria-label={say(t('Sequence', 'التسلسل'))}>
      <button type="button" className={path === 'qlora' ? 'current' : ''} aria-pressed={path === 'qlora'} onClick={() => setPath('qlora')}>QLoRA</button>
      <button type="button" className={path === 'later' ? 'current' : ''} aria-pressed={path === 'later'} onClick={() => setPath('later')}>
        {say(t('LoRA, then quantize later', 'LoRA ثم التكميم لاحقًا'))}</button>
    </div>
    <ol className="lx-order-steps" key={path}>
      {steps.map((item, index) => <li key={index} style={{ animationDelay: `${index * 0.15}s` }}>
        <span className="lx-order-no">{index + 1}</span><span>{say(item.text)}</span>
        <span className={cls('lx-bits', item.bits === '4' && 'four')} dir="ltr">{item.bits}-bit</span>
      </li>)}
    </ol>
    <p className="lx-muted">{path === 'qlora'
      ? say(t('The base is quantized for the training run itself. That is what makes it QLoRA, and what saves memory while training.', 'يُكمَّم الأساس من أجل تجربة التدريب نفسها. وهذا ما يجعلها QLoRA، وما يوفر الذاكرة أثناء التدريب.'))
      : say(t('Also a valid path, but the training run was ordinary LoRA: quantizing afterwards does not make it QLoRA, and training needed the 16-bit memory.', 'مسار صحيح أيضًا، لكن تجربة التدريب كانت LoRA عادية: فالتكميم بعدها لا يجعلها QLoRA، والتدريب احتاج إلى ذاكرة 16 بت.'))}</p>
  </div>;
}

export function MemoryTable() {
  const say = useTx();
  const rows = [{ bits: 32, bytes: 4 }, { bits: 16, bytes: 2 }, { bits: 4, bytes: 0.5 }];
  const extras = [t('quantization constants (scales)', 'ثوابت التكميم (المقاييس)'), t('parts kept in 16-bit', 'أجزاء تبقى بدقة 16 بت'),
    t('adapters + their gradients', 'المهايئات وتدرجاتها'), t('optimizer state', 'حالة المحسّن'), t('activations', 'التنشيطات'), t('temporary buffers', 'مخازن مؤقتة')];
  return <div className="lx-memory">
    <Sub icon="chip">{say(t('A transparent memory sum: a 27B model', 'حساب ذاكرة واضح: نموذج 27B'))}</Sub>
    <p className="lx-lead" dir="auto">{say(t('Raw weight storage = number of parameters × bits per parameter ÷ 8. (Decimal GB: 1 GB = 1,000,000,000 bytes.)',
      'تخزين الأوزان الخام = عدد المعاملات × البتات لكل معامل ÷ 8. (غيغابايت عشري: 1 غ.ب = 1,000,000,000 بايت.)'))}</p>
    <div className="lx-memory-rows">
      {rows.map(row => {
        const value = 27 * row.bytes;
        return <div key={row.bits} className="lx-memory-row">
          <span className="lx-memory-bits" dir="ltr">{row.bits}-bit</span>
          <span className="lx-memory-sum" dir="ltr">27 B × {row.bytes} {say(t('bytes', 'بايت'))}</span>
          <span className="lx-memory-bar"><i className={row.bits === 4 ? 'four' : ''} style={{ width: `${value / 108 * 100}%` }}/></span>
          <b dir="ltr">{value} GB</b>
        </div>;
      })}
    </div>
    <p className="lx-warning"><Icon name="close" size={14}/>{say(t('13.5 GB is the raw weights, not a GPU budget. Training also needs:', '13.5 غ.ب هي الأوزان الخام وليست ميزانية GPU. فالتدريب يحتاج أيضًا إلى:'))}</p>
    <ul className="lx-extras">{extras.map(item => <li key={item.en}>{say(item)}</li>)}</ul>
    <p className="lx-muted">{say(t('Measure real use with a short pilot run. Do not conclude that a 13.5 GB GPU can train this model.',
      'قِس الاستخدام الفعلي بتجربة قصيرة. ولا تستنتج أن بطاقة GPU بسعة 13.5 غ.ب تستطيع تدريب هذا النموذج.'))}</p>
  </div>;
}

export function PrecisionFlow() {
  const say = useTx();
  const [run, setRun] = useState(0);
  return <div className="lx-precision">
    <Sub icon="grid">{say(t('Stored in 4-bit, calculated in 16-bit', 'يُخزَّن بـ 4 بت، ويُحسب بـ 16 بت'))}</Sub>
    <div className="lx-precision-flow" key={run} dir="ltr">
      <div className="lx-pbox store"><b>4-bit</b><small>{say(t('stored codes + scale', 'رموز مخزَّنة + مقياس'))}</small><span className="lx-codes">1101 0111 1000 …</span></div>
      <span className="lx-parrow"><i/></span>
      <div className="lx-pbox temp"><b>bfloat16</b><small>{say(t('rebuilt for this layer only', 'يُعاد بناؤه لهذه الطبقة فقط'))}</small><span className="lx-codes">0.42 −0.13 0.07 …</span></div>
      <span className="lx-parrow"><i/></span>
      <div className="lx-pbox calc"><b>W·x + s·B(A·x)</b><small>{say(t('computed in 16-bit', 'يُحسب بدقة 16 بت'))}</small></div>
      <span className="lx-parrow"><i/></span>
      <div className="lx-pbox out"><b>{say(t('output', 'المخرج'))}</b><small>{say(t('temporary weights thrown away', 'تُرمى الأوزان المؤقتة'))}</small></div>
    </div>
    <button type="button" className="button small" onClick={() => setRun(value => value + 1)}><Icon name="play" size={13}/>{say(t('Play the flow again', 'شغّل التدفق من جديد'))}</button>
    <div className="lx-qchips">
      <p><strong>NF4</strong> {say(t('— the 4-bit format whose levels sit where weights usually are.', '— صيغة 4 بت مستوياتها حيث تكون الأوزان عادةً.'))}</p>
      <p><strong>{say(t('Double quantization', 'التكميم المزدوج'))}</strong> {say(t('— the scales themselves are quantized too, saving about 0.4 bits per weight.', '— المقاييس نفسها تُكمَّم أيضًا، فتوفر نحو 0.4 بت لكل وزن.'))}</p>
      <p><strong>{say(t('Paged optimizers', 'المحسّنات المقسَّمة إلى صفحات'))}</strong> {say(t('— optimizer memory can spill to the computer’s RAM during short memory spikes instead of crashing.', '— يمكن لذاكرة المحسّن أن تنتقل إلى ذاكرة الحاسوب أثناء ذروات الذاكرة القصيرة بدلًا من التوقف.'))}</p>
    </div>
    <p className="lx-muted">{say(t('QLoRA does not mean every number or every calculation is 4-bit. 4 bits is only how the frozen base is stored; the adapters train in 16-bit.',
      'لا تعني QLoRA أن كل رقم أو كل حساب بـ 4 بت. فالـ 4 بت طريقة تخزين الأساس المجمَّد فقط، والمهايئات تتدرب بدقة 16 بت.'))}</p>
  </div>;
}

// ============================================================== 8 Unsloth

export function KitchenTable() {
  const say = useTx();
  const rows = [
    [t('Recipe or cooking method', 'الوصفة أو طريقة الطهي'), t('The LoRA or QLoRA training approach', 'طريقة التدريب LoRA أو QLoRA')],
    [t('Chef and tools', 'الطاهي والأدوات'), t('Your code using Unsloth and supporting libraries', 'شيفرتك التي تستخدم Unsloth والمكتبات المساندة')],
    [t('Ingredients', 'المكونات'), t('The pretrained model and the prepared heritage examples', 'النموذج المدرَّب مسبقًا وأمثلة التراث المجهَّزة')],
    [t('Adjustable orange module', 'الوحدة البرتقالية القابلة للتعديل'), t('The LoRA adapter weights being trained', 'أوزان مهايئ LoRA التي تُدرَّب')],
    [t('Stove', 'الموقد'), t('The GPU hardware doing the calculations', 'عتاد GPU الذي ينفذ الحسابات')],
    [t('Finished dish', 'الطبق الجاهز'), t('The matching base model working with the trained adapters', 'النموذج الأساسي المطابق يعمل مع المهايئات المدرَّبة')],
  ];
  return <div className="lx-kitchen">
    <Sub icon="book">{say(t('The kitchen picture, decoded', 'صورة المطبخ، مفكوكة الرموز'))}</Sub>
    <div className="table-scroll ft-table">
      <table>
        <thead><tr><th>{say(t('In the kitchen', 'في المطبخ'))}</th><th>{say(t('In fine-tuning', 'في الضبط الدقيق'))}</th></tr></thead>
        <tbody>{rows.map(([kitchen, meaning]) => <tr key={kitchen.en}><td>{say(kitchen)}</td><td>{say(meaning)}</td></tr>)}</tbody>
      </table>
    </div>
    <h5 className="lx-h5">{say(t('What Unsloth does not do', 'ما لا يفعله Unsloth'))}</h5>
    <ul className="lx-extras">
      <li>{say(t('It does not check whether the heritage facts are true.', 'لا يتحقق من صحة معلومات التراث.'))}</li>
      <li>{say(t('It does not create trustworthy sources or citations.', 'لا يصنع مصادر أو استشهادات موثوقة.'))}</li>
      <li>{say(t('It does not guarantee that any model fits on any GPU.', 'لا يضمن أن أي نموذج يتسع لأي بطاقة GPU.'))}</li>
      <li>{say(t('It does not choose the data, model, targets, settings or evaluation: you do.', 'لا يختار البيانات أو النموذج أو الأهداف أو الإعدادات أو التقييم: أنت من يفعل.'))}</li>
    </ul>
  </div>;
}

// ===================================================== 9 one training step

export function LearningRateDemo() {
  const say = useTx();
  const rates = [{ lr: 0.05, name: t('Too small', 'صغير جدًا') }, { lr: 0.3, name: t('Good', 'مناسب') }, { lr: 1.05, name: t('Too large', 'كبير جدًا') }];
  const [lr, setLr] = useState(0.3);
  const [path, setPath] = useState<number[]>([-1.6]);
  const loss = (w: number) => (w - 1) ** 2;
  const step = (count: number) => setPath(current => {
    const next = [...current];
    for (let index = 0; index < count; index++) {
      const w = next[next.length - 1];
      next.push(Math.max(-6, Math.min(8, w - lr * 2 * (w - 1))));
    }
    return next;
  });
  const x = (w: number) => 150 + (w - 1) * 46;
  const y = (w: number) => 170 - Math.min(150, loss(w) * 22);
  const curve = Array.from({ length: 61 }, (_, index) => { const w = -2.2 + index * 0.1067; return `${x(w)},${y(w)}`; }).join(' ');
  const last = path[path.length - 1];
  return <div className="lx-lr">
    <Sub>{say(t('Learning rate: how big is each step?', 'معدل التعلم: ما حجم كل خطوة؟'))}</Sub>
    <div className="ft-controls">
      <div className="ft-tabs" role="group" aria-label={say(t('Learning rate', 'معدل التعلم'))}>
        {rates.map(rate => <button key={rate.lr} type="button" className={rate.lr === lr ? 'current' : ''} aria-pressed={rate.lr === lr}
          onClick={() => { setLr(rate.lr); setPath([-1.6]); }}>{say(rate.name)} <small dir="ltr">{rate.lr}</small></button>)}
      </div>
      <div className="button-row">
        <button type="button" className="button small primary" onClick={() => step(1)}>{say(t('One step', 'خطوة واحدة'))}</button>
        <button type="button" className="button small" onClick={() => step(8)}>{say(t('8 steps', '8 خطوات'))}</button>
        <button type="button" className="button small quiet" onClick={() => setPath([-1.6])}><Icon name="reset" size={13}/></button>
      </div>
    </div>
    <svg viewBox="0 0 300 190" className="lx-bowl" role="img" aria-label={say(t('A ball rolling down the loss curve', 'كرة تتدحرج على منحنى الخسارة'))}>
      <polyline className="curve" points={curve}/>
      <line className="axis" x1="10" x2="290" y1="172" y2="172"/>
      <polyline className="trail" points={path.map(w => `${x(w)},${y(w)}`).join(' ')}/>
      {path.map((w, index) => <circle key={index} className="dot" cx={x(w)} cy={y(w)} r="3"/>)}
      <circle className="ball" cx={x(last)} cy={y(last) - 6} r="7"/>
      <text x="150" y="186" textAnchor="middle" className="note">{say(t('best value of the weight', 'أفضل قيمة للوزن'))}</text>
    </svg>
    <p className="lx-muted" data-testid="lr-loss">{say(t(`step ${path.length - 1} · loss ${loss(last).toFixed(3)}`, `الخطوة ${path.length - 1} · الخسارة ${loss(last).toFixed(3)}`))}
      {' — '}{lr < 0.1 ? say(t('safe but slow: many steps to reach the bottom.', 'آمن لكنه بطيء: خطوات كثيرة للوصول إلى القاع.'))
        : lr > 1 ? say(t('each step overshoots, so the ball jumps from side to side and climbs: training becomes unstable.', 'كل خطوة تتجاوز الهدف، فتقفز الكرة من جهة إلى أخرى وتصعد: يصبح التدريب غير مستقر.'))
          : say(t('reaches the bottom in a few steps.', 'تصل إلى القاع في خطوات قليلة.'))}</p>
  </div>;
}

export function BatchCalculator() {
  const say = useTx();
  const [micro, setMicro] = useState(2);
  const [accumulate, setAccumulate] = useState(8);
  const [devices, setDevices] = useState(1);
  const [examples, setExamples] = useState(800);
  const [epochs, setEpochs] = useState(2);
  const effective = micro * accumulate * devices;
  const perEpoch = Math.ceil(examples / effective);
  const choice = (label: string, values: number[], value: number, set: (value: number) => void) => <div className="ft-tabs" role="group" aria-label={label}>
    <span>{label}</span>{values.map(item => <button key={item} type="button" className={item === value ? 'current' : ''} aria-pressed={item === value}
      aria-label={`${label} ${item}`} onClick={() => set(item)}>{item}</button>)}</div>;
  return <div className="lx-batch">
    <Sub icon="grid">{say(t('Batch size, accumulation and epochs', 'حجم الدفعة والتجميع والحقب'))}</Sub>
    <div className="lx-batch-controls">
      {choice(say(t('Batch per GPU', 'الدفعة لكل GPU')), [1, 2, 4, 8], micro, setMicro)}
      {choice(say(t('Accumulation', 'التجميع')), [1, 2, 4, 8, 16], accumulate, setAccumulate)}
      {choice(say(t('GPUs', 'بطاقات GPU')), [1, 2, 4], devices, setDevices)}
      {choice(say(t('Epochs', 'الحقب')), [1, 2, 3, 5], epochs, setEpochs)}
      <label className="lx-range">{say(t('Training examples', 'أمثلة التدريب'))}
        <input type="range" min="100" max="5000" step="100" value={examples} onChange={event => setExamples(Number(event.target.value))}/><b>{num(examples)}</b></label>
    </div>
    <div className="lx-batch-picture" aria-hidden="true">
      {Array.from({ length: Math.min(devices, 4) }, (_, device) => <div key={device} className="lx-gpu">
        <small>GPU {device + 1}</small>
        <div className="lx-micro">{Array.from({ length: Math.min(accumulate, 16) }, (_, round) => <span key={round}>
          {Array.from({ length: micro }, (_, item) => <i key={item}/>)}</span>)}</div>
      </div>)}
    </div>
    <p className="ft-equation" dir="ltr"><span>{micro}</span><b>×</b><span>{accumulate}</span><b>×</b><span>{devices}</span><b>=</b>
      <span className="hot" data-testid="effective-batch">{effective}</span></p>
    <dl className="ft-facts">
      <div><dt>{say(t('Effective batch', 'الدفعة الفعلية'))}</dt><dd>{effective}</dd><small>{say(t('examples per update', 'مثال لكل تحديث'))}</small></div>
      <div><dt>{say(t('Steps per epoch', 'الخطوات في الحقبة'))}</dt><dd data-testid="steps-epoch">{perEpoch}</dd><small>{num(examples)} ÷ {effective}</small></div>
      <div><dt>{say(t('Total steps', 'مجموع الخطوات'))}</dt><dd>{perEpoch * epochs}</dd><small>× {epochs} {say(t('epochs', 'حقب'))}</small></div>
    </dl>
    <p className="lx-muted">{say(t('Only the batch per GPU sits in memory at once. Accumulation adds up the gradients of several small batches before one update, so it acts like a bigger batch without the memory. (Counting by examples; packing and different lengths make token counts more complicated.)',
      'لا يكون في الذاكرة دفعة واحدة إلا الدفعة لكل GPU. والتجميع يجمع تدرجات عدة دفعات صغيرة قبل تحديث واحد، فيعمل كدفعة أكبر دون ذاكرتها. (العدّ بالأمثلة؛ والتعبئة والأطوال المختلفة تجعل عدد الرموز أعقد.)'))}</p>
  </div>;
}

export function SettingsTable() {
  const say = useTx();
  return <div className="lx-settings">
    <Sub icon="code">{say(t('The settings students should understand', 'الإعدادات التي يجب أن يفهمها الطلاب'))}</Sub>
    <div className="table-scroll ft-table">
      <table>
        <thead><tr><th>{say(t('Setting', 'الإعداد'))}</th><th>{say(t('Meaning', 'المعنى'))}</th><th>{say(t('Practical effect', 'الأثر العملي'))}</th><th>{say(t('In code', 'في الشيفرة'))}</th></tr></thead>
        <tbody>{SETTINGS.map(setting => <tr key={setting.name.en}><td><strong>{say(setting.name)}</strong></td><td>{say(setting.meaning)}</td>
          <td>{say(setting.effect)}</td><td><code dir="ltr">{setting.code}</code></td></tr>)}</tbody>
      </table>
    </div>
  </div>;
}

export function OverfitChart() {
  const say = useTx();
  const [epochs, setEpochs] = useState(2);
  const train = (e: number) => 1.6 * Math.exp(-e / 1.6) + 0.05;
  const valid = (e: number) => 1.6 * Math.exp(-e / 1.4) + 0.32 + 0.045 * Math.max(0, e - 2.6) ** 2;
  const x = (e: number) => 30 + e * 32;
  const y = (value: number) => 150 - value * 70;
  const line = (fn: (e: number) => number) => Array.from({ length: 41 }, (_, index) => { const e = index * 0.2; return `${x(e)},${y(fn(e))}`; }).join(' ');
  const best = epochs >= 3 && epochs <= 4;
  return <div className="lx-overfit">
    <Sub icon="chip">{say(t('Training loss is not the whole story', 'خسارة التدريب ليست القصة كلها'))}</Sub>
    <label className="lx-range">{say(t('Epochs', 'الحقب'))}<input type="range" min="1" max="8" value={epochs} onChange={event => setEpochs(Number(event.target.value))}/><b>{epochs}</b></label>
    <svg viewBox="0 0 300 170" className="lx-curves" role="img" aria-label={say(t('Training and validation loss', 'خسارة التدريب والتحقق'))}>
      <line className="axis" x1="30" x2="290" y1="150" y2="150"/>
      <polyline className="train" points={line(train)}/>
      <polyline className="valid" points={line(valid)}/>
      <line className="marker" x1={x(epochs)} x2={x(epochs)} y1="12" y2="150"/>
      <circle className="train-dot" cx={x(epochs)} cy={y(train(epochs))} r="4"/>
      <circle className="valid-dot" cx={x(epochs)} cy={y(valid(epochs))} r="4"/>
      {Array.from({ length: 9 }, (_, e) => <text key={e} x={x(e)} y="164" textAnchor="middle" className="note">{e}</text>)}
    </svg>
    <div className="llm-strip-legend">
      <span><i className="lx-swatch train"/>{say(t('training loss', 'خسارة التدريب'))} {train(epochs).toFixed(2)}</span>
      <span><i className="lx-swatch valid"/>{say(t('validation loss', 'خسارة التحقق'))} {valid(epochs).toFixed(2)}</span>
    </div>
    <p className={best || epochs < 3 ? 'lx-good' : 'lx-warning'}>{epochs < 3
      ? say(t('Both are still falling: the model has more to learn.', 'كلتاهما ما زالت تنخفض: لدى النموذج المزيد ليتعلمه.'))
      : best ? say(t('Validation is at its lowest: a good point to stop and keep this checkpoint.', 'التحقق في أدنى مستوى له: نقطة جيدة للتوقف والاحتفاظ بنقطة الحفظ هذه.'))
        : say(t('Training loss keeps falling but validation rises: the model is memorising the training examples (overfitting). Go back to an earlier checkpoint.',
          'خسارة التدريب تواصل الانخفاض لكن التحقق يرتفع: النموذج يحفظ أمثلة التدريب (فرط التخصيص). ارجع إلى نقطة حفظ سابقة.'))}</p>
    <p className="lx-muted">{say(t('An illustration with made-up curves. A lower training loss proves a better fit to the training targets, not accuracy, generalization or fewer invented answers: test those directly.',
      'توضيح بمنحنيات مصطنعة. فانخفاض خسارة التدريب يثبت ملاءمة أفضل لأهداف التدريب، لا الدقة ولا التعميم ولا قلة الإجابات المختلقة: فاختبر تلك مباشرةً.'))}</p>
  </div>;
}

// ============================================================= 10 workflow

export function WorkflowList() {
  const say = useTx();
  const [open, setOpen] = useState(0);
  return <div className="lx-workflow">
    <Sub icon="layers">{say(t('The full workflow in eight stages', 'سير العمل الكامل في ثماني مراحل'))}</Sub>
    <ol>
      {WORKFLOW.map((stage, index) => <li key={stage.title.en} className={cls(index === open && 'open', index < open && 'done')}>
        <button type="button" onClick={() => setOpen(index)} aria-expanded={index === open}>
          <span className="lx-flow-no">{index + 1}</span><strong>{say(stage.title)}</strong></button>
        {index === open && <div className="lx-flow-body">
          <p>{say(stage.do)}</p>
          <p className="lx-flow-check"><Icon name="check" size={13}/><span><b>{say(t('Before moving on: ', 'قبل الانتقال: '))}</b>{say(stage.check)}</span></p>
        </div>}
      </li>)}
    </ol>
  </div>;
}

export function OrderGame() {
  const say = useTx();
  const [picked, setPicked] = useState<number[]>([]);
  const done = picked.length === ORDER_CARDS.length;
  const right = done && picked.every((card, index) => card === index);
  return <div className="lx-ordergame">
    <Sub icon="target">{say(t('Activity: put the workflow in order', 'نشاط: رتّب سير العمل'))}</Sub>
    <p className="lx-lead">{say(t('Click the cards in the order you would do them.', 'انقر البطاقات بالترتيب الذي ستنفذها به.'))}</p>
    <div className="lx-cards">
      {ORDER_SHUFFLE.map(card => <button key={card} type="button" disabled={picked.includes(card)} onClick={() => setPicked(current => [...current, card])}>
        {say(ORDER_CARDS[card])}</button>)}
    </div>
    <ol className="lx-picked">
      {picked.map((card, index) => <li key={card} className={done ? (card === index ? 'good' : 'bad') : ''}>{say(ORDER_CARDS[card])}</li>)}
    </ol>
    <div className="button-row">
      <button type="button" className="button small quiet" disabled={!picked.length} onClick={() => setPicked(current => current.slice(0, -1))}>{say(t('Undo', 'تراجع'))}</button>
      <button type="button" className="button small quiet" disabled={!picked.length} onClick={() => setPicked([])}><Icon name="reset" size={13}/>{say(t('Start again', 'ابدأ من جديد'))}</button>
    </div>
    {done && <p className={right ? 'lx-good' : 'lx-warning'} data-testid="order-result">{right
      ? say(t('A defensible order. Notice that the source-based examples come first: with no reviewed data and no baseline, nothing later can be trusted.',
        'ترتيب سليم. لاحظ أن الأمثلة المبنية على المصادر تأتي أولًا: فمن دون بيانات مراجَعة وخط أساس لا يمكن الوثوق بأي شيء لاحق.'))
      : say(t('Not quite. Hint: you cannot attach adapters before the base is loaded, and you evaluate before you decide which adapter to save.',
        'ليس تمامًا. تلميح: لا يمكنك ربط المهايئات قبل تحميل الأساس، وتقيّم قبل أن تقرر أي مهايئ تحفظ.'))}</p>}
  </div>;
}

export function EvaluationPanel() {
  const say = useTx();
  const [merged, setMerged] = useState(false);
  const [file, setFile] = useState(0);
  return <div className="lx-eval">
    <Sub icon="check">{say(t('Evaluate the outcome, not only the loss', 'قيّم النتيجة لا الخسارة وحدها'))}</Sub>
    <div className="lx-criteria">{CRITERIA.map(item => <article key={item.name.en}><h5>{say(item.name)}</h5><p>{say(item.test)}</p></article>)}</div>
    <p className="lx-muted">{say(t('Use the same prompts and generation settings for the base and the adapted model. Include out-of-scope questions and misleading premises. Where possible, let an expert judge without knowing which model wrote which answer.',
      'استخدم الأسئلة وإعدادات التوليد نفسها للنموذج الأساسي والنموذج المكيَّف. وأضف أسئلة خارج النطاق وأسئلة بفرضيات مضللة. وحيث أمكن، دع الخبير يحكم دون أن يعرف أي نموذج كتب أي إجابة.'))}</p>

    <Sub icon="file">{say(t('What a saved adapter package contains', 'ما تحتويه حزمة المهايئ المحفوظة'))}</Sub>
    <div className="lx-package">
      <ul>{PACKAGE.map((item, index) => <li key={item.file}><button type="button" className={index === file ? 'current' : ''} onClick={() => setFile(index)}>
        <Icon name="file" size={13}/><code dir="ltr">{item.file}</code></button></li>)}</ul>
      <p className="lx-package-what" key={file}>{say(PACKAGE[file].what)}</p>
    </div>
    <div className="ft-tabs" role="group" aria-label={say(t('How to use the result', 'كيف تستخدم النتيجة'))}>
      <button type="button" className={!merged ? 'current' : ''} aria-pressed={!merged} onClick={() => setMerged(false)}>{say(t('Base + separate adapter', 'أساس + مهايئ منفصل'))}</button>
      <button type="button" className={merged ? 'current' : ''} aria-pressed={merged} onClick={() => setMerged(true)}>{say(t('Merged model', 'نموذج مدموج'))}</button>
    </div>
    <div className={cls('lx-deploy', merged && 'merged')}>
      <span className="base">{merged ? 'W′ = W + s·B·A' : say(t('base model (frozen)', 'النموذج الأساسي (مجمَّد)'))}</span>
      {!merged && <><b>+</b><span className="adapter">{say(t('adapter', 'المهايئ'))}</span></>}
    </div>
    <p className="lx-muted">{merged
      ? say(t('One model with the original shape and parameter count, the skill built in. Merging a 4-bit training model may need a higher-precision reload first. After merging or re-quantizing, evaluate again: a changed number format can change answers.',
        'نموذج واحد بالشكل وعدد المعاملات الأصليين، والمهارة مبنية فيه. ودمج نموذج تدريب بدقة 4 بت قد يحتاج أولًا إلى إعادة تحميل بدقة أعلى. وبعد الدمج أو إعادة التكميم قيّم من جديد: فتغيّر صيغة الأرقام قد يغيّر الإجابات.'))
      : say(t('The base model is loaded once, and the small adapter is plugged in beside it. Several adapters can share one base. The adapter alone cannot answer anything.',
        'يُحمَّل النموذج الأساسي مرة واحدة ويُركَّب المهايئ الصغير بجانبه. ويمكن لعدة مهايئات أن تتشارك أساسًا واحدًا. والمهايئ وحده لا يجيب عن أي شيء.'))}</p>
  </div>;
}

export function MythGame() {
  const say = useTx();
  const [answers, setAnswers] = useState<(boolean | null)[]>(() => MYTHS.map(() => null));
  const score = answers.filter((answer, index) => answer !== null && answer === MYTHS[index].fact).length;
  return <div className="lx-myths">
    <Sub icon="help">{say(t('True or false? Common statements to correct', 'صح أم خطأ؟ عبارات شائعة تحتاج إلى تصحيح'))}</Sub>
    <p className="lx-muted" data-testid="myth-score">{say(t(`${score} of ${MYTHS.length} right`, `${score} من ${MYTHS.length} صحيحة`))}</p>
    <ol>
      {MYTHS.map((myth, index) => {
        const answer = answers[index];
        const set = (value: boolean) => setAnswers(current => current.map((old, position) => position === index ? value : old));
        return <li key={myth.claim.en} className={answer === null ? '' : answer === myth.fact ? 'good' : 'bad'}>
          <p>{say(myth.claim)}</p>
          <div className="button-row">
            <button type="button" className="button small" disabled={answer !== null} onClick={() => set(true)}>{say(t('True', 'صح'))}</button>
            <button type="button" className="button small" disabled={answer !== null} onClick={() => set(false)}>{say(t('False', 'خطأ'))}</button>
          </div>
          {answer !== null && <p className="lx-fix"><strong>{answer === myth.fact ? say(t('Right.', 'إجابة صحيحة.')) : say(t('Not quite.', 'ليس تمامًا.'))}</strong>{' '}
            {myth.fact ? say(t('It is true. ', 'العبارة صحيحة. ')) : say(t('It is false. ', 'العبارة خاطئة. '))}{say(myth.fix)}</p>}
        </li>;
      })}
    </ol>
  </div>;
}
