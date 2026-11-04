import express from 'express';
import cors from 'cors';
import { ApiError } from './errors.mjs';
import { createTokenVerifier } from './auth.mjs';
import { parseImageDataUrl } from './validation.mjs';
import { unsubscribeConfigured, unsubscribePage, verifyUnsubscribeToken } from './unsubscribe.mjs';

export function createApp({ store, config, verifyToken = createTokenVerifier(config) }) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'no-referrer');
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use(cors({
    origin(origin, callback) {
      if (!origin || config.origins.includes(origin)) callback(null, true);
      else callback(new ApiError(403, 'This origin is not allowed.'));
    },
    methods: ['GET', 'PUT', 'POST', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 600,
  }));
  app.use(express.json({ limit: '7mb' }));
  app.use(express.urlencoded({ extended: false, limit: '4kb' }));

  app.get('/api/health', (req, res) => res.json({
    status: config.authConfigured ? 'ready' : 'configuration_required',
    authentication: config.authConfigured,
    storage: true,
    unsubscribe: unsubscribeConfigured(config.unsubscribeSecret),
    reviewQueue: config.reviewerIds.size > 0,
  }));

  const preference = (req) => verifyUnsubscribeToken(req.query.token, config.unsubscribeSecret);
  const preferenceHeaders = (res) => {
    res.type('html');
    res.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
  };
  app.get('/api/unsubscribe/status', (req, res) => {
    const { email, topic } = preference(req);
    res.json({ unsubscribed: store.isUnsubscribed(email, topic) });
  });
  app.get('/api/unsubscribe', (req, res) => {
    const { email, topic } = preference(req);
    preferenceHeaders(res);
    res.send(unsubscribePage({ token: req.query.token, unsubscribed: store.isUnsubscribed(email, topic) }));
  });
  app.post('/api/unsubscribe', (req, res) => {
    const { email, topic } = preference(req);
    if (req.body?.['List-Unsubscribe'] !== 'One-Click') throw new ApiError(422, 'Confirm your email preference using the unsubscribe button.');
    store.unsubscribe(email, topic);
    if (req.accepts(['html', 'json']) === 'html') {
      preferenceHeaders(res);
      res.send(unsubscribePage({ token: req.query.token, complete: true }));
    } else res.json({ unsubscribed: true });
  });

  app.use('/api', async (req, res, next) => {
    try {
      const authorization = req.get('Authorization') ?? '';
      const token = /^Bearer ([^\s]+)$/i.exec(authorization)?.[1];
      if (!token) throw new ApiError(401, 'Sign in to continue.');
      if (!config.authConfigured) throw new ApiError(503, 'Account connection is not configured yet.');
      req.identity = await verifyToken(token);
      next();
    } catch (error) { next(error); }
  });
  app.get('/api/profile', (req, res) => res.json(store.getProfile(req.identity.userId)));
  app.put('/api/profile', (req, res) => {
    const wrapped = req.body && Object.prototype.hasOwnProperty.call(req.body, 'profile');
    const input = wrapped ? req.body.profile : req.body;
    res.json(store.saveProfile(req.identity.userId, input, wrapped ? req.body.revision : undefined));
  });
  app.post('/api/submit', (req, res) => {
    res.json(store.submitProfile(req.identity.userId, req.body?.profile, req.body?.revision));
  });
  app.post('/api/uploads', (req, res) => {
    const image = parseImageDataUrl(req.body?.dataUrl);
    res.status(201).json(store.saveUpload(req.identity.userId, image));
  });
  app.get('/api/uploads/:id', (req, res) => {
    const upload = store.getUpload(req.identity.userId, req.params.id);
    if (!upload) throw new ApiError(404, 'This image is not available.');
    res.set('Content-Type', upload.content_type);
    res.set('Content-Disposition', 'inline');
    res.send(Buffer.from(upload.bytes));
  });
  app.get('/api/admin/submissions', (req, res) => {
    if (!config.reviewerIds.has(req.identity.userId)) throw new ApiError(403, 'This account cannot access the review queue.');
    res.json({ submissions: store.listSubmissions(100) });
  });
  app.use((req, res) => res.status(404).json({ error: 'This page was not found.' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.status ?? (error.type === 'entity.too.large' ? 413 : 500);
    const safeStatus = Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
    res.status(safeStatus).json({
      error: safeStatus === 500 ? 'We could not complete that request. Try again.' : error.type === 'entity.too.large' ? 'Choose an image smaller than 5 MB.' : error.message,
      ...(error.fields ? { fields: error.fields } : {}),
    });
  });
  return app;
}
