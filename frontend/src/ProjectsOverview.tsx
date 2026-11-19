/**
 * Part 13 of the fine-tuning lab, "Two projects, one recipe": the course goal in one place.
 * Both student projects teach a free, open-weight foundation model (Qwen3.8 8B or 27B) to be an
 * expert: TurathAI in Omani intangible heritage, UTAS-70 in recognising Omani plants. Both use RAG
 * for the facts and their references and fine-tuning for the expert way of answering; UTAS-70 adds
 * computer vision (YOLO) in front. Tools: the brief, choosing 8B or 27B, a roadmap per project with
 * links to the parts that teach each step, and a game sorting jobs between vision, RAG and fine-tuning.
 */
import { useState } from 'react';
import type { CSSProperties } from 'react';
import './projects.css';
import { Icon } from './ui';
import type { IconName } from './ui';
import { usePartNav } from './LabShell';
import { t, useTx } from './FineTuneScenes';
import type { Text } from './FineTuneScenes';
import { FlowScene } from './RagDeep';
import type { FlowStep } from './RagDeep';
import { GPUS, MODEL_SIZES, budget } from './finetuneModel';

const cls = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');
const delay = (index: number, step = 0.1): CSSProperties => ({ animationDelay: `${index * step}s` });

/** Lab part indices (0-based) used for links. */
const P = { data: 2, qlora: 6, unsloth: 7, step: 8, workflow: 9, hybrid: 10, rag: 11, turath: 13, vision: 14, utas: 15 };

function PartLink({ part }: { part: number }) {
  const say = useTx();
  const nav = usePartNav();
  return <button type="button" className="lx-link" onClick={() => nav.go(part)}>
    {say(t(`Part ${part + 1}`, `الجزء ${part + 1}`))}: {say(nav.parts[part].label)}<Icon name="next" size={11}/>
  </button>;
}

type Job = 'vision' | 'rag' | 'ft';
const JOB: Record<Job, { name: Text; short: Text; icon: IconName; tone: string }> = {
  vision: { name: t('Computer vision (YOLO)', 'الرؤية الحاسوبية (YOLO)'), short: t('sees', 'يرى'), icon: 'grid', tone: '#5ef2a0' },
  rag: { name: t('RAG archive', 'أرشيف RAG'), short: t('knows the facts', 'يعرف الحقائق'), icon: 'library', tone: '#60a5fa' },
  ft: { name: t('Fine-tuned Qwen', 'Qwen المضبوط'), short: t('speaks like an expert', 'يتكلم كخبير'), icon: 'chip', tone: '#a78bfa' },
};

// ------------------------------------------------------------- the scene

const STATIONS: { icon: IconName; name: Text }[] = [
  { icon: 'target', name: t('Goal', 'الهدف') }, { icon: 'download', name: t('Base model', 'النموذج الأساسي') },
  { icon: 'chip', name: t('Fine-tuning', 'الضبط الدقيق') }, { icon: 'library', name: t('RAG', 'RAG') },
  { icon: 'grid', name: t('Vision', 'الرؤية') }, { icon: 'book', name: t('TurathAI', 'تراث AI') },
  { icon: 'sparkle', name: t('UTAS-70', 'UTAS-70') }, { icon: 'check', name: t('The recipe', 'الوصفة') },
];

const STEPS: FlowStep[] = [
  { station: 0, title: t('The goal of both projects', 'هدف المشروعين'),
    text: t('Take a free, open-weight foundation model and make it an expert in something it barely knows: Omani intangible heritage (TurathAI), and recognising Omani plants (UTAS-70).',
      'خذ نموذجًا أساسيًا مجانيًا مفتوح الأوزان، واجعله خبيرًا في شيء لا يكاد يعرفه: التراث العُماني غير المادي (تراث AI)، والتعرف على نباتات عُمان (UTAS-70).') },
  { station: 1, title: t('Start from a free, open-weight model', 'ابدأ من نموذج مجاني مفتوح الأوزان'),
    text: t('Qwen3.8 8B or 27B: the weights are downloaded and run on your own GPU, so no data leaves the university. It already speaks Arabic and English, but knows little about Omani stories or Dhofar plants.',
      'Qwen3.8 بحجم 8B أو 27B: تُنزَّل الأوزان وتعمل على بطاقة GPU الخاصة بك، فلا تخرج أي بيانات من الجامعة. وهو يتكلم العربية والإنجليزية، لكنه لا يعرف إلا القليل عن القصص العُمانية أو نباتات ظفار.'),
    note: t('Pilot everything on 8B; train the final model on 27B only if a 24 GB or larger GPU is available. Compare them in the model chooser below.', 'جرّب كل شيء على 8B، ودرّب النموذج النهائي على 27B فقط إن توفرت بطاقة GPU بسعة 24 غ.ب أو أكبر. وقارن بينهما في أداة اختيار النموذج أدناه.') },
  { station: 2, title: t('Fine-tuning teaches the expert’s voice', 'الضبط الدقيق يعلّم صوت الخبير'),
    text: t('QLoRA trains a small adapter on a few hundred to two thousand reviewed examples. It learns how an expert answers: the structure, the Omani Arabic, citing sources, and saying “not in my sources” instead of guessing.',
      'يدرّب QLoRA مهايئًا صغيرًا على بضع مئات إلى ألفي مثال مراجَع. فيتعلم كيف يجيب الخبير: البنية، والعربية العُمانية، والاستشهاد بالمصادر، وقول “غير موجود في مصادري” بدل التخمين.') },
  { station: 3, title: t('RAG holds the facts, with references', 'RAG يحفظ الحقائق مع مراجعها'),
    text: t('The key component of both projects. All verified sources are indexed in an archive; for every question the right passages are retrieved and handed to the model with their references. Adding a source never requires retraining.',
      'المكوّن الأساسي في المشروعين. تُفهرس كل المصادر الموثقة في أرشيف، ومع كل سؤال تُسترجع المقاطع الصحيحة وتُسلَّم إلى النموذج مع مراجعها. وإضافة مصدر لا تتطلب إعادة تدريب أبدًا.') },
  { station: 4, title: t('UTAS-70 adds eyes: computer vision first', 'يضيف UTAS-70 عينين: الرؤية الحاسوبية أولًا'),
    text: t('A user of UTAS-70 starts with a photo, not a name. A fine-tuned YOLO model recognises the plant first; its name then becomes the key that opens the RAG archive. TurathAI starts from text, so it does not need this step.',
      'يبدأ مستخدم UTAS-70 بصورة لا باسم. فيتعرف نموذج YOLO المضبوط على النبات أولًا، ثم يصبح اسمه المفتاح الذي يفتح أرشيف RAG. أما تراث AI فيبدأ من نص، فلا يحتاج إلى هذه الخطوة.') },
  { station: 5, title: t('TurathAI: a question becomes a story', 'تراث AI: السؤال يصبح قصة'),
    text: t('“How did people in Dhofar prepare for the monsoon?” → RAG retrieves the recorded story and its record → the fine-tuned model tells it in a warm, faithful voice → the answer cites story DHF-2018-014.',
      '“كيف كان أهل ظفار يستعدون للخريف؟” ← يسترجع RAG القصة المسجلة وسجلها ← يرويها النموذج المضبوط بصوت دافئ أمين ← وتستشهد الإجابة بالقصة DHF-2018-014.') },
  { station: 6, title: t('UTAS-70: a photo becomes an expert answer', 'UTAS-70: الصورة تصبح إجابة خبير'),
    text: t('Photo → YOLO: “Boswellia sacra, 89%” → RAG retrieves that plant’s passages with their pages → the fine-tuned model writes names, uses and cautions in its learned style → the answer cites Source A, p. 113.',
      'صورة ← YOLO: “Boswellia sacra، 89٪” ← يسترجع RAG مقاطع هذا النبات مع صفحاتها ← يكتب النموذج المضبوط الأسماء والاستخدامات والتحذيرات بأسلوبه المتعلَّم ← وتستشهد الإجابة بالمصدر A، ص 113.') },
  { station: 7, title: t('One recipe, one extra ingredient', 'وصفة واحدة ومكوّن إضافي واحد'),
    text: t('Facts come from RAG. The way of answering comes from fine-tuning. Seeing comes from vision, when the input is a photo. Learn the recipe once and you can build either project, or your own.',
      'الحقائق تأتي من RAG، وطريقة الإجابة تأتي من الضبط الدقيق، والرؤية تأتي من نموذج الرؤية حين يكون المدخل صورة. تعلّم الوصفة مرة واحدة، وستستطيع بناء أيٍّ من المشروعين، أو مشروعك أنت.') },
];

const COLUMNS: { key: string; name: Text; icon: IconName }[] = [
  { key: 'input', name: t('The user gives', 'يعطي المستخدم'), icon: 'help' },
  { key: 'vision', name: t('Vision', 'الرؤية'), icon: 'grid' },
  { key: 'rag', name: t('RAG archive', 'أرشيف RAG'), icon: 'library' },
  { key: 'model', name: t('Fine-tuned Qwen', 'Qwen المضبوط'), icon: 'chip' },
  { key: 'answer', name: t('Answer', 'الإجابة'), icon: 'check' },
];

const LANES: { key: 'turath' | 'utas'; name: string; tone: string; aim: Text; cells: Record<string, Text | null> }[] = [
  { key: 'turath', name: 'TurathAI', tone: '#2dd4bf', aim: t('expert in Omani intangible heritage', 'خبير في التراث العُماني غير المادي'),
    cells: {
      input: t('a question in Arabic', 'سؤال بالعربية'), vision: null,
      rag: t('stories, UNESCO files, books', 'قصص وملفات اليونسكو وكتب'),
      model: t('storyteller voice', 'صوت الراوي'), answer: t('the story + its source', 'القصة + مصدرها'),
    } },
  { key: 'utas', name: 'UTAS-70', tone: '#86efac', aim: t('expert in recognising Omani plants', 'خبير في التعرف على نباتات عُمان'),
    cells: {
      input: t('a photo + a question', 'صورة + سؤال'), vision: t('YOLO → plant name', 'YOLO ← اسم النبات'),
      rag: t('flora books, papers, field notes', 'كتب نباتات وأبحاث وملاحظات ميدانية'),
      model: t('botanist’s style', 'أسلوب عالم النبات'), answer: t('names, uses, cautions + pages', 'أسماء واستخدامات وتحذيرات + صفحات'),
    } },
];

const FOCUS: Record<number, string[]> = { 0: [], 1: ['model'], 2: ['model'], 3: ['rag'], 4: ['vision'], 5: ['input', 'rag', 'model', 'answer'], 6: ['input', 'vision', 'rag', 'model', 'answer'], 7: [] };

function Lanes({ step }: { step: number }) {
  const say = useTx();
  const focus = FOCUS[step];
  const running = step === 5 ? 'turath' : step === 6 ? 'utas' : null;
  return <div className={cls('po-lanes', `s${step}`)}>
    <div className="po-base" style={delay(0)}>
      <Icon name="download" size={14}/><b dir="ltr">Qwen3.8 · 8B / 27B</b><span>{say(t('free, open-weight foundation model, shared by both projects', 'نموذج أساسي مجاني مفتوح الأوزان، مشترك بين المشروعين'))}</span>
    </div>
    <div className="po-head">{COLUMNS.map(column => <span key={column.key} className={cls(focus.includes(column.key) && 'on')}><Icon name={column.icon} size={12}/>{say(column.name)}</span>)}</div>
    {LANES.map((lane, laneIndex) => <div key={lane.key} className={cls('po-lane', lane.key, running === lane.key && 'run', running !== null && running !== lane.key && 'quiet')} style={{ '--lane': lane.tone, ...delay(laneIndex + 1, 0.2) } as CSSProperties}>
      <div className="po-lane-name"><b>{lane.name}</b><small>{say(lane.aim)}</small></div>
      <div className="po-cells">
        {COLUMNS.map((column, columnIndex) => {
          const cell = lane.cells[column.key];
          return <span key={column.key} className={cls('po-cell', column.key, !cell && 'none', focus.includes(column.key) && 'on', step === 2 && column.key === 'model' && 'adapter')}
            style={running === lane.key ? delay(columnIndex, 0.45) : undefined}>
            {cell ? say(cell) : say(t('not needed: starts from text', 'غير مطلوب: يبدأ من نص'))}
          </span>;
        })}
        {running === lane.key && <i className="po-packet"/>}
      </div>
    </div>)}
    {step === 7 && <div className="po-recipe">
      {(['rag', 'ft', 'vision'] as Job[]).map((job, index) => <span key={job} style={{ '--job': JOB[job].tone, ...delay(index, 0.2) } as CSSProperties}>
        <Icon name={JOB[job].icon} size={14}/><b>{say(JOB[job].name)}</b>{say(JOB[job].short)}</span>)}
    </div>}
  </div>;
}

export function RecipeScene() {
  return <FlowScene id="ft-scene-recipe" title={t('Two projects, one recipe', 'مشروعان ووصفة واحدة')} tone="#86efac" stations={STATIONS} steps={STEPS}>
    {step => <Lanes step={step}/>}
  </FlowScene>;
}

// ------------------------------------------------------------- the brief

const BRIEF: { key: 'turath' | 'utas'; name: string; tone: string; rows: [Text, Text][] }[] = [
  { key: 'turath', name: 'TurathAI', tone: '#2dd4bf', rows: [
    [t('Goal', 'الهدف'), t('A model that knows and tells Omani intangible heritage faithfully.', 'نموذج يعرف التراث العُماني غير المادي ويرويه بأمانة.')],
    [t('Base model', 'النموذج الأساسي'), t('Qwen3.8 8B (pilot) → 27B (final), open weight.', 'Qwen3.8 بحجم 8B (تجربة) ← 27B (نهائي)، مفتوح الأوزان.')],
    [t('Fine-tuning teaches', 'يعلّم الضبط الدقيق'), t('The storyteller’s voice in Omani Arabic, using retrieved stories, citing them, admitting gaps.', 'صوت الراوي بالعربية العُمانية، واستخدام القصص المسترجعة، والاستشهاد بها، والاعتراف بالنقص.')],
    [t('RAG holds', 'يحفظ RAG'), t('Verified stories, UNESCO element files, books: each with story id, place, year, source.', 'قصص موثقة وملفات عناصر اليونسكو وكتب: كلٌّ مع رقم القصة والمكان والسنة والمصدر.')],
    [t('Vision', 'الرؤية'), t('Not needed: the user asks in text.', 'غير مطلوبة: يسأل المستخدم بالنص.')],
    [t('The answer', 'الإجابة'), t('The story, told well, with its source.', 'القصة، مروية جيدًا، مع مصدرها.')],
  ] },
  { key: 'utas', name: 'UTAS-70', tone: '#86efac', rows: [
    [t('Goal', 'الهدف'), t('A model that recognises Omani plants and explains them like a botanist.', 'نموذج يتعرف على نباتات عُمان ويشرحها كعالم نبات.')],
    [t('Base model', 'النموذج الأساسي'), t('Qwen3.8 8B (pilot) → 27B (final), open weight.', 'Qwen3.8 بحجم 8B (تجربة) ← 27B (نهائي)، مفتوح الأوزان.')],
    [t('Fine-tuning teaches', 'يعلّم الضبط الدقيق'), t('The botanist’s answer shape: names, description, place, uses, cautions, sources.', 'شكل إجابة عالم النبات: الأسماء والوصف والمكان والاستخدامات والتحذيرات والمصادر.')],
    [t('RAG holds', 'يحفظ RAG'), t('Flora books, papers, field notes, herbarium sheets: each passage tagged with species, topic, page.', 'كتب النباتات والأبحاث والملاحظات الميدانية وعيّنات المعشبة: كل مقطع موسوم بالنوع والموضوع والصفحة.')],
    [t('Vision', 'الرؤية'), t('YOLO, fine-tuned on labelled photos, recognises the plant first.', 'YOLO، المضبوط على صور موسومة، يتعرف على النبات أولًا.')],
    [t('The answer', 'الإجابة'), t('Plant name + details + references, in the user’s language.', 'اسم النبات + التفاصيل + المراجع، بلغة المستخدم.')],
  ] },
];

/** The course goal and the two projects, formatted as one brief. */
export function CourseBrief() {
  const say = useTx();
  return <div className="po-brief">
    <h4 className="llm-sub ft-handson first"><Icon name="target" size={13}/>{say(t('The course goal', 'هدف المقرر'))}</h4>
    <p className="po-goal">{say(t('Learn how to take a free, open-weight foundation model (Qwen3.8 8B or 27B) and turn it into an expert in an Omani subject, by combining three techniques: RAG for verified facts and references, fine-tuning for the expert way of answering, and, when the input is a photo, computer vision.',
      'تعلّم كيف تأخذ نموذجًا أساسيًا مجانيًا مفتوح الأوزان (Qwen3.8 بحجم 8B أو 27B) وتحوّله إلى خبير في موضوع عُماني، بالجمع بين ثلاث تقنيات: RAG للحقائق الموثقة ومراجعها، والضبط الدقيق لطريقة إجابة الخبير، والرؤية الحاسوبية حين يكون المدخل صورة.'))}</p>
    <div className="po-cards">
      {BRIEF.map(project => <article key={project.key} className="po-card" style={{ '--lane': project.tone } as CSSProperties}>
        <b className="po-card-name">{project.name}</b>
        <dl>{project.rows.map(([key, value]) => <div key={key.en}><dt>{say(key)}</dt><dd>{say(value)}</dd></div>)}</dl>
      </article>)}
    </div>
    <div className="po-jobs">
      {(['rag', 'ft', 'vision'] as Job[]).map(job => <div key={job} style={{ '--job': JOB[job].tone } as CSSProperties}>
        <Icon name={JOB[job].icon} size={18}/><b>{say(JOB[job].name)}</b><span>{say(JOB[job].short)}</span>
        <small>{say(job === 'rag' ? t('both projects · the key component', 'المشروعان · المكوّن الأساسي') : job === 'ft' ? t('both projects', 'المشروعان') : t('UTAS-70 only', 'UTAS-70 فقط'))}</small>
      </div>)}
    </div>
  </div>;
}

// ------------------------------------------------------- 8B or 27B?

/** Qwen3.8 8B or 27B: memory to train with QLoRA and to serve, and which GPUs fit. */
export function ModelChoice() {
  const say = useTx();
  const [pick, setPick] = useState<'8B' | '27B'>('8B');
  const size = MODEL_SIZES.find(item => item.label === pick)!;
  const train = budget(size, 4, 16, true).totalGb;
  const serve = size.billions * 1e9 * 4 / 8 / 1024 ** 3 + 2;
  const gpus = [GPUS[1], GPUS[2], GPUS[3], GPUS[4]];
  return <div className="po-model">
    <h4 className="llm-sub ft-handson"><Icon name="chip" size={13}/>{say(t('Qwen3.8 8B or 27B?', 'Qwen3.8 بحجم 8B أم 27B؟'))}</h4>
    <div className="ft-tabs" role="group" aria-label={say(t('Model size', 'حجم النموذج'))}>
      {(['8B', '27B'] as const).map(label => <button key={label} type="button" className={pick === label ? 'current' : ''} aria-pressed={pick === label} onClick={() => setPick(label)}>Qwen3.8 {label}</button>)}
    </div>
    <div className="po-model-grid" key={pick}>
      <div className="po-figures">
        <span><b dir="ltr">{size.billions}</b>{say(t('billion parameters', 'مليار معامل'))}</span>
        <span><b dir="ltr" data-testid="train-gb">{train.toFixed(1)} GB</b>{say(t('to train with QLoRA (rank 16)', 'للتدريب بـ QLoRA (رتبة 16)'))}</span>
        <span><b dir="ltr">{serve.toFixed(1)} GB</b>{say(t('to answer questions (4-bit)', 'للإجابة عن الأسئلة (4 بت)'))}</span>
      </div>
      <div className="po-fits" data-testid="gpu-fits">
        {gpus.map(gpu => <div key={gpu.gb} className={train <= gpu.gb ? 'fits' : 'no'}>
          <span dir="ltr">{gpu.gb} GB</span><small>{gpu.name}</small>
          <i><em style={{ width: `${Math.min(100, train / gpu.gb * 100)}%` }}/></i>
          <b>{train <= gpu.gb ? '✓' : '✕'}</b>
        </div>)}
      </div>
    </div>
    <p className="pc-kind">{say(pick === '8B'
      ? t('8B trains on a free 16 GB T4 (Kaggle or Colab). Faster and cheaper: ideal to pilot the data, the prompts and the RAG pipeline, and often good enough when RAG supplies the facts.',
        '8B يتدرّب على بطاقة T4 المجانية بسعة 16 غ.ب (Kaggle أو Colab). أسرع وأرخص: مثالي لتجربة البيانات والتلقينات وخط RAG، وكثيرًا ما يكفي حين يقدّم RAG الحقائق.')
      : t('27B needs a 24 GB GPU or larger to train (a rented RTX 4090 or A-series card). Better Arabic and reasoning, but each experiment costs more and runs slower. Move to it after the 8B pilot works.',
        '27B يحتاج إلى بطاقة GPU بسعة 24 غ.ب أو أكبر للتدريب (RTX 4090 مستأجرة أو بطاقة من الفئة A). عربية واستدلال أفضل، لكن كل تجربة أغلى وأبطأ. انتقل إليه بعد نجاح تجربة 8B.'))}</p>
    <p className="pc-note"><Icon name="bulb" size={13}/>{say(t('A rough classroom estimate. Because RAG supplies the facts, a smaller fine-tuned model often answers as accurately as a larger one: compare both on the same test questions before paying for the larger GPU.',
      'تقدير تقريبي للدرس. ولأن RAG يقدّم الحقائق، كثيرًا ما يجيب النموذج المضبوط الأصغر بدقة الأكبر: فقارن الاثنين على أسئلة الاختبار نفسها قبل الدفع مقابل البطاقة الأكبر.'))}</p>
    <PartLink part={P.qlora}/>
  </div>;
}

// --------------------------------------------------------------- roadmap

type Project = 'turath' | 'utas';
const ROADMAP: Record<Project, { job: Job | 'plan'; name: Text; output: Text; part: number }[]> = {
  turath: [
    { job: 'plan', name: t('Collect and verify the sources', 'اجمع المصادر وتحقق منها'), output: t('Source register: stories, UNESCO files, books, with permissions', 'سجل المصادر: قصص وملفات اليونسكو وكتب، مع الأذونات'), part: P.data },
    { job: 'rag', name: t('Build the RAG archive', 'ابنِ أرشيف RAG'), output: t('Stories chunked by scene, embedded, stored with story id, place, year', 'قصص مقطّعة حسب المشهد ومضمَّنة ومخزّنة مع رقم القصة والمكان والسنة'), part: P.rag },
    { job: 'ft', name: t('Write the style examples (JSONL)', 'اكتب أمثلة الأسلوب (JSONL)'), output: t('Question + retrieved story → answer in the storyteller’s voice, with citation', 'سؤال + قصة مسترجعة ← إجابة بصوت الراوي مع الاستشهاد'), part: P.data },
    { job: 'ft', name: t('Fine-tune Qwen with QLoRA', 'اضبط Qwen بـ QLoRA'), output: t('The TurathAI LoRA adapter (pilot 8B, then 27B)', 'مهايئ تراث AI من نوع LoRA (تجربة 8B ثم 27B)'), part: P.unsloth },
    { job: 'rag', name: t('Join RAG and the model', 'اربط RAG بالنموذج'), output: t('Question → passages → prompt → cited answer', 'سؤال ← مقاطع ← تلقين ← إجابة موثقة'), part: P.hybrid },
    { job: 'plan', name: t('Evaluate three systems', 'قيّم ثلاثة أنظمة'), output: t('Base vs fine-tuned vs fine-tuned + RAG, on unseen questions', 'الأساسي مقابل المضبوط مقابل المضبوط + RAG، على أسئلة جديدة'), part: P.workflow },
    { job: 'plan', name: t('Study the full project', 'ادرس المشروع كاملًا'), output: t('Phases, dataset split, memory plan, rubric', 'المراحل وتقسيم البيانات وخطة الذاكرة ومعايير التقييم'), part: P.turath },
  ],
  utas: [
    { job: 'plan', name: t('Collect and verify the sources', 'اجمع المصادر وتحقق منها'), output: t('Flora books, papers, field notes, herbarium sheets, with pages', 'كتب نباتات وأبحاث وملاحظات ميدانية وعيّنات معشبة، مع الصفحات'), part: P.data },
    { job: 'vision', name: t('Collect and label plant photos', 'اجمع صور النباتات ووسمها'), output: t('100–150+ photos per species, split by tree', '100–150 صورة أو أكثر لكل نوع، مقسّمة حسب الشجرة'), part: P.vision },
    { job: 'vision', name: t('Fine-tune YOLO', 'اضبط YOLO'), output: t('A plant recogniser with a confidence threshold', 'مُعرِّف نباتات مع عتبة ثقة'), part: P.vision },
    { job: 'rag', name: t('Build the RAG archive', 'ابنِ أرشيف RAG'), output: t('Passages by species and topic, tagged with species, page, source', 'مقاطع حسب النوع والموضوع، موسومة بالنوع والصفحة والمصدر'), part: P.rag },
    { job: 'ft', name: t('Write the style examples (JSONL)', 'اكتب أمثلة الأسلوب (JSONL)'), output: t('Question + passages → botanist-style answer with sources', 'سؤال + مقاطع ← إجابة بأسلوب عالم النبات مع المصادر'), part: P.data },
    { job: 'ft', name: t('Fine-tune Qwen with QLoRA', 'اضبط Qwen بـ QLoRA'), output: t('The UTAS-70 LoRA adapter (pilot 8B, then 27B)', 'مهايئ UTAS-70 من نوع LoRA (تجربة 8B ثم 27B)'), part: P.unsloth },
    { job: 'rag', name: t('Join vision → RAG → model', 'اربط الرؤية ← RAG ← النموذج'), output: t('Photo → name → passages → cited answer', 'صورة ← اسم ← مقاطع ← إجابة موثقة'), part: P.utas },
    { job: 'plan', name: t('Evaluate every part', 'قيّم كل جزء'), output: t('YOLO accuracy, retrieval hit rate, answer quality', 'دقة YOLO، ونسبة إصابة الاسترجاع، وجودة الإجابات'), part: P.workflow },
  ],
};
const ROADMAP_KEY = 'neuron-lab-project-roadmap';
function loadDone(): Record<Project, number[]> {
  try { const saved = JSON.parse(localStorage.getItem(ROADMAP_KEY) ?? 'null'); if (saved?.turath && saved?.utas) return saved; } catch { /* storage unavailable */ }
  return { turath: [], utas: [] };
}

/** Step-by-step plan for each project, with links to the part that teaches each step. */
export function ProjectRoadmap() {
  const say = useTx();
  const [project, setProject] = useState<Project>('utas');
  const [done, setDone] = useState(loadDone);
  const steps = ROADMAP[project];
  const mine = done[project];
  const toggle = (index: number) => setDone(current => {
    const list = current[project].includes(index) ? current[project].filter(item => item !== index) : [...current[project], index];
    const next = { ...current, [project]: list };
    try { localStorage.setItem(ROADMAP_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
    return next;
  });
  return <div className="po-roadmap">
    <h4 className="llm-sub ft-handson"><Icon name="layers" size={13}/>{say(t('Your roadmap, step by step', 'خريطة طريقك خطوة بخطوة'))}</h4>
    <div className="ft-tabs" role="group" aria-label={say(t('Project', 'المشروع'))}>
      {(['turath', 'utas'] as Project[]).map(key => <button key={key} type="button" className={project === key ? 'current' : ''} aria-pressed={project === key} onClick={() => setProject(key)}>{key === 'turath' ? 'TurathAI' : 'UTAS-70'}</button>)}
    </div>
    <div className="po-progress"><i style={{ width: `${mine.length / steps.length * 100}%` }}/><b data-testid="roadmap-count" dir="ltr">{mine.length} / {steps.length}</b></div>
    <ol className="po-steps" key={project}>
      {steps.map((step, index) => {
        const tone = step.job === 'plan' ? '#facc15' : JOB[step.job].tone;
        return <li key={step.name.en + index} className={mine.includes(index) ? 'done' : ''} style={{ '--job': tone, ...delay(index, 0.06) } as CSSProperties}>
          <label><input type="checkbox" checked={mine.includes(index)} onChange={() => toggle(index)}/><span className="num" dir="ltr">{index + 1}</span><b>{say(step.name)}</b></label>
          <span className="tag">{step.job === 'plan' ? say(t('plan / evaluate', 'تخطيط / تقييم')) : say(JOB[step.job].name)}</span>
          <p>{say(step.output)}</p>
          <PartLink part={step.part}/>
        </li>;
      })}
    </ol>
  </div>;
}

// ---------------------------------------------------- who does which job?

const ITEMS: { text: Text; job: Job; why: Text }[] = [
  { text: t('Knowing that the photo shows a frankincense tree', 'معرفة أن الصورة تُظهر شجرة لبان'), job: 'vision', why: t('Only the vision model looks at pixels.', 'وحده نموذج الرؤية ينظر إلى البكسلات.') },
  { text: t('The year a story was recorded in Salalah', 'السنة التي سُجّلت فيها قصة في صلالة'), job: 'rag', why: t('A fact with a source: it lives in the archive’s metadata.', 'حقيقة لها مصدر: تعيش في البيانات الوصفية للأرشيف.') },
  { text: t('Answering in a warm storyteller’s voice in Omani Arabic', 'الإجابة بصوت راوٍ دافئ بالعربية العُمانية'), job: 'ft', why: t('A way of speaking, learned from examples.', 'طريقة كلام تُتعلَّم من الأمثلة.') },
  { text: t('Citing “Source A, p. 113”', 'الاستشهاد بـ “المصدر A، ص 113”'), job: 'rag', why: t('The page comes with the retrieved passage.', 'الصفحة تأتي مع المقطع المسترجع.') },
  { text: t('Saying “not in my sources” politely instead of guessing', 'قول “غير موجود في مصادري” بأدب بدل التخمين'), job: 'ft', why: t('A behaviour taught by examples where the answer is missing.', 'سلوك تعلّمه أمثلة تغيب فيها الإجابة.') },
  { text: t('A UNESCO element added to the list next year', 'عنصر يُضاف إلى قائمة اليونسكو العام القادم'), job: 'rag', why: t('New facts are indexed, not trained.', 'الحقائق الجديدة تُفهرس ولا تُدرَّب.') },
  { text: t('Drawing a box around the plant in a busy photo', 'رسم مربع حول النبات في صورة مزدحمة'), job: 'vision', why: t('Detection is YOLO’s job.', 'الكشف مهمة YOLO.') },
  { text: t('Always ordering an answer: names, uses, cautions, sources', 'ترتيب الإجابة دائمًا: الأسماء والاستخدامات والتحذيرات والمصادر'), job: 'ft', why: t('A fixed answer shape is a style.', 'شكل الإجابة الثابت أسلوب.') },
];

/** Sort each job: vision, RAG or fine-tuning? */
export function WhoDoesWhat() {
  const say = useTx();
  const [answers, setAnswers] = useState<Record<number, Job>>({});
  const score = ITEMS.filter((item, index) => answers[index] === item.job).length;
  return <div className="po-who">
    <h4 className="llm-sub ft-handson"><Icon name="check" size={13}/>{say(t('Who does which job?', 'من يؤدي أي مهمة؟'))}</h4>
    <p className="pc-lead">{say(t('For each job, choose the part of the system that does it.', 'لكل مهمة، اختر جزء النظام الذي يؤديها.'))} <b data-testid="who-score" dir="ltr">{score} / {ITEMS.length}</b></p>
    <ul className="po-items">
      {ITEMS.map((item, index) => {
        const chosen = answers[index];
        return <li key={item.text.en} className={cls(chosen && (chosen === item.job ? 'right' : 'wrong'))}>
          <p>{say(item.text)}</p>
          <div className="po-choices">{(['vision', 'rag', 'ft'] as Job[]).map(job => <button key={job} type="button" className={cls(chosen === job && 'on')} style={{ '--job': JOB[job].tone } as CSSProperties}
            aria-pressed={chosen === job} onClick={() => setAnswers(current => ({ ...current, [index]: job }))}><Icon name={JOB[job].icon} size={12}/>{say(JOB[job].name)}</button>)}</div>
          {chosen && <small>{chosen === item.job ? '✓ ' : `✕ ${say(t('It is', 'إنها'))} ${say(JOB[item.job].name)}. `}{say(item.why)}</small>}
        </li>;
      })}
    </ul>
  </div>;
}
