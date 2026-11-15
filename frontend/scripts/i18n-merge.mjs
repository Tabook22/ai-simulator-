// Joins the extracted English ("ID<TAB>English") with translated lines ("ID<TAB>Arabic")
// and writes src/locales/ar.json as { "English": "Arabic" }.
//
//   node scripts/i18n-merge.mjs <strings-directory> <translations-directory>
//
// Entries already in ar.json are kept unless a new translation replaces them, so the file
// can also be edited by hand. A line whose Arabic is "=" means "leave this in English".
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [strings, translations] = process.argv.slice(2);
if (!strings || !translations) throw new Error('Give the strings directory and the translations directory.');
const target = fileURLToPath(new URL('../src/locales/ar.json', import.meta.url));

function table(directory) {
  const rows = new Map();
  for (const name of readdirSync(directory).filter(file => file.endsWith('.txt'))) {
    for (const line of readFileSync(join(directory, name), 'utf8').split(/\r?\n/)) {
      const tab = line.indexOf('\t');
      if (tab < 0) continue;
      rows.set(line.slice(0, tab).trim(), line.slice(tab + 1).replace(/\\n/g, '\n').trim());
    }
  }
  return rows;
}

const english = table(strings);
const arabic = table(translations);
const merged = existsSync(target) ? JSON.parse(readFileSync(target, 'utf8')) : {};
let added = 0;
let unknown = 0;
for (const [id, text] of arabic) {
  const source = english.get(id);
  if (source === undefined) { unknown += 1; console.warn(`No English text for ${id}`); continue; }
  if (!text || text === '=') { delete merged[source]; continue; }
  const holes = text => [...text.matchAll(/\{(\d+)\}/g)].map(match => match[1]).sort().join();
  if (holes(source) !== holes(text)) console.warn(`Placeholders differ in ${id}: ${source}`);
  merged[source] = text;
  added += 1;
}
const ordered = Object.fromEntries(Object.entries(merged).sort(([left], [right]) => left.localeCompare(right)));
writeFileSync(target, `${JSON.stringify(ordered, null, 1)}\n`);
console.log(`${added} translations merged, ${Object.keys(ordered).length} entries in ar.json, ${english.size - added} strings left in English${unknown ? `, ${unknown} unknown ids` : ''}.`);
