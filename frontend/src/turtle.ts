/**
 * A small reader for Turtle (.ttl) files, enough for teaching: @prefix lines, "subject predicate
 * object ." statements, ";" (same subject) and "," (same predicate), <full IRIs>, prefixed names,
 * "a" for rdf:type, quoted literals with an optional @lang or ^^type, numbers and # comments.
 * It turns the text into triples with full identifiers, and lays the triples out as a diagram.
 */

export const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

export interface Term { kind: 'iri' | 'literal'; value: string; written: string; lang?: string }
export interface ParsedTriple { s: Term; p: Term; o: Term; line: number }
export interface TurtleError { line: number; message: string }
export interface ParseResult { prefixes: Record<string, string>; triples: ParsedTriple[]; errors: TurtleError[] }

type Token = { type: 'iri' | 'pname' | 'literal' | 'number' | 'a' | 'prefix' | 'punct' | 'bad'; text: string; line: number; lang?: string };

function tokenize(source: string): { tokens: Token[]; errors: TurtleError[] } {
  const tokens: Token[] = [];
  const errors: TurtleError[] = [];
  let line = 1;
  let i = 0;
  while (i < source.length) {
    const char = source[i];
    if (char === '\n') { line++; i++; continue; }
    if (/\s/.test(char)) { i++; continue; }
    if (char === '#') { while (i < source.length && source[i] !== '\n') i++; continue; }
    if (char === '<') {
      const end = source.indexOf('>', i);
      if (end < 0 || source.slice(i, end).includes('\n')) { errors.push({ line, message: 'An identifier in < > is not closed with >.' }); i++; continue; }
      tokens.push({ type: 'iri', text: source.slice(i + 1, end), line });
      i = end + 1;
      continue;
    }
    if (char === '"') {
      let j = i + 1;
      let text = '';
      while (j < source.length && source[j] !== '"' && source[j] !== '\n') {
        if (source[j] === '\\' && j + 1 < source.length) { text += source[j + 1]; j += 2; } else text += source[j++];
      }
      if (source[j] !== '"') { tokens.push({ type: 'bad', text: 'A quoted name is not closed with ".', line }); i = j; continue; }
      j++;
      let lang: string | undefined;
      const tag = /^@([a-zA-Z]+(?:-[a-zA-Z0-9]+)*)/.exec(source.slice(j));
      if (tag) { lang = tag[1]; j += tag[0].length; }
      const type = /^\^\^(<[^>\s]*>|[A-Za-z][\w-]*:[\w-]*)/.exec(source.slice(j));
      if (type) j += type[0].length;
      tokens.push({ type: 'literal', text, line, lang });
      i = j;
      continue;
    }
    if ('.;,'.includes(char) && !/[0-9]/.test(source[i + 1] ?? '')) { tokens.push({ type: 'punct', text: char, line }); i++; continue; }
    const word = /^[^\s<>";,]+/.exec(source.slice(i))?.[0] ?? char;
    // A statement's final "." may be written straight after a name: h:Mirbat.
    const clean = word.length > 1 && word.endsWith('.') ? word.slice(0, -1) : word;
    if (clean === '@prefix' || clean.toUpperCase() === 'PREFIX') tokens.push({ type: 'prefix', text: clean, line });
    else if (clean === 'a') tokens.push({ type: 'a', text: clean, line });
    else if (/^[+-]?\d+(\.\d+)?$/.test(clean)) tokens.push({ type: 'number', text: clean, line });
    else if (/^[A-Za-z_][\w.-]*:[\w.\-%]*$|^:[\w.\-%]*$/.test(clean)) tokens.push({ type: 'pname', text: clean, line });
    else tokens.push({ type: 'bad', text: `“${clean}” is not a name Turtle understands. Names look like h:Mirbat or <https://…>.`, line });
    i += clean.length;
  }
  return { tokens, errors };
}

export function parseTurtle(source: string): ParseResult {
  const { tokens, errors } = tokenize(source);
  const prefixes: Record<string, string> = {};
  const triples: ParsedTriple[] = [];
  let k = 0;
  const peek = () => tokens[k];
  const skipStatement = () => { while (k < tokens.length && !(tokens[k].type === 'punct' && tokens[k].text === '.')) k++; k++; };
  const term = (token: Token | undefined, role: 'subject' | 'predicate' | 'object'): Term | string => {
    if (!token) return `The statement ends before its ${role}.`;
    if (token.type === 'bad') return token.text;
    if (token.type === 'iri') return { kind: 'iri', value: token.text, written: `<${token.text}>` };
    if (token.type === 'a') return role === 'predicate' ? { kind: 'iri', value: RDF_TYPE, written: 'a' } : '“a” can only be used as a predicate.';
    if (token.type === 'pname') {
      const at = token.text.indexOf(':');
      const prefix = token.text.slice(0, at);
      if (!(prefix in prefixes)) return `The prefix “${prefix}:” is not defined. Add a line such as @prefix ${prefix}: <https://example.org/heritage/> .`;
      return { kind: 'iri', value: prefixes[prefix] + token.text.slice(at + 1), written: token.text };
    }
    if ((token.type === 'literal' || token.type === 'number') && role === 'object') return { kind: 'literal', value: token.text, written: token.type === 'literal' ? `"${token.text}"` : token.text, lang: token.lang };
    if (token.type === 'literal' || token.type === 'number') return `A value in quotes can only be an object, not a ${role}.`;
    return `Expected a ${role} but found “${token.text}”.`;
  };
  while (k < tokens.length) {
    const start = peek();
    if (start.type === 'prefix') {
      const name = tokens[k + 1], iri = tokens[k + 2];
      if (name?.type !== 'pname' || !name.text.endsWith(':') || iri?.type !== 'iri') {
        errors.push({ line: start.line, message: 'Write a prefix as: @prefix h: <https://example.org/heritage/> .' });
        skipStatement();
        continue;
      }
      prefixes[name.text.slice(0, -1)] = iri.text;
      k += 3;
      if (start.text === '@prefix') {
        if (peek()?.type === 'punct' && peek().text === '.') k++;
        else errors.push({ line: start.line, message: 'An @prefix line must end with a period (.).' });
      }
      continue;
    }
    const subject = term(tokens[k++], 'subject');
    if (typeof subject === 'string') { errors.push({ line: start.line, message: subject }); k--; skipStatement(); continue; }
    let failed = false;
    for (;;) {
      const predicateToken = tokens[k++];
      const predicate = term(predicateToken, 'predicate');
      if (typeof predicate === 'string') { errors.push({ line: predicateToken?.line ?? start.line, message: predicate }); failed = true; break; }
      for (;;) {
        const objectToken = tokens[k++];
        const object = term(objectToken, 'object');
        if (typeof object === 'string') { errors.push({ line: objectToken?.line ?? start.line, message: object }); failed = true; break; }
        triples.push({ s: subject, p: predicate, o: object, line: objectToken.line });
        if (peek()?.type === 'punct' && peek().text === ',') { k++; continue; }
        break;
      }
      if (failed) break;
      if (peek()?.type === 'punct' && peek().text === ';') {
        k++;
        if (peek()?.type === 'punct' && peek().text === '.') break;
        continue;
      }
      break;
    }
    if (failed) { k--; skipStatement(); continue; }
    if (peek()?.type === 'punct' && peek().text === '.') k++;
    else { errors.push({ line: tokens[k - 1]?.line ?? start.line, message: 'Each statement must end with a period (.).' }); skipStatement(); }
  }
  errors.sort((a, b) => a.line - b.line);
  return { prefixes, triples, errors };
}

// ------------------------------------------------------------------ labels

const localName = (iri: string) => iri.slice(Math.max(iri.lastIndexOf('/'), iri.lastIndexOf('#')) + 1) || iri;

/** "Recording15" → "Recording 15", "TheWiseFisherman" → "The Wise Fisherman". */
export function nodeLabel(term: Term): string {
  if (term.kind === 'literal') return term.lang ? `“${term.value}” @${term.lang}` : `“${term.value}”`;
  return localName(term.value).replace(/([a-z])([A-Z0-9])/g, '$1 $2').replace(/([0-9])([A-Za-z])/g, '$1 $2');
}

/** "wasRecordedIn" → "was recorded in"; rdf:type → "is a". */
export function predicateLabel(term: Term): string {
  if (term.value === RDF_TYPE) return 'is a';
  return localName(term.value).replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
}

// ------------------------------------------------------------------ layout

export interface GraphNode { key: string; term: Term; label: string; x: number; y: number; width: number; mentions: number }
export interface GraphEdge { index: number; from: string; to: string; label: string }
export interface Layout { nodes: GraphNode[]; edges: GraphEdge[]; width: number; height: number }

const COLUMN = 190;
const ROW = 112;
const nodeKey = (term: Term, index: number) => term.kind === 'iri' ? term.value : `literal:${index}`;

/** One box per identifier (each literal gets its own box), placed in rows so arrows point downwards. */
export function layoutGraph(triples: ParsedTriple[]): Layout {
  const nodes = new Map<string, GraphNode>();
  const add = (term: Term, key: string) => {
    const node = nodes.get(key);
    if (node) { node.mentions++; return; }
    const label = nodeLabel(term);
    const shown = label.length > 26 ? `${label.slice(0, 25)}…` : label;
    nodes.set(key, { key, term, label: shown, x: 0, y: 0, width: Math.min(176, Math.max(70, shown.length * 7.2 + 26)), mentions: 1 });
  };
  const edges: GraphEdge[] = triples.map((triple, index) => {
    const from = nodeKey(triple.s, index), to = nodeKey(triple.o, index);
    add(triple.s, from);
    add(triple.o, to);
    return { index, from, to, label: predicateLabel(triple.p) };
  });
  // Longest-path layering, with a cap so a cycle cannot loop for ever.
  const level = new Map<string, number>([...nodes.keys()].map(key => [key, 0]));
  for (let round = 0; round < nodes.size; round++) {
    let changed = false;
    for (const edge of edges) {
      if (edge.from === edge.to) continue;
      const next = Math.min(nodes.size, level.get(edge.from)! + 1);
      if (next > level.get(edge.to)!) { level.set(edge.to, next); changed = true; }
    }
    if (!changed) break;
  }
  const rows: string[][] = [];
  for (const key of nodes.keys()) (rows[level.get(key)!] ??= []).push(key);
  const placed = rows.filter(Boolean);
  // Order each row by where its parents sit, which keeps most arrows from crossing.
  const position = new Map<string, number>();
  placed.forEach(row => {
    row.sort((a, b) => {
      const parents = (key: string) => edges.filter(edge => edge.to === key && position.has(edge.from)).map(edge => position.get(edge.from)!);
      const average = (list: number[]) => list.length ? list.reduce((sum, value) => sum + value, 0) / list.length : Infinity;
      return average(parents(a)) - average(parents(b));
    });
    row.forEach((key, i) => position.set(key, i - (row.length - 1) / 2));
  });
  const widest = Math.max(1, ...placed.map(row => row.length));
  const width = Math.max(560, widest * COLUMN + 40);
  placed.forEach((row, r) => row.forEach((key, i) => {
    const node = nodes.get(key)!;
    node.x = width / 2 + (i - (row.length - 1) / 2) * COLUMN;
    node.y = 44 + r * ROW;
  }));
  return { nodes: [...nodes.values()], edges, width, height: 44 + (placed.length - 1) * ROW + 44 };
}

/** The statement lines in a new order, @prefix lines first: the graph does not change. */
export function shuffleStatements(source: string, random: () => number = Math.random): string {
  const lines = source.split('\n');
  const head = lines.filter(line => /^\s*(@prefix|PREFIX)\b/i.test(line) || /^\s*#/.test(line) || !line.trim());
  const body = lines.filter(line => !head.includes(line));
  for (let i = body.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [body[i], body[j]] = [body[j], body[i]];
  }
  return [...head.filter(line => line.trim()), ...body].join('\n');
}
