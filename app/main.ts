import { Editor } from "./editor.js";
import { Compiler, friendlyMessage, type CompileResult, type Diagnostic } from "./compiler.js";
import { Runner } from "./runner.js";
import { runCheck, type Check, type CheckResult } from "./tokens.js";
import { escapeHtml, highlight } from "./highlight.js";

type Files = Record<string, string>;
type Step = {
  title: string;
  intro: boolean;
  html: string;
  checks: Check[];
  broken: boolean;
  focus: string | null;
  solution: Files;
};
type Chapter = { id: string; title: string; subtitle: string; time: string; files: Files; steps: Step[]; endFiles?: Files };
type Asset = { path: string; kind: "image" | "sound" };
type Tutorial = { chapters: Chapter[]; assets: Asset[] };
type Tab = { id: string; kind: "file" | "asset" | "solution"; path: string };
type Progress = { chapter: number; step: number; reached: Record<string, number>; done: Record<string, boolean> };

type Status =
  | { kind: "info"; text: string }
  | { kind: "pending"; result: CheckResult }
  | { kind: "error"; diagnostic: Diagnostic }
  | { kind: "ok" }
  | { kind: "checking" };

const STORAGE = "dungeon-tutorial:v1:";
const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(STORAGE + key, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked, which only costs the student their saved progress.
  }
}

function remove(key: string) {
  try {
    localStorage.removeItem(STORAGE + key);
  } catch {}
}

let tutorial: Tutorial;
let progress: Progress = load("progress", { chapter: 0, step: 0, reached: {}, done: {} });
let files: Files = {};
let tabs: Tab[] = [];
let activeTab: string | null = null;
let status: Status = { kind: "checking" };
let hintOpen = false;
let evaluateTimer = 0;
let evaluateSerial = 0;

const compiler = new Compiler();
const editor = new Editor($("#editor-host"), (path, text) => {
  if (!path.startsWith("src/")) return;
  files[path] = text;
  saveFiles();
  scheduleEvaluate();
});
const runner = new Runner($("#game-host"), $("#console-output"), (file, line) => jumpTo(file, line));
runner.onStarted = () => runner.focusGame();
runner.onShortcut = (key) => {
  if (key === "enter") play();
  else toast("Your work saves automatically ✓");
};
let runSerial = 0;

const chapter = () => tutorial.chapters[progress.chapter];
const step = () => chapter().steps[progress.step];
const reached = () => progress.reached[chapter().id] ?? 0;
const saveFiles = () => save("files:" + chapter().id, files);
const saveProgress = () => save("progress", progress);

function openChapter(index: number) {
  if (progress.chapter !== index) stopGame();
  progress.chapter = index;
  const saved = load<Files | null>("files:" + chapter().id, null);
  files = saved ?? { ...chapter().files };
  if (!saved) saveFiles();
  if (progress.step >= chapter().steps.length) progress.step = 0;
  tabs = [];
  activeTab = null;
  const main = "src/main.ts";
  if (files[main] !== undefined) openTab({ id: "file:" + main, kind: "file", path: main }, false);
  for (const path of Object.keys(files).sort()) {
    if (path !== main) openTab({ id: "file:" + path, kind: "file", path }, false);
  }
  showTab("file:" + main);
  renderFileList();
  saveProgress();
}

function goToStep(index: number) {
  progress.step = Math.max(0, Math.min(index, chapter().steps.length - 1));
  progress.reached[chapter().id] = Math.max(reached(), progress.step);
  hintOpen = false;
  saveProgress();
  renderGuide();
  focusStepFile();
  evaluate();
}

function nextStep() {
  if (!canAdvance()) return;
  if (progress.step < chapter().steps.length - 1) {
    progress.reached[chapter().id] = Math.max(reached(), progress.step + 1);
    goToStep(progress.step + 1);
    return;
  }
  progress.done[chapter().id] = true;
  if (progress.chapter < tutorial.chapters.length - 1) {
    startChapter(progress.chapter + 1);
  } else {
    saveProgress();
    renderFinale();
  }
}

function startChapter(index: number) {
  progress.step = 0;
  openChapter(index);
  goToStep(0);
  $("#guide-scroll").scrollTop = 0;
}

function canAdvance() {
  const s = step();
  if (s.checks.length === 0) return true;
  if (progress.step < reached()) return true;
  return status.kind === "ok";
}

function scheduleEvaluate() {
  window.clearTimeout(evaluateTimer);
  evaluateTimer = window.setTimeout(evaluate, 450);
}

async function evaluate() {
  const serial = ++evaluateSerial;
  const s = step();
  const failed = s.checks.map((c) => runCheck(c, files)).find((r) => !r.ok);

  if (s.checks.length > 0 && failed) {
    setStatus({ kind: "pending", result: failed });
  } else if (s.checks.length > 0) {
    setStatus({ kind: "checking" });
  }

  const result = await compiler.compile(files);
  if (serial !== evaluateSerial) return;
  markErrors(result);
  if (s.checks.length === 0 || failed) {
    if (s.checks.length === 0) setStatus({ kind: "info", text: "" });
    return;
  }
  const error = result.diagnostics.find((d) => d.category === "error");
  setStatus(error ? { kind: "error", diagnostic: error } : { kind: "ok" });
}

function markErrors(result: CompileResult) {
  const path = editor.currentPath;
  const tab = tabs.find((t) => t.id === activeTab);
  if (!path || !tab || tab.kind !== "file") return;
  editor.setErrors(
    result.diagnostics
      .filter((d) => d.file === path && d.category === "error")
      .map((d) => ({ line: d.line, message: friendlyMessage(d.message) })),
  );
}

function setStatus(next: Status) {
  status = next;
  renderStatus();
}

function renderGuide() {
  const c = chapter();
  const s = step();
  const stepCount = c.steps.length - 1;
  $("#chapter-eyebrow").textContent = `Chapter ${progress.chapter + 1} of ${tutorial.chapters.length}`;
  $("#chapter-title").textContent = c.title;

  const dots = c.steps
    .map((st, i) => {
      if (i === 0) return "";
      const cls = ["dot"];
      if (i < progress.step || (i <= reached() && i !== progress.step)) cls.push("dot-done");
      if (i === progress.step) cls.push("dot-current");
      const clickable = i <= reached();
      return `<button class="${cls.join(" ")}" ${clickable ? "" : "disabled"} data-step="${i}" title="${escapeHtml(
        st.title,
      )}"></button>`;
    })
    .join("");
  $("#step-dots").innerHTML = dots;

  let html = "";
  if (s.intro) {
    html += `<div class="chapter-intro">
      <div class="chapter-number">Chapter ${progress.chapter + 1}</div>
      <h1>${escapeHtml(c.title)}</h1>
      ${c.subtitle ? `<p class="chapter-subtitle">${escapeHtml(c.subtitle)}</p>` : ""}
      ${c.time ? `<p class="chapter-time">⏱ ${escapeHtml(c.time)} · ${stepCount} steps</p>` : ""}
    </div>`;
    if (progress.chapter > 0) {
      html += `<aside class="callout callout-fresh"><p><strong>📦 Fresh start.</strong> This chapter begins with a clean copy
        of the code: exactly what you should have at the end of chapter ${progress.chapter}. Your own version is still saved.
        Pick chapter ${progress.chapter} in the <b>Chapters</b> menu to see it.</p></aside>`;
    }
  } else {
    html += `<div class="step-label">Step ${progress.step} of ${stepCount}</div><h2>${escapeHtml(s.title)}</h2>`;
  }
  html += s.html;
  const content = $("#step-content");
  content.innerHTML = html;
  $("#guide-scroll").scrollTop = 0;

  $<HTMLButtonElement>("#back-button").disabled = progress.step === 0 && progress.chapter === 0;
  renderStatus();
}

function renderStatus() {
  const s = step();
  const el = $("#status");
  const next = $<HTMLButtonElement>("#next-button");
  const hint = $<HTMLButtonElement>("#hint-button");
  const isLast = progress.step === chapter().steps.length - 1;
  const isFinal = isLast && progress.chapter === tutorial.chapters.length - 1;
  next.textContent = s.intro ? "Let's go →" : isFinal ? "Finish 🏆" : isLast ? "Next chapter →" : "Next →";
  next.disabled = !canAdvance();
  hint.hidden = true;

  let html = "";
  let cls = "status";
  if (s.checks.length === 0) {
    html = s.intro ? "" : "Nothing to type in this step. Read it, try things out, then press <b>Next</b>.";
  } else if (progress.step < reached() && status.kind !== "ok") {
    cls += " status-ok";
    html = "✓ You've already done this step.";
  } else if (status.kind === "checking") {
    html = "Checking your code…";
  } else if (status.kind === "pending") {
    hint.hidden = false;
    html = "✏️ Type the code above into the editor. I'll let you know when it looks right.";
    if (hintOpen) html += renderHint(status.result);
  } else if (status.kind === "error") {
    cls += " status-error";
    hint.hidden = true;
    const d = status.diagnostic;
    const where = d.file ? `<button class="link" data-jump-file="${d.file}" data-jump-line="${d.line}">${escapeHtml(
      d.file.replace(/^src\//, ""),
    )} line ${d.line}</button>` : "";
    html = `<b>Almost!</b> The code is all there, but there's a problem ${where ? "on " + where : ""}: ${escapeHtml(
      friendlyMessage(d.message),
    )}`;
  } else if (status.kind === "ok") {
    cls += " status-ok";
    html = "✅ <b>Looks right!</b> Press <b>▶ Play</b> to try it out, then <b>Next</b>.";
  }
  el.className = cls;
  el.innerHTML = html;
  el.hidden = html === "";
}

function renderHint(result: CheckResult): string {
  if (result.ok) return "";
  const name = escapeHtml(result.file.replace(/^src\//, ""));
  if (result.missingFile) {
    return `<div class="hint">There's no file called <b>${name}</b> yet. Click <b>+ New file</b> above the file list to make it.</div>`;
  }
  const code = (line: string) => `<pre class="code">${highlight(line.trim())}</pre>`;
  let html = `<div class="hint">`;
  if (result.deletion && result.goodLine) {
    html += `<p>In <b>${name}</b>, these two lines should end up right next to each other:</p>${code(result.goodLine)}${code(
      result.badLine,
    )}<p>Are there still some lines between them that need deleting?</p>`;
  } else if (result.goodLine) {
    html += `<p>In <b>${name}</b>, everything looks right up to here:</p>${code(result.goodLine)}
      <p>…but I can't find the next part:</p>${code(result.badLine)}`;
  } else {
    html += `<p>In <b>${name}</b>, I can't find this line:</p>${code(result.badLine)}`;
  }
  if (result.loose) html += `<p class="hint-tips">(It's fine to use your own words or numbers where the example has them.)</p>`;
  html += `<p class="hint-tips">Look closely at spelling, CAPITAL letters, brackets <code>( ) { } [ ]</code>, quotes and commas.
    Is it in the right place, and in the right file?</p>
    <div class="hint-actions">
      ${result.goodLine ? `<button class="small" data-hint-show>Show me where</button>` : ""}
      <button class="small" data-solution>Peek at the answer</button>
    </div></div>`;
  return html;
}

function renderFinale() {
  $("#chapter-eyebrow").textContent = "The End";
  $("#chapter-title").textContent = "You did it!";
  $("#step-dots").innerHTML = "";
  $("#step-content").innerHTML = `<div class="chapter-intro finale">
    <div class="chapter-number">🏆 Tutorial complete</div>
    <h1>You built a game!</h1>
    <p class="chapter-subtitle">From <code>console.log("Hello, dungeon!")</code> to a dungeon full of slimes, loot and a
    Slime King. Every line of it typed by you.</p></div>
    <p>The game is yours now. Keep changing it! The last chapter has a list of ideas to try. You can go back to any chapter
    using the <b>Chapters</b> menu.</p>`;
  $("#status").hidden = true;
  $<HTMLButtonElement>("#next-button").disabled = true;
}

function fileName(path: string) {
  return path.slice(path.lastIndexOf("/") + 1);
}

function renderFileList() {
  const src = Object.keys(files).sort((a, b) => (a === "src/main.ts" ? -1 : b === "src/main.ts" ? 1 : a.localeCompare(b)));
  const images = tutorial.assets.filter((a) => a.kind === "image");
  const sounds = tutorial.assets.filter((a) => a.kind === "sound");
  const item = (id: string, label: string, icon: string, deletable = false) =>
    `<li class="${activeTab === id ? "active" : ""}"><button class="file-item" data-open="${id}"><span class="file-icon">${icon}</span>${escapeHtml(
      label,
    )}</button>${deletable ? `<button class="file-delete" data-delete="${id}" title="Delete file">×</button>` : ""}</li>`;
  $("#file-list").innerHTML = `
    <div class="file-group">src</div>
    <ul>${src.map((p) => item("file:" + p, fileName(p), "📄", p !== "src/main.ts")).join("")}</ul>
    <div class="file-group">assets · pictures</div>
    <ul>${images.map((a) => item("asset:" + a.path, fileName(a.path), `<img src="${a.path}" alt="">`)).join("")}</ul>
    <div class="file-group">assets · sounds</div>
    <ul>${sounds.map((a) => item("asset:" + a.path, fileName(a.path), "🔊")).join("")}</ul>`;
}

function renderTabs() {
  $("#tabs").innerHTML = tabs
    .map((t) => {
      const label = t.kind === "solution" ? `${fileName(t.path)} (answer)` : fileName(t.path);
      return `<div class="tab ${t.id === activeTab ? "active" : ""} tab-${t.kind}" data-tab="${t.id}">
        <button class="tab-label" data-tab-open="${t.id}">${escapeHtml(label)}</button>
        <button class="tab-close" data-tab-close="${t.id}" title="Close">×</button></div>`;
    })
    .join("");
}

function openTab(tab: Tab, show = true) {
  if (!tabs.some((t) => t.id === tab.id)) tabs.push(tab);
  if (show) showTab(tab.id);
  else renderTabs();
}

function showTab(id: string | null) {
  activeTab = id;
  const tab = tabs.find((t) => t.id === id);
  const preview = $("#asset-preview");
  const editorHost = $("#editor-host");
  if (!tab) {
    editorHost.hidden = true;
    preview.hidden = false;
    preview.innerHTML = `<div class="empty">Pick a file from the list to open it.</div>`;
  } else if (tab.kind === "asset") {
    editorHost.hidden = true;
    preview.hidden = false;
    renderAsset(tab.path);
  } else {
    editorHost.hidden = false;
    preview.hidden = true;
    if (tab.kind === "file") editor.open(tab.path, files[tab.path] ?? "");
    else editor.open("solution:" + tab.path, solutionFor(tab.path), true);
    compiler.compile(files).then(markErrors);
  }
  renderTabs();
  renderFileList();
}

function closeTab(id: string) {
  const index = tabs.findIndex((t) => t.id === id);
  if (index < 0) return;
  tabs.splice(index, 1);
  if (activeTab === id) showTab(tabs[Math.min(index, tabs.length - 1)]?.id ?? null);
  else renderTabs();
}

function renderAsset(path: string) {
  const name = fileName(path);
  const base = name.replace(/\.\w+$/, "");
  const preview = $("#asset-preview");
  if (path.endsWith(".png")) {
    preview.innerHTML = `<div class="asset">
      <div class="asset-image"><img src="${path}" alt="${escapeHtml(name)}"></div>
      <h3>${escapeHtml(name)}</h3>
      <p>A 16 × 16 pixel picture. In the game it's drawn 3 times bigger, at 48 × 48.</p>
      <p>Its name for loading is <code>"${escapeHtml(base)}"</code> and its path is <code>"${escapeHtml(path)}"</code>.</p></div>`;
  } else {
    preview.innerHTML = `<div class="asset">
      <div class="asset-sound"><button class="play-sound">🔊 Play sound</button></div>
      <h3>${escapeHtml(name)}</h3>
      <p>A sound effect. Its name for loading is <code>"${escapeHtml(base)}"</code> and its path is
      <code>"${escapeHtml(path)}"</code>.</p></div>`;
    preview.querySelector(".play-sound")!.addEventListener("click", () => {
      new Audio(path).play().catch(() => {});
    });
  }
}

// Returns the file as of the latest step up to the current one that changed it.
function solutionFor(path: string): string {
  const steps = chapter().steps;
  for (let i = progress.step; i >= 0; i--) {
    if (steps[i].solution[path] !== undefined) return steps[i].solution[path];
  }
  return chapter().files[path] ?? "";
}

function jumpTo(path: string, line: number) {
  if (files[path] === undefined) return;
  openTab({ id: "file:" + path, kind: "file", path });
  requestAnimationFrame(() => editor.showLine(line));
}

function focusStepFile(opIndex = 0, focus = false) {
  const s = step();
  const ops = [...document.querySelectorAll<HTMLElement>("#step-content .op")];
  const op = ops[opIndex];
  const path = op?.dataset.file ?? s.focus;
  if (!path || files[path] === undefined) return;
  openTab({ id: "file:" + path, kind: "file", path });
  const find = op?.dataset.find;
  const lines = files[path].split("\n");
  let line = -1;
  if (find) line = lines.findIndex((l) => l.includes(find)) + 1;
  else if (find === "") line = Math.max(1, lines.length - (lines[lines.length - 1] === "" ? 1 : 0));
  if (line > 0) requestAnimationFrame(() => editor.showLine(line, true, focus));
}

function newFile() {
  const list = $("#file-list");
  const existing = list.querySelector(".new-file-form");
  if (existing) {
    existing.querySelector("input")!.focus();
    return;
  }
  const form = document.createElement("form");
  form.className = "new-file-form";
  form.innerHTML = `<input type="text" placeholder="name.ts" aria-label="New file name" spellcheck="false">
    <div class="new-file-error" hidden></div>`;
  list.prepend(form);
  const input = form.querySelector("input")!;
  const error = form.querySelector<HTMLElement>(".new-file-error")!;
  input.focus();
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let name = input.value.trim().replace(/^src\//, "");
    if (name && !name.includes(".")) name += ".ts";
    const problem = !/^[A-Za-z][A-Za-z0-9_-]*\.ts$/.test(name)
      ? "Use letters (no spaces), ending in .ts"
      : files["src/" + name] !== undefined
        ? "That file already exists."
        : null;
    if (problem) {
      error.textContent = problem;
      error.hidden = false;
      return;
    }
    const path = "src/" + name;
    files[path] = "";
    saveFiles();
    form.remove();
    openTab({ id: "file:" + path, kind: "file", path });
    editor.focus();
    scheduleEvaluate();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") form.remove();
  });
  input.addEventListener("blur", () => {
    if (!input.value.trim()) setTimeout(() => form.remove(), 150);
  });
}

function deleteFile(path: string) {
  if (!confirm(`Delete ${fileName(path)}? This can't be undone.`)) return;
  delete files[path];
  editor.forget(path);
  saveFiles();
  closeTab("file:" + path);
  renderFileList();
  scheduleEvaluate();
}

async function play(sourceFiles: Files = files, label = "your game") {
  const serial = ++runSerial;
  const button = $<HTMLButtonElement>("#play-button");
  button.disabled = true;
  button.textContent = "Compiling…";
  showRunArea();
  try {
    const result = await compiler.compile(sourceFiles);
    if (serial !== runSerial) return;
    runner.clear();
    const errors = result.diagnostics.filter((d) => d.category === "error");
    if (errors.length) {
      runner.stop();
      runner.printDiagnostics(errors);
      markErrors(result);
      return;
    }
    runner.print("info", `▶ Running ${escapeHtml(label)}…`);
    runner.run(result);
  } finally {
    if (serial === runSerial) {
      button.disabled = false;
      button.textContent = "▶ Play";
    }
  }
}

function stopGame() {
  runSerial++;
  runner.stop();
  const button = $<HTMLButtonElement>("#play-button");
  button.disabled = false;
  button.textContent = "▶ Play";
}

function showRunArea() {
  $("#workbench").classList.add("show-run");
}

function renderChapterMenu() {
  const menu = $("#chapter-menu");
  menu.innerHTML = `
    <ol class="chapter-list">${tutorial.chapters
      .map((c, i) => {
        const done = progress.done[c.id];
        const current = i === progress.chapter;
        return `<li class="${current ? "current" : ""}"><button data-chapter="${i}">
          <span class="chapter-check">${done ? "✓" : i + 1}</span>
          <span><b>${escapeHtml(c.title)}</b><small>${escapeHtml(c.subtitle)}</small></span></button></li>`;
      })
      .join("")}</ol>
    <div class="menu-actions">
      <button data-menu="finished">▶ Play the finished game</button>
      <button data-menu="reset" class="danger">↺ Reset this chapter's code</button>
    </div>`;
}

function toggleMenu(show?: boolean) {
  const menu = $("#chapter-menu");
  const visible = show ?? menu.hidden;
  if (visible) renderChapterMenu();
  menu.hidden = !visible;
  $("#menu-button").setAttribute("aria-expanded", String(visible));
}

function resetChapter() {
  if (!confirm("Put this chapter's code back the way it was at the start of the chapter? Your changes in this chapter will be lost.")) return;
  remove("files:" + chapter().id);
  const stepIndex = 0;
  progress.step = stepIndex;
  openChapter(progress.chapter);
  goToStep(stepIndex);
}

function makeSplitter(handle: HTMLElement, onDrag: (e: PointerEvent) => void) {
  handle.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    document.body.classList.add("dragging", handle.classList.contains("splitter-h") ? "dragging-row" : "dragging-col");
    const move = (ev: PointerEvent) => onDrag(ev);
    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
      handle.removeEventListener("lostpointercapture", up);
      document.body.classList.remove("dragging", "dragging-row", "dragging-col");
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
    handle.addEventListener("lostpointercapture", up);
  });
}

function setupLayout() {
  const app = $("#app");
  const layout = load("layout", { guide: 40, run: 45, game: 60 });
  const apply = () => {
    app.style.setProperty("--guide-width", layout.guide + "%");
    app.style.setProperty("--run-height", layout.run + "%");
    app.style.setProperty("--game-width", layout.game + "%");
    save("layout", layout);
  };
  apply();
  makeSplitter($("#split-guide"), (e) => {
    layout.guide = Math.min(65, Math.max(25, (e.clientX / window.innerWidth) * 100));
    apply();
  });
  makeSplitter($("#split-run"), (e) => {
    const rect = $("#editor-column").getBoundingClientRect();
    layout.run = Math.min(85, Math.max(15, ((rect.bottom - e.clientY) / rect.height) * 100));
    apply();
  });
  makeSplitter($("#split-game"), (e) => {
    const rect = $("#run-area").getBoundingClientRect();
    layout.game = Math.min(85, Math.max(20, ((e.clientX - rect.left) / rect.width) * 100));
    apply();
  });
}

function setupEvents() {
  $("#next-button").addEventListener("click", nextStep);
  $("#back-button").addEventListener("click", () => {
    if (progress.step > 0) goToStep(progress.step - 1);
    else if (progress.chapter > 0) {
      openChapter(progress.chapter - 1);
      goToStep(chapter().steps.length - 1);
    }
  });
  $("#hint-button").addEventListener("click", () => {
    hintOpen = !hintOpen;
    renderStatus();
  });
  $("#play-button").addEventListener("click", () => play());
  $("#stop-button").addEventListener("click", stopGame);
  $("#clear-console").addEventListener("click", () => runner.clear());
  $("#toggle-run").addEventListener("click", () => $("#workbench").classList.remove("show-run", "max-game"));
  $("#show-run").addEventListener("click", () => {
    const workbench = $("#workbench");
    workbench.classList.remove("max-game");
    workbench.classList.toggle("show-run");
  });
  $("#max-game").addEventListener("click", () => $("#workbench").classList.toggle("max-game"));
  $("#new-file-button").addEventListener("click", newFile);
  $("#menu-button").addEventListener("click", () => toggleMenu());

  $("#step-dots").addEventListener("click", (e) => {
    const dot = (e.target as HTMLElement).closest<HTMLElement>("[data-step]");
    if (dot) goToStep(Number(dot.dataset.step));
  });

  $("#step-content").addEventListener("click", (e) => {
    const button = (e.target as HTMLElement).closest<HTMLElement>(".show-me");
    if (button) focusStepFile(Number(button.dataset.op), true);
  });

  $("#status").addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const jump = target.closest<HTMLElement>("[data-jump-file]");
    if (jump) jumpTo(jump.dataset.jumpFile!, Number(jump.dataset.jumpLine));
    if (target.closest("[data-solution]") && status.kind === "pending" && !status.result.ok) {
      const path = status.result.file;
      openTab({ id: "solution:" + path, kind: "solution", path });
    }
    if (target.closest("[data-hint-show]") && status.kind === "pending" && !status.result.ok && status.result.goodLine) {
      const path = status.result.file;
      const good = status.result.goodLine.trim();
      const line = (files[path] ?? "").split("\n").findIndex((l) => l.trim() === good) + 1;
      if (line > 0) jumpTo(path, line);
    }
  });

  $("#file-list").addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const del = target.closest<HTMLElement>("[data-delete]");
    if (del) {
      deleteFile(del.dataset.delete!.replace(/^file:/, ""));
      return;
    }
    const open = target.closest<HTMLElement>("[data-open]");
    if (!open) return;
    const id = open.dataset.open!;
    const [kind, ...rest] = id.split(":");
    openTab({ id, kind: kind as Tab["kind"], path: rest.join(":") });
  });

  $("#tabs").addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const close = target.closest<HTMLElement>("[data-tab-close]");
    if (close) return closeTab(close.dataset.tabClose!);
    const open = target.closest<HTMLElement>("[data-tab-open]");
    if (open) showTab(open.dataset.tabOpen!);
  });

  $("#chapter-menu").addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const chapterButton = target.closest<HTMLElement>("[data-chapter]");
    if (chapterButton) {
      toggleMenu(false);
      const index = Number(chapterButton.dataset.chapter);
      if (index !== progress.chapter) {
        progress.step = 0;
        openChapter(index);
        goToStep(Math.min(reached(), chapter().steps.length - 1));
      }
      return;
    }
    const action = target.closest<HTMLElement>("[data-menu]")?.dataset.menu;
    if (action === "reset") {
      toggleMenu(false);
      resetChapter();
    } else if (action === "finished") {
      toggleMenu(false);
      const last = tutorial.chapters[tutorial.chapters.length - 1];
      play(last.endFiles ?? last.files, "the finished game");
    }
  });

  document.addEventListener("click", (e) => {
    const menu = $("#chapter-menu");
    if (!menu.hidden && !menu.contains(e.target as Node) && !$("#menu-button").contains(e.target as Node)) toggleMenu(false);
  });

  document.addEventListener("keydown", (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key === "Enter") {
      e.preventDefault();
      play();
    } else if (mod && e.key.toLowerCase() === "s") {
      e.preventDefault();
      toast("Your work saves automatically ✓");
    } else if (e.key === "Escape") {
      toggleMenu(false);
    }
  });
}

let toastTimer = 0;
function toast(text: string) {
  const el = $("#toast");
  el.textContent = text;
  el.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (el.hidden = true), 1800);
}

async function start() {
  setupLayout();
  setupEvents();
  const response = await fetch("tutorial.json");
  tutorial = await response.json();
  if (progress.chapter >= tutorial.chapters.length) progress = { chapter: 0, step: 0, reached: {}, done: {} };
  const stepIndex = progress.step;
  openChapter(progress.chapter);
  goToStep(Math.min(stepIndex, chapter().steps.length - 1));
  document.body.classList.remove("loading");
}

start().catch((error) => {
  $("#step-content").innerHTML = `<p class="load-error">Couldn't load the tutorial: ${escapeHtml(String(error))}</p>`;
});
