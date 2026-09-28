// Runs compiled student code against a fake DOM and random key presses to catch runtime crashes.

import vm from "node:vm";

const KEYS = [
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
  "w", "a", "s", "d", "1", "2", "3", "4", "5", "6", " ", "Enter", "r", "x",
];

function makeContext2d() {
  const target = {
    measureText: (text) => ({ width: String(text).length * 8 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
  };
  return new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      return () => {};
    },
    set(t, prop, value) {
      if (prop === "fillStyle" || prop === "strokeStyle") {
        if (typeof value !== "string" && typeof value !== "object") throw new Error(`ctx.${String(prop)} set to ${value}`);
      }
      t[prop] = value;
      return true;
    },
  });
}

export function smokeRun(modules, { turns = 250, seed = 1 } = {}) {
  const logs = [];
  const listeners = {};
  let frameCallbacks = [];
  let timers = [];
  let now = 0;
  let rng = seed;
  const random = () => {
    rng = (rng * 16807) % 2147483647;
    return (rng - 1) / 2147483646;
  };

  const addListener = (type, fn) => {
    (listeners[type] ??= []).push(fn);
  };
  const canvas = {
    width: 768,
    height: 576,
    getContext: () => makeContext2d(),
    addEventListener: addListener,
    focus() {},
  };

  class FakeImage {
    constructor() {
      this.width = 16;
      this.height = 16;
      this.naturalWidth = 16;
      this.complete = true;
      this.onload = null;
    }
    set src(value) {
      this._src = value;
      timers.push(() => this.onload && this.onload());
    }
    get src() {
      return this._src;
    }
    addEventListener(type, fn) {
      if (type === "load") timers.push(fn);
    }
  }
  class FakeAudio {
    constructor(src) {
      this.src = src;
      this.volume = 1;
      this.currentTime = 0;
    }
    play() {
      return Promise.resolve();
    }
    pause() {}
    cloneNode() {
      return new FakeAudio(this.src);
    }
  }

  const sandboxMath = Object.create(Math);
  sandboxMath.random = random;

  const context = {
    console: {
      log: (...a) => logs.push(a),
      info: (...a) => logs.push(a),
      warn: (...a) => logs.push(a),
      error: (...a) => logs.push(a),
    },
    document: {
      getElementById: (id) => (id === "game" ? canvas : null),
      querySelector: () => canvas,
      addEventListener: addListener,
      body: { appendChild() {} },
    },
    Image: FakeImage,
    Audio: FakeAudio,
    HTMLCanvasElement: function () {},
    HTMLImageElement: FakeImage,
    requestAnimationFrame: (cb) => {
      frameCallbacks.push(cb);
      return frameCallbacks.length;
    },
    setTimeout: (cb) => {
      timers.push(cb);
      return timers.length;
    },
    clearTimeout: () => {},
    setInterval: (cb) => {
      timers.push(cb);
      return 0;
    },
    performance: { now: () => now },
    Date,
    Math: sandboxMath,
    JSON,
    Number,
    String,
    Array,
    Object,
    Boolean,
    Error,
    Promise,
    Record: undefined,
  };
  context.window = context;
  context.globalThis = context;
  context.window.addEventListener = addListener;
  vm.createContext(context);

  const cache = {};
  const load = (name) => {
    if (cache[name]) return cache[name].exports;
    const code = modules[name];
    if (code === undefined) throw new Error(`Cannot find module ${name}`);
    const module = { exports: {} };
    cache[name] = module;
    const fn = vm.runInContext(`(function (require, exports, module) {${code}\n})`, context, { filename: name + ".ts" });
    const dir = name.includes("/") ? name.slice(0, name.lastIndexOf("/")) : "";
    fn((spec) => load((dir ? dir + "/" : "") + spec.replace(/^\.\//, "").replace(/\.(ts|js)$/, "")), module.exports, module);
    return module.exports;
  };

  const flushTimers = () => {
    for (let guard = 0; timers.length && guard < 20; guard++) {
      const pending = timers;
      timers = [];
      pending.forEach((t) => t());
    }
  };
  const frame = () => {
    now += 16.7;
    const pending = frameCallbacks;
    frameCallbacks = [];
    pending.forEach((cb) => cb(now));
    flushTimers();
  };
  const press = (key) => {
    const event = { key, code: key, repeat: false, preventDefault() {}, stopPropagation() {} };
    (listeners.keydown ?? []).forEach((fn) => fn(event));
    (listeners.keyup ?? []).forEach((fn) => fn(event));
  };

  try {
    load("src/main");
    flushTimers();
    for (let i = 0; i < 5; i++) frame();
    for (let turn = 0; turn < turns; turn++) {
      press(KEYS[Math.floor(random() * KEYS.length)]);
      frame();
      if (turn % 10 === 0) for (let i = 0; i < 30; i++) frame();
    }
  } catch (e) {
    return { error: e && e.stack ? e.stack.split("\n").slice(0, 4).join("\n    ") : String(e), logs };
  }
  return { error: null, logs };
}
