import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { LOCALES } from "./locales.ts";

type Messages = { [key: string]: string | Messages };

function strings(messages: Messages, path = ""): [string, string][] {
  return Object.entries(messages).flatMap(([key, value]) =>
    typeof value === "string" ? [[`${path}${key}`, value] as [string, string]] : strings(value, `${path}${key}.`),
  );
}

const load = (locale: string): Messages =>
  JSON.parse(readFileSync(new URL(`../../messages/${locale}.json`, import.meta.url), "utf8"));

test("no one-letter word is followed by a breakable space (typographic orphans)", () => {
  for (const locale of LOCALES) {
    for (const [key, value] of strings(load(locale))) {
      const orphan = value.match(/(?<![\p{L}\p{N}’'])\p{L} /u);
      assert.equal(orphan, null, `${locale}:${key} – use a non-breaking space after "${orphan?.[0].trim()}" in "${value}"`);
    }
  }
});

test("all locales have the same keys", () => {
  const keys = (locale: string) => strings(load(locale)).map(([key]) => key).sort();
  for (const locale of LOCALES) assert.deepEqual(keys(locale), keys("cs"), locale);
});
