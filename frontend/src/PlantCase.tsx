/**
 * Parts 13 and 14 of the fine-tuning lab, built from the UTAS-70 student project (a Dhofar
 * native-plant assistant): fine-tuning a vision model with transfer learning, and the whole
 * project as a worked example that joins a CNN, a knowledge base and a QLoRA fine-tuned model.
 * Records and scores are illustrations for the lesson, not the project's results.
 */
import { useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import './plants.css';
import { Icon } from './ui';
import type { IconName } from './ui';
import { useI18n } from './i18n';
import { usePartNav } from './LabShell';
import { Hotspots, Lock, Scene, packet, show, t, usePlayer, useTx } from './FineTuneScenes';
import type { Figure, Text } from './FineTuneScenes';
import { Txt } from './LessonScenes';
import { JsonCode } from './FineTuneLessons';
import { GPUS, MODEL_SIZES, budget } from './finetuneModel';
import {
  BACKBONES, CONFIGS, EVAL_QUESTION, GUIDE, IMAGENET_MEAN, IMAGENET_STD, LAYERS, MATRIX, MATRIX_SPECIES, PREDICTIONS,
  PROCEDURE, PROJECT, QUESTIONS, RECORD, SCORE_NAMES, SPECIES, TRANSFER_STEPS, TWO_TUNINGS,
} from './visionContent';
import type { Track } from './visionContent';

const cls = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');
const bySpecies = Object.fromEntries(SPECIES.map(species => [species.key, species]));
const percent = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`;
const thousands = (value: number) => value.toLocaleString('en-US');

function Heading({ icon, children, first }: { icon: IconName; children: ReactNode; first?: boolean }) {
  return <h4 className={cls('llm-sub ft-handson', first && 'first')}><Icon name={icon} size={13}/>{children}</h4>;
}

/** A button that opens another part of the lab. */
function PartLink({ part }: { part: number }) {
  const say = useTx();
  const nav = usePartNav();
  return <button type="button" className="lx-link" onClick={() => nav.go(part)}>
    {say(t(`Part ${part + 1}`, `الجزء ${part + 1}`))}: {say(nav.parts[part].label)}<Icon name="next" size={11}/>
  </button>;
}

// ------------------------------------------------------------- plant drawings

/** Simple drawings of the example species, in a 100 × 100 box. */
export function PlantArt({ kind }: { kind: string }) {
  switch (kind) {
    case 'boswellia': return <g className="pc-plant">
      <path className="trunk" d="M50 96 C48 80 52 70 46 60 C40 50 30 46 26 38 M47 62 C56 54 66 50 72 40 M50 74 C58 70 64 66 70 60"/>
      <path className="bark" d="M47 88 l3 -3 M49 80 l-3 -2 M48 70 l3 -2"/>
      {[[24, 34], [32, 30], [70, 36], [76, 42], [64, 32], [70, 56], [76, 58], [20, 40]].map(([x, y], index) =>
        <ellipse key={index} className="leaf" cx={x} cy={y} rx="6" ry="3.4" transform={`rotate(${index * 37} ${x} ${y})`}/>)}
    </g>;
    case 'commiphora': return <g className="pc-plant">
      <path className="trunk" d="M50 96 V72 M50 80 L34 62 M50 76 L68 58 M50 72 L46 50 M34 62 L26 52 M68 58 L78 50 M46 50 L40 40 M46 56 L56 44"/>
      {[[26, 50], [78, 48], [40, 38], [56, 42], [32, 60], [70, 58]].map(([x, y], index) => <circle key={index} className="leaf small" cx={x} cy={y} r="2.6"/>)}
    </g>;
    case 'adansonia': return <g className="pc-plant">
      <path className="trunk fat" d="M36 96 C34 76 38 58 42 48 H58 C62 58 66 76 64 96 Z"/>
      <path className="trunk" d="M44 50 L32 34 M50 48 V30 M56 50 L70 34 M32 34 L24 30 M70 34 L78 28"/>
      {[[24, 28], [32, 30], [50, 26], [70, 30], [78, 26]].map(([x, y], index) => <ellipse key={index} className="leaf" cx={x} cy={y} rx="7" ry="4"/>)}
    </g>;
    case 'adenium': return <g className="pc-plant">
      <path className="trunk fat" d="M30 96 C24 84 34 72 44 70 H56 C66 72 76 84 70 96 Z"/>
      <path className="trunk" d="M44 72 L36 52 M50 70 V46 M56 72 L66 54"/>
      {[[36, 48], [50, 42], [66, 50]].map(([x, y], index) => <g key={index}>
        {[0, 72, 144, 216, 288].map(angle => <ellipse key={angle} className="petal" cx={x} cy={y - 5} rx="3" ry="5" transform={`rotate(${angle} ${x} ${y})`}/>)}
        <circle className="eye" cx={x} cy={y} r="1.8"/>
      </g>)}
    </g>;
    case 'aloe': return <g className="pc-plant">
      {[-60, -35, -12, 12, 35, 60].map(angle => <path key={angle} className="blade" d="M50 92 C46 76 47 62 50 44 C53 62 54 76 50 92 Z"
        transform={`rotate(${angle} 50 92)`}/>)}
      <path className="trunk" d="M50 80 V22"/>
      {[22, 28, 34].map(y => <ellipse key={y} className="bloom" cx="50" cy={y} rx="3" ry="2.4"/>)}
    </g>;
    case 'unknown': return <g className="pc-plant unknown">
      <path className="trunk" d="M50 96 V58 M50 74 L36 60 M50 68 L64 54"/>
      {[[36, 56], [64, 50], [50, 52], [42, 46], [58, 42]].map(([x, y], index) => <circle key={index} className="leaf" cx={x} cy={y} r="7"/>)}
      <text className="mark" x="50" y="38" textAnchor="middle">?</text>
    </g>;
    default: return <g className="pc-plant">
      <path className="trunk fat" d="M44 96 C46 80 46 70 44 60 H56 C54 70 54 80 56 96 Z"/>
      <circle className="leaf canopy" cx="50" cy="42" r="26"/>
      {[[40, 40], [58, 34], [54, 50], [36, 52], [64, 46]].map(([x, y], index) => <circle key={index} className="fig" cx={x} cy={y} r="2.6"/>)}
    </g>;
  }
}

// ================================================ part 13 · fine-tuning for images

const BLOCKS = [210, 180, 150, 120, 90];
const blockX = (index: number) => 176 + index * 64;
const BLOCK_NAMES = [t('edges, colours', 'حواف وألوان'), t('textures', 'ملمس'), t('shapes', 'أشكال'), t('plant parts', 'أجزاء النبات'), t('whole plants', 'نباتات كاملة')];
const OLD_CLASSES = [t('tabby cat', 'قط'), t('school bus', 'حافلة'), t('daisy', 'أقحوان'), t('pizza', 'بيتزا')];
const P_FORWARD = 'M 136 166 H 516';
const START = [0.18, 0.14, 0.2, 0.16, 0.15, 0.17];
const LEARNING = [0.46, 0.2, 0.08, 0.12, 0.07, 0.07];
const FINAL = [0.89, 0.07, 0.01, 0.02, 0.01, 0];

const TRANSFER_FIGURES: Figure[] = [
  { id: 'photo', title: t('The photo', 'الصورة'), areas: [[24, 110, 112, 112]],
    what: t('One labelled training photo of a Dhofar plant, resized to 224 × 224 pixels: 224 × 224 × 3 colour values.', 'صورة تدريب موسومة لنبات من ظفار، بأبعاد 224 × 224 بكسل: أي 224 × 224 × 3 قيمة لونية.'),
    why: t('The pre-trained body expects exactly this size and the ImageNet colour statistics; a different preparation breaks what it learned.', 'الجسم المدرَّب مسبقًا يتوقع هذا الحجم بالضبط وإحصاءات ألوان ImageNet؛ وأي تجهيز مختلف يفسد ما تعلّمه.') },
  { id: 'early', title: t('Early blocks: general features', 'الكتل الأولى: سمات عامة'), areas: [[176, 56, 110, 220]],
    what: t('Convolution filters that respond to edges, colours and small textures. These look the same for cats, buses and frankincense trees.', 'مرشحات التفافية تستجيب للحواف والألوان والملمس الدقيق. وهي متشابهة للقطط والحافلات وأشجار اللبان.'),
    why: t('General features are why transfer learning works with only 100–150 photos per species: they are reused, not learned again.', 'السمات العامة هي سبب نجاح التعلم بالنقل بـ 100–150 صورة فقط لكل نوع: فهي تُعاد استخدامها ولا تُتعلَّم من جديد.'),
    now: step => step >= 1 ? t('Frozen: they run on every photo, but their weights do not change.', 'مجمَّدة: تعمل على كل صورة، لكن أوزانها لا تتغير.') : null },
  { id: 'late', title: t('Top blocks: specific features', 'الكتل العليا: سمات خاصة'), areas: [[368, 90, 110, 152]],
    what: t('The last blocks combine features into whole parts: leaf shapes, petals, bark patterns.', 'تجمع الكتل الأخيرة السمات في أجزاء كاملة: أشكال الأوراق والبتلات وأنماط اللحاء.'),
    why: t('These are the most ImageNet-specific, so they are the ones worth adjusting gently in stage 2.', 'هذه هي الأكثر خصوصية بـ ImageNet، فهي التي تستحق التعديل بلطف في المرحلة 2.'),
    now: step => step >= 5 ? t('Unfrozen in stage 2, with a learning rate 100 times smaller.', 'مفكوكة في المرحلة 2، بمعدل تعلم أصغر 100 مرة.') : null },
  { id: 'head', title: t('The head', 'الرأس'), areas: [[520, 66, 222, 214]],
    what: t('One fully connected layer: for each species, a weight for every feature (1,280 in MobileNetV2) plus a bias.', 'طبقة واحدة متصلة بالكامل: لكل نوع وزن لكل سمة (1,280 في MobileNetV2) وانحياز.'),
    why: t('It is the only part that must be new, because ImageNet has no “Dhofar aloe” class. It is like the LoRA adapter: small, new and trained on your data.', 'إنه الجزء الوحيد الذي يجب أن يكون جديدًا، لأن ImageNet ليس فيها فئة “صبر ظفار”. وهو مثل مهايئ LoRA: صغير وجديد ومدرَّب على بياناتك.'),
    now: step => step < 2 ? t('Still the old ImageNet head with 1,000 outputs.', 'ما زال رأس ImageNet القديم بـ 1,000 مخرج.') : step < 4 ? t('New and random: every species gets about the same score.', 'جديد وعشوائي: كل نوع يحصل على الدرجة نفسها تقريبًا.') : null },
];

export function TransferScene() {
  const say = useTx();
  const player = usePlayer(TRANSFER_STEPS.length);
  const { step } = player;
  const probabilities = step < 2 ? null : step < 4 ? START : step < 6 ? LEARNING : FINAL;
  const frozen = (index: number) => step >= 1 && !(step >= 5 && index >= 3);
  const wall = step === 4 ? 494 : step === 5 ? 360 : null;
  return <Scene id="ft-scene-transfer" title={t('Transfer learning: fine-tuning a CNN on Dhofar plants', 'التعلم بالنقل: ضبط شبكة CNN على نباتات ظفار')}
    steps={TRANSFER_STEPS} player={player} figures={TRANSFER_FIGURES}>
    <svg viewBox="0 0 760 380" className={`ft-svg pc-transfer step-${step}`} role="img" aria-label={say(TRANSFER_STEPS[step].title)}>
      <Txt x={327} y={30} className="ft-label">{say(t('convolutional body (the backbone)', 'الجسم الالتفافي (العمود الفقري)'))}</Txt>
      <Txt x={631} y={30} className="ft-label">{say(step < 2 ? t('old head', 'الرأس القديم') : t('new head', 'الرأس الجديد'))}</Txt>
      <g className={show(step === 4 || step === 5)}>
        <rect className="pc-badge" x="20" y="58" width="120" height="30" rx="9"/>
        <text className="pc-badge-text" x="80" y="77" textAnchor="middle" direction="ltr">{step === 5 ? 'lr = 0.00001' : 'lr = 0.001'}</text>
      </g>

      {/* the photo */}
      <rect className="pc-photo" x="24" y="110" width="112" height="112" rx="10"/>
      <g transform="translate(30 116)"><PlantArt kind="boswellia"/></g>
      <Txt x={80} y={240} className="ft-tiny strong">{step >= 3 ? '224 × 224' : say(t('a photo', 'صورة'))}</Txt>
      <g className={show(step === 3)}>
        {['rotate(-18 50 50)', 'translate(100 0) scale(-1 1)', 'translate(50 50) scale(1.3) translate(-50 -40)'].map((variant, index) =>
          <g key={index} transform={`translate(${24 + index * 38} 256)`}>
            <rect className="pc-photo small" width="34" height="34" rx="5"/>
            <g transform="translate(2 2) scale(.3)"><g transform={variant} className={index === 2 ? 'pc-bright' : undefined}><PlantArt kind="boswellia"/></g></g>
          </g>)}
        <Txt x={80} y={308} className="ft-tiny">{say(t('augmented copies (training only)', 'نسخ مزيدة (للتدريب فقط)'))}</Txt>
        <text className="pc-formula" x="80" y="334" textAnchor="middle" direction="ltr">(pixel ÷ 255 − mean) ÷ std</text>
      </g>

      {/* the body */}
      <path className="ft-wire" d={P_FORWARD}/>
      {BLOCKS.map((height, index) => {
        const x = blockX(index);
        const y = 166 - height / 2;
        return <g key={index} className={cls('pc-block', frozen(index) ? 'frozen' : step >= 5 ? 'training' : '')}>
          <rect x={x} y={y} width="46" height={height} rx="8"/>
          <rect className="slab" x={x + 6} y={y + 6} width="34" height={height - 12} rx="5"/>
          <g transform={`translate(${x + 23} 166)`} className="pc-glyph">
            {index === 0 && <path d="M-10 8 L10 -8 M-10 -2 L4 -12 M-4 12 L12 0"/>}
            {index === 1 && [-8, 0, 8].flatMap(dx => [-8, 0, 8].map(dy => <circle key={`${dx}${dy}`} cx={dx} cy={dy} r="1.8"/>))}
            {index === 2 && <><circle r="9"/><path d="M-9 0 H9"/></>}
            {index === 3 && <path d="M0 -12 C10 -4 10 6 0 12 C-10 6 -10 -4 0 -12 Z M0 -12 V12"/>}
            {index === 4 && <g transform="translate(-14 -16) scale(.28)"><PlantArt kind="boswellia"/></g>}
          </g>
          {frozen(index) && <Lock x={x + 23} y={y + height - 16} size={0.9}/>}
          <Txt x={x + 23} y={290} className="ft-tiny">{say(BLOCK_NAMES[index])}</Txt>
        </g>;
      })}
      {(step === 0 || step >= 4) && [0, 1, 2].map(index => <circle key={index} className="ft-packet" r="5" style={packet(P_FORWARD, -index * 0.8)}/>)}

      {/* the head */}
      <rect className={cls('pc-head', step >= 2 && 'new', (step === 4 || step === 5) && 'learning')} x="520" y="66" width="222" height="214" rx="12"/>
      <g className={show(step < 2)}>
        {Array.from({ length: 34 }, (_, index) => <rect key={index} className="pc-oldbar" x="536" y={80 + index * 5.6} width={20 + ((index * 37) % 60)} height="3" rx="1.5"/>)}
        {OLD_CLASSES.map((name, index) => <Txt key={name.en} x={680} y={110 + index * 40} className="ft-tiny">{say(name)}</Txt>)}
        <Txt x={680} y={268} className="ft-tiny strong">{say(t('1,000 classes', '1,000 فئة'))}</Txt>
        <g className={show(step === 1)}><Txt x={631} y={302} className="ft-tiny warm">{say(t('this head will be removed', 'سيُزال هذا الرأس'))}</Txt></g>
      </g>
      {probabilities && <g>
        {SPECIES.map((species, index) => {
          const y = 84 + index * 32;
          const top = step === 6 && index < 3;
          return <g key={species.key} className={cls('pc-row', top && 'top')}>
            <Txt x={582} y={y + 12} className="ft-tiny strong">{say(species.name)}</Txt>
            <rect className="pc-track" x="636" y={y + 2} width="76" height="13" rx="4"/>
            <rect className="pc-bar" x="636" y={y + 2} width={Math.max(2, probabilities[index] * 76)} height="13" rx="4" style={{ fill: species.color } as CSSProperties}/>
            <text className="pc-value" x="738" y={y + 13} textAnchor="end">{Math.round(probabilities[index] * 100)}%</text>
          </g>;
        })}
        <g className={show(step === 6)}>
          <line className="pc-threshold" x1={636 + 0.7 * 76} x2={636 + 0.7 * 76} y1="78" y2="276"/>
          <Txt x={631} y={302} className="ft-tiny warm">{say(t('89% ≥ 70% threshold → “frankincense tree”', '89٪ ≥ عتبة 70٪ ← “شجرة اللبان”'))}</Txt>
        </g>
        <g className={show(step === 2 || step === 3)}><Txt x={631} y={302} className="ft-tiny warm">{say(t('random weights: no idea yet', 'أوزان عشوائية: لا يعرف شيئًا بعد'))}</Txt></g>
      </g>}

      {/* the gradient */}
      {wall !== null && <g className="pc-gradient">
        <path className="pc-grad-line" d={`M 700 318 L ${wall + 8} 318`} markerEnd="url(#pc-head)"/>
        <defs><marker id="pc-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" className="pc-grad-tip"/></marker></defs>
        {[0, 1].map(index => <circle key={index} className="ft-packet error" r="4.5" style={packet(`M 700 318 L ${wall + 8} 318`, -index * 1.1)}/>)}
        <line className="pc-wall" x1={wall} x2={wall} y1="300" y2="336"/>
        <Txt x={(700 + wall) / 2} y={344} className="ft-tiny warm">{say(step === 4 ? t('gradient → head only; stops at the frozen body', 'التدرّج ← الرأس فقط؛ ويتوقف عند الجسم المجمَّد') : t('gradient → head + top blocks; early stopping watches validation', 'التدرّج ← الرأس + الكتل العليا؛ والإيقاف المبكر يراقب التحقق'))}</Txt>
      </g>}
      <Hotspots/>
    </svg>
  </Scene>;
}

/** Fine-tuning a CNN beside fine-tuning a language model. */
export function TwoFineTunings() {
  const say = useTx();
  return <div className="pc-two">
    <Heading icon="layers" first>{say(t('Two kinds of fine-tuning, one idea', 'نوعان من الضبط الدقيق وفكرة واحدة'))}</Heading>
    <p className="pc-lead">{say(t('UTAS-70 fine-tunes two different models. Both keep what a big pre-trained model already knows, freeze most of it, and train a small new part on the project’s own data.',
      'يضبط مشروع UTAS-70 نموذجين مختلفين. وكلاهما يحتفظ بما يعرفه نموذج كبير مدرَّب مسبقًا، ويجمّد معظمه، ويدرّب جزءًا جديدًا صغيرًا على بيانات المشروع.'))}</p>
    <div className="pc-table" role="table">
      <div className="pc-row head" role="row">
        <span role="columnheader"/>
        <span role="columnheader" className="cnn"><Icon name="grid" size={13}/>{say(t('The CNN (sees the photo)', 'شبكة CNN (ترى الصورة)'))}</span>
        <span role="columnheader" className="llm"><Icon name="chip" size={13}/>{say(t('The language model (writes the answer)', 'النموذج اللغوي (يكتب الإجابة)'))}</span>
      </div>
      {TWO_TUNINGS.map(row => <div key={row.topic.en} className="pc-row" role="row">
        <span role="rowheader">{say(row.topic)}</span>
        <span role="cell">{say(row.cnn)}</span>
        <span role="cell">{say(row.llm)}</span>
      </div>)}
    </div>
    <p className="pc-note"><Icon name="bulb" size={13}/>{say(t('Same recipe: a general model + a frozen body + a small trained part + your labelled data. The new head of a CNN plays the role that the LoRA adapter plays in a language model.',
      'الوصفة نفسها: نموذج عام + جسم مجمَّد + جزء صغير مدرَّب + بياناتك الموسومة. والرأس الجديد في شبكة CNN يؤدي الدور الذي يؤديه مهايئ LoRA في النموذج اللغوي.'))}</p>
  </div>;
}

/** Choose a backbone and a number of species: how many numbers are really trained? */
export function BackboneCalculator() {
  const say = useTx();
  const [which, setWhich] = useState(0);
  const [classes, setClasses] = useState(6);
  const [all, setAll] = useState(false);
  const backbone = BACKBONES[which];
  const oldHead = backbone.features * 1000 + 1000;
  const body = backbone.total - oldHead;
  const head = backbone.features * classes + classes;
  const total = body + head;
  const trained = all ? total : head;
  const share = trained / total;
  return <div className="pc-backbone">
    <Heading icon="sliders">{say(t('Pick a backbone: how much do you actually train?', 'اختر العمود الفقري: كم تدرّب فعلًا؟'))}</Heading>
    <div className="ft-tabs" role="group" aria-label={say(t('Backbone', 'العمود الفقري'))}>
      {BACKBONES.map((item, index) => <button key={item.key} type="button" className={index === which ? 'current' : ''} aria-pressed={index === which}
        onClick={() => setWhich(index)}>{item.name}</button>)}
    </div>
    <div className="pc-controls">
      <label>{say(t('Species (classes)', 'الأنواع (الفئات)'))} <strong>{classes}</strong>
        <input type="range" min="2" max="30" value={classes} onChange={event => setClasses(Number(event.target.value))}/></label>
      <div className="ft-tabs" role="group" aria-label={say(t('What is trained', 'ما يُدرَّب'))}>
        <button type="button" className={!all ? 'current' : ''} aria-pressed={!all} onClick={() => setAll(false)}>{say(t('Stage 1: head only', 'المرحلة 1: الرأس فقط'))}</button>
        <button type="button" className={all ? 'current' : ''} aria-pressed={all} onClick={() => setAll(true)}>{say(t('Everything (from scratch-like)', 'كل شيء (كأنه من الصفر)'))}</button>
      </div>
    </div>
    <div className="pc-sum" data-testid="backbone-sum">
      <div><span>{say(t('Frozen body', 'الجسم المجمَّد'))}</span><b>{thousands(body)}</b></div>
      <div className="warm"><span>{say(t('New head', 'الرأس الجديد'))}</span><b dir="ltr">{thousands(backbone.features)} × {classes} + {classes} = {thousands(head)}</b></div>
      <div className="big"><span>{say(t('Trained numbers', 'الأرقام المدرَّبة'))}</span><b data-testid="backbone-share">{thousands(trained)} ({percent(share, share < 0.01 ? 2 : 1)})</b></div>
    </div>
    <div className="pc-share" aria-hidden="true"><i style={{ width: `${Math.max(0.6, share * 100)}%` }}/></div>
    <div className="pc-facts">
      <span><Icon name="file" size={12}/>{say(t('File', 'الملف'))} ≈ {(total * 4 / 1e6).toFixed(0)} MB</span>
      <span><Icon name="target" size={12}/>ImageNet top-1 {backbone.top1}%</span>
      <span><Icon name="bolt" size={12}/>{backbone.gflops} GFLOPs</span>
      <span>{say(backbone.note)}</span>
    </div>
    <p className="pc-note"><Icon name="bulb" size={13}/>{say(all
      ? t('Training everything throws away the advantage: millions of numbers to learn from a few hundred photos per species, which overfits quickly. That is why the project trains the head first and only then the top blocks, slowly.',
        'تدريب كل شيء يضيّع الميزة: ملايين الأرقام تُتعلَّم من بضع مئات من الصور لكل نوع، فيحدث فرط التخصيص سريعًا. ولهذا يدرّب المشروع الرأس أولًا، ثم الكتل العليا فقط ببطء.')
      : t('Compare with LoRA in part 5: there 1–2% of the numbers train. Here, with a frozen backbone, it is even less, which is why a free GPU and a few hundred photos per species are enough.',
        'قارن بـ LoRA في الجزء 5: هناك يتدرب 1–2٪ من الأرقام. وهنا مع عمود فقري مجمَّد يكون أقل من ذلك، ولهذا تكفي بطاقة GPU مجانية وبضع مئات من الصور لكل نوع.'))}</p>
  </div>;
}

const PIXEL = [86, 140, 62];

/** Resize, normalize and augment one training photo. */
export function PhotoPrep() {
  const say = useTx();
  const [turn, setTurn] = useState(0);
  const [flip, setFlip] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [light, setLight] = useState(1);
  const [seed, setSeed] = useState(0);
  const batch = useMemo(() => Array.from({ length: 6 }, (_, index) => {
    const random = (offset: number) => (Math.sin((seed + 1) * 97 + index * 13 + offset) + 1) / 2;
    return { turn: Math.round(random(1) * 50 - 25), flip: random(2) > 0.5, zoom: 1 + random(3) * 0.35, light: 0.7 + random(4) * 0.6 };
  }), [seed]);
  const transform = (value: { turn: number; flip: boolean; zoom: number }) =>
    `translate(50 50) rotate(${value.turn}) scale(${(value.flip ? -1 : 1) * value.zoom} ${value.zoom}) translate(-50 -50)`;
  return <div className="pc-prep">
    <Heading icon="sliders">{say(t('Prepare a photo: resize, normalize, augment', 'جهّز صورة: الحجم والتوحيد والزيادة'))}</Heading>
    <div className="pc-prep-grid">
      <div className="pc-prep-photo">
        <svg viewBox="0 0 100 100" className="pc-frame" role="img" aria-label={say(t('Augmented training photo', 'صورة تدريب مزيدة'))}>
          <rect width="100" height="100" className="pc-sky"/>
          <g style={{ filter: `brightness(${light})` }}><g transform={transform({ turn, flip, zoom })}><PlantArt kind="adenium"/></g></g>
        </svg>
        <small dir="ltr">224 × 224 × 3</small>
      </div>
      <div className="pc-prep-controls">
        <label>{say(t('Rotate', 'تدوير'))} <b dir="ltr">{turn}°</b><input type="range" min="-30" max="30" value={turn} onChange={event => setTurn(Number(event.target.value))}/></label>
        <label>{say(t('Zoom', 'تكبير'))} <b dir="ltr">×{zoom.toFixed(2)}</b><input type="range" min="1" max="1.4" step="0.05" value={zoom} onChange={event => setZoom(Number(event.target.value))}/></label>
        <label>{say(t('Brightness', 'الإضاءة'))} <b dir="ltr">×{light.toFixed(2)}</b><input type="range" min="0.6" max="1.4" step="0.05" value={light} onChange={event => setLight(Number(event.target.value))}/></label>
        <label className="pc-check"><input type="checkbox" checked={flip} onChange={event => setFlip(event.target.checked)}/>{say(t('Flip left–right', 'قلب أفقي'))}</label>
      </div>
      <div className="pc-normal">
        <b>{say(t('Normalize one leaf pixel', 'وحّد قيمة بكسل واحد من ورقة'))}</b>
        <table>
          <thead><tr><th/><th>R</th><th>G</th><th>B</th></tr></thead>
          <tbody>
            <tr><th>{say(t('pixel', 'البكسل'))}</th>{PIXEL.map((value, index) => <td key={index}>{value}</td>)}</tr>
            <tr><th>÷ 255</th>{PIXEL.map((value, index) => <td key={index}>{(value / 255).toFixed(3)}</td>)}</tr>
            <tr><th>− mean</th>{IMAGENET_MEAN.map((value, index) => <td key={index}>{value}</td>)}</tr>
            <tr><th>÷ std</th>{IMAGENET_STD.map((value, index) => <td key={index}>{value}</td>)}</tr>
            <tr className="result"><th>=</th>{PIXEL.map((value, index) => <td key={index}>{((value / 255 - IMAGENET_MEAN[index]) / IMAGENET_STD[index]).toFixed(2)}</td>)}</tr>
          </tbody>
        </table>
      </div>
    </div>
    <div className="pc-batch">
      <button type="button" className="button small" onClick={() => setSeed(value => value + 1)}><Icon name="dice" size={13}/>{say(t('New random batch', 'دفعة عشوائية جديدة'))}</button>
      <div className="pc-batch-row" data-testid="augment-batch">
        {batch.map((value, index) => <svg key={`${seed}-${index}`} viewBox="0 0 100 100" className="pc-frame small" aria-hidden="true">
          <rect width="100" height="100" className="pc-sky"/>
          <g style={{ filter: `brightness(${value.light})` }}><g transform={transform(value)}><PlantArt kind="adenium"/></g></g>
        </svg>)}
      </div>
    </div>
    <p className="pc-note"><Icon name="bulb" size={13}/>{say(t('Every epoch sees a slightly different version of each photo, so the model learns the plant, not one picture of it. Only the training set is augmented: validation and test photos stay real, or the score would describe made-up photos.',
      'كل حقبة ترى نسخة مختلفة قليلًا من كل صورة، فيتعلم النموذج النبات لا صورة واحدة له. ولا تُزاد إلا مجموعة التدريب: صور التحقق والاختبار تبقى حقيقية، وإلا وصفت الدرجة صورًا مصطنعة.'))}</p>
  </div>;
}

// six trees, four photos each
const TREES = ['A', 'B', 'C', 'D', 'E', 'F'];
const RANDOM_SPLIT = 'TTVT TTTS TSTT VTTT TTST STVT'.replace(/ /g, '');
const GROUP_SPLIT = 'TTTT TTTT TTTT TTTT VVVV SSSS'.replace(/ /g, '');
const SPLIT_NAME: Record<string, Text> = { T: t('train', 'تدريب'), V: t('validation', 'تحقق'), S: t('test', 'اختبار') };

/** Why photos of the same tree must stay in one split. */
export function GroupSplit() {
  const say = useTx();
  const [mode, setMode] = useState<'random' | 'group'>('random');
  const split = mode === 'random' ? RANDOM_SPLIT : GROUP_SPLIT;
  const leaking = TREES.filter((_, tree) => {
    const sets = new Set(split.slice(tree * 4, tree * 4 + 4));
    return sets.has('S') && sets.has('T');
  });
  return <div className="pc-split">
    <Heading icon="grid">{say(t('Split by tree, not by photo', 'قسّم حسب الشجرة لا حسب الصورة'))}</Heading>
    <div className="ft-tabs" role="group" aria-label={say(t('How to split', 'طريقة التقسيم'))}>
      <button type="button" className={mode === 'random' ? 'current' : ''} aria-pressed={mode === 'random'} onClick={() => setMode('random')}>{say(t('Random photos (wrong)', 'صور عشوائية (خطأ)'))}</button>
      <button type="button" className={mode === 'group' ? 'current' : ''} aria-pressed={mode === 'group'} onClick={() => setMode('group')}>{say(t('By tree / observation (right)', 'حسب الشجرة / المشاهدة (صحيح)'))}</button>
    </div>
    <div className="pc-trees">
      {TREES.map((tree, index) => <div key={tree} className={cls('pc-tree', leaking.includes(tree) && 'leak')}>
        <b>{say(t(`Tree ${tree}`, `الشجرة ${tree}`))}</b>
        <div>{[0, 1, 2, 3].map(photo => {
          const set = split[index * 4 + photo];
          return <span key={photo} className={cls('pc-shot', set)} title={say(SPLIT_NAME[set])}>
            <svg viewBox="0 0 100 100" aria-hidden="true"><g transform={`translate(${photo * 4} ${photo * 2}) scale(.92)`}><PlantArt kind={index % 2 ? 'commiphora' : 'boswellia'}/></g></svg>
            <i>{say(SPLIT_NAME[set])}</i>
          </span>;
        })}</div>
      </div>)}
    </div>
    <div className={cls('pc-verdict', mode)} data-testid="split-verdict">
      <strong>{say(mode === 'random'
        ? t(`${leaking.length} trees have photos in both training and test`, `${leaking.length} أشجار لها صور في التدريب والاختبار معًا`)
        : t('No tree is in both training and test', 'لا توجد شجرة في التدريب والاختبار معًا'))}</strong>
      <span>{say(mode === 'random'
        ? t('Test accuracy looks like 97%, but the model has already seen these trees from almost the same angle. It measures memory.',
          'تبدو دقة الاختبار 97٪، لكن النموذج رأى هذه الأشجار من زاوية شبه مطابقة. فهي تقيس الحفظ.')
        : t('Test accuracy may drop to about 86%, but that is an honest number for trees the model has never seen.',
          'قد تنخفض دقة الاختبار إلى نحو 86٪، لكنها رقم أمين لأشجار لم يرها النموذج قط.'))}</span>
    </div>
    <p className="pc-note"><Icon name="bulb" size={13}/>{say(t('The same rule as splitting JSONL by source or story family in part 3: anything nearly identical must stay on one side. (The scores here are illustrations.)',
      'إنها القاعدة نفسها لتقسيم JSONL حسب المصدر أو عائلة القصة في الجزء 3: كل ما هو شبه متطابق يبقى في جهة واحدة. (الدرجات هنا للتوضيح.)'))}</p>
  </div>;
}

/** A confusion matrix: click a species to read its precision, recall and F1. */
export function ConfusionMatrix() {
  const say = useTx();
  const [pick, setPick] = useState(1);
  const size = MATRIX.length;
  const rows = MATRIX.map(row => row.reduce((a, b) => a + b, 0));
  const columns = MATRIX[0].map((_, column) => MATRIX.reduce((sum, row) => sum + row[column], 0));
  const all = rows.reduce((a, b) => a + b, 0);
  const right = MATRIX.reduce((sum, row, index) => sum + row[index], 0);
  const scores = MATRIX.map((row, index) => {
    const precision = row[index] / columns[index];
    const recall = row[index] / rows[index];
    return { precision, recall, f1: 2 * precision * recall / (precision + recall) };
  });
  const macro = scores.reduce((sum, score) => sum + score.f1, 0) / size;
  const chosen = scores[pick];
  const name = (index: number) => say(bySpecies[MATRIX_SPECIES[index]].name);
  return <div className="pc-confusion">
    <Heading icon="chart">{say(t('Read a confusion matrix', 'اقرأ مصفوفة الالتباس'))}</Heading>
    <p className="pc-lead">{say(t('Rows are the real species, columns what the model said. The diagonal is right; everything else is a mistake, and it tells you which mistake. (Illustrative test of 120 photos.)',
      'الصفوف هي الأنواع الحقيقية، والأعمدة ما قاله النموذج. القطر صحيح، وكل ما عداه خطأ، ويخبرك بنوع الخطأ. (اختبار توضيحي لـ 120 صورة.)'))}</p>
    <div className="pc-matrix-wrap">
      <div className="pc-matrix" style={{ gridTemplateColumns: `minmax(90px, auto) repeat(${size}, minmax(46px, 1fr))` } as CSSProperties}>
        <span className="corner">{say(t('real ↓ / said →', 'الحقيقي ↓ / قال ←'))}</span>
        {MATRIX_SPECIES.map((_, index) => <button key={index} type="button" className={cls('label col', index === pick && 'on')} onClick={() => setPick(index)}>{name(index)}</button>)}
        {MATRIX.map((row, rowIndex) => [
          <button key={`r${rowIndex}`} type="button" className={cls('label', rowIndex === pick && 'on')} onClick={() => setPick(rowIndex)}>{name(rowIndex)}</button>,
          ...row.map((value, column) => <span key={`${rowIndex}-${column}`}
            className={cls('cell', rowIndex === column ? 'right' : value ? 'wrong' : 'zero', (rowIndex === pick || column === pick) && 'lit', rowIndex === pick && column === pick && 'hit')}
            style={{ '--level': value / 30 } as CSSProperties}>{value}</span>),
        ])}
      </div>
      <div className="pc-scores" data-testid="matrix-scores">
        <b>{name(pick)}</b>
        <div><span>{say(t('Precision', 'الضبط (Precision)'))}</span><strong>{percent(chosen.precision)}</strong>
          <small>{say(t(`of the ${columns[pick]} photos it called “${bySpecies[MATRIX_SPECIES[pick]].name.en}”, ${MATRIX[pick][pick]} really were`, `من ${columns[pick]} صورة سمّاها “${bySpecies[MATRIX_SPECIES[pick]].name.ar}”، كانت ${MATRIX[pick][pick]} صحيحة`))}</small></div>
        <div><span>{say(t('Recall', 'الاستدعاء (Recall)'))}</span><strong>{percent(chosen.recall)}</strong>
          <small>{say(t(`of the ${rows[pick]} real ones, it found ${MATRIX[pick][pick]}`, `من ${rows[pick]} صورة حقيقية، وجد ${MATRIX[pick][pick]}`))}</small></div>
        <div><span>F1</span><strong>{percent(chosen.f1)}</strong><small>{say(t('the balance of the two', 'التوازن بين الاثنين'))}</small></div>
        <hr/>
        <div><span>{say(t('Accuracy (all)', 'الدقة الكلية'))}</span><strong>{percent(right / all)}</strong></div>
        <div><span>{say(t('Macro F1 (mean of species)', 'F1 الكلي (متوسط الأنواع)'))}</span><strong>{percent(macro)}</strong></div>
      </div>
    </div>
    <p className="pc-note"><Icon name="bulb" size={13}/>{say(t('The biggest mistake is myrrh called frankincense: both are Burseraceae with similar bark. The fix is data, not settings: more photos of the parts that differ (leaves, flowers, fruit). Macro F1 gives each species the same weight, so a rare species cannot hide behind a common one.',
      'أكبر خطأ هو تسمية المُرّ لبانًا: كلاهما من الفصيلة البخورية ولحاؤهما متشابه. والعلاج في البيانات لا في الإعدادات: صور أكثر للأجزاء المختلفة (الأوراق والأزهار والثمار). و F1 الكلي يعطي كل نوع الوزن نفسه، فلا يختبئ نوع نادر خلف نوع شائع.'))}</p>
  </div>;
}

/** Move the confidence threshold and watch what is answered and what is refused. */
export function ThresholdTool() {
  const say = useTx();
  const [threshold, setThreshold] = useState(0.7);
  const results = PREDICTIONS.map(item => {
    const accepted = item.confidence >= threshold;
    const right = item.truth === item.guess;
    const kind = accepted ? (right ? 'good' : 'bad') : (right ? 'lost' : 'saved');
    return { ...item, kind };
  });
  const count = (kind: string) => results.filter(item => item.kind === kind).length;
  const unknown = PREDICTIONS.filter(item => item.truth === null).length;
  const rejectedUnknown = results.filter(item => item.truth === null && item.kind === 'saved').length;
  return <div className="pc-threshold">
    <Heading icon="gauge">{say(t('Set the confidence threshold', 'اضبط عتبة الثقة'))}</Heading>
    <label className="pc-slider">{say(t('Answer only when confidence ≥', 'أجب فقط حين تكون الثقة ≥'))} <b data-testid="threshold-value">{Math.round(threshold * 100)}%</b>
      <input type="range" min="0.3" max="0.95" step="0.05" value={threshold} onChange={event => setThreshold(Number(event.target.value))}/></label>
    <div className="pc-preds">
      {results.map(item => <div key={item.id} className={cls('pc-pred', item.kind)}>
        <svg viewBox="0 0 100 100" aria-hidden="true"><PlantArt kind={item.truth ?? 'unknown'}/></svg>
        <span>{item.truth ? say(bySpecies[item.truth].name) : say(t('unknown plant', 'نبات مجهول'))}</span>
        <small>{say(t('said', 'قال'))}: {say(bySpecies[item.guess].name)} · {Math.round(item.confidence * 100)}%</small>
      </div>)}
    </div>
    <div className="pc-counts" data-testid="threshold-counts">
      <span className="good"><b>{count('good')}</b>{say(t('right answers shown', 'إجابات صحيحة معروضة'))}</span>
      <span className="bad"><b>{count('bad')}</b>{say(t('wrong answers shown', 'إجابات خاطئة معروضة'))}</span>
      <span className="lost"><b>{count('lost')}</b>{say(t('good photos refused', 'صور جيدة مرفوضة'))}</span>
      <span className="saved"><b>{rejectedUnknown}/{unknown}</b>{say(t('unknown plants rejected', 'نباتات مجهولة مرفوضة'))}</span>
    </div>
    <p className="pc-note"><Icon name="bulb" size={13}/>{say(t('Raising the threshold removes wrong answers but refuses more good photos. Look at the unknown plant at 83%: softmax must choose one of the known species, so a confident answer can still be about a plant the model has never seen. Choose the threshold on validation data and check it on an out-of-scope set.',
      'رفع العتبة يزيل الإجابات الخاطئة لكنه يرفض صورًا جيدة أكثر. وانظر إلى النبات المجهول عند 83٪: يجب أن تختار softmax أحد الأنواع المعروفة، فقد تكون الإجابة الواثقة عن نبات لم يره النموذج قط. اختر العتبة على بيانات التحقق، وافحصها على مجموعة خارج النطاق.'))}</p>
  </div>;
}

// ===================================================== part 14 · the UTAS-70 project

const FLOW_STEPS = [
  { title: t('A photo and a question', 'صورة وسؤال'),
    text: t('A hiker in Dhofar uploads a photo of a tree and asks: “What is this plant used for?” The interface sends both to the application layer.',
      'يرفع متنزه في ظفار صورة شجرة ويسأل: “فيمَ يُستخدم هذا النبات؟” فترسل الواجهة الاثنين إلى طبقة التطبيق.') },
  { title: t('The CNN classifier predicts', 'مصنِّف CNN يتنبأ'),
    text: t('The fine-tuned CNN returns the top three species with their confidence: frankincense tree 89%, myrrh 7%, desert rose 2%.',
      'تعيد شبكة CNN المضبوطة أعلى ثلاثة أنواع مع ثقتها: شجرة اللبان 89٪، والمُرّ 7٪، ووردة الصحراء 2٪.') },
  { title: t('Is the confidence high enough?', 'هل الثقة كافية؟'),
    text: t('89% is above the 70% threshold, so the system continues. Below it, the honest reply would be: “I could not recognize this plant. Please send a clearer photo.”',
      '89٪ أعلى من عتبة 70٪، فيتابع النظام. ولو كانت دونها لكان الرد الأمين: “لم أتعرف على هذا النبات. أرسل صورة أوضح من فضلك.”') },
  { title: t('The species name finds its record', 'اسم النوع يجد سجله'),
    text: t('The label “Boswellia sacra” is also the key of the knowledge base, so it finds the frankincense record directly: family, names, description, habitat, uses, each with its source and page.',
      'التسمية “Boswellia sacra” هي أيضًا مفتاح قاعدة المعرفة، فتجد سجل اللبان مباشرة: الفصيلة والأسماء والوصف والموطن والاستخدامات، وكلٌّ مع مصدره وصفحته.') },
  { title: t('The prompt is built', 'يُبنى التلقين'),
    text: t('The application puts together the record, the user’s question and the answer rules: answer only from the record, say when something is not in the sources, reply in the user’s language, add the safety notice.',
      'يجمع التطبيق السجل وسؤال المستخدم وقواعد الإجابة: أجب من السجل فقط، وقل حين لا يوجد شيء في المصادر، وأجب بلغة المستخدم، وأضف تنبيه السلامة.') },
  { title: t('The fine-tuned model writes the answer', 'النموذج المضبوط يكتب الإجابة'),
    text: t('Qwen3.8-27B, stored in 4-bit with its UTAS-70 LoRA adapter, reads the prompt and writes the answer in the style it learned from the JSONL examples.',
      'يقرأ Qwen3.8-27B، المخزَّن بدقة 4 بت مع مهايئ UTAS-70 من نوع LoRA، التلقينَ ويكتب الإجابة بالأسلوب الذي تعلّمه من أمثلة JSONL.') },
  { title: t('The answer, its source, and memory', 'الإجابة ومصدرها والذاكرة'),
    text: t('The interface shows the species, the answer, its source and the “education only” notice. The species is remembered, so a follow-up such as “When does it flower?” refers to the same tree; if the record has no season, the model says so.',
      'تعرض الواجهة النوع والإجابة ومصدرها وتنبيه “للتعليم فقط”. ويُتذكَّر النوع، فيشير سؤال متابعة مثل “متى يُزهر؟” إلى الشجرة نفسها؛ وإذا خلا السجل من الموسم قال النموذج ذلك.') },
];

const FLOW_FIGURES: Figure[] = [
  { id: 'cnn', title: t('CNN classifier', 'مصنِّف CNN'), areas: [[170, 44, 120, 60]],
    what: t('The vision model from part 13: a fine-tuned MobileNetV2, EfficientNet-B0 or ResNet50, whichever won the comparison.', 'نموذج الرؤية من الجزء 13: MobileNetV2 أو EfficientNet-B0 أو ResNet50 المضبوط، أيها فاز في المقارنة.'),
    why: t('It turns a photo into a species name, which is the key to everything else.', 'يحوّل الصورة إلى اسم نوع، وهو مفتاح كل ما بعده.') },
  { id: 'gate', title: t('Confidence threshold', 'عتبة الثقة'), areas: [[330, 44, 80, 60]],
    what: t('A check: is the best guess’s probability at least the threshold chosen on validation data?', 'فحص: هل احتمال أفضل تخمين لا يقل عن العتبة المختارة على بيانات التحقق؟'),
    why: t('It stops the chatbot from talking confidently about the wrong plant.', 'يمنع روبوت المحادثة من الحديث بثقة عن النبات الخطأ.') },
  { id: 'kb', title: t('Knowledge base', 'قاعدة المعرفة'), areas: [[630, 150, 100, 70]],
    what: t('One JSON record per species, every fact with its source and page, written from the digitized books.', 'سجل JSON لكل نوع، وكل حقيقة مع مصدرها وصفحتها، مكتوب من الكتب المرقمنة.'),
    why: t('Used twice: to write the training JSONL, and as context at answer time. That second use is retrieval by name, so the system is a fine-tuning + retrieval hybrid.', 'يُستخدم مرتين: لكتابة JSONL التدريب، وسياقًا وقت الإجابة. والاستخدام الثاني استرجاع بالاسم، فالنظام هجين من الضبط الدقيق والاسترجاع.') },
  { id: 'prompt', title: t('Prompt builder', 'باني التلقين'), areas: [[330, 236, 190, 96]],
    what: t('Joins the record, the question and fixed answer rules into one prompt.', 'يجمع السجل والسؤال وقواعد إجابة ثابتة في تلقين واحد.'),
    why: t('The model can only be faithful to what it is given; the rules make “not in the sources” an allowed answer.', 'لا يستطيع النموذج أن يكون أمينًا إلا لما يُعطى له، والقواعد تجعل “غير موجود في المصادر” إجابة مسموحة.') },
  { id: 'llm', title: t('Fine-tuned UTAS-70 model', 'نموذج UTAS-70 المضبوط'), areas: [[170, 236, 110, 96]],
    what: t('Qwen3.8-27B in 4-bit (frozen) with the UTAS-70 LoRA adapter, trained with QLoRA in Unsloth.', 'Qwen3.8-27B بدقة 4 بت (مجمَّد) مع مهايئ UTAS-70 من نوع LoRA، مدرَّب بـ QLoRA في Unsloth.'),
    why: t('Fine-tuning gives the bilingual, botanical way of answering; the record gives the facts.', 'الضبط الدقيق يعطي طريقة الإجابة النباتية ثنائية اللغة، والسجل يعطي الحقائق.') },
];

const P_PHOTO = 'M 134 74 L 170 74';
const P_CNN = 'M 290 74 L 330 74';
const P_GATE = 'M 410 74 L 446 74';
const P_KB = 'M 586 74 C 650 74 680 100 680 150';
const P_RECORD = 'M 630 286 L 520 286';
const P_QUESTION = 'M 80 172 C 90 350 280 360 330 312';
const P_MODEL = 'M 330 286 L 282 286';
const P_ANSWER = 'M 226 236 C 226 214 250 206 270 204';

export function PhotoToAnswerScene() {
  const say = useTx();
  const { isArabic } = useI18n();
  const player = usePlayer(FLOW_STEPS.length);
  const { step } = player;
  const lit = (from: number, to = from) => step >= from && step <= to;
  return <Scene id="ft-scene-utas" title={t('UTAS-70: from a plant photo to a sourced answer', 'UTAS-70: من صورة نبات إلى إجابة موثقة المصدر')}
    steps={FLOW_STEPS} player={player} figures={FLOW_FIGURES}>
    <svg viewBox="0 0 760 380" className={`ft-svg pc-flow step-${step}`} role="img" aria-label={say(FLOW_STEPS[step].title)}>
      {/* user and photo */}
      <g className={cls('pc-user', (step === 0 || step === 6) && 'active')}>
        <circle cx="34" cy="50" r="12"/><rect x="18" y="64" width="32" height="30" rx="12"/>
      </g>
      <rect className="pc-photo" x="64" y="40" width="68" height="68" rx="8"/>
      <g transform="translate(66 42) scale(.64)"><PlantArt kind="boswellia"/></g>
      <rect className="pc-bubble" x="12" y="124" width="134" height="44" rx="10"/>
      <Txt x={79} y={142} className="pc-bubble-text">{say(t('What is this plant', 'فيمَ يُستخدم'))}</Txt>
      <Txt x={79} y={157} className="pc-bubble-text">{say(t('used for?', 'هذا النبات؟'))}</Txt>

      {/* classifier */}
      <path className={cls('rg-path', lit(0, 1) && 'on')} d={P_PHOTO}/>
      {step <= 1 && <rect className="ft-doc" x="-5" y="-6" width="10" height="12" rx="2" style={packet(P_PHOTO, 0, { animationDuration: '1.2s' })}/>}
      <g className={cls('pc-box', lit(1) && 'active')}>
        <rect x="170" y="44" width="120" height="60" rx="12"/>
        {[0, 1, 2, 3].map(index => <rect key={index} className="pc-mini" x={184 + index * 14} y={58 + index * 3} width="10" height={32 - index * 6} rx="2"/>)}
        <Txt x={258} y={70} className="pc-box-text">CNN</Txt>
        <Txt x={258} y={86} className="ft-tiny">{say(t('classifier', 'مصنِّف'))}</Txt>
      </g>
      <g className={show(step === 1)}>
        {[[t('frankincense', 'اللبان'), 0.89], [t('myrrh', 'المُرّ'), 0.07], [t('desert rose', 'وردة الصحراء'), 0.02]].map(([name, value], index) =>
          <g key={index}>
            <Txt x={206} y={128 + index * 18} className="ft-tiny strong">{say(name as Text)}</Txt>
            <rect className="pc-track" x="246" y={119 + index * 18} width="60" height="11" rx="3"/>
            <rect className="pc-bar hot" x="246" y={119 + index * 18} width={Math.max(2, (value as number) * 60)} height="11" rx="3"/>
            <text className="pc-value" x="332" y={128 + index * 18} textAnchor="end">{Math.round((value as number) * 100)}%</text>
          </g>)}
      </g>

      {/* threshold */}
      <path className={cls('rg-path', lit(2) && 'on')} d={P_CNN}/>
      <g className={cls('pc-gate', lit(2) && 'active')}>
        <path d="M 370 44 L 410 74 L 370 104 L 330 74 Z"/>
        <text x="370" y="78" textAnchor="middle" className="pc-gate-text" direction="ltr">≥ 70%?</text>
      </g>
      <g className={show(step === 2)}>
        <path className="rg-path dim" d="M 370 104 L 370 128"/>
        <rect className="pc-reject" x="300" y="128" width="140" height="34" rx="8"/>
        <Txt x={370} y={143} className="ft-tiny">{say(t('No → “not recognized,', 'لا ← “لم يُتعرَّف عليه،'))}</Txt>
        <Txt x={370} y={156} className="ft-tiny">{say(t('send a clearer photo”', 'أرسل صورة أوضح”'))}</Txt>
        <Txt x={428} y={64} className="ft-tiny strong good">{say(t('yes', 'نعم'))}</Txt>
      </g>

      {/* species card */}
      <path className={cls('rg-path', lit(2, 3) && 'on')} d={P_GATE}/>
      <g className={cls('pc-species', show(step >= 2))}>
        <rect x="446" y="44" width="140" height="60" rx="10"/>
        <text x="516" y="68" textAnchor="middle" className="pc-latin">Boswellia sacra</text>
        <Txt x={516} y={88} className="ft-tiny strong">{say(t('frankincense tree · 89%', 'شجرة اللبان · 89٪'))}</Txt>
      </g>

      {/* knowledge base and the record */}
      <path className={cls('rg-path', show(step >= 3), step === 3 && 'on')} d={P_KB}/>
      {step === 3 && <circle className="ft-packet hot" r="5" style={packet(P_KB, 0, { animationDuration: '1.4s' })}/>}
      <g className={cls('pc-kb', (step === 3) && 'active')}>
        <path className="body" d="M 640 166 V 206 A 40 10 0 0 0 720 206 V 166"/>
        <ellipse className="top" cx="680" cy="166" rx="40" ry="10"/>
        {[180, 192].map(y => <path key={y} className="line" d={`M 652 ${y} H 708`}/>)}
        <Txt x={680} y={234} className="ft-tiny strong">{say(t('knowledge base (JSON)', 'قاعدة المعرفة (JSON)'))}</Txt>
      </g>
      <g className={cls('pc-record', show(step >= 3))}>
        <rect x="560" y="244" width="190" height="96" rx="10"/>
        <text x="572" y="262" className="pc-record-key">Boswellia sacra</text>
        {[t('family: Burseraceae', 'الفصيلة: Burseraceae'), t('uses: resin, incense…', 'الاستخدامات: راتنج، بخور…'), t('season: — (not in sources)', 'الموسم: — (غير موجود)'), t('source: Source A, p. __', 'المصدر: المصدر A، ص __')].map((line, index) =>
          <Txt key={line.en} x={isArabic ? 738 : 572} y={280 + index * 15} anchor={isArabic ? 'end' : 'start'} className={cls('pc-record-line', index === 3 && 'cite')}>{say(line)}</Txt>)}
      </g>

      {/* prompt builder and question */}
      <path className={cls('rg-path', show(step >= 4), step === 4 && 'on')} d={P_RECORD}/>
      <path className={cls('rg-path', show(step >= 4), step === 4 && 'on')} d={P_QUESTION}/>
      {step === 4 && <>
        <rect className="ft-doc" x="-5" y="-6" width="10" height="12" rx="2" style={packet(P_RECORD, 0, { animationDuration: '1.4s' })}/>
        <circle className="ft-packet" r="5" style={packet(P_QUESTION, 0, { animationDuration: '1.8s' })}/>
      </>}
      <g className={cls('pc-box prompt', show(step >= 4), step === 4 && 'active')}>
        <rect x="330" y="236" width="190" height="96" rx="12"/>
        <Txt x={425} y={256} className="pc-box-text">{say(t('prompt', 'التلقين'))}</Txt>
        {[t('+ the species record', '+ سجل النوع'), t('+ the question', '+ السؤال'), t('+ rules: only the record,', '+ القواعد: من السجل فقط،'), t('say “not in the sources”', 'وقل “غير موجود في المصادر”')].map((line, index) =>
          <Txt key={line.en} x={425} y={276 + index * 14} className="ft-tiny">{say(line)}</Txt>)}
      </g>

      {/* the fine-tuned model */}
      <path className={cls('rg-path', show(step >= 5), step === 5 && 'on')} d={P_MODEL}/>
      {step === 5 && <rect className="ft-doc" x="-5" y="-6" width="10" height="12" rx="2" style={packet(P_MODEL, 0, { animationDuration: '1s' })}/>}
      <g className={cls('rg-robot', show(step >= 5), step >= 5 && 'active', step === 6 && 'speaking')}>
        <rect className="body" x="176" y="244" width="86" height="72" rx="16"/>
        <rect className="screen" x="188" y="256" width="62" height="34" rx="9"/>
        <path className="eye" d="M200 274 q 5 -6 10 0 M226 274 q 5 -6 10 0 M210 282 q 9 6 18 0"/>
        <Lock x={250} y={308} size={0.8}/>
        <rect className="adapter" x="266" y="256" width="12" height="44" rx="4"/>
      </g>
      <g className={show(step >= 5)}><Txt x={226} y={336} className="ft-tiny strong">{say(t('Qwen 4-bit + LoRA', 'Qwen بدقة 4 بت + LoRA'))}</Txt></g>

      {/* the answer */}
      <path className={cls('rg-path answer', show(step === 6), step === 6 && 'on')} d={P_ANSWER}/>
      <g className={show(step === 6)}>
        <rect className="rg-answer" x="160" y="118" width="400" height="86" rx="12"/>
        <Txt x={isArabic ? 548 : 172} y={138} anchor={isArabic ? 'end' : 'start'} className="rg-answer-text">{say(t('This is the frankincense tree (Boswellia sacra).', 'هذه شجرة اللبان (Boswellia sacra).'))}</Txt>
        <Txt x={isArabic ? 548 : 172} y={154} anchor={isArabic ? 'end' : 'start'} className="rg-answer-text muted">{say(t('Its resin is burned as incense and used in', 'يُحرق راتنجها بخورًا ويُستخدم في'))}</Txt>
        <Txt x={isArabic ? 548 : 172} y={168} anchor={isArabic ? 'end' : 'start'} className="rg-answer-text muted">{say(t('traditional practices.', 'الممارسات التقليدية.'))}</Txt>
        <Txt x={isArabic ? 548 : 172} y={184} anchor={isArabic ? 'end' : 'start'} className="rg-answer-cite">{say(t('(Source A, p. __) · for education only, not medical advice', '(المصدر A، ص __) · للتعليم فقط، وليست نصيحة طبية'))}</Txt>
      </g>
      <Hotspots/>
    </svg>
  </Scene>;
}

const GAP_DIMENSIONS = [t('Images', 'الصور'), t('Chatbot', 'محادثة'), t('Fine-tuning', 'ضبط دقيق'), t('Local flora', 'نباتات محلية'), t('Arabic', 'العربية'), t('Knowledge base', 'قاعدة معرفة')];
const GAP: { study: Text; marks: string }[] = [
  { study: t('EnviScan+ (houseplants, CNN + chatbot)', 'EnviScan+ (نباتات منزلية، CNN + محادثة)'), marks: 'YYNNYP' },
  { study: t('RAG and fine-tuning practices', 'ممارسات RAG والضبط الدقيق'), marks: 'NYYNNY' },
  { study: t('Domain-specific LLMs (finance)', 'نماذج لغوية متخصصة (المالية)'), marks: 'NYYNNN' },
  { study: t('Chilean native flora (CNNs)', 'النباتات المحلية في تشيلي (CNN)'), marks: 'YNNYNN' },
  { study: t('Knowledge injection survey', 'مسح حقن المعرفة'), marks: 'NYYNNY' },
  { study: t('Making floras computable', 'جعل كتب النباتات قابلة للحوسبة'), marks: 'NYNYNY' },
  { study: t('UTAS-70', 'UTAS-70'), marks: 'YYYYYY' },
];

/** The problem, the research questions with their tests, and the gap in the literature. */
export function ProjectBrief() {
  const say = useTx();
  const [open, setOpen] = useState(0);
  const question = QUESTIONS[open];
  return <div className="pc-brief">
    <Heading icon="target" first>{say(t('The project on one page', 'المشروع في صفحة واحدة'))}</Heading>
    <div className="pc-brief-cards">
      <article><b><Icon name="help" size={13}/>{say(t('Problem', 'المشكلة'))}</b><p>{say(PROJECT.problem)}</p></article>
      <article><b><Icon name="bulb" size={13}/>{say(t('Idea', 'الفكرة'))}</b><p>{say(PROJECT.idea)}</p></article>
      <article><b><Icon name="flask" size={13}/>{say(t('Scope', 'النطاق'))}</b><p>{say(PROJECT.scope)}</p></article>
    </div>
    <h5 className="pc-h5">{say(t('Every research question has a hypothesis and a test', 'لكل سؤال بحثي فرضية واختبار'))}</h5>
    <div className="ft-tabs" role="tablist" aria-label={say(t('Research questions', 'أسئلة البحث'))}>
      {QUESTIONS.map((item, index) => <button key={item.key} type="button" role="tab" aria-selected={index === open} className={index === open ? 'current' : ''}
        onClick={() => setOpen(index)}>{item.key}</button>)}
    </div>
    <div className="pc-rq" data-testid="rq-detail">
      <p><b>{question.key}</b> {say(question.question)}</p>
      <p><b>{say(t('Hypothesis', 'الفرضية'))}</b> {say(question.hypothesis)}</p>
      <p><b>{say(t('Test', 'الاختبار'))}</b> {say(question.test)}</p>
      <PartLink part={question.part}/>
    </div>
    <h5 className="pc-h5">{say(t('The gap: what no single study covers', 'الفجوة: ما لا تغطيه دراسة واحدة'))}</h5>
    <div className="pc-gap" role="table">
      <div className="pc-gap-row head" role="row"><span role="columnheader"/>{GAP_DIMENSIONS.map(name => <span key={name.en} role="columnheader">{say(name)}</span>)}</div>
      {GAP.map(row => <div key={row.study.en} className={cls('pc-gap-row', row.marks === 'YYYYYY' && 'ours')} role="row">
        <span role="rowheader">{say(row.study)}</span>
        {[...row.marks].map((mark, index) => <span key={index} role="cell" className={`mark-${mark}`}
          aria-label={mark === 'Y' ? say(t('yes', 'نعم')) : mark === 'P' ? say(t('partly', 'جزئيًا')) : say(t('no', 'لا'))}>{mark === 'Y' ? '●' : mark === 'P' ? '◐' : '·'}</span>)}
      </div>)}
    </div>
    <p className="pc-note"><Icon name="bulb" size={13}/>{say(t('A gap table like this is a good habit: it shows in one look why your project is new, and each column becomes something you must later prove works.',
      'جدول الفجوة هذا عادة جيدة: يُظهر في نظرة واحدة لماذا مشروعك جديد، ويصبح كل عمود شيئًا عليك أن تثبت لاحقًا أنه يعمل.'))}</p>
  </div>;
}

const TRACK_NAMES: Record<Track, Text> = {
  plan: t('Plan', 'التخطيط'), text: t('Text track → the language model', 'مسار النص ← النموذج اللغوي'),
  image: t('Image track → the CNN', 'مسار الصور ← شبكة CNN'), join: t('Together', 'معًا'),
};
const PHASES = [t('Preparation and data', 'التحضير والبيانات'), t('Model development', 'تطوير النماذج'), t('Integration', 'الربط'), t('Evaluation and delivery', 'التقييم والتسليم')];
const phaseOf = (step: number) => step <= 6 ? 0 : step <= 8 ? 1 : step <= 10 ? 2 : 3;

/** The twelve steps as two parallel tracks that join at step 9. */
export function ProcedureTracks() {
  const say = useTx();
  const [open, setOpen] = useState(8);
  const [critical, setCritical] = useState(false);
  const chosen = PROCEDURE.find(item => item.step === open)!;
  const lanes: Track[] = ['text', 'image', 'join'];
  return <div className="pc-tracks">
    <Heading icon="layers">{say(t('Twelve steps, two tracks', 'اثنتا عشرة خطوة ومساران'))}</Heading>
    <label className="pc-check"><input type="checkbox" checked={critical} onChange={event => setCritical(event.target.checked)}/>{say(t('Show the critical path (a delay here delays everything)', 'أظهر المسار الحرج (أي تأخير فيه يؤخر كل شيء)'))}</label>
    <div className={cls('pc-lanes', critical && 'critical')}>
      <div className="pc-phases">{PHASES.map(phase => <span key={phase.en}>{say(phase)}</span>)}</div>
      <button type="button" className={cls('pc-step plan', open === 1 && 'on')} onClick={() => setOpen(1)}><b>1</b>{say(PROCEDURE[0].name)}</button>
      {lanes.map(lane => <div key={lane} className={`pc-lane ${lane}`}>
        <span className="pc-lane-name">{say(TRACK_NAMES[lane])}</span>
        <div className="pc-lane-cells">
          {[0, 1, 2, 3].map(phase => <div key={phase} className="pc-cell">
            {PROCEDURE.filter(item => item.track === lane && phaseOf(item.step) === phase).map(item =>
              <button key={item.step} type="button" className={cls('pc-step', lane, open === item.step && 'on', item.critical && 'is-critical')}
                onClick={() => setOpen(item.step)} aria-pressed={open === item.step}><b>{item.step}</b>{say(item.name)}</button>)}
          </div>)}
        </div>
      </div>)}
    </div>
    <div className="pc-step-detail" data-testid="step-detail">
      <strong>{say(t(`Step ${chosen.step}`, `الخطوة ${chosen.step}`))} · {say(chosen.name)}{chosen.critical && <em>{say(t('critical path', 'المسار الحرج'))}</em>}</strong>
      <p>{say(chosen.detail)}</p>
      <p><b>{say(t('Output:', 'المخرج:'))}</b> {say(chosen.output)}</p>
      <div className="pc-links"><span>{say(t('Learn it here:', 'تعلّمه هنا:'))}</span>{chosen.parts.map(part => <PartLink key={part} part={part}/>)}</div>
    </div>
  </div>;
}

/** The four layers of the system, each with its input and output. */
export function ArchitectureLayers() {
  const say = useTx();
  const [open, setOpen] = useState(1);
  return <div className="pc-layers">
    <Heading icon="layers">{say(t('Four layers, each with one job', 'أربع طبقات، لكل منها مهمة واحدة'))}</Heading>
    <div className="pc-layer-stack">
      {LAYERS.map((layer, index) => <button key={layer.name.en} type="button" className={cls('pc-layer', `l${index}`, open === index && 'on')}
        onClick={() => setOpen(index)} aria-expanded={open === index}>
        <b>{say(layer.name)}</b><span>{say(layer.parts)}</span>
        {open === index && <span className="pc-layer-more">
          <span><i>{say(t('in', 'يدخل'))}</i>{say(layer.input)}</span>
          <span><i>{say(t('out', 'يخرج'))}</i>{say(layer.output)}</span>
          <span className="job">{say(layer.job)}</span>
        </span>}
      </button>)}
    </div>
    <p className="pc-note"><Icon name="bulb" size={13}/>{say(t('Clear inputs and outputs let three students build the layers in parallel and test each alone. Species, paths and model names live in configuration files, so Phase 2 adds data, not code.',
      'المدخلات والمخرجات الواضحة تتيح لثلاثة طلاب بناء الطبقات بالتوازي واختبار كلٍّ وحدها. والأنواع والمسارات وأسماء النماذج في ملفات إعداد، فتضيف المرحلة 2 بيانات لا شيفرة.'))}</p>
  </div>;
}

/** Turn a species record into JSONL lines, in the project's format. */
export function RecordToJsonl() {
  const say = useTx();
  const [field, setField] = useState('habitat');
  const [withRecord, setWithRecord] = useState(true);
  const [arabic, setArabic] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const chosen = RECORD.fields.find(item => item.key === field)!;
  const pick = (text: Text) => arabic ? text.ar : text.en;
  const context = RECORD.fields.filter(item => item.value).map(item => `${pick(item.label)}: ${pick(item.value!)}`).join(' | ');
  const line = JSON.stringify({
    instruction: pick(chosen.ask),
    ...(withRecord ? { context } : {}),
    response: pick(chosen.answer),
    species: RECORD.latin,
    source: chosen.value ? RECORD.source : 'none',
  });
  const add = () => setLines(current => current.includes(line) ? current : [...current, line]);
  return <div className="pc-jsonl">
    <Heading icon="file">{say(t('From the species record to JSONL lines', 'من سجل النوع إلى أسطر JSONL'))}</Heading>
    <div className="pc-jsonl-grid">
      <div className="pc-recordcard">
        <b className="latin">{RECORD.latin}</b>
        {RECORD.fields.map(item => <button key={item.key} type="button" className={cls('pc-field', field === item.key && 'on', !item.value && 'empty')}
          onClick={() => setField(item.key)} aria-pressed={field === item.key}>
          <span>{say(item.label)}</span>
          <em>{item.value ? say(item.value) : say(t('— not in the sources', '— غير موجود في المصادر'))}</em>
        </button>)}
        <small>{say(t('Every fact: source and page. Illustrative record.', 'كل حقيقة: المصدر والصفحة. سجل توضيحي.'))}</small>
      </div>
      <div className="pc-jsonl-out">
        <div className="ft-tabs" role="group" aria-label={say(t('Line format', 'شكل السطر'))}>
          <button type="button" className={!withRecord ? 'current' : ''} aria-pressed={!withRecord} onClick={() => setWithRecord(false)}>{say(t('question → answer', 'سؤال ← إجابة'))}</button>
          <button type="button" className={withRecord ? 'current' : ''} aria-pressed={withRecord} onClick={() => setWithRecord(true)}>{say(t('question + record → answer', 'سؤال + سجل ← إجابة'))}</button>
        </div>
        <div className="ft-tabs" role="group" aria-label={say(t('Language of the line', 'لغة السطر'))}>
          <button type="button" className={!arabic ? 'current' : ''} aria-pressed={!arabic} onClick={() => setArabic(false)}>English</button>
          <button type="button" className={arabic ? 'current' : ''} aria-pressed={arabic} onClick={() => setArabic(true)}>العربية</button>
        </div>
        <JsonCode text={line}/>
        <p className={cls('pc-kind', !chosen.value && 'missing')}>{say(chosen.value
          ? withRecord
            ? t('Same shape as at answer time: the model learns to read the record and answer from it.', 'الشكل نفسه وقت الإجابة: يتعلم النموذج قراءة السجل والإجابة منه.')
            : t('Simple, but at answer time the model will also receive the record. Training without it means training in a different shape from real use.', 'بسيط، لكن النموذج سيتلقى السجل أيضًا وقت الإجابة. والتدريب دونه تدريب بشكل مختلف عن الاستخدام الحقيقي.')
          : t('The field is empty, so the right answer is to say so. These lines teach the model not to invent.', 'الحقل فارغ، فالإجابة الصحيحة أن يقول ذلك. وهذه الأسطر تعلّم النموذج ألا يختلق.'))}</p>
        <button type="button" className="button small" onClick={add}><Icon name="plus" size={13}/>{say(t('Reviewed against the source: add to train.jsonl', 'روجع مقابل المصدر: أضفه إلى train.jsonl'))}</button>
        {lines.length > 0 && <div className="pc-file" data-testid="utas-train">
          <b>train.jsonl · {say(t(`${lines.length} lines`, `${lines.length} أسطر`))}</b>
          <ol>{lines.map(item => <li key={item} dir="ltr"><bdi>{item.length > 110 ? `${item.slice(0, 110)}…` : item}</bdi></li>)}</ol>
        </div>}
      </div>
    </div>
  </div>;
}

const WORDINGS = [
  'Where does the frankincense tree grow in Dhofar?',
  'In which parts of Dhofar is Boswellia sacra found?',
  'أين تنمو شجرة اللبان في ظفار؟',
];

/** The same unseen question to the three systems the project compares. */
export function ThreeConfigs() {
  const say = useTx();
  const [shown, setShown] = useState(1);
  return <div className="pc-configs">
    <Heading icon="check">{say(t('Compare three systems on the same question', 'قارن ثلاثة أنظمة على السؤال نفسه'))}</Heading>
    <p className="pc-question"><Icon name="help" size={14}/>{say(EVAL_QUESTION)}</p>
    <div className="pc-config-grid">
      {CONFIGS.slice(0, shown + 1).map(config => <article key={config.key} className={cls('pc-config', config.key)}>
        <b>{say(config.name)}</b>
        <p>{say(config.answer)}</p>
        <div className="pc-marks">{SCORE_NAMES.map((name, index) => <span key={name.en}>
          {say(name)} <i className={`m${config.scores[index]}`}>{'●'.repeat(config.scores[index])}{'○'.repeat(2 - config.scores[index])}</i></span>)}</div>
        <small>{say(config.note)}</small>
      </article>)}
    </div>
    {shown < CONFIGS.length - 1 && <button type="button" className="button small" onClick={() => setShown(value => value + 1)}>
      <Icon name="next" size={13}/>{say(t('Ask the next system', 'اسأل النظام التالي'))}</button>}
    <div className="pc-wordings">
      <b>{say(t('Consistency: the same question, three wordings', 'الاتساق: السؤال نفسه بثلاث صيغ'))}</b>
      <ul data-keep="">{WORDINGS.map(wording => <li key={wording}><bdi>{wording}</bdi></li>)}</ul>
      <span>{say(t('A consistent model gives the same facts all three times, in either language.', 'النموذج المتسق يعطي الحقائق نفسها في المرات الثلاث، بأي لغة.'))}</span>
    </div>
    <p className="pc-note"><Icon name="bulb" size={13}/>{say(t('Only the three-way comparison shows what each part adds: fine-tuning improves how it answers; the record makes the answer true and traceable. The answers and marks here are illustrations.',
      'وحدها المقارنة الثلاثية تُظهر ما يضيفه كل جزء: الضبط الدقيق يحسّن طريقة الإجابة، والسجل يجعل الإجابة صحيحة وقابلة للتتبع. والإجابات والدرجات هنا للتوضيح.'))}</p>
  </div>;
}

/** Will it fit? The three Qwen sizes against a free 16 GB GPU and a 24 GB one. */
function GpuFit() {
  const say = useTx();
  const sizes = [MODEL_SIZES[1], MODEL_SIZES[2], MODEL_SIZES[4]];
  const cards = [GPUS[1], GPUS[2]];
  return <div className="pc-gpufit" data-testid="gpu-fit">
    <b>{say(t('QLoRA memory, rank 16 (rough classroom estimate)', 'ذاكرة QLoRA برتبة 16 (تقدير تقريبي للدرس)'))}</b>
    {sizes.map(size => {
      const need = budget(size, 4, 16, true).totalGb;
      return <div key={size.label} className="pc-fit-row">
        <span>Qwen {size.label}</span>
        <span className="pc-fit-bar"><i style={{ width: `${Math.min(100, need / 32 * 100)}%` }}/>
          {cards.map(card => <em key={card.gb} style={{ insetInlineStart: `${card.gb / 32 * 100}%` }}/>)}</span>
        <strong>{need.toFixed(1)} GB</strong>
        {cards.map(card => <span key={card.gb} className={need <= card.gb ? 'fits' : 'no'}>{card.gb} GB {need <= card.gb ? '✓' : '✕'}</span>)}
      </div>;
    })}
    <small>{say(t('A free Kaggle or Colab T4 has 16 GB: enough for a pilot on a small Qwen, not for 27B. Plan the 27B run on a 24 GB GPU or larger.',
      'بطاقة T4 المجانية في Kaggle أو Colab فيها 16 غ.ب: تكفي لتجربة على Qwen صغير، لا لنموذج 27B. خطّط لتدريب 27B على بطاقة 24 غ.ب أو أكبر.'))}</small>
  </div>;
}

/** Lessons from this project for the next one, as a checklist. */
export function ProjectGuide() {
  const say = useTx();
  const [done, setDone] = useState<number[]>([]);
  const toggle = (index: number) => setDone(current => current.includes(index) ? current.filter(item => item !== index) : [...current, index]);
  return <div className="pc-guide">
    <Heading icon="bookmark">{say(t('A guide for your own project', 'دليل لمشروعك أنت'))}</Heading>
    <p className="pc-lead">{say(t('Twelve habits from this project that apply to any fine-tuning project. Tick the ones your plan already has.',
      'اثنتا عشرة عادة من هذا المشروع تنطبق على أي مشروع ضبط دقيق. ضع علامة على ما تتضمنه خطتك.'))} <b data-testid="guide-count">{done.length} / {GUIDE.length}</b></p>
    <ol className="pc-guide-list">
      {GUIDE.map((item, index) => <li key={item.title.en} className={done.includes(index) ? 'done' : ''}>
        <label><input type="checkbox" checked={done.includes(index)} onChange={() => toggle(index)}/><b>{say(item.title)}</b></label>
        <p>{say(item.text)}</p>
        {item.part !== undefined && <PartLink part={item.part}/>}
        {index === 7 && <GpuFit/>}
      </li>)}
    </ol>
  </div>;
}
