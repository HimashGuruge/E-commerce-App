import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage();
await page.goto('http://localhost:3001/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(3000);
console.log('title:', await page.title());
console.log('ok');
await browser.close();
