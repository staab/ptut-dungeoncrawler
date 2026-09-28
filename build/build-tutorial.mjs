// Builds public/tutorial.json from tutorial/*.md and validates every step (see README).

import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { tokenize, runCheck, ANY_STRING, ANY_NUMBER } from "../public/app/tokens.js";
import { highlight, escapeHtml } from "../public/app/highlight.js";
import { smokeRun } from "./smoke-run.mjs";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tutorialDir = join(root, "tutorial");
const publicDir = join(root, "public");
const onlyChapter = process.argv[2] ? Number(process.argv[2]) : null;

export const COMPILER_OPTIONS = {
  target: "es2020",
  module: "commonjs",
  moduleResolution: "node10",
  strict: true,
  lib: ["es2020", "dom"],
  sourceMap: true,
  types: [],
  skipLibCheck: true,
  libReplacement: false,
  noFallthroughCasesInSwitch: true,
};

const libDir = dirname(require.resolve("typescript/lib/lib.d.ts"));

function collectLibs() {
  const libs = {};
  const queue = ["lib.es2020.d.ts", "lib.dom.d.ts"];
  while (queue.length) {
    const name = queue.pop();
    if (libs[name]) continue;
    libs[name] = readFileSync(join(libDir, name), "utf8");
    for (const m of libs[name].matchAll(/\/\/\/\s*<reference lib="([^"]+)"/g)) queue.push(`lib.${m[1].toLowerCase()}.d.ts`);
  }
  return libs;
}

const libs = collectLibs();
const parsedOptions = ts.convertCompilerOptionsFromJson(COMPILER_OPTIONS, "/").options;
const libCache = new Map();
let oldProgram;

function compile(files) {
  const host = {
    getSourceFile(name, languageVersion) {
      if (name.startsWith("/lib/")) {
        const key = basename(name);
        if (!libs[key]) return undefined;
        if (!libCache.has(key)) libCache.set(key, ts.createSourceFile(name, libs[key], languageVersion));
        return libCache.get(key);
      }
      const text = files[name.replace(/^\//, "")];
      return text === undefined ? undefined : ts.createSourceFile(name, text, languageVersion);
    },
    getDefaultLibFileName: () => "/lib/lib.d.ts",
    getDefaultLibLocation: () => "/lib",
    writeFile: () => {},
    getCurrentDirectory: () => "/",
    getDirectories: () => [],
    getCanonicalFileName: (f) => f,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => "\n",
    fileExists: (f) => (f.startsWith("/lib/") ? !!libs[basename(f)] : files[f.replace(/^\//, "")] !== undefined),
    readFile: (f) => files[f.replace(/^\//, "")],
    directoryExists: () => true,
  };
  const rootNames = Object.keys(files).filter((f) => f.endsWith(".ts")).map((f) => "/" + f);
  const program = ts.createProgram({ rootNames, options: parsedOptions, host, oldProgram });
  oldProgram = program;
  const diagnostics = ts.getPreEmitDiagnostics(program).map((d) => {
    const message = ts.flattenDiagnosticMessageText(d.messageText, "\n");
    if (!d.file) return message;
    const { line } = d.file.getLineAndCharacterOfPosition(d.start ?? 0);
    return `${d.file.fileName.slice(1)}:${line + 1}: ${message}`;
  });
  const output = {};
  program.emit(undefined, (name, text) => {
    if (name.endsWith(".js")) output[name.slice(1).replace(/\.js$/, "")] = text;
  });
  return { diagnostics, output };
}

function inline(text) {
  const codes = [];
  let html = text.replace(/`([^`]+)`/g, (_, code) => {
    codes.push(`<code>${escapeHtml(code)}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });
  html = html
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\[\[([^\]]+)\]\]/g, "<kbd>$1</kbd>");
  return html.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[Number(i)]);
}

function markdownBlocks(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i++;
    } else if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const body = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) body.push(lines[i++]);
      i++;
      const text = body.join("\n");
      out.push(`<pre class="code">${lang === "ts" || lang === "" ? highlight(text) : escapeHtml(text)}</pre>`);
    } else if (/^###\s/.test(line)) {
      out.push(`<h3>${inline(line.replace(/^###\s*/, ""))}</h3>`);
      i++;
    } else if (line.startsWith(">")) {
      const body = [];
      while (i < lines.length && lines[i].startsWith(">")) body.push(lines[i++].replace(/^>\s?/, ""));
      let cls = "note";
      const first = body[0] ?? "";
      const m = /^\*\*(Tip|Try it|Why|Heads up|Fun fact|Concept|Challenge|New word)[:!]?\*\*/i.exec(first);
      if (m) cls = m[1].toLowerCase().replace(/\s+/g, "-");
      out.push(`<aside class="callout callout-${cls}">${markdownBlocks(body)}</aside>`);
    } else if (/^\s*[-*]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) {
        let item = lines[i++].replace(/^\s*[-*]\s/, "");
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*[-*]\s/.test(lines[i])) item += " " + lines[i++].trim();
        items.push(`<li>${inline(item)}</li>`);
      }
      out.push(`<ul>${items.join("")}</ul>`);
    } else if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        let item = lines[i++].replace(/^\d+\.\s/, "");
        while (i < lines.length && /^\s{2,}\S/.test(lines[i])) item += " " + lines[i++].trim();
        items.push(`<li>${inline(item)}</li>`);
      }
      out.push(`<ol>${items.join("")}</ol>`);
    } else if (line.startsWith("<")) {
      const body = [];
      while (i < lines.length && lines[i].trim() !== "") body.push(lines[i++]);
      out.push(body.join("\n"));
    } else {
      const body = [];
      while (
        i < lines.length &&
        lines[i].trim() !== "" &&
        !/^(```|###\s|>|\s*[-*]\s|\d+\.\s)/.test(lines[i])
      ) body.push(lines[i++].trim());
      out.push(`<p>${inline(body.join(" "))}</p>`);
    }
  }
  return out.join("\n");
}

function parseAttrs(info) {
  const attrs = {};
  for (const m of info.matchAll(/(\w+)=(?:"([^"]*)"|'([^']*)'|(\S+))/g)) attrs[m[1]] = m[2] ?? m[3] ?? m[4];
  return attrs;
}

function parseChapter(source, fileName) {
  const lines = source.replace(/\r/g, "").split("\n");
  const meta = {};
  let i = 0;
  if (lines[0] === "---") {
    i = 1;
    while (lines[i] !== "---") {
      const m = /^(\w+):\s*(.*)$/.exec(lines[i]);
      if (m) meta[m[1]] = m[2];
      i++;
    }
    i++;
  }

  const sections = [{ title: meta.title, lines: [] }];
  for (; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) sections.push({ title: lines[i].slice(3).trim(), lines: [] });
    else sections[sections.length - 1].lines.push(lines[i]);
  }

  const steps = sections.map((section, index) => {
    const parts = [];
    let pending = [];
    const flushText = () => {
      if (pending.length) parts.push({ html: markdownBlocks(pending) });
      pending = [];
    };
    const flags = new Set();
    const ls = section.lines;
    for (let k = 0; k < ls.length; k++) {
      const flag = /^<!--\s*(\w[\w-]*)\s*-->$/.exec(ls[k].trim());
      if (flag) {
        flags.add(flag[1]);
        continue;
      }
      if (ls[k].startsWith("```") && /\bop=/.test(ls[k])) {
        flushText();
        const attrs = parseAttrs(ls[k].slice(3));
        const body = [];
        k++;
        while (k < ls.length && !ls[k].startsWith("```")) body.push(ls[k++]);
        parts.push({ op: { ...attrs, body } });
      } else {
        pending.push(ls[k]);
      }
    }
    flushText();
    return { title: section.title, intro: index === 0, parts, flags };
  });

  if (!meta.title) throw new Error(`${fileName}: missing title`);
  return { meta, steps };
}

const displayName = (file) => file.replace(/^src\//, "");

function findUniqueLine(lines, anchor, where) {
  const hits = lines.map((l, i) => (l.includes(anchor) ? i : -1)).filter((i) => i >= 0);
  if (hits.length !== 1) throw new Error(`${where}: anchor "${anchor}" found ${hits.length} times`);
  return hits[0];
}

function findBlock(lines, block, where) {
  const norm = (l) => l.trimEnd();
  const hits = [];
  for (let i = 0; i + block.length <= lines.length; i++) {
    if (block.every((b, k) => norm(lines[i + k]) === norm(b))) hits.push(i);
  }
  if (hits.length !== 1) {
    throw new Error(`${where}: replace block found ${hits.length} times:\n${block.join("\n")}`);
  }
  return hits[0];
}

const isMeaningful = (line) => {
  const t = line.trim();
  return t !== "" && !t.startsWith("//");
};

// Mutates `files` and returns the changed line range.
function applyOp(files, op, where) {
  const file = "src/" + op.file;
  if (!op.file) throw new Error(`${where}: op without file`);
  const body = op.body;
  if (op.op === "create") {
    if (files[file] !== undefined) throw new Error(`${where}: ${file} already exists`);
    files[file] = body.join("\n") + "\n";
    return { file, start: 0, count: body.length };
  }
  if (files[file] === undefined) throw new Error(`${where}: ${file} does not exist`);
  const lines = files[file].replace(/\n$/, "").split("\n");
  let start;
  let removed = 0;
  let inserted = body;
  let anchorLine = null;
  let oldLines = null;
  if (op.op === "after" || op.op === "before") {
    const at = findUniqueLine(lines, op.anchor, where);
    anchorLine = lines[at];
    start = op.op === "after" ? at + 1 : at;
  } else if (op.op === "append") {
    start = lines.length;
  } else if (op.op === "prepend") {
    start = 0;
  } else if (op.op === "replace") {
    const sep = body.findIndex((l) => l.trim() === "=====");
    if (sep < 0) throw new Error(`${where}: replace op needs a ===== separator`);
    oldLines = body.slice(0, sep);
    inserted = body.slice(sep + 1);
    start = findBlock(lines, oldLines, where);
    removed = oldLines.length;
  } else {
    throw new Error(`${where}: unknown op ${op.op}`);
  }
  lines.splice(start, removed, ...inserted);
  files[file] = lines.join("\n") + "\n";
  return { file, start, count: inserted.length, anchorLine, oldLines, inserted };
}

// A check covers the changed lines plus one line of code above and below, which pins its position.
function buildCheck(files, range, loose) {
  const lines = files[range.file].replace(/\n$/, "").split("\n");
  let from = range.start;
  let to = range.start + range.count; // exclusive
  let above = from - 1;
  while (above >= 0 && !isMeaningful(lines[above])) above--;
  if (above >= 0) from = above;
  let below = to;
  while (below < lines.length && !isMeaningful(lines[below])) below++;
  if (below < lines.length) to = below + 1;

  const region = lines.slice(from, to);
  // Trailing-comma removal depends on the next token, so tokenize the whole file.
  const tokens = tokenize(lines.join("\n"))
    .filter((t) => t.line >= from && t.line < to)
    .map((t) => ({ ...t, line: t.line - from }));
  const looseStrings = loose === "strings" || loose === "all";
  const looseNumbers = loose === "numbers" || loose === "all";
  return {
    file: range.file,
    tokens: tokens.map((t) => {
      if (looseStrings && (t.text.startsWith("S:") || t.text.startsWith("T:"))) return ANY_STRING;
      if (looseNumbers && t.text.startsWith("N:")) return ANY_NUMBER;
      return t.text;
    }),
    tokenLines: tokens.map((t) => t.line),
    lines: region,
    deletion: range.count === 0,
    loose: Boolean(loose),
  };
}

function codeBlock(lines, cls, addedSet) {
  const html = highlight(lines.join("\n")).split("\n");
  return `<pre class="code ${cls}">${html
    .map((l, i) => (addedSet && addedSet.has(i) ? `<span class="line-added">${l || " "}</span>` : l))
    .join("\n")}</pre>`;
}

function renderOp(op, range, index) {
  const name = `<b class="filename">${escapeHtml(displayName(range.file))}</b>`;
  const showMe = `<button class="show-me" data-op="${index}">Show me where</button>`;
  const find = (text) => escapeHtml(text.trim()).replace(/"/g, "&quot;");
  const typeThis = (lines, cls = "type-this") => codeBlock(lines, cls);
  switch (op.op) {
    case "create":
      return `<div class="op op-create" data-file="${range.file}">
        <p class="op-where">📄 Make a new file named ${name}: click the <b>+ New file</b> button above the file list and type <code>${escapeHtml(displayName(range.file))}</code>. Then type this into it:</p>
        ${typeThis(op.body)}</div>`;
    case "after":
    case "before":
      return `<div class="op" data-file="${range.file}" data-find="${find(op.anchor)}">
        <p class="op-where">In ${name}, find this line: ${showMe}</p>
        ${codeBlock([range.anchorLine.trim()], "anchor")}
        <p class="op-where">…and type ${op.op === "after" ? "these lines right <b>below</b> it" : "these lines right <b>above</b> it"}:</p>
        ${typeThis(op.body)}</div>`;
    case "append":
      return `<div class="op" data-file="${range.file}" data-find="">
        <p class="op-where">Add this to the very <b>bottom</b> of ${name}: ${showMe}</p>
        ${typeThis(op.body)}</div>`;
    case "prepend":
      return `<div class="op" data-file="${range.file}" data-find="">
        <p class="op-where">Add this to the very <b>top</b> of ${name}:</p>
        ${typeThis(op.body)}</div>`;
    case "replace": {
      const firstOld = range.oldLines.find((l) => l.trim() !== "") ?? "";
      const oldSet = new Set(range.oldLines.map((l) => l.trim()));
      const added = new Set(range.inserted.map((l, i) => (oldSet.has(l.trim()) ? -1 : i)).filter((i) => i >= 0));
      const newSet = new Set(range.inserted.map((l) => l.trim()));
      const removed = new Set(range.oldLines.map((l, i) => (newSet.has(l.trim()) ? -1 : i)).filter((i) => i >= 0));
      const oldHtml = highlight(range.oldLines.join("\n"))
        .split("\n")
        .map((l, i) => (removed.has(i) ? `<span class="line-removed">${l || " "}</span>` : l))
        .join("\n");
      if (range.inserted.length === 0) {
        return `<div class="op" data-file="${range.file}" data-find="${find(firstOld)}">
          <p class="op-where">In ${name}, find these lines: ${showMe}</p>
          <pre class="code anchor">${oldHtml}</pre>
          <p class="op-where">…and <b>delete</b> them.</p></div>`;
      }
      return `<div class="op" data-file="${range.file}" data-find="${find(firstOld)}">
        <p class="op-where">In ${name}, find ${range.oldLines.length === 1 ? "this line" : "these lines"}: ${showMe}</p>
        <pre class="code anchor">${oldHtml}</pre>
        <p class="op-where">…and change ${range.oldLines.length === 1 ? "it" : "them"} to this <span class="legend">(new parts are highlighted)</span>:</p>
        ${codeBlock(range.inserted, "type-this", added)}</div>`;
    }
  }
}

function build() {
  const chapterFiles = readdirSync(tutorialDir).filter((f) => /^\d\d-.*\.md$/.test(f)).sort();
  const starterDir = join(tutorialDir, "starter");
  let files = {};
  for (const f of readdirSync(starterDir)) files["src/" + f] = readFileSync(join(starterDir, f), "utf8");

  const chapters = [];
  let problems = 0;
  const fail = (msg) => {
    problems++;
    console.error("✗ " + msg);
  };

  chapterFiles.forEach((chapterFile, chapterIndex) => {
    const { meta, steps } = parseChapter(readFileSync(join(tutorialDir, chapterFile), "utf8"), chapterFile);
    const chapter = {
      id: chapterFile.replace(/\.md$/, ""),
      title: meta.title,
      subtitle: meta.subtitle ?? "",
      time: meta.time ?? "",
      files: { ...files },
      steps: [],
    };
    const checking = onlyChapter === null || onlyChapter === chapterIndex + 1;

    steps.forEach((step, stepIndex) => {
      const where = `${chapterFile} › "${step.title}"`;
      const before = { ...files };
      const checks = [];
      const html = [];
      const touched = new Set();
      let opIndex = 0;
      for (const part of step.parts) {
        if (part.html !== undefined) {
          html.push(part.html);
          continue;
        }
        const op = part.op;
        let range;
        try {
          range = applyOp(files, op, where);
        } catch (e) {
          fail(e.message);
          continue;
        }
        touched.add(range.file);
        html.push(renderOp(op, range, opIndex++));
        checks.push({ range, loose: op.loose });
      }
      // Checks use context from the finished step.
      const builtChecks = checks.map(({ range, loose }) => buildCheck(files, range, loose));

      if (checking) {
        for (const check of builtChecks) {
          if (!runCheck(check, files).ok) fail(`${where}: check fails against its own expected code (${check.file})`);
        }
        if (builtChecks.length && builtChecks.every((c) => runCheck(c, before).ok)) {
          fail(`${where}: checks already pass before the step — the student wouldn't need to do anything`);
        }
        const { diagnostics, output } = compile(files);
        const compiles = diagnostics.length === 0;
        if (!compiles && !step.flags.has("broken")) {
          fail(`${where}: code does not type-check:\n    ${diagnostics.join("\n    ")}`);
        }
        if (compiles && step.flags.has("broken")) fail(`${where}: marked broken but compiles fine`);
        if (compiles) {
          const result = smokeRun(output, { turns: step.flags.has("quick") ? 20 : 250 });
          if (result.error) fail(`${where}: crashed while running:\n    ${result.error}`);
        }
      }

      const firstOp = step.parts.find((p) => p.op)?.op;
      chapter.steps.push({
        title: step.title,
        intro: step.intro,
        html: html.join("\n"),
        checks: builtChecks,
        broken: step.flags.has("broken"),
        focus: firstOp ? "src/" + firstOp.file : null,
        solution: Object.fromEntries([...touched].map((f) => [f, files[f]])),
      });
    });

    chapter.endFiles = { ...files };
    chapters.push(chapter);
    const stepCount = chapter.steps.filter((s) => !s.intro).length;
    console.log(`${checking ? "✓" : "·"} ${chapterFile}: ${stepCount} steps`);
  });

  const assets = readdirSync(join(publicDir, "assets")).sort().map((f) => ({
    path: "assets/" + f,
    kind: f.endsWith(".png") ? "image" : "sound",
  }));

  // Each chapter's end state is the next chapter's start, so only the last one is kept.
  chapters.forEach((c, i) => {
    if (i < chapters.length - 1) delete c.endFiles;
  });

  writeFileSync(join(publicDir, "tutorial.json"), JSON.stringify({ chapters, assets }));

  mkdirSync(join(publicDir, "vendor"), { recursive: true });
  copyFileSync(join(libDir, "typescript.js"), join(publicDir, "vendor", "typescript.js"));
  writeFileSync(join(publicDir, "vendor", "ts-libs.json"), JSON.stringify({ options: COMPILER_OPTIONS, libs }));

  if (problems) {
    console.error(`\n${problems} problem(s) found.`);
    process.exit(1);
  }
  console.log(`Wrote public/tutorial.json (${chapters.length} chapters)`);
}

if (!existsSync(join(publicDir, "app", "tokens.js"))) {
  console.error("Run `pnpm build:app` first.");
  process.exit(1);
}
build();
