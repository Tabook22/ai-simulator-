/** Step-by-step explanations for a 12-year-old: fill-in-the-blank questions f01–f50. */
import type { Pair } from './types';

export const STEPS_FILL: Record<string, Pair[]> = {
  f01: [
    ['Fine-tuning does not start from nothing. It starts from a model that has already learned a lot.', 'الضبط الدقيق لا يبدأ من لا شيء، بل من نموذج تعلّم الكثير أصلًا.'],
    ['“Pre-trained” means “already trained before”, exactly that.', '«مدرَّب مسبقًا» تعني «تدرّب من قبل»، وهذا هو بالضبط.'],
    ['An empty model knows nothing; “quantized-only” describes storage, not knowledge; a deleted model does not exist.', 'النموذج الفارغ لا يعرف شيئًا، و«مكمَّم فقط» تصف التخزين لا المعرفة، والنموذج المحذوف غير موجود.'],
  ],
  f02: [
    ['Fine-tuning teaches habits: how to answer, the tone, the structure.', 'الضبط الدقيق يعلّم العادات: طريقة الإجابة والنبرة والبنية.'],
    ['Where the facts come from is RAG’s job, the look-it-up helper.', 'أما مصدر الحقائق فمهمة RAG، المساعد الذي يبحث.'],
    ['So fine-tuning changes how the model behaves. Storage, downloading and price are not what it changes.', 'إذن الضبط يغيّر كيف يتصرف النموذج. والتخزين والتنزيل والسعر ليست ما يغيّره.'],
  ],
  f03: [
    ['“Weights” are the learned numbers. If they are open, anyone can download them.', '«الأوزان» هي الأرقام المتعلَّمة، وإن كانت مفتوحة يستطيع أي أحد تنزيلها.'],
    ['The sentence says the weights can be downloaded, so Qwen must be open-weight.', 'والجملة تقول إن الأوزان يمكن تنزيلها، فلا بد أن Qwen مفتوح الأوزان.'],
    ['“Image-only” and “untrained” are not true of Qwen, and “closed” would mean you cannot download it.', '«للصور فقط» و«غير مدرَّب» لا تنطبقان على Qwen، و«مغلق» تعني أنك لا تستطيع تنزيله.'],
  ],
  f04: [
    ['Models cannot read letters directly; text is chopped into small pieces first.', 'النماذج لا تقرأ الحروف مباشرة، بل يُقطَّع النص إلى قطع صغيرة أولًا.'],
    ['Those pieces are called tokens. Each one then becomes a number.', 'وهذه القطع تسمى الرموز، ثم يصبح كل منها رقمًا.'],
    ['Epochs, adapters and GPUs are not pieces of text.', 'والحقب والمهايئات و GPU ليست قطعًا من النص.'],
  ],
  f05: [
    ['During training we measure how wrong the model is with one number.', 'أثناء التدريب نقيس مقدار خطأ النموذج برقم واحد.'],
    ['That number is the loss, and training tries to make it as small as possible.', 'هذا الرقم هو الخسارة، والتدريب يحاول جعلها أصغر ما يمكن.'],
    ['We do not want a smaller dataset, rank or vocabulary; we want fewer mistakes.', 'ولا نريد بيانات أو رتبة أو مفردات أصغر، بل أخطاء أقل.'],
  ],
  f06: [
    ['A neuron multiplies each input by its weight and adds everything up.', 'تضرب الخلية كل مدخل في وزنه وتجمع كل شيء.'],
    ['Then it adds one more number that shifts the total up or down: the bias.', 'ثم تضيف رقمًا آخر يزيح المجموع صعودًا أو هبوطًا: الانحياز.'],
    ['In the bike example the bias was −0.4, a slight “not in the mood” before looking at the weather. Epochs, tokens and chunks do not belong in this formula.', 'في مثال الدراجة كان الانحياز −0.4، أي مزاج «لا رغبة» خفيف قبل النظر إلى الطقس. والحقب والرموز والمقاطع لا مكان لها في هذه المعادلة.'],
  ],
  f07: [
    ['We want a file where every line is a complete, separate training example.', 'نريد ملفًا يكون فيه كل سطر مثال تدريب كاملًا ومستقلًا.'],
    ['That format is JSONL: JSON Lines, one JSON object per line.', 'وهذه الصيغة هي JSONL: أسطر JSON، كائن JSON واحد في كل سطر.'],
    ['PNG is a picture, MP3 is sound and ZIP is a compressed folder.', 'و PNG صورة، و MP3 صوت، و ZIP مجلد مضغوط.'],
  ],
  f08: [
    ['In chat data each message has a role: system (rules), user (question), assistant (reply).', 'في بيانات المحادثة لكل رسالة دور: النظام (القواعد)، والمستخدم (السؤال)، والمساعد (الرد).'],
    ['The model is learning to reply, so the answer it should learn is in the assistant turn.', 'النموذج يتعلم أن يرد، لذا فالإجابة التي يجب أن يتعلمها في دور المساعد.'],
    ['The user turn holds the question; “file” is not a role.', 'ودور المستخدم يحمل السؤال، و«الملف» ليس دورًا.'],
  ],
  f09: [
    ['Every chat model expects messages arranged in its own special layout with special markers.', 'كل نموذج محادثة يتوقع الرسائل مرتبة بتنسيقه الخاص مع علامات خاصة.'],
    ['That layout is the chat template. If training uses one layout and real use another, the model gets confused.', 'هذا التنسيق هو قالب المحادثة. وإن استعمل التدريب تنسيقًا والاستعمال الحقيقي آخر، يرتبك النموذج.'],
    ['GPU, threshold and backbone are not about how messages are laid out.', 'و GPU والعتبة والعمود الفقري لا تتعلق بترتيب الرسائل.'],
  ],
  f10: [
    ['Some weights are allowed to change in training; others are locked.', 'بعض الأوزان يُسمح لها بالتغير في التدريب، وأخرى مقفلة.'],
    ['Locked weights are called frozen, like water that froze into ice and stopped moving.', 'والأوزان المقفلة تسمى مجمدة، كالماء الذي تجمد وتوقف عن الحركة.'],
    ['Merged, tokenized and retrieved describe other things.', 'و«مدمجة» و«مرمَّزة» و«مسترجَعة» تصف أشياء أخرى.'],
  ],
  f11: [
    ['If every single weight is updated, nothing is left out.', 'إن حُدّث كل وزن، فلا شيء مستثنى.'],
    ['“Everything” in one word is full: full fine-tuning.', 'وكلمة «كل شيء» هنا هي «كامل»: الضبط الكامل.'],
    ['Partial updates some layers, adapter methods update only small add-ons, and zero-shot changes nothing.', 'والجزئي يحدّث بعض الطبقات، وطرق المهايئ تحدّث إضافات صغيرة فقط، وبلا أمثلة لا يغيّر شيئًا.'],
  ],
  f12: [
    ['After training hard on one narrow topic, a model may lose skills it had before.', 'بعد التدريب المكثف على موضوع ضيق، قد يفقد النموذج مهارات كانت لديه.'],
    ['Losing what you knew is forgetting, and because it can be severe it is called catastrophic forgetting.', 'وفقدان ما كنت تعرفه نسيان، ولأنه قد يكون شديدًا يسمى النسيان الكارثي.'],
    ['Retrieval, quantization and chunking are different topics.', 'والاسترجاع والتكميم والتقطيع مواضيع مختلفة.'],
  ],
  f13: [
    ['LoRA keeps W frozen and adds a small update next to it.', 'تُبقي LoRA المصفوفة W مجمدة وتضيف تحديثًا صغيرًا بجانبها.'],
    ['That update is made by multiplying two thin matrices, B and A: B·A.', 'وهذا التحديث يُصنع بضرب مصفوفتين رفيعتين، B و A: أي B·A.'],
    ['W·W would be huge, A+A is not how it works, and W⁻¹ (an inverse) has nothing to do with LoRA.', 'و W·W ستكون ضخمة، و A+A ليست طريقة العمل، و W⁻¹ (المعكوس) لا علاقة لها بـ LoRA.'],
  ],
  f14: [
    ['A and B are thin matrices. Their thickness decides how many numbers the adapter has.', 'A و B مصفوفتان رفيعتان، وسمكهما يحدد عدد أرقام المهايئ.'],
    ['That thickness is the rank, written r.', 'وهذا السمك هو الرتبة، ويُكتب r.'],
    ['Epoch, batch and threshold are training or search settings, not the adapter size.', 'والحقبة والدفعة والعتبة إعدادات تدريب أو بحث، لا حجم المهايئ.'],
  ],
  f15: [
    ['If B is all zeros, B·A is all zeros too.', 'إن كانت B كلها أصفارًا، فإن B·A كلها أصفار أيضًا.'],
    ['Then W + B·A = W, so the model behaves exactly like the original base model.', 'عندها W + B·A = W، فيتصرف النموذج تمامًا مثل النموذج الأساسي الأصلي.'],
    ['This is a safe start: the adapter changes nothing until it learns. Test, vision and random models are not what we started from.', 'وهذه بداية آمنة: لا يغيّر المهايئ شيئًا حتى يتعلم. والنموذج الاختباري أو البصري أو العشوائي ليس ما بدأنا منه.'],
  ],
  f16: [
    ['Each bit has two choices, 0 or 1.', 'لكل بت خياران، 0 أو 1.'],
    ['Four bits: 2 × 2 × 2 × 2 = 16 different values.', 'أربعة بتات: 2 × 2 × 2 × 2 = 16 قيمة مختلفة.'],
    ['4 is just the number of bits; 32 and 64 would need 5 and 6 bits.', '4 هي عدد البتات فقط، و 32 و 64 تحتاجان 5 و 6 بتات.'],
  ],
  f17: [
    ['Storing each weight in fewer bits makes the model smaller.', 'تخزين كل وزن ببتات أقل يصغّر النموذج.'],
    ['This rounding to fewer bits is called quantization.', 'وهذا التقريب إلى بتات أقل يسمى التكميم.'],
    ['Tokenization cuts text, augmentation creates more photos, and reranking reorders search results.', 'والترميز يقطّع النص، وزيادة البيانات تصنع صورًا أكثر، وإعادة الترتيب ترتّب نتائج البحث من جديد.'],
  ],
  f18: [
    ['8 bits make 1 byte.', '8 بتات تساوي بايتًا واحدًا.'],
    ['16 bits is two lots of 8, so 2 bytes.', 'و 16 بتًا ضعف 8، أي 2 بايت.'],
    ['1 byte is 8-bit, 4 bytes is 32-bit, and 0.5 byte is 4-bit.', '1 بايت هو 8 بت، و 4 بايت 32 بت، و 0.5 بايت 4 بت.'],
  ],
  f19: [
    ['QLoRA’s Q is quantization: the base is squeezed small.', 'حرف Q في QLoRA هو التكميم: يُضغط الأساس ليصغر.'],
    ['The usual choice is 4 bits per weight (NF4).', 'والخيار المعتاد هو 4 بتات لكل وزن (NF4).'],
    ['32 and 64 bits would be bigger than normal, and 1 bit would destroy the model.', 'و 32 و 64 بتًا أكبر من العادي، و 1 بت يُتلف النموذج.'],
  ],
  f20: [
    ['Training stores many in-between results to use later in the backward pass.', 'التدريب يخزّن نتائج وسيطة كثيرة ليستعملها لاحقًا في التمرير الخلفي.'],
    ['Gradient checkpointing keeps only a few and recomputes the others when needed.', 'ونقاط حفظ التدرج تحتفظ بقليل منها وتعيد حساب البقية عند الحاجة.'],
    ['Gradient clipping limits big gradients, descent is the learning method itself, and boosting is a different technique.', 'وقص التدرج يحدّ من التدرجات الكبيرة، والنزول هو طريقة التعلم نفسها، والتعزيز تقنية مختلفة.'],
  ],
  f21: [
    ['In QLoRA the base never changed; only the adapter learned.', 'في QLoRA لم يتغير الأساس أبدًا، والمهايئ وحده تعلّم.'],
    ['So the useful new thing to save is the small adapter file.', 'لذا فالشيء الجديد المفيد الذي يُحفظ هو ملف المهايئ الصغير.'],
    ['The dataset is already saved, the GPU is hardware, and there is no “tokenizer-free” file.', 'والبيانات محفوظة أصلًا، و GPU قطعة عتاد، ولا يوجد ملف «بلا مقطِّع».'],
  ],
  f22: [
    ['load_in_4bit tells Unsloth how to store the base weights.', 'load_in_4bit تخبر Unsloth كيف يخزّن أوزان الأساس.'],
    ['“4bit” means 4 bits per weight.', 'و«4bit» تعني 4 بتات لكل وزن.'],
    ['It says nothing about 16 bits, epochs or batches.', 'ولا تقول شيئًا عن 16 بتًا ولا الحقب ولا الدفعات.'],
  ],
  f23: [
    ['PEFT means training only a few extra parameters.', 'PEFT تعني تدريب عدد قليل من المعاملات الإضافية.'],
    ['get_peft_model attaches those extras, the LoRA adapters, to the model.', 'و get_peft_model تركّب هذه الإضافات، أي مهايئات LoRA، على النموذج.'],
    ['Documents, labels and GPUs are not added to a model by this call.', 'والوثائق والتسميات و GPU لا يضيفها هذا الاستدعاء إلى النموذج.'],
  ],
  f24: [
    ['The trainer object knows how to run the training loop.', 'كائن المدرّب يعرف كيف يشغّل حلقة التدريب.'],
    ['You start it with trainer.train().', 'وتبدأه بـ trainer.train().'],
    ['save stores results, load reads them, and merge joins the adapter into the base. None of them trains.', 'و save تخزّن النتائج، و load تقرؤها، و merge تدمج المهايئ في الأساس، ولا أحد منها يدرّب.'],
  ],
  f25: [
    ['After the loss is measured, we go backwards through the model to find each weight’s share of the blame.', 'بعد قياس الخسارة نسير رجوعًا عبر النموذج لنعرف نصيب كل وزن من الخطأ.'],
    ['That trip backwards is the backward pass, and it produces the gradients.', 'هذه الرحلة الرجوعية هي التمرير الخلفي، وهي تنتج التدرجات.'],
    ['The forward pass makes predictions; retrieval and inference do not compute gradients.', 'والتمرير الأمامي يصنع التنبؤات، والاسترجاع والاستدلال لا يحسبان التدرجات.'],
  ],
  f26: [
    ['After the gradients tell us the direction, we take a step.', 'بعد أن تخبرنا التدرجات بالاتجاه، نخطو خطوة.'],
    ['How big the step is is set by the learning rate.', 'وحجم الخطوة يحدده معدل التعلم.'],
    ['Sampling, retrieval and frame rates are not about updating weights.', 'ومعدلات العيّنة والاسترجاع والإطارات لا تتعلق بتحديث الأوزان.'],
  ],
  f27: [
    ['Training loss falling = getting better on studied examples.', 'انخفاض خسارة التدريب = تحسن في الأمثلة المدروسة.'],
    ['Validation loss rising = getting worse on new examples.', 'وارتفاع خسارة التحقق = سوء في الأمثلة الجديدة.'],
    ['Better on old, worse on new means memorising: over-fitting. Under-fitting keeps both high; quantizing and retrieving are unrelated.', 'التحسن في القديم والسوء في الجديد يعني الحفظ: فرط التعلّم. ونقص التعلّم يُبقي الاثنتين مرتفعتين، والتكميم والاسترجاع لا علاقة لهما.'],
  ],
  f28: [
    ['One set must stay hidden until the very end, like a sealed final exam.', 'يجب أن تبقى مجموعة مخفية حتى النهاية، كامتحان نهائي مختوم.'],
    ['That is the test set, used once to get an honest score.', 'وهذه مجموعة الاختبار، تُستعمل مرة واحدة للحصول على نتيجة صادقة.'],
    ['Training and validation are used many times; the adapter is not a data set.', 'والتدريب والتحقق يُستعملان مرات كثيرة، والمهايئ ليس مجموعة بيانات.'],
  ],
  f29: [
    ['If validation stops getting better, more training will only cause memorising.', 'إن توقف التحقق عن التحسن، فالمزيد من التدريب سيسبب الحفظ فقط.'],
    ['Stopping at that moment, before the planned end, is early stopping.', 'والتوقف في تلك اللحظة، قبل النهاية المخطط لها، هو الإيقاف المبكر.'],
    ['Merging, chunking and indexing are not about when to stop training.', 'والدمج والتقطيع والفهرسة لا تتعلق بوقت إيقاف التدريب.'],
  ],
  f30: [
    ['If the model saw a question in training, it may just remember the answer.', 'إن رأى النموذج سؤالًا في التدريب، فقد يتذكر الإجابة فقط.'],
    ['A fair comparison uses questions kept away from training: held back.', 'والمقارنة العادلة تستعمل أسئلة أُبعدت عن التدريب: محجوبة.'],
    ['Copied questions are unfair, and generated or translated ones are not the point here.', 'والأسئلة المنسوخة غير عادلة، والمولّدة أو المترجمة ليست المقصودة هنا.'],
  ],
  f31: [
    ['RAG looks things up before answering.', 'RAG يبحث قبل الإجابة.'],
    ['An exam where you may look things up in the book is an open-book exam.', 'والامتحان الذي يُسمح فيه بالبحث في الكتاب هو امتحان الكتاب المفتوح.'],
    ['Closed would forbid looking; empty and old do not describe it.', 'و«مغلق» يمنع البحث، و«فارغ» و«قديم» لا تصفانه.'],
  ],
  f32: [
    ['When two sources tell different versions, a good heritage answer says so.', 'حين يروي مصدران نسختين مختلفتين، تقول الإجابة التراثية الجيدة ذلك.'],
    ['The Arabic phrase is «تختلف الروايات»: “the accounts differ”.', 'والعبارة العربية هي «تختلف الروايات».'],
    ['Weights, epochs and tokens are model words, not about differing accounts.', 'والأوزان والحقب والرموز كلمات تقنية، لا تتعلق باختلاف الروايات.'],
  ],
  f33: [
    ['RAG reads the archive at the moment of each question.', 'RAG يقرأ الأرشيف لحظة كل سؤال.'],
    ['So adding a document to the archive is enough; the model does not need retraining.', 'لذا تكفي إضافة الوثيقة إلى الأرشيف، ولا يحتاج النموذج إلى إعادة تدريب.'],
    ['Loading, prompting and naming are normal steps and do not fit the sentence.', 'والتحميل والتلقين والتسمية خطوات عادية لا تناسب الجملة.'],
  ],
  f34: [
    ['We need a way to turn meaning into numbers so a computer can compare texts.', 'نحتاج طريقة لتحويل المعنى إلى أرقام كي يقارن الحاسوب النصوص.'],
    ['A vector that represents meaning is an embedding.', 'والمتجه الذي يمثّل المعنى هو التضمين.'],
    ['An epoch is a training pass, an adapter is a LoRA add-on, and a bias is one neuron number.', 'والحقبة مرور تدريب، والمهايئ إضافة LoRA، والانحياز رقم واحد في الخلية.'],
  ],
  f35: [
    ['When cutting text, a little is repeated between neighbouring chunks so ideas are not split.', 'عند التقطيع يُكرَّر قليل من النص بين المقاطع المتجاورة كي لا تنقسم الأفكار.'],
    ['That shared repeat is overlap.', 'وهذا التكرار المشترك هو التداخل.'],
    ['Dropout, padding and pruning are model-training words, not chunking ones.', 'والإسقاط والحشو والتقليم كلمات من تدريب النماذج، لا من التقطيع.'],
  ],
  f36: [
    ['We need a place that stores many vectors and quickly finds the closest ones to a question.', 'نحتاج مكانًا يخزّن متجهات كثيرة ويجد بسرعة أقربها إلى السؤال.'],
    ['That place is a vector database.', 'وهذا المكان هو قاعدة البيانات المتجهية.'],
    ['Adapters, templates and GPUs are not storage for searchable text.', 'والمهايئات والقوالب و GPU ليست مخازن لنص قابل للبحث.'],
  ],
  f37: [
    ['Meaning search plus keyword search, working together, is a mix of two kinds.', 'البحث بالمعنى مع البحث بالكلمات معًا مزيج من نوعين.'],
    ['A mix of two kinds is called hybrid.', 'والمزيج من نوعين يسمى هجينًا.'],
    ['Linear, random and frozen do not describe combining two search methods.', 'و«خطي» و«عشوائي» و«مجمد» لا تصف الجمع بين طريقتي بحث.'],
  ],
  f38: [
    ['Each chunk gets a similarity score with the question.', 'يحصل كل مقطع على درجة تشابه مع السؤال.'],
    ['We set a minimum score, a pass mark, called the threshold. Below it, the chunk is not used as evidence.', 'ونضع درجة دنيا، كدرجة النجاح، تسمى العتبة. وتحتها لا يُستعمل المقطع دليلًا.'],
    ['Rank, epoch and batch are training settings, not a search pass mark.', 'والرتبة والحقبة والدفعة إعدادات تدريب، لا درجة نجاح في البحث.'],
  ],
  f39: [
    ['Both projects use RAG for the facts.', 'كلا المشروعين يستعمل RAG للحقائق.'],
    ['For the expert way of answering, the tone and the habits, they use fine-tuning.', 'وللطريقة الخبيرة في الإجابة، أي النبرة والعادات، يستعملان الضبط الدقيق.'],
    ['YOLO is only in UTAS-70, and quantization and OCR are tools, not the answering style.', 'و YOLO في UTAS-70 فقط، والتكميم و OCR أدوات، لا أسلوب إجابة.'],
  ],
  f40: [
    ['UTAS-70 starts with a photo, so something must look at it first.', 'UTAS-70 يبدأ بصورة، فلا بد أن ينظر إليها شيء أولًا.'],
    ['A computer that “sees” uses computer vision.', 'والحاسوب الذي «يرى» يستعمل الرؤية الحاسوبية.'],
    ['Audio, finance and translation are not about photos.', 'والصوت والمالية والترجمة لا تتعلق بالصور.'],
  ],
  f41: [
    ['The sentence asks for a smaller Qwen that fits ordinary GPUs.', 'الجملة تطلب Qwen أصغر يتسع في GPU العادية.'],
    ['Of the choices, 8B (about 8 billion numbers) is the smallest.', 'ومن بين الخيارات، 8B (نحو 8 مليارات رقم) هو الأصغر.'],
    ['27B, 70B and 405B are bigger and need much more memory.', 'و 27B و 70B و 405B أكبر وتحتاج ذاكرة أكثر بكثير.'],
  ],
  f42: [
    ['Stories, proverbs and customs are passed on by people, not built from stone.', 'القصص والأمثال والعادات ينقلها الناس، ولا تُبنى من الحجر.'],
    ['Heritage you cannot touch is called intangible heritage.', 'والتراث الذي لا يُلمس يسمى التراث غير المادي.'],
    ['Digital, industrial and plant heritage are different kinds.', 'والتراث الرقمي والصناعي والنباتي أنواع مختلفة.'],
  ],
  f43: [
    ['Recordings are transcribed into text, but computer transcripts make mistakes with dialect.', 'تُفرَّغ التسجيلات إلى نص، لكن التفريغ الحاسوبي يخطئ مع اللهجة.'],
    ['So a person must check the text before it goes into the archive.', 'لذا يجب أن يراجع شخص النص قبل أن يدخل الأرشيف.'],
    ['Deleting, quantizing or shuffling would not make the transcript trustworthy.', 'والحذف أو التكميم أو الخلط لا يجعل التفريغ موثوقًا.'],
  ],
  f44: [
    ['Names and personal details belong to the people themselves.', 'الأسماء والتفاصيل الشخصية ملك لأصحابها.'],
    ['Before using them, we need their agreement: their consent.', 'وقبل استعمالها نحتاج إلى موافقتهم.'],
    ['GPU, rank and loss are technical words with nothing to do with permission.', 'و GPU والرتبة والخسارة كلمات تقنية لا علاقة لها بالإذن.'],
  ],
  f45: [
    ['We reuse a backbone that learned to see from millions of photos, and add a new head for our plants.', 'نعيد استعمال عمود فقري تعلّم الرؤية من ملايين الصور، ونضيف رأسًا جديدًا لنباتاتنا.'],
    ['Carrying knowledge from one task to another is transfer learning.', 'ونقل المعرفة من مهمة إلى أخرى هو التعلم بالنقل.'],
    ['Reinforcement, unsupervised and federated learning are different ways to train.', 'والتعلم المعزَّز وغير الموجَّه والموحَّد طرق تدريب مختلفة.'],
  ],
  f46: [
    ['In a confusion matrix, rows are the true class and columns the guessed class.', 'في مصفوفة الالتباس، الصفوف هي الفئة الحقيقية والأعمدة الفئة المخمَّنة.'],
    ['On the diagonal, true and guessed are the same, so those predictions are correct.', 'وعلى القطر تتطابق الحقيقية والمخمَّنة، فتكون تلك التنبؤات صحيحة.'],
    ['Missing, random and augmented do not describe the diagonal.', 'و«الناقصة» و«العشوائية» و«المزادة» لا تصف القطر.'],
  ],
  f47: [
    ['Photos of the same plant are nearly identical.', 'صور النبتة الواحدة شبه متطابقة.'],
    ['If they are split across training and test, test information slips into training: data leakage.', 'وإن قُسّمت بين التدريب والاختبار، تتسرب معلومات الاختبار إلى التدريب: تسرب البيانات.'],
    ['Growth, compression and labelling are not what goes wrong here.', 'والنمو والضغط والتسمية ليست ما يخطئ هنا.'],
  ],
  f48: [
    ['YOLO says where (a box), what (a class), and one more thing: how sure it is.', 'YOLO يقول أين (مربع) وماذا (فئة) وشيئًا آخر: مدى تأكده.'],
    ['That “how sure” number is the confidence score.', 'ورقم «مدى التأكد» هذا هو درجة الثقة.'],
    ['Loss, rank and token are training or text words, not detection outputs.', 'والخسارة والرتبة والرمز كلمات تدريب أو نص، لا مخرجات اكتشاف.'],
  ],
  f49: [
    ['RAG should only search the pages about the plant YOLO found.', 'يجب أن يبحث RAG في صفحات النبات الذي وجده YOLO فقط.'],
    ['Using a label to keep only matching items is a filter: a metadata filter.', 'واستعمال ملصق للإبقاء على العناصر المطابقة فقط هو مُرشِّح: مُرشِّح وصفي.'],
    ['An adapter, an epoch and a template are not search filters.', 'والمهايئ والحقبة والقالب ليست مرشّحات بحث.'],
  ],
  f50: [
    ['Three jobs: see the photo, find the facts, write the answer.', 'ثلاث مهام: رؤية الصورة، وإيجاد الحقائق، وكتابة الإجابة.'],
    ['YOLO sees, Qwen speaks, so RAG is the one that remembers: it is the system’s memory.', 'YOLO يرى، و Qwen يتكلم، إذن RAG هو الذي يتذكر: إنه ذاكرة النظام.'],
    ['RAG does not train, quantize or draw.', 'و RAG لا يدرّب ولا يكمّم ولا يرسم.'],
  ],
};
