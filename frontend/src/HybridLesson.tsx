/**
 * "Fine-tuning, RAG, or both?" — the storyteller-and-library scene and its panels,
 * plus three everyday analogies: extra lessons, sticky notes, and a compressed photo.
 */
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import './hybrid.css';
import { Icon } from './ui';
import type { IconName } from './ui';
import { useI18n } from './i18n';
import { Hotspots, Scene, packet, show, t, usePlayer, useTx } from './FineTuneScenes';
import type { Figure } from './FineTuneScenes';
import { Txt } from './LessonScenes';
import { JsonCode } from './FineTuneLessons';
import { BUILD_ORDER, DATA_ITEMS, GOALS, HYBRID_METRICS, RAG_DOC, SITUATIONS, TUNE_EXAMPLE } from './hybridContent';
import type { Level, Method } from './hybridContent';

const cls = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

function Sub({ icon = 'flask', children }: { icon?: IconName; children: ReactNode }) {
  return <h4 className="llm-sub ft-handson"><Icon name={icon} size={13}/>{children}</h4>;
}

// ====================================================== the storyteller scene

const SEARCH = 'M 394 150 C 460 112 530 112 596 146';
const BRING = 'M 640 150 C 590 200 540 200 500 175';

const HYBRID_STEPS = [
  { title: t('A visitor asks for a story', 'زائر يطلب قصة'),
    text: t('Two helpers will answer together: a storyteller (the fine-tuned model) and a library (RAG). Watch what each one brings.',
      'سيجيب مساعدان معًا: راوٍ (النموذج المضبوط) ومكتبة (RAG). راقب ما يقدمه كل منهما.') },
  { title: t('Search the library', 'ابحث في المكتبة'),
    text: t('RAG searches the collection of real, recorded stories and finds the one that matches the question. Nothing is memorized: it is looked up.',
      'يبحث RAG في مجموعة القصص الحقيقية المسجلة ويجد القصة التي تطابق السؤال. لا شيء محفوظ: إنه يُبحث عنه.') },
  { title: t('The story arrives with its source', 'تصل القصة مع مصدرها'),
    text: t('The retrieved card carries the story and its metadata: which collection, which region, when it was recorded.',
      'تحمل البطاقة المسترجَعة القصة وبياناتها الوصفية: أي مجموعة، وأي منطقة، ومتى سُجّلت.') },
  { title: t('The trained storyteller tells it', 'الراوي المدرَّب يرويها'),
    text: t('Fine-tuning taught the storyteller how to speak: the opening, the tone, the structure. The content comes from the card, not from memory.',
      'علّم الضبط الدقيق الراوي كيف يتكلم: الافتتاح والنبرة والبنية. أما المحتوى فمن البطاقة لا من الذاكرة.') },
  { title: t('…and names the source', '…ويذكر المصدر'),
    text: t('Every answer ends with where it came from. Citing the card is also a behaviour the storyteller learned from training examples.',
      'كل إجابة تنتهي بمصدرها. والاستشهاد بالبطاقة سلوك تعلّمه الراوي أيضًا من أمثلة التدريب.') },
  { title: t('A story the library does not have', 'قصة ليست في المكتبة'),
    text: t('The search finds nothing. The storyteller was trained to say so honestly instead of inventing a story.',
      'لا يجد البحث شيئًا. وقد دُرّب الراوي على قول ذلك بأمانة بدلًا من اختلاق قصة.') },
  { title: t('Without the library: fine-tuning only', 'من دون المكتبة: ضبط دقيق فقط'),
    text: t('A storyteller with no library remembers stories only approximately. It sounds beautiful, but details can be invented and there is no source to check.',
      'الراوي بلا مكتبة يتذكر القصص تقريبيًا. يبدو كلامه جميلًا، لكن التفاصيل قد تُختلق ولا يوجد مصدر للتحقق.') },
  { title: t('Without training: RAG only', 'من دون تدريب: RAG فقط'),
    text: t('A base model with the library gets the facts right, but reads them out flatly, like a report. Correct, but not a storyteller.',
      'النموذج الأساسي مع المكتبة يصيب الحقائق، لكنه يقرؤها بجفاف كتقرير. صحيح، لكنه ليس راويًا.') },
  { title: t('Together: faithful and natural', 'معًا: أمين وطبيعي'),
    text: t('The library gives the facts and the source; the training gives the voice and the honesty. That is why the project combines them.',
      'المكتبة تعطي الحقائق والمصدر، والتدريب يعطي الصوت والأمانة. ولهذا يجمع المشروع بينهما.') },
];

const HYBRID_FIGURES: Figure[] = [
  { id: 'teller', title: t('The storyteller: the fine-tuned model', 'الراوي: النموذج المضبوط'), areas: [[282, 92, 120, 160]],
    what: t('The robot is the language model. The orange badge marks what fine-tuning added: a voice, a structure, and good habits.', 'الروبوت هو النموذج اللغوي. والشارة البرتقالية تحدد ما أضافه الضبط الدقيق: صوت وبنية وعادات جيدة.'),
    why: t('Fine-tuning changes how the model behaves, not what is in the library. It should learn to tell, cite and admit gaps.', 'الضبط الدقيق يغيّر سلوك النموذج لا محتوى المكتبة. ويجب أن يتعلم الرواية والاستشهاد والاعتراف بالنقص.'),
    now: step => step === 6 ? t('Here it works alone, with no library, so it must rely on memory.', 'هنا يعمل وحده بلا مكتبة، فيعتمد على الذاكرة.')
      : step === 7 ? t('Here it is an untrained base model: it has the facts but not the voice.', 'هنا هو نموذج أساسي غير مدرَّب: لديه الحقائق لا الصوت.') : null },
  { id: 'library', title: t('The library: RAG', 'المكتبة: RAG'), areas: [[572, 26, 180, 228]],
    what: t('The shelves hold all the real, recorded stories, each with its metadata. RAG searches them for every question.', 'تحمل الرفوف كل القصص الحقيقية المسجلة مع بياناتها الوصفية. ويبحث فيها RAG لكل سؤال.'),
    why: t('It is the ground truth. It can grow and be corrected at any time without retraining the model.', 'إنها الحقيقة المرجعية. ويمكن أن تنمو وتُصحَّح في أي وقت دون إعادة تدريب النموذج.') },
  { id: 'card', title: t('The retrieved card', 'البطاقة المسترجَعة'), areas: [[424, 108, 142, 122]],
    what: t('The passage RAG found, with its source, region and date.', 'المقطع الذي وجده RAG مع مصدره ومنطقته وتاريخه.'),
    why: t('The model is told to answer only from this card. That is what keeps answers faithful.', 'يُطلب من النموذج ألا يجيب إلا من هذه البطاقة. وهذا ما يُبقي الإجابات أمينة.') },
  { id: 'answer', title: t('The answer bubble', 'فقاعة الإجابة'), areas: [[118, 258, 526, 76]],
    what: t('What the visitor finally reads.', 'ما يقرؤه الزائر في النهاية.'),
    why: t('Compare it across the steps: storyteller + library, storyteller alone, library alone.', 'قارنها عبر الخطوات: راوٍ + مكتبة، وراوٍ وحده، ومكتبة وحدها.'),
    now: step => step === 6 ? t('Invented details are marked: they are not in any source.', 'التفاصيل المختلقة مُعلَّمة: ليست في أي مصدر.')
      : step === 7 ? t('Correct but flat: it reads like a database record.', 'صحيحة لكنها جافة: تُقرأ كسجل في قاعدة بيانات.') : null },
  { id: 'visitor', title: t('The visitor and the question', 'الزائر والسؤال'), areas: [[12, 10, 308, 56], [36, 110, 84, 112]],
    what: t('Someone asking about Omani heritage, in their own words.', 'شخص يسأل عن التراث العُماني بكلماته الخاصة.'),
    why: t('Real questions are worded in many ways. RAG must find the right story, and the model must handle questions it has never seen.', 'الأسئلة الحقيقية تُصاغ بطرق كثيرة. ويجب أن يجد RAG القصة الصحيحة، وأن يتعامل النموذج مع أسئلة لم يرها.') },
];

export function StorytellerScene() {
  const say = useTx();
  const { isArabic } = useI18n();
  const player = usePlayer(HYBRID_STEPS.length);
  const { step } = player;
  const noLibrary = step === 6;
  const untrained = step === 7;
  const missing = step === 5 || step === 6;
  const showCard = (step >= 2 && step <= 4) || step === 7 || step === 8;
  const question = missing ? t('Tell me the story of the flying camel.', 'احكِ لي قصة الجمل الطائر.') : t('Tell me a story about a clever goat from Dhofar.', 'احكِ لي قصة عن تيس ذكي من ظفار.');
  const answer: { lines: { en: string; ar: string }[]; tag?: { en: string; ar: string }; kind: string } | null =
    step === 3 || step === 4 || step === 8 ? { kind: 'good', lines: [
      t('Let me tell you this story the way it was told in Dhofar.', 'دعني أحكي لك هذه القصة كما كانت تُروى في ظفار.'),
      t('Once upon a time, near Salalah, lived a clever goat named Hameed…', 'كان يا ما كان، قرب صلالة، عاش تيس ذكي اسمه حميد…')],
      tag: step >= 4 ? t('Source: Dhofar oral collection, 2019', 'المصدر: مجموعة ظفار الشفهية، 2019') : undefined }
      : step === 5 ? { kind: 'honest', lines: [
        t('I don’t have a recorded source for this story.', 'ليس لدي مصدر مسجّل لهذه القصة.'),
        t('Would you like a story from the collection instead?', 'هل تريد قصة من المجموعة بدلًا منها؟')] }
        : step === 6 ? { kind: 'invented', lines: [
          t('Long ago, a camel flew over Jebel Samhan', 'قديمًا طار جمل فوق جبل سمحان'),
          t('and landed in Mirbat with a golden saddle…', 'وهبط في مرباط بسرج ذهبي…')], tag: t('invented: no source', 'مختلق: بلا مصدر') }
          : step === 7 ? { kind: 'flat', lines: [
            t('The document states: a goat named Hameed lived near Salalah.', 'يذكر المستند: تيس اسمه حميد عاش قرب صلالة.'),
            t('Region: Dhofar. Recorded: 2019.', 'المنطقة: ظفار. سُجّل: 2019.')], tag: t('correct but flat', 'صحيح لكنه جاف') }
            : null;
  return <Scene id="ft-scene-hybrid" title={t('The storyteller and the library: fine-tuning + RAG', 'الراوي والمكتبة: الضبط الدقيق + RAG')}
    steps={HYBRID_STEPS} player={player} figures={HYBRID_FIGURES}>
    <svg viewBox="0 0 760 340" className={`ft-svg hy-scene step-${step}`} role="img" aria-label={say(HYBRID_STEPS[step].title)}>
      {/* the visitor and the question */}
      <rect className="hy-bubble ask" x="14" y="12" width="304" height="50" rx="14"/>
      <path className="hy-bubble ask" d="M 70 62 L 74 104 L 96 62"/>
      <Txt x={166} y={42} className="hy-text" key={`q${missing}`}>{say(question)}</Txt>
      <g className="hy-person">
        <circle cx="76" cy="132" r="17"/>
        <rect x="50" y="154" width="52" height="64" rx="18"/>
      </g>
      <Txt x={76} y={238} className="ft-tiny">{say(t('visitor', 'زائر'))}</Txt>

      {/* the storyteller */}
      <g className={cls('hy-teller', untrained && 'plain', noLibrary && 'alone', step === 3 && 'speaking')}>
        <rect className="body" x="292" y="112" width="100" height="92" rx="18"/>
        <rect className="screen" x="306" y="126" width="72" height="42" rx="10"/>
        <path className="eye" d="M320 147 q 5 -6 10 0 M352 147 q 5 -6 10 0"/>
        <path className="eye" d={step === 5 ? 'M332 158 h 18' : 'M330 156 q 11 7 22 0'}/>
        <rect className="neck" x="330" y="204" width="24" height="12" rx="3"/>
        <rect className="base" x="304" y="216" width="76" height="30" rx="10"/>
        <g className={show(!untrained)}>
          <rect className="badge" x="360" y="96" width="50" height="22" rx="8"/>
          <Txt x={385} y={111} className="hy-badge-text">{say(t('style', 'أسلوب'))}</Txt>
        </g>
      </g>
      <Txt x={218} y={218} className="ft-tiny strong">{untrained ? say(t('base model', 'نموذج أساسي')) : say(t('storyteller', 'الراوي'))}</Txt>
      <Txt x={218} y={232} className="ft-tiny">{untrained ? say(t('(not fine-tuned)', '(غير مضبوط)')) : say(t('(fine-tuned)', '(مضبوط)'))}</Txt>

      {/* the library */}
      <g className={cls('hy-library', noLibrary && 'gone', step === 1 && 'searching', step === 5 && 'empty')}>
        <rect className="frame" x="574" y="28" width="176" height="224" rx="14"/>
        <Txt x={662} y={50} className="hy-heading">{say(t('RAG library', 'مكتبة RAG'))}</Txt>
        {[0, 1, 2].map(shelf => <g key={shelf}>
          <path className="shelf" d={`M 586 ${104 + shelf * 60} H 738`}/>
          {Array.from({ length: 8 }, (_, book) => {
            const picked = shelf === 1 && book === 3;
            return <rect key={book} className={cls('book', `c${(book + shelf) % 4}`, picked && 'picked', picked && showCard && 'out')}
              x={592 + book * 18} y={62 + shelf * 60 - (book % 3) * 3} width="14" height={42 + (book % 3) * 3} rx="2"/>;
          })}
        </g>)}
        <Txt x={662} y={244} className="ft-tiny">{say(t('all the real stories', 'كل القصص الحقيقية'))}</Txt>
        <g className={show(noLibrary)}><path className="hy-cross" d="M 590 44 L 734 236 M 734 44 L 590 236"/></g>
        <g className={show(step === 5)}>
          <rect className="hy-none" x="600" y="138" width="124" height="26" rx="8"/>
          <Txt x={662} y={155} className="hy-none-text">{say(t('no match found', 'لا توجد نتيجة'))}</Txt>
        </g>
      </g>
      {(step === 1 || step === 5) && [0, 1, 2].map(index => <circle key={index} className="ft-packet" r="4.5" style={packet(SEARCH, -index * 0.7)}/>)}
      {step === 2 && [0, 1].map(index => <rect key={index} className="ft-doc" x="-5" y="-7" width="10" height="14" rx="1.5" style={packet(BRING, -index * 0.9)}/>)}

      {/* the retrieved card */}
      <g className={cls('hy-card', show(showCard))}>
        <rect x="428" y="112" width="134" height="114" rx="10"/>
        <Txt x={495} y={130} className="hy-card-title">{say(t('Retrieved', 'مسترجَع'))}</Txt>
        <Txt x={495} y={147} className="hy-card-meta">{say(t('Dhofar oral collection', 'مجموعة ظفار الشفهية'))}</Txt>
        <Txt x={495} y={161} className="hy-card-meta">{say(t('Salalah · 2019', 'صلالة · 2019'))}</Txt>
        <path className="hy-card-line" d="M 440 172 H 550 M 440 184 H 540 M 440 196 H 548 M 440 208 H 520"/>
        <Txt x={495} y={220} className="hy-card-meta">{say(t('“a clever goat, Hameed…”', '“تيس ذكي اسمه حميد…”'))}</Txt>
      </g>

      {/* the answer */}
      <g className={cls('hy-answer', answer?.kind, show(Boolean(answer)))} key={`a${step}`}>
        <rect x="120" y="268" width="522" height="64" rx="14"/>
        <path d="M 330 268 L 342 254 L 352 268"/>
        {answer?.lines.map((line, index) => <Txt key={index} x={isArabic ? 630 : 134} y={292 + index * 20} anchor={isArabic ? 'end' : 'start'} className="hy-answer-text">{say(line)}</Txt>)}
        {answer?.tag && <g className="hy-tag">
          <rect x={isArabic ? 140 : 436} y="256" width="196" height="22" rx="8"/>
          <Txt x={isArabic ? 238 : 534} y={271} className="hy-tag-text">{say(answer.tag)}</Txt>
        </g>}
      </g>
      <Hotspots/>
    </svg>
  </Scene>;
}

// ============================================================ panels

const METHOD_NAME: Record<Method, { en: string; ar: string }> = {
  prompt: t('Prompting', 'التلقين'), rag: t('RAG', 'RAG'), tune: t('Fine-tuning', 'الضبط الدقيق'),
};

export function DecisionHelper() {
  const say = useTx();
  const [pick, setPick] = useState(0);
  const item = SITUATIONS[pick];
  return <div className="hy-decide">
    <Sub icon="help">{say(t('Do you need fine-tuning? Pick a situation', 'هل تحتاج إلى ضبط دقيق؟ اختر موقفًا'))}</Sub>
    <div className="hy-situations">
      {SITUATIONS.map((situation, index) => <button key={situation.name.en} type="button" className={index === pick ? 'current' : ''}
        aria-pressed={index === pick} onClick={() => setPick(index)}>{say(situation.name)}</button>)}
    </div>
    <div className="hy-verdict" key={pick}>
      <div className="hy-methods" aria-hidden="true">
        {(['prompt', 'rag', 'tune'] as Method[]).map(method => <span key={method} className={cls('hy-method', method, method === item.usually && 'on')}>
          <Icon name={method === 'prompt' ? 'code' : method === 'rag' ? 'search' : 'layers'} size={15}/>{say(METHOD_NAME[method])}</span>)}
      </div>
      <dl>
        <div><dt>{say(t('Usually enough', 'يكفي عادةً'))}</dt><dd data-testid="decide-usual">{say(item.usuallyText)}</dd></div>
        <div><dt>{say(t('When fine-tuning helps a lot', 'متى يساعد الضبط الدقيق كثيرًا'))}</dt><dd>{say(item.tuneWhen)}</dd></div>
      </dl>
      <p>{say(item.why)}</p>
    </div>
    <p className="lx-key"><Icon name="bulb" size={14}/><span>{say(t('Fine-tuning is not always required. Use it when the model must reliably behave in a new way. Full fine-tuning of every weight is almost never necessary.',
      'الضبط الدقيق ليس ضروريًا دائمًا. استخدمه حين يجب أن يتصرف النموذج بطريقة جديدة بثبات. أما الضبط الكامل لكل الأوزان فنادرًا ما يكون ضروريًا.'))}</span></p>
  </div>;
}

const LEVEL_NAME = [t('weak', 'ضعيف'), t('moderate', 'متوسط'), t('strong', 'قوي')];

export function StrengthChart() {
  const say = useTx();
  const [mode, setMode] = useState<'tune' | 'rag' | 'both'>('both');
  const level = (goal: typeof GOALS[number]): Level => mode === 'tune' ? goal.tune : mode === 'rag' ? goal.rag : Math.max(goal.tune, goal.rag) as Level;
  const total = GOALS.reduce((sum, goal) => sum + level(goal), 0);
  return <div className="hy-strength">
    <Sub icon="chart">{say(t('What each method is good at', 'فيمَ تتفوق كل طريقة'))}</Sub>
    <div className="ft-tabs" role="group" aria-label={say(t('System', 'النظام'))}>
      <button type="button" className={mode === 'tune' ? 'current' : ''} aria-pressed={mode === 'tune'} onClick={() => setMode('tune')}>{say(t('Fine-tuning only', 'ضبط دقيق فقط'))}</button>
      <button type="button" className={mode === 'rag' ? 'current' : ''} aria-pressed={mode === 'rag'} onClick={() => setMode('rag')}>{say(t('RAG only', 'RAG فقط'))}</button>
      <button type="button" className={mode === 'both' ? 'current' : ''} aria-pressed={mode === 'both'} onClick={() => setMode('both')}>{say(t('Both together', 'الاثنان معًا'))}</button>
    </div>
    <div className="hy-bars">
      {GOALS.map(goal => {
        const value = level(goal);
        return <div key={goal.name.en} className="hy-bar-row">
          <span className="hy-bar-name">{say(goal.name)}</span>
          <span className="hy-bar"><i className={`l${value}`} style={{ width: `${(value + 1) / 3 * 100}%` }}/></span>
          <b className={`l${value}`}>{say(LEVEL_NAME[value])}</b>
          <small>{say(goal.note)}</small>
        </div>;
      })}
    </div>
    <p className="lx-muted" data-testid="strength-total">{say(t(`Score: ${total} of ${GOALS.length * 2}`, `النتيجة: ${total} من ${GOALS.length * 2}`))} — {mode === 'both'
      ? say(t('the combination is strong where each one alone is weak.', 'الجمع قوي حيث يضعف كل منهما وحده.'))
      : mode === 'tune' ? say(t('a good voice, but weak on sources and faithfulness.', 'صوت جيد، لكنه ضعيف في المصادر والأمانة.'))
        : say(t('safe and sourced, but the storytelling sounds generic.', 'آمن وموثَّق، لكن السرد يبدو عامًّا.'))}</p>
  </div>;
}

export function DataSorter() {
  const say = useTx();
  const [answers, setAnswers] = useState<('rag' | 'tune' | null)[]>(() => DATA_ITEMS.map(() => null));
  const score = answers.filter((answer, index) => answer === DATA_ITEMS[index].goes).length;
  const placed = (bin: 'rag' | 'tune') => DATA_ITEMS.map((item, index) => ({ item, index })).filter(({ index }) => answers[index] === bin);
  return <div className="hy-sorter">
    <Sub icon="target">{say(t('Activity: library or lesson? Sort the data', 'نشاط: مكتبة أم درس؟ صنّف البيانات'))}</Sub>
    <p className="lx-lead">{say(t('For each item, decide where it belongs: in the RAG library (the real stories) or in the fine-tuning set (examples that teach behaviour).',
      'لكل عنصر قرّر أين ينتمي: في مكتبة RAG (القصص الحقيقية) أم في مجموعة الضبط الدقيق (أمثلة تعلّم السلوك).'))}</p>
    <ol className="hy-items">
      {DATA_ITEMS.map((item, index) => {
        const answer = answers[index];
        const set = (bin: 'rag' | 'tune') => setAnswers(current => current.map((old, position) => position === index ? bin : old));
        return <li key={item.text.en} className={answer === null ? '' : answer === item.goes ? 'good' : 'bad'}>
          <p>{say(item.text)}</p>
          {answer === null ? <div className="button-row">
            <button type="button" className="button small hy-to-rag" onClick={() => set('rag')}><Icon name="library" size={13}/>{say(t('RAG library', 'مكتبة RAG'))}</button>
            <button type="button" className="button small hy-to-tune" onClick={() => set('tune')}><Icon name="layers" size={13}/>{say(t('Fine-tuning set', 'مجموعة الضبط'))}</button>
          </div> : <p className="hy-why"><strong>{answer === item.goes ? say(t('Right.', 'صحيح.')) : say(t('Not quite.', 'ليس تمامًا.'))}</strong>{' '}
            {item.goes === 'rag' ? say(t('It belongs in the library. ', 'مكانه المكتبة. ')) : say(t('It belongs in the fine-tuning set. ', 'مكانه مجموعة الضبط. '))}{say(item.why)}</p>}
        </li>;
      })}
    </ol>
    <div className="hy-bins">
      <div className="hy-bin rag"><h5><Icon name="library" size={14}/>{say(t('RAG library', 'مكتبة RAG'))}</h5>
        {placed('rag').map(({ item, index }) => <span key={index} className={item.goes === 'rag' ? '' : 'wrong'}>{say(item.text)}</span>)}</div>
      <div className="hy-bin tune"><h5><Icon name="layers" size={14}/>{say(t('Fine-tuning set', 'مجموعة الضبط'))}</h5>
        {placed('tune').map(({ item, index }) => <span key={index} className={item.goes === 'tune' ? '' : 'wrong'}>{say(item.text)}</span>)}</div>
    </div>
    <p className="lx-muted" data-testid="sorter-score">{say(t(`${score} of ${DATA_ITEMS.length} placed correctly`, `${score} من ${DATA_ITEMS.length} في مكانها الصحيح`))}
      {answers.some(answer => answer !== null) && <> · <button type="button" className="lx-link" onClick={() => setAnswers(DATA_ITEMS.map(() => null))}>{say(t('Start again', 'ابدأ من جديد'))}</button></>}</p>
  </div>;
}

/** 100 recorded stories: where do they go? */
export function SplitPicture() {
  const say = useTx();
  const [same, setSame] = useState(false);
  const curated = new Set([3, 11, 18, 27, 34, 46, 52, 61, 75, 83, 90, 97]);
  return <div className="hy-split">
    <Sub icon="grid">{say(t('How much data goes where?', 'كم من البيانات يذهب إلى أين؟'))}</Sub>
    <div className="ft-tabs" role="group" aria-label={say(t('Data plan', 'خطة البيانات'))}>
      <button type="button" className={!same ? 'current' : ''} aria-pressed={!same} onClick={() => setSame(false)}>{say(t('Recommended split', 'التقسيم الموصى به'))}</button>
      <button type="button" className={same ? 'current' : ''} aria-pressed={same} onClick={() => setSame(true)}>{say(t('Same data in both', 'البيانات نفسها في الاثنين'))}</button>
    </div>
    <div className={cls('hy-split-grid', same && 'same')}>
      <div className="hy-split-side rag">
        <h5>{say(t('RAG library', 'مكتبة RAG'))} <small>{say(t('80–100% of the real stories', '80–100٪ من القصص الحقيقية'))}</small></h5>
        <div className="hy-dots">{Array.from({ length: 100 }, (_, index) => <i key={index} style={{ animationDelay: `${index * 6}ms` }}/>)}</div>
      </div>
      <div className="hy-split-side tune">
        <h5>{say(t('Fine-tuning set', 'مجموعة الضبط'))} <small>{same ? say(t('the same 100 raw stories', 'القصص الخام نفسها الـ 100')) : say(t('5–20%: curated teaching examples', '5–20٪: أمثلة تعليمية منتقاة'))}</small></h5>
        <div className="hy-dots">{Array.from({ length: 100 }, (_, index) => <i key={index} className={same ? 'dup' : curated.has(index) ? 'curated' : 'off'}
          style={{ animationDelay: `${index * 6}ms` }}/>)}</div>
      </div>
    </div>
    <p className={same ? 'lx-warning bad' : 'lx-good'} data-testid="split-note">{same
      ? say(t('Avoid this: the model memorizes approximate versions of the stories and mixes them with the retrieved ones. When they disagree, you cannot tell which version it told.',
        'تجنّب هذا: يحفظ النموذج نسخًا تقريبية من القصص ويخلطها بالمسترجَعة. وحين تختلفان لا تعرف أي نسخة رواها.'))
      : say(t('The library keeps every real story. The fine-tuning set is smaller and different in kind: examples, often built from a subset of the stories, that show how to tell them. No strict 50/50 split is needed.',
        'المكتبة تحفظ كل قصة حقيقية. ومجموعة الضبط أصغر ومختلفة في نوعها: أمثلة، كثيرًا ما تُبنى من جزء من القصص، تُري كيف تُروى. ولا حاجة إلى تقسيم صارم 50/50.'))}</p>
  </div>;
}

export function TwoExamples() {
  const say = useTx();
  const record = JSON.stringify({ messages: [
    { role: 'system', content: say(TUNE_EXAMPLE.system) },
    { role: 'user', content: `${say(TUNE_EXAMPLE.user)}\n\n${say(t('Context:', 'السياق:'))} ${say(TUNE_EXAMPLE.context)}` },
    { role: 'assistant', content: say(TUNE_EXAMPLE.answer) },
  ] });
  return <div className="hy-examples">
    <Sub icon="file">{say(t('The two kinds of data, side by side', 'نوعا البيانات جنبًا إلى جنب'))}</Sub>
    <div className="hy-example-grid">
      <article className="hy-doc">
        <h5><Icon name="library" size={14}/>{say(t('Goes into RAG: a real story', 'يذهب إلى RAG: قصة حقيقية'))}</h5>
        <dl>{RAG_DOC.meta.map(item => <div key={item.key.en}><dt>{say(item.key)}</dt><dd>{say(item.value)}</dd></div>)}</dl>
        <p className="hy-story">{say(RAG_DOC.story)} <span className="lx-muted">{say(t('[the full story continues]', '[تستمر القصة كاملة]'))}</span></p>
        <small className="lx-muted">{say(t('Stored as text chunks with their metadata, then searched.', 'تُخزَّن مقاطع نصية مع بياناتها الوصفية، ثم يُبحث فيها.'))}</small>
      </article>
      <article className="hy-tune">
        <h5><Icon name="layers" size={14}/>{say(t('Goes into fine-tuning: a teaching example (one JSONL line)', 'يذهب إلى الضبط الدقيق: مثال تعليمي (سطر JSONL واحد)'))}</h5>
        <JsonCode text={record}/>
        <ul className="hy-learns">
          <li>{say(t('how to sound like a traditional storyteller', 'كيف يبدو كراوٍ تقليدي'))}</li>
          <li>{say(t('how to use the retrieved context', 'كيف يستخدم السياق المسترجَع'))}</li>
          <li>{say(t('how to name the source', 'كيف يذكر المصدر'))}</li>
          <li>{say(t('how to structure the answer', 'كيف يبني الإجابة'))}</li>
        </ul>
      </article>
    </div>
    <p className="lx-muted">{say(t('The story and the narrator here are illustrations written for this lesson, not a real archive record.',
      'القصة والراوي هنا توضيح كُتب لهذا الدرس، وليسا سجلًا حقيقيًا من الأرشيف.'))}</p>
  </div>;
}

export function BuildOrderPanel() {
  const say = useTx();
  return <div className="hy-order">
    <Sub icon="layers">{say(t('A sensible order of work', 'ترتيب عمل معقول'))}</Sub>
    <ol className="hy-steps">{BUILD_ORDER.map((item, index) => <li key={item.title.en} style={{ animationDelay: `${index * 0.15}s` }}>
      <span className="lx-order-no">{index + 1}</span><div><strong>{say(item.title)}</strong><p>{say(item.text)}</p></div></li>)}</ol>
    <div className="lx-criteria">{HYBRID_METRICS.map(item => <article key={item.name.en}><h5>{say(item.name)}</h5><p>{say(item.test)}</p></article>)}</div>
    <p className="lx-key"><Icon name="book" size={14}/><span><strong>{say(t('For TurathAI (Part 12): ', 'لمشروع تراث AI (الجزء 12): '))}</strong>
      {say(t('combining fine-tuning and RAG is a solid, defensible choice. Keep the full archive in RAG, and let the fine-tuning set teach the storyteller’s voice, citing and honest “not found” answers, rather than asking the model to memorize every story.',
        'الجمع بين الضبط الدقيق و RAG خيار متين يمكن الدفاع عنه. احفظ الأرشيف كاملًا في RAG، ودع مجموعة الضبط تعلّم صوت الراوي والاستشهاد والإجابة الأمينة بـ“غير موجود”، بدلًا من مطالبة النموذج بحفظ كل قصة.'))}</span></p>
  </div>;
}

// ============================================================ analogies

/** Three everyday pictures that make the three ideas stick. */
export function AnalogyTrio({ goTo }: { goTo: (part: number) => void }) {
  const say = useTx();
  const cards = [
    { part: 2, cls: 'student', title: t('Fine-tuning = extra lessons', 'الضبط الدقيق = دروس إضافية'),
      text: t('A pre-trained model is a very well-read general student. Fine-tuning gives focused extra lessons on your subject, on top of what it already knows.',
        'النموذج المدرَّب مسبقًا طالب عام واسع الاطلاع. والضبط الدقيق يعطيه دروسًا إضافية مركّزة في مادتك، فوق ما يعرفه مسبقًا.'), go: t('See part 3', 'انظر الجزء 3') },
    { part: 4, cls: 'notes', title: t('LoRA = sticky notes', 'LoRA = ملاحظات لاصقة'),
      text: t('The model is a printed textbook that is never changed. LoRA writes small sticky notes and corrections on top. You can keep the notes separate, or print a new edition with them merged in.',
        'النموذج كتاب مطبوع لا يتغير أبدًا. و LoRA تكتب ملاحظات لاصقة وتصحيحات صغيرة فوقه. ويمكنك إبقاء الملاحظات منفصلة، أو طباعة طبعة جديدة مدموجة فيها.'), go: t('See part 5', 'انظر الجزء 5') },
    { part: 5, cls: 'photo', title: t('Quantization = a smaller photo file', 'التكميم = ملف صورة أصغر'),
      text: t('Like saving a high-resolution photo as a smaller file: it still looks almost the same, but now it fits on your phone. With 4-bit, a big model fits on one consumer GPU.',
        'كحفظ صورة عالية الدقة في ملف أصغر: تبدو تقريبًا كما هي، لكنها الآن تتسع في هاتفك. ومع 4 بت يتسع نموذج كبير لبطاقة GPU استهلاكية واحدة.'), go: t('See part 6', 'انظر الجزء 6') },
  ];
  return <div className="hy-trio">
    <h4 className="llm-sub">{say(t('Three pictures to remember', 'ثلاث صور لتتذكرها'))}</h4>
    <div className="hy-trio-grid">
      {cards.map(card => <article key={card.cls} className={`hy-analogy ${card.cls}`}>
        <div className="hy-analogy-art" aria-hidden="true">
          {card.cls === 'student' && <><span className="book b1"/><span className="book b2"/><span className="book b3"/><span className="lesson">+</span></>}
          {card.cls === 'notes' && <><span className="page"/><span className="note n1"/><span className="note n2"/><span className="note n3"/></>}
          {card.cls === 'photo' && <><span className="big"/><span className="arrow">→</span><span className="small"/></>}
        </div>
        <h5>{say(card.title)}</h5>
        <p>{say(card.text)}</p>
        <button type="button" className="lx-link" onClick={() => goTo(card.part)}>{say(card.go)}<Icon name="next" size={12}/></button>
      </article>)}
    </div>
  </div>;
}

const NOTES = [
  t('Al-Bar’ah: a Dhofari dance', 'البرعة: رقصة ظفارية'),
  t('answer in clear Arabic', 'أجب بعربية واضحة'),
  t('always name the source', 'اذكر المصدر دائمًا'),
  t('say when unsure', 'قل حين لا تكون متأكدًا'),
];

export function StickyNotes() {
  const say = useTx();
  const [count, setCount] = useState(0);
  const [merged, setMerged] = useState(false);
  return <div className="hy-sticky">
    <h4 className="llm-sub ft-handson"><Icon name="book" size={13}/>{say(t('The sticky-note picture of LoRA', 'صورة الملاحظات اللاصقة لـ LoRA'))}</h4>
    <div className={cls('hy-textbook', merged && 'merged')}>
      <div className="hy-page">
        <span className="hy-lock"><Icon name="lock" size={14}/>{merged ? say(t('new edition', 'طبعة جديدة')) : say(t('printed · never changed', 'مطبوع · لا يتغير أبدًا'))}</span>
        {Array.from({ length: 7 }, (_, line) => <i key={line} className="hy-line" style={{ width: `${70 + (line * 13) % 28}%` }}/>)}
        {merged && NOTES.slice(0, count).map(note => <span key={note.en} className="hy-printed">{say(note)}</span>)}
      </div>
      {!merged && <div className="hy-notes">{NOTES.slice(0, count).map((note, index) => <span key={note.en} className="hy-note"
        style={{ transform: `rotate(${[-4, 3, -2, 5][index]}deg)` }}>{say(note)}</span>)}</div>}
    </div>
    <div className="button-row">
      <button type="button" className="button primary small" disabled={count >= NOTES.length || merged} onClick={() => setCount(value => value + 1)}>
        <Icon name="plus" size={13}/>{say(t('Train: add a note', 'درّب: أضف ملاحظة'))}</button>
      <button type="button" className="button small" disabled={!count} onClick={() => setMerged(value => !value)}>
        <Icon name="layers" size={13}/>{merged ? say(t('Keep the notes separate', 'أبقِ الملاحظات منفصلة')) : say(t('Merge: print a new edition', 'ادمج: اطبع طبعة جديدة'))}</button>
      <button type="button" className="button small quiet" onClick={() => { setCount(0); setMerged(false); }}><Icon name="reset" size={13}/></button>
    </div>
    <p className="lx-muted" data-testid="sticky-note">{merged
      ? say(t('Merged: W′ = W + B·A. One book, the same size as before, with the corrections printed in. No separate notes to carry.', 'مدموج: W′ = W + B·A. كتاب واحد بالحجم نفسه، والتصحيحات مطبوعة فيه. ولا ملاحظات منفصلة لحملها.'))
      : say(t(`${count} notes on top. The printed page underneath has not changed: that is the frozen base. The notes are the adapter.`, `${count} ملاحظات في الأعلى. والصفحة المطبوعة تحتها لم تتغير: هذا هو الأساس المجمَّد. والملاحظات هي المهايئ.`))}</p>
  </div>;
}

/** A picture drawn in code, then saved with fewer bits per colour, like weights with fewer bits. */
export function PhotoQuantize() {
  const say = useTx();
  const [bits, setBits] = useState(4);
  const original = useRef<HTMLCanvasElement>(null);
  const reduced = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const draw = (canvas: HTMLCanvasElement | null, levelBits: number) => {
      const context = canvas?.getContext('2d');
      if (!canvas || !context) return;
      const { width, height } = canvas;
      const image = context.createImageData(width, height);
      const levels = 2 ** levelBits - 1;
      const snap = (value: number) => Math.round(Math.round(value / 255 * levels) / levels * 255);
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const sky = y / height;
        let r = 40 + 200 * sky, g = 60 + 120 * sky, b = 150 - 40 * sky;
        const sun = Math.hypot(x - width * 0.68, y - height * 0.42);
        if (sun < 22) { r = 255; g = 214 - sun * 2; b = 120; } else if (sun < 60) { const glow = 1 - (sun - 22) / 38; r += 60 * glow; g += 40 * glow; }
        const ridge = height * 0.62 + Math.sin(x / 18) * 8 + Math.sin(x / 7) * 3;
        if (y > ridge) { const depth = (y - ridge) / (height - ridge); r = 120 - 60 * depth; g = 80 - 40 * depth; b = 60 - 20 * depth; }
        const dune = height * 0.8 + Math.sin(x / 30 + 1) * 6;
        if (y > dune) { r = 214 - 40 * (y - dune) / height * 4; g = 170 - 30 * (y - dune) / height * 4; b = 110; }
        const index = (y * width + x) * 4;
        image.data[index] = snap(Math.max(0, Math.min(255, r)));
        image.data[index + 1] = snap(Math.max(0, Math.min(255, g)));
        image.data[index + 2] = snap(Math.max(0, Math.min(255, b)));
        image.data[index + 3] = 255;
      }
      context.putImageData(image, 0, 0);
    };
    draw(original.current, 8);
    draw(reduced.current, bits);
  }, [bits]);
  return <div className="hy-photo">
    <h4 className="llm-sub ft-handson"><Icon name="grid" size={13}/>{say(t('The photo picture of quantization', 'صورة الصورة الفوتوغرافية للتكميم'))}</h4>
    <div className="ft-tabs" role="group" aria-label={say(t('Bits per colour', 'بتات لكل لون'))}>
      <span>{say(t('Bits per colour', 'بتات لكل لون'))}</span>
      {[8, 4, 3, 2, 1].map(value => <button key={value} type="button" className={value === bits ? 'current' : ''} aria-pressed={value === bits}
        aria-label={say(t(`${value} bits per colour`, `${value} بت لكل لون`))} onClick={() => setBits(value)}>{value}</button>)}
    </div>
    <div className="hy-photos">
      <figure><canvas ref={original} width={240} height={150}/><figcaption>{say(t('original · 8 bits per colour', 'الأصل · 8 بتات لكل لون'))}</figcaption></figure>
      <figure><canvas ref={reduced} width={240} height={150} data-testid="photo-reduced"/>
        <figcaption>{say(t(`saved with ${bits} bits · ${2 ** bits} shades per colour · file ${Math.round(bits / 8 * 100)}%`, `محفوظة بـ ${bits} بت · ${2 ** bits} درجة لكل لون · الملف ${Math.round(bits / 8 * 100)}٪`))}</figcaption></figure>
    </div>
    <p className="lx-muted">{bits >= 4
      ? say(t('At 4 bits the picture is half the size and still clearly the same scene. That is the bet of 4-bit quantization: much less memory, a small loss of detail.',
        'عند 4 بتات تصير الصورة بنصف الحجم وما زالت المشهد نفسه بوضوح. وهذا رهان التكميم بـ 4 بت: ذاكرة أقل بكثير وفقدان صغير في التفاصيل.'))
      : say(t('Below 4 bits the bands become obvious, just as weights lose too much precision at 2–3 bits. The analogy has a limit: weights use clever level spacing such as NF4, not plain rounding.',
        'تحت 4 بتات تصبح الأشرطة واضحة، كما تفقد الأوزان دقة كبيرة عند 2–3 بتات. وللتشبيه حدود: الأوزان تستخدم توزيعًا ذكيًا للمستويات مثل NF4 لا تقريبًا بسيطًا.'))}</p>
  </div>;
}
