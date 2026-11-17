/** The words of the fine-tuning lab, in English and Arabic side by side. */

export interface Text { en: string; ar: string }
const t = (en: string, ar: string): Text => ({ en, ar });

export const SCENARIOS = [
  {
    name: t('College helpdesk', 'مكتب مساعدة الكلية'),
    question: t('When is the registration deadline for the spring term?', 'متى آخر موعد للتسجيل في فصل الربيع؟'),
    base: t(
      'I don’t have information about your specific institution. Registration deadlines vary, so please check your college’s website or contact the registrar’s office.',
      'ليست لدي معلومات عن مؤسستك بالتحديد. مواعيد التسجيل تختلف، فراجع موقع كليتك أو تواصل مع مكتب القبول والتسجيل.'),
    tuned: t(
      'Registration for the spring term closes on 15 January. Register in the student portal under Registration → Spring. After that date you need written approval from the Registrar.',
      'يُغلق التسجيل لفصل الربيع في 15 يناير. سجّل من بوابة الطالب عبر: التسجيل ← فصل الربيع. وبعد هذا التاريخ تحتاج إلى موافقة خطية من المسجّل.'),
    lesson: t('The base model is polite but empty: it never read your college’s rules. The fine-tuned model was trained on a few hundred of the helpdesk’s real questions and answers.',
      'النموذج الأساسي مهذّب لكنه فارغ: لم يقرأ أنظمة كليتك قط. أما النموذج بعد الضبط الدقيق فقد تدرّب على بضع مئات من أسئلة مكتب المساعدة وأجوبته الحقيقية.'),
    examples: [
      { ask: t('How do I add a course after the term starts?', 'كيف أضيف مقررًا بعد بدء الفصل؟'),
        answer: t('Use the Add/Drop form in the student portal during the first week. After week one you need your advisor’s signature.', 'استخدم نموذج الحذف والإضافة في بوابة الطالب خلال الأسبوع الأول. وبعد الأسبوع الأول تحتاج إلى توقيع مرشدك الأكاديمي.') },
      { ask: t('When is the registration deadline for the spring term?', 'متى آخر موعد للتسجيل في فصل الربيع؟'),
        answer: t('Registration for the spring term closes on 15 January. Register in the student portal under Registration → Spring.', 'يُغلق التسجيل لفصل الربيع في 15 يناير. سجّل من بوابة الطالب عبر: التسجيل ← فصل الربيع.') },
      { ask: t('Who approves a late withdrawal?', 'من يوافق على الانسحاب المتأخر؟'),
        answer: t('The Registrar approves late withdrawals. Submit the form with a note from your advisor.', 'المسجّل هو من يوافق على الانسحاب المتأخر. قدّم النموذج مع ملاحظة من مرشدك الأكاديمي.') },
    ],
  },
  {
    name: t('A fixed report format', 'صيغة تقرير ثابتة'),
    question: t('Summarise: “We heated 50 ml of water, measured the temperature each minute, and found it rose 4 °C per minute until boiling.”',
      'لخّص: «سخّنّا 50 مل من الماء، وقسنا الحرارة كل دقيقة، فوجدناها ترتفع 4 درجات كل دقيقة حتى الغليان.»'),
    base: t('The experiment involved heating water and recording its temperature over time. The temperature increased steadily, at about 4 °C per minute, until the water boiled.',
      'تضمنت التجربة تسخين الماء وتسجيل حرارته مع الوقت. ارتفعت الحرارة بانتظام، بنحو 4 درجات في الدقيقة، حتى غلى الماء.'),
    tuned: t('AIM: Measure how fast water heats.\nMETHOD: 50 ml heated; temperature read every minute.\nRESULT: +4 °C per minute until boiling.\nCONCLUSION: Heating rate was constant.',
      'الهدف: قياس سرعة تسخين الماء.\nالطريقة: تسخين 50 مل وقراءة الحرارة كل دقيقة.\nالنتيجة: +4 درجات كل دقيقة حتى الغليان.\nالاستنتاج: معدل التسخين ثابت.'),
    lesson: t('Both answers are correct. Fine-tuning did not add knowledge here; it taught a habit: always answer in the school’s four-line format, without being told each time.',
      'الإجابتان صحيحتان. الضبط الدقيق لم يضف معرفة هنا، بل علّم عادة: أجب دائمًا بصيغة المدرسة ذات الأسطر الأربعة دون أن يُطلب ذلك في كل مرة.'),
    examples: [
      { ask: t('Summarise: “We dropped balls of different mass from 2 m and timed them. All landed in about 0.64 s.”', 'لخّص: «أسقطنا كرات مختلفة الكتلة من ارتفاع 2 م وقسنا زمنها. وصلت كلها في نحو 0.64 ث.»'),
        answer: t('AIM: Test whether mass changes fall time.\nMETHOD: Balls dropped from 2 m and timed.\nRESULT: All about 0.64 s.\nCONCLUSION: Mass did not change fall time.', 'الهدف: اختبار هل تغيّر الكتلة زمن السقوط.\nالطريقة: إسقاط كرات من 2 م وقياس الزمن.\nالنتيجة: نحو 0.64 ث للجميع.\nالاستنتاج: الكتلة لم تغيّر زمن السقوط.') },
      { ask: t('Summarise: “We added salt to ice and the temperature fell from 0 °C to −9 °C.”', 'لخّص: «أضفنا الملح إلى الثلج فانخفضت الحرارة من 0 إلى −9 درجات.»'),
        answer: t('AIM: See how salt affects ice.\nMETHOD: Salt added to ice; temperature measured.\nRESULT: Fell from 0 °C to −9 °C.\nCONCLUSION: Salt lowers the melting point.', 'الهدف: معرفة أثر الملح في الثلج.\nالطريقة: إضافة الملح إلى الثلج وقياس الحرارة.\nالنتيجة: انخفضت من 0 إلى −9 درجات.\nالاستنتاج: الملح يخفض درجة الانصهار.') },
    ],
  },
  {
    name: t('A course’s own vocabulary', 'مصطلحات مقرر بعينه'),
    question: t('A student asks: “Why did my LoRA run out of memory?”', 'طالب يسأل: «لماذا نفدت الذاكرة أثناء تدريب LoRA؟»'),
    base: t('Running out of memory can have many causes, such as a large model, a large batch size, or limited hardware. Try reducing these or using a machine with more memory.',
      'نفاد الذاكرة له أسباب كثيرة، مثل نموذج كبير أو حجم دفعة كبير أو عتاد محدود. جرّب تقليلها أو استخدام جهاز بذاكرة أكبر.'),
    tuned: t('Check three things in this order: 1) Is the base loaded in 4-bit? 2) Lower max_seq_length — memory grows with it. 3) Set batch size 1 and raise gradient_accumulation_steps to 8. The adapter itself is rarely the cause.',
      'افحص ثلاثة أمور بهذا الترتيب: 1) هل النموذج الأساسي محمَّل بدقة 4 بت؟ 2) قلّل max_seq_length فالذاكرة تكبر معه. 3) اجعل حجم الدفعة 1 وارفع gradient_accumulation_steps إلى 8. أما المهايئ نفسه فقلّما يكون السبب.'),
    lesson: t('The fine-tuned model answers the way this course teaches: the same checklist, the same order, the same terms the students see in class.',
      'النموذج بعد الضبط الدقيق يجيب بالطريقة التي يدرّسها هذا المقرر: القائمة نفسها، والترتيب نفسه، والمصطلحات نفسها التي يراها الطلاب في الصف.'),
    examples: [
      { ask: t('What does the rank r control?', 'بماذا يتحكم الرتبة r؟'),
        answer: t('r is the width of the adapter. Higher r can learn more but uses more memory. Start at 16.', 'r هي عرض المهايئ. كلما ارتفعت تعلّم أكثر لكنه يستهلك ذاكرة أكثر. ابدأ بـ 16.') },
      { ask: t('Why did my LoRA run out of memory?', 'لماذا نفدت الذاكرة أثناء تدريب LoRA؟'),
        answer: t('Check: 1) 4-bit base, 2) lower max_seq_length, 3) batch size 1 with gradient accumulation.', 'افحص: 1) النموذج الأساسي بدقة 4 بت، 2) قلّل max_seq_length، 3) حجم دفعة 1 مع تجميع التدرّجات.') },
    ],
  },
];

export const CHOICES = [
  { name: t('Prompting', 'كتابة التعليمات (Prompting)'),
    what: t('Tell the model what to do in the message itself.', 'تخبر النموذج بما تريد داخل الرسالة نفسها.'),
    use: t('Try this first. It costs nothing and changes no weights.', 'جرّب هذا أولًا. لا يكلّف شيئًا ولا يغيّر أي وزن.') },
  { name: t('Retrieval (RAG)', 'الاسترجاع (RAG)'),
    what: t('Look up the right documents and paste them into the message.', 'تبحث عن المستندات المناسبة وتلصقها في الرسالة.'),
    use: t('Best for facts that change often, such as prices or timetables.', 'الأفضل للحقائق التي تتغير كثيرًا، مثل الأسعار والجداول.') },
  { name: t('Fine-tuning', 'الضبط الدقيق (Fine-tuning)'),
    what: t('Train the model on examples so the behaviour is built into its weights.', 'تدرّب النموذج على أمثلة حتى يصبح السلوك مبنيًا في أوزانه.'),
    use: t('Best for a style, a format, a skill, or a subject’s way of answering.', 'الأفضل لأسلوب أو صيغة أو مهارة أو طريقة مادة معيّنة في الإجابة.') },
];

export const UNSLOTH_STEPS = [
  {
    title: t('Install', 'التثبيت'),
    does: t('One package brings Unsloth and the libraries it builds on: PyTorch, Transformers, PEFT (LoRA) and bitsandbytes (4-bit loading).',
      'حزمة واحدة تجلب Unsloth والمكتبات التي يعتمد عليها: PyTorch و Transformers و PEFT (لتقنية LoRA) و bitsandbytes (للتحميل بدقة 4 بت).'),
    memory: t('Nothing is loaded yet.', 'لم يُحمَّل شيء بعد.'),
    code: 'pip install unsloth',
  },
  {
    title: t('Load the base model in 4-bit', 'حمّل النموذج الأساسي بدقة 4 بت'),
    does: t('Downloads an open-weight model that Unsloth has already quantized to 4-bit, and puts it on the GPU. This single line, load_in_4bit, is the quantization step: the weights arrive four times smaller than 16-bit.',
      'ينزّل نموذجًا مفتوح الأوزان سبق أن كمّمه Unsloth إلى 4 بت ويضعه على بطاقة GPU. هذا السطر الواحد، load_in_4bit، هو خطوة التكميم: تصل الأوزان أصغر أربع مرات من دقة 16 بت.'),
    memory: t('The frozen base now fills most of the memory you will use: about 4–5 GB for an 8B model.', 'النموذج الأساسي المجمَّد يملأ الآن معظم الذاكرة التي ستستخدمها: نحو 4–5 غ.ب لنموذج 8B.'),
    code: `from unsloth import FastLanguageModel

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name = "unsloth/Qwen3-8B-unsloth-bnb-4bit",
    max_seq_length = 2048,   # longest example, in tokens
    load_in_4bit = True,     # <- quantization happens here
)`,
  },
  {
    title: t('Add the LoRA adapters', 'أضف مهايئات LoRA'),
    does: t('Freezes every original weight and attaches a small trainable pair (A and B) beside each chosen layer. r is the adapter’s width; target_modules lists which layers get one.',
      'يجمّد كل الأوزان الأصلية ويربط زوجًا صغيرًا قابلًا للتدريب (A و B) بجانب كل طبقة مختارة. r هي عرض المهايئ، و target_modules تحدد الطبقات التي تنال مهايئًا.'),
    memory: t('Adds well under 1 GB. Unsloth prints the count: usually less than 1% of the model is trainable.', 'يضيف أقل بكثير من 1 غ.ب. و Unsloth يطبع العدد: عادةً أقل من 1٪ من النموذج قابل للتدريب.'),
    code: `model = FastLanguageModel.get_peft_model(
    model,
    r = 16,                  # adapter rank (width)
    lora_alpha = 16,         # how strongly the adapter speaks
    target_modules = ["q_proj", "k_proj", "v_proj", "o_proj",   # attention
                      "gate_proj", "up_proj", "down_proj"],     # MLP
    lora_dropout = 0,
    bias = "none",
    use_gradient_checkpointing = "unsloth",  # saves memory
    random_state = 3407,
)`,
  },
  {
    title: t('Prepare the examples', 'جهّز الأمثلة'),
    does: t('Each question-and-answer pair is wrapped in the model’s own chat format, so training looks exactly like a real conversation.',
      'كل زوج سؤال وجواب يُغلَّف بصيغة المحادثة الخاصة بالنموذج، فيبدو التدريب تمامًا مثل محادثة حقيقية.'),
    memory: t('Text only: a few megabytes.', 'نص فقط: بضعة ميغابايتات.'),
    code: `from datasets import load_dataset

dataset = load_dataset("json", data_files="helpdesk.jsonl", split="train")

def to_chat(row):
    messages = [
        {"role": "user", "content": row["question"]},
        {"role": "assistant", "content": row["answer"]},
    ]
    return {"text": tokenizer.apply_chat_template(messages, tokenize=False)}

dataset = dataset.map(to_chat)`,
  },
  {
    title: t('Train', 'درّب'),
    does: t('The usual loop: predict the next token, measure the loss, send the error back. The error passes through the frozen 4-bit weights but only A and B are updated.',
      'الحلقة المعتادة: تنبّأ بالرمز التالي، قِس الخسارة، أرسل الخطأ رجوعًا. الخطأ يمر عبر الأوزان المجمَّدة ذات الـ 4 بت لكن A و B فقط هما اللذان يُحدَّثان.'),
    memory: t('The peak: base + adapters + working memory. This is the moment a too-small GPU fails.', 'الذروة: النموذج الأساسي + المهايئات + ذاكرة العمل. هذه هي اللحظة التي تفشل فيها بطاقة GPU الصغيرة.'),
    code: `from trl import SFTTrainer, SFTConfig

trainer = SFTTrainer(
    model = model,
    tokenizer = tokenizer,
    train_dataset = dataset,
    args = SFTConfig(
        dataset_text_field = "text",
        per_device_train_batch_size = 2,
        gradient_accumulation_steps = 4,   # acts like batch size 8
        num_train_epochs = 1,
        learning_rate = 2e-4,
        optim = "adamw_8bit",
        logging_steps = 10,
        output_dir = "outputs",
    ),
)
trainer.train()`,
  },
  {
    title: t('Test it', 'اختبره'),
    does: t('Ask a question that was not in the training file. If the answer is right for new questions, the model learned the subject and not just the examples.',
      'اطرح سؤالًا لم يكن في ملف التدريب. إذا كانت الإجابة صحيحة لأسئلة جديدة فقد تعلّم النموذج المادة لا الأمثلة فقط.'),
    memory: t('Lower than training: no gradients are kept.', 'أقل من التدريب: لا تُحفظ تدرّجات.'),
    code: `FastLanguageModel.for_inference(model)

messages = [{"role": "user", "content": "Who approves a late withdrawal?"}]
inputs = tokenizer.apply_chat_template(
    messages, add_generation_prompt=True, return_tensors="pt").to("cuda")

output = model.generate(input_ids=inputs, max_new_tokens=128)
print(tokenizer.decode(output[0]))`,
  },
  {
    title: t('Save and export', 'احفظ وصدّر'),
    does: t('Save only the adapter (a small file), or merge it into the base and export one quantized file (GGUF) that runs on a laptop with tools such as Ollama or llama.cpp.',
      'احفظ المهايئ فقط (ملف صغير)، أو ادمجه في النموذج الأساسي وصدّر ملفًا مكمَّمًا واحدًا (GGUF) يعمل على حاسوب محمول بأدوات مثل Ollama أو llama.cpp.'),
    memory: t('The adapter file is tens of megabytes. The merged 4-bit file is about 5 GB for an 8B model.', 'ملف المهايئ عشرات الميغابايتات. والملف المدموج بدقة 4 بت نحو 5 غ.ب لنموذج 8B.'),
    code: `# 1) just the adapter: small, needs the base model to run
model.save_pretrained("helpdesk_lora")
tokenizer.save_pretrained("helpdesk_lora")

# 2) merged and quantized again for running anywhere
model.save_pretrained_gguf("helpdesk_model", tokenizer,
                           quantization_method = "q4_k_m")`,
  },
];

export const QUIZ = [
  {
    ask: t('During LoRA fine-tuning, what happens to the model’s original weights?', 'ماذا يحدث لأوزان النموذج الأصلية أثناء الضبط الدقيق بتقنية LoRA؟'),
    options: [
      t('They are all updated a little.', 'تُحدَّث كلها قليلًا.'),
      t('They are frozen; only the small adapters change.', 'تُجمَّد، والمهايئات الصغيرة وحدها تتغير.'),
      t('They are deleted and replaced.', 'تُحذف وتُستبدل.'),
    ],
    right: 1,
    why: t('The original weights are read but never written. All learning goes into A and B.', 'الأوزان الأصلية تُقرأ ولا تُكتب أبدًا. كل التعلّم يذهب إلى A و B.'),
  },
  {
    ask: t('What does quantization do?', 'ماذا يفعل التكميم؟'),
    options: [
      t('Stores each weight with fewer bits, so the model needs less memory.', 'يخزّن كل وزن ببتات أقل، فيحتاج النموذج إلى ذاكرة أقل.'),
      t('Adds more weights to the model.', 'يضيف أوزانًا أكثر إلى النموذج.'),
      t('Teaches the model new facts.', 'يعلّم النموذج حقائق جديدة.'),
    ],
    right: 0,
    why: t('Quantization is about size, not knowledge: 4-bit is a quarter of 16-bit, with a small rounding error.', 'التكميم يتعلق بالحجم لا بالمعرفة: 4 بت ربع 16 بت، مع خطأ تقريب صغير.'),
  },
  {
    ask: t('QLoRA is…', 'تقنية QLoRA هي…'),
    options: [
      t('A larger kind of model.', 'نوع أكبر من النماذج.'),
      t('Training every weight in 4-bit.', 'تدريب كل الأوزان بدقة 4 بت.'),
      t('A frozen 4-bit base plus trainable LoRA adapters.', 'نموذج أساسي مجمَّد بدقة 4 بت مع مهايئات LoRA قابلة للتدريب.'),
    ],
    right: 2,
    why: t('Q = quantized base (small). LoRA = small trainable add-on. Together they fit on an ordinary GPU.', 'Q = نموذج أساسي مكمَّم (صغير). و LoRA = إضافة صغيرة قابلة للتدريب. ومعًا يتسعان في بطاقة GPU عادية.'),
  },
  {
    ask: t('Why does adapter B start at zero?', 'لماذا يبدأ المهايئ B من الصفر؟'),
    options: [
      t('So that before training the model behaves exactly like the base model.', 'حتى يتصرف النموذج قبل التدريب تمامًا مثل النموذج الأساسي.'),
      t('To save memory.', 'لتوفير الذاكرة.'),
      t('Because zero is faster to multiply.', 'لأن الضرب في الصفر أسرع.'),
    ],
    right: 0,
    why: t('B·A is zero at the start, so the adapter adds nothing until training gives it something useful to add.', 'حاصل B·A صفر في البداية، فلا يضيف المهايئ شيئًا حتى يعطيه التدريب شيئًا مفيدًا يضيفه.'),
  },
  {
    ask: t('What is Unsloth?', 'ما هو Unsloth؟'),
    options: [
      t('A new language model.', 'نموذج لغوي جديد.'),
      t('A Python library that loads 4-bit models, adds LoRA, trains, and exports in a few lines.', 'مكتبة Python تحمّل نماذج 4 بت، وتضيف LoRA، وتدرّب، وتصدّر في بضعة أسطر.'),
      t('A GPU.', 'بطاقة GPU.'),
    ],
    right: 1,
    why: t('Unsloth is a tool, not a model. It wraps quantization and QLoRA so they are fast and use less memory.', 'Unsloth أداة لا نموذج. يغلّف التكميم و QLoRA ليكونا سريعين ويستهلكا ذاكرة أقل.'),
  },
];
