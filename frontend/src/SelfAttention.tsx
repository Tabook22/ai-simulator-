/**
 * "Self-attention, step by step": how “it” finds “cat” in “The cat sat on the mat because it was
 * tired.” GPT-style (causal) attention: each token compares its Query with the Keys of the tokens
 * before it and itself, softmax turns the scores into weights that add up to 1, and the weighted sum
 * of the Values is added to the token's representation. Several heads learn different patterns.
 *
 * Token IDs are real o200k_base IDs (tests/test_tokenizer.py). The scores and weights are
 * illustrative: a real model learns them.
 * Based on the explanation by Data Science Foundry (Instagram reel, 2026).
 */
import { useMemo, useState } from 'react';
import { Icon } from './ui';
import type { IconName } from './ui';
import { t, useTx } from './FineTuneScenes';
import type { Text } from './FineTuneScenes';
import { visiblePiece } from './tokenizer';
import './self-attention.css';

export const CAT_SENTENCE = [[976, 'The'], [9059, ' cat'], [10139, ' sat'], [402, ' on'], [290, ' the'], [2450, ' mat'], [2236, ' because'], [480, ' it'], [673, ' was'], [25920, ' tired'], [13, '.']];
const WORDS = CAT_SENTENCE.map(([, piece]) => piece as string);
const IT = 7, CAT = 1;
export const SOURCE_URL = 'https://www.instagram.com/reel/DetrQtNBVX-/';

type HeadKey = 'refers' | 'previous' | 'broad';
/** Illustrative score boosts: [query token, key token, boost]. Every other pair scores 0, a token with itself 0.5. */
const LINKS: Record<HeadKey, [number, number, number][]> = {
  refers: [[1, 0, 1.5], [2, 1, 2.6], [3, 2, 2], [4, 3, 1], [5, 4, 2.2], [5, 3, 1], [6, 2, 2], [7, 1, 3.1], [7, 5, 1.2], [8, 7, 2.4], [8, 1, 1.4], [9, 7, 2], [9, 1, 2], [10, 2, 1.4], [10, 9, 1.4]],
  previous: Array.from({ length: 10 }, (_, i) => [i + 1, i, 3] as [number, number, number]),
  broad: Array.from({ length: 11 }, (_, i) => [i, 0, 1.6] as [number, number, number]),
};
const HEADS: { key: HeadKey; name: Text; text: Text }[] = [
  { key: 'refers', name: t('Head 1 · what refers to what', 'الرأس 1 · ما الذي يشير إلى ماذا'), text: t('Pronouns and verbs look back to the thing they are about: “it” → “cat”, “sat” → “cat”.', 'الضمائر والأفعال تنظر إلى ما تتحدث عنه: «it» ← «cat»، و«sat» ← «cat».') },
  { key: 'previous', name: t('Head 2 · the word just before', 'الرأس 2 · الكلمة السابقة مباشرة'), text: t('Each token looks mostly at its neighbour, which helps with phrases such as “the mat”.', 'كل رمز ينظر غالبًا إلى جاره، وهذا يساعد في عبارات مثل «the mat».') },
  { key: 'broad', name: t('Head 3 · the whole sentence so far', 'الرأس 3 · الجملة كلها حتى الآن'), text: t('Attention is spread widely, gathering a general sense of the sentence, with extra weight on the first token.', 'الانتباه موزَّع على نطاق واسع، فيجمع إحساسًا عامًا بالجملة، مع وزن إضافي للرمز الأول.') },
];

/** Scores and softmax weights for one query token: only itself and the tokens before it. */
export function causalRow(head: HeadKey, query: number) {
  const scores = WORDS.map((_, key) => key > query ? null : (key === query ? 0.5 : 0) + LINKS[head].filter(([q, k]) => q === query && k === key).reduce((sum, [, , boost]) => sum + boost, 0));
  const seen = scores.filter((score): score is number => score !== null);
  const top = Math.max(...seen);
  const exps = scores.map(score => score === null ? 0 : Math.exp(score - top));
  const total = exps.reduce((a, b) => a + b, 0);
  return { scores, weights: exps.map(value => value / total) };
}

const STEPS: { icon: IconName; name: Text; text: Text }[] = [
  { icon: 'grid', name: t('Query, Key and Value', 'الاستعلام والمفتاح والقيمة'),
    text: t('Each token’s vector is multiplied by three learned weight matrices to give a Query (what the token is looking for), a Key (what it can be matched on) and a Value (the information it can pass along). The Query of “it” might be looking for the thing it refers to.',
      'يُضرب متجه كل رمز في ثلاث مصفوفات أوزان متعلَّمة، فينتج استعلام (ما يبحث عنه الرمز)، ومفتاح (ما يمكن مطابقته عليه)، وقيمة (المعلومة التي يمكنه تمريرها). وقد يبحث استعلام «it» عن الشيء الذي يشير إليه.') },
  { icon: 'target', name: t('Compare Query with Keys', 'قارن الاستعلام بالمفاتيح'),
    text: t('The Query of “it” is compared with the Keys of the tokens before it, including its own, using a dot product. A stronger match gives a higher score. Tokens after “it” are not visible yet.',
      'يُقارَن استعلام «it» بمفاتيح الرموز التي قبله، ومنها مفتاحه هو، باستخدام الضرب النقطي. والمطابقة الأقوى تعطي درجة أعلى. أما الرموز التي بعد «it» فلا تُرى بعد.') },
  { icon: 'chart', name: t('Softmax: weights that add up to 1', 'Softmax: أوزان مجموعها 1'),
    text: t('The scores pass through softmax and become weights that add up to 1. Here “cat” gets a high weight and most other tokens get much smaller ones.',
      'تمرّ الدرجات عبر softmax فتصبح أوزانًا مجموعها 1. وهنا يحصل «cat» على وزن عالٍ، وتحصل معظم الرموز الأخرى على أوزان أصغر بكثير.') },
  { icon: 'plus', name: t('Weighted sum of Values', 'المجموع الموزون للقيم'),
    text: t('The model takes a weighted sum of the Value vectors and adds it to the representation of “it”. “it” is no longer just a generic pronoun: it now carries information from its context.',
      'يأخذ النموذج مجموعًا موزونًا لمتجهات القيم ويضيفه إلى تمثيل «it». فلم يعد «it» مجرد ضمير عام، بل صار يحمل معلومات من سياقه.') },
  { icon: 'network', name: t('Every token does it: self-attention', 'كل رمز يفعل ذلك: الانتباه الذاتي'),
    text: t('Every token sends a Query, compares it with the Keys of the tokens before it, and gathers from their Values. The result is an attention pattern of who attends to whom. It is called self-attention because the sentence attends to itself: the Queries, Keys and Values all come from the same tokens.',
      'كل رمز يرسل استعلامًا، ويقارنه بمفاتيح الرموز التي قبله، ويجمع من قيمها. والنتيجة نمط انتباه يبيّن من ينتبه إلى من. ويُسمّى انتباهًا ذاتيًا لأن الجملة تنتبه إلى نفسها: فالاستعلامات والمفاتيح والقيم كلها تأتي من الرموز نفسها.') },
  { icon: 'layers', name: t('Several heads in parallel', 'رؤوس متعددة بالتوازي'),
    text: t('Transformers run several attention heads in parallel. Each head learns its own weights for making Queries, Keys and Values, so different heads capture different relationships between tokens.',
      'تشغّل المحوّلات عدة رؤوس انتباه بالتوازي، ويتعلّم كل رأس أوزانه الخاصة لصنع الاستعلامات والمفاتيح والقيم، فتلتقط الرؤوس المختلفة علاقات مختلفة بين الرموز.') },
];

const pct = (value: number) => `${Math.round(value * 100)}%`;
const word = (i: number) => visiblePiece(WORDS[i]);

export function SelfAttention() {
  const say = useTx();
  const [step, setStep] = useState(0);
  const [head, setHead] = useState<HeadKey>('refers');
  const [query, setQuery] = useState(IT);
  const matrix = useMemo(() => WORDS.map((_, q) => causalRow(head, q).weights), [head]);
  const focus = step >= 4 ? query : IT;
  const row = causalRow(step >= 5 ? head : 'refers', focus);
  const best = row.weights.indexOf(Math.max(...row.weights));
  const gathered = row.weights.map((weight, i) => ({ i, weight })).filter(item => item.weight > 0).sort((a, b) => b.weight - a.weight);

  return <div className="trf-panel sa" data-testid="sa-panel">
    <h4 className="trf-panel-title sa-title"><span className="trf-n">2</span>{say(t('Self-attention, step by step: how “it” finds “cat”', 'الانتباه الذاتي خطوة بخطوة: كيف يجد «it» كلمة «cat»'))}</h4>
    <p className="trf-text">{say(t('Read “The cat sat on the mat because it was tired.” You know at once that “it” is the cat, but the word “it” does not contain that information. At the start, each token is just a vector that does not yet capture its meaning in the sentence. Attention lets each token gather information from the tokens before it and update its representation based on what matters. This is how GPT-style models such as large language models read.',
      'اقرأ «The cat sat on the mat because it was tired.» تعرف فورًا أن «it» هي القطة، لكن كلمة «it» نفسها لا تحمل هذه المعلومة. ففي البداية كل رمز مجرد متجه لا يعبّر بعد عن معناه في الجملة. والانتباه يتيح لكل رمز أن يجمع معلومات من الرموز التي قبله، ويحدّث تمثيله بحسب ما يهمّ. وهكذا تقرأ النماذج بأسلوب GPT مثل النماذج اللغوية الكبيرة.'))}</p>

    <div className="sa-sentence" dir="ltr" role="group" aria-label={say(t('The sentence, token by token', 'الجملة رمزًا رمزًا'))} data-testid="sa-sentence">
      {WORDS.map((piece, i) => {
        const weight = row.weights[i];
        const hidden = i > focus;
        return <button key={i} type="button" disabled={step < 4} onClick={() => setQuery(i)} aria-pressed={i === focus}
          className={`sa-tok${i === focus ? ' query' : ''}${hidden ? ' hidden' : ''}${step >= 2 && i === best && i !== focus ? ' best' : ''}`}
          style={{ ['--w' as string]: step >= 2 && !hidden ? weight : 0 }} data-testid={`sa-tok-${i}`}>
          <code data-keep>{visiblePiece(piece)}</code>
          <small>{CAT_SENTENCE[i][0]}</small>
          {step >= 2 && !hidden && <em>{pct(weight)}</em>}
        </button>;
      })}
    </div>

    <ol className="sa-steps" data-testid="sa-steps">
      {STEPS.map((item, i) => <li key={i} className={i === step ? 'on' : i < step ? 'done' : ''}>
        <button type="button" onClick={() => setStep(i)} aria-current={i === step ? 'step' : undefined} data-testid={`sa-step-${i + 1}`}>
          <span className="num">{i + 1}</span><Icon name={item.icon} size={14}/><b>{say(item.name)}</b>
        </button>
        <p>{say(item.text)}</p>
      </li>)}
    </ol>

    <div className="sa-stage" data-testid="sa-stage" aria-live="polite">
      {step === 0 && <div className="sa-qkv" dir="ltr">
        <div className="sa-vec"><code data-keep>“it”</code><small>{say(t('starting vector', 'المتجه الابتدائي'))}</small></div>
        <div className="sa-mats">
          <span className="q"><code>× W<sub>Q</sub> →</code><b>{say(t('Query', 'الاستعلام (Query)'))}</b><small>{say(t('what it is looking for: the thing it refers to', 'ما يبحث عنه: الشيء الذي يشير إليه'))}</small></span>
          <span className="k"><code>× W<sub>K</sub> →</code><b>{say(t('Key', 'المفتاح (Key)'))}</b><small>{say(t('what it can be matched on', 'ما يمكن مطابقته عليه'))}</small></span>
          <span className="v"><code>× W<sub>V</sub> →</code><b>{say(t('Value', 'القيمة (Value)'))}</b><small>{say(t('the information it can pass along', 'المعلومة التي يمكنه تمريرها'))}</small></span>
        </div>
      </div>}
      {(step === 1 || step === 2) && <div className="sa-bars" data-testid="sa-bars">
        <small>{step === 1 ? say(t('Score = Query of “it” · Key of each earlier token (illustrative)', 'الدرجة = استعلام «it» · مفتاح كل رمز سابق (توضيحية)')) : say(t('Weight = softmax(score); the weights add up to 100%', 'الوزن = softmax(الدرجة)، ومجموع الأوزان 100٪'))}</small>
        {WORDS.slice(0, IT + 1).map((_, i) => {
          const value = step === 1 ? row.scores[i]! : row.weights[i];
          const width = step === 1 ? Math.max(4, (value / 3.6) * 100) : value * 100;
          return <div key={i} className={`sa-bar${i === best ? ' best' : ''}`}>
            <code data-keep dir="ltr">{word(i)}</code><span><i style={{ width: `${width}%` }}/></span><b dir="ltr">{step === 1 ? value.toFixed(1) : pct(value)}</b>
          </div>;
        })}
        <p className="sa-hidden-note"><Icon name="lock" size={13}/>{say(t('“was”, “tired” and “.” come after “it”, so they are hidden: a GPT-style model only looks back.', '«was» و«tired» و«.» تأتي بعد «it»، فهي مخفية: نموذج GPT ينظر إلى الخلف فقط.'))}</p>
      </div>}
      {step === 3 && <div className="sa-sum" data-testid="sa-sum">
        <div className="sa-stack" dir="ltr">{gathered.map(item => <i key={item.i} className={item.i === CAT ? 'cat' : ''} style={{ flexGrow: item.weight }} title={`${word(item.i)} ${pct(item.weight)}`}>{item.weight > 0.08 && <span data-keep>{word(item.i)} {pct(item.weight)}</span>}</i>)}</div>
        <div className="sa-before-after">
          <span><b>{say(t('Before', 'قبل'))}</b><code data-keep>it</code>{say(t('a generic pronoun', 'ضمير عام'))}</span>
          <Icon name="arrow" size={16}/>
          <span className="after"><b>{say(t('After', 'بعد'))}</b><code data-keep>it + {pct(row.weights[CAT])} cat …</code>{say(t('“it” now carries information about the cat', '«it» صار يحمل معلومات عن القطة'))}</span>
        </div>
      </div>}
      {step >= 4 && <div className="sa-pattern">
        {step === 5 && <div className="sa-heads" role="group" aria-label={say(t('Attention heads', 'رؤوس الانتباه'))}>
          {HEADS.map(item => <button key={item.key} type="button" className={head === item.key ? 'on' : ''} aria-pressed={head === item.key} onClick={() => setHead(item.key)} data-testid={`sa-head-${item.key}`}>{say(item.name)}</button>)}
        </div>}
        <div className="sa-matrix-wrap" dir="ltr">
          <table className="sa-matrix" data-testid="sa-matrix">
            <thead><tr><th/>{WORDS.map((_, k) => <th key={k} scope="col"><span data-keep>{word(k)}</span></th>)}</tr></thead>
            <tbody>{(step === 5 ? matrix : WORDS.map((_, q) => causalRow('refers', q).weights)).map((weights, q) => <tr key={q} className={q === focus ? 'on' : ''}>
              <th scope="row"><button type="button" onClick={() => setQuery(q)} data-testid={`sa-row-${q}`}><span data-keep>{word(q)}</span></button></th>
              {weights.map((weight, k) => <td key={k} className={k > q ? 'future' : ''} style={{ ['--w' as string]: weight }} title={k > q ? '' : `${word(q)} → ${word(k)}: ${pct(weight)}`}/>)}
            </tr>)}</tbody>
          </table>
        </div>
        <p className="sa-caption">{step === 5
          ? say(HEADS.find(item => item.key === head)!.text)
          : say(t(`Rows ask, columns answer. Each row adds up to 100%. The striped triangle is the future: no token can look ahead. Row “${word(focus)}” looks most at “${word(best)}” (${pct(row.weights[best])}). Click a row or a token to choose who asks.`,
            `الصفوف تسأل والأعمدة تجيب، ومجموع كل صف 100٪. والمثلث المخطّط هو المستقبل: لا يستطيع أي رمز النظر إلى الأمام. الصف «${word(focus)}» ينظر أكثر إلى «${word(best)}» (${pct(row.weights[best])}). انقر صفًا أو رمزًا لتختار من يسأل.`))}</p>
      </div>}
    </div>
    <div className="sa-nav">
      <button type="button" className="button small" disabled={step === 0} onClick={() => setStep(step - 1)}><Icon name="previous" size={13}/>{say(t('Previous step', 'الخطوة السابقة'))}</button>
      <button type="button" className="button small primary" disabled={step === STEPS.length - 1} onClick={() => setStep(step + 1)} data-testid="sa-next">{say(t('Next step', 'الخطوة التالية'))}<Icon name="next" size={13}/></button>
    </div>

    <div className="sa-why">
      <div><h5><Icon name="check" size={14}/>{say(t('Why it matters', 'لماذا يهمّ ذلك'))}</h5>
        <ul>
          <li>{say(t('It helps the model connect related words, even when they are far apart in a sentence.', 'يساعد النموذج على ربط الكلمات المترابطة حتى حين تتباعد في الجملة.'))}</li>
          <li>{say(t('It lets the meaning a token represents change with its context.', 'يتيح للمعنى الذي يمثّله الرمز أن يتغيّر بحسب سياقه.'))}</li>
        </ul></div>
      <div><h5><Icon name="sparkle" size={14}/>{say(t('The big picture', 'الصورة الكاملة'))}</h5>
        <p>{say(t('At its core, attention lets each token gather the information it needs from context, turning isolated representations into ones that reflect the meaning of the sentence.', 'في جوهره، يتيح الانتباه لكل رمز أن يجمع ما يحتاج إليه من معلومات من السياق، فتتحوّل التمثيلات المعزولة إلى تمثيلات تعكس معنى الجملة.'))}</p></div>
    </div>
    <small className="trf-note sa-source">{say(t('Token IDs are real (o200k_base); the scores and weights are illustrative, since a real model learns them. Panel 1 shows encoder-style attention, where every token sees every other; this panel shows the GPT-style version, where each token sees only itself and the tokens before it. Explanation based on ',
      'أرقام الرموز حقيقية (o200k_base)، أما الدرجات والأوزان فتوضيحية، لأن النموذج الحقيقي يتعلّمها. تعرض اللوحة 1 انتباه أسلوب المُشفِّر، حيث يرى كل رمز كل الرموز الأخرى؛ وتعرض هذه اللوحة أسلوب GPT، حيث لا يرى الرمز إلا نفسه والرموز التي قبله. الشرح مبني على '))}<a href={SOURCE_URL} target="_blank" rel="noreferrer" data-testid="sa-source">{say(t('Data Science Foundry’s short video on attention (Instagram)', 'مقطع قصير عن الانتباه من Data Science Foundry (إنستغرام)'))}<Icon name="external" size={11}/></a>.</small>
  </div>;
}
