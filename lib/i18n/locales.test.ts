import assert from "node:assert/strict";
import { test } from "node:test";
import { guessLocale } from "./locales.ts";

test("guessLocale picks the best supported language", () => {
  assert.equal(guessLocale(["cs-CZ", "en-US"]), "cs");
  assert.equal(guessLocale(["en-GB", "cs"]), "en");
  assert.equal(guessLocale(["ru-RU"]), "ru");
  assert.equal(guessLocale(["sk-SK"]), "cs");
  assert.equal(guessLocale(["uk-UA"]), "ru");
  assert.equal(guessLocale(["de-DE", "fr"]), "cs");
  assert.equal(guessLocale(["de-DE", "en"]), "en");
  assert.equal(guessLocale([]), "cs");
  assert.equal(guessLocale(["not a tag!!"]), "cs");
});
