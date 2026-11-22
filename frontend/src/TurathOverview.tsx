/**
 * "The big picture" of the TurathAI case study: the project illustration, the project objective,
 * the four-step workflow (click a step to light up its panels in the illustration), how the source
 * material is divided between fine-tuning and RAG, and one question followed from the user to the
 * cited answer. The worked example uses the UNESCO Al-Khanjar record from turathContent.ts.
 */
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Icon } from './ui';
import type { IconName } from './ui';
import { t, useTx } from './FineTuneScenes';
import type { Text } from './FineTuneScenes';
import { PosterLightbox } from './HouseReferences';
import type { Poster } from './HouseReferences';
import { EVAL_QUESTION, RECORDS } from './turathContent';

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;
const IMAGE_FULL = asset('reference/turath-assistant.webp');
const IMAGE_SMALL = asset('reference/turath-assistant-960.webp');
const IMAGE_W = 1672, IMAGE_H = 941;

/** Areas of the illustration, in percent of its width and height. */
type Area = { x: number; y: number; w: number; h: number };
const AREA = {
  top12: { x: 0.5, y: 11.8, w: 65.5, h: 37.6 },
  panel3: { x: 66.4, y: 11.8, w: 33.4, h: 37.6 },
  panel4: { x: 0.5, y: 50.5, w: 33.2, h: 35.2 },
  bottom56: { x: 34, y: 50.5, w: 65.8, h: 35.2 },
  flow: { x: 0.5, y: 87, w: 99.2, h: 12.4 },
} satisfies Record<string, Area>;

const STEPS: { icon: IconName; panels: Text; title: Text; body: Text; areas: Area[] }[] = [
  { icon: 'file', panels: t('Panels 1–2', 'اللوحتان 1–2'), areas: [AREA.top12],
    title: t('Collect and prepare heritage sources', 'جمع مصادر التراث وتجهيزها'),
    body: t('College students gather PDFs, text files, Word documents, audio recordings and videos. They extract text from documents, transcribe recordings, and preserve source details such as titles, page numbers and timestamps.',
      'يجمع طلاب الكلية ملفات PDF والملفات النصية ومستندات Word والتسجيلات الصوتية ومقاطع الفيديو. ويستخرجون النص من المستندات، ويفرّغون التسجيلات كتابيًا، ويحفظون تفاصيل المصدر مثل العناوين وأرقام الصفحات والطوابع الزمنية.') },
  { icon: 'chip', panels: t('Panel 3', 'اللوحة 3'), areas: [AREA.panel3],
    title: t('Fine-tune the Qwen model on RunPod', 'الضبط الدقيق لنموذج Qwen على RunPod'),
    body: t('Use an open-weight Qwen model in the 27-billion-parameter class as the foundation. Turn about 10–20% of the prepared material into curated JSONL training examples. They teach the model the desired writing style, Omani heritage terminology, and how to explain differences between accounts.',
      'يُستخدم نموذج Qwen مفتوح الأوزان من فئة 27 مليار معامل أساسًا. ويُحوَّل نحو 10–20% من المادة المجهَّزة إلى أمثلة تدريب منتقاة بصيغة JSONL، تعلّم النموذج أسلوب الكتابة المطلوب، ومصطلحات التراث العُماني، وكيف يشرح الفروق بين الروايات.') },
  { icon: 'grid', panels: t('Panel 4', 'اللوحة 4'), areas: [AREA.panel4],
    title: t('Build the RAG knowledge base', 'بناء قاعدة المعرفة للاسترجاع (RAG)'),
    body: t('Upload the remaining 80–90% of the material to the retrieval pipeline. Split the text into passages (chunks), turn each passage into an embedding, and store them in a vector database together with their source references.',
      'تُرفع نسبة 80–90% المتبقية من المادة إلى مسار الاسترجاع: يُقسَّم النص إلى مقاطع، ويُحوَّل كل مقطع إلى متجه تضمين، وتُخزَّن في قاعدة بيانات متجهات مع مراجع مصادرها.') },
  { icon: 'network', panels: t('Panels 5–6 and the bottom row', 'اللوحتان 5–6 والشريط السفلي'), areas: [AREA.bottom56, AREA.flow],
    title: t('Connect both parts in a web application', 'ربط الجزأين في تطبيق ويب'),
    body: t('When a user asks a question, RAG retrieves the relevant passages and their sources. The app sends the question, the passages and the source references to the fine-tuned model, which writes the answer. The app shows the answer with its citations.',
      'عندما يطرح المستخدم سؤالًا، يسترجع RAG المقاطع ذات الصلة ومصادرها. ثم يرسل التطبيق السؤال والمقاطع ومراجع المصادر إلى النموذج المضبوط بدقة، فيكتب الإجابة، ويعرضها التطبيق مع استشهاداتها.') },
];

/** The worked example: the khanjar record, its passages and a cited answer. */
const KHANJAR = RECORDS.find(record => record.family === 'al-khanjar')!;
/** Stored passages, written as complete sentences from the UNESCO record, as a chunk would be. */
const PASSAGES: { text: Text; score: number; cited: boolean }[] = [
  { score: 0.86, cited: true,
    text: t('The khanjar is worn at national and religious events and on special occasions such as weddings. It is also given as a gift to official guests.',
      'يُلبس الخنجر في المناسبات الوطنية والدينية والمناسبات الخاصة مثل الأعراس، كما يُهدى إلى الضيوف الرسميين.') },
  { score: 0.81, cited: true,
    text: t('The khanjar is made from materials including wood, leather, cloth and silver, and its engraved designs reflect a connection to the land.',
      'يُصنع الخنجر من مواد متعددة منها الخشب والجلد والقماش والفضة، وتعكس نقوشه ارتباط الإنسان بأرضه.') },
  { score: 0.64, cited: false, text: KHANJAR.pairs[0].answer },
];
const SOURCE: Text = t('UNESCO, “Al-Khanjar: craft skills and social practices”, 2022', 'اليونسكو، «الخنجر: مهارات الحرفة والممارسات الاجتماعية»، 2022');
const ANSWER: Text = t('The Omani khanjar is worn around the waist at national and religious events and on special occasions such as weddings, and it is given as a gift to official guests [1]. It is made from wood, leather, cloth and silver, and its engraved designs reflect a connection to the land [2].',
  'يُلبس الخنجر العُماني حول الخصر في المناسبات الوطنية والدينية والمناسبات الخاصة مثل الأعراس، ويُهدى إلى الضيوف الرسميين [1]. ويُصنع من الخشب والجلد والقماش والفضة، وتعكس نقوشه ارتباط الإنسان بأرضه [2].');

const FLOW: { icon: IconName; title: Text }[] = [
  { icon: 'help', title: t('User question', 'سؤال المستخدم') },
  { icon: 'search', title: t('RAG retrieves passages + sources', 'RAG يسترجع المقاطع والمصادر') },
  { icon: 'sparkles', title: t('Fine-tuned model writes', 'النموذج المضبوط يكتب') },
  { icon: 'check', title: t('Answer + citations', 'الإجابة مع الاستشهادات') },
];

function Illustration({ active }: { active: number | null }) {
  const say = useTx();
  const [open, setOpen] = useState(false);
  const poster: Poster = {
    id: 'turath-assistant',
    kicker: say(t('TurathAI · project overview', 'تراث AI · نظرة عامة على المشروع')),
    title: say(t('Building an Omani Heritage AI Assistant', 'بناء مساعد ذكي للتراث العُماني')),
    caption: '',
    alt: say(t('Illustration in six panels: 1 collect heritage sources (PDF, text, Docs, audio, video); 2 prepare the material (transcription, text extraction, cleaning, preserve source references); 3 fine-tune on RunPod (10–20% of source material, curated JSONL examples, Qwen base model, GPU); 4 build the RAG index (80–90% of source material, chunks, embeddings, vector database); 5 connect the RAG retriever and the fine-tuned model to a web app; 6 answer with sources. Bottom row: user question, RAG retrieves passages and sources, fine-tuned model writes, answer and citations.',
      'رسم توضيحي من ست لوحات: 1 جمع مصادر التراث (PDF ونصوص ومستندات وصوت وفيديو)؛ 2 تجهيز المادة (التفريغ واستخراج النص والتنظيف وحفظ مراجع المصادر)؛ 3 الضبط الدقيق على RunPod (10–20% من المادة، أمثلة JSONL منتقاة، نموذج Qwen الأساسي، GPU)؛ 4 بناء فهرس RAG (80–90% من المادة، مقاطع، تضمينات، قاعدة بيانات متجهات)؛ 5 ربط المسترجِع والنموذج المضبوط بتطبيق ويب؛ 6 الإجابة مع المصادر. الشريط السفلي: سؤال المستخدم، ثم استرجاع المقاطع والمصادر، ثم كتابة النموذج، ثم الإجابة مع الاستشهادات.')),
    thumb: IMAGE_SMALL, full: IMAGE_FULL, width: IMAGE_W, height: IMAGE_H,
  };
  const areas = active === null ? [] : STEPS[active].areas;
  return <figure className="tv-figure">
    <button type="button" className="tv-image" onClick={() => setOpen(true)} aria-label={say(t('Enlarge the project illustration', 'كبّر الرسم التوضيحي للمشروع'))}>
      <img src={IMAGE_SMALL} srcSet={`${IMAGE_SMALL} 960w, ${IMAGE_FULL} ${IMAGE_W}w`} sizes="(max-width: 1100px) 100vw, 1000px"
        alt={poster.alt} width={IMAGE_W} height={IMAGE_H} loading="lazy" data-testid="tv-image"/>
      {areas.map((area, index) => <span key={index} className="tv-spot" aria-hidden="true"
        style={{ left: `${area.x}%`, top: `${area.y}%`, width: `${area.w}%`, height: `${area.h}%` } as CSSProperties}/>)}
      <span className="tv-zoom"><Icon name="search" size={14}/>{say(t('Enlarge', 'تكبير'))}</span>
    </button>
    <figcaption>
      {say(t('Project illustration: the six panels follow the build order, and the bottom row shows what happens each time a user asks a question.',
        'الرسم التوضيحي للمشروع: تتبع اللوحات الست ترتيب البناء، ويبيّن الشريط السفلي ما يحدث كلما طرح المستخدم سؤالًا.'))}
      <span className="tv-lang">{say(t('', ' النص داخل الرسم باللغة الإنجليزية.'))}</span>
    </figcaption>
    {open && <PosterLightbox poster={poster} onClose={() => setOpen(false)} labels={{
      zoomIn: say(t('Zoom in', 'تكبير')), fit: say(t('Fit to screen', 'ملاءمة الشاشة')), open: say(t('Open original', 'افتح الأصل')),
      close: say(t('Close the illustration', 'أغلق الرسم')),
      hintZoomed: say(t('Scroll to explore the illustration. Click it or Fit to screen to return.', 'مرّر لاستكشاف الرسم. انقره أو اختر «ملاءمة الشاشة» للعودة.')),
      hintFit: say(t('Click the illustration to zoom in, or open the original in a new tab.', 'انقر الرسم لتكبيره، أو افتح الأصل في تبويب جديد.')),
    }}/>}
  </figure>;
}

function Workflow({ active, setActive }: { active: number | null; setActive: (index: number | null) => void }) {
  const say = useTx();
  return <ol className="tv-steps" data-testid="tv-steps">
    {STEPS.map((step, index) => <li key={index}>
      <button type="button" className={`tv-step${active === index ? ' on' : ''}`} aria-pressed={active === index}
        onClick={() => setActive(active === index ? null : index)} data-testid={`tv-step-${index}`}>
        <span className="tv-step-n">{index + 1}</span>
        <span className="tv-step-text">
          <b><Icon name={step.icon} size={15}/>{say(step.title)}</b>
          <span>{say(step.body)}</span>
          <small><Icon name="target" size={12}/>{say(t('In the illustration:', 'في الرسم:'))} {say(step.panels)}</small>
        </span>
      </button>
    </li>)}
  </ol>;
}

function Split() {
  const say = useTx();
  return <div className="tv-split" data-testid="tv-split">
    <div className="tv-split-bar" role="img" aria-label={say(t('About 10–20% of the source material becomes training examples; about 80–90% goes into the RAG knowledge base.', 'نحو 10–20% من المادة تصبح أمثلة تدريب، ونحو 80–90% تذهب إلى قاعدة المعرفة للاسترجاع.'))}>
      <span className="ft"><b dir="ltr">10–20%</b>{say(t('Fine-tuning', 'الضبط الدقيق'))}</span>
      <span className="rag"><b dir="ltr">80–90%</b>{say(t('RAG knowledge base', 'قاعدة المعرفة (RAG)'))}</span>
    </div>
    <div className="tv-split-cols">
      <div className="ft">
        <strong>{say(t('Fine-tuning teaches how to answer', 'الضبط الدقيق يعلّم كيف يُجيب'))}</strong>
        <p>{say(t('A small, carefully written set of examples is enough to change behaviour: Arabic style, heritage terms, and comparing accounts fairly. Changing it means training again.',
          'مجموعة صغيرة من الأمثلة المكتوبة بعناية تكفي لتغيير السلوك: الأسلوب العربي، ومصطلحات التراث، والمقارنة العادلة بين الروايات. وتغييره يعني التدريب من جديد.'))}</p>
      </div>
      <div className="rag">
        <strong>{say(t('RAG supplies what to say, and where it came from', 'الاسترجاع يوفّر ما يُقال ومن أين جاء'))}</strong>
        <p>{say(t('Most of the material stays as searchable passages with their references, so facts can be checked and cited. Adding a new verified source needs no retraining.',
          'تبقى معظم المادة مقاطع قابلة للبحث مع مراجعها، فيمكن التحقق من الحقائق والاستشهاد بها. وإضافة مصدر موثَّق جديد لا تحتاج إلى إعادة تدريب.'))}</p>
      </div>
    </div>
  </div>;
}

function FollowQuestion() {
  const say = useTx();
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    if (stage >= FLOW.length - 1) { setPlaying(false); return; }
    const timer = window.setTimeout(() => setStage(stage + 1), 2200);
    return () => window.clearTimeout(timer);
  }, [playing, stage]);
  const passages = PASSAGES.map((item, index) => ({ ...item, n: index + 1 }));
  const cited = passages.filter(item => item.cited);

  return <div className="tv-follow" data-testid="tv-follow">
    <div className="tv-follow-head">
      <ol className="tv-flow" aria-label={say(t('Question to answer', 'من السؤال إلى الإجابة'))}>
        {FLOW.map((item, index) => <li key={index}>
          <button type="button" className={index === stage ? 'on' : index < stage ? 'done' : ''} onClick={() => { setPlaying(false); setStage(index); }}
            aria-current={index === stage ? 'step' : undefined} data-testid={`tv-flow-${index}`}>
            <Icon name={item.icon} size={15}/><span>{say(item.title)}</span></button>
        </li>)}
      </ol>
      <button type="button" className="button small primary" data-testid="tv-follow-play"
        onClick={() => { if (stage >= FLOW.length - 1) setStage(0); setPlaying(!playing); }}>
        <Icon name={playing ? 'pause' : stage >= FLOW.length - 1 ? 'refresh' : 'play'} size={14}/>
        {playing ? say(t('Pause', 'أوقف مؤقتًا')) : stage >= FLOW.length - 1 ? say(t('Again', 'مرة أخرى')) : say(t('Play', 'شغّل'))}</button>
    </div>

    <div className="tv-stage" key={stage} data-testid="tv-stage">
      {stage === 0 && <>
        <p className="tv-say"><Icon name="help" size={16}/><span>{say(EVAL_QUESTION)}</span></p>
        <p className="tv-explain">{say(t('A student types a question in the web app. Nothing has been searched yet, and the model has not seen this question before.',
          'يكتب الطالب سؤالًا في تطبيق الويب. لم يُبحث عن شيء بعد، ولم يرَ النموذج هذا السؤال من قبل.'))}</p>
      </>}
      {stage === 1 && <>
        <p className="tv-explain">{say(t('The question is turned into an embedding and compared with the stored passages. The closest ones come back with their source reference.',
          'يُحوَّل السؤال إلى متجه تضمين ويُقارن بالمقاطع المخزَّنة، فتعود أقربها مع مرجع مصدرها.'))}</p>
        <ol className="tv-passages">
          {passages.map(item => <li key={item.n} className={item.cited ? 'keep' : 'drop'}>
            <span className="tv-score" dir="ltr">{item.score.toFixed(2)}</span>
            <div><p>{say(item.text)}</p><small><Icon name="book" size={12}/>{say(SOURCE)}</small></div>
          </li>)}
        </ol>
        <p className="tv-note">{say(t('Similarity scores are illustrative. The top passages are kept; a weaker one (about the emblem) is left out because it does not answer the question.',
          'درجات التشابه توضيحية. تُحفظ المقاطع الأعلى، ويُترك مقطع أضعف (عن الشعار) لأنه لا يجيب عن السؤال.'))}</p>
      </>}
      {stage === 2 && <>
        <p className="tv-explain">{say(t('The app sends three things to the fine-tuned model: the question, the retrieved passages, and their references. The instruction asks it to answer only from the passages and to cite them.',
          'يرسل التطبيق ثلاثة أشياء إلى النموذج المضبوط: السؤال، والمقاطع المسترجَعة، ومراجعها. وتطلب التعليمات منه أن يجيب من المقاطع فقط وأن يستشهد بها.'))}</p>
        <pre className="tv-prompt" dir="auto" data-testid="tv-prompt">{[
          say(t('Instruction: Answer in clear language using only the passages below. Cite each fact as [1], [2]. If the passages do not answer the question, say so.',
            'التعليمات: أجب بلغة واضحة مستخدمًا المقاطع أدناه فقط. استشهد لكل معلومة بـ [1] و [2]. وإن لم تُجب المقاطع عن السؤال فقل ذلك.')),
          '',
          ...cited.map((item, index) => `[${index + 1}] ${say(item.text)}\n    — ${say(SOURCE)}`),
          '',
          `${say(t('Question', 'السؤال'))}: ${say(EVAL_QUESTION)}`,
        ].join('\n')}</pre>
      </>}
      {stage === 3 && <>
        <div className="tv-answer" data-testid="tv-answer">
          <p>{say(ANSWER)}</p>
          <div className="tv-cites"><b><Icon name="book" size={13}/>{say(t('Sources', 'المصادر'))}</b>
            {cited.map((item, index) => <a key={item.n} href={KHANJAR.url} target="_blank" rel="noreferrer"><b dir="ltr">[{index + 1}]</b><span>{say(SOURCE)}</span><Icon name="external" size={12}/></a>)}</div>
        </div>
        <p className="tv-explain">{say(t('The fine-tuned model gives the style and terminology; the passages give the facts. Every fact links back to a source the reader can open and check.',
          'النموذج المضبوط يعطي الأسلوب والمصطلحات، والمقاطع تعطي الحقائق. وكل معلومة ترتبط بمصدر يستطيع القارئ فتحه والتحقق منه.'))}</p>
      </>}
    </div>
  </div>;
}

export function TurathOverview() {
  const say = useTx();
  const [active, setActive] = useState<number | null>(null);
  return <div className="tv-overview" data-testid="tv-overview">
    <div className="tv-objective">
      <span className="eyebrow">{say(t('Project objective', 'هدف المشروع'))}</span>
      <p>{say(t('Build a web application that helps users explore Omani oral histories, folktales, proverbs, customs and cultural practices. It combines a fine-tuned Qwen model with retrieval-augmented generation (RAG), so it gives clear answers with citations to the original sources.',
        'بناء تطبيق ويب يساعد المستخدمين على استكشاف التاريخ الشفهي العُماني والحكايات الشعبية والأمثال والعادات والممارسات الثقافية. ويجمع بين نموذج Qwen مضبوط بدقة والتوليد المعزَّز بالاسترجاع (RAG)، فيقدّم إجابات واضحة مع استشهادات بالمصادر الأصلية.'))}</p>
    </div>

    <Illustration active={active}/>

    <h5 className="tv-sub"><Icon name="layers" size={14}/>{say(t('Project workflow: click a step to find it in the illustration', 'سير عمل المشروع: انقر خطوة لتجدها في الرسم'))}</h5>
    <Workflow active={active} setActive={setActive}/>

    <h5 className="tv-sub"><Icon name="chart" size={14}/>{say(t('How the source material is divided', 'كيف تُقسَّم مادة المصادر'))}</h5>
    <Split/>

    <h5 className="tv-sub"><Icon name="play" size={14}/>{say(t('Follow one question through the application', 'تابع سؤالًا واحدًا عبر التطبيق'))}</h5>
    <FollowQuestion/>

    <div className="tv-notes">
      <div>
        <b><Icon name="help" size={14}/>{say(t('Model selection note', 'ملاحظة عن اختيار النموذج'))}</b>
        <p>{say(t('The illustration says “Qwen base model”. This plan names Qwen3.8-27B; the exact checkpoint name, revision and licence must be confirmed before setup (phase 1 of the checklist below).',
          'يذكر الرسم «نموذج Qwen الأساسي». وتسمّي هذه الخطة Qwen3.8-27B؛ ويجب تأكيد اسم النسخة الدقيق وإصدارها وترخيصها قبل الإعداد (المرحلة 1 في قائمة المراحل أدناه).'))}</p>
      </div>
      <div>
        <b><Icon name="bulb" size={14}/>{say(t('Good practice for this design', 'ممارسات جيدة لهذا التصميم'))}</b>
        <ul>
          <li>{say(t('Store the title, page or timestamp with every passage: citations can only be as good as these references.', 'خزّن العنوان والصفحة أو الطابع الزمني مع كل مقطع، فالاستشهادات لا تكون أدق من هذه المراجع.'))}</li>
          <li>{say(t('Keep the test questions out of the training examples, splitting by story family, so the evaluation is fair.', 'أبقِ أسئلة الاختبار خارج أمثلة التدريب، مع التقسيم حسب عائلة القصة، ليكون التقييم عادلًا.'))}</li>
          <li>{say(t('The 10–20% / 80–90% split describes where the effort goes. Sources behind the training examples can also be indexed, so their facts can be cited too.', 'تقسيم 10–20% / 80–90% يصف أين يُبذل الجهد. ويمكن أيضًا فهرسة المصادر التي بُنيت منها أمثلة التدريب، فيُستشهد بحقائقها كذلك.'))}</li>
          <li>{say(t('Get the narrators’ consent for oral recordings, and record the rights for each source in the source register.', 'احصل على موافقة الرواة على التسجيلات الشفهية، وسجّل حقوق كل مصدر في سجل المصادر.'))}</li>
        </ul>
      </div>
    </div>
  </div>;
}
