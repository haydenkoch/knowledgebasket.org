# Toolbox Resource Ingestion Plan

## What Exists Today

- Public toolbox records already live in `toolbox_resources`.
- Public resource detail pages already support `contentMode` values for links, hosted pages, and files.
- Search already indexes toolbox metadata and hosted body text into Meilisearch.
- Local files can be served through `/resources/[...path]`.
- Uploaded assets already have a better durability path through S3-compatible object storage and `/uploads/[...path]`.
- Source ops already supports the `toolbox` coil and has room for `directory_sync` and `document_extraction`, but there is no local-files adapter yet.

## Corpus Findings

The current `Desktop/kb/resources` directory is mostly:

- importable primary documents: PDFs and a small number of DOCX files
- review-needed support assets: images
- skip by default: one saved HTML page plus its downloaded `_files` directory

This is a good fit for a phased rollout: import documents first, treat images as optional attachments, and quarantine saved web-page byproducts.

## Long-Term Architecture

### 1. Stable storage

Do not treat the local filesystem path as the long-term source of truth.

Recommended model:

- local folder is a staging inbox
- imported binaries are copied into object storage
- database stores object key, original filename, content hash, mime type, byte size, and ingest timestamps
- public downloads resolve to stable app URLs, not direct absolute filesystem paths

Suggested storage key shape:

- `toolbox/original/<sha256>.<ext>`
- `toolbox/derived/<sha256>/page-1.webp`
- `toolbox/extracted/<sha256>.json`

### 2. Document metadata

`toolbox_resources` is a good start, but documents need a richer asset model. Add a dedicated table such as `toolbox_resource_assets` with:

- `resource_id`
- `storage_provider`
- `object_key`
- `original_filename`
- `sha256`
- `mime_type`
- `byte_size`
- `page_count`
- `text_extract_status`
- `preview_status`
- `download_url`
- `viewer_url`

This keeps editorial metadata separate from file lifecycle metadata.

### 3. Tagging and organization

Use three metadata layers:

- curator-owned taxonomy: category, subcategory, canonical tags
- file-derived metadata: extension, mime type, source folder, ingest source
- extracted metadata: author, publisher, publication date, keywords, named entities

Folder names from the source directory can seed initial categories, but they should not stay as the only taxonomy.

### 4. Extraction and indexing

Search should eventually include extracted document text, not just title and description.

Recommended pipeline:

- detect file type
- copy binary to object storage
- extract text from PDF/DOCX
- store normalized extracted text and document metadata
- chunk extracted text for search and future AI retrieval
- index both record-level metadata and chunk-level text

Meilisearch can continue to serve public browse/search, while extracted chunks can later support deeper document search or semantic retrieval.

### 5. Embedded viewers and downloads

Current PDF embedding only covers `externalUrl` PDFs. Long-term behavior should be:

- PDFs: embedded viewer with download button
- DOCX: server-side converted HTML preview or download-first fallback
- images: image viewer or gallery treatment, not the same UI as documents
- all file-backed records: stable download endpoint with content type and filename headers

The page should render from normalized asset metadata, not from ad hoc URL heuristics.

## Recommended Delivery Phases

### Phase 1: Discovery and manifest

- inventory the resources folder
- classify importable vs skip/review files
- compute hashes and stable storage keys
- generate normalized import candidates

### Phase 2: Local-files ingestion adapter

- add a `directory_sync` adapter for source ops
- create toolbox import candidates from the manifest
- review and publish through the existing admin source-review flow

### Phase 3: Durable asset storage

- copy approved files into object storage
- persist file metadata in a dedicated asset table
- migrate public file-backed toolbox pages to object-storage-backed URLs

### Phase 4: Document extraction and richer viewer

- extract PDF/DOCX text
- index extracted content
- add embedded PDF viewer for file-backed records
- add document metadata panel and reliable download behavior

## Immediate Next Step

Use the new inventory script to produce a reviewed manifest of the current resource folder, then implement a local-files toolbox adapter that publishes import candidates instead of writing directly into live toolbox records.
