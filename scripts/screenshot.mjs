// Captures docs/screenshot.png from the production build.
// Usage: npm run build && npm run screenshot
import { chromium } from "playwright";
import { preview } from "vite";

const server = await preview({ preview: { port: 4173, strictPort: true } });
const url = server.resolvedUrls?.local[0] ?? "http://localhost:4173/planning-calendar-ui/";

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1400, height: 900 },
  deviceScaleFactor: 2,
});
await page.goto(url, { waitUntil: "networkidle" });
// Open a night with an overrun so the side panel is populated in the shot.
await page.locator('[role="gridcell"][data-status="overrun"]').first().click();
await page.waitForTimeout(250);
await page.screenshot({ path: "docs/screenshot.png", fullPage: true });
await browser.close();
await server.close();
console.log("Saved docs/screenshot.png");
