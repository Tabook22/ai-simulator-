/**
 * RAG and JSONL in the fine-tuning process: the same story used two ways, how fine-tuning
 * examples are written as JSONL and used for training, the RAG application as an animated
 * cartoon, and a picture of vector search. Stories and people are illustrations for the lesson.
 */
import { useMemo, useState } from 'react';
import './rag.css';
import { Icon } from './ui';
import { useI18n } from './i18n';
import { Hotspots, Lock, Scene, packet, show, t, usePlayer, useTx } from './FineTuneScenes';
import type { Figure, Text } from './FineTuneScenes';
import { Txt } from './LessonScenes';
import { JsonCode } from './FineTuneLessons';
import { checkLine } from './lessonContent';

const cls = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

// ----------------------------------------------------------- the monsoon story

export const MONSOON = {
  id: 'DHF-2018-014',
  meta: [
    { key: t('Source', 'المصدر'), value: t('Oral collection from Salalah', 'مجموعة شفهية من صلالة') },
    { key: t('Recorded', 'سُجّلت'), value: t('2018', '2018') },
    { key: t('Storyteller', 'الراوي'), value: t('an elder from Salalah (name kept in the archive)', 'أحد كبار السن من صلالة (الاسم محفوظ في الأرشيف)') },
    { key: t('Region', 'المنطقة'), value: t('Dhofar', 'ظفار') },
    { key: t('Category', 'التصنيف'), value: t('Monsoon / traditional knowledge', 'الخريف / المعارف التقليدية') },
  ],
  story: t('Every year when the monsoon clouds arrived from the sea, the people of the mountains would prepare their homes. The rain brought life to the dry land, but the strong winds also tested the strength of the houses. The elders would say: “The monsoon is both a guest and a teacher.” When the first clouds appeared, the families would gather firewood and store water. The older men would walk around the village to check if any roofs needed repair before the heavy rain started.',
    'في كل عام، حين تصل غيوم الخريف من البحر، كان أهل الجبال يجهّزون بيوتهم. كان المطر يحيي الأرض الجافة، لكن الرياح القوية كانت تختبر متانة البيوت. وكان الكبار يقولون: «الخريف ضيفٌ ومعلّم». وحين تظهر أولى الغيوم، كانت الأسر تجمع الحطب وتخزّن الماء، ويطوف كبار الرجال في القرية ليتفقدوا الأسقف التي تحتاج إلى إصلاح قبل أن يشتد المطر.'),
  question: t('Tell me about how people in Dhofar prepared for the monsoon.', 'حدّثني عن كيف كان أهل ظفار يستعدون للخريف.'),
  opening: t('Let me tell you how the people of Dhofar used to prepare for the monsoon, according to the stories recorded in Salalah.',
    'دعني أحكي لك كيف كان أهل ظفار يستعدون للخريف، كما تذكر القصص المسجلة في صلالة.'),
  citation: t('(Source: oral collection from Salalah, recorded 2018)', '(المصدر: مجموعة شفهية من صلالة، سُجّلت عام 2018)'),
};

const TABLE: [Text, Text, Text][] = [
  [t('Format', 'الشكل'), t('Plain story + metadata', 'قصة خام + بيانات وصفية'), t('Conversation: user + context + assistant', 'محادثة: مستخدم + سياق + مساعد')],
  [t('Purpose', 'الغرض'), t('To be searched and retrieved', 'أن يُبحث فيها وتُسترجع'), t('To teach the model how to respond', 'أن تعلّم النموذج كيف يجيب')],
  [t('Does the model memorize it?', 'هل يحفظه النموذج؟'), t('No: it is looked up when needed', 'لا: يُبحث عنه عند الحاجة'), t('It learns the style and structure', 'يتعلم الأسلوب والبنية')],
  [t('Size', 'الحجم'), t('All your stories', 'كل قصصك'), t('A smaller set of teaching examples', 'مجموعة أصغر من الأمثلة التعليمية')],
  [t('File', 'الملف'), t('Documents → chunks → vector database', 'مستندات ← مقاطع ← قاعدة بيانات متجهات'), t('train.jsonl: one example per line', 'train.jsonl: مثال واحد في كل سطر')],
];

/** The same story, once as a library entry and once inside a teaching conversation. */
export function SameStoryTwoUses() {
  const say = useTx();
  const [mark, setMark] = useState<'story' | 'meta' | 'style' | null>('story');
  const pick = (value: 'story' | 'meta' | 'style') => setMark(current => current === value ? null : value);
  return <div className="rg-same">
    <h4 className="llm-sub ft-handson"><Icon name="file" size={13}/>{say(t('One story, two uses: the library entry and the teaching example', 'قصة واحدة واستخدامان: مدخل المكتبة والمثال التعليمي'))}</h4>
    <div className="ft-tabs" role="group" aria-label={say(t('Highlight', 'ميّز'))}>
      <span>{say(t('Highlight:', 'ميّز:'))}</span>
      <button type="button" className={mark === 'story' ? 'current' : ''} aria-pressed={mark === 'story'} onClick={() => pick('story')}>{say(t('the story text', 'نص القصة'))}</button>
      <button type="button" className={mark === 'meta' ? 'current' : ''} aria-pressed={mark === 'meta'} onClick={() => pick('meta')}>{say(t('the source details', 'تفاصيل المصدر'))}</button>
      <button type="button" className={mark === 'style' ? 'current' : ''} aria-pressed={mark === 'style'} onClick={() => pick('style')}>{say(t('what fine-tuning adds', 'ما يضيفه الضبط الدقيق'))}</button>
    </div>
    <div className={cls('rg-same-grid', mark ? `mark-${mark}` : undefined)}>
      <article className="rg-entry">
        <h5><Icon name="library" size={14}/>{say(t('1 · RAG data: the library entry', '1 · بيانات RAG: مدخل المكتبة'))}</h5>
        <p className="rg-note">{say(t('Stored in the RAG system. The model does not train on it; it is retrieved when needed.', 'يُخزَّن في نظام RAG. لا يتدرب عليه النموذج؛ بل يُسترجع عند الحاجة.'))}</p>
        <dl className="rg-meta"><div><dt>ID</dt><dd dir="ltr">{MONSOON.id}</dd></div>
          {MONSOON.meta.map(item => <div key={item.key.en}><dt>{say(item.key)}</dt><dd>{say(item.value)}</dd></div>)}</dl>
        <p className="rg-story">{say(MONSOON.story)}</p>
      </article>
      <article className="rg-example">
        <h5><Icon name="layers" size={14}/>{say(t('2 · Fine-tuning data: the teaching example', '2 · بيانات الضبط الدقيق: المثال التعليمي'))}</h5>
        <p className="rg-note">{say(t('Used to train the model. It shows how to answer when the RAG context arrives.', 'يُستخدم لتدريب النموذج. ويُريه كيف يجيب حين يصل سياق RAG.'))}</p>
        <div className="rg-turn user"><b>{say(t('User', 'المستخدم'))}</b><p>{say(MONSOON.question)}</p></div>
        <div className="rg-turn context"><b>{say(t('Context (retrieved by RAG)', 'السياق (يسترجعه RAG)'))}</b>
          <dl className="rg-meta small"><div><dt>ID</dt><dd dir="ltr">{MONSOON.id}</dd></div>
            {MONSOON.meta.slice(0, 2).map(item => <div key={item.key.en}><dt>{say(item.key)}</dt><dd>{say(item.value)}</dd></div>)}</dl>
          <p className="rg-story small">{say(MONSOON.story).slice(0, 150)}…</p></div>
        <div className="rg-turn assistant"><b>{say(t('Assistant (what the model learns to write)', 'المساعد (ما يتعلم النموذج كتابته)'))}</b>
          <p><span className="rg-style">{say(MONSOON.opening)}</span> <span className="rg-story-inline">{say(MONSOON.story).slice(0, 110)}…</span>{' '}
            <span className="rg-cite">{say(MONSOON.citation)}</span></p></div>
      </article>
    </div>
    <p className="lx-muted">{mark === 'story'
      ? say(t('The same story text appears in both. In the library it is the source of truth; in the example it is context the model must use, not memorize.', 'نص القصة نفسه يظهر في الاثنين. ففي المكتبة هو مصدر الحقيقة، وفي المثال سياق يجب أن يستخدمه النموذج لا أن يحفظه.'))
      : mark === 'meta' ? say(t('The source details travel with the story, so the model can name them at the end of its answer.', 'تفاصيل المصدر ترافق القصة، كي يذكرها النموذج في نهاية إجابته.'))
        : mark === 'style' ? say(t('Only the example has the storyteller’s opening and the citation at the end. That pattern is what fine-tuning teaches.', 'المثال وحده فيه افتتاحية الراوي والاستشهاد في النهاية. وهذا النمط هو ما يعلّمه الضبط الدقيق.'))
          : say(t('Pick something to highlight.', 'اختر شيئًا لتمييزه.'))}</p>
    <div className="table-scroll ft-table">
      <table>
        <thead><tr><th/><th>{say(t('RAG data', 'بيانات RAG'))}</th><th>{say(t('Fine-tuning data', 'بيانات الضبط الدقيق'))}</th></tr></thead>
        <tbody>{TABLE.map(([name, rag, tune]) => <tr key={name.en}><td><strong>{say(name)}</strong></td><td>{say(rag)}</td><td>{say(tune)}</td></tr>)}</tbody>
      </table>
    </div>
    <p className="lx-key"><Icon name="bulb" size={14}/><span><strong>{say(t('Key point: ', 'النقطة الأهم: '))}</strong>
      {say(t('the full original story lives in RAG. The fine-tuning example teaches the model how to present that story well and cite the source.', 'القصة الأصلية الكاملة تعيش في RAG. والمثال التعليمي يعلّم النموذج كيف يقدّم تلك القصة جيدًا ويذكر المصدر.'))}</span></p>
    <p className="lx-muted">{say(t('The story, its ID and the storyteller are illustrations written for this lesson, not a real archive record.', 'القصة ورقمها وراويها توضيح كُتب لهذا الدرس، وليس سجلًا حقيقيًا من الأرشيف.'))}</p>
  </div>;
}

// ------------------------------------------------------------ JSONL builder

/** Write a fine-tuning example and watch it become one JSONL line, in either style. */
export function JsonlBuilder() {
  const say = useTx();
  const [withContext, setWithContext] = useState(true);
  const [question, setQuestion] = useState<string | null>(null);
  const [context, setContext] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [file, setFile] = useState<string[]>([]);
  const q = question ?? say(MONSOON.question);
  const c = context ?? `${say(t('Source', 'المصدر'))}: ${say(MONSOON.meta[0].value)}, 2018\n${say(t('Story', 'القصة'))}: ${say(MONSOON.story).slice(0, 160)}…`;
  const a = answer ?? `${say(MONSOON.opening)}\n\n${say(MONSOON.story).slice(0, 120)}…\n\n${say(MONSOON.citation)}`;
  const line = JSON.stringify({ messages: [
    { role: 'user', content: withContext ? `${q}\n\n${say(t('Context:', 'السياق:'))}\n${c}` : q },
    { role: 'assistant', content: a },
  ] });
  const check = checkLine(line);
  return <div className="rg-builder">
    <h4 className="llm-sub ft-handson"><Icon name="code" size={13}/>{say(t('Write a fine-tuning example, get a JSONL line', 'اكتب مثالًا للضبط الدقيق، واحصل على سطر JSONL'))}</h4>
    <div className="ft-tabs" role="group" aria-label={say(t('Style', 'النمط'))}>
      <button type="button" className={!withContext ? 'current' : ''} aria-pressed={!withContext} onClick={() => setWithContext(false)}>{say(t('Question → answer', 'سؤال ← إجابة'))}</button>
      <button type="button" className={withContext ? 'current' : ''} aria-pressed={withContext} onClick={() => setWithContext(true)}>{say(t('Question + context → answer', 'سؤال + سياق ← إجابة'))}</button>
    </div>
    <p className={withContext ? 'lx-good' : 'lx-warning'}>{withContext
      ? say(t('Recommended when you combine RAG and fine-tuning: the example looks exactly like what the model will receive in the application, so it learns to use the context it is given.',
        'موصى به حين تجمع RAG والضبط الدقيق: يبدو المثال تمامًا كما سيصل إلى النموذج في التطبيق، فيتعلم استخدام السياق المعطى له.'))
      : say(t('Teaches the style, but the model must recall the story from memory, which is exactly where invented details come from. Fine for style-only examples; for stories, prefer the context style.',
        'يعلّم الأسلوب، لكن على النموذج أن يتذكر القصة من ذاكرته، ومن هنا تأتي التفاصيل المختلقة. مناسب لأمثلة الأسلوب فقط؛ أما للقصص ففضّل نمط السياق.'))}</p>
    <div className="rg-fields">
      <label><span className="rg-role user">user</span>{say(t('Question', 'السؤال'))}
        <textarea rows={2} value={q} onChange={event => setQuestion(event.target.value)}/></label>
      {withContext && <label><span className="rg-role context">context</span>{say(t('Retrieved context (from RAG)', 'السياق المسترجَع (من RAG)'))}
        <textarea rows={4} value={c} onChange={event => setContext(event.target.value)}/></label>}
      <label><span className="rg-role assistant">assistant</span>{say(t('Answer the model should learn', 'الإجابة التي يجب أن يتعلمها النموذج'))}
        <textarea rows={4} value={a} onChange={event => setAnswer(event.target.value)}/></label>
    </div>
    <div className="rg-line">
      <span className="lx-file-name" dir="ltr">{say(t('one line of train.jsonl', 'سطر واحد من train.jsonl'))}</span>
      <JsonCode text={line}/>
      <p className={check.ok ? 'good' : 'bad'} data-testid="builder-check"><Icon name={check.ok ? 'check' : 'close'} size={13}/> {say(check.reason)}</p>
      <p className="lx-muted">{say(t('Notice: every line break you typed becomes \\n, and quotes become \\" — that is how a whole conversation fits on one line.',
        'لاحظ: كل سطر جديد كتبته يصبح \\n، وعلامات التنصيص تصبح \\" — وهكذا تتسع محادثة كاملة في سطر واحد.'))}</p>
    </div>
    <div className="button-row">
      <button type="button" className="button primary small" disabled={!check.ok || file.length >= 6} onClick={() => setFile(current => [...current, line])}>
        <Icon name="plus" size={13}/>{say(t('Add to train.jsonl', 'أضف إلى train.jsonl'))}</button>
      <button type="button" className="button small quiet" disabled={!file.length} onClick={() => setFile([])}><Icon name="reset" size={13}/>{say(t('Empty the file', 'أفرغ الملف'))}</button>
    </div>
    {file.length > 0 && <div className="rg-file" data-testid="train-file">
      <span className="lx-file-name" dir="ltr">train.jsonl · {file.length}</span>
      <ol dir="ltr">{file.map((item, index) => <li key={index}><code>{item.slice(0, 90)}…</code></li>)}</ol>
    </div>}
  </div>;
}

/** What happens to train.jsonl during fine-tuning. */
export function TrainJsonlFlow() {
  const say = useTx();
  const [run, setRun] = useState(0);
  const steps = [
    { icon: 'file' as const, title: t('train.jsonl', 'train.jsonl'), text: t('All your teaching examples, one per line.', 'كل أمثلتك التعليمية، مثال في كل سطر.') },
    { icon: 'download' as const, title: t('Load the file', 'حمّل الملف'), text: t('load_dataset("json") reads every line as one example.', 'تقرأ load_dataset("json") كل سطر مثالًا واحدًا.') },
    { icon: 'grid' as const, title: t('Template + tokens', 'القالب + الرموز'), text: t('Each conversation is put in the chat template and cut into tokens.', 'توضع كل محادثة في قالب المحادثة وتُقطَّع إلى رموز.') },
    { icon: 'target' as const, title: t('Learn the answer only', 'تعلّم الإجابة فقط'), text: t('The user part is shown but masked; the model is trained to produce the assistant part.', 'يُعرض جزء المستخدم لكنه محجوب؛ ويُدرَّب النموذج على إنتاج جزء المساعد.') },
    { icon: 'layers' as const, title: t('Update LoRA only', 'حدّث LoRA فقط'), text: t('Only the small LoRA weights change. The 4-bit base stays frozen.', 'الأوزان الصغيرة لـ LoRA وحدها تتغير. ويبقى الأساس ذو الـ 4 بت مجمَّدًا.') },
  ];
  return <div className="rg-flow">
    <h4 className="llm-sub ft-handson"><Icon name="refresh" size={13}/>{say(t('How train.jsonl is applied in fine-tuning', 'كيف يُطبَّق train.jsonl في الضبط الدقيق'))}</h4>
    <ol className="rg-flow-steps" key={run}>
      {steps.map((step, index) => <li key={step.title.en} style={{ animationDelay: `${index * 0.45}s` }}>
        <span className="rg-flow-icon"><Icon name={step.icon} size={17}/></span>
        <strong>{say(step.title)}</strong><small>{say(step.text)}</small>
      </li>)}
    </ol>
    <button type="button" className="button small rg-replay" onClick={() => setRun(value => value + 1)}><Icon name="play" size={13}/>{say(t('Play the flow again', 'شغّل التدفق من جديد'))}</button>
    <pre className="rg-code" dir="ltr"><code>{`from datasets import load_dataset
from trl import SFTTrainer
from unsloth.chat_templates import train_on_responses_only

dataset = load_dataset("json", data_files = "train.jsonl", split = "train")

trainer = SFTTrainer(model = model,            # 4-bit base + LoRA adapters
                     train_dataset = dataset,  # each line = one example
                     ...)
trainer = train_on_responses_only(trainer, ...)  # learn the assistant part only
trainer.train()                                  # only the LoRA weights change`}</code></pre>
    <p className="lx-muted">{say(t('The “...” stand for settings such as the tokenizer, the chat-template markers and the training arguments. Check the Unsloth documentation for the exact arguments of your version.',
      'تمثل “...” إعدادات مثل المقطِّع وعلامات قالب المحادثة ووسائط التدريب. راجع توثيق Unsloth لمعرفة الوسائط الدقيقة لإصدارك.'))}</p>
  </div>;
}

// -------------------------------------------------- the RAG application, as a cartoon

const P_TRAIN = 'M 186 54 C 330 34 470 40 586 100';
const P_UPLOAD = 'M 100 200 C 140 214 170 206 206 196';
const P_EMBED_DB = 'M 322 200 C 360 210 384 226 400 246';
const P_QUESTION = 'M 110 286 C 150 268 182 236 214 214';
const P_DB_MODEL = 'M 476 262 C 520 246 560 222 590 202';
const P_ANSWER = 'M 590 206 C 520 300 300 330 112 300';

const APP_STEPS = [
  { title: t('Fine-tune first: teach the style', 'اضبط أولًا: علّم الأسلوب'),
    text: t('The team trains the model with QLoRA (for example in Unsloth) on train.jsonl: examples of how to answer, use context and cite. The result is a fine-tuned model: the frozen base plus a small LoRA adapter.',
      'يدرّب الفريق النموذج بتقنية QLoRA (مثلًا في Unsloth) على train.jsonl: أمثلة على كيفية الإجابة واستخدام السياق والاستشهاد. والنتيجة نموذج مضبوط: الأساس المجمَّد مع مهايئ LoRA صغير.') },
  { title: t('Build the application around the model', 'ابنِ التطبيق حول النموذج'),
    text: t('Now an application is built around the fine-tuned model: a chat window, an upload page, an embedding model and a vector database. This is the RAG part.',
      'الآن يُبنى تطبيق حول النموذج المضبوط: نافذة محادثة، وصفحة رفع، ونموذج تضمين، وقاعدة بيانات متجهات. وهذا هو جزء RAG.') },
  { title: t('Upload sources: chunk, embed, store', 'ارفع المصادر: قسّم، ضمّن، خزّن'),
    text: t('An admin uploads a new story. It is cut into chunks, each chunk is turned into an embedding (a list of numbers that captures its meaning), and stored in the vector database. No retraining is needed.',
      'يرفع المشرف قصة جديدة. فتُقسَّم إلى مقاطع، ويُحوَّل كل مقطع إلى تضمين (قائمة أرقام تلتقط معناه)، ويُخزَّن في قاعدة بيانات المتجهات. ولا حاجة إلى إعادة التدريب.') },
  { title: t('A user asks a question', 'مستخدم يطرح سؤالًا'),
    text: t('The question goes to the same embedding model, which turns it into an embedding. (The embedding model handles the tokenization inside.)',
      'يذهب السؤال إلى نموذج التضمين نفسه، فيحوّله إلى تضمين. (ونموذج التضمين يتولى التقطيع إلى رموز داخليًا.)') },
  { title: t('Search the vector database', 'ابحث في قاعدة بيانات المتجهات'),
    text: t('The question’s embedding is compared with all the stored ones. The chunks whose meaning is closest come back: here, the monsoon story from Salalah.',
      'يُقارن تضمين السؤال بكل التضمينات المخزَّنة. وتعود المقاطع الأقرب معنى: وهي هنا قصة الخريف من صلالة.') },
  { title: t('Question + context go to the fine-tuned model', 'السؤال + السياق يذهبان إلى النموذج المضبوط'),
    text: t('The retrieved chunks and the original question are put together into one prompt and given to the fine-tuned model. This is exactly the shape of the “question + context” training examples.',
      'تُجمع المقاطع المسترجَعة والسؤال الأصلي في تلقين واحد ويُعطى للنموذج المضبوط. وهذا تمامًا شكل أمثلة التدريب “سؤال + سياق”.') },
  { title: t('The answer, in the trained style, with its source', 'الإجابة بالأسلوب المدرَّب ومعها مصدرها'),
    text: t('The model reads the context and answers the way it was trained: the storyteller’s opening, the facts from the chunk, and the source at the end.',
      'يقرأ النموذج السياق ويجيب كما دُرّب: افتتاحية الراوي، والحقائق من المقطع، والمصدر في النهاية.') },
];

const APP_FIGURES: Figure[] = [
  { id: 'jsonl', title: t('train.jsonl and QLoRA training', 'train.jsonl وتدريب QLoRA'), areas: [[110, 22, 82, 60]],
    what: t('The file of teaching examples, used once to fine-tune the model before the application exists.', 'ملف الأمثلة التعليمية، يُستخدم مرة واحدة لضبط النموذج قبل وجود التطبيق.'),
    why: t('Fine-tuning gives the model its behaviour. It does not need to be repeated when new stories are added.', 'الضبط الدقيق يعطي النموذج سلوكه. ولا حاجة لتكراره حين تُضاف قصص جديدة.') },
  { id: 'model', title: t('The fine-tuned model', 'النموذج المضبوط'), areas: [[556, 92, 132, 132]],
    what: t('The base model (frozen) with its LoRA adapter (orange), loaded inside the application.', 'النموذج الأساسي (المجمَّد) مع مهايئ LoRA (البرتقالي)، محمَّلًا داخل التطبيق.'),
    why: t('It writes the final answer, in the style it learned, from the context it is given.', 'يكتب الإجابة النهائية بالأسلوب الذي تعلمه، من السياق المعطى له.') },
  { id: 'embed', title: t('The embedding model', 'نموذج التضمين'), areas: [[200, 166, 126, 60]],
    what: t('A separate, smaller model that turns any text into an embedding: a list of numbers (often hundreds) that represents its meaning.', 'نموذج منفصل وأصغر يحوّل أي نص إلى تضمين: قائمة أرقام (مئات غالبًا) تمثل معناه.'),
    why: t('Texts with similar meaning get similar numbers, so “monsoon preparation” can find a story that never uses those exact words.', 'النصوص المتشابهة في المعنى تحصل على أرقام متشابهة، فيستطيع “الاستعداد للخريف” أن يجد قصة لم تستخدم تلك الكلمات بالضبط.') },
  { id: 'db', title: t('The vector database', 'قاعدة بيانات المتجهات'), areas: [[346, 222, 150, 104]],
    what: t('Stores every chunk together with its embedding and metadata (ID, source, year).', 'تخزّن كل مقطع مع تضمينه وبياناته الوصفية (الرقم والمصدر والسنة).'),
    why: t('It is the library. Adding a story here makes it available at once, without touching the model.', 'إنها المكتبة. وإضافة قصة هنا تجعلها متاحة فورًا دون المساس بالنموذج.') },
  { id: 'people', title: t('The admin and the user', 'المشرف والمستخدم'), areas: [[30, 30, 70, 64], [36, 262, 70, 80]],
    what: t('At the top, the team that trains the model and uploads sources; at the bottom, a visitor using the chat.', 'في الأعلى الفريق الذي يدرّب النموذج ويرفع المصادر، وفي الأسفل زائر يستخدم المحادثة.'),
    why: t('Two different jobs: curating the library and the training examples, and asking questions.', 'مهمتان مختلفتان: تنظيم المكتبة والأمثلة التعليمية، وطرح الأسئلة.') },
];

const DB_DOTS = [[372, 262], [392, 284], [414, 266], [436, 290], [458, 270], [384, 300], [446, 304], [470, 292], [404, 308], [426, 276]];

export function RagAppScene() {
  const say = useTx();
  const { isArabic } = useI18n();
  const player = usePlayer(APP_STEPS.length);
  const { step } = player;
  const app = step >= 1;
  const hit = [3, 9];
  return <Scene id="ft-scene-ragapp" title={t('From the fine-tuned model to a RAG application: the whole flow', 'من النموذج المضبوط إلى تطبيق RAG: التدفق كاملًا')}
    steps={APP_STEPS} player={player} figures={APP_FIGURES}>
    <svg viewBox="0 0 760 380" className={`ft-svg rg-app step-${step}`} role="img" aria-label={say(APP_STEPS[step].title)}>
      {/* the application frame */}
      <g className={show(app)}>
        <rect className="rg-frame" x="14" y="98" width="732" height="276" rx="18"/>
        <rect className="rg-frame-tab" x="232" y="88" width="190" height="22" rx="8"/>
        <Txt x={327} y={103} className="rg-frame-text">{say(t('your RAG application', 'تطبيق RAG الخاص بك'))}</Txt>
      </g>

      {/* the team */}
      <g className={cls('rg-person team', (step === 0 || step === 2) && 'active')}>
        <circle cx="64" cy="44" r="14"/><rect x="44" y="60" width="40" height="34" rx="14"/>
      </g>
      <Txt x={64} y={26} className="ft-tiny strong">{say(t('team', 'الفريق'))}</Txt>

      {/* 1 fine-tuning */}
      <g className={cls('rg-jsonl', step === 0 && 'active')}>
        <rect x="114" y="26" width="72" height="54" rx="7"/>
        <text x="150" y="48" textAnchor="middle" className="rg-jsonl-mark">{'{ }'}</text>
        <text x="150" y="68" textAnchor="middle" className="rg-jsonl-name">train.jsonl</text>
      </g>
      <path className={cls('rg-path train', step === 0 && 'on')} d={P_TRAIN}/>
      <g className={show(step === 0)}><Txt x={390} y={34} className="ft-tiny strong warm">{say(t('QLoRA fine-tuning (Unsloth)', 'ضبط دقيق بـ QLoRA (Unsloth)'))}</Txt></g>
      {step === 0 && [0, 1, 2].map(index => <rect key={index} className="ft-doc" x="-5" y="-7" width="10" height="14" rx="1.5" style={packet(P_TRAIN, -index * 0.7)}/>)}

      {/* the fine-tuned model */}
      <g className={cls('rg-robot', (step === 0 || step >= 5) && 'active', step === 6 && 'speaking')}>
        <rect className="body" x="566" y="104" width="100" height="84" rx="18"/>
        <rect className="screen" x="580" y="118" width="72" height="40" rx="10"/>
        <path className="eye" d="M594 138 q 5 -6 10 0 M626 138 q 5 -6 10 0 M604 148 q 11 7 22 0"/>
        <Lock x={652} y={180} size={0.8}/>
        <rect className="adapter" x="672" y="122" width="16" height="48" rx="4"/>
        <text className="rg-adapter-text" x="680" y="184" textAnchor="middle">LoRA</text>
      </g>
      <Txt x={616} y={206} className="ft-tiny strong">{say(t('fine-tuned model', 'النموذج المضبوط'))}</Txt>

      {/* upload and chunking */}
      <g className={cls(show(step >= 2), step === 2 && 'rg-focus')}>
        <rect className="rg-doc" x="34" y="132" width="60" height="70" rx="6"/>
        {[146, 158, 170, 182].map(y => <path key={y} className="rg-doc-line" d={`M 44 ${y} H 84`}/>)}
        <Txt x={64} y={218} className="ft-tiny">{say(t('new story', 'قصة جديدة'))}</Txt>
        {step === 2 && [0, 1, 2].map(index => <rect key={index} className="rg-chunk" x="-9" y="-6" width="18" height="12" rx="2"
          style={packet(P_UPLOAD, -index * 0.6, { animationDuration: '1.8s' })}/>)}
        <g className={show(step === 2)}><Txt x={150} y={238} className="ft-tiny strong">{say(t('cut into chunks', 'قُسّمت إلى مقاطع'))}</Txt></g>
      </g>
      <path className={cls('rg-path', step === 2 && 'on')} d={P_UPLOAD}/>

      {/* embedding model */}
      <g className={cls('rg-embed', show(app), (step === 2 || step === 3) && 'active')}>
        <rect x="206" y="170" width="116" height="52" rx="12"/>
        <path className="prism" d="M 222 210 L 236 180 L 250 210 Z"/>
        <Txt x={290} y={192} className="rg-box-text">{say(t('embedding', 'نموذج'))}</Txt>
        <Txt x={290} y={207} className="rg-box-text">{say(t('model', 'التضمين'))}</Txt>
      </g>
      <path className={cls('rg-path', show(app), (step === 2 || step === 4) && 'on')} d={P_EMBED_DB}/>
      {step === 2 && [0, 1, 2].map(index => <circle key={index} className="rg-vec" r="4" style={packet(P_EMBED_DB, -index * 0.6)}/>)}
      {step === 4 && <circle className="rg-vec star" r="6" style={packet(P_EMBED_DB, 0)}/>}

      {/* vector database */}
      <g className={cls('rg-db', show(app), (step === 2 || step === 4) && 'active')}>
        <path className="body" d="M 350 250 V 312 A 70 14 0 0 0 490 312 V 250"/>
        <ellipse className="top" cx="420" cy="250" rx="70" ry="14"/>
        {DB_DOTS.map(([x, y], index) => <circle key={index} className={cls('dot', step >= 2 && index === 9 && 'new', step >= 4 && hit.includes(index) && 'hit')} cx={x} cy={y} r="4"/>)}
        {step === 4 && hit.map(index => <path key={index} className="rg-match" d={`M 420 236 L ${DB_DOTS[index][0]} ${DB_DOTS[index][1]}`}/>)}
        <Txt x={420} y={340} className="ft-tiny strong">{say(t('vector database', 'قاعدة بيانات المتجهات'))}</Txt>
      </g>

      {/* the user */}
      <g className={cls('rg-person user', show(app), (step === 3 || step === 6) && 'active')}>
        <circle cx="70" cy="282" r="14"/><rect x="50" y="298" width="40" height="36" rx="14"/>
        <rect className="phone" x="84" y="300" width="14" height="22" rx="3"/>
      </g>
      <g className={show(app)}><Txt x={70} y={354} className="ft-tiny strong">{say(t('user', 'المستخدم'))}</Txt></g>
      <g className={show(step === 3)}>
        <rect className="rg-bubble" x="112" y="240" width="218" height="40" rx="12"/>
        <Txt x={221} y={258} className="rg-bubble-text">{say(t('How did people in Dhofar', 'كيف كان أهل ظفار'))}</Txt>
        <Txt x={221} y={272} className="rg-bubble-text">{say(t('prepare for the monsoon?', 'يستعدون للخريف؟'))}</Txt>
      </g>
      <path className={cls('rg-path', show(app), step === 3 && 'on')} d={P_QUESTION}/>
      {step === 3 && <circle className="rg-vec star" r="6" style={packet(P_QUESTION, 0)}/>}
      <g className={show(step === 3)}><text className="rg-numbers" x="264" y="160" textAnchor="middle" direction="ltr">[0.12, −0.48, 0.91, …]</text></g>

      {/* retrieval to the model */}
      <path className={cls('rg-path', show(app), (step === 4 || step === 5) && 'on')} d={P_DB_MODEL}/>
      <g className={show(step === 4)}>
        <rect className="rg-card" x="500" y="240" width="96" height="40" rx="7"/>
        <Txt x={548} y={256} className="rg-card-text">DHF-2018-014</Txt>
        <Txt x={548} y={271} className="rg-card-text">{say(t('monsoon · Salalah', 'الخريف · صلالة'))}</Txt>
      </g>
      <g className={show(step === 5)}>
        <rect className="rg-prompt" x="476" y="232" width="190" height="58" rx="10"/>
        <Txt x={571} y={250} className="rg-card-text strong">{say(t('prompt =', 'التلقين ='))}</Txt>
        <Txt x={571} y={266} className="rg-card-text">{say(t('question', 'السؤال'))} + {say(t('context', 'السياق'))}</Txt>
        <Txt x={571} y={281} className="rg-card-text">DHF-2018-014</Txt>
      </g>
      {step === 5 && [0, 1].map(index => <rect key={index} className="ft-doc" x="-5" y="-7" width="10" height="14" rx="1.5" style={packet(P_DB_MODEL, -index * 0.8)}/>)}

      {/* the answer */}
      <path className={cls('rg-path answer', show(step === 6), step === 6 && 'on')} d={P_ANSWER}/>
      {step === 6 && [0, 1].map(index => <circle key={index} className="ft-packet hot" r="5" style={packet(P_ANSWER, -index * 1.1)}/>)}
      <g className={show(step === 6)}>
        <rect className="rg-answer" x="150" y="112" width="400" height="56" rx="12"/>
        <Txt x={isArabic ? 538 : 162} y={131} anchor={isArabic ? 'end' : 'start'} className="rg-answer-text">{say(t('Let me tell you how the people of Dhofar prepared…', 'دعني أحكي لك كيف كان أهل ظفار يستعدون…'))}</Txt>
        <Txt x={isArabic ? 538 : 162} y={148} anchor={isArabic ? 'end' : 'start'} className="rg-answer-text muted">{say(t('…gathered firewood, stored water, checked the roofs…', '…يجمعون الحطب ويخزّنون الماء ويتفقدون الأسقف…'))}</Txt>
        <Txt x={isArabic ? 538 : 162} y={162} anchor={isArabic ? 'end' : 'start'} className="rg-answer-cite">{say(t('(Source: oral collection from Salalah, 2018)', '(المصدر: مجموعة شفهية من صلالة، 2018)'))}</Txt>
      </g>
      <Hotspots/>
    </svg>
  </Scene>;
}

// ------------------------------------------------------------ vector search

const CHUNKS = [
  { id: 'DHF-2018-014', name: t('Preparing homes for the monsoon', 'تجهيز البيوت للخريف'), x: 210, y: 70 },
  { id: 'MRB-2020-003', name: t('Closing windows in strong monsoon winds', 'إغلاق النوافذ في رياح الخريف القوية'), x: 238, y: 104 },
  { id: 'DHF-2015-021', name: t('The clever fox of the mountain paths', 'الثعلب الذكي في دروب الجبال'), x: 70, y: 168 },
  { id: 'SLL-2019-008', name: t('Frankincense harvest songs', 'أهازيج حصاد اللبان'), x: 120, y: 60 },
  { id: 'MRB-2017-011', name: t('Fishing boats after the monsoon', 'قوارب الصيد بعد الخريف'), x: 176, y: 132 },
];
const QUESTIONS = [
  { text: t('How did people prepare for the monsoon?', 'كيف كان الناس يستعدون للخريف؟'), x: 222, y: 84 },
  { text: t('What did they do when the wind was very strong?', 'ماذا كانوا يفعلون حين تشتد الرياح؟'), x: 246, y: 118 },
  { text: t('Is there a story about a fox?', 'هل توجد قصة عن ثعلب؟'), x: 82, y: 156 },
  { text: t('Tell me about the flying camel.', 'احكِ لي عن الجمل الطائر.'), x: 280, y: 196 },
];
const MAX_DISTANCE = 120;
const THRESHOLD = 0.6;

export function VectorSearchMap() {
  const say = useTx();
  const [pick, setPick] = useState(0);
  const question = QUESTIONS[pick];
  const ranked = useMemo(() => CHUNKS.map(chunk => {
    const distance = Math.hypot(chunk.x - question.x, chunk.y - question.y);
    return { ...chunk, score: Math.max(0, 1 - distance / MAX_DISTANCE) };
  }).sort((left, right) => right.score - left.score), [question]);
  const found = ranked.filter(chunk => chunk.score >= THRESHOLD).slice(0, 2);
  return <div className="rg-search">
    <h4 className="llm-sub ft-handson"><Icon name="search" size={13}/>{say(t('How the vector search finds the right story', 'كيف يجد البحث المتجهي القصة الصحيحة'))}</h4>
    <div className="ft-tabs" role="group" aria-label={say(t('Question', 'السؤال'))}>
      {QUESTIONS.map((item, index) => <button key={item.text.en} type="button" className={index === pick ? 'current' : ''} aria-pressed={index === pick}
        onClick={() => setPick(index)}>{say(item.text)}</button>)}
    </div>
    <div className="rg-search-grid">
      <svg viewBox="0 0 320 230" className="rg-map" role="img" aria-label={say(t('A map of meanings', 'خريطة للمعاني'))}>
        <rect x="4" y="4" width="312" height="222" rx="12" className="rg-map-bg"/>
        <text x="20" y="22" className="rg-map-label">{say(t('meaning map (simplified to 2 dimensions)', 'خريطة المعاني (مبسطة إلى بُعدين)'))}</text>
        <circle className="rg-radius" cx={question.x} cy={question.y} r={(1 - THRESHOLD) * MAX_DISTANCE}/>
        {found.map(chunk => <line key={chunk.id} className="rg-link" x1={question.x} y1={question.y} x2={chunk.x} y2={chunk.y}/>)}
        {CHUNKS.map(chunk => <g key={chunk.id} className={cls('rg-point', found.some(item => item.id === chunk.id) && 'found')}>
          <circle cx={chunk.x} cy={chunk.y} r="7"/><text x={chunk.x} y={chunk.y - 11} textAnchor="middle">{chunk.id.slice(-3)}</text>
        </g>)}
        <g className="rg-query" key={pick}><path d={`M ${question.x} ${question.y - 10} l 3 7 l 7 1 l -5 5 l 1 7 l -6 -3 l -6 3 l 1 -7 l -5 -5 l 7 -1 z`}/></g>
      </svg>
      <div className="rg-results">
        <ol>{ranked.map(chunk => <li key={chunk.id} className={found.some(item => item.id === chunk.id) ? 'found' : ''}>
          <span className="rg-score" dir="ltr">{chunk.score.toFixed(2)}</span>
          <span><code dir="ltr">{chunk.id}</code> {say(chunk.name)}</span>
        </li>)}</ol>
        <p className={found.length ? 'lx-good' : 'lx-warning'} data-testid="search-result">{found.length
          ? say(t(`${found.length} chunk${found.length > 1 ? 's' : ''} above the similarity threshold (${THRESHOLD}) are sent to the model as context.`, `${found.length} من المقاطع فوق عتبة التشابه (${THRESHOLD}) تُرسل إلى النموذج سياقًا.`))
          : say(t('Nothing is close enough. The model receives no story, and its training tells it to answer: “I don’t have a recorded source for this story.”', 'لا شيء قريب بما يكفي. لا يتلقى النموذج أي قصة، ويطلب منه تدريبه أن يجيب: “ليس لدي مصدر مسجّل لهذه القصة.”'))}</p>
      </div>
    </div>
    <p className="lx-muted">{say(t('Real embeddings have hundreds of dimensions and the scores come from cosine similarity; this map squeezes them into two so the idea is visible. Texts about the same thing land close together even when they use different words.',
      'التضمينات الحقيقية لها مئات الأبعاد، وتأتي الدرجات من تشابه جيب التمام؛ وهذه الخريطة تضغطها إلى بُعدين لتظهر الفكرة. فالنصوص التي تتحدث عن الشيء نفسه تقع متقاربة حتى لو استخدمت كلمات مختلفة.'))}</p>
  </div>;
}
