/**
 * Content for the part "Fine-tuning, RAG, or both?": when fine-tuning is needed, what each
 * method is good at, and which data goes to the RAG library and which to fine-tuning.
 * The story and the narrator in the examples are illustrations written for this lesson.
 */
import type { Text } from './finetuneContent';

const t = (en: string, ar: string): Text => ({ en, ar });

export type Method = 'prompt' | 'rag' | 'tune';

/** "Do you need fine-tuning?" — the situation decides the method. */
export const SITUATIONS: { name: Text; usually: Method; usuallyText: Text; tuneWhen: Text; why: Text }[] = [
  { name: t('Simple questions, general knowledge', 'أسئلة بسيطة ومعرفة عامة'), usually: 'prompt',
    usuallyText: t('Prompting with good instructions', 'التلقين بتعليمات جيدة'),
    tuneWhen: t('Not needed.', 'لا حاجة إليه.'),
    why: t('The base model already knows this. A clear instruction is enough.', 'النموذج الأساسي يعرف هذا مسبقًا. والتعليمات الواضحة تكفي.') },
  { name: t('New facts or documents', 'حقائق أو مستندات جديدة'), usually: 'rag',
    usuallyText: t('RAG (retrieval)', 'RAG (الاسترجاع)'),
    tuneWhen: t('Only when the knowledge is very specialized, and even then together with RAG.', 'فقط حين تكون المعرفة متخصصة جدًا، وحتى حينها مع RAG.'),
    why: t('Facts change and need a source. Retrieval brings the exact document at answer time, and can be updated without retraining.', 'الحقائق تتغير وتحتاج إلى مصدر. والاسترجاع يجلب المستند الدقيق وقت الإجابة، ويمكن تحديثه دون إعادة تدريب.') },
  { name: t('A new style, tone, format or persona', 'أسلوب أو نبرة أو شكل أو شخصية جديدة'), usually: 'tune',
    usuallyText: t('Sometimes prompting', 'التلقين أحيانًا'),
    tuneWhen: t('When you want it consistent every single time.', 'حين تريده ثابتًا في كل مرة.'),
    why: t('A prompt can ask for a style, but the model drifts. Fine-tuning makes the style its habit.', 'يمكن للتعليمات أن تطلب أسلوبًا، لكن النموذج ينحرف عنه. والضبط الدقيق يجعل الأسلوب عادةً له.') },
  { name: t('Follow specific rules or an output structure', 'اتباع قواعد محددة أو بنية مخرجات'), usually: 'prompt',
    usuallyText: t('Prompting', 'التلقين'),
    tuneWhen: t('When prompting keeps failing.', 'حين يفشل التلقين مرة بعد مرة.'),
    why: t('Try instructions and examples in the prompt first; fine-tune only if the rules are still broken too often.', 'جرّب التعليمات والأمثلة في التلقين أولًا، ولا تضبط إلا إذا ظلت القواعد تُكسر كثيرًا.') },
  { name: t('Deep adaptation to a domain', 'تكييف عميق لمجال'), usually: 'tune',
    usuallyText: t('Rarely enough without training', 'نادرًا ما يكفي دون تدريب'),
    tuneWhen: t('This is where fine-tuning shines.', 'هنا يتألق الضبط الدقيق.'),
    why: t('Many new patterns, terms and ways of reasoning: too much to fit in a prompt every time.', 'أنماط ومصطلحات وطرق تفكير جديدة كثيرة: أكثر مما يتسع له التلقين في كل مرة.') },
];

export type Level = 0 | 1 | 2; // weak, moderate, strong

/** What each method is good at, for a heritage storytelling project. */
export const GOALS: { name: Text; tune: Level; rag: Level; note: Text }[] = [
  { name: t('Natural, culturally appropriate storytelling', 'سرد طبيعي ومناسب ثقافيًا'), tune: 2, rag: 0,
    note: t('Fine-tuning teaches the voice; a base model reading documents sounds generic.', 'الضبط الدقيق يعلّم الصوت، والنموذج الأساسي الذي يقرأ المستندات يبدو عامًّا.') },
  { name: t('Staying faithful to recorded sources', 'الأمانة للمصادر المسجلة'), tune: 0, rag: 2,
    note: t('A tuned model remembers stories only approximately and can invent details.', 'النموذج المضبوط يتذكر القصص تقريبيًا وقد يختلق تفاصيل.') },
  { name: t('A clear source for every claim', 'مصدر واضح لكل ادعاء'), tune: 0, rag: 2,
    note: t('Only retrieval knows which document an answer came from.', 'الاسترجاع وحده يعرف من أي مستند جاءت الإجابة.') },
  { name: t('Fewer invented answers', 'إجابات مختلقة أقل'), tune: 1, rag: 2,
    note: t('Tuning can teach it to say “I don’t know”; retrieval gives it something true to say.', 'الضبط يعلّمه قول “لا أعرف”، والاسترجاع يعطيه شيئًا صحيحًا ليقوله.') },
  { name: t('Rare or very local stories', 'القصص النادرة أو المحلية جدًا'), tune: 1, rag: 2,
    note: t('A few examples are not enough to learn a story; a library keeps every one.', 'بضعة أمثلة لا تكفي لتعلّم قصة، والمكتبة تحفظ كل واحدة.') },
];

/** Items to sort: does this belong in the RAG library or in the fine-tuning set? */
export const DATA_ITEMS: { text: Text; goes: 'rag' | 'tune'; why: Text }[] = [
  { text: t('A full recorded folk tale with its narrator, region and date', 'حكاية شعبية مسجلة كاملة مع راويها ومنطقتها وتاريخها'), goes: 'rag',
    why: t('Real stories are the library: retrieved when needed, never memorized.', 'القصص الحقيقية هي المكتبة: تُسترجع عند الحاجة ولا تُحفظ.') },
  { text: t('An example answer that tells a retrieved story in the storyteller’s voice and names the source', 'إجابة نموذجية تروي قصة مسترجَعة بصوت الراوي وتذكر المصدر'), goes: 'tune',
    why: t('It teaches behaviour: the voice, the structure, and how to cite.', 'إنها تعلّم السلوك: الصوت والبنية وطريقة الاستشهاد.') },
  { text: t('The transcript of an interview with an elder', 'تفريغ نصي لمقابلة مع أحد كبار السن'), goes: 'rag',
    why: t('Source material: it must stay exactly as recorded and be citable.', 'مادة مصدرية: يجب أن تبقى كما سُجّلت تمامًا وأن يُستشهد بها.') },
  { text: t('An example where no story was found and the answer is “I don’t have a recorded source for this story.”', 'مثال لم تُوجد فيه قصة والإجابة: “ليس لدي مصدر مسجّل لهذه القصة.”'), goes: 'tune',
    why: t('Saying “I don’t know” is a behaviour; it has to be taught with examples.', 'قول “لا أعرف” سلوك، ويجب تعليمه بالأمثلة.') },
  { text: t('A scanned book chapter of local proverbs, after OCR review', 'فصل كتاب ممسوح عن الأمثال المحلية بعد مراجعة OCR'), goes: 'rag',
    why: t('More real knowledge for the library, split into chunks with its metadata.', 'معرفة حقيقية إضافية للمكتبة، تُقسَّم إلى مقاطع مع بياناتها الوصفية.') },
  { text: t('An example dialogue: question + retrieved context → a short answer in clear Arabic', 'حوار نموذجي: سؤال + سياق مسترجَع ← إجابة قصيرة بعربية واضحة'), goes: 'tune',
    why: t('It shows the model how to use context it is given.', 'إنه يُري النموذج كيف يستخدم السياق المعطى له.') },
];

export const BUILD_ORDER = [
  { title: t('Build and test RAG first', 'ابنِ RAG واختبره أولًا'),
    text: t('Good chunks, good search, and the source shown with every answer. This alone is already a useful, safe system.',
      'مقاطع جيدة، وبحث جيد، والمصدر معروض مع كل إجابة. وهذا وحده نظام مفيد وآمن.') },
  { title: t('Then fine-tune for behaviour', 'ثم اضبط ضبطًا دقيقًا للسلوك'),
    text: t('QLoRA on a smaller, curated set: the storyteller’s voice, using the retrieved context, citing it, and saying “I don’t have this story”.',
      'QLoRA على مجموعة أصغر منتقاة: صوت الراوي، واستخدام السياق المسترجَع، والاستشهاد به، وقول “ليست لدي هذه القصة”.') },
  { title: t('Compare three systems', 'قارن ثلاثة أنظمة'),
    text: t('Pure RAG, pure fine-tuning, and the combination, on the same unseen questions.',
      'RAG وحده، والضبط الدقيق وحده، والجمع بينهما، على الأسئلة الجديدة نفسها.') },
];
