import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { CodexRequestProxyLabel } from "./CodexRequestProxyLabel";
import type { CodexLocalAccessProxyRoute } from "../../types/codexLocalAccess";
import vi from "../../locales/vi.json";
import en from "../../locales/en.json";

async function render(route?: CodexLocalAccessProxyRoute | null, lng = "vi") {
  const i18n = createInstance();
  await i18n.init({
    lng,
    resources: { vi: { translation: vi }, en: { translation: en } },
    interpolation: { escapeValue: false },
  });
  return renderToStaticMarkup(createElement(CodexRequestProxyLabel, { route, t: i18n.t }));
}

test("named nodes retain the full recorded name in the title and escape markup", async () => {
  const name = 'Tokyo <01> & "lối ra" ' + "Long node name ".repeat(20);
  const output = await render({ kind: "node", name });
  const escaped = name.trim().replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  assert.ok(output.includes(`title="Ủy nhiệm: ${escaped}"`));
  assert.ok(output.includes(`>${"Ủy nhiệm: " + escaped}</span>`));
  assert.ok(output.includes('class="codex-request-proxy-label"'));
});

test("direct connections ignore stale names and translate the route", async () => {
  assert.equal(await render({ kind: "direct", name: "old proxy" }, "en"),
    '<span class="codex-request-proxy-label" title="Proxy: Direct">Proxy: Direct</span>');
});

test("missing, unknown and incomplete snapshots do not imply direct connections", async () => {
  for (const route of [undefined, null, { kind: "unknown", name: "stale" },
    { kind: "node", name: "   " }, { kind: "proxy", name: "" }] as const) {
    const output = await render(route);
    assert.ok(output.includes(">Ủy nhiệm: Chưa ghi nhận</span>"));
    assert.ok(!output.includes("stale"));
    assert.ok(!output.includes("Trực tiếp"));
  }
});

test("proxy entries explain the missing final node only in the tooltip", async () => {
  const output = await render({ kind: "proxy", name: "127.0.0.1:7890" });
  assert.ok(output.includes("Ủy nhiệm: 127.0.0.1:7890\nChỉ ghi nhận điểm vào ủy nhiệm; nút cuối chưa được xác định."));
  assert.ok(output.endsWith(">Ủy nhiệm: 127.0.0.1:7890</span>"));
  const node = await render({ kind: "node", name: "Singapore" });
  assert.ok(!node.includes("nút cuối chưa được xác định"));
});
