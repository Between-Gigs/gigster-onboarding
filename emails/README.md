# Between Gigs invitation

`Invitation.tsx` follows the supplied cream-and-forest invitation. Its headline, body, button and footer are real text. The optional still-life image is decorative; the message and action remain usable when images are blocked. The source poster in `static/craft-invitation-reference.png` is a design reference only and is never sent as the email.

The template uses presentational tables from React Email, inline pixel styles, system fonts with a Georgia headline, explicit colors, light color-scheme metadata, and Outlook.com color overrides. Email applications can still apply their own color transformations. Check an actual delivery in Gmail, Apple Mail and Outlook in both appearance modes before approving the final invitation; browser previews alone cannot verify their behavior.

## Preview

From the project root:

```sh
npx tsx scripts/export-email.tsx
```

This writes `public/email/invitation.html` and `.txt`. The public export is explicitly marked **DESIGN PREVIEW · NOT SENT** by default. It includes the address already used in the approved campaign; a recipient-specific unsubscribe service must be configured before sending. No email is sent. Optional source assets are `public/assets/craft-still-life.png` and `public/assets/logo-email.png`; their public URLs are derived from `EMAIL_ASSET_BASE_URL` or `PUBLIC_APP_URL`.

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
