import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core';
import { createdAt, deletedAt, primaryId } from './columns';
import { schoolId, users } from './platform';

export const storedFiles = pgTable(
	'stored_files',
	{
		id: primaryId(),
		schoolId: schoolId(),
		storageKey: text('storage_key').notNull(),
		mimeType: text('mime_type').notNull(),
		byteSize: integer('byte_size').notNull(),
		purpose: text('purpose').notNull(),
		uploadedBy: uuid('uploaded_by')
			.notNull()
			.references(() => users.id, { onDelete: 'restrict' }),
		createdAt: createdAt(),
		deletedAt: deletedAt()
	},
	(t) => [
		unique('stored_files_id_school_uidx').on(t.id, t.schoolId),
		unique('stored_files_key_uidx').on(t.storageKey),
		index('stored_files_school_idx').on(t.schoolId, t.purpose),
		check('stored_files_size_chk', sql`${t.byteSize} >= 0`),
		check(
			'stored_files_purpose_chk',
			sql`${t.purpose} in ('complaint_voice', 'complaint_photo', 'note', 'assignment', 'document', 'certificate', 'other')`
		)
	]
);
