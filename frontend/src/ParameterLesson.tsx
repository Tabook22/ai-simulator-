/**
 * "What is a parameter?" — three tools for the key-words part of the fine-tuning lab:
 * one neuron with its weights and bias (and the same neuron trained the LoRA way),
 * a ladder from 3 parameters to billions, and why parameters are not a file of facts.
 */
import { useState } from 'react';
import './parameter.css';
import { Icon } from './ui';
import { useI18n } from './i18n';
import { t, useTx } from './FineTuneScenes';
import { MODEL_SIZES, budget } from './finetuneModel';

const cls = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');
const f = (value: number, digits = 2) => value.toFixed(digits);

type Mode = 'explore' | 'lora' | 'full';
const START = { w1: 0.5, w2: 0.4, b: 0.2 };
const TARGET = 3.2;

/** One neuron: z = x1·w1 + x2·w2 + b. In LoRA mode the weights are locked and a small trainable change is added beside them. */
export function NeuronParameters() {
  const say = useTx();
  const { isArabic } = useI18n();
  const [mode, setMode] = useState<Mode>('explore');
  const [x1, setX1] = useState(2);
  const [x2, setX2] = useState(3);
  const [w, setW] = useState(START);
  const [delta, setDelta] = useState({ d1: 0, d2: 0 });
  const [steps, setSteps] = useState(0);
  const [pulse, setPulse] = useState(0);
  const lora = mode === 'lora';
  const full = mode === 'full';
  const w1 = w.w1 + (lora ? delta.d1 : 0);
  const w2 = w.w2 + (lora ? delta.d2 : 0);
  const z = x1 * w1 + x2 * w2 + w.b;
  const changed = [w.w1 !== START.w1, w.w2 !== START.w2, w.b !== START.b].filter(Boolean).length;

  const choose = (next: Mode) => {
    setMode(next); setW(START); setDelta({ d1: 0, d2: 0 }); setSteps(0); setX1(2); setX2(3); setPulse(value => value + 1);
  };
  const train = () => {
    const error = 2 * (z - TARGET);
    const rate = 0.012;
    if (lora) setDelta(current => ({ d1: current.d1 - rate * error * x1, d2: current.d2 - rate * error * x2 }));
    else setW(current => ({ w1: current.w1 - rate * error * x1, w2: current.w2 - rate * error * x2, b: current.b - rate * error }));
    setSteps(value => value + 1);
    setPulse(value => value + 1);
  };
  const edge = (value: number) => Math.max(1.5, Math.min(9, Math.abs(value) * 9));
  const slider = (label: string, value: number, set: (value: number) => void, min: number, max: number, step: number, locked = false) =>
    <label className={cls('pm-slider', locked && 'locked')}>
      <span dir="ltr">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} disabled={locked}
        onChange={event => { set(Number(event.target.value)); setPulse(current => current + 1); }} aria-label={label}/>
      <b dir="ltr">{f(value)}</b>{locked && <Icon name="lock" size={12}/>}
    </label>;

  return <div className="pm-neuron">
    <h4 className="llm-sub ft-handson first"><Icon name="flask" size={13}/>{say(t('What is a parameter? Look inside one neuron', 'ما المعامل؟ انظر داخل عصبون واحد'))}</h4>
    <p className="lx-lead">{say(t('Parameters are the numbers a model learns. There are two kinds: weights (w), which set how strongly each input counts, and biases (b), an extra number added before the activation function.',
      'المعاملات هي الأرقام التي يتعلمها النموذج. وهي نوعان: الأوزان (w) التي تحدد مقدار تأثير كل مدخل، والانحيازات (b) وهي رقم إضافي يُضاف قبل دالة التنشيط.'))}</p>
    <div className="ft-tabs" role="group" aria-label={say(t('Mode', 'الوضع'))}>
      <button type="button" className={mode === 'explore' ? 'current' : ''} aria-pressed={mode === 'explore'} onClick={() => choose('explore')}>{say(t('Explore the neuron', 'استكشف العصبون'))}</button>
      <button type="button" className={full ? 'current' : ''} aria-pressed={full} onClick={() => choose('full')}>{say(t('Train every parameter', 'درّب كل المعاملات'))}</button>
      <button type="button" className={lora ? 'current' : ''} aria-pressed={lora} onClick={() => choose('lora')}>{say(t('Train the LoRA way', 'درّب بطريقة LoRA'))}</button>
    </div>

    <svg viewBox="0 0 560 250" className={cls('pm-svg', lora && 'lora', full && 'full')} role="img" key={pulse}
      aria-label={`z = ${f(x1)} × ${f(w1)} + ${f(x2)} × ${f(w2)} + ${f(w.b)} = ${f(z)}`}>
      <path className="pm-edge" d="M 92 70 C 180 70 220 118 300 124" style={{ strokeWidth: edge(w1) }}/>
      <path className="pm-edge" d="M 92 190 C 180 190 220 136 300 132" style={{ strokeWidth: edge(w2) }}/>
      <path className="pm-edge bias" d="M 340 34 L 340 92"/>
      <circle className="pm-flow" r="5" style={{ offsetPath: 'path("M 92 70 C 180 70 220 118 300 124")' }}/>
      <circle className="pm-flow" r="5" style={{ offsetPath: 'path("M 92 190 C 180 190 220 136 300 132")', animationDelay: '.15s' }}/>
      <circle className="pm-flow bias" r="4" style={{ offsetPath: 'path("M 340 34 L 340 92")', animationDelay: '.3s' }}/>
      {lora && <>
        <path className="pm-delta" d="M 92 82 C 180 96 220 128 300 128"/>
        <path className="pm-delta" d="M 92 178 C 180 168 220 132 300 130"/>
      </>}

      <circle className="pm-input" cx="66" cy="70" r="26"/><text className="pm-in-text" x="66" y="66" textAnchor="middle">x₁</text>
      <text className="pm-in-value" x="66" y="84" textAnchor="middle">{f(x1, 1)}</text>
      <circle className="pm-input" cx="66" cy="190" r="26"/><text className="pm-in-text" x="66" y="186" textAnchor="middle">x₂</text>
      <text className="pm-in-value" x="66" y="204" textAnchor="middle">{f(x2, 1)}</text>

      <g className={cls('pm-weight', (lora) && 'frozen', full && 'hot')}>
        <rect x="150" y="52" width="88" height="26" rx="8"/>
        <text x="194" y="70" textAnchor="middle">w₁ = {f(w.w1)}</text>
      </g>
      <g className={cls('pm-weight', (lora) && 'frozen', full && 'hot')}>
        <rect x="150" y="178" width="88" height="26" rx="8"/>
        <text x="194" y="196" textAnchor="middle">w₂ = {f(w.w2)}</text>
      </g>
      {lora && <>
        <g className="pm-adapter"><rect x="150" y="90" width="88" height="22" rx="7"/><text x="194" y="105" textAnchor="middle">+Δ₁ {f(delta.d1)}</text></g>
        <g className="pm-adapter"><rect x="150" y="146" width="88" height="22" rx="7"/><text x="194" y="161" textAnchor="middle">+Δ₂ {f(delta.d2)}</text></g>
      </>}
      <g className={cls('pm-weight bias', lora && 'frozen', full && 'hot')}>
        <rect x="296" y="8" width="88" height="26" rx="8"/>
        <text x="340" y="26" textAnchor="middle">b = {f(w.b)}</text>
      </g>

      <circle className="pm-sum" cx="340" cy="128" r="36"/>
      <text className="pm-sum-label" x="340" y="120" textAnchor="middle">Σ</text>
      <text className="pm-sum-value" x="340" y="142" textAnchor="middle">z = {f(z)}</text>
      <path className="pm-edge out" d="M 376 128 L 440 128"/>
      <rect className="pm-act" x="440" y="104" width="104" height="48" rx="12"/>
      <text className="pm-act-text" x="492" y="124" textAnchor="middle" direction={isArabic ? 'rtl' : undefined}>{say(t('activation', 'دالة التنشيط'))}</text>
      <text className="pm-act-text small" x="492" y="141" textAnchor="middle">f(z)</text>
      {mode !== 'explore' && <text className="pm-target" x="340" y="190" textAnchor="middle" direction={isArabic ? 'rtl' : undefined}>
        {say(t(`target z = ${f(TARGET)}`, `الهدف z = ${f(TARGET)}`))}</text>}
      {lora && <text className="pm-note" x="194" y="236" textAnchor="middle" direction={isArabic ? 'rtl' : undefined}>{say(t('locked W, trainable Δ', 'W مقفلة، و Δ قابلة للتدريب'))}</text>}
    </svg>

    <p className="pm-equation" dir="ltr" data-testid="neuron-equation">
      z = (<span className="x">{f(x1, 1)}</span> × {lora && '('}<span className={lora ? 'frozen' : 'w'}>{f(w.w1)}</span>{lora && <><span className="d"> + {f(delta.d1)}</span>)</>})
      {' + '}(<span className="x">{f(x2, 1)}</span> × {lora && '('}<span className={lora ? 'frozen' : 'w'}>{f(w.w2)}</span>{lora && <><span className="d"> + {f(delta.d2)}</span>)</>})
      {' + '}<span className={lora ? 'frozen' : 'b'}>{f(w.b)}</span> = <strong>{f(z)}</strong>
    </p>

    {mode === 'explore' && <div className="pm-sliders">
      {slider('x₁', x1, setX1, -3, 4, 0.5)}
      {slider('x₂', x2, setX2, -3, 4, 0.5)}
      {slider('w₁', w.w1, value => setW(current => ({ ...current, w1: value })), -1, 1, 0.05)}
      {slider('w₂', w.w2, value => setW(current => ({ ...current, w2: value })), -1, 1, 0.05)}
      {slider('b', w.b, value => setW(current => ({ ...current, b: value })), -1, 1, 0.05)}
    </div>}

    {mode !== 'explore' && <div className="pm-train">
      <div className="button-row">
        <button type="button" className="button primary" onClick={train}><Icon name="play" size={14}/>{say(t('Train one step', 'درّب خطوة واحدة'))}</button>
        <button type="button" className="button quiet" onClick={() => choose(mode)}><Icon name="reset" size={14}/>{say(t('Start again', 'ابدأ من جديد'))}</button>
      </div>
      <dl className="ft-facts">
        <div><dt>{say(t('Steps', 'الخطوات'))}</dt><dd>{steps}</dd></div>
        <div><dt>{say(t('Error', 'الخطأ'))}</dt><dd data-testid="neuron-error" dir="ltr">{f(z - TARGET)}</dd></div>
        <div className={lora ? 'ft-proof' : ''}><dt>{say(t('Original parameters changed', 'معاملات أصلية تغيّرت'))}</dt>
          <dd data-testid="neuron-changed">{changed}</dd><small>{say(t('of 3', 'من 3'))}</small></div>
        <div><dt>{say(t('Parameters that learn', 'معاملات تتعلم'))}</dt><dd>{lora ? 2 : 3}</dd>
          <small>{lora ? say(t('the new Δ only', 'Δ الجديدة فقط')) : say(t('w₁, w₂ and b', 'w₁ و w₂ و b'))}</small></div>
      </dl>
      <p className="lx-muted">{lora
        ? say(t('The original w₁, w₂ and b stay exactly the same; only the new adjustments Δ learn. In a real layer the adjustment for a whole matrix is written as B·A, and biases usually stay frozen too (bias = "none").',
          'تبقى w₁ و w₂ و b الأصلية كما هي تمامًا، والتعديلات الجديدة Δ وحدها تتعلم. وفي الطبقة الحقيقية يُكتب تعديل المصفوفة كلها على شكل B·A، والانحيازات تبقى مجمَّدة عادةً أيضًا (bias = "none").'))
        : say(t('Every original parameter moves. That is full fine-tuning: fine for 3 numbers, but a model has billions, and each one would need its own gradient and optimizer memory.',
          'كل معامل أصلي يتحرك. هذا هو الضبط الدقيق الكامل: مقبول لثلاثة أرقام، لكن النموذج فيه مليارات، وكل واحد منها سيحتاج إلى تدرّج وذاكرة محسّن خاصة به.'))}</p>
    </div>}
  </div>;
}

/** From one neuron to a whole model: how many parameters, and how few LoRA trains. */
export function ParameterLadder() {
  const say = useTx();
  const [level, setLevel] = useState(0);
  const model = MODEL_SIZES[2];
  const plan = budget(model, 4, 16, true);
  const rungs = [
    { count: 3, name: t('One neuron', 'عصبون واحد'), detail: t('2 weights + 1 bias', 'وزنان + انحياز واحد') },
    { count: 4096 * 4096 + 4096, name: t('One weight matrix', 'مصفوفة أوزان واحدة'), detail: t('4,096 × 4,096 weights (+ 4,096 biases, if it has them)', '4,096 × 4,096 وزنًا (+ 4,096 انحيازًا إن وُجدت)') },
    { count: model.billions * 1e9 / model.layers, name: t('One transformer layer', 'طبقة محوّل واحدة'), detail: t('seven matrices for attention and the MLP', 'سبع مصفوفات للانتباه وشبكة MLP') },
    { count: model.billions * 1e9, name: t('The whole 8B model', 'نموذج 8B كاملًا'), detail: t(`${model.layers} layers, plus the vocabulary`, `${model.layers} طبقة، إضافةً إلى المفردات`) },
    { count: plan.adapterParameters, name: t('What LoRA trains (r = 16)', 'ما تدرّبه LoRA (r = 16)'), detail: t(`${(plan.trainableShare * 100).toFixed(2)}% of the model; everything else is frozen`, `${(plan.trainableShare * 100).toFixed(2)}٪ من النموذج؛ وكل ما عداه مجمَّد`), lora: true },
  ];
  const show = (count: number) => count >= 1e9 ? `${(count / 1e9).toFixed(1)} B` : count >= 1e6 ? `${(count / 1e6).toFixed(1)} M` : count.toLocaleString('en-US');
  const years = model.billions * 1e9 / (3600 * 24 * 365);
  return <div className="pm-ladder">
    <h4 className="llm-sub ft-handson"><Icon name="layers" size={13}/>{say(t('From 3 parameters to billions', 'من 3 معاملات إلى المليارات'))}</h4>
    <ol className="pm-rungs">
      {rungs.map((rung, index) => <li key={rung.name.en} className={cls(index <= level && 'shown', index === level && 'current', rung.lora && 'lora')}>
        <button type="button" onClick={() => setLevel(index)} aria-current={index === level ? 'step' : undefined}>
          <span className="pm-rung-name">{say(rung.name)}</span>
          <span className="pm-rung-bar"><i style={{ width: index <= level ? `${Math.max(1.5, Math.log10(rung.count) / 10 * 100)}%` : '0%' }}/></span>
          <b dir="ltr">{show(rung.count)}</b>
          <small>{say(rung.detail)}</small>
        </button>
      </li>)}
    </ol>
    <div className="button-row">
      <button type="button" className="button small primary" disabled={level >= rungs.length - 1} onClick={() => setLevel(value => value + 1)}>
        {say(t('Zoom out', 'كبّر النطاق'))}<Icon name="next" size={13}/></button>
      <button type="button" className="button small quiet" onClick={() => setLevel(0)}><Icon name="reset" size={13}/></button>
    </div>
    <p className="lx-muted">{say(t(`The bars use a logarithmic scale: each step to the right is ten times more. If you wrote down one parameter of the 8B model every second, it would take about ${Math.round(years)} years.`,
      `الأعمدة بمقياس لوغاريتمي: كل خطوة إلى اليمين تعني عشرة أضعاف. ولو كتبت معاملًا واحدًا من نموذج 8B كل ثانية لاحتجت إلى نحو ${Math.round(years)} سنة.`))}</p>
  </div>;
}

const FACTS = [
  t('Al-Bar’ah is a dance from Dhofar', 'البرعة رقصة من ظفار'),
  t('Muscat is the capital of Oman', 'مسقط عاصمة عُمان'),
  t('Frankincense grows in Dhofar', 'اللبان ينمو في ظفار'),
];
const CELLS = 160;
/** A repeatable pattern: each fact touches many cells, and the cells are shared between facts. */
const strength = (fact: number, cell: number) => {
  const value = Math.sin(cell * 12.9898 + fact * 78.233) * 43758.5453;
  return Math.abs(value - Math.floor(value));
};

export function FactsNotFiles() {
  const say = useTx();
  const [fact, setFact] = useState<number | null>(0);
  return <div className="pm-facts">
    <h4 className="llm-sub ft-handson"><Icon name="search" size={13}/>{say(t('Parameters are not a file of facts', 'المعاملات ليست ملفًا من الحقائق'))}</h4>
    <div className="ft-tabs" role="group" aria-label={say(t('Pick a fact', 'اختر حقيقة'))}>
      {FACTS.map((item, index) => <button key={item.en} type="button" className={index === fact ? 'current' : ''} aria-pressed={index === fact}
        onClick={() => setFact(index)}>{say(item)}</button>)}
    </div>
    <div className="pm-facts-grid">
      <article>
        <h5><Icon name="file" size={14}/>{say(t('A database: one fact, one row', 'قاعدة بيانات: حقيقة واحدة، صف واحد'))}</h5>
        <ol className="pm-rows">{FACTS.map((item, index) => <li key={item.en} className={index === fact ? 'hit' : ''}>{say(item)}</li>)}</ol>
        <p>{say(t('The fact is written in one place. You can find it, read it and edit it.', 'الحقيقة مكتوبة في مكان واحد. يمكنك إيجادها وقراءتها وتعديلها.'))}</p>
      </article>
      <article>
        <h5><Icon name="grid" size={14}/>{say(t('A model: patterns spread over many numbers', 'نموذج: أنماط موزعة على أرقام كثيرة'))}</h5>
        <div className="pm-cells" data-testid="fact-cells">
          {Array.from({ length: CELLS }, (_, cell) => {
            const level = fact === null ? 0 : strength(fact, cell);
            const shared = fact !== null && FACTS.filter((_, other) => strength(other, cell) > 0.72).length > 1;
            return <i key={cell} className={cls(level > 0.72 && 'strong', shared && level > 0.72 && 'shared')}
              style={{ opacity: 0.15 + level * 0.85 }}/>;
          })}
        </div>
        <p>{say(t('No single number holds the fact. Many numbers take part, and the same numbers also take part in other facts (white outline). That is why you cannot edit one fact by changing one weight.',
          'لا يحمل رقم واحد الحقيقة. أرقام كثيرة تشارك فيها، والأرقام نفسها تشارك أيضًا في حقائق أخرى (الإطار الأبيض). ولهذا لا يمكنك تعديل حقيقة واحدة بتغيير وزن واحد.'))}</p>
      </article>
    </div>
    <p className="lx-key"><Icon name="bulb" size={14}/><span><strong>{say(t('The most important point for students: ', 'النقطة الأهم للطلاب: '))}</strong>
      {say(t('parameters are not files that contain written facts. They are numbers that cooperate inside the network to represent the patterns the model learned. LoRA changes the model’s behaviour by training a relatively small number of new parameters instead of retraining billions of original ones.',
        'المعاملات ليست ملفات تحتوي على حقائق مكتوبة، بل أرقام تتعاون داخل الشبكة لتمثيل الأنماط والعلاقات التي تعلمها النموذج. وفي LoRA نعدّل سلوك النموذج بتدريب عدد صغير نسبيًا من المعاملات الجديدة بدلًا من إعادة تدريب مليارات المعاملات الأصلية.'))}</span></p>
    <p className="lx-muted">{say(t('The cell patterns are an illustration of the idea, not a measurement from a real model.', 'أنماط الخلايا توضيح للفكرة، وليست قياسًا من نموذج حقيقي.'))}</p>
  </div>;
}
