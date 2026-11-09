# Nízký tarif

**Is the low electricity rate on right now, and how long until it switches?**

A tiny web app for households with a two-rate electricity tariff in Prague. Pick your distributor, tariff, switching program and meter once; from then on the screen is **green** while the low rate (NT, *nízký tarif*) is on and **red** while the high rate (VT, *vysoký tarif*) is on, with a live countdown to the next switch.

## How to use it

1. Complete the sentence at the top: your **tariff** (on your contract or invoice), your **program** and your **device**.
   - The program number is printed on the label of an HDO receiver (e.g. `605` / `A4B8DP9`).
   - A smart meter (AMM) has no printed program – ask your distributor, or compare the switching times with when your boiler or heat pump turns on.
2. **Install it** to your phone's home screen: *Share → Add to Home Screen* in Safari, or *Install app* in Chrome. It then opens like an app and works offline.

The app speaks Czech, English and Russian – [hdo.cibulka.codes/cs](https://hdo.cibulka.codes/cs), [/en](https://hdo.cibulka.codes/en), [/ru](https://hdo.cibulka.codes/ru); the plain address picks your browser's language.

Your choice is stored only in your browser. The app has no accounts, no tracking and sends nothing anywhere.

## Tariffs

The two-rate household tariffs (**D…**) and their business counterparts (**C…**) are set nationally by the Energy Regulatory Office (ERÚ). The tariff defines *how many* hours of low rate you get each day; *when* they are is decided by the distributor and differs between programs and devices.

| Tariff | Low rate | Typically for |
|---|---|---|
| **D25d** | 8 h a day | storage water heater (boiler) |
| **D26d** | 8 h a day | storage (accumulation) heating |
| **D27d** | 8 h a day | electric vehicle charging |
| **D35d** | 16 h a day | hybrid electric heating |
| **D45d** | 20 h a day | direct electric heating |
| **D55d**, **D56d** | 22 h a day | heat pumps |
| **D57d** | 20 h a day | heat pumps and direct heating |
| **D61d** | weekends | weekend houses (low rate from Friday noon to Sunday evening) |
| **C25d** … **C56d** | as above | the same tariffs for businesses |

The hours above are nominal; the distributor's own tables are what the app shows, and they occasionally differ (for example, some PRE tables give D35d 20 h). The exact conditions are in ERÚ's annual price decision.

## Where the data comes from

The schedules are PREdistribuce's published HDO and TOU tables, stored unmodified in [`input/pre/`](input/pre/) and converted into [`output/pre.json`](output/pre.json). The app shows how long the current schedule is valid and warns once it has expired.

Only **PREdistribuce** (Prague) is supported so far; EG.D and ČEZ Distribuce publish their own tables.

This is an unofficial personal project, not affiliated with PRE or any distributor. The real switching is done by your receiver or meter, which can differ from the published tables by a few minutes – when it matters, check with your distributor.

## Development

Next.js (App Router, one statically prerendered page), TypeScript, Tailwind CSS, shadcn/ui, next-intl. Node 25 runs the TypeScript scripts directly.

```sh
npm install        # also installs the git hooks (.githooks/)
npm run dev        # http://localhost:3000
npm test           # node --test
npm run parse-pre  # input/pre/*.xls(x) → output/pre.json
npm run icons      # regenerate favicons and app icons
```

**Updating PRE data:** download the current files from PREdistribuce into `input/pre/` and commit – the pre-commit hook runs `npm run parse-pre` and adds the regenerated `output/pre.json` to the same commit. `parse-egd` and `parse-cez` are placeholders.

Layout: `src/` holds the code (`app`, `components`, `hooks`, `lib`, `messages`, `scripts`); `docs/`, `input/`, `output/` and `public/` stay in the root. The design and the decisions behind it are in [`docs/build-plan.md`](docs/build-plan.md).
