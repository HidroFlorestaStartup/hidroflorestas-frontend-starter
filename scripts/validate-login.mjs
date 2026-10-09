import { chromium, firefox } from "playwright-core";
import assert from "node:assert/strict";

const base = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:4173";
const browserName = process.env.DEMO_BROWSER ?? "chromium";
assert.ok(["chromium", "firefox"].includes(browserName));
const executablePath =
  browserName === "firefox"
    ? process.env.FIREFOX_EXECUTABLE_PATH
    : process.env.CHROMIUM_EXECUTABLE_PATH;
const browser = await (browserName === "firefox" ? firefox : chromium).launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
  ...(browserName === "chromium" ? { args: ["--no-sandbox", "--disable-dev-shm-usage"] } : {}),
});
const report = {
  browser: browserName,
  base,
  environments: [],
  checks: [],
  runtimeErrors: [],
  moduleFailures: [],
};
const personas = [
  ["Proprietário (OWNER) — Luciano", "luciano"],
  ["Admin. do laboratório — Pedro", "pedro"],
  ["Membro (MEMBER) — Ana", "ana"],
  ["Admin. global — Carla", "carla"],
  ["Conta sem laboratório — Marcos", "marcos"],
  ["Limite de 5 laboratórios — Júlia", "julia"],
];
const account = (page, name) => page.getByRole("button", { name, exact: true });
const email = (page) => page.locator("input[type=email]");
const password = (page) => page.locator("input[autocomplete=current-password]");
const enter = (page) => account(page, "Entrar");
async function tabTo(page, target, key = "Tab") {
  // Traverse the real tab order rather than programmatically focusing the account.
  for (let i = 0; i < 24; i++) {
    await page.keyboard.press(key);
    if (await target.evaluate((element) => element === document.activeElement)) return;
  }
  assert.fail("A conta não foi alcançada pela navegação com Tab.");
}
async function session(page) {
  return page.evaluate(() => JSON.parse(sessionStorage.getItem("hf-demo-scenario") ?? "null"));
}
async function check(name, task) {
  await task();
  report.checks.push(name);
  console.log("OK", name);
}
function observe(page) {
  page.on("pageerror", (error) => report.runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") report.runtimeErrors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.url().startsWith(base) && response.status() >= 400)
      report.moduleFailures.push(`${response.status()} ${response.url()}`);
  });
  page.on("requestfailed", (request) => {
    if (request.url().startsWith(base))
      report.moduleFailures.push(`${request.failure()?.errorText} ${request.url()}`);
  });
}

try {
  for (const width of [1440, 375]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    observe(page);
    await check(`${width}px: contas aguardam o módulo de hidratação`, async () => {
      let release;
      const gate = new Promise((resolve) => (release = resolve));
      await page.route("**/*tanstack-start-dev-client-entry*", async (route) => {
        await gate;
        await route.continue();
      });
      try {
        await page.goto(base + "/login", { waitUntil: "commit" });
        const owner = account(page, personas[0][0]);
        await owner.waitFor({ state: "visible" });
        assert.equal(await owner.isDisabled(), true);
        assert.equal(await enter(page).isDisabled(), true);
        assert.match(await page.getByRole("status").innerText(), /Carregando contas/);
        await owner.scrollIntoViewIfNeeded();
        const box = await owner.boundingBox();
        assert.ok(box);
        const hit = await owner.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return element.contains(
            document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2),
          );
        });
        assert.equal(hit, true, "Outro elemento está interceptando os cliques.");
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        assert.equal(await email(page).inputValue(), "");
        assert.equal(await session(page), null);
      } finally {
        release();
      }
      await account(page, personas[0][0]).and(page.locator(":not([disabled])")).waitFor();
      await page.unroute("**/*tanstack-start-dev-client-entry*");
    });
    await check(`${width}px: chaves de operação funcionam no contexto da URL`, async () => {
      const result = await page.evaluate(async () => {
        const { newIdempotencyKey } = await import("/src/adapter/api.ts");
        return {
          secureContext: window.isSecureContext,
          randomUUID: typeof crypto.randomUUID,
          getRandomValues: typeof crypto.getRandomValues,
          keys: Array.from({ length: 100 }, () => newIdempotencyKey()),
        };
      });
      const { keys, ...environment } = result;
      report.environments.push({ width, ...environment });
      assert.equal(result.getRandomValues, "function");
      assert.equal(new Set(keys).size, keys.length);
      assert.ok(
        keys.every((key) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(key),
        ),
      );
    });
    await check(`${width}px: clique nas seis contas preenche sem iniciar sessão`, async () => {
      for (const [name, alias] of personas) {
        await account(page, name).click();
        assert.equal(await email(page).inputValue(), `${alias}@demo.hidroflorestas.org`);
        assert.equal(await password(page).inputValue(), "demo");
        assert.match(
          await page.getByRole("status").innerText(),
          /e-mail e senha preenchidos.*Clique em Entrar/,
        );
        assert.equal(new URL(page.url()).pathname, "/login");
        assert.equal(await session(page), null);
      }
      await email(page).fill("editado@demo.hidroflorestas.org");
      assert.doesNotMatch(await page.getByRole("status").innerText(), /preenchidos/);
    });
    await check(`${width}px: conta bloqueada rejeitada, seleção corrige o erro`, async () => {
      await email(page).fill("rafael@demo.hidroflorestas.org");
      await password(page).fill("demo");
      await enter(page).click();
      await page.getByRole("alert").filter({ hasText: "Email ou senha inválidos." }).waitFor();
      assert.equal(new URL(page.url()).pathname, "/login");
      assert.equal(await session(page), null);
      await account(page, personas[2][0]).click();
      assert.equal(await page.getByRole("alert").count(), 0);
      await enter(page).click();
      await page.waitForURL("**/workspace");
      assert.equal((await session(page)).sessionUserId, "u-member");
    });
    await context.close();

    for (const [name, alias, key, destination, id] of [
      [personas[2][0], "ana", "Enter", "/workspace", "u-member"],
      [personas[3][0], "carla", "Space", "/admin", "u-global"],
    ]) {
      const keyboardContext = await browser.newContext({ viewport: { width, height: 900 } });
      const keyboardPage = await keyboardContext.newPage();
      observe(keyboardPage);
      await check(`${width}px: Tab e ${key}, ${alias}, login só com Entrar`, async () => {
        await keyboardPage.goto(base + "/", { waitUntil: "domcontentloaded" });
        await account(keyboardPage, "Demonstração")
          .and(keyboardPage.locator(":not([disabled])"))
          .waitFor();
        await keyboardPage.getByRole("link", { name: "Entrar", exact: true }).first().click();
        await keyboardPage.waitForURL("**/login");
        const target = account(keyboardPage, name);
        await target.and(keyboardPage.locator(":not([disabled])")).waitFor();
        await tabTo(keyboardPage, target);
        await keyboardPage.keyboard.press(key);
        assert.equal(await email(keyboardPage).inputValue(), `${alias}@demo.hidroflorestas.org`);
        assert.equal(await password(keyboardPage).inputValue(), "demo");
        assert.equal(await session(keyboardPage), null);
        assert.equal(new URL(keyboardPage.url()).pathname, "/login");
        await tabTo(keyboardPage, enter(keyboardPage), "Shift+Tab");
        await keyboardPage.keyboard.press("Enter");
        await keyboardPage.waitForURL(`**${destination}`);
        assert.equal((await session(keyboardPage)).sessionUserId, id);
      });
      await keyboardContext.close();
    }
  }
  assert.deepEqual(report.runtimeErrors, []);
  assert.deepEqual(report.moduleFailures, []);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
