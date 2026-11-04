import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { ApiError } from './errors.mjs';

const TOPIC = 'gigster-invitations';
export const unsubscribeConfigured = (secret) => typeof secret === 'string' && Buffer.byteLength(secret) >= 32;
const encryptionKey = (secret) => createHash('sha256').update('between-gigs/unsubscribe/encryption/v1:').update(secret).digest();
const signature = (content, secret) => createHmac('sha256', secret).update('between-gigs/unsubscribe/signature/v1:').update(content).digest();

function requireSecret(secret) {
  if (!unsubscribeConfigured(secret)) throw new ApiError(503, 'Email preferences are not configured yet.');
}

function normalizeRecipient(input) {
  const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
  const topic = input?.topic ?? TOPIC;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || topic !== TOPIC) throw new ApiError(422, 'The invitation recipient is invalid.');
  return { email, topic };
}

// Email addresses are encrypted before signing, so URLs do not disclose the recipient.
// Keep the same generated token when retrying an invitation send.
export function createUnsubscribeToken(input, secret) {
  requireSecret(secret);
  const recipient = normalizeRecipient(input);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(recipient), 'utf8'), cipher.final()]);
  const content = ['v1', iv.toString('base64url'), ciphertext.toString('base64url'), cipher.getAuthTag().toString('base64url')].join('.');
  return `${content}.${signature(content, secret).toString('base64url')}`;
}

export function verifyUnsubscribeToken(token, secret) {
  requireSecret(secret);
  try {
    if (typeof token !== 'string' || token.length > 1500 || !/^[A-Za-z0-9_.-]+$/.test(token)) throw new Error();
    const parts = token.split('.');
    if (parts.length !== 5 || parts[0] !== 'v1') throw new Error();
    const content = parts.slice(0, 4).join('.');
    const suppliedSignature = Buffer.from(parts[4], 'base64url');
    const expectedSignature = signature(content, secret);
    if (suppliedSignature.length !== expectedSignature.length || !timingSafeEqual(suppliedSignature, expectedSignature)) throw new Error();
    const iv = Buffer.from(parts[1], 'base64url');
    const tag = Buffer.from(parts[3], 'base64url');
    if (iv.length !== 12 || tag.length !== 16) throw new Error();
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(secret), iv);
    decipher.setAuthTag(tag);
    const cleartext = Buffer.concat([decipher.update(Buffer.from(parts[2], 'base64url')), decipher.final()]).toString('utf8');
    return normalizeRecipient(JSON.parse(cleartext));
  } catch { throw new ApiError(400, 'This email preferences link is invalid.'); }
}

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function unsubscribePage({ token, unsubscribed = false, complete = false }) {
  const title = complete || unsubscribed ? 'You’re unsubscribed.' : 'A little less in your inbox.';
  const detail = complete || unsubscribed ? 'You won’t receive any more Gigster invitation emails. Your account and profile are still yours.' : 'Stop receiving Gigster invitation emails from Between Gigs. This won’t change your account or profile.';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Email preferences · Between Gigs</title><style>html{color-scheme:light dark}body{margin:0;padding:48px 24px;background:#f7f3eb;color:#073c2e;font:17px/1.6 system-ui,sans-serif}main{max-width:540px;margin:12vh auto}p.brand{font-weight:750;letter-spacing:-.03em}h1{font:48px/1.08 Georgia,serif;letter-spacing:-.04em}button{font:inherit;font-weight:650;border:0;border-radius:8px;padding:14px 22px;color:#fff;background:#073c2e;cursor:pointer}button:focus-visible{outline:3px solid #00995d;outline-offset:4px}@media(prefers-color-scheme:dark){body{background:#09231c;color:#f7f3eb}button{background:#b9e5c8;color:#09231c}}</style></head><body><main><p class="brand">BG / Between Gigs</p><h1>${title}</h1><p>${detail}</p>${complete || unsubscribed ? '' : `<form method="post" action="/api/unsubscribe?token=${escapeHtml(token)}"><input type="hidden" name="List-Unsubscribe" value="One-Click"><button type="submit">Unsubscribe from invitations</button></form>`}</main></body></html>`;
}
