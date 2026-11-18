/**
 * Four more "watch it happen" scenes for the fine-tuning lab, built from the course notes:
 * the key words as one loop, how documents become JSONL training lines, the kitchen analogy
 * for Unsloth, and one training step from example to update. Every part can be clicked.
 */
import type { ReactNode } from 'react';
import './lesson-scenes.css';
import { useI18n } from './i18n';
import { Hotspots, Lock, Scene, packet, show, t, usePlayer, useTx } from './FineTuneScenes';
import type { Figure } from './FineTuneScenes';
import { TermStepDetail } from './TermSteps';

/** SVG text that reads correctly in Arabic too. The picture itself stays left-to-right. */
export function Txt({ x, y, children, anchor = 'middle', className = 'ft-tiny' }: {
  x: number; y: number; children: ReactNode; anchor?: 'start' | 'middle' | 'end'; className?: string;
}) {
  const { isArabic } = useI18n();
  const flipped = !isArabic ? anchor : anchor === 'start' ? 'end' : anchor === 'end' ? 'start' : 'middle';
  return <text className={className} x={x} y={y} textAnchor={flipped} direction={isArabic ? 'rtl' : undefined}>{children}</text>;
}

const cls = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

// ======================================================= 1 the key words loop

const NODES = [
  { x: 150, y: 52, name: t('Parameter', 'المعامل'), sub: t('a learned number', 'رقم متعلَّم') },
  { x: 380, y: 40, name: t('Frozen', 'مجمَّد'), sub: t('not updated, still active', 'لا يُحدَّث لكنه يعمل') },
  { x: 610, y: 52, name: t('Trainable', 'قابل للتدريب'), sub: t('the adapter A·B', 'المهايئ A·B') },
  { x: 676, y: 175, name: t('Activation', 'التنشيط'), sub: t('forward pass', 'التمرير الأمامي') },
  { x: 610, y: 298, name: t('Loss', 'الخسارة'), sub: t('how wrong?', 'كم الخطأ؟') },
  { x: 380, y: 310, name: t('Gradient', 'التدرّج'), sub: t('backward pass', 'التمرير الخلفي') },
  { x: 150, y: 298, name: t('Optimizer', 'المحسّن'), sub: t('the update', 'التحديث') },
  { x: 84, y: 175, name: t('Batch · epoch', 'الدفعة · الحقبة'), sub: t('repeat', 'كرّر') },
];
const LOOP = 'M150 52 L380 40 L610 52 Q 700 80 676 175 Q 700 270 610 298 L380 310 L150 298 Q 60 270 84 175 Q 60 80 150 52 Z';
const T_MAIN = 'M 278 170 C 292 158 298 153 312 153 L 440 153 C 458 153 462 168 468 172';
const T_SIDE = 'M 278 180 C 292 196 298 205 312 205 L 440 205 C 458 205 462 184 468 178';
const T_OUT = 'M 490 175 L 500 175';

const TERM_STEPS = [
  { title: t('Parameters: the numbers a model is made of', 'المعاملات: الأرقام التي يتكوّن منها النموذج'),
    text: t('Every small square here is a parameter, a learned number: a weight, or a bias added after. A layer multiplies its input x by the weights. A 27B model has 27 billion of them: numbers, not stored facts.',
      'كل مربع صغير هنا معامل، أي رقم متعلَّم: وزن، أو انحياز يُضاف بعده. والطبقة تضرب مدخلها x بالأوزان. ونموذج 27B فيه 27 مليارًا منها: أرقام لا حقائق مخزَّنة.') },
  { title: t('Frozen: locked, but still working', 'مجمَّد: مقفل لكنه ما زال يعمل'),
    text: t('The base weights W are frozen: training will never change them. But every input still passes through W. Frozen means not updated. It does not mean inactive.',
      'أوزان الأساس W مجمَّدة: لن يغيّرها التدريب أبدًا. لكن كل مدخل ما زال يمر عبر W. المجمَّد يعني أنه لا يُحدَّث، ولا يعني أنه لا يعمل.') },
  { title: t('Trainable: the small adapter that learns', 'قابل للتدريب: المهايئ الصغير الذي يتعلم'),
    text: t('The adapter A·B is the only part the optimizer may change. It is tiny next to W, and it starts so that it changes nothing.',
      'المهايئ A·B هو الجزء الوحيد الذي يُسمح للمحسّن بتغييره. وهو صغير جدًا بجانب W، ويبدأ بحيث لا يغيّر شيئًا.') },
  { title: t('Activation: the forward pass', 'التنشيط: التمرير الأمامي'),
    text: t('The input flows through W and through A·B at the same time. The in-between values are activations; the two results are added into the output ŷ.',
      'يسري المدخل عبر W وعبر A·B في الوقت نفسه. والقيم الوسيطة هي التنشيطات، وتُجمع النتيجتان في المخرج ŷ.') },
  { title: t('Loss: how far from the target?', 'الخسارة: كم نبعد عن الهدف؟'),
    text: t('The output is compared with the target answer. The loss is one number: big when the prediction is far off, small when it is close.',
      'يُقارن المخرج بالإجابة المستهدفة. والخسارة رقم واحد: كبير حين يبتعد التوقع، وصغير حين يقترب.') },
  { title: t('Gradient: the backward pass', 'التدرّج: التمرير الخلفي'),
    text: t('The error travels back. It passes through W, because the path needs it, but W stores no gradient and gets no update. It lands on A and B.',
      'يعود الخطأ إلى الخلف. ويمر عبر W لأن المسار يحتاجه، لكن W لا تخزّن تدرّجًا ولا تُحدَّث. ويستقر على A و B.') },
  { title: t('Optimizer: change the adapter a little', 'المحسّن: غيّر المهايئ قليلًا'),
    text: t('The optimizer (for example AdamW) moves each number in A and B a small step against its gradient. The learning rate sets the step size. W stays exactly the same.',
      'يحرّك المحسّن (مثل AdamW) كل رقم في A و B خطوة صغيرة عكس تدرّجه. ومعدل التعلم يحدد حجم الخطوة. وتبقى W كما هي تمامًا.') },
  { title: t('Batch, step, epoch: repeat', 'الدفعة والخطوة والحقبة: كرّر'),
    text: t('The next batch of examples comes in and the loop runs again. One loop = one step; one pass over all the training examples = one epoch.',
      'تدخل الدفعة التالية من الأمثلة وتدور الحلقة من جديد. الدورة الواحدة = خطوة، والمرور على كل أمثلة التدريب = حقبة.') },
];

const TERM_FIGURES: Figure[] = [
  { id: 'w', title: t('W, the frozen base', 'W، الأساس المجمَّد'), areas: [[306, 124, 140, 58]],
    what: t('The blue block is one weight matrix of the base model, with a lock: its numbers are frozen.', 'الكتلة الزرقاء مصفوفة أوزان واحدة من النموذج الأساسي، وعليها قفل: أرقامها مجمَّدة.'),
    why: t('It holds what the model already knows. It is used in every calculation and never changed, so nothing is forgotten.', 'تحمل ما يعرفه النموذج مسبقًا. وتُستخدم في كل حساب ولا تتغير، فلا يُنسى شيء.') },
  { id: 'ab', title: t('A·B, the adapter', 'A·B، المهايئ'), areas: [[306, 188, 140, 36]],
    what: t('The orange strip is the LoRA adapter: two small matrices, A then B, beside W.', 'الشريط البرتقالي مهايئ LoRA: مصفوفتان صغيرتان A ثم B بجانب W.'),
    why: t('All the learning goes here. It is less than 1% of the model, so training it needs little memory.', 'كل التعلّم يذهب إليه. وهو أقل من 1٪ من النموذج، فلا يحتاج تدريبه إلا إلى ذاكرة قليلة.') },
  { id: 'xy', title: t('x and ŷ', 'x و ŷ'), areas: [[244, 157, 36, 36], [496, 157, 36, 36]],
    what: t('x is the input to the layer; ŷ (“y-hat”) is the layer’s output, the model’s prediction.', 'x مدخل الطبقة، و ŷ (“واي هات”) مخرج الطبقة، أي توقّع النموذج.'),
    why: t('ŷ = W·x + s·B(A·x): the frozen answer plus the adapter’s small correction.', 'ŷ = W·x + s·B(A·x): إجابة الأساس المجمَّد مع تصحيح المهايئ الصغير.') },
  { id: 'nodes', title: t('The eight words around the loop', 'الكلمات الثماني حول الحلقة'), areas: NODES.map(node => [node.x - 74, node.y - 22, 148, 44] as [number, number, number, number]),
    what: t('Each box is one key word, placed in the order it happens during one round of training.', 'كل صندوق كلمة أساسية، موضوعة بترتيب حدوثها في دورة تدريب واحدة.'),
    why: t('Training is these steps going round and round: forward, loss, backward, update, next batch.', 'التدريب هو هذه الخطوات تدور مرة بعد مرة: أمامي، خسارة، خلفي، تحديث، الدفعة التالية.'),
    now: step => t(`Now: ${NODES[step].name.en} — ${NODES[step].sub.en}.`, `الآن: ${NODES[step].name.ar} — ${NODES[step].sub.ar}.`) },
];

export function TermsScene() {
  const say = useTx();
  const player = usePlayer(TERM_STEPS.length);
  const { step } = player;
  return <Scene id="ft-scene-terms" title={t('The key words, in the order they happen', 'الكلمات الأساسية بترتيب حدوثها')}
    steps={TERM_STEPS} player={player} figures={TERM_FIGURES} detail={<TermStepDetail step={step} go={player.go}/>}>
    <svg viewBox="0 0 760 340" className={`ft-svg ls-terms step-${step}`} role="img" aria-label={say(TERM_STEPS[step].title)}>
      <path className="ls-loop" d={LOOP}/>
      <circle className="ft-packet" r="4.5" style={packet(LOOP, 0, { animationName: 'ft-orbit', animationDuration: '9s' })}/>

      {/* the layer in the middle */}
      <circle className="ft-io" cx="262" cy="175" r="16"/><text className="ft-io-text" x="262" y="180" textAnchor="middle">x</text>
      <path className="ft-wire" d={T_MAIN}/><path className="ft-wire hot" d={T_SIDE}/><path className="ft-wire" d={T_OUT}/>
      <g className={cls('ls-w', step === 0 && 'lit', step === 1 && 'lit')}>
        <rect x="312" y="128" width="128" height="50" rx="8"/>
        {Array.from({ length: 24 }, (_, index) => <rect key={index} className="ls-cell" x={318 + (index % 8) * 14.5} y={133 + Math.floor(index / 8) * 13}
          width="12" height="10.5" rx="2" style={{ opacity: 0.25 + ((index * 37) % 11) / 16 }}/>)}
        <g className={show(step >= 1)}><Lock x={430} y={138} size={0.9}/></g>
      </g>
      <g className={cls('ls-ab', (step === 0 || step === 2 || step === 6) && 'lit')}>
        <rect x="312" y="192" width="128" height="26" rx="7"/>
        {Array.from({ length: 8 }, (_, index) => <rect key={index} className={cls('ls-cell', step >= 6 && 'learned')} x={318 + index * 15} y="197"
          width="12" height="16" rx="2" style={{ opacity: step >= 6 ? 0.45 + (index % 3) * 0.25 : 0.35 }}/>)}
      </g>
      <Txt x={376} y={121}>{say(t('W · frozen', 'W · مجمَّدة'))}</Txt>
      <Txt x={376} y={233}>{say(t('A·B · trainable', 'A·B · قابل للتدريب'))}</Txt>
      <circle className="ft-io" cx="478" cy="175" r="11"/><text className="ft-io-text" x="478" y="180" textAnchor="middle">+</text>
      <circle className="ft-io" cx="514" cy="175" r="16"/><text className="ft-io-text" x="514" y="180" textAnchor="middle">ŷ</text>

      {step === 3 && [0, 1, 2].map(index => <circle key={`m${index}`} className="ft-packet" r="4.5" style={packet(T_MAIN, -index * 0.8)}/>)}
      {step === 3 && [0, 1, 2].map(index => <circle key={`s${index}`} className="ft-packet hot" r="4" style={packet(T_SIDE, -index * 0.8 - 0.4)}/>)}
      {step === 5 && [0, 1, 2].map(index => <circle key={`bm${index}`} className="ft-packet error back" r="4.5" style={packet(T_MAIN, -index * 0.8)}/>)}
      {step === 5 && [0, 1, 2].map(index => <circle key={`bs${index}`} className="ft-packet error back" r="4.5" style={packet(T_SIDE, -index * 0.8 - 0.4)}/>)}

      {/* the worked example's numbers, step by step */}
      <g className={show(step <= 1)}>
        <text className="ls-value" x="376" y="104" textAnchor="middle" direction="ltr">w = [0.5, 0.4] · b = 0.2</text>
      </g>
      <g className={show(step >= 3)}>
        <text className="ls-value" x="262" y="208" textAnchor="middle">[2, 3]</text>
        <text className="ls-value hot" x="514" y="208" textAnchor="middle" key={`y${step >= 7}`}>{step >= 7 ? '2.65' : '2.4'}</text>
      </g>
      <g className={show(step === 2)}>
        <text className="ls-value warm" x="376" y="250" textAnchor="middle">Δ = [0, 0]</text>
      </g>
      <g className={show(step === 4)}>
        <Txt x={514} y={226} className="ft-tiny strong warm">{say(t('target y = 3.2', 'الهدف y = 3.2'))}</Txt>
        <Txt x={514} y={242} className="ft-tiny strong warm">{say(t('loss = 0.64', 'الخسارة = 0.64'))}</Txt>
      </g>
      <g className={show(step === 5)}>
        <Txt x={376} y={112} className="ft-note">{say(t('gradient passes through · no update', 'التدرّج يمر · لا تحديث'))}</Txt>
        <text className="ls-value warm" x="376" y="250" textAnchor="middle">∇Δ = [−3.2, −4.8]</text>
      </g>
      <g className={show(step === 6)}>
        <text className="ls-value warm" x="376" y="250" textAnchor="middle">Δ = [0.038, 0.058]</text>
      </g>
      <g className={show(step === 7)}>
        <Txt x={514} y={226} className="ft-tiny strong">{say(t('loss 0.64 → 0.30', 'الخسارة 0.64 ← 0.30'))}</Txt>
      </g>
      <g className={show(step === 7)}>
        {[0, 1, 2].map(index => <rect key={index} className="ls-card" x={196 - index * 5} y={120 + index * 6} width="34" height="24" rx="4"/>)}
        <Txt x={196} y={168} className="ft-tiny strong">{say(t('next batch', 'الدفعة التالية'))}</Txt>
      </g>

      {NODES.map((node, index) => <g key={index} className={cls('ls-node', index === step && 'current', index < step && 'done')}>
        <rect x={node.x - 72} y={node.y - 20} width="144" height="40" rx="12"/>
        <text className="ls-node-number" x={node.x - 60} y={node.y + 4} textAnchor="middle">{index + 1}</text>
        <Txt x={node.x + 6} y={node.y - 2} className="ls-node-name">{say(node.name)}</Txt>
        <Txt x={node.x + 6} y={node.y + 12} className="ft-tiny">{say(node.sub)}</Txt>
      </g>)}
      <Hotspots/>
    </svg>
  </Scene>;
}

// ====================================================== 2 documents to JSONL

const STATIONS = [t('Collect', 'اجمع'), t('Extract', 'استخرج'), t('Describe', 'وثّق'), t('Clean', 'نظّف'),
  t('Write pairs', 'اكتب الأزواج'), t('JSONL', 'JSONL'), t('Split', 'قسّم'), t('Tokens', 'الرموز')];

const DOC_STEPS = [
  { title: t('Collect sources you may use', 'اجمع مصادر يحق لك استخدامها'),
    text: t('Start from reliable, authorized material: books (often PDF), recorded interviews, scanned pages. Keep the permission and who to credit with each source from the very start.',
      'ابدأ من مواد موثوقة مأذون بها: كتب (غالبًا PDF)، ومقابلات مسجلة، وصفحات ممسوحة ضوئيًا. واحفظ الإذن ومن يجب نسبة الفضل إليه مع كل مصدر منذ البداية.') },
  { title: t('Turn everything into text', 'حوّل كل شيء إلى نص'),
    text: t('A model can only learn from text. PDFs and scans go through OCR, audio goes through transcription. Both make mistakes, especially with local names, so a person must review them.',
      'النموذج لا يتعلم إلا من النص. فتمر ملفات PDF والصور الممسوحة بالتعرف الضوئي على الحروف (OCR)، ويمر الصوت بالتفريغ النصي. وكلاهما يخطئ، خاصةً في الأسماء المحلية، لذلك يجب أن يراجعها شخص.') },
  { title: t('Record where each passage came from', 'سجّل مصدر كل مقطع'),
    text: t('Each passage gets its metadata: source title, page or timestamp, place, narrator where appropriate, and which variant of a story it is. This is kept beside the data for checking and for splitting.',
      'يحصل كل مقطع على بياناته الوصفية: عنوان المصدر، والصفحة أو التوقيت، والمكان، والراوي عند الحاجة، وأي رواية من القصة هو. وتُحفظ بجانب البيانات للتدقيق والتقسيم.') },
  { title: t('Remove duplicates and unsupported claims', 'احذف المكرر والادعاءات غير المدعومة'),
    text: t('Near-duplicate passages are removed, so the model does not over-learn them and they cannot leak into the test set. Claims no source supports are removed too.',
      'تُحذف المقاطع شبه المكررة كي لا يفرط النموذج في تعلّمها ولا تتسرب إلى مجموعة الاختبار. وتُحذف كذلك الادعاءات التي لا يدعمها مصدر.') },
  { title: t('Write questions and reviewed answers', 'اكتب أسئلة وإجابات مراجَعة'),
    text: t('From each passage, write clear prompts and target answers that an expert has checked. Include examples where the honest answer is “the sources disagree” or “the evidence does not say”.',
      'من كل مقطع اكتب أسئلة واضحة وإجابات مستهدفة راجعها خبير. وأضف أمثلة تكون الإجابة الأمينة فيها “المصادر مختلفة” أو “الدليل لا يذكر ذلك”.') },
  { title: t('Save each pair as one JSONL line', 'احفظ كل زوج سطرًا واحدًا في JSONL'),
    text: t('Each question–answer pair becomes one JSON object on one line, in UTF-8 so Arabic is kept as it is. The field names must match what your training code expects.',
      'يصبح كل زوج سؤال وجواب كائن JSON واحدًا في سطر واحد، بترميز UTF-8 فتبقى العربية كما هي. ويجب أن تطابق أسماء الحقول ما تتوقعه شيفرة التدريب.') },
  { title: t('Split by source, not by line', 'قسّم حسب المصدر لا حسب السطر'),
    text: t('About 80% for training, 10% for validation, 10% for the final test. Lines from the same source or story stay together, so the test really is unseen.',
      'نحو 80٪ للتدريب و 10٪ للتحقق و 10٪ للاختبار النهائي. وتبقى أسطر المصدر أو القصة الواحدة معًا، فيكون الاختبار جديدًا فعلًا على النموذج.') },
  { title: t('Template, then tokens', 'القالب ثم الرموز'),
    text: t('At training time each line is wrapped in the model’s chat template and cut into tokens with ID numbers. Prompt tokens are usually masked (label −100), so the model is trained on the answer only.',
      'عند التدريب يُغلَّف كل سطر بقالب المحادثة الخاص بالنموذج ويُقطَّع إلى رموز لها أرقام. وعادةً تُحجب رموز السؤال (التسمية −100) فيتدرب النموذج على الإجابة وحدها.') },
];

const DOC_FIGURES: Figure[] = [
  { id: 'track', title: t('The station track', 'مسار المحطات'), areas: [[12, 296, 740, 38]],
    what: t('The eight stations along the bottom are the order of work, from raw sources to tokens. The lit one is the current step.', 'المحطات الثماني في الأسفل ترتيب العمل، من المصادر الخام إلى الرموز. والمضيئة هي الخطوة الحالية.'),
    why: t('Skipping a station shows up later: unreviewed OCR becomes wrong answers, missing metadata makes a fair split impossible.', 'تخطي محطة يظهر لاحقًا: OCR غير المراجَع يصبح إجابات خاطئة، وغياب البيانات الوصفية يجعل التقسيم العادل مستحيلًا.') },
  { id: 'panel', title: t('The work area', 'منطقة العمل'), areas: [[12, 8, 740, 280]],
    what: t('The big area shows what happens to the material at this station.', 'المنطقة الكبيرة تعرض ما يحدث للمادة في هذه المحطة.'),
    why: t('Every document, whatever it started as, ends as text, and the training text is stored as JSONL lines.', 'كل مستند، أيًّا كان أصله، ينتهي نصًا، ويُخزَّن نص التدريب أسطرًا في JSONL.'),
    now: step => DOC_STEPS[step].text },
];

const SOURCES = [
  { name: t('Book (PDF)', 'كتاب (PDF)'), kind: 'book' },
  { name: t('Interview (audio)', 'مقابلة (صوت)'), kind: 'audio' },
  { name: t('Scanned page', 'صفحة ممسوحة'), kind: 'scan' },
];

function SourceIcon({ kind, x, y }: { kind: string; x: number; y: number }) {
  if (kind === 'book') return <g className="ls-icon" transform={`translate(${x} ${y})`}>
    <path d="M0 4 Q 18 -2 34 6 Q 50 -2 68 4 V 52 Q 50 46 34 54 Q 18 46 0 52 Z"/><path d="M34 6 V 54" className="ls-icon-line"/>
    {[14, 22, 30, 38].map(line => <g key={line}><path className="ls-icon-line" d={`M7 ${line} H27`}/><path className="ls-icon-line" d={`M41 ${line} H61`}/></g>)}
  </g>;
  if (kind === 'audio') return <g className="ls-icon" transform={`translate(${x} ${y})`}>
    <rect x="24" y="0" width="20" height="34" rx="10"/><path className="ls-icon-line" d="M16 24 Q 16 44 34 44 Q 52 44 52 24 M34 44 V 54"/>
    {[0, 1, 2, 3, 4, 5, 6].map(index => <rect key={index} className="ls-wave" x={58 + index * 5} y={26 - [6, 12, 18, 9, 14, 5, 10][index]} width="3" height={[6, 12, 18, 9, 14, 5, 10][index] * 2} rx="1.5"/>)}
  </g>;
  return <g className="ls-icon" transform={`translate(${x} ${y})`}>
    <path d="M6 0 H 52 L 64 12 V 56 H 6 Z"/><path className="ls-icon-line" d="M52 0 V 12 H 64"/>
    {[18, 26, 34, 42].map(line => <path key={line} className="ls-icon-line wavy" d={`M13 ${line} q 5 -3 10 0 t 10 0 t 10 0 t 10 0`}/>)}
  </g>;
}

const SPLIT_LINES = [0, 0, 0, 1, 1, 1, 2, 2, 3, 4];
const SPLIT_TARGET = (index: number) => {
  const group = SPLIT_LINES[index];
  if (group <= 2) return { x: 300 + (index % 4) * 50, y: 120 + Math.floor(index / 4) * 34 };
  return group === 3 ? { x: 546, y: 120 } : { x: 650, y: 120 };
};

export function DocsScene() {
  const say = useTx();
  const { isArabic } = useI18n();
  const player = usePlayer(DOC_STEPS.length);
  const { step } = player;
  const q = say(t('What is Al-Bar’ah?', 'ما هي البرعة؟'));
  const tokens = isArabic
    ? [['<|im_start|>', 'p'], ['user', 'p'], ['ما', 'p'], ['هي', 'p'], ['ال', 'p'], ['برعة', 'p'], ['؟', 'p'], ['<|im_end|>', 'p'],
      ['<|im_start|>', 'p'], ['assistant', 'p'], ['ال', 'a'], ['برعة', 'a'], ['فن', 'a'], ['أد', 'a'], ['ائي', 'a'], ['من', 'a'], ['ظفار', 'a'], ['<|im_end|>', 'a']]
    : [['<|im_start|>', 'p'], ['user', 'p'], ['What', 'p'], [' is', 'p'], [' Al', 'p'], ['-Bar', 'p'], ['’ah', 'p'], ['?', 'p'], ['<|im_end|>', 'p'],
      ['<|im_start|>', 'p'], ['assistant', 'p'], ['Al', 'a'], ['-Bar', 'a'], ['’ah', 'a'], [' is', 'a'], [' a', 'a'], [' perform', 'a'], ['ing', 'a'], [' art', 'a'], ['<|im_end|>', 'a']];
  // lay the tokens out in reading order: left to right in English, right to left in Arabic
  const rows: { text: string; kind: string; x: number; y: number; w: number; id: number }[] = [];
  let cursor = 0; let row = 0;
  tokens.forEach(([text, kind], index) => {
    const w = Math.max(26, text.length * 7 + 12);
    if (cursor + w > 700) { cursor = 0; row += 1; }
    const x = isArabic ? 730 - cursor - w : 30 + cursor;
    rows.push({ text, kind, x, y: 120 + row * 70, w, id: 1000 + ((index * 7919) % 90000) });
    cursor += w + 6;
  });
  return <Scene id="ft-scene-docs" title={t('From documents to JSONL training lines', 'من المستندات إلى أسطر تدريب JSONL')}
    steps={DOC_STEPS} player={player} figures={DOC_FIGURES}>
    <svg viewBox="0 0 760 340" className={`ft-svg ls-docs step-${step}`} role="img" aria-label={say(DOC_STEPS[step].title)}>
      {/* 1 collect */}
      <g className={show(step === 0)}>
        {SOURCES.map((source, index) => <g key={source.kind} className={show(step === 0)} style={{ transitionDelay: `${index * 0.35}s` }}>
          <rect className="ls-panel" x={70 + index * 220} y="50" width="180" height="200" rx="16"/>
          <SourceIcon kind={source.kind} x={116 + index * 220} y={78}/>
          <Txt x={160 + index * 220} y={170} className="ft-label">{say(source.name)}</Txt>
          <rect className="ls-badge ok" x={92 + index * 220} y="186" width="136" height="22" rx="11"/>
          <Txt x={160 + index * 220} y={201} className="ls-badge-text">{say(t('permission ✓', 'الإذن ✓'))}</Txt>
          <rect className="ls-badge" x={92 + index * 220} y="214" width="136" height="22" rx="11"/>
          <Txt x={160 + index * 220} y={229} className="ls-badge-text">{say(t('who to credit', 'لمن يُنسب الفضل'))}</Txt>
        </g>)}
      </g>

      {/* 2 extract */}
      <g className={show(step === 1)}>
        <SourceIcon kind="scan" x={70} y={70}/>
        <SourceIcon kind="audio" x={60} y={170}/>
        <path className="ft-wire" d="M 160 150 L 300 150"/>
        {step === 1 && [0, 1, 2].map(index => <rect key={index} className="ft-doc" x="-5" y="-7" width="10" height="14" rx="1.5"
          style={packet('M 160 150 L 300 150', -index * 0.7, { animationDuration: '2.1s' })}/>)}
        <Txt x={230} y={138} className="ft-tiny strong">{say(t('OCR · transcription', 'OCR · تفريغ نصي'))}</Txt>
        <rect className="ls-panel" x="310" y="60" width="420" height="190" rx="14"/>
        {[84, 104, 124].map(y => <rect key={y} className="ls-textline" x="330" y={y} width={y === 104 ? 300 : 370} height="8" rx="4"/>)}
        <Txt x={520} y={162} className="ls-ocr">{say(t('…a dance of the ', '…رقصة من أودية '))}<tspan className="wrong">{say(t('Dh0fari', 'طفار'))}</tspan>{say(t(' valleys…', '…'))}</Txt>
        <g className="ls-fix">
          <Txt x={520} y={192} className="ls-ocr">{say(t('reviewed by a person: ', 'راجعه شخص: '))}<tspan className="right">{say(t('Dhofari ✓', 'ظفار ✓'))}</tspan></Txt>
        </g>
        <Txt x={520} y={228} className="ft-tiny">{say(t('machines misread local names: always check', 'الآلات تخطئ في الأسماء المحلية: راجع دائمًا'))}</Txt>
      </g>

      {/* 3 describe */}
      <g className={show(step === 2)}>
        <rect className="ls-panel" x="250" y="70" width="260" height="150" rx="14"/>
        {[94, 112, 130, 148, 166, 184].map((y, index) => <rect key={y} className="ls-textline" x="270" y={y} width={index % 2 ? 190 : 220} height="8" rx="4"/>)}
        {[
          { x: 40, y: 64, label: t('source: UNESCO ICH, 2010', 'المصدر: اليونسكو، 2010'), to: [250, 90] },
          { x: 40, y: 132, label: t('page / timestamp: p. 3', 'الصفحة / التوقيت: ص 3'), to: [250, 145] },
          { x: 40, y: 200, label: t('place: Dhofar', 'المكان: ظفار'), to: [250, 200] },
          { x: 540, y: 64, label: t('narrator: (if any)', 'الراوي: (إن وُجد)'), to: [510, 90] },
          { x: 540, y: 132, label: t('story group: al-barah', 'مجموعة القصة: البرعة'), to: [510, 145] },
          { x: 540, y: 200, label: t('variant: account A', 'الرواية: الرواية أ'), to: [510, 200] },
        ].map((tag, index) => <g key={index} className={show(step === 2)} style={{ transitionDelay: `${0.2 + index * 0.25}s` }}>
          <path className="ft-wire dim" d={`M ${tag.x < 250 ? tag.x + 180 : tag.x} ${tag.y + 14} L ${tag.to[0]} ${tag.to[1]}`}/>
          <rect className="ls-tag" x={tag.x} y={tag.y} width="180" height="28" rx="9"/>
          <Txt x={tag.x + 90} y={tag.y + 18} className="ls-tag-text">{say(tag.label)}</Txt>
        </g>)}
        <Txt x={380} y={250} className="ft-tiny">{say(t('metadata travels with the text, but is not trained on unless you choose to', 'البيانات الوصفية ترافق النص، لكن لا يُتدرَّب عليها إلا إن اخترت ذلك'))}</Txt>
      </g>

      {/* 4 clean */}
      <g className={show(step === 3)}>
        {[0, 1, 2, 3].map(index => {
          const duplicate = index === 2;
          const unsupported = index === 3;
          return <g key={index} className={cls('ls-clean', duplicate && 'duplicate', unsupported && 'unsupported')}>
            <rect className="ls-panel" x={50 + index * 172} y="70" width="150" height="130" rx="12"/>
            {[92, 108, 124, 140, 156].map((y, line) => <rect key={y} className={cls('ls-textline', (index === 1 || index === 2) && 'same')}
              x={64 + index * 172} y={y} width={line % 2 ? 100 : 122} height="7" rx="3.5"/>)}
            {duplicate && <><path className="ls-strike" d={`M ${56 + index * 172} 76 L ${194 + index * 172} 194`}/>
              <Txt x={125 + index * 172} y={226} className="ft-tiny strong warm">{say(t('duplicate of 2: removed', 'مكرر للثاني: حُذف'))}</Txt></>}
            {unsupported && <><circle className="ls-flag" cx={186 + index * 172} cy="80" r="12"/><text className="ls-flag-text" x={186 + index * 172} y="85" textAnchor="middle">!</text>
              <Txt x={125 + index * 172} y={226} className="ft-tiny strong warm">{say(t('no source: removed', 'بلا مصدر: حُذف'))}</Txt></>}
            {!duplicate && !unsupported && <Txt x={125 + index * 172} y={226} className="ft-tiny strong">{say(t('kept ✓', 'أُبقي ✓'))}</Txt>}
          </g>;
        })}
      </g>

      {/* 5 write pairs */}
      <g className={show(step === 4)}>
        <rect className="ls-panel" x="30" y="60" width="200" height="170" rx="14"/>
        {[84, 102, 120, 138, 156, 174, 192].map((y, index) => <rect key={y} className="ls-textline" x="48" y={y} width={index % 2 ? 130 : 160} height="7" rx="3.5"/>)}
        <path className="ft-wire" d="M 236 145 L 300 145"/>
        <g className={show(step === 4)} style={{ transitionDelay: '.3s' }}>
          <rect className="ls-bubble user" x="310" y="40" width="420" height="40" rx="12"/>
          <Txt x={520} y={65} className="ls-bubble-text">{say(t('Q: What is Al-Bar’ah?', 'س: ما هي البرعة؟'))}</Txt>
        </g>
        <g className={show(step === 4)} style={{ transitionDelay: '.9s' }}>
          <rect className="ls-bubble answer" x="310" y="90" width="420" height="58" rx="12"/>
          <Txt x={520} y={113} className="ls-bubble-text">{say(t('A: A performing art from the Dhofari valleys', 'ج: فن أدائي من أودية ظفار'))}</Txt>
          <Txt x={520} y={133} className="ls-bubble-text">{say(t('that combines dance, music and poetry. ✓ reviewed', 'يجمع الرقص والموسيقى والشعر. ✓ مراجَع'))}</Txt>
        </g>
        <g className={show(step === 4)} style={{ transitionDelay: '1.5s' }}>
          <rect className="ls-bubble user" x="310" y="166" width="420" height="34" rx="12"/>
          <Txt x={520} y={188} className="ls-bubble-text">{say(t('Q: Who first performed it?', 'س: من أول من أدّاها؟'))}</Txt>
          <rect className="ls-bubble honest" x="310" y="206" width="420" height="34" rx="12"/>
          <Txt x={520} y={228} className="ls-bubble-text">{say(t('A: The sources do not say; accounts differ.', 'ج: المصادر لا تذكر ذلك، والروايات تختلف.'))}</Txt>
        </g>
        <Txt x={130} y={252} className="ft-tiny">{say(t('one passage → several pairs', 'مقطع واحد ← عدة أزواج'))}</Txt>
      </g>

      {/* 6 JSONL */}
      <g className={show(step === 5)}>
        <rect className="ls-file" x="30" y="40" width="700" height="210" rx="14"/>
        <Txt x={60} y={66} anchor="start" className="ft-label">heritage_train.jsonl</Txt>
        <Txt x={700} y={66} anchor="end" className="ft-tiny">{say(t('one JSON object per line · UTF-8', 'كائن JSON واحد في كل سطر · UTF-8'))}</Txt>
        {[0, 1, 2].map(line => <g key={line} className={cls('ls-jline', line === 0 && 'fresh')} style={{ animationDelay: `${line * 0.5}s` }}>
          <rect className="ls-jrow" x="44" y={84 + line * 52} width="672" height="42" rx="8"/>
          <text className="ls-lineno" x="62" y={110 + line * 52} textAnchor="middle">{line + 1}</text>
          <text className="ls-json" x="80" y={110 + line * 52} direction="ltr">
            <tspan className="p">{'{"'}</tspan><tspan className="k">messages</tspan><tspan className="p">{'":[{"'}</tspan><tspan className="k">role</tspan>
            <tspan className="p">{'":"'}</tspan><tspan className="s">user</tspan><tspan className="p">{'","'}</tspan><tspan className="k">content</tspan><tspan className="p">{'":"'}</tspan>
            <tspan className="s" style={{ unicodeBidi: 'isolate' }} direction={isArabic ? 'rtl' : 'ltr'}>{line === 0 ? q : '…'}</tspan>
            <tspan className="p">{'"},{"'}</tspan><tspan className="k">role</tspan><tspan className="p">{'":"'}</tspan><tspan className="s">assistant</tspan><tspan className="p">{'",…}]}'}</tspan>
          </text>
        </g>)}
        <Txt x={380} y={272} className="ft-tiny">{say(t('a line break ends a record: a record may never spill onto a second line', 'نهاية السطر تنهي السجل: لا يجوز أن يمتد السجل إلى سطر ثانٍ'))}</Txt>
      </g>

      {/* 7 split */}
      <g className={show(step === 6)}>
        <rect className="ls-bin train" x="286" y="90" width="214" height="120" rx="12"/>
        <rect className="ls-bin val" x="526" y="90" width="80" height="120" rx="12"/>
        <rect className="ls-bin test" x="630" y="90" width="80" height="120" rx="12"/>
        <Txt x={393} y={80} className="ft-label">{say(t('Train · 80%', 'تدريب · 80٪'))}</Txt>
        <Txt x={566} y={80} className="ft-label">{say(t('Valid. · 10%', 'تحقق · 10٪'))}</Txt>
        <Txt x={670} y={80} className="ft-label">{say(t('Test · 10%', 'اختبار · 10٪'))}</Txt>
        {SPLIT_LINES.map((group, index) => {
          const target = SPLIT_TARGET(index);
          const start = { x: 50, y: 40 + index * 22 };
          const moved = step === 6;
          return <rect key={index} className={`ls-chunk g${group}`} width="40" height="16" rx="4"
            style={{ transform: `translate(${moved ? target.x : start.x}px, ${moved ? target.y : start.y}px)`, transitionDelay: `${0.4 + index * 0.12}s` }}/>;
        })}
        <Txt x={380} y={246} className="ft-tiny strong">{say(t('same colour = same source or story: it stays on one side', 'اللون نفسه = المصدر أو القصة نفسها: يبقى في جهة واحدة'))}</Txt>
        <Txt x={380} y={264} className="ft-tiny">{say(t('a random split by line would leak near-copies into the test', 'التقسيم العشوائي حسب السطر يسرّب نسخًا شبه مطابقة إلى الاختبار'))}</Txt>
      </g>

      {/* 8 tokens */}
      <g className={show(step === 7)}>
        <Txt x={380} y={50} className="ft-label">{say(t('chat template → tokens → ID numbers', 'قالب المحادثة ← رموز ← أرقام'))}</Txt>
        {rows.map((token, index) => <g key={index} className={cls('ls-token', token.kind === 'a' ? 'answer' : 'prompt')} style={{ animationDelay: `${index * 0.08}s` }}>
          <rect x={token.x} y={token.y - 34} width={token.w} height="26" rx="6"/>
          <text className="ls-token-text" x={token.x + token.w / 2} y={token.y - 16} textAnchor="middle">{token.text}</text>
          <text className="ls-token-id" x={token.x + token.w / 2} y={token.y + 4} textAnchor="middle">{token.kind === 'a' ? token.id : '−100'}</text>
        </g>)}
        <rect className="ls-key prompt" x="200" y="252" width="14" height="12" rx="3"/>
        <Txt x={220} y={262} anchor="start" className="ft-tiny">{say(t('prompt: masked, label −100', 'السؤال: محجوب، التسمية −100'))}</Txt>
        <rect className="ls-key answer" x="430" y="252" width="14" height="12" rx="3"/>
        <Txt x={450} y={262} anchor="start" className="ft-tiny">{say(t('answer: trained (made-up IDs)', 'الإجابة: يُتدرَّب عليها (أرقام توضيحية)'))}</Txt>
      </g>

      {/* the station track */}
      <path className="ls-track" d="M 60 314 L 700 314"/>
      {STATIONS.map((name, index) => <g key={index} className={cls('ls-station', index === step && 'current', index < step && 'done')}>
        <rect x={18 + index * 92} y="300" width="86" height="28" rx="9"/>
        <Txt x={61 + index * 92} y={318} className="ls-station-text">{`${index + 1} ${say(name)}`}</Txt>
      </g>)}
      <Hotspots/>
    </svg>
  </Scene>;
}

// ===================================================== 3 the kitchen analogy

const KITCHEN_STEPS = [
  { title: t('What we bring', 'ما نحضره'),
    text: t('Three ingredients: a pretrained model with its existing abilities, new LoRA adapters (trainable weights) and the heritage dataset: teaching examples in JSONL.',
      'ثلاثة مكونات: نموذج مدرَّب مسبقًا بقدراته الحالية، ومهايئات LoRA جديدة (أوزان قابلة للتدريب)، ومجموعة بيانات التراث: أمثلة تعليمية بصيغة JSONL.') },
  { title: t('Choose a method: the recipe', 'اختر طريقة: الوصفة'),
    text: t('The recipe is the training approach. LoRA: frozen base + trainable adapters. QLoRA: the same, with the frozen base stored in 4-bit to save memory.',
      'الوصفة هي طريقة التدريب. LoRA: أساس مجمَّد + مهايئات قابلة للتدريب. و QLoRA: الأمر نفسه، مع تخزين الأساس المجمَّد بدقة 4 بت لتوفير الذاكرة.') },
  { title: t('The chef and the tools', 'الطاهي والأدوات'),
    text: t('The chef is your code using Unsloth, with PyTorch and a trainer hanging on the rack. Unsloth is software: it helps run the kitchen. It is not a weight matrix and not a layer.',
      'الطاهي هو شيفرتك التي تستخدم Unsloth، ومعها PyTorch والمدرِّب معلّقان على الرف. و Unsloth برنامج: يساعد على تشغيل المطبخ. وليس مصفوفة أوزان ولا طبقة.') },
  { title: t('Into the oven', 'إلى الفرن'),
    text: t('The model and the adapters go onto the GPU together. The base gets a lock: its weights stay active but unchanged. The orange adapter is the only adjustable part.',
      'يدخل النموذج والمهايئات إلى بطاقة GPU معًا. ويُقفل الأساس: أوزانه تبقى عاملة لكنها لا تتغير. والمهايئ البرتقالي هو الجزء الوحيد القابل للتعديل.') },
  { title: t('The stove is the GPU', 'الموقد هو بطاقة GPU'),
    text: t('The GPU does the actual calculations, billions of multiplications per step. Unsloth’s job is to make them faster and lighter on memory: the gauge.',
      'بطاقة GPU تنفذ الحسابات الفعلية، مليارات عمليات الضرب في كل خطوة. ودور Unsloth جعلها أسرع وأخف على الذاكرة: هذا هو المؤشر.') },
  { title: t('Cooking: the training loop', 'الطهي: حلقة التدريب'),
    text: t('Predict → compare → update adapters → repeat. Only the adapter’s sliders move. The locked base keeps working in every prediction.',
      'توقّع ← قارن ← حدّث المهايئات ← كرّر. أزرار المهايئ وحدها تتحرك. والأساس المقفل يواصل العمل في كل توقّع.') },
  { title: t('The dish: base + trained adapters', 'الطبق: الأساس + المهايئات المدرَّبة'),
    text: t('The result is the matching base model working together with the trained heritage adapters. The adapter alone cannot answer: it needs its base.',
      'النتيجة النموذج الأساسي المطابق يعمل مع مهايئات التراث المدرَّبة. والمهايئ وحده لا يجيب: يحتاج إلى أساسه.') },
  { title: t('Taste test, and the limits of the picture', 'اختبار التذوق، وحدود الصورة'),
    text: t('Test on new questions the model never saw. Remember it is an analogy: the chef does not check historical truth or invent trustworthy sources. You choose the data, model, settings and evaluation.',
      'اختبر على أسئلة جديدة لم يرها النموذج. وتذكّر أنها تشبيه: الطاهي لا يتحقق من الحقيقة التاريخية ولا يصنع مصادر موثوقة. أنت من يختار البيانات والنموذج والإعدادات والتقييم.') },
];

const KITCHEN_FIGURES: Figure[] = [
  { id: 'model', title: t('The blue robot: pretrained model', 'الروبوت الأزرق: النموذج المدرَّب مسبقًا'), areas: [[24, 66, 160, 70]],
    what: t('The ingredient you start with: an open-weight model that already knows language.', 'المكوّن الذي تبدأ به: نموذج مفتوح الأوزان يعرف اللغة مسبقًا.'),
    why: t('Fine-tuning starts from its weights instead of from nothing, which is why it is cheap.', 'الضبط الدقيق يبدأ من أوزانه بدلًا من البدء من الصفر، ولهذا هو رخيص.') },
  { id: 'adapter', title: t('The orange box: LoRA adapters', 'الصندوق البرتقالي: مهايئات LoRA'), areas: [[24, 146, 160, 64]],
    what: t('The adjustable module with sliders stands for the new trainable weights, A and B.', 'الوحدة القابلة للتعديل ذات الأزرار تمثل الأوزان الجديدة القابلة للتدريب، A و B.'),
    why: t('These are the only knobs training can turn.', 'هذه هي الأزرار الوحيدة التي يستطيع التدريب تحريكها.') },
  { id: 'data', title: t('The book and the JSONL file: dataset', 'الكتاب وملف JSONL: البيانات'), areas: [[24, 222, 160, 100]],
    what: t('The heritage teaching examples, stored as JSONL lines.', 'أمثلة تعليم التراث، مخزَّنة أسطرًا في JSONL.'),
    why: t('The model can only learn what these examples show. Their quality decides the result.', 'لا يتعلم النموذج إلا ما تعرضه هذه الأمثلة. وجودتها تحدد النتيجة.') },
  { id: 'recipe', title: t('The recipe card: the method', 'بطاقة الوصفة: الطريقة'), areas: [[196, 214, 102, 92]],
    what: t('Choose a method: LoRA (frozen base + trainable adapters) or QLoRA (4-bit frozen base + trainable adapters).', 'اختر طريقة: LoRA (أساس مجمَّد + مهايئات قابلة للتدريب) أو QLoRA (أساس مجمَّد بدقة 4 بت + مهايئات قابلة للتدريب).'),
    why: t('The recipe is the training approach; it decides what is frozen and how the base is stored.', 'الوصفة هي طريقة التدريب، وتحدد ما يُجمَّد وكيف يُخزَّن الأساس.') },
  { id: 'chef', title: t('The chef: your code with Unsloth', 'الطاهي: شيفرتك مع Unsloth'), areas: [[300, 90, 92, 220]],
    what: t('The chef is your code using Unsloth and its supporting libraries.', 'الطاهي هو شيفرتك التي تستخدم Unsloth ومكتباته المساندة.'),
    why: t('It does the work, but the researcher still chooses the data, model, target modules, settings and evaluation.', 'ينفذ العمل، لكن الباحث ما زال يختار البيانات والنموذج والوحدات المستهدفة والإعدادات والتقييم.') },
  { id: 'rack', title: t('The tool rack', 'رف الأدوات'), areas: [[206, 34, 186, 50]],
    what: t('Unsloth + PyTorch + a trainer (such as TRL’s SFTTrainer).', 'Unsloth + PyTorch + مدرِّب (مثل SFTTrainer من TRL).'),
    why: t('PyTorch does the maths and the automatic gradients, the trainer runs the steps, Unsloth loads models and speeds things up.', 'ينفذ PyTorch الرياضيات والتدرجات التلقائية، ويدير المدرِّب الخطوات، ويحمّل Unsloth النماذج ويسرّع العمل.') },
  { id: 'oven', title: t('Inside the oven: base and adapter', 'داخل الفرن: الأساس والمهايئ'), areas: [[420, 104, 176, 132]],
    what: t('The base model with a lock (“active, unchanged”) and the orange adapter (“updated”).', 'النموذج الأساسي بقفل (“يعمل، لا يتغير”) والمهايئ البرتقالي (“يُحدَّث”).'),
    why: t('This is the whole idea of LoRA in one picture: the base calculates, the adapter learns.', 'هذه فكرة LoRA كلها في صورة واحدة: الأساس يحسب، والمهايئ يتعلم.') },
  { id: 'gpu', title: t('The stove: GPU', 'الموقد: بطاقة GPU'), areas: [[420, 244, 176, 66]],
    what: t('The GPU executes the calculations. The gauge stands for Unsloth’s optimizations of speed and memory.', 'تنفذ بطاقة GPU الحسابات. ويمثل المؤشر تحسينات Unsloth للسرعة والذاكرة.'),
    why: t('Savings vary with the model and settings: Unsloth cannot make every model fit on every GPU.', 'تختلف المكاسب حسب النموذج والإعدادات: Unsloth لا يجعل كل نموذج يتسع لكل بطاقة GPU.') },
  { id: 'loop', title: t('The speech bubble: training loop', 'فقاعة الكلام: حلقة التدريب'), areas: [[400, 28, 200, 50]],
    what: t('Predict → compare → update adapters → repeat.', 'توقّع ← قارن ← حدّث المهايئات ← كرّر.'),
    why: t('Forward pass, loss, backward pass and optimizer step, again and again. See Part 9 for one step in detail.', 'تمرير أمامي، خسارة، تمرير خلفي، خطوة محسّن، مرة بعد مرة. وانظر الجزء 9 لخطوة واحدة بالتفصيل.') },
  { id: 'output', title: t('The dish: the output', 'الطبق: المخرج'), areas: [[616, 40, 136, 290]],
    what: t('The matching base model plus the trained heritage adapters, answering questions about Omani heritage, and tested on new questions.', 'النموذج الأساسي المطابق مع مهايئات التراث المدرَّبة، يجيب عن أسئلة التراث العُماني، ويُختبر على أسئلة جديدة.'),
    why: t('Only the test on unseen questions shows whether the model really improved.', 'وحده الاختبار على أسئلة لم يرها النموذج يبيّن هل تحسّن فعلًا.') },
];

function Robot({ x, y, scale = 1, locked = false }: { x: number; y: number; scale?: number; locked?: boolean }) {
  return <g className="ls-robot" transform={`translate(${x} ${y}) scale(${scale})`}>
    <rect className="body" x="0" y="8" width="66" height="50" rx="10"/>
    <rect className="screen" x="12" y="16" width="42" height="24" rx="6"/>
    <path className="eye" d="M20 29 q 4 -5 8 0 M38 29 q 4 -5 8 0"/>
    <path className="eye" d="M28 34 q 5 4 10 0"/>
    <circle className="gear" cx="0" cy="40" r="10"/><circle className="gear-hole" cx="0" cy="40" r="4"/>
    {[0, 1, 2, 3].map(index => <rect key={index} className="vent" x={40 + index * 5} y="44" width="3" height="9" rx="1"/>)}
    {locked && <Lock x={58} y={10} size={1.1}/>}
  </g>;
}

function Adapter({ x, y, scale = 1, moving = false }: { x: number; y: number; scale?: number; moving?: boolean }) {
  return <g className={cls('ls-adapter', moving && 'moving')} transform={`translate(${x} ${y}) scale(${scale})`}>
    <rect className="box" x="0" y="0" width="56" height="44" rx="9"/>
    {[0, 1, 2].map(index => <g key={index}>
      <path className="track" d={`M ${14 + index * 14} 9 V 35`}/>
      <rect className="knob" x={9 + index * 14} y={[12, 22, 16][index]} width="10" height="7" rx="2" style={{ animationDelay: `${-index * 0.45}s` }}/>
    </g>)}
  </g>;
}

export function KitchenScene() {
  const say = useTx();
  const { isArabic } = useI18n();
  const player = usePlayer(KITCHEN_STEPS.length);
  const { step } = player;
  const focus = (...steps: number[]) => steps.includes(step) ? 'ls-focus' : '';
  const loopWords = [t('predict', 'توقّع'), t('compare', 'قارن'), t('update adapters', 'حدّث المهايئات'), t('repeat', 'كرّر')];
  return <Scene id="ft-scene-kitchen" title={t('The AI kitchen: how Unsloth, LoRA and the GPU work together', 'مطبخ الذكاء الاصطناعي: كيف يعمل Unsloth و LoRA وبطاقة GPU معًا')}
    steps={KITCHEN_STEPS} player={player} figures={KITCHEN_FIGURES}>
    <svg viewBox="0 0 760 360" className={`ft-svg ls-kitchen step-${step}`} role="img" aria-label={say(KITCHEN_STEPS[step].title)}>
      <rect className="ls-wall" x="196" y="8" width="412" height="322" rx="16"/>
      <path className="ls-counter" d="M 196 312 H 608"/>

      {/* what we bring */}
      <g className={cls('ls-column', focus(0))}>
        <rect className="ls-panel bring" x="12" y="30" width="178" height="300" rx="16"/>
        <Txt x={101} y={52} className="ls-heading">{say(t('What we bring', 'ما نحضره'))}</Txt>
        <g className={step >= 3 ? 'ls-faded' : ''}>
          <Robot x={34} y={68}/>
          <Adapter x={40} y={154}/>
        </g>
        <Txt x={150} y={96} className="ls-item-text">{say(t('Pretrained', 'نموذج'))}</Txt>
        <Txt x={150} y={110} className="ls-item-text">{say(t('model', 'مدرَّب مسبقًا'))}</Txt>
        <Txt x={146} y={172} className="ls-item-text orange">{say(t('LoRA', 'مهايئات'))}</Txt>
        <Txt x={146} y={186} className="ls-item-text orange">{say(t('adapters', 'LoRA'))}</Txt>
        <g transform="translate(30 228)">
          <path className="ls-book" d="M0 6 Q 16 0 30 8 Q 44 0 60 6 V 46 Q 44 40 30 48 Q 16 40 0 46 Z"/><path className="ls-book-line" d="M30 8 V 48"/>
          <rect className="ls-jsonl" x="68" y="2" width="40" height="48" rx="5"/>
          <text className="ls-jsonl-text" x="88" y="24" textAnchor="middle">{'{ }'}</text>
          <text className="ls-jsonl-text small" x="88" y="40" textAnchor="middle">JSONL</text>
        </g>
        <Txt x={101} y={300} className="ls-item-text green">{say(t('Heritage dataset', 'بيانات التراث'))}</Txt>
        <Txt x={101} y={314} className="ft-tiny">{say(t('teaching examples', 'أمثلة تعليمية'))}</Txt>
      </g>
      <path className="ls-arrow" d="M 192 180 L 214 180"/>

      {/* tool rack */}
      <g className={cls(show(step >= 2), focus(2))}>
        <rect className="ls-rack" x="210" y="38" width="178" height="22" rx="6"/>
        <Txt x={299} y={53} className="ls-rack-text">Unsloth + PyTorch + trainer</Txt>
        {['U', 'PT', '</>'].map((label, index) => <g key={label}>
          <path className="ls-hook" d={`M ${232 + index * 34} 60 V 68`}/>
          <rect className="ls-tool" x={220 + index * 34} y="68" width="24" height="22" rx="5"/>
          <text className="ls-tool-text" x={232 + index * 34} y="83" textAnchor="middle">{label}</text>
        </g>)}
        <path className="ls-whisk" d="M 340 60 V 72 M 334 72 Q 340 96 346 72 Q 340 100 334 72 Z"/>
      </g>

      {/* the chef */}
      <g className={cls('ls-chef', show(step >= 1), focus(1, 2))}>
        <g className="hat"><circle cx="330" cy="112" r="13"/><circle cx="346" cy="106" r="15"/><circle cx="362" cy="113" r="12"/><rect x="322" y="112" width="48" height="16" rx="4"/></g>
        <circle className="head" cx="346" cy="150" r="24"/>
        <rect className="face" x="330" y="139" width="32" height="20" rx="7"/>
        <path className="eye" d="M336 150 q 3 -4 6 0 M350 150 q 3 -4 6 0"/>
        <rect className="torso" x="318" y="176" width="56" height="92" rx="20"/>
        <rect className="apron" x="326" y="190" width="40" height="70" rx="8"/>
        <text className="apron-text" x="346" y="222" textAnchor="middle">UN</text>
        <text className="apron-text" x="346" y="234" textAnchor="middle">SLOTH</text>
        <path className={cls('arm', step >= 3 && 'point')} d="M 372 192 Q 396 182 418 168"/>
        <path className="arm" d="M 320 196 Q 300 214 292 232"/>
      </g>
      <g className={cls('ls-recipe', show(step >= 1), focus(1))}>
        <rect x="190" y="214" width="114" height="92" rx="8" transform="rotate(-5 247 260)"/>
        <g transform="rotate(-5 247 260)">
          <Txt x={247} y={234} className="ls-recipe-title">{say(t('Choose a method', 'اختر طريقة'))}</Txt>
          <Txt x={247} y={252} className="ls-recipe-text">{say(t('LoRA: frozen base', 'LoRA: أساس مجمَّد'))}</Txt>
          <Txt x={247} y={264} className="ls-recipe-text">{say(t('+ trainable adapters', '+ مهايئات تتدرب'))}</Txt>
          <Txt x={247} y={282} className="ls-recipe-text">{say(t('QLoRA: 4-bit frozen', 'QLoRA: أساس 4 بت'))}</Txt>
          <Txt x={247} y={294} className="ls-recipe-text">{say(t('base + adapters', 'مجمَّد + مهايئات'))}</Txt>
        </g>
      </g>

      {/* speech bubble: the loop */}
      <g className={cls(show(step >= 5), focus(5))}>
        <rect className="ls-speech" x="402" y="30" width="196" height="46" rx="14"/>
        <path className="ls-speech" d="M 450 76 L 446 90 L 466 76"/>
        {loopWords.map((word, index) => {
          const x = index < 2 ? 452 + index * 96 : 452 + (index - 2) * 108;
          return <Txt key={index} x={isArabic ? 1000 - x : x} y={index < 2 ? 50 : 67} className={cls('ls-loop-word', step === 5 && 'cycle')}>
            <tspan style={{ animationDelay: `${index * 0.9}s` }}>{say(word)}{index < 3 ? (isArabic ? ' ←' : ' →') : ''}</tspan></Txt>;
        })}
      </g>

      {/* the oven */}
      <g className={cls('ls-oven', step >= 4 && 'on', focus(3, 4, 5))}>
        <rect className="ov-shell" x="410" y="92" width="196" height="226" rx="16"/>
        <rect className="ov-window" x="422" y="106" width="172" height="128" rx="10"/>
        {[0, 1, 2].map(index => <circle key={index} className="ov-light" cx={556 + index * 14} cy="99" r="4" style={{ animationDelay: `${index * 0.3}s` }}/>)}
        <g className={show(step >= 3)}>
          <Robot x={438} y={118} scale={0.95} locked/>
          <Adapter x={530} y={138} scale={0.9} moving={step === 5}/>
          <rect className="ls-chip base" x="428" y="196" width="88" height="30" rx="7"/>
          <Txt x={472} y={208} className="ls-chip-text">{say(t('Base weights:', 'أوزان الأساس:'))}</Txt>
          <Txt x={472} y={220} className="ls-chip-text">{say(t('active, unchanged', 'تعمل، لا تتغير'))}</Txt>
          <rect className="ls-chip adapter" x="522" y="196" width="66" height="30" rx="7"/>
          <Txt x={555} y={208} className="ls-chip-text">{say(t('LoRA:', 'LoRA:'))}</Txt>
          <Txt x={555} y={220} className="ls-chip-text">{say(t('updated', 'تُحدَّث'))}</Txt>
        </g>
        <rect className="ov-panel" x="422" y="244" width="172" height="62" rx="10"/>
        <g transform="translate(432 256)">
          <rect className="ov-chip" x="0" y="0" width="30" height="30" rx="5"/>
          {[6, 14, 22].map(offset => <g key={offset}><path className="ov-pin" d={`M ${offset} -4 V 0 M ${offset} 30 V 34 M -4 ${offset} H 0 M 30 ${offset} H 34`}/></g>)}
          <text className="ov-chip-text" x="15" y="19" textAnchor="middle">GPU</text>
        </g>
        <Txt x={490} y={268} className="ls-item-text" anchor="start">{say(t('GPU:', 'GPU:'))}</Txt>
        <Txt x={490} y={282} className="ft-tiny" anchor="start">{say(t('does the maths', 'تنفذ الحسابات'))}</Txt>
        <g transform="translate(566 290)">
          <path className="ov-gauge" d="M -18 0 A 18 18 0 0 1 18 0"/>
          <path className={cls('ov-needle', step >= 4 && 'swing')} d="M 0 0 L -12 -10"/>
        </g>
      </g>
      {step === 3 && [0, 1, 2].map(index => <rect key={index} className="ft-crate" x="-6" y="-5" width="12" height="10" rx="2"
        style={packet('M 150 110 C 260 60 380 80 470 150', -index * 0.6, { animationDuration: '1.9s' })}/>)}
      <path className="ls-arrow" d="M 606 180 L 620 180"/>

      {/* output */}
      <g className={cls('ls-column', show(step >= 6), focus(6, 7))}>
        <rect className="ls-panel out" x="618" y="30" width="134" height="300" rx="16"/>
        <Txt x={685} y={52} className="ls-heading green">{say(t('Output', 'المخرج'))}</Txt>
        <rect className="ls-bubble user" x="628" y="62" width="114" height="40" rx="12"/>
        <Txt x={685} y={79} className="ls-item-text">{say(t('Answers about', 'إجابات عن'))}</Txt>
        <Txt x={685} y={93} className="ls-item-text">{say(t('Omani heritage', 'التراث العُماني'))}</Txt>
        <Robot x={636} y={112} scale={0.72}/>
        <Adapter x={692} y={124} scale={0.62}/>
        <ellipse className="ls-tray" cx="685" cy="162" rx="58" ry="8"/>
        <Txt x={685} y={194} className="ls-item-text orange">{say(t('Base model +', 'النموذج الأساسي +'))}</Txt>
        <Txt x={685} y={208} className="ls-item-text orange">{say(t('trained adapters', 'المهايئات المدرَّبة'))}</Txt>
        <g className={show(step >= 7)}>
          <rect className="ls-check" x="630" y="240" width="110" height="52" rx="12"/>
          <path className="ls-tick" d="M 642 266 l 7 7 l 13 -15"/>
          <Txt x={704} y={262} className="ls-item-text">{say(t('Test on new', 'اختبر على'))}</Txt>
          <Txt x={704} y={276} className="ls-item-text">{say(t('questions', 'أسئلة جديدة'))}</Txt>
        </g>
      </g>

      <g className={cls(show(step >= 7), 'ls-footer')}>
        <rect x="12" y="336" width="740" height="20" rx="10"/>
        <Txt x={382} y={350} className="ls-footer-text">{say(t('Unsloth helps run the kitchen. The GPU does the calculations. Only LoRA weights learn updates.',
          'Unsloth يساعد على تشغيل المطبخ. وبطاقة GPU تنفذ الحسابات. وأوزان LoRA وحدها تتعلم التحديثات.'))}</Txt>
      </g>
      <Hotspots/>
    </svg>
  </Scene>;
}

// ===================================================== 4 one training step

const CANDIDATES = [t('performing', 'أدائي'), t('dance', 'رقص'), t('song', 'غناء'), t('tradition', 'تقليد'), t('bread', 'خبز')];
const BEFORE = [0.22, 0.35, 0.18, 0.17, 0.08];
const AFTER = [0.71, 0.12, 0.07, 0.08, 0.02];
const LOSS_CURVE = Array.from({ length: 16 }, (_, index) => 1.51 * Math.exp(-index / 5.4) + 0.3 * (1 - Math.exp(-index / 5.4)) + (index % 3 === 1 ? 0.04 : 0));
const S_IN = 'M 330 92 L 330 112';
const S_OUT = 'M 420 170 C 470 170 480 170 520 170';
const S_BACK = 'M 210 250 C 300 280 470 280 470 150';

const STEP_STEPS = [
  { title: t('One example, and the next-token question', 'مثال واحد، وسؤال الرمز التالي'),
    text: t('The prompt is grey: it is masked, so it is not graded. The model is shown the answer so far, “Al-Bar’ah is a”, and must predict the next token. Being shown the correct earlier tokens is called teacher forcing.',
      'السؤال رمادي: إنه محجوب فلا يُقيَّم. ويُعرض على النموذج الجواب حتى الآن، “البرعة فن”، وعليه أن يتوقع الرمز التالي. وعرض الرموز السابقة الصحيحة عليه يسمى “إجبار المعلّم”.') },
  { title: t('Forward pass', 'التمرير الأمامي'),
    text: t('The tokens flow through every layer, one after another. In each, the frozen base (blue, locked) and the adapter (orange) both compute; their results are added.',
      'تمر الرموز عبر كل طبقة، واحدة بعد أخرى. وفي كل منها يحسب الأساس المجمَّد (الأزرق المقفل) والمهايئ (البرتقالي) معًا، وتُجمع نتائجهما.') },
  { title: t('Probabilities for the next token', 'احتمالات الرمز التالي'),
    text: t('The model gives every possible next token a probability. Here the right one, “performing”, gets only 0.22; “dance” gets more.',
      'يعطي النموذج كل رمز تالٍ ممكن احتمالًا. وهنا لا يحصل الرمز الصحيح “أدائي” إلا على 0.22، و“رقص” يحصل على أكثر.') },
  { title: t('Loss: compare with the target', 'الخسارة: قارن بالهدف'),
    text: t('Cross-entropy loss = −log(probability of the right token) = −log 0.22 = 1.51. The same is done at every answer position; masked prompt positions are ignored.',
      'خسارة الإنتروبيا المتقاطعة = −log(احتمال الرمز الصحيح) = −log 0.22 = 1.51. ويحدث الأمر نفسه في كل موضع من الإجابة، وتُتجاهل مواضع السؤال المحجوبة.') },
  { title: t('Backward pass: gradients', 'التمرير الخلفي: التدرجات'),
    text: t('The loss sends gradients back through the layers. They pass through the frozen weights, because the earlier layers need them, but only the adapters store gradients.',
      'ترسل الخسارة التدرجات إلى الخلف عبر الطبقات. وتمر عبر الأوزان المجمَّدة لأن الطبقات السابقة تحتاجها، لكن المهايئات وحدها تخزّن التدرجات.') },
  { title: t('Optimizer update', 'تحديث المحسّن'),
    text: t('The optimizer nudges every adapter number: A ← A − lr × ∇A and B ← B − lr × ∇B. The frozen base values stay exactly as they were.',
      'يحرّك المحسّن كل رقم في المهايئ قليلًا: A ← A − lr × ∇A و B ← B − lr × ∇B. وتبقى قيم الأساس المجمَّد كما كانت تمامًا.') },
  { title: t('Repeat for many batches', 'كرّر لدفعات كثيرة'),
    text: t('After many steps, “performing” rises to 0.71 and the loss falls to −log 0.71 = 0.34. Each step changed the adapters only a little; together they changed the answer.',
      'بعد خطوات كثيرة يرتفع “أدائي” إلى 0.71 وتنخفض الخسارة إلى −log 0.71 = 0.34. كل خطوة غيّرت المهايئات قليلًا، ومعًا غيّرت الإجابة.') },
  { title: t('Check validation and save a checkpoint', 'افحص التحقق واحفظ نقطة حفظ'),
    text: t('Every so often the loss is measured on validation examples the model does not train on, and a checkpoint is saved. A low training loss is not proof of accuracy: that needs unseen questions.',
      'بين حين وآخر تُقاس الخسارة على أمثلة التحقق التي لا يتدرب عليها النموذج، وتُحفظ نقطة حفظ. وانخفاض خسارة التدريب ليس دليلًا على الدقة: فذلك يحتاج إلى أسئلة لم يرها النموذج.') },
];

const STEP_FIGURES: Figure[] = [
  { id: 'tokens', title: t('The token strip', 'شريط الرموز'), areas: [[16, 14, 728, 64]],
    what: t('One training example cut into tokens. Grey tokens are the prompt (masked); purple tokens are the answer; the dashed box is the token being predicted.', 'مثال تدريب واحد مقطّع إلى رموز. الرموز الرمادية هي السؤال (محجوبة)، والبنفسجية هي الإجابة، والصندوق المتقطع هو الرمز المطلوب توقعه.'),
    why: t('Training is many next-token predictions, one for each answer position, all done at once.', 'التدريب توقعات كثيرة للرمز التالي، واحد لكل موضع في الإجابة، تُنفَّذ كلها معًا.') },
  { id: 'layers', title: t('The layer stack', 'كومة الطبقات'), areas: [[236, 104, 196, 132]],
    what: t('Three blue frozen layers (with locks) each with an orange adapter beside it. A real model has dozens of layers.', 'ثلاث طبقات زرقاء مجمَّدة (بأقفال) بجانب كل منها مهايئ برتقالي. والنموذج الحقيقي فيه عشرات الطبقات.'),
    why: t('Both parts compute in the forward pass; only the adapters change in the update.', 'كلا الجزأين يحسب في التمرير الأمامي، والمهايئات وحدها تتغير في التحديث.') },
  { id: 'bars', title: t('The probability bars', 'أعمدة الاحتمالات'), areas: [[516, 96, 236, 150]],
    what: t('The model’s guess for the next token: a probability for each candidate. The green outline marks the correct token.', 'تخمين النموذج للرمز التالي: احتمال لكل مرشّح. والإطار الأخضر يحدد الرمز الصحيح.'),
    why: t('Training pushes probability towards the right token.', 'التدريب يدفع الاحتمال نحو الرمز الصحيح.'),
    now: step => step >= 6 ? t('After training: performing 0.71.', 'بعد التدريب: أدائي 0.71.') : t('Before training: performing 0.22, dance 0.35.', 'قبل التدريب: أدائي 0.22، رقص 0.35.') },
  { id: 'loss', title: t('The loss box', 'صندوق الخسارة'), areas: [[16, 96, 196, 150]],
    what: t('The loss for this position, and later the loss curve over many steps.', 'خسارة هذا الموضع، ولاحقًا منحنى الخسارة عبر خطوات كثيرة.'),
    why: t('Loss = −log p(right token): 0 when the model is sure and right, large when it gives the right token little probability.', 'الخسارة = −log p(الرمز الصحيح): صفر حين يكون النموذج واثقًا ومحقًا، وكبيرة حين يعطي الرمز الصحيح احتمالًا ضئيلًا.') },
  { id: 'update', title: t('The update line', 'سطر التحديث'), areas: [[16, 256, 736, 70]],
    what: t('What the optimizer does to each part at the end of the step.', 'ما يفعله المحسّن بكل جزء في نهاية الخطوة.'),
    why: t('W: no update. A and B: a small step against their gradients, sized by the learning rate.', 'W: لا تحديث. A و B: خطوة صغيرة عكس تدرّجهما، بحجم يحدده معدل التعلم.') },
];

export function TrainingStepScene() {
  const say = useTx();
  const { isArabic } = useI18n();
  const player = usePlayer(STEP_STEPS.length);
  const { step } = player;
  const probabilities = step >= 6 ? AFTER : BEFORE;
  const prompt = isArabic ? ['ما', 'هي', 'البرعة', '؟'] : ['What', 'is', 'Al-Bar’ah', '?'];
  const answer = isArabic ? ['البرعة', 'فن', '?', 'من', '…'] : ['Al-Bar’ah', 'is', 'a', '?', 'art', '…'];
  const strip = [...prompt.map(text => ({ text, kind: 'prompt' })), ...answer.map(text => ({ text, kind: text === '?' ? 'next' : 'answer' }))];
  let cursor = 0;
  const placed = strip.map(token => {
    const w = Math.max(30, token.text.length * 8 + 16);
    const x = isArabic ? 736 - cursor - w : 24 + cursor;
    cursor += w + 6;
    return { ...token, x, w };
  });
  const loss = step >= 6 ? 0.34 : 1.51;
  return <Scene id="ft-scene-step" title={t('One training step, from example to update', 'خطوة تدريب واحدة، من المثال إلى التحديث')}
    steps={STEP_STEPS} player={player} figures={STEP_FIGURES}>
    <svg viewBox="0 0 760 330" className={`ft-svg ls-step step-${step}`} role="img" aria-label={say(STEP_STEPS[step].title)}>
      {placed.map((token, index) => <g key={index} className={`ls-stoken ${token.kind}`}>
        <rect x={token.x} y="24" width={token.w} height="30" rx="7"/>
        <text x={token.x + token.w / 2} y="44" textAnchor="middle">{token.kind === 'next' ? (step >= 6 ? say(CANDIDATES[0]) : '?') : token.text}</text>
      </g>)}
      <Txt x={380} y={72} className="ft-tiny">{say(t('grey: prompt (masked) · purple: answer shown so far · dashed: token to predict', 'رمادي: السؤال (محجوب) · بنفسجي: الجواب المعروض حتى الآن · متقطع: الرمز المطلوب'))}</Txt>

      <path className="ft-wire" d={S_IN}/><path className="ft-wire" d={S_OUT}/>
      {[0, 1, 2].map(layer => <g key={layer} className={cls('ls-layer', step === 1 && 'flow')}>
        <rect className="base" x="240" y={192 - layer * 42} width="140" height="34" rx="8"/>
        <Txt x={300} y={213 - layer * 42} className="ft-tiny strong">{say(t(`layer ${3 - layer} · frozen`, `الطبقة ${3 - layer} · مجمَّدة`))}</Txt>
        <Lock x={368} y={203 - layer * 42} size={0.75}/>
        <rect className={cls('adapter', (step === 4 || step === 5) && 'glow', step >= 5 && 'learned')} x="388" y={192 - layer * 42} width="40" height="34" rx="8"/>
        <text className="ls-ab-text" x="408" y={213 - layer * 42} textAnchor="middle">A·B</text>
      </g>)}
      {step === 1 && [0, 1, 2].map(index => <circle key={index} className="ft-packet" r="4.5" style={packet('M 330 92 L 330 112 L 330 230 L 330 236', -index * 0.7)}/>)}
      {step === 1 && [0, 1].map(index => <circle key={`o${index}`} className="ft-packet" r="4.5" style={packet(S_OUT, -index * 0.9)}/>)}
      {step === 4 && [0, 1, 2, 3].map(index => <circle key={index} className="ft-packet error" r="5" style={packet(S_BACK, -index * 0.6)}/>)}

      {/* probabilities */}
      <g className={show(step >= 2)}>
        <Txt x={634} y={100} className="ft-tiny strong">{say(t('next-token probabilities', 'احتمالات الرمز التالي'))}</Txt>
        {CANDIDATES.map((candidate, index) => {
          const width = probabilities[index] * 150;
          return <g key={index} className={cls('ls-prob', index === 0 && 'right')}>
            <Txt x={584} y={124 + index * 24} anchor="end" className="ft-tiny strong">{say(candidate)}</Txt>
            <rect className="track" x="590" y={113 + index * 24} width="150" height="15" rx="4"/>
            <rect className="fill" x="590" y={113 + index * 24} width={width} height="15" rx="4" style={{ width }}/>
            <text className="ls-prob-text" x={594 + Math.max(width, 0)} y={125 + index * 24}>{probabilities[index].toFixed(2)}</text>
          </g>;
        })}
      </g>

      {/* loss */}
      <g className={show(step >= 3)}>
        <rect className="ls-panel" x="20" y="100" width="190" height="142" rx="12"/>
        <Txt x={115} y={122} className="ft-tiny strong">{say(t('loss for this position', 'خسارة هذا الموضع'))}</Txt>
        <text className="ls-loss" x="115" y="150" textAnchor="middle">−log {step >= 6 ? '0.71' : '0.22'} = {loss.toFixed(2)}</text>
        <g className={show(step >= 6)}>
          <polyline className="ls-curve" points={LOSS_CURVE.map((value, index) => `${34 + index * 10.5},${232 - value * 46}`).join(' ')}/>
          <Txt x={115} y={176} className="ft-tiny">{say(t('loss over many steps', 'الخسارة عبر خطوات كثيرة'))}</Txt>
        </g>
        <g className={show(step >= 3 && step < 6)}>
          <Txt x={115} y={182} className="ft-tiny">{say(t('prompt positions: ignored', 'مواضع السؤال: تُتجاهل'))}</Txt>
          <Txt x={115} y={200} className="ft-tiny">{say(t('every answer position: graded', 'كل موضع في الإجابة: يُقيَّم'))}</Txt>
        </g>
      </g>

      {/* update line */}
      <g className={show(step >= 4)}>
        <rect className="ls-panel" x="20" y="260" width="720" height="62" rx="12"/>
        <Txt x={200} y={286} className="ft-tiny strong">{say(t('W (frozen): gradient passes through, no update', 'W (مجمَّدة): يمر التدرّج، لا تحديث'))}</Txt>
        <g className={show(step >= 5)}>
          <Txt x={510} y={286} className="ft-tiny strong warm">{'A ← A − lr·∇A'}</Txt>
          <Txt x={640} y={286} className="ft-tiny strong warm">{'B ← B − lr·∇B'}</Txt>
        </g>
        <g className={show(step >= 7)}>
          <Txt x={200} y={308} className="ft-tiny">{say(t('validation loss 0.41 · checkpoint-200 saved', 'خسارة التحقق 0.41 · حُفظت checkpoint-200'))}</Txt>
          <rect className="ls-checkpoint" x="520" y="296" width="80" height="18" rx="4"/>
          <text className="ls-checkpoint-text" x="560" y="309" textAnchor="middle">checkpoint-200</text>
        </g>
      </g>
      <Hotspots/>
    </svg>
  </Scene>;
}

