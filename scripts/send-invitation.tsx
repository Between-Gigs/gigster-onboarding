import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderInvitation } from '../emails/render';
import Invitation from '../emails/Invitation';

for (const file of ['.env.local', '.env']) {
  try { process.loadEnvFile(file); } catch { /* Environment can be injected by the host. */ }
}

const argv = process.argv.slice(2);
function option(name: string) {
  const position = argv.indexOf(name);
  return position < 0 ? undefined : argv[position + 1];
}
function required(name: string, alias?: string) {
  const value = (process.env[name] || (alias && process.env[alias]))?.trim();
  if (!value) throw new Error(`Set ${name}${alias ? ` (or ${alias})` : ''} before sending.`);
  return value;
}
function secureUrl(value: string, name: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error(`${name} must be an absolute HTTPS URL.`); }
  if (url.protocol !== 'https:' || url.username || url.password || /(^|\.)localhost$|\.(invalid|example|test)$|^127\.|(^|\.)example\.(com|org|net)$/i.test(url.hostname)) {
    throw new Error(`${name} must be a publicly reachable HTTPS URL.`);
  }
  return url;
}
function emailAddress(value: string) {
  if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(value)) throw new Error('Provide one valid recipient with --to.');
  return value.toLowerCase();
}
const to = emailAddress(option('--to') || '');
const firstName = option('--name');
const send = argv.includes('--send');
const appBase = (process.env.PUBLIC_APP_URL || process.env.PUBLIC_SITE_URL || 'https://between-gigs.github.io/gigster-onboarding/').replace(/\/$/, '');
const inviteUrl = `${appBase}/#/welcome`;
const assetBase = (process.env.EMAIL_ASSET_BASE_URL || appBase).replace(/\/$/, '');
let artUrl: string | undefined;
try { await access(resolve('public/assets/craft-still-life.png')); artUrl = `${assetBase}/assets/craft-still-life.png`; } catch { /* Optional art. */ }
let logoUrl: string | undefined;
try { await access(resolve('public/assets/logo-email.png')); logoUrl = `${assetBase}/assets/logo-email.png`; } catch { /* Text logo fallback. */ }

const jobDirectory = fileURLToPath(new URL('../.email-jobs/', import.meta.url));
await mkdir(jobDirectory, { recursive: true });
await writeFile(resolve(jobDirectory, '.gitignore'), '*\n', 'utf8');

if (!send) {
  const content = await renderInvitation({
    ...Invitation.PreviewProps,
    inviteUrl, firstName, artUrl, logoUrl,
    physicalAddress: process.env.EMAIL_POSTAL_ADDRESS || process.env.PHYSICAL_ADDRESS || Invitation.PreviewProps.physicalAddress,
    previewOnly: true,
  });
  await writeFile(resolve(jobDirectory, 'invitation-preview.html'), content.html, 'utf8');
  await writeFile(resolve(jobDirectory, 'invitation-preview.txt'), content.text, 'utf8');
  console.log('Dry run only. Saved .email-jobs/invitation-preview.html and .txt. No email sent.');
  process.exit(0);
}

const campaign = option('--campaign');
if (!campaign || !/^[a-zA-Z0-9_-]{1,80}$/.test(campaign)) throw new Error('Sending requires a stable --campaign name (letters, numbers, _ and -). Reuse it when retrying.');
const apiKey = required('RESEND_API_KEY');
const from = required('EMAIL_FROM', 'INVITATION_FROM');
if (/[\r\n]/.test(from) || !/^[^<>\r\n]*<[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>$|^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(from)) throw new Error('EMAIL_FROM must be a valid address on a verified sending domain.');
const address = required('EMAIL_POSTAL_ADDRESS', 'PHYSICAL_ADDRESS');
if (address.length < 15 || /will appear|placeholder|address here|123 main/i.test(address)) throw new Error('EMAIL_POSTAL_ADDRESS must be the real Between Gigs mailing address.');
const unsubscribeSecret = required('UNSUBSCRIBE_SECRET');
if (Buffer.byteLength(unsubscribeSecret) < 32) throw new Error('UNSUBSCRIBE_SECRET must be at least 32 bytes and match the API host.');
const apiBase = secureUrl(required('API_PUBLIC_URL', 'PUBLIC_API_URL'), 'API_PUBLIC_URL').toString().replace(/\/$/, '');
secureUrl(inviteUrl, 'PUBLIC_APP_URL');
if (artUrl) secureUrl(artUrl, 'EMAIL_ASSET_BASE_URL');
if (logoUrl) secureUrl(logoUrl, 'EMAIL_ASSET_BASE_URL');

type EmailPayload = {
  from: string; to: string[]; subject: string; html: string; text: string;
  headers: Record<string, string>; tags: Array<{ name: string; value: string }>;
};
type EmailJob = {
  version: 1; campaign: string; recipient: string; createdAt: string;
  idempotencyKey: string; unsubscribeToken: string; payload: EmailPayload;
  attemptedAt?: string; lastAttemptAt?: string; emailId?: string; sentAt?: string;
};
const jobId = createHash('sha256').update(`${campaign}\n${to}`).digest('hex');
const jobFile = resolve(jobDirectory, `${jobId}.json`);
let job: EmailJob;
try {
  job = JSON.parse(await readFile(jobFile, 'utf8'));
  if (job.recipient !== to || job.campaign !== campaign || job.version !== 1) throw new Error('Saved email job does not match this request.');
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  const { createUnsubscribeToken } = await import('../server/unsubscribe.mjs');
  const unsubscribeToken = createUnsubscribeToken({ email: to, topic: 'gigster-invitations' }, unsubscribeSecret);
  const unsubscribeUrl = `${apiBase}/api/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
  const { html, text } = await renderInvitation({ inviteUrl, firstName, physicalAddress: address, unsubscribeUrl, artUrl, logoUrl });
  job = {
    version: 1, campaign, recipient: to, createdAt: new Date().toISOString(),
    idempotencyKey: `gigster-invitation/${jobId}`, unsubscribeToken,
    payload: {
      from, to: [to], subject: 'You’re invited: Your craft. More possibilities.', html, text,
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      tags: [{ name: 'flow', value: 'gigster-onboarding' }, { name: 'campaign', value: campaign }],
    },
  };
  await writeFile(jobFile, JSON.stringify(job, null, 2), { encoding: 'utf8', flag: 'wx' });
}
if (job.emailId) {
  console.log(`This campaign invitation was already sent. Resend email ID: ${job.emailId}. No duplicate sent.`);
  process.exit(0);
}
if (job.attemptedAt && Date.now() - Date.parse(job.attemptedAt) > 23 * 60 * 60 * 1000) {
  throw new Error('A previous send attempt is outside the safe retry window. Check delivery in Resend before creating a new campaign; this job will not be resent automatically.');
}

// The signed status route checks the same durable suppression list used by one-click unsubscribe.
const statusResponse = await fetch(`${apiBase}/api/unsubscribe/status?token=${encodeURIComponent(job.unsubscribeToken)}`, { signal: AbortSignal.timeout(15_000) });
if (!statusResponse.ok) throw new Error(`Unsubscribe service check failed (${statusResponse.status}); no email sent.`);
const suppression = await statusResponse.json() as { unsubscribed?: boolean };
if (typeof suppression.unsubscribed !== 'boolean') throw new Error('Unsubscribe service returned an invalid status; no email sent.');
if (suppression.unsubscribed) throw new Error('Recipient opted out of invitation emails. No email sent.');

// The one-off API does not automatically apply a contact's marketing preferences.
const contactResponse = await fetch(`https://api.resend.com/contacts/${encodeURIComponent(to)}`, {
  headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(15_000),
});
if (contactResponse.ok) {
  const contact = await contactResponse.json() as { unsubscribed?: boolean };
  if (typeof contact.unsubscribed !== 'boolean') throw new Error('Resend returned an invalid contact preference status. No email sent.');
  if (contact.unsubscribed) throw new Error('Recipient has unsubscribed in Resend. No email sent.');
} else if (contactResponse.status !== 404) {
  throw new Error(`Could not check Resend contact preferences (${contactResponse.status}). Use a key with contact-read permission. No email sent.`);
}

// Persist before the side effect so a network failure can safely reuse the identical payload.
job.attemptedAt ||= new Date().toISOString();
job.lastAttemptAt = new Date().toISOString();
await writeFile(jobFile, JSON.stringify(job, null, 2), 'utf8');
const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': job.idempotencyKey },
  body: JSON.stringify(job.payload), signal: AbortSignal.timeout(30_000),
});
const result = await response.json() as { id?: string; name?: string; message?: string };
if (!response.ok || !result.id) throw new Error(`Resend did not accept the invitation (${response.status}, ${result.name || 'unknown error'}). Retry this same campaign to retain duplicate protection.`);
job.emailId = result.id;
job.sentAt = new Date().toISOString();
await writeFile(jobFile, JSON.stringify(job, null, 2), 'utf8');
console.log(`Invitation accepted by Resend. Email ID: ${result.id}. Check delivery events before considering inbox delivery verified.`);
