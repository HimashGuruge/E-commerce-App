// Temporary page error checker. Delete after use.
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:3001';
const API = 'http://localhost:4000';

async function getIdFromApi(path) {
  try {
    const res = await fetch(API + path);
    const j = await res.json();
    const list = j.products || j.data || j.categories || j;
    if (Array.isArray(list) && list.length) return list[0]._id || list[0].id;
    if (list && list._id) return list._id;
  } catch {}
  return null;
}

const catId = await getIdFromApi('/api/categories');
const slug = (catId + '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
const prodId = await getIdFromApi('/api/products');

const routes = [
  { path: '/', name: 'Home' },
  { path: '/shop', name: 'Shop' },
  { path: `/category/${slug}`, name: `Category (${slug})` },
  { path: `/productoverview/${prodId}`, name: `Product detail (${prodId})` },
  { path: '/viewcart', name: 'Cart' },
  { path: '/wishlist', name: 'Wishlist' },
  { path: '/orders', name: 'Orders (not logged in)' },
  { path: '/profile', name: 'Profile (not logged in)' },
  { path: '/payment', name: 'Payment' },
  { path: '/login', name: 'Login' },
  { path: '/signup', name: 'Signup' },
  { path: '/forgot-password', name: 'Forgot password' },
  { path: '/about', name: 'About' },
  { path: '/contact', name: 'Contact' },
  { path: '/help', name: 'Help' },
  { path: '/service', name: 'Service' },
  { path: '/returns', name: 'Returns' },
  { path: '/shipping', name: 'Shipping' },
  { path: '/shippinginfopage', name: 'Shipping info' },
  { path: '/privacy', name: 'Privacy' },
  { path: '/terms', name: 'Terms' },
  { path: '/become-seller', name: 'Become seller' },
  { path: '/email', name: 'Email page' },
  { path: '/admin/dashboard', name: 'Admin dashboard (not logged in)' },
];

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const report = [];

for (const r of routes) {
  const page = await ctx.newPage();
  const result = { name: r.name, path: r.path, status: 'ok', pageErrors: [], consoleErrors: [], failedRequests: [], finalUrl: '' };
  page.on('pageerror', (e) => result.pageErrors.push(String(e.message).slice(0, 300)));
  page.on('console', (m) => {
    if (m.type() === 'error') result.consoleErrors.push(m.text().slice(0, 300));
  });
  page.on('requestfailed', (req) => {
    result.failedRequests.push(`${req.method()} ${req.url().replace(BASE, '').slice(0, 80)} :: ${req.failure()?.errorText || 'failed'}`);
  });
  page.on('response', (res) => {
    if (res.status() >= 400) {
      const url = res.url();
      if (url.startsWith(API)) {
        result.failedRequests.push(`${res.status()} ${res.request().method()} ${url.replace(API, '')}`);
      }
    }
  });
  try {
    await page.goto(BASE + r.path, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(6000); // let API calls + renders finish
    result.finalUrl = page.url().replace(BASE, '');
    // ErrorBoundary check
    const bodyText = (await page.textContent('body')) || '';
    if (/something went wrong/i.test(bodyText)) {
      result.status = 'ERROR_BOUNDARY';
    }
  } catch (e) {
    result.status = 'NAV_ERROR';
    result.navError = String(e.message).slice(0, 200);
  }
  report.push(result);
  const bad = result.pageErrors.length || result.consoleErrors.length || result.failedRequests.length || result.status !== 'ok';
  console.log(`${bad ? 'XX' : 'OK'}  ${r.name}  -> ${result.status}`);
  if (result.pageErrors.length) console.log('   pageErrors: ' + result.pageErrors.join(' | '));
  if (result.failedRequests.length) console.log('   failedReqs: ' + result.failedRequests.join(' | '));
  if (result.consoleErrors.length) console.log('   consoleErr: ' + result.consoleErrors.join(' | '));
  await page.close();
}

await browser.close();
import fs from 'fs';
fs.writeFileSync(new URL('./page-report.json', import.meta.url), JSON.stringify(report, null, 2));
console.log('\nFull report saved to page-report.json');
