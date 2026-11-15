import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { readStored, writeStored } from './libraryStorage';
import { addTranslations, setActiveLanguage, translate } from './translate';
import type { Language } from './translate';

export type { Language };

type Dictionary = Record<string, string>;

const STORAGE_KEY = 'neuron-lab-language';

const ARABIC: Dictionary = {
  // Shell and navigation
  'Neuron Lab': 'مختبر الخلايا العصبية',
  'learn by watching': 'تعلّم بالمشاهدة',
  Library: 'المكتبة',
  Watch: 'مشاهدة',
  Glossary: 'المصطلحات',
  Lessons: 'الدروس',
  'Presentation view': 'عرض تقديمي',
  'Exit presentation': 'إنهاء العرض',
  'Explore the network': 'استكشف الشبكة',
  'Teach the network': 'درّب الشبكة',
  'Worked examples': 'أمثلة محلولة',
  Playground: 'الملعب',
  'House case': 'مثال المنازل',
  Advisor: 'المستشار',
  'Python guide': 'دليل بايثون',
  'LLM playground': 'ملعب النماذج اللغوية',
  Language: 'اللغة',
  English: 'الإنجليزية',
  العربية: 'العربية',
  'Classroom modes': 'أوضاع الصف',
  'Close': 'إغلاق',
  Cancel: 'إلغاء',
  Save: 'حفظ',
  Delete: 'حذف',
  Reset: 'إعادة ضبط',
  Play: 'تشغيل',
  Pause: 'إيقاف مؤقت',
  Step: 'خطوة',
  'New data': 'بيانات جديدة',
  'Run': 'تشغيل',
  'Learning rate': 'معدل التعلّم',
  Activation: 'دالة التنشيط',
  Regularization: 'التنظيم',
  'Regularization rate': 'معدل التنظيم',
  'Problem type': 'نوع المسألة',
  Classification: 'تصنيف',
  Regression: 'انحدار',
  'Hidden layers': 'الطبقات المخفية',
  'Epoch': 'الدورة',
  'Test loss': 'خسارة الاختبار',
  'Training loss': 'خسارة التدريب',
  'Show test data': 'إظهار بيانات الاختبار',
  'Discretize output': 'تقريب المخرجات',
  'Data': 'البيانات',
  'Which dataset do you want to use?': 'أي مجموعة بيانات تريد استخدامها؟',
  'Ratio of training to test data': 'نسبة بيانات التدريب إلى الاختبار',
  Noise: 'الضوضاء',
  'Batch size': 'حجم الدفعة',
  Regenerate: 'توليد بيانات جديدة',
  FEATURES: 'المدخلات',
  OUTPUT: 'المخرجات',
  'Click a feature tile to include it. Hover a neuron to see its map in Output. Dots move only while Play is active.':
    'انقر على مربع ميزة لإضافتها. مرّر فوق خلية عصبية لرؤية خريطتها في المخرجات. تتحرك النقاط فقط أثناء التشغيل.',
  'Paused': 'متوقف',
  'Live training': 'تدريب مباشر',
  'Moving dots show signal flow': 'النقاط المتحركة تُظهر تدفق الإشارة',
  'Click a feature to toggle it, a neuron to inspect its bias, or a connection to edit its weight. Hover a neuron to preview its output.':
    'انقر على ميزة لتفعيلها أو تعطيلها، أو على خلية عصبية لفحص انحيازها، أو على اتصال لتعديل وزنه. مرّر فوق خلية عصبية لمعاينة مخرجاتها.',
  'Weight': 'الوزن',
  'Bias': 'الانحياز',
  'Add hidden layer': 'إضافة طبقة مخفية',
  'Remove hidden layer': 'حذف طبقة مخفية',
  'Add neuron to hidden layer': 'إضافة خلية عصبية إلى الطبقة المخفية',
  'Remove neuron from hidden layer': 'حذف خلية عصبية من الطبقة المخفية',
  'colors show data, neuron, and weight values': 'تظهر الألوان قيم البيانات والخلايا العصبية والأوزان',
  'Circle': 'دائرة',
  'XOR': 'XOR',
  'Gaussian': 'غاوسي',
  'Spiral': 'لولبي',
  'Plane': 'مستوى',
  'Points inside a circle versus points outside it.': 'نقاط داخل الدائرة مقابل نقاط خارجها.',
  'Alternating quadrants — no single straight boundary separates them.':
    'أرباع متبادلة — لا يفصلها حد مستقيم واحد.',
  'Two separated, overlapping Gaussian clusters.': 'عنقودان غاوسيان منفصلان ومتداخلان.',
  'Two intertwined arms that need a wavy boundary.': 'ذراعان متشابكتان تحتاجان إلى حد متموّج.',
  'A smooth plane: the target rises diagonally across the space.':
    'مستوى أملس: ترتفع القيمة الهدف قطريًا عبر الفضاء.',
  'Six alternating Gaussian bumps form a continuous target surface.':
    'ستة نتوءات غاوسية متبادلة تشكّل سطحًا هدفًا متصلًا.',
  'Live network': 'الشبكة المباشرة',
  'Features → hidden → output': 'المدخلات ← الطبقات المخفية ← المخرجات',
  'Train to see the loss curve.': 'درّب الشبكة لرؤية منحنى الخسارة.',
  'Tinker with a neural network': 'جرّب شبكة عصبية',
  'Pick a pattern, choose features, add hidden layers, and press Play. Change one thing at a time. You cannot break it.':
    'اختر نمطًا، واختر المدخلات، وأضف طبقات مخفية، ثم اضغط تشغيل. غيّر شيئًا واحدًا في كل مرة. لا يمكنك إفسادها.',
  'Based on TensorFlow Playground': 'مستوحى من TensorFlow Playground',
  'Data source: synthetic classroom data.': 'مصدر البيانات: بيانات صفية اصطناعية.',
  // Hero
  'Interactive AI classroom': 'صف تفاعلي للذكاء الاصطناعي',
  'See how a neuron': 'شاهد كيف',
  thinks: 'تفكّر',
  'Follow a real calculation from input to output, open any neuron, and train the network yourself — no setup, no accounts.':
    'تابع حسابًا حقيقيًا من المدخل إلى المخرج، وافتح أي خلية عصبية، ودرّب الشبكة بنفسك — دون إعداد أو حسابات.',
  'What you can do here': 'ما يمكنك فعله هنا',
  'Live math': 'رياضيات حية',
  'Six animated stages': 'ست مراحل متحركة',
  'Try, then train': 'جرّب ثم درّب',
  'Classroom journey': 'رحلة الصف',
  'Pick a starting network:': 'اختر شبكة للبدء:',
  'One neuron by hand': 'خلية عصبية واحدة يدويًا',
  'Multiply, add, activate': 'اضرب، اجمع، فعّل',
  'Two layers': 'طبقتان',
  'Hidden neurons join in': 'تنضم الخلايا المخفية',
  'Why activation?': 'لماذا دالة التنشيط؟',
  'Linear vs ReLU at −3': 'الخطية مقابل ReLU عند −3',
  'AND gate': 'بوابة AND',
  'Teach it with examples': 'درّبها بالأمثلة',
  'Classroom quest': 'مهمة الصف',
  'Quest complete': 'اكتملت المهمة',
  'Your quest': 'مهمتك',
  'You followed a whole neuron from input to update. Nice work.':
    'تابعت خلية عصبية كاملة من المدخل إلى التحديث. عمل رائع.',
  'Four small moves that show the whole idea.': 'أربع خطوات صغيرة توضّح الفكرة كاملة.',
  'Run the numbers': 'شغّل الأرقام',
  'Open a neuron': 'افتح خلية عصبية',
  'Change a weight': 'غيّر وزنًا',
  'Teach the net': 'درّب الشبكة',
  'Done: ': 'تم: ',
  'Not yet: ': 'ليس بعد: ',
  'Reset quest progress': 'إعادة ضبط تقدم المهمة',
  'DATA': 'البيانات',
  'None': 'بدون',
  '2D playground · TensorFlow Playground-style': 'ملعب ثنائي الأبعاد · بأسلوب TensorFlow Playground',
  'Step one epoch': 'خطوة دورة واحدة',
  'neuron': 'خلية عصبية',
  'neurons': 'خلايا عصبية',
  'prediction': 'التنبؤ',
  '{count} updates · {params} parameters': '{count} تحديثًا · {params} معاملًا',
  'Watch video lectures': 'مشاهدة محاضرات الفيديو',
  'Initialize sets the starting values. A forward pass uses them. Training updates them from examples.':
    'التهيئة تحدد القيم الابتدائية. تمرير أمامي يستخدمها. التدريب يحدّثها من الأمثلة.',
};

// The shell and the Playground were translated first; everything else lives in locales/ar.json.
addTranslations(ARABIC);

interface I18nValue {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (text: string, values?: Record<string, string | number>) => string;
  isArabic: boolean;
  dir: 'ltr' | 'rtl';
}

const I18nContext = createContext<I18nValue | null>(null);

function initialLanguage(): Language {
  return readStored(STORAGE_KEY) === 'ar' ? 'ar' : 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  // The engine must know the language before any element below is created.
  setActiveLanguage(language);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    writeStored(STORAGE_KEY, language);
    document.title = language === 'ar' ? 'مختبر الخلايا العصبية · شاهد كيف تفكّر الخلية العصبية' : 'Neuron Lab · See how a neuron thinks';
  }, [language]);

  const setLanguage = useCallback((next: Language) => setLanguageState(next), []);
  const toggleLanguage = useCallback(() => setLanguageState(current => current === 'en' ? 'ar' : 'en'), []);
  const t = useCallback((text: string, values?: Record<string, string | number>) => {
    let translated = language === 'en' ? text : translate(text);
    if (values) {
      for (const [key, value] of Object.entries(values)) {
        translated = translated.replaceAll(`{${key}}`, String(value));
      }
    }
    return translated;
  }, [language]);

  const value = useMemo<I18nValue>(() => ({
    language, setLanguage, toggleLanguage, t, isArabic: language === 'ar', dir: language === 'ar' ? 'rtl' : 'ltr',
  }), [language, setLanguage, toggleLanguage, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside LanguageProvider');
  return context;
}

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();
  return <div className="language-switcher" role="group" aria-label={t('Language')}>
    <button type="button" className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}
      aria-pressed={language === 'en'}>EN</button>
    <button type="button" className={language === 'ar' ? 'active' : ''} onClick={() => setLanguage('ar')}
      aria-pressed={language === 'ar'} lang="ar">العربية</button>
  </div>;
}
