(function () {
  const parentWindow = window.parent;
  const send = (message) => parentWindow.postMessage({ source: "dungeon-runner", ...message }, "*");

  function format(value, depth) {
    if (typeof value === "string") return depth === 0 ? value : JSON.stringify(value);
    if (value === null || value === undefined || typeof value !== "object") {
      if (typeof value === "function") return `[function ${value.name || "anonymous"}]`;
      return String(value);
    }
    if (typeof HTMLElement !== "undefined" && value instanceof HTMLElement) return `<${value.tagName.toLowerCase()}>`;
    if (value instanceof Error) return value.name + ": " + value.message;
    if (depth > 2) return Array.isArray(value) ? "[…]" : "{…}";
    if (Array.isArray(value)) {
      const items = value.slice(0, 50).map((v) => format(v, depth + 1));
      if (value.length > 50) items.push(`… ${value.length - 50} more`);
      return "[" + items.join(", ") + "]";
    }
    const entries = Object.keys(value)
      .slice(0, 30)
      .map((k) => k + ": " + format(value[k], depth + 1));
    return "{ " + entries.join(", ") + " }";
  }

  let logCount = 0;
  for (const level of ["log", "info", "warn", "error"]) {
    const original = console[level].bind(console);
    console[level] = (...args) => {
      original(...args);
      logCount++;
      if (logCount === 500) send({ type: "log", level: "warn", text: "Too many messages! Only showing the first 500." });
      if (logCount >= 500) return;
      send({ type: "log", level, text: args.map((a) => format(a, 0)).join(" ") });
    };
  }

  const blobToModule = new Map();

  function locate(stack, fallbackUrl, fallbackLine, fallbackCol) {
    const lines = String(stack || "").split("\n");
    for (const line of lines) {
      const m = /(blob:[^\s)]+?):(\d+):(\d+)/.exec(line);
      if (m && blobToModule.has(m[1])) return { module: blobToModule.get(m[1]), line: +m[2], col: +m[3] };
    }
    if (fallbackUrl && blobToModule.has(fallbackUrl)) {
      return { module: blobToModule.get(fallbackUrl), line: fallbackLine, col: fallbackCol };
    }
    return null;
  }

  let errorCount = 0;
  function reportError(error, url, line, col) {
    errorCount++;
    if (errorCount > 20) return;
    const message = error && error.message ? error.name + ": " + error.message : String(error);
    send({ type: "error", message, where: locate(error && error.stack, url, line, col) });
  }

  window.addEventListener("error", (event) => {
    reportError(event.error || event.message, event.filename, event.lineno, event.colno);
  });
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    // Browsers block sound until the player interacts with the page.
    if (reason && reason.name === "NotAllowedError") {
      event.preventDefault();
      return;
    }
    reportError(reason, null, 0, 0);
  });

  const canvas = document.getElementById("game");
  const updateFocus = () => document.body.classList.toggle("unfocused", !document.hasFocus());
  window.addEventListener("focus", updateFocus);
  window.addEventListener("blur", updateFocus);
  window.addEventListener("mousedown", () => {
    window.focus();
    canvas.focus();
  });
  window.addEventListener("keydown", (event) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
    // The tutorial's shortcuts keep working while the game has focus.
    if ((event.ctrlKey || event.metaKey) && (event.key === "Enter" || event.key.toLowerCase() === "s")) {
      event.preventDefault();
      send({ type: "shortcut", key: event.key.toLowerCase() });
    }
  });
  setInterval(updateFocus, 500);

  const factories = {};
  const cache = {};

  window.__define = (name, factory) => {
    factories[name] = factory;
  };

  function resolve(from, spec) {
    const parts = from.split("/");
    parts.pop();
    for (const piece of spec.replace(/\.(ts|js)$/, "").split("/")) {
      if (piece === "..") parts.pop();
      else if (piece !== ".") parts.push(piece);
    }
    return parts.join("/");
  }

  function load(name) {
    if (cache[name]) return cache[name].exports;
    const factory = factories[name];
    if (!factory) throw new Error(`Cannot find the file "${name}.ts". Check the spelling in your import.`);
    const module = { exports: {} };
    cache[name] = module;
    factory((spec) => load(resolve(name, spec)), module.exports, module);
    return module.exports;
  }

  function loadScript(name, code) {
    return new Promise((resolveScript) => {
      const url = URL.createObjectURL(
        new Blob([`__define(${JSON.stringify(name)}, function (require, exports, module) {${code}\n});`], {
          type: "text/javascript",
        }),
      );
      blobToModule.set(url, name);
      const script = document.createElement("script");
      script.src = url;
      script.onload = () => resolveScript();
      script.onerror = () => {
        send({ type: "error", message: `Couldn't load ${name}.ts into the game. Try pressing Play again.`, where: null });
        resolveScript();
      };
      document.body.appendChild(script);
    });
  }

  window.addEventListener("message", async (event) => {
    const data = event.data;
    if (!data || data.type !== "run") return;
    for (const [name, code] of Object.entries(data.modules)) await loadScript(name, code);
    window.focus();
    canvas.focus();
    updateFocus();
    send({ type: "started" });
    load(data.entry);
  });

  send({ type: "ready" });
})();
