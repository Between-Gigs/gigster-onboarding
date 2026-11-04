import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../app.mjs';
import { openStore } from '../store.mjs';
import { createUnsubscribeToken, verifyUnsubscribeToken } from '../unsubscribe.mjs';
import { createTokenVerifier } from '../auth.mjs';
import { generateKeyPair, SignJWT } from 'jose';

async function fixture(run, overrides = {}, verifyToken) {
  const store = openStore(':memory:');
  const config = { issuer: null, origins: ['https://between-gigs.github.io'], authConfigured: false, unsubscribeSecret: 'test-only-secret-'.repeat(4), reviewerIds: new Set(), ...overrides };
  const app = createApp({ store, config, verifyToken });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  try { await run({ store, config, url }); }
  finally { await new Promise((resolve) => server.close(resolve)); store.close(); }
}

test('production API rejects anonymous and unconfigured requests without creating data', async () => {
  await fixture(async ({ url, store }) => {
    const anonymous = await fetch(`${url}/api/profile`);
    assert.equal(anonymous.status, 401);
    const unconfigured = await fetch(`${url}/api/profile`, { headers: { Authorization: 'Bearer dummy' } });
    assert.equal(unconfigured.status, 503);
    const upload = await fetch(`${url}/api/uploads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataUrl: 'x' }) });
    assert.equal(upload.status, 401);
    assert.equal(store.listSubmissions().length, 0);
    const health = await (await fetch(`${url}/api/health`)).json();
    assert.equal(health.authentication, false);
    assert.equal(health.status, 'configuration_required');
  });
});

test('signed sessions can edit only their own profile and cannot read another owner’s upload or review queue', async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const overrides = { issuer: 'https://example.clerk.accounts.dev', origins: ['https://between-gigs.github.io'], authConfigured: true };
  const verifyToken = createTokenVerifier(overrides, publicKey);
  const tokenFor = (userId) => new SignJWT({ sid: 'sess_sample', azp: overrides.origins[0] }).setProtectedHeader({ alg: 'RS256' })
    .setIssuer(overrides.issuer).setSubject(userId).setIssuedAt().setExpirationTime('5m').sign(privateKey);
  const a = await tokenFor('user_a');
  const b = await tokenFor('user_b');
  await fixture(async ({ url }) => {
    const call = (path, token, options = {}) => fetch(`${url}${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers } });
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+i6e8AAAAASUVORK5CYII=';
    const uploadResponse = await call('/api/uploads', a, { method: 'POST', body: JSON.stringify({ dataUrl: png }) });
    assert.equal(uploadResponse.status, 201);
    const upload = await uploadResponse.json();
    const saved = await call('/api/profile', a, { method: 'PUT', body: JSON.stringify({ name: 'Sample A', craft: 'Costume', credits: ['Sample credit'], services: [{ title: 'Alterations' }], photo: upload.url, status: 'approved' }) });
    assert.equal(saved.status, 200);
    assert.equal((await saved.json()).profile.status, 'draft');
    assert.equal((await (await call('/api/profile', b)).json()).profile, null);
    assert.equal((await call(upload.url, b)).status, 404);
    assert.equal((await call(upload.url, a)).status, 200);
    assert.equal((await call('/api/admin/submissions', b)).status, 403);
    const forged = await call('/api/profile', b, { method: 'PUT', body: JSON.stringify({ name: 'Sample B', photo: upload.url }) });
    assert.equal(forged.status, 422);
    const submission = await call('/api/submit', a, { method: 'POST', body: '{}' });
    assert.equal(submission.status, 200);
    assert.ok((await submission.json()).submission.id);
  }, overrides, verifyToken);
});

test('unsubscribe GET never changes preferences; signed one-click POST persists and tampering fails', async () => {
  await fixture(async ({ store, config, url }) => {
    const recipient = { email: 'sample@example.test', topic: 'gigster-invitations' };
    const token = createUnsubscribeToken(recipient, config.unsubscribeSecret);
    assert.deepEqual(verifyUnsubscribeToken(token, config.unsubscribeSecret), recipient);
    assert.equal(token.includes('sample'), false);
    const endpoint = `${url}/api/unsubscribe?token=${encodeURIComponent(token)}`;
    const page = await fetch(endpoint);
    assert.equal(page.status, 200);
    assert.equal(store.isUnsubscribed(recipient.email), false);
    const before = await (await fetch(`${url}/api/unsubscribe/status?token=${encodeURIComponent(token)}`)).json();
    assert.equal(before.unsubscribed, false);
    const withoutConsent = await fetch(endpoint, { method: 'POST' });
    assert.equal(withoutConsent.status, 422);
    assert.equal(store.isUnsubscribed(recipient.email), false);
    const unsubscribe = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: 'List-Unsubscribe=One-Click' });
    assert.equal(unsubscribe.status, 200);
    assert.equal(store.isUnsubscribed(recipient.email), true);
    const after = await (await fetch(`${url}/api/unsubscribe/status?token=${encodeURIComponent(token)}`)).json();
    assert.equal(after.unsubscribed, true);
    const invalid = `${token.slice(0, -4)}AAAA`;
    assert.equal((await fetch(`${url}/api/unsubscribe?token=${invalid}`)).status, 400);
    assert.throws(() => verifyUnsubscribeToken(token, 'different-test-secret-'.repeat(3)), { status: 400 });
  });
});
