# Front image review — 2026-10-24

Screened 4,714 unique storefront front assets (individual cards, bins and team bundles); no unreadable files. Visually reviewed 326 candidates ranked by dark tones and apparent scan margins. Boundary metrics were used to select candidates, never as authority to cut a dark card border.

The committed manifest contains 293 reviewed adjustments: 291 modest 15% brightness lifts and two 10% lifts where highlights needed more protection. Two include individually checked crops. Contrast, saturation and gamma remain unchanged. Rendered results were visually checked before application. This is a targeted first pass, not a claim that all 4,714 images received individual visual inspection.

Apply through the authenticated `/admin/image-audit` page. Each five-card batch verifies original SHA256, keeps original bytes, creates an immutable before/after version and uses the existing editor transaction. Previously flagged/edited cards are skipped; restored results are never silently reapplied. Photo-only changes do not write full public identity snapshots. No original file or native Scan library is modified.

## Feedback and calibration

Owner flags retain issue choices, notes and timestamps. Manual Fix Card saves retain exact crop, rotation, brightness, contrast, saturation and gamma in version provenance, together with the image revision they replaced. Audit changes are explicitly labeled `inventory-audit-v1 fronts-2026-10-24`, separate from `owner-editor-v1`. Follow-up owner adjustments can therefore be compared to this pass without treating the assistant's choices as owner approval.

Observed preference: modest 10–20% brightness lifts for dim scans, retain authentic finish/foil/color, tighten obvious empty backgrounds without clipping card edges or holder labels. Dark Select/Prizm designs cause threshold-only geometry detection to mistake printed artwork for a boundary. Keep these cases out of unverified automatic crops. Do not globally brighten every future image or learn a universal crop from one card.

These records support later calibration; they do not automatically retrain a model or change eetee Scan capture settings. Native imaging changes should be evaluated against owner-reviewed before/after examples first.
