import { chromium } from "playwright-core";
import fs from "node:fs/promises";
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH }
    : {}),
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({
  viewport: { width: 375, height: 900 },
  timezoneId: "America/Fortaleza",
});
await page.addInitScript(() =>
  sessionStorage.setItem("hf-demo-scenario", JSON.stringify({ sessionUserId: "u-owner" })),
);
const checks = [];
for (const [path, start, count] of [
  ["/dashboard/laboratories/lab-itapecuru/areas/new", "Nome da área monitorada", 17],
  ["/dashboard/laboratories/lab-itapecuru/areas/area-beira-rio/collections/new", "Data", 12],
  [
    "/dashboard/laboratories/lab-itapecuru/areas/area-beira-rio/collections/col-br-3/environmental-data/new",
    "Fonte de água",
    27,
  ],
]) {
  await page.goto((process.env.DEMO_BASE_URL ?? "http://127.0.0.1:4173") + path);
  await page.getByLabel(start, { exact: false }).first().waitFor();
  await page.waitForTimeout(900);
  await page.getByLabel(start, { exact: false }).first().focus();
  for (let i = 0; i < count; i++) {
    await page.waitForTimeout(30);
    const check = await page.evaluate(() => {
      const el = document.activeElement;
      if (
        !el ||
        !el.closest("main") ||
        !["INPUT", "SELECT", "TEXTAREA", "BUTTON", "SUMMARY", "A"].includes(el.tagName)
      )
        return null;
      const r = el.getBoundingClientRect(),
        header = document.querySelector("header"),
        bottom = document.querySelector('nav[aria-label="Navegação principal (celular)"]');
      const headerBottom = header?.getBoundingClientRect().bottom ?? 0,
        footerTop = bottom?.getBoundingClientRect().top ?? innerHeight;
      return {
        tag: el.tagName,
        name:
          el.getAttribute("aria-label") ||
          el.labels?.[0]?.textContent ||
          el.textContent?.trim().slice(0, 80),
        top: r.top,
        bottom: r.bottom,
        headerBottom,
        footerTop,
        covered: r.top < headerBottom - 1 || r.bottom > footerTop + 1,
      };
    });
    if (check) checks.push({ path, ...check });
    await page.keyboard.press("Tab");
  }
}
await fs.writeFile(
  process.cwd() + "/docs/validacao/resultado/teclado-celular.json",
  JSON.stringify(checks, null, 2) + "\n",
);
console.log(
  JSON.stringify({ controls: checks.length, covered: checks.filter((x) => x.covered) }, null, 2),
);
await browser.close();

if (checks.some((check) => check.covered)) process.exitCode = 1;
