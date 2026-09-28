const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

type Segment = { genCol: number; srcLine: number };

function decodeVlq(text: string): number[] {
  const values: number[] = [];
  let shift = 0;
  let value = 0;
  for (const ch of text) {
    const digit = BASE64.indexOf(ch);
    value += (digit & 31) << shift;
    if (digit & 32) {
      shift += 5;
    } else {
      values.push(value & 1 ? -(value >> 1) : value >> 1);
      value = 0;
      shift = 0;
    }
  }
  return values;
}

export class SourceMap {
  private lines: Segment[][] = [];

  constructor(json: string) {
    const mappings: string = JSON.parse(json).mappings;
    let srcLine = 0;
    for (const lineText of mappings.split(";")) {
      const segments: Segment[] = [];
      let genCol = 0;
      for (const seg of lineText.split(",")) {
        if (!seg) continue;
        const v = decodeVlq(seg);
        genCol += v[0];
        if (v.length >= 4) {
          srcLine += v[2];
          segments.push({ genCol, srcLine });
        }
      }
      this.lines.push(segments);
    }
  }

  // Lines are 1-based.
  originalLine(line: number, col: number): number | null {
    for (let l = line - 1; l >= 0; l--) {
      const segments = this.lines[l];
      if (!segments || segments.length === 0) continue;
      let best = segments[0];
      for (const s of segments) if (s.genCol <= col - 1) best = s;
      return best.srcLine + 1;
    }
    return null;
  }
}
