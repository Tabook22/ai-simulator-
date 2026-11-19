import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import './llm.css';
import './finetune.css';
import { Icon } from './ui';
import type { IconName } from './ui';
import { useI18n } from './i18n';
import { AdapterScene, QuantScene, UnslothScene } from './FineTuneScenes';
import { DocsScene, KitchenScene, TermsScene, TrainingStepScene } from './LessonScenes';
import { FactsNotFiles, NeuronParameters, ParameterLadder } from './ParameterLesson';
import { AnalogyTrio, BuildOrderPanel, DataSorter, DecisionHelper, PhotoQuantize, SplitPicture, StickyNotes, StorytellerScene, StrengthChart } from './HybridLesson';
import { JsonlBuilder, RagAppScene, SameStoryTwoUses, TrainJsonlFlow, VectorSearchMap } from './RagLesson';
import {
  ApproachPicker, BatchCalculator, CompareCards, EXTRA_QUIZ, EvaluationPanel, FormatExplorer, InitDemo,
  JsonlChecker, LearningRateDemo, LoraCalculator, MemoryTable, MythGame, OrderGame, OverfitChart, PrecisionFlow,
  QloraOrder, SettingsTable, TokenView, WorkflowList,
} from './FineTuneLessons';
import { TurathCase } from './TurathCase';
import { RelayScene } from './RelayScene';
import {
  ArchitectureLayers, ArchiveSearch, BackboneCalculator, ConfusionMatrix, GroupSplit, PhotoPrep, PhotoToAnswerScene, ProcedureTracks, ProjectBrief,
  ProjectGuide, RecordToJsonl, ReferenceSplit, SystemDesign, ThreeConfigs, ThresholdTool, TransferScene, TwoFineTunings,
} from './PlantCase';
import { QUIZ, SCENARIOS, UNSLOTH_STEPS } from './finetuneContent';
import {
  ChapterRail, LabHeaderActions, PartFooter, PartNavContext, PartTabs, PipelineMap, QUIZ as QUIZ_VIEW, REFERENCE, ReferenceSheet,
  RememberCard, SearchPalette, ToolIndex, flashWhenReady, useLabProgress, usePartNav, useSearchShortcut,
} from './LabShell';
import type { Hit } from './LabShell';
import type { PartTab } from './labNav';
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
  { key: 'words', icon: 'library', tone: '#93c5fd',
    label: { en: 'Key words', ar: 'الكلمات الأساسية' },
    question: { en: 'Which words link the whole process?', ar: 'ما الكلمات التي تربط العملية كلها؟' } },
  { key: 'data', icon: 'file', tone: '#a78bfa',
    label: { en: 'From documents to JSONL', ar: 'من المستندات إلى JSONL' },
    question: { en: 'How do documents become training data?', ar: 'كيف تصبح المستندات بيانات تدريب؟' } },
  { key: 'freeze', icon: 'lock', tone: '#7aa2ff',
    label: { en: 'Four ways to fine-tune', ar: 'أربع طرق للضبط الدقيق' },
    question: { en: 'Which weights should learn?', ar: 'أي الأوزان يجب أن تتعلم؟' } },
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
  { key: 'step', icon: 'refresh', tone: '#f472b6',
    label: { en: 'One training step', ar: 'خطوة تدريب واحدة' },
    question: { en: 'What exactly happens in one step?', ar: 'ماذا يحدث بالضبط في خطوة واحدة؟' } },
  { key: 'workflow', icon: 'check', tone: '#facc15',
    label: { en: 'Workflow and evaluation', ar: 'سير العمل والتقييم' },
    question: { en: 'How do we know it worked?', ar: 'كيف نعرف أنه نجح؟' } },
  { key: 'hybrid', icon: 'search', tone: '#c084fc',
    label: { en: 'Fine-tuning, RAG, or both?', ar: 'ضبط دقيق أم RAG أم الاثنان؟' },
    question: { en: 'What goes in the library, and what in the lessons?', ar: 'ماذا يذهب إلى المكتبة، وماذا إلى الدروس؟' } },
  { key: 'turath', icon: 'book', tone: '#2dd4bf',
    label: { en: 'Real project: TurathAI', ar: 'مشروع حقيقي: تراث AI' },
    question: { en: 'How is a whole project planned?', ar: 'كيف يُخطَّط لمشروع كامل؟' } },
  { key: 'vision', icon: 'grid', tone: '#5ef2a0',
    label: { en: 'Fine-tuning for images', ar: 'الضبط الدقيق للصور' },
    question: { en: 'How is a vision model fine-tuned?', ar: 'كيف يُضبط نموذج رؤية ضبطًا دقيقًا؟' } },
  { key: 'utas', icon: 'sparkle', tone: '#86efac',
    label: { en: 'Real project: UTAS-70', ar: 'مشروع حقيقي: UTAS-70' },
    question: { en: 'YOLO + RAG + fine-tuning: how do eyes, memory and brain join?', ar: 'YOLO + RAG + ضبط دقيق: كيف تترابط العينان والذاكرة والدماغ؟' } },
];

const tone = (color: string) => ({ '--tone': color }) as CSSProperties;
const gb = (value: number) => value >= 10 ? value.toFixed(0) : value.toFixed(1);
const millions = (value: number) => value >= 1e9 ? `${(value / 1e9).toFixed(1)}B` : `${(value / 1e6).toFixed(1)}M`;

function Stage({ index, summary, notes, flow, scene, sceneNames, children }: {
  index: number; summary: ReactNode; flow?: string; children: ReactNode;
  /** One or more animated scenes, shown in the Watch tab. */
  scene?: ReactNode | ReactNode[];
  sceneNames?: string[];
  notes: { what: string; why: string; tryIt: string };
}) {
  const tx = useTx();
  const stage = STAGES[index];
  const { tab: chosen } = usePartNav();
  const scenes = scene === undefined ? [] : Array.isArray(scene) ? scene : [scene];
  const tab: PartTab = chosen === 'watch' && !scenes.length ? 'try' : chosen ?? (scenes.length ? 'watch' : 'try');
  const [which, setWhich] = useState(0);
  return <section className="llm-stage ft-part" id={`ft-${stage.key}`} data-stage={index} style={tone(stage.tone)}
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
    <PartTabs hasScene={scenes.length > 0} tab={tab}/>
    {tab === 'watch' && <div className="ft-scene-row" role="tabpanel">
      <p className="ft-part-idea">{notes.what}</p>
      {scenes.length > 1 && <div className="ft-tabs ft-scene-pick" role="group" aria-label={tx('Choose an animation', 'اختر مشهدًا')}>
        {scenes.map((_, number) => <button key={number} type="button" className={number === which ? 'current' : ''} aria-pressed={number === which}
          onClick={() => setWhich(number)}><Icon name="play" size={12}/>{sceneNames?.[number] ?? `${number + 1}`}</button>)}
      </div>}
      {scenes[Math.min(which, scenes.length - 1)]}
    </div>}
    {tab === 'try' && <div className="llm-stage-body ft-try" role="tabpanel">
      <p className="llm-try"><Icon name="bulb" size={15}/><span><strong>{tx('Try it.', 'جرّب.')}</strong> {notes.tryIt}</span></p>
      <ToolIndex owner={`ft-${stage.key}`}/>
      <div className="llm-stage-visual">{children}</div>
    </div>}
    {tab === 'remember' && <div className="ft-remember" role="tabpanel"><RememberCard index={index} idea={notes.what} why={notes.why}/></div>}
    <PartFooter index={index} flow={flow}/>
  </section>;
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
  </>;
}

// ----------------------------------------------------------------- 2 data

function DataStage() {
  return <>
    <FormatExplorer/>
    <JsonlChecker/>
    <TokenView/>
  </>;
}

// --------------------------------------------------------------- 3 freeze

function FreezeStage() {
  return <>
    <ApproachPicker/>
    <CompareCards/>
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
    <StickyNotes/>
    <LoraCalculator/>
    <InitDemo/>
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
    <PhotoQuantize/>
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
    <QloraOrder/>
    <PrecisionFlow/>
    <MemoryTable/>
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

const ALL_QUIZ = [...QUIZ, ...EXTRA_QUIZ];

function Quiz() {
  const tx = useTx();
  const [answers, setAnswers] = useState<(number | null)[]>(() => ALL_QUIZ.map(() => null));
  const score = answers.filter((answer, index) => answer === ALL_QUIZ[index].right).length;
  const done = answers.every(answer => answer !== null);
  return <section className="ft-quiz" aria-labelledby="ft-quiz-title">
    <header>
      <h3 id="ft-quiz-title">{tx('Check yourself', 'اختبر نفسك')}</h3>
      <span className="llm-stage-out" data-testid="quiz-score">{score} / {ALL_QUIZ.length}</span>
    </header>
    {ALL_QUIZ.map((item, index) => {
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
    {done && <button type="button" className="button" onClick={() => setAnswers(ALL_QUIZ.map(() => null))}>
      <Icon name="reset" size={14}/>{tx('Try again', 'حاول مرة أخرى')}</button>}
  </section>;
}

// -------------------------------------------------------------------- lab

export function FineTuneLab() {
  const tx = useTx();
  const progress = useLabProgress();
  const [tab, setTab] = useState<PartTab | null>(null);
  const [searching, setSearching] = useState(false);
  const active = progress.active;

  const goTo = useCallback((index: number, nextTab: PartTab | null = null) => {
    progress.go(index);
    setTab(nextTab);
    window.requestAnimationFrame(() => {
      const stages = document.querySelector('.ft-stages');
      if (stages && stages.getBoundingClientRect().top < 0) stages.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior });
    });
  }, [progress]);
  const openSearch = useCallback(() => setSearching(true), []);
  useSearchShortcut(openSearch);
  const pick = (hit: Hit) => {
    goTo(hit.part, hit.tab);
    if (hit.selector) flashWhenReady(hit.selector);
  };

  const content: ReactNode[] = [
        <Stage index={0} summary={tx('base → specialist', 'أساسي ← متخصص')} flow={tx('so we need examples', 'إذن نحتاج إلى أمثلة')}
          notes={{
            what: tx('A base (foundation) model knows language and general knowledge, but nothing about your college, your format, or your course. Fine-tuning is extra training on your own examples, starting from the weights it already has.',
              'النموذج الأساسي يعرف اللغة والمعرفة العامة، لكنه لا يعرف شيئًا عن كليتك أو صيغتك أو مقررك. والضبط الدقيق تدريب إضافي على أمثلتك أنت، يبدأ من الأوزان التي يملكها النموذج مسبقًا.'),
            why: tx('Training a model from nothing needs months and millions. Starting from open weights, a small team can build a specialist in an afternoon.',
              'تدريب نموذج من الصفر يحتاج إلى شهور وملايين. أما البدء من أوزان مفتوحة فيسمح لفريق صغير ببناء نموذج متخصص في ظهيرة واحدة.'),
            tryIt: tx('Switch between the three situations. In which one did the model gain knowledge, and in which one did it only gain a habit?',
              'بدّل بين المواقف الثلاثة. في أيها اكتسب النموذج معرفة، وفي أيها اكتسب عادة فقط؟'),
          }}><WhyStage/><AnalogyTrio goTo={goTo}/></Stage>,

        <Stage index={1} summary={tx('8 words, 1 loop', '8 كلمات، حلقة واحدة')} scene={<TermsScene/>} flow={tx('the loop needs examples', 'الحلقة تحتاج إلى أمثلة')}
          notes={{
            what: tx('Fine-tuning uses a handful of words again and again: parameter, frozen, trainable, activation, loss, gradient, optimizer, batch and epoch. They are not separate topics: they are the steps of one loop that repeats until the model fits the examples.',
              'يستخدم الضبط الدقيق عددًا قليلًا من الكلمات مرة بعد مرة: المعامل، والمجمَّد، والقابل للتدريب، والتنشيط، والخسارة، والتدرّج، والمحسّن، والدفعة، والحقبة. وليست موضوعات منفصلة: إنها خطوات حلقة واحدة تتكرر حتى يلائم النموذج الأمثلة.'),
            why: tx('The most important sentence of the lesson: frozen means not updated. It does not mean inactive. The original weights calculate every answer; only the small adapter learns.',
              'أهم جملة في الدرس: المجمَّد يعني أنه لا يُحدَّث، ولا يعني أنه لا يعمل. فالأوزان الأصلية تحسب كل إجابة، والمهايئ الصغير وحده يتعلم.'),
            tryIt: tx('Start with the neuron: check that 2 × 0.5 + 3 × 0.4 + 0.2 = 2.4. Then train it “the LoRA way” and watch “original parameters changed” stay at 0. Finally play the loop.',
              'ابدأ بالعصبون: تحقق من أن 2 × 0.5 + 3 × 0.4 + 0.2 = 2.4. ثم درّبه “بطريقة LoRA” وراقب “معاملات أصلية تغيّرت” وهي تبقى 0. وأخيرًا شغّل الحلقة.'),
          }}><NeuronParameters/><ParameterLadder/><FactsNotFiles/></Stage>,

        <Stage index={2} summary={tx('document → JSONL → tokens', 'مستند ← JSONL ← رموز')} scene={<DocsScene/>} flow={tx('examples go to the model', 'الأمثلة تذهب إلى النموذج')}
          notes={{
            what: tx('Every source, a PDF, a recording or a scanned page, ends up as text. The text is cleaned, described, turned into reviewed question–answer pairs, and saved as JSONL: one complete JSON object per line. At training time each line is put into the model’s chat template and cut into tokens.',
              'كل مصدر، ملف PDF أو تسجيل أو صفحة ممسوحة، ينتهي نصًا. ويُنظَّف النص ويُوثَّق ويُحوَّل إلى أزواج سؤال وجواب مراجَعة، ويُحفظ بصيغة JSONL: كائن JSON كامل في كل سطر. وعند التدريب يوضع كل سطر في قالب المحادثة الخاص بالنموذج ويُقطَّع إلى رموز.'),
            why: tx('The examples are the lesson. JSONL is only the box they travel in: it guarantees neither truth nor coverage. A few hundred clean, reviewed, well-split pairs teach more than thousands of careless ones.',
              'الأمثلة هي الدرس. و JSONL مجرد الصندوق الذي تنتقل فيه: لا تضمن صحة ولا شمولًا. وبضع مئات من الأزواج النظيفة المراجَعة المقسَّمة جيدًا تعلّم أكثر من آلاف الأزواج المهملة.'),
            tryIt: tx('Load the file with mistakes in the checker and fix every red line. Then shorten max_seq_length until the answer is cut off.',
              'حمّل الملف ذا الأخطاء في الفاحص وأصلح كل سطر أحمر. ثم قلّل max_seq_length حتى تُقطع الإجابة.'),
          }}><DataStage/></Stage>,

        <Stage index={3} summary={tx('full · partial · LoRA · QLoRA', 'كامل · جزئي · LoRA · QLoRA')} flow={tx('how the new weights are built', 'كيف تُبنى الأوزان الجديدة')}
          notes={{
            what: tx('Full fine-tuning updates every weight. Partial fine-tuning updates chosen layers. LoRA freezes every original weight and adds small new matrices that learn. QLoRA does the same with the frozen base stored in 4-bit.',
              'الضبط الدقيق الكامل يحدّث كل الأوزان. والجزئي يحدّث طبقات مختارة. و LoRA تجمّد كل الأوزان الأصلية وتضيف مصفوفات جديدة صغيرة تتعلم. و QLoRA تفعل الشيء نفسه مع تخزين الأساس المجمَّد بدقة 4 بت.'),
            why: tx('Frozen weights keep everything the model already knows, and training a fraction of a percent needs a fraction of the memory. Neither method guarantees perfect recall of facts: data, settings and evaluation decide that.',
              'الأوزان المجمَّدة تحفظ كل ما يعرفه النموذج، وتدريب جزء من واحد بالمئة يحتاج إلى جزء صغير من الذاكرة. ولا تضمن أي طريقة تذكّر الحقائق تمامًا: فالبيانات والإعدادات والتقييم هي التي تحدد ذلك.'),
            tryIt: tx('Switch between the four approaches and watch which layers light up, how many numbers learn, and what file you would save.',
              'بدّل بين الطرق الأربع وراقب أي الطبقات تضيء، وكم رقمًا يتعلم، وأي ملف ستحفظ.'),
          }}><FreezeStage/></Stage>,

        <Stage index={4} summary="W + B·A" scene={<AdapterScene/>} flow={tx('but the base is still too big', 'لكن الأساس ما زال كبيرًا جدًا')}
          notes={{
            what: tx('LoRA adds two thin matrices, A and B, beside the frozen matrix W. The layer’s output becomes W·x + B·(A·x). B starts at zero, so at first nothing changes. Training then moves only A and B until B·A equals the change the task needs.',
              'تقنية LoRA تضيف مصفوفتين رفيعتين، A و B، بجانب المصفوفة المجمَّدة W. فيصبح مخرج الطبقة W·x + B·(A·x). تبدأ B من الصفر فلا يتغير شيء في البداية. ثم يحرّك التدريب A و B فقط حتى يساوي B·A التغيير الذي تحتاجه المهمة.'),
            why: tx('A new skill usually needs only a few directions of change, not every number. The rank r is how many directions the adapter is allowed: too few and it cannot fit; enough and it matches with far fewer numbers.',
              'المهارة الجديدة تحتاج عادةً إلى بضعة اتجاهات من التغيير، لا إلى كل الأرقام. والرتبة r هي عدد الاتجاهات المسموح بها للمهايئ: إن قلّت لم يستطع المطابقة، وإن كفت طابق بأرقام أقل بكثير.'),
            tryIt: tx('Train with rank 1: the loss gets stuck. Now choose rank 2 and train again. Watch “frozen numbers changed” stay at 0 the whole time.',
              'درّب بالرتبة 1: الخسارة تعلق. ثم اختر الرتبة 2 ودرّب من جديد. وراقب «أرقام مجمَّدة تغيّرت» وهي تبقى 0 طوال الوقت.'),
          }}><LoraStage/></Stage>,

        <Stage index={5} summary={tx('32 bits → 4 bits', '32 بت ← 4 بت')} scene={<QuantScene/>} flow={tx('small base + small adapter', 'أساس صغير + مهايئ صغير')}
          notes={{
            what: tx('A weight is normally stored in 32 or 16 bits. Quantization keeps a short list of allowed values (levels), rounds each weight to the nearest one, and stores only that level’s number. With 4 bits there are 16 levels.',
              'الوزن يُخزَّن عادةً في 32 أو 16 بت. والتكميم يحتفظ بقائمة قصيرة من القيم المسموحة (المستويات)، ويقرّب كل وزن إلى أقربها، ويخزّن رقم ذلك المستوى فقط. ومع 4 بتات يوجد 16 مستوى.'),
            why: tx('Memory is the wall. An 8B model is about 15 GB at 16-bit and under 4 GB at 4-bit, which is the difference between needing a server and using a free cloud GPU. The price is a small rounding error.',
              'الذاكرة هي العائق. نموذج 8B حجمه نحو 15 غ.ب بدقة 16 بت وأقل من 4 غ.ب بدقة 4 بت، وهذا هو الفرق بين الحاجة إلى خادم واستخدام بطاقة GPU سحابية مجانية. والثمن خطأ تقريب صغير.'),
            tryIt: tx('Go down from 8 bits to 2 and watch the error grow. Then pick 4 bits and switch to NF4: the error drops without using more bits.',
              'انزل من 8 بتات إلى 2 وراقب الخطأ يكبر. ثم اختر 4 بتات وبدّل إلى NF4: ينخفض الخطأ دون استخدام بتات أكثر.'),
          }}><QuantStage/></Stage>,

        <Stage index={6} summary={tx('4-bit base + adapters', 'أساس 4 بت + مهايئات')} flow={tx('now in real code', 'والآن في شيفرة حقيقية')}
          notes={{
            what: tx('QLoRA is the two ideas together: load the base model quantized to 4-bit and frozen, then train LoRA adapters beside it at normal precision. The 4-bit weights are only read; the learning is stored in the adapters.',
              'تقنية QLoRA هي الفكرتان معًا: حمّل النموذج الأساسي مكمَّمًا إلى 4 بت ومجمَّدًا، ثم درّب مهايئات LoRA بجانبه بالدقة العادية. أوزان الـ 4 بت تُقرأ فقط، والتعلّم يُخزَّن في المهايئات.'),
            why: tx('Quantization shrinks what you load; LoRA shrinks what you train. Together they bring fine-tuning of a multi-billion-weight model down to a single consumer GPU, with results close to full fine-tuning.',
              'التكميم يصغّر ما تحمّله، و LoRA تصغّر ما تدرّبه. ومعًا ينزلان بالضبط الدقيق لنموذج بمليارات الأوزان إلى بطاقة GPU استهلاكية واحدة، بنتائج قريبة من الضبط الدقيق الكامل.'),
            tryIt: tx('Choose the 27B model. Does it fit in 24 GB at 4-bit? Now switch the base to 16-bit and see which GPUs are left.',
              'اختر نموذج 27B. هل يتسع في 24 غ.ب بدقة 4 بت؟ ثم بدّل الأساس إلى 16 بت وانظر أي بطاقات GPU تبقى.'),
          }}><QloraStage/></Stage>,

        <Stage index={7} summary={tx('7 steps', '7 خطوات')} scene={[<KitchenScene key="kitchen"/>, <UnslothScene key="unsloth"/>]}
          sceneNames={[tx('The AI kitchen', 'مطبخ الذكاء الاصطناعي'), tx('Unsloth, step by step', 'Unsloth خطوة بخطوة')]}
          flow={tx('inside one training step', 'داخل خطوة تدريب واحدة')}
          notes={{
            what: tx('Unsloth is an open-source Python library, not a model. It gives you ready 4-bit versions of popular open-weight models and wraps the whole QLoRA recipe: load, add adapters, train, test, export.',
              'Unsloth مكتبة Python مفتوحة المصدر وليس نموذجًا. يعطيك نسخًا جاهزة بدقة 4 بت من النماذج مفتوحة الأوزان الشائعة، ويغلّف وصفة QLoRA كلها: تحميل، إضافة مهايئات، تدريب، اختبار، تصدير.'),
            why: tx('The same steps are possible with lower-level libraries, but take far more code and care. Unsloth also trains faster and with less memory, so the lesson fits on a free cloud notebook.',
              'الخطوات نفسها ممكنة بمكتبات أدنى مستوى، لكنها تحتاج إلى شيفرة وعناية أكثر بكثير. و Unsloth يدرّب أيضًا بسرعة أكبر وذاكرة أقل، فيتسع الدرس في دفتر سحابي مجاني.'),
            tryIt: tx('Find the one line that does the quantization, and the one argument that sets the rank you tried in part 4.',
              'ابحث عن السطر الوحيد الذي ينفّذ التكميم، وعن المعامل الوحيد الذي يحدد الرتبة التي جرّبتها في الجزء 5.'),
          }}><UnslothStage/></Stage>,

        <Stage index={8} summary={tx('forward → loss → backward → update', 'أمامي ← خسارة ← خلفي ← تحديث')} scene={<TrainingStepScene/>}
          flow={tx('then: is the model any good?', 'ثم: هل النموذج جيد؟')}
          notes={{
            what: tx('One training step: a batch of examples goes forward through the frozen base and the adapters, the loss compares the predicted next tokens with the target answer, gradients flow back to the adapters, and the optimizer nudges them. Then the next batch.',
              'خطوة التدريب الواحدة: تمر دفعة من الأمثلة إلى الأمام عبر الأساس المجمَّد والمهايئات، وتقارن الخسارة الرموز التالية المتوقعة بالإجابة المستهدفة، وتعود التدرجات إلى المهايئات، فيحرّكها المحسّن قليلًا. ثم الدفعة التالية.'),
            why: tx('The settings (learning rate, batch size, gradient accumulation, epochs, sequence length) control these steps. Understanding one step makes every setting make sense.',
              'الإعدادات (معدل التعلم وحجم الدفعة وتجميع التدرجات والحقب وطول التسلسل) تتحكم في هذه الخطوات. وفهم خطوة واحدة يجعل كل إعداد مفهومًا.'),
            tryIt: tx('Try the three learning rates. Then set batch 2, accumulation 8 and one GPU: you get the effective batch of 16 from the notes. Finally drag the epochs until validation loss starts rising.',
              'جرّب معدلات التعلم الثلاثة. ثم اجعل الدفعة 2 والتجميع 8 وبطاقة GPU واحدة: تحصل على الدفعة الفعلية 16 من الملاحظات. وأخيرًا اسحب الحقب حتى تبدأ خسارة التحقق في الارتفاع.'),
          }}><LearningRateDemo/><BatchCalculator/><OverfitChart/><SettingsTable/></Stage>,

        <Stage index={9} summary={tx('8 stages', '8 مراحل')} flow={tx('fine-tuning, RAG, or both?', 'ضبط دقيق أم RAG أم الاثنان؟')}
          notes={{
            what: tx('A real project is more than a training run: define the tasks and a baseline, choose a supported model, prepare and check the data, configure QLoRA, run a short check, train while watching validation, evaluate and package, then deploy and reassess.',
              'المشروع الحقيقي أكثر من تجربة تدريب: حدّد المهام وخط الأساس، واختر نموذجًا مدعومًا، وجهّز البيانات وافحصها، واضبط QLoRA، وشغّل تجربة قصيرة، ودرّب مع مراقبة التحقق، وقيّم وجمّع، ثم انشر وأعد التقييم.'),
            why: tx('A falling loss proves that training ran, not that the model is better. Only unseen questions, compared with the base model and reviewed by an expert, show real improvement.',
              'انخفاض الخسارة يثبت أن التدريب جرى، لا أن النموذج صار أفضل. ووحدها الأسئلة التي لم يرها النموذج، مقارنةً بالنموذج الأساسي ومراجَعةً من خبير، تُظهر التحسن الحقيقي.'),
            tryIt: tx('Put the six cards in order, then answer the true-or-false statements. Which of them did you believe before this lesson?',
              'رتّب البطاقات الست، ثم أجب عن عبارات الصح والخطأ. أيها كنت تصدّقه قبل هذا الدرس؟'),
          }}><WorkflowList/><OrderGame/><EvaluationPanel/><MythGame/></Stage>,

        <Stage index={10} summary={tx('library + storyteller', 'مكتبة + راوٍ')} scene={[<StorytellerScene key="story"/>, <RagAppScene key="app"/>]}
          sceneNames={[tx('The storyteller and the library', 'الراوي والمكتبة'), tx('The whole RAG application', 'تطبيق RAG كاملًا')]}
          flow={tx('now a real student project', 'والآن مشروع طلابي حقيقي')}
          notes={{
            what: tx('Fine-tuning and RAG do different jobs. RAG is the library: all the real stories, searched at answer time, with their sources. Fine-tuning is the lessons: a smaller set of examples that teach the model how to tell those stories, use the retrieved context, cite it, and admit when a story is missing.',
              'الضبط الدقيق و RAG يؤديان مهمتين مختلفتين. RAG هو المكتبة: كل القصص الحقيقية، يُبحث فيها وقت الإجابة، مع مصادرها. والضبط الدقيق هو الدروس: مجموعة أصغر من الأمثلة تعلّم النموذج كيف يروي تلك القصص، ويستخدم السياق المسترجَع، ويستشهد به، ويعترف حين تغيب قصة.'),
            why: tx('Fine-tuning alone sounds good but can invent details and gives no source. RAG alone is accurate but sounds generic. Together they are faithful and natural, which is what a heritage project needs.',
              'الضبط الدقيق وحده يبدو جيدًا لكنه قد يختلق تفاصيل ولا يعطي مصدرًا. و RAG وحده دقيق لكنه يبدو عامًّا. ومعًا يكونان أمينين وطبيعيين، وهذا ما يحتاجه مشروع تراثي.'),
            tryIt: tx('Play the first scene and compare steps 7, 8 and 9; then play the second to follow a question through the whole application. Write your own example in the JSONL builder, and ask the flying-camel question on the meaning map.',
              'شغّل المشهد الأول وقارن الخطوات 7 و 8 و 9، ثم شغّل الثاني لتتبع سؤالًا عبر التطبيق كله. واكتب مثالك الخاص في منشئ JSONL، واسأل عن الجمل الطائر في خريطة المعاني.'),
          }}><DecisionHelper/><StrengthChart/><DataSorter/><SplitPicture/><SameStoryTwoUses/><JsonlBuilder/><TrainJsonlFlow/><VectorSearchMap/><BuildOrderPanel/></Stage>,
  ];

  /** Parts 13 and 14, after the TurathAI case: built from the UTAS-70 student project. */
  const projects: Record<number, ReactNode> = {
    12: <Stage index={12} summary={tx('frozen body + new head', 'جسم مجمَّد + رأس جديد')} scene={<TransferScene/>}
      flow={tx('now join it to a language model: UTAS-70', 'والآن اربطه بنموذج لغوي: UTAS-70')}
      notes={{
        what: tx('Fine-tuning is not only for language models. A CNN trained on ImageNet already knows edges, textures and shapes. Freeze that body, replace its 1,000-class head with one output per species, train the head, then gently unfreeze the top blocks. This is called transfer learning.',
          'الضبط الدقيق ليس للنماذج اللغوية وحدها. فشبكة CNN المدرَّبة على ImageNet تعرف مسبقًا الحواف والملمس والأشكال. جمّد ذلك الجسم، واستبدل رأسه ذا الألف فئة بمخرج لكل نوع، ودرّب الرأس، ثم فكّ تجميد الكتل العليا بلطف. ويسمى هذا التعلم بالنقل.'),
        why: tx('A few hundred photos per species are far too few to train millions of numbers from zero, but enough to train a small head on top of features that already work. It is the same reason LoRA works: keep the general knowledge, train a small new part.',
          'بضع مئات من الصور لكل نوع أقل بكثير من أن تدرّب ملايين الأرقام من الصفر، لكنها تكفي لتدريب رأس صغير فوق سمات تعمل مسبقًا. وهو السبب نفسه لنجاح LoRA: احتفظ بالمعرفة العامة، ودرّب جزءًا جديدًا صغيرًا.'),
        tryIt: tx('Play the scene and watch where the gradient stops in stages 1 and 2. Then find the share of numbers trained with MobileNetV2 and 6 species, switch the split to “by tree”, and raise the threshold until the unknown plant is refused.',
          'شغّل المشهد وراقب أين يتوقف التدرّج في المرحلتين 1 و 2. ثم اعرف نسبة الأرقام المدرَّبة مع MobileNetV2 و 6 أنواع، وبدّل التقسيم إلى “حسب الشجرة”، وارفع العتبة حتى يُرفض النبات المجهول.'),
      }}><TwoFineTunings/><BackboneCalculator/><PhotoPrep/><GroupSplit/><ConfusionMatrix/><ThresholdTool/></Stage>,
    13: <Stage index={13} summary={tx('YOLO + RAG archive + QLoRA', 'YOLO + أرشيف RAG + QLoRA')} scene={[<RelayScene key="relay"/>, <PhotoToAnswerScene key="system"/>]}
      sceneNames={[tx('The relay: YOLO → RAG → fine-tuned model', 'التتابع: YOLO ← RAG ← النموذج المضبوط'), tx('The whole system', 'النظام كاملًا')]}
      flow={tx('review everything on one sheet', 'راجع كل شيء في صفحة واحدة')}
      notes={{
        what: tx('UTAS-70 is a final-year student project: a bilingual assistant for the native plants of Dhofar, built from three parts. The eyes: a fine-tuned YOLO model names the plant in a photo. The memory: a RAG digital archive holds all the references, and the name finds the right passages. The brain: Qwen3.8-27B, fine-tuned with QLoRA on examples from about 20% of the references, writes the answer in a botanist’s style.',
          'UTAS-70 مشروع تخرج طلابي: مساعد ثنائي اللغة لنباتات ظفار المحلية، مبني من ثلاثة أجزاء. العينان: نموذج YOLO مضبوط يسمّي النبات في الصورة. والذاكرة: أرشيف رقمي RAG يحفظ كل المراجع، ويجد الاسمُ المقاطعَ الصحيحة. والدماغ: Qwen3.8-27B المضبوط بـ QLoRA على أمثلة من نحو 20٪ من المراجع، يكتب الإجابة بأسلوب عالم نبات.'),
        why: tx('It joins almost everything in this lab: data from books (part 3), QLoRA and Unsloth (parts 7–8), evaluation (part 10), retrieval (part 11) and vision fine-tuning (part 13). Use it as a template for planning your own project.',
          'إنه يجمع تقريبًا كل ما في هذا المختبر: بيانات من الكتب (الجزء 3)، و QLoRA و Unsloth (الجزآن 7–8)، والتقييم (الجزء 10)، والاسترجاع (الجزء 11)، وضبط نماذج الرؤية (الجزء 13). فاستخدمه قالبًا لتخطيط مشروعك أنت.'),
        tryIt: tx('Follow the photo through the scene. Then switch off each of the three parts to see what breaks, untick “keep every reference in the archive”, and search the archive for the flowering season without the name filter.',
          'تتبّع الصورة عبر المشهد. ثم أطفئ كل جزء من الأجزاء الثلاثة لترى ما الذي يتعطل، وألغِ “احفظ كل المراجع في الأرشيف”، وابحث في الأرشيف عن موسم الإزهار دون تصفية الاسم.'),
      }}><ProjectBrief/><SystemDesign/><ReferenceSplit/><ArchiveSearch/><ProcedureTracks/><ArchitectureLayers/><RecordToJsonl/><ThreeConfigs/><ProjectGuide/></Stage>,
  };

  const nav = { tab, setTab, go: (index: number) => goTo(index), parts: STAGES };
  return <PartNavContext.Provider value={nav}>
    <div className="llm-lab ft-lab">
      <header className="ft-lab-head">
        <div className="ft-lab-title">
          <div className="eyebrow">{tx('Fine-tuning lab', 'مختبر الضبط الدقيق')}</div>
          <h2>{tx('Teach a ready-made model your own subject', 'علّم نموذجًا جاهزًا مادتك أنت')}</h2>
          <p>{tx('Fourteen short parts in six chapters, in the order a real project follows: from the base model and its data, through LoRA, quantization, QLoRA and Unsloth, to training, evaluation and RAG, and then two real student projects, one of them with computer vision. Each part has an animation to watch, tools to try and a card to remember.',
            'أربعة عشر جزءًا قصيرًا في ستة فصول، بالترتيب الذي يتبعه مشروع حقيقي: من النموذج الأساسي وبياناته، مرورًا بـ LoRA والتكميم و QLoRA و Unsloth، إلى التدريب والتقييم و RAG، ثم مشروعان طلابيان حقيقيان، أحدهما بالرؤية الحاسوبية. ولكل جزء مشهد للمشاهدة وأدوات للتجربة وبطاقة للتذكّر.')}</p>
        </div>
        <LabHeaderActions onSearch={openSearch} onReference={() => goTo(REFERENCE)}/>
        <PipelineMap active={active} visited={progress.visited} onPick={index => goTo(index)}/>
      </header>

      <div className="llm-layout">
        <ChapterRail parts={STAGES} active={active} visited={progress.visited} onPick={index => goTo(index)}/>
        <div className="llm-stages ft-stages" key={`${active}`}>
          {active < content.length && content[active]}
          {active === 11 && <><TurathCase index={11} total={STAGES.length}/><PartFooter index={11} flow={tx('a second project: fine-tuning for images', 'مشروع ثانٍ: الضبط الدقيق للصور')}/></>}
          {projects[active]}
          {active === REFERENCE && <ReferenceSheet/>}
          {active === QUIZ_VIEW && <Quiz/>}
        </div>
      </div>
      <SearchPalette open={searching} onClose={() => setSearching(false)} onPick={pick}/>
    </div>
  </PartNavContext.Provider>;
}
