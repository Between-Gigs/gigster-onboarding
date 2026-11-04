import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { ApiError } from './errors.mjs';
import { normalizeProfile, profileUploadIds, validateSubmission } from './validation.mjs';

const hash = (profile) => createHash('sha256').update(JSON.stringify(profile)).digest('hex');

export function openStore(filename) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS profiles (
      user_id TEXT PRIMARY KEY, draft_json TEXT NOT NULL, revision INTEGER NOT NULL,
      updated_at TEXT NOT NULL, submission_id TEXT, submitted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, content_type TEXT NOT NULL,
      bytes BLOB NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, snapshot_json TEXT NOT NULL,
      content_hash TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS unsubscribes (
      email TEXT NOT NULL, topic TEXT NOT NULL, created_at TEXT NOT NULL,
      PRIMARY KEY(email, topic)
    );
    CREATE INDEX IF NOT EXISTS submissions_by_user ON submissions(user_id, created_at);
    CREATE INDEX IF NOT EXISTS uploads_by_user ON uploads(user_id);
  `);

  const getRow = (userId) => db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId);
  const assertMediaOwnership = (userId, profile) => {
    for (const id of profileUploadIds(profile)) {
      if (!db.prepare('SELECT id FROM uploads WHERE id = ? AND user_id = ?').get(id, userId)) {
        throw new ApiError(422, 'An image is no longer available. Upload it again.');
      }
    }
  };

  function getProfile(userId) {
    const row = getRow(userId);
    if (!row) return { profile: null, revision: 0, savedAt: null, submission: null, changesPending: false };
    const draft = JSON.parse(row.draft_json);
    const submission = row.submission_id ? db.prepare('SELECT id, created_at, content_hash FROM submissions WHERE id = ? AND user_id = ?').get(row.submission_id, userId) : null;
    return {
      profile: { ...draft, status: submission ? 'needs_review' : 'draft', submittedAt: row.submitted_at },
      revision: row.revision,
      savedAt: row.updated_at,
      submission: submission ? { id: submission.id, submittedAt: submission.created_at } : null,
      changesPending: Boolean(submission && submission.content_hash !== hash(draft)),
    };
  }

  function writeProfile(userId, input, expectedRevision) {
    const draft = normalizeProfile(input);
    assertMediaOwnership(userId, draft);
    const previous = getRow(userId);
    if (expectedRevision !== undefined && (!Number.isInteger(expectedRevision) || expectedRevision !== (previous?.revision ?? 0))) {
      throw new ApiError(409, 'This profile was updated elsewhere. Reload it before saving again.');
    }
    const revision = (previous?.revision ?? 0) + 1;
    const timestamp = new Date().toISOString();
    db.prepare(`INSERT INTO profiles (user_id, draft_json, revision, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET draft_json = excluded.draft_json, revision = excluded.revision, updated_at = excluded.updated_at`)
      .run(userId, JSON.stringify(draft), revision, timestamp);
  }

  function saveProfile(userId, input, expectedRevision) {
    db.exec('BEGIN IMMEDIATE');
    try { writeProfile(userId, input, expectedRevision); db.exec('COMMIT'); }
    catch (error) { db.exec('ROLLBACK'); throw error; }
    return getProfile(userId);
  }

  function submitProfile(userId, input, expectedRevision) {
    db.exec('BEGIN IMMEDIATE');
    try {
      if (input !== undefined) writeProfile(userId, input, expectedRevision);
      const row = getRow(userId);
      if (!row) throw new ApiError(422, 'Save your profile before submitting it.');
      if (input === undefined && expectedRevision !== undefined && row.revision !== expectedRevision) throw new ApiError(409, 'Your profile has changed. Reload it before submitting.');
      const draft = JSON.parse(row.draft_json);
      validateSubmission(draft);
      assertMediaOwnership(userId, draft);
      const contentHash = hash(draft);
      let submitted = row.submission_id
        ? db.prepare('SELECT id, created_at FROM submissions WHERE id = ? AND user_id = ? AND content_hash = ?').get(row.submission_id, userId, contentHash)
        : null;
      if (!submitted) {
        submitted = { id: randomUUID(), created_at: new Date().toISOString() };
        db.prepare('INSERT INTO submissions (id, user_id, snapshot_json, content_hash, created_at) VALUES (?, ?, ?, ?, ?)')
          .run(submitted.id, userId, JSON.stringify(draft), contentHash, submitted.created_at);
      }
      db.prepare('UPDATE profiles SET submission_id = ?, submitted_at = ? WHERE user_id = ?').run(submitted.id, submitted.created_at, userId);
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    return getProfile(userId);
  }

  function saveUpload(userId, { bytes, contentType }) {
    const count = db.prepare('SELECT COUNT(*) AS count FROM uploads WHERE user_id = ?').get(userId).count;
    if (count >= 100) throw new ApiError(422, 'Your image library is full. Contact the team for help.');
    const id = randomUUID();
    db.prepare('INSERT INTO uploads (id, user_id, content_type, bytes, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, userId, contentType, bytes, new Date().toISOString());
    return { id, url: `/api/uploads/${id}`, contentType, size: bytes.length };
  }

  return {
    getProfile, saveProfile, submitProfile, saveUpload,
    getUpload(userId, id) { return db.prepare('SELECT bytes, content_type FROM uploads WHERE id = ? AND user_id = ?').get(id, userId); },
    listSubmissions(limit = 100) {
      return db.prepare('SELECT id, user_id, snapshot_json, created_at FROM submissions ORDER BY created_at DESC LIMIT ?').all(limit)
        .map((row) => ({ id: row.id, userId: row.user_id, profile: JSON.parse(row.snapshot_json), submittedAt: row.created_at }));
    },
    unsubscribe(email, topic = 'gigster-invitations') {
      db.prepare('INSERT OR IGNORE INTO unsubscribes (email, topic, created_at) VALUES (?, ?, ?)').run(email.toLowerCase(), topic, new Date().toISOString());
    },
    isUnsubscribed(email, topic = 'gigster-invitations') { return Boolean(db.prepare('SELECT email FROM unsubscribes WHERE email = ? AND topic = ?').get(email.toLowerCase(), topic)); },
    close() { db.close(); },
  };
}
