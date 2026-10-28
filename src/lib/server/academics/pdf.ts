export function simplePdf(lines: string[]) {
	const commands = lines
		.map((line, index) => {
			const text = line.replace(/[()\\]/g, (character) => `\\${character}`);
			return `BT /F1 12 Tf 48 ${760 - index * 16} Td (${text}) Tj ET`;
		})
		.join('\n');
	const objects = [
		'1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
		'2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj',
		'3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
		`4 0 obj << /Length ${commands.length} >> stream\n${commands}\nendstream endobj`,
		'5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj'
	];
	let body = '%PDF-1.4\n';
	const offsets = [0];
	for (const object of objects) {
		offsets.push(body.length);
		body += `${object}\n`;
	}
	const xref = body.length;
	body += `xref\n0 ${objects.length + 1}\n`;
	body += '0000000000 65535 f \n';
	for (const offset of offsets.slice(1)) {
		body += `${String(offset).padStart(10, '0')} 00000 n \n`;
	}
	body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
	return body;
}
