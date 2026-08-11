'use strict';

/**
 * Minimal PNG writer for Bark Break icons (no native deps).
 * Draws a cream rounded square, teal gate, mustard dog head.
 */

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ROOT = path.resolve(__dirname, '..');
const ICONS_DIR = path.join(ROOT, 'icons');
const SIZES = [16, 32, 48, 128];

const INK = [24, 50, 74, 255];
const CREAM = [255, 246, 232, 255];
const CORAL = [239, 106, 91, 255];
const MUSTARD = [231, 174, 50, 255];
const TEAL = [42, 140, 130, 255];
const CLEAR = [0, 0, 0, 0];

function crc32(buf) {
  let crc = 0xffffffff;
  for (let index = 0; index < buf.length; index += 1) {
    crc ^= buf[index];
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * stride, y * stride + stride);
  }
  const compressed = zlib.deflateSync(raw);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function setPixel(rgba, size, x, y, color) {
  if (x < 0 || y < 0 || x >= size || y >= size) {
    return;
  }
  const offset = (y * size + x) * 4;
  rgba[offset] = color[0];
  rgba[offset + 1] = color[1];
  rgba[offset + 2] = color[2];
  rgba[offset + 3] = color[3];
}

function fillRect(rgba, size, x0, y0, x1, y1, color) {
  const left = Math.max(0, Math.floor(x0));
  const top = Math.max(0, Math.floor(y0));
  const right = Math.min(size - 1, Math.floor(x1));
  const bottom = Math.min(size - 1, Math.floor(y1));
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      setPixel(rgba, size, x, y, color);
    }
  }
}

function fillCircle(rgba, size, cx, cy, radius, color) {
  const r2 = radius * radius;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) {
        setPixel(rgba, size, x, y, color);
      }
    }
  }
}

function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  for (let index = 0; index < rgba.length; index += 4) {
    rgba[index] = CLEAR[0];
    rgba[index + 1] = CLEAR[1];
    rgba[index + 2] = CLEAR[2];
    rgba[index + 3] = CLEAR[3];
  }

  const margin = Math.max(1, Math.floor(size / 16));
  fillRect(rgba, size, margin, margin, size - margin, size - margin, CREAM);
  fillRect(rgba, size, margin, margin, size - margin, margin + 1, INK);
  fillRect(rgba, size, margin, size - margin - 1, size - margin, size - margin, INK);
  fillRect(rgba, size, margin, margin, margin + 1, size - margin, INK);
  fillRect(rgba, size, size - margin - 1, margin, size - margin, size - margin, INK);

  const postW = Math.max(2, Math.floor(size / 14));
  const gateTop = Math.floor(size * 0.55);
  fillRect(rgba, size, size * 0.22, gateTop, size * 0.22 + postW, size * 0.86, TEAL);
  fillRect(rgba, size, size * 0.72, gateTop, size * 0.72 + postW, size * 0.86, TEAL);
  fillRect(rgba, size, size * 0.22, size * 0.68, size * 0.78, size * 0.68 + postW, TEAL);

  const headR = size * 0.22;
  const cx = size / 2;
  const cy = size * 0.38;
  fillCircle(rgba, size, cx, cy, headR, MUSTARD);
  fillCircle(rgba, size, cx - headR * 0.85, cy - headR * 0.35, headR * 0.35, CORAL);
  fillCircle(rgba, size, cx + headR * 0.85, cy - headR * 0.35, headR * 0.35, CORAL);
  fillCircle(rgba, size, cx - headR * 0.35, cy, Math.max(1, size * 0.035), INK);
  fillCircle(rgba, size, cx + headR * 0.35, cy, Math.max(1, size * 0.035), INK);
  fillCircle(rgba, size, cx, cy + headR * 0.25, Math.max(1, size * 0.045), INK);

  return encodePng(size, size, rgba);
}

function main() {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
  SIZES.forEach(function writeSize(size) {
    const filePath = path.join(ICONS_DIR, `icon-${size}.png`);
    fs.writeFileSync(filePath, drawIcon(size));
    process.stdout.write(`Wrote ${filePath}\n`);
  });
}

main();
