/**
 * "Learn more" for each lab part (0-based): trusted outside resources. The quiz also links back to the
 * part itself and shows that part's glossary words. Most outside resources are in English.
 */
import { STEPS_MCQ_A } from './steps-mcq-a';
import { STEPS_MCQ_B } from './steps-mcq-b';
import { STEPS_FILL } from './steps-fill';
import { STEPS_OTHER } from './steps-other';
import type { Pair } from './types';

/** Every question's step-by-step explanation, by question id. */
export const STEPS: Record<string, Pair[]> = { ...STEPS_MCQ_A, ...STEPS_MCQ_B, ...STEPS_FILL, ...STEPS_OTHER };

export interface Resource { title: Pair; url: string; kind: Pair }

const R = {
  hfCourse: { title: ['Hugging Face LLM course', 'دورة Hugging Face للنماذج اللغوية'], url: 'https://huggingface.co/learn/llm-course', kind: ['free course', 'دورة مجانية'] },
  mlcc: { title: ['Google Machine Learning Crash Course', 'دورة Google المكثفة في تعلّم الآلة'], url: 'https://developers.google.com/machine-learning/crash-course', kind: ['free course', 'دورة مجانية'] },
  b1b: { title: ['3Blue1Brown: neural networks (videos)', '3Blue1Brown: الشبكات العصبية (فيديو)'], url: 'https://www.3blue1brown.com/topics/neural-networks', kind: ['videos', 'فيديو'] },
  jsonl: { title: ['JSON Lines format', 'صيغة أسطر JSON'], url: 'https://jsonlines.org', kind: ['reference', 'مرجع'] },
  templates: { title: ['Chat templates (Transformers docs)', 'قوالب المحادثة (توثيق Transformers)'], url: 'https://huggingface.co/docs/transformers/main/en/chat_templating', kind: ['documentation', 'توثيق'] },
  peft: { title: ['PEFT documentation (LoRA and adapters)', 'توثيق PEFT (LoRA والمهايئات)'], url: 'https://huggingface.co/docs/peft', kind: ['documentation', 'توثيق'] },
  lora: { title: ['LoRA: the original paper (Hu et al., 2021)', 'LoRA: الورقة الأصلية (Hu وآخرون، 2021)'], url: 'https://arxiv.org/abs/2106.09685', kind: ['research paper', 'ورقة بحثية'] },
  qlora: { title: ['QLoRA: the original paper (Dettmers et al., 2023)', 'QLoRA: الورقة الأصلية (Dettmers وآخرون، 2023)'], url: 'https://arxiv.org/abs/2305.14314', kind: ['research paper', 'ورقة بحثية'] },
  bnb: { title: ['bitsandbytes: 4-bit and 8-bit quantization', 'bitsandbytes: التكميم بدقة 4 و 8 بت'], url: 'https://huggingface.co/docs/bitsandbytes', kind: ['documentation', 'توثيق'] },
  unsloth: { title: ['Unsloth documentation', 'توثيق Unsloth'], url: 'https://docs.unsloth.ai', kind: ['documentation', 'توثيق'] },
  sft: { title: ['TRL SFTTrainer guide', 'دليل SFTTrainer في TRL'], url: 'https://huggingface.co/docs/trl/sft_trainer', kind: ['documentation', 'توثيق'] },
  rag: { title: ['RAG: the original paper (Lewis et al., 2020)', 'RAG: الورقة الأصلية (Lewis وآخرون، 2020)'], url: 'https://arxiv.org/abs/2005.11401', kind: ['research paper', 'ورقة بحثية'] },
  sbert: { title: ['Sentence Transformers: embeddings and semantic search', 'Sentence Transformers: التضمينات والبحث الدلالي'], url: 'https://www.sbert.net', kind: ['documentation', 'توثيق'] },
  qwen: { title: ['Qwen models on Hugging Face', 'نماذج Qwen على Hugging Face'], url: 'https://huggingface.co/Qwen', kind: ['model hub', 'مستودع نماذج'] },
  unesco: { title: ['UNESCO: Intangible Cultural Heritage', 'اليونسكو: التراث الثقافي غير المادي'], url: 'https://ich.unesco.org', kind: ['official site', 'موقع رسمي'] },
  transfer: { title: ['PyTorch tutorial: transfer learning for images', 'درس PyTorch: التعلم بالنقل للصور'], url: 'https://pytorch.org/tutorials/beginner/transfer_learning_tutorial.html', kind: ['tutorial', 'درس'] },
  metrics: { title: ['scikit-learn: accuracy, precision, recall, confusion matrix', 'scikit-learn: الدقة والضبط والاستدعاء ومصفوفة الالتباس'], url: 'https://scikit-learn.org/stable/modules/model_evaluation.html', kind: ['documentation', 'توثيق'] },
  yolo: { title: ['Ultralytics YOLO documentation', 'توثيق Ultralytics YOLO'], url: 'https://docs.ultralytics.com', kind: ['documentation', 'توثيق'] },
} satisfies Record<string, Resource>;

export const RESOURCES: Resource[][] = [
  [R.hfCourse, R.mlcc],          // 0 why fine-tune
  [R.b1b, R.mlcc],               // 1 key words
  [R.jsonl, R.templates],        // 2 data
  [R.peft, R.lora],              // 3 freeze
  [R.lora, R.peft],              // 4 LoRA
  [R.bnb, R.qlora],              // 5 quantization
  [R.qlora, R.unsloth],          // 6 QLoRA
  [R.unsloth, R.sft],            // 7 Unsloth
  [R.b1b, R.mlcc],               // 8 one training step
  [R.mlcc, R.hfCourse],          // 9 workflow and evaluation
  [R.rag, R.hfCourse],           // 10 fine-tuning, RAG or both
  [R.rag, R.sbert],              // 11 RAG in depth
  [R.qwen, R.qlora],             // 12 two projects, one recipe
  [R.unesco, R.rag],             // 13 TurathAI
  [R.transfer, R.metrics],       // 14 vision
  [R.yolo, R.transfer],          // 15 UTAS-70
];
