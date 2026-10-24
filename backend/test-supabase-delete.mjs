// Live test: images removed/changed in DB are also deleted from Supabase Storage.
// Run: node test-supabase-delete.mjs   (dev server must be running on :4000)
const BASE = 'http://localhost:4000';
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcS3AAAAEElEQVQIHXHCP40CAAwDIWSHvX0t0m0YkQAAAABJRU5ErkJggg==',
  'base64'
);

const form = (parts) => {
  const boundary = '----test' + Date.now();
  const body = [];
  for (const p of parts) {
    body.push(Buffer.from(`--${boundary}\r\ncontent-disposition: form-data; name="${p.name}"; filename="${p.file || ''}"\r\ncontent-type: ${p.type}\r\n\r\n`));
    body.push(p.data);
    body.push(Buffer.from('\r\n'));
  }
  body.push(Buffer.from(`--${boundary}--\r\n`));
  return { boundary, blob: Buffer.concat(body) };
};

const upload = async (file) => {
  const { boundary, blob } = form([{ name: 'file', file, type: 'image/png', data: png }]);
  const res = await fetch(`${BASE}/api/upload/media`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body: blob,
  });
  const json = await res.json().catch(() => ({}));
  if (res.status !== 200 || !json.url) throw new Error(`upload failed: ${res.status} ${JSON.stringify(json)}`);
  return json.url;
};

// Auth
const login = await fetch(`${BASE}/api/users/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'demo.seller@example.com', password: 'Seller123!' }),
});
const loginJson = await login.json();
const token = loginJson.token;
if (!token) throw new Error('login failed: ' + JSON.stringify(loginJson));

// Supabase client (to verify objects exist / are gone)
const supa = await import('@supabase/supabase-js');
const dotenv = await import('dotenv');
dotenv.config();
const sb = supa.createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const objPath = (url) => {
  const p = new URL(url).pathname.split('public/')[1];
  const [bucket, ...rest] = p.split('/');
  return { bucket, path: rest.join('/') };
};
// Poll the Supabase storage API (authoritative; public URLs can be CDN-cached).
// Supabase remove() can lag by a second or two, so wait up to ~5s for a
// deletion to become visible before declaring the file gone.
const exists = async (url) => {
  const { bucket, path } = objPath(url);
  const name = path.split('/').pop();
  for (let i = 0; i < 20; i++) {
    const { data } = await sb.storage.from(bucket).list('', { search: name.slice(0, 13) });
    if ((data || []).some((o) => o.name === name)) return true;
    // not found yet — if this is meant to be an "already deleted" check,
    // give the deletion time to propagate before re-checking
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
};
const j = (p, opts = {}) =>
  fetch(`${BASE}${p}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => ({})) }));

const cleanupFiles = [];
let failed = false;
const check = (label, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  [' + extra + ']' : ''}`);
  if (!ok) failed = true;
};

// ---- Setup: 4 images + 1 variant image, product with variant ----
const img1 = await upload('a.png'); cleanupFiles.push(img1);
const img2 = await upload('b.png'); cleanupFiles.push(img2);
const img3 = await upload('c.png'); cleanupFiles.push(img3);
const img4 = await upload('d.png'); cleanupFiles.push(img4);
const vimg = await upload('v.png'); cleanupFiles.push(vimg);

const created = await j('/api/products', { method: 'POST', body: {
  name: 'Supabase Delete Test', price: 10, category: 'Test', stock: 5,
  images: [img1, img2, img3],
}});
if (created.status !== 201) throw new Error('create product failed: ' + JSON.stringify(created.json));
const prodId = created.json.product._id;

const vcreated = await j(`/api/products/${prodId}/variants`, { method: 'POST', body: { variants: [{ attributes: { color: 'Red' }, price: 10, stock: 5, images: [vimg] }] } });
if (vcreated.status !== 201) throw new Error('variant create failed: ' + JSON.stringify(vcreated.json));
const variantId = vcreated.json.variants[0]._id;

// ---- Test 1: updateProduct removes an image from the list ----
await j(`/api/products/${prodId}`, { method: 'PATCH', body: { images: [img1, img3] } }); // img2 dropped
await new Promise((r) => setTimeout(r, 800));
check('T1 removed image gone from Supabase', !(await exists(img2)), img2);
check('T1 kept image still on Supabase', await exists(img1), img1);

// ---- Test 2: DELETE /api/upload/products/:id/images endpoint ----
await j(`/api/upload/products/${prodId}/images`, { method: 'DELETE', body: { imageUrlsToDelete: [img3] } });
await new Promise((r) => setTimeout(r, 800));
check('T2 image deleted via endpoint gone from Supabase', !(await exists(img3)), img3);
check('T2 remaining image still on Supabase', await exists(img1), img1);

// ---- Test 3: updateVariant removes its image ----
await j(`/api/products/variants/${variantId}`, { method: 'PATCH', body: { images: [] } });
await new Promise((r) => setTimeout(r, 800));
check('T3 variant image gone from Supabase', !(await exists(vimg)), vimg);

// ---- Test 4: product delete (with variant) removes remaining images ----
await j(`/api/products/${prodId}`, { method: 'DELETE' });
await new Promise((r) => setTimeout(r, 1200));
check('T4 product image gone after product delete', !(await exists(img1)), img1);

// ---- Cleanup leftover files (img4 was only uploaded, never used) ----
try {
  for (const url of [img4]) {
    const { bucket, path } = objPath(url);
    const { error } = await sb.storage.from(bucket).remove([path]);
    if (error) console.warn('cleanup warning:', error.message);
  }
} catch (e) { console.warn('cleanup warning:', e.message); }

console.log(failed ? 'RESULT: ONE OR MORE TESTS FAILED' : 'RESULT: ALL TESTS PASSED');
process.exit(failed ? 1 : 0);
