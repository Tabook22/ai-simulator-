/**
 * Part 12, "RAG in depth": the well-known places to store and search embeddings. Students pick a
 * situation and the matching option lights up in the comparison table (with official links); then
 * one TurathAI record shows what is stored, and the suggested stack keeps SQLite for app data and
 * Qdrant for heritage search.
 */
import { useState } from 'react';
import { Icon } from './ui';
import type { IconName } from './ui';
import { t, useTx } from './FineTuneScenes';
import type { Text } from './FineTuneScenes';
import { JsonCode } from './FineTuneLessons';

type Key = 'chroma' | 'qdrant' | 'pgvector' | 'pinecone' | 'weaviate' | 'milvus' | 'faiss';

export const VECTOR_DATABASES: { key: Key; name: string; type: Text; when: Text; url: string; link: Text }[] = [
  { key: 'chroma', name: 'Chroma', url: 'https://docs.trychroma.com/',
    type: t('Embeddable vector database', 'قاعدة بيانات متجهات قابلة للتضمين في التطبيق'),
    when: t('Classroom demos and quick Python prototypes.', 'العروض في الصف والنماذج الأولية السريعة بلغة Python.'),
    link: t('Chroma documentation', 'توثيق Chroma') },
  { key: 'qdrant', name: 'Qdrant', url: 'https://qdrant.tech/documentation/',
    type: t('Dedicated vector database, self-hosted or managed', 'قاعدة بيانات متجهات مخصّصة، مستضافة ذاتيًا أو مُدارة'),
    when: t('A RAG application that filters sources by region, language or source type.', 'تطبيق RAG يصفّي المصادر حسب المنطقة أو اللغة أو نوع المصدر.'),
    link: t('Qdrant documentation', 'توثيق Qdrant') },
  { key: 'pgvector', name: 'pgvector', url: 'https://github.com/pgvector/pgvector',
    type: t('PostgreSQL extension', 'إضافة لقاعدة PostgreSQL'),
    when: t('An application that already uses PostgreSQL and wants to keep embeddings alongside its other data.', 'تطبيق يستخدم PostgreSQL أصلًا ويريد حفظ التضمينات بجانب بياناته الأخرى.'),
    link: t('pgvector on GitHub', 'pgvector على GitHub') },
  { key: 'pinecone', name: 'Pinecone', url: 'https://docs.pinecone.io/guides/get-started/overview',
    type: t('Managed vector database', 'قاعدة بيانات متجهات مُدارة'),
    when: t('A cloud application where the provider handles database operations.', 'تطبيق سحابي يتولى فيه المزوّد تشغيل قاعدة البيانات.'),
    link: t('Pinecone documentation', 'توثيق Pinecone') },
  { key: 'weaviate', name: 'Weaviate', url: 'https://docs.weaviate.io/weaviate',
    type: t('Dedicated vector database, self-hosted or managed', 'قاعدة بيانات متجهات مخصّصة، مستضافة ذاتيًا أو مُدارة'),
    when: t('Combining keyword and vector search, for example when users search for the exact wording of a proverb.', 'الجمع بين البحث بالكلمات المفتاحية والبحث بالمتجهات، مثلًا حين يبحث المستخدمون عن النص الحرفي لمثل.'),
    link: t('Weaviate documentation', 'توثيق Weaviate') },
  { key: 'milvus', name: 'Milvus', url: 'https://milvus.io/docs',
    type: t('Dedicated vector database, self-hosted or managed', 'قاعدة بيانات متجهات مخصّصة، مستضافة ذاتيًا أو مُدارة'),
    when: t('A large collection that needs a dedicated vector search system.', 'مجموعة كبيرة تحتاج إلى نظام بحث متجهات مخصّص.'),
    link: t('Milvus documentation', 'توثيق Milvus') },
  { key: 'faiss', name: 'FAISS', url: 'https://github.com/facebookresearch/faiss',
    type: t('Vector search library', 'مكتبة بحث متجهات'),
    when: t('Local experiments where your application manages source metadata and persistence itself.', 'التجارب المحلية التي يتولى فيها تطبيقك بنفسه حفظ البيانات الوصفية للمصادر وتخزينها الدائم.'),
    link: t('FAISS on GitHub', 'FAISS على GitHub') },
];

const NEEDS: { icon: IconName; text: Text; pick: Key }[] = [
  { icon: 'play', text: t('A quick demo in class', 'عرض سريع في الصف'), pick: 'chroma' },
  { icon: 'search', text: t('Filter by region, language or source type', 'التصفية حسب المنطقة أو اللغة أو نوع المصدر'), pick: 'qdrant' },
  { icon: 'grid', text: t('My app already uses PostgreSQL', 'تطبيقي يستخدم PostgreSQL أصلًا'), pick: 'pgvector' },
  { icon: 'external', text: t('Let a cloud provider run it', 'دع مزوّدًا سحابيًا يشغّلها'), pick: 'pinecone' },
  { icon: 'book', text: t('Find a proverb’s exact wording too', 'إيجاد النص الحرفي للمثل أيضًا'), pick: 'weaviate' },
  { icon: 'layers', text: t('A very large collection', 'مجموعة كبيرة جدًا'), pick: 'milvus' },
  { icon: 'code', text: t('A local experiment in my own code', 'تجربة محلية في شيفرتي'), pick: 'faiss' },
];

/** One searchable TurathAI record: a passage, its vector and the details that make the citation. */
const RECORD = `{
  "id": "T-014-3",
  "text": "…one passage of the transcript…",
  "embedding": [0.12, -0.08, 0.31, "… 1,024 numbers"],
  "source_title": "Oral collection, Salalah",
  "source_type": "audio transcript",
  "recording_timestamp": "00:12:40–00:14:05",
  "page": null,
  "region": "Dhofar",
  "dialect": "Dhofari Arabic",
  "language": "ar"
}`;

export function VectorDatabases() {
  const say = useTx();
  const [pick, setPick] = useState<Key | null>(null);
  return <div className="rd-vdb" data-testid="vector-databases">
    <h4 className="llm-sub ft-handson"><Icon name="grid" size={13}/>{say(t('Well-known vector databases: where the vectors live', 'قواعد بيانات متجهات معروفة: أين تعيش المتجهات'))}</h4>
    <p className="pc-lead">{say(t('After embedding, every chunk’s vector is stored with its text and metadata so it can be searched by meaning. Many tools can do this. They differ in where they run, who operates them, and what search they add on top. Pick a situation to see which option fits.',
      'بعد التضمين يُخزَّن متجه كل مقطع مع نصه وبياناته الوصفية ليُبحث فيه بالمعنى. وكثير من الأدوات تستطيع ذلك، وتختلف في مكان تشغيلها، ومن يتولى إدارتها، ونوع البحث الذي تضيفه. اختر حالة لترى الخيار المناسب.'))}</p>

    <div className="rd-vdb-needs" role="group" aria-label={say(t('Your situation', 'حالتك'))}>
      {NEEDS.map(need => <button key={need.pick} type="button" className={pick === need.pick ? 'on' : ''} aria-pressed={pick === need.pick}
        onClick={() => setPick(pick === need.pick ? null : need.pick)} data-testid={`vdb-need-${need.pick}`}>
        <Icon name={need.icon} size={13}/>{say(need.text)}</button>)}
    </div>

    <div className="rd-vdb-table" role="table" aria-label={say(t('Vector databases compared', 'مقارنة قواعد بيانات المتجهات'))}>
      <div className="row head" role="row">
        <span role="columnheader">{say(t('Option', 'الخيار'))}</span><span role="columnheader">{say(t('Type', 'النوع'))}</span>
        <span role="columnheader">{say(t('When to use it', 'متى تستخدمه'))}</span><span role="columnheader">{say(t('Official link', 'الرابط الرسمي'))}</span>
      </div>
      {VECTOR_DATABASES.map(db => <div key={db.key} role="row" data-testid={`vdb-row-${db.key}`}
        className={`row${pick === db.key ? ' on' : ''}${pick && pick !== db.key ? ' dim' : ''}${db.key === 'qdrant' ? ' start' : ''}`}>
        <span role="rowheader"><b dir="ltr">{db.name}</b>{db.key === 'qdrant' && <em>{say(t('start here', 'ابدأ هنا'))}</em>}</span>
        <span role="cell">{say(db.type)}</span>
        <span role="cell">{say(db.when)}</span>
        <span role="cell"><a href={db.url} target="_blank" rel="noreferrer">{say(db.link)}<Icon name="external" size={12}/></a></span>
      </div>)}
    </div>

    <div className="rd-vdb-advice">
      <p><Icon name="target" size={15}/><span>{say(t('For the Omani intangible heritage RAG application, start with Qdrant if you want a dedicated vector database you can run locally or on your VPS. If the application already uses PostgreSQL, pgvector is a natural fit.',
        'لتطبيق RAG للتراث العُماني غير المادي، ابدأ بـ Qdrant إن أردت قاعدة بيانات متجهات مخصّصة تشغّلها محليًا أو على خادمك الافتراضي (VPS). وإن كان التطبيق يستخدم PostgreSQL أصلًا، فإن pgvector خيار طبيعي.'))}</span></p>
      <a className="button small" href="https://qdrant.tech/documentation/" target="_blank" rel="noreferrer" data-testid="vdb-qdrant-start">
        <Icon name="play" size={13}/>{say(t('Begin with the Local Quickstart in the Qdrant docs', 'ابدأ بدليل التشغيل المحلي السريع في توثيق Qdrant'))}<Icon name="external" size={12}/></a>
    </div>

    <h5 className="pc-h5">{say(t('In TurathAI: what one searchable record holds', 'في تراث AI: ماذا يحوي السجل الواحد القابل للبحث'))}</h5>
    <div className="rd-vdb-record">
      <JsonCode text={RECORD}/>
      <div className="rd-vdb-explain">
        <p>{say(t('Each searchable record is one passage from a document or a transcript. Its embedding is stored together with the source title, the page number or recording timestamp, and any region or dialect labels.',
          'كل سجل قابل للبحث مقطع واحد من وثيقة أو تفريغ تسجيل. ويُخزَّن متجه تضمينه مع عنوان المصدر، ورقم الصفحة أو الطابع الزمني للتسجيل، وأي تسميات للمنطقة أو اللهجة.'))}</p>
        <ol>
          <li>{say(t('A student asks a question.', 'يطرح الطالب سؤالًا.'))}</li>
          <li>{say(t('The retriever returns the relevant passages and their source references (filtered by region or dialect when needed).', 'يعيد المسترجِع المقاطع ذات الصلة ومراجع مصادرها (مع التصفية حسب المنطقة أو اللهجة عند الحاجة).'))}</li>
          <li>{say(t('The fine-tuned Qwen model uses those passages to write the answer with citations.', 'يستخدم نموذج Qwen المضبوط تلك المقاطع ليكتب الإجابة مع الاستشهادات.'))}</li>
        </ol>
      </div>
    </div>

    <h5 className="pc-h5">{say(t('Where it fits in a FastAPI + React + SQLite application', 'موقعها في تطبيق FastAPI + React + SQLite'))}</h5>
    <div className="rd-vdb-stack" data-testid="vdb-stack">
      <span className="box ui"><b>React</b><small>{say(t('the web app', 'تطبيق الويب'))}</small></span>
      <Icon name="arrow" size={16}/>
      <span className="box api"><b>FastAPI</b><small>{say(t('questions and answers', 'الأسئلة والإجابات'))}</small></span>
      <Icon name="arrow" size={16}/>
      <span className="pair">
        <span className="box sql"><b>SQLite</b><small>{say(t('users, settings, saved chats', 'المستخدمون والإعدادات والمحادثات المحفوظة'))}</small></span>
        <span className="box vec"><b>Qdrant</b><small>{say(t('heritage passages and their vectors', 'مقاطع التراث ومتجهاتها'))}</small></span>
      </span>
    </div>
    <p className="pc-note"><Icon name="bulb" size={13}/>{say(t('Keep SQLite for the application’s own data and use Qdrant for heritage search. Each does the job it is built for, and the archive can grow or be re-indexed without touching the app’s data.',
      'احتفظ بـ SQLite لبيانات التطبيق نفسه، واستخدم Qdrant للبحث في التراث. فكلٌّ يؤدي العمل الذي صُمّم له، ويمكن للأرشيف أن يكبر أو يُعاد فهرسته دون المساس ببيانات التطبيق.'))}</p>
  </div>;
}
