# Academics, timetables, exams, and portals

Manager Admin can build class and examination timetables only when `timetables.manage` or `exams.manage` is granted. A manager role has no permissions of its own.

## Class timetable

Working days and the school day start and end live on the school, so a calendar is not fixed to Monday–Friday. Periods are teaching slots or breaks. A draft timetable belongs to one section and session. Saving an assignment checks the lock version, so a second editor must reload before publishing.

Publication rejects a teacher in two classes at once, a classroom double-booked, overlapping periods for one section, a break used as a class, a weekday outside the calendar, a period outside school hours, a teacher who is not assigned to that class and subject, and a teacher who is missing a subject qualification when any qualification exists for that subject. The published snapshot is stored as a revision. Revising returns the same timetable to draft and keeps that history.

Parents and assigned teachers see a timetable only after it is published. Export is available at `/school/timetable/export?id=`.

## Examinations and results

Exam types are unit, monthly, half-yearly, annual, practical, and custom. A draft collects subject, section, time, duration, room, seating note, and an optional invigilator. Publication moves the exam from draft to scheduled and notifies guardians and invigilators who have not turned exam notices off.

Marks may be scored, absent, exempt, or not assessed. Theory, practical, and internal components are added only when their maximum is set. An absent, exempt, or not-assessed row stores no obtained mark. It is left out of the percentage unless the school turns on “count absence as zero”. A maximum of zero is rejected. Teachers with `marks.submit` save drafts and submit them. They cannot approve or publish. `results.publish` approves submitted marks, builds report cards, and publishes them. Reopening a published card is audited and returns the marks to a reopened workflow.

Parents see report cards only when the card status is published and the child is linked. Changing the student id in the address does not reveal another child.

## Teacher and parent portals

Teachers see today’s published periods, assignments, exam duties, draft marks, notices, complaints for students they can read, and document requests. Attendance is one row per student per day. A submitted row cannot be edited by the teacher; a correction request is stored instead. Final edits by someone with `school.records.manage` are written to the attendance audit.

Parents use a single mobile-width home for the selected linked child: attendance, published timetables, homework, report cards, issued invoices, notices, document requests, complaints, and notification preferences.
