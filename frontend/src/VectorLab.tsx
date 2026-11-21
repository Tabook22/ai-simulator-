/**
 * "From tokens to vectors": click a token and follow it through the first layer of a transformer:
 * its ID picks one row of the embedding table, a position vector is added, and the result is the
 * vector the model starts from. Then every token's vector is stacked into a matrix and averaged into
 * one vector for the whole text. The table is a small demonstration table (see vectors.ts).
 */
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import './vectors.css';
import { Icon } from './ui';
import { t, useTx } from './FineTuneScenes';
import { visiblePiece } from './tokenizer';
import type { TokenizeResult } from './tokenizer';
import { DIMS, VOCAB_SIZE, addVectors, averageVector, embeddingRow, formatNumber, heat, inputVector, positionVector } from './vectors';
import { EmbeddingStory } from './EmbeddingStory';
import { VecBars } from './VecBars';

const MATRIX_ROWS = 40;
const STEP_MS = 1900;
const dims = Array.from({ length: DIMS }, (_, d) => d);
const format = (value: number) => value.toLocaleString('en-US');
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Three vectors lined up column by column: token row + position = input vector. */
function SumTable({ token, position, total }: { token: number[]; position: number[]; total: number[] }) {
  const say = useTx();
  const rows: [string, number[], string][] = [
    [say(t('Token row', 'صف الرمز')), token, ''],
    [say(t('+ Position', '+ الموضع')), position, ''],
    [say(t('= Input vector', '= متجه الإدخال')), total, 'total'],
  ];
  return <div className="vx-sum" role="table" aria-label={say(t('Token row plus position vector', 'صف الرمز زائد متجه الموضع'))}>
    <div className="vx-sum-row head" role="row"><span role="columnheader"/>{dims.map(d => <span key={d} role="columnheader" dir="ltr">d{d + 1}</span>)}</div>
    {rows.map(([name, values, kind]) => <div key={name} className={`vx-sum-row ${kind}`} role="row">
      <span role="rowheader">{name}</span>
      {values.map((value, d) => <span key={d} role="cell" dir="ltr" style={heat(value)}>{formatNumber(value)}</span>)}
    </div>)}
  </div>;
}

export function VectorLab({ result, picked, onPick }: { result: TokenizeResult; picked: number; onPick: (position: number) => void }) {
  const say = useTx();
  const [spot, setSpot] = useState<number | null>(null);
  const tokens = result.tokens;
  const token = tokens[Math.min(picked, tokens.length - 1)];
  const id = token.id, pos = token.position;
  const row = useMemo(() => embeddingRow(id), [id]);
  const place = useMemo(() => positionVector(pos), [pos]);
  const total = useMemo(() => addVectors(row, place), [row, place]);
  const matrix = useMemo(() => tokens.map(item => inputVector(item.id, item.position)), [tokens]);
  const sentence = useMemo(() => averageVector(matrix), [matrix]);
  const repeats = tokens.filter(item => item.id === id).map(item => item.position);
  const piece = token.piece !== null ? visiblePiece(token.piece) : `⟨${token.bytes}⟩`;
  // Neighbouring rows of the table around this ID, to show that the ID simply picks one row.
  const tableIds = [-2, -1, 0, 1, 2].map(offset => id + offset).filter(value => value >= 0 && value < VOCAB_SIZE);

  // "Play the steps": light up each step in turn.
  useEffect(() => {
    if (spot === null) return;
    const timer = window.setTimeout(() => setSpot(spot >= 6 ? null : spot + 1), STEP_MS);
    return () => window.clearTimeout(timer);
  }, [spot]);
  useEffect(() => { setSpot(null); }, [picked, result]);

  const stage = (n: number) => `vx-stage${spot === n ? ' spot' : ''}${spot !== null && spot !== n ? ' dim' : ''}`;
  const delay = (n: number): CSSProperties => reducedMotion() ? {} : { animationDelay: `${n * 0.12}s` };
  const shownRows = Math.min(tokens.length, MATRIX_ROWS);
  const column = matrix.map(values => values[0]);

  return <section className="vx-lab" aria-labelledby="vx-title" data-testid="vx-lab">
    <header className="vx-head">
      <div>
        <h3 id="vx-title"><Icon name="layers" size={18}/>{say(t('From tokens to vectors', 'من الرموز إلى المتجهات'))}</h3>
        <p>{say(t('A model cannot do maths on the word “ship”. Its first layer turns every token ID into a list of numbers, a vector. Click any token above to follow it.',
          'لا يستطيع النموذج إجراء حسابات على كلمة «ship». طبقته الأولى تحوّل رقم كل رمز إلى قائمة أرقام تُسمّى متجهًا. انقر أي رمز في الأعلى لتتابعه.'))}</p>
      </div>
      <p className="vx-badge" data-testid="vx-badge"><Icon name="help" size={14}/><span>{say(t(
        `Demonstration table: ${DIMS} numbers per token, fixed for each ID but not learned, so they carry no meaning. GPT-4o’s real table is not public and has thousands of numbers per token.`,
        `جدول توضيحي: ${DIMS} أرقام لكل رمز، ثابتة لكل رقم رمز لكنها غير متعلَّمة، فلا تحمل معنى. جدول GPT-4o الحقيقي غير منشور، وفيه آلاف الأرقام لكل رمز.`))}</span></p>
    </header>

    <EmbeddingStory result={result} picked={Math.min(picked, tokens.length - 1)} onPick={onPick}/>

    <div className="vx-picker">
      <button type="button" className="button small" disabled={picked <= 0} onClick={() => onPick(picked - 1)} aria-label={say(t('Previous token', 'الرمز السابق'))}>
        <Icon name="previous" size={14}/></button>
      <div className="vx-picked" data-testid="vx-picked">
        <small>{say(t('Selected token', 'الرمز المختار'))}</small>
        <code data-keep dir="auto">{piece}</code>
        <span>{say(t('Token position', 'موضع الرمز'))} <b dir="ltr">{pos + 1}</b></span>
        <span>{say(t('Token ID', 'رقم الرمز'))} <b dir="ltr">{id}</b></span>
      </div>
      <button type="button" className="button small" disabled={picked >= tokens.length - 1} onClick={() => onPick(picked + 1)} aria-label={say(t('Next token', 'الرمز التالي'))}>
        <Icon name="next" size={14}/></button>
      <button type="button" className="button small primary vx-play" onClick={() => setSpot(spot === null ? 1 : null)} aria-pressed={spot !== null}>
        <Icon name={spot === null ? 'play' : 'pause'} size={14}/>{spot === null ? say(t('Play the steps', 'شغّل الخطوات')) : say(t('Stop', 'أوقف'))}</button>
    </div>

    <ol className="vx-pipeline" key={`${id}-${pos}`}>
      <li className={stage(1)} style={delay(0)}>
        <span className="vx-n">1</span>
        <div className="vx-body">
          <b>{say(t('The tokenizer gives an ID', 'المُرمِّز يعطي رقمًا'))}</b>
          <p>{say(t('The piece of text is replaced by its fixed number. From here on, the model only sees the number.', 'تُستبدل قطعة النص برقمها الثابت. ومن هنا لا يرى النموذج إلا الرقم.'))}</p>
          <div className="vx-idflow"><code data-keep dir="auto">{piece}</code><Icon name="arrow" size={16}/><b dir="ltr">{id}</b></div>
        </div>
      </li>

      <li className={stage(2)} style={delay(1)}>
        <span className="vx-n">2</span>
        <div className="vx-body">
          <b>{say(t('The ID points to one row of the table', 'الرقم يشير إلى صف واحد في الجدول'))}</b>
          <p>{say(t(`The embedding table has one row for every ID: ${format(VOCAB_SIZE)} rows. ID ${format(id)} simply picks row ${format(id)}. (In maths this is a “one-hot” vector, ${format(VOCAB_SIZE)} zeros with a single 1, times the table.)`,
            `في جدول التضمين صف لكل رقم: ${format(VOCAB_SIZE)} صفًا. والرقم ${format(id)} يختار الصف ${format(id)} ببساطة. (رياضيًا هذا متجه «واحد ساخن»: ${format(VOCAB_SIZE)} صفرًا مع 1 واحد، مضروبًا في الجدول.)`))}</p>
          <div className="vx-vocab" aria-hidden="true">
            <span className="vx-vocab-bar"><i style={{ left: `${(id / (VOCAB_SIZE - 1)) * 100}%` }}/></span>
            <span className="vx-vocab-ends" dir="ltr"><small>0</small><small>{format(VOCAB_SIZE - 1)}</small></span>
          </div>
        </div>
      </li>

      <li className={stage(3)} style={delay(2)}>
        <span className="vx-n">3</span>
        <div className="vx-body">
          <b>{say(t('Read that row: the token vector', 'اقرأ ذلك الصف: متجه الرمز'))}</b>
          <p>{say(t(`Each row holds ${DIMS} numbers here (real models: hundreds to thousands). Every time this ID appears, the same row is used.`,
            `كل صف هنا فيه ${DIMS} أرقام (النماذج الحقيقية: مئات إلى آلاف). وكلما ظهر هذا الرقم يُستخدم الصف نفسه.`))}</p>
          <div className="vx-table" role="table" aria-label={say(t('Rows of the embedding table near this ID', 'صفوف جدول التضمين قرب هذا الرقم'))}>
            <div className="vx-table-row head" role="row"><span role="columnheader">ID</span>{dims.map(d => <span key={d} role="columnheader" dir="ltr">d{d + 1}</span>)}</div>
            {tableIds.map(rowId => <div key={rowId} className={`vx-table-row${rowId === id ? ' picked' : ''}`} role="row">
              <span role="rowheader" dir="ltr">{format(rowId)}</span>
              {embeddingRow(rowId).map((value, d) => <span key={d} role="cell" dir="ltr" style={rowId === id ? heat(value) : undefined}>{formatNumber(value)}</span>)}
            </div>)}
          </div>
          <VecBars values={row} tone="#5ee7ff" label={say(t('Token vector', 'متجه الرمز'))} testId="vx-token-vector"/>
        </div>
      </li>

      <li className={stage(4)} style={delay(3)}>
        <span className="vx-n">4</span>
        <div className="vx-body">
          <b>{say(t('Add where it sits: the position vector', 'أضف مكانه: متجه الموضع'))}</b>
          <p>{say(t(`Without this, “dog bites man” and “man bites dog” would look the same. Position ${pos + 1} gets its own pattern of waves (the formula counts from 0, so pos = ${pos}):`,
            `لولا هذا لبدت «الكلب عضّ الرجل» و«الرجل عضّ الكلب» متطابقتين. الموضع ${pos + 1} يأخذ نمطًا خاصًا من الموجات (المعادلة تبدأ العدّ من 0، أي pos = ${pos}):`))}</p>
          <p className="vx-formula" dir="ltr">PE(pos, 2i) = sin(pos / 10000<sup>2i/{DIMS}</sup>) · PE(pos, 2i+1) = cos(pos / 10000<sup>2i/{DIMS}</sup>)</p>
          <VecBars values={place} tone="#ffc46b" label={say(t('Position vector', 'متجه الموضع'))} testId="vx-position-vector"/>
          <small className="vx-note">{say(t('This is the method of the original Transformer. Many newer models (Llama, Qwen) add position inside attention instead (RoPE), but the idea is the same: order matters.',
            'هذه طريقة المحوّل الأصلي. كثير من النماذج الأحدث (Llama و Qwen) تضيف الموضع داخل الانتباه بدلًا من ذلك (RoPE)، لكن الفكرة واحدة: الترتيب مهم.'))}</small>
        </div>
      </li>

      <li className={stage(5)} style={delay(4)}>
        <span className="vx-n">5</span>
        <div className="vx-body">
          <b>{say(t('Token vector + position vector = input vector', 'متجه الرمز + متجه الموضع = متجه الإدخال'))}</b>
          <p>{say(t('Add them number by number. This is the vector the model’s layers start working on.', 'اجمعهما رقمًا رقمًا. هذا هو المتجه الذي تبدأ طبقات النموذج العمل عليه.'))}</p>
          <SumTable token={row} position={place} total={total}/>
          <VecBars values={total} tone="#a78bfa" label={say(t('Input vector', 'متجه الإدخال'))} testId="vx-input-vector"/>
          {repeats.length > 1 && <p className="vx-repeat" data-testid="vx-repeat"><Icon name="bulb" size={14}/><span>{say(t(
            `This token appears ${repeats.length} times (positions ${repeats.map(p => p + 1).join(', ')}). Same ID, so the same table row, but a different position vector each time, so each copy gets a different input vector.`,
            `هذا الرمز يظهر ${repeats.length} مرات (المواضع ${repeats.map(p => p + 1).join('، ')}). الرقم نفسه، إذن صف الجدول نفسه، لكن متجه موضع مختلف كل مرة، فيحصل كل ظهور على متجه إدخال مختلف.`))}</span>
            <span className="vx-repeat-pick">{repeats.filter(p => p !== pos).slice(0, 6).map(p => <button key={p} type="button" className="lx-link" onClick={() => onPick(p)}>
              {say(t(`Compare with position ${p + 1}`, `قارن بالموضع ${p + 1}`))}</button>)}</span></p>}
        </div>
      </li>
    </ol>

    <div className={`vx-sentence${spot === 6 ? ' spot' : ''}`}>
      <h3><Icon name="grid" size={17}/>{say(t('The whole text: a matrix, then one vector', 'النص كله: مصفوفة ثم متجه واحد'))}</h3>
      <p>{say(t(`Do steps 1 to 5 for every token and stack the results: ${format(tokens.length)} rows × ${DIMS} columns. This matrix is what the transformer actually reads. Click a row to select its token.`,
        `كرّر الخطوات من 1 إلى 5 لكل رمز وكدّس النتائج: ${format(tokens.length)} صفًا × ${DIMS} أعمدة. هذه المصفوفة هي ما يقرؤه المحوّل فعلًا. انقر صفًا لتختار رمزه.`))}</p>
      <div className="vx-matrix" data-testid="vx-matrix" role="table" aria-label={say(t('Input vectors of every token', 'متجهات الإدخال لكل الرموز'))}>
        <div className="vx-matrix-row head" role="row"><span role="columnheader">{say(t('Token', 'الرمز'))}</span>{dims.map(d => <span key={d} role="columnheader" dir="ltr">d{d + 1}</span>)}</div>
        {matrix.slice(0, shownRows).map((values, index) => {
          const item = tokens[index];
          return <div key={index} role="row" className={`vx-matrix-row${index === pos ? ' picked' : ''}`} onClick={() => onPick(index)}>
            <span role="rowheader"><code data-keep dir="auto">{item.piece !== null ? visiblePiece(item.piece) : '⟨…⟩'}</code></span>
            {values.map((value, d) => <span key={d} role="cell" dir="ltr" style={heat(value)} title={formatNumber(value)}/>)}
          </div>;
        })}
      </div>
      {tokens.length > shownRows && <small className="vx-note">{say(t(`Showing the first ${shownRows} of ${format(tokens.length)} rows. The average below uses all of them.`,
        `يظهر أول ${shownRows} صفًا من ${format(tokens.length)}. والمتوسط بالأسفل يستخدمها كلها.`))}</small>}

      <div className="vx-pool">
        <span className="vx-pool-arrow" aria-hidden="true"><Icon name="down" size={18}/></span>
        <p>{say(t('Average each column (mean pooling) to get one vector for the whole text. For column d1:', 'احسب متوسط كل عمود (التجميع بالمتوسط) لتحصل على متجه واحد للنص كله. للعمود d1:'))}</p>
        <p className="vx-formula" dir="ltr" data-testid="vx-average-sum">
          ({column.slice(0, 6).map(formatNumber).join(' ')}{column.length > 6 ? ' …' : ''}) ÷ {format(column.length)} = <b>{formatNumber(sentence[0])}</b></p>
      </div>
      <VecBars values={sentence} tone="#5ef2a0" label={say(t('Sentence vector', 'متجه الجملة'))} testId="vx-sentence-vector"/>
      <p className="vx-note">{say(t('Sentence-embedding models, like the ones RAG uses to search documents, also end with one vector per text, often by averaging. They average the vectors after the model’s layers have mixed in the meaning of the neighbours; here we average the input vectors to show the idea.',
        'نماذج تضمين الجمل، مثل التي يستخدمها RAG للبحث في المستندات، تنتهي أيضًا بمتجه واحد لكل نص، غالبًا بأخذ المتوسط. لكنها تأخذ المتوسط بعد أن تمزج طبقات النموذج معنى الكلمات المجاورة؛ وهنا نأخذ متوسط متجهات الإدخال لتوضيح الفكرة.'))}</p>
    </div>

    <aside className="vx-real">
      <b><Icon name="sparkles" size={15}/>{say(t('In a real model', 'في نموذج حقيقي'))}</b>
      <ul>
        <li>{say(t('The table is learned during training, starting from random numbers like these. After training, pieces used in similar ways end up with similar rows.', 'يُتعلَّم الجدول أثناء التدريب، بدءًا من أرقام عشوائية مثل هذه. وبعد التدريب، تحصل القطع التي تُستخدم بطرق متشابهة على صفوف متشابهة.'))}</li>
        <li>{say(t('Rows are much longer: Qwen2.5-0.5B uses 896 numbers per token and Llama 3 8B uses 4,096.', 'الصفوف أطول بكثير: يستخدم Qwen2.5-0.5B ‏896 رقمًا لكل رمز، ويستخدم Llama 3 8B ‏4,096 رقمًا.'))}</li>
        <li>{say(t('So the table is huge: about 200,000 rows × thousands of numbers. It is one of the largest single blocks of weights in the model.', 'لذا فالجدول ضخم: نحو 200,000 صف × آلاف الأرقام. وهو من أكبر كتل الأوزان في النموذج.'))}</li>
      </ul>
    </aside>
  </section>;
}
