/**
 * Input → Processing → Output for each of the eight steps in the key-words loop.
 * One small worked example runs through all eight, so students can follow the same numbers:
 * one neuron, x = [2, 3], w = [0.5, 0.4], b = 0.2, target y = 3.2, learning rate 0.012.
 */
import { Icon } from './ui';
import { t, useTx } from './FineTuneScenes';
import { useI18n } from './i18n';
import type { Text } from './FineTuneScenes';

interface StepIO {
  input: Text; process: Text; output: Text;
  /** The value that leaves this step, in the worked example. */
  value: string;
  /** Who receives it next. */
  next: Text;
  /** The calculation, when there is one. */
  maths?: string;
}

export const TERM_IO: StepIO[] = [
  { value: 'w = [0.5, 0.4] · b = 0.2',
    input: t('Huge amounts of text (books, websites, code) used by the model’s makers, for example the Qwen team, during the original pre-training. This happened long before your project, over weeks of computing.',
      'كميات هائلة من النصوص (كتب ومواقع وشيفرات) استخدمها صانعو النموذج، مثل فريق Qwen، في التدريب المسبق الأصلي. وقد حدث ذلك قبل مشروعك بزمن طويل، على مدى أسابيع من الحوسبة.'),
    process: t('Pre-training adjusted billions of numbers again and again, so that the model got better and better at predicting the next word.',
      'عدّل التدريب المسبق مليارات الأرقام مرة بعد مرة، حتى صار النموذج أفضل فأفضل في توقّع الكلمة التالية.'),
    output: t('The learned parameters (weights and biases), published as an open-weight model file. In our tiny example, one neuron of it: w₁ = 0.5, w₂ = 0.4, b = 0.2.',
      'المعاملات المتعلَّمة (الأوزان والانحيازات)، منشورة في ملف نموذج مفتوح الأوزان. وفي مثالنا الصغير عصبون واحد منه: w₁ = 0.5 و w₂ = 0.4 و b = 0.2.'),
    next: t('Step 2 receives these parameters.', 'الخطوة 2 تتسلم هذه المعاملات.') },
  { value: 'w = [0.5, 0.4] 🔒',
    input: t('The pretrained parameters from step 1, downloaded to your computer or GPU.', 'المعاملات المدرَّبة مسبقًا من الخطوة 1، بعد تنزيلها إلى حاسوبك أو بطاقة GPU.'),
    process: t('We lock them: in code, requires_grad = False. They will be read in every calculation, but training is not allowed to change them. In QLoRA they are also stored in 4-bit to save memory.',
      'نقفلها: في الشيفرة requires_grad = False. وستُقرأ في كل حساب، لكن لا يُسمح للتدريب بتغييرها. وفي QLoRA تُخزَّن أيضًا بدقة 4 بت لتوفير الذاكرة.'),
    output: t('A locked base model that still works normally. Our neuron still has w = [0.5, 0.4], now with a lock.',
      'نموذج أساسي مقفل ما زال يعمل بشكل طبيعي. وعصبوننا ما زال w = [0.5, 0.4]، لكن الآن بقفل.'),
    next: t('Step 3 adds the new parameters beside it.', 'الخطوة 3 تضيف المعاملات الجديدة بجانبه.') },
  { value: 'Δ = [0, 0]',
    input: t('The frozen model, plus two choices you make: which matrices get adapters (target modules) and how big they are (the rank r).',
      'النموذج المجمَّد، مع خيارين تتخذهما: أي المصفوفات تحصل على مهايئات (الوحدات المستهدفة) وما حجمها (الرتبة r).'),
    process: t('Beside each chosen matrix, create two small new matrices: A filled with small random numbers, and B filled with zeros. Their product B·A is the adjustment Δ that will be added to W.',
      'بجانب كل مصفوفة مختارة أنشئ مصفوفتين صغيرتين جديدتين: A مملوءة بأرقام عشوائية صغيرة، و B مملوءة بأصفار. وحاصل ضربهما B·A هو التعديل Δ الذي سيُضاف إلى W.'),
    output: t('New trainable parameters. Because B is zero, Δ = 0 at the start, so the model still answers exactly as before. Our neuron: Δ = [0, 0].',
      'معاملات جديدة قابلة للتدريب. ولأن B صفر يكون Δ = 0 في البداية، فيجيب النموذج تمامًا كما كان. وعصبوننا: Δ = [0, 0].'),
    next: t('Step 4 uses the model: frozen W + adapter Δ.', 'الخطوة 4 تستخدم النموذج: W المجمَّدة + المهايئ Δ.') },
  { value: 'ŷ = 2.4', maths: 'z = 2 × (0.5 + 0) + 3 × (0.4 + 0) + 0.2 = 2.4',
    input: t('One batch of training examples, already turned into numbers (tokens), plus the model (W and Δ). Our neuron gets the input x = [2, 3].',
      'دفعة واحدة من أمثلة التدريب، بعد تحويلها إلى أرقام (رموز)، مع النموذج (W و Δ). ويتلقى عصبوننا المدخل x = [2, 3].'),
    process: t('The input flows forward through every layer. Each layer multiplies by its weights (W + Δ), adds the bias, and applies an activation function. The in-between results are the activations.',
      'يسري المدخل إلى الأمام عبر كل طبقة. وكل طبقة تضرب في أوزانها (W + Δ) وتضيف الانحياز وتطبّق دالة التنشيط. والنتائج الوسيطة هي التنشيطات.'),
    output: t('The model’s prediction: ŷ = 2.4. In a language model the output is a probability for every possible next token.',
      'توقّع النموذج: ŷ = 2.4. وفي النموذج اللغوي يكون المخرج احتمالًا لكل رمز تالٍ ممكن.'),
    next: t('Step 5 compares this prediction with the right answer.', 'الخطوة 5 تقارن هذا التوقع بالإجابة الصحيحة.') },
  { value: 'loss = 0.64', maths: '(2.4 − 3.2)² = 0.64',
    input: t('The prediction ŷ = 2.4 from step 4, and the correct answer written in the training example: y = 3.2.',
      'التوقع ŷ = 2.4 من الخطوة 4، والإجابة الصحيحة المكتوبة في مثال التدريب: y = 3.2.'),
    process: t('Measure how far apart they are. Here we use the squared error. Language models use cross-entropy instead: −log of the probability the model gave to the correct token.',
      'قِس المسافة بينهما. ونستخدم هنا مربع الخطأ. أما النماذج اللغوية فتستخدم الإنتروبيا المتقاطعة: سالب لوغاريتم الاحتمال الذي أعطاه النموذج للرمز الصحيح.'),
    output: t('One single number: loss = 0.64. Large means far from the target; 0 would be perfect.',
      'رقم واحد فقط: الخسارة = 0.64. الكبير يعني بعيدًا عن الهدف، والصفر يعني الكمال.'),
    next: t('Step 6 works out who is responsible for this error.', 'الخطوة 6 تحسب من المسؤول عن هذا الخطأ.') },
  { value: '∇Δ = [−3.2, −4.8]', maths: '2 × (2.4 − 3.2) × 2 = −3.2 · 2 × (2.4 − 3.2) × 3 = −4.8',
    input: t('The loss 0.64, and the values remembered from the forward pass.', 'الخسارة 0.64، والقيم المحفوظة من التمرير الأمامي.'),
    process: t('Backpropagation goes backwards through the layers (the chain rule) and asks each trainable number: if you change a little, how much does the loss change? The signal passes through the frozen W, but W keeps no gradient of its own.',
      'ينطلق الانتشار الخلفي إلى الوراء عبر الطبقات (قاعدة السلسلة) ويسأل كل رقم قابل للتدريب: إذا تغيّرت قليلًا، فكم تتغير الخسارة؟ وتمر الإشارة عبر W المجمَّدة، لكن W لا تحتفظ بتدرّج خاص بها.'),
    output: t('One gradient for each adapter number: ∇Δ = [−3.2, −4.8]. A negative gradient means “make this number bigger to lower the loss”.',
      'تدرّج واحد لكل رقم في المهايئ: ∇Δ = [−3.2, −4.8]. والتدرّج السالب يعني “كبّر هذا الرقم لتنخفض الخسارة”.'),
    next: t('Step 7 uses these gradients to change the adapter.', 'الخطوة 7 تستخدم هذه التدرجات لتغيير المهايئ.') },
  { value: 'Δ = [0.038, 0.058]', maths: '0 − 0.012 × (−3.2) = 0.038 · 0 − 0.012 × (−4.8) = 0.058',
    input: t('The gradients from step 6, the current adapter values, and the learning rate (here 0.012).', 'التدرجات من الخطوة 6، وقيم المهايئ الحالية، ومعدل التعلم (هنا 0.012).'),
    process: t('Move each adapter number a small step against its gradient: Δ ← Δ − learning rate × gradient. AdamW, the usual optimizer, also keeps a memory of past steps to move more smoothly.',
      'حرّك كل رقم في المهايئ خطوة صغيرة عكس تدرّجه: Δ ← Δ − معدل التعلم × التدرّج. والمحسّن المعتاد AdamW يحتفظ أيضًا بذاكرة للخطوات السابقة ليتحرك بسلاسة أكبر.'),
    output: t('An updated adapter: Δ = [0.038, 0.058]. The frozen W is still exactly [0.5, 0.4].',
      'مهايئ محدَّث: Δ = [0.038, 0.058]. و W المجمَّدة ما زالت [0.5, 0.4] تمامًا.'),
    next: t('Step 8 sends the next batch through the improved model.', 'الخطوة 8 ترسل الدفعة التالية عبر النموذج المحسَّن.') },
  { value: 'ŷ = 2.65 → 3.2', maths: '2 × 0.538 + 3 × 0.458 + 0.2 = 2.65 · (2.65 − 3.2)² = 0.30',
    input: t('The updated adapter from step 7, and the next batch of training examples.', 'المهايئ المحدَّث من الخطوة 7، والدفعة التالية من أمثلة التدريب.'),
    process: t('Steps 4 to 7 repeat for every batch. With the new Δ the same input already gives ŷ = 2.65 and the loss falls from 0.64 to 0.30. One pass over all training examples is one epoch; after each epoch the validation loss is checked and a checkpoint is saved.',
      'تتكرر الخطوات من 4 إلى 7 لكل دفعة. ومع Δ الجديدة يعطي المدخل نفسه ŷ = 2.65 وتنخفض الخسارة من 0.64 إلى 0.30. والمرور على كل أمثلة التدريب حقبة واحدة؛ وبعد كل حقبة تُفحص خسارة التحقق وتُحفظ نقطة حفظ.'),
    output: t('After enough steps: a trained adapter that brings ŷ close to 3.2. It is saved as a small file and used together with the frozen base model.',
      'بعد خطوات كافية: مهايئ مدرَّب يقرّب ŷ من 3.2. ويُحفظ في ملف صغير ويُستخدم مع النموذج الأساسي المجمَّد.'),
    next: t('Back to step 4 with the next batch, until training ends.', 'العودة إلى الخطوة 4 مع الدفعة التالية، حتى ينتهي التدريب.') },
];

/** Keep number lists such as [0.038, 0.058] in their left-to-right order inside Arabic sentences. */
const isolate = (text: string) => text.replace(/(\[[^\]]+\]|[−-]?\d+(?:\.\d+)?)/g, '⁦$1⁩');

export function TermStepDetail({ step, go }: { step: number; go: (step: number) => void }) {
  const { isArabic } = useI18n();
  const tx = useTx();
  const say = (text: Text) => isArabic ? isolate(tx(text)) : tx(text);
  const io = TERM_IO[step];
  const last = step === TERM_IO.length - 1;
  return <div className="ts-detail" aria-live="polite">
    <ol className="ts-trail" aria-label={say(t('What each step passes on', 'ما تمرّره كل خطوة'))}>
      {TERM_IO.map((item, index) => <li key={index} className={index === step ? 'current' : index < step ? 'done' : ''}>
        <button type="button" onClick={() => go(index)} aria-label={say(t(`Step ${index + 1} output`, `مخرج الخطوة ${index + 1}`))}>
          <span>{index + 1}</span><code dir="ltr">{item.value}</code></button>
      </li>)}
    </ol>
    <div className="ts-io" key={step}>
      <article className="ts-card input">
        <h5><Icon name="download" size={14}/>{say(t('Input', 'المدخل'))}</h5>
        <p>{say(io.input)}</p>
      </article>
      <span className="ts-arrow" aria-hidden="true"><i/></span>
      <article className="ts-card process">
        <h5><Icon name="refresh" size={14}/>{say(t('Processing', 'المعالجة'))}</h5>
        <p>{say(io.process)}</p>
        {io.maths && <code className="ts-maths" dir="ltr">{io.maths}</code>}
      </article>
      <span className="ts-arrow" aria-hidden="true"><i/></span>
      <article className="ts-card output">
        <h5><Icon name="check" size={14}/>{say(t('Output', 'المخرج'))}</h5>
        <p>{say(io.output)}</p>
        <code className="ts-value" dir="ltr" data-testid="term-output">{io.value}</code>
      </article>
    </div>
    <p className="ts-next">
      <span><Icon name="next" size={14}/>{say(io.next)}</span>
      <button type="button" className="button small" onClick={() => go(last ? 3 : step + 1)}>
        {last ? say(t('Go round again: step 4', 'دورة جديدة: الخطوة 4')) : say(t(`Go to step ${step + 2}`, `انتقل إلى الخطوة ${step + 2}`))}</button>
    </p>
    <p className="lx-muted">{say(t('To keep the numbers easy, this example uses one neuron and a direct adjustment Δ. In a real model Δ = B·A for whole matrices, the input is tokens, the loss is cross-entropy and a batch holds many examples, but the order of the steps is exactly the same.',
      'لتبقى الأرقام سهلة يستخدم هذا المثال عصبونًا واحدًا وتعديلًا مباشرًا Δ. وفي النموذج الحقيقي يكون Δ = B·A لمصفوفات كاملة، والمدخل رموزًا، والخسارة إنتروبيا متقاطعة، والدفعة أمثلة كثيرة، لكن ترتيب الخطوات هو نفسه تمامًا.'))}</p>
  </div>;
}
