export function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h, s, l];
}

function hueToRgb(p: number, q: number, t: number) {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

export function hslToHex(h: number, s: number, l: number): string {
  let r: number;
  let g: number;
  let b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, h + 1 / 3);
    g = hueToRgb(p, q, h);
    b = hueToRgb(p, q, h - 1 / 3);
  }

  const toHex = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// 색 하나로 gradient 3톤(hi/mid/lo)을 상대 밝기로 파생시킨다 (섹션 1).
// 마스코트뿐 아니라 정원의 모든 코드 오브젝트(나무·연못·아이템)가 공유하는 규칙.
export function deriveShades(baseHex: string) {
  const [h, s, l] = hexToHsl(baseHex);
  return {
    hi: hslToHex(h, s, Math.min(0.92, l + 0.16)),
    mid: baseHex,
    lo: hslToHex(h, s, Math.max(0.15, l - 0.14)),
  };
}

export function deriveMascotShades(baseHex: string) {
  const [h, s, l] = hexToHsl(baseHex);
  const { hi, mid, lo } = deriveShades(baseHex);
  return {
    bodyHi: hi,
    bodyMid: mid,
    bodyLo: lo,
    footColor: hslToHex(h, Math.min(1, s + 0.05), Math.max(0.12, l - 0.26)),
  };
}
