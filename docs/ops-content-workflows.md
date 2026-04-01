# Ops And Content Workflows

## Current Operational Reality

### Events

Events currently has the strongest content workflow:

- public submission writes pending records
- admin review/edit flows exist
- curated event lists exist
- import and duplicate handling exist
- search reindexing exists

### Funding, Red Pages, Jobs, Toolbox

These coils should currently be treated as curated beta:

- public list/detail surfaces exist
- submission pages exist in the UI
- server actions are not yet operational
- equivalent moderation/review flows are not yet complete

## Recommended Workflow Direction

Build one shared operational pattern for non-event coils:

1. Public submission
2. Pending review state
3. Admin edit and moderation
4. Publish/reject flow
5. Search indexing
6. Documentation of ownership and triage expectations

## Search Reindexing

- Use `/admin/settings/search` when working from the admin UI.
- Production access to `/api/reindex` should require an admin/moderator session or `x-reindex-secret` matching `REINDEX_SECRET`.

## Documentation Rule

Whenever a submission or moderation flow changes, update the corresponding route behavior and this document in the same slice.
