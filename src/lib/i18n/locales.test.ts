import assert from "node:assert/strict";
import { test } from "node:test";
import { guessLocale, languagesFromHeader } from "./locales.ts";

test("guessLocale picks the best supported language", () => {
  assert.equal(guessLocale(["cs-CZ", "en-US"]), "cs");
  assert.equal(guessLocale(["en-GB", "cs"]), "en");
  assert.equal(guessLocale(["ru-RU"]), "ru");
  assert.equal(guessLocale(["sk-SK"]), "cs");
  assert.equal(guessLocale(["uk-UA"]), "ru");
  assert.equal(guessLocale(["de-DE", "fr"]), "en");
  assert.equal(guessLocale(["de-DE", "en"]), "en");
  assert.equal(guessLocale([]), "en");
  assert.equal(guessLocale(["not a tag!!"]), "en");
});

test("languagesFromHeader orders by quality", () => {
  assert.deepEqual(languagesFromHeader("cs-CZ,cs;q=0.9,en;q=0.8"), ["cs-CZ", "cs", "en"]);
  assert.deepEqual(languagesFromHeader("en;q=0.5, ru"), ["ru", "en"]);
  assert.deepEqual(languagesFromHeader("*"), []);
  assert.deepEqual(languagesFromHeader(null), []);
  assert.equal(guessLocale(languagesFromHeader("sk-SK,sk;q=0.9")), "cs");
});
