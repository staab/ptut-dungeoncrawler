import { highlightLines } from "./highlight.js";

const INDENT = "  ";

type ViewState = { selectionStart: number; selectionEnd: number; scrollTop: number; scrollLeft: number };

export class Editor {
  readonly element: HTMLElement;
  private textarea: HTMLTextAreaElement;
  private highlightLayer: HTMLElement;
  private gutter: HTMLElement;
  private errors = new Map<number, string>();
  private targetLine: number | null = null;
  private views = new Map<string, ViewState>();
  private path: string | null = null;
  private renderQueued = false;

  constructor(
    host: HTMLElement,
    private onChange: (path: string, text: string) => void,
  ) {
    this.element = document.createElement("div");
    this.element.className = "editor";
    this.element.innerHTML = `
      <div class="editor-gutter"><div class="editor-gutter-inner"></div></div>
      <div class="editor-code">
        <pre class="editor-highlight" aria-hidden="true"></pre>
        <textarea class="editor-input" spellcheck="false" autocapitalize="off" autocomplete="off"
          autocorrect="off" wrap="off" aria-label="Code editor"></textarea>
      </div>`;
    host.appendChild(this.element);
    this.textarea = this.element.querySelector("textarea")!;
    this.highlightLayer = this.element.querySelector(".editor-highlight")!;
    this.gutter = this.element.querySelector(".editor-gutter-inner")!;

    this.textarea.addEventListener("input", () => {
      this.targetLine = null;
      this.render();
      requestAnimationFrame(() => this.syncScroll());
      if (this.path) this.onChange(this.path, this.textarea.value);
    });
    this.textarea.addEventListener("scroll", () => this.syncScroll());
    this.textarea.addEventListener("keydown", (e) => this.handleKey(e));
  }

  open(path: string, text: string, readOnly = false) {
    // Reassigning the textarea value would wipe its undo history.
    if (path === this.path && text === this.textarea.value) {
      this.textarea.readOnly = readOnly;
      this.element.classList.toggle("read-only", readOnly);
      return;
    }
    if (this.path) this.views.set(this.path, this.viewState());
    this.path = path;
    this.textarea.value = text;
    this.textarea.readOnly = readOnly;
    this.element.classList.toggle("read-only", readOnly);
    this.errors.clear();
    this.targetLine = null;
    this.render();
    const view = this.views.get(path);
    if (view) {
      this.textarea.setSelectionRange(view.selectionStart, view.selectionEnd);
      this.textarea.scrollTop = view.scrollTop;
      this.textarea.scrollLeft = view.scrollLeft;
    } else {
      this.textarea.setSelectionRange(0, 0);
      this.textarea.scrollTop = 0;
      this.textarea.scrollLeft = 0;
    }
    this.syncScroll();
  }

  get currentPath() {
    return this.path;
  }

  setText(text: string) {
    this.textarea.value = text;
    this.render();
  }

  forget(path: string) {
    this.views.delete(path);
  }

  focus() {
    this.textarea.focus({ preventScroll: true });
  }

  setErrors(errors: { line: number; message: string }[]) {
    this.errors = new Map(errors.map((e) => [e.line, e.message]));
    this.queueRender();
  }

  // Lines are 1-based.
  showLine(line: number, mark = true, focus = true) {
    this.targetLine = mark ? line : null;
    this.render();
    const lineHeight = this.lineHeight();
    const top = (line - 1) * lineHeight;
    const view = this.textarea.clientHeight;
    this.textarea.scrollTop = Math.max(0, top - view / 3);
    this.syncScroll();
    const offset = this.textarea.value.split("\n").slice(0, line - 1).join("\n").length + (line > 1 ? 1 : 0);
    const lineEnd = this.textarea.value.indexOf("\n", offset);
    const caret = lineEnd < 0 ? this.textarea.value.length : lineEnd;
    if (focus) {
      this.textarea.setSelectionRange(caret, caret);
      this.focus();
    }
    this.textarea.scrollTop = Math.max(0, top - view / 3);
    this.syncScroll();
  }

  private lineHeight() {
    return parseFloat(getComputedStyle(this.textarea).lineHeight) || 20;
  }

  private viewState(): ViewState {
    return {
      selectionStart: this.textarea.selectionStart,
      selectionEnd: this.textarea.selectionEnd,
      scrollTop: this.textarea.scrollTop,
      scrollLeft: this.textarea.scrollLeft,
    };
  }

  private queueRender() {
    if (this.renderQueued) return;
    this.renderQueued = true;
    requestAnimationFrame(() => {
      this.renderQueued = false;
      this.render();
    });
  }

  private render() {
    const lines = highlightLines(this.textarea.value);
    this.highlightLayer.innerHTML = lines
      .map((html, i) => {
        const n = i + 1;
        const cls = ["line"];
        if (this.errors.has(n)) cls.push("line-error");
        if (this.targetLine === n) cls.push("line-target");
        return `<div class="${cls.join(" ")}">${html || " "}</div>`;
      })
      .join("");
    this.gutter.innerHTML = lines
      .map((_, i) => {
        const n = i + 1;
        const error = this.errors.get(n);
        return error
          ? `<div class="gutter-line gutter-error" title="${error.replace(/"/g, "&quot;")}">${n}</div>`
          : `<div class="gutter-line">${n}</div>`;
      })
      .join("");
    this.syncScroll();
  }

  private syncScroll() {
    const { scrollTop, scrollLeft } = this.textarea;
    this.highlightLayer.style.transform = `translate(${-scrollLeft}px, ${-scrollTop}px)`;
    this.gutter.style.transform = `translateY(${-scrollTop}px)`;
  }

  private insert(text: string) {
    // execCommand keeps the browser's undo history working.
    if (!document.execCommand("insertText", false, text)) {
      this.textarea.setRangeText(text, this.textarea.selectionStart, this.textarea.selectionEnd, "end");
      this.textarea.dispatchEvent(new Event("input"));
    }
  }

  private selectedLineRange() {
    const value = this.textarea.value;
    const start = value.lastIndexOf("\n", this.textarea.selectionStart - 1) + 1;
    let end = value.indexOf("\n", Math.max(this.textarea.selectionEnd - 1, this.textarea.selectionStart));
    if (end < 0) end = value.length;
    return { start, end };
  }

  private handleKey(e: KeyboardEvent) {
    if (this.textarea.readOnly) return;
    // Keys pressed while an input method is composing belong to the IME.
    if (e.isComposing || e.keyCode === 229) return;
    const ta = this.textarea;
    const value = ta.value;

    if (e.key === "Tab") {
      e.preventDefault();
      const multiLine = value.slice(ta.selectionStart, ta.selectionEnd).includes("\n");
      if (!multiLine && !e.shiftKey) {
        this.insert(INDENT);
        return;
      }
      const caret = ta.selectionStart;
      const collapsed = ta.selectionStart === ta.selectionEnd;
      const { start, end } = this.selectedLineRange();
      const block = value.slice(start, end);
      const changed = block
        .split("\n")
        .map((line) => (e.shiftKey ? line.replace(/^ {1,2}/, "") : INDENT + line))
        .join("\n");
      if (changed === block) return;
      ta.setSelectionRange(start, end);
      this.insert(changed);
      if (collapsed) {
        const removed = block.length - changed.length;
        const newCaret = Math.max(start, caret - removed);
        ta.setSelectionRange(newCaret, newCaret);
      } else {
        ta.setSelectionRange(start, start + changed.length);
      }
      return;
    }

    if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const lineStart = value.lastIndexOf("\n", ta.selectionStart - 1) + 1;
      const before = value.slice(lineStart, ta.selectionStart);
      const indent = /^\s*/.exec(before)![0];
      const lastChar = before.trimEnd().slice(-1);
      const nextChar = value.slice(ta.selectionEnd).trimStart()[0];
      const opens = lastChar === "{" || lastChar === "[" || lastChar === "(";
      if (opens) {
        const pairs: Record<string, string> = { "{": "}", "[": "]", "(": ")" };
        const closesRightAway = nextChar === pairs[lastChar] && value.slice(ta.selectionEnd).split("\n")[0].trim() !== "";
        if (closesRightAway) {
          const caret = ta.selectionStart + 1 + indent.length + INDENT.length;
          this.insert("\n" + indent + INDENT + "\n" + indent);
          ta.setSelectionRange(caret, caret);
          return;
        }
        this.insert("\n" + indent + INDENT);
        return;
      }
      this.insert("\n" + indent);
      return;
    }

    if ((e.key === "}" || e.key === "]" || e.key === ")") && !e.ctrlKey && !e.metaKey) {
      const lineStart = value.lastIndexOf("\n", ta.selectionStart - 1) + 1;
      const before = value.slice(lineStart, ta.selectionStart);
      if (before.length >= INDENT.length && before.trim() === "" && ta.selectionStart === ta.selectionEnd) {
        e.preventDefault();
        ta.setSelectionRange(ta.selectionStart - INDENT.length, ta.selectionStart);
        this.insert(e.key);
      }
      return;
    }

    if (e.key === "/" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const { start, end } = this.selectedLineRange();
      const lines = value.slice(start, end).split("\n");
      const allCommented = lines.every((l) => l.trim() === "" || /^\s*\/\//.test(l));
      const changed = lines
        .map((l) => {
          if (l.trim() === "") return l;
          return allCommented ? l.replace(/^(\s*)\/\/ ?/, "$1") : l.replace(/^(\s*)/, "$1// ");
        })
        .join("\n");
      ta.setSelectionRange(start, end);
      this.insert(changed);
      ta.setSelectionRange(start, start + changed.length);
    }
  }
}
