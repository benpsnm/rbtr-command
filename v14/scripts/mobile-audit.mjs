#!/usr/bin/env node
// Mobile Responsive Audit Script
// Takes screenshots at iPhone and iPad sizes

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const viewports = [
  { name: 'iPhone', width: 375, height: 812 },
  { name: 'iPad', width: 1024, height: 1366 },
];

const modules = [
  { name: 'cockpit', url: 'http://localhost:3001/jarvis.html' },
  { name: 'psnm-customers', url: 'http://localhost:3001/jarvis.html#psnm.customers' },
  { name: 'rbtr-sponsors', url: 'http://localhost:3001/jarvis.html#rbtr.sponsors' },
];

const outputDir = '/tmp/jarvis-mobile-screenshots';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  for (const viewport of viewports) {
    console.log(`\nTesting ${viewport.name} (${viewport.width}x${viewport.height})`);
    await page.setViewport({ width: viewport.width, height: viewport.height });

    for (const module of modules) {
      console.log(`  - ${module.name}`);
      await page.goto(module.url, { waitUntil: 'networkidle2' });
      await page.waitForTimeout(1000); // Let animations settle

      const screenshotPath = path.join(
        outputDir,
        `${viewport.name.toLowerCase()}-${module.name}.png`
      );
      await page.screenshot({ path: screenshotPath, fullPage: true });
    }
  }

  await browser.close();
  console.log(`\n✅ Screenshots saved to ${outputDir}`);
})();
