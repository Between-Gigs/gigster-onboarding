import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderInvitation } from '../emails/render';
import Invitation from '../emails/Invitation';

const props = {
  ...Invitation.PreviewProps,
  firstName: '<Avery & Co>',
  posterUrl: 'https://between-gigs.github.io/gigster-onboarding/assets/invitation-reference.png',
};
const { html, text } = await renderInvitation(props);
assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, 'One semantic main heading');
assert.match(html, /lang="en"/);
assert.match(html, /role="presentation"/);
assert.match(html, /max-width:600px/);
assert.match(html, /DESIGN PREVIEW/);
assert.match(html, /&lt;Avery &amp; Co&gt;/, 'Personalization is escaped');
assert.match(html, /name="color-scheme" content="light"/);
assert.equal((html.match(/<img[\s>]/g) || []).length, 1, 'One complete approved poster preserves the composition');
assert.match(html, /src="https:\/\/between-gigs.github.io\/gigster-onboarding\/assets\/invitation-reference.png"/);
assert.match(html, /alt="Between Gigs\. You’re invited\./, 'Image has a complete readable alternative');
assert.match(html, /aria-label="Create your Between Gigs profile"/);
assert.doesNotMatch(html, /craft-still-life|logo-email|Times New Roman/, 'No replacement artwork or rebuilt poster typography');
assert.match(html, /href="https:\/\/between-gigs.github.io\/gigster-onboarding\/#\/welcome"/);
assert.match(html, /href="https:\/\/between-gigs.github.io\/gigster-onboarding\/email\/invitation.html"/);
assert.match(html, /Unsubscribe/);
assert.match(text, /Your craft\./i);
assert.match(text, /More possibilities\./i);
assert.match(text, /Create your profile/);
assert.match(text, /11766 Wilshire Blvd, Los Angeles, CA 90025/);
assert.match(text, /Your skills have value beyond the set\. Let us help you put them to work\./);
assert.match(text, /Unsubscribe: https:/);
assert.doesNotMatch(html, /display:(?:flex|grid)|<svg|\.webp["?]/i);
assert.ok(Buffer.byteLength(html) < 100_000, 'Email fits under clipping threshold');
const [approved, served] = await Promise.all([
  readFile(new URL('../emails/static/craft-invitation-reference.png', import.meta.url)),
  readFile(new URL('../public/assets/invitation-reference.png', import.meta.url)),
]);
assert.ok(approved.equals(served), 'The displayed poster is byte-for-byte the supplied artwork');
console.log(`Email render checks passed. HTML: ${Buffer.byteLength(html)} bytes. Plain text: ${Buffer.byteLength(text)} bytes. No email sent.`);
