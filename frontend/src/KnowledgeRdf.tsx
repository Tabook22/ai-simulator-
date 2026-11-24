/**
 * Knowledge structures lab, part "RDF triples": how RDF writes information as small
 * subject–predicate–object statements, why those statements connect into a knowledge graph, where
 * the ontology fits, and what a reasoning engine adds. The narrator and the folktale are an
 * illustrative example; Mirbat lies in Dhofar, Oman.
 */
import { useState } from 'react';
import { Icon } from './ui';
import type { IconName } from './ui';
import { t, useTx } from './FineTuneScenes';
import type { Text } from './FineTuneScenes';
import { useI18n } from './i18n';
import './knowledge-rdf.css';

// ------------------------------------------------------------------ the example

type Frag = [string, string?];
const PARAGRAPH: Record<'en' | 'ar', Frag[]> = {
  en: [['Ahmed', 'ahmed'], [', a '], ['78-year-old', 'age'], [' '], ['narrator', 'narrator'], [', '], ['narrated', 'narrated'], [' '], ['a version', 'version'],
    [' of a traditional folktale called '], ['The Wise Fisherman', 'title'], ['. The story was '], ['recorded in', 'recorded'], [' '], ['Mirbat', 'mirbat'],
    [', which is '], ['located in', 'located'], [' '], ['Dhofar', 'dhofar'], [', '], ['Oman', 'oman'], ['.']],
  ar: [['روى', 'narrated'], [' '], ['أحمد', 'ahmed'], ['، وهو '], ['راوٍ', 'narrator'], [' '], ['يبلغ من العمر 78 عامًا', 'age'], ['، '], ['نسخةً', 'version'],
    [' من حكاية شعبية تقليدية بعنوان '], ['«الصياد الحكيم»', 'title'], ['. وقد '], ['سُجّلت', 'recorded'], [' الحكاية '], ['في مرباط', 'mirbat'], ['، '],
    ['الواقعة في', 'located'], [' '], ['ظفار', 'dhofar'], ['، '], ['عُمان', 'oman'], ['.']],
};

type NodeId = 'ahmed' | 'narrator' | 'age78' | 'v001' | 'fisherman' | 'mirbat' | 'dhofar' | 'oman';
const NODES: Record<NodeId, { label: Text; x: number; y: number; kind: string }> = {
  narrator: { label: t('Narrator', 'راوٍ'), x: 100, y: 50, kind: 'class' },
  ahmed: { label: t('Ahmed', 'أحمد'), x: 100, y: 165, kind: 'person' },
  age78: { label: t('78', '78'), x: 100, y: 280, kind: 'value' },
  fisherman: { label: t('The Wise Fisherman', 'الصياد الحكيم'), x: 310, y: 50, kind: 'story' },
  v001: { label: t('Version 001', 'النسخة 001'), x: 310, y: 165, kind: 'story' },
  mirbat: { label: t('Mirbat', 'مرباط'), x: 310, y: 280, kind: 'place' },
  oman: { label: t('Oman', 'عُمان'), x: 520, y: 165, kind: 'place' },
  dhofar: { label: t('Dhofar', 'ظفار'), x: 520, y: 280, kind: 'place' },
};

interface Triple { id: string; s: NodeId; p: Text; o: NodeId; frags: string[]; inferred?: boolean }
export const RDF_TRIPLES: Triple[] = [
  { id: 't1', s: 'ahmed', p: t('is a', 'هو'), o: 'narrator', frags: ['ahmed', 'narrator'] },
  { id: 't2', s: 'ahmed', p: t('has age', 'عمره'), o: 'age78', frags: ['ahmed', 'age'] },
  { id: 't3', s: 'v001', p: t('narrated by', 'رواها'), o: 'ahmed', frags: ['version', 'narrated', 'ahmed'] },
  { id: 't4', s: 'v001', p: t('is version of', 'نسخة من'), o: 'fisherman', frags: ['version', 'title'] },
  { id: 't5', s: 'v001', p: t('recorded in', 'سُجّلت في'), o: 'mirbat', frags: ['version', 'recorded', 'mirbat'] },
  { id: 't6', s: 'mirbat', p: t('located within', 'تقع ضمن'), o: 'dhofar', frags: ['mirbat', 'located', 'dhofar'] },
  { id: 't7', s: 'dhofar', p: t('located within', 'تقع ضمن'), o: 'oman', frags: ['dhofar', 'oman'] },
];
const INFERRED: Triple = { id: 't8', s: 'mirbat', p: t('located within', 'تقع ضمن'), o: 'oman', frags: [], inferred: true };

const COMPARE: { text: Text; rdf: Text }[] = [
  { text: t('Information is written in paragraphs.', 'تُكتب المعلومات في فقرات.'), rdf: t('Information is represented as individual statements.', 'تُمثَّل المعلومات عبارات مستقلة.') },
  { text: t('Relationships may be implicit.', 'قد تكون العلاقات ضمنية.'), rdf: t('Relationships are explicit.', 'العلاقات صريحة.') },
  { text: t('Entities may be ambiguous.', 'قد تكون الكيانات غامضة.'), rdf: t('Entities can have unique identifiers.', 'يمكن أن يكون لكل كيان معرّف فريد.') },
  { text: t('Connections must be extracted.', 'يجب استخراج الروابط.'), rdf: t('Connections are directly represented.', 'الروابط ممثَّلة مباشرة.') },
  { text: t('Reasoning requires interpretation.', 'الاستدلال يحتاج إلى تفسير.'), rdf: t('Formal reasoning is possible with appropriate ontology rules.', 'الاستدلال الصوري ممكن بقواعد أنطولوجيا مناسبة.') },
  { text: t('Primarily designed for human reading.', 'مصمَّم أساسًا ليقرأه الإنسان.'), rdf: t('Designed for machine-readable knowledge representation.', 'مصمَّم لتمثيل المعرفة بصيغة يقرؤها الحاسوب.') },
];

const PIPELINE: { icon: IconName; name: Text; text: Text }[] = [
  { icon: 'file', name: t('Raw data', 'البيانات الخام'), text: t('The original information we collected.', 'المعلومات الأصلية التي جمعناها.') },
  { icon: 'layers', name: t('Taxonomy', 'التصنيف الهرمي'), text: t('Classifies information into categories.', 'يصنّف المعلومات في فئات.') },
  { icon: 'grid', name: t('Ontology', 'الأنطولوجيا'), text: t('Defines concepts, meanings, relationships and logic.', 'تعرّف المفاهيم والمعاني والعلاقات والمنطق.') },
  { icon: 'code', name: t('RDF', 'RDF'), text: t('Represents definitions and facts as connected triples.', 'يمثّل التعريفات والحقائق ثلاثياتٍ مترابطة.') },
  { icon: 'network', name: t('Knowledge graph', 'الرسم البياني المعرفي'), text: t('The resulting network of connected knowledge.', 'الشبكة الناتجة من المعرفة المترابطة.') },
  { icon: 'bolt', name: t('Reasoning engine', 'محرّك الاستدلال'), text: t('Derives additional facts using the available knowledge and logical rules.', 'يستخلص حقائق إضافية من المعرفة المتاحة والقواعد المنطقية.') },
];

const TURTLE = `@prefix :    <http://example.org/heritage#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .

# Ontology: the meaning and logic of a relationship
:locatedWithin a owl:TransitiveProperty .

# Facts from the interview (one triple per statement)
:Ahmed      a :Narrator ;
            :hasAge 78 .
:Version001 :narratedBy  :Ahmed ;
            :isVersionOf :TheWiseFisherman ;
            :recordedIn  :Mirbat .
:Mirbat     :locatedWithin :Dhofar .
:Dhofar     :locatedWithin :Oman .`;

// ------------------------------------------------------------------ pieces

function NodeChip({ id, role }: { id: NodeId; role?: 'subject' | 'object' }) {
  const say = useTx();
  return <span className={`kr-chip ${NODES[id].kind}${role ? ` ${role}` : ''}`}>{say(NODES[id].label)}</span>;
}

/** Shorten a line so it stops at the edge of the target box. */
function trim(from: { x: number; y: number }, to: { x: number; y: number }, halfW: number, halfH: number) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const scale = Math.min(dx ? halfW / Math.abs(dx) : Infinity, dy ? halfH / Math.abs(dy) : Infinity);
  return { x: to.x - dx * scale - Math.sign(dx) * 3, y: to.y - dy * scale - Math.sign(dy) * 3 };
}

function TripleGraph({ triples, focus, onFocus }: { triples: Triple[]; focus: NodeId | null; onFocus: (id: NodeId | null) => void }) {
  const say = useTx();
  const width = (id: NodeId) => Math.max(64, say(NODES[id].label).length * 7.6 + 26);
  return <svg className="kr-graph" viewBox="0 0 620 330" role="img" data-testid="kr-graph"
    aria-label={say(t('The seven triples drawn as a knowledge graph', 'الثلاثيات السبع مرسومةً رسمًا بيانيًا معرفيًا'))}>
    <defs>
      <marker id="kr-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" className="kr-head"/></marker>
      <marker id="kr-head-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" className="kr-head on"/></marker>
      <marker id="kr-head-new" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" className="kr-head new"/></marker>
    </defs>
    {triples.map(triple => {
      const a = NODES[triple.s], b = NODES[triple.o];
      const end = trim(a, b, width(triple.o) / 2, 15);
      const on = focus !== null && (triple.s === focus || triple.o === focus);
      const label = say(triple.p);
      const mx = (a.x + end.x) / 2, my = (a.y + end.y) / 2;
      const w = label.length * 6.4 + 14;
      return <g key={triple.id} className={`kr-edge${on ? ' on' : ''}${focus && !on ? ' dim' : ''}${triple.inferred ? ' inferred' : ''}`} data-testid={`kr-edge-${triple.id}`}>
        <line x1={a.x} y1={a.y} x2={end.x} y2={end.y} markerEnd={`url(#kr-head${triple.inferred ? '-new' : on ? '-on' : ''})`}/>
        <rect x={mx - w / 2} y={my - 9} width={w} height={18} rx={9}/>
        <text x={mx} y={my + 4} textAnchor="middle">{label}</text>
      </g>;
    })}
    {(Object.keys(NODES) as NodeId[]).map(id => {
      const node = NODES[id];
      const w = width(id);
      const lit = !focus || id === focus || triples.some(triple => (triple.s === focus && triple.o === id) || (triple.o === focus && triple.s === id));
      return <g key={id} className={`kr-node ${node.kind}${id === focus ? ' on' : ''}${lit ? '' : ' dim'}`} transform={`translate(${node.x} ${node.y})`}
        onClick={() => onFocus(focus === id ? null : id)} data-testid={`kr-node-${id}`} role="button" aria-pressed={focus === id}>
        <rect x={-w / 2} y={-16} width={w} height={32} rx={16}/>
        <text y={5} textAnchor="middle">{say(node.label)}</text>
      </g>;
    })}
  </svg>;
}

// ------------------------------------------------------------------ the part

export function RdfPart() {
  const say = useTx();
  const { isArabic } = useI18n();
  const [shown, setShown] = useState(RDF_TRIPLES.length);
  const [picked, setPicked] = useState<string | null>(null);
  const [focus, setFocus] = useState<NodeId | null>(null);
  const [reasoned, setReasoned] = useState(false);
  const lit = RDF_TRIPLES.find(triple => triple.id === picked)?.frags ?? (shown < RDF_TRIPLES.length && shown > 0 ? RDF_TRIPLES[shown - 1].frags : []);
  const graphTriples = reasoned ? [...RDF_TRIPLES, INFERRED] : RDF_TRIPLES;
  const node = (id: NodeId) => say(NODES[id].label);

  return <>
    <h3 className="kl-h3">{say(t('What is RDF?', 'ما RDF؟'))}</h3>
    <p className="kl-define">{say(t('RDF (Resource Description Framework) is a standard for describing information in a structured, connected and machine-readable way. Instead of ordinary paragraphs, RDF breaks information into small statements, each made of three parts. These statements are called RDF triples.',
      'RDF (إطار وصف الموارد) معيار لوصف المعلومات بطريقة منظَّمة ومترابطة يقرؤها الحاسوب. فبدل الفقرات العادية، يقسّم RDF المعلومات إلى عبارات صغيرة، تتكوّن كلٌّ منها من ثلاثة أجزاء، وتُسمّى هذه العبارات ثلاثيات RDF (الثلاثيات).'))}</p>

    <h4 className="kl-h4">{say(t('1 · Why three parts?', '1 · لماذا ثلاثة أجزاء؟'))}</h4>
    <div className="kr-spo" data-testid="kr-spo">
      <div className="s"><b>{say(t('Subject', 'الفاعل (Subject)'))}</b><span>{say(t('What are we describing?', 'ما الذي نصفه؟'))}</span></div>
      <div className="p"><b>{say(t('Predicate', 'المسند (Predicate)'))}</b><span>{say(t('What are we saying about it?', 'ماذا نقول عنه؟'))}</span></div>
      <div className="o"><b>{say(t('Object', 'المفعول (Object)'))}</b><span>{say(t('What entity or value is associated with it?', 'ما الكيان أو القيمة المرتبطة به؟'))}</span></div>
    </div>
    <div className="kr-one">
      <NodeChip id="mirbat" role="subject"/><span className="kr-pred">{say(t('located within', 'تقع ضمن'))}</span><NodeChip id="dhofar" role="object"/>
    </div>
    <p className="pc-lead">{say(t('One triple is one complete statement: Mirbat is located within Dhofar. These three components are enough to describe a very large variety of information.',
      'الثلاثية الواحدة عبارة كاملة: مرباط تقع ضمن ظفار. وهذه المكوّنات الثلاثة كافية لوصف تنوّع كبير جدًا من المعلومات.'))}</p>

    <h4 className="kl-h4">{say(t('2 · Converting ordinary information into RDF', '2 · تحويل المعلومات العادية إلى RDF'))}</h4>
    <p className="pc-lead">{say(t('Imagine we collected this paragraph during Omani intangible heritage research (an illustrative example). A person understands it at once; RDF makes each fact and relationship explicit for a computer. Click a triple to see which words it comes from.',
      'تخيّل أننا جمعنا هذه الفقرة أثناء بحث في التراث العُماني غير المادي (مثال توضيحي). يفهمها الإنسان فورًا، أما RDF فيجعل كل حقيقة وعلاقة صريحة للحاسوب. انقر ثلاثية لترى الكلمات التي جاءت منها.'))}</p>
    <blockquote className="kr-para" data-testid="kr-paragraph">
      {PARAGRAPH[isArabic ? 'ar' : 'en'].map(([text, key], i) => key
        ? <mark key={i} data-keep className={lit.includes(key) ? 'on' : ''}>{text}</mark>
        : <span key={i} data-keep>{text}</span>)}
    </blockquote>
    <div className="kr-triples" role="table" aria-label={say(t('The paragraph as triples', 'الفقرة في صورة ثلاثيات'))} data-testid="kr-triples">
      <div className="row head" role="row"><span role="columnheader">{say(t('Subject', 'الفاعل'))}</span><span role="columnheader">{say(t('Predicate', 'المسند'))}</span><span role="columnheader">{say(t('Object', 'المفعول'))}</span></div>
      {RDF_TRIPLES.slice(0, shown).map(triple => <button key={triple.id} type="button" role="row" className={`row${picked === triple.id ? ' on' : ''}`} aria-pressed={picked === triple.id}
        onClick={() => setPicked(picked === triple.id ? null : triple.id)} data-testid={`kr-triple-${triple.id}`}>
        <span role="cell"><NodeChip id={triple.s}/></span><span role="cell" className="kr-pred">{say(triple.p)}</span><span role="cell"><NodeChip id={triple.o}/></span>
      </button>)}
    </div>
    <div className="kr-controls">
      {shown < RDF_TRIPLES.length
        ? <button type="button" className="button small primary" onClick={() => { setShown(shown + 1); setPicked(null); }} data-testid="kr-next-triple"><Icon name="plus" size={13}/>{say(t('Extract the next triple', 'استخرج الثلاثية التالية'))}</button>
        : <button type="button" className="button small" onClick={() => { setShown(0); setPicked(null); }} data-testid="kr-replay"><Icon name="reset" size={13}/>{say(t('Extract them one at a time', 'استخرجها واحدةً تلو الأخرى'))}</button>}
      <span className="kr-count" data-testid="kr-count">{say(t(`${shown} of ${RDF_TRIPLES.length} statements`, `${shown} من ${RDF_TRIPLES.length} عبارات`))}</span>
    </div>
    <p className="kl-quote"><Icon name="check" size={15}/><span>{say(t('We have transformed one paragraph into seven structured statements.', 'لقد حوّلنا فقرة واحدة إلى سبع عبارات منظَّمة.'))}</span></p>

    <h4 className="kl-h4">{say(t('3 · Why describing information in a connected way matters', '3 · لماذا يهمّ وصف المعلومات بطريقة مترابطة'))}</h4>
    <p className="pc-lead">{say(t('This is where the real power of RDF appears: the object of one triple can become the subject of another. Each triple connects to others through shared entities.',
      'هنا تظهر القوة الحقيقية لـ RDF: فمفعول ثلاثية يمكن أن يصبح فاعل ثلاثية أخرى، وكل ثلاثية تتصل بغيرها عبر الكيانات المشتركة.'))}</p>
    <div className="kr-chain" data-testid="kr-chain">
      <div className="kr-link"><NodeChip id="v001"/><span className="kr-pred">{say(t('recorded in', 'سُجّلت في'))}</span><NodeChip id="mirbat" role="object"/></div>
      <div className="kr-link"><NodeChip id="mirbat" role="subject"/><span className="kr-pred">{say(t('located within', 'تقع ضمن'))}</span><NodeChip id="dhofar" role="object"/></div>
      <div className="kr-link"><NodeChip id="dhofar" role="subject"/><span className="kr-pred">{say(t('located within', 'تقع ضمن'))}</span><NodeChip id="oman"/></div>
    </div>
    <p className="pc-note"><Icon name="bulb" size={13}/>{say(t('Mirbat is the object of the first triple but the subject of the second. Dhofar is the object of the second but the subject of the third. This is how individual statements grow into a network of connected knowledge.',
      'مرباط مفعول في الثلاثية الأولى لكنها فاعل في الثانية، وظفار مفعول في الثانية لكنها فاعل في الثالثة. وهكذا تنمو العبارات المفردة لتصبح شبكة من المعرفة المترابطة.'))}</p>

    <h4 className="kl-h4">{say(t('4 · Why not simply use ordinary text?', '4 · لماذا لا نكتفي بالنص العادي؟'))}</h4>
    <div className="kr-compare" role="table" aria-label={say(t('Ordinary text compared with RDF', 'مقارنة النص العادي بـ RDF'))} data-testid="kr-compare">
      <div className="row head" role="row"><span role="columnheader">{say(t('Ordinary text', 'النص العادي'))}</span><span role="columnheader">RDF</span></div>
      {COMPARE.map((row, i) => <div key={i} className="row" role="row"><span role="cell">{say(row.text)}</span><span role="cell">{say(row.rdf)}</span></div>)}
    </div>
    <p className="pc-lead">{say(t('RDF does not necessarily replace the original text. It provides a structured representation of the knowledge contained within that text.',
      'لا يحلّ RDF بالضرورة محلّ النص الأصلي، بل يقدّم تمثيلًا منظَّمًا للمعرفة التي يحتويها ذلك النص.'))}</p>

    <h4 className="kl-h4">{say(t('5 · How many triples form a knowledge graph', '5 · كيف تُكوِّن الثلاثيات الكثيرة رسمًا بيانيًا معرفيًا'))}</h4>
    <p className="pc-lead">{say(t('Draw every triple as an arrow and the seven statements become one connected picture. Click a box to see every triple it takes part in. Now imagine doing this for thousands of stories, narrators, places, traditions and historical documents: you could search for connections across the whole collection, rather than searching each document on its own.',
      'ارسم كل ثلاثية سهمًا، فتصبح العبارات السبع صورة واحدة مترابطة. انقر مربعًا لترى كل الثلاثيات التي يشارك فيها. ثم تخيّل فعل ذلك لآلاف الحكايات والرواة والأماكن والتقاليد والوثائق التاريخية: ستستطيع البحث عن الروابط عبر المجموعة كلها، بدل البحث في كل وثيقة على حدة.'))}</p>
    <div className="kr-graph-wrap">
      <TripleGraph triples={graphTriples} focus={focus} onFocus={setFocus}/>
      <p className="kr-focus" aria-live="polite" data-testid="kr-focus">{focus
        ? say(t(`${node(focus)}: subject of ${graphTriples.filter(tr => tr.s === focus).length}, object of ${graphTriples.filter(tr => tr.o === focus).length} triple(s).`,
          `${node(focus)}: فاعل في ${graphTriples.filter(tr => tr.s === focus).length}، ومفعول في ${graphTriples.filter(tr => tr.o === focus).length} من الثلاثيات.`))
        : say(t('Click a box: Mirbat and Dhofar are both subject and object.', 'انقر مربعًا: مرباط وظفار كلٌّ منهما فاعل ومفعول.'))}</p>
    </div>

    <h4 className="kl-h4">{say(t('6 · Where does the ontology fit into RDF?', '6 · أين تقع الأنطولوجيا من RDF؟'))}</h4>
    <p className="pc-lead">{say(t('RDF provides the mechanism for describing connected information. The ontology provides the formal meaning and logic behind those descriptions. Both are written as RDF triples and can be stored in the same Turtle file.',
      'يوفّر RDF آلية وصف المعلومات المترابطة، وتوفّر الأنطولوجيا المعنى الصوري والمنطق وراء تلك الأوصاف. وكلاهما يُكتب ثلاثياتِ RDF، ويمكن حفظهما في ملف Turtle واحد.'))}</p>
    <div className="kr-two">
      <div><h5>{say(t('An RDF statement describes a fact', 'عبارة RDF تصف حقيقة'))}</h5><pre className="kr-code" dir="ltr">:Mirbat :locatedWithin :Dhofar .</pre></div>
      <div><h5>{say(t('An ontology definition gives the relationship its logic', 'تعريف الأنطولوجيا يعطي العلاقة منطقها'))}</h5><pre className="kr-code" dir="ltr">:locatedWithin a owl:TransitiveProperty .</pre></div>
    </div>
    <p className="pc-note"><Icon name="bulb" size={13}/>{say(t('Transitive means: if A is within B, and B is within C, then A is within C.', 'متعدّية تعني: إذا كان A ضمن B، وكان B ضمن C، فإن A ضمن C.'))}</p>
    <details className="kr-file">
      <summary>{say(t('The whole example as one Turtle file (.ttl)', 'المثال كاملًا في ملف Turtle واحد (.ttl)'))}</summary>
      <pre className="kr-code" dir="ltr" data-testid="kr-turtle">{TURTLE}</pre>
    </details>
    <div className="kl-rule" data-testid="kr-reason">
      <p className="kl-rule-text"><Icon name="help" size={15}/><span><b>{say(t('Ask: ', 'السؤال: '))}</b>{say(t('Is Mirbat located within Oman? No triple says so directly.', 'هل تقع مرباط ضمن عُمان؟ لا توجد ثلاثية تقول ذلك مباشرة.'))}</span></p>
      <div className="kl-rule-controls">
        <button type="button" className={`button small${reasoned ? '' : ' primary'}`} aria-pressed={reasoned} onClick={() => setReasoned(!reasoned)} data-testid="kr-run">
          <Icon name={reasoned ? 'reset' : 'bolt'} size={13}/>{reasoned ? say(t('Remove the derived fact', 'احذف الحقيقة المستنتَجة')) : say(t('Run the reasoning engine', 'شغّل محرّك الاستدلال'))}</button>
      </div>
      {reasoned && <p className="kl-conclusion yes" data-testid="kr-derived"><Icon name="check" size={15}/><span>{say(t('Derived: Mirbat located within Oman. Mirbat is within Dhofar and Dhofar is within Oman, and the ontology says locatedWithin is transitive, so the engine adds a new triple that nobody wrote. It appears as a dashed arrow in the graph above.',
        'مستنتَج: مرباط تقع ضمن عُمان. فمرباط ضمن ظفار، وظفار ضمن عُمان، والأنطولوجيا تقول إن locatedWithin متعدّية، فيضيف المحرّك ثلاثية جديدة لم يكتبها أحد. وتظهر سهمًا متقطّعًا في الرسم أعلاه.'))}</span></p>}
    </div>

    <h4 className="kl-h4">{say(t('7 · The complete picture', '7 · الصورة الكاملة'))}</h4>
    <ol className="kr-pipeline" data-testid="kr-pipeline">
      {PIPELINE.map(step => <li key={step.name.en}><Icon name={step.icon} size={16}/><b>{say(step.name)}</b><span>{say(step.text)}</span></li>)}
    </ol>

    <h4 className="kl-h4">{say(t('8 · The most important idea to remember', '8 · أهم فكرة لتتذكّرها'))}</h4>
    <div className="kr-lego" data-testid="kr-lego">
      <p className="kr-lego-lead"><Icon name="grid" size={16}/><span>{say(t('Think of RDF triples as LEGO building blocks. Each block is a small piece of knowledge, and because the blocks connect, we can build an enormous structure of knowledge.',
        'فكّر في ثلاثيات RDF على أنها قطع LEGO. فكل قطعة جزء صغير من المعرفة، ولأن القطع تتصل ببعضها نستطيع أن نبني بناءً ضخمًا من المعرفة.'))}</span></p>
      <ul>
        <li><b>RDF</b> {say(t('provides the building blocks.', 'يوفّر القطع.'))}</li>
        <li><b>{say(t('Ontology', 'الأنطولوجيا'))}</b> {say(t('defines the meaning of the blocks and the logic of their connections.', 'تعرّف معنى القطع ومنطق اتصالها.'))}</li>
        <li><b>{say(t('Knowledge graph', 'الرسم البياني المعرفي'))}</b> {say(t('is the structure created by connecting those blocks.', 'هو البناء الناتج عن وصل تلك القطع.'))}</li>
        <li><b>{say(t('Reasoning engine', 'محرّك الاستدلال'))}</b> {say(t('discovers what logically follows from those connections.', 'يكتشف ما يترتّب منطقيًا على تلك الروابط.'))}</li>
      </ul>
    </div>
    <p className="kl-summary-line green"><Icon name="bookmark" size={15}/><span>{say(t('The importance of RDF is not simply that it describes information, but that it describes it in a way that lets individual facts be connected, searched, shared and logically interpreted by computers.',
      'أهمية RDF ليست في أنه يصف المعلومات فحسب، بل في أنه يصفها بطريقة تسمح للحواسيب بربط الحقائق المفردة والبحث فيها ومشاركتها وتفسيرها منطقيًا.'))}</span></p>
  </>;
}
