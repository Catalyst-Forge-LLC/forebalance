import { get } from 'svelte/store';
import { beforeEach, describe, expect, it } from 'vitest';
import {
	addSetFromTemplate,
	cloneEntrySet,
	deleteEntrySet,
	entrySetsStore,
	migrateLegacyEntries,
	renameEntrySet,
	refreshKnownStarterSeeds,
	resetToStarterSets,
	resolveStarterClick,
	starterSets,
	switchEntrySet,
	uniqueSetName,
	updateActiveRaw,
} from './entrySets';

describe('uniqueSetName', () => {
	it('keeps the base name when free', () => {
		expect(uniqueSetName('Close month', [])).toBe('Close month');
	});

	it('appends a number when the name is taken', () => {
		expect(uniqueSetName('Close month', [{ id: 'a', name: 'Close month', raw: '' }])).toBe(
			'Close month 2',
		);
	});
});

describe('entry set CRUD', () => {
	beforeEach(() => {
		resetToStarterSets();
	});

	it('starts with the four starter profiles', () => {
		const starters = starterSets();
		expect(starters).toHaveLength(4);
		expect(starters.map((set) => set.name)).toEqual([
			'Close month',
			'Variable pay',
			'Two-paycheck household',
			'Debt focus',
		]);
		expect(starters[0].raw).toContain('B-CHCK1775-main');
		expect(starters[3].raw).toContain('Student loan');
	});

	it('updates the active set raw without touching others', () => {
		const state = get(entrySetsStore);
		const otherId = state.sets[1].id;
		const otherRaw = state.sets[1].raw;
		updateActiveRaw('B-CHCK-main|2026-09-01|100|Edited');
		const next = get(entrySetsStore);
		expect(next.sets.find((set) => set.id === next.activeId)?.raw).toContain('Edited');
		expect(next.sets.find((set) => set.id === otherId)?.raw).toBe(otherRaw);
	});

	it('clones the current set and switches to the copy', () => {
		const sourceId = get(entrySetsStore).activeId;
		const clone = cloneEntrySet(sourceId);
		const state = get(entrySetsStore);
		expect(state.sets.length).toBe(5);
		expect(clone.id).toBe(state.activeId);
		expect(clone.name).toMatch(/Close month/);
	});

	it('refuses to delete the last remaining set', () => {
		let state = get(entrySetsStore);
		for (const set of [...state.sets]) {
			state = deleteEntrySet(set.id);
		}
		expect(state.sets.length).toBe(1);
	});

	it('renames without colliding', () => {
		const state = get(entrySetsStore);
		const next = renameEntrySet(state.sets[0].id, state.sets[1].name);
		expect(next.sets[0].name).toBe(`${state.sets[1].name} 2`);
	});

	it('adds a set from a template', () => {
		const added = addSetFromTemplate('debt-focus');
		expect(added.raw).toContain('CareCredit');
		expect(get(entrySetsStore).sets.length).toBe(5);
	});

	it('switches after saving the current draft', () => {
		const state = get(entrySetsStore);
		const target = state.sets[2];
		const switched = switchEntrySet(target.id, 'B-CHCK-main|2026-09-01|1|Draft');
		expect(switched?.id).toBe(target.id);
		expect(get(entrySetsStore).sets[0].raw).toContain('Draft');
	});
});

describe('resolveStarterClick', () => {
	it('opens an unused starter and adds after a rename', () => {
		const starters = starterSets();
		expect(resolveStarterClick(starters, 'close-month')).toEqual({
			action: 'switch',
			id: starters[0].id,
		});
		const renamed = starters.map((set, index) =>
			index === 0 ? { ...set, name: 'April bills' } : set,
		);
		expect(resolveStarterClick(renamed, 'close-month')).toEqual({ action: 'add' });
	});
});

describe('migrateLegacyEntries', () => {
	it('wraps existing user text as My entries', () => {
		const migrated = migrateLegacyEntries('B-CHCK-main|2026-01-01|10|Old');
		expect(migrated.sets).toHaveLength(1);
		expect(migrated.sets[0].name).toBe('My entries');
		expect(migrated.sets[0].raw).toContain('Old');
	});

	it('falls back to starters when nothing is stored', () => {
		expect(migrateLegacyEntries(null).sets).toHaveLength(4);
	});
});

describe('refreshKnownStarterSeeds', () => {
	it('replaces the insolvent Variable pay seed and leaves other text alone', () => {
		const broken = `B-CHCK2201-main|2026-09-01|640|Balance Checking 2201
C|2026-09-03|410|Gig week
`;
		const custom = 'B-CHCK-main|2026-09-01|99|Mine';
		const next = refreshKnownStarterSeeds({
			activeId: 'a',
			sets: [
				{ id: 'a', name: 'Variable pay', raw: broken, templateId: 'variable-pay' },
				{ id: 'b', name: 'Mine', raw: custom },
			],
		});
		expect(next.sets[0].raw).toContain('|1720|Balance Checking 2201');
		expect(next.sets[0].raw).toContain(',R|520|Gig week');
		expect(next.sets[1].raw).toBe(custom);
	});
});
