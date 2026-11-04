import { ApiError } from './errors.mjs';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const TEXT_MAX = 5000;
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

function text(value, key, max = TEXT_MAX) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' || value.length > max) {
    throw new ApiError(422, `Check ${key}.`, { [key]: `Use text up to ${max} characters.` });
  }
  return value.trim();
}

function media(value, key) {
  const result = text(value, key, 2048);
  if (!result) return '';
  if (/^\/api\/uploads\/[a-f0-9-]{36}$/.test(result)) return result;
  try {
    const url = new URL(result);
    if (url.protocol === 'https:' && !url.username && !url.password) return result;
  } catch { /* A local upload reference is the only permitted relative URL. */ }
  throw new ApiError(422, `Check ${key}.`, { [key]: 'Upload an image or use a secure HTTPS image URL.' });
}

function stringList(value, key, max = 40, keepEmpty = false) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > max) throw new ApiError(422, `Check ${key}.`);
  const values = value.map((item) => text(item, key, 400));
  return keepEmpty ? values : values.filter(Boolean);
}

export function normalizeProfile(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ApiError(422, 'A profile is required.');
  const services = input.services ?? [];
  if (!Array.isArray(services) || services.length > 30) throw new ApiError(422, 'Use up to 30 services.');
  const result = {
    name: text(input.name, 'name', 160),
    craft: text(input.craft, 'craft', 240),
    photo: media(input.photo, 'photo'),
    cover: media(input.cover, 'cover'),
    credits: stringList(input.credits ?? (typeof input.credit === 'string' ? [input.credit] : input.credit), 'credits', 30, true),
    imdb: text(input.imdb, 'imdb', 1000),
    services: services.map((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new ApiError(422, 'Check your services.');
      return {
        id: text(item.id, `services.${index}.id`, 100) || `service-${index + 1}`,
        title: text(item.title, `services.${index}.title`, 160),
        description: text(item.description, `services.${index}.description`, 2000),
        image: media(item.image, `services.${index}.image`),
        rate: text(typeof item.rate === 'number' ? String(item.rate) : item.rate, `services.${index}.rate`, 100),
      };
    }),
    about: text(input.about, 'about'),
    rate: text(typeof input.rate === 'number' ? String(input.rate) : input.rate, 'rate', 100),
    location: text(input.location, 'location', 240),
    availability: input.availability === true,
    skills: stringList(input.skills, 'skills'),
  };
  // Preserve questionnaire answers without accepting arbitrary large objects or authority fields.
  for (const key of ['years', 'zip', 'areas', 'travel', 'availabilityNotes', 'languages', 'insurance', 'tools', 'transport', 'workMode', 'otherService']) {
    if (own(input, key)) result[key] = Array.isArray(input[key]) ? stringList(input[key], key) : text(typeof input[key] === 'number' ? String(input[key]) : input[key], key, 2000);
  }
  return result;
}

export function validateSubmission(profile) {
  const fields = {};
  if (!profile.name) fields.name = 'Add your full name.';
  if (!profile.craft) fields.craft = 'Add your craft or department.';
  if (!profile.credits.some((credit) => credit.trim())) fields.credits = 'Add at least one credit you are proud of.';
  if (!profile.services.some((service) => service.title.trim())) fields.services = 'Add at least one service you would like to offer.';
  if (profile.imdb) {
    try {
      const url = new URL(profile.imdb);
      if (url.protocol !== 'https:' || !['imdb.com', 'www.imdb.com'].includes(url.hostname) || !/^\/name\/nm\d+\/?$/.test(url.pathname)) throw new Error();
    } catch { fields.imdb = 'Use an IMDb name-profile URL, such as https://www.imdb.com/name/nm1234567/.'; }
  }
  for (const [key, rate] of [['rate', profile.rate], ...profile.services.map((service, index) => [`services.${index}.rate`, service.rate])]) {
    if (rate !== '' && (!Number.isFinite(Number(rate)) || Number(rate) < 0)) fields[key] = 'Use a starting rate of zero or more.';
  }
  if (Object.keys(fields).length) throw new ApiError(422, 'A few details are needed before review.', fields);
}

export function profileUploadIds(profile) {
  return [profile.photo, profile.cover, ...profile.services.map((service) => service.image)]
    .filter((url) => url.startsWith('/api/uploads/'))
    .map((url) => url.slice('/api/uploads/'.length));
}

export function parseImageDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') throw new ApiError(422, 'Choose a JPEG, PNG, or WebP image.');
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]*={0,2})$/.exec(dataUrl);
  if (!match || match[2].length % 4 !== 0) throw new ApiError(422, 'Choose a JPEG, PNG, or WebP image.');
  if (match[2].length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) throw new ApiError(413, 'Choose an image smaller than 5 MB.');
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new ApiError(413, 'Choose an image smaller than 5 MB.');
  const type = match[1];
  const valid = type === 'image/jpeg'
    ? bytes.length >= 12 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9
    : type === 'image/png'
      ? bytes.length >= 45 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && bytes.toString('ascii', 12, 16) === 'IHDR' && bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0 && bytes.toString('ascii', bytes.length - 8, bytes.length - 4) === 'IEND'
      : bytes.length >= 20 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' && bytes.readUInt32LE(4) + 8 === bytes.length;
  if (!valid) throw new ApiError(422, 'The image file does not match its type. Choose another image.');
  return { bytes, contentType: type };
}
