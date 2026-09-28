# Dungeon Crawler Tutorial

An interactive, in-browser tutorial that teaches an absolute beginner to build a top-down dungeon crawler in TypeScript, from `console.log("Hello, dungeon!")` to a three-level dungeon with six kinds of monster, loot, an inventory and a Slime King boss fight. The game uses no frameworks, only TypeScript and an HTML canvas.

The left pane explains each step and shows exactly what to type. The right pane holds the project's code and assets in a tabbed editor, alongside the running game and its console. **▶ Play** type-checks, compiles and runs the code in the browser.

## Running it

```sh
pnpm install
pnpm start          # builds everything, then serves http://localhost:5173
```

`pnpm build` rebuilds without serving; `pnpm serve` serves an existing build.

## How it works

- **13 chapters, 107 steps**, about 10 to 20 hours for a beginner. Each chapter starts from the code the previous chapter ended with.
- A step's **Next** button unlocks when the student's code matches the step and the whole program type-checks. Matching ignores whitespace, comments, semicolons, quote style and trailing commas, and some steps accept the student's own text or numbers.
- **Hint** points at the first line that differs; **Peek at the answer** opens the expected file read-only.
- Work is saved per chapter in `localStorage`. The **Chapters** menu jumps anywhere, resets a chapter, or plays the finished game.
- The TypeScript compiler runs in a Web Worker, and the game runs in a sandboxed iframe. Runtime errors point at the student's TypeScript lines.

## Layout

```
tutorial/          chapter sources (Markdown with edit instructions) and the starter file
app/               the tutorial UI (TypeScript, compiled to public/app)
public/            static site: index.html, style.css, the game runner iframe, compile worker
build/
  gen-assets.mjs   draws every sprite (16×16 PNG) and synthesizes every sound (WAV)
  build-tutorial.mjs  applies each step's edits and validates the whole tutorial
  smoke-run.mjs    runs student code headlessly with a fake canvas and keyboard
  serve.mjs        static file server
```

## Writing steps

Each `## Heading` in a chapter file is a step. Fenced blocks with an `op` attribute are the edits the student types; everything else is prose.

````md
```ts op=after file=main.ts anchor="const ctx = canvas"
ctx.imageSmoothingEnabled = false;
```
````

| op | effect |
|----|--------|
| `create` | new file with this content |
| `after` / `before` | insert below / above the one line containing `anchor` |
| `append` / `prepend` | add to the end / start of the file |
| `replace` | old lines, a `=====` line, then new lines (no new lines means delete) |

Add `loose=strings`, `loose=numbers` or `loose=all` to let the student use their own literals.

`pnpm build:tutorial` validates every step. The edit must apply cleanly, and the step's check must pass on the expected code and fail on the code before the step, so the student has to do the work. The program must also type-check and survive a headless run with random key presses. `node build/build-tutorial.mjs 7` validates only chapter 7.

## License

MIT. See [LICENSE](LICENSE).
