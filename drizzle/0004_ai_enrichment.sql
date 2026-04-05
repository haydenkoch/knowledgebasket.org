alter type "public"."source_run_stage" add value if not exists 'ai_enrich';

alter table "imported_candidates"
	add column if not exists "extracted_facts" jsonb default '{}'::jsonb not null;
