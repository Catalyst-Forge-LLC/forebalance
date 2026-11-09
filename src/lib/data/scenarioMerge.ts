/** Changes are expressed in coordinates of the common ancestor, never by current row number. */
type Edit = { start: number; end: number; lines: string[] };
const linesOf = (text: string) => (text === '' ? [] : text.split(/\r?\n/));
const same = (a: string[], b: string[]) => a.length === b.length && a.every((line, i) => line === b[i]);

function edits(base: string[], next: string[]): Edit[] {
  let start = 0,
    end = base.length,
    stop = next.length;
  while (start < end && start < stop && base[start] === next[start]) start++;
  while (end > start && stop > start && base[end - 1] === next[stop - 1]) {
    end--;
    stop--;
  }
  const n = end - start,
    m = stop - start;
  if (!n && !m) return [];
  // Avoid quadratic allocation for large rewrites. Present the entire changed block for review.
  if (!n || !m || (n + 1) * (m + 1) > 2_000_000) return [{ start, end, lines: next.slice(start, stop) }];
  // A changed payment beside a newly added bill should remain two choices. Only use
  // a description/account pair as an anchor if it identifies one row on each side.
  function anchors(lines: string[]) {
    const keys = lines.map((line) => {
      const [kind, , , description] = line.replace(/^[!#]/, '').split('|');
      return /^[BCD](?:-|$)/.test(kind) && description ? JSON.stringify([kind, description]) : '';
    });
    const seen = new Set<string>(),
      repeated = new Set<string>();
    for (const key of keys) {
      if (seen.has(key)) repeated.add(key);
      seen.add(key);
    }
    return keys.map((key) => (repeated.has(key) ? '' : key));
  }
  const aKeys = anchors(base),
    bKeys = anchors(next);
  const matches = (i: number, j: number) => base[start + i] === next[start + j] || (!!aKeys[start + i] && aKeys[start + i] === bKeys[start + j]);
  const stride = m + 1,
    lcs = new Uint32Array((n + 1) * stride);
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) {
      const p = i * stride + j;
      lcs[p] = matches(i, j) ? 1 + lcs[p + stride + 1] : Math.max(lcs[p + stride], lcs[p + 1]);
    }
  const result: Edit[] = [];
  let i = 0,
    j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && matches(i, j)) {
      if (base[start + i] !== next[start + j]) result.push({ start: start + i, end: start + i + 1, lines: [next[start + j]] });
      i++;
      j++;
      continue;
    }
    const a = i,
      b = j;
    while ((i < n || j < m) && !(i < n && j < m && matches(i, j))) {
      if (j === m || (i < n && lcs[(i + 1) * stride + j] >= lcs[i * stride + j + 1])) i++;
      else j++;
    }
    if (i - a === j - b) {
      for (let k = 0; k < i - a; k++) result.push({ start: start + a + k, end: start + a + k + 1, lines: [next[start + b + k]] });
    } else result.push({ start: start + a, end: start + i, lines: next.slice(start + b, start + j) });
  }
  return result;
}

function render(base: string[], start: number, end: number, changes: Edit[]) {
  let out: string[] = [];
  let cursor = start;
  for (const e of changes) {
    out = out.concat(base.slice(cursor, e.start), e.lines);
    cursor = e.end;
  }
  return out.concat(base.slice(cursor, end));
}

export interface MergeChoice {
  start: number;
  end: number;
  original: string[];
  proposed: string[];
  conflict: boolean;
}
export function planMerge(ancestor: string | undefined, original: string, fork: string): MergeChoice[] {
  const base = linesOf(ancestor ?? original);
  const all = [
    ...edits(base, linesOf(original)).map((e) => ({ ...e, source: 'parent' })),
    ...edits(base, linesOf(fork)).map((e) => ({ ...e, source: 'fork' })),
  ].sort((a, b) => a.start - b.start || a.end - b.end);
  const choices: MergeChoice[] = [];
  let pos = 0,
    cursor = 0;
  for (let index = 0; index < all.length;) {
    const first = all[index++];
    let end = first.end;
    const group = [first];
    // Inserts at an edit boundary are independent; inserts into the same gap overlap.
    while (index < all.length && (all[index].start < end || (first.start === end && all[index].start === end && all[index].end === end))) {
      const e = all[index++];
      group.push(e);
      end = Math.max(end, e.end);
    }
    pos += first.start - cursor;
    const parent = group.filter((e) => e.source === 'parent'),
      child = group.filter((e) => e.source === 'fork');
    const before = render(base, first.start, end, parent),
      after = render(base, first.start, end, child);
    if (child.length && !same(before, after)) {
      const conflict = ancestor === undefined || parent.length > 0;
      if (!conflict && before.length === 0) for (const line of after) choices.push({ start: pos, end: pos, original: [], proposed: [line], conflict });
      else if (!conflict && after.length === 0)
        before.forEach((line, i) => choices.push({ start: pos + i, end: pos + i + 1, original: [line], proposed: [], conflict }));
      else choices.push({ start: pos, end: pos + before.length, original: before, proposed: after, conflict });
    }
    pos += before.length;
    cursor = end;
  }
  return choices;
}

export function applyMerge(original: string, choices: MergeChoice[], selected: readonly number[]): string {
  const chosen = new Set(selected);
  if (!chosen.size) return original;
  const rows = original === '' ? [] : original.split('\n');
  const cr = original.includes('\r\n') ? '\r' : '';
  const result: { text: string; end: string }[] = [];
  let cursor = 0;
  function keep(stop: number) {
    for (; cursor < stop; cursor++) {
      const row = rows[cursor],
        hasCR = row.endsWith('\r');
      result.push({ text: hasCR ? row.slice(0, -1) : row, end: cursor === rows.length - 1 ? cr : hasCR ? '\r' : '' });
    }
  }
  choices.forEach((c, i) => {
    if (!chosen.has(i)) return;
    keep(c.start);
    cursor = c.end;
    for (const text of c.proposed) result.push({ text, end: cr });
  });
  keep(rows.length);
  return result.map((r, i) => r.text + (i + 1 < result.length ? r.end + '\n' : '')).join('');
}
