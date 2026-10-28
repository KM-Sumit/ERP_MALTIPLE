export type Clock = string;

export type TimetableSlot = {
	weekday: number;
	start: Clock;
	end: Clock;
	teacherId: string | null;
	classroomId: string | null;
	sectionId: string;
	kind: 'teaching' | 'break';
};

export type MarkOutcome = 'scored' | 'absent' | 'exempt' | 'not_assessed';

export type MarkRow = {
	outcome: MarkOutcome;
	marksObtained: number | null;
	maxMarks: number;
};

export type GradeBand = { min: number; max: number; grade: string };

export function clock(value: string) {
	const [hour = '0', minute = '00', second = '00'] = value.split(':');
	return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`;
}

export function timesOverlap(
	left: { start: Clock; end: Clock },
	right: { start: Clock; end: Clock }
) {
	return clock(left.start) < clock(right.end) && clock(right.start) < clock(left.end);
}

export function outsideWorkingHours(
	slot: { start: Clock; end: Clock },
	dayStart: Clock,
	dayEnd: Clock
) {
	return clock(slot.start) < clock(dayStart) || clock(slot.end) > clock(dayEnd);
}

export function timetableIssues(
	slots: TimetableSlot[],
	options: { workingDays: number[]; dayStart: Clock; dayEnd: Clock }
) {
	const issues: string[] = [];
	for (const slot of slots) {
		if (!options.workingDays.includes(slot.weekday)) {
			issues.push(`Weekday ${slot.weekday} is not a working day.`);
		}
		if (outsideWorkingHours(slot, options.dayStart, options.dayEnd)) {
			issues.push('A period falls outside school working hours.');
		}
		if (slot.kind === 'break') issues.push('A break cannot be assigned as a class period.');
	}
	for (let index = 0; index < slots.length; index += 1) {
		for (let other = index + 1; other < slots.length; other += 1) {
			const left = slots[index];
			const right = slots[other];
			if (left.weekday !== right.weekday || !timesOverlap(left, right)) continue;
			if (left.sectionId === right.sectionId) issues.push('Periods overlap for the same section.');
			if (left.teacherId && left.teacherId === right.teacherId) {
				issues.push('A teacher is assigned to two classes at the same time.');
			}
			if (left.classroomId && left.classroomId === right.classroomId) {
				issues.push('A classroom is assigned to overlapping periods.');
			}
		}
	}
	return [...new Set(issues)];
}

export function periodSlotIssues(periods: { start: Clock; end: Clock }[]) {
	const issues: string[] = [];
	for (let index = 0; index < periods.length; index += 1) {
		const period = periods[index];
		if (clock(period.start) >= clock(period.end)) issues.push('A period ends before it starts.');
		for (let other = index + 1; other < periods.length; other += 1) {
			if (timesOverlap(period, periods[other])) issues.push('Period slots overlap.');
		}
	}
	return [...new Set(issues)];
}

export function examSlotIssues(
	slots: {
		sectionId: string;
		subjectId: string;
		start: number;
		end: number;
		room: string | null;
		invigilatorId: string | null;
	}[],
	session: { start: number; end: number }
) {
	const issues: string[] = [];
	for (const slot of slots) {
		if (slot.end <= slot.start) issues.push('An exam duration is invalid.');
		if (slot.start < session.start || slot.end > session.end + 86_400_000) {
			issues.push('An exam date is outside the academic session.');
		}
	}
	for (let index = 0; index < slots.length; index += 1) {
		for (let other = index + 1; other < slots.length; other += 1) {
			const left = slots[index];
			const right = slots[other];
			const overlaps = left.start < right.end && right.start < left.end;
			if (left.sectionId === right.sectionId && left.subjectId === right.subjectId) {
				issues.push('The same subject is scheduled twice for one section.');
			}
			if (!overlaps) continue;
			if (left.sectionId === right.sectionId) {
				issues.push('Exams overlap for the same section.');
			}
			if (left.room && left.room === right.room) issues.push('An exam room is double-booked.');
			if (left.invigilatorId && left.invigilatorId === right.invigilatorId) {
				issues.push('An invigilator is assigned to overlapping exams.');
			}
		}
	}
	return [...new Set(issues)];
}

export function componentTotal(parts: { obtained: number; max: number }[]): {
	obtained: number;
	max: number;
} {
	if (parts.length === 0) throw new Error('invalid denominator');
	const max = parts.reduce((sum, part) => sum + part.max, 0);
	const obtained = parts.reduce((sum, part) => sum + part.obtained, 0);
	if (max <= 0 || obtained < 0 || obtained > max) throw new Error('invalid denominator');
	return { obtained, max };
}

export function summarizeMarks(rows: MarkRow[], absentCountsAsZero: boolean, bands: GradeBand[]) {
	let obtained = 0;
	let max = 0;
	for (const row of rows) {
		if (row.maxMarks <= 0) throw new Error('invalid denominator');
		if (row.outcome === 'scored') {
			if (row.marksObtained == null || row.marksObtained < 0 || row.marksObtained > row.maxMarks) {
				throw new Error('invalid denominator');
			}
			obtained += row.marksObtained;
			max += row.maxMarks;
			continue;
		}
		if (row.outcome === 'absent' && absentCountsAsZero) {
			max += row.maxMarks;
			continue;
		}
		if (row.outcome !== 'absent' && row.outcome !== 'exempt' && row.outcome !== 'not_assessed') {
			throw new Error('invalid denominator');
		}
	}
	if (max === 0) return { obtained: 0, max: 0, percentage: null, grade: null };
	const percentage = Math.round((obtained / max) * 10000) / 100;
	const grade =
		bands.find((band) => percentage >= band.min && percentage <= band.max)?.grade ?? null;
	return { obtained, max, percentage, grade };
}
