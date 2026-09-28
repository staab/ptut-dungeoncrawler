const KEYWORDS = new Set([
  "const", "let", "var", "function", "return", "if", "else", "for", "while", "do", "break", "continue",
  "switch", "case", "default", "new", "import", "export", "from", "type", "interface", "as", "of", "in",
  "true", "false", "null", "undefined", "this", "typeof", "class", "extends", "void", "async", "await", "try", "catch",
]);

const TYPES = new Set(["string", "number", "boolean", "any", "never", "unknown"]);

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type Piece = { text: string; cls: string | null };

function lex(source: string): Piece[] {
  const pieces: Piece[] = [];
  let i = 0;
  const n = source.length;
  const push = (text: string, cls: string | null) => pieces.push({ text, cls });

  while (i < n) {
    const c = source[i];
    const rest = source.slice(i, i + 2);
    if (rest === "//") {
      let j = source.indexOf("\n", i);
      if (j < 0) j = n;
      push(source.slice(i, j), "com");
      i = j;
    } else if (rest === "/*") {
      let j = source.indexOf("*/", i + 2);
      j = j < 0 ? n : j + 2;
      push(source.slice(i, j), "com");
      i = j;
    } else if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < n && source[j] !== c) {
        if (source[j] === "\\") j++;
        else if (source[j] === "\n" && c !== "`") break;
        j++;
      }
      j = Math.min(n, j + 1);
      push(source.slice(i, j), "str");
      i = j;
    } else if (/[0-9]/.test(c)) {
      let j = i;
      while (j < n && /[0-9._a-fA-FxX]/.test(source[j])) j++;
      push(source.slice(i, j), "num");
      i = j;
    } else if (/[A-Za-z_$]/.test(c)) {
      let j = i;
      while (j < n && /[A-Za-z0-9_$]/.test(source[j])) j++;
      const word = source.slice(i, j);
      let k = j;
      while (k < n && source[k] === " ") k++;
      let cls: string | null = null;
      if (KEYWORDS.has(word)) cls = "kw";
      else if (TYPES.has(word) || /^[A-Z][a-z]/.test(word)) cls = "type";
      else if (/^[A-Z][A-Z0-9_]+$/.test(word)) cls = "const";
      else if (source[k] === "(") cls = "fn";
      else if (source[i - 1] === ".") cls = "prop";
      push(word, cls);
      i = j;
    } else {
      push(c, /[{}()[\]]/.test(c) ? "br" : /[=+\-*/<>!&|?:%]/.test(c) ? "op" : null);
      i++;
    }
  }
  return pieces;
}

export function highlightLines(source: string): string[] {
  const lines: string[] = [""];
  for (const piece of lex(source)) {
    const parts = piece.text.split("\n");
    parts.forEach((part, index) => {
      if (index > 0) lines.push("");
      if (part === "") return;
      const html = escapeHtml(part);
      lines[lines.length - 1] += piece.cls ? `<span class="t-${piece.cls}">${html}</span>` : html;
    });
  }
  return lines;
}

export function highlight(source: string): string {
  return highlightLines(source).join("\n");
}
