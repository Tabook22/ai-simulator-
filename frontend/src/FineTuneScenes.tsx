/**
 * Three animated "watch it happen" scenes for the fine-tuning lab:
 * how LoRA adapters are added, how a block of weights is quantized, and how Unsloth runs a job.
 * Each scene is a picture whose parts move from one step to the next, with a caption per step.
 */
import { createContext, useContext, useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import './finetune-scenes.css';
import { Icon } from './ui';
import { useI18n } from './i18n';
import { NF4_LEVELS } from './finetuneModel';

export interface Text { en: string; ar: string }
export const t = (en: string, ar: string): Text => ({ en, ar });

export function useTx() {
  const { isArabic } = useI18n();
  return (text: Text) => isArabic ? text.ar : text.en;
}

// --------------------------------------------------------------- the player

const STEP_MS = 5200;

export function usePlayer(count: number) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    if (step >= count - 1) { setPlaying(false); return; }
    const timer = window.setTimeout(() => setStep(current => Math.min(count - 1, current + 1)), STEP_MS);
    return () => window.clearTimeout(timer);
  }, [playing, step, count]);
  return {
    step, playing,
    go: (next: number) => { setPlaying(false); setStep(Math.max(0, Math.min(count - 1, next))); },
    toggle: () => {
      if (playing) { setPlaying(false); return; }
      if (step >= count - 1) setStep(0);
      setPlaying(true);
    },
  };
}

// ------------------------------------------------- explaining each figure

/** One part of a scene's picture that the student can click for a full explanation. */
export interface Figure {
  id: string;
  title: Text;
  /** What the shape on screen is. */
  what: Text;
  /** Why it matters for fine-tuning. */
  why: Text;
  /** What it shows at the current step, when that changes from step to step. */
  now?: (step: number) => Text | null;
  /** Click areas in the SVG's own coordinates: [x, y, width, height]. */
  areas: [number, number, number, number][];
  /** First and last step in which the part is on screen; always on screen when omitted. */
  steps?: [number, number];
}

const onScreen = (figure: Figure, step: number) => !figure.steps || (step >= figure.steps[0] && step <= figure.steps[1]);

interface FigureState { figures: Figure[]; step: number; selected: string | null; pick: (id: string | null) => void }
const FigureContext = createContext<FigureState | null>(null);

/** Invisible click areas drawn on top of a scene's picture. Put it last inside the scene's <svg>. */
export function Hotspots() {
  const say = useTx();
  const state = useContext(FigureContext);
  if (!state) return null;
  const { figures, step, selected, pick } = state;
  return <g className="ft-hotspots">
    {figures.filter(figure => onScreen(figure, step)).map(figure => {
      const label = say(t('Explain: ', 'اشرح: ')) + say(figure.title);
      const choose = () => pick(selected === figure.id ? null : figure.id);
      return <g key={figure.id} className={`ft-hot ${selected === figure.id ? 'picked' : ''}`} role="button" tabIndex={0}
        aria-label={label} aria-pressed={selected === figure.id} data-figure={figure.id} onClick={choose}
        onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(); } }}>
        <title>{label}</title>
        {figure.areas.map(([x, y, width, height], index) =>
          <rect key={index} x={x} y={y} width={width} height={height} rx="7"/>)}
      </g>;
    })}
  </g>;
}

function Explainer({ figures, step, selected, pick, go, stepTitle }: FigureState & {
  go: (step: number) => void; stepTitle: (step: number) => string;
}) {
  const say = useTx();
  const figure = figures.find(item => item.id === selected);
  const now = figure?.now?.(step);
  const visible = figure ? onScreen(figure, step) : true;
  return <div className="ft-explain">
    <div className="ft-explain-bar">
      <span className="ft-explain-hint"><Icon name="help" size={14}/>
        {say(t('Click any part of the picture, or a name here, for a full explanation:', 'انقر أي جزء من الصورة، أو اسمًا هنا، لشرح كامل:'))}</span>
      <div className="ft-explain-chips">
        {figures.map(item => <button key={item.id} type="button" data-figure={item.id}
          className={`ft-explain-chip ${item.id === selected ? 'picked' : ''} ${onScreen(item, step) ? '' : 'later'}`}
          aria-pressed={item.id === selected} onClick={() => pick(item.id === selected ? null : item.id)}>
          {say(item.title)}
        </button>)}
      </div>
    </div>
    {figure && <article className="ft-explain-card" key={figure.id} aria-live="polite">
      <header>
        <h5>{say(figure.title)}</h5>
        <button type="button" className="ft-explain-close" onClick={() => pick(null)}
          aria-label={say(t('Close the explanation', 'أغلق الشرح'))}><Icon name="close" size={14}/></button>
      </header>
      <div className="ft-explain-grid">
        <section><h6>{say(t('What you see', 'ماذا ترى'))}</h6><p>{say(figure.what)}</p></section>
        <section><h6>{say(t('Why it matters', 'لماذا يهم'))}</h6><p>{say(figure.why)}</p></section>
        {visible && now && <section className="now">
          <h6>{say(t('Right now', 'الآن'))} · {say(t('step', 'الخطوة'))} {step + 1}: {stepTitle(step)}</h6>
          <p>{say(now)}</p>
        </section>}
        {!visible && figure.steps && <section className="now">
          <h6>{say(t('Not on screen at this step', 'غير ظاهر في هذه الخطوة'))}</h6>
          <p>{say(t('This part appears in step', 'يظهر هذا الجزء في الخطوة'))} {figure.steps[0] + 1}{figure.steps[1] > figure.steps[0] ? `–${figure.steps[1] + 1}` : ''}.
            {' '}<button type="button" className="button small" onClick={() => go(figure.steps![0])}>
              {say(t('Show me', 'أرني'))}</button></p>
        </section>}
      </div>
    </article>}
  </div>;
}

export function Scene({ id, title, steps, player, figures = [], detail, children }: {
  id: string; title: Text; steps: { title: Text; text: Text }[];
  player: ReturnType<typeof usePlayer>; figures?: Figure[]; children: ReactNode;
  /** Extra teaching content for the current step, shown under the controls. */
  detail?: ReactNode;
}) {
  const say = useTx();
  const { step, playing, go, toggle } = player;
  const last = steps.length - 1;
  const [selected, setSelected] = useState<string | null>(null);
  const state: FigureState = { figures, step, selected, pick: setSelected };
  return <section className="ft-scene" id={id} aria-label={say(title)}>
    <header className="ft-scene-head">
      <span className="ft-scene-badge"><Icon name="play" size={11}/>{say(t('Watch it happen', 'شاهدها تحدث'))}</span>
      <h4>{say(title)}</h4>
    </header>
    <FigureContext.Provider value={state}>
      <div className={`ft-scene-stage ${figures.length ? 'explainable' : ''}`} dir="ltr">{children}</div>
    </FigureContext.Provider>
    {figures.length > 0 && <Explainer {...state} go={go} stepTitle={index => say(steps[index].title)}/>}
    <div className="ft-scene-caption" aria-live="polite">
      <span className="ft-scene-count">{step + 1} / {steps.length}</span>
      <div key={step}>
        <strong>{say(steps[step].title)}</strong>
        <p>{say(steps[step].text)}</p>
      </div>
    </div>
    <div className="ft-scene-controls">
      <button type="button" className="button small" disabled={step === 0} onClick={() => go(step - 1)}
        aria-label={say(t('Previous step', 'الخطوة السابقة'))}><Icon name="previous" size={14}/></button>
      <button type="button" className="button small primary ft-scene-play" onClick={toggle}>
        <Icon name={playing ? 'pause' : 'play'} size={13}/>
        {playing ? say(t('Pause', 'إيقاف مؤقت')) : step >= last ? say(t('Play again', 'شغّل من جديد')) : say(t('Play', 'تشغيل'))}
      </button>
      <button type="button" className="button small" disabled={step === last} onClick={() => go(step + 1)}
        aria-label={say(t('Next step', 'الخطوة التالية'))}><Icon name="next" size={14}/></button>
      <ol className="ft-scene-dots">
        {steps.map((item, index) => <li key={index}>
          <button type="button" className={index === step ? 'current' : index < step ? 'done' : ''}
            aria-label={`${index + 1}: ${say(item.title)}`} aria-current={index === step ? 'step' : undefined}
            onClick={() => go(index)}>
            {index === step && playing && <i key={step} style={{ animationDuration: `${STEP_MS}ms` }}/>}
          </button>
        </li>)}
      </ol>
    </div>
    {detail}
  </section>;
}

export const show = (visible: boolean) => visible ? 'ft-show' : 'ft-show off';
export const packet = (path: string, delay: number, extra: Record<string, string> = {}) =>
  ({ offsetPath: `path("${path}")`, animationDelay: `${delay}s`, ...extra }) as CSSProperties;

export function Lock({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return <g className="ft-lock" transform={`translate(${x} ${y}) scale(${size})`}>
    <path d="M-4 -1 V-4 a4 4 0 0 1 8 0 V-1" fill="none"/>
    <rect x="-6" y="-1" width="12" height="9" rx="2"/>
  </g>;
}

// ------------------------------------------------------- 1 adding adapters

const MODULES = ['q_proj', 'k_proj', 'v_proj', 'o_proj', 'gate_proj', 'up_proj', 'down_proj'];
const MAIN = 'M268 165 C 300 150 300 135 330 135 L 500 135 C 545 135 560 160 584 166 L 672 170';
const SIDE = 'M262 184 C 285 230 300 255 330 255 L 484 255 C 545 228 575 200 590 183 L 672 172';
const STRIPE_A = [0.8, 0.35, 0.6, 0.2, 0.9, 0.45, 0.7, 0.3];
const STRIPE_B = [0.5, 0.85, 0.3, 0.65, 0.4, 0.75];
const W_CELLS = Array.from({ length: 48 }, (_, index) => 0.15 + ((index * 37) % 11) / 14);

const ADAPTER_STEPS = [
  { title: t('A layer of the base model', 'طبقة من النموذج الأساسي'),
    text: t('Each transformer layer holds seven big weight matrices: four for attention (q, k, v, o) and three for the MLP. In an 8B model, q_proj alone holds 16.8 million numbers. We zoom in on it.',
      'كل طبقة في المحوّل تحمل سبع مصفوفات أوزان كبيرة: أربع للانتباه (q و k و v و o) وثلاث لشبكة MLP. وفي نموذج 8B تحمل q_proj وحدها 16.8 مليون رقم. سنقرّب الصورة عليها.') },
  { title: t('Freeze every original weight', 'جمّد كل وزن أصلي'),
    text: t('Every original matrix is locked (requires_grad = False). It will still be read in every calculation, but it will never be changed, so the model keeps everything it already knows.',
      'كل مصفوفة أصلية تُقفل (requires_grad = False). ستظل تُقرأ في كل حساب لكنها لن تتغير أبدًا، فيحتفظ النموذج بكل ما يعرفه مسبقًا.') },
  { title: t('Create two thin matrices beside W', 'أنشئ مصفوفتين رفيعتين بجانب W'),
    text: t('A is 16 × 4096 and B is 4096 × 16, where 16 is the rank r. Together they hold 131 thousand numbers, less than 1% of W. This pair is the adapter.',
      'المصفوفة A أبعادها 16 × 4096 و B أبعادها 4096 × 16، حيث 16 هي الرتبة r. ومعًا تحملان 131 ألف رقم، أي أقل من 1٪ من W. هذا الزوج هو المهايئ.') },
  { title: t('Attach a pair to every target module', 'اربط زوجًا بكل وحدة مستهدفة'),
    text: t('The same is done beside all seven matrices, in every one of the model’s 36 layers. These are the target_modules you list in get_peft_model.',
      'يتكرر الأمر نفسه بجانب المصفوفات السبع كلها، في كل طبقة من طبقات النموذج الـ 36. وهذه هي target_modules التي تكتبها في get_peft_model.') },
  { title: t('B starts at zero', 'تبدأ B من الصفر'),
    text: t('A starts with small random numbers and B with zeros, so B·(A·x) = 0 and the model answers exactly as before. Training starts from the base model, not from noise.',
      'تبدأ A بأرقام عشوائية صغيرة و B بأصفار، فيكون B·(A·x) = 0 ويجيب النموذج تمامًا كما كان. فالتدريب يبدأ من النموذج الأساسي لا من الضجيج.') },
  { title: t('Forward pass: two roads, one sum', 'التمرير الأمامي: طريقان ومجموع واحد'),
    text: t('The input travels through the big frozen W and, at the same time, through the thin A → B road. The two results are added: h = W·x + B·(A·x).',
      'يسافر المدخل عبر W الكبيرة المجمَّدة، وفي الوقت نفسه عبر الطريق الرفيع A ← B. ثم تُجمع النتيجتان: h = W·x + B·(A·x).') },
  { title: t('Backward pass: the error flows back', 'التمرير الخلفي: الخطأ يعود'),
    text: t('The loss sends the error back along both roads. It passes through W, because earlier layers need it, but W itself receives no update.',
      'الخسارة ترسل الخطأ رجوعًا على الطريقين. يمر الخطأ عبر W لأن الطبقات السابقة تحتاجه، لكن W نفسها لا تُحدَّث.') },
  { title: t('Only A and B change', 'A و B وحدهما يتغيران'),
    text: t('The optimizer updates the adapter’s 131 thousand numbers and leaves W’s 16.8 million untouched. This repeats for every batch until the loss is low.',
      'المحسّن يحدّث أرقام المهايئ الـ 131 ألفًا ويترك أرقام W الـ 16.8 مليونًا دون مساس. ويتكرر ذلك لكل دفعة حتى تنخفض الخسارة.') },
  { title: t('Merge, or keep it separate', 'ادمج، أو أبقه منفصلًا'),
    text: t('After training, B·A can be added into W once: W′ = W + B·A. The merged model has the original size and speed with the new skill built in. Or keep the adapter as a small separate file.',
      'بعد التدريب يمكن إضافة B·A إلى W مرة واحدة: W′ = W + B·A. فيكون للنموذج المدموج الحجم والسرعة الأصليان مع المهارة الجديدة مبنية فيه. أو أبقِ المهايئ ملفًا صغيرًا منفصلًا.') },
];

const ADAPTER_EQUATIONS = [
  'h = W·x', 'h = W·x      (W frozen)', 'h = W·x + B·(A·x)', 'h = W·x + B·(A·x)      ×7 modules × 36 layers',
  'B = 0  →  B·(A·x) = 0  →  h = W·x', 'h = W·x + B·(A·x)', 'error → ∂L/∂B, ∂L/∂A      (nothing for W)',
  'A ← A − lr·∂L/∂A      B ← B − lr·∂L/∂B', 'W′ = W + B·A',
];

const ADAPTER_FIGURES: Figure[] = [
  { id: 'layer', title: t('The layer column', 'عمود الطبقة'), areas: [[20, 16, 108, 302]],
    what: t('The tall box on the left is one transformer layer. Its seven rows are the layer’s weight matrices: q, k, v and o for attention, and gate, up and down for the MLP. A model like Qwen3-8B stacks 36 of these layers.',
      'الصندوق الطويل على اليسار طبقة واحدة من المحوّل. وصفوفه السبعة هي مصفوفات أوزان الطبقة: q و k و v و o للانتباه، و gate و up و down لشبكة MLP. ونموذج مثل Qwen3-8B يكدّس 36 طبقة كهذه.'),
    why: t('These matrices hold almost all of the model’s knowledge. LoRA chooses which of them get an adapter: the target_modules list in your code.',
      'هذه المصفوفات تحمل كل معرفة النموذج تقريبًا. و LoRA تختار أيها يحصل على مهايئ: قائمة target_modules في شيفرتك.'),
    now: step => step === 0 ? t('Nothing is frozen yet; this is the model as it was downloaded.', 'لم يُجمَّد شيء بعد؛ هذا النموذج كما نُزِّل.')
      : t('The locks show that every matrix is frozen: read in every calculation, never updated.', 'الأقفال تعني أن كل مصفوفة مجمَّدة: تُقرأ في كل حساب ولا تُحدَّث أبدًا.') },
  { id: 'tags', title: t('The orange A·B tags', 'وسوم A·B البرتقالية'), areas: [[128, 60, 50, 250]], steps: [2, 7],
    what: t('Each small orange tag beside a matrix means an adapter (an A and B pair) has been attached to it.',
      'كل وسم برتقالي صغير بجانب مصفوفة يعني أن مهايئًا (زوجًا من A و B) رُبط بها.'),
    why: t('More target modules means more learnable numbers and usually better results, at the cost of a little more memory. Attaching to all seven is the common choice today.',
      'كلما زادت الوحدات المستهدفة زادت الأرقام القابلة للتعلم وتحسنت النتائج عادةً، مقابل ذاكرة أكثر قليلًا. والربط بالسبع كلها هو الخيار الشائع اليوم.'),
    now: step => step === 2 ? t('So far only q_proj has its pair.', 'حتى الآن q_proj وحدها لديها زوجها.') : t('All seven modules now carry a pair, in each of the 36 layers.', 'كل الوحدات السبع تحمل الآن زوجًا، في كل طبقة من الطبقات الـ 36.') },
  { id: 'x', title: t('x, the input', 'x، المدخل'), areas: [[228, 148, 44, 44]],
    what: t('x is the vector that enters q_proj: 4096 numbers that describe the current token at this layer.',
      'x هو المتجه الداخل إلى q_proj: 4096 رقمًا تصف الرمز الحالي في هذه الطبقة.'),
    why: t('With an adapter, x is sent down two roads at once: through W and through A then B.',
      'مع المهايئ يُرسل x في طريقين معًا: عبر W، وعبر A ثم B.') },
  { id: 'w', title: t('W, the original matrix', 'W، المصفوفة الأصلية'), areas: [[326, 70, 178, 166]],
    what: t('The big grid is W, the q_proj weight matrix: 4096 × 4096 = 16.8 million numbers. Each little square stands for a patch of them.',
      'الشبكة الكبيرة هي W، مصفوفة أوزان q_proj: ‏4096 × 4096 = 16.8 مليون رقم. وكل مربع صغير يمثل رقعة منها.'),
    why: t('W is never changed by LoRA. That is why fine-tuning with LoRA cannot damage what the model already knows, and why you only need memory for the gradients of A and B, not of W.',
      'لا تغيّر LoRA المصفوفة W أبدًا. ولهذا لا يستطيع الضبط الدقيق بـ LoRA إتلاف ما يعرفه النموذج، ولهذا لا تحتاج إلى ذاكرة إلا لتدرجات A و B لا W.'),
    now: step => step === 8 ? t('B·A has been added into W: this is now W′, the same size, with the new skill built in.', 'أضيفت B·A إلى W: هذه الآن W′ بالحجم نفسه والمهارة الجديدة مبنية فيها.')
      : step === 6 ? t('The error passes through W on its way back, but W receives no update.', 'يمر الخطأ عبر W في طريق عودته، لكن W لا تتلقى أي تحديث.') : null },
  { id: 'adapter', title: t('A and B, the adapter', 'A و B، المهايئ'), areas: [[326, 218, 172, 96]], steps: [2, 7],
    what: t('The flat bar is A (16 × 4096) and the tall bar is B (4096 × 16). A squeezes x down to 16 numbers; B spreads them back out to 4096. 16 is the rank r.',
      'الشريط المسطح هو A (‏16 × 4096) والشريط الطويل هو B (‏4096 × 16). تضغط A المدخل x إلى 16 رقمًا، ثم تنشرها B من جديد إلى 4096. والرقم 16 هو الرتبة r.'),
    why: t('Together A and B hold 2 × 16 × 4096 = 131,072 numbers, under 1% of W, yet their product B·A is a full 4096 × 4096 change to W. This is why LoRA is cheap to train and to store.',
      'تحمل A و B معًا 2 × 16 × 4096 = 131,072 رقمًا، أي أقل من 1٪ من W، ومع ذلك فإن حاصل ضربهما B·A تغيير كامل بحجم 4096 × 4096 على W. ولهذا يكون تدريب LoRA وتخزينها رخيصين.'),
    now: step => step === 4 ? t('B is all zeros (the grey cells and the 0), so the adapter adds nothing yet.', 'B كلها أصفار (الخلايا الرمادية والصفر)، فلا يضيف المهايئ شيئًا بعد.')
      : step >= 6 ? t('A and B glow because they are the only weights receiving updates.', 'تتوهج A و B لأنهما الوزنان الوحيدان اللذان يتلقيان تحديثات.') : null },
  { id: 'sum', title: t('The + and h', 'علامة + و h'), areas: [[582, 152, 36, 36], [670, 150, 40, 40]],
    what: t('The + circle adds the two roads together, and h is the layer’s output: h = W·x + B·(A·x).',
      'دائرة + تجمع الطريقين معًا، و h هو مخرج الطبقة: h = W·x + B·(A·x).'),
    why: t('Because the adapter’s result is simply added, it acts as a small correction on top of the original answer instead of replacing it.',
      'لأن نتيجة المهايئ تُضاف ببساطة، فهي تعمل تصحيحًا صغيرًا فوق الإجابة الأصلية بدلًا من أن تحل محلها.') },
  { id: 'equation', title: t('The equation line', 'سطر المعادلة'), areas: [[420, 44, 320, 20]],
    what: t('The formula in the top-right corner is the maths of the current step.',
      'الصيغة في الزاوية العليا اليمنى هي رياضيات الخطوة الحالية.'),
    why: t('It is the same thing the picture shows, written as you would see it in a paper or in the PEFT source code.',
      'إنها الشيء نفسه الذي تعرضه الصورة، مكتوبًا كما تراه في ورقة علمية أو في شيفرة PEFT المصدرية.'),
    now: step => t(`Now it reads: ${ADAPTER_EQUATIONS[step]}`, `الآن تقول: ${ADAPTER_EQUATIONS[step]}`) },
  { id: 'count', title: t('The learning counter', 'عدّاد التعلم'), areas: [[556, 228, 178, 60]], steps: [7, 7],
    what: t('The box counts how many numbers actually learn in q_proj: 131 thousand out of 16.9 million, about 0.8%.',
      'يعدّ الصندوق كم رقمًا يتعلم فعلًا في q_proj: ‏131 ألفًا من 16.9 مليونًا، أي نحو 0.8٪.'),
    why: t('Fewer learning numbers means far less memory for gradients and optimizer state, and a saved adapter of a few tens of megabytes instead of a full copy of the model.',
      'قلة الأرقام المتعلمة تعني ذاكرة أقل بكثير للتدرجات وحالة المحسّن، ومهايئًا محفوظًا ببضع عشرات من الميغابايت بدلًا من نسخة كاملة من النموذج.') },
];

export function AdapterScene() {
  const say = useTx();
  const player = usePlayer(ADAPTER_STEPS.length);
  const { step } = player;
  const frozen = step >= 1;
  const adapters = step >= 2;
  const trained = step >= 7;
  const merged = step >= 8;
  const forward = step === 5;
  const backward = step === 6;
  return <Scene id="ft-scene-adapter" title={t('How LoRA adapters are added', 'كيف تُضاف مهايئات LoRA')}
    steps={ADAPTER_STEPS} player={player} figures={ADAPTER_FIGURES}>
    <svg viewBox="0 0 760 330" className={`ft-svg adapter-scene step-${step}`} role="img"
      aria-label={say(ADAPTER_STEPS[step].title)}>
      <defs>
        <linearGradient id="ft-ice" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9db8ff" stopOpacity=".35"/><stop offset="1" stopColor="#5c86ef" stopOpacity=".12"/>
        </linearGradient>
      </defs>

      {/* one layer, with all seven matrices */}
      <rect className="ft-frame" x="20" y="36" width="160" height="282" rx="14"/>
      <text className="ft-label" x="100" y="26" textAnchor="middle">{say(t('One layer (of 36)', 'طبقة واحدة (من 36)'))}</text>
      <text className="ft-tiny" x="30" y="56">{say(t('attention', 'الانتباه'))}</text>
      <text className="ft-tiny" x="30" y="196">MLP</text>
      {MODULES.map((name, index) => {
        const y = 62 + index * 34 + (index > 3 ? 12 : 0);
        return <g key={name}>
          <rect className={`ft-module ${frozen ? 'frozen' : ''} ${index === 0 ? 'zoomed' : ''}`} x="30" y={y} width="96" height="24" rx="6"/>
          <text className="ft-mono" x="78" y={y + 16} textAnchor="middle">{name}</text>
          <g className={show(frozen)} style={{ transitionDelay: `${index * 0.07}s` }}><Lock x={118} y={y + 10} size={0.8}/></g>
          <g className={show(index === 0 ? adapters && !merged : step >= 3 && !merged)} style={{ transitionDelay: `${index * 0.12}s` }}>
            <rect className="ft-tag" x="132" y={y + 3} width="40" height="18" rx="5"/>
            <text className="ft-tag-text" x="152" y={y + 16} textAnchor="middle">A·B</text>
          </g>
        </g>;
      })}
      <path className="ft-zoomline" d="M126 74 C 160 74 180 52 210 52"/>

      {/* zoom on q_proj */}
      <rect className="ft-frame" x="210" y="36" width="535" height="282" rx="14"/>
      <text className="ft-label" x="226" y="58">{say(t('q_proj, zoomed in', 'q_proj بتكبير'))}</text>

      <path className="ft-wire" d={MAIN}/>
      <path className={`ft-wire hot ${show(adapters && !merged)}`} d={SIDE}/>

      <circle className="ft-io" cx="250" cy="170" r="18"/><text className="ft-io-text" x="250" y="175" textAnchor="middle">x</text>
      <circle className="ft-io" cx="600" cy="170" r="16"/><text className="ft-io-text" x="600" y="175" textAnchor="middle">+</text>
      <circle className="ft-io" cx="690" cy="170" r="18"/><text className="ft-io-text" x="690" y="175" textAnchor="middle">h</text>

      <g className={`ft-w ${frozen ? 'frozen' : ''} ${merged ? 'merged' : ''}`}>
        <rect className="ft-w-box" x="330" y="74" width="170" height="122" rx="10"/>
        {W_CELLS.map((alpha, index) => <rect key={index} className="ft-w-cell" x={338 + (index % 8) * 19.4} y={82 + Math.floor(index / 8) * 15.6}
          width="17" height="13.5" rx="2" style={{ opacity: alpha }}/>)}
        <rect className="ft-w-frost" x="330" y="74" width="170" height="122" rx="10" fill="url(#ft-ice)"/>
        <rect className="ft-w-blend" x="330" y="74" width="170" height="122" rx="10"/>
        <g className={show(frozen)}><Lock x={486} y={90} size={1.2}/></g>
      </g>
      <text className="ft-label" x="415" y="214" textAnchor="middle">{merged ? say(t('W′ · same size as W, skill built in', 'W′ · بحجم W نفسه والمهارة مبنية فيه')) : say(t('W · 4096 × 4096 · 16.8 M numbers', 'W · 4096 × 4096 · 16.8 مليون رقم'))}</text>
      <g className={show(frozen && !merged)}>
        <text className={`ft-note ${backward || trained ? 'flash' : ''}`} x="415" y="230" textAnchor="middle">
          {trained ? say(t('unchanged ✓', 'لم تتغير ✓')) : say(t('frozen · read only', 'مجمَّدة · للقراءة فقط'))}</text>
      </g>

      <g className={`ft-adapter ${show(adapters)} ${merged ? 'merged' : ''} ${backward || trained ? 'glow' : ''}`}>
        <rect className="ft-a-box" x="330" y="246" width="110" height="18" rx="4"/>
        {STRIPE_A.map((alpha, index) => <rect key={index} className="ft-a-cell" x={332 + index * 13.3} y="248" width="11.5" height="14" rx="1.5"
          style={{ opacity: trained ? Math.min(1, alpha + 0.15) : alpha * 0.8 }}/>)}
        <rect className="ft-b-box" x="468" y="222" width="18" height="70" rx="4"/>
        {STRIPE_B.map((alpha, index) => <rect key={index} className={`ft-b-cell ${trained ? 'learned' : ''}`} x="470" y={224 + index * 11.2}
          width="14" height="9.6" rx="1.5" style={{ opacity: trained ? alpha : 1 }}/>)}
        <text className={`ft-zero ${show(step >= 4 && !trained)}`} x="477" y="308" textAnchor="middle">0</text>
        <text className="ft-tiny strong" x="385" y="282" textAnchor="middle">A · 16 × 4096</text>
        <text className="ft-tiny strong" x="494" y="272">B · 4096 × 16</text>
        <text className="ft-tiny" x="494" y="286">r = 16</text>
      </g>

      {forward && [0, 1, 2].map(index => <circle key={`m${index}`} className="ft-packet" r="5" style={packet(MAIN, -index * 0.8)}/>)}
      {forward && [0, 1, 2].map(index => <circle key={`s${index}`} className="ft-packet hot" r="4.5" style={packet(SIDE, -index * 0.8 - 0.4)}/>)}
      {backward && [0, 1, 2].map(index => <circle key={`bm${index}`} className="ft-packet error back" r="5" style={packet(MAIN, -index * 0.8)}/>)}
      {backward && [0, 1, 2].map(index => <circle key={`bs${index}`} className="ft-packet error back" r="5" style={packet(SIDE, -index * 0.8 - 0.4)}/>)}

      <g className={show(trained && !merged)}>
        <rect className="ft-count" x="560" y="232" width="170" height="52" rx="10"/>
        <text className="ft-tiny" x="645" y="252" textAnchor="middle">{say(t('numbers that learn', 'أرقام تتعلم'))}</text>
        <text className="ft-count-text" x="645" y="274" textAnchor="middle">131 K / 16.9 M · 0.8%</text>
      </g>

      <text className="ft-equation-line" x="732" y="58" textAnchor="end" data-keep="">{ADAPTER_EQUATIONS[step]}</text>
      <Hotspots/>
    </svg>
  </Scene>;
}

// -------------------------------------------------------- 2 quantization

const WEIGHTS = [0.42, -0.13, 0.07, -0.61, 0.25, 0.02, -0.33, 0.18];
const ABSMAX = Math.max(...WEIGHTS.map(Math.abs));
const NORMAL = WEIGHTS.map(value => value / ABSMAX);
const CODES = NORMAL.map(value => NF4_LEVELS.reduce((best, level, index) =>
  Math.abs(level - value) < Math.abs(NF4_LEVELS[best] - value) ? index : best, 0));
const SNAPPED = CODES.map(code => NF4_LEVELS[code]);
const RESTORED = SNAPPED.map(level => level * ABSMAX);
const UNIT = 100;
const COLUMN = (index: number) => 168 + index * 70;

/** The real 16 bits of a number stored as float16 (sign, exponent, fraction). */
function halfBits(value: number) {
  const view = new DataView(new ArrayBuffer(4));
  view.setFloat32(0, value);
  const bits = view.getUint32(0);
  const sign = bits >>> 31;
  let exponent = ((bits >>> 23) & 0xff) - 127 + 15;
  let fraction = (bits >>> 13) & 0x3ff;
  if (exponent <= 0) { exponent = 0; fraction = 0; }
  if (exponent >= 31) { exponent = 31; fraction = 0; }
  return ((sign << 15) | (exponent << 10) | fraction).toString(2).padStart(16, '0');
}
const HALF = WEIGHTS.map(halfBits);
const CODE_BITS = CODES.map(code => code.toString(2).padStart(4, '0'));

const QUANT_STEPS = [
  { title: t('Weights stored in 16 bits', 'أوزان مخزَّنة في 16 بت'),
    text: t('Here are 8 weights from one layer. Each is stored as a 16-bit number: the boxes underneath show its real bits. 8 weights × 16 bits = 128 bits.',
      'هذه 8 أوزان من طبقة واحدة. كل وزن مخزَّن كرقم من 16 بت، والمربعات تحته تعرض بتاته الحقيقية. 8 أوزان × 16 بت = 128 بت.') },
  { title: t('Find the largest value in the block', 'ابحث عن أكبر قيمة في الكتلة'),
    text: t('Weights are quantized in small blocks (64 at a time in QLoRA). The largest size in the block, ignoring the sign, is called absmax. Here it is 0.61.',
      'تُكمَّم الأوزان في كتل صغيرة (64 وزنًا في كل مرة في QLoRA). وأكبر قيمة في الكتلة دون اعتبار الإشارة تسمى absmax. وهي هنا 0.61.') },
  { title: t('Divide by absmax', 'اقسم على absmax'),
    text: t('Every weight is divided by 0.61, so the block now fits exactly between −1 and +1. The pattern stays the same; only the scale changes.',
      'كل وزن يُقسم على 0.61، فتتسع الكتلة الآن تمامًا بين −1 و +1. يبقى النمط كما هو، والمقياس وحده يتغير.') },
  { title: t('The 16 NF4 levels', 'مستويات NF4 الستة عشر'),
    text: t('4 bits can name only 16 different values. NF4 places them where weights usually are: close together near zero, further apart near ±1.',
      '4 بتات لا تستطيع تسمية أكثر من 16 قيمة مختلفة. وصيغة NF4 تضعها حيث تكون الأوزان عادةً: متقاربة قرب الصفر ومتباعدة قرب ±1.') },
  { title: t('Snap each weight to the nearest level', 'انقل كل وزن إلى أقرب مستوى'),
    text: t('Each weight jumps to its closest level. This rounding is the only information that is lost.',
      'كل وزن يقفز إلى أقرب مستوى إليه. وهذا التقريب هو المعلومة الوحيدة التي تضيع.') },
  { title: t('Keep the 4-bit code, and the scale once', 'احفظ رمز الـ 4 بت، والمقياس مرة واحدة'),
    text: t('Only the number of the level (0 to 15) is stored: 4 bits instead of 16. The absmax is stored once for the whole block. 128 bits became 32 bits plus one scale.',
      'لا يُخزَّن إلا رقم المستوى (من 0 إلى 15): 4 بتات بدلًا من 16. ويُخزَّن absmax مرة واحدة للكتلة كلها. فصارت 128 بت 32 بتًا ومقياسًا واحدًا.') },
  { title: t('Turn it back into numbers when the layer is used', 'أعِده أرقامًا حين تُستخدم الطبقة'),
    text: t('When a layer is needed, each code becomes level × absmax again. The result is close to the original, with a small error (dashed outline). In QLoRA this happens on the fly, layer by layer, in 16-bit, and is thrown away after use.',
      'حين تلزم طبقة ما يعود كل رمز إلى المستوى × absmax. والنتيجة قريبة من الأصل بخطأ صغير (الإطار المتقطع). وفي QLoRA يحدث ذلك لحظيًا، طبقة بعد طبقة، بدقة 16 بت، ثم يُتخلَّص منه بعد الاستخدام.') },
  { title: t('Double quantization', 'التكميم المزدوج'),
    text: t('There is one scale for every 64 weights, and 8 billion weights need many scales. QLoRA quantizes the scales too, from 32-bit to 8-bit, saving about another 0.4 bits per weight.',
      'هناك مقياس واحد لكل 64 وزنًا، و 8 مليارات وزن تحتاج إلى مقاييس كثيرة. لذلك تكمّم QLoRA المقاييس أيضًا من 32 بت إلى 8 بت، فتوفر نحو 0.4 بت إضافية لكل وزن.') },
];

const fmt = (values: number[], digits = 2) => values.map(value => value.toFixed(digits)).join(', ');
const COLUMNS: [number, number, number, number][] = WEIGHTS.map((_, index) => [COLUMN(index) - 18, 52, 36, 200]);

const QUANT_FIGURES: Figure[] = [
  { id: 'values', title: t('The numbers on top', 'الأرقام في الأعلى'), areas: [[128, 14, 600, 22]],
    what: t('Each number is one weight of the layer, written above its own bar. A weight is a number the model learned in training; the layer multiplies its input by these numbers. These 8 are a tiny slice of the billions in a real model.',
      'كل رقم هو وزن واحد من أوزان الطبقة، مكتوب فوق عموده. والوزن رقم تعلّمه النموذج أثناء التدريب، وتضرب الطبقة مدخلها بهذه الأرقام. وهذه الثمانية شريحة صغيرة جدًا من مليارات الأوزان في نموذج حقيقي.'),
    why: t('Quantization must keep these numbers as close to their original values as possible. Watch how the same 8 numbers change at each step: scaled, rounded to a level, and turned back.',
      'على التكميم أن يُبقي هذه الأرقام أقرب ما يمكن إلى قيمها الأصلية. راقب كيف تتغير الأرقام الثمانية نفسها في كل خطوة: تُقاس، ثم تُقرَّب إلى مستوى، ثم تُعاد.'),
    now: step => step <= 1
      ? t(`These are the original weights: ${fmt(WEIGHTS)}. Each is stored in 16 bits.`, `هذه هي الأوزان الأصلية: ${fmt(WEIGHTS)}. وكل منها مخزَّن في 16 بت.`)
      : step <= 3
        ? t(`Each weight was divided by absmax 0.61, giving ${fmt(NORMAL)}. All of them now lie between −1 and +1, and the largest, −0.61, became exactly −1.00.`,
          `قُسم كل وزن على absmax ‏0.61 فصار: ${fmt(NORMAL)}. وكلها الآن بين −1 و +1، وأكبرها ‎−0.61 صار −1.00 بالضبط.`)
        : step <= 5
          ? t(`Each value moved to its nearest NF4 level: ${fmt(SNAPPED)}. The small "code" under each number is that level's number, 0 to 15, which is all that gets stored.`,
            `انتقلت كل قيمة إلى أقرب مستوى NF4 إليها: ${fmt(SNAPPED)}. والـ"رمز" الصغير تحت كل رقم هو رقم ذلك المستوى من 0 إلى 15، وهو كل ما يُخزَّن.`)
          : t(`Each code × 0.61 gives ${fmt(RESTORED, 3)}. Compare with the originals ${fmt(WEIGHTS)}: the differences are tiny, at most a few hundredths.`,
            `كل رمز × 0.61 يعطي ${fmt(RESTORED, 3)}. قارنها بالأصل ${fmt(WEIGHTS)}: الفروق صغيرة جدًا، لا تتجاوز بضعة أجزاء من المئة.`) },
  { id: 'codes', title: t('The “code” labels', 'تسميات “الرمز”'), areas: [[128, 36, 600, 13]], steps: [4, 7],
    what: t('The small “code N” under each value is the number of the NF4 level that weight was snapped to. There are 16 levels, numbered 0 to 15, so any code fits in 4 bits (0000 to 1111).',
      '“رمز N” الصغير تحت كل قيمة هو رقم مستوى NF4 الذي نُقل إليه ذلك الوزن. هناك 16 مستوى مرقمة من 0 إلى 15، لذلك يتسع أي رمز في 4 بتات (من 0000 إلى 1111).'),
    why: t('The code is what is actually saved in the model file and in GPU memory. The weight itself is not stored any more: it is rebuilt from the code and the block’s scale when needed.',
      'الرمز هو ما يُحفظ فعلًا في ملف النموذج وفي ذاكرة GPU. أما الوزن نفسه فلم يعد مخزَّنًا، بل يُعاد بناؤه من الرمز ومقياس الكتلة عند الحاجة.'),
    now: () => t(`The codes are ${CODES.join(', ')}. For example the first weight, 0.42, became code ${CODES[0]}, which is level ${SNAPPED[0].toFixed(2)}.`,
      `الرموز هي ${CODES.join('، ')}. فمثلًا الوزن الأول 0.42 صار الرمز ${CODES[0]}، وهو المستوى ${SNAPPED[0].toFixed(2)}.`) },
  { id: 'bars', title: t('The coloured bars', 'الأعمدة الملوّنة'), areas: COLUMNS,
    what: t('Each bar draws one weight: its height is the size of the number. Blue bars point up for positive weights and orange bars point down for negative ones. The horizontal line through the middle is zero.',
      'كل عمود يرسم وزنًا واحدًا: ارتفاعه هو حجم الرقم. الأعمدة الزرقاء تتجه للأعلى للأوزان الموجبة والبرتقالية للأسفل للسالبة. والخط الأفقي في الوسط هو الصفر.'),
    why: t('The bars let you see the shape of the block. Quantization should keep that shape: tall bars stay tall, small bars stay small, and every sign stays the same.',
      'تتيح لك الأعمدة رؤية شكل الكتلة. وعلى التكميم أن يحافظ على هذا الشكل: تبقى الأعمدة الطويلة طويلة والقصيرة قصيرة، وتبقى كل إشارة كما هي.'),
    now: step => [
      t('These are the raw weights. The tallest is the 4th bar, −0.61.', 'هذه هي الأوزان الخام. وأطولها العمود الرابع ‎−0.61.'),
      t('The 4th bar blinks: it is the largest weight in the block, ignoring the sign, so it decides the scale.', 'العمود الرابع يومض: إنه أكبر وزن في الكتلة دون اعتبار الإشارة، لذلك يحدد المقياس.'),
      t('All bars grew by the same factor (÷ 0.61), so the 4th bar now reaches −1 exactly. Their shape did not change.', 'كبرت كل الأعمدة بالعامل نفسه (÷ 0.61)، فوصل العمود الرابع إلى −1 تمامًا. ولم يتغير شكلها.'),
      t('The bars are unchanged; the thin lines behind them are the 16 levels they are about to snap to.', 'الأعمدة لم تتغير؛ والخطوط الرفيعة خلفها هي المستويات الستة عشر التي ستُنقل إليها.'),
      t('Each bar jumped to the nearest level, marked with a dot. Some moved a little up, some a little down.', 'قفز كل عمود إلى أقرب مستوى، مُعلَّمًا بنقطة. بعضها تحرك قليلًا للأعلى وبعضها قليلًا للأسفل.'),
      t('The bars still show the snapped levels. Only their codes are kept now.', 'ما زالت الأعمدة تعرض المستويات المقرَّبة. ولم يعد يُحفظ إلا رموزها.'),
      t('The bars are back at the original scale. The dashed outlines show the original weights; the small gap between a bar and its outline is the quantization error.', 'عادت الأعمدة إلى المقياس الأصلي. والإطارات المتقطعة تعرض الأوزان الأصلية؛ والفجوة الصغيرة بين العمود وإطاره هي خطأ التكميم.'),
      t('The bars are the restored weights, as in the previous step.', 'الأعمدة هي الأوزان المستعادة كما في الخطوة السابقة.'),
    ][step] },
  { id: 'axis', title: t('The 0, +1 and −1 lines', 'خطوط 0 و +1 و −1'), areas: [[94, 40, 30, 220]],
    what: t('The middle line is zero. From step 3 two more lines mark +1 and −1, the range every block is scaled into before rounding.',
      'الخط الأوسط هو الصفر. ومن الخطوة 3 يظهر خطان آخران يحددان +1 و −1، وهو المدى الذي تُقاس إليه كل كتلة قبل التقريب.'),
    why: t('Because every block is scaled to the same −1 … +1 range, one fixed table of 16 levels works for every block in the model, whatever its original size.',
      'لأن كل كتلة تُقاس إلى المدى نفسه من −1 إلى +1، يصلح جدول ثابت واحد من 16 مستوى لكل كتلة في النموذج مهما كان حجمها الأصلي.') },
  { id: 'absmax', title: t('absmax (largest value)', 'absmax (أكبر قيمة)'), areas: [[16, 204, 104, 26]], steps: [1, 1],
    what: t('The dashed line marks absmax: the largest weight in the block when you ignore the sign. Here it is |−0.61| = 0.61.',
      'الخط المتقطع يحدد absmax: أكبر وزن في الكتلة حين تتجاهل الإشارة. وهو هنا ‎|−0.61| = 0.61.'),
    why: t('absmax becomes the block’s scale. Dividing by it puts the largest weight exactly on ±1, so the full range of levels is used and nothing falls outside it. QLoRA uses blocks of 64 weights, so one outlier only affects its own 64 neighbours.',
      'يصبح absmax مقياس الكتلة. والقسمة عليه تضع أكبر وزن على ±1 تمامًا، فيُستخدم مدى المستويات كله ولا يقع شيء خارجه. وتستخدم QLoRA كتلًا من 64 وزنًا، فلا تؤثر قيمة شاذة إلا في جيرانها الـ 64.') },
  { id: 'divide', title: t('The ÷ 0.61 box', 'مربع ÷ 0.61'), areas: [[16, 126, 92, 44]], steps: [2, 2],
    what: t('This box is the scaling step: every weight in the block is divided by absmax, 0.61.',
      'هذا المربع هو خطوة القياس: كل وزن في الكتلة يُقسم على absmax أي 0.61.'),
    why: t('Dividing changes the size of the numbers but not their pattern, and it is undone exactly later by multiplying by 0.61 again. So this step loses no information.',
      'القسمة تغيّر حجم الأرقام لا نمطها، وتُعكس لاحقًا بدقة بالضرب في 0.61 من جديد. لذلك لا تُضيع هذه الخطوة أي معلومة.') },
  { id: 'levels', title: t('The 16 NF4 levels', 'مستويات NF4 الستة عشر'), areas: [[712, 44, 40, 214], [16, 54, 100, 32]], steps: [3, 7],
    what: t('The 16 thin horizontal lines, numbered 0 to 15 on the right, are the only values a 4-bit number can name. Look at the spacing: the lines are packed tightly around 0 and spread out near +1 and −1.',
      'الخطوط الأفقية الرفيعة الستة عشر، المرقمة من 0 إلى 15 على اليمين، هي القيم الوحيدة التي يستطيع رقم من 4 بتات تسميتها. لاحظ التباعد: الخطوط متراصة حول 0 ومتباعدة قرب +1 و −1.'),
    why: t('NF4 means “4-bit NormalFloat”. Trained weights follow a bell curve, so most are near zero. Putting more levels there means most weights land close to a level and lose very little. Even spacing would waste levels on rare large values.',
      'NF4 تعني “عدد عائم طبيعي بـ 4 بتات”. أوزان النموذج المدرَّب تتبع منحنى الجرس، فأغلبها قريب من الصفر. ووضع مستويات أكثر هناك يعني أن أغلب الأوزان تقع قرب مستوى ولا تفقد إلا القليل. أما التباعد المتساوي فيهدر مستويات على قيم كبيرة نادرة.') },
  { id: 'bits', title: t('The bit boxes', 'مربعات البتات'), areas: [[16, 268, 80, 22]],
    what: t('Under each weight are the bits used to store it. Each thin bar is one bit: a blue bar is a 1 and a dark bar is a 0, so each group of 16 bars is one weight. Point at any bar to magnify its group with the 1s and 0s written in. The label on the left says how many bits each weight uses.',
      'تحت كل وزن البتات المستخدمة لتخزينه. كل عمود رفيع بت واحد: العمود الأزرق 1 والمعتم 0، فكل مجموعة من 16 عمودًا وزن واحد. أشر إلى أي عمود لتكبير مجموعته مع كتابة الآحاد والأصفار فيها. والتسمية على اليسار تقول كم بتًا يستخدم كل وزن.'),
    why: t('Bits are memory. Memory = number of weights × bits per weight, so going from 16 to 4 bits makes the model 4 times smaller. That is how an 8B model drops from about 16 GB to about 5 GB.',
      'البتات هي الذاكرة. الذاكرة = عدد الأوزان × البتات لكل وزن، فالانتقال من 16 إلى 4 بتات يجعل النموذج أصغر 4 مرات. وهكذا ينخفض نموذج 8B من نحو 16 غ.ب إلى نحو 5 غ.ب.'),
    now: step => step < 5
      ? t(`These are the real float16 bits: 1 sign bit, 5 exponent bits and 10 fraction bits. For 0.42 they are ${HALF[0]}.`,
        `هذه بتات float16 الحقيقية: بت للإشارة و 5 بتات للأس و 10 بتات للكسر. وللرقم 0.42 هي ${HALF[0]}.`)
      : t(`Now each weight keeps only its 4-bit code. Code ${CODES[0]} is written ${CODE_BITS[0]}. 16 thin boxes became 4 wide ones.`,
        `الآن لا يحتفظ كل وزن إلا برمزه ذي الـ 4 بتات. فالرمز ${CODES[0]} يُكتب ${CODE_BITS[0]}. وصارت 16 مربعًا رفيعًا 4 مربعات عريضة.`) },
  { id: 'scale', title: t('The stored scale', 'المقياس المحفوظ'), areas: [[16, 298, 250, 36]], steps: [5, 7],
    what: t('The orange box is the block’s absmax, 0.61, saved once beside the codes. Without it the codes could not be turned back into real weights.',
      'المربع البرتقالي هو absmax الكتلة، 0.61، محفوظًا مرة واحدة بجانب الرموز. ومن دونه لا يمكن إعادة الرموز أوزانًا حقيقية.'),
    why: t('One scale is shared by 64 weights, so its cost is spread out: a 32-bit scale adds 32 ÷ 64 = 0.5 bits per weight. Double quantization (step 8) stores the scales in 8 bits instead, cutting that to about 0.127 bits per weight.',
      'يتشارك 64 وزنًا مقياسًا واحدًا، فتتوزع كلفته: مقياس من 32 بت يضيف 32 ÷ 64 = 0.5 بت لكل وزن. والتكميم المزدوج (الخطوة 8) يحفظ المقاييس بـ 8 بتات بدلًا من ذلك، فتنخفض الكلفة إلى نحو 0.127 بت لكل وزن.'),
    now: step => step >= 7
      ? t('The box shrank: the scale is now itself quantized to 8 bits.', 'تقلص المربع: المقياس نفسه صار مكمَّمًا إلى 8 بتات.')
      : t('The scale is still a full 32-bit number here.', 'المقياس هنا ما زال رقمًا كاملًا من 32 بت.') },
  { id: 'memory', title: t('The memory total', 'مجموع الذاكرة'), areas: [[440, 300, 292, 30]],
    what: t('This line adds up the memory the 8 weights take: number of weights × bits per weight.',
      'هذا السطر يجمع الذاكرة التي تشغلها الأوزان الثمانية: عدد الأوزان × البتات لكل وزن.'),
    why: t('The same sum, at full scale, decides whether a model fits on your GPU. 8 billion weights × 16 bits = 16 GB; × 4 bits = 4 GB, plus the scales and a few layers kept in 16-bit, about 5 GB in practice.',
      'المجموع نفسه، بالحجم الكامل، يقرر هل يتسع النموذج لبطاقة GPU لديك. 8 مليارات وزن × 16 بت = 16 غ.ب؛ و × 4 بتات = 4 غ.ب، مع المقاييس وبعض الطبقات المحفوظة بـ 16 بت، أي نحو 5 غ.ب عمليًا.'),
    now: step => step >= 5
      ? t('8 × 4 = 32 bits plus one shared scale: 4 times less than before.', '8 × 4 = 32 بت ومقياس مشترك واحد: أقل بأربع مرات مما سبق.')
      : t('8 × 16 = 128 bits: the cost before quantization.', '8 × 16 = 128 بت: الكلفة قبل التكميم.') },
];

const SECTIONS = [
  { name: t('sign', 'إشارة'), from: 0, to: 0, tone: 'sign' },
  { name: t('exponent', 'الأس'), from: 1, to: 5, tone: 'exponent' },
  { name: t('fraction', 'الكسر'), from: 6, to: 15, tone: 'fraction' },
];
const sectionOf = (bit: number) => SECTIONS.find(section => bit >= section.from && bit <= section.to)!;
const LENS_CELL = 20;
const LENS_GAP = 2;

/**
 * Hover (or tap) a weight's bits to see them magnified with a 1 or 0 written in every box.
 * Clicking also opens the explanation of the bit boxes.
 */
function BitLens({ packed }: { packed: boolean }) {
  const say = useTx();
  const { isArabic } = useI18n();
  const direction = isArabic ? 'rtl' : undefined;
  const figures = useContext(FigureContext);
  const [hover, setHover] = useState<{ weight: number; bit: number } | null>(null);
  const pitch = packed ? 13 : 3.25;
  const bitsOf = (weight: number) => packed ? CODE_BITS[weight] : HALF[weight];

  let lens: ReactNode = null;
  if (hover) {
    const bits = bitsOf(hover.weight);
    const cells = bits.length * (LENS_CELL + LENS_GAP) - LENS_GAP;
    const width = Math.max(cells + 24, 270);
    const center = COLUMN(hover.weight);
    const left = Math.max(8, Math.min(752 - width, center - width / 2));
    const bit = bits[hover.bit];
    const title = packed
      ? say(t(`Weight ${hover.weight + 1}: code ${CODES[hover.weight]} stored in 4 bits`, `الوزن ${hover.weight + 1}: الرمز ${CODES[hover.weight]} مخزَّن في 4 بتات`))
      : say(t(`Weight ${hover.weight + 1}: ${WEIGHTS[hover.weight]} stored in 16 bits`, `الوزن ${hover.weight + 1}: ${WEIGHTS[hover.weight]} مخزَّن في 16 بت`));
    const detail = packed
      ? say(t(`This box is ${bit}. ${bits} in binary = ${CODES[hover.weight]} → level ${SNAPPED[hover.weight].toFixed(2)}`,
        `هذا المربع = ${bit}. والعدد الثنائي ${bits} = ${CODES[hover.weight]} ← المستوى ${SNAPPED[hover.weight].toFixed(2)}`))
      : say(t(`This bar is ${bit === '1' ? 'blue, so it is 1' : 'dark, so it is 0'} (bit ${hover.bit + 1} of 16, ${sectionOf(hover.bit).name.en})`,
        `هذا العمود ${bit === '1' ? 'أزرق، إذن هو 1' : 'معتم، إذن هو 0'} (البت ${hover.bit + 1} من 16، ${sectionOf(hover.bit).name.ar})`));
    const cellX = (position: number) => left + (width - cells) / 2 + position * (LENS_CELL + LENS_GAP);
    lens = <g className="ft-lens" pointerEvents="none">
      <rect className="ft-bit-group" x={center - 29} y="266" width="58" height="26" rx="5"/>
      <rect className="ft-bit-mark" x={center - 26 + hover.bit * pitch - 1} y="267" width={(packed ? 11.5 : 2.6) + 2} height="24" rx="1.5"/>
      <rect className="ft-lens-box" x={left} y="166" width={width} height={packed ? 76 : 90} rx="10"/>
      <path className="ft-lens-box" d={`M ${center - 7} ${packed ? 242 : 256} L ${center} ${packed ? 266 : 264} L ${center + 7} ${packed ? 242 : 256}`}/>
      <text className="ft-lens-title" x={left + width / 2} y="183" textAnchor="middle" direction={direction}>{title}</text>
      {bits.split('').map((value, position) => <g key={position}>
        <rect className={`ft-lens-cell ${value === '1' ? 'one' : ''} ${packed ? 'code' : ''} ${position === hover.bit ? 'hovered' : ''}`}
          x={cellX(position)} y="191" width={LENS_CELL} height="24" rx="4"/>
        <text className={`ft-lens-digit ${value === '1' ? 'one' : ''}`} x={cellX(position) + LENS_CELL / 2} y="208" textAnchor="middle">{value}</text>
      </g>)}
      {!packed && SECTIONS.map(section => {
        const x1 = cellX(section.from);
        const x2 = cellX(section.to) + LENS_CELL;
        return <g key={section.tone}>
          <rect className={`ft-lens-section ${section.tone}`} x={x1} y="219" width={x2 - x1} height="3" rx="1.5"/>
          <text className={`ft-lens-label ${section.tone}`} x={(x1 + x2) / 2} y="233" textAnchor="middle">{say(section.name)}</text>
        </g>;
      })}
      <text className="ft-lens-detail" x={left + width / 2} y={packed ? 233 : 248} textAnchor="middle" direction={direction}>{detail}</text>
    </g>;
  }

  return <g className="ft-bit-hits">
    {WEIGHTS.map((_, weight) => <g key={weight} transform={`translate(${COLUMN(weight) - 26} 262)`}>
      {bitsOf(weight).split('').map((_, bit) => <rect key={bit} className="ft-bit-hit"
        x={bit * pitch - (bit === 0 ? 3 : 0)} y="0" width={pitch + (bit === 0 ? 3 : 0)} height="26"
        onMouseEnter={() => setHover({ weight, bit })} onMouseLeave={() => setHover(null)}
        onClick={() => { setHover({ weight, bit }); figures?.pick('bits'); }}/>)}
    </g>)}
    {lens}
  </g>;
}

export function QuantScene() {
  const say = useTx();
  const player = usePlayer(QUANT_STEPS.length);
  const { step } = player;
  const height = (index: number) =>
    step <= 1 ? WEIGHTS[index] : step <= 3 ? NORMAL[index] : step <= 5 ? SNAPPED[index] : RESTORED[index];
  const label = (index: number) =>
    step <= 1 ? WEIGHTS[index].toFixed(2) : step <= 3 ? NORMAL[index].toFixed(2) : step <= 5 ? SNAPPED[index].toFixed(2) : RESTORED[index].toFixed(3);
  const packed = step >= 5;
  return <Scene id="ft-scene-quant" title={t('How a block of weights is quantized to 4-bit (NF4)', 'كيف تُكمَّم كتلة من الأوزان إلى 4 بت (NF4)')}
    steps={QUANT_STEPS} player={player} figures={QUANT_FIGURES}>
    <svg viewBox="0 0 760 350" className={`ft-svg quant-scene step-${step}`} role="img" aria-label={say(QUANT_STEPS[step].title)}>
      <line className="ft-axis" x1="120" x2="720" y1="150" y2="150"/>
      <g className={show(step >= 2)}>
        <line className="ft-bound" x1="120" x2="720" y1={150 - UNIT} y2={150 - UNIT}/>
        <line className="ft-bound" x1="120" x2="720" y1={150 + UNIT} y2={150 + UNIT}/>
        <text className="ft-tiny" x="112" y={154 - UNIT} textAnchor="end">+1</text>
        <text className="ft-tiny" x="112" y={154 + UNIT} textAnchor="end">−1</text>
      </g>
      <text className="ft-tiny" x="112" y="154" textAnchor="end">0</text>

      <g className={show(step >= 3)}>
        {NF4_LEVELS.map((level, index) => <g key={index} style={{ transitionDelay: `${index * 0.04}s` }} className={show(step >= 3)}>
          <line className="ft-level" x1="128" x2="712" y1={150 - level * UNIT} y2={150 - level * UNIT}/>
          <text className="ft-level-text" x="724" y={153 - level * UNIT}>{index}</text>
        </g>)}
        <text className="ft-tiny strong" x="20" y="66">{say(t('16 NF4 levels', '16 مستوى NF4'))}</text>
        <text className="ft-tiny" x="20" y="80">{say(t('dense near 0', 'كثيفة قرب 0'))}</text>
      </g>

      <g className={show(step === 1)}>
        <line className="ft-absmax" x1="120" x2="720" y1={150 + ABSMAX * UNIT} y2={150 + ABSMAX * UNIT}/>
        <text className="ft-tiny strong warm" x="20" y={154 + ABSMAX * UNIT}>absmax = 0.61</text>
      </g>
      <g className={show(step === 2)}>
        <rect className="ft-divide" x="18" y="128" width="86" height="40" rx="10"/>
        <text className="ft-divide-text" x="61" y="154" textAnchor="middle">÷ 0.61</text>
      </g>

      {WEIGHTS.map((value, index) => {
        const x = COLUMN(index);
        const scale = height(index);
        return <g key={index}>
          <g className={show(step >= 6)}>
            <rect className="ft-ghost" x={x - 13} y={value > 0 ? 150 - value * UNIT : 150} width="26" height={Math.abs(value) * UNIT}/>
          </g>
          <g transform={`translate(${x - 12} 150)`}>
            <rect className={`ft-qbar ${value < 0 ? 'negative' : ''} ${step === 1 && index === 3 ? 'pick' : ''}`} x="0" y="0" width="24" height={UNIT}
              style={{ transform: `scaleY(${-scale})` }}/>
          </g>
          <circle className={`ft-snapdot ${show(step >= 4 && step <= 5)}`} cx={x} cy={150 - SNAPPED[index] * UNIT} r="4"/>
          <text className="ft-value" x={x} y="30" textAnchor="middle" key={`${step}-${index}`}>{label(index)}</text>
          <text className={`ft-tiny ${show(step >= 4)}`} x={x} y="44" textAnchor="middle">{say(t('code', 'رمز'))} {CODES[index]}</text>

          <g transform={`translate(${x - 26} 270)`}>
            <g className={show(!packed)}>
              {HALF[index].split('').map((bit, position) => <rect key={position} className={`ft-bit ${bit === '1' ? 'one' : ''}`}
                x={position * 3.25} y="0" width="2.6" height="18" rx="0.6"/>)}
            </g>
            <g className={show(packed)}>
              {CODE_BITS[index].split('').map((bit, position) => <g key={position}>
                <rect className={`ft-bit wide ${bit === '1' ? 'one' : ''}`} x={position * 13} y="0" width="11.5" height="18" rx="2"/>
                <text className="ft-bit-text" x={position * 13 + 5.75} y="13" textAnchor="middle">{bit}</text>
              </g>)}
            </g>
          </g>
        </g>;
      })}

      <text className="ft-tiny strong" x="20" y="283">{packed ? '4 bit' : '16 bit'}</text>
      <g className={show(packed)}>
        <rect className={`ft-scale ${step >= 7 ? 'small' : ''}`} x="18" y="300" width={step >= 7 ? 64 : 92} height="30" rx="7"/>
        <text className="ft-tiny strong warm" x="26" y="319">absmax 0.61</text>
        <text className="ft-tiny" x={step >= 7 ? 92 : 120} y="319">
          {step >= 7 ? say(t('8-bit scale, 1 per 64 weights', 'مقياس 8 بت، واحد لكل 64 وزنًا')) : say(t('32-bit scale, 1 per 64 weights', 'مقياس 32 بت، واحد لكل 64 وزنًا'))}</text>
      </g>
      <text className="ft-memory-line" x="720" y="319" textAnchor="end">
        {packed ? say(t('8 × 4 bits = 32 bits (+ 1 scale)', '8 × 4 بت = 32 بت (+ مقياس واحد)')) : say(t('8 × 16 bits = 128 bits', '8 × 16 بت = 128 بت'))}</text>
      <Hotspots/>
      <BitLens packed={packed} key={packed ? 'packed' : 'half'}/>
    </svg>
  </Scene>;
}

// ------------------------------------------------------------- 3 unsloth

const UNSLOTH_CODE = [
  'pip install unsloth',
  'FastLanguageModel.from_pretrained("unsloth/Qwen3-8B-unsloth-bnb-4bit", load_in_4bit = True)',
  'FastLanguageModel.get_peft_model(model, r = 16, target_modules = [...])',
  'tokenizer.apply_chat_template(messages)  →  tokens',
  'SFTTrainer(model = model, train_dataset = dataset, ...).train()',
  'use_gradient_checkpointing = "unsloth"',
  'model.save_pretrained_gguf("helpdesk", tokenizer, quantization_method = "q4_k_m")',
];

const UNSLOTH_SCENE_STEPS = [
  { title: t('You write a few lines of Python', 'تكتب بضعة أسطر من Python'),
    text: t('Unsloth is a library you import in a notebook, for example on a free cloud GPU. Behind a few functions it drives PyTorch, Transformers, PEFT (for LoRA) and bitsandbytes (for 4-bit).',
      'Unsloth مكتبة تستوردها في دفتر، مثلًا على بطاقة GPU سحابية مجانية. وخلف بضع دوال يقود PyTorch و Transformers و PEFT (لتقنية LoRA) و bitsandbytes (لدقة 4 بت).') },
  { title: t('Load the base model in 4-bit', 'حمّل النموذج الأساسي بدقة 4 بت'),
    text: t('from_pretrained downloads a model that Unsloth has already quantized to 4-bit and puts it on the GPU: about 6 GB for an 8B model instead of about 16 GB in 16-bit. The base is frozen.',
      'الدالة from_pretrained تنزّل نموذجًا سبق أن كمّمه Unsloth إلى 4 بت وتضعه على بطاقة GPU: نحو 6 غ.ب لنموذج 8B بدلًا من نحو 16 غ.ب بدقة 16 بت. والنموذج الأساسي مجمَّد.') },
  { title: t('Add the LoRA adapters', 'أضف مهايئات LoRA'),
    text: t('get_peft_model attaches an A and B pair to every target module. They are the only part that will train, and they take well under 1 GB.',
      'الدالة get_peft_model تربط زوجًا من A و B بكل وحدة مستهدفة. وهما الجزء الوحيد الذي سيتدرب، ويشغلان أقل بكثير من 1 غ.ب.') },
  { title: t('Feed the examples in chat format', 'أدخل الأمثلة بصيغة المحادثة'),
    text: t('Each question and answer is wrapped in the model’s chat template, cut into tokens, and sent to the GPU in small batches.',
      'كل سؤال وجواب يُغلَّف بقالب المحادثة الخاص بالنموذج، ويُقطَّع إلى رموز، ويُرسل إلى بطاقة GPU في دفعات صغيرة.') },
  { title: t('Train with fast kernels', 'درّب بنوى حسابية سريعة'),
    text: t('The loop runs forward → loss → backward → update again and again, and the loss falls. Unsloth replaces the slow parts with its own GPU code and its own backward pass for the LoRA layers. The maths is exact, so results match the standard libraries; it is just faster and uses less memory.',
      'تدور الحلقة: أمامي ← خسارة ← خلفي ← تحديث مرة بعد مرة، وتنخفض الخسارة. ويستبدل Unsloth الأجزاء البطيئة بشيفرة GPU خاصة به وبتمرير خلفي خاص به لطبقات LoRA. والحساب دقيق، فتطابق النتائج المكتبات القياسية، لكنه أسرع ويستهلك ذاكرة أقل.') },
  { title: t('Save memory while training', 'وفّر الذاكرة أثناء التدريب'),
    text: t('With use_gradient_checkpointing = "unsloth", the values the backward pass will need later are parked in the computer’s ordinary RAM instead of filling the GPU. That leaves room for longer examples or a bigger model.',
      'مع use_gradient_checkpointing = "unsloth" تُركن القيم التي سيحتاجها التمرير الخلفي لاحقًا في ذاكرة الحاسوب العادية بدلًا من ملء بطاقة GPU. وهذا يترك مجالًا لأمثلة أطول أو نموذج أكبر.') },
  { title: t('Export the result', 'صدّر النتيجة'),
    text: t('Save only the adapter (about 0.1 GB), merge it into a 16-bit model, or export a 4-bit GGUF file that runs on a laptop with Ollama or llama.cpp.',
      'احفظ المهايئ وحده (نحو 0.1 غ.ب)، أو ادمجه في نموذج 16 بت، أو صدّر ملف GGUF بدقة 4 بت يعمل على حاسوب محمول مع Ollama أو llama.cpp.') },
];

const DOWNLOAD = 'M 120 96 C 170 96 190 92 240 92 L 370 92 C 400 92 410 120 440 120';
const DATA = 'M 120 236 C 220 236 330 200 440 186';
const OFFLOAD = 'M 505 238 C 505 262 505 270 505 284';
const EXPORT = 'M 580 196 C 610 214 620 250 640 262';
const GAUGE_TOP = 60;
const GAUGE_HEIGHT = 170;
const GPU_GB = 16;

const UNSLOTH_FIGURES: Figure[] = [
  { id: 'code', title: t('The code line', 'سطر الشيفرة'), areas: [[20, 10, 720, 28]],
    what: t('The strip at the top shows the line of Python that causes what happens in the picture at this step.',
      'الشريط في الأعلى يعرض سطر Python الذي يُحدث ما تراه في الصورة في هذه الخطوة.'),
    why: t('A whole fine-tuning job in Unsloth is only a handful of such lines. Matching each line to its effect is the fastest way to understand a training notebook.',
      'مهمة الضبط الدقيق كاملة في Unsloth ليست إلا بضعة أسطر كهذه. وربط كل سطر بأثره أسرع طريقة لفهم دفتر التدريب.'),
    now: step => t(`Now: ${UNSLOTH_CODE[step]}`, `الآن: ${UNSLOTH_CODE[step]}`) },
  { id: 'hub', title: t('Hugging Face', 'Hugging Face'), areas: [[20, 60, 100, 72]],
    what: t('Hugging Face is the online library where open-weight models are published. Unsloth uploads ready-made 4-bit copies of popular models there, such as Qwen3-8B.',
      'Hugging Face هي المكتبة الإلكترونية التي تُنشر فيها النماذج ذات الأوزان المفتوحة. ويرفع Unsloth إليها نسخًا جاهزة بدقة 4 بت من النماذج الشائعة مثل Qwen3-8B.'),
    why: t('Downloading a model that is already quantized saves time and memory: you never need to load the 16 GB version at all.',
      'تنزيل نموذج مكمَّم مسبقًا يوفر الوقت والذاكرة: لن تحتاج أبدًا إلى تحميل نسخة الـ 16 غ.ب.') },
  { id: 'examples', title: t('The examples file', 'ملف الأمثلة'), areas: [[20, 206, 100, 60]],
    what: t('helpdesk.jsonl holds your training data: one example per line, each a question and the answer you want the model to give.',
      'الملف helpdesk.jsonl يحمل بيانات تدريبك: مثال في كل سطر، وكل مثال سؤال والإجابة التي تريد أن يعطيها النموذج.'),
    why: t('The model can only learn what the examples show. A few hundred clean, consistent examples usually matter more than any setting.',
      'لا يتعلم النموذج إلا ما تعرضه الأمثلة. وبضع مئات من الأمثلة النظيفة المتسقة أهم عادةً من أي إعداد.') },
  { id: 'unsloth', title: t('Unsloth, the toolkit', 'Unsloth، الأداة'), areas: [[240, 62, 130, 60]],
    what: t('The box with the gear is the Unsloth library. The gear spins while it is doing work: loading, attaching adapters and training.',
      'الصندوق ذو الترس هو مكتبة Unsloth. ويدور الترس ما دامت تعمل: تحميلًا، وربطًا للمهايئات، وتدريبًا.'),
    why: t('Unsloth is a wrapper around PyTorch, Transformers, PEFT and bitsandbytes. It adds hand-written GPU kernels and its own exact backward pass for LoRA, so training is about twice as fast with much less memory, and the results are the same.',
      'Unsloth غلاف حول PyTorch و Transformers و PEFT و bitsandbytes. ويضيف نوى GPU مكتوبة يدويًا وتمريرًا خلفيًا دقيقًا خاصًا به لـ LoRA، فيصير التدريب أسرع بنحو الضعف بذاكرة أقل بكثير، والنتائج نفسها.') },
  { id: 'gpu', title: t('The GPU and its memory bar', 'بطاقة GPU وشريط ذاكرتها'), areas: [[440, 40, 140, 198]],
    what: t('The big box is a 16 GB GPU. The bar on its right fills with what is using memory: the 4-bit base model (blue), the LoRA adapters (orange) and the working memory for training (green). The number on top is the total in GB.',
      'الصندوق الكبير بطاقة GPU سعتها 16 غ.ب. والشريط على يمينه يمتلئ بما يستهلك الذاكرة: النموذج الأساسي بدقة 4 بت (أزرق)، ومهايئات LoRA (برتقالي)، وذاكرة العمل للتدريب (أخضر). والرقم في الأعلى هو المجموع بالغيغابايت.'),
    why: t('If the bar goes past the top, training crashes with “out of memory”. Every trick in QLoRA and Unsloth exists to keep this bar low.',
      'إذا تجاوز الشريط القمة توقف التدريب بخطأ “نفاد الذاكرة”. وكل حيلة في QLoRA و Unsloth موجودة لإبقاء هذا الشريط منخفضًا.'),
    now: step => {
      const used = (step >= 1 ? 6 : 0) + (step >= 2 ? 0.6 : 0) + (step === 4 ? 6.4 : step === 5 ? 2.6 : step === 3 ? 0.6 : 0);
      return t(`About ${used.toFixed(1)} GB of 16 GB is in use.`, `نحو ${used.toFixed(1)} غ.ب من 16 غ.ب قيد الاستخدام.`);
    } },
  { id: 'ram', title: t('Computer RAM', 'ذاكرة الحاسوب'), areas: [[440, 284, 140, 44]],
    what: t('This is the computer’s ordinary memory, outside the GPU. It is slower but much larger and cheaper.',
      'هذه ذاكرة الحاسوب العادية خارج بطاقة GPU. وهي أبطأ لكنها أكبر وأرخص بكثير.'),
    why: t('With use_gradient_checkpointing = "unsloth", values the backward pass needs later are parked here and fetched back when needed. That frees GPU memory for longer examples or a bigger model.',
      'مع use_gradient_checkpointing = "unsloth" تُركن هنا القيم التي يحتاجها التمرير الخلفي لاحقًا وتُستعاد عند الحاجة. وهذا يحرر ذاكرة GPU لأمثلة أطول أو نموذج أكبر.') },
  { id: 'loop', title: t('The training loop', 'حلقة التدريب'), areas: [[616, 56, 110, 110], [612, 182, 126, 62]], steps: [4, 5],
    what: t('The circle is the training loop: forward (make a prediction), loss (measure the mistake), backward (find who is to blame), update (change A and B a little). The line below it is the loss going down.',
      'الدائرة حلقة التدريب: أمامي (توقّع)، خسارة (قِس الخطأ)، خلفي (اعرف المسؤول عنه)، تحديث (غيّر A و B قليلًا). والخط تحتها هو الخسارة وهي تنخفض.'),
    why: t('Each trip around the loop is one batch of examples. A falling loss means the model is learning your data; if it drops to almost zero, it may be memorising instead.',
      'كل دورة حول الحلقة دفعة واحدة من الأمثلة. والخسارة المنخفضة تعني أن النموذج يتعلم بياناتك؛ وإن هبطت إلى الصفر تقريبًا فربما يحفظها بدل أن يتعلمها.') },
  { id: 'files', title: t('The exported files', 'الملفات المصدَّرة'), areas: [[608, 56, 136, 240]], steps: [6, 6],
    what: t('Three ways to save the result: the adapter alone (about 0.1 GB), a full merged 16-bit model (about 16 GB), or a 4-bit GGUF file (about 5 GB) that runs with Ollama or llama.cpp.',
      'ثلاث طرق لحفظ النتيجة: المهايئ وحده (نحو 0.1 غ.ب)، أو نموذج مدموج كامل بدقة 16 بت (نحو 16 غ.ب)، أو ملف GGUF بدقة 4 بت (نحو 5 غ.ب) يعمل مع Ollama أو llama.cpp.'),
    why: t('Pick by use: the adapter to share or swap skills, the merged model to serve on a server, the GGUF file to run offline on a laptop.',
      'اختر حسب الاستخدام: المهايئ للمشاركة أو تبديل المهارات، والنموذج المدموج للتشغيل على خادم، وملف GGUF للتشغيل دون اتصال على حاسوب محمول.') },
];

export function UnslothScene() {
  const say = useTx();
  const player = usePlayer(UNSLOTH_SCENE_STEPS.length);
  const { step } = player;
  const base = step >= 1 ? 6 : 0;
  const adapters = step >= 2 ? 0.6 : 0;
  const working = step === 4 ? 6.4 : step === 5 ? 2.6 : step === 3 ? 0.6 : 0;
  const segment = (gb: number) => gb / GPU_GB * GAUGE_HEIGHT;
  const used = base + adapters + working;
  const lossPoints = Array.from({ length: 14 }, (_, index) =>
    `${622 + index * 7.6},${200 + 38 * (1 - Math.exp(-index / 3.2)) + (index % 2) * 2}`).join(' ');
  return <Scene id="ft-scene-unsloth" title={t('What Unsloth does, step by step', 'ماذا يفعل Unsloth، خطوة بخطوة')}
    steps={UNSLOTH_SCENE_STEPS} player={player} figures={UNSLOTH_FIGURES}>
    <svg viewBox="0 0 760 340" className={`ft-svg unsloth-scene step-${step}`} role="img" aria-label={say(UNSLOTH_SCENE_STEPS[step].title)}>
      <rect className="ft-codeline" x="20" y="10" width="720" height="28" rx="8"/>
      <text className="ft-code-text" x="34" y="29" key={step} data-keep="">{UNSLOTH_CODE[step]}</text>

      {/* the model hub */}
      <g className={`ft-station ${step === 1 ? 'active' : ''}`}>
        <rect x="20" y="60" width="100" height="72" rx="14"/>
        <text className="ft-label" x="70" y="88" textAnchor="middle">Hugging Face</text>
        <text className="ft-tiny" x="70" y="104" textAnchor="middle">Qwen3-8B</text>
        <text className="ft-tiny" x="70" y="118" textAnchor="middle">4-bit</text>
      </g>
      {/* the training examples */}
      <g className={`ft-station ${step === 3 ? 'active' : ''}`}>
        <rect x="20" y="206" width="100" height="60" rx="14"/>
        <text className="ft-label" x="70" y="232" textAnchor="middle">{say(t('Examples', 'الأمثلة'))}</text>
        <text className="ft-tiny" x="70" y="250" textAnchor="middle">helpdesk.jsonl</text>
      </g>
      {/* unsloth */}
      <g className={`ft-station unsloth ${step >= 1 ? 'active' : ''}`}>
        <rect x="240" y="62" width="130" height="60" rx="14"/>
        <g className={`ft-gear ${step >= 1 && step <= 5 ? 'spin' : ''}`} transform="translate(266 92)">
          <circle r="9"/><circle r="3.5" className="hole"/>
          {[0, 45, 90, 135].map(angle => <rect key={angle} x="-2" y="-13" width="4" height="26" rx="1" transform={`rotate(${angle})`}/>)}
        </g>
        <text className="ft-label" x="320" y="90" textAnchor="middle">Unsloth</text>
        <text className="ft-tiny" x="320" y="106" textAnchor="middle">{say(t('the toolkit', 'الأداة'))}</text>
      </g>
      <g className={show(step === 4)}>
        <rect className="ft-callout" x="200" y="140" width="210" height="62" rx="10"/>
        <text className="ft-tiny strong" x="212" y="158">{say(t('inside Unsloth:', 'داخل Unsloth:'))}</text>
        <text className="ft-tiny" x="212" y="174">{say(t('• hand-written GPU kernels', '• نوى GPU مكتوبة يدويًا'))}</text>
        <text className="ft-tiny" x="212" y="190">{say(t('• own backward pass for LoRA · exact', '• تمرير خلفي خاص لـ LoRA · دقيق'))}</text>
      </g>

      <path className="ft-wire dim" d={DOWNLOAD}/>
      <path className="ft-wire dim" d={DATA}/>
      {step === 1 && [0, 1, 2, 3].map(index => <rect key={index} className="ft-crate" x="-7" y="-6" width="14" height="12" rx="2"
        style={packet(DOWNLOAD, -index * 0.55, { animationDuration: '2.2s' })}/>)}
      {step === 3 && [0, 1, 2, 3, 4].map(index => <rect key={index} className="ft-doc" x="-5" y="-7" width="10" height="14" rx="1.5"
        style={packet(DATA, -index * 0.5, { animationDuration: '2.5s' })}/>)}

      {/* the GPU and its memory */}
      <g className="ft-gpu">
        <rect className="ft-gpu-body" x="440" y="48" width="140" height="190" rx="14"/>
        <text className="ft-label" x="452" y="70">GPU</text>
        <text className="ft-tiny" x="452" y="84">{GPU_GB} GB</text>
        <rect className="ft-gauge" x="548" y={GAUGE_TOP} width="20" height={GAUGE_HEIGHT} rx="5"/>
        <rect className="ft-seg base" x="548" width="20" rx="3" style={{ y: GAUGE_TOP + GAUGE_HEIGHT - segment(base), height: segment(base) } as CSSProperties}/>
        <rect className="ft-seg adapter" x="548" width="20" style={{ y: GAUGE_TOP + GAUGE_HEIGHT - segment(base + adapters), height: segment(adapters) } as CSSProperties}/>
        <rect className="ft-seg working" x="548" width="20" style={{ y: GAUGE_TOP + GAUGE_HEIGHT - segment(used), height: segment(working) } as CSSProperties}/>
        <text className="ft-gauge-text" x="558" y={GAUGE_TOP - 4} textAnchor="middle">{used.toFixed(1)}</text>
        <g className={show(base > 0)}><rect className="ft-chip base" x="452" y="186" width="88" height="22" rx="6"/>
          <Lock x={464} y={194} size={0.7}/><text className="ft-chip-text" x="474" y="201">{say(t('base 4-bit', 'أساس 4 بت'))}</text></g>
        <g className={show(adapters > 0)}><rect className="ft-chip adapter" x="452" y="158" width="88" height="22" rx="6"/>
          <text className="ft-chip-text" x="460" y="173">{say(t('LoRA A·B', 'مهايئات A·B'))}</text></g>
        <g className={show(working > 0)}><rect className="ft-chip working" x="452" y="130" width="88" height="22" rx="6"/>
          <text className="ft-chip-text" x="460" y="145">{say(t('working', 'ذاكرة العمل'))}</text></g>
      </g>

      {/* computer RAM, for offloading */}
      <g className={`ft-station ram ${step === 5 ? 'active' : ''}`}>
        <rect x="440" y="284" width="140" height="44" rx="12"/>
        <text className="ft-label" x="510" y="304" textAnchor="middle">{say(t('Computer RAM', 'ذاكرة الحاسوب'))}</text>
        <text className="ft-tiny" x="510" y="319" textAnchor="middle">{say(t('parked values', 'قيم مركونة'))}</text>
      </g>
      <path className={`ft-wire dim ${show(step === 5)}`} d={OFFLOAD}/>
      {step === 5 && [0, 1, 2].map(index => <rect key={index} className="ft-crate working" x="-6" y="-5" width="12" height="10" rx="2"
        style={packet(OFFLOAD, -index * 0.5, { animationDuration: '1.5s' })}/>)}

      {/* the training loop */}
      <g className={`ft-loop ${show(step >= 4 && step <= 5)}`} transform="translate(670 110)">
        <circle className="ft-loop-ring" r="46"/>
        {[t('forward', 'أمامي'), t('loss', 'خسارة'), t('backward', 'خلفي'), t('update', 'تحديث')].map((label, index) => {
          const angle = -Math.PI / 2 + index * Math.PI / 2;
          return <text key={label.en} className="ft-tiny strong" x={Math.cos(angle) * 46} y={Math.sin(angle) * 46 + 4}
            textAnchor="middle" paintOrder="stroke">{say(label)}</text>;
        })}
        <circle className="ft-loop-dot" r="6"/>
      </g>
      <g className={show(step >= 4 && step <= 5)}>
        <text className="ft-tiny" x="620" y="194">{say(t('loss', 'الخسارة'))}</text>
        <polyline className="ft-lossline" points={lossPoints}/>
      </g>

      {/* exported files */}
      <path className={`ft-wire dim ${show(step === 6)}`} d={EXPORT}/>
      <g className={show(step === 6)}>
        {[
          { label: t('adapter only', 'المهايئ وحده'), size: '≈ 0.1 GB', y: 60 },
          { label: t('merged 16-bit', 'مدموج 16 بت'), size: '≈ 16 GB', y: 120 },
          { label: t('GGUF 4-bit', 'GGUF بدقة 4 بت'), size: '≈ 5 GB', y: 180 },
        ].map((file, index) => <g key={file.size} className={show(step === 6)} style={{ transitionDelay: `${0.25 + index * 0.35}s` }}>
          <rect className="ft-file" x="612" y={file.y} width="128" height="46" rx="10"/>
          <text className="ft-label" x="624" y={file.y + 20}>{say(file.label)}</text>
          <text className="ft-tiny" x="624" y={file.y + 36}>{file.size}</text>
        </g>)}
        <rect className="ft-file run" x="612" y="252" width="128" height="40" rx="10"/>
        <text className="ft-tiny strong" x="676" y="276" textAnchor="middle">Ollama · llama.cpp</text>
      </g>
      <Hotspots/>
    </svg>
  </Scene>;
}
