/**
 * Step-by-step explanations for a 12-year-old: explain-in-your-words (e01–e25, how to build a good answer),
 * match-and-link (x01–x25, why each pair belongs together) and picture questions (i01–i25, how to read the picture).
 */
import type { Pair } from './types';

export const STEPS_OTHER: Record<string, Pair[]> = {
  // ---------------------------------------------------------------- explain in your words
  e01: [
    ['Start with what fine-tuning starts from: a model that is already trained (a foundation model).', 'ابدأ بما ينطلق منه الضبط الدقيق: نموذج مدرَّب أصلًا (نموذج أساسي).'],
    ['Then say what you add: your own examples, a small focused set.', 'ثم قل ما تضيفه: أمثلتك أنت، مجموعة صغيرة مركّزة.'],
    ['Say what changes: its behaviour or style, how it answers.', 'وقل ما الذي يتغير: سلوكه أو أسلوبه، أي طريقة إجابته.'],
    ['Finish with when: only when good prompts and RAG are not enough.', 'واختم بمتى: فقط حين لا يكفي التلقين الجيد و RAG.'],
  ],
  e02: [
    ['Describe training: the model studies examples, measures its mistakes (loss) and changes its weights.', 'صف التدريب: يدرس النموذج الأمثلة ويقيس أخطاءه (الخسارة) ويغيّر أوزانه.'],
    ['Describe inference: the finished model answers new questions.', 'وصف الاستدلال: النموذج المكتمل يجيب عن أسئلة جديدة.'],
    ['Point out the key difference: training changes the weights, inference only uses them, like studying versus sitting the exam.', 'وبيّن الفرق الأساسي: التدريب يغيّر الأوزان والاستدلال يستعملها فقط، كالمذاكرة مقابل أداء الامتحان.'],
  ],
  e03: [
    ['Explain that a model learns by copying patterns in its examples.', 'اشرح أن النموذج يتعلم بتقليد الأنماط في أمثلته.'],
    ['So clean, correct, consistent examples teach the right habit.', 'لذا فالأمثلة النظيفة الصحيحة المتسقة تعلّم العادة الصحيحة.'],
    ['Messy or contradictory examples teach mistakes, even if there are thousands of them.', 'والأمثلة الفوضوية أو المتناقضة تعلّم الأخطاء، حتى لو كانت بالآلاف.'],
    ['An example sentence helps: “300 careful answers beat 5,000 messy ones.”', 'وتساعد جملة مثال: «300 إجابة متقنة أفضل من 5,000 إجابة فوضوية».'],
  ],
  e04: [
    ['Reason 1: frozen weights keep the general knowledge the model already has.', 'السبب 1: الأوزان المجمدة تحفظ المعرفة العامة التي لدى النموذج.'],
    ['Reason 2: frozen weights need no gradients, so training uses far less memory.', 'السبب 2: الأوزان المجمدة لا تحتاج تدرجات، فيستعمل التدريب ذاكرة أقل بكثير.'],
    ['Reason 3: with fewer weights able to move, a small dataset is less likely to cause memorising or forgetting.', 'السبب 3: مع أوزان أقل قابلة للتحرك، يقل احتمال الحفظ أو النسيان مع بيانات صغيرة.'],
  ],
  e05: [
    ['Say that the big matrix W stays frozen: it is never changed.', 'قل إن المصفوفة الكبيرة W تبقى مجمدة: لا تتغير أبدًا.'],
    ['Say that LoRA adds a small update B·A beside it, made from two thin matrices.', 'وقل إن LoRA تضيف بجانبها تحديثًا صغيرًا B·A من مصفوفتين رفيعتين.'],
    ['Say that only A and B are trained, and the rank r sets how big they are.', 'وقل إن A و B وحدهما يُدرَّبان، والرتبة r تحدد حجمهما.'],
    ['Finish with the result: output = W·x + B·A·x, so the model changes while W does not.', 'واختم بالنتيجة: المخرج = W·x + B·A·x، فيتغير النموذج بينما لا تتغير W.'],
  ],
  e06: [
    ['Define it: quantization stores each weight with fewer bits, for example 4 instead of 16.', 'عرّفه: التكميم يخزّن كل وزن ببتات أقل، مثل 4 بدل 16.'],
    ['The gain: the model becomes about four times smaller and fits on cheaper GPUs.', 'المكسب: يصبح النموذج أصغر بنحو أربع مرات ويتسع في GPU أرخص.'],
    ['The loss: rounding removes some detail, so quality can drop a little.', 'الخسارة: التقريب يحذف بعض التفاصيل، فقد تنخفض الجودة قليلًا.'],
  ],
  e07: [
    ['Point 1: the base model is loaded in 4-bit, about a quarter of the usual memory.', 'النقطة 1: يُحمَّل النموذج الأساسي بدقة 4 بت، نحو ربع الذاكرة المعتادة.'],
    ['Point 2: the base is frozen, so it needs no gradients or optimizer notes.', 'النقطة 2: الأساس مجمد، فلا يحتاج تدرجات ولا ملاحظات مُحسِّن.'],
    ['Point 3: only small LoRA adapters train, so the extra memory is tiny.', 'النقطة 3: لا تتدرب إلا مهايئات LoRA صغيرة، فتكون الذاكرة الإضافية ضئيلة.'],
    ['Conclude: together they fit on one GPU, where full fine-tuning would need many.', 'واستنتج: معًا تتسع في GPU واحدة، بينما يحتاج الضبط الكامل بطاقات كثيرة.'],
  ],
  e08: [
    ['List the steps in order, like a recipe.', 'اذكر الخطوات بالترتيب، كوصفة طبخ.'],
    ['1. Load the base model in 4-bit with its tokenizer. 2. Add LoRA adapters (get_peft_model).', '1. حمّل النموذج الأساسي بدقة 4 بت مع مقطِّعه. 2. أضف مهايئات LoRA (get_peft_model).'],
    ['3. Load the JSONL data and format it with the chat template. 4. Set the training options and run trainer.train().', '3. حمّل بيانات JSONL ونسّقها بقالب المحادثة. 4. اضبط خيارات التدريب وشغّل trainer.train().'],
    ['5. Test the model on new questions and save the adapter.', '5. اختبر النموذج على أسئلة جديدة واحفظ المهايئ.'],
  ],
  e09: [
    ['Use four short sentences, one per step.', 'استعمل أربع جمل قصيرة، جملة لكل خطوة.'],
    ['Forward: a batch goes through the model and it makes predictions. Loss: compare them with the right answers.', 'الأمامي: تمر دفعة عبر النموذج فيصنع تنبؤات. الخسارة: قارنها بالإجابات الصحيحة.'],
    ['Backward: work out each weight’s gradient. Update: change the weights a little, by the learning rate.', 'الخلفي: احسب تدرج كل وزن. التحديث: غيّر الأوزان قليلًا بمقدار معدل التعلم.'],
  ],
  e10: [
    ['The sign: training loss keeps falling while validation loss starts rising.', 'العلامة: خسارة التدريب تواصل الانخفاض بينما تبدأ خسارة التحقق في الارتفاع.'],
    ['Another sign: answers start repeating training examples word for word.', 'وعلامة أخرى: تبدأ الإجابات في تكرار أمثلة التدريب حرفيًا.'],
    ['The fixes: stop early, train for fewer epochs or with a lower learning rate, and add more varied examples.', 'والعلاج: توقف مبكرًا، أو درّب حقبًا أقل أو بمعدل تعلم أقل، وأضف أمثلة أكثر تنوعًا.'],
  ],
  e11: [
    ['Give each set a job.', 'أعطِ كل مجموعة مهمتها.'],
    ['Training: teaches the weights. Validation: helps choose settings and when to stop.', 'التدريب: يعلّم الأوزان. التحقق: يساعد على اختيار الإعدادات ووقت التوقف.'],
    ['Test: kept hidden until the end, so it gives an honest score on new questions, like a sealed final exam.', 'الاختبار: يبقى مخفيًا حتى النهاية، فيعطي نتيجة صادقة على أسئلة جديدة، كامتحان نهائي مختوم.'],
  ],
  e12: [
    ['Set up the picture: an open-book exam with a coached student.', 'ارسم الصورة: امتحان بكتاب مفتوح مع طالب مدرَّب.'],
    ['RAG is the book: it looks up approved passages and their sources before answering.', 'RAG هو الكتاب: يبحث عن المقاطع المعتمدة ومصادرها قبل الإجابة.'],
    ['Fine-tuning is the coaching: it teaches how to use the passages, in clear Arabic, citing sources and showing different accounts.', 'والضبط الدقيق هو التدريب: يعلّم كيف تُستعمل المقاطع، بعربية واضحة، مع الاستشهاد بالمصادر وعرض الروايات المختلفة.'],
    ['Add the bonus: the book can get new pages without retraining the student.', 'وأضف الميزة: يمكن أن يحصل الكتاب على صفحات جديدة دون إعادة تدريب الطالب.'],
  ],
  e13: [
    ['Step 1: try clearer instructions and a few worked examples in the prompt. It is cheap and quick.', 'الخطوة 1: جرّب تعليمات أوضح وبضعة أمثلة محلولة في التلقين. إنها رخيصة وسريعة.'],
    ['Step 2: test again on many questions to see whether the mistake still happens.', 'الخطوة 2: اختبر مجددًا على أسئلة كثيرة لترى هل ما زال الخطأ يحدث.'],
    ['Step 3: if the same kind of mistake keeps coming back, fine-tune with examples of the right behaviour.', 'الخطوة 3: إن ظل النوع نفسه من الخطأ يتكرر، اضبط النموذج بأمثلة للسلوك الصحيح.'],
    ['Step 4: compare base and fine-tuned Qwen fairly, on held-out questions with the same passages.', 'الخطوة 4: قارن Qwen الأساسي والمضبوط بعدل، على أسئلة محجوبة بالمقاطع نفسها.'],
  ],
  e14: [
    ['Follow the document on its journey.', 'تتبّع الوثيقة في رحلتها.'],
    ['Upload the file, extract the text and clean it. Cut it into chunks, often with overlap.', 'ارفع الملف، واستخرج النص ونظّفه. ثم قطّعه إلى مقاطع، غالبًا مع تداخل.'],
    ['Turn each chunk into an embedding vector.', 'وحوّل كل مقطع إلى متجه تضمين.'],
    ['Store the vector, the text and the metadata (source, page) in a vector database.', 'وخزّن المتجه والنص والبيانات الوصفية (المصدر والصفحة) في قاعدة بيانات متجهية.'],
  ],
  e15: [
    ['Explain the cause: embeddings capture meaning, and a rare name means little to the model, so meaning search may rank it low.', 'اشرح السبب: التضمينات تلتقط المعنى، والاسم النادر لا يعني الكثير للنموذج، فقد يرتّبه البحث بالمعنى منخفضًا.'],
    ['Give the fix: add keyword search (BM25), which matches the exact letters of the name.', 'وأعطِ العلاج: أضف البحث بالكلمات (BM25) الذي يطابق حروف الاسم بالضبط.'],
    ['Combine both lists: that is hybrid search. Also make spellings consistent.', 'وادمج القائمتين: هذا هو البحث الهجين. ووحّد الإملاء أيضًا.'],
  ],
  e16: [
    ['Name the tool: a similarity threshold, a pass mark for evidence.', 'سمِّ الأداة: عتبة التشابه، درجة نجاح للأدلة.'],
    ['Say what happens: if no chunk passes, nothing is sent, and the model says its sources do not cover the question.', 'وقل ما يحدث: إن لم يتجاوزها أي مقطع، لا يُرسل شيء، ويقول النموذج إن مصادره لا تغطي السؤال.'],
    ['Say why it matters: it stops invented answers, and people must be able to trust a heritage archive.', 'وقل لماذا يهم: إنه يمنع الإجابات المختلقة، ويجب أن يستطيع الناس الثقة بأرشيف تراثي.'],
  ],
  e17: [
    ['Ingredient 1: a free, open-weight Qwen model as the base.', 'المكوّن 1: نموذج Qwen مجاني مفتوح الأوزان كأساس.'],
    ['Ingredient 2: RAG, for checked facts and references from an archive.', 'المكوّن 2: RAG، لحقائق موثقة ومراجع من أرشيف.'],
    ['Ingredient 3: fine-tuning, for the expert way of answering.', 'المكوّن 3: الضبط الدقيق، لطريقة الإجابة الخبيرة.'],
    ['The difference: UTAS-70 adds computer vision (YOLO) first, to recognise the plant in a photo.', 'والفرق: يضيف UTAS-70 الرؤية الحاسوبية (YOLO) أولًا للتعرف على النبات في الصورة.'],
  ],
  e18: [
    ['Check your GPU memory, for QLoRA training and for running the model.', 'افحص ذاكرة GPU لديك، للتدريب بـ QLoRA ولتشغيل النموذج.'],
    ['Think about the quality of Arabic you need: 27B usually writes better.', 'وفكّر في جودة العربية التي تحتاجها: 27B يكتب عادة أفضل.'],
    ['Think about speed and cost: 8B is faster and cheaper.', 'وفكّر في السرعة والكلفة: 8B أسرع وأرخص.'],
    ['Decide with evidence: test both on the same questions.', 'وقرّر بالأدلة: اختبر الاثنين على الأسئلة نفسها.'],
  ],
  e19: [
    ['Explain that oral heritage lives in many voices: families and villages may tell or practise things differently.', 'اشرح أن التراث الشفهي يعيش في أصوات كثيرة: قد تروي الأسر والقرى الأشياء أو تمارسها بشكل مختلف.'],
    ['Merging them into one version would erase some of those voices.', 'ودمجها في نسخة واحدة يمحو بعض هذه الأصوات.'],
    ['So the assistant should show each account with its source, saying «تختلف الروايات».', 'لذا يجب أن يعرض المساعد كل رواية مع مصدرها قائلًا «تختلف الروايات».'],
  ],
  e20: [
    ['Consent: ask narrators and communities, and explain how recordings will be used.', 'الموافقة: اسأل الرواة والمجتمعات، واشرح كيف ستُستعمل التسجيلات.'],
    ['Privacy: protect personal details by removing or limiting them.', 'الخصوصية: احمِ التفاصيل الشخصية بحذفها أو تقليلها.'],
    ['Credit and control: name the community, keep data on controlled servers.', 'الفضل والسيطرة: انسب الفضل إلى المجتمع، واحفظ البيانات على خوادم مضبوطة.'],
    ['Respect: let people correct or withdraw their recordings.', 'الاحترام: اسمح للناس بتصحيح تسجيلاتهم أو سحبها.'],
  ],
  e21: [
    ['Start with the backbone: a model already trained on millions of images that knows edges, shapes and textures.', 'ابدأ بالعمود الفقري: نموذج تدرّب على ملايين الصور ويعرف الحواف والأشكال والملامس.'],
    ['Keep it, usually frozen at first.', 'احتفظ به، مجمدًا عادة في البداية.'],
    ['Add and train a small new head that maps what it sees to our plant names.', 'وأضف رأسًا صغيرًا جديدًا ودرّبه ليربط ما يراه بأسماء نباتاتنا.'],
    ['Say the benefit: far fewer photos are needed than training from scratch.', 'وقل الفائدة: نحتاج صورًا أقل بكثير من التدريب من الصفر.'],
  ],
  e22: [
    ['Photos of the same plant are nearly identical.', 'صور النبتة الواحدة شبه متطابقة.'],
    ['A random split puts some in training and some in the test, so the test just asks “have you seen this plant?”: leakage.', 'والتقسيم العشوائي يضع بعضها في التدريب وبعضها في الاختبار، فيسأل الاختبار فقط «هل رأيت هذه النبتة؟»: تسرب.'],
    ['The fix: split by plant or by location, so the score is honest.', 'والعلاج: قسّم حسب النبتة أو الموقع، لتكون النتيجة صادقة.'],
  ],
  e23: [
    ['Tell it as a relay with four stages.', 'احكِها كتتابع من أربع مراحل.'],
    ['YOLO finds the plant and gives a name and a confidence. The app checks the confidence against the threshold.', 'YOLO يجد النبات ويعطي اسمًا ودرجة ثقة، ويقارن التطبيق الثقة بالعتبة.'],
    ['RAG uses the name as a filter and returns the best passages with references.', 'و RAG يستعمل الاسم مُرشِّحًا ويعيد أفضل المقاطع مع مراجعها.'],
    ['Fine-tuned Qwen writes a clear answer, cites the passages and adds a safety note.', 'و Qwen المضبوط يكتب إجابة واضحة، ويستشهد بالمقاطع، ويضيف ملاحظة سلامة.'],
  ],
  e24: [
    ['Facts about plants must be exact, sourced and easy to update, so most references belong in the searchable archive.', 'الحقائق عن النباتات يجب أن تكون دقيقة وموثقة وسهلة التحديث، لذا مكان معظم المراجع الأرشيف القابل للبحث.'],
    ['The archive can grow without retraining.', 'والأرشيف ينمو دون إعادة تدريب.'],
    ['The smaller share becomes examples that teach how to answer, the style and safety habits, not facts to memorise.', 'والحصة الأصغر تصبح أمثلة تعلّم طريقة الإجابة والأسلوب وعادات السلامة، لا حقائق للحفظ.'],
  ],
  e25: [
    ['Give the “yes”: RAG finds evidence, but a language model always writes the answer, so how well it reads heritage matters.', 'قدّم «نعم»: RAG يجد الأدلة، لكن نموذجًا لغويًا يكتب الإجابة دائمًا، لذا تهم جودة قراءته للتراث.'],
    ['Say where fine-tuning helps: local expressions, keeping accounts apart, limiting claims.', 'وقل أين يساعد الضبط: التعابير المحلية، وفصل الروايات، وحصر الادعاءات.'],
    ['Give the “but”: it is optional; start with Qwen + RAG and try instructions first.', 'وقدّم «لكن»: إنه اختياري، فابدأ بـ Qwen + RAG وجرّب التعليمات أولًا.'],
    ['End with proof: claim the gain only after a fair test shows it.', 'واختم بالإثبات: لا تدّعِ التحسن إلا بعد أن يُظهره اختبار عادل.'],
  ],

  // ---------------------------------------------------------------- match and link
  x01: [
    ['Token: the small piece of text a model reads, like a word or part of one.', 'الرمز: قطعة النص الصغيرة التي يقرؤها النموذج، ككلمة أو جزء منها.'],
    ['Epoch: one full trip through all the training data.', 'الحقبة: رحلة كاملة واحدة عبر كل بيانات التدريب.'],
    ['Loss: the number that says how wrong the predictions are.', 'الخسارة: الرقم الذي يقول مقدار خطأ التنبؤات.'],
    ['Inference: using the finished model to answer.', 'الاستدلال: استعمال النموذج المكتمل للإجابة.'],
  ],
  x02: [
    ['Order the four from “trains the most” to “trains nothing”.', 'رتّب الأربعة من «يدرّب الأكثر» إلى «لا يدرّب شيئًا».'],
    ['Full fine-tuning trains every weight; partial trains some top layers.', 'الضبط الكامل يدرّب كل الأوزان، والجزئي يدرّب بعض الطبقات العليا.'],
    ['LoRA trains small adapters beside frozen weights.', 'و LoRA يدرّب مهايئات صغيرة بجانب أوزان مجمدة.'],
    ['Prompting changes no weights at all; it only changes the instructions.', 'والتلقين لا يغيّر أي وزن، بل يغيّر التعليمات فقط.'],
  ],
  x03: [
    ['W is the big original matrix, frozen.', 'W هي المصفوفة الأصلية الكبيرة، مجمدة.'],
    ['A is a thin matrix that squeezes the input down to size r.', 'A مصفوفة رفيعة تضغط المدخل إلى الحجم r.'],
    ['B is a thin matrix that starts at zero, so the adapter begins by changing nothing.', 'B مصفوفة رفيعة تبدأ بالصفر، فيبدأ المهايئ دون أن يغيّر شيئًا.'],
    ['r is the rank: how wide A and B are.', 'r هي الرتبة: عرض A و B.'],
  ],
  x04: [
    ['Remember: 8 bits = 1 byte.', 'تذكّر: 8 بتات = 1 بايت.'],
    ['32 bits = 4 bytes and 16 bits = 2 bytes.', '32 بتًا = 4 بايت، و 16 بتًا = 2 بايت.'],
    ['8 bits = 1 byte and 4 bits = half a byte.', '8 بتات = 1 بايت، و 4 بتات = نصف بايت.'],
  ],
  x05: [
    ['Follow the basketball throw: throw, see the miss, work out the fix, adjust.', 'تتبّع رمية كرة السلة: ارمِ، وانظر إلى الخطأ، واعرف العلاج، وعدّل.'],
    ['Forward pass = throw (predict). Loss = measure the miss.', 'التمرير الأمامي = الرمية (التنبؤ). الخسارة = قياس الخطأ.'],
    ['Backward pass = work out what to change (gradients). Optimizer step = adjust the weights.', 'التمرير الخلفي = معرفة ما يجب تغييره (التدرجات). خطوة المُحسِّن = تعديل الأوزان.'],
  ],
  x06: [
    ['Both high and flat: the model has not learned enough (under-fitting).', 'الاثنتان مرتفعتان ومسطحتان: لم يتعلم النموذج بما يكفي (نقص التعلّم).'],
    ['Validation rising while training falls: memorising (over-fitting).', 'التحقق يرتفع والتدريب ينخفض: حفظ (فرط التعلّم).'],
    ['Wild jumps: steps are too big (learning rate too high).', 'قفزات عنيفة: الخطوات كبيرة جدًا (معدل تعلم مرتفع جدًا).'],
    ['Both falling and levelling off together: healthy training.', 'الاثنتان تنخفضان وتستقران معًا: تدريب سليم.'],
  ],
  x07: [
    ['Training set: the lessons that teach the weights.', 'مجموعة التدريب: الدروس التي تعلّم الأوزان.'],
    ['Validation set: practice quizzes to pick settings and know when to stop.', 'مجموعة التحقق: اختبارات قصيرة لاختيار الإعدادات ومعرفة وقت التوقف.'],
    ['Test set: the sealed final exam, used once.', 'مجموعة الاختبار: الامتحان النهائي المختوم، يُستعمل مرة واحدة.'],
    ['Held-out questions: the fair track for comparing base and fine-tuned models.', 'الأسئلة المحجوبة: المضمار العادل لمقارنة النموذج الأساسي والمضبوط.'],
  ],
  x08: [
    ['A source for every fact needs looking things up: RAG.', 'مصدر لكل معلومة يحتاج إلى البحث: RAG.'],
    ['A consistent storytelling voice is a habit: fine-tuning.', 'صوت سرد ثابت عادة: الضبط الدقيق.'],
    ['A quick format change just needs better instructions in the prompt.', 'تغيير سريع في التنسيق يحتاج فقط تعليمات أفضل في التلقين.'],
    ['Recognising a plant photo needs eyes: a vision model such as YOLO.', 'التعرف على صورة نبات يحتاج إلى عيون: نموذج رؤية مثل YOLO.'],
  ],
  x09: [
    ['Wrong interview found: the search is at fault, so improve the archive search.', 'وُجدت مقابلة خطأ: البحث هو المخطئ، فحسّن البحث في الأرشيف.'],
    ['Right passage but a local word misread again and again: instructions first, then fine-tuning if it persists.', 'المقطع صحيح لكن كلمة محلية تُفهم خطأ مرارًا: التعليمات أولًا، ثم الضبط إن استمر.'],
    ['Faithful, cited answer: nothing is broken, keep Qwen + RAG.', 'إجابة أمينة موثقة: لا شيء معطّل، أبقِ Qwen + RAG.'],
    ['Nothing above the threshold: the archive is missing it, so add the source.', 'لا شيء فوق العتبة: الأرشيف ينقصه ذلك، فأضف المصدر.'],
  ],
  x10: [
    ['Extract: pull the plain text out of the file.', 'الاستخراج: سحب النص الخام من الملف.'],
    ['Chunk: cut it into small passages with a little overlap.', 'التقطيع: قصّه إلى مقاطع صغيرة مع تداخل قليل.'],
    ['Embed: turn each chunk into a vector.', 'التضمين: تحويل كل مقطع إلى متجه.'],
    ['Store: put vector, text and metadata into the database.', 'التخزين: وضع المتجه والنص والبيانات الوصفية في قاعدة البيانات.'],
  ],
  x11: [
    ['Top-k: how many chunks to bring back, for example the best 4.', 'top-k: كم مقطعًا يُعاد، مثلًا أفضل 4.'],
    ['Threshold: the pass mark a chunk needs to count as evidence.', 'العتبة: درجة النجاح التي يحتاجها المقطع ليُعدّ دليلًا.'],
    ['Reranker: reads the question and each chunk together and reorders them more carefully.', 'مُعيد الترتيب: يقرأ السؤال وكل مقطع معًا ويعيد ترتيبها بعناية أكبر.'],
    ['Metadata filter: keeps the search inside one story, species or region.', 'مُرشِّح البيانات الوصفية: يُبقي البحث داخل قصة أو نوع أو منطقة واحدة.'],
  ],
  x12: [
    ['Fixed size: cut every N tokens, even mid-sentence.', 'الحجم الثابت: القطع كل N رمز، حتى وسط الجملة.'],
    ['By sentence: only cut between sentences.', 'حسب الجملة: القطع بين الجمل فقط.'],
    ['By section: follow the document’s headings.', 'حسب القسم: اتباع عناوين الوثيقة.'],
    ['Overlap: repeat a little text between chunks so nothing is cut in half.', 'التداخل: تكرار قليل من النص بين المقاطع كي لا ينقطع شيء.'],
  ],
  x13: [
    ['YOLO sees: it names the plant.', 'YOLO يرى: يسمّي النبات.'],
    ['The RAG archive remembers: facts and references.', 'أرشيف RAG يتذكر: الحقائق والمراجع.'],
    ['Fine-tuned Qwen speaks: it writes the answer.', 'Qwen المضبوط يتكلم: يكتب الإجابة.'],
    ['The evaluation set checks: it proves the system works.', 'مجموعة التقييم تفحص: تثبت أن النظام يعمل.'],
  ],
  x14: [
    ['Qwen 8B: smaller, fits one mid-range GPU, replies faster.', 'Qwen 8B: أصغر، يتسع في GPU متوسطة، يرد أسرع.'],
    ['Qwen 27B: bigger, needs a bigger GPU, usually writes richer answers.', 'Qwen 27B: أكبر، يحتاج GPU أكبر، يكتب عادة إجابات أغنى.'],
    ['4-bit loading: shrinks either model to fit in less memory.', 'التحميل بدقة 4 بت: يصغّر أيًّا منهما ليتسع في ذاكرة أقل.'],
    ['LoRA adapter: the small file you train and share.', 'مهايئ LoRA: الملف الصغير الذي تدرّبه وتشاركه.'],
  ],
  x15: [
    ['Recorded interview: sound, so it is transcribed, then a person checks it.', 'المقابلة المسجلة: صوت، فتُفرَّغ ثم يراجعها شخص.'],
    ['Printed book: a scan, so OCR reads it, then someone proofreads.', 'الكتاب المطبوع: صورة ممسوحة، فيقرؤها OCR ثم يدققها أحد.'],
    ['UNESCO element file: already digital, so the text is extracted from the PDF.', 'ملف عنصر اليونسكو: رقمي أصلًا، فيُستخرج النص من PDF.'],
    ['New community story: added with the narrator’s consent and good metadata.', 'القصة المجتمعية الجديدة: تُضاف بموافقة الراوي وببيانات وصفية جيدة.'],
  ],
  x16: [
    ['«تختلف الروايات»: tells the reader the sources disagree.', '«تختلف الروايات»: تخبر القارئ أن المصادر تختلف.'],
    ['Keeping the proverb’s wording: preserves the original text exactly.', 'الاحتفاظ بنص المثل: يحفظ النص الأصلي بدقة.'],
    ['Citing [1], [2]: lets readers check where each fact came from.', 'الاستشهاد بـ [1] و [2]: يمكّن القارئ من التحقق من مصدر كل معلومة.'],
    ['“My sources do not say”: avoids inventing an answer.', '«مصادري لا تذكر ذلك»: يتجنب اختلاق إجابة.'],
  ],
  x17: [
    ['Backbone: the pre-trained part that extracts what is in the picture.', 'العمود الفقري: الجزء المدرَّب مسبقًا الذي يستخرج ما في الصورة.'],
    ['Head: the new final layer that outputs our plant names.', 'الرأس: الطبقة الأخيرة الجديدة التي تُخرج أسماء نباتاتنا.'],
    ['Augmentation: flips, crops and light changes for more variety.', 'زيادة البيانات: قلب وقص وتغيير إضاءة لتنوع أكبر.'],
    ['Group split: all photos of one plant stay on the same side.', 'تقسيم المجموعات: كل صور النبتة الواحدة تبقى في الجهة نفسها.'],
  ],
  x18: [
    ['Accuracy: out of all guesses, how many were right.', 'الدقة: من كل التخمينات، كم كان صحيحًا.'],
    ['Precision: when it says “Ghaf”, how often it really is Ghaf.', 'الضبط: حين يقول «غاف»، كم مرة يكون غافًا فعلًا.'],
    ['Recall: of all the real Ghaf photos, how many it found.', 'الاستدعاء: من كل صور الغاف الحقيقية، كم وجد.'],
    ['Confusion matrix: the table of true versus predicted classes.', 'مصفوفة الالتباس: جدول الفئات الحقيقية مقابل المتوقعة.'],
  ],
  x19: [
    ['Photo: hands pixels to YOLO.', 'الصورة: تسلّم البكسلات إلى YOLO.'],
    ['YOLO: hands over the species name and its confidence.', 'YOLO: يسلّم اسم النوع ودرجة ثقته.'],
    ['RAG: hands over passages and references.', 'RAG: يسلّم المقاطع والمراجع.'],
    ['Qwen: hands the user a styled, cited answer.', 'Qwen: يسلّم المستخدم إجابة منسقة موثقة.'],
  ],
  x20: [
    ['The plant’s name comes from looking at the photo: YOLO.', 'اسم النبات يأتي من النظر إلى الصورة: YOLO.'],
    ['Uses and facts come from the trusted archive: RAG.', 'الاستعمالات والحقائق تأتي من الأرشيف الموثوق: RAG.'],
    ['Tone and structure are habits: fine-tuning.', 'النبرة والبنية عادات: الضبط الدقيق.'],
    ['The reference list comes from each chunk’s metadata.', 'قائمة المراجع تأتي من البيانات الوصفية لكل مقطع.'],
  ],
  x21: [
    ['system: the rules, such as “answer only from the sources”.', 'system: القواعد، مثل «أجب من المصادر فقط».'],
    ['user: the question.', 'user: السؤال.'],
    ['assistant: the answer the model should learn.', 'assistant: الإجابة التي يجب أن يتعلمها النموذج.'],
    ['context: the passages RAG retrieved, given to the model with the question.', 'السياق: المقاطع التي استرجعها RAG، تُعطى للنموذج مع السؤال.'],
  ],
  x22: [
    ['Base weights: squeezed to 4-bit NF4 and frozen.', 'أوزان الأساس: مضغوطة إلى NF4 بدقة 4 بت ومجمدة.'],
    ['LoRA adapters: kept at 16-bit and trained.', 'مهايئات LoRA: تبقى بدقة 16 بت وتُدرَّب.'],
    ['Computation: the maths runs in 16-bit for accuracy.', 'الحساب: تجري العمليات بدقة 16 بت من أجل الدقة.'],
    ['Saved output: only the adapter file.', 'الناتج المحفوظ: ملف المهايئ فقط.'],
  ],
  x23: [
    ['from_pretrained: load the base model and its tokenizer.', 'from_pretrained: تحميل النموذج الأساسي ومقطِّعه.'],
    ['get_peft_model: add the LoRA adapters.', 'get_peft_model: إضافة مهايئات LoRA.'],
    ['trainer.train(): run the training loop.', 'trainer.train(): تشغيل حلقة التدريب.'],
    ['save_pretrained: save the adapter. Load → adapt → train → save.', 'save_pretrained: حفظ المهايئ. حمّل ← كيّف ← درّب ← احفظ.'],
  ],
  x24: [
    ['Extra lessons for a good student: fine-tuning builds on what the model knows.', 'دروس إضافية لطالب جيد: الضبط الدقيق يبني على ما يعرفه النموذج.'],
    ['Sticky notes on a page: LoRA adds small notes without rewriting the book.', 'ملاحظات لاصقة على صفحة: LoRA تضيف ملاحظات صغيرة دون إعادة كتابة الكتاب.'],
    ['A compressed photo: quantization makes the model smaller with a little loss of detail.', 'صورة مضغوطة: التكميم يصغّر النموذج مع فقدان قليل للتفاصيل.'],
    ['An open-book exam: RAG looks things up before answering.', 'امتحان بكتاب مفتوح: RAG يبحث قبل الإجابة.'],
  ],
  x25: [
    ['“Needs millions of examples” → hundreds of good ones can teach a style.', '«يحتاج ملايين الأمثلة» ← مئات الأمثلة الجيدة تعلّم أسلوبًا.'],
    ['“Low loss means good answers” → also check faithfulness and tone.', '«الخسارة المنخفضة تعني إجابات جيدة» ← افحص الأمانة والنبرة أيضًا.'],
    ['“Fine-tuning adds facts reliably” → use RAG for facts.', '«الضبط يضيف حقائق بموثوقية» ← استعمل RAG للحقائق.'],
    ['“Polished means correct” → check it against the sources.', '«المصقول يعني الصحيح» ← تحقق منه مقابل المصادر.'],
  ],

  // ---------------------------------------------------------------- look at the picture
  i01: [
    ['Read the picture: inputs 1, 0.7 and 0; weights 0.8, 0.5 and −1.5; bias −0.4.', 'اقرأ الصورة: المدخلات 1 و 0.7 و 0، والأوزان 0.8 و 0.5 و −1.5، والانحياز −0.4.'],
    ['Multiply each input by its weight: 1 × 0.8 = 0.8; 0.7 × 0.5 = 0.35; 0 × (−1.5) = 0.', 'اضرب كل مدخل في وزنه: 1 × 0.8 = 0.8، و 0.7 × 0.5 = 0.35، و 0 × (−1.5) = 0.'],
    ['Add them: 0.8 + 0.35 + 0 = 1.15.', 'اجمعها: 0.8 + 0.35 + 0 = 1.15.'],
    ['Add the bias: 1.15 − 0.4 = 0.75. 1.15 forgot the bias; −0.75 would be the rainy day.', 'أضف الانحياز: 1.15 − 0.4 = 0.75. و 1.15 نسيت الانحياز، و −0.75 تكون لليوم الممطر.'],
  ],
  i02: [
    ['Read the picture: inputs 2 and 1; weights 0.5 and −1; bias 0.5.', 'اقرأ الصورة: المدخلات 2 و 1، والأوزان 0.5 و −1، والانحياز 0.5.'],
    ['Multiply: 2 × 0.5 = 1 and 1 × (−1) = −1.', 'اضرب: 2 × 0.5 = 1، و 1 × (−1) = −1.'],
    ['Add them: 1 + (−1) = 0.', 'اجمعهما: 1 + (−1) = 0.'],
    ['Add the bias: 0 + 0.5 = 0.5.', 'أضف الانحياز: 0 + 0.5 = 0.5.'],
  ],
  i03: [
    ['Read the picture: all three inputs are 1; weights 0.2, 0.3 and −0.9; bias 0.', 'اقرأ الصورة: المدخلات الثلاثة كلها 1، والأوزان 0.2 و 0.3 و −0.9، والانحياز 0.'],
    ['Add the products: 0.2 + 0.3 − 0.9 = −0.4.', 'اجمع حواصل الضرب: 0.2 + 0.3 − 0.9 = −0.4.'],
    ['ReLU keeps positive numbers and turns negative ones into 0.', 'و ReLU تُبقي الأرقام الموجبة وتحوّل السالبة إلى 0.'],
    ['−0.4 is negative, so the output is 0. −0.4 is the sum before ReLU.', '−0.4 سالب، فالمخرج 0. و −0.4 هو المجموع قبل ReLU.'],
  ],
  i04: [
    ['Find the two lines: training (blue) and validation (orange).', 'جِد الخطين: التدريب (الأزرق) والتحقق (البرتقالي).'],
    ['At first both go down: the model is learning.', 'في البداية ينخفض الاثنان: النموذج يتعلم.'],
    ['Halfway, the orange line turns upward while the blue keeps falling.', 'وفي المنتصف يتجه الخط البرتقالي صعودًا بينما يواصل الأزرق الانخفاض.'],
    ['Better on studied examples, worse on new ones: over-fitting. The best place to stop is where orange was lowest.', 'أفضل في المدروسة وأسوأ في الجديدة: فرط التعلّم. وأفضل نقطة للتوقف حيث كان البرتقالي في أدنى نقطة.'],
  ],
  i05: [
    ['Look at the height of both lines: they start high and stay high.', 'انظر إلى ارتفاع الخطين: يبدآن مرتفعين ويبقيان مرتفعين.'],
    ['They barely go down, so the model is hardly learning anything.', 'بالكاد ينخفضان، فالنموذج لا يكاد يتعلم شيئًا.'],
    ['That is under-fitting: train longer, give the model more capacity, or check the data and learning rate.', 'وهذا نقص التعلّم: درّب أطول، أو أعطِ النموذج سعة أكبر، أو افحص البيانات ومعدل التعلم.'],
  ],
  i06: [
    ['Look at the shape: the lines zig-zag up and down instead of falling smoothly.', 'انظر إلى الشكل: الخطان يتعرجان صعودًا وهبوطًا بدل الانخفاض بسلاسة.'],
    ['Zig-zags mean each step jumps over the best point and lands on the other side.', 'والتعرج يعني أن كل خطوة تقفز فوق أفضل نقطة وتهبط في الجهة الأخرى.'],
    ['Steps that are too big mean the learning rate is too high. Lower it.', 'والخطوات الكبيرة جدًا تعني أن معدل التعلم مرتفع جدًا، فاخفضه.'],
  ],
  i07: [
    ['Both lines fall quickly at first, then slowly level off.', 'ينخفض الخطان بسرعة أولًا، ثم يستقران ببطء.'],
    ['Validation stays a little above training, and the gap stays small and steady.', 'ويبقى التحقق أعلى من التدريب قليلًا، وتبقى الفجوة صغيرة وثابتة.'],
    ['Nothing turns upward and nothing jumps: this is healthy training.', 'لا شيء يتجه صعودًا ولا شيء يقفز: هذا تدريب سليم.'],
  ],
  i08: [
    ['Read the sizes: W is 1,000 × 1,000 and the rank r is 4.', 'اقرأ الأحجام: W أبعادها 1,000 × 1,000 والرتبة r تساوي 4.'],
    ['B is 1,000 × 4 = 4,000 numbers. A is 4 × 1,000 = 4,000 numbers.', 'B أبعادها 1,000 × 4 = 4,000 رقم، و A أبعادها 4 × 1,000 = 4,000 رقم.'],
    ['Together: 4,000 + 4,000 = 8,000, tiny next to the 1,000,000 in W.', 'معًا: 4,000 + 4,000 = 8,000، صغير جدًا بجانب المليون في W.'],
  ],
  i09: [
    ['Read the sizes: W is 4,096 × 4,096 and the rank r is 16.', 'اقرأ الأحجام: W أبعادها 4,096 × 4,096 والرتبة r تساوي 16.'],
    ['B is 4,096 × 16 = 65,536 numbers, and A is 16 × 4,096 = 65,536.', 'B أبعادها 4,096 × 16 = 65,536 رقمًا، و A أبعادها 16 × 4,096 = 65,536.'],
    ['Together: 65,536 + 65,536 = 131,072, under 1% of W’s 16.8 million.', 'معًا: 65,536 + 65,536 = 131,072، أقل من 1٪ من 16.8 مليونًا في W.'],
  ],
  i10: [
    ['Count the yellow squares on the bottom line: those are the allowed levels.', 'عُدّ المربعات الصفراء على الخط السفلي: إنها المستويات المسموحة.'],
    ['There are 4 of them.', 'هناك 4 منها.'],
    ['Every original weight (the dots on top) moves to the nearest of these 4. With 2 bits, 2 × 2 = 4.', 'كل وزن أصلي (النقاط في الأعلى) ينتقل إلى أقرب هذه الأربعة. ومع 2 بت، 2 × 2 = 4.'],
  ],
  i11: [
    ['Count the allowed levels on the bottom line: there are 8.', 'عُدّ المستويات المسموحة على الخط السفلي: هناك 8.'],
    ['Ask: how many bits give 8 choices? 2 × 2 × 2 = 8.', 'واسأل: كم بتًا تعطي 8 خيارات؟ 2 × 2 × 2 = 8.'],
    ['That is three 2s, so 3 bits.', 'وهذه ثلاثة أضعاف 2، أي 3 بتات.'],
  ],
  i12: [
    ['Find the dashed yellow line: the GPU has 24 GB.', 'جِد الخط الأصفر المتقطع: لدى GPU سعة 24 غ.ب.'],
    ['Check each bar: 16 GB is under, 5 GB is under, 54 GB is far over, 15 GB is under.', 'افحص كل عمود: 16 غ.ب تحته، و 5 غ.ب تحته، و 54 غ.ب فوقه بكثير، و 15 غ.ب تحته.'],
    ['So three fit: 8B 16-bit, 8B 4-bit and 27B 4-bit. Only 27B at 16-bit does not.', 'إذن ثلاثة تتسع: 8B بدقة 16 بت، و 8B بدقة 4 بت، و 27B بدقة 4 بت. ولا يتسع إلا 27B بدقة 16 بت.'],
    ['Remember that training needs extra room on top of the model itself.', 'وتذكّر أن التدريب يحتاج مساحة إضافية فوق النموذج نفسه.'],
  ],
  i13: [
    ['Left of the middle (negative z) the line is flat at 0.', 'يسار المنتصف (z سالب) الخط مسطح عند 0.'],
    ['Right of the middle (positive z) it rises as a straight line.', 'ويمين المنتصف (z موجب) يرتفع كخط مستقيم.'],
    ['“Zero for negatives, straight for positives” is ReLU. Sigmoid would be an S; step would jump.', '«صفر للسالب ومستقيم للموجب» هو ReLU. والسيغمويد يكون على شكل S، والدرجة تقفز.'],
  ],
  i14: [
    ['The line is smooth, low on the left and high on the right.', 'الخط ناعم، منخفض يسارًا ومرتفع يمينًا.'],
    ['It bends like a stretched letter S and never jumps.', 'ينحني كحرف S ممدود ولا يقفز أبدًا.'],
    ['A smooth S between a bottom and a top is the sigmoid.', 'والمنحنى S الناعم بين قاع وقمة هو السيغمويد.'],
  ],
  i15: [
    ['This is the step function: flat, then a sudden jump, then flat again.', 'هذه دالة الدرجة: مسطحة، ثم قفزة مفاجئة، ثم مسطحة مجددًا.'],
    ['Training uses the slope to know which way to move each weight.', 'والتدريب يستعمل الميل ليعرف في أي اتجاه يحرّك كل وزن.'],
    ['On flat parts the slope is 0, so there is no direction: the gradients vanish and learning stalls.', 'وعلى الأجزاء المسطحة يكون الميل 0، فلا اتجاه: تختفي التدرجات ويتوقف التعلم.'],
  ],
  i16: [
    ['The green squares on the diagonal are correct guesses: 18, 15 and 16.', 'المربعات الخضراء على القطر تخمينات صحيحة: 18 و 15 و 16.'],
    ['Add them: 18 + 15 + 16 = 49 correct.', 'اجمعها: 18 + 15 + 16 = 49 صحيحة.'],
    ['Add every square for the total: 20 + 20 + 20 = 60 photos.', 'واجمع كل المربعات للمجموع: 20 + 20 + 20 = 60 صورة.'],
    ['49 ÷ 60 ≈ 0.82, about 82%.', '49 ÷ 60 ≈ 0.82، أي نحو 82٪.'],
  ],
  i17: [
    ['Look only at the pink squares (mistakes) off the diagonal.', 'انظر فقط إلى المربعات الوردية (الأخطاء) خارج القطر.'],
    ['Ghaf guessed as Acacia: 3. Acacia guessed as Ghaf: 4. Together 7.', 'غاف خُمّن أكاسيا: 3، وأكاسيا خُمّن غافًا: 4. معًا 7.'],
    ['Other pairs are smaller: Boswellia and Ghaf 1 + 2 = 3; Boswellia and Acacia 1 + 0 = 1.', 'والأزواج الأخرى أصغر: اللبان والغاف 1 + 2 = 3، واللبان والأكاسيا 1 + 0 = 1.'],
    ['So Ghaf and Acacia are confused most. More photos of those two would help.', 'إذن الغاف والأكاسيا هما الأكثر التباسًا، وصور أكثر لهما ستساعد.'],
  ],
  i18: [
    ['Read the boxes: Upload → Extract → ? → Embed → Store.', 'اقرأ المربعات: الرفع ← الاستخراج ← ؟ ← التضمين ← التخزين.'],
    ['After extracting the text we have one long text; before embedding we need small pieces.', 'بعد الاستخراج لدينا نص طويل واحد، وقبل التضمين نحتاج قطعًا صغيرة.'],
    ['Cutting into small pieces is chunking. Fine-tuning, reranking and YOLO do not belong in indexing.', 'والتقطيع إلى قطع صغيرة هو التقطيع إلى مقاطع. والضبط الدقيق وإعادة الترتيب و YOLO لا مكان لها في الفهرسة.'],
  ],
  i19: [
    ['Read the boxes: Question → Embed question → ? → Rerank → Cited answer.', 'اقرأ المربعات: السؤال ← تضمين السؤال ← ؟ ← إعادة الترتيب ← إجابة موثقة.'],
    ['Once the question is a vector, we must find the stored chunks closest to it.', 'حين يصبح السؤال متجهًا، يجب أن نجد أقرب المقاطع المخزنة إليه.'],
    ['Finding the nearest vectors is vector search. Only then can a reranker reorder the results.', 'وإيجاد أقرب المتجهات هو البحث المتجهي، وبعدها فقط يستطيع مُعيد الترتيب ترتيب النتائج.'],
  ],
  i20: [
    ['Read the boxes: Photo → YOLO → ? → Fine-tuned Qwen → Answer.', 'اقرأ المربعات: الصورة ← YOLO ← ؟ ← Qwen المضبوط ← الإجابة.'],
    ['YOLO gives a plant name, but Qwen needs facts and references to write from.', 'YOLO يعطي اسم النبات، لكن Qwen يحتاج حقائق ومراجع ليكتب منها.'],
    ['The step that finds facts for that name is the RAG archive search: YOLO sees, RAG remembers, Qwen speaks.', 'والخطوة التي تجد حقائق ذلك الاسم هي البحث في أرشيف RAG: YOLO يرى، و RAG يتذكر، و Qwen يتكلم.'],
  ],
  i21: [
    ['The star is the question. The dots are chunks, placed by meaning.', 'النجمة هي السؤال، والنقاط مقاطع موضوعة حسب المعنى.'],
    ['Closer on the map means more similar in meaning.', 'والأقرب على الخريطة يعني الأشبه في المعنى.'],
    ['B is right next to the star; A, C and D are further away. So B is returned first.', 'B بجانب النجمة مباشرة، و A و C و D أبعد. إذن يُعاد B أولًا.'],
  ],
  i22: [
    ['Each bar is a chunk of 200 tokens.', 'كل شريط مقطع من 200 رمز.'],
    ['The yellow shaded part is where two neighbouring bars cover the same text.', 'والجزء المظلل بالأصفر حيث يغطي شريطان متجاوران النص نفسه.'],
    ['That overlap is 50 tokens: each new chunk repeats the last 50 tokens of the one before.', 'وهذا التداخل 50 رمزًا: كل مقطع جديد يكرر آخر 50 رمزًا من المقطع الذي قبله.'],
  ],
  i23: [
    ['Read the label: confidence 0.62. Read the corner: threshold 0.75.', 'اقرأ التسمية: الثقة 0.62. واقرأ الزاوية: العتبة 0.75.'],
    ['0.62 is smaller than 0.75, so YOLO is not sure enough (the box is dashed yellow).', '0.62 أصغر من 0.75، فـ YOLO غير متأكد بما يكفي (المربع أصفر متقطع).'],
    ['The safe action is to ask for a clearer photo instead of sending a maybe-wrong name to RAG.', 'والتصرف الآمن طلب صورة أوضح بدل إرسال اسم قد يكون خاطئًا إلى RAG.'],
  ],
  i24: [
    ['Read the label: confidence 0.94. Read the corner: threshold 0.75.', 'اقرأ التسمية: الثقة 0.94. واقرأ الزاوية: العتبة 0.75.'],
    ['0.94 is bigger than 0.75, so the detection passes (the box is solid green).', '0.94 أكبر من 0.75، فيمر الاكتشاف (المربع أخضر متصل).'],
    ['Next, the species name is handed to RAG and used to filter the archive search.', 'ثم يُسلَّم اسم النوع إلى RAG ويُستعمل لتصفية البحث في الأرشيف.'],
  ],
  i25: [
    ['The big grey grid with a lock is W: the original weights, frozen.', 'الشبكة الرمادية الكبيرة مع القفل هي W: الأوزان الأصلية المجمدة.'],
    ['The thin orange strips are B and A: the LoRA adapter.', 'والشريطان البرتقاليان الرفيعان هما B و A: مهايئ LoRA.'],
    ['Frozen means not trained, so only the orange strips learn.', 'والمجمد يعني غير مُدرَّب، لذا لا يتعلم إلا الشريطان البرتقاليان.'],
  ],
};
