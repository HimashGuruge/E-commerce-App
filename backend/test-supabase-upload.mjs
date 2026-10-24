// Live end-to-end test for Supabase upload (run: node test-supabase-upload.mjs)
const BASE = 'http://localhost:4000';

// 1x1 red PNG
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcS3AAAAEElEQVQIHXHCP40CAAwDIWSHvX0t0m0YkQAAAABJRU5ErkJggg==',
  'base64'
);
const fakeTxt = Buffer.from('this is not an image');

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

const post = async (parts) => {
  const { boundary, blob } = form(parts);
  const res = await fetch(`${BASE}/api/upload/media`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body: blob,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
};

const supa = await import('@supabase/supabase-js');
const dotenv = await import('dotenv');
dotenv.config();
const sb = supa.createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Test 1: valid PNG -> Supabase URL
const t1 = await post([{ name: 'file', file: 'test.png', type: 'image/png', data: png }]);
console.log('T1 upload PNG ->', t1.status, t1.json);
const url = t1.json?.url;
if (t1.status !== 200 || !String(url || '').startsWith('https://evzrgsujvgxhfrfjfhfu.supabase.co/')) {
  console.log('FAIL: expected 200 + Supabase public URL');
  process.exit(1);
}

// Test 2: fetch public URL, compare bytes
const got = await fetch(url);
const bytes = Buffer.from(await got.arrayBuffer());
console.log('T2 fetch URL ->', got.status, '| bytes match:', bytes.equals(png));
if (got.status !== 200 || !bytes.equals(png)) {
  console.log('FAIL: fetched content mismatch');
  process.exit(1);
}

// Test 3: wrong file type -> 400
const t3 = await post([{ name: 'file', file: 'notes.txt', type: 'text/plain', data: fakeTxt }]);
console.log('T3 txt file ->', t3.status, JSON.stringify(t3.json));
if (t3.status !== 400) {
  console.log('FAIL: expected 400 for disallowed file type');
  process.exit(1);
}

// Cleanup
const path = new URL(url).pathname.split('public/')[1];
const [bucket, ...rest] = path.split('/');
await sb.storage.from(bucket).remove([rest.join('/')]);
console.log('Cleanup done. ALL TESTS PASSED');
process.exit(0);
