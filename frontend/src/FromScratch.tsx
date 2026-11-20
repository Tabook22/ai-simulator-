/**
 * "Build it from scratch": a neural network built in plain Python, part by part.
 * Each part plays a picture of the neuron in step with the code that computes it and the
 * terminal output that code prints. The inputs are sliders, so the code and output follow them.
 * Numbers are computed in the same order as Python, so the printed floats match a real run.
 */
import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import './from-scratch.css';
import { Icon } from './ui';
import { t, usePlayer, useTx } from './FineTuneScenes';
import type { Text } from './FineTuneScenes';

const cls = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(' ');

/** Python's str() of a float: 1.0, 0.75, 0.7499999999999999, -0.7500000000000001, 1e-07. */
export function py(value: number) {
  if (Object.is(value, -0)) return '-0.0';
  if (Number.isInteger(value) && Math.abs(value) < 1e16) return value.toFixed(1);
  return String(value).replace(/e([+-])(\d)$/, 'e$10$2');
}

const WEIGHTS = [0.8, 0.5, -1.5];
const BIAS = -0.4;
const NAMES = [t('sunny', 'مشمس'), t('warm', 'دافئ'), t('rain', 'مطر')];

/** The loop in part 1: start at the bias, add each product in turn. Returns every running total. */
function loopTotals(inputs: number[]) {
  const totals = [BIAS];
  let output = BIAS;
  inputs.forEach((x, index) => { output += x * WEIGHTS[index]; totals.push(output); });
  return totals;
}
/** np.dot(inputs, weights) + bias: products summed left to right, then the bias. */
function dot(inputs: number[]) {
  let sum = 0;
  inputs.forEach((x, index) => { sum += x * WEIGHTS[index]; });
  return sum + BIAS;
}
const step01 = (z: number) => z > 0 ? 1 : 0;
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
const relu = (z: number) => Math.max(0, z);

// ======================================================== the code, as lines

interface Line { code: string; note?: string }

function partOneCode(inputs: number[]): Line[] {
  return [
    { code: 'import numpy as np' },
    { code: '# Part 1: a single neuron' },
    { code: `inputs  = [${inputs.map(py).join(', ')}]`, note: '# sunny, warm, rain' },
    { code: 'weights = [0.8, 0.5, -1.5]', note: '# how much each matters' },
    { code: 'bias    = -0.4', note: '# baseline mood' },
    { code: 'output = bias' },
    { code: 'for x, w in zip(inputs, weights):' },
    { code: '    output += x * w', note: '# weigh every input' },
    { code: 'print(output)' },
    { code: 'print(np.dot(inputs, weights) + bias)', note: '# same, one line' },
    { code: 'inputs[2] = 1.0', note: '# now it rains' },
    { code: 'print(np.dot(inputs, weights) + bias)' },
  ];
}

function partTwoCode(inputs: number[]): Line[] {
  return [
    { code: 'import numpy as np' },
    { code: '# Part 2: activation functions' },
    { code: `inputs  = np.array([${inputs.map(py).join(', ')}])`, note: '# sunny, warm, rain' },
    { code: 'weights = np.array([0.8, 0.5, -1.5])' },
    { code: 'bias    = -0.4' },
    { code: 'z = np.dot(inputs, weights) + bias', note: '# weighted sum' },
    { code: 'def step(z):    return 1.0 if z > 0 else 0.0', note: '# yes / no' },
    { code: 'def sigmoid(z): return 1 / (1 + np.exp(-z))', note: '# 0 … 1' },
    { code: 'def relu(z):    return max(0.0, z)', note: '# cut negatives' },
    { code: 'print(z, step(z), sigmoid(z), relu(z))' },
    { code: 'inputs[2] = 1.0', note: '# now it rains' },
    { code: 'z = np.dot(inputs, weights) + bias' },
    { code: 'print(z, step(z), sigmoid(z), relu(z))' },
  ];
}

const pyRelu = (z: number) => z > 0 ? py(z) : '0.0';
const activationLine = (z: number) => `${py(z)} ${py(step01(z))} ${py(sigmoid(z))} ${pyRelu(z)}`;

// ======================================================== the steps

interface Step {
  /** 1-based line being run; lines up to this one are shown. */
  line: number;
  title: Text;
  say: Text;
  /** What the picture lights up. */
  lit: ('inputs' | 'weights' | 'bias' | 'sum' | 'out' | 'act')[];
  /** Index of the wire being added (part 1 loop). */
  wire?: number;
  /** Which running total the neuron shows: 0 = bias only … 3 = all inputs. */
  total?: number;
  rain?: boolean;
  /** How many terminal lines are printed so far. */
  printed: number;
  /** Which activation is in focus (part 2). */
  fn?: 'step' | 'sigmoid' | 'relu' | 'all';
}

const PART_ONE: Step[] = [
  { line: 1, lit: [], printed: 0, title: t('Import numpy', 'استورد numpy'),
    say: t('numpy is Python’s library for fast maths on lists of numbers. We need it only at the end, for the one-line version.', 'numpy مكتبة بايثون للحساب السريع على قوائم الأرقام. نحتاجها في النهاية فقط، للنسخة ذات السطر الواحد.') },
  { line: 3, lit: ['inputs'], printed: 0, title: t('The inputs: today’s weather', 'المدخلات: طقس اليوم'),
    say: t('Should I ride my bike today? Three numbers describe the day: sunny 1.0, warm 0.7, rain 0.0. To a neuron, inputs are just numbers.', 'هل أركب دراجتي اليوم؟ ثلاثة أرقام تصف اليوم: مشمس 1.0، دافئ 0.7، مطر 0.0. المدخلات عند الخلية العصبية مجرد أرقام.') },
  { line: 4, lit: ['weights'], printed: 0, title: t('The weights: how much each matters', 'الأوزان: أهمية كل مدخل'),
    say: t('Each input gets a weight. Sun (0.8) and warmth (0.5) push towards riding; rain gets −1.5, a strong push against.', 'لكل مدخل وزن. الشمس (0.8) والدفء (0.5) يدفعان نحو الركوب، والمطر وزنه −1.5، دفع قوي في الاتجاه المعاكس.') },
  { line: 5, lit: ['bias'], printed: 0, title: t('The bias: a baseline mood', 'الانحياز: المزاج الأساسي'),
    say: t('The bias is the neuron’s mood before it looks at anything: slightly against riding (−0.4).', 'الانحياز مزاج الخلية قبل أن تنظر إلى أي شيء: ميل خفيف ضد الركوب (−0.4).') },
  { line: 6, lit: ['bias', 'sum'], total: 0, printed: 0, title: t('Start the total at the bias', 'ابدأ المجموع من الانحياز'),
    say: t('output = bias. The neuron starts at −0.4.', '⁦output = bias⁩. تبدأ الخلية من −0.4.') },
  { line: 8, lit: ['sum'], wire: 0, total: 1, printed: 0, title: t('Add sunny × 0.8', 'أضف مشمس × 0.8'),
    say: t('The loop takes the first pair: 1.0 × 0.8 = 0.8, so the total becomes 0.4.', 'تأخذ الحلقة الزوج الأول: ⁦1.0 × 0.8 = 0.8⁩، فيصبح المجموع 0.4.') },
  { line: 8, lit: ['sum'], wire: 1, total: 2, printed: 0, title: t('Add warm × 0.5', 'أضف دافئ × 0.5'),
    say: t('Second pair: 0.7 × 0.5 = 0.35. The total is now 0.75.', 'الزوج الثاني: ⁦0.7 × 0.5 = 0.35⁩. المجموع الآن 0.75.') },
  { line: 8, lit: ['sum'], wire: 2, total: 3, printed: 0, title: t('Add rain × −1.5', 'أضف مطر × −1.5'),
    say: t('Third pair: 0.0 × −1.5 = 0. No rain, so the strongest weight adds nothing today.', 'الزوج الثالث: ⁦0.0 × −1.5 = 0⁩. لا مطر، فأقوى وزن لا يضيف شيئًا اليوم.') },
  { line: 9, lit: ['sum', 'out'], total: 3, printed: 1, title: t('Print it: 0.75 → ride', 'اطبعه: 0.75 ← اركب'),
    say: t('Multiply, add it all up: 0.75. Positive means yes: RIDE.', 'اضرب واجمع كل شيء: 0.75. الموجب يعني نعم: اركب.') },
  { line: 10, lit: ['sum', 'out'], total: 3, printed: 2, title: t('The same in one line', 'الشيء نفسه في سطر واحد'),
    say: t('np.dot multiplies the pairs and adds them in one call. The last digits differ (0.7499999999999999) because computers store 0.7 and 0.35 only approximately. That is normal floating-point rounding.', 'np.dot يضرب الأزواج ويجمعها في استدعاء واحد. تختلف الخانات الأخيرة ⁦(0.7499999999999999)⁩ لأن الحاسوب يخزّن 0.7 و 0.35 تقريبيًا. وهذا تقريب عادي للأعداد العشرية.') },
  { line: 11, lit: ['inputs'], total: 3, rain: true, printed: 2, title: t('Now it rains', 'الآن تمطر'),
    say: t('inputs[2] = 1.0 sets the third input, rain, to 1.0. Watch the red wire: −1.5 is about to count.', '⁦inputs[2] = 1.0⁩ يجعل المدخل الثالث، المطر، يساوي 1.0. راقب السلك الأحمر: −1.5 سيُحسب الآن.') },
  { line: 12, lit: ['sum', 'out'], total: 3, rain: true, printed: 3, title: t('−0.75 → stay home', '−0.75 ← ابقَ في البيت'),
    say: t('1·0.8 + 0.7·0.5 + 1·(−1.5) − 0.4 = −0.75. Negative means no: STAY HOME. That is literally all a neuron does. Every network, even ChatGPT, is built from billions of these.', '⁦1·0.8 + 0.7·0.5 + 1·(−1.5) − 0.4 = −0.75⁩. السالب يعني لا: ابقَ في البيت. هذا حرفيًا كل ما تفعله الخلية العصبية. وكل شبكة، حتى ChatGPT، مبنية من مليارات منها.') },
];

const PART_TWO: Step[] = [
  { line: 5, lit: ['inputs', 'weights', 'bias'], printed: 0, title: t('The same neuron', 'الخلية نفسها'),
    say: t('Same day, same weights and bias as Part 1, now stored as numpy arrays.', 'اليوم نفسه والأوزان والانحياز نفسها كما في الجزء 1، مخزّنة الآن كمصفوفات numpy.') },
  { line: 6, lit: ['sum'], total: 3, printed: 0, title: t('z: the weighted sum', 'z: المجموع الموزون'),
    say: t('z = 0.75. Part 1 then decided “positive → ride”. That decision rule is an activation function. Let’s write it properly.', '⁦z = 0.75⁩. في الجزء 1 قررنا «موجب ← اركب». قاعدة القرار هذه دالة تنشيط. لنكتبها كما يجب.') },
  { line: 7, lit: ['sum', 'act'], total: 3, fn: 'step', printed: 0, title: t('Step: a hard yes or no', 'الدرجة: نعم أو لا قاطعة'),
    say: t('step gives 1 if z > 0, else 0. Simple, but a tiny change in z can flip the answer, and its slope is 0 everywhere, so a network cannot learn through it.', 'دالة الدرجة تعطي 1 إذا كان ⁦z > 0⁩ وإلا 0. بسيطة، لكن تغييرًا صغيرًا في z قد يقلب الإجابة، وميلها صفر في كل مكان، فلا تستطيع الشبكة أن تتعلم عبرها.') },
  { line: 8, lit: ['sum', 'act'], total: 3, fn: 'sigmoid', printed: 0, title: t('Sigmoid: a smooth confidence', 'السيغمويد: ثقة متدرجة'),
    say: t('sigmoid squashes any z into 0…1. At z = 0.75 it gives 0.68: “68% sure, ride”. Smooth, so it can be trained; often used for yes/no outputs.', 'السيغمويد تضغط أي z إلى ما بين 0 و 1. عند ⁦z = 0.75⁩ تعطي 0.68: «متأكد بنسبة 68٪، اركب». متدرجة فيمكن تدريبها، وتُستخدم كثيرًا لمخرجات نعم/لا.') },
  { line: 9, lit: ['sum', 'act'], total: 3, fn: 'relu', printed: 0, title: t('ReLU: keep positives, cut negatives', 'ReLU: أبقِ الموجب واقطع السالب'),
    say: t('relu keeps a positive z and turns a negative one into 0. Cheap and effective: the default inside hidden layers.', 'ReLU تُبقي z الموجب وتحوّل السالب إلى 0. رخيصة وفعالة: الاختيار المعتاد داخل الطبقات المخفية.') },
  { line: 10, lit: ['sum', 'act', 'out'], total: 3, fn: 'all', printed: 1, title: t('Print all three', 'اطبع الثلاث'),
    say: t('z, then step, sigmoid and ReLU of it: 1.0, 0.68 and 0.75. Three ways to say “ride”.', 'z ثم الدرجة والسيغمويد و ReLU له: 1.0 و 0.68 و 0.75. ثلاث طرق لقول «اركب».') },
  { line: 12, lit: ['inputs', 'sum', 'act'], total: 3, rain: true, fn: 'all', printed: 1, title: t('Now it rains: z = −0.75', 'الآن تمطر: ⁦z = −0.75⁩'),
    say: t('Rain flips z to −0.75. Watch each dot slide to the left half of its curve.', 'المطر يقلب z إلى −0.75. راقب كل نقطة تنزلق إلى النصف الأيسر من منحناها.') },
  { line: 13, lit: ['sum', 'act', 'out'], total: 3, rain: true, fn: 'all', printed: 2, title: t('0.0 · 0.32 · 0.0 → stay home', '0.0 · 0.32 · 0.0 ← ابقَ في البيت'),
    say: t('Step says no, sigmoid is only 32% sure, ReLU outputs 0. Why it matters: without an activation, stacking neurons only ever gives a straight line; the bend is what lets a network learn curves.', 'الدرجة تقول لا، والسيغمويد متأكدة بنسبة 32٪ فقط، و ReLU تعطي 0. ولماذا يهم هذا: من دون تنشيط لا يعطي تكديس الخلايا إلا خطًا مستقيمًا، والانحناء هو ما يتيح للشبكة تعلّم المنحنيات.') },
];

interface Part { key: string; number: number; title: Text; hook: Text; file: string; steps: Step[]; code: (inputs: number[]) => Line[]; output: (inputs: number[]) => string[] }

const PARTS: Part[] = [
  { key: 'neuron', number: 1, title: t('The neuron', 'الخلية العصبية'), file: 'neural_net.py', steps: PART_ONE, code: partOneCode,
    hook: t('Should I ride my bike today? Inputs, weights and a bias: multiply, add it all up, and decide.', 'هل أركب دراجتي اليوم؟ مدخلات وأوزان وانحياز: اضرب، واجمع كل شيء، ثم قرّر.'),
    output: inputs => {
      const rainy = [inputs[0], inputs[1], 1];
      return [py(loopTotals(inputs)[3]), py(dot(inputs)), py(dot(rainy))];
    } },
  { key: 'activation', number: 2, title: t('Activation functions', 'دوال التنشيط'), file: 'activation.py', steps: PART_TWO, code: partTwoCode,
    hook: t('The neuron gave a number. An activation function turns it into a decision: step, sigmoid, ReLU.', 'أعطت الخلية رقمًا. ودالة التنشيط تحوّله إلى قرار: الدرجة، السيغمويد، ReLU.'),
    output: inputs => [activationLine(dot(inputs)), activationLine(dot([inputs[0], inputs[1], 1]))] },
];

// ======================================================== the picture

const WIRE_Y = [62, 150, 238];

function InputIcon({ index, x, y }: { index: number; x: number; y: number }) {
  if (index === 0) return <g className="fs-ico sun" transform={`translate(${x} ${y})`}>
    <circle r="7"/>{[0, 45, 90, 135, 180, 225, 270, 315].map(angle => <line key={angle} x1="10" x2="14" transform={`rotate(${angle})`}/>)}</g>;
  if (index === 1) return <g className="fs-ico temp" transform={`translate(${x} ${y})`}>
    <rect x="-3" y="-13" width="6" height="18" rx="3"/><circle cy="8" r="5.5"/></g>;
  return <g className="fs-ico cloud" transform={`translate(${x} ${y})`}>
    <path d="M-12 3 a6 6 0 0 1 2-11 a8 8 0 0 1 15 -1 a6 6 0 0 1 7 12 z"/>
    <line x1="-6" y1="8" x2="-8" y2="13"/><line x1="0" y1="8" x2="-2" y2="13"/><line x1="6" y1="8" x2="4" y2="13"/></g>;
}

function NeuronPicture({ inputs, step, part }: { inputs: number[]; step: Step; part: Part }) {
  const say = useTx();
  const values = step.rain ? [inputs[0], inputs[1], 1] : inputs;
  const totals = loopTotals(values);
  // Part 1 shows the loop's total until the np.dot line runs; after that, and in part 2, np.dot's.
  const full = part.number === 1 && !step.rain && step.printed < 2 ? totals[3] : dot(values);
  const shown = step.total === undefined ? null : part.number === 1 && step.total < 3 ? totals[step.total] : full;
  const lit = (name: Step['lit'][number]) => step.lit.includes(name);
  const decided = lit('out') && shown !== null;
  const yes = (shown ?? 0) > 0;
  return <svg className={cls('fs-net', decided && (yes ? 'yes' : 'no'))} viewBox="0 0 600 300" role="img"
    aria-label={say(t(`Neuron: inputs ${values.join(', ')}, weights 0.8, 0.5, −1.5, bias −0.4`, `خلية: المدخلات ${values.join('، ')}، الأوزان 0.8 و 0.5 و −1.5، الانحياز −0.4`))}>
    {WIRE_Y.map((y, index) => {
      const negative = WEIGHTS[index] < 0;
      const active = step.wire === index || (step.rain && index === 2);
      const strength = Math.abs(values[index] * WEIGHTS[index]);
      return <g key={index} className={cls('fs-wire', negative ? 'neg' : 'pos', active && 'on', lit('weights') && 'lit')}>
        <path d={`M112 ${y} C 190 ${y}, 220 150, 286 150`} style={{ strokeWidth: 1.5 + strength * 3 } as CSSProperties}/>
        {active && <circle r="5" className="fs-pulse"><animateMotion dur="1.1s" repeatCount="indefinite" path={`M112 ${y} C 190 ${y}, 220 150, 286 150`}/></circle>}
        <g transform={`translate(${190} ${y + (150 - y) * 0.42})`} className="fs-weight">
          <rect x="-26" y="-11" width="52" height="22" rx="11"/><text y="4" direction="ltr">× {WEIGHTS[index]}</text>
        </g>
      </g>;
    })}
    {WIRE_Y.map((y, index) => <g key={index} className={cls('fs-input', lit('inputs') && 'lit', step.rain && index === 2 && 'rain')}>
      <rect x="6" y={y - 13} width="40" height="26" rx="7"/><text x="26" y={y + 5} direction="ltr">{py(values[index])}</text>
      <circle cx="86" cy={y} r="24"/><InputIcon index={index} x={86} y={y}/>
      <text x="86" y={y + 40} className="fs-name">{say(NAMES[index])}</text>
    </g>)}
    <g className={cls('fs-bias', lit('bias') && 'lit')}>
      <line x1="336" y1="56" x2="336" y2="96"/><rect x="292" y="22" width="88" height="30" rx="15"/><text x="336" y="42" direction="ltr">b = −0.4</text>
    </g>
    <g className={cls('fs-soma', lit('sum') && 'lit', shown !== null && (shown > 0 ? 'pos' : 'neg'))}>
      <circle cx="336" cy="150" r="54"/>
      <text x="336" y="140" className="fs-sigma">Σ</text>
      <text x="336" y="172" className="fs-total" direction="ltr" key={String(shown)}>{shown === null ? '' : py(Math.round(shown * 1e4) / 1e4)}</text>
      <text x="336" y="224" className="fs-name">{say(t('neuron', 'الخلية'))}</text>
    </g>
    <g className={cls('fs-out', decided && 'lit')}>
      <path d="M392 150 H 452" markerEnd="url(#fs-arrow)"/>
      <defs><marker id="fs-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z"/></marker></defs>
      {decided && <>
        <text x="522" y="128" className="fs-big" direction="ltr">{py(Math.round((shown as number) * 100) / 100)}</text>
        <g className="fs-pill"><rect x="462" y="150" width="120" height="32" rx="16"/>
          <text x="522" y="171">{yes ? say(t('RIDE ✓', 'اركب ✓')) : say(t('STAY HOME', 'ابقَ في البيت'))}</text></g>
      </>}
    </g>
  </svg>;
}

/** Three small charts of step, sigmoid and ReLU with a dot at the current z (part 2). */
function ActivationCharts({ z, focus }: { z: number | null; focus: Step['fn'] }) {
  const say = useTx();
  const fns: { key: 'step' | 'sigmoid' | 'relu'; name: string; f: (x: number) => number; top: number; read: (x: number) => Text }[] = [
    { key: 'step', name: 'step(z)', f: step01, top: 1.2, read: x => step01(x) ? t('1 → ride', '1 ← اركب') : t('0 → stay home', '0 ← ابقَ') },
    { key: 'sigmoid', name: 'sigmoid(z)', f: sigmoid, top: 1.2, read: x => t(`${Math.round(sigmoid(x) * 100)}% sure to ride`, `ثقة ${Math.round(sigmoid(x) * 100)}٪ بالركوب`) },
    { key: 'relu', name: 'relu(z)', f: relu, top: 3.2, read: x => t(`passes ${relu(x).toFixed(2)}`, `يمرّر ${relu(x).toFixed(2)}`) },
  ];
  const W = 170, H = 110, X = (x: number) => 10 + (x + 3) / 6 * (W - 20);
  return <div className="fs-acts">
    {fns.map(fn => {
      const Y = (y: number) => H - 14 - (y + 0.1) / (fn.top + 0.1) * (H - 26);
      const points = Array.from({ length: 121 }, (_, index) => -3 + index * 0.05).map(x => `${X(x).toFixed(1)},${Y(fn.f(x)).toFixed(1)}`).join(' ');
      const on = focus === fn.key || focus === 'all';
      return <figure key={fn.key} className={cls('fs-act', fn.key, on && 'on')}>
        <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <line x1={X(0)} x2={X(0)} y1="6" y2={H - 10} className="axis"/><line x1="10" x2={W - 10} y1={Y(0)} y2={Y(0)} className="axis"/>
          <polyline points={points} className="curve"/>
          {z !== null && on && <g className="dot" style={{ transform: `translate(${X(z)}px, ${Y(fn.f(z))}px)` }}><circle r="5.5"/></g>}
        </svg>
        <figcaption><code dir="ltr">{fn.name}</code>{z !== null && on && <span>{say(fn.read(z))}</span>}</figcaption>
      </figure>;
    })}
  </div>;
}

// ======================================================== code + terminal

function CodePane({ lines, upTo, file, output, printed }: { lines: Line[]; upTo: number; file: string; output: string[]; printed: number }) {
  const say = useTx();
  const [copied, setCopied] = useState(false);
  const text = lines.map(line => line.note ? `${line.code.padEnd(38)}${line.note}` : line.code).join('\n') + '\n';
  const copy = () => { void navigator.clipboard?.writeText(text).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500); }); };
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/x-python' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: file });
    link.click();
    URL.revokeObjectURL(url);
  };
  return <div className="fs-editor" dir="ltr" data-keep="">
    <div className="fs-editor-head"><i/><i/><i/><span data-keep="">{file}</span>
      <button type="button" onClick={copy}><Icon name="copy" size={12}/>{copied ? say(t('Copied', 'نُسخ')) : say(t('Copy', 'نسخ'))}</button>
      <button type="button" onClick={download}><Icon name="download" size={12}/>.py</button>
    </div>
    <ol className="fs-lines" data-testid="fs-code">{lines.map((line, index) => <li key={index}
      className={cls(index + 1 === upTo && 'run', index + 1 > upTo && 'later', line.code.startsWith('#') && 'comment')}>
      <code><Highlight code={line.code}/>{line.note && <span className="c" data-keep="">{' '.repeat(Math.max(1, 38 - line.code.length))}{line.note}</span>}</code>
    </li>)}</ol>
    <div className="fs-term" data-testid="fs-terminal">
      <span className="cmd" data-keep="">$ python {file}</span>
      {output.slice(0, printed).map((line, index) => <span key={`${index}-${line}`} className={cls('out', index === printed - 1 && 'new')} data-keep="">{line}</span>)}
      <span className="cursor"/>
    </div>
  </div>;
}

/** A tiny Python highlighter: keywords, numbers, strings and comments. */
function Highlight({ code }: { code: string }) {
  if (code.startsWith('#')) return <span className="c" data-keep="">{code}</span>;
  const parts: ReactNode[] = [];
  const pattern = /\b(import|as|for|in|def|return|if|else|print|zip|max)\b|(-?\b\d+(?:\.\d+)?)|(np\.\w+)/g;
  let last = 0;
  for (const match of code.matchAll(pattern)) {
    const at = match.index ?? 0;
    if (at > last) parts.push(code.slice(last, at));
    parts.push(<span key={at} className={match[1] ? 'k' : match[2] ? 'n' : 'f'} data-keep="">{match[0]}</span>);
    last = at + match[0].length;
  }
  parts.push(code.slice(last));
  return <>{parts}</>;
}

// ======================================================== the part player

function PartPlayer({ part, inputs }: { part: Part; inputs: number[] }) {
  const say = useTx();
  const player = usePlayer(part.steps.length);
  const { step: index, playing } = player;
  const step = part.steps[index];
  const lines = part.code(inputs);
  const output = part.output(inputs);
  const values = step.rain ? [inputs[0], inputs[1], 1] : inputs;
  const z = step.total === undefined ? null : dot(values);
  return <div className="fs-player">
    <div className="fs-grid">
      <div className="fs-visual">
        <NeuronPicture inputs={inputs} step={step} part={part}/>
        {part.number === 2 && <ActivationCharts z={step.fn ? z : null} focus={step.fn}/>}
        <div className="fs-formula" dir="ltr" data-keep="">
          {step.rain && step.printed === part.output(inputs).length
            ? <><small>{say(t('RAINY DAY', 'يوم ممطر'))}</small><span>{values.map((v, i) => `${py(v)}·${WEIGHTS[i] < 0 ? `(${WEIGHTS[i]})` : WEIGHTS[i]}`).join(' + ')} − 0.4 = {py(Math.round(dot(values) * 100) / 100)}</span></>
            : <><small>{say(t('WEIGHTED SUM', 'المجموع الموزون'))}</small><span>z = Σ<sub>i</sub> w<sub>i</sub>·x<sub>i</sub> + b{part.number === 2 && <> → <b>activation(z)</b></>}</span></>}
        </div>
      </div>
      <CodePane lines={lines.slice(0, Math.max(step.line, index === part.steps.length - 1 ? lines.length : step.line))} upTo={step.line} file={part.file} output={output} printed={step.printed}/>
    </div>
    <div className="fs-caption" key={`${part.key}-${index}`}>
      <span className="fs-count" dir="ltr">{index + 1} / {part.steps.length} · {say(t('line', 'السطر'))} {step.line}</span>
      <h4 data-testid="fs-title">{say(step.title)}</h4>
      <p>{say(step.say)}</p>
    </div>
    <div className="fs-controls">
      <button type="button" className="button small" onClick={() => player.go(index - 1)} disabled={index === 0} aria-label={say(t('Previous step', 'الخطوة السابقة'))}><Icon name="previous" size={13}/></button>
      <button type="button" className="button small primary" onClick={player.toggle}><Icon name={playing ? 'pause' : 'play'} size={13}/>
        {say(playing ? t('Pause', 'إيقاف مؤقت') : index === part.steps.length - 1 ? t('Play again', 'شغّل من جديد') : t('Play', 'تشغيل'))}</button>
      <button type="button" className="button small" onClick={() => player.go(index + 1)} disabled={index === part.steps.length - 1} aria-label={say(t('Next step', 'الخطوة التالية'))}><Icon name="next" size={13}/></button>
      <div className="fs-dots">{part.steps.map((item, position) => <button key={position} type="button" aria-label={say(item.title)}
        className={cls(position === index && 'on', position < index && 'past')} onClick={() => player.go(position)}/>)}</div>
    </div>
  </div>;
}

/** The series: pick a part, set the day, play the picture with its code. */
export function FromScratch() {
  const say = useTx();
  const [partIndex, setPartIndex] = useState(0);
  const [inputs, setInputs] = useState([1, 0.7, 0]);
  const part = PARTS[partIndex];
  const set = (index: number, value: number) => setInputs(current => current.map((old, position) => position === index ? value : old));
  return <section className="panel fs" aria-labelledby="fs-title">
    <div className="fs-head">
      <div>
        <div className="eyebrow">{say(t('Let’s build a neural network · from scratch', 'لنبنِ شبكة عصبية · من الصفر'))}</div>
        <h2 id="fs-title">{say(t('Part', 'الجزء'))} {part.number}: <em>{say(part.title)}</em></h2>
        <p>{say(part.hook)}</p>
      </div>
      <div className="fs-parts" role="tablist" aria-label={say(t('Parts', 'الأجزاء'))}>
        {PARTS.map((item, index) => <button key={item.key} type="button" role="tab" aria-selected={index === partIndex}
          className={index === partIndex ? 'on' : ''} onClick={() => setPartIndex(index)}>
          <b dir="ltr">{item.number}</b>{say(item.title)}</button>)}
      </div>
    </div>
    <div className="fs-sliders">
      <span>{say(t('Change the day:', 'غيّر اليوم:'))}</span>
      {NAMES.map((name, index) => <label key={name.en}>{say(name)} <b dir="ltr">{py(inputs[index])}</b>
        <input type="range" min="0" max="1" step="0.1" value={inputs[index]} aria-label={say(name)}
          onChange={event => set(index, Math.round(Number(event.target.value) * 10) / 10)}/></label>)}
      <button type="button" className="lx-link" onClick={() => setInputs([1, 0.7, 0])}>{say(t('Reset', 'إعادة'))}</button>
    </div>
    <PartPlayer key={part.key} part={part} inputs={inputs}/>
    <p className="fs-note"><Icon name="bulb" size={13}/>{say(t('The output is computed in the same order Python uses, so it matches a real run digit for digit. Copy or download the file and run it with: pip install numpy, then python ' + part.file + '.',
      'يُحسب الناتج بالترتيب نفسه الذي تستعمله بايثون، فيطابق التشغيل الحقيقي رقمًا برقم. انسخ الملف أو نزّله وشغّله بـ: pip install numpy ثم python ' + part.file + '.'))}</p>
  </section>;
}
