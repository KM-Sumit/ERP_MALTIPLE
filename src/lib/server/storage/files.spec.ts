import { describe, expect, it } from 'vitest';
import { buildStorageKey, resolveStoragePath } from './files';
import { inspectUpload } from './upload';

describe('private file storage', () => {
	it('rejects path escape and a file whose bytes do not match an allowed type', () => {
		expect(() => resolveStoragePath('/var/uploads', 'schools/../secrets')).toThrow(
			/invalid file location/
		);
		expect(() => resolveStoragePath('/var/uploads', '/etc/passwd')).toThrow(
			/invalid file location/
		);
		expect(() => buildStorageKey('not-a-uuid', 'also-bad')).toThrow(/invalid file location/);
		expect(() => inspectUpload(Buffer.from('<svg></svg>'), 'image/svg+xml')).toThrow(/not allowed/);
		expect(
			inspectUpload(Buffer.from([0xff, 0xd8, 0xff, 0xd9]), 'application/octet-stream').mime
		).toBe('image/jpeg');
	});
});
