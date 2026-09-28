// Draws every 16x16 sprite from a text grid and synthesizes every sound effect.

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "assets");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function hex(color) {
  const n = parseInt(color.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function sprite(name, palette, rows) {
  if (rows.length !== 16) throw new Error(`${name}: expected 16 rows, got ${rows.length}`);
  const rgba = Buffer.alloc(16 * 16 * 4);
  rows.forEach((row, y) => {
    if (row.length !== 16) throw new Error(`${name}: row ${y} is ${row.length} wide`);
    [...row].forEach((ch, x) => {
      if (ch === ".") return;
      const color = palette[ch];
      if (!color) throw new Error(`${name}: no color for '${ch}'`);
      const [r, g, b] = hex(color);
      rgba.set([r, g, b, 255], (y * 16 + x) * 4);
    });
  });
  writeFileSync(join(outDir, `${name}.png`), encodePng(16, 16, rgba));
}

// A dark outline keeps sprites readable against the floor.
function outlined(rows) {
  const grid = rows.map((r) => [...r]);
  const out = grid.map((r) => [...r]);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (grid[y][x] !== ".") continue;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const c = grid[y + dy]?.[x + dx];
        return c !== undefined && c !== "." && c !== "#";
      });
      if (near) out[y][x] = "#";
    }
  }
  return out.map((r) => r.join(""));
}

const OUTLINE = "#1a1020";

const floorRows = [
  "AAAAAAABAAAAAAAB",
  "AACAAAABAAAAAAAB",
  "AAAAAAABAAAACAAB",
  "AAAAAAABAAAAAAAB",
  "AAAAACABAAAAAAAB",
  "AAAAAAABACAAAAAB",
  "AAAAAAABAAAAAAAB",
  "BBBBBBBBBBBBBBBB",
  "AAABAAAAAAABAAAA",
  "AAABAAAAAAABACAA",
  "ACABAAAAAAABAAAA",
  "AAABAAAACAABAAAA",
  "AAABAAAAAAABAAAA",
  "AAABAACAAAABAAAA",
  "AAABAAAAAAABAAAA",
  "BBBBBBBBBBBBBBBB",
];
sprite("floor", { A: "#3d3450", B: "#2e2740", C: "#4a4060" }, floorRows);

const brickA = ["HHHHHHHMHHHHHHHM", "RRRRRRRMRRRRRRRM", "RRRRRRSMRRRRRRSM", "MMMMMMMMMMMMMMMM"];
const brickB = ["HHHMHHHHHHHMHHHH", "RRRMRRRRRRRMRRRR", "RRSMRRRRRRSMRRRR", "MMMMMMMMMMMMMMMM"];
sprite(
  "wall",
  { H: "#9a86b8", R: "#77649a", S: "#5d4d7c", M: "#221a30" },
  [...brickA, ...brickB, ...brickA, ...brickB],
);

sprite("stairs", { B: "#2e2740", H: "#a898c0", S: "#6e5f8a", K: "#120c1a" }, [
  "BBBBBBBBBBBBBBBB",
  "BHHHHHHHHHHHHHHB",
  "BSSSSSSSSSSSSSSB",
  "BKKHHHHHHHHHHHHB",
  "BKKSSSSSSSSSSSSB",
  "BKKKKHHHHHHHHHHB",
  "BKKKKSSSSSSSSSSB",
  "BKKKKKKHHHHHHHHB",
  "BKKKKKKSSSSSSSSB",
  "BKKKKKKKKHHHHHHB",
  "BKKKKKKKKSSSSSSB",
  "BKKKKKKKKKKHHHHB",
  "BKKKKKKKKKKSSSSB",
  "BKKKKKKKKKKKKHHB",
  "BKKKKKKKKKKKKSSB",
  "BBBBBBBBBBBBBBBB",
]);

sprite("door", { M: "#2a1a10", W: "#9a6232", D: "#6a3e1a", I: "#8d96a0", Y: "#f4c542", K: "#140a05" }, [
  "MMMMMMMMMMMMMMMM",
  "MWWWDWWWWDWWWWWM",
  "MWWWDWWWWDWWWWWM",
  "MIIIIIIIIIIIIIIM",
  "MWWWDWWWWDWWWWWM",
  "MWWWDWWWWDWWWWWM",
  "MWWWDWYYYYWWWWWM",
  "MWWWDWYKKYWWWWWM",
  "MWWWDWYKKYWWWWWM",
  "MWWWDWYYKYWWWWWM",
  "MWWWDWWWWDWWWWWM",
  "MWWWDWWWWDWWWWWM",
  "MIIIIIIIIIIIIIIM",
  "MWWWDWWWWDWWWWWM",
  "MWWWDWWWWDWWWWWM",
  "MMMMMMMMMMMMMMMM",
]);

sprite(
  "barbarian",
  { "#": OUTLINE, W: "#f3ead2", G: "#9aa3ad", S: "#f2b58a", K: "#1a1020", O: "#e8762b", B: "#8a5a2b", N: "#5a3418" },
  outlined([
    "................",
    "..W..........W..",
    "..WW.GGGGGG.WW..",
    "...WGGGGGGGGW...",
    "....GGGGGGGG....",
    "....SSSSSSSS....",
    "....SKSSSSKS....",
    "....SSSSSSSS....",
    "...OOOSSSSOOO...",
    "..SSOOOOOOOOSS..",
    "..SS.OOOOOO.SS..",
    "..SS.SSSSSS.SS..",
    ".....BBBBBB.....",
    ".....BB..BB.....",
    ".....SS..SS.....",
    "....NNN..NNN....",
  ]),
);

sprite("tombstone", { "#": OUTLINE, G: "#8a8f99", L: "#b4b9c2", D: "#5c606a", F: "#5aa04a" }, outlined([
  "................",
  "................",
  ".....GGGGGG.....",
  "....GLLGGGGG....",
  "...GLGGGGGGGG...",
  "...GLGGDGGGGG...",
  "...GGGDDDGGGG...",
  "...GGGGDGGGGG...",
  "...GGGGDGGGGG...",
  "...GGGGGGGGGG...",
  "...GGDGDGDDGG...",
  "...GGGGGGGGGG...",
  "...GGGGGGGGGG...",
  ".FFGGGGGGGGGGFF.",
  "FFFFFFFFFFFFFFFF",
  "................",
]));

const slimeRows = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "......GGGG......",
  "....GGGGGGGG....",
  "...GGLGGGGGGG...",
  "..GGLGGGGGGGGG..",
  "..GGGKWGGKWGGG..",
  "..GGGKKGGKKGGG..",
  ".GGGGGGGGGGGGGG.",
  ".GGGGGDDDDGGGGG.",
  ".GGGGGGDDGGGGGG.",
  "..DDDDDDDDDDDD..",
  "................",
];
sprite("slime", { "#": OUTLINE, G: "#6cd06a", L: "#c4f5b0", D: "#3e8a45", K: "#1a1020", W: "#ffffff" }, outlined(slimeRows));

sprite("bat", { "#": OUTLINE, P: "#8a5cc8", D: "#5e3a94", Y: "#ffe45c", W: "#ffffff" }, outlined([
  "................",
  "................",
  "................",
  "................",
  "D.....P..P.....D",
  "DD....PPPP....DD",
  "DPD..PPPPPP..DPD",
  "DPPDPPYPPYPPDPPD",
  "DPPPPPPPPPPPPPPD",
  ".DPPPPPWWPPPPPD.",
  "..DPD.PPPP.DPD..",
  "...D..PPPP..D...",
  ".......PP.......",
  "................",
  "................",
  "................",
]));

sprite("skeleton", { "#": OUTLINE, W: "#eeeadf", S: "#b9b3a3", K: "#1a1020" }, outlined([
  ".....WWWWWW.....",
  "....WWWWWWWW....",
  "....WKKWWKKW....",
  "....WKKWWKKW....",
  "....WWWWWWWW....",
  ".....WKWWKW.....",
  "......WWWW......",
  "....W..WW..W....",
  "...W.WSWWSW.W...",
  "...W..SWWS..W...",
  "......SWWS......",
  "......WSSW......",
  "......W..W......",
  ".....W....W.....",
  ".....W....W.....",
  "....WW....WW....",
]));

sprite("mushroom", { "#": OUTLINE, R: "#e0443e", W: "#fff4e6", C: "#f2dcb8", K: "#1a1020", D: "#b02a28" }, outlined([
  "................",
  "................",
  ".....RRRRRR.....",
  "...RRWWRRRRRR...",
  "..RRWWWRRRWWRR..",
  ".RRRRWRRRRWWRRR.",
  ".RRRRRRRRRRRRRR.",
  "RRWWRRRRRRRRWWRR",
  "DDDDDDDDDDDDDDDD",
  "...CCCCCCCCCC...",
  "...CKKCCCCKKC...",
  "...CCKCCCCKCC...",
  "...CCCCCCCCCC...",
  "...CCCKKKKCCC...",
  "....CCCCCCCC....",
  "................",
]));

sprite("ghost", { "#": OUTLINE, L: "#dff3ff", B: "#a9d8f5", K: "#1a1020", P: "#ff8fb1" }, outlined([
  "................",
  "......LLLL......",
  "....LLLLLLLL....",
  "...LLLLLLLLLL...",
  "..LLLLLLLLLLLL..",
  "..LLKKLLLLKKLL..",
  "..LLKKLLLLKKLL..",
  "..LLLLLLLLLLLL..",
  "..LLLLLKKLLLLL..",
  "..LLLLLKPLLLLL..",
  "..LLLLLLLLLLLL..",
  "..BLLLLLLLLLLB..",
  "..BBLLLLLLLLBB..",
  "..BBBLBBBBLBBB..",
  "..B...BBBB...B..",
  "................",
]));

sprite(
  "king_slime",
  { "#": OUTLINE, Y: "#ffd23f", R: "#e0443e", G: "#ff7fbf", L: "#ffd0ea", D: "#c24488", K: "#1a1020", W: "#ffffff" },
  outlined([
    "................",
    "...Y...YY...Y...",
    "...YY..YY..YY...",
    "...YYYYRRYYYY...",
    "...YYYYYYYYYY...",
    "..GGGGGGGGGGGG..",
    ".GGLGGGGGGGGGGG.",
    ".GLGGGGGGGGGGGG.",
    "GGGGKWGGGGKWGGGG",
    "GGGGKKGGGGKKGGGG",
    "GGGGGGGGGGGGGGGG",
    "GGGGGDDDDDDGGGGG",
    "GGGGGGDDDDGGGGGG",
    "GGGGGGGGGGGGGGGG",
    ".DDDDDDDDDDDDDD.",
    "................",
  ]),
);

sprite("gold", { "#": OUTLINE, O: "#c98a1a", Y: "#ffd23f", L: "#fff3a8" }, outlined([
  "................",
  "................",
  ".....OOOOOO.....",
  "....OYYYYYYO....",
  "...OYLLYYYYYO...",
  "..OYLYYOOYYYYO..",
  "..OYLYOYYYYYYO..",
  "..OYYYYOOYYYYO..",
  "..OYYYYYYOYYYO..",
  "..OYYYYOOYYYYO..",
  "...OYYYYYYYYO...",
  "....OYYYYYYO....",
  ".....OOOOOO.....",
  "................",
  "................",
  "................",
]));

sprite("potion", { "#": OUTLINE, C: "#a0692e", G: "#d7eef7", R: "#ff4f6d", W: "#ffd6de" }, outlined([
  "................",
  "......CCCC......",
  "......CCCC......",
  ".......GG.......",
  ".......GG.......",
  "......GGGG......",
  ".....GRRRRG.....",
  "....GRWRRRRG....",
  "...GRWRRRRRRG...",
  "...GRRRRRRRRG...",
  "...GRRRRRRRRG...",
  "...GRRRRRRRRG...",
  "....GRRRRRRG....",
  ".....GGGGGG.....",
  "................",
  "................",
]));

sprite("pepper", { "#": OUTLINE, G: "#4cae3c", R: "#ff3b2f", W: "#ffb3a8", D: "#b81d14" }, outlined([
  "................",
  "..........G.....",
  ".........GG.....",
  "........GGG.....",
  ".......RRRR.....",
  "......RWRRRR....",
  "......RWRRRR....",
  ".....RRRRRRD....",
  ".....RRRRRD.....",
  "....RRRRRRD.....",
  "....RRRRRD......",
  "...RRRRRD.......",
  "..RRRRDD........",
  ".RRRDD..........",
  ".RD.............",
  "................",
]));

sprite("key", { "#": OUTLINE, O: "#c98a1a", Y: "#ffd23f" }, outlined([
  "................",
  "................",
  "................",
  "................",
  "..OOOO..........",
  ".OYYYYO.........",
  "OYYOOYYO........",
  "OYO..OYOOOOOOOO.",
  "OYO..OYYYYYYYYYO",
  "OYYOOYYOOOOYOYO.",
  ".OYYYYO....YOYO.",
  "..OOOO.....OOOO.",
  "................",
  "................",
  "................",
  "................",
]));

sprite("axe", { "#": OUTLINE, S: "#b9c2cc", L: "#eef3f7", B: "#8a5a2b" }, outlined([
  "................",
  "..........SS....",
  ".........SSSL...",
  "........SSSSSL..",
  "........SBBSSSL.",
  ".........BBSSSL.",
  "........BB.SSL..",
  ".......BB...L...",
  "......BB........",
  ".....BB.........",
  "....BB..........",
  "...BB...........",
  "..BB............",
  ".BB.............",
  "................",
  "................",
]));

sprite("hammer", { "#": OUTLINE, D: "#5c606a", I: "#a7adb7", L: "#e4e8ee", B: "#8a5a2b", R: "#c0392b" }, outlined([
  "................",
  "...DDDDDDDDDD...",
  "..DIIIIIIIIIID..",
  "..DILLIIIIIIID..",
  "..DILIIIIIIIID..",
  "..DIIIIIIIIIID..",
  "...DDDDDDDDDD...",
  ".......BB.......",
  ".......BB.......",
  ".......BB.......",
  ".......BB.......",
  ".......BB.......",
  "......RRRR......",
  "......RRRR......",
  ".......BB.......",
  "................",
]));

sprite("helmet", { "#": OUTLINE, D: "#4a4f5a", I: "#8d96a0", L: "#dfe4ea" }, outlined([
  "................",
  "................",
  "................",
  "................",
  ".......DD.......",
  "....DDDDDDDD....",
  "...DIIIIIIIID...",
  "..DDDDDDDDDDDD..",
  "DD.DIIIIIIIID.DD",
  "D..DILIIIIIID..D",
  "DD.DILIIIIIID.DD",
  "...DIIIIIIIID...",
  "...DIIIIIIIID...",
  "....DDDDDDDD....",
  "................",
  "................",
]));

sprite("armor", { "#": OUTLINE, D: "#5c6c8a", I: "#a9c1e8", L: "#eaf2ff", Y: "#ffd23f" }, outlined([
  "................",
  "................",
  "...DD......DD...",
  "..DIID....DIID..",
  "..DIIIDDDDIIID..",
  "..DIILIIIIIIID..",
  "..DIILIIIIIIID..",
  "...DILIIIIIID...",
  "...DIIIIIIIID...",
  "...DIIIYYIIID...",
  "...DIIIYYIIID...",
  "...DIIIIIIIID...",
  "....DIIIIIID....",
  ".....DDDDDD.....",
  "................",
  "................",
]));

const heartRows = [
  "................",
  "................",
  "...KKK....KKK...",
  "..KRRRK..KRRRK..",
  ".KRWRRRKKRRRRRK.",
  ".KRWRRRRRRRRRRK.",
  ".KRRRRRRRRRRRRK.",
  ".KRRRRRRRRRRRRK.",
  "..KRRRRRRRRRRK..",
  "...KRRRRRRRRK...",
  "....KRRRRRRK....",
  ".....KRRRRK.....",
  "......KRRK......",
  ".......KK.......",
  "................",
  "................",
];
sprite("heart", { K: OUTLINE, R: "#ff4f6d", W: "#ffd6de" }, heartRows);
sprite("heart_empty", { K: OUTLINE, R: "#3a3048", W: "#4a3e5c" }, heartRows);

const RATE = 22050;

function writeWav(name, samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767 * 0.6), i * 2));
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(join(outDir, `${name}.wav`), Buffer.concat([header, data]));
}

const wave = {
  square: (p) => (p % 1 < 0.5 ? 1 : -1),
  pulse: (p) => (p % 1 < 0.25 ? 1 : -1),
  triangle: (p) => 4 * Math.abs((p % 1) - 0.5) - 1,
  sine: (p) => Math.sin(p * 2 * Math.PI),
  saw: (p) => 2 * (p % 1) - 1,
};

// Each note: { freq, to (slide target), dur (seconds), type, vol }
function tones(notes) {
  const out = [];
  let noise = 1;
  for (const n of notes) {
    const len = Math.floor(n.dur * RATE);
    let phase = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const freq = n.freq + ((n.to ?? n.freq) - n.freq) * t;
      phase += freq / RATE;
      let s;
      if (n.type === "noise") {
        if (i % Math.max(1, Math.floor(RATE / freq)) === 0) noise = Math.random() * 2 - 1;
        s = noise;
      } else if (n.type === "rest") {
        s = 0;
      } else {
        s = wave[n.type ?? "square"](phase);
      }
      const attack = Math.min(1, i / (RATE * 0.004));
      const decay = n.sustain ? 1 - t * 0.3 : 1 - t;
      out.push(s * attack * decay * (n.vol ?? 0.5));
    }
  }
  return out;
}

const note = (name) => {
  const names = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
  const m = /^([A-G])(#?)(\d)$/.exec(name);
  const semis = names[m[1]] + (m[2] ? 1 : 0) + (Number(m[3]) - 4) * 12;
  return 440 * Math.pow(2, semis / 12);
};

writeWav("hit", tones([
  { type: "noise", freq: 4000, dur: 0.04, vol: 0.6 },
  { type: "square", freq: 220, to: 70, dur: 0.1, vol: 0.5 },
]));
writeWav("hurt", tones([{ type: "saw", freq: 400, to: 120, dur: 0.22, vol: 0.5 }]));
writeWav("coin", tones([
  { type: "pulse", freq: note("B5"), dur: 0.06, vol: 0.4, sustain: true },
  { type: "pulse", freq: note("E6"), dur: 0.2, vol: 0.4 },
]));
writeWav("pickup", tones([
  { type: "square", freq: note("C5"), dur: 0.05, vol: 0.35, sustain: true },
  { type: "square", freq: note("E5"), dur: 0.05, vol: 0.35, sustain: true },
  { type: "square", freq: note("G5"), dur: 0.12, vol: 0.35 },
]));
writeWav("potion", tones([
  { type: "sine", freq: 300, to: 500, dur: 0.07, vol: 0.6 },
  { type: "sine", freq: 350, to: 600, dur: 0.07, vol: 0.6 },
  { type: "sine", freq: 400, to: 800, dur: 0.12, vol: 0.6 },
]));
writeWav("powerup", tones(
  ["C5", "E5", "G5", "C6", "E6", "G6"].map((n, i) => ({ type: "square", freq: note(n), dur: i === 5 ? 0.2 : 0.045, vol: 0.35, sustain: i !== 5 })),
));
writeWav("equip", tones([
  { type: "noise", freq: 8000, dur: 0.03, vol: 0.3 },
  { type: "triangle", freq: note("A4"), dur: 0.06, vol: 0.6, sustain: true },
  { type: "triangle", freq: note("A5"), dur: 0.15, vol: 0.6 },
]));
writeWav("door", tones([
  { type: "saw", freq: 90, to: 140, dur: 0.25, vol: 0.4, sustain: true },
  { type: "noise", freq: 1500, dur: 0.08, vol: 0.4 },
]));
writeWav("stairs", tones(
  ["G5", "E5", "C5", "G4", "E4"].map((n) => ({ type: "triangle", freq: note(n), dur: 0.08, vol: 0.6, sustain: true })),
));
writeWav("bump", tones([{ type: "triangle", freq: 120, to: 80, dur: 0.06, vol: 0.5 }]));
writeWav("defeat", tones([
  { type: "square", freq: 200, to: 900, dur: 0.12, vol: 0.35 },
  { type: "noise", freq: 6000, dur: 0.06, vol: 0.3 },
]));
writeWav("win", tones([
  ...["C5", "E5", "G5"].map((n) => ({ type: "square", freq: note(n), dur: 0.1, vol: 0.35, sustain: true })),
  { type: "square", freq: note("C6"), dur: 0.18, vol: 0.35, sustain: true },
  { type: "square", freq: note("G5"), dur: 0.1, vol: 0.35, sustain: true },
  { type: "square", freq: note("C6"), dur: 0.45, vol: 0.35 },
]));
writeWav("lose", tones([
  { type: "triangle", freq: note("G4"), to: note("F#4"), dur: 0.3, vol: 0.6, sustain: true },
  { type: "triangle", freq: note("F#4"), to: note("F4"), dur: 0.3, vol: 0.6, sustain: true },
  { type: "triangle", freq: note("F4"), to: note("E4"), dur: 0.3, vol: 0.6, sustain: true },
  { type: "triangle", freq: note("E4"), to: note("D#4"), dur: 0.8, vol: 0.6 },
]));

console.log(`Generated ${readdirSync(outDir).length} assets in public/assets`);
