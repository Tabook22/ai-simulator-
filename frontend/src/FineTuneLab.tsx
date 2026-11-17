import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import './llm.css';
import './finetune.css';
import { Icon } from './ui';
import type { IconName } from './ui';
import { useI18n } from './i18n';
import { AdapterScene, QuantScene, UnslothScene } from './FineTuneScenes';
import { CHOICES, QUIZ, SCENARIOS, UNSLOTH_STEPS } from './finetuneContent';
import type { Text } from './finetuneContent';
import {
  GPUS, LORA_RANKS, LORA_SIZE, MODEL_SIZES, PRECISIONS, budget, createLora, frozenChanges, loraDelta, quantize,
  sampleWeights, trainLora,
} from './finetuneModel';
import type { LoraState, Matrix, QuantMethod } from './finetuneModel';

/** Pick the English or the Arabic wording. */
function useTx() {
  const { isArabic } = useI18n();
  return (en: string, ar: string) => isArabic ? ar : en;
}
type Tx = ReturnType<typeof useTx>;
const say = (tx: Tx, text: Text) => tx(text.en, text.ar);

const STAGES: { key: string; icon: IconName; tone: string; label: Text; question: Text }[] = [
  { key: 'why', icon: 'bulb', tone: '#5ee7ff',
    label: { en: 'Why fine-tune', ar: 'لماذا الضبط الدقيق' },
    question: { en: 'What does a ready-made model not know?', ar: 'ما الذي لا يعرفه النموذج الجاهز؟' } },
  { key: 'data', icon: 'file', tone: '#a78bfa',
    label: { en: 'The examples', ar: 'الأمثلة' },
    question: { en: 'What do we teach it with?', ar: 'بماذا نعلّمه؟' } },
  { key: 'freeze', icon: 'lock', tone: '#7aa2ff',
    label: { en: 'Freeze the base', ar: 'تجميد الأساس' },
    question: { en: 'Why not retrain every weight?', ar: 'لماذا لا نعيد تدريب كل الأوزان؟' } },
  { key: 'lora', icon: 'layers', tone: '#ffc46b',
    label: { en: 'LoRA', ar: 'LoRA' },
    question: { en: 'How are the new weights added?', ar: 'كيف تُضاف الأوزان الجديدة؟' } },
  { key: 'quant', icon: 'grid', tone: '#5ef2a0',
    label: { en: 'Quantization', ar: 'التكميم' },
    question: { en: 'How does a big model fit in a small memory?', ar: 'كيف يتسع نموذج كبير في ذاكرة صغيرة؟' } },
  { key: 'qlora', icon: 'chip', tone: '#ff8fd0',
    label: { en: 'QLoRA', ar: 'QLoRA' },
    question: { en: 'What happens when we combine the two?', ar: 'ماذا يحدث حين نجمع الاثنين؟' } },
  { key: 'unsloth', icon: 'code', tone: '#ff8f6b',
    label: { en: 'Unsloth', ar: 'Unsloth' },
    question: { en: 'How is it done in real code?', ar: 'كيف يُنفَّذ ذلك في شيفرة حقيقية؟' } },
];

const tone = (color: string) => ({ '--tone': color }) as CSSProperties;
const gb = (value: number) => value >= 10 ? value.toFixed(0) : value.toFixed(1);
const millions = (value: number) => value >= 1e9 ? `${(value / 1e9).toFixed(1)}B` : `${(value / 1e6).toFixed(1)}M`;

function Stage({ index, summary, notes, flow, scene, children }: {
  index: number; summary: ReactNode; flow?: string; children: ReactNode;
  /** An animated scene shown across the full width, above the hands-on part. */
  scene?: ReactNode;
  notes: { what: string; why: string; tryIt: string };
}) {
  const tx = useTx();
  const stage = STAGES[index];
  return <>
    <section className="llm-stage" id={`ft-${stage.key}`} data-stage={index} style={tone(stage.tone)}
      aria-labelledby={`ft-${stage.key}-title`}>
      <header className="llm-stage-top">
        <span className="llm-stage-number"><Icon name={stage.icon} size={20}/></span>
        <div className="llm-stage-title">
          <span className="llm-stage-eyebrow">{tx(`Part ${index + 1} of ${STAGES.length}`, `الجزء ${index + 1} من ${STAGES.length}`)}</span>
          <h3 id={`ft-${stage.key}-title`}>{say(tx, stage.label)}</h3>
          <p>{say(tx, stage.question)}</p>
        </div>
        <span className="llm-stage-out" data-keep="">{summary}</span>
      </header>
      {scene && <div className="ft-scene-row">{scene}</div>}
      <div className="llm-stage-body">
        <div className="llm-stage-visual">{children}</div>
        <aside className="llm-notes">
          <h4>{tx('The idea', 'الفكرة')}</h4>
          <p>{notes.what}</p>
          <h4>{tx('Why it matters', 'لماذا يهم ذلك')}</h4>
          <p>{notes.why}</p>
          <p className="llm-try"><Icon name="bulb" size={15}/><span><strong>{tx('Try it.', 'جرّب.')}</strong> {notes.tryIt}</span></p>
        </aside>
      </div>
    </section>
    {flow && <div className="llm-flow" aria-hidden="true"><i/><span>{flow}</span></div>}
  </>;
}

/** A matrix drawn as coloured cells: cyan positive, coral negative, brighter is larger. */
function Heat({ matrix, peak, label, note, locked, hot }: {
  matrix: Matrix; peak: number; label: string; note: string; locked?: boolean; hot?: boolean;
}) {
  const [hover, setHover] = useState<string | null>(null);
  return <figure className={`ft-heat ${locked ? 'locked' : ''} ${hot ? 'hot' : ''}`}>
    <figcaption>
      <strong>{locked && <Icon name="lock" size={12}/>}{hot && <Icon name="flame" size={12}/>}{label}</strong>
      <span className="math">{hover ?? note}</span>
    </figcaption>
    <div className="ft-heat-grid" style={{ gridTemplateColumns: `repeat(${matrix[0].length}, var(--cell))` }}
      onMouseLeave={() => setHover(null)}>
      {matrix.flatMap((row, r) => row.map((value, c) => {
        const strength = Math.min(1, Math.abs(value) / peak);
        const alpha = (0.06 + 0.86 * strength).toFixed(3);
        return <i key={`${r}-${c}`} onMouseEnter={() => setHover(value.toFixed(3))}
          style={{ background: value >= 0 ? `rgba(94, 231, 255, ${alpha})` : `rgba(255, 143, 107, ${alpha})` }}/>;
      }))}
    </div>
  </figure>;
}

function Spark({ history }: { history: number[] }) {
  const max = Math.max(...history, 1e-6);
  const points = history.map((loss, index) =>
    `${(6 + 288 * index / Math.max(1, history.length - 1)).toFixed(1)},${(54 - 46 * loss / max).toFixed(1)}`).join(' ');
  return <svg className="ft-spark" viewBox="0 0 300 60" role="img" aria-label="Loss">
    <line x1="6" x2="294" y1="54" y2="54"/>
    {history.length > 1 && <polyline points={points}/>}
  </svg>;
}

// ------------------------------------------------------------------ 1 why

function WhyStage() {
  const tx = useTx();
  const [pick, setPick] = useState(0);
  const scenario = SCENARIOS[pick];
  return <>
    <div className="ft-tabs" role="group" aria-label={tx('Choose a situation', 'اختر موقفًا')}>
      {SCENARIOS.map((item, index) => <button key={item.name.en} type="button" className={index === pick ? 'current' : ''}
        aria-pressed={index === pick} onClick={() => setPick(index)}>{say(tx, item.name)}</button>)}
    </div>
    <div className="ft-question"><Icon name="help" size={16}/><span>{say(tx, scenario.question)}</span></div>
    <div className="ft-compare">
      <article className="ft-answer base">
        <h4><Icon name="lock" size={13}/>{tx('Base model', 'النموذج الأساسي')}</h4>
        <p>{say(tx, scenario.base)}</p>
      </article>
      <article className="ft-answer tuned" key={pick}>
        <h4><Icon name="sparkles" size={13}/>{tx('After fine-tuning', 'بعد الضبط الدقيق')}</h4>
        <p>{say(tx, scenario.tuned)}</p>
      </article>
    </div>
    <p className="llm-panel-note">{say(tx, scenario.lesson)} {tx('(An illustration written for this lesson, not a live model.)', '(توضيح كُتب لهذا الدرس، وليس نموذجًا يعمل مباشرة.)')}</p>
    <h4 className="llm-sub">{tx('Three ways to change what a model does', 'ثلاث طرق لتغيير ما يفعله النموذج')}</h4>
    <div className="ft-choices">
      {CHOICES.map((choice, index) => <div key={choice.name.en} className={index === 2 ? 'chosen' : ''}>
        <strong>{say(tx, choice.name)}</strong>
        <p>{say(tx, choice.what)}</p>
        <small>{say(tx, choice.use)}</small>
      </div>)}
    </div>
  </>;
}

// ----------------------------------------------------------------- 2 data

function DataStage() {
  const tx = useTx();
  const [pick, setPick] = useState(0);
  const examples = SCENARIOS[0].examples;
  const example = examples[pick];
  return <>
    <h4 className="llm-sub">{tx('A training file is a list of questions with the answers you want', 'ملف التدريب قائمة أسئلة مع الإجابات التي تريدها')}</h4>
    <div className="ft-rows">
      {examples.map((item, index) => <button key={item.ask.en} type="button" className={index === pick ? 'current' : ''}
        aria-pressed={index === pick} onClick={() => setPick(index)}>
        <span className="ft-row-number">{index + 1}</span>
        <span><b>{say(tx, item.ask)}</b><small>{say(tx, item.answer)}</small></span>
      </button>)}
    </div>
    <h4 className="llm-sub">{tx('How the model sees example', 'كيف يرى النموذج المثال')} {pick + 1}</h4>
    <div className="ft-chat" dir="ltr">
      <span className="ft-tag">&lt;|im_start|&gt;user</span>
      <p dir="auto">{say(tx, example.ask)}</p>
      <span className="ft-tag">&lt;|im_end|&gt;</span>
      <span className="ft-tag">&lt;|im_start|&gt;assistant</span>
      <p dir="auto" className="ft-learned">{say(tx, example.answer)}</p>
      <span className="ft-tag">&lt;|im_end|&gt;</span>
    </div>
    <div className="llm-strip-legend">
      <span><i className="ft-swatch tag"/>{tx('chat markers the model already knows', 'علامات المحادثة التي يعرفها النموذج مسبقًا')}</span>
      <span><i className="ft-swatch learned"/>{tx('the part it is trained to produce', 'الجزء الذي يُدرَّب على إنتاجه')}</span>
    </div>
  </>;
}

// --------------------------------------------------------------- 3 freeze

function FreezeStage() {
  const tx = useTx();
  const [lora, setLora] = useState(true);
  const plan = budget(MODEL_SIZES[2], 16, 16, true);
  const cells = Array.from({ length: 160 }, (_, index) => index);
  return <>
    <div className="ft-tabs" role="group" aria-label={tx('Training method', 'طريقة التدريب')}>
      <button type="button" className={!lora ? 'current' : ''} aria-pressed={!lora} onClick={() => setLora(false)}>
        {tx('Full fine-tuning', 'ضبط دقيق كامل')}</button>
      <button type="button" className={lora ? 'current' : ''} aria-pressed={lora} onClick={() => setLora(true)}>
        {tx('Frozen base + adapter', 'أساس مجمَّد + مهايئ')}</button>
    </div>
    <div className={lora ? 'ft-wall frozen' : 'ft-wall'}>
      <div className="ft-wall-grid" aria-hidden="true">{cells.map(index => <i key={index} style={{ animationDelay: `${(index * 37 % 100) / 50}s` }}/>)}</div>
      {lora && <div className="ft-wall-adapter" aria-hidden="true"><i/><i/><i/><i/><i/><i/></div>}
      <p>{lora
        ? tx('Every original weight is locked. A thin strip of new weights is added beside them, and only that strip learns.',
          'كل وزن أصلي مقفل. ويُضاف بجانبها شريط رفيع من أوزان جديدة، وهذا الشريط وحده يتعلم.')
        : tx('Every weight is unlocked and updated on every step. Each one also needs a gradient and optimizer memory.',
          'كل الأوزان مفتوحة وتُحدَّث في كل خطوة. وكل وزن يحتاج أيضًا إلى تدرّج وذاكرة للمحسّن.')}</p>
    </div>
    <dl className="ft-facts">
      <div><dt>{tx('Model', 'النموذج')}</dt><dd>8B</dd></div>
      <div><dt>{tx('Weights that learn', 'الأوزان التي تتعلم')}</dt>
        <dd>{lora ? millions(plan.adapterParameters) : millions(plan.parameters)}</dd>
        <small>{lora ? `${(plan.trainableShare * 100).toFixed(2)}%` : '100%'}</small></div>
      <div><dt>{tx('Memory to train (16-bit)', 'ذاكرة التدريب (16 بت)')}</dt>
        <dd>≈ {gb(lora ? plan.totalGb : plan.fullGb)} GB</dd></div>
      <div><dt>{tx('File you save', 'الملف الذي تحفظه')}</dt>
        <dd>{lora ? `≈ ${plan.adapterFileMb.toFixed(0)} MB` : `≈ ${gb(plan.parameters * 2 / 1024 ** 3)} GB`}</dd></div>
    </dl>
  </>;
}

// ----------------------------------------------------------------- 4 lora

function LoraStage() {
  const tx = useTx();
  const [state, setState] = useState<LoraState>(() => createLora(2));
  const [merged, setMerged] = useState(false);
  const delta = loraDelta(state);
  const need = state.goal.map((row, r) => row.map((value, c) => value - state.frozen[r][c]));
  const peak = Math.max(...state.frozen.flat().map(Math.abs));
  const smallPeak = Math.max(...need.flat().map(Math.abs), 0.01);
  const adapterPeak = Math.max(...state.a.flat().map(Math.abs), ...state.b.flat().map(Math.abs), 0.01);
  const loss = state.history[state.history.length - 1];
  const trainable = 2 * LORA_SIZE * state.rank;
  const all = LORA_SIZE * LORA_SIZE;
  const restart = (rank: number) => { setState(createLora(rank)); setMerged(false); };
  const train = (steps: number) => { setState(current => trainLora(current, steps)); setMerged(false); };
  const result = state.frozen.map((row, r) => row.map((value, c) => value + delta[r][c]));
  return <>
    <h4 className="llm-sub ft-handson first"><Icon name="flask" size={13}/>{tx('Now train a real adapter yourself', 'والآن درّب مهايئًا حقيقيًا بنفسك')}</h4>
    <div className="ft-controls">
      <div className="ft-tabs" role="group" aria-label={tx('Adapter rank', 'رتبة المهايئ')}>
        <span>{tx('Rank r', 'الرتبة r')}</span>
        {LORA_RANKS.map(rank => <button key={rank} type="button" className={rank === state.rank ? 'current' : ''}
          aria-pressed={rank === state.rank} aria-label={tx(`Rank ${rank}`, `الرتبة ${rank}`)}
          onClick={() => restart(rank)}>{rank}</button>)}
      </div>
      <div className="button-row">
        <button type="button" className="button primary" onClick={() => train(1)}><Icon name="play" size={14}/>{tx('Train 1 step', 'درّب خطوة واحدة')}</button>
        <button type="button" className="button" onClick={() => train(40)}>{tx('Train 40 steps', 'درّب 40 خطوة')}</button>
        <button type="button" className="button quiet" onClick={() => restart(state.rank)}><Icon name="reset" size={14}/>{tx('Start again', 'ابدأ من جديد')}</button>
      </div>
    </div>
    <div className="ft-equation" dir="ltr">
      <span className="frozen">W·x</span><b>+</b><span className="hot">B·(A·x)</span><b>=</b><span>{tx('output', 'المخرج')}</span>
    </div>
    <div className="ft-lora">
      <Heat locked matrix={state.frozen} peak={peak} label={tx('W: original weights', 'W: الأوزان الأصلية')}
        note={tx(`${all} numbers · frozen`, `${all} رقمًا · مجمَّدة`)}/>
      <span className="ft-op">+</span>
      <div className="ft-pair">
        <Heat hot matrix={state.b} peak={adapterPeak} label="B" note={`${LORA_SIZE} × ${state.rank}`}/>
        <span className="ft-op small">×</span>
        <Heat hot matrix={state.a} peak={adapterPeak} label="A" note={`${state.rank} × ${LORA_SIZE}`}/>
      </div>
      <span className="ft-op">=</span>
      <Heat matrix={delta} peak={smallPeak} label={tx('B·A: the change it makes', 'B·A: التغيير الذي يصنعه')}
        note={tx('what the adapter adds', 'ما يضيفه المهايئ')}/>
      <Heat matrix={need} peak={smallPeak} label={tx('The change the task needs', 'التغيير الذي تحتاجه المهمة')}
        note={tx('the adapter should match this', 'يجب أن يطابقه المهايئ')}/>
    </div>
    <dl className="ft-facts">
      <div><dt>{tx('Steps', 'الخطوات')}</dt><dd data-testid="lora-steps">{state.steps}</dd></div>
      <div><dt>{tx('Loss', 'الخسارة')}</dt><dd data-testid="lora-loss">{loss.toFixed(3)}</dd>
        <small>{tx(`started at ${state.history[0].toFixed(2)}`, `بدأت من ${state.history[0].toFixed(2)}`)}</small></div>
      <div><dt>{tx('Numbers that learn', 'الأرقام التي تتعلم')}</dt><dd>{trainable}</dd>
        <small>{tx(`instead of ${all}`, `بدلًا من ${all}`)}</small></div>
      <div className="ft-proof"><dt>{tx('Frozen numbers changed', 'أرقام مجمَّدة تغيّرت')}</dt>
        <dd data-testid="lora-frozen">{frozenChanges(state)}</dd>
        <small>{tx(`of ${all}`, `من ${all}`)}</small></div>
    </dl>
    <Spark history={state.history}/>
    <div className="ft-merge">
      <button type="button" className="button" disabled={state.steps === 0} onClick={() => setMerged(value => !value)}>
        <Icon name="layers" size={14}/>{merged ? tx('Separate again', 'افصل من جديد') : tx('Merge the adapter into W', 'ادمج المهايئ في W')}</button>
      <p>{merged
        ? tx('Merged: W + B·A is saved as one ordinary matrix. The model is the same size as before and runs at the same speed.',
          'تم الدمج: W + B·A محفوظة كمصفوفة عادية واحدة. النموذج بالحجم نفسه كما كان ويعمل بالسرعة نفسها.')
        : tx('While training, the adapter stays separate. Afterwards it can be kept as a small file or merged into the base.',
          'أثناء التدريب يبقى المهايئ منفصلًا. وبعده يمكن حفظه كملف صغير أو دمجه في الأساس.')}</p>
    </div>
    {merged && <div className="ft-lora merged">
      <Heat matrix={result} peak={peak} label={tx('W + B·A: the merged weights', 'W + B·A: الأوزان المدموجة')} note={tx(`${all} numbers`, `${all} رقمًا`)}/>
      <Heat matrix={state.goal} peak={peak} label={tx('What the task wanted', 'ما أرادته المهمة')} note={tx(`${all} numbers`, `${all} رقمًا`)}/>
    </div>}
  </>;
}

// ---------------------------------------------------------------- 5 quant

const SAMPLE = sampleWeights(14);
const MANY = sampleWeights(4096, 5);

function QuantStage() {
  const tx = useTx();
  const [bits, setBits] = useState(4);
  const [method, setMethod] = useState<QuantMethod>('uniform');
  const used: QuantMethod = bits === 4 ? method : 'uniform';
  const result = quantize(SAMPLE, bits, used);
  const wide = quantize(MANY, bits, used);
  const scale = Math.max(...result.levels.map(Math.abs));
  const x = (value: number) => 20 + 560 * (value + scale) / (2 * scale);
  const model = MODEL_SIZES[2];
  return <>
    <h4 className="llm-sub ft-handson first"><Icon name="flask" size={13}/>{tx('Now quantize a whole layer yourself', 'والآن كمّم طبقة كاملة بنفسك')}</h4>
    <div className="ft-controls">
      <div className="ft-tabs" role="group" aria-label={tx('Bits per weight', 'عدد البتات لكل وزن')}>
        <span>{tx('Bits per weight', 'بتات لكل وزن')}</span>
        {[8, 4, 3, 2].map(value => <button key={value} type="button" className={value === bits ? 'current' : ''}
          aria-pressed={value === bits} aria-label={tx(`${value} bits`, `${value} بت`)} onClick={() => setBits(value)}>{value}</button>)}
      </div>
      <div className="ft-tabs" role="group" aria-label={tx('Where the levels sit', 'مواضع المستويات')}>
        <button type="button" className={used === 'uniform' ? 'current' : ''} aria-pressed={used === 'uniform'}
          onClick={() => setMethod('uniform')}>{tx('Even spacing', 'تباعد متساوٍ')}</button>
        <button type="button" className={used === 'nf4' ? 'current' : ''} aria-pressed={used === 'nf4'} disabled={bits !== 4}
          title={tx('NF4 is a 4-bit format', 'صيغة NF4 خاصة بدقة 4 بت')} onClick={() => setMethod('nf4')}>NF4</button>
      </div>
    </div>
    <svg className="ft-line" viewBox="0 0 600 150" role="img"
      aria-label={tx(`Weights snapping to ${result.levels.length} levels`, `الأوزان تنجذب إلى ${result.levels.length} مستوى`)}>
      <text x="20" y="16">{tx('original weights (32-bit)', 'الأوزان الأصلية (32 بت)')}</text>
      <text x="20" y="143">{tx(`stored as one of ${result.levels.length} levels`, `تُخزَّن كواحد من ${result.levels.length} مستوى`)}</text>
      <line className="axis" x1="20" x2="580" y1="34" y2="34"/>
      <line className="axis" x1="20" x2="580" y1="112" y2="112"/>
      {result.levels.map((level, index) => <line key={index} className="tick" x1={x(level)} x2={x(level)} y1="104" y2="120"/>)}
      {SAMPLE.map((value, index) => <g key={index}>
        <line className="snap" x1={x(value)} y1="38" x2={x(result.restored[index])} y2="106"/>
        <circle className="was" cx={x(value)} cy="34" r="4.5"/>
        <circle className="now" cx={x(result.restored[index])} cy="112" r="4.5"/>
      </g>)}
    </svg>
    <div className="table-scroll ft-table">
      <table>
        <thead><tr><th>{tx('Original', 'الأصلي')}</th><th>{tx('Stored code', 'الرمز المخزَّن')}</th>
          <th>{tx('Read back as', 'يُقرأ على أنه')}</th><th>{tx('Rounding error', 'خطأ التقريب')}</th></tr></thead>
        <tbody>{SAMPLE.slice(0, 5).map((value, index) => <tr key={index}>
          <td>{value.toFixed(5)}</td>
          <td className="ft-code">{result.codes[index].toString(2).padStart(bits, '0')}</td>
          <td>{result.restored[index].toFixed(5)}</td>
          <td>{Math.abs(value - result.restored[index]).toFixed(5)}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <dl className="ft-facts">
      <div><dt>{tx('Levels', 'المستويات')}</dt><dd>{result.levels.length}</dd><small>2^{bits}</small></div>
      <div><dt>{tx('Average error', 'متوسط الخطأ')}</dt><dd data-testid="quant-error">{wide.meanError.toFixed(4)}</dd>
        <small>{tx('over 4,096 weights', 'على 4,096 وزنًا')}</small></div>
      <div><dt>{tx('Size of an 8B model', 'حجم نموذج 8B')}</dt><dd>≈ {gb(model.billions * 1e9 * bits / 8 / 1024 ** 3)} GB</dd>
        <small>{tx(`${gb(model.billions * 1e9 * 4 / 1024 ** 3)} GB at 32-bit`, `${gb(model.billions * 1e9 * 4 / 1024 ** 3)} غ.ب بدقة 32 بت`)}</small></div>
    </dl>
    <p className="llm-panel-note">{used === 'nf4'
      ? tx('NF4 puts more of its 16 levels near zero, where most weights live, so the same 4 bits lose less. This is the format QLoRA uses.',
        'صيغة NF4 تضع عددًا أكبر من مستوياتها الستة عشر قرب الصفر، حيث تقع معظم الأوزان، فتخسر البتات الأربع نفسها أقل. وهذه هي الصيغة التي تستخدمها QLoRA.')
      : tx('Each weight is rounded to the nearest level and only the level’s number is stored. Fewer bits mean fewer levels and a larger rounding error.',
        'كل وزن يُقرَّب إلى أقرب مستوى ويُخزَّن رقم المستوى فقط. البتات الأقل تعني مستويات أقل وخطأ تقريب أكبر.')}</p>
  </>;
}

// ---------------------------------------------------------------- 6 qlora

function QloraStage() {
  const tx = useTx();
  const [size, setSize] = useState(2);
  const [bits, setBits] = useState(4);
  const [rank, setRank] = useState(16);
  const [wide, setWide] = useState(true);
  const plan = budget(MODEL_SIZES[size], bits, rank, wide);
  const limit = Math.max(plan.totalGb, 24);
  const part = (value: number) => `${(value / limit * 100).toFixed(1)}%`;
  return <>
    <div className="ft-diagram" dir="ltr">
      <div className="ft-node frozen"><Icon name="lock" size={16}/><strong>{tx('Base model', 'النموذج الأساسي')}</strong>
        <small>{tx(`${bits}-bit · frozen`, `${bits} بت · مجمَّد`)}</small></div>
      <span className="ft-plus">+</span>
      <div className="ft-node hot"><Icon name="flame" size={16}/><strong>{tx('LoRA adapters', 'مهايئات LoRA')}</strong>
        <small>{tx('16-bit · learning', '16 بت · تتعلم')}</small></div>
      <span className="ft-arrow"><i/></span>
      <div className="ft-node"><Icon name="target" size={16}/><strong>{tx('Answer and loss', 'الإجابة والخسارة')}</strong>
        <small>{tx('error flows back', 'الخطأ يعود')}</small></div>
    </div>
    <p className="llm-panel-note">{tx('The error travels back through the frozen 4-bit weights, which are read but not changed, and lands only on the adapters.',
      'الخطأ يسافر رجوعًا عبر الأوزان المجمَّدة ذات الـ 4 بت، فتُقرأ ولا تُغيَّر، ويستقر على المهايئات وحدها.')}</p>
    <h4 className="llm-sub">{tx('Will it fit? Change the model and the settings', 'هل يتسع؟ غيّر النموذج والإعدادات')}</h4>
    <div className="ft-controls wrap">
      <div className="ft-tabs" role="group" aria-label={tx('Model size', 'حجم النموذج')}>
        <span>{tx('Model', 'النموذج')}</span>
        {MODEL_SIZES.map((item, index) => <button key={item.label} type="button" className={index === size ? 'current' : ''}
          aria-pressed={index === size} aria-label={tx(`Model ${item.label}`, `النموذج ${item.label}`)} onClick={() => setSize(index)}>{item.label}</button>)}
      </div>
      <div className="ft-tabs" role="group" aria-label={tx('Base precision', 'دقة الأساس')}>
        <span>{tx('Base', 'الأساس')}</span>
        {PRECISIONS.map(item => <button key={item.bits} type="button" className={item.bits === bits ? 'current' : ''}
          aria-pressed={item.bits === bits} aria-label={tx(`${item.bits}-bit base`, `أساس ${item.bits} بت`)} onClick={() => setBits(item.bits)}>{item.bits}</button>)}
      </div>
      <div className="ft-tabs" role="group" aria-label={tx('Adapter rank', 'رتبة المهايئ')}>
        <span>r</span>
        {[8, 16, 32, 64].map(value => <button key={value} type="button" className={value === rank ? 'current' : ''}
          aria-pressed={value === rank} aria-label={tx(`Adapter rank ${value}`, `رتبة المهايئ ${value}`)} onClick={() => setRank(value)}>{value}</button>)}
      </div>
      <label className="ft-check"><input type="checkbox" checked={wide} onChange={event => setWide(event.target.checked)}/>
        {tx('Adapters on the MLP layers too', 'مهايئات على طبقات MLP أيضًا')}</label>
    </div>
    <div className="ft-bar" role="img" aria-label={tx(`About ${gb(plan.totalGb)} GB in total`, `نحو ${gb(plan.totalGb)} غ.ب في المجموع`)}>
      <i className="base" style={{ width: part(plan.baseGb) }}/>
      <i className="adapter" style={{ width: part(plan.adapterGb) }}/>
      <i className="working" style={{ width: part(plan.workingGb) }}/>
    </div>
    <div className="llm-strip-legend">
      <span><i className="ft-swatch base"/>{tx('frozen base', 'الأساس المجمَّد')} {gb(plan.baseGb)} GB</span>
      <span><i className="ft-swatch adapter"/>{tx('adapters and their training memory', 'المهايئات وذاكرة تدريبها')} {plan.adapterGb.toFixed(2)} GB</span>
      <span><i className="ft-swatch working"/>{tx('working memory', 'ذاكرة العمل')} {gb(plan.workingGb)} GB</span>
    </div>
    <dl className="ft-facts">
      <div><dt>{tx('Total to train', 'المجموع للتدريب')}</dt><dd data-testid="qlora-total">≈ {gb(plan.totalGb)} GB</dd></div>
      <div><dt>{tx('Weights that learn', 'الأوزان التي تتعلم')}</dt><dd>{millions(plan.adapterParameters)}</dd>
        <small>{(plan.trainableShare * 100).toFixed(2)}%</small></div>
      <div><dt>{tx('Full fine-tuning instead', 'لو كان ضبطًا دقيقًا كاملًا')}</dt><dd>≈ {gb(plan.fullGb)} GB</dd></div>
    </dl>
    <ul className="ft-gpus" aria-label={tx('Which GPUs can train it', 'أي بطاقات GPU تستطيع تدريبه')}>
      {GPUS.map(gpu => {
        const fits = plan.totalGb <= gpu.gb * 0.92;
        return <li key={gpu.gb} className={fits ? 'fits' : ''}>
          <Icon name={fits ? 'check' : 'close'} size={13}/><strong>{gpu.gb} GB</strong><span data-keep="">{gpu.name}</span>
        </li>;
      })}
    </ul>
    <p className="llm-panel-note">{tx('These are rough classroom estimates. Real use also depends on the longest example and the batch size.',
      'هذه تقديرات تقريبية للصف. والاستخدام الفعلي يعتمد أيضًا على أطول مثال وحجم الدفعة.')}</p>
  </>;
}

// -------------------------------------------------------------- 7 unsloth

function UnslothStage() {
  const tx = useTx();
  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState(false);
  const current = UNSLOTH_STEPS[step];
  function copy() {
    void navigator.clipboard?.writeText(current.code).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  }
  return <>
    <h4 className="llm-sub ft-handson first"><Icon name="code" size={13}/>{tx('The real code, step by step', 'الشيفرة الحقيقية، خطوة بخطوة')}</h4>
    <ol className="ft-steps">
      {UNSLOTH_STEPS.map((item, index) => <li key={item.title.en}>
        <button type="button" className={index === step ? 'current' : index < step ? 'done' : ''}
          aria-current={index === step ? 'step' : undefined} onClick={() => { setStep(index); setCopied(false); }}>
          <span>{index + 1}</span>{say(tx, item.title)}
        </button>
      </li>)}
    </ol>
    <div className="ft-step" key={step}>
      <p>{say(tx, current.does)}</p>
      <div className="ft-codebox">
        <button type="button" className="button small" onClick={copy}><Icon name={copied ? 'check' : 'copy'} size={13}/>
          {copied ? tx('Copied', 'تم النسخ') : tx('Copy', 'نسخ')}</button>
        <pre dir="ltr"><code>{current.code}</code></pre>
      </div>
      <p className="ft-memory"><Icon name="chip" size={14}/><span><strong>{tx('In memory:', 'في الذاكرة:')}</strong> {say(tx, current.memory)}</span></p>
    </div>
    <div className="button-row">
      <button type="button" className="button small" disabled={step === 0} onClick={() => setStep(step - 1)}>
        <Icon name="previous" size={14}/>{tx('Back', 'رجوع')}</button>
      <button type="button" className="button small primary" disabled={step === UNSLOTH_STEPS.length - 1} onClick={() => setStep(step + 1)}>
        {tx('Next step', 'الخطوة التالية')}<Icon name="next" size={14}/></button>
    </div>
    <p className="llm-panel-note">{tx('Model names and options change between versions. Check the Unsloth documentation for the current ones before you run this.',
      'أسماء النماذج والخيارات تتغير بين الإصدارات. راجع توثيق Unsloth لمعرفة الحالية منها قبل التشغيل.')}</p>
  </>;
}

// ------------------------------------------------------------------- quiz

function Quiz() {
  const tx = useTx();
  const [answers, setAnswers] = useState<(number | null)[]>(() => QUIZ.map(() => null));
  const score = answers.filter((answer, index) => answer === QUIZ[index].right).length;
  const done = answers.every(answer => answer !== null);
  return <section className="ft-quiz" aria-labelledby="ft-quiz-title">
    <header>
      <h3 id="ft-quiz-title">{tx('Check yourself', 'اختبر نفسك')}</h3>
      <span className="llm-stage-out" data-testid="quiz-score">{score} / {QUIZ.length}</span>
    </header>
    {QUIZ.map((item, index) => {
      const picked = answers[index];
      return <fieldset key={item.ask.en}>
        <legend>{index + 1}. {say(tx, item.ask)}</legend>
        {item.options.map((option, choice) => <button key={option.en} type="button" disabled={picked !== null}
          className={picked === null ? '' : choice === item.right ? 'right' : choice === picked ? 'wrong' : ''}
          onClick={() => setAnswers(current => current.map((old, position) => position === index ? choice : old))}>
          {say(tx, option)}</button>)}
        {picked !== null && <p className={picked === item.right ? 'right' : 'wrong'}>
          <strong>{picked === item.right ? tx('Correct.', 'صحيح.') : tx('Not quite.', 'ليس تمامًا.')}</strong> {say(tx, item.why)}</p>}
      </fieldset>;
    })}
    {done && <button type="button" className="button" onClick={() => setAnswers(QUIZ.map(() => null))}>
      <Icon name="reset" size={14}/>{tx('Try again', 'حاول مرة أخرى')}</button>}
  </section>;
}

// -------------------------------------------------------------------- lab

export function FineTuneLab() {
  const tx = useTx();
  const [active, setActive] = useState(0);
  const lab = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lab.current) return;
    const observer = new IntersectionObserver(entries => {
      const seen = entries.filter(entry => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
      if (seen) setActive(Number((seen.target as HTMLElement).dataset.stage));
    }, { rootMargin: '-25% 0px -55% 0px', threshold: [0, 0.2, 0.6] });
    lab.current.querySelectorAll('.llm-stage').forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  function goTo(index: number) {
    document.getElementById(`ft-${STAGES[index].key}`)?.scrollIntoView({
      block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
    setActive(index);
  }

  const trio = [
    { stage: 4, icon: 'grid' as IconName, name: tx('Quantization', 'التكميم'),
      job: tx('Makes the model small enough to load.', 'يجعل النموذج صغيرًا بما يكفي لتحميله.'),
      how: tx('Stores each weight in 4 bits instead of 16 or 32.', 'يخزّن كل وزن في 4 بتات بدلًا من 16 أو 32.') },
    { stage: 5, icon: 'chip' as IconName, name: 'QLoRA',
      job: tx('Trains the model without changing it.', 'يدرّب النموذج دون أن يغيّره.'),
      how: tx('Freezes the 4-bit base and trains a tiny adapter beside it.', 'يجمّد الأساس ذا الـ 4 بت ويدرّب مهايئًا صغيرًا بجانبه.') },
    { stage: 6, icon: 'code' as IconName, name: 'Unsloth',
      job: tx('The toolkit that does both for you.', 'الأداة التي تنفّذ الاثنين لك.'),
      how: tx('A Python library: load, adapt, train and export in a few lines.', 'مكتبة Python: تحميل وتهيئة وتدريب وتصدير في بضعة أسطر.') },
  ];

  return <div className="llm-lab ft-lab" ref={lab}>
    <header className="llm-hero ft-hero">
      <div className="llm-hero-copy">
        <div className="eyebrow">{tx('Fine-tuning lab', 'مختبر الضبط الدقيق')}</div>
        <h2>{tx('Teach a ready-made model your own subject', 'علّم نموذجًا جاهزًا مادتك أنت')}</h2>
        <p>{tx('A foundation model such as Qwen has already read a huge amount of text, and its weights are free to download. Fine-tuning continues its training on your examples, so it learns your subject, your format, or your way of answering. This lab shows what really happens to the weights, and how quantization, QLoRA and Unsloth make it possible on an ordinary computer.',
          'النموذج الأساسي مثل Qwen قرأ مسبقًا كمًّا هائلًا من النصوص، وأوزانه متاحة للتنزيل مجانًا. والضبط الدقيق يكمل تدريبه على أمثلتك، فيتعلم مادتك أو صيغتك أو طريقتك في الإجابة. هذا المختبر يعرض ما يحدث فعلًا للأوزان، وكيف يجعل التكميم و QLoRA و Unsloth ذلك ممكنًا على حاسوب عادي.')}</p>
      </div>
      <div className="ft-trio">
        {trio.map(item => <button key={item.name} type="button" style={tone(STAGES[item.stage].tone)} onClick={() => goTo(item.stage)}>
          <span className="ft-trio-icon"><Icon name={item.icon} size={18}/></span>
          <span><strong>{item.name}</strong><b>{item.job}</b><small>{item.how}</small></span>
        </button>)}
      </div>
    </header>

    <div className="llm-layout">
      <nav className="llm-rail" aria-label={tx('Parts of the lesson', 'أجزاء الدرس')}>
        <span className="llm-rail-title">{tx('From base model to your model', 'من النموذج الأساسي إلى نموذجك')}</span>
        <ol>
          {STAGES.map((stage, index) => <li key={stage.key} style={tone(stage.tone)}>
            <button type="button" className={active === index ? 'current' : ''} aria-current={active === index ? 'step' : undefined}
              aria-label={tx(`Part ${index + 1}: ${stage.label.en}`, `الجزء ${index + 1}: ${stage.label.ar}`)} onClick={() => goTo(index)}>
              <span className="llm-rail-dot">{index + 1}</span>
              <span className="llm-rail-text"><strong>{say(tx, stage.label)}</strong><small>{say(tx, stage.question)}</small></span>
            </button>
          </li>)}
        </ol>
      </nav>

      <div className="llm-stages">
        <Stage index={0} summary={tx('base → specialist', 'أساسي ← متخصص')} flow={tx('so we need examples', 'إذن نحتاج إلى أمثلة')}
          notes={{
            what: tx('A base (foundation) model knows language and general knowledge, but nothing about your college, your format, or your course. Fine-tuning is extra training on your own examples, starting from the weights it already has.',
              'النموذج الأساسي يعرف اللغة والمعرفة العامة، لكنه لا يعرف شيئًا عن كليتك أو صيغتك أو مقررك. والضبط الدقيق تدريب إضافي على أمثلتك أنت، يبدأ من الأوزان التي يملكها النموذج مسبقًا.'),
            why: tx('Training a model from nothing needs months and millions. Starting from open weights, a small team can build a specialist in an afternoon.',
              'تدريب نموذج من الصفر يحتاج إلى شهور وملايين. أما البدء من أوزان مفتوحة فيسمح لفريق صغير ببناء نموذج متخصص في ظهيرة واحدة.'),
            tryIt: tx('Switch between the three situations. In which one did the model gain knowledge, and in which one did it only gain a habit?',
              'بدّل بين المواقف الثلاثة. في أيها اكتسب النموذج معرفة، وفي أيها اكتسب عادة فقط؟'),
          }}><WhyStage/></Stage>

        <Stage index={1} summary={tx('question → answer', 'سؤال ← جواب')} flow={tx('examples go to the model', 'الأمثلة تذهب إلى النموذج')}
          notes={{
            what: tx('The model learns from pairs: a question, and the answer you want. Each pair is wrapped in the chat markers the model was built with, then training teaches it to produce the answer part.',
              'النموذج يتعلم من أزواج: سؤال، والجواب الذي تريده. يُغلَّف كل زوج بعلامات المحادثة التي بُني بها النموذج، ثم يعلّمه التدريب إنتاج جزء الجواب.'),
            why: tx('The examples are the lesson. A few hundred clear, correct pairs teach more than thousands of careless ones, and the model will copy their mistakes too.',
              'الأمثلة هي الدرس. بضع مئات من الأزواج الواضحة الصحيحة تعلّم أكثر من آلاف الأزواج المهملة، والنموذج سينسخ أخطاءها أيضًا.'),
            tryIt: tx('Click each example and find the part the model is trained to produce.',
              'انقر على كل مثال وابحث عن الجزء الذي يُدرَّب النموذج على إنتاجه.'),
          }}><DataStage/></Stage>

        <Stage index={2} summary={tx('lock, then add', 'اقفل ثم أضف')} flow={tx('how the new weights are built', 'كيف تُبنى الأوزان الجديدة')}
          notes={{
            what: tx('Full fine-tuning updates every weight. For an 8B model that is 8 billion numbers, each needing extra training memory. The alternative: lock all the original weights and add a small set of new ones that do the learning.',
              'الضبط الدقيق الكامل يحدّث كل الأوزان. وفي نموذج 8B يعني ذلك 8 مليارات رقم، كل واحد يحتاج إلى ذاكرة تدريب إضافية. والبديل: اقفل كل الأوزان الأصلية وأضف مجموعة صغيرة من أوزان جديدة تقوم بالتعلّم.'),
            why: tx('Frozen weights keep everything the model already knows, so it cannot forget its language while learning your subject. And training a fraction of a percent needs a fraction of the memory.',
              'الأوزان المجمَّدة تحفظ كل ما يعرفه النموذج مسبقًا، فلا ينسى لغته وهو يتعلم مادتك. وتدريب جزء من واحد بالمئة يحتاج إلى جزء صغير من الذاكرة.'),
            tryIt: tx('Switch between the two methods and compare the four numbers below the picture.',
              'بدّل بين الطريقتين وقارن الأرقام الأربعة تحت الرسم.'),
          }}><FreezeStage/></Stage>

        <Stage index={3} summary="W + B·A" scene={<AdapterScene/>} flow={tx('but the base is still too big', 'لكن الأساس ما زال كبيرًا جدًا')}
          notes={{
            what: tx('LoRA adds two thin matrices, A and B, beside the frozen matrix W. The layer’s output becomes W·x + B·(A·x). B starts at zero, so at first nothing changes. Training then moves only A and B until B·A equals the change the task needs.',
              'تقنية LoRA تضيف مصفوفتين رفيعتين، A و B، بجانب المصفوفة المجمَّدة W. فيصبح مخرج الطبقة W·x + B·(A·x). تبدأ B من الصفر فلا يتغير شيء في البداية. ثم يحرّك التدريب A و B فقط حتى يساوي B·A التغيير الذي تحتاجه المهمة.'),
            why: tx('A new skill usually needs only a few directions of change, not every number. The rank r is how many directions the adapter is allowed: too few and it cannot fit; enough and it matches with far fewer numbers.',
              'المهارة الجديدة تحتاج عادةً إلى بضعة اتجاهات من التغيير، لا إلى كل الأرقام. والرتبة r هي عدد الاتجاهات المسموح بها للمهايئ: إن قلّت لم يستطع المطابقة، وإن كفت طابق بأرقام أقل بكثير.'),
            tryIt: tx('Train with rank 1: the loss gets stuck. Now choose rank 2 and train again. Watch “frozen numbers changed” stay at 0 the whole time.',
              'درّب بالرتبة 1: الخسارة تعلق. ثم اختر الرتبة 2 ودرّب من جديد. وراقب «أرقام مجمَّدة تغيّرت» وهي تبقى 0 طوال الوقت.'),
          }}><LoraStage/></Stage>

        <Stage index={4} summary={tx('32 bits → 4 bits', '32 بت ← 4 بت')} scene={<QuantScene/>} flow={tx('small base + small adapter', 'أساس صغير + مهايئ صغير')}
          notes={{
            what: tx('A weight is normally stored in 32 or 16 bits. Quantization keeps a short list of allowed values (levels), rounds each weight to the nearest one, and stores only that level’s number. With 4 bits there are 16 levels.',
              'الوزن يُخزَّن عادةً في 32 أو 16 بت. والتكميم يحتفظ بقائمة قصيرة من القيم المسموحة (المستويات)، ويقرّب كل وزن إلى أقربها، ويخزّن رقم ذلك المستوى فقط. ومع 4 بتات يوجد 16 مستوى.'),
            why: tx('Memory is the wall. An 8B model is about 15 GB at 16-bit and under 4 GB at 4-bit, which is the difference between needing a server and using a free cloud GPU. The price is a small rounding error.',
              'الذاكرة هي العائق. نموذج 8B حجمه نحو 15 غ.ب بدقة 16 بت وأقل من 4 غ.ب بدقة 4 بت، وهذا هو الفرق بين الحاجة إلى خادم واستخدام بطاقة GPU سحابية مجانية. والثمن خطأ تقريب صغير.'),
            tryIt: tx('Go down from 8 bits to 2 and watch the error grow. Then pick 4 bits and switch to NF4: the error drops without using more bits.',
              'انزل من 8 بتات إلى 2 وراقب الخطأ يكبر. ثم اختر 4 بتات وبدّل إلى NF4: ينخفض الخطأ دون استخدام بتات أكثر.'),
          }}><QuantStage/></Stage>

        <Stage index={5} summary={tx('4-bit base + adapters', 'أساس 4 بت + مهايئات')} flow={tx('now in real code', 'والآن في شيفرة حقيقية')}
          notes={{
            what: tx('QLoRA is the two ideas together: load the base model quantized to 4-bit and frozen, then train LoRA adapters beside it at normal precision. The 4-bit weights are only read; the learning is stored in the adapters.',
              'تقنية QLoRA هي الفكرتان معًا: حمّل النموذج الأساسي مكمَّمًا إلى 4 بت ومجمَّدًا، ثم درّب مهايئات LoRA بجانبه بالدقة العادية. أوزان الـ 4 بت تُقرأ فقط، والتعلّم يُخزَّن في المهايئات.'),
            why: tx('Quantization shrinks what you load; LoRA shrinks what you train. Together they bring fine-tuning of a multi-billion-weight model down to a single consumer GPU, with results close to full fine-tuning.',
              'التكميم يصغّر ما تحمّله، و LoRA تصغّر ما تدرّبه. ومعًا ينزلان بالضبط الدقيق لنموذج بمليارات الأوزان إلى بطاقة GPU استهلاكية واحدة، بنتائج قريبة من الضبط الدقيق الكامل.'),
            tryIt: tx('Choose the 27B model. Does it fit in 24 GB at 4-bit? Now switch the base to 16-bit and see which GPUs are left.',
              'اختر نموذج 27B. هل يتسع في 24 غ.ب بدقة 4 بت؟ ثم بدّل الأساس إلى 16 بت وانظر أي بطاقات GPU تبقى.'),
          }}><QloraStage/></Stage>

        <Stage index={6} summary={tx('7 steps', '7 خطوات')} scene={<UnslothScene/>}
          notes={{
            what: tx('Unsloth is an open-source Python library, not a model. It gives you ready 4-bit versions of popular open-weight models and wraps the whole QLoRA recipe: load, add adapters, train, test, export.',
              'Unsloth مكتبة Python مفتوحة المصدر وليس نموذجًا. يعطيك نسخًا جاهزة بدقة 4 بت من النماذج مفتوحة الأوزان الشائعة، ويغلّف وصفة QLoRA كلها: تحميل، إضافة مهايئات، تدريب، اختبار، تصدير.'),
            why: tx('The same steps are possible with lower-level libraries, but take far more code and care. Unsloth also trains faster and with less memory, so the lesson fits on a free cloud notebook.',
              'الخطوات نفسها ممكنة بمكتبات أدنى مستوى، لكنها تحتاج إلى شيفرة وعناية أكثر بكثير. و Unsloth يدرّب أيضًا بسرعة أكبر وذاكرة أقل، فيتسع الدرس في دفتر سحابي مجاني.'),
            tryIt: tx('Find the one line that does the quantization, and the one argument that sets the rank you tried in part 4.',
              'ابحث عن السطر الوحيد الذي ينفّذ التكميم، وعن المعامل الوحيد الذي يحدد الرتبة التي جرّبتها في الجزء 4.'),
          }}><UnslothStage/></Stage>

        <Quiz/>
      </div>
    </div>
  </div>;
}
