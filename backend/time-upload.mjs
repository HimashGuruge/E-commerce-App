// Time the real /api/upload/media round trip for several file sizes
const BASE = 'http://localhost:4000';

const form = (parts) => {
  const boundary = '----t' + Date.now();
  const body = [];
  for (const p of parts) {
    body.push(Buffer.from(`--${boundary}\r\ncontent-disposition: form-data; name="${p.name}"; filename="${p.file}"\r\ncontent-type: ${p.type}\r\n\r\n`));
    body.push(p.data);
    body.push(Buffer.from('\r\n'));
  }
  body.push(Buffer.from(`--${boundary}--\r\n`));
  return { boundary, blob: Buffer.concat(body) };
};

// Build an image-ish buffer of N KB (repeat a small PNG-ish block)
const block = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcS3AAAAEElEQVQIHXHCP40CAAwDIWSHvX0t0m0YkQAAAABJRU5ErkJgg==',
  'base64'
);
const makeBlob = (kb) => {
  const total = kb * 1024;
  const n = Math.ceil(total / block.length);
  const buf = Buffer.concat(Array.from({ length: n }, () => block));
  return buf.subarray(0, total);
};

for (const kb of [16, 512, 2048]) {
  const data = makeBlob(kb);
  const { boundary, blob } = form([{ name: 'file', file: `t${kb}.png`, type: 'image/png', data }]);
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE}/api/upload/media`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body: blob,
    });
    const j = await res.json().catch(() => ({}));
    const ms = Date.now() - t0;
    console.log(`${String(kb).padStart(5)} KB → ${ms} ms  status=${res.status} ${j.success ? 'ok' : 'FAIL ' + j.error}`);
    if (j.url) console.log('       url:', j.url);
  } catch (e) {
    console.log(`${kb} KB → ERROR ${Date.now() - t0} ms: ${e.message}`);
  }
}
