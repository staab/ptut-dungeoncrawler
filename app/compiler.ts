export type Diagnostic = {
  file: string | null;
  line: number;
  col: number;
  message: string;
  category: "error" | "warning";
};

export type CompileResult = {
  diagnostics: Diagnostic[];
  outputs: Record<string, { code: string; map?: string }>;
};

type Pending = { resolve: (r: CompileResult) => void };

export class Compiler {
  private worker = new Worker("compile-worker.js");
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private lastKey = "";
  private lastResult: Promise<CompileResult> | null = null;

  constructor() {
    this.worker.onmessage = (event) => {
      const { id, ...result } = event.data;
      this.pending.get(id)?.resolve(result as CompileResult);
      this.pending.delete(id);
    };
    // Without this, a worker that fails to load leaves every compile pending forever.
    const fail = () => {
      const crashed: CompileResult = {
        diagnostics: [
          {
            file: null,
            line: 0,
            col: 0,
            message: "The TypeScript compiler couldn't load. Check your internet connection and reload the page.",
            category: "error",
          },
        ],
        outputs: {},
      };
      for (const p of this.pending.values()) p.resolve(crashed);
      this.pending.clear();
      this.lastKey = "";
    };
    this.worker.onerror = fail;
    this.worker.onmessageerror = fail;
  }

  // Identical requests share one compile.
  compile(files: Record<string, string>): Promise<CompileResult> {
    const sources: Record<string, string> = {};
    for (const [path, text] of Object.entries(files)) if (path.endsWith(".ts")) sources[path] = text;
    const key = JSON.stringify(sources);
    if (key === this.lastKey && this.lastResult) return this.lastResult;
    const id = this.nextId++;
    this.lastKey = key;
    this.lastResult = new Promise((resolve) => {
      this.pending.set(id, { resolve });
      this.worker.postMessage({ id, files: sources });
    });
    return this.lastResult;
  }
}

export function friendlyMessage(message: string): string {
  const rules: [RegExp, (m: RegExpMatchArray) => string][] = [
    [/^Cannot find name '(.+?)'\. Did you mean '(.+?)'\?/, (m) => `I don't know anything called "${m[1]}". Did you mean "${m[2]}"? Check the spelling and capital letters.`],
    [/^Cannot find name '(.+?)'/, (m) => `I don't know anything called "${m[1]}". Is it spelled right, with the same capital letters? Did you create it earlier in the file?`],
    [/^'(.+?)' expected/, (m) => `I expected a "${m[1]}" here. Something might be missing, like a bracket, comma or quote.`],
    [/^Unterminated string literal/, () => `This string never ends. Is a closing quote " missing?`],
    [/^Property '(.+?)' does not exist on type '(.+?)'/, (m) => `"${m[1]}" isn't part of ${m[2]}. Check the spelling?`],
    [/^Type '(.+?)' is not assignable to type '(.+?)'/, (m) => `You're trying to put a ${m[1]} where a ${m[2]} belongs.`],
    [/^Cannot assign to '(.+?)' because it is a constant/, (m) => `"${m[1]}" was made with const, so it can't be changed. Use let if it needs to change.`],
    [/^Declaration or statement expected/, () => `Something here doesn't fit. Often it's an extra or missing } bracket.`],
    [/^Cannot find module '(.+?)'/, (m) => `I can't find the file "${m[1]}". Does the file exist, and is the name spelled exactly the same?`],
    [/^Expected (\d+) arguments?, but got (\d+)/, (m) => `This function needs ${m[1]} value(s) in its parentheses, but got ${m[2]}.`],
    [/^Cannot redeclare block-scoped variable '(.+?)'/, (m) => `"${m[1]}" is created twice. Each name can only be made once. Did you type the same line twice?`],
    [/^Duplicate function implementation/, () => `There are two functions with the same name. Did you type this function twice?`],
    [/^Identifier expected/, () => `Something is missing here. Look for a missing name or an extra symbol.`],
    [/^Unexpected keyword or identifier/, () => `There's a word here I didn't expect. Maybe a missing comma, bracket or operator on this line or the one above?`],
  ];
  for (const [pattern, explain] of rules) {
    const m = message.match(pattern);
    if (m) return explain(m);
  }
  return message;
}
