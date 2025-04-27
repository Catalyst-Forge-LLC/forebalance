import { settingsStore, rawEntriesStore } from '../scripts/stores';

import { defaultEntries } from '../scripts/defaultEntries';
import { defaultSettings } from '../scripts/defaultSettings';

export const initializeData = () => {
    const lsRawEntries = localStorage.getItem('rawEntries');
    if (lsRawEntries) {
        rawEntriesStore.set(lsRawEntries);
    } else {
        rawEntriesStore.set(defaultEntries);
    }

    const lsSettings = localStorage.getItem('settings');
    if (lsSettings) {
        settingsStore.set(JSON.parse(lsSettings));
    } else {
        settingsStore.set({...defaultSettings});
    }
}
