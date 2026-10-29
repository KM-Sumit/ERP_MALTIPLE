import { sql } from 'drizzle-orm';
import { rowsOf } from '../auth/session';
import { withSchoolUser, type AppDb } from '../db/tenant';

function num(value: unknown) {
	const parsed = Number(value ?? 0);
	return Number.isFinite(parsed) ? parsed : 0;
}

export async function studentRoster(db: AppDb, userId: string, schoolId: string) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		const rows = rowsOf(
			await tx.execute(sql`
				select s.id, s.admission_no, s.first_name, s.last_name, s.status,
					s.date_of_birth::text as date_of_birth, s.created_at,
					c.name as class_name, sec.name as section_name, en.roll_number,
					self_user.email as email,
					parent.full_name as guardian_name, parent.email as guardian_email
				from students s
				left join sections sec on sec.id = s.current_section_id and sec.school_id = s.school_id
				left join classes c on c.id = sec.class_id and c.school_id = s.school_id
				left join student_enrollments en on en.student_id = s.id and en.section_id = sec.id and en.status = 'active'
				left join lateral (
					select u.email from guardian_students gs
					join users u on u.id = gs.guardian_user_id
					where gs.student_id = s.id and gs.school_id = s.school_id and gs.relationship = 'self'
					limit 1
				) self_user on true
				left join lateral (
					select u.full_name, u.email from guardian_students gs
					join users u on u.id = gs.guardian_user_id
					where gs.student_id = s.id and gs.school_id = s.school_id and gs.relationship <> 'self'
					limit 1
				) parent on true
				where s.school_id = ${schoolId}::uuid and s.deleted_at is null
				order by s.first_name, s.last_name
			`)
		);
		return rows.map((row) => ({
			id: String(row.id),
			admissionNo: String(row.admission_no),
			firstName: String(row.first_name),
			lastName: String(row.last_name),
			status: String(row.status),
			dateOfBirth: row.date_of_birth ? String(row.date_of_birth) : '',
			createdAt: String(row.created_at),
			className: row.class_name ? String(row.class_name) : '',
			sectionName: row.section_name ? String(row.section_name) : '',
			rollNumber: row.roll_number ? String(row.roll_number) : '',
			email: row.email ? String(row.email) : '',
			guardianName: row.guardian_name ? String(row.guardian_name) : '',
			guardianEmail: row.guardian_email ? String(row.guardian_email) : ''
		}));
	});
}

export async function teacherRoster(db: AppDb, userId: string, schoolId: string) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		const rows = rowsOf(
			await tx.execute(sql`
				select m.id, u.full_name, u.email, u.phone, m.status, m.created_at,
					coalesce(string_agg(distinct sub.name, ', '), '') as subjects,
					coalesce(string_agg(distinct c.name, ', '), '') as classes
				from school_memberships m
				join users u on u.id = m.user_id
				join roles r on r.id = m.role_id
				left join teacher_assignments ta on ta.teacher_user_id = u.id and ta.school_id = m.school_id
				left join subjects sub on sub.id = ta.subject_id and sub.school_id = m.school_id
				left join sections sec on sec.id = ta.section_id and sec.school_id = m.school_id
				left join classes c on c.id = sec.class_id and c.school_id = m.school_id
				where m.school_id = ${schoolId}::uuid and m.deleted_at is null and r.key = 'teacher'
				group by m.id, u.full_name, u.email, u.phone, m.status, m.created_at
				order by u.full_name
			`)
		);
		return rows.map((row) => ({
			id: String(row.id),
			name: String(row.full_name),
			email: row.email ? String(row.email) : '',
			phone: row.phone ? String(row.phone) : '',
			status: String(row.status),
			createdAt: String(row.created_at),
			subjects: String(row.subjects),
			classes: String(row.classes)
		}));
	});
}

export async function attendanceDesk(
	db: AppDb,
	userId: string,
	schoolId: string,
	sectionId: string | null,
	date: string
) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		const sections = rowsOf(
			await tx.execute(sql`
				select sec.id, sec.name as section_name, c.name as class_name
				from sections sec
				join classes c on c.id = sec.class_id and c.school_id = sec.school_id
				where sec.school_id = ${schoolId}::uuid
				order by c.name, sec.name
			`)
		).map((row) => ({
			id: String(row.id),
			name: String(row.section_name),
			className: String(row.class_name)
		}));
		const chosen = sections.find((row) => row.id === sectionId) ?? sections[0] ?? null;
		const students = chosen
			? rowsOf(
					await tx.execute(sql`
						select s.id, s.admission_no, s.first_name, s.last_name, en.roll_number, a.status
						from students s
						left join student_enrollments en on en.student_id = s.id and en.section_id = s.current_section_id and en.status = 'active'
						left join attendance_records a on a.student_id = s.id and a.attendance_date = ${date}::date
						where s.school_id = ${schoolId}::uuid and s.deleted_at is null
							and s.current_section_id = ${chosen.id}::uuid
						order by s.first_name, s.last_name
					`)
				).map((row) => ({
					id: String(row.id),
					admissionNo: String(row.admission_no),
					name: `${row.first_name} ${row.last_name}`.trim(),
					rollNumber: row.roll_number ? String(row.roll_number) : '',
					status: row.status ? String(row.status) : ''
				}))
			: [];
		const trend = rowsOf(
			await tx.execute(sql`
				select attendance_date::text as day,
					count(*) filter (where status in ('present', 'late'))::int as attended,
					count(*)::int as marked
				from attendance_records
				where school_id = ${schoolId}::uuid
					and attendance_date >= ${date}::date - 6
					and attendance_date <= ${date}::date
					and (${chosen?.id ?? null}::uuid is null or section_id = ${chosen?.id ?? null}::uuid)
				group by attendance_date
				order by attendance_date
			`)
		).map((row) => ({
			day: String(row.day).slice(8),
			rate: num(row.marked) === 0 ? 0 : Math.round((num(row.attended) / num(row.marked)) * 100)
		}));
		const present = students.filter((row) => row.status === 'present' || row.status === 'late').length;
		const absent = students.filter((row) => row.status === 'absent').length;
		const leave = students.filter((row) => row.status === 'excused').length;
		return { sections, sectionId: chosen?.id ?? '', date, students, present, absent, leave, trend };
	});
}
