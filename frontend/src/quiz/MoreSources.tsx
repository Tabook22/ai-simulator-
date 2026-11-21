/**
 * "Read more sources", inside "Explain it step by step": searches the internet for the idea behind the
 * answer. It shows live Wikipedia summaries in the student's language, plus one-click searches on
 * Google, YouTube, Wikipedia and Google Scholar. Only the topic is sent, never anything the student typed.
 */
import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../ui';
import { useI18n } from '../i18n';
import { t, useTx } from '../FineTuneScenes';
import { pickRelevant, searchWikipedia, topicsFor, webSearches } from './searchTopics';
import type { WikiHit } from './searchTopics';

type Status = 'loading' | 'done' | 'error';

export function MoreSources({ part, clues }: { part: number; clues: string[] }) {
  const say = useTx();
  const { isArabic } = useI18n();
  const lang = isArabic ? 'ar' : 'en';
  const topics = useMemo(() => topicsFor(part, clues), [part, clues]);
  const [chosen, setChosen] = useState(0);
  const item = topics[Math.min(chosen, topics.length - 1)];
  const [hits, setHits] = useState<WikiHit[]>([]);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    const control = new AbortController();
    setStatus('loading');
    (async () => {
      const relevant = (hits: WikiHit[]) => pickRelevant(hits, item);
      const arabic = lang === 'ar' && item.wiki[1] !== '';
      let found = relevant(await searchWikipedia(arabic ? item.wiki[1] : item.wiki[0], arabic ? 'ar' : 'en', control.signal));
      // Arabic Wikipedia has fewer AI articles: fall back to English so there is always something to read.
      if (found.length === 0 && arabic) found = relevant(await searchWikipedia(item.wiki[0], 'en', control.signal));
      setHits(found);
      setStatus('done');
    })().catch(() => { if (!control.signal.aborted) setStatus('error'); });
    return () => control.abort();
  }, [item, lang]);

  const label = (pair: [string, string]) => say(t(pair[0], pair[1]));
  return <div className="qz-sources" data-testid="qz-sources">
    <div className="qz-src-head">
      <b><Icon name="search" size={14}/>{say(t('More sources about this answer', 'مصادر إضافية عن هذه الإجابة'))}</b>
      <small>{say(t('Pick a topic. We search the internet for it; nothing you typed is sent.', 'اختر موضوعًا، وسنبحث عنه في الإنترنت دون إرسال أي شيء كتبته.'))}</small>
    </div>
    <div className="qz-src-topics" role="tablist" aria-label={say(t('Search topic', 'موضوع البحث'))}>
      {topics.map((option, index) => <button key={option.key} type="button" role="tab" aria-selected={option === item}
        className={option === item ? 'on' : ''} onClick={() => setChosen(index)}>{label(option.label)}</button>)}
    </div>

    <div className="qz-src-block">
      <span className="qz-src-sub">{say(t('Quick read from Wikipedia', 'قراءة سريعة من ويكيبيديا'))}</span>
      {status === 'loading' && <p className="qz-src-note" data-testid="qz-src-loading">{say(t('Searching…', 'جارٍ البحث…'))}</p>}
      {status === 'error' && <p className="qz-src-note">{say(t('We could not reach Wikipedia right now. The search buttons below still work.', 'تعذّر الوصول إلى ويكيبيديا الآن. أزرار البحث بالأسفل ما زالت تعمل.'))}</p>}
      {status === 'done' && hits.length === 0 && <p className="qz-src-note">{say(t('No article found for this topic. Try another topic or the buttons below.', 'لم نجد مقالة لهذا الموضوع. جرّب موضوعًا آخر أو الأزرار بالأسفل.'))}</p>}
      {status === 'done' && hits.length > 0 && <ul className="qz-src-hits" data-testid="qz-src-hits">
        {hits.map(hit => <li key={hit.url} dir={hit.lang === 'ar' ? 'rtl' : 'ltr'} lang={hit.lang}>
          <a href={hit.url} target="_blank" rel="noopener noreferrer" data-keep>{hit.title}<Icon name="external" size={11}/></a>
          <p data-keep>{hit.extract}</p>
          {hit.lang !== lang && <small>{say(t('', 'بالإنجليزية'))}</small>}
        </li>)}
      </ul>}
    </div>

    <div className="qz-src-block">
      <span className="qz-src-sub">{say(t('Search further', 'ابحث أكثر'))}</span>
      <div className="qz-src-web">
        {webSearches(item, lang).map(site => <a key={site.key} href={site.url} target="_blank" rel="noopener noreferrer" className={`qz-src-site ${site.key}`}>
          <strong>{label(site.name)}</strong><small>{label(site.hint)}</small></a>)}
      </div>
    </div>
    <small className="qz-src-tip">{say(t(
      'Internet pages are written by many people. Compare two sources, and check with your teacher or the lab part if they disagree.',
      'صفحات الإنترنت يكتبها أشخاص كثيرون. قارن بين مصدرين، وراجع معلمك أو جزء المختبر إذا اختلفا.'))}</small>
  </div>;
}
