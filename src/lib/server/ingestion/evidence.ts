import type {
	AiExtractedFacts,
	CandidateConfidence,
	EntityMatchSuggestion,
	FieldProvenanceEntry,
	FieldProvenanceMap,
	ImageCandidate,
	NormalizedRecord,
	QualityFlag,
	UrlEvidence,
	UrlRole,
	UrlRoleMap
} from './types';

export function addFieldProvenance(
	map: FieldProvenanceMap,
	field: string,
	entry: FieldProvenanceEntry
) {
	const existing = map[field] ?? [];
	if (
		existing.some(
			(item) =>
				item.source === entry.source && JSON.stringify(item.value) === JSON.stringify(entry.value)
		)
	) {
		return map;
	}
	return {
		...map,
		[field]: [...existing, entry]
	};
}

export function addUrlEvidence(map: UrlRoleMap, evidence: UrlEvidence): UrlRoleMap {
	const existing = map[evidence.role] ?? [];
	if (existing.some((item) => item.url === evidence.url)) return map;
	return {
		...map,
		[evidence.role]: [...existing, evidence]
	};
}

export function addImageCandidate(
	candidates: ImageCandidate[],
	candidate: ImageCandidate | null | undefined
) {
	if (!candidate?.url?.trim()) return candidates;
	if (candidates.some((item) => item.url === candidate.url)) return candidates;
	return [...candidates, candidate];
}

export function mergeUrlRoleMaps(...maps: UrlRoleMap[]) {
	return maps.reduce<UrlRoleMap>((acc, next) => {
		for (const [, entries] of Object.entries(next) as Array<[UrlRole, UrlEvidence[]]>) {
			for (const entry of entries) acc = addUrlEvidence(acc, entry);
		}
		return acc;
	}, {});
}

export function dedupeImageCandidates(candidates: ImageCandidate[]) {
	return candidates.reduce<ImageCandidate[]>(
		(acc, candidate) => addImageCandidate(acc, candidate),
		[]
	);
}

export function isGenericImageUrl(url: string | null | undefined) {
	if (!url) return true;
	const value = url.trim().toLowerCase();
	if (!value || value.startsWith('data:image/')) return true;
	return (
		value.includes('/logo') ||
		value.includes('nnc_logo') ||
		value.includes('news_from_native_california') ||
		value.includes('logo.') ||
		value.includes('placeholder') ||
		value.includes('default') ||
		value.includes('spinner') ||
		value.includes('loading.gif') ||
		value.includes('submit-an-event')
	);
}

export function rankImageCandidate(candidate: ImageCandidate) {
	let score = candidate.confidence ?? 0.6;
	if (candidate.isMeaningful === false) score -= 0.5;
	if (isGenericImageUrl(candidate.url)) score -= 0.45;
	if (candidate.role === 'attachment') score += 0.2;
	if (candidate.role === 'structured') score += 0.15;
	if (candidate.role === 'detail') score += 0.1;
	if (candidate.width && candidate.width >= 300) score += 0.05;
	if (candidate.height && candidate.height >= 300) score += 0.05;
	return score;
}

export function selectPrimaryImageCandidate(candidates: ImageCandidate[]) {
	const ranked = dedupeImageCandidates(candidates)
		.map((candidate) => ({
			candidate: {
				...candidate,
				isMeaningful:
					candidate.isMeaningful ??
					(!isGenericImageUrl(candidate.url) && !candidate.url.startsWith('data:'))
			},
			score: rankImageCandidate(candidate)
		}))
		.sort((left, right) => right.score - left.score);

	return ranked[0]?.candidate ?? null;
}

export function applyBestImage(record: NormalizedRecord, candidates: ImageCandidate[]) {
	const primary = selectPrimaryImageCandidate(candidates);
	if (!primary?.url) return record;
	if (record.image_url && !isGenericImageUrl(record.image_url)) return record;
	return { ...record, image_url: primary.url };
}

export function computeQualityFlags(
	record: NormalizedRecord,
	urlRoles: UrlRoleMap,
	imageCandidates: ImageCandidate[],
	diagnostics: Record<string, unknown>,
	confidence?: CandidateConfidence,
	extractedFacts?: AiExtractedFacts
): QualityFlag[] {
	const flags: QualityFlag[] = [];
	const primaryImage = selectPrimaryImageCandidate(imageCandidates);
	const hasMeaningfulImage =
		Boolean(record.image_url && !isGenericImageUrl(record.image_url)) ||
		Boolean(primaryImage?.url && !isGenericImageUrl(primaryImage.url));

	if (!hasMeaningfulImage) {
		flags.push({
			code: 'missing_image',
			severity: 'warning',
			message: 'No meaningful image was captured for this record.',
			field: 'image_url'
		});
	} else if (primaryImage?.url && isGenericImageUrl(primaryImage.url)) {
		flags.push({
			code: 'suspicious_generic_image',
			severity: 'warning',
			message: 'The best available image still looks generic or site-level.',
			field: 'image_url'
		});
	}

	if (record.coil === 'events') {
		if (!record.is_virtual && !record.location_name && !record.location_address) {
			flags.push({
				code: 'missing_location',
				severity: 'warning',
				message: 'The event is missing venue or location data.',
				field: 'location_name'
			});
		}
		if (!record.organization_name) {
			flags.push({
				code: 'missing_organization',
				severity: 'warning',
				message: 'The event is missing organizer information.',
				field: 'organization_name'
			});
		}
		if (!record.start_date) {
			flags.push({
				code: 'missing_date',
				severity: 'error',
				message: 'The event is missing a start date.',
				field: 'start_date'
			});
		}
		if ((urlRoles.registration?.length ?? 0) === 0 && (urlRoles.application?.length ?? 0) === 0) {
			flags.push({
				code: 'missing_registration_link',
				severity: 'info',
				message: 'No registration or application link was classified for this event.',
				field: 'registration_url'
			});
		}
	}

	if (record.coil === 'funding') {
		if (!record.funder_name && !record.organization_name) {
			flags.push({
				code: 'missing_funder',
				severity: 'warning',
				message: 'The funding record is missing funder information.',
				field: 'funder_name'
			});
		}
		if (!record.application_url) {
			flags.push({
				code: 'missing_application_link',
				severity: 'warning',
				message: 'The funding record is missing an application link.',
				field: 'application_url'
			});
		}
		if (!record.deadline && !record.is_rolling) {
			flags.push({
				code: 'missing_deadline',
				severity: 'warning',
				message: 'The funding record is missing a deadline.',
				field: 'deadline'
			});
		}
	}

	if (record.coil === 'jobs') {
		if (!record.organization_name) {
			flags.push({
				code: 'missing_employer',
				severity: 'warning',
				message: 'The job record is missing employer information.',
				field: 'organization_name'
			});
		}
		if (!record.application_url) {
			flags.push({
				code: 'missing_application_link',
				severity: 'warning',
				message: 'The job record is missing an application link.',
				field: 'application_url'
			});
		}
	}

	if (record.coil === 'red_pages' && !record.organization_name && !record.title) {
		flags.push({
			code: 'missing_provider',
			severity: 'warning',
			message: 'The listing is missing organization or owner information.',
			field: 'organization_name'
		});
	}

	if (record.coil === 'toolbox' && !record.publisher && !record.organization_name) {
		flags.push({
			code: 'missing_publisher',
			severity: 'warning',
			message: 'The resource is missing publisher/provider information.',
			field: 'publisher'
		});
	}

	const detailEnrichmentFailed = diagnostics.detailEnrichmentFailed;
	if (detailEnrichmentFailed) {
		flags.push({
			code: 'detail_enrichment_failed',
			severity: 'warning',
			message: 'Detail-page enrichment failed for this record.'
		});
	}

	for (const conflict of extractedFacts?.conflicts ?? []) {
		flags.push({
			code: conflict.field.toLowerCase().includes('date')
				? 'conflicting_dates'
				: 'ai_detected_conflict',
			severity: 'warning',
			message:
				conflict.reason ??
				`AI enrichment found a possible conflict for ${conflict.field.replace(/_/g, ' ')}.`,
			field: conflict.field
		});
	}

	const conflictingUrlRoles = Object.values(urlRoles).filter(
		(entries) => (entries?.length ?? 0) > 1
	).length;
	if (conflictingUrlRoles > 0) {
		flags.push({
			code: 'conflicting_urls',
			severity: 'info',
			message: 'Multiple candidate URLs were captured for one or more link roles.'
		});
	}

	if ((confidence?.overall ?? 1) < 0.75) {
		flags.push({
			code: 'low_confidence',
			severity: 'warning',
			message: 'Extraction confidence is below the desired threshold.'
		});
	}

	return flags;
}

export function computeConfidence(
	record: NormalizedRecord,
	flags: QualityFlag[],
	entitySuggestions: EntityMatchSuggestion[] = []
): CandidateConfidence {
	let overall = 0.98;
	const fields: Record<string, number> = {};

	for (const flag of flags) {
		if (flag.severity === 'error') overall -= 0.18;
		else if (flag.severity === 'warning') overall -= 0.08;
		else overall -= 0.03;
		if (flag.field) fields[flag.field] = Math.max(0.2, (fields[flag.field] ?? 0.9) - 0.2);
	}

	const keyFields = keyFieldsForRecord(record);
	for (const field of keyFields) {
		if (!(field in fields)) fields[field] = 0.92;
	}

	return {
		overall: clamp(overall, 0.1, 0.99),
		fields,
		entities: entitySuggestions
	};
}

function keyFieldsForRecord(record: NormalizedRecord) {
	switch (record.coil) {
		case 'events':
			return ['title', 'start_date', 'location_name', 'organization_name', 'image_url'];
		case 'funding':
			return ['title', 'funder_name', 'deadline', 'application_url', 'image_url'];
		case 'jobs':
			return ['title', 'organization_name', 'application_url', 'closing_date', 'image_url'];
		case 'red_pages':
			return ['title', 'organization_name', 'website', 'address', 'image_url'];
		case 'toolbox':
			return ['title', 'publisher', 'url', 'publication_date', 'image_url'];
	}
}

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}
