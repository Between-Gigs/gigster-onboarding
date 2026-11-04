import { mkdir, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { renderInvitation } from '../emails/render';
import Invitation from '../emails/Invitation';

for (const file of ['.env.local', '.env']) {
  try { process.loadEnvFile(file); } catch { /* Optional for previews. */ }
}

const appBase = process.env.PUBLIC_APP_URL || process.env.PUBLIC_SITE_URL || 'https://between-gigs.github.io/gigster-onboarding/';
const assetBase = (process.env.EMAIL_ASSET_BASE_URL || appBase).replace(/\/$/, '');
const production = process.argv.includes('--production');
const address = (process.env.EMAIL_POSTAL_ADDRESS || process.env.PHYSICAL_ADDRESS)?.trim();
const unsubscribeUrl = process.env.EMAIL_PREVIEW_UNSUBSCRIBE_URL?.trim();
if (production && (!address || !unsubscribeUrl)) {
  throw new Error('Production export requires EMAIL_POSTAL_ADDRESS and EMAIL_PREVIEW_UNSUBSCRIBE_URL. Use the send script for recipient-specific unsubscribe links.');
}
if (production) {
  if (address!.length < 15 || /will appear|placeholder|address here|123 main/i.test(address!)) throw new Error('Use the real mailing address for a production export.');
  for (const value of [appBase, unsubscribeUrl!]) {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || /localhost|\.(invalid|example|test)$|^127\.|(^|\.)example\.(com|org|net)$/i.test(url.hostname)) throw new Error('Production email links must use public HTTPS URLs.');
  }
}
await access(resolve('public/assets/invitation-reference.png'));
const posterUrl = process.env.EMAIL_POSTER_URL || assetBase + '/assets/invitation-reference.png';

const props = {
  ...Invitation.PreviewProps,
  inviteUrl: `${appBase.replace(/\/$/, '')}/#/welcome`,
  physicalAddress: address || Invitation.PreviewProps.physicalAddress,
  unsubscribeUrl: unsubscribeUrl || Invitation.PreviewProps.unsubscribeUrl,
  posterUrl, previewOnly: !production,
};
const { html, text } = await renderInvitation(props);
const output = resolve('public/email');
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'invitation.html'), html, 'utf8');
await writeFile(resolve(output, 'invitation.txt'), text, 'utf8');
console.log(`${production ? 'Production' : 'Clearly marked design preview'} exported: public/email/invitation.html (${Buffer.byteLength(html)} bytes). No email sent.`);
