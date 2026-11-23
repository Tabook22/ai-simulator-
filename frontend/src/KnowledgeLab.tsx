/**
 * The Knowledge structures lab: how information is organised (taxonomy), defined and related
 * (ontology), connected into facts (knowledge graph) and given meaning (semantics). Six parts, one
 * at a time; the worked examples are the Omani heritage archive and the Dhofar University
 * academic guide (undergraduate catalogue 2024–2025, College of Arts and Applied Sciences).
 */
import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Icon } from './ui';
import type { IconName } from './ui';
import { t, useTx } from './FineTuneScenes';
import type { Text } from './FineTuneScenes';
import { GraphView, KnowledgeOverview, SemanticsView } from './KnowledgeStructures';
import { readStored, writeStored } from './libraryStorage';
import './knowledge.css';
import './knowledge-lab.css';

const tone = (color: string) => ({ ['--tone' as string]: color }) as CSSProperties;

type PartKey = 'taxonomy' | 'ontology' | 'diagram' | 'graph' | 'semantics' | 'together';
export const KNOWLEDGE_PARTS: { key: PartKey; icon: IconName; tone: string; name: Text; question: Text }[] = [
  { key: 'taxonomy', icon: 'layers', tone: '#5ee7ff', name: t('Taxonomy', 'التصنيف الهرمي'), question: t('What belongs under what?', 'ما الذي يندرج تحت ماذا؟') },
  { key: 'ontology', icon: 'grid', tone: '#a78bfa', name: t('Ontology', 'الأنطولوجيا'), question: t('What exists, and how is it related?', 'ما الموجود، وكيف يرتبط بغيره؟') },
  { key: 'diagram', icon: 'network', tone: '#f472b6', name: t('How an ontology looks', 'كيف تبدو الأنطولوجيا'), question: t('Boxes, labelled arrows and rules', 'مربعات وأسهم مسمّاة وقواعد') },
  { key: 'graph', icon: 'sparkles', tone: '#5ef2a0', name: t('Knowledge graph', 'الرسم البياني المعرفي'), question: t('How are the facts connected?', 'كيف ترتبط الحقائق؟') },
  { key: 'semantics', icon: 'bulb', tone: '#ffc46b', name: t('Semantics', 'الدلالة'), question: t('What does it mean?', 'ماذا يعني ذلك؟') },
  { key: 'together', icon: 'check', tone: '#93c5fd', name: t('Putting it together', 'الصورة الكاملة'), question: t('How do the four work together?', 'كيف تعمل الأربعة معًا؟') },
];

// ================================================================== trees

interface Node { key: string; name: Text; level?: Text; children?: Node[] }

const HERITAGE: Node = { key: 'heritage', name: t('Omani intangible heritage', 'التراث العُماني غير المادي'), children: [
  { key: 'oral', name: t('Oral traditions', 'التقاليد الشفهية'), children: [
    { key: 'proverbs', name: t('Proverbs', 'الأمثال الشعبية') }, { key: 'folktales', name: t('Folktales', 'الحكايات الشعبية') }] },
  { key: 'crafts', name: t('Traditional crafts', 'الحرف التقليدية'), children: [
    { key: 'weaving', name: t('Weaving', 'النسيج') }, { key: 'pottery', name: t('Pottery', 'الفخار') }] },
  { key: 'arts', name: t('Performing arts', 'فنون الأداء'), children: [
    { key: 'music', name: t('Traditional music', 'الموسيقى التقليدية') }, { key: 'dance', name: t('Traditional dance', 'الرقص التقليدي') }] },
] };

const DHOFAR: Node = { key: 'du', level: t('University', 'الجامعة'), name: t('Dhofar University', 'جامعة ظفار'), children: [
  { key: 'caas', level: t('College', 'الكلية'), name: t('College of Arts and Applied Sciences', 'كلية الآداب والعلوم التطبيقية'), children: [
    { key: 'cs-dept', level: t('Department', 'القسم'), name: t('Department of Computer Science', 'قسم علوم الحاسوب'), children: [
      { key: 'bsc', level: t('Degree program', 'البرنامج'), name: t('Bachelor of Science in Computer Science', 'بكالوريوس علوم الحاسوب'), children: [
        { key: 'comp111', level: t('Course', 'مقرر'), name: t('Programming Fundamentals (COMP 111)', 'أساسيات البرمجة (COMP 111)') },
        { key: 'comp151', level: t('Course', 'مقرر'), name: t('Discrete Structures (COMP 151)', 'التراكيب المتقطعة (COMP 151)') },
        { key: 'comp201', level: t('Course', 'مقرر'), name: t('Data Structures and Algorithms (COMP 201)', 'هياكل البيانات والخوارزميات (COMP 201)') },
      ] }] }] }] };

/** The keys from the root down to `key`, or [] if it is not in the tree. */
function pathTo(node: Node, key: string): string[] {
  if (node.key === key) return [key];
  for (const child of node.children ?? []) {
    const below = pathTo(child, key);
    if (below.length) return [node.key, ...below];
  }
  return [];
}
const keysUnder = (node: Node): string[] => [node.key, ...(node.children ?? []).flatMap(keysUnder)];
const find = (node: Node, key: string): Node | null => node.key === key ? node : (node.children ?? []).map(child => find(child, key)).find(Boolean) ?? null;

function Tree({ root, selected, onSelect, testId }: { root: Node; selected: string | null; onSelect: (key: string) => void; testId: string }) {
  const say = useTx();
  const path = selected ? pathTo(root, selected) : [];
  const inside = selected ? keysUnder(find(root, selected) ?? root) : [];
  const branch = (node: Node): ReactNode => <li key={node.key}>
    <button type="button" className={`kl-node${node === root ? ' root' : ''}${node.key === selected ? ' on' : path.includes(node.key) ? ' path' : inside.includes(node.key) ? ' inside' : ''}`}
      aria-pressed={node.key === selected} onClick={() => onSelect(node.key)} data-testid={`${testId}-${node.key}`}>
      {node.level && <small>{say(node.level)}</small>}{say(node.name)}
    </button>
    {node.children && <ul>{node.children.map(branch)}</ul>}
  </li>;
  return <ul className="kl-tree" data-testid={testId}>{branch(root)}</ul>;
}

// ================================================================== part 1 · taxonomy

const ARCHIVE: { key: string; icon: IconName; text: Text; tag: string }[] = [
  { key: 'a1', icon: 'mic', tag: 'proverbs', text: t('A proverb recorded in an interview with an elder', 'مثل مسجَّل في مقابلة مع أحد كبار السن') },
  { key: 'a2', icon: 'book', tag: 'proverbs', text: t('A page from a printed collection of proverbs', 'صفحة من مجموعة مطبوعة من الأمثال') },
  { key: 'a3', icon: 'mic', tag: 'folktales', text: t('A folktale told by a grandmother', 'حكاية شعبية ترويها جدّة') },
  { key: 'a4', icon: 'file', tag: 'folktales', text: t('The transcript of a folktale', 'تفريغ مكتوب لحكاية شعبية') },
  { key: 'a5', icon: 'play', tag: 'weaving', text: t('A video of a weaving demonstration', 'فيديو لعرض في النسيج') },
  { key: 'a6', icon: 'file', tag: 'pottery', text: t('Notes from a pottery workshop', 'ملاحظات من ورشة فخار') },
  { key: 'a7', icon: 'mic', tag: 'music', text: t('A recording of traditional music', 'تسجيل لموسيقى تقليدية') },
  { key: 'a8', icon: 'play', tag: 'dance', text: t('A video of a traditional dance performance', 'فيديو لأداء رقصة تقليدية') },
];

const COURSE_TREE: { key: string; name: Text; courses: { key: string; name: Text }[] }[] = [
  { key: 'programming', name: t('Programming Courses', 'مقررات البرمجة'), courses: [{ key: 'comp111', name: t('COMP 111 · Programming Fundamentals', 'COMP 111 · أساسيات البرمجة') }] },
  { key: 'mathematics', name: t('Mathematics Courses', 'مقررات الرياضيات'), courses: [{ key: 'comp151', name: t('COMP 151 · Discrete Structures', 'COMP 151 · التراكيب المتقطعة') }] },
  { key: 'dsa', name: t('Data Structures and Algorithms Courses', 'مقررات هياكل البيانات والخوارزميات'), courses: [{ key: 'comp201', name: t('COMP 201 · Data Structures and Algorithms', 'COMP 201 · هياكل البيانات والخوارزميات') }] },
];

function CourseTree() {
  const say = useTx();
  const [picked, setPicked] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const branches = COURSE_TREE.map(branch => branch.key === 'programming' && added
    ? { ...branch, courses: [...branch.courses, { key: 'new', name: t('A new programming course', 'مقرر برمجة جديد') }] } : branch);
  const owner = branches.find(branch => branch.courses.some(course => course.key === picked));
  const course = owner?.courses.find(item => item.key === picked);
  return <div className="kl-coursetree">
    <div className="kl-boxtree" data-testid="kl-course-tree">
      <span className={`kl-box top${owner ? ' path' : ''}`}>{say(t('Computer Science Courses', 'مقررات علوم الحاسوب'))}</span>
      <div className="kl-boxcols">
        {branches.map(branch => <div key={branch.key} className={`kl-boxcol${owner === branch ? ' path' : ''}`}>
          <span className={`kl-box mid${owner === branch ? ' path' : ''}`}>{say(branch.name)}</span>
          {branch.courses.map(item => <button key={item.key} type="button" className={`kl-box leaf${picked === item.key ? ' on' : ''}${item.key === 'new' ? ' new' : ''}`}
            aria-pressed={picked === item.key} onClick={() => setPicked(picked === item.key ? null : item.key)} data-testid={`kl-course-${item.key}`}>{say(item.name)}</button>)}
        </div>)}
      </div>
    </div>
    <div className="kl-trail" aria-live="polite" data-testid="kl-course-path">
      {owner && course
        ? <><Icon name="target" size={14}/><span>{say(t('To find it, follow: ', 'للوصول إليه اتبع: '))}<b>{say(t('Computer Science Courses', 'مقررات علوم الحاسوب'))}</b> → <b>{say(owner.name)}</b> → <b>{say(course.name)}</b></span></>
        : <><Icon name="help" size={14}/><span>{say(t('Click a course at the bottom to see the branches a student follows to reach it.', 'انقر مقررًا في الأسفل لترى الفروع التي يتبعها الطالب للوصول إليه.'))}</span></>}
    </div>
    <button type="button" className="button small" onClick={() => { setAdded(!added); setPicked(added ? null : 'new'); }} data-testid="kl-add-course">
      <Icon name={added ? 'minus' : 'plus'} size={13}/>{added ? say(t('Remove the new course', 'أزل المقرر الجديد')) : say(t('Add a new programming course', 'أضف مقرر برمجة جديدًا'))}</button>
  </div>;
}

function TaxonomyPart() {
  const say = useTx();
  const [heritage, setHeritage] = useState<string | null>('proverbs');
  const [dhofar, setDhofar] = useState<string | null>(null);
  const allowed = heritage ? keysUnder(find(HERITAGE, heritage) ?? HERITAGE) : keysUnder(HERITAGE);
  const shown = ARCHIVE.filter(item => allowed.includes(item.tag));
  const label = heritage ? pathTo(HERITAGE, heritage).slice(1).map(key => say(find(HERITAGE, key)!.name)).join(' → ') : say(HERITAGE.name);
  return <>
    <h3 className="kl-h3">{say(t('What is a taxonomy?', 'ما التصنيف الهرمي؟'))}</h3>
    <p className="kl-define">{say(t('A taxonomy is a system for organising information into groups and subgroups, so people can find it, add to it and manage it consistently.',
      'التصنيف الهرمي (Taxonomy) نظام لتنظيم المعلومات في فئات رئيسية وفئات فرعية، بحيث يسهل العثور على المعلومات الموجودة، وإضافة المعلومات الجديدة في المكان المناسب، وإدارة المحتوى بطريقة موحّدة.'))}</p>
    <p className="pc-lead">{say(t('A taxonomy groups information into categories and subcategories. We use it to find the right information faster and to describe it consistently. You do not have to build one for every AI project, but when a collection grows, it tells everyone where things belong.',
      'يجمع التصنيف الهرمي المعلومات في فئات وفئات فرعية. ونستخدمه لنصل إلى المعلومة الصحيحة أسرع ولنصفها بطريقة موحّدة. ولست مضطرًا إلى بناء تصنيف لكل مشروع ذكاء اصطناعي، لكن حين تكبر المجموعة يخبر الجميعَ أين يوضع كل شيء.'))}</p>
    <p className="kl-quote" data-testid="kl-short"><Icon name="bookmark" size={15}/><span><b>{say(t('In one sentence: ', 'بعبارة واحدة: '))}</b>{say(t('a taxonomy tells us where to put new information, and where to look for it later.', 'يساعدنا التصنيف الهرمي على معرفة أين نضع المعلومة الجديدة، وأين نبحث عنها لاحقًا.'))}</span></p>

    <h4 className="kl-h4">{say(t('Two examples: the Omani heritage archive and the Dhofar University guide', 'مثالان: أرشيف التراث العُماني ودليل جامعة ظفار'))}</h4>
    <div className="kl-two">
      <section className="kl-card">
        <h5>{say(t('A taxonomy for an Omani heritage AI assistant', 'تصنيف هرمي لمساعد ذكاء اصطناعي للتراث العُماني'))}</h5>
        <p>{say(t('In an Omani heritage archive, oral traditions can be a main category, with proverbs and folktales as subcategories beneath it. Click any category.',
          'في أرشيف التراث العُماني يمكن أن تكون التقاليد الشفهية فئة رئيسية، تندرج تحتها فئات فرعية مثل الأمثال الشعبية والحكايات الشعبية. انقر أي فئة.'))}</p>
        <Tree root={HERITAGE} selected={heritage} onSelect={key => setHeritage(heritage === key ? null : key)} testId="kl-heritage"/>
      </section>
      <section className="kl-card">
        <h5>{say(t('A taxonomy for the Dhofar University academic guide', 'تصنيف هرمي لدليل جامعة ظفار الأكاديمي'))}</h5>
        <p>{say(t('Suppose we design an academic guide that helps Dhofar University students find their degree programs and courses. We start with the university and move from the most general level to the most specific. The example follows the undergraduate catalogue for 2024–2025, College of Arts and Applied Sciences.',
          'لنفترض أننا نصمّم دليلًا أكاديميًا يساعد طلبة جامعة ظفار على الوصول إلى برامجهم ومقرراتهم. نبدأ بالجامعة وننتقل من العام إلى الخاص. والمثال مأخوذ من دليل المرحلة الجامعية الأولى للعام الأكاديمي 2024–2025، كلية الآداب والعلوم التطبيقية.'))}</p>
        <Tree root={DHOFAR} selected={dhofar} onSelect={key => setDhofar(dhofar === key ? null : key)} testId="kl-dhofar"/>
      </section>
    </div>

    <h4 className="kl-h4">{say(t('Tag a source, narrow the search', 'صنّف المصدر، وضيّق البحث'))}</h4>
    <p className="pc-lead">{say(t('When you add a recorded proverb to your RAG system, you can tag it as Oral traditions → Proverbs. Then, if a student asks for Omani proverbs, the system can use that tag to narrow its search to the relevant sources. Pick a category in the heritage tree above and watch the search space shrink.',
      'حين تضيف مثلًا مسجَّلًا إلى نظام RAG، يمكنك أن تصنّفه تحت التقاليد الشفهية ← الأمثال الشعبية. فإذا سأل طالب عن الأمثال العُمانية، استطاع النظام أن يستخدم هذا التصنيف ليحصر بحثه في المصادر ذات الصلة. اختر فئة في شجرة التراث أعلاه وراقب مساحة البحث تضيق.'))}</p>
    <div className="kl-archive" data-testid="kl-archive">
      <div className="kl-archive-head">
        <button type="button" className="button small" onClick={() => setHeritage('proverbs')} data-testid="kl-ask-proverbs"><Icon name="search" size={13}/>{say(t('A student asks: “Tell me some Omani proverbs”', 'يسأل طالب: «أخبرني ببعض الأمثال العُمانية»'))}</button>
        <span className="kl-count" data-testid="kl-archive-count">{say(t(`Searching ${shown.length} of ${ARCHIVE.length} sources`, `البحث في ${shown.length} من ${ARCHIVE.length} مصادر`))} · <b>{label}</b></span>
      </div>
      <ul>
        {ARCHIVE.map(item => <li key={item.key} className={allowed.includes(item.tag) ? 'in' : 'out'}>
          <Icon name={item.icon} size={14}/><span>{say(item.text)}</span><small>{say(find(HERITAGE, item.tag)!.name)}</small>
        </li>)}
      </ul>
    </div>

    <h4 className="kl-h4">{say(t('What a taxonomy looks like: a tree of categories', 'كيف يبدو التصنيف الهرمي: شجرة من الفئات'))}</h4>
    <p className="pc-lead">{say(t('Start with a broad category at the top, then follow its branches to more specific categories. Here is an example for the Dhofar University academic guide. The middle boxes are categories you could create for the guide; the bottom boxes are individual courses listed under those categories.',
      'ابدأ بفئة عامة في الأعلى، ثم اتبع فروعها إلى فئات أكثر تحديدًا. وهذا مثال لدليل جامعة ظفار الأكاديمي: المربعات الوسطى فئات يمكنك إنشاؤها للدليل، والمربعات السفلى مقررات بعينها مدرجة تحت تلك الفئات.'))}</p>
    <CourseTree/>
    <p className="pc-note"><Icon name="bulb" size={13}/>{say(t('Read each branch as “belongs under this category”. To find COMP 111, a student follows Computer Science Courses → Programming Courses → Programming Fundamentals. If you add a new programming course, the same tree shows where to put it.',
      'اقرأ كل فرع على أنه «يندرج تحت هذه الفئة». فللوصول إلى COMP 111 يتبع الطالب: مقررات علوم الحاسوب ← مقررات البرمجة ← أساسيات البرمجة. وإن أضفت مقرر برمجة جديدًا، أرتك الشجرة نفسها أين تضعه.'))}</p>
  </>;
}

// ================================================================== part 2 · ontology

const BLOCKS: { key: string; icon: IconName; concept: Text; example: Text }[] = [
  { key: 'group', icon: 'layers', concept: t('Group', 'المجموعة'), example: t('COMP 151 and COMP 201 both belong to the category Course.', 'ينتمي COMP 151 و COMP 201 كلاهما إلى الفئة «مقرر».') },
  { key: 'property', icon: 'file', concept: t('Property', 'الخاصية'), example: t('A course has a code, a title and a credit value.', 'للمقرر رمز وعنوان وعدد ساعات معتمدة.') },
  { key: 'relationship', icon: 'arrow', concept: t('Relationship', 'العلاقة'), example: t('COMP 201 requires COMP 151.', 'المقرر COMP 201 يتطلب COMP 151.') },
  { key: 'rule', icon: 'check', concept: t('Rule', 'القاعدة'), example: t('If a student passes COMP 151, they satisfy that prerequisite for COMP 201.', 'إذا اجتاز الطالب COMP 151 فقد استوفى هذا المتطلب السابق لـ COMP 201.') },
];

function OntologyPart() {
  const say = useTx();
  return <>
    <h3 className="kl-h3">{say(t('What is an ontology?', 'ما الأنطولوجيا؟'))}</h3>
    <p className="kl-define">{say(t('A taxonomy organises information into categories and subcategories, making it easier to find and classify. An ontology can include that hierarchy and also describe the entities involved, their attributes, and how they relate to one another. It can also define rules or constraints that a system uses to draw conclusions or check information.',
      'ينظّم التصنيف الهرمي المعلومات في فئات وفئات فرعية، فيسهل العثور عليها وتصنيفها. أما الأنطولوجيا (Ontology) فيمكن أن تتضمن تلك الهرمية، وتصف أيضًا الكيانات المعنية وخصائصها وكيف يرتبط بعضها ببعض. ويمكنها كذلك أن تحدّد قواعد أو قيودًا يستخدمها النظام لاستخلاص النتائج أو التحقق من المعلومات.'))}</p>

    <h4 className="kl-h4">{say(t('From taxonomy to ontology at Dhofar University', 'من التصنيف الهرمي إلى الأنطولوجيا في جامعة ظفار'))}</h4>
    <div className="kl-chain" data-testid="kl-chain">
      {[t('Dhofar University', 'جامعة ظفار'), t('College of Arts and Applied Sciences', 'كلية الآداب والعلوم التطبيقية'), t('Department of Computer Science', 'قسم علوم الحاسوب'),
        t('BSc in Computer Science', 'بكالوريوس علوم الحاسوب'), t('COMP 111 · COMP 151 · COMP 201', 'COMP 111 · COMP 151 · COMP 201')].map((step, i) =>
        <span key={i}>{i > 0 && <Icon name="arrow" size={14}/>}<b>{say(step)}</b></span>)}
    </div>
    <p className="kl-box-note">{say(t('In the Dhofar University example, the hierarchy helps a student find a course in the study plan. The ontology can specify that a course has a credit value (an attribute), that one course requires another (a relationship), and that passing the required course satisfies that prerequisite (a rule).',
      'في مثال جامعة ظفار تساعد الهرمية الطالب على إيجاد المقرر في الخطة الدراسية. أما الأنطولوجيا فيمكنها أن تحدّد أن للمقرر عددًا من الساعات المعتمدة (خاصية)، وأن مقررًا يتطلب مقررًا آخر (علاقة)، وأن اجتياز المقرر المطلوب يستوفي ذلك المتطلب السابق (قاعدة).'))}</p>
    <p className="kl-quote"><Icon name="target" size={15}/><span><b>{say(t('Put simply: ', 'ببساطة: '))}</b>{say(t('the taxonomy helps a student find the course. The ontology helps the system explain how that course fits into the student’s program and what the student needs in order to take it.',
      'التصنيف الهرمي يساعد الطالب على إيجاد المقرر، والأنطولوجيا تساعد النظام على شرح موقع المقرر في برنامج الطالب وما يحتاج إليه الطالب ليسجّل فيه.'))}</span></p>

    <h4 className="kl-h4">{say(t('A practical approach: start with a taxonomy, then build an ontology around it', 'طريقة عملية: ابدأ بتصنيف هرمي، ثم ابنِ حوله أنطولوجيا'))}</h4>
    <ol className="kl-steps" data-testid="kl-approach">
      <li><b>{say(t('Organise the information.', 'نظّم المعلومات.'))}</b> {say(t('Start with the hierarchy University → College → Department → Degree program → Courses. This helps students find where a course appears in the guide.',
        'ابدأ بالهرمية: الجامعة ← الكلية ← القسم ← البرنامج ← المقررات. فهذا يساعد الطلبة على معرفة موضع المقرر في الدليل.'))}</li>
      <li><b>{say(t('Describe what the connections mean.', 'صِف ما تعنيه الروابط.'))}</b> {say(t('A department offers a degree program. A student enrols in a program. COMP 201 requires COMP 151. The ontology can also describe attributes, such as a course’s credit hours, and rules, such as “passing COMP 151 satisfies that prerequisite for COMP 201”.',
        'القسم يقدّم برنامجًا دراسيًا، والطالب يسجّل في برنامج، و COMP 201 يتطلب COMP 151. ويمكن للأنطولوجيا أيضًا أن تصف خصائص مثل الساعات المعتمدة للمقرر، وقواعد مثل «اجتياز COMP 151 يستوفي ذلك المتطلب السابق لـ COMP 201».'))}</li>
    </ol>

    <h4 className="kl-h4">{say(t('The four building blocks of an ontology', 'اللبنات الأربع للأنطولوجيا'))}</h4>
    <div className="kl-blocks" role="table" aria-label={say(t('Concepts and examples', 'المفاهيم والأمثلة'))} data-testid="kl-blocks">
      <div className="row head" role="row"><span role="columnheader">{say(t('Concept', 'المفهوم'))}</span><span role="columnheader">{say(t('Example from the Dhofar University guide', 'مثال من دليل جامعة ظفار'))}</span></div>
      {BLOCKS.map(block => <div key={block.key} className="row" role="row" data-testid={`kl-block-${block.key}`}>
        <span role="rowheader"><Icon name={block.icon} size={14}/><b>{say(block.concept)}</b></span>
        <span role="cell">{say(block.example)}</span>
      </div>)}
    </div>
    <p className="kl-summary-line"><Icon name="bookmark" size={15}/><span>{say(t('A taxonomy tells us which group something belongs to. An ontology describes what properties it has, how it connects to other things, and what we can infer from those connections when rules are defined.',
      'التصنيف الهرمي يخبرنا إلى أي مجموعة ينتمي الشيء. والأنطولوجيا تصف خصائصه، وكيف يتصل بغيره، وما يمكن أن نستنتجه من تلك الروابط حين تُحدَّد القواعد.'))}</span></p>
  </>;
}

// ================================================================== part 3 · how an ontology looks

type Box = { id: string; x: number; y: number; w: number; label: Text; kind?: string };
type Arrow = { id: string; d: string; at: [number, number]; label: Text; sentence: Text; dashed?: boolean };

const SCHEMA_BOXES: Box[] = [
  { id: 'student', x: 280, y: 40, w: 120, label: t('Student', 'طالب') },
  { id: 'program', x: 110, y: 150, w: 160, label: t('Degree Program', 'برنامج دراسي') },
  { id: 'course', x: 280, y: 262, w: 110, label: t('Course', 'مقرر') },
];
const SCHEMA_ARROWS: Arrow[] = [
  { id: 'enrolls', d: 'M220 40 H110 V130', at: [160, 40], label: t('enrolls in', 'يسجّل في'), sentence: t('A student enrols in a degree program.', 'يسجّل الطالب في برنامج دراسي.') },
  { id: 'includes', d: 'M110 168 V262 H223', at: [110, 216], label: t('includes', 'يتضمن'), sentence: t('A degree program includes courses.', 'يتضمن البرنامج الدراسي مقررات.') },
  { id: 'passed', d: 'M280 58 V242', at: [280, 150], label: t('has passed', 'اجتاز'), sentence: t('A student can pass a course.', 'يمكن للطالب أن يجتاز مقررًا.') },
  { id: 'requires', d: 'M300 280 C300 318, 372 314, 366 276 C364 266, 352 262, 337 262', at: [338, 306], label: t('requires', 'يتطلب'), sentence: t('The loop on Course means that one course can require another course.', 'الحلقة على «مقرر» تعني أن مقررًا يمكن أن يتطلب مقررًا آخر.') },
];
const RECORD_BOXES: Box[] = [
  { id: 'maryam', x: 120, y: 36, w: 160, label: t('Student: Maryam', 'طالبة: مريم') },
  { id: 'cs', x: 120, y: 136, w: 210, label: t('Program: Computer Science', 'برنامج: علوم الحاسوب') },
  { id: 'c201', x: 120, y: 236, w: 160, label: t('Course: COMP 201', 'مقرر: COMP 201') },
  { id: 'c151', x: 120, y: 336, w: 160, label: t('Course: COMP 151', 'مقرر: COMP 151') },
];
const RECORD_ARROWS: Arrow[] = [
  { id: 'r-enrolled', d: 'M120 54 V118', at: [120, 86], label: t('is enrolled in', 'مسجّلة في'), sentence: t('Maryam is enrolled in the Computer Science program.', 'مريم مسجّلة في برنامج علوم الحاسوب.') },
  { id: 'r-includes', d: 'M120 154 V218', at: [120, 186], label: t('includes', 'يتضمن'), sentence: t('The program includes COMP 201.', 'البرنامج يتضمن COMP 201.') },
  { id: 'r-requires', d: 'M120 254 V318', at: [120, 286], label: t('requires', 'يتطلب'), sentence: t('COMP 201 requires COMP 151.', 'المقرر COMP 201 يتطلب COMP 151.') },
  { id: 'r-passed', d: 'M200 36 H390 V336 H200', at: [390, 186], label: t('has passed', 'اجتازت'), sentence: t('Maryam has passed COMP 151.', 'مريم اجتازت COMP 151.') },
];
const INFERRED: Arrow = { id: 'r-met', d: 'M200 46 H290 V236 H200', at: [290, 141], label: t('prerequisite met', 'المتطلب مستوفى'), sentence: t('Maryam has met the COMP 151 prerequisite for COMP 201.', 'مريم استوفت المتطلب السابق COMP 151 للمقرر COMP 201.'), dashed: true };

function Diagram({ boxes, arrows, width, height, focus, onFocus, lit, label, testId }: {
  boxes: Box[]; arrows: Arrow[]; width: number; height: number; focus: string | null; onFocus: (id: string | null) => void; lit?: string[]; label: string; testId: string;
}) {
  const say = useTx();
  return <svg className="kl-diagram" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} data-testid={testId}>
    <defs>
      <marker id={`${testId}-head`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" className="kl-head"/></marker>
      <marker id={`${testId}-head-on`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" className="kl-head on"/></marker>
    </defs>
    {arrows.map(arrow => {
      const on = focus === arrow.id || lit?.includes(arrow.id);
      const text = say(arrow.label);
      const w = text.length * 6.6 + 16;
      return <g key={arrow.id} className={`kl-arrow${on ? ' on' : ''}${focus && !on ? ' dim' : ''}${arrow.dashed ? ' dashed' : ''}`}
        onClick={() => onFocus(focus === arrow.id ? null : arrow.id)} data-testid={`${testId}-${arrow.id}`}>
        <path d={arrow.d} markerEnd={`url(#${testId}-head${on ? '-on' : ''})`}/>
        <rect x={arrow.at[0] - w / 2} y={arrow.at[1] - 10} width={w} height={20} rx={10}/>
        <text x={arrow.at[0]} y={arrow.at[1] + 4} textAnchor="middle">{text}</text>
      </g>;
    })}
    {boxes.map(box => <g key={box.id} className="kl-dbox" transform={`translate(${box.x} ${box.y})`}>
      <rect x={-box.w / 2} y={-18} width={box.w} height={36} rx={9}/>
      <text y={5} textAnchor="middle">{say(box.label)}</text>
    </g>)}
  </svg>;
}

function Sentences({ arrows, focus, onFocus, testId }: { arrows: Arrow[]; focus: string | null; onFocus: (id: string | null) => void; testId: string }) {
  const say = useTx();
  return <ul className="kl-sentences" data-testid={testId}>
    {arrows.map(arrow => <li key={arrow.id}><button type="button" className={focus === arrow.id ? 'on' : ''} aria-pressed={focus === arrow.id}
      onClick={() => onFocus(focus === arrow.id ? null : arrow.id)}><Icon name="arrow" size={13}/>{say(arrow.sentence)}</button></li>)}
  </ul>;
}

function DiagramPart() {
  const say = useTx();
  const [schemaFocus, setSchemaFocus] = useState<string | null>(null);
  const [recordFocus, setRecordFocus] = useState<string | null>(null);
  const [passed, setPassed] = useState(true);
  const [applied, setApplied] = useState(false);
  const arrows = [...RECORD_ARROWS.filter(arrow => passed || arrow.id !== 'r-passed'), ...(applied && passed ? [INFERRED] : [])];
  return <>
    <h3 className="kl-h3">{say(t('How does an ontology look?', 'كيف تبدو الأنطولوجيا؟'))}</h3>
    <p className="kl-define">{say(t('An ontology often looks like a map of boxes connected by labelled arrows. Each arrow tells you exactly what the connection means. For example, the arrow from a student to a degree program says “is enrolled in”, while the arrow between two courses says “requires”.',
      'كثيرًا ما تبدو الأنطولوجيا خريطة من المربعات تربطها أسهم مسمّاة، وكل سهم يخبرك بالضبط بما تعنيه العلاقة. فالسهم من الطالب إلى البرنامج الدراسي يقول «مسجّل في»، والسهم بين مقررين يقول «يتطلب».'))}</p>

    <div className="kl-two">
      <section className="kl-card">
        <h5>{say(t('The definitions: types and the arrows allowed between them', 'التعريفات: الأنواع والأسهم المسموح بها بينها'))}</h5>
        <Diagram boxes={SCHEMA_BOXES} arrows={SCHEMA_ARROWS} width={400} height={330} focus={schemaFocus} onFocus={setSchemaFocus}
          label={say(t('Ontology of Student, Degree Program and Course', 'أنطولوجيا الطالب والبرنامج الدراسي والمقرر'))} testId="kl-schema"/>
        <p className="kl-small">{say(t('Read each arrow as a sentence (click one):', 'اقرأ كل سهم جملةً (انقر أحدها):'))}</p>
        <Sentences arrows={SCHEMA_ARROWS} focus={schemaFocus} onFocus={setSchemaFocus} testId="kl-schema-sentences"/>
      </section>
      <section className="kl-card">
        <h5>{say(t('The definitions in use: example records', 'التعريفات قيد الاستخدام: سجلات مثال'))}</h5>
        <Diagram boxes={RECORD_BOXES} arrows={arrows} width={440} height={370} focus={recordFocus} onFocus={setRecordFocus}
          lit={applied ? ['r-requires', 'r-passed', 'r-met'] : undefined}
          label={say(t('Maryam, the Computer Science program, COMP 201 and COMP 151', 'مريم وبرنامج علوم الحاسوب و COMP 201 و COMP 151'))} testId="kl-records"/>
        <p className="kl-small">{say(t('Read each arrow as a sentence (click one):', 'اقرأ كل سهم جملةً (انقر أحدها):'))}</p>
        <Sentences arrows={arrows} focus={recordFocus} onFocus={setRecordFocus} testId="kl-record-sentences"/>
      </section>
    </div>
    <p className="pc-lead">{say(t('The ontology defines the vocabulary and its meaning. It defines types such as Student, Degree Program and Course. It can specify that a course has properties such as a course code and credit hours, and that “requires” connects one course to another. The second diagram shows those definitions used with example records like Maryam and COMP 201.',
      'تحدّد الأنطولوجيا المفردات ومعناها: فهي تعرّف أنواعًا مثل الطالب والبرنامج الدراسي والمقرر، ويمكنها أن تنصّ على أن للمقرر خصائص مثل رمز المقرر والساعات المعتمدة، وأن «يتطلب» تربط مقررًا بآخر. ويُظهر المخطط الثاني تلك التعريفات مستخدمةً مع سجلات مثال مثل مريم و COMP 201.'))}</p>

    <h4 className="kl-h4">{say(t('Add a rule, and the system can reach a conclusion', 'أضف قاعدة، فيصل النظام إلى نتيجة'))}</h4>
    <div className="kl-rule" data-testid="kl-rule">
      <p className="kl-rule-text"><Icon name="check" size={15}/><span><b>{say(t('Rule: ', 'القاعدة: '))}</b>{say(t('if a student has passed a course that another course requires, the student has satisfied that prerequisite.', 'إذا اجتاز الطالب مقررًا يتطلبه مقرر آخر، فقد استوفى الطالب ذلك المتطلب السابق.'))}</span></p>
      <div className="kl-rule-controls">
        <label className="kl-check"><input type="checkbox" checked={passed} onChange={event => { setPassed(event.target.checked); setRecordFocus(null); }} data-testid="kl-passed"/>
          {say(t('The archive records that Maryam has passed COMP 151', 'يسجّل الأرشيف أن مريم اجتازت COMP 151'))}</label>
        <button type="button" className={`button small${applied ? ' primary' : ''}`} aria-pressed={applied} onClick={() => setApplied(!applied)} data-testid="kl-apply">
          <Icon name={applied ? 'reset' : 'play'} size={13}/>{applied ? say(t('Clear the conclusion', 'امسح النتيجة')) : say(t('Apply the rule', 'طبّق القاعدة'))}</button>
      </div>
      {applied && <p className={`kl-conclusion${passed ? ' yes' : ' no'}`} data-testid="kl-conclusion" aria-live="polite">
        <Icon name={passed ? 'check' : 'close'} size={15}/>
        <span>{passed
          ? say(t('Conclusion: COMP 201 requires COMP 151, and Maryam has passed COMP 151, so Maryam has met that prerequisite for COMP 201. The system connected two facts to reach a third one that nobody typed in.',
            'النتيجة: COMP 201 يتطلب COMP 151، ومريم اجتازت COMP 151، إذن استوفت مريم ذلك المتطلب السابق لـ COMP 201. لقد ربط النظام حقيقتين ليصل إلى حقيقة ثالثة لم يكتبها أحد.'))
          : say(t('No conclusion: nothing says that Maryam has passed COMP 151, so the rule cannot fire. The system does not guess; it only concludes what the facts support.',
            'لا نتيجة: لا شيء يقول إن مريم اجتازت COMP 151، فلا يمكن تطبيق القاعدة. فالنظام لا يخمّن، بل يستنتج فقط ما تدعمه الحقائق.'))}</span>
      </p>}
    </div>

    <h4 className="kl-h4">{say(t('Spot the difference: a tree of categories or a map of connections', 'اكتشف الفرق: شجرة فئات أم خريطة روابط'))}</h4>
    <div className="kl-versus" data-testid="kl-versus">
      <div><h5><Icon name="layers" size={14}/>{say(t('Taxonomy', 'التصنيف الهرمي'))}</h5>
        <p>{say(t('A tree. You follow branches from broader groups down to narrower groups, and every branch means the same thing: “belongs under”.', 'شجرة: تتبع الفروع من المجموعات العامة نزولًا إلى المجموعات الأضيق، وكل فرع يعني الشيء نفسه: «يندرج تحت».'))}</p></div>
      <div><h5><Icon name="network" size={14}/>{say(t('Ontology', 'الأنطولوجيا'))}</h5>
        <p>{say(t('A map. You can follow several kinds of connections, and the label on each arrow tells you what it means: enrols in, includes, requires, has passed.', 'خريطة: يمكنك أن تتبع أنواعًا متعددة من الروابط، والتسمية على كل سهم تخبرك بمعناه: يسجّل في، ويتضمن، ويتطلب، واجتاز.'))}</p></div>
    </div>
    <p className="kl-summary-line green"><Icon name="bookmark" size={15}/><span>{say(t('A taxonomy organises information into categories and subcategories. An ontology defines how things are related and can include rules for drawing conclusions from those relationships.',
      'التصنيف الهرمي ينظّم المعلومات في فئات وفئات فرعية، والأنطولوجيا تحدّد كيف ترتبط الأشياء، ويمكن أن تتضمن قواعد لاستخلاص النتائج من تلك العلاقات.'))}</span></p>
  </>;
}

// ================================================================== parts 4 to 6

const DHOFAR_TRIPLES = ['(Maryam, is_enrolled_in, ComputerScience)', '(ComputerScience, includes, COMP201)', '(COMP201, requires, COMP151)', '(Maryam, has_passed, COMP151)'];

function GraphPart() {
  const say = useTx();
  return <>
    <h3 className="kl-h3">{say(t('What is a knowledge graph?', 'ما الرسم البياني المعرفي؟'))}</h3>
    <p className="kl-define">{say(t('A knowledge graph is a network-based representation of knowledge in which entities are connected by typed relationships. It answers: how are concepts connected in a machine-readable network?',
      'الرسم البياني المعرفي (Knowledge graph) تمثيل للمعرفة على هيئة شبكة، ترتبط فيها الكيانات بعلاقات ذات أنواع محدّدة. وهو يجيب عن السؤال: كيف ترتبط المفاهيم في شبكة يقرؤها الحاسوب؟'))}</p>
    <p className="pc-lead">{say(t('The ontology is the plan: the types and the arrows allowed between them. The knowledge graph is the data that follows the plan: real entities such as Maryam, COMP 151 or the Omani khanjar, and one arrow for every fact. Each fact is stored as a triple: subject, relation, object.',
      'الأنطولوجيا هي المخطط: الأنواع والأسهم المسموح بها بينها. والرسم البياني المعرفي هو البيانات التي تتبع المخطط: كيانات حقيقية مثل مريم و COMP 151 والخنجر العُماني، وسهم لكل حقيقة. وتُخزَّن كل حقيقة ثلاثيةً: فاعل، وعلاقة، ومفعول.'))}</p>
    <h4 className="kl-h4">{say(t('The Dhofar University facts as triples', 'حقائق جامعة ظفار في صورة ثلاثيات'))}</h4>
    <div className="kn-triples kl-dutriples">{DHOFAR_TRIPLES.map(triple => <code key={triple} dir="ltr" data-keep>{triple}</code>)}</div>
    <h4 className="kl-h4">{say(t('A heritage knowledge graph: ask it a question', 'رسم بياني معرفي للتراث: اطرح عليه سؤالًا'))}</h4>
    <div className="kn-panel" style={tone('#5ef2a0')}><GraphView/></div>
  </>;
}

function SemanticsPart() {
  const say = useTx();
  return <>
    <h3 className="kl-h3">{say(t('What is semantics?', 'ما الدلالة؟'))}</h3>
    <p className="kl-define">{say(t('Semantics is the meaning of concepts, terms and relationships. It answers: what does this information mean? Without it, two systems can use the same word for different things, or different words for the same thing.',
      'الدلالة (Semantics) هي معنى المفاهيم والمصطلحات والعلاقات، وهي تجيب عن السؤال: ماذا تعني هذه المعلومة؟ ومن دونها قد يستخدم نظامان الكلمة نفسها لأشياء مختلفة، أو كلمات مختلفة للشيء نفسه.'))}</p>
    <div className="kn-panel" style={tone('#ffc46b')}><SemanticsView/></div>
    <h4 className="kl-h4">{say(t('In the Dhofar University guide', 'في دليل جامعة ظفار'))}</h4>
    <div className="kn-sem">
      <div className="kn-sem-card">
        <h6>{say(t('One course, several names', 'مقرر واحد بأسماء عدة'))}</h6>
        <div className="kn-labels">{['COMP 201', 'Data Structures and Algorithms', 'هياكل البيانات والخوارزميات'].map(word => <span key={word} data-keep>{word}</span>)}</div>
        <p>{say(t('The code, the English title and the Arabic title must point to the same course, or a student searching in Arabic will miss it.', 'يجب أن يشير الرمز والعنوان الإنجليزي والعنوان العربي إلى المقرر نفسه، وإلا فات الطالبَ الذي يبحث بالعربية.'))}</p>
      </div>
      <div className="kn-sem-card">
        <h6>{say(t('What does “requires” mean?', 'ماذا تعني «يتطلب»؟'))}</h6>
        <code dir="ltr" data-keep className="kn-id">requires</code>
        <p>{say(t('Defined as “must be passed before a student can register”, not “is recommended before”. The rule about prerequisites only works because this meaning is fixed.', 'تُعرَّف بأنها «يجب اجتيازه قبل أن يسجّل الطالب»، لا «يُنصح به قبل». وقاعدة المتطلبات السابقة لا تعمل إلا لأن هذا المعنى ثابت.'))}</p>
      </div>
    </div>
  </>;
}

function TogetherPart() {
  const say = useTx();
  return <>
    <h3 className="kl-h3">{say(t('Putting it together', 'الصورة الكاملة'))}</h3>
    <p className="kl-define">{say(t('Taxonomy, ontology, knowledge graph and semantics are not competitors. Each adds one layer: structure, then meaning and rules, then connected facts, then shared understanding.',
      'التصنيف الهرمي والأنطولوجيا والرسم البياني المعرفي والدلالة ليست متنافسة، بل تضيف كلٌّ منها طبقة: البنية، ثم المعنى والقواعد، ثم الحقائق المترابطة، ثم الفهم المشترك.'))}</p>
    <KnowledgeOverview/>
  </>;
}

const PARTS: Record<PartKey, () => ReactNode> = {
  taxonomy: () => <TaxonomyPart/>, ontology: () => <OntologyPart/>, diagram: () => <DiagramPart/>,
  graph: () => <GraphPart/>, semantics: () => <SemanticsPart/>, together: () => <TogetherPart/>,
};
const STORE = 'neuron-lab-knowledge-part';

export function KnowledgeLab() {
  const say = useTx();
  const [active, setActive] = useState<PartKey>(() => {
    const saved = readStored(STORE);
    return KNOWLEDGE_PARTS.some(part => part.key === saved) ? saved as PartKey : 'taxonomy';
  });
  useEffect(() => { writeStored(STORE, active); }, [active]);
  const index = KNOWLEDGE_PARTS.findIndex(part => part.key === active);
  const part = KNOWLEDGE_PARTS[index];
  const go = (next: number) => {
    setActive(KNOWLEDGE_PARTS[next].key);
    document.querySelector('.kl-lab')?.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior });
  };
  return <div className="llm-lab kl-lab" data-testid="knowledge-lab">
    <header className="ft-lab-head kl-head">
      <div className="ft-lab-title">
        <div className="eyebrow">{say(t('Knowledge structures', 'هياكل المعرفة'))}</div>
        <h2>{say(t('Organise what we know: taxonomy, ontology, knowledge graph and semantics', 'نظّم ما نعرفه: التصنيف الهرمي والأنطولوجيا والرسم البياني المعرفي والدلالة'))}</h2>
        <p>{say(t('How information is classified, defined, connected and understood, by people and by AI systems. Vectors in RAG find text that sounds similar; these four structures say exactly what things are and how they relate. Six short parts, with examples from the Omani heritage archive and the Dhofar University academic guide.',
          'كيف تُصنَّف المعلومات وتُعرَّف وتُربط وتُفهم، عند الناس وعند أنظمة الذكاء الاصطناعي. فالمتجهات في RAG تجد النصوص المتقاربة في المعنى، أما هذه الهياكل الأربعة فتنصّ بدقة على ماهية الأشياء وكيف ترتبط. ستة أجزاء قصيرة، بأمثلة من أرشيف التراث العُماني ودليل جامعة ظفار الأكاديمي.'))}</p>
      </div>
    </header>

    <div className="kl-layout">
      <div className="kl-rail" role="tablist" aria-label={say(t('Parts of the lab', 'أجزاء المختبر'))} aria-orientation="vertical">
        {KNOWLEDGE_PARTS.map((item, i) => <button key={item.key} type="button" role="tab" aria-selected={active === item.key} style={tone(item.tone)}
          className={active === item.key ? 'on' : ''} onClick={() => setActive(item.key)} data-testid={`kl-part-${item.key}`}>
          <span className="num">{i + 1}</span><span className="txt"><strong>{say(item.name)}</strong><small>{say(item.question)}</small></span>
        </button>)}
      </div>
      <section className="kl-part" role="tabpanel" style={tone(part.tone)} data-testid="kl-panel" key={active}>
        <div className="kl-part-eyebrow"><Icon name={part.icon} size={14}/>{say(t(`Part ${index + 1} of ${KNOWLEDGE_PARTS.length}`, `الجزء ${index + 1} من ${KNOWLEDGE_PARTS.length}`))}</div>
        {PARTS[active]()}
        <footer className="kl-foot">
          {index > 0 ? <button type="button" className="button" onClick={() => go(index - 1)}><Icon name="previous" size={14}/>{say(KNOWLEDGE_PARTS[index - 1].name)}</button> : <span/>}
          {index < KNOWLEDGE_PARTS.length - 1 && <button type="button" className="button primary" onClick={() => go(index + 1)} data-testid="kl-next">{say(t('Next: ', 'التالي: '))}{say(KNOWLEDGE_PARTS[index + 1].name)}<Icon name="next" size={14}/></button>}
        </footer>
      </section>
    </div>
  </div>;
}
