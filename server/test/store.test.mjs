import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore } from '../store.mjs';
import { parseImageDataUrl } from '../validation.mjs';

const profile = {
  name: 'A sample professional', craft: 'Costume', credits: ['Sample production · Costume assistant'],
  services: [{ id: 'one', title: 'Alterations', description: '', image: '', rate: '50' }],
  photo: '', cover: '', imdb: '', about: 'A short introduction.', rate: '50', location: 'Los Angeles', availability: true, skills: ['Costume'],
};
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+i6e8AAAAASUVORK5CYII=';

test('drafts and images are isolated by owner, including guessed upload references', () => {
  const store = openStore(':memory:');
  try {
    const upload = store.saveUpload('user_a', parseImageDataUrl(png));
    store.saveProfile('user_a', { ...profile, photo: upload.url, status: 'approved', submittedAt: 'forged' });
    assert.equal(store.getProfile('user_b').profile, null);
    assert.equal(store.getUpload('user_b', upload.id), undefined);
    assert.ok(store.getUpload('user_a', upload.id));
    assert.throws(() => store.saveProfile('user_b', { ...profile, photo: upload.url }), { status: 422 });
    assert.equal(store.getProfile('user_a').profile.status, 'draft');
    assert.equal(store.getProfile('user_a').profile.submittedAt, null);
  } finally { store.close(); }
});

test('submission snapshot survives later edits, retries, and database reopen', () => {
  const dir = mkdtempSync(join(tmpdir(), 'between-gigs-store-'));
  const databasePath = join(dir, 'db.sqlite');
  let store = openStore(databasePath);
  try {
    store.saveProfile('user_a', profile, 0);
    const first = store.submitProfile('user_a');
    assert.equal(first.profile.status, 'needs_review');
    assert.match(first.submission.submittedAt, /^\d{4}-/);
    const retry = store.submitProfile('user_a');
    assert.equal(retry.submission.id, first.submission.id);
    store.saveProfile('user_a', { ...profile, about: 'A newer draft.', status: 'approved', submittedAt: 'fake' });
    assert.equal(store.getProfile('user_a').changesPending, true);
    assert.equal(store.getProfile('user_a').submission.id, first.submission.id);
    assert.equal(store.listSubmissions()[0].profile.about, profile.about);
    store.close();
    store = openStore(databasePath);
    assert.equal(store.getProfile('user_a').profile.about, 'A newer draft.');
    assert.equal(store.getProfile('user_a').changesPending, true);
    const second = store.submitProfile('user_a');
    assert.notEqual(second.submission.id, first.submission.id);
    assert.equal(second.changesPending, false);
    assert.equal(store.listSubmissions().length, 2);
    assert.equal(store.listSubmissions().find((row) => row.id === first.submission.id).profile.about, profile.about);
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('failed submission rolls back its proposed draft; stale revision cannot overwrite a newer save', () => {
  const store = openStore(':memory:');
  try {
    store.saveProfile('user_a', profile, 0);
    assert.throws(() => store.saveProfile('user_a', { ...profile, name: 'stale' }, 0), { status: 409 });
    assert.throws(() => store.submitProfile('user_a', { ...profile, name: '', credits: [], services: [] }), { status: 422 });
    assert.equal(store.getProfile('user_a').profile.name, profile.name);
    assert.equal(store.getProfile('user_a').revision, 1);
    assert.equal(store.listSubmissions().length, 0);
  } finally { store.close(); }
});

test('image parsing rejects disguised markup, mismatched MIME, and oversized bytes', () => {
  assert.throws(() => parseImageDataUrl('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='), { status: 422 });
  assert.throws(() => parseImageDataUrl('data:image/png;base64,PGh0bWw+'), { status: 422 });
  assert.throws(() => parseImageDataUrl(png.replace('image/png', 'image/jpeg')), { status: 422 });
  assert.throws(() => parseImageDataUrl(`data:image/jpeg;base64,${Buffer.alloc(5 * 1024 * 1024 + 1).toString('base64')}`), { status: 413 });
  assert.equal(parseImageDataUrl(png).contentType, 'image/png');
});

test('autosave preserves unfinished fields and empty credit rows; submission validates them', () => {
  const store = openStore(':memory:');
  try {
    const saved = store.saveProfile('user_a', { ...profile, credits: ['', 'In progress'], imdb: 'https://www.imdb.com/name/', rate: '-1' });
    assert.deepEqual(saved.profile.credits, ['', 'In progress']);
    assert.equal(saved.profile.imdb, 'https://www.imdb.com/name/');
    assert.throws(() => store.submitProfile('user_a'), (error) => Boolean(error.status === 422 && error.fields.imdb && error.fields.rate));
    assert.equal(store.getProfile('user_a').revision, saved.revision);
    assert.equal(store.listSubmissions().length, 0);
  } finally { store.close(); }
});
