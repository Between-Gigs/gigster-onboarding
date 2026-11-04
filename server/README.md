# Between Gigs onboarding API

This service supplies durable private profiles, uploaded images, immutable review submissions, and invitation unsubscribes. The frontend can run on GitHub Pages; this Node 24 service needs a separate HTTPS host with a persistent disk. GitHub Pages cannot execute it.

From this directory, run `npm install`, copy `.env.example` to `.env`, fill in the public Clerk key and exact frontend origins, then run `npm start`. Run `npm test` for persistence, owner isolation, signed-token, JWT, and request rejection checks. Production dependencies are `express`, `cors`, and `jose`. SQLite is built into Node 24.

The existing Clerk application must allow the frontend domain and have Google and email/password enabled. Authentication verifies RS256 signatures against the Clerk instance's JWKS, exact issuer, expiration, session identity, and allowed `azp` origins. No Clerk secret key is needed. A missing Clerk key or origin list leaves authentication disabled and protected routes fail closed; there is no demo login on the API.

## Routes

All profile, submission, upload and review routes require `Authorization: Bearer <Clerk session token>`. Frontend sessions should call Clerk's `getToken()`. Cookies are not accepted by this API.

- `GET /api/health`: public readiness flags, without keys or storage paths.
- `GET /api/profile`: current user's profile, or `profile: null`.
- `PUT /api/profile`: JSON profile directly, or `{profile, revision}`. Send the previous revision to detect edits from another device (409 means reload and reconcile).
- `POST /api/submit`: submit the saved profile. Optionally `{profile, revision}` saves and submits atomically. Requires name, craft, at least one credit and at least one service title. Validation failure rolls the transaction back.
- `POST /api/uploads`: JSON `{dataUrl}` with a JPEG, PNG or WebP, at most 5 MB. SVG/HTML and mismatched signatures are rejected. Returns `{id, url, contentType, size}`. Store the relative `/api/uploads/<id>` reference in the profile. Uploaded image bytes stay in the SQLite database on the persistent disk. Limit is 100 images per account.
- `GET /api/uploads/:id`: original private image bytes for the authenticated owner only. To show these in an image element, fetch with the bearer token and create a temporary `URL.createObjectURL(blob)`; revoke it when finished. Never put session tokens in URLs.
- `GET /api/admin/submissions`: newest 100 immutable snapshots. Only explicit `REVIEWER_CLERK_IDS` can use this route. There is no public profile listing or approval endpoint.

Profile responses have `{profile, revision, savedAt, submission, changesPending}`. The server controls `profile.status` (`draft` or `needs_review`) and `submittedAt`; submitted dates cannot be forged. `submission` is `{id, submittedAt}` or `null`. Saving after submission changes only the private draft, preserves the original review snapshot, and sets `changesPending: true`. Resubmitting creates a fresh immutable snapshot. Repeating an identical submission returns its existing receipt, so retries do not duplicate the queue.

The database is the authority for real submissions. Browser-only previews must remain separate and must not claim that a review was sent. Back up the database and its persistent volume before migration into the OS app. Do not run multiple replicas against separate ephemeral disks.

## Invitation preferences

`UNSUBSCRIBE_SECRET` must contain at least 32 bytes of random secret text. Generate it once and keep it out of the frontend and Git. Rotating it invalidates existing invitation links. `server/unsubscribe.mjs` exports `createUnsubscribeToken({email, topic: 'gigster-invitations'}, secret)`. Tokens encrypt recipient details using AES-256-GCM and have an HMAC signature; recipient addresses are not readable from the URL.

- `GET /api/unsubscribe?token=...`: confirmation form only, safe for email link scanners.
- `POST /api/unsubscribe?token=...`: URL-encoded `List-Unsubscribe=One-Click` records the invitation-topic unsubscribe. It returns 200 without redirect and does not require login.
- `GET /api/unsubscribe/status?token=...`: `{unsubscribed}` for the signed recipient. Server-only invitation sending code must call this endpoint and skip suppressed recipients before every send.

Include `List-Unsubscribe: <https://YOUR-API/api/unsubscribe?token=...>` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` in email headers. Your sending provider must DKIM-sign those headers. The same HTTPS endpoint belongs in the visible email footer. Reuse the same generated token and exact email payload for a send retry. Suppression is stored locally in the durable database for this invitation topic; this service does not modify other mailing lists or account access.

## Deployment configuration

Copy `server/.env.example` to a private environment file or set the variables on the API host. `DATABASE_PATH` must point to a writable persistent volume. Set `HOST=0.0.0.0` in a container and terminate TLS at the platform proxy. Set the frontend API base URL to this service's public HTTPS URL. If the Clerk production domain is elsewhere, configure Clerk's satellite-domain flow or use a subdomain of the same Between Gigs domain; a public key alone does not change the Clerk domain allowlist.

Useful official references: [Clerk manual session verification](https://clerk.com/docs/guides/sessions/manual-jwt-verification), [Node SQLite](https://nodejs.org/api/sqlite.html), [one-click unsubscribe](https://www.rfc-editor.org/rfc/rfc8058.html).
