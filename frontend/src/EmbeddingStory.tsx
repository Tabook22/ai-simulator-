/**
 * "The big picture": how words, tokens, token IDs and the embedding table fit together.
 *
 *  1. Your text: every word becomes one or more tokens, every token has a fixed ID, every ID points to one row.
 *  2. The table itself: rows sorted by ID; the text only reads rows out of it (repeated tokens share a row).
 *  3. When things are fixed: IDs before training, the row's numbers during training, both frozen afterwards.
 *  4. Same starting vector, different meaning: " bank" in two sentences reads the same row; attention then
 *     mixes in the neighbours (shown with a toy stand-in for attention).
 */
import { useEffect, useMemo, useState } from 'react';
import './embedding.css';
import { Icon } from './ui';
import { t, useTx } from './FineTuneScenes';
import { visiblePiece } from './tokenizer';
import type { Token, TokenizeResult } from './tokenizer';
import { VecBars } from './VecBars';
import { DIMS, VOCAB_SIZE, averageVector, embeddingRow, formatNumber, heat, mixVectors } from './vectors';

const MAX_COLUMNS = 18;
const TRAIN_MS = 3200;
const format = (value: number) => value.toLocaleString('en-US');

/**
 * Real o200k_base tokens (checked by tests/test_tokenizer.py). " bank" is ID 6922 in both sentences,
 * and " photosynthesis" splits into two tokens.
 */
export const BANK_ID = 6922;
export const BANK_SENTENCES: { id: number; piece: string }[][] = [
  [[40, 'I'], [10139, ' sat'], [402, ' on'], [290, ' the'], [20608, ' river'], [6922, ' bank'], [13, '.']],
  [[40, 'I'], [13906, ' opened'], [261, ' a'], [6922, ' bank'], [3527, ' account'], [13, '.']],
].map(sentence => sentence.map(([id, piece]) => ({ id: id as number, piece: piece as string })));
export const SPLIT_EXAMPLE = { word: 'photosynthesis', tokens: [{ id: 8309, piece: ' photos' }, { id: 73972, piece: 'ynthesis' }] };

/** A toy stand-in for attention: half the token's own row, half the average row of the other tokens. */
export function toyAttention(ids: number[], index: number) {
  const others = ids.filter((_, i) => i !== index).map(embeddingRow);
  return mixVectors(embeddingRow(ids[index]), averageVector(others), 0.5);
}

/** The demonstration row "after training". Purely illustrative: a second fixed row per ID. */
const trainedRow = (id: number) => embeddingRow(id + VOCAB_SIZE);

const WORD_CHAR = /[\p{L}\p{M}\p{N}'’]/u;

const pieceText = (token: Token) => token.piece !== null ? visiblePiece(token.piece) : '⟨…⟩';

/** A row of the table as eight coloured cells. */
function Strip({ values, label }: { values: number[]; label: string }) {
  return <span className="ex-strip" role="img" aria-label={`${label}: ${values.map(formatNumber).join(', ')}`} dir="ltr">
    {values.map((value, d) => <i key={d} style={heat(value)} title={`d${d + 1} ${formatNumber(value)}`}/>)}
  </span>;
}

/** Group consecutive tokens by the word they belong to (a token with no letters of a word, like "·", has none). */
function wordGroups(result: TokenizeResult, limit: number) {
  const text = result.segments.map(segment => segment.text).join('');
  const chars = Array.from(text);
  const words: { start: number; end: number; text: string }[] = [];
  for (let i = 0; i < chars.length;) {
    // A word is a run of letters and digits; spaces and punctuation stand on their own.
    if (!WORD_CHAR.test(chars[i])) { i += 1; continue; }
    const start = i;
    while (i < chars.length && WORD_CHAR.test(chars[i])) i += 1;
    words.push({ start, end: i, text: chars.slice(start, i).join('') });
  }
  const groups: { word: string | null; tokens: Token[] }[] = [];
  let last = -2;
  for (const token of result.tokens.slice(0, limit)) {
    const index = words.findIndex(word => token.start < word.end && token.end > word.start);
    if (index === last && index !== -1) groups[groups.length - 1].tokens.push(token);
    else groups.push({ word: index === -1 ? null : words[index].text, tokens: [token] });
    last = index;
  }
  return groups;
}

export function EmbeddingStory({ result, picked, onPick }: { result: TokenizeResult; picked: number; onPick: (position: number) => void }) {
  const say = useTx();
  const tokens = result.tokens;
  const token = tokens[picked];
  const groups = useMemo(() => wordGroups(result, MAX_COLUMNS), [result]);
  // Arabic text runs right to left, so its columns do too.
  const firstLetter = result.segments.map(segment => segment.text).join('').match(/\p{L}/u)?.[0] ?? '';
  const flowDir = /\p{Script=Arabic}|\p{Script=Hebrew}/u.test(firstLetter) ? 'rtl' : 'ltr';
  const splitWords = [...new Set(groups.filter(group => group.word !== null && group.tokens.length > 1).map(group => group.word))]
    .map(word => ({ word }));

  // The table: the distinct IDs of the text, sorted, with the gaps between them.
  const tableRows = useMemo(() => {
    const users = new Map<number, Token[]>();
    for (const item of tokens) users.set(item.id, [...(users.get(item.id) ?? []), item]);
    return [...users.entries()].sort((a, b) => a[0] - b[0]).slice(0, 14);
  }, [tokens]);

  // Training: the same ID, with its numbers moving from random to learned.
  const [progress, setProgress] = useState(0);
  const [training, setTraining] = useState(false);
  useEffect(() => { setProgress(0); setTraining(false); }, [token.id]);
  useEffect(() => {
    if (!training) return;
    const began = performance.now() - progress * TRAIN_MS;
    let frame = 0;
    const tick = (now: number) => {
      const next = Math.min(1, (now - began) / TRAIN_MS);
      setProgress(next);
      if (next < 1) frame = requestAnimationFrame(tick); else setTraining(false);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [training]);
  const learning = mixVectors(embeddingRow(token.id), trainedRow(token.id), progress);
  const phase = progress === 0 ? 0 : progress < 1 ? 1 : 2;

  const bankIds = BANK_SENTENCES.map(sentence => sentence.map(item => item.id));
  // A window of tokens around the selected one, for the four panels at the top.
  const windowStart = Math.max(0, Math.min(picked - 4, tokens.length - 9));
  const windowEnd = Math.min(tokens.length, windowStart + 9);
  const windowTokens = tokens.slice(windowStart, windowEnd);

  const bankStart = embeddingRow(BANK_ID);
  const bankAfter = bankIds.map(ids => toyAttention(ids, ids.indexOf(BANK_ID)));

  return <section className="ex-story" aria-labelledby="ex-title" data-testid="ex-story">
    <h3 id="ex-title"><Icon name="network" size={18}/>{say(t('The big picture: every token has one fixed row', 'الصورة الكاملة: لكل رمز صف ثابت واحد'))}</h3>
    {/* At a glance: the selected token from sentence to starting vector, in four panels. */}
    <ol className="ex-glance" data-testid="ex-glance">
      <li>
        <b className="ex-g-head"><span>1</span>{say(t('Your sentence', 'جملتك'))}</b>
        <p className="ex-g-sentence" data-keep dir="auto">{windowStart > 0 && '… '}{windowTokens.map(item => item.position === picked
          ? <mark key={item.position} data-keep>{item.piece ?? '⟨…⟩'}</mark> : <span key={item.position} data-keep>{item.piece ?? ''}</span>)}{windowEnd < tokens.length && ' …'}</p>
      </li>
      <li>
        <b className="ex-g-head"><span>2</span>{say(t('Tokenizer', 'المُرمِّز'))}</b>
        <p className="ex-g-chips" dir={flowDir}>{windowTokens.map(item => <button key={item.position} type="button" className={item.position === picked ? 'on' : ''}
          onClick={() => onPick(item.position)}><code data-keep dir="auto">{pieceText(item)}</code></button>)}</p>
        <p className="ex-g-callout" dir="ltr"><code data-keep>{pieceText(token)}</code> → <span>{say(t('Token ID', 'رقم الرمز'))}</span> <b>{token.id}</b></p>
      </li>
      <li>
        <b className="ex-g-head"><span>3</span>{say(t('Embedding table', 'جدول التضمين'))}</b>
        <div className="ex-g-table" dir="ltr" role="table" aria-label={say(t(`Rows near ${token.id}`, `الصفوف قرب ${token.id}`))}>
          <div className="head" role="row"><span role="columnheader">{say(t('Token ID', 'رقم الرمز'))}</span><span role="columnheader">{say(t('Stored vector', 'المتجه المخزَّن'))}</span></div>
          {[token.id - 1, token.id, token.id + 1].filter(rowId => rowId >= 0 && rowId < VOCAB_SIZE).map(rowId => <div key={rowId} role="row" className={rowId === token.id ? 'on' : ''}>
            <span role="rowheader">{rowId}</span><span role="cell">[{embeddingRow(rowId).slice(0, 3).map(formatNumber).join(', ')}, …]</span></div>)}
        </div>
        <p className="ex-g-callout"><Icon name="search" size={13}/>{say(t(`Look up row ${token.id}`, `ابحث عن الصف ${token.id}`))}</p>
      </li>
      <li>
        <b className="ex-g-head"><span>4</span>{say(t(`Starting vector for ${pieceText(token).replace(/·/g, ' ').trim() || 'this token'}`, `المتجه الابتدائي لـ ${pieceText(token).replace(/·/g, ' ').trim() || 'هذا الرمز'}`))}</b>
        <p className="ex-g-vector" dir="ltr" data-testid="ex-g-vector">[{embeddingRow(token.id).map(formatNumber).join(', ')}]</p>
      </li>
    </ol>
    <div className="ex-principle">
      <p><Icon name="target" size={18}/><b>{say(t('Key idea: the token ID selects the row, and the row supplies the vector.', 'الفكرة الأساسية: رقم الرمز يختار الصف، والصف يعطي المتجه.'))}</b></p>
      <small>{say(t('Real tokens and IDs from o200k_base; the vector numbers come from the demonstration table.', 'الرموز والأرقام حقيقية من o200k_base؛ أما أرقام المتجه فمن الجدول التوضيحي.'))}</small>
    </div>
    <p className="ex-correct"><Icon name="bulb" size={15}/><span>{say(t(
      'Each token, not each word: a word can be split into several tokens, and each of them gets its own row.',
      'لكل رمز، لا لكل كلمة: فقد تنقسم الكلمة إلى عدة رموز، ولكل منها صفه الخاص.'))}</span></p>

    {/* 1. The user's own text, column by column. */}
    <div className="ex-panel">
      <b className="ex-panel-title">{say(t('Your text, followed down to the table', 'نصّك، متتبَّعًا حتى الجدول'))}</b>
      <div className="ex-flow-labels" aria-hidden="true">
        <span>{say(t('Word', 'الكلمة'))}</span><span>{say(t('Token', 'الرمز'))}</span><span>{say(t('Token ID', 'رقم الرمز'))}</span><span>{say(t('Row = starting vector', 'الصف = المتجه الابتدائي'))}</span>
      </div>
      <div className="ex-flow" data-testid="ex-flow" dir={flowDir}>
        {groups.map((group, g) => <div key={g} className={`ex-word${group.tokens.length > 1 ? ' split' : ''}${group.word === null ? ' none' : ''}`}>
          <span className="ex-word-label" data-keep dir="auto">{group.word ?? (group.tokens.every(item => item.piece !== null && item.piece.trim() === '') ? say(t('(space)', '(مسافة)')) : say(t('(symbol)', '(رمز ترقيم)')))}</span>
          <div className="ex-word-tokens">
            {group.tokens.map(item => <button key={item.position} type="button" className={`ex-col${item.position === picked ? ' picked' : ''}`}
              onClick={() => onPick(item.position)} aria-pressed={item.position === picked}
              aria-label={say(t(`Token ${item.position + 1}, ID ${item.id}`, `الرمز ${item.position + 1}، الرقم ${item.id}`))}>
              <code data-keep dir="auto">{pieceText(item)}</code>
              <i className="ex-down" aria-hidden="true"/>
              <b>{item.id}</b>
              <i className="ex-down" aria-hidden="true"/>
              <Strip values={embeddingRow(item.id)} label={say(t(`Row ${item.id}`, `الصف ${item.id}`))}/>
            </button>)}
          </div>
        </div>)}
        {tokens.length > MAX_COLUMNS && <span className="ex-more">{say(t(`+ ${format(tokens.length - MAX_COLUMNS)} more tokens`, `+ ${format(tokens.length - MAX_COLUMNS)} رموز أخرى`))}</span>}
      </div>
      <p className="ex-note" data-testid="ex-split">{splitWords.length > 0
        ? say(t(`In your text, ${splitWords.map(group => `“${group.word}”`).join(', ')} ${splitWords.length === 1 ? 'is' : 'are'} split into several tokens, so ${splitWords.length === 1 ? 'it reads' : 'they read'} several rows.`,
          `في نصّك، تنقسم ${splitWords.map(group => `«${group.word}»`).join('، ')} إلى عدة رموز، فتُقرأ عدة صفوف.`))
        : say(t(`Every word here is a single token. Longer or rarer words split: “${SPLIT_EXAMPLE.word}” becomes ${SPLIT_EXAMPLE.tokens.map(item => `${visiblePiece(item.piece)} (${item.id})`).join(' + ')}, two tokens and two rows.`,
          `كل كلمة هنا رمز واحد. أما الكلمات الأطول أو الأندر فتنقسم: «${SPLIT_EXAMPLE.word}» تصبح ${SPLIT_EXAMPLE.tokens.map(item => `${visiblePiece(item.piece)} (${item.id})`).join(' + ')}، أي رمزين وصفّين.`))}</p>
    </div>

    {/* 2. The table itself. */}
    <div className="ex-panel">
      <b className="ex-panel-title">{say(t('Inside the embedding table', 'داخل جدول التضمين'))}</b>
      <p className="ex-text">{say(t(`The table never changes while the model reads. It has ${format(VOCAB_SIZE)} rows, one per ID, sorted by ID. Your text simply reads the rows it needs. A token that appears twice reads the same row twice.`,
        `لا يتغيّر الجدول أثناء قراءة النموذج. فيه ${format(VOCAB_SIZE)} صفًا، صف لكل رقم، مرتبة حسب الرقم. ونصّك يقرأ الصفوف التي يحتاجها فقط. والرمز الذي يظهر مرتين يقرأ الصف نفسه مرتين.`))}</p>
      <div className="ex-table" data-testid="ex-table" role="table" aria-label={say(t('Rows of the embedding table used by your text', 'صفوف جدول التضمين التي يستخدمها نصّك'))}>
        <div className="ex-trow head" role="row"><span role="columnheader">ID</span><span role="columnheader" dir="ltr">d1 … d{DIMS}</span><span role="columnheader">{say(t('Used by', 'يستخدمه'))}</span></div>
        {tableRows.map(([rowId, users], index) => {
          const gap = rowId - (index === 0 ? -1 : tableRows[index - 1][0]) - 1;
          return <div key={rowId} role="rowgroup">
            {gap > 0 && <div className="ex-gap" role="row"><span role="cell">⋮ {say(t(`${format(gap)} other rows`, `${format(gap)} صفًا آخر`))}</span></div>}
            <div className={`ex-trow${rowId === token.id ? ' picked' : ''}`} role="row">
              <span role="rowheader" dir="ltr">{format(rowId)}</span>
              <span role="cell"><Strip values={embeddingRow(rowId)} label={say(t(`Row ${rowId}`, `الصف ${rowId}`))}/></span>
              <span role="cell" className="ex-users">{users.map(item => <button key={item.position} type="button" className={item.position === picked ? 'on' : ''} onClick={() => onPick(item.position)}>
                <code data-keep dir="auto">{pieceText(item)}</code><small>#{item.position + 1}</small></button>)}
                {users.length > 1 && <em data-testid="ex-shared">{say(t(`${users.length} tokens, 1 row`, `${users.length} رموز، صف واحد`))}</em>}</span>
            </div>
          </div>;
        })}
        <div className="ex-gap" role="row"><span role="cell">⋮ {say(t(`… up to row ${format(VOCAB_SIZE - 1)}`, `… حتى الصف ${format(VOCAB_SIZE - 1)}`))}</span></div>
      </div>
    </div>

    {/* 3. When are the ID and the numbers fixed? */}
    <div className="ex-panel">
      <b className="ex-panel-title">{say(t('When is each part fixed?', 'متى يُثبَّت كل جزء؟'))}</b>
      <ol className="ex-time" data-testid="ex-time">
        <li className="done">
          <span className="ex-dot"><Icon name="lock" size={14}/></span>
          <b>{say(t('Before training: the ID', 'قبل التدريب: الرقم'))}</b>
          <p>{say(t('The tokenizer’s vocabulary is built first. Each piece of text gets its ID, and the ID never changes.', 'تُبنى مفردات المُرمِّز أولًا. تأخذ كل قطعة نص رقمها، ولا يتغيّر الرقم أبدًا.'))}</p>
          <div className="ex-idlock"><code data-keep dir="auto">{pieceText(token)}</code><Icon name="arrow" size={14}/><b dir="ltr">{token.id}</b></div>
        </li>
        <li className={phase >= 1 ? 'done' : ''}>
          <span className="ex-dot"><Icon name="refresh" size={14}/></span>
          <b>{say(t('During training: the numbers', 'أثناء التدريب: الأرقام'))}</b>
          <p>{say(t('Row ' + token.id + ' starts as random numbers. Training nudges them a little after every example, so they become useful. The ID stays the same the whole time.',
            'يبدأ الصف ' + token.id + ' بأرقام عشوائية. ويعدّلها التدريب قليلًا بعد كل مثال حتى تصبح مفيدة. ويبقى الرقم كما هو طوال الوقت.'))}</p>
          <div className="ex-train">
            <button type="button" className="button small primary" onClick={() => { if (progress >= 1) setProgress(0); setTraining(!training); }} data-testid="ex-train-play">
              <Icon name={training ? 'pause' : 'play'} size={14}/>{training ? say(t('Pause', 'أوقف مؤقتًا')) : progress >= 1 ? say(t('Train again', 'درّب مرة أخرى')) : say(t('Train the row', 'درّب الصف'))}</button>
            <label className="ex-slider"><span>{say(t('Training', 'التدريب'))} <b dir="ltr">{Math.round(progress * 100)}%</b></span>
              <input type="range" min={0} max={100} value={Math.round(progress * 100)} onChange={event => { setTraining(false); setProgress(Number(event.target.value) / 100); }}
                aria-label={say(t('Training progress', 'تقدّم التدريب'))}/></label>
          </div>
          <div className="ex-train-row"><span dir="ltr">ID {token.id}</span><Strip values={learning} label={say(t('Row during training', 'الصف أثناء التدريب'))}/></div>
          <small className="ex-note">{say(t('Illustration: the demonstration table is not really trained, so the “learned” numbers here are made up.', 'توضيح: الجدول التوضيحي لا يُدرَّب فعلًا، لذا فالأرقام «المتعلَّمة» هنا مُختلَقة.'))}</small>
        </li>
        <li className={phase >= 2 ? 'done' : ''}>
          <span className="ex-dot"><Icon name="check" size={14}/></span>
          <b>{say(t('After training: both are frozen', 'بعد التدريب: كلاهما ثابت'))}</b>
          <p>{say(t('When the trained model reads any sentence, the same ID always gives the same starting vector.', 'عندما يقرأ النموذج المدرَّب أي جملة، يعطي الرقم نفسه دائمًا المتجه الابتدائي نفسه.'))}</p>
        </li>
      </ol>
    </div>

    {/* 4. Same starting vector, different meaning. */}
    <div className="ex-panel">
      <b className="ex-panel-title">{say(t('Same starting vector, different meaning', 'المتجه الابتدائي نفسه، والمعنى مختلف'))}</b>
      <p className="ex-text">{say(t('“bank” means different things in these two sentences, yet the tokenizer gives both the same ID, so both read the same row. Attention is what changes them afterwards, by mixing in the words around them.',
        'كلمة «bank» تعني شيئين مختلفين في هاتين الجملتين (ضفّة النهر والمصرف)، ومع ذلك يعطيهما المُرمِّز الرقم نفسه، فتقرآن الصف نفسه. والانتباه هو ما يغيّرهما بعد ذلك، بمزج الكلمات المحيطة بهما.'))}</p>
      <div className="ex-bank" data-testid="ex-bank">
        {BANK_SENTENCES.map((sentence, s) => <div key={s} className="ex-bank-col">
          <p className="ex-sentence" dir="ltr">{sentence.map((item, i) => <code key={i} data-keep className={item.id === BANK_ID ? 'hit' : ''}>{visiblePiece(item.piece)}</code>)}</p>
          <span className="ex-step"><b dir="ltr">ID {BANK_ID}</b> → {say(t('row', 'الصف'))} <b dir="ltr">{BANK_ID}</b></span>
          <VecBars values={bankStart} tone="#5ee7ff" label={say(t('Starting vector', 'المتجه الابتدائي'))} testId={`ex-bank-start-${s}`}/>
          <span className="ex-step attn"><Icon name="down" size={14}/>{say(t(s === 0 ? 'attention mixes in “river”, “sat”…' : 'attention mixes in “opened”, “account”…', s === 0 ? 'الانتباه يمزج «river» و«sat»…' : 'الانتباه يمزج «opened» و«account»…'))}</span>
          <VecBars values={bankAfter[s]} tone={s === 0 ? '#5ef2a0' : '#ffc46b'} label={say(t('After attention', 'بعد الانتباه'))} testId={`ex-bank-after-${s}`}/>
        </div>)}
      </div>
      <small className="ex-note">{say(t('Toy attention: half of “bank”’s own row plus half of the average row of the other tokens. Real attention learns how much to take from each word, over many layers.',
        'انتباه مبسَّط: نصف صف «bank» نفسه زائد نصف متوسط صفوف الرموز الأخرى. أما الانتباه الحقيقي فيتعلّم كم يأخذ من كل كلمة، عبر طبقات كثيرة.'))}</small>
    </div>

    <p className="ex-sum">{say(t('Next: follow the selected token step by step, including the position vector the model adds to its starting vector.', 'التالي: تابع الرمز المختار خطوة بخطوة، بما فيه متجه الموضع الذي يضيفه النموذج إلى متجهه الابتدائي.'))}</p>
  </section>;
}
