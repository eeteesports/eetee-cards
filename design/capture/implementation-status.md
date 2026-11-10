# Web-first admin transition — 2026-11-10

Owner authorized full build: iPad camera capture → image processing/pair verification → identification → canonical inventory → evidence-backed valuation → Ready for Review & List. Review allows BIN, auction, team bundle, or do not list; asking prices stay separate from market values. No automatic publication implied.

Current production baseline: 1210cf3ee16da32237d180b482f1e40ff154fadb. Isolated branch codex/ipad-intake. Capture code copied from successful iPad preview and owner navigation updated. Upload protocol tests pass.

Observed device test: session 1ec47529-9f2a-44a1-9878-8814c1b8909e, card 96c5073a-d23d-43f5-9e59-437884246718, front 98927a8e-c4ca-4e8d-8202-b291df6a479c, back fe36f404-1968-4f50-b688-f34493862500. Both 3024×4032. Owner explicitly identified this as the SAME physical Penny Hardaway #113 as B20261105-010. Preserve test provenance; do not import as another owned card or overwrite its original photos without explicit image selection.

Unresolved prerequisite: deployed capture database contains capture_sessions while local .env.local database returns no such table. Do not switch environment variables or migrate inventory blindly. Determine cloud versus canonical local inventory identities and source mapping before importing. Existing studio_inventory and inventory_lookup_copies are mirrors; background synchronization can overwrite unilateral cloud edits. Establish revisioned write-back/owner corrections before claiming Safari is canonical.

Keep native scanner services: Safari is the intended owner workspace, but Fujitsu hardware and current local processing depend on Mac services. Reduce the visible macOS app to optional scanner/background helper only after functionality is verified. No native app/library removal authorized or performed.

Remaining: reconcile database mapping; production capture deployment; durable importer with physical-copy linkage and retry recovery; per-card resumable processing; valuation provider adapter; review queue integration; verified hourly discovery job. No schedule created. Full workflow is not implemented yet.
