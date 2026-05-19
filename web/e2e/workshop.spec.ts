import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    // Avoid the first-visit banner covering controls in headless runs
    localStorage.setItem("easy-poems:first-hint-dismissed", "1");
  });
  await page.reload();
});

test("loads and shows the editor", async ({ page }) => {
  await expect(page.locator(".poem-cm-wrap")).toBeVisible();
});

test("creates a new draft", async ({ page }) => {
  await page.locator('[aria-label="Open library"]').click();
  await page.getByRole("button", { name: "New draft" }).click();
  // Library closes after creating new draft
  await expect(page.locator(".drawer")).not.toBeVisible();
});

test("types into the editor", async ({ page }) => {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.type("Shall I compare thee to a summer's day?");
  await expect(page.locator(".topbar-context-stat").first()).toContainText(/\d/);
});

test("title field updates", async ({ page }) => {
  const titleInput = page.locator("#poem-title");
  await titleInput.fill("My Test Poem");
  await expect(titleInput).toHaveValue("My Test Poem");
});

test("saved flash appears after editing", async ({ page }) => {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.type("Testing autosave");
  await expect(page.locator(".save-dot.is-on")).toBeVisible({ timeout: 3000 });
});

test("library drawer opens and closes", async ({ page }) => {
  await page.locator('[aria-label="Open library"]').click();
  await expect(page.locator('[role="dialog"][aria-label="Draft library"]')).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.locator('[role="dialog"]')).not.toBeVisible();
});

test("library drawer closes when clicking overlay", async ({ page }) => {
  await page.locator('[aria-label="Open library"]').click();
  await expect(page.locator(".overlay")).toBeVisible();
  // Click on the overlay backdrop (not the drawer)
  await page.locator(".overlay").click({ position: { x: 10, y: 10 } });
  await expect(page.locator('[role="dialog"]')).not.toBeVisible();
});

test("export backup downloads a file", async ({ page }) => {
  // Type some content so there's something to export
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.type("A poem to export");

  await page.locator('[aria-label="Open library"]').click();
  await page.getByText("Backup", { exact: true }).click();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /export backup.*json/i }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/easy-poems-backup.*\.json$/);
});

test("import backup restores poems", async ({ page }) => {
  // Build a minimal valid backup JSON
  const backup = JSON.stringify({
    easyPoemsWorkshopExport: true,
    version: 1,
    exportedAt: new Date().toISOString(),
    poems: [
      {
        title: "Imported Poem",
        body: "Roses are red",
        updatedAt: new Date().toISOString(),
      },
    ],
  });

  await page.locator('[aria-label="Open library"]').click();
  await page.getByText("Backup", { exact: true }).click();

  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /import backup/i }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(backup),
  });

  // Import notice should appear
  await expect(page.locator(".import-notice-banner")).toBeVisible({ timeout: 3000 });
  await expect(page.locator(".import-notice-text")).toContainText("Imported 1 poem");
});

test("import rejects invalid version backup", async ({ page }) => {
  const badBackup = JSON.stringify({
    easyPoemsWorkshopExport: true,
    version: 99,
    exportedAt: new Date().toISOString(),
    poems: [],
  });

  await page.locator('[aria-label="Open library"]').click();
  await page.getByText("Backup", { exact: true }).click();

  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /import backup/i }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(badBackup),
  });

  await expect(page.locator(".import-notice-banner")).toBeVisible({ timeout: 3000 });
  await expect(page.locator(".import-notice-text")).toContainText("incompatible version");
});

test("spell check flags unknown word", async ({ page }) => {
  const editor = page.locator(".cm-content");
  await editor.click();
  // Type a clearly misspelled word
  await page.keyboard.type("zxqwerty");

  // Switch to spell check tab
  await page.getByRole("tab", { name: /spell/i }).click();

  // Eventually a spell hit should appear (after wordlist loads and debounce)
  await expect(page.locator(".spell-hit, [class*='spell']").first()).toBeVisible({
    timeout: 5000,
  });
});

test("command palette opens with Ctrl+K", async ({ page }) => {
  await page.keyboard.press("Control+k");
  await expect(page.locator('[role="dialog"][aria-label*="command"], .cmdk-overlay')).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".cmdk-overlay")).not.toBeVisible();
});

test("find bar opens with Ctrl+F", async ({ page }) => {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("Control+f");
  await expect(page.locator(".findbar")).toBeVisible();
});

test("opens Getting started from the command palette", async ({ page }) => {
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog", { name: /command palette/i })).toBeVisible();
  await page.getByRole("textbox", { name: /command search/i }).fill("getting started");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: /^Getting started$/i })).toBeVisible();
  await page.keyboard.press("Escape");
});
