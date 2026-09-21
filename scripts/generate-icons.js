import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'apps', 'web', 'public');

const COLORS = {
  navy: [30, 58, 138],
  blue: [59, 130, 246],
  lightBlue: [147, 197, 253],
  softBlue: [219, 234, 254],
  softPink: [252, 231, 243],
  slate: [226, 232, 240],
  white: [248, 250, 252],
  red: [239, 68, 68],
};

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createCanvas(size) {
  return {
    size,
    data: Buffer.alloc(size * size * 3, 0),
  };
}

function setPixel(canvas, x, y, rgb) {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= canvas.size || yi >= canvas.size) return;
  const i = (yi * canvas.size + xi) * 3;
  canvas.data[i] = rgb[0];
  canvas.data[i + 1] = rgb[1];
  canvas.data[i + 2] = rgb[2];
}

function fillRect(canvas, x, y, w, h, rgb) {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(canvas.size, Math.ceil(x + w));
  const y1 = Math.min(canvas.size, Math.ceil(y + h));
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      setPixel(canvas, px, py, rgb);
    }
  }
}

function fillRoundedRect(canvas, x, y, w, h, r, rgb) {
  const radius = Math.min(r, w / 2, h / 2);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.ceil(x + w);
  const y1 = Math.ceil(y + h);

  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const lx = px - x;
      const ly = py - y;
      let inside = true;

      if (lx < radius && ly < radius) {
        const dx = radius - lx;
        const dy = radius - ly;
        inside = dx * dx + dy * dy <= radius * radius;
      } else if (lx > w - radius && ly < radius) {
        const dx = lx - (w - radius);
        const dy = radius - ly;
        inside = dx * dx + dy * dy <= radius * radius;
      } else if (lx < radius && ly > h - radius) {
        const dx = radius - lx;
        const dy = ly - (h - radius);
        inside = dx * dx + dy * dy <= radius * radius;
      } else if (lx > w - radius && ly > h - radius) {
        const dx = lx - (w - radius);
        const dy = ly - (h - radius);
        inside = dx * dx + dy * dy <= radius * radius;
      } else if (lx < 0 || ly < 0 || lx > w || ly > h) {
        inside = false;
      }

      if (inside) setPixel(canvas, px, py, rgb);
    }
  }
}

function fillCircle(canvas, cx, cy, r, rgb) {
  const r2 = r * r;
  for (let py = Math.floor(cy - r); py <= Math.ceil(cy + r); py++) {
    for (let px = Math.floor(cx - r); px <= Math.ceil(cx + r); px++) {
      const dx = px - cx;
      const dy = py - cy;
      if (dx * dx + dy * dy <= r2) setPixel(canvas, px, py, rgb);
    }
  }
}

function fillHeart(canvas, cx, cy, size, rgb) {
  const s = size;
  for (let py = Math.floor(cy - s); py <= Math.ceil(cy + s * 1.1); py++) {
    for (let px = Math.floor(cx - s); px <= Math.ceil(cx + s); px++) {
      const x = (px - cx) / s;
      const y = (cy - py) / s + 0.25;
      // Classic heart implicit curve
      const a = x * x + y * y - 1;
      const inside = a * a * a - x * x * y * y * y <= 0;
      if (inside) setPixel(canvas, px, py, rgb);
    }
  }
}

function blend(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function drawAppIcon(size) {
  const canvas = createCanvas(size);
  const s = size / 512;

  fillRoundedRect(canvas, 0, 0, size, size, 112 * s, COLORS.navy);

  // Soft top glow
  for (let y = 0; y < 220 * s; y++) {
    const t = y / (220 * s);
    const rowColor = blend(COLORS.blue, COLORS.navy, 0.35 + t * 0.65);
    for (let x = 36 * s; x < 476 * s; x++) {
      const existing = [
        canvas.data[(Math.floor(y + 36 * s) * size + Math.floor(x)) * 3],
        canvas.data[(Math.floor(y + 36 * s) * size + Math.floor(x)) * 3 + 1],
        canvas.data[(Math.floor(y + 36 * s) * size + Math.floor(x)) * 3 + 2],
      ];
      setPixel(canvas, x, y + 36 * s, blend(existing, rowColor, 0.22));
    }
  }

  // Calendar body
  fillRoundedRect(canvas, 96 * s, 128 * s, 320 * s, 296 * s, 36 * s, COLORS.white);

  // Header bar
  fillRect(canvas, 96 * s, 128 * s, 320 * s, 104 * s, COLORS.blue);
  // Round top corners of header by redrawing body top corners... already covered by white body then blue header
  fillRoundedRect(canvas, 96 * s, 128 * s, 320 * s, 104 * s, 36 * s, COLORS.blue);
  fillRect(canvas, 96 * s, 164 * s, 320 * s, 68 * s, COLORS.blue);

  // Binding rings
  fillRoundedRect(canvas, 168 * s, 100 * s, 28 * s, 56 * s, 14 * s, COLORS.lightBlue);
  fillRoundedRect(canvas, 316 * s, 100 * s, 28 * s, 56 * s, 14 * s, COLORS.lightBlue);
  fillRoundedRect(canvas, 174 * s, 106 * s, 16 * s, 44 * s, 8 * s, COLORS.navy);
  fillRoundedRect(canvas, 322 * s, 106 * s, 16 * s, 44 * s, 8 * s, COLORS.navy);

  // Day cells (papa / mama colours)
  fillRoundedRect(canvas, 132 * s, 260 * s, 100 * s, 64 * s, 14 * s, COLORS.softBlue);
  fillRoundedRect(canvas, 280 * s, 260 * s, 100 * s, 64 * s, 14 * s, COLORS.softPink);
  fillRoundedRect(canvas, 132 * s, 340 * s, 100 * s, 48 * s, 14 * s, COLORS.slate);
  fillRoundedRect(canvas, 280 * s, 340 * s, 100 * s, 48 * s, 14 * s, COLORS.slate);

  // Shared heart
  fillHeart(canvas, 256 * s, 300 * s, 28 * s, COLORS.red);

  return canvas;
}

function encodePng(canvas) {
  const { size, data } = canvas;
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0);
  ihdr.write('IHDR', 4);
  ihdrData.copy(ihdr, 8);
  ihdr.writeUInt32BE(crc32(Buffer.concat([Buffer.from('IHDR'), ihdrData])), 21);

  const rowSize = 1 + size * 3;
  const raw = Buffer.alloc(rowSize * size);
  for (let y = 0; y < size; y++) {
    raw[y * rowSize] = 0;
    data.copy(raw, y * rowSize + 1, y * size * 3, (y + 1) * size * 3);
  }

  const compressed = deflateSync(raw, { level: 9 });
  const idat = Buffer.alloc(compressed.length + 12);
  idat.writeUInt32BE(compressed.length, 0);
  idat.write('IDAT', 4);
  compressed.copy(idat, 8);
  idat.writeUInt32BE(
    crc32(Buffer.concat([Buffer.from('IDAT'), compressed])),
    8 + compressed.length,
  );

  const iend = Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);
  return Buffer.concat([pngSignature, ihdr, idat, iend]);
}

mkdirSync(publicDir, { recursive: true });

const icon192 = encodePng(drawAppIcon(192));
const icon512 = encodePng(drawAppIcon(512));
const apple = encodePng(drawAppIcon(180));

writeFileSync(join(publicDir, 'pwa-192x192.png'), icon192);
writeFileSync(join(publicDir, 'pwa-512x512.png'), icon512);
writeFileSync(join(publicDir, 'apple-touch-icon.png'), apple);
copyFileSync(join(publicDir, 'pwa-192x192.png'), join(publicDir, 'favicon-32.png'));

console.log('PWA-iconen gegenereerd (kalender + hart).');
