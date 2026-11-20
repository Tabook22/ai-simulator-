/**
 * "Check yourself": a 225-question bank in five kinds, drawn at random into a fresh set every time.
 * Unseen questions are drawn first (remembered in this browser), and choices are shuffled per set.
 */
import { useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import '../quiz.css';
import { Icon } from '../ui';
import type { IconName } from '../ui';
import { usePartNav } from '../LabShell';
import { readStored, writeStored } from '../libraryStorage';
import { t, useTx } from '../FineTuneScenes';
import type { Text } from '../FineTuneScenes';
import { BANK, BANK_SIZE } from './bank';
import { Figure } from './Figure';
import type { Choice, ExplainQuestion, ImageQuestion, Kind, MatchQuestion, Question } from './types';

const cls = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(' ');


const KINDS: { kind: Kind; icon: IconName; name: Text }[] = [
  { kind: 'mcq', icon: 'check', name: t('Multiple choice', 'اختيار من متعدد') },
  { kind: 'fill', icon: 'code', name: t('Fill the blank', 'املأ الفراغ') },
  { kind: 'explain', icon: 'bookmark', name: t('Explain in your words', 'اشرح بكلماتك') },
  { kind: 'match', icon: 'network', name: t('Match and link', 'صِل واربط') },
  { kind: 'image', icon: 'grid', name: t('Look at the picture', 'انظر إلى الصورة') },
];

type Mode = 'mixed' | Kind;
const SET: Record<Mode, Partial<Record<Kind, number>>> = {
  mixed: { mcq: 8, fill: 4, explain: 2, match: 3, image: 3 },
  mcq: { mcq: 10 }, fill: { fill: 10 }, explain: { explain: 3 }, match: { match: 5 }, image: { image: 5 },
};

const SEEN_KEY = 'neuron-lab-quiz-seen';
function readSeen(): Set<string> {
  try { return new Set(JSON.parse(readStored(SEEN_KEY) ?? '[]') as string[]); } catch { return new Set(); }
}
function shuffle<T>(list: T[]) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}

/** Draw a set: unseen questions first; when a kind runs out of unseen ones, it starts over. */
function draw(mode: Mode) {
  const seen = readSeen();
  const picked: Question[] = [];
  for (const [kind, count] of Object.entries(SET[mode]) as [Kind, number][]) {
    let pool = BANK[kind].filter(question => !seen.has(question.id));
    if (pool.length < count) {
      BANK[kind].forEach(question => seen.delete(question.id));
      pool = BANK[kind];
    }
    picked.push(...shuffle(pool).slice(0, count));
  }
  picked.forEach(question => seen.add(question.id));
  writeStored(SEEN_KEY, JSON.stringify([...seen]));
  return mode === 'mixed' ? shuffle(picked) : picked;
}

function PartLink({ part }: { part: number }) {
  const say = useTx();
  const nav = usePartNav();
  return <button type="button" className="lx-link qz-review" onClick={() => nav.go(part)}>
    {say(t(`Review part ${part + 1}`, `راجع الجزء ${part + 1}`))}: {say(nav.parts[part].label)}<Icon name="next" size={11}/>
  </button>;
}

type Report = (id: string, score: number) => void;

// ------------------------------------------------------------- choice (mcq, fill, image)

function ChoiceCard({ question, onDone }: { question: Choice & { kind: 'mcq' | 'fill' | 'image' }; onDone: Report }) {
  const say = useTx();
  const order = useMemo(() => shuffle(question.options.map((_, index) => index)), [question]);
  const [picked, setPicked] = useState<number | null>(null);
  const ask = say(question.ask);
  const blank = question.kind === 'fill' ? ask.split('____') : null;
  const choose = (index: number) => { setPicked(index); onDone(question.id, index === question.right ? 1 : 0); };
  return <>
    {question.kind === 'image' && <Figure spec={(question as ImageQuestion).figure}/>}
    <p className="qz-ask">{blank && blank.length === 2
      ? <>{blank[0]}<span className={cls('qz-blank', picked !== null && (picked === question.right ? 'right' : 'wrong'))}>{picked === null ? ' '.repeat(10) : say(question.options[picked])}</span>{blank[1]}</>
      : ask}</p>
    <div className="qz-options">{order.map(index => <button key={index} type="button" disabled={picked !== null}
      className={picked === null ? '' : index === question.right ? 'right' : index === picked ? 'wrong' : ''} onClick={() => choose(index)}>
      {say(question.options[index])}</button>)}</div>
    {picked !== null && <p className={cls('qz-why', picked === question.right ? 'right' : 'wrong')} data-testid="qz-feedback">
      <strong>{picked === question.right ? say(t('Correct.', 'صحيح.')) : say(t('Not quite.', 'ليس تمامًا.'))}</strong> {say(question.why)}</p>}
  </>;
}

// ------------------------------------------------------------- explain in your words

function ExplainCard({ question, onDone }: { question: ExplainQuestion; onDone: Report }) {
  const say = useTx();
  const [text, setText] = useState('');
  const [checked, setChecked] = useState<boolean[] | null>(null);
  const check = () => {
    const lower = text.toLowerCase();
    const hits = question.points.map(point => point.words.some(word => lower.includes(word.toLowerCase())));
    setChecked(hits);
    onDone(question.id, hits.filter(Boolean).length / hits.length);
  };
  const toggle = (index: number) => setChecked(current => {
    if (!current) return current;
    const next = current.map((value, position) => position === index ? !value : value);
    onDone(question.id, next.filter(Boolean).length / next.length);
    return next;
  });
  const covered = checked?.filter(Boolean).length ?? 0;
  return <>
    <p className="qz-ask">{say(question.ask)}</p>
    <textarea className="qz-text" rows={4} value={text} disabled={checked !== null} onChange={event => setText(event.target.value)}
      placeholder={say(t('Write your answer here, in English or Arabic…', 'اكتب إجابتك هنا بالعربية أو الإنجليزية…'))} aria-label={say(question.ask)}/>
    {checked === null
      ? <button type="button" className="button small primary" disabled={text.trim().length < 15} onClick={check}><Icon name="check" size={13}/>{say(t('Check my answer', 'افحص إجابتي'))}</button>
      : <div className="qz-explain" data-testid="qz-explain-result">
        <b>{say(t(`You covered ${covered} of ${checked.length} key points`, `غطّيت ${covered} من ${checked.length} نقاط أساسية`))}</b>
        <ul>{question.points.map((point, index) => <li key={point.text.en}>
          <label><input type="checkbox" checked={checked[index]} onChange={() => toggle(index)}/>{say(point.text)}</label></li>)}</ul>
        <small>{say(t('The check looks for key words, so it can miss your wording: tick a point yourself if you covered it.', 'يبحث الفحص عن كلمات مفتاحية فقد يفوته تعبيرك: ضع علامة على النقطة بنفسك إن غطيتها.'))}</small>
        <div className="qz-model"><b>{say(t('A model answer', 'إجابة نموذجية'))}</b><p>{say(question.model)}</p></div>
      </div>}
  </>;
}

// ------------------------------------------------------------- match and link

function MatchCard({ question, onDone }: { question: MatchQuestion; onDone: Report }) {
  const say = useTx();
  const right = useMemo(() => shuffle(question.pairs.map((_, index) => index)), [question]);
  const [slots, setSlots] = useState<(number | null)[]>(() => question.pairs.map(() => null));
  const [held, setHeld] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const placed = new Set(slots.filter((value): value is number => value !== null));
  const put = (slot: number, item: number) => {
    if (checked) return;
    setSlots(current => current.map((value, index) => index === slot ? item : value === item ? null : value));
    setHeld(null);
  };
  const onDrop = (slot: number) => (event: DragEvent) => { event.preventDefault(); const item = Number(event.dataTransfer.getData('text/plain')); if (!Number.isNaN(item)) put(slot, item); };
  const score = slots.filter((value, index) => value === index).length;
  const check = () => { setChecked(true); onDone(question.id, score / question.pairs.length); };
  return <>
    <p className="qz-ask">{say(question.ask)}</p>
    <p className="qz-hint">{say(t('Drag each card onto its partner, or tap a card and then a slot.', 'اسحب كل بطاقة إلى ما يقابلها، أو انقر بطاقة ثم خانة.'))}</p>
    <div className="qz-match">
      <ol className="qz-slots">{question.pairs.map(([left], index) => {
        const item = slots[index];
        return <li key={left.en} className={cls(checked && (item === index ? 'right' : 'wrong'))}>
          <span className="qz-left">{say(left)}</span>
          <button type="button" className={cls('qz-slot', item !== null && 'full', held !== null && 'ready')} aria-label={say(t(`Slot for ${left.en}`, `خانة ${left.ar}`))}
            onDragOver={event => event.preventDefault()} onDrop={onDrop(index)} onClick={() => { if (held !== null) put(index, held); else if (item !== null && !checked) setSlots(current => current.map((value, position) => position === index ? null : value)); }}>
            {item !== null ? say(question.pairs[item][1]) : say(t('drop here', 'أفلت هنا'))}
          </button>
          {checked && item !== index && <small className="qz-correct">→ {say(question.pairs[index][1])}</small>}
        </li>;
      })}</ol>
      <div className="qz-cards">{right.filter(index => !placed.has(index)).map(index => <button key={index} type="button" draggable={!checked}
        className={cls('qz-card', held === index && 'held')} onDragStart={event => event.dataTransfer.setData('text/plain', String(index))}
        onClick={() => setHeld(held === index ? null : index)}>{say(question.pairs[index][1])}</button>)}</div>
    </div>
    {!checked
      ? <button type="button" className="button small primary" disabled={placed.size < question.pairs.length} onClick={check}><Icon name="check" size={13}/>{say(t('Check the links', 'افحص الروابط'))}</button>
      : <p className={cls('qz-why', score === question.pairs.length ? 'right' : 'wrong')} data-testid="qz-feedback">
        <strong>{say(t(`${score} of ${question.pairs.length} linked correctly.`, `${score} من ${question.pairs.length} روابط صحيحة.`))}</strong> {say(question.why)}</p>}
  </>;
}

// ------------------------------------------------------------- the quiz

export function QuizBank() {
  const say = useTx();
  const [mode, setMode] = useState<Mode>('mixed');
  const [round, setRound] = useState(0);
  const questions = useMemo(() => draw(mode), [mode, round]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const report: Report = (id, score) => setScores(current => ({ ...current, [id]: score }));
  const answered = questions.filter(question => question.id in scores).length;
  const points = questions.reduce((sum, question) => sum + (scores[question.id] ?? 0), 0);
  const fresh = (next: Mode) => { setMode(next); setRound(value => value + 1); setScores({}); };
  const kindOf = (kind: Kind) => KINDS.find(item => item.kind === kind) as typeof KINDS[number];
  return <section className="ft-quiz qz" aria-labelledby="ft-quiz-title">
    <header>
      <div>
        <h3 id="ft-quiz-title">{say(t('Check yourself', 'اختبر نفسك'))}</h3>
        <p className="qz-bank">{say(t(`A bank of ${BANK_SIZE} questions in five kinds. Every set is drawn at random, new questions first.`, `بنك من ${BANK_SIZE} سؤالًا بخمسة أنواع. كل مجموعة تُسحب عشوائيًا، والأسئلة الجديدة أولًا.`))}</p>
      </div>
      <span className="llm-stage-out" data-testid="quiz-score" dir="ltr">{Math.round(points * 10) / 10} / {questions.length}</span>
    </header>
    <div className="qz-modes" role="tablist" aria-label={say(t('Question type', 'نوع الأسئلة'))}>
      <button type="button" role="tab" aria-selected={mode === 'mixed'} className={mode === 'mixed' ? 'on' : ''} onClick={() => fresh('mixed')}>
        <Icon name="dice" size={14}/>{say(t('Mixed set', 'مجموعة منوعة'))}<small dir="ltr">20</small></button>
      {KINDS.map(item => <button key={item.kind} type="button" role="tab" aria-selected={mode === item.kind} className={mode === item.kind ? 'on' : ''}
        onClick={() => fresh(item.kind)}><Icon name={item.icon} size={14}/>{say(item.name)}<small dir="ltr">{BANK[item.kind].length}</small></button>)}
    </div>
    <div className="qz-progress"><i style={{ width: `${answered / questions.length * 100}%` }}/>
      <span>{say(t(`${answered} of ${questions.length} answered`, `${answered} من ${questions.length} أُجيب`))}</span></div>
    <ol className="qz-list" key={round}>
      {questions.map((question, index) => {
        const kind = kindOf(question.kind);
        const score = scores[question.id];
        return <li key={question.id} className={cls('qz-q', question.kind, score !== undefined && (score >= 0.5 ? 'good' : 'bad'))} data-qid={question.id} data-kind={question.kind}>
          <div className="qz-meta"><span className="qz-n" dir="ltr">{index + 1}</span><span className="qz-kind"><Icon name={kind.icon} size={12}/>{say(kind.name)}</span></div>
          {question.kind === 'explain' ? <ExplainCard question={question} onDone={report}/>
            : question.kind === 'match' ? <MatchCard question={question} onDone={report}/>
              : <ChoiceCard question={question} onDone={report}/>}
          {score !== undefined && score < 1 && <PartLink part={question.part}/>}
        </li>;
      })}
    </ol>
    <div className="qz-end">
      {answered === questions.length && <p className="qz-final" data-testid="quiz-final">{say(t(`Set finished: ${Math.round(points / questions.length * 100)}%.`, `انتهت المجموعة: ${Math.round(points / questions.length * 100)}٪.`))}</p>}
      <button type="button" className="button primary" onClick={() => fresh(mode)}><Icon name="refresh" size={14}/>{say(t('New questions', 'أسئلة جديدة'))}</button>
    </div>
  </section>;
}
