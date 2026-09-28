// Receives { id, files } and replies { id, diagnostics, outputs }.

importScripts("vendor/typescript.js");

let libs = null;
let options = null;
const libCache = new Map();
let oldProgram;

const ready = fetch("vendor/ts-libs.json")
  .then((r) => r.json())
  .then((data) => {
    libs = data.libs;
    options = ts.convertCompilerOptionsFromJson(data.options, "/").options;
  });

function basename(path) {
  return path.slice(path.lastIndexOf("/") + 1);
}

function compile(files) {
  const host = {
    getSourceFile(name, languageVersion) {
      if (name.startsWith("/lib/")) {
        const key = basename(name);
        if (!libs[key]) return undefined;
        if (!libCache.has(key)) libCache.set(key, ts.createSourceFile(name, libs[key], languageVersion));
        return libCache.get(key);
      }
      const text = files[name.slice(1)];
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
    fileExists: (f) => (f.startsWith("/lib/") ? !!libs[basename(f)] : files[f.slice(1)] !== undefined),
    readFile: (f) => (f.startsWith("/lib/") ? libs[basename(f)] : files[f.slice(1)]),
    directoryExists: () => true,
  };

  const rootNames = Object.keys(files)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => "/" + f);
  const program = ts.createProgram({ rootNames, options, host, oldProgram });
  oldProgram = program;

  const diagnostics = ts.getPreEmitDiagnostics(program).map((d) => {
    const message = ts.flattenDiagnosticMessageText(d.messageText, "\n");
    const category = d.category === ts.DiagnosticCategory.Error ? "error" : "warning";
    if (!d.file) return { file: null, line: 0, col: 0, message, category };
    const pos = d.file.getLineAndCharacterOfPosition(d.start || 0);
    return { file: d.file.fileName.slice(1), line: pos.line + 1, col: pos.character + 1, message, category };
  });

  const outputs = {};
  program.emit(undefined, (name, text) => {
    const module = name.slice(1).replace(/\.js(\.map)?$/, "");
    outputs[module] = outputs[module] || {};
    if (name.endsWith(".map")) outputs[module].map = text;
    else outputs[module].code = text.replace(/\n\/\/# sourceMappingURL=.*$/, "");
  });

  return { diagnostics, outputs };
}

self.onmessage = async (event) => {
  const { id, files } = event.data;
  try {
    await ready;
    self.postMessage({ id, ...compile(files) });
  } catch (error) {
    self.postMessage({
      id,
      diagnostics: [{ file: null, line: 0, col: 0, message: "The compiler crashed: " + error.message, category: "error" }],
      outputs: {},
    });
  }
};
