export class ParseError extends Error {
  name = "ParseError";
}

/** Runs a parser's main function and turns failures into a readable message and exit code 1. */
export async function runParser(name: string, main: () => Promise<void> | void): Promise<void> {
  try {
    await main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\n✖ ${name} failed: ${message}`);
    if (!(error instanceof ParseError) && error instanceof Error) console.error(error.stack);
    process.exit(1);
  }
}

export function notDeveloped(name: string, distributor: string): void {
  console.error(`✖ ${name}: the ${distributor} parser is not developed yet.`);
  process.exit(1);
}

/** Re-throws any error from fn as a ParseError prefixed with where it happened. */
export function withContext<T>(fn: () => T, where: string): T {
  try {
    return fn();
  } catch (error) {
    throw new ParseError(`${where}: ${error instanceof Error ? error.message : error}`);
  }
}
