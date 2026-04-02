#!/usr/bin/env node
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env manually
const envPath = resolve(process.cwd(), '.env');
const envVars = {};
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
	const match = line.match(/^([^#=]+)=(.*)$/);
	if (match) envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
}

const db = postgres(envVars.DATABASE_URL);
const email = process.argv[2];

if (!email) {
	console.error('Usage: node scripts/promote-user.mjs <email>');
	process.exit(1);
}

const result = await db`
	UPDATE "user"
	SET email_verified = true, role = 'admin'
	WHERE email = ${email}
	RETURNING id, email, role, email_verified
`;

if (result.length === 0) {
	console.error('No user found with email:', email);
} else {
	console.log('Updated:', result[0]);
}

await db.end();
