/**
 * Part 12 additions: evidence for how RAG should be used and what a fine-tuned Qwen adds.
 * RAG includes the model that writes; the same passages answered three ways; what to fix first;
 * a fair test of base vs fine-tuned Qwen; and the project's claim, put precisely.
 * Interviews and scores here are illustrative samples, not real records or measured results.
 */
import { useState } from 'react';
import type { ReactNode } from 'react';
import './ragevidence.css';
import { Icon } from './ui';
import type { IconName } from './ui';
import { t, useTx } from './FineTuneScenes';
import type { Text } from './FineTuneScenes';

const cls = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(' ');
const LRI = '⁦', PDI = '⁩';

function Heading({ icon, children }: { icon: IconName; children: ReactNode }) {
  return <h4 className="llm-sub ft-handson"><Icon name={icon} size={13}/>{children}</h4>;
}

function Cite({ n }: { n: number }) {
  return <span className="re-cite" dir="ltr">[{n}]</span>;
}

// ================================================== one question, three writers

const FUWALA = '⁨«الفوالة»⁩';
const QUESTION = t('Did families in Dhofar serve coffee first to guests?', 'هل كانت الأسر في ظفار تقدّم القهوة للضيوف أولًا؟');

const PASSAGES: { n: number; ref: string; text: Text }[] = [
  { n: 1, ref: 'Interview INT-2020-031 · a family in Taqah · 08:10',
    text: t('In our house the guest was given coffee first, then dates.', 'في بيتنا كان الضيف يُقدَّم له القهوة أولًا، ثم التمر.') },
  { n: 2, ref: 'Interview INT-2022-012 · a family in the mountains · 22:40',
    text: t(`My grandmother set out ${FUWALA} first, and only then poured the coffee.`, `كانت جدتي تضع ${FUWALA} أولًا، ثم تصبّ القهوة.`) },
];

type Flag = 'good' | 'bad' | 'warn';
interface Writer { key: string; name: Text; how: Text; answer: { text: Text; cite?: number; flag?: Flag }[]; checks: { text: Text; flag: Flag }[]; lesson: Text }

const WRITERS: Writer[] = [
  { key: 'base', name: t('Qwen as it comes', 'Qwen كما هو'), how: t('base model + a plain prompt', 'نموذج أساسي + تلقين بسيط'),
    answer: [
      { text: t('Yes. In Dhofar, coffee is served to guests first, followed by dates', 'نعم. في ظفار تُقدَّم القهوة للضيوف أولًا ثم التمر'), cite: 1, flag: 'bad' },
      { text: t('.', '.') },
    ],
    checks: [
      { text: t('Generalises one family’s practice to all of Dhofar', 'يعمّم ممارسة أسرة واحدة على ظفار كلها'), flag: 'bad' },
      { text: t('Drops the second interview, which says the opposite', 'يُسقط المقابلة الثانية التي تقول العكس'), flag: 'bad' },
      { text: t('Cites a real source', 'يستشهد بمصدر حقيقي'), flag: 'good' },
    ],
    lesson: t('The search worked: both interviews arrived. The writing failed. A polished, confident answer can still be wrong.', 'نجح البحث: وصلت المقابلتان. وأخفقت الكتابة. فالإجابة المصقولة الواثقة قد تكون خاطئة.') },
  { key: 'prompted', name: t('Qwen + clearer instructions', 'Qwen + تعليمات أوضح'), how: t('base model + rules and two worked examples in the prompt', 'نموذج أساسي + قواعد ومثالان محلولان في التلقين'),
    answer: [
      { text: t('The two interviews differ. In one family, coffee came first, then dates', 'تختلف المقابلتان. في إحدى الأسر جاءت القهوة أولًا ثم التمر'), cite: 1, flag: 'good' },
      { text: t(`. In another, the grandmother first served ${FUWALA}, a kind of drink, and then coffee`, `. وفي أسرة أخرى قدّمت الجدة أولًا ${FUWALA}، وهي نوع من المشروبات، ثم القهوة`), cite: 2, flag: 'warn' },
      { text: t('. The sources do not describe all of Dhofar.', '. ولا تصف المصادر ظفار كلها.'), flag: 'good' },
    ],
    checks: [
      { text: t('Keeps the two accounts apart, each with its source', 'يفصل الروايتين، كلًّا مع مصدرها'), flag: 'good' },
      { text: t('Limits the claim to what the sources support', 'يحصر الادعاء فيما تدعمه المصادر'), flag: 'good' },
      { text: t(`Misreads the local word ${FUWALA} as a drink`, `يسيء فهم الكلمة المحلية ${FUWALA} فيجعلها مشروبًا`), flag: 'bad' },
    ],
    lesson: t('Instructions and examples fixed the generalisation, so always try them first. The local expression is still misread. If that keeps happening across many test questions, it is the case for fine-tuning.',
      'أصلحت التعليمات والأمثلة التعميم، فجرّبها دائمًا أولًا. لكن التعبير المحلي ما زال يُساء فهمه. وإن تكرر ذلك عبر أسئلة اختبار كثيرة فهذه حجة الضبط الدقيق.') },
  { key: 'tuned', name: t('Fine-tuned Qwen', 'Qwen المضبوط'), how: t('QLoRA adapter trained on heritage answers + the same passages', 'مهايئ QLoRA مدرَّب على إجابات تراثية + المقاطع نفسها'),
    answer: [
      { text: t('⁨«تختلف الروايتان»⁩: in a family in Taqah, the guest was given coffee first, then dates', '⁨«تختلف الروايتان»⁩: في أسرة من طاقة كان الضيف يُقدَّم له القهوة أولًا ثم التمر'), cite: 1, flag: 'good' },
      { text: t(`. In a mountain family, the grandmother first set out ${FUWALA}, the dates, fruit and sweets offered to guests, and only then poured the coffee`, `. وفي أسرة من الجبل كانت الجدة تضع ${FUWALA} أولًا، أي ما يُقدَّم للضيف من تمر وفاكهة وحلوى، ثم تصبّ القهوة`), cite: 2, flag: 'good' },
      { text: t('. These are two families’ accounts; they do not show a single custom for all of Dhofar.', '. هاتان روايتا أسرتين، ولا تدلان على عادة واحدة في ظفار كلها.'), flag: 'good' },
    ],
    checks: [
      { text: t('Explains the local expression in clear Arabic', 'يشرح التعبير المحلي بعربية واضحة'), flag: 'good' },
      { text: t('Says exactly where the two accounts differ, each tied to its family', 'يبيّن بدقة أين تختلف الروايتان، وكلٌّ مربوط بأسرته'), flag: 'good' },
      { text: t('Limits the claim, and keeps both citations', 'يحصر الادعاء ويحتفظ بالاستشهادين'), flag: 'good' },
    ],
    lesson: t('Same passages, same question: the difference is in how the evidence is read and explained. The differences between the accounts are preserved, and for intangible heritage they can be worth preserving in their own right.',
      'المقاطع نفسها والسؤال نفسه: الفرق في طريقة قراءة الأدلة وشرحها. وقد حُفظت الفروق بين الروايتين، وهي في التراث غير المادي قد تستحق الحفظ بذاتها.') },
];

/** RAG = a search step + a language model that writes. The same retrieved passages, three writers. */
export function WhoWritesAnswer() {
  const say = useTx();
  const [pick, setPick] = useState(0);
  const writer = WRITERS[pick];
  return <div className="re-writers">
    <Heading icon="sparkle">{say(t('RAG still needs a writer: the same passages, three versions of Qwen', 'RAG يحتاج إلى كاتب: المقاطع نفسها وثلاث نسخ من Qwen'))}</Heading>
    <div className="re-pipe" aria-hidden="true">
      <span className="search"><Icon name="search" size={14}/><b>{say(t('Search step', 'خطوة البحث'))}</b><small>{say(t('finds excerpts + references', 'تجد المقتطفات والمراجع'))}</small></span>
      <i/>
      <span className="model"><Icon name="layers" size={14}/><b>{say(t('Language model (Qwen)', 'النموذج اللغوي (Qwen)'))}</b><small>{say(t('reads, writes and formats the answer', 'يقرأ ويكتب الإجابة وينسّقها'))}</small></span>
      <em>{say(t('Both together are RAG: retrieval-augmented generation', 'والاثنان معًا هما RAG: توليد معزَّز بالاسترجاع'))}</em>
    </div>
    <p className="re-q"><Icon name="help" size={13}/>{say(QUESTION)}</p>
    <div className="re-passages">{PASSAGES.map(passage => <span key={passage.n}><small dir="ltr"><Cite n={passage.n}/> {passage.ref}</small>{say(passage.text)}</span>)}</div>
    <div className="ft-tabs" role="group" aria-label={say(t('Writer', 'الكاتب'))}>
      {WRITERS.map((item, index) => <button key={item.key} type="button" className={index === pick ? 'current' : ''} aria-pressed={index === pick}
        onClick={() => setPick(index)}>{say(item.name)}</button>)}
    </div>
    <div className={cls('re-answer', writer.key)} key={writer.key}>
      <small>{say(writer.how)}</small>
      <p data-testid="writer-answer">{writer.answer.map((part, index) => <span key={index} className={part.flag}>{say(part.text)}{part.cite && <Cite n={part.cite}/>}</span>)}</p>
      <ul className="re-checks">{writer.checks.map(check => <li key={check.text.en} className={check.flag}>
        <Icon name={check.flag === 'good' ? 'check' : 'close'} size={12}/>{say(check.text)}</li>)}</ul>
    </div>
    <p className="lx-key" data-testid="writer-lesson"><Icon name="bulb" size={14}/><span>{say(writer.lesson)}</span></p>
    <p className="re-sample">{say(t('Sample interviews for teaching, not real archive records.', 'مقابلات نموذجية للتعليم، وليست سجلات أرشيف حقيقية.'))}</p>
  </div>;
}

// ================================================== what to fix first

type Rung = 0 | 1 | 2 | 3;
const RUNGS: { icon: IconName; name: Text; text: Text }[] = [
  { icon: 'check', name: t('Keep Qwen + RAG', 'أبقِ Qwen + RAG'), text: t('Nothing to change.', 'لا شيء يحتاج إلى تغيير.') },
  { icon: 'search', name: t('Improve the archive search', 'حسّن البحث في الأرشيف'), text: t('Chunking, metadata filters, hybrid search, threshold, missing documents.', 'التقطيع وتصفية البيانات الوصفية والبحث الهجين والعتبة والوثائق الناقصة.') },
  { icon: 'code', name: t('Clearer instructions + a few examples', 'تعليمات أوضح + أمثلة قليلة'), text: t('Rules and worked examples in the prompt. Cheap, instant, no training.', 'قواعد وأمثلة محلولة في التلقين. رخيصة وفورية وبلا تدريب.') },
  { icon: 'layers', name: t('Fine-tune Qwen', 'اضبط Qwen ضبطًا دقيقًا'), text: t('Examples that teach the behaviour, when the problem persists.', 'أمثلة تعلّم السلوك، حين تستمر المشكلة.') },
];

const SYMPTOMS: { text: Text; rungs: Rung[]; advice: Text }[] = [
  { rungs: [0], text: t('Qwen finds the answer in the passages and explains it faithfully.', 'يجد Qwen الإجابة في المقاطع ويشرحها بأمانة.'),
    advice: t('Keep Qwen + RAG. Fine-tuning would add cost without a problem to solve.', 'أبقِ Qwen + RAG. فالضبط الدقيق سيضيف كلفة دون مشكلة يحلّها.') },
  { rungs: [1], text: t('The app retrieves an unrelated interview, or misses the right one.', 'يسترجع التطبيق مقابلة لا علاقة لها، أو يفوّت المقابلة الصحيحة.'),
    advice: t('Improve the archive search so Qwen receives the right passage. No model, tuned or not, can explain evidence it never received.', 'حسّن البحث في الأرشيف ليصل إلى Qwen المقطع الصحيح. فلا نموذج، مضبوطًا أو غير مضبوط، يستطيع شرح دليل لم يصله.') },
  { rungs: [2, 3], text: t('Right interview, but Qwen repeatedly misreads a Dhofari expression.', 'المقابلة صحيحة، لكن Qwen يسيء فهم تعبير ظفاري مرارًا.'),
    advice: t('Try clearer instructions and examples first. If it persists, fine-tune with examples of local expressions in context.', 'جرّب تعليمات وأمثلة أوضح أولًا. وإن استمر فاضبطه بأمثلة لتعابير محلية في سياقها.') },
  { rungs: [2, 3], text: t('Right passages, but Qwen mixes up two different accounts.', 'المقاطع صحيحة، لكن Qwen يخلط بين روايتين مختلفتين.'),
    advice: t('Instructions and examples first (“keep each account with its source”). If it persists, fine-tune with examples that present differing accounts side by side.', 'التعليمات والأمثلة أولًا («أبقِ كل رواية مع مصدرها»). وإن استمر فاضبطه بأمثلة تعرض الروايات المختلفة جنبًا إلى جنب.') },
  { rungs: [2, 3], text: t('Two interviews about two families become “all families in Dhofar”.', 'مقابلتان عن أسرتين تصبحان «كل الأسر في ظفار».'),
    advice: t('Instructions and examples first. If the mistake persists, fine-tune with examples that teach Qwen to limit claims to what the sources support.', 'التعليمات والأمثلة أولًا. وإن استمر الخطأ فاضبطه بأمثلة تعلّم Qwen أن يحصر ادعاءاته فيما تدعمه المصادر.') },
  { rungs: [2], text: t('The facts are right; you only want a neater format.', 'الحقائق صحيحة، وتريد تنسيقًا أفضل فقط.'),
    advice: t('Instructions and a few examples are usually enough for formatting. Fine-tuning earns its place through cultural and linguistic accuracy, not layout.', 'التعليمات وأمثلة قليلة تكفي عادةً للتنسيق. فالضبط الدقيق يستحق مكانه بالدقة الثقافية واللغوية لا بالتنسيق.') },
];

/** Pick a test result; the ladder lights the first fix to try, and the next one if it persists. */
export function FixLadder() {
  const say = useTx();
  const [pick, setPick] = useState(2);
  const symptom = SYMPTOMS[pick];
  return <div className="re-ladder">
    <Heading icon="target">{say(t('You tested it. What do you fix first?', 'اختبرته. ماذا تصلح أولًا؟'))}</Heading>
    <p className="lx-lead">{say(t('Ask real questions about proverbs, customs and oral stories, and read the retrieved passages next to each answer. Then pick what you saw.', 'اطرح أسئلة حقيقية عن الأمثال والعادات والقصص الشفهية، واقرأ المقاطع المسترجَعة بجانب كل إجابة. ثم اختر ما رأيت.'))}</p>
    <div className="re-ladder-grid">
      <ol className="re-symptoms">{SYMPTOMS.map((item, index) => <li key={item.text.en}>
        <button type="button" className={index === pick ? 'on' : ''} aria-pressed={index === pick} onClick={() => setPick(index)}>{say(item.text)}</button></li>)}</ol>
      <div className="re-rungs">
        {RUNGS.map((rung, index) => {
          const at = symptom.rungs.indexOf(index as Rung);
          return <div key={rung.name.en} className={cls('re-rung', `r${index}`, at === 0 && 'first', at === 1 && 'then')} data-testid={at === 0 ? 'ladder-first' : undefined}>
            <Icon name={rung.icon} size={15}/><b>{say(rung.name)}</b><small>{say(rung.text)}</small>
            {at === 0 && <em>{say(t('try this', 'جرّب هذا'))}</em>}{at === 1 && <em>{say(t('if it persists', 'إن استمر'))}</em>}
          </div>;
        })}
      </div>
    </div>
    <p className="lx-good" data-testid="ladder-advice" key={pick}>{say(symptom.advice)}</p>
  </div>;
}

// ================================================== a fair test

const CRITERIA = [t('Facts right', 'الحقائق صحيحة'), t('Cites the correct source', 'يستشهد بالمصدر الصحيح'), t('Says when the evidence is insufficient', 'يقول حين تكون الأدلة غير كافية')];
const SCENARIOS: { name: Text; base: number[]; tuned: number[] }[] = [
  { name: t('Example result A', 'نتيجة مثال أ'), base: [31, 30, 18], tuned: [37, 38, 34] },
  { name: t('Example result B', 'نتيجة مثال ب'), base: [36, 36, 33], tuned: [37, 36, 34] },
];
const TOTAL = 40;

/** Base vs fine-tuned Qwen on the same held-out questions and the same passages. */
export function FairTest() {
  const say = useTx();
  const [pick, setPick] = useState(0);
  const scenario = SCENARIOS[pick];
  const gain = scenario.tuned.reduce((sum, value, index) => sum + value - scenario.base[index], 0);
  const helps = gain >= 10;
  return <div className="re-fair">
    <Heading icon="chart">{say(t('Prove it: a fair test of regular vs fine-tuned Qwen', 'أثبت ذلك: اختبار عادل بين Qwen العادي والمضبوط'))}</Heading>
    <ol className="re-protocol">
      {[t('The same questions for both models', 'الأسئلة نفسها للنموذجين'), t('The same retrieved passages, so only the writer differs', 'المقاطع المسترجَعة نفسها، فلا يختلف إلا الكاتب'),
        t('Questions held back from training', 'أسئلة حُجبت عن التدريب'), t('Mark facts and sources, not polish; markers do not know which model wrote which answer', 'قيّم الحقائق والمصادر لا الصقل، ولا يعرف المقيِّم أي نموذج كتب أي إجابة')]
        .map((item, index) => <li key={item.en}><b dir="ltr">{index + 1}</b>{say(item)}</li>)}
    </ol>
    <div className="ft-tabs" role="group" aria-label={say(t('Result', 'النتيجة'))}>
      {SCENARIOS.map((item, index) => <button key={item.name.en} type="button" className={index === pick ? 'current' : ''} aria-pressed={index === pick}
        onClick={() => setPick(index)}>{say(item.name)}</button>)}
    </div>
    <div className="re-score" key={pick}>
      <div className="re-legend"><span className="base"><i/>{say(t('Qwen + RAG', 'Qwen + RAG'))}</span><span className="tuned"><i/>{say(t('Fine-tuned Qwen + RAG', 'Qwen المضبوط + RAG'))}</span>
        <small dir="ltr">/ {TOTAL}</small></div>
      {CRITERIA.map((criterion, index) => <div key={criterion.en} className="re-row">
        <span>{say(criterion)}</span>
        <div className="re-bars">
          <i className="base" style={{ width: `${scenario.base[index] / TOTAL * 100}%` }}><b dir="ltr">{scenario.base[index]}</b></i>
          <i className="tuned" style={{ width: `${scenario.tuned[index] / TOTAL * 100}%` }}><b dir="ltr">{scenario.tuned[index]}</b></i>
        </div>
      </div>)}
    </div>
    <p className={helps ? 'lx-good' : 'lx-warning'} data-testid="fair-verdict">{helps
      ? say(t('Fine-tuned Qwen is more consistent on all three, above all on admitting when the evidence is insufficient. Here fine-tuning adds accuracy.', 'Qwen المضبوط أكثر ثباتًا في الثلاثة، وخاصة في الإقرار بعدم كفاية الأدلة. هنا يضيف الضبط الدقيق دقة.'))
      : say(t('Both perform about equally well. For these questions, Qwen + RAG is enough; spend the effort on the archive instead.', 'أداء النموذجين متقارب. ولهذه الأسئلة يكفي Qwen + RAG، فوجّه الجهد إلى الأرشيف بدلًا من ذلك.'))}</p>
    <p className="re-sample">{say(t(`Illustrative numbers on ${TOTAL} held-out questions. Run the same test with your own questions; that result is your evidence.`, `أرقام توضيحية على ${TOTAL} سؤالًا محجوبًا. أجرِ الاختبار نفسه بأسئلتك، فنتيجته هي دليلك.`))}</p>
  </div>;
}

// ================================================== the claim, put precisely

/** Is a fine-tuned model a good addition to a heritage assistant? The answer, with its conditions. */
export function HeritageClaim() {
  const say = useTx();
  const chain: { icon: IconName; who: Text; job: Text }[] = [
    { icon: 'library', who: t('The archive', 'الأرشيف'), job: t('preserves the original accounts', 'يحفظ الروايات الأصلية') },
    { icon: 'search', who: t('RAG', 'RAG'), job: t('brings the relevant accounts into the conversation', 'يُحضر الروايات ذات الصلة إلى المحادثة') },
    { icon: 'layers', who: t('Fine-tuned Qwen', 'Qwen المضبوط'), job: t('explains them in clear Arabic, preserving their local meaning and differences', 'يشرحها بعربية واضحة، محافظًا على معناها المحلي وفروقها') },
  ];
  return <div className="re-claim">
    <Heading icon="trophy">{say(t('Is a fine-tuned model a good addition? The claim, put precisely', 'هل النموذج المضبوط إضافة جيدة؟ الادعاء بدقة'))}</Heading>
    <div className="re-chain">{chain.map((item, index) => <div key={item.who.en} style={{ animationDelay: `${index * 0.2}s` }}>
      <Icon name={item.icon} size={18}/><b>{say(item.who)}</b><span>{say(item.job)}</span></div>)}</div>
    <div className="re-verdict">
      <div className="yes"><b><Icon name="check" size={14}/>{say(t('Yes, and this is where it is strongest', 'نعم، وهنا تكون أقوى'))}</b>
        <ul>
          <li>{say(t('Every RAG answer is written by a language model. The search step brings excerpts and references; Qwen reads, writes and formats. So how well Qwen reads heritage material shapes every answer.', 'كل إجابة في RAG يكتبها نموذج لغوي. فخطوة البحث تُحضر المقتطفات والمراجع، و Qwen يقرأ ويكتب وينسّق. لذا فإن جودة قراءة Qwen للمادة التراثية تؤثر في كل إجابة.'))}</li>
          <li>{say(t('Cultural and linguistic accuracy: local expressions read correctly, each narrator’s wording kept, accounts kept apart, claims limited to the evidence.', 'الدقة الثقافية واللغوية: فهم التعابير المحلية بشكل صحيح، والحفاظ على ألفاظ كل راوٍ، وفصل الروايات، وحصر الادعاءات في حدود الأدلة.'))}</li>
          <li>{say(t(`Saying ${LRI}⁨«تختلف الروايتان»⁩${PDI} and exactly where they differ, because for intangible heritage the differences are part of what is preserved.`, `قول ${LRI}⁨«تختلف الروايتان»⁩${PDI} وبيان موضع الاختلاف بدقة، لأن الفروق في التراث غير المادي جزء مما يُحفظ.`))}</li>
        </ul></div>
      <div className="care"><b><Icon name="bulb" size={14}/>{say(t('Be careful with these', 'انتبه إلى هذه'))}</b>
        <ul>
          <li>{say(t('Fine-tuning is optional, not required: start with Qwen as it comes + RAG.', 'الضبط الدقيق اختياري لا إلزامي: ابدأ بـ Qwen كما هو + RAG.'))}</li>
          <li>{say(t('For formatting alone, instructions and a few examples are usually enough.', 'للتنسيق وحده تكفي عادةً التعليمات وأمثلة قليلة.'))}</li>
          <li>{say(t('Fine-tuning does not fix retrieval: a missed interview stays missed.', 'الضبط الدقيق لا يُصلح الاسترجاع: المقابلة الفائتة تبقى فائتة.'))}</li>
          <li>{say(t('A polished answer can still be wrong. Claim the improvement only after the fair test shows it.', 'الإجابة المصقولة قد تكون خاطئة. ولا تدّعِ التحسّن إلا بعد أن يُظهره الاختبار العادل.'))}</li>
        </ul></div>
    </div>
  </div>;
}
