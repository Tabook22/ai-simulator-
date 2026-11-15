// Lists every piece of English text the interface can show, so it can be translated.
//
//   node scripts/i18n-extract.mjs <output-directory>
//
// One file per source file is written: each line is "ID<TAB>English". A template such as
// `Layer ${n} of ${count}` is listed as "Layer {0} of {1}". Translations are written as
// "ID<TAB>Arabic" files and merged into src/locales/ar.json by i18n-merge.mjs.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const source = fileURLToPath(new URL('../src', import.meta.url));
const output = process.argv[2];
if (!output) throw new Error('Give an output directory.');
mkdirSync(output, { recursive: true });

const TEXT_ATTRIBUTES = new Set(['aria-label', 'title', 'placeholder', 'alt', 'label', 'aria-description']);
const CODE = /path\(|translate\(|rgba?\(|calc\(|url\(|var\(|^\/|https?:|^\.{0,2}\/|^[#.][\w-]+$|^\s*$/;
const hasWord = text => /[A-Za-z]{2,}/.test(text);

/** The same whitespace rule the JSX compiler applies to text between tags. */
function jsxText(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length === 1) return text;
  return lines.map((line, index) => {
    let value = line.replace(/\t/g, ' ');
    if (index > 0) value = value.replace(/^ +/, '');
    if (index < lines.length - 1) value = value.replace(/ +$/, '');
    return value;
  }).filter(Boolean).join(' ');
}

function attributeName(node) {
  let parent = node.parent;
  if (parent && ts.isJsxExpression(parent)) parent = parent.parent;
  return parent && ts.isJsxAttribute(parent) ? parent.name.getText() : null;
}

function wanted(node, text) {
  const attribute = attributeName(node);
  if (attribute) return TEXT_ATTRIBUTES.has(attribute) && hasWord(text);
  const parent = node.parent;
  if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent) || ts.isLiteralTypeNode(parent)
    || ts.isCaseClause(parent) || ts.isElementAccessExpression(parent)) return false;
  if (ts.isPropertyAssignment(parent) && parent.name === node) return false;
  if (ts.isBinaryExpression(parent) && /^[!=]==?$/.test(parent.operatorToken.getText())) return false;
  if (CODE.test(text)) return false;
  // Sentences and labels have a capital letter or several words; identifiers and class names do not.
  return hasWord(text) && (/[A-Z]/.test(text) || /[a-z]{2,} [a-z]{2,} [a-z]{2,}/.test(text));
}

let total = 0;
let words = 0;
for (const name of readdirSync(source).filter(file => /\.tsx?$/.test(file)).sort()) {
  const file = ts.createSourceFile(name, readFileSync(join(source, name), 'utf8'), ts.ScriptTarget.Latest, true,
    name.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found = new Set();
  const visit = node => {
    if (ts.isJsxText(node)) {
      const text = jsxText(node.text).trim();
      if (hasWord(text)) found.add(text);
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const text = node.text.trim();
      if (wanted(node, text)) found.add(text);
    } else if (ts.isTemplateExpression(node)) {
      const text = (node.head.text + node.templateSpans.map((span, index) => `{${index}}${span.literal.text}`).join('')).trim();
      const literal = text.replace(/\{\d+\}/g, '');
      if (wanted(node, literal) && /[A-Za-z]{3,}/.test(literal)) found.add(text);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  if (found.size === 0) continue;
  const stem = basename(name).replace(/\.tsx?$/, '');
  const lines = [...found].map((text, index) => `${stem}.${index + 1}\t${text.replace(/\n/g, '\\n')}`);
  writeFileSync(join(output, `${stem}.txt`), `${lines.join('\n')}\n`);
  const count = [...found].reduce((sum, text) => sum + text.split(/\s+/).length, 0);
  console.log(`${String(found.size).padStart(5)} strings ${String(count).padStart(6)} words  ${name}`);
  total += found.size;
  words += count;
}
console.log(`${String(total).padStart(5)} strings ${String(words).padStart(6)} words  in total`);
