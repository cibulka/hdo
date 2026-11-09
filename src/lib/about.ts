// Server-only: the README's user-facing part (everything above "## Development") as HTML for the
// "What is this?" drawer. Read at module scope, so it is baked into the static page at build time.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { marked } from "marked";

const README = readFileSync(join(process.cwd(), "README.md"), "utf8");
const userPart = README.split(/^## Development\b/m)[0];

// Relative links (input/pre/, output/pre.json, …) point to the repository on GitHub.
const REPO = "https://github.com/cibulka/hdo/blob/main/";
const absolute = userPart.replace(/\]\((?!https?:|#)([^)]+)\)/g, (_, path: string) => `](${REPO}${path})`);

export const ABOUT_HTML = marked.parse(absolute, { async: false });
