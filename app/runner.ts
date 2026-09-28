import { SourceMap } from "./sourcemap.js";
import { escapeHtml } from "./highlight.js";
import type { CompileResult, Diagnostic } from "./compiler.js";
import { friendlyMessage } from "./compiler.js";

export type JumpTo = (file: string, line: number) => void;

export class Runner {
  private frame: HTMLIFrameElement | null;
  private maps = new Map<string, SourceMap>();
  private pendingModules: Record<string, string> | null = null;
  onStarted: () => void = () => {};
  onShortcut: (key: string) => void = () => {};

  constructor(
    private frameHost: HTMLElement,
    private consoleEl: HTMLElement,
    private jumpTo: JumpTo,
  ) {
    this.frame = null;
    window.addEventListener("message", (event) => {
      if (!this.frame || event.source !== this.frame.contentWindow) return;
      const data = event.data;
      if (!data || data.source !== "dungeon-runner") return;
      if (data.type === "ready" && this.pendingModules) {
        this.frame.contentWindow!.postMessage({ type: "run", modules: this.pendingModules, entry: "src/main" }, "*");
        this.pendingModules = null;
      } else if (data.type === "started") {
        this.onStarted();
      } else if (data.type === "log") {
        this.print(data.level, escapeHtml(data.text));
      } else if (data.type === "error") {
        this.printRuntimeError(data.message, data.where);
      } else if (data.type === "shortcut") {
        this.onShortcut(data.key);
      }
    });
    this.consoleEl.addEventListener("click", (event) => {
      const link = (event.target as HTMLElement).closest<HTMLElement>("[data-jump-file]");
      if (link) this.jumpTo(link.dataset.jumpFile!, Number(link.dataset.jumpLine));
    });
  }

  private createFrame(src: string) {
    const frame = document.createElement("iframe");
    frame.className = "game-frame";
    frame.title = "Your game";
    frame.setAttribute("sandbox", "allow-scripts");
    frame.setAttribute("allow", "autoplay");
    frame.src = src;
    this.frameHost.replaceChildren(frame);
    return frame;
  }

  run(result: CompileResult) {
    this.maps.clear();
    const modules: Record<string, string> = {};
    for (const [name, out] of Object.entries(result.outputs)) {
      modules[name] = out.code;
      if (out.map) this.maps.set(name, new SourceMap(out.map));
    }
    this.pendingModules = modules;
    // Each run gets a fresh frame so no state leaks between runs.
    this.frame = this.createFrame("runner.html");
    this.frameHost.classList.add("running");
  }

  stop() {
    this.pendingModules = null;
    this.frame = null;
    this.frameHost.innerHTML = `<div class="game-placeholder">Press <b>▶ Play</b> to run your game</div>`;
    this.frameHost.classList.remove("running");
  }

  focusGame() {
    this.frame?.focus();
  }

  clear() {
    this.consoleEl.replaceChildren();
  }

  print(level: string, html: string) {
    const line = document.createElement("div");
    line.className = `console-line console-${level}`;
    line.innerHTML = html;
    this.consoleEl.appendChild(line);
    while (this.consoleEl.childElementCount > 500) this.consoleEl.firstElementChild!.remove();
    this.consoleEl.scrollTop = this.consoleEl.scrollHeight;
  }

  private link(file: string, line: number) {
    const name = file.replace(/^src\//, "");
    return `<button class="console-link" data-jump-file="${escapeHtml(file)}" data-jump-line="${line}">${escapeHtml(name)} line ${line}</button>`;
  }

  printDiagnostics(diagnostics: Diagnostic[]) {
    const errors = diagnostics.filter((d) => d.category === "error");
    this.print(
      "error",
      `<strong>😬 Your code has ${errors.length === 1 ? "a problem" : errors.length + " problems"}, so it can't run yet.</strong>`,
    );
    for (const d of errors.slice(0, 8)) {
      const where = d.file ? this.link(d.file, d.line) + " " : "";
      const friendly = friendlyMessage(d.message);
      const original = friendly !== d.message ? `<div class="console-original">${escapeHtml(d.message)}</div>` : "";
      this.print("error", `${where}${escapeHtml(friendly)}${original}`);
    }
    if (errors.length > 8) this.print("error", `…and ${errors.length - 8} more. Fix the first ones first!`);
  }

  private printRuntimeError(message: string, where: { module: string; line: number; col: number } | null) {
    let location = "";
    if (where) {
      const map = this.maps.get(where.module);
      const line = map?.originalLine(where.line, where.col);
      if (line) location = this.link(where.module + ".ts", line) + " ";
    }
    this.print("error", `💥 ${location}${escapeHtml(message)}`);
  }
}
