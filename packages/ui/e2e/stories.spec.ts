import AxeBuilder from '@axe-core/playwright';
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

// Einzelne Komponenten stehen nicht in einer vollständigen Seite; diese Seitenregeln
// gelten erst für die Gesamtansichten.
const PAGE_RULES = ['region', 'landmark-one-main', 'page-has-heading-one'];

for (const locale of ['de', 'en'] as const) {
  test.describe(`Barrierefreiheit (${locale})`, () => {
    for (const story of stories) {
      test(`${story.title} › ${story.name}`, async ({ page }) => {
        await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=locale:${locale}`);
        await page.locator('#storybook-root > *').first().waitFor();
        const isView = story.title.startsWith('Ansichten/');
        const analyze = () =>
          new AxeBuilder({ page })
            .include('#storybook-root')
            .disableRules(isView ? [] : PAGE_RULES)
            .analyze();
        // Das a11y-Addon von Storybook prüft beim Laden selbst; dann kurz warten und erneut
        let results;
        for (let attempt = 0; ; attempt++) {
          try {
            results = await analyze();
            break;
          } catch (error) {
            if (attempt >= 4 || !String(error).includes('already running')) throw error;
            await page.waitForTimeout(250);
          }
        }
        expect(
          results.violations.map(
            (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
          ),
        ).toEqual([]);
      });
    }
  });
}
