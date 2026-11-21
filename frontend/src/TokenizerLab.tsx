/**
 * Tokenizer: students type a word, a sentence or a whole page and see exactly how a real tokenizer
 * (tiktoken, o200k_base, run by the backend) cuts it into tokens, with every token's position and ID.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import './tokenizer.css';
import { Icon } from './ui';
import { t, useTx } from './FineTuneScenes';
import type { Text } from './FineTuneScenes';
import { HERO_IDS, MAX_CHARACTERS, tokenize, visiblePiece } from './tokenizer';
import type { Segment, TokenizeResult } from './tokenizer';

const EXAMPLES: { text: string; name: Text }[] = [
  { text: 'The ship reached the port.', name: t('English sentence', 'جملة إنجليزية') },
  { text: 'In the name of Allah, the Most Gracious, the Most Merciful.', name: t('Longer English', 'جملة إنجليزية أطول') },
  { text: 'بسم الله الرحمن الرحيم', name: t('Arabic', 'عربية') },
];

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Counts up smoothly to a new number. */
function useCountUp(target: number) {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (reducedMotion()) { setShown(target); from.current = target; return; }
    const start = performance.now(), begin = from.current, span = target - begin;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 650);
      const eased = 1 - (1 - progress) ** 3;
      setShown(Math.round(begin + span * eased));
      if (progress < 1) frame = requestAnimationFrame(tick); else from.current = target;
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); from.current = target; };
  }, [target]);
  return shown;
}

const format = (value: number) => value.toLocaleString('en-US');

/** A segment's text, with a small ↵ mark before every line break so line-break tokens stay visible. */
function SegmentText({ text, showSpaces }: { text: string; showSpaces: boolean }) {
  const lines = text.split('\n');
  return <>{lines.map((line, index) => <span key={index} data-keep>
    {showSpaces ? line.replace(/ /g, '·').replace(/\t/g, '→') : line}
    {index < lines.length - 1 && <><span className="tk-nl" aria-hidden="true">↵</span>{'\n'}</>}
  </span>)}</>;
}

interface Tip { index: number; x: number; y: number; below: boolean }

function Preview({ result, showSpaces, active, setActive }: {
  result: TokenizeResult; showSpaces: boolean; active: number | null; setActive: (index: number | null) => void;
}) {
  const say = useTx();
  const box = useRef<HTMLDivElement>(null);
  const tipBox = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const segments = result.segments;

  const place = useCallback((index: number) => {
    const wrap = box.current, node = wrap?.querySelector<HTMLElement>(`[data-seg="${index}"]`);
    if (!wrap || !node) return;
    const area = wrap.getBoundingClientRect();
    const rects = node.getClientRects();
    const rect = rects[0] ?? node.getBoundingClientRect();
    const below = rect.top - area.top < 96;
    setTip({ index, x: rect.left - area.left + rect.width / 2, y: below ? rect.bottom - area.top + 10 : rect.top - area.top - 10, below });
  }, []);

  useLayoutEffect(() => { if (active === null) setTip(null); else place(active); }, [active, place, showSpaces]);
  useEffect(() => { setFocusIndex(0); }, [result]);
  // Keep the tooltip inside the preview: centre it on the token, then clamp it to the edges.
  useLayoutEffect(() => {
    const node = tipBox.current, wrap = box.current;
    if (!node || !wrap || !tip) return;
    const width = node.offsetWidth, room = wrap.clientWidth;
    node.style.left = `${Math.max(6, Math.min(tip.x - width / 2, room - width - 6))}px`;
  }, [tip]);

  const indexOf = (target: EventTarget) => {
    const node = (target as HTMLElement).closest?.('[data-seg]');
    return node ? Number(node.getAttribute('data-seg')) : null;
  };
  const onOver = (event: ReactMouseEvent) => { const index = indexOf(event.target); if (index !== null) setActive(index); };
  const onClick = (event: ReactMouseEvent) => {
    const index = indexOf(event.target);
    if (index === null) return;
    setFocusIndex(index);
    setActive(index);
  };
  const move = (event: ReactKeyboardEvent) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    let next = focusIndex;
    if (event.key in keys) next = focusIndex + keys[event.key];
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = segments.length - 1;
    else if (event.key === 'Escape') { setActive(null); return; }
    else return;
    event.preventDefault();
    next = Math.max(0, Math.min(segments.length - 1, next));
    setFocusIndex(next);
    setActive(next);
    box.current?.querySelector<HTMLElement>(`[data-seg="${next}"]`)?.focus();
  };

  const segment: Segment | undefined = tip ? segments[tip.index] : undefined;
  const tokens = segment ? segment.tokens.map(position => result.tokens[position]) : [];

  return <div className="tk-preview-wrap" ref={box} onMouseLeave={() => setActive(null)}>
    <div className={`tk-preview${result.character_count <= 160 ? ' big' : ''}`} dir="auto" data-testid="tk-preview" onMouseOver={onOver} onClick={onClick} onKeyDown={move}
      role="group" aria-label={say(t('Your text, coloured token by token', 'نصّك ملوّنًا رمزًا رمزًا'))}>
      {segments.map((piece, index) => <span key={index} data-seg={index} data-keep
        className={`tk-seg c${index % 8}${index % 2 ? ' odd' : ''}${active === index ? ' on' : ''}${piece.tokens.length > 1 ? ' multi' : ''}`}
        style={index < 160 && !reducedMotion() ? { animationDelay: `${index * 14}ms` } : undefined}
        tabIndex={index === focusIndex ? 0 : -1}
        onFocus={() => { setFocusIndex(index); setActive(index); }}
        aria-label={piece.tokens.length === 1
          ? say(t(`Token position ${piece.tokens[0] + 1}, token ID ${result.tokens[piece.tokens[0]].id}`, `موضع الرمز ${piece.tokens[0] + 1}، رقم الرمز ${result.tokens[piece.tokens[0]].id}`))
          : say(t(`${piece.tokens.length} tokens share this character: IDs ${piece.tokens.map(p => result.tokens[p].id).join(', ')}`, `${piece.tokens.length} رموز تتشارك هذا الحرف: الأرقام ${piece.tokens.map(p => result.tokens[p].id).join('، ')}`))}>
        <SegmentText text={piece.text} showSpaces={showSpaces}/>
      </span>)}
    </div>
    {tip && segment && <div ref={tipBox} className={`tk-tip${tip.below ? ' below' : ''}`} style={{ top: tip.y }} data-testid="tk-tip" role="status">
      {tokens.length > 1 && <p className="tk-tip-note">{say(t(`One character, split across ${tokens.length} tokens`, `حرف واحد مقسوم على ${tokens.length} رموز`))}</p>}
      {tokens.map(token => <div key={token.position} className="tk-tip-row">
        <span><small>{say(t('Token position', 'موضع الرمز'))}</small><b dir="ltr">{token.position + 1}</b></span>
        <span><small>{say(t('Token ID', 'رقم الرمز'))}</small><b dir="ltr">{token.id}</b></span>
        <span className="piece"><small>{say(t('Piece', 'القطعة'))}</small>
          {token.piece !== null ? <code data-keep dir="auto">{visiblePiece(token.piece)}</code> : <code data-keep dir="ltr">{say(t('bytes', 'بايتات'))} {token.bytes}</code>}</span>
      </div>)}
    </div>}
  </div>;
}

export function TokenizerLab() {
  const say = useTx();
  const [text, setText] = useState('The ship reached the port.');
  const [live, setLive] = useState(true);
  const [result, setResult] = useState<TokenizeResult | null>(null);
  const [analyzed, setAnalyzed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSpaces, setShowSpaces] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [tableOpen, setTableOpen] = useState(false);
  const request = useRef(0);
  const tooLong = text.length > MAX_CHARACTERS;

  const analyze = useCallback(async (value: string) => {
    if (value.length > MAX_CHARACTERS) return;
    const id = ++request.current;
    setBusy(true);
    setError(null);
    try {
      const data = await tokenize(value);
      if (id !== request.current) return;
      setResult(data);
      setAnalyzed(value);
      setActive(null);
    } catch (problem) {
      if (id === request.current) setError((problem as Error).message);
    } finally {
      if (id === request.current) setBusy(false);
    }
  }, []);

  // Live mode: recount shortly after the student stops typing.
  useEffect(() => {
    if (!live || text === analyzed) return;
    const timer = window.setTimeout(() => { void analyze(text); }, 380);
    return () => window.clearTimeout(timer);
  }, [text, live, analyzed, analyze]);

  const tokenCount = useCountUp(result?.token_count ?? 0);
  const wordCount = useCountUp(result?.word_count ?? 0);
  const ratio = result && result.word_count > 0 ? result.token_count / result.word_count : null;
  const stale = result !== null && analyzed !== text;
  const longest = useMemo(() => {
    if (!result) return null;
    return result.tokens.reduce<{ piece: string; size: number } | null>((best, token) => {
      const piece = token.piece?.trim() ?? '';
      return piece.length > (best?.size ?? 0) ? { piece, size: piece.length } : best;
    }, null);
  }, [result]);

  return <section className="tk-lab" aria-labelledby="tk-title">
    <header className="tk-hero">
      <div className="tk-hero-copy">
        <span className="eyebrow">{say(t('Tokenizer', 'المُرمِّز'))}</span>
        <h2 id="tk-title">{say(t('See how a real tokenizer cuts your text', 'شاهد كيف يقطّع مُرمِّز حقيقي نصّك'))}</h2>
        <p>{say(t('A language model never reads letters or words. It reads tokens: pieces of text, each with a number. Type a word, a sentence or a whole page and watch it being cut.',
          'النموذج اللغوي لا يقرأ الحروف ولا الكلمات، بل يقرأ الرموز: قطعًا من النص لكلٍّ منها رقم. اكتب كلمة أو جملة أو صفحة كاملة وشاهدها تُقطَّع.'))}</p>
        <p className="tk-engine" data-testid="tk-engine"><Icon name="chip" size={14}/>
          <span>{say(t('Tokenizer', 'المُرمِّز'))}: <b data-keep>tiktoken{result ? ` ${result.tokenizer_version}` : ''}</b></span>
          <span>{say(t('Encoding', 'الترميز'))}: <b data-keep>{result?.encoding ?? 'o200k_base'}</b></span></p>
      </div>
      <div className="tk-hero-art" aria-hidden="true">
        {['The', ' ship', ' reached', ' the', ' port', '.'].map((piece, index) => <span key={index} className={`tk-chip c${index}`} style={{ animationDelay: `${index * 0.18}s` }}>
          <b data-keep>{piece.replace(' ', '·')}</b><small data-keep>{HERO_IDS[index]}</small></span>)}
      </div>
    </header>

    <div className="tk-input card-glass">
      <div className="tk-input-head">
        <label htmlFor="tk-text"><Icon name="file" size={15}/>{say(t('Your text', 'نصّك'))}</label>
        <span className={`tk-chars${tooLong ? ' over' : ''}`} dir="ltr" data-keep>{format(text.length)} / {format(MAX_CHARACTERS)}</span>
      </div>
      <textarea id="tk-text" dir="auto" value={text} rows={6} spellCheck={false} data-testid="tk-input"
        placeholder={say(t('Type or paste English, Arabic or both. Several lines and whole pages are fine.', 'اكتب أو الصق نصًا بالإنجليزية أو العربية أو كليهما. الأسطر المتعددة والصفحات الكاملة مقبولة.'))}
        onChange={event => setText(event.target.value)}
        onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') void analyze(text); }}/>
      {tooLong && <p className="tk-message error" role="alert" data-testid="tk-limit">{say(t(
        `This text has ${format(text.length)} characters. The tokenizer accepts up to ${format(MAX_CHARACTERS)} characters (about eight pages). Shorten it to analyze it.`,
        `هذا النص فيه ${format(text.length)} حرفًا. يقبل المُرمِّز حتى ${format(MAX_CHARACTERS)} حرف (نحو ثماني صفحات). اختصره لتحليله.`))}</p>}
      <div className="tk-examples">
        <span>{say(t('Try an example:', 'جرّب مثالًا:'))}</span>
        {EXAMPLES.map(example => <button key={example.text} type="button" className="tk-example" onClick={() => { setText(example.text); void analyze(example.text); }}
          title={say(example.name)}><span data-keep dir="auto">{example.text}</span></button>)}
      </div>
      <div className="tk-actions">
        <button type="button" className="button primary tk-go" disabled={busy || tooLong} onClick={() => void analyze(text)}>
          <Icon name="sparkle" size={15}/>{say(t('Analyze text', 'حلّل النص'))}</button>
        <button type="button" className="button" onClick={() => { setText(''); void analyze(''); }}>
          <Icon name="trash" size={15}/>{say(t('Clear', 'امسح'))}</button>
        <label className="tk-switch">
          <input type="checkbox" checked={live} onChange={event => setLive(event.target.checked)}/>
          <span className="tk-switch-ui" aria-hidden="true"/>{say(t('Update as I type', 'حدّث أثناء الكتابة'))}</label>
      </div>
      {busy && <div className="tk-scan" aria-hidden="true"/>}
    </div>

    {error && <p className="tk-message error" role="alert">{error}</p>}

    {result && <div className={`tk-results${stale ? ' stale' : ''}`} aria-busy={busy}>
      <div className="tk-stats">
        <div className="tk-stat main">
          <small>{say(t('Tokens', 'الرموز'))}</small>
          <b data-testid="tk-token-count" dir="ltr">{format(tokenCount)}</b>
          <span>{say(t('pieces the model reads', 'قطع يقرؤها النموذج'))}</span>
        </div>
        <div className="tk-stat">
          <small>{say(t('Words', 'الكلمات'))}</small>
          <b data-testid="tk-word-count" dir="ltr">{format(wordCount)}</b>
          <span>{say(t('groups of letters between spaces', 'مجموعات حروف بين المسافات'))}</span>
        </div>
        <div className="tk-stat">
          <small>{say(t('Characters', 'الأحرف'))}</small>
          <b dir="ltr">{format(result.character_count)}</b>
          <span>{say(t('including spaces and line breaks', 'مع المسافات وفواصل الأسطر'))}</span>
        </div>
        <div className="tk-stat">
          <small>{say(t('Tokens per word', 'رموز لكل كلمة'))}</small>
          <b dir="ltr">{ratio === null ? '—' : ratio.toFixed(2)}</b>
          <span className="tk-ratio" aria-hidden="true"><i style={{ width: `${Math.min(100, (ratio ?? 0) / 3 * 100)}%` }}/></span>
        </div>
      </div>

      {result.token_count === 0
        ? <p className="tk-empty" data-testid="tk-empty">{say(t('Empty text has 0 tokens. Type something above, or pick an example.', 'النص الفارغ فيه 0 رموز. اكتب شيئًا في الأعلى أو اختر مثالًا.'))}</p>
        : <>
          <div className="tk-preview-head">
            <h3><Icon name="sparkles" size={16}/>{say(t('Your text, token by token', 'نصّك رمزًا رمزًا'))}</h3>
            <label className="tk-switch small">
              <input type="checkbox" checked={showSpaces} onChange={event => setShowSpaces(event.target.checked)}/>
              <span className="tk-switch-ui" aria-hidden="true"/>{say(t('Show spaces', 'أظهر المسافات'))}</label>
          </div>
          <p className="tk-hint">{say(t('Each coloured box is one token, with a line between neighbours. Hover, tap, or press Tab then the arrow keys to read its position and ID.',
            'كل مربع ملوّن رمز واحد، وبين كل رمزين خط فاصل. مرّر المؤشر أو انقر، أو اضغط Tab ثم الأسهم لقراءة موضعه ورقمه.'))}</p>
          <Preview result={result} showSpaces={showSpaces} active={active} setActive={setActive}/>
          {longest && longest.size > 1 && <p className="tk-fact"><Icon name="bulb" size={14}/><span>{say(t('Longest token here:', 'أطول رمز هنا:'))} <code data-keep dir="auto">{longest.piece}</code>
            {result.tokens.some(token => token.partial) && <> · {say(t('Some characters are split across several tokens (shown as bytes in the table).', 'بعض الأحرف مقسومة على عدة رموز (تظهر كبايتات في الجدول).'))}</>}</span></p>}

          <details className="tk-table" open={tableOpen} onToggle={event => setTableOpen((event.target as HTMLDetailsElement).open)}>
            <summary><Icon name="grid" size={15}/>{say(t(`Every token in a table (${format(result.token_count)})`, `كل الرموز في جدول (${format(result.token_count)})`))}<Icon name="down" size={14}/></summary>
            {tableOpen && <div className="tk-table-scroll">
              <table data-testid="tk-table">
                <thead><tr><th>{say(t('Position', 'الموضع'))}</th><th>{say(t('Token piece', 'قطعة الرمز'))}</th><th>{say(t('Token ID', 'رقم الرمز'))}</th></tr></thead>
                <tbody>{result.tokens.map(token => <tr key={token.position}
                  className={active !== null && result.segments[active]?.tokens.includes(token.position) ? 'on' : ''}>
                  <td dir="ltr" data-keep>{token.position + 1}</td>
                  <td>{token.piece !== null
                    ? <code data-keep dir="auto" className="tk-piece">{visiblePiece(token.piece)}</code>
                    : <code data-keep dir="ltr" className="tk-bytes" title={say(t('Part of a character: its raw bytes', 'جزء من حرف: بايتاته الخام'))}>⟨{token.bytes}⟩</code>}</td>
                  <td dir="ltr" data-keep>{token.id}</td>
                </tr>)}</tbody>
              </table>
              <p className="tk-key">{say(t('· is a space, ↵ a line break, → a tab. ⟨D8 A8⟩ are the raw bytes of a token that holds only part of a character.',
                '· مسافة، و ↵ فاصل سطر، و → مسافة جدولة. و ⟨D8 A8⟩ بايتات خام لرمز يحمل جزءًا من حرف فقط.'))}</p>
            </div>}
          </details>
        </>}
    </div>}

    <aside className="tk-explain">
      <Icon name="book" size={18}/>
      <p data-testid="tk-explain">{say(t(
        'A token is a piece of text. It can be a whole word, part of a word, or punctuation. A token ID is the fixed number this tokenizer assigns to that piece. The same text can produce different token splits and counts with a different tokenizer.',
        'الرمز قطعة من النص. قد يكون كلمة كاملة أو جزءًا من كلمة أو علامة ترقيم. ورقم الرمز هو الرقم الثابت الذي يعطيه هذا المُرمِّز لتلك القطعة. والنص نفسه قد يُقطَّع بطريقة مختلفة وبعدد رموز مختلف مع مُرمِّز آخر.'))}</p>
    </aside>
  </section>;
}
