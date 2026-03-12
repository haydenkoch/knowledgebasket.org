import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { readSubmissions, appendSubmission, generateSlug, getExistingIds } from '$lib/server/submissions';
import { kbData } from '$lib/data/kb';
import type { JobItem } from '$lib/data/kb';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const EXT_MAP: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const job_title = (formData.get('job_title') as string)?.trim();
		const employer = (formData.get('employer') as string)?.trim();
		const job_type = (formData.get('job_type') as string)?.trim();
		const location = (formData.get('location') as string)?.trim();
		const region = (formData.get('region') as string)?.trim();
		const sector = (formData.get('sector') as string)?.trim();
		const level = (formData.get('level') as string)?.trim();
		const work_arrangement = (formData.get('work_arrangement') as string)?.trim();
		const application_deadline = (formData.get('application_deadline') as string)?.trim();
		const apply_url = (formData.get('apply_url') as string)?.trim();
		const description = (formData.get('description') as string)?.trim();
		const compensation = (formData.get('compensation') as string)?.trim();
		const benefits = (formData.get('benefits') as string)?.trim();
		const indigenous_priority = formData.get('indigenous_priority') === 'yes';
		const contact_name = (formData.get('contact_name') as string)?.trim();
		const email = (formData.get('email') as string)?.trim();
		const contact_phone = (formData.get('contact_phone') as string)?.trim();
		const image = formData.get('image') as File | null;

		if (!job_title || !employer || !description || !apply_url || !contact_name || !email) {
			return fail(400, {
				error: 'Please fill in all required fields: Job title, Hiring organization, Position description, Apply URL, Your name, and Your email.',
				values: {
					job_title,
					employer,
					job_type,
					location,
					region,
					sector,
					level,
					work_arrangement,
					application_deadline,
					apply_url,
					description,
					compensation,
					benefits,
					contact_name,
					email,
					contact_phone
				}
			});
		}

		if (image && image.size > 0) {
			const values = {
				job_title,
				employer,
				job_type,
				location,
				region,
				sector,
				level,
				work_arrangement,
				application_deadline,
				apply_url,
				description,
				compensation,
				benefits,
				contact_name,
				email,
				contact_phone
			};
			if (image.size > MAX_IMAGE_SIZE) {
				return fail(400, { error: 'Image must be 5 MB or smaller.', values });
			}
			if (!ALLOWED_IMAGE_TYPES.includes(image.type)) {
				return fail(400, { error: 'Image must be JPG, PNG, or WebP.', values });
			}
		}

		const existing = [...kbData.jobs, ...(await readSubmissions('jobs'))];
		const id = generateSlug(job_title, getExistingIds(existing));

		let imageUrl: string | undefined;
		if (image && image.size > 0) {
			const ext = EXT_MAP[image.type] || 'jpg';
			const dir = join(process.cwd(), 'static', 'uploads', 'jobs');
			await mkdir(dir, { recursive: true });
			const path = join(dir, `${id}.${ext}`);
			const buf = Buffer.from(await image.arrayBuffer());
			await writeFile(path, buf);
			imageUrl = `/uploads/jobs/${id}.${ext}`;
		}

		const item: JobItem = {
			id,
			title: job_title,
			description: description || undefined,
			coil: 'jobs',
			employer: employer || undefined,
			location: location || undefined,
			type: job_type || undefined,
			sector: sector || undefined,
			region: region || undefined,
			level: level || undefined,
			workArrangement: work_arrangement || undefined,
			compensation: compensation || undefined,
			benefits: benefits || undefined,
			applyUrl: apply_url || undefined,
			applicationDeadline: application_deadline || undefined,
			indigenousPriority: indigenous_priority,
			imageUrl
		};

		await appendSubmission('jobs', item);

		return {
			success: true,
			message:
				'Thank you! Your job listing has been submitted and is now live. IFS staff may follow up within 3–5 business days.'
		};
	}
};
