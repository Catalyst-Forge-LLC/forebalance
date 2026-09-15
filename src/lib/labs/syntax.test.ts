import { describe, expect, it } from 'vitest';
import { answerSyntaxQuestion } from './syntax';

describe('answerSyntaxQuestion', () => {
	it('treats 2RW as every two weeks', () => {
		const answer = answerSyntaxQuestion('What does 2RW mean?');
		expect(answer).toContain('every 2 weeks');
		expect(answer).toContain('R2W');
		expect(answer).not.toMatch(/grid|4x4|4×4/i);
	});

	it('explains RML and a disable prefix', () => {
		expect(answerSyntaxQuestion('What is RML?')).toContain('last calendar day');
		expect(answerSyntaxQuestion('What does ! do?')).toContain('skip a line');
	});

	it('explains an occurrence override', () => {
		expect(answerSyntaxQuestion('What does #5= mean?')).toContain('|#5=');
	});

	it('explains same-day lines already in the balance', () => {
		expect(answerSyntaxQuestion('What if rent is already in the balance?')).toContain(
			'end-of-day',
		);
	});

	it('leaves unknown asks for the model', () => {
		expect(answerSyntaxQuestion('Write me a haiku about rent')).toBeNull();
	});
});
