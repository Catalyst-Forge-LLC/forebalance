import { describe, expect, it } from 'vitest';
import { defaultSettings } from '$lib/data/defaultSettings';
import { readSourceLine } from '$lib/parser/sourceLines';
import { answerCardQuestion, cardLabsSystemPrompt, PAYOFF_CHIP } from './cardAsk';
import { evaluateMathJson } from './mathjson';

const settings = { ...defaultSettings, monthsToForecast: 12, useFederalHolidays: false };
const asOf = new Date(2026, 8, 1);

const raw = `B-CHCK-main|2026-09-01|5000|Checking
D-CO|2026-09-18,R|500|Capital One|CO|1000|0
D|2026-09-02,RW|92|Groceries`;

function line(index: number) {
	return readSourceLine(raw.split('\n')[index], index);
}

describe('answerCardQuestion', () => {
	it('answers payoff from the forecast without a model', () => {
		const answer = answerCardQuestion(raw, line(1), settings, PAYOFF_CHIP, asOf);
		expect(answer.source).toBe('forecast');
		expect(answer.unverified).toBe(false);
		expect(answer.unit).toBe('months');
		expect(answer.headline).toBe(1);
		expect(answer.headline).toBe(evaluateMathJson(['Round', 'payoffMonths'], { payoffMonths: 1 }));
	});

	it('rejects a model formula that calls eval', () => {
		const answer = answerCardQuestion(
			raw,
			line(1),
			settings,
			JSON.stringify({
				answer: 'no',
				formula: ['Call', 'eval', 'alert(1)'],
				variables: {},
				confidence: 'formula',
			}),
			asOf,
		);
		expect(answer.headline).toBeNull();
		expect(answer.unverified).toBe(true);
		expect(answer.prose).toMatch(/not allowed/);
	});

	it('evaluates a well-formed model formula', () => {
		const answer = answerCardQuestion(
			raw,
			line(1),
			settings,
			JSON.stringify({
				answer: 'one month of interest',
				formula: ['Multiply', 'balance', ['Divide', 'apr', 1200]],
				variables: { balance: 2800, apr: 19.99 },
				confidence: 'formula',
			}),
			asOf,
		);
		expect(answer.headline).toBeCloseTo(46.64333, 4);
		expect(answer.source).toBe('formula');
	});

	it('keeps the system prompt off eval', () => {
		const prompt = cardLabsSystemPrompt();
		expect(prompt).not.toMatch(/eval\(/);
		expect(prompt).toContain('Multiply');
	});
});
