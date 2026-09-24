import { writable } from 'svelte/store';

/** Source line index to open in the entry dialog. Entries clears it once the dialog is up. */
export const cardEditRequest = writable<number | null>(null);
