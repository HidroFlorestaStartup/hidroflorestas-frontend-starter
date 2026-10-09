import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const base = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:4173";
const output = new URL("../docs/validacao/resultado/", import.meta.url);
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH }
    : {}),
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  timezoneId: "America/Fortaleza",
  reducedMotion: "reduce",
});
page.setDefaultTimeout(20000);
const report = { checks: [], viewportChecks: [], errors: [], contrasts: [] };
page.on("pageerror", (error) => report.errors.push(error.message));
const lab = "/dashboard/laboratories/lab-itapecuru";
const collection = `${lab}/areas/area-beira-rio/collections/col-br-1`;
const heading = (name) => page.getByRole("heading", { name, exact: true });
const button = (name) => page.getByRole("button", { name, exact: true });
const field = (name, options = {}) =>
  page
    .getByLabel(name, { exact: false, ...options })
    .and(page.locator("input:not([type=radio]):not([type=checkbox]), select, textarea"));
const main = () => page.locator("main");
async function check(name, task) {
  console.log("RUN", name);
  await task();
  report.checks.push(name);
  console.log("OK", name);
}
async function ready(title) {
  await heading(title).waitFor();
  await page
    .getByRole("button", { name: "Demonstração", exact: true })
    .and(page.locator(":not([disabled])"))
    .waitFor();
  await page.waitForTimeout(650);
}
async function goto(path, title) {
  await page.goto(base + path, { waitUntil: "domcontentloaded" });
  await ready(title);
}
async function screenshot(name, fullPage = true) {
  await page.screenshot({ path: new URL(name + ".png", output).pathname, fullPage: true });
}
async function panel(task) {
  await button("Demonstração").click();
  const dialog = page.getByRole("dialog");
  await task(dialog);
  if (await dialog.count()) await page.keyboard.press("Escape");
}
async function profile(name) {
  await panel(async (dialog) => dialog.getByRole("button", { name }).click());
  await page.waitForTimeout(1000);
}
async function scenario(label, value) {
  await panel(async (dialog) => {
    const control = dialog.getByLabel(label, { exact: false });
    if (typeof value === "boolean") await control.setChecked(value);
    else await control.selectOption(value);
  });
  await page.waitForTimeout(650);
}
async function noOverflow(label) {
  const dimensions = await page.evaluate(() => ({
    width: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  report.viewportChecks.push({ label, ...dimensions });
  assert.ok(dimensions.document <= dimensions.width + 1, `${label}: ${JSON.stringify(dimensions)}`);
}
async function fixtureSession() {
  await profile(/Proprietário \(OWNER\)/);
  await goto(lab, "Atividade e gerenciamento");
}

try {
  await check("Acesso, validação e seleção explícita de laboratório", async () => {
    await goto("/login", "Entrar");
    await button("Entrar").click();
    await field("E-mail").and(page.locator('[aria-invalid="true"]')).waitFor();
    assert.equal(await field("E-mail").evaluate((el) => el === document.activeElement), true);
    await button("Proprietário (OWNER) — Luciano").click();
    await button("Entrar").click();
    await ready("Bem-vindo ao Ambiente de Análises HIDROFLORESTAS");
    assert.ok(page.url().endsWith("/workspace"));
    await page.getByRole("link", { name: "Acessar", exact: true }).first().click();
    await ready("Atividade e gerenciamento");
    await screenshot("laboratorio-1440");
  });
  await check("Área: validação, UF livre, geolocalização tardia, revisão e consulta", async () => {
    await page
      .getByRole("link", { name: "Áreas", exact: true })
      .filter({ visible: true })
      .first()
      .click();
    await ready("Áreas monitoradas");
    await page.getByRole("link", { name: /Nova área/ }).click();
    await ready("Nova área para monitoramento");
    await button("Revisar").click();
    await field("Nome da área monitorada").and(page.locator('[aria-invalid="true"]')).waitFor();
    await scenario("Localização do dispositivo", "late");
    await button("Usar localização do dispositivo").click();
    await field("Nome da área monitorada").fill("Área de revisão sintética");
    await field("Latitude").fill("-3,5");
    await field("Longitude").fill("-44,5");
    await field("UF").fill("Maranhão");
    await page.getByText(/chegou depois de você editar/).waitFor();
    assert.equal(await field("Latitude").inputValue(), "-3,5");
    await button("Revisar").click();
    await ready("Revise a área antes de cadastrar");
    await button("Corrigir").click();
    assert.equal(await field("UF").inputValue(), "Maranhão");
    await button("Revisar").click();
    await button("Confirmar e cadastrar").click();
    await ready("Área de revisão sintética");
    assert.ok((await main().innerText()).includes("Maranhão"));
  });
  await check("Coleta: offset manual, milissegundos, correção e confirmação", async () => {
    await page.getByRole("link", { name: /Registrar coleta/ }).click();
    await ready("Registrar coleta");
    await field(/^Data\b/).fill("2026-10-01");
    await field(/^Hora\b/).fill("10:20:30.125");
    await page.getByRole("radio", { name: "Offset UTC manual" }).check();
    await field("Offset UTC").fill("-03:00");
    await button("Revisar").click();
    await ready("Revise a coleta antes de confirmar");
    assert.ok((await main().innerText()).includes("2026-10-01T10:20:30.125-03:00"));
    await button("Corrigir").click();
    assert.equal(await field("Hora").inputValue(), "10:20:30.125");
    await button("Revisar").click();
    await button("Confirmar coleta").click();
    await ready("Coleta confirmada");
    assert.ok((await main().innerText()).includes("2026-10-01T13:20:30.125Z"));
  });
  await check(
    "Medições: null, zero, false, declividade 150%, revisão e falha recuperável",
    async () => {
      await page.getByRole("link", { name: "Registrar medições", exact: true }).click();
      await ready("Registrar dados ambientais");
      await button("Revisar os quatro grupos").click();
      await field("Fonte de água").and(page.locator('[aria-invalid="true"]')).waitFor();
      await field("Fonte de água").selectOption("SHALLOW_WELL");
      await field("Há nascente").selectOption("false");
      await field("Profundidade do poço").fill("0");
      await field("Disponibilidade hídrica").selectOption("PERMANENT");
      await field("Textura do solo").selectOption("SANDY");
      await field("Taxa de infiltração").fill("0");
      await field("Compactação").selectOption("LOW");
      await field("Sinais de erosão").selectOption("NONE");
      await field("Solo exposto").fill("0");
      await field("Cobertura vegetal").fill("0");
      await field("Fragmentação").selectOption("LOW");
      await field("Presença de APP ripária").selectOption("false");
      await field("Degradação da paisagem").selectOption("LOW");
      await field("Elevação").fill("-10");
      await field("Declividade").fill("150");
      await field("Fonte de água").selectOption("RIVER_STREAM");
      await button("Revisar os quatro grupos").click();
      await field("Profundidade do poço").and(page.locator('[aria-invalid="true"]')).waitFor();
      await field("Profundidade do poço").fill("");
      await button("Revisar os quatro grupos").click();
      await ready("Revise as medições");
      await button("Corrigir").click();
      assert.equal(await field("Declividade").inputValue(), "150");
      await field("Fonte de água").selectOption("SHALLOW_WELL");
      await field("Profundidade do poço").fill("0");
      await button("Revisar os quatro grupos").click();
      await scenario("Resultado desconhecido ao confirmar medições", true);
      await button("Confirmar medições").click();
      await page.getByText(/Resultado desconhecido: não sabemos/).waitFor();
      assert.equal(await button("Corrigir").count(), 0);
      await button("Repetir a mesma tentativa").click();
      await ready("Dados ambientais");
      assert.ok((await main().innerText()).includes("150%"));
      assert.ok((await main().innerText()).includes("0 m"));
      assert.ok((await main().innerText()).includes("Não informado"));
      await page.getByRole("link", { name: "Voltar à coleta", exact: true }).click();
      await ready("Coleta confirmada");
    },
  );
  await check(
    "IHFR: tentativa incerta, edição bloqueada, recuperação, substituição e revogação",
    async () => {
      await field("Uso predominante da terra").selectOption("FOREST");
      await field("Origem").selectOption("FIELD_OBSERVATION");
      await field("Data da observação").fill("2026-10-01");
      await field("Hora da observação").fill("09:00:00");
      await field("Offset da observação").fill("+05:45");
      await scenario("Próxima tentativa IHFR", "UNKNOWN");
      await button("Solicitar diagnóstico").click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Confirmar", exact: true })
        .click();
      await page.getByText("Resultado desconhecido", { exact: true }).waitFor();
      assert.equal(await field("Uso predominante da terra").isDisabled(), true);
      await screenshot("ihfr-incerto-1440");
      await button("Recuperar operação").click();
      await page.getByText("Operação confirmada na demonstração.", { exact: true }).waitFor();
      await button("Substituir diagnóstico").waitFor();
      assert.ok((await main().innerText()).includes("Resultado simulado — demonstração"));
      await button("Substituir diagnóstico").click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Confirmar", exact: true })
        .click();
      await page.getByText(/Registro anterior conhecido — Substituído/).waitFor();
      await button("Revogar").click();
      await field("Motivo da revogação").fill("Revisão de cenário sintético");
      await button("Confirmar revogação").click();
      await page.getByText("Sem diagnóstico experimental vigente", { exact: true }).waitFor();
    },
  );
  await check("Mapa: fallback, pontos sem localização e acesso às coletas existentes", async () => {
    await goto(lab + "/map", "Mapa territorial");
    await scenario("Mapa (tiles) indisponível", true);
    await page.getByText(/Mapa base indisponível/).waitFor();
    await page.getByRole("button", { name: /Nascente do Riacho Seco/ }).click();
    assert.ok((await main().innerText()).includes("não possui ponto disponível"));
    await page.getByRole("button", { name: /Beira Rio de Itapecuru-Mirim/ }).click();
    await page.locator('a[href$="/collections/col-br-1"]').click();
    await ready("Coleta confirmada");
    await scenario("Mapa (tiles) indisponível", false);
  });
  await check("IHFR: insuficiência e versão incompatível preservam o vigente", async () => {
    await field("Uso predominante da terra").selectOption("FOREST");
    await field("Origem").selectOption("AUTHORIZED_RECORD");
    await field("Data da observação").fill("2026-10-01");
    await field("Hora da observação").fill("09:00:00");
    await scenario("Próxima tentativa IHFR", "INCOMPATIBLE_VERSION");
    await button("Substituir diagnóstico").click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Confirmar", exact: true })
      .click();
    await page.getByText(/Versão incompatível. Nenhum diagnóstico/).waitFor();
    assert.ok((await main().innerText()).includes("Vigente"));
    await scenario("Próxima tentativa IHFR", "INSUFFICIENT_DATA");
    await button("Substituir diagnóstico").click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Confirmar", exact: true })
      .click();
    await page.getByText(/Dados insuficientes — nenhum diagnóstico/).waitFor();
    await scenario("Próxima tentativa IHFR", "AUTO");
  });
  await check(
    "Permissões OWNER, ADMIN contextual, MEMBER, global e laboratório inativo",
    async () => {
      await profile(/Membro \(MEMBER\)/);
      await goto(lab + "/areas", "Áreas monitoradas");
      assert.equal(await page.getByRole("link", { name: /Nova área/ }).count(), 0);
      await goto(collection, "Coleta confirmada");
      assert.equal(await button("Substituir diagnóstico").count(), 0);
      await goto(lab + "/areas/area-beira-rio/collections/new", "Registrar coleta");
      await profile(/Admin. do laboratório/);
      await goto(lab + "/areas", "Áreas monitoradas");
      assert.equal(await page.getByRole("link", { name: /Nova área/ }).count(), 1);
      assert.equal(await page.getByRole("link", { name: "Administração", exact: true }).count(), 0);
      await profile(/Proprietário \(OWNER\)/);
      await goto("/dashboard/laboratories/lab-baixada/areas", "Áreas monitoradas");
      await page.getByText("Laboratório inativo — somente leitura.", { exact: true }).waitFor();
      assert.equal(await page.getByRole("link", { name: /Nova área/ }).count(), 0);
      await profile(/Admin. global/);
      await ready("Administração");
      await page.goto(base + lab);
      await page.getByText("Recurso não encontrado", { exact: true }).waitFor();
    },
  );
  await check(
    "Administração: busca, paginação, diálogo por teclado, conflito, escrita e auditoria",
    async () => {
      await goto("/admin/users", "Contas");
      await button("Próxima").click();
      await page.getByText(/Página 2 ·/).waitFor();
      await field("Buscar por nome ou e-mail").fill("Pessoa 1");
      await button("Ver conta de Pessoa 1 Sintética").waitFor();
      await button("Ver conta de Pessoa 1 Sintética").focus();
      await page.keyboard.press("Enter");
      let dialog = page.getByRole("dialog");
      await dialog.getByRole("heading", { name: "Pessoa 1 Sintética" }).waitFor();
      await button("Alterar estado").click();
      await field("Novo estado").selectOption("INACTIVE");
      await field(/^Justificativa\b/).fill("Validação de conta sintética");
      await page.keyboard.press("Escape");
      await scenario("Conflito administrativo", true);
      await button("Ver conta de Pessoa 1 Sintética").click();
      await button("Alterar estado").click();
      await field("Novo estado").selectOption("INACTIVE");
      await field(/^Justificativa\b/).fill("Validação de conta sintética");
      await button("Revisar alteração").click();
      await button("Confirmar alteração").click();
      await page
        .getByText(/A conta foi alterada por outra pessoa/)
        .first()
        .waitFor();
      await button("Revisar alteração").click();
      await button("Confirmar alteração").click();
      await page.getByText("Alteração confirmada na demonstração.", { exact: true }).waitFor();
      await dialog.getByText(/revisão 3/).waitFor();
      await screenshot("administracao-dialogo-1440", false);
      await page.keyboard.press("Escape");
      assert.equal(
        await button("Ver conta de Pessoa 1 Sintética").evaluate(
          (el) => el === document.activeElement,
        ),
        true,
      );
      await field("Buscar por nome ou e-mail").fill("Busca inexistente");
      await page.getByText("Nenhuma conta encontrada", { exact: true }).waitFor();
    },
  );
  await check(
    "Estados vazios, limite, falha de leitura, logout e cadastro demonstrativo",
    async () => {
      await profile(/Conta sem laboratório/);
      assert.equal(await page.getByRole("link", { name: "Acessar", exact: true }).count(), 0);
      await button("Criar seu Laboratório IHFR").click();
      await field("Nome do laboratório").fill("Laboratório sintético vazio");
      await button("Criar laboratório").click();
      assert.ok(page.url().endsWith("/workspace"));
      await page.getByRole("link", { name: "Acessar", exact: true }).click();
      await ready("Atividade e gerenciamento");
      await page.getByText("Nenhuma atividade ainda", { exact: true }).waitFor();
      await profile(/Limite de 5 laboratórios/);
      assert.equal(
        await page.getByRole("button", { name: /Criar seu Laboratório IHFR/ }).isDisabled(),
        true,
      );
      await fixtureSession();
      await scenario("Falhar leituras", true);
      await page.getByRole("button", { name: "Tentar novamente", exact: true }).first().waitFor();
      await scenario("Falhar leituras", false);
      await ready("Atividade e gerenciamento");
      await scenario("Falhar ao sair", true);
      await page
        .getByRole("link", { name: "Sair", exact: true })
        .filter({ visible: true })
        .first()
        .click();
      await page.getByRole("button", { name: /Tentar novamente/ }).waitFor();
      await scenario("Falhar ao sair", false);
      await button("Tentar novamente").click();
      await ready("Entrar");
      await goto("/register", "Criar conta");
      await field(/^Nome\b/).fill("Pessoa");
      await field("Sobrenome").fill("Sintética");
      await field("E-mail").fill("cadastro-browser@demo.hidroflorestas.org");
      await field("Senha").fill("demo");
      await button("Criar conta").click();
      await ready("Bem-vindo ao Ambiente de Análises HIDROFLORESTAS");
    },
  );
  await check("375px, 768px e 1440px: páginas principais sem rolagem horizontal", async () => {
    await profile(/Proprietário \(OWNER\)/);
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [path, title, name] of [
        ["/", "Monitoramento ambiental organizado por laboratório.", "landing"],
        ["/login", "Entrar", "login"],
        ["/register", "Criar conta", "cadastro"],
        ["/workspace", "Bem-vindo ao Ambiente de Análises HIDROFLORESTAS", "workspace"],
        [lab, "Atividade e gerenciamento", "laboratorio"],
        [lab + "/areas/new", "Nova área para monitoramento", "nova-area"],
        [lab + "/map", "Mapa territorial", "mapa"],
        [collection, "Coleta confirmada", "ihfr"],
        [
          lab + "/areas/area-beira-rio/collections/col-br-3/environmental-data/new",
          "Registrar dados ambientais",
          "ambiental",
        ],
      ]) {
        await goto(path, title);
        await noOverflow(`${name}-${width}`);
        if (
          (width === 375 && ["nova-area", "ihfr", "ambiental", "workspace"].includes(name)) ||
          (width === 1440 && ["landing", "cadastro", "mapa"].includes(name))
        )
          await screenshot(`${name}-${width}`);
      }
    }
    await profile(/Admin. global/);
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await goto("/admin/users", "Contas");
      await noOverflow(`admin-${width}`);
      await screenshot(`admin-${width}`);
    }
  });
  await check("Zoom 200%, foco, diálogos e contraste dos tokens", async () => {
    // A 720px CSS viewport checks the reflow equivalent to 200% at 1440px. CSS zoom 200% is additionally checked; native browser toolbar zoom remains a manual check.
    await page.setViewportSize({ width: 720, height: 500 });
    await goto("/admin/users", "Contas");
    await noOverflow("zoom-200-admin");
    await button("Ver conta de Luciano Mendes").click();
    await page
      .getByRole("dialog")
      .getByRole("heading", { name: "Luciano Mendes", exact: true })
      .waitFor();
    await noOverflow("zoom-200-dialogo");
    await screenshot("zoom-200-dialogo", false);
    const dialog = page.getByRole("dialog");
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press("Tab");
      assert.equal(await dialog.evaluate((el) => el.contains(document.activeElement)), true);
    }
    await page.keyboard.press("Escape");
    await button("Demonstração").focus();
    const outline = await button("Demonstração").evaluate(
      (el) => getComputedStyle(el).outlineStyle,
    );
    assert.notEqual(outline, "none");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => {
      document.body.style.zoom = "200%";
    });
    await noOverflow("zoom-css-200-admin");
    await screenshot("zoom-css-200-admin");
    await page.evaluate(() => {
      document.body.style.zoom = "";
    });
    report.contrasts = await page.evaluate(() => {
      const ctx = document.createElement("canvas").getContext("2d");
      function rgb(token) {
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
        ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
      }
      const lum = (rgb) =>
        rgb
          .map((n) => n / 255)
          .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4))
          .reduce((a, b, i) => a + b * [0.2126, 0.7152, 0.0722][i], 0);
      const white = lum([255, 255, 255]);
      return [
        "--foreground",
        "--muted-foreground",
        "--primary",
        "--water-strong",
        "--ochre",
        "--ochre-signup",
        "--destructive",
      ].map((token) => ({
        token,
        rgb: rgb(token),
        ratio: (white + 0.05) / (lum(rgb(token)) + 0.05),
      }));
    });
    for (const color of report.contrasts)
      assert.ok(color.ratio >= 4.5, `${color.token}: ${color.ratio}`);
  });
  assert.equal(report.errors.length, 0, JSON.stringify(report.errors));
} catch (error) {
  report.failure = error.stack;
  await screenshot("falha-validacao");
  throw error;
} finally {
  if (!report.failure) await fs.rm(new URL("falha-validacao.png", output), { force: true });
  await fs.writeFile(
    new URL("verificacao-navegador.json", output),
    JSON.stringify(report, null, 2) + "\n",
  );
  await browser.close();
}
