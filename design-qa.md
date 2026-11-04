# Design QA · 4 November 2026

final result: passed

Scope: the GitHub Pages **browser preview** requested by the user. Live authentication on a Between Gigs custom domain, hosted persistence, and sending invitation emails are deliberately deferred. This pass does not claim a live account or inbox test.

## Source and evidence

- Visual anchor: supplied invitation `C:/Users/jmass/Downloads/B8EDC902-B45C-4798-ADF9-051406613BA2.png` (980 × 1280).
- Green alternative: supplied `codex-clipboard-cb43c9c8-9e5e-48f9-8c6c-9b34983d33bb.png` (1073 × 674).
- Profile reference: rendered `../tmp/references/profile-01.png` (1527 × 2000); the narrow PDF view is a two-column reference, not a literal single-phone screenshot.
- Browser-rendered implementation: `docs/qa/welcome-desktop.png`, `docs/qa/profile-mobile-dark.png`, `docs/qa/image-crop.png`.
- Combined source and implementation comparison: `docs/qa/comparison-welcome.png`. Additional local full/focused comparisons: `tmp/qa/comparison-profile-final.png`, `comparison-profile-detail-final.png`, `comparison-mobile-final.png`.
- Published URL verified: https://between-gigs.github.io/gigster-onboarding/.

Desktop CSS viewport: 1440 × 1000; mobile: 390 × 844. Browser screenshot content excludes the scrollbar (desktop 1424 px, mobile 374 px in the final profile evidence). These are CSS-density captures; comparisons use preserved-aspect downscaling for composition, not an exact pixel-difference score. The requested landing is a matching-style variant of the invitation, not a literal poster-to-page clone. Whole-view and focused identity/form/crop regions were inspected together with the references.

## Findings and fixes

- Earlier P2: low-resolution source cover was visibly soft at desktop width. Replaced the Maya cover and first service image with the generated 1536 × 1024 sewing-workspace photo, then recaptured the published profile. Resolved.
- Earlier P2 evidence gap: the first supposed dark-mode capture was stale and still light. Repeated the capture on the deployed site, verified `data-theme=dark`, and checked forest surfaces, cream text and mint actions on desktop and mobile. Resolved.
- Exact field accessible names now avoid a concatenated “required” suffix. Modal focus returns to its trigger; Escape closes dialogs; focus remains visible.
- Read-only/sample profiles hide empty optional fields and editing-specific labels. Search handles the singular result label.

No actionable P0/P1/P2 visual findings remain in the preview scope.

## Required fidelity surfaces

- **Typography:** approved Newsreader serif and Figtree sans load from project assets; headings, line breaks and editable values preserve a clear hierarchy. The green variant uses Sora. Mobile display text is legible without clipping.
- **Spacing/layout:** desktop welcome balances copy and craft photography; profile uses an identity area, main content and practical-details rail. Mobile stacks these in reading order. No document-width overflow at 390 px; persistent review controls remain visible. Horizontal scrolling within the labeled funnel canvas is intentional.
- **Colors:** ivory/forest palette follows the invitation. Theme tokens handle light/dark surfaces and controls. The email intentionally uses a stable cream design; exact automatic email-client color transforms remain unverified without inbox tests.
- **Images/assets:** approved logos are used directly. Hero and crop preview are sharp; uploaded crops preserve aspect and focal area. Fictional professionals have distinct crafts and portfolios, including a casual workshop portrait. Image-free services remain presentable.
- **Copy:** public welcome precedes account creation. The profile gives an immediate click-to-type cue, honest save status, a review checkpoint, and a return-to-edit path. Sample content is identified. Review text is an empty future state, with no fabricated reviews.

## Interaction verification

- Published landing CTA opens the account preview popup; its clearly labeled continuation opens the editable browser demo. Real Clerk modal APIs are wired for the supported Between Gigs domain.
- Editable values, multiple credits, add/remove services, preview/review checkpoint, confirmation and return to editing.
- Searchable inspiration gallery; real file chooser; JPG/PNG/WebP selection; crop and save using the deployed preview.
- Theme toggling and mobile layout, with DOM width and font/image loading checks.
- Six searchable/clickable sample professionals; search narrows to the relevant craft.
- Empty-profile preview: required questions show clear feedback; filling only name, craft, one service, and one credit reaches the review checkpoint. Its browser draft is separate from the illustrated sample. The fresh mobile start is captured in `docs/qa/blank-profile-mobile.png`.
- Funnel card opens interactive preview; desktop/mobile and full-page controls work. Editing a question label is reflected in the profile; block reorder changes actual section/tab order. Reset restores defaults; JSON export is implemented.
- Application source has no browser-console errors in these paths. Two MutationObserver errors appeared during browser instrumentation of changing iframe documents; no application code uses MutationObserver, and they did not affect the rendered preview or controls.

## Code verification

12 core checks pass (2 minimum-question tests and 10 API tests), plus 4 static-host packaging checks and email-render validation. The authenticated API tests use signed test JWTs to verify ownership, persistence, review history, stale revisions, private media, and signed unsubscribe behavior. GitHub Actions build and Pages deployment passed.

## Follow-up polish

P3: one remaining source-library service thumbnail is softer than the new image. Small secondary helper copy could be increased slightly. Neither blocks the preview. The searchable image library is local; live Unsplash search is not connected.

No test emails or campaigns were sent. Gmail, Outlook and Apple Mail inbox verification remains outside this pass because the user explicitly kept email sending off.
