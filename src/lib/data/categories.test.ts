import { describe, expect, it } from 'vitest';
import {
  defaultCategories,
  withCreditCards,
  normalizeCategories,
  reassignCategoryInRaw,
  slugifyCategoryName,
  uniqueCategoryId,
  UNFILED_ID,
} from './categories';

describe('categories', () => {
  it('keeps Unfiled first and undeletable in the normalized list', () => {
    const next = normalizeCategories([
      { id: 'food', name: 'Food', order: 4 },
      { id: UNFILED_ID, name: 'Nope', order: 9 },
    ]);
    expect(next[0]).toEqual({ id: 'unfiled', name: 'Unfiled', order: 0 });
    expect(next.map((category) => category.id)).toEqual(['unfiled', 'food']);
  });

  it('slugs a new name and avoids collisions', () => {
    expect(slugifyCategoryName('Pet Care')).toBe('pet-care');
    expect(
      uniqueCategoryId('Food', [
        { id: 'unfiled', name: 'Unfiled', order: 0 },
        { id: 'food', name: 'Food', order: 1 },
      ]),
    ).toBe('food-2');
  });

  it('moves entries to Unfiled without deleting the line', () => {
    const raw = 'D|2026-04-01,R|40|Groceries||||fixed|||food|weekly shop';
    const next = reassignCategoryInRaw(raw, 'food', 'unfiled');
    expect(next).not.toContain('food');
    expect(next).toContain('Groceries');
    expect(reassignCategoryInRaw(next, 'food', 'unfiled')).toBe(next);
  });
});

it('includes Credit cards by default and upgrades existing profiles without duplicating or renaming their categories', () => {
  const debt = { id: 'debt', name: 'Loans', order: 1 };
  expect(defaultCategories().filter((c) => c.id === 'credit-cards')).toHaveLength(1);
  expect(withCreditCards([debt]).map((c) => c.name)).toEqual(['Unfiled', 'Loans', 'Credit cards']);
  for (const category of [
    { id: 'my-cards', name: 'Credit Cards', order: 2 },
    { id: 'credit-cards', name: 'My cards', order: 2 },
  ]) {
    expect(withCreditCards([debt, category])).toEqual(normalizeCategories([debt, category]));
  }
});
