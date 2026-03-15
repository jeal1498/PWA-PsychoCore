#!/usr/bin/env node
/**
 * generate-icons.mjs
 * Genera los iconos PWA (192x192 y 512x512) usando canvas.
 * Ejecutar UNA sola vez: node scripts/generate-icons.mjs
 * Requiere: npm install canvas (solo dev)
 */
import { createCanvas } from "canvas";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../public/icons");
mkdirSync(outDir, { recursive: true });

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const r = size * 0.2;

  // Background rounded rect
  ctx.fillStyle = "#3A6B6E";
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();

  // Brain icon (simplified)
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  const cx = size / 2;
  const cy = size / 2;
  const s = size * 0.35;

  ctx.beginPath();
  ctx.ellipse(cx - s * 0.2, cy - s * 0.1, s * 0.45, s * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + s * 0.2, cy - s * 0.1, s * 0.45, s * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Center divider
  ctx.fillStyle = "#3A6B6E";
  ctx.fillRect(cx - size * 0.02, cy - s * 0.6, size * 0.04, s * 1.1);

  const buffer = canvas.toBuffer("image/png");
  writeFileSync(join(outDir, `icon-${size}.png`), buffer);
  console.log(`✓ Generated icon-${size}.png`);
}

generateIcon(192);
generateIcon(512);
console.log("\nIconos generados en public/icons/");
