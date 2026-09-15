export interface TocItem {
	id: string;
	text: string;
	level: number;
}

/** GitHub-style heading id so in-page Help links keep working. */
export function githubSlug(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, '')
		.replace(/\s+/g, '-');
}

export function tocFromMarkdown(md: string, minLevel = 1, maxLevel = 2): TocItem[] {
	const items: TocItem[] = [];
	for (const line of md.split('\n')) {
		const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
		if (!match) continue;
		const level = match[1].length;
		if (level < minLevel || level > maxLevel) continue;
		const text = match[2].trim();
		items.push({ id: githubSlug(text), text, level });
	}
	return items;
}
