// Tokens ignore whitespace, comments, semicolons, quote style and trailing commas.

export type Token = { text: string; line: number };

export type Check = {
  file: string;
  tokens: string[];
  tokenLines: number[];
  lines: string[];
  deletion: boolean;
  loose: boolean;
};

export type CheckResult =
  | { ok: true }
  | {
      ok: false;
      file: string;
      missingFile: boolean;
      goodLine: string | null;
      badLine: string;
      deletion: boolean;
      loose: boolean;
    };

const OPERATORS = ["===", "!==", "...", "**=", "==", "!=", "<=", ">=", "&&", "||", "=>", "++", "--", "+=", "-=", "*=", "/=", "%=", "**", "?.", "??"];

export const ANY_STRING = "S:*";
export const ANY_NUMBER = "N:*";

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 0;
  const n = source.length;

  while (i < n) {
    const c = source[i];
    if (c === "\n") {
      line++;
      i++;
    } else if (c === " " || c === "\t" || c === "\r") {
      i++;
    } else if (c === "/" && source[i + 1] === "/") {
      while (i < n && source[i] !== "\n") i++;
    } else if (c === "/" && source[i + 1] === "*") {
      i += 2;
      while (i < n && !(source[i] === "*" && source[i + 1] === "/")) {
        if (source[i] === "\n") line++;
        i++;
      }
      i += 2;
    } else if (c === '"' || c === "'") {
      const start = line;
      let j = i + 1;
      let body = "";
      while (j < n && source[j] !== c && source[j] !== "\n") {
        if (source[j] === "\\" && j + 1 < n) {
          const next = source[j + 1];
          body += next === '"' || next === "'" ? next : "\\" + next;
          j += 2;
        } else {
          body += source[j++];
        }
      }
      tokens.push({ text: "S:" + body, line: start });
      i = j + 1;
    } else if (c === "`") {
      const start = line;
      let j = i + 1;
      while (j < n && source[j] !== "`") {
        if (source[j] === "\\") j++;
        else if (source[j] === "\n") line++;
        j++;
      }
      tokens.push({ text: "T:" + source.slice(i + 1, j), line: start });
      i = j + 1;
    } else if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(source[i + 1] ?? ""))) {
      let j = i;
      while (j < n && /[0-9._a-fA-FxX]/.test(source[j])) j++;
      tokens.push({ text: "N:" + source.slice(i, j), line });
      i = j;
    } else if (/[A-Za-z_$]/.test(c)) {
      let j = i;
      while (j < n && /[A-Za-z0-9_$]/.test(source[j])) j++;
      tokens.push({ text: source.slice(i, j), line });
      i = j;
    } else {
      const op = OPERATORS.find((o) => source.startsWith(o, i));
      const text = op ?? c;
      if (text !== ";") tokens.push({ text, line });
      i += text.length;
    }
  }

  return tokens.filter((t, k) => !(t.text === "," && [")", "]", "}"].includes(tokens[k + 1]?.text ?? "")));
}

function matches(expected: string, actual: string): boolean {
  if (expected === actual) return true;
  if (expected === ANY_STRING) return actual.startsWith("S:") || actual.startsWith("T:");
  if (expected === ANY_NUMBER) return actual.startsWith("N:");
  return false;
}

export function containsSequence(haystack: string[], needle: string[], length = needle.length): boolean {
  if (length === 0) return true;
  outer: for (let i = 0; i + length <= haystack.length; i++) {
    for (let k = 0; k < length; k++) {
      if (!matches(needle[k], haystack[i + k])) continue outer;
    }
    return true;
  }
  return false;
}

export function runCheck(check: Check, files: Record<string, string>): CheckResult {
  const source = files[check.file];
  if (source === undefined) {
    return { ok: false, file: check.file, missingFile: true, goodLine: null, badLine: "", deletion: false, loose: false };
  }
  const actual = tokenize(source).map((t) => t.text);
  if (containsSequence(actual, check.tokens)) return { ok: true };

  // The longest matching prefix locates the first line that differs.
  let lo = 0;
  let hi = check.tokens.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (containsSequence(actual, check.tokens, mid)) lo = mid;
    else hi = mid - 1;
  }
  const badLine = check.lines[check.tokenLines[Math.min(lo, check.tokens.length - 1)]] ?? "";
  const goodLine = lo > 0 ? check.lines[check.tokenLines[lo - 1]] : null;
  return {
    ok: false,
    file: check.file,
    missingFile: false,
    goodLine: goodLine === badLine ? null : goodLine,
    badLine,
    deletion: check.deletion,
    loose: check.loose,
  };
}
