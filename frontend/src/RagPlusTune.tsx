/**
 * How RAG and fine-tuning work together (part 11): the open-book exam and the coach.
 * A proverb question followed through RAG and a fine-tuned Qwen, one answer built three ways,
 * the "is one enough?" chooser, and the two separate checks to run before fine-tuning.
 * All sources here are illustrative samples, not real archive records.
 */
import { useState } from 'react';
import type { ReactNode } from 'react';
import './ragtune.css';
import { Icon } from './ui';
import type { IconName } from './ui';
import { usePartNav } from './LabShell';
import { t, useTx } from './FineTuneScenes';
import type { Text } from './FineTuneScenes';
import { FlowScene } from './RagDeep';
import type { FlowStep } from './RagDeep';

const cls = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(' ');

function Heading({ icon, children }: { icon: IconName; children: ReactNode }) {
  return <h4 className="llm-sub ft-handson"><Icon name={icon} size={13}/>{children}</h4>;
}

function PartLink({ part }: { part: number }) {
  const say = useTx();
  const nav = usePartNav();
  return <button type="button" className="lx-link" onClick={() => nav.go(part)}>
    {say(t(`Part ${part + 1}`, `الجزء ${part + 1}`))}: {say(nav.parts[part].label)}<Icon name="next" size={11}/>
  </button>;
}

// ============================================================== shared sample

const PROVERB = '⁨«الجار قبل الدار»⁩';

const QUESTION = t(`What does ${PROVERB} mean, and when do people say it?`, `ما معنى ${PROVERB}، ومتى يقولها الناس؟`);

const SOURCES: { n: number; kind: Text; ref: string; quote: Text; fresh?: boolean }[] = [
  { n: 1, kind: t('Heritage book', 'كتاب تراثي'), ref: 'Heritage book (sample), p. 112',
    quote: t('Said as advice to someone choosing where to live: look at who your neighbours will be before you look at the house.',
      'تُقال نصيحةً لمن يختار مسكنه: انظر إلى من سيكون جارك قبل أن تنظر إلى البيت.') },
  { n: 2, kind: t('Interview transcript', 'نص مقابلة'), ref: 'Interview INT-2021-007, Salalah, 14:20',
    quote: t('In our family we said it to the children when a neighbour needed help: the neighbour comes first.',
      'كنا نقولها للأولاد في بيتنا حين يحتاج الجار إلى مساعدة: الجار أولًا.') },
  { n: 3, kind: t('New interview', 'مقابلة جديدة'), ref: 'Interview INT-2024-031, Mirbat, 06:45', fresh: true,
    quote: t('The elders repeat it when settling a quarrel between neighbours, to remind both sides what they owe each other.',
      'يردّدها كبار السن عند الصلح بين جارين، ليذكّروا الطرفين بحق كل منهما على الآخر.') },
];

const HABITS = [
  t('Explain Dhofari expressions in clear Arabic', 'اشرح التعابير الظفارية بعربية واضحة'),
  t('Keep the proverb’s original wording', 'احتفظ بنص المثل الأصلي'),
  t('Sources differ? Say ⁨«تختلف الروايات»⁩ and attribute each', 'إن اختلفت المصادر فقل ⁨«تختلف الروايات»⁩ وانسب كل رواية إلى مصدرها'),
];

const VERSIONS = [
  t('As advice: look at who your neighbours will be before you choose a home', 'نصيحةً: انظر إلى من سيكون جارك قبل أن تختار بيتك'),
  t('At home: said to children when a neighbour needs help, because the neighbour comes first', 'وفي البيوت: تُقال للأولاد حين يحتاج الجار إلى مساعدة، فالجار أولًا'),
  t('When making peace: elders repeat it to remind neighbours what they owe each other', 'وعند الصلح: يردّدها كبار السن ليذكّروا الجارين بحق كل منهما على الآخر'),
];

// ================================================= the scene: one proverb, both helpers

const STATIONS: { icon: IconName; name: Text }[] = [
  { icon: 'help', name: t('Ask', 'السؤال') }, { icon: 'search', name: t('Look up', 'البحث') }, { icon: 'bookmark', name: t('Evidence', 'الأدلة') },
  { icon: 'layers', name: t('Coach', 'المدرّب') }, { icon: 'sparkle', name: t('Answer', 'الإجابة') }, { icon: 'refresh', name: t('Update', 'التحديث') },
];

const STEPS: FlowStep[] = [
  { station: 0, title: t('An open-book exam with a coached student', 'امتحان بكتاب مفتوح وطالب مدرَّب'),
    text: t('Two helpers answer together. RAG is the open book: before answering, it looks things up in your approved collection. Fine-tuning is the coaching: it taught Qwen how you want answers written. A student asks about a proverb.',
      'يجيب مساعدان معًا. RAG هو الكتاب المفتوح: قبل الإجابة يبحث في مجموعتك المعتمدة. والضبط الدقيق هو التدريب: علّم Qwen كيف تريد أن تُكتب الإجابات. وطالب يسأل عن مثل.') },
  { station: 1, title: t('RAG opens the book', 'RAG يفتح الكتاب'),
    text: t('The application searches the approved heritage collection (books, documents and interview transcripts) for passages about this proverb. Nothing is recalled from memory.',
      'يبحث التطبيق في مجموعة التراث المعتمدة (كتب ووثائق ونصوص مقابلات) عن مقاطع تخص هذا المثل. لا شيء يُستدعى من الذاكرة.'),
    note: t('Hybrid search (meaning + exact words), filtered to type = proverb, top-k = 4, threshold 0.50. Part 12 builds this step by step.',
      'بحث هجين (المعنى + الكلمات نفسها)، مع تصفية النوع = مثل، و top-k = 4، وعتبة 0.50. والجزء 12 يبني هذه الخطوة خطوة خطوة.') },
  { station: 2, title: t('A few passages, with their sources', 'مقاطع قليلة مع مصادرها'),
    text: t('It selects a few relevant passages and sends them to Qwen with the question and their source details: a page in a heritage book, and the minute in a recorded family interview.',
      'يختار بضعة مقاطع ذات صلة ويرسلها إلى Qwen مع السؤال وتفاصيل مصادرها: صفحة في كتاب تراثي، والدقيقة في مقابلة مسجّلة مع أسرة.') },
  { station: 2, title: t('The sources do not agree', 'المصادر لا تتفق'),
    text: t('The book says the proverb is advice for choosing a home; the family says it is about helping a neighbour first. Both are genuine. A good answer shows both and says which source gives which.',
      'يقول الكتاب إن المثل نصيحة لاختيار المسكن، وتقول الأسرة إنه عن تقديم مساعدة الجار. وكلاهما صحيح. والإجابة الجيدة تعرض الاثنين وتذكر أي مصدر يقول ماذا.'),
    note: t('RAG supplies what a model cannot be trusted to remember: the exact wording of an interview, a page or minute reference, and documents added yesterday.',
      'يقدّم RAG ما لا يُؤتمن النموذج على تذكّره: النص الحرفي للمقابلة، ومرجع الصفحة أو الدقيقة، والوثائق المضافة بالأمس.') },
  { station: 3, title: t('What the coaching taught', 'ما علّمه التدريب'),
    text: t('Fine-tuning showed Qwen many examples of good answers. It learned habits, not facts: explain Dhofari expressions in clear Arabic, keep the proverb’s original wording, and say ⁨«تختلف الروايات»⁩ when sources give different accounts.',
      'أرى الضبط الدقيق Qwen أمثلة كثيرة لإجابات جيدة. فتعلّم عادات لا حقائق: أن يشرح التعابير الظفارية بعربية واضحة، وأن يحتفظ بنص المثل الأصلي، وأن يقول ⁨«تختلف الروايات»⁩ حين تختلف المصادر.'),
    note: t('A small LoRA adapter trained with QLoRA (parts 5–9). It can also pick up local terms and common patterns of the material.',
      'مهايئ LoRA صغير يُدرَّب بـ QLoRA (الأجزاء 5–9). ويمكن أن يلتقط أيضًا المصطلحات المحلية والأنماط الشائعة في المادة.') },
  { station: 4, title: t('The answer: evidence + style', 'الإجابة: أدلة + أسلوب'),
    text: t('Qwen writes in the style it was taught, using only the passages: the proverb unchanged, both versions explained, each tied to its source [1] [2].',
      'يكتب Qwen بالأسلوب الذي تعلّمه، مستخدمًا المقاطع وحدها: المثل بنصه، والروايتان مشروحتان، وكل واحدة مربوطة بمصدرها [1] [2].') },
  { station: 5, title: t('A new interview arrives', 'تصل مقابلة جديدة'),
    text: t('A student records a new interview in Mirbat. It is chunked, embedded and added to the searchable collection in minutes. Qwen is not retrained: the adapter stays exactly as it was.',
      'يسجّل طالب مقابلة جديدة في مرباط. فتُقطَّع وتُضمَّن وتُضاف إلى المجموعة القابلة للبحث في دقائق. ولا يُعاد تدريب Qwen: يبقى المهايئ كما هو تمامًا.') },
  { station: 5, title: t('Asked again, the new source appears', 'وعند السؤال مجددًا يظهر المصدر الجديد'),
    text: t('The same question now retrieves three passages, and the answer includes the third account [3]. The facts grew; the style stayed. The collection and the model can be updated independently.',
      'السؤال نفسه يسترجع الآن ثلاثة مقاطع، وتضم الإجابة الرواية الثالثة [3]. نمت الحقائق وبقي الأسلوب. فالمجموعة والنموذج يُحدَّثان كلٌّ على حدة.') },
];

function Chip({ n }: { n: number }) {
  return <span className="rt-cite" dir="ltr">[{n}]</span>;
}

function TogetherVisual({ step }: { step: number }) {
  const say = useTx();
  const sources = SOURCES.filter(source => !source.fresh || step >= 7);
  const shelves = [
    { icon: 'book' as IconName, name: t('Heritage books', 'كتب تراثية'), count: 38 },
    { icon: 'file' as IconName, name: t('Documents', 'وثائق'), count: 112 },
    { icon: 'mic' as IconName, name: t('Interview transcripts', 'نصوص مقابلات'), count: step >= 6 ? 65 : 64 },
  ];
  return <div className={cls('rt-stage', `s${step}`)}>
    <div className="rt-question"><span className="rt-who"><Icon name="help" size={15}/></span><p>{say(QUESTION)}</p></div>
    <div className="rt-grid">
      <div className={cls('rt-col rt-book', (step === 1 || step === 6) && 'on', step < 1 && 'wait')}>
        <b className="rt-col-name"><Icon name="library" size={13}/>{say(t('RAG · the open book', 'RAG · الكتاب المفتوح'))}</b>
        {shelves.map(shelf => <span key={shelf.name.en} className="rt-shelf"><Icon name={shelf.icon} size={13}/>{say(shelf.name)}<em dir="ltr">{shelf.count}</em></span>)}
        {step === 1 && <i className="rt-beam" aria-hidden="true"/>}
        {step >= 6 && <span className="rt-new"><Icon name="plus" size={12}/><bdi dir="ltr">INT-2024-031</bdi> {say(t('indexed', 'فُهرست'))}</span>}
      </div>
      <div className={cls('rt-col rt-evidence', (step === 2 || step === 3 || step === 7) && 'on', step < 2 && 'wait')}>
        <b className="rt-col-name"><Icon name="bookmark" size={13}/>{say(t('Passages sent to Qwen', 'مقاطع تُرسل إلى Qwen'))}</b>
        {step >= 2 ? sources.map((source, index) => <span key={source.n} className={cls('rt-passage', source.fresh && 'fresh')} style={{ animationDelay: `${index * 0.18}s` }}>
          <small><Chip n={source.n}/> {say(source.kind)} · <bdi dir="ltr">{source.ref.split(', ').slice(-1)[0]}</bdi></small>
          <q>{say(source.quote)}</q>
        </span>) : <span className="rt-empty">{say(t('waiting for the search…', 'بانتظار البحث…'))}</span>}
        {step === 3 && <span className="rt-differ"><Icon name="flame" size={12}/>{say(t('two different accounts', 'روايتان مختلفتان'))}</span>}
      </div>
      <div className={cls('rt-col rt-coach', step === 4 && 'on', step < 4 && 'wait')}>
        <b className="rt-col-name"><Icon name="layers" size={13}/>{say(t('Fine-tuned Qwen · the coach', 'Qwen المضبوط · المدرّب'))}</b>
        <span className="rt-model"><bdi dir="ltr">Qwen3.8</bdi><i>+ LoRA</i></span>
        {HABITS.map((habit, index) => <span key={habit.en} className={cls('rt-habit', step >= 4 && 'lit')} style={{ transitionDelay: `${index * 0.2}s` }}>
          <Icon name="check" size={12}/>{say(habit)}</span>)}
        {step >= 6 && <span className="rt-lock"><Icon name="lock" size={12}/>{say(t('adapter unchanged · no retraining', 'المهايئ لم يتغير · لا إعادة تدريب'))}</span>}
      </div>
    </div>
    {step >= 5 && <div className={cls('rt-answer', step === 5 || step === 7 ? 'on' : '')} data-testid="together-answer">
      <b className="rt-col-name"><Icon name="sparkle" size={13}/>{say(t('The answer the student reads', 'الإجابة التي يقرؤها الطالب'))}</b>
      <p><span className="rt-src">{PROVERB}</span>{say(t(' (“the neighbour before the house”). ', '. '))}<span className="rt-tune">{say(t('Accounts differ (تختلف الروايات):', 'تختلف الروايات:'))}</span></p>
      <ul>{VERSIONS.slice(0, step >= 7 ? 3 : 2).map((version, index) => <li key={version.en} className={index === 2 ? 'fresh' : ''}>
        <span className="rt-src">{say(version)}</span> <Chip n={index + 1}/></li>)}</ul>
      <div className="rt-legend"><span className="rag"><i/>{say(t('from RAG: wording and sources', 'من RAG: النص والمصادر'))}</span>
        <span className="tune"><i/>{say(t('from fine-tuning: the way it is told', 'من الضبط الدقيق: طريقة العرض'))}</span></div>
    </div>}
  </div>;
}

export function TogetherScene() {
  return <FlowScene id="ft-scene-together" title={t('One proverb question: RAG finds, fine-tuned Qwen explains', 'سؤال عن مثل: RAG يجد و Qwen المضبوط يشرح')} tone="#f59e0b"
    stations={STATIONS} steps={STEPS}>{step => <TogetherVisual step={step}/>}</FlowScene>;
}

// ========================================================= one answer, three ways

type Kind = 'rag' | 'tune' | 'both' | 'invented' | 'flat';
interface Piece { text: Text; kind: Kind; why: Text; cite?: number }

const WAYS: { key: string; name: Text; pieces: Piece[]; verdict: Text; good: boolean }[] = [
  { key: 'both', name: t('With both', 'مع الاثنين'), good: true,
    verdict: t('Faithful and well told: every claim has a source, and the answer reads the way you taught it.', 'أمينة وحسنة العرض: لكل معلومة مصدر، وتُقرأ الإجابة بالطريقة التي علّمتها.'),
    pieces: [
      { text: t(PROVERB, PROVERB), kind: 'both', why: t('The words come from the retrieved passage. Keeping them unchanged, instead of paraphrasing, is a habit the fine-tuning examples taught.', 'الكلمات من المقطع المسترجَع. أما إبقاؤها بنصها بدل إعادة صياغتها فعادة علّمتها أمثلة الضبط الدقيق.') },
      { text: t('Accounts differ (تختلف الروايات):', 'تختلف الروايات:'), kind: 'tune', why: t('A learned behaviour: when the passages disagree, say so and show both. A base model often blends them into one.', 'سلوك متعلَّم: حين تختلف المقاطع قل ذلك واعرض الاثنين. والنموذج الأساسي كثيرًا ما يدمجهما في واحدة.') },
      { text: VERSIONS[0], kind: 'rag', cite: 1, why: t('This content is from source [1], the heritage book, p. 112. The application adds the full reference from the metadata.', 'هذا المحتوى من المصدر [1]، الكتاب التراثي ص 112. ويضيف التطبيق المرجع الكامل من البيانات الوصفية.') },
      { text: VERSIONS[1], kind: 'rag', cite: 2, why: t('This is from source [2], interview INT-2021-007 at minute 14:20. Without RAG, no model could know what this family said.', 'هذا من المصدر [2]، المقابلة INT-2021-007 عند الدقيقة 14:20. ومن دون RAG لا يمكن لأي نموذج أن يعرف ما قالته هذه الأسرة.') },
      { text: t('Both uses share one idea: good neighbours matter more than a fine house.', 'وتجمع الروايتين فكرة واحدة: الجار الطيب أهم من الدار الجميلة.'), kind: 'tune', why: t('A short, clear summary at the students’ level of Arabic: the style taught by the training examples, drawn only from [1] and [2].', 'خلاصة قصيرة واضحة بمستوى عربية الطلاب: أسلوب علّمته أمثلة التدريب، مستمد من [1] و [2] وحدهما.') },
    ] },
  { key: 'tune', name: t('Without RAG', 'من دون RAG'), good: false,
    verdict: t('It sounds right, but one detail is invented and there is nothing to check. The second account is missing, because the model never saw that interview.', 'تبدو صحيحة، لكن فيها تفصيلًا مختلقًا ولا شيء يمكن التحقق منه. والرواية الثانية غائبة لأن النموذج لم يرَ تلك المقابلة قط.'),
    pieces: [
      { text: t(PROVERB, PROVERB), kind: 'tune', why: t('The wording is kept, as it was taught, but it is recalled from memory, not from a source.', 'النص محفوظ كما تعلّم، لكنه مستدعى من الذاكرة لا من مصدر.') },
      { text: t('It means you should choose your neighbour before your house.', 'يعني أن تختار جارك قبل بيتك.'), kind: 'tune', why: t('A common meaning the model learned well enough. But only one account is given.', 'معنى شائع تعلّمه النموذج جيدًا. لكنه يعطي رواية واحدة فقط.') },
      { text: t('It was first said by a sheikh in Nizwa in the 1800s.', 'وأول من قاله شيخ في نزوى في القرن التاسع عشر.'), kind: 'invented', why: t('Invented. No source says this. Fine-tuning teaches a voice; it does not store reliable facts, so details can be made up confidently.', 'مختلق. لا مصدر يقول هذا. فالضبط الدقيق يعلّم أسلوبًا ولا يخزّن حقائق موثوقة، فقد تُختلق التفاصيل بثقة.') },
      { text: t('(no references)', '(لا مراجع)'), kind: 'invented', why: t('There is nothing to cite. A student or a teacher cannot check where any of it came from.', 'لا شيء يُستشهد به. ولا يستطيع الطالب أو المعلم التحقق من مصدر أي شيء.') },
    ] },
  { key: 'rag', name: t('Without fine-tuning', 'من دون ضبط دقيق'), good: false,
    verdict: t('The facts are there and sourced, but the proverb is paraphrased and the two accounts are blended, so you cannot tell which source said what. Fine if this is rare; a reason to fine-tune if it keeps happening.', 'الحقائق موجودة وموثقة، لكن المثل أعيدت صياغته والروايتان مدموجتان، فلا تعرف أي مصدر قال ماذا. لا بأس إن كان هذا نادرًا، وهو سبب للضبط الدقيق إن تكرر.'),
    pieces: [
      { text: t('“The neighbours come before the dwellings.”', '⁨«الجيران يسبقون المساكن»⁩.'), kind: 'flat', why: t('Paraphrased. The base model rewrote the proverb instead of keeping its original wording.', 'أعيدت صياغته. فقد غيّر النموذج الأساسي نص المثل بدل الاحتفاظ به.') },
      { text: t('According to the documents, the expression concerns the selection of residence and assistance to neighbours', 'وفقًا للوثائق، يتعلق التعبير باختيار محل الإقامة وتقديم المساعدة للجيران'), kind: 'flat', cite: 1, why: t('Two accounts merged into one sentence, in stiff formal Arabic. Which source said which? The answer no longer shows it.', 'روايتان مدموجتان في جملة واحدة، بعربية رسمية جافة. أي مصدر قال ماذا؟ لم تعد الإجابة تُظهر ذلك.') },
      { text: t('[1][2]', '[1][2]'), kind: 'rag', why: t('The sources are real and retrieved correctly: RAG did its job. The weakness is in how the evidence was explained.', 'المصادر حقيقية واسترجعت بشكل صحيح: أدّى RAG مهمته. والضعف في طريقة شرح الأدلة.') },
    ] },
];

const KIND_NAME: Record<Kind, Text> = {
  rag: t('from RAG', 'من RAG'), tune: t('from fine-tuning', 'من الضبط الدقيق'), both: t('RAG words, fine-tuned habit', 'نص من RAG وعادة من الضبط'),
  invented: t('invented / missing', 'مختلق / غائب'), flat: t('base model, unpolished', 'نموذج أساسي غير مصقول'),
};

/** The same question answered with both, with fine-tuning only, and with RAG only: click any piece. */
export function OneAnswerThreeWays() {
  const say = useTx();
  const [way, setWay] = useState(0);
  const [focus, setFocus] = useState(0);
  const current = WAYS[way];
  const piece = current.pieces[Math.min(focus, current.pieces.length - 1)];
  return <div className="rt-ways">
    <Heading icon="layers">{say(t('One answer, three ways: who wrote which part?', 'إجابة واحدة بثلاث طرق: من كتب أي جزء؟'))}</Heading>
    <p className="lx-lead">{say(QUESTION)}</p>
    <div className="ft-tabs" role="group" aria-label={say(t('System', 'النظام'))}>
      {WAYS.map((item, index) => <button key={item.key} type="button" className={index === way ? 'current' : ''} aria-pressed={index === way}
        onClick={() => { setWay(index); setFocus(0); }}>{say(item.name)}</button>)}
    </div>
    <div className="rt-ways-grid" key={way}>
      <p className="rt-pieces" data-testid="ways-answer">{current.pieces.map((item, index) => <button key={index} type="button"
        className={cls('rt-piece', item.kind, index === focus && 'focus')} onClick={() => setFocus(index)} style={{ animationDelay: `${index * 0.12}s` }}>
        {say(item.text)}{item.cite && <Chip n={item.cite}/>}</button>)}</p>
      <div className={cls('rt-piece-why', piece.kind)} key={`${way}-${focus}`}>
        <b>{say(KIND_NAME[piece.kind])}</b><p data-testid="ways-why">{say(piece.why)}</p>
      </div>
    </div>
    <p className={current.good ? 'lx-good' : 'lx-warning bad'} data-testid="ways-verdict">{say(current.verdict)}</p>
  </div>;
}

// ============================================================ is one enough?

type Choice = 'rag' | 'tune' | 'both' | 'prompt';

const ROWS: { key: Exclude<Choice, 'prompt'>; name: Text; when: Text; icon: IconName }[] = [
  { key: 'rag', icon: 'search', name: t('RAG alone', 'RAG وحده'),
    when: t('Your main goal is to answer from your collection with references, and the base Qwen already explains the material well in Arabic.', 'هدفك الأساسي أن تجيب من مجموعتك مع المراجع، و Qwen الأساسي يشرح المادة جيدًا بالعربية أصلًا.') },
  { key: 'tune', icon: 'layers', name: t('Fine-tuning alone', 'الضبط الدقيق وحده'),
    when: t('Your main goal is a consistent style or task, such as rewriting a supplied heritage passage in simpler Arabic for students.', 'هدفك الأساسي أسلوب أو مهمة ثابتة، مثل إعادة كتابة نص تراثي مُعطى بعربية أبسط للطلاب.') },
  { key: 'both', icon: 'sparkle', name: t('RAG + fine-tuning', 'RAG + ضبط دقيق'),
    when: t('You need source-backed answers, and the base model repeatedly struggles with local expressions, the level of Arabic you want, or how to present differing accounts.', 'تحتاج إلى إجابات مدعومة بالمصادر، والنموذج الأساسي يتعثر مرارًا في التعابير المحلية، أو مستوى العربية الذي تريده، أو طريقة عرض الروايات المختلفة.') },
];

const QUESTIONS = [
  t('Must answers come from your own collection, with references?', 'هل يجب أن تأتي الإجابات من مجموعتك أنت، مع المراجع؟'),
  t('With RAG, does the base Qwen already explain the passages well, in the Arabic you want?', 'مع RAG، هل يشرح Qwen الأساسي المقاطع جيدًا أصلًا، بالعربية التي تريدها؟'),
  t('Is the job a fixed style or task on a passage the user supplies (for example, “rewrite this in simpler Arabic”)?', 'هل المهمة أسلوب أو عمل ثابت على نص يقدّمه المستخدم (مثل: ⁨«أعد كتابة هذا بعربية أبسط»⁩)؟'),
];

const PRESETS: { name: Text; answers: [boolean, boolean, boolean] }[] = [
  { name: t('TurathAI after testing', 'تراث AI بعد الاختبار'), answers: [true, false, false] },
  { name: t('A museum help desk', 'مكتب استعلامات متحف'), answers: [true, true, false] },
  { name: t('A passage simplifier', 'مبسِّط النصوص'), answers: [false, false, true] },
];

const choose = ([fromCollection, explainsWell, fixedTask]: boolean[]): Choice =>
  fromCollection ? (explainsWell ? 'rag' : 'both') : (fixedTask ? 'tune' : 'prompt');

/** Answer three questions; the matching row of the "is one enough?" table lights up. */
export function IsOneEnough() {
  const say = useTx();
  const [answers, setAnswers] = useState<boolean[]>([true, false, false]);
  const pick = choose(answers);
  const used = (index: number) => index === 0 || (index === 1 ? answers[0] : !answers[0]);
  const set = (index: number, value: boolean) => setAnswers(current => current.map((old, position) => position === index ? value : old));
  return <div className="rt-enough">
    <Heading icon="help">{say(t('Is one enough? Answer three questions', 'هل يكفي أحدهما؟ أجب عن ثلاثة أسئلة'))}</Heading>
    <div className="rt-presets">{say(t('Try:', 'جرّب:'))} {PRESETS.map(preset => <button key={preset.name.en} type="button" className="lx-link"
      onClick={() => setAnswers([...preset.answers])}>{say(preset.name)}</button>)}</div>
    <ol className="rt-questions">{QUESTIONS.map((question, index) => <li key={question.en} className={used(index) ? '' : 'skip'}>
      <span>{say(question)}</span>
      <div className="rt-yesno" role="group" aria-label={say(question)}>
        <button type="button" className={answers[index] ? 'on' : ''} aria-pressed={answers[index]} disabled={!used(index)} onClick={() => set(index, true)}>{say(t('Yes', 'نعم'))}</button>
        <button type="button" className={!answers[index] ? 'on' : ''} aria-pressed={!answers[index]} disabled={!used(index)} onClick={() => set(index, false)}>{say(t('No', 'لا'))}</button>
      </div>
      {!used(index) && <small>{say(t('not needed for this decision', 'غير لازم لهذا القرار'))}</small>}
    </li>)}</ol>
    <div className="rt-table" role="table" aria-label={say(t('When one approach may be enough', 'متى قد يكفي أسلوب واحد'))}>
      <div className="rt-row head" role="row"><span role="columnheader">{say(t('Approach', 'الأسلوب'))}</span><span role="columnheader">{say(t('When it may be enough', 'متى قد يكفي'))}</span></div>
      {ROWS.map(row => <div key={row.key} role="row" className={cls('rt-row', row.key, pick === row.key && 'on')} data-testid={pick === row.key ? 'enough-pick' : undefined}>
        <span role="cell"><Icon name={row.icon} size={14}/><b>{say(row.name)}</b></span><span role="cell">{say(row.when)}</span></div>)}
    </div>
    {pick === 'prompt' && <p className="lx-warning" data-testid="enough-pick"><Icon name="bulb" size={14}/><span>{say(t('Neither yet: if answers need no collection and no fixed task, try base Qwen with a good prompt first.',
      'لا هذا ولا ذاك بعد: إن لم تحتج الإجابات إلى مجموعة ولا إلى مهمة ثابتة، فجرّب Qwen الأساسي مع تلقين جيد أولًا.'))}</span></p>}
    <p className="lx-key"><Icon name="bulb" size={14}/><span>{say(t('You can only answer question 2 honestly by testing. So build RAG first, ask real heritage questions, and use the two checks below. Fine-tuning comes after, only if the tests ask for it.',
      'لا يمكنك الإجابة عن السؤال 2 بصدق إلا بالاختبار. لذا ابنِ RAG أولًا، واطرح أسئلة تراثية حقيقية، واستخدم الفحصين أدناه. ويأتي الضبط الدقيق بعد ذلك، وفقط إن طلبته الاختبارات.'))}</span></p>
  </div>;
}

// ===================================================== RAG first: two separate checks

const CASES: { question: Text; got: Text; answer: Text; found: boolean; explained: boolean; lesson: Text }[] = [
  { question: QUESTION, found: true, explained: true,
    got: t('Heritage book, p. 112: the proverb and its use', 'كتاب تراثي ص 112: المثل واستعماله'),
    answer: t('Keeps the proverb as it is, explains it in clear Arabic, and cites [1].', 'يحتفظ بنص المثل، ويشرحه بعربية واضحة، ويستشهد بـ [1].'),
    lesson: t('Nothing to fix: RAG with the base model handled this one.', 'لا شيء يحتاج إلى إصلاح: تكفّل RAG مع النموذج الأساسي بهذا السؤال.') },
  { question: t('When do people say ⁨«اللي ما يعرف الصقر يشويه»⁩?', 'متى يقول الناس ⁨«اللي ما يعرف الصقر يشويه»⁩؟'), found: false, explained: true,
    got: t('A field note on the falconry season (matched the word “falcon”)', 'ملاحظة ميدانية عن موسم الصيد بالصقور (طابقت كلمة ⁨«الصقر»⁩)'),
    answer: t('Explains, faithfully and clearly, how falcons are trained for hunting.', 'يشرح بأمانة ووضوح كيف تُدرَّب الصقور على الصيد.'),
    lesson: t('A search problem. The model explained what it was given; it was given the wrong passage. Improve the search (a type = proverb filter, keyword search) or the collection. Fine-tuning cannot fix this.',
      'مشكلة بحث. شرح النموذج ما أُعطي، لكنه أُعطي المقطع الخطأ. حسّن البحث (تصفية النوع = مثل، والبحث بالكلمات) أو المجموعة. والضبط الدقيق لا يصلح هذا.') },
  { question: t('What is ⁨«الهبطة»⁩ in the Eid story?', 'ما ⁨«الهبطة»⁩ في قصة العيد؟'), found: true, explained: false,
    got: t('Interview INT-2019-022 about the market held before Eid', 'المقابلة INT-2019-022 عن السوق الذي يُقام قبل العيد'),
    answer: t('Explains ⁨«الهبطة»⁩ by its dictionary meaning, “a descent or a landing”, and ignores the market in the passage.', 'يشرح ⁨«الهبطة»⁩ بمعناها المعجمي ⁨«النزول أو الهبوط»⁩، ويتجاهل السوق المذكور في المقطع.'),
    lesson: t('Right evidence, poor explanation of a local term. If this keeps happening, fine-tuning examples on local terms are the fix.',
      'الدليل صحيح والشرح ضعيف لمصطلح محلي. وإن تكرر هذا فأمثلة ضبط دقيق على المصطلحات المحلية هي العلاج.') },
  { question: t('How does the story DHF-2018-014 end?', 'كيف تنتهي القصة DHF-2018-014؟'), found: true, explained: false,
    got: t('Two recordings of the story, with two different endings', 'تسجيلان للقصة بنهايتين مختلفتين'),
    answer: t('Tells one ending as if it were the only one, and does not say which recording it came from.', 'يروي نهاية واحدة كأنها الوحيدة، ولا يذكر من أي تسجيل جاءت.'),
    lesson: t('Right evidence, but differing accounts are not presented. Teach ⁨«تختلف الروايات»⁩ with fine-tuning examples if it repeats.',
      'الدليل صحيح لكن الروايات المختلفة لم تُعرض. علّم ⁨«تختلف الروايات»⁩ بأمثلة ضبط دقيق إن تكرر ذلك.') },
  { question: t('What does a proverb from a village not yet recorded mean?', 'ما معنى مثل من قرية لم تُسجَّل بعد؟'), found: false, explained: false,
    got: t('Nothing above the 0.50 threshold (best match 0.29)', 'لا شيء فوق عتبة 0.50 (أفضل تطابق 0.29)'),
    answer: t('Invents a meaning anyway, confidently.', 'يختلق معنى على أي حال، بثقة.'),
    lesson: t('First a gap in the collection: record or add a source. Inventing when nothing is found is also a behaviour problem: add a “my sources do not say” rule, and training examples if it persists.',
      'أولًا فجوة في المجموعة: سجّل مصدرًا أو أضفه. والاختلاق حين لا يوجد شيء مشكلة سلوك أيضًا: أضف قاعدة ⁨«مصادري لا تذكر ذلك»⁩، وأمثلة تدريب إن استمر.') },
];

type Mark = boolean | null;

/** Mark each test answer on two separate checks; the summary says what to fix, and whether to fine-tune. */
export function TwoChecks() {
  const say = useTx();
  const [marks, setMarks] = useState<[Mark, Mark][]>(() => CASES.map(() => [null, null]));
  const mark = (index: number, check: 0 | 1, value: boolean) =>
    setMarks(current => current.map((pair, position) => position === index ? (check === 0 ? [value, pair[1]] : [pair[0], value]) : pair));
  const done = marks.filter(pair => pair[0] !== null && pair[1] !== null).length;
  const right = marks.reduce((sum, pair, index) => sum + (pair[0] === CASES[index].found ? 1 : 0) + (pair[1] === CASES[index].explained ? 1 : 0), 0);
  const searchMisses = CASES.filter(item => !item.found).length;
  const explainMisses = CASES.filter(item => item.found && !item.explained).length;
  return <div className="rt-checks">
    <Heading icon="check">{say(t('Test RAG first: two separate checks', 'اختبر RAG أولًا: فحصان منفصلان'))}</Heading>
    <p className="lx-lead">{say(t('Five real test questions were asked to base Qwen with RAG. For each, judge two things separately. Did it find the right passage? Did it explain the passage well?',
      'طُرحت خمسة أسئلة اختبار حقيقية على Qwen الأساسي مع RAG. احكم على أمرين منفصلين في كل منها: هل وجد المقطع الصحيح؟ وهل شرح المقطع جيدًا؟'))}</p>
    <div className="rt-two">
      <span className="rag"><b>1</b>{say(t('Did it find the right passage?', 'هل وجد المقطع الصحيح؟'))}<small>{say(t('No → improve the search or the collection', 'لا ← حسّن البحث أو المجموعة'))}</small></span>
      <span className="tune"><b>2</b>{say(t('Did it explain it well?', 'هل شرحه جيدًا؟'))}<small>{say(t('Repeatedly no → fine-tuning can help', 'لا مرارًا ← الضبط الدقيق قد يساعد'))}</small></span>
    </div>
    <ol className="rt-cases">{CASES.map((item, index) => {
      const [found, explained] = marks[index];
      const finished = found !== null && explained !== null;
      return <li key={item.question.en} className={cls(finished && 'finished')}>
        <p className="rt-case-q"><Icon name="help" size={13}/>{say(item.question)}</p>
        <dl><div><dt>{say(t('Retrieved', 'المسترجَع'))}</dt><dd>{say(item.got)}</dd></div><div><dt>{say(t('Answer', 'الإجابة'))}</dt><dd>{say(item.answer)}</dd></div></dl>
        <div className="rt-marks">
          {([0, 1] as const).map(check => {
            const value = marks[index][check];
            const truth = check === 0 ? item.found : item.explained;
            return <div key={check} className={cls('rt-mark', check === 0 ? 'rag' : 'tune', value !== null && finished && (value === truth ? 'good' : 'bad'))}>
              <span>{check === 0 ? say(t('1 · Right passage?', '1 · المقطع الصحيح؟')) : say(t('2 · Explained well?', '2 · شُرح جيدًا؟'))}</span>
              <button type="button" className={value === true ? 'on' : ''} aria-pressed={value === true} onClick={() => mark(index, check, true)}>✓</button>
              <button type="button" className={value === false ? 'on' : ''} aria-pressed={value === false} onClick={() => mark(index, check, false)}>✗</button>
              {finished && <em>{value === truth ? say(t('agreed', 'متفق')) : say(t(`it was ${truth ? '✓' : '✗'}`, `الصواب ${truth ? '✓' : '✗'}`))}</em>}
            </div>;
          })}
        </div>
        {finished && <p className={cls('rt-lesson', !item.found ? 'rag' : !item.explained ? 'tune' : 'ok')} data-testid="check-lesson">{say(item.lesson)}</p>}
      </li>;
    })}</ol>
    <div className="rt-tally" data-testid="checks-tally">
      <span>{say(t(`${done} of ${CASES.length} judged · ${right} of ${CASES.length * 2} marks agree`, `${done} من ${CASES.length} قيّمت · ${right} من ${CASES.length * 2} أحكام متفقة`))}</span>
      {done === CASES.length && <p>{say(t(`Search or collection problems: ${searchMisses} — fix those first, fine-tuning will not help. Right passage, weak explanation: ${explainMisses} — the same kinds of failure (local terms, differing accounts) repeat, so fine-tuning is justified for exactly those.`,
        `مشكلات بحث أو مجموعة: ${searchMisses} — أصلحها أولًا، فالضبط الدقيق لن يساعد. مقطع صحيح وشرح ضعيف: ${explainMisses} — ويتكرر النوع نفسه من الخطأ (مصطلحات محلية، روايات مختلفة)، فالضبط الدقيق مبرَّر لهذين بالضبط.`))}</p>}
      {done > 0 && <button type="button" className="lx-link" onClick={() => setMarks(CASES.map(() => [null, null]))}>{say(t('Start again', 'ابدأ من جديد'))}</button>}
    </div>
    <p className="lx-key"><Icon name="book" size={14}/><span>{say(t('For TurathAI: start with Qwen + RAG on real questions about Omani intangible heritage. Add fine-tuning only if the tests show it still struggles with local language, terminology, or how to explain different versions of a story.',
      'لمشروع تراث AI: ابدأ بـ Qwen + RAG على أسئلة حقيقية عن التراث العُماني غير المادي. وأضف الضبط الدقيق فقط إن أظهرت الاختبارات أنه ما زال يتعثر في اللغة المحلية أو المصطلحات أو شرح الروايات المختلفة للقصة.'))}</span></p>
    <div className="rt-links"><PartLink part={11}/><PartLink part={9}/><PartLink part={13}/></div>
  </div>;
}
