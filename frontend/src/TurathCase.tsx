/**
 * Part 12 of the fine-tuning lab: a real student project, TurathAI, as a worked example of the
 * whole process, from heritage sources to a fine-tuned model that answers with citations.
 */
import { useContext, useState } from 'react';
import type { CSSProperties } from 'react';
import './turath.css';
import { Icon } from './ui';
import { useI18n } from './i18n';
import { readStored, writeStored } from './libraryStorage';
import { PartNavContext } from './LabShell';
import { TurathOverview } from './TurathOverview';
import { Lock, Scene, packet, show, t, usePlayer, useTx } from './FineTuneScenes';
import type { Text } from './FineTuneScenes';
import { GPUS, MODEL_SIZES, budget } from './finetuneModel';
import {
  CRITERIA, EVAL_ANSWERS, EVAL_QUESTION, PHASES, QUESTIONS, RECORDS, SPLIT_NAMES, TURATH_CODE,
} from './turathContent';
import type { Split } from './turathContent';

// ------------------------------------------------------- the journey scene

const JOURNEY_STEPS = [
  { short: t('Sources', 'المصادر'),
    title: t('Phase 2 · Collect heritage from trusted sources', 'المرحلة 2 · جمع التراث من مصادر موثوقة'),
    text: t('Books, PDF documents, research and archives are gathered, and every source goes into a register: its title, category, region, rights and whether it has been verified. Nothing enters the dataset without a source.',
      'تُجمع الكتب ووثائق PDF والأبحاث والأرشيفات، ويُسجَّل كل مصدر في سجل: عنوانه وفئته ومنطقته وحقوقه وهل تم التحقق منه. لا يدخل شيء إلى البيانات دون مصدر.') },
  { short: t('Extract', 'الاستخراج'),
    title: t('Phase 2 · Extract the Arabic text', 'المرحلة 2 · استخراج النص العربي'),
    text: t('Text is copied out of digital PDFs. Scanned pages go through Arabic OCR, and its mistakes are corrected by hand. A single wrong letter, such as ه instead of ة, would be learned by the model.',
      'يُنسخ النص من ملفات PDF الرقمية. أما الصفحات الممسوحة فتمر عبر التعرف الضوئي على الحروف العربية (OCR)، وتُصحَّح أخطاؤه يدويًا. فحرف خاطئ واحد مثل ه بدلًا من ة سيتعلمه النموذج.') },
  { short: t('Review', 'المراجعة'),
    title: t('Phase 2 · Review it culturally', 'المرحلة 2 · مراجعة ثقافية'),
    text: t('Claims without a trustworthy source are removed. When a story is told differently in different regions, both versions are kept and labelled, instead of pretending there is only one true version.',
      'تُحذف الادعاءات التي ليس لها مصدر موثوق. وحين تُروى القصة بطرق مختلفة في مناطق مختلفة، تُحفظ الروايتان وتُوسمان، بدلًا من ادعاء أن هناك رواية صحيحة واحدة.') },
  { short: t('JSONL', 'JSONL'),
    title: t('Phase 3 · Turn knowledge into question–answer pairs', 'المرحلة 3 · تحويل المعرفة إلى أزواج سؤال وجواب'),
    text: t('Each verified fact becomes a question and its answer, one JSON object per line (a .jsonl file). The story family and the source travel with each line.',
      'كل حقيقة موثَّقة تصبح سؤالًا وجوابه، كائن JSON واحد في كل سطر (ملف ‎.jsonl). وتصاحب عائلةُ القصة والمصدرُ كلَّ سطر.') },
  { short: t('Split', 'التقسيم'),
    title: t('Phase 3 · Split by story family', 'المرحلة 3 · التقسيم حسب عائلة القصة'),
    text: t('All questions about the same story go into the same set. If one question about Al-Khanjar were in training and another in the test, the test would only check memory, not real understanding. This is called leakage.',
      'كل الأسئلة عن القصة نفسها تذهب إلى المجموعة نفسها. فلو كان سؤال عن الخنجر في التدريب وآخر في الاختبار، لاختبر الاختبارُ الحفظَ لا الفهم الحقيقي. ويسمى هذا التسرّب.') },
  { short: t('Pilot', 'التجربة'),
    title: t('Phase 4 · Baseline and GPU pilot', 'المرحلة 4 · خط الأساس وتجربة GPU'),
    text: t('Before training, the original Qwen3.8-27B answers the test questions, and its answers are saved for comparison. A short pilot on a rented RunPod GPU checks the chat template, memory, batch size, and that the adapter saves and reloads.',
      'قبل التدريب يجيب Qwen3.8-27B الأصلي عن أسئلة الاختبار، وتُحفظ إجاباته للمقارنة. ثم تتحقق تجربة قصيرة على بطاقة GPU مستأجرة من RunPod من قالب المحادثة والذاكرة وحجم الدفعة، ومن أن المهايئ يُحفظ ويُعاد تحميله.') },
  { short: t('Train', 'التدريب'),
    title: t('Phase 5 · Fine-tune with QLoRA and Unsloth', 'المرحلة 5 · الضبط الدقيق بتقنية QLoRA و Unsloth'),
    text: t('The 27B base is loaded in 4-bit and frozen. Unsloth attaches LoRA adapters and trains only them on the heritage pairs, while the loss falls. The configuration, memory and time are logged.',
      'يُحمَّل النموذج الأساسي 27B بدقة 4 بت ويُجمَّد. ويربط Unsloth مهايئات LoRA ويدرّبها وحدها على أزواج التراث بينما تنخفض الخسارة. وتُسجَّل الإعدادات والذاكرة والوقت.') },
  { short: t('Evaluate', 'التقييم'),
    title: t('Phase 6 · Compare on unseen questions', 'المرحلة 6 · المقارنة على أسئلة غير مرئية'),
    text: t('Both models answer the same held-out questions with the same settings. Reviewers score factual accuracy, cultural relevance, relevance and Arabic quality, and count hallucinations.',
      'يجيب النموذجان عن أسئلة الاختبار المحجوزة نفسها بالإعدادات نفسها. ويقيّم المراجعون الدقة الثقافية والحقائق والصلة وجودة العربية، ويعدّون الهلوسات.') },
  { short: t('Deploy', 'النشر'),
    title: t('Phases 7–8 · Serve it with the archive', 'المرحلتان 7–8 · تشغيله مع الأرشيف'),
    text: t('The fine-tuned model joins the website. For every question, the verified archive is searched first, so the answer comes with its sources. The next animation shows this in detail.',
      'ينضم النموذج بعد الضبط الدقيق إلى الموقع. ولكل سؤال يُبحث أولًا في الأرشيف الموثَّق، فتأتي الإجابة مع مصادرها. والرسم المتحرك التالي يعرض ذلك بالتفصيل.') },
];

const FAMILIES: { key: string; name: Text; split: Split; color: string }[] = [
  { key: 'barah', name: t('Al-Bar’ah', 'البرعة'), split: 'train', color: '#2dd4bf' },
  { key: 'harees', name: t('Harees', 'الهريس'), split: 'train', color: '#5ee7ff' },
  { key: 'majlis', name: t('Majlis', 'المجلس'), split: 'train', color: '#a78bfa' },
  { key: 'khanjar', name: t('Al-Khanjar', 'الخنجر'), split: 'validation', color: '#ffc46b' },
  { key: 'hedaa', name: t('Alheda’a', 'الحداء'), split: 'test', color: '#ff8fd0' },
];
/** Two question cards per family, first shuffled in a row, then sorted into their set. */
const CARDS = FAMILIES.flatMap((family, index) => [0, 1].map(copy => ({ family, index, copy })));
const SHUFFLED = [3, 7, 0, 9, 5, 1, 8, 4, 2, 6];
const BIN_SLOTS: Record<Split, [number, number][]> = {
  train: [[54, 262], [150, 262], [246, 262], [54, 298], [150, 298], [246, 298]],
  validation: [[410, 280], [482, 280]],
  test: [[586, 280], [658, 280]],
};
const LOSS = Array.from({ length: 16 }, (_, index) =>
  `${478 + index * 15},${136 + 102 * (1 - Math.exp(-index / 3.6)) + (index % 3) * 2}`).join(' ');

function TrackNode({ index, step, label }: { index: number; step: number; label: string }) {
  const x = 48 + index * 83;
  return <g className={`tj-node ${index < step ? 'done' : index === step ? 'current' : ''}`}>
    <circle cx={x} cy="30" r="12"/>
    <text className="tj-node-number" x={x} y="34" textAnchor="middle">{index + 1}</text>
    <text className="tj-node-label" x={x} y="60" textAnchor="middle">{label}</text>
  </g>;
}

export function TurathJourney() {
  const say = useTx();
  const player = usePlayer(JOURNEY_STEPS.length);
  const { step } = player;
  const at = (index: number) => step === index ? 'tj-stage' : 'tj-stage off';
  // In right-to-left SVG text, "start" is the right-hand edge.
  const arabicAnchor = { textAnchor: 'start', direction: 'rtl' } as const;
  let slot = { train: 0, validation: 0, test: 0 };
  const positions = CARDS.map(card => {
    const [x, y] = BIN_SLOTS[card.family.split][slot[card.family.split]];
    slot = { ...slot, [card.family.split]: slot[card.family.split] + 1 };
    return { x, y };
  });
  return <Scene id="tj-journey" title={t('The TurathAI journey: from heritage sources to a fine-tuned assistant', 'رحلة تراث AI: من مصادر التراث إلى مساعد مضبوط بدقة')}
    steps={JOURNEY_STEPS} player={player}>
    <svg viewBox="0 0 760 350" className={`ft-svg tj-svg step-${step}`} role="img" aria-label={say(JOURNEY_STEPS[step].title)}>
      <line className="tj-track" x1="48" x2="712" y1="30" y2="30"/>
      <line className="tj-track fill" x1="48" x2={48 + step * 83} y1="30" y2="30"/>
      {JOURNEY_STEPS.map((item, index) => <TrackNode key={index} index={index} step={step} label={say(item.short)}/>)}
      <rect className="ft-frame" x="20" y="76" width="720" height="266" rx="14"/>

      {/* 0 sources and the register */}
      <g className={at(0)}>
        {[t('Books', 'الكتب'), t('PDF documents', 'وثائق PDF'), t('Research papers', 'أبحاث منشورة'), t('Archives', 'الأرشيفات')].map((label, index) =>
          <g key={label.en} className="tj-pop" style={{ animationDelay: `${index * 0.2}s` }}>
            <rect className="tj-source" x="44" y={96 + index * 58} width="160" height="44" rx="10"/>
            <text className="ft-label" x="64" y={123 + index * 58}>{say(label)}</text>
          </g>)}
        <path className="tj-arrow" d="M 214 210 L 282 210" markerEnd="url(#tj-head)"/>
        <rect className="tj-table" x="296" y="96" width="428" height="190" rx="10"/>
        <text className="ft-label" x="310" y="118">{say(t('Source register', 'سجل المصادر'))}</text>
        {[t('Element', 'العنصر'), t('Category', 'الفئة'), t('Source', 'المصدر'), t('Verified', 'موثَّق')].map((head, index) =>
          <text key={head.en} className="ft-tiny strong" x={[310, 430, 568, 672][index]} y="142">{say(head)}</text>)}
        {RECORDS.map((record, index) => <g key={record.family} className="tj-pop" style={{ animationDelay: `${0.8 + index * 0.35}s` }}>
          <line className="tj-rule" x1="306" x2="714" y1={152 + index * 38} y2={152 + index * 38}/>
          <text className="ft-tiny strong" x="310" y={174 + index * 38}>{say(record.name)}</text>
          <text className="ft-tiny" x="430" y={174 + index * 38}>{say(record.category)}</text>
          <text className="ft-tiny" x="568" y={174 + index * 38}>{record.source}</text>
          <text className="tj-check" x="684" y={175 + index * 38}>✓</text>
        </g>)}
        <text className="ft-tiny" x="310" y="306">{say(t('+ title, region, page, rights and licence for every record', '+ العنوان والمنطقة والصفحة والحقوق والترخيص لكل سجل'))}</text>
      </g>

      {/* 1 extract with OCR */}
      <g className={at(1)}>
        <rect className="tj-page scan" x="50" y="96" width="180" height="226" rx="8"/>
        {Array.from({ length: 9 }, (_, index) => <rect key={index} className="tj-scanline" x={66 + (index % 2) * 8} y={114 + index * 22}
          width={140 - (index % 3) * 18} height="7" rx="3" transform={`rotate(-1.5 140 ${118 + index * 22})`}/>)}
        <rect className="tj-scanbar" x="46" y="96" width="188" height="6" rx="3"/>
        <text className="ft-tiny" x="140" y="338" textAnchor="middle">{say(t('scanned page (an image)', 'صفحة ممسوحة (صورة)'))}</text>
        <path className="tj-arrow" d="M 242 210 L 318 210" markerEnd="url(#tj-head)"/>
        <text className="ft-tiny strong" x="280" y="200" textAnchor="middle">{say(t('Arabic OCR', 'OCR عربي'))}</text>
        <rect className="tj-page" x="330" y="96" width="210" height="226" rx="8"/>
        {['البرعة فن أدائي من أودية ظفار', 'يجمع بين الرقص والموسيقى', 'والشعر، ويؤديه رجال ونساء', 'في نصف دائرة يردّدون', 'ويصفّقون، ويرقص اثنان', 'بالخناجر.'].map((line, index) =>
          <text key={line} className="tj-arabic ink tj-pop" x="526" y={128 + index * 26} {...arabicAnchor}
            style={{ animationDelay: `${0.6 + index * 0.25}s` }}>{line}</text>)}
        <g className="tj-pop" style={{ animationDelay: '2.4s' }}>
          <rect className="tj-fix" x="560" y="140" width="164" height="96" rx="10"/>
          <text className="ft-tiny strong warm" x="574" y="162">{say(t('OCR mistake', 'خطأ في OCR'))}</text>
          <text className="tj-arabic bad" x="710" y="188" {...arabicAnchor}>البرعه ✗</text>
          <text className="tj-arabic good" x="710" y="218" {...arabicAnchor}>البرعة ✓</text>
        </g>
        <text className="ft-tiny" x="642" y="256" textAnchor="middle">{say(t('corrected by hand', 'يُصحَّح يدويًا'))}</text>
      </g>

      {/* 2 cultural review */}
      <g className={at(2)}>
        {[
          { label: t('Al-Bar’ah · UNESCO 2010', 'البرعة · اليونسكو 2010'), state: 'ok', note: t('verified ✓', 'موثَّق ✓') },
          { label: t('Al-Khanjar · UNESCO 2022', 'الخنجر · اليونسكو 2022'), state: 'ok', note: t('verified ✓', 'موثَّق ✓') },
          { label: t('Forum post, no source', 'منشور منتدى بلا مصدر'), state: 'bad', note: t('removed ✗', 'حُذف ✗') },
          { label: t('One story, two regions', 'قصة واحدة في منطقتين'), state: 'keep', note: t('keep both, labelled', 'تُحفظ الروايتان مع وسمهما') },
        ].map((card, index) => <g key={card.label.en} className={`tj-review ${card.state}`} style={{ animationDelay: `${0.4 + index * 0.4}s` }}>
          <rect x={44 + index * 174} y="110" width="160" height="128" rx="12"/>
          <text className="ft-label" x={56 + index * 174} y="140">{say(card.label).split(' · ')[0]}</text>
          <text className="ft-tiny" x={56 + index * 174} y="158">{say(card.label).split(' · ')[1] ?? ''}</text>
          {card.state === 'keep' && <>
            <rect className="tj-variant" x={56 + index * 174} y="172" width="64" height="24" rx="6"/>
            <text className="ft-tiny strong" x={88 + index * 174} y="188" textAnchor="middle">{say(t('version A', 'رواية أ'))}</text>
            <rect className="tj-variant" x={128 + index * 174} y="172" width="64" height="24" rx="6" transform="translate(-4 0)"/>
            <text className="ft-tiny strong" x={156 + index * 174} y="188" textAnchor="middle">{say(t('version B', 'رواية ب'))}</text>
          </>}
          <text className="tj-verdict" x={56 + index * 174} y="226">{say(card.note)}</text>
        </g>)}
        <text className="ft-tiny" x="380" y="290" textAnchor="middle">{say(t('Unverified claims leave the dataset; different versions of a story stay, with their region.', 'الادعاءات غير الموثَّقة تخرج من البيانات، والروايات المختلفة للقصة تبقى مع منطقتها.'))}</text>
      </g>

      {/* 3 JSONL */}
      <g className={at(3)}>
        {RECORDS.map((record, index) => <g key={record.family}>
          <rect className="tj-source" x="44" y={104 + index * 70} width="170" height="54" rx="10"/>
          <text className="ft-label" x="58" y={128 + index * 70}>{say(record.name)}</text>
          <text className="ft-tiny" x="58" y={146 + index * 70}>{say(t('3 questions', '3 أسئلة'))} · {record.source}</text>
        </g>)}
        <path className="tj-arrow" d="M 222 200 L 280 200" markerEnd="url(#tj-head)"/>
        <rect className="tj-terminal" x="290" y="96" width="434" height="226" rx="10"/>
        <text className="ft-tiny" x="304" y="116">turath_train.jsonl</text>
        {RECORDS.flatMap(record => record.pairs.slice(0, 2).map(pair => ({ record, pair }))).map(({ record }, index) =>
          <text key={index} className="tj-json tj-pop" x="304" y={146 + index * 28} style={{ animationDelay: `${0.3 + index * 0.3}s` }}>
            {`{"question": "…", "answer": "…", "family": "${record.family}", "source": "${record.source.replace('UNESCO ICH, ', 'UNESCO ')}"}`}
          </text>)}
        <text className="ft-tiny" x="304" y="314">{say(t('one JSON object per line — the format Unsloth and Hugging Face read', 'كائن JSON واحد في كل سطر — الصيغة التي يقرؤها Unsloth و Hugging Face'))}</text>
      </g>

      {/* 4 split by story family */}
      <g className={at(4)}>
        {(['train', 'validation', 'test'] as Split[]).map(split => {
          const x = { train: 40, validation: 398, test: 574 }[split];
          const width = { train: 346, validation: 164, test: 154 }[split];
          return <g key={split}>
            <rect className={`tj-bin ${split}`} x={x} y="236" width={width} height="96" rx="12"/>
            <text className="ft-label" x={x + 12} y="254">{say(SPLIT_NAMES[split])}</text>
          </g>;
        })}
        {CARDS.map((card, index) => {
          const order = SHUFFLED.indexOf(index);
          const start = { x: 40 + order * 70, y: 112 };
          const end = positions[index];
          return <g key={index} className="tj-card" style={{
            '--dx': `${start.x - end.x}px`, '--dy': `${start.y - end.y}px`, animationDelay: `${0.8 + order * 0.15}s`,
          } as CSSProperties}>
            <rect x={end.x} y={end.y} width="64" height="26" rx="6" style={{ fill: `${card.family.color}33`, stroke: card.family.color }}/>
            <text className="ft-tiny strong" x={end.x + 32} y={end.y + 17} textAnchor="middle">{say(card.family.name)}</text>
          </g>;
        })}
        <text className="ft-tiny" x="380" y="174" textAnchor="middle">{say(t('Each card is one question. Colour = story family.', 'كل بطاقة سؤال واحد. اللون = عائلة القصة.'))}</text>
        <text className="ft-tiny strong" x="380" y="196" textAnchor="middle">{say(t('A family never crosses into another set.', 'العائلة لا تعبر أبدًا إلى مجموعة أخرى.'))}</text>
      </g>

      {/* 5 baseline and GPU pilot */}
      <g className={at(5)}>
        <rect className="tj-bubble" x="44" y="96" width="270" height="40" rx="12"/>
        <text className="tj-arabic" x="300" y="122" {...arabicAnchor}>ما هي البرعة؟</text>
        <text className="ft-tiny" x="56" y="122">{say(t('test question', 'سؤال اختبار'))}</text>
        <rect className="tj-model" x="44" y="148" width="270" height="62" rx="12"/>
        <text className="ft-label" x="60" y="174">Qwen3.8-27B</text>
        <text className="ft-tiny" x="60" y="192">{say(t('original · no fine-tuning', 'الأصلي · دون ضبط دقيق'))}</text>
        <g className="tj-pop" style={{ animationDelay: '1s' }}>
          <rect className="tj-bubble answer" x="44" y="222" width="270" height="70" rx="12"/>
          <text className="ft-tiny" x="58" y="246">{say(t('“A traditional dance from the Gulf region,', '«رقصة تقليدية من منطقة الخليج،'))}</text>
          <text className="ft-tiny" x="58" y="262">{say(t('often performed at celebrations…”', 'تؤدى عادةً في الاحتفالات…»'))}</text>
          <text className="ft-tiny strong warm" x="58" y="282">{say(t('saved as the baseline for Phase 6', 'تُحفظ خطَّ أساس للمرحلة 6'))}</text>
        </g>
        <rect className="tj-pilot" x="352" y="96" width="372" height="230" rx="12"/>
        <text className="ft-label" x="368" y="122">{say(t('RunPod GPU pilot', 'تجربة GPU على RunPod'))}</text>
        <rect className="tj-gauge" x="368" y="136" width="340" height="16" rx="8"/>
        <rect className="tj-gauge-fill" x="368" y="136" width="250" height="16" rx="8"/>
        <text className="ft-tiny" x="368" y="168">{say(t('GPU memory while loading the 27B model in 4-bit', 'ذاكرة GPU أثناء تحميل نموذج 27B بدقة 4 بت'))}</text>
        {[t('chat template formats Arabic correctly', 'قالب المحادثة ينسّق العربية بشكل صحيح'),
          t('batch size and sequence length fit in memory', 'حجم الدفعة وطول التسلسل يتسعان في الذاكرة'),
          t('adapter saves and reloads', 'المهايئ يُحفظ ويُعاد تحميله')].map((item, index) =>
          <g key={item.en} className="tj-pop" style={{ animationDelay: `${1.2 + index * 0.6}s` }}>
            <circle className="tj-tick" cx="378" cy={200 + index * 36} r="9"/>
            <text className="tj-tick-text" x="378" y={204 + index * 36} textAnchor="middle">✓</text>
            <text className="ft-tiny strong" x="396" y={204 + index * 36}>{say(item)}</text>
          </g>)}
      </g>

      {/* 6 train */}
      <g className={at(6)}>
        <rect className="tj-base" x="44" y="100" width="330" height="170" rx="12"/>
        {Array.from({ length: 24 }, (_, index) => <rect key={index} className="tj-base-cell" x={58 + (index % 8) * 38} y={138 + Math.floor(index / 8) * 34}
          width="32" height="28" rx="4" style={{ opacity: 0.35 + ((index * 7) % 5) / 10 }}/>)}
        <text className="ft-label" x="58" y="124">{say(t('Qwen3.8-27B · 4-bit · frozen', 'Qwen3.8-27B · 4 بت · مجمَّد'))}</text>
        <Lock x={356} y={118} size={1.3}/>
        <rect className="tj-adapter" x="384" y="100" width="30" height="170" rx="8"/>
        <text className="ft-tiny strong warm" x="399" y="290" textAnchor="middle">LoRA</text>
        {[0, 1, 2, 3].map(index => <rect key={index} className="tj-token" x="-6" y="-6" width="12" height="12" rx="3"
          style={packet('M 24 230 L 400 230 L 400 180', -index * 0.6, { animationDuration: '2.4s' })}/>)}
        <text className="ft-tiny" x="44" y="320">{say(t('heritage pairs flow in · only the adapter learns', 'أزواج التراث تتدفق · المهايئ وحده يتعلم'))}</text>
        <rect className="tj-chart" x="460" y="100" width="264" height="170" rx="12"/>
        <text className="ft-tiny strong" x="474" y="122">{say(t('training loss', 'خسارة التدريب'))}</text>
        <polyline className="tj-loss" points={LOSS}/>
        <text className="ft-tiny" x="474" y="294">{say(t('Unsloth on a rented RunPod GPU', 'Unsloth على بطاقة GPU مستأجرة من RunPod'))}</text>
      </g>

      {/* 7 evaluate */}
      <g className={at(7)}>
        <rect className="tj-bin test" x="270" y="92" width="220" height="44" rx="12"/>
        <text className="ft-label" x="380" y="119" textAnchor="middle">{say(t('Same unseen test questions', 'أسئلة الاختبار غير المرئية نفسها'))}</text>
        <path className="tj-arrow" d="M 330 140 C 300 160 230 160 200 176" markerEnd="url(#tj-head)"/>
        <path className="tj-arrow" d="M 430 140 C 460 160 530 160 560 176" markerEnd="url(#tj-head)"/>
        <rect className="tj-model" x="70" y="180" width="260" height="50" rx="12"/>
        <text className="ft-label" x="200" y="210" textAnchor="middle">{say(t('Original Qwen3.8-27B', 'Qwen3.8-27B الأصلي'))}</text>
        <rect className="tj-model tuned" x="430" y="180" width="260" height="50" rx="12"/>
        <text className="ft-label" x="560" y="210" textAnchor="middle">{say(t('Fine-tuned TurathAI', 'تراث AI بعد الضبط الدقيق'))}</text>
        {[...CRITERIA, t('Hallucinations (count)', 'الهلوسات (العدد)')].map((criterion, index) =>
          <g key={criterion.en} className="tj-pop" style={{ animationDelay: `${0.6 + index * 0.25}s` }}>
            <text className="ft-tiny strong" x="380" y={256 + index * 17} textAnchor="middle">{say(criterion)}</text>
            <rect className="tj-score" x="150" y={246 + index * 17} width="100" height="11" rx="3"/>
            <rect className="tj-score" x="510" y={246 + index * 17} width="100" height="11" rx="3"/>
          </g>)}
      </g>

      {/* 8 deploy */}
      <g className={at(8)}>
        {[t('User', 'المستخدم'), t('Backend', 'الخادم'), t('Archive search', 'البحث في الأرشيف'), t('Qwen + LoRA', 'Qwen + LoRA'), t('Answer + sources', 'إجابة + مصادر')].map((label, index) =>
          <g key={label.en}>
            <rect className={`tj-flow ${index === 3 ? 'tuned' : ''}`} x={34 + index * 144} y="170" width="124" height="60" rx="12"/>
            <text className="ft-label" x={96 + index * 144} y="205" textAnchor="middle">{say(label)}</text>
          </g>)}
        {[0, 1, 2].map(index => <circle key={index} className="ft-packet" r="5" style={packet('M 158 200 L 610 200', -index * 0.8)}/>)}
        <text className="ft-tiny" x="380" y="270" textAnchor="middle">{say(t('Fine-tuning gives the style and knowledge; the archive gives sources that can be checked.', 'الضبط الدقيق يعطي الأسلوب والمعرفة، والأرشيف يعطي مصادر يمكن التحقق منها.'))}</text>
      </g>

      <defs>
        <marker id="tj-head" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto">
          <path d="M0 0 8 4 0 8z" fill="#a9b6d8"/>
        </marker>
      </defs>
    </svg>
  </Scene>;
}

// -------------------------------------------------------- dataset builder

function DatasetBuilder() {
  const say = useTx();
  const { isArabic } = useI18n();
  const [pick, setPick] = useState(0);
  const [pair, setPair] = useState(0);
  const record = RECORDS[pick];
  const [assigned, setAssigned] = useState<Split[]>(() => record.pairs.map(() => record.split));
  const leaking = new Set(assigned).size > 1;
  function choose(index: number) {
    setPick(index);
    setPair(0);
    setAssigned(RECORDS[index].pairs.map(() => RECORDS[index].split));
  }
  // Each line is real JSON; the Arabic values are isolated so they read right to left inside it.
  const lines = record.pairs.map(item => [
    ['question', item.question.ar], ['answer', item.answer.ar], ['family', record.family], ['source', record.source],
  ] as const);
  const selected = record.pairs[pair];
  return <div className="tj-builder">
    <div className="ft-tabs" role="group" aria-label={say(t('Choose a heritage element', 'اختر عنصرًا تراثيًا'))}>
      {RECORDS.map((item, index) => <button key={item.family} type="button" className={index === pick ? 'current' : ''}
        aria-pressed={index === pick} onClick={() => choose(index)}>{say(item.name)}</button>)}
    </div>
    <div className="tj-builder-grid">
      <section>
        <h5><span>1</span>{say(t('Source register entry', 'مدخل في سجل المصادر'))}</h5>
        <dl className="tj-register">
          <div><dt>{say(t('Element', 'العنصر'))}</dt><dd>{say(record.name)}</dd></div>
          <div><dt>{say(t('Category', 'الفئة'))}</dt><dd>{say(record.category)}</dd></div>
          <div><dt>{say(t('Region', 'المنطقة'))}</dt><dd>{say(record.region)}</dd></div>
          <div><dt>{say(t('Source', 'المصدر'))}</dt><dd><a href={record.url} target="_blank" rel="noreferrer" data-keep="">{record.source}</a></dd></div>
          <div><dt>{say(t('Rights', 'الحقوق'))}</dt><dd>{say(t('public description · cite it', 'وصف منشور · يُستشهد به'))}</dd></div>
          <div><dt>{say(t('Verified', 'التحقق'))}</dt><dd className="ok">✓ {say(t('checked against the source', 'مطابق للمصدر'))}</dd></div>
        </dl>
      </section>
      <section>
        <h5><span>2</span>{say(t('Lines in the .jsonl file', 'أسطر في ملف ‎.jsonl'))}</h5>
        <pre className="tj-jsonl" dir="ltr">{lines.map((fields, index) => <code key={index} className={index === pair ? 'current' : ''}
          data-keep="" onClick={() => setPair(index)}>
          {'{'}{fields.map(([key, value], position) => <span key={key}>
            <span className="tj-key">"{key}"</span>: "<bdi dir={/[؀-ۿ]/.test(value) ? 'rtl' : 'ltr'}>{value}</bdi>"
            {position < fields.length - 1 ? ', ' : ''}
          </span>)}{'}'}
        </code>)}</pre>
        <p className="tj-hint">{say(t('TurathAI’s data is in Arabic. Click a line to see how the model receives it.', 'بيانات تراث AI بالعربية. انقر على سطر لترى كيف يستقبله النموذج.'))}</p>
        {!isArabic && <p className="tj-gloss"><strong>{selected.question.en}</strong> {selected.answer.en}</p>}
      </section>
      <section>
        <h5><span>3</span>{say(t('What the model sees in training', 'ما يراه النموذج أثناء التدريب'))}</h5>
        <div className="ft-chat" dir="ltr">
          <span className="ft-tag">&lt;|im_start|&gt;user</span>
          <p dir="rtl">{selected.question.ar}</p>
          <span className="ft-tag">&lt;|im_end|&gt;</span>
          <span className="ft-tag">&lt;|im_start|&gt;assistant</span>
          <p dir="rtl" className="ft-learned">{selected.answer.ar}</p>
          <span className="ft-tag">&lt;|im_end|&gt;</span>
        </div>
        <p className="tj-hint">{say(t('The highlighted answer is what the loss is measured on.', 'الإجابة المظلَّلة هي ما تُقاس عليه الخسارة.'))}</p>
      </section>
      <section>
        <h5><span>4</span>{say(t('Which set does each question go to?', 'إلى أي مجموعة يذهب كل سؤال؟'))}</h5>
        <ul className="tj-assign">
          {record.pairs.map((item, index) => <li key={item.question.en}>
            <span>{say(item.question)}</span>
            <select value={assigned[index]} aria-label={say(t(`Set for question ${index + 1}`, `مجموعة السؤال ${index + 1}`))}
              onChange={event => setAssigned(current => current.map((old, position) => position === index ? event.target.value as Split : old))}>
              {(['train', 'validation', 'test'] as Split[]).map(split => <option key={split} value={split}>{say(SPLIT_NAMES[split])}</option>)}
            </select>
          </li>)}
        </ul>
        <p className={leaking ? 'tj-verdict-box bad' : 'tj-verdict-box ok'} role="status">{leaking
          ? say(t('Leak! Questions about the same element are now in different sets. The model would see this story in training and then be “tested” on it, so the score would look better than it really is.',
            'تسرّب! أصبحت أسئلة العنصر نفسه في مجموعات مختلفة. سيرى النموذج القصة في التدريب ثم «يُختبر» فيها، فتبدو النتيجة أفضل من حقيقتها.'))
          : say(t('Correct: the whole story family stays in one set, as TurathAI’s method requires.', 'صحيح: عائلة القصة كلها في مجموعة واحدة، كما تتطلب منهجية تراث AI.'))}</p>
      </section>
    </div>
  </div>;
}

// ----------------------------------------------------------- GPU planner

function GpuPlan() {
  const say = useTx();
  const model = MODEL_SIZES[4];
  const qlora = budget(model, 4, 16, true);
  const lora = budget(model, 16, 16, true);
  const rows = [
    { name: t('QLoRA: 4-bit base + adapters', 'QLoRA: أساس 4 بت + مهايئات'), gb: qlora.totalGb, tone: '#5ef2a0' },
    { name: t('LoRA: 16-bit base + adapters', 'LoRA: أساس 16 بت + مهايئات'), gb: lora.totalGb, tone: '#ffc46b' },
    { name: t('Full fine-tuning: every weight', 'ضبط دقيق كامل: كل الأوزان'), gb: qlora.fullGb, tone: '#ff8f6b' },
  ];
  const scale = 230;
  const width = (gb: number) => `${Math.min(100, gb / scale * 100)}%`;
  return <div className="tj-gpu">
    <div className="tj-gpu-rows">
      {rows.map(row => <div key={row.name.en} className="tj-gpu-row">
        <span>{say(row.name)}</span>
        <div className="tj-gpu-track">
          <i style={{ width: width(row.gb), background: row.tone }}/>
          {GPUS.filter(gpu => gpu.gb >= 24).map(gpu => <b key={gpu.gb} style={{ insetInlineStart: width(gpu.gb) }}/>)}
        </div>
        <strong>≈ {row.gb.toFixed(0)} GB</strong>
      </div>)}
      <div className="tj-gpu-scale">
        {GPUS.filter(gpu => gpu.gb >= 24).map(gpu => <span key={gpu.gb} style={{ insetInlineStart: width(gpu.gb) }}>{gpu.gb} GB</span>)}
      </div>
    </div>
    <ul className="tj-gpu-notes">
      <li>{say(t('Our classroom estimate for 27B with r = 16 on every layer. A 24 GB card is borderline; 48 GB leaves room for longer Arabic texts.',
        'تقديرنا الصفي لنموذج 27B مع r = 16 على كل الطبقات. بطاقة 24 غ.ب على الحد، و 48 غ.ب تترك مجالًا لنصوص عربية أطول.'))}</li>
      <li>{say(t('Unsloth’s guide for Qwen3.8-27B: QLoRA works with 24 GB, LoRA needs more than 36 GB, and full fine-tuning about four times more.',
        'دليل Unsloth لنموذج Qwen3.8-27B: تعمل QLoRA مع 24 غ.ب، وتحتاج LoRA أكثر من 36 غ.ب، والضبط الدقيق الكامل نحو أربعة أضعاف ذلك.'))} <a href="https://unsloth.ai/docs/models/qwen3.8/train" target="_blank" rel="noreferrer" data-keep="">unsloth.ai</a></li>
      <li>{say(t('That is why TurathAI rents a RunPod GPU and runs a short pilot (Phase 4) before paying for the full training run.',
        'لهذا يستأجر فريق تراث AI بطاقة GPU من RunPod ويجري تجربة قصيرة (المرحلة 4) قبل أن يدفع لتشغيل التدريب كاملًا.'))}</li>
    </ul>
  </div>;
}

function TurathCode() {
  const say = useTx();
  const [copied, setCopied] = useState(false);
  return <div className="ft-codebox tj-code">
    <button type="button" className="button small" onClick={() => {
      void navigator.clipboard?.writeText(TURATH_CODE).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1600); });
    }}><Icon name={copied ? 'check' : 'copy'} size={13}/>{copied ? say(t('Copied', 'تم النسخ')) : say(t('Copy', 'نسخ'))}</button>
    <pre dir="ltr"><code>{TURATH_CODE}</code></pre>
  </div>;
}

// ------------------------------------------------------ evaluation workbench

function Evaluate() {
  const say = useTx();
  const [scores, setScores] = useState<(number | null)[][]>(() => EVAL_ANSWERS.map(() => CRITERIA.map(() => null)));
  const [hallucinations, setHallucinations] = useState<number[]>(() => EVAL_ANSWERS.map(() => 0));
  const [reveal, setReveal] = useState(false);
  const total = (index: number) => scores[index].reduce<number>((sum, value) => sum + (value ?? 0), 0);
  return <div className="tj-eval">
    <p className="ft-question"><Icon name="help" size={16}/><span>{say(EVAL_QUESTION)}</span></p>
    <div className="tj-eval-grid">
      {EVAL_ANSWERS.map((item, index) => <article key={item.model.en} className={`tj-eval-card m${index}`}>
        <h5>{say(item.model)}</h5>
        <p className="tj-eval-answer">{say(item.answer)}</p>
        {CRITERIA.map((criterion, row) => <div key={criterion.en} className="tj-rate">
          <span>{say(criterion)}</span>
          <div role="group" aria-label={`${say(item.model)}: ${say(criterion)}`}>
            {[1, 2, 3, 4, 5].map(value => <button key={value} type="button" aria-pressed={scores[index][row] === value}
              className={scores[index][row] === value ? 'on' : ''}
              onClick={() => setScores(current => current.map((list, position) => position === index
                ? list.map((old, cell) => cell === row ? value : old) : list))}>{value}</button>)}
          </div>
          {reveal && <em title={say(t('teacher', 'المعلّم'))}>{item.teacher[row]}</em>}
        </div>)}
        <div className="tj-rate">
          <span>{say(t('Hallucinations', 'الهلوسات'))}</span>
          <div className="tj-counter">
            <button type="button" aria-label={say(t('Fewer hallucinations', 'هلوسات أقل'))}
              onClick={() => setHallucinations(current => current.map((old, position) => position === index ? Math.max(0, old - 1) : old))}>−</button>
            <b>{hallucinations[index]}</b>
            <button type="button" aria-label={say(t('More hallucinations', 'هلوسات أكثر'))}
              onClick={() => setHallucinations(current => current.map((old, position) => position === index ? old + 1 : old))}>+</button>
          </div>
          {reveal && <em>{item.hallucinations}</em>}
        </div>
        <div className="tj-eval-total">
          <span>{say(t('Your score', 'تقييمك'))}</span>
          <div className="tj-total-bar"><i style={{ width: `${total(index) / 20 * 100}%` }}/></div>
          <b data-testid={`eval-total-${index}`}>{total(index)} / 20</b>
        </div>
        <p className={item.cites ? 'tj-cites yes' : 'tj-cites'}>{item.cites ? say(t('✓ shows its source', '✓ يعرض مصدره')) : say(t('✗ no source shown', '✗ لا يعرض مصدرًا'))}</p>
        {reveal && <p className="tj-why">{say(item.why)}</p>}
      </article>)}
    </div>
    <div className="button-row">
      <button type="button" className="button primary" onClick={() => setReveal(value => !value)}>
        <Icon name="check" size={14}/>{reveal ? say(t('Hide the teacher’s scoring', 'إخفاء تقييم المعلّم')) : say(t('Compare with the teacher’s scoring', 'قارن بتقييم المعلّم'))}</button>
      <span className="tj-hint">{say(t('These three answers are written examples for practice, not outputs of the real models; TurathAI will measure real ones in Phase 6.',
        'هذه الإجابات الثلاث أمثلة مكتوبة للتدريب، وليست مخرجات النماذج الحقيقية؛ وسيقيس فريق تراث AI الإجابات الحقيقية في المرحلة 6.'))}</span>
    </div>
  </div>;
}

// --------------------------------------------------------------- checklist

const CHECKLIST_KEY = 'neuron-lab-turath-phases';

function Checklist() {
  const say = useTx();
  const [done, setDone] = useState<boolean[]>(() => {
    try {
      const saved = JSON.parse(readStored(CHECKLIST_KEY) ?? '[]') as unknown;
      return PHASES.map((_, index) => Array.isArray(saved) && saved[index] === true);
    } catch {
      return PHASES.map(() => false);
    }
  });
  const count = done.filter(Boolean).length;
  function toggle(index: number) {
    const next = done.map((value, position) => position === index ? !value : value);
    setDone(next);
    writeStored(CHECKLIST_KEY, JSON.stringify(next));
  }
  return <div className="tj-checklist">
    <div className="tj-progress"><i style={{ width: `${count / PHASES.length * 100}%` }}/><span>{count} / {PHASES.length}</span></div>
    <ol>
      {PHASES.map((phase, index) => <li key={phase.title.en} className={done[index] ? 'done' : ''}>
        <label>
          <input type="checkbox" checked={done[index]} onChange={() => toggle(index)}/>
          <span className="tj-phase-number">{index + 1}</span>
          <span><strong>{say(phase.title)}</strong><small>{say(phase.produce)}</small></span>
        </label>
      </li>)}
    </ol>
  </div>;
}

/** The online RAG flow is shown once, in part 11; this links to it. */
function RagLink() {
  const say = useTx();
  const nav = useContext(PartNavContext);
  return <div className="tj-raglink">
    <Icon name="play" size={16}/>
    <p>{say(t('The online part works exactly like the RAG application in part 11: an admin uploads verified records, they are embedded into the vector database, and each question is answered from the retrieved passages with their sources — no retraining needed.',
      'يعمل الجزء الإلكتروني تمامًا مثل تطبيق RAG في الجزء 11: يرفع المشرف سجلات موثقة، فتُضمَّن في قاعدة بيانات المتجهات، ويُجاب عن كل سؤال من المقاطع المسترجَعة مع مصادرها، دون إعادة تدريب.'))}</p>
    {nav && <button type="button" className="button small" onClick={() => { nav.go(10); nav.setTab('watch'); }}>
      {say(t('Watch the RAG application', 'شاهد تطبيق RAG'))}<Icon name="next" size={13}/></button>}
  </div>;
}

// -------------------------------------------------------------- the section

export function TurathCase({ index, total }: { index: number; total: number }) {
  const say = useTx();
  return <section className="llm-stage tj-case" id="ft-turath" data-stage={index} style={{ '--tone': '#2dd4bf' } as CSSProperties}
    aria-labelledby="ft-turath-title">
    <header className="llm-stage-top">
      <span className="llm-stage-number"><Icon name="book" size={20}/></span>
      <div className="llm-stage-title">
        <span className="llm-stage-eyebrow">{say(t(`Part ${index + 1} of ${total} · a real student project`, `الجزء ${index + 1} من ${total} · مشروع طلابي حقيقي`))}</span>
        <h3 id="ft-turath-title">{say(t('TurathAI: fine-tuning a model on Omani heritage', 'تراث AI: ضبط نموذج بدقة على التراث العُماني'))}</h3>
        <p>{say(t('How would you plan a real fine-tuning project from start to finish?', 'كيف تخطط لمشروع ضبط دقيق حقيقي من البداية إلى النهاية؟'))}</p>
      </div>
      <span className="llm-stage-out">Qwen3.8-27B · QLoRA · Unsloth</span>
    </header>

    <div className="tj-body">
      <div className="tj-intro">
        <div>
          <p className="tj-lead">{say(t('UTAS 2020 TurathAI is a student project at the University of Technology and Applied Sciences (IT Department, College of Computing and Information Sciences), supervised by Dr. Nasser Mohammed Tabook. Its goal: an AI assistant that preserves Omani intangible heritage (folktales, proverbs, customs and traditions) and answers questions about it with references to the original sources.',
            'مشروع UTAS 2020 تراث AI مشروع طلابي في جامعة التقنية والعلوم التطبيقية (قسم تقنية المعلومات، كلية الحوسبة وعلوم المعلومات) بإشراف الدكتور ناصر محمد تبوك. هدفه: مساعد ذكي يحفظ التراث العُماني غير المادي (الحكايات الشعبية والأمثال والعادات والتقاليد) ويجيب عن الأسئلة حوله مع الإحالة إلى المصادر الأصلية.'))}</p>
          <p className="tj-status"><Icon name="clock" size={14}/>{say(t('This is the team’s research plan. The steps below follow their report; their measured results will come after implementation.',
            'هذه خطة البحث للفريق. الخطوات أدناه تتبع تقريرهم، ونتائجهم المقيسة ستأتي بعد التنفيذ.'))}</p>
        </div>
        <dl className="tj-facts">
          {[
            [t('Base model', 'النموذج الأساسي'), 'Qwen3.8-27B'],
            [t('Method', 'الطريقة'), t('QLoRA: 4-bit frozen base + LoRA', 'QLoRA: أساس 4 بت مجمَّد + LoRA')],
            [t('Software', 'البرمجيات'), 'Unsloth · Hugging Face'],
            [t('GPU', 'GPU'), t('rented on RunPod', 'مستأجرة من RunPod')],
            [t('Data', 'البيانات'), t('verified Arabic Q&A in JSONL', 'أسئلة وأجوبة عربية موثَّقة بصيغة JSONL')],
            [t('Answers with', 'تجيب مع'), t('RAG over a verified archive', 'استرجاع RAG من أرشيف موثَّق')],
          ].map(([label, value]) => <div key={(label as Text).en}>
            <dt>{say(label as Text)}</dt><dd>{typeof value === 'string' ? value : say(value)}</dd>
          </div>)}
        </dl>
      </div>

      <h4 className="llm-sub">{say(t('What the team wants to find out', 'ما يريد الفريق معرفته'))}</h4>
      <div className="tj-questions">
        {QUESTIONS.map(question => <div key={question.tag}><b>{question.tag}</b><span>{say(question.text)}</span></div>)}
      </div>

      <h4 className="llm-sub ft-handson"><Icon name="layers" size={13}/>{say(t('The big picture: building the Omani heritage AI assistant', 'الصورة الكاملة: بناء المساعد الذكي للتراث العُماني'))}</h4>
      <TurathOverview/>

      <TurathJourney/>

      <h4 className="llm-sub ft-handson"><Icon name="file" size={13}/>{say(t('Build a TurathAI training example yourself', 'ابنِ مثال تدريب لتراث AI بنفسك'))}</h4>
      <DatasetBuilder/>

      <h4 className="llm-sub ft-handson"><Icon name="chip" size={13}/>{say(t('Will a 27-billion-weight model fit?', 'هل يتسع نموذج بسبعة وعشرين مليار وزن؟'))}</h4>
      <GpuPlan/>

      <h4 className="llm-sub ft-handson"><Icon name="code" size={13}/>{say(t('Their training code with Unsloth', 'شيفرة التدريب الخاصة بهم مع Unsloth'))}</h4>
      <TurathCode/>
      <p className="tj-hint">{say(t('Based on Unsloth’s Qwen3.8-27B guide. Qwen3.8-27B can also read images, so the vision layers are left untouched. Check the official notebook for your library versions before running.',
        'مبنية على دليل Unsloth لنموذج Qwen3.8-27B. يستطيع Qwen3.8-27B قراءة الصور أيضًا، لذلك تُترك طبقات الرؤية دون تدريب. راجع الدفتر الرسمي لإصدارات مكتباتك قبل التشغيل.'))}</p>

      <h4 className="llm-sub ft-handson"><Icon name="network" size={13}/>{say(t('After training: answering with sources', 'بعد التدريب: الإجابة مع المصادر'))}</h4>
      <div className="tj-roles">
        <div><strong>{say(t('Fine-tuning changes how the model answers', 'الضبط الدقيق يغيّر طريقة إجابة النموذج'))}</strong>
          <p>{say(t('Its Arabic style, the heritage vocabulary, and what it knows well. Changing it means training again.', 'أسلوبه العربي، ومفردات التراث، وما يعرفه جيدًا. وتغييره يعني التدريب من جديد.'))}</p></div>
        <div><strong>{say(t('The archive (RAG) changes what it can cite', 'الأرشيف (RAG) يغيّر ما يستطيع الاستشهاد به'))}</strong>
          <p>{say(t('Verified passages with their sources. Adding a record needs no training at all.', 'مقاطع موثَّقة مع مصادرها. وإضافة سجل لا تحتاج إلى أي تدريب.'))}</p></div>
      </div>
      <RagLink/>

      <h4 className="llm-sub ft-handson"><Icon name="target" size={13}/>{say(t('Be the reviewer: score three answers', 'كن المراجع: قيّم ثلاث إجابات'))}</h4>
      <Evaluate/>

      <h4 className="llm-sub ft-handson"><Icon name="check" size={13}/>{say(t('Plan your own project: the eight phases', 'خطّط لمشروعك: المراحل الثماني'))}</h4>
      <Checklist/>
    </div>
  </section>;
}
