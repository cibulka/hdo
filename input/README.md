# input/

Source spreadsheets from the distribution companies, one subfolder per distributor, as downloaded, unmodified.

| Folder | Distributor | Parser | Status |
|---|---|---|---|
| `pre/` | PREdistribuce (Prague) | `npm run parse-pre` | supported |
| `egd/` | EG.D (formerly E.ON Distribuce) | `npm run parse-egd` | not developed (fails) |
| `cez/` | ČEZ Distribuce | `npm run parse-cez` | not developed (fails) |

- These files are committed. They are the source of truth for `output/`.
- Each parser reads **its whole subfolder**.

## `pre/`

Download everything from the PREdistribuce HDO / TOU page:

- `aktualni-program-hdo-ke-stazeni.xls` – current HDO program, with validity in the header
- `nasledny-program-hdo-ke-stazeni.xls` – following HDO program (may contain only a note)
- `tou-tabulka-a.xlsx`, `tou-tabulka-t.xlsx` – TOU programs for meters with an internal time switch
- `tou-tabulka-amm.xlsx` – TOU programs for AMM smart meters

## Updating

1. Replace the files in the distributor's folder.
2. `git commit`: the pre-commit hook runs that distributor's parser and stages the regenerated `output/`. If the parser fails, the commit is aborted.
3. `git push`: Vercel deploys.
