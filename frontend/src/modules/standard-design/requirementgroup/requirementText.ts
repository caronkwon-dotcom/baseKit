/** Display-only parsing of requirement text. The source text is never modified, stored or sent. */
export type DescriptionLine = { kind: 'bullet' | 'meta'; text: string } | { kind: 'gap' };

const sentenceBreak = /(?<=[.!?。])[ \t]+(?=\S)/;
const listNumber = /^\d+[.)]$/;

/** Keeps the original line breaks; splits sentences within a line; bracket lines stay whole as supporting text. */
export function parseDescription(text: string | null | undefined): DescriptionLine[] {
 const result: DescriptionLine[] = [];
 for (const raw of (text ?? '').split(/\r?\n/)) {
  const line = raw.trim();
  if (!line) { if (result.length && result[result.length - 1].kind !== 'gap') result.push({ kind: 'gap' }); continue; }
  if (line.startsWith('[')) { result.push({ kind: 'meta', text: line }); continue; }
  const parts: string[] = [];
  for (const piece of line.split(sentenceBreak)) {
   const last = parts.length - 1;
   // A leading list number such as "1." belongs to the sentence that follows it.
   if (last >= 0 && listNumber.test(parts[last])) parts[last] = `${parts[last]} ${piece}`;
   else parts.push(piece);
  }
  for (const part of parts) result.push({ kind: 'bullet', text: part });
 }
 while (result.length && result[result.length - 1].kind === 'gap') result.pop();
 return result;
}

export interface ProcessView {
 /** EMPTY: no value, TEXT: no separator found (show the original), CHIPS/LIST: separated steps. */
 mode: 'EMPTY' | 'TEXT' | 'CHIPS' | 'LIST';
 steps: string[];
 text: string;
}

export const MAX_CHIP_STEPS = 10;
export const MAX_CHIP_LENGTH = 40;

const marker = /^\s*(?:\d+[.)]|[①-⑳])\s*(.*)$/;

function numberedSteps(lines: string[]): string[] {
 const steps: string[] = [];
 let count = 0;
 for (const line of lines) {
  const match = marker.exec(line);
  if (match) { count++; steps.push(match[1].trim()); }
  else if (steps.length) steps[steps.length - 1] = `${steps[steps.length - 1]} ${line.trim()}`.trim();
  else steps.push(line.trim());
 }
 return count >= 2 ? steps : [];
}

/** Separators: 1) "→" or "->", 2) numbered lines. Without any separator the original paragraph is kept. */
export function parseProcess(text: string | null | undefined): ProcessView {
 const original = text ?? '';
 if (!original.trim()) return { mode: 'EMPTY', steps: [], text: '' };
 let steps = original.split(/→|->/).map(step => step.trim()).filter(Boolean);
 if (steps.length < 2) steps = numberedSteps(original.split(/\r?\n/).filter(line => line.trim()));
 steps = steps.filter(Boolean);
 if (steps.length < 2) return { mode: 'TEXT', steps: [], text: original };
 const long = steps.length > MAX_CHIP_STEPS || steps.some(step => step.length > MAX_CHIP_LENGTH);
 return { mode: long ? 'LIST' : 'CHIPS', steps, text: original };
}
