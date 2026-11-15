import type { Poster } from './HouseReferences';

export const EXAM_FEATURE_NAMES = ['study_hours', 'attendance'];
export const EXAM_TARGET_NAMES = ['exam_score'];
export const EXAM_TRAIN_ROWS = 1000;
export const EXAM_VALIDATION_ROWS = 100;
export const EXAM_TEST_ROWS = 100;
export const EXAM_BATCH_SIZE = 100;
export const EXAM_LEARNING_RATE = 0.05;
export const EXAM_CASE_EPOCHS = 10;

/** The only architecture the Exam case teaches. */
export const EXAM_NETWORK_SHAPE = {
  inputs: 2,
  hidden: [3],
  outputs: 1,
};

export function isExamShape(featureCount: number, outputCount: number) {
  return featureCount === EXAM_NETWORK_SHAPE.inputs
    && outputCount === EXAM_NETWORK_SHAPE.outputs;
}

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

export const EXAM_POSTERS: Poster[] = [
  {
    id: 'exam-english',
    kicker: 'Poster 1 · English',
    title: 'How a neural network learns to predict exam scores',
    caption: 'Study hours and attendance → predicted exam score. The full training process: one student per row, a 2 → 3 → 1 network, 1,000 students, 100 students per batch, 10 updates per epoch, seed 42, and the 9 weights plus 4 biases that stay fixed in number.',
    alt: 'English infographic showing a student table with study hours, attendance and exam score; a 2 to 3 to 1 network; 1,000 students split into 10 batches of 100; and the forward pass, loss, backpropagation and optimizer steps inside each batch.',
    thumb: asset('reference/exam-poster-en-thumb.webp'),
    full: asset('reference/exam-poster-en.webp'),
    width: 1536,
    height: 1024,
  },
  {
    id: 'exam-arabic',
    kicker: 'Poster 2 · العربية',
    title: 'كيف تتعلّم الشبكة العصبية توقّع درجات الاختبار؟',
    caption: 'نسخة عربية من الملصق: ساعات الدراسة ونسبة الحضور ← درجة الاختبار المتوقعة، مع تقسيم 1,000 طالب إلى 10 دفعات من 100، وتحديث واحد لكل دفعة، وبذرة 42، والشبكة 2 → 3 → 1.',
    alt: 'ملصق عربي يوضح جدول الطالب وساعات الدراسة ونسبة الحضور ودرجة الاختبار، وشبكة من طبقتين إلى ثلاث خلايا إلى مخرج واحد، وتقسيم 1,000 طالب إلى 10 دفعات من 100، وخطوات التدريب داخل الدفعة.',
    thumb: asset('reference/exam-poster-ar-thumb.webp'),
    full: asset('reference/exam-poster-ar.webp'),
    width: 1536,
    height: 1024,
  },
];
