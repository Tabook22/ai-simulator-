/**
 * Pieces of the Knowledge structures lab (KnowledgeLab.tsx): the four ideas compared, the khanjar
 * knowledge graph and the semantics cards. The khanjar facts come from the UNESCO record used in
 * the TurathAI case study.
 */
import { useState } from 'react';
import { Icon } from './ui';
import type { IconName } from './ui';
import { t, useTx } from './FineTuneScenes';
import type { Text } from './FineTuneScenes';
import './knowledge.css';

type Key = 'taxonomy' | 'ontology' | 'graph' | 'semantics';

export const KNOWLEDGE_CONCEPTS: { key: Key; icon: IconName; tone: string; name: Text; question: Text; definition: Text;
  focus: Text; strength: Text; limitation: Text; role: Text }[] = [
  { key: 'taxonomy', icon: 'layers', tone: '#5ee7ff',
    name: t('Taxonomy', 'التصنيف الهرمي (Taxonomy)'),
    question: t('What belongs under what?', 'ما الذي يندرج تحت ماذا؟'),
    definition: t('A hierarchical classification system that groups concepts into categories and subcategories.',
      'نظام تصنيف هرمي يجمع المفاهيم في فئات وفئات فرعية.'),
    focus: t('Classification and parent–child structure', 'التصنيف وبنية الأصل والفرع'),
    strength: t('Simple to organise and easy to navigate', 'تنظيم بسيط وتصفّح سهل'),
    limitation: t('Usually cannot express relationships beyond the hierarchy', 'لا يعبّر عادةً عن علاقات تتجاوز الهرمية'),
    role: t('provides the hierarchical structure', 'يوفّر البنية الهرمية') },
  { key: 'ontology', icon: 'grid', tone: '#a78bfa',
    name: t('Ontology', 'الأنطولوجيا (Ontology)'),
    question: t('What exists, how is it defined, and how is it related?', 'ما الموجود، وكيف يُعرَّف، وكيف يرتبط بغيره؟'),
    definition: t('A more detailed conceptual model that defines entities, their properties, and the relationships between them.',
      'نموذج مفاهيمي أكثر تفصيلًا يعرّف الكيانات وخصائصها والعلاقات بينها.'),
    focus: t('Meaning, rules and relationships', 'المعنى والقواعد والعلاقات'),
    strength: t('Far more expressive than a taxonomy', 'أغنى تعبيرًا بكثير من التصنيف الهرمي'),
    limitation: t('More complex to design and maintain', 'أصعب في التصميم والصيانة'),
    role: t('adds formal meaning and richer relationship modelling', 'يضيف معنى رسميًا ونمذجة أغنى للعلاقات') },
  { key: 'graph', icon: 'network', tone: '#5ef2a0',
    name: t('Knowledge graph', 'الرسم البياني المعرفي (Knowledge graph)'),
    question: t('How are concepts connected in a machine-readable network?', 'كيف ترتبط المفاهيم في شبكة يقرؤها الحاسوب؟'),
    definition: t('A network-based representation of knowledge in which entities are connected by typed relationships.',
      'تمثيل للمعرفة على هيئة شبكة، ترتبط فيها الكيانات بعلاقات ذات أنواع محدّدة.'),
    focus: t('Connected data and entity relationships', 'البيانات المترابطة وعلاقات الكيانات'),
    strength: t('Flexible, scalable, and useful for querying and inference', 'مرن وقابل للتوسع ومفيد للاستعلام والاستنتاج'),
    limitation: t('Only as useful as the schema, ontology or data behind it', 'فائدته بقدر جودة المخطط أو الأنطولوجيا أو البيانات التي يقوم عليها'),
    role: t('represents those concepts as linked entities and relations', 'يمثّل تلك المفاهيم كيانات وعلاقات مترابطة') },
  { key: 'semantics', icon: 'bulb', tone: '#ffc46b',
    name: t('Semantics', 'الدلالة (Semantics)'),
    question: t('What does this information mean?', 'ماذا تعني هذه المعلومة؟'),
    definition: t('The meaning of concepts, terms and relationships.', 'معنى المفاهيم والمصطلحات والعلاقات.'),
    focus: t('Interpretation and meaning', 'التفسير والمعنى'),
    strength: t('Consistent understanding across systems and contexts', 'فهم متّسق عبر الأنظمة والسياقات'),
    limitation: t('Meaning can vary unless it is clearly defined', 'قد يختلف المعنى ما لم يُعرَّف بوضوح'),
    role: t('gives the concepts and links their meaning, so they are interpreted correctly', 'يمنح المفاهيم والروابط معناها، فتُفسَّر تفسيرًا صحيحًا') },
];

/* ---------- Knowledge graph: facts as linked triples ---------- */

type Rel = 'made_of' | 'worn_at' | 'part_of' | 'documented_in';
const NODES: { id: string; label: Text; x: number; y: number; kind: string }[] = [
  { id: 'khanjar', label: t('Al-Khanjar', 'الخنجر'), x: 300, y: 150, kind: 'focus' },
  { id: 'silver', label: t('Silver', 'الفضة'), x: 92, y: 52, kind: 'material' },
  { id: 'leather', label: t('Leather', 'الجلد'), x: 70, y: 150, kind: 'material' },
  { id: 'wood', label: t('Wood', 'الخشب'), x: 92, y: 248, kind: 'material' },
  { id: 'weddings', label: t('Weddings', 'الأعراس'), x: 508, y: 52, kind: 'occasion' },
  { id: 'national', label: t('National events', 'المناسبات الوطنية'), x: 530, y: 150, kind: 'occasion' },
  { id: 'dress', label: t('Men’s traditional dress', 'الزي التقليدي للرجال'), x: 508, y: 248, kind: 'class' },
  { id: 'unesco', label: t('UNESCO record, 2022', 'سجل اليونسكو، 2022'), x: 300, y: 272, kind: 'source' },
];
export const TRIPLES: { s: string; p: Rel; o: string }[] = [
  { s: 'khanjar', p: 'made_of', o: 'silver' },
  { s: 'khanjar', p: 'made_of', o: 'leather' },
  { s: 'khanjar', p: 'made_of', o: 'wood' },
  { s: 'khanjar', p: 'worn_at', o: 'weddings' },
  { s: 'khanjar', p: 'worn_at', o: 'national' },
  { s: 'khanjar', p: 'part_of', o: 'dress' },
  { s: 'khanjar', p: 'documented_in', o: 'unesco' },
];
const QUERIES: { rel: Rel; text: Text }[] = [
  { rel: 'made_of', text: t('What is the khanjar made of?', 'ممّ يُصنع الخنجر؟') },
  { rel: 'worn_at', text: t('When is it worn?', 'متى يُلبس؟') },
  { rel: 'documented_in', text: t('Which source says so?', 'أي مصدر يقول ذلك؟') },
];

export function GraphView() {
  const say = useTx();
  const [rel, setRel] = useState<Rel | null>(null);
  const node = (id: string) => NODES.find(n => n.id === id)!;
  const hit = (triple: { p: Rel }) => rel === triple.p;
  return <div className="kn-view">
    <div className="kn-queries" role="group" aria-label={say(t('Ask the graph', 'اسأل الرسم البياني'))}>
      {QUERIES.map(query => <button key={query.rel} type="button" className={rel === query.rel ? 'on' : ''} aria-pressed={rel === query.rel}
        onClick={() => setRel(rel === query.rel ? null : query.rel)} data-testid={`kn-query-${query.rel}`}>
        <Icon name="search" size={13}/>{say(query.text)}</button>)}
    </div>
    <svg className="kn-graph" viewBox="0 0 600 310" role="img" data-testid="kn-graph"
      aria-label={say(t('A knowledge graph centred on Al-Khanjar', 'رسم بياني معرفي مركزه الخنجر'))}>
      {TRIPLES.map(triple => {
        const a = node(triple.s), b = node(triple.o);
        return <g key={triple.o} className={`kn-edge${hit(triple) ? ' on' : ''}${rel && !hit(triple) ? ' dim' : ''}`}>
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}/>
          <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 5} textAnchor="middle" direction="ltr">{triple.p}</text>
        </g>;
      })}
      {NODES.map(n => {
        const lit = rel ? n.id === 'khanjar' || TRIPLES.some(tr => tr.o === n.id && tr.p === rel) : true;
        const label = say(n.label);
        const width = Math.max(78, label.length * 7.4 + 22);
        return <g key={n.id} className={`kn-gnode ${n.kind}${lit ? '' : ' dim'}`} transform={`translate(${n.x} ${n.y})`}>
          <rect x={-width / 2} y={-15} width={width} height={30} rx={15}/>
          <text y={5} textAnchor="middle">{label}</text>
        </g>;
      })}
    </svg>
    <div className="kn-hub" aria-hidden="true">
      <span className="kn-hub-centre">{say(node('khanjar').label)}</span>
      {(['made_of', 'worn_at', 'part_of', 'documented_in'] as Rel[]).map(r => <div key={r} className={`kn-hub-row${rel === r ? ' on' : ''}${rel && rel !== r ? ' dim' : ''}`}>
        <code dir="ltr" data-keep>{r} →</code>
        <span>{TRIPLES.filter(tr => tr.p === r).map(tr => <em key={tr.o} className={node(tr.o).kind}>{say(node(tr.o).label)}</em>)}</span>
      </div>)}
    </div>
    <div className="kn-triples" data-testid="kn-triples">
      {TRIPLES.map(triple => <code key={triple.o} dir="ltr" data-keep className={`${hit(triple) ? 'on' : ''}${rel && !hit(triple) ? ' dim' : ''}`}>
        ({triple.s}, <b>{triple.p}</b>, {triple.o})</code>)}
    </div>
    <p className="kn-caption">{say(t('Each fact is a triple: subject, relation, object. Because the links are typed, a question becomes a walk along one kind of link, and every answer can point back to its source. These facts come from the UNESCO record on Al-Khanjar.',
      'كل معلومة ثلاثية: فاعل، وعلاقة، ومفعول. ولأن الروابط ذات أنواع محدّدة، يصبح السؤال سيرًا على نوع واحد من الروابط، ويمكن لكل إجابة أن تشير إلى مصدرها. وهذه المعلومات مأخوذة من سجل اليونسكو عن الخنجر.'))}</p>
  </div>;
}

/* ---------- Semantics: words, concepts and meaning ---------- */

export function SemanticsView() {
  const say = useTx();
  return <div className="kn-view">
    <div className="kn-sem" data-testid="kn-semantics">
      <div className="kn-sem-card">
        <h6>{say(t('Many words, one meaning', 'كلمات كثيرة، ومعنى واحد'))}</h6>
        <div className="kn-labels">{['الخنجر', 'Al-Khanjar', 'khanjar', 'Omani dagger'].map(word => <span key={word} data-keep>{word}</span>)}</div>
        <Icon name="down" size={16}/>
        <code dir="ltr" data-keep className="kn-id">heritage:Khanjar</code>
        <p>{say(t('Four labels point to one concept ID, so a search for any of them finds the same element and its facts.', 'أربع تسميات تشير إلى معرّف مفهوم واحد، فالبحث بأي منها يجد العنصر نفسه ومعلوماته.'))}</p>
      </div>
      <div className="kn-sem-card">
        <h6>{say(t('One word, two meanings', 'كلمة واحدة، ومعنيان'))}</h6>
        <div className="kn-split">
          <span><b data-keep>silver</b><small>{say(t('a material: the khanjar is made of it', 'مادة: يُصنع منها الخنجر'))}</small><code dir="ltr" data-keep>material:Silver</code></span>
          <span><b data-keep>silver</b><small>{say(t('a colour: a grey, shiny shade', 'لون: درجة رمادية لامعة'))}</small><code dir="ltr" data-keep>colour:Silver</code></span>
        </div>
        <p>{say(t('Without a definition, “made of silver” and “silver-coloured” look the same to a computer. A clear concept ID removes the doubt.', 'دون تعريف، تبدو عبارتا «مصنوع من الفضة» و«بلون فضي» متشابهتين للحاسوب. ومعرّف المفهوم الواضح يزيل الشك.'))}</p>
      </div>
      <div className="kn-sem-card">
        <h6>{say(t('Links have meaning too', 'للروابط معنى أيضًا'))}</h6>
        <code dir="ltr" data-keep className="kn-id">worn_at</code>
        <p>{say(t('Defined as “an occasion at which the object is customarily worn”. It does not mean where it was made or sold. Defining the link keeps every system that reads it in agreement.', 'تُعرَّف بأنها «مناسبة يُلبس فيها الشيء عادةً»، ولا تعني مكان صنعه أو بيعه. وتعريف الرابط يُبقي كل نظام يقرؤه على الفهم نفسه.'))}</p>
      </div>
    </div>
  </div>;
}

/** The four ideas side by side: the comparison, how they build on each other, where they are used, and the summary. */
export function KnowledgeOverview() {
  const say = useTx();
  return <div className="kn" data-testid="knowledge-overview">
    <h5 className="pc-h5">{say(t('At a glance: focus, strength and limitation', 'لمحة سريعة: التركيز ونقطة القوة والقيد'))}</h5>
    <div className="kn-table" role="table" aria-label={say(t('The four ideas compared', 'مقارنة الأفكار الأربع'))}>
      <div className="row head" role="row">
        <span role="columnheader">{say(t('Idea', 'الفكرة'))}</span><span role="columnheader">{say(t('Focus', 'التركيز'))}</span>
        <span role="columnheader">{say(t('Main strength', 'نقطة القوة'))}</span><span role="columnheader">{say(t('Main limitation', 'القيد الرئيسي'))}</span>
      </div>
      {KNOWLEDGE_CONCEPTS.map(c => <div key={c.key} role="row" className="row" style={{ ['--tone' as string]: c.tone }} data-testid={`kn-row-${c.key}`}>
        <span role="rowheader"><b>{say(c.name)}</b></span>
        <span role="cell"><small>{say(t('Focus', 'التركيز'))}</small>{say(c.focus)}</span>
        <span role="cell"><small>{say(t('Strength', 'القوة'))}</small>{say(c.strength)}</span>
        <span role="cell"><small>{say(t('Limitation', 'القيد'))}</small>{say(c.limitation)}</span>
      </div>)}
    </div>

    <h5 className="pc-h5">{say(t('How they relate: from classification to meaning', 'كيف ترتبط: من التصنيف إلى المعنى'))}</h5>
    <ol className="kn-ladder" data-testid="kn-ladder">
      {KNOWLEDGE_CONCEPTS.map(c => <li key={c.key} style={{ ['--tone' as string]: c.tone }}>
        <Icon name={c.icon} size={15}/><span><b>{say(c.name)}</b> {say(c.role)}.</span>
      </li>)}
    </ol>
    <p className="pc-note"><Icon name="bulb" size={13}/>{say(t('The key difference in one line each: taxonomy is about classification, ontology about defining concepts and their relations, a knowledge graph about representing and connecting knowledge, and semantics about meaning and interpretation.',
      'الفرق الأساسي في سطر لكل منها: التصنيف الهرمي يتعلق بالتصنيف، والأنطولوجيا بتعريف المفاهيم وعلاقاتها، والرسم البياني المعرفي بتمثيل المعرفة وربطها، والدلالة بالمعنى والتفسير.'))}</p>

    <div className="kn-uses">
      <div>
        <h6><Icon name="search" size={14}/>{say(t('In AI and RAG', 'في الذكاء الاصطناعي و RAG'))}</h6>
        <p>{say(t('The region, dialect and source-type labels on a TurathAI record are a small taxonomy, and they power the filters in the vector database. A knowledge graph can sit beside the vectors: vector search finds passages that sound relevant, and the graph answers exact relationship questions and links each fact to its source. Combining the two is often called GraphRAG.',
          'تسميات المنطقة واللهجة ونوع المصدر في سجل تراث AI هي تصنيف هرمي صغير، وهي التي تشغّل عوامل التصفية في قاعدة بيانات المتجهات. ويمكن أن يقف رسم بياني معرفي بجانب المتجهات: فالبحث بالمتجهات يجد المقاطع التي تبدو ذات صلة، والرسم البياني يجيب عن أسئلة العلاقات الدقيقة ويربط كل معلومة بمصدرها. ويُسمّى الجمع بينهما غالبًا GraphRAG.'))}</p>
      </div>
      <div>
        <h6><Icon name="chip" size={14}/>{say(t('In neuroscience', 'في علم الأعصاب'))}</h6>
        <p>{say(t('Brain atlases arrange regions in a hierarchy, a taxonomy of the brain. Neuroscience ontologies define cell types, their properties and how they connect, so that labs can share data. And semantic memory, our store of facts and the meanings of concepts, is often described as a network of linked concepts, much like a knowledge graph.',
          'ترتّب أطالس الدماغ مناطقه في هرمية، أي تصنيف هرمي للدماغ. وتعرّف أنطولوجيات علم الأعصاب أنواع الخلايا وخصائصها وكيف تتصل، كي تتبادل المختبرات البيانات. والذاكرة الدلالية، وهي مخزوننا من الحقائق ومعاني المفاهيم، توصف غالبًا بأنها شبكة من المفاهيم المترابطة، تشبه كثيرًا الرسم البياني المعرفي.'))}</p>
      </div>
    </div>

    <div className="kn-summary" data-testid="kn-summary">
      <Icon name="bookmark" size={16}/>
      <p><b>{say(t('Summary. ', 'الخلاصة. '))}</b>{say(t('Taxonomy organises concepts, ontology defines their meaning and relationships, a knowledge graph connects them into a usable structure, and semantics ensures the system understands what the concepts and links mean. Together they move from simple classification to rich, machine-readable knowledge.',
        'التصنيف الهرمي ينظّم المفاهيم، والأنطولوجيا تعرّف معناها وعلاقاتها، والرسم البياني المعرفي يربطها في بنية قابلة للاستخدام، والدلالة تضمن أن يفهم النظام ما تعنيه المفاهيم والروابط. ومعًا تنتقل من التصنيف البسيط إلى معرفة غنية يقرؤها الحاسوب.'))}</p>
    </div>
  </div>;
}
