import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, SignJWT } from 'jose';
import { clerkIssuerFromKey, createTokenVerifier, readConfig } from '../auth.mjs';

test('publishable key resolves only a valid HTTPS Clerk host and explicit origins are required', () => {
  const key = `pk_test_${Buffer.from('example.clerk.accounts.dev$').toString('base64')}`;
  assert.equal(clerkIssuerFromKey(key), 'https://example.clerk.accounts.dev');
  assert.equal(clerkIssuerFromKey('sk_test_do-not-use'), null);
  assert.equal(clerkIssuerFromKey(`pk_live_${Buffer.from('evil.test/path$').toString('base64')}`), null);
  assert.equal(readConfig({ CLERK_PUBLISHABLE_KEY: key }).authConfigured, false);
  assert.throws(() => readConfig({ FRONTEND_ORIGINS: 'https://example.com/path' }));
});

test('JWT verification rejects wrong issuer, wrong party, expiry, and pending registration', async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const config = { issuer: 'https://example.clerk.accounts.dev', origins: ['https://between-gigs.github.io'], authConfigured: true };
  const verify = createTokenVerifier(config, publicKey);
  const token = (claims = {}) => new SignJWT({ sid: 'sess_sample', azp: config.origins[0], ...claims })
    .setProtectedHeader({ alg: 'RS256' }).setIssuer(claims.iss ?? config.issuer).setSubject('user_sample')
    .setIssuedAt().setExpirationTime(claims.exp ?? '5m').sign(privateKey);
  assert.equal((await verify(await token())).userId, 'user_sample');
  await assert.rejects(() => verify('fake'), { status: 401 });
  await assert.rejects(async () => verify(await token({ iss: 'https://other.clerk.accounts.dev' })), { status: 401 });
  await assert.rejects(async () => verify(await token({ azp: 'https://attacker.example' })), { status: 401 });
  await assert.rejects(async () => verify(await token({ exp: 1 })), { status: 401 });
  await assert.rejects(async () => verify(await token({ sts: 'pending' })), { status: 401 });
  await assert.rejects(() => createTokenVerifier({ ...config, authConfigured: false }, publicKey)('anything'), { status: 503 });
});
