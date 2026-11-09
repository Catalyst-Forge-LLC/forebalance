import { storage, canUseBrowserStorage } from '#lib/persistence/storage.ts';
import { get, writable } from 'svelte/store';
import { entrySetsStore, persistEntrySets } from '#lib/data/entrySets.ts';
import { formatLineExtras, parseLineExtras } from '#lib/parser/lineExtras.ts';
import { splitLineFields, writeLine } from '#lib/parser/occurrenceEdit.ts';
import { rawEntriesStore } from '#lib/stores/settings.ts';
import { setRawEntries } from '#lib/data/entriesPersistence.ts';

const LEGACY_CATEGORIES_KEY = 'forebalance.categories.v1';
const V2_KEY = 'forebalance.categories.v2';
export const CATEGORIES_KEY = 'forebalance.categories.v3';
const CREDIT_CARDS = { id: 'credit-cards', name: 'Credit cards' };
export const UNFILED_ID = 'unfiled';

export interface Category {
  id: string;
  name: string;
  color?: string;
  order: number;
}

export const CATEGORY_COLORS = ['#0d5c14', '#1d6f8a', '#6b5420', '#8a3d3d', '#3d4a8a', '#5c4d7a', '#3f6b4a', '#6a5a3a'] as const;

const NEW_DEFAULTS = [
  { id: 'entertainment', name: 'Entertainment' },
  { id: 'health-medical', name: 'Health & medical' },
  { id: 'insurance', name: 'Insurance' },
];

const DEFAULTS: Omit<Category, 'order'>[] = [
  { id: UNFILED_ID, name: 'Unfiled' },
  { id: 'utilities', name: 'Utilities' },
  { id: 'housing', name: 'Housing' },
  { id: 'transportation', name: 'Transportation' },
  { id: 'food', name: 'Food' },
  ...NEW_DEFAULTS,
  { id: 'subscriptions', name: 'Subscriptions' },
  { id: 'income', name: 'Income' },
  { id: 'debt', name: 'Debt payments' },
  CREDIT_CARDS,
  { id: 'other', name: 'Other' },
];

export function defaultCategories(): Category[] {
  return DEFAULTS.map((category, order) => ({ ...category, order }));
}

export const categoriesStore = writable<Category[]>(defaultCategories());

function canStore(): boolean {
  return canUseBrowserStorage();
}

export function slugifyCategoryName(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'category';
}

export function uniqueCategoryId(name: string, categories: Category[]): string {
  const base = slugifyCategoryName(name);
  if (base !== UNFILED_ID && !categories.some((category) => category.id === base)) return base;
  let n = 2;
  while (categories.some((category) => category.id === `${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export function loadCategories(): Category[] {
  if (!canStore()) return defaultCategories();
  const current = storage.getItem(CATEGORIES_KEY);
  try {
    if (current !== null) {
      const next = normalizeCategories(JSON.parse(current));
      categoriesStore.set(next);
      return next;
    }
    const v2 = storage.getItem(V2_KEY);
    if (v2 !== null) {
      const next = withCreditCards(JSON.parse(v2));
      persistCategories(next);
      return next;
    }
    const previous = storage.getItem(LEGACY_CATEGORIES_KEY);
    const next = previous === null ? defaultCategories() : migrateCategories(JSON.parse(previous));
    persistCategories(next);
    return next;
  } catch {
    const next = defaultCategories();
    categoriesStore.set(next);
    return next;
  }
}

export function migrateCategories(previous: Category[]): Category[] {
  const list = normalizeCategories(previous);
  const debt = list.find((c) => c.id === 'debt');
  if (debt?.name === 'Debt' && !list.some((c) => c.name.trim().toLowerCase() === 'debt payments')) debt.name = 'Debt payments';
  for (const item of NEW_DEFAULTS) {
    if (!list.some((c) => c.id === item.id || c.name.trim().toLowerCase() === item.name.toLowerCase())) list.push({ ...item, order: list.length });
  }
  return withCreditCards(list);
}

// A renamed default or an existing custom category keeps its ID (and all entry assignments).
export function withCreditCards(previous: Category[]): Category[] {
  const list = normalizeCategories(previous);
  if (list.some((c) => c.id === CREDIT_CARDS.id || c.name.trim().toLowerCase() === 'credit cards')) return list;
  const debt = list.findIndex((c) => c.id === 'debt');
  list.splice(debt < 0 ? list.length : debt + 1, 0, { ...CREDIT_CARDS, order: 0 });
  return normalizeCategories(list);
}

export function normalizeCategories(input: Category[] | undefined): Category[] {
  const unfiled = { id: UNFILED_ID, name: 'Unfiled', order: 0 };
  const rest = (input ?? [])
    .filter((category) => category && category.id && category.id !== UNFILED_ID && category.name)
    .map((category, index) => ({
      id: category.id,
      name: category.name,
      color: category.color,
      order: index + 1,
    }));
  return [unfiled, ...rest];
}

export function persistCategories(categories: Category[]): void {
  const next = normalizeCategories(categories);
  categoriesStore.set(next);
  if (canStore()) storage.setItem(CATEGORIES_KEY, JSON.stringify(next));
}

export function categoryName(id: string | undefined, categories: Category[]): string {
  if (!id) return 'Unfiled';
  return categories.find((category) => category.id === id)?.name ?? id;
}

export function reassignCategoryInRaw(raw: string, fromId: string, toId: string): string {
  if (!fromId || fromId === toId) return raw;
  return raw
    .split('\n')
    .map((line) => rewriteLineCategory(line, fromId, toId))
    .join('\n');
}

function rewriteLineCategory(line: string, fromId: string, toId: string): string {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('---')) return line;
  const disabled = trimmed.startsWith('!') || trimmed.startsWith('#');
  const body = disabled ? trimmed.slice(1) : trimmed;
  const { parts, extras, overrides } = splitLineFields(body);
  if (parts.length < 4) return line;
  const parsed = parseLineExtras(extras);
  if (parsed.categoryId !== fromId) return line;
  parsed.categoryId = toId === UNFILED_ID ? undefined : toId;
  const next = writeLine(parts, formatLineExtras(parsed), overrides);
  return disabled ? `!${next}` : next;
}

export function countCategoryUse(fromId: string, raws: string[]): number {
  return raws.reduce((sum, raw) => {
    return (
      sum +
      raw.split('\n').filter((line) => {
        const trimmed = line.trim().replace(/^[!#]/, '');
        if (!trimmed || trimmed.startsWith('---')) return false;
        const { extras } = splitLineFields(trimmed);
        return parseLineExtras(extras).categoryId === fromId;
      }).length
    );
  }, 0);
}

export function deleteCategory(id: string, moveTo = UNFILED_ID): void {
  if (id === UNFILED_ID) return;
  const categories = get(categoriesStore).filter((category) => category.id !== id);
  persistCategories(categories);
  const state = get(entrySetsStore);
  const sets = state.sets.map((set) => ({
    ...set,
    raw: reassignCategoryInRaw(set.raw, id, moveTo),
  }));
  const next = { ...state, sets };
  entrySetsStore.set(next);
  persistEntrySets(next);
  const active = sets.find((set) => set.id === state.activeId);
  if (active && active.raw !== get(rawEntriesStore)) setRawEntries(active.raw);
}
