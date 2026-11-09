# HDO – build plan

> Status: **approved 2026-11-09**. Phase 1 in progress.

## Goal

A single-screen PWA, installed to the phone home screen, that answers one question:
**is the low rate on right now, and how long until it switches?**
PRE's own site doesn't answer this at a glance.

## Non-goals (v1)

- No backend, no accounts, no runtime API calls to the distributors.
- No push notifications.
- No parsing in the browser or at deploy time.
- Only PREdistribuce. The structure is ready for others (§2).

---

## 1. Source data – PREdistribuce (`input/pre/`)

| File | What it is | Shape |
|---|---|---|
| `aktualni-program-hdo-ke-stazeni.xls` | **Current HDO program** for ripple-control receivers | 1 sheet, 115 commands (`číselný kód povelu`, e.g. `573`, plus `označení dle adresy`, e.g. `A4B6DP9`, plus a description). 8 rows per command (Mon–Sun + **svátek**), up to 8 on/off pairs. **Validity in the header: `od 29/1/2026`, `do 31/12/2027`.** |
| `nasledny-program-hdo-ke-stazeni.xls` | **Following HDO program** | Currently only a note: *"no change planned because of the move to AMM"*. |
| `tou-tabulka-a.xlsx`, `tou-tabulka-t.xlsx` | TOU programs for meters with an internal time switch (two meter families) | An index sheet plus 1 sheet per tariff. Days are grouped with `x` marks. |
| `tou-tabulka-amm.xlsx` | TOU programs for **AMM smart meters** | 1 sheet per tariff, rows per day (+ `SV`). |

### How a household's schedule is identified (example: D57d)

Inside PRE there are **two different D57d programs**, identified by their NT command number. Each one exists in a variant for every device type:

| Program | HDO receiver | TOU-A | TOU-T | AMM |
|---|---|---|---|---|
| **573** (`A4B6DP9`) | `573` | `AD57_001` | `TD57_001` | `1052` |
| **605** (`A4B8DP9`) | `605` | `AD57_002` | `TD57_002` | `1053` |

- 573 and 605 are very different. For example, Mon 09:30 is NT in 573 and VT in 605.
- Device variants of the same program differ too:
  - TOU-T is shifted by about ±5–15 minutes;
  - TOU-A Mon–Thu has 3:00–8:00 where HDO has 3:00–6:20.

So the picker needs: **tariff → program (command number) → device type**.

### Parser rules found so far

- We show only the **NT command / tariff register** (e.g. 573).
  - The "spotřebič" command (574) is identical to it in the files checked.
  - The "TUV" command (575, hot water) and the "servisní" command are excluded.
- `0:00` as an end time means midnight (end of day).
- A program's NT command number links all its device variants. For TOU it is the `Registry` / `Tarify` value; for AMM it is the register row.
- **Holidays (`svátek` / `SV`)** have their own row. Czech public holidays are computed in code: fixed dates plus Good Friday and Easter Monday.
- The PRE files contain inconsistencies, and the parser must tolerate them. For example, the TOU-A index lists `AD3 573 574 575`, while the sheet says `AD3 573 575 575`.
- A following program, if one ever exists, is included with its own `od` date. A note-only file is skipped, and the note is printed.

## 2. Data pipeline

### Folders (both committed)

```
input/
  pre/   ← PRE files as downloaded
  egd/   ← .gitkeep (EG.D, formerly E.ON)
  cez/   ← .gitkeep (ČEZ Distribuce)
output/
  pre.json
```

### Parsers – one per distributor

```sh
npm run parse-pre    # reads input/pre/ → output/pre.json
npm run parse-egd    # exits 1: "EG.D parser is not developed yet"
npm run parse-cez    # exits 1: "ČEZ Distribuce parser is not developed yet"
```

- `scripts/parse/<distributor>.ts`, plain Node scripts (Node 25 runs TS directly). They're deterministic and need no AI.
- **Shared code** (`scripts/parse/shared/`):
  - the output schema and its validation;
  - time-string parsing;
  - window normalisation;
  - byte-stable JSON writing.
- Each distributor parser only translates its own files into the shared schema.
- Library: **SheetJS (`xlsx`) from the official SheetJS CDN tarball**, the only maintained reader that handles legacy `.xls`.
  - The npm-registry copy of `xlsx` is stale and has known vulnerabilities, so it is not used.
- A parser fails loudly and writes nothing when:
  - a layout isn't recognised;
  - a time can't be parsed;
  - windows overlap;
  - the validity header is missing;
  - the same code has conflicting schedules.
- It prints a summary: the files read and the shape detected for each, programs per tariff and device, validity, and skipped notes.
- Output is byte-stable: same input → same output, with no timestamps.

### Git hook (no husky)

- Hooks live in `.githooks/`. npm's `prepare` script runs `git config core.hooksPath .githooks`.
- **pre-commit:**
  - for each `input/<distributor>/` with staged changes, it runs `npm run parse-<distributor>` and stages `output/`;
  - if a parser fails (including "not developed"), the commit is aborted.

### Update workflow

Download the files into `input/pre/` → `git commit` (the hook regenerates `output/pre.json`) → `git push` → Vercel deploys.

### Output schema (draft, finalised in phase 1)

```ts
type Day = 'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun'|'hol';
type Windows = [start: number, end: number][];   // minutes from midnight, Prague local time

type Variant = {
  device: 'hdo' | 'tou-a' | 'tou-t' | 'amm';   // PRE's set. Device types, program numbers and their count
                                              // are distributor-specific; only tariff codes (D57d, …) are national (ERÚ).
  id: string;              // "573" / "AD57_001" / "TD57_001" / "1052"
  aliases: string[];       // "A4B6DP9", "AD3 573 574 575", ...
  week: Record<Day, Windows>;   // NT windows
};

type Program = {
  tariff: string;          // "D57d"
  command: string;         // "573" – the shared key across device variants
  label: string;           // PRE description
  variants: Variant[];
};

type DistributorData = {
  distributor: 'pre';
  periods: {               // usually 1; 2 when a following program exists
    validFrom: string;     // "YYYY-MM-DD"
    validTo: string | null;
    programs: Program[];
  }[];
  sources: string[];
};
```

## 3. Time logic (`lib/schedule.ts`, pure functions)

- `getState(data, selection, now)` returns `{ rate: 'low' | 'high', endsAt: Date }`.
- Everything is calculated in **Europe/Prague** time using `Intl`. DST-safe.
- It picks the period valid for `now`. On Czech public holidays it uses the `hol` row.
- Adjacent windows are joined across midnight and day boundaries, so the countdown never resets at 23:59. A run stops at a period boundary.
- Unit tests with `node --test` cover:
  - midnight crossing;
  - DST days;
  - Sun → Mon;
  - a holiday;
  - the period switch;
  - a day with no NT.

## 4. UI

Built with **shadcn/ui** (Tailwind 4). One client-rendered screen.

- **Background:** full-screen gradient. Green while low rate is on, red while high rate is on.
- **Main label:** big rate word, plus a live countdown `1:23:45` (seconds in a smaller font).
- **Selection as a sentence** under the countdown. There is no settings screen.

  > Distribuce **PRE**, sazba **D57d**, program **573 / A4B6DP9**

  - Each bold token is a **combobox trigger**: plain text with a dashed bottom border. It opens a shadcn `Popover` + `Command` list with search.
  - **Distributor:**
    - the trigger is enabled;
    - inside the list, ČEZ Distribuce and EG.D are disabled items with a short note that only PRE is supported so far;
    - this replaces the separate ⓘ popover idea.
  - **Tariff:** the tariffs present in the data.
  - **Program:**
    - one list per tariff;
    - each item is one *device variant* of a program, grouped by program number, shown the way it's printed on the device, e.g.:
      - `573 / A4B6DP9` – HDO receiver
      - `AD57_001` / `TD57_001` – TOU meter
      - `D57 573 574 575` – smart meter
    - so the device type is part of this choice, with no fourth token.
    - If the tariff has only one program and one device variant, the token is plain text instead of a trigger.
  - Changing the tariff clears the program unless there is only one option, which is then picked automatically.
  - **First visit:**
    - nothing is preselected except PRE;
    - the empty tokens show placeholders ("vyberte sazbu" / "choose tariff" / "выберите тариф") and draw attention;
    - the status appears once the selection is complete.
  - **Per language:** the sentence is a next-intl rich message with tags (`Distribuce <distributor/>, sazba <tariff/>, program <program/>`).
    - Each language orders the tokens itself.
    - The tokens stay in "label: value" form, so Czech and Russian don't need declension of the inserted values.
  - The selection is saved to `localStorage`.
- **Validity:**
  - Small text: "Program valid until 31. 12. 2027".
  - After `validTo` (with no following period), show a banner saying the schedule may be outdated. The status is still shown.
- **Transition when the rate switches:**
  - The background crossfades between two stacked gradient layers.
  - The label's typography changes (variable font).
  - `theme-color` updates too.
  - With `prefers-reduced-motion`, the change is instant.
- **Nice-to-have, built last:**
  - a schedule dialog (shadcn `Dialog`) showing the week plus holidays as 24 h bars;
  - short tariff descriptions in all three languages.

## 5. i18n

- **`next-intl` without i18n routing.** The client-side provider has no `/cs` `/en` `/ru` URLs, so the page stays static and the PWA always opens `/`. We get ICU plurals (cs/ru) and date formatting for free.
- **Locale guess:** `@formatjs/intl-localematcher` matches `navigator.languages` against `['cs', 'en', 'ru']`.
  - The default is `cs`.
  - An explicit fallback map: `sk` → `cs`, `uk`/`be` → `ru`.
- A manual language switch overrides the guess and is saved to `localStorage`.
- Messages live in `messages/{cs,en,ru}.json`.

  | | low | high |
  |---|---|---|
  | en | LOW | HIGH |
  | cs | NÍZKÝ | VYSOKÝ |
  | ru | НИЗКИЙ | ВЫСОКИЙ |

## 6. PWA & hosting

- `app/manifest.ts`: `display: standalone`, theme colours, icons 192/512 plus a maskable icon.
- iOS: `apple-touch-icon` and `appleWebApp` metadata.
- A minimal service worker (`public/sw.js`) caches the app shell and data, so the app opens offline.
- Fully static. The status renders only on the client.
- Hosted on **Vercel**, deployed on push to `main`.

## 7. Phases

Each phase ends with a check-in before moving on.

1. **Inspect the PRE files in detail.** Confirm the column semantics for each file shape, list all PRE inconsistencies, and finalise the schema.
2. **Parsers + hook:** shared code, `parse-pre`, `parse-egd`/`parse-cez` stubs, and the pre-commit hook.
3. **Time logic:** `lib/schedule.ts` + Czech holidays + tests.
4. **Core UI:** shadcn setup, status, countdown, settings, i18n + locale guess, validity notice.
5. **Transitions:** LOW ↔ HIGH animation.
6. **PWA + Vercel:** manifest, icons, service worker, deploy. Test installing on iOS and Android.
7. **Nice-to-haves:** schedule dialog, tariff descriptions.

---

## Decided

- One parser per distributor (`parse-pre`, plus `parse-egd`/`parse-cez` failing with "not developed"). Input lives in `input/<distributor>/`.
- `input/` and `output/` are committed. The output is byte-stable.
- Validity is read from the HDO file header.
- Git: a pre-commit hook only, which regenerates output and aborts the commit on parser failure.
- Selection UI: an inline sentence with three dashed-underline combobox tokens: distributor (PRE only, others disabled inside the list) → tariff → program (which includes the device variant).
- UI: shadcn/ui. i18n: next-intl (no routing) + `@formatjs/intl-localematcher`. Languages: cs / en / ru.
- Countdown: `1:23:45` with live seconds.
- After expiry: show a banner and keep showing the status.
- Hosting: Vercel. No push notifications in v1.

## Still open

- First real test case: PRE, D57d, **AMM smart meter**. Program unknown: 573 (AMM `1052`) or 605 (AMM `1053`). The user will ask PRE.


## Appendix – NT programs per tariff (PRE, current program)

Multiple programs per tariff are the norm, not a D57d quirk. PRE staggers them to spread grid load. The number is the NT command / register. Counts come from the AMM table, which is the most complete.

| Tariff | Programs | Note |
|---|---|---|
| D25d / D26d | 9: 490, 492, 503, 508, 540, 551, 556, 567, 599 | |
| D45d | 5: 485, 501, 525, 533, 565 | all 5 differ |
| D35d | 2: 515, 543 | |
| D57d | 2: 573, 605 | |
| D27d | 262 (2 relay variants) | AMM/TOU only, no HDO |
| D56d (D55d) | 1: 517 | |
| D61d | 1: 586 | |
| C25d / C26d | 4: 487, 519, 524, 535 | |
| C45d | 2: 549, 597 | |
| C46d | 2: 493, 509 | TOU-T lists only 493 |
| C27d | 261 (2 relay variants) | AMM/TOU only |
| C35d | 1: 527 | |
| C56d (C55d) | 1: 517 | |

The HDO file also has "Sdílení 8 / 20" programs (541, 557) that aren't in the TOU tables. Phase 1 decides whether to include them.
