# Web-first intake — implementation and remaining work, 2026-11-10

## Implemented

The first four owner modules are Scan, Flags, Require Valuation, and Ready to List. Listings, Bundles, Inventory, Analytics, Collecting, and Buying Tools follow under management.

Scan contains direct iPad camera capture, persistent local pending uploads, resumable verified chunks, explicit front/back labels, immutable finish manifests, and received-session history. Original images are preserved separately from edits. Camera test: both sides 3024 × 4032. Safari capture does not export to Photos or require iCloud.

Flags derives reasons from image presence, pairing evidence, identity completeness, finish confirmation, review questions, and ownership. Missing historical evidence is explicitly unknown, not proof of defective scans. Require Valuation distinguishes absent, stale and unsuccessful research; an asking price alone cannot qualify a card. Ready to List contains thumbnail pairs, proposed card title, valuation evidence and separate BIN/auction/bundle/hold decisions. Saving a decision does not publish a listing. Identity/image/evidence changes invalidate the decision revision. Queues include batch filtering, search, 50-row pages and per-card stage details. One flagged card does not change other cards' stages.

The existing inventory mirror supplies records, with a separate evidence table keyed to matching identity/image stamps. The existing mirror source is configured in `intake/eetee-library/inventory-lookup.json`; its env_file points to `.env.local.pre-clean-db-backup`. Despite its filename, that is the existing deployed mirror target. No database switch or inventory migration was performed. Evidence synchronization matched 5,266 of 5,274 records; eight mismatches were held. Final website counts also exclude listed/reserved/sold cards and invalidate changed web metadata, so raw snapshot totals are not final queue totals.

Capture-to-inventory receipts preserve session/card/asset IDs and immutable physical-copy linkage. The owner-confirmed Penny Hardaway test is linked to existing B20261105-010; no duplicate copy or photo replacement was made. `scripts/stage-web-captures.mjs` can verify and preserve received originals under the existing library's web-captures folder. It does NOT import inventory or invoke identification. Unimported captures remain visible as awaiting handoff.

## Runtime boundary and current blocker

The databases, original photos, edited images, receipts, decisions, source code and checklists are independent eetee assets. Ordinary upload/storage/checksum/classification logic does not invoke Codex. Existing native identification and valuation still use Codex CLI for AI work; local image processing/OCR/checklist code is separate. No custom recognition model was trained by this work.

This session's filesystem environment rejects connection to the existing Mac worker Unix socket with PermissionError (operation not permitted). No second worker was started against the library, no worker lock was bypassed, no native bundle was replaced, and no scheduler was installed. Automatic web-capture import and end-to-end processing remain incomplete and unverified.

The separate build auto-review issue was resolved in source: the existing eBay diagnostic GET endpoint now uses force-dynamic, preventing a static build from contacting eBay. A subsequent complete build passed. Production credentials were not changed.

## Required next implementation

1. Add a durable importer to the existing worker, with session/card IDs as idempotency keys. Recover interrupted imports from retained source hashes before creating any physical copy. Use the explicit capture manifest for ordering, and still validate visual front/back identity. Exact duplicate images become flags; matching card identity alone must not delete legitimate second owned copies. Only update the cloud receipt after canonical inventory admission is verified.
2. Start processing automatically for new imported cards. Preserve originals and edit recipes. Isolate per-card errors and retry only failed steps. Publish worker heartbeat, last successful check, and batch stage totals. Honor existing worker pause/settings; do not enqueue the entire historical collection unexpectedly.
3. Refresh evidence after each canonical change, rather than relying on the currently manual sync script. Reconcile old records lacking evidence without forcing unnecessary rescans or treating existing prices as verified valuations.
4. Complete web Flags actions: compare both sides, correct pairing, request/replace a side, confirm specific uncertain fields, accept a false-positive with evidence revision, retry the affected step. Existing Review details opens the current correction tools; it is not yet a complete canonical reconciliation workflow. Never overwrite concurrent owner edits.
5. Complete valuation controls: run/retry research for a single card or batch, store dated attributable sold comparisons and match assumptions, and return unsupported cases to Require Valuation. CardSight remains optional, with no new paid calls. CardLadder requires a verified permitted data-access path; none was established here. Existing native research remains available but is not newly scheduled by this build.
6. Wire saved web selling decisions into the existing listing composer. Reuse reviewed attributes, keep shipping/schedule/offers/condition requirements visible, and require final owner listing intent. A saved BIN/auction decision is not a marketplace publication receipt. Hold and bundle choices should become management filters after review.
7. Verify a genuinely NEW card end to end on iPad: received → canonical copy → image preparation → pair verification → identity → supported valuation or explicit failure → review. The Penny test cannot prove new-copy admission because it is already owned.

## Other-module assessment

- Scan: capture entry plus batch progress; distinguish uploaded, staged, processing, blocked and complete. Retain Mac helper for physical scanner access.
- Flags: unified exception queue replaces the old general Review landing page; expose image-review and fix-request tools inside it.
- Require Valuation: research workbench, with no-data reasons and retry history. Do not conflate asking prices with market estimates.
- Ready to List: final commercial review table; retain values separately from owner asking prices and starting bids.
- Listings/Bundles: execution and publication receipts, scheduled/live/ended listing status, and bundle membership.
- Inventory: all owned copies, locations, acquisition costs, sold/traded history and audit trail, regardless of listing choice.
- Analytics: separate storefront traffic/sales from intake throughput, age of backlog, failure rate and worker availability.
- Collecting: personal collection and rainbow/checklist trackers using shared card/checklist data.
- Buying Tools: wishlist/scouting/comparison tools, outside the intake path.

Do not retire `/Applications/eetee Scan.app` until the web repair/review controls and independent background worker are verified. Safari is the intended management UI; the current Mac helper still performs necessary work.

## Verification

Full production build passed. Seven focused cases cover capture receipts, retry/retake handling, immutable manifests, physical-copy linkage, stage gating and price validation. An authenticated local server against the existing mirror returned HTTP 200 for all four owner modules and the capture API, HTTP 401 without authentication, and queue counts of 1 processing, 315 flags, 240 requiring valuation, and 0 ready (5,274 total records including excluded listing/ownership states). The Penny test receipt was visible. An additional isolated authenticated API integration test passed for saved selling decisions, stale revisions, cross-origin rejection and authentication gates. These counts are an observation at test time, not a promise that the old backlog is reconciled.

## Flags refinement — 2026-11-10

Flags now groups cards into Confirm Base, Confirm Parallel, Attribute Concern, Image Quality Concern, Unknown Identity, and a separate Processing / Evidence group. Only short action labels appear in rows; the original explanatory paragraphs remain in collapsed Evidence. Multi-issue cards appear in each relevant group. A missing finish is not assumed to be base. Unknown identity is distinct from a known card with an uncertain attribute.

Owner finish confirmations persist with source/image stamps and audit history. They apply to the web inventory view, invalidate valuation when the finish changes, and expire when source evidence changes. These confirmations are not yet written back to the native collection; canonical reconciliation remains required. Checklist options can be exported from the existing checklist index and parallel catalogue. The attempted evidence refresh was blocked by automatic approval review; it must not be represented as completed.

The existing automatic web image screener now also supports mild exposure correction for confidently dark originals: a fixed 12% lift, highlight-clipping guard, unchanged dimensions, retained original, revision/hash checks, and no repeat brightening of already edited images. Existing confident black-border cropping remains. This does not reconstruct missing corners, remove glare hiding details, or prove all image-quality concerns resolved. Automatic rotation/deskew beyond existing confident geometry paths and reconciliation of old quality flags still require further worker work. Deployment/worker execution has not been verified for this addition.
