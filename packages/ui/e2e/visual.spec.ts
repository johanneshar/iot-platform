import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

interface IndexEntry {
  id: string;
  title: string;
  name: string;
  type: 'story' | 'docs';
}

const indexFile = fileURLToPath(new URL('../storybook-static/index.json', import.meta.url));
const index = JSON.parse(readFileSync(indexFile, 'utf8')) as {
  entries: Record<string, IndexEntry>;
};
const stories = Object.values(index.entries).filter((entry) => entry.type === 'story');

// Referenzbilder entstehen unter Linux in der CI (Schriftdarstellung). Lokal nur mit VISUAL=1,
// z. B. im Playwright-Docker-Image: docs/anleitungen/neue-komponente.md
test.skip(!process.env['CI'] && !process.env['VISUAL'], 'Screenshot-Vergleich läuft in der CI');

test.describe('Optik wie Mockup (abgenommen 2026-10-22)', () => {
  for (const story of stories) {
    test(`${story.title} › ${story.name}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=locale:de`);
      await page.locator('#storybook-root > *').first().waitFor();
      await page.evaluate(() => document.fonts.ready);

      const isView = story.title.startsWith('Ansichten/');
      const target = isView ? page : page.locator('#storybook-root');
      await expect(target).toHaveScreenshot(`${story.id}.png`, {
        animations: 'disabled',
        fullPage: isView,
      });
    });
  }
});
