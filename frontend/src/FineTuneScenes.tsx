/**
 * Three animated "watch it happen" scenes for the fine-tuning lab:
 * how LoRA adapters are added, how a block of weights is quantized, and how Unsloth runs a job.
 * Each scene is a picture whose parts move from one step to the next, with a caption per step.
 */
import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import './finetune-scenes.css';
import { Icon } from './ui';
import { useI18n } from './i18n';
import { NF4_LEVELS } from './finetuneModel';

interface Text { en: string; ar: string }
const t = (en: string, ar: string): Text => ({ en, ar });

function useTx() {
  const { isArabic } = useI18n();
  return (text: Text) => isArabic ? text.ar : text.en;
}

// --------------------------------------------------------------- the player

const STEP_MS = 5200;

function usePlayer(count: number) {
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

function Scene({ id, title, steps, player, children }: {
  id: string; title: Text; steps: { title: Text; text: Text }[];
  player: ReturnType<typeof usePlayer>; children: ReactNode;
}) {
  const say = useTx();
  const { step, playing, go, toggle } = player;
  const last = steps.length - 1;
  return <section className="ft-scene" id={id} aria-label={say(title)}>
    <header className="ft-scene-head">
      <span className="ft-scene-badge"><Icon name="play" size={11}/>{say(t('Watch it happen', 'شاهدها تحدث'))}</span>
      <h4>{say(title)}</h4>
    </header>
    <div className="ft-scene-stage" dir="ltr">{children}</div>
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
  </section>;
}

const show = (visible: boolean) => visible ? 'ft-show' : 'ft-show off';
const packet = (path: string, delay: number, extra: Record<string, string> = {}) =>
  ({ offsetPath: `path("${path}")`, animationDelay: `${delay}s`, ...extra }) as CSSProperties;

function Lock({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
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
    steps={ADAPTER_STEPS} player={player}>
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
    steps={QUANT_STEPS} player={player}>
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
    steps={UNSLOTH_SCENE_STEPS} player={player}>
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
    </svg>
  </Scene>;
}
