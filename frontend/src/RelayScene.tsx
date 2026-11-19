/**
 * "The relay": how the three parts of the UTAS-70 plant assistant pass a plant along.
 * Act 1, YOLO sees: one look at the photo, a grid, many boxes, the best one kept → a name.
 * Act 2, RAG remembers: the name opens the archive, filters it to this plant, ranks by meaning.
 * Act 3, the fine-tuned model speaks: the prompt is packed, the learned style fills the answer.
 * Passages, sources and scores are illustrations.
 */
import type { CSSProperties } from 'react';
import './relay.css';
import { Icon } from './ui';
import type { IconName } from './ui';
import { useI18n } from './i18n';
import { t, usePlayer, useTx } from './FineTuneScenes';
import type { Text } from './FineTuneScenes';
import { PlantArt } from './PlantCase';
import { PASSAGES, SPECIES } from './visionContent';

const cls = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');
const bySpecies = Object.fromEntries(SPECIES.map(species => [species.key, species]));
const delay = (index: number, step = 0.12): CSSProperties => ({ animationDelay: `${index * step}s` });

type Act = 0 | 1 | 2;

const ACTS: { name: Text; role: Text; icon: IconName; tone: string; definition: Text; io: [Text, Text] }[] = [
  { name: t('YOLO', 'YOLO'), role: t('sees', 'يرى'), icon: 'grid', tone: '#5ef2a0',
    definition: t('YOLO (“You Only Look Once”) is a computer-vision model that looks at the whole photo in a single pass and answers two questions at once: what is in it, and where.',
      'YOLO (“You Only Look Once”، أي “تنظر مرة واحدة فقط”) نموذج رؤية حاسوبية ينظر إلى الصورة كلها في مرور واحد، ويجيب عن سؤالين معًا: ما الذي فيها، وأين.'),
    io: [t('a photo', 'صورة'), t('a name, a box, a confidence', 'اسم ومربع ودرجة ثقة')] },
  { name: t('RAG archive', 'أرشيف RAG'), role: t('remembers', 'يتذكر'), icon: 'library', tone: '#93c5fd',
    definition: t('RAG (Retrieval-Augmented Generation) means: before the model writes, search a library of trusted documents and give it the passages that answer the question.',
      'RAG (التوليد المعزَّز بالاسترجاع) يعني: قبل أن يكتب النموذج، ابحث في مكتبة من الوثائق الموثوقة وأعطه المقاطع التي تجيب عن السؤال.'),
    io: [t('the name + the question', 'الاسم + السؤال'), t('passages with sources', 'مقاطع مع مصادرها')] },
  { name: t('Fine-tuned Qwen', 'Qwen المضبوط'), role: t('speaks', 'يتكلم'), icon: 'chip', tone: '#a78bfa',
    definition: t('Fine-tuning trains a model further on your own examples. Here Qwen3.8-27B learned, with QLoRA, how a Dhofar plant answer should look and sound.',
      'الضبط الدقيق يدرّب النموذج أكثر على أمثلتك أنت. وهنا تعلّم Qwen3.8-27B، بـ QLoRA، كيف تبدو إجابة نباتات ظفار وكيف تُقال.'),
    io: [t('passages + question + rules', 'المقاطع + السؤال + القواعد'), t('the final answer', 'الإجابة النهائية')] },
];

const BEATS: { act: Act; title: Text; text: Text }[] = [
  { act: 0, title: t('What is YOLO?', 'ما YOLO؟'),
    text: t('The photo arrives. YOLO scans it once, all of it, instead of sliding a window over it many times. That single look is why it is fast enough for a phone.',
      'تصل الصورة. يمسحها YOLO مرة واحدة، كلها، بدل أن يمرّر نافذة عليها مرات كثيرة. وهذه النظرة الواحدة هي سبب سرعته التي تكفي للهاتف.') },
  { act: 0, title: t('A grid over the photo', 'شبكة فوق الصورة'),
    text: t('In the classic picture of YOLO, the photo is divided into a grid. The cell that holds the centre of the tree is responsible for reporting it.',
      'في الصورة الكلاسيكية لـ YOLO تُقسَّم الصورة إلى شبكة. والخلية التي يقع فيها مركز الشجرة هي المسؤولة عن الإبلاغ عنها.') },
  { act: 0, title: t('Many guesses at once', 'تخمينات كثيرة في وقت واحد'),
    text: t('Boxes come out everywhere, each with a species and a score. Several cover the same tree; one is around a small shrub in the background.',
      'تخرج المربعات من كل مكان، كلٌّ بنوع ودرجة. عدة مربعات تغطي الشجرة نفسها، وواحد حول شجيرة صغيرة في الخلفية.') },
  { act: 0, title: t('Keep the best box', 'احتفظ بأفضل مربع'),
    text: t('Boxes below the confidence threshold are dropped, and non-maximum suppression keeps only the strongest of the overlapping ones. Left: Boswellia sacra, 89%, above the 70% threshold.',
      'تُحذف المربعات التي دون عتبة الثقة، ويُبقي “كبت غير الأقصى” أقوى المربعات المتداخلة فقط. والباقي: Boswellia sacra بثقة 89٪، فوق عتبة 70٪.') },
  { act: 0, title: t('Why YOLO matters here', 'لماذا YOLO مهم هنا'),
    text: t('Nothing else can start without a name: the name is the key to the archive. YOLO also finds the plant in a busy scene, and its confidence lets the system refuse an unclear photo instead of guessing.',
      'لا يبدأ شيء آخر دون اسم: فالاسم مفتاح الأرشيف. ويجد YOLO النبات أيضًا في مشهد مزدحم، وتسمح ثقته للنظام برفض الصورة غير الواضحة بدل التخمين.') },
  { act: 1, title: t('The name opens the archive', 'الاسم يفتح الأرشيف'),
    text: t('The name is handed to RAG. A name index turns any name, Latin, Arabic or English, into one key, so all three point to the same plant.',
      'يُسلَّم الاسم إلى RAG. ويحوّل فهرس الأسماء أي اسم، لاتينيًا أو عربيًا أو إنجليزيًا، إلى مفتاح واحد، فتشير الأسماء الثلاثة إلى النبات نفسه.') },
  { act: 1, title: t('Filter: only this plant', 'التصفية: هذا النبات فقط'),
    text: t('The archive holds passages from every reference, each tagged with its plant. The filter keeps only the passages tagged Boswellia sacra; myrrh and desert rose drop out.',
      'يحفظ الأرشيف مقاطع من كل المراجع، كلٌّ موسوم بنباته. فتُبقي التصفية المقاطع الموسومة Boswellia sacra فقط، ويخرج المُرّ ووردة الصحراء.') },
  { act: 1, title: t('Rank by meaning', 'الترتيب بالمعنى'),
    text: t('The question “What is it used for?” is turned into numbers (an embedding) and compared with each remaining passage. The two closest in meaning rise to the top.',
      'يتحول السؤال “فيمَ يُستخدم؟” إلى أرقام (متجه) ويُقارن بكل مقطع باقٍ. فيصعد المقطعان الأقرب معنًى إلى القمة.') },
  { act: 1, title: t('Why RAG matters here', 'لماذا RAG مهم هنا'),
    text: t('The facts come from real references, each with its source and page. Adding a book or correcting a fact changes the archive, not the model, so nothing is retrained.',
      'تأتي الحقائق من مراجع حقيقية، كلٌّ مع مصدره وصفحته. وإضافة كتاب أو تصحيح حقيقة تغيّر الأرشيف لا النموذج، فلا يُعاد تدريب شيء.') },
  { act: 2, title: t('The prompt is packed', 'يُحزم التلقين'),
    text: t('The application packs the rules, the two passages, the question and the reply language into one prompt, and hands it to the fine-tuned model.',
      'يحزم التطبيق القواعد والمقطعين والسؤال ولغة الرد في تلقين واحد، ويسلّمه إلى النموذج المضبوط.') },
  { act: 2, title: t('Writing in the learned style', 'الكتابة بالأسلوب المتعلَّم'),
    text: t('Fine-tuning taught the answer’s shape from reviewed examples: names first, then the answer, details, a caution and the sources. Each part is filled only from the passages.',
      'علّم الضبط الدقيق شكل الإجابة من أمثلة مراجَعة: الأسماء أولًا، ثم الإجابة والتفاصيل والتحذير والمصادر. ويُملأ كل جزء من المقاطع فقط.') },
  { act: 2, title: t('The final answer', 'الإجابة النهائية'),
    text: t('One clear, sourced answer in the user’s language. YOLO found the plant, RAG brought the facts, fine-tuning gave the voice.',
      'إجابة واحدة واضحة وموثقة بلغة المستخدم. وجد YOLO النبات، وجلب RAG الحقائق، وأعطى الضبط الدقيق الصوت.') },
];
const FIRST_BEAT: Record<Act, number> = { 0: 0, 1: 5, 2: 9 };

// ---------------------------------------------------------------- act 1: YOLO

const CANDIDATES = [
  { x: 108, y: 34, w: 134, h: 140, label: 'B. sacra 0.89', keep: true },
  { x: 126, y: 58, w: 100, h: 98, label: 'B. sacra 0.63' },
  { x: 92, y: 22, w: 168, h: 168, label: 'B. sacra 0.47' },
  { x: 12, y: 118, w: 58, h: 58, label: 'myrrh 0.31' },
];

function YoloView({ beat }: { beat: number }) {
  const say = useTx();
  const kept = beat >= 3;
  return <div className="pr-view pr-yolo">
    <svg viewBox="0 0 320 220" role="img" aria-label={say(t('YOLO looking at a photo of a frankincense tree', 'YOLO ينظر إلى صورة شجرة لبان'))}>
      <defs>
        <linearGradient id="pr-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#bfe6ff"/><stop offset="1" stopColor="#fdf3dc"/></linearGradient>
        <linearGradient id="pr-scan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5ef2a0" stopOpacity="0"/><stop offset="1" stopColor="#5ef2a0" stopOpacity=".55"/></linearGradient>
      </defs>
      <rect x="0" y="0" width="320" height="220" rx="12" fill="url(#pr-sky)"/>
      <circle cx="272" cy="40" r="18" className="pr-sun"/>
      <path d="M0 176 C 60 160 120 172 180 166 C 240 160 290 170 320 164 V 220 H 0 Z" className="pr-ground"/>
      <ellipse cx="262" cy="184" rx="26" ry="9" className="pr-rock"/><ellipse cx="292" cy="190" rx="14" ry="6" className="pr-rock"/>
      <g transform="translate(14 120) scale(.56)"><PlantArt kind="commiphora"/></g>
      <g transform="translate(110 38) scale(1.32)"><PlantArt kind="boswellia"/></g>

      {beat === 0 && <g className="pr-scan"><rect x="0" y="-40" width="320" height="40" fill="url(#pr-scan)"/><rect x="0" y="-2" width="320" height="2.5" className="pr-scanline"/></g>}

      <g className={cls('pr-grid', beat >= 1 && 'on', kept && 'faint')}>
        {Array.from({ length: 7 }, (_, index) => <path key={`v${index}`} d={`M ${(index + 1) * 40} 0 V 220`}/>)}
        {Array.from({ length: 5 }, (_, index) => <path key={`h${index}`} d={`M 0 ${(index + 1) * 36.67} H 320`}/>)}
        <rect className="pr-cell" x="160" y="73.3" width="40" height="36.7"/>
        <circle className="pr-centre" cx="175" cy="104" r="4"/>
      </g>

      {beat >= 2 && CANDIDATES.map((box, index) => <g key={box.label} className={cls('pr-cand', box.keep ? 'keep' : 'drop', kept && (box.keep ? 'final' : 'gone'))} style={delay(index, 0.25)}>
        <rect x={box.x} y={box.y} width={box.w} height={box.h} rx="4"/>
        <rect className="tag" x={box.x} y={box.y - 13} width={box.label.length * 5.6 + 8} height="13" rx="3"/>
        <text x={box.x + 4} y={box.y - 3.5} direction="ltr">{box.label}</text>
      </g>)}
    </svg>
    <div className={cls('pr-meter', kept && 'on')}>
      <span>{say(t('confidence', 'الثقة'))}</span>
      <div className="track"><i style={{ width: kept ? '89%' : '0%' }}/><em style={{ insetInlineStart: '70%' }}><b>{say(t('threshold 70%', 'العتبة 70٪'))}</b></em></div>
      <strong dir="ltr">{kept ? '89%' : '—'}</strong>
    </div>
    {beat >= 4 && <ul className="pr-why">
      {[t('the name is the key to the archive', 'الاسم مفتاح الأرشيف'), t('one look: fast enough for a phone', 'نظرة واحدة: سريع بما يكفي للهاتف'),
        t('finds the plant in a busy scene', 'يجد النبات في مشهد مزدحم'), t('its confidence lets the system refuse', 'ثقته تسمح للنظام بالرفض')].map((item, index) =>
        <li key={item.en} style={delay(index, 0.15)}><Icon name="check" size={13}/>{say(item)}</li>)}
    </ul>}
  </div>;
}

// ---------------------------------------------------------------- act 2: RAG

const NAMES = ['شجرة اللبان', 'frankincense tree', 'Boswellia sacra'];
const relevance = (passage: typeof PASSAGES[number]) => passage.topic === 'uses' ? passage.similarity : +(passage.similarity * 0.45).toFixed(2);
const RANKED = PASSAGES.filter(passage => passage.species === 'boswellia').sort((a, b) => relevance(b) - relevance(a));
const TOP = RANKED.slice(0, 2).map(passage => passage.id);

function RagView({ beat }: { beat: number }) {
  const say = useTx();
  return <div className="pr-view pr-rag">
    <div className="pr-names">
      {NAMES.map((name, index) => <span key={name} className="pr-alias" style={delay(index, 0.18)}><bdi>{name}</bdi></span>)}
      <span className="pr-funnel" aria-hidden="true">{say(t('→', '←'))}</span>
      <code className="pr-key" dir="ltr">key: boswellia_sacra</code>
    </div>
    <div className={cls('pr-query', beat >= 7 && 'on')}>
      <Icon name="search" size={13}/><span>{say(t('“What is it used for?”', '“فيمَ يُستخدم؟”'))}</span>
      <code dir="ltr">[0.12, −0.40, 0.88, 0.05, …]</code>
    </div>
    <div className="pr-archive">
      {PASSAGES.map((passage, index) => {
        const mine = passage.species === 'boswellia';
        const rank = TOP.indexOf(passage.id);
        const score = relevance(passage);
        return <article key={passage.id} style={{ ...delay(index, 0.06), '--plant': bySpecies[passage.species].color } as CSSProperties}
          className={cls('pr-passage', beat >= 6 && !mine && 'out', beat >= 7 && rank >= 0 && 'top', beat >= 8 && mine && rank < 0 && 'dim')}>
          <i className="latin" dir="ltr">{bySpecies[passage.species].latin}</i>
          <p>{say(passage.text)}</p>
          <small dir="ltr">{passage.source}</small>
          {beat >= 7 && mine && <span className="pr-sim"><b style={{ width: `${score * 100}%` }}/><em dir="ltr">{score.toFixed(2)}</em></span>}
          {beat >= 7 && rank >= 0 && <span className="pr-rank" dir="ltr">#{rank + 1}</span>}
        </article>;
      })}
    </div>
    {beat >= 8 && <ul className="pr-why">
      {[t('every fact has a source and page', 'لكل حقيقة مصدر وصفحة'), t('only this plant’s passages compete', 'لا تتنافس إلا مقاطع هذا النبات'),
        t('new book = new data, no retraining', 'كتاب جديد = بيانات جديدة دون إعادة تدريب')].map((item, index) =>
        <li key={item.en} style={delay(index, 0.15)}><Icon name="check" size={13}/>{say(item)}</li>)}
    </ul>}
  </div>;
}

// ------------------------------------------------------- act 3: fine-tuned model

const SLOTS = [t('Names', 'الأسماء'), t('The answer', 'الإجابة'), t('Details', 'التفاصيل'), t('Caution', 'التحذير'), t('Sources', 'المصادر')];

function BrainView({ beat }: { beat: number }) {
  const say = useTx();
  const { isArabic } = useI18n();
  const prompt: [string, Text][] = [
    ['rules', t('Rules: only the passages · say “not in the sources” · add the safety note', 'القواعد: من المقاطع فقط · قل “غير موجود في المصادر” · أضف تنبيه السلامة')],
    ['p1', t('[1] Source C, p. __ · resin tapped, burned as incense', '[1] المصدر C، ص __ · راتنج يُستخرج ويُحرق بخورًا')],
    ['p2', t('[2] Field notes 3 · bark cut, dried resin collected', '[2] ملاحظات ميدانية 3 · يُجرح اللحاء ويُجمع الراتنج')],
    ['q', t('Question: What is it used for?', 'السؤال: فيمَ يُستخدم؟')],
    ['lang', isArabic ? t('Reply in: Arabic', 'لغة الرد: العربية') : t('Reply in: English', 'لغة الرد: الإنجليزية')],
  ];
  return <div className="pr-view pr-brain">
    <div className={cls('pr-prompt', beat >= 10 && 'sent')}>
      <b>{say(t('prompt', 'التلقين'))}</b>
      {prompt.map(([key, line], index) => <span key={key} className={`pr-line ${key}`} style={delay(index, 0.22)}>{say(line)}</span>)}
    </div>
    <div className={cls('pr-model', beat >= 10 && 'thinking')}>
      <span className="pr-chip-art"><Icon name="chip" size={22}/></span>
      <div><b dir="ltr">Qwen3.8-27B · 4-bit</b><small>{say(t('frozen weights', 'أوزان مجمَّدة'))}</small></div>
      <span className="pr-adapter">LoRA<small>{say(t('the learned style', 'الأسلوب المتعلَّم'))}</small></span>
    </div>
    {beat === 10 && <ol className="pr-slots">
      {SLOTS.map((slot, index) => <li key={slot.en} style={delay(index, 0.45)}><Icon name="check" size={12}/>{say(slot)}</li>)}
    </ol>}
    {beat >= 11 && <article className="pr-answer" data-testid="relay-answer">
      <header style={delay(0, 0.3)}>
        <span className="pr-avatar"><svg viewBox="0 0 100 100" aria-hidden="true"><PlantArt kind="boswellia"/></svg></span>
        <div><b>{say(t('Frankincense tree', 'شجرة اللبان'))}</b><i dir="ltr">Boswellia sacra</i></div>
        <span className="pr-seen">{say(t('seen by YOLO · 89%', 'رآه YOLO · 89٪'))}</span>
      </header>
      <section style={delay(1, 0.3)}><h5>{say(t('Uses', 'الاستخدامات'))}</h5>
        <p>{say(t('Its resin is tapped from the bark and burned as incense; it is also used in traditional practices.', 'يُستخرج راتنجها من اللحاء ويُحرق بخورًا، ويُستخدم كذلك في الممارسات التقليدية.'))}<sup>1</sup></p></section>
      <section style={delay(2, 0.3)}><h5>{say(t('How the resin is collected', 'كيف يُجمع الراتنج'))}</h5>
        <p>{say(t('Harvesters cut the bark and collect the dried resin some weeks later.', 'يجرح الجامعون اللحاء ويجمعون الراتنج الجاف بعد أسابيع.'))}<sup>2</sup></p></section>
      <section className="caution" style={delay(3, 0.3)}><Icon name="help" size={13}/>{say(t('For education only, not medical advice.', 'للتعليم فقط، وليست نصيحة طبية.'))}</section>
      <footer style={delay(4, 0.3)}>
        <span dir="ltr">1 · Source C, p. __</span><span dir="ltr">2 · Field notes 3</span>
      </footer>
      <div className="pr-credits" style={delay(5, 0.3)}>
        <span className="eyes">{say(t('YOLO found the plant', 'YOLO وجد النبات'))}</span>
        <span className="memory">{say(t('RAG brought the facts', 'RAG جلب الحقائق'))}</span>
        <span className="brain">{say(t('fine-tuning gave the voice', 'الضبط الدقيق أعطى الصوت'))}</span>
      </div>
    </article>}
  </div>;
}

// ---------------------------------------------------------------- the relay

const BATON: Text[] = [t('photo', 'صورة'), t('Boswellia sacra · 89%', 'Boswellia sacra · ‏89٪'), t('2 passages + sources', 'مقطعان + مصادر'), t('final answer', 'الإجابة النهائية')];
const batonLit = (beat: number) => [true, beat >= 3, beat >= 8, beat >= 11];

export function RelayScene() {
  const say = useTx();
  const player = usePlayer(BEATS.length);
  const { step: beat, playing } = player;
  const current = BEATS[beat];
  const act = ACTS[current.act];
  const lit = batonLit(beat);
  return <section className={`pr act-${current.act}`} id="ft-scene-relay" style={{ '--act': act.tone } as CSSProperties}
    aria-label={say(t('The relay: YOLO, RAG and the fine-tuned model', 'التتابع: YOLO و RAG والنموذج المضبوط'))}>
    <div className="pr-acts" role="group" aria-label={say(t('Acts', 'الفصول'))}>
      {ACTS.map((item, index) => <button key={item.icon} type="button" className={cls('pr-act', index === current.act && 'on', index < current.act && 'done')}
        style={{ '--tone': item.tone } as CSSProperties} onClick={() => player.go(FIRST_BEAT[index as Act])} aria-pressed={index === current.act}>
        <span className="num">{index + 1}</span><Icon name={item.icon} size={16}/>
        <b>{say(item.name)}</b><em>{say(item.role)}</em>
      </button>)}
    </div>

    <div className="pr-baton" aria-label={say(t('What is handed on', 'ما يُسلَّم'))}>
      {BATON.map((item, index) => <span key={item.en} className={cls('pr-node', lit[index] && 'lit', `n${index}`)}>
        {index > 0 && <i className={cls('pr-link', lit[index] && 'lit')}/>}
        <span className="label">{say(item)}</span>
      </span>)}
    </div>

    <div className="pr-body">
      <div className="pr-stage" key={current.act}>
        {current.act === 0 && <YoloView beat={beat}/>}
        {current.act === 1 && <RagView beat={beat}/>}
        {current.act === 2 && <BrainView beat={beat}/>}
      </div>
      <aside className="pr-explain">
        <div className="pr-def" data-testid="relay-definition">
          <span className="pr-def-tag"><Icon name={act.icon} size={13}/>{say(t('Definition', 'تعريف'))}</span>
          <p>{say(act.definition)}</p>
          <div className="pr-io"><span>{say(act.io[0])}</span><Icon name="next" size={12}/><span>{say(act.io[1])}</span></div>
        </div>
        <div className="pr-beat" key={beat}>
          <span className="pr-count" dir="ltr">{beat + 1} / {BEATS.length}</span>
          <h4>{say(current.title)}</h4>
          <p>{say(current.text)}</p>
        </div>
      </aside>
    </div>

    <div className="pr-controls">
      <button type="button" className="button small" onClick={() => player.go(beat - 1)} disabled={beat === 0} aria-label={say(t('Previous step', 'الخطوة السابقة'))}><Icon name="previous" size={13}/></button>
      <button type="button" className="button small pr-play" onClick={player.toggle}>
        <Icon name={playing ? 'pause' : 'play'} size={13}/>{say(playing ? t('Pause', 'إيقاف مؤقت') : beat === BEATS.length - 1 ? t('Play again', 'شغّل من جديد') : t('Play', 'تشغيل'))}</button>
      <button type="button" className="button small" onClick={() => player.go(beat + 1)} disabled={beat === BEATS.length - 1} aria-label={say(t('Next step', 'الخطوة التالية'))}><Icon name="next" size={13}/></button>
      <div className="pr-dots">
        {BEATS.map((item, index) => <button key={item.title.en} type="button" className={cls(`a${item.act}`, index === beat && 'on', index < beat && 'past')}
          onClick={() => player.go(index)} aria-label={say(item.title)} aria-current={index === beat ? 'step' : undefined}/>)}
      </div>
    </div>
  </section>;
}
