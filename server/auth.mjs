import { createRemoteJWKSet, jwtVerify } from 'jose';
import { ApiError } from './errors.mjs';

export function clerkIssuerFromKey(key = '') {
  if (!/^pk_(test|live)_/.test(key)) return null;
  const host = Buffer.from(key.replace(/^pk_(test|live)_/, ''), 'base64').toString('utf8').replace(/\$$/, '');
  if (!/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(host) || host.includes('..')) return null;
  return `https://${host}`;
}

export function readConfig(env = process.env) {
  const origins = (env.FRONTEND_ORIGINS ?? '').split(',').map((item) => item.trim()).filter(Boolean);
  for (const origin of origins) {
    const parsed = new URL(origin);
    if (parsed.origin !== origin || !['https:', 'http:'].includes(parsed.protocol) || (parsed.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname))) {
      throw new Error('FRONTEND_ORIGINS must contain exact HTTPS origins (HTTP localhost is allowed for development).');
    }
  }
  const issuer = clerkIssuerFromKey(env.CLERK_PUBLISHABLE_KEY ?? env.VITE_CLERK_PUBLISHABLE_KEY ?? '');
  return {
    issuer,
    origins,
    authConfigured: Boolean(issuer && origins.length),
    unsubscribeSecret: env.UNSUBSCRIBE_SECRET ?? '',
    reviewerIds: new Set((env.REVIEWER_CLERK_IDS ?? '').split(',').map((item) => item.trim()).filter(Boolean)),
    port: Number(env.PORT ?? 8787),
    host: env.HOST ?? '127.0.0.1',
    databasePath: env.DATABASE_PATH ?? './data/onboarding.sqlite',
  };
}

export function createTokenVerifier(config, testKey) {
  const jwks = testKey ?? (config.issuer ? createRemoteJWKSet(new URL(`${config.issuer}/.well-known/jwks.json`), { timeoutDuration: 5000, cooldownDuration: 30000 }) : null);
  return async (token) => {
    if (!config.authConfigured || !jwks) throw new ApiError(503, 'Account connection is not configured yet.');
    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer: config.issuer,
        algorithms: ['RS256'],
        requiredClaims: ['sub', 'exp', 'iat', 'sid', 'azp'],
        clockTolerance: 5,
      });
      if (typeof payload.sub !== 'string' || !payload.sub.startsWith('user_') || !config.origins.includes(payload.azp) || payload.sts === 'pending') {
        throw new Error('Invalid session claims.');
      }
      return { userId: payload.sub, sessionId: payload.sid };
    } catch {
      throw new ApiError(401, 'Your session could not be verified. Sign in again.');
    }
  };
}
