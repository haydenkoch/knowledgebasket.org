## Jobs content audit - April 7, 2026

Purpose: replace fictional seed content in the local `jobs` table with real, current, California tribal-focused openings verified against official employer pages.

### What changed

- Removed the 6 placeholder `source='seed'` jobs from the local database.
- Inserted 34 published jobs with `source='audit_2026_04_07'`.
- Replaced generated descriptions with source-only text.
- Left descriptions blank when the source page listed only a title or contact/apply info.

### Included sources

- Hoopa Valley Tribe careers: https://www.hoopa-nsn.gov/careers/
- Blue Lake Rancheria jobs: https://www.bluelakerancheria-nsn.gov/jobs/
- United Indian Health Services career center: https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?ccId=19000101_000001&cid=447f2bd0-2d4d-4f2a-9bae-3f5453ebc910&lang=en_US
- Southern Indian Health Council career center: https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?ccId=19000101_000001&cid=599d7f2c-ccd4-4853-ba54-3a77c0e05068&lang=en_US&type=MP

### Resulting counts

- Hoopa Valley Tribe: 14 jobs
- Southern Indian Health Council: 10 jobs
- United Indian Health Services: 9 jobs
- Blue Lake Rancheria: 1 job
- Total published jobs after audit: 34

### Audit rules used

- Only official employer or tribal career pages were used.
- Only California-based tribal or Native-serving employers were included.
- Jobs that appeared stale or clearly past deadline were excluded.
- The UIHS listing `Clinical Nurse - RN - Eureka - Closes 03/17/26` was intentionally excluded because the listed close date had already passed before the audit date.

### Notes

- UIHS included one role closing on April 7, 2026. It was kept because it was still listed as a current opening on the audit date.
- This audit updated the local database only. If search indexing needs to reflect the new jobs in Meilisearch, run the jobs reindex flow afterward.
- After the follow-up cleanup, only the Blue Lake Rancheria posting retains a populated description because its source page included a direct job description block.
