/**
 * "What happens next: inside the Transformer", after the starting vectors.
 *
 *  1. Token cards: every token gets a Query, a Key and a Value from its current vector. Pick the token that
 *     is asking; its Query is compared with every Key (dot product ÷ √3, then softmax) and the Values are mixed in.
 *  2. Self-attention step by step (SelfAttention.tsx): GPT-style attention, how "it" finds "cat", and heads.
 *  3. Does position matter? The same words in a different order ask for different things.
 *  4. How a Transformer answers "What is the capital of Oman?": five steps, the answer built one token at a time.
 *  5. The weight workbook: the five kinds of learned numbers and where the model uses them.
 *  6. How layers work together: each layer has attention + feed-forward and its own weights.
 *
 * Token IDs are real o200k_base IDs (checked by tests/test_tokenizer.py). Query, Key and Value numbers are
 * small, hand-made illustrations: real models learn them and use hundreds of numbers each.
 */
import { useEffect, useMemo, useState } from 'react';
import './transformer.css';
import { Icon } from './ui';
import type { IconName } from './ui';
import { t, useTx } from './FineTuneScenes';
import type { Text } from './FineTuneScenes';
import { visiblePiece } from './tokenizer';
import { SelfAttention } from './SelfAttention';

type Card = { id: number; piece: string; q: number[]; k: number[]; v: number[] };

/** "The ship reached the port." with real IDs and illustrative Query / Key / Value numbers. */
export const SHIP_SENTENCE = [[976, 'The'], [12407, ' ship'], [15237, ' reached'], [290, ' the'], [3135, ' port'], [13, '.']];
const QKV: [number[], number[], number[]][] = [
  [[1.2, 0.2, -0.3], [0.2, 0.1, -0.4], [0.1, 0.0, 0.1]],
  [[0.2, 0.4, 1.3], [1.9, 0.3, 0.2], [0.9, -0.2, 0.3]],
  [[1.0, 1.0, 0.1], [0.3, 0.9, 1.6], [0.1, 0.6, 0.8]],
  [[0.2, 1.3, -0.2], [0.1, 0.4, -0.4], [0.0, 0.1, 0.0]],
  [[1.4, 0.2, 0.9], [0.4, 1.8, 0.3], [0.2, 0.9, 0.1]],
  [[0.1, 0.3, 1.1], [-0.3, -0.2, 0.1], [0.0, 0.0, 0.2]],
];
const CARDS: Card[] = SHIP_SENTENCE.map(([id, piece], i) => ({ id: id as number, piece: piece as string, q: QKV[i][0], k: QKV[i][1], v: QKV[i][2] }));
const PORT = 4, SHIP = 1;

/** The question and the answer, as real o200k_base tokens. " Muscat" is two tokens. */
export const OMAN_QUESTION = [[4827, 'What'], [382, ' is'], [290, ' the'], [9029, ' capital'], [328, ' of'], [126197, ' Oman'], [30, '?']];
export const OMAN_ANSWER = [[976, 'The'], [9029, ' capital'], [328, ' of'], [126197, ' Oman'], [382, ' is'], [6619, ' Mus'], [8837, 'cat'], [13, '.']];

const dot = (a: number[], b: number[]) => a.reduce((sum, value, d) => sum + value * b[d], 0);
const fmt = (value: number) => (value < 0 ? '−' : '') + Math.abs(value).toFixed(1);
const fmt2 = (value: number) => (value < 0 ? '−' : '') + Math.abs(value).toFixed(2);

/** Attention of one asking token over every token: scores = Q·K ÷ √3, weights = softmax(scores). */
export function attend(asker: number) {
  const scores = CARDS.map(card => dot(CARDS[asker].q, card.k) / Math.sqrt(3));
  const top = Math.max(...scores);
  const exps = scores.map(score => Math.exp(score - top));
  const total = exps.reduce((a, b) => a + b, 0);
  const weights = exps.map(value => value / total);
  const mixed = [0, 1, 2].map(d => CARDS.reduce((sum, card, i) => sum + weights[i] * card.v[d], 0));
  return { scores, weights, mixed };
}

const show = (piece: string) => visiblePiece(piece);
const label = (piece: string) => piece.trim().toUpperCase();

/** Why each asking token's strongest match makes sense (illustrative story for one attention head). */
const WHY: Text[] = [
  t('“The” looks for the noun it introduces: “ship”.', '‏«The» تبحث عن الاسم الذي تسبقه: «ship».'),
  t('“ship” looks for what the ship did: “reached”.', '‏«ship» تبحث عمّا فعلته السفينة: «reached».'),
  t('“reached” looks for who arrived and where: “ship” and “port”.', '‏«reached» تبحث عمّن وصل وإلى أين: «ship» و«port».'),
  t('The second “the” looks for its noun: “port”.', '‏«the» الثانية تبحث عن اسمها: «port».'),
  t('“port” looks for clues about what kind of port: “ship” matches best, so this port is a harbor.', '‏«port» تبحث عن دلائل على نوع الميناء: «ship» هي الأنسب، إذن فهو مرفأ للسفن.'),
  t('“.” looks for the main event of the sentence: “reached”.', '‏«.» تبحث عن الحدث الرئيسي في الجملة: «reached».'),
];

function Nums({ values, tone }: { values: number[]; tone: string }) {
  return <span className={`trf-nums trf-c${tone}`} dir="ltr">{values.map((value, d) => <i key={d}>{fmt(value)}</i>)}</span>;
}

function TokenCard({ index, role }: { index: number; role: 'asker' | 'source' }) {
  const say = useTx();
  const card = CARDS[index];
  return <div className={`trf-card ${role}`} data-testid={`trf-card-${role}`}>
    <b className="trf-card-name" data-keep>{label(card.piece)}</b>
    <small className="trf-card-role">{role === 'asker' ? say(t('asking (its Query is used)', 'يسأل (يُستخدم استعلامه)')) : say(t('answering (its Key and Value are used)', 'يجيب (يُستخدم مفتاحه وقيمته)'))}</small>
    <dl>
      <dt>{say(t('Token text', 'نص الرمز'))}</dt><dd><code data-keep>{show(card.piece)}</code></dd>
      <dt>{say(t('Position', 'الموضع'))}</dt><dd dir="ltr">{index + 1}</dd>
      <dt>{say(t('Token ID', 'رقم الرمز'))}</dt><dd dir="ltr">{card.id}</dd>
    </dl>
    <span className="trf-derived">{say(t('Derived from its current vector', 'مشتقّة من متجهه الحالي'))}</span>
    <div className="trf-qkv">
      <span className={role === 'asker' ? 'use' : ''}><small>{say(t('Query (Q)', 'الاستعلام (Q)'))}</small><Nums values={card.q} tone="q"/></span>
      <span className={role === 'source' ? 'use' : ''}><small>{say(t('Key (K)', 'المفتاح (K)'))}</small><Nums values={card.k} tone="k"/></span>
      <span className={role === 'source' ? 'use' : ''}><small>{say(t('Value (V)', 'القيمة (V)'))}</small><Nums values={card.v} tone="v"/></span>
    </div>
  </div>;
}

/** 1. Token cards share clues. */
function TokenCards() {
  const say = useTx();
  const [asker, setAsker] = useState(PORT);
  const [source, setSource] = useState(SHIP);
  const { scores, weights, mixed } = useMemo(() => attend(asker), [asker]);
  const best = weights.indexOf(Math.max(...weights));
  // When a new token asks, show its strongest match with another token first.
  const pickAsker = (index: number) => {
    const shares = attend(index).weights.map((weight, i) => i === index ? -1 : weight);
    setAsker(index);
    setSource(shares.indexOf(Math.max(...shares)));
  };
  const a = CARDS[asker], s = CARDS[source];

  return <div className="trf-panel" data-testid="trf-cards">
    <b className="trf-panel-title"><span className="trf-n">1</span>{say(t('Each token gets a Query, a Key and a Value', 'كل رمز يأخذ استعلامًا ومفتاحًا وقيمة'))}</b>
    <p className="trf-text">{say(t('Think of every token as a card. Each card holds its text, its position and its current vector. From that vector the model calculates three smaller vectors: the Query looks for clues, the Key helps match, and the Value carries a clue that can be shared.',
      'تخيّل كل رمز بطاقة. تحمل كل بطاقة نصّه وموضعه ومتجهه الحالي. ومن ذلك المتجه يحسب النموذج ثلاثة متجهات أصغر: الاستعلام يبحث عن دلائل، والمفتاح يساعد على المطابقة، والقيمة تحمل دليلًا يمكن مشاركته.'))}</p>
    <div className="trf-legend"><span className="trf-cq">{say(t('Query looks for clues', 'الاستعلام يبحث عن دلائل'))}</span><span className="trf-ck">{say(t('Key helps match', 'المفتاح يساعد على المطابقة'))}</span><span className="trf-cv">{say(t('Value carries a clue', 'القيمة تحمل دليلًا'))}</span></div>

    <div className="trf-tickets" dir="ltr" role="group" aria-label={say(t('Pick the token that is asking', 'اختر الرمز الذي يسأل'))}>
      {CARDS.map((card, i) => <button key={i} type="button" className={`trf-ticket${i === asker ? ' asker' : ''}${i === source && i !== asker ? ' source' : ''}`}
        onClick={() => pickAsker(i)} aria-pressed={i === asker} data-testid={`trf-ticket-${i}`}>
        <code data-keep>{show(card.piece)}</code><small>{i + 1}</small>
      </button>)}
    </div>
    <p className="trf-hint"><Icon name="target" size={13}/>{say(t('Click a token to make it the one asking. Click a bar below to see the match with that token.', 'انقر رمزًا ليصبح هو السائل. وانقر شريطًا بالأسفل لترى المطابقة مع ذلك الرمز.'))}</p>

    <div className="trf-pair">
      <TokenCard index={source} role="source"/>
      <div className="trf-links" aria-hidden="true">
        <span className="trf-link dotted">{say(t('Compare Query and Key', 'قارن الاستعلام بالمفتاح'))}</span>
        <span className="trf-link solid">{say(t('Share a clue (Value)', 'شارك دليلًا (القيمة)'))}</span>
      </div>
      <TokenCard index={asker} role="asker"/>
    </div>

    <div className="trf-math" dir="ltr" data-testid="trf-math">
      <span>Q<sub data-keep>{label(a.piece)}</sub> · K<sub data-keep>{label(s.piece)}</sub> = {a.q.map((value, d) => `${fmt(value)}×${fmt(s.k[d])}`).join(' + ')} = <b>{fmt2(dot(a.q, s.k))}</b></span>
      <span>÷ √3 = <b>{fmt2(scores[source])}</b> → softmax → <b className="trf-share">{Math.round(weights[source] * 100)}%</b></span>
    </div>

    <div className="trf-weights" data-testid="trf-weights">
      <small>{say(t(`How much of each token’s Value “${a.piece.trim()}” takes`, `كم يأخذ «${a.piece.trim()}» من قيمة كل رمز`))}</small>
      {CARDS.map((card, i) => <button key={i} type="button" className={`trf-wrow${i === source ? ' on' : ''}${i === best ? ' best' : ''}`} onClick={() => setSource(i)}>
        <code data-keep dir="ltr">{show(card.piece)}</code>
        <span className="trf-wbar"><i style={{ width: `${weights[i] * 100}%` }}/></span>
        <b dir="ltr">{Math.round(weights[i] * 100)}%</b>
      </button>)}
    </div>
    <p className="trf-why"><Icon name="bulb" size={15}/><span>{say(WHY[asker])}</span></p>
    <p className="trf-text">{say(t(`The Values, mixed by these shares, give “${a.piece.trim()}” a clue of [${mixed.map(fmt2).join(', ')}]. It is added to its vector, so the next layer works with an updated “${a.piece.trim()}” that knows about its neighbours.`,
      `القيم ممزوجة بهذه النسب تعطي «${a.piece.trim()}» دليلًا قدره [${mixed.map(fmt2).join('، ')}]. يُضاف إلى متجهه، فتعمل الطبقة التالية على «${a.piece.trim()}» محدَّث يعرف جيرانه.`))}</p>
    <small className="trf-note">{say(t('Positions (1–6) say where a token sits; they are separate from the token IDs the tokenizer assigns. The IDs are real; the Query, Key and Value numbers are made up to show the idea. Real models learn them and use many attention heads, each looking for different clues. This is encoder-style attention, where every token can look at every other one; GPT-style models let each token look only at the tokens before it.',
      'المواضع (1–6) تقول أين يقع الرمز، وهي غير أرقام الرموز التي يعطيها المُرمِّز. الأرقام حقيقية، أما أرقام الاستعلام والمفتاح والقيمة فمُختلَقة لتوضيح الفكرة. النماذج الحقيقية تتعلّمها وتستخدم رؤوس انتباه كثيرة، يبحث كل منها عن دلائل مختلفة. وهذا انتباه بأسلوب المُشفِّر، حيث يستطيع كل رمز النظر إلى كل الرموز الأخرى؛ أما نماذج GPT فتسمح لكل رمز بالنظر إلى ما قبله فقط.'))}</small>
  </div>;
}

/** 2. Does position matter? */
function PositionMatters() {
  const say = useTx();
  return <div className="trf-panel" data-testid="trf-position">
    <b className="trf-panel-title"><span className="trf-n">3</span>{say(t('Does position matter? Yes', 'هل الموضع مهم؟ نعم'))}</b>
    <div className="trf-compare">
      <div><code data-keep dir="ltr">What is the capital of Oman?</code><span>{say(t('asks for a city', 'تسأل عن مدينة'))}</span></div>
      <div><code data-keep dir="ltr">Oman is the capital of what?</code><span>{say(t('asks for whatever Oman is the capital of', 'تسأل عمّا تكون عُمان عاصمته'))}</span></div>
    </div>
    <p className="trf-text">{say(t('Almost the same words, but their order changes their roles. In the original Transformer a position vector is added to each token’s starting vector (you saw it above), so attention can use both what a token is and where it sits.',
      'الكلمات نفسها تقريبًا، لكن ترتيبها يغيّر أدوارها. في المحوّل الأصلي يُضاف متجه موضع إلى المتجه الابتدائي لكل رمز (رأيته في الأعلى)، فيستطيع الانتباه استخدام ماهية الرمز ومكانه معًا.'))}</p>
  </div>;
}

/** 3. How a Transformer answers a question. */
function AnswerQuestion() {
  const say = useTx();
  const [shown, setShown] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    if (shown >= OMAN_ANSWER.length) { setPlaying(false); return; }
    const timer = window.setTimeout(() => setShown(shown + 1), 650);
    return () => window.clearTimeout(timer);
  }, [playing, shown]);
  const question = OMAN_QUESTION.map(([id, piece]) => ({ id: id as number, piece: piece as string }));
  const answer = OMAN_ANSWER.map(([id, piece]) => ({ id: id as number, piece: piece as string }));
  const steps: [Text, Text][] = [
    [t('Tokenize', 'قطّع إلى رموز'), t('The tokenizer cuts the question into tokens and gives each one its ID.', 'يقطّع المُرمِّز السؤال إلى رموز ويعطي كلًّا منها رقمه.')],
    [t('Look up embeddings', 'ابحث في جدول التضمين'), t('Each ID selects one row of the embedding table: its starting vector.', 'كل رقم يختار صفًا واحدًا من جدول التضمين: متجهه الابتدائي.')],
    [t('Add position', 'أضف الموضع'), t('Position information tells the model where each token sits.', 'معلومات الموضع تخبر النموذج أين يقع كل رمز.')],
    [t('Share clues (attention + feed-forward)', 'تبادل الدلائل (الانتباه + التغذية الأمامية)'), t('Across many layers, attention lets tokens pick up clues from one another, such as the link between “capital” and “Oman”. The feed-forward network then refines each vector.', 'عبر طبقات كثيرة، يتيح الانتباه للرموز التقاط دلائل من بعضها، مثل الصلة بين «capital» و«Oman». ثم تحسّن شبكة التغذية الأمامية كل متجه.')],
    [t('Predict the next token', 'تنبّأ بالرمز التالي'), t('The output weights score every token in the vocabulary. The model picks one, adds it to the text, and repeats.', 'أوزان الإخراج تعطي درجة لكل رمز في المفردات. يختار النموذج واحدًا، ويضيفه إلى النص، ويكرّر.')],
  ];
  return <div className="trf-panel" data-testid="trf-answer">
    <b className="trf-panel-title"><span className="trf-n">4</span>{say(t('How a Transformer answers a question', 'كيف يجيب المحوّل عن سؤال'))}</b>
    <p className="trf-question" dir="ltr">{question.map((item, i) => <span key={i} className={item.id === 9029 || item.id === 126197 ? 'hit' : ''}>
      <code data-keep>{show(item.piece)}</code><small>{item.id}</small></span>)}</p>
    <ol className="trf-steps">
      {steps.map(([name, body], i) => <li key={i}><span className="trf-n">{i + 1}</span><b>{say(name)}</b><p>{say(body)}</p></li>)}
    </ol>

    <div className="trf-head-demo">
      <b>{say(t('How does it link “capital” and “Oman”? One attention head might work like this:', 'كيف يربط «capital» بـ«Oman»؟ قد يعمل رأس انتباه واحد هكذا:'))}</b>
      <ol>
        <li><span className="trf-cq">{say(t('Query', 'الاستعلام'))}</span>{say(t('CAPITAL’s Query is like asking: “Which country are we talking about?”', 'استعلام CAPITAL يشبه السؤال: «عن أي بلد نتحدث؟»'))}</li>
        <li><span className="trf-ck">{say(t('Key', 'المفتاح'))}</span>{say(t('That Query is compared with the Key on every token card. OMAN’s Key is a strong match, so it gets a high attention weight.', 'يُقارَن ذلك الاستعلام بالمفتاح على بطاقة كل رمز. مفتاح OMAN مطابق بقوة، فيأخذ وزن انتباه عاليًا.'))}</li>
        <li><span className="trf-cv">{say(t('Value', 'القيمة'))}</span>{say(t('OMAN’s Value then adds information to CAPITAL’s updated vector, which now carries a clue about whose capital the question asks for.', 'ثم تضيف قيمة OMAN معلومات إلى متجه CAPITAL المحدَّث، فيحمل الآن دليلًا على عاصمة أي بلد يسأل عنها السؤال.'))}</li>
      </ol>
      <small className="trf-note">{say(t('The cards only contain numbers. The questions above are a way to explain what those numbers can do. What a head looks for depends on what it learned in training.', 'البطاقات لا تحوي إلا أرقامًا. والأسئلة أعلاه طريقة لشرح ما تستطيع تلك الأرقام فعله. وما يبحث عنه الرأس يعتمد على ما تعلّمه في التدريب.'))}</small>
    </div>

    <div className="trf-gen" data-testid="trf-gen">
      <div className="trf-gen-head">
        <b>{say(t('Step 5, repeated: the answer is built one token at a time', 'الخطوة 5 مكرّرة: تُبنى الإجابة رمزًا رمزًا'))}</b>
        <button type="button" className="button small primary" data-testid="trf-gen-play" onClick={() => { if (shown >= answer.length) setShown(0); setPlaying(!playing); }}>
          <Icon name={playing ? 'pause' : shown >= answer.length ? 'refresh' : 'play'} size={14}/>
          {playing ? say(t('Pause', 'أوقف مؤقتًا')) : shown >= answer.length ? say(t('Again', 'مرة أخرى')) : say(t('Generate', 'ولّد'))}</button>
        <button type="button" className="button small" disabled={playing || shown >= answer.length} onClick={() => setShown(shown + 1)}>
          <Icon name="next" size={14}/>{say(t('One token', 'رمز واحد'))}</button>
      </div>
      <p className="trf-gen-line" dir="ltr">
        {answer.slice(0, shown).map((item, i) => <span key={i} className={`trf-gen-tok${i === shown - 1 ? ' new' : ''}`}><code data-keep>{show(item.piece)}</code><small>{item.id}</small></span>)}
        {shown < answer.length && <span className="trf-gen-next" aria-hidden="true">?</span>}
      </p>
      <p className="trf-note" data-testid="trf-gen-note">{shown === 0
        ? say(t('Press Generate. Each time, the model reads the question plus the answer so far and predicts one more token.', 'اضغط «ولّد». في كل مرة يقرأ النموذج السؤال والإجابة حتى الآن ويتنبّأ برمز واحد إضافي.'))
        : shown >= answer.length
          ? say(t('Done: 8 tokens. Notice that “Muscat” needed two tokens, “ Mus” and “cat”, so the model predicted it in two steps.', 'انتهى: 8 رموز. لاحظ أن «Muscat» احتاجت رمزين، « Mus» و«cat»، فتنبّأ بها النموذج على خطوتين.'))
          : say(t(`Step ${shown}: the model predicted “${answer[shown - 1].piece}” (ID ${answer[shown - 1].id}) and added it to the text.`, `الخطوة ${shown}: تنبّأ النموذج بـ«${answer[shown - 1].piece}» (الرقم ${answer[shown - 1].id}) وأضافه إلى النص.`))}</p>
    </div>
    <small className="trf-note">{say(t('The original Transformer has an encoder that reads the question and a decoder that writes the answer. GPT-style models such as GPT-4o use one decoder stack for both, but the steps are the same. The order of the calculations comes from the model’s design; the numbers they use come from its learned weights.',
      'للمحوّل الأصلي مُشفِّر يقرأ السؤال ومُفكِّك يكتب الإجابة. أما نماذج GPT مثل GPT-4o فتستخدم كومة مُفكِّك واحدة للاثنين، لكن الخطوات نفسها. ترتيب الحسابات يأتي من تصميم النموذج، والأرقام التي تستخدمها تأتي من أوزانه المتعلَّمة.'))}</small>
  </div>;
}

/** 4. The Transformer's weight workbook. */
const SHEETS: { name: Text; job: Text; where: number; icon: IconName }[] = [
  { name: t('Embedding table', 'جدول التضمين'), job: t('Gives each token its starting list of numbers. The token ID tells the model which row to read.', 'يعطي كل رمز قائمة أرقامه الابتدائية. ورقم الرمز يخبر النموذج أي صف يقرأ.'), where: 0, icon: 'grid' },
  { name: t('Attention weights', 'أوزان الانتباه'), job: t('Help tokens share clues. In “The ship reached the port”, ship helps port mean a harbor.', 'تساعد الرموز على تبادل الدلائل. في «The ship reached the port» تساعد ship كلمة port على أن تعني مرفأً.'), where: 1, icon: 'network' },
  { name: t('Feed-forward weights (MLP)', 'أوزان التغذية الأمامية (MLP)'), job: t('Help each token make use of the clues it picked up.', 'تساعد كل رمز على الاستفادة من الدلائل التي التقطها.'), where: 2, icon: 'chip' },
  { name: t('Normalization weights', 'أوزان التطبيع'), job: t('Keep the numbers at a useful scale as they move through the model.', 'تُبقي الأرقام بمقياس مفيد أثناء مرورها عبر النموذج.'), where: 3, icon: 'sliders' },
  { name: t('Output weights', 'أوزان الإخراج'), job: t('Score which token could come next.', 'تعطي درجة لكل رمز قد يأتي بعد ذلك.'), where: 4, icon: 'chart' },
];
const ROUTE: Text[] = [t('Look up embeddings', 'البحث في التضمين'), t('Attention', 'الانتباه'), t('Feed-forward', 'التغذية الأمامية'), t('Normalize', 'التطبيع'), t('Score next token', 'تقييم الرمز التالي')];

function Workbook() {
  const say = useTx();
  const [sheet, setSheet] = useState(1);
  return <div className="trf-panel" data-testid="trf-workbook">
    <b className="trf-panel-title"><span className="trf-n">5</span>{say(t('The Transformer’s weight workbook', 'دفتر أوزان المحوّل'))}</b>
    <p className="trf-text">{say(t('The model’s weight files are like a workbook (think of a spreadsheet file) full of learned numbers, with different sheets for different jobs. Click a sheet to see where the model uses it.',
      'ملفات أوزان النموذج تشبه دفتر عمل (تخيّل ملف جدول بيانات) مليئًا بالأرقام المتعلَّمة، فيه أوراق مختلفة لمهام مختلفة. انقر ورقة لترى أين يستخدمها النموذج.'))}</p>
    <div className="trf-book">
      <div className="trf-sheets" role="tablist">
        {SHEETS.map((item, i) => <button key={i} type="button" role="tab" aria-selected={i === sheet} className={i === sheet ? 'on' : ''} onClick={() => setSheet(i)} data-testid={`trf-sheet-${i}`}>
          <Icon name={item.icon} size={15}/>{say(item.name)}</button>)}
      </div>
      <div className="trf-sheet-body" role="tabpanel">
        <p><b>{say(SHEETS[sheet].name)}:</b> {say(SHEETS[sheet].job)}</p>
        <ol className="trf-route">
          {ROUTE.map((step, i) => <li key={i} className={i === SHEETS[sheet].where || (sheet === 3 && (i === 1 || i === 2)) ? 'on' : ''}>
            {i >= 1 && i <= 3 && <small>{say(t('every layer', 'كل طبقة'))}</small>}{say(step)}</li>)}
        </ol>
      </div>
    </div>
    <p className="trf-banner">{say(t('The model design sets the order. The workbook supplies the weights.', 'تصميم النموذج يحدّد الترتيب. والدفتر يوفّر الأوزان.'))}</p>
    <small className="trf-note">{say(t('A simplified picture: real models keep separate attention, feed-forward and normalization weights for every layer, and normalization is applied around attention and feed-forward rather than as one separate step.',
      'صورة مبسّطة: النماذج الحقيقية تحتفظ بأوزان انتباه وتغذية أمامية وتطبيع منفصلة لكل طبقة، والتطبيع يُطبَّق حول الانتباه والتغذية الأمامية لا كخطوة واحدة منفصلة.'))}</small>
  </div>;
}

/** 5. How layers work together. */
const LAYER_PORT: Text[] = [
  t('port: just the word (starting vector)', 'port: الكلمة فقط (المتجه الابتدائي)'),
  t('port + a clue from “ship”: something to do with ships', 'port + دليل من «ship»: شيء له علاقة بالسفن'),
  t('port: the place the ship reached', 'port: المكان الذي وصلته السفينة'),
  t('port: a harbor, where the ship arrived', 'port: مرفأ، وصلت إليه السفينة'),
];
const LAYER_ROWS: [Text, Text][] = [
  [t('Earlier', 'المبكرة'), t('Clues about nearby words and short phrases, like “the ship”.', 'دلائل عن الكلمات القريبة والعبارات القصيرة، مثل «the ship».')],
  [t('Middle', 'الوسطى'), t('Relationships across the sentence, like “the ship reached a place”.', 'علاقات عبر الجملة، مثل «السفينة وصلت إلى مكان».')],
  [t('Later', 'المتأخرة'), t('A more refined picture of the event, including that “port” means a harbor here.', 'صورة أدق للحدث، بما فيها أن «port» تعني مرفأً هنا.')],
];

function Layers() {
  const say = useTx();
  const [layer, setLayer] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    if (layer >= 3) { setPlaying(false); return; }
    const timer = window.setTimeout(() => setLayer(layer + 1), 1300);
    return () => window.clearTimeout(timer);
  }, [playing, layer]);
  const colours = ['teal', 'gold', 'violet'];
  return <div className="trf-panel" data-testid="trf-layers">
    <b className="trf-panel-title"><span className="trf-n">6</span>{say(t('How Transformer layers work together', 'كيف تعمل طبقات المحوّل معًا'))}</b>
    <p className="trf-text">{say(t('Each layer is like a workshop station with the same two tools: attention, which lets each token pick up clues from other tokens, and a feed-forward network (MLP), which then processes each token’s vector on its own. Every station has its own learned weights and receives the vectors the station before it updated.',
      'كل طبقة تشبه محطة ورشة فيها الأداتان نفسهما: الانتباه، الذي يتيح لكل رمز التقاط دلائل من الرموز الأخرى، وشبكة التغذية الأمامية (MLP)، التي تعالج متجه كل رمز وحده بعد ذلك. لكل محطة أوزانها المتعلَّمة، وتستقبل المتجهات التي حدّثتها المحطة التي قبلها.'))}</p>
    <div className="trf-gen-head">
      <button type="button" className="button small primary" data-testid="trf-layers-play" onClick={() => { if (layer >= 3) setLayer(0); setPlaying(!playing); }}>
        <Icon name={playing ? 'pause' : layer >= 3 ? 'refresh' : 'play'} size={14}/>{playing ? say(t('Pause', 'أوقف مؤقتًا')) : layer >= 3 ? say(t('Again', 'مرة أخرى')) : say(t('Send the vectors through', 'مرّر المتجهات'))}</button>
      <span className="trf-sentence" dir="ltr" data-keep>The <mark data-keep>ship</mark> reached the <mark data-keep>port</mark>.</span>
    </div>
    <div className="trf-stations" dir="ltr">
      <div className={`trf-end${layer === 0 ? ' on' : ''}`}><b>{say(t('Starting vectors', 'المتجهات الابتدائية'))}</b>{CARDS.map((card, i) => <code key={i} data-keep>{show(card.piece)}</code>)}</div>
      {colours.map((colour, i) => <div key={i} className={`trf-station ${colour}${layer === i + 1 ? ' on' : ''}${layer > i + 1 ? ' done' : ''}`} data-testid={`trf-station-${i + 1}`}>
        <b>{say(t(`Layer ${i + 1}`, `الطبقة ${i + 1}`))}</b>
        <div className="trf-tools"><span>{say(t('Attention', 'الانتباه'))}</span><Icon name="arrow" size={12}/><span>{say(t('Feed-forward', 'التغذية الأمامية'))}</span></div>
        <div className="trf-clip"><Icon name="file" size={13}/>{say(t(`Layer ${i + 1} weights`, `أوزان الطبقة ${i + 1}`))}</div>
      </div>)}
      <div className={`trf-end${layer === 3 ? ' on' : ''}`}><b>{say(t('Context-aware vectors', 'متجهات مدركة للسياق'))}</b>{CARDS.map((card, i) => <code key={i} data-keep className={layer === 3 && i === PORT ? 'hit' : ''}>{show(card.piece)}</code>)}</div>
    </div>
    <p className="trf-port" data-testid="trf-port"><Icon name="sparkles" size={15}/>{say(LAYER_PORT[layer])}</p>
    <table className="trf-table">
      <thead><tr><th>{say(t('Layers', 'الطبقات'))}</th><th>{say(t('What they often pick up', 'ما تلتقطه غالبًا'))}</th></tr></thead>
      <tbody>{LAYER_ROWS.map(([name, body], i) => <tr key={i}><td>{say(name)}</td><td>{say(body)}</td></tr>)}</tbody>
    </table>
    <p className="trf-text">{say(t('Each layer’s output can differ for two reasons: it receives updated vectors from the previous layer, and it has its own learned weights. Think of two stations with the same kind of machine but different settings. Training adjusts those settings, so different layers learn to pick up different kinds of clues.',
      'قد يختلف ناتج كل طبقة لسببين: تستقبل متجهات محدَّثة من الطبقة السابقة، ولها أوزانها المتعلَّمة الخاصة. تخيّل محطتين فيهما النوع نفسه من الآلات لكن بإعدادات مختلفة. والتدريب يضبط تلك الإعدادات، فتتعلّم الطبقات المختلفة التقاط أنواع مختلفة من الدلائل.'))}</p>
    <small className="trf-note">{say(t('Three layers are shown to illustrate how the process repeats; real models have dozens. The table describes tendencies researchers have observed, not fixed rules.',
      'تظهر ثلاث طبقات لتوضيح كيف تتكرّر العملية؛ والنماذج الحقيقية فيها عشرات. والجدول يصف ميولًا لاحظها الباحثون، لا قواعد ثابتة.'))}</small>
  </div>;
}

export function TransformerStory() {
  const say = useTx();
  return <section className="trf-story" aria-labelledby="trf-title" data-testid="trf-story">
    <header>
      <span className="eyebrow">{say(t('After the starting vectors', 'بعد المتجهات الابتدائية'))}</span>
      <h3 id="trf-title"><Icon name="layers" size={18}/>{say(t('What happens next: tokens share clues inside the Transformer', 'ماذا يحدث بعد ذلك: الرموز تتبادل الدلائل داخل المحوّل'))}</h3>
      <p>{say(t('Each word helps shape the meaning of the sentence, and the sentence helps shape the meaning of each word. In “The ship reached the port”, ship gives port a clue that it means a harbor; “the” and “reached” show that ship is a vessel doing something; and reached tells us what happened: the vessel arrived at the harbor. Each token starts with its learned vector; in every layer it picks up clues from the other tokens, and the next layer works with the updated vectors.',
        'كل كلمة تساعد في تشكيل معنى الجملة، والجملة تساعد في تشكيل معنى كل كلمة. في «The ship reached the port» تعطي ship كلمة port دليلًا على أنها مرفأ؛ و«the» و«reached» تبيّنان أن ship سفينة تفعل شيئًا؛ و reached تخبرنا بما حدث: وصلت السفينة إلى المرفأ. يبدأ كل رمز بمتجهه المتعلَّم، وفي كل طبقة يلتقط دلائل من الرموز الأخرى، وتعمل الطبقة التالية على المتجهات المحدَّثة.'))}</p>
    </header>
    <TokenCards/>
    <SelfAttention/>
    <PositionMatters/>
    <AnswerQuestion/>
    <Workbook/>
    <Layers/>
  </section>;
}
