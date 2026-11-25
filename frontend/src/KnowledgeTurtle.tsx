/**
 * Knowledge structures lab, part "RDF files and Turtle": how facts are written as triples, given
 * identifiers and namespaces, saved in a Turtle (.ttl) file, and drawn by a visualizer as a
 * knowledge-graph diagram. The visualizer reads whatever the student types (turtle.ts).
 */
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './ui';
import type { IconName } from './ui';
import { t, useTx } from './FineTuneScenes';
import type { Text } from './FineTuneScenes';
import { layoutGraph, nodeLabel, parseTurtle, predicateLabel, shuffleStatements } from './turtle';
import type { Layout, ParsedTriple } from './turtle';
import './knowledge-turtle.css';

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;
const H = 'https://example.org/heritage/';
const PREFIX = '@prefix h: <https://example.org/heritage/> .';

// ------------------------------------------------------------------ the diagram

function TurtleGraph({ layout, lit, focus, onFocus, testId }: {
  layout: Layout; lit?: Set<number>; focus?: string | null; onFocus?: (key: string | null) => void; testId: string;
}) {
  const node = new Map(layout.nodes.map(item => [item.key, item]));
  const touching = (index: number) => focus != null && (layout.edges[index].from === focus || layout.edges[index].to === focus);
  return <svg className="kt-graph" viewBox={`0 0 ${layout.width} ${layout.height}`} style={{ maxWidth: layout.width, ['--w' as string]: layout.width }} role="img" data-testid={testId}
    aria-label={`${layout.nodes.length} boxes and ${layout.edges.length} arrows`}>
    <defs>
      <marker id={`${testId}-head`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" className="kt-head"/></marker>
      <marker id={`${testId}-head-on`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" className="kt-head on"/></marker>
    </defs>
    {layout.edges.map(edge => {
      const a = node.get(edge.from)!, b = node.get(edge.to)!;
      const on = lit?.has(edge.index) || touching(edge.index);
      const dim = (lit && lit.size > 0 && !lit.has(edge.index)) || (focus != null && !touching(edge.index));
      const down = b.y > a.y;
      const path = edge.from === edge.to
        ? `M${a.x + a.width / 2} ${a.y} c 40 -30, 40 30, 0 12`
        : down
          ? `M${a.x} ${a.y + 16} L${b.x} ${b.y - 19}`
          : `M${a.x + a.width / 2} ${a.y} Q ${(a.x + b.x) / 2 + 80} ${(a.y + b.y) / 2} ${b.x + b.width / 2 + 3} ${b.y}`;
      // Put the label where arrows spread apart: near the child when one box has many arrows out,
      // near the parent when many arrows meet at one box.
      const fanIn = layout.edges.filter(other => other.to === edge.to).length > 1;
      const fanOut = layout.edges.filter(other => other.from === edge.from).length > 1;
      const along = fanIn ? 0.32 : fanOut ? 0.7 : 0.5;
      const mx = edge.from === edge.to ? a.x + a.width / 2 + 30 : down ? a.x + (b.x - a.x) * along : (a.x + b.x) / 2 + 50;
      const my = edge.from === edge.to ? a.y : down ? a.y + 16 + (b.y - 19 - a.y - 16) * along : (a.y + b.y) / 2;
      const w = edge.label.length * 6.3 + 14;
      return <g key={edge.index} className={`kt-edge${on ? ' on' : ''}${dim ? ' dim' : ''}`} data-testid={`${testId}-edge-${edge.index}`}>
        <path d={path} markerEnd={`url(#${testId}-head${on ? '-on' : ''})`}/>
        <rect x={mx - w / 2} y={my - 9} width={w} height={18} rx={9}/>
        <text x={mx} y={my + 4} textAnchor="middle" direction="ltr">{edge.label}</text>
      </g>;
    })}
    {layout.nodes.map(item => <g key={item.key} className={`kt-node ${item.term.kind}${focus === item.key ? ' on' : ''}`} transform={`translate(${item.x} ${item.y})`}
      onClick={onFocus ? () => onFocus(focus === item.key ? null : item.key) : undefined} data-testid={`${testId}-node-${item.label.replace(/\W+/g, '-')}`}>
      <rect x={-item.width / 2} y={-16} width={item.width} height={32} rx={item.term.kind === 'literal' ? 6 : 16}/>
      <text y={5} textAnchor="middle">{item.label}</text>
    </g>)}
  </svg>;
}

/** A Turtle line coloured by role: subject, predicate, object. */
function Line({ s, p, o, prefix }: { s?: string; p?: string; o?: string; prefix?: boolean }) {
  if (prefix) return <><span className="kt-kw">@prefix</span> <span className="kt-ns">h:</span> <span className="kt-iri">&lt;https://example.org/heritage/&gt;</span> .</>;
  return <><span className="kt-s">{s}</span> <span className="kt-p">{p}</span> <span className="kt-o">{o}</span> .</>;
}

function Code({ children, testId, title }: { children: ReactNode; testId?: string; title?: string }) {
  return <figure className="kt-code" data-testid={testId}>
    <figcaption><Icon name="code" size={12}/>{title ?? 'turtle'}</figcaption>
    <pre dir="ltr">{children}</pre>
  </figure>;
}

// ------------------------------------------------------------------ the visualizer

const PRESETS: { key: string; name: Text; text: string }[] = [
  { key: 'heritage', name: t('heritage.ttl: two facts', 'heritage.ttl: حقيقتان'), text: `${PREFIX}\nh:Recording15 h:wasRecordedIn h:Mirbat .\nh:Mirbat h:isLocatedIn h:Dhofar .` },
  { key: 'two-recordings', name: t('Two recordings, one town', 'تسجيلان وبلدة واحدة'), text: `${PREFIX}\nh:Recording15 h:wasRecordedIn h:Mirbat .\nh:Mirbat h:isLocatedIn h:Dhofar .\nh:Recording27 h:wasRecordedIn h:Mirbat .` },
  { key: 'names', name: t('One town, two names', 'بلدة واحدة باسمين'), text: `${PREFIX}\nh:Recording15 h:wasRecordedIn h:Mirbat .\nh:Mirbat h:hasName "Mirbat" .\nh:Mirbat h:hasName "مرباط" .` },
  { key: 'recording', name: t('Everything about Recording 15', 'كل شيء عن التسجيل 15'), text: `${PREFIX}\nh:Recording15 h:wasRecordedIn h:Mirbat .\nh:Recording15 h:hasTranscript h:Transcript15 .\nh:Recording15 h:discusses h:Salalah .\nh:Recording15 h:hasDuration "12 minutes" .\nh:Mirbat h:isLocatedIn h:Dhofar .` },
  { key: 'two-files', name: t('Two files, two prefixes', 'ملفان وبادئتان'), text: `# heritage.ttl\n${PREFIX}\nh:Recording15 h:wasRecordedIn h:Mirbat .\n\n# places.ttl uses another prefix for the same namespace\n@prefix heritage: <https://example.org/heritage/> .\nheritage:Mirbat heritage:isLocatedIn heritage:Dhofar .` },
];

function Visualizer() {
  const say = useTx();
  const [text, setText] = useState(PRESETS[1].text);
  const [focus, setFocus] = useState<string | null>(null);
  const parsed = useMemo(() => parseTurtle(text), [text]);
  const layout = useMemo(() => layoutGraph(parsed.triples), [parsed]);
  const mentions = parsed.triples.length * 2;
  const shared = layout.nodes.filter(node => node.mentions > 1);
  const canShuffle = parsed.errors.length === 0 && text.split('\n').filter(line => line.trim() && !line.trim().startsWith('#') && !/^\s*@prefix/i.test(line)).every(line => line.trim().endsWith('.'));
  const rowLit = (triple: ParsedTriple, index: number) => focus != null && (layout.edges[index].from === focus || layout.edges[index].to === focus) && triple;
  return <div className="kt-viz" data-testid="kt-visualizer">
    <div className="kt-presets" role="group" aria-label={say(t('Example files', 'ملفات أمثلة'))}>
      {PRESETS.map(preset => <button key={preset.key} type="button" className={text === preset.text ? 'on' : ''} aria-pressed={text === preset.text}
        onClick={() => { setText(preset.text); setFocus(null); }} data-testid={`kt-preset-${preset.key}`}><Icon name="file" size={13}/>{say(preset.name)}</button>)}
    </div>
    <div className="kt-viz-grid">
      <div className="kt-editor">
        <label htmlFor="kt-ttl"><Icon name="code" size={13}/>{say(t('The RDF file (Turtle text). Edit it.', 'ملف RDF (نص Turtle). عدّله.'))}</label>
        <textarea id="kt-ttl" dir="ltr" spellCheck={false} value={text} onChange={event => { setText(event.target.value); setFocus(null); }} rows={9} data-testid="kt-editor"/>
        <div className="kt-editor-actions">
          <button type="button" className="button small" disabled={!canShuffle} onClick={() => setText(shuffleStatements(text))} data-testid="kt-shuffle"><Icon name="refresh" size={13}/>{say(t('Shuffle the lines', 'بعثر الأسطر'))}</button>
          <span className="kt-stats" data-testid="kt-stats">{say(t(`${parsed.triples.length} triples → ${layout.nodes.length} boxes, ${layout.edges.length} arrows`, `${parsed.triples.length} ثلاثيات ← ${layout.nodes.length} مربعات و ${layout.edges.length} أسهم`))}</span>
        </div>
        {parsed.errors.length > 0 && <ul className="kt-errors" data-testid="kt-errors" dir="ltr">{parsed.errors.map((error, i) => <li key={i}><b>Line {error.line}:</b> {error.message}</li>)}</ul>}
      </div>
      <div className="kt-canvas">
        <span className="kt-canvas-title"><Icon name="network" size={13}/>{say(t('What a visualizer draws', 'ما يرسمه أداة العرض'))}</span>
        {layout.nodes.length
          ? <div className="kt-scroll" dir="ltr"><TurtleGraph layout={layout} focus={focus} onFocus={setFocus} testId="kt-graph"/></div>
          : <p className="kt-empty">{say(t('No triples yet. Write one, for example: h:Recording15 h:wasRecordedIn h:Mirbat .', 'لا ثلاثيات بعد. اكتب واحدة، مثل: h:Recording15 h:wasRecordedIn h:Mirbat .'))}</p>}
      </div>
    </div>
    {parsed.triples.length > 0 && <div className="kt-table" role="table" aria-label={say(t('The triples the file contains', 'الثلاثيات التي يحتويها الملف'))} data-testid="kt-triples">
      <div className="row head" role="row"><span role="columnheader">{say(t('Subject', 'الفاعل'))}</span><span role="columnheader">{say(t('Predicate', 'المسند'))}</span><span role="columnheader">{say(t('Object', 'المفعول'))}</span><span role="columnheader">{say(t('Line', 'السطر'))}</span></div>
      {parsed.triples.map((triple, i) => <div key={i} role="row" className={`row${rowLit(triple, i) ? ' on' : ''}`}>
        <span role="cell" data-keep>{nodeLabel(triple.s)}</span><span role="cell" className="kt-p" data-keep>{predicateLabel(triple.p)}</span><span role="cell" data-keep>{nodeLabel(triple.o)}</span><span role="cell">{triple.line}</span>
      </div>)}
    </div>}
    <p className="pc-note" data-testid="kt-shared"><Icon name="bulb" size={13}/>{shared.length
      ? say(t(`Each row becomes one labelled arrow. The file names things ${mentions} times, but the diagram has only ${layout.nodes.length} boxes: ${shared.map(node => `${node.label} (${node.mentions}×)`).join(', ')} ${shared.length === 1 ? 'is' : 'are'} drawn once, because every mention uses the same identifier. Click a box to see its arrows.`,
        `كل صف يصبح سهمًا واحدًا مسمّى. يذكر الملف الأشياء ${mentions} مرة، لكن الرسم فيه ${layout.nodes.length} مربعات فقط: ${shared.map(node => `${node.label} (${node.mentions}×)`).join('، ')} يُرسم مرة واحدة، لأن كل ذِكر يستخدم المعرّف نفسه. انقر مربعًا لترى أسهمه.`))
      : say(t('Each row becomes one labelled arrow. Add a line that reuses an identifier, and watch the diagram connect the facts.', 'كل صف يصبح سهمًا واحدًا مسمّى. أضف سطرًا يعيد استخدام معرّف، وراقب الرسم يربط الحقائق.'))}</p>
  </div>;
}

// ------------------------------------------------------------------ the question across facts

const QUERY_TEXT = PRESETS[1].text;

function PathQuestion() {
  const say = useTx();
  const [asked, setAsked] = useState(false);
  const { triples } = useMemo(() => parseTurtle(QUERY_TEXT), []);
  const layout = useMemo(() => layoutGraph(triples), [triples]);
  // Recordings whose place is Dhofar or lies within it.
  const within = (place: string): number[] | null => {
    if (place === `${H}Dhofar`) return [];
    for (const [i, triple] of triples.entries()) if (triple.s.value === place && triple.p.value === `${H}isLocatedIn`) {
      const rest = within(triple.o.value);
      if (rest) return [i, ...rest];
    }
    return null;
  };
  const answers = triples.flatMap((triple, i) => {
    if (triple.p.value !== `${H}wasRecordedIn`) return [];
    const path = within(triple.o.value);
    return path ? [{ name: nodeLabel(triple.s), edges: [i, ...path] }] : [];
  });
  const lit = new Set(asked ? answers.flatMap(answer => answer.edges) : []);
  return <div className="kt-question" data-testid="kt-question">
    <div className="kt-question-grid">
      <div>
        <Code><Line prefix/>{'\n\n'}<Line s="h:Recording15" p="h:wasRecordedIn" o="h:Mirbat"/>{'\n'}<Line s="h:Mirbat" p="h:isLocatedIn" o="h:Dhofar"/>{'\n'}<Line s="h:Recording27" p="h:wasRecordedIn" o="h:Mirbat"/></Code>
        <div className="kt-table compact" role="table" aria-label={say(t('Where h:Mirbat appears', 'أين يظهر h:Mirbat'))}>
          <div className="row head" role="row"><span role="columnheader">{say(t('Triple', 'الثلاثية'))}</span><span role="columnheader">{say(t('Where h:Mirbat appears', 'أين يظهر h:Mirbat'))}</span><span role="columnheader">{say(t('What the triple says', 'ماذا تقول الثلاثية'))}</span></div>
          {[[t('Object', 'مفعول'), t('Recording 15 was recorded in Mirbat.', 'سُجّل التسجيل 15 في مرباط.')], [t('Subject', 'فاعل'), t('Mirbat is located in Dhofar.', 'مرباط تقع في ظفار.')], [t('Object', 'مفعول'), t('Recording 27 was recorded in Mirbat.', 'سُجّل التسجيل 27 في مرباط.')]].map(([where, says], i) =>
            <div key={i} role="row" className="row"><span role="cell">{i + 1}</span><span role="cell"><b>{say(where)}</b></span><span role="cell">{say(says)}</span></div>)}
        </div>
      </div>
      <div className="kt-canvas"><div className="kt-scroll" dir="ltr"><TurtleGraph layout={layout} lit={lit} testId="kt-path"/></div></div>
    </div>
    <div className="kl-rule-controls">
      <button type="button" className={`button small${asked ? '' : ' primary'}`} aria-pressed={asked} onClick={() => setAsked(!asked)} data-testid="kt-ask">
        <Icon name={asked ? 'reset' : 'search'} size={13}/>{asked ? say(t('Clear the answer', 'امسح الإجابة')) : say(t('Ask: which of these recordings were made in Dhofar?', 'اسأل: أيّ هذه التسجيلات سُجّل في ظفار؟'))}</button>
    </div>
    {asked && <p className="kl-conclusion yes" data-testid="kt-answer"><Icon name="check" size={15}/><span>{say(t(`Both match: ${answers.map(answer => answer.name).join(' and ')}. The application starts at either recording, follows its link to Mirbat, then follows Mirbat’s link to Dhofar.`,
      `كلاهما يطابق: ${answers.map(answer => answer.name).join(' و ')}. يبدأ التطبيق من أيّ تسجيل، ويتبع رابطه إلى مرباط، ثم يتبع رابط مرباط إلى ظفار.`))}</span></p>}
  </div>;
}

// ------------------------------------------------------------------ small interactive pieces

function Ambiguity() {
  const say = useTx();
  const [hidden, setHidden] = useState(false);
  return <div className="kt-ambiguity" data-testid="kt-ambiguity">
    <div className="kt-flow" dir="ltr">
      <span className="kt-box s">Recording 15</span><Icon name="arrow" size={14}/>
      <span className={`kt-box p${hidden ? ' gone' : ''}`}>{hidden ? '?' : 'was recorded in'}</span><Icon name="arrow" size={14}/>
      <span className="kt-box o">Mirbat</span>
    </div>
    <button type="button" className="button small" aria-pressed={hidden} onClick={() => setHidden(!hidden)} data-testid="kt-hide-predicate">
      <Icon name={hidden ? 'reset' : 'close'} size={13}/>{hidden ? say(t('Put the predicate back', 'أعد المسند')) : say(t('Remove the predicate', 'احذف المسند'))}</button>
    <p className={hidden ? 'warn' : ''}>{hidden
      ? say(t('Recording 15 → Mirbat. Was the recording made in Mirbat? Or is Mirbat the place discussed in the recording? Without the predicate the link is ambiguous.',
        'التسجيل 15 ← مرباط. هل سُجّل التسجيل في مرباط؟ أم أن مرباط هي المكان الذي يتحدث عنه التسجيل؟ من دون المسند يصبح الرابط غامضًا.'))
      : say(t('The predicate tells you exactly what the link means: the recording was made in Mirbat.', 'المسند يخبرك بالضبط بما يعنيه الرابط: التسجيل صُنع في مرباط.'))}</p>
  </div>;
}

function TableOrTriples() {
  const say = useTx();
  const [shared, setShared] = useState(false);
  return <div className="kt-versus" data-testid="kt-table-vs">
    <div className="kt-panel">
      <h5>{say(t('In a table, look at the column heading', 'في الجدول، انظر إلى عنوان العمود'))}</h5>
      <table className="kt-mini">
        <thead><tr>{(shared ? ['?', '?', '?'] : ['Recording', 'Recorded in', 'Discusses']).map((head, i) => <th key={i} data-keep>{head}</th>)}</tr></thead>
        <tbody><tr><td data-keep>Recording 15</td><td data-keep>Mirbat</td><td data-keep>Salalah</td></tr></tbody>
      </table>
      <p className={shared ? 'warn' : ''}>{shared
        ? say(t('Without the headings, we cannot tell what Mirbat is about, or how it relates to Recording 15.', 'من دون العناوين لا نستطيع أن نعرف ما شأن مرباط، ولا ما علاقتها بالتسجيل 15.'))
        : say(t('How do you know that Mirbat is where the recording was made and Salalah is what it talks about? You read the column headings: each heading tells you how to interpret the value below it.',
          'كيف تعرف أن مرباط هي مكان التسجيل، وأن صلالة هي ما يتحدث عنه؟ تقرأ عناوين الأعمدة: فكل عنوان يخبرك كيف تفسّر القيمة التي تحته.'))}</p>
    </div>
    <div className="kt-panel">
      <h5>{say(t('In RDF, look at the predicate in each statement', 'في RDF، انظر إلى المسند في كل عبارة'))}</h5>
      <table className="kt-mini">
        <thead><tr><th>{say(t('Subject', 'الفاعل'))}</th><th>{say(t('Predicate', 'المسند'))}</th><th>{say(t('Object', 'المفعول'))}</th></tr></thead>
        <tbody>
          <tr><td data-keep>Recording 15</td><td className="kt-p" data-keep>was recorded in</td><td data-keep>Mirbat</td></tr>
          {!shared && <tr><td data-keep>Recording 15</td><td className="kt-p" data-keep>discusses</td><td data-keep>Salalah</td></tr>}
        </tbody>
      </table>
      <p className={shared ? 'ok' : ''}>{shared
        ? say(t('Only the first triple was shared, and it is still clear: “was recorded in” is part of the statement.', 'شوركت الثلاثية الأولى وحدها، وما زالت واضحة: «سُجّل في» جزء من العبارة نفسها.'))
        : say(t('Here each triple names the relationship directly. If someone shares just one triple with you, you can still tell what it means.', 'هنا تسمّي كل ثلاثية العلاقة مباشرة. فإذا شاركك أحد ثلاثية واحدة فقط، ما زلت تعرف معناها.'))}</p>
    </div>
    <button type="button" className="button small kt-versus-btn" aria-pressed={shared} onClick={() => setShared(!shared)} data-testid="kt-share">
      <Icon name={shared ? 'reset' : 'external'} size={13}/>{shared ? say(t('Show everything again', 'أظهر كل شيء مجددًا')) : say(t('Share the values without the headings, and one triple on its own', 'شارك القيم دون العناوين، وثلاثيةً واحدة وحدها'))}</button>
  </div>;
}

function Identifiers() {
  const say = useTx();
  const [full, setFull] = useState(false);
  const id = (name: string) => full ? `<${H}${name}>` : `h:${name}`;
  return <>
    <Code testId="kt-ids">
      <Line s={id('Recording15')} p={id('wasRecordedIn')} o={id('Mirbat')}/>{'\n'}
      <Line s={id('Mirbat')} p={id('hasName')} o={'"Mirbat"'}/>{'\n'}
      <Line s={id('Mirbat')} p={id('hasName')} o={'"مرباط"'}/>
    </Code>
    <button type="button" className="button small" aria-pressed={full} onClick={() => setFull(!full)} data-testid="kt-expand"><Icon name={full ? 'compress' : 'expand'} size={13}/>{full ? say(t('Show the short forms', 'أظهر الصيغ المختصرة')) : say(t('Show the full identifiers', 'أظهر المعرّفات الكاملة'))}</button>
    <div className="kt-table compact" role="table" aria-label={say(t('What each part of the file means', 'معنى كل جزء من الملف'))}>
      <div className="row head two" role="row"><span role="columnheader">{say(t('In the file', 'في الملف'))}</span><span role="columnheader">{say(t('What it means', 'ماذا يعني'))}</span></div>
      <div className="row two" role="row"><span role="cell"><code dir="ltr">h:Mirbat</code></span><span role="cell">{say(t('The identifier for the town', 'معرّف البلدة'))}</span></div>
      <div className="row two" role="row"><span role="cell"><code dir="ltr">"Mirbat"</code></span><span role="cell">{say(t('The town’s name in English', 'اسم البلدة بالإنجليزية'))}</span></div>
      <div className="row two" role="row"><span role="cell"><code>"مرباط"</code></span><span role="cell">{say(t('The town’s name in Arabic', 'اسم البلدة بالعربية'))}</span></div>
    </div>
  </>;
}

function TurtleAnatomy() {
  const say = useTx();
  const [line, setLine] = useState<number | null>(null);
  const LINES: { code: ReactNode; text: Text }[] = [
    { code: <Line prefix/>, text: t('Defines h: as a shortcut for https://example.org/heritage/. So h:Mirbat stands for the full identifier https://example.org/heritage/Mirbat.', 'يعرّف h: اختصارًا لـ https://example.org/heritage/، فيصبح h:Mirbat اختصارًا للمعرّف الكامل https://example.org/heritage/Mirbat.') },
    { code: <Line s="h:Recording15" p="h:wasRecordedIn" o="h:Mirbat"/>, text: t('One triple: Recording 15 (subject) was recorded in (predicate) Mirbat (object). It ends with a period.', 'ثلاثية واحدة: التسجيل 15 (فاعل) سُجّل في (مسند) مرباط (مفعول). وتنتهي بنقطة.') },
    { code: <Line s="h:Mirbat" p="h:isLocatedIn" o="h:Dhofar"/>, text: t('A second triple: Mirbat is located in Dhofar. h:Mirbat ended the first triple and starts this one.', 'ثلاثية ثانية: مرباط تقع في ظفار. وقد أنهى h:Mirbat الثلاثيةَ الأولى ويبدأ هذه.') },
  ];
  return <div className="kt-anatomy" data-testid="kt-anatomy">
    <figure className="kt-code file">
      <figcaption><Icon name="file" size={12}/>heritage.ttl</figcaption>
      <ol dir="ltr">{LINES.map((item, i) => <li key={i}><button type="button" className={line === i ? 'on' : ''} aria-pressed={line === i} onClick={() => setLine(line === i ? null : i)} data-testid={`kt-line-${i + 1}`}>{item.code}</button></li>)}</ol>
    </figure>
    <p className="kt-explain" aria-live="polite" data-testid="kt-line-explain"><Icon name={line === null ? 'help' : 'bulb'} size={14}/><span>{line === null ? say(t('Click a line of the file to see what it does.', 'انقر سطرًا من الملف لترى ما يفعله.')) : say(LINES[line].text)}</span></p>
    <div className="kt-legend" dir="ltr"><span className="kt-s">subject</span><span className="kt-p">predicate</span><span className="kt-o">object</span><span className="kt-ns">prefix</span></div>
  </div>;
}

const JOURNEY: { icon: IconName; name: Text; text: Text }[] = [
  { icon: 'mic', name: t('Gather', 'اجمع'), text: t('Raw information: an interview, a recording, a note.', 'معلومات خام: مقابلة أو تسجيل أو ملاحظة.') },
  { icon: 'layers', name: t('Break into triples', 'قسّمها إلى ثلاثيات'), text: t('One statement each: subject → predicate → object.', 'عبارة لكل ثلاثية: فاعل ← مسند ← مفعول.') },
  { icon: 'tokens', name: t('Give identifiers', 'أعطِ معرّفات'), text: t('One identifier for one thing, so every mention means the same thing.', 'معرّف واحد لكل شيء، فيعني كل ذِكر الشيء نفسه.') },
  { icon: 'file', name: t('Write the Turtle file', 'اكتب ملف Turtle'), text: t('The triples saved as text in heritage.ttl.', 'الثلاثيات محفوظة نصًا في heritage.ttl.') },
  { icon: 'network', name: t('Knowledge graph', 'الرسم البياني المعرفي'), text: t('Shared identifiers join the facts into one network.', 'المعرّفات المشتركة تجمع الحقائق في شبكة واحدة.') },
  { icon: 'search', name: t('Draw, search, use', 'ارسم وابحث واستخدم'), text: t('A diagram people can read, questions that follow links, clear facts for AI.', 'رسم يقرؤه الناس، وأسئلة تتبع الروابط، وحقائق واضحة للذكاء الاصطناعي.') },
];

// ------------------------------------------------------------------ the part

export function TurtlePart() {
  const say = useTx();
  return <>
    <h3 className="kl-h3">{say(t('RDF files and Turtle: from facts to a diagram', 'ملفات RDF و Turtle: من الحقائق إلى الرسم'))}</h3>
    <p className="kl-define">{say(t('An RDF file stores facts in a way that lets a computer connect them and follow those connections. RDF stands for Resource Description Framework. The file is plain text; a visualizer can turn the same text into a diagram of boxes and arrows.',
      'ملف RDF يخزّن الحقائق بطريقة تتيح للحاسوب أن يربطها ويتتبّع تلك الروابط. و RDF اختصار لـ Resource Description Framework (إطار وصف الموارد). والملف نص عادي، ويمكن لأداة عرض أن تحوّل النص نفسه إلى رسم من مربعات وأسهم.'))}</p>

    <h4 className="kl-h4">{say(t('1 · In RDF, information is stored as a set of triples', '1 · في RDF تُخزَّن المعلومات مجموعةً من الثلاثيات'))}</h4>
    <div className="kt-table" role="table" aria-label={say(t('The three parts of a triple', 'أجزاء الثلاثية الثلاثة'))} data-testid="kt-parts">
      <div className="row head three" role="row"><span role="columnheader">{say(t('Part', 'الجزء'))}</span><span role="columnheader">{say(t('What it means', 'ماذا يعني'))}</span><span role="columnheader">{say(t('Heritage example', 'مثال من التراث'))}</span></div>
      <div className="row three" role="row"><span role="cell"><b className="kt-s">{say(t('Subject', 'الفاعل'))}</b></span><span role="cell">{say(t('The thing you’re describing', 'الشيء الذي تصفه'))}</span><span role="cell" data-keep>Recording 15</span></div>
      <div className="row three" role="row"><span role="cell"><b className="kt-p">{say(t('Predicate', 'المسند'))}</b></span><span role="cell">{say(t('The relationship or property you’re describing', 'العلاقة أو الخاصية التي تصفها'))}</span><span role="cell" data-keep>was recorded in</span></div>
      <div className="row three" role="row"><span role="cell"><b className="kt-o">{say(t('Object', 'المفعول'))}</b></span><span role="cell">{say(t('The thing it links to, or the value of the property', 'الشيء الذي ترتبط به، أو قيمة الخاصية'))}</span><span role="cell" data-keep>Mirbat</span></div>
    </div>
    <p className="pc-lead">{say(t('So “Recording 15 was recorded in Mirbat” is one triple. Each triple expresses one statement with three parts: subject → predicate → object. Recording 15 → has a duration of → 12 minutes is another. Together, these triples describe the same recording.',
      'إذن «سُجّل التسجيل 15 في مرباط» ثلاثية واحدة. وكل ثلاثية تعبّر عن عبارة واحدة من ثلاثة أجزاء: فاعل ← مسند ← مفعول. و«التسجيل 15 ← مدته ← 12 دقيقة» ثلاثية أخرى. ومعًا تصف هذه الثلاثيات التسجيل نفسه.'))}</p>
    <div className="kt-why">
      <div>
        <h5>{say(t('Why three parts?', 'لماذا ثلاثة أجزاء؟'))}</h5>
        <p>{say(t('RDF uses triples because three parts are enough to express one link. You need to know:', 'يستخدم RDF الثلاثيات لأن ثلاثة أجزاء تكفي للتعبير عن رابط واحد. تحتاج إلى معرفة:'))}</p>
        <ol><li>{say(t('What you’re describing.', 'ما الذي تصفه.'))}</li><li>{say(t('How it’s connected.', 'كيف يرتبط.'))}</li><li>{say(t('What it’s connected to.', 'بماذا يرتبط.'))}</li></ol>
      </div>
      <Ambiguity/>
    </div>

    <h4 className="kl-h4">{say(t('2 · Why triples, when a table can store the same information?', '2 · لماذا الثلاثيات، والجدول يستطيع تخزين المعلومات نفسها؟'))}</h4>
    <p className="pc-lead">{say(t('Both structures work, but they organise the meaning differently. Both can tell you that Recording 15 was recorded in Mirbat. The difference is where you look to understand what “Mirbat” means.',
      'كلا البنيتين تعمل، لكنهما تنظّمان المعنى بطريقة مختلفة. فكلاهما يخبرك بأن التسجيل 15 سُجّل في مرباط، والفرق هو أين تنظر لتفهم ما تعنيه «مرباط».'))}</p>
    <TableOrTriples/>

    <h4 className="kl-h4">{say(t('3 · What is an identifier?', '3 · ما المعرّف؟'))}</h4>
    <p className="pc-lead">{say(t('An identifier is a unique reference your application uses for one specific thing. In the heritage graph, h:Mirbat is the short form of the example identifier https://example.org/heritage/Mirbat.',
      'المعرّف مرجع فريد يستخدمه تطبيقك لشيء واحد بعينه. وفي رسم التراث البياني، h:Mirbat هو الصيغة المختصرة للمعرّف المثال https://example.org/heritage/Mirbat.'))}</p>
    <Identifiers/>
    <p className="pc-lead">{say(t('One town can have several names. Because all three statements use the same identifier, your application knows that the recording location and both names refer to the same town.',
      'قد يكون للبلدة الواحدة عدة أسماء. ولأن العبارات الثلاث كلها تستخدم المعرّف نفسه، يعرف تطبيقك أن مكان التسجيل والاسمين يشيرون جميعًا إلى البلدة نفسها.'))}</p>
    <div className="kt-ns-box" data-testid="kt-namespace">
      <h5><Icon name="tokens" size={14}/>{say(t('Namespace and prefix', 'فضاء الأسماء والبادئة'))}</h5>
      <p>{say(t('h: is the shortcut for https://example.org/heritage/. That shared part is called a namespace. You add a name after h: to get the identifier for a specific thing. So h: is the prefix, and h:Mirbat is the short form of the identifier for Mirbat.',
        'h: اختصار لـ https://example.org/heritage/، ويُسمّى هذا الجزء المشترك فضاء الأسماء (namespace). وتضيف اسمًا بعد h: لتحصل على معرّف شيء بعينه. إذن h: هي البادئة، و h:Mirbat الصيغة المختصرة لمعرّف مرباط.'))}</p>
      <div className="kt-table compact" role="table" aria-label={say(t('Short forms and full identifiers', 'الصيغ المختصرة والمعرّفات الكاملة'))}>
        <div className="row head two" role="row"><span role="columnheader">{say(t('Short form in Turtle', 'الصيغة المختصرة في Turtle'))}</span><span role="columnheader">{say(t('Full identifier', 'المعرّف الكامل'))}</span></div>
        <div className="row two" role="row"><span role="cell"><code dir="ltr">h:Mirbat</code></span><span role="cell"><code dir="ltr">&lt;https://example.org/heritage/Mirbat&gt;</code></span></div>
        <div className="row two" role="row"><span role="cell"><code dir="ltr">h:Recording15</code></span><span role="cell"><code dir="ltr">&lt;https://example.org/heritage/Recording15&gt;</code></span></div>
      </div>
    </div>

    <h4 className="kl-h4">{say(t('4 · What is a Turtle file?', '4 · ما ملف Turtle؟'))}</h4>
    <p className="pc-lead">{say(t('A Turtle file is a plain-text file that writes RDF triples in a compact, readable form. Its usual file extension is .ttl, as in heritage.ttl. Why is it called Turtle? The name stands for Terse RDF Triple Language. Terse means brief or compact: for example, Turtle lets you define h: once and reuse it as a shortcut for a long identifier.',
      'ملف Turtle ملف نصي عادي يكتب ثلاثيات RDF بصيغة مختصرة سهلة القراءة، وامتداده المعتاد ‎.ttl كما في heritage.ttl. ولماذا يُسمّى Turtle؟ لأن الاسم اختصار لـ Terse RDF Triple Language (لغة ثلاثيات RDF الموجزة). و«موجزة» تعني مختصرة: فمثلًا يتيح لك Turtle أن تعرّف h: مرة واحدة ثم تعيد استخدامها اختصارًا لمعرّف طويل.'))}</p>
    <TurtleAnatomy/>
    <div className="kt-table" role="table" aria-label={say(t('The two triples in heritage.ttl', 'الثلاثيتان في heritage.ttl'))} data-testid="kt-file-triples">
      <div className="row head four" role="row"><span role="columnheader">{say(t('Subject', 'الفاعل'))}</span><span role="columnheader">{say(t('Predicate', 'المسند'))}</span><span role="columnheader">{say(t('Object', 'المفعول'))}</span><span role="columnheader">{say(t('What it says', 'ماذا تقول'))}</span></div>
      <div className="row four" role="row"><span role="cell"><code dir="ltr">h:Recording15</code></span><span role="cell"><code dir="ltr">h:wasRecordedIn</code></span><span role="cell"><code dir="ltr">h:Mirbat</code></span><span role="cell">{say(t('Recording 15 was recorded in Mirbat.', 'سُجّل التسجيل 15 في مرباط.'))}</span></div>
      <div className="row four" role="row"><span role="cell"><code dir="ltr">h:Mirbat</code></span><span role="cell"><code dir="ltr">h:isLocatedIn</code></span><span role="cell"><code dir="ltr">h:Dhofar</code></span><span role="cell">{say(t('Mirbat is located in Dhofar.', 'مرباط تقع في ظفار.'))}</span></div>
    </div>
    <p className="kl-quote"><Icon name="target" size={15}/><span>{say(t('Notice how h:Mirbat appears at the end of the first triple and at the start of the second. The shared identifier is what connects the two facts into a path: Recording 15 → Mirbat → Dhofar. RDF describes each fact as a subject, predicate and object; Turtle is the set of writing rules used to put those triples into the text file. The lines can appear in any order and still describe the same graph.',
      'لاحظ كيف يظهر h:Mirbat في نهاية الثلاثية الأولى وفي بداية الثانية. فالمعرّف المشترك هو ما يربط الحقيقتين في مسار: التسجيل 15 ← مرباط ← ظفار. يصف RDF كل حقيقة بفاعل ومسند ومفعول، و Turtle هو مجموعة قواعد الكتابة المستخدمة لوضع تلك الثلاثيات في الملف النصي. ويمكن أن تأتي الأسطر بأي ترتيب وتظل تصف الرسم البياني نفسه.'))}</span></p>

    <h4 className="kl-h4">{say(t('5 · RDF, knowledge graph and diagram', '5 · RDF والرسم البياني المعرفي والرسم التوضيحي'))}</h4>
    <div className="kt-trio">
      <img src={asset('reference/rdf-kg-diagram.webp')} width={500} height={257} loading="lazy" data-testid="kt-illustration"
        alt={say(t('Three panels: 1. RDF, how we express the facts, as a table of subject, predicate and object; 2. Knowledge graph, the network those facts form; 3. Diagram, a picture of that network. Same facts, one connected network, a picture people can read.',
          'ثلاث لوحات: 1. RDF، كيف نعبّر عن الحقائق، في جدول من فاعل ومسند ومفعول؛ 2. الرسم البياني المعرفي، الشبكة التي تكوّنها تلك الحقائق؛ 3. الرسم التوضيحي، صورة لتلك الشبكة. حقائق واحدة، وشبكة مترابطة واحدة، وصورة يقرؤها الناس.'))}/>
      <ol>
        <li><b>RDF</b> — {say(t('how we express the facts. The RDF file stores the knowledge graph as text (here, heritage.ttl). People can read the triples directly, and software can query the relationships they describe.', 'كيف نعبّر عن الحقائق. يخزّن ملف RDF الرسم البياني المعرفي نصًا (هنا heritage.ttl). ويستطيع الناس قراءة الثلاثيات مباشرة، وتستطيع البرمجيات الاستعلام عن العلاقات التي تصفها.'))}</li>
        <li><b>{say(t('Knowledge graph', 'الرسم البياني المعرفي'))}</b> — {say(t('the network those facts form: the set of connected facts, such as Recording 15 being recorded in Mirbat and Mirbat being located in Dhofar.', 'الشبكة التي تكوّنها تلك الحقائق: مجموعة الحقائق المترابطة، مثل تسجيل التسجيل 15 في مرباط ووقوع مرباط في ظفار.'))}</li>
        <li><b>{say(t('Diagram', 'الرسم التوضيحي'))}</b> — {say(t('a picture of that network. A visualizer draws the same relationships as nodes and arrows, so people can see the connections at a glance.', 'صورة لتلك الشبكة. ترسم أداة العرض العلاقات نفسها عُقدًا وأسهمًا، فيرى الناس الروابط بنظرة واحدة.'))}</li>
      </ol>
    </div>
    <p className="kl-summary-line green"><Icon name="bookmark" size={15}/><span>{say(t('Same facts. One connected network. A picture people can read.', 'حقائق واحدة. شبكة مترابطة واحدة. صورة يقرؤها الناس.'))}</span></p>

    <h4 className="kl-h4">{say(t('6 · Try it: a Turtle visualizer', '6 · جرّب: أداة عرض لملفات Turtle'))}</h4>
    <p className="pc-lead">{say(t('RDF records how individual items are classified and connected, in a form a computer can read. A visualization tool then draws them as boxes and arrows. Pick an example file or type your own lines: the diagram redraws as you type. Try adding h:Recording27 h:wasRecordedIn h:Mirbat . or shuffling the lines.',
      'يسجّل RDF كيف تُصنَّف العناصر المفردة وكيف ترتبط، بصيغة يقرؤها الحاسوب، ثم ترسمها أداة العرض مربعاتٍ وأسهمًا. اختر ملفًا مثالًا أو اكتب أسطرك أنت، فيُعاد الرسم أثناء الكتابة. جرّب إضافة h:Recording27 h:wasRecordedIn h:Mirbat . أو بعثرة الأسطر.'))}</p>
    <Visualizer/>

    <h4 className="kl-h4">{say(t('7 · Shared identifiers turn facts into paths', '7 · المعرّفات المشتركة تحوّل الحقائق إلى مسارات'))}</h4>
    <p className="pc-lead">{say(t('When every triple uses the same identifier for Mirbat, the triples share one Mirbat node. It can be the subject in one triple and the object in another, and a question can walk from fact to fact.',
      'حين تستخدم كل الثلاثيات المعرّف نفسه لمرباط، تشترك في عقدة واحدة لمرباط. فقد تكون فاعلًا في ثلاثية ومفعولًا في أخرى، ويستطيع السؤال أن ينتقل من حقيقة إلى حقيقة.'))}</p>
    <PathQuestion/>
    <p className="pc-note"><Icon name="bulb" size={13}/>{say(t('This works across files too, once the application reads both files. It matches the full identifier https://example.org/heritage/Mirbat, so another file could use a different prefix, such as heritage:Mirbat, and still refer to the same node. Try “Two files, two prefixes” in the visualizer above.',
      'وينجح هذا عبر الملفات أيضًا، ما دام التطبيق يقرأ الملفين. فهو يطابق المعرّف الكامل https://example.org/heritage/Mirbat، لذا يمكن لملف آخر أن يستخدم بادئة مختلفة مثل heritage:Mirbat ويظل يشير إلى العقدة نفسها. جرّب «ملفان وبادئتان» في أداة العرض أعلاه.'))}</p>

    <h4 className="kl-h4">{say(t('8 · From raw information to linked knowledge', '8 · من المعلومات الخام إلى المعرفة المترابطة'))}</h4>
    <ol className="kt-journey" data-testid="kt-journey">
      {JOURNEY.map(step => <li key={step.name.en}><Icon name={step.icon} size={16}/><b>{say(step.name)}</b><span>{say(step.text)}</span></li>)}
    </ol>
    <p className="pc-lead">{say(t('Why it matters: once facts are linked, search can follow connections across a whole collection instead of matching words in one document at a time, and AI systems get facts whose meaning is explicit, with a source for each one, for answering questions (as in RAG) and for preparing training data.',
      'لماذا يهمّ ذلك: حين تترابط الحقائق يستطيع البحث أن يتتبّع الروابط عبر المجموعة كلها بدل مطابقة الكلمات في وثيقة واحدة كل مرة، وتحصل أنظمة الذكاء الاصطناعي على حقائق معناها صريح ولكل منها مصدر، للإجابة عن الأسئلة (كما في RAG) ولإعداد بيانات التدريب.'))}</p>
  </>;
}
