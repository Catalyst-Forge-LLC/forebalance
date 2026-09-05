import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { linter, type Diagnostic } from '@codemirror/lint';
import { tags as t } from '@lezer/highlight';
import { EditorView, Decoration, ViewPlugin, type DecorationSet } from '@codemirror/view';
import { validateRawEntries } from '$lib/parser/validateEntries';

const psvHighlightStyle = HighlightStyle.define([
	{ tag: t.comment, color: '#888', fontStyle: 'italic' },
	{ tag: t.keyword, color: '#006600', fontWeight: 'bold' },
	{ tag: t.string, color: '#004488' },
	{ tag: t.number, color: '#884400' },
	{ tag: t.invalid, color: '#aa0000', textDecoration: 'underline wavy' },
]);

const lineHighlight = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = this.build(view);
		}

		update(update: { docChanged: boolean; viewportChanged: boolean; view: EditorView }) {
			if (update.docChanged || update.viewportChanged) {
				this.decorations = this.build(update.view);
			}
		}

		build(view: EditorView): DecorationSet {
			const marks: ReturnType<typeof Decoration.mark>[] = [];
			const disabledLine = Decoration.line({ class: 'cm-disabled-line' });

			for (const { from, to } of view.visibleRanges) {
				let pos = from;
				while (pos <= to) {
					const line = view.state.doc.lineAt(pos);
					const text = line.text;

					if (text.startsWith('---') || text.startsWith('!') || text.startsWith('#')) {
						marks.push(disabledLine.range(line.from));
					} else if (text.includes('|')) {
						const parts = text.split('|');
						let col = 0;
						parts.forEach((part, i) => {
							const start = line.from + col;
							const end = start + part.length;
							let cls = '';
							if (i === 0) cls = 'cm-psv-type';
							else if (i === 1) cls = 'cm-psv-when';
							else if (i === 2) cls = 'cm-psv-amount';
							else if (i === 3) cls = 'cm-psv-desc';
							if (cls) {
								marks.push(Decoration.mark({ class: cls }).range(start, end));
							}
							col += part.length + 1;
						});
					}

					pos = line.to + 1;
				}
			}
			return Decoration.set(marks, true);
		}
	},
	{ decorations: (v) => v.decorations },
);

export function psvTheme(): import('@codemirror/state').Extension {
	return [
		lineHighlight,
		syntaxHighlighting(psvHighlightStyle),
		EditorView.theme({
			'&': {
				fontSize: '1rem',
				border: '1px solid #ccc',
				borderRadius: '0.5rem',
			},
			'.cm-content': {
				fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
				minHeight: '20em',
			},
			'.cm-disabled-line': {
				opacity: '0.55',
			},
			'.cm-psv-type': { color: '#006600', fontWeight: 'bold' },
			'.cm-psv-when': { color: '#004488' },
			'.cm-psv-amount': { color: '#884400' },
			'.cm-psv-desc': { color: '#333' },
			'&.cm-focused': { outline: '2px solid #009900' },
		}),
	];
}

export function psvLinter() {
	return linter((view): Diagnostic[] => {
		const text = view.state.doc.toString();
		if (!text.trim()) return [];
		return validateRawEntries(text).map((warning) => {
			const line = view.state.doc.line(warning.line);
			return {
				from: line.from,
				to: line.to,
				severity: 'warning',
				message: warning.message,
			};
		});
	});
}
