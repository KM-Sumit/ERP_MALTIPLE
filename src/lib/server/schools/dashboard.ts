import { sql } from 'drizzle-orm';
import { rowsOf } from '../auth/session';
import { withSchoolUser, type AppDb } from '../db/tenant';

function num(value: unknown) {
	const parsed = Number(value ?? 0);
	return Number.isFinite(parsed) ? parsed : 0;
}

function monthBuckets() {
	const buckets: { key: string; label: string }[] = [];
	const ist = new Date(Date.now() + (5 * 60 + 30) * 60 * 1000);
	for (let offset = 5; offset >= 0; offset -= 1) {
		const date = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() - offset, 1));
		const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
		buckets.push({
			key,
			label: date.toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' })
		});
	}
	return buckets;
}

export async function schoolDashboard(
	db: AppDb,
	userId: string,
	schoolId: string,
	sessionId: string | null
) {
	return withSchoolUser(db, userId, schoolId, async (tx) => {
		const sessions = rowsOf(
			await tx.execute(sql`
				select id, name from academic_sessions
				where school_id = ${schoolId}::uuid
				order by created_at desc
			`)
		);
		const chosen = sessions.find((row) => String(row.id) === sessionId) ?? sessions[0] ?? null;
		const activeSession = chosen ? String(chosen.id) : null;
		const counts = rowsOf(
			await tx.execute(sql`
				select
					(select count(*) from students where school_id = ${schoolId}::uuid and deleted_at is null and status = 'active') as students,
					(select count(*) from students where school_id = ${schoolId}::uuid and deleted_at is null and status = 'active'
						and created_at >= date_trunc('month', now())) as students_new,
					(select count(*) from school_memberships m join roles r on r.id = m.role_id
						where m.school_id = ${schoolId}::uuid and r.key = 'teacher' and m.status = 'active' and m.deleted_at is null) as teachers,
					(select count(*) from school_memberships m join roles r on r.id = m.role_id
						where m.school_id = ${schoolId}::uuid and r.key = 'teacher' and m.status = 'active' and m.deleted_at is null
						and m.created_at >= date_trunc('month', now())) as teachers_new,
					(select count(*) from classes where school_id = ${schoolId}::uuid
						and (${activeSession}::uuid is null or session_id = ${activeSession}::uuid)) as classes,
					(select count(*) from classes where school_id = ${schoolId}::uuid
						and (${activeSession}::uuid is null or session_id = ${activeSession}::uuid)
						and created_at >= date_trunc('month', now())) as classes_new
			`)
		)[0];
		const attendance = rowsOf(
			await tx.execute(sql`
				select status, count(*)::int as total
				from attendance_records
				where school_id = ${schoolId}::uuid
					and attendance_date = (now() at time zone 'Asia/Kolkata')::date
				group by status
			`)
		);
		const byStatus = Object.fromEntries(attendance.map((row) => [String(row.status), num(row.total)]));
		const present = num(byStatus.present);
		const absent = num(byStatus.absent);
		const late = num(byStatus.late);
		const excused = num(byStatus.excused);
		const marked = present + absent + late + excused;
		const strength = rowsOf(
			await tx.execute(sql`
				select c.name, count(st.id)::int as students
				from classes c
				left join sections sec on sec.class_id = c.id and sec.school_id = c.school_id
				left join students st on st.current_section_id = sec.id and st.school_id = c.school_id and st.deleted_at is null
				where c.school_id = ${schoolId}::uuid
					and (${activeSession}::uuid is null or c.session_id = ${activeSession}::uuid)
				group by c.id, c.name
				order by c.name
			`)
		);
		const money = rowsOf(
			await tx.execute(sql`
				select
					coalesce((select sum(amount_paise) from payments where school_id = ${schoolId}::uuid and status = 'succeeded'), 0) as collected,
					coalesce((select sum(amount_paise) from invoices where school_id = ${schoolId}::uuid and status not in ('draft', 'void')), 0) as billed,
					coalesce((select sum(amount_paise) from payments where school_id = ${schoolId}::uuid and status = 'succeeded'
						and created_at >= date_trunc('month', now())), 0) as month_collected
			`)
		)[0];
		const pending = rowsOf(
			await tx.execute(sql`
				select
					(select count(*) from complaints where school_id = ${schoolId}::uuid and status in ('open', 'in_review', 'assigned')) as complaints,
					(select count(*) from document_requests where school_id = ${schoolId}::uuid and status = 'pending') as documents,
					(select count(*) from invoices where school_id = ${schoolId}::uuid and status in ('issued', 'partially_paid')) as invoices
			`)
		)[0];
		const activity = rowsOf(
			await tx.execute(sql`
				select action, entity_type, created_at
				from audit_events
				where school_id = ${schoolId}::uuid
				order by created_at desc
				limit 6
			`)
		);
		const events = rowsOf(
			await tx.execute(sql`
				select e.name as title, s.starts_at, coalesce(s.room, 'School') as place
				from exam_schedules s
				join exams e on e.id = s.exam_id and e.school_id = s.school_id
				where s.school_id = ${schoolId}::uuid and s.starts_at >= now()
				order by s.starts_at
				limit 4
			`)
		);
		const feeMonths = rowsOf(
			await tx.execute(sql`
				select to_char(created_at at time zone 'Asia/Kolkata', 'YYYY-MM') as key,
					coalesce(sum(amount_paise), 0) as total
				from payments
				where school_id = ${schoolId}::uuid and status = 'succeeded'
					and created_at >= now() - interval '6 months'
				group by 1
			`)
		);
		const attendanceMonths = rowsOf(
			await tx.execute(sql`
				select to_char(attendance_date, 'YYYY-MM') as key,
					count(*) filter (where status in ('present', 'late'))::float as attended,
					count(*)::float as marked
				from attendance_records
				where school_id = ${schoolId}::uuid
					and attendance_date >= (current_date - interval '6 months')
				group by 1
			`)
		);
		const examMonths = rowsOf(
			await tx.execute(sql`
				select to_char(published_at at time zone 'Asia/Kolkata', 'YYYY-MM') as key,
					avg(percentage)::float as average
				from report_cards
				where school_id = ${schoolId}::uuid and status = 'published' and published_at is not null
					and published_at >= now() - interval '6 months'
				group by 1
			`)
		);
		const buckets = monthBuckets();
		const feeByMonth = Object.fromEntries(feeMonths.map((row) => [String(row.key), num(row.total)]));
		const attendByMonth = Object.fromEntries(
			attendanceMonths.map((row) => [
				String(row.key),
				num(row.marked) === 0 ? 0 : Math.round((num(row.attended) / num(row.marked)) * 100)
			])
		);
		const examByMonth = Object.fromEntries(examMonths.map((row) => [String(row.key), Math.round(num(row.average))]));
		const collected = num(money?.collected);
		const billed = num(money?.billed);
		return {
			sessions: sessions.map((row) => ({ id: String(row.id), name: String(row.name) })),
			sessionId: activeSession,
			sessionName: chosen ? String(chosen.name) : 'Session',
			students: num(counts?.students),
			teachers: num(counts?.teachers),
			classes: num(counts?.classes),
			studentDelta: num(counts?.students_new),
			teacherDelta: num(counts?.teachers_new),
			classDelta: num(counts?.classes_new),
			attendanceRate: marked === 0 ? 0 : Math.round(((present + late) / marked) * 100),
			today: { present: present + late, absent, leave: excused, marked },
			collectedRupees: Math.round(collected / 100),
			monthCollectedRupees: Math.round(num(money?.month_collected) / 100),
			billedRupees: Math.round(billed / 100),
			strength: strength.map((row) => ({ name: String(row.name), students: num(row.students) })),
			activity: activity.map((row) => ({
				action: String(row.action),
				entity: String(row.entity_type),
				at: String(row.created_at)
			})),
			events: events.map((row) => ({
				title: String(row.title),
				at: String(row.starts_at),
				place: String(row.place)
			})),
			pending: {
				complaints: num(pending?.complaints),
				documents: num(pending?.documents),
				invoices: num(pending?.invoices)
			},
			trend: buckets.map((bucket) => ({
				label: bucket.label,
				attendance: attendByMonth[bucket.key] ?? 0,
				exam: examByMonth[bucket.key] ?? 0,
				feesLakhs: Math.round(((feeByMonth[bucket.key] ?? 0) / 100 / 100000) * 10) / 10
			}))
		};
	});
}
