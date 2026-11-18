/**
 * The TurathAI case study: a real student project (UTAS) that plans to fine-tune Qwen3.8-27B
 * on verified Omani intangible-heritage data with QLoRA and Unsloth, then answer with RAG.
 *
 * The heritage facts below come from UNESCO's descriptions of each inscribed element, as the
 * project's own method requires (source-grounded records). The model answers in the evaluation
 * workbench are written illustrations for teaching, not outputs of a trained model.
 */
import { t } from './FineTuneScenes';
import type { Text } from './FineTuneScenes';

export type Split = 'train' | 'validation' | 'test';

export interface HeritageRecord {
  /** The story family: every question about one element goes to the same split. */
  family: string;
  name: Text;
  category: Text;
  region: Text;
  source: string;
  url: string;
  split: Split;
  pairs: { question: Text; answer: Text }[];
}

export const RECORDS: HeritageRecord[] = [
  {
    family: 'al-barah',
    name: t('Al-Bar’ah', 'البرعة'),
    category: t('Performing art', 'فن أدائي'),
    region: t('Dhofar valleys', 'أودية ظفار'),
    source: 'UNESCO ICH, 2010',
    url: 'https://ich.unesco.org/en/RL/al-bar-ah-music-and-dance-of-oman-dhofari-valleys-00372',
    split: 'train',
    pairs: [
      { question: t('What is Al-Bar’ah?', 'ما هي البرعة؟'),
        answer: t('Al-Bar’ah is a performing art from the Dhofari valleys of Oman that combines dance, music and poetry. It was inscribed on UNESCO’s list of intangible cultural heritage in 2010.',
          'البرعة فن أدائي من أودية ظفار في سلطنة عُمان يجمع بين الرقص والموسيقى والشعر، وقد أُدرجت في قائمة اليونسكو للتراث الثقافي غير المادي عام 2010.') },
      { question: t('How is Al-Bar’ah performed?', 'كيف تُؤدّى البرعة؟'),
        answer: t('Ten to thirty men and women stand in a half circle, chanting and clapping, while two male dancers holding khanjars perform set movements, raising the daggers above shoulder level.',
          'يقف ما بين عشرة وثلاثين رجلًا وامرأة في نصف دائرة يردّدون ويصفّقون، بينما يؤدي راقصان من الرجال يحملان الخناجر حركات منظّمة، رافعَين الخناجر فوق مستوى الكتف.') },
      { question: t('Does Al-Bar’ah have only one form?', 'هل للبرعة شكل واحد؟'),
        answer: t('No. Each tribe has its own form of Al-Bar’ah, with different drum rhythms and dance movements.',
          'لا، فلكل قبيلة شكلها الخاص من البرعة، بإيقاعات طبول وحركات رقص مختلفة.') },
    ],
  },
  {
    family: 'al-khanjar',
    name: t('Al-Khanjar', 'الخنجر'),
    category: t('Craft and social practice', 'حرفة وممارسة اجتماعية'),
    region: t('Oman', 'عُمان'),
    source: 'UNESCO ICH, 2022',
    url: 'https://ich.unesco.org/en/RL/al-khanjar-craft-skills-and-social-practices-01844',
    split: 'validation',
    pairs: [
      { question: t('What is the Omani khanjar?', 'ما هو الخنجر العُماني؟'),
        answer: t('The khanjar is part of the traditional dress of men in Oman, worn around the waist, and it is part of the state emblem. Its craft skills and social practices were inscribed by UNESCO in 2022.',
          'الخنجر جزء من اللباس التقليدي للرجل في عُمان يُلبس حول الخصر، وهو جزء من الشعار الوطني. وقد أدرجت اليونسكو مهارات حرفته وممارساته الاجتماعية عام 2022.') },
      { question: t('What is a khanjar made of?', 'ممّ يُصنع الخنجر؟'),
        answer: t('It is made from materials including wood, leather, cloth and silver, and its engraved designs reflect a connection to the land.',
          'يُصنع من مواد متعددة منها الخشب والجلد والقماش والفضة، وتعكس نقوشه ارتباط الإنسان بأرضه.') },
      { question: t('When is the khanjar worn?', 'متى يُلبس الخنجر؟'),
        answer: t('At national and religious events and on special occasions such as weddings. It is also given as a gift to official guests.',
          'في المناسبات الوطنية والدينية والمناسبات الخاصة مثل الأعراس، كما يُهدى إلى الضيوف الرسميين.') },
    ],
  },
  {
    family: 'alhedaa',
    name: t('Alheda’a', 'الحداء'),
    category: t('Oral tradition', 'تقليد شفهي'),
    region: t('Oman, Saudi Arabia and the UAE', 'عُمان والسعودية والإمارات'),
    source: 'UNESCO ICH, 2022',
    url: 'https://ich.unesco.org/en/RL/alheda-a-oral-traditions-of-calling-camel-flocks-01717',
    split: 'test',
    pairs: [
      { question: t('What is Alheda’a?', 'ما هو الحداء؟'),
        answer: t('Alheda’a is an oral tradition in which herders direct their camel flocks with sung calls, sometimes with gestures or instruments. It was inscribed in 2022, shared by Oman, Saudi Arabia and the United Arab Emirates.',
          'الحداء تقليد شفهي يوجّه فيه الرعاة قطعان الإبل بنداءات مغنّاة، وقد يستعينون بالإشارات أو الآلات. أُدرج عام 2022 بالاشتراك بين عُمان والسعودية والإمارات.') },
      { question: t('Why do herders use Alheda’a?', 'لماذا يستخدم الرعاة الحداء؟'),
        answer: t('To guide the camels to water, feed and milking, and to gather them quickly when there is danger, such as a sandstorm.',
          'لتوجيه الإبل إلى الماء والمرعى والحلب، ولجمعها بسرعة عند الخطر مثل العواصف الرملية.') },
      { question: t('How is Alheda’a passed on?', 'كيف ينتقل الحداء بين الأجيال؟'),
        answer: t('Within families: children join the herders on their daily trips and learn by watching and taking part.',
          'داخل الأسر، إذ يرافق الأطفال الرعاة في رحلاتهم اليومية فيتعلمونه بالمشاهدة والمشاركة.') },
    ],
  },
];

export const SPLIT_NAMES: Record<Split, Text> = {
  train: t('training set', 'مجموعة التدريب'),
  validation: t('validation set', 'مجموعة التحقق'),
  test: t('test set', 'مجموعة الاختبار'),
};

export const QUESTIONS = [
  { tag: 'Q1', text: t('Does fine-tuning on verified Omani heritage make Qwen3.8-27B more accurate and culturally relevant than the original?',
    'هل يجعل الضبط الدقيق على تراث عُماني موثَّق نموذج Qwen3.8-27B أدق وأقرب إلى الثقافة من النموذج الأصلي؟') },
  { tag: 'Q2', text: t('Can the assistant find the right passages in the heritage archive and cite its sources?',
    'هل يستطيع المساعد إيجاد المقاطع الصحيحة في أرشيف التراث والاستشهاد بمصادره؟') },
  { tag: 'Q3', text: t('Can users study heritage easily, and admins manage the content, in the web app?',
    'هل يستطيع المستخدمون دراسة التراث بسهولة، والمشرفون إدارة المحتوى، في تطبيق الويب؟') },
  { tag: 'Q4', text: t('Can QLoRA adapt a 27-billion-weight model on limited, rented GPU resources?',
    'هل تستطيع QLoRA تكييف نموذج بسبعة وعشرين مليار وزن على موارد GPU محدودة ومستأجرة؟') },
];

export const PHASES = [
  { title: t('Confirm requirements', 'تأكيد المتطلبات'),
    produce: t('Agreed scope, permissions, the exact Qwen checkpoint and its licence, and success criteria, with the supervisor.',
      'نطاق متفق عليه، والأذونات، ونسخة Qwen المحددة وترخيصها، ومعايير النجاح، بالاتفاق مع المشرف.') },
  { title: t('Collect and verify', 'الجمع والتحقق'),
    produce: t('A source register (title, region, rights, verification) and reviewed Arabic text, with story variants kept.',
      'سجل مصادر (العنوان، المنطقة، الحقوق، التحقق) ونص عربي مراجَع، مع الإبقاء على روايات القصص المختلفة.') },
  { title: t('Prepare the datasets', 'تجهيز مجموعات البيانات'),
    produce: t('train.jsonl, validation.jsonl and test.jsonl, split by source or story family so no story leaks into the test.',
      'الملفات train.jsonl و validation.jsonl و test.jsonl، مقسّمة حسب المصدر أو عائلة القصة حتى لا تتسرب قصة إلى الاختبار.') },
  { title: t('Baseline and GPU pilot', 'خط الأساس وتجربة GPU'),
    produce: t('The original model’s answers to the test questions, plus a short RunPod pilot: chat template, memory, batch size, adapter save and reload.',
      'إجابات النموذج الأصلي عن أسئلة الاختبار، مع تجربة قصيرة على RunPod: قالب المحادثة، والذاكرة، وحجم الدفعة، وحفظ المهايئ وإعادة تحميله.') },
  { title: t('Fine-tune', 'الضبط الدقيق'),
    produce: t('The LoRA adapter files and a training log: loss, GPU memory, time and the full configuration.',
      'ملفات مهايئ LoRA وسجل تدريب: الخسارة، وذاكرة GPU، والوقت، والإعدادات كاملة.') },
  { title: t('Evaluate', 'التقييم'),
    produce: t('Scoring sheets for both models on the same unseen questions, with the same generation settings.',
      'أوراق تقييم للنموذجين على أسئلة غير مرئية نفسها، بإعدادات التوليد نفسها.') },
  { title: t('Integrate', 'الدمج'),
    produce: t('The web app: a User Dashboard and an Admin Dashboard, connected to the model and to retrieval with citations.',
      'تطبيق الويب: لوحة للمستخدم ولوحة للمشرف، متصلتان بالنموذج وبالاسترجاع مع الاستشهادات.') },
  { title: t('Document', 'التوثيق'),
    produce: t('Results, limitations, deployment steps and the controlled process for adding new verified heritage.',
      'النتائج، والقيود، وخطوات النشر، والإجراء المضبوط لإضافة تراث جديد موثَّق.') },
];

export const CRITERIA = [
  t('Factual accuracy', 'الدقة في الحقائق'),
  t('Cultural relevance', 'الصلة الثقافية'),
  t('Answers the question', 'الإجابة عن السؤال'),
  t('Arabic language quality', 'جودة اللغة العربية'),
];

export const EVAL_QUESTION = t('When is the Omani khanjar worn, and what is it made of?', 'متى يُلبس الخنجر العُماني، وممّ يُصنع؟');

export const EVAL_ANSWERS = [
  { model: t('Original model', 'النموذج الأصلي'),
    answer: t('The khanjar is a traditional weapon of the Arabian Peninsula used for hunting and self-defence. It is usually made of iron and ivory.',
      'الخنجر سلاح تقليدي في الجزيرة العربية يُستخدم في الصيد والدفاع عن النفس، ويُصنع عادةً من الحديد والعاج.'),
    teacher: [2, 2, 2, 4], hallucinations: 2, cites: false,
    why: t('Fluent but wrong for this question: it invents hunting, self-defence and ivory (2 unsupported claims) and never says when it is worn.',
      'إجابة سلسة لكنها خاطئة لهذا السؤال: تخترع الصيد والدفاع عن النفس والعاج (ادعاءان غير مدعومين) ولا تذكر متى يُلبس.') },
  { model: t('Fine-tuned', 'بعد الضبط الدقيق'),
    answer: t('It is worn around the waist at national and religious events and at weddings. It is made from wood, leather, cloth and silver, and it is part of Oman’s state emblem.',
      'يُلبس حول الخصر في المناسبات الوطنية والدينية والأعراس، ويُصنع من الخشب والجلد والقماش والفضة، وهو جزء من الشعار الوطني لعُمان.'),
    teacher: [5, 5, 5, 5], hallucinations: 0, cites: false,
    why: t('Correct and complete, in the style of the training data. But the reader cannot check where the facts came from.',
      'صحيحة وكاملة، بأسلوب بيانات التدريب. لكن القارئ لا يستطيع التحقق من مصدر الحقائق.') },
  { model: t('Fine-tuned + RAG', 'الضبط الدقيق + الاسترجاع'),
    answer: t('It is worn around the waist at national and religious events and on occasions such as weddings, and it is given to official guests. It is made from wood, leather, cloth and silver. [Source: UNESCO, Al-Khanjar, craft skills and social practices, 2022]',
      'يُلبس حول الخصر في المناسبات الوطنية والدينية والمناسبات الخاصة مثل الأعراس، ويُهدى إلى الضيوف الرسميين. ويُصنع من الخشب والجلد والقماش والفضة. [المصدر: اليونسكو، الخنجر: مهارات الحرفة والممارسات الاجتماعية، 2022]'),
    teacher: [5, 5, 5, 5], hallucinations: 0, cites: true,
    why: t('Correct, and it shows its source, so a student or researcher can verify it. This is what research question Q2 tests.',
      'صحيحة وتعرض مصدرها، فيستطيع الطالب أو الباحث التحقق منها. وهذا ما يختبره سؤال البحث Q2.') },
];

export const TURATH_CODE = `from unsloth import FastModel

# 1) Load the 27B base in 4-bit: it is frozen from here on (QLoRA)
#    The project names "Qwen3.8-27B". Before a real run, use the exact model ID
#    and revision from Unsloth's list of supported models, and check its licence.
model, tokenizer = FastModel.from_pretrained(
    model_name = "unsloth/Qwen3.8-27B-unsloth-bnb-4bit",
    max_seq_length = 2048,
    load_in_4bit = True,
    full_finetuning = False,
)

# 2) Attach LoRA adapters to the language layers only (TurathAI is text-only)
model = FastModel.get_peft_model(
    model,
    finetune_vision_layers = False,
    finetune_language_layers = True,
    finetune_attention_modules = True,
    finetune_mlp_modules = True,
    r = 16, lora_alpha = 16, lora_dropout = 0, bias = "none",
    use_gradient_checkpointing = "unsloth",
    random_state = 3407,
)

# 3) The verified Arabic question-answer pairs, already split by story family
from datasets import load_dataset
data = load_dataset("json", data_files = {
    "train": "turath_train.jsonl", "validation": "turath_validation.jsonl"})

def to_chat(row):
    messages = [{"role": "user", "content": row["question"]},
                {"role": "assistant", "content": row["answer"]}]
    return {"text": tokenizer.apply_chat_template(messages, tokenize = False)}

data = data.map(to_chat)

# 4) Train on a rented RunPod GPU
from trl import SFTTrainer, SFTConfig
trainer = SFTTrainer(
    model = model, tokenizer = tokenizer,
    train_dataset = data["train"], eval_dataset = data["validation"],
    args = SFTConfig(
        dataset_text_field = "text",
        per_device_train_batch_size = 1,
        gradient_accumulation_steps = 4,
        num_train_epochs = 2,
        learning_rate = 2e-4,
        optim = "adamw_8bit",
        logging_steps = 10,
        output_dir = "turath_outputs",
    ),
)
trainer.train()

# 5) Save the adapter: the Phase 5 deliverable (test that it reloads!)
model.save_pretrained("turath_lora")
tokenizer.save_pretrained("turath_lora")`;
