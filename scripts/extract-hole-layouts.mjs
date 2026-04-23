// Extract tee + green positions from each hole{n}.svg.
//
// Heuristic:
//   • Blue tee markers use fill #06c — small <rect> elements. Average their
//     centers to locate the tee box.
//   • The flag fill is #ec1c24. Use its bounding center for the green.
// Both positions are converted from the SVG's own viewBox coords into
// normalized canvas coords, accounting for preserveAspectRatio="xMidYMid meet"
// letterboxing into a CANVAS_W × CANVAS_H canvas.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SVG_DIR = "C:/Users/aprek/PlayHCGC/hole diagrams/SVG";
const CANVAS_W = 240;
const CANVAS_H = 480;

function matchAll(str, re) {
  const out = [];
  let m;
  while ((m = re.exec(str)) !== null) out.push(m);
  return out;
}

function parseClassColors(svg) {
  // Map .cls-NN -> "#xxx"
  const map = {};
  const re = /\.cls-(\d+)\s*\{[^}]*?fill:\s*(#[0-9a-fA-F]{3,6})/g;
  for (const m of matchAll(svg, re)) {
    map[m[1]] = m[2].toLowerCase();
  }
  return map;
}

function parseClassStrokes(svg) {
  const map = {};
  const re = /\.cls-(\d+)\s*\{[^}]*?stroke:\s*(#[0-9a-fA-F]{3,6})/g;
  for (const m of matchAll(svg, re)) {
    map[m[1]] = m[2].toLowerCase();
  }
  return map;
}

function classesForColor(colorMap, color) {
  return Object.entries(colorMap)
    .filter(([, c]) => c === color)
    .map(([cls]) => cls);
}

function rectCenters(svg, classIds) {
  // Match <rect class="cls-N" x="..." y="..." width="..." height="..." ...>
  // Only rects whose class list contains one of the given class ids.
  const pts = [];
  const re = /<rect\b([^>]*?)\/?>/g;
  for (const m of matchAll(svg, re)) {
    const attrs = m[1];
    const classAttr = /class="([^"]*)"/.exec(attrs);
    if (!classAttr) continue;
    const classes = classAttr[1].split(/\s+/).map((c) => c.replace(/^cls-/, ""));
    if (!classes.some((c) => classIds.includes(c))) continue;
    const x = parseFloat((/\sx="([^"]+)"/.exec(attrs) || [])[1] || "NaN");
    const y = parseFloat((/\sy="([^"]+)"/.exec(attrs) || [])[1] || "NaN");
    const w = parseFloat((/\swidth="([^"]+)"/.exec(attrs) || [])[1] || "NaN");
    const h = parseFloat((/\sheight="([^"]+)"/.exec(attrs) || [])[1] || "NaN");
    if ([x, y, w, h].some(Number.isNaN)) continue;
    pts.push({ x: x + w / 2, y: y + h / 2 });
  }
  return pts;
}

function polygonCenter(svg, classIds) {
  // Find the first <polygon class="cls-N" points="..."> where cls matches.
  const re = /<polygon\b([^>]*?)\/?>/g;
  for (const m of matchAll(svg, re)) {
    const attrs = m[1];
    const classAttr = /class="([^"]*)"/.exec(attrs);
    if (!classAttr) continue;
    const classes = classAttr[1].split(/\s+/).map((c) => c.replace(/^cls-/, ""));
    if (!classes.some((c) => classIds.includes(c))) continue;
    const pointsAttr = /points="([^"]+)"/.exec(attrs);
    if (!pointsAttr) continue;
    const nums = pointsAttr[1].trim().split(/[\s,]+/).map(Number);
    const xs = [], ys = [];
    for (let i = 0; i + 1 < nums.length; i += 2) { xs.push(nums[i]); ys.push(nums[i + 1]); }
    if (!xs.length) continue;
    const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
    return { x: cx, y: cy };
  }
  return null;
}

function flagPoleBottom(svg, classIds) {
  // Red flag <path d="..."> — we approximate its center by sampling
  // command coordinates (moveTo / lineTo endpoints) from `d`.
  const re = /<path\b([^>]*?)\/?>/g;
  for (const m of matchAll(svg, re)) {
    const attrs = m[1];
    const classAttr = /class="([^"]*)"/.exec(attrs);
    if (!classAttr) continue;
    const classes = classAttr[1].split(/\s+/).map((c) => c.replace(/^cls-/, ""));
    if (!classes.some((c) => classIds.includes(c))) continue;
    const dAttr = /d="([^"]+)"/.exec(attrs);
    if (!dAttr) continue;
    const d = dAttr[1];
    // Pull every absolute M/L coordinate pair — good enough for a centroid.
    const coords = [];
    const cre = /[ML]\s*([-\d.]+)[ ,]+([-\d.]+)/g;
    for (const c of matchAll(d, cre)) coords.push([parseFloat(c[1]), parseFloat(c[2])]);
    if (!coords.length) continue;
    const xs = coords.map((p) => p[0]);
    const ys = coords.map((p) => p[1]);
    return {
      x: xs.reduce((a, b) => a + b, 0) / xs.length,
      y: ys.reduce((a, b) => a + b, 0) / ys.length,
    };
  }
  return null;
}

function viewBox(svg) {
  const m = /viewBox="([^"]+)"/.exec(svg);
  const [, , w, h] = m[1].split(/\s+/).map(Number);
  return { w, h };
}

function svgToCanvasNorm({ x, y }, vb) {
  // xMidYMid meet: fit SVG inside canvas, preserving aspect.
  const svgAspect = vb.w / vb.h;
  const canvasAspect = CANVAS_W / CANVAS_H;
  let scale, offX, offY;
  if (svgAspect > canvasAspect) {
    scale = CANVAS_W / vb.w;
    offX = 0;
    offY = (CANVAS_H - vb.h * scale) / 2;
  } else {
    scale = CANVAS_H / vb.h;
    offX = (CANVAS_W - vb.w * scale) / 2;
    offY = 0;
  }
  const cx = offX + x * scale;
  const cy = offY + y * scale;
  // Our layout convention: y=0 at bottom (tee), y=1 at top (green).
  return { x: cx / CANVAS_W, y: 1 - cy / CANVAS_H };
}

const out = {};
for (let n = 1; n <= 18; n++) {
  const fname = `hole${n}.svg`;
  const svg = readFileSync(join(SVG_DIR, fname), "utf8");
  const vb = viewBox(svg);
  const fills = parseClassColors(svg);
  const strokes = parseClassStrokes(svg);

  // Blue tee markers: fill #06c (fallback: any rect with cls linked to #06c
  // via stroke if the SVG ever changed).
  const blueClasses = [
    ...classesForColor(fills, "#06c"),
    ...classesForColor(strokes, "#06c"),
  ];
  const redClasses = [
    ...classesForColor(fills, "#ec1c24"),
    ...classesForColor(strokes, "#ec1c24"),
  ];

  const tees = rectCenters(svg, blueClasses);
  // Average tee center.
  let teeSvg;
  if (tees.length) {
    teeSvg = {
      x: tees.reduce((a, b) => a + b.x, 0) / tees.length,
      y: tees.reduce((a, b) => a + b.y, 0) / tees.length,
    };
  }

  // Green: the red flag (polygon or path).
  let greenSvg = polygonCenter(svg, redClasses);
  if (!greenSvg) greenSvg = flagPoleBottom(svg, redClasses);

  const teeNorm = teeSvg ? svgToCanvasNorm(teeSvg, vb) : null;
  const greenNorm = greenSvg ? svgToCanvasNorm(greenSvg, vb) : null;

  out[n] = {
    viewBox: `${vb.w} x ${vb.h}`,
    teeSvg,
    greenSvg,
    tee: teeNorm,
    green: greenNorm,
  };
}

console.log(JSON.stringify(out, null, 2));
