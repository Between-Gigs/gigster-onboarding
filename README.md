# Between Gigs · Gigster onboarding

A responsive invitation-to-profile experience. The warm editorial direction follows the supplied “Your craft. More possibilities.” invitation, using the approved Between Gigs marks, Figtree and Newsreader. The green landing direction remains available for comparison.

## Journey

Email invitation → public welcome → **Clerk registration/sign-in popup** → edit profile in place → check details → send for review → return and edit.

- `#/welcome`: editorial public landing; `#/welcome-green`: green alternative.
- `#/auth`, `#/register`: landing with account popup, for direct links.
- `#/profile`: private account profile. Add `?preview=1` before the hash for a clearly labeled local demo.
- `?preview=1&blank=1#/profile`: start with an empty profile; this draft saves separately from the illustrated sample.
- `#/submitted`: confirmation; `#/discover`: six illustrative profiles with functioning search/filter/sort.
- `#/studio`: connected funnel canvas, desktop/mobile/full-page previews, field labels and requirements, block ordering, schema export.
- `public/email/invitation.html`: rendered email design preview. Text and buttons are real HTML.

Minimum questions: name, on-set craft, at least one proud credit, and services beyond the set. Photo, IMDb, starting rate, location, and bio are optional. Availability is a switch. There is no “Popular services” module; reviews are an honest future empty state.

## Local development

Node 24 is required for SQLite. Run `npm ci` and `npm ci --prefix server`. Copy `.env.example` to `.env`; add the existing **public** Clerk key. Start `npm run server`, and `npm run dev -- --port 4173` in separate terminals. The frontend proxies `/api` to port 3001. No secret Clerk key is needed for JWT verification.

`npm test` checks required questions plus signed-token auth, private media, cross-account isolation, durable saved drafts, immutable review snapshots, conflicts, and signed unsubscribe behavior. `npm run email:check` validates rendered email and plain text without sending. `npm run build` builds the frontend.

## Hosting and real accounts

GitHub Actions publishes the static preview to https://between-gigs.github.io/gigster-onboarding/. The production Clerk key resolves to `clerk.between-gigs.com`; it cannot authenticate an unrelated `github.io` origin. Use a custom subdomain such as `onboarding.between-gigs.com` for real accounts. Until then, the temporary host explicitly offers a browser-local preview and never pretends to create an account.

When connecting a custom domain, change the workflow's `BASE_PATH` to `/`, set the GitHub Pages custom domain and DNS, and set `PUBLIC_SITE_URL` to the custom URL before exporting email. Confirm Google and email/password are enabled in the shared Clerk instance. See [Clerk production domains](https://clerk.com/docs/guides/development/deployment/production).

The `server/` API needs a separate HTTPS host and a persistent disk. Run `node server/index.mjs` with `HOST=0.0.0.0`, `DATABASE_PATH` on the mounted disk, the public Clerk key, and exact `FRONTEND_ORIGINS`. Set `VITE_API_URL` in GitHub repository variables to that HTTPS API origin and rebuild. See [server/README.md](server/README.md) for reviewer IDs, storage limits, and deployment details. A Railway connection was present but required reconnection during this build; no API has been deployed.

Drafts and photos belong only to the signed-in user. Autosave and submit are serialized. Review submissions create immutable snapshots; subsequent edits remain drafts until resubmitted. Reviewer access is separately allowlisted. Nothing is made public automatically.

## Invitation email

Approved sender: `Between Gigs <hello@between-gigs.com>`. Existing campaign footer: `11766 Wilshire Blvd, Los Angeles, CA 90025`. The template includes a plain-text version, a real CTA, footer, and recipient-specific unsubscribe support. Production sends require a configured API and unsubscribe secret. [Email setup](emails/README.md).

**User instruction: do not send test emails or campaigns yet.** No emails were sent during this build. Browser dark-mode previews and structural checks do not replace Gmail, Outlook, and Apple Mail inbox verification once sending is authorized. No email client can be forced to preserve exact colors in every mode; the message remains readable without decorative images.

## Images and schema editing

Upload JPG, PNG, or WebP, crop/zoom before saving, or choose a service image from the searchable inspiration library. Profile images remain private through authenticated API reads. Live Unsplash search is not connected; the local inspiration gallery is clearly labeled.

Studio labels, optional requirements and section order are browser-local preview settings; export JSON to move them into production. Live validation uses server rules. Minimum required questions cannot be disabled. Multiple credits and services are supported. Root schema logic lives in `src/model.mjs`; server validation is explicit in `server/validation.mjs`.

Brand assets, bundled fonts, and six illustrative profile datasets/images came from the supplied `between-gigs-design-system` repository. The sample library is for design review; confirm source-image licensing before a public marketplace launch. `craft-still-life.png` and `jordan-candid.png` were generated for this project with built-in ImageGen. The supplied invitation and green welcome screenshots are reference artifacts. All sample names, production credits, rates, and work are fictional.

## Moving into Between Gigs OS

Copy the React experience, theme and public assets; mount `Profile` behind the existing Clerk provider; point `VITE_API_URL` to the same API. Keep the Clerk application and stable user IDs, migrate the SQLite database and private media together, and preserve immutable review snapshots. Do not migrate browser demo records as real user profiles. Export the desired studio schema, enforce its requirements in server validation, and carry over the approved email footer/unsubscribe endpoint.
