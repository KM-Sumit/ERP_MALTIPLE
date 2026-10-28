import { describe, expect, it } from 'vitest';
import { simplePdf } from './pdf';
import { componentTotal, examSlotIssues, summarizeMarks, timetableIssues } from './rules';

const hours = { workingDays: [1, 2, 3, 4, 5], dayStart: '08:00:00', dayEnd: '15:00:00' };

describe('academic rules', () => {
	it('flags a teacher, a room, and a period outside school hours', () => {
		const issues = timetableIssues(
			[
				{
					weekday: 1,
					start: '09:00:00',
					end: '10:00:00',
					teacherId: 't1',
					classroomId: 'r1',
					sectionId: 'a',
					kind: 'teaching'
				},
				{
					weekday: 1,
					start: '09:30:00',
					end: '10:30:00',
					teacherId: 't1',
					classroomId: 'r1',
					sectionId: 'b',
					kind: 'teaching'
				},
				{
					weekday: 1,
					start: '07:00:00',
					end: '08:00:00',
					teacherId: 't2',
					classroomId: null,
					sectionId: 'a',
					kind: 'teaching'
				},
				{
					weekday: 6,
					start: '09:00:00',
					end: '10:00:00',
					teacherId: 't2',
					classroomId: null,
					sectionId: 'c',
					kind: 'break'
				}
			],
			hours
		);
		expect(issues).toContain('A teacher is assigned to two classes at the same time.');
		expect(issues).toContain('A classroom is assigned to overlapping periods.');
		expect(issues).toContain('A period falls outside school working hours.');
		expect(issues).toContain('Weekday 6 is not a working day.');
		expect(issues).toContain('A break cannot be assigned as a class period.');
	});

	it('keeps an absent student out of the percentage unless the school counts absence as zero', () => {
		const rows = [
			{ outcome: 'scored' as const, marksObtained: 40, maxMarks: 50 },
			{ outcome: 'absent' as const, marksObtained: null, maxMarks: 50 }
		];
		expect(summarizeMarks(rows, false, [{ min: 0, max: 100, grade: 'P' }])).toMatchObject({
			obtained: 40,
			max: 50,
			percentage: 80
		});
		expect(summarizeMarks(rows, true, [{ min: 0, max: 100, grade: 'P' }])).toMatchObject({
			obtained: 40,
			max: 100,
			percentage: 40
		});
		expect(
			summarizeMarks([{ outcome: 'exempt', marksObtained: null, maxMarks: 20 }], false, [])
		).toMatchObject({
			percentage: null,
			max: 0
		});
	});

	it('rejects a zero denominator and overlapping exams', () => {
		expect(() => componentTotal([{ obtained: 1, max: 0 }])).toThrow(/invalid denominator/);
		const day = Date.parse('2026-07-01T09:00:00Z');
		const issues = examSlotIssues(
			[
				{
					sectionId: 'a',
					subjectId: 'math',
					start: day,
					end: day + 3_600_000,
					room: 'Hall',
					invigilatorId: 't1'
				},
				{
					sectionId: 'a',
					subjectId: 'science',
					start: day + 1_800_000,
					end: day + 5_400_000,
					room: 'Hall',
					invigilatorId: 't1'
				}
			],
			{ start: Date.parse('2026-04-01T00:00:00Z'), end: Date.parse('2027-03-31T00:00:00Z') }
		);
		expect(issues).toContain('Exams overlap for the same section.');
		expect(issues).toContain('An exam room is double-booked.');
		expect(issues).toContain('An invigilator is assigned to overlapping exams.');
	});

	it('builds a printable report document', () => {
		expect(simplePdf(['River School', 'Meera Joshi'])).toContain('%PDF-1.4');
	});
});
