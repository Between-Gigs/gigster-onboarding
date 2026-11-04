import assert from 'node:assert/strict';
import { renderInvitation } from '../emails/render';
import Invitation from '../emails/Invitation';

const props = {
  ...Invitation.PreviewProps,
  firstName: '<Avery & Co>',
  artUrl: 'https://between-gigs.github.io/gigster-onboarding/assets/craft-still-life.png',
};
const { html, text } = await renderInvitation(props);
assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, 'One accessible main heading');
assert.match(html, /lang="en"/);
assert.match(html, /role="presentation"/);
assert.match(html, /max-width:600px/);
assert.match(html, /DESIGN PREVIEW/);
assert.match(html, /&lt;Avery &amp; Co&gt;/, 'Personalization is escaped');
assert.match(html, /name="color-scheme" content="light"/);
assert.match(html, /alt=""/, 'Decorative image does not repeat the message');
assert.match(html, /href="https:\/\/between-gigs.github.io\/gigster-onboarding\/#\/welcome"/);
assert.match(html, /Unsubscribe/);
assert.match(text, /Your craft\./i);
assert.match(text, /More possibilities\./i);
assert.match(text, /Create your profile/);
assert.match(text, /11766 Wilshire Blvd, Los Angeles, CA 90025/);
assert.doesNotMatch(html, /display:(?:flex|grid)|<svg|\.webp["?]/i);
assert.ok(Buffer.byteLength(html) < 100_000, 'Email fits under clipping threshold');
console.log(`Email render checks passed. HTML: ${Buffer.byteLength(html)} bytes. Plain text: ${Buffer.byteLength(text)} bytes. No email sent.`);
