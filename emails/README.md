# Between Gigs invitation

`Invitation.tsx` displays the exact supplied cream-and-forest poster as one responsive, opaque PNG. Its typography, logo, photographic border, text layout and button remain identical to the source. The complete image links to the public welcome page. A separate live HTML button, physical address and unsubscribe footer sit below it, and `render.tsx` supplies a complete plain-text message independently of the image.

The template uses presentational tables from React Email, inline pixel styles, explicit colors, light color-scheme metadata, and Outlook.com color overrides. The opaque poster keeps the artwork's pixels together rather than relying on email-client font rendering. Image blocking is the main tradeoff: descriptive alt text, the live HTML action and the full plain-text message provide alternatives. Actual Gmail, Apple Mail and Outlook behavior still requires an authorized inbox test; browser previews alone cannot verify those clients.

The poster's small concept/date line is intentionally preserved for this unsent preview. Before production, remove only that localized stamp (approximately x=308–666, y=1007–1045 in the 979×1280 source) from an approved final artwork. Do not remove a full horizontal band, which would break the surrounding tools and cable. `EMAIL_POSTER_URL` can point to that final PNG/JPEG without changing the email layout.

## Preview

From the project root:

```sh
npx tsx scripts/export-email.tsx
```

This writes `public/email/invitation.html` and `.txt`. The public export is explicitly marked **DESIGN PREVIEW · NOT SENT** by default. It includes the address already used in the approved campaign; a recipient-specific unsubscribe service must be configured before sending. No email is sent. The current poster is `public/assets/invitation-reference.png`, checked byte-for-byte against `static/craft-invitation-reference.png`. Its public URL is derived from `EMAIL_ASSET_BASE_URL` or `PUBLIC_APP_URL`, with an optional `EMAIL_POSTER_URL` override.

To render a private dry run for one recipient:

```sh
npx tsx scripts/send-invitation.tsx --to recipient@your-domain.com --name Firstname
```

The private preview is saved under `.email-jobs/`. This directory contains personal recipient data and signed unsubscribe tokens and must stay out of Git and public hosting.

## Live delivery

Set these server-side values in `.env.local`, `.env`, or the process environment. Never prefix private values with `VITE_`.

| Variable | Value |
| --- | --- |
| `RESEND_API_KEY` | A key permitted to send and read contact subscription preferences |
| `EMAIL_FROM` | The approved sender: `Between Gigs <hello@between-gigs.com>` |
| `EMAIL_POSTAL_ADDRESS` | `11766 Wilshire Blvd, Los Angeles, CA 90025` (from the existing approved Resend campaign) |
| `PUBLIC_APP_URL` | The deployed app base, including any GitHub Pages project path |
| `API_PUBLIC_URL` | Public HTTPS base of the Node API that handles unsubscribe requests |
| `UNSUBSCRIBE_SECRET` | At least 32 bytes; exactly the same value as the API host |
| `EMAIL_ASSET_BASE_URL` | Optional absolute public asset base, defaulting to the app base |
| `EMAIL_POSTER_URL` | Optional exact PNG/JPEG artwork URL; use the clean final poster for production |

The scripts also accept the app's existing names: `INVITATION_FROM`, `PHYSICAL_ADDRESS`, `PUBLIC_SITE_URL`, and `PUBLIC_API_URL` for the corresponding sender, address, site, and API settings.

The API and its durable storage must be online first. GitHub Pages serves the app and preview; it cannot process unsubscribe POST requests itself.

```sh
npx tsx scripts/send-invitation.tsx --to recipient@your-domain.com --name Firstname --campaign reviewer-test-01 --send
```

The user has explicitly paused test emails and blasts. Do not run a live send until the user authorizes it again. `--send` is required for a real send. The script first checks the API's invitation suppression list and the recipient's Resend contact preferences. A failed preference check prevents sending. Both the visible unsubscribe link and RFC 8058 list-unsubscribe headers point to the API's signed recipient-specific endpoint. GET shows a confirmation; POST records the opt-out without requiring sign-in.

Each recipient/campaign pair is persisted before sending. Retries reuse the exact HTML, unsubscribe token and Resend idempotency key. A recorded success prevents duplicate sends. An uncertain attempt older than 23 hours requires checking Resend before creating a new campaign, since its idempotency keys expire after 24 hours. Protect and preserve `.email-jobs/` when retrying a campaign.

API acceptance is not inbox delivery. Check the resulting Resend email ID for delivery events, then have each reviewer verify the invitation, account creation, saved profile, review submission and return visit.

## Still needed for the requested live test

- Peter and Patti's confirmed recipient addresses.
- The configured Clerk app and allowed deployment origin.
- A deployed API with durable storage, shared unsubscribe secret and Resend key.
- Actual inbox checks in light and dark appearance modes.

## Implementation references

- [React Email components](https://react.email/docs/components/html)
- [Resend contact preferences](https://resend.com/docs/api-reference/contacts/get-contact)
- [Resend send API](https://resend.com/docs/api-reference/emails/send-email)
- [Resend retry and idempotency behavior](https://resend.com/docs/dashboard/emails/idempotency-keys)
